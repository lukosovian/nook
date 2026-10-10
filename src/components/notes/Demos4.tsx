/**
 * 0.2.48 yama notlarının görselleri: Nook'un sesleri (ada açılırken, bildirim gelince, sevinince) ve
 * ayarlarda ortada duran sekme şeridi. Hepsi kendi kendine döner; görseller ses çalmaz.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, Download, MicOff, MousePointer2, Music2, Sparkles, Terminal, Volume2 } from "lucide-react";
import { normalizeColor, normalizeLook } from "../../lib/look";
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

function useFace() {
  const s = useNook((st) => st.settings);
  return { look: normalizeLook(s.look), color: normalizeColor(s.faceColor) };
}

const Stage = ({ children }: { children: React.ReactNode }) => (
  <div className="relative h-full w-full overflow-hidden rounded-[14px]" style={{ background: "radial-gradient(120% 100% at 50% 0%, #2a1b2a 0%, #100c12 75%)" }}>
    {children}
  </div>
);

/** Adadan yayılan ses halkaları */
function Waves({ color, k }: { color: string; k: number }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={`${k}-${i}`}
          className="absolute inset-0 rounded-[20px] border-2"
          style={{ borderColor: color }}
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 1.5 + i * 0.25 }}
          transition={{ duration: 0.9, delay: i * 0.15, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

const PINK = ACCENT.pink;

/** Nook'un sesleri: ada açılınca blup, bildirim gelince zil, sevinince cıvıltı; altta ayar satırı */
function SoundsDemo() {
  const face = useFace();
  const n = useTick(1100);
  const phase = n % 8; // 0 kapalı · 1-2 açık · 3 kapandı · 4-5 bildirim · 6-7 seviniyor
  const open = phase === 1 || phase === 2;
  const toast = phase === 4 || phase === 5;
  const happy = phase >= 6;
  // Sesin çaldığı anlar ve etiketi
  const cue = phase === 1 ? tt("açılınca") : phase === 3 ? tt("kapanınca") : phase === 4 ? tt("bildirim gelince") : phase === 6 ? tt("sevinince") : null;
  const w = open ? 196 : toast ? 186 : 84;
  const h = open ? 46 : toast ? 34 : 24;
  return (
    <Stage>
      <div className="absolute left-1/2 top-[26px] -translate-x-1/2">
        <motion.div className="relative" animate={{ width: w, height: h }} transition={{ type: "spring", stiffness: 380, damping: 30 }}>
          {cue && <Waves color={tintBg(PINK, 70)} k={n} />}
          <div className="absolute inset-0 flex items-center overflow-hidden bg-black" style={{ borderRadius: open ? 22 : 18 }}>
            <motion.span
              className="ml-2 flex shrink-0"
              animate={happy ? { y: [0, -5, 0, -3, 0] } : { y: 0 }}
              transition={happy ? { duration: 0.7, repeat: Infinity, repeatDelay: 0.4 } : undefined}
            >
              <NookFigure look={face.look} color={face.color} size={open ? 34 : toast ? 24 : 18} expression={happy ? "happy" : "idle"} />
            </motion.span>
            <AnimatePresence mode="wait">
              {open && (
                <motion.div key="open" className="ml-3 flex min-w-0 flex-1 flex-col gap-1 pr-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <span className="h-1.5 w-24 rounded-full bg-white/15" />
                  <span className="h-1.5 w-16 rounded-full bg-white/10" />
                </motion.div>
              )}
              {toast && (
                <motion.div key="toast" className="ml-2 flex min-w-0 flex-1 items-center gap-2 pr-3" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  <Download size={12} style={{ color: tintText(ACCENT.green) }} />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-[9px] font-medium" style={{ color: tintText(ACCENT.green) }}>
                      {tt("İndirme bitti")}
                    </span>
                    <span className="block truncate text-[8.5px] text-white/55">tatil-fotolari.zip</span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Uçuşan notalar */}
          <AnimatePresence>
            {cue &&
              [0, 1].map((i) => (
                <motion.span
                  key={`${n}-${i}`}
                  className="absolute"
                  style={{ right: -10 - i * 12, top: 2 + i * 6, color: tintText(PINK) }}
                  initial={{ opacity: 0, y: 6, scale: 0.6 }}
                  animate={{ opacity: [0, 1, 0], y: -14, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1, delay: i * 0.18 }}
                >
                  <Music2 size={11} />
                </motion.span>
              ))}
          </AnimatePresence>
        </motion.div>
      </div>
      {/* Ne zaman ses çıktığı */}
      <div className="absolute inset-x-0 top-[80px] flex justify-center">
        <AnimatePresence mode="wait">
          {cue && (
            <motion.span
              key={cue}
              className="flex items-center gap-1 rounded-full px-2 py-[2px] text-[9px] font-medium"
              style={{ background: tintBg(PINK, 16), color: tintText(PINK) }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Volume2 size={10} /> {cue}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {/* Ayarlar › Ses */}
      <div className="absolute inset-x-4 bottom-2.5 flex items-center justify-between gap-2 rounded-[10px] border border-white/[0.06] bg-white/[0.04] px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="flex h-3.5 w-6 shrink-0 items-center justify-end rounded-full px-[2px]" style={{ background: tintBg(PINK, 55) }}>
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          <span className="truncate text-[9px] text-white/80">{tt("Nook'un sesleri")}</span>
        </div>
        <div className="flex items-center">
          <span className="flex gap-0.5 rounded-full bg-white/[0.05] p-[2px] text-[8px]">
            {[tt("Kısık"), tt("Orta"), tt("Yüksek")].map((l, i) => (
              <span key={l} className="rounded-full px-1.5 py-[1px]" style={i === 1 ? { background: tintBg(PINK, 22), color: tintText(PINK) } : { color: "rgb(255 255 255 / 0.45)" }}>
                {l}
              </span>
            ))}
          </span>
        </div>
      </div>
    </Stage>
  );
}

const TABS = ["Nook", tt("Molalar"), tt("Bekçi"), tt("Pano"), tt("Raf"), tt("Ses"), tt("Takvim"), tt("Yayın"), tt("Kalkan"), tt("Kilit")];

/** Ayarlarda sekme şeridi: seçili sekme ortada durur, öncesi ve sonrası görünür; sonrakine tıklanır */
function SetTabsDemo() {
  const n = useTick(1300);
  const step = n % 14;
  // 0-8 aşağı kaydırılıyor (sekme ilerliyor), 9-13 geri dönüyor
  const cur = step <= 8 ? step + 1 : 17 - step;
  const strip = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  useLayoutEffect(() => {
    const s = strip.current;
    const b = s?.querySelector<HTMLElement>(`[data-i="${cur}"]`);
    if (!s || !b) return;
    const inner = b.parentElement as HTMLElement;
    const max = Math.max(0, inner.scrollWidth - s.clientWidth);
    setX(-Math.max(0, Math.min(max, b.offsetLeft + b.offsetWidth / 2 - s.clientWidth / 2)));
  }, [cur]);
  // Sonraki sekmeye tıklayan imleç (ileri giderken)
  const clicking = step <= 8;
  return (
    <Stage>
      <div className="absolute inset-x-5 bottom-2.5 top-[30px] overflow-hidden rounded-[12px] border border-white/[0.06] bg-[#1c1c1f] px-2.5 pt-2">
        <div ref={strip} className="relative overflow-hidden">
          <motion.div className="flex w-max gap-1" animate={{ x }} transition={{ type: "spring", stiffness: 260, damping: 32 }}>
            {TABS.map((t, i) => (
              <span key={t} data-i={i} className="relative shrink-0 rounded-full px-2 py-[3px] text-[9.5px] font-medium" style={{ color: i === cur ? "#fff" : "rgb(255 255 255 / 0.4)" }}>
                {i === cur && <motion.span layoutId="demo-setidx" className="absolute inset-0 rounded-full bg-white/[0.1]" />}
                <span className="relative">{t}</span>
              </span>
            ))}
          </motion.div>
          {/* Kenarlarda hafif solma */}
          <span className="pointer-events-none absolute inset-y-0 left-0 w-4" style={{ background: "linear-gradient(90deg, #1c1c1f, transparent)" }} />
          <span className="pointer-events-none absolute inset-y-0 right-0 w-4" style={{ background: "linear-gradient(270deg, #1c1c1f, transparent)" }} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={cur} className="mt-2 space-y-1.5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            <p className="text-[8.5px] font-medium uppercase tracking-[0.12em] text-white/40">{TABS[cur]}</p>
            {[70, 52].map((w, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="h-2 rounded-full bg-white/12" style={{ width: `${w}%` }} />
                <span className="h-3 w-5 rounded-full" style={{ background: i === 0 ? tintBg(ACCENT.blue, 45) : "rgb(255 255 255 / 0.1)" }} />
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
      {/* İmleç ortanın sağındaki (sıradaki) sekmeye tıklar */}
      <motion.span
        className="absolute text-white"
        animate={clicking ? { left: "60%", top: 54, scale: [1, 0.85, 1] } : { left: "80%", top: 110, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <MousePointer2 size={13} fill="white" />
      </motion.span>
    </Stage>
  );
}

/** Yenilenen "Nook nedir?": tanıtım penceresi yeni sayfalarını sırayla çevirir, noktalar ilerler */
function TourNewDemo() {
  const face = useFace();
  const n = useTick(1500);
  const pages = [
    { t: tt("Ekranını korurum"), c: ACCENT.purple, icon: MicOff, bg: "radial-gradient(90% 120% at 50% 100%, #ff8a3d55 0%, #141537 55%, #070b1f 100%)" },
    { t: tt("Çalan şarkıyı bulurum"), c: ACCENT.pink, icon: Music2, bg: "linear-gradient(135deg, #3b2a5c 0%, #1c2440 70%)" },
    { t: tt("Günün düzeni bende"), c: ACCENT.blue, icon: CalendarClock, bg: "linear-gradient(160deg, #1d2b45 0%, #10141c 80%)" },
    { t: tt("Ekranında dolaşırım"), c: ACCENT.teal, icon: MousePointer2, bg: "linear-gradient(160deg,#2b4a6b,#1a2433)" },
    { t: tt("Claude Code adada"), c: "#D97757", icon: Terminal, bg: "radial-gradient(120% 100% at 50% 0%, #2a1c16 0%, #0f0c0a 75%)" },
  ];
  const i = n % pages.length;
  const p = pages[i];
  return (
    <Stage>
      <div className="absolute inset-x-4 bottom-3 top-3 overflow-hidden rounded-[16px] border border-white/[0.08] bg-black">
        <div className="flex h-6 items-center gap-1 px-3 text-[9.5px] text-label-2">
          <Sparkles size={10} style={{ color: tintText(p.c) }} />
          {tt("Nook nedir?")}
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={i}
            className="absolute inset-x-2.5 bottom-7 top-7 flex gap-2"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex w-[38%] flex-col rounded-[10px] bg-white/[0.04] p-2" style={{ background: `radial-gradient(90% 60% at 50% 0%, ${tintBg(p.c, 22)} 0%, rgb(255 255 255 / 0.04) 70%)` }}>
              <NookFigure look={face.look} color={face.color} size={30} />
              <span className="mt-auto w-fit rounded-full px-1.5 text-[8.5px] tabular-nums" style={{ background: tintBg(p.c, 16), color: tintText(p.c) }}>
                {i + 6} / 14
              </span>
              <span className="mt-1 text-[10.5px] font-semibold leading-tight text-label">{p.t}</span>
            </div>
            <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[10px]" style={{ background: p.bg }}>
              <motion.span
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: tintBg(p.c, 26), color: tintText(p.c), boxShadow: `0 0 24px -4px ${p.c}` }}
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.15 }}
              >
                <p.icon size={18} />
              </motion.span>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
          {pages.map((q, k) => (
            <motion.span key={k} className="h-1 rounded-full" animate={{ width: k === i ? 14 : 4, background: k === i ? q.c : "rgb(255 255 255 / 0.2)" }} />
          ))}
        </div>
      </div>
    </Stage>
  );
}

export const DEMOS4 = {
  sounds: SoundsDemo,
  settabs: SetTabsDemo,
  tournew: TourNewDemo,
} as const;
