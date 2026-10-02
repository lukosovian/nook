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
}

#[tauri::command]
pub async fn quick_state() -> QuickState {
    QuickState {
        wifi: imp::radio(imp::Kind::WiFi),
        bluetooth: imp::radio(imp::Kind::Bluetooth),
        dark: imp::dark_mode(),
        muted: imp::endpoint_muted(false),
        mic_muted: imp::endpoint_muted(true),
    }
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
    use windows::Devices::Radios::{Radio, RadioKind, RadioState};
    use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
    use windows::Win32::Media::Audio::{eCapture, eConsole, eRender, IMMDeviceEnumerator, MMDeviceEnumerator};
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED};
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
        r.SetStateAsync(if on { RadioState::On } else { RadioState::Off })
            .and_then(|op| op.join())
            .map(|_| ())
            .map_err(|e| e.to_string())
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
    pub fn endpoint_muted(_c: bool) -> Option<bool> {
        None
    }
    pub fn set_endpoint_muted(_c: bool, _m: bool) -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
    pub fn lock() -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
    pub fn screen_off() -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
}
