//! Mikrofon / kamera göstergesi (iPhone'daki turuncu/yeşil nokta gibi).
//! Windows, bir uygulama mikrofonu ya da kamerayı kullanırken bunu kayıt defterine yazar
//! (Ayarlar › Gizlilik'teki "son erişim" listesi): LastUsedTimeStop == 0 → şu an kullanılıyor.

use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

/// Kayıt defteri izlenemezse bu aralıkla yoklanır
const POLL: Duration = Duration::from_secs(1);
/// İzlenirken de bu aralıkla bir kez bakılır (kaçan bir bildirim olursa)
const RESCAN: Duration = Duration::from_secs(15);

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
            // Windows kayıt defteri değişince haber verir: her saniye taramak yerine yalnızca değişince bakılır
            let watch = imp::Watch::new();
            loop {
                // Önce izleme kurulur, sonra okunur: arada olan değişiklik kaçmaz
                let armed = watch.as_ref().is_some_and(|w| w.arm());
                let now = Privacy { mic: imp::in_use("microphone"), camera: imp::in_use("webcam") };
                if first || now != prev {
                    first = false;
                    let _ = app.emit("nook://privacy", &now);
                    prev = now;
                }
                match &watch {
                    // Başlangıç ve bitiş değerleri art arda yazılır: kısa bir an bekleyip tek seferde oku
                    Some(w) if armed => {
                        if w.wait(RESCAN) {
                            thread::sleep(Duration::from_millis(80));
                        }
                    }
                    _ => thread::sleep(POLL),
                }
            }
        })
        .expect("privacy thread başlatılamadı");
}

/// Şu an mikrofonu kullanan uygulamalar (görüşmedeki uygulamayı bulmak için)
pub fn mic_apps() -> Vec<String> {
    imp::in_use("microphone")
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

/// Kayıt defterindeki yol ("C:#Users#…#nook.exe") bu uygulamanın kendisi mi
fn is_self(name: &str) -> bool {
    static EXE: std::sync::OnceLock<Option<std::path::PathBuf>> = std::sync::OnceLock::new();
    let Some(exe) = EXE.get_or_init(|| std::env::current_exe().ok()) else { return false };
    name.replace('#', "\\").eq_ignore_ascii_case(&exe.to_string_lossy())
}

#[cfg(windows)]
mod imp {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    use super::{is_self, pretty};

    const BASE: &str = r"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore";

    /// ConsentStore altındaki değişiklikleri (alt anahtarlar dahil) bir olayla bildiren izleyici
    pub struct Watch {
        key: RegKey,
        event: windows_sys::Win32::Foundation::HANDLE,
    }

    impl Watch {
        pub fn new() -> Option<Self> {
            let key = RegKey::predef(HKEY_CURRENT_USER).open_subkey(BASE).ok()?;
            let event = unsafe { windows_sys::Win32::System::Threading::CreateEventW(std::ptr::null(), 0, 0, std::ptr::null()) };
            (!event.is_null()).then_some(Self { key, event })
        }

        /// Sıradaki değişiklik için bildirimi kur (her bildirimden sonra yeniden kurulmalı)
        pub fn arm(&self) -> bool {
            use windows_sys::Win32::System::Registry::{RegNotifyChangeKeyValue, REG_NOTIFY_CHANGE_LAST_SET, REG_NOTIFY_CHANGE_NAME};
            unsafe { RegNotifyChangeKeyValue(self.key.raw_handle(), 1, REG_NOTIFY_CHANGE_LAST_SET | REG_NOTIFY_CHANGE_NAME, self.event, 1) == 0 }
        }

        /// Değişiklik olana ya da süre dolana dek bekle; değişiklik olduysa true
        pub fn wait(&self, timeout: std::time::Duration) -> bool {
            unsafe { windows_sys::Win32::System::Threading::WaitForSingleObject(self.event, timeout.as_millis() as u32) == 0 }
        }
    }

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
            // Nook'un kendisi ("Hey Nook", otomatik Hum mikrofonu dinler) sayılmaz: "mikrofonu kullanıyor" göstergesi
            // ve görüşme algılaması yalnızca başka uygulamalar içindir
            if non_packaged && is_self(&name) {
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

    pub struct Watch;

    impl Watch {
        pub fn new() -> Option<Self> {
            None
        }
        pub fn arm(&self) -> bool {
            false
        }
        pub fn wait(&self, _timeout: std::time::Duration) -> bool {
            false
        }
    }
}
