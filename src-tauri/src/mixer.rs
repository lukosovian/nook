//! Uygulama bazlı ses (Windows Ses Karıştırıcısı gibi): varsayılan çıkıştaki ses oturumları
//! uygulamaya göre toplanır; bir uygulamanın sesi değişince onun bütün oturumları (ör. tarayıcının
//! her sekmesi ayrı süreç) birlikte değişir.

use serde::Serialize;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppVolume {
    /// Uygulamanın anahtarı: exe yolu (küçük harf), sistem sesleri için "system"
    pub key: String,
    pub name: String,
    /// İkon için exe yolu
    pub path: Option<String>,
    pub volume: f32,
    pub muted: bool,
    /// Şu an ses çalıyor mu
    pub active: bool,
}

#[tauri::command]
pub async fn mixer_list() -> Vec<AppVolume> {
    #[cfg(windows)]
    return imp::list().unwrap_or_default();
    #[cfg(not(windows))]
    Vec::new()
}

#[tauri::command]
pub async fn mixer_set(
    key: String,
    volume: Option<f32>,
    muted: Option<bool>,
) -> Result<(), String> {
    #[cfg(windows)]
    return imp::set(&key, volume, muted).map_err(|e| e.to_string());
    #[cfg(not(windows))]
    {
        let _ = (key, volume, muted);
        Ok(())
    }
}

#[cfg(windows)]
mod imp {
    use super::*;
    use std::collections::BTreeMap;
    use windows::core::{Interface, PWSTR};
    use windows::Win32::Foundation::{CloseHandle, S_OK};
    use windows::Win32::Media::Audio::{
        eRender, AudioSessionStateActive, AudioSessionStateExpired, IAudioSessionControl2,
        IAudioSessionManager2, IMMDeviceEnumerator, ISimpleAudioVolume, MMDeviceEnumerator,
        DEVICE_STATE_ACTIVE,
    };
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED,
    };
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };

    struct Session {
        key: String,
        path: Option<String>,
        display: String,
        volume: ISimpleAudioVolume,
        active: bool,
    }

    fn exe_path(pid: u32) -> Option<String> {
        unsafe {
            let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
            let mut buf = [0u16; 520];
            let mut len = buf.len() as u32;
            let ok = QueryFullProcessImageNameW(
                h,
                PROCESS_NAME_WIN32,
                PWSTR(buf.as_mut_ptr()),
                &mut len,
            )
            .is_ok();
            let _ = CloseHandle(h);
            ok.then(|| String::from_utf16_lossy(&buf[..len as usize]))
        }
    }

    /// "C:\...\Spotify.exe" → "Spotify"; bilinen birkaç uygulamaya düzgün ad
    fn pretty(path: &str) -> String {
        let stem = path.rsplit(['\\', '/']).next().unwrap_or(path);
        let stem = stem
            .strip_suffix(".exe")
            .or_else(|| stem.strip_suffix(".EXE"))
            .unwrap_or(stem);
        let known = [
            ("chrome", "Chrome"),
            ("msedge", "Edge"),
            ("msedgewebview2", "Edge WebView"),
            ("firefox", "Firefox"),
            ("opera", "Opera"),
            ("brave", "Brave"),
            ("spotify", "Spotify"),
            ("discord", "Discord"),
            ("ms-teams", "Teams"),
            ("steam", "Steam"),
            ("steamwebhelper", "Steam"),
            ("epicgameslauncher", "Epic Games"),
            ("vlc", "VLC"),
            ("nook", "Nook"),
        ];
        let lower = stem.to_lowercase();
        if let Some((_, n)) = known.iter().find(|(k, _)| *k == lower) {
            return (*n).to_string();
        }
        let cut = [
            "-Win64-Shipping",
            "-Win32-Shipping",
            "Client-Win64-Shipping",
            "_x64",
            "64",
        ]
        .iter()
        .fold(stem.to_string(), |s, suf| {
            s.strip_suffix(suf).map(str::to_string).unwrap_or(s)
        });
        let base = if cut.is_empty() {
            stem.to_string()
        } else {
            cut
        };
        let mut c = base.chars();
        match c.next() {
            Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
            None => base,
        }
    }

    fn sessions() -> windows::core::Result<Vec<Session>> {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            let en: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
            // Windows Ses Karıştırıcısı gibi bütün etkin çıkışlar (uygulama başka cihaza çalıyor olabilir)
            let devices = en.EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE)?;
            let mut out = Vec::new();
            for d in 0..devices.GetCount()? {
                let Ok(dev) = devices.Item(d) else { continue };
                let Ok(mgr) = dev.Activate::<IAudioSessionManager2>(CLSCTX_ALL, None) else {
                    continue;
                };
                let Ok(list) = mgr.GetSessionEnumerator() else {
                    continue;
                };
                for i in 0..list.GetCount()? {
                    let Ok(ctl) = list.GetSession(i) else {
                        continue;
                    };
                    let state = ctl.GetState().unwrap_or(AudioSessionStateExpired);
                    if state == AudioSessionStateExpired {
                        continue;
                    }
                    let Ok(c2) = ctl.cast::<IAudioSessionControl2>() else {
                        continue;
                    };
                    let Ok(volume) = ctl.cast::<ISimpleAudioVolume>() else {
                        continue;
                    };
                    let system = c2.IsSystemSoundsSession() == S_OK;
                    let pid = c2.GetProcessId().unwrap_or(0);
                    let path = if system || pid == 0 {
                        None
                    } else {
                        exe_path(pid)
                    };
                    let display = ctl
                        .GetDisplayName()
                        .ok()
                        .and_then(|p| p.to_string().ok())
                        .filter(|s| !s.is_empty() && !s.starts_with('@'))
                        .unwrap_or_default();
                    let key = if system {
                        "system".to_string()
                    } else {
                        path.as_deref()
                            .map(str::to_lowercase)
                            .unwrap_or_else(|| format!("pid:{pid}"))
                    };
                    out.push(Session {
                        key,
                        path,
                        display,
                        volume,
                        active: state == AudioSessionStateActive,
                    });
                }
            }
            Ok(out)
        }
    }

    pub fn list() -> windows::core::Result<Vec<AppVolume>> {
        let mut apps: BTreeMap<String, AppVolume> = BTreeMap::new();
        for s in sessions()? {
            let (volume, muted) = unsafe {
                (
                    s.volume.GetMasterVolume().unwrap_or(1.0),
                    s.volume.GetMute().map(|b| b.as_bool()).unwrap_or(false),
                )
            };
            let name = if s.key == "system" {
                "Sistem sesleri".to_string()
            } else if let Some(p) = &s.path {
                pretty(p)
            } else if !s.display.is_empty() {
                s.display.clone()
            } else {
                continue;
            };
            let e = apps.entry(s.key.clone()).or_insert(AppVolume {
                key: s.key.clone(),
                name,
                path: s.path.clone(),
                volume,
                muted,
                active: false,
            });
            e.active |= s.active;
            // Birden çok oturum: en yüksek seviye görünsün
            e.volume = e.volume.max(volume);
        }
        let mut v: Vec<_> = apps.into_values().collect();
        // Çalanlar önce, sistem sesleri en sonda
        v.sort_by(|a, b| {
            (a.key == "system")
                .cmp(&(b.key == "system"))
                .then(b.active.cmp(&a.active))
                .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });
        Ok(v)
    }

    pub fn set(key: &str, volume: Option<f32>, muted: Option<bool>) -> windows::core::Result<()> {
        for s in sessions()?.into_iter().filter(|s| s.key == key) {
            unsafe {
                if let Some(v) = volume {
                    let _ = s
                        .volume
                        .SetMasterVolume(v.clamp(0.0, 1.0), std::ptr::null());
                }
                if let Some(m) = muted {
                    let _ = s.volume.SetMute(m, std::ptr::null());
                }
            }
        }
        Ok(())
    }
}
