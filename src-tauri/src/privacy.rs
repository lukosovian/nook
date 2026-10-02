//! Mikrofon / kamera göstergesi (iPhone'daki turuncu/yeşil nokta gibi).
//! Windows, bir uygulama mikrofonu ya da kamerayı kullanırken bunu kayıt defterine yazar
//! (Ayarlar › Gizlilik'teki "son erişim" listesi): LastUsedTimeStop == 0 → şu an kullanılıyor.

use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

const POLL: Duration = Duration::from_secs(1);

#[derive(Clone, Serialize, PartialEq, Default)]
pub struct Privacy {
    mic: Vec<String>,
    camera: Vec<String>,
}

pub fn spawn(app: AppHandle) {
    thread::Builder::new()
        .name("nook-privacy".into())
        .spawn(move || {
            let mut prev = Privacy::default();
            let mut first = true;
            loop {
                let now = Privacy { mic: imp::in_use("microphone"), camera: imp::in_use("webcam") };
                if first || now != prev {
                    first = false;
                    let _ = app.emit("nook://privacy", &now);
                    prev = now;
                }
                thread::sleep(POLL);
            }
        })
        .expect("privacy thread başlatılamadı");
}

/// "C:#Program Files#Discord#app-1.0#Discord.exe" → "Discord"
/// "Microsoft.WindowsCamera_8wekyb3d8bbwe" → "WindowsCamera"
fn pretty(name: &str, non_packaged: bool) -> String {
    if non_packaged {
        let file = name.rsplit('#').next().unwrap_or(name);
        file.strip_suffix(".exe").or_else(|| file.strip_suffix(".EXE")).unwrap_or(file).to_owned()
    } else {
        let family = name.split('_').next().unwrap_or(name);
        family.rsplit('.').next().unwrap_or(family).to_owned()
    }
}

#[cfg(windows)]
mod imp {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    use super::pretty;

    const BASE: &str = r"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore";

    pub fn in_use(kind: &str) -> Vec<String> {
        let mut apps = Vec::new();
        let Ok(root) = RegKey::predef(HKEY_CURRENT_USER).open_subkey(format!(r"{BASE}\{kind}")) else {
            return apps;
        };
        scan(&root, false, &mut apps);
        if let Ok(np) = root.open_subkey("NonPackaged") {
            scan(&np, true, &mut apps);
        }
        apps.sort();
        apps.dedup();
        apps
    }

    fn scan(key: &RegKey, non_packaged: bool, out: &mut Vec<String>) {
        for name in key.enum_keys().flatten() {
            if name == "NonPackaged" {
                continue;
            }
            let Ok(sub) = key.open_subkey(&name) else { continue };
            let start: u64 = sub.get_value("LastUsedTimeStart").unwrap_or(0);
            let stop: u64 = sub.get_value("LastUsedTimeStop").unwrap_or(1);
            if start > 0 && stop == 0 {
                out.push(pretty(&name, non_packaged));
            }
        }
    }
}

#[cfg(not(windows))]
mod imp {
    pub fn in_use(_kind: &str) -> Vec<String> {
        Vec::new()
    }
}
