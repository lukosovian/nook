//! Telefondan uzaktan kontrol (Nook Mobil › Bilgisayar › Uzaktan kontrol).
//!
//! Ekran: telefon `GET /v1/rc/frame` ile sıradaki kareyi ister; PC ekranı küçültüp JPEG yapar. Telefon son
//! gördüğü karenin özetini (`h`) gönderir: ekran değişmediyse PC bir saniyeye kadar bekler, yine aynıysa
//! görüntüsüz 204 döner. Böylece durağan ekranda ağ boşa harcanmaz, değişince hemen gelir.
//! Girdi: telefon `POST /v1/rc/input` ile fare/klavye olaylarını sırayla gönderir; burada SendInput ile
//! uygulanır. Fare konumu ekranın içinde 0–1 arası oran olarak gelir.
//!
//! Ayarlar › Telefon'dan ayrıca açılır (varsayılan kapalı). Kontrol başlayınca adada "Telefondan uzaktan
//! kontrol" görünür ki PC başındaki kişi bilsin.

use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::Deserialize;

/// Son kare isteği: aradan uzun süre geçtiyse yeni oturum sayılır ve adada duyurulur
static LAST: Mutex<Option<Instant>> = Mutex::new(None);

pub struct Frame {
    /// Ekran değişmediyse yok
    pub jpeg: Option<Vec<u8>>,
    pub hash: u64,
    /// İmlecin bu ekrandaki yeri (0–1); başka ekrandaysa yok
    pub cursor: Option<(f64, f64)>,
    pub locked: bool,
}

fn rect(monitor: usize) -> Result<(i32, i32, i32, i32), String> {
    crate::imaging::monitors().get(monitor).map(|m| m.0).ok_or_else(|| "böyle bir ekran yok".into())
}

fn hash(rgb: &[u8]) -> u64 {
    use std::hash::{Hash, Hasher};
    let mut h = std::collections::hash_map::DefaultHasher::new();
    rgb.hash(&mut h);
    h.finish()
}

/// Oturum başladıysa (bir süredir kare istenmediyse) adada duyurur
fn touch(app: Option<&tauri::AppHandle>) {
    let mut last = LAST.lock().unwrap();
    let fresh = last.is_none_or(|t| t.elapsed() > Duration::from_secs(20));
    *last = Some(Instant::now());
    if fresh {
        crate::log::write("info", "telefon: uzaktan kontrol başladı");
        if let Some(app) = app {
            crate::system::emit_event(app, "phone", "Telefondan uzaktan kontrol", "Nook Mobil");
        }
    }
}

pub fn frame(app: Option<&tauri::AppHandle>, monitor: usize, max: u32, quality: u8, last: u64) -> Result<Frame, String> {
    touch(app);
    let r = rect(monitor)?;
    let until = Instant::now() + Duration::from_millis(1000);
    loop {
        let (w, h, rgb) = crate::imaging::capture_rect_rgb(r, max).ok_or("ekran görüntüsü alınamadı")?;
        let sum = hash(&rgb);
        let changed = sum != last;
        if changed || Instant::now() >= until {
            let jpeg = if changed { Some(crate::imaging::encode_jpeg(w as u16, h as u16, &rgb, quality).ok_or("görüntü kodlanamadı")?) } else { None };
            return Ok(Frame { jpeg, hash: sum, cursor: imp::cursor(r), locked: crate::system::screen_locked() });
        }
        std::thread::sleep(Duration::from_millis(70));
    }
}

#[derive(Deserialize)]
#[serde(tag = "t", rename_all = "camelCase")]
pub enum Ev {
    /// İmleci ekranın içinde orana taşır
    Move { x: f64, y: f64 },
    /// b: "l" | "r" | "m"
    Down { b: String },
    Up { b: String },
    /// Çentik cinsinden; aşağı kaydırma artı
    Wheel {
        #[serde(default)]
        dy: f64,
        #[serde(default)]
        dx: f64,
    },
    /// Yazı (telefon klavyesinden)
    Text { s: String },
    /// Tek tuş, isteğe bağlı değiştiricilerle: { k: "c", mods: ["ctrl"] }
    Key {
        k: String,
        #[serde(default)]
        mods: Vec<String>,
    },
}

#[derive(Deserialize)]
pub struct Input {
    #[serde(default)]
    pub m: usize,
    pub ev: Vec<Ev>,
}

pub fn input(inp: Input) -> Result<(), String> {
    *LAST.lock().unwrap() = Some(Instant::now());
    let r = rect(inp.m)?;
    for ev in inp.ev {
        imp::apply(r, ev)?;
    }
    Ok(())
}

#[cfg(windows)]
mod imp {
    use super::Ev;
    use windows_sys::Win32::Foundation::POINT;
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::*;
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetCursorPos, SetCursorPos};

    pub fn cursor((x, y, w, h): (i32, i32, i32, i32)) -> Option<(f64, f64)> {
        let mut p = POINT { x: 0, y: 0 };
        if unsafe { GetCursorPos(&mut p) } == 0 || p.x < x || p.y < y || p.x >= x + w || p.y >= y + h {
            return None;
        }
        Some(((p.x - x) as f64 / w as f64, (p.y - y) as f64 / h as f64))
    }

    fn send(seq: &[INPUT]) {
        if !seq.is_empty() {
            unsafe { SendInput(seq.len() as u32, seq.as_ptr(), std::mem::size_of::<INPUT>() as i32) };
        }
    }

    fn mouse(flags: u32, data: i32) -> INPUT {
        INPUT { r#type: INPUT_MOUSE, Anonymous: INPUT_0 { mi: MOUSEINPUT { dx: 0, dy: 0, mouseData: data as _, dwFlags: flags, time: 0, dwExtraInfo: 0 } } }
    }

    fn key(vk: VIRTUAL_KEY, scan: u16, flags: u32) -> INPUT {
        INPUT { r#type: INPUT_KEYBOARD, Anonymous: INPUT_0 { ki: KEYBDINPUT { wVk: vk, wScan: scan, dwFlags: flags, time: 0, dwExtraInfo: 0 } } }
    }

    /// Ok, Home, Delete gibi tuşlar "genişletilmiş" bayrağıyla gönderilmeli (yoksa sayısal tuş takımı sanılır)
    fn extended(vk: VIRTUAL_KEY) -> bool {
        matches!(vk, VK_LEFT | VK_RIGHT | VK_UP | VK_DOWN | VK_HOME | VK_END | VK_PRIOR | VK_NEXT | VK_INSERT | VK_DELETE | VK_LWIN | VK_RWIN | VK_APPS)
    }

    fn press(vk: VIRTUAL_KEY, up: bool) -> INPUT {
        let mut f = if up { KEYEVENTF_KEYUP } else { 0 };
        if extended(vk) {
            f |= KEYEVENTF_EXTENDEDKEY;
        }
        key(vk, 0, f)
    }

    fn vk_of(name: &str) -> Option<VIRTUAL_KEY> {
        Some(match name {
            "enter" => VK_RETURN,
            "backspace" => VK_BACK,
            "tab" => VK_TAB,
            "esc" => VK_ESCAPE,
            "space" => VK_SPACE,
            "delete" => VK_DELETE,
            "insert" => VK_INSERT,
            "left" => VK_LEFT,
            "right" => VK_RIGHT,
            "up" => VK_UP,
            "down" => VK_DOWN,
            "home" => VK_HOME,
            "end" => VK_END,
            "pageup" => VK_PRIOR,
            "pagedown" => VK_NEXT,
            "win" => VK_LWIN,
            "ctrl" => VK_CONTROL,
            "alt" => VK_MENU,
            "shift" => VK_SHIFT,
            "printscreen" => VK_SNAPSHOT,
            "volup" => VK_VOLUME_UP,
            "voldown" => VK_VOLUME_DOWN,
            "mute" => VK_VOLUME_MUTE,
            _ => {
                if let Some(n) = name.strip_prefix('f').and_then(|n| n.parse::<u16>().ok()).filter(|n| (1..=12).contains(n)) {
                    return Some(VK_F1 + n - 1);
                }
                let mut c = name.chars();
                match (c.next(), c.next()) {
                    (Some(ch), None) if ch.is_ascii_alphanumeric() => ch.to_ascii_uppercase() as VIRTUAL_KEY,
                    _ => return None,
                }
            }
        })
    }

    fn buttons(b: &str) -> (u32, u32) {
        match b {
            "r" => (MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP),
            "m" => (MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP),
            _ => (MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP),
        }
    }

    pub fn apply((x, y, w, h): (i32, i32, i32, i32), ev: Ev) -> Result<(), String> {
        match ev {
            Ev::Move { x: fx, y: fy } => {
                let px = x + (fx.clamp(0.0, 1.0) * (w - 1) as f64).round() as i32;
                let py = y + (fy.clamp(0.0, 1.0) * (h - 1) as f64).round() as i32;
                unsafe { SetCursorPos(px, py) };
            }
            Ev::Down { b } => send(&[mouse(buttons(&b).0, 0)]),
            Ev::Up { b } => send(&[mouse(buttons(&b).1, 0)]),
            Ev::Wheel { dy, dx } => {
                // Windows'ta yukarı kaydırma artı
                let mut seq = Vec::new();
                if dy != 0.0 {
                    seq.push(mouse(MOUSEEVENTF_WHEEL, (-dy * 120.0).round() as i32));
                }
                if dx != 0.0 {
                    seq.push(mouse(MOUSEEVENTF_HWHEEL, (dx * 120.0).round() as i32));
                }
                send(&seq);
            }
            Ev::Text { s } => {
                let mut seq = Vec::new();
                for ch in s.chars() {
                    if ch == '\n' {
                        seq.extend([press(VK_RETURN, false), press(VK_RETURN, true)]);
                        continue;
                    }
                    let mut buf = [0u16; 2];
                    for u in ch.encode_utf16(&mut buf) {
                        seq.extend([key(0, *u, KEYEVENTF_UNICODE), key(0, *u, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP)]);
                    }
                }
                send(&seq);
            }
            Ev::Key { k, mods } => {
                let vk = vk_of(&k).ok_or_else(|| format!("bilinmeyen tuş: {k}"))?;
                let mods: Vec<VIRTUAL_KEY> = mods.iter().filter_map(|m| vk_of(m)).collect();
                let mut seq: Vec<INPUT> = mods.iter().map(|m| press(*m, false)).collect();
                seq.extend([press(vk, false), press(vk, true)]);
                seq.extend(mods.iter().rev().map(|m| press(*m, true)));
                send(&seq);
            }
        }
        Ok(())
    }
}

#[cfg(not(windows))]
mod imp {
    use super::Ev;
    pub fn cursor(_r: (i32, i32, i32, i32)) -> Option<(f64, f64)> {
        None
    }
    pub fn apply(_r: (i32, i32, i32, i32), _ev: Ev) -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
}

#[cfg(all(test, windows))]
mod tests {
    /// Kare süresi: cargo test --release --lib control::tests::frame_speed -- --ignored --nocapture
    #[test]
    #[ignore]
    fn frame_speed() {
        for w in [1280u32, 1920] {
            let t = std::time::Instant::now();
            let mut size = 0;
            for _ in 0..10 {
                size = super::frame(None, 0, w, 60, 0).unwrap().jpeg.unwrap().len();
            }
            println!("{w}: {:?}/kare, {} KB", t.elapsed() / 10, size / 1024);
        }
    }
}
