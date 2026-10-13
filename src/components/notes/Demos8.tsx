/**
 * 0.2.60 yama notunun görselleri: telefondan paylaşılan dosya rafa düşer, YouTube videoları Argus'a
 * sorulmaz, "Hey Nook" yalnızca gerçekten seslenince uyanır, İngilizce sesli komut.
 * Hepsi kendi kendine döner.
 */
import { AnimatePresence, motion } from "motion/react";
import { Check, FileImage, X } from "lucide-react";
import { DEFAULT_LOOK } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Pc, Phone, Stage, useTick } from "./Demos6";

/** Paylaş › Nook: telefondaki fotoğraf PC'deki rafa kutu olarak düşer */
function PhoneShelfDemo() {
  const n = useTick(500);
  const phase = n % 12; // 0-1 foto · 2-4 gönderiliyor · 5-11 rafta
  const T = ACCENT.teal;
  return (
    <Stage>
      <Fit w={290} h={110}>
        <Phone>
          <div className="h-[48px] rounded-[3px]" style={{ background: "linear-gradient(135deg, #ff9a5a, #8f6bff)" }} />
          {phase >= 2 && phase <= 4 && (
            <div className="mt-[8px]">
              <p className="text-[4.5px] text-label-2">{tt("PC'ye gönderiliyor…")}</p>
              <div className="mt-[2px] h-[2px] overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full" style={{ background: T }} initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1.3 }} />
              </div>
            </div>
          )}
        </Phone>
        <Pc w={170}>
          <div className="relative h-full p-[7px]">
            <div className="mx-auto flex h-[16px] w-[110px] items-center justify-center gap-[4px] rounded-full bg-black">
              <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={11} expression={phase >= 5 && phase <= 6 ? "love" : "idle"} />
              {phase >= 5 && <span className="text-[5.5px] font-semibold" style={{ color: tintText(T) }}>{tt("Telefondan rafa geldi")}</span>}
            </div>
            <p className="mt-[8px] text-[5.5px] uppercase tracking-[0.12em] text-label-3">{tt("Raf")}</p>
            <div className="mt-[3px] flex gap-[4px]">
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[4px] bg-well text-[5px] text-label-3">PDF</span>
              <AnimatePresence>
                {phase >= 5 && (
                  <motion.span
                    initial={{ y: -40, opacity: 0, scale: 0.6 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 16 }}
                    className="flex h-[26px] w-[26px] flex-col items-center justify-center rounded-[4px]"
                    style={{ background: tintBg(T, 18) }}
                  >
                    <FileImage size={10} style={{ color: tintText(T) }} />
                    <span className="text-[4px] text-label-2">IMG_2041</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

/** YouTube'da filmin adı geçen uzun video sorulmaz; gerçek film/bölüm sorulur */
function ArgusYoutubeDemo() {
  const n = useTick(1600);
  const cases = [
    { title: "Dune: Part Two Review | Neden bu kadar iyi?", src: "YouTube · 24 dk", ask: false },
    { title: "Interstellar'ın bilimi, 10 yıl sonra", src: "YouTube · 31 dk", ask: false },
    { title: "Severance S2E3", src: "Apple TV · 48 dk", ask: true },
  ];
  const c = cases[n % cases.length];
  return (
    <Stage>
      <AnimatePresence mode="popLayout">
        <motion.div key={n} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-6">
          <span className="rounded-[10px] bg-well px-2.5 py-1 text-center text-[10.5px] text-label">
            ▶ {c.title}
            <span className="block text-[8.5px] text-label-3">{c.src}</span>
          </span>
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: tintBg(c.ask ? ACCENT.purple : ACCENT.green, 16), color: tintText(c.ask ? ACCENT.purple : ACCENT.green) }}
          >
            {c.ask ? tt("Argus'ta yok · ekleyeyim mi?") : tt("Video: sormuyor")}
          </motion.span>
        </motion.div>
      </AnimatePresence>
    </Stage>
  );
}

/** Benzer sesler ("Hey look", öksürük, televizyon) reddedilir; yalnızca "Hey Nook" uyandırır */
function WakeVerifyDemo() {
  const n = useTick(1300);
  const cases = [
    { heard: tt("“Hey look”"), ok: false },
    { heard: tt("📺 televizyon"), ok: false },
    { heard: tt("“Hey Nook”"), ok: true },
  ];
  const c = cases[n % cases.length];
  return (
    <Stage>
      <div className="absolute left-1/2 top-3 flex h-[22px] w-[130px] -translate-x-1/2 items-center justify-center rounded-full bg-black">
        {c.ok && (
          <div className="flex items-center gap-[2px]">
            {[0, 1, 2, 3].map((i) => (
              <motion.span key={i} className="w-[2.5px] rounded-full" style={{ background: ACCENT.teal }} animate={{ height: [3, 9 - i, 3] }} transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.08 }} />
            ))}
          </div>
        )}
      </div>
      <AnimatePresence mode="popLayout">
        <motion.div key={n} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
          <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={30} expression={c.ok ? "surprised" : "sleepy"} />
          <span className="rounded-[10px] bg-well px-2 py-1 text-[10.5px] text-label">{c.heard}</span>
          <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: tintBg(c.ok ? ACCENT.green : ACCENT.red, 16), color: tintText(c.ok ? ACCENT.green : ACCENT.red) }}>
            {c.ok ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
            {c.ok ? tt("Dinliyor") : tt("Uyanmadı")}
          </span>
        </motion.div>
      </AnimatePresence>
    </Stage>
  );
}

/** İngilizce sesli komut: Nook İngilizceyken söylenen anında yapılır */
function VoiceEnglishDemo() {
  const n = useTick(1500);
  const steps = [
    { said: "“Open Spotify”", done: tt("Spotify açıldı") },
    { said: "“Play lo-fi on YouTube Music”", done: tt("Çalıyor: lo-fi") },
    { said: "“Set the volume to 40”", done: tt("Ses %40") },
    { said: "“Set a timer for 10 minutes”", done: tt("10 dk sayaç") },
  ];
  const cur = steps[n % steps.length];
  return (
    <Stage>
      <span className="absolute left-3 top-3 rounded-full bg-well px-1.5 py-[1px] text-[8.5px] font-semibold text-label-2">EN</span>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-6">
        <AnimatePresence mode="popLayout">
          <motion.div key={n} className="flex w-full flex-col items-center gap-1.5" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <span className="rounded-[10px] bg-well px-2.5 py-1 text-[11px] text-label">{cur.said}</span>
            <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: tintBg(ACCENT.green, 16), color: tintText(ACCENT.green) }}>
              <Check size={10} strokeWidth={3} /> {cur.done}
            </motion.span>
          </motion.div>
        </AnimatePresence>
      </div>
    </Stage>
  );
}

/** Taşınmış ada (sağ altta) tam ekrana alınınca orada büyür; eskiden üst ortaya kaçıyordu */
function BigPosDemo() {
  const n = useTick(1100);
  const phase = n % 4; // 0 küçük ada sağ altta · 1-2 tam ekran yerinde · 3 küçülür
  const big = phase === 1 || phase === 2;
  return (
    <Stage>
      <div className="absolute inset-3 rounded-[8px]" style={{ background: "linear-gradient(135deg,#1d2a44,#2b2140)" }}>
        <motion.div
          className="absolute rounded-[12px] bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
          animate={big ? { right: 8, bottom: 8, width: "62%", height: "70%" } : { right: 18, bottom: 14, width: 54, height: 14 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
        >
          {big && <span className="absolute right-2 top-1.5 text-[8px] text-label-3">⤡</span>}
        </motion.div>
        <span className="absolute left-2 top-1.5 text-[9px] font-medium" style={{ color: tintText(ACCENT.green) }}>
          {big ? tt("Tam ekran: Nook'un yerinde") : tt("Ada sağ altta")}
        </span>
      </div>
    </Stage>
  );
}

/** İlerleme çubuğuna tıklayınca / sürükleyince şarkı o ana atlar */
function SeekDemo() {
  const n = useTick(900);
  const phase = n % 5; // 0-1 çalıyor · 2 imleç sürüklüyor · 3-4 yeni yerden çalıyor
  const pos = phase < 2 ? 0.22 + phase * 0.03 : phase === 2 ? 0.7 : 0.7 + (phase - 3) * 0.03;
  const P = ACCENT.pink;
  const fmt = (f: number) => {
    const s = Math.round(f * 200);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  return (
    <Stage>
      <div className="absolute inset-x-8 top-1/2 -translate-y-1/2">
        <p className="text-[11px] font-semibold text-label">Blinding Lights</p>
        <p className="text-[9.5px] text-label-3">The Weeknd</p>
        <div className="relative mt-2.5">
          <div className={`overflow-hidden rounded-full bg-white/[0.1] transition-[height] ${phase === 2 ? "h-[6px]" : "h-[3px]"}`}>
            <motion.div className="h-full origin-left rounded-full" style={{ background: P }} animate={{ scaleX: pos }} transition={{ type: "spring", stiffness: 260, damping: 26 }} />
          </div>
          <motion.span className="absolute -top-[3px] text-[13px]" animate={{ left: `${(phase === 2 ? 0.7 : pos) * 100 - 2}%`, opacity: phase === 2 ? 1 : 0 }} transition={{ duration: 0.35 }}>
            👆
          </motion.span>
        </div>
        <div className="mt-1 flex justify-between text-[9.5px] tabular-nums text-label-3">
          <span>{fmt(pos)}</span>
          <span>-{fmt(1 - pos)}</span>
        </div>
      </div>
    </Stage>
  );
}

/** Yeni Ayarlar: kategori kartları, birine basınca sayfası; arama yazınca yalnızca o ayar */
function SettingsGridDemo() {
  const n = useTick(1200);
  const phase = n % 6; // 0-1 ızgara · 2 Sağlık'a basılır · 3 sayfası · 4-5 aramada "su"
  const cats: [string, string][] = [
    [tt("Genel"), ACCENT.blue],
    [tt("Ada ve Nook"), ACCENT.pink],
    [tt("Bildirimler"), ACCENT.purple],
    [tt("Sağlık"), ACCENT.teal],
    [tt("Oyun"), ACCENT.orange],
    [tt("Gizlilik"), ACCENT.red],
  ];
  const search = phase >= 4;
  return (
    <Stage>
      <div className="absolute inset-x-5 top-3 flex h-[18px] items-center gap-1 rounded-full bg-well px-2 text-[9px] text-label-3">
        ⌕ {search ? <span className="text-label">su</span> : tt("Ayarlarda ara…")}
      </div>
      <AnimatePresence mode="wait">
        {phase <= 2 && (
          <motion.div key="grid" exit={{ opacity: 0 }} className="absolute inset-x-5 top-9 grid grid-cols-3 gap-1">
            {cats.map(([t, c], i) => (
              <motion.span
                key={t}
                animate={{ scale: phase === 2 && i === 3 ? 0.94 : 1 }}
                className="truncate rounded-[9px] px-1.5 py-1.5 text-[9px] font-semibold"
                style={{ background: tintBg(c, 12), border: `1px solid ${tintBg(c, 24)}`, color: tintText(c) }}
              >
                {t}
              </motion.span>
            ))}
          </motion.div>
        )}
        {phase === 3 && (
          <motion.div key="page" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="absolute inset-x-5 top-9 space-y-1">
            <span className="inline-block rounded-full bg-well px-1.5 py-[1px] text-[8.5px] font-semibold" style={{ color: tintText(ACCENT.teal) }}>‹ {tt("Sağlık")}</span>
            <Line label={tt("Su hatırlatıcısı")} hint={tt("Telefonda da çıkar")} />
            <Line label={tt("Göz molası")} hint={tt("20 dakikada bir 20 saniye")} />
          </motion.div>
        )}
        {search && (
          <motion.div key="find" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-5 top-9">
            <Line label={tt("Su hatırlatıcısı")} hint={tt("Sağlık")} />
          </motion.div>
        )}
      </AnimatePresence>
    </Stage>
  );
}

const Line = ({ label, hint }: { label: string; hint: string }) => (
  <div className="flex items-center justify-between rounded-[8px] bg-well/60 px-2 py-1">
    <span>
      <span className="block text-[9.5px] text-label">{label}</span>
      <span className="block text-[8px] text-label-3">{hint}</span>
    </span>
    <span className="h-[9px] w-[16px] rounded-full" style={{ background: ACCENT.teal }} />
  </div>
);

/** Ana sayfa: en çok açılanlar üstte büyük, gerisi altta küçük; çok açılan yukarı çıkar */
function FavoritesDemo() {
  const n = useTick(1300);
  const swap = n % 4 >= 2; // Raf sık açılınca üste çıkar, Pomodoro aşağı iner
  const top: [string, string][] = [
    [tt("Medya"), ACCENT.pink],
    [tt("Bugün"), ACCENT.yellow],
    [tt("Argus"), ACCENT.blue],
    swap ? [tt("Raf"), ACCENT.teal] : [tt("Pomodoro"), ACCENT.red],
  ];
  const rest: [string, string][] = [swap ? [tt("Pomodoro"), ACCENT.red] : [tt("Raf"), ACCENT.teal], [tt("Pano"), ACCENT.purple], [tt("Not"), ACCENT.orange], [tt("Alarm"), ACCENT.yellow], [tt("Takvim"), ACCENT.blue], [tt("Hum"), ACCENT.purple]];
  return (
    <Stage>
      <div className="absolute inset-x-5 top-2.5">
        <p className="mb-1 text-[7.5px] font-medium uppercase tracking-[0.12em] text-label-3">{tt("Sık kullandıkların")}</p>
        <div className="grid grid-cols-2 gap-1">
          {top.map(([t, c]) => (
            <motion.span layout key={t} className="flex h-[19px] items-center gap-1 rounded-full border px-1.5 text-[9px] font-semibold" style={{ background: tintBg(c, 12), borderColor: tintBg(c, 34), color: tintText(c) }}>
              <span className="h-[10px] w-[10px] rounded-full" style={{ background: c }} />
              {t}
            </motion.span>
          ))}
        </div>
        <p className="mb-1 mt-1.5 text-[7.5px] font-medium uppercase tracking-[0.12em] text-label-3">{tt("Tümü")}</p>
        <div className="grid grid-cols-3 gap-1">
          {rest.map(([t, c]) => (
            <motion.span layout key={t} className="flex h-[14px] items-center gap-1 rounded-full border px-1 text-[7.5px] font-medium" style={{ background: tintBg(c, 8), borderColor: tintBg(c, 22), color: tintText(c) }}>
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: c }} />
              {t}
            </motion.span>
          ))}
        </div>
      </div>
    </Stage>
  );
}

/** Yeni gelen: çiplerin altında ne işe yaradıkları yazar */
function ExplainDemo() {
  const n = useTick(1600);
  const chips: [string, string, string][] = [
    ["Hum", tt("Çalan şarkıyı bul"), ACCENT.purple],
    ["Argus", tt("Dizi ve film listen"), ACCENT.blue],
    [tt("Raf"), tt("Bana bıraktığın dosyalar"), ACCENT.teal],
    [tt("Pano"), tt("Kopyaladıkların, çevirisi"), ACCENT.purple],
    [tt("Kontrol"), tt("Wi-Fi, uygulama bazlı ses"), ACCENT.green],
    [tt("Karne"), tt("Haftalık istatistik"), ACCENT.teal],
  ];
  const lit = n % chips.length;
  return (
    <Stage>
      <div className="absolute inset-x-5 top-1/2 grid -translate-y-1/2 grid-cols-2 gap-1.5">
        {chips.map(([t, d, c], i) => (
          <motion.span
            key={t}
            animate={{ scale: i === lit ? 1.05 : 1 }}
            className="flex min-w-0 flex-col rounded-full border px-2.5 py-1 leading-tight"
            style={{ background: tintBg(c, i === lit ? 18 : 10), borderColor: tintBg(c, i === lit ? 55 : 28) }}
          >
            <span className="truncate text-[10px] font-semibold" style={{ color: tintText(c) }}>{t}</span>
            <span className="truncate text-[8px] text-label-2">{d}</span>
          </motion.span>
        ))}
      </div>
    </Stage>
  );
}

/** Claude'un sorusu terminalde cevaplanınca adadaki kart kapanır, ada da kapanabilir */
function ClaudeSettleDemo() {
  const n = useTick(1100);
  const phase = n % 5; // 0-1 adada soru · 2 terminalde cevap · 3-4 kart gitti, ada kapandı
  const C = "#D97757";
  return (
    <Stage>
      <motion.div
        className="absolute left-1/2 top-2 -translate-x-1/2 overflow-hidden rounded-[14px] bg-black"
        animate={phase <= 2 ? { width: 210, height: 58 } : { width: 110, height: 22 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        {phase <= 2 && (
          <div className="p-2">
            <p className="text-[8px] font-medium" style={{ color: tintText(C) }}>Claude · Nook</p>
            <p className="text-[10px] font-semibold text-label">{tt("2 soru soruyor")}</p>
            <span className="mt-1 inline-block rounded-full px-2 py-[1px] text-[8.5px] font-semibold" style={{ background: tintBg(C, 22), color: tintText(C) }}>{tt("Cevapla")}</span>
          </div>
        )}
      </motion.div>
      <div className="absolute inset-x-6 bottom-3 rounded-[8px] bg-well/70 px-2 py-1.5 font-mono text-[8.5px] text-label-2">
        {phase >= 2 ? "> 1. Kategori ızgarası ✓" : "> _"}
      </div>
      {phase >= 3 && <span className="absolute right-6 top-[34px] text-[9px] font-medium" style={{ color: tintText(ACCENT.green) }}>{tt("Kart kapandı")}</span>}
    </Stage>
  );
}

/** Nook Mobil 0.2.60: Raf, iki tarafta su hatırlatması, deneme bildirimi — sırayla telefonda */
function Mobile060Demo() {
  const n = useTick(1500);
  const scene = n % 3; // 0 Raf · 1 su bildirimi · 2 deneme bildirimi
  const T = ACCENT.teal;
  const B = ACCENT.blue;
  return (
    <Stage>
      <Fit w={260} h={110}>
        <Phone>
          <AnimatePresence mode="wait">
            {scene === 0 && (
              <motion.div key="raf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-[6px] font-bold" style={{ color: tintText(T) }}>{tt("Raf")}</p>
                {["sunum.pdf", "IMG_2041.jpg", "tablo.xlsx"].map((f) => (
                  <div key={f} className="mt-[3px] flex items-center gap-[3px] rounded-[3px] bg-white/[0.06] px-[3px] py-[2px]">
                    <FileImage size={6} style={{ color: tintText(T) }} />
                    <span className="text-[4.5px] text-label">{f}</span>
                  </div>
                ))}
              </motion.div>
            )}
            {scene === 1 && (
              <motion.div key="su" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="rounded-[4px] bg-[#2a2d36] p-[4px]">
                <p className="text-[5px] font-semibold text-label">💧 {tt("Su içme vakti")}</p>
                <div className="mt-[3px] flex gap-[3px]">
                  <span className="rounded-full px-[4px] py-[1px] text-[4.5px] font-semibold" style={{ background: tintBg(B, 30), color: tintText(B) }}>{tt("İçtim")}</span>
                  <span className="rounded-full bg-white/10 px-[4px] py-[1px] text-[4.5px] text-label-2">{tt("Sonra")}</span>
                </div>
              </motion.div>
            )}
            {scene === 2 && (
              <motion.div key="test" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="block rounded-[4px] bg-white/[0.08] py-[3px] text-center text-[4.5px] font-semibold text-label">{tt("Deneme bildirimi gönder")}</span>
                <p className="mt-[3px] text-[4.5px]" style={{ color: tintText(ACCENT.green) }}>{tt("PC'ye ulaştı")} ✓</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Phone>
        <Pc w={150}>
          <div className="flex h-full items-center justify-center">
            <span className="rounded-full bg-black px-[8px] py-[3px] text-[6.5px] font-semibold text-label">
              {scene === 0 ? tt("Raf · 3 öğe") : scene === 1 ? tt("💧 İkisinde de kapandı") : tt("Telefon · Deneme bildirimi")}
            </span>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

export const DEMOS8 = {
  mobile060: Mobile060Demo,
  explain: ExplainDemo,
  claudesettle: ClaudeSettleDemo,
  favorites: FavoritesDemo,
  settingsgrid: SettingsGridDemo,
  seek: SeekDemo,
  bigpos: BigPosDemo,
  phoneshelf: PhoneShelfDemo,
  argusyt: ArgusYoutubeDemo,
  wakeverify: WakeVerifyDemo,
  voiceen: VoiceEnglishDemo,
};
