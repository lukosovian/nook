//! Pano izleyici. Windows'ta GetClipboardSequenceNumber çok ucuz bir sayaçtır;
//! panoyu yalnızca sayaç değiştiğinde okuruz.

use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter};
use tauri_plugin_clipboard_manager::ClipboardExt;

const POLL: Duration = Duration::from_millis(350);
const MAX_LEN: usize = 4000;

pub fn spawn(app: AppHandle) {
    thread::Builder::new()
        .name("nook-clipboard".into())
        .spawn(move || {
            let mut last_seq = sequence();
            let mut last_text = String::new();
            loop {
                thread::sleep(POLL);

                let seq = sequence();
                if seq.is_some() && seq == last_seq {
                    continue;
                }
                last_seq = seq;

                // Metin olmayan içerik (görsel, dosya) hata döner — sessizce geç.
                let Ok(text) = app.clipboard().read_text() else { continue };
                let text = text.trim();
                if text.is_empty() || text.len() > MAX_LEN || text == last_text {
                    continue;
                }
                last_text = text.to_owned();
                let _ = app.emit("nook://clipboard", &last_text);
            }
        })
        .expect("clipboard thread başlatılamadı");
}

#[cfg(windows)]
fn sequence() -> Option<u32> {
    use windows_sys::Win32::System::DataExchange::GetClipboardSequenceNumber;
    Some(unsafe { GetClipboardSequenceNumber() })
}

#[cfg(not(windows))]
fn sequence() -> Option<u32> {
    None
}
