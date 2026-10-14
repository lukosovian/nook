/**
 * Telefondan PC'yi açma ve evden uzaktayken bağlanma tarifleri. PC'de Ayarlar › Telefon'da ve Nook
 * Mobil'de (PC kapalıyken de, son raporu saklayarak) aynı metinler kullanılır. Metinler Türkçe; PC
 * tarafı tt() ile sarar.
 */

/** PC'nin /v1/setup raporu (src-tauri/src/outside.rs setup_report) */
export interface SetupReport {
  at: number;
  bridge: boolean;
  wol: {
    adapter: string | null;
    wired: boolean | null;
    fastStartup: boolean;
    magicPacket: boolean | null;
    wakeArmed: boolean | null;
    vendor: string | null;
    model: string | null;
    laptop?: boolean;
    modernStandby?: boolean;
    autoLogon?: boolean;
  };
  outside: {
    tailscaleInstalled: boolean;
    tailscaleUp: boolean;
    firewall: boolean;
    lanIp: string | null;
    mac: string | null;
    wan: string | null;
    tailscaleState?: "missing" | "running" | "stopped" | "needs-login" | "starting";
  };
  wake: {
    on: boolean;
    upnp: boolean | null;
    target: string | null;
    externalIp: string | null;
    cgnat: boolean;
    error: string | null;
    router?: string | null;
    gateway?: string | null;
    /** Modemin kabul ettiği dış portlar (eski PC sürümlerinde yok) */
    ports?: number[];
    /** Telefondan yapılan son "dışarıdan açmayı sına" */
    test?: { at: number; listening: boolean; arrived: number[] } | null;
  };
}

export interface Guide {
  /** Kısa başlık: "ASUS PRIME B450M-K II" */
  title?: string;
  steps: string[];
  note?: string;
}

const has = (s: string | null | undefined, ...keys: string[]) => {
  const v = (s ?? "").toLowerCase();
  return keys.some((k) => v.includes(k));
};

/** BIOS'ta açılacak ayar: masaüstü anakartı, hazır masaüstü ve dizüstü için ayrı */
export function biosGuide(hw: { vendor: string | null; model: string | null; laptop?: boolean; modernStandby?: boolean; wired?: boolean | null }): Guide {
  const v = hw.vendor;
  const m = hw.model;
  const title = [v, m].filter(Boolean).join(" ") || undefined;
  const save = "Değişikliği kaydedip çık (çoğunlukla F10 › Yes).";

  if (hw.laptop) {
    const note = [
      "Dizüstülerde kapalıyken uyanma çoğu modelde yalnızca şarj aleti takılıyken ve kabloyla (Ethernet) bağlıyken çalışır; Wi-Fi'deyken kapalı dizüstü açılamaz.",
      hw.wired === false ? "Bu dizüstü şu an Wi-Fi'de: kapatırsan telefondan açılmaz. Kapatmak yerine Uyku'ya al; uykudan çoğu dizüstü uyanır." : null,
      hw.modernStandby ? "Bu bilgisayar Modern Bekleme kullanıyor: uykudayken de ağa bağlı kalır, telefondan genelde ulaşılır." : null,
      "BIOS'ta seçenek hiç yoksa model desteklemiyor demektir; o zaman Kapat yerine Uyku kullan.",
    ]
      .filter(Boolean)
      .join(" ");
    let steps: string[];
    if (has(v, "lenovo") && has(m, "thinkpad", "thinkbook"))
      steps = ["Açılışta F1'e bas (ThinkBook'ta F2).", "Config › Network › “Wake On LAN” seçeneğini “AC Only” yap.", "Config › Power'da “Deep Sleep”/“Intel Rapid Start” varsa kapat.", save];
    else if (has(v, "lenovo"))
      steps = ["Açılışta F2'ye bas (açılmazsa kapalıyken yandaki Novo düğmesine iğneyle bas › BIOS Setup).", "Configuration menüsünde “Wake on LAN” varsa Enabled yap (IdeaPad/Legion'ların çoğunda bu seçenek yok).", save];
    else if (has(v, "dell"))
      steps = ["Açılışta F2'ye bas.", "Power Management › “Wake on LAN/WLAN” seçeneğini “LAN Only” yap.", "Power Management › “Deep Sleep Control” seçeneğini Disabled yap.", "Apply › Exit."];
    else if (has(v, "hp", "hewlett"))
      steps = ["Açılışta Esc'e, sonra F10'a bas.", "Advanced › Power-On Options (ya da Built-In Device Options) › “Wake On LAN” seçeneğini “Boot to Hard Drive” yap.", "“S5 Maximum Power Savings” varsa Disabled yap.", "Main › Save Changes and Exit."];
    else if (has(v, "asus"))
      steps = ["Açılışta F2'ye bas, F7 ile Advanced Mode'a geç.", "Advanced › APM Configuration (ya da Power) › “Power On By PCI-E/LAN” varsa Enabled yap.", "Seçenek yoksa bu model kapalıyken ağdan açılmayı desteklemiyor.", save];
    else if (has(v, "micro-star", "msi"))
      steps = ["Açılışta Del'e bas.", "Advanced › “Wake On LAN” varsa Enabled yap (MSI dizüstülerin çoğunda bu seçenek yok).", save];
    else if (has(v, "acer"))
      steps = ["Açılışta F2'ye bas.", "Main ya da Power menüsünde “Wake on LAN” varsa Enabled yap (Acer dizüstülerin çoğunda yok).", save];
    else if (has(v, "monster", "casper", "clevo", "tongfang", "excalibur"))
      steps = ["Açılışta F2'ye bas.", "Advanced › Power Management (ya da Advanced Chipset) › “Wake on LAN” varsa Enabled yap.", save];
    else if (has(v, "huawei", "honor", "samsung", "microsoft"))
      steps = ["Bu markanın dizüstülerinde BIOS'ta genelde ağdan uyandırma seçeneği yok.", "Kapat yerine Uyku kullan; uykudayken telefondan açılabilir."];
    else steps = ["Açılışta F2'ye (bazı modellerde Del ya da F10) bas.", "Power ya da Advanced menüsünde “Wake on LAN” seçeneğini bulup Enabled yap.", save];
    return { title, steps, note };
  }

  // Masaüstü
  let steps: string[];
  if (has(v, "asus"))
    steps = ["Açılışta Del'e bas, F7 ile Advanced Mode'a geç.", "Advanced › APM Configuration › “Power On By PCI-E” seçeneğini Enabled yap.", "Aynı yerde “ErP Ready” seçeneğini Disabled yap.", "F10 ile kaydet."];
  else if (has(v, "micro-star", "msi"))
    steps = ["Açılışta Del'e bas, F7 ile Advanced Mode'a geç.", "Settings › Advanced › Wake Up Event Setup › “Resume By PCI-E Device” seçeneğini Enabled yap.", "Settings › Advanced › Power Management Setup › “ErP Ready” seçeneğini Disabled yap.", "F10 ile kaydet."];
  else if (has(v, "gigabyte"))
    steps = ["Açılışta Del'e bas.", "Settings › Platform Power › “Wake on LAN” seçeneğini Enabled yap.", "Aynı yerde “ErP” seçeneğini Disabled yap.", "F10 ile kaydet."];
  else if (has(v, "asrock"))
    steps = ["Açılışta F2'ye bas.", "Advanced › ACPI Configuration › “PCIE Devices Power On” seçeneğini Enabled yap.", "Aynı yerde “Deep Sleep” seçeneğini Disabled yap.", "F10 ile kaydet."];
  else if (has(v, "dell"))
    steps = ["Açılışta F2'ye bas.", "Power Management › “Wake on LAN” seçeneğini “LAN Only” yap.", "“Deep Sleep Control” seçeneğini Disabled yap.", "Apply › Exit."];
  else if (has(v, "hp", "hewlett"))
    steps = ["Açılışta F10'a bas.", "Advanced › Power-On Options › “Remote Wakeup Boot Source” seçeneğini Local Hard Drive yap.", "“S5 Maximum Power Savings” seçeneğini Disabled yap.", "Main › Save Changes and Exit."];
  else if (has(v, "lenovo"))
    steps = ["Açılışta F1'e bas.", "Power › “Automatic Power On” › “Wake on LAN” seçeneğini Automatic ya da Enabled yap.", "Power › “Enhanced Power Saving Mode” seçeneğini Disabled yap.", "F10 ile kaydet."];
  else
    steps = ["Açılışta Del'e (ya da F2'ye) bas.", "Power, APM ya da ACPI menüsünde “Wake on LAN”, “Power On By PCI-E” ya da “Resume by LAN” seçeneğini Enabled yap.", "“ErP” ya da “Deep Sleep” seçeneğini Disabled yap.", "F10 ile kaydet."];
  return {
    title,
    steps,
    note: hw.wired === false ? "Bu PC şu an Wi-Fi'de: kapalıyken açmak için kabloyla modeme bağla." : "Elektrik kesilirse PC'yi bir kez düğmesinden aç; sonra yine telefondan açılır.",
  };
}

/** Modemde elle ayar (UPnP kapalıysa ya da kabul etmediyse) */
export function routerGuide(w: { router?: string | null; gateway?: string | null; upnp: boolean | null }, ip: string | null, mac: string | null): Guide {
  const r = w.router ?? null;
  const gw = w.gateway ?? "192.168.1.1";
  const pc = ip ?? "PC'nin adresi";
  const card = mac ?? "PC'nin ağ kartı";
  const open = `Tarayıcıda ${gw} adresini aç ve modemin şifresiyle giriş yap (şifre çoğunlukla modemin altındaki etikette).`;
  let upnp: string;
  let fwd: string;
  let dhcp: string;
  let bind: string | null = null;
  if (has(r, "tp-link", "tplink")) {
    upnp = "Advanced › NAT Forwarding › UPnP: açık yap.";
    fwd = `Advanced › NAT Forwarding › Virtual Servers › Add: Service Port 9, Internal Port 9, Internal IP ${pc}, Protocol UDP › Save.`;
    dhcp = `Advanced › Network › DHCP Server › Address Reservation › Add: MAC ${card}, IP ${pc}.`;
    bind = `Advanced › Security › IP & MAC Binding: ${pc} ↔ ${card} ekle (PC kapalıyken modem onu unutmasın).`;
  } else if (has(r, "zyxel")) {
    upnp = "Network Setting › Home Networking › UPnP: açık yap.";
    fwd = `Network Setting › NAT › Port Forwarding › Add: WAN Port 9, LAN Port 9, Server IP ${pc}, Protocol UDP.`;
    dhcp = `Network Setting › Home Networking › Static DHCP › Add: MAC ${card}, IP ${pc}.`;
  } else if (has(r, "huawei")) {
    upnp = "Advanced › Forward Rules (ya da Network Application) › UPnP: açık yap.";
    fwd = `Advanced › Forward Rules › Port Mapping › New: Protocol UDP, Internal host ${pc}, External/Internal port 9.`;
    dhcp = `Advanced › LAN › DHCP Server › Static IP: MAC ${card}, IP ${pc}.`;
  } else if (has(r, "zte")) {
    upnp = "Local Network (ya da Advanced) › UPnP: açık yap.";
    fwd = `Internet › Security › Port Forwarding (ya da Advanced › NAT): Protocol UDP, WAN port 9, LAN host ${pc}, LAN port 9.`;
    dhcp = `Local Network › LAN › DHCP Binding: MAC ${card}, IP ${pc}.`;
  } else if (has(r, "airties")) {
    upnp = "NAT › UPnP: açık yap.";
    fwd = `NAT › Port Yönlendirme › Ekle: UDP, port 9, hedef ${pc}.`;
    dhcp = `LAN › DHCP › Sabit IP: MAC ${card}, IP ${pc}.`;
  } else if (has(r, "keenetic")) {
    upnp = "Genel Ayarlar › Bileşenler'de UPnP kurulu ve açık olsun.";
    fwd = `İnternet › Port yönlendirme › Ekle: Cihaz ${pc}, Protokol UDP, port 9.`;
    dhcp = `Cihaz listesinde PC'yi “kayıtlı” yap ve “Kalıcı IP adresi” seç (${pc}).`;
  } else if (has(r, "fritz")) {
    upnp = "Ev Ağı › Ağ › Ağ Ayarları › “Durum bilgilerini UPnP ile ilet” ve İnternet › Erişim İzinleri'nde PC için “Bağlantı noktası paylaşımlarına izin ver”.";
    fwd = `İnternet › Erişim İzinleri › Port Paylaşımları › Cihaz ekle: ${pc}, UDP 9.`;
    dhcp = "Ev Ağı › Ağ › PC'yi düzenle › “Bu cihaza her zaman aynı IPv4 adresini ata”.";
  } else if (has(r, "asus")) {
    upnp = "WAN › Internet Connection › “Enable UPnP”: Yes.";
    fwd = `WAN › Virtual Server / Port Forwarding › Ekle: Port 9, Local IP ${pc}, Protocol UDP.`;
    dhcp = `LAN › DHCP Server › Manually Assigned IP: MAC ${card}, IP ${pc}.`;
  } else {
    upnp = "Gelişmiş ayarlarda (NAT ya da Güvenlik altında) UPnP'yi aç.";
    fwd = `NAT › Port Yönlendirme / Sanal Sunucu: UDP 9 → ${pc}, iç port 9.`;
    dhcp = `DHCP › Adres ayırma (Sabit IP): ${card} ağ kartına hep ${pc} verilsin.`;
    bind = `Varsa Güvenlik › IP ve MAC bağlama (ARP binding): ${pc} ↔ ${card}.`;
  }
  const steps =
    w.upnp === false
      ? [open, upnp, "Nook birkaç dakika içinde gerisini kendisi ayarlar. UPnP açılamıyorsa elle:", fwd, dhcp, ...(bind ? [bind] : [])]
      : [open, fwd, dhcp, ...(bind ? [bind] : [])];
  return { title: r ?? undefined, steps, note: "Menü adları modemin yazılımına göre biraz değişebilir. Operatör ortak adres (CGNAT) veriyorsa dışarıdan açma çalışmaz; operatörden “statik/genel IP” iste." };
}

/** Uzaktan açınca Windows giriş ekranında bekler; Nook ancak girişten sonra çalışır */
export function autoLogonGuide(): Guide {
  return {
    steps: [
      "Ayarlar › Hesaplar › Oturum açma seçenekleri'nde “Ek güvenlik için yalnızca Windows Hello oturum açmaya izin ver” seçeneğini kapat.",
      "Win+R'ye bas, netplwiz yaz, Enter.",
      "“Kullanıcıların bu bilgisayarı kullanmak için bir kullanıcı adı ve parola girmesi gerekir” işaretini kaldır, Uygula'ya bas ve şifreni iki kez gir.",
    ],
    note: "Böylece telefondan açınca PC kendiliğinden masaüstüne geçer, Nook çalışır ve telefon bağlanır. İstemezsen PC'yi uzaktan açtıktan sonra Tailscale yine çalışır ama Nook'a ancak biri giriş yapınca ulaşılır.",
  };
}

export type ItemState = boolean | null;

export interface SetupItem {
  id: string;
  ok: ItemState;
  text: string;
  guide?: Guide;
}

/** Rapordan kontrol listesi: önce evden uzakta bağlanma, sonra uzaktan açma */
export function setupItems(r: SetupReport): { connect: SetupItem[]; wake: SetupItem[] } {
  const o = r.outside;
  const w = r.wol;
  const ts = o.tailscaleState ?? (o.tailscaleUp ? "running" : o.tailscaleInstalled ? "stopped" : "missing");
  const connect: SetupItem[] = [
    ts === "missing"
      ? { id: "ts", ok: false, text: "PC'de Tailscale kurulu değil", guide: { steps: ["PC'de Nook › Ayarlar › Telefon › Evden uzaktayken bağlanma › Kur'a bas.", "Kurulum bitince Google hesabınla giriş yap.", "Telefona da Tailscale'i kurup aynı hesapla giriş yap."] } }
      : ts === "needs-login"
        ? { id: "ts", ok: false, text: "PC'de Tailscale'e giriş yapılmamış", guide: { steps: ["PC'de saatin yanındaki Tailscale simgesine tıkla › Log in.", "Telefondakiyle aynı hesapla giriş yap."] } }
        : ts === "running"
          ? { id: "ts", ok: true, text: "PC'de Tailscale açık (Nook açık tutar)" }
          : { id: "ts", ok: false, text: "PC'de Tailscale kapalıydı; Nook yeniden bağlıyor" },
    o.firewall
      ? { id: "fw", ok: true, text: "PC'nin güvenlik duvarı telefona izin veriyor" }
      : { id: "fw", ok: false, text: "PC'nin güvenlik duvarı izni yok", guide: { steps: ["PC'de Nook › Ayarlar › Telefon › Evden uzaktayken bağlanma › “İzin ver”e bas ve Windows'un sorusuna Evet de."] } },
  ];
  const card = w.magicPacket !== false && w.wakeArmed !== false;
  const wake: SetupItem[] = [];
  if (!w.adapter) wake.push({ id: "nic", ok: false, text: "Modeme bağlı ağ kartı bulunamadı", guide: { steps: ["PC'yi kabloyla modeme bağla."] } });
  else {
    wake.push(
      w.wired
        ? { id: "wired", ok: true, text: "PC kabloyla bağlı" }
        : { id: "wired", ok: false, text: w.laptop ? "Dizüstü Wi-Fi'de: kapalıyken açılmaz" : "PC Wi-Fi'de: kapalıyken çoğu PC uyanmaz", guide: { steps: [w.laptop ? "Kapatmak yerine Uyku'ya al ya da kabloyla bağla." : "PC'yi Ethernet kablosuyla modeme bağla."] } },
    );
    const win = !w.fastStartup && card;
    wake.push(
      win
        ? { id: "win", ok: true, text: "Windows ayarları hazır" }
        : { id: "win", ok: false, text: w.fastStartup ? "Hızlı Başlangıç açık" : "Ağ kartının uyandırması kapalı", guide: { steps: ["PC'de Nook › Ayarlar › Telefon › Telefondan PC'yi açma › Düzelt'e bas ve Windows'un sorusuna Evet de."] } },
    );
  }
  wake.push({ id: "bios", ok: null, text: w.laptop ? "BIOS'ta Wake-on-LAN (dizüstü)" : "BIOS'ta Wake-on-LAN açık olmalı", guide: biosGuide(w) });
  if (w.autoLogon === false) wake.push({ id: "logon", ok: null, text: "Açılınca Windows giriş ekranında bekler", guide: autoLogonGuide() });
  const k = r.wake;
  if (!k.on)
    wake.push({ id: "outside", ok: null, text: "Evden uzaktayken açma kapalı", guide: { steps: ["PC'de Nook › Ayarlar › Telefon › Telefondan PC'yi açma › “Evden uzaktayken de açılabilsin”i aç. Modemi Nook kendisi ayarlar."] } });
  else if (k.cgnat) wake.push({ id: "outside", ok: false, text: "Operatör ortak adres veriyor: dışarıdan açma çalışmaz", guide: { steps: ["İnternet sağlayıcını arayıp “statik IP” ya da “CGNAT'tan çıkarılma” iste.", "Sonra PC'de ayarı kapatıp aç."] } });
  else if (k.target) wake.push({ id: "outside", ok: true, text: `Modem ayarlandı${k.router ? ` (${k.router})` : ""}` });
  else wake.push({ id: "outside", ok: false, text: k.upnp === false ? "Modem otomatik ayarlanamadı (UPnP kapalı)" : (k.error ?? "Modem ayarlanamadı"), guide: routerGuide(k, o.lanIp, o.mac) });
  if (k.on && k.test && !k.test.listening) wake.push(wakeTestItem(k, o.lanIp, o.mac));
  return { connect, wake };
}

/** "Dışarıdan açmayı sına" sonucu: paket hangi yoldan PC'ye ulaştı, ulaşmadıysa ne yapılmalı */
export function wakeTestItem(k: SetupReport["wake"], ip: string | null, mac: string | null): SetupItem {
  const a = k.test?.arrived ?? [];
  const pc = ip ?? "PC'nin adresi";
  const card = mac ?? "PC'nin ağ kartı";
  const broadcast = (k.target ?? "").endsWith(".255");
  if (a.includes(1))
    return { id: "test", ok: null, text: "Sınama ev ağından yapıldı", guide: { steps: ["Telefonda Wi-Fi'ı kapat, mobil veriyle yeniden sına."] } };
  if (broadcast && (a.includes(9) || a.includes(40009))) return { id: "test", ok: true, text: "Sınandı: uyandırma evin dışından PC'ye ulaşıyor" };
  if (a.some((x) => x > 1))
    return {
      id: "test",
      ok: false,
      text: "Paket PC'ye ulaşıyor ama PC kapanınca modem onu unutabilir",
      guide: {
        steps: [
          `Modemde DHCP adres ayırma: ${card} ağ kartına hep ${pc} verilsin.`,
          `Modemde IP ve MAC bağlama (ARP binding): ${pc} ↔ ${card}. TP-Link: Advanced › Security › IP & MAC Binding.`,
          "Sonra PC'yi kapatıp telefondan mobil veriyle aç.",
        ],
        note: "Modem PC'nin kartına giden yolu ancak bu bağlamayla, PC kapalıyken de hatırlar.",
      },
    };
  return {
    id: "test",
    ok: false,
    text: "Sınandı: paket modemden PC'ye geçmedi",
    guide: {
      steps: [
        "Modemi yeniden başlat, PC'de Nook açıkken birkaç dakika bekle ve yeniden sına (Nook yönlendirmeyi yeniden kurar).",
        `Olmazsa modemde elle yönlendir: UDP 40009 → ${pc}, iç port 9.`,
        "Yine olmazsa operatör dışarıdan gelen bu paketleri kesiyor olabilir: operatörü arayıp “gelen bağlantılar için statik/genel IP” iste.",
      ],
      note: k.cgnat ? "Operatör ortak adres veriyor; bu durumda dışarıdan açma çalışmaz." : undefined,
    },
  };
}
