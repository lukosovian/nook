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

/// "Birlikte aç" penceresi (Windows'un kendi uygulama seçicisi)
#[tauri::command]
pub async fn open_with(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::Shell::{SHOpenWithDialog, OAIF_ALLOW_REGISTRATION, OAIF_EXEC, OPENASINFO};
        let file: Vec<u16> = path.encode_utf16().chain(Some(0)).collect();
        let info = OPENASINFO { pcszFile: file.as_ptr(), pcszClass: std::ptr::null(), oaifInFlags: OAIF_EXEC | OAIF_ALLOW_REGISTRATION };
        let hr = unsafe { SHOpenWithDialog(std::ptr::null_mut(), &info) };
        // Kullanıcı vazgeçince de hata döner — sessiz geç
        let _ = hr;
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        Err("yalnızca Windows'ta destekleniyor".into())
    }
}

/// Karalama defterini dosyaya kaydet (yol kayıt penceresinden gelir)
#[tauri::command]
pub async fn save_text(path: String, text: String) -> Result<(), String> {
    std::fs::write(&path, text).map_err(|e| e.to_string())
}

/// Takvim aboneliği (.ics): Google/Outlook'un "gizli adres"i. Yalnızca https (webcal → https).
#[tauri::command]
pub async fn fetch_text(url: String) -> Result<String, String> {
    use std::io::Read;
    let url = url.trim();
    let url = match url.strip_prefix("webcal://") {
        Some(rest) => format!("https://{rest}"),
        None => url.to_string(),
    };
    if !url.starts_with("https://") {
        return Err("adres https:// ile başlamalı".into());
    }
    let res = ureq::get(&url).timeout(std::time::Duration::from_secs(20)).call().map_err(|e| e.to_string())?;
    let mut body = String::new();
    res.into_reader().take(8 * 1024 * 1024).read_to_string(&mut body).map_err(|e| e.to_string())?;
    Ok(body)
}

/// Öndeki Gezgin penceresinde seçili dosyalar (Windows 11 sekmelerinde görünen sekme)
pub fn explorer_selection() -> Vec<String> {
    #[cfg(windows)]
    return imp::explorer_selection().unwrap_or_default();
    #[cfg(not(windows))]
    Vec::new()
}

#[cfg(windows)]
mod imp {
    use windows::core::{Interface, GUID};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoTaskMemFree, IServiceProvider, CLSCTX_ALL, COINIT_APARTMENTTHREADED};
    use windows::Win32::System::Variant::VARIANT;
    use windows::Win32::UI::Shell::{IFolderView, IShellBrowser, IShellItemArray, IShellWindows, IWebBrowser2, ShellWindows, SIGDN_FILESYSPATH, SVGIO_SELECTION};
    use windows::Win32::UI::WindowsAndMessaging::{GetAncestor, GetForegroundWindow, IsWindowVisible, GA_ROOT};

    const SID_STOP_LEVEL_BROWSER: GUID = GUID::from_u128(0x4c96be40_915c_11cf_99d3_00aa004ae837);

    pub fn explorer_selection() -> windows::core::Result<Vec<String>> {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
            let fg = GetAncestor(GetForegroundWindow(), GA_ROOT);
            let windows: IShellWindows = CoCreateInstance(&ShellWindows, None, CLSCTX_ALL)?;
            for i in 0..windows.Count()? {
                let Ok(disp) = windows.Item(&VARIANT::from(i)) else { continue };
                let Ok(browser) = disp.cast::<IWebBrowser2>() else { continue };
                let Ok(hwnd) = browser.HWND() else { continue };
                if HWND(hwnd.0 as _) != fg {
                    continue;
                }
                let Ok(sp) = browser.cast::<IServiceProvider>() else { continue };
                let Ok(sb) = sp.QueryService::<IShellBrowser>(&SID_STOP_LEVEL_BROWSER) else { continue };
                let Ok(view) = sb.QueryActiveShellView() else { continue };
                // Aynı pencerenin öbür sekmelerinin görünümü gizlidir
                if view.GetWindow().map(|w| !IsWindowVisible(w).as_bool()).unwrap_or(false) {
                    continue;
                }
                let Ok(fv) = view.cast::<IFolderView>() else { continue };
                let Ok(items) = fv.Items::<IShellItemArray>(SVGIO_SELECTION) else { return Ok(Vec::new()) };
                let mut out = Vec::new();
                for j in 0..items.GetCount()? {
                    let Ok(item) = items.GetItemAt(j) else { continue };
                    let Ok(raw) = item.GetDisplayName(SIGDN_FILESYSPATH) else { continue };
                    if let Ok(p) = raw.to_string() {
                        out.push(p);
                    }
                    CoTaskMemFree(Some(raw.0 as _));
                }
                return Ok(out);
            }
            Ok(Vec::new())
        }
    }
}
