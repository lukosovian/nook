//! Claude Code entegrasyonu (Nook tarafı).
//!  - Named pipe dinleyicisi: `nook.exe claude-hook` köprüsünden gelen olayları adaya iletir;
//!    izin isteğinde adadaki cevabı (İzin ver / Her zaman / Reddet / soru cevabı) köprüye geri yazar.
//!  - Kurulum: `~/.claude/settings.json`'a Nook'un hook'larını ve durum satırını ekler/kaldırır.
//!    Yazmadan önce tarihli yedek alınır; kullanıcının kendi hook'larına dokunulmaz.
//!
//! Claude Code olmayan bilgisayarda (`~/.claude` yok) her şey gizli kalır.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc::{self, Sender};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use serde_json::{json, Map, Value};
use tauri::AppHandle;

use crate::claude_hook::cap_strings_to;

const EVENT: &str = "nook://claude";
const RESOLVED: &str = "nook://claude-resolved";
const PLAN: &str = "nook://claude-plan";
/// Köprünün `args`'ı; Nook'un hook'u bununla tanınır
const HOOK_ARG: &str = "claude-hook";
const STATUS_ARG: &str = "claude-status";
/// Kullanıcının kendi durum satırı sarıldıysa: `nook.exe claude-status --tee | <kendi komutu>`.
/// Nook gelen JSON'u aynen geçirir; kullanıcının komutunu yine Claude Code'un kabuğu çalıştırır.
pub const TEE_ARG: &str = "--tee";
/// Hook'u kurulan olaylar
const EVENTS: &[&str] = &["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "PermissionRequest", "Notification", "Stop", "SessionEnd"];
/// Araç olayları matcher ister
const TOOL_EVENTS: &[&str] = &["PreToolUse", "PostToolUse", "PermissionRequest"];

/// Öndeyken izin isteği adaya gelmez (terminal zaten soruyor): terminaller ve kod düzenleyicileri
const TERMINALS: &[&str] = &[
    "windowsterminal.exe",
    "cmd.exe",
    "powershell.exe",
    "pwsh.exe",
    "conhost.exe",
    "openconsole.exe",
    "code.exe",
    "cursor.exe",
    "windsurf.exe",
    "wezterm-gui.exe",
    "alacritty.exe",
    "mintty.exe",
    "tabby.exe",
    "hyper.exe",
    "warp.exe",
    "claude.exe",
];

fn pending() -> &'static Mutex<HashMap<u64, Sender<String>>> {
    static P: OnceLock<Mutex<HashMap<u64, Sender<String>>>> = OnceLock::new();
    P.get_or_init(Default::default)
}
static NEXT_ID: AtomicU64 = AtomicU64::new(1);

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or_default()
}

/// Öndeki pencere bir terminal/kod düzenleyicisi mi
fn terminal_in_front() -> bool {
    #[cfg(windows)]
    {
        let Some(exe) = crate::fullscreen::exe_path(crate::focus::foreground()) else { return false };
        let name = exe.rsplit(['\\', '/']).next().unwrap_or_default().to_ascii_lowercase();
        TERMINALS.contains(&name.as_str())
    }
    #[cfg(not(windows))]
    false
}

/// Adanın verdiği cevap (bkz. claude_hook::reply). Boş metin: "terminalde cevaplayacağım".
#[tauri::command]
pub fn claude_decide(id: u64, decision: String) {
    if let Some(tx) = pending().lock().unwrap().remove(&id) {
        let _ = tx.send(decision);
    }
}

pub fn spawn(app: AppHandle) {
    #[cfg(windows)]
    std::thread::Builder::new().name("nook-claude".into()).spawn(move || server::run(app)).ok();
    #[cfg(not(windows))]
    let _ = app;
}

#[cfg(windows)]
mod server {
    use std::fs::File;
    use std::io::{BufRead, BufReader, Read, Write};
    use std::os::windows::io::{AsRawHandle, FromRawHandle};
    use std::time::{Duration, Instant};

    use serde_json::Value;
    use tauri::{AppHandle, Emitter};
    use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, ERROR_PIPE_CONNECTED, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::Storage::FileSystem::{FILE_FLAG_FIRST_PIPE_INSTANCE, PIPE_ACCESS_DUPLEX};
    use windows_sys::Win32::System::Pipes::{
        ConnectNamedPipe, CreateNamedPipeW, PeekNamedPipe, PIPE_READMODE_BYTE, PIPE_REJECT_REMOTE_CLIENTS, PIPE_TYPE_BYTE, PIPE_UNLIMITED_INSTANCES, PIPE_WAIT,
    };

    use super::*;

    /// Bir satır en fazla bu kadar okunur
    const MAX_LINE: u64 = 1024 * 1024;
    /// Köprünün kendi sınırından (110 sn) biraz fazla
    const MAX_WAIT: Duration = Duration::from_secs(115);

    pub fn run(app: AppHandle) {
        let name: Vec<u16> = crate::claude_hook::pipe_name().encode_utf16().chain(std::iter::once(0)).collect();
        let mut first = true;
        loop {
            let flags = PIPE_ACCESS_DUPLEX | if first { FILE_FLAG_FIRST_PIPE_INSTANCE } else { 0 };
            let h = unsafe {
                CreateNamedPipeW(
                    name.as_ptr(),
                    flags,
                    PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS,
                    PIPE_UNLIMITED_INSTANCES,
                    64 * 1024,
                    64 * 1024,
                    0,
                    std::ptr::null(),
                )
            };
            if h == INVALID_HANDLE_VALUE {
                // Başka bir süreç adı kapmış ya da geçici hata: bekle, yeniden dene
                crate::log::write("warn", &format!("claude: pipe açılamadı ({})", unsafe { GetLastError() }));
                std::thread::sleep(Duration::from_secs(10));
                continue;
            }
            first = false;
            let ok = unsafe { ConnectNamedPipe(h, std::ptr::null_mut()) } != 0 || unsafe { GetLastError() } == ERROR_PIPE_CONNECTED;
            if !ok {
                unsafe { CloseHandle(h) };
                continue;
            }
            let file = unsafe { File::from_raw_handle(h as _) };
            let app = app.clone();
            std::thread::spawn(move || serve(app, file));
        }
    }

    /// Karşı uç hâlâ bağlı mı (köprü süresi dolup çıktıysa ya da Claude Code iptal ettiyse kopar)
    fn alive(file: &File) -> bool {
        let mut avail = 0u32;
        unsafe { PeekNamedPipe(file.as_raw_handle() as _, std::ptr::null_mut(), 0, std::ptr::null_mut(), &mut avail, std::ptr::null_mut()) != 0 }
    }

    fn serve(app: AppHandle, file: File) {
        let mut line = Vec::new();
        {
            let mut reader = BufReader::new((&file).take(MAX_LINE));
            if reader.read_until(b'\n', &mut line).is_err() {
                return;
            }
        }
        let Ok(Value::Object(mut map)) = serde_json::from_slice::<Value>(&line) else { return };
        let event = map.get("hook_event_name").and_then(Value::as_str).unwrap_or_default().to_string();
        let pid = map.remove("claude_pid").and_then(|p| p.as_u64());
        if let (Some(session), Some(pid)) = (map.get("session_id").and_then(Value::as_str), pid) {
            let mut pids = session_pids().lock().unwrap();
            if event == "SessionEnd" {
                pids.remove(session);
            } else {
                pids.insert(session.to_owned(), pid as u32);
            }
        }

        if event == "StatusLine" {
            if let Some(limits) = map.get("rate_limits") {
                let _ = app.emit(PLAN, json!({ "rateLimits": limits, "at": now_ms() }));
            }
            return;
        }

        // Bilgisayarın başında değilse (terminal önde kalmış olsa bile) istek adaya ve telefona düşsün
        let idle = crate::tracker::system_idle().is_some_and(|d| d > Duration::from_secs(90));
        let away = !terminal_in_front() || idle;
        let mut ui = Value::Object(map);
        // Onay kartında komutun tamamı görünsün: komut daha uzun sınırla kısalır
        let command = ui.pointer("/tool_input/command").cloned();
        cap_strings_to(&mut ui, 600);
        if let Some(mut c) = command {
            cap_strings_to(&mut c, 8000);
            if let Some(slot) = ui.pointer_mut("/tool_input/command") {
                *slot = c;
            }
        }
        if let Value::Object(m) = &mut ui {
            m.insert("at".into(), json!(now_ms()));
            m.insert("away".into(), json!(away));
        }

        // Kullanıcı terminaldeyse izin isteği orada sorulsun: köprüye cevapsız dön
        if event != "PermissionRequest" || !away {
            let _ = app.emit(EVENT, ui);
            return;
        }

        let id = NEXT_ID.fetch_add(1, Ordering::Relaxed);
        let (tx, rx) = mpsc::channel::<String>();
        pending().lock().unwrap().insert(id, tx);
        if let Value::Object(m) = &mut ui {
            m.insert("askId".into(), json!(id));
        }
        let _ = app.emit(EVENT, ui);

        let started = Instant::now();
        let mut file = file;
        loop {
            match rx.recv_timeout(Duration::from_millis(400)) {
                Ok(decision) => {
                    if !decision.is_empty() {
                        let _ = file.write_all(format!("{decision}\n").as_bytes());
                        let _ = file.flush();
                    }
                    break;
                }
                Err(mpsc::RecvTimeoutError::Timeout) if alive(&file) && started.elapsed() < MAX_WAIT => {}
                Err(_) => break,
            }
        }
        pending().lock().unwrap().remove(&id);
        let _ = app.emit(RESOLVED, json!({ "askId": id }));
    }
}

// ---------------------------------------------------------------------------
// Telefondan istek yazma: oturumun terminaline klavyeden yazılmış gibi
// ---------------------------------------------------------------------------

/// Oturum → Claude Code süreci (köprü her olayda kendi atasını bildirir)
fn session_pids() -> &'static Mutex<HashMap<String, u32>> {
    static P: OnceLock<Mutex<HashMap<String, u32>>> = OnceLock::new();
    P.get_or_init(Default::default)
}

/// Telefondan gelen metni oturumun terminaline yazar ve Enter'a basar. Claude çalışıyorsa
/// Claude Code bunu kendi sırasına alır, bitince işler.
pub fn send_prompt(session: &str, text: &str) -> Result<(), String> {
    let text: String = text.replace(['\r', '\n'], " ").trim().to_string();
    if text.is_empty() {
        return Err("boş istek".into());
    }
    let pid = session_pids().lock().unwrap().get(session).copied().ok_or("Bu oturumun terminali bulunamadı; Claude'da bir şey olunca yeniden dene")?;
    #[cfg(windows)]
    {
        term::type_into(pid, &text)
    }
    #[cfg(not(windows))]
    {
        let _ = pid;
        Err("yalnızca Windows'ta".into())
    }
}

#[cfg(windows)]
pub mod term {
    use std::collections::HashMap;
    use std::os::windows::io::AsRawHandle;
    use std::sync::Mutex;
    use std::time::Duration;

    use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Console::{AttachConsole, FreeConsole, GetConsoleWindow, WriteConsoleInputW, ATTACH_PARENT_PROCESS, INPUT_RECORD, KEY_EVENT};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS};

    const CLAUDE_EXES: &[&str] = &["claude.exe", "node.exe", "bun.exe"];

    /// pid → (ebeveyn, küçük harf exe adı)
    fn processes() -> HashMap<u32, (u32, String)> {
        let mut out = HashMap::new();
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
                out.insert(e.th32ProcessID, (e.th32ParentProcessID, String::from_utf16_lossy(&e.szExeFile[..len]).to_lowercase()));
                ok = Process32NextW(snap, &mut e) != 0;
            }
            CloseHandle(snap);
        }
        out
    }

    /// Köprüyü çalıştıran Claude Code süreci: atalar arasında art arda gelen Claude süreçlerinin en dıştaki
    pub fn claude_ancestor() -> Option<u32> {
        let procs = processes();
        let mut cur = std::process::id();
        let mut found = None;
        for _ in 0..16 {
            let Some((parent, _)) = procs.get(&cur) else { break };
            let parent = *parent;
            match procs.get(&parent) {
                Some((_, name)) if CLAUDE_EXES.contains(&name.as_str()) => found = Some(parent),
                _ if found.is_some() => break,
                _ => {}
            }
            cur = parent;
        }
        found
    }

    fn key(c: u16, vk: u16, down: bool) -> INPUT_RECORD {
        let mut r: INPUT_RECORD = unsafe { std::mem::zeroed() };
        r.EventType = KEY_EVENT as u16;
        r.Event.KeyEvent.bKeyDown = down as i32;
        r.Event.KeyEvent.wRepeatCount = 1;
        r.Event.KeyEvent.wVirtualKeyCode = vk;
        r.Event.KeyEvent.uChar.UnicodeChar = c;
        r
    }

    fn write(con: &std::fs::File, recs: &[INPUT_RECORD]) -> bool {
        let mut n = 0u32;
        unsafe { WriteConsoleInputW(con.as_raw_handle() as _, recs.as_ptr(), recs.len() as u32, &mut n) != 0 && n as usize == recs.len() }
    }

    /// Sürecin konsoluna bağlanıp metni ve Enter'ı yazar. Konsol süreç genelinde tek olduğu için sırayla.
    pub fn type_into(pid: u32, text: &str) -> Result<(), String> {
        static LOCK: Mutex<()> = Mutex::new(());
        let _g = LOCK.lock().unwrap();
        // Kimlik başka bir sürece verilmiş olmasın
        if !processes().get(&pid).is_some_and(|(_, n)| CLAUDE_EXES.contains(&n.as_str())) {
            return Err("Bu Claude oturumu kapanmış".into());
        }
        let had_console = unsafe { !GetConsoleWindow().is_null() };
        unsafe { FreeConsole() };
        let result = (|| {
            if unsafe { AttachConsole(pid) } == 0 {
                return Err("Bu oturum bir terminalde çalışmıyor".to_string());
            }
            let con = std::fs::OpenOptions::new().read(true).write(true).open("CONIN$").map_err(|e| format!("terminale ulaşılamadı: {e}"))?;
            let recs: Vec<INPUT_RECORD> = text.encode_utf16().flat_map(|c| [key(c, 0, true), key(c, 0, false)]).collect();
            if !write(&con, &recs) {
                return Err("terminale yazılamadı".into());
            }
            // Enter ayrı gelsin: metinle birlikte gelirse yapıştırma sayılıp alt satıra geçebilir
            std::thread::sleep(Duration::from_millis(150));
            if !write(&con, &[key(13, 0x0D, true), key(13, 0x0D, false)]) {
                return Err("terminale yazılamadı".into());
            }
            Ok(())
        })();
        unsafe {
            FreeConsole();
            if had_console {
                AttachConsole(ATTACH_PARENT_PROCESS);
            }
        }
        result
    }
}

// ---------------------------------------------------------------------------
// Kurulum: ~/.claude/settings.json
// ---------------------------------------------------------------------------

fn claude_dir() -> Option<PathBuf> {
    if let Some(dir) = std::env::var_os("CLAUDE_CONFIG_DIR").filter(|d| !d.is_empty()) {
        return Some(PathBuf::from(dir));
    }
    Some(PathBuf::from(std::env::var_os("USERPROFILE")?).join(".claude"))
}

fn settings_path() -> Option<PathBuf> {
    Some(claude_dir()?.join("settings.json"))
}

fn exe() -> Result<String, String> {
    std::env::current_exe().map(|p| p.to_string_lossy().into_owned()).map_err(|e| e.to_string())
}

/// Durum satırı komutu: kabukta (Git Bash / PowerShell) çalışır, boşluk yoksa tırnaksız yazılır ki ikisinde de çalışsın
fn status_command(exe: &str) -> String {
    let path = exe.replace('\\', "/");
    if path.contains(' ') {
        format!("\"{path}\" {STATUS_ARG}")
    } else {
        format!("{path} {STATUS_ARG}")
    }
}

fn is_our_handler(h: &Value) -> bool {
    let cmd = h.get("command").and_then(Value::as_str).unwrap_or_default().to_ascii_lowercase();
    let first_arg = h.get("args").and_then(Value::as_array).and_then(|a| a.first()).and_then(Value::as_str);
    let file = cmd.rsplit(['\\', '/']).next().unwrap_or_default();
    file.contains("nook") && file.ends_with(".exe") && first_arg == Some(HOOK_ARG)
}

/// Sarılmış durum satırından kullanıcının kendi komutu
fn unwrap_status(v: &Value) -> Option<String> {
    let cmd = v.get("command").and_then(Value::as_str)?;
    let marker = format!("{STATUS_ARG} {TEE_ARG} | ");
    let at = cmd.find(&marker)?;
    Some(cmd[at + marker.len()..].to_string())
}

fn is_our_status(v: &Value) -> bool {
    v.get("command").and_then(Value::as_str).is_some_and(|c| c.contains(STATUS_ARG) && c.to_ascii_lowercase().contains("nook"))
}

fn read_settings() -> Result<(PathBuf, Map<String, Value>), String> {
    let path = settings_path().ok_or("Kullanıcı klasörü bulunamadı")?;
    let text = match std::fs::read_to_string(&path) {
        Ok(t) => t,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok((path, Map::new())),
        Err(e) => return Err(e.to_string()),
    };
    let text = text.trim_start_matches('\u{feff}');
    if text.trim().is_empty() {
        return Ok((path, Map::new()));
    }
    match serde_json::from_str::<Value>(text) {
        Ok(Value::Object(m)) => Ok((path, m)),
        _ => Err("settings.json okunamadı (elle düzenlenmiş olabilir); hiçbir şey değiştirilmedi".into()),
    }
}

/// Önce tarihli yedek, sonra yeni içerik (geçici dosyaya yazıp yerine taşıyarak)
fn write_settings(path: &PathBuf, map: Map<String, Value>) -> Result<Option<String>, String> {
    let backup = if path.exists() {
        let b = path.with_file_name(format!("settings.nook-yedek-{}.json", now_ms() / 1000));
        std::fs::copy(path, &b).map_err(|e| format!("Yedek alınamadı: {e}"))?;
        Some(b.to_string_lossy().into_owned())
    } else {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        }
        None
    };
    let mut text = serde_json::to_string_pretty(&Value::Object(map)).map_err(|e| e.to_string())?;
    text.push('\n');
    let tmp = path.with_extension("json.nook-tmp");
    std::fs::write(&tmp, text).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, path).map_err(|e| e.to_string())?;
    Ok(backup)
}

/// Nook'un hook'larını çıkarır; boşalan grupları/olayları da siler
fn strip_ours(map: &mut Map<String, Value>) -> bool {
    let mut changed = false;
    if let Some(Value::Object(hooks)) = map.get_mut("hooks") {
        for groups in hooks.values_mut() {
            let Some(groups) = groups.as_array_mut() else { continue };
            for g in groups.iter_mut() {
                if let Some(list) = g.get_mut("hooks").and_then(Value::as_array_mut) {
                    let before = list.len();
                    list.retain(|h| !is_our_handler(h));
                    changed |= list.len() != before;
                }
            }
            groups.retain(|g| g.get("hooks").and_then(Value::as_array).is_none_or(|l| !l.is_empty()));
        }
        hooks.retain(|_, v| v.as_array().is_none_or(|a| !a.is_empty()));
        if hooks.is_empty() {
            map.remove("hooks");
        }
    }
    changed
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeSetup {
    /// Bu bilgisayarda Claude Code var mı (~/.claude)
    present: bool,
    /// Nook'un hook'ları kurulu mu
    hooked: bool,
    /// Hook'lar başka bir nook.exe'yi gösteriyor (taşınmış/geliştirme kopyası)
    stale: bool,
    /// "nook" | "wrapped" (kendi satırı Nook'la birlikte) | "other" | "none"
    statusline: &'static str,
}

#[tauri::command(async)]
pub fn claude_setup() -> ClaudeSetup {
    let present = claude_dir().is_some_and(|d| d.is_dir());
    let Ok((_, map)) = read_settings() else {
        return ClaudeSetup { present, hooked: false, stale: false, statusline: "none" };
    };
    let me = exe().unwrap_or_default().to_ascii_lowercase();
    let ours: Vec<String> = map
        .get("hooks")
        .and_then(Value::as_object)
        .into_iter()
        .flat_map(|h| h.values())
        .filter_map(Value::as_array)
        .flatten()
        .filter_map(|g| g.get("hooks").and_then(Value::as_array))
        .flatten()
        .filter(|h| is_our_handler(h))
        .filter_map(|h| h.get("command").and_then(Value::as_str).map(str::to_ascii_lowercase))
        .collect();
    let statusline = match map.get("statusLine") {
        Some(v) if unwrap_status(v).is_some() => "wrapped",
        Some(v) if is_our_status(v) => "nook",
        Some(_) => "other",
        None => "none",
    };
    ClaudeSetup { present, hooked: !ours.is_empty(), stale: ours.iter().any(|c| *c != me), statusline }
}

/// Hook'ları (ve başka durum satırı yoksa plan göstergesi için durum satırını) kurar. Yedeğin yolunu döner.
#[tauri::command(async)]
pub fn claude_connect() -> Result<Option<String>, String> {
    let exe = exe()?;
    let (path, mut map) = read_settings()?;
    strip_ours(&mut map);
    let hooks = map.entry("hooks").or_insert_with(|| json!({}));
    let hooks = hooks.as_object_mut().ok_or("settings.json'daki \"hooks\" bir nesne değil")?;
    for ev in EVENTS {
        let timeout = if *ev == "PermissionRequest" { 120 } else { 10 };
        let mut group = json!({ "hooks": [{ "type": "command", "command": exe, "args": [HOOK_ARG], "timeout": timeout }] });
        if TOOL_EVENTS.contains(ev) {
            group["matcher"] = json!("*");
        }
        let list = hooks.entry(*ev).or_insert_with(|| json!([]));
        list.as_array_mut().ok_or(format!("settings.json'daki \"{ev}\" bir liste değil"))?.push(group);
    }
    // Kullanıcının kendi durum satırına dokunma (sarılmışsa da öyle kalsın)
    match map.get("statusLine") {
        Some(v) if !is_our_status(v) || unwrap_status(v).is_some() => {}
        _ => {
            map.insert("statusLine".into(), json!({ "type": "command", "command": status_command(&exe), "padding": 0 }));
        }
    }
    write_settings(&path, map)
}

#[tauri::command(async)]
pub fn claude_disconnect() -> Result<Option<String>, String> {
    let (path, mut map) = read_settings()?;
    let mut changed = strip_ours(&mut map);
    if let Some(own) = map.get("statusLine").and_then(unwrap_status) {
        // Sarılmışsa kullanıcının kendi komutu geri gelir
        map["statusLine"]["command"] = Value::String(own);
        changed = true;
    } else if map.get("statusLine").is_some_and(is_our_status) {
        map.remove("statusLine");
        changed = true;
    }
    if !changed {
        return Ok(None);
    }
    write_settings(&path, map)
}

/// Kendi durum satırı olan kullanıcıda plan göstergesini aç/kapat: satırı Nook'la sarar ya da eski hâline döndürür.
#[tauri::command(async)]
pub fn claude_status_wrap(on: bool) -> Result<Option<String>, String> {
    let exe = exe()?;
    let (path, mut map) = read_settings()?;
    let Some(line) = map.get_mut("statusLine").and_then(Value::as_object_mut) else {
        return Err("Claude Code'da durum satırı yok".into());
    };
    let current = Value::Object(line.clone());
    let command = match (on, unwrap_status(&current)) {
        (true, None) if !is_our_status(&current) => {
            let own = current.get("command").and_then(Value::as_str).filter(|c| !c.trim().is_empty()).ok_or("Durum satırının komutu okunamadı")?;
            format!("{} {TEE_ARG} | {own}", status_command(&exe))
        }
        (false, Some(own)) => own,
        _ => return Ok(None),
    };
    line.insert("command".into(), Value::String(command));
    write_settings(&path, map)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strip_keeps_user_hooks() {
        let mut m = json!({
            "theme": "auto",
            "hooks": {
                "Stop": [
                    { "hooks": [{ "type": "command", "command": "C:\\x\\nook.exe", "args": ["claude-hook"] }] },
                    { "hooks": [{ "type": "command", "command": "say done" }] }
                ],
                "PreToolUse": [{ "matcher": "*", "hooks": [{ "type": "command", "command": "C:\\x\\Nook.exe", "args": ["claude-hook"] }] }]
            }
        });
        let map = m.as_object_mut().unwrap();
        assert!(strip_ours(map));
        assert_eq!(map["hooks"]["Stop"].as_array().unwrap().len(), 1);
        assert!(map["hooks"].get("PreToolUse").is_none());
        let mut only = json!({ "hooks": { "Stop": [{ "hooks": [{ "type": "command", "command": "nook.exe", "args": ["claude-hook"] }] }] } });
        let only = only.as_object_mut().unwrap();
        strip_ours(only);
        assert!(only.get("hooks").is_none());
    }

    #[test]
    fn connect_then_disconnect_restores_user_settings() {
        let dir = std::env::temp_dir().join(format!("nook-claude-test-{}", now_ms()));
        std::fs::create_dir_all(&dir).unwrap();
        let original = "{
  \"theme\": \"auto\",
  \"hooks\": {
    \"Stop\": [
      {
        \"hooks\": [
          {
            \"type\": \"command\",
            \"command\": \"say done\"
          }
        ]
      }
    ]
  },
  \"zeta\": 1
}
";
        std::fs::write(dir.join("settings.json"), original).unwrap();
        std::env::set_var("CLAUDE_CONFIG_DIR", &dir);

        let backup = claude_connect().unwrap().expect("yedek alınmalı");
        assert_eq!(std::fs::read_to_string(&backup).unwrap(), original);
        let setup = claude_setup();
        assert!(setup.present && setup.hooked && !setup.stale);
        assert_eq!(setup.statusline, "nook");
        let (_, m) = read_settings().unwrap();
        // Sıra korunur, kullanıcının hook'u yerinde
        assert_eq!(m.keys().next().map(String::as_str), Some("theme"));
        assert_eq!(m["hooks"]["Stop"][0]["hooks"][0]["command"], "say done");
        assert_eq!(m["hooks"]["Stop"].as_array().unwrap().len(), 2);
        assert_eq!(m["hooks"]["PermissionRequest"][0]["hooks"][0]["timeout"], 120);
        // İki kez bağlamak çoğaltmaz
        claude_connect().unwrap();
        let (_, m) = read_settings().unwrap();
        assert_eq!(m["hooks"]["Stop"].as_array().unwrap().len(), 2);

        claude_disconnect().unwrap();
        let after = std::fs::read_to_string(dir.join("settings.json")).unwrap();
        assert_eq!(after, original);
        std::env::remove_var("CLAUDE_CONFIG_DIR");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn wrapped_status_keeps_users_command() {
        let own = "bash ~/.claude/statusline.sh && echo ok";
        let v = json!({ "type": "command", "command": format!("{} {TEE_ARG} | {own}", status_command(r"C:\Users\A B\nook.exe")), "padding": 1 });
        assert!(is_our_status(&v));
        assert_eq!(unwrap_status(&v).as_deref(), Some(own));
        assert_eq!(unwrap_status(&json!({ "command": "C:/x/nook.exe claude-status" })), None);
    }

    #[test]
    fn status_command_quotes_only_paths_with_spaces() {
        assert_eq!(status_command(r"C:\Users\OEM\AppData\Local\Nook\nook.exe"), "C:/Users/OEM/AppData/Local/Nook/nook.exe claude-status");
        assert_eq!(status_command(r"C:\Users\A B\nook.exe"), "\"C:/Users/A B/nook.exe\" claude-status");
    }
}
