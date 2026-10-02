//! Ada pencerelerinin yerleşimi ve çoklu monitör modları.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, Monitor, PhysicalPosition, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

use crate::state::{MonitorMode, Settings, Shared};

pub const ISLAND: &str = "island";
/// Ek ekranlardaki adaların etiket öneki ("island-1", "island-2"…)
const EXTRA_PREFIX: &str = "island-";
/// Varsayılan pencere boyutu (mantıksal px); ada bu şeffaf tuvalin içinde animasyonla büyür.
pub const WIN_W: f64 = 600.0;
pub const WIN_H: f64 = 320.0;
/// Ana pencerenin şu anki mantıksal genişliği (f64 bitleri). Tanıtım sırasında büyür.
static CUR_W: AtomicU64 = AtomicU64::new(WIN_W.to_bits());

/// Pencerenin geçerli mantıksal genişliği — yalnızca ana ada büyüyebilir.
pub fn width_of(label: &str) -> f64 {
    if label == ISLAND {
        f64::from_bits(CUR_W.load(Ordering::Relaxed))
    } else {
        WIN_W
    }
}
/// Ekranlar arası geçişte "çıkış" animasyonunun süresi (frontend ile aynı).
const RELOCATE_OUT: Duration = Duration::from_millis(240);

/// Pencereyi verilen monitörün üst-orta noktasına yapıştırır.
pub fn place_on(win: &WebviewWindow, monitor: &Monitor) -> tauri::Result<()> {
    let width = (width_of(win.label()) * monitor.scale_factor()).round() as i32;
    let origin = monitor.position();
    let x = origin.x + (monitor.size().width as i32 - width) / 2;
    win.set_position(PhysicalPosition::new(x, origin.y))
}

pub fn primary_monitor(app: &AppHandle) -> Option<Monitor> {
    app.primary_monitor().ok().flatten().or_else(|| app.available_monitors().ok()?.into_iter().next())
}

pub fn monitor_name(m: &Monitor) -> String {
    m.name().cloned().unwrap_or_default()
}

pub fn same_monitor(a: &Monitor, b: &Monitor) -> bool {
    a.position() == b.position() && a.size() == b.size()
}

/// Fiziksel ekran koordinatını içeren monitör.
pub fn monitor_at(monitors: &[Monitor], x: f64, y: f64) -> Option<Monitor> {
    monitors
        .iter()
        .find(|m| {
            let (p, s) = (m.position(), m.size());
            x >= p.x as f64 && x < (p.x + s.width as i32) as f64 && y >= p.y as f64 && y < (p.y + s.height as i32) as f64
        })
        .cloned()
}

/// Pencerenin şu an bulunduğu monitör (pencerenin üst-orta noktasına göre).
pub fn monitor_of(shared: &Shared, label: &str, monitors: &[Monitor]) -> Option<Monitor> {
    let ws = *shared.windows.lock().unwrap().get(label)?;
    let cx = ws.geom.x + width_of(label) * ws.geom.scale / 2.0;
    monitor_at(monitors, cx, ws.geom.y + 1.0)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    name: String,
    width: u32,
    height: u32,
    primary: bool,
}

pub fn list_monitors(app: &AppHandle) -> Vec<MonitorInfo> {
    let primary = primary_monitor(app);
    app.available_monitors()
        .unwrap_or_default()
        .iter()
        .map(|m| MonitorInfo {
            name: monitor_name(m),
            width: m.size().width,
            height: m.size().height,
            primary: primary.as_ref().is_some_and(|p| same_monitor(p, m)),
        })
        .collect()
}

/// Ayarlardaki monitör moduna göre pencereleri oluşturur/kapatır/yerleştirir.
/// Pencere oluşturma Windows'ta ana thread ister.
pub fn apply_monitor_mode(app: &AppHandle, settings: &Settings) {
    let app2 = app.clone();
    let settings = settings.clone();
    let _ = app.run_on_main_thread(move || {
        let app = app2;
        let monitors = app.available_monitors().unwrap_or_default();
        let Some(primary) = primary_monitor(&app) else { return };
        let shared = app.state::<Arc<Shared>>().inner().clone();

        let target = match settings.monitor_mode {
            MonitorMode::Fixed => settings
                .monitor_name
                .as_ref()
                .and_then(|n| monitors.iter().find(|m| &monitor_name(m) == n).cloned())
                .unwrap_or_else(|| primary.clone()),
            MonitorMode::Follow => crate::tracker::cursor_position(&app)
                .and_then(|(x, y)| monitor_at(&monitors, x, y))
                .unwrap_or_else(|| primary.clone()),
            _ => primary.clone(),
        };
        if let Some(island) = app.get_webview_window(ISLAND) {
            let _ = place_on(&island, &target);
        }

        // Ek ekranlar yalnızca "Tüm ekranlar" modunda.
        let others: Vec<&Monitor> = if settings.monitor_mode == MonitorMode::All {
            monitors.iter().filter(|m| !same_monitor(m, &primary)).collect()
        } else {
            Vec::new()
        };
        for (i, monitor) in others.iter().enumerate() {
            let label = format!("{EXTRA_PREFIX}{}", i + 1);
            let win = match app.get_webview_window(&label) {
                Some(w) => w,
                None => match create_island(&app, &label) {
                    Ok(w) => w,
                    Err(_) => continue,
                },
            };
            let _ = place_on(&win, monitor);
            shared.register(&win);
            let _ = win.show();
        }
        for (label, win) in app.webview_windows() {
            if let Some(n) = label.strip_prefix(EXTRA_PREFIX).and_then(|n| n.parse::<usize>().ok()) {
                if n > others.len() {
                    shared.unregister(&label);
                    let _ = win.destroy();
                }
            }
        }
    });
}

/// Ana adanın penceresini büyütür/küçültür (tanıtım ekranı için) ve aynı ekranın üst ortasına yeniden yapıştırır.
/// Ekrandan büyük istenirse ekrana sığdırılır.
pub fn resize_island(win: &WebviewWindow, width: f64, height: f64) -> tauri::Result<()> {
    let monitor = win.current_monitor()?.or_else(|| primary_monitor(win.app_handle()));
    let (w, h) = match &monitor {
        Some(m) => {
            let s = m.scale_factor();
            (width.min(m.size().width as f64 / s), height.min(m.size().height as f64 / s))
        }
        None => (width, height),
    };
    CUR_W.store(w.to_bits(), Ordering::Relaxed);
    win.set_size(tauri::LogicalSize::new(w, h))?;
    if let Some(m) = monitor {
        place_on(win, &m)?;
    }
    Ok(())
}

fn create_island(app: &AppHandle, label: &str) -> tauri::Result<WebviewWindow> {
    let win = WebviewWindowBuilder::new(app, label, WebviewUrl::App("index.html".into()))
        .title("Nook")
        .inner_size(WIN_W, WIN_H)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .focused(false)
        // Görünür oluşturulmalı: gizli oluşturulunca WebView2 içerik penceresini sonradan açıyor
        // ve wry'nin dosya bırakma dinleyicisi ona kurulamıyor (sürükle-bırak çalışmıyor).
        .visible(true)
        .build()?;
    win.set_ignore_cursor_events(true)?;
    Ok(win)
}

/// "İmleci takip et": ada küçülüp yukarı kaçar, pencere yeni ekrana geçer, ada orada belirir.
pub fn relocate(app: &AppHandle, shared: Arc<Shared>, label: String, monitor: Monitor) {
    if shared.relocating.swap(true, Ordering::AcqRel) {
        return;
    }
    let app = app.clone();
    thread::spawn(move || {
        let _ = app.emit_to(label.as_str(), "nook://relocate", "out");
        thread::sleep(RELOCATE_OUT);
        if let Some(win) = app.get_webview_window(&label) {
            let _ = place_on(&win, &monitor);
            // Farklı DPI'lı ekrana geçişte Windows pencereyi yeniden ölçekler; konumu bir kez daha düzelt.
            thread::sleep(Duration::from_millis(60));
            let _ = place_on(&win, &monitor);
        }
        let _ = app.emit_to(label.as_str(), "nook://relocate", "in");
        shared.relocating.store(false, Ordering::Release);
    });
}

/// Görev çubuğunda görünmediğimiz için tek çıkış yolu tepsi menüsü.
pub fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let quit = MenuItem::with_id(app, "quit", "Nook'tan çık", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&quit])?;

    let mut tray = TrayIconBuilder::with_id("nook-tray")
        .tooltip("Nook")
        .menu(&menu)
        .on_menu_event(|app, event| {
            if event.id() == "quit" {
                app.exit(0);
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}
