//! Telefondan PC'yi açma (Wake-on-LAN) hazırlığı: Ayarlar › Telefon'daki kontrol listesi.
//!
//! Windows tarafında üç şey gerekiyor: PC kabloyla bağlı olmalı, Hızlı Başlangıç kapalı olmalı (açıkken
//! "kapat" aslında yarı hazırda bekleme olur ve çoğu ağ kartı uyanmayı kurmaz), ağ kartı sihirli paketle
//! uyandırabilmeli. BIOS ayarı okunamaz; anakart markasına göre tarif gösterilir (ön yüzde).
//!
//! Düzeltme yönetici izni ister: Nook kendini UAC ile `wol-fix {GUID}` argümanıyla açar (betik yok,
//! doğrudan kayıt defteri + SetupAPI + powrprof). Ağ kartı ayarları sürücü yeniden başlayınca geçerli
//! olduğu için kart birkaç saniyeliğine kapatılıp açılır.

use serde::Serialize;

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WolStatus {
    /// İnternete çıkan ağ kartı
    adapter: Option<String>,
    /// Kablolu mu (Wi-Fi'deki PC kapalıyken çoğunlukla uyanmaz)
    wired: Option<bool>,
    /// Hızlı Başlangıç açık mı (açıkken kapalı PC uyanmayabilir)
    fast_startup: bool,
    /// Sürücüde "Wake on Magic Packet" açık mı; sürücü bu ayarı göstermiyorsa null
    magic_packet: Option<bool>,
    /// "Bu aygıt bilgisayarı uyandırabilir" işaretli mi; kart listede yoksa null
    wake_armed: Option<bool>,
    /// Anakart / bilgisayar üreticisi ve modeli
    vendor: Option<String>,
    model: Option<String>,
    /// Dizüstü (SMBIOS kasa tipi): BIOS menüleri farklı, kapalıyken uyanma çoğu modelde yalnızca prizdeyken
    laptop: bool,
    /// Modern Bekleme (S0): uyku aslında "bağlı bekleme"; ağdan uyanma bambaşka işler
    modern_standby: bool,
    /// Windows açılışta şifre sormadan giriş yapıyor (Nook ancak girişten sonra çalışır)
    auto_logon: bool,
}

#[cfg(windows)]
mod imp {
    use super::WolStatus;
    use std::os::windows::ffi::OsStrExt;
    use winreg::enums::*;
    use winreg::RegKey;

    const NET_CLASS: &str = r"SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}";
    const POWER: &str = r"SYSTEM\CurrentControlSet\Control\Session Manager\Power";
    /// Sürücülerin sihirli paketle / kapalıyken uyanma ayarları (Intel, Realtek, Killer…); hangisi varsa
    const WAKE_KEYS: [&str; 3] = ["*WakeOnMagicPacket", "S5WakeOnLan", "EnablePME"];

    fn wide(s: &str) -> Vec<u16> {
        std::ffi::OsStr::new(s).encode_wide().chain(Some(0)).collect()
    }

    fn hklm() -> RegKey {
        RegKey::predef(HKEY_LOCAL_MACHINE)
    }

    fn fast_startup() -> bool {
        let hiberboot = hklm().open_subkey(POWER).and_then(|k| k.get_value::<u32, _>("HiberbootEnabled")).unwrap_or(1);
        // Hazırda bekletme tamamen kapalıysa Hızlı Başlangıç da çalışmaz
        let hibernate = hklm().open_subkey(r"SYSTEM\CurrentControlSet\Control\Power").and_then(|k| k.get_value::<u32, _>("HibernateEnabled")).unwrap_or(1);
        hiberboot != 0 && hibernate != 0
    }

    /// Ağ kartının sürücü anahtarı (…\Class\{net}\0007) ve alt anahtar adı
    fn driver_key(guid: &str, write: bool) -> Option<(RegKey, String)> {
        let class = hklm().open_subkey(NET_CLASS).ok()?;
        for name in class.enum_keys().flatten() {
            let Ok(k) = class.open_subkey(&name) else { continue };
            let id: String = k.get_value("NetCfgInstanceId").unwrap_or_default();
            if id.eq_ignore_ascii_case(guid) {
                let k = if write { class.open_subkey_with_flags(&name, KEY_READ | KEY_WRITE).ok()? } else { k };
                return Some((k, name));
            }
        }
        None
    }

    fn magic_packet(guid: &str) -> Option<bool> {
        let (k, _) = driver_key(guid, false)?;
        let vals: Vec<String> = WAKE_KEYS.iter().filter_map(|n| k.get_value::<String, _>(n).ok()).collect();
        if vals.is_empty() {
            return None;
        }
        Some(vals.iter().all(|v| v.trim() != "0"))
    }

    /// powercfg /devicequery ile aynı liste: adlar (çift sıfırla biten UTF-16 dizisi)
    fn device_names(flags: u32) -> Vec<String> {
        use windows_sys::Win32::System::Power::*;
        let mut out = Vec::new();
        unsafe {
            if DevicePowerOpen(0) == 0 {
                return out;
            }
            let mut buf = vec![0u16; 1024];
            for i in 0..512 {
                let mut size = (buf.len() * 2) as u32;
                if DevicePowerEnumDevices(i, flags, 0, buf.as_mut_ptr().cast(), &mut size) == 0 {
                    break;
                }
                let end = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
                out.push(String::from_utf16_lossy(&buf[..end]));
            }
            DevicePowerClose();
        }
        out
    }

    fn wake_armed(desc: &str) -> Option<bool> {
        use windows_sys::Win32::System::Power::*;
        let base = DEVICEPOWER_FILTER_DEVICES_PRESENT | DEVICEPOWER_FILTER_HARDWARE;
        if !device_names(base | DEVICEPOWER_FILTER_WAKEPROGRAMMABLE).iter().any(|n| n.eq_ignore_ascii_case(desc)) {
            return None;
        }
        Some(device_names(base | DEVICEPOWER_FILTER_WAKEENABLED).iter().any(|n| n.eq_ignore_ascii_case(desc)))
    }

    fn board() -> (Option<String>, Option<String>) {
        let Ok(k) = hklm().open_subkey(r"HARDWARE\DESCRIPTION\System\BIOS") else { return (None, None) };
        let get = |n: &str| k.get_value::<String, _>(n).ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty() && !s.contains("To be filled") && !s.contains("Default string"));
        // Masaüstünde anakart, hazır PC'de (Dell, HP…) sistem üreticisi daha anlamlı
        let sys = get("SystemManufacturer");
        // Dizüstünde de üreticinin adı (ASUS, MSI… dizüstü BIOS'u masaüstü anakartınkinden farklı)
        let branded = laptop()
            || sys.as_deref().is_some_and(|s| ["dell", "hp", "hewlett", "lenovo", "acer", "fujitsu", "microsoft", "huawei", "samsung", "casper", "monster", "toshiba", "dynabook"].iter().any(|b| s.to_lowercase().contains(b)));
        if branded {
            (sys, get("SystemProductName"))
        } else {
            (get("BaseBoardManufacturer").or(sys), get("BaseBoardProduct"))
        }
    }

    /// SMBIOS'taki kasa tipi (tip 3 yapısı): 8-10, 14, 30-32 taşınabilir
    fn laptop() -> bool {
        use windows_sys::Win32::System::SystemInformation::GetSystemFirmwareTable;
        const RSMB: u32 = u32::from_be_bytes(*b"RSMB");
        let size = unsafe { GetSystemFirmwareTable(RSMB, 0, std::ptr::null_mut(), 0) };
        if size == 0 {
            return false;
        }
        let mut buf = vec![0u8; size as usize];
        if unsafe { GetSystemFirmwareTable(RSMB, 0, buf.as_mut_ptr().cast(), size) } != size {
            return false;
        }
        // RawSMBIOSData: 8 baytlık başlık, sonra yapılar (biçimli kısım + sıfır sıfırla biten metinler)
        let data = &buf[8.min(buf.len())..];
        let mut i = 0;
        while i + 4 <= data.len() {
            let (kind, len) = (data[i], data[i + 1] as usize);
            if len < 4 {
                break;
            }
            if kind == 3 && i + 5 < data.len() {
                return matches!(data[i + 5] & 0x7F, 8 | 9 | 10 | 14 | 30 | 31 | 32);
            }
            if kind == 127 {
                break;
            }
            let mut j = i + len;
            while j + 1 < data.len() && !(data[j] == 0 && data[j + 1] == 0) {
                j += 1;
            }
            i = j + 2;
        }
        false
    }

    fn modern_standby() -> bool {
        use windows_sys::Win32::System::Power::{GetPwrCapabilities, SYSTEM_POWER_CAPABILITIES};
        let mut caps: SYSTEM_POWER_CAPABILITIES = unsafe { std::mem::zeroed() };
        unsafe { GetPwrCapabilities(&mut caps) != 0 && caps.AoAc != 0 }
    }

    fn auto_logon() -> bool {
        hklm()
            .open_subkey(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon")
            .and_then(|k| k.get_value::<String, _>("AutoAdminLogon"))
            .is_ok_and(|v| v.trim() == "1")
    }

    pub fn status() -> WolStatus {
        let (vendor, model) = board();
        let mut s = WolStatus { fast_startup: fast_startup(), vendor, model, laptop: laptop(), modern_standby: modern_standby(), auto_logon: auto_logon(), ..Default::default() };
        if let Some(a) = crate::remote::primary_adapter() {
            s.wired = Some(a.wired);
            s.magic_packet = magic_packet(&a.guid);
            s.wake_armed = wake_armed(&a.description);
            s.adapter = Some(a.description);
        }
        s
    }

    /// Yönetici olarak açılmış Nook'ta çalışır (main.rs `wol-fix {GUID} {açıklama}`)
    pub fn fix_elevated(guid: &str, desc: &str) -> i32 {
        let mut ok = true;
        // 1) Hızlı Başlangıç kapalı
        ok &= hklm().open_subkey_with_flags(POWER, KEY_SET_VALUE).and_then(|k| k.set_value("HiberbootEnabled", &0u32)).is_ok();

        // 2) Sürücüde uyandırma ayarları açık; "güç tasarrufu için kapat" yasakları kalksın
        let mut changed = false;
        if let Some((k, sub)) = driver_key(guid, true) {
            for n in WAKE_KEYS {
                if k.get_value::<String, _>(n).is_ok_and(|v| v.trim() == "0") {
                    ok &= k.set_value(n, &"1").is_ok();
                    changed = true;
                }
            }
            // PnPCapabilities 0x18: güç yönetimi sekmesi kapalı, 0x100: uyandırma yasak
            if let Ok(cap) = k.get_value::<u32, _>("PnPCapabilities") {
                let clean = cap & !(0x08 | 0x10 | 0x100);
                if clean != cap {
                    ok &= k.set_value("PnPCapabilities", &clean).is_ok();
                    changed = true;
                }
            }
            if changed {
                restart_adapter(&sub);
            }
        }

        // 3) "Bu aygıt bilgisayarı uyandırabilir" (sürücü yeniden başladıktan sonra; birkaç kez dene)
        use windows_sys::Win32::System::Power::{DevicePowerSetDeviceState, DEVICEPOWER_SET_WAKEENABLED};
        let name = wide(desc);
        let mut armed = false;
        for _ in 0..10 {
            if unsafe { DevicePowerSetDeviceState(name.as_ptr(), DEVICEPOWER_SET_WAKEENABLED, std::ptr::null()) } == 0 {
                armed = true;
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(800));
        }
        ok &= armed || wake_armed(desc).is_none();
        if ok { 0 } else { 1 }
    }

    /// Aygıt Yöneticisi'ndeki gibi: sürücüyü durdurup yeniden başlat (yeni ayarları okusun)
    fn restart_adapter(sub: &str) {
        use windows_sys::core::GUID;
        use windows_sys::Win32::Devices::DeviceAndDriverInstallation::*;
        const NET: GUID = GUID::from_u128(0x4d36e972_e325_11ce_bfc1_08002be10318);
        let want = format!("{{4d36e972-e325-11ce-bfc1-08002be10318}}\\{sub}");
        unsafe {
            let set = SetupDiGetClassDevsW(&NET, std::ptr::null(), std::ptr::null_mut(), DIGCF_PRESENT);
            if set as isize == -1 {
                return;
            }
            let mut i = 0;
            loop {
                let mut dev: SP_DEVINFO_DATA = std::mem::zeroed();
                dev.cbSize = std::mem::size_of::<SP_DEVINFO_DATA>() as u32;
                if SetupDiEnumDeviceInfo(set, i, &mut dev) == 0 {
                    break;
                }
                i += 1;
                let mut buf = [0u16; 128];
                let mut need = 0;
                if SetupDiGetDeviceRegistryPropertyW(set, &dev, SPDRP_DRIVER, std::ptr::null_mut(), buf.as_mut_ptr().cast(), 256, &mut need) == 0 {
                    continue;
                }
                let end = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
                if !String::from_utf16_lossy(&buf[..end]).eq_ignore_ascii_case(&want) {
                    continue;
                }
                let params = SP_PROPCHANGE_PARAMS {
                    ClassInstallHeader: SP_CLASSINSTALL_HEADER { cbSize: std::mem::size_of::<SP_CLASSINSTALL_HEADER>() as u32, InstallFunction: DIF_PROPERTYCHANGE },
                    StateChange: DICS_PROPCHANGE,
                    Scope: DICS_FLAG_GLOBAL,
                    HwProfile: 0,
                };
                if SetupDiSetClassInstallParamsW(set, &dev, &params.ClassInstallHeader, std::mem::size_of::<SP_PROPCHANGE_PARAMS>() as u32) != 0 {
                    SetupDiCallClassInstaller(DIF_PROPERTYCHANGE, set, &dev);
                }
                break;
            }
            SetupDiDestroyDeviceInfoList(set);
        }
    }

    /// Nook'u yönetici olarak `wol-fix` ile açıp bitmesini bekler. Err("cancelled"): UAC reddedildi
    pub fn fix() -> Result<(), String> {
        let a = crate::remote::primary_adapter().ok_or("Ağ kartı bulunamadı")?;
        super::run_elevated(&format!("wol-fix {} \"{}\"", a.guid, a.description.replace('"', "")))
    }
}

/// Dosyayı Windows'un kabuğuyla açar (`runas`: yönetici izniyle). Bekleyecekse süreç tutamacı döner.
#[cfg(windows)]
pub fn shell_open(file: &str, params: &str, runas: bool) -> Result<Option<windows_sys::Win32::Foundation::HANDLE>, String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Foundation::GetLastError;
    use windows_sys::Win32::UI::Shell::{ShellExecuteExW, SEE_MASK_NOCLOSEPROCESS, SHELLEXECUTEINFOW};
    let wide = |s: &str| std::ffi::OsStr::new(s).encode_wide().chain(Some(0)).collect::<Vec<u16>>();
    let (file, params, verb) = (wide(file), wide(params), wide(if runas { "runas" } else { "open" }));
    unsafe {
        let mut info: SHELLEXECUTEINFOW = std::mem::zeroed();
        info.cbSize = std::mem::size_of::<SHELLEXECUTEINFOW>() as u32;
        info.fMask = SEE_MASK_NOCLOSEPROCESS;
        info.lpVerb = verb.as_ptr();
        info.lpFile = file.as_ptr();
        info.lpParameters = params.as_ptr();
        info.nShow = if runas { 0 } else { 1 };
        if ShellExecuteExW(&mut info) == 0 {
            return Err(if GetLastError() == 1223 { "cancelled".into() } else { "Açılamadı".into() });
        }
        if info.hProcess.is_null() {
            return Ok(None);
        }
        if !runas {
            windows_sys::Win32::Foundation::CloseHandle(info.hProcess);
            return Ok(None);
        }
        Ok(Some(info.hProcess))
    }
}

/// Nook'u yönetici olarak verilen argümanlarla açar (main.rs) ve bitmesini bekler. Err("cancelled"): UAC reddedildi
#[cfg(windows)]
pub fn run_elevated(args: &str) -> Result<(), String> {
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Threading::{GetExitCodeProcess, WaitForSingleObject};
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let Some(h) = shell_open(&exe.to_string_lossy(), args, true).map_err(|e| if e == "Açılamadı" { "Yönetici izni alınamadı".into() } else { e })? else { return Ok(()) };
    unsafe {
        WaitForSingleObject(h, 60_000);
        let mut code = 1;
        GetExitCodeProcess(h, &mut code);
        CloseHandle(h);
        if code != 0 {
            return Err("Bazı ayarlar değiştirilemedi".into());
        }
    }
    Ok(())
}

#[cfg(windows)]
pub use imp::fix_elevated;

#[tauri::command]
pub fn wol_status() -> WolStatus {
    #[cfg(windows)]
    return imp::status();
    #[cfg(not(windows))]
    WolStatus::default()
}

#[tauri::command]
pub async fn wol_fix() -> Result<WolStatus, String> {
    #[cfg(windows)]
    {
        tauri::async_runtime::spawn_blocking(imp::fix).await.map_err(|e| e.to_string())??;
        // Ağ kartı yeniden başlarken adres bir an kaybolur
        std::thread::sleep(std::time::Duration::from_secs(2));
        Ok(imp::status())
    }
    #[cfg(not(windows))]
    Err("Yalnızca Windows".into())
}

#[cfg(all(test, windows))]
mod tests {
    #[test]
    #[ignore]
    fn print_status() {
        println!("{}", serde_json::to_string_pretty(&super::wol_status()).unwrap());
    }
}
