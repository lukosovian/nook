/**
 * Yama notlarının görselleri: her biri küçük, kendi kendine dönen bir sahne. Nook'lar gerçek 3B
 * çizimle (NookFigure), geçiş ve açılış önizlemeleri Ayarlar'dakiyle aynı bileşenler.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Check, FileArchive, FileText, Folder, LockKeyhole, Maximize2, MousePointer2, Move, RotateCw, ScrollText, Sparkles } from "lucide-react";
import { CHIP_NOOKS, DEFAULT_LOOK, HALLOWEEN, normalizeColor, normalizeLook, SHOWCASE, type Look } from "../../lib/look";
import type { DemoId } from "../../lib/notes";
import { useNook } from "../../store/nook";
import { NookFigure } from "../mascot/Figure";
import { IntroPreview, MovePreview } from "../panels/EffectPreview";
import { ACCENT, tintBg, tintText } from "../ui/primitives";

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
          <span className="text-[10.5px] font-medium text-label">Yama notları</span>
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
        {fixed ? "0.2.27: ışık yok" : "Önce: arkada ışık"}
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
            <div className="rounded-[6px] px-1.5 py-1 text-label-3">Görünüm</div>
            <div className="flex items-center gap-1 rounded-[6px] bg-white/10 px-1.5 py-1 text-label">
              <RotateCw size={10} /> Yenile
            </div>
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
      <div className="absolute bottom-2 left-3 text-[9px] uppercase tracking-[0.18em] text-white/30">oyun</div>
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
        {n % spots.length === 3 ? "Ortala" : "Sürükle · bırak"}
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
          <span className="text-[12px] font-medium" style={{ color: tintText(ACCENT.pink) }}>
            Görünüm
          </span>
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
    { c: ACCENT.pink, t: "Yakala" },
    { c: ACCENT.blue, t: "Hafıza" },
    { c: ACCENT.orange, t: "Köstebek" },
    { c: ACCENT.purple, t: "Eşleştir" },
    { c: ACCENT.green, t: "Zıpla" },
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
          <FileArchive size={11} style={{ color: tintText(ACCENT.orange) }} /> ödev.zip
        </div>
        {["Görseller", "rapor.pdf", "not.txt"].map((f, i) => (
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
        <FileText size={10} /> rapor.pdf
        <MousePointer2 size={12} className="ml-1 text-white" fill="white" />
      </motion.div>
      <div className="absolute bottom-3 right-4 flex h-10 w-14 items-center justify-center rounded-[8px] border border-dashed border-white/20 text-[9px] text-label-3">Masaüstü</div>
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
        <span className="mt-1 text-[9.5px] text-white/60">Şşş… · Ctrl+Alt+H</span>
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
            <span className="block text-[10.5px] font-medium text-label">Hassas veri · Kart numarası</span>
            <span className="block text-[9px] text-label-3">{left} sn sonra panodan silinecek</span>
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

export const DEMOS: Record<DemoId, () => React.JSX.Element> = {
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
