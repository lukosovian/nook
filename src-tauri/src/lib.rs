mod alarm;
mod archive;
mod argus;
mod audio;
mod brightness;
mod buddy;
mod claude;
pub mod claude_hook;
mod clipboard;
mod commands;
mod disks;
mod downloads;
mod focus;
mod fullscreen;
mod hum;
mod imaging;
mod log;
mod lukonnect;
mod media;
mod mixer;
mod net;
mod notify;
mod privacy;
mod quick;
mod share;
mod shell;
mod shield;
mod shortcut;
mod state;
mod system;
mod tracker;
mod verify;
mod voice;
mod window;

use std::sync::Arc;

use state::Shared;
use tauri::{Manager, WindowEvent};

pub fn run() {
    tauri::Builder::default()
        // İkinci kez açılırsa (örn. başlangıçta + elle) yeni bir kopya başlatma.
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_drag::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Arc::new(Shared::default()))
        // Sağ tık › Yenile: sayfa baştan yüklenir ama Rust'taki durum eskisi gibi kalıyordu (zorla tıklanabilir,
        // açık adanın tıklama alanı, büyütülmüş pencere). Pencere tıklamaları ve odağı tutup donmuş gibi
        // görünüyordu. Yükleme başlarken o adanın durumunu sıfırla; yeni sayfa kendi durumunu bildirir.
        .on_page_load(|webview, payload| {
            if payload.event() != tauri::webview::PageLoadEvent::Started {
                return;
            }
            let label = webview.label();
            if !label.starts_with(window::ISLAND) {
                return;
            }
            let app = webview.app_handle();
            let shared = app.state::<Arc<Shared>>().inner().clone();
            let was_forced = shared.forced.lock().unwrap().remove(label);
            shared.set_hit(label, state::Rect::default(), None);
            if let Some(win) = app.get_webview_window(label) {
                let _ = win.set_ignore_cursor_events(true);
                if label == window::ISLAND && window::css_width_of(label) != window::WIN_W {
                    let _ = window::resize_island(&win, window::WIN_W, window::WIN_H);
                }
                window::clear_background(&win);
                window::apply_zoom(&win);
            }
            if was_forced {
                focus::release(&shared);
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::set_hit_rect,
            notify::notify_status,
            verify::verify_windows_user,
            commands::set_interactive,
            commands::release_focus,
            commands::set_gate,
            commands::apply_settings,
            commands::list_monitors,
            commands::set_window_size,
            commands::island_drag,
            clipboard::clipboard_clear_if,
            clipboard::clipboard_clear,
            clipboard::clipboard_write_image,
            clipboard::clipboard_write_files,
            clipboard::clipboard_prune,
            shell::open_with,
            shell::save_text,
            shell::fetch_text,
            disks::system_disks,
            disks::disk_health,
            disks::disk_eject,
            disks::local_ip,
            disks::speed_test,
            quick::quick_input,
            mixer::mixer_output,
            shield::shield_off,
            shield::shield_on,
            shield::shield_state,
            shield::shield_set,
            shield::system_uptime,
            argus::side_card,
            buddy::perch_start,
            buddy::perch_stop,
            buddy::guard_alert,
            archive::archive_list,
            archive::archive_extract,
            argus::argus_snapshot,
            argus::argus_mark,
            argus::argus_card,
            argus::argus_open,
            argus::argus_install,
            argus::argus_check_dir,
            commands::inspect_paths,
            commands::drag_icon_path,
            shell::open_path,
            shell::reveal_path,
            shell::list_apps,
            media::media_control,
            media::media_resync,
            quick::quick_state,
            quick::quick_set,
            quick::quick_action,
            quick::quick_volume,
            quick::quick_output,
            mixer::mixer_list,
            mixer::mixer_set,
            brightness::brightness_get,
            brightness::brightness_set,
            alarm::alarm_ring,
            alarm::alarm_next,
            imaging::file_icon,
            imaging::capture_screen,
            voice::voice_start,
            voice::voice_stop,
            hum::hum_listen,
            hum::hum_cancel,
            net::online_state,
            log::log_line,
            claude::claude_decide,
            claude::claude_setup,
            claude::claude_connect,
            claude::claude_disconnect,
        ])
        .setup(|app| {
            let island = app
                .get_webview_window(window::ISLAND)
                .expect("island penceresi tauri.conf.json'da tanımlı olmalı");

            if let Some(monitor) = window::primary_monitor(app.handle()) {
                window::place_on(&island, &monitor)?;
            }
            // Başlangıçta tamamen tıklama-geçirgen; tracker imleç adaya girince kapatır.
            island.set_ignore_cursor_events(true)?;
            window::clear_background(&island);
            window::apply_zoom(&island);

            let shared = app.state::<Arc<Shared>>().inner().clone();
            shared.register(&island);

            window::build_tray(app.handle())?;
            let handle = app.handle().clone();
            tracker::spawn(handle.clone(), shared.clone());
            clipboard::spawn(handle.clone());
            media::spawn(handle.clone());
            system::spawn(handle.clone(), shared.clone());
            fullscreen::spawn(handle.clone(), shared.clone());
            hum::spawn(handle.clone(), shared.clone());
            buddy::spawn(handle.clone(), shared);
            privacy::spawn(handle.clone());
            downloads::spawn(handle.clone());
            audio::spawn(handle.clone());
            lukonnect::spawn(handle.clone());
            claude::spawn(handle.clone());
            notify::spawn(handle.clone());
            net::spawn(handle.clone());
            share::spawn(handle.clone());
            brightness::spawn(handle);

            island.show()?;
            Ok(())
        })
        .on_window_event(|win, event| {
            shield::on_window_event(win, event);
            let shared = win.state::<Arc<Shared>>();
            match event {
                // Tracker, imleci pencere-yerel koordinata çevirmek için konum/ölçeği önbellekte tutar.
                WindowEvent::Moved(_) | WindowEvent::ScaleFactorChanged { .. } => {
                    if let (Ok(pos), Ok(scale)) = (win.outer_position(), win.scale_factor()) {
                        shared.set_geometry(win.label(), pos, scale);
                    }
                    // Ana ada taşınınca yanındaki ses kartı da gelsin
                    if win.label() == window::ISLAND {
                        if let Some(w) = win.app_handle().get_webview_window(window::ISLAND) {
                            argus::follow_sound(&w);
                        }
                    }
                }
                WindowEvent::Destroyed => shared.unregister(win.label()),
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("Nook başlatılamadı");
}
