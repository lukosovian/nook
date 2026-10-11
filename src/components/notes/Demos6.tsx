/**
 * 0.2.55 Nook Mobil yama notunun ikinci yarısının görselleri: telefonda Hum, Bilgisayar çipindeki durum,
 * PC'yi telefondan açmaya hazırlık (Windows ayarlarını düzelt), evden uzaktayken bağlanma (Tailscale),
 * dışarıdan açma (modem), telefona kurma ve uygulama içi güncelleme, telefonda tanıtım.
 * 0.2.56: VPN açıkken ya da yeni modemlerde de modemi bulma.
 * Hepsi kendi kendine döner.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Download, Globe, House, Music2, Power, QrCode, Router, ShieldCheck, Smartphone, Wifi, X } from "lucide-react";
import { CHIP_NOOKS, DEFAULT_LOOK, normalizeColor, normalizeLook } from "../../lib/look";
import { useNook } from "../../store/nook";
import { NookFigure } from "../mascot/Figure";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

function useTick(ms: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setN((x) => x + 1), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return n;
}

const Stage = ({ children }: { children: React.ReactNode }) => (
  <div className="relative h-full w-full overflow-hidden rounded-[14px]" style={{ background: "radial-gradient(120% 100% at 50% 0%, #1d2230 0%, #0e1016 75%)" }}>
    {children}
  </div>
);

/** Sabit boyutlu sahneyi kartın ortasına koyar; kart darsa sığacak kadar küçültür */
function Fit({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, (el.clientWidth - 20) / w, (el.clientHeight - 12) / h)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);
  return (
    <div ref={box} className="absolute inset-0 flex items-center justify-center">
      <div className="relative shrink-0" style={{ width: w, height: h, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

/** Telefon kasası */
const Phone = ({ left = 0, children, className = "" }: { left?: number; children: React.ReactNode; className?: string }) => (
  <div className={`absolute top-[3px] h-[104px] w-[58px] overflow-hidden rounded-[11px] border border-white/20 bg-black p-[5px] ${className}`} style={{ left }}>
    {children}
  </div>
);

/** Masaüstü ekranı (sağda) ve ayağı */
const Pc = ({ children, w = 150, dark = false }: { children?: React.ReactNode; w?: number; dark?: boolean }) => (
  <>
    <div className="absolute right-0 top-[4px] h-[84px] overflow-hidden rounded-[8px] border border-white/15" style={{ width: w, background: dark ? "#0b0c10" : "#101218" }}>
      {children}
    </div>
    <div className="absolute top-[88px] h-[7px] w-[20px] bg-white/15" style={{ right: w / 2 - 10 }} />
    <div className="absolute top-[95px] h-[3px] w-[44px] rounded-full bg-white/15" style={{ right: w / 2 - 22 }} />
  </>
);

const Mark = ({ ok }: { ok: boolean | null }) =>
  ok === null ? (
    <span className="h-[7px] w-[7px] shrink-0 rounded-full border border-white/30" />
  ) : ok ? (
    <Check size={8} strokeWidth={3.2} className="shrink-0" style={{ color: ACCENT.green }} />
  ) : (
    <X size={8} strokeWidth={3.2} className="shrink-0" style={{ color: ACCENT.red }} />
  );

// ---------------------------------------------------------------- Telefonda Hum

/** Kafede çalan şarkı: telefonda Hum'a dokunulur, halkalar sesle büyür, şarkı bulunur ve PC'nin Hum geçmişine telefon işaretiyle düşer */
function PhoneHumDemo() {
  const n = useTick(450);
  const phase = n % 14; // 0-1 bekle · 2 dokun · 3-7 dinliyor · 8-13 bulundu, PC'de belirir
  const V = ACCENT.purple;
  const listening = phase >= 3 && phase <= 7;
  const found = phase >= 8;
  const hum = CHIP_NOOKS.hum;
  return (
    <Stage>
      <Fit w={290} h={110}>
        {/* Ortamdaki müzik: hoparlörden notalar */}
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute left-[78px]"
            style={{ top: 30 + i * 20, color: tintText(ACCENT.pink) }}
            animate={{ x: [0, -14], opacity: [0, 1, 0] }}
            transition={{ duration: 1.6, delay: i * 0.5, repeat: Infinity }}
          >
            <Music2 size={9} />
          </motion.span>
        ))}
        <Phone>
          <div className="relative mx-auto mt-[6px] flex h-[44px] w-[44px] items-center justify-center">
            {[0, 1].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border"
                style={{ borderColor: tintBg(V, 60) }}
                animate={listening ? { scale: [1, 1.25 + i * 0.12, 1], opacity: [0.8, 0.3, 0.8] } : { scale: 1, opacity: 0.3 }}
                transition={{ duration: 0.7, delay: i * 0.2, repeat: listening ? Infinity : 0 }}
              />
            ))}
            <motion.span animate={{ scale: phase === 2 ? 0.85 : 1 }}>
              <NookFigure look={hum.look} color={hum.color} size={30} expression={listening ? "djNod" : found ? "happy" : "idle"} />
            </motion.span>
          </div>
          <p className="mt-[4px] text-center text-[5.5px] font-semibold" style={{ color: tintText(V) }}>
            {listening ? tt("Dinliyorum…") : found ? "Blinding Lights" : tt("Dokun, bulayım")}
          </p>
          <AnimatePresence>
            {found && (
              <motion.div className="mx-[1px] mt-[4px] flex items-center gap-[3px] rounded-[4px] bg-white/[0.08] p-[2px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <span className="h-[12px] w-[12px] rounded-[2px]" style={{ background: "linear-gradient(135deg,#e74c3c,#f39c12)" }} />
                <span className="truncate text-[5px] text-label-2">The Weeknd</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Phone>
        {/* PC'deki Hum geçmişi */}
        <Pc>
          <div className="p-[6px]">
            <div className="mb-[4px] flex items-center gap-1 text-[7px] font-semibold" style={{ color: tintText(V) }}>
              <span className="h-[6px] w-[6px] rounded-full" style={{ background: V }} />
              Hum
            </div>
            <AnimatePresence>
              {phase >= 10 && (
                <motion.div className="mb-[3px] flex items-center gap-[4px] rounded-[4px] px-[3px] py-[2px]" style={{ background: tintBg(V, 16) }} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                  <span className="h-[12px] w-[12px] rounded-[2px]" style={{ background: "linear-gradient(135deg,#e74c3c,#f39c12)" }} />
                  <span className="min-w-0 flex-1 truncate text-[6.5px] text-label">Blinding Lights</span>
                  <Smartphone size={7} style={{ color: tintText(V) }} />
                </motion.div>
              )}
            </AnimatePresence>
            {["Kara Toprak", "Where Is My Mind?"].map((t) => (
              <div key={t} className="mb-[3px] flex items-center gap-[4px] px-[3px] py-[2px]">
                <span className="h-[12px] w-[12px] rounded-[2px] bg-white/10" />
                <span className="truncate text-[6.5px] text-label-3">{t}</span>
              </div>
            ))}
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Bilgisayar çipinde durum

/** Telefonun ana ekranındaki Bilgisayar çipi: açık kalma süresi, işlemci, bellek ve boş disk canlı */
function PhoneStatsDemo() {
  const n = useTick(900);
  const G = "#8FE03A";
  const cpu = [18, 42, 67, 35, 24, 51][n % 6];
  const mem = [11.4, 11.6, 12.3, 12.1, 11.8, 12.6][n % 6];
  const mins = 25 + (n % 60);
  const control = CHIP_NOOKS.control;
  const stat = (v: string, l: string, frac: number | null, c?: string) => (
    <span className="flex min-w-0 flex-col">
      <span className="truncate font-round text-[8.5px] font-bold leading-tight text-label">{v}</span>
      <span className="text-[5.5px] text-label-3">{l}</span>
      <span className="mt-[2px] h-[2px] overflow-hidden rounded-full" style={{ background: frac === null ? "transparent" : "rgb(0 0 0 / 0.3)" }}>
        {frac !== null && <motion.span className="block h-full rounded-full" style={{ background: c }} animate={{ width: `${frac * 100}%` }} transition={{ duration: 0.6 }} />}
      </span>
    </span>
  );
  return (
    <Stage>
      <Fit w={210} h={70}>
        <div className="absolute inset-0 rounded-[18px] border p-[6px]" style={{ background: tintBg(G, 12), borderColor: tintBg(G, 34) }}>
          <div className="flex items-center gap-[6px]">
            <NookFigure look={control.look} color={control.color} size={24} />
            <span className="leading-tight">
              <span className="block text-[9px] font-semibold" style={{ color: tintText(G) }}>
                {tt("Bilgisayar")}
              </span>
              <span className="block text-[6px] text-label-3">{tt("Kapat, uyut, ekran görüntüsü")}</span>
            </span>
          </div>
          <div className="mt-[5px] grid grid-cols-4 gap-[5px] pl-[3px]">
            {stat(`3 sa ${mins % 60} dk`, tt("Açık"), null)}
            {stat(`%${cpu}`, tt("İşlemci"), cpu / 100, "#3d8bff")}
            {stat(`${mem.toLocaleString("tr-TR")} GB`, tt("Bellek"), mem / 16, "#8f6bff")}
            {stat("390 GB", tt("Disk boş"), 0.6, "#f2a33a")}
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Telefondan açmaya hazırlık

/** Ayarlar › Telefon: kontrol listesi ✗ → Düzelt → Windows izni → ✓; BIOS için anakarta göre tarif */
function WakeSetupDemo() {
  const n = useTick(650);
  const phase = n % 12; // 0-2 eksikler · 3 Düzelt · 4-5 izin penceresi · 6-8 ✓ · 9-11 BIOS tarifi
  const fixed = phase >= 6;
  const rows: { t: string; ok: boolean | null }[] = [
    { t: tt("Kabloyla bağlı"), ok: true },
    { t: fixed ? tt("Hızlı Başlangıç kapalı") : tt("Hızlı Başlangıç açık"), ok: fixed },
    { t: fixed ? tt("Ağ kartı PC'yi uyandırabilir") : tt("Ağ kartının uyandırması kapalı"), ok: fixed },
    { t: tt("BIOS'ta Wake-on-LAN açık olmalı"), ok: null },
  ];
  return (
    <Stage>
      <Fit w={230} h={104}>
        <div className="absolute inset-0 rounded-[10px] border border-white/10 bg-[#16171b] p-[8px]">
          <div className="mb-[5px] flex items-center justify-between">
            <span className="text-[8px] font-medium text-label">{tt("Telefondan PC'yi açma")}</span>
            <motion.span
              className="rounded-full px-[6px] py-[1px] text-[6.5px] font-medium"
              animate={{ scale: phase === 3 ? 0.85 : 1, background: phase === 3 ? tintBg(ACCENT.blue, 40) : "rgb(255 255 255 / 0.06)", color: fixed ? "#7d7d86" : "#ececee" }}
            >
              {fixed ? tt("Windows hazır") : tt("Düzelt")}
            </motion.span>
          </div>
          {rows.map((r) => (
            <div key={r.t + String(r.ok)} className="flex items-center gap-[4px] py-[1.5px] text-[6.5px] text-label-2">
              <Mark ok={r.ok} />
              {r.t}
            </div>
          ))}
          <AnimatePresence>
            {phase >= 9 && (
              <motion.p className="mt-[3px] rounded-[4px] bg-white/[0.06] px-[4px] py-[2px] text-[5.5px] leading-snug text-label-2" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <span className="text-label-3">ASUS PRIME B450M: </span>
                Advanced › APM › Power On By PCI-E: Enabled
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        {/* Windows yönetici izni */}
        <AnimatePresence>
          {(phase === 4 || phase === 5) && (
            <motion.div
              className="absolute left-1/2 top-1/2 w-[120px] -translate-x-1/2 -translate-y-1/2 rounded-[6px] border border-white/15 bg-[#202a3a] p-[6px] shadow-xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="mb-[4px] flex items-center gap-[3px] text-[6.5px] text-label">
                <ShieldCheck size={8} style={{ color: ACCENT.blue }} />
                {tt("Değişiklik yapılsın mı?")}
              </div>
              <motion.span className="block rounded-[3px] py-[2px] text-center text-[6px] font-semibold text-white" style={{ background: ACCENT.blue }} animate={{ scale: phase === 5 ? 0.9 : 1 }}>
                {tt("Evet")}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Evden uzaktayken bağlanma

/** Telefon evden çıkar (Wi-Fi gider) ama bağlantı Tailscale'in şifreli tünelinden sürer; PC'de kontrol listesi ✓ */
function OutsideDemo() {
  const n = useTick(700);
  const phase = n % 10; // 0-3 evde (Wi-Fi) · 4-5 dışarı çıkar · 6-9 Tailscale tüneli
  const away = phase >= 4;
  const tunnel = phase >= 6;
  const B = ACCENT.blue;
  return (
    <Stage>
      <Fit w={290} h={110}>
        {/* Ev */}
        <div className="absolute left-[150px] top-[2px] flex h-[104px] w-[140px] items-start justify-end">
          <span className="absolute left-0 top-[6px] flex items-center gap-[2px] text-[6px] text-label-3">
            <House size={8} /> {tt("Ev")}
          </span>
        </div>
        <motion.div className="absolute top-0" animate={{ left: away ? 0 : 120 }} transition={{ type: "spring", stiffness: 120, damping: 18 }}>
          <Phone>
            <div className="mb-[4px] flex items-center justify-between text-[5px] text-label-3">
              {away ? <Globe size={6} /> : <Wifi size={6} />}
              {tunnel && <ShieldCheck size={6} style={{ color: tintText(B) }} />}
            </div>
            <p className="flex items-center gap-[2px] text-[5.5px] text-label-2">
              <span className="h-[4px] w-[4px] rounded-full" style={{ background: away && !tunnel ? ACCENT.yellow : ACCENT.green }} />
              {away && !tunnel ? tt("Bağlanıyor…") : tt("PC açık")}
            </p>
            <div className="mt-[5px] grid grid-cols-2 gap-[3px]">
              {["#8FE03A", "#2B8CFF", "#FF5C8A", "#9B7BFF"].map((c) => (
                <span key={c} className="h-[10px] rounded-full border" style={{ borderColor: tintBg(c, 45), background: tintBg(c, 14), opacity: away && !tunnel ? 0.35 : 1 }} />
              ))}
            </div>
          </Phone>
        </motion.div>
        {/* Tailscale tüneli */}
        <AnimatePresence>
          {tunnel && (
            <motion.div className="absolute left-[60px] top-[48px] h-[10px] w-[86px] overflow-hidden rounded-full" style={{ background: tintBg(B, 18), border: `1px solid ${tintBg(B, 50)}` }} initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }} exit={{ opacity: 0 }}>
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="absolute top-[3px] h-[3px] w-[8px] rounded-full" style={{ background: B }} animate={{ left: [-10, 90] }} transition={{ duration: 1.1, delay: i * 0.35, repeat: Infinity, ease: "linear" }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <Pc w={130}>
          <div className="p-[6px]">
            <p className="mb-[3px] text-[6.5px] font-medium text-label">{tt("Evden uzaktayken bağlanma")}</p>
            {[tt("Tailscale kurulu"), tt("Tailscale'e giriş yapıldı"), tt("Güvenlik duvarı izin veriyor")].map((t) => (
              <div key={t} className="flex items-center gap-[3px] py-[1px] text-[5.5px] text-label-2">
                <Mark ok />
                {t}
              </div>
            ))}
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Dışarıdan açma

/** Dışarıdaki telefon "PC'yi aç"a basar: paket internetten modeme, modem evdeki ağa yayar, kapalı PC açılır */
function WakeOutsideDemo() {
  const n = useTick(500);
  const phase = n % 14; // 0-2 kapalı · 3 dokun · 4-6 internet · 7-8 modem yayar · 9-13 açık
  const G = "#8FE03A";
  const on = phase >= 9;
  return (
    <Stage>
      <Fit w={300} h={110}>
        <Phone>
          <div className="mb-[4px] flex items-center gap-[2px] text-[5px] text-label-3">
            <Globe size={6} /> 4.5G
          </div>
          <p className="text-[5.5px] leading-tight text-label-3">{on ? tt("Açık") : tt("Ulaşılamıyor")}</p>
          <motion.span
            className="absolute inset-x-[5px] bottom-[8px] flex h-[16px] items-center justify-center gap-[2px] rounded-[5px] text-[6px] font-bold text-black"
            style={{ background: G }}
            animate={{ scale: phase === 3 ? 0.84 : 1, opacity: on ? 0.35 : 1 }}
          >
            <Power size={7} strokeWidth={3} />
            {tt("PC'yi aç")}
          </motion.span>
        </Phone>
        {/* İnternet: telefondan modeme */}
        <span className="absolute left-[78px] top-[18px] flex items-center gap-[2px] text-[6px] text-label-3">
          <Globe size={8} /> {tt("İnternet")}
        </span>
        <motion.span
          className="absolute top-[50px] h-[8px] w-[8px] rounded-full"
          style={{ background: G, boxShadow: `0 0 8px ${G}` }}
          animate={phase >= 4 && phase <= 6 ? { left: [64, 150], opacity: [0, 1, 1] } : { left: 64, opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
        />
        {/* Modem */}
        <div className="absolute left-[150px] top-[38px] flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-white/15 bg-[#16171b]" style={{ color: phase >= 7 && phase <= 8 ? G : "#7d7d86" }}>
          <Router size={15} />
        </div>
        <span className="absolute left-[146px] top-[72px] text-[5.5px] text-label-3">{tt("Modem")}</span>
        {/* Modem evdeki ağa yayar */}
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute left-[176px] top-[42px] h-[22px] w-[22px] rounded-full border-2"
            style={{ borderColor: G }}
            animate={phase >= 7 && phase <= 8 ? { scale: [0.5, 1.8], opacity: [0.9, 0] } : { opacity: 0 }}
            transition={{ duration: 0.9, delay: i * 0.25, ease: "easeOut" }}
          />
        ))}
        <Pc w={96} dark>
          <motion.div className="absolute inset-x-[5px] bottom-[5px] top-[14px] rounded-[4px]" style={{ background: "linear-gradient(120deg, #24324f, #2f5f8f 55%, #3fbfa5)" }} animate={{ opacity: on ? 1 : 0 }} transition={{ duration: 0.6 }} />
          <motion.div className="absolute left-1/2 top-[3px] h-[9px] w-[30px] -translate-x-1/2 rounded-full bg-black" animate={{ opacity: on ? 1 : 0 }} />
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- VPN açıkken de modemi bulma (0.2.56)

/** Ayarlar satırı: VPN açık olsa da Nook modeme bağlı kartı seçer; önce "Modem aranıyor…", sonra anahtar açılır ve modem ayarlanır */
function ModemFindDemo() {
  const n = useTick(500);
  const phase = n % 12; // 0-2 aranıyor · 3-4 bulundu, anahtar kapalı · 5 dokun · 6-11 ayarlandı
  const on = phase >= 6;
  const B = ACCENT.blue;
  return (
    <Stage>
      <Fit w={230} h={104}>
        <div className="absolute inset-0 rounded-[10px] border border-white/10 bg-[#14161c] px-[10px] py-[8px]">
          <div className="flex items-center justify-between">
            <span className="text-[8px] text-label">{tt("Telefondan PC'yi açma")}</span>
            <span className="flex items-center gap-[3px] rounded-full px-[5px] py-[1px] text-[6.5px]" style={{ background: tintBg(ACCENT.purple, 20), color: tintText(ACCENT.purple) }}>
              <ShieldCheck size={7} /> {tt("VPN açık")}
            </span>
          </div>
          <div className="mt-[6px] flex flex-col gap-[4px] text-[7px] text-label-2">
            <span className="flex items-center gap-[4px]">
              <Mark ok /> {tt("Kabloyla bağlı · Realtek PCIe GbE")}
            </span>
            <span className="flex items-center gap-[4px]">
              <Mark ok /> {tt("Ağ kartı PC'yi uyandırabilir")}
            </span>
            <div className="flex items-center gap-[4px]">
              <span className="min-w-0 flex-1 truncate">{tt("Evden uzaktayken de açılabilsin")}</span>
              {phase < 3 ? (
                <motion.span className="text-[6.5px] text-label-3" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}>
                  {tt("Modem aranıyor…")}
                </motion.span>
              ) : (
                <motion.span className="relative h-[11px] w-[19px] rounded-full" animate={{ background: on ? B : "rgba(255,255,255,0.18)", scale: phase === 5 ? 0.85 : 1 }}>
                  <motion.span className="absolute top-[1.5px] h-[8px] w-[8px] rounded-full bg-white" animate={{ left: on ? 9.5 : 1.5 }} />
                </motion.span>
              )}
            </div>
            <AnimatePresence>
              {on && (
                <motion.span initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-[4px]">
                  <Mark ok /> {tt("Modem ayarlandı · ev adresi 88.241.12.7")}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Telefona kurma ve güncelleme

/** PC'deki QR okutulur → Nook Mobil iner ve kurulur; sonra yeni sürüm çıkınca uygulamada "Güncelle" kartı */
function PhoneInstallDemo() {
  const n = useTick(600);
  const phase = n % 14; // 0-1 QR · 2-3 okut · 4-6 iniyor · 7-8 kuruldu · 9-13 Güncelle kartı
  const G = ACCENT.green;
  const downloading = phase >= 4 && phase <= 6;
  return (
    <Stage>
      <Fit w={290} h={110}>
        <Phone>
          {phase <= 3 && (
            <div className="relative mx-auto mt-[14px] h-[44px] w-[44px] rounded-[5px] border border-white/25">
              <motion.span className="absolute inset-x-[2px] h-[1.5px]" style={{ background: G }} animate={{ top: [4, 38, 4] }} transition={{ duration: 1.2, repeat: Infinity }} />
            </div>
          )}
          {downloading && (
            <div className="mt-[30px] px-[2px]">
              <p className="mb-[3px] flex items-center gap-[2px] text-[5px] text-label-2">
                <Download size={6} /> NookMobil.apk
              </p>
              <div className="h-[3px] overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full" style={{ background: G }} initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.7 }} />
              </div>
            </div>
          )}
          {phase >= 7 && (
            <motion.div className="flex flex-col items-center pt-[8px]" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
              <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={22} expression={phase >= 9 ? "idle" : "happy"} />
              <p className="mt-[2px] text-[5px] text-label-2">{tt("PC açık")}</p>
            </motion.div>
          )}
          <AnimatePresence>
            {phase >= 9 && (
              <motion.div
                className="absolute inset-x-[4px] bottom-[5px] flex items-center gap-[2px] rounded-[5px] p-[3px]"
                style={{ background: tintBg(G, 16), border: `1px solid ${tintBg(G, 40)}` }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <span className="min-w-0 flex-1 truncate text-[4.5px] font-semibold" style={{ color: tintText(G) }}>
                  Nook Mobil 0.2.56
                </span>
                <motion.span className="rounded-[3px] px-[3px] py-[1px] text-[4.5px] font-bold text-black" style={{ background: G }} animate={{ scale: phase === 12 ? 0.85 : 1 }}>
                  {tt("Güncelle")}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </Phone>
        <Pc w={140}>
          <div className="flex items-center gap-[6px] p-[7px]">
            <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[5px] bg-white text-black">
              <QrCode size={42} strokeWidth={1.4} />
            </span>
            <p className="text-[6px] leading-snug text-label-2">{tt("Telefona Nook Mobil'i kur (Android)")}</p>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Telefonda tanıtım

const TOUR = [
  { nook: null, color: "#3ccf6e", t: "Merhaba, ben Nook" },
  { nook: "control", color: "#8FE03A", t: "Bilgisayarın avucunda" },
  { nook: "media", color: "#FF5C8A", t: "Müziğin kumandası" },
  { nook: "argus", color: "#2B8CFF", t: "Ne izlesem? Argus bilir" },
  { nook: "hum", color: "#9B7BFF", t: "Çalan şarkıyı bulurum" },
] as const;

/** Uygulama ilk açılınca sayfa sayfa tanıtım: her bölümün Nook'u kendi renginde, kaydırınca sıradaki */
function PhoneTourDemo() {
  const n = useTick(1300);
  const i = n % TOUR.length;
  const s = TOUR[i];
  const face = useNook((st) => st.settings);
  const chip = s.nook ? CHIP_NOOKS[s.nook] : null;
  const look = chip?.look ?? normalizeLook(face.look);
  const color = chip?.color ?? normalizeColor(face.faceColor);
  return (
    <Stage>
      <Fit w={120} h={112}>
        <div className="absolute left-1/2 top-0 h-[112px] w-[64px] -translate-x-1/2 overflow-hidden rounded-[12px] border border-white/20 bg-black p-[5px]">
          <AnimatePresence mode="wait">
            <motion.div key={i} className="flex flex-col items-center pt-[10px]" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <span className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full" style={{ background: `radial-gradient(circle, ${tintBg(s.color, 35)} 0%, transparent 70%)` }}>
                <NookFigure look={look} color={color} size={26} />
              </span>
              <p className="mt-[5px] px-[2px] text-center font-round text-[5.5px] font-extrabold leading-tight" style={{ color: tintText(s.color) }}>
                {tt(s.t)}
              </p>
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-x-0 bottom-[16px] flex justify-center gap-[2px]">
            {TOUR.map((_, k) => (
              <motion.span key={k} className="h-[2px] rounded-full" animate={{ width: k === i ? 7 : 2, background: k === i ? s.color : "rgba(255,255,255,0.2)" }} />
            ))}
          </div>
          <span className="absolute inset-x-[5px] bottom-[5px] flex h-[8px] items-center justify-center gap-[1px] rounded-[3px] text-[4.5px] font-bold text-black" style={{ background: s.color }}>
            {tt("İleri")} <ArrowRight size={5} strokeWidth={3} />
          </span>
        </div>
      </Fit>
    </Stage>
  );
}

export const DEMOS6 = {
  phonehum: PhoneHumDemo,
  phonestats: PhoneStatsDemo,
  wakesetup: WakeSetupDemo,
  outside: OutsideDemo,
  wakeoutside: WakeOutsideDemo,
  phoneinstall: PhoneInstallDemo,
  phonetour: PhoneTourDemo,
  modemfind: ModemFindDemo,
};

/** 0.2.57 görselleri (Demos7) aynı sahne parçalarını kullanır */
export { useTick, Stage, Fit, Phone, Pc, Mark };
