//! Alarm sesi: Windows'un kendi alarm sesleri (C:\Windows\Media\Alarm01–10.wav), döngüde çalar.
//! Alarm çalarken tam ekran gizleme devre dışı kalır — oyundayken de görünsün.

use std::sync::atomic::Ordering;
use std::sync::Arc;

use tauri::State;

use crate::state::Shared;

/// Çal/durdur. `sound`: 1–10 (Alarm01…Alarm10), 0 = sessiz (yalnızca ekranda görünür).
/// `preview`: döngüsüz, tek sefer dinlet.
#[tauri::command]
pub fn alarm_ring(on: bool, sound: u8, preview: bool, shared: State<'_, Arc<Shared>>) {
    if !preview {
        shared.alert.store(on, Ordering::Relaxed);
    }
    if sound == 0 {
        imp::play(false, 1, false);
        return;
    }
    imp::play(on, sound.min(10), !preview);
}

/// Frontend sıradaki alarmı bildirir (alarmlar her değiştiğinde).
#[tauri::command]
pub fn alarm_next(at: Option<i64>, shared: State<'_, Arc<Shared>>) {
    shared.next_alarm.store(at.unwrap_or(0), Ordering::Relaxed);
}

/// Alarm çalıyor ya da birkaç saniye içinde çalacak.
pub fn imminent(shared: &Shared) -> bool {
    if shared.alert.load(Ordering::Relaxed) {
        return true;
    }
    let next = shared.next_alarm.load(Ordering::Relaxed);
    if next <= 0 {
        return false;
    }
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0);
    // 5 sn önce aç; vakti 10 dk'dan fazla geçmişse (bilgisayar uykudaydı vs.) takılı kalma
    now >= next - 5_000 && now < next + 600_000
}

#[cfg(windows)]
mod imp {
    use windows_sys::Win32::Media::Audio::{PlaySoundW, SND_ASYNC, SND_FILENAME, SND_LOOP, SND_NODEFAULT};

    pub fn play(on: bool, sound: u8, looped: bool) {
        unsafe {
            if !on {
                PlaySoundW(std::ptr::null(), std::ptr::null_mut(), 0);
                return;
            }
            let windir = std::env::var("WINDIR").unwrap_or_else(|_| "C:\\Windows".into());
            let path = format!("{windir}\\Media\\Alarm{sound:02}.wav");
            let wide: Vec<u16> = path.encode_utf16().chain(Some(0)).collect();
            let flags = SND_FILENAME | SND_ASYNC | SND_NODEFAULT | if looped { SND_LOOP } else { 0 };
            PlaySoundW(wide.as_ptr(), std::ptr::null_mut(), flags);
        }
    }
}

#[cfg(not(windows))]
mod imp {
    pub fn play(_on: bool, _sound: u8, _looped: bool) {}
}
