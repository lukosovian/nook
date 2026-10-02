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
    profile: String,
    profile_id: String,
    board_id: String,
    /// Argus şu an açık mı (yerel sunucusu cevap veriyor mu)
    running: bool,
    items: Vec<Item>,
    /// Gün → o gün izlenen bölüm sayısı (son 60 gün)
    episode_days: HashMap<String, u32>,
}

/// Yazmak için gereken sütun/seçenek kimlikleri
#[derive(Clone, Default)]
struct Meta {
    durum: Option<String>,
    izlendi: Option<String>,
    izleme: Option<String>,
}

struct Cache {
    key: String,
    snap: Snapshot,
    meta: Meta,
}

static CACHE: Mutex<Option<Cache>> = Mutex::new(None);

pub fn argus_dir() -> Option<PathBuf> {
    let home = PathBuf::from(std::env::var_os("USERPROFILE")?);
    let mut roots = vec![home.join("Desktop")];
    for od in ["OneDrive", "OneDrive - Personal"] {
        roots.push(home.join(od).join("Desktop"));
        roots.push(home.join(od).join("Masaüstü"));
    }
    roots
        .into_iter()
        .map(|r| r.join("Argus"))
        .find(|d| d.join("data").join("profile.json").is_file() && d.join("app").join("server").join("index.js").is_file())
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

fn build(dir: &Path, pid: &str, pname: &str, all: Vec<String>, today: &str) -> Option<(Snapshot, Meta)> {
    let pdir = dir.join("data").join("profiles").join(pid);
    let boards = read_json(&pdir.join("boards.json"))?;
    // Medya arşivi: "durum" rolü olan ilk arşiv
    let board = boards.as_array()?.iter().find(|b| b.pointer("/roles/durum").is_some())?;
    let board_id = s(board.get("id")?)?;
    let props: Vec<&Value> = board.get("properties")?.as_array()?.iter().collect();
    let by_id = |id: &str| props.iter().copied().find(|p| p.get("id").and_then(|v| v.as_str()) == Some(id));
    let by_name = |names: &[&str]| {
        props.iter().copied().find(|p| {
            let n = p.get("name").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
            names.iter().any(|x| n.contains(x))
        })
    };
    let role = |r: &str| board.pointer(&format!("/roles/{r}")).and_then(|v| v.as_str()).and_then(by_id);
    let pid_of = |p: Option<&Value>| p.and_then(|p| s(p.get("id")?));

    let title_id = board.get("titlePropertyId").and_then(|v| v.as_str()).unwrap_or("").to_owned();
    let original_id = pid_of(by_name(&["orjinal", "original", "orijinal"]));
    let durum = role("durum");
    let kategori = role("kategori");
    let tur = role("tur");
    let durum_opts = options(durum);
    let kat_opts = options(kategori);
    let tur_opts = options(tur);
    let (durum_id, kat_id, tur_id) = (pid_of(durum), pid_of(kategori), pid_of(tur));
    let vizyon_id = pid_of(role("vizyon"));
    let sure_id = pid_of(role("sure"));
    let puan_id = pid_of(role("puan"));
    let izleme_id = pid_of(role("izlemeTarihi"));
    let poster_id = pid_of(by_name(&["poster", "afiş"])).or_else(|| board.get("coverPropertyId").and_then(s));
    let izlendi = durum_opts.iter().find(|(_, l)| l.to_lowercase().replace('\u{307}', "") == "izlendi").map(|(k, _)| k.clone());

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
            let (mut aired, mut seen, mut next, mut latest, mut upcoming) = (0, 0, None, None, Vec::new());
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
                            if is_seen(&format!("{sn}-{en}")) {
                                seen += 1;
                            } else if next.is_none() {
                                next = Some(ep());
                            }
                        }
                        Some(d) if d <= horizon.as_str() && upcoming.len() < 4 => upcoming.push(ep()),
                        _ => {}
                    }
                }
            }
            Series { aired, seen, next, latest, upcoming, last_seen }
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
        profile: pname.to_owned(),
        profile_id: pid.to_owned(),
        board_id,
        running: false,
        items,
        episode_days,
    };
    Some((snap, Meta { durum: durum_id, izlendi, izleme: izleme_id }))
}

fn server_up() -> bool {
    ureq::get(&format!("{API}/api/profiles")).timeout(Duration::from_millis(800)).call().is_ok()
}

/// Argus'un özeti. `profile`: kullanıcı adı (yoksa ilk profil). `today`: yerel gün (YYYY-MM-DD).
#[tauri::command]
pub async fn argus_snapshot(app: AppHandle, profile: Option<String>, today: String) -> Option<Snapshot> {
    tauri::async_runtime::spawn_blocking(move || {
        let dir = argus_dir()?;
        let all = profiles(&dir);
        let want = profile.unwrap_or_default().to_lowercase();
        let (pid, pname) = all.iter().find(|(_, n)| n.to_lowercase() == want).or(all.first()).cloned()?;
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
            let (snap, meta) = build(&dir, &pid, &pname, all.iter().map(|(_, n)| n.clone()).collect(), &today)?;
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
pub async fn argus_mark(row_id: String, season: Option<u32>, episode: Option<u32>, today: String) -> Result<MarkResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let dir = argus_dir().ok_or("Argus bulunamadı")?;
        let (pid, board_id, meta) = {
            let c = CACHE.lock().unwrap();
            let c = c.as_ref().ok_or("Argus henüz okunmadı")?;
            (c.snap.profile_id.clone(), c.snap.board_id.clone(), c.meta.clone())
        };
        let server = Server::ensure(&dir)?;
        let booted = server.0.is_some();
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
                res.get("autoWatched").is_some_and(|v| !v.is_null())
            }
            _ => {
                let (Some(durum), Some(izlendi)) = (meta.durum.clone(), meta.izlendi.clone()) else {
                    return Err("Argus'ta Durum sütunu bulunamadı".into());
                };
                let rows = get_json(&format!("/api/profiles/{pid}/boards/{board_id}/rows"))?;
                let row = rows.as_array().and_then(|a| a.iter().find(|r| r.get("id").and_then(|v| v.as_str()) == Some(&row_id))).ok_or("Kayıt bulunamadı")?;
                let mut values = row.get("values").and_then(|v| v.as_object().cloned()).unwrap_or_default();
                values.insert(durum.clone(), Value::String(izlendi));
                let mut changed = vec![durum];
                if let Some(iz) = meta.izleme {
                    let mut dates: Vec<Value> = values.get(&iz).and_then(|v| v.as_array().cloned()).unwrap_or_default();
                    if !dates.iter().any(|d| d.as_str() == Some(&today)) {
                        dates.push(Value::String(today.clone()));
                    }
                    values.insert(iz.clone(), Value::Array(dates));
                    changed.push(iz);
                }
                put_json(&format!("/api/profiles/{pid}/boards/{board_id}/rows/{row_id}"), json!({ "values": values, "_changed": changed }))?;
                true
            }
        };
        // Bir sonraki özet dosyalardan yeniden okunsun
        drop(server);
        Ok(MarkResult { completed, booted })
    })
    .await
    .map_err(|e| e.to_string())?
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


