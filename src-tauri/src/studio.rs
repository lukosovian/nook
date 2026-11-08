//! Nook Studio: ayrı, normal bir masaüstü penceresi (görev çubuğunda görünür). Ayarlar, görünüm,
//! kısayol tuşları, karne, yıl özeti ve yama notları burada; ada hafif kalır.
//! Açıksa öne getirilir ve istenen bölüme geçmesi söylenir; değilse oluşturulur.

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, Window, WindowEvent};

pub const STUDIO: &str = "studio";

/// Pencere yeni oluşturulurken istenen bölüm: sayfa yüklenince alır (henüz olay dinlemiyor)
static PENDING: Mutex<Option<String>> = Mutex::new(None);

/// Studio'nun son hâli: boyutu, yeri (fiziksel piksel) ve büyütülmüş mü
#[derive(serde::Serialize, serde::Deserialize, Clone, Copy)]
#[serde(default)]
struct StudioSize {
    width: f64,
    height: f64,
    x: Option<i32>,
    y: Option<i32>,
    maximized: bool,
}

impl Default for StudioSize {
    fn default() -> Self {
        Self { width: 1180.0, height: 760.0, x: None, y: None, maximized: false }
    }
}

static LAST: Mutex<Option<StudioSize>> = Mutex::new(None);

fn config_path() -> Option<PathBuf> {
    Some(PathBuf::from(std::env::var_os("LOCALAPPDATA")?).join("Nook").join("studio_size.json"))
}

fn load() -> StudioSize {
    let mut sz = config_path()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str::<StudioSize>(&s).ok())
        .unwrap_or_default();
    sz.width = sz.width.max(940.0);
    sz.height = sz.height.max(620.0);
    sz
}

/// Diske yazma bekliyor: sürüklerken her olayda değil, yarım saniyede en fazla bir kez yazılır
static SAVING: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

fn save(sz: StudioSize) {
    *LAST.lock().unwrap() = Some(sz);
    if SAVING.swap(true, std::sync::atomic::Ordering::SeqCst) {
        return;
    }
    std::thread::spawn(|| {
        std::thread::sleep(std::time::Duration::from_millis(500));
        SAVING.store(false, std::sync::atomic::Ordering::SeqCst);
        if let Some(sz) = *LAST.lock().unwrap() {
            write(sz);
        }
    });
}

fn write(sz: StudioSize) {
    let Some(p) = config_path() else { return };
    if let Some(dir) = p.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    if let Ok(s) = serde_json::to_string(&sz) {
        if let Err(e) = std::fs::write(&p, s) {
            crate::log::write("warn", &format!("Studio boyutu kaydedilemedi: {e}"));
        }
    }
}

/// Studio boyutlanınca, taşınınca ya da büyütülünce son hâlini hatırla; bir dahaki açılışta öyle açılır
pub fn on_window_event(win: &Window, event: &WindowEvent) {
    if win.label() != STUDIO || !matches!(event, WindowEvent::Resized(_) | WindowEvent::Moved(_)) {
        return;
    }
    if win.is_minimized().unwrap_or(false) {
        return;
    }
    let mut sz = LAST.lock().unwrap().unwrap_or_else(load);
    sz.maximized = win.is_maximized().unwrap_or(false);
    // Büyütülmüşken boyutu ve yeri değil yalnızca "büyük" olduğunu sakla; küçültünce eski boyuta döner
    if !sz.maximized {
        let scale = win.scale_factor().unwrap_or(1.0);
        if let Ok(size) = win.inner_size() {
            let (w, h) = (size.width as f64 / scale, size.height as f64 / scale);
            if w >= 940.0 && h >= 620.0 {
                sz.width = w;
                sz.height = h;
            }
        }
        if let Ok(pos) = win.outer_position() {
            sz.x = Some(pos.x);
            sz.y = Some(pos.y);
        }
    }
    save(sz);
}

/// Kaydedilen yer hâlâ bir ekranın içinde mi (ekran çıkarıldıysa ortaya açılır)
fn on_screen(app: &AppHandle, x: i32, y: i32) -> bool {
    let monitors = app.available_monitors().unwrap_or_default();
    crate::window::monitor_at(&monitors, x as f64 + 60.0, y as f64 + 20.0).is_some()
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
    let sz = load();
    *LAST.lock().unwrap() = Some(sz);
    let mut builder = WebviewWindowBuilder::new(app, STUDIO, WebviewUrl::App("index.html".into()))
        .title("Nook Studio")
        .inner_size(sz.width, sz.height)
        .min_inner_size(940.0, 620.0)
        .resizable(true)
        .decorations(false)
        .shadow(true)
        .focused(true)
        .visible(true)
        .background_color(tauri::window::Color(14, 14, 16, 255));
    let placed = matches!((sz.x, sz.y), (Some(x), Some(y)) if on_screen(app, x, y));
    if !placed {
        builder = builder.center();
    }
    let win = builder.build()?;
    if let (true, Some(x), Some(y)) = (placed, sz.x, sz.y) {
        let _ = win.set_position(tauri::PhysicalPosition::new(x, y));
    }
    // Arayüz boyutu (Ayarlar › Erişilebilirlik) Studio'yu da büyütür
    crate::window::apply_zoom(&win);
    if sz.maximized {
        let _ = win.maximize();
    } else {
        fit(&win);
    }
    bring_front(&win);
    Ok(())
}

/// Studio'yu bulunduğu ekranın çalışma alanına (görev çubuğu hariç) sığdırır: 1366x768 gibi küçük
/// ekranlarda alt kenar görev çubuğunun arkasında kalmaz. En küçük boyut arayüz ölçeğiyle büyür
/// (sayfa sıkışmasın), ama hiçbir zaman ekrandan büyük olmaz.
pub fn fit(win: &tauri::WebviewWindow) {
    let Some(m) = win.current_monitor().ok().flatten().or_else(|| crate::window::primary_monitor(win.app_handle())) else { return };
    let s = m.scale_factor();
    let area = *m.work_area();
    let (aw, ah) = (area.size.width as f64 / s, area.size.height as f64 / s);
    let z = crate::window::zoom();
    let (min_w, min_h) = ((940.0 * z).min(aw), (620.0 * z).min(ah));
    let _ = win.set_min_size(Some(tauri::LogicalSize::new(min_w, min_h)));
    if win.is_maximized().unwrap_or(false) {
        return;
    }
    let Ok(size) = win.outer_size() else { return };
    let (w, h) = (size.width as f64 / s, size.height as f64 / s);
    let (nw, nh) = (w.max(min_w).min(aw), h.max(min_h).min(ah));
    if (nw - w).abs() > 0.5 || (nh - h).abs() > 0.5 {
        let _ = win.set_size(tauri::LogicalSize::new(nw, nh));
    }
    // Pencere çalışma alanından taşıyorsa içeri çek
    if let Ok(pos) = win.outer_position() {
        let (pw, ph) = ((nw * s).round() as i32, (nh * s).round() as i32);
        let (ax, ay) = (area.position.x, area.position.y);
        let (ar, ab) = (ax + area.size.width as i32, ay + area.size.height as i32);
        let x = pos.x.min(ar - pw).max(ax);
        let y = pos.y.min(ab - ph).max(ay);
        if x != pos.x || y != pos.y {
            let _ = win.set_position(tauri::PhysicalPosition::new(x, y));
        }
    }
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
