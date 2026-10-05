//! Genel kısayollar (imlecin olduğu ekrandaki adada çalışır):
//!  - Hızlı arama (varsayılan Ctrl+Shift+Space)
//!  - Ekrana sor (Ctrl+Shift+A): ekran görüntüsü alınır, sohbet açılır, görüntü soruya eklenir
//!  - Sesli komut (Ctrl+Shift+D, basılı tut): bırakınca kayıt Gemini'ye gider

use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::focus;
use crate::imaging;
use crate::state::Shared;
use crate::tracker::cursor_position;
use crate::voice;
use crate::window::{self, ISLAND};

/// Ayarlar art arda uygulanınca kayıtlar yarışmasın; aynı set tekrar kaydedilmesin.
static REGISTERED: Mutex<Vec<String>> = Mutex::new(Vec::new());

#[derive(Clone, Copy)]
enum Role {
    Search,
    Ask,
    Voice,
    Shield,
}

#[derive(Clone, Serialize)]
#[serde(tag = "phase", rename_all = "camelCase")]
enum VoiceEvent {
    Start,
    Done { audio: Option<String> },
    Error { message: String },
}

pub fn register(app: &AppHandle, search: &str, ask: &str, voice_key: &str, shield: &str) -> Result<(), String> {
    let mut registered = REGISTERED.lock().unwrap();
    let wanted: Vec<String> = [search, ask, voice_key, shield].iter().map(|s| s.to_string()).collect();
    if *registered == wanted {
        return Ok(());
    }
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    registered.clear();

    let mut errors = Vec::new();
    for (accel, role) in [(search, Role::Search), (ask, Role::Ask), (voice_key, Role::Voice), (shield, Role::Shield)] {
        if accel.trim().is_empty() {
            continue;
        }
        let res = gs.on_shortcut(accel, move |app, _shortcut, event| match (role, event.state()) {
            (Role::Search, ShortcutState::Pressed) => {
                if let Some(label) = open_island(app) {
                    let _ = app.emit_to(label.as_str(), "nook://search", ());
                }
            }
            (Role::Ask, ShortcutState::Pressed) => ask_screen(app),
            (Role::Voice, ShortcutState::Pressed) => {
                if voice::start(app) {
                    let _ = app.emit_to(target(app).as_str(), "nook://voice", VoiceEvent::Start);
                }
            }
            (Role::Voice, ShortcutState::Released) => finish_voice(app),
            (Role::Shield, ShortcutState::Pressed) => crate::shield::toggle(app),
            _ => {}
        });
        if let Err(e) = res {
            errors.push(format!("{accel}: {e}"));
        }
        crate::log::write("info", &format!("kısayol kaydı {accel}: {}", if errors.iter().any(|x| x.starts_with(accel)) { "HATA" } else { "tamam" }));
    }
    *registered = wanted;
    if errors.is_empty() {
        Ok(())
    } else {
        Err(format!("Kısayol kaydedilemedi ({})", errors.join(", ")))
    }
}

/// İmlecin olduğu ekrandaki adanın etiketi; yoksa ana ada.
fn target(app: &AppHandle) -> String {
    let shared = app.state::<Arc<Shared>>().inner().clone();
    let monitors = app.available_monitors().unwrap_or_default();
    // Etiketleri önce kopyala: monitor_of aynı kilidi tekrar alır.
    let labels: Vec<String> = shared.windows.lock().unwrap().keys().cloned().collect();
    cursor_position(app)
        .and_then(|(x, y)| window::monitor_at(&monitors, x, y))
        .and_then(|m| {
            labels
                .into_iter()
                .find(|l| window::monitor_of(&shared, l, &monitors).is_some_and(|wm| window::same_monitor(&wm, &m)))
        })
        .unwrap_or_else(|| ISLAND.to_owned())
}

/// Adayı tıklanabilir ve odakta yap (yazı yazılabilsin); etiketini döner.
fn open_island(app: &AppHandle) -> Option<String> {
    let shared = app.state::<Arc<Shared>>().inner().clone();
    focus::remember(&shared);
    let label = target(app);
    let win = app.get_webview_window(&label)?;
    shared.forced.lock().unwrap().insert(label.clone());
    let _ = win.set_ignore_cursor_events(false);
    let _ = win.set_focus();
    crate::log::write("info", &format!("ada açıldı: {label}"));
    Some(label)
}

/// Önce ekranın görüntüsü (ada henüz açılmadan), sonra ada açılır ve görüntü sohbete eklenir.
fn ask_screen(app: &AppHandle) {
    let app = app.clone();
    std::thread::spawn(move || {
        let shot = imaging::capture(1600);
        crate::log::write("info", &format!("ekrana sor: görüntü {}", match &shot { Ok(s) => format!("{} bayt", s.len()), Err(e) => e.clone() }));
        if let Some(label) = open_island(&app) {
            let _ = app.emit_to(label.as_str(), "nook://ask-screen", shot.ok());
        }
    });
}

fn finish_voice(app: &AppHandle) {
    let app = app.clone();
    std::thread::spawn(move || {
        let label = target(&app);
        let ev = match voice::stop() {
            Ok(audio) => VoiceEvent::Done { audio },
            Err(message) => VoiceEvent::Error { message },
        };
        let _ = app.emit_to(label.as_str(), "nook://voice", ev);
    });
}
