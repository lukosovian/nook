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

/// Ada kapanınca (not yazdıktan sonra vb.) klavye odağını önceki uygulamaya geri ver.
#[tauri::command]
pub fn release_focus(shared: State<'_, Arc<Shared>>) {
    focus::release(&shared);
}

/// Frontend ayarları değişince (ve açılışta) çağrılır.
#[tauri::command]
pub async fn apply_settings(app: AppHandle, settings: Settings, shared: State<'_, Arc<Shared>>) -> Result<(), String> {
    *shared.settings.lock().unwrap() = settings.clone();
    window::apply_monitor_mode(&app, &settings);
    shortcut::register(&app, &settings.shortcut, &settings.ask_shortcut, &settings.voice_shortcut)
}

/// Tanıtım ekranı için pencereyi büyütür; bitince varsayılan boyuta döner.
#[tauri::command]
pub fn set_window_size(window: WebviewWindow, width: Option<f64>, height: Option<f64>) -> Result<(), String> {
    window::resize_island(&window, width.unwrap_or(window::WIN_W), height.unwrap_or(window::WIN_H)).map_err(|e| e.to_string())?;
    // Büyüyen pencerenin yeni alanı beyaz görünmesin
    window::clear_background(&window);
    Ok(())
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
