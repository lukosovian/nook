//! Bağlantı durumu (3 sn'de bir):
//!  - İnternet koptu / geri geldi → olay kartı + "nook://online"
//!  - Bluetooth cihazı bağlandı / ayrıldı (kulaklık, gamepad…) → olay kartı

use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter};

use crate::system::emit_event;

const POLL: Duration = Duration::from_secs(3);
/// Kısa kesintilerde (Wi-Fi ağ değiştirirken) kart çıkmasın: art arda bu kadar tur çevrimdışı olmalı.
const OFFLINE_AFTER: u8 = 2;

static ONLINE: AtomicBool = AtomicBool::new(true);

/// Webview hazır olunca son durumu sorar.
#[tauri::command]
pub fn online_state() -> bool {
    ONLINE.load(Ordering::Relaxed)
}

pub fn spawn(app: AppHandle) {
    thread::Builder::new()
        .name("nook-net".into())
        .spawn(move || {
            let mut online = imp::online();
            ONLINE.store(online, Ordering::Relaxed);
            let mut misses = 0u8;
            let mut bt_prev = imp::bluetooth_connected();
            loop {
                thread::sleep(POLL);

                let now = imp::online();
                misses = if now { 0 } else { misses.saturating_add(1) };
                let settled = if now { true } else if misses >= OFFLINE_AFTER { false } else { online };
                if settled != online {
                    online = settled;
                    ONLINE.store(online, Ordering::Relaxed);
                    let _ = app.emit("nook://online", online);
                    if online {
                        emit_event(&app, "online", "İnternet geri geldi", "Bağlantı tamam");
                    } else {
                        emit_event(&app, "offline", "İnternet koptu", "Bağlantı yok");
                    }
                }

                let bt = imp::bluetooth_connected();
                for name in bt.difference(&bt_prev) {
                    emit_event(&app, "bt-in", "Bluetooth bağlandı", name.clone());
                }
                for name in bt_prev.difference(&bt) {
                    emit_event(&app, "bt-out", "Bluetooth ayrıldı", name.clone());
                }
                bt_prev = bt;
            }
        })
        .expect("net thread başlatılamadı");
}

#[cfg(windows)]
mod imp {
    use std::collections::HashSet;

    use windows::Networking::Connectivity::{NetworkConnectivityLevel, NetworkInformation};
    use windows_sys::Win32::Devices::Bluetooth::{
        BluetoothFindDeviceClose, BluetoothFindFirstDevice, BluetoothFindNextDevice, BLUETOOTH_DEVICE_INFO, BLUETOOTH_DEVICE_SEARCH_PARAMS,
    };

    pub fn online() -> bool {
        NetworkInformation::GetInternetConnectionProfile()
            .and_then(|p| p.GetNetworkConnectivityLevel())
            .is_ok_and(|l| l == NetworkConnectivityLevel::InternetAccess)
    }

    /// Eşleşmiş ve şu an bağlı klasik Bluetooth cihazlarının adları (tarama yapmadan).
    pub fn bluetooth_connected() -> HashSet<String> {
        let mut out = HashSet::new();
        unsafe {
            let params = BLUETOOTH_DEVICE_SEARCH_PARAMS {
                dwSize: std::mem::size_of::<BLUETOOTH_DEVICE_SEARCH_PARAMS>() as u32,
                fReturnAuthenticated: 1,
                fReturnRemembered: 1,
                fReturnUnknown: 0,
                fReturnConnected: 1,
                fIssueInquiry: 0,
                cTimeoutMultiplier: 0,
                hRadio: std::ptr::null_mut(),
            };
            let mut info: BLUETOOTH_DEVICE_INFO = std::mem::zeroed();
            info.dwSize = std::mem::size_of::<BLUETOOTH_DEVICE_INFO>() as u32;
            let find = BluetoothFindFirstDevice(&params, &mut info);
            if find.is_null() {
                return out;
            }
            loop {
                if info.fConnected != 0 {
                    let len = info.szName.iter().position(|&c| c == 0).unwrap_or(info.szName.len());
                    let name = String::from_utf16_lossy(&info.szName[..len]);
                    if !name.is_empty() {
                        out.insert(name);
                    }
                }
                info = std::mem::zeroed();
                info.dwSize = std::mem::size_of::<BLUETOOTH_DEVICE_INFO>() as u32;
                if BluetoothFindNextDevice(find, &mut info) == 0 {
                    break;
                }
            }
            BluetoothFindDeviceClose(find);
        }
        out
    }
}

#[cfg(not(windows))]
mod imp {
    use std::collections::HashSet;
    pub fn online() -> bool {
        true
    }
    pub fn bluetooth_connected() -> HashSet<String> {
        HashSet::new()
    }
}
