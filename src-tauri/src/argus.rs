//! Argus entegrasyonu — kullanıcının dizi/film arşivi (masaüstündeki `Argus` klasörü).
//!  - Okuma: Argus'un `data/` dosyalarından, Argus kapalıyken de. Ağır dosyalar (≈10 MB) bir kez
//!    okunup özetlenir; dosyalar değişmedikçe önbellekten döner.
//!  - Yazma: yalnızca Argus'un kendi yerel sunucusu (127.0.0.1:4000) üzerinden — böylece Argus'un
//!    "bütün bölümler izlendi → İzlendi yap", bildirim, izleme saati gibi kuralları aynen çalışır.
//!    Argus kapalıysa sunucusu görünmez başlatılır, iş bitince kapatılır.
//! Argus olmayan bilgisayarda hiçbir komut bir şey yapmaz (frontend bölümü gizler).

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime};

use serde::Serialize;
use serde_json::{json, Map, Value};
use tauri::{AppHandle, Manager};

const API: &str = "http://127.0.0.1:4000";
/// Görünmez başlatılan sunucunun hazır olmasını en fazla bu kadar bekle
const BOOT_WAIT: Duration = Duration::from_secs(20);
/// Takvimde kaç gün ileriye bakılır
const UPCOMING_DAYS: i64 = 14;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Ep {
    season: u32,
    episode: u32,
    name: String,
    date: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Series {
    /// Yayınlanmış bölüm sayısı ve bunlardan izlenenler
    aired: u32,
    seen: u32,
    /// En son izlenen bölümün sırası (1'den) — ilerleme çubuğu için
    position: u32,
    /// İzlenecek sıradaki (yayınlanmış, izlenmemiş ilk) bölüm
    next: Option<Ep>,
    /// En son yayınlanan bölüm (bugün çıktıysa "yeni bölüm")
    latest: Option<Ep>,
    /// Önümüzdeki günlerde çıkacak bölümler
    upcoming: Vec<Ep>,
    /// Son izleme günü (YYYY-MM-DD)
    last_seen: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    id: String,
    title: String,
    original: Option<String>,
    status: Option<String>,
    kind: Option<String>,
    genres: Vec<String>,
    release: Option<String>,
    runtime: Option<f64>,
    score: Option<f64>,
    /// Afişin dosya yolu (asset protokolüyle gösterilir)
    poster: Option<String>,
    /// Argus'un "son izlenenler" listesindeki zaman (ms)
    recent: Option<i64>,
    /// Filmler için izleme günleri
    watch_dates: Vec<String>,
    series: Option<Series>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    profiles: Vec<String>,
    /// Argus'un bulunduğu klasör
    dir: String,
    profile: String,
    profile_id: String,
    board_id: String,
    /// Argus şu an açık mı (yerel sunucusu cevap veriyor mu)
    running: bool,
    items: Vec<Item>,
    /// Gün → o gün izlenen bölüm sayısı (son 60 gün)
    episode_days: HashMap<String, u32>,
    /// Durum sütununun seçenekleri (Argus'taki sırayla) — izledikten sonra hangisi işaretlensin
    statuses: Vec<String>,
}

/// Yazmak için gereken sütun/seçenek kimlikleri
#[derive(Clone, Default)]
struct Meta {
    durum: Option<String>,
    izlendi: Option<String>,
    izleme: Option<String>,
    /// (seçenek kimliği, etiket)
    statuses: Vec<(String, String)>,
}

struct Cache {
    key: String,
    snap: Snapshot,
    meta: Meta,
}

static CACHE: Mutex<Option<Cache>> = Mutex::new(None);

/// Bir klasör Argus kök klasörü mü. data/ ilk profil açılınca oluşur — yeni kurulumda olmayabilir.
fn is_argus(d: &Path) -> bool {
    d.join("app").join("server").join("index.js").is_file() && d.join("app").join("package.json").is_file()
}

/// Kullanıcının elle seçtiği klasör (Ayarlar), bulunan klasör ve son tarama zamanı
static CUSTOM: Mutex<Option<PathBuf>> = Mutex::new(None);
static FOUND: Mutex<Option<PathBuf>> = Mutex::new(None);
static LAST_SCAN: Mutex<Option<Instant>> = Mutex::new(None);
static DISK_SCANNED: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
/// Bulunamazsa kısayol/işlem kontrolü en fazla bu sıklıkla tekrarlanır
const RESCAN: Duration = Duration::from_secs(600);

/// Argus nerede? Seçilen klasör › önceden bulunan › masaüstleri › kısayollar/çalışan Argus › kısa tarama.
pub fn argus_dir() -> Option<PathBuf> {
    if let Some(c) = CUSTOM.lock().unwrap().clone().filter(|c| is_argus(c)) {
        return Some(c);
    }
    if let Some(f) = FOUND.lock().unwrap().clone().filter(|f| is_argus(f)) {
        return Some(f);
    }
    let quick = desktops().into_iter().map(|d| d.join("Argus")).find(|d| is_argus(d));
    let found = quick.or_else(|| {
        let mut last = LAST_SCAN.lock().unwrap();
        if last.is_some_and(|t| t.elapsed() < RESCAN) {
            return None;
        }
        *last = Some(Instant::now());
        drop(last);
        // Disk taraması oturum başına bir kez: Argus'u olmayan bilgisayarda sürekli disk gezmesin
        from_shortcuts_and_processes().or_else(|| (!DISK_SCANNED.swap(true, std::sync::atomic::Ordering::Relaxed)).then(scan).flatten())
    })?;
    *FOUND.lock().unwrap() = Some(found.clone());
    Some(found)
}

/// Ayarlardan seçilen klasör (boş = otomatik)
pub fn set_custom(dir: Option<String>) {
    *CUSTOM.lock().unwrap() = dir.filter(|d| !d.trim().is_empty()).map(PathBuf::from);
}

/// Seçilen klasör (ya da onun içindeki/üstündeki) Argus mu — Ayarlar'daki "Klasörü seç" için
#[tauri::command]
pub fn argus_check_dir(dir: String) -> Option<String> {
    let p = PathBuf::from(dir);
    root_of(&p).or_else(|| ["Argus", "ARGUS"].iter().map(|n| p.join(n)).find(|d| is_argus(d))).map(|d| d.to_string_lossy().into_owned())
}

fn home() -> Option<PathBuf> {
    std::env::var_os("USERPROFILE").map(PathBuf::from)
}

/// Gerçek Masaüstü (OneDrive'a taşınmış olabilir) + bilinen yerler
fn desktops() -> Vec<PathBuf> {
    let mut out = Vec::new();
    #[cfg(windows)]
    {
        use winreg::enums::HKEY_CURRENT_USER;
        use winreg::RegKey;
        if let Ok(k) = RegKey::predef(HKEY_CURRENT_USER).open_subkey(r"Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders") {
            if let Ok(v) = k.get_value::<String, _>("Desktop") {
                let expanded = v.replace("%USERPROFILE%", &home().unwrap_or_default().to_string_lossy());
                out.push(PathBuf::from(expanded));
            }
        }
    }
    if let Some(h) = home() {
        out.push(h.join("Desktop"));
        for od in ["OneDrive", "OneDrive - Personal"] {
            out.push(h.join(od).join("Desktop"));
            out.push(h.join(od).join("Masaüstü"));
        }
    }
    out
}

/// Bir yoldan yukarı çıkarak Argus kökünü bul (ör. ...\Argus\app\launcher\baslat.ps1 → ...\Argus)
fn root_of(path: &Path) -> Option<PathBuf> {
    path.ancestors().take(7).find(|a| is_argus(a)).map(Path::to_path_buf)
}

/// Argus'un masaüstü/Başlat kısayolları (ARGUS.lnk) ve çalışan Argus işlemleri.
/// PowerShell/COM kullanmaz: gizli betik çalıştırmak antivirüslerde yanlış alarma yol açıyordu.
fn from_shortcuts_and_processes() -> Option<PathBuf> {
    shortcut_targets().into_iter().chain(running_exes()).find_map(|p| root_of(&p))
}

/// Adında "argus" geçen .lnk dosyalarının içindeki yollar (hedef ve çalışma klasörü .lnk'de düz metin durur)
fn shortcut_targets() -> Vec<PathBuf> {
    let mut dirs = desktops();
    let env = |k: &str| std::env::var_os(k).map(PathBuf::from);
    if let Some(p) = env("PUBLIC") {
        dirs.push(p.join("Desktop"));
    }
    if let Some(p) = env("APPDATA") {
        dirs.push(p.join(r"Microsoft\Windows\Start Menu\Programs"));
    }
    if let Some(p) = env("ProgramData") {
        dirs.push(p.join(r"Microsoft\Windows\Start Menu\Programs"));
    }
    let mut lnks = Vec::new();
    for d in dirs {
        let Ok(rd) = std::fs::read_dir(&d) else { continue };
        for e in rd.flatten() {
            let p = e.path();
            if p.is_dir() {
                if let Ok(sub) = std::fs::read_dir(&p) {
                    lnks.extend(sub.flatten().map(|e| e.path()));
                }
            } else {
                lnks.push(p);
            }
        }
    }
    let mut out = Vec::new();
    for l in lnks {
        let name = l.file_name().map(|n| n.to_string_lossy().to_lowercase()).unwrap_or_default();
        if !name.ends_with(".lnk") || !name.contains("argus") {
            continue;
        }
        if let Ok(bytes) = std::fs::read(&l) {
            out.extend(lnk_paths(&bytes));
        }
    }
    out
}

/// .lnk baytlarından "X:\..." biçimli yolları çıkarır (ANSI ve UTF-16 parçalar)
fn lnk_paths(bytes: &[u8]) -> Vec<PathBuf> {
    let mut texts: Vec<String> = Vec::new();
    let mut cur = String::new();
    for &b in bytes {
        if (0x20..0x7f).contains(&b) {
            cur.push(b as char);
        } else if !cur.is_empty() {
            texts.push(std::mem::take(&mut cur));
        }
    }
    texts.push(cur);
    let mut cur16: Vec<u16> = Vec::new();
    for ch in bytes.chunks_exact(2) {
        let u = u16::from_le_bytes([ch[0], ch[1]]);
        if u >= 0x20 && u != 0xffff && !(0xd800..0xe000).contains(&u) {
            cur16.push(u);
        } else if !cur16.is_empty() {
            texts.push(String::from_utf16_lossy(&std::mem::take(&mut cur16)));
        }
    }
    texts.push(String::from_utf16_lossy(&cur16));
    texts
        .into_iter()
        .filter_map(|t| {
            let i = t.find(":\\")?;
            let start = i.checked_sub(1)?;
            Some(PathBuf::from(t[start..].trim_matches('"').trim()))
        })
        .collect()
}

/// Çalışan electron/node işlemlerinin dosya yolları
#[cfg(windows)]
fn running_exes() -> Vec<PathBuf> {
    use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS};
    use windows_sys::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION};
    let mut out = Vec::new();
    unsafe {
        let snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snap == INVALID_HANDLE_VALUE {
            return out;
        }
        let mut e: PROCESSENTRY32W = std::mem::zeroed();
        e.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
        let mut ok = Process32FirstW(snap, &mut e) != 0;
        while ok {
            let len = e.szExeFile.iter().position(|&c| c == 0).unwrap_or(e.szExeFile.len());
            let name = String::from_utf16_lossy(&e.szExeFile[..len]).to_lowercase();
            if name == "electron.exe" || name == "node.exe" {
                let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, e.th32ProcessID);
                if !h.is_null() {
                    let mut buf = [0u16; 1024];
                    let mut n = buf.len() as u32;
                    if QueryFullProcessImageNameW(h, 0, buf.as_mut_ptr(), &mut n) != 0 {
                        out.push(PathBuf::from(String::from_utf16_lossy(&buf[..n as usize])));
                    }
                    CloseHandle(h);
                }
            }
            ok = Process32NextW(snap, &mut e) != 0;
        }
        CloseHandle(snap);
    }
    out
}

#[cfg(not(windows))]
fn running_exes() -> Vec<PathBuf> {
    Vec::new()
}

/// Belgeler, İndirilenler, ev klasörü ve sürücü köklerinde kısa tarama: kökün kendisi, alt klasörleri
/// ve adında "argus" geçen ikinci seviye klasörler.
fn scan() -> Option<PathBuf> {
    let mut roots: Vec<PathBuf> = Vec::new();
    if let Some(h) = home() {
        for d in ["Documents", "Downloads", "OneDrive", "source", "Projects", "Projeler"] {
            roots.push(h.join(d));
        }
        roots.push(h.clone());
    }
    roots.extend(desktops());
    for letter in b'C'..=b'Z' {
        let r = PathBuf::from(format!("{}:\\", letter as char));
        if r.is_dir() {
            roots.push(r);
        }
    }
    let skip = |n: &str| {
        let n = n.to_lowercase();
        n.starts_with('.')
            || ["appdata", "windows", "program files", "program files (x86)", "programdata", "$recycle.bin", "node_modules", "system volume information"].contains(&n.as_str())
    };
    for root in roots {
        if is_argus(&root) {
            return Some(root);
        }
        let Ok(level1) = std::fs::read_dir(&root) else { continue };
        for e in level1.flatten().filter(|e| e.path().is_dir()) {
            if skip(&e.file_name().to_string_lossy()) {
                continue;
            }
            let p = e.path();
            if is_argus(&p) {
                return Some(p);
            }
            if let Ok(level2) = std::fs::read_dir(&p) {
                for e2 in level2.flatten() {
                    if e2.file_name().to_string_lossy().to_lowercase().contains("argus") && is_argus(&e2.path()) {
                        return Some(e2.path());
                    }
                }
            }
        }
    }
    None
}

fn read_json(path: &Path) -> Option<Value> {
    serde_json::from_slice(&std::fs::read(path).ok()?).ok()
}

fn mtime(path: &Path) -> u128 {
    std::fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

fn s(v: &Value) -> Option<String> {
    match v {
        Value::String(x) if !x.trim().is_empty() => Some(x.trim().to_owned()),
        Value::Number(n) => Some(n.to_string()),
        _ => None,
    }
}

fn num(v: Option<&Value>) -> Option<f64> {
    match v? {
        Value::Number(n) => n.as_f64(),
        Value::String(x) => x.trim().replace(',', ".").parse().ok(),
        _ => None,
    }
}

/// "YYYY-MM-DD" + gün
fn add_days(day: &str, n: i64) -> String {
    let p: Vec<i64> = day.split('-').filter_map(|x| x.parse().ok()).collect();
    if p.len() != 3 {
        return day.to_owned();
    }
    // Gün sayısına çevir (proleptik Gregoryen), ekle, geri çevir
    let (y, m, d) = (p[0], p[1], p[2]);
    let a = (14 - m) / 12;
    let (yy, mm) = (y + 4800 - a, m + 12 * a - 3);
    let jdn = d + (153 * mm + 2) / 5 + 365 * yy + yy / 4 - yy / 100 + yy / 400 - 32045 + n;
    let a = jdn + 32044;
    let b = (4 * a + 3) / 146097;
    let c = a - 146097 * b / 4;
    let d2 = (4 * c + 3) / 1461;
    let e = c - 1461 * d2 / 4;
    let m2 = (5 * e + 2) / 153;
    let day = e - (153 * m2 + 2) / 5 + 1;
    let month = m2 + 3 - 12 * (m2 / 10);
    let year = 100 * b + d2 - 4800 + m2 / 10;
    format!("{year:04}-{month:02}-{day:02}")
}

fn profiles(dir: &Path) -> Vec<(String, String)> {
    read_json(&dir.join("data").join("profile.json"))
        .and_then(|v| v.as_array().cloned())
        .unwrap_or_default()
        .iter()
        .filter_map(|p| Some((s(p.get("id")?)?, s(p.get("username")?)?)))
        .collect()
}

fn options(prop: Option<&Value>) -> HashMap<String, String> {
    prop.and_then(|p| p.get("options"))
        .and_then(|o| o.as_array())
        .map(|a| a.iter().filter_map(|o| Some((s(o.get("id")?)?, s(o.get("label").or(o.get("name"))?)?))).collect())
        .unwrap_or_default()
}

/// Argus'un sütun görevleri (app/server/roles.js ile aynı tablo ve çözüm sırası:
/// açık kayıt → eski statMapping → varsayılan ad). (görev, türler, varsayılan ad, eski anahtar)
const ROLE_DEFS: &[(&str, &[&str], &str, Option<&str>)] = &[
    ("durum", &["select"], "Durum", Some("durumId")),
    ("kategori", &["select"], "Kategori", Some("kategoriId")),
    ("tur", &["multiselect", "select"], "Tür", Some("turId")),
    ("vizyon", &["date"], "Vizyon Tarihi", Some("vizyonId")),
    ("izlemeTarihi", &["multidate", "date"], "İzleme Tarihi", None),
    ("sure", &["number"], "Süre", Some("sureId")),
    ("puan", &["rating"], "Puan", Some("puanId")),
    ("orjinalAdi", &["text"], "Orjinal Adı", None),
    ("poster", &["image"], "Poster", None),
];

const STATUS_LABELS: [(&str, &str); 3] = [("izlenecek", "İzlenecek"), ("izleniyor", "İzleniyor"), ("izlendi", "İzlendi")];

fn same_name(a: &str, b: &str) -> bool {
    let n = |x: &str| x.trim().replace('İ', "i").replace('I', "ı").to_lowercase().replace('\u{307}', "");
    n(a) == n(b)
}

fn resolve_role<'a>(board: &'a Value, key: &str) -> Option<&'a Value> {
    let &(_, types, name, legacy) = ROLE_DEFS.iter().find(|d| d.0 == key)?;
    let props = board.get("properties")?.as_array()?;
    let typed = |p: &&Value| p.get("type").and_then(|t| t.as_str()).is_some_and(|t| types.contains(&t));
    let by_id = |id: &str| props.iter().find(|p| p.get("id").and_then(|v| v.as_str()) == Some(id));
    // null = kullanıcı bu görevi bilerek kapattı
    match board.pointer(&format!("/roles/{key}")) {
        Some(Value::Null) => return None,
        Some(Value::String(id)) => {
            if let Some(p) = by_id(id) {
                return typed(&p).then_some(p);
            }
        }
        _ => {}
    }
    if let Some(l) = legacy {
        match board.pointer(&format!("/statMapping/{l}")) {
            Some(Value::Null) => return None,
            Some(Value::String(id)) => {
                if let Some(p) = by_id(id).filter(typed) {
                    return Some(p);
                }
            }
            _ => {}
        }
    }
    props.iter().find(|p| typed(p) && same_name(p.get("name").and_then(|v| v.as_str()).unwrap_or(""), name))
}

/// Durum sütunundaki İzlenecek/İzleniyor/İzlendi seçeneğinin kimliği (önce statusOptions, sonra etiket)
fn status_option(board: &Value, durum: Option<&Value>, key: &str) -> Option<String> {
    let opts = durum?.get("options")?.as_array()?;
    let has = |id: &str| opts.iter().any(|o| o.get("id").and_then(|v| v.as_str()) == Some(id));
    if let Some(id) = board.pointer(&format!("/statusOptions/{key}")).and_then(|v| v.as_str()).filter(|id| has(id)) {
        return Some(id.to_owned());
    }
    let label = STATUS_LABELS.iter().find(|(k, _)| *k == key)?.1;
    opts.iter()
        .find(|o| same_name(o.get("label").or(o.get("name")).and_then(|v| v.as_str()).unwrap_or(""), label))
        .and_then(|o| s(o.get("id")?))
}

fn build(dir: &Path, pid: &str, pname: &str, all: Vec<String>, today: &str) -> Option<(Snapshot, Meta)> {
    let pdir = dir.join("data").join("profiles").join(pid);
    let boards = read_json(&pdir.join("boards.json"))?;
    // Medya arşivi: Durum sütunu çözülebilen ilk arşiv
    let board = boards.as_array()?.iter().find(|b| resolve_role(b, "durum").is_some())?;
    let board_id = s(board.get("id")?)?;
    let props: Vec<&Value> = board.get("properties")?.as_array()?.iter().collect();
    let by_name = |names: &[&str]| {
        props.iter().copied().find(|p| {
            let n = p.get("name").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
            names.iter().any(|x| n.contains(x))
        })
    };
    let role = |r: &str| resolve_role(board, r);
    let pid_of = |p: Option<&Value>| p.and_then(|p| s(p.get("id")?));

    let title_id = board
        .get("titlePropertyId")
        .and_then(|v| v.as_str())
        .map(str::to_owned)
        .or_else(|| props.iter().find(|p| p.get("type").and_then(|v| v.as_str()) == Some("title")).and_then(|p| s(p.get("id")?)))
        .unwrap_or_default();
    let original_id = pid_of(role("orjinalAdi").or_else(|| by_name(&["orjinal", "original", "orijinal"])));
    let durum = role("durum");
    let kategori = role("kategori");
    let tur = role("tur");
    let mut durum_opts = options(durum);
    let order: Vec<String> = durum
        .and_then(|d| d.get("options"))
        .and_then(|o| o.as_array())
        .map(|a| a.iter().filter_map(|o| s(o.get("id")?)).collect())
        .unwrap_or_default();
    // İzlenecek/İzleniyor/İzlendi seçenekleri farklı adlandırılmışsa (Argus'ta statusOptions) standart ada çevir
    for (key, label) in STATUS_LABELS {
        if let Some(id) = status_option(board, durum, key) {
            durum_opts.insert(id, label.to_owned());
        }
    }
    let statuses: Vec<(String, String)> = order.iter().filter_map(|id| Some((id.clone(), durum_opts.get(id)?.clone()))).collect();
    let kat_opts = options(kategori);
    let tur_opts = options(tur);
    let (durum_id, kat_id, tur_id) = (pid_of(durum), pid_of(kategori), pid_of(tur));
    let vizyon_id = pid_of(role("vizyon"));
    let sure_id = pid_of(role("sure"));
    let puan_id = pid_of(role("puan"));
    let izleme_id = pid_of(role("izlemeTarihi"));
    let poster_id = pid_of(role("poster").or_else(|| by_name(&["poster", "afiş"]))).or_else(|| board.get("coverPropertyId").and_then(s));
    let izlendi = status_option(board, durum, "izlendi");

    let rows = read_json(&pdir.join("rows").join(format!("{board_id}.json")))?;
    let episodes = read_json(&pdir.join("episodes.json")).unwrap_or(Value::Null);
    let watched = read_json(&pdir.join("watched.json")).unwrap_or(Value::Null);
    let recent: HashMap<String, i64> = read_json(&pdir.join("recent-watch.json"))
        .and_then(|v| v.as_array().cloned())
        .unwrap_or_default()
        .iter()
        .filter_map(|r| Some((s(r.get("rowId")?)?, r.get("t")?.as_i64()?)))
        .collect();
    let medya = dir.join("medya");
    let horizon = add_days(today, UPCOMING_DAYS);
    let since = add_days(today, -60);

    let mut episode_days: HashMap<String, u32> = HashMap::new();
    if let Some(w) = watched.as_object() {
        for eps in w.values().filter_map(|v| v.as_object()) {
            for dates in eps.values().filter_map(|v| v.as_array()) {
                for d in dates.iter().filter_map(|d| d.as_str()) {
                    if d >= since.as_str() {
                        *episode_days.entry(d.to_owned()).or_default() += 1;
                    }
                }
            }
        }
    }

    let mut items = Vec::new();
    for row in rows.as_array()? {
        let Some(id) = row.get("id").and_then(s) else { continue };
        let Some(vals) = row.get("values").and_then(|v| v.as_object()) else { continue };
        let get = |k: &Option<String>| k.as_ref().and_then(|k| vals.get(k));
        let Some(title) = vals.get(&title_id).and_then(s) else { continue };
        let label = |k: &Option<String>, opts: &HashMap<String, String>| get(k).and_then(|v| v.as_str()).and_then(|o| opts.get(o).cloned());
        let genres = get(&tur_id)
            .and_then(|v| v.as_array())
            .map(|a| a.iter().filter_map(|o| o.as_str().and_then(|o| tur_opts.get(o).cloned())).collect())
            .unwrap_or_default();
        let score = get(&puan_id).and_then(|v| match v {
            Value::Object(m) => {
                let xs: Vec<f64> = m.values().filter_map(|x| x.as_f64()).collect();
                (!xs.is_empty()).then(|| xs.iter().sum::<f64>() / xs.len() as f64)
            }
            other => num(Some(other)),
        });
        let poster = get(&poster_id)
            .and_then(|v| v.as_str())
            .and_then(|p| p.strip_prefix("/medya/"))
            .map(|f| medya.join(f).to_string_lossy().into_owned());
        let watch_dates = get(&izleme_id)
            .and_then(|v| v.as_array())
            .map(|a| a.iter().filter_map(|d| d.as_str().map(|d| d.rsplit('/').next().unwrap_or(d).to_owned())).collect())
            .unwrap_or_default();

        let series = episodes.get(&id).and_then(|v| v.as_array()).filter(|a| !a.is_empty()).map(|seasons| {
            let seen_map = watched.get(&id).and_then(|v| v.as_object());
            let is_seen = |k: &str| seen_map.and_then(|m| m.get(k)).and_then(|v| v.as_array()).is_some_and(|a| !a.is_empty());
            let last_seen = seen_map.and_then(|m| {
                m.values().filter_map(|v| v.as_array()).flatten().filter_map(|d| d.as_str()).max().map(str::to_owned)
            });
            let (mut aired, mut seen, mut latest, mut upcoming) = (0, 0, None, Vec::new());
            // Yayınlanmış bölümler sırayla: (bölüm, izlendi mi)
            let mut order: Vec<(Ep, bool)> = Vec::new();
            for season in seasons {
                let sn = season.get("seasonNumber").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                if sn < 1 {
                    continue;
                }
                for e in season.get("episodes").and_then(|v| v.as_array()).into_iter().flatten() {
                    let en = e.get("episodeNumber").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                    let date = e.get("airDate").and_then(s);
                    let ep = || Ep { season: sn, episode: en, name: e.get("name").and_then(s).unwrap_or_default(), date: date.clone() };
                    match date.as_deref() {
                        Some(d) if d <= today => {
                            aired += 1;
                            latest = Some(ep());
                            let w = is_seen(&format!("{sn}-{en}"));
                            seen += w as u32;
                            order.push((ep(), w));
                        }
                        Some(d) if d <= horizon.as_str() && upcoming.len() < 4 => upcoming.push(ep()),
                        _ => {}
                    }
                }
            }
            // Sıradaki bölüm: en son izlenen bölümden sonraki ilk izlenmemiş bölüm. Eski sezonların
            // tarihleri hatırlanmadığı için boş bırakılmış olabilir — onlar "sıradaki" sayılmaz.
            let last = order.iter().rposition(|(_, w)| *w);
            let from = last.map_or(0, |i| i + 1);
            let next = order[from..].iter().find(|(_, w)| !w).map(|(e, _)| e.clone());
            let position = last.map_or(0, |i| i as u32 + 1);
            Series { aired, seen, position, next, latest, upcoming, last_seen }
        });

        items.push(Item {
            original: get(&original_id).and_then(s).filter(|o| o != &title),
            title,
            status: label(&durum_id, &durum_opts),
            kind: label(&kat_id, &kat_opts),
            genres,
            release: get(&vizyon_id).and_then(s),
            runtime: num(get(&sure_id)),
            score,
            poster,
            recent: recent.get(&id).copied(),
            watch_dates,
            series,
            id,
        });
    }

    let snap = Snapshot {
        profiles: all,
        dir: dir.to_string_lossy().into_owned(),
        profile: pname.to_owned(),
        profile_id: pid.to_owned(),
        board_id,
        running: false,
        items,
        episode_days,
        statuses: statuses.iter().map(|(_, l)| l.clone()).collect(),
    };
    Some((snap, Meta { durum: durum_id, izlendi, izleme: izleme_id, statuses }))
}

fn server_up() -> bool {
    ureq::get(&format!("{API}/api/profiles")).timeout(Duration::from_millis(800)).call().is_ok()
}

/// Argus'un özeti. `profile`: kullanıcı adı (yoksa ilk profil). `today`: yerel gün (YYYY-MM-DD).
#[tauri::command]
pub async fn argus_snapshot(app: AppHandle, profile: Option<String>, today: String, dir: Option<String>) -> Option<Snapshot> {
    tauri::async_runtime::spawn_blocking(move || {
        set_custom(dir);
        let dir = argus_dir()?;
        let all = profiles(&dir);
        let want = profile.unwrap_or_default().to_lowercase();
        // Profil seçilmemişse (ya da yoksa) en son kullanılan profil
        let active = || {
            all.iter().max_by_key(|(id, _)| {
                let d = dir.join("data").join("profiles").join(id);
                mtime(&d.join("watched.json")).max(mtime(&d.join("recent-watch.json"))).max(mtime(&d.join("boards.json")))
            })
        };
        // Argus kurulu ama henüz profil/arşiv yok: boş özet (panel "Argus'u bir kez aç" der)
        let empty = || Snapshot {
            profiles: all.iter().map(|(_, n)| n.clone()).collect(),
            dir: dir.to_string_lossy().into_owned(),
            profile: String::new(),
            profile_id: String::new(),
            board_id: String::new(),
            running: server_up(),
            items: Vec::new(),
            episode_days: HashMap::new(),
            statuses: Vec::new(),
        };
        let Some((pid, pname)) = all.iter().find(|(_, n)| n.to_lowercase() == want).or_else(active).cloned() else {
            return Some(empty());
        };
        let pdir = dir.join("data").join("profiles").join(&pid);
        let key = format!(
            "{pid}|{today}|{}|{}|{}|{}|{}",
            mtime(&pdir.join("boards.json")),
            mtime(&pdir.join("rows")),
            mtime(&pdir.join("episodes.json")),
            mtime(&pdir.join("watched.json")),
            mtime(&pdir.join("recent-watch.json")),
        );
        // rows/ klasörünün kendisi dosya yazılınca her zaman değişmeyebilir — dosyaların en yenisi
        let rows_m = std::fs::read_dir(pdir.join("rows"))
            .map(|r| r.flatten().map(|e| mtime(&e.path())).max().unwrap_or(0))
            .unwrap_or(0);
        let key = format!("{key}|{rows_m}");

        let mut cache = CACHE.lock().unwrap();
        if cache.as_ref().map(|c| c.key != key).unwrap_or(true) {
            let Some((snap, meta)) = build(&dir, &pid, &pname, all.iter().map(|(_, n)| n.clone()).collect(), &today) else {
                return Some(empty());
            };
            // Afişler yalnızca bu klasörden okunabilsin
            let _ = app.asset_protocol_scope().allow_directory(dir.join("medya"), false);
            *cache = Some(Cache { key, snap, meta });
        }
        let mut snap = cache.as_ref()?.snap.clone();
        drop(cache);
        snap.running = server_up();
        Some(snap)
    })
    .await
    .ok()
    .flatten()
}

/// Argus kapalıysa sunucusunu görünmez başlatır; kapsam bitince (Drop) kapatır.
struct Server(Option<Child>);

impl Server {
    fn ensure(dir: &Path) -> Result<Self, String> {
        if server_up() {
            return Ok(Self(None));
        }
        let mut cmd = Command::new("node");
        cmd.arg("server/index.js").current_dir(dir.join("app"));
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }
        let child = cmd.spawn().map_err(|e| format!("Argus başlatılamadı (Node.js gerekli): {e}"))?;
        let server = Self(Some(child));
        let start = Instant::now();
        while start.elapsed() < BOOT_WAIT {
            if server_up() {
                return Ok(server);
            }
            std::thread::sleep(Duration::from_millis(300));
        }
        Err("Argus sunucusu açılmadı".into())
    }
}

impl Drop for Server {
    fn drop(&mut self) {
        if let Some(c) = self.0.as_mut() {
            let _ = c.kill();
            let _ = c.wait();
        }
    }
}

fn get_json(path: &str) -> Result<Value, String> {
    ureq::get(&format!("{API}{path}")).timeout(Duration::from_secs(10)).call().map_err(|e| e.to_string())?.into_json().map_err(|e| e.to_string())
}

fn put_json(path: &str, body: Value) -> Result<Value, String> {
    ureq::put(&format!("{API}{path}")).timeout(Duration::from_secs(10)).send_json(body).map_err(|e| e.to_string())?.into_json().map_err(|e| e.to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkResult {
    /// Argus diziyi kendiliğinden İzlendi yaptı
    completed: bool,
    /// Bu iş için Argus görünmez açıldı
    booted: bool,
}

/// Bir bölümü (season/episode) ya da filmi (ikisi de yoksa) bugün izlendi olarak işaretler.
#[tauri::command]
pub async fn argus_mark(row_id: String, season: Option<u32>, episode: Option<u32>, status: Option<String>, today: String) -> Result<MarkResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let dir = argus_dir().ok_or("Argus bulunamadı")?;
        let (pid, board_id, meta) = {
            let c = CACHE.lock().unwrap();
            let c = c.as_ref().ok_or("Argus henüz okunmadı")?;
            (c.snap.profile_id.clone(), c.snap.board_id.clone(), c.meta.clone())
        };
        // İstenen durum (etiket) → seçenek kimliği
        let status_id = match status.as_deref().filter(|l| !l.trim().is_empty()) {
            Some(l) => Some(meta.statuses.iter().find(|(_, x)| same_name(x, l)).map(|(id, _)| id.clone()).ok_or("Argus'ta bu durum yok")?),
            None => None,
        };
        let server = Server::ensure(&dir)?;
        let booted = server.0.is_some();
        // Kaydın değerlerini sunucudan alıp günceller
        let update_row = |f: &mut dyn FnMut(&mut Map<String, Value>, &mut Vec<String>)| -> Result<(), String> {
            let rows = get_json(&format!("/api/profiles/{pid}/boards/{board_id}/rows"))?;
            let row = rows.as_array().and_then(|a| a.iter().find(|r| r.get("id").and_then(|v| v.as_str()) == Some(&row_id))).ok_or("Kayıt bulunamadı")?;
            let mut values = row.get("values").and_then(|v| v.as_object().cloned()).unwrap_or_default();
            let mut changed = Vec::new();
            f(&mut values, &mut changed);
            put_json(&format!("/api/profiles/{pid}/boards/{board_id}/rows/{row_id}"), json!({ "values": values, "_changed": changed }))?;
            Ok(())
        };
        let completed = match (season, episode) {
            (Some(sn), Some(en)) => {
                let all = get_json(&format!("/api/profiles/{pid}/watched"))?;
                let mut row: Map<String, Value> = all.get(&row_id).and_then(|v| v.as_object().cloned()).unwrap_or_default();
                let key = format!("{sn}-{en}");
                let mut dates: Vec<Value> = row.get(&key).and_then(|v| v.as_array().cloned()).unwrap_or_default();
                if !dates.iter().any(|d| d.as_str() == Some(&today)) {
                    dates.push(Value::String(today.clone()));
                }
                row.insert(key, Value::Array(dates));
                let res = put_json(&format!("/api/profiles/{pid}/watched/{row_id}"), Value::Object(row))?;
                let auto = res.get("autoWatched").is_some_and(|v| !v.is_null());
                // Kullanıcının seçtiği durum, Argus'un kendiliğinden verdiğinin önüne geçer
                if let (Some(durum), Some(sid)) = (meta.durum.clone(), status_id.clone()) {
                    update_row(&mut |values, changed| {
                        values.insert(durum.clone(), Value::String(sid.clone()));
                        changed.push(durum.clone());
                    })?;
                }
                auto
            }
            _ => {
                let (Some(durum), Some(sid)) = (meta.durum.clone(), status_id.clone().or(meta.izlendi.clone())) else {
                    return Err("Argus'ta Durum sütunu bulunamadı".into());
                };
                update_row(&mut |values, changed| {
                    values.insert(durum.clone(), Value::String(sid.clone()));
                    changed.push(durum.clone());
                    // İzlediği gün izleme tarihine yazılır (tekrar izlemede yeni tarih eklenir)
                    if let Some(iz) = meta.izleme.clone() {
                        let mut dates: Vec<Value> = values.get(&iz).and_then(|v| v.as_array().cloned()).unwrap_or_default();
                        if !dates.iter().any(|d| d.as_str() == Some(&today)) {
                            dates.push(Value::String(today.clone()));
                        }
                        values.insert(iz.clone(), Value::Array(dates));
                        changed.push(iz);
                    }
                })?;
                Some(&sid) == meta.izlendi.as_ref()
            }
        };
        // Bir sonraki özet dosyalardan yeniden okunsun
        drop(server);
        Ok(MarkResult { completed, booted })
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Argus'u kurar: Argus'un kendi kurulum betiği (Git yoksa kurar, Argus'u masaüstüne indirir,
/// kısayol ekler, ilk kez açar) görünür bir pencerede çalışır — soru sorarsa kullanıcı cevaplar.
#[tauri::command]
pub fn argus_install() -> Result<(), String> {
    if argus_dir().is_some() {
        return Err("Argus zaten kurulu".into());
    }
    let bat = std::env::temp_dir().join("ARGUS Kur.bat");
    std::fs::write(&bat, include_bytes!("../argus-kur.bat")).map_err(|e| e.to_string())?;
    Command::new("cmd").args(["/c", "start", "ARGUS Kurulum"]).arg(&bat).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

/// Argus uygulamasını açar (zaten açıksa false döner).
#[tauri::command]
pub fn argus_open() -> Result<bool, String> {
    let dir = argus_dir().ok_or("Argus bulunamadı")?;
    if server_up() {
        return Ok(false);
    }
    crate::shell::open_path(dir.join("ARGUS.exe").to_string_lossy().into_owned())?;
    Ok(true)
}







/// İzlenen dizi/film kartı: adanın sağında ayrı, tıklanamaz küçük pencere.
/// `x`, `y`: çağıran ada penceresine göre mantıksal konum.
pub const CARD: &str = "argus-card";
pub const CARD_W: f64 = 184.0;
pub const CARD_H: f64 = 360.0;

/// Pencere oluşturduğu için async olmalı: senkron komutta Windows'ta kilitlenir (wry#583).
#[tauri::command]
pub async fn argus_card(window: tauri::WebviewWindow, show: bool, x: f64, y: f64) -> Result<(), String> {
    let r = card_inner(&window, show, x, y);
    if let Err(e) = &r {
        crate::log::write("warn", &format!("argus kartı: {e}"));
    }
    r
}

fn card_inner(window: &tauri::WebviewWindow, show: bool, x: f64, y: f64) -> Result<(), String> {
    let app = window.app_handle();
    if !show {
        if let Some(c) = app.get_webview_window(CARD) {
            c.hide().map_err(|e| e.to_string())?;
        }
        return Ok(());
    }
    let pos = window.outer_position().map_err(|e| e.to_string())?;
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let at = tauri::PhysicalPosition::new(pos.x + (x * scale).round() as i32, pos.y + (y * scale).round() as i32);
    let card = match app.get_webview_window(CARD) {
        Some(c) => c,
        None => {
            // Görünür oluşturulmalı (gizli oluşturulan WebView2 içeriği geç/eksik açabiliyor); doğrudan yerinde
            let c = tauri::WebviewWindowBuilder::new(app, CARD, tauri::WebviewUrl::App("index.html".into()))
                .position(at.x as f64 / scale, at.y as f64 / scale)
                .title("Nook")
                .inner_size(CARD_W, CARD_H)
                .resizable(false)
                .maximizable(false)
                .minimizable(false)
                .decorations(false)
                .transparent(true)
                .shadow(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .focused(false)
                .visible(true)
                .build()
                .map_err(|e| e.to_string())?;
            c.set_ignore_cursor_events(true).map_err(|e| e.to_string())?;
            c
        }
    };
    card.set_position(at).map_err(|e| e.to_string())?;
    if !card.is_visible().unwrap_or(false) {
        card.show().map_err(|e| e.to_string())?;
    }
    Ok(())
}
