package app.nook.mobile

import android.app.Notification
import android.content.pm.ApplicationInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

/**
 * Telefona gelen bildirimleri PC'deki Nook'a iletir (Ayarlar › Bildirim erişimi'nde Nook'a izin verilince
 * Android bu servisi kendisi çalıştırır; uygulama kapalıyken de). Süren işler (müzik, indirme, navigasyon),
 * grup özetleri ve kullanıcının sessize aldığı uygulamalar gönderilmez.
 */
class NookNotifService : NotificationListenerService() {
    private val icons = HashMap<String, String?>()
    /** Aynı bildirim art arda güncellenince (WhatsApp, indirmeler) bir kez gitsin */
    private val recent = LinkedHashMap<String, Long>()

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        try {
            handle(sbn)
        } catch (e: Exception) {
            // Bir bildirim yüzünden servis düşmesin
        }
    }

    private fun handle(sbn: StatusBarNotification) {
        val prefs = PcLink.prefs(this)
        if (!prefs.getBoolean("notifOn", true)) return
        val pkg = sbn.packageName
        if (pkg == packageName || pkg == "com.tailscale.ipn" || pkg == "android" || pkg == "com.android.systemui") return
        val n = sbn.notification
        val f = n.flags
        if (f and Notification.FLAG_ONGOING_EVENT != 0 || f and Notification.FLAG_GROUP_SUMMARY != 0 || f and Notification.FLAG_FOREGROUND_SERVICE != 0) return
        if (n.category in SKIP_CATEGORIES) return
        val muted = runCatching { JSONArray(prefs.getString("notifMuted", "[]")) }.getOrDefault(JSONArray())
        if ((0 until muted.length()).any { muted.optString(it) == pkg }) return

        val ex = n.extras
        val title = ex.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
        val text = (ex.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: ex.getCharSequence(Notification.EXTRA_TEXT))?.toString()?.trim().orEmpty()
        if (title.isEmpty() && text.isEmpty()) return

        val sig = "$pkg|$title|$text"
        val now = System.currentTimeMillis()
        synchronized(recent) {
            recent.entries.removeAll { now - it.value > 15_000 }
            if (recent.containsKey(sig)) return
            recent[sig] = now
        }

        val info = appInfo(sbn)
        val name = info?.let { packageManager.getApplicationLabel(it).toString() } ?: pkg
        remember(pkg, name)
        val json = JSONObject()
            .put("app", name)
            .put("pkg", pkg)
            .put("title", title.take(200))
            .put("text", text.take(1000))
            .put("at", now)
        icon(pkg, info)?.let { json.put("icon", it) }
        PcLink.sendNotification(this, json)
    }

    @Suppress("DEPRECATION")
    private fun appInfo(sbn: StatusBarNotification): ApplicationInfo? {
        // Bildirimin içinde gelen uygulama bilgisi paket görünürlüğü izni gerektirmez
        val fromExtras: ApplicationInfo? =
            if (Build.VERSION.SDK_INT >= 33) sbn.notification.extras.getParcelable("android.appInfo", ApplicationInfo::class.java)
            else sbn.notification.extras.getParcelable("android.appInfo")
        return fromExtras ?: runCatching { packageManager.getApplicationInfo(sbn.packageName, 0) }.getOrNull()
    }

    private fun icon(pkg: String, info: ApplicationInfo?): String? {
        if (icons.containsKey(pkg)) return icons[pkg]
        val url = runCatching {
            val d = if (info != null) packageManager.getApplicationIcon(info) else packageManager.getApplicationIcon(pkg)
            val size = 64
            val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            d.setBounds(0, 0, size, size)
            d.draw(Canvas(bmp))
            val out = ByteArrayOutputStream()
            bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
            "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
        }.getOrNull()
        icons[pkg] = url
        return url
    }

    /** Bildirim gönderen uygulamalar (Nook Mobil'de sessize alma listesi için) */
    private fun remember(pkg: String, name: String) {
        val p = PcLink.prefs(this)
        val apps = runCatching { JSONObject(p.getString("notifApps", null) ?: "{}") }.getOrDefault(JSONObject())
        if (apps.optString(pkg) == name) return
        apps.put(pkg, name)
        p.edit().putString("notifApps", apps.toString()).apply()
    }

    companion object {
        private val SKIP_CATEGORIES = setOf(
            Notification.CATEGORY_TRANSPORT,
            Notification.CATEGORY_PROGRESS,
            Notification.CATEGORY_SERVICE,
            Notification.CATEGORY_SYSTEM,
            Notification.CATEGORY_NAVIGATION,
            Notification.CATEGORY_STATUS,
        )
    }
}
