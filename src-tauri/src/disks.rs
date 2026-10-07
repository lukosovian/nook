//! Sistem panelinin ayrıntıları (yalnızca panel açıkken istenir):
//!  - Bütün diskler (doluluk), fiziksel disklerin sağlığı, USB diski güvenle çıkarma
//!  - Yerel IP, indirme hızı testi

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Volume {
    /// "C:\"
    root: String,
    label: String,
    used: u64,
    total: u64,
    /// USB bellek / harici disk (çıkarılabilir)
    removable: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhysicalDisk {
    name: String,
    /// "healthy" | "warning" | "unhealthy" | "unknown"
    health: String,
    /// "SSD" | "HDD" | ""
    media: String,
    size: u64,
}

#[tauri::command]
pub async fn system_disks() -> Vec<Volume> {
    #[cfg(windows)]
    return imp::volumes();
    #[cfg(not(windows))]
    Vec::new()
}

#[tauri::command]
pub async fn disk_health() -> Vec<PhysicalDisk> {
    #[cfg(windows)]
    return imp::health();
    #[cfg(not(windows))]
    Vec::new()
}

/// USB belleği güvenle çıkar ("E:\")
#[tauri::command]
pub async fn disk_eject(root: String) -> Result<(), String> {
    #[cfg(windows)]
    return imp::eject(&root);
    #[cfg(not(windows))]
    {
        let _ = root;
        Err("yalnızca Windows".into())
    }
}

/// Bu bilgisayarın yerel ağdaki IPv4 adresi (dışarıya paket gönderilmez: UDP "bağlantısı" yalnızca yol seçer)
#[tauri::command]
pub fn local_ip() -> Option<String> {
    let sock = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    sock.connect("1.1.1.1:80").ok()?;
    sock.local_addr().ok().map(|a| a.ip().to_string())
}

/// İndirme hızı (Mbit/s): Cloudflare'in hız testi sunucusundan ~25 MB, en fazla 12 sn
#[tauri::command]
pub async fn speed_test() -> Result<f64, String> {
    use std::io::Read;
    use std::time::{Duration, Instant};
    let res = ureq::get("https://speed.cloudflare.com/__down?bytes=25000000")
        .timeout(Duration::from_secs(20))
        .call()
        .map_err(|e| e.to_string())?;
    let mut reader = res.into_reader();
    let mut buf = vec![0u8; 64 * 1024];
    let start = Instant::now();
    let mut got = 0u64;
    loop {
        let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        got += n as u64;
        if start.elapsed() > Duration::from_secs(12) {
            break;
        }
    }
    let secs = start.elapsed().as_secs_f64().max(0.001);
    Ok(got as f64 * 8.0 / secs / 1_000_000.0)
}

#[cfg(windows)]
mod imp {
    use super::{PhysicalDisk, Volume};
    use serde::Deserialize;
    use windows_sys::Win32::Foundation::{CloseHandle, GENERIC_READ, GENERIC_WRITE, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::Storage::FileSystem::{
        CreateFileW, GetDiskFreeSpaceExW, GetDriveTypeW, GetLogicalDrives, GetVolumeInformationW, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING,
    };
    use windows_sys::Win32::System::IO::DeviceIoControl;
    use windows_sys::Win32::System::Ioctl::{FSCTL_DISMOUNT_VOLUME, FSCTL_LOCK_VOLUME, IOCTL_STORAGE_EJECT_MEDIA, IOCTL_STORAGE_MEDIA_REMOVAL};

    const DRIVE_REMOVABLE: u32 = 2;
    const DRIVE_FIXED: u32 = 3;

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(Some(0)).collect()
    }

    pub fn volumes() -> Vec<Volume> {
        let mask = unsafe { GetLogicalDrives() };
        (0..26u8)
            .filter(|i| mask & (1 << i) != 0)
            .filter_map(|i| {
                let root = format!("{}:\\", (b'A' + i) as char);
                let w = wide(&root);
                let kind = unsafe { GetDriveTypeW(w.as_ptr()) };
                if kind != DRIVE_FIXED && kind != DRIVE_REMOVABLE {
                    return None;
                }
                let (mut free, mut total, mut total_free) = (0u64, 0u64, 0u64);
                if unsafe { GetDiskFreeSpaceExW(w.as_ptr(), &mut free, &mut total, &mut total_free) } == 0 || total == 0 {
                    return None;
                }
                let mut name = [0u16; 261];
                let ok = unsafe {
                    GetVolumeInformationW(w.as_ptr(), name.as_mut_ptr(), name.len() as u32, std::ptr::null_mut(), std::ptr::null_mut(), std::ptr::null_mut(), std::ptr::null_mut(), 0)
                };
                let label = if ok != 0 { String::from_utf16_lossy(&name[..name.iter().position(|&c| c == 0).unwrap_or(0)]) } else { String::new() };
                Some(Volume { root, label, used: total - total_free, total, removable: kind == DRIVE_REMOVABLE })
            })
            .collect()
    }

    #[derive(Deserialize)]
    #[serde(rename = "MSFT_PhysicalDisk")]
    #[serde(rename_all = "PascalCase")]
    struct Raw {
        friendly_name: Option<String>,
        health_status: Option<u16>,
        media_type: Option<u16>,
        size: Option<u64>,
    }

    pub fn health() -> Vec<PhysicalDisk> {
        let Ok(w) = wmi::WMIConnection::with_namespace_path(r"ROOT\Microsoft\Windows\Storage") else { return Vec::new() };
        let rows: Vec<Raw> = w.query().unwrap_or_default();
        rows.into_iter()
            .map(|r| PhysicalDisk {
                name: r.friendly_name.unwrap_or_default(),
                health: match r.health_status {
                    Some(0) => "healthy",
                    Some(1) => "warning",
                    Some(2) => "unhealthy",
                    _ => "unknown",
                }
                .into(),
                media: match r.media_type {
                    Some(3) => "HDD",
                    Some(4) => "SSD",
                    _ => "",
                }
                .into(),
                size: r.size.unwrap_or(0),
            })
            .collect()
    }

    /// Birimi kilitler, ayırır ve çıkarır (Windows'un "Donanımı güvenle kaldır"ının bellek için yaptığı)
    pub fn eject(root: &str) -> Result<(), String> {
        let letter = root.chars().next().filter(|c| c.is_ascii_alphabetic()).ok_or("geçersiz sürücü")?;
        let w = wide(&format!("{letter}:\\"));
        if unsafe { GetDriveTypeW(w.as_ptr()) } != DRIVE_REMOVABLE {
            return Err("yalnızca çıkarılabilir diskler".into());
        }
        let path = wide(&format!("\\\\.\\{letter}:"));
        unsafe {
            let h = CreateFileW(path.as_ptr(), GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, std::ptr::null(), OPEN_EXISTING, 0, std::ptr::null_mut());
            if h == INVALID_HANDLE_VALUE {
                return Err("disk açılamadı".into());
            }
            let mut ret = 0u32;
            let io = |code: u32, inp: *const core::ffi::c_void, len: u32, ret: &mut u32| {
                DeviceIoControl(h, code, inp, len, std::ptr::null_mut(), 0, ret, std::ptr::null_mut()) != 0
            };
            // Açık dosya varsa kilit tutmaz: birkaç kez dene
            let mut locked = false;
            for _ in 0..10 {
                if io(FSCTL_LOCK_VOLUME, std::ptr::null(), 0, &mut ret) {
                    locked = true;
                    break;
                }
                std::thread::sleep(std::time::Duration::from_millis(300));
            }
            if !locked {
                CloseHandle(h);
                return Err("diskte açık dosya var".into());
            }
            let prevent: u8 = 0;
            let ok = io(FSCTL_DISMOUNT_VOLUME, std::ptr::null(), 0, &mut ret)
                && io(IOCTL_STORAGE_MEDIA_REMOVAL, &prevent as *const u8 as _, 1, &mut ret)
                && io(IOCTL_STORAGE_EJECT_MEDIA, std::ptr::null(), 0, &mut ret);
            CloseHandle(h);
            if ok {
                Ok(())
            } else {
                Err("çıkarılamadı".into())
            }
        }
    }
}
