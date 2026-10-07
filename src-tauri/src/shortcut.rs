//! Genel kısayollar (imlecin olduğu ekrandaki adada çalışır):
//!  - Hızlı arama (varsayılan Ctrl+Shift+Space)
//!  - Ekrana sor (Ctrl+Shift+A): ekran görüntüsü alınır, sohbet açılır, görüntü soruya eklenir
//!  - Sesli komut (Ctrl+Shift+D, basılı tut): bırakınca kayıt Gemini'ye gider
//!  - Rafa ekle (Ctrl+Alt+S): Gezgin'de seçili dosyalar rafa düşer
//!  - Düz metin yapıştır (Ctrl+Alt+V): panodaki biçim atılır, metin yapıştırılır
//!  - Ses çıkışı (isteğe bağlı): seçili çıkışlar arasında sırayla geçer

use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::focus;
use crate::imaging;
use crate::state::{Settings, Shared};
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
    Shelf,
    PlainPaste,
    Output,
    Live,
}

#[derive(Clone, Serialize)]
#[serde(tag = "phase", rename_all = "camelCase")]
enum VoiceEvent {
    Start,
    Done { audio: Option<String> },
    Error { message: String },
}

pub fn register(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let mut registered = REGISTERED.lock().unwrap();
    let list = [
        (settings.shortcut.as_str(), Role::Search),
        (settings.ask_shortcut.as_str(), Role::Ask),
        (settings.voice_shortcut.as_str(), Role::Voice),
        (settings.shield_shortcut.as_str(), Role::Shield),
        (settings.shelf_shortcut.as_str(), Role::Shelf),
        (settings.plain_paste_shortcut.as_str(), Role::PlainPaste),
        (settings.output_shortcut.as_str(), Role::Output),
        (settings.live_shortcut.as_str(), Role::Live),
    ];
    let wanted: Vec<String> = list.iter().map(|(s, _)| s.to_string()).collect();
    if *registered == wanted {
        return Ok(());
    }
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    registered.clear();

    let mut errors = Vec::new();
    let mut seen: Vec<String> = Vec::new();
    for (accel, role) in list {
        if accel.trim().is_empty() {
            continue;
        }
        // Aynı kısayol iki işe verildiyse yalnızca ilki çalışır
        let norm = accel.to_lowercase().replace(' ', "");
        if seen.contains(&norm) {
            errors.push(format!("{accel}: başka bir işte kullanılıyor"));
            continue;
        }
        seen.push(norm);
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
            (Role::Shelf, ShortcutState::Pressed) => shelf_add(app),
            // Tuşlar bırakılınca: basılı Alt/Shift yapıştırmaya karışmasın
            (Role::PlainPaste, ShortcutState::Released) => crate::clipboard::paste_plain(),
            (Role::Output, ShortcutState::Pressed) => crate::quick::cycle_output(app),
            (Role::Live, ShortcutState::Pressed) => {
                let _ = app.emit("nook://share-toggle", ());
            }
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
pub(crate) fn target(app: &AppHandle) -> String {
    let shared = app.state::<Arc<Shared>>().inner().clone();
    let monitors = app.available_monitors().unwrap_or_default();
    // Etiketleri önce kopyala: monitor_of aynı kilidi tekrar alır.
    let labels: Vec<String> = shared.windows.lock().unwrap().keys().filter(|l| l.starts_with(ISLAND)).cloned().collect();
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

/// Gezgin'de seçili dosyaları rafa ekle; seçim yoksa rafı aç
fn shelf_add(app: &AppHandle) {
    let app = app.clone();
    std::thread::spawn(move || {
        let paths = crate::shell::explorer_selection();
        crate::log::write("info", &format!("rafa ekle: {} öğe", paths.len()));
        let _ = app.emit_to(target(&app).as_str(), "nook://shelf-add", paths);
    });
}
