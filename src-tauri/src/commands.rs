use std::path::PathBuf;
use std::sync::Arc;

use serde::Serialize;
use tauri::{AppHandle, Manager, State, WebviewWindow};

use crate::focus;
use crate::shortcut;
use crate::state::{Rect, Settings, Shared};
use crate::window::{self, MonitorInfo};

const IMAGE_EXTS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif", "ico"];

/// Frontend, adanın o anki sınırlarını (pencere-yerel, mantıksal px) bildirir.
#[tauri::command]
pub fn set_hit_rect(window: WebviewWindow, rect: Rect, extra: Option<Rect>, shared: State<'_, Arc<Shared>>) {
    shared.set_hit(window.label(), rect, extra);
}

/// Arama açıkken imleç dışarıda olsa da pencere tıklanabilir ve odakta kalır.
/// Kapanınca odak önceki uygulamaya geri verilir.
#[tauri::command]
pub fn set_interactive(window: WebviewWindow, on: bool, shared: State<'_, Arc<Shared>>) {
    let label = window.label().to_owned();
    if on {
        focus::remember(&shared);
        shared.forced.lock().unwrap().insert(label);
        let _ = window.set_ignore_cursor_events(false);
        let _ = window.set_focus();
    } else {
        shared.forced.lock().unwrap().remove(&label);
        focus::release(&shared);
    }
}

/// Açılış kilidi (parola adada soruluyor): açıkken diğer adalar ve yan kartlar etkileşime kapanır
#[tauri::command]
pub fn set_gate(on: bool, shared: State<'_, Arc<Shared>>) {
    shared.gated.store(on, std::sync::atomic::Ordering::Relaxed);
}

/// Ada kapanınca (not yazdıktan sonra vb.) klavye odağını önceki uygulamaya geri ver.
#[tauri::command]
pub fn release_focus(shared: State<'_, Arc<Shared>>) {
    focus::release(&shared);
}

/// Frontend ayarları değişince (ve açılışta) çağrılır.
#[tauri::command]
pub async fn apply_settings(app: AppHandle, settings: Settings, shared: State<'_, Arc<Shared>>) -> Result<(), String> {
    *shared.settings.lock().unwrap() = settings.clone();
    crate::log::set_keep_days(settings.log_days);
    crate::outside::set_tailscale_keep(settings.tailscale_keep);
    window::set_zoom(&app, settings.ui_scale);
    window::set_tray_labels(&settings.tray_labels);
    window::apply_monitor_mode(&app, &settings);
    shortcut::register(&app, &settings)
}

/// Adayı sürüklemeye başla (üst çubuktaki tutamaçtan). Windows'un kendi taşıma döngüsü çalışır;
/// tuş bırakılınca tracker yeni yeri kaydettirir (bkz. window::finish_drag).
#[tauri::command]
pub fn island_drag(window: WebviewWindow, shared: State<'_, Arc<Shared>>) -> Result<(), String> {
    shared.dragging.store(true, std::sync::atomic::Ordering::Relaxed);
    *shared.drag_label.lock().unwrap() = window.label().to_owned();
    window.start_dragging().map_err(|e| e.to_string())
}

/// Tanıtım ekranı için pencereyi büyütür; bitince varsayılan boyuta döner.
#[tauri::command]
pub fn set_window_size(window: WebviewWindow, width: Option<f64>, height: Option<f64>) -> Result<(), String> {
    window::resize_island(&window, width.unwrap_or(window::WIN_W), height.unwrap_or(window::WIN_H)).map_err(|e| e.to_string())?;
    // Büyüyen pencerenin yeni alanı beyaz görünmesin
    window::clear_background(&window);
    Ok(())
}

/// Adanın zemini beyaza döndüyse düzelt (dışarı çıkış bitince, uykudan/boşta kalmadan dönünce)
#[tauri::command]
pub fn clear_background(app: AppHandle) {
    window::clear_islands(&app);
}

#[tauri::command]
pub fn list_monitors(app: AppHandle) -> Vec<MonitorInfo> {
    window::list_monitors(&app)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileMeta {
    path: String,
    name: String,
    ext: String,
    size: u64,
    is_dir: bool,
    is_image: bool,
}

/// Bırakılan yolları doğrular, meta verisini döner ve görselleri asset protokolüne
/// (küçük önizleme için) tek tek açar. Kapsam varsayılan olarak boştur — yalnızca
/// kullanıcının Nook'a bıraktığı görseller okunabilir.
#[tauri::command]
pub fn inspect_paths(app: AppHandle, paths: Vec<String>) -> Vec<FileMeta> {
    let scope = app.asset_protocol_scope();
    paths
        .into_iter()
        .filter_map(|raw| {
            let path = PathBuf::from(&raw);
            let meta = std::fs::metadata(&path).ok()?;
            let ext = path
                .extension()
                .map(|e| e.to_string_lossy().to_lowercase())
                .unwrap_or_default();
            let is_dir = meta.is_dir();
            let is_image = !is_dir && IMAGE_EXTS.contains(&ext.as_str());
            if is_image {
                let _ = scope.allow_file(&path);
            }
            Some(FileMeta {
                name: path
                    .file_name()
                    .map(|n| n.to_string_lossy().into_owned())
                    .unwrap_or_else(|| raw.clone()),
                path: raw,
                ext,
                size: if is_dir { 0 } else { meta.len() },
                is_dir,
                is_image,
            })
        })
        .collect()
}

/// Görsel olmayan dosyaları dışarı sürüklerken gösterilecek önizleme ikonu.
/// Drag eklentisi disk üzerinde bir yol istediği için gömülü PNG'yi önbelleğe yazarız.
#[tauri::command]
pub fn drag_icon_path(app: AppHandle) -> Result<String, String> {
    static ICON: &[u8] = include_bytes!("../icons/128x128.png");
    let dir = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file = dir.join("drag-icon.png");
    if !file.exists() {
        std::fs::write(&file, ICON).map_err(|e| e.to_string())?;
    }
    Ok(file.to_string_lossy().into_owned())
}

/// Studio › Duvar kağıtları: tam boy resim GitHub'daki "duvar-kagitlari" sürümünden bir kez indirilip
/// Resimler › Nook'a kaydedilir ve Windows'un masaüstü arka planı yapılır (SystemParametersInfoW; betik
/// çalıştırmaz). Kaydedilen dosyanın yolunu döner.
#[tauri::command]
pub async fn set_wallpaper(app: AppHandle, id: String) -> Result<String, String> {
    let safe: String = id.chars().filter(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || *c == '-').take(40).collect();
    if safe.is_empty() || safe != id {
        return Err("geçersiz duvar kağıdı".into());
    }
    let dir = app.path().picture_dir().map_err(|e| e.to_string())?.join("Nook");
    tauri::async_runtime::spawn_blocking(move || fetch_and_apply(&dir, &safe)).await.map_err(|e| e.to_string())?
}

/// Resmi (yoksa bir kez indirip) Resimler › Nook'a kaydeder ve masaüstü arka planı yapar
fn fetch_and_apply(dir: &std::path::Path, id: &str) -> Result<String, String> {
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("nook-{id}.jpg"));
    if !path.exists() {
        let url = format!("https://github.com/lukosovian/nook/releases/download/duvar-kagitlari/{id}.jpg");
        let res = ureq::get(&url).timeout(std::time::Duration::from_secs(60)).call().map_err(|_| "İndirilemedi; internet bağlantını kontrol et".to_string())?;
        let mut bytes = Vec::new();
        std::io::Read::read_to_end(&mut std::io::Read::take(res.into_reader(), 30 << 20), &mut bytes).map_err(|e| e.to_string())?;
        let tmp = path.with_extension("part");
        std::fs::write(&tmp, &bytes).map_err(|e| e.to_string())?;
        std::fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    }
    apply_wallpaper(&path)?;
    Ok(path.to_string_lossy().into_owned())
}

/// Duvar kağıdı döngüsü: yarım dakikada bir sıradaki resmin vakti geldi mi bakar, geldiyse yalnızca bir kez
/// uygular (Windows'un kendi slayt gösterisi gibi; arkada başka iş yapmaz, bilgisayarı yormaz).
pub fn spawn_wallpaper_cycle(app: AppHandle, shared: Arc<Shared>) {
    let _ = std::thread::Builder::new().name("nook-wallpaper".into()).spawn(move || {
        let mut last: Option<String> = None;
        loop {
            std::thread::sleep(std::time::Duration::from_secs(30));
            let Some(cycle) = shared.settings().wallpaper_cycle.filter(|c| !c.ids.is_empty()) else {
                last = None;
                continue;
            };
            let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0);
            let step = cycle.every_min.max(1) * 60_000;
            let id = &cycle.ids[(now.saturating_sub(cycle.since) / step) as usize % cycle.ids.len()];
            if last.as_deref() == Some(id.as_str()) || !id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-') {
                continue;
            }
            let Ok(dir) = app.path().picture_dir().map(|d| d.join("Nook")) else { continue };
            match fetch_and_apply(&dir, id) {
                Ok(_) => {
                    crate::log::write("info", &format!("duvar kağıdı döngüsü: {id}"));
                    last = Some(id.clone());
                }
                Err(e) => crate::log::write("warn", &format!("duvar kağıdı döngüsü: {id}: {e}")),
            }
        }
    });
}

#[cfg(windows)]
fn apply_wallpaper(path: &std::path::Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::WindowsAndMessaging::{SystemParametersInfoW, SPIF_SENDCHANGE, SPIF_UPDATEINIFILE, SPI_SETDESKWALLPAPER};
    let wide: Vec<u16> = path.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
    let ok = unsafe { SystemParametersInfoW(SPI_SETDESKWALLPAPER, 0, wide.as_ptr() as *mut _, SPIF_UPDATEINIFILE | SPIF_SENDCHANGE) };
    if ok == 0 {
        return Err("Windows duvar kağıdını değiştiremedi".into());
    }
    Ok(())
}

#[cfg(not(windows))]
fn apply_wallpaper(_path: &std::path::Path) -> Result<(), String> {
    Err("yalnızca Windows".into())
}
