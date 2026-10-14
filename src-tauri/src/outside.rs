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
/// Dışarıdan açmayı sınarken uyandırma paketinin PC'ye ulaşıp ulaşmadığını görmek için (UDP 9)
#[cfg(windows)]
const RULE_WAKE: &str = "Nook Mobil uyandırma testi";

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
    /// missing | running | stopped | needs-login | starting
    tailscale_state: TsState,
}

/// PC'deki Tailscale'in durumu
#[derive(Clone, Copy, Serialize, Default, PartialEq, Eq, Debug)]
#[serde(rename_all = "kebab-case")]
pub enum TsState {
    #[default]
    Missing,
    Running,
    /// Kapatılmış (Disconnect): Nook kendisi yeniden bağlar
    Stopped,
    /// Oturum açılmamış: kullanıcının Tailscale'e bir kez giriş yapması gerek
    NeedsLogin,
    Starting,
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

/// Tailscale'in kendi komut satırı aracı (imzalı tailscale.exe; betik değil)
#[cfg(windows)]
fn ts_cli(args: &[&str]) -> Option<std::process::Output> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let exe = tailscale_dir().join("tailscale.exe");
    if !exe.exists() {
        return None;
    }
    std::process::Command::new(exe).args(args).creation_flags(CREATE_NO_WINDOW).output().ok()
}

#[cfg(windows)]
fn query_wan() -> Option<String> {
    let out = ts_cli(&["status", "--json"])?;
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
        std::thread::spawn(|| unsafe {
            policy().and_then(|p| p.Rules()).is_ok_and(|r| r.Item(&BSTR::from(super::RULE)).is_ok() && r.Item(&BSTR::from(super::RULE_WAKE)).is_ok())
        })
        .join()
        .unwrap_or(false)
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
            rules.Add(&rule)?;
            // Uyandırma testi: modemin ilettiği paket evin dışından (herhangi bir adresten) gelir. Nook bu
            // portu yalnızca telefondan "Sına" denince birkaç saniye dinler.
            let _ = rules.Remove(&BSTR::from(super::RULE_WAKE));
            let rule: INetFwRule = CoCreateInstance(&NetFwRule, None, CLSCTX_INPROC_SERVER)?;
            rule.SetName(&BSTR::from(super::RULE_WAKE))?;
            rule.SetDescription(&BSTR::from("Nook Mobil: dışarıdan açmayı sınarken uyandırma paketinin modemden geçtiğini görme"))?;
            if let Ok(exe) = std::env::current_exe() {
                rule.SetApplicationName(&BSTR::from(exe.to_string_lossy().as_ref()))?;
            }
            rule.SetProtocol(NET_FW_IP_PROTOCOL_UDP.0)?;
            rule.SetLocalPorts(&BSTR::from("9"))?;
            rule.SetDirection(NET_FW_RULE_DIR_IN)?;
            rule.SetAction(NET_FW_ACTION_ALLOW)?;
            rule.SetProfiles(NET_FW_PROFILE2_ALL.0)?;
            rule.SetEnabled(VARIANT_TRUE)?;
            rules.Add(&rule)
        }
    }
}

// ---------------------------------------------------------------------------------------------
// Tailscale'i açık tutma: telefon evden uzaktayken PC'ye yalnızca Tailscale'den ulaşır. Biri Tailscale'i
// kapatırsa (Disconnect) ya da Windows yeniden başlayınca kapalı kalırsa Nook yeniden bağlar. Bir kez de
// "Unattended" moduna alır: PC uzaktan açılıp Windows'a giriş yapılmadan da Tailscale çalışsın.

#[cfg(windows)]
mod ts {
    use super::{ts_cli, TsState};
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Mutex;
    use std::time::{Duration, Instant};

    static STATE: Mutex<TsState> = Mutex::new(TsState::Missing);
    static LAST_UP: Mutex<Option<Instant>> = Mutex::new(None);
    static UNATTENDED: AtomicBool = AtomicBool::new(false);

    pub fn installed() -> bool {
        super::tailscale_dir().join("tailscale.exe").exists()
    }

    fn connected() -> bool {
        crate::remote::addresses().iter().any(|h| h.starts_with("100."))
    }

    fn backend() -> Option<String> {
        let out = ts_cli(&["status", "--json"])?;
        let v: serde_json::Value = serde_json::from_slice(&out.stdout).ok()?;
        v["BackendState"].as_str().map(str::to_owned)
    }

    /// Bir kez: Unattended kapalıysa açar (yönetici gerekmez)
    fn ensure_unattended() {
        if UNATTENDED.swap(true, Ordering::SeqCst) {
            return;
        }
        let prefs = ts_cli(&["debug", "prefs"]).map(|o| String::from_utf8_lossy(&o.stdout).into_owned()).unwrap_or_default();
        if !prefs.contains("\"ForceDaemon\": true") {
            let ok = ts_cli(&["set", "--unattended=true"]).is_some_and(|o| o.status.success());
            crate::log::write("info", &format!("tailscale unattended: {}", if ok { "açıldı" } else { "açılamadı" }));
        }
    }

    pub fn state() -> TsState {
        *STATE.lock().unwrap()
    }

    /// Kapalıysa bağlar; durumu döner. Bağlıyken süreç başlatmaz (yalnızca ağ kartlarına bakar).
    pub fn keep() -> TsState {
        let st = if !installed() {
            TsState::Missing
        } else if connected() {
            ensure_unattended();
            TsState::Running
        } else {
            match backend().as_deref() {
                Some("Stopped") => {
                    let due = LAST_UP.lock().unwrap().is_none_or(|t| t.elapsed() > Duration::from_secs(5 * 60));
                    if due {
                        *LAST_UP.lock().unwrap() = Some(Instant::now());
                        let ok = ts_cli(&["up", "--timeout=20s"]).is_some_and(|o| o.status.success());
                        crate::log::write("info", &format!("tailscale kapalıydı, yeniden bağlanma: {}", if ok { "tamam" } else { "olmadı" }));
                        if ok {
                            ensure_unattended();
                        }
                    }
                    if connected() || backend().as_deref() == Some("Running") {
                        TsState::Running
                    } else {
                        TsState::Stopped
                    }
                }
                Some("NeedsLogin") | Some("NeedsMachineAuth") | Some("NoState") => TsState::NeedsLogin,
                Some("Running") => TsState::Running,
                _ => TsState::Starting,
            }
        };
        *STATE.lock().unwrap() = st;
        st
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
            tailscale_state: if hosts.iter().any(|h| h.starts_with("100.")) { TsState::Running } else { ts::state() },
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

/// Tailscale'i açar: kapatılmışsa yeniden bağlar, giriş yapılmadıysa giriş penceresini gösterir
#[tauri::command]
pub async fn outside_open_tailscale() -> Result<(), String> {
    #[cfg(windows)]
    {
        let st = tauri::async_runtime::spawn_blocking(ts::keep).await.map_err(|e| e.to_string())?;
        if st == TsState::Running {
            return Ok(());
        }
        return crate::wol::shell_open(&tailscale_dir().join("tailscale-ipn.exe").to_string_lossy(), "", false).map(|_| ());
    }
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
// Dışarıdan açma: modemde UPnP ile UDP yönlendirmesi. Yayın adresine (x.x.x.255) yönlendirilir ki
// modem kapalı PC'yi unutmuş olsa da (ARP kaydı silinmiş) paket ağdaki herkese, PC'nin kartına da gitsin.
// Modem yayın adresini kabul etmezse PC'nin kendi adresine yönlendirilir. Bazı operatörler 9 gibi düşük
// portları dışarıdan keser, bazı modemler de yayın adresine kuralı kabul edip paketi iletmez: bu yüzden
// üç yol kurulur (ROUTES), telefon hepsine gönderir. Kural modem yeniden başlayınca silinebildiği için PC
// açık kaldıkça yarım saatte bir tazelenir.

/// (dış port, yayın adresine mi); iç port hep 9. 40010 PC'nin kendi adresine gider (yayını iletmeyen modemler için).
pub const ROUTES: [(u16, bool); 3] = [(9, true), (40009, true), (40010, false)];

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
    /// Modemin markası ve modeli (UPnP'den ya da arayüz sayfasından)
    router: Option<String>,
    /// Modemin adresi (arayüzü buradan açılır)
    gateway: Option<String>,
    /// Modemin kabul ettiği dış portlar (ROUTES'tan)
    ports: Vec<u16>,
    /// Telefondan yapılan son "dışarıdan açmayı sına" sonucu
    test: Option<WakeTest>,
}

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WakeTest {
    /// unix ms
    at: u64,
    listening: bool,
    /// PC'ye ulaşan paketlerin telefonun gönderdiği dış portları (0: işaretsiz paket)
    arrived: Vec<u16>,
}

/// UPnP kapalıyken modemi arayüz sayfasından (başlık, sunucu adı) tanır
fn router_from_page(gw: std::net::Ipv4Addr) -> Option<String> {
    use std::io::Read;
    let agent = ureq::AgentBuilder::new().timeout(std::time::Duration::from_secs(3)).redirects(2).build();
    let res = match agent.get(&format!("http://{gw}/")).call() {
        Ok(r) | Err(ureq::Error::Status(_, r)) => r,
        Err(_) => return None,
    };
    let server = res.header("server").unwrap_or("").to_owned();
    let mut body = String::new();
    let _ = res.into_reader().take(64 * 1024).read_to_string(&mut body);
    let low = format!("{server} {body}").to_lowercase();
    const BRANDS: [(&str, &str); 12] = [
        ("tp-link", "TP-Link"),
        ("tplink", "TP-Link"),
        ("zyxel", "Zyxel"),
        ("huawei", "Huawei"),
        ("zte", "ZTE"),
        ("airties", "AirTies"),
        ("keenetic", "Keenetic"),
        ("fritz", "FRITZ!Box"),
        ("asus", "ASUS"),
        ("netgear", "Netgear"),
        ("sagemcom", "Sagemcom"),
        ("mikrotik", "MikroTik"),
    ];
    let brand = BRANDS.iter().find(|(k, _)| low.contains(k)).map(|(_, v)| *v);
    let title = body
        .find("<title>")
        .and_then(|i| body[i + 7..].find("</title>").map(|j| body[i + 7..i + 7 + j].trim().to_owned()))
        .filter(|t| !t.is_empty() && t.len() < 60);
    match (brand, title) {
        (Some(b), Some(t)) if t.to_lowercase().contains(&b.to_lowercase()) => Some(t),
        (Some(b), _) => Some(b.to_owned()),
        (None, t) => t,
    }
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
        /// Üretici ve model ("TP-Link EX530v")
        pub name: Option<String>,
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
        let name = [tag(&xml, "manufacturer"), tag(&xml, "modelName").or_else(|| tag(&xml, "friendlyName"))]
            .into_iter()
            .flatten()
            .filter(|s| !s.is_empty())
            .collect::<Vec<_>>()
            .join(" ");
        let name = (!name.is_empty()).then_some(name);
        for service in WAN {
            let Some(i) = xml.find(&format!("<serviceType>{service}</serviceType>")) else { continue };
            let block = &xml[i..];
            let block = &block[..block.find("</service>").unwrap_or(block.len())];
            if let Some(ctl) = tag(block, "controlURL") {
                let control = if ctl.starts_with("http") { ctl.to_string() } else { format!("{root}{}{ctl}", if ctl.starts_with('/') { "" } else { "/" }) };
                return Some(Gateway { control, service, name });
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
        pub fn forward(&self, external: u16, target: Ipv4Addr) -> Result<(), String> {
            let add = |lease: u32| {
                self.soap(
                    "AddPortMapping",
                    &format!(
                        "<NewRemoteHost></NewRemoteHost><NewExternalPort>{external}</NewExternalPort><NewProtocol>UDP</NewProtocol><NewInternalPort>9</NewInternalPort><NewInternalClient>{target}</NewInternalClient><NewEnabled>1</NewEnabled><NewPortMappingDescription>Nook WoL</NewPortMappingDescription><NewLeaseDuration>{lease}</NewLeaseDuration>"
                    ),
                )
                .map(|_| ())
            };
            add(0).or_else(|_| add(604_800))
        }

        pub fn remove(&self, external: u16) {
            let _ = self.soap("DeletePortMapping", &format!("<NewRemoteHost></NewRemoteHost><NewExternalPort>{external}</NewExternalPort><NewProtocol>UDP</NewProtocol>"));
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
    let gw_ip = crate::remote::primary_adapter().and_then(|a| a.gateway);
    st.gateway = gw_ip.map(|g| g.to_string());
    let Some(gw) = upnp::discover(lan) else {
        st.upnp = Some(false);
        st.router = gw_ip.and_then(router_from_page);
        return store_wake(st);
    };
    st.upnp = Some(true);
    st.router = gw.name.clone().or_else(|| gw_ip.and_then(router_from_page));
    st.external_ip = gw.external_ip();
    st.cgnat = st.external_ip.as_deref().and_then(|s| s.parse::<std::net::Ipv4Addr>().ok()).is_some_and(|ip| {
        let o = ip.octets();
        ip.is_private() || (o[0] == 100 && (o[1] & 0xC0) == 64)
    });
    if !on {
        for (port, _) in ROUTES {
            gw.remove(port);
        }
        return store_wake(st);
    }
    let o = lan.octets();
    let broadcast = std::net::Ipv4Addr::new(o[0], o[1], o[2], 255);
    let mut last_err = None;
    for (port, to_broadcast) in ROUTES {
        let r = if to_broadcast {
            gw.forward(port, broadcast).map(|_| broadcast).or_else(|_| gw.forward(port, lan).map(|_| lan))
        } else {
            gw.forward(port, lan).map(|_| lan)
        };
        match r {
            Ok(t) => {
                st.ports.push(port);
                st.target.get_or_insert(t.to_string());
            }
            Err(e) => last_err = Some(e),
        }
    }
    if st.ports.is_empty() {
        st.error = last_err.map(|e| format!("Modem yönlendirmeyi kabul etmedi: {e}"));
    }
    store_wake(st)
}

fn store_wake(mut st: WakeOutside) -> WakeOutside {
    st.test = TEST.lock().unwrap().clone();
    *WAKE.lock().unwrap() = Some(st.clone());
    st
}

static TEST: std::sync::Mutex<Option<WakeTest>> = std::sync::Mutex::new(None);

/// Dışarıdan açmayı sına: PC açıkken UDP 9'u birkaç saniye dinler. Telefon (mobil veride) uyandırma
/// paketini evin internet adresinin her yol portuna gönderir; paketin sonundaki "NOOK"+port işaretinden
/// hangi yolun modemden geçip PC'ye ulaştığı anlaşılır.
pub fn wake_test_start() -> Result<(), String> {
    if TEST.lock().unwrap().as_ref().is_some_and(|t| t.listening) {
        return Ok(());
    }
    let sock = std::net::UdpSocket::bind(("0.0.0.0", 9)).map_err(|e| format!("Uyandırma portu dinlenemedi: {e}"))?;
    let _ = sock.set_read_timeout(Some(std::time::Duration::from_millis(400)));
    let at = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0);
    *TEST.lock().unwrap() = Some(WakeTest { at, listening: true, arrived: Vec::new() });
    std::thread::Builder::new()
        .name("nook-wake-test".into())
        .spawn(move || {
            let until = std::time::Instant::now() + std::time::Duration::from_secs(25);
            let mut buf = [0u8; 512];
            while std::time::Instant::now() < until {
                let Ok((n, _)) = sock.recv_from(&mut buf) else { continue };
                let port = buf[..n].windows(6).find(|w| &w[..4] == b"NOOK").map(|w| u16::from_be_bytes([w[4], w[5]])).unwrap_or(0);
                if let Some(t) = TEST.lock().unwrap().as_mut() {
                    if !t.arrived.contains(&port) {
                        t.arrived.push(port);
                    }
                }
            }
            let done = TEST.lock().unwrap().as_mut().map(|t| {
                t.listening = false;
                t.clone()
            });
            if let Some(w) = WAKE.lock().unwrap().as_mut() {
                w.test = done;
            }
        })
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn wake_test_result() -> Option<WakeTest> {
    TEST.lock().unwrap().clone()
}

/// Evin internet adresi: önce modemin söylediği (UPnP), yoksa Tailscale'inki
pub fn home_ip() -> Option<String> {
    let w = WAKE.lock().unwrap().clone();
    match w {
        Some(w) if w.on && !w.cgnat && w.external_ip.is_some() => w.external_ip,
        _ => wan_ip(),
    }
}

/// İki dakikada bir: telefon köprüsü açıksa Tailscale'i açık tutar. Yarım saatte bir: ayar açıksa
/// modemdeki yönlendirmeyi tazeler.
pub fn spawn() {
    std::thread::Builder::new()
        .name("nook-wake-outside".into())
        .spawn(|| {
            // Açılışta ağ henüz hazır olmayabilir
            std::thread::sleep(std::time::Duration::from_secs(20));
            let mut tick: u64 = 0;
            loop {
                #[cfg(windows)]
                if crate::remote::enabled() {
                    ts::keep();
                }
                if tick % 15 == 0 && wake_on() {
                    refresh_wake();
                }
                tick += 1;
                std::thread::sleep(std::time::Duration::from_secs(2 * 60));
            }
        })
        .expect("dışarıdan açma iş parçacığı başlatılamadı");
}

/// Telefonun sakladığı kurulum raporu (/v1/setup): PC kapalıyken de telefonda neyin eksik olduğu ve
/// nasıl yapılacağı görünsün diye. Modem bilgisi önbellekten (yoksa bir kez aranır).
pub fn setup_report() -> serde_json::Value {
    let cached = WAKE.lock().unwrap().clone();
    let wake = cached.unwrap_or_else(refresh_wake);
    #[allow(unused_mut)]
    let mut out = outside_status();
    out.phone_qr = None;
    #[cfg(windows)]
    if !out.tailscale_up && out.tailscale_installed {
        out.tailscale_state = ts::keep();
    }
    serde_json::json!({
        "at": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0),
        "wol": crate::wol::wol_status(),
        "outside": out,
        "wake": wake,
        "bridge": crate::remote::enabled(),
    })
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

    #[test]
    #[ignore]
    fn print_setup() {
        println!("{}", serde_json::to_string_pretty(&super::setup_report()).unwrap());
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
