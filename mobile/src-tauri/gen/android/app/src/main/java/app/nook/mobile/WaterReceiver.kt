package app.nook.mobile

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject

/**
 * Su hatırlatması telefonda: PC'deki Nook'un sayacını izler (/v1/water). PC'de hatırlatma çıkınca telefonda da
 * "İçtim" / "Sonra" düğmeli bildirim çıkar; hangi taraftan cevaplanırsa iki tarafta da kapanır.
 * PC kapalıyken ya da kullanıcı başında değilken telefon kendi sayacıyla (son içilen + aralık) hatırlatır.
 * Zamanlayıcı: AlarmManager → bu alıcı (uygulama kapalıyken de); telefon yeniden başlayınca da kurulur.
 */
class WaterReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val ctx = context.applicationContext
        // HyperOS bildirim dinleyicisini sık sık bırakıyor (izin açık ama hiçbir bildirim gelmiyor): bu alarm
        // düzenli çalıştığından her seferinde yeniden bağlanmayı ister (süreç öldürülünce "bağlı" kaydı eski kalıyor,
        // ona bakılmaz), bekleyen bildirimleri de gönderir
        NookNotifService.rebind(ctx)
        PcLink.flushOutbox(ctx)
        val pending = goAsync()
        PcLink.io.execute {
            try {
                when (intent.action) {
                    ACTION_DRANK -> answer(ctx, "drank")
                    ACTION_SNOOZE -> answer(ctx, "snooze")
                    else -> check(ctx)
                }
            } catch (e: Exception) {
                // bir sonraki denetimde düzelir
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        private const val ACTION_CHECK = "app.nook.mobile.WATER_CHECK"
        private const val ACTION_DRANK = "app.nook.mobile.WATER_DRANK"
        private const val ACTION_SNOOZE = "app.nook.mobile.WATER_SNOOZE"
        private const val CHANNEL = "water"
        private const val NOTIF_ID = 4201
        private const val MIN = 60_000L
        /** Bildirim açıkken PC'de cevaplandı mı diye bu aralıkla bakılır */
        private const val RECHECK_MS = 2 * MIN
        private const val SNOOZE_MS = 15 * MIN

        /** Uygulama açılınca / ayar değişince: hemen bir denetim */
        fun kick(ctx: Context) = schedule(ctx, System.currentTimeMillis() + 3000)

        private fun intent(ctx: Context, action: String) =
            PendingIntent.getBroadcast(ctx, action.hashCode(), Intent(ctx, WaterReceiver::class.java).setAction(action), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

        private fun schedule(ctx: Context, at: Long) {
            val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            // Tam zaman şart değil: birkaç dakika kayabilir, pil dostu
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent(ctx, ACTION_CHECK))
        }

        private fun cancelAlarm(ctx: Context) {
            (ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(intent(ctx, ACTION_CHECK))
        }

        private fun prefs(ctx: Context) = PcLink.prefs(ctx)

        private fun check(ctx: Context) {
            val p = prefs(ctx)
            if (!p.getBoolean("waterOn", true) || PcLink.pairing(ctx) == null) {
                hide(ctx)
                cancelAlarm(ctx)
                return
            }
            val now = System.currentTimeMillis()
            val pc = PcLink.get(ctx, "/v1/water")?.let { runCatching { JSONObject(it) }.getOrNull() }
            if (pc != null && pc.has("every")) {
                val every = pc.optInt("every", 0)
                val last = maxOf(pc.optLong("last", 0), p.getLong("waterLast", 0))
                p.edit().putInt("waterEvery", every).putLong("waterLast", last).apply()
                if (every <= 0) {
                    hide(ctx)
                    cancelAlarm(ctx)
                    return
                }
                if (!pc.optBoolean("away", false)) {
                    // PC'nin başında: PC ne diyorsa o
                    if (pc.optBoolean("due", false)) {
                        show(ctx, own = false)
                        schedule(ctx, now + RECHECK_MS)
                    } else {
                        hide(ctx)
                        schedule(ctx, maxOf(now + MIN, pc.optLong("nextAt", now + every * MIN)))
                    }
                    return
                }
            }
            // PC kapalı ya da kullanıcı başında değil: telefonun kendi sayacı
            val every = p.getInt("waterEvery", 0)
            if (every <= 0) return
            val dueAt = p.getLong("waterLast", now) + every * MIN
            if (now >= dueAt) {
                show(ctx, own = true)
                // Cevaplanmadıysa PC açılınca / başına dönünce yeniden bakılsın
                schedule(ctx, now + 15 * MIN)
            } else {
                schedule(ctx, dueAt)
            }
        }

        private fun answer(ctx: Context, op: String) {
            val p = prefs(ctx)
            val own = p.getBoolean("waterOwn", false)
            hide(ctx)
            val now = System.currentTimeMillis()
            val sent = PcLink.post(ctx, "/v1/water", JSONObject().put("op", op).put("own", own).toString().toByteArray()) != null
            val every = p.getInt("waterEvery", 0)
            if (op == "drank") p.edit().putLong("waterLast", now).apply()
            // "Sonra": 15 dk sonra yeniden (PC'de de aynısı yapılır)
            else p.edit().putLong("waterLast", now - every * MIN + SNOOZE_MS).apply()
            schedule(ctx, if (sent) now + 20_000 else if (op == "drank") now + every * MIN else now + SNOOZE_MS)
        }

        private fun show(ctx: Context, own: Boolean) {
            prefs(ctx).edit().putBoolean("waterOwn", own).apply()
            val nm = NotificationManagerCompat.from(ctx)
            if (!nm.areNotificationsEnabled()) return
            if (Build.VERSION.SDK_INT >= 26) {
                val m = ctx.getSystemService(NotificationManager::class.java)
                if (m.getNotificationChannel(CHANNEL) == null) {
                    m.createNotificationChannel(NotificationChannel(CHANNEL, "Su hatırlatması", NotificationManager.IMPORTANCE_DEFAULT).apply { description = "PC'deki Nook'la birlikte su içmeyi hatırlatır" })
                }
            }
            val open = PendingIntent.getActivity(ctx, 0, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_IMMUTABLE)
            val n = NotificationCompat.Builder(ctx, CHANNEL)
                .setSmallIcon(R.drawable.ic_water)
                .setContentTitle("Su içme vakti")
                .setContentText("Bir bardak su iç, Nook da seninle içsin")
                .setColor(0xFF3D8BFF.toInt())
                .setContentIntent(open)
                .setOnlyAlertOnce(true)
                .setAutoCancel(false)
                .addAction(0, "İçtim", intent(ctx, ACTION_DRANK))
                .addAction(0, "Sonra", intent(ctx, ACTION_SNOOZE))
                .build()
            runCatching { nm.notify(NOTIF_ID, n) }
        }

        private fun hide(ctx: Context) {
            NotificationManagerCompat.from(ctx).cancel(NOTIF_ID)
        }
    }
}
