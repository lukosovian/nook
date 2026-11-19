//! Şarkı bildirimi: İzlerken Hum bir şarkı bulunca videonun ekranının sol altında (tam ekran video
//! varsa onun ekranı, yoksa öndeki pencerenin ekranı) küçük, tıklanamaz bir çubuk çıkar. Argus kartı gibi ayrı pencere; hiç odak almaz (tarayıcı tam
//! ekrandan çıkmasın), oluşturulunca yerinde kalır, içeriği kendi animasyonuyla kaybolur; birkaç dakika bildirim gelmezse kapatılır.

use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Emitter, Manager};

use crate::state::Shared;

pub const LABEL: &str = "song-toast";
const W: f64 = 380.0;
const H: f64 = 96.0;
/// Ekranın sol alt köşesinden uzaklık (mantıksal px)
const MARGIN: f64 = 28.0;

/// Pencere yeni açıldıysa sayfa yüklenince bunu alır
static PENDING: Mutex<Option<serde_json::Value>> = Mutex::new(None);
/// Bildirim sayacı: boşta kalan pencereyi kapatan bekleyiş, arada yeni bildirim geldiyse vazgeçer
static USES: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
const KEEP: std::time::Duration = std::time::Duration::from_secs(180);

/// Şarkıyı videonun ekranının sol altında göster
#[tauri::command]
pub async fn song_toast(app: AppHandle, data: serde_json::Value) -> Result<(), String> {
    let shared = app.state::<Arc<Shared>>().inner().clone();
    let title = data.get("title").and_then(|v| v.as_str()).unwrap_or("").to_owned();
    let full = *shared.full_screen.lock().unwrap();
    let screen = full.or_else(|| crate::fullscreen::foreground_screen(&shared)).or_else(|| {
        let m = app.primary_monitor().ok()??;
        Some((m.position().x, m.position().y, m.position().x + m.size().width as i32, m.position().y + m.size().height as i32))
    });
    let Some((l, _, _, b)) = screen else {
        crate::log::write("info", &format!("şarkı bildirimi ({title}): ekran bulunamadı"));
        return Ok(());
    };
    crate::log::write("info", &format!("şarkı bildirimi ({title}): ekran @{l},{b} tam ekran={}", full.is_some()));
    let monitors = app.available_monitors().unwrap_or_default();
    let scale = monitors
        .iter()
        .find(|m| m.position().x == l && m.position().y + m.size().height as i32 == b)
        .map(|m| m.scale_factor())
        .unwrap_or(1.0);
    let x = l as f64 + MARGIN * scale;
    // Tam ekran değilse görev çubuğunun üstünde dursun
    let taskbar = if full.is_some() { 0.0 } else { 48.0 };
    let y = b as f64 - (H + MARGIN + taskbar) * scale;
    let at = tauri::PhysicalPosition::new(x.round() as i32, y.round() as i32);
    *PENDING.lock().unwrap() = Some(data.clone());
    let win = match app.get_webview_window(LABEL) {
        Some(w) => w,
        None => {
            let w = tauri::WebviewWindowBuilder::new(&app, LABEL, tauri::WebviewUrl::App("index.html".into()))
                .position(x / scale, y / scale)
                .title("Nook")
                .inner_size(W, H)
                .resizable(false)
                .maximizable(false)
                .minimizable(false)
                .decorations(false)
                .transparent(true)
                .shadow(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .focused(false)
                .visible(true)
                // Kapalı/örtülü sayılsa da çizmeyi ve zamanlayıcıları bırakmasın
                .background_throttling(tauri::utils::config::BackgroundThrottlingPolicy::Disabled)
                .build()
                .map_err(|e| e.to_string())?;
            w.set_ignore_cursor_events(true).map_err(|e| e.to_string())?;
            crate::window::clear_background(&w);
            w
        }
    };
    win.set_position(at).map_err(|e| e.to_string())?;
    // WebView2 boş (şeffaf) kalınca kendini görünmez sayıp çizmeyi bırakabiliyor: her bildirimde uyandır
    #[cfg(windows)]
    let _ = win.with_webview(|pv| unsafe {
        let _ = pv.controller().SetIsVisible(true);
    });
    crate::window::clear_background(&win);
    // Tam ekran tarayıcı öne geçip bildirimi alta itebiliyor: görünür kaldığı sürece arada bir en öne al
    #[cfg(windows)]
    if let Ok(h) = win.hwnd() {
        let hwnd = h.0 as isize;
        std::thread::spawn(move || {
            for _ in 0..16 {
                crate::fullscreen::raise_window(hwnd);
                std::thread::sleep(std::time::Duration::from_millis(450));
            }
        });
    }
    let _ = app.emit_to(LABEL, "nook://song-toast", data);
    // Son bildirimden sonra KEEP kadar yenisi gelmezse pencere (ayrı bir WebView, ~55 MB) kapatılır;
    // sonraki şarkıda yukarıda ilk seferdeki gibi (görünür, odaksız) yeniden oluşturulur.
    let mine = USES.fetch_add(1, std::sync::atomic::Ordering::SeqCst) + 1;
    std::thread::spawn(move || {
        std::thread::sleep(KEEP);
        if USES.load(std::sync::atomic::Ordering::SeqCst) == mine {
            if let Some(w) = app.get_webview_window(LABEL) {
                let _ = w.destroy();
            }
        }
    });
    Ok(())
}

/// Bildirim penceresi yüklenince kaçırdığı son şarkıyı alır
#[tauri::command]
pub fn song_toast_take() -> Option<serde_json::Value> {
    PENDING.lock().unwrap().take()
}
