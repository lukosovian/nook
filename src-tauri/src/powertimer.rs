//! Zamanlı kapatma: seçilen anda bilgisayarı kapatır, yeniden başlatır ya da uyutur.
//! Adadan (Kontrol) ve telefondan (Nook Mobil) kurulur; Nook açık kaldıkça işler. Kapatma Windows'un
//! kendi API'siyle yapılır (komut satırı/gizli süreç yok). Son bir dakikada ada ve telefon uyarır.

use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize, Deserialize, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PowerTimer {
    /// Ne zaman (Unix ms)
    pub at: i64,
    /// shutdown | restart | sleep
    pub action: String,
    /// Kim kurdu: pc | phone
    pub from: String,
}

static TIMER: Mutex<Option<PowerTimer>> = Mutex::new(None);
static APP: Mutex<Option<AppHandle>> = Mutex::new(None);
/// Son dakika uyarısı hangi zamanlayıcı için verildi (aynısı için bir kez)
static WARNED: AtomicI64 = AtomicI64::new(0);
const WARN_BEFORE_MS: i64 = 60_000;

fn now_ms() -> i64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0)
}

pub fn get() -> Option<PowerTimer> {
    TIMER.lock().unwrap().clone()
}

fn emit(name: &str, t: &Option<PowerTimer>) {
    if let Some(app) = APP.lock().unwrap().as_ref() {
        let _ = app.emit(name, t);
    }
}

/// Kur (Some) ya da iptal et (None). Geçmiş bir an ya da bilinmeyen işlem reddedilir.
pub fn set(t: Option<PowerTimer>) -> Result<Option<PowerTimer>, String> {
    if let Some(t) = &t {
        if !matches!(t.action.as_str(), "shutdown" | "restart" | "sleep") {
            return Err("bilinmeyen işlem".into());
        }
        if t.at <= now_ms() + 5_000 {
            return Err("zaman geçmişte".into());
        }
        if t.at > now_ms() + 7 * 24 * 3_600_000 {
            return Err("en fazla bir hafta sonrası".into());
        }
    }
    *TIMER.lock().unwrap() = t.clone();
    WARNED.store(0, Ordering::Relaxed);
    crate::log::write("info", &format!("zamanlı kapatma: {t:?}"));
    emit("nook://power-timer", &t);
    Ok(t)
}

pub fn spawn(app: AppHandle) {
    *APP.lock().unwrap() = Some(app);
    std::thread::spawn(|| loop {
        std::thread::sleep(Duration::from_secs(1));
        let Some(t) = get() else { continue };
        let left = t.at - now_ms();
        if left <= 0 {
            *TIMER.lock().unwrap() = None;
            emit("nook://power-timer", &None);
            crate::log::write("info", &format!("zamanlı kapatma vakti: {}", t.action));
            let r = match t.action.as_str() {
                "restart" => crate::remote::power::exit(true),
                "sleep" => crate::remote::power::sleep(),
                _ => crate::remote::power::exit(false),
            };
            if let Err(e) = r {
                crate::log::write("warn", &format!("zamanlı kapatma olmadı: {e}"));
            }
        } else if left <= WARN_BEFORE_MS && WARNED.swap(t.at, Ordering::Relaxed) != t.at {
            emit("nook://power-timer-warn", &Some(t));
        }
    });
}

#[tauri::command]
pub fn power_timer_get() -> Option<PowerTimer> {
    get()
}

#[tauri::command]
pub fn power_timer_set(at: Option<i64>, action: Option<String>) -> Result<Option<PowerTimer>, String> {
    set(at.map(|at| PowerTimer { at, action: action.unwrap_or_else(|| "shutdown".into()), from: "pc".into() }))
}
