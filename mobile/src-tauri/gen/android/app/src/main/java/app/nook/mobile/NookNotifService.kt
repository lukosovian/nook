package app.nook.mobile

import android.app.Notification
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
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
 *
 * Servis sürekli açık durduğu için otomasyonların telefon olaylarını da buradan gönderir: şarja takıldı /
 * çıkarıldı ve Wi-Fi'ye bağlandı (PC, isteğin ev ağından gelmesine bakıp "eve geldi"yi anlar).
 */
class NookNotifService : NotificationListenerService() {
    private val icons = HashMap<String, String?>()
    /** Aynı bildirim art arda güncellenince (WhatsApp, indirmeler) bir kez gitsin */
    private val recent = LinkedHashMap<String, Long>()

    private var power: BroadcastReceiver? = null
    private var wifi: ConnectivityManager.NetworkCallback? = null

    override fun onListenerConnected() {
        PcLink.prefs(this).edit().putBoolean("notifBound", true).apply()
        watchPhone()
    }

    /** Android servisi bıraktı (güncellemeden sonra sık olur): yeniden bağlanmayı iste */
    override fun onListenerDisconnected() {
        PcLink.prefs(this).edit().putBoolean("notifBound", false).apply()
        unwatchPhone()
        rebind(this)
    }

    override fun onDestroy() {
        unwatchPhone()
        super.onDestroy()
    }

    private fun phoneEvent(event: String) {
        val ctx = applicationContext
        PcLink.io.execute { PcLink.post(ctx, "/v1/phone-event", JSONObject().put("event", event).toString().toByteArray()) }
    }

    /** Şarj ve Wi-Fi olaylarını dinle (Android 8'den beri bunlar ancak çalışan bir servisten dinlenebiliyor) */
    private fun watchPhone() {
        if (power == null) {
            val r = object : BroadcastReceiver() {
                override fun onReceive(c: Context, i: Intent) {
                    phoneEvent(if (i.action == Intent.ACTION_POWER_CONNECTED) "charging" else "unplugged")
                }
            }
            val filter = IntentFilter().apply {
                addAction(Intent.ACTION_POWER_CONNECTED)
                addAction(Intent.ACTION_POWER_DISCONNECTED)
            }
            // Android 13+: dışarıdan (başka uygulamalardan) gelen yayın kabul edilmesin; sistem yayını yine gelir
            if (Build.VERSION.SDK_INT >= 33) registerReceiver(r, filter, Context.RECEIVER_NOT_EXPORTED) else registerReceiver(r, filter)
            power = r
        }
        if (wifi == null) {
            val since = System.currentTimeMillis()
            val cb = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    // Kaydolur kaydolmaz gelen "zaten bağlı" haberi eve gelmek değil
                    if (System.currentTimeMillis() - since < 3000) return
                    // Adres alınsın, PC'ye ulaşılabilsin
                    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({ phoneEvent("wifi") }, 5000)
                }
            }
            runCatching {
                getSystemService(ConnectivityManager::class.java).registerNetworkCallback(NetworkRequest.Builder().addTransportType(NetworkCapabilities.TRANSPORT_WIFI).build(), cb)
                wifi = cb
            }
        }
    }

    private fun unwatchPhone() {
        power?.let { runCatching { unregisterReceiver(it) } }
        power = null
        wifi?.let { runCatching { getSystemService(ConnectivityManager::class.java).unregisterNetworkCallback(it) } }
        wifi = null
    }

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
        /**
         * Uygulama güncellenince Android bildirim dinleyicisini çoğu zaman yeniden bağlamıyor: izin açık
         * görünür ama hiçbir bildirim gelmez (telefon yeniden başlayana kadar). Uygulama her açılışta ister.
         */
        fun rebind(ctx: Context) {
            if (Build.VERSION.SDK_INT >= 24) runCatching { requestRebind(ComponentName(ctx, NookNotifService::class.java)) }
        }

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
