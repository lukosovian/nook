package app.nook.mobile

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import org.json.JSONObject

class MainActivity : TauriActivity() {
  private var bridge: NookBridge? = null
  /** "Bilinmeyen uygulamaları yükle" izni verilince kaldığı yerden devam edecek güncelleme */
  var pendingApk: String? = null
  /** Başka uygulamadan "Nook'a gönder" ile gelenler (web tarafı peekShare ile okur) */
  var shared: JSONObject? = null
  var sharedUris: List<Uri> = emptyList()

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    readShare(intent)
  }

  override fun onWebViewCreate(webView: WebView) {
    val b = NookBridge(this, webView)
    bridge = b
    webView.addJavascriptInterface(b, "NookNative")
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    if (readShare(intent)) bridge?.emit("share")
  }

  @Suppress("DEPRECATION")
  private fun readShare(intent: Intent?): Boolean {
    if (intent == null) return false
    val uris: List<Uri> = when (intent.action) {
      Intent.ACTION_SEND -> listOfNotNull(intent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri)
      Intent.ACTION_SEND_MULTIPLE -> intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM) ?: emptyList()
      else -> return false
    }
    if (uris.isNotEmpty()) {
      sharedUris = uris
      shared = JSONObject().put("files", NookBridge.describe(this, uris))
      return true
    }
    val text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString() ?: return false
    sharedUris = emptyList()
    shared = JSONObject().put("text", text)
    return true
  }

  override fun onStart() {
    super.onStart()
    alarm(false)
    bridge?.emit("resume")
  }

  override fun onResume() {
    super.onResume()
    val apk = pendingApk
    if (apk != null && (Build.VERSION.SDK_INT < 26 || packageManager.canRequestPackageInstalls())) {
      pendingApk = null
      bridge?.installApk(apk)
    }
  }

  override fun onStop() {
    super.onStop()
    // Nook'un açtığı Tailscale: uygulamadan çıkıldıktan bir süre sonra kapanır (geri dönülürse iptal)
    if (PcLink.prefs(this).getBoolean("tsOurs", false)) alarm(true)
  }

  override fun onDestroy() {
    if (isFinishing) NookBridge.tailscaleOff(this)
    super.onDestroy()
  }

  private fun alarm(on: Boolean) {
    val am = getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pi = PendingIntent.getBroadcast(this, 0, Intent(this, TailscaleOffReceiver::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    if (on) am.set(AlarmManager.ELAPSED_REALTIME, SystemClock.elapsedRealtime() + 90_000, pi) else am.cancel(pi)
  }
}

/** Nook'tan çıkıldıktan sonra Nook'un açtığı Tailscale'i kapatır (uygulama o arada kapansa da çalışır) */
class TailscaleOffReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    NookBridge.tailscaleOff(context)
  }
}
