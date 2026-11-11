/**
 * Kalkan sahneleri (23–34): deniz feneri, ay kampı, ramen tezgâhı, pop-up masal kitabı, akvaryum,
 * sonbahar ormanı, fener festivali, dağ evi, şelale, retro metro, kek mutfağı, çatı katı.
 * Her sahne kendi sanat tarzında (looks.tsx) çizilir; durağan kısımlar bir kez resme çevrilir (Painted),
 * hareketli parçalar canlı kalır. Saatler ortak, tema renkli bir kartla çizilir.
 */
import type { CSSProperties } from "react";
import { motion } from "motion/react";
import { At, useClock } from "./clocks";
import { Actor, breathe, Drift, Hand, hop, Layer, look, on, Painted, Stage, sway, useBeat, W } from "./kit";

// ------------------------------------------------------------------ ortak saat kartı

type ClockTheme = { bg: string; fg: string; sub: string; edge: string; font?: string; radius?: number; shadow?: string; extra?: CSSProperties };

/** Sahneye göre renklenen saat kartı: saat, tarih, hava durumu */
function ClockCard({ x, y, w = 360, h = 190, t, rotate = 0 }: { x: number; y: number; w?: number; h?: number; t: ClockTheme; rotate?: number }) {
  const c = useClock();
  return (
    <At x={x} y={y} w={w} h={h} style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
        style={{ background: t.bg, color: t.fg, borderRadius: t.radius ?? 18, boxShadow: t.shadow ?? `0 12px 28px -10px rgba(0,0,0,0.6), inset 0 0 0 5px ${t.edge}`, fontFamily: t.font, ...t.extra }}
      >
        <span className="text-[62px] font-black leading-none tabular-nums">{c.time}</span>
        {/* Tarih ve hava ayrı satırlarda: tek satıra sığmayınca yazılar iki sütuna kırılıyordu */}
        <span className="whitespace-nowrap text-[17px] font-semibold capitalize" style={{ color: t.sub }}>
          {c.date}
        </span>
        {c.wx && (
          <span className="flex items-center gap-2 whitespace-nowrap text-[16px] font-semibold capitalize" style={{ color: t.sub }}>
            <c.wx.Icon size={17} strokeWidth={2.4} />
            {c.wx.temp} {c.wx.label}
          </span>
        )}
      </div>
    </At>
  );
}

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "ui-monospace, Consolas, monospace";

// ------------------------------------------------------------------ 23. Rüzgârlı deniz feneri (yağlı boya)

export function Lighthouse() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage
      sky="linear-gradient(180deg, #1c2a4a 0%, #3a5478 45%, #8aa0b8 75%, #c8c0b0 100%)"
      medium="canvas"
      clock="st-c-oil"
      lights={[
        { x: 1180, y: 250, r: 420, color: "rgba(255,236,170,0.55)", opacity: 0.55, flicker: 0.15 },
        { x: 400, y: 120, r: 500, color: "rgba(200,215,255,0.25)", opacity: 0.4 },
      ]}
    >
      <Painted look="oil" seed={23}>
        {/* Fırtınalı bulut kütleleri */}
        {[[200, 140, 260], [620, 90, 300], [1000, 170, 220], [1450, 110, 260]].map(([x, y, r], i) => (
          <g key={i}>
            <ellipse cx={x} cy={y} rx={r} ry={r * 0.32} fill="#4a5e80" />
            <ellipse cx={x - r * 0.2} cy={y - r * 0.1} rx={r * 0.6} ry={r * 0.2} fill="#7a8cac" />
          </g>
        ))}
        {/* Deniz: koyu, köpüklü */}
        <rect x="0" y="540" width={W} height="360" fill="#2a4a62" />
        <rect x="0" y="540" width={W} height="40" fill="#5a7a92" />
        {Array.from({ length: 14 }, (_, i) => (
          <path key={`wv${i}`} d={`M${i * 120 - 40} ${600 + (i % 3) * 40} q 40 -30 80 0 q 20 14 50 4`} stroke="#d8e4ec" strokeWidth="8" fill="none" strokeLinecap="round" />
        ))}
        {/* Kayalık burun ve fener */}
        <path d="M820 900 L900 640 L1060 600 L1300 620 L1460 700 L1600 720 L1600 900 Z" fill="#3a3430" />
        <path d="M900 640 L1060 600 L1180 640 L980 700 Z" fill="#5a4e46" />
        <path d="M1130 610 L1150 300 L1210 300 L1230 610 Z" fill="#f0ebe0" />
        {[360, 430, 500, 570].map((y, i) => (
          <path key={y} d={`M${1145 - i * 2} ${y} L${1215 + i * 2} ${y} L${1218 + i * 2} ${y + 34} L${1142 - i * 2} ${y + 34} Z`} fill="#c8402e" />
        ))}
        <rect x="1136" y="270" width="88" height="34" fill="#2a2a2a" />
        <rect x="1146" y="226" width="68" height="46" fill="#ffe08a" />
        <path d="M1130 228 L1180 190 L1230 228 Z" fill="#c8402e" />
        <rect x="1196" y="560" width="40" height="50" fill="#8a6a4a" />
        {/* Ön planda iskele */}
        <rect x="0" y="790" width="760" height="22" fill="#6a4a30" />
        {[40, 200, 360, 520, 680].map((x) => (
          <rect key={x} x={x} y="790" width="18" height="110" fill="#4a3220" />
        ))}
      </Painted>
      {/* Fenerin dönen ışık hüzmesi */}
      <motion.div className="pointer-events-none absolute" style={{ left: 1180, top: 249, width: 0, height: 0 }} animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
        <div className="absolute" style={{ left: 0, top: -40, width: 900, height: 80, background: "linear-gradient(90deg, rgba(255,240,180,0.55), rgba(255,240,180,0))", clipPath: "polygon(0 45%, 100% 0, 100% 100%, 0 55%)" }} />
      </motion.div>
      <Drift count={40} from={-20} to={900} dur={[0.8, 1.4]} xs={[0, W]} render={() => <span className="block h-5 w-[2px] rotate-[18deg] rounded bg-[#cfe0f0]/50" />} />
      <ClockCard x={60} y={60} t={{ bg: "#f3ead6", fg: "#2a3a52", sub: "#4a5a72", edge: "#c8402e", font: SERIF }} />
      {/* Şemsiyeyle dalgaya karşı duran */}
      <Actor x={300} y={790} size={104} look={look({ shape: "penguin", head: "beanie" })} color="#2B8CFF" expression={beat.i === 0 ? "surprised" : "focused"} move={sway(1.6, 6)} act={on(beat, 0, { animate: { x: [0, -30, 0], rotate: [0, -14, 0] }, transition: { duration: 1.4 } })} actKey={k} front={<Umbrella />} />
      {/* Oltayla balık tutan */}
      <Actor x={560} y={790} size={96} look={look({ shape: "bean", head: "safari" })} color="#FFD21F" expression={beat.i === 1 ? "happy" : "sleepy"} move={breathe(3.6)} act={on(beat, 1, hop(20))} actKey={k} front={<Rod pull={beat.i === 1} k={k} />} />
      {/* Fenerin kapısında, fener tutan bekçi */}
      <Actor x={1300} y={640} size={92} look={look({ shape: "egg", head: "conductor" })} color="#F4F4F6" expression="idle" move={breathe(3)} act={on(beat, 2, { animate: { rotate: [0, 10, -10, 0] }, transition: { duration: 1.2 } })} actKey={k} front={<><Hand x={-3} y={18} /><Hand x={27} y={18} /></>} />
      {/* Şapkası uçan */}
      <Actor x={880} y={700} size={88} look={look({ shape: "duck" })} color="#FF8A1F" expression={beat.i === 3 ? "dizzy" : "happy"} move={sway(2, 4)} act={on(beat, 3, hop(26))} actKey={k} />
      {beat.i === 3 && <motion.span key={`hat${k}`} className="absolute h-6 w-12 rounded-t-full bg-[#c8402e]" style={{ left: 860, top: 600 }} animate={{ x: [0, 260, 520], y: [0, -140, -60], rotate: [0, 260, 540], opacity: [1, 1, 0] }} transition={{ duration: 2.2 }} />}
    </Stage>
  );
}

function Umbrella() {
  return (
    <g>
      <path d="M-6 -2 Q 12 -20 30 -2 Z" fill="#ff3b4a" />
      <line x1="12" y1="-2" x2="12" y2="20" stroke="#333" strokeWidth="1.2" />
      <Hand x={12} y={20} />
    </g>
  );
}

function Rod({ pull, k }: { pull: boolean; k: number }) {
  return (
    <motion.g key={k} style={{ transformOrigin: "26px 20px" }} animate={pull ? { rotate: [0, -30, 0] } : { rotate: [0, -4, 0] }} transition={pull ? { duration: 1.2 } : { duration: 3, repeat: Infinity }}>
      <line x1="26" y1="20" x2="44" y2="-6" stroke="#6a4a30" strokeWidth="1.4" />
      <path d="M44 -6 Q 52 20 50 34" stroke="#ddd" strokeWidth="0.5" fill="none" />
      <Hand x={26} y={20} />
    </motion.g>
  );
}

// ------------------------------------------------------------------ 24. Ay kampı (yumuşak 3B)

export function MoonBase() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage
      sky="radial-gradient(120% 90% at 70% 20%, #1a1f3a 0%, #0a0c18 60%, #04050c 100%)"
      clock="st-soft3d"
      lights={[{ x: 1250, y: 200, r: 420, color: "rgba(120,170,255,0.35)", opacity: 0.5 }]}
    >
      <Painted look="puff" seed={24}>
        {Array.from({ length: 70 }, (_, i) => (
          <circle key={`s${i}`} cx={(i * 263) % W} cy={(i * 131) % 520} r={1 + (i % 3) * 0.8} fill="#fff" opacity="0.8" />
        ))}
        {/* Uzakta Dünya */}
        <circle cx="1250" cy="200" r="110" fill="#2f7ad8" />
        <path d="M1190 150 q40 -30 80 0 q20 40 -30 50 q-40 0 -50 -50 Z" fill="#3ea56a" />
        <path d="M1270 240 q30 -20 50 10 q-10 30 -40 20 Z" fill="#4cb575" />
        {/* Ay yüzeyi ve kraterler */}
        <path d="M0 640 Q 400 600 800 630 T 1600 610 L1600 900 L0 900 Z" fill="#b8b8c4" />
        <path d="M0 720 Q 500 690 1000 720 T 1600 700 L1600 900 L0 900 Z" fill="#a4a4b2" />
        {[[260, 760, 90], [980, 820, 120], [1380, 740, 70], [620, 700, 50]].map(([x, y, r], i) => (
          <g key={`cr${i}`}>
            <ellipse cx={x} cy={y} rx={r} ry={r * 0.28} fill="#8a8a98" />
            <ellipse cx={x} cy={y - r * 0.04} rx={r * 0.8} ry={r * 0.2} fill="#9a9aa8" />
          </g>
        ))}
        {/* Kubbe üs ve anten */}
        <path d="M1080 650 a120 90 0 0 1 240 0 Z" fill="#e8ecf4" />
        <rect x="1080" y="646" width="240" height="18" rx="6" fill="#c8ccd8" />
        <circle cx="1200" cy="600" r="22" fill="#7ad1ff" />
        <rect x="1350" y="540" width="8" height="110" fill="#c8ccd8" />
        <path d="M1320 540 a34 22 0 0 1 68 0 Z" fill="#e8ecf4" />
      </Painted>
      <ClockCard x={60} y={60} t={{ bg: "#e8ecf4", fg: "#1a2a4a", sub: "#4a5a7a", edge: "#7ad1ff", radius: 40 }} />
      {/* Bayrak diken */}
      <Actor x={420} y={690} size={100} look={look({ shape: "sphere", head: "astronaut" })} color="#F4F4F6" expression={beat.i === 0 ? "happy" : "focused"} move={breathe(3)} act={on(beat, 0, hop(18))} actKey={k} front={<Flag />} />
      {/* Yerçekimsiz zıplayan */}
      <Actor x={720} y={660} size={92} look={look({ shape: "bean", head: "antenna" })} color="#9B7BFF" expression="happy" shadow={false} move={{ animate: { y: [0, -120, 0] }, transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" } }} act={on(beat, 1, { animate: { rotate: [0, 360] }, transition: { duration: 1.6 } })} actKey={k} />
      {/* Krater kenarında piknik */}
      <Actor x={980} y={790} size={96} look={look({ shape: "moon" })} color="#FFD21F" expression={beat.i === 2 ? "love" : "sleepy"} move={breathe(4)} act={on(beat, 2, hop(14))} actKey={k} front={<><Hand x={-2} y={20} /><Hand x={26} y={20} /></>} />
      {/* Taş toplayan robot */}
      <Actor x={1460} y={760} size={88} look={look({ shape: "cube", head: "robot", texture: "metal" })} color="#8A8F99" expression="focused" move={sway(2.4, 3)} act={on(beat, 3, { animate: { x: [0, -60, 0] }, transition: { duration: 2 } })} actKey={k} />
    </Stage>
  );
}

function Flag() {
  return (
    <g>
      <line x1="30" y1="24" x2="30" y2="-20" stroke="#ccc" strokeWidth="1.2" />
      <motion.path d="M30 -20 h14 v9 h-14 Z" fill="#ff3b4a" style={{ transformOrigin: "30px -16px" }} animate={{ scaleX: [1, 0.85, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
      <Hand x={30} y={14} />
    </g>
  );
}

// ------------------------------------------------------------------ 25. Japon ramen tezgâhı (mürekkep + neon)

export function Ramen() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage
      sky="linear-gradient(180deg, #0c1024 0%, #1c1a3a 60%, #2a1a34 100%)"
      clock="st-ink"
      lights={[
        { x: 800, y: 300, r: 600, color: "rgba(255,180,90,0.5)", opacity: 0.6, flicker: 0.08 },
        { x: 250, y: 200, r: 260, color: "rgba(255,62,165,0.45)", opacity: 0.5, flicker: 0.3 },
        { x: 1380, y: 220, r: 260, color: "rgba(0,224,255,0.45)", opacity: 0.5, flicker: 0.25 },
      ]}
    >
      <Painted look="ink" seed={25}>
        {/* Arka sokak binaları */}
        {[[0, 120, 300], [280, 80, 260], [1080, 100, 260], [1320, 60, 280]].map(([x, y, w], i) => (
          <g key={i}>
            <rect x={x} y={y} width={w} height={600} fill="#2a2a48" />
            {Array.from({ length: 8 }, (_, j) => (
              <rect key={j} x={x + 30 + (j % 3) * (w / 3.4)} y={y + 40 + Math.floor(j / 3) * 90} width="40" height="50" fill={(i + j) % 3 ? "#3a3a5a" : "#ffcf7a"} />
            ))}
          </g>
        ))}
        {/* Tezgâh: kırmızı saçak, kumaş perde (noren), ahşap bar */}
        <rect x="380" y="200" width="840" height="520" fill="#5a3a26" />
        <path d="M340 200 h920 l-30 -60 h-860 Z" fill="#c8302e" />
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={`n${i}`} x={420 + i * 132} y="210" width="120" height="150" fill={i % 2 ? "#f2ead6" : "#e8dcc4"} />
        ))}
        <circle cx="800" cy="285" r="34" fill="#c8302e" />
        <rect x="360" y="560" width="880" height="40" fill="#8a5a34" />
        <rect x="380" y="600" width="840" height="180" fill="#4a2e1c" />
        {/* Kâse ve yemek çubukları */}
        <path d="M700 560 q100 50 200 0 Z" fill="#f2ead6" />
        <rect x="690" y="552" width="220" height="10" rx="5" fill="#c8302e" />
        <line x1="840" y1="540" x2="940" y2="470" stroke="#d4a46a" strokeWidth="5" />
        {/* Islak kaldırım */}
        <rect x="0" y="780" width={W} height="120" fill="#1a1a2a" />
      </Painted>
      {/* Neon tabelalar, yağmur, buhar */}
      <Layer>
        <motion.rect x="150" y="160" width="200" height="70" rx="14" fill="none" stroke="#ff3ea5" strokeWidth="6" filter="url(#st-neon)" animate={{ opacity: [1, 0.6, 1, 1, 0.3, 1] }} transition={{ duration: 3, repeat: Infinity }} />
        <motion.circle cx="1440" cy="190" r="50" fill="none" stroke="#00e0ff" strokeWidth="6" filter="url(#st-neon)" animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }} />
        {[740, 800, 860].map((x, i) => (
          <motion.path key={x} d={`M${x} 540 q-12 -30 0 -60 q12 -30 0 -60`} stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.4" animate={{ y: [0, -40], opacity: [0, 0.45, 0] }} transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.8 }} />
        ))}
      </Layer>
      <Drift count={60} from={-30} to={900} dur={[0.7, 1.2]} render={() => <span className="block h-6 w-[2px] rounded bg-[#a8c0ff]/40" />} />
      <ClockCard x={1180} y={360} w={340} h={170} t={{ bg: "#f2ead6", fg: "#1a1418", sub: "#5a3a26", edge: "#17121e", radius: 8, extra: { border: "4px solid #17121e" } }} />
      {/* Erişte çeken şef */}
      <Actor x={600} y={560} size={104} look={look({ shape: "egg", head: "chef" })} color="#F4F4F6" expression={beat.i === 0 ? "happy" : "focused"} move={breathe(2.4)} act={on(beat, 0, { animate: { y: [0, -16, 0, -16, 0] }, transition: { duration: 1.4 } })} actKey={k} front={<Noodles k={beat.i === 0 ? k : 0} />} />
      {/* Kâseye üfleyen müşteri */}
      <Actor x={1000} y={600} size={96} look={look({ shape: "fox" })} color="#FF8A1F" expression={beat.i === 1 ? "love" : "happy"} move={breathe(3)} act={on(beat, 1, hop(14))} actKey={k} front={<><Hand x={-2} y={20} /><Hand x={26} y={20} /></>} />
      {/* Tezgâha tırmanan kedi */}
      <Actor x={1260} y={790} size={84} look={look({ shape: "cat" })} color="#2a2a2a" expression={beat.i === 2 ? "suspicious" : "idle"} move={sway(2, 3)} act={on(beat, 2, { animate: { y: [0, -230, -230, 0] }, transition: { duration: 2.6, times: [0, 0.3, 0.75, 1] } })} actKey={k} />
      {/* Şemsiyeyle bekleyen */}
      <Actor x={220} y={790} size={92} look={look({ shape: "drop" })} color="#7ad1ff" expression="sleepy" move={breathe(3.4)} act={on(beat, 3, hop(16))} actKey={k} front={<Umbrella />} />
    </Stage>
  );
}

function Noodles({ k }: { k: number }) {
  return (
    <motion.g key={k} animate={k ? { scaleY: [1, 1.6, 1] } : {}} transition={{ duration: 1.2 }} style={{ transformOrigin: "12px 22px" }}>
      {[4, 8, 12, 16, 20].map((x) => (
        <path key={x} d={`M${x} 2 q2 10 0 20`} stroke="#f4dc8a" strokeWidth="1.2" fill="none" />
      ))}
      <Hand x={2} y={2} />
      <Hand x={22} y={2} />
    </motion.g>
  );
}

// ------------------------------------------------------------------ 26. Pop-up masal kitabı (kâğıt)

export function PopupBook() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage sky="linear-gradient(180deg, #3a2a20 0%, #2a1e16 100%)" clock="st-paper" grain={false} lights={[{ x: 800, y: 300, r: 800, color: "rgba(255,236,190,0.45)", opacity: 0.5 }]}>
      <Painted look="paper" seed={26}>
        {/* Açık kitap sayfaları */}
        <path d="M80 820 Q 420 760 800 800 Q 1180 760 1520 820 L1520 880 Q 1180 830 800 870 Q 420 830 80 880 Z" fill="#f6ecd6" />
        <path d="M790 800 L810 800 L810 870 L790 870 Z" fill="#d8c8a8" />
        {/* Katlanarak kalkan orman katmanları */}
        <path d="M120 800 L120 560 Q 300 420 480 560 Q 640 440 800 560 Q 960 440 1120 560 Q 1300 420 1480 560 L1480 800 Z" fill="#7aa86a" />
        <path d="M180 800 L200 600 L260 520 L320 600 L340 800 Z M1240 800 L1260 600 L1320 500 L1380 600 L1400 800 Z" fill="#4a7a4a" />
        {[[260, 480], [1320, 460], [520, 520], [1080, 520]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y - 140} L${x + 70} ${y} L${x - 70} ${y} Z`} fill={i % 2 ? "#3a6a42" : "#5a8a52"} />
        ))}
        {/* Kâğıt mantar evi */}
        <rect x="700" y="640" width="200" height="160" rx="20" fill="#f2e6cc" />
        <path d="M660 660 Q 800 480 940 660 Z" fill="#e2433b" />
        {[[740, 600], [820, 570], [870, 630]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="14" fill="#fff6e6" />
        ))}
        <path d="M780 800 v-60 a20 20 0 0 1 40 0 v60 Z" fill="#8a5a34" />
        {/* Kâğıt ay ve yıldızlar */}
        <circle cx="1300" cy="180" r="60" fill="#ffe6a0" />
        {[[300, 160], [500, 100], [1080, 120], [1460, 260]].map(([x, y], i) => (
          <path key={`st${i}`} d={`M${x} ${y - 18} l5 12 l13 2 l-10 9 l3 13 l-11 -7 l-11 7 l3 -13 l-10 -9 l13 -2 Z`} fill="#fff2c4" />
        ))}
      </Painted>
      <Layer>
        {/* Sayfa kenarı hafifçe kıpırdar */}
        <motion.path d="M1500 820 q20 -10 20 0 L1520 880 q-10 0 -20 -6 Z" fill="#e8dcc0" animate={{ rotate: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }} style={{ transformOrigin: "1500px 850px" }} />
      </Layer>
      <ClockCard x={60} y={60} t={{ bg: "#fff6e6", fg: "#5a3a26", sub: "#8a5a34", edge: "#e2433b", font: SERIF, radius: 6 }} rotate={-3} />
      <Actor x={440} y={800} size={96} look={look({ shape: "mushroom", head: "toadstool" })} color="#E2433B" expression={beat.i === 0 ? "happy" : "idle"} move={breathe(3.4)} act={on(beat, 0, hop(20))} actKey={k} />
      <Actor x={1040} y={800} size={92} look={look({ shape: "owl", head: "wizard" })} color="#9B7BFF" expression={beat.i === 1 ? "surprised" : "sleepy"} move={sway(3, 3)} act={on(beat, 1, { animate: { rotate: [0, -10, 10, 0] }, transition: { duration: 1.2 } })} actKey={k} />
      <Actor x={1300} y={800} size={88} look={look({ shape: "frog", head: "crown" })} color="#16C47F" expression={beat.i === 2 ? "love" : "happy"} move={breathe(2.6)} act={on(beat, 2, hop(30))} actKey={k} />
      <Actor x={240} y={800} size={84} look={look({ shape: "leaf" })} color="#8FE03A" expression="happy" move={sway(2.2, 5)} act={on(beat, 3, { animate: { y: [0, -60, 0], rotate: [0, 30, 0] }, transition: { duration: 1.6 } })} actKey={k} />
    </Stage>
  );
}

// ------------------------------------------------------------------ 27. Akvaryumlu salon (yumuşak 3B)

export function Aquarium() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage
      sky="linear-gradient(180deg, #14162a 0%, #1e2036 100%)"
      clock="st-soft3d"
      lights={[{ x: 800, y: 420, r: 700, color: "rgba(90,200,255,0.4)", opacity: 0.6, flicker: 0.1 }]}
    >
      <Painted look="puff" seed={27}>
        {/* Akvaryum camı ve suyu */}
        <rect x="260" y="140" width="1080" height="520" rx="30" fill="#2a6a9a" />
        <rect x="280" y="160" width="1040" height="480" rx="22" fill="#3a8ac0" />
        <rect x="280" y="560" width="1040" height="80" rx="10" fill="#d9c08a" />
        {[[380, 560, 120], [1180, 560, 150], [760, 560, 90]].map(([x, y, h], i) => (
          <path key={i} d={`M${x} ${y} q -30 ${-h / 2} 0 ${-h} q 30 ${h / 2} 0 ${h}`} fill="#2fa86a" />
        ))}
        <ellipse cx="960" cy="566" rx="80" ry="30" fill="#8a8a98" />
        <rect x="240" y="120" width="1120" height="30" rx="10" fill="#3a3a48" />
        <rect x="240" y="652" width="1120" height="40" rx="10" fill="#3a3a48" />
        {/* Salon: koltuk, kitaplık, halı */}
        <rect x="0" y="760" width={W} height="140" fill="#3a2a2a" />
        <ellipse cx="800" cy="830" rx="600" ry="50" fill="#5a3a4a" />
        <rect x="60" y="560" width="160" height="200" rx="20" fill="#7a4a3a" />
        <rect x="1400" y="400" width="160" height="360" rx="10" fill="#5a3a2a" />
        {[460, 560, 660].map((y) => (
          <rect key={y} x="1410" y={y} width="140" height="10" fill="#3a2418" />
        ))}
      </Painted>
      {/* Yüzen balıklar ve kabarcıklar */}
      {[[300, "#ff8a1f", 14], [380, "#ffd21f", 18], [460, "#ff5c8a", 12]].map(([y, c, d], i) => (
        <motion.svg key={i} className="absolute" style={{ left: 0, top: y as number }} width="60" height="34" viewBox="0 0 60 34" initial={{ x: 300 }} animate={{ x: i % 2 ? [1260, 300, 1260] : [300, 1260, 300], scaleX: i % 2 ? [-1, -1, 1, 1, -1] : [1, 1, -1, -1, 1] }} transition={{ duration: d as number, repeat: Infinity, ease: "linear" }}>
          <ellipse cx="26" cy="17" rx="20" ry="12" fill={c as string} />
          <path d="M44 17 L60 6 L58 17 L60 28 Z" fill={c as string} />
          <circle cx="16" cy="13" r="2.6" fill="#111" />
        </motion.svg>
      ))}
      <Drift count={20} from={640} to={170} xs={[300, 1300]} dur={[4, 8]} sway={20} render={(i) => <span className="block rounded-full border-2 border-white/60" style={{ width: 6 + (i % 3) * 4, height: 6 + (i % 3) * 4 }} />} />
      <ClockCard x={1060} y={20} w={300} h={110} t={{ bg: "#e8f4fa", fg: "#1a3a5a", sub: "#3a6a8a", edge: "#7ad1ff", radius: 30 }} />
      {/* Yem atan */}
      <Actor x={520} y={760} size={96} look={look({ shape: "sphere", texture: "plush" })} color="#FF9EC4" expression={beat.i === 0 ? "happy" : "idle"} move={breathe(3)} act={on(beat, 0, hop(14))} actKey={k} front={<><Hand x={-2} y={8} /><Hand x={26} y={18} /></>} />
      {/* Cama yüzünü dayayan */}
      <Actor x={800} y={760} size={100} look={look({ shape: "bean" })} color="#2FD4C0" expression={beat.i === 1 ? "love" : "surprised"} move={sway(3, 2)} act={on(beat, 1, { animate: { y: [0, -10, 0] }, transition: { duration: 1 } })} actKey={k} front={<><Hand x={-4} y={4} /><Hand x={28} y={4} /></>} />
      {/* Koltukta kitap okuyan */}
      <Actor x={140} y={640} size={84} look={look({ shape: "owl", glasses: "round" })} color="#B5651D" expression="sleepy" shadow={false} move={breathe(4.4)} act={on(beat, 2, { animate: { rotate: [0, -6, 0] }, transition: { duration: 1.4 } })} actKey={k} />
      {/* Balıkla yarışan */}
      <Actor x={1160} y={770} size={88} look={look({ shape: "crab" })} color="#FF3B4A" expression="happy" move={sway(1.2, 4)} act={on(beat, 3, { animate: { x: [0, -280, 0] }, transition: { duration: 3 } })} actKey={k} />
    </Stage>
  );
}

// ------------------------------------------------------------------ 28. Sonbahar ormanı (guaj)

export function Autumn() {
  const beat = useBeat(4);
  const k = beat.k;
  const leaf = ["#e2733b", "#f0a83a", "#c8402e", "#e8c24a"];
  return (
    <Stage sky="linear-gradient(180deg, #f6d8a8 0%, #f2c088 50%, #e8a870 100%)" medium="canvas" clock="st-c-gouache" lights={[{ x: 1200, y: 200, r: 700, color: "rgba(255,220,160,0.5)", opacity: 0.5 }]}>
      <Painted look="gouache" seed={28}>
        {/* Arkada sisli ağaç gövdeleri */}
        {[120, 300, 520, 1080, 1300, 1500].map((x, i) => (
          <rect key={`bt${i}`} x={x} y="120" width={26 + (i % 3) * 10} height="640" fill="#b88a6a" opacity="0.6" />
        ))}
        {/* Turuncu taçlar */}
        {[[160, 200, 180], [440, 140, 200], [760, 200, 160], [1180, 160, 210], [1460, 220, 170]].map(([x, y, r], i) => (
          <g key={`cr${i}`}>
            <circle cx={x} cy={y} r={r} fill={leaf[i % 4]} />
            <circle cx={x - r * 0.4} cy={y + r * 0.3} r={r * 0.6} fill={leaf[(i + 1) % 4]} />
            <circle cx={x + r * 0.45} cy={y + r * 0.2} r={r * 0.55} fill={leaf[(i + 2) % 4]} />
          </g>
        ))}
        {/* Ön gövdeler ve zemin */}
        {[260, 1240].map((x) => (
          <path key={x} d={`M${x} 780 L${x + 10} 260 L${x + 60} 260 L${x + 70} 780 Z`} fill="#6a4228" />
        ))}
        <path d="M0 740 Q 400 700 800 730 T 1600 720 L1600 900 L0 900 Z" fill="#c87a3a" />
        {/* Yaprak yığınları */}
        {[[420, 790, 130], [980, 800, 160]].map(([x, y, r], i) => (
          <g key={`pile${i}`}>
            {Array.from({ length: 14 }, (_, j) => (
              <ellipse key={j} cx={x - r + (j * r * 2) / 14} cy={y - Math.sin((j / 13) * Math.PI) * r * 0.45} rx="22" ry="12" fill={leaf[(i + j) % 4]} transform={`rotate(${j * 31} ${x - r + (j * r * 2) / 14} ${y - Math.sin((j / 13) * Math.PI) * r * 0.45})`} />
            ))}
          </g>
        ))}
        {/* Mantarlar */}
        {[[620, 790], [1400, 790]].map(([x, y], i) => (
          <g key={`ms${i}`}>
            <rect x={x - 6} y={y - 30} width="12" height="30" fill="#f2e6cc" />
            <path d={`M${x - 26} ${y - 26} Q ${x} ${y - 60} ${x + 26} ${y - 26} Z`} fill="#c8402e" />
          </g>
        ))}
      </Painted>
      <Drift count={30} from={-40} to={900} dur={[6, 11]} sway={140} rotate={300} render={(i) => <span className="block h-3 w-4 rounded-[60%_10%_60%_10%]" style={{ background: leaf[i % 4] }} />} />
      <ClockCard x={60} y={80} t={{ bg: "#fff4e0", fg: "#6a3a1e", sub: "#a8582a", edge: "#e2733b", radius: 24 }} />
      {/* Yaprak yığınına dalan */}
      <Actor x={420} y={790} size={100} look={look({ shape: "acorn" })} color="#B5651D" expression={beat.i === 0 ? "happy" : "idle"} move={breathe(3)} act={on(beat, 0, { animate: { y: [0, -80, 40, 0] }, transition: { duration: 1.6, times: [0, 0.4, 0.7, 1] } })} actKey={k} />
      {/* Sincapla fındık değişen */}
      <Actor x={760} y={790} size={92} look={look({ shape: "fox", neck: "scarf" })} color="#FF8A1F" expression={beat.i === 1 ? "love" : "happy"} move={sway(3, 3)} act={on(beat, 1, hop(16))} actKey={k} front={<><Hand x={28} y={16} /><circle cx="32" cy="12" r="3" fill="#8a5a34" /></>} />
      {/* Ağaca yaslanıp uyuyan */}
      <Actor x={1320} y={790} size={96} look={look({ shape: "bear", head: "beanie" })} color="#8A5A34" expression="sleepy" move={breathe(4.6, 2)} act={on(beat, 2, { animate: { rotate: [0, -8, 0] }, transition: { duration: 1.4 } })} actKey={k} />
      {/* Rüzgârda savrulan */}
      <Actor x={1040} y={790} size={84} look={look({ shape: "leaf" })} color="#E8C24A" expression={beat.i === 3 ? "dizzy" : "happy"} move={sway(1.8, 6)} act={on(beat, 3, { animate: { x: [0, 120, 0], rotate: [0, 360, 360] }, transition: { duration: 2 } })} actKey={k} />
    </Stage>
  );
}

// ------------------------------------------------------------------ 29. Fener festivali (ukiyo-e: mürekkep + düz renk)

export function Lanterns() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage sky="linear-gradient(180deg, #1a1a3a 0%, #3a2a5a 55%, #6a3a5a 100%)" medium="sketch" clock="st-ink" lights={[{ x: 800, y: 400, r: 800, color: "rgba(255,160,90,0.45)", opacity: 0.55, flicker: 0.12 }]}>
      <Painted look="ink" seed={29}>
        {/* Ukiyo-e dağ ve bulut bantları */}
        <path d="M200 520 L520 220 L640 300 L700 260 L980 520 Z" fill="#e8e0f0" />
        <path d="M520 220 L580 280 L560 300 L600 320 L640 300 Z" fill="#fff" />
        {[[100, 360], [900, 300], [1200, 420]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y} h300 q20 0 20 14 q0 14 -20 14 h-220 q-14 0 -14 10 q0 10 -14 10 h-80 q-14 0 -14 -12 q0 -12 14 -12 h30 q-20 0 -20 -12 q0 -12 20 -12 Z`} fill="#c8a8d8" />
        ))}
        {/* Tapınak çatısı ve köprü */}
        <path d="M1080 560 L1200 480 L1320 560 Z" fill="#c8302e" />
        <rect x="1110" y="560" width="180" height="140" fill="#8a2a24" />
        <path d="M0 760 Q 400 640 800 760" fill="none" stroke="#c8302e" strokeWidth="18" />
        {[100, 220, 340, 460, 580, 700].map((x) => (
          <line key={x} x1={x} y1={760 - Math.sin(((x / 800) * Math.PI)) * 120} x2={x} y2="780" stroke="#8a2a24" strokeWidth="8" />
        ))}
        <rect x="0" y="780" width={W} height="120" fill="#2a2a4a" />
        {Array.from({ length: 20 }, (_, i) => (
          <path key={`r${i}`} d={`M${i * 80} ${820 + (i % 2) * 20} q20 -10 40 0 q20 10 40 0`} stroke="#5a5a8a" strokeWidth="4" fill="none" />
        ))}
      </Painted>
      {/* Gökyüzüne yükselen kâğıt fenerler */}
      <Drift count={14} from={900} to={-80} xs={[100, 1500]} dur={[14, 24]} sway={60} render={(i) => <span className="block h-10 w-8 rounded-[40%]" style={{ background: i % 2 ? "#ffb04a" : "#ff7a4a", boxShadow: "0 0 18px 6px rgba(255,170,80,0.55), inset 0 -6px 0 rgba(120,30,20,0.4)" }} />} />
      <ClockCard x={60} y={60} t={{ bg: "#f4ead6", fg: "#2a1a2a", sub: "#8a2a24", edge: "#17121e", font: SERIF, radius: 4, extra: { border: "4px solid #17121e" } }} />
      {/* Fener bırakan */}
      <Actor x={380} y={790} size={96} look={look({ shape: "sphere", head: "bow" })} color="#FF5C8A" expression={beat.i === 0 ? "happy" : "idle"} move={breathe(3)} act={on(beat, 0, hop(16))} actKey={k} front={<><Hand x={-2} y={-2} /><Hand x={26} y={-2} /></>} />
      {/* Pamuk şeker taşıyan */}
      <Actor x={760} y={790} size={92} look={look({ shape: "panda" })} color="#F4F4F6" expression={beat.i === 1 ? "love" : "happy"} move={sway(3, 3)} act={on(beat, 1, hop(14))} actKey={k} front={<><line x1="28" y1="20" x2="30" y2="0" stroke="#d4a46a" strokeWidth="1.2" /><circle cx="30" cy="-4" r="7" fill="#ffc4dc" /><Hand x={28} y={20} /></>} />
      {/* Havai fişek izleyen */}
      <Actor x={1440} y={790} size={88} look={look({ shape: "dragon" })} color="#16C47F" expression={beat.i === 2 ? "surprised" : "idle"} move={breathe(2.8)} act={on(beat, 2, hop(24))} actKey={k} />
      {beat.i === 2 &&
        Array.from({ length: 12 }, (_, i) => (
          <motion.span key={`fw${i}-${k}`} className="absolute h-2 w-2 rounded-full" style={{ left: 1200, top: 180, background: ["#ffd21f", "#ff5c8a", "#7ad1ff"][i % 3], boxShadow: "0 0 10px #fff" }} animate={{ x: Math.cos((i / 12) * Math.PI * 2) * 120, y: Math.sin((i / 12) * Math.PI * 2) * 120, opacity: [1, 0] }} transition={{ duration: 1.4, delay: 0.3 }} />
        ))}
      <Actor x={1080} y={790} size={84} look={look({ shape: "ghost" })} color="#E8E0F0" expression="giggle" move={sway(2.4, 4)} act={on(beat, 3, { animate: { y: [0, -50, 0] }, transition: { duration: 1.4 } })} actKey={k} />
    </Stage>
  );
}

// ------------------------------------------------------------------ 30. Dağ evi, şömine başı (keçe)

export function Cabin() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage sky="linear-gradient(180deg, #3a2420 0%, #4a2e26 100%)" clock="st-felt" lights={[{ x: 800, y: 600, r: 600, color: "rgba(255,160,80,0.55)", opacity: 0.65, flicker: 0.3 }]}>
      <Painted look="felt" seed={30}>
        {/* Ahşap duvar kalasları */}
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x="0" y={i * 90} width={W} height="86" rx="10" fill={i % 2 ? "#7a4a32" : "#8a5638"} />
        ))}
        {/* Kar yağan pencere */}
        <rect x="1100" y="140" width="360" height="300" rx="20" fill="#3a4a6a" />
        <rect x="1120" y="160" width="320" height="260" rx="14" fill="#5a6a8a" />
        <rect x="1274" y="160" width="12" height="260" fill="#6a3a24" />
        <rect x="1120" y="284" width="320" height="12" fill="#6a3a24" />
        {/* Taş şömine */}
        <rect x="560" y="360" width="480" height="420" rx="24" fill="#8a8a92" />
        {[[580, 380], [700, 380], [820, 380], [940, 380], [580, 460], [960, 460], [580, 540], [960, 540]].map(([x, y], i) => (
          <rect key={`st${i}`} x={x} y={y} width="96" height="64" rx="18" fill={i % 2 ? "#9a9aa2" : "#7a7a84"} />
        ))}
        <rect x="660" y="500" width="280" height="280" rx="120" fill="#2a1a14" />
        <rect x="540" y="340" width="520" height="40" rx="14" fill="#6a3a24" />
        {/* Örgü halı ve koltuk */}
        <ellipse cx="800" cy="840" rx="560" ry="56" fill="#c8402e" />
        <ellipse cx="800" cy="840" rx="440" ry="40" fill="#e8c24a" />
        <ellipse cx="800" cy="840" rx="300" ry="26" fill="#3a8a6a" />
        <rect x="100" y="600" width="300" height="180" rx="40" fill="#4a6a9a" />
        <rect x="80" y="560" width="80" height="220" rx="36" fill="#3a5a8a" />
        {/* Şöminenin üstünde çorap ve çerçeve */}
        {[620, 980].map((x, i) => (
          <path key={x} d={`M${x} 380 v50 q0 20 20 20 h24 v-20 h-14 v-50 Z`} fill={i ? "#16c47f" : "#e2433b"} />
        ))}
      </Painted>
      {/* Alevler ve kar */}
      <Layer>
        {[{ c: "#ff5a2a", s: 1 }, { c: "#ffb02a", s: 0.7 }, { c: "#ffe07a", s: 0.4 }].map((f, i) => (
          <motion.path key={i} d="M800 780 C 730 760, 740 650, 770 610 C 775 650, 790 650, 795 590 C 810 640, 840 650, 830 580 C 880 650, 880 760, 800 780 Z" fill={f.c} style={{ transformOrigin: "800px 780px" }} animate={{ scaleY: [f.s, f.s * 1.12, f.s * 0.94, f.s], scaleX: [f.s, f.s * 0.95, f.s * 1.04, f.s] }} transition={{ duration: 0.7 + i * 0.15, repeat: Infinity }} />
        ))}
      </Layer>
      <Drift count={30} from={150} to={430} xs={[1120, 1440]} dur={[3, 6]} sway={20} render={() => <span className="block h-2 w-2 rounded-full bg-white/90" />} />
      <ClockCard x={1100} y={480} w={360} h={170} t={{ bg: "#f2e6cc", fg: "#4a2a1e", sub: "#7a4a32", edge: "#c8402e", radius: 26 }} />
      {/* Kazak ören */}
      <Actor x={240} y={620} size={92} look={look({ shape: "sphere", texture: "knit" })} color="#E2433B" expression={beat.i === 0 ? "happy" : "focused"} shadow={false} move={breathe(3)} act={on(beat, 0, hop(10))} actKey={k} front={<Knitting />} />
      {/* Kestane kızartan */}
      <Actor x={520} y={800} size={96} look={look({ shape: "bear", head: "earmuffs" })} color="#B5651D" expression={beat.i === 1 ? "love" : "idle"} move={breathe(3.4)} act={on(beat, 1, hop(14))} actKey={k} front={<><line x1="28" y1="18" x2="46" y2="6" stroke="#5a3a20" strokeWidth="1.4" /><circle cx="47" cy="5" r="2.4" fill="#8a4a24" /><Hand x={28} y={18} /></>} />
      {/* Halıda uyuyan kedi */}
      <Actor x={1060} y={830} size={80} look={look({ shape: "cat", texture: "fluffy" })} color="#F4F4F6" expression="sleepy" move={breathe(4.6, 2)} act={on(beat, 2, { animate: { rotate: [0, 6, 0] }, transition: { duration: 1.4 } })} actKey={k} />
      {/* Sıcak kakao içen */}
      <Actor x={1320} y={830} size={92} look={look({ shape: "marshmallow", head: "nightcap" })} color="#FFF4E8" expression={beat.i === 3 ? "happy" : "sleepy"} move={breathe(3.8)} act={on(beat, 3, hop(12))} actKey={k} front={<><rect x="2" y="14" width="18" height="14" rx="3" fill="#c8402e" /><Hand x={0} y={22} /><Hand x={22} y={22} /></>} />
    </Stage>
  );
}

function Knitting() {
  return (
    <g>
      <motion.g animate={{ rotate: [-10, 10, -10] }} transition={{ duration: 0.6, repeat: Infinity }} style={{ transformOrigin: "12px 22px" }}>
        <line x1="2" y1="14" x2="22" y2="28" stroke="#d4a46a" strokeWidth="1" />
        <line x1="22" y1="14" x2="2" y2="28" stroke="#d4a46a" strokeWidth="1" />
      </motion.g>
      <rect x="6" y="22" width="12" height="8" rx="2" fill="#16c47f" />
      <Hand x={2} y={20} />
      <Hand x={22} y={20} />
    </g>
  );
}

// ------------------------------------------------------------------ 31. Yağmur ormanı şelalesi (botanik suluboya)

export function Waterfall() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage sky="linear-gradient(180deg, #f2f0e2 0%, #e2ecd8 100%)" medium="watercolor" grain={false} vignette={0.12} clock="st-c-wc">
      <Painted filter="st-wc-soft">
        <ellipse cx="300" cy="300" rx="420" ry="300" fill="#8ac49a" opacity="0.6" />
        <ellipse cx="1300" cy="320" rx="460" ry="320" fill="#7ab88a" opacity="0.6" />
        <ellipse cx="800" cy="120" rx="400" ry="140" fill="#c8e0c0" opacity="0.7" />
      </Painted>
      <Painted look="wc" seed={31}>
        {/* Kayalıklar ve şelale */}
        <path d="M480 900 L540 200 L700 140 L720 900 Z" fill="#7a8a8a" />
        <path d="M880 900 L900 140 L1060 200 L1120 900 Z" fill="#6a7a7a" />
        <rect x="720" y="140" width="160" height="640" fill="#bfe6f4" opacity="0.9" />
        {[740, 780, 820, 860].map((x) => (
          <rect key={x} x={x} y="140" width="8" height="640" fill="#fff" opacity="0.7" />
        ))}
        <ellipse cx="800" cy="800" rx="460" ry="70" fill="#8ccde0" />
        {/* Dev yapraklar (botanik) */}
        {[[200, 700, -30, 1], [380, 500, 20, 0.8], [1260, 620, 30, 1.1], [1440, 420, -20, 0.9], [120, 380, 10, 0.9]].map(([x, y, a, s], i) => (
          <g key={i} transform={`rotate(${a} ${x} ${y})`}>
            <path d={`M${x} ${y} C ${x - 90 * s} ${y - 40 * s}, ${x - 90 * s} ${y - 220 * s}, ${x} ${y - 260 * s} C ${x + 90 * s} ${y - 220 * s}, ${x + 90 * s} ${y - 40 * s}, ${x} ${y} Z`} fill={i % 2 ? "#4e9a60" : "#5aa86a"} />
          </g>
        ))}
        {/* Çiçekler */}
        {[[300, 800], [1180, 790], [1500, 800]].map(([x, y], i) => (
          <g key={`fl${i}`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx={x} cy={y - 14} rx="8" ry="16" fill={["#f597b6", "#ffb04a", "#c86aff"][i]} transform={`rotate(${a} ${x} ${y})`} />
            ))}
            <circle cx={x} cy={y} r="7" fill="#ffd21f" />
          </g>
        ))}
        {/* Sepya mürekkep konturlar */}
        <g stroke="#5a4a3a" fill="none" strokeWidth="1.8" opacity="0.8">
          <path d="M480 900 L540 200 L700 140 L720 900" />
          <path d="M880 900 L900 140 L1060 200 L1120 900" />
          {[[200, 700, -30, 1], [380, 500, 20, 0.8], [1260, 620, 30, 1.1], [1440, 420, -20, 0.9], [120, 380, 10, 0.9]].map(([x, y, a, s], i) => (
            <path key={i} d={`M${x} ${y} L${x} ${y - 250 * s}`} transform={`rotate(${a} ${x} ${y})`} />
          ))}
        </g>
      </Painted>
      {/* Su sıçraması ve kelebekler */}
      <Drift count={18} from={790} to={700} xs={[700, 900]} dur={[1, 2]} sway={60} render={() => <span className="block h-2 w-2 rounded-full bg-white/80" />} />
      {[0, 1, 2].map((i) => (
        <motion.svg key={i} className="absolute" style={{ left: 300 + i * 400, top: 500 }} width="24" height="20" viewBox="0 0 24 20" animate={{ x: [0, 80, -40, 0], y: [0, -60, -20, 0] }} transition={{ duration: 9 + i * 2, repeat: Infinity, ease: "easeInOut" }}>
          <motion.g style={{ transformOrigin: "12px 10px" }} animate={{ scaleX: [1, 0.2, 1] }} transition={{ duration: 0.3, repeat: Infinity }}>
            <path d="M12 10 Q 2 0 2 8 Q 2 16 12 10 Q 22 16 22 8 Q 22 0 12 10 Z" fill={["#2b8cff", "#ffb04a", "#e23bd6"][i]} />
          </motion.g>
        </motion.svg>
      ))}
      <ClockCard x={1180} y={60} t={{ bg: "#fbf8ee", fg: "#3a5a3a", sub: "#5a7a5a", edge: "#8ac49a", font: SERIF }} />
      {/* Yaprağı şemsiye yapan */}
      <Actor x={360} y={810} size={96} look={look({ shape: "frog" })} color="#16C47F" expression={beat.i === 0 ? "happy" : "idle"} move={breathe(3)} act={on(beat, 0, hop(18))} actKey={k} front={<><path d="M-8 -4 Q 12 -24 32 -4 Z" fill="#5aa86a" /><line x1="12" y1="-4" x2="12" y2="18" stroke="#3a6a3a" strokeWidth="1.2" /><Hand x={12} y={18} /></>} />
      {/* Kayadan kayan */}
      <Actor x={1040} y={790} size={92} look={look({ shape: "drop" })} color="#7AD1FF" expression={beat.i === 1 ? "giggle" : "happy"} move={sway(2.6, 3)} act={on(beat, 1, { animate: { x: [0, -120, -120, 0], y: [0, 20, 20, 0] }, transition: { duration: 2.6 } })} actKey={k} />
      {/* Kelebek kovalayan */}
      <Actor x={1360} y={810} size={88} look={look({ shape: "flower", head: "flower" })} color="#FF9EC4" expression={beat.i === 2 ? "love" : "happy"} move={sway(2, 4)} act={on(beat, 2, hop(26))} actKey={k} />
      <Actor x={620} y={800} size={84} look={look({ shape: "leaf", head: "sprout" })} color="#8FE03A" expression="sleepy" move={breathe(4.2)} act={on(beat, 3, { animate: { rotate: [0, -10, 0] }, transition: { duration: 1.4 } })} actKey={k} />
    </Stage>
  );
}

// ------------------------------------------------------------------ 32. Retro bilim kurgu metrosu (yumuşak 3B + Art Deco)

export function Metro() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage sky="linear-gradient(180deg, #1a1a2a 0%, #2a2438 100%)" clock="st-soft3d" lights={[{ x: 800, y: 120, r: 700, color: "rgba(255,220,150,0.4)", opacity: 0.5 }]}>
      <Painted look="puff" seed={32}>
        {/* Vagon iç duvarı ve büyük pencereler */}
        <rect x="0" y="0" width={W} height="900" fill="#c8b8a0" />
        {[60, 600, 1140].map((x) => (
          <g key={x}>
            <rect x={x} y="140" width="400" height="300" rx="60" fill="#2a2a48" />
            <rect x={x + 16} y="156" width="368" height="268" rx="50" fill="#3a3a68" />
          </g>
        ))}
        {/* Krom tutunma çubuğu, koltuklar, zemin */}
        <rect x="0" y="80" width={W} height="16" rx="8" fill="#e8ecf4" />
        {[300, 800, 1300].map((x) => (
          <rect key={x} x={x} y="96" width="12" height="700" rx="6" fill="#d8dce8" />
        ))}
        {[[40, 600, 460], [1100, 600, 460]].map(([x, y, w], i) => (
          <g key={i}>
            <rect x={x} y={y} width={w} height="80" rx="30" fill="#2a6a6a" />
            <rect x={x} y={y + 70} width={w} height="110" rx="20" fill="#1e5050" />
          </g>
        ))}
        <rect x="0" y="790" width={W} height="110" fill="#3a3448" />
        {/* Art Deco süsler */}
        {Array.from({ length: 16 }, (_, i) => (
          <path key={`dc${i}`} d={`M${i * 100 + 20} 40 l30 -26 l30 26 Z`} fill="#d4a43a" />
        ))}
        <rect x="0" y="40" width={W} height="10" fill="#d4a43a" />
      </Painted>
      {/* Pencereden akan tünel ışıkları */}
      {[60, 600, 1140].map((x, i) => (
        <div key={i} className="absolute overflow-hidden" style={{ left: x + 16, top: 156, width: 368, height: 268, borderRadius: 50 }}>
          {[0, 1, 2].map((j) => (
            <motion.span key={j} className="absolute h-[4px] w-[160px] rounded-full" style={{ top: 60 + j * 70, background: "linear-gradient(90deg, rgba(255,200,120,0), rgba(255,220,150,0.9), rgba(255,200,120,0))" }} animate={{ x: [400, -200] }} transition={{ duration: 0.9 + j * 0.2, repeat: Infinity, ease: "linear", delay: i * 0.3 }} />
          ))}
        </div>
      ))}
      <ClockCard x={620} y={470} w={360} h={170} t={{ bg: "#1a1a2a", fg: "#ffd27a", sub: "#d4a43a", edge: "#d4a43a", font: MONO, radius: 12 }} />
      {/* Gazete okuyan */}
      <Actor x={200} y={620} size={92} look={look({ shape: "egg", head: "bowler", glasses: "monocle" })} color="#F4F4F6" expression="focused" shadow={false} move={breathe(3)} act={on(beat, 0, { animate: { rotate: [0, -6, 0] }, transition: { duration: 1.2 } })} actKey={k} front={<><rect x="-4" y="12" width="32" height="14" fill="#f2ead6" /><Hand x={-4} y={20} /><Hand x={28} y={20} /></>} />
      {/* Ayakta sallanan */}
      <Actor x={800} y={790} size={96} look={look({ shape: "bean", head: "conductor" })} color="#2B8CFF" expression={beat.i === 1 ? "dizzy" : "happy"} move={sway(1, 6)} act={on(beat, 1, { animate: { x: [0, 40, -30, 0] }, transition: { duration: 1.6 } })} actKey={k} front={<Hand x={14} y={-8} />} />
      {/* Pencereden bakan */}
      <Actor x={1280} y={620} size={88} look={look({ shape: "cat", head: "beanie" })} color="#FF8A1F" expression={beat.i === 2 ? "surprised" : "idle"} shadow={false} move={breathe(3.4)} act={on(beat, 2, hop(12))} actKey={k} />
      <Actor x={1460} y={790} size={84} look={look({ shape: "cube", head: "robot", texture: "chrome" })} color="#8A8F99" expression="sleepy" move={breathe(4)} act={on(beat, 3, { animate: { rotate: [0, 8, 0] }, transition: { duration: 1.4 } })} actKey={k} />
    </Stage>
  );
}

// ------------------------------------------------------------------ 33. Mutfak, kek pişirme (hamur / claymation)

export function Bakery() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage sky="linear-gradient(180deg, #f6e2c8 0%, #f2d4b0 100%)" grain={false} vignette={0.3} clock="st-clay" lights={[{ x: 1240, y: 520, r: 360, color: "rgba(255,170,90,0.5)", opacity: 0.5, flicker: 0.1 }]}>
      <Painted look="clay" seed={33}>
        {/* Fayans duvar, raflar, kavanozlar */}
        {Array.from({ length: 7 }, (_, r) =>
          Array.from({ length: 17 }, (_, c) => <rect key={`t${r}-${c}`} x={c * 96 + 4} y={r * 80 + 4} width="88" height="72" rx="14" fill={(r + c) % 2 ? "#f6eadc" : "#eedcc8"} />),
        )}
        <rect x="100" y="230" width="460" height="22" rx="10" fill="#c88a5a" />
        {[[140, "#ffd27a"], [240, "#f597b6"], [340, "#a8e0b8"], [440, "#c8b8f0"]].map(([x, c], i) => (
          <g key={i}>
            <rect x={x as number} y="150" width="70" height="80" rx="20" fill={c as string} />
            <rect x={(x as number) + 6} y="140" width="58" height="16" rx="8" fill="#c88a5a" />
          </g>
        ))}
        {/* Tezgâh ve fırın */}
        <rect x="0" y="600" width="1060" height="70" rx="20" fill="#e8b88a" />
        <rect x="0" y="660" width="1060" height="240" fill="#c88a5a" />
        <rect x="1080" y="380" width="340" height="420" rx="40" fill="#e8e0d8" />
        <rect x="1120" y="460" width="260" height="200" rx="40" fill="#3a2a2a" />
        <rect x="1140" y="480" width="220" height="160" rx="30" fill="#ff9a4a" />
        {[1150, 1210, 1270, 1330].map((x) => (
          <circle key={x} cx={x} cy="420" r="14" fill="#8a8a92" />
        ))}
        {/* Kase ve oklava */}
        <path d="M200 600 q 100 70 200 0 Z" fill="#7ab8e8" />
        <rect x="600" y="580" width="200" height="22" rx="11" fill="#d4a46a" />
        <rect x="0" y="800" width={W} height="100" fill="#d8b890" />
      </Painted>
      {/* Fırında kabaran kek */}
      <motion.div key={`cake${beat.i === 2 ? k : 0}`} className="absolute rounded-t-[60px]" style={{ left: 1180, top: 560, width: 140, height: 70, background: "radial-gradient(circle at 40% 30%, #ffe6a0, #e8a84a)", transformOrigin: "50% 100%" }} initial={{ scaleY: 0.6 }} animate={beat.i === 2 ? { scaleY: [0.6, 1.4, 1.1] } : { scaleY: 0.8 }} transition={{ duration: 2 }} />
      <Drift count={14} from={600} to={300} xs={[200, 420]} dur={[3, 6]} sway={30} render={() => <span className="block h-3 w-3 rounded-full bg-white/70" />} />
      <ClockCard x={620} y={150} w={360} h={170} t={{ bg: "#fff6ea", fg: "#8a4a2a", sub: "#c87a4a", edge: "#f597b6", radius: 40 }} />
      {/* Un serpen */}
      <Actor x={300} y={600} size={96} look={look({ shape: "cupcake", head: "chef" })} color="#FF9EC4" expression={beat.i === 0 ? "happy" : "focused"} move={breathe(2.8)} act={on(beat, 0, hop(14))} actKey={k} front={<><Hand x={-2} y={16} /><Hand x={26} y={10} /></>} />
      {/* Hamur açan */}
      <Actor x={700} y={600} size={92} look={look({ shape: "donut" })} color="#F4C08A" expression="focused" move={{ animate: { x: [-16, 16, -16] }, transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } }} act={on(beat, 1, hop(12))} actKey={k} front={<><Hand x={-2} y={22} /><Hand x={26} y={22} /></>} />
      {/* Fırına bakan */}
      <Actor x={1250} y={800} size={96} look={look({ shape: "icecream" })} color="#C8B8F0" expression={beat.i === 2 ? "surprised" : "idle"} move={breathe(3.4)} act={on(beat, 2, hop(20))} actKey={k} />
      <Actor x={940} y={800} size={84} look={look({ shape: "strawberry" })} color="#FF3B4A" expression={beat.i === 3 ? "love" : "happy"} move={sway(2, 4)} act={on(beat, 3, hop(24))} actKey={k} />
    </Stage>
  );
}

// ------------------------------------------------------------------ 34. Çatı katı stüdyosu, şehir gecesi (lo-fi guaj)

export function Rooftop() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage sky="linear-gradient(180deg, #141a3a 0%, #2a2a5a 50%, #6a4a7a 100%)" medium="canvas" clock="st-c-gouache" lights={[{ x: 400, y: 600, r: 400, color: "rgba(255,190,110,0.5)", opacity: 0.55, flicker: 0.06 }]}>
      <Painted look="gouache" seed={34}>
        {Array.from({ length: 50 }, (_, i) => (
          <circle key={`s${i}`} cx={(i * 263) % W} cy={(i * 97) % 360} r={1.2 + (i % 3) * 0.6} fill="#fff" opacity="0.8" />
        ))}
        <circle cx="1280" cy="140" r="50" fill="#fff2c8" />
        {/* Şehir silueti, pencereler */}
        {[[0, 360, 160], [160, 300, 120], [300, 400, 180], [500, 330, 140], [660, 380, 120], [800, 280, 160], [980, 360, 140], [1140, 320, 170], [1330, 380, 130], [1460, 300, 140]].map(([x, y, w], i) => (
          <g key={i}>
            <rect x={x} y={y} width={w} height={700 - y} fill={i % 2 ? "#2a2a4a" : "#34345a"} />
            {Array.from({ length: 9 }, (_, j) => (
              <rect key={j} x={x + 14 + (j % 3) * (w / 3.2)} y={y + 20 + Math.floor(j / 3) * 46} width="16" height="22" fill={(i + j) % 3 ? "#3a3a6a" : "#ffd27a"} />
            ))}
          </g>
        ))}
        {/* Çatı zemini, korkuluk, su deposu, saksılar */}
        <rect x="0" y="700" width={W} height="200" fill="#5a4a5a" />
        <rect x="0" y="680" width={W} height="24" fill="#3a2e3a" />
        {Array.from({ length: 20 }, (_, i) => (
          <rect key={`r${i}`} x={i * 84} y="610" width="8" height="74" fill="#3a2e3a" />
        ))}
        <rect x="0" y="606" width={W} height="10" fill="#3a2e3a" />
        <rect x="1340" y="420" width="160" height="200" rx="20" fill="#8a5a4a" />
        <path d="M1330 420 L1420 360 L1510 420 Z" fill="#6a4238" />
        {[[200, 760], [560, 770]].map(([x, y], i) => (
          <g key={`pl${i}`}>
            <path d={`M${x - 26} ${y} h52 l-6 34 h-40 Z`} fill="#c8693a" />
            {[-14, 0, 14].map((dx) => (
              <ellipse key={dx} cx={x + dx} cy={y - 18} rx="10" ry="22" fill="#4a8a5a" />
            ))}
          </g>
        ))}
        {/* Pikap ve teleskop sehpası */}
        <rect x="300" y="720" width="200" height="60" rx="10" fill="#8a5a3a" />
        <circle cx="400" cy="716" r="40" fill="#1a1a1a" />
        <path d="M1000 790 L1040 680 L1080 790" fill="none" stroke="#2a2a2a" strokeWidth="6" />
      </Painted>
      {/* Dönen plak, notalar */}
      <Layer>
        <motion.g style={{ transformOrigin: "400px 716px" }} animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <circle cx="400" cy="716" r="12" fill="#e2433b" />
          <rect x="398" y="682" width="4" height="10" fill="#444" />
        </motion.g>
      </Layer>
      <Drift count={8} from={680} to={420} xs={[360, 460]} dur={[3, 5]} sway={60} render={() => <span className="block text-[20px] text-white/70">♪</span>} />
      <ClockCard x={60} y={60} t={{ bg: "#2a2a4a", fg: "#ffd27a", sub: "#c8b8f0", edge: "#6a4a7a", radius: 22 }} />
      {/* Plak çalan */}
      <Actor x={600} y={790} size={96} look={look({ shape: "sphere", head: "headphones" })} color="#9B7BFF" expression={beat.i === 0 ? "happy" : "sleepy"} move={{ animate: { rotate: [-6, 6, -6] }, transition: { duration: 1.2, repeat: Infinity } }} act={on(beat, 0, hop(14))} actKey={k} />
      {/* Teleskopla bakan */}
      <Actor x={1000} y={790} size={92} look={look({ shape: "owl", glasses: "round" })} color="#B5651D" expression={beat.i === 1 ? "surprised" : "focused"} move={breathe(3)} act={on(beat, 1, hop(16))} actKey={k} front={<><rect x="20" y="-6" width="26" height="8" rx="3" fill="#c8ccd8" transform="rotate(-30 20 -2)" /><Hand x={20} y={4} /></>} />
      {/* Korkulukta yürüyen kedi */}
      <motion.div className="absolute inset-0" animate={{ x: [0, 900, 900, 0] }} transition={{ duration: 22, repeat: Infinity, times: [0, 0.45, 0.55, 1], ease: "easeInOut" }}>
        <Actor x={200} y={612} size={70} look={look({ shape: "cat" })} color="#2a2a2a" expression="idle" shadow={false} move={{ animate: { y: [0, -3, 0] }, transition: { duration: 0.5, repeat: Infinity } }} />
      </motion.div>
      <Actor x={1460} y={800} size={86} look={look({ shape: "moon", head: "nightcap" })} color="#FFD21F" expression="sleepy" move={breathe(4.4)} act={on(beat, 3, { animate: { rotate: [0, -8, 0] }, transition: { duration: 1.4 } })} actKey={k} />
    </Stage>
  );
}
