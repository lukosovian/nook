//! Pano izleyici. Windows'ta GetClipboardSequenceNumber çok ucuz bir sayaçtır;
//! panoyu yalnızca sayaç değiştiğinde okuruz.
//!  - Metin → "nook://clipboard"
//!  - Görsel → önbelleğe PNG olarak yazılır → "nook://clipboard-image"
//!  - Gezgin'de kopyalanan dosyalar → "nook://clipboard-files"
//! Parola yöneticileri (KeePass, Bitwarden, 1Password…) kopyaladıklarını "geçmişe alma" diye
//! işaretler; o kopyalar hiç okunmaz.

use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;

const POLL: Duration = Duration::from_millis(350);
const MAX_LEN: usize = 4000;
/// Bundan büyük görseller geçmişe alınmaz (ekran görüntüsü sığar, dev tuvaller değil)
const MAX_PIXELS: u64 = 4096 * 4096;

#[derive(Clone, Serialize)]
struct TextClip {
    text: String,
    /// Kopyalayan uygulama (küçük harf, .exe'siz); bilinmiyorsa boş
    app: String,
}

#[derive(Clone, Serialize)]
struct ImageClip {
    path: String,
    width: u32,
    height: u32,
    app: String,
}

#[derive(Clone, Serialize)]
struct FilesClip {
    paths: Vec<String>,
    app: String,
}

pub fn spawn(app: AppHandle) {
    thread::Builder::new()
        .name("nook-clipboard".into())
        .spawn(move || {
            let mut last_seq = sequence();
            let mut last_text = String::new();
            loop {
                thread::sleep(POLL);

                let seq = sequence();
                if seq.is_some() && seq == last_seq {
                    continue;
                }
                last_seq = seq;
                if imp::excluded() {
                    continue;
                }
                let source = imp::owner_app();

                if let Ok(text) = app.clipboard().read_text() {
                    let text = text.trim();
                    if text.is_empty() || text.len() > MAX_LEN || text == last_text {
                        continue;
                    }
                    last_text = text.to_owned();
                    let _ = app.emit("nook://clipboard", TextClip { text: last_text.clone(), app: source });
                    continue;
                }
                last_text.clear();

                let files = imp::files();
                if !files.is_empty() {
                    let _ = app.emit("nook://clipboard-files", FilesClip { paths: files, app: source });
                    continue;
                }

                if imp::has_image() {
                    if let Some((path, width, height)) = save_image(&app, seq.unwrap_or(0)) {
                        let _ = app.emit("nook://clipboard-image", ImageClip { path, width, height, app: source });
                    }
                }
            }
        })
        .expect("clipboard thread başlatılamadı");
}

/// Panodaki görseli önbelleğe PNG olarak yazar; asset protokolüne açar (önizleme için)
fn save_image(app: &AppHandle, seq: u32) -> Option<(String, u32, u32)> {
    let img = app.clipboard().read_image().ok()?;
    let (w, h) = (img.width(), img.height());
    if w == 0 || h == 0 || w as u64 * h as u64 > MAX_PIXELS {
        return None;
    }
    let png = crate::imaging::encode_png(w, h, img.rgba())?;
    let dir = clips_dir(app)?;
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
    let file = dir.join(format!("{stamp}-{seq}.png"));
    std::fs::write(&file, png).ok()?;
    let _ = app.asset_protocol_scope().allow_file(&file);
    Some((file.to_string_lossy().into_owned(), w, h))
}

fn clips_dir(app: &AppHandle) -> Option<std::path::PathBuf> {
    let dir = app.path().app_cache_dir().ok()?.join("clips");
    std::fs::create_dir_all(&dir).ok()?;
    Some(dir)
}

#[cfg(windows)]
fn sequence() -> Option<u32> {
    use windows_sys::Win32::System::DataExchange::GetClipboardSequenceNumber;
    Some(unsafe { GetClipboardSequenceNumber() })
}

#[cfg(not(windows))]
fn sequence() -> Option<u32> {
    None
}

/// Hassas veri koruyucusu: pano hâlâ bu metni tutuyorsa temizler (arada başka bir şey
/// kopyalandıysa ona dokunmaz). Silindiyse true.
#[tauri::command]
pub fn clipboard_clear_if(app: AppHandle, text: String) -> bool {
    let same = app.clipboard().read_text().map(|t| t.trim() == text.trim()).unwrap_or(false);
    same && app.clipboard().clear().is_ok()
}

/// Panoyu boşalt (kilitlenince / süre dolunca). Geçmiş olduğu gibi kalır.
#[tauri::command]
pub fn clipboard_clear(app: AppHandle) -> bool {
    app.clipboard().clear().is_ok()
}

/// Geçmişteki görseli yeniden panoya koy
#[tauri::command]
pub fn clipboard_write_image(app: AppHandle, path: String) -> Result<(), String> {
    let file = std::fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut dec = png::Decoder::new(std::io::BufReader::new(file));
    dec.set_transformations(png::Transformations::EXPAND | png::Transformations::ALPHA);
    let mut reader = dec.read_info().map_err(|e| e.to_string())?;
    let mut buf = vec![0; reader.output_buffer_size()];
    let info = reader.next_frame(&mut buf).map_err(|e| e.to_string())?;
    buf.truncate(info.buffer_size());
    let rgba = match info.color_type {
        png::ColorType::Rgba => buf,
        png::ColorType::Rgb => buf.chunks(3).flat_map(|c| [c[0], c[1], c[2], 255]).collect(),
        _ => return Err("desteklenmeyen görsel".into()),
    };
    let image = tauri::image::Image::new_owned(rgba, info.width, info.height);
    app.clipboard().write_image(&image).map_err(|e| e.to_string())
}

/// Geçmişteki dosyaları yeniden panoya koy (Gezgin'de yapıştırılabilir)
#[tauri::command]
pub fn clipboard_write_files(paths: Vec<String>) -> Result<(), String> {
    imp::write_files(&paths)
}

/// Artık geçmişte olmayan görsel dosyalarını sil
#[tauri::command]
pub fn clipboard_prune(app: AppHandle, keep: Vec<String>) {
    let Some(dir) = clips_dir(&app) else { return };
    let Ok(rd) = std::fs::read_dir(&dir) else { return };
    for e in rd.flatten() {
        let p = e.path().to_string_lossy().into_owned();
        if !keep.iter().any(|k| k.eq_ignore_ascii_case(&p)) {
            let _ = std::fs::remove_file(e.path());
        }
    }
}

/// Düz metin yapıştır: panodaki metni biçimsiz olarak yeniden yazar ve Ctrl+V gönderir
pub fn paste_plain() {
    std::thread::spawn(|| {
        imp::paste_plain();
    });
}

#[cfg(windows)]
mod imp {
    use windows_sys::Win32::Foundation::{CloseHandle, HWND};
    use windows_sys::Win32::System::DataExchange::{
        CloseClipboard, EmptyClipboard, GetClipboardData, GetClipboardOwner, IsClipboardFormatAvailable, OpenClipboard,
        RegisterClipboardFormatW, SetClipboardData,
    };
    use windows_sys::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};
    use windows_sys::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION};
    use windows_sys::Win32::UI::Shell::DragQueryFileW;
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};

    const CF_UNICODETEXT: u32 = 13;
    const CF_HDROP: u32 = 15;
    const CF_DIB: u32 = 8;
    const CF_DIBV5: u32 = 17;

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(Some(0)).collect()
    }

    fn format(name: &str) -> u32 {
        let w = wide(name);
        unsafe { RegisterClipboardFormatW(w.as_ptr()) }
    }

    /// Parola yöneticilerinin "geçmişe alma / izleme" işareti var mı
    pub fn excluded() -> bool {
        ["ExcludeClipboardContentFromMonitorProcessing", "Clipboard Viewer Ignore"]
            .iter()
            .any(|n| unsafe { IsClipboardFormatAvailable(format(n)) } != 0)
    }

    pub fn has_image() -> bool {
        unsafe { IsClipboardFormatAvailable(CF_DIB) != 0 || IsClipboardFormatAvailable(CF_DIBV5) != 0 }
    }

    fn exe_stem(pid: u32) -> Option<String> {
        unsafe {
            let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if h.is_null() {
                return None;
            }
            let mut buf = [0u16; 520];
            let mut len = buf.len() as u32;
            let ok = QueryFullProcessImageNameW(h, PROCESS_NAME_WIN32, buf.as_mut_ptr(), &mut len) != 0;
            CloseHandle(h);
            if !ok {
                return None;
            }
            let path = String::from_utf16_lossy(&buf[..len as usize]);
            let name = path.rsplit(['\\', '/']).next().unwrap_or(&path).to_lowercase();
            Some(name.strip_suffix(".exe").unwrap_or(&name).to_string())
        }
    }

    fn pid_of(hwnd: HWND) -> u32 {
        let mut pid = 0u32;
        if !hwnd.is_null() {
            unsafe { GetWindowThreadProcessId(hwnd, &mut pid) };
        }
        pid
    }

    /// Panoya yazan uygulama; sahibi bilinmiyorsa öndeki pencere
    pub fn owner_app() -> String {
        let mut pid = pid_of(unsafe { GetClipboardOwner() });
        if pid == 0 {
            pid = pid_of(unsafe { GetForegroundWindow() });
        }
        if pid == 0 {
            return String::new();
        }
        exe_stem(pid).unwrap_or_default()
    }

    fn open() -> bool {
        for _ in 0..8 {
            if unsafe { OpenClipboard(std::ptr::null_mut()) } != 0 {
                return true;
            }
            std::thread::sleep(std::time::Duration::from_millis(25));
        }
        false
    }

    /// Gezgin'den kopyalanan dosyaların yolları
    pub fn files() -> Vec<String> {
        if unsafe { IsClipboardFormatAvailable(CF_HDROP) } == 0 || !open() {
            return Vec::new();
        }
        let mut out = Vec::new();
        unsafe {
            let h = GetClipboardData(CF_HDROP);
            if !h.is_null() {
                let count = DragQueryFileW(h as _, u32::MAX, std::ptr::null_mut(), 0);
                for i in 0..count.min(64) {
                    let len = DragQueryFileW(h as _, i, std::ptr::null_mut(), 0);
                    let mut buf = vec![0u16; len as usize + 1];
                    DragQueryFileW(h as _, i, buf.as_mut_ptr(), buf.len() as u32);
                    out.push(String::from_utf16_lossy(&buf[..len as usize]));
                }
            }
            CloseClipboard();
        }
        out
    }

    /// DROPFILES + çift sıfırla biten geniş karakterli yol listesi
    pub fn write_files(paths: &[String]) -> Result<(), String> {
        let mut list: Vec<u16> = Vec::new();
        for p in paths {
            list.extend(p.encode_utf16());
            list.push(0);
        }
        list.push(0);
        // DROPFILES: pFiles (u32), pt (i32, i32), fNC (i32), fWide (i32)
        let header = 20usize;
        let size = header + list.len() * 2;
        if !open() {
            return Err("pano meşgul".into());
        }
        unsafe {
            EmptyClipboard();
            let h = GlobalAlloc(GMEM_MOVEABLE, size);
            if h.is_null() {
                CloseClipboard();
                return Err("bellek ayrılamadı".into());
            }
            let p = GlobalLock(h) as *mut u8;
            std::ptr::write_bytes(p, 0, header);
            (p as *mut u32).write_unaligned(header as u32);
            (p.add(16) as *mut i32).write_unaligned(1);
            std::ptr::copy_nonoverlapping(list.as_ptr() as *const u8, p.add(header), list.len() * 2);
            GlobalUnlock(h);
            let ok = !SetClipboardData(CF_HDROP, h as _).is_null();
            // Yapıştırınca taşıma değil kopyalama olsun
            let effect = GlobalAlloc(GMEM_MOVEABLE, 4);
            if !effect.is_null() {
                let e = GlobalLock(effect) as *mut u32;
                e.write_unaligned(1); // DROPEFFECT_COPY
                GlobalUnlock(effect);
                SetClipboardData(format("Preferred DropEffect"), effect as _);
            }
            CloseClipboard();
            if ok {
                Ok(())
            } else {
                Err("panoya yazılamadı".into())
            }
        }
    }

    fn read_unicode() -> Option<String> {
        if unsafe { IsClipboardFormatAvailable(CF_UNICODETEXT) } == 0 || !open() {
            return None;
        }
        unsafe {
            let h = GetClipboardData(CF_UNICODETEXT);
            let text = if h.is_null() {
                None
            } else {
                let p = GlobalLock(h as _) as *const u16;
                let t = if p.is_null() {
                    None
                } else {
                    let mut n = 0;
                    while *p.add(n) != 0 {
                        n += 1;
                    }
                    Some(String::from_utf16_lossy(std::slice::from_raw_parts(p, n)))
                };
                GlobalUnlock(h as _);
                t
            };
            CloseClipboard();
            text
        }
    }

    fn write_unicode(text: &str) -> bool {
        let w = wide(text);
        if !open() {
            return false;
        }
        unsafe {
            EmptyClipboard();
            let h = GlobalAlloc(GMEM_MOVEABLE, w.len() * 2);
            if h.is_null() {
                CloseClipboard();
                return false;
            }
            let p = GlobalLock(h) as *mut u16;
            std::ptr::copy_nonoverlapping(w.as_ptr(), p, w.len());
            GlobalUnlock(h);
            let ok = !SetClipboardData(CF_UNICODETEXT, h as _).is_null();
            CloseClipboard();
            ok
        }
    }

    pub fn paste_plain() {
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
            SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, VK_CONTROL, VK_LMENU, VK_LSHIFT, VK_LWIN, VK_MENU,
            VK_RMENU, VK_RSHIFT, VK_RWIN, VK_SHIFT, VIRTUAL_KEY,
        };
        let Some(text) = read_unicode() else { return };
        if !write_unicode(&text) {
            return;
        }
        let key = |vk: VIRTUAL_KEY, up: bool| INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 { ki: KEYBDINPUT { wVk: vk, wScan: 0, dwFlags: if up { KEYEVENTF_KEYUP } else { 0 }, time: 0, dwExtraInfo: 0 } },
        };
        // Hâlâ basılı Alt/Shift/Win kısayolu bozmasın. Alt'ı bırakmadan önce atanmamış bir tuş:
        // tek başına Alt bırakılınca menü çubuğu açılmasın.
        let mut seq = vec![key(0xE8, false), key(0xE8, true)];
        for vk in [VK_MENU, VK_LMENU, VK_RMENU, VK_SHIFT, VK_LSHIFT, VK_RSHIFT, VK_LWIN, VK_RWIN] {
            seq.push(key(vk, true));
        }
        seq.extend([key(VK_CONTROL, false), key(b'V' as VIRTUAL_KEY, false), key(b'V' as VIRTUAL_KEY, true), key(VK_CONTROL, true)]);
        std::thread::sleep(std::time::Duration::from_millis(40));
        unsafe { SendInput(seq.len() as u32, seq.as_ptr(), std::mem::size_of::<INPUT>() as i32) };
    }
}

#[cfg(not(windows))]
mod imp {
    pub fn excluded() -> bool {
        false
    }
    pub fn has_image() -> bool {
        false
    }
    pub fn owner_app() -> String {
        String::new()
    }
    pub fn files() -> Vec<String> {
        Vec::new()
    }
    pub fn write_files(_p: &[String]) -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
    pub fn paste_plain() {}
}
