//! Dışarıdan bağlanma: Ayarlar › Telefon'daki kontrol listesi. Telefon evden uzaktayken PC'ye Tailscale
//! üzerinden ulaşır; bunun için PC'de Tailscale kurulu ve oturum açık olmalı, güvenlik duvarı da köprünün
//! portuna Tailscale ağından (Windows'ta çoğunlukla "Özel" ağ) gelen bağlantıya izin vermeli.
//!
//! Dışarıdan açma (Wake-on-LAN): PC kapalıyken Tailscale de kapalıdır; telefon uyandırma paketini evin
//! internet adresine gönderir, modem (port yönlendirme + IP/MAC bağlama ile) PC'ye iletir. Evin adresini
//! Tailscale bilir (`tailscale status --json` › Self.Addrs); PC açıkken telefona durumla birlikte gider.

use serde::Serialize;

/// Güvenlik duvarı kuralının adı (yoksa Düzelt ekler)
#[cfg(windows)]
const RULE: &str = "Nook Mobil";

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct OutsideStatus {
    tailscale_installed: bool,
    /// Tailscale'e giriş yapılmış ve bağlı (100.x adresi var)
    tailscale_up: bool,
    firewall: bool,
    /// Modem yönlendirmesi için: PC'nin ev ağındaki adresi ve ağ kartı
    lan_ip: Option<String>,
    mac: Option<String>,
    /// Evin internet adresi (Tailscale'den)
    wan: Option<String>,
    /// Telefona Tailscale kurmak için Play Store bağlantısının QR kodu (SVG)
    phone_qr: Option<String>,
}

#[cfg(windows)]
fn tailscale_dir() -> std::path::PathBuf {
    let pf = std::env::var_os("ProgramFiles").unwrap_or_else(|| "C:\\Program Files".into());
    std::path::PathBuf::from(pf).join("Tailscale")
}

/// Evin internet adresi: Tailscale'in bildiği dış uç (10 dk önbellek). Tailscale yoksa None.
pub fn wan_ip() -> Option<String> {
    #[cfg(windows)]
    {
        use std::sync::Mutex;
        use std::time::{Duration, Instant};
        static CACHE: Mutex<Option<(Instant, Option<String>)>> = Mutex::new(None);
        if let Some((at, v)) = CACHE.lock().unwrap().as_ref() {
            if at.elapsed() < Duration::from_secs(600) {
                return v.clone();
            }
        }
        let v = query_wan();
        *CACHE.lock().unwrap() = Some((Instant::now(), v.clone()));
        v
    }
    #[cfg(not(windows))]
    None
}

#[cfg(windows)]
fn query_wan() -> Option<String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let exe = tailscale_dir().join("tailscale.exe");
    if !exe.exists() {
        return None;
    }
    let out = std::process::Command::new(exe).args(["status", "--json"]).creation_flags(CREATE_NO_WINDOW).output().ok()?;
    let v: serde_json::Value = serde_json::from_slice(&out.stdout).ok()?;
    v["Self"]["Addrs"].as_array()?.iter().filter_map(|a| a.as_str()).find_map(|a| {
        let ip: std::net::Ipv4Addr = a.rsplit_once(':')?.0.parse().ok()?;
        let o = ip.octets();
        // Ev ağı ve operatörün paylaşımlı adresleri (CGNAT) dışarıdan ulaşılamaz
        (!ip.is_private() && !ip.is_loopback() && !ip.is_link_local() && !(o[0] == 100 && (o[1] & 0xC0) == 64)).then(|| ip.to_string())
    })
}

#[cfg(windows)]
mod fw {
    use windows::core::BSTR;
    use windows::Win32::Foundation::VARIANT_TRUE;
    use windows::Win32::NetworkManagement::WindowsFirewall::*;
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED};

    fn policy() -> windows::core::Result<INetFwPolicy2> {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
            CoCreateInstance(&NetFwPolicy2, None, CLSCTX_INPROC_SERVER)
        }
    }

    /// Kural var mı (okumak için yönetici gerekmez)
    pub fn has_rule() -> bool {
        // COM bu iş parçacığında başka biçimde açılmış olabilir: ayrı iş parçacığında sor
        std::thread::spawn(|| unsafe { policy().and_then(|p| p.Rules()).and_then(|r| r.Item(&BSTR::from(super::RULE))).is_ok() }).join().unwrap_or(false)
    }

    /// Yönetici olarak açılmış Nook'ta: köprünün portuna yalnızca ev ağı ve Tailscale'den gelen bağlantıya izin
    pub fn add_rule() -> windows::core::Result<()> {
        unsafe {
            let rules = policy()?.Rules()?;
            let _ = rules.Remove(&BSTR::from(super::RULE));
            let rule: INetFwRule = CoCreateInstance(&NetFwRule, None, CLSCTX_INPROC_SERVER)?;
            rule.SetName(&BSTR::from(super::RULE))?;
            rule.SetDescription(&BSTR::from("Nook Mobil: telefonun bu PC'ye bağlanması (ev ağı ve Tailscale)"))?;
            if let Ok(exe) = std::env::current_exe() {
                rule.SetApplicationName(&BSTR::from(exe.to_string_lossy().as_ref()))?;
            }
            rule.SetProtocol(NET_FW_IP_PROTOCOL_TCP.0)?;
            rule.SetLocalPorts(&BSTR::from(crate::remote::PORT.to_string()))?;
            rule.SetRemoteAddresses(&BSTR::from("LocalSubnet,100.64.0.0/255.192.0.0"))?;
            rule.SetDirection(NET_FW_RULE_DIR_IN)?;
            rule.SetAction(NET_FW_ACTION_ALLOW)?;
            rule.SetProfiles(NET_FW_PROFILE2_ALL.0)?;
            rule.SetEnabled(VARIANT_TRUE)?;
            rules.Add(&rule)
        }
    }
}

/// main.rs `fw-fix` (yönetici)
#[cfg(windows)]
pub fn fix_elevated() -> i32 {
    match fw::add_rule() {
        Ok(()) => 0,
        Err(_) => 1,
    }
}

#[tauri::command]
pub fn outside_status() -> OutsideStatus {
    #[cfg(windows)]
    {
        let hosts = crate::remote::addresses();
        OutsideStatus {
            tailscale_installed: tailscale_dir().join("tailscale-ipn.exe").exists(),
            tailscale_up: hosts.iter().any(|h| h.starts_with("100.")),
            firewall: fw::has_rule(),
            lan_ip: crate::remote::lan_ip().map(|ip| ip.to_string()),
            mac: crate::remote::primary_mac(),
            wan: wan_ip(),
            phone_qr: crate::remote::qr_svg("https://play.google.com/store/apps/details?id=com.tailscale.ipn"),
        }
    }
    #[cfg(not(windows))]
    OutsideStatus::default()
}

/// Tailscale'in resmi kurucusunu indirip açar (kurulumu kullanıcı tamamlar)
#[tauri::command]
pub async fn outside_install_tailscale() -> Result<(), String> {
    #[cfg(windows)]
    {
        tauri::async_runtime::spawn_blocking(|| {
            let res = ureq::get("https://pkgs.tailscale.com/stable/tailscale-setup-latest.exe").call().map_err(|e| format!("İndirilemedi: {e}"))?;
            let path = std::env::temp_dir().join("tailscale-setup.exe");
            let mut f = std::fs::File::create(&path).map_err(|e| e.to_string())?;
            std::io::copy(&mut res.into_reader(), &mut f).map_err(|e| e.to_string())?;
            drop(f);
            crate::wol::shell_open(&path.to_string_lossy(), "", false).map(|_| ())
        })
        .await
        .map_err(|e| e.to_string())?
    }
    #[cfg(not(windows))]
    Err("Yalnızca Windows".into())
}

/// Tailscale'i açar (giriş yapılmadıysa giriş penceresini gösterir)
#[tauri::command]
pub fn outside_open_tailscale() -> Result<(), String> {
    #[cfg(windows)]
    return crate::wol::shell_open(&tailscale_dir().join("tailscale-ipn.exe").to_string_lossy(), "", false).map(|_| ());
    #[cfg(not(windows))]
    Err("Yalnızca Windows".into())
}

#[tauri::command]
pub async fn outside_fix_firewall() -> Result<OutsideStatus, String> {
    #[cfg(windows)]
    {
        tauri::async_runtime::spawn_blocking(|| crate::wol::run_elevated("fw-fix")).await.map_err(|e| e.to_string())??;
        Ok(outside_status())
    }
    #[cfg(not(windows))]
    Err("Yalnızca Windows".into())
}

// ---------------------------------------------------------------------------------------------
// Dışarıdan açma: modemde UPnP ile UDP 9 yönlendirmesi. Yayın adresine (x.x.x.255) yönlendirilir ki
// modem kapalı PC'yi unutmuş olsa da (ARP kaydı silinmiş) paket ağdaki herkese, PC'nin kartına da gitsin.
// Modem yayın adresini kabul etmezse PC'nin kendi adresine yönlendirilir. Kural modem yeniden
// başlayınca silinebildiği için PC açık kaldıkça yarım saatte bir tazelenir.

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WakeOutside {
    /// Ayar açık mı
    on: bool,
    /// Modemde UPnP bulundu mu (null: henüz denenmedi)
    upnp: Option<bool>,
    /// Yönlendirme hedefi (yayın adresi ya da PC)
    target: Option<String>,
    /// Modemin internet adresi
    external_ip: Option<String>,
    /// Operatör ortak adres veriyor: dışarıdan gelen paket modeme ulaşmaz
    cgnat: bool,
    error: Option<String>,
}

static WAKE: std::sync::Mutex<Option<WakeOutside>> = std::sync::Mutex::new(None);

fn wake_path() -> Option<std::path::PathBuf> {
    Some(std::path::PathBuf::from(std::env::var_os("LOCALAPPDATA")?).join("Nook").join("outside.json"))
}

fn wake_on() -> bool {
    wake_path()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| v["wake"].as_bool())
        .unwrap_or(false)
}

mod upnp {
    use std::net::{Ipv4Addr, UdpSocket};
    use std::time::{Duration, Instant};

    /// Yeni modemler (IGD v2) WANIPConnection:2 sunuyor; eskiler :1
    const WAN: [&str; 3] = ["urn:schemas-upnp-org:service:WANIPConnection:2", "urn:schemas-upnp-org:service:WANIPConnection:1", "urn:schemas-upnp-org:service:WANPPPConnection:1"];
    const SEARCH: [&str; 2] = ["urn:schemas-upnp-org:device:InternetGatewayDevice:1", "urn:schemas-upnp-org:device:InternetGatewayDevice:2"];

    pub struct Gateway {
        control: String,
        service: &'static str,
    }

    fn tag<'a>(s: &'a str, name: &str) -> Option<&'a str> {
        let open = format!("<{name}>");
        let i = s.find(&open)? + open.len();
        let j = s[i..].find("</")? + i;
        Some(s[i..j].trim())
    }

    /// SSDP ile modemi bulur, açıklamasından WAN bağlantı servisinin kontrol adresini alır
    pub fn discover(lan: Ipv4Addr) -> Option<Gateway> {
        let sock = UdpSocket::bind((lan, 0)).ok()?;
        sock.set_read_timeout(Some(Duration::from_millis(500))).ok()?;
        let end = Instant::now() + Duration::from_secs(3);
        let mut buf = [0u8; 2048];
        let mut sent: Option<Instant> = None;
        while Instant::now() < end {
            if sent.is_none_or(|t| t.elapsed() > Duration::from_secs(1)) {
                for st in SEARCH {
                    let msg = format!("M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: \"ssdp:discover\"\r\nMX: 2\r\nST: {st}\r\n\r\n");
                    let _ = sock.send_to(msg.as_bytes(), "239.255.255.250:1900");
                }
                sent = Some(Instant::now());
            }
            let Ok((n, _)) = sock.recv_from(&mut buf) else { continue };
            let text = String::from_utf8_lossy(&buf[..n]);
            let loc = text.lines().find_map(|l| {
                let (k, v) = l.split_once(':')?;
                k.trim().eq_ignore_ascii_case("location").then(|| v.trim().to_string())
            });
            if let Some(g) = loc.and_then(|l| describe(&l)) {
                return Some(g);
            }
        }
        None
    }

    fn describe(location: &str) -> Option<Gateway> {
        let agent = ureq::AgentBuilder::new().timeout(Duration::from_secs(4)).build();
        let xml = agent.get(location).call().ok()?.into_string().ok()?;
        // http://192.168.1.1:1900/... → kök
        let after = location.split_once("//")?.1;
        let root = format!("http://{}", after.split('/').next()?);
        for service in WAN {
            let Some(i) = xml.find(&format!("<serviceType>{service}</serviceType>")) else { continue };
            let block = &xml[i..];
            let block = &block[..block.find("</service>").unwrap_or(block.len())];
            if let Some(ctl) = tag(block, "controlURL") {
                let control = if ctl.starts_with("http") { ctl.to_string() } else { format!("{root}{}{ctl}", if ctl.starts_with('/') { "" } else { "/" }) };
                return Some(Gateway { control, service });
            }
        }
        None
    }

    impl Gateway {
        fn soap(&self, action: &str, args: &str) -> Result<String, String> {
            let body = format!(
                "<?xml version=\"1.0\"?><s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\" s:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><s:Body><u:{action} xmlns:u=\"{}\">{args}</u:{action}></s:Body></s:Envelope>",
                self.service
            );
            let agent = ureq::AgentBuilder::new().timeout(Duration::from_secs(5)).build();
            match agent
                .post(&self.control)
                .set("Content-Type", "text/xml; charset=\"utf-8\"")
                .set("SOAPAction", &format!("\"{}#{action}\"", self.service))
                .send_string(&body)
            {
                Ok(r) => r.into_string().map_err(|e| e.to_string()),
                Err(ureq::Error::Status(code, r)) => {
                    let t = r.into_string().unwrap_or_default();
                    Err(tag(&t, "errorDescription").map(str::to_string).unwrap_or_else(|| format!("modem {code} döndü")))
                }
                Err(e) => Err(e.to_string()),
            }
        }

        pub fn external_ip(&self) -> Option<String> {
            let r = self.soap("GetExternalIPAddress", "").ok()?;
            tag(&r, "NewExternalIPAddress").filter(|s| !s.is_empty()).map(str::to_string)
        }

        /// Önce süresiz; IGD v2 modemler süresiz kaydı reddeder, onlara bir haftalık (yarım saatte bir tazeleniyor)
        pub fn forward(&self, target: Ipv4Addr) -> Result<(), String> {
            let add = |lease: u32| {
                self.soap(
                    "AddPortMapping",
                    &format!(
                        "<NewRemoteHost></NewRemoteHost><NewExternalPort>9</NewExternalPort><NewProtocol>UDP</NewProtocol><NewInternalPort>9</NewInternalPort><NewInternalClient>{target}</NewInternalClient><NewEnabled>1</NewEnabled><NewPortMappingDescription>Nook WoL</NewPortMappingDescription><NewLeaseDuration>{lease}</NewLeaseDuration>"
                    ),
                )
                .map(|_| ())
            };
            add(0).or_else(|_| add(604_800))
        }

        pub fn remove(&self) {
            let _ = self.soap("DeletePortMapping", "<NewRemoteHost></NewRemoteHost><NewExternalPort>9</NewExternalPort><NewProtocol>UDP</NewProtocol>");
        }
    }
}

/// Modemde yönlendirmeyi kurar (ya da kaldırır) ve durumu günceller
fn refresh_wake() -> WakeOutside {
    let on = wake_on();
    let mut st = WakeOutside { on, ..Default::default() };
    let Some(lan) = crate::remote::lan_ip() else {
        st.error = Some("Ağ bağlantısı yok".into());
        return store_wake(st);
    };
    let Some(gw) = upnp::discover(lan) else {
        st.upnp = Some(false);
        return store_wake(st);
    };
    st.upnp = Some(true);
    st.external_ip = gw.external_ip();
    st.cgnat = st.external_ip.as_deref().and_then(|s| s.parse::<std::net::Ipv4Addr>().ok()).is_some_and(|ip| {
        let o = ip.octets();
        ip.is_private() || (o[0] == 100 && (o[1] & 0xC0) == 64)
    });
    if !on {
        gw.remove();
        return store_wake(st);
    }
    let o = lan.octets();
    let broadcast = std::net::Ipv4Addr::new(o[0], o[1], o[2], 255);
    match gw.forward(broadcast).map(|_| broadcast).or_else(|_| gw.forward(lan).map(|_| lan)) {
        Ok(t) => st.target = Some(t.to_string()),
        Err(e) => st.error = Some(format!("Modem yönlendirmeyi kabul etmedi: {e}")),
    }
    store_wake(st)
}

fn store_wake(st: WakeOutside) -> WakeOutside {
    *WAKE.lock().unwrap() = Some(st.clone());
    st
}

/// Evin internet adresi: önce modemin söylediği (UPnP), yoksa Tailscale'inki
pub fn home_ip() -> Option<String> {
    let w = WAKE.lock().unwrap().clone();
    match w {
        Some(w) if w.on && !w.cgnat && w.external_ip.is_some() => w.external_ip,
        _ => wan_ip(),
    }
}

/// Açılışta ve yarım saatte bir: ayar açıksa modemdeki yönlendirmeyi tazeler
pub fn spawn() {
    std::thread::Builder::new()
        .name("nook-wake-outside".into())
        .spawn(|| loop {
            if wake_on() {
                refresh_wake();
            }
            std::thread::sleep(std::time::Duration::from_secs(30 * 60));
        })
        .expect("dışarıdan açma iş parçacığı başlatılamadı");
}

#[tauri::command]
pub async fn wake_outside_status() -> WakeOutside {
    if let Some(w) = WAKE.lock().unwrap().clone() {
        return w;
    }
    tauri::async_runtime::spawn_blocking(refresh_wake).await.unwrap_or_default()
}

#[tauri::command]
pub async fn wake_outside_set(on: bool) -> WakeOutside {
    if let Some(p) = wake_path() {
        if let Some(dir) = p.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        let _ = std::fs::write(p, serde_json::json!({ "wake": on }).to_string());
    }
    tauri::async_runtime::spawn_blocking(refresh_wake).await.unwrap_or_default()
}

#[cfg(all(test, windows))]
mod tests {
    #[test]
    #[ignore]
    fn print_status() {
        println!("{}", serde_json::to_string_pretty(&super::outside_status()).unwrap());
    }

    /// Modemi bulup dış adresi sorar (yönlendirmeye dokunmaz)
    #[test]
    #[ignore]
    fn upnp_probe() {
        let lan = crate::remote::lan_ip().unwrap();
        let gw = super::upnp::discover(lan).expect("modem bulunamadı");
        println!("dış adres: {:?}", gw.external_ip());
    }
}
