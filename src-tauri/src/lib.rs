mod alarm;
mod argus;
mod audio;
mod brightness;
mod clipboard;
mod commands;
mod downloads;
mod focus;
mod fullscreen;
mod imaging;
mod log;
mod lukonnect;
mod media;
mod net;
mod notify;
mod privacy;
mod quick;
mod shell;
mod shortcut;
mod state;
mod system;
mod tracker;
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
        .invoke_handler(tauri::generate_handler![
            commands::set_hit_rect,
            commands::set_interactive,
            commands::release_focus,
            commands::apply_settings,
            commands::list_monitors,
            commands::set_window_size,
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
            alarm::alarm_ring,
            alarm::alarm_next,
            imaging::file_icon,
            imaging::capture_screen,
            voice::voice_start,
            voice::voice_stop,
            net::online_state,
            log::log_line,
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

            let shared = app.state::<Arc<Shared>>().inner().clone();
            shared.register(&island);

            window::build_tray(app.handle())?;
            let handle = app.handle().clone();
            tracker::spawn(handle.clone(), shared.clone());
            clipboard::spawn(handle.clone());
            media::spawn(handle.clone());
            system::spawn(handle.clone(), shared.clone());
            fullscreen::spawn(handle.clone(), shared);
            privacy::spawn(handle.clone());
            downloads::spawn(handle.clone());
            audio::spawn(handle.clone());
            lukonnect::spawn(handle.clone());
            notify::spawn(handle.clone());
            net::spawn(handle.clone());
            brightness::spawn(handle);

            island.show()?;
            Ok(())
        })
        .on_window_event(|win, event| {
            let shared = win.state::<Arc<Shared>>();
            match event {
                // Tracker, imleci pencere-yerel koordinata çevirmek için konum/ölçeği önbellekte tutar.
                WindowEvent::Moved(_) | WindowEvent::ScaleFactorChanged { .. } => {
                    if let (Ok(pos), Ok(scale)) = (win.outer_position(), win.scale_factor()) {
                        shared.set_geometry(win.label(), pos, scale);
                    }
                }
                WindowEvent::Destroyed => shared.unregister(win.label()),
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("Nook başlatılamadı");
}
