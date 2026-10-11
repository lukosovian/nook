/**
 * 0.2.57 Nook Mobil yama notunun görselleri: sağlam bağlantı ve kendiliğinden Tailscale, telefon
 * bildirimleri PC'de, PC kapalıyken Not/Pano/Hum, ekran görüntüsünü yakınlaştırıp kaydetme, Ekranı aç,
 * telefonda uzaktan açma rehberi, uygulama içi güncelleme, başka uygulamadan PC'ye gönderme.
 * Hepsi kendi kendine döner.
 */
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Download, FileImage, Lock, Monitor, MonitorOff, Share2, ShieldCheck, Upload } from "lucide-react";
import { CHIP_NOOKS, DEFAULT_LOOK } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Mark, Pc, Phone, Stage, useTick } from "./Demos6";

const Dot = ({ c }: { c: string }) => <span className="h-[4px] w-[4px] shrink-0 rounded-full" style={{ background: c }} />;

// ---------------------------------------------------------------- Bağlantı

/** Evden çıkınca: telefon "Tailscale açılıyor" der, kendisi açar, PC'ye bağlanır; Nook'tan çıkınca kapanır */
function PhoneTunnelDemo() {
  const n = useTick(600);
  const phase = n % 12; // 0-2 ev Wi-Fi · 3-5 dışarı, Tailscale açılıyor · 6-9 bağlı · 10-11 çıkınca kapanır
  const B = ACCENT.blue;
  const away = phase >= 3;
  const ts = phase >= 6 && phase <= 9;
  return (
    <Stage>
      <Fit w={260} h={110}>
        <Phone>
          <div className="flex items-center justify-between text-[4.5px] text-label-3">
            <span>{away ? "4G" : "Wi-Fi"}</span>
            <AnimatePresence>
              {ts && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-[1px]" style={{ color: tintText(B) }}>
                  <ShieldCheck size={5} /> VPN
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="mt-[10px] flex flex-col items-center">
            <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={24} expression={phase >= 3 && phase <= 5 ? "suspicious" : "idle"} />
            <p className="mt-[4px] flex items-center gap-[2px] text-[5px] text-label-2">
              <Dot c={phase >= 3 && phase <= 5 ? "#ffd23f" : phase >= 10 ? "#8a8a93" : "#3ccf6e"} />
              {phase < 3 ? tt("PC açık · ev ağı") : phase <= 5 ? tt("Tailscale açılıyor…") : phase <= 9 ? tt("PC açık · Tailscale") : tt("Tailscale kapandı")}
            </p>
          </div>
          {phase >= 10 && <p className="mt-[8px] text-center text-[4.5px] leading-tight text-label-3">{tt("Nook'tan çıktın")}</p>}
        </Phone>
        <Pc w={150}>
          <div className="flex h-full flex-col items-center justify-center gap-[4px]">
            <span className="flex items-center gap-[3px] text-[7px] text-label-2">
              <ShieldCheck size={8} style={{ color: tintText(B) }} /> Tailscale
            </span>
            <span className="rounded-full px-[6px] py-[1.5px] text-[6.5px] font-semibold" style={{ background: tintBg(ACCENT.green, 20), color: tintText(ACCENT.green) }}>
              {tt("Hep açık · Nook açık tutar")}
            </span>
          </div>
        </Pc>
        <motion.div
          className="absolute left-[64px] top-[48px] h-[1.5px] rounded-full"
          style={{ background: ts ? B : "#3ccf6e" }}
          animate={{ width: phase >= 10 || (phase >= 3 && phase <= 5) ? 0 : 40, opacity: phase >= 10 ? 0 : 1 }}
        />
      </Fit>
    </Stage>
  );
}

/** PC'ye ulaşılamayınca nedenini söyler ve tek düğme verir */
function PhoneDiagnoseDemo() {
  const n = useTick(1400);
  const cases = [
    { t: tt("PC kapalı ya da uykuda"), d: tt("Aynı Wi-Fi'desin ama PC yanıt vermiyor."), b: tt("PC'yi aç"), c: "#8FE03A" },
    { t: tt("Telefonda Tailscale yok"), d: tt("Evden uzakta bağlanmak için kur."), b: tt("Play Store'da aç"), c: ACCENT.blue },
    { t: tt("Tailscale açılamadı"), d: tt("Bir kez Connect'e bas, sonrası kendiliğinden."), b: tt("Tailscale'i aç"), c: ACCENT.blue },
  ];
  const c = cases[n % cases.length];
  return (
    <Stage>
      <Fit w={200} h={86}>
        <AnimatePresence mode="wait">
          <motion.div
            key={n % cases.length}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute inset-0 rounded-[14px] border border-white/10 bg-[#16181f] p-[9px]"
          >
            <p className="text-[9px] font-bold text-label">{c.t}</p>
            <p className="mt-[2px] text-[7px] text-label-2">{c.d}</p>
            <span className="mt-[8px] flex h-[20px] items-center justify-center rounded-[8px] text-[7.5px] font-bold text-black" style={{ background: c.c }}>
              {c.b}
            </span>
          </motion.div>
        </AnimatePresence>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Bildirimler

/** Telefona WhatsApp mesajı gelir → PC'de adada kart olarak çıkar */
function PhoneNotifyDemo() {
  const n = useTick(500);
  const phase = n % 12; // 0-1 sessiz · 2-4 telefonda · 5-10 PC'de kart · 11 kaybolur
  const G = "#25D366";
  const onPhone = phase >= 2 && phase <= 10;
  const onPc = phase >= 5 && phase <= 10;
  const notify = CHIP_NOOKS.notify;
  const icon = <span className="flex h-[9px] w-[9px] shrink-0 items-center justify-center rounded-[3px] text-[5px] font-black text-white" style={{ background: G }}>W</span>;
  return (
    <Stage>
      <Fit w={290} h={110}>
        <Phone>
          <AnimatePresence>
            {onPhone && (
              <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="rounded-[5px] bg-white/10 p-[3px]">
                <div className="flex items-center gap-[2px]">
                  {icon}
                  <span className="text-[4.5px] text-label-3">WhatsApp</span>
                </div>
                <p className="mt-[1px] text-[5px] font-semibold text-label">Ayşe</p>
                <p className="text-[4.5px] text-label-2">{tt("Akşam geliyor musun?")}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Phone>
        <Pc w={190}>
          <AnimatePresence>
            {onPc && (
              <motion.div
                initial={{ y: -16, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -16, opacity: 0 }}
                className="mx-auto mt-[6px] flex w-[150px] items-center gap-[5px] rounded-[12px] bg-black px-[6px] py-[4px]"
              >
                <NookFigure look={notify.look} color={notify.color} size={16} expression="surprised" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="flex items-center gap-[3px] text-[7px] font-semibold text-label">
                    {icon} Ayşe
                  </span>
                  <span className="block truncate text-[6px] text-label-2">{tt("Akşam geliyor musun?")}</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute inset-x-[8px] bottom-[6px] flex gap-[3px]">
            {["Windows", tt("Telefon · 1"), "Nook"].map((t, i) => (
              <span key={t} className="rounded-full px-[5px] py-[1px] text-[5.5px]" style={i === 1 && onPc ? { background: tintBg(ACCENT.purple, 30), color: tintText(ACCENT.purple) } : { color: "#8a8a93" }}>
                {t}
              </span>
            ))}
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- PC kapalıyken

/** PC kapalıyken telefonda not yazılır; PC açılınca nota düşer */
function PhoneOfflineDemo() {
  const n = useTick(450);
  const phase = n % 16; // 0-6 PC kapalı, yazılıyor · 7-8 PC açılıyor · 9-15 not PC'de
  const O = "#FF6A3D";
  const text = tt("süt, ekmek, pil");
  const typed = text.slice(0, Math.min(text.length, Math.max(0, phase - 1) * 3));
  const pcOn = phase >= 8;
  return (
    <Stage>
      <Fit w={290} h={110}>
        <Phone>
          <p className="text-[5.5px] font-bold" style={{ color: tintText(O) }}>
            {tt("Not")}
          </p>
          <p className="mt-[2px] text-[4px] leading-tight text-label-3">{pcOn ? tt("Kaydedildi") : tt("PC kapalı · telefonda saklandı")}</p>
          <div className="mt-[3px] h-[50px] rounded-[4px] p-[3px] text-[5px] text-label" style={{ background: tintBg(O, 10), border: `1px solid ${tintBg(O, 25)}` }}>
            {typed}
            {phase <= 6 && <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>|</motion.span>}
          </div>
        </Phone>
        <Pc w={170} dark={!pcOn}>
          {pcOn ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-[8px]">
              <span className="rounded-full px-[6px] py-[1px] text-[6.5px] font-semibold text-black" style={{ background: O }}>
                {tt("Not 1")}
              </span>
              <motion.p className="mt-[6px] text-[8px] text-label" initial={{ opacity: 0, y: 4 }} animate={{ opacity: phase >= 10 ? 1 : 0, y: phase >= 10 ? 0 : 4 }}>
                {text}
              </motion.p>
            </motion.div>
          ) : (
            <p className="flex h-full items-center justify-center text-[7px] text-label-3">{tt("PC kapalı")}</p>
          )}
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Ekran görüntüsü

/** Ekran görüntüsü iki parmakla büyür, sonra "Telefona kaydet" */
function PhoneShotDemo() {
  const n = useTick(500);
  const phase = n % 12; // 0-1 tam · 2-5 büyür · 6-8 kaydırılır · 9-11 kaydedildi
  const s = phase < 2 ? 1 : phase < 6 ? 1 + (phase - 1) * 0.45 : 2.8;
  const x = phase >= 6 && phase <= 8 ? -(phase - 5) * 10 : phase > 8 ? -30 : 0;
  return (
    <Stage>
      <Fit w={150} h={110}>
        <Phone left={46}>
          <div className="relative h-[66px] overflow-hidden rounded-[3px] bg-[#1b2030]">
            <motion.div className="absolute inset-0 origin-center p-[3px]" animate={{ scale: s, x }} transition={{ duration: 0.45 }}>
              <div className="h-[5px] w-[30px] rounded-[1px] bg-[#3d8bff]/60" />
              <div className="mt-[2px] grid grid-cols-3 gap-[2px]">
                {Array.from({ length: 9 }, (_, i) => (
                  <span key={i} className="h-[8px] rounded-[1px]" style={{ background: ["#ff5c8a55", "#8fe03a55", "#ffd23f55"][i % 3] }} />
                ))}
              </div>
              <p className="mt-[2px] text-[3px] text-label-2">Nook · 0.2.57</p>
            </motion.div>
            {phase >= 2 && phase <= 5 &&
              [-1, 1].map((d) => (
                <motion.span key={d} className="absolute top-[30px] h-[7px] w-[7px] rounded-full border border-white/70 bg-white/20" animate={{ left: 22 + d * (4 + (phase - 1) * 4) }} />
              ))}
          </div>
          <div className="mt-[3px] grid grid-cols-3 gap-[2px]">
            {[Download, Share2, Upload].map((I, i) => (
              <span key={i} className="flex h-[12px] items-center justify-center rounded-[3px]" style={{ background: i === 0 && phase >= 9 ? tintBg(ACCENT.green, 40) : "rgb(255 255 255 / 0.08)" }}>
                <I size={6} className="text-label-2" />
              </span>
            ))}
          </div>
          {phase >= 9 && <p className="mt-[3px] text-center text-[4px] text-label-2">{tt("Galeriye kaydedildi")}</p>}
        </Phone>
      </Fit>
    </Stage>
  );
}

/** Ekranı kapat'a basınca düğme "Ekranı aç" olur; basınca PC'nin ekranı geri gelir */
function PhoneScreenDemo() {
  const n = useTick(900);
  const off = n % 4 >= 1 && n % 4 <= 2;
  const V = "#8f6bff";
  const Icon = off ? Monitor : MonitorOff;
  return (
    <Stage>
      <Fit w={260} h={100}>
        <div className="absolute left-0 top-[24px] grid w-[96px] grid-cols-1 gap-[5px]">
          <div className="flex items-center gap-[5px] rounded-[10px] bg-[#16181f] p-[5px] opacity-60">
            <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full" style={{ background: "#ffd23f" }}>
              <Lock size={7} className="text-black/75" />
            </span>
            <span className="text-[7px] text-label">{tt("Kilitle")}</span>
          </div>
          <motion.div className="flex items-center gap-[5px] rounded-[10px] bg-[#16181f] p-[5px]" animate={{ scale: n % 4 === 0 || n % 4 === 3 ? [1, 0.92, 1] : 1 }}>
            <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full" style={{ background: V }}>
              <Icon size={7} className="text-black/75" />
            </span>
            <span className="text-[7px] font-medium text-label">{off ? tt("Ekranı aç") : tt("Ekranı kapat")}</span>
          </motion.div>
        </div>
        <Pc w={140} dark={off}>
          <motion.div className="flex h-full items-center justify-center" animate={{ opacity: off ? 0 : 1 }}>
            <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={30} />
          </motion.div>
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Uzaktan açma rehberi

/** PC kapalıyken telefonda kontrol listesi; BIOS satırı açılınca anakarta özel adımlar */
function PhoneGuideDemo() {
  const n = useTick(700);
  const open = n % 8 >= 2;
  return (
    <Stage>
      <Fit w={230} h={112}>
        <div className="absolute inset-0 rounded-[12px] border border-white/10 bg-[#16181f] p-[7px] text-[6.5px] text-label-2">
          <p className="text-[5.5px] uppercase tracking-[0.12em] text-label-3">{tt("Telefondan PC'yi açma")}</p>
          <div className="mt-[3px] flex flex-col gap-[3px]">
            <span className="flex items-center gap-[4px]">
              <Mark ok /> {tt("PC kabloyla bağlı")}
            </span>
            <span className="flex items-center gap-[4px]">
              <Mark ok /> {tt("TP-Link EX530v ayarlandı")}
            </span>
            <span className="flex items-center gap-[4px] text-label">
              <Mark ok={null} /> {tt("BIOS'ta Wake-on-LAN açık olmalı")}
              <ChevronDown size={7} className={`ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
            </span>
          </div>
          <AnimatePresence>
            {open && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-[3px] rounded-[6px] bg-white/5 px-[5px] py-[3px] text-[5.5px] leading-snug">
                  <p className="text-label-3">ASUS PRIME B450M-K II</p>
                  <p>1. {tt("Açılışta Del'e bas, F7 ile Advanced Mode'a geç.")}</p>
                  <p>2. {tt("Advanced › APM › “Power On By PCI-E”: Enabled.")}</p>
                  <p>3. {tt("“ErP Ready”: Disabled · F10 ile kaydet.")}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <p className="absolute bottom-[5px] left-[7px] text-[5px] text-label-3">{tt("PC kapalı: 2 sa önce yapılan kontrol")}</p>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Güncelleme

/** "Güncelle" → uygulamanın içinde iner → Android'in kurulum penceresi */
function PhoneUpdateDemo() {
  const n = useTick(450);
  const phase = n % 14; // 0-1 kart · 2 dokun · 3-7 iniyor · 8-12 kurulum penceresi · 13 bitti
  const G = ACCENT.green;
  const pct = phase < 3 ? 0 : Math.min(100, (phase - 2) * 22);
  return (
    <Stage>
      <Fit w={150} h={110}>
        <Phone left={46}>
          <div className="mt-[4px] rounded-[5px] p-[3px]" style={{ background: tintBg(G, 12), border: `1px solid ${tintBg(G, 30)}` }}>
            <p className="text-[5px] font-bold" style={{ color: tintText(G) }}>
              Nook Mobil 0.2.57
            </p>
            <p className="text-[4px] text-label-3">{phase >= 3 && phase <= 7 ? tt("İndiriliyor… %{0}", pct) : tt("Uygulamanın içinde iner")}</p>
            <div className="mt-[2px] h-[2px] overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full" style={{ background: G }} animate={{ width: `${phase >= 8 ? 100 : pct}%` }} />
            </div>
          </div>
          <AnimatePresence>
            {phase >= 8 && phase <= 12 && (
              <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-[4px] bottom-[5px] rounded-[5px] bg-[#2a2d36] p-[4px]">
                <div className="flex items-center gap-[2px]">
                  <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={9} />
                  <span className="text-[4.5px] font-semibold text-label">{tt("Bu uygulama güncellensin mi?")}</span>
                </div>
                <span className="ml-auto mt-[3px] block w-fit rounded-[3px] px-[4px] py-[1px] text-[4.5px] font-bold" style={{ color: tintText(G), background: phase >= 11 ? tintBg(G, 30) : "transparent" }}>
                  {tt("Güncelle")}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          {phase === 13 && (
            <p className="mt-[10px] flex items-center justify-center gap-[2px] text-[5px] text-label-2">
              <Check size={6} style={{ color: G }} /> {tt("Güncellendi")}
            </p>
          )}
        </Phone>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Paylaş › Nook

/** Galeride fotoğraf → Paylaş → Nook → PC'de İndirilenler › Nook Mobil */
function PhoneShareDemo() {
  const n = useTick(500);
  const phase = n % 14; // 0-1 foto · 2-4 paylaş menüsü · 5-8 gönderiliyor · 9-13 PC'de
  const V = ACCENT.purple;
  return (
    <Stage>
      <Fit w={290} h={110}>
        <Phone>
          <div className="h-[48px] rounded-[3px]" style={{ background: "linear-gradient(135deg, #ff9a5a, #8f6bff)" }} />
          <AnimatePresence>
            {phase >= 2 && phase <= 4 && (
              <motion.div initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: 40, opacity: 0 }} className="absolute inset-x-[4px] bottom-[5px] rounded-[5px] bg-[#2a2d36] p-[3px]">
                <p className="text-[4.5px] text-label-3">{tt("Paylaş")}</p>
                <div className="mt-[2px] flex items-end gap-[3px]">
                  {["#25D366", "#E1306C"].map((c) => (
                    <span key={c} className="h-[10px] w-[10px] rounded-[3px]" style={{ background: c }} />
                  ))}
                  <motion.span className="flex flex-col items-center" animate={{ scale: phase === 4 ? 1.2 : 1 }}>
                    <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={11} />
                  </motion.span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {phase >= 5 && phase <= 8 && (
            <div className="mt-[8px]">
              <p className="text-[4.5px] text-label-2">{tt("PC'ye gönderiliyor…")}</p>
              <div className="mt-[2px] h-[2px] overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full" style={{ background: V }} initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1.8 }} />
              </div>
            </div>
          )}
        </Phone>
        <Pc w={170}>
          <div className="p-[7px]">
            <p className="text-[6px] text-label-3">{tt("İndirilenler › Nook Mobil")}</p>
            <AnimatePresence>
              {phase >= 9 && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mt-[6px] flex items-center gap-[4px]">
                  <FileImage size={14} style={{ color: tintText(V) }} />
                  <span className="text-[7px] text-label">IMG_2041.jpg</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

export const DEMOS7 = {
  phonetunnel: PhoneTunnelDemo,
  phonediagnose: PhoneDiagnoseDemo,
  phonenotify: PhoneNotifyDemo,
  phoneoffline: PhoneOfflineDemo,
  phoneshot: PhoneShotDemo,
  phonescreen: PhoneScreenDemo,
  phoneguide: PhoneGuideDemo,
  phoneupdate: PhoneUpdateDemo,
  phoneshare: PhoneShareDemo,
};
