package app.nook.mobile

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Uygulama kapalıyken de PC'ye istek gönderebilmek için (bildirimler, paylaşılan dosyalar) web tarafındaki
 * pc.ts'nin Kotlin karşılığı. Eşleşme bilgisini web tarafı setPairing ile buraya da yazar.
 * İmza aynı: hex(HMAC-SHA256(anahtar, "{ts}\n{METHOD}\n{yol}\n" + gövde)) — bkz. src-tauri/src/remote.rs
 */
object PcLink {
    private const val PREFS = "nook"
    /** PC'ye ulaşılamayınca bekletilen bildirimler en çok bu kadar */
    private const val OUTBOX_MAX = 40
    /** Bundan eski bekleyen bildirim PC'ye gönderilmez */
    private const val OUTBOX_AGE_MS = 3 * 3600_000L

    val io = Executors.newSingleThreadExecutor()

    fun prefs(ctx: Context): SharedPreferences = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    data class Pairing(val hosts: List<String>, val port: Int, val key: String, val lastHost: String?)

    fun pairing(ctx: Context): Pairing? {
        val raw = prefs(ctx).getString("pairing", null) ?: return null
        return try {
            val j = JSONObject(raw)
            val hosts = j.getJSONArray("hosts")
            Pairing((0 until hosts.length()).map { hosts.getString(it) }, j.getInt("port"), j.getString("key"), j.optString("lastHost").ifEmpty { null })
        } catch (e: Exception) {
            null
        }
    }

    private fun hex(b: ByteArray) = b.joinToString("") { "%02x".format(it) }

    private fun mac(key: String): Mac {
        val raw = Base64.decode(key, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
        return Mac.getInstance("HmacSHA256").apply { init(SecretKeySpec(raw, "HmacSHA256")) }
    }

    fun sign(key: String, ts: String, method: String, path: String, body: ByteArray): String {
        val m = mac(key)
        m.update("$ts\n$method\n$path\n".toByteArray())
        m.update(body)
        return hex(m.doFinal())
    }

    /** Sırayla adresleri dener (son çalışan önce); başarılıysa yanıt gövdesi, olmazsa null */
    fun post(ctx: Context, path: String, body: ByteArray, type: String = "application/json", timeoutMs: Int = 3000): String? {
        val p = pairing(ctx) ?: return null
        val order = listOfNotNull(p.lastHost) + p.hosts.filter { it != p.lastHost }
        for (host in order) {
            try {
                val ts = System.currentTimeMillis().toString()
                val c = URL("http://$host:${p.port}$path").openConnection() as HttpURLConnection
                c.connectTimeout = timeoutMs
                c.readTimeout = 15000
                c.requestMethod = "POST"
                c.doOutput = true
                c.setRequestProperty("content-type", type)
                c.setRequestProperty("x-nook-ts", ts)
                c.setRequestProperty("x-nook-sig", sign(p.key, ts, "POST", path, body))
                c.setFixedLengthStreamingMode(body.size)
                c.outputStream.use { it.write(body) }
                val code = c.responseCode
                val text = (if (code < 400) c.inputStream else c.errorStream)?.bufferedReader()?.use { it.readText() } ?: ""
                c.disconnect()
                if (code in 200..299) return text
                if (code == 401) return null
            } catch (e: Exception) {
                // bu adres ulaşılamıyor, sıradakini dene
            }
        }
        return null
    }

    /**
     * Büyük dosyayı akışla gönderir: imza için önce baştan sona okunur, sonra yeniden açılıp yollanır.
     * open() her çağrıda dosyayı yeniden açmalı. progress: gönderilen bayt.
     */
    fun postStream(ctx: Context, host: String, path: String, open: () -> InputStream, progress: (Long, Long) -> Unit): String? {
        val p = pairing(ctx) ?: return null
        val ts = System.currentTimeMillis().toString()
        val m = mac(p.key)
        m.update("$ts\nPOST\n$path\n".toByteArray())
        val buf = ByteArray(64 * 1024)
        // İlk okuma: imza ve boyut
        var size = 0L
        open().use { s ->
            while (true) {
                val n = s.read(buf)
                if (n < 0) break
                m.update(buf, 0, n)
                size += n
            }
        }
        val sig = hex(m.doFinal())
        val c = URL("http://$host:${p.port}$path").openConnection() as HttpURLConnection
        c.connectTimeout = 4000
        c.readTimeout = 60000
        c.requestMethod = "POST"
        c.doOutput = true
        c.setRequestProperty("content-type", "application/octet-stream")
        c.setRequestProperty("x-nook-ts", ts)
        c.setRequestProperty("x-nook-sig", sig)
        c.setFixedLengthStreamingMode(size)
        var sent = 0L
        c.outputStream.use { out ->
            open().use { s ->
                while (true) {
                    val n = s.read(buf)
                    if (n < 0) break
                    out.write(buf, 0, n)
                    sent += n
                    progress(sent, size)
                }
            }
        }
        val code = c.responseCode
        val text = (if (code < 400) c.inputStream else c.errorStream)?.bufferedReader()?.use { it.readText() } ?: ""
        c.disconnect()
        if (code !in 200..299) throw Exception(runCatching { JSONObject(text).getString("error") }.getOrDefault("PC hata verdi ($code)"))
        return text
    }

    // ------------------------------------------------------------ Bildirimler

    /** Bildirimi gönderir; PC'ye ulaşılamazsa sıraya koyar (PC açılınca / Nook açılınca gider) */
    fun sendNotification(ctx: Context, n: JSONObject) {
        io.execute {
            if (post(ctx, "/v1/notify", n.toString().toByteArray()) != null) flushLocked(ctx)
            else enqueue(ctx, n)
        }
    }

    fun flushOutbox(ctx: Context) {
        io.execute { flushLocked(ctx) }
    }

    private fun enqueue(ctx: Context, n: JSONObject) {
        val p = prefs(ctx)
        val arr = runCatching { JSONArray(p.getString("outbox", "[]")) }.getOrDefault(JSONArray())
        // İkon büyük: kuyrukta ikonsuz bekler
        n.remove("icon")
        arr.put(n)
        val keep = JSONArray()
        val start = maxOf(0, arr.length() - OUTBOX_MAX)
        for (i in start until arr.length()) keep.put(arr.get(i))
        p.edit().putString("outbox", keep.toString()).apply()
    }

    private fun flushLocked(ctx: Context) {
        val p = prefs(ctx)
        val arr = runCatching { JSONArray(p.getString("outbox", "[]")) }.getOrDefault(JSONArray())
        if (arr.length() == 0) return
        val now = System.currentTimeMillis()
        val rest = JSONArray()
        var failed = false
        for (i in 0 until arr.length()) {
            val n = arr.getJSONObject(i)
            if (now - n.optLong("at", now) > OUTBOX_AGE_MS) continue
            if (failed || post(ctx, "/v1/notify", n.toString().toByteArray()) == null) {
                failed = true
                rest.put(n)
            }
        }
        p.edit().putString("outbox", rest.toString()).apply()
    }
}
