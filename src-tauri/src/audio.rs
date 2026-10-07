//! Ses izleyici (Core Audio):
//!  - Ana ses seviyesi / sessiz değişince → "nook://volume" (ada göstergesi)
//!  - Varsayılan çıkış cihazı değişince (kulaklık takıldı) → sistem olayı

use std::thread;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::system::emit_event;

const TICK: Duration = Duration::from_millis(50);
const DEVICE_POLL: Duration = Duration::from_secs(1);

#[derive(Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct Volume {
    value: f32,
    muted: bool,
}

pub fn spawn(app: AppHandle) {
    thread::Builder::new()
        .name("nook-audio".into())
        .spawn(move || {
            #[cfg(windows)]
            imp::run(app);
            #[cfg(not(windows))]
            let _ = app;
        })
        .expect("audio thread başlatılamadı");
}

/// Kulaklık gibi görünen cihaz adları (olay ikonunu seçmek için).
pub(crate) fn is_headphone(name: &str) -> bool {
    let n = name.to_lowercase();
    ["headphone", "headset", "kulaklık", "airpods", "buds", "earphone", "hands-free"].iter().any(|k| n.contains(k))
}

#[cfg(windows)]
mod imp {
    use super::*;
    use windows::Win32::Devices::FunctionDiscovery::PKEY_Device_FriendlyName;
    use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
    use windows::Win32::Media::Audio::{eConsole, eRender, IMMDevice, IMMDeviceEnumerator, MMDeviceEnumerator};
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoTaskMemFree, CLSCTX_ALL, COINIT_MULTITHREADED, STGM_READ};

    struct Endpoint {
        id: String,
        name: String,
        volume: IAudioEndpointVolume,
    }

    fn open(enumerator: &IMMDeviceEnumerator) -> windows::core::Result<Endpoint> {
        unsafe {
            let device: IMMDevice = enumerator.GetDefaultAudioEndpoint(eRender, eConsole)?;
            let raw = device.GetId()?;
            let id = raw.to_string().unwrap_or_default();
            CoTaskMemFree(Some(raw.0 as _));
            let name = device
                .OpenPropertyStore(STGM_READ)
                .and_then(|store| store.GetValue(&PKEY_Device_FriendlyName))
                .map(|v| v.to_string())
                .unwrap_or_default();
            Ok(Endpoint {
                id,
                name,
                volume: device.Activate(CLSCTX_ALL, None)?,
            })
        }
    }

    fn default_id(enumerator: &IMMDeviceEnumerator) -> Option<String> {
        unsafe {
            let device = enumerator.GetDefaultAudioEndpoint(eRender, eConsole).ok()?;
            let raw = device.GetId().ok()?;
            let id = raw.to_string().ok();
            CoTaskMemFree(Some(raw.0 as _));
            id
        }
    }

    pub fn run(app: AppHandle) {
        let enumerator: IMMDeviceEnumerator = unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            match CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) {
                Ok(e) => e,
                Err(_) => return,
            }
        };

        let mut endpoint = open(&enumerator).ok();
        let mut last_volume: Option<Volume> = None;
        let mut device_checked = Instant::now();

        loop {
            thread::sleep(TICK);

            if device_checked.elapsed() >= DEVICE_POLL {
                device_checked = Instant::now();
                let id = default_id(&enumerator);
                if id.as_deref() != endpoint.as_ref().map(|e| e.id.as_str()) {
                    let had_device = endpoint.is_some();
                    let was_headphone = endpoint.as_ref().is_some_and(|e| is_headphone(&e.name));
                    endpoint = open(&enumerator).ok();
                    last_volume = None; // yeni cihazın seviyesi için gösterge açılmasın
                    if let (true, Some(e)) = (had_device, &endpoint) {
                        // Kulaklık çıktı, ses hoparlöre geçti: ayarlıysa ses kısılır (ortalık birden çınlamasın)
                        let drop = {
                            use tauri::Manager;
                            app.state::<std::sync::Arc<crate::state::Shared>>().settings().headphone_drop
                        };
                        if was_headphone && !is_headphone(&e.name) && drop > 0 {
                            let level = drop.min(100) as f32 / 100.0;
                            let lowered = unsafe { e.volume.GetMasterVolumeLevelScalar().map(|v| v > level).unwrap_or(false) };
                            if lowered {
                                let _ = unsafe { e.volume.SetMasterVolumeLevelScalar(level, std::ptr::null()) };
                            }
                            let detail = if lowered { format!("{} · ses %{}", e.name, drop) } else { e.name.clone() };
                            emit_event(&app, "audio", "Kulaklık çıkarıldı", detail);
                        } else {
                            let title = if is_headphone(&e.name) { "Kulaklık bağlandı" } else { "Ses çıkışı değişti" };
                            emit_event(&app, "audio", title, e.name.clone());
                        }
                    }
                }
            }

            let Some(e) = &endpoint else { continue };
            unsafe {
                if let (Ok(value), Ok(muted)) = (e.volume.GetMasterVolumeLevelScalar(), e.volume.GetMute()) {
                    let now = Volume { value, muted: muted.as_bool() };
                    // İlk okuma yalnızca referans — açılışta gösterge çıkmasın.
                    if last_volume.as_ref().is_some_and(|v| *v != now) {
                        let _ = app.emit("nook://volume", &now);
                    }
                    last_volume = Some(now);
                }
            }
        }
    }
}
