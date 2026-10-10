//! Nook'un adadan dışarı çıktığı anlar ve bunlar için gereken küçük gözlemler:
//!  - Pencere üstüne tüneme: öndeki pencerenin başlık çubuğunun üstünde oturan küçük, tıklama-geçirgen
//!    bir pencere ("perch"). Pencere taşındıkça peşinden gider, hızını Nook'a bildirir (sendeler);
//!    başka bir pencereye geçince ona zıplar, uygun pencere kalmayınca adaya döner.
//!  - Ekranın altında uzun süre çalışma ("nook://low-work"): Nook adadan iple sarkıp izler.
//!  - Öndeki pencerenin başlığı ve uygulaması ("nook://foreground"): Odak bekçisi yasaklı siteyi anlar.
//!    Başlık yalnızca bu bilgisayarda, ada penceresine gider.

use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Monitor, State, WebviewUrl, WebviewWindowBuilder};

use crate::state::Shared;
use crate::window::{self, ISLAND};

pub const PERCH: &str = "perch";
/// Tünek penceresinin mantıksal boyutu; Nook altta ortada oturur (frontend: components/Perch).
const PERCH_W: f64 = 160.0;
const PERCH_H: f64 = 150.0;
/// Tünek penceresinin pencerenin üst kenarından aşağı taşan kısmı: Nook kenara oturur, elleri kenarı tutar
const SINK: f64 = 12.0;
const HOP: Duration = Duration::from_millis(520);

const FAST: Duration = Duration::from_millis(16);
const SLOW: Duration = Duration::from_millis(250);
const FG_EVERY: Duration = Duration::from_millis(700);
const MONITOR_REFRESH: Duration = Duration::from_secs(5);
/// İmleç bu kadar süre ekranın alt kısmında (ve sen bilgisayar başındayken) kalırsa Nook sarkar
const LOW_AFTER: Duration = Duration::from_secs(75);
/// Ekranın bu oranından aşağısı "alt kısım"
const LOW_LINE: f64 = 0.55;
/// Kısa süre yukarı çıkmak (menüye bakmak) sayacı sıfırlamaz
const LOW_GRACE: Duration = Duration::from_secs(5);
/// Bu kadar dokunulmazsa "yoğun çalışma" bitmiş sayılır
const ACTIVE_WITHIN: Duration = Duration::from_secs(20);

struct Perch {
    target: isize,
    /// Oturulan yer: pencerenin genişliğine oranla
    frac: f64,
    /// Son oturma noktası (fiziksel) ve zamanı — hız için
    last: Option<(f64, f64, Instant)>,
    vel: (f64, f64),
    emitted: Instant,
    /// Zıplama: başlangıç noktası ve anı
    hop: Option<((f64, f64), Instant)>,
    raised: Instant,
}

static STATE: Mutex<Option<Perch>> = Mutex::new(None);

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Foreground {
    title: String,
    /// Küçük harf, .exe'siz ("chrome")
    app: String,
}

#[derive(Clone, Serialize)]
struct PerchMove {
    vx: f64,
    vy: f64,
}

pub fn spawn(app: AppHandle, shared: Arc<Shared>) {
    thread::Builder::new()
        .name("nook-buddy".into())
        .spawn(move || {
            let mut fg_at = Instant::now() - FG_EVERY;
            let mut last_fg: Option<(String, String)> = None;
            let mut slow_at = Instant::now() - SLOW;
            let mut monitors: Vec<Monitor> = Vec::new();
            let mut monitors_at = Instant::now() - MONITOR_REFRESH;
            let mut low_since: Option<Instant> = None;
            let mut high_since: Option<Instant> = None;
            let mut low_on = false;

            loop {
                let perching = STATE.lock().unwrap().is_some();
                if perching {
                    tick_perch(&app, &shared);
                }

                if fg_at.elapsed() >= FG_EVERY {
                    fg_at = Instant::now();
                    // Nook'un kendi penceresi öne geçtiyse (adaya tıklandı) öndeki "uygulama" değişmiş sayılmaz
                    if let Some(now) = imp::foreground_info(&shared) {
                        if last_fg.as_ref() != Some(&now) {
                            let (title, app_name) = now.clone();
                            let _ = app.emit_to(ISLAND, "nook://foreground", Foreground { title, app: app_name });
                            last_fg = Some(now);
                        }
                    }
                }

                if slow_at.elapsed() >= SLOW {
                    slow_at = Instant::now();
                    if monitors_at.elapsed() >= MONITOR_REFRESH {
                        monitors = app.available_monitors().unwrap_or_default();
                        monitors_at = Instant::now();
                    }
                    let active = crate::tracker::system_idle().is_some_and(|d| d < ACTIVE_WITHIN);
                    let low = active && cursor_low(&app, &shared, &monitors);
                    if low {
                        high_since = None;
                        low_since.get_or_insert_with(Instant::now);
                    } else {
                        let up = *high_since.get_or_insert_with(Instant::now);
                        if !active || up.elapsed() >= LOW_GRACE {
                            low_since = None;
                        }
                    }
                    let on = low_since.is_some_and(|t| t.elapsed() >= LOW_AFTER);
                    if on != low_on {
                        low_on = on;
                        let _ = app.emit_to(ISLAND, "nook://low-work", on);
                    }
                }

                thread::sleep(if perching { FAST } else { SLOW });
            }
        })
        .expect("buddy thread başlatılamadı");
}

/// İmleç adanın bulunduğu ekranda ve o ekranın alt yarısında mı?
fn cursor_low(app: &AppHandle, shared: &Shared, monitors: &[Monitor]) -> bool {
    let Some((x, y)) = crate::tracker::cursor_position(app) else { return false };
    let Some(m) = window::monitor_of(shared, ISLAND, monitors) else { return false };
    let (p, s) = (m.position(), m.size());
    let inside = x >= p.x as f64 && x < (p.x + s.width as i32) as f64 && y >= p.y as f64 && y < (p.y + s.height as i32) as f64;
    inside && (y - p.y as f64) / s.height as f64 >= LOW_LINE
}

/// Öndeki pencereye tün. Uygun pencere yoksa (masaüstü, tam ekran, ekranı kaplayan pencere) false.
#[tauri::command]
pub async fn perch_start(app: AppHandle, shared: State<'_, Arc<Shared>>) -> Result<bool, String> {
    let Some(target) = imp::eligible(&shared, imp::foreground()) else { return Ok(false) };
    if app.get_webview_window(PERCH).is_none() {
        let win = WebviewWindowBuilder::new(&app, PERCH, WebviewUrl::App("index.html".into()))
            .title("Nook")
            .inner_size(PERCH_W * window::zoom(), PERCH_H * window::zoom())
            .position(-30000.0, -30000.0)
            .resizable(false)
            .maximizable(false)
            .minimizable(false)
            .decorations(false)
            .transparent(true)
            .shadow(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .focused(false)
            .visible(true)
            .build()
            .map_err(|e| e.to_string())?;
        let _ = win.set_ignore_cursor_events(true);
        window::clear_background(&win);
        window::apply_zoom(&win);
        window::clear_islands(&app);
    }
    let frac = 0.3 + rand_unit() * 0.35;
    *STATE.lock().unwrap() =
        Some(Perch { target, frac, last: None, vel: (0.0, 0.0), emitted: Instant::now(), hop: None, raised: Instant::now() - Duration::from_secs(5) });
    crate::log::write("info", "Nook pencereye tünedi");
    Ok(true)
}

/// Tünekten in: pencere kapanır (frontend önce kendi "zıpla" animasyonunu oynatır).
#[tauri::command]
pub fn perch_stop(app: AppHandle) {
    *STATE.lock().unwrap() = None;
    if let Some(w) = app.get_webview_window(PERCH) {
        let _ = w.close();
    }
    clear_after_close(&app);
}

/// Tünek penceresi kapandıktan biraz sonra adanın zeminini yenile (kapanış beyaz bırakabiliyor)
fn clear_after_close(app: &AppHandle) {
    let app = app.clone();
    thread::spawn(move || {
        for ms in [150, 800] {
            thread::sleep(Duration::from_millis(ms));
            window::clear_islands(&app);
        }
    });
}

/// Uygun pencere kalmadı: Nook adaya döner. Tünekteki Nook "zıplar", ada kendi Nook'unu geri getirir.
pub(crate) fn leave(app: &AppHandle) {
    *STATE.lock().unwrap() = None;
    let _ = app.emit("nook://perch-leave", ());
    let app = app.clone();
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(450));
        // Arada yeniden tünediyse pencereyi kapatma
        if STATE.lock().unwrap().is_none() {
            if let Some(w) = app.get_webview_window(PERCH) {
                let _ = w.close();
            }
        }
        clear_after_close(&app);
    });
}

fn tick_perch(app: &AppHandle, shared: &Shared) {
    let Some(win) = app.get_webview_window(PERCH) else { return };
    let Some(perch_hwnd) = win.hwnd().ok().map(|h| h.0 as isize) else { return };
    let mut guard = STATE.lock().unwrap();
    let Some(p) = guard.as_mut() else { return };

    // Tam ekran bir şey (oyun, video) öne geçtiyse onun üstünde durma
    let fg = imp::foreground();
    if fg != p.target && fg != perch_hwnd && imp::fullscreen(shared, fg) {
        drop(guard);
        leave(app);
        return;
    }
    // Odak başka uygun bir pencereye geçtiyse ona zıpla
    if fg != p.target && fg != perch_hwnd {
        if let Some(next) = imp::eligible(shared, fg) {
            let from = p.last.map(|(x, y, _)| (x, y));
            p.target = next;
            p.frac = 0.3 + rand_unit() * 0.35;
            p.hop = from.map(|f| (f, Instant::now()));
            let _ = app.emit_to(PERCH, "nook://perch-hop", ());
        }
    }
    let Some((frame, room)) = imp::frame(shared, p.target) else {
        drop(guard);
        leave(app);
        return;
    };
    let (sw, sh) = imp::size_of(perch_hwnd);
    if sw <= 0 || sh <= 0 {
        return;
    }
    let scale = sh as f64 / PERCH_H;
    let (l, t, r) = (frame.0 as f64, frame.1 as f64, frame.2 as f64);
    let seat_x = (l + (r - l) * p.frac).clamp(l + 60.0 * scale, (r - 170.0 * scale).max(l + 60.0 * scale));
    // Pencerenin üstünde yer yoksa (ekranın tepesine dayalı) başlık çubuğunun içine oturur
    let seat_y = if room { t + SINK * scale } else { t + 30.0 * scale };
    let mut pos = (seat_x, seat_y);

    if let Some((from, at)) = p.hop {
        let k = at.elapsed().as_secs_f64() / HOP.as_secs_f64();
        if k >= 1.0 {
            p.hop = None;
        } else {
            let e = k * k * (3.0 - 2.0 * k);
            let lift = (std::f64::consts::PI * k).sin() * (60.0 * scale + (from.0 - pos.0).abs() * 0.12);
            pos = (from.0 + (pos.0 - from.0) * e, from.1 + (pos.1 - from.1) * e - lift);
        }
    }

    // Hız (mantıksal px/sn), biraz yumuşatılmış — zıplarken sendeleme yok
    let now = Instant::now();
    if let Some((lx, ly, lt)) = p.last {
        let dt = now.duration_since(lt).as_secs_f64().max(0.001);
        let raw = if p.hop.is_some() { (0.0, 0.0) } else { ((pos.0 - lx) / dt / scale, (pos.1 - ly) / dt / scale) };
        p.vel = (p.vel.0 * 0.6 + raw.0 * 0.4, p.vel.1 * 0.6 + raw.1 * 0.4);
    }
    let moving = p.vel.0.abs() > 4.0 || p.vel.1.abs() > 4.0;
    let moved = p.last.is_none_or(|(lx, ly, _)| (lx - pos.0).abs() >= 0.5 || (ly - pos.1).abs() >= 0.5);
    p.last = Some((pos.0, pos.1, now));
    if (moving || moved) && p.emitted.elapsed() >= Duration::from_millis(33) {
        p.emitted = now;
        let v = if moving { p.vel } else { (0.0, 0.0) };
        let _ = app.emit_to(PERCH, "nook://perch-move", PerchMove { vx: v.0, vy: v.1 });
    }
    let raise = p.raised.elapsed() >= Duration::from_secs(1);
    if raise {
        p.raised = now;
    }
    drop(guard);

    let x = (pos.0 - sw as f64 / 2.0).round() as i32;
    let y = (pos.1 - sh as f64).round() as i32;
    imp::place(perch_hwnd, x, y, raise);
}

/// Basit rastgele sayı (0–1) — tek bir yer için bağımlılık eklemeye değmez
fn rand_unit() -> f64 {
    let n = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.subsec_nanos()).unwrap_or(0);
    (n.wrapping_mul(2654435761) % 10_000) as f64 / 10_000.0
}

/// Odak bekçisi uyarırken ada tam ekranda (YouTube'da tam ekran video) da görünür kalır.
#[tauri::command]
pub fn guard_alert(on: bool, shared: State<'_, Arc<Shared>>) {
    shared.guard.store(on, Ordering::Relaxed);
}

#[cfg(windows)]
mod imp {
    use windows_sys::Win32::Foundation::{HWND, RECT};
    use windows_sys::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED, DWMWA_EXTENDED_FRAME_BOUNDS};
    use windows_sys::Win32::Graphics::Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetClassNameW, GetForegroundWindow, GetWindowLongPtrW, GetWindowRect, GetWindowTextW, GetWindowThreadProcessId, IsIconic, IsWindow,
        IsWindowVisible, IsZoomed, SetWindowPos, GWL_EXSTYLE, HWND_TOPMOST, SWP_ASYNCWINDOWPOS, SWP_NOACTIVATE, SWP_NOSIZE, SWP_NOZORDER,
        WS_EX_TOOLWINDOW,
    };

    use crate::state::Shared;

    /// Masaüstü, görev çubuğu, Başlat/arama, bildirim merkezi — üstlerine tünenmez
    const SHELL: &[&str] = &[
        "Progman",
        "WorkerW",
        "Shell_TrayWnd",
        "Shell_SecondaryTrayWnd",
        "Windows.UI.Core.CoreWindow",
        "XamlExplorerHostIslandWindow",
        "TopLevelWindowForOverflowXamlIsland",
        "NotifyIconOverflowWindow",
    ];
    /// Bu boyuttan (mantıksal px) küçük pencereler (iletişim kutuları) olmaz
    const MIN_W: i32 = 360;
    const MIN_H: i32 = 220;
    /// Pencerenin üstünde Nook'a bu kadar yer (mantıksal px) yoksa tünemeye başlanmaz
    const ROOM: i32 = 64;

    pub fn foreground() -> isize {
        unsafe { GetForegroundWindow() as isize }
    }

    fn ours(hwnd: HWND) -> bool {
        let mut pid = 0u32;
        unsafe { GetWindowThreadProcessId(hwnd, &mut pid) };
        pid == std::process::id()
    }

    fn class_of(hwnd: HWND) -> String {
        let mut buf = [0u16; 128];
        let len = unsafe { GetClassNameW(hwnd, buf.as_mut_ptr(), buf.len() as i32) } as usize;
        String::from_utf16_lossy(&buf[..len])
    }

    fn cloaked(hwnd: HWND) -> bool {
        let mut v = 0u32;
        let ok = unsafe { DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED as u32, &mut v as *mut u32 as *mut _, 4) };
        ok == 0 && v != 0
    }

    /// Görünen çerçeve (Windows 10/11'in görünmez kenar boşlukları olmadan)
    fn bounds(hwnd: HWND) -> Option<RECT> {
        let mut r: RECT = unsafe { std::mem::zeroed() };
        let ok = unsafe { DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS as u32, &mut r as *mut RECT as *mut _, std::mem::size_of::<RECT>() as u32) };
        if ok == 0 {
            return Some(r);
        }
        (unsafe { GetWindowRect(hwnd, &mut r) } != 0).then_some(r)
    }

    fn monitor_of(hwnd: HWND) -> Option<RECT> {
        let mut mi: MONITORINFO = unsafe { std::mem::zeroed() };
        mi.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
        (unsafe { GetMonitorInfoW(MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST), &mut mi) } != 0).then_some(mi.rcMonitor)
    }

    fn dpi_scale(hwnd: HWND) -> f64 {
        use windows_sys::Win32::UI::HiDpi::GetDpiForWindow;
        let dpi = unsafe { GetDpiForWindow(hwnd) };
        if dpi == 0 {
            1.0
        } else {
            dpi as f64 / 96.0
        }
    }

    /// Tünenebilir, sıradan bir uygulama penceresi mi? Öyleyse kendisi.
    pub fn eligible(shared: &Shared, hwnd: isize) -> Option<isize> {
        let h = hwnd as HWND;
        if h.is_null() || shared.is_ours(hwnd) || ours(h) {
            return None;
        }
        unsafe {
            if IsWindowVisible(h) == 0 || IsIconic(h) != 0 || IsZoomed(h) != 0 {
                return None;
            }
            if GetWindowLongPtrW(h, GWL_EXSTYLE) as u32 & WS_EX_TOOLWINDOW != 0 {
                return None;
            }
        }
        if SHELL.contains(&class_of(h).as_str()) || cloaked(h) {
            return None;
        }
        let (r, m) = (bounds(h)?, monitor_of(h)?);
        let s = dpi_scale(h);
        let (w, ht) = (((r.right - r.left) as f64 / s) as i32, ((r.bottom - r.top) as f64 / s) as i32);
        let covers = r.left <= m.left && r.top <= m.top && r.right >= m.right && r.bottom >= m.bottom;
        let room = ((r.top - m.top) as f64 / s) as i32 >= ROOM;
        (w >= MIN_W && ht >= MIN_H && !covers && room).then_some(hwnd)
    }

    /// Tünenen pencerenin çerçevesi (sol, üst, sağ) ve üstünde yer olup olmadığı. Pencere kapandıysa,
    /// küçültüldüyse, büyütüldüyse ya da tam ekran olduysa None.
    pub fn frame(_shared: &Shared, hwnd: isize) -> Option<((i32, i32, i32), bool)> {
        let h = hwnd as HWND;
        unsafe {
            if IsWindow(h) == 0 || IsWindowVisible(h) == 0 || IsIconic(h) != 0 || IsZoomed(h) != 0 {
                return None;
            }
        }
        if cloaked(h) {
            return None;
        }
        let (r, m) = (bounds(h)?, monitor_of(h)?);
        let covers = r.left <= m.left && r.top <= m.top && r.right >= m.right && r.bottom >= m.bottom;
        if covers {
            return None;
        }
        let s = dpi_scale(h);
        let room = (r.top - m.top) as f64 / s >= 40.0;
        Some(((r.left, r.top, r.right), room))
    }

    /// Öndeki pencere bir ekranı tamamen kaplıyor mu (masaüstü ve Nook'un kendisi hariç)
    pub fn fullscreen(shared: &Shared, hwnd: isize) -> bool {
        let h = hwnd as HWND;
        if h.is_null() || shared.is_ours(hwnd) || ours(h) || SHELL.contains(&class_of(h).as_str()) {
            return false;
        }
        match (bounds(h), monitor_of(h)) {
            (Some(r), Some(m)) => r.left <= m.left && r.top <= m.top && r.right >= m.right && r.bottom >= m.bottom,
            _ => false,
        }
    }

    pub fn size_of(hwnd: isize) -> (i32, i32) {
        let mut r: RECT = unsafe { std::mem::zeroed() };
        if unsafe { GetWindowRect(hwnd as HWND, &mut r) } == 0 {
            return (0, 0);
        }
        (r.right - r.left, r.bottom - r.top)
    }

    /// Odak çalmadan taşı; arada bir en üst katmanın önüne it (başka "en üstte" pencereler de var)
    pub fn place(hwnd: isize, x: i32, y: i32, raise: bool) {
        unsafe {
            let flags = SWP_NOSIZE | SWP_NOACTIVATE | SWP_ASYNCWINDOWPOS | if raise { 0 } else { SWP_NOZORDER };
            SetWindowPos(hwnd as HWND, HWND_TOPMOST, x, y, 0, 0, flags);
        }
    }

    /// Öndeki pencerenin başlığı ve uygulaması (Nook'un kendi pencereleri hariç)
    pub fn foreground_info(shared: &Shared) -> Option<(String, String)> {
        let h = unsafe { GetForegroundWindow() };
        if h.is_null() || shared.is_ours(h as isize) || ours(h) {
            return None;
        }
        let mut buf = [0u16; 512];
        let len = unsafe { GetWindowTextW(h, buf.as_mut_ptr(), buf.len() as i32) } as usize;
        let title = String::from_utf16_lossy(&buf[..len]);
        let exe = crate::fullscreen::exe_path(h as isize).unwrap_or_default();
        let stem = exe.rsplit(['\\', '/']).next().unwrap_or("").to_lowercase();
        Some((title, stem.trim_end_matches(".exe").to_string()))
    }
}

#[cfg(not(windows))]
mod imp {
    use crate::state::Shared;
    pub fn foreground() -> isize {
        0
    }
    pub fn eligible(_shared: &Shared, _hwnd: isize) -> Option<isize> {
        None
    }
    pub fn frame(_shared: &Shared, _hwnd: isize) -> Option<((i32, i32, i32), bool)> {
        None
    }
    pub fn fullscreen(_shared: &Shared, _hwnd: isize) -> bool {
        false
    }
    pub fn size_of(_hwnd: isize) -> (i32, i32) {
        (0, 0)
    }
    pub fn place(_hwnd: isize, _x: i32, _y: i32, _raise: bool) {}
    pub fn foreground_info(_shared: &Shared) -> Option<(String, String)> {
        None
    }
}
