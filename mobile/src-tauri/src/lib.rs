//! Nook Mobil: arayüzün tamamı web tarafında (React). PC'deki Nook'la konuşma da oradan,
//! imzalı HTTP istekleriyle yapılır; Rust tarafı eklentileri (QR okuyucu) bağlar ve web'in
//! yapamadığı tek işi yapar: PC'yi açmak için ağa Wake-on-LAN paketi göndermek.

use std::net::{Ipv4Addr, UdpSocket};

/// PC'yi uyandırır: "sihirli paket" (6×FF + 16×MAC) ev ağına yayılır. PC'nin ağ kartı paketi görünce
/// bilgisayarı açar (kablolu bağlantı, BIOS'ta ve ağ kartında Wake-on-LAN açık olmalı).
/// `hosts`: PC'nin bilinen yerel adresleri; her birinin /24 yayın adresine de gönderilir.
/// `wan`: evin internet adresi; modemdeki yönlendirmelerle (UDP 9, 40009, 40010) evden uzaktayken de açar.
#[tauri::command]
fn wake_pc(mac: String, hosts: Vec<String>, wan: Option<String>) -> Result<u32, String> {
    let bytes: Vec<u8> = mac
        .split(|c| c == ':' || c == '-')
        .map(|h| u8::from_str_radix(h, 16))
        .collect::<Result<_, _>>()
        .map_err(|_| "MAC adresi bozuk")?;
    if bytes.len() != 6 {
        return Err("MAC adresi bozuk".into());
    }
    let mut magic = vec![0xFFu8; 6];
    for _ in 0..16 {
        magic.extend_from_slice(&bytes);
    }
    // Sonuna "NOOK" + yol işareti: kart yalnızca baştaki 102 bayta bakar; PC'deki "sına" testi bu işaretten
    // paketin hangi yoldan geldiğini anlar (1: ev ağı, diğerleri: evin internet adresindeki dış port)
    let packet = |mark: u16| {
        let mut p = magic.clone();
        p.extend_from_slice(b"NOOK");
        p.extend_from_slice(&mark.to_be_bytes());
        p
    };
    let sock = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    sock.set_broadcast(true).map_err(|e| e.to_string())?;
    // (adres, port, işaret)
    let mut targets: Vec<(Ipv4Addr, u16, u16)> = Vec::new();
    let mut lan = vec![Ipv4Addr::BROADCAST];
    for h in &hosts {
        if let Ok(ip) = h.parse::<Ipv4Addr>() {
            // Tailscale adresine yayın anlamsız; yalnızca yerel ağlar
            if ip.is_private() {
                let o = ip.octets();
                lan.push(Ipv4Addr::new(o[0], o[1], o[2], 255));
            }
        }
    }
    for ip in lan {
        for port in [9u16, 7] {
            targets.push((ip, port, 1));
        }
    }
    // Evin internet adresi: modemde PC'deki Nook'un kurduğu yollar (src-tauri/src/outside.rs ROUTES)
    if let Some(ip) = wan.as_deref().and_then(|w| w.parse::<Ipv4Addr>().ok()) {
        for port in [9u16, 40009, 40010, 7] {
            targets.push((ip, port, port));
        }
    }
    let mut sent = 0;
    // UDP kaybolabilir: birkaç kez
    for _ in 0..3 {
        for (ip, port, mark) in &targets {
            if sock.send_to(&packet(*mark), (*ip, *port)).is_ok() {
                sent += 1;
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(120));
    }
    if sent == 0 {
        return Err("Paket gönderilemedi: telefon Wi-Fi'de mi?".into());
    }
    Ok(sent)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![wake_pc]);
    #[cfg(mobile)]
    let builder = builder.plugin(tauri_plugin_barcode_scanner::init());
    builder.run(tauri::generate_context!()).expect("Nook Mobil başlatılamadı");
}
