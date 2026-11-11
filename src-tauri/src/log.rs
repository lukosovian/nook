//! Hata ve olay günlüğü: %LOCALAPPDATA%\Nook\logs\2026-11-03.log — her gün ayrı dosya, satır başında
//! saat (dakika, saniye). Ayarlardaki süreden (varsayılan 14 gün) eski günler silinir.
//! Ön yüzün uyarı/hataları, Rust tarafındaki önemli olaylar, çökmeler ve donmalar buraya yazılır —
//! kullanıcının bilgisayarında bir şey "hiç olmadı" dediğinde nedenini görebilmek için.

use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{mpsc, Mutex, MutexGuard};
use std::thread;
use std::time::{Duration, Instant, SystemTime};

use tauri::AppHandle;

/// Bir günün dosyası bundan büyükse yalnızca uyarı ve hatalar yazılır (bir şey çıldırıp günlüğü şişirmesin)
const DAY_MAX_BYTES: u64 = 8 * 1024 * 1024;
static KEEP_DAYS: AtomicU32 = AtomicU32::new(14);
/// Son yazılan gün; gün değişince eski dosyalar temizlenir
static LOCK: Mutex<String> = Mutex::new(String::new());

fn root() -> Option<PathBuf> {
    Some(PathBuf::from(std::env::var_os("LOCALAPPDATA")?).join("Nook"))
}

fn dir() -> Option<PathBuf> {
    Some(root()?.join("logs"))
}

/// Yerel tarih ("2026-11-03") ve saat ("19:35:14")
fn now() -> (String, String) {
    #[cfg(windows)]
    {
        use windows_sys::Win32::System::SystemInformation::GetLocalTime;
        let mut t = unsafe { std::mem::zeroed() };
        unsafe { GetLocalTime(&mut t) };
        (format!("{:04}-{:02}-{:02}", t.wYear, t.wMonth, t.wDay), format!("{:02}:{:02}:{:02}", t.wHour, t.wMinute, t.wSecond))
    }
    #[cfg(not(windows))]
    {
        (String::from("0000-00-00"), String::from("00:00:00"))
    }
}

fn label(level: &str) -> &str {
    match level {
        "info" => "bilgi",
        "warn" => "uyarı",
        "error" => "HATA",
        other => other,
    }
}

pub fn write(level: &str, msg: &str) {
    write_locked(LOCK.lock().unwrap_or_else(|e| e.into_inner()), level, msg);
}

fn write_locked(mut day: MutexGuard<'_, String>, level: &str, msg: &str) {
    let Some(dir) = dir() else { return };
    let (date, time) = now();
    if *day != date {
        let _ = std::fs::create_dir_all(&dir);
        if day.is_empty() {
            migrate_old(&dir);
        }
        prune(&dir);
        *day = date.clone();
    }
    let p = dir.join(format!("{date}.log"));
    if level == "info" && std::fs::metadata(&p).is_ok_and(|m| m.len() > DAY_MAX_BYTES) {
        return;
    }
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&p) {
        let _ = writeln!(f, "{time}  {:<5}  {}", label(level), msg.replace(['\r', '\n'], " | "));
    }
}

/// Eski tek dosyalık günlük (nook.log) klasöre taşınır; süresi dolunca o da silinir
fn migrate_old(dir: &std::path::Path) {
    if let Some(old) = root().map(|r| r.join("nook.log")).filter(|p| p.exists()) {
        let _ = std::fs::rename(&old, dir.join("eski-nook.log"));
    }
}

/// Son değişikliği ayardaki günden eski olan günlük dosyalarını siler
fn prune(dir: &std::path::Path) {
    let keep = Duration::from_secs(u64::from(KEEP_DAYS.load(Ordering::Relaxed)) * 86_400);
    let Ok(entries) = std::fs::read_dir(dir) else { return };
    for e in entries.flatten() {
        let path = e.path();
        if path.extension().is_none_or(|x| x != "log") {
            continue;
        }
        let old = e.metadata().and_then(|m| m.modified()).ok().and_then(|t| SystemTime::now().duration_since(t).ok()).is_some_and(|age| age > keep);
        if old {
            let _ = std::fs::remove_file(&path);
        }
    }
}

/// Ayarlardan: günlükler kaç gün saklansın
pub fn set_keep_days(days: u32) {
    let days = days.clamp(1, 365);
    if KEEP_DAYS.swap(days, Ordering::Relaxed) != days {
        let _guard = LOCK.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(d) = dir() {
            prune(&d);
        }
    }
}

/// Rust tarafı çökerse (panic) nedeni ve yeri günlüğe yazılır
pub fn install_panic_hook() {
    let default = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let thread = thread::current().name().unwrap_or("?").to_owned();
        // Günlük yazarken çöktüyse kilit bizde olabilir; beklemeden geç
        if let Ok(guard) = LOCK.try_lock() {
            write_locked(guard, "error", &format!("ÇÖKTÜ ({thread}): {info}"));
        }
        default(info);
    }));
}

/// Ana iş parçacığı (pencereler, tepsi) donarsa günlüğe yazar: kaç saniye yanıt vermedi
pub fn watch_main_thread(app: AppHandle) {
    let _ = thread::Builder::new().name("nook-watchdog".into()).spawn(move || loop {
        thread::sleep(Duration::from_secs(5));
        let (tx, rx) = mpsc::channel();
        let t0 = Instant::now();
        if app.run_on_main_thread(move || {
            let _ = tx.send(());
        }).is_err() {
            return;
        }
        if rx.recv_timeout(Duration::from_secs(5)).is_err() {
            write("warn", "DONMA: ana iş parçacığı 5 sn'dir yanıt vermiyor (pencereler takılmış olabilir)");
            if rx.recv().is_err() {
                return;
            }
            write("warn", &format!("DONMA bitti: ana iş parçacığı {} sn sonra yeniden yanıt verdi", t0.elapsed().as_secs()));
        }
    });
}

#[tauri::command]
pub fn log_line(level: String, msg: String) {
    write(&level, &msg.chars().take(2000).collect::<String>());
}

/// Günlük klasörü (Studio'daki "Klasörü aç" için)
#[tauri::command]
pub fn log_dir() -> String {
    dir().map(|d| d.to_string_lossy().into_owned()).unwrap_or_default()
}

/// Geribildirim formuna eklemek için son günlük satırlarını okur (varsayılan son 25 satır), en yeni günden geriye
#[tauri::command(async)]
pub fn recent_logs(max: Option<usize>) -> Vec<String> {
    let _guard = LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let limit = max.unwrap_or(25).clamp(1, 100);
    let Some(dir) = dir() else { return Vec::new() };
    let Ok(entries) = std::fs::read_dir(&dir) else { return Vec::new() };
    let mut days: Vec<String> = entries
        .flatten()
        .filter_map(|e| e.file_name().into_string().ok())
        .filter(|n| n.ends_with(".log") && n.starts_with(|c: char| c.is_ascii_digit()))
        .collect();
    days.sort_unstable_by(|a, b| b.cmp(a));
    let mut out: Vec<String> = Vec::new();
    for name in days {
        let Ok(raw) = std::fs::read_to_string(dir.join(&name)) else { continue };
        let date = name.trim_end_matches(".log");
        let lines: Vec<String> = raw.lines().filter(|l| !l.trim().is_empty()).map(|l| format!("{date} {l}")).collect();
        let take = (limit - out.len()).min(lines.len());
        out.splice(0..0, lines[lines.len() - take..].iter().cloned());
        if out.len() >= limit {
            break;
        }
    }
    out
}
