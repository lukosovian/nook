//! Nook Studio: ayrı, normal bir masaüstü penceresi (görev çubuğunda görünür). Ayarlar, görünüm,
//! kısayol tuşları, karne, yıl özeti ve yama notları burada; ada hafif kalır.
//! Açıksa öne getirilir ve istenen bölüme geçmesi söylenir; değilse oluşturulur.

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, Window, WindowEvent};

pub const STUDIO: &str = "studio";

/// Pencere yeni oluşturulurken istenen bölüm: sayfa yüklenince alır (henüz olay dinlemiyor)
static PENDING: Mutex<Option<String>> = Mutex::new(None);

#[derive(serde::Serialize, serde::Deserialize)]
struct StudioSize {
    width: f64,
    height: f64,
}

fn config_path() -> Option<PathBuf> {
    Some(PathBuf::from(std::env::var_os("LOCALAPPDATA")?).join("Nook").join("studio_size.json"))
}

fn load_saved_size() -> Option<(f64, f64)> {
    let p = config_path()?;
    let s = std::fs::read_to_string(p).ok()?;
    let sz = serde_json::from_str::<StudioSize>(&s).ok()?;
    let w = sz.width.max(940.0);
    let h = sz.height.max(620.0);
    Some((w, h))
}

fn save_size(width: f64, height: f64) {
    let Some(p) = config_path() else { return };
    if let Some(dir) = p.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    if let Ok(s) = serde_json::to_string(&StudioSize { width, height }) {
        let _ = std::fs::write(p, s);
    }
}

/// Studio penceresi yeniden boyutlandırıldığında son boyutu hatırla (maksimize değilken)
pub fn on_window_event(win: &Window, event: &WindowEvent) {
    if win.label() != STUDIO {
        return;
    }
    if let WindowEvent::Resized(phys) = event {
        if !win.is_maximized().unwrap_or(false) && !win.is_minimized().unwrap_or(false) {
            let scale = win.scale_factor().unwrap_or(1.0);
            let w = phys.width as f64 / scale;
            let h = phys.height as f64 / scale;
            if w >= 940.0 && h >= 620.0 {
                save_size(w, h);
            }
        }
    }
}

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
    let (width, height) = load_saved_size().unwrap_or((1180.0, 760.0));
    let win = WebviewWindowBuilder::new(app, STUDIO, WebviewUrl::App("index.html".into()))
        .title("Nook Studio")
        .inner_size(width, height)
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
