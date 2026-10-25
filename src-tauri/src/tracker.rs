//! İmleç izleyici: ~60 Hz'de global imleç konumunu okur ve her ada penceresi için
//!  1) imleç adanın "hit rect"i içindeyse click-through'u kapatır, dışındaysa açar,
//!  2) imleç yakındaysa konumu o pencereye yayınlar (göz takibi),
//! ayrıca sistem boşta kalma süresini (uyku) ve "imleci takip et" modunu yönetir.
//! Bir şey sürüklenirken fare sağa sola sallanırsa raf açılır (bırakılacak yer).
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
/// Bir karede bundan uzun sıçrayış (imleç ışınlandı, ekran değişti) yol sayılmaz
const MAX_STEP_PX: f64 = 400.0;

/// Açılıştan beri imlecin ekranda aldığı yol (fiziksel piksel) — Nook'un günlüğü için
pub static MOUSE_PX: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

#[tauri::command]
pub fn mouse_travel() -> u64 {
    MOUSE_PX.load(Ordering::Relaxed)
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CursorPayload {
    /// Hangi pencere için: dinleyiciler bütün pencerelerin olaylarını alır, kendininkini seçer
    label: String,
    x: f64,
    y: f64,
    inside: bool,
    near: bool,
    /// Sol tuş ada dışında basılı tutuluyor (pencere/metin/dosya sürükleme)
    drag: bool,
    /// Windows kabuğunda gerçek bir dosya/klasör sürükleniyor (SysDragImage görünür)
    file_drag: bool,
}

struct Prev {
    inside: bool,
    /// Sol tuş basılı mıydı / basış adanın içinde mi başladı
    down: bool,
    drag: bool,
    file_drag: bool,
    near: bool,
    last: (f64, f64),
    emitted: Instant,
}

impl Default for Prev {
    fn default() -> Self {
        Self { inside: false, down: false, drag: false, file_drag: false, near: false, last: (f64::NAN, f64::NAN), emitted: Instant::now() - EMIT_EVERY }
    }
}

/// Sürüklerken sallama: kısa sürede birkaç kez yön değiştiren yatay hareket
#[derive(Default)]
struct Shake {
    last_x: Option<f64>,
    dir: i8,
    travel: f64,
    flips: Vec<Instant>,
    fired: bool,
}

/// Her yön değişiminden önce en az bu kadar (fiziksel px) yol alınmalı
const SHAKE_TRAVEL: f64 = 28.0;
const SHAKE_FLIPS: usize = 4;
const SHAKE_WINDOW: Duration = Duration::from_millis(750);

impl Shake {
    /// Sol tuş basılıyken her adımda çağrılır; sallama algılanınca bir kez true döner
    fn step(&mut self, x: f64, down: bool) -> bool {
        if !down {
            *self = Self::default();
            return false;
        }
        let Some(last) = self.last_x.replace(x) else { return false };
        let dx = x - last;
        if dx.abs() < 1.0 {
            return false;
        }
        let d = if dx > 0.0 { 1 } else { -1 };
        if d != self.dir {
            if self.dir != 0 && self.travel >= SHAKE_TRAVEL {
                self.flips.push(Instant::now());
            }
            self.dir = d;
            self.travel = 0.0;
        }
        self.travel += dx.abs();
        self.flips.retain(|t| t.elapsed() < SHAKE_WINDOW);
        if !self.fired && self.flips.len() >= SHAKE_FLIPS {
            self.fired = true;
            return true;
        }
        false
    }
}

pub fn spawn(app: AppHandle, shared: Arc<Shared>) {
    thread::Builder::new()
        .name("nook-tracker".into())
        .spawn(move || {
            let mut prev: HashMap<String, Prev> = HashMap::new();
            let mut shake = Shake::default();
            // Basış Nook'un üstünde başladıysa (raftan dışarı sürükleme) sallama sayılmaz
            let mut press_on_us = false;
            let mut was_down = false;
            let mut asleep = false;
            let mut idle_checked = Instant::now();
            let mut follow_checked = Instant::now();
            let mut monitors: Vec<Monitor> = Vec::new();
            let mut monitors_at = Instant::now() - MONITOR_REFRESH;
            let mut candidate: Option<(Monitor, Instant)> = None;
            let mut last_pos: Option<(f64, f64)> = None;

            loop {
                // Ada sürüklenip bırakıldı: yeni yeri kaydettir
                if shared.dragging.load(std::sync::atomic::Ordering::Relaxed) && !left_button_down() {
                    shared.dragging.store(false, std::sync::atomic::Ordering::Relaxed);
                    let label = shared.drag_label.lock().unwrap().clone();
                    crate::window::finish_drag(&app, &label);
                }
                if let Some((px, py)) = cursor_position(&app) {
                    if let Some((lx, ly)) = last_pos {
                        let d = ((px - lx).powi(2) + (py - ly).powi(2)).sqrt();
                        if d < MAX_STEP_PX {
                            MOUSE_PX.fetch_add(d.round() as u64, Ordering::Relaxed);
                        }
                    }
                    last_pos = Some((px, py));
                    let windows: Vec<_> = shared.windows.lock().unwrap().iter().map(|(k, v)| (k.clone(), *v)).collect();
                    let forced = shared.forced.lock().unwrap().clone();
                    // Parolalı kalkan açıkken hiçbir pencere (ada, yan kart) açılmaz/tıklanmaz
                    let shield_locked = shared.locked.load(Ordering::Relaxed);
                    let gated = shared.gated.load(Ordering::Relaxed);
                    // Tam ekran oyunun ekranında ada açılmaz (alarm çalarken hariç)
                    let in_game = shared
                        .game_screen
                        .lock()
                        .unwrap()
                        .is_some_and(|(l, t, r, b)| px >= l as f64 && px < r as f64 && py >= t as f64 && py < b as f64);

                    let down = left_button_down();
                    let mut over_any = false;
                    for (label, ws) in &windows {
                        let locked = shield_locked || (gated && label != window::ISLAND);
                        let g = ws.geom;
                        let k = g.scale * window::zoom();
                        let (x, y) = ((px - g.x) / k, (py - g.y) / k);
                        let over = !in_game && !locked && (ws.hit.contains(x, y) || ws.extra.contains(x, y));
                        let prev_drag = prev.get(label).is_some_and(|p| p.drag);
                        let prev_down = prev.get(label).is_some_and(|p| p.down);
                        over_any |= over || (down && (prev_drag || (!prev_down && over)));
                    }
                    if down && !was_down {
                        press_on_us = over_any;
                    } else if !down {
                        press_on_us = false;
                    }
                    was_down = down;
                    let ext_drag = down && !press_on_us && !in_game && !shield_locked;
                    let file_drag = ext_drag && is_dragging_file();

                    for (label, ws) in windows {
                        let p = prev.entry(label.clone()).or_default();
                        // Açılış kilidinde parola kutusu ana adada: yalnızca o açık kalır
                        let locked = shield_locked || (gated && label != window::ISLAND);
                        let g = ws.geom;
                        // Sayfanın gördüğü (CSS) px: ekran ölçeği × arayüz ölçeği
                        let k = g.scale * window::zoom();
                        let (x, y) = ((px - g.x) / k, (py - g.y) / k);
                        // Ada içinde basılıp (metin seçerken, kaydırıcı çekerken) imleç dışarı kayarsa
                        // tuş bırakılana kadar ada kapanmaz.
                        let over = !in_game && !locked && (ws.hit.contains(x, y) || ws.extra.contains(x, y));
                        let prev_down = p.down;
                        if !down {
                            p.drag = false;
                        } else if !p.down && over {
                            p.drag = true;
                        }
                        p.down = down;
                        let hit = over || p.drag;
                        let inside = !locked && (hit || forced.contains(&label));
                        let near = inside || ws.hit.distance(x, y) < TRACK_RADIUS;

                        if inside != p.inside {
                            if inside {
                                focus::remember(&shared);
                            }
                            // Tauri/tao'nun kendi durumunu da güncel tut (o ana iş parçacığında, gecikmeli uygulanır)
                            if let Some(win) = app.get_webview_window(&label) {
                                let _ = win.set_ignore_cursor_events(!inside);
                                // WebView2 zemini ara sıra şeffaf beyaza dönüyor: adanın kenarı gri parlıyordu
                                if inside {
                                    window::clear_background(&win);
                                }
                            }
                        }
                        // Asıl geçiş: pencere stilini Windows'a doğrudan, beklemeden yaz. Her adımda
                        // kontrol edilir — ana iş parçacığı meşgulken ya da tao eski durumu geri yazarsa düzelir.
                        // OLE sürükle-bırak da bu sayede adaya "çarpar".
                        click_through(ws.hwnd, !inside);

                        // Uzaktaki imleç hareketleri webview'u hiç uyandırmaz (kaynak tasarrufu).
                        let moved = (x, y) != p.last;
                        let due = p.emitted.elapsed() >= EMIT_EVERY;
                        let drag_changed = inside && (down != prev_down || file_drag != p.file_drag);
                        if ((moved && (near || p.near)) && due) || inside != p.inside || drag_changed {
                            let _ = app.emit_to(
                                label.as_str(),
                                "nook://cursor",
                                CursorPayload { label: label.clone(), x, y, inside: hit, near, drag: ext_drag, file_drag },
                            );
                            p.emitted = Instant::now();
                            // Yalnızca gönderilen konumu hatırla — ara hareketler bir sonraki gönderimde gider
                            p.last = (x, y);
                        }
                        p.inside = inside;
                        p.near = near;
                        p.file_drag = file_drag;
                    }

                    // Yalnızca gerçek bir dosya/klasör sürüklenirken sallama rafı açar;
                    // pencere taşırken ya da boş alanda seçim yaparken açılmaz.
                    if shake.step(px, file_drag) && shared.settings().shelf_shake {
                        crate::log::write("info", "raf: sallama");
                        let _ = app.emit_to(crate::shortcut::target(&app).as_str(), "nook://shelf-shake", ());
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
    // Oyun açıkken "Oyunda ikinci ekrana geç" etkinse imleç oyunun ekranına gitse bile Nook oyun ekranına dönmez
    if shared.settings().game_second_screen {
        if let Some((gl, gt, _, _)) = *shared.game_screen.lock().unwrap() {
            if target.position().x == gl && target.position().y == gt {
                *candidate = None;
                return;
            }
        }
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

/// Windows kabuğunda gerçek bir dosya/klasör sürükleniyor mu?
/// Pencere taşınırken (GUI_INMOVESIZE) ya da boş alanda seçim kutusu çizilirken false döner;
/// yalnızca kabuk sürükleme görseli ("SysDragImage") ekranda görünürken true döner.
#[cfg(windows)]
fn is_dragging_file() -> bool {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        FindWindowExW, GetGUIThreadInfo, IsWindowVisible, GUITHREADINFO, GUI_INMOVESIZE,
    };
    unsafe {
        let mut gti: GUITHREADINFO = std::mem::zeroed();
        gti.cbSize = std::mem::size_of::<GUITHREADINFO>() as u32;
        if GetGUIThreadInfo(0, &mut gti) != 0 && (gti.flags & GUI_INMOVESIZE) != 0 {
            return false;
        }
        const CLASS: [u16; 13] = [
            b'S' as u16, b'y' as u16, b's' as u16, b'D' as u16, b'r' as u16, b'a' as u16,
            b'g' as u16, b'I' as u16, b'm' as u16, b'a' as u16, b'g' as u16, b'e' as u16, 0,
        ];
        let mut hwnd = std::ptr::null_mut();
        loop {
            hwnd = FindWindowExW(std::ptr::null_mut(), hwnd, CLASS.as_ptr(), std::ptr::null());
            if hwnd.is_null() {
                break;
            }
            if IsWindowVisible(hwnd) != 0 {
                return true;
            }
        }
        false
    }
}

#[cfg(not(windows))]
fn is_dragging_file() -> bool {
    false
}

/// Farenin sol tuşu şu an basılı mı (tuşlar yer değiştirilmişse fiziksel sol tuş).
#[cfg(windows)]
fn left_button_down() -> bool {
    use windows_sys::Win32::UI::{
        Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON, VK_RBUTTON},
        WindowsAndMessaging::{GetSystemMetrics, SM_SWAPBUTTON},
    };
    let key = if unsafe { GetSystemMetrics(SM_SWAPBUTTON) } != 0 { VK_RBUTTON } else { VK_LBUTTON };
    (unsafe { GetAsyncKeyState(key as i32) } as u16 & 0x8000) != 0
}

#[cfg(not(windows))]
fn left_button_down() -> bool {
    false
}

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
pub(crate) fn system_idle() -> Option<Duration> {
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
pub(crate) fn system_idle() -> Option<Duration> {
    None
}
