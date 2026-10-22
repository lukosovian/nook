//! Nook Mobil köprüsü: telefondaki Nook uygulaması PC'ye buradan bağlanır.
//!
//! Ayarlar › Telefon'dan açılınca 0.0.0.0:47391'de küçük bir HTTP sunucusu çalışır. Telefon ilk açılışta
//! QR kodu okuyarak ortak gizli anahtarı alır; sonraki her istek bu anahtarla imzalanır:
//!   x-nook-ts:  unix milisaniye
//!   x-nook-sig: hex(HMAC-SHA256(anahtar, "{ts}\n{METHOD}\n{yol}\n" + gövde))
//! İki dakikadan eski ya da daha önce görülmüş imzalar reddedilir. Yalnızca yerel ağ (10/8, 172.16/12,
//! 192.168/16) ve Tailscale (100.64/10) adreslerinden gelen bağlantılar kabul edilir.
//! Ayar dosyası: %LOCALAPPDATA%\Nook\remote.json ({ enabled, secret })

use std::collections::VecDeque;
use std::io::Read;
use std::net::IpAddr;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use base64::Engine;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::Sha256;
use tauri::AppHandle;
use tiny_http::{Header, Method, Request, Response, Server};

pub const PORT: u16 = 47391;
const MAX_SKEW_MS: i64 = 120_000;
const MAX_BODY: usize = 8 * 1024 * 1024;
/// Telefondan PC'ye gönderilen dosya (fotoğraf, video, belge)
const MAX_FILE: usize = 200 * 1024 * 1024;

#[derive(Clone, Default, Serialize, Deserialize)]
struct Config {
    enabled: bool,
    /// base64url, 32 bayt
    secret: String,
    /// Telefondan uzaktan kontrol (ekranı görme, fare ve klavye); ayrıca açılır
    #[serde(default)]
    control: bool,
}

static CONFIG: Mutex<Option<Config>> = Mutex::new(None);
static SERVER: Mutex<Option<Arc<Server>>> = Mutex::new(None);
static RUNNING: AtomicBool = AtomicBool::new(false);
static APP: Mutex<Option<AppHandle>> = Mutex::new(None);
/// PC'deki Nook'un rengi, adı, görünümü ve seçili Argus profili (ön yüz her değişince gönderir)
static PROFILE: Mutex<Value> = Mutex::new(Value::Null);
/// Ön yüzün aynası: pano geçmişi ve not sekmeleri (ön yüz değiştikçe gönderir; telefon buradan okur)
static MIRROR: Mutex<Value> = Mutex::new(Value::Null);
/// Yama notları (yalnızca metin; ön yüz açılışta bir kez gönderir)
static PATCH_NOTES: Mutex<Value> = Mutex::new(Value::Null);
/// Son iki dakikada görülen imzalar (aynı isteğin tekrar gönderilmesine karşı)
static SEEN: Mutex<VecDeque<(i64, String)>> = Mutex::new(VecDeque::new());
/// Telefondan ekran kapatıldıysa ne zaman (o andan beri klavye/fare kullanılmadıysa ekran hâlâ kapalı)
static SCREEN_OFF_AT: Mutex<Option<std::time::Instant>> = Mutex::new(None);
/// Telefondan ev ağı (Tailscale değil) üzerinden gelen son istek: uzun aradan sonraki ilki "eve geldi"
static LAST_LAN: Mutex<Option<std::time::Instant>> = Mutex::new(None);
/// Uzun aradan sonra telefonun ev ağından ilk görüldüğü an; Wi-Fi'ye bağlandım haberi gelince "eve geldi"
static CAME_BACK: Mutex<Option<std::time::Instant>> = Mutex::new(None);
/// Telefon bu kadar süre ev ağından hiç bağlanmadıysa dışarıda sayılır
const AWAY_AFTER: Duration = Duration::from_secs(20 * 60);

fn config_path() -> Option<PathBuf> {
    Some(PathBuf::from(std::env::var_os("LOCALAPPDATA")?).join("Nook").join("remote.json"))
}

fn new_secret() -> String {
    let mut buf = [0u8; 32];
    getrandom::getrandom(&mut buf).expect("rastgele sayı üretilemedi");
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(buf)
}

fn load() -> Config {
    let mut guard = CONFIG.lock().unwrap();
    if let Some(c) = guard.as_ref() {
        return c.clone();
    }
    let mut cfg: Config = config_path()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    if cfg.secret.is_empty() {
        cfg.secret = new_secret();
        save_locked(&cfg);
    }
    *guard = Some(cfg.clone());
    cfg
}

fn save_locked(cfg: &Config) {
    let Some(p) = config_path() else { return };
    if let Some(dir) = p.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    if let Ok(s) = serde_json::to_string_pretty(cfg) {
        let _ = std::fs::write(p, s);
    }
}

fn store(cfg: Config) {
    save_locked(&cfg);
    *CONFIG.lock().unwrap() = Some(cfg);
}

/// Köprü açık mı (Ayarlar › Telefon)
pub fn enabled() -> bool {
    load().enabled
}

pub fn spawn(app: AppHandle) {
    *APP.lock().unwrap() = Some(app);
    if load().enabled {
        start();
    }
}

fn start() {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }
    let server = match Server::http(("0.0.0.0", PORT)) {
        Ok(s) => Arc::new(s),
        Err(e) => {
            crate::log::write("error", &format!("telefon köprüsü başlatılamadı: {e}"));
            RUNNING.store(false, Ordering::SeqCst);
            return;
        }
    };
    *SERVER.lock().unwrap() = Some(server.clone());
    crate::log::write("info", &format!("telefon köprüsü açık: {PORT}"));
    thread::Builder::new()
        .name("nook-remote".into())
        .spawn(move || {
            for req in server.incoming_requests() {
                // Ekran görüntüsü gibi yavaş işler diğer istekleri bekletmesin
                let _ = thread::Builder::new().name("nook-remote-req".into()).spawn(move || handle(req));
            }
            RUNNING.store(false, Ordering::SeqCst);
        })
        .expect("remote thread başlatılamadı");
}

fn stop() {
    if let Some(s) = SERVER.lock().unwrap().take() {
        s.unblock();
    }
    RUNNING.store(false, Ordering::SeqCst);
    crate::log::write("info", "telefon köprüsü kapandı");
}

// ---------------------------------------------------------------- İstekler

fn allowed_peer(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            let o = v4.octets();
            v4.is_loopback() || v4.is_private() || (o[0] == 100 && (o[1] & 0xC0) == 64)
        }
        // Tailscale IPv6 (fd7a:115c:a1e0::/48) ve yerel adresler
        IpAddr::V6(v6) => v6.is_loopback() || (v6.segments()[0] & 0xfe00) == 0xfc00 || (v6.segments()[0] & 0xffc0) == 0xfe80,
    }
}

/// Ev ağındaki adres (Tailscale 100.64/10 ve bu bilgisayar değil)
fn home_peer(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => v4.is_private(),
        IpAddr::V6(v6) => (v6.segments()[0] & 0xffc0) == 0xfe80,
    }
}

/// Telefon ev ağından bağlandı: en az AWAY_AFTER boyunca gelmemişse geri dönmüş olabilir (Nook açıldıktan
/// sonraki ilk bağlantı sayılmaz; telefon zaten evdeydi). "Eve geldi" telefonun Wi-Fi haberiyle kesinleşir.
fn phone_seen_home() {
    let mut last = LAST_LAN.lock().unwrap();
    if last.is_some_and(|t| t.elapsed() >= AWAY_AFTER) {
        *CAME_BACK.lock().unwrap() = Some(std::time::Instant::now());
    }
    *last = Some(std::time::Instant::now());
}

/// Telefon olayını ön yüze (otomasyonlar) ilet
fn phone_event(event: &str) {
    if let Some(app) = APP.lock().unwrap().as_ref() {
        use tauri::Emitter;
        crate::log::write("info", &format!("telefon olayı: {event}"));
        let _ = app.emit_to(crate::window::ISLAND, "nook://phone-event", json!({ "event": event }));
    }
}

fn header(req: &Request, name: &'static str) -> Option<String> {
    req.headers().iter().find(|h| h.field.equiv(name)).map(|h| h.value.as_str().to_owned())
}

fn cors(mut res: Response<std::io::Cursor<Vec<u8>>>) -> Response<std::io::Cursor<Vec<u8>>> {
    for (k, v) in [
        ("Access-Control-Allow-Origin", "*"),
        ("Access-Control-Allow-Headers", "content-type, x-nook-ts, x-nook-sig"),
        ("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"),
        ("Access-Control-Expose-Headers", "x-nook-hash, x-nook-cursor, x-nook-locked"),
        ("Cache-Control", "no-store"),
    ] {
        res.add_header(Header::from_bytes(k, v).unwrap());
    }
    res
}

fn json_res(status: u16, v: Value) -> Response<std::io::Cursor<Vec<u8>>> {
    let mut r = Response::from_data(v.to_string().into_bytes()).with_status_code(status);
    r.add_header(Header::from_bytes("Content-Type", "application/json; charset=utf-8").unwrap());
    cors(r)
}

fn err(status: u16, msg: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    json_res(status, json!({ "error": msg }))
}

fn now_ms() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0)
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// hex(HMAC-SHA256(anahtar, "{ts}\n{METHOD}\n{yol}\n" + gövde)) — telefondaki mobile/src/lib/pc.ts ile aynı
fn signature(secret: &str, ts: i64, method: &str, url: &str, body: &[u8]) -> Result<String, &'static str> {
    let key = base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(secret).map_err(|_| "anahtar bozuk")?;
    let mut mac = Hmac::<Sha256>::new_from_slice(&key).map_err(|_| "anahtar bozuk")?;
    mac.update(format!("{ts}\n{method}\n{url}\n").as_bytes());
    mac.update(body);
    Ok(hex(&mac.finalize().into_bytes()))
}

fn verify(req: &Request, body: &[u8]) -> Result<(), &'static str> {
    let ts: i64 = header(req, "x-nook-ts").and_then(|s| s.parse().ok()).ok_or("imza yok")?;
    let sig = header(req, "x-nook-sig").ok_or("imza yok")?.to_ascii_lowercase();
    let now = now_ms();
    if (now - ts).abs() > MAX_SKEW_MS {
        return Err("saat farkı çok büyük");
    }
    if signature(&load().secret, ts, req.method().as_str(), req.url(), body)? != sig {
        return Err("imza geçersiz");
    }
    let mut seen = SEEN.lock().unwrap();
    while seen.front().is_some_and(|(t, _)| now - t > MAX_SKEW_MS * 2) {
        seen.pop_front();
    }
    if seen.iter().any(|(_, s)| *s == sig) {
        return Err("tekrarlanan istek");
    }
    seen.push_back((now, sig));
    Ok(())
}

fn handle(mut req: Request) {
    let peer = req.remote_addr().map(|a| a.ip());
    if !peer.is_some_and(allowed_peer) {
        let _ = req.respond(err(403, "yalnızca yerel ağ ve Tailscale"));
        return;
    }
    if *req.method() == Method::Options {
        let _ = req.respond(cors(Response::from_data(Vec::new()).with_status_code(204)));
        return;
    }
    // İmzasız tek uç: telefon "bu adreste Nook var mı?" diye bakar
    if req.url() == "/v1/hello" {
        let _ = req.respond(json_res(200, json!({ "nook": true, "version": env!("CARGO_PKG_VERSION") })));
        return;
    }
    let limit = if req.url().starts_with("/v1/file") { MAX_FILE } else { MAX_BODY };
    let mut body = Vec::new();
    if req.as_reader().take(limit as u64 + 1).read_to_end(&mut body).is_err() || body.len() > limit {
        let _ = req.respond(err(413, "istek çok büyük"));
        return;
    }
    if let Err(e) = verify(&req, &body) {
        crate::log::write("warn", &format!("telefon isteği reddedildi ({e}): {} {}", req.method(), req.url()));
        let _ = req.respond(err(401, e));
        return;
    }
    if peer.is_some_and(home_peer) {
        phone_seen_home();
    }
    let url = req.url().to_owned();
    let (path, query) = url.split_once('?').unwrap_or((&url, ""));
    // Raftaki dosya telefona: büyük olabilir, belleğe alınmadan akışla
    if *req.method() == Method::Get && path == "/v1/shelf/file" {
        let id = query_param(query, "id").unwrap_or("").to_owned();
        let _ = match shelf_path(&id).and_then(|p| std::fs::File::open(p).ok()) {
            Some(f) => {
                let mut r = Response::from_file(f);
                for (k, v) in [("Content-Type", "application/octet-stream"), ("Access-Control-Allow-Origin", "*"), ("Cache-Control", "no-store")] {
                    r.add_header(Header::from_bytes(k, v).unwrap());
                }
                req.respond(r)
            }
            None => req.respond(err(404, "dosya rafta yok")),
        };
        return;
    }
    let res = route(req.method(), path, query, &body);
    let _ = req.respond(res);
}

/// Raftaki öğenin dosyası (yalnızca raftakiler; klasör değil — keyfi dosya okunamasın)
fn shelf_path(id: &str) -> Option<String> {
    MIRROR.lock().unwrap()["shelf"]
        .as_array()?
        .iter()
        .find(|i| i["id"].as_str() == Some(id) && !i["isDir"].as_bool().unwrap_or(false))
        .and_then(|i| i["path"].as_str().map(str::to_owned))
}

fn query_param<'a>(query: &'a str, key: &str) -> Option<&'a str> {
    query.split('&').find_map(|kv| kv.split_once('=').filter(|(k, _)| *k == key).map(|(_, v)| v))
}

fn route(method: &Method, path: &str, query: &str, body: &[u8]) -> Response<std::io::Cursor<Vec<u8>>> {
    match (method, path) {
        (Method::Get, "/v1/status") => json_res(200, status()),
        // ?m=0,1… → o ekran (soldan sağa), ?m=all → hepsi yan yana; yoksa ana ekran
        (Method::Get, "/v1/screenshot") => match match query_param(query, "m") {
            Some("all") => crate::imaging::capture_monitor_jpeg(None, 2560, 80),
            Some(i) => match i.parse() {
                Ok(i) => crate::imaging::capture_monitor_jpeg(Some(i), 1920, 80),
                Err(_) => Err("geçersiz ekran".into()),
            },
            None => {
                let primary = crate::imaging::monitors().iter().position(|m| m.1);
                crate::imaging::capture_monitor_jpeg(primary.or(Some(0)), 1920, 80)
            }
        } {
            Ok(jpg) => {
                let mut r = Response::from_data(jpg);
                r.add_header(Header::from_bytes("Content-Type", "image/jpeg").unwrap());
                cors(r)
            }
            Err(e) => err(500, &e),
        },
        // Uzaktan kontrol: ?m=ekran&w=uzun kenar&q=kalite&h=son karenin özeti
        (Method::Get, "/v1/rc/frame") => {
            if !load().control {
                return err(403, "Uzaktan kontrol kapalı: PC'de Nook › Ayarlar › Telefon'dan aç");
            }
            let num = |k: &str, d: u64| query_param(query, k).and_then(|v| v.parse::<u64>().ok()).unwrap_or(d);
            let app = APP.lock().unwrap().clone();
            match crate::control::frame(app.as_ref(), num("m", 0) as usize, num("w", 1280).clamp(320, 2560) as u32, num("q", 60).clamp(20, 90) as u8, num("h", 0)) {
                Ok(f) => {
                    let changed = f.jpeg.is_some();
                    let mut r = Response::from_data(f.jpeg.unwrap_or_default()).with_status_code(if changed { 200 } else { 204 });
                    r.add_header(Header::from_bytes("Content-Type", "image/jpeg").unwrap());
                    r.add_header(Header::from_bytes("x-nook-hash", f.hash.to_string()).unwrap());
                    r.add_header(Header::from_bytes("x-nook-cursor", f.cursor.map(|(x, y)| format!("{x:.4},{y:.4}")).unwrap_or_default()).unwrap());
                    r.add_header(Header::from_bytes("x-nook-locked", if f.locked { "1" } else { "0" }).unwrap());
                    cors(r)
                }
                Err(e) => err(500, &e),
            }
        }
        (Method::Post, "/v1/rc/input") => {
            if !load().control {
                return err(403, "Uzaktan kontrol kapalı: PC'de Nook › Ayarlar › Telefon'dan aç");
            }
            match serde_json::from_slice::<crate::control::Input>(body) {
                Ok(inp) => match crate::control::input(inp) {
                    Ok(()) => json_res(200, json!({ "ok": true })),
                    Err(e) => err(400, &e),
                },
                Err(e) => err(400, &format!("geçersiz istek: {e}")),
            }
        }
        // Dışarıdan açmayı sına: PC birkaç saniye uyandırma paketini dinler, telefon evin adresine gönderir
        (Method::Post, "/v1/wake/test") => match crate::outside::wake_test_start() {
            Ok(()) => json_res(200, json!({ "ok": true })),
            Err(e) => err(500, &e),
        },
        (Method::Get, "/v1/wake/test") => json_res(200, json!(crate::outside::wake_test_result())),
        // Zamanlı kapatma: { at: ms | null, action: shutdown | restart | sleep }
        (Method::Get, "/v1/power/timer") => json_res(200, json!({ "timer": crate::powertimer::get() })),
        (Method::Post, "/v1/power/timer") => {
            let v = serde_json::from_slice::<Value>(body).unwrap_or(Value::Null);
            let t = v["at"].as_i64().map(|at| crate::powertimer::PowerTimer {
                at,
                action: v["action"].as_str().unwrap_or("shutdown").to_owned(),
                from: "phone".into(),
            });
            match crate::powertimer::set(t) {
                Ok(t) => json_res(200, json!({ "timer": t })),
                Err(e) => err(400, &e),
            }
        }
        // Gizlilik kalkanı: { on: true } açar, { on: false } kapatır (kilitliyse parolasız kapanmaz)
        (Method::Post, "/v1/shield") => {
            let on = serde_json::from_slice::<Value>(body).ok().and_then(|v| v["on"].as_bool()).unwrap_or(true);
            let Some(app) = APP.lock().unwrap().clone() else { return err(503, "Nook hazır değil") };
            crate::log::write("info", &format!("telefon: kalkan {}", if on { "aç" } else { "kapat" }));
            if on {
                crate::shield::shield_on(app.clone(), false);
                crate::system::emit_event(&app, "phone", "Telefondan kalkan açıldı", "Nook Mobil");
            } else {
                crate::shield::shield_off(app);
            }
            json_res(200, json!({ "ok": true }))
        }
        (Method::Post, "/v1/power") => {
            let action = serde_json::from_slice::<Value>(body).ok().and_then(|v| v["action"].as_str().map(str::to_owned)).unwrap_or_default();
            match power(&action) {
                Ok(()) => json_res(200, json!({ "ok": true })),
                Err(e) => err(400, &e),
            }
        }
        // Şu an çalan + PC'nin ses seviyesi
        (Method::Get, "/v1/media") => {
            let (volume, muted) = crate::quick::volume_state();
            json_res(200, json!({ "media": crate::media::now_playing(), "volume": volume, "muted": muted }))
        }
        (Method::Get, "/v1/media/art") => match crate::media::artwork_bytes() {
            Some((mime, bytes)) => {
                let mut r = Response::from_data(bytes);
                r.add_header(Header::from_bytes("Content-Type", mime.as_bytes()).unwrap_or_else(|_| Header::from_bytes("Content-Type", "image/png").unwrap()));
                cors(r)
            }
            None => err(404, "kapak yok"),
        },
        // { action: toggle | next | prev } ya da { volume: 0-1 } ya da { muted: bool }
        (Method::Post, "/v1/media") => {
            let b = body_json(body);
            let r = if let Some(a) = b["action"].as_str() {
                crate::media::media_control(a.to_owned())
            } else if let Some(ms) = b["seek"].as_u64() {
                crate::media::imp_seek(ms)
            } else if let Some(v) = b["volume"].as_f64() {
                crate::quick::set_volume(v as f32)
            } else if let Some(m) = b["muted"].as_bool() {
                crate::quick::set_muted(m)
            } else {
                Err("ne yapılacağı belirtilmedi".into())
            };
            match r {
                Ok(()) => json_res(200, json!({ "ok": true })),
                Err(e) => err(400, &e),
            }
        }
        // Pano: PC'nin pano geçmişi; telefondan gelen metin PC'nin panosuna yazılır
        (Method::Get, "/v1/clips") => json_res(200, json!({ "clips": MIRROR.lock().unwrap()["clips"].clone() })),
        (Method::Get, "/v1/clips/image") => {
            let id = query_param(query, "id").unwrap_or("");
            // Yalnızca geçmişteki bir görselin dosyası (keyfi dosya okunamasın)
            let path = MIRROR.lock().unwrap()["clips"]
                .as_array()
                .and_then(|a| a.iter().find(|c| c["id"].as_str() == Some(id)))
                .and_then(|c| c["path"].as_str().map(str::to_owned));
            match path.and_then(|p| std::fs::read(p).ok()) {
                Some(bytes) => {
                    let mut r = Response::from_data(bytes);
                    r.add_header(Header::from_bytes("Content-Type", "image/png").unwrap());
                    cors(r)
                }
                None => err(404, "görsel yok"),
            }
        }
        (Method::Post, "/v1/clips") => {
            let text = body_json(body)["text"].as_str().unwrap_or("").to_owned();
            if text.is_empty() {
                return err(400, "metin boş");
            }
            match APP.lock().unwrap().as_ref() {
                Some(app) => {
                    use tauri_plugin_clipboard_manager::ClipboardExt;
                    match app.clipboard().write_text(text) {
                        Ok(()) => {
                            crate::system::emit_event(app, "phone", "Telefondan panoya geldi", "Nook Mobil");
                            json_res(200, json!({ "ok": true }))
                        }
                        Err(e) => err(500, &e.to_string()),
                    }
                }
                None => err(503, "Nook hazır değil"),
            }
        }
        // Not: sekmeler ve metinleri; değişiklik Nook'a iletilir, ayna da hemen güncellenir
        (Method::Get, "/v1/notes") => {
            let m = MIRROR.lock().unwrap();
            json_res(200, json!({ "pads": m["pads"].clone(), "padId": m["padId"].clone() }))
        }
        // { op: set | add | remove | rename, id?, text?, title? }
        (Method::Post, "/v1/notes") => {
            let b = body_json(body);
            let op = b["op"].as_str().unwrap_or("");
            if !matches!(op, "set" | "add" | "remove" | "rename") {
                return err(400, "bilinmeyen not işlemi");
            }
            let mut cmd = b.clone();
            // Yeni sekmenin kimliği burada verilir ki telefon hemen o sekmeye geçebilsin
            if op == "add" && cmd["id"].as_str().is_none() {
                let mut buf = [0u8; 12];
                let _ = getrandom::getrandom(&mut buf);
                cmd["id"] = Value::String(hex(&buf));
            }
            apply_note(&cmd);
            match APP.lock().unwrap().as_ref() {
                Some(app) => {
                    use tauri::Emitter;
                    let _ = app.emit_to(crate::window::ISLAND, "nook://remote", json!({ "kind": "note", "cmd": cmd }));
                    json_res(200, json!({ "ok": true, "id": cmd["id"] }))
                }
                None => err(503, "Nook hazır değil"),
            }
        }
        // Claude Code: oturumlar, bekleyen onaylar, plan kullanımı (PC'deki adanın aynası)
        (Method::Get, "/v1/claude") => json_res(200, MIRROR.lock().unwrap()["claude"].clone()),
        // Onay isteğine telefondan cevap: { askId, decision: allow | always | deny | {"answers":…} }
        (Method::Post, "/v1/claude/decide") => {
            let b = body_json(body);
            let Some(id) = b["askId"].as_u64() else { return err(400, "istek yok") };
            let decision = match &b["decision"] {
                Value::String(s) if matches!(s.as_str(), "allow" | "always" | "deny") => s.clone(),
                v @ Value::Object(_) => v.to_string(),
                _ => return err(400, "geçersiz cevap"),
            };
            crate::claude::claude_decide(id, decision);
            json_res(200, json!({ "ok": true }))
        }
        // Görünüm: telefondan Nook'un gövdesi, rengi, aksesuarları { look, color }
        (Method::Post, "/v1/look") => {
            let b = body_json(body);
            if !b["look"].is_object() {
                return err(400, "görünüm yok");
            }
            let color = b["color"].as_str().filter(|c| c.len() == 7 && c.starts_with('#')).map(str::to_owned);
            // Telefon bir sonraki durum isteğinde yeni görünümü hemen görsün (PC kendi profilini sonra yine yazar)
            {
                let mut p = PROFILE.lock().unwrap();
                if p.is_object() {
                    p["look"] = b["look"].clone();
                    if let Some(c) = &color {
                        p["color"] = Value::String(c.clone());
                    }
                }
            }
            match APP.lock().unwrap().as_ref() {
                Some(app) => {
                    use tauri::Emitter;
                    let _ = app.emit_to(crate::window::ISLAND, "nook://remote", json!({ "kind": "look", "look": b["look"], "color": color }));
                    json_res(200, json!({ "ok": true }))
                }
                None => err(503, "Nook hazır değil"),
            }
        }
        // Hum: telefonun mikrofonundan 16 kHz mono s16le ses; PC tanır, geçmişe (ve Argus'a) yazar
        (Method::Post, "/v1/hum") => {
            let samples: Vec<f32> = body.chunks_exact(2).map(|b| i16::from_le_bytes([b[0], b[1]]) as f32 / 32768.0).collect();
            if samples.len() < 16_000 * 2 {
                return err(400, "ses çok kısa");
            }
            let Some(app) = APP.lock().unwrap().clone() else { return err(503, "Nook hazır değil") };
            // Ön yüz henüz açılmadıysa (PC yeni açıldı) bulunan şarkıyı geçmişe yazacak kimse yok: telefon sonra yeniden dener
            if MIRROR.lock().unwrap().is_null() {
                return err(503, "Nook hazır değil");
            }
            // PC kapalıyken kaydedilip sonradan gönderilen dinleme: ne kadar önce duyulduğu
            let ago = query_param(query, "ago").and_then(|v| v.parse::<u64>().ok()).unwrap_or(0);
            let out = crate::hum::phone(&app, &samples, ago);
            if let crate::hum::Outcome::Found { track } = &out {
                crate::system::emit_event(&app, "phone", format!("Telefon duydu: {}", track.title), track.artist.clone());
            }
            json_res(200, json!(out))
        }
        // Raf: PC'deki raftaki öğeler (dosya yolları telefona gitmez)
        (Method::Get, "/v1/shelf") => {
            let items: Vec<Value> = MIRROR.lock().unwrap()["shelf"]
                .as_array()
                .map(|a| {
                    a.iter()
                        .map(|i| json!({ "id": i["id"], "name": i["name"], "ext": i["ext"], "size": i["size"], "isDir": i["isDir"], "isImage": i["isImage"], "pinned": i["pinned"], "addedAt": i["addedAt"] }))
                        .collect()
                })
                .unwrap_or_default();
            json_res(200, json!({ "items": items }))
        }
        // { op: remove, id }
        (Method::Post, "/v1/shelf") => {
            let b = body_json(body);
            let id = b["id"].as_str().unwrap_or("").to_owned();
            if b["op"].as_str() != Some("remove") || id.is_empty() {
                return err(400, "bilinmeyen raf işlemi");
            }
            if let Some(a) = MIRROR.lock().unwrap()["shelf"].as_array_mut() {
                a.retain(|i| i["id"].as_str() != Some(&id));
            }
            match APP.lock().unwrap().as_ref() {
                Some(app) => {
                    use tauri::Emitter;
                    let _ = app.emit_to(crate::window::ISLAND, "nook://remote", json!({ "kind": "shelf", "op": "remove", "id": id }));
                    json_res(200, json!({ "ok": true }))
                }
                None => err(503, "Nook hazır değil"),
            }
        }
        // Su hatırlatması: telefon PC'nin sayacını izler, cevap iki tarafta da kapatır
        (Method::Get, "/v1/water") => json_res(200, MIRROR.lock().unwrap()["water"].clone()),
        // { op: drank | snooze, own?: telefon kendi sayacıyla hatırlattı }
        (Method::Post, "/v1/water") => {
            let b = body_json(body);
            let op = b["op"].as_str().unwrap_or("");
            if !matches!(op, "drank" | "snooze") {
                return err(400, "bilinmeyen işlem");
            }
            match APP.lock().unwrap().as_ref() {
                Some(app) => {
                    use tauri::Emitter;
                    let _ = app.emit_to(crate::window::ISLAND, "nook://remote", json!({ "kind": "water", "op": op, "own": b["own"].as_bool().unwrap_or(false) }));
                    // Ayna ön yüz cevabı işleyene kadar eski kalmasın
                    MIRROR.lock().unwrap()["water"]["due"] = Value::Bool(false);
                    json_res(200, json!({ "ok": true }))
                }
                None => err(503, "Nook hazır değil"),
            }
        }
        (Method::Get, "/v1/hum") => json_res(200, json!({ "hums": MIRROR.lock().unwrap()["hums"].clone() })),
        // Telefondaki olay: { event: charging | unplugged | wifi } (wifi yalnızca "buradayım" demek; eve gelmeyi
        // isteğin geldiği ağdan handle() anlar)
        (Method::Post, "/v1/phone-event") => {
            let b = body_json(body);
            match b["event"].as_str().unwrap_or("") {
                e @ ("charging" | "unplugged") => phone_event(e),
                // Telefon Wi-Fi'ye bağlandı ve son on dakikada uzun aradan sonra ev ağından görüldü
                "wifi" => {
                    if CAME_BACK.lock().unwrap().take().is_some_and(|t| t.elapsed() < Duration::from_secs(600)) {
                        phone_event("home");
                    }
                }
                _ => return err(400, "bilinmeyen olay"),
            }
            json_res(200, json!({ "ok": true }))
        }
        // Kısayollar: tuşlar ve otomasyonlar (yollar telefona gitmez)
        (Method::Get, "/v1/deck") => {
            let m = MIRROR.lock().unwrap();
            json_res(200, json!({ "keys": m["deck"].clone(), "autos": m["autos"].clone() }))
        }
        // { op: run, id } tuşa bas · { op: auto, id, on } otomasyonu aç/kapa
        (Method::Post, "/v1/deck") => {
            let b = body_json(body);
            let op = b["op"].as_str().unwrap_or("");
            let id = b["id"].as_str().unwrap_or("").to_owned();
            if !matches!(op, "run" | "auto") || id.is_empty() {
                return err(400, "bilinmeyen kısayol işlemi");
            }
            // Ayna ön yüz işleyene kadar eski kalmasın
            if op == "auto" {
                if let Some(a) = MIRROR.lock().unwrap()["autos"].as_array_mut().and_then(|l| l.iter_mut().find(|a| a["id"].as_str() == Some(&id))) {
                    a["on"] = Value::Bool(b["on"].as_bool().unwrap_or(false));
                }
            }
            match APP.lock().unwrap().as_ref() {
                Some(app) => {
                    use tauri::Emitter;
                    let _ = app.emit_to(crate::window::ISLAND, "nook://remote", json!({ "kind": "deck", "op": op, "id": id, "on": b["on"].as_bool().unwrap_or(false) }));
                    json_res(200, json!({ "ok": true }))
                }
                None => err(503, "Nook hazır değil"),
            }
        }
        // Yama notları (en yeni sürüm önce)
        (Method::Get, "/v1/patch-notes") => json_res(200, json!({ "notes": PATCH_NOTES.lock().unwrap().clone() })),
        // Nook'un günlüğü (en yeni önce)
        (Method::Get, "/v1/diary") => json_res(200, json!({ "diary": MIRROR.lock().unwrap()["diary"].clone() })),
        // Uzaktan açma ve bağlantı hazırlığının tamamı: telefon saklar, PC kapalıyken de gösterir
        (Method::Get, "/v1/setup") => json_res(200, crate::outside::setup_report()),
        // Telefona gelen bildirim → Nook'un bildirimleri (Windows'unkilerle aynı akış)
        (Method::Post, "/v1/notify") => {
            let b = body_json(body);
            let Some(app) = APP.lock().unwrap().clone() else { return err(503, "Nook hazır değil") };
            let s = |k: &str| b[k].as_str().unwrap_or("").trim().to_owned();
            if s("title").is_empty() && s("text").is_empty() {
                return err(400, "bildirim boş");
            }
            use tauri::Emitter;
            let name = s("app");
            crate::log::write("info", &format!("telefon bildirimi: {}", if name.is_empty() { "?" } else { &name }));
            let _ = app.emit(
                "nook://notification",
                json!({
                    "id": -now_ms(),
                    "app": if name.is_empty() { "Telefon".to_owned() } else { format!("{name} · Telefon") },
                    "appId": format!("phone:{}", s("pkg")),
                    "title": if s("title").is_empty() { name.clone() } else { s("title") },
                    "body": s("text"),
                    "icon": b["icon"].as_str().filter(|i| i.starts_with("data:image/")),
                    "phone": true,
                    // PC kapalıyken telefonda bekleyip şimdi gelen: listeye girsin, adada kart açmasın
                    "quiet": b["at"].as_i64().is_some_and(|at| now_ms() - at > 120_000),
                }),
            );
            json_res(200, json!({ "ok": true }))
        }
        // Telefondan dosya: ?name=…&to=shots (ekran görüntüleri klasörü); yoksa İndirilenler › Nook Mobil
        (Method::Post, "/v1/file") => {
            let Some(app) = APP.lock().unwrap().clone() else { return err(503, "Nook hazır değil") };
            let name = query_param(query, "name").map(url_decode).unwrap_or_default();
            match save_file(&app, &name, query_param(query, "to") == Some("shots"), body) {
                Ok(path) => {
                    if query_param(query, "to") == Some("shots") {
                        let file = path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
                        crate::system::emit_event(&app, "phone", "Telefondan dosya geldi", file);
                    } else {
                        // Paylaş › Nook ile gelen dosya rafa da düşer (oradan sürüklenip bırakılır)
                        use tauri::Emitter;
                        let _ = app.emit_to(crate::shortcut::target(&app).as_str(), "nook://shelf-phone", vec![path.to_string_lossy().into_owned()]);
                    }
                    json_res(200, json!({ "ok": true, "path": path.to_string_lossy() }))
                }
                Err(e) => err(500, &e),
            }
        }
        (_, p) if p.starts_with("/v1/argus/") => argus(method, p, query, body),
        _ => err(404, "bilinmeyen istek"),
    }
}

/// "a%20b" → "a b" (UTF-8)
fn url_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        let hexv = |c: u8| (c as char).to_digit(16).map(|d| d as u8);
        if b[i] == b'%' && i + 3 <= b.len() {
            if let (Some(h), Some(l)) = (hexv(b[i + 1]), hexv(b[i + 2])) {
                out.push(h << 4 | l);
                i += 3;
                continue;
            }
        }
        out.push(if b[i] == b'+' { b' ' } else { b[i] });
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// Telefondan gelen dosyayı kaydeder; ad temizlenir, aynı adda dosya varsa "(2)" eklenir
fn save_file(app: &AppHandle, name: &str, shots: bool, bytes: &[u8]) -> Result<PathBuf, String> {
    use tauri::Manager;
    if bytes.is_empty() {
        return Err("dosya boş".into());
    }
    let dir = if shots {
        crate::system::screenshots_dir(app).or_else(|| app.path().picture_dir().ok()).ok_or("Resimler klasörü bulunamadı")?
    } else {
        app.path().download_dir().map_err(|e| e.to_string())?.join("Nook Mobil")
    };
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let clean: String = name.chars().map(|c| if c.is_control() || r#"\/:*?"<>|"#.contains(c) { '_' } else { c }).collect();
    let clean = clean.trim().trim_matches('.').to_owned();
    let clean = if clean.is_empty() { format!("telefon-{}.bin", now_ms()) } else { clean };
    let (stem, ext) = match clean.rsplit_once('.') {
        Some((s, e)) if !s.is_empty() => (s.to_owned(), format!(".{e}")),
        _ => (clean.clone(), String::new()),
    };
    let mut path = dir.join(&clean);
    let mut n = 2;
    while path.exists() {
        path = dir.join(format!("{stem} ({n}){ext}"));
        n += 1;
    }
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    crate::log::write("info", &format!("telefondan dosya: {}", path.display()));
    Ok(path)
}

fn body_json(body: &[u8]) -> Value {
    serde_json::from_slice(body).unwrap_or(Value::Null)
}

/// Argus (telefondaki Argus Nook'u). Yazma işleri Argus'un kendi sunucusundan geçer (kapalıysa görünmez açılır).
fn argus(method: &Method, path: &str, query: &str, body: &[u8]) -> Response<std::io::Cursor<Vec<u8>>> {
    use crate::argus as a;
    let result: Result<Value, String> = match (method, path) {
        // Nook'un Argus özeti: diziler (sıradaki bölüm), filmler, afişler (/medya/… → proxy ile)
        (Method::Get, "/v1/argus/summary") => {
            let today = query_param(query, "today").unwrap_or("").to_owned();
            let app = APP.lock().unwrap().clone();
            let profile = PROFILE.lock().unwrap()["argusProfile"].as_str().filter(|p| !p.is_empty()).map(str::to_owned);
            match app.and_then(|app| a::snapshot_blocking(&app, profile, today, None)) {
                Some(snap) => {
                    let mut v = serde_json::to_value(snap).unwrap_or(Value::Null);
                    // Afişler PC'deki dosya yolu; telefon /medya/… adresiyle proxy'den ister
                    if let Some(items) = v.get_mut("items").and_then(|x| x.as_array_mut()) {
                        for it in items {
                            let rel = it["poster"].as_str().and_then(|p| {
                                let p = p.replace('\\', "/");
                                p.find("/medya/").map(|i| p[i..].to_owned())
                            });
                            it["poster"] = rel.map(Value::String).unwrap_or(Value::Null);
                        }
                    }
                    Ok(v)
                }
                None => Err("Bu bilgisayarda Argus bulunamadı".into()),
            }
        }
        (Method::Post, "/v1/argus/mark") => {
            let b = body_json(body);
            let u = |k: &str| b[k].as_u64().map(|x| x as u32);
            a::phone_keepalive().and_then(|_| {
                a::mark_blocking(
                    b["rowId"].as_str().unwrap_or("").to_owned(),
                    u("season"),
                    u("episode"),
                    b["status"].as_str().map(str::to_owned),
                    b["today"].as_str().unwrap_or("").to_owned(),
                )
                .map(|r| serde_json::to_value(r).unwrap_or(Value::Null))
            })
        }
        (Method::Get, "/v1/argus/episodes") => a::episodes_for(query_param(query, "rowId").unwrap_or("")),
        // { rowId, add: [[sezon, bölüm]…], remove: [[sezon, bölüm]…], today }
        (Method::Post, "/v1/argus/episodes") => {
            let b = body_json(body);
            let pairs = |k: &str| -> Vec<(u32, u32)> {
                b[k].as_array()
                    .map(|a| a.iter().filter_map(|p| Some((p.get(0)?.as_u64()? as u32, p.get(1)?.as_u64()? as u32))).collect())
                    .unwrap_or_default()
            };
            a::phone_keepalive().and_then(|_| {
                a::set_episodes_blocking(b["rowId"].as_str().unwrap_or(""), &pairs("add"), &pairs("remove"), b["today"].as_str().unwrap_or(""))
                    .map(|r| serde_json::to_value(r).unwrap_or(Value::Null))
            })
        }
        (Method::Post, "/v1/argus/search") => {
            let b = body_json(body);
            a::tmdb_search_blocking(b["query"].as_str().unwrap_or("").to_owned(), b["lang"].as_str().unwrap_or("tr-TR").to_owned())
                .map(|hits| serde_json::to_value(hits).unwrap_or(Value::Null))
        }
        (Method::Post, "/v1/argus/add") => {
            let b = body_json(body);
            a::phone_keepalive().and_then(|_| {
                a::tmdb_add_blocking(b["tmdbId"].as_u64().unwrap_or(0), b["mediaType"].as_str().unwrap_or("").to_owned()).map(|id| json!({ "rowId": id }))
            })
        }
        // Argus'un kendi API'si ve görselleri, aynen ("Ne izlesem?" Argus'un ayarlarıyla telefonda çalışır)
        (m, p) if p.starts_with("/v1/argus/proxy/") => {
            let target = format!("/{}{}", &p["/v1/argus/proxy/".len()..], if query.is_empty() { String::new() } else { format!("?{query}") });
            return match a::phone_proxy(m.as_str(), &target, body) {
                Ok((status, ctype, bytes)) => {
                    let mut r = Response::from_data(bytes).with_status_code(status);
                    r.add_header(Header::from_bytes("Content-Type", ctype.as_bytes()).unwrap_or_else(|_| Header::from_bytes("Content-Type", "application/octet-stream").unwrap()));
                    cors(r)
                }
                Err(e) => err(502, &e),
            };
        }
        _ => return err(404, "bilinmeyen Argus isteği"),
    };
    match result {
        Ok(v) => json_res(200, v),
        Err(e) if e == "nokey" => err(400, "Argus'ta TMDB API anahtarı yok (Argus › Ayarlar › Veritabanı › API)"),
        Err(e) => err(500, &e),
    }
}

fn claude_summary() -> Value {
    let m = MIRROR.lock().unwrap();
    let c = &m["claude"];
    if !c["present"].as_bool().unwrap_or(false) {
        return Value::Null;
    }
    let sessions = c["sessions"].as_array().map(Vec::as_slice).unwrap_or_default();
    json!({
        "asks": c["asks"].as_array().map_or(0, Vec::len),
        "working": sessions.iter().filter(|s| s["state"] == "working").count(),
        "sessions": sessions.len(),
    })
}

fn status() -> Value {
    json!({
        "name": host_name(),
        "version": env!("CARGO_PKG_VERSION"),
        "locked": crate::system::screen_locked(),
        "uptimeSec": crate::shield::system_uptime(),
        "stats": *crate::system::LATEST.lock().unwrap(),
        "mac": net::primary_mac(),
        // Telefon eşleşmedeki adresleri bununla tazeler (sonradan Tailscale kurulunca kodu yeniden okutmaya gerek yok)
        "hosts": net::addresses(),
        // Dışarıdan açma: evin internet adresi (modem uyandırma paketini PC'ye iletir)
        "wan": crate::outside::home_ip(),
        "nook": *PROFILE.lock().unwrap(),
        "screenOff": screen_off(),
        // Uzaktan kontrol PC'de açılmış mı (kapalıysa telefon nasıl açılacağını söyler)
        "control": load().control,
        // Ana ekrandaki Claude çipi: kaç onay bekliyor, kaç oturum çalışıyor
        "claude": claude_summary(),
        // Soldan sağa; ekran görüntüsünde ?m= bu sırayla
        // Zamanlı kapatma ve kalkan (telefonun PC ekranında)
        "powerTimer": crate::powertimer::get(),
        "shield": APP.lock().unwrap().as_ref().is_some_and(crate::shield::is_on),
        "monitors": crate::imaging::monitors().iter().map(|((_, _, w, h), primary)| json!({ "width": w, "height": h, "primary": primary })).collect::<Vec<_>>(),
    })
}

/// Kapat / yeniden başlat / uyku: yanıt telefona ulaşsın diye biraz bekleyip yapılır.
fn power(action: &str) -> Result<(), String> {
    let label = match action {
        "shutdown" => "Telefondan kapatılıyor",
        "restart" => "Telefondan yeniden başlatılıyor",
        "sleep" => "Telefondan uyku moduna alınıyor",
        "lock" => "Telefondan kilitlendi",
        "screen-off" => "Telefondan ekran kapatıldı",
        "screen-on" => "Telefondan ekran açıldı",
        _ => return Err("bilinmeyen işlem".into()),
    };
    *SCREEN_OFF_AT.lock().unwrap() = (action == "screen-off").then(|| std::time::Instant::now() + Duration::from_millis(200));
    crate::log::write("info", &format!("telefon: {action}"));
    if let Some(app) = APP.lock().unwrap().as_ref() {
        crate::system::emit_event(app, "phone", label, "Nook Mobil");
    }
    let action = action.to_owned();
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(if matches!(action.as_str(), "lock" | "screen-off" | "screen-on") { 200 } else { 2500 }));
        let r = match action.as_str() {
            "shutdown" => power::exit(false),
            "restart" => power::exit(true),
            "sleep" => power::sleep(),
            "lock" => crate::quick::quick_action("lock".into()),
            "screen-on" => crate::quick::screen_on(),
            _ => crate::quick::quick_action("screen-off".into()),
        };
        if let Err(e) = r {
            crate::log::write("error", &format!("telefon: {action} başarısız: {e}"));
        }
    });
    Ok(())
}

/// Telefondan kapatılan ekran hâlâ kapalı mı: o andan beri klavye ya da fare kullanılmadıysa
fn screen_off() -> bool {
    let Some(at) = *SCREEN_OFF_AT.lock().unwrap() else { return false };
    crate::tracker::system_idle().is_some_and(|idle| idle >= at.elapsed())
}

fn host_name() -> String {
    std::env::var("COMPUTERNAME").unwrap_or_else(|_| "PC".into())
}

// ---------------------------------------------------------------- Ayarlar komutları

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Info {
    enabled: bool,
    running: bool,
    name: String,
    port: u16,
    /// Telefonun deneyeceği adresler (önce Tailscale, sonra yerel ağ)
    hosts: Vec<String>,
    tailscale: bool,
    mac: Option<String>,
    /// Eşleşme QR kodu (SVG); köprü kapalıyken yok
    qr: Option<String>,
    /// Nook Mobil'i indirme bağlantısının QR kodu (en son sürümün APK'sı)
    app_qr: Option<String>,
    /// Telefondan uzaktan kontrol açık mı
    control: bool,
}

fn pair_url(cfg: &Config, hosts: &[String], mac: Option<&str>) -> String {
    let enc = |s: &str| s.replace('%', "%25").replace('&', "%26").replace(' ', "%20").replace('#', "%23");
    format!(
        "nook://pair?v=1&n={}&h={}&p={PORT}&k={}&m={}",
        enc(&host_name()),
        enc(&hosts.join(",")),
        cfg.secret,
        mac.unwrap_or("")
    )
}

pub(crate) fn qr_svg(data: &str) -> Option<String> {
    use qrcode::render::svg;
    let code = qrcode::QrCode::with_error_correction_level(data, qrcode::EcLevel::M).ok()?;
    Some(code.render::<svg::Color>().min_dimensions(180, 180).quiet_zone(true).dark_color(svg::Color("#000")).light_color(svg::Color("#fff")).build())
}

#[tauri::command]
pub fn remote_info() -> Info {
    let cfg = load();
    let hosts = net::addresses();
    let mac = net::primary_mac();
    let qr = cfg.enabled.then(|| qr_svg(&pair_url(&cfg, &hosts, mac.as_deref()))).flatten();
    Info {
        enabled: cfg.enabled,
        running: RUNNING.load(Ordering::SeqCst),
        name: host_name(),
        port: PORT,
        tailscale: hosts.iter().any(|h| h.starts_with("100.")),
        hosts,
        mac,
        qr,
        app_qr: qr_svg("https://github.com/lukosovian/nook/releases/latest/download/NookMobil.apk"),
        control: cfg.control,
    }
}

#[tauri::command]
pub fn remote_control_set(on: bool) -> Info {
    let mut cfg = load();
    cfg.control = on;
    store(cfg);
    crate::log::write("info", &format!("telefondan uzaktan kontrol {}", if on { "açıldı" } else { "kapandı" }));
    remote_info()
}

#[tauri::command]
pub fn remote_set(enabled: bool) -> Info {
    let mut cfg = load();
    cfg.enabled = enabled;
    store(cfg);
    if enabled {
        start();
    } else {
        stop();
    }
    remote_info()
}

/// Telefondan gelen not değişikliğini aynaya da uygular (ön yüz sonra kendi aynasını gönderir)
fn apply_note(cmd: &Value) {
    let mut m = MIRROR.lock().unwrap();
    if !m["pads"].is_array() {
        m["pads"] = Value::Array(Vec::new());
    }
    let id = cmd["id"].as_str().unwrap_or("").to_owned();
    let pads = m["pads"].as_array_mut().unwrap();
    match cmd["op"].as_str().unwrap_or("") {
        "set" => {
            if let Some(p) = pads.iter_mut().find(|p| p["id"].as_str() == Some(&id)) {
                p["text"] = cmd["text"].clone();
            }
        }
        "rename" => {
            if let Some(p) = pads.iter_mut().find(|p| p["id"].as_str() == Some(&id)) {
                p["title"] = cmd["title"].clone();
            }
        }
        "remove" => pads.retain(|p| p["id"].as_str() != Some(&id)),
        "add" => pads.push(json!({ "id": id, "title": cmd["title"].as_str().unwrap_or("Not"), "text": cmd["text"].as_str().unwrap_or("") })),
        _ => {}
    }
}

/// Ön yüz pano geçmişini ve not sekmelerini gönderir: { clips, pads, padId }
#[tauri::command]
pub fn remote_mirror(data: Value) {
    *MIRROR.lock().unwrap() = data;
}

#[tauri::command]
pub fn remote_notes(notes: Value) {
    *PATCH_NOTES.lock().unwrap() = notes;
}

#[tauri::command]
pub fn remote_profile(profile: Value) {
    *PROFILE.lock().unwrap() = profile;
}

/// Yeni anahtar: eşleşmiş telefon(lar) bağlantıyı kaybeder, QR yeniden okutulmalı.
#[tauri::command]
pub fn remote_reset() -> Info {
    let mut cfg = load();
    cfg.secret = new_secret();
    store(cfg);
    SEEN.lock().unwrap().clear();
    crate::log::write("info", "telefon eşleşmesi sıfırlandı");
    remote_info()
}

// ---------------------------------------------------------------- Güç

#[cfg(windows)]
pub(crate) mod power {
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, LUID};
    use windows_sys::Win32::Security::{AdjustTokenPrivileges, LookupPrivilegeValueW, SE_PRIVILEGE_ENABLED, TOKEN_ADJUST_PRIVILEGES, TOKEN_PRIVILEGES, TOKEN_QUERY};
    use windows_sys::Win32::System::Shutdown::{ExitWindowsEx, EWX_FORCEIFHUNG, EWX_POWEROFF, EWX_REBOOT, EWX_SHUTDOWN, SHTDN_REASON_FLAG_PLANNED, SHTDN_REASON_MAJOR_OTHER};
    use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

    /// Kapatma yetkisi (SeShutdownPrivilege) işlem için açılmalı
    fn enable_shutdown_privilege() -> Result<(), String> {
        unsafe {
            let mut token: HANDLE = std::ptr::null_mut();
            if OpenProcessToken(GetCurrentProcess(), TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY, &mut token) == 0 {
                return Err("yetki alınamadı".into());
            }
            let name: Vec<u16> = "SeShutdownPrivilege".encode_utf16().chain(Some(0)).collect();
            let mut luid = LUID { LowPart: 0, HighPart: 0 };
            let ok = LookupPrivilegeValueW(std::ptr::null(), name.as_ptr(), &mut luid) != 0 && {
                let tp = TOKEN_PRIVILEGES {
                    PrivilegeCount: 1,
                    Privileges: [windows_sys::Win32::Security::LUID_AND_ATTRIBUTES { Luid: luid, Attributes: SE_PRIVILEGE_ENABLED }],
                };
                AdjustTokenPrivileges(token, 0, &tp, 0, std::ptr::null_mut(), std::ptr::null_mut()) != 0
            };
            CloseHandle(token);
            if ok {
                Ok(())
            } else {
                Err("kapatma yetkisi yok".into())
            }
        }
    }

    pub fn exit(restart: bool) -> Result<(), String> {
        enable_shutdown_privilege()?;
        // Başında kimse yokken "uygulamalar kapanmayı engelliyor" ekranında sonsuza dek beklemesin: yanıt vermeyen
        // uygulamalar süre dolunca kapatılır
        let flags = (if restart { EWX_REBOOT } else { EWX_SHUTDOWN | EWX_POWEROFF }) | EWX_FORCEIFHUNG;
        if unsafe { ExitWindowsEx(flags, SHTDN_REASON_MAJOR_OTHER | SHTDN_REASON_FLAG_PLANNED) } == 0 {
            return Err("Windows kapatmayı reddetti".into());
        }
        Ok(())
    }

    pub fn sleep() -> Result<(), String> {
        if unsafe { windows_sys::Win32::System::Power::SetSuspendState(0, 0, 0) } == 0 {
            return Err("uyku moduna geçilemedi".into());
        }
        Ok(())
    }
}

#[cfg(not(windows))]
pub(crate) mod power {
    pub fn exit(_restart: bool) -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
    pub fn sleep() -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
}

// ---------------------------------------------------------------- Ağ bilgisi

#[cfg(windows)]
mod net {
    use windows_sys::Win32::NetworkManagement::IpHelper::{GetAdaptersAddresses, GAA_FLAG_INCLUDE_GATEWAYS, GAA_FLAG_SKIP_ANYCAST, GAA_FLAG_SKIP_DNS_SERVER, GAA_FLAG_SKIP_MULTICAST, IP_ADAPTER_ADDRESSES_LH};
    use windows_sys::Win32::NetworkManagement::Ndis::IfOperStatusUp;
    use windows_sys::Win32::Networking::WinSock::{AF_INET, SOCKADDR_IN};

    struct Adapter {
        ips: Vec<std::net::Ipv4Addr>,
        mac: Option<String>,
        guid: String,
        description: String,
        /// IF_TYPE_ETHERNET_CSMACD (Wi-Fi 71)
        wired: bool,
        /// Gerçek ağ kartı (kablolu ya da Wi-Fi) ve varsayılan ağ geçidi (modem) var
        physical: bool,
        /// Varsayılan ağ geçidi (modem)
        gateway: Option<std::net::Ipv4Addr>,
    }

    fn adapters() -> Vec<Adapter> {
        let mut out = Vec::new();
        unsafe {
            let mut size: u32 = 16 * 1024;
            let mut buf: Vec<u8>;
            loop {
                buf = vec![0u8; size as usize];
                let r = GetAdaptersAddresses(
                    AF_INET as u32,
                    GAA_FLAG_SKIP_ANYCAST | GAA_FLAG_SKIP_MULTICAST | GAA_FLAG_SKIP_DNS_SERVER | GAA_FLAG_INCLUDE_GATEWAYS,
                    std::ptr::null(),
                    buf.as_mut_ptr().cast(),
                    &mut size,
                );
                if r == 111 {
                    continue; // ERROR_BUFFER_OVERFLOW: size büyütüldü
                }
                if r != 0 {
                    return out;
                }
                break;
            }
            let mut p = buf.as_ptr() as *const IP_ADAPTER_ADDRESSES_LH;
            while !p.is_null() {
                let a = &*p;
                if a.OperStatus == IfOperStatusUp {
                    let mut ips = Vec::new();
                    let mut u = a.FirstUnicastAddress;
                    while !u.is_null() {
                        let sa = (*u).Address.lpSockaddr;
                        if !sa.is_null() && (*sa).sa_family == AF_INET {
                            let sin = &*(sa as *const SOCKADDR_IN);
                            ips.push(std::net::Ipv4Addr::from(u32::from_be(sin.sin_addr.S_un.S_addr)));
                        }
                        u = (*u).Next;
                    }
                    let mac = (a.PhysicalAddressLength == 6).then(|| {
                        a.PhysicalAddress[..6].iter().map(|b| format!("{b:02X}")).collect::<Vec<_>>().join(":")
                    });
                    let guid = if a.AdapterName.is_null() { String::new() } else { std::ffi::CStr::from_ptr(a.AdapterName as *const _).to_string_lossy().into_owned() };
                    let description = if a.Description.is_null() {
                        String::new()
                    } else {
                        let len = (0..).take_while(|&i| *a.Description.add(i) != 0).count();
                        String::from_utf16_lossy(std::slice::from_raw_parts(a.Description, len))
                    };
                    let physical = (a.IfType == 6 || a.IfType == 71) && !a.FirstGatewayAddress.is_null();
                    let mut gateway = None;
                    let mut g = a.FirstGatewayAddress;
                    while !g.is_null() && gateway.is_none() {
                        let sa = (*g).Address.lpSockaddr;
                        if !sa.is_null() && (*sa).sa_family == AF_INET {
                            let sin = &*(sa as *const SOCKADDR_IN);
                            gateway = Some(std::net::Ipv4Addr::from(u32::from_be(sin.sin_addr.S_un.S_addr)));
                        }
                        g = (*g).Next;
                    }
                    out.push(Adapter { ips, mac, guid, description, wired: a.IfType == 6, physical, gateway });
                }
                p = a.Next;
            }
        }
        out
    }

    /// Telefonun bağlanabileceği adresler: önce Tailscale (100.64/10), sonra yerel ağ
    pub fn addresses() -> Vec<String> {
        let mut ts = Vec::new();
        let mut lan = Vec::new();
        for a in adapters() {
            for ip in a.ips {
                let o = ip.octets();
                if o[0] == 100 && (o[1] & 0xC0) == 64 {
                    ts.push(ip.to_string());
                } else if ip.is_private() && !ip.is_link_local() {
                    lan.push(ip.to_string());
                }
            }
        }
        // İnternete çıkan arayüz yerel ağda başa (sanal ağ bağdaştırıcıları sona)
        if let Some(main) = crate::disks::local_ip() {
            if let Some(i) = lan.iter().position(|x| *x == main) {
                let m = lan.remove(i);
                lan.insert(0, m);
            }
        }
        ts.extend(lan);
        ts
    }

    /// Evdeki modeme bağlı ağ kartı. İnternete çıkan arayüz bir VPN'se (ya da Tailscale çıkış düğümü)
    /// onun yerine modeme bağlı gerçek kart seçilir; Wake-on-LAN ve modem ayarı ona göre yapılır
    fn primary() -> Option<Adapter> {
        let main: Option<std::net::Ipv4Addr> = crate::disks::local_ip().and_then(|s| s.parse().ok());
        let mut all: Vec<Adapter> = adapters().into_iter().filter(|a| a.ips.iter().any(|ip| ip.is_private() && !ip.is_link_local())).collect();
        if let Some(i) = all.iter().position(|a| a.physical && main.is_some_and(|m| a.ips.contains(&m))) {
            return Some(all.swap_remove(i));
        }
        // Kablolu kart Wi-Fi'den önce
        all.sort_by_key(|a| !a.wired);
        all.into_iter().find(|a| a.physical)
    }

    /// Wake-on-LAN için modeme bağlı ağ kartının MAC adresi
    pub fn primary_mac() -> Option<String> {
        primary()?.mac
    }

    /// Modeme bağlı ağ kartı (Wake-on-LAN hazırlığı wol.rs, modem ayarı outside.rs)
    pub fn primary_adapter() -> Option<super::PrimaryAdapter> {
        let a = primary()?;
        let ip = a.ips.iter().copied().find(|ip| ip.is_private() && !ip.is_link_local())?;
        Some(super::PrimaryAdapter { guid: a.guid, description: a.description, wired: a.wired, ip, gateway: a.gateway })
    }
}

#[cfg(not(windows))]
mod net {
    pub fn addresses() -> Vec<String> {
        crate::disks::local_ip().into_iter().collect()
    }
    pub fn primary_mac() -> Option<String> {
        None
    }
    pub fn primary_adapter() -> Option<super::PrimaryAdapter> {
        None
    }
}

/// Yerel ağ adresi: modeme bağlı kartınki, bulunamazsa internete çıkan arayüzünki
pub fn lan_ip() -> Option<std::net::Ipv4Addr> {
    primary_adapter().map(|a| a.ip).or_else(|| crate::disks::local_ip()?.parse().ok())
}

pub struct PrimaryAdapter {
    pub guid: String,
    pub description: String,
    pub wired: bool,
    pub ip: std::net::Ipv4Addr,
    pub gateway: Option<std::net::Ipv4Addr>,
}

pub use net::{addresses, primary_adapter, primary_mac};

#[cfg(test)]
mod tests {
    /// Telefonun WebCrypto ile ürettiği imzayla birebir aynı olmalı
    #[test]
    fn signature_matches_phone() {
        let sig = super::signature("AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8", 1_700_000_000_000, "POST", "/v1/power", br#"{"action":"lock"}"#).unwrap();
        assert_eq!(sig, "db1491f09d376ffe5bfa5328f1e7e36a3f3a43c558bf1ba702df30a1c245462d");
    }

    #[test]
    fn pair_url_has_hosts_port_key() {
        let cfg = super::Config { enabled: true, secret: "k".repeat(43), control: false };
        let url = super::pair_url(&cfg, &["100.64.1.2".into(), "192.168.1.5".into()], Some("AA:BB:CC:DD:EE:FF"));
        assert!(url.starts_with("nook://pair?v=1&n="));
        assert!(url.contains("&h=100.64.1.2,192.168.1.5&p=47391&k="));
    }
}
