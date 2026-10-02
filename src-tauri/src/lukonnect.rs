//! Lukonnect entegrasyonu — yalnızca OKUR, Lukonnect'e hiçbir şey yazmaz.
//!  - Mouse pili: Lukonnect'in kendi kayıt dosyası (`razer_68saat_veri.json`, kullanım süresinden tahmin)
//!  - Kulaklık & vantilatör: Lukonnect'in Nook için yazdığı `nook_durum.json`
//! Pil azalınca, kulaklık şarja takılınca, vantilatör açılıp kapanınca olay kartı gösterilir.

use std::path::PathBuf;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter};

use crate::system::emit_event;

const POLL: Duration = Duration::from_secs(2);
/// Lukonnect vantilatör döngüsü 4 sn'de bir yazar; bundan eskiyse kapalı sayılır.
const STALE_SECS: f64 = 60.0;
const LOW: [u8; 2] = [20, 10];

#[derive(Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct Mouse {
    percent: u8,
    remaining_sec: i64,
}

#[derive(Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct Headset {
    percent: u8,
    /// "Şarj oluyor" / "Şarj olmuyor" / "Tam dolu"
    charging: Option<String>,
}

#[derive(Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct Fan {
    on: bool,
    speed: u8,
}

#[derive(Clone, Serialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
struct Devices {
    /// Lukonnect çalışıyor ve durum dosyası taze mi
    lukonnect: bool,
    mouse: Option<Mouse>,
    headset: Option<Headset>,
    fan: Option<Fan>,
}

fn data_dir() -> Option<PathBuf> {
    Some(PathBuf::from(std::env::var_os("LOCALAPPDATA")?).join("RazerBatteryTracker"))
}

fn read_json(path: PathBuf) -> Option<Value> {
    serde_json::from_str(&std::fs::read_to_string(path).ok()?).ok()
}

fn snapshot(dir: &PathBuf) -> Devices {
    let mouse = read_json(dir.join("razer_68saat_veri.json")).and_then(|v| {
        let used = v.get("current_usage")?.as_f64()?;
        let cap = v.get("capacity_seconds")?.as_f64().filter(|c| *c > 0.0)?;
        // Lukonnect ile aynı formül
        let percent = (100.0 - used / cap * 100.0).clamp(0.0, 100.0) as u8;
        Some(Mouse { percent, remaining_sec: (cap - used) as i64 })
    });

    let status = read_json(dir.join("nook_durum.json"));
    let now = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs_f64()).unwrap_or_default();
    let fresh = status
        .as_ref()
        .and_then(|s| s.get("zaman")?.as_f64())
        .is_some_and(|t| now - t < STALE_SECS);
    let get = |k: &str| status.as_ref().filter(|_| fresh).and_then(|s| s.get(k)).filter(|v| !v.is_null());

    let headset = get("kulaklik_yuzde").and_then(|v| v.as_u64()).map(|p| Headset {
        percent: p.min(100) as u8,
        charging: get("kulaklik_sarj").and_then(|v| v.as_str()).map(str::to_owned),
    });
    let fan = get("vantilator_bagli")
        .and_then(|v| v.as_bool())
        .filter(|b| *b)
        .map(|_| Fan {
            on: get("vantilator_acik").and_then(|v| v.as_bool()).unwrap_or(false),
            speed: get("vantilator_hiz").and_then(|v| v.as_u64()).unwrap_or(0).min(100) as u8,
        });

    Devices { lukonnect: fresh, mouse, headset, fan }
}

fn crossed_low(now: u8, prev: u8) -> bool {
    LOW.iter().any(|&l| now <= l && prev > l)
}

fn events(app: &AppHandle, now: &Devices, prev: &Devices) {
    if let (Some(n), Some(p)) = (&now.mouse, &prev.mouse) {
        if crossed_low(n.percent, p.percent) {
            emit_event(app, "device-low", "Mouse pili azalıyor", format!("%{} kaldı", n.percent));
        }
    }
    if let (Some(n), Some(p)) = (&now.headset, &prev.headset) {
        let charging = n.charging.as_deref() == Some("Şarj oluyor");
        if crossed_low(n.percent, p.percent) && !charging {
            emit_event(app, "device-low", "Kulaklık pili azalıyor", format!("%{} kaldı", n.percent));
        }
        if n.charging != p.charging {
            match n.charging.as_deref() {
                Some("Şarj oluyor") => emit_event(app, "headset-charging", "Kulaklık şarj oluyor", format!("%{}", n.percent)),
                Some("Tam dolu") => emit_event(app, "headset-charging", "Kulaklık tam dolu", "Şarjdan çıkarabilirsin"),
                _ => {}
            }
        }
    }
    if let (Some(n), Some(p)) = (&now.fan, &prev.fan) {
        if n.on != p.on {
            let title = if n.on { "Vantilatör açıldı" } else { "Vantilatör kapandı" };
            emit_event(app, "fan", title, if n.on { format!("Hız {}", n.speed) } else { String::new() });
        }
    }
}

pub fn spawn(app: AppHandle) {
    let Some(dir) = data_dir() else { return };
    thread::Builder::new()
        .name("nook-lukonnect".into())
        .spawn(move || {
            let mut prev: Option<Devices> = None;
            loop {
                let now = snapshot(&dir);
                // İlk okumada olay üretme (açılışta "pil azalıyor" patlamasın).
                if let Some(p) = &prev {
                    events(&app, &now, p);
                }
                let _ = app.emit("nook://devices", &now);
                prev = Some(now);
                thread::sleep(POLL);
            }
        })
        .expect("lukonnect thread başlatılamadı");
}
