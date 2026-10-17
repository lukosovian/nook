//! Nook Studio: ayrı, normal bir masaüstü penceresi (görev çubuğunda görünür). Ayarlar, görünüm,
//! kısayol tuşları, karne, yıl özeti ve yama notları burada; ada hafif kalır.
//! Açıksa öne getirilir ve istenen bölüme geçmesi söylenir; değilse oluşturulur.

use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

pub const STUDIO: &str = "studio";

/// Pencere yeni oluşturulurken istenen bölüm: sayfa yüklenince alır (henüz olay dinlemiyor)
static PENDING: Mutex<Option<String>> = Mutex::new(None);

/// Studio açılınca ilk gideceği bölüm (bir kez verilir)
#[tauri::command]
pub fn studio_take_section() -> Option<String> {
    PENDING.lock().ok().and_then(|mut p| p.take())
}

/// `section`: açılınca gidilecek bölüm (home, look, keys, modules, report, year, notes, settings,
/// settings:Kısayollar gibi ayar bölümü). Async olmalı: Windows'ta senkron komutun içinde pencere
/// oluşturmak WebView2'yi kilitliyor (pencere açılıyor ama içi hiç yüklenmiyordu).
#[tauri::command]
pub async fn open_studio(app: AppHandle, section: Option<String>) -> Result<(), String> {
    open(&app, section).map_err(|e| e.to_string())
}

pub fn open(app: &AppHandle, section: Option<String>) -> tauri::Result<()> {
    if let Some(win) = app.get_webview_window(STUDIO) {
        let _ = win.unminimize();
        let _ = win.show();
        bring_front(&win);
        if let Some(s) = section {
            let _ = win.emit_to(STUDIO, "nook://studio-go", s);
        }
        return Ok(());
    }
    if let Ok(mut p) = PENDING.lock() {
        *p = section;
    }
    let win = WebviewWindowBuilder::new(app, STUDIO, WebviewUrl::App("index.html".into()))
        .title("Nook Studio")
        .inner_size(1180.0, 760.0)
        .min_inner_size(940.0, 620.0)
        .resizable(true)
        .decorations(false)
        .shadow(true)
        .center()
        .focused(true)
        .visible(true)
        .background_color(tauri::window::Color(14, 14, 16, 255))
        .build()?;
    bring_front(&win);
    Ok(())
}

/// Öne getir: ada odak almayan bir pencere olduğundan Windows, ondan açılan pencerenin öne gelmesine
/// izin vermiyor (Gezgin'in arkasında kalıyordu). Bir anlığına "en üstte" yapıp bırakmak onu öne çıkarır.
fn bring_front(win: &tauri::WebviewWindow) {
    let _ = win.set_always_on_top(true);
    let _ = win.set_focus();
    let w = win.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(400));
        let _ = w.set_always_on_top(false);
        let _ = w.set_focus();
    });
}
