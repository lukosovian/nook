//! Claude Code'un çalıştırdığı küçük köprü — Tauri hiç başlatılmaz, pencere açılmaz.
//!  - `nook.exe claude-hook`: hook olayını (stdin'deki JSON) çalışan Nook'a named pipe ile iletir.
//!    Yalnızca izin isteğinde (PermissionRequest) adadaki cevabı bekler.
//!  - `nook.exe claude-status`: Claude Code'un durum satırı komutu; içinden yalnızca plan
//!    limitlerini (`rate_limits`) Nook'a geçirir, ekrana bir şey yazmaz.
//!
//! Tek kural: **Claude Code asla bekletilmez.** Nook kapalıysa pipe yoktur, hemen çıkılır.
//! Cevap gelmezse hiçbir şey yazılmaz ve Claude Code terminalde her zamanki gibi sorar —
//! kimse tıklamadan "izin ver" çıktısı üretilmez.

use std::io::{Read, Write};
use std::sync::mpsc;
use std::time::{Duration, Instant};

use serde_json::{json, Map, Value};

/// Pipe'a bağlanma süresi; aşılırsa Claude Code kazanır.
const CONNECT_BUDGET: Duration = Duration::from_millis(300);
/// Cevap beklenmeyen olayın tüm süresi
const FIRE_BUDGET: Duration = Duration::from_secs(2);
/// İzin kartı adada en fazla bu kadar bekler; sonra terminal sorar (hook zaman aşımı 120 sn).
const DECIDE_BUDGET: Duration = Duration::from_secs(110);
/// Adaya gönderilen her metnin üst sınırı (bayt)
const MAX_FIELD: usize = 2_000;
/// Ada hiç göstermediği, çok büyük olabilen alanlar
const DROPPED: &[&str] = &["tool_response", "transcript_path"];

/// `\\.\pipe\nook-claude-<kullanıcı>`: aynı bilgisayardaki başka hesaplar ayrı pipe kullanır.
pub fn pipe_name() -> String {
    let user = std::env::var("USERNAME").unwrap_or_else(|_| "user".into());
    let user: String = user.chars().filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_').collect();
    format!(r"\\.\pipe\nook-claude-{user}")
}

pub fn run(mode: &str) -> ! {
    let mut raw = Vec::new();
    let _ = std::io::stdin().read_to_end(&mut raw);
    let raw = raw.strip_prefix(&[0xEF, 0xBB, 0xBF]).unwrap_or(&raw);
    let payload = serde_json::from_slice::<Value>(raw).ok();
    if mode == "claude-status" {
        if let Some(line) = payload.as_ref().and_then(|p| status_line(p.as_object()?)) {
            let _ = within(CONNECT_BUDGET, move || talk(&line, false));
        }
        std::process::exit(0);
    }
    let Some(Value::Object(mut map)) = payload else { std::process::exit(0) };

    let event = map.get("hook_event_name").and_then(Value::as_str).unwrap_or_default().to_string();
    let waits = event == "PermissionRequest";
    // Geri gönderilen girdi Claude Code'un kendi girdisi olmalı, adaya giden kısaltılmış kopya değil
    let question = (map.get("tool_name").and_then(Value::as_str) == Some("AskUserQuestion")).then(|| map.get("tool_input").cloned()).flatten();
    let suggestions = map.get("permission_suggestions").filter(|s| s.as_array().is_some_and(|a| !a.is_empty())).cloned();

    for field in DROPPED {
        map.remove(*field);
    }
    if !map.contains_key("cwd") {
        if let Ok(dir) = std::env::current_dir() {
            map.insert("cwd".into(), Value::String(dir.to_string_lossy().into()));
        }
    }
    let mut value = Value::Object(map);
    cap_strings(&mut value);
    let mut line = value.to_string();
    line.push('\n');

    let decision = within(if waits { DECIDE_BUDGET } else { FIRE_BUDGET }, move || talk(&line, waits)).flatten();
    if waits {
        if let Some(out) = decision.as_deref().and_then(|d| reply(d, question.as_ref(), suggestions.as_ref())) {
            let mut stdout = std::io::stdout();
            let _ = writeln!(stdout, "{out}");
            let _ = stdout.flush();
        }
    }
    std::process::exit(0);
}

/// İşi ayrı iş parçacığında yürütür; süre dolarsa beklemeyi bırakır (süreç çıkınca pipe da kapanır).
fn within<T: Send + 'static>(budget: Duration, work: impl FnOnce() -> T + Send + 'static) -> Option<T> {
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let _ = tx.send(work());
    });
    rx.recv_timeout(budget).ok()
}

/// Durum satırı çağrısından Nook'a giden tek satır: yalnızca limitler (Pro/Max; API anahtarında yok).
fn status_line(map: &Map<String, Value>) -> Option<String> {
    let limits = map.get("rate_limits").filter(|v| v.is_object())?;
    let mut line = json!({
        "hook_event_name": "StatusLine",
        "session_id": map.get("session_id").cloned().unwrap_or(Value::Null),
        "rate_limits": limits,
    })
    .to_string();
    line.push('\n');
    Some(line)
}

/// Bağlan, gönder; izin isteğiyse adanın cevabını bekle.
fn talk(line: &str, waits: bool) -> Option<String> {
    let mut pipe = connect()?;
    pipe.write_all(line.as_bytes()).ok()?;
    let _ = pipe.flush();
    if !waits {
        return None;
    }
    let mut buf = Vec::new();
    let mut chunk = [0u8; 1024];
    loop {
        match pipe.read(&mut chunk) {
            Ok(0) | Err(_) => break,
            Ok(n) => {
                buf.extend_from_slice(&chunk[..n]);
                if buf.contains(&b'\n') || buf.len() > 64 * 1024 {
                    break;
                }
            }
        }
    }
    let answer = String::from_utf8_lossy(&buf).trim().to_string();
    (!answer.is_empty()).then_some(answer)
}

/// Pipe'ı açar. Yalnızca "meşgul" hatasında kısa süre yeniden dener; pipe yoksa Nook kapalıdır.
fn connect() -> Option<std::fs::File> {
    const ERROR_PIPE_BUSY: i32 = 231;
    let name = pipe_name();
    let deadline = Instant::now() + CONNECT_BUDGET;
    loop {
        match std::fs::OpenOptions::new().read(true).write(true).open(&name) {
            Ok(f) => return Some(f),
            Err(e) if e.raw_os_error() == Some(ERROR_PIPE_BUSY) && Instant::now() < deadline => std::thread::sleep(Duration::from_millis(15)),
            Err(_) => return None,
        }
    }
}

/// Adanın cevabı → Claude Code'un PermissionRequest çıktısı. Tanınmayan her şey: hiçbir şey yazma.
///  - "allow" · "deny" · "always" (önerilen izin kurallarıyla birlikte izin ver)
///  - `{"answers": {...}}`: AskUserQuestion'ın cevabı, sorulan sorulara birebir uymalı
fn reply(decision: &str, question: Option<&Value>, suggestions: Option<&Value>) -> Option<String> {
    let behavior = if decision.trim_start().starts_with('{') {
        let answers = serde_json::from_str::<Value>(decision).ok()?.get("answers")?.as_object()?.clone();
        let question = question?;
        if !answers_fit(question, &answers) {
            return None;
        }
        let mut input = question.as_object()?.clone();
        input.insert("answers".into(), Value::Object(answers));
        json!({ "behavior": "allow", "updatedInput": input })
    } else {
        match decision.trim() {
            "allow" => json!({ "behavior": "allow" }),
            "always" => match suggestions {
                Some(s) => json!({ "behavior": "allow", "updatedPermissions": s }),
                None => json!({ "behavior": "allow" }),
            },
            "deny" => json!({ "behavior": "deny", "message": "Kullanıcı bu isteği Nook'tan reddetti." }),
            _ => return None,
        }
    };
    Some(json!({ "hookSpecificOutput": { "hookEventName": "PermissionRequest", "decision": behavior } }).to_string())
}

/// Her soruya tam bir cevap: tek seçimde seçeneklerden biri, çoklu seçimde tekrarsız, boş olmayan liste.
fn answers_fit(question: &Value, answers: &Map<String, Value>) -> bool {
    let Some(items) = question.get("questions").and_then(Value::as_array) else { return false };
    if items.is_empty() || items.len() != answers.len() {
        return false;
    }
    items.iter().all(|item| {
        let Some(text) = item.get("question").and_then(Value::as_str) else { return false };
        let labels: Vec<&str> = item
            .get("options")
            .and_then(Value::as_array)
            .map(|o| o.iter().filter_map(|x| x.get("label").and_then(Value::as_str)).collect())
            .unwrap_or_default();
        let multi = item.get("multiSelect").and_then(Value::as_bool).unwrap_or(false);
        match answers.get(text) {
            Some(Value::String(pick)) if !multi => labels.contains(&pick.as_str()),
            Some(Value::Array(picks)) if multi => {
                let picks: Vec<&str> = picks.iter().filter_map(Value::as_str).collect();
                let mut uniq = picks.clone();
                uniq.sort_unstable();
                uniq.dedup();
                !picks.is_empty() && uniq.len() == picks.len() && picks.iter().all(|p| labels.contains(p))
            }
            _ => false,
        }
    })
}

/// Her metni MAX_FIELD bayta kısaltır (UTF-8 sınırında)
pub fn cap_strings(v: &mut Value) {
    cap_strings_to(v, MAX_FIELD);
}

pub fn cap_strings_to(v: &mut Value, max: usize) {
    match v {
        Value::String(s) if s.len() > max => {
            let mut end = max;
            while !s.is_char_boundary(end) {
                end -= 1;
            }
            s.truncate(end);
            s.push('…');
        }
        Value::Array(a) => a.iter_mut().for_each(|x| cap_strings_to(x, max)),
        Value::Object(m) => m.values_mut().for_each(|x| cap_strings_to(x, max)),
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nothing_allows_without_a_known_decision() {
        for d in ["", "ask", "maybe", r#"{"permissionDecision":"allow"}"#, r#"{"answers":{"q":"a"}}"#] {
            assert!(reply(d, None, None).is_none(), "{d}");
        }
        assert!(reply("allow", None, None).unwrap().contains(r#""behavior":"allow""#));
        assert!(reply("deny", None, None).unwrap().contains(r#""behavior":"deny""#));
    }

    #[test]
    fn always_carries_the_suggestions() {
        let s = json!([{ "type": "addRules", "rules": [{ "toolName": "Bash" }], "behavior": "allow", "destination": "localSettings" }]);
        let out: Value = serde_json::from_str(&reply("always", None, Some(&s)).unwrap()).unwrap();
        assert_eq!(out["hookSpecificOutput"]["decision"]["updatedPermissions"], s);
    }

    #[test]
    fn answers_must_fit_the_question() {
        let q = json!({ "questions": [
            { "question": "Hangisi?", "options": [{ "label": "A" }, { "label": "B" }] },
            { "question": "Ekler?", "multiSelect": true, "options": [{ "label": "Test" }, { "label": "Doc" }] }
        ]});
        assert!(reply(r#"{"answers":{"Hangisi?":"A","Ekler?":["Test"]}}"#, Some(&q), None).is_some());
        assert!(reply(r#"{"answers":{"Hangisi?":"C","Ekler?":["Test"]}}"#, Some(&q), None).is_none());
        assert!(reply(r#"{"answers":{"Hangisi?":"A"}}"#, Some(&q), None).is_none());
        assert!(reply(r#"{"answers":{"Hangisi?":"A","Ekler?":[]}}"#, Some(&q), None).is_none());
        let out: Value = serde_json::from_str(&reply(r#"{"answers":{"Hangisi?":"B","Ekler?":["Doc","Test"]}}"#, Some(&q), None).unwrap()).unwrap();
        assert_eq!(out["hookSpecificOutput"]["decision"]["updatedInput"]["answers"]["Hangisi?"], "B");
        assert_eq!(out["hookSpecificOutput"]["decision"]["updatedInput"]["questions"], q["questions"]);
    }

    #[test]
    fn strings_are_cut_on_char_boundaries() {
        let mut v = json!({ "a": "ş".repeat(3000) });
        cap_strings(&mut v);
        assert!(v["a"].as_str().unwrap().len() <= MAX_FIELD + 3);
    }
}
