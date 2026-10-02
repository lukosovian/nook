//! Klavye odağı yönetimi. Nook odak aldığında (arama, not) öndeki pencereyi hatırlar;
//! işi bitince odağı o pencereye geri verir — kullanıcı "görünmez" bir pencereye yazmasın.

use std::sync::atomic::Ordering;

use crate::state::Shared;

#[cfg(windows)]
pub fn foreground() -> isize {
    use windows_sys::Win32::UI::WindowsAndMessaging::GetForegroundWindow;
    unsafe { GetForegroundWindow() as isize }
}

#[cfg(not(windows))]
pub fn foreground() -> isize {
    0
}

/// Öndeki pencere Nook'a ait değilse "önceki pencere" olarak kaydet.
pub fn remember(shared: &Shared) {
    let fg = foreground();
    if fg != 0 && !shared.is_ours(fg) {
        shared.prev_foreground.store(fg, Ordering::Relaxed);
    }
}

/// Odak Nook'taysa önceki pencereye geri ver.
pub fn release(shared: &Shared) {
    let fg = foreground();
    if fg == 0 || !shared.is_ours(fg) {
        return;
    }
    let prev = shared.prev_foreground.load(Ordering::Relaxed);
    if prev != 0 {
        #[cfg(windows)]
        unsafe {
            windows_sys::Win32::UI::WindowsAndMessaging::SetForegroundWindow(prev as _);
        }
    }
}
