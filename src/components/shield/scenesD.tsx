/**
 * Kalkan sahneleri (17–22): korsan gemisi, çılgın laboratuvar, lavanta tarlası, yeraltı sığınağı,
 * lunapark dönme dolabı, eskiz defteri.
 */
import { motion } from "motion/react";
import { BunkerClock, FerrisClock, LabClock, LavenderClock, PirateClock, SketchClock } from "./clocks2";
import { Actor, breathe, Drift, Hand, hop, Layer, look, on, Painted, Stage, Stars, sway, useBeat, W } from "./kit";

// ------------------------------------------------------------------ 17. Korsan gemisi, mehtaplı gece

export function Pirate() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage medium="canvas" clock="st-c-oil"
      sky="linear-gradient(180deg, #050818 0%, #0e1838 50%, #1e2e5e 100%)"
      lights={[
        { x: 760, y: 150, r: 420, color: "rgba(200,215,255,0.4)", opacity: 0.5 },
        { x: 200, y: 626, r: 220, color: "rgba(255,200,110,0.55)", opacity: 0.55, flicker: 0.2 },
        { x: 860, y: 626, r: 240, color: "rgba(255,200,110,0.55)", opacity: 0.55, flicker: 0.25 },
        { x: 1380, y: 626, r: 220, color: "rgba(255,200,110,0.55)", opacity: 0.55, flicker: 0.2 },
      ]}
    >
      <Stars count={80} maxY={420} />
      <Painted look="oil" seed={613}>
        <defs>
          <linearGradient id="pr-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a2a5a" />
            <stop offset="1" stopColor="#050a1c" />
          </linearGradient>
          <linearGradient id="pr-sail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c9b48a" />
            <stop offset="0.5" stopColor="#f6eedb" />
            <stop offset="1" stopColor="#d4c29a" />
          </linearGradient>
          <linearGradient id="pr-deck" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a4e2c" />
            <stop offset="1" stopColor="#3e2414" />
          </linearGradient>
          <linearGradient id="pr-mast" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3a2414" />
            <stop offset="0.5" stopColor="#7a5232" />
            <stop offset="1" stopColor="#3a2414" />
          </linearGradient>
        </defs>
        {/* Ay ve denizdeki yansıması */}
        <circle cx="760" cy="150" r="60" fill="#f4eccf" />
        <circle cx="760" cy="150" r="200" fill="#c8d4ff" opacity="0.1" filter="url(#nk-blur)" />
        {/* Kalın fırçalı girdaplar: ayın çevresinde halkalar, gökte kıvrılan rüzgâr */}
        {[90, 120, 150].map((r, i) => (
          <circle key={`mh${i}`} cx="760" cy="150" r={r} fill="none" stroke={["#f4eccf", "#c8d4ff", "#8aa0e0"][i]} strokeWidth={10 - i * 2} opacity={0.35 - i * 0.07} strokeDasharray={`${40 - i * 8} ${12 + i * 6}`} />
        ))}
        {[[280, 210, 1], [1180, 250, 1.2], [520, 330, 0.7], [1420, 120, 0.8]].map(([x, y, s], i) => (
          <g key={`sw${i}`} fill="none" strokeLinecap="round">
            <path d={`M${x - 120 * s} ${y + 20 * s} C ${x - 60 * s} ${y - 40 * s}, ${x + 40 * s} ${y - 40 * s}, ${x + 30 * s} ${y + 10 * s} C ${x + 20 * s} ${y + 40 * s}, ${x - 20 * s} ${y + 30 * s}, ${x - 10 * s} ${y + 4 * s}`} stroke="#c8d4ff" strokeWidth={9 * s} opacity="0.4" />
            <path d={`M${x - 140 * s} ${y + 40 * s} C ${x - 40 * s} ${y + 10 * s}, ${x + 80 * s} ${y + 30 * s}, ${x + 160 * s} ${y}`} stroke="#6a80c8" strokeWidth={7 * s} opacity="0.35" />
          </g>
        ))}
        {/* Bulut şeritleri ve uzakta bir ada */}
        {[[300, 260, 260], [1180, 200, 340], [900, 330, 220]].map(([x, y, w], i) => (
          <ellipse key={i} cx={x} cy={y} rx={w / 2} ry="14" fill="#3a4a7a" opacity="0.5" />
        ))}
        <path d="M1240 562 Q1300 500 1360 530 Q1400 490 1460 540 L1500 562 Z" fill="#0a1228" />
        <rect x="1386" y="500" width="6" height="40" fill="#0a1228" />
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="pr-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a2a5a" />
            <stop offset="1" stopColor="#050a1c" />
          </linearGradient>
          <linearGradient id="pr-sail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c9b48a" />
            <stop offset="0.5" stopColor="#f6eedb" />
            <stop offset="1" stopColor="#d4c29a" />
          </linearGradient>
          <linearGradient id="pr-deck" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a4e2c" />
            <stop offset="1" stopColor="#3e2414" />
          </linearGradient>
          <linearGradient id="pr-mast" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3a2414" />
            <stop offset="0.5" stopColor="#7a5232" />
            <stop offset="1" stopColor="#3a2414" />
          </linearGradient>
        </defs>
        <motion.circle cx="1389" cy="498" r="5" fill="#ffd27a" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
      </Layer>
      <Painted look="oil" seed={613}>
        <defs>
          <linearGradient id="pr-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a2a5a" />
            <stop offset="1" stopColor="#050a1c" />
          </linearGradient>
          <linearGradient id="pr-sail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c9b48a" />
            <stop offset="0.5" stopColor="#f6eedb" />
            <stop offset="1" stopColor="#d4c29a" />
          </linearGradient>
          <linearGradient id="pr-deck" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a4e2c" />
            <stop offset="1" stopColor="#3e2414" />
          </linearGradient>
          <linearGradient id="pr-mast" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3a2414" />
            <stop offset="0.5" stopColor="#7a5232" />
            <stop offset="1" stopColor="#3a2414" />
          </linearGradient>
        </defs>
        <rect x="0" y="560" width={W} height="340" fill="url(#pr-sea)" />
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="pr-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a2a5a" />
            <stop offset="1" stopColor="#050a1c" />
          </linearGradient>
          <linearGradient id="pr-sail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c9b48a" />
            <stop offset="0.5" stopColor="#f6eedb" />
            <stop offset="1" stopColor="#d4c29a" />
          </linearGradient>
          <linearGradient id="pr-deck" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a4e2c" />
            <stop offset="1" stopColor="#3e2414" />
          </linearGradient>
          <linearGradient id="pr-mast" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3a2414" />
            <stop offset="0.5" stopColor="#7a5232" />
            <stop offset="1" stopColor="#3a2414" />
          </linearGradient>
        </defs>
        {[600, 630, 660].map((y, i) => (
          <motion.path key={y} d={`M-100 ${y} q 50 -8 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0`} stroke="#3a5a9a" strokeWidth="2" fill="none" opacity={0.5 - i * 0.12} animate={{ x: [0, 100] }} transition={{ duration: 8 + i * 3, repeat: Infinity, ease: "linear" }} />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <motion.rect key={i} x={720 - i * 6} y={580 + i * 22} width={80 + i * 12} height="4" rx="2" fill="#f4eccf" animate={{ opacity: [0.15, 0.5, 0.15], x: [0, 10, 0] }} transition={{ duration: 3 + (i % 3), repeat: Infinity }} />
        ))}
      </Layer>
      {/* Dalgalarla beşik gibi sallanan gemi */}
      <motion.div className="absolute inset-0" style={{ originX: 0.5, originY: 1 }} animate={{ rotate: [-1.4, 1.4, -1.4], y: [0, 6, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
        <Painted look="oil" seed={613}>
          <defs>
<linearGradient id="pr-mast" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3a2414" />
            <stop offset="0.5" stopColor="#7a5232" />
            <stop offset="1" stopColor="#3a2414" />
          </linearGradient>
          </defs>
          {/* Direk, yelkenler, halatlar */}
          <rect x="412" y="40" width="18" height="720" fill="url(#pr-mast)" />
        </Painted>
        <Layer>
          {/* Direğin tepesinde kara bayrak */}
          <motion.path d="M430 40 q30 -6 60 4 q-30 8 -60 26 Z" fill="#111" style={{ transformOrigin: "430px 40px" }} animate={{ skewY: [0, 8, 0], scaleX: [1, 0.92, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
        </Layer>
        <Painted look="oil" seed={613}>
          <defs>
<linearGradient id="pr-sail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c9b48a" />
            <stop offset="0.5" stopColor="#f6eedb" />
            <stop offset="1" stopColor="#d4c29a" />
          </linearGradient>
<linearGradient id="pr-deck" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a4e2c" />
            <stop offset="1" stopColor="#3e2414" />
          </linearGradient>
          </defs>
          <circle cx="452" cy="52" r="5" fill="#fff" />
          {/* Rüzgârla şişmiş yelken: dikiş çizgileri ve gölge */}
          <path d="M240 230 Q 420 200 600 230 Q 640 380 590 520 Q 420 490 250 520 Q 210 380 240 230 Z" fill="url(#pr-sail)" />
          {[300, 360, 420, 480, 540].map((x) => (
            <path key={x} d={`M${x} ${226 - (x === 420 ? 4 : 0)} Q ${x + (x - 420) * 0.12} 370 ${x} ${510}`} stroke="#b8a47a" strokeWidth="2" fill="none" opacity="0.6" />
          ))}
          <path d="M240 230 Q 420 200 600 230" stroke="#c9b48a" strokeWidth="6" fill="none" />
          <line x1="230" y1="226" x2="610" y2="226" stroke="#5a3a22" strokeWidth="10" />
          <line x1="245" y1="522" x2="595" y2="522" stroke="#5a3a22" strokeWidth="8" />
          {[[421, 60, 120, 700], [421, 60, 760, 700], [421, 240, 140, 700]].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c9b48a" strokeWidth="3" opacity="0.7" />
          ))}
          {/* Güverte ve küpeşte */}
          <path d="M-120 700 H1720 V1000 H-120 Z" fill="url(#pr-deck)" />
          {Array.from({ length: 10 }, (_, i) => (
            <line key={i} x1="0" y1={720 + i * 20} x2={W} y2={720 + i * 20} stroke="#3a2414" strokeWidth="3" />
          ))}
          {Array.from({ length: 30 }, (_, i) => (
            <circle key={`n${i}`} cx={(i * 131) % W} cy={730 + (i % 9) * 20} r="2" fill="#2a1a10" />
          ))}
          <rect x="-120" y="660" width={W + 240} height="22" fill="#8a5a34" />
          <rect x="-120" y="660" width={W + 240} height="5" fill="#c49a6a" opacity="0.6" />
          {/* Küpeştede asılı fenerler */}
          {[200, 860, 1380].map((x) => (
            <g key={`ln${x}`}>
              <line x1={x} y1="640" x2={x} y2="660" stroke="#2a2a2a" strokeWidth="3" />
              <rect x={x - 12} y="610" width="24" height="32" rx="5" fill="#ffd27a" stroke="#3a2a1a" strokeWidth="4" />
              <path d={`M${x - 14} 612 h28 l-6 -10 h-16 Z`} fill="#3a2a1a" />
            </g>
          ))}
          {Array.from({ length: 20 }, (_, i) => (
            <rect key={i} x={i * 84 + 20} y="682" width="14" height="40" fill="#7a4a2a" />
          ))}
          {/* Top ve gülleler */}
          <rect x="1440" y="740" width="130" height="44" rx="20" fill="#2a2a30" />
          <circle cx="1470" cy="800" r="22" fill="#5a3a22" />
          {[1220, 1250, 1235].map((x, i) => (
            <circle key={i} cx={x} cy={i === 2 ? 800 : 830} r="18" fill="#1a1a20" />
          ))}
        </Painted>
        <PirateClock />
        {/* Dümenin başında, korsan şapkalı ve göz bantlı kaptan */}
        <Actor x={1010} y={712} size={104} look={look({ shape: "egg", head: "pirate", glasses: "eyepatch" })} color="#FF3B4A" expression={beat.i === 0 ? "happy" : "focused"} move={breathe(3)} act={on(beat, 0, hop(12))} actKey={k}  />
        <Wheel spin={beat.i === 0} k={k} />
        {/* Hazine sandığına kafa üstü dalmış, altın saçan */}
        <motion.div className="absolute" style={{ left: 650, top: 640, width: 0, height: 0 }} animate={{ rotate: [176, 184, 176] }} transition={{ duration: 0.8, repeat: Infinity }}>
          <Actor shadow={false} morph={beat.n[1]} morphDelay={600} x={0} y={8} size={96} look={look({ shape: "bean" })} color="#FFD21F" expression="happy" />
        </motion.div>
        <Chest />
        <Coins k={k} burst={beat.i === 1} />
        {/* Gözcü sepetinde dürbünle ufku tarayan */}
        <Actor shadow={false} x={421} y={150} size={78} look={look({ shape: "sphere", head: "bow" })} color="#2FD4C0" flip={beat.i === 2} expression={beat.i === 2 ? "surprised" : "focused"} move={sway(4, 3)} act={on(beat, 2, hop(10))} actKey={k} front={<Spyglass />} />
        <Painted look="oil" seed={613}>
          <path d="M360 120 h122 l-12 60 h-98 Z" fill="#7a4a2a" />
          {[372, 396, 420, 444, 468].map((x) => (
            <line key={x} x1={x} y1="122" x2={x - 2} y2="178" stroke="#5a3a22" strokeWidth="3" />
          ))}
        </Painted>
        {/* Tahta kılıçla gülle üstünde denge kuran yaramaz */}
        <Actor x={1236} y={785} size={78} look={look({ shape: "cat" })} color="#9B7BFF" expression={beat.i === 3 ? "dizzy" : "focused"} move={{ animate: { rotate: [-8, 8, -8], x: [-4, 4, -4] }, transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" } }} act={on(beat, 3, { animate: { rotate: [0, 30, -28, 14, 0] }, transition: { duration: 1.8 } })} actKey={k} front={<WoodSword />} />
      </motion.div>
    </Stage>
  );
}

function Wheel({ spin, k }: { spin: boolean; k: number }) {
  return (
    <svg className="pointer-events-none absolute overflow-visible" style={{ left: 930, top: 660 }} width="160" height="220" viewBox="-80 -80 160 220">
      <rect x="-8" y="0" width="16" height="60" fill="#5a3a22" />
      <motion.g key={k} animate={{ rotate: spin ? [0, 540] : [-20, 20, -20] }} transition={spin ? { duration: 2, ease: "easeOut" } : { duration: 5, repeat: Infinity, ease: "easeInOut" }}>
        <circle r="56" fill="none" stroke="#8a5a34" strokeWidth="10" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <line key={i} x1={0} y1={0} x2={Math.cos(a) * 74} y2={Math.sin(a) * 74} stroke="#8a5a34" strokeWidth="7" strokeLinecap="round" />;
        })}
        <circle r="12" fill="#e0b84a" />
      </motion.g>
    </svg>
  );
}

function Chest() {
  return (
    <svg className="pointer-events-none absolute overflow-visible" style={{ left: 560, top: 640 }} width="180" height="160">
      <path d="M0 40 Q 90 -30 180 40 Z" fill="#7a4a22" transform="rotate(-24 0 40) translate(-30 -10)" />
      <rect x="0" y="40" width="180" height="110" rx="10" fill="#8a5a2a" />
      <rect x="0" y="40" width="180" height="16" fill="#e0b84a" />
      {[30, 150].map((x) => (
        <rect key={x} x={x - 8} y="40" width="16" height="110" fill="#c99a3a" />
      ))}
      <rect x="78" y="60" width="24" height="30" rx="4" fill="#e0b84a" />
      {[20, 50, 80, 110, 140, 165].map((x, i) => (
        <circle key={x} cx={x} cy={38 - (i % 2) * 6} r="10" fill="#ffd24a" stroke="#c99a1a" strokeWidth="2" />
      ))}
    </svg>
  );
}

function Coins({ k, burst }: { k: number; burst: boolean }) {
  return (
    <>
      {Array.from({ length: burst ? 12 : 3 }, (_, i) => (
        <motion.span
          key={`${i}-${burst ? k : 0}`}
          className="absolute h-5 w-5 rounded-full"
          style={{ left: 640, top: 660, background: "radial-gradient(circle at 35% 35%, #fff2a8, #e0a81f)", boxShadow: "0 0 6px #ffd24a" }}
          animate={{ x: [0, (i % 2 ? 1 : -1) * (40 + (i % 5) * 34)], y: [0, -120 - (i % 4) * 40, 140], rotateY: [0, 720], opacity: [1, 1, 0] }}
          transition={burst ? { duration: 1.4, delay: (i % 4) * 0.12 } : { duration: 1.6, repeat: Infinity, delay: i * 0.9, repeatDelay: 1.2 }}
        />
      ))}
    </>
  );
}

function Spyglass() {
  return (
    <g>
      <path d="M20 10 L40 4 L41 9 L21 14 Z" fill="#c99a3a" />
      <rect x="36" y="2.6" width="3" height="8" rx="1" fill="#8a5a24" transform="rotate(-16 37 6)" />
      <Hand x={22} y={13} />
      <Hand x={30} y={10} />
    </g>
  );
}

function WoodSword() {
  return (
    <g>
      <path d="M2 22 Q 12 25 22 22" stroke="#5a3a22" strokeWidth="1.4" fill="none" />
      <path d="M20 22 L34 30" stroke="#c9a06a" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M18 19 L23 25" stroke="#7a4a2a" strokeWidth="1.6" strokeLinecap="round" />
      <Hand x={-6} y={12} />
      <Hand x={30} y={12} />
    </g>
  );
}

// ------------------------------------------------------------------ 18. Çılgın laboratuvar

const NEON = ["#5dff7a", "#ff3ea5", "#00e0ff", "#ffe04a", "#b14dff"];

export function Lab() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage clock="st-ink"
      sky="linear-gradient(180deg, #4f8a8c 0%, #3c6e72 60%, #2c5458 100%)"
      lights={[
        { x: 150, y: 420, r: 300, color: "rgba(140,255,120,0.4)", opacity: 0.5, flicker: 0.2 },
        { x: 540, y: 470, r: 380, color: "rgba(255,230,180,0.45)", opacity: 0.55, flicker: 0.05 },
        { x: 860, y: 700, r: 300, color: "rgba(177,77,255,0.45)", opacity: 0.45, flicker: 0.3 },
        { x: 1375, y: 540, r: 300, color: "rgba(200,255,220,0.15)", opacity: 0.4 },
      ]}
    >
      <Painted look="ink" seed={271}>
        <defs>
          <linearGradient id="lb2-pipe" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a9aa0" />
            <stop offset="0.45" stopColor="#c8d2d6" />
            <stop offset="1" stopColor="#3a4448" />
          </linearGradient>
          <linearGradient id="lb2-bench" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6a767a" />
            <stop offset="1" stopColor="#3a4448" />
          </linearGradient>
        </defs>
          {/* Fayans duvar */}
          {Array.from({ length: 20 }, (_, r) =>
            Array.from({ length: 27 }, (_, c) => (
              <rect key={`${r}-${c}`} x={c * 60 + 2} y={r * 40 + 2} width="56" height="36" rx="3" fill="#fff" opacity={((r * 3 + c * 7) % 11 === 0) ? 0.05 : 0.025} />
            )),
          )}
          {/* Tavandan sarkan sanayi lambası */}
          <line x1="540" y1="0" x2="540" y2="330" stroke="#222" strokeWidth="4" />
          <path d="M490 330 h100 l-14 -36 h-72 Z" fill="#2f3a3e" />
          <ellipse cx="540" cy="332" rx="40" ry="8" fill="#fff6dc" filter="url(#nk-bloom)" />
          <polygon points="510,336 570,336 760,690 320,690" fill="#fff6dc" opacity="0.06" filter="url(#nk-blur-s)" />
          {/* Borular, vanalar, manometreler */}
          <path d="M0 120 H520 V300 M0 160 H470 V300" stroke="url(#lb2-pipe)" strokeWidth="18" fill="none" />
          <path d="M1600 110 H1120 V240" stroke="url(#lb2-pipe)" strokeWidth="18" fill="none" />
          {[[200, 120], [380, 160], [1300, 110]].map(([x, y], i) => (
            <rect key={`j${i}`} x={x - 10} y={y - 14} width="20" height="28" rx="3" fill="#6a767a" />
          ))}
          {[[520, 230], [1120, 200]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="22" fill="#c0392b" />
              <rect x={x - 30} y={y - 4} width="60" height="8" rx="4" fill="#9a2a1f" />
            </g>
          ))}
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="lb2-pipe" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a9aa0" />
            <stop offset="0.45" stopColor="#c8d2d6" />
            <stop offset="1" stopColor="#3a4448" />
          </linearGradient>
          <linearGradient id="lb2-bench" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6a767a" />
            <stop offset="1" stopColor="#3a4448" />
          </linearGradient>
        </defs>
        {[[260, 160], [1300, 150]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="34" fill="#e8e2c8" stroke="#8a95a3" strokeWidth="6" />
            <motion.line x1={x} y1={y} x2={x} y2={y - 24} stroke="#c0392b" strokeWidth="3" strokeLinecap="round" style={{ transformOrigin: `${x}px ${y}px` }} animate={{ rotate: [-60, 40, -20, 70, -60] }} transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }} />
          </g>
        ))}
      </Layer>
      <Painted look="ink" seed={271}>
        <defs>
          <linearGradient id="lb2-pipe" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a9aa0" />
            <stop offset="0.45" stopColor="#c8d2d6" />
            <stop offset="1" stopColor="#3a4448" />
          </linearGradient>
          <linearGradient id="lb2-bench" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6a767a" />
            <stop offset="1" stopColor="#3a4448" />
          </linearGradient>
        </defs>
          {/* Çizgi roman dili: Ben-Day nokta tramı, tesla bobininin arkasında patlama balonu ve hareket çizgileri */}
          <defs>
            <pattern id="lb-dots" width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="6" cy="6" r="2.6" fill="#1d3a40" />
            </pattern>
            <pattern id="lb-dots2" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="2" fill="#f0c848" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={W} height="110" fill="url(#lb-dots)" opacity="0.45" />
          <rect x="0" y="700" width="320" height="90" fill="url(#lb-dots)" opacity="0.4" />
          <polygon points="720,470 742,530 800,512 760,560 812,600 748,604 740,664 712,612 660,640 684,586 628,560 692,544 676,488" fill="#ffe24a" />
          <polygon points="720,470 742,530 800,512 760,560 812,600 748,604 740,664 712,612 660,640 684,586 628,560 692,544 676,488" fill="url(#lb-dots2)" opacity="0.6" />
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return <line key={`al${i}`} x1={720 + Math.cos(a) * 110} y1={566 + Math.sin(a) * 90} x2={720 + Math.cos(a) * 150} y2={566 + Math.sin(a) * 124} stroke="#17121e" strokeWidth="4" strokeLinecap="round" />;
          })}
          {/* Raf ve şişeler */}
          {[[0, 300, 300], [0, 470, 300]].map(([x, y, w], r) => (
            <g key={r}>
              <rect x={x} y={y} width={w} height="12" fill="#3a4448" />
              {Array.from({ length: 5 }, (_, i) => (
                <g key={i} transform={`translate(${30 + i * 55} ${y})`}>
                  <path d="M-6 -60 h12 v18 l14 30 q4 12 -8 12 h-24 q-12 0 -8 -12 l14 -30 Z" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
                  <path d="M-14 -22 h28 l6 12 q4 10 -8 10 h-24 q-12 0 -8 -10 Z" fill={NEON[(i + r) % NEON.length]} opacity="0.85" filter="url(#nk-bloom)" />
                  <path d="M-3 -58 v40" stroke="#fff" strokeWidth="2" opacity="0.35" />
                </g>
              ))}
            </g>
          ))}
          {/* Deney masası */}
          <rect x="320" y="690" width="460" height="20" rx="4" fill="url(#lb2-bench)" />
          <rect x="320" y="690" width="460" height="4" rx="2" fill="#a8b4b8" />
          <rect x="340" y="710" width="16" height="120" fill="#3a4448" />
          <rect x="744" y="710" width="16" height="120" fill="#3a4448" />
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="lb2-pipe" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a9aa0" />
            <stop offset="0.45" stopColor="#c8d2d6" />
            <stop offset="1" stopColor="#3a4448" />
          </linearGradient>
          <linearGradient id="lb2-bench" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6a767a" />
            <stop offset="1" stopColor="#3a4448" />
          </linearGradient>
        </defs>
        {/* Masada küçük bir Tesla bobini: ara sıra kıvılcım */}
        <g>
          <rect x="700" y="640" width="40" height="50" rx="6" fill="#3a4448" />
          <rect x="712" y="600" width="16" height="44" fill="#c87a3a" />
          <circle cx="720" cy="594" r="14" fill="#b9c4c8" />
          <motion.path d="M720 580 l-10 -18 l12 -4 l-8 -20" stroke="#cfe8ff" strokeWidth="3" fill="none" filter="url(#nk-bloom)" animate={{ opacity: [0, 1, 0, 0, 0] }} transition={{ duration: 1.8, repeat: Infinity }} />
        </g>
      </Layer>
      <Painted look="ink" seed={271}>
        <defs>
          <linearGradient id="lb2-pipe" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a9aa0" />
            <stop offset="0.45" stopColor="#c8d2d6" />
            <stop offset="1" stopColor="#3a4448" />
          </linearGradient>
          <linearGradient id="lb2-bench" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6a767a" />
            <stop offset="1" stopColor="#3a4448" />
          </linearGradient>
        </defs>
          {/* Zemin: parlak karolar */}
          <rect x="0" y="790" width={W} height="110" fill="#0a0e10" />
          {Array.from({ length: 10 }, (_, i) => (
            <g key={i}>
              <rect x={i * 170} y="790" width="160" height="110" fill="#11171a" />
              <rect x={i * 170} y="790" width="160" height="6" fill="#fff" opacity="0.05" />
            </g>
          ))}
          {/* Kara tahta */}
          <rect x="1176" y="390" width="410" height="320" rx="8" fill="#000" opacity="0.3" />
          <rect x="1170" y="380" width="410" height="320" rx="8" fill="#1f2a24" stroke="#8a5a34" strokeWidth="12" />
          <rect x="1180" y="390" width="390" height="300" fill="#fff" opacity="0.03" />
          <rect x="1180" y="694" width="390" height="10" fill="#6a4226" />
          <rect x="1220" y="688" width="30" height="8" rx="2" fill="#f4f1e8" />
      </Painted>
      {/* Tahtaya yazılan anlamsız formüller */}
      <svg className="pointer-events-none absolute overflow-visible" style={{ left: 1190, top: 400 }} width="370" height="290">
        {["M20 40 q20 -30 40 0 t40 0 M110 30 h30 M125 15 v30 M160 40 q10 -20 30 -10 q-20 20 0 20", "M20 110 l30 -30 l20 40 l30 -40 M120 100 h40 M140 85 v30 M180 80 q30 0 20 30 q-10 20 -30 0", "M20 180 q40 -40 80 0 M120 170 h60 M200 150 l40 40 M240 150 l-40 40 M260 180 q20 -30 40 0", "M30 250 h80 M60 230 q20 40 50 0 M140 240 q30 -40 60 0 t60 0"].map((d, i) => (
          <motion.path key={`${i}-${k}`} d={d} stroke="#f4f1e8" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.85" initial={{ pathLength: beat.i === 3 && i === 3 ? 0 : 1 }} animate={{ pathLength: 1 }} transition={{ duration: 2.4, delay: 0.3 }} />
        ))}
      </svg>
      {/* Tüplerden fokurdayan kabarcıklar, ara sıra mor duman */}
      {Array.from({ length: 8 }, (_, i) => (
        <motion.span key={i} className="absolute rounded-full" style={{ left: 30 + (i % 5) * 55 - 4, top: 450, width: 8, height: 8, background: NEON[i % NEON.length], boxShadow: `0 0 8px ${NEON[i % NEON.length]}` }} animate={{ y: [0, -50], opacity: [1, 0] }} transition={{ duration: 1.4 + (i % 3) * 0.3, repeat: Infinity, delay: i * 0.35 }} />
      ))}
      <Drift count={6} from={760} to={-120} dur={[9, 14]} xs={[700, 1000]} sway={80} render={(i) => <span className="block rounded-full" style={{ width: 60 + i * 12, height: 60 + i * 12, background: "radial-gradient(circle, rgba(177,77,255,0.35), rgba(177,77,255,0))" }} />} />

      <LabClock />
      {/* Güvenlik gözlüklü, tüpten tüpe damlatan */}
      <Actor x={540} y={690} size={100} look={look({ shape: "sphere", glasses: "goggles" })} color="#F4F4F6" expression={beat.i === 0 ? "surprised" : "focused"} move={breathe(3)} act={on(beat, 0, hop(16))} actKey={k} front={<><Pipette k={k} change={beat.i === 0} /></>} />
      {/* Deney patlamış: kurum, elektrik çarpmış diken diken tepe, boş bakış */}
      <Actor morph={beat.n[1]} morphDelay={150} x={860} y={800} size={100} look={look({ shape: "blob" })} color="#FF8A1F" expression="dizzy" move={{ animate: { rotate: [-5, 5, -5], x: [-3, 3, -3] }, transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }} act={on(beat, 1, hop(14))} actKey={k} back={<Frizz />} front={<Soot />} />
      {beat.i === 1 && (
        <motion.span key={`pf${k}`} className="absolute rounded-full" style={{ left: 790, top: 600, width: 150, height: 150, background: "radial-gradient(circle, rgba(60,60,70,0.8), rgba(60,60,70,0))" }} initial={{ scale: 0.3, opacity: 1 }} animate={{ scale: 1.8, opacity: 0, y: -80 }} transition={{ duration: 1.6 }} />
      )}
      {/* Dönen santrifüjün üstünde atlıkarınca gibi dönen */}
      <svg className="pointer-events-none absolute overflow-visible" style={{ left: 980, top: 700 }} width="160" height="110" viewBox="-80 0 160 110">
        <rect x="-70" y="40" width="140" height="60" rx="10" fill="#8a95a3" />
        <rect x="-60" y="52" width="40" height="10" rx="5" fill={NEON[0]} />
        <ellipse cx="0" cy="40" rx="80" ry="16" fill="#b0bac6" />
      </svg>
      <motion.div className="absolute inset-0" animate={{ x: [0, 60, 0, -60, 0], scale: [1, 0.94, 0.88, 0.94, 1] }} transition={{ duration: beat.i === 2 ? 1 : 2.4, repeat: Infinity, ease: "linear" }} style={{ originX: "1060px", originY: "740px" }}>
        <Actor x={1060} y={740} size={86} look={look({ shape: "bean", head: "antenna" })} color="#2B8CFF" expression={beat.i === 2 ? "dizzy" : "happy"} move={{ animate: { rotate: [-8, 8, -8] }, transition: { duration: 1.2, repeat: Infinity } }} front={<><Hand x={-6} y={8} /><Hand x={30} y={8} /></>} />
      </motion.div>
      {/* Panoya tebeşirle formül yazan */}
      <Actor x={1480} y={800} size={100} look={look({ shape: "egg", glasses: "round" })} color="#9B7BFF" flip expression="focused" move={breathe(3.2)} act={on(beat, 3, { animate: { x: [0, -20, 10, 0] }, transition: { duration: 2.4 } })} actKey={k} front={<Chalk k={beat.i === 3 ? k : 0} />} />
    </Stage>
  );
}

function Pipette({ k, change }: { k: number; change: boolean }) {
  return (
    <g>
      {/* İki deney tüpü */}
      {[-4, 32].map((x, i) => (
        <g key={x}>
          <rect x={x - 2.4} y="18" width="4.8" height="12" rx="2.4" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.4" />
          <motion.rect key={`${k}${i}`} x={x - 2} y="23" width="4" height="6.6" rx="2" initial={{ fill: NEON[i] }} animate={{ fill: change && i === 1 ? [NEON[1], NEON[4], NEON[2], NEON[3]] : NEON[i] }} transition={{ duration: 1.6, delay: 0.8 }} />
        </g>
      ))}
      <motion.g animate={{ x: [0, 22, 22, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.4, 0.7, 1] }}>
        <path d="M-4.6 6 h1.2 v8 l-0.6 3 l-0.6 -3 Z" fill="rgba(255,255,255,0.7)" />
        <ellipse cx="-4" cy="5" rx="1.4" ry="2" fill="#c0392b" />
        <motion.circle cx="-4" cy="18" r="0.7" fill={NEON[0]} animate={{ y: [0, 5], opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.6 }} />
        <Hand x={-4} y={6} />
      </motion.g>
    </g>
  );
}

function Frizz() {
  return <path d="M2 4 L0 -6 L5 0 L6 -10 L9 -1 L12 -12 L14 -1 L18 -10 L18 0 L24 -6 L22 4 Z" fill="#2b2b33" />;
}

function Soot() {
  return (
    <g>
      {[[6, 6, 3], [17, 4, 2.6], [12, 18, 3.4], [4, 16, 2], [20, 15, 2.2]].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx={r * 1.3} ry={r} fill="#1a1a1e" opacity="0.6" />
      ))}
      <motion.path d="M26 -2 l2 3 l-2 1 l3 3" stroke="#ffe04a" strokeWidth="0.8" fill="none" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 1.2 }} />
      <Hand x={-5} y={22} />
      <Hand x={29} y={22} />
    </g>
  );
}

function Chalk({ k }: { k: number }) {
  return (
    <g>
      <motion.g key={k} animate={{ x: [0, 4, -2, 6, 0], y: [0, -3, 2, -1, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
        <rect x="28" y="-8" width="5" height="1.8" rx="0.6" fill="#f4f1e8" transform="rotate(-30 30 -7)" />
        <Hand x={29} y={-6} />
      </motion.g>
      <Hand x={-4} y={20} />
    </g>
  );
}

// ------------------------------------------------------------------ 19. Lavanta tarlası ve pikap

export function Lavender() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage medium="canvas" clock="st-c-oil"
      sky="linear-gradient(180deg, #3a3080 0%, #9a5aa0 34%, #f0887a 62%, #fbc88a 100%)"
      vignette={0.32}
      lights={[{ x: 560, y: 560, r: 760, color: "rgba(255,200,140,0.55)", opacity: 0.55 }]}
    >
      <Stars count={14} maxY={200} />
      <Painted look="oil" seed={817}>
        <defs>
          <radialGradient id="lv-sun" cx="50%" cy="40%" r="60%">
            <stop offset="0" stopColor="#fff4d0" />
            <stop offset="1" stopColor="#ffb87a" />
          </radialGradient>
          <linearGradient id="lv-row" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a6ac8" />
            <stop offset="1" stopColor="#b48ae6" />
          </linearGradient>
          <linearGradient id="lv-gap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5a4a7a" />
            <stop offset="1" stopColor="#3a2a4a" />
          </linearGradient>
        </defs>
        <circle cx="560" cy="560" r="260" fill="#ffd8a0" opacity="0.25" filter="url(#nk-blur)" />
        <circle cx="560" cy="560" r="90" fill="url(#lv-sun)" />
        {/* Empresyonist dokunuşlar: gökte ve ışıkta kısa, renkli fırça lekeleri */}
        {Array.from({ length: 260 }, (_, i) => {
          const x = (i * 197) % W;
          const y = 40 + ((i * 89) % 520);
          const c = ["#f0985e", "#e06a94", "#9a6ad0", "#ffc870", "#6a5ac8", "#ec7a5a"][i % 6];
          return <ellipse key={`dab${i}`} cx={x} cy={y} rx={16 + (i % 4) * 5} ry="7" fill={c} opacity="0.62" transform={`rotate(${(i % 5) * 9 - 18} ${x} ${y})`} />;
        })}
        {/* Uzak tepeler: iki kat, sisli; birinde bir selvi sırası */}
        <path d="M0 540 Q 250 470 520 520 T 1100 500 T 1600 490 L1600 600 L0 600 Z" fill="#a46a9a" opacity="0.7" />
        <path d="M0 560 Q 300 500 600 550 T 1200 540 T 1600 530 L1600 600 L0 600 Z" fill="#7a4e84" />
        {[1180, 1210, 1240, 1270, 1300].map((x, i) => (
          <ellipse key={x} cx={x} cy={520 - (i % 2) * 6} rx="9" ry={34 + (i % 2) * 8} fill="#4a3060" />
        ))}
        {/* Ufka uzanan lavanta sıraları: aralarda toprak, sıralarda çiçek dokusu */}
        <rect x="0" y="570" width={W} height="330" fill="url(#lv-gap)" />
        {Array.from({ length: 22 }, (_, i) => {
          const xb = (i - 4) * 110;
          const top = 800 + (xb - 800) * 0.12;
          return (
            <g key={i}>
              <path d={`M${top} 575 L${xb - 30} 900 L${xb + 50} 900 Z`} fill="url(#lv-row)" />
              {Array.from({ length: 6 }, (_, j) => {
                const t = (j + 1) / 7;
                const cx = top + (xb + 10 - top) * t;
                const cy = 575 + 325 * t;
                return <circle key={j} cx={cx} cy={cy} r={2 + t * 7} fill={j % 2 ? "#d6b8ff" : "#7a50b0"} opacity="0.55" />;
              })}
            </g>
          );
        })}
        {/* Korkuluk */}
        <line x1="700" y1="380" x2="700" y2="760" stroke="#6b4a2e" strokeWidth="12" />
        <line x1="620" y1="470" x2="780" y2="470" stroke="#6b4a2e" strokeWidth="10" />
        <path d="M660 440 h80 l20 110 h-120 Z" fill="#3f6aa8" />
        <circle cx="700" cy="410" r="36" fill="#e8d4a0" />
        <ellipse cx="700" cy="380" rx="62" ry="10" fill="#c9a24a" />
        <path d="M672 380 q0 -34 28 -34 q28 0 28 34 Z" fill="#d9b25a" />
        {/* Ahşap kasalı nostaljik pikap */}
        <g transform="translate(980 520)">
          <path d="M0 140 v-80 q0 -20 20 -20 h130 l40 -60 h120 q20 0 24 20 l10 60 v80 Z" fill="#3a9a8a" />
          <path d="M200 -16 h100 l10 56 h-136 Z" fill="#bfe6f0" opacity="0.85" />
          <rect x="330" y="20" width="230" height="120" fill="#a8744a" />
          {[40, 70, 100].map((y) => (
            <line key={y} x1="330" y1={y} x2="560" y2={y} stroke="#8a5a34" strokeWidth="4" />
          ))}
          <rect x="556" y="20" width="12" height="120" fill="#8a5a34" />
          <rect x="-6" y="120" width="580" height="26" rx="8" fill="#c9ced6" />
          {[90, 460].map((x) => (
            <g key={x}>
              <circle cx={x} cy="150" r="46" fill="#1a1a20" />
              <circle cx={x} cy="150" r="20" fill="#c9ced6" />
            </g>
          ))}
          <circle cx="10" cy="80" r="12" fill="#ffe6a0" />
        </g>
      </Painted>
      {/* Kelebekler */}
      {[0, 1, 2].map((i) => (
        <motion.svg key={i} className="absolute" style={{ left: 300 + i * 120, top: 650 }} width="24" height="20" viewBox="0 0 24 20" animate={{ x: [0, 80, -40, 60, 0], y: [0, -60, -20, -90, 0] }} transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut" }}>
          <motion.g style={{ transformOrigin: "12px 10px" }} animate={{ scaleX: [1, 0.2, 1] }} transition={{ duration: 0.3, repeat: Infinity }}>
            <path d="M12 10 Q 2 0 2 8 Q 2 16 12 10 Q 22 16 22 8 Q 22 0 12 10 Z" fill={["#fff4a8", "#ffffff", "#ffb0d0"][i]} />
          </motion.g>
        </motion.svg>
      ))}
      <Drift count={10} from={900} to={300} dur={[10, 16]} xs={[0, W]} sway={40} render={() => <span className="block h-2 w-2 rounded-full bg-[#fff6a8]" style={{ boxShadow: "0 0 8px #fff6a8" }} />} />

      <LavenderClock />
      {/* Kasada sırt üstü uzanmış, ağzında başakla yıldız sayan */}
      <Actor shadow={false} x={1430} y={560} size={92} look={look({ shape: "bear" })} color="#FF8A1F" expression={beat.i === 0 ? "happy" : "idle"} move={{ animate: { rotate: [-78, -74, -78] }, transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } }} act={on(beat, 0, { animate: { y: [0, -6, 0] }, transition: { duration: 0.8 } })} actKey={k} front={<Wheat point={beat.i === 0} k={k} />} />
      {/* Kaputun üstünde mandolin çalan */}
      <Actor shadow={false} x={1080} y={570} size={90} look={look({ shape: "sphere", head: "cap" })} color="#FF5C8A" expression="happy" move={{ animate: { rotate: [-4, 4, -4] }, transition: { duration: 1, repeat: Infinity, ease: "easeInOut" } }} act={on(beat, 2, hop(14))} actKey={k} front={<Mandolin />} />
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="absolute text-[28px] font-black text-white/80" style={{ left: 1110, top: 470 }} animate={{ y: [0, -90], x: [0, 30 + i * 10], opacity: [0, 1, 0] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8 }}>
          ♪
        </motion.span>
      ))}
      {/* Lavanta buketiyle kelebek kovalayan */}
      <motion.div className="absolute inset-0" animate={{ x: [0, 220, 220, 0, 0] }} transition={{ duration: 14, times: [0, 0.4, 0.5, 0.9, 1], repeat: Infinity, ease: "easeInOut" }}>
        <Actor morph={beat.n[1]} morphDelay={500} x={300} y={830} size={92} look={look({ shape: "flower" })} color="#FFD21F" expression={beat.i === 1 ? "love" : "happy"} move={{ animate: { y: [0, -10, 0] }, transition: { duration: 0.6, repeat: Infinity } }} act={on(beat, 1, hop(30))} actKey={k} front={<Bouquet />} />
      </motion.div>
      {/* Korkuluğun şapkasına konmuş, etrafı izleyen */}
      <Actor shadow={false} x={700} y={372} size={70} look={look({ shape: "sphere", texture: "plush" })} color="#2FD4C0" flip={beat.i === 3} expression={beat.i === 3 ? "surprised" : "idle"} move={sway(3, 4)} act={on(beat, 3, hop(12))} actKey={k} />
    </Stage>
  );
}

function Wheat({ point, k }: { point: boolean; k: number }) {
  return (
    <g>
      <path d="M17 17 L30 9" stroke="#e8c46a" strokeWidth="0.8" />
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={28 + i * 1.6} cy={9.6 - i * 1} rx="1.4" ry="0.7" fill="#e8c46a" transform={`rotate(-30 ${28 + i * 1.6} ${9.6 - i})`} />
      ))}
      <motion.g key={k} animate={point ? { x: [0, 6, 6, 0], y: [0, -14, -14, 0] } : {}} transition={{ duration: 2 }}>
        <Hand x={22} y={22} />
      </motion.g>
      <Hand x={2} y={24} />
    </g>
  );
}

function Mandolin() {
  return (
    <g>
      <ellipse cx="6" cy="21" rx="7" ry="5.6" fill="#a8622a" transform="rotate(-20 6 21)" />
      <circle cx="6.6" cy="20.4" r="1.6" fill="#3a1a0a" />
      <path d="M10 18 L26 10" stroke="#5a3a22" strokeWidth="2" strokeLinecap="round" />
      <motion.g animate={{ y: [0, 1.6, 0] }} transition={{ duration: 0.25, repeat: Infinity }}>
        <Hand x={7} y={24} />
      </motion.g>
      <Hand x={23} y={12} />
    </g>
  );
}

function Bouquet() {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <line x1={30} y1={22} x2={26 + i * 2.4} y2={6} stroke="#5a8a4a" strokeWidth="0.7" />
          {[0, 1, 2].map((j) => (
            <ellipse key={j} cx={26 + i * 2.4} cy={6 + j * 2} rx="0.9" ry="1.2" fill="#9a6ad0" />
          ))}
        </g>
      ))}
      <Hand x={29} y={20} />
      <Hand x={-4} y={16} />
    </g>
  );
}

// ------------------------------------------------------------------ 20. Yeraltı sığınağı

export function Bunker() {
  const beat = useBeat(4);
  const k = beat.k;
  const dim = beat.i === 3;
  return (
    <Stage
      sky="linear-gradient(180deg, #23281f 0%, #2f342b 100%)"
      lights={[
        { x: 800, y: 190, r: 640, color: "rgba(255,210,140,0.5)", opacity: dim ? 0.15 : 0.55, flicker: 0.12 },
        { x: 770, y: 600, r: 300, color: "rgba(93,255,168,0.45)", opacity: 0.5, flicker: 0.1 },
      ]}
    >
      <Painted look="pixel" seed={615} pixel={4}>
        <defs>
          <linearGradient id="bk-block" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#454b42" />
            <stop offset="1" stopColor="#353a33" />
          </linearGradient>
          <linearGradient id="bk-can" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6a7378" />
            <stop offset="0.4" stopColor="#d4dade" />
            <stop offset="1" stopColor="#6a7378" />
          </linearGradient>
          <linearGradient id="bk-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2c3128" />
            <stop offset="1" stopColor="#15180f" />
          </linearGradient>
        </defs>
        {/* Beton bloklar: derzli, lekeli */}
        {Array.from({ length: 9 }, (_, r) =>
          Array.from({ length: 9 }, (_, i) => <rect key={`${r}-${i}`} x={i * 200 - (r % 2) * 100} y={r * 90} width="196" height="86" rx="3" fill="url(#bk-block)" opacity="0.75" />),
        )}
        {[[300, 120, 80], [1180, 200, 60], [500, 640, 100], [1460, 420, 70]].map(([x, y, r], i) => (
          <ellipse key={`stn${i}`} cx={x} cy={y} rx={r} ry={r * 0.6} fill="#1a1d16" opacity="0.25" filter="url(#nk-blur-s)" />
        ))}
        {/* Piksel dither gölgeleri: duvarın üstü ve köşeler dama desenle koyulaşır */}
        <defs>
          <pattern id="bk-dith" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="4" height="4" fill="#0e110b" />
            <rect x="4" y="4" width="4" height="4" fill="#0e110b" />
          </pattern>
          <pattern id="bk-dith2" width="16" height="16" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="4" height="4" fill="#0e110b" />
            <rect x="8" y="8" width="4" height="4" fill="#0e110b" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={W} height="120" fill="url(#bk-dith)" opacity="0.55" />
        <rect x="0" y="120" width={W} height="140" fill="url(#bk-dith2)" opacity="0.5" />
        <rect x="0" y="0" width="120" height="900" fill="url(#bk-dith2)" opacity="0.45" />
        <rect x="1480" y="0" width="120" height="900" fill="url(#bk-dith2)" opacity="0.45" />
        {Array.from({ length: 9 }, (_, r) =>
          Array.from({ length: 9 }, (_, i) => <rect key={`hl${r}-${i}`} x={i * 200 - (r % 2) * 100} y={r * 90} width="196" height="4" fill="#6a7262" opacity="0.7" />),
        )}
        {/* Tavanda boru hattı (ampul aşağıda, kendi sallanan katmanında) */}
        <rect x="0" y="40" width={W} height="20" fill="#4a5048" />
        <rect x="0" y="40" width={W} height="5" fill="#7a8278" />
        {[200, 600, 1000, 1400].map((x) => (
          <rect key={x} x={x - 8} y="34" width="16" height="32" rx="3" fill="#5a6058" />
        ))}
        {/* Kapı: sarı-siyah uyarı şeridi */}
        <rect x="430" y="300" width="130" height="500" fill="#4a5048" stroke="#2a2e26" strokeWidth="6" />
        <circle cx="495" cy="500" r="30" fill="none" stroke="#8a9288" strokeWidth="8" />
        {Array.from({ length: 6 }, (_, i) => (
          <polygon key={`hz${i}`} points={`${430 + i * 22},300 ${444 + i * 22},300 ${430 + i * 22 + 2},316 ${416 + i * 22 + 2},316`} fill={i % 2 ? "#1a1a1a" : "#e0b81f"} />
        ))}
        {/* Piksel sanat ayrıntıları: ampulün çevresinde bantlı ışık halkaları, duvarda harita posteri, uyarı levhası */}
        {[300, 220, 150, 90].map((r, i) => (
          <circle key={`lb${i}`} cx="800" cy="190" r={r} fill="#ffe6a0" opacity={0.06 + i * 0.03} />
        ))}
        <rect x="600" y="300" width="150" height="104" fill="#e8dcb4" />
        <rect x="610" y="310" width="130" height="84" fill="#9ab4a0" />
        <path d="M620 380 L640 340 L670 360 L700 320 L730 350 L730 384 L620 384 Z" fill="#6a8a6a" />
        {[[650, 350], [700, 336]].map(([x, y], i) => (
          <rect key={`pin${i}`} x={x} y={y} width="8" height="8" fill="#c0392b" />
        ))}
        <path d="M1420 300 l 60 0 l -30 -54 Z" fill="#e0b81f" />
        <rect x="1446" y="264" width="8" height="20" fill="#1a1a1a" />
        <rect x="1446" y="288" width="8" height="8" fill="#1a1a1a" />
        {/* Konserve rafı */}
        {[330, 460, 590].map((y, r) => (
          <g key={y}>
            <rect x="40" y={y} width="360" height="12" fill="#5a5a4a" />
            <rect x="40" y={y + 12} width="360" height="6" fill="#000" opacity="0.3" />
            {Array.from({ length: 7 }, (_, i) => (
              <g key={i} transform={`translate(${60 + i * 48} ${y})`}>
                <rect x="0" y="-56" width="38" height="56" rx="4" fill="url(#bk-can)" />
                <rect x="0" y="-44" width="38" height="28" fill={["#c0392b", "#d9b21f", "#3f7a4a", "#2b6aa8"][(i + r) % 4]} />
                <rect x="6" y="-44" width="6" height="28" fill="#fff" opacity="0.25" />
              </g>
            ))}
          </g>
        ))}
        {/* Yeşil ekranlı tüplü monitörler ve telsiz masası */}
        <rect x="580" y="690" width="400" height="22" fill="#4a4a3a" />
        <rect x="580" y="690" width="400" height="4" fill="#7a7a62" />
        <rect x="600" y="712" width="18" height="100" fill="#3a3a2a" />
        <rect x="942" y="712" width="18" height="100" fill="#3a3a2a" />
        {[[600, 540], [780, 520]].map(([x, y], i) => (
          <g key={i}>
            <rect x={x} y={y} width="160" height="150" rx="14" fill="#c9c2a8" />
            <rect x={x + 16} y={y + 16} width="128" height="100" rx="18" fill="#07150d" />
            <rect x={x + 10} y={y + 10} width="140" height="112" rx="22" fill="#5dffa8" opacity="0.12" filter="url(#nk-blur-s)" />
            <rect x={x + 30} y={y + 120} width="20" height="10" rx="3" fill="#7a7a6a" />
          </g>
        ))}
        {/* Ranza */}
        <rect x="1020" y="300" width="18" height="510" fill="#5a6a5a" />
        <rect x="1320" y="300" width="18" height="510" fill="#5a6a5a" />
        <rect x="1030" y="470" width="300" height="36" rx="10" fill="#6b7a4a" />
        <rect x="1030" y="470" width="300" height="8" rx="4" fill="#8a9a5a" />
        <rect x="1030" y="720" width="300" height="36" rx="10" fill="#6b7a4a" />
        <rect x="1030" y="720" width="300" height="8" rx="4" fill="#8a9a5a" />
        <rect x="1040" y="450" width="80" height="24" rx="10" fill="#e8e2c8" />
        <path d="M1130 474 q60 -16 190 0 v12 h-190 Z" fill="#4a5a34" />
        {/* Jeneratör: sallanır, egzozundan duman */}
        <ellipse cx="1480" cy="806" rx="110" ry="10" fill="#000" opacity="0.45" />
        <rect x="1390" y="660" width="180" height="140" rx="12" fill="#a8622a" />
        <rect x="1390" y="660" width="180" height="14" rx="7" fill="#c8823a" />
        <rect x="1410" y="680" width="80" height="50" rx="6" fill="#5a3a22" />
        {[690, 702, 714].map((y) => (
          <line key={y} x1="1416" y1={y} x2="1484" y2={y} stroke="#3a2412" strokeWidth="3" />
        ))}
        <circle cx="1530" cy="740" r="28" fill="#3a2a1a" />
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="bk-block" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#454b42" />
            <stop offset="1" stopColor="#353a33" />
          </linearGradient>
          <linearGradient id="bk-can" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6a7378" />
            <stop offset="0.4" stopColor="#d4dade" />
            <stop offset="1" stopColor="#6a7378" />
          </linearGradient>
          <linearGradient id="bk-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2c3128" />
            <stop offset="1" stopColor="#15180f" />
          </linearGradient>
        </defs>
        <motion.circle cx="1530" cy="740" r="18" fill="none" stroke="#6a4a2a" strokeWidth="4" strokeDasharray="10 8" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "1530px 740px" }} />
      </Layer>
      <Painted look="pixel" seed={615} pixel={4}>
        <defs>
          <linearGradient id="bk-block" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#454b42" />
            <stop offset="1" stopColor="#353a33" />
          </linearGradient>
          <linearGradient id="bk-can" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6a7378" />
            <stop offset="0.4" stopColor="#d4dade" />
            <stop offset="1" stopColor="#6a7378" />
          </linearGradient>
          <linearGradient id="bk-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2c3128" />
            <stop offset="1" stopColor="#15180f" />
          </linearGradient>
        </defs>
        <rect x="1540" y="630" width="14" height="34" fill="#3a3a3a" />
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="bk-block" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#454b42" />
            <stop offset="1" stopColor="#353a33" />
          </linearGradient>
          <linearGradient id="bk-can" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6a7378" />
            <stop offset="0.4" stopColor="#d4dade" />
            <stop offset="1" stopColor="#6a7378" />
          </linearGradient>
          <linearGradient id="bk-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2c3128" />
            <stop offset="1" stopColor="#15180f" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((i) => (
          <motion.circle key={`sm${i}`} cx="1547" cy="626" r={8 + i * 3} fill="#6a6a62" opacity="0.5" style={{ transformBox: "fill-box", transformOrigin: "center" }} animate={{ y: [0, -86], opacity: [0.5, 0], scale: [0.6, 1.8] }} transition={{ duration: 3, repeat: Infinity, delay: i, ease: "easeOut" }} />
        ))}
      </Layer>
      <Painted look="pixel" seed={615} pixel={4}>
        <defs>
          <linearGradient id="bk-block" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#454b42" />
            <stop offset="1" stopColor="#353a33" />
          </linearGradient>
          <linearGradient id="bk-can" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6a7378" />
            <stop offset="0.4" stopColor="#d4dade" />
            <stop offset="1" stopColor="#6a7378" />
          </linearGradient>
          <linearGradient id="bk-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2c3128" />
            <stop offset="1" stopColor="#15180f" />
          </linearGradient>
        </defs>
        {/* Zemin */}
        <rect x="0" y="800" width={W} height="100" fill="url(#bk-floor)" />
        <rect x="0" y="800" width={W} height="4" fill="#4a5242" />
      </Painted>
      {/* Monitörlerde akan yeşil çizgiler */}
      {[[616, 556], [796, 536]].map(([x, y], i) => (
        <div key={i} className="absolute overflow-hidden rounded-[16px]" style={{ left: x, top: y, width: 128, height: 100 }}>
          <motion.svg width="256" height="100" animate={{ x: [0, -128] }} transition={{ duration: 2 + i, repeat: Infinity, ease: "linear" }}>
            <path d={`M0 50 ${Array.from({ length: 16 }, (_, j) => `L${j * 16 + 8} ${j % 2 ? 30 + (j % 3) * 10 : 70 - (j % 4) * 6}`).join(" ")} L256 50`} stroke="#5dffa8" strokeWidth="2.4" fill="none" style={{ filter: "drop-shadow(0 0 4px #5dffa8)" }} />
          </motion.svg>
        </div>
      ))}
      {/* Tavanda sallanan kafesli sarı ampul ve ışığı */}
      <motion.div className="absolute" style={{ left: 780, top: 0, width: 40, height: 220, originX: 0.5, originY: 0 }} animate={{ rotate: [-6, 6, -6] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}>
        <span className="absolute left-[19px] top-0 h-[170px] w-[2px] bg-[#1a1a1a]" />
        <motion.span className="absolute left-[-280px] top-[150px] h-[600px] w-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,214,110,0.38), rgba(255,214,110,0) 60%)" }} animate={{ opacity: dim ? [1, 0.2, 0.7, 0.1, 0.9, 1] : [0.9, 1, 0.9] }} transition={{ duration: dim ? 2 : 2.6, repeat: dim ? 0 : Infinity }} />
        <svg className="absolute left-[-8px] top-[160px] overflow-visible" width="56" height="60">
          <motion.ellipse cx="28" cy="30" rx="16" ry="20" fill="#ffd66e" animate={{ opacity: dim ? [1, 0.3, 0.8, 0.2, 1] : 1 }} transition={{ duration: 2 }} />
          {[10, 28, 46].map((x) => (
            <line key={x} x1={x} y1="8" x2={x} y2="54" stroke="#3a3a2a" strokeWidth="2.4" />
          ))}
          <path d="M8 24 Q 28 16 48 24 M8 40 Q 28 48 48 40" stroke="#3a3a2a" strokeWidth="2.4" fill="none" />
          <rect x="18" y="0" width="20" height="10" rx="2" fill="#3a3a2a" />
        </svg>
      </motion.div>

      <BunkerClock />
      {/* Askeri miğferli, dev açacakla fasulye konservesi açan */}
      <Actor x={420} y={800} size={104} look={look({ shape: "sphere", head: "helmet" })} color="#C9F23A" expression={beat.i === 0 ? "happy" : "focused"} move={breathe(3)} act={on(beat, 0, hop(16))} actKey={k} front={<><CanOpener k={k} pop={beat.i === 0} /></>} />
      {/* Telsizin başında kulaklıkla mors dinleyen */}
      <Actor x={760} y={690} size={92} look={look({ shape: "egg", head: "headphones" })} color="#FF6A3D" expression={beat.i === 1 ? "surprised" : "focused"} move={breathe(3.4)} act={on(beat, 1, hop(12))} actKey={k} front={<><Hand x={-2} y={4} /><Hand x={28} y={20} /></>} />
      <div className="absolute flex gap-2" style={{ left: 700, top: 470 }}>
        {[1, 0, 0, 1, 0].map((dash, i) => (
          <motion.span key={`${i}-${beat.i === 1 ? k : 0}`} className="h-2.5 rounded-full bg-[#5dffa8]" style={{ width: dash ? 22 : 10, boxShadow: "0 0 6px #5dffa8" }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.25 }} />
        ))}
      </div>
      {/* Ranzanın üst katında bacaklarını sallandırıp çizgi roman okuyan */}
      <Actor x={1220} y={472} size={90} look={look({ shape: "bean", texture: "plush" })} color="#2B8CFF" expression={beat.i === 2 ? "giggle" : "happy"} move={breathe(3.6, 2)} act={on(beat, 2, { animate: { rotate: [0, -8, 8, 0] }, transition: { duration: 1.2 } })} actKey={k} back={<Legs />} front={<Comic />} />
      {/* Jeneratörün kolunu çevirip ışığı yanık tutan */}
      <Actor morph={beat.n[3]} morphDelay={900} x={1370} y={800} size={96} look={look({ shape: "cube", head: "cap" })} color="#FFD21F" flip expression={dim ? "dizzy" : "focused"} move={breathe(2.4)} front={<Crank stop={dim} />} />
    </Stage>
  );
}

function CanOpener({ k, pop }: { k: number; pop: boolean }) {
  return (
    <g>
      <rect x="-8" y="16" width="12" height="13" rx="1.4" fill="#9aa3a8" />
      <rect x="-8" y="19" width="12" height="7" fill="#c0392b" />
      <motion.g key={k} style={{ transformOrigin: "-2px 16px" }} animate={{ rotate: pop ? [0, 360] : [0, 30, 0] }} transition={pop ? { duration: 1 } : { duration: 0.8, repeat: Infinity }}>
        <path d="M-2 16 L18 6" stroke="#5a5a62" strokeWidth="2.2" strokeLinecap="round" />
        <Hand x={18} y={6} />
      </motion.g>
      {pop &&
        [0, 1, 2, 3].map((i) => (
          <motion.ellipse key={`${k}${i}`} cx={-2} cy={14} rx="1.2" ry="0.8" fill="#a8622a" animate={{ x: (i - 1.5) * 6, y: [0, -10, 4], opacity: [1, 1, 0] }} transition={{ duration: 0.9, delay: 0.8 }} />
        ))}
      <Hand x={-9} y={24} />
    </g>
  );
}

function Legs() {
  return (
    <g>
      {[7, 17].map((x, i) => (
        <motion.g key={x} style={{ transformOrigin: `${x}px 22px` }} animate={{ rotate: i ? [-20, 20, -20] : [20, -20, 20] }} transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}>
          <rect x={x - 1.6} y="22" width="3.2" height="12" rx="1.6" fill="#1f4a8a" />
          <ellipse cx={x} cy="34" rx="2.6" ry="1.6" fill="#e8e2c8" />
        </motion.g>
      ))}
    </g>
  );
}

function Comic() {
  return (
    <g>
      <rect x="0" y="12" width="11.6" height="13" fill="#ffd21f" />
      <rect x="12.4" y="12" width="11.6" height="13" fill="#ff3ea5" />
      <rect x="1.6" y="13.6" width="8.4" height="4.6" fill="#fff" />
      <rect x="14" y="13.6" width="8.4" height="4.6" fill="#00e0ff" />
      <circle cx="18" cy="21.6" r="2" fill="#fff" />
      <Hand x={-1} y={20} />
      <Hand x={25} y={20} />
    </g>
  );
}

function Crank({ stop }: { stop: boolean }) {
  return (
    <g>
      <motion.g style={{ transformOrigin: "-6px 16px" }} animate={{ rotate: stop ? 0 : 360 }} transition={stop ? { duration: 0.4 } : { duration: 1, repeat: Infinity, ease: "linear" }}>
        <line x1="-6" y1="16" x2="-6" y2="6" stroke="#5a5a62" strokeWidth="2" />
        <Hand x={-6} y={6} />
      </motion.g>
      <circle cx="-6" cy="16" r="1.6" fill="#3a3a3a" />
    </g>
  );
}

// ------------------------------------------------------------------ 21. Lunapark dönme dolabı

const R = 320;
const SPIN = 90;

export function Ferris() {
  const beat = useBeat(4);
  const k = beat.k;
  const gondolas = 10;
  const colors = ["#ff3b4a", "#ffd21f", "#2fd4c0", "#9b7bff", "#ff8a1f"];
  return (
    <Stage clock="st-soft3d"
      sky="linear-gradient(180deg, #151640 0%, #3e3274 36%, #b0648a 70%, #f2a07a 100%)"
      lights={[
        { x: 980, y: 470, r: 520, color: "rgba(255,170,200,0.4)", opacity: 0.5, flicker: 0.15 },
        { x: 800, y: 800, r: 700, color: "rgba(255,190,120,0.35)", opacity: 0.45, flicker: 0.2 },
      ]}
    >
      <Stars count={30} maxY={260} />
      <Painted look="puff" seed={619}>
        <defs>
          <linearGradient id="fw-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a1a3a" />
            <stop offset="1" stopColor="#120a1c" />
          </linearGradient>
          <linearGradient id="fw-leg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a8a2c0" />
            <stop offset="0.5" stopColor="#f4f0ff" />
            <stop offset="1" stopColor="#a8a2c0" />
          </linearGradient>
        </defs>
          {/* Pamuk şeker gibi şişkin bulutlar ve alacakaranlıkta yuvarlak tepeler (look="puff" her topu şişirir) */}
          {[[180, 220, 1], [520, 140, 0.8], [1380, 200, 1.1], [1120, 320, 0.7], [300, 400, 0.6]].map(([x, y, s], i) => (
            <g key={`cl${i}`}>
              {[[-60, 10, 40], [-20, -14, 52], [30, -6, 46], [70, 12, 34], [10, 18, 40]].map(([dx, dy, r], j) => (
                <circle key={j} cx={x + dx * s} cy={y + dy * s} r={r * s} fill={j % 2 ? "#f6c8dc" : "#ead4f2"} />
              ))}
            </g>
          ))}
          <path d="M0 760 Q 200 660 420 720 Q 640 650 860 730 Q 1100 640 1320 720 Q 1480 670 1600 700 L1600 800 L0 800 Z" fill="#5a3a7a" />
          <path d="M0 780 Q 260 720 520 770 Q 800 710 1080 770 Q 1340 720 1600 760 L1600 800 L0 800 Z" fill="#6a4a8a" />
          {/* Uzaktaki şehir silueti, pencereler */}
          {[[0, 640, 90], [100, 600, 70], [190, 660, 110], [1160, 620, 80], [1250, 580, 60], [1320, 640, 120], [1450, 600, 90], [1540, 650, 70]].map(([x, y, w], i) => (
            <g key={`cy${i}`}>
              <rect x={x} y={y} width={w} height={800 - y} fill="#2a2050" opacity="0.8" />
              {Array.from({ length: 6 }, (_, j) => (
                <rect key={j} x={x + 10 + (j % 3) * (w / 3.4)} y={y + 16 + Math.floor(j / 3) * 30} width="8" height="12" fill="#ffd27a" opacity={(i + j) % 3 ? 0.15 : 0.6} />
              ))}
            </g>
          ))}
          {/* Çizgili lunapark çadırları, tepelerinde bayrak */}
          {[[170, 800, 90, 110], [360, 800, 60, 80], [1380, 800, 80, 100], [1520, 800, 60, 70]].map(([cx, by, hw, h], i) => (
            <g key={`tn${i}`}>
              <path d={`M${cx - hw} ${by} L${cx} ${by - h} L${cx + hw} ${by} Z`} fill={i % 2 ? "#3a2a6a" : "#5a2a4a"} />
              {Array.from({ length: 4 }, (_, j) => (
                <path key={j} d={`M${cx} ${by - h} L${cx - hw + (j * 2 + 0.5) * (hw / 4)} ${by} L${cx - hw + (j * 2 + 1.5) * (hw / 4)} ${by} Z`} fill={colors[(i + j) % colors.length]} opacity="0.55" />
              ))}
              <line x1={cx} y1={by - h} x2={cx} y2={by - h - 24} stroke="#ddd" strokeWidth="2" />
              <path d={`M${cx} ${by - h - 24} l16 5 l-16 5 Z`} fill={colors[i % colors.length]} />
            </g>
          ))}
          {/* Uzaktaki lunapark ışıkları: girland gibi asılı */}
          {[[0, 700, 520], [1100, 690, 1600]].map(([x1, y, x2], g) => (
            <path key={`gl${g}`} d={`M${x1} ${y} Q ${(x1 + x2) / 2} ${y + 50} ${x2} ${y}`} stroke="#2a1a3a" strokeWidth="2" fill="none" />
          ))}
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="fw-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a1a3a" />
            <stop offset="1" stopColor="#120a1c" />
          </linearGradient>
          <linearGradient id="fw-leg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a8a2c0" />
            <stop offset="0.5" stopColor="#f4f0ff" />
            <stop offset="1" stopColor="#a8a2c0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 40 }, (_, i) => (
          <motion.circle key={i} cx={(i * 397) % W} cy={720 + ((i * 53) % 60)} r={3 + (i % 3)} fill={colors[i % colors.length]} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1 + (i % 4) * 0.4, repeat: Infinity, delay: (i % 7) * 0.2 }} style={{ filter: `drop-shadow(0 0 6px ${colors[i % colors.length]})` }} />
        ))}
      </Layer>
      <Painted look="puff" seed={619}>
        <defs>
          <linearGradient id="fw-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a1a3a" />
            <stop offset="1" stopColor="#120a1c" />
          </linearGradient>
          <linearGradient id="fw-leg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a8a2c0" />
            <stop offset="0.5" stopColor="#f4f0ff" />
            <stop offset="1" stopColor="#a8a2c0" />
          </linearGradient>
        </defs>
          <rect x="0" y="790" width={W} height="110" fill="url(#fw-ground)" />
          <ellipse cx="980" cy="840" rx="300" ry="30" fill="#000" opacity="0.4" />
          {/* Ayaklar ve bilet kulübesi */}
          <path d={`M${980 - 200} 830 L980 470 L${980 + 200} 830`} stroke="url(#fw-leg)" strokeWidth="16" fill="none" />
          <path d={`M${980 - 140} 830 L980 470 L${980 + 140} 830`} stroke="#a8a2c0" strokeWidth="8" fill="none" />
          {[560, 660, 760].map((y) => (
            <line key={y} x1={980 - (y - 470) * 0.55} y1={y} x2={980 + (y - 470) * 0.55} y2={y} stroke="#a8a2c0" strokeWidth="5" />
          ))}
          <g>
            <rect x="560" y="740" width="120" height="90" rx="6" fill="#ff3b4a" />
            <path d="M550 744 L620 700 L690 744 Z" fill="#ffd21f" />
            <rect x="580" y="760" width="80" height="40" rx="4" fill="#ffe6a0" />
            <rect x="560" y="806" width="120" height="24" fill="#c02a38" />
          </g>
      </Painted>
      {/* Dönen tekerlek: jantlar, ışıklar; kabinler hep dik kalır */}
      <div className="absolute" style={{ left: 980, top: 470, width: 0, height: 0 }}>
        <motion.div className="absolute" style={{ left: 0, top: 0, width: 0, height: 0 }} animate={{ rotate: 360 }} transition={{ duration: SPIN, repeat: Infinity, ease: "linear" }}>
          <svg className="absolute overflow-visible" style={{ left: -R - 10, top: -R - 10 }} width={2 * R + 20} height={2 * R + 20} viewBox={`${-R - 10} ${-R - 10} ${2 * R + 20} ${2 * R + 20}`}>
            <circle r={R} fill="none" stroke="#e8e2f4" strokeWidth="10" />
            <circle r={R - 40} fill="none" stroke="#c9c2e0" strokeWidth="4" />
            {Array.from({ length: gondolas * 2 }, (_, i) => {
              const a = (i / (gondolas * 2)) * Math.PI * 2;
              return <line key={i} x1="0" y1="0" x2={Math.cos(a) * R} y2={Math.sin(a) * R} stroke="#c9c2e0" strokeWidth="3" />;
            })}
            {Array.from({ length: 36 }, (_, i) => {
              const a = (i / 36) * Math.PI * 2;
              return <motion.circle key={i} cx={Math.cos(a) * R} cy={Math.sin(a) * R} r="5" fill={colors[i % colors.length]} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: (i % 6) * 0.2 }} />;
            })}
            <circle r="34" fill="#e8e2f4" />
            <circle r="16" fill="#ff3b4a" />
          </svg>
          {Array.from({ length: gondolas }, (_, i) => (
            <div key={i} className="absolute" style={{ left: 0, top: 0, width: 0, height: 0, transform: `rotate(${(i / gondolas) * 360}deg) translateY(${-R}px) rotate(${-(i / gondolas) * 360}deg)` }}>
              <motion.div className="absolute" style={{ left: 0, top: 0, width: 0, height: 0 }} animate={{ rotate: -360 }} transition={{ duration: SPIN, repeat: Infinity, ease: "linear" }}>
                <motion.div className="absolute" style={{ left: -70, top: 0, width: 140, height: 130, originX: 0.5, originY: 0 }} animate={{ rotate: [-3, 3, -3] }} transition={{ duration: 3 + (i % 3), repeat: Infinity, ease: "easeInOut" }}>
                  <Gondola color={colors[i % colors.length]}>{RIDERS[i]?.({ beat: beat.i, k, n: beat.n })}</Gondola>
                </motion.div>
              </motion.div>
            </div>
          ))}
        </motion.div>
      </div>

      <FerrisClock />
    </Stage>
  );
}

type Ride = (p: { beat: number; k: number; n: number[] }) => React.JSX.Element;

/** Kabinlerin yolcuları (kabin içi koordinat: 140×130, taban y≈112) */
const RIDERS: Record<number, Ride> = {
  // Yan yana oturup camdan aşağı el sallayan iki Nook
  0: ({ beat, k }) => (
    <>
      <Actor shadow={false} x={46} y={112} size={56} look={look({ shape: "sphere" })} color="#FFD21F" expression="happy" move={breathe(2.6)} act={beat === 0 ? hop(10) : null} actKey={k} front={<Wave />} />
      <Actor shadow={false} x={96} y={112} size={56} look={look({ shape: "bean", head: "bow" })} color="#FF5C8A" flip expression="happy" move={breathe(3)} act={beat === 0 ? hop(10) : null} actKey={k} front={<Wave />} />
    </>
  ),
  // Dev pamuk şekeri yüzüne gözüne bulaştırarak yiyen
  3: ({ beat, k, n }) => <Actor shadow={false} morph={n[1]} morphDelay={600} x={70} y={112} size={64} look={look({ shape: "cat" })} color="#2FD4C0" expression={beat === 1 ? "love" : "happy"} move={breathe(2.4)} act={beat === 1 ? hop(8) : null} actKey={k} front={<CottonCandy />} />,
  // Yükseklikten korkmuş, gözlerini kapatıp tabana büzülmüş
  6: ({ beat, k }) => <Actor shadow={false} x={70} y={114} size={56} look={look({ shape: "egg" })} color="#9B7BFF" expression="shy" move={{ animate: { x: [-1, 1, -1], scaleY: [0.86, 0.9, 0.86] }, transition: { duration: 0.3, repeat: Infinity } }} act={beat === 2 ? { animate: { y: [0, -4, 0, -4, 0] }, transition: { duration: 0.8 } } : null} actKey={k} front={<><Hand x={8} y={11} /><Hand x={16} y={11} /></>} />,
  // Kabinin çatısında kollarını açıp rüzgârın tadını çıkaran
  8: ({ beat, k }) => <Actor shadow={false} x={70} y={-6} size={60} look={look({ shape: "star" })} color="#FF8A1F" expression={beat === 3 ? "giggle" : "happy"} move={sway(2.2, 5)} act={beat === 3 ? hop(14) : null} actKey={k} front={<WindArms />} />,
};

function Gondola({ color, children }: { color: string; children?: React.ReactNode }) {
  return (
    <div className="absolute inset-0">
      <svg className="absolute inset-0 overflow-visible" width="140" height="130">
        <line x1="70" y1="0" x2="70" y2="18" stroke="#c9c2e0" strokeWidth="4" />
        <path d="M14 30 Q 70 0 126 30 Z" fill={color} />
        <rect x="18" y="30" width="104" height="60" rx="8" fill="rgba(255,255,255,0.12)" stroke={color} strokeWidth="5" />
      </svg>
      {children}
      <svg className="pointer-events-none absolute inset-0 overflow-visible" width="140" height="130">
        <path d="M12 86 h116 v24 q0 14 -14 14 h-88 q-14 0 -14 -14 Z" fill={color} />
        <rect x="12" y="86" width="116" height="6" fill="#fff" opacity="0.4" />
      </svg>
    </div>
  );
}

function Wave() {
  return (
    <g>
      <motion.g style={{ transformOrigin: "28px 14px" }} animate={{ rotate: [-25, 20, -25] }} transition={{ duration: 0.5, repeat: Infinity }}>
        <Hand x={30} y={6} />
      </motion.g>
      <Hand x={-4} y={20} />
    </g>
  );
}

function CottonCandy() {
  return (
    <g>
      <line x1="26" y1="24" x2="22" y2="10" stroke="#f3e6d0" strokeWidth="1" />
      <circle cx="21" cy="5" r="7" fill="#ff9ec4" />
      <circle cx="17" cy="2" r="4" fill="#ffb8d4" />
      {[[6, 16, 2.2], [14, 18, 1.8], [18, 12, 1.6]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#ff9ec4" opacity="0.85" />
      ))}
      <Hand x={26} y={22} />
      <Hand x={-4} y={20} />
    </g>
  );
}

function WindArms() {
  return (
    <g>
      <Hand x={-10} y={4} />
      <Hand x={34} y={4} />
      <motion.path d="M20 20 q8 2 12 -2 q-2 6 8 6" stroke="#ff3b4a" strokeWidth="2.4" fill="none" strokeLinecap="round" style={{ transformBox: "fill-box", transformOrigin: "left center" }} animate={{ rotate: [0, 10, -6, 0], scaleY: [1, -1, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />
      <path d="M2 18 Q 12 23 22 18 L22 21 Q 12 26 2 21 Z" fill="#ff3b4a" />
    </g>
  );
}

// ------------------------------------------------------------------ 22. Eskiz defteri ve çizim masası

export function Sketchbook() {
  const beat = useBeat(5);
  const k = beat.k;
  return (
    <Stage clock="st-pencil"
      sky="repeating-linear-gradient(92deg, #5a4030 0px, #634634 18px, #553c2c 34px, #5e4232 52px)"
      vignette={0.45}
      medium="sketch"
      grain={false}
      lights={[{ x: 1560, y: 40, r: 900, color: "rgba(255,235,180,0.45)", opacity: 0.5 }]}
    >
      <Layer>
        <defs>
          <linearGradient id="sk-pageL" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e8dabb" />
            <stop offset="0.85" stopColor="#efe2c4" />
            <stop offset="1" stopColor="#d6c6a2" />
          </linearGradient>
          <linearGradient id="sk-pageR" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#dccca8" />
            <stop offset="0.12" stopColor="#f4e8cc" />
            <stop offset="1" stopColor="#f8eed6" />
          </linearGradient>
        </defs>
        {/* Defterin masaya düşen gölgesi ve alttaki sayfa katları */}
        <rect x="40" y="44" width="1540" height="860" rx="14" fill="#000" opacity="0.35" filter="url(#nk-blur-s)" />
        {[6, 4, 2].map((d) => (
          <rect key={d} x={30 - d} y={30 + d} width={1540 + d * 2} height="860" rx="10" fill="#d8c8a4" stroke="#b8a682" strokeWidth="1" />
        ))}
        {/* Açılmış kalın kraft sayfalar */}
        <rect x="30" y="30" width="770" height="860" rx="10" fill="url(#sk-pageL)" />
        <rect x="800" y="30" width="770" height="860" rx="10" fill="url(#sk-pageR)" />
        {/* Kâğıt dokusu: seyrek lifler */}
        {Array.from({ length: 70 }, (_, i) => (
          <line key={`fb${i}`} x1={60 + ((i * 211) % 1480)} y1={60 + ((i * 97) % 800)} x2={68 + ((i * 211) % 1480)} y2={62 + ((i * 97) % 800)} stroke="#b8a682" strokeWidth="1" opacity="0.4" />
        ))}
        {/* Kahve fincanı izi */}
        <circle cx="1380" cy="760" r="64" fill="none" stroke="#a8784a" strokeWidth="6" opacity="0.18" />
        <circle cx="1386" cy="766" r="60" fill="none" stroke="#a8784a" strokeWidth="2" opacity="0.12" />
        {/* Sayfanın üstünde duran kurşun kalem */}
        <g transform="rotate(-18 560 860)">
          <rect x="420" y="850" width="240" height="16" rx="3" fill="#ffd21f" />
          <rect x="420" y="850" width="240" height="5" fill="#fff4a0" opacity="0.6" />
          <rect x="400" y="850" width="24" height="16" fill="#c0c4cc" />
          <rect x="388" y="850" width="14" height="16" rx="4" fill="#ff8aa0" />
          <path d="M660 850 L700 858 L660 866 Z" fill="#e8c48a" />
          <path d="M688 856 L700 858 L688 860 Z" fill="#33333a" />
        </g>
        <rect x="780" y="30" width="40" height="860" fill="url(#gutter)" />
        <defs>
          <linearGradient id="gutter" x1="0" x2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="0.5" stopColor="#000" stopOpacity="0.18" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0 H0 V40" fill="none" stroke="#8ab0d0" strokeWidth="1" opacity="0.35" />
          </pattern>
        </defs>
        <rect x="830" y="360" width="720" height="510" fill="url(#grid)" />
        <rect x="60" y="60" width="700" height="300" fill="url(#grid)" opacity="0.6" />
      </Layer>
      {/* Karakalem çalışmalar: tarama dokuları, yumuşak grafit gölgeler, ölçü çizgileri */}
      <Painted>
        <defs>
          <pattern id="sk-h1" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="#2a2a32" strokeWidth="1.8" />
          </pattern>
          <pattern id="sk-h2" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-42)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#2a2a32" strokeWidth="1.6" />
          </pattern>
          <radialGradient id="sk-smudge" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#5a5a64" stopOpacity="0.35" />
            <stop offset="1" stopColor="#5a5a64" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Grafit lekeleri (avuç içi sürtmesi) */}
        <ellipse cx="420" cy="300" rx="260" ry="70" fill="url(#sk-smudge)" />
        <ellipse cx="1160" cy="700" rx="220" ry="90" fill="url(#sk-smudge)" />
        <g filter="url(#st-pencil)">
          {/* Sol üst: tepeli manzara, ev, ağaçlar */}
          <path d="M80 330 Q 180 220 300 280 Q 400 200 520 270 Q 620 230 740 300" stroke="#2e2e38" strokeWidth="2.4" fill="none" />
          <path d="M80 330 Q 180 220 300 280 Q 400 200 520 270 Q 620 230 740 300 L740 350 L80 350 Z" fill="url(#sk-h1)" opacity="0.55" />
          <path d="M300 280 Q 400 200 520 270 L520 350 L300 350 Z" fill="url(#sk-h2)" opacity="0.4" />
          <circle cx="640" cy="130" r="34" stroke="#2e2e38" strokeWidth="2" fill="none" />
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return <line key={i} x1={640 + Math.cos(a) * 44} y1={130 + Math.sin(a) * 44} x2={640 + Math.cos(a) * 60} y2={130 + Math.sin(a) * 60} stroke="#2e2e38" strokeWidth="1.6" />;
          })}
          <g transform="translate(180 240)">
            <path d="M0 50 L0 10 L30 -14 L60 10 L60 50 Z" stroke="#2e2e38" strokeWidth="2.2" fill="#fff" fillOpacity="0.2" />
            <path d="M30 -14 L60 10 L60 50 L30 50 Z" fill="url(#sk-h1)" opacity="0.7" />
            <rect x="10" y="24" width="12" height="14" stroke="#2e2e38" strokeWidth="1.6" fill="none" />
            <rect x="38" y="30" width="12" height="20" stroke="#2e2e38" strokeWidth="1.6" fill="none" />
          </g>
          {[[120, 300], [440, 250], [560, 280]].map(([x, y], i) => (
            <g key={i}>
              <line x1={x} y1={y + 40} x2={x} y2={y + 10} stroke="#2e2e38" strokeWidth="2" />
              <ellipse cx={x} cy={y} rx="20" ry="26" stroke="#2e2e38" strokeWidth="1.8" fill="url(#sk-h2)" fillOpacity="0.6" />
            </g>
          ))}
          {/* Sol alt: yarım kalmış blob karakter etütleri (yapı çizgileriyle) */}
          {[[330, 640, 60], [480, 690, 48], [600, 760, 40]].map(([x, y, r], i) => (
            <g key={`bl${i}`} opacity={0.75 - i * 0.12}>
              <circle cx={x} cy={y} r={r} stroke="#3a3a44" strokeWidth="1.6" fill="none" />
              <path d={`M${x - r} ${y} Q ${x} ${y + r * 0.35} ${x + r} ${y}`} stroke="#3a3a44" strokeWidth="1" fill="none" strokeDasharray="4 4" />
              <line x1={x} y1={y - r} x2={x} y2={y + r} stroke="#3a3a44" strokeWidth="1" strokeDasharray="4 4" />
              <rect x={x - r * 0.32} y={y - r * 0.2} width={r * 0.14} height={r * 0.34} rx="3" fill="#2e2e38" />
              <rect x={x + r * 0.18} y={y - r * 0.2} width={r * 0.14} height={r * 0.34} rx="3" fill="#2e2e38" />
              <path d={`M${x - r * 0.1} ${y + r * 0.45} A${r} ${r} 0 0 0 ${x + r * 0.95} ${y + r * 0.1} L${x + r} ${y + r * 0.6} Q ${x + r * 0.4} ${y + r * 1.05} ${x - r * 0.1} ${y + r * 0.45} Z`} fill="url(#sk-h1)" opacity="0.6" />
            </g>
          ))}
          {/* Sağ alt (kareli kısım): ışık-gölge çalışması — küp ve küre */}
          <g transform="translate(1180 620)">
            <path d="M-120 60 L-40 20 L60 60 L-20 100 Z" stroke="#2e2e38" strokeWidth="2" fill="none" />
            <path d="M-120 60 L-120 -40 L-40 -80 L-40 20 Z" stroke="#2e2e38" strokeWidth="2" fill="url(#sk-h2)" fillOpacity="0.5" />
            <path d="M-40 -80 L60 -40 L60 60 L-40 20 Z" stroke="#2e2e38" strokeWidth="2" fill="url(#sk-h1)" fillOpacity="0.85" />
            <path d="M-120 -40 L-20 0 L60 -40 M-20 0 L-20 100" stroke="#2e2e38" strokeWidth="1" strokeDasharray="5 5" opacity="0.6" />
            <circle cx="200" cy="10" r="70" stroke="#2e2e38" strokeWidth="2" fill="none" />
            <path d="M200 -60 A70 70 0 0 1 200 80 A40 70 0 0 0 200 -60 Z" fill="url(#sk-h1)" opacity="0.8" />
            <path d="M232 -50 A70 70 0 0 1 240 66 A30 60 0 0 0 232 -50 Z" fill="url(#sk-h2)" opacity="0.6" />
            <ellipse cx="220" cy="92" rx="80" ry="14" fill="url(#sk-h1)" opacity="0.6" />
            <line x1="-160" y1="130" x2="300" y2="130" stroke="#2e2e38" strokeWidth="1" strokeDasharray="8 6" opacity="0.5" />
          </g>
          <path d="M120 200 q60 -80 140 -20 t120 10" stroke="#55555f" strokeWidth="1.6" fill="none" opacity="0.4" />
          <path d="M900 420 q80 -40 160 0 q40 60 -40 90" stroke="#55555f" strokeWidth="1.8" fill="none" opacity="0.4" />
        </g>
      </Painted>
      <Layer>
        {/* Soldaki spiral cilt telleri */}
        {Array.from({ length: 20 }, (_, i) => (
          <g key={i}>
            <circle cx="40" cy={70 + i * 42} r="7" fill="#4a3426" />
            <path d={`M40 ${70 + i * 42} q -26 -6 -24 -20`} stroke="#9aa3b0" strokeWidth="5" fill="none" strokeLinecap="round" />
          </g>
        ))}
        {/* Kalem talaşları ve mürekkep damlaları */}
        {[[300, 840, 0], [700, 760, 40], [1450, 300, -20], [980, 820, 70]].map(([x, y, a], i) => (
          <g key={i} transform={`rotate(${a} ${x} ${y})`}>
            <path d={`M${x} ${y} q20 -18 40 0 q-20 10 -40 0`} fill="#e8b88a" stroke="#c98a5a" strokeWidth="2" />
            <path d={`M${x + 2} ${y} q18 -10 36 0`} stroke="#3a3a42" strokeWidth="2" fill="none" />
          </g>
        ))}
        {[[640, 300, 14], [670, 330, 6], [1500, 620, 10], [880, 700, 8], [1180, 860, 18]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#16161c" opacity="0.85" />
        ))}
        {/* Hamur silgi kütlesi */}
        <path d="M100 840 q-20 -60 50 -80 q50 -30 100 10 q50 20 30 70 Z" fill="#9aa0aa" />
        <path d="M130 800 q30 -20 60 -6" stroke="#b8bec8" strokeWidth="6" fill="none" strokeLinecap="round" />
        {/* Pirinç gövdeli cetvel */}
        <rect x="1020" y="440" width="520" height="40" rx="4" fill="#d9b46a" stroke="#a87a34" strokeWidth="3" />
        {Array.from({ length: 52 }, (_, i) => (
          <line key={i} x1={1030 + i * 10} y1="440" x2={1030 + i * 10} y2={i % 5 ? 452 : 460} stroke="#6b4a1a" strokeWidth="1.6" />
        ))}
        {/* Mürekkep hokkası */}
        <path d="M1170 820 h80 v-50 q0 -14 -14 -14 h-52 q-14 0 -14 14 Z" fill="#1e1e28" />
        <rect x="1188" y="736" width="44" height="20" rx="4" fill="#2a2a36" />
        <ellipse cx="1210" cy="738" rx="18" ry="5" fill="#000" />
      </Layer>
      {/* Masa lambasının ışığı */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 55% at 100% 0%, rgba(255,240,190,0.55), rgba(255,240,190,0) 70%)" }} />
      <svg className="absolute overflow-visible" style={{ left: 1480, top: -40 }} width="160" height="140">
        <path d="M20 40 L120 0 L150 60 L60 110 Z" fill="#2b2b33" />
        <ellipse cx="90" cy="90" rx="40" ry="18" fill="#fff6c8" transform="rotate(-30 90 90)" />
      </svg>
      {/* Ortaya çekilen büyük, dinamik çizgi */}
      <svg className="pointer-events-none absolute overflow-visible" style={{ left: 0, top: 0 }} width={W} height="900">
        <motion.path key={`ln${beat.i === 0 ? k : 0}`} d="M200 560 C 300 470, 420 720, 560 600 S 700 560, 768 640" stroke="#3a3a42" strokeWidth="9" fill="none" strokeLinecap="round" initial={{ pathLength: 0.15 }} animate={{ pathLength: [0.15, 1] }} transition={{ duration: 6, ease: "easeInOut" }} />
      </svg>
      {/* Hizalama noktaları */}
      {Array.from({ length: 6 }, (_, i) => (
        <motion.span key={`${i}-${beat.i === 4 ? k : 0}`} className="absolute h-2 w-2 rounded-full bg-white" style={{ left: 1060 + i * 80, top: 420 }} initial={{ scale: beat.i === 4 ? 0 : 1 }} animate={{ scale: 1 }} transition={{ delay: 0.4 + i * 0.3 }} />
      ))}

      <SketchClock />
      {/* Bereli, dev kurşun kalemi sürükleyen karalamacı */}
      <Actor x={700} y={600} size={96} look={look({ shape: "sphere", head: "beret" })} color="#F4F4F6" expression={beat.i === 0 ? "happy" : "focused"} move={{ animate: { x: [0, 8, 0], rotate: [-4, 4, -4] }, transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } }} act={on(beat, 0, { animate: { rotate: [0, -10, -10, 0] }, transition: { duration: 2 } })} actKey={k} front={<><BigPencil blow={beat.i === 0} k={k} /></>} />
      {/* Silgisinin üstüne abanıp ileri geri kayan silgi hamalı */}
      <motion.div className="absolute inset-0" animate={{ x: [0, 70, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}>
        <Actor x={900} y={650} size={88} look={look({ shape: "bean" })} color="#FF6A3D" expression={beat.i === 1 ? "surprised" : "focused"} move={{ animate: { rotate: [12, 18, 12] }, transition: { duration: 0.6, repeat: Infinity } }} front={<Eraser />} />
      </motion.div>
      {beat.i === 1 &&
        Array.from({ length: 6 }, (_, i) => (
          <motion.span key={`cr${i}${k}`} className="absolute h-2 w-3 rounded-full bg-[#d8a0a8]" style={{ left: 930 + i * 12, top: 642 }} animate={{ x: 140 + i * 10, y: [0, -10, 4], opacity: [1, 1, 0] }} transition={{ duration: 0.9, delay: 0.3 + i * 0.05 }} />
        ))}
      {/* Fırçayla hokkanın üstünden atlayan, yüzü mürekkep içinde */}
      <motion.div key={`vault${beat.i === 2 ? k : 0}`} className="absolute inset-0" animate={beat.i === 2 ? { x: [0, 110, 240, 240, 0], y: [0, -200, 0, 0, 0] } : { x: 0 }} transition={{ duration: 4, times: [0, 0.18, 0.36, 0.7, 1], ease: "easeInOut" }}>
        <Actor morph={beat.n[2]} morphDelay={1400} x={1080} y={820} size={86} look={look({ shape: "cloud" })} color="#00B8FF" expression={beat.i === 2 ? "surprised" : "focused"} move={breathe(2.6)} front={<><InkSplat /><Brush /></>} />
      </motion.div>
      {/* Hamur silginin üstünde elmayla poz veren model */}
      <Actor x={190} y={770} size={90} look={look({ shape: "egg", neck: "bowtie" })} color="#FFE3A8" expression="focused" act={beat.i === 3 ? { animate: { rotate: [0, 12, -10, 4, 0] }, transition: { duration: 1.6 } } : null} actKey={k} front={<Apple />} />
      {/* Cetvelin üstünde ip cambazı gibi yürüyen, mimar gözlüklü */}
      <motion.div className="absolute inset-0" animate={{ x: [0, 360, 360, 0, 0] }} transition={{ duration: 22, times: [0, 0.42, 0.5, 0.92, 1], repeat: Infinity, ease: "easeInOut" }}>
        <Actor x={1080} y={442} size={78} look={look({ shape: "triangle", glasses: "round" })} color="#16C47F" expression="focused" move={{ animate: { rotate: [-7, 7, -7] }, transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } }} act={on(beat, 4, hop(10))} actKey={k} front={<><Hand x={-10} y={10} /><Hand x={34} y={10} /></>} />
      </motion.div>
    </Stage>
  );
}

function BigPencil({ blow, k }: { blow: boolean; k: number }) {
  return (
    <g>
      <g transform="rotate(38 12 20)">
        <rect x="-18" y="17" width="44" height="7" fill="#ffd21f" />
        <rect x="-18" y="17" width="44" height="2.3" fill="#ffe46a" />
        <rect x="-24" y="17" width="6" height="7" fill="#c0c8d4" />
        <rect x="-29" y="17" width="5" height="7" rx="1.4" fill="#ff8aa0" />
        <path d="M26 17 L34 20.5 L26 24 Z" fill="#f0c8a0" />
        <path d="M31.4 19.3 L34 20.5 L31.4 21.7 Z" fill="#2b2b33" />
      </g>
      <Hand x={4} y={20} />
      <Hand x={20} y={26} />
      {blow && (
        <motion.circle key={k} cx="30" cy="34" r="2" fill="#fff" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.8, 0], scale: [0.5, 2] }} transition={{ duration: 1, delay: 0.6 }} />
      )}
    </g>
  );
}

function Eraser() {
  return (
    <g>
      <rect x="-4" y="20" width="16" height="9" rx="1.6" fill="#e0304a" />
      <rect x="12" y="20" width="16" height="9" rx="1.6" fill="#2b6aff" />
      <Hand x={2} y={20} />
      <Hand x={22} y={20} />
    </g>
  );
}

function Brush() {
  return (
    <g>
      <line x1="28" y1="26" x2="34" y2="-10" stroke="#a8622a" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M33.4 -10 l1.2 -5 l1.2 5 Z" fill="#1a1a20" />
      <motion.circle cx="34.6" cy="-15.6" r="1" fill="#1a1a20" animate={{ x: [-0.6, 0.6, -0.6] }} transition={{ duration: 0.8, repeat: Infinity }} />
      <Hand x={29} y={18} />
      <Hand x={30} y={8} />
    </g>
  );
}

function InkSplat() {
  return (
    <g>
      {[[5, 6, 2.2], [18, 4, 1.4], [14, 17, 2.6], [3, 18, 1.2], [21, 14, 1]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#16161c" opacity="0.8" />
      ))}
    </g>
  );
}

function Apple() {
  return (
    <g>
      <circle cx="-3" cy="12" r="4" fill="#e0303a" />
      <circle cx="-4.4" cy="10.6" r="1.2" fill="#fff" opacity="0.5" />
      <path d="M-3 8 q0.6 -2 2 -2.4" stroke="#5a3a22" strokeWidth="0.8" fill="none" />
      <Hand x={-3} y={16} />
      <Hand x={26} y={20} />
    </g>
  );
}
