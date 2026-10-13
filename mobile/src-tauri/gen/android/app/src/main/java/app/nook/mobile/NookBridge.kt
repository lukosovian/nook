package app.nook.mobile

import android.content.ComponentName
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.provider.Settings
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.FileProvider
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.Inet4Address
import java.net.URL

/**
 * Web tarafının (React) yapamadığı Android işleri: window.NookNative. Uzun işler sonucu
 * window.__nookNative(olay, json) ile bildirir.
 */
class NookBridge(private val act: MainActivity, private val web: WebView) {
    private val ctx: Context = act.applicationContext

    fun emit(event: String, data: JSONObject = JSONObject()) {
        val js = "window.__nookNative && window.__nookNative(${JSONObject.quote(event)}, $data)"
        web.post { web.evaluateJavascript(js, null) }
    }

    // ------------------------------------------------------------ Eşleşme

    /** Bildirim servisi ve paylaşım uygulama kapalıyken de PC'ye ulaşabilsin */
    @JavascriptInterface
    fun setPairing(json: String) {
        val p = PcLink.prefs(ctx).edit()
        if (json.isEmpty()) p.remove("pairing") else p.putString("pairing", json)
        p.apply()
    }

    @JavascriptInterface
    fun flushOutbox() = PcLink.flushOutbox(ctx)

    // ------------------------------------------------------------ Ağ ve Tailscale

    /** { online, wifi, cell, vpn, ips: [telefonun Wi-Fi adresleri] } */
    @Suppress("DEPRECATION")
    @JavascriptInterface
    fun netInfo(): String {
        val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        var wifi = false
        var cell = false
        var vpn = false
        val ips = JSONArray()
        for (n in cm.allNetworks) {
            val caps = cm.getNetworkCapabilities(n) ?: continue
            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) {
                vpn = true
                continue
            }
            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                wifi = true
                cm.getLinkProperties(n)?.linkAddresses?.forEach { a -> if (a.address is Inet4Address) ips.put(a.address.hostAddress) }
            }
            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) cell = true
        }
        return JSONObject().put("online", wifi || cell).put("wifi", wifi).put("cell", cell).put("vpn", vpn).put("ips", ips).toString()
    }

    @JavascriptInterface
    fun tailscaleInstalled(): Boolean = runCatching { ctx.packageManager.getPackageInfo(TS, 0); true }.getOrDefault(false)

    /** Tailscale'i bağlar (kapalıysa). Biz açtıysak Nook kapanınca kapatılır. */
    @JavascriptInterface
    fun tailscaleUp(): Boolean {
        if (!tailscaleInstalled()) return false
        val vpnOn = JSONObject(netInfo()).optBoolean("vpn")
        if (vpnOn) return true
        PcLink.prefs(ctx).edit().putBoolean("tsOurs", true).apply()
        ctx.sendBroadcast(Intent("com.tailscale.ipn.CONNECT_VPN").setComponent(ComponentName(TS, "$TS.IPNReceiver")))
        return true
    }

    /** Yalnızca Nook açtıysa kapatır */
    @JavascriptInterface
    fun tailscaleDown(): Boolean = tailscaleOff(ctx)

    @JavascriptInterface
    fun openTailscale() {
        val i = ctx.packageManager.getLaunchIntentForPackage(TS)
            ?: Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$TS"))
        act.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    // ------------------------------------------------------------ Güncelleme

    /** APK'yı indirip Android'in kurulum ekranını açar: olaylar "apk" {phase: progress|install|permission|error} */
    @JavascriptInterface
    fun installApk(url: String) {
        if (Build.VERSION.SDK_INT >= 26 && !ctx.packageManager.canRequestPackageInstalls()) {
            // Önce "bu kaynaktan uygulama yükle" izni; dönünce MainActivity.onResume kaldığı yerden devam eder
            act.pendingApk = url
            emit("apk", JSONObject().put("phase", "permission"))
            act.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${ctx.packageName}")))
            return
        }
        Thread {
            try {
                val dir = File(ctx.cacheDir, "update").apply { mkdirs() }
                dir.listFiles()?.forEach { it.delete() }
                val file = File(dir, "NookMobil.apk")
                var c = URL(url).openConnection() as HttpURLConnection
                // GitHub başka bir alan adına yönlendirir
                var hops = 0
                while (c.responseCode in 300..399 && hops++ < 5) {
                    val next = c.getHeaderField("Location")
                    c.disconnect()
                    c = URL(URL(url), next).openConnection() as HttpURLConnection
                }
                if (c.responseCode != 200) throw Exception("İndirilemedi (${c.responseCode})")
                val total = c.contentLengthLong
                var got = 0L
                var lastPct = -1
                c.inputStream.use { inp ->
                    file.outputStream().use { out ->
                        val buf = ByteArray(64 * 1024)
                        while (true) {
                            val n = inp.read(buf)
                            if (n < 0) break
                            out.write(buf, 0, n)
                            got += n
                            val pct = if (total > 0) (got * 100 / total).toInt() else -1
                            if (pct != lastPct) {
                                lastPct = pct
                                emit("apk", JSONObject().put("phase", "progress").put("pct", pct))
                            }
                        }
                    }
                }
                c.disconnect()
                val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.fileprovider", file)
                val i = Intent(Intent.ACTION_VIEW)
                    .setDataAndType(uri, "application/vnd.android.package-archive")
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                act.startActivity(i)
                emit("apk", JSONObject().put("phase", "install"))
            } catch (e: Exception) {
                emit("apk", JSONObject().put("phase", "error").put("message", e.message ?: "İndirilemedi"))
            }
        }.start()
    }

    // ------------------------------------------------------------ Görseller

    /** Galeriye kaydeder (Resimler/Nook). Boş dönerse tamam, değilse hata metni. */
    @JavascriptInterface
    fun saveImage(b64: String, name: String): String = try {
        val bytes = Base64.decode(b64, Base64.DEFAULT)
        val mime = if (name.endsWith(".png", true)) "image/png" else "image/jpeg"
        if (Build.VERSION.SDK_INT >= 29) {
            val values = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, name)
                put(MediaStore.Images.Media.MIME_TYPE, mime)
                put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Nook")
            }
            val uri = ctx.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: throw Exception("Galeriye yazılamadı")
            ctx.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
        } else {
            @Suppress("DEPRECATION")
            val dir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "Nook").apply { mkdirs() }
            File(dir, name).writeBytes(bytes)
        }
        ""
    } catch (e: Exception) {
        e.message ?: "Kaydedilemedi"
    }

    /** Android'in paylaş menüsü (WhatsApp'a gönder vb.) */
    @JavascriptInterface
    fun shareImage(b64: String, name: String) {
        val dir = File(ctx.cacheDir, "share").apply { mkdirs() }
        dir.listFiles()?.forEach { it.delete() }
        val file = File(dir, name)
        file.writeBytes(Base64.decode(b64, Base64.DEFAULT))
        val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.fileprovider", file)
        val send = Intent(Intent.ACTION_SEND).setType("image/*").putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        act.startActivity(Intent.createChooser(send, null).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    // ------------------------------------------------------------ Raf

    /**
     * Raftaki dosyayı indirir (İndirilenler › Nook) ve açar: olaylar "download" {id, sent, size} / {id, done} /
     * {id, error}. Açacak uygulama yoksa yalnızca kaydedilir.
     */
    @JavascriptInterface
    fun downloadShelf(id: String, name: String) {
        Thread {
            try {
                val mime = android.webkit.MimeTypeMap.getSingleton().getMimeTypeFromExtension(name.substringAfterLast('.', "").lowercase()) ?: "application/octet-stream"
                val uri: Uri
                var file: File? = null
                if (Build.VERSION.SDK_INT >= 29) {
                    val values = ContentValues().apply {
                        put(MediaStore.Downloads.DISPLAY_NAME, name)
                        put(MediaStore.Downloads.MIME_TYPE, mime)
                        put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Nook")
                    }
                    uri = ctx.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: throw Exception("İndirilenler'e yazılamadı")
                } else {
                    @Suppress("DEPRECATION")
                    val dir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "Nook").apply { mkdirs() }
                    file = File(dir, name)
                    uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.fileprovider", file)
                }
                PcLink.getStream(ctx, "/v1/shelf/file?id=" + Uri.encode(id)) { input, size ->
                    val out = file?.outputStream() ?: ctx.contentResolver.openOutputStream(uri) ?: throw Exception("Dosya yazılamadı")
                    out.use {
                        val buf = ByteArray(64 * 1024)
                        var sent = 0L
                        var last = 0L
                        while (true) {
                            val n = input.read(buf)
                            if (n < 0) break
                            it.write(buf, 0, n)
                            sent += n
                            if (sent - last > 256 * 1024) {
                                last = sent
                                emit("download", JSONObject().put("id", id).put("sent", sent).put("size", size))
                            }
                        }
                    }
                }
                emit("download", JSONObject().put("id", id).put("done", true))
                val view = Intent(Intent.ACTION_VIEW).setDataAndType(uri, mime).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                runCatching { act.startActivity(view) }
            } catch (e: Exception) {
                emit("download", JSONObject().put("id", id).put("error", e.message ?: "İndirilemedi"))
            }
        }.start()
    }

    /** Telefondan dosya seç: seçilenler "Paylaş › Nook" gibi gönderme sayfasına gelir (PC'de rafa düşer) */
    @JavascriptInterface
    fun pickFiles() {
        val i = Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*").putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
        act.runOnUiThread { act.startActivityForResult(i, MainActivity.PICK_FILES) }
    }

    // ------------------------------------------------------------ Bildirimler

    @JavascriptInterface
    fun notifAccess(): Boolean = NotificationManagerCompat.getEnabledListenerPackages(ctx).contains(ctx.packageName)

    @JavascriptInterface
    fun openNotifAccess() {
        act.startActivity(Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /** { on, muted: [paket], apps: {paket: ad} } */
    @JavascriptInterface
    fun notifPrefs(): String {
        val p = PcLink.prefs(ctx)
        return JSONObject()
            .put("on", p.getBoolean("notifOn", true))
            .put("muted", runCatching { JSONArray(p.getString("notifMuted", "[]")) }.getOrDefault(JSONArray()))
            .put("apps", runCatching { JSONObject(p.getString("notifApps", null) ?: "{}") }.getOrDefault(JSONObject()))
            .put("queued", runCatching { JSONArray(p.getString("outbox", "[]")).length() }.getOrDefault(0))
            .put("bound", p.getBoolean("notifBound", false))
            .put("water", p.getBoolean("waterOn", true))
            .toString()
    }

    /** Deneme bildirimi PC'ye: sonuç "notiftest" {ok} olayıyla */
    @JavascriptInterface
    fun testNotif() {
        NookNotifService.rebind(ctx)
        PcLink.io.execute {
            val body = JSONObject()
                .put("app", "Nook Mobil")
                .put("pkg", ctx.packageName)
                .put("title", "Deneme bildirimi")
                .put("text", "Telefondan gelen bildirimler burada görünecek")
                .put("at", System.currentTimeMillis())
            emit("notiftest", JSONObject().put("ok", PcLink.post(ctx, "/v1/notify", body.toString().toByteArray()) != null))
        }
    }

    @JavascriptInterface
    fun setNotifPrefs(json: String) {
        val j = JSONObject(json)
        PcLink.prefs(ctx).edit()
            .putBoolean("notifOn", j.optBoolean("on", true))
            .putString("notifMuted", (j.optJSONArray("muted") ?: JSONArray()).toString())
            .putBoolean("waterOn", j.optBoolean("water", true))
            .apply()
        WaterReceiver.kick(ctx)
    }

    // ------------------------------------------------------------ Paylaşım (başka uygulamadan "Nook'a gönder")

    /** Bekleyen paylaşım: { text } ya da { files: [{ name, size, mime }] }; yoksa "" */
    @JavascriptInterface
    fun peekShare(): String = act.shared?.toString() ?: ""

    @JavascriptInterface
    fun clearShare() {
        act.shared = null
        act.sharedUris = emptyList()
    }

    /** Paylaşılan dosyaları PC'ye yollar: olaylar "upload" {i, sent, size} / {done} / {error} */
    @JavascriptInterface
    fun uploadShared(host: String) {
        val uris = act.sharedUris
        val files = act.shared?.optJSONArray("files") ?: return
        Thread {
            try {
                for (i in uris.indices) {
                    val f = files.getJSONObject(i)
                    val name = f.getString("name")
                    val path = "/v1/file?name=" + Uri.encode(name)
                    var last = 0L
                    PcLink.postStream(ctx, host, path, { ctx.contentResolver.openInputStream(uris[i]) ?: throw Exception("Dosya açılamadı") }) { sent, size ->
                        if (sent == size || sent - last > 512 * 1024) {
                            last = sent
                            emit("upload", JSONObject().put("i", i).put("sent", sent).put("size", size))
                        }
                    }
                }
                emit("upload", JSONObject().put("done", true))
            } catch (e: Exception) {
                emit("upload", JSONObject().put("error", e.message ?: "Gönderilemedi"))
            }
        }.start()
    }

    companion object {
        const val TS = "com.tailscale.ipn"

        /** Nook'un açtığı Tailscale'i kapatır (kullanıcı kendisi açtıysa dokunmaz) */
        fun tailscaleOff(ctx: Context): Boolean {
            val p = PcLink.prefs(ctx)
            if (!p.getBoolean("tsOurs", false)) return false
            p.edit().putBoolean("tsOurs", false).apply()
            ctx.sendBroadcast(Intent("com.tailscale.ipn.DISCONNECT_VPN").setComponent(ComponentName(TS, "$TS.IPNReceiver")))
            return true
        }

        /** Paylaşım niyetindeki dosyaların adı ve boyutu */
        fun describe(ctx: Context, uris: List<Uri>): JSONArray {
            val arr = JSONArray()
            for (u in uris) {
                var name = u.lastPathSegment ?: "dosya"
                var size = -1L
                runCatching {
                    ctx.contentResolver.query(u, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)?.use { c ->
                        if (c.moveToFirst()) {
                            c.getString(0)?.let { name = it }
                            if (!c.isNull(1)) size = c.getLong(1)
                        }
                    }
                }
                if (size < 0) size = runCatching { ctx.contentResolver.openAssetFileDescriptor(u, "r")?.use { it.length } ?: -1L }.getOrDefault(-1L)
                arr.put(JSONObject().put("name", name).put("size", size).put("mime", ctx.contentResolver.getType(u) ?: ""))
            }
            return arr
        }
    }
}
