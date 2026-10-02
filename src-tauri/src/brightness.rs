//! Ekran parlaklığı değişimini WMI olayıyla dinler (yoklama yok, sıfır maliyet).
//! Yalnızca parlaklığı Windows'tan ayarlanabilen ekranlarda (dizüstü) çalışır;
//! harici masaüstü monitörlerinde olay hiç gelmez.

use std::thread;

use tauri::{AppHandle, Emitter};

pub fn spawn(app: AppHandle) {
    thread::Builder::new()
        .name("nook-brightness".into())
        .spawn(move || {
            #[cfg(windows)]
            imp::run(app);
            #[cfg(not(windows))]
            let _ = app;
        })
        .expect("brightness thread başlatılamadı");
}

#[cfg(windows)]
mod imp {
    use super::*;
    use serde::Deserialize;
    use wmi::WMIConnection;

    #[derive(Deserialize)]
    #[serde(rename = "WmiMonitorBrightnessEvent")]
    #[serde(rename_all = "PascalCase")]
    struct BrightnessEvent {
        brightness: u8,
    }

    pub fn run(app: AppHandle) {
        let Ok(wmi) = WMIConnection::with_namespace_path("ROOT\\WMI") else { return };
        let Ok(events) = wmi.notification::<BrightnessEvent>() else { return };
        for ev in events.flatten() {
            let _ = app.emit("nook://brightness", ev.brightness as f32 / 100.0);
        }
    }
}
