//! Basit hata günlüğü: %LOCALAPPDATA%\Nook\nook.log (en fazla ~1 MB, dolunca baştan).
//! Ön yüzün uyarı/hataları ve Rust tarafındaki önemli olaylar buraya yazılır —
//! kullanıcının bilgisayarında bir şey "hiç olmadı" dediğinde nedenini görebilmek için.

use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_BYTES: u64 = 1024 * 1024;
static LOCK: Mutex<()> = Mutex::new(());

fn path() -> Option<PathBuf> {
    Some(PathBuf::from(std::env::var_os("LOCALAPPDATA")?).join("Nook").join("nook.log"))
}

pub fn write(level: &str, msg: &str) {
    let _guard = LOCK.lock().unwrap();
    let Some(p) = path() else { return };
    if let Some(dir) = p.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    if std::fs::metadata(&p).is_ok_and(|m| m.len() > MAX_BYTES) {
        let _ = std::fs::remove_file(&p);
    }
    let secs = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&p) {
        let _ = writeln!(f, "[{secs}] {level}: {}", msg.replace('\n', " | "));
    }
}

#[tauri::command]
pub fn log_line(level: String, msg: String) {
    write(&level, &msg.chars().take(2000).collect::<String>());
}
