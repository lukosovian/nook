//! Tam ekran algılama: öndeki pencere (oyun, video) bir ekranı tamamen kaplıyorsa
//! o ekrandaki ada kaybolur, çıkınca geri gelir. Ada, üst üste binen "her zaman en üstte"
//! bir pencere olarak oyunun görüntüsünü ya da performansını etkilemesin diye gerçekten gizlenir.
//!
//! Oyun modu: tam ekran uygulama bir tarayıcı/video oynatıcı değilse "oyun" sayılır; çıkınca
//! süre ve en yüksek işlemci/bellek kullanımı "nook://game" ile bildirilir.

use std::collections::HashSet;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::state::Shared;

const POLL: Duration = Duration::from_millis(500);
/// Frontend'in "kaçış" animasyonu — pencere bundan sonra gizlenir.
const HIDE_AFTER: Duration = Duration::from_millis(260);
/// Bundan kısa tam ekranlar (yükleme ekranı, yanlışlıkla F11) oyun özeti çıkarmaz.
const MIN_GAME: Duration = Duration::from_secs(120);
/// Oyun açılınca ada gizlenmeden önce özet kartı bu kadar görünür.
const INTRO_PEEK: Duration = Duration::from_secs(5);
/// Mola hatırlatıcısı için ada oyunun üstünde bu kadar görünür, sonra yine gizlenir.
const BREAK_PEEK: Duration = Duration::from_secs(8);

/// Tarayıcılar, video oynatıcılar ve sunum gibi "oyun olmayan" tam ekranlar (küçük harf, .exe'siz).
const NOT_GAMES: &[&str] = &[
    "chrome", "msedge", "firefox", "opera", "opera_gx", "brave", "vivaldi", "arc", "zen", "vlc", "mpc-hc", "mpc-hc64", "mpc-be", "mpc-be64",
    "potplayer", "potplayermini", "potplayermini64", "wmplayer", "video.ui", "microsoft.media.player", "spotify", "netflix", "explorer",
    "applicationframehost", "powerpnt", "obs64", "mpv", "kmplayer", "discord", "code", "windowsterminal", "nook",
];

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

pub fn spawn(app: AppHandle, shared: Arc<Shared>) {
    thread::Builder::new()
        .name("nook-fullscreen".into())
        .spawn(move || {
            let mut hidden: HashSet<String> = HashSet::new();
            let mut session: Option<Session> = None;
            // Ada oyunun üstünde kısa süre görünsün (açılış özeti, mola hatırlatması)
            let mut peek_until: Option<Instant> = None;
            // Vakti gelen alarm bir kez bildirilir: gizliyken sayfanın saati yavaşlar (Chromium arka plan kısıtlaması)
            let mut rung_for: i64 = 0;
            loop {
                thread::sleep(POLL);
                let settings = shared.settings();
                let alarm = crate::alarm::imminent(&shared);
                let next = shared.next_alarm.load(Ordering::Relaxed);
                let now_ms = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0);
                if next > 0 && now_ms >= next && rung_for != next {
                    rung_for = next;
                    let _ = app.emit("nook://alarm-due", next);
                }
                let enabled = settings.hide_in_fullscreen && !alarm;
                let mut break_due: Option<GamePeek> = None;
                let detected = imp::fullscreen_monitor(&shared);

                // --- Oyun oturumu
                let game = detected.as_ref().and_then(|d| d.1.clone()).filter(|(_, e)| {
                    let stem = e.rsplit(['\\', '/']).next().unwrap_or(e).to_lowercase();
                    !NOT_GAMES.contains(&stem.trim_end_matches(".exe"))
                });
                // Alt-Tab ile oyundan çıkıldıysa ama oyun hâlâ açıksa oturum sürer — dönünce baştan saymaz
                let away = game.is_none() && session.as_ref().is_some_and(|s| imp::alive(s.pid, &s.exe));
                let in_session_game = matches!((&session, &game), (Some(s), Some((_, g))) if s.exe == *g);
                match (&mut session, game) {
                    _ if away => {}
                    (Some(s), Some((_, g))) if s.exe == g => {
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
                            if s.started.elapsed() >= MIN_GAME {
                                let _ = app.emit(
                                    "nook://game",
                                    GameSession { app: pretty(&s.exe), secs: s.started.elapsed().as_secs(), peak_cpu: s.peak_cpu, peak_mem: s.peak_mem },
                                );
                            }
                        }
                        if let (Some((_, exe)), true) = (&next, settings.game_intro) {
                            peek_until = Some(Instant::now() + INTRO_PEEK);
                            let _ = app.emit("nook://game-start", GamePeek { app: pretty(exe), mins: 0 });
                        }
                        *cur = next.map(|(pid, exe)| Session { exe, pid, started: Instant::now(), breaks: 0, peak_cpu: 0.0, peak_mem: 0 });
                    }
                }

                *shared.game_screen.lock().unwrap() = if in_session_game { detected.as_ref().map(|d| d.0) } else { None };

                let peek = peek_until.is_some_and(|t| Instant::now() < t);
                let in_game = detected.is_some();
                let full = if enabled && !peek { detected.map(|d| d.0) } else { None };

                let windows: Vec<_> = shared.windows.lock().unwrap().iter().map(|(k, v)| (k.clone(), *v)).collect();
                for (label, ws) in windows {
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
                    if alarm || (peek && in_game) {
                        imp::raise(ws.hwnd);
                    }
                }
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
    }
    #[cfg(not(windows))]
    let _ = (app, label, on);
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

    /// Masaüstü, görev çubuğu, Başlat menüsü "tam ekran" sayılmaz.
    const SHELL_CLASSES: &[&str] = &[
        "Progman",
        "WorkerW",
        "Shell_TrayWnd",
        "Shell_SecondaryTrayWnd",
        "Windows.UI.Core.CoreWindow",
        "XamlExplorerHostIslandWindow",
    ];

    /// Tam ekran bir pencerenin kapladığı monitör (sol, üst, sağ, alt — fiziksel px), süreç kimliği ve exe yolu.
    pub fn fullscreen_monitor(shared: &Shared) -> Option<((i32, i32, i32, i32), Option<(u32, String)>)> {
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
            Some(((m.left, m.top, m.right, m.bottom), exe))
        }
    }

    /// Pencerenin sahibi sürecin kimliği ve tam yolu.
    fn exe_of(hwnd: HWND) -> Option<(u32, String)> {
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
    pub fn fullscreen_monitor(_shared: &Shared) -> Option<((i32, i32, i32, i32), Option<(u32, String)>)> {
        None
    }
    pub fn alive(_pid: u32, _exe: &str) -> bool {
        false
    }
    pub fn show(_hwnd: isize, _visible: bool) {}
    pub fn raise(_hwnd: isize) {}
}
