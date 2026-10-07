//! Hızlı ayarlar: Wi-Fi, Bluetooth, karanlık mod, ses/mikrofon sessiz, kilitle, ekranı kapat.

use serde::Serialize;

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct QuickState {
    /// None → bu bilgisayarda yok
    wifi: Option<bool>,
    bluetooth: Option<bool>,
    dark: bool,
    muted: Option<bool>,
    mic_muted: Option<bool>,
    /// Ana ses seviyesi 0–1
    volume: Option<f32>,
    /// Ses çıkış cihazları (kulaklık ↔ hoparlör geçişi)
    outputs: Vec<Output>,
    /// Mikrofonlar (varsayılanı seçmek için)
    inputs: Vec<Output>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Output {
    id: String,
    name: String,
    default: bool,
    headphone: bool,
}

#[tauri::command]
pub async fn quick_state() -> QuickState {
    QuickState {
        wifi: imp::radio(imp::Kind::WiFi),
        bluetooth: imp::radio(imp::Kind::Bluetooth),
        dark: imp::dark_mode(),
        muted: imp::endpoint_muted(false),
        mic_muted: imp::endpoint_muted(true),
        volume: imp::volume(),
        outputs: imp::outputs(),
        inputs: imp::inputs(),
    }
}

/// Varsayılan mikrofonu değiştirir (tüm roller)
#[tauri::command]
pub async fn quick_input(id: String) -> Result<(), String> {
    imp::set_input(&id)
}

/// Kısayol: seçili çıkışlar (boşsa hepsi) arasında sıradakine geç ve adada göster
pub fn cycle_output(app: &tauri::AppHandle) {
    use tauri::Manager;
    let want = app.state::<std::sync::Arc<crate::state::Shared>>().settings().output_cycle;
    let app = app.clone();
    std::thread::spawn(move || {
        let all = imp::outputs();
        let ring: Vec<&Output> = all.iter().filter(|o| want.is_empty() || want.contains(&o.id)).collect();
        if ring.len() < 2 {
            crate::system::emit_event(&app, "audio", "Geçilecek başka çıkış yok", "Ayarlar › Ses'ten çıkış seç");
            return;
        }
        let at = ring.iter().position(|o| o.default);
        let next = ring[at.map(|i| (i + 1) % ring.len()).unwrap_or(0)];
        match imp::set_output(&next.id) {
            // Olay kartını ses izleyicisi zaten gösterir (varsayılan çıkış değişti)
            Ok(()) => crate::log::write("info", &format!("çıkış kısayolu: {}", next.name)),
            Err(e) => crate::log::write("warn", &format!("çıkış kısayolu: {e}")),
        }
    });
}

/// Varsayılan ses çıkışını değiştirir (tüm roller: oyun, müzik, sesli görüşme).
#[tauri::command]
pub async fn quick_output(id: String) -> Result<(), String> {
    imp::set_output(&id)
}

/// Ana ses seviyesi (0–1). Sıfırdan büyükse sessiz de kaldırılır.
#[tauri::command]
pub async fn quick_volume(value: f32) -> Result<(), String> {
    imp::set_volume(value.clamp(0.0, 1.0))
}

/// key: wifi | bluetooth | dark | mute | mic
#[tauri::command]
pub async fn quick_set(key: String, on: bool) -> Result<(), String> {
    match key.as_str() {
        "wifi" => imp::set_radio(imp::Kind::WiFi, on),
        "bluetooth" => imp::set_radio(imp::Kind::Bluetooth, on),
        "dark" => imp::set_dark_mode(on),
        "mute" => imp::set_endpoint_muted(false, on),
        "mic" => imp::set_endpoint_muted(true, on),
        _ => Err("bilinmeyen ayar".into()),
    }
}

/// Gizlilik kalkanı: açık olan BÜTÜN mikrofonları (varsayılan, iletişim cihazı, kulaklık…) sessize alır,
/// kapattıklarının kimliğini döner. Teams gibi uygulamalar varsayılandan farklı bir "iletişim"
/// cihazı kullanabildiği için yalnızca varsayılanı kapatmak yetmez.
pub fn mute_mics() -> Vec<String> {
    let mut done = Vec::new();
    for (id, name, muted) in imp::captures() {
        if muted {
            continue;
        }
        match imp::set_capture_muted(&id, true) {
            Ok(()) => {
                crate::log::write("info", &format!("kalkan: mikrofon kapatıldı ({name})"));
                done.push(id);
            }
            Err(e) => crate::log::write("warn", &format!("kalkan: mikrofon kapatılamadı ({name}): {e}")),
        }
    }
    done
}

/// Gizlilik kalkanı, görüşmedeyken: açık mikrofonların seviyesini 0'a indirir (susturmaz), eski
/// seviyeleriyle döner. Teams gibi uygulamalar cihaz susturulunca kendi düğmesini de kapatıp cihaz
/// açılınca geri açmıyor; seviye değişince buna dokunmuyorlar.
pub fn zero_mics() -> Vec<(String, f32)> {
    let mut done = Vec::new();
    for (id, name, muted) in imp::captures() {
        if muted {
            continue;
        }
        let Some(level) = imp::capture_level(&id) else { continue };
        match imp::set_capture_level(&id, 0.0) {
            Ok(()) => {
                crate::log::write("info", &format!("kalkan: görüşmede mikrofon seviyesi 0 ({name}, önce {:.0}%)", level * 100.0));
                done.push((id, level));
            }
            Err(e) => crate::log::write("warn", &format!("kalkan: mikrofon seviyesi indirilemedi ({name}): {e}")),
        }
    }
    done
}

/// Seviyesi 0'dan yukarı çıkmış mikrofonu yeniden 0'a indir (görüşme uygulaması seviyeyi kendisi
/// ayarlıyor olabilir); indirilen oldu mu
pub fn keep_zero(ids: &[String]) -> bool {
    let mut any = false;
    for id in ids {
        if imp::capture_level(id).is_some_and(|l| l > 0.001) {
            let _ = imp::set_capture_level(id, 0.0);
            any = true;
        }
    }
    any
}

/// Seviyesi indirilen mikrofonları eski seviyelerine döndür
pub fn restore_levels(levels: &[(String, f32)]) -> bool {
    let mut all = true;
    for (id, level) in levels {
        let ok = imp::set_capture_level(id, *level).is_ok();
        crate::log::write(if ok { "info" } else { "warn" }, &format!("kalkan: mikrofon seviyesi geri geldi mi: {ok} ({:.0}%)", level * 100.0));
        all &= ok;
    }
    all
}

/// Kalkanın kapattığı mikrofonları geri açar; açıldığını doğrular, tutmadıysa birkaç kez yeniden dener.
pub fn unmute_mics(ids: &[String]) -> bool {
    let mut all = true;
    for id in ids {
        let mut ok = false;
        for _ in 0..4 {
            let _ = imp::set_capture_muted(id, false);
            if imp::capture_muted(id) == Some(false) {
                ok = true;
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(150));
        }
        crate::log::write(if ok { "info" } else { "warn" }, &format!("kalkan: mikrofon geri açıldı mı: {ok} ({id})"));
        all &= ok;
    }
    all
}

/// action: lock | screen-off
#[tauri::command]
pub fn quick_action(action: String) -> Result<(), String> {
    match action.as_str() {
        "lock" => imp::lock(),
        "screen-off" => imp::screen_off(),
        _ => Err("bilinmeyen işlem".into()),
    }
}

#[cfg(windows)]
mod imp {
    use windows::Devices::Radios::{Radio, RadioAccessStatus, RadioKind, RadioState};
    use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
    use windows::core::{GUID, PCWSTR};
    use windows::Win32::Devices::FunctionDiscovery::PKEY_Device_FriendlyName;
    use windows::Win32::Media::Audio::{
        eCapture, eCommunications, eConsole, eMultimedia, eRender, IMMDeviceEnumerator, MMDeviceEnumerator, DEVICE_STATE_ACTIVE,
    };
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoTaskMemFree, CLSCTX_ALL, COINIT_MULTITHREADED, STGM_READ};
    use winreg::enums::{HKEY_CURRENT_USER, KEY_READ, KEY_WRITE};
    use winreg::RegKey;

    pub enum Kind {
        WiFi,
        Bluetooth,
    }

    fn find(kind: &Kind) -> windows::core::Result<Option<Radio>> {
        let _ = Radio::RequestAccessAsync()?.join();
        let want = match kind {
            Kind::WiFi => RadioKind::WiFi,
            Kind::Bluetooth => RadioKind::Bluetooth,
        };
        let radios = Radio::GetRadiosAsync()?.join()?;
        for r in radios {
            if r.Kind()? == want {
                return Ok(Some(r));
            }
        }
        Ok(None)
    }

    pub fn radio(kind: Kind) -> Option<bool> {
        find(&kind).ok().flatten().and_then(|r| r.State().ok()).map(|s| s == RadioState::On)
    }

    pub fn set_radio(kind: Kind, on: bool) -> Result<(), String> {
        let r = find(&kind).map_err(|e| e.to_string())?.ok_or("bu bilgisayarda yok")?;
        let status = r
            .SetStateAsync(if on { RadioState::On } else { RadioState::Off })
            .and_then(|op| op.join())
            .map_err(|e| e.to_string())?;
        match status {
            RadioAccessStatus::Allowed => Ok(()),
            RadioAccessStatus::DeniedByUser => Err("Windows Ayarlar › Gizlilik › Radyolar'dan izin ver".into()),
            _ => Err("Windows izin vermedi".into()),
        }
    }

    const PERSONALIZE: &str = r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize";

    pub fn dark_mode() -> bool {
        RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey_with_flags(PERSONALIZE, KEY_READ)
            .and_then(|k| k.get_value::<u32, _>("AppsUseLightTheme"))
            .map(|v| v == 0)
            .unwrap_or(false)
    }

    pub fn set_dark_mode(dark: bool) -> Result<(), String> {
        let key = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey_with_flags(PERSONALIZE, KEY_READ | KEY_WRITE)
            .map_err(|e| e.to_string())?;
        let light = if dark { 0u32 } else { 1u32 };
        key.set_value("AppsUseLightTheme", &light).map_err(|e| e.to_string())?;
        key.set_value("SystemUsesLightTheme", &light).map_err(|e| e.to_string())?;
        // Açık pencerelere "tema değişti" haberi ver.
        unsafe {
            use windows_sys::Win32::UI::WindowsAndMessaging::{SendMessageTimeoutW, HWND_BROADCAST, SMTO_ABORTIFHUNG, WM_SETTINGCHANGE};
            let param: Vec<u16> = "ImmersiveColorSet".encode_utf16().chain(Some(0)).collect();
            SendMessageTimeoutW(HWND_BROADCAST, WM_SETTINGCHANGE, 0, param.as_ptr() as isize, SMTO_ABORTIFHUNG, 200, std::ptr::null_mut());
        }
        Ok(())
    }

    fn endpoint(capture: bool) -> windows::core::Result<IAudioEndpointVolume> {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            let e: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
            let d = e.GetDefaultAudioEndpoint(if capture { eCapture } else { eRender }, eConsole)?;
            d.Activate(CLSCTX_ALL, None)
        }
    }

    /// Etkin bütün mikrofonlar: (kimlik, ad, sessiz mi)
    pub fn captures() -> Vec<(String, String, bool)> {
        let Ok(e) = enumerator() else { return Vec::new() };
        unsafe {
            let Ok(list) = e.EnumAudioEndpoints(eCapture, DEVICE_STATE_ACTIVE) else { return Vec::new() };
            let count = list.GetCount().unwrap_or(0);
            (0..count)
                .filter_map(|i| {
                    let d = list.Item(i).ok()?;
                    let raw = d.GetId().ok()?;
                    let id = raw.to_string().unwrap_or_default();
                    CoTaskMemFree(Some(raw.0 as _));
                    let name = d.OpenPropertyStore(STGM_READ).and_then(|p| p.GetValue(&PKEY_Device_FriendlyName)).map(|v| v.to_string()).unwrap_or_default();
                    let v: IAudioEndpointVolume = d.Activate(CLSCTX_ALL, None).ok()?;
                    let muted = v.GetMute().ok()?.as_bool();
                    Some((id, name, muted))
                })
                .collect()
        }
    }

    fn capture_volume(id: &str) -> windows::core::Result<IAudioEndpointVolume> {
        let e = enumerator()?;
        let wide: Vec<u16> = id.encode_utf16().chain(Some(0)).collect();
        unsafe { e.GetDevice(PCWSTR(wide.as_ptr()))?.Activate(CLSCTX_ALL, None) }
    }

    pub fn capture_muted(id: &str) -> Option<bool> {
        unsafe { capture_volume(id).and_then(|v| v.GetMute()).ok().map(|b| b.as_bool()) }
    }

    pub fn set_capture_muted(id: &str, muted: bool) -> Result<(), String> {
        unsafe { capture_volume(id).and_then(|v| v.SetMute(muted, std::ptr::null())).map_err(|e| e.to_string()) }
    }

    pub fn capture_level(id: &str) -> Option<f32> {
        unsafe { capture_volume(id).and_then(|v| v.GetMasterVolumeLevelScalar()).ok() }
    }

    pub fn set_capture_level(id: &str, level: f32) -> Result<(), String> {
        unsafe { capture_volume(id).and_then(|v| v.SetMasterVolumeLevelScalar(level.clamp(0.0, 1.0), std::ptr::null())).map_err(|e| e.to_string()) }
    }

    pub fn endpoint_muted(capture: bool) -> Option<bool> {
        unsafe { endpoint(capture).and_then(|v| v.GetMute()).ok().map(|b| b.as_bool()) }
    }

    pub fn set_endpoint_muted(capture: bool, muted: bool) -> Result<(), String> {
        unsafe {
            endpoint(capture)
                .and_then(|v| v.SetMute(muted, std::ptr::null()))
                .map_err(|e| e.to_string())
        }
    }

    pub fn volume() -> Option<f32> {
        unsafe { endpoint(false).and_then(|v| v.GetMasterVolumeLevelScalar()).ok() }
    }

    pub fn set_volume(value: f32) -> Result<(), String> {
        unsafe {
            let v = endpoint(false).map_err(|e| e.to_string())?;
            v.SetMasterVolumeLevelScalar(value, std::ptr::null()).map_err(|e| e.to_string())?;
            if value > 0.0 {
                let _ = v.SetMute(false, std::ptr::null());
            }
            Ok(())
        }
    }

    fn enumerator() -> windows::core::Result<IMMDeviceEnumerator> {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
        }
    }

    pub fn outputs() -> Vec<super::Output> {
        devices(eRender)
    }

    pub fn inputs() -> Vec<super::Output> {
        devices(eCapture)
    }

    fn devices(flow: windows::Win32::Media::Audio::EDataFlow) -> Vec<super::Output> {
        let Ok(e) = enumerator() else { return Vec::new() };
        unsafe {
            let default = e.GetDefaultAudioEndpoint(flow, eConsole).and_then(|d| d.GetId()).ok().map(|raw| {
                let id = raw.to_string().unwrap_or_default();
                CoTaskMemFree(Some(raw.0 as _));
                id
            });
            let Ok(list) = e.EnumAudioEndpoints(flow, DEVICE_STATE_ACTIVE) else { return Vec::new() };
            let count = list.GetCount().unwrap_or(0);
            (0..count)
                .filter_map(|i| {
                    let d = list.Item(i).ok()?;
                    let raw = d.GetId().ok()?;
                    let id = raw.to_string().unwrap_or_default();
                    CoTaskMemFree(Some(raw.0 as _));
                    let name = d.OpenPropertyStore(STGM_READ).and_then(|p| p.GetValue(&PKEY_Device_FriendlyName)).map(|v| v.to_string()).unwrap_or_default();
                    Some(super::Output { default: default.as_deref() == Some(id.as_str()), headphone: crate::audio::is_headphone(&name), id, name })
                })
                .collect()
        }
    }

    /// Windows'un kendi ses ayarlarının kullandığı (belgelenmemiş ama yıllardır sabit) arayüz —
    /// EarTrumpet, SoundSwitch gibi uygulamalar da bunu kullanır. Yalnızca SetDefaultEndpoint çağrılır;
    /// öncekiler vtable sırası için yer tutucu.
    // Yöntem adları Windows'unkilerle aynı olmalı
    #[allow(non_snake_case)]
    mod policy {
        use windows::core::{IUnknown, IUnknown_Vtbl, HRESULT, PCWSTR};
        use windows_core::interface;

        #[interface("f8679f50-850a-41cf-9c72-430f290290c8")]
        pub unsafe trait IPolicyConfig: IUnknown {
            fn GetMixFormat(&self, id: PCWSTR, fmt: *mut *mut core::ffi::c_void) -> HRESULT;
            fn GetDeviceFormat(&self, id: PCWSTR, default: i32, fmt: *mut *mut core::ffi::c_void) -> HRESULT;
            fn ResetDeviceFormat(&self, id: PCWSTR) -> HRESULT;
            fn SetDeviceFormat(&self, id: PCWSTR, a: *mut core::ffi::c_void, b: *mut core::ffi::c_void) -> HRESULT;
            fn GetProcessingPeriod(&self, id: PCWSTR, default: i32, a: *mut i64, b: *mut i64) -> HRESULT;
            fn SetProcessingPeriod(&self, id: PCWSTR, a: *mut i64) -> HRESULT;
            fn GetShareMode(&self, id: PCWSTR, mode: *mut core::ffi::c_void) -> HRESULT;
            fn SetShareMode(&self, id: PCWSTR, mode: *mut core::ffi::c_void) -> HRESULT;
            fn GetPropertyValue(&self, id: PCWSTR, key: *const core::ffi::c_void, v: *mut core::ffi::c_void) -> HRESULT;
            fn SetPropertyValue(&self, id: PCWSTR, key: *const core::ffi::c_void, v: *mut core::ffi::c_void) -> HRESULT;
            fn SetDefaultEndpoint(&self, id: PCWSTR, role: i32) -> HRESULT;
            fn SetEndpointVisibility(&self, id: PCWSTR, visible: i32) -> HRESULT;
        }

        pub fn set_default(p: &IPolicyConfig, id: PCWSTR, role: i32) -> HRESULT {
            unsafe { p.SetDefaultEndpoint(id, role) }
        }
    }
    use policy::IPolicyConfig;

    const POLICY_CONFIG_CLIENT: GUID = GUID::from_u128(0x870af99c_171d_4f9e_af0d_e63df40c2bc9);

    pub fn set_output(id: &str) -> Result<(), String> {
        if !outputs().iter().any(|o| o.id == id) {
            return Err("ses cihazı bulunamadı".into());
        }
        set_default(id)
    }

    pub fn set_input(id: &str) -> Result<(), String> {
        if !inputs().iter().any(|o| o.id == id) {
            return Err("mikrofon bulunamadı".into());
        }
        set_default(id)
    }

    fn set_default(id: &str) -> Result<(), String> {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            let policy: IPolicyConfig = CoCreateInstance(&POLICY_CONFIG_CLIENT, None, CLSCTX_ALL).map_err(|e| e.to_string())?;
            let wide: Vec<u16> = id.encode_utf16().chain(Some(0)).collect();
            for role in [eConsole, eMultimedia, eCommunications] {
                policy::set_default(&policy, PCWSTR(wide.as_ptr()), role.0).ok().map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }

    pub fn lock() -> Result<(), String> {
        let ok = unsafe { windows_sys::Win32::System::Shutdown::LockWorkStation() };
        if ok == 0 {
            Err("kilitlenemedi".into())
        } else {
            Ok(())
        }
    }

    pub fn screen_off() -> Result<(), String> {
        use windows_sys::Win32::UI::WindowsAndMessaging::{PostMessageW, HWND_BROADCAST, SC_MONITORPOWER, WM_SYSCOMMAND};
        unsafe { PostMessageW(HWND_BROADCAST, WM_SYSCOMMAND, SC_MONITORPOWER as usize, 2) };
        Ok(())
    }
}

#[cfg(not(windows))]
mod imp {
    pub enum Kind {
        WiFi,
        Bluetooth,
    }
    pub fn radio(_k: Kind) -> Option<bool> {
        None
    }
    pub fn set_radio(_k: Kind, _on: bool) -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
    pub fn dark_mode() -> bool {
        false
    }
    pub fn set_dark_mode(_d: bool) -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
    pub fn captures() -> Vec<(String, String, bool)> {
        Vec::new()
    }
    pub fn capture_muted(_id: &str) -> Option<bool> {
        None
    }
    pub fn set_capture_muted(_id: &str, _m: bool) -> Result<(), String> {
        Ok(())
    }
    pub fn capture_level(_id: &str) -> Option<f32> {
        None
    }
    pub fn set_capture_level(_id: &str, _l: f32) -> Result<(), String> {
        Ok(())
    }
    pub fn endpoint_muted(_c: bool) -> Option<bool> {
        None
    }
    pub fn set_endpoint_muted(_c: bool, _m: bool) -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
    pub fn volume() -> Option<f32> {
        None
    }
    pub fn set_volume(_v: f32) -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
    pub fn outputs() -> Vec<super::Output> {
        Vec::new()
    }
    pub fn inputs() -> Vec<super::Output> {
        Vec::new()
    }
    pub fn set_output(_id: &str) -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
    pub fn set_input(_id: &str) -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
    pub fn lock() -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
    pub fn screen_off() -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
}
