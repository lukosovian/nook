//! Sistem izleyici (saniyede bir):
//!  - İstatistikler: CPU, RAM, ağ hızı, disk, pil → "nook://stats"
//!  - Olaylar: şarj takıldı/çıktı, pil azaldı, USB takıldı/çıktı → "nook://event"
//!  - Yeni ekran görüntüleri (Resimler\Ekran görüntüleri) → "nook://screenshot"

use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Arc;
use std::thread;
use std::time::{Duration, SystemTime};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::state::Shared;

const POLL: Duration = Duration::from_secs(1);
const LOW_BATTERY: [u8; 2] = [20, 10];

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    cpu: f32,
    mem_used: u64,
    mem_total: u64,
    net_down: u64,
    net_up: u64,
    disk_used: u64,
    disk_total: u64,
    battery: Option<Battery>,
    /// Pille çalışıyor ya da Windows enerji tasarrufu açık — animasyonlar yavaşlasın
    saver: bool,
    /// Ekran kartı (3B motoru) kullanımı (%); ölçülemiyorsa yok
    gpu: Option<f32>,
}

#[derive(Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Battery {
    percent: u8,
    charging: bool,
}

/// Adada kısa bir kart olarak gösterilen sistem olayı.
#[derive(Clone, Serialize)]
pub struct SysEvent {
    /// Frontend ikon ve Nook tepkisi seçer: charging | unplugged | battery-low | usb-in | usb-out | audio | screenshot
    kind: &'static str,
    title: String,
    detail: String,
}

pub fn emit_event(app: &AppHandle, kind: &'static str, title: impl Into<String>, detail: impl Into<String>) {
    let _ = app.emit("nook://event", SysEvent { kind, title: title.into(), detail: detail.into() });
}

pub fn spawn(app: AppHandle, shared: Arc<Shared>) {
    thread::Builder::new()
        .name("nook-system".into())
        .spawn(move || {
            let mut cpu = imp::CpuMeter::default();
            let mut gpu = imp::GpuMeter::new();
            let mut gpu_now: Option<f32> = None;
            let mut tick: u64 = 0;
            let mut locked_prev = false;
            let mut net = imp::NetMeter::default();
            let mut battery_prev = imp::battery();
            let mut drives_prev = imp::removable_drives();
            let shots_dir = screenshots_dir(&app);
            let mut shots_seen = shots_dir.as_ref().map(|d| list_images(d)).unwrap_or_default();

            loop {
                thread::sleep(POLL);

                // --- İstatistikler
                tick += 1;
                // GPU sayaçları pahalı: iki saniyede bir
                if tick % 2 == 0 {
                    gpu_now = gpu.as_mut().and_then(|g| g.sample());
                }
                let (mem_used, mem_total) = imp::memory();
                let (net_down, net_up) = net.sample();
                let (disk_used, disk_total) = imp::disk();
                let battery = imp::battery();
                let cpu_now = cpu.sample();
                shared.cpu.store(cpu_now.to_bits(), std::sync::atomic::Ordering::Relaxed);
                if mem_total > 0 {
                    shared.mem.store((mem_used * 100 / mem_total) as u32, std::sync::atomic::Ordering::Relaxed);
                }
                let _ = app.emit(
                    "nook://stats",
                    Stats { cpu: cpu_now, mem_used, mem_total, net_down, net_up, disk_used, disk_total, battery, saver: imp::power_saver(), gpu: gpu_now },
                );

                // --- Ekran kilitlendi / açıldı (pano temizliği)
                let locked = imp::screen_locked();
                if locked != locked_prev {
                    locked_prev = locked;
                    let _ = app.emit("nook://locked", locked);
                }

                // --- Pil olayları
                if let (Some(b), Some(p)) = (battery, battery_prev) {
                    if b.charging && !p.charging {
                        emit_event(&app, "charging", "Şarj oluyor", format!("%{}", b.percent));
                    } else if !b.charging && p.charging {
                        emit_event(&app, "unplugged", "Şarj kablosu çıkarıldı", format!("%{} pil", b.percent));
                    }
                    if !b.charging {
                        for level in LOW_BATTERY {
                            if b.percent <= level && p.percent > level {
                                emit_event(&app, "battery-low", "Pil azalıyor", format!("%{} kaldı", b.percent));
                            }
                        }
                    }
                }
                battery_prev = battery;

                // --- USB bellekler
                let drives = imp::removable_drives();
                for d in drives.difference(&drives_prev) {
                    emit_event(&app, "usb-in", "USB takıldı", d.clone());
                }
                for d in drives_prev.difference(&drives) {
                    emit_event(&app, "usb-out", "USB çıkarıldı", d.clone());
                }
                drives_prev = drives;

                // --- Ekran görüntüleri
                if let Some(dir) = &shots_dir {
                    let now = list_images(dir);
                    if shared.settings().auto_screenshots {
                        for path in now.difference(&shots_seen) {
                            if is_fresh(path) {
                                let _ = app.emit("nook://screenshot", path.to_string_lossy().to_string());
                            }
                        }
                    }
                    shots_seen = now;
                }
            }
        })
        .expect("system thread başlatılamadı");
}

/// Windows 11'de Win+PrtSc ve Ekran Alıntısı Aracı buraya kaydeder.
fn screenshots_dir(app: &AppHandle) -> Option<PathBuf> {
    let pictures = app.path().picture_dir().ok()?;
    ["Screenshots", "Ekran görüntüleri"]
        .iter()
        .map(|n| pictures.join(n))
        .find(|p| p.is_dir())
}

fn list_images(dir: &PathBuf) -> HashSet<PathBuf> {
    std::fs::read_dir(dir)
        .map(|rd| {
            rd.flatten()
                .map(|e| e.path())
                .filter(|p| {
                    p.extension()
                        .is_some_and(|e| matches!(e.to_string_lossy().to_lowercase().as_str(), "png" | "jpg" | "jpeg"))
                })
                .collect()
        })
        .unwrap_or_default()
}

/// Klasöre sonradan kopyalanan eski dosyaları "yeni ekran görüntüsü" sanma.
fn is_fresh(path: &PathBuf) -> bool {
    std::fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| SystemTime::now().duration_since(t).ok())
        .is_some_and(|age| age < Duration::from_secs(15))
}

#[cfg(windows)]
mod imp {
    use std::collections::HashSet;
    use std::time::Instant;

    use windows_sys::Win32::Foundation::FILETIME;
    use windows_sys::Win32::NetworkManagement::IpHelper::{FreeMibTable, GetIfTable2, MIB_IF_TABLE2};
    use windows_sys::Win32::Storage::FileSystem::{GetDiskFreeSpaceExW, GetDriveTypeW, GetLogicalDrives, GetVolumeInformationW};
    use windows_sys::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
    use windows_sys::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
    use windows_sys::Win32::System::Threading::GetSystemTimes;

    use super::Battery;

    const DRIVE_REMOVABLE: u32 = 2;
    const IF_OPER_STATUS_UP: i32 = 1;
    const IF_TYPE_SOFTWARE_LOOPBACK: u32 = 24;

    fn ft(f: FILETIME) -> u64 {
        ((f.dwHighDateTime as u64) << 32) | f.dwLowDateTime as u64
    }

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(Some(0)).collect()
    }

    #[derive(Default)]
    pub struct CpuMeter {
        prev: Option<(u64, u64)>,
    }

    impl CpuMeter {
        /// Son örnekten bu yana tüm çekirdeklerin ortalama doluluğu (%).
        pub fn sample(&mut self) -> f32 {
            let (mut idle, mut kernel, mut user) = (FILETIME { dwLowDateTime: 0, dwHighDateTime: 0 }, FILETIME { dwLowDateTime: 0, dwHighDateTime: 0 }, FILETIME { dwLowDateTime: 0, dwHighDateTime: 0 });
            if unsafe { GetSystemTimes(&mut idle, &mut kernel, &mut user) } == 0 {
                return 0.0;
            }
            // Kernel süresi idle süresini de içerir.
            let (idle, total) = (ft(idle), ft(kernel) + ft(user));
            let usage = match self.prev {
                Some((pi, pt)) if total > pt => {
                    let (di, dt) = (idle.saturating_sub(pi) as f64, (total - pt) as f64);
                    ((1.0 - di / dt) * 100.0).clamp(0.0, 100.0) as f32
                }
                _ => 0.0,
            };
            self.prev = Some((idle, total));
            usage
        }
    }

    pub fn memory() -> (u64, u64) {
        let mut m: MEMORYSTATUSEX = unsafe { std::mem::zeroed() };
        m.dwLength = std::mem::size_of::<MEMORYSTATUSEX>() as u32;
        if unsafe { GlobalMemoryStatusEx(&mut m) } == 0 {
            return (0, 0);
        }
        (m.ullTotalPhys - m.ullAvailPhys, m.ullTotalPhys)
    }

    pub fn disk() -> (u64, u64) {
        let root = wide("C:\\");
        let (mut free, mut total, mut total_free) = (0u64, 0u64, 0u64);
        if unsafe { GetDiskFreeSpaceExW(root.as_ptr(), &mut free, &mut total, &mut total_free) } == 0 {
            return (0, 0);
        }
        (total - total_free, total)
    }

    pub fn battery() -> Option<Battery> {
        let mut s: SYSTEM_POWER_STATUS = unsafe { std::mem::zeroed() };
        if unsafe { GetSystemPowerStatus(&mut s) } == 0 || s.BatteryFlag == 128 || s.BatteryLifePercent == 255 {
            return None; // Masaüstü PC: pil yok
        }
        Some(Battery { percent: s.BatteryLifePercent, charging: s.ACLineStatus == 1 })
    }

    /// Enerji tasarrufu (SystemStatusFlag) açık mı, ya da pille mi çalışıyor
    pub fn power_saver() -> bool {
        let mut s: SYSTEM_POWER_STATUS = unsafe { std::mem::zeroed() };
        if unsafe { GetSystemPowerStatus(&mut s) } == 0 {
            return false;
        }
        let on_battery = s.ACLineStatus == 0 && s.BatteryFlag != 128;
        s.SystemStatusFlag == 1 || on_battery
    }

    #[derive(Default)]
    pub struct NetMeter {
        prev: Option<(u64, u64, Instant)>,
    }

    impl NetMeter {
        /// Saniye başına indirilen/yüklenen bayt (fiziksel, bağlı arayüzlerin toplamı).
        pub fn sample(&mut self) -> (u64, u64) {
            let Some((down, up)) = octets() else { return (0, 0) };
            let now = Instant::now();
            let rate = match self.prev {
                Some((pd, pu, t)) => {
                    let secs = now.duration_since(t).as_secs_f64().max(0.001);
                    ((down.saturating_sub(pd) as f64 / secs) as u64, (up.saturating_sub(pu) as f64 / secs) as u64)
                }
                None => (0, 0),
            };
            self.prev = Some((down, up, now));
            rate
        }
    }

    fn octets() -> Option<(u64, u64)> {
        let mut table: *mut MIB_IF_TABLE2 = std::ptr::null_mut();
        if unsafe { GetIfTable2(&mut table) } != 0 || table.is_null() {
            return None;
        }
        let (mut down, mut up) = (0u64, 0u64);
        unsafe {
            let rows = std::slice::from_raw_parts((*table).Table.as_ptr(), (*table).NumEntries as usize);
            for row in rows {
                let flags = row.InterfaceAndOperStatusFlags._bitfield;
                let hardware = flags & 0b001 != 0;
                let filter = flags & 0b010 != 0;
                if hardware && !filter && row.OperStatus == IF_OPER_STATUS_UP && row.Type != IF_TYPE_SOFTWARE_LOOPBACK {
                    down += row.InOctets;
                    up += row.OutOctets;
                }
            }
            FreeMibTable(table as _);
        }
        Some((down, up))
    }

    /// Oturum kilitli mi (Win+L, uyku sonrası kilit ekranı). UAC penceresi kilit sayılmaz.
    pub fn screen_locked() -> bool {
        use windows_sys::Win32::System::RemoteDesktop::{
            WTSFreeMemory, WTSQuerySessionInformationW, WTSSessionInfoEx, WTSINFOEXW, WTS_CURRENT_SERVER_HANDLE, WTS_CURRENT_SESSION,
        };
        const WTS_SESSIONSTATE_LOCK: i32 = 0;
        unsafe {
            let mut buf: *mut u16 = std::ptr::null_mut();
            let mut bytes = 0u32;
            if WTSQuerySessionInformationW(WTS_CURRENT_SERVER_HANDLE, WTS_CURRENT_SESSION, WTSSessionInfoEx, &mut buf, &mut bytes) == 0 || buf.is_null() {
                return false;
            }
            let info = &*(buf as *const WTSINFOEXW);
            let locked = info.Level == 1 && info.Data.WTSInfoExLevel1.SessionFlags == WTS_SESSIONSTATE_LOCK;
            WTSFreeMemory(buf as _);
            locked
        }
    }

    /// GPU 3B motorlarının kullanımı (Görev Yöneticisi'nin "GPU" sütunuyla aynı sayaç)
    pub struct GpuMeter {
        query: isize,
        counter: isize,
    }

    impl GpuMeter {
        pub fn new() -> Option<Self> {
            use windows_sys::Win32::System::Performance::{PdhAddEnglishCounterW, PdhCollectQueryData, PdhOpenQueryW};
            unsafe {
                let mut query = 0isize;
                if PdhOpenQueryW(std::ptr::null(), 0, &mut query as *mut isize as _) != 0 {
                    return None;
                }
                let path = wide(r"\GPU Engine(*engtype_3D)\Utilization Percentage");
                let mut counter = 0isize;
                if PdhAddEnglishCounterW(query as _, path.as_ptr(), 0, &mut counter as *mut isize as _) != 0 {
                    return None;
                }
                PdhCollectQueryData(query as _);
                Some(Self { query, counter })
            }
        }

        pub fn sample(&mut self) -> Option<f32> {
            use windows_sys::Win32::System::Performance::{PdhCollectQueryData, PdhGetFormattedCounterArrayW, PDH_FMT_COUNTERVALUE_ITEM_W, PDH_FMT_DOUBLE};
            const PDH_MORE_DATA: u32 = 0x800007D2;
            unsafe {
                if PdhCollectQueryData(self.query as _) != 0 {
                    return None;
                }
                let (mut size, mut count) = (0u32, 0u32);
                let r = PdhGetFormattedCounterArrayW(self.counter as _, PDH_FMT_DOUBLE, &mut size, &mut count, std::ptr::null_mut());
                if r != PDH_MORE_DATA || size == 0 {
                    return Some(0.0);
                }
                let mut buf = vec![0u8; size as usize];
                let items = buf.as_mut_ptr() as *mut PDH_FMT_COUNTERVALUE_ITEM_W;
                if PdhGetFormattedCounterArrayW(self.counter as _, PDH_FMT_DOUBLE, &mut size, &mut count, items) != 0 {
                    return None;
                }
                // Aynı motoru kullanan süreçlerin toplamı = motorun doluluğu; en dolu motor gösterilir
                let mut engines: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
                for it in std::slice::from_raw_parts(items, count as usize) {
                    let mut n = 0;
                    while *it.szName.add(n) != 0 {
                        n += 1;
                    }
                    let name = String::from_utf16_lossy(std::slice::from_raw_parts(it.szName, n));
                    // "pid_1234_luid_0x..._phys_0_eng_0_engtype_3D" → "0x..._phys_0_eng_0_engtype_3D"
                    let engine = name.split_once("_luid_").map(|(_, r)| r.to_string()).unwrap_or(name);
                    *engines.entry(engine).or_default() += it.FmtValue.Anonymous.doubleValue;
                }
                Some(engines.values().cloned().fold(0.0, f64::max).clamp(0.0, 100.0) as f32)
            }
        }
    }

    /// Takılı çıkarılabilir sürücüler, "E: KINGSTON" biçiminde.
    pub fn removable_drives() -> HashSet<String> {
        let mask = unsafe { GetLogicalDrives() };
        (0..26u8)
            .filter(|i| mask & (1 << i) != 0)
            .filter_map(|i| {
                let letter = (b'A' + i) as char;
                let root = wide(&format!("{letter}:\\"));
                if unsafe { GetDriveTypeW(root.as_ptr()) } != DRIVE_REMOVABLE {
                    return None;
                }
                let mut name = [0u16; 261];
                let ok = unsafe {
                    GetVolumeInformationW(
                        root.as_ptr(),
                        name.as_mut_ptr(),
                        name.len() as u32,
                        std::ptr::null_mut(),
                        std::ptr::null_mut(),
                        std::ptr::null_mut(),
                        std::ptr::null_mut(),
                        0,
                    )
                };
                let label = if ok != 0 {
                    String::from_utf16_lossy(&name[..name.iter().position(|&c| c == 0).unwrap_or(0)])
                } else {
                    String::new()
                };
                Some(if label.is_empty() { format!("{letter}:") } else { format!("{letter}: {label}") })
            })
            .collect()
    }
}

#[cfg(not(windows))]
mod imp {
    use std::collections::HashSet;

    use super::Battery;

    #[derive(Default)]
    pub struct CpuMeter;
    impl CpuMeter {
        pub fn sample(&mut self) -> f32 {
            0.0
        }
    }
    #[derive(Default)]
    pub struct NetMeter;
    impl NetMeter {
        pub fn sample(&mut self) -> (u64, u64) {
            (0, 0)
        }
    }
    pub fn memory() -> (u64, u64) {
        (0, 0)
    }
    pub fn disk() -> (u64, u64) {
        (0, 0)
    }
    pub fn battery() -> Option<Battery> {
        None
    }
    pub fn power_saver() -> bool {
        false
    }
    pub fn removable_drives() -> HashSet<String> {
        HashSet::new()
    }
    pub fn screen_locked() -> bool {
        false
    }
    pub struct GpuMeter;
    impl GpuMeter {
        pub fn new() -> Option<Self> {
            None
        }
        pub fn sample(&mut self) -> Option<f32> {
            None
        }
    }
}
