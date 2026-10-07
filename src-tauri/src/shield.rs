//! Gizlilik kalkanı: kısayola basınca her ekranı en üstte duran, ekranı tamamen kaplayan bir
//! pencere örter (içinde uyuyan Nook'lar). Tekrar basınca, Esc'e ya da çift tıklayınca kalkar.
//! Parola kilidi açıksa kalkan yalnızca parolayla kalkar (doğrulama kalkanın sayfasında yapılır);
//! kısayol o sırada parola kutusunu açar. Kilitliyken adalar ve yan kartlar etkileşime kapanır.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::state::Shared;

pub const PREFIX: &str = "shield-";

/// Kalkanın kapattığı mikrofonlar (cihaz kimlikleri): kalkan kalkınca yalnızca bunlar açılır,
/// zaten kapalı olanlara dokunulmaz
static MICS: Mutex<Vec<String>> = Mutex::new(Vec::new());
/// Görüşmedeyken seviyesi 0'a indirilen mikrofonlar ve eski seviyeleri. Görüşmede cihaz susturulmaz:
/// Teams gibi uygulamalar cihaz susunca kendi düğmesini de kapatıp cihaz açılınca geri açmıyor.
static LEVELS: Mutex<Vec<(String, f32)>> = Mutex::new(Vec::new());
/// Görüşmedeki (mikrofonu kullanan) uygulamaların kalkanın kapattığı sesleri — kalkınca açılır
static CALL_MUTED: Mutex<Vec<String>> = Mutex::new(Vec::new());
/// Kalkan açılıyor (ses işleri arka planda, pencereler henüz yok): ikinci kez açılmasın
static OPENING: AtomicBool = AtomicBool::new(false);

/// Mikrofonu kullanan uygulamalar (küçük harf adlar)
fn mic_users() -> Vec<String> {
    crate::privacy::mic_apps().into_iter().map(|n| n.to_lowercase()).filter(|n| !n.is_empty()).collect()
}

/// Ses oturumu bu uygulamalardan birine mi ait: masaüstü uygulaması exe adıyla, mağaza uygulaması
/// paket adı yolun içinde geçtiği için
fn belongs(app: &crate::mixer::AppVolume, users: &[String]) -> bool {
    if app.key == "system" {
        return false;
    }
    let path = app.path.as_deref().unwrap_or("").to_lowercase();
    let stem = path.rsplit(['\\', '/']).next().unwrap_or("").trim_end_matches(".exe").to_string();
    users.iter().any(|u| stem == *u || path.contains(u.as_str()) || app.name.to_lowercase() == *u)
}

/// Mikrofonu sustur. Görüşmedeysen (bir uygulama mikrofonu kullanıyorsa) mikrofonların seviyesi 0'a
/// iner ve kalkan boyunca orada tutulur; görüşme yoksa mikrofonlar susturulur.
fn mute_mic() {
    if mic_users().is_empty() {
        let ids = crate::quick::mute_mics();
        let mut mics = MICS.lock().unwrap();
        for id in ids {
            if !mics.contains(&id) {
                mics.push(id);
            }
        }
        return;
    }
    let zeroed = crate::quick::zero_mics();
    if zeroed.is_empty() {
        return;
    }
    let start = {
        let mut levels = LEVELS.lock().unwrap();
        let first = levels.is_empty();
        for (id, l) in zeroed {
            if !levels.iter().any(|(i, _)| *i == id) {
                levels.push((id, l));
            }
        }
        first
    };
    // Görüşme uygulaması seviyeyi kendisi yükseltirse yeniden indir (kalkan kalkınca liste boşalır, döngü biter)
    if start {
        std::thread::spawn(|| loop {
            std::thread::sleep(std::time::Duration::from_millis(400));
            let ids: Vec<String> = LEVELS.lock().unwrap().iter().map(|(i, _)| i.clone()).collect();
            if ids.is_empty() {
                break;
            }
            if crate::quick::keep_zero(&ids) {
                crate::log::write("info", "kalkan: mikrofon seviyesi yükselmişti, yeniden 0");
            }
        });
    }
}

/// Kalkanın kapattığı mikrofonları geri aç; açılan oldu mu
fn unmute_mic() -> bool {
    let levels = std::mem::take(&mut *LEVELS.lock().unwrap());
    let ids = std::mem::take(&mut *MICS.lock().unwrap());
    let mut opened = false;
    if !levels.is_empty() && crate::quick::restore_levels(&levels) {
        opened = true;
    }
    if !ids.is_empty() && crate::quick::unmute_mics(&ids) {
        opened = true;
    }
    opened
}

fn mic_off() -> bool {
    !MICS.lock().unwrap().is_empty() || !LEVELS.lock().unwrap().is_empty()
}

/// Mikrofonu kullanan uygulamaların hoparlör sesini kapat (görüşmedeki karşı tarafın sesi).
/// Zaten sessizdekilere dokunulmaz; kapatılanlar hatırlanır.
fn mute_calls() {
    let users = mic_users();
    if users.is_empty() {
        return;
    }
    let mut muted = CALL_MUTED.lock().unwrap();
    for app in crate::mixer::apps() {
        if !app.muted && belongs(&app, &users) && !muted.contains(&app.key) {
            crate::mixer::set_muted(&app.key, true);
            muted.push(app.key.clone());
        }
    }
}

fn unmute_calls() {
    let keys = std::mem::take(&mut *CALL_MUTED.lock().unwrap());
    for k in keys {
        crate::mixer::set_muted(&k, false);
        crate::log::write("info", &format!("kalkan: görüşme sesi geri açıldı ({k})"));
    }
}

/// Kalkandaki düğmelerin durumu: mikrofon / görüşme sesi kalkanca kapalı mı, görüşme var mı
#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MuteState {
    mic: bool,
    call: bool,
    call_avail: bool,
}

fn state() -> MuteState {
    let call = !CALL_MUTED.lock().unwrap().is_empty();
    MuteState { mic: mic_off(), call, call_avail: call || !mic_users().is_empty() }
}

const NO_STATE: MuteState = MuteState { mic: false, call: false, call_avail: false };

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
        if OPENING.load(Ordering::Relaxed) {
            return;
        }
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
    if OPENING.swap(true, Ordering::Relaxed) {
        return;
    }
    // Açılış kilidi her zaman kilitlidir (ayarlar Rust'a henüz ulaşmamış olabilir)
    let locked = ask_now || lock_on(app);
    // Çalan medya duraklar (beklemeden, ayrı iş parçacığında)
    std::thread::spawn(|| {
        if crate::media::pause_all() {
            crate::log::write("info", "kalkan: medya duraklatıldı");
        }
    });
    // Ayarlara göre mikrofon susar, görüşmedeysen karşı tarafın sesi de kapanır. COM çağrıları ayrı
    // iş parçacığında ve ana iş parçacığı BEKLEMEZ: ses aygıtı yanıt vermezse (bilgisayar yeni açılmışken)
    // ana iş parçacığı kilitlenip bütün uygulama donuyordu. En fazla MUTE_WAIT beklenir, sonra pencereler
    // yine açılır (ses işi arkada sürer).
    let set = app.state::<Arc<Shared>>().settings();
    let app2 = app.clone();
    std::thread::spawn(move || {
        let (tx, rx) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            if set.shield_mute_calls {
                mute_calls();
            }
            if set.shield_mute_mic {
                mute_mic();
            }
            let _ = tx.send(state());
        });
        let s = rx.recv_timeout(MUTE_WAIT).unwrap_or_else(|_| {
            crate::log::write("warn", "kalkan: ses aygıtı yanıt vermedi, kalkan beklemeden açılıyor");
            NO_STATE
        });
        let app3 = app2.clone();
        let run = app2.run_on_main_thread(move || {
            app3.state::<Arc<Shared>>().locked.store(locked, Ordering::Relaxed);
            build(&app3, ask_now, s.mic, s.call);
            OPENING.store(false, Ordering::Relaxed);
        });
        if run.is_err() {
            OPENING.store(false, Ordering::Relaxed);
        }
    });
}

/// Ses aygıtı işleri için en fazla bu kadar beklenir
const MUTE_WAIT: std::time::Duration = std::time::Duration::from_millis(1500);

/// Kalkan pencerelerini her ekranda aç (ana iş parçacığında)
fn build(app: &AppHandle, ask_now: bool, mic_off: bool, call_off: bool) {
    let locked = app.state::<Arc<Shared>>().locked.load(Ordering::Relaxed);
    let monitors = app.available_monitors().unwrap_or_default();
    // Açılışta parola kutusu hemen görünsün mü (bilgisayar yeni açıldı); mikrofonu / görüşmeyi biz mi kapattık
    let url = format!("index.html?{}{}{}", if ask_now { "ask=1&" } else { "" }, if mic_off { "mic=1&" } else { "" }, if call_off { "call=1" } else { "" });
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
/// Geri açma beklenerek yapılır: kalkan hemen yeniden açılırsa mikrofon hâlâ "kapalı" görünüp
/// unutulmasın. COM çağrıları ana iş parçacığında değil, ayrı iş parçacığında.
fn restore_mic(app: &AppHandle) {
    // Ses aygıtı yanıt vermezse ana iş parçacığı en fazla MUTE_WAIT bekler (donmasın)
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        unmute_calls();
        let _ = tx.send(unmute_mic());
    });
    let opened = rx.recv_timeout(MUTE_WAIT).unwrap_or(false);
    if opened {
        let _ = app.emit("nook://shield-mic", false);
    }
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
        if open_labels(&app2).is_empty() && !OPENING.load(Ordering::Relaxed) {
            open(&app2, ask);
        }
    });
}

/// Kalkandaki mikrofon / hoparlör düğmelerinin durumu
#[tauri::command]
pub async fn shield_state() -> MuteState {
    tauri::async_runtime::spawn_blocking(state).await.unwrap_or(NO_STATE)
}

/// Kalkandaki düğmeden mikrofonu ya da görüşme sesini kapat / aç; bütün ekranlardaki kalkanlar
/// yeni durumu alır. `kind`: mic | call
#[tauri::command]
pub async fn shield_set(app: AppHandle, kind: String, muted: bool) -> MuteState {
    let s = tauri::async_runtime::spawn_blocking(move || {
        match (kind.as_str(), muted) {
            ("mic", true) => mute_mic(),
            ("mic", false) => {
                unmute_mic();
            }
            ("call", true) => mute_calls(),
            ("call", false) => unmute_calls(),
            _ => {}
        }
        state()
    })
    .await
    .unwrap_or(NO_STATE);
    let _ = app.emit("nook://shield-state", s.clone());
    s
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
