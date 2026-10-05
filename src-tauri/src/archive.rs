//! Arşivin içine bakmak: adaya bırakılan .zip / .rar açılmadan listelenir; istenen dosya (ya da
//! klasör) geçici klasöre çıkarılıp oradan sürüklenir. Dışarıdan program çalıştırılmaz.
//! Çıkarılan yollar her zaman geçici klasörün içinde kalır (arşivdeki "../" yolları atlanır).

use std::fs;
use std::path::{Component, Path, PathBuf};

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    /// Arşivdeki yol, "/" ile ("klasör/alt/dosya.txt"); klasörlerde sonda "/" yok
    pub path: String,
    pub size: u64,
    pub dir: bool,
    pub encrypted: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Listing {
    pub kind: String,
    pub entries: Vec<Entry>,
}

fn kind_of(path: &Path) -> Option<&'static str> {
    match path.extension()?.to_str()?.to_ascii_lowercase().as_str() {
        "zip" => Some("zip"),
        "rar" => Some("rar"),
        _ => None,
    }
}

/// "a\\b/../c" gibi yolları güvenli "a/b/c" biçimine çevirir; dışarı çıkan ya da kök yolsa None.
fn clean(name: &str) -> Option<String> {
    let p = Path::new(name);
    let mut parts = Vec::new();
    for c in p.components() {
        match c {
            Component::Normal(s) => parts.push(s.to_string_lossy().replace('\\', "/")),
            Component::CurDir => {}
            _ => return None,
        }
    }
    (!parts.is_empty()).then(|| parts.join("/"))
}

/// Arşivin çıkarılacağı geçici klasör (arşivin yolu + değişme zamanına göre; aynı arşiv tekrar çıkarılmaz)
fn work_dir(archive: &Path) -> Result<PathBuf, String> {
    use std::hash::{Hash, Hasher};
    let meta = fs::metadata(archive).map_err(|e| e.to_string())?;
    let mut h = std::collections::hash_map::DefaultHasher::new();
    archive.hash(&mut h);
    meta.len().hash(&mut h);
    meta.modified().ok().hash(&mut h);
    let stem = archive.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| "arsiv".into());
    let dir = std::env::temp_dir().join("Nook").join("arsiv").join(format!("{:x}", h.finish())).join(stem);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

#[tauri::command]
pub async fn archive_list(path: String) -> Result<Listing, String> {
    let p = PathBuf::from(&path);
    let kind = kind_of(&p).ok_or("Desteklenmeyen arşiv")?;
    let mut entries = match kind {
        "zip" => zip_list(&p)?,
        _ => rar_list(&p)?,
    };
    // Arşivde klasör kaydı olmayan ara klasörleri de ekle (yalnızca "a/b/c.txt" yazılmış olabilir)
    let mut dirs: std::collections::BTreeSet<String> = entries.iter().filter(|e| e.dir).map(|e| e.path.clone()).collect();
    let files: Vec<String> = entries.iter().map(|e| e.path.clone()).collect();
    for f in files {
        let mut cur = f.as_str();
        while let Some(i) = cur.rfind('/') {
            cur = &cur[..i];
            if dirs.insert(cur.to_string()) {
                entries.push(Entry { path: cur.to_string(), size: 0, dir: true, encrypted: false });
            }
        }
    }
    entries.sort_by(|a, b| a.path.to_lowercase().cmp(&b.path.to_lowercase()));
    Ok(Listing { kind: kind.into(), entries })
}

/// `entry` dosyasını (klasörse içindekilerle birlikte) geçici klasöre çıkarır, yolunu döner.
#[tauri::command]
pub async fn archive_extract(path: String, entry: String) -> Result<String, String> {
    let p = PathBuf::from(&path);
    let kind = kind_of(&p).ok_or("Desteklenmeyen arşiv")?;
    let entry = clean(&entry).ok_or("Geçersiz yol")?;
    let base = work_dir(&p)?;
    let target = base.join(entry.replace('/', "\\"));
    // Daha önce çıkarıldıysa yeniden çıkarma (dosyalarda)
    if target.is_file() {
        return Ok(target.to_string_lossy().into_owned());
    }
    match kind {
        "zip" => zip_extract(&p, &entry, &base)?,
        _ => rar_extract(&p, &entry, &base)?,
    }
    if target.exists() {
        Ok(target.to_string_lossy().into_owned())
    } else {
        Err("Dosya çıkarılamadı".into())
    }
}

/// `entry` altındaki (ya da kendisi olan) yol mu
fn under(name: &str, entry: &str) -> bool {
    name == entry || name.starts_with(&format!("{entry}/"))
}

// ------------------------------------------------------------------ zip

fn zip_list(p: &Path) -> Result<Vec<Entry>, String> {
    let f = fs::File::open(p).map_err(|e| e.to_string())?;
    let mut z = zip::ZipArchive::new(f).map_err(|e| format!("ZIP okunamadı: {e}"))?;
    let mut out = Vec::new();
    for i in 0..z.len() {
        let Ok(f) = z.by_index_raw(i) else { continue };
        let Some(path) = clean(f.name()) else { continue };
        out.push(Entry { path, size: f.size(), dir: f.is_dir(), encrypted: f.encrypted() });
    }
    Ok(out)
}

fn zip_extract(p: &Path, entry: &str, base: &Path) -> Result<(), String> {
    let f = fs::File::open(p).map_err(|e| e.to_string())?;
    let mut z = zip::ZipArchive::new(f).map_err(|e| format!("ZIP okunamadı: {e}"))?;
    for i in 0..z.len() {
        let mut f = match z.by_index(i) {
            Ok(f) => f,
            Err(zip::result::ZipError::UnsupportedArchive(m)) => return Err(format!("Desteklenmiyor: {m}")),
            Err(e) => return Err(e.to_string()),
        };
        let Some(name) = clean(f.name()) else { continue };
        if !under(&name, entry) {
            continue;
        }
        let out = base.join(name.replace('/', "\\"));
        if f.is_dir() {
            fs::create_dir_all(&out).map_err(|e| e.to_string())?;
            continue;
        }
        if let Some(parent) = out.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut w = fs::File::create(&out).map_err(|e| e.to_string())?;
        std::io::copy(&mut f, &mut w).map_err(|e| if e.to_string().contains("password") { "Şifreli dosya".to_string() } else { e.to_string() })?;
    }
    Ok(())
}

// ------------------------------------------------------------------ rar

fn rar_list(p: &Path) -> Result<Vec<Entry>, String> {
    let archive = unrar::Archive::new(p).open_for_listing().map_err(|e| format!("RAR okunamadı: {e}"))?;
    let mut out = Vec::new();
    for e in archive {
        let Ok(h) = e else { continue };
        let Some(path) = clean(&h.filename.to_string_lossy()) else { continue };
        out.push(Entry { path, size: h.unpacked_size, dir: h.is_directory(), encrypted: h.is_encrypted() });
    }
    Ok(out)
}

fn rar_extract(p: &Path, entry: &str, base: &Path) -> Result<(), String> {
    let mut archive = unrar::Archive::new(p).open_for_processing().map_err(|e| format!("RAR okunamadı: {e}"))?;
    while let Some(h) = archive.read_header().map_err(|e| e.to_string())? {
        let name = clean(&h.entry().filename.to_string_lossy());
        archive = match name {
            Some(n) if under(&n, entry) => {
                let out = base.join(n.replace('/', "\\"));
                if h.entry().is_directory() {
                    let _ = fs::create_dir_all(&out);
                    h.skip().map_err(|e| e.to_string())?
                } else {
                    if let Some(parent) = out.parent() {
                        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                    }
                    if h.entry().is_encrypted() {
                        return Err("Şifreli dosya".into());
                    }
                    h.extract_to(&out).map_err(|e| e.to_string())?
                }
            }
            _ => h.skip().map_err(|e| e.to_string())?,
        };
    }
    Ok(())
}

