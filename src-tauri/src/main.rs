// Release'te konsol penceresi açılmasın.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Claude Code köprüsü: Tauri'yi hiç başlatmadan olayı çalışan Nook'a iletip çık
    if let Some(mode) = std::env::args().nth(1).filter(|a| a == "claude-hook" || a == "claude-status") {
        nook_lib::claude_hook::run(&mode);
    }
    // Kaldırıcı çağırır (src-tauri/nsis-hooks.nsh): Claude Code'daki Nook hook'larını sil ve çık
    if std::env::args().nth(1).is_some_and(|a| a == "claude-uninstall") {
        nook_lib::claude_hook::uninstall();
    }
    // Ayarlar › Telefon › "Düzelt": Nook kendini yönetici olarak bu argümanla açar (wol.rs)
    #[cfg(windows)]
    if std::env::args().nth(1).is_some_and(|a| a == "wol-fix") {
        let args: Vec<String> = std::env::args().collect();
        std::process::exit(nook_lib::wol::fix_elevated(args.get(2).map_or("", |s| s), args.get(3).map_or("", |s| s)));
    }
    #[cfg(windows)]
    if std::env::args().nth(1).is_some_and(|a| a == "fw-fix") {
        std::process::exit(nook_lib::outside::fix_elevated());
    }
    nook_lib::run()
}
