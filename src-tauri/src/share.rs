//! Ekran paylaşımı / canlı yayın algılama (iki saniyede bir). Windows "ekran paylaşılıyor"
//! bilgisini vermez; paylaşan uygulamaların kendi pencerelerine bakılır:
//!  - Chrome / Edge: "… ekranınızı paylaşıyor" şeridi (Meet, Discord web, Teams web)
//!  - Teams / Zoom: paylaşım denetim çubuğu
//!  - OBS / Streamlabs açık → yayın
//! Değişince "nook://share" ({ on, source }) yayılır.

use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

const POLL: Duration = Duration::from_secs(2);

#[derive(Clone, Serialize, PartialEq)]
pub struct Share {
    on: bool,
    /// Ne algılandı ("Chrome", "Teams", "OBS"…)
    source: String,
}

/// Pencere başlığında geçerse paylaşım var (küçük harf)
const TITLE_HINTS: &[(&str, &str)] = &[
    ("is sharing your screen", "Tarayıcı"),
    ("is sharing a window", "Tarayıcı"),
    ("is sharing this tab", "Tarayıcı"),
    ("is sharing a tab", "Tarayıcı"),
    ("ekranınızı paylaşıyor", "Tarayıcı"),
    ("bir pencereyi paylaşıyor", "Tarayıcı"),
    ("bu sekmeyi paylaşıyor", "Tarayıcı"),
    ("sekmeyi paylaşıyor", "Tarayıcı"),
    ("sharing control bar", "Teams"),
    ("paylaşım denetim çubuğu", "Teams"),
    ("sharing toolbar", "Teams"),
    ("you are screen sharing", "Zoom"),
    ("ekran paylaşıyorsunuz", "Zoom"),
];

/// Pencere sınıfı tam eşleşirse paylaşım var
const CLASS_HINTS: &[(&str, &str)] = &[("ZPShareToolbarClass", "Zoom")];

/// Çalışıyorsa yayın var (küçük harf)
const PROCESSES: &[(&str, &str)] = &[("obs64.exe", "OBS"), ("obs32.exe", "OBS"), ("streamlabs obs.exe", "Streamlabs")];

pub fn spawn(app: AppHandle) {
    thread::Builder::new()
        .name("nook-share".into())
        .spawn(move || {
            let mut last = Share { on: false, source: String::new() };
            loop {
                thread::sleep(POLL);
                let now = detect();
                if now != last {
                    crate::log::write("info", &format!("yayın/paylaşım: {} ({})", now.on, now.source));
                    let _ = app.emit("nook://share", &now);
                    last = now;
                }
            }
        })
        .expect("share thread başlatılamadı");
}

fn detect() -> Share {
    #[cfg(windows)]
    {
        if let Some(src) = imp::windows_hint() {
            return Share { on: true, source: src.into() };
        }
        if let Some(src) = imp::process_hint() {
            return Share { on: true, source: src.into() };
        }
    }
    Share { on: false, source: String::new() }
}

#[cfg(windows)]
mod imp {
    use super::{CLASS_HINTS, PROCESSES, TITLE_HINTS};
    use windows_sys::Win32::Foundation::{CloseHandle, BOOL, HWND, LPARAM, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS};
    use windows_sys::Win32::UI::WindowsAndMessaging::{EnumWindows, GetClassNameW, GetWindowTextW, IsWindowVisible};

    unsafe extern "system" fn each(hwnd: HWND, data: LPARAM) -> BOOL {
        let found = &mut *(data as *mut Option<&'static str>);
        if IsWindowVisible(hwnd) == 0 {
            return 1;
        }
        let mut buf = [0u16; 256];
        let n = GetClassNameW(hwnd, buf.as_mut_ptr(), buf.len() as i32);
        let class = String::from_utf16_lossy(&buf[..n.max(0) as usize]);
        if let Some((_, src)) = CLASS_HINTS.iter().find(|(c, _)| *c == class) {
            *found = Some(src);
            return 0;
        }
        let n = GetWindowTextW(hwnd, buf.as_mut_ptr(), buf.len() as i32);
        if n > 0 {
            let title = String::from_utf16_lossy(&buf[..n as usize]).to_lowercase();
            if let Some((_, src)) = TITLE_HINTS.iter().find(|(t, _)| title.contains(t)) {
                *found = Some(src);
                return 0;
            }
        }
        1
    }

    pub fn windows_hint() -> Option<&'static str> {
        let mut found: Option<&'static str> = None;
        unsafe { EnumWindows(Some(each), &mut found as *mut _ as LPARAM) };
        found
    }

    pub fn process_hint() -> Option<&'static str> {
        unsafe {
            let snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
            if snap == INVALID_HANDLE_VALUE {
                return None;
            }
            let mut e: PROCESSENTRY32W = std::mem::zeroed();
            e.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
            let mut out = None;
            let mut ok = Process32FirstW(snap, &mut e) != 0;
            while ok {
                let len = e.szExeFile.iter().position(|&c| c == 0).unwrap_or(e.szExeFile.len());
                let name = String::from_utf16_lossy(&e.szExeFile[..len]).to_lowercase();
                if let Some((_, src)) = PROCESSES.iter().find(|(p, _)| *p == name) {
                    out = Some(*src);
                    break;
                }
                ok = Process32NextW(snap, &mut e) != 0;
            }
            CloseHandle(snap);
            out
        }
    }
}
