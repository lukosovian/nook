//! Windows bildirimleri: Windows'un kendi bildirim veritabanını (wpndatabase.db) salt okunur
//! izler; yeni gelen her "toast" için uygulama adı, başlık, metin ve ikon → "nook://notification".
//! Hiçbir şeye yazmaz, bildirimleri silmez; Windows'un kendi bildirimi de yine gösterilir.

use std::path::PathBuf;
use std::sync::atomic::{AtomicU8, Ordering};
use std::thread;
use std::time::Duration;

use rusqlite::{Connection, OpenFlags};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::imaging;

const POLL: Duration = Duration::from_millis(1500);

/// Windows'un bildirim kaydı okunabiliyor mu: 0 = henüz bilinmiyor, 1 = evet, 2 = hayır.
/// Panel "bildirim yok" ile "okuyamıyorum"u ayırabilsin diye.
static STATUS: AtomicU8 = AtomicU8::new(0);

/// Bildirim kaydı okunabiliyor mu (henüz denenmediyse null)
#[tauri::command]
pub fn notify_status() -> Option<bool> {
    match STATUS.load(Ordering::Relaxed) {
        1 => Some(true),
        2 => Some(false),
        _ => None,
    }
}

/// Nook'un zaten kendisi gösterdiği ya da gürültü olan kaynaklar.
const SKIP: &[&str] = &["ScreenSketch", "app.nook.island", "Windows.SystemToast.Share", "Windows.SystemToast.AutoPlay"];

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
    id: i64,
    app: String,
    app_id: String,
    title: String,
    body: String,
    icon: Option<String>,
}

fn db_path() -> Option<PathBuf> {
    let p = PathBuf::from(std::env::var_os("LOCALAPPDATA")?).join("Microsoft\\Windows\\Notifications\\wpndatabase.db");
    p.is_file().then_some(p)
}

pub fn spawn(app: AppHandle) {
    thread::Builder::new()
        .name("nook-notify".into())
        .spawn(move || {
            let Some(path) = db_path() else {
                STATUS.store(2, Ordering::Relaxed);
                return;
            };
            let mut last: Option<i64> = None;
            let mut conn: Option<Connection> = None;
            // Kilit gibi geçici hatalarda hemen "okunamıyor" denmesin: art arda birkaç kez olursa
            let mut fails = 0u32;
            let fail = |fails: &mut u32| {
                *fails += 1;
                if *fails >= 3 {
                    STATUS.store(2, Ordering::Relaxed);
                }
            };
            loop {
                thread::sleep(POLL);
                if conn.is_none() {
                    conn = Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX).ok();
                }
                let Some(c) = &conn else {
                    fail(&mut fails);
                    continue;
                };
                match poll(c, &mut last) {
                    Ok(items) => {
                        fails = 0;
                        STATUS.store(1, Ordering::Relaxed);
                        for n in items {
                            let _ = app.emit("nook://notification", n);
                        }
                    }
                    // Veritabanı kilitli/yeniden oluşturulmuş olabilir — bir sonraki turda yeniden aç
                    Err(_) => {
                        fail(&mut fails);
                        conn = None;
                    }
                }
            }
        })
        .expect("notify thread başlatılamadı");
}

fn poll(c: &Connection, last: &mut Option<i64>) -> rusqlite::Result<Vec<Notification>> {
    let max: i64 = c.query_row("SELECT IFNULL(MAX(Id), 0) FROM Notification", [], |r| r.get(0))?;
    // İlk turda eski bildirimleri gösterme; yalnızca bundan sonra gelenler
    let Some(prev) = *last else {
        *last = Some(max);
        return Ok(vec![]);
    };
    if max <= prev {
        // Veritabanı temizlendiyse kimlikler küçülebilir
        if max < prev {
            *last = Some(max);
        }
        return Ok(vec![]);
    }
    let mut stmt = c.prepare(
        "SELECT n.Id, h.PrimaryId, n.Payload FROM Notification n JOIN NotificationHandler h ON h.RecordId = n.HandlerId \
         WHERE n.Type = 'toast' AND n.Id > ?1 ORDER BY n.Id LIMIT 10",
    )?;
    let rows = stmt.query_map([prev], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, Vec<u8>>(2)?)))?;
    let mut out = Vec::new();
    for row in rows.flatten() {
        let (id, app_id, payload) = row;
        if SKIP.iter().any(|s| app_id.contains(s)) {
            continue;
        }
        let texts = texts(&String::from_utf8_lossy(&payload));
        let Some(title) = texts.first().cloned() else { continue };
        out.push(Notification {
            id,
            app: imaging::app_name(&app_id),
            icon: imaging::icon(&format!("shell:AppsFolder\\{app_id}"), 32),
            app_id,
            title,
            body: texts[1..].join(" · "),
        });
    }
    *last = Some(max);
    Ok(out)
}

/// Toast XML'indeki <text> öğelerinin içeriği (sıradan ve boş olmayan).
fn texts(xml: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut rest = xml;
    while let Some(start) = rest.find("<text") {
        rest = &rest[start + 5..];
        // "<texts" gibi başka bir etiket değil
        if !rest.starts_with(['>', ' ', '\t', '\r', '\n']) {
            continue;
        }
        let Some(open_end) = rest.find('>') else { break };
        if rest[..open_end].ends_with('/') {
            rest = &rest[open_end + 1..];
            continue;
        }
        rest = &rest[open_end + 1..];
        let Some(close) = rest.find("</text>") else { break };
        let t = unescape(rest[..close].trim());
        if !t.is_empty() {
            out.push(t);
        }
        rest = &rest[close + 7..];
    }
    out
}

fn unescape(s: &str) -> String {
    s.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&apos;", "'").replace("&#39;", "'").replace("&amp;", "&")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_texts() {
        let xml = r#"<toast><visual><binding template="ToastGeneric"><text id="1">Ali</text><text>Selam &amp; naber</text><text/></binding></visual></toast>"#;
        assert_eq!(texts(xml), vec!["Ali".to_string(), "Selam & naber".to_string()]);
    }
}
