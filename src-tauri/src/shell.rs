//! Windows kabuğu: dosya/uygulama/URL açma, Gezgin'de gösterme, Başlat menüsü uygulamaları.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde::Serialize;

/// Dosyayı varsayılan uygulamasıyla, kısayolu (.lnk) ya da URL'yi açar.
#[tauri::command]
pub fn open_path(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::Shell::ShellExecuteW;
        use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
        let wide = |s: &str| s.encode_utf16().chain(Some(0)).collect::<Vec<u16>>();
        let (verb, target) = (wide("open"), wide(&path));
        let code = unsafe {
            ShellExecuteW(std::ptr::null_mut(), verb.as_ptr(), target.as_ptr(), std::ptr::null(), std::ptr::null(), SW_SHOWNORMAL)
        } as isize;
        // ShellExecute 32'den büyük değer dönerse başarılıdır.
        if code <= 32 {
            return Err(format!("açılamadı ({code})"));
        }
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        Err("yalnızca Windows'ta destekleniyor".into())
    }
}

/// Dosyayı Gezgin'de seçili olarak gösterir.
#[tauri::command]
pub fn reveal_path(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("explorer")
            .raw_arg(format!("/select,\"{path}\""))
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        Err("yalnızca Windows'ta destekleniyor".into())
    }
}

#[derive(Serialize)]
pub struct AppEntry {
    name: String,
    path: String,
}

/// Başlat menüsündeki kısayollar (tüm kullanıcılar + bu kullanıcı). Kaldırıcılar ve belgeler elenir.
#[tauri::command]
pub fn list_apps() -> Vec<AppEntry> {
    let roots: Vec<PathBuf> = [std::env::var_os("ProgramData"), std::env::var_os("APPDATA")]
        .into_iter()
        .flatten()
        .map(|base| PathBuf::from(base).join("Microsoft\\Windows\\Start Menu\\Programs"))
        .collect();

    let mut found: HashMap<String, String> = HashMap::new();
    for root in roots {
        walk(&root, 0, &mut found);
    }
    let mut apps: Vec<AppEntry> = found.into_iter().map(|(name, path)| AppEntry { name, path }).collect();
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps
}

fn walk(dir: &Path, depth: u8, out: &mut HashMap<String, String>) {
    if depth > 3 {
        return;
    }
    let Ok(entries) = std::fs::read_dir(dir) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            walk(&path, depth + 1, out);
            continue;
        }
        let is_link = path.extension().is_some_and(|e| e.eq_ignore_ascii_case("lnk") || e.eq_ignore_ascii_case("url"));
        let Some(name) = path.file_stem().map(|s| s.to_string_lossy().into_owned()) else { continue };
        let lower = name.to_lowercase();
        let junk = ["uninstall", "kaldır", "readme", "help", "yardım", "documentation", "website"].iter().any(|k| lower.contains(k));
        if is_link && !junk {
            out.entry(name).or_insert_with(|| path.to_string_lossy().into_owned());
        }
    }
}
