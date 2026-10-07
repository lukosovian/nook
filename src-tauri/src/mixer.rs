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
    /// Uygulamaya özel çıkış cihazı (yoksa Windows'un varsayılanı)
    pub output: Option<String>,
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

/// Uygulamayı belirli bir çıkışa yönlendir (id yoksa varsayılana döner)
#[tauri::command]
pub async fn mixer_output(key: String, id: Option<String>) -> Result<(), String> {
    #[cfg(windows)]
    return imp::set_output(&key, id.as_deref());
    #[cfg(not(windows))]
    {
        let _ = (key, id);
        Err("yalnızca Windows".into())
    }
}

/// Uygulamaların ses oturumları (Rust içinden: gizlilik kalkanı)
pub fn apps() -> Vec<AppVolume> {
    #[cfg(windows)]
    return imp::list().unwrap_or_default();
    #[cfg(not(windows))]
    Vec::new()
}

/// Bir uygulamanın bütün ses oturumlarını sessize al / aç
pub fn set_muted(key: &str, muted: bool) {
    #[cfg(windows)]
    let _ = imp::set(key, None, Some(muted));
    #[cfg(not(windows))]
    let _ = (key, muted);
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
        pid: u32,
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
                        pid,
                    });
                }
            }
            Ok(out)
        }
    }

    pub fn list() -> windows::core::Result<Vec<AppVolume>> {
        let mut apps: BTreeMap<String, AppVolume> = BTreeMap::new();
        let policy = route::factory();
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
                output: None,
            });
            if e.output.is_none() && s.pid != 0 && s.key != "system" {
                e.output = policy.as_ref().and_then(|f| route::get(f, s.pid));
            }
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

    pub fn set_output(key: &str, id: Option<&str>) -> Result<(), String> {
        let f = route::factory().ok_or("bu Windows sürümünde desteklenmiyor")?;
        let pids: Vec<u32> = sessions().map_err(|e| e.to_string())?.into_iter().filter(|s| s.key == key && s.pid != 0).map(|s| s.pid).collect();
        if pids.is_empty() {
            return Err("uygulama şu an ses çalmıyor".into());
        }
        for pid in pids {
            route::set(&f, pid, id)?;
        }
        Ok(())
    }

    /// Windows'un "Uygulama ses seçenekleri" sayfasının kullandığı (belgelenmemiş) arayüz:
    /// uygulamaya özel çıkışı kalıcı olarak kaydeder. EarTrumpet de bunu kullanır.
    #[allow(non_snake_case)]
    mod route {
        use core::ffi::c_void;
        use windows::core::{IUnknown, IUnknown_Vtbl, HRESULT, HSTRING};
        use windows::Win32::System::WinRT::RoGetActivationFactory;
        use windows_core::interface;

        #[interface("ab3d4648-e242-459f-b02f-541c70306324")]
        pub unsafe trait IAudioPolicyConfigFactory: IUnknown {
            // IInspectable
            fn GetIids(&self) -> HRESULT;
            fn GetRuntimeClassName(&self) -> HRESULT;
            fn GetTrustLevel(&self) -> HRESULT;
            // Yer tutucular (vtable sırası)
            fn add_CtxVolumeChange(&self) -> HRESULT;
            fn remove_CtxVolumeChanged(&self) -> HRESULT;
            fn add_RingerVibrateStateChanged(&self) -> HRESULT;
            fn remove_RingerVibrateStateChange(&self) -> HRESULT;
            fn SetVolumeGroupGainForId(&self) -> HRESULT;
            fn GetVolumeGroupGainForId(&self) -> HRESULT;
            fn GetActiveVolumeGroupForEndpointId(&self) -> HRESULT;
            fn GetVolumeGroupsForEndpoint(&self) -> HRESULT;
            fn GetCurrentVolumeContext(&self) -> HRESULT;
            fn SetVolumeGroupMuteForId(&self) -> HRESULT;
            fn GetVolumeGroupMuteForId(&self) -> HRESULT;
            fn SetRingerVibrateState(&self) -> HRESULT;
            fn GetRingerVibrateState(&self) -> HRESULT;
            fn SetPreferredChatApplication(&self) -> HRESULT;
            fn ResetPreferredChatApplication(&self) -> HRESULT;
            fn GetPreferredChatApplication(&self) -> HRESULT;
            fn GetCurrentChatApplications(&self) -> HRESULT;
            fn add_ChatContextChanged(&self) -> HRESULT;
            fn remove_ChatContextChanged(&self) -> HRESULT;
            fn SetPersistedDefaultAudioEndpoint(&self, pid: u32, flow: i32, role: i32, id: *mut c_void) -> HRESULT;
            fn GetPersistedDefaultAudioEndpoint(&self, pid: u32, flow: i32, role: i32, id: *mut *mut c_void) -> HRESULT;
            fn ClearAllPersistedApplicationDefaultEndpoints(&self) -> HRESULT;
        }

        const PREFIX: &str = r"\?\SWD#MMDEVAPI#";
        const RENDER: &str = "#{e6327cad-dcec-4949-ae8a-991e976a79d2}";

        pub fn factory() -> Option<IAudioPolicyConfigFactory> {
            let name = HSTRING::from("Windows.Media.Internal.AudioPolicyConfig");
            unsafe { RoGetActivationFactory::<IAudioPolicyConfigFactory>(&name).ok() }
        }

        pub fn get(f: &IAudioPolicyConfigFactory, pid: u32) -> Option<String> {
            unsafe {
                let mut raw: *mut c_void = std::ptr::null_mut();
                if f.GetPersistedDefaultAudioEndpoint(pid, 0, 1, &mut raw).is_err() || raw.is_null() {
                    return None;
                }
                let h: HSTRING = std::mem::transmute(raw);
                let s = h.to_string();
                let id = s.strip_prefix(PREFIX)?.strip_suffix(RENDER)?.to_string();
                (!id.is_empty()).then_some(id)
            }
        }

        pub fn set(f: &IAudioPolicyConfigFactory, pid: u32, id: Option<&str>) -> Result<(), String> {
            let full = id.map(|i| HSTRING::from(format!("{PREFIX}{i}{RENDER}")));
            let raw: *mut c_void = match &full {
                Some(h) => unsafe { std::mem::transmute_copy(h) },
                None => std::ptr::null_mut(),
            };
            // eConsole ve eMultimedia
            for role in [0, 1] {
                unsafe { f.SetPersistedDefaultAudioEndpoint(pid, 0, role, raw) }.ok().map_err(|e| e.to_string())?;
            }
            Ok(())
        }
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
