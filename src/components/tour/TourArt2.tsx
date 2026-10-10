/**
 * Tanıtımın 0.2.33 sonrası adımlarının çizimleri: gizlilik kalkanı, Hum, günün düzeni (takvim, alarm,
 * odak bekçisi), Nook'un ekranda dolaşması ve Claude Code. Hepsi kendi kendine döner.
 */
import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlarmClock,
  CalendarClock,
  Check,
  History,
  KeyRound,
  Lock,
  MicOff,
  MousePointer2,
  Music2,
  Target,
  Terminal,
  Volume2,
  X,
} from "lucide-react";
import { normalizeColor, normalizeLook } from "../../lib/look";
import { CLAUDE_COLOR } from "../../lib/claude";
import { useNook, type Expression } from "../../store/nook";
import { NookFigure } from "../mascot/Figure";
import { StageBox } from "../shield/kit";
import { ACCENT, Bar, tintBg, tintText } from "../ui/primitives";
import { Keys, Screen, Tip } from "./TourArt";
import { pct, tt } from "../../lib/i18n";

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

/** Ekranın tepesine yapışık siyah çentik; ölçüsü animasyonla değişir */
function Island({ w, h, r = 22, children }: { w: number; h: number; r?: number; children?: React.ReactNode }) {
  return (
    <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2">
      <motion.div
        className="flex items-center overflow-hidden bg-black"
        style={{ boxShadow: "0 10px 24px -10px rgba(0,0,0,0.9)" }}
        animate={{ width: w, height: h, borderBottomLeftRadius: r, borderBottomRightRadius: r }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Ekranda beliren kısayol tuşları */
function KeyFlash({ combo, color, show, top = 46 }: { combo: string; color: string; show: boolean; top?: number }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute left-1/2 z-20 -translate-x-1/2"
          style={{ top }}
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
        >
          <Keys combo={combo} color={color} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const Cursor = ({ size = 18 }: { size?: number }) => <MousePointer2 size={size} className="text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]" fill="white" strokeWidth={1.4} />;

// ---------------------------------------------------------------- Gizlilik kalkanı

/** Kalkan sahneleri yalnızca bu adım açılınca yüklenir */
const SCENES = [
  lazy(() => import("../shield/scenesA").then((m) => ({ default: m.Campfire }))),
  lazy(() => import("../shield/scenesC").then((m) => ({ default: m.Ocean }))),
  lazy(() => import("../shield/scenesA").then((m) => ({ default: m.Space }))),
];

const SCREEN_W = 546;

export function ShieldArt() {
  const shortcut = useNook((s) => s.settings.shieldShortcut);
  const n = useTick(600);
  const step = n % 11; // 0-1 masaüstü + kısayol · 2-9 kalkan · 10 kalkar
  const on = step >= 2 && step <= 9;
  const Scene = SCENES[Math.floor(n / 11) % SCENES.length];
  return (
    <div className="flex h-full flex-col gap-3">
      <Screen height={250}>
        <KeyFlash combo={shortcut} color={ACCENT.purple} show={step <= 1} top={92} />
        <AnimatePresence>
          {on && (
            <motion.div
              key={Math.floor(n / 11)}
              className="absolute inset-0 z-30 overflow-hidden bg-black"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.2, 0.8, 0.3, 1] }}
            >
              <StageBox.Provider value={{ w: SCREEN_W, h: 250 }}>
                <Suspense fallback={null}>
                  <Scene />
                </Suspense>
              </StageBox.Provider>
              <motion.span
                className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: tintBg(ACCENT.orange, 30), color: tintText(ACCENT.orange) }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 500, damping: 18 }}
              >
                <MicOff size={13} strokeWidth={2.4} />
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </Screen>
      <div className="flex gap-2">
        <Tip icon={MicOff} color={ACCENT.orange}>{tt("Mikrofonun")}{" "}<b className="font-medium text-label">{tt("kapanır")}</b>{tt(", kalkınca açılır")}</Tip>
        <Tip icon={Lock} color={ACCENT.purple}>{tt("İstersen")}{" "}<b className="font-medium text-label">{tt("parolayla")}</b>{" "}{tt("kilitlerim")}</Tip>
        <Tip icon={KeyRound} color={ACCENT.yellow}>{tt("Kopyaladığın şifre, kart no")}{" "}<b className="font-medium text-label">{tt("panoda kalmaz")}</b>
        </Tip>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Hum

const HUM = ["#ff4fa3", "#9b7bff", "#3fd8ff"];
const COVER = "linear-gradient(135deg, #ff4fa3 0%, #9b7bff 55%, #3fd8ff 100%)";

export function HumArt() {
  const face = useFace();
  const shortcut = useNook((s) => s.settings.humShortcut);
  const n = useTick(800);
  const step = n % 10; // 0-1 kısayol · 2-5 dinliyor · 6-9 buldu
  const listening = step >= 2 && step <= 5;
  const found = step >= 6;
  const t = useTick(110);
  const bars = Array.from({ length: 18 }, (_, i) => (listening ? 0.25 + 0.75 * Math.abs(Math.sin(t * 0.9 + i * 1.3) * Math.cos(t * 0.37 + i * 0.6)) : 0.15));
  return (
    <div className="flex h-full flex-col gap-3">
      <Screen height={250} bare>
        {/* Arkada oynayan video */}
        <div className="absolute inset-x-[90px] bottom-[30px] top-[104px] overflow-hidden rounded-[10px] border border-white/[0.08]" style={{ background: "linear-gradient(135deg, #3b2a5c 0%, #1c2440 60%, #10131c 100%)" }}>
          <motion.div className="absolute left-[38%] top-[24%] h-14 w-14 rounded-full" style={{ background: "radial-gradient(circle, #ffb36b55, transparent 70%)" }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 3, repeat: Infinity }} />
          <span className="absolute bottom-[6px] left-2.5 text-[9px] leading-none text-white/60">▶</span>
          <div className="absolute bottom-[8px] left-7 right-3 h-[3px] rounded-full bg-white/15">
            <motion.div className="h-full rounded-full bg-white/60" animate={{ width: `${18 + step * 6}%` }} transition={{ duration: 0.8, ease: "linear" }} />
          </div>
        </div>
        <KeyFlash combo={shortcut} color={ACCENT.purple} show={step <= 1} top={50} />
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2">
          <div className="relative">
            {listening && (
              <motion.div
                className="pointer-events-none absolute -inset-[5px] rounded-b-[30px]"
                animate={{ opacity: [0.5, 1, 0.6, 0.9], boxShadow: HUM.map((c) => `0 0 ${12 + bars[3] * 16}px 2px ${c}`) }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{ border: `2px solid ${HUM[1]}`, borderTop: "none" }}
              />
            )}
            <motion.div
              className="relative flex items-center overflow-hidden bg-black"
              animate={{ width: step <= 1 ? 92 : found ? 360 : 300, height: step <= 1 ? 26 : found ? 76 : 60 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              style={{ borderBottomLeftRadius: 26, borderBottomRightRadius: 26 }}
            >
              <motion.span
                className="ml-3 flex shrink-0"
                animate={listening ? { rotate: [-8, 8, -8], y: [0, 2, 0] } : { rotate: 0, y: 0 }}
                transition={listening ? { duration: 0.55, repeat: Infinity, ease: "easeInOut" } : undefined}
              >
                <NookFigure look={step <= 1 ? face.look : { ...face.look, head: "headphones" }} color={face.color} size={step <= 1 ? 18 : 38} expression={listening ? "djNod" : found ? "hum" : "idle"} />
              </motion.span>
              <AnimatePresence mode="wait">
                {listening && (
                  <motion.div key="l" className="ml-3 flex flex-1 items-center gap-3 pr-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <span className="text-[12px] font-medium" style={{ color: tintText(ACCENT.purple) }}>{tt("Dinliyor…")}</span>
                    <span className="flex h-8 flex-1 items-center justify-end gap-[3px]">
                      {bars.map((h, i) => (
                        <span key={i} className="w-[3px] rounded-full transition-[height] duration-100" style={{ height: `${h * 100}%`, background: HUM[i % 3] }} />
                      ))}
                    </span>
                  </motion.div>
                )}
                {found && (
                  <motion.div key="f" className="ml-3 flex min-w-0 flex-1 items-center gap-3 pr-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <motion.span className="h-12 w-12 shrink-0 rounded-[10px]" style={{ background: COVER }} initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[13px] font-semibold text-white">Blinding Lights</span>
                      <span className="block truncate text-[11px] text-white/60">The Weeknd</span>
                      <span className="block truncate text-[10px] text-white/35">After Hours · 2020</span>
                    </span>
                    <span className="flex shrink-0 flex-col gap-1">
                      <span className="rounded-full px-2 py-[2px] text-[9.5px] font-medium" style={{ background: "#1db95433", color: "#5be08a" }}>Spotify</span>
                      <span className="rounded-full px-2 py-[2px] text-[9.5px] font-medium" style={{ background: "#ff003333", color: "#ff6b7d" }}>YouTube</span>
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </Screen>
      <div className="flex gap-2">
        <Tip icon={Volume2} color={ACCENT.purple}>{tt("Mikrofonu değil,")}{" "}<b className="font-medium text-label">{tt("bilgisayarın sesini")}</b>{" "}{tt("dinlerim")}</Tip>
        <Tip icon={History} color={ACCENT.pink}>{tt("Bulduklarım")}{" "}<b className="font-medium text-label">{tt("Hum geçmişinde")}</b>{" "}{tt("durur")}</Tip>
        <Tip icon={Music2} color={ACCENT.teal}>{tt("Çalan şarkının")}{" "}<b className="font-medium text-label">{tt("sözleri")}</b>{" "}{tt("Medya'da akar")}</Tip>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Günün düzeni

export function DayArt() {
  const face = useFace();
  const n = useTick(1000);
  const left = 10 - (n % 11);
  const caught = Math.floor(n / 3) % 2 === 1;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex gap-3">
        {/* Takvim: etkinlik yaklaşınca çentikte geri sayım */}
        <div className="min-w-0 flex-1">
          <Screen height={250} bare>
            <Island w={196} h={40} r={18}>
              <div className="flex w-full items-center justify-between px-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ border: `2px solid ${ACCENT.blue}`, color: ACCENT.blue }}>
                  <CalendarClock size={11} />
                </span>
                <NookFigure look={face.look} color={face.color} size={24} expression={left <= 3 ? "surprised" : "idle"} />
                <motion.span className="w-[46px] text-right text-[13px] font-semibold tabular-nums" style={{ color: tintText(ACCENT.blue) }} animate={{ opacity: left <= 3 ? [1, 0.35, 1] : 1 }} transition={{ duration: 1, repeat: Infinity }}>
                  {left ? tt("{0} dk", left) : tt("şimdi")}
                </motion.span>
              </div>
            </Island>
            <div className="absolute inset-x-3.5 bottom-7 space-y-1.5">
              {[
                { t: "10:30", x: tt("Sprint toplantısı"), c: ACCENT.blue, hot: true },
                { t: "14:00", x: tt("Diş hekimi"), c: ACCENT.purple, hot: false },
                { t: "19:00", x: tt("Halı saha"), c: ACCENT.green, hot: false },
              ].map((e) => (
                <motion.div
                  key={e.x}
                  className="flex h-8 items-center gap-2.5 rounded-full border px-3 text-[11.5px]"
                  style={{ background: tintBg(e.c, e.hot ? 16 : 9), borderColor: tintBg(e.c, e.hot ? 44 : 24) }}
                  animate={e.hot && left <= 3 ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                  transition={{ duration: 1, repeat: e.hot && left <= 3 ? Infinity : 0 }}
                >
                  <span className="font-semibold tabular-nums" style={{ color: tintText(e.c) }}>
                    {e.t}
                  </span>
                  <span className="flex-1 truncate text-label">{e.x}</span>
                </motion.div>
              ))}
            </div>
          </Screen>
        </div>
        {/* Odak bekçisi: Pomodoro'da dikkat dağıtan site açılınca Nook cama vurur */}
        <div className="min-w-0 flex-1">
          <Screen height={250} bare>
            <div className="absolute inset-x-3.5 bottom-7 top-[70px] overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#1c1c21]">
              <div className="flex h-[18px] items-center gap-1.5 bg-[#2a2a30] px-2 text-[9.5px] text-white/60">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: caught ? "#ff3b3b" : "#5aa9ff" }} />
                {caught ? "YouTube" : tt("rapor.docx")}
              </div>
              <AnimatePresence mode="wait">
                {caught ? (
                  <motion.div key="yt" className="m-2.5 grid grid-cols-2 gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="h-[52px] rounded-[5px]" style={{ background: ["linear-gradient(135deg,#ff2d55,#7a0018)", "linear-gradient(135deg,#ff9f0a,#7a3b00)", "linear-gradient(135deg,#5e5ce6,#1c1a5c)", "linear-gradient(135deg,#30d158,#0b4a1c)"][i] }} />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="doc" className="m-3 space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {[86, 70, 92, 58, 76].map((w, i) => (
                      <span key={i} className="block h-1.5 rounded-full bg-white/[0.12]" style={{ width: `${w}%` }} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Island w={caught ? 236 : 150} h={caught ? 56 : 34} r={22}>
              <div className="flex w-full items-center gap-2.5 px-3">
                <motion.span className="flex shrink-0" animate={caught ? { scale: [1, 1.14, 1, 1.14, 1] } : { scale: 1 }} transition={{ duration: 0.8, repeat: caught ? Infinity : 0, repeatDelay: 0.5 }}>
                  <NookFigure look={face.look} color={face.color} size={caught ? 32 : 22} expression={caught ? "annoyed" : "read"} />
                </motion.span>
                {caught ? (
                  <motion.span className="min-w-0 leading-tight" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <span className="block truncate text-[12px] font-semibold" style={{ color: tintText(ACCENT.red) }}>{tt("Çalışmıyor muyduk?")}</span>
                    <span className="block truncate text-[10px] text-label-3">{tt("YouTube açık · 14:04 kaldı")}</span>
                  </motion.span>
                ) : (
                  <span className="ml-auto text-[12px] font-semibold tabular-nums" style={{ color: tintText(ACCENT.red) }}>
                    14:0{9 - (n % 3)}
                  </span>
                )}
              </div>
            </Island>
          </Screen>
        </div>
      </div>
      <div className="flex gap-2">
        <Tip icon={CalendarClock} color={ACCENT.blue}>{tt("Etkinlik yaklaşınca")}{" "}<b className="font-medium text-label">{tt("geri sayarım")}</b>
        </Tip>
        <Tip icon={AlarmClock} color={ACCENT.yellow}>{tt("Alarm,")}{" "}<b className="font-medium text-label">{tt("sen kapatana kadar")}</b>{" "}{tt("bekler")}</Tip>
        <Tip icon={Target} color={ACCENT.red}>{tt("Pomodoro'da")}{" "}<b className="font-medium text-label">{tt("dikkatini toplarım")}</b>
        </Tip>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Ekranda dolaşma

function Vignette({ label, color, bg, children }: { label: string; color: string; bg?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="relative h-[262px] overflow-hidden rounded-[16px] border border-white/[0.08]" style={{ background: bg ?? "radial-gradient(120% 100% at 15% 0%, #2a3a55 0%, #171c27 55%, #0f1117 100%)" }}>
        {children}
      </div>
      <span className="flex items-center justify-center gap-1.5 rounded-full border py-1.5 text-[12px] font-medium" style={{ background: tintBg(color, 10), borderColor: tintBg(color, 28), color: tintText(color) }}>
        {label}
      </span>
    </div>
  );
}

/** Pencere sağa sola sürüklenir, tepesindeki Nook geride kalıp sendeler */
function PerchScene() {
  const face = useFace();
  const n = useTick(1500);
  const right = n % 2 === 0;
  return (
    <>
      <motion.div className="absolute top-[110px] h-[112px] w-[116px]" animate={{ left: right ? 46 : 12 }} transition={{ duration: 0.75, ease: "easeInOut" }}>
        <div className="absolute inset-0 overflow-hidden rounded-[7px] bg-[#f2f2f4] shadow-[0_10px_26px_rgba(0,0,0,0.5)]">
          <div className="flex h-[18px] items-center justify-end gap-2 bg-[#e1e1e4] px-2 text-[8px] text-[#555]">
            <span>—</span>
            <span>▢</span>
            <span>✕</span>
          </div>
          <div className="m-2 space-y-1.5">
            {[80, 60, 70].map((w, i) => (
              <span key={i} className="block h-1.5 rounded-full bg-black/10" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
        <motion.div
          className="absolute left-[36px] top-[-40px]"
          style={{ originY: 1 }}
          animate={{ rotate: right ? [0, -26, 14, -7, 3, 0] : [0, 26, -14, 7, -3, 0] }}
          transition={{ duration: 1.3, times: [0, 0.3, 0.5, 0.7, 0.85, 1] }}
        >
          <NookFigure look={face.look} color={face.color} size={42} expression="surprised" />
        </motion.div>
        <motion.span className="absolute left-[70px] top-[2px]" animate={{ left: right ? 40 : 90 }} transition={{ duration: 0.75, ease: "easeInOut" }}>
          <Cursor size={16} />
        </motion.span>
      </motion.div>
    </>
  );
}

/** Ekranın altında çalışırken ipiyle iner; imleç yaklaşınca yukarı kaçar */
function DangleScene() {
  const face = useFace();
  const n = useTick(1500);
  const phase = n % 3;
  const down = phase !== 2;
  return (
    <>
      <div className="absolute left-1/2 top-0 h-[26px] w-[92px] -translate-x-1/2 bg-black" style={{ borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }} />
      <motion.div className="absolute left-1/2 top-[26px]" style={{ originY: 0 }} animate={{ rotate: [-5, 5, -5] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
        <motion.span className="absolute left-[-0.5px] top-0 w-px bg-white/75" animate={{ height: down ? 110 : 0 }} transition={down ? { type: "spring", stiffness: 80, damping: 8 } : { duration: 0.25 }} />
        <motion.div className="absolute left-[-19px]" animate={{ top: down ? 108 : -14, opacity: down ? 1 : 0 }} transition={down ? { type: "spring", stiffness: 80, damping: 8 } : { duration: 0.25 }}>
          <NookFigure look={face.look} color={face.color} size={38} expression={phase === 2 ? "surprised" : "idle"} />
        </motion.div>
      </motion.div>
      <div className="absolute inset-x-0 bottom-0 h-[52px] border-t border-white/[0.06] bg-white/[0.035]">
        <div className="m-2.5 space-y-1.5">
          <span className="block h-1.5 w-2/3 rounded-full bg-white/[0.1]" />
          <span className="block h-1.5 w-1/2 rounded-full bg-white/[0.07]" />
        </div>
      </div>
      <motion.span className="absolute" animate={{ left: phase === 2 ? "52%" : "80%", top: phase === 2 ? 158 : 214 }} transition={{ duration: 0.5 }}>
        <Cursor size={16} />
      </motion.span>
    </>
  );
}

/** Boştayken adanın kenarında olta: bazen parlak yıldız, bazen eski bir dosya */
function FishScene() {
  const face = useFace();
  const n = useTick(1300);
  const step = n % 4;
  const star = Math.floor(n / 4) % 2 === 0;
  const expr: Expression = step === 2 ? "surprised" : step === 3 ? (star ? "happy" : "annoyed") : "drowsy";
  return (
    <>
      <div className="absolute left-[18px] top-0 h-[26px] w-[92px] bg-black" style={{ borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }} />
      <div className="absolute left-[92px] top-[16px]">
        <NookFigure look={face.look} color={face.color} size={34} expression={expr} />
      </div>
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <line x1="120" y1="40" x2="148" y2="16" stroke="#c99a5c" strokeWidth="2.5" strokeLinecap="round" />
        <motion.line x1="148" y1="16" x2="150" stroke="rgba(255,255,255,0.55)" strokeWidth="1" animate={{ y2: step === 3 ? 60 : step === 2 ? 214 : 204 }} transition={{ duration: 0.4 }} />
      </svg>
      {step < 3 && (
        <motion.span className="absolute left-[150px] -ml-[4px] block h-[9px] w-[9px] rounded-full" style={{ background: "linear-gradient(180deg,#ff453a 0 50%,#fff 50%)" }} animate={{ top: step === 2 ? [200, 210, 200, 211] : [198, 201, 198] }} transition={{ duration: 0.9, repeat: Infinity }} />
      )}
      <div className="absolute inset-x-0 bottom-0 h-[56px]" style={{ background: "linear-gradient(180deg, transparent, rgba(80,140,255,0.12))" }} />
      <AnimatePresence>
        {step === 3 && (
          <motion.div key={`c${n}`} className="absolute left-[60px] right-2 top-[70px] flex flex-col items-center" initial={{ opacity: 0, y: 40, scale: 0.4 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}>
            {star ? (
              <svg width="34" height="34" viewBox="0 0 24 24">
                <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z" fill="#ffd23f" stroke="#fff3b0" strokeWidth="0.8" />
              </svg>
            ) : (
              <span className="flex h-9 w-7 items-center justify-center rounded-[4px] border border-white/25 bg-white/10 text-[8px] text-white/70">DOC</span>
            )}
            <span className="mt-1 text-[10px]" style={{ color: star ? "#ffd23f" : "rgba(255,255,255,0.65)" }}>
              {star ? tt("Parlak yıldız!") : tt("eski_ödev_SON.docx")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function OutingsArt() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex gap-2.5">
        <Vignette label={tt("Pencerene tünerim")} color={ACCENT.blue} bg="linear-gradient(160deg,#2b4a6b,#1a2433)">
          <PerchScene />
        </Vignette>
        <Vignette label={tt("İpimle sarkarım")} color={ACCENT.pink}>
          <DangleScene />
        </Vignette>
        <Vignette label={tt("Balık tutarım")} color={ACCENT.teal} bg="radial-gradient(120% 100% at 50% 0%, #1d2031 0%, #0f1015 75%)">
          <FishScene />
        </Vignette>
      </div>
      <p className="px-1 text-[10.5px] text-label-3">{tt("İstemezsen Ayarlar › Nook › Ara sıra dışarı çıksın'ı kapat.")}</p>
    </div>
  );
}

// ---------------------------------------------------------------- Claude Code

export function ClaudeArt() {
  const face = useFace();
  const n = useTick(900);
  const step = n % 9; // 0-1 çalışıyor · 2-5 izin kartı · 6-8 bitti
  const card = step >= 2 && step <= 5;
  const done = step >= 6;
  const press = step === 5;
  return (
    <div className="flex h-full flex-col gap-3">
      <Screen height={226} bare>
        {/* Arkada terminal: Claude çalışıyor */}
        <div className="absolute inset-x-[70px] bottom-[28px] top-[96px] overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#0d0d10] p-2.5 font-mono text-[10px] leading-[1.55] text-white/55">
          <p>
            <span style={{ color: CLAUDE_COLOR }}>✻</span> {tt("Düzenliyor · ClaudePanel.tsx")}
          </p>
          <p className="text-white/35">{"  ⎿  +42 −7"}</p>
          <p>
            <span style={{ color: CLAUDE_COLOR }}>✻</span> {card ? tt("Onay bekliyor · npm run build") : done ? tt("Bitti") : tt("Çalıştırıyor…")}
          </p>
        </div>
        <Island w={card ? 470 : done ? 380 : 120} h={card ? 74 : done ? 58 : 32} r={26}>
          <span className="ml-3 flex shrink-0">
            <NookFigure look={face.look} color={face.color} size={card ? 36 : done ? 32 : 20} expression={done ? "happy" : card ? "surprised" : "read"} />
          </span>
          <AnimatePresence mode="wait">
            {card && (
              <motion.div key="card" className="ml-3 flex min-w-0 flex-1 items-center gap-2 pr-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-[10px] font-medium" style={{ color: tintText(CLAUDE_COLOR) }}>Claude · Nook</p>
                  <p className="truncate text-[12.5px] font-medium text-white">{tt("Komut çalıştırmak istiyor")}</p>
                  <p className="truncate font-mono text-[10px] text-white/55">npm run build</p>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: tintBg(ACCENT.red, 14), color: tintText(ACCENT.red) }}>
                  <X size={13} strokeWidth={2.4} />
                </span>
                <motion.span
                  className="flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-medium"
                  animate={{ scale: press ? [1, 0.88, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                  style={{ background: tintBg(ACCENT.green, press ? 42 : 24), borderColor: tintBg(ACCENT.green, 60), color: tintText(ACCENT.green) }}
                >
                  <Check size={12} strokeWidth={2.6} /> {tt("İzin ver")}
                </motion.span>
              </motion.div>
            )}
            {done && (
              <motion.div key="done" className="ml-3 min-w-0 flex-1 pr-4 leading-tight" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className="truncate text-[12.5px] font-medium" style={{ color: tintText(CLAUDE_COLOR) }}>
                  {tt("Claude bitirdi · Nook · 4 dk")}
                </p>
                <p className="truncate text-[10.5px] text-white/55">{tt("Derleme tamam, kurulum dosyası hazır.")}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Island>
        <motion.span
          className="absolute z-20"
          initial={false}
          animate={step >= 3 && step <= 5 ? { left: "77%", top: 46, opacity: 1 } : { left: "64%", top: 170, opacity: card ? 1 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <Cursor />
        </motion.span>
      </Screen>
      {/* Plan limiti */}
      <div className="flex items-center gap-4 rounded-[16px] bg-well px-3.5 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: tintBg(CLAUDE_COLOR, 20), color: tintText(CLAUDE_COLOR) }}>
          <Terminal size={15} strokeWidth={2.2} />
        </span>
        {[
          { l: tt("5 saat"), p: 37, c: ACCENT.green },
          { l: tt("Hafta"), p: 62, c: ACCENT.orange },
        ].map((x) => (
          <div key={x.l} className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between text-[11.5px]">
              <span className="text-label-2">{x.l}</span>
              <span className="font-medium tabular-nums" style={{ color: tintText(x.c) }}>
                {pct(x.p)}
              </span>
            </div>
            <Bar pct={x.p} color={x.c} className="mt-1" />
          </div>
        ))}
        <span className="w-[120px] shrink-0 text-[10.5px] leading-snug text-label-3">{tt("Plan limitin %80'e gelince ve dolunca haber veririm")}</span>
      </div>
    </div>
  );
}
