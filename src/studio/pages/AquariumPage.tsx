/**
 * Studio › Akvaryum (gizli): Nook'un boştayken oltayla tuttukları burada yaşar. Balıklar yüzer,
 * yıldızlar dipte deniz yıldızı olarak yatar. Sayfanın üstü yazılara kalır, altı baştan sona su.
 */
import { motion } from "motion/react";
import { Fish as FishIcon } from "lucide-react";
import { ACCENT, tintBg, tintText } from "../../components/ui/primitives";
import { tt } from "../../lib/i18n";
import { NavIcon } from "../ui";

type Kind = "pırıl" | "mavi" | "pembe" | "altın";
type Caught = { id: string; kind: Kind; name: string; at: string };

const SPECIES: Record<Kind, { body: string; deep: string; fin: string; label: string }> = {
  pırıl: { body: "#ff9a4d", deep: "#d9541a", fin: "#ffc48f", label: tt("Turuncu balık") },
  mavi: { body: "#5ec8ff", deep: "#1f7fd1", fin: "#b5e6ff", label: tt("Mavi balık") },
  pembe: { body: "#ff8fc4", deep: "#d24688", fin: "#ffc6e0", label: tt("Pembe balık") },
  altın: { body: "#ffe066", deep: "#e0a100", fin: "#fff3b0", label: tt("Altın balık (çok nadir)") },
};

// Önizleme verisi: gerçek kayıt gelince yerini alacak
const FISH: Caught[] = [
  { id: "1", kind: "pırıl", name: "Pırıl", at: "12 Ekim" },
  { id: "2", kind: "mavi", name: "Dalga", at: "14 Ekim" },
  { id: "3", kind: "pembe", name: "Lokum", at: "15 Ekim" },
  { id: "4", kind: "altın", name: "Sultan", at: "16 Ekim · 02:14" },
];
const STARS = 38;

/** Su yüzeyi sayfanın bu kadar altından başlar (üstü yazılara) */
const SURFACE = 168;

export function AquariumPage() {
  return (
    <div className="relative h-full min-h-[560px] overflow-hidden">
      <Header />
      <Water />
    </div>
  );
}

function Header() {
  return (
    <div className="relative z-10 flex items-start gap-4 px-8 pt-7" style={{ height: SURFACE }}>
      <NavIcon icon={FishIcon} color={ACCENT.blue} on size={48} />
      <div className="min-w-0 flex-1">
        <h1 className="text-[25px] font-extrabold leading-tight tracking-[-0.02em] text-label">{tt("Akvaryum")}</h1>
        <p className="text-[13px] text-label-3">{tt("Nook boştayken oltasına takılanlar burada yaşıyor")}</p>
        <div className="mt-3.5 flex flex-wrap gap-2">
          <Chip color={ACCENT.yellow} big={String(STARS)} label={tt("deniz yıldızı")} />
          <Chip color={ACCENT.blue} big={String(FISH.length)} label={tt("balık")} />
          <Chip color={ACCENT.pink} big={tt("dün gece")} label={tt("son av")} />
        </div>
      </div>
    </div>
  );
}

function Chip({ color, big, label }: { color: string; big: string; label: string }) {
  return (
    <span className="flex items-baseline gap-1.5 rounded-full border px-3 py-1" style={{ background: tintBg(color, 10), borderColor: tintBg(color, 26) }}>
      <span className="text-[14px] font-extrabold tabular-nums" style={{ color: tintText(color) }}>
        {big}
      </span>
      <span className="text-[11.5px] text-label-2">{label}</span>
    </span>
  );
}

function Water() {
  return (
    <div className="absolute inset-x-0 bottom-0" style={{ top: SURFACE }}>
      {/* Derinlik: yüzey açık, dip koyu */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #2a8fd6 0%, #1667a8 30%, #0b3f70 70%, #072a4c 100%)" }} />
      <Rays />
      <Surface />
      <Floor />
      {Array.from({ length: 14 }, (_, i) => (
        <Bubble key={i} i={i} />
      ))}
      {FISH.map((f, i) => (
        <SwimmingFish key={f.id} fish={f} i={i} />
      ))}
    </div>
  );
}

/** Yüzeyden süzülen ışık huzmeleri */
function Rays() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden mix-blend-screen">
      {[12, 30, 52, 71, 88].map((x, i) => (
        <motion.div
          key={x}
          className="absolute -top-6 h-[120%] origin-top"
          style={{ left: `${x}%`, width: 70 + (i % 2) * 50, background: "linear-gradient(180deg, rgba(190,235,255,0.22), rgba(190,235,255,0) 75%)", filter: "blur(6px)" }}
          animate={{ rotate: [12, 18, 12], opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 7 + i * 1.3, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/** Dalgalı su yüzeyi: iki katman ters yönlere kayar */
function Surface() {
  const wave = "M0 10 Q 50 0 100 10 T 200 10 T 300 10 T 400 10 V 30 H 0 Z";
  return (
    <div className="pointer-events-none absolute inset-x-0 -top-[10px] h-[30px] overflow-hidden">
      {[
        { c: "rgba(140,210,255,0.55)", d: 9, dir: -1 },
        { c: "#2a8fd6", d: 13, dir: 1 },
      ].map((l, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 200 30"
          preserveAspectRatio="none"
          className="absolute top-0 h-full"
          style={{ width: "200%", left: l.dir < 0 ? 0 : "-100%", top: i * 3 }}
          animate={{ x: ["0%", `${l.dir * 50}%`] }}
          transition={{ duration: l.d, repeat: Infinity, ease: "linear" }}
        >
          <path d={wave} fill={l.c} transform="scale(0.5 1)" />
        </motion.svg>
      ))}
    </div>
  );
}

/** Dipte kum, yosun ve deniz yıldızları */
function Floor() {
  const stars = Array.from({ length: STARS }, (_, i) => {
    // Rastgele görünsün ama her açılışta aynı yerde dursun
    const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
    return { x: 2 + r(1) * 95, y: 4 + r(2) * 40, rot: r(3) * 72, s: 15 + r(4) * 11 };
  });
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[92px]">
      <svg viewBox="0 0 400 40" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-full w-full">
        <defs>
          <linearGradient id="aq-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e8c98e" />
            <stop offset="1" stopColor="#b58a4f" />
          </linearGradient>
        </defs>
        <path d="M0 14 Q 60 4 120 12 T 240 10 T 400 12 V 40 H 0 Z" fill="url(#aq-sand)" />
        <path d="M0 14 Q 60 4 120 12 T 240 10 T 400 12" fill="none" stroke="#f6e2b6" strokeWidth="1" opacity="0.7" />
      </svg>
      {[6, 19, 44, 63, 81, 94].map((x, i) => (
        <Weed key={x} x={x} h={70 + (i % 3) * 26} i={i} />
      ))}
      {stars.map((s, i) => (
        <span key={i} className="absolute" style={{ left: `${s.x}%`, bottom: s.y, transform: `rotate(${s.rot}deg)` }}>
          <SeaStar size={s.s} />
        </span>
      ))}
    </div>
  );
}

function Weed({ x, h, i }: { x: number; h: number; i: number }) {
  return (
    <motion.svg
      width={28}
      height={h}
      viewBox={`0 0 28 ${h}`}
      className="absolute bottom-6 origin-bottom"
      style={{ left: `${x}%` }}
      animate={{ rotate: [-5, 5, -5] }}
      transition={{ duration: 4 + i * 0.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d={`M14 ${h} C 4 ${h * 0.7}, 24 ${h * 0.45}, 12 ${h * 0.2} S 16 4, 14 0`} stroke={i % 2 ? "#3fbf7f" : "#2e9e6a"} strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d={`M14 ${h} C 22 ${h * 0.75}, 6 ${h * 0.55}, 18 ${h * 0.35}`} stroke="#5ad69a" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.8" />
    </motion.svg>
  );
}

/** Oltadan çıkan parlak yıldız, dipte deniz yıldızı olarak: yuvarlak kollu, gözlü */
function SeaStar({ size }: { size: number }) {
  const arm = (k: number) => {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    return `${50 + Math.cos(a) * 46},${52 + Math.sin(a) * 46}`;
  };
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="overflow-visible" style={{ filter: "drop-shadow(0 0 5px rgba(255,210,63,0.55)) drop-shadow(0 2px 2px rgba(0,0,0,0.35))" }}>
      <defs>
        <radialGradient id="aq-star" cx="42%" cy="38%" r="65%">
          <stop offset="0" stopColor="#fff6c2" />
          <stop offset="0.5" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#e09a00" />
        </radialGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((k) => (
        <line key={k} x1="50" y1="52" x2={arm(k).split(",")[0]} y2={arm(k).split(",")[1]} stroke="url(#aq-star)" strokeWidth="26" strokeLinecap="round" />
      ))}
      <circle cx="50" cy="52" r="20" fill="url(#aq-star)" />
      <circle cx="42" cy="48" r="5" fill="#2a2a30" />
      <circle cx="58" cy="48" r="5" fill="#2a2a30" />
    </svg>
  );
}

function Bubble({ i }: { i: number }) {
  const x = (i * 37) % 100;
  const s = 4 + (i % 4) * 3;
  return (
    <motion.span
      className="pointer-events-none absolute rounded-full border border-white/50"
      style={{ left: `${x}%`, bottom: 60, width: s, height: s, background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.8), rgba(255,255,255,0.08) 60%)" }}
      animate={{ y: [0, -520], x: [0, 8, -6, 4], opacity: [0, 0.9, 0.9, 0] }}
      transition={{ duration: 6 + (i % 5), repeat: Infinity, delay: i * 0.7, ease: "easeIn" }}
    />
  );
}

/** Bir uçtan öbür uca yüzer, dönerken yüzü çevrilir */
function SwimmingFish({ fish, i }: { fish: Caught; i: number }) {
  const from = 4 + ((i * 29) % 34);
  const to = 58 + ((i * 17) % 30);
  const dur = 16 + i * 3.5;
  const size = fish.kind === "altın" ? 90 : 72 + (i % 2) * 10;
  return (
    <motion.div
      className="absolute"
      style={{ top: `${14 + i * 17}%` }}
      initial={{ left: `${from}%` }}
      animate={{ left: [`${from}%`, `${to}%`, `${to}%`, `${from}%`, `${from}%`], scaleX: [-1, -1, 1, 1, -1] }}
      transition={{ duration: dur, times: [0, 0.47, 0.5, 0.97, 1], repeat: Infinity, ease: "easeInOut", delay: -i * 4 }}
    >
      <motion.div animate={{ y: [0, -7, 0, 5, 0] }} transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}>
        <FishBody kind={fish.kind} size={size} />
      </motion.div>
    </motion.div>
  );
}

function FishBody({ kind, size }: { kind: Kind; size: number }) {
  const c = SPECIES[kind];
  const id = `aq-fish-${kind}`;
  return (
    <svg width={size} height={size * 0.78} viewBox="0 0 64 50" className="overflow-visible" style={{ filter: kind === "altın" ? "drop-shadow(0 0 10px rgba(255,214,80,0.8))" : "drop-shadow(0 4px 6px rgba(0,20,50,0.45))" }}>
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="0.25" stopColor={c.body} />
          <stop offset="1" stopColor={c.deep} />
        </radialGradient>
      </defs>
      {/* Kuyruk sallanır */}
      <motion.path
        d="M44 25 L62 12 Q 58 25 62 38 Z"
        fill={c.fin}
        stroke={c.deep}
        strokeWidth="1.5"
        strokeLinejoin="round"
        style={{ originX: "44px", originY: "25px" }}
        animate={{ rotate: [-12, 12, -12] }}
        transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
      />
      <path d="M20 9 Q 28 1 36 8 Z" fill={c.fin} stroke={c.deep} strokeWidth="1.5" strokeLinejoin="round" />
      <ellipse cx="26" cy="25" rx="21" ry="18" fill={`url(#${id})`} />
      <ellipse cx="22" cy="14" rx="9" ry="4" fill="#fff" opacity="0.35" />
      <circle cx="16" cy="22" r="4.6" fill="#1d1d22" />
      <circle cx="14.6" cy="20.4" r="1.6" fill="#fff" />
      <ellipse cx="14" cy="31" rx="3.6" ry="2.2" fill="#ff5d8f" opacity="0.4" />
      <path d="M30 32 Q 34 25 30 18" stroke={c.fin} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
  );
}
