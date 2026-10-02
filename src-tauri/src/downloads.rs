//! İndirme takibi: İndirilenler klasöründeki tarayıcı geçici dosyalarını izler
//! (Chrome/Edge/Opera/Brave: .crdownload, Firefox: .part). Büyüme hızından indirme hızı çıkar;
//! indirme bitince son dosya "nook://download-done" ile bildirilir (rafa düşer).

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::thread;
use std::time::{Duration, Instant, SystemTime};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

const POLL: Duration = Duration::from_millis(700);
const TEMP_EXTS: &[&str] = &["crdownload", "part", "opdownload", "partial", "download"];
/// Bitmiş dosyanın "yeni" sayılması için en fazla bu kadar eski olması gerekir.
const FRESH: Duration = Duration::from_secs(60);

#[derive(Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct Active {
    id: String,
    name: String,
    received: u64,
    /// bayt/sn (yumuşatılmış)
    speed: u64,
}

struct Track {
    size: u64,
    at: Instant,
    speed: f64,
}

fn is_temp(p: &Path) -> bool {
    p.extension().is_some_and(|e| TEMP_EXTS.contains(&e.to_string_lossy().to_lowercase().as_str()))
}

/// "rapor.pdf.crdownload" → "rapor.pdf"; Chrome'un "Unconfirmed 1234.crdownload" → "İndiriliyor…"
fn display_name(p: &Path) -> String {
    let stem = p.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_default();
    if stem.starts_with("Unconfirmed ") || stem.starts_with(".com.google.Chrome") {
        "İndiriliyor…".into()
    } else {
        stem
    }
}

fn list(dir: &Path) -> Vec<PathBuf> {
    std::fs::read_dir(dir).map(|rd| rd.flatten().map(|e| e.path()).filter(|p| p.is_file()).collect()).unwrap_or_default()
}

fn is_fresh(p: &Path) -> bool {
    std::fs::metadata(p)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| SystemTime::now().duration_since(t).ok())
        .is_some_and(|age| age < FRESH)
}

pub fn spawn(app: AppHandle) {
    let Ok(dir) = app.path().download_dir() else { return };
    thread::Builder::new()
        .name("nook-downloads".into())
        .spawn(move || {
            let mut tracks: HashMap<PathBuf, Track> = HashMap::new();
            let mut seen: HashSet<PathBuf> = list(&dir).into_iter().filter(|p| !is_temp(p)).collect();
            // Firefox son dosyayı 0 baytla önceden oluşturur; .part bitene kadar bekle.
            let mut pending: HashSet<PathBuf> = HashSet::new();
            let mut last: Vec<Active> = Vec::new();

            loop {
                thread::sleep(POLL);
                let files = list(&dir);
                let now = Instant::now();

                // --- Süren indirmeler
                let temps: Vec<&PathBuf> = files.iter().filter(|p| is_temp(p)).collect();
                tracks.retain(|p, _| temps.contains(&p));
                let mut active = Vec::new();
                for p in &temps {
                    let size = std::fs::metadata(p).map(|m| m.len()).unwrap_or(0);
                    let t = tracks.entry((*p).clone()).or_insert(Track { size, at: now, speed: 0.0 });
                    let dt = now.duration_since(t.at).as_secs_f64();
                    if dt > 0.0 {
                        let instant = size.saturating_sub(t.size) as f64 / dt;
                        t.speed = t.speed * 0.6 + instant * 0.4;
                    }
                    t.size = size;
                    t.at = now;
                    active.push(Active { id: p.to_string_lossy().into_owned(), name: display_name(p), received: size, speed: t.speed as u64 });
                }
                if active != last {
                    let _ = app.emit("nook://downloads", &active);
                    last = active;
                }

                // --- Biten indirmeler
                for p in files.iter().filter(|p| !is_temp(p)) {
                    if seen.insert(p.clone()) && is_fresh(p) {
                        pending.insert(p.clone());
                    }
                }
                let temp_names: HashSet<String> = temps.iter().filter_map(|p| p.file_stem().map(|s| s.to_string_lossy().into_owned())).collect();
                pending.retain(|p| {
                    if !p.exists() {
                        return false;
                    }
                    let name = p.file_name().map(|s| s.to_string_lossy().into_owned()).unwrap_or_default();
                    let still_downloading = temp_names.contains(&name);
                    let size = std::fs::metadata(p).map(|m| m.len()).unwrap_or(0);
                    if !still_downloading && size > 0 {
                        let _ = app.emit("nook://download-done", p.to_string_lossy().to_string());
                        return false;
                    }
                    true
                });
                seen.retain(|p| p.exists());
            }
        })
        .expect("downloads thread başlatılamadı");
}
