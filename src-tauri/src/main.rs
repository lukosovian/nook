// Release'te konsol penceresi açılmasın.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Claude Code köprüsü: Tauri'yi hiç başlatmadan olayı çalışan Nook'a iletip çık
    if let Some(mode) = std::env::args().nth(1).filter(|a| a == "claude-hook" || a == "claude-status") {
        nook_lib::claude_hook::run(&mode);
    }
    nook_lib::run()
}
