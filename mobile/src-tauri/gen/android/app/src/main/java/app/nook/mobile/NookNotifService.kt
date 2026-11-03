package app.nook.mobile

import android.app.ActivityOptions
import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.RemoteInput
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
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.os.Parcelable
import android.os.PowerManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Telefona gelen bildirimleri PC'deki Nook'a iletir (Ayarlar › Bildirim erişimi'nde Nook'a izin verilince
 * Android bu servisi kendisi çalıştırır; uygulama kapalıyken de). Süren işler (müzik, indirme, navigasyon),
 * grup özetleri ve kullanıcının sessize aldığı uygulamalar gönderilmez.
 *
 * Servis sürekli açık durduğu için otomasyonların telefon olaylarını da buradan gönderir: şarja takıldı /
 * çıkarıldı ve Wi-Fi'ye bağlandı (PC, isteğin ev ağından gelmesine bakıp "eve geldi"yi anlar).
 *
 * Telefonda görülen bildirim PC'de bir daha çıkmaz: telefon kullanılırken (ekran açık, kilit açık) gelenler
 * gönderilmez; telefonda kapatılan, açılan ya da uygulamanın kendisinin kaldırdığı (okundu) bildirim PC'den
 * de kalkar. Bildirimden yazılan yanıtla güncellenen (yanıtı gösteren) bildirim de gönderilmez.
 *
 * Mesajlaşma bildirimlerinin (WhatsApp, Telegram, Mesajlar…) içindeki RemoteInput yanıt eylemlerini saklar;
 * PC'deki Nook'tan yazılan yanıtları doğrudan bildirimin kendi PendingIntent'i üzerinden gönderir.
 *
 * Gelen arama PC'de kart olarak çıkar: "Reddet" aramanın kendi reddet eylemine basar (akıllı saatler gibi),
 * "Sessize al" zili kısar (Rahatsız Etmeyin erişimi verildiyse). Arama açılınca ya da bitince kart kalkar.
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
        if (replies.isNotEmpty()) startReplyPoller(applicationContext)
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

    /** Telefonda kapatıldı, açıldı ya da uygulama kaldırdı (okundu): PC'deki kopyası da kalksın */
    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        try {
            if (sbn.key != null && sbn.key == call?.key) endCall(applicationContext)
            if (!PcLink.prefs(this).getBoolean("notifOn", true)) return
            val key = sbn.key ?: return
            val ctx = applicationContext
            PcLink.io.execute {
                PcLink.dropQueued(ctx, key)
                PcLink.post(ctx, "/v1/notify/removed", JSONObject().put("key", key).toString().toByteArray())
            }
        } catch (_: Exception) {
        }
    }

    /** Telefon şu an kullanılıyor (ekran açık, kilit açık): gelen bildirimi kullanıcı zaten telefonda görüyor */
    private fun phoneInUse(): Boolean = runCatching {
        getSystemService(PowerManager::class.java).isInteractive && !getSystemService(KeyguardManager::class.java).isKeyguardLocked
    }.getOrDefault(false)

    /**
     * Bildirimden yanıt yazılınca uygulama bildirimi yanıtla günceller (WhatsApp "Sen: …", yanıt geçmişi):
     * bu yeni bir mesaj değil. Mesajlaşma bildiriminde son mesajı gönderen yoksa o mesaj kullanıcınındır.
     */
    @Suppress("DEPRECATION")
    private fun ownReply(ex: Bundle): Boolean {
        val history = ex.getCharSequenceArray(Notification.EXTRA_REMOTE_INPUT_HISTORY)
        if (!history.isNullOrEmpty()) return true
        val msgs: Array<Parcelable>? = ex.getParcelableArray(Notification.EXTRA_MESSAGES)
        val last = msgs?.lastOrNull() as? Bundle ?: return false
        return last.getCharSequence("sender") == null && last.get("sender_person") == null
    }

    private fun handle(sbn: StatusBarNotification) {
        val prefs = PcLink.prefs(this)
        if (!prefs.getBoolean("notifOn", true)) return
        val pkg = sbn.packageName
        if (pkg == packageName || pkg == "com.tailscale.ipn" || pkg == "android" || pkg == "com.android.systemui") return
        val n = sbn.notification
        // Arama bildirimi süren iş sayılır; gelen aramayı ayrıca ele al
        if (n.category == Notification.CATEGORY_CALL) {
            handleCall(sbn)
            return
        }
        val f = n.flags
        if (f and Notification.FLAG_ONGOING_EVENT != 0 || f and Notification.FLAG_GROUP_SUMMARY != 0 || f and Notification.FLAG_FOREGROUND_SERVICE != 0) return
        if (n.category in SKIP_CATEGORIES) return
        val muted = runCatching { JSONArray(prefs.getString("notifMuted", "[]")) }.getOrDefault(JSONArray())
        if ((0 until muted.length()).any { muted.optString(it) == pkg }) return

        val ex = n.extras
        if (ownReply(ex)) return
        // Telefonu kullanırken gelen bildirimi kullanıcı orada görüyor; yanıt eylemi yine de saklansın
        if (phoneInUse()) {
            captureReplyAction(pkg, ex.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty(), n, System.currentTimeMillis())
            return
        }
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

        // Yanıtlanabilir bildirim (WhatsApp, Telegram, Mesajlar…): RemoteInput eylemini kaydet
        val replyKey = captureReplyAction(pkg, title, n, now)

        val info = appInfo(sbn)
        val name = info?.let { packageManager.getApplicationLabel(it).toString() } ?: pkg
        remember(pkg, name)
        val json = JSONObject()
            .put("app", name)
            .put("pkg", pkg)
            .put("title", title.take(200))
            .put("text", text.take(1000))
            .put("at", now)
            .put("key", sbn.key)
        if (replyKey != null) json.put("replyKey", replyKey)
        icon(pkg, info)?.let { json.put("icon", it) }
        PcLink.sendNotification(this, json)
        if (replyKey != null) startReplyPoller(applicationContext)
    }

    /** Gelen arama PC'ye kart olarak gider (kuyruğa girmez: PC kapalıyken çalan arama sonradan anlamsız) */
    private fun handleCall(sbn: StatusBarNotification) {
        val n = sbn.notification
        val ex = n.extras
        // Android 12+ arama bildirimi türü: 1 gelen, 2 süren, 3 tarama; eskilerde gelen aramanın tam ekranı olur
        val type = ex.getInt("android.callType", 0)
        val incoming = if (type != 0) type == 1 else n.fullScreenIntent != null
        val ctx = applicationContext
        if (!incoming) {
            // Açıldı: aynı bildirim süren aramaya döndü, PC'deki kart kalksın
            if (sbn.key == call?.key) {
                endCall(ctx)
                val key = sbn.key
                PcLink.io.execute { PcLink.post(ctx, "/v1/notify/removed", JSONObject().put("key", key).toString().toByteArray()) }
            }
            return
        }
        if (sbn.key == call?.key) return
        val decline = declineIntent(n)
        call = Call(sbn.key, decline)
        if (phoneInUse()) return
        val title = ex.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
        val info = appInfo(sbn)
        val json = JSONObject()
            .put("app", info?.let { packageManager.getApplicationLabel(it).toString() } ?: "Telefon")
            .put("pkg", sbn.packageName)
            .put("title", title.ifEmpty { "?" }.take(200))
            .put("text", "")
            .put("at", System.currentTimeMillis())
            .put("key", sbn.key)
            .put("call", true)
            .put("canDecline", decline != null)
            .put("canMute", canMute(ctx))
        icon(sbn.packageName, info)?.let { json.put("icon", it) }
        PcLink.io.execute { PcLink.post(ctx, "/v1/notify", json.toString().toByteArray()) }
        startReplyPoller(ctx)
    }

    /** Aramanın reddet eylemi: Android 12+ arama bildiriminde hazır, eskilerde eylemin adından bulunur */
    @Suppress("DEPRECATION")
    private fun declineIntent(n: Notification): PendingIntent? {
        val ex = n.extras
        for (k in listOf("android.declineIntent", "android.hangUpIntent")) {
            val pi: PendingIntent? = if (Build.VERSION.SDK_INT >= 33) ex.getParcelable(k, PendingIntent::class.java) else ex.getParcelable(k)
            if (pi != null) return pi
        }
        val words = listOf("reddet", "decline", "reject", "dismiss", "sonlandır", "hang up")
        return n.actions?.firstOrNull { a -> a.actionIntent != null && words.any { a.title?.toString()?.lowercase()?.contains(it) == true } }?.actionIntent
    }

    private fun captureReplyAction(pkg: String, title: String, n: Notification, now: Long): String? {
        if (title.isEmpty()) return null
        val direct = n.actions?.toList() ?: emptyList()
        val wearable = runCatching { Notification.WearableExtender(n).actions }.getOrDefault(emptyList())
        val act = (direct + wearable).firstOrNull { !it.remoteInputs.isNullOrEmpty() && it.actionIntent != null } ?: return null
        val key = "$pkg|${title.take(200)}"
        replies.entries.removeAll { now - it.value.at > REPLY_TTL_MS }
        replies[key] = ReplyTarget(act.actionIntent, act.remoteInputs, now)
        return key
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
        private const val REPLY_TTL_MS = 6 * 3600_000L

        private class ReplyTarget(val intent: PendingIntent, val inputs: Array<RemoteInput>, @Volatile var at: Long)

        private val replies = ConcurrentHashMap<String, ReplyTarget>()

        /** Çalan arama: PC'den reddet / sessize al gelebilir */
        private class Call(val key: String, val decline: PendingIntent?, @Volatile var muted: Boolean = false)
        @Volatile private var call: Call? = null

        /** Zili kısmak Rahatsız Etmeyin erişimi ister */
        fun canMute(ctx: Context): Boolean =
            runCatching { ctx.getSystemService(NotificationManager::class.java).isNotificationPolicyAccessGranted }.getOrDefault(false)

        private fun ring(ctx: Context, dir: Int) =
            runCatching { ctx.getSystemService(AudioManager::class.java).adjustStreamVolume(AudioManager.STREAM_RING, dir, 0) }.isSuccess

        private fun endCall(ctx: Context) {
            val c = call ?: return
            call = null
            if (c.muted) ring(ctx, AudioManager.ADJUST_UNMUTE)
        }

        private fun callAction(ctx: Context, key: String, action: String) {
            val c = call ?: return
            if (key.isNotEmpty() && key != c.key) return
            when (action) {
                "decline" -> c.decline?.let { pi -> runCatching { pi.send() } }
                "mute" -> if (!c.muted && canMute(ctx) && ring(ctx, AudioManager.ADJUST_MUTE)) c.muted = true
            }
        }
        private val polling = AtomicBoolean(false)

        /**
         * PC'den gelen bildirim yanıtlarını uzun-yoklama (long-poll) ile bekler ve bildirimin kendi
         * RemoteInput PendingIntent'ini tetikleyerek mesajı gönderir.
         */
        private fun startReplyPoller(ctx: Context) {
            if (!polling.compareAndSet(false, true)) return
            Thread {
                try {
                    while (replies.isNotEmpty() || call != null) {
                        val now = System.currentTimeMillis()
                        replies.entries.removeAll { now - it.value.at > REPLY_TTL_MS }
                        if (replies.isEmpty() && call == null) break
                        val res = PcLink.get(ctx, "/v1/notify/replies", 3000, 26_000)
                        if (res == null) {
                            Thread.sleep(5000)
                            continue
                        }
                        val arr = runCatching { JSONObject(res).optJSONArray("replies") }.getOrNull() ?: continue
                        for (i in 0 until arr.length()) {
                            val item = arr.optJSONObject(i) ?: continue
                            val act = item.optString("call")
                            if (act.isNotEmpty()) {
                                callAction(ctx, item.optString("key"), act)
                                continue
                            }
                            val key = item.optString("replyKey")
                            val text = item.optString("text").trim()
                            if (key.isEmpty() || text.isEmpty()) continue
                            sendRemoteReply(ctx, key, text)
                        }
                    }
                } catch (_: Exception) {
                } finally {
                    polling.set(false)
                    if (replies.isNotEmpty() || call != null) startReplyPoller(ctx)
                }
            }.apply { isDaemon = true; start() }
        }

        private fun sendRemoteReply(ctx: Context, key: String, text: String) {
            val chatTitle = key.substringAfter("|")
            val target = replies[key]
                ?: replies.entries.firstOrNull { it.key.substringAfter("|").equals(chatTitle, ignoreCase = true) }?.value
                ?: return
            runCatching {
                val fillIn = Intent().addFlags(Intent.FLAG_RECEIVER_FOREGROUND)
                val bundle = Bundle()
                for (ri in target.inputs) bundle.putCharSequence(ri.resultKey, text)
                RemoteInput.addResultsToIntent(target.inputs, fillIn, bundle)
                if (Build.VERSION.SDK_INT >= 34) {
                    runCatching {
                        val opts = ActivityOptions.makeBasic()
                        opts.setPendingIntentBackgroundActivityStartMode(ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED)
                        target.intent.send(ctx, 0, fillIn, null, null, null, opts.toBundle())
                    }.onFailure {
                        target.intent.send(ctx, 0, fillIn)
                    }
                } else {
                    target.intent.send(ctx, 0, fillIn)
                }
                target.at = System.currentTimeMillis()
            }
        }

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
