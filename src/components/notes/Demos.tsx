/**
 * Yama notlarının görselleri: her biri küçük, kendi kendine dönen bir sahne. Nook'lar gerçek 3B
 * çizimle (NookFigure), geçiş ve açılış önizlemeleri Ayarlar'dakiyle aynı bileşenler.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlarmClock, Bell, Check, CloudSun, FileArchive, FileText, Folder, LockKeyhole, Maximize2, MousePointer2, Move, RotateCw, Music, ScrollText, Sparkles } from "lucide-react";
import { CHIP_NOOKS, DEFAULT_LOOK, HALLOWEEN, normalizeColor, normalizeLook, SHOWCASE, type Look } from "../../lib/look";
import type { DemoId } from "../../lib/notes";
import { useNook } from "../../store/nook";
import { NookFigure } from "../mascot/Figure";
import { OldFile, Star } from "../outings/Parts";
import { PALETTES } from "../../lib/palette";
import { IntroPreview, MovePreview } from "../panels/EffectPreview";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { DEMOS2 } from "./Demos2";
import { DEMOS3 } from "./Demos3";
import { DEMOS4 } from "./Demos4";
import { DEMOS5 } from "./Demos5";

/** Her `ms`'de bir artan sayaç (sahneler kendini tekrarlasın) */
function useTick(ms: number) {
  const [n, setN] = useState(1);
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

const Stage = ({ children, bg }: { children: React.ReactNode; bg?: string }) => (
  <div className="relative h-full w-full overflow-hidden rounded-[14px]" style={{ background: bg ?? "radial-gradient(120% 100% at 50% 0%, #1d2031 0%, #0f1015 75%)" }}>
    {children}
  </div>
);

/** Ekranın üstüne yapışık mini ada */
const MiniIsland = ({ width = 128, height = 34, radius = 14, children }: { width?: number; height?: number; radius?: number; children?: React.ReactNode }) => (
  <div className="flex items-center justify-center bg-black" style={{ width, height, borderBottomLeftRadius: radius, borderBottomRightRadius: radius }}>
    {children}
  </div>
);

function Halloween() {
  return (
    <Stage bg="radial-gradient(90% 120% at 50% 110%, #ff7a1a55 0%, #2a1240 45%, #0e0a16 85%)">
      {/* Uçuşan yarasalar */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute block text-[13px]"
          style={{ top: 8 + i * 14, left: -20 }}
          animate={{ x: [0, 320], y: [0, -6, 4, -8, 0] }}
          transition={{ duration: 4.5 + i, repeat: Infinity, delay: i * 1.3, ease: "linear" }}
        >
          🦇
        </motion.span>
      ))}
      <div className="absolute inset-x-0 bottom-3 flex items-end justify-center gap-2">
        {HALLOWEEN.slice(0, 5).map((h, i) => (
          <motion.div key={h.name} animate={{ y: [0, -7, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}>
            <NookFigure look={h.look} color={h.color} size={i === 2 ? 68 : 58} expression={i % 2 ? "happy" : "idle"} />
          </motion.div>
        ))}
      </div>
    </Stage>
  );
}

function NotesStack() {
  const n = useTick(1800);
  const cards = ["0.2.29", "0.2.28", "0.2.27"];
  return (
    <Stage>
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <MiniIsland width={150}>
          <ScrollText size={13} className="mr-1.5" style={{ color: tintText(ACCENT.yellow) }} />
          <span className="text-[10.5px] font-medium text-label">{tt("Yama notları")}</span>
        </MiniIsland>
      </div>
      <div className="absolute inset-x-0 top-[62px] flex justify-center">
        {cards.map((v, i) => {
          const k = (i + n) % 3;
          return (
            <motion.div
              key={v}
              className="absolute w-[170px] rounded-[10px] border px-2.5 py-2"
              style={{ background: "#1c1c21", borderColor: tintBg(ACCENT.yellow, k === 0 ? 50 : 18) }}
              animate={{ y: -k * 10, scale: 1 - k * 0.07, opacity: 1 - k * 0.3, zIndex: 3 - k }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
            >
              <div className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: tintText(ACCENT.yellow) }}>
                <Sparkles size={10} /> {v}
              </div>
              <div className="mt-1 h-1 w-[80%] rounded-full bg-white/15" />
              <div className="mt-1 h-1 w-[55%] rounded-full bg-white/10" />
            </motion.div>
          );
        })}
      </div>
    </Stage>
  );
}

function LoopMove() {
  const n = useTick(2000);
  return (
    <Stage bg="#141519">
      <div className="flex h-full flex-col justify-center px-3 pt-1">
        <MovePreview style="random" run={n} />
      </div>
    </Stage>
  );
}

function LoopIntro() {
  const n = useTick(3900);
  return (
    <Stage bg="#141519">
      <div className="flex h-full flex-col justify-center px-3 pt-1">
        <IntroPreview style="random" run={n} />
      </div>
    </Stage>
  );
}

function NoGlow() {
  const face = useFace();
  const n = useTick(2600);
  const fixed = n % 2 === 0;
  return (
    <Stage>
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <motion.div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-full"
          style={{ width: 210, height: 80, background: "radial-gradient(closest-side, rgba(160,190,255,0.55), transparent)", filter: "blur(8px)" }}
          animate={{ opacity: fixed ? 0 : 1 }}
          transition={{ duration: 0.6 }}
        />
        <div className="relative">
          <MiniIsland>
            <NookFigure look={face.look} color={face.color} size={20} />
          </MiniIsland>
        </div>
      </div>
      <motion.div
        className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
        animate={{ opacity: 1 }}
        style={{ background: tintBg(fixed ? ACCENT.green : ACCENT.red, 18), color: tintText(fixed ? ACCENT.green : ACCENT.red) }}
      >
        {fixed ? <Check size={10} strokeWidth={3} /> : null}
        {fixed ? tt("0.2.27: ışık yok") : tt("Önce: arkada ışık")}
      </motion.div>
    </Stage>
  );
}

function Reload() {
  const face = useFace();
  const n = useTick(2400);
  const [phase, setPhase] = useState<"menu" | "spin" | "ok">("menu");
  useEffect(() => {
    setPhase("menu");
    const a = window.setTimeout(() => setPhase("spin"), 900);
    const b = window.setTimeout(() => setPhase("ok"), 1500);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [n]);
  return (
    <Stage>
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <motion.div animate={phase === "ok" ? { scale: [1, 1.08, 1] } : { scale: 1 }} style={{ originY: 0 }}>
          <MiniIsland>
            <NookFigure look={face.look} color={face.color} size={20} expression={phase === "ok" ? "happy" : "idle"} />
          </MiniIsland>
        </motion.div>
      </div>
      <AnimatePresence>
        {phase === "menu" && (
          <motion.div
            key="menu"
            className="absolute left-[56%] top-[44%] w-[96px] rounded-[10px] border border-white/10 bg-[#1b1b1e] p-1 text-[10px]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="rounded-[6px] px-1.5 py-1 text-label-3">{tt("Görünüm")}</div>
            <div className="flex items-center gap-1 rounded-[6px] bg-white/10 px-1.5 py-1 text-label">
              <RotateCw size={10} />{" "}{tt("Yenile")}</div>
          </motion.div>
        )}
      </AnimatePresence>
      {phase === "spin" && (
        <motion.div className="absolute left-1/2 top-[52%] -translate-x-1/2 text-label-2" animate={{ rotate: 360 }} transition={{ duration: 0.6, ease: "linear" }}>
          <RotateCw size={18} />
        </motion.div>
      )}
    </Stage>
  );
}

/** Görünümler arasında dönen tek Nook */
function Morph({ looks }: { looks: { look: Look; color: string }[] }) {
  const n = useTick(1300);
  const cur = looks[n % looks.length];
  return (
    <Stage>
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={n}
            initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.4, opacity: 0, rotate: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 20 }}
          >
            <NookFigure look={cur.look} color={cur.color} size={62} expression="happy" />
          </motion.div>
        </AnimatePresence>
      </div>
    </Stage>
  );
}

const SHAPE_TOUR: { look: Look; color: string }[] = [
  { look: { ...DEFAULT_LOOK, shape: "blob", texture: "plush", head: "cap" }, color: "#2FD4C0" },
  { look: { ...DEFAULT_LOOK, shape: "bean", texture: "plush", head: "ears" }, color: "#FF5C8A" },
  { look: { ...DEFAULT_LOOK, shape: "sphere", texture: "plush", head: "sprout" }, color: "#FFD21F" },
  { look: { ...DEFAULT_LOOK, shape: "blob", texture: "plush", head: "flower" }, color: "#FF6A3D" },
  { look: { ...DEFAULT_LOOK, shape: "sphere", head: "star" }, color: "#9B7BFF" },
  { look: { ...DEFAULT_LOOK, shape: "blob", texture: "plush", head: "stalks" }, color: "#8FE03A" },
];

const LOOK_TOUR: { look: Look; color: string }[] = [
  { look: { ...DEFAULT_LOOK }, color: "#F4F4F6" },
  { look: { ...DEFAULT_LOOK, shape: "cloud", texture: "plush", head: "beret" }, color: "#2B8CFF" },
  { look: { ...DEFAULT_LOOK, shape: "heart", glasses: "shades" }, color: "#E23BD6" },
  { look: { ...DEFAULT_LOOK, shape: "triangle", glasses: "round" }, color: "#FFD21F" },
  { look: { ...DEFAULT_LOOK, shape: "bean", head: "bowler", neck: "bowtie" }, color: "#FF6A3D" },
  { look: { ...DEFAULT_LOOK, shape: "flower", head: "headphones" }, color: "#8FE03A" },
];

const GLASSES_TOUR: { look: Look; color: string }[] = [
  { look: { ...DEFAULT_LOOK, glasses: "round" }, color: "#FFD21F" },
  { look: { ...DEFAULT_LOOK, glasses: "bold" }, color: "#2FD4C0" },
  { look: { ...DEFAULT_LOOK, glasses: "shades" }, color: "#FF5C8A" },
  { look: { ...DEFAULT_LOOK, glasses: "monocle" }, color: "#9B7BFF" },
];

function Crowd() {
  return (
    <Stage bg="#050507">
      <motion.div
        className="absolute inset-x-0 top-1 text-center font-display text-[34px] font-semibold tracking-[-0.04em]"
        style={{
          background: "linear-gradient(90deg, #8fd3ff, #fff, #ffd76e, #ff9be0)",
          WebkitBackgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 0 10px rgba(180,160,255,0.6))",
        }}
        animate={{ opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      >
        nook
      </motion.div>
      <div className="absolute inset-x-0 -bottom-3 flex items-end justify-center -space-x-2">
        {SHOWCASE.slice(6).map((m, i) => (
          <motion.div key={m.name} animate={{ y: [0, -4, 0] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}>
            <NookFigure look={m.look} color={m.color} size={44} />
          </motion.div>
        ))}
      </div>
    </Stage>
  );
}

function Fullscreen() {
  const face = useFace();
  const n = useTick(2400);
  const big = n % 2 === 0;
  return (
    <Stage>
      <div className="absolute inset-0 flex justify-center">
        <motion.div
          className="relative flex items-center justify-center bg-black"
          animate={big ? { width: 240, height: 104, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 } : { width: 150, height: 58, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
        >
          <motion.div animate={{ scale: big ? 1.4 : 1 }}>
            <NookFigure look={face.look} color={face.color} size={26} />
          </motion.div>
          <Maximize2 size={10} className="absolute right-2 top-2 text-label-3" />
        </motion.div>
      </div>
    </Stage>
  );
}

function Alarm() {
  const face = useFace();
  return (
    <Stage bg="linear-gradient(160deg, #1b3a24 0%, #0f1a12 60%, #0a0d0b 100%)">
      <div className="absolute bottom-2 left-3 text-[9px] uppercase tracking-[0.18em] text-white/30">{tt("oyun")}</div>
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <MiniIsland width={180} height={42} radius={18}>
          <NookFigure look={face.look} color={face.color} size={24} expression="surprised" />
          <motion.span className="ml-2" animate={{ rotate: [0, -18, 18, -12, 12, 0] }} transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 0.5 }}>
            <Bell size={14} style={{ color: tintText(ACCENT.yellow) }} />
          </motion.span>
          <span className="ml-1.5 text-[11px] font-semibold tabular-nums text-label">07:30</span>
        </MiniIsland>
      </div>
    </Stage>
  );
}

/** Ada üstten tutulup ekranın başka yerine taşınır, sonra "Ortala" ile döner */
function Drag() {
  const face = useFace();
  const n = useTick(1400);
  const spots = [
    { x: 0, y: 0, top: true },
    { x: -70, y: 52, top: false },
    { x: 80, y: 86, top: false },
    { x: 0, y: 0, top: true },
  ];
  const p = spots[n % spots.length];
  return (
    <Stage>
      <motion.div
        className="absolute left-1/2 top-0"
        animate={{ x: p.x - 64, y: p.y }}
        transition={{ type: "spring", stiffness: 140, damping: 18 }}
      >
        <motion.div
          className="relative flex h-[34px] w-[128px] items-center justify-center bg-black"
          animate={{ borderRadius: p.top ? "0px 0px 14px 14px" : "14px 14px 14px 14px" }}
          style={{ boxShadow: p.top ? "none" : "0 6px 16px -6px rgba(0,0,0,0.8)" }}
        >
          <NookFigure look={face.look} color={face.color} size={20} />
          <Move size={9} className="absolute right-2 top-1/2 -translate-y-1/2 text-label-3" />
        </motion.div>
        <MousePointer2 size={14} className="absolute right-0 top-4 text-white drop-shadow" fill="white" />
      </motion.div>
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{ background: tintBg(ACCENT.blue, 18), color: tintText(ACCENT.blue) }}
      >
        {n % spots.length === 3 ? tt("Ortala") : tt("Sürükle · bırak")}
      </div>
    </Stage>
  );
}

/** Ana sayfadaki Görünüm çipi, dokununca Nook kostüm değiştirir */
function LookChip() {
  const n = useTick(1300);
  const cur = HALLOWEEN[n % HALLOWEEN.length];
  return (
    <Stage>
      <div className="absolute inset-0 flex items-center justify-center gap-4">
        <motion.div
          className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-3"
          style={{ background: tintBg(ACCENT.pink, 12), borderColor: tintBg(ACCENT.pink, 34) }}
          animate={{ scale: [1, 0.94, 1] }}
          transition={{ duration: 0.35, repeat: Infinity, repeatDelay: 0.95 }}
        >
          <span className="h-6 w-6 rounded-full" style={{ background: ACCENT.pink }} />
          <span className="text-[12px] font-medium" style={{ color: tintText(ACCENT.pink) }}>{tt("Görünüm")}</span>
        </motion.div>
        <AnimatePresence mode="popLayout">
          <motion.div key={n} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
            <NookFigure look={cur.look} color={cur.color} size={52} />
          </motion.div>
        </AnimatePresence>
      </div>
    </Stage>
  );
}

/** Beş oyunun mini Nook'ları sırayla zıplar */
function Games() {
  const n = useTick(500);
  const games = [
    { c: ACCENT.pink, t: tt("Yakala") },
    { c: ACCENT.blue, t: tt("Hafıza") },
    { c: ACCENT.orange, t: tt("Köstebek") },
    { c: ACCENT.purple, t: tt("Eşleştir") },
    { c: ACCENT.green, t: tt("Zıpla") },
  ];
  return (
    <Stage>
      <div className="absolute inset-0 flex items-center justify-center gap-2.5">
        {games.map((g, i) => (
          <div key={g.t} className="flex flex-col items-center gap-1">
            <motion.div animate={{ y: n % games.length === i ? -10 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 14 }}>
              <span className="block h-7 w-7 rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${g.c} 55%, white) 0%, ${g.c} 45%, color-mix(in srgb, ${g.c} 70%, black) 100%)` }} />
            </motion.div>
            <span className="text-[9.5px]" style={{ color: tintText(g.c) }}>
              {g.t}
            </span>
          </div>
        ))}
      </div>
    </Stage>
  );
}

/** Uygulama sesleri: kaydırıcılar kendi kendine iner çıkar */
function Mixer() {
  const n = useTick(1100);
  const rows = ["Spotify", "Discord", "Chrome"];
  return (
    <Stage>
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 space-y-1.5">
        {rows.map((r, i) => {
          const v = [0.8, 0.35, 0.6][i] + (((n + i) % 3) - 1) * 0.15;
          return (
            <div key={r} className="flex items-center gap-2 rounded-[10px] bg-white/[0.05] px-2 py-1">
              <span className="w-[54px] text-[10px] text-label">{r}</span>
              <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full" style={{ background: ACCENT.pink }} animate={{ width: `${v * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Stage>
  );
}

/** Arşivden bir dosya tutulup dışarı sürüklenir */
function ArchiveDemo() {
  const n = useTick(1800);
  const out = n % 2 === 0;
  return (
    <Stage>
      <div className="absolute left-4 top-3 w-[150px] rounded-[10px] border border-white/10 bg-black/60 p-1.5">
        <div className="mb-1 flex items-center gap-1 text-[10px] text-label">
          <FileArchive size={11} style={{ color: tintText(ACCENT.orange) }} />{" "}{tt("ödev.zip")}</div>
        {[tt("Görseller"), "rapor.pdf", "not.txt"].map((f, i) => (
          <div key={f} className="flex items-center gap-1 rounded px-1 py-0.5 text-[9.5px] text-label-2" style={i === 1 ? { background: "rgb(255 255 255 / 0.07)" } : undefined}>
            {i === 0 ? <Folder size={10} style={{ color: tintText(ACCENT.yellow) }} /> : <FileText size={10} />} {f}
          </div>
        ))}
      </div>
      <motion.div
        className="absolute flex items-center gap-1 rounded-[8px] bg-white/10 px-1.5 py-0.5 text-[9.5px] text-label"
        animate={out ? { left: "64%", top: "58%", opacity: 1 } : { left: "16%", top: "38%", opacity: 0 }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      >
        <FileText size={10} />{" "}{tt("rapor.pdf")}<MousePointer2 size={12} className="ml-1 text-white" fill="white" />
      </motion.div>
      <div className="absolute bottom-3 right-4 flex h-10 w-14 items-center justify-center rounded-[8px] border border-dashed border-white/20 text-[9px] text-label-3">{tt("Masaüstü")}</div>
    </Stage>
  );
}

/** Ekranı kaplayan gece ve uyuyan Nook'lar */
function ShieldDemo() {
  const face = useFace();
  const n = useTick(2200);
  const on = n % 2 === 0;
  return (
    <Stage bg="#1b1d27">
      <div className="absolute inset-3 rounded-[8px] bg-[#2a3142] p-2 text-[9px] text-label-3">
        <div className="mb-1 h-1.5 w-1/2 rounded bg-white/20" />
        <div className="mb-1 h-1.5 w-3/4 rounded bg-white/10" />
        <div className="h-1.5 w-2/3 rounded bg-white/10" />
      </div>
      <motion.div
        className="absolute inset-3 flex flex-col items-center justify-center rounded-[8px]"
        style={{ background: "radial-gradient(120% 90% at 50% 40%, #1a1830 0%, #0c0b18 60%, #050509 100%)" }}
        animate={{ opacity: on ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        <NookFigure look={face.look} color={face.color} size={46} expression="sleepy" />
        <span className="mt-1 text-[9.5px] text-white/60">{tt("Şşş… · Ctrl+Alt+H")}</span>
      </motion.div>
    </Stage>
  );
}

/** Kopyalanan kart numarası kilitlenir, sayaç sıfıra iner */
function SensitiveDemo() {
  const n = useTick(1000);
  const left = 60 - ((n * 10) % 60);
  return (
    <Stage>
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <div className="flex h-[40px] w-[230px] items-center gap-2 bg-black px-3" style={{ borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
          <LockKeyhole size={14} style={{ color: tintText(ACCENT.yellow) }} />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[10.5px] font-medium text-label">{tt("Hassas veri · Kart numarası")}</span>
            <span className="block text-[9px] text-label-3">{left}{" "}{tt("sn sonra panodan silinecek")}</span>
          </span>
        </div>
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-[8px] bg-white/[0.06] px-2 py-1 font-mono text-[10px] tracking-wider text-label-2">4111 •••• •••• 1111</div>
    </Stage>
  );
}

/** Çiplerin giyinik Nook'ları sırayla zıplar */
function Chips() {
  const n = useTick(700);
  const list = Object.values(CHIP_NOOKS).slice(0, 6);
  return (
    <Stage>
      <div className="absolute inset-0 flex items-center justify-center gap-3">
        {list.map((c, i) => (
          <motion.div key={i} animate={{ y: n % list.length === i ? -10 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 14 }}>
            <NookFigure look={c.look} color={c.color} size={34} />
          </motion.div>
        ))}
      </div>
    </Stage>
  );
}

/** Pencere sağa sola taşınır, üstündeki Nook geride kalıp sendeler */
function PerchDemo() {
  const face = useFace();
  const n = useTick(1400);
  const right = n % 2 === 0;
  return (
    <Stage bg="linear-gradient(160deg,#2b4a6b,#1a2433)">
      <motion.div className="absolute top-[58px] h-[90px] w-[170px]" animate={{ left: right ? 120 : 30 }} transition={{ duration: 0.7, ease: "easeInOut" }}>
        <div className="absolute inset-0 overflow-hidden rounded-[6px] bg-[#f0f0f0] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          <div className="flex h-[18px] items-center justify-end gap-2 bg-[#e2e2e2] px-2 text-[8px] text-[#444]">
            <span>—</span>
            <span>▢</span>
            <span>✕</span>
          </div>
        </div>
        <motion.div
          className="absolute left-[56px] top-[-31px]"
          style={{ originY: 1 }}
          animate={{ rotate: right ? [0, -26, 14, -7, 3, 0] : [0, 26, -14, 7, -3, 0] }}
          transition={{ duration: 1.3, times: [0, 0.3, 0.5, 0.7, 0.85, 1] }}
        >
          <NookFigure look={face.look} color={face.color} size={34} expression="surprised" />
        </motion.div>
      </motion.div>
    </Stage>
  );
}

/** Ekranın altında çalışırken Nook ipiyle iner; imleç yaklaşınca kaçar */
function DangleDemo() {
  const face = useFace();
  const n = useTick(1600);
  const phase = n % 3; // 0 iner, 1 izler, 2 imleç gelir ve kaçar
  const down = phase !== 2;
  return (
    <Stage>
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <MiniIsland />
      </div>
      <motion.div className="absolute left-1/2 top-[34px]" style={{ originY: 0 }} animate={{ rotate: [-4, 4, -4] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
        <motion.span className="absolute left-[-0.5px] top-0 w-px bg-white/70" animate={{ height: down ? 56 : 0 }} transition={down ? { type: "spring", stiffness: 90, damping: 8 } : { duration: 0.25 }} />
        <motion.div className="absolute left-[-14px]" animate={{ top: down ? 56 : -10, opacity: down ? 1 : 0 }} transition={down ? { type: "spring", stiffness: 90, damping: 8 } : { duration: 0.25 }}>
          <NookFigure look={face.look} color={face.color} size={28} expression={phase === 2 ? "surprised" : "idle"} />
        </motion.div>
      </motion.div>
      <motion.div className="absolute" animate={{ left: phase === 2 ? "46%" : "78%", top: phase === 2 ? 122 : 150 }} transition={{ duration: 0.5 }}>
        <MousePointer2 size={16} className="fill-white text-black" />
      </motion.div>
    </Stage>
  );
}

/** Boşta: adanın kenarında olta, bazen yıldız bazen eski dosya */
function FishingDemo() {
  const face = useFace();
  const n = useTick(1500);
  const step = n % 4; // 0-1 bekler, 2 vurdu, 3 çıkardı
  const star = Math.floor(n / 4) % 2 === 0;
  return (
    <Stage>
      <div className="absolute left-1/2 top-0 -translate-x-[70%]">
        <MiniIsland />
      </div>
      <div className="absolute left-[52%] top-[22px]">
        <NookFigure look={face.look} color={face.color} size={26} expression={step === 2 ? "surprised" : step === 3 ? (star ? "happy" : "annoyed") : "drowsy"} />
      </div>
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <line x1="57%" y1="44" x2="72%" y2="18" stroke="#c99a5c" strokeWidth="2" strokeLinecap="round" />
        <motion.line x1="72%" y1="18" x2="73%" stroke="rgba(255,255,255,0.55)" strokeWidth="1" animate={{ y2: step === 3 ? 40 : step === 2 ? 142 : 134 }} transition={{ duration: 0.4 }} />
      </svg>
      {step < 3 && (
        <motion.span className="absolute left-[73%] -ml-[3px] block h-[7px] w-[7px] rounded-full" style={{ background: "linear-gradient(180deg,#ff453a 0 50%,#fff 50%)" }} animate={{ top: step === 2 ? [131, 139, 131, 140] : [128, 130, 128] }} transition={{ duration: 0.9, repeat: Infinity }} />
      )}
      <AnimatePresence>
        {step === 3 && (
          <motion.div key={`c${n}`} className="absolute left-[50%] top-[54px] flex flex-col items-center" initial={{ opacity: 0, y: 20, scale: 0.4 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}>
            {star ? <Star size={24} /> : <OldFile size={18} />}
            <span className="mt-0.5 text-[9px]" style={{ color: star ? "#ffd23f" : "rgba(255,255,255,0.6)" }}>
              {star ? tt("Parlak yıldız!") : tt("eski_ödev_SON.docx")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </Stage>
  );
}

/** Pomodoro'da YouTube açılınca Nook cama vurur */
function GuardDemo() {
  const face = useFace();
  const n = useTick(2400);
  const caught = n % 2 === 0;
  return (
    <Stage>
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <motion.div className="flex items-center gap-2 overflow-hidden bg-black px-3" animate={{ width: caught ? 270 : 150, height: caught ? 54 : 30 }} style={{ borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }} transition={{ type: "spring", stiffness: 380, damping: 30 }}>
          <motion.div animate={caught ? { scale: [1, 1.12, 1, 1.12, 1] } : { scale: 1 }} transition={{ duration: 0.8, repeat: caught ? Infinity : 0, repeatDelay: 0.6 }}>
            <NookFigure look={face.look} color={face.color} size={caught ? 30 : 20} expression={caught ? "annoyed" : "read"} />
          </motion.div>
          {caught && (
            <span className="min-w-0 whitespace-nowrap leading-tight">
              <span className="block text-[11px] font-semibold" style={{ color: tintText(ACCENT.red) }}>{tt("Çalışmıyor muyduk?")}</span>
              <span className="block text-[9px] text-label-3">{tt("YouTube açık · 14:04 kaldı")}</span>
            </span>
          )}
        </motion.div>
      </div>
      <div className="absolute inset-x-5 bottom-3 top-[64px] overflow-hidden rounded-[6px] bg-[#202024]">
        <div className="flex h-[14px] items-center bg-[#2c2c31] px-2 text-[8px] text-white/50">{caught ? "YouTube" : "rapor.docx"}</div>
        <div className="m-2 h-[40px] rounded" style={{ background: caught ? "linear-gradient(135deg,#ff0033,#7a0018)" : "rgba(255,255,255,0.06)" }} />
      </div>
    </Stage>
  );
}

/** Meşgul çip nefes alır, boş çip soluk kalır */
function GlowDemo() {
  const rows = [
    { id: "media", label: tt("Medya"), sub: "Blinding Lights", color: ACCENT.pink, state: "active" },
    { id: "focus", label: "Pomodoro", sub: tt("Odak · 14:04"), color: ACCENT.red, state: "active" },
    { id: "shelf", label: tt("Raf"), sub: tt("Boş"), color: ACCENT.teal, state: "empty" },
    { id: "note", label: tt("Not"), sub: tt("Boş"), color: ACCENT.orange, state: "empty" },
  ];
  return (
    <Stage>
      <div className="absolute inset-4 grid grid-cols-2 content-center gap-2">
        {rows.map((r, i) => {
          const c = CHIP_NOOKS[r.id];
          const on = r.state === "active";
          return (
            <div key={r.id} className="relative">
              {on && (
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{ boxShadow: `0 0 16px -3px ${r.color}` }}
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.4 }}
                />
              )}
              <div className="relative flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2" style={{ background: tintBg(r.color, on ? 18 : 7), borderColor: tintBg(r.color, on ? 62 : 20), opacity: on ? 1 : 0.6 }}>
                <motion.span animate={on ? { y: [0, -1.6, 0], rotate: [-5, 5, -5] } : {}} transition={{ duration: 1, repeat: Infinity }}>
                  <NookFigure look={c.look} color={c.color} size={20} expression={on ? "happy" : "drowsy"} />
                </motion.span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[10.5px] font-medium" style={{ color: tintText(r.color) }}>{r.label}</span>
                  <span className="block truncate text-[9px] text-label-3">{r.sub}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Stage>
  );
}

/** Nook'un yanındaki "şu an" kartları */
function NowCards() {
  const face = useFace();
  const n = useTick(1000);
  const rows = [
    { icon: Music, title: "Blinding Lights", sub: "The Weeknd", color: ACCENT.pink, p: ((n * 7) % 100) / 100 },
    { icon: AlarmClock, title: tt("Toplantı"), sub: tt("2 sa 10 dk sonra"), value: "14:00", color: ACCENT.yellow },
    { icon: CloudSun, title: tt("İstanbul"), sub: tt("Parçalı bulutlu"), value: "18°", color: ACCENT.blue },
  ];
  return (
    <Stage>
      <div className="absolute inset-0 flex items-center gap-3 px-4">
        <NookFigure look={face.look} color={face.color} size={52} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {rows.map((r, i) => (
            <div key={r.title} className="relative flex items-center gap-1.5 overflow-hidden rounded-[10px] border px-1.5 py-1" style={{ background: i === 0 ? tintBg(r.color, 10) : "rgb(255 255 255 / 0.03)", borderColor: i === 0 ? tintBg(r.color, 30) : "rgb(255 255 255 / 0.05)" }}>
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full" style={{ background: tintBg(r.color, 20), color: r.color }}>
                <r.icon size={10} strokeWidth={2.4} />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[10.5px] font-medium text-label">{r.title}</span>
                <span className="block truncate text-[8.5px] text-label-3">{r.sub}</span>
              </span>
              {r.value && <span className="text-[10px] font-semibold tabular-nums text-label-2">{r.value}</span>}
              {r.p != null && (
                <span className="absolute inset-x-1.5 bottom-[2px] h-[2px] rounded-full bg-white/[0.06]">
                  <motion.span className="block h-full rounded-full" style={{ background: r.color }} animate={{ width: `${r.p * 100}%` }} />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </Stage>
  );
}

const NEW_BODIES: { look: Look; color: string }[] = [
  { look: { ...DEFAULT_LOOK, shape: "cube" }, color: "#FF5C8A" },
  { look: { ...DEFAULT_LOOK, shape: "egg", texture: "matte" }, color: "#FFE3A8" },
  { look: { ...DEFAULT_LOOK, shape: "star", texture: "jelly" }, color: "#FFD21F" },
  { look: { ...DEFAULT_LOOK, shape: "cat", texture: "plush" }, color: "#FF8A1F" },
  { look: { ...DEFAULT_LOOK, shape: "bear", texture: "plush" }, color: "#B5651D" },
];
const NEW_TEXTURES: { look: Look; color: string }[] = [
  { look: { ...DEFAULT_LOOK, texture: "matte" }, color: "#16C47F" },
  { look: { ...DEFAULT_LOOK, texture: "jelly" }, color: "#00B8FF" },
  { look: { ...DEFAULT_LOOK, texture: "metal" }, color: "#8A8F99" },
  { look: { ...DEFAULT_LOOK, texture: "spots" }, color: "#FF3B4A" },
];

/** Yeni renkler sırayla dalga yapar */
function Colors() {
  const n = useTick(150);
  const list = ["#FF3B4A", "#00B8FF", "#16C47F", "#C9F23A", "#6B4BFF", "#FF9EC4", "#B5651D", "#FFE3A8", "#8A8F99", "#1E3A8A"];
  return (
    <Stage>
      <div className="absolute inset-0 flex flex-wrap content-center items-center justify-center gap-1.5 px-4">
        {list.map((c, i) => (
          <motion.div key={c} animate={{ y: n % list.length === i ? -8 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 16 }}>
            <NookFigure look={DEFAULT_LOOK} color={c} size={30} />
          </motion.div>
        ))}
      </div>
    </Stage>
  );
}

/** Aynı Nook, dokuz dilde selam verir */
function LangDemo() {
  const face = useFace();
  const n = useTick(1100);
  const hellos = ["Merhaba, ben Nook", "Hi, I'm Nook", "Hola, soy Nook", "Olá, eu sou o Nook", "Hallo, ich bin Nook", "Salut, je suis Nook", "Привет, я Nook", "你好，我是 Nook", "こんにちは、Nook です"];
  return (
    <Stage>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 1.1, repeat: Infinity }}>
          <NookFigure look={face.look} color={face.color} size={46} expression="happy" />
        </motion.div>
        <AnimatePresence mode="wait">
          <motion.span key={n % hellos.length} className="rounded-full bg-white/[0.07] px-3 py-1 text-[12px] font-medium text-label" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            {hellos[n % hellos.length]}
          </motion.span>
        </AnimatePresence>
      </div>
    </Stage>
  );
}

/** Mini ada %80'den %150'ye büyür */
function ScaleDemo() {
  const face = useFace();
  const n = useTick(1200);
  const scales = [0.8, 1, 1.3, 1.5, 1];
  const k = scales[n % scales.length];
  return (
    <Stage>
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <motion.div className="flex items-center justify-center bg-black" style={{ originY: 0 }} animate={{ width: 128 * k, height: 34 * k, borderBottomLeftRadius: 14 * k, borderBottomRightRadius: 14 * k }} transition={{ type: "spring", stiffness: 300, damping: 26 }}>
          <motion.div animate={{ scale: k }}>
            <NookFigure look={face.look} color={face.color} size={22} />
          </motion.div>
        </motion.div>
      </div>
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/[0.07] px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-label-2">%{Math.round(k * 100)}</span>
    </Stage>
  );
}

/** Aynı çipler normal ve renk körü paletlerinde */
function CvdDemo() {
  const n = useTick(1500);
  const kinds = ["normal", "protan", "deutan", "tritan"] as const;
  const p = PALETTES[kinds[n % kinds.length]];
  const chips = [p.red, p.green, p.yellow, p.blue, p.orange, p.purple];
  return (
    <Stage>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
        <div className="flex gap-1.5">
          {chips.map((c, i) => (
            <motion.span key={i} className="h-7 w-7 rounded-full border-2 border-black/40" animate={{ backgroundColor: c }} transition={{ duration: 0.4 }} />
          ))}
        </div>
        <span className="text-[11px] font-medium text-label-2">{["Normal", "Protanopia", "Deuteranopia", "Tritanopia"][n % 4]}</span>
      </div>
    </Stage>
  );
}

export const DEMOS: Record<DemoId, () => React.JSX.Element> = {
  ...DEMOS2,
  ...DEMOS3,
  ...DEMOS4,
  ...DEMOS5,
  lang: LangDemo,
  scale: ScaleDemo,
  cvd: CvdDemo,
  glow: GlowDemo,
  nowcards: NowCards,
  bodies: () => <Morph looks={NEW_BODIES} />,
  textures: () => <Morph looks={NEW_TEXTURES} />,
  colors: Colors,
  perch: PerchDemo,
  dangle: DangleDemo,
  fishing: FishingDemo,
  guard: GuardDemo,
  archive: ArchiveDemo,
  shield: ShieldDemo,
  sensitive: SensitiveDemo,
  chips: Chips,
  games: Games,
  mixer: Mixer,
  drag: Drag,
  lookchip: LookChip,
  halloween: Halloween,
  notes: NotesStack,
  move: LoopMove,
  intro: LoopIntro,
  noglow: NoGlow,
  reload: Reload,
  shapes: () => <Morph looks={SHAPE_TOUR} />,
  crowd: Crowd,
  fullscreen: Fullscreen,
  alarm: Alarm,
  glasses: () => <Morph looks={GLASSES_TOUR} />,
  look: () => <Morph looks={LOOK_TOUR} />,
};
