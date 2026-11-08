/**
 * 0.3.8 yama notu demoları (üçüncü bölüm): büyüyen Studio, küçük ekrana sığan tanıtım, net yazı ve
 * daha az hareket, internetsiz hava durumu, adım adım telefon eşleştirme, yarıda kalan güncelleme,
 * acele etmeyen günün özeti, görüntülü konuşma, ilaç alarmı, kısa tanıtım, Gemini anahtarı,
 * düz Nook'lar ve Türkçe kurulum.
 */
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, CloudSun, Download, KeyRound, Pill, RefreshCw, Smartphone, Video, WifiOff, X } from "lucide-react";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

/** Ayar anahtarı */
const Switch = ({ on, color = ACCENT.blue }: { on: boolean; color?: string }) => (
  <motion.span animate={{ background: on ? color : "rgba(255,255,255,.18)" }} className="relative h-[9px] w-[16px] shrink-0 rounded-full">
    <motion.span animate={{ x: on ? 8 : 1 }} className="absolute top-[1px] h-[7px] w-[7px] rounded-full bg-white" />
  </motion.span>
);

/** Küçük ekran: altta görev çubuğu */
const Screen = ({ children, w = 200, h = 104 }: { children: React.ReactNode; w?: number; h?: number }) => (
  <div className="absolute left-1/2 top-[4px] -translate-x-1/2 overflow-hidden rounded-[6px] border border-white/15 bg-[#1b2030]" style={{ width: w, height: h }}>
    {children}
    <div className="absolute inset-x-0 bottom-0 flex h-[9px] items-center justify-center gap-[3px] bg-black/70">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="h-[4px] w-[4px] rounded-[1px] bg-white/40" />
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------- Studio büyür

/** Arayüz boyutu %100 → %150: Studio'nun yazıları büyür, pencere görev çubuğunun üstünde kalır */
function StudioZoomDemo() {
  const n = useTick(1400);
  const big = n % 2 === 1;
  return (
    <Stage>
      <Fit w={220} h={112}>
        <Screen w={200} h={104}>
          <motion.div
            className="absolute left-1/2 top-[5px] -translate-x-1/2 overflow-hidden rounded-[5px] border border-white/15 bg-[#0e0e10]"
            animate={{ width: big ? 190 : 150, height: big ? 88 : 70 }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
          >
            <div className="flex h-[9px] items-center gap-[3px] border-b border-white/10 px-[4px]">
              <span className="text-[5px] font-extrabold text-label">Nook Studio</span>
            </div>
            <div className="flex h-full">
              <div className="w-[34px] shrink-0 space-y-[3px] border-r border-white/10 p-[3px]">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="block h-[4px] rounded-full bg-white/15" />
                ))}
              </div>
              <motion.div className="p-[5px]" animate={{ fontSize: big ? 9 : 6 }}>
                <p className="font-bold leading-tight text-label">{tt("Ayarlar")}</p>
                <p className="leading-tight text-label-2">{tt("Arayüz boyutu")}</p>
                <motion.p className="mt-[2px] font-bold leading-tight" style={{ color: tintText(ACCENT.purple) }}>
                  {big ? "%150" : "%100"}
                </motion.p>
              </motion.div>
            </div>
          </motion.div>
        </Screen>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Tanıtım küçük ekrana sığar

/** %150'de tanıtım ekrandan büyük: kesilmez, sığacak kadar küçülür; "İleri" görünür kalır */
function TourFitDemo() {
  const n = useTick(1500);
  const fit = n % 2 === 1;
  return (
    <Stage>
      <Fit w={220} h={112}>
        <Screen w={200} h={104}>
          <motion.div
            className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-[8px] border border-t-0 border-white/15 bg-black"
            animate={{ width: fit ? 184 : 230, height: fit ? 88 : 128 }}
            transition={{ type: "spring", stiffness: 180, damping: 24 }}
          >
            <p className="px-[8px] pt-[8px] text-[7px] font-semibold text-label">{tt("Merhaba, ben Nook")}</p>
            <div className="mx-[8px] mt-[5px] h-[30px] rounded-[5px] bg-white/[0.05]" />
            <motion.span
              className="absolute bottom-[6px] right-[8px] flex items-center gap-[2px] rounded-full border px-[6px] py-[2px] text-[6px] font-semibold"
              style={{ background: tintBg(ACCENT.teal, 22), borderColor: tintBg(ACCENT.teal, 50), color: tintText(ACCENT.teal) }}
            >
              {tt("İleri")} <ArrowRight size={6} />
            </motion.span>
          </motion.div>
        </Screen>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Net yazı, daha az hareket

/** "Net yazı" açılınca soluk gri yazılar açılır; "Daha az hareket" açılınca kayan Nook durur */
function ClearTextDemo() {
  const n = useTick(1100);
  const phase = n % 6; // 0-1 soluk · 2-3 net yazı · 4-5 daha az hareket
  const clear = phase >= 2;
  const calm = phase >= 4;
  return (
    <Stage>
      <Fit w={220} h={96}>
        <div className="absolute inset-x-[14px] top-[8px] rounded-[10px] border border-white/10 bg-[#161618] p-[8px]">
          <div className="flex items-center gap-[6px]">
            <motion.span animate={calm ? { x: 0 } : { x: [0, 10, 0] }} transition={calm ? { duration: 0.2 } : { duration: 1.4, repeat: Infinity }}>
              <MiniNook color={ACCENT.teal} size={20} />
            </motion.span>
            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-semibold text-label">{tt("Su iç")}</p>
              <motion.p animate={{ color: clear ? "#c9c9cf" : "#5f5f66" }} className="text-[7px]">
                {tt("Bugün 3 bardak · sıradaki 14:00")}
              </motion.p>
            </div>
          </div>
          <div className="mt-[7px] space-y-[4px]">
            <p className="flex items-center justify-between text-[7px] text-label">
              {tt("Net yazı")} <Switch on={clear} color={ACCENT.yellow} />
            </p>
            <p className="flex items-center justify-between text-[7px] text-label">
              {tt("Daha az hareket")} <Switch on={calm} color={ACCENT.teal} />
            </p>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- İnternetsiz hava durumu

/** İnternet yok: hava "son 08:10" diye görünür; bağlantı gelince hemen tazelenir */
function WeatherOfflineDemo() {
  const n = useTick(1300);
  const online = n % 4 >= 2;
  return (
    <Stage>
      <Fit w={220} h={80}>
        <div className="absolute inset-x-[20px] top-[12px] flex items-center justify-end gap-[5px] rounded-[14px] bg-black px-[10px] py-[7px]">
          <AnimatePresence mode="wait">
            {!online ? (
              <motion.span key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mr-auto flex items-center gap-[3px] text-[7px]" style={{ color: tintText(ACCENT.red) }}>
                <WifiOff size={8} /> {tt("İnternet yok")}
              </motion.span>
            ) : (
              <motion.span key="on" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mr-auto text-[7px] text-label-2">
                {tt("Bağlandı, tazelendi")}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="flex items-center gap-[3px] rounded-full border border-white/[0.07] bg-white/[0.04] px-[6px] py-[2px] text-[7px] tabular-nums">
            <CloudSun size={8} style={{ color: tintText(ACCENT.blue) }} />
            <span className="text-label-2">{online ? "Ankara" : tt("son {0}", "08:10")}</span>
            <motion.span animate={{ color: online ? "#ececee" : "#9a9aa2" }} className="font-semibold">
              {online ? "14°" : "9°"}
            </motion.span>
          </span>
        </div>
        <p className="absolute inset-x-[20px] top-[48px] text-center text-[6.5px] text-label-3">
          {tt("Şehir: Otomatik · İnternet bağlantından tahmin edildi: Ankara")}
        </p>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Telefon eşleştirme adım adım

/** 1. İndirme kodu · 2. Eşleştirme kodu; kod telefon bağlanana kadar durur, sonra kendiliğinden gizlenir */
function PhoneStepsDemo() {
  const n = useTick(800);
  const phase = n % 12; // 0-1 adımlar · 2-7 kod görünür · 8-11 bağlandı
  const code = phase >= 2 && phase <= 7;
  const paired = phase >= 8;
  return (
    <Stage>
      <Fit w={230} h={104}>
        <div className="absolute inset-x-[10px] top-[6px] rounded-[10px] border border-white/10 bg-[#161618] p-[7px]">
          <p className="flex items-center gap-[4px] text-[7px] font-bold text-label">
            <motion.span animate={{ background: paired ? ACCENT.green : ACCENT.yellow }} className="h-[5px] w-[5px] rounded-full" />
            {paired ? tt("Telefon Bağlı (Canlı)") : tt("Telefon bekleniyor")}
          </p>
          <p className="mt-[5px] flex items-center justify-between text-[6.5px] text-label">
            {tt("1. Nook Mobil'i telefona indir")}
            <span className="rounded-full bg-white/10 px-[5px] py-[1px] text-[5.5px]">{tt("İndirme kodu")}</span>
          </p>
          <p className="mt-[4px] flex items-center justify-between text-[6.5px] text-label">
            {tt("2. Nook Mobil'i açıp bu PC'yle eşleştir")}
            <motion.span animate={{ scale: phase === 2 ? 0.85 : 1 }} className="rounded-full px-[5px] py-[1px] text-[5.5px]" style={{ background: tintBg(ACCENT.blue, 24), color: tintText(ACCENT.blue) }}>
              {code ? tt("Gizle") : tt("Eşleştirme kodu")}
            </motion.span>
          </p>
          <AnimatePresence>
            {code && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 34 }} exit={{ opacity: 0, height: 0 }} className="mt-[4px] flex items-center gap-[5px] overflow-hidden">
                <span className="grid h-[30px] w-[30px] shrink-0 grid-cols-4 gap-[1px] rounded-[3px] bg-white p-[2px]">
                  {Array.from({ length: 16 }, (_, i) => (
                    <span key={i} className={(i * 7) % 3 ? "bg-black" : "bg-white"} />
                  ))}
                </span>
                <span className="text-[5.5px] leading-snug text-label-2">{tt("Telefon bağlanınca kod kendiliğinden gizlenir.")}</span>
                <Smartphone size={14} className="ml-auto shrink-0 text-label-2" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Güncelleme yarıda kalırsa

/** İndirme durur: neden yazar, "Yeniden dene" baştan temiz başlar ve biter */
function UpdateRetryDemo() {
  const n = useTick(500);
  const phase = n % 20; // 0-5 iniyor · 6-11 durdu · 12 yeniden dene · 13-19 iner, biter
  const first = Math.min(phase, 5) * 9;
  const stalled = phase >= 6 && phase <= 12;
  const second = phase >= 13 ? Math.min(100, (phase - 13) * 18) : 0;
  const pct = phase >= 13 ? second : first;
  return (
    <Stage>
      <Fit w={220} h={86}>
        <div className="absolute inset-x-[14px] top-[8px] rounded-[10px] border border-white/10 bg-[#161618] p-[8px]">
          <p className="flex items-center justify-between text-[7.5px] font-semibold text-label">
            {tt("Sürüm {0}", "0.3.8")}
            {stalled ? (
              <motion.span animate={{ scale: phase === 12 ? 0.85 : 1 }} className="flex items-center gap-[2px] rounded-full px-[5px] py-[1px] text-[6px] font-bold text-black" style={{ background: ACCENT.green }}>
                <RefreshCw size={6} /> {tt("Yeniden dene")}
              </motion.span>
            ) : (
              <span className="flex items-center gap-[2px] text-[6.5px]" style={{ color: tintText(ACCENT.green) }}>
                {pct >= 100 ? <Check size={7} /> : <Download size={7} />} {pct >= 100 ? tt("Kuruluyor") : tt("İndiriliyor %{0}", pct)}
              </span>
            )}
          </p>
          <div className="mt-[6px] h-[4px] overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full" animate={{ width: `${pct}%`, background: stalled ? ACCENT.red : ACCENT.green }} />
          </div>
          <motion.p animate={{ opacity: stalled ? 1 : 0 }} className="mt-[5px] text-[6px] leading-snug" style={{ color: tintText(ACCENT.red) }}>
            {tt("Kurulamadı: indirme durdu, bağlantı çok yavaş ya da koptu. Yeniden dene")}
          </motion.p>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Günün özeti acele etmez

/** İmleç bir anlığına dışarı kaçar ve döner: özet kapanmaz */
function BriefCalmDemo() {
  const n = useTick(600);
  const phase = n % 10; // 0-3 içeride · 4-5 dışarı kaçtı · 6-9 döndü
  const out = phase === 4 || phase === 5;
  return (
    <Stage>
      <Fit w={220} h={100}>
        <div className="absolute inset-x-[24px] top-[6px] h-[78px] rounded-[14px] border border-white/10 bg-black p-[8px]">
          <p className="text-[8px] font-semibold text-label">{tt("Günaydın!")}</p>
          <div className="mt-[5px] grid grid-cols-3 gap-[4px]">
            {[ACCENT.blue, ACCENT.yellow, ACCENT.pink].map((c) => (
              <span key={c} className="h-[30px] rounded-[6px]" style={{ background: tintBg(c, 14) }} />
            ))}
          </div>
          <p className="mt-[5px] text-[6px] text-label-3">{tt("Okumana yetecek kadar açık kalır")}</p>
        </div>
        <motion.svg width="10" height="12" viewBox="0 0 10 12" className="absolute" animate={{ left: out ? 206 : 150, top: out ? 88 : 54 }} transition={{ duration: 0.35 }}>
          <path d="M1 1 L1 10 L3.5 7.5 L5.5 11.5 L7 10.8 L5 6.8 L8.5 6.8 Z" fill="white" stroke="black" strokeWidth="0.8" />
        </motion.svg>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Görüntülü konuşma oyun değil

/** Tam ekran WhatsApp görüşmesi: "iyi oyunlar" kartı çıkmaz, oyun süresine yazılmaz */
function CallNotGameDemo() {
  const n = useTick(1300);
  const call = n % 2 === 0;
  return (
    <Stage>
      <Fit w={220} h={100}>
        <div className="absolute inset-x-[30px] top-[6px] h-[86px] overflow-hidden rounded-[8px] border border-white/15" style={{ background: call ? "linear-gradient(160deg,#0b3d2e,#06261c)" : "linear-gradient(160deg,#3a1d5c,#1a0e2a)" }}>
          <p className="absolute left-[7px] top-[6px] flex items-center gap-[3px] text-[7px] font-semibold text-white/85">
            {call ? <Video size={8} /> : null}
            {call ? tt("WhatsApp · görüntülü arama") : tt("Oyun")}
          </p>
          <div className="absolute inset-0 flex items-center justify-center gap-[6px]">
            {call ? (
              <>
                <MiniNook color={ACCENT.green} size={28} />
                <MiniNook color={ACCENT.yellow} size={22} />
              </>
            ) : (
              <MiniNook color={ACCENT.purple} size={28} />
            )}
          </div>
          <AnimatePresence>
            {!call && (
              <motion.span initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute left-1/2 top-[18px] -translate-x-1/2 whitespace-nowrap rounded-full bg-black px-[7px] py-[3px] text-[6px] text-label">
                {tt("{0} başlıyor · iyi oyunlar!", "Oyun")}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- İlaç alarmı

/** "İlaç" düğmesi her gün 09:00'ı hazırlar; çalınca "Aldım" */
function PillAlarmDemo() {
  const n = useTick(800);
  const phase = n % 12; // 0 bekle · 1 İlaç'a bas · 2-6 hazır, kuruldu · 7-11 çalıyor, Aldım
  const ready = phase >= 2;
  const ringing = phase >= 7;
  return (
    <Stage>
      <Fit w={230} h={92}>
        <AnimatePresence mode="wait">
          {!ringing ? (
            <motion.div key="set" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-[16px] top-[8px] flex gap-[6px]">
              <div className="w-[110px] rounded-[10px] border p-[6px]" style={{ background: tintBg(ACCENT.yellow, 7), borderColor: tintBg(ACCENT.yellow, 22) }}>
                <p className="text-center font-round text-[16px] font-bold tabular-nums text-label">{ready ? "09:00" : "15:00"}</p>
                <p className="mt-[2px] rounded-[4px] bg-black/30 px-[4px] py-[1px] text-[6.5px] text-label">{ready ? tt("İlaç") : tt("İsim (ör. Toplantı)")}</p>
                <div className="mt-[3px] flex gap-[1px]">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <span key={i} className="h-[7px] flex-1 rounded-[2px]" style={{ background: ready ? tintBg(ACCENT.yellow, 40) : "rgb(0 0 0 / 0.3)" }} />
                  ))}
                </div>
              </div>
              <motion.span
                animate={{ scale: phase === 1 ? 0.85 : 1 }}
                className="flex h-[16px] items-center gap-[2px] self-start rounded-[6px] px-[6px] text-[7px] font-semibold"
                style={{ background: tintBg(ACCENT.green, 16), color: tintText(ACCENT.green) }}
              >
                <Pill size={7} /> {tt("İlaç")}
              </motion.span>
            </motion.div>
          ) : (
            <motion.div key="ring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-[16px] top-[18px] flex items-center gap-[6px] rounded-[14px] bg-black px-[8px] py-[7px]">
              <motion.span animate={{ rotate: [0, -14, 14, 0] }} transition={{ duration: 0.6, repeat: Infinity }}>
                <Pill size={12} style={{ color: tintText(ACCENT.yellow) }} />
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[11px] tabular-nums" style={{ color: tintText(ACCENT.yellow) }}>09:00</p>
                <p className="text-[6.5px] text-label-2">{tt("İlaç")}</p>
              </div>
              <motion.span animate={{ scale: phase === 10 ? 0.85 : 1 }} className="flex items-center gap-[2px] rounded-full border px-[6px] py-[2px] text-[7px] font-semibold" style={{ background: tintBg(ACCENT.green, 26), borderColor: tintBg(ACCENT.green, 60), color: tintText(ACCENT.green) }}>
                <Check size={7} /> {tt("Aldım")}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Kısa tanıtım

/** Tanıtım 8 adımda biter; sonda "Başka neler yapabildiğimi gör" öbür adımları ekler */
function ShortTourDemo() {
  const n = useTick(500);
  const phase = n % 24; // 0-9 temel adımlar · 10-13 son adım, düğme · 14-23 ek adımlar
  const more = phase >= 14;
  const total = more ? 15 : 10;
  const at = phase < 10 ? phase : phase < 14 ? 9 : 9 + Math.min(5, phase - 13);
  return (
    <Stage>
      <Fit w={220} h={86}>
        <div className="absolute inset-x-[16px] top-[6px] h-[72px] rounded-[12px] bg-black">
          <p className="pt-[12px] text-center text-[9px] font-semibold text-label">{phase >= 10 && phase < 14 ? tt("Hazırız!") : more ? tt("Ekranını korurum") : tt("Nook nedir?")}</p>
          <AnimatePresence>
            {phase >= 10 && phase < 14 && (
              <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0, scale: phase === 13 ? 0.9 : 1 }} exit={{ opacity: 0 }} className="mx-auto mt-[5px] flex w-fit items-center gap-[2px] rounded-full border px-[6px] py-[2px] text-[6.5px]" style={{ background: tintBg(ACCENT.purple, 14), borderColor: tintBg(ACCENT.purple, 40), color: tintText(ACCENT.purple) }}>
                {tt("Başka neler yapabildiğimi gör ({0} adım)", 5)} <ArrowRight size={6} />
              </motion.span>
            )}
          </AnimatePresence>
          <div className="absolute inset-x-0 bottom-[8px] flex justify-center gap-[3px]">
            {Array.from({ length: total }, (_, i) => (
              <motion.span key={i} layout className="h-[3px] rounded-full" animate={{ width: i === at ? 10 : 3, background: i === at ? ACCENT.teal : i < at ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.12)" }} />
            ))}
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Gemini anahtarı nedir

/** Anahtar kutusunun altında ne olduğu ve nasıl alınacağı; hata Türkçe */
function GeminiKeyDemo() {
  const n = useTick(1600);
  const err = n % 2 === 1;
  return (
    <Stage>
      <Fit w={230} h={92}>
        <div className="absolute inset-x-[12px] top-[6px] rounded-[10px] border border-white/10 bg-[#161618] p-[7px]">
          <p className="flex items-center justify-between text-[7.5px] text-label">
            <span className="flex items-center gap-[3px]">
              <KeyRound size={8} style={{ color: tintText(ACCENT.purple) }} /> {tt("API anahtarı")}
            </span>
            <span className="h-[11px] w-[80px] rounded-full bg-white/[0.07]" />
          </p>
          <AnimatePresence mode="wait">
            <motion.p key={err ? "e" : "h"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-[5px] text-[6px] leading-snug" style={{ color: err ? tintText(ACCENT.red) : "#9a9aa2" }}>
              {err
                ? tt("Gemini bir hata verdi ({0}). Biraz sonra yeniden dene", "INTERNAL")
                : tt("Anahtar, Google'ın ücretsiz verdiği bir şifre; sohbet, sesli komut ve ekrana sor bununla çalışır. aistudio.google.com'a gir, “Get API key”e bas, çıkan yazıyı buraya yapıştır.")}
            </motion.p>
          </AnimatePresence>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Düz Nook'lar

/** 3B çizim olmayan bilgisayarda küçük Nook'lar boş kalmaz: düz küre ve iki göz */
function FlatNookDemo() {
  const colors = [ACCENT.teal, ACCENT.pink, ACCENT.yellow, ACCENT.purple, "#F4F4F6"];
  const n = useTick(500);
  return (
    <Stage>
      <Fit w={220} h={70}>
        <div className="absolute inset-x-0 top-[14px] flex justify-center gap-[10px]">
          {colors.map((c, i) => (
            <motion.span key={c} className="relative h-[34px] w-[34px] rounded-full" animate={{ y: n % colors.length === i ? -4 : 0 }} style={{ background: `radial-gradient(circle at 36% 30%, #ffffff 0%, ${c} 34%, color-mix(in srgb, ${c} 62%, #5d5d6b) 100%)` }}>
              {[-1, 1].map((side) => (
                <span key={side} className="absolute top-[12px] h-[7px] w-[3.5px] rounded-full bg-black" style={{ left: 17 + side * 5 - 1.75 }} />
              ))}
            </motion.span>
          ))}
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Türkçe kurulum

/** Türkçe Windows'ta kurulum penceresi Türkçe */
function TrInstallerDemo() {
  const n = useTick(450);
  const pct = (n * 8) % 110;
  return (
    <Stage>
      <Fit w={220} h={96}>
        <div className="absolute left-1/2 top-[6px] w-[170px] -translate-x-1/2 overflow-hidden rounded-[6px] border border-white/20 bg-[#f3f3f3]">
          <div className="flex items-center justify-between bg-white px-[6px] py-[3px] text-[6.5px] text-black">
            {tt("Nook Kurulumu")}
            <X size={7} />
          </div>
          <div className="px-[8px] py-[7px] text-black">
            <p className="text-[7.5px] font-bold">{tt("Kuruluyor")}</p>
            <p className="text-[6px] text-black/60">{tt("Lütfen Nook kurulurken bekleyin.")}</p>
            <div className="mt-[6px] h-[6px] overflow-hidden rounded-[1px] border border-black/20 bg-white">
              <motion.div className="h-full bg-[#06b025]" animate={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <div className="mt-[7px] flex justify-end gap-[3px]">
              {[tt("< Geri"), tt("İleri >"), tt("İptal")].map((b) => (
                <span key={b} className="rounded-[2px] border border-black/25 bg-white px-[5px] py-[1px] text-[5.5px]">
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

export const DEMOS26 = {
  studiozoom: StudioZoomDemo,
  tourfit: TourFitDemo,
  cleartext: ClearTextDemo,
  weatheroffline: WeatherOfflineDemo,
  phonesteps: PhoneStepsDemo,
  updateretry: UpdateRetryDemo,
  briefcalm: BriefCalmDemo,
  callnotgame: CallNotGameDemo,
  pillalarm: PillAlarmDemo,
  shorttour: ShortTourDemo,
  geminikey: GeminiKeyDemo,
  flatnook: FlatNookDemo,
  trinstaller: TrInstallerDemo,
};
