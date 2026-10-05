//! Gizlilik kalkanı: kısayola basınca her ekranı en üstte duran, ekranı tamamen kaplayan bir
//! pencere örter (içinde uyuyan Nook'lar). Tekrar basınca, Esc'e ya da çift tıklayınca kalkar.

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

pub const PREFIX: &str = "shield-";

fn open_labels(app: &AppHandle) -> Vec<String> {
    app.webview_windows().into_keys().filter(|l| l.starts_with(PREFIX)).collect()
}

/// Açıksa kapat, kapalıysa bütün ekranlarda aç.
pub fn toggle(app: &AppHandle) {
    let app2 = app.clone();
    let _ = app.run_on_main_thread(move || {
        if open_labels(&app2).is_empty() {
            open(&app2);
        } else {
            close(&app2);
        }
    });
}

fn open(app: &AppHandle) {
    let monitors = app.available_monitors().unwrap_or_default();
    for (i, m) in monitors.iter().enumerate() {
        let scale = m.scale_factor();
        let (p, s) = (m.position(), m.size());
        let built = WebviewWindowBuilder::new(app, format!("{PREFIX}{i}"), WebviewUrl::App("index.html".into()))
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
    crate::log::write("info", &format!("gizlilik kalkanı açıldı ({} ekran)", monitors.len()));
}

fn close(app: &AppHandle) {
    for label in open_labels(app) {
        if let Some(w) = app.get_webview_window(&label) {
            let _ = w.close();
        }
    }
}

/// Kalkanın kendisinden (Esc, çift tık) kapatma
#[tauri::command]
pub fn shield_off(app: AppHandle) {
    let app2 = app.clone();
    let _ = app.run_on_main_thread(move || close(&app2));
}
