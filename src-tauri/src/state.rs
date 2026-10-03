//! Tüm thread'lerin ve komutların paylaştığı durum.
//! Birden fazla ada penceresi olabilir ("Tüm ekranlar" modu) — her biri etiketiyle tutulur.

use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicBool, AtomicIsize};
use std::sync::Mutex;

use serde::Deserialize;
use tauri::{PhysicalPosition, WebviewWindow};

/// Pencere-yerel, mantıksal (CSS px) dikdörtgen. Frontend her boyut değişiminde günceller.
#[derive(Clone, Copy, Default, Debug, Deserialize)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

impl Rect {
    pub fn contains(&self, x: f64, y: f64) -> bool {
        self.width > 0.0
            && x >= self.x
            && x <= self.x + self.width
            && y >= self.y
            && y <= self.y + self.height
    }

    pub fn distance(&self, x: f64, y: f64) -> f64 {
        let dx = (self.x - x).max(x - (self.x + self.width)).max(0.0);
        let dy = (self.y - y).max(y - (self.y + self.height)).max(0.0);
        dx.hypot(dy)
    }
}

/// Pencerenin fiziksel konumu ve ölçeği (imleci pencere-yerel koordinata çevirmek için).
#[derive(Clone, Copy, Debug)]
pub struct Geometry {
    pub x: f64,
    pub y: f64,
    pub scale: f64,
}

impl Default for Geometry {
    fn default() -> Self {
        Self { x: 0.0, y: 0.0, scale: 1.0 }
    }
}

#[derive(Clone, Copy, Default)]
pub struct WinState {
    pub hit: Rect,
    /// Adaya bağlı ek alan (ör. yandaki Argus kartı): imleç oradayken de ada açık kalır.
    pub extra: Rect,
    pub geom: Geometry,
    pub hwnd: isize,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MonitorMode {
    /// Ana ekranda dur
    #[default]
    Primary,
    /// İmlecin olduğu ekrana animasyonla geç
    Follow,
    /// Her ekranda bir ada
    All,
    /// Seçilen ekranda dur
    Fixed,
}

/// Frontend'in Rust'a bildirdiği ayarlar (tamamı `localStorage`'da, kaynak frontend).
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub monitor_mode: MonitorMode,
    pub monitor_name: Option<String>,
    /// 0 = hiç uyuma
    pub sleep_after_sec: u64,
    pub shortcut: String,
    /// Ekrana sor
    pub ask_shortcut: String,
    /// Sesli komut (basılı tut)
    pub voice_shortcut: String,
    pub auto_screenshots: bool,
    pub hide_in_fullscreen: bool,
    /// Oyun açılınca ada gizlenmeden önce birkaç saniye özet gösterir
    pub game_intro: bool,
    /// Bu kadar dakikada bir mola hatırlatır (0 = kapalı)
    pub break_reminder_min: u64,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            monitor_mode: MonitorMode::Primary,
            monitor_name: None,
            sleep_after_sec: 90,
            shortcut: "Ctrl+Shift+Space".into(),
            ask_shortcut: "Ctrl+Shift+A".into(),
            voice_shortcut: "Ctrl+Shift+D".into(),
            auto_screenshots: true,
            hide_in_fullscreen: true,
            game_intro: true,
            break_reminder_min: 120,
        }
    }
}

#[derive(Default)]
pub struct Shared {
    pub windows: Mutex<HashMap<String, WinState>>,
    /// İmleç dışarıda olsa bile etkileşimli kalması gereken pencereler (arama açıkken).
    pub forced: Mutex<HashSet<String>>,
    pub settings: Mutex<Settings>,
    /// Nook odağı almadan önce öndeki pencere — odağı geri vermek için.
    pub prev_foreground: AtomicIsize,
    /// Pencere ekranlar arası taşınırken tracker yeni taşıma başlatmasın.
    pub relocating: AtomicBool,
    /// Alarm çalıyor — tam ekranda bile ada görünür kalır.
    pub alert: AtomicBool,
    /// Sıradaki alarmın zamanı (Unix ms, 0 = yok). Tam ekrandayken gizli pencerenin
    /// zamanlayıcıları kısılır; vakit yaklaşınca ada önceden açılsın ki alarm kaçmasın.
    pub next_alarm: std::sync::atomic::AtomicI64,
    /// Son CPU ölçümü (%, f32 bitleri) ve bellek doluluğu (%) — oyun oturumu özeti için
    pub cpu: std::sync::atomic::AtomicU32,
    pub mem: std::sync::atomic::AtomicU32,
    /// Öndeki tam ekran oyunun monitörü (sol, üst, sağ, alt — fiziksel px). İmleç oradayken
    /// ada açılmaz: pencere etkileşimli olunca tam ekran oyun odağı kaybedip alta düşer.
    pub game_screen: Mutex<Option<(i32, i32, i32, i32)>>,
}

impl Shared {
    pub fn register(&self, win: &WebviewWindow) {
        let hwnd = win.hwnd().map(|h| h.0 as isize).unwrap_or_default();
        let geom = match (win.outer_position(), win.scale_factor()) {
            (Ok(p), Ok(s)) => Geometry { x: p.x as f64, y: p.y as f64, scale: s },
            _ => Geometry::default(),
        };
        let mut map = self.windows.lock().unwrap();
        let entry = map.entry(win.label().to_owned()).or_default();
        entry.hwnd = hwnd;
        entry.geom = geom;
    }

    pub fn unregister(&self, label: &str) {
        self.windows.lock().unwrap().remove(label);
        self.forced.lock().unwrap().remove(label);
    }

    pub fn set_hit(&self, label: &str, rect: Rect, extra: Option<Rect>) {
        if let Some(w) = self.windows.lock().unwrap().get_mut(label) {
            w.hit = rect;
            w.extra = extra.unwrap_or_default();
        }
    }

    pub fn set_geometry(&self, label: &str, pos: PhysicalPosition<i32>, scale: f64) {
        if let Some(w) = self.windows.lock().unwrap().get_mut(label) {
            w.geom = Geometry { x: pos.x as f64, y: pos.y as f64, scale };
        }
    }

    pub fn is_ours(&self, hwnd: isize) -> bool {
        self.windows.lock().unwrap().values().any(|w| w.hwnd == hwnd)
    }

    pub fn settings(&self) -> Settings {
        self.settings.lock().unwrap().clone()
    }
}
