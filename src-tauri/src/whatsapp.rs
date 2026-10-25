//! WhatsApp entegrasyonu:
//! 1. Bildirim köprüsü: Nook Mobil (Android RemoteInput) ve Windows WhatsApp bildirimlerinden gelen
//!    mesajlar adada toplanır; telefon bildirimlerine doğrudan RemoteInput üzerinden hızlı yanıt verilir.
//! 2. WhatsApp Web köprüsü: İsteyen kullanıcı Nook içinde (arka planda yaşayan WebView2 oturumuyla)
//!    WhatsApp Web'i bağlayabilir; böylece bildirim gelmesini beklemeden son sohbetleri görebilir,
//!    mesaj geçmişini okuyabilir ve doğrudan Nook adasından mesaj gönderebilir.

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, Window, WindowEvent};

pub const LABEL: &str = "whatsapp";
const WA_URL: &str = "https://web.whatsapp.com/";
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

#[derive(Clone, Default, Serialize, Deserialize)]
struct Config {
    enabled: bool,
}

#[derive(Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WaChat {
    pub id: String,
    pub title: String,
    pub last_text: String,
    pub time: String,
    pub unread: u32,
    pub avatar: Option<String>,
}

#[derive(Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WaMessage {
    pub id: String,
    pub sender: String,
    pub text: String,
    pub time: String,
    pub from_me: bool,
}

#[derive(Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WaState {
    /// "disconnected" | "loading" | "qr" | "ready"
    pub status: String,
    /// Giriş ekranındaki QR kod (data:image/png;base64,…)
    pub qr: Option<String>,
    pub chats: Vec<WaChat>,
    pub active_chat: Option<String>,
    pub messages: Vec<WaMessage>,
    pub window_visible: bool,
    pub enabled: bool,
}

impl Default for WaState {
    fn default() -> Self {
        Self {
            status: "disconnected".into(),
            qr: None,
            chats: Vec::new(),
            active_chat: None,
            messages: Vec::new(),
            window_visible: false,
            enabled: false,
        }
    }
}

static STATE: Mutex<Option<WaState>> = Mutex::new(None);
static CLOSING: AtomicBool = AtomicBool::new(false);
static LAST_TITLE_JSON: Mutex<String> = Mutex::new(String::new());

fn config_path() -> Option<PathBuf> {
    Some(PathBuf::from(std::env::var_os("LOCALAPPDATA")?).join("Nook").join("whatsapp.json"))
}

fn load_enabled() -> bool {
    config_path()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str::<Config>(&s).ok())
        .map(|c| c.enabled)
        .unwrap_or(false)
}

fn save_enabled(enabled: bool) {
    let Some(p) = config_path() else { return };
    if let Some(dir) = p.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    if let Ok(s) = serde_json::to_string_pretty(&Config { enabled }) {
        let _ = std::fs::write(p, s);
    }
}

fn current_state() -> WaState {
    let mut guard = STATE.lock().unwrap();
    if guard.is_none() {
        let enabled = load_enabled();
        *guard = Some(WaState {
            enabled,
            ..WaState::default()
        });
    }
    guard.as_ref().unwrap().clone()
}

fn emit_state(app: &AppHandle, st: &WaState) {
    let _ = app.emit("nook://whatsapp", st);
}

pub fn spawn(app: AppHandle) {
    let enabled = load_enabled();
    {
        let mut guard = STATE.lock().unwrap();
        *guard = Some(WaState {
            status: if enabled { "loading".into() } else { "disconnected".into() },
            enabled,
            ..WaState::default()
        });
    }

    // Başlık (DocumentTitle) yoklayıcısı: WhatsApp Web'in CSP kuralları IPC'yi engellese bile
    // gömülü betik durumu document.title ("NOOK_WA:{json}") üzerinden güvenli ve kesintisiz aktarır.
    let poll_app = app.clone();
    thread::Builder::new()
        .name("nook-wa-poll".into())
        .spawn(move || loop {
            thread::sleep(Duration::from_millis(1200));
            let Some(win) = poll_app.get_webview_window(LABEL) else {
                continue;
            };
            if let Ok(title) = win.title() {
                if let Some(json_str) = title.strip_prefix("NOOK_WA:") {
                    let mut last = LAST_TITLE_JSON.lock().unwrap();
                    if *last != json_str {
                        *last = json_str.to_owned();
                        drop(last);
                        if let Ok(val) = serde_json::from_str::<Value>(json_str) {
                            apply_push(&poll_app, val);
                        }
                    }
                }
            }
        })
        .ok();

    if enabled {
        let boot_app = app.clone();
        thread::spawn(move || {
            thread::sleep(Duration::from_secs(3));
            let _ = ensure_window(&boot_app, false);
        });
    }
}

/// Kullanıcı WhatsApp Web penceresinin çarpısına basınca oturum kopmasın diye pencereyi kapatmak
/// yerine gizleriz; yalnızca "Bağlantıyı kes" dendiğinde gerçekten kapanır.
pub fn on_window_event(win: &Window, event: &WindowEvent) {
    if win.label() != LABEL {
        return;
    }
    if let WindowEvent::CloseRequested { api, .. } = event {
        if !CLOSING.load(Ordering::SeqCst) {
            api.prevent_close();
            let _ = win.hide();
            let mut guard = STATE.lock().unwrap();
            if let Some(st) = guard.as_mut() {
                st.window_visible = false;
                let snap = st.clone();
                drop(guard);
                emit_state(win.app_handle(), &snap);
            }
        }
    }
}

fn ensure_window(app: &AppHandle, show: bool) -> Result<(), String> {
    CLOSING.store(false, Ordering::SeqCst);
    save_enabled(true);
    if let Some(w) = app.get_webview_window(LABEL) {
        if show {
            let _ = w.show();
            let _ = w.unminimize();
            let _ = w.set_focus();
        }
        let vis = w.is_visible().unwrap_or(show);
        let mut guard = STATE.lock().unwrap();
        let st = guard.get_or_insert_with(WaState::default);
        st.enabled = true;
        st.window_visible = vis;
        if st.status == "disconnected" {
            st.status = "loading".into();
        }
        let snap = st.clone();
        drop(guard);
        emit_state(app, &snap);
        return Ok(());
    }

    let url = tauri::Url::parse(WA_URL).map_err(|e| e.to_string())?;
    WebviewWindowBuilder::new(app, LABEL, WebviewUrl::External(url))
        .title("WhatsApp Web · Nook")
        .inner_size(980.0, 680.0)
        .min_inner_size(680.0, 480.0)
        .center()
        .visible(show)
        .user_agent(USER_AGENT)
        .initialization_script(WA_BRIDGE_JS)
        .build()
        .map_err(|e| e.to_string())?;

    let mut guard = STATE.lock().unwrap();
    let st = guard.get_or_insert_with(WaState::default);
    st.enabled = true;
    st.window_visible = show;
    if st.status == "disconnected" {
        st.status = "loading".into();
    }
    let snap = st.clone();
    drop(guard);
    emit_state(app, &snap);
    Ok(())
}

fn apply_push(app: &AppHandle, data: Value) {
    let status = data["status"].as_str().unwrap_or("loading").to_owned();
    let qr = data["qr"].as_str().filter(|s| s.starts_with("data:image/")).map(str::to_owned);
    let active_chat = data["activeChat"].as_str().filter(|s| !s.is_empty()).map(str::to_owned);

    let chats: Vec<WaChat> = data["chats"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|c| {
                    let title = c["title"].as_str()?.trim().to_owned();
                    if title.is_empty() {
                        return None;
                    }
                    Some(WaChat {
                        id: c["id"].as_str().unwrap_or(&title).to_owned(),
                        title,
                        last_text: c["lastText"].as_str().unwrap_or("").trim().to_owned(),
                        time: c["time"].as_str().unwrap_or("").trim().to_owned(),
                        unread: c["unread"].as_u64().unwrap_or(0) as u32,
                        avatar: c["avatar"].as_str().filter(|a| a.starts_with("data:") || a.starts_with("https://")).map(str::to_owned),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    let messages: Vec<WaMessage> = data["messages"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|m| {
                    let text = m["text"].as_str()?.trim().to_owned();
                    if text.is_empty() {
                        return None;
                    }
                    Some(WaMessage {
                        id: m["id"].as_str().unwrap_or("").to_owned(),
                        sender: m["sender"].as_str().unwrap_or("").to_owned(),
                        text,
                        time: m["time"].as_str().unwrap_or("").to_owned(),
                        from_me: m["fromMe"].as_bool().unwrap_or(false),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    let vis = app
        .get_webview_window(LABEL)
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false);

    let mut guard = STATE.lock().unwrap();
    let cur = guard.get_or_insert_with(WaState::default);
    let next = WaState {
        status,
        qr,
        chats: if !chats.is_empty() || data["status"].as_str() != Some("ready") {
            chats
        } else {
            cur.chats.clone()
        },
        active_chat: active_chat.or_else(|| cur.active_chat.clone()),
        messages: if !messages.is_empty() || data["activeChat"].is_string() {
            messages
        } else {
            cur.messages.clone()
        },
        window_visible: vis,
        enabled: true,
    };
    if *cur != next {
        *cur = next.clone();
        drop(guard);
        emit_state(app, &next);
    }
}

#[tauri::command]
pub fn wa_state(app: AppHandle) -> WaState {
    let mut st = current_state();
    st.window_visible = app
        .get_webview_window(LABEL)
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false);
    st
}

#[tauri::command]
pub async fn wa_connect(app: AppHandle, show: bool) -> Result<WaState, String> {
    ensure_window(&app, show)?;
    Ok(wa_state(app))
}

#[tauri::command]
pub async fn wa_disconnect(app: AppHandle) -> Result<WaState, String> {
    CLOSING.store(true, Ordering::SeqCst);
    save_enabled(false);
    *LAST_TITLE_JSON.lock().unwrap() = String::new();
    if let Some(w) = app.get_webview_window(LABEL) {
        let _ = w.close();
    }
    let st = WaState::default();
    *STATE.lock().unwrap() = Some(st.clone());
    emit_state(&app, &st);
    Ok(st)
}

#[tauri::command]
pub fn wa_select_chat(app: AppHandle, title: String) -> Result<(), String> {
    let Some(w) = app.get_webview_window(LABEL) else {
        return Err("WhatsApp Web bağlı değil".into());
    };
    let arg = serde_json::to_string(&title).map_err(|e| e.to_string())?;
    w.eval(&format!("window.__nookWaSelectChat && window.__nookWaSelectChat({arg});"))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn wa_send(app: AppHandle, title: String, text: String, reply_key: Option<String>) -> Result<String, String> {
    let text = text.trim().to_owned();
    if text.is_empty() {
        return Err("Mesaj boş".into());
    }
    let st = current_state();
    // WhatsApp Web hazırsa ve penceresi açıksa doğrudan sohbet üzerinden gönder
    if st.status == "ready" {
        if let Some(w) = app.get_webview_window(LABEL) {
            let t_arg = serde_json::to_string(&title).map_err(|e| e.to_string())?;
            let m_arg = serde_json::to_string(&text).map_err(|e| e.to_string())?;
            if w.eval(&format!("window.__nookWaSend && window.__nookWaSend({t_arg}, {m_arg});")).is_ok() {
                return Ok("web".into());
            }
        }
    }
    // Telefon bildirimi yanıt anahtarı varsa (Nook Mobil RemoteInput) doğrudan telefondan yanıtla
    if let Some(rk) = reply_key.filter(|k| !k.trim().is_empty()) {
        crate::remote::queue_reply(rk, text)?;
        return Ok("phone".into());
    }
    Err("Yanıt göndermek için Nook Mobil bildirimi ya da bağlı bir WhatsApp Web oturumu gerekli".into())
}

#[tauri::command]
pub fn wa_push(app: AppHandle, data: Value) {
    apply_push(&app, data);
}

const WA_BRIDGE_JS: &str = r###"
(function () {
  if (window.__nookWaInit) return;
  window.__nookWaInit = true;

  let desiredChat = "";
  let lastPushStr = "";

  function cleanText(s) {
    return (s || "").replace(/\u200e|\u200f|\u202a|\u202c/g, "").trim();
  }

  function clickEl(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const x = rect.left + Math.max(10, rect.width / 3);
    const y = rect.top + Math.max(10, rect.height / 2);
    for (const type of ["mousedown", "mouseup", "click"]) {
      el.dispatchEvent(
        new MouseEvent(type, {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 0,
          buttons: 1,
        })
      );
    }
    return true;
  }

  function findChatRow(title) {
    const t = cleanText(title).toLowerCase();
    if (!t) return null;
    const pane = document.querySelector('#pane-side');
    if (!pane) return null;
    const spans = Array.from(pane.querySelectorAll("span[title]"));
    let exact = spans.find((s) => cleanText(s.getAttribute("title")).toLowerCase() === t);
    if (!exact) {
      exact = spans.find((s) => cleanText(s.getAttribute("title")).toLowerCase().includes(t));
    }
    if (!exact) return null;
    return (
      exact.closest('[role="listitem"]') ||
      exact.closest('[role="row"]') ||
      exact.closest('[data-testid="cell-frame-container"]') ||
      exact.closest("[tabindex]") ||
      exact.parentElement
    );
  }

  function extractQr() {
    const c =
      document.querySelector("div[data-ref] canvas") ||
      document.querySelector('canvas[aria-label*="QR" i], canvas[aria-label*="Scan" i], canvas[aria-label*="Tara" i]') ||
      document.querySelector("canvas");
    if (!c || c.width < 120 || c.height < 120) return null;
    try {
      return c.toDataURL("image/png");
    } catch (_) {
      return null;
    }
  }

  function extractChats() {
    const pane = document.querySelector('#pane-side');
    if (!pane) return [];
    const rawRows = Array.from(
      pane.querySelectorAll('[role="listitem"], [role="row"], [data-testid="cell-frame-container"]')
    );
    const seen = new Set();
    const rows = rawRows
      .map((el) => ({ el, top: el.getBoundingClientRect().top }))
      .sort((a, b) => a.top - b.top)
      .map((x) => x.el);

    const out = [];
    for (const row of rows) {
      const titleSpan = row.querySelector('span[title][dir="auto"], span[title]');
      if (!titleSpan) continue;
      const title = cleanText(titleSpan.getAttribute("title") || titleSpan.textContent);
      if (!title || seen.has(title)) continue;
      seen.add(title);

      const allTitled = Array.from(row.querySelectorAll("span[title]"))
        .map((s) => cleanText(s.getAttribute("title") || s.textContent))
        .filter((s) => s && s !== title);
      let lastText = allTitled[0] || "";
      if (!lastText) {
        const lines = cleanText(row.innerText)
          .split("\n")
          .map((l) => cleanText(l))
          .filter(Boolean);
        lastText = lines.slice(2).join(" ") || lines[lines.length - 1] || "";
        if (lastText === title) lastText = "";
      }

      let time = "";
      const lines = cleanText(row.innerText)
        .split("\n")
        .map((l) => cleanText(l))
        .filter(Boolean);
      if (lines.length >= 2 && lines[1].length <= 14 && /\d|dün|yesterday|bugün/i.test(lines[1])) {
        time = lines[1];
      }

      let unread = 0;
      const badge = row.querySelector('[aria-label*="unread" i], [aria-label*="okunmamış" i]');
      if (badge) {
        const m = (badge.getAttribute("aria-label") || badge.textContent || "").match(/\d+/);
        unread = m ? parseInt(m[0], 10) : 1;
      }

      out.push({
        id: title,
        title: title.slice(0, 120),
        lastText: lastText.slice(0, 220),
        time: time.slice(0, 24),
        unread: unread || 0,
      });
      if (out.length >= 22) break;
    }
    return out;
  }

  function extractActiveChat() {
    const main = document.querySelector('#main');
    if (!main) return { activeChat: null, messages: [] };
    const hdr = main.querySelector('header span[title], header [dir="auto"]');
    const activeChat = hdr ? cleanText(hdr.getAttribute("title") || hdr.textContent) : null;

    const msgNodes = Array.from(
      main.querySelectorAll('[data-id], .message-in, .message-out')
    ).filter((el) => !el.parentElement?.closest(".message-in, .message-out"));

    const messages = [];
    const seenIds = new Set();
    for (const el of msgNodes.slice(-30)) {
      const textEl =
        el.querySelector(".selectable-text span") ||
        el.querySelector(".copyable-text span") ||
        el.querySelector('[dir="ltr"], [dir="auto"]');
      if (!textEl) continue;
      const text = cleanText(textEl.innerText || textEl.textContent);
      if (!text) continue;

      const dataId = el.getAttribute("data-id") || el.closest("[data-id]")?.getAttribute("data-id") || "";
      const fromMe =
        el.classList.contains("message-out") ||
        !!el.closest(".message-out") ||
        dataId.startsWith("true_");

      let time = "";
      const copyable = el.querySelector(".copyable-text[data-pre-plain-text]");
      const pre = copyable ? copyable.getAttribute("data-pre-plain-text") || "" : "";
      const tm = pre.match(/(\d{1,2}:\d{2})/);
      if (tm) time = tm[1];

      const id = dataId || `${fromMe ? "me" : "in"}_${time}_${text.slice(0, 24)}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      messages.push({
        id,
        sender: fromMe ? "Sen" : activeChat || "",
        text: text.slice(0, 600),
        time,
        fromMe,
      });
    }
    return { activeChat, messages: messages.slice(-24) };
  }

  function sync() {
    const hasPane = !!document.querySelector('#pane-side, #side');
    let status = "loading";
    let qr = null;
    if (hasPane) {
      status = "ready";
    } else {
      qr = extractQr();
      if (qr) status = "qr";
    }

    const chats = status === "ready" ? extractChats() : [];
    const { activeChat, messages } = status === "ready" ? extractActiveChat() : { activeChat: null, messages: [] };

    const payload = {
      status,
      qr,
      chats,
      activeChat: activeChat || desiredChat || null,
      messages,
    };

    const jsonStr = JSON.stringify(payload);
    if (jsonStr === lastPushStr) return;
    lastPushStr = jsonStr;

    try {
      document.title = "NOOK_WA:" + jsonStr;
    } catch (_) {}

    try {
      if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === "function") {
        window.__TAURI_INTERNALS__.invoke("wa_push", { data: payload }).catch(() => {});
      }
    } catch (_) {}
  }

  window.__nookWaSelectChat = function (title) {
    desiredChat = cleanText(title);
    const row = findChatRow(desiredChat);
    if (row) {
      clickEl(row);
      setTimeout(sync, 220);
      setTimeout(sync, 650);
    }
  };

  window.__nookWaSend = function (title, text) {
    const target = cleanText(title);
    const msg = (text || "").trim();
    if (!msg) return;

    const doTypeAndSend = () => {
      const box =
        document.querySelector('#main footer [contenteditable="true"][role="textbox"]') ||
        document.querySelector('#main footer [contenteditable="true"]');
      if (!box) return false;
      box.focus();
      try {
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, msg);
      } catch (_) {
        box.textContent = msg;
        box.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: msg }));
      }
      setTimeout(() => {
        const sendBtn =
          document.querySelector('#main footer button[aria-label*="Gönder" i]') ||
          document.querySelector('#main footer button[aria-label*="Send" i]') ||
          document.querySelector('#main footer [data-icon="send"]')?.closest("button") ||
          document.querySelector('#main footer [data-icon="wds-ic-send-filled"]')?.closest("button");
        if (sendBtn) {
          clickEl(sendBtn);
        } else {
          box.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true,
            })
          );
        }
        setTimeout(sync, 300);
        setTimeout(sync, 900);
      }, 90);
      return true;
    };

    const hdr = document.querySelector('#main header span[title], #main header [dir="auto"]');
    const currentTitle = hdr ? cleanText(hdr.getAttribute("title") || hdr.textContent) : "";
    if (currentTitle && (!target || currentTitle.toLowerCase() === target.toLowerCase())) {
      if (doTypeAndSend()) return;
    }

    if (target) {
      desiredChat = target;
      const row = findChatRow(target);
      if (row) {
        clickEl(row);
        let tries = 0;
        const waitOpen = setInterval(() => {
          tries++;
          if (doTypeAndSend() || tries >= 12) {
            clearInterval(waitOpen);
          }
        }, 140);
        return;
      }
    }
    doTypeAndSend();
  };

  setInterval(sync, 1200);
  setTimeout(sync, 500);
})();
"###;
