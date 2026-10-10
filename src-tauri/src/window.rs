//! Ada pencerelerinin yerleşimi ve çoklu monitör modları.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Monitor, PhysicalPosition, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

use crate::state::{MonitorMode, Settings, Shared, TrayLabels};

pub const ISLAND: &str = "island";
/// Ek ekranlardaki adaların etiket öneki ("island-1", "island-2"…)
const EXTRA_PREFIX: &str = "island-";
/// Varsayılan pencere boyutu (mantıksal px); ada bu şeffaf tuvalin içinde animasyonla büyür.
pub const WIN_W: f64 = 680.0;
pub const WIN_H: f64 = 350.0;
/// Ana pencerenin şu anki genişliği ve yüksekliği, sayfanın gördüğü (CSS) px olarak (f64 bitleri). Tanıtımda büyür.
static CUR_W: AtomicU64 = AtomicU64::new(WIN_W.to_bits());
static CUR_H: AtomicU64 = AtomicU64::new(WIN_H.to_bits());
/// Arayüz ölçeği (Ayarlar › Erişilebilirlik): sayfa bu kadar büyütülür, pencere de onunla birlikte
static ZOOM: AtomicU64 = AtomicU64::new(1f64.to_bits());

pub fn zoom() -> f64 {
    f64::from_bits(ZOOM.load(Ordering::Relaxed))
}

/// Pencerenin sayfa içi (CSS) genişliği — yalnızca ana ada büyüyebilir.
pub fn css_width_of(label: &str) -> f64 {
    if label == ISLAND {
        f64::from_bits(CUR_W.load(Ordering::Relaxed))
    } else {
        WIN_W
    }
}

/// Pencerenin geçerli mantıksal genişliği (CSS genişliği × arayüz ölçeği)
pub fn width_of(label: &str) -> f64 {
    css_width_of(label) * zoom()
}

/// Arayüz ölçeği değişti: bütün adalar yeni ölçekle çizilir, pencereleri de büyür/küçülür
pub fn set_zoom(app: &AppHandle, z: f64) {
    let z = z.clamp(0.8, 1.5);
    if (z - zoom()).abs() < 0.001 {
        return;
    }
    ZOOM.store(z.to_bits(), Ordering::Relaxed);
    let app2 = app.clone();
    let _ = app.run_on_main_thread(move || {
        for (label, win) in app2.webview_windows() {
            if label == ISLAND {
                let _ = win.set_zoom(z);
                let (w, h) = (f64::from_bits(CUR_W.load(Ordering::Relaxed)), f64::from_bits(CUR_H.load(Ordering::Relaxed)));
                let _ = resize_island(&win, w, h);
            } else if label.starts_with(EXTRA_PREFIX) {
                let _ = win.set_zoom(z);
                let _ = win.set_size(tauri::LogicalSize::new(WIN_W * z, WIN_H * z));
                if let Some(m) = win.current_monitor().ok().flatten() {
                    let _ = place_on(&win, &m);
                }
            } else if label == crate::buddy::PERCH {
                // Tünekteki Nook adaya döner; bir dahaki tünekte yeni ölçekle açılır
                crate::buddy::leave(&app2);
            } else if label == crate::argus::CARD {
                // Yeniden oluşturulunca yeni ölçekle açılır
                let _ = win.close();
            }
        }
    });
}

/// Pencere yeni oluştu: arayüz ölçeğini uygula
pub fn apply_zoom(win: &WebviewWindow) {
    let z = zoom();
    if (z - 1.0).abs() > 0.001 {
        let _ = win.set_zoom(z);
    }
}
/// Ekranlar arası geçişte "çıkış" animasyonunun süresi (frontend ile aynı).
/// Ada kaybolma animasyonu (ekran geçiş efektleri) bitene kadar pencere yerinde bekler.
const RELOCATE_OUT: Duration = Duration::from_millis(470);

/// Pencereyi verilen monitöre yerleştirir: kullanıcının sürükleyip bıraktığı yere (oranla), yoksa üst ortaya.
/// Pencere ekrandan taşmaz — alttayken açılan ada aşağı sarkmasın diye yukarı itilir.
pub fn place_on(win: &WebviewWindow, monitor: &Monitor) -> tauri::Result<()> {
    let scale = monitor.scale_factor();
    let width = (width_of(win.label()) * scale).round() as i32;
    let height = win.outer_size().map(|s| s.height as i32).unwrap_or((WIN_H * zoom() * scale).round() as i32);
    let origin = monitor.position();
    let (mw, mh) = (monitor.size().width as i32, monitor.size().height as i32);
    let pos = win.app_handle().state::<Arc<Shared>>().settings().island_pos;
    let (x, y) = match pos {
        Some(p) => {
            let cx = origin.x + (p.fx * mw as f64).round() as i32;
            let x = (cx - width / 2).clamp(origin.x, (origin.x + mw - width).max(origin.x));
            let y = origin.y + ((p.fy * mh as f64).round() as i32).clamp(0, (mh - height).max(0));
            (x, y)
        }
        None => (origin.x + (mw - width) / 2, origin.y),
    };
    win.set_position(PhysicalPosition::new(x, y))?;
    // Ekran değişince (ölçek, HDR) WebView2 beyaz zemine dönebiliyor
    clear_background(win);
    Ok(())
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
/// `width`, `height` sayfanın istediği (CSS) boyut; pencere arayüz ölçeğiyle çarpılır.
pub fn resize_island(win: &WebviewWindow, width: f64, height: f64) -> tauri::Result<()> {
    let monitor = win.current_monitor()?.or_else(|| primary_monitor(win.app_handle()));
    let z = zoom();
    let (w, h) = match &monitor {
        Some(m) => {
            let s = m.scale_factor();
            ((width * z).min(m.size().width as f64 / s), (height * z).min(m.size().height as f64 / s))
        }
        None => (width * z, height * z),
    };
    CUR_W.store((w / z).to_bits(), Ordering::Relaxed);
    CUR_H.store((h / z).to_bits(), Ordering::Relaxed);
    win.set_size(tauri::LogicalSize::new(w, h))?;
    if let Some(m) = monitor {
        place_on(win, &m)?;
    }
    Ok(())
}

fn create_island(app: &AppHandle, label: &str) -> tauri::Result<WebviewWindow> {
    let win = WebviewWindowBuilder::new(app, label, WebviewUrl::App("index.html".into()))
        .title("Nook")
        .inner_size(WIN_W * zoom(), WIN_H * zoom())
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
    apply_zoom(&win);
    win.set_ignore_cursor_events(true)?;
    clear_background(&win);
    Ok(win)
}

/// "İmleci takip et": ada küçülüp yukarı kaçar, pencere yeni ekrana geçer, ada orada belirir.
pub fn relocate(app: &AppHandle, shared: Arc<Shared>, label: String, monitor: Monitor) {
    if shared.relocating.swap(true, Ordering::AcqRel) {
        return;
    }
    let app = app.clone();
    // Geçiş yönü (1 = sağdaki ekrana, -1 = soldakine) — efektler o yöne gider
    let dir = app
        .get_webview_window(&label)
        .and_then(|w| w.outer_position().ok())
        .map(|p| if monitor.position().x >= p.x { 1 } else { -1 })
        .unwrap_or(1);
    thread::spawn(move || {
        let _ = app.emit_to(label.as_str(), "nook://relocate", format!("out:{dir}"));
        thread::sleep(RELOCATE_OUT);
        if let Some(win) = app.get_webview_window(&label) {
            let _ = place_on(&win, &monitor);
            // Farklı DPI'lı ekrana geçişte Windows pencereyi yeniden ölçekler; konumu bir kez daha düzelt.
            thread::sleep(Duration::from_millis(60));
            let _ = place_on(&win, &monitor);
        }
        let _ = app.emit_to(label.as_str(), "nook://relocate", format!("in:{dir}"));
        shared.relocating.store(false, Ordering::Release);
    });
}

/// Tepsi menüsünün öğeleri: (kimlik, Türkçe yazı). Yazılar ayarlarla seçili dile çevrilir.
const TRAY_ITEMS: [(&str, &str); 6] = [
    ("open", "Adayı aç"),
    ("center", "Adayı ortala"),
    ("tour", "Nook nedir?"),
    ("quiet", "1 saat sessiz"),
    ("update", "Güncellemeleri denetle"),
    ("quit", "Nook'tan çık"),
];

static TRAY_MENU: std::sync::OnceLock<Vec<MenuItem<tauri::Wry>>> = std::sync::OnceLock::new();

/// Tepsi menüsünün yazıları seçili dilde ("1 saat sessiz" ↔ "Sessizliği bitir" de buradan)
pub fn set_tray_labels(labels: &TrayLabels) {
    let Some(items) = TRAY_MENU.get() else { return };
    let texts = [&labels.open, &labels.center, &labels.tour, &labels.quiet, &labels.update, &labels.quit];
    for (item, text) in items.iter().zip(texts) {
        if !text.is_empty() {
            let _ = item.set_text(text);
        }
    }
}

/// Görev çubuğunda görünmediğimiz için tepsi simgesi: sol tık adayı açar, sağ tıkta kısa menü
/// (adayı aç/ortala, tanıtım, bir saat sessizlik, güncelleme, çıkış). Ada ekranda kaybolduysa ya da
/// tam ekranda gizli kaldıysa da buradan ulaşılır.
pub fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let mut items = Vec::new();
    for (id, text) in TRAY_ITEMS {
        items.push(MenuItem::with_id(app, id, text, true, None::<&str>)?);
    }
    let refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> = items.iter().map(|i| i as &dyn tauri::menu::IsMenuItem<tauri::Wry>).collect();
    let menu = Menu::with_items(app, &refs)?;
    let _ = TRAY_MENU.set(items);

    let mut tray = TrayIconBuilder::with_id("nook-tray")
        .tooltip("Nook")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                open_from_tray(tray.app_handle());
            }
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            "quit" => app.exit(0),
            "open" => open_from_tray(app),
            // Diğerleri arayüzde yapılır (ana ada)
            id => {
                let _ = app.emit_to(ISLAND, "nook://tray", id.to_string());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

/// Adayı tıklanabilir yap ve arayüze genişlemesini söyle — yalnızca tıklanabilir yapmak adayı
/// açmıyordu (genişleme imleçle olur; imleç tepside, adanın üstünde değil).
fn open_from_tray(app: &AppHandle) {
    if let Some(label) = crate::shortcut::open_island(app) {
        let _ = app.emit_to(label.as_str(), "nook://tray", "open");
    }
}

/// WebView2'nin varsayılan arka planını şeffaf yap. Şeffaf pencerede bile bazen (gizle-göster,
/// uyku dönüşü, ekran değişimi) WebView2 kendi beyaz zeminine dönüp adanın arkasını beyaz boyuyordu.
pub fn clear_background(win: &WebviewWindow) {
    #[cfg(windows)]
    let _ = win.with_webview(|pv| unsafe {
        use webview2_com::Microsoft::Web::WebView2::Win32::{ICoreWebView2Controller2, COREWEBVIEW2_COLOR};
        use windows_core::Interface;
        if let Ok(c2) = pv.controller().cast::<ICoreWebView2Controller2>() {
            let _ = c2.SetDefaultBackgroundColor(COREWEBVIEW2_COLOR { A: 0, R: 0, G: 0, B: 0 });
        }
    });
    #[cfg(not(windows))]
    let _ = win;
}

/// Bütün ada pencerelerinin zeminini yeniden şeffaflaştır. Başka bir WebView penceresi (tünek)
/// açılıp kapanınca ya da ekran uykudan dönünce WebView2 adanın arkasını beyaza boyayabiliyordu.
pub fn clear_islands(app: &AppHandle) {
    for (label, win) in app.webview_windows() {
        if label.starts_with(ISLAND) {
            clear_background(&win);
        }
    }
}

/// Ada üst kenara bu kadar (mantıksal px) yakın bırakılırsa üste yapışır
const SNAP_TOP: f64 = 28.0;

#[derive(Serialize, Clone)]
pub struct DroppedPos {
    pub fx: f64,
    pub fy: f64,
}

/// Sürükleme bitti: pencerenin yeni yerini, bulunduğu ekrana oranla frontend'e bildir (ayar olarak saklanır).
pub fn finish_drag(app: &AppHandle, label: &str) {
    let Some(win) = app.get_webview_window(label) else { return };
    let (Ok(pos), Ok(size)) = (win.outer_position(), win.outer_size()) else { return };
    let cx = pos.x as f64 + size.width as f64 / 2.0;
    let monitors = app.available_monitors().unwrap_or_default();
    let Some(m) = monitor_at(&monitors, cx, pos.y as f64 + 1.0).or_else(|| primary_monitor(app)) else { return };
    let (o, ms, scale) = (m.position(), m.size(), m.scale_factor());
    let top = (pos.y - o.y).max(0) as f64;
    let fx = ((cx - o.x as f64) / ms.width as f64).clamp(0.0, 1.0);
    let fy = if top < SNAP_TOP * scale { 0.0 } else { (top / ms.height as f64).clamp(0.0, 1.0) };
    // Ortaya çok yakın ve üste yapışıksa: tam orta (eski yerine) dönsün
    let centered = fy == 0.0 && (fx - 0.5).abs() * ms.width as f64 / scale < 24.0;
    if centered {
        let _ = app.emit("nook://island-pos", Option::<DroppedPos>::None);
    } else {
        let _ = app.emit("nook://island-pos", Some(DroppedPos { fx, fy }));
    }
}
