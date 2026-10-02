//! İmleç izleyici: ~60 Hz'de global imleç konumunu okur ve her ada penceresi için
//!  1) imleç adanın "hit rect"i içindeyse click-through'u kapatır, dışındaysa açar,
//!  2) imleç yakındaysa konumu o pencereye yayınlar (göz takibi),
//! ayrıca sistem boşta kalma süresini (uyku) ve "imleci takip et" modunu yönetir.
//!
//! Neden Rust? Pencere click-through iken webview hiçbir fare olayı almaz;
//! imleci ancak işletim sisteminden okuyarak "uyandırabiliriz".

use std::collections::HashMap;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Monitor};

use crate::focus;
use crate::state::{MonitorMode, Shared};
use crate::window::{self, ISLAND};

const TICK: Duration = Duration::from_millis(16);
/// İmleç olaylarını webview'a en fazla bu sıklıkla gönder (ana iş parçacığını boğmasın).
const EMIT_EVERY: Duration = Duration::from_millis(33);
/// Hit rect'e bu kadar (mantıksal px) yakın imleç, gözler tarafından takip edilir.
const TRACK_RADIUS: f64 = 420.0;
const IDLE_POLL: Duration = Duration::from_millis(500);
const FOLLOW_POLL: Duration = Duration::from_millis(200);
/// İmleç yeni ekranda bu kadar kalırsa ada oraya taşınır (kenardan geçerken zıplamasın).
const FOLLOW_DWELL: Duration = Duration::from_millis(350);
const MONITOR_REFRESH: Duration = Duration::from_secs(5);

#[derive(Clone, Serialize)]
struct CursorPayload {
    x: f64,
    y: f64,
    inside: bool,
    near: bool,
}

struct Prev {
    inside: bool,
    near: bool,
    last: (f64, f64),
    emitted: Instant,
}

impl Default for Prev {
    fn default() -> Self {
        Self { inside: false, near: false, last: (f64::NAN, f64::NAN), emitted: Instant::now() - EMIT_EVERY }
    }
}

pub fn spawn(app: AppHandle, shared: Arc<Shared>) {
    thread::Builder::new()
        .name("nook-tracker".into())
        .spawn(move || {
            let mut prev: HashMap<String, Prev> = HashMap::new();
            let mut asleep = false;
            let mut idle_checked = Instant::now();
            let mut follow_checked = Instant::now();
            let mut monitors: Vec<Monitor> = Vec::new();
            let mut monitors_at = Instant::now() - MONITOR_REFRESH;
            let mut candidate: Option<(Monitor, Instant)> = None;

            loop {
                if let Some((px, py)) = cursor_position(&app) {
                    let windows: Vec<_> = shared.windows.lock().unwrap().iter().map(|(k, v)| (k.clone(), *v)).collect();
                    let forced = shared.forced.lock().unwrap().clone();

                    for (label, ws) in windows {
                        let p = prev.entry(label.clone()).or_default();
                        let g = ws.geom;
                        let (x, y) = ((px - g.x) / g.scale, (py - g.y) / g.scale);
                        let hit = ws.hit.contains(x, y);
                        let inside = hit || forced.contains(&label);
                        let near = inside || ws.hit.distance(x, y) < TRACK_RADIUS;

                        if inside != p.inside {
                            if inside {
                                focus::remember(&shared);
                            }
                            // Tauri/tao'nun kendi durumunu da güncel tut (o ana iş parçacığında, gecikmeli uygulanır)
                            if let Some(win) = app.get_webview_window(&label) {
                                let _ = win.set_ignore_cursor_events(!inside);
                            }
                        }
                        // Asıl geçiş: pencere stilini Windows'a doğrudan, beklemeden yaz. Her adımda
                        // kontrol edilir — ana iş parçacığı meşgulken ya da tao eski durumu geri yazarsa düzelir.
                        // OLE sürükle-bırak da bu sayede adaya "çarpar".
                        click_through(ws.hwnd, !inside);

                        // Uzaktaki imleç hareketleri webview'u hiç uyandırmaz (kaynak tasarrufu).
                        let moved = (x, y) != p.last;
                        let due = p.emitted.elapsed() >= EMIT_EVERY;
                        if ((moved && (near || p.near)) && due) || inside != p.inside {
                            let _ = app.emit_to(label.as_str(), "nook://cursor", CursorPayload { x, y, inside: hit, near });
                            p.emitted = Instant::now();
                            // Yalnızca gönderilen konumu hatırla — ara hareketler bir sonraki gönderimde gider
                            p.last = (x, y);
                        }
                        p.inside = inside;
                        p.near = near;
                    }

                    if follow_checked.elapsed() >= FOLLOW_POLL {
                        follow_checked = Instant::now();
                        if shared.settings().monitor_mode == MonitorMode::Follow {
                            if monitors_at.elapsed() >= MONITOR_REFRESH {
                                monitors = app.available_monitors().unwrap_or_default();
                                monitors_at = Instant::now();
                            }
                            follow(&app, &shared, &monitors, (px, py), &prev, &mut candidate);
                        } else {
                            candidate = None;
                        }
                    }
                }

                if idle_checked.elapsed() >= IDLE_POLL {
                    idle_checked = Instant::now();
                    let limit = shared.settings().sleep_after_sec;
                    if let Some(idle) = system_idle() {
                        let now = limit > 0 && idle >= Duration::from_secs(limit);
                        if now != asleep {
                            asleep = now;
                            let _ = app.emit("nook://idle", asleep);
                        }
                    }
                }

                thread::sleep(TICK);
            }
        })
        .expect("tracker thread başlatılamadı");
}

fn follow(
    app: &AppHandle,
    shared: &Arc<Shared>,
    monitors: &[Monitor],
    (px, py): (f64, f64),
    prev: &HashMap<String, Prev>,
    candidate: &mut Option<(Monitor, Instant)>,
) {
    let busy = shared.relocating.load(Ordering::Acquire) || prev.get(ISLAND).is_some_and(|p| p.inside);
    let (Some(target), Some(current)) = (window::monitor_at(monitors, px, py), window::monitor_of(shared, ISLAND, monitors)) else {
        return;
    };
    if busy || window::same_monitor(&target, &current) {
        *candidate = None;
        return;
    }
    match candidate {
        Some((m, since)) if window::same_monitor(m, &target) => {
            if since.elapsed() >= FOLLOW_DWELL {
                *candidate = None;
                window::relocate(app, shared.clone(), ISLAND.into(), target);
            }
        }
        _ => *candidate = Some((target, Instant::now())),
    }
}

/// Pencereyi tıklama-geçirgen yap/yapma (tao ile aynı bitler: WS_EX_TRANSPARENT | WS_EX_LAYERED).
/// Win32 stil çağrıları her iş parçacığından güvenle yapılabilir.
#[cfg(windows)]
fn click_through(hwnd: isize, on: bool) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_LAYERED, WS_EX_TRANSPARENT};
    if hwnd == 0 {
        return;
    }
    let bits = (WS_EX_TRANSPARENT | WS_EX_LAYERED) as isize;
    unsafe {
        let style = GetWindowLongPtrW(hwnd as _, GWL_EXSTYLE);
        let want = if on { style | bits } else { style & !bits };
        if want != style {
            SetWindowLongPtrW(hwnd as _, GWL_EXSTYLE, want);
        }
    }
}

#[cfg(not(windows))]
fn click_through(_hwnd: isize, _on: bool) {}

/// Fiziksel ekran koordinatı. Windows'ta doğrudan GetCursorPos (ana thread'e gidiş-dönüş yok).
#[cfg(windows)]
pub fn cursor_position(_app: &AppHandle) -> Option<(f64, f64)> {
    use windows_sys::Win32::{Foundation::POINT, UI::WindowsAndMessaging::GetCursorPos};
    let mut p = POINT { x: 0, y: 0 };
    (unsafe { GetCursorPos(&mut p) } != 0).then(|| (p.x as f64, p.y as f64))
}

#[cfg(not(windows))]
pub fn cursor_position(app: &AppHandle) -> Option<(f64, f64)> {
    app.cursor_position().ok().map(|p| (p.x, p.y))
}

#[cfg(windows)]
fn system_idle() -> Option<Duration> {
    use windows_sys::Win32::{
        System::SystemInformation::GetTickCount,
        UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO},
    };
    let mut info = LASTINPUTINFO { cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32, dwTime: 0 };
    if unsafe { GetLastInputInfo(&mut info) } == 0 {
        return None;
    }
    let now = unsafe { GetTickCount() };
    Some(Duration::from_millis(now.wrapping_sub(info.dwTime) as u64))
}

#[cfg(not(windows))]
fn system_idle() -> Option<Duration> {
    None
}
