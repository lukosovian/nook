//! Ekran parlaklığı:
//!  - Değişimi WMI olayıyla dinler (yoklama yok). Yalnızca dizüstü panellerinde olay gelir.
//!  - Okuma/ayarlama: dizüstü paneli WMI ile, harici monitörler DDC/CI ile (monitör menüsündeki
//!    parlaklık ayarının aynısı). DDC/CI'ı kapalı ya da desteklemeyen monitörler atlanır.

use std::sync::atomic::{AtomicBool, AtomicI32, Ordering};
use std::thread;

use tauri::{AppHandle, Emitter};

pub fn spawn(app: AppHandle) {
    thread::Builder::new()
        .name("nook-brightness".into())
        .spawn(move || {
            #[cfg(windows)]
            imp::run(app);
            #[cfg(not(windows))]
            let _ = app;
        })
        .expect("brightness thread başlatılamadı");
}

/// Şu anki parlaklık (0–100); hiçbir ekran desteklemiyorsa None.
#[tauri::command]
pub async fn brightness_get() -> Option<u32> {
    #[cfg(windows)]
    return imp::get();
    #[cfg(not(windows))]
    None
}

/// Kaydırıcı sürüklenirken art arda çağrılır. DDC/CI yavaş olduğu için tek iş parçacığı
/// sırayla uygular ve aradaki değerleri atlayıp her zaman en sonuncuya gider.
static WANT: AtomicI32 = AtomicI32::new(-1);
static RUNNING: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub fn brightness_set(value: u32) {
    WANT.store(value.min(100) as i32, Ordering::Release);
    if RUNNING.swap(true, Ordering::AcqRel) {
        return;
    }
    thread::spawn(|| loop {
        let v = WANT.swap(-1, Ordering::AcqRel);
        if v >= 0 {
            #[cfg(windows)]
            imp::set(v as u32);
            continue;
        }
        RUNNING.store(false, Ordering::Release);
        // Durmadan hemen önce yeni değer geldiyse ve başka iş parçacığı devralmadıysa devam et
        if WANT.load(Ordering::Acquire) < 0 || RUNNING.swap(true, Ordering::AcqRel) {
            break;
        }
    });
}

#[cfg(windows)]
mod imp {
    use super::*;
    use serde::Deserialize;
    use windows_sys::Win32::Devices::Display::{
        DestroyPhysicalMonitors, GetNumberOfPhysicalMonitorsFromHMONITOR, GetPhysicalMonitorsFromHMONITOR,
        GetVCPFeatureAndVCPFeatureReply, SetVCPFeature, PHYSICAL_MONITOR,
    };
    use windows_sys::Win32::Foundation::{BOOL, LPARAM, RECT};
    use windows_sys::Win32::Graphics::Gdi::{EnumDisplayMonitors, HDC, HMONITOR};
    use wmi::WMIConnection;

    /// VESA MCCS "Luminance"
    const VCP_BRIGHTNESS: u8 = 0x10;

    #[derive(Deserialize)]
    #[serde(rename = "WmiMonitorBrightnessEvent")]
    #[serde(rename_all = "PascalCase")]
    struct BrightnessEvent {
        brightness: u8,
    }

    pub fn run(app: AppHandle) {
        let Ok(wmi) = WMIConnection::with_namespace_path(r"ROOT\WMI") else { return };
        let Ok(events) = wmi.notification::<BrightnessEvent>() else { return };
        for ev in events.flatten() {
            let _ = app.emit("nook://brightness", ev.brightness as f32 / 100.0);
        }
    }

    #[derive(Deserialize)]
    #[serde(rename = "WmiMonitorBrightness")]
    #[serde(rename_all = "PascalCase")]
    struct WmiBrightness {
        current_brightness: u8,
    }

    #[derive(Deserialize)]
    #[allow(non_camel_case_types, non_snake_case)]
    struct WmiMonitorBrightnessMethods {
        __Path: String,
    }

    #[derive(serde::Serialize)]
    #[allow(non_snake_case)]
    struct SetArgs {
        Timeout: u32,
        Brightness: u8,
    }

    fn wmi() -> Option<WMIConnection> {
        WMIConnection::with_namespace_path(r"ROOT\WMI").ok()
    }

    /// Fiziksel monitör tutamaçları (iş bitince `close` ile bırakılmalı).
    fn physical_monitors() -> Vec<PHYSICAL_MONITOR> {
        unsafe extern "system" fn collect(h: HMONITOR, _: HDC, _: *mut RECT, data: LPARAM) -> BOOL {
            (*(data as *mut Vec<HMONITOR>)).push(h);
            1
        }
        let mut handles: Vec<HMONITOR> = Vec::new();
        unsafe { EnumDisplayMonitors(std::ptr::null_mut(), std::ptr::null(), Some(collect), &mut handles as *mut _ as LPARAM) };
        let mut out = Vec::new();
        for h in handles {
            let mut n = 0u32;
            if unsafe { GetNumberOfPhysicalMonitorsFromHMONITOR(h, &mut n) } == 0 || n == 0 {
                continue;
            }
            let mut list: Vec<PHYSICAL_MONITOR> = vec![unsafe { std::mem::zeroed() }; n as usize];
            if unsafe { GetPhysicalMonitorsFromHMONITOR(h, n, list.as_mut_ptr()) } != 0 {
                out.extend(list);
            }
        }
        out
    }

    fn close(list: &[PHYSICAL_MONITOR]) {
        if !list.is_empty() {
            unsafe { DestroyPhysicalMonitors(list.len() as u32, list.as_ptr()) };
        }
    }

    fn ddc_read(m: &PHYSICAL_MONITOR) -> Option<(u32, u32)> {
        let (mut cur, mut max) = (0u32, 0u32);
        let ok = unsafe { GetVCPFeatureAndVCPFeatureReply(m.hPhysicalMonitor, VCP_BRIGHTNESS, std::ptr::null_mut(), &mut cur, &mut max) };
        (ok != 0 && max > 0).then_some((cur, max))
    }

    pub fn get() -> Option<u32> {
        if let Some(w) = wmi() {
            if let Some(b) = w.query::<WmiBrightness>().ok().and_then(|v| v.into_iter().next()) {
                return Some(b.current_brightness as u32);
            }
        }
        let list = physical_monitors();
        let v = list.iter().find_map(ddc_read).map(|(cur, max)| (cur * 100 + max / 2) / max);
        close(&list);
        v
    }

    pub fn set(value: u32) {
        if let Some(w) = wmi() {
            for m in w.query::<WmiMonitorBrightnessMethods>().unwrap_or_default() {
                let _: Result<(), _> = w.exec_instance_method::<WmiMonitorBrightnessMethods, _>(
                    &m.__Path,
                    "WmiSetBrightness",
                    SetArgs { Timeout: 0, Brightness: value as u8 },
                );
            }
        }
        let list = physical_monitors();
        for m in &list {
            if let Some((_, max)) = ddc_read(m) {
                unsafe { SetVCPFeature(m.hPhysicalMonitor, VCP_BRIGHTNESS, (value * max + 50) / 100) };
            }
        }
        close(&list);
    }
}
