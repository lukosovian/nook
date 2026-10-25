//! Tam ekran algılama: öndeki pencere (oyun, video) bir ekranı tamamen kaplıyorsa
//! o ekrandaki ada kaybolur, çıkınca geri gelir. Ada, üst üste binen "her zaman en üstte"
//! bir pencere olarak oyunun görüntüsünü ya da performansını etkilemesin diye gerçekten gizlenir.
//!
//! Oyun modu: tam ekran uygulama bir tarayıcı/video oynatıcı değilse "oyun" sayılır; çıkınca
//! süre ve en yüksek işlemci/bellek kullanımı "nook://game" ile bildirilir. "Oyunda ikinci ekrana geç"
//! açıksa ve başka bir ekran varsa ada gizlenmek yerine diğer ekrana taşınır; oyun kapanınca geri döner.

use std::collections::HashSet;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Monitor};

use crate::state::{MonitorMode, Shared};

const POLL: Duration = Duration::from_millis(500);
/// Frontend'in "kaçış" animasyonu — pencere bundan sonra gizlenir.
const HIDE_AFTER: Duration = Duration::from_millis(260);
/// Oyun açılınca ada gizlenmeden önce özet kartı bu kadar görünür.
const INTRO_PEEK: Duration = Duration::from_secs(5);
/// Mola hatırlatıcısı için ada oyunun üstünde bu kadar görünür, sonra yine gizlenir.
const BREAK_PEEK: Duration = Duration::from_secs(8);
/// Öndeki pencere değişmese de "en üstte" bayrağı bu sıklıkla yeniden verilir.
const TOPMOST_EVERY: u32 = 8;

/// Tarayıcılar, video oynatıcılar ve sunum gibi "oyun olmayan" tam ekranlar (küçük harf, .exe'siz).
const NOT_GAMES: &[&str] = &[
    "chrome", "msedge", "firefox", "opera", "opera_gx", "brave", "vivaldi", "arc", "zen", "vlc", "mpc-hc", "mpc-hc64", "mpc-be", "mpc-be64",
    "potplayer", "potplayermini", "potplayermini64", "wmplayer", "video.ui", "microsoft.media.player", "spotify", "netflix", "explorer",
    "applicationframehost", "powerpnt", "obs64", "mpv", "kmplayer", "discord", "code", "windowsterminal", "nook",
    // Ekran görüntüsü araçları ekranı bir anlığına tam ekran bir katmanla kaplar ("ScreenClippingHost başlıyor · iyi oyunlar")
    "screenclippinghost", "snippingtool", "screensketch", "sharex", "lightshot", "greenshot", "flameshot", "snagit32", "snagiteditor",
    "gyazo", "screentogif", "picpick", "monosnap",
    // Windows'un kendi tam ekran katmanları ve tam ekran açılabilen iş uygulamaları
    "lockapp", "searchhost", "startmenuexperiencehost", "shellexperiencehost", "textinputhost", "photos", "microsoft.photos",
    "ms-teams", "teams", "zoom", "acrord32", "acrobat", "winword", "excel",
];

/// Hep en üstte durması gereken pencereler (etiket önekleri).
const ON_TOP: &[&str] = &[crate::window::ISLAND, crate::argus::CARD, crate::argus::SOUND, crate::buddy::PERCH, crate::shield::PREFIX];

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct GamePeek {
    app: String,
    /// Oyunun başından beri geçen dakika (açılışta 0)
    mins: u64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct GameSession {
    app: String,
    secs: u64,
    peak_cpu: f32,
    peak_mem: u32,
}

struct Session {
    exe: String,
    pid: u32,
    hwnd: isize,
    monitor: (i32, i32, i32, i32),
    started: Instant,
    /// Gösterilen mola hatırlatması sayısı
    breaks: u64,
    peak_cpu: f32,
    peak_mem: u32,
}

/// "C:\Games\VALORANT-Win64-Shipping.exe" → "VALORANT"
fn pretty(exe: &str) -> String {
    let stem = exe.rsplit(['\\', '/']).next().unwrap_or(exe).trim_end_matches(".exe").trim_end_matches(".EXE");
    let cut = ["-Win64-Shipping", "-Win32-Shipping", "_x64", "64", "_DX11", "_DX12", "-Win64"]
        .iter()
        .fold(stem.to_string(), |s, suf| s.strip_suffix(suf).map(str::to_string).unwrap_or(s));
    if cut.is_empty() {
        stem.to_string()
    } else {
        cut
    }
}

/// Öndeki pencerenin uygulaması ("chrome", "Code", "Figma"); Nook'un günlüğü dakikada bir sorar
#[tauri::command]
pub fn foreground_app() -> Option<String> {
    #[cfg(windows)]
    {
        let h = imp::foreground();
        if h == 0 {
            return None;
        }
        imp::exe_of(h as _).map(|(_, path)| pretty(&path))
    }
    #[cfg(not(windows))]
    {
        None
    }
}

pub fn spawn(app: AppHandle, shared: Arc<Shared>) {
    thread::Builder::new()
        .name("nook-fullscreen".into())
        .spawn(move || {
            let mut hidden: HashSet<String> = HashSet::new();
            let mut session: Option<Session> = None;
            // Oyun yüzünden 2. ekrana taşındıysa önceki ekranı hatırla; oyun kapanınca geri dön
            let mut game_displaced: Option<Monitor> = None;
            // Ada oyunun üstünde kısa süre görünsün (açılış özeti, mola hatırlatması)
            let mut peek_until: Option<Instant> = None;
            // Vakti gelen alarm bir kez bildirilir: gizliyken sayfanın saati yavaşlar (Chromium arka plan kısıtlaması)
            let mut rung_for: i64 = 0;
            let mut last_fg: isize = 0;
            let mut tick: u32 = 0;
            loop {
                thread::sleep(POLL);
                let settings = shared.settings();
                let alarm = crate::alarm::imminent(&shared);
                let next = shared.next_alarm.load(Ordering::Relaxed);
                let now_ms = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0);
                if next > 0 && now_ms >= next && rung_for != next {
                    rung_for = next;
                    let _ = app.emit("nook://alarm-due", next);
                    // Oyunda görünmedi denince nedenini görebilmek için: öndeki tam ekran ne, ada gizli mi
                    let fg = imp::fullscreen_monitor(&shared).and_then(|d| d.2).map(|(_, e)| pretty(&e));
                    crate::log::write("info", &format!("alarm vakti: tam ekran={fg:?}, gizli ada={}", hidden.len()));
                }
                let guard = shared.guard.load(Ordering::Relaxed);
                // Alarm oyunun üstüne çıkmaz: tam ekran oyunun üstüne pencere itmek oyunu alta atıyordu.
                // Oyunda alarm yalnızca çalar; oyundan çıkınca adada bekler.
                let enabled = settings.hide_in_fullscreen && !guard;
                let mut break_due: Option<GamePeek> = None;
                let detected = imp::fullscreen_monitor(&shared);

                // --- Oyun oturumu
                let game = detected.as_ref().and_then(|d| d.2.clone().map(|(pid, e)| (d.0, d.1, pid, e))).filter(|(_, _, _, e)| {
                    let stem = e.rsplit(['\\', '/']).next().unwrap_or(e).to_lowercase();
                    !NOT_GAMES.contains(&stem.trim_end_matches(".exe"))
                });
                // Alt-Tab ile oyundan çıkıldıysa ama oyun hâlâ açıksa oturum sürer — dönünce baştan saymaz
                let away = game.is_none() && session.as_ref().is_some_and(|s| imp::alive(s.pid, &s.exe));
                let in_session_game = matches!((&session, &game), (Some(s), Some((_, _, _, g))) if s.exe == *g);
                match (&mut session, game) {
                    _ if away => {}
                    (Some(s), Some((mon, hwnd, _, g))) if s.exe == g => {
                        s.hwnd = hwnd;
                        s.monitor = mon;
                        s.peak_cpu = s.peak_cpu.max(f32::from_bits(shared.cpu.load(Ordering::Relaxed)));
                        s.peak_mem = s.peak_mem.max(shared.mem.load(Ordering::Relaxed));
                        let mins = s.started.elapsed().as_secs() / 60;
                        let every = settings.break_reminder_min;
                        if every > 0 && mins >= every * (s.breaks + 1) {
                            s.breaks = mins / every;
                            peek_until = Some(Instant::now() + BREAK_PEEK);
                            break_due = Some(GamePeek { app: pretty(&s.exe), mins });
                        }
                    }
                    (cur, next) => {
                        if let Some(s) = cur.take() {
                            let _ = app.emit(
                                "nook://game",
                                GameSession { app: pretty(&s.exe), secs: s.started.elapsed().as_secs(), peak_cpu: s.peak_cpu, peak_mem: s.peak_mem },
                            );
                        }
                        if let Some((_, _, _, exe)) = &next {
                            if settings.game_intro {
                                peek_until = Some(Instant::now() + INTRO_PEEK);
                            }
                            let _ = app.emit("nook://game-start", GamePeek { app: pretty(exe), mins: 0 });
                        }
                        *cur = next.map(|(monitor, hwnd, pid, exe)| Session {
                            exe,
                            pid,
                            hwnd,
                            monitor,
                            started: Instant::now(),
                            breaks: 0,
                            peak_cpu: 0.0,
                            peak_mem: 0,
                        });
                    }
                }

                // Oyun penceresi 1. ekranda hâlâ tam ekran görünüyorsa (kullanıcı 2. ekranda Discord'a/Nook'a tıklamış olsa bile)
                // oyun ekranı dolu sayılır ki Nook 1. ekrana geri sıçramasın.
                let game_mon = if in_session_game {
                    detected.as_ref().map(|d| d.0)
                } else {
                    session
                        .as_ref()
                        .filter(|s| imp::alive(s.pid, &s.exe) && imp::window_covers(s.hwnd, s.monitor))
                        .map(|s| s.monitor)
                };
                *shared.game_screen.lock().unwrap() = game_mon;

                // "Oyunda ikinci ekrana geç" açıksa ve başka bir monitör varsa, Nook gizlenmek yerine diğer ekrana geçer
                let can_move_second = settings.game_second_screen && settings.monitor_mode != MonitorMode::All;
                if let (true, Some((gl, gt, _, _))) = (can_move_second, game_mon) {
                    let monitors = app.available_monitors().unwrap_or_default();
                    if let Some(cur_mon) = crate::window::monitor_of(&shared, crate::window::ISLAND, &monitors) {
                        if cur_mon.position().x == gl && cur_mon.position().y == gt {
                            if let Some(other) = monitors.iter().find(|m| !(m.position().x == gl && m.position().y == gt)).cloned() {
                                if game_displaced.is_none() {
                                    game_displaced = Some(cur_mon);
                                }
                                if hidden.remove(crate::window::ISLAND) {
                                    if let Some(ws) = shared.windows.lock().unwrap().get(crate::window::ISLAND).copied() {
                                        webview_visible(&app, crate::window::ISLAND, true);
                                        imp::show(ws.hwnd, true);
                                    }
                                    let _ = app.emit_to(crate::window::ISLAND, "nook://fullscreen", false);
                                }
                                crate::window::relocate(&app, shared.clone(), crate::window::ISLAND.into(), other);
                            }
                        }
                    }
                } else if let Some(prev_mon) = game_displaced.take() {
                    if settings.monitor_mode != MonitorMode::All {
                        let monitors = app.available_monitors().unwrap_or_default();
                        let cur_mon = crate::window::monitor_of(&shared, crate::window::ISLAND, &monitors);
                        if monitors.iter().any(|m| crate::window::same_monitor(m, &prev_mon))
                            && cur_mon.as_ref().is_none_or(|c| !crate::window::same_monitor(c, &prev_mon))
                        {
                            crate::window::relocate(&app, shared.clone(), crate::window::ISLAND.into(), prev_mon);
                        }
                    }
                }

                let peek = peek_until.is_some_and(|t| Instant::now() < t);
                // DirectX'in özel tam ekran kipi pencere boyutundan anlaşılmayabilir: Windows'a da sor
                let in_game = detected.is_some() || imp::exclusive_fullscreen();
                shared.exclusive.store(in_game, Ordering::Relaxed);
                let rect = detected.map(|d| d.0).or_else(|| if in_game { imp::foreground_monitor(&shared) } else { None });
                let full = if enabled && !peek { rect } else { None };

                let windows: Vec<_> = shared.windows.lock().unwrap().iter().map(|(k, v)| (k.clone(), *v)).collect();
                for (label, ws) in windows {
                    // Yan kartlar (ses kartı) adaya bağlı: içeriğini ada gizler
                    if !label.starts_with(crate::window::ISLAND) {
                        continue;
                    }
                    // Oyun nedeniyle 2. ekrana taşınıyorsa ya da taşındıysa gizleme
                    if label == crate::window::ISLAND && game_displaced.is_some() {
                        continue;
                    }
                    // Ada penceresinin üst-orta noktası tam ekran monitörün içinde mi?
                    let cx = ws.geom.x + crate::window::width_of(&label) * ws.geom.scale / 2.0;
                    let covered = full.is_some_and(|(l, t, r, b)| cx >= l as f64 && cx < r as f64 && ws.geom.y + 1.0 >= t as f64 && ws.geom.y < b as f64);

                    if covered && hidden.insert(label.clone()) {
                        let _ = app.emit_to(label.as_str(), "nook://fullscreen", true);
                        let hwnd = ws.hwnd;
                        let (app, label) = (app.clone(), label.clone());
                        thread::spawn(move || {
                            thread::sleep(HIDE_AFTER);
                            imp::show(hwnd, false);
                            webview_visible(&app, &label, false);
                        });
                    } else if !covered && hidden.remove(&label) {
                        // Önce WebView2 uyansın (çizim ve zamanlayıcılar hemen dönsün), sonra pencere
                        webview_visible(&app, &label, true);
                        imp::show(ws.hwnd, true);
                        let _ = app.emit_to(label.as_str(), "nook://fullscreen", false);
                    }
                    // Oyun da "en üstte" olabilir — alarm/kısa gösterim sırasında adayı tekrar tekrar en öne it
                    if (alarm && !in_game) || guard || (peek && in_game) {
                        imp::raise(ws.hwnd);
                    }
                }
                // Windows "her zaman en üstte" pencereleri ara sıra alta itiyor (Gezgin, tarayıcı öne gelince
                // ada, ses kartı, Argus kartı altta kalıyordu). Öndeki pencere değişince ve arada bir yeniden en öne al.
                // Tam ekran oyunda dokunulmaz (oyunun üstüne sürekli pencere itmek onu alta atabilir); ama ada 2. ekrana geçtiyse güvenle en üstte tutulur.
                tick = tick.wrapping_add(1);
                let fg = imp::foreground();
                if (!in_game || game_displaced.is_some()) && (fg != last_fg || tick % TOPMOST_EVERY == 0) {
                    for (label, w) in app.webview_windows() {
                        if hidden.contains(&label) || !ON_TOP.iter().any(|p| label.starts_with(p)) {
                            continue;
                        }
                        if let Ok(h) = w.hwnd() {
                            imp::keep_on_top(h.0 as isize);
                        }
                    }
                }
                last_fg = fg;
                // Pencere yeniden göründükten (ve kareler açıldıktan) sonra
                if let Some(b) = break_due {
                    let _ = app.emit("nook://game-break", b);
                }
            }
        })
        .expect("fullscreen thread başlatılamadı");
}

/// WebView2'ye de görünürlüğü söyle: gizliyken çizmeyi bıraksın (oyunda yük olmasın), açılınca
/// beklemeden çizsin. Yalnızca pencereyi gizleyip göstermek yetmiyor; sayfa bir süre arka planda kalıyordu.
fn webview_visible(app: &AppHandle, label: &str, on: bool) {
    #[cfg(windows)]
    if let Some(w) = app.get_webview_window(label) {
        let _ = w.with_webview(move |pv| unsafe {
            let _ = pv.controller().SetIsVisible(on);
        });
        if on {
            crate::window::clear_background(&w);
        }
    }
    #[cfg(not(windows))]
    let _ = (app, label, on);
}

/// Pencerenin sahibi sürecin exe yolu (Odak bekçisi için)
#[cfg(windows)]
pub fn exe_path(hwnd: isize) -> Option<String> {
    imp::exe_of(hwnd as _).map(|(_, e)| e)
}

#[cfg(windows)]
mod imp {
    use windows_sys::Win32::Foundation::{HWND, RECT};
    use windows_sys::Win32::Graphics::Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetAncestor, GetClassNameW, GetForegroundWindow, GA_ROOTOWNER, GetWindowRect, IsIconic, IsWindowVisible, SetWindowPos, ShowWindow, HWND_TOPMOST, SWP_NOACTIVATE,
        SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW, SW_HIDE, SW_SHOWNOACTIVATE,
    };

    use crate::state::Shared;

    /// Windows'a göre öndeki uygulama tam ekran mı (DirectX özel tam ekran, sunum kipi)
    pub fn exclusive_fullscreen() -> bool {
        use windows_sys::Win32::UI::Shell::{SHQueryUserNotificationState, QUNS_PRESENTATION_MODE, QUNS_RUNNING_D3D_FULL_SCREEN};
        let mut state = 0;
        unsafe { SHQueryUserNotificationState(&mut state) >= 0 && (state == QUNS_RUNNING_D3D_FULL_SCREEN || state == QUNS_PRESENTATION_MODE) }
    }

    /// Masaüstü, görev çubuğu, Başlat menüsü "tam ekran" sayılmaz.
    const SHELL_CLASSES: &[&str] = &[
        "Progman",
        "WorkerW",
        "Shell_TrayWnd",
        "Shell_SecondaryTrayWnd",
        "Windows.UI.Core.CoreWindow",
        "XamlExplorerHostIslandWindow",
    ];

    /// Tam ekran bir pencerenin kapladığı monitör (sol, üst, sağ, alt — fiziksel px), pencere tanıtıcısı, süreç kimliği ve exe yolu.
    pub fn fullscreen_monitor(shared: &Shared) -> Option<((i32, i32, i32, i32), isize, Option<(u32, String)>)> {
        unsafe {
            let fg = GetForegroundWindow();
            if fg.is_null() || shared.is_ours(fg as isize) || IsWindowVisible(fg) == 0 || IsIconic(fg) != 0 {
                return None;
            }
            let mut class = [0u16; 128];
            let len = GetClassNameW(fg, class.as_mut_ptr(), class.len() as i32) as usize;
            let class = String::from_utf16_lossy(&class[..len]);
            if SHELL_CLASSES.contains(&class.as_str()) {
                return None;
            }

            let mut r: RECT = std::mem::zeroed();
            if GetWindowRect(fg, &mut r) == 0 {
                return None;
            }
            let mut mi: MONITORINFO = std::mem::zeroed();
            mi.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
            if GetMonitorInfoW(MonitorFromWindow(fg, MONITOR_DEFAULTTONEAREST), &mut mi) == 0 {
                return None;
            }
            let m = mi.rcMonitor;
            let covers = r.left <= m.left && r.top <= m.top && r.right >= m.right && r.bottom >= m.bottom;
            if !covers {
                return None;
            }
            // Nook'un kendi açtığı tam ekran katmanlar (ekrandan renk seçici) adayı gizlemesin
            let owner = GetAncestor(fg, GA_ROOTOWNER);
            let exe = exe_of(fg);
            let webview = exe.as_ref().is_some_and(|(_, e)| e.to_lowercase().ends_with("msedgewebview2.exe"));
            if shared.is_ours(owner as isize) || webview {
                return None;
            }
            Some(((m.left, m.top, m.right, m.bottom), fg as isize, exe))
        }
    }

    /// Verilen pencere hâlâ görünür, simge durumunda değil ve belirtilen ekranı kaplıyor mu?
    pub fn window_covers(hwnd: isize, (ml, mt, mr, mb): (i32, i32, i32, i32)) -> bool {
        unsafe {
            let h = hwnd as HWND;
            if h.is_null() || IsWindowVisible(h) == 0 || IsIconic(h) != 0 {
                return false;
            }
            let mut r: RECT = std::mem::zeroed();
            if GetWindowRect(h, &mut r) == 0 {
                return false;
            }
            r.left <= ml && r.top <= mt && r.right >= mr && r.bottom >= mb
        }
    }

    /// Pencerenin sahibi sürecin kimliği ve tam yolu.
    pub fn exe_of(hwnd: HWND) -> Option<(u32, String)> {
        use windows_sys::Win32::UI::WindowsAndMessaging::GetWindowThreadProcessId;
        let mut pid = 0u32;
        unsafe { GetWindowThreadProcessId(hwnd, &mut pid) };
        if pid == 0 {
            return None;
        }
        Some((pid, path_of(pid)?))
    }

    /// Süreç hâlâ çalışıyor ve aynı exe mi (kimlik başka sürece verilmiş olmasın)?
    pub fn alive(pid: u32, exe: &str) -> bool {
        path_of(pid).is_some_and(|p| p == exe)
    }

    /// Çalışan sürecin tam yolu; kapanmışsa None.
    fn path_of(pid: u32) -> Option<String> {
        use windows_sys::Win32::Foundation::{CloseHandle, STILL_ACTIVE};
        use windows_sys::Win32::System::Threading::{GetExitCodeProcess, OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION};
        unsafe {
            let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if h.is_null() {
                return None;
            }
            let mut buf = [0u16; 520];
            let mut len = buf.len() as u32;
            let mut code = 0u32;
            let running = GetExitCodeProcess(h, &mut code) != 0 && code == STILL_ACTIVE as u32;
            let ok = QueryFullProcessImageNameW(h, 0, buf.as_mut_ptr(), &mut len);
            CloseHandle(h);
            (ok != 0 && running).then(|| String::from_utf16_lossy(&buf[..len as usize]))
        }
    }

    /// Odak çalmadan göster/gizle.
    pub fn show(hwnd: isize, visible: bool) {
        unsafe {
            ShowWindow(hwnd as HWND, if visible { SW_SHOWNOACTIVATE } else { SW_HIDE });
        }
    }

    pub fn foreground() -> isize {
        unsafe { GetForegroundWindow() as isize }
    }

    /// Öndeki (bizim olmayan) pencerenin bulunduğu monitör
    pub fn foreground_monitor(shared: &Shared) -> Option<(i32, i32, i32, i32)> {
        unsafe {
            let fg = GetForegroundWindow();
            if fg.is_null() || shared.is_ours(fg as isize) {
                return None;
            }
            let mut mi: MONITORINFO = std::mem::zeroed();
            mi.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
            if GetMonitorInfoW(MonitorFromWindow(fg, MONITOR_DEFAULTTONEAREST), &mut mi) == 0 {
                return None;
            }
            let r = mi.rcMonitor;
            Some((r.left, r.top, r.right, r.bottom))
        }
    }

    /// Görünürse, odak çalmadan ve göstermeden "en üstte" katmanın önüne geri al.
    pub fn keep_on_top(hwnd: isize) {
        use windows_sys::Win32::UI::WindowsAndMessaging::{SWP_ASYNCWINDOWPOS, SWP_NOOWNERZORDER};
        unsafe {
            if IsWindowVisible(hwnd as HWND) != 0 {
                SetWindowPos(hwnd as HWND, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOOWNERZORDER | SWP_ASYNCWINDOWPOS);
            }
        }
    }

    /// Odak çalmadan en üst katmanın da en önüne getir.
    pub fn raise(hwnd: isize) {
        unsafe {
            SetWindowPos(hwnd as HWND, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW);
        }
    }
}

#[cfg(not(windows))]
mod imp {
    use crate::state::Shared;
    pub fn exclusive_fullscreen() -> bool {
        false
    }
    pub fn fullscreen_monitor(_shared: &Shared) -> Option<((i32, i32, i32, i32), isize, Option<(u32, String)>)> {
        None
    }
    pub fn window_covers(_hwnd: isize, _mon: (i32, i32, i32, i32)) -> bool {
        false
    }
    pub fn alive(_pid: u32, _exe: &str) -> bool {
        false
    }
    pub fn show(_hwnd: isize, _visible: bool) {}
    pub fn raise(_hwnd: isize) {}
    pub fn foreground() -> isize {
        0
    }
    pub fn foreground_monitor(_shared: &Shared) -> Option<(i32, i32, i32, i32)> {
        None
    }
    pub fn keep_on_top(_hwnd: isize) {}
}
