//! Gizlilik kalkanı: kısayola basınca her ekranı en üstte duran, ekranı tamamen kaplayan bir
//! pencere örter (içinde uyuyan Nook'lar). Tekrar basınca, Esc'e ya da çift tıklayınca kalkar.
//! Parola kilidi açıksa kalkan yalnızca parolayla kalkar (doğrulama kalkanın sayfasında yapılır);
//! kısayol o sırada parola kutusunu açar. Kilitliyken adalar ve yan kartlar etkileşime kapanır.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::state::Shared;

pub const PREFIX: &str = "shield-";

/// Mikrofonu kalkan kapattı: kalkan kalkınca yeniden açılır (zaten kapalıysa dokunulmaz)
static MIC_RESTORE: AtomicBool = AtomicBool::new(false);

fn open_labels(app: &AppHandle) -> Vec<String> {
    app.webview_windows().into_keys().filter(|l| l.starts_with(PREFIX)).collect()
}

fn lock_on(app: &AppHandle) -> bool {
    app.state::<Arc<Shared>>().settings().shield_lock
}

/// Açıksa kapat (kilitliyse parola sor), kapalıysa bütün ekranlarda aç.
pub fn toggle(app: &AppHandle) {
    let app2 = app.clone();
    let _ = app.run_on_main_thread(move || {
        if open_labels(&app2).is_empty() {
            open(&app2, false);
        } else if app2.state::<Arc<Shared>>().locked.load(Ordering::Relaxed) || lock_on(&app2) {
            ask(&app2);
        } else {
            close(&app2);
        }
    });
}

/// Kilitli kalkanda parola kutusunu göster (ilk ekrandaki kalkan odağı alır)
fn ask(app: &AppHandle) {
    let _ = app.emit("nook://shield-ask", ());
    if let Some(w) = app.get_webview_window(&format!("{PREFIX}0")) {
        let _ = w.set_focus();
    }
}

fn open(app: &AppHandle, ask_now: bool) {
    // Açılış kilidi her zaman kilitlidir (ayarlar Rust'a henüz ulaşmamış olabilir)
    let locked = ask_now || lock_on(app);
    app.state::<Arc<Shared>>().locked.store(locked, Ordering::Relaxed);
    let monitors = app.available_monitors().unwrap_or_default();
    // Çalan medya duraklar (beklemeden, ayrı iş parçacığında)
    std::thread::spawn(|| {
        if crate::media::pause_all() {
            crate::log::write("info", "kalkan: medya duraklatıldı");
        }
    });
    // Mikrofon açıksa kalkan boyunca sessize alınır; kapalıysa kapalı kalır.
    // COM çağrısı ana iş parçacığında değil, ayrı iş parçacığında (kısa sürer, sonucu beklenir).
    let mic_off = std::thread::spawn(|| {
        if crate::quick::mic_muted() == Some(false) && crate::quick::set_mic_muted(true).is_ok() {
            MIC_RESTORE.store(true, Ordering::Relaxed);
            return true;
        }
        false
    })
    .join()
    .unwrap_or(false);
    // Açılışta parola kutusu hemen görünsün mü (bilgisayar yeni açıldı); mikrofonu biz mi kapattık
    let url = format!("index.html?{}{}", if ask_now { "ask=1&" } else { "" }, if mic_off { "mic=1" } else { "" });
    for (i, m) in monitors.iter().enumerate() {
        let scale = m.scale_factor();
        let (p, s) = (m.position(), m.size());
        let built = WebviewWindowBuilder::new(app, format!("{PREFIX}{i}"), WebviewUrl::App(url.clone().into()))
            .title("Nook gizlilik kalkanı")
            .position(p.x as f64 / scale, p.y as f64 / scale)
            .inner_size(s.width as f64 / scale, s.height as f64 / scale)
            .decorations(false)
            .resizable(false)
            .shadow(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .focused(i == 0)
            .visible(true)
            .build();
        match built {
            // Ölçek farklı ekranlarda mantıksal boyut kayabilir: fiziksel olarak tam otur
            Ok(w) => {
                let _ = w.set_position(*p);
                let _ = w.set_size(*s);
            }
            Err(e) => crate::log::write("warn", &format!("kalkan penceresi: {e}")),
        }
    }
    crate::log::write("info", &format!("gizlilik kalkanı açıldı ({} ekran, kilit {locked})", monitors.len()));
}

fn close(app: &AppHandle) {
    app.state::<Arc<Shared>>().locked.store(false, Ordering::Relaxed);
    restore_mic(app);
    for label in open_labels(app) {
        if let Some(w) = app.get_webview_window(&label) {
            let _ = w.close();
        }
    }
}

/// Kalkan mikrofonu kapattıysa geri aç; ada "mikrofon açıldı" rozetini gösterir
fn restore_mic(app: &AppHandle) {
    if !MIC_RESTORE.swap(false, Ordering::Relaxed) {
        return;
    }
    let app = app.clone();
    std::thread::spawn(move || {
        if crate::quick::set_mic_muted(false).is_ok() {
            let _ = app.emit("nook://shield-mic", false);
        }
    });
}

/// Kalkan penceresi kapanmak üzere: kilitliyken (Alt+F4) engellenir. Hepsi kapandıysa kilit ve
/// mikrofon eski hâline döner (pencere başka yoldan kapandıysa ada kilitli kalmasın).
pub fn on_window_event(win: &tauri::Window, event: &tauri::WindowEvent) {
    if !win.label().starts_with(PREFIX) {
        return;
    }
    let app = win.app_handle();
    match event {
        tauri::WindowEvent::CloseRequested { api, .. } if app.state::<Arc<Shared>>().locked.load(Ordering::Relaxed) => api.prevent_close(),
        tauri::WindowEvent::Destroyed => {
            let left = open_labels(app).into_iter().filter(|l| l != win.label()).count();
            if left == 0 {
                app.state::<Arc<Shared>>().locked.store(false, Ordering::Relaxed);
                restore_mic(app);
            }
        }
        _ => {}
    }
}

/// Kalkanın kendisinden kapatma: Esc, çift tık ya da (kilitliyse) doğru parola
#[tauri::command]
pub fn shield_off(app: AppHandle) {
    let app2 = app.clone();
    let _ = app.run_on_main_thread(move || close(&app2));
}

/// Kalkanı aç (açık değilse). `ask`: parola kutusu hemen görünsün — bilgisayar açılışında kilit.
#[tauri::command]
pub fn shield_on(app: AppHandle, ask: bool) {
    let app2 = app.clone();
    let _ = app.run_on_main_thread(move || {
        if open_labels(&app2).is_empty() {
            open(&app2, ask);
        }
    });
}

/// Bilgisayarın açık kaldığı süre (sn) — Nook'un açılışla mı başladığını anlamak için
#[tauri::command]
pub fn system_uptime() -> u64 {
    #[cfg(windows)]
    unsafe {
        windows_sys::Win32::System::SystemInformation::GetTickCount64() / 1000
    }
    #[cfg(not(windows))]
    0
}
