/**
 * Kalkan sahneleri (11–16): retro atari salonu, deniz altı, botanik sera, gece treni, sinema salonu,
 * Vahşi Batı kasabası.
 */
import { motion } from "motion/react";
import { ArcadeClock, CinemaClock, GreenhouseClock, OceanClock, TrainClock, WesternClock } from "./clocks2";
import { Actor, breathe, Drift, Hand, hop, Layer, look, on, Painted, Stage, Stars, sway, useBeat, W, H } from "./kit";

// ------------------------------------------------------------------ 11. Retro atari salonu

const CABINETS = [
  { x: 170, body: "#2b1a5a", glow: "#ff3ea5" },
  { x: 560, body: "#1a3a5a", glow: "#00e0ff" },
  { x: 1040, body: "#4a1a3a", glow: "#ffe04a" },
];

export function Arcade() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage
      sky="linear-gradient(180deg, #07021a 0%, #1a0838 35%, #4a1258 58%, #a0306e 72%, #ff7a7a 86%)"
      medium="crt"
      grain={false}
      vignette={0.35}
      lights={[
        ...CABINETS.map((m) => ({ x: m.x + 115, y: 470, r: 320, color: `${m.glow}88`, opacity: 0.55, flicker: 0.15 })),
        { x: 915, y: 470, r: 520, color: "rgba(255,90,170,0.35)", opacity: 0.5 },
      ]}
    >
      {/* Gökyüzü, çizgili retro güneş, tel kafes dağlar, parlayan ufuk */}
      <Painted filter="st-chroma">
        <defs>
          <linearGradient id="sw-sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff36a" />
            <stop offset="0.45" stopColor="#ff9a3c" />
            <stop offset="1" stopColor="#ff2e9a" />
          </linearGradient>
          <mask id="sw-sun-cut">
            <rect x="0" y="0" width={W} height={H} fill="#fff" />
            {Array.from({ length: 8 }, (_, i) => (
              <rect key={i} x="600" y={482 + i * 15} width="640" height={3 + i * 1.6} fill="#000" />
            ))}
          </mask>
          <linearGradient id="sw-mtn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a0a4a" />
            <stop offset="1" stopColor="#12042a" />
          </linearGradient>
        </defs>
        {Array.from({ length: 60 }, (_, i) => (
          <circle key={i} cx={(i * 263 + 41) % W} cy={20 + ((i * 113) % 360)} r={0.8 + (i % 3) * 0.6} fill="#fff" opacity={0.4 + (i % 4) * 0.15} />
        ))}
        <circle cx="915" cy="470" r="300" fill="#ff3ea5" opacity="0.22" filter="url(#nk-blur)" />
        <circle cx="915" cy="470" r="185" fill="url(#sw-sun)" mask="url(#sw-sun-cut)" />
        {/* Tel kafes dağlar */}
        <path d="M0 640 L120 560 L210 600 L330 520 L470 610 L560 580 L640 640 Z M1160 640 L1260 560 L1340 600 L1460 520 L1600 590 L1600 640 Z" fill="url(#sw-mtn)" stroke="#00e0ff" strokeWidth="2.5" />
        {[[120, 560], [330, 520], [1260, 560], [1460, 520]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y} L${x - 60} 640 M${x} ${y} L${x + 70} 640 M${x} ${y} L${x} 640`} stroke="#00e0ff" strokeWidth="1.2" opacity="0.6" />
        ))}
        <rect x="0" y="640" width={W} height="270" fill="#0c0320" />
        <rect x="0" y="640" width={W} height="60" fill="#ff3ea5" opacity="0.18" filter="url(#nk-blur)" />
      </Painted>
      {/* Neon ızgara zemin (perspektifli) ve ufuk çizgisi */}
      <Painted filter="st-neon">
        <rect x="0" y="639" width={W} height="3" fill="#ff7ad0" />
        {Array.from({ length: 31 }, (_, i) => (
          <line key={i} x1={915 + (i - 15) * 18} y1="640" x2={915 + (i - 15) * 150} y2="900" stroke="#ff3ea5" strokeWidth="2" opacity="0.85" />
        ))}
        {[648, 660, 676, 698, 728, 768, 820, 886].map((y) => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#ff3ea5" strokeWidth="2" opacity="0.8" />
        ))}
      </Painted>
      {/* Atari makineleri: parlak siyah lake gövde, krom kenar, neon şerit, ışıklı tabela */}
      <Painted>
        <defs>
          <linearGradient id="ar-lacq" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#05030c" />
            <stop offset="0.18" stopColor="#1a1030" />
            <stop offset="0.5" stopColor="#0c0818" />
            <stop offset="0.82" stopColor="#24183e" />
            <stop offset="1" stopColor="#05030c" />
          </linearGradient>
          <linearGradient id="ar-chrome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.45" stopColor="#8a94b8" />
            <stop offset="0.55" stopColor="#2a2448" />
            <stop offset="1" stopColor="#c8d0f0" />
          </linearGradient>
        </defs>
        {CABINETS.map((m, i) => (
          <g key={i} transform={`translate(${m.x} 330)`}>
            <ellipse cx="115" cy="420" rx="150" ry="16" fill={m.glow} opacity="0.25" filter="url(#nk-blur)" />
            <path d="M0 0 h230 v60 l-20 60 l20 70 v230 h-230 v-230 l20 -70 l-20 -60 Z" fill="url(#ar-lacq)" />
            <path d="M0 0 h230 v60 l-20 60 l20 70 v230 h-230 v-230 l20 -70 l-20 -60 Z" fill={m.body} opacity="0.35" />
            <path d="M0 0 v60 l20 60 l-20 70 v230 M230 0 v60 l-20 60 l20 70 v230" stroke={m.glow} strokeWidth="4" fill="none" filter="url(#st-neon)" />
            <rect x="6" y="6" width="218" height="48" rx="8" fill="url(#ar-chrome)" />
            <rect x="10" y="10" width="210" height="40" rx="6" fill={m.glow} filter="url(#st-neon)" />
            <rect x="10" y="10" width="210" height="14" rx="6" fill="#fff" opacity="0.35" />
            <rect x="26" y="62" width="178" height="136" rx="14" fill="url(#ar-chrome)" />
            <rect x="34" y="70" width="162" height="120" rx="10" fill="#05030a" />
            <rect x="34" y="70" width="162" height="120" rx="10" fill={m.glow} opacity="0.14" />
            <path d="M10 190 h210 l20 50 h-250 Z" fill="#1a1030" stroke={m.glow} strokeWidth="2" strokeOpacity="0.6" />
            {[50, 90, 140, 180].map((x, j) => (
              <circle key={j} cx={x} cy="216" r="7" fill={["#ff3ea5", "#00e0ff", "#ffe04a", "#8aff6a"][j]} filter="url(#st-neon)" />
            ))}
            <rect x="80" y="300" width="70" height="40" rx="6" fill="#0a0614" stroke={m.glow} strokeOpacity="0.5" strokeWidth="2" />
            <rect x="104" y="314" width="22" height="6" rx="3" fill={m.glow} filter="url(#st-neon)" />
            <rect x="96" y="356" width="38" height="22" rx="4" fill="#0a0612" />
          </g>
        ))}
        {/* Joystick'e yetişmek için üst üste iki kasa: neon kenarlı */}
        {[640, 715].map((y) => (
          <g key={y}>
            <rect x="235" y={y} width="110" height="75" rx="4" fill="#160a2a" stroke="#00e0ff" strokeWidth="3" filter="url(#st-neon)" />
            <path d={`M240 ${y + 6} L340 ${y + 69} M340 ${y + 6} L240 ${y + 69}`} stroke="#00e0ff" strokeOpacity="0.5" strokeWidth="2" />
          </g>
        ))}
      </Painted>
      {/* Izgarada akan parlak çizgi (ufuktan izleyiciye) */}
      <Layer>
        <motion.rect x="0" width={W} height="3" fill="#ffb0e6" style={{ filter: "drop-shadow(0 0 6px #ff3ea5)" }} initial={{ y: 640, opacity: 0 }} animate={{ y: [640, 900], opacity: [0, 1, 0], height: [1, 5] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeIn" }} />
      </Layer>
      {/* Ekranlardaki oyunlar: uzaylılar, top, yılan */}
      {CABINETS.map((m, i) => (
        <div key={i} className="absolute overflow-hidden rounded-[8px]" style={{ left: m.x + 38, top: 404, width: 154, height: 112 }}>
          <motion.span className="absolute h-3 w-3 rounded-sm" style={{ background: m.glow, boxShadow: `0 0 8px ${m.glow}` }} animate={{ x: [10, 130, 40, 120, 10], y: [10, 80, 90, 20, 10] }} transition={{ duration: 3 + i, repeat: Infinity, ease: "linear" }} />
          {Array.from({ length: 5 }, (_, j) => (
            <motion.span key={j} className="absolute h-2.5 w-4 rounded-sm" style={{ left: 14 + j * 26, top: 14, background: "#8aff6a" }} animate={{ x: [0, 14, 0], y: i === 0 && beat.i === 0 ? [0, 30] : 0, opacity: i === 0 && beat.i === 0 ? [1, 0] : 1 }} transition={{ duration: 1.6, repeat: i === 0 && beat.i === 0 ? 0 : Infinity }} />
          ))}
          <span className="absolute bottom-2 left-1/2 h-2 w-8 -translate-x-1/2 rounded-sm bg-white/80" />
          {i === 0 && beat.i === 0 && <motion.span key={k} className="absolute inset-0" style={{ background: "#fff" }} initial={{ opacity: 0.8 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} />}
        </div>
      ))}

      <ArcadeClock />
      {/* Parmak uçlarında joystick sallayan */}
      <Actor morph={beat.n[0]} morphDelay={300} x={290} y={642} size={92} look={look({ shape: "bean", head: "headphones" })} color="#FF3EA5" expression={beat.i === 0 ? "surprised" : "focused"} move={{ animate: { y: [0, -7, 0], scaleY: [1, 1.04, 0.97] }, transition: { duration: 0.45, repeat: Infinity, ease: "easeInOut" } }} act={on(beat, 0, hop(30))} actKey={k} front={<Joystick />} z={2} />
      {/* Makinenin üstüne abanmış, skoru izleyen */}
      <Actor x={680} y={548} size={96} look={look({ shape: "sphere" })} color="#00B8FF" flip expression={beat.i === 1 ? "love" : "focused"} move={{ animate: { rotate: [8, 12, 8] }, transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } }} act={on(beat, 1, hop(16))} actKey={k} front={<><Hand x={-6} y={22} /><Hand x={30} y={22} /></>} z={2} />
      {beat.i === 1 && (
        <motion.span key={`sc${k}`} className="absolute font-black" style={{ left: 640, top: 380, fontFamily: "ui-monospace, Consolas, monospace", fontSize: 30, color: "#00e0ff", textShadow: "0 0 10px #00e0ff" }} initial={{ y: 0, opacity: 0 }} animate={{ y: -60, opacity: [0, 1, 0] }} transition={{ duration: 1.8 }}>
          +1000
        </motion.span>
      )}
      {/* Jeton iade yuvasını kurcalayan (çömelmiş) */}
      <Actor x={1170} y={800} size={84} look={look({ shape: "cat" })} color="#FFD21F" expression={beat.i === 2 ? "happy" : "suspicious"} move={{ animate: { scaleY: [0.9, 0.94, 0.9] }, transition: { duration: 1.2, repeat: Infinity } }} act={on(beat, 2, hop(24))} actKey={k} front={<motion.g animate={{ x: [0, 1.5, 0] }} transition={{ duration: 0.3, repeat: Infinity }}><Hand x={4} y={-6} /></motion.g>} />
      {beat.i === 2 && <motion.span key={`co${k}`} className="absolute h-6 w-6 rounded-full" style={{ left: 1150, top: 700, background: "radial-gradient(circle at 35% 35%, #fff2a8, #e0a81f)", boxShadow: "0 0 10px #ffe04a" }} initial={{ y: 0, opacity: 1 }} animate={{ y: [0, -80, 60], x: [0, 30, 60], rotateY: [0, 720] }} transition={{ duration: 1.2 }} />}
      {/* Köşede jeton kovasıyla ne oynayacağını seçen */}
      <Actor x={1440} y={810} size={100} look={look({ shape: "egg", glasses: "bold" })} color="#9B7BFF" flip={beat.i === 3} expression={beat.i === 3 ? "thinking" : "idle"} move={breathe(3)} act={on(beat, 3, { animate: { rotate: [0, -8, 8, 0] }, transition: { duration: 1.6 } })} actKey={k} front={<CoinBucket />} />
    </Stage>
  );
}

function Joystick() {
  return (
    <g>
      <motion.g style={{ transformOrigin: "12px 30px" }} animate={{ rotate: [-25, 25, -15, 30, -25] }} transition={{ duration: 0.5, repeat: Infinity }}>
        <line x1="12" y1="30" x2="12" y2="20" stroke="#222" strokeWidth="1.6" />
        <circle cx="12" cy="19" r="2.6" fill="#ff3b4a" />
        <Hand x={9.5} y={20} />
        <Hand x={14.5} y={21} />
      </motion.g>
    </g>
  );
}

function CoinBucket() {
  return (
    <g>
      <path d="M-2 16 h28 l-3 14 h-22 Z" fill="#e0a81f" />
      <path d="M-2 16 h28 l-0.6 3 h-26.8 Z" fill="#fff2a8" opacity="0.6" />
      {[2, 6, 10, 14, 18, 22].map((x, i) => (
        <ellipse key={x} cx={x} cy={15 - (i % 2)} rx="2.4" ry="1.2" fill="#ffe04a" stroke="#c08a10" strokeWidth="0.4" />
      ))}
      <Hand x={-3} y={20} />
      <Hand x={27} y={20} />
    </g>
  );
}

// ------------------------------------------------------------------ 12. Deniz altı / mercan kayalığı

export function Ocean() {
  const beat = useBeat(4);
  const k = beat.k;
  const coral = ["#ff6a8a", "#ff9a4a", "#c86aff", "#ffd24a"];
  return (
    <Stage medium="canvas" clock="st-c-gouache"
      sky="linear-gradient(180deg, #1aa0b8 0%, #0d6688 30%, #08405e 65%, #04223a 100%)"
      lights={[
        { x: 800, y: 0, r: 900, color: "rgba(190,250,255,0.35)", opacity: 0.45, flicker: 0.08 },
        { x: 400, y: 790, r: 220, color: "rgba(255,120,160,0.35)", opacity: 0.35 },
        { x: 1350, y: 790, r: 220, color: "rgba(200,120,255,0.35)", opacity: 0.35 },
      ]}
    >
      <Layer>
        <defs>
          <linearGradient id="oc-rock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#14566e" />
            <stop offset="1" stopColor="#082e44" />
          </linearGradient>
          <linearGradient id="oc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e2cc96" />
            <stop offset="1" stopColor="#b8995e" />
          </linearGradient>
          <linearGradient id="oc-ray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dffaff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#dffaff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Yüzeyden süzülen ışık: aşağı indikçe solan hüzmeler */}
        {[200, 520, 900, 1250].map((x, i) => (
          <motion.polygon key={x} points={`${x},0 ${x + 120},0 ${x + 300},900 ${x - 60},900`} fill="url(#oc-ray)" animate={{ opacity: [0.25, 0.6, 0.25] }} transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }} />
        ))}
      </Layer>
      <Painted look="gouache" seed={486}>
        <defs>
          <linearGradient id="oc-rock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#14566e" />
            <stop offset="1" stopColor="#082e44" />
          </linearGradient>
          <linearGradient id="oc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e2cc96" />
            <stop offset="1" stopColor="#b8995e" />
          </linearGradient>
          <linearGradient id="oc-ray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dffaff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#dffaff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 40 Q 100 30 200 40 T 400 40 T 600 40 T 800 40 T 1000 40 T 1200 40 T 1400 40 T 1600 40 L1600 0 L0 0 Z" fill="#9ee8f5" opacity="0.35" />
        {/* Çok uzak siluetler: suyun içinde kaybolan kayalar */}
        <path d="M0 560 Q 300 470 520 540 Q 760 450 1000 540 Q 1260 460 1600 530 L1600 700 L0 700 Z" fill="#0a4a66" opacity="0.6" />
        {/* Guaj: uzakta opak yosun ormanı ve kat kat resif rafları */}
        {Array.from({ length: 14 }, (_, i) => {
          const x = 40 + i * 118;
          const h = 260 + (i % 4) * 60;
          return <path key={`kp${i}`} d={`M${x} 760 C ${x - 30} ${760 - h * 0.35}, ${x + 30} ${760 - h * 0.65}, ${x + (i % 2 ? 14 : -14)} ${760 - h} C ${x + 26} ${760 - h * 0.6}, ${x + 6} ${760 - h * 0.3}, ${x + 20} 760 Z`} fill={i % 2 ? "#1a6a6a" : "#145a62"} opacity="0.85" />;
        })}
        <path d="M0 700 Q 180 660 360 690 Q 560 640 760 690 L760 760 L0 760 Z" fill="#1c5a72" />
        <path d="M840 690 Q 1040 640 1240 680 Q 1420 650 1600 680 L1600 760 L840 760 Z" fill="#1c5a72" />
        {/* Uzak kayalar */}
        <path d="M0 640 Q 200 540 380 620 Q 560 520 760 640 L760 900 L0 900 Z" fill="url(#oc-rock)" />
        <path d="M900 650 Q 1100 520 1300 610 Q 1460 540 1600 600 L1600 900 L900 900 Z" fill="url(#oc-rock)" />
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="oc-rock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#14566e" />
            <stop offset="1" stopColor="#082e44" />
          </linearGradient>
          <linearGradient id="oc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e2cc96" />
            <stop offset="1" stopColor="#b8995e" />
          </linearGradient>
          <linearGradient id="oc-ray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dffaff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#dffaff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Batık bir sandık */}
        <g transform="translate(600 776)">
          <rect x="0" y="-40" width="110" height="56" rx="6" fill="#6a4226" />
          <path d="M0 -40 Q55 -80 110 -40 Z" fill="#7a5232" />
          <rect x="0" y="-44" width="110" height="8" fill="#c9a24a" />
          <rect x="48" y="-34" width="14" height="20" rx="3" fill="#c9a24a" />
          <motion.ellipse cx="55" cy="-46" rx="40" ry="10" fill="#ffd27a" opacity="0.4" filter="url(#nk-blur-s)" animate={{ opacity: [0.2, 0.55, 0.2] }} transition={{ duration: 3, repeat: Infinity }} />
        </g>
      </Layer>
      <Painted look="gouache" seed={486}>
        <defs>
          <linearGradient id="oc-rock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#14566e" />
            <stop offset="1" stopColor="#082e44" />
          </linearGradient>
          <linearGradient id="oc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e2cc96" />
            <stop offset="1" stopColor="#b8995e" />
          </linearGradient>
          <linearGradient id="oc-ray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dffaff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#dffaff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Guaj: uzakta opak balık sürüsü, yuvarlak resif kayaları, sudan süzülen ışık lekeleri */}
        {Array.from({ length: 26 }, (_, i) => {
          const x = 980 + (i % 9) * 34 + (Math.floor(i / 9) % 2) * 16;
          const y = 330 + Math.floor(i / 9) * 26 + (i % 3) * 4;
          return (
            <g key={`fs${i}`}>
              <ellipse cx={x} cy={y} rx="13" ry="6" fill="#0e4a5e" />
              <path d={`M${x + 11} ${y} l 9 -6 l 0 12 Z`} fill="#0e4a5e" />
            </g>
          );
        })}
        {[[160, 760, 70, "#2a6a6a"], [470, 770, 54, "#346e64"], [1180, 765, 66, "#2a6a6a"], [1460, 772, 50, "#3a7466"]].map(([x, y, r, c], i) => (
          <g key={`rk${i}`}>
            <ellipse cx={x as number} cy={y as number} rx={(r as number) * 1.4} ry={r as number} fill={c as string} />
            <ellipse cx={(x as number) - (r as number) * 0.4} cy={(y as number) - (r as number) * 0.45} rx={(r as number) * 0.6} ry={(r as number) * 0.25} fill="#7ab8a8" opacity="0.7" />
          </g>
        ))}
        {Array.from({ length: 40 }, (_, i) => {
          const x = (i * 211) % W;
          const y = 120 + ((i * 97) % 420);
          return <ellipse key={`lt${i}`} cx={x} cy={y} rx={22 + (i % 3) * 8} ry="7" fill="#bff4ff" opacity="0.18" transform={`rotate(${(i % 5) * 8 - 16} ${x} ${y})`} />;
        })}
        {/* Kum: dalgalı izler */}
        <path d="M0 780 Q 400 750 800 775 T 1600 770 L1600 900 L0 900 Z" fill="url(#oc-sand)" />
        <path d="M0 820 Q 500 800 900 820 T 1600 815 L1600 900 L0 900 Z" fill="#c9ad74" />
        {[800, 840, 870].map((y, i) => (
          <path key={y} d={`M0 ${y} q 60 -8 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0`} stroke="#a88a54" strokeWidth="2" fill="none" opacity={0.5 - i * 0.1} />
        ))}
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="oc-rock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#14566e" />
            <stop offset="1" stopColor="#082e44" />
          </linearGradient>
          <linearGradient id="oc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e2cc96" />
            <stop offset="1" stopColor="#b8995e" />
          </linearGradient>
          <linearGradient id="oc-ray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dffaff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#dffaff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Su altı ışık desenleri (kostik) kumun üstünde */}
        {Array.from({ length: 14 }, (_, i) => (
          <motion.ellipse key={`cs${i}`} cx={60 + i * 115} cy={800 + (i % 3) * 22} rx={30 + (i % 3) * 10} ry="6" fill="#fffbe0" opacity="0.18" style={{ transformOrigin: `${60 + i * 115}px ${800 + (i % 3) * 22}px` }} animate={{ opacity: [0.05, 0.25, 0.05], scaleX: [1, 1.5, 1] }} transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.3 }} />
        ))}
      </Layer>
      <Painted look="gouache" seed={486}>
        <defs>
          <linearGradient id="oc-rock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#14566e" />
            <stop offset="1" stopColor="#082e44" />
          </linearGradient>
          <linearGradient id="oc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e2cc96" />
            <stop offset="1" stopColor="#b8995e" />
          </linearGradient>
          <linearGradient id="oc-ray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dffaff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#dffaff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Mercanlar: koyu iç gövde + açık dış kontur */}
        {[[120, 790, 0], [260, 800, 1], [1180, 790, 2], [1500, 800, 3], [760, 810, 1]].map(([x, y, c], i) => (
          <g key={i} strokeLinecap="round" fill="none">
            <path d={`M${x} ${y} L${x} ${y - 80} M${x} ${y - 40} L${x - 34} ${y - 90} M${x} ${y - 56} L${x + 30} ${y - 110}`} stroke={coral[c]} strokeWidth="18" />
            <path d={`M${x - 3} ${y} L${x - 3} ${y - 80} M${x - 3} ${y - 42} L${x - 36} ${y - 90} M${x - 2} ${y - 58} L${x + 27} ${y - 110}`} stroke="#fff" strokeWidth="4" opacity="0.3" />
          </g>
        ))}
        {[[400, 800], [1350, 795]].map(([x, y], i) => (
          <g key={i}>
            {Array.from({ length: 6 }, (_, j) => (
              <circle key={j} cx={x - 30 + j * 12} cy={y - 18 - (j % 2) * 10} r="16" fill={coral[(i + j) % 4]} opacity="0.85" />
            ))}
          </g>
        ))}
      </Painted>
      {/* Salınan yosunlar */}
      {[60, 330, 590, 1100, 1420, 1560].map((x, i) => (
        <motion.svg key={x} className="absolute overflow-visible" style={{ left: x, top: 520, originX: 0.5, originY: 1 }} width="40" height="280" animate={{ rotate: [-6, 6, -6] }} transition={{ duration: 4 + (i % 3), repeat: Infinity, ease: "easeInOut" }}>
          <path d={`M20 280 C 0 220, 40 170, 20 120 S 0 40, ${20 + (i % 2 ? 10 : -10)} ${i % 2 ? 0 : 30}`} stroke="#2fa86a" strokeWidth="12" fill="none" strokeLinecap="round" />
        </motion.svg>
      ))}
      {/* Balıklar */}
      {[[260, "#ffd24a", 18], [420, "#ff6a8a", 24], [330, "#7af0ff", 21]].map(([y, c, d], i) => (
        <motion.svg key={i} className="absolute" style={{ left: 0, top: y as number }} width="54" height="30" viewBox="0 0 54 30" initial={{ x: i % 2 ? W + 60 : -80 }} animate={{ x: i % 2 ? [W + 60, -80] : [-80, W + 60], y: [0, -14, 0, 10, 0] }} transition={{ duration: d as number, repeat: Infinity, ease: "linear", delay: i * 3 }}>
          <g transform={i % 2 ? "scale(-1 1) translate(-54 0)" : undefined}>
            <ellipse cx="24" cy="15" rx="18" ry="10" fill={c as string} />
            <path d="M40 15 L54 5 L52 15 L54 25 Z" fill={c as string} />
            <circle cx="14" cy="12" r="2.4" fill="#111" />
          </g>
        </motion.svg>
      ))}
      <Drift count={26} from={900} to={-40} dur={[7, 14]} sway={24} render={(i) => <span className="block rounded-full border-2 border-white/60" style={{ width: 6 + (i % 4) * 4, height: 6 + (i % 4) * 4 }} />} />

      <OceanClock />
      {/* Şnorkelle yukarıdan bakan */}
      <motion.div key={`sn${beat.i === 1 ? k : 0}`} className="absolute inset-0" animate={beat.i === 1 ? { y: [0, 120, 120, 0] } : { y: [0, 6, 0] }} transition={beat.i === 1 ? { duration: 4, times: [0, 0.35, 0.65, 1] } : { duration: 3, repeat: Infinity }}>
        <Actor shadow={false} x={800} y={190} size={88} look={look({ shape: "sphere" })} color="#FF8A1F" expression={beat.i === 1 ? "surprised" : "happy"} move={{ animate: { rotate: [-12, -6, -12] }, transition: { duration: 3, repeat: Infinity } }} front={<Snorkel />} />
      </motion.div>
      {/* Bakır dalgıç başlığıyla dipte yavaş yürüyen */}
      <motion.div className="absolute inset-0" animate={{ x: [0, 260, 260, 0, 0] }} transition={{ duration: 40, times: [0, 0.4, 0.5, 0.9, 1], repeat: Infinity, ease: "easeInOut" }}>
        <Actor x={520} y={800} size={104} look={look({ shape: "bean" })} color="#F4F4F6" expression={beat.i === 3 ? "surprised" : "focused"} move={{ animate: { y: [0, -6, 0], rotate: [-3, 3, -3] }, transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }} act={on(beat, 3, hop(40))} actKey={k} front={<DiveHelmet />} />
      </motion.div>
      {/* İstiridyenin incileriyle oynayan */}
      <Clam open={beat.i === 2} k={k} />
      <Actor morph={beat.n[2]} morphDelay={800} x={1010} y={810} size={92} look={look({ shape: "flower" })} color="#FF5C8A" flip expression={beat.i === 2 ? "love" : "happy"} move={breathe(3)} act={on(beat, 2, hop(14))} actKey={k} front={<Pearl />} />
      {/* Kartondan köpekbalığı yüzgeciyle korkutmaya çalışan yaramaz */}
      <motion.div key={`sh${beat.i === 3 ? k : 0}`} className="absolute inset-0" animate={beat.i === 3 ? { x: [0, -380, -380, 0] } : { x: 0 }} transition={{ duration: 4, times: [0, 0.3, 0.6, 1], ease: "easeInOut" }}>
        <Actor shadow={false} x={1300} y={700} size={86} look={look({ shape: "blob" })} color="#8A8F99" flip expression={beat.i === 3 ? "giggle" : "suspicious"} move={{ animate: { y: [0, -10, 0] }, transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }} back={<SharkFin />} front={<Hand x={-3} y={14} />} />
      </motion.div>
    </Stage>
  );
}

function DiveHelmet() {
  return (
    <g>
      <path d="M12 -10 C -14 -10 -14 32 12 32 C 38 32 38 -10 12 -10 Z" fill="none" stroke="#c87a3a" strokeWidth="3.4" />
      <circle cx="12" cy="11" r="13" fill="rgba(170,230,255,0.16)" stroke="#e8a35a" strokeWidth="1.6" />
      <path d="M3 3 q4 -5 10 -5" stroke="#fff" strokeWidth="1.2" opacity="0.6" fill="none" strokeLinecap="round" />
      {[[-1.5, 2], [25.5, 2], [-1.5, 20], [25.5, 20], [12, -9.6]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.1" fill="#7a4a1a" />
      ))}
      <rect x="0" y="29" width="24" height="5" rx="2" fill="#a8622a" />
      <path d="M12 -12 C 14 -24, 30 -30, 34 -60" stroke="#3a3a3a" strokeWidth="1.6" fill="none" />
      <Hand x={-5} y={20} />
      <Hand x={29} y={20} />
    </g>
  );
}

function Snorkel() {
  return (
    <g>
      <rect x="2" y="6.5" width="20" height="9" rx="4.5" fill="rgba(190,240,255,0.3)" stroke="#ff6a3d" strokeWidth="1.6" />
      <path d="M22 11 h3 v-20 q0 -3 3 -3" stroke="#2fd4c0" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <Hand x={-4} y={14} />
      <motion.g animate={{ y: [0, -2, 0] }} transition={{ duration: 0.8, repeat: Infinity }}>
        <Hand x={28} y={16} />
      </motion.g>
    </g>
  );
}

function Pearl() {
  return (
    <g>
      <motion.circle cx="-4" cy="18" r="2.4" fill="#fffaf0" stroke="#e0d8c8" strokeWidth="0.4" animate={{ y: [0, -6, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} />
      <Hand x={-4} y={22} />
      <Hand x={28} y={20} />
    </g>
  );
}

function SharkFin() {
  return <path d="M6 2 Q 10 -16 22 -18 Q 16 -8 18 2 Z" fill="#9aa3b0" stroke="#6b7480" strokeWidth="0.8" />;
}

function Clam({ open, k }: { open: boolean; k: number }) {
  return (
    <svg className="absolute overflow-visible" style={{ left: 1080, top: 740 }} width="140" height="80">
      <ellipse cx="70" cy="70" rx="64" ry="12" fill="#000" opacity="0.2" />
      <path d="M10 60 Q 70 90 130 60 Q 70 76 10 60 Z" fill="#e8a3c8" />
      <motion.path key={k} d="M10 60 Q 20 0 70 4 Q 120 0 130 60 Q 70 50 10 60 Z" fill="#f2b8d6" stroke="#c87aa3" strokeWidth="2" style={{ transformOrigin: "70px 60px" }} animate={{ rotateX: open ? [0, 50, 50, 0] : [0, 18, 0] }} transition={open ? { duration: 2.4, times: [0, 0.25, 0.75, 1] } : { duration: 4, repeat: Infinity }} />
      {[50, 70, 90].map((x) => (
        <circle key={x} cx={x} cy="62" r="6" fill="#fffaf0" />
      ))}
    </svg>
  );
}

// ------------------------------------------------------------------ 13. Botanik sera

export function Greenhouse() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage medium="watercolor" clock="st-c-wc"
      sky="linear-gradient(180deg, #f7f2e6 0%, #f1eedf 60%, #ebe4d2 100%)"
      grain={false}
      vignette={0.12}
      lights={[{ x: 1150, y: 200, r: 700, color: "rgba(255,248,215,0.5)", opacity: 0.45 }]}
    >
      {/* Arka yıkama: ıslak üstüne ıslak yeşiller, camdan süzülen ışık */}
      <Painted filter="st-wc-soft">
        <ellipse cx="300" cy="420" rx="420" ry="260" fill="#b8dcb4" opacity="0.6" />
        <ellipse cx="1250" cy="380" rx="460" ry="280" fill="#a8d4b8" opacity="0.6" />
        <ellipse cx="800" cy="200" rx="520" ry="200" fill="#d8ecd0" opacity="0.7" />
        <polygon points="1060,0 1320,0 1220,740 880,740" fill="#fff6c8" opacity="0.7" />
        <ellipse cx="800" cy="820" rx="900" ry="120" fill="#e8b48e" opacity="0.6" />
      </Painted>
      {/* Botanik çizim: sepya mürekkep çizgiler + her parçada suluboya (look="wc") */}
      <Painted look="wc" seed={1045}>
        {/* Uzak bitki kümeleri (camın arkasında) */}
        {[[100, 560, 120, "#7fb88a"], [320, 520, 150, "#6aa87a"], [620, 590, 120, "#8cc496"], [980, 550, 160, "#78b486"], [1280, 570, 130, "#6aa87a"], [1520, 530, 120, "#86bc8e"]].map(([x, y, r, c], i) => (
          <circle key={i} cx={x as number} cy={y as number} r={r as number} fill={c as string} opacity="0.55" />
        ))}
        {/* Terakota zemin: karolar */}
        <rect x="0" y="740" width={W} height="160" fill="#d99a70" opacity="0.9" />
        {Array.from({ length: 15 }, (_, i) => (
          <rect key={`tl${i}`} x={i * 110 + 4} y="744" width="102" height="62" fill={i % 2 ? "#cf8a5e" : "#dfa47a"} opacity="0.75" />
        ))}
        {Array.from({ length: 15 }, (_, i) => (
          <rect key={`tm${i}`} x={i * 110 - 51} y="812" width="102" height="86" fill={i % 2 ? "#dfa47a" : "#c98458"} opacity="0.75" />
        ))}
        {/* Raflar, saksılar ve botanik bitkiler */}
        {[0, 1].map((side) => (
          <g key={side} transform={side ? "translate(1360 0)" : undefined}>
            {[430, 600].map((y) => (
              <rect key={y} x="0" y={y} width="240" height="14" fill="#b88a5e" />
            ))}
            <rect x={side ? 226 : 0} y="420" width="14" height="320" fill="#8a5a36" />
            {[0, 1, 2].map((i) =>
              [430, 600].map((y) => (
                <g key={`${i}${y}`} transform={`translate(${30 + i * 76} ${y})`}>
                  <path d="M0 -40 h44 l-6 40 h-32 Z" fill="#d4784a" />
                  <rect x="-3" y="-44" width="50" height="8" rx="2" fill="#e08a5a" />
                  {/* Eğrelti yaprağı: orta damar + yaprakçıklar */}
                  <g transform={`rotate(${(i - 1) * 14} 22 -44)`}>
                    {Array.from({ length: 6 }, (_, j) => (
                      <g key={j}>
                        <ellipse cx={22 - 9} cy={-50 - j * 9} rx="8" ry="3.4" fill={["#5aa86a", "#6fb878", "#4e9a60"][(i + j) % 3]} transform={`rotate(-30 ${22 - 9} ${-50 - j * 9})`} />
                        <ellipse cx={22 + 9} cy={-50 - j * 9} rx="8" ry="3.4" fill={["#6fb878", "#4e9a60", "#5aa86a"][(i + j) % 3]} transform={`rotate(30 ${22 + 9} ${-50 - j * 9})`} />
                      </g>
                    ))}
                  </g>
                </g>
              )),
            )}
          </g>
        ))}
        {/* Toprak yığını ve sukulentler */}
        <ellipse cx="1380" cy="810" rx="120" ry="34" fill="#7a5236" />
        <ellipse cx="1350" cy="796" rx="70" ry="22" fill="#8a6244" />
        {[300, 380, 440].map((x, i) => (
          <g key={x} transform={`translate(${x} 800)`}>
            <path d="M-20 -26 h40 l-5 26 h-30 Z" fill="#e6a882" />
            {Array.from({ length: 8 }, (_, j) => (
              <ellipse key={j} cx="0" cy="-36" rx="6" ry="14" fill={i === 1 ? "#9ccab0" : "#7ab494"} transform={`rotate(${j * 45} 0 -30)`} />
            ))}
          </g>
        ))}
        {/* Sepya mürekkep: cam kemerler, kayıtlar, raf ve saksı konturları, damarlar */}
        <g stroke="#6a4a3a" fill="none" strokeLinecap="round" opacity="0.85">
          {[0, 1, 2, 3].map((i) => (
            <path key={`a${i}`} d={`M${i * 400} 300 Q ${i * 400 + 200} 0 ${i * 400 + 400} 300`} strokeWidth="3" />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <path key={`a2${i}`} d={`M${i * 400 + 20} 300 Q ${i * 400 + 200} 30 ${i * 400 + 380} 300`} strokeWidth="1.4" />
          ))}
          {Array.from({ length: 17 }, (_, i) => (
            <line key={`m${i}`} x1={i * 100} y1={i % 4 === 0 ? 300 : 120 + Math.abs(((i % 4) - 2)) * 60} x2={i * 100} y2="740" strokeWidth="2" />
          ))}
          <line x1="0" y1="300" x2={W} y2="300" strokeWidth="3" />
          <line x1="0" y1="740" x2={W} y2="740" strokeWidth="2.4" />
          {[0, 1].map((side) =>
            [430, 600].map((y) => <rect key={`s${side}${y}`} x={side ? 1360 : 0} y={y} width="240" height="14" strokeWidth="1.6" />),
          )}
          {[0, 1].map((side) =>
            [0, 1, 2].map((i) =>
              [430, 600].map((y) => <path key={`p${side}${i}${y}`} d={`M${(side ? 1360 : 0) + 30 + i * 76} ${y - 40} h44 l-6 40 h-32 Z`} strokeWidth="1.6" />),
            ),
          )}
          {[0, 1].map((side) =>
            [0, 1, 2].map((i) =>
              [430, 600].map((y) => (
                <path key={`v${side}${i}${y}`} d={`M${(side ? 1360 : 0) + 30 + i * 76 + 22} ${y - 44} q ${(i - 1) * 6} -30 ${(i - 1) * 14} -56`} strokeWidth="1.2" />
              )),
            ),
          )}
          {[300, 380, 440].map((x) => (
            <path key={`sk${x}`} d={`M${x - 20} 774 h40 l-5 26 h-30 Z`} strokeWidth="1.4" />
          ))}
        </g>
      </Painted>
      {/* Tavandan taşan monstera yaprakları */}
      {[[60, -20, 30], [380, -40, -20], [1160, -30, 15], [1460, -10, -35]].map(([x, y, a], i) => (
        <motion.svg key={i} className="absolute overflow-visible" style={{ left: x, top: y, originX: 0.5, originY: 0 }} width="180" height="220" animate={{ rotate: [a - 3, a + 3, a - 3] }} transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}>
          <line x1="90" y1="0" x2="90" y2="70" stroke="#3a7a4a" strokeWidth="5" />
          <path d="M90 70 C 0 80, 10 210, 90 210 C 170 210, 180 80, 90 70 Z" fill="#4f9e64" opacity="0.92" />
          <path d="M90 70 C 30 84, 34 200, 90 210 C 60 180, 56 110, 90 70 Z" fill="#7cc08a" opacity="0.55" />
          <path d="M90 70 C 0 80, 10 210, 90 210 C 170 210, 180 80, 90 70 Z" fill="none" stroke="#3e5a3a" strokeWidth="1.6" />
          <path d="M90 76 L90 205" stroke="#3e5a3a" strokeWidth="1.8" />
          {[100, 130, 160, 185].map((y) => (
            <path key={y} d={`M30 ${y} L70 ${y + 4} M150 ${y} L110 ${y + 4}`} stroke="#f4f1e4" strokeWidth="7" strokeLinecap="round" />
          ))}
        </motion.svg>
      ))}
      {/* Budanacak sarkan yaprak */}
      {beat.i !== 1 ? (
        <motion.svg className="absolute overflow-visible" style={{ left: 790, top: 300, originX: 0.5, originY: 0 }} width="60" height="300" animate={{ rotate: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity }}>
          <line x1="30" y1="0" x2="30" y2="240" stroke="#3a7a4a" strokeWidth="4" />
          <ellipse cx="30" cy="260" rx="22" ry="34" fill="#4aa86a" />
        </motion.svg>
      ) : (
        <>
          <svg className="absolute overflow-visible" style={{ left: 790, top: 300 }} width="60" height="300">
            <line x1="30" y1="0" x2="30" y2="160" stroke="#3a7a4a" strokeWidth="4" />
          </svg>
          <motion.svg key={`lf${k}`} className="absolute overflow-visible" style={{ left: 798, top: 500 }} width="60" height="80" initial={{ y: 0, rotate: 0 }} animate={{ y: 280, rotate: 160, x: [0, 30, -20, 10] }} transition={{ duration: 2.2, delay: 0.6, ease: "easeIn" }}>
            <ellipse cx="22" cy="40" rx="22" ry="34" fill="#4aa86a" />
          </motion.svg>
        </>
      )}

      <GreenhouseClock />
      {/* Sulama kabıyla sukulentleri sulayan */}
      <Actor x={540} y={790} size={96} look={look({ shape: "sphere", head: "sprout" })} color="#16C47F" flip expression="happy" move={breathe(3)} act={on(beat, 0, { animate: { rotate: [0, -10, -10, 0] }, transition: { duration: 2.4 } })} actKey={k} front={<WateringCan pour={beat.i === 0} k={k} />} />
      {/* Hasır şapkalı, bahçe makaslı */}
      <Actor x={720} y={800} size={104} look={look({ shape: "egg", head: "straw" })} color="#FFD21F" expression={beat.i === 1 ? "surprised" : "focused"} move={sway(3.4, 2)} act={on(beat, 1, hop(12))} actKey={k} front={<><Shears k={beat.i === 1 ? k : 0} /></>} />
      {/* Saksıya oturup bitki gibi güneşe uzanan */}
      <Actor morph={beat.n[2]} morphDelay={900} x={1040} y={742} size={90} look={look({ shape: "flower", head: "flower" })} color="#FF9EC4" expression={beat.i === 2 ? "love" : "sleepy"} move={{ animate: { scaleY: [1, 1.08, 1], rotate: [8, 12, 8] }, transition: { duration: 5, repeat: Infinity, ease: "easeInOut" } }} act={on(beat, 2, { animate: { y: [0, -30, -30, 0] }, transition: { duration: 2.6, times: [0, 0.3, 0.7, 1] } })} actKey={k} />
      <svg className="absolute overflow-visible" style={{ left: 980, top: 730 }} width="120" height="80">
        <path d="M0 0 h120 l-14 70 h-92 Z" fill="#c8693a" />
        <rect x="-6" y="-8" width="132" height="18" rx="4" fill="#d97a48" />
      </svg>
      {/* Toprakla oynarken yüzü gözü çamur olan */}
      <Actor morph={beat.n[3]} morphDelay={500} x={1340} y={800} size={94} look={look({ shape: "bear" })} color="#FFE3A8" expression={beat.i === 3 ? "giggle" : "happy"} move={{ animate: { rotate: [-3, 3, -3] }, transition: { duration: 1.2, repeat: Infinity } }} act={on(beat, 3, hop(14))} actKey={k} front={<Mud />} />
      {beat.i === 3 &&
        Array.from({ length: 8 }, (_, i) => (
          <motion.span key={`d${i}${k}`} className="absolute rounded-full bg-[#5a3a22]" style={{ left: 1360, top: 780, width: 8 + (i % 3) * 4, height: 8 + (i % 3) * 4 }} animate={{ x: Math.cos(i * 0.8 + 3.6) * 120, y: [0, -80 - (i % 3) * 30, 20], opacity: [1, 1, 0] }} transition={{ duration: 1.1, delay: 0.3 }} />
        ))}
    </Stage>
  );
}

function WateringCan({ pour, k }: { pour: boolean; k: number }) {
  return (
    <g>
      <motion.g key={k} style={{ transformOrigin: "28px 18px" }} animate={pour ? { rotate: [0, 25, 25, 0] } : { rotate: [0, 6, 0] }} transition={pour ? { duration: 2.4 } : { duration: 2, repeat: Infinity }}>
        <path d="M22 14 h11 v9 a2 2 0 0 1 -2 2 h-7 a2 2 0 0 1 -2 -2 Z" fill="#3fbf6a" />
        <path d="M33 16 L42 10 L43 12 L34 19 Z" fill="#2fa85a" />
        <ellipse cx="42.6" cy="10.6" rx="1.6" ry="2.4" fill="#2fa85a" transform="rotate(-30 42.6 10.6)" />
        <path d="M24 14 q4.5 -6 9 0" stroke="#2fa85a" strokeWidth="1.4" fill="none" />
        <Hand x={27} y={13} />
        <Hand x={23} y={22} />
      </motion.g>
      {pour &&
        [0, 1, 2, 3].map((i) => (
          <motion.circle key={`${k}${i}`} cx={44 + i} cy={14} r="0.8" fill="#8fd8ff" animate={{ y: [0, 14], opacity: [1, 0] }} transition={{ duration: 0.6, repeat: 3, delay: 0.5 + i * 0.15 }} />
        ))}
    </g>
  );
}

function Shears({ k }: { k: number }) {
  return (
    <g>
      <motion.g key={k} style={{ transformOrigin: "30px 8px" }} animate={k ? { rotate: [0, -20, 0, -20, 0] } : {}} transition={{ duration: 1.2 }}>
        <path d="M30 8 L38 -8" stroke="#9aa3b0" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M30 8 L41 -4" stroke="#c0c8d4" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="26" y="7" width="5" height="9" rx="2" fill="#c0392b" transform="rotate(-20 28 10)" />
        <Hand x={28} y={14} />
      </motion.g>
      <Hand x={-4} y={20} />
    </g>
  );
}

function Mud() {
  return (
    <g>
      {[[6, 4, 2.6], [18, 16, 3.2], [9, 19, 2], [20, 6, 1.6], [3, 14, 1.4]].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx={r * 1.3} ry={r} fill="#5a3a22" opacity="0.75" />
      ))}
      <motion.g animate={{ y: [0, 2, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>
        <Hand x={-4} y={24} />
        <Hand x={28} y={24} />
      </motion.g>
    </g>
  );
}

// ------------------------------------------------------------------ 14. Gece treni kompartımanı

export function Train() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage medium="sketch" clock="st-riso"
      sky="#2a1414"
      lights={[
        { x: 790, y: 520, r: 420, color: "rgba(255,190,110,0.6)", opacity: 0.6, flicker: 0.1 },
        { x: 780, y: 300, r: 500, color: "rgba(140,160,255,0.25)", opacity: 0.45 },
        { x: 1240, y: 260, r: 160, color: "rgba(255,200,120,0.45)", opacity: 0.4 },
      ]}
    >
      {/* Pencereden akan gece */}
      <div className="absolute overflow-hidden rounded-[30px]" style={{ left: 380, top: 110, width: 800, height: 400, background: "linear-gradient(180deg, #0a0f2a 0%, #1a2050 70%, #2a2a5a 100%)" }}>
        <Stars count={40} maxY={300} />
        <svg className="absolute" style={{ left: 600, top: 40 }} width="60" height="60">
          <circle cx="30" cy="30" r="24" fill="#f4eccf" />
        </svg>
        {/* Tepeler: iki kat, ikisi de sola kayar */}
        {[{ y: 250, c: "#141a3a", d: 30 }, { y: 300, c: "#0c1028", d: 14 }].map((h, i) => (
          <motion.svg key={i} className="absolute" style={{ left: 0, top: h.y }} width="1600" height="200" animate={{ x: [0, -800] }} transition={{ duration: h.d, repeat: Infinity, ease: "linear" }}>
            <path d={`M0 200 ${Array.from({ length: 9 }, (_, j) => `Q ${j * 200 + 100} ${i ? 40 : 10} ${(j + 1) * 200} ${i ? 80 : 60}`).join(" ")} L1800 200 Z`} fill={h.c} />
          </motion.svg>
        ))}
        {/* Geçen sokak lambaları */}
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="absolute" style={{ top: 160, left: 0 }} initial={{ x: 900 }} animate={{ x: [900, -100] }} transition={{ duration: 3.4, repeat: Infinity, ease: "linear", delay: i * 1.15 }}>
            <span className="absolute left-[18px] top-[20px] h-[240px] w-[6px] bg-[#05060f]" />
            <span className="absolute left-0 top-0 h-[40px] w-[40px] rounded-full" style={{ background: "radial-gradient(circle, #ffe2a0, rgba(255,200,100,0))" }} />
          </motion.div>
        ))}
      </div>
      {/* Tren ritmiyle hafif sallanan kompartıman */}
      <motion.div className="absolute inset-0" animate={{ y: [0, 2, 0, 1, 0] }} transition={{ duration: 0.9, repeat: Infinity }}>
        <Painted look="riso" seed={510}>
          {/* Ahşap duvar, pencere çerçevesi */}
          <defs>
            <linearGradient id="tr-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4a2018" />
              <stop offset="0.5" stopColor="#6a3226" />
              <stop offset="1" stopColor="#3a1810" />
            </linearGradient>
            <linearGradient id="tr-velvet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#a8303c" />
              <stop offset="1" stopColor="#5a1520" />
            </linearGradient>
            <linearGradient id="tr-brass" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#8a6a2a" />
              <stop offset="0.5" stopColor="#f0d48a" />
              <stop offset="1" stopColor="#8a6a2a" />
            </linearGradient>
          </defs>
          <path d={`M0 0 H${W} V900 H0 Z M410 110 h740 q30 0 30 30 v340 q0 30 -30 30 h-740 q-30 0 -30 -30 v-340 q0 -30 30 -30 Z`} fill="url(#tr-wall)" fillRule="evenodd" />
          {/* Pirinç bagaj rafı ve duvar aplikleri */}
          {[[80, 470], [1010, 230]].map(([x, w], i) => (
            <g key={`rk${i}`}>
              <rect x={x} y="60" width={w} height="8" rx="4" fill="url(#tr-brass)" />
              <rect x={x} y="84" width={w} height="6" rx="3" fill="url(#tr-brass)" />
              {Array.from({ length: Math.floor(w / 40) }, (_, j) => (
                <line key={j} x1={x + 20 + j * 40} y1="64" x2={x + 20 + j * 40} y2="88" stroke="#c9a24a" strokeWidth="2" />
              ))}
            </g>
          ))}
          <g>
            <rect x="140" y="20" width="120" height="44" rx="8" fill="#6a4a2a" />
            <rect x="160" y="28" width="40" height="30" rx="4" fill="#3a5a8a" />
          </g>
          {[[1240, 230]].map(([x, y], i) => (
            <g key={`sc${i}`}>
              <rect x={x - 6} y={y + 10} width="12" height="30" fill="url(#tr-brass)" />
              <path d={`M${x - 22} ${y + 10} h44 l-8 -34 h-28 Z`} fill="#ffe6b0" />
              <circle cx={x} cy={y - 6} r="30" fill="#ffd27a" opacity="0.3" filter="url(#nk-blur-s)" />
            </g>
          ))}
          {Array.from({ length: 9 }, (_, i) => {
            const y = 60 + i * 100;
            const win = y > 100 && y < 520;
            return <path key={i} d={win ? `M0 ${y} H370 M1190 ${y} H${W}` : `M0 ${y} H${W}`} stroke="#4a2018" strokeWidth="3" opacity="0.6" />;
          })}
          <rect x="370" y="100" width="820" height="420" rx="36" fill="none" stroke="#c99a5a" strokeWidth="12" />
          {/* Art Deco: pencerenin çevresinde basamaklı altın çerçeve, köşelerde yelpazeler, altta şerit friz */}
          <rect x="356" y="86" width="848" height="448" rx="44" fill="none" stroke="#d4a43a" strokeWidth="4" />
          <rect x="344" y="74" width="872" height="472" rx="52" fill="none" stroke="#8a6418" strokeWidth="3" />
          {[[376, 106, 1], [1184, 106, -1]].map(([x, y, d], i) => (
            <g key={`fan${i}`}>
              {Array.from({ length: 7 }, (_, j) => {
                const a = (j / 6) * (Math.PI / 2);
                return <line key={j} x1={x} y1={y} x2={x + d * Math.cos(a) * 70} y2={y + Math.sin(a) * 70} stroke="#f0d48a" strokeWidth="3" />;
              })}
              <path d={`M${x} ${y} m ${d * 70} 0 a70 70 0 0 ${d > 0 ? 1 : 0} ${-d * 70} 70`} fill="none" stroke="#f0d48a" strokeWidth="3" />
            </g>
          ))}
          {Array.from({ length: 28 }, (_, i) => (
            <path key={`chev${i}`} d={`M${372 + i * 29} 548 l 14 -12 l 14 12`} fill="none" stroke="#d4a43a" strokeWidth="3" />
          ))}
          {[[60, 300], [1210, 300]].map(([x, y], i) => (
            <g key={`dp${i}`}>
              <rect x={x} y={y} width={i ? 70 : 280} height="140" fill="#4a1a14" stroke="#d4a43a" strokeWidth="3" />
              {Array.from({ length: i ? 3 : 9 }, (_, j) => (
                <path key={j} d={`M${x + 16 + j * 30} ${y + 130} L${x + 16 + j * 30} ${y + 50} L${x + 30 + j * 30} ${y + 24} L${x + 44 + j * 30} ${y + 50} L${x + 44 + j * 30} ${y + 130}`} fill="none" stroke="#b8862a" strokeWidth="2" />
              ))}
            </g>
          ))}
          {/* Perde */}
          <path d="M360 90 q40 200 10 440 h60 q-20 -240 -10 -440 Z" fill="#7a2030" />
          <path d="M1200 90 q-40 200 -10 440 h-60 q20 -240 10 -440 Z" fill="#7a2030" />
          {/* Masa */}
          <rect x="650" y="560" width="280" height="22" rx="6" fill="#8a5a34" />
          <rect x="780" y="580" width="20" height="160" fill="#6b4226" />
          {/* Kadife koltuklar */}
          <rect x="90" y="470" width="420" height="300" rx="40" fill="url(#tr-velvet)" />
          <rect x="80" y="700" width="460" height="100" rx="30" fill="#8a2a34" />
          <rect x="80" y="700" width="460" height="14" rx="7" fill="#c04050" opacity="0.6" />
          <rect x="1010" y="470" width="240" height="300" rx="40" fill="url(#tr-velvet)" />
          <rect x="980" y="700" width="290" height="100" rx="30" fill="#8a2a34" />
          <rect x="980" y="700" width="290" height="14" rx="7" fill="#c04050" opacity="0.6" />
          {/* Kapitone düğmeler ve dikiş çizgileri */}
          {[150, 250, 350, 450, 1070, 1180].map((x) => (
            <g key={x}>
              <circle cx={x} cy="560" r="5" fill="#5a1520" />
              <circle cx={x} cy="640" r="5" fill="#5a1520" />
              <path d={`M${x} 565 L${x} 635`} stroke="#5a1520" strokeWidth="2" opacity="0.5" />
            </g>
          ))}
          <rect x="650" y="582" width="280" height="8" fill="#000" opacity="0.3" />
          {/* Kompartıman kapısı ve koridor */}
          <rect x="1290" y="120" width="300" height="780" fill="#3a1a14" />
          <rect x="1300" y="140" width="280" height="760" fill="#c9a77a" />
          <rect x="1300" y="140" width="280" height="300" fill="#2a2a50" />
          <rect x="1300" y="820" width="280" height="80" fill="#6b2a2a" />
          <rect x="1280" y="120" width="14" height="780" fill="#c99a5a" />
          {/* Zemin */}
          <rect x="0" y="790" width="1290" height="110" fill="#3a1a14" />
        </Painted>
        {/* Masadaki abajur, ritimle sallanır */}
        <motion.svg className="absolute overflow-visible" style={{ left: 880, top: 470, originX: 0.5, originY: 1 }} width="60" height="92" animate={{ rotate: [-3, 3, -3] }} transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}>
          <rect x="27" y="40" width="6" height="48" fill="#c99a5a" />
          <ellipse cx="30" cy="90" rx="16" ry="4" fill="#a8803a" />
          <path d="M8 44 L16 10 h28 L52 44 Z" fill="#f0c27a" />
          <ellipse cx="30" cy="50" rx="50" ry="40" fill="url(#nk-glow)" opacity="0.6" />
        </motion.svg>

        <TrainClock />
        {/* Battaniyesine sarınmış, koltukta kıvrılıp uyuyan */}
        <Actor x={220} y={714} size={100} look={look({ shape: "cloud" })} color="#9B7BFF" expression="sleepy" move={breathe(4.5, 2)} act={on(beat, 2, { animate: { rotate: [0, 8, 0] }, transition: { duration: 2 } })} actKey={k} front={<Blanket />} />
        {/* Cama yapışmış, geçen lambaları izleyen */}
        <Actor morph={beat.n[0]} morphDelay={200} x={455} y={712} size={92} look={look({ shape: "sphere" })} color="#FFD21F" flip expression={beat.i === 0 ? "surprised" : "happy"} move={{ animate: { x: [0, -3, 0] }, transition: { duration: 1.15, repeat: Infinity } }} act={on(beat, 0, hop(12))} actKey={k} front={<><Hand x={28} y={8} /><Hand x={29} y={16} /></>} />
        {/* Çay bardağını sallantıda devirmemek için iki eliyle tutan */}
        <Actor x={1110} y={712} size={96} look={look({ shape: "bean", neck: "bowtie" })} color="#2FD4C0" expression={beat.i === 3 ? "surprised" : "focused"} move={breathe(3)} act={on(beat, 3, { animate: { x: [0, -10, 8, -4, 0], rotate: [0, -6, 6, 0] }, transition: { duration: 1.2 } })} actKey={k} front={<TeaGlass slosh={beat.i === 3} k={k} />} />
        {/* Koridordaki kondüktör */}
        <Actor x={1440} y={830} size={108} look={look({ shape: "egg", head: "conductor" })} color="#F4F4F6" flip expression={beat.i === 1 ? "happy" : "idle"} move={breathe(3.2)} act={on(beat, 1, hop(10))} actKey={k} front={<><TicketPunch k={beat.i === 1 ? k : 0} /></>} />
      </motion.div>
    </Stage>
  );
}

function Blanket() {
  return (
    <g>
      <path d="M-6 16 Q 12 12 30 16 L31 29 Q 12 32 -7 29 Z" fill="#c0392b" />
      {[-2, 4, 10, 16, 22, 28].map((x) => (
        <line key={x} x1={x} y1="14" x2={x} y2="30" stroke="#1f3a6a" strokeWidth="1.6" opacity="0.7" />
      ))}
      {[19, 23, 27].map((y) => (
        <line key={y} x1="-6" y1={y} x2="30" y2={y} stroke="#f1c40f" strokeWidth="0.8" opacity="0.7" />
      ))}
    </g>
  );
}

function TeaGlass({ slosh, k }: { slosh: boolean; k: number }) {
  return (
    <g>
      <ellipse cx="12" cy="27.5" rx="7" ry="1.6" fill="#e8e8f0" />
      <path d="M8.4 14 Q 7 19 9 22 Q 7.6 25 9 27 h6 q1.4 -2 0 -5 q2 -3 0.6 -8 Z" fill="rgba(255,255,255,0.35)" stroke="#fff" strokeWidth="0.5" />
      <motion.path key={k} d="M8.8 17 Q 7.6 20 9 22 Q 7.6 25 9 27 h6 q1.4 -2 0 -5 q1.4 -2 0.2 -5 Z" fill="#c0391b" style={{ transformOrigin: "12px 22px" }} animate={slosh ? { rotate: [0, -14, 12, -6, 0] } : { rotate: [-3, 3, -3] }} transition={slosh ? { duration: 1.2 } : { duration: 0.9, repeat: Infinity }} />
      <Hand x={7} y={22} />
      <Hand x={17} y={22} />
    </g>
  );
}

function TicketPunch({ k }: { k: number }) {
  return (
    <g>
      <motion.g key={k} animate={k ? { rotate: [0, -15, 0, -15, 0] } : {}} style={{ transformOrigin: "-4px 18px" }} transition={{ duration: 1 }}>
        <path d="M-4 18 L-12 10 M-4 18 L-13 14" stroke="#9aa3b0" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="-15" y="8" width="7" height="4.4" rx="0.6" fill="#f3e6c4" stroke="#b89a5a" strokeWidth="0.3" />
        <Hand x={-4} y={18} />
      </motion.g>
      {k > 0 && <motion.circle key={`c${k}`} cx="-12" cy="10" r="0.7" fill="#f3e6c4" animate={{ y: [0, 14], opacity: [1, 0] }} transition={{ duration: 0.8, delay: 0.3 }} />}
      <Hand x={28} y={20} />
    </g>
  );
}

// ------------------------------------------------------------------ 15. Gece yarısı sineması

export function Cinema() {
  const beat = useBeat(4);
  const k = beat.k;
  // Kadife koltuk: yumuşak ışıklı sırt, kapitone dikişler, altın başlıklı kolçaklar (3B film görünümü)
  const seat = (x: number, y: number, s = 1) => (
    <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <radialGradient id="cn-back" cx="40%" cy="22%" r="85%">
          <stop offset="0" stopColor="#f0606e" />
          <stop offset="0.45" stopColor="#b82634" />
          <stop offset="1" stopColor="#5a0e18" />
        </radialGradient>
        <linearGradient id="cn-arm" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a0e14" />
          <stop offset="0.5" stopColor="#5a1a24" />
          <stop offset="1" stopColor="#2a0e14" />
        </linearGradient>
        <linearGradient id="cn-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff0b0" />
          <stop offset="0.5" stopColor="#d4a43a" />
          <stop offset="1" stopColor="#8a6418" />
        </linearGradient>
      </defs>
      <ellipse cx="0" cy="24" rx="100" ry="14" fill="#000" opacity="0.5" />
      <rect x="-80" y="-150" width="160" height="172" rx="44" fill="url(#cn-back)" />
      {[-40, 0, 40].map((dx) => (
        <path key={dx} d={`M${dx} -130 v120`} stroke="#6a1420" strokeWidth="3" opacity="0.55" />
      ))}
      {[-20, 20].map((dx) => [-90, -50].map((dy) => <circle key={`${dx}${dy}`} cx={dx} cy={dy} r="4" fill="#6a1420" />))}
      <ellipse cx="-20" cy="-128" rx="44" ry="12" fill="#fff" opacity="0.28" />
      <rect x="-98" y="-40" width="24" height="66" rx="10" fill="url(#cn-arm)" />
      <rect x="74" y="-40" width="24" height="66" rx="10" fill="url(#cn-arm)" />
      <rect x="-100" y="-46" width="28" height="12" rx="6" fill="url(#cn-gold)" />
      <rect x="72" y="-46" width="28" height="12" rx="6" fill="url(#cn-gold)" />
    </g>
  );
  return (
    <Stage clock="st-soft3d"
      sky="radial-gradient(120% 90% at 50% 0%, #2a1630 0%, #120a18 55%, #07050a 100%)"
      lights={[
        { x: 800, y: 900, r: 800, color: "rgba(140,190,255,0.35)", opacity: 0.5, flicker: 0.3 },
        { x: 800, y: 65, r: 160, color: "rgba(255,240,200,0.6)", opacity: 0.6 },
        { x: 1280, y: 70, r: 120, color: "rgba(80,255,140,0.5)", opacity: 0.5 },
      ]}
    >
      {/* Perdeden yüzlere vuran titrek ışık */}
      <motion.div className="absolute inset-0" style={{ background: "radial-gradient(80% 60% at 50% 100%, rgba(140,190,255,0.22), rgba(140,190,255,0))" }} animate={{ opacity: beat.i === 2 ? [0.6, 1.4, 0.4, 1.2, 0.8] : [0.6, 0.9, 0.7, 1, 0.6] }} transition={{ duration: beat.i === 2 ? 1.4 : 3, repeat: Infinity }} />
      <Painted look="puff" seed={589}>
        <defs>
          <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dfe9ff" stopOpacity="0.45" />
            <stop offset="1" stopColor="#dfe9ff" stopOpacity="0" />
          </linearGradient>
        </defs>
          <defs>
            <linearGradient id="cn-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2a1432" />
              <stop offset="1" stopColor="#14081a" />
            </linearGradient>
            <linearGradient id="cn-drape" x1="0" y1="0" x2="54" y2="0" spreadMethod="repeat" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#5a0e1a" />
              <stop offset="0.35" stopColor="#c02a3a" />
              <stop offset="0.55" stopColor="#e0485a" />
              <stop offset="1" stopColor="#5a0e1a" />
            </linearGradient>
            <linearGradient id="cn-trim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff2b8" />
              <stop offset="0.5" stopColor="#d4a43a" />
              <stop offset="1" stopColor="#7a5418" />
            </linearGradient>
            <radialGradient id="cn-sconce" cx="50%" cy="30%" r="70%">
              <stop offset="0" stopColor="#fff6d0" />
              <stop offset="0.5" stopColor="#ffc860" />
              <stop offset="1" stopColor="#b8742a" />
            </radialGradient>
          </defs>
          {/* Arka duvar: koyu kadife, altın çerçeveli kemer */}
          <rect x="0" y="0" width={W} height="360" fill="url(#cn-wall)" />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={i * 140 + 20} y="0" width="60" height="360" rx="8" fill="#2c1636" />
          ))}
          <path d="M150 360 V120 Q 800 -40 1450 120 V360" fill="none" stroke="url(#cn-trim)" strokeWidth="14" />
          {/* Yanlarda büzgülü kadife perdeler ve altın bağcıklar */}
          <path d="M0 0 H260 Q 230 180 300 360 H0 Z" fill="url(#cn-drape)" />
          <path d="M1600 0 H1340 Q 1370 180 1300 360 H1600 Z" fill="url(#cn-drape)" />
          <path d="M0 0 H1600 V44 Q 1400 76 1200 44 Q 1000 76 800 44 Q 600 76 400 44 Q 200 76 0 44 Z" fill="url(#cn-drape)" />
          <rect x="0" y="40" width={W} height="10" fill="url(#cn-trim)" />
          <ellipse cx="252" cy="250" rx="20" ry="12" fill="url(#cn-trim)" />
          <ellipse cx="1348" cy="250" rx="20" ry="12" fill="url(#cn-trim)" />
          {/* Duvar aplikleri: altın kubbe, sıcak ışık */}
          {[620, 980, 1180, 420].map((x) => (
            <g key={`lm${x}`}>
              <ellipse cx={x} cy="200" rx="46" ry="56" fill="#ffb84a" opacity="0.22" filter="url(#nk-blur-s)" />
              <path d={`M${x - 20} 214 Q ${x} 170 ${x + 20} 214 Z`} fill="url(#cn-sconce)" />
              <rect x={x - 22} y="212" width="44" height="8" rx="4" fill="url(#cn-trim)" />
            </g>
          ))}
          {/* Basamak ışıkları */}
          {[300, 1300].map((x) => (
            <g key={`st${x}`}>
              {[600, 680, 760, 840].map((y) => (
                <rect key={y} x={x - 14} y={y} width="28" height="6" rx="3" fill="#ffd27a" opacity="0.85" />
              ))}
            </g>
          ))}
          {/* Çıkış levhası */}
          <rect x="1240" y="56" width="80" height="28" rx="4" fill="#0a2a14" stroke="#3aff7a" strokeWidth="2" />
          <text x="1280" y="76" textAnchor="middle" fontSize="16" fontWeight="800" fill="#5aff8a" fontFamily="system-ui">ÇIKIŞ</text>
          <rect x="752" y="34" width="96" height="62" rx="8" fill="#1a0e1e" />
          <rect x="760" y="40" width="80" height="50" rx="6" fill="#ffe6c0" filter="url(#nk-bloom)" />
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dfe9ff" stopOpacity="0.45" />
            <stop offset="1" stopColor="#dfe9ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.polygon points="770,70 830,70 1250,900 350,900" fill="url(#beam)" animate={{ opacity: [0.5, 0.75, 0.55, 0.8, 0.5] }} transition={{ duration: 2.4, repeat: Infinity }} />
      </Layer>
      <Painted look="puff" seed={589}>
        <defs>
          <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dfe9ff" stopOpacity="0.45" />
            <stop offset="1" stopColor="#dfe9ff" stopOpacity="0" />
          </linearGradient>
        </defs>
          {/* Arka sıralar */}
          {[240, 400, 560, 720, 880, 1040, 1200, 1360].map((x) => seat(x, 420, 0.7))}
      </Painted>
      {/* Hüzmede uçuşan toz */}
      <Drift count={22} from={120} to={700} dur={[10, 18]} xs={[640, 960]} sway={60} render={() => <span className="block h-1.5 w-1.5 rounded-full bg-white/60" />} />

      <CinemaClock />
      {/* Arka sırada, öndeki koltuğun arkasından başını uzatan */}
      <Actor x={1000} y={beat.i === 2 ? 600 : 640} size={88} look={look({ shape: "cat" })} color="#FF8A1F" expression={beat.i === 2 ? "surprised" : "focused"} move={{ animate: { y: [0, -6, 0] }, transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } }} front={<><Hand x={0} y={22} /><Hand x={24} y={22} /></>} />
      <Layer>{[360, 600, 840, 1080, 1320].map((x) => seat(x, 700))}</Layer>
      {/* Mısır kovasına gömülmüş, 3D gözlüklü */}
      <Actor morph={beat.n[0]} morphDelay={300} x={360} y={720} size={100} look={look({ shape: "sphere" })} color="#2B8CFF" expression={beat.i === 0 ? "happy" : "focused"} move={breathe(3)} act={on(beat, 0, hop(14))} actKey={k} front={<Popcorn k={beat.i === 0 ? k : 0} />} />
      {/* Pipetle içeceğini hüpürdeten */}
      <Actor x={600} y={720} size={96} look={look({ shape: "bean" })} color="#16C47F" expression="focused" move={breathe(3.4)} act={on(beat, 1, { animate: { scaleX: [1, 0.92, 1.04, 1], scaleY: [1, 1.06, 0.97, 1] }, transition: { duration: 1 } })} actKey={k} front={<Soda k={beat.i === 1 ? k : 0} />} />
      {/* Seans başlamadan uyuyakalan */}
      <Actor x={1320} y={720} size={96} look={look({ shape: "cloud", texture: "plush" })} color="#FF9EC4" expression="sleepy" move={{ animate: { rotate: [12, 16, 12] }, transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } }} act={on(beat, 3, { animate: { rotate: [0, -16, 0] }, transition: { duration: 1.6 } })} actKey={k} />
      {/* Kol dayama ve koltuk önleri */}
      <Painted look="puff" seed={589}>
          {[240, 480, 720, 960, 1200, 1440].map((x) => (
            <rect key={x} x={x - 14} y="660" width="28" height="80" rx="10" fill="#5a1018" />
          ))}
          <rect x="0" y="740" width={W} height="160" fill="#0a0608" />
          {[360, 600, 840, 1080, 1320].map((x) => (
            <rect key={x} x={x - 90} y="720" width="180" height="40" rx="16" fill="#6a121c" />
          ))}
      </Painted>
    </Stage>
  );
}

function Popcorn({ k }: { k: number }) {
  return (
    <g>
      <path d="M-6 12 h36 l-4 22 h-28 Z" fill="#fff" />
      {[-2, 6, 14, 22].map((x) => (
        <path key={x} d={`M${x} 12 h4 l-0.8 22 h-3.4 Z`} fill="#e0303a" />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} cx={-4 + i * 4} cy={11 - (i % 3) * 1.4} r="2.6" fill="#fff4cf" stroke="#f0d27a" strokeWidth="0.4" />
      ))}
      {/* 3D gözlük: kırmızı-camgöbeği */}
      <rect x="1" y="6" width="9" height="6" rx="1.6" fill="rgba(255,60,80,0.55)" stroke="#fff" strokeWidth="1" />
      <rect x="14" y="6" width="9" height="6" rx="1.6" fill="rgba(0,220,255,0.55)" stroke="#fff" strokeWidth="1" />
      <line x1="10" y1="8.4" x2="14" y2="8.4" stroke="#fff" strokeWidth="1" />
      {k > 0 &&
        [0, 1, 2].map((i) => (
          <motion.circle key={`${k}${i}`} cx={6 + i * 6} cy={8} r="2" fill="#fff4cf" animate={{ y: [0, -14, 6], x: (i - 1) * 6, opacity: [1, 1, 0] }} transition={{ duration: 1 }} />
        ))}
      <Hand x={-7} y={18} />
      <Hand x={31} y={18} />
    </g>
  );
}

function Soda({ k }: { k: number }) {
  return (
    <g>
      <path d="M22 14 h10 l-1.6 14 h-6.8 Z" fill="#e0303a" />
      <rect x="21.4" y="12.6" width="11.2" height="2" rx="1" fill="#fff" />
      <path d="M27 12.6 L26 4 L15 15" stroke="#fff" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <motion.circle key={k} cx="27" cy="22" r="0.8" fill="#fff" animate={{ y: [0, -8], opacity: [0.9, 0] }} transition={{ duration: 0.6, repeat: k ? 4 : Infinity, repeatDelay: k ? 0 : 1.4 }} />
      <Hand x={23} y={22} />
      <Hand x={31} y={20} />
    </g>
  );
}

// ------------------------------------------------------------------ 16. Vahşi Batı kasabası

export function Western() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage medium="sketch" clock="st-riso"
      sky="linear-gradient(180deg, #2e1640 0%, #8a2e4a 30%, #e05a3a 56%, #f7b45a 78%, #ffd88a 100%)"
      lights={[{ x: 900, y: 600, r: 800, color: "rgba(255,150,80,0.5)", opacity: 0.55 }]}
    >
      <Painted look="riso" seed={744}>
        <defs>
          <radialGradient id="ws-sun" cx="50%" cy="45%" r="55%">
            <stop offset="0" stopColor="#fff0b0" />
            <stop offset="0.5" stopColor="#ff8a3a" />
            <stop offset="1" stopColor="#ff4a2a" />
          </radialGradient>
          <linearGradient id="ws-mesa" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5a2238" />
            <stop offset="0.6" stopColor="#8a3a44" />
            <stop offset="1" stopColor="#c45a44" />
          </linearGradient>
          <linearGradient id="ws-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d8904e" />
            <stop offset="1" stopColor="#b06a34" />
          </linearGradient>
          <linearGradient id="ws-plank" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6a4022" />
            <stop offset="0.7" stopColor="#9a6a3e" />
            <stop offset="1" stopColor="#c48a52" />
          </linearGradient>
          <linearGradient id="ws-cactus" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2a5a34" />
            <stop offset="0.6" stopColor="#4a8a52" />
            <stop offset="1" stopColor="#7aa85a" />
          </linearGradient>
        </defs>
        {/* Uzun, ince bulut şeritleri */}
        {[[200, 140, 420], [900, 220, 520], [1200, 110, 360]].map(([x, y, w], i) => (
          <ellipse key={i} cx={x} cy={y} rx={w / 2} ry="10" fill="#ffb0a0" opacity="0.35" />
        ))}
        {/* Poster güneşi: arkadan açılan ışın dilimleri ve gökte kalın renk bantları */}
        {Array.from({ length: 22 }, (_, i) => {
          const a0 = Math.PI + (i / 22) * Math.PI;
          const a1 = a0 + Math.PI / 44;
          return i % 2 ? null : <polygon key={`ray${i}`} points={`900,600 ${900 + Math.cos(a0) * 1300},${600 + Math.sin(a0) * 1300} ${900 + Math.cos(a1) * 1300},${600 + Math.sin(a1) * 1300}`} fill="#ffd27a" opacity="0.22" />;
        })}
        {[[60, "#3a1a4a"], [150, "#6a2448"], [250, "#a8384a"], [360, "#d85a3a"]].map(([y, c], i) => (
          <rect key={`band${i}`} x="0" y={y as number} width={W} height="14" fill={c as string} opacity="0.35" />
        ))}
        {/* Batan dev kızıl güneş: hale ve ısı titreşimi */}
        <circle cx="900" cy="600" r="380" fill="#ffb05a" opacity="0.2" filter="url(#nk-blur)" />
        <circle cx="900" cy="600" r="230" fill="url(#ws-sun)" />
        {[560, 590, 615].map((y, i) => (
          <rect key={y} x="660" y={y} width="480" height={6 - i} fill="#e86a3a" opacity="0.35" />
        ))}
        {/* Uzak mesalar: sisli */}
        <path d="M1300 640 v-40 l20 -30 h120 l20 30 v40 Z M80 640 v-50 l30 -20 h100 l20 20 v50 Z" fill="#a84a50" opacity="0.6" />
        {/* Kayalık tepeler (mesa): güneşe bakan yüz aydınlık */}
        <path d="M700 640 v-90 h40 l20 -40 h170 l20 40 h30 v90 Z" fill="url(#ws-mesa)" />
        <path d="M1150 640 v-60 l30 -30 h160 l30 30 v60 Z" fill="url(#ws-mesa)" />
        <path d="M0 650 Q 400 620 800 645 T 1600 640 L1600 900 L0 900 Z" fill="url(#ws-sand)" />
        <path d="M0 720 Q 500 700 900 725 T 1600 715 L1600 900 L0 900 Z" fill="#d9965a" />
        {Array.from({ length: 30 }, (_, i) => (
          <ellipse key={`pb${i}`} cx={(i * 113) % W} cy={740 + ((i * 47) % 150)} rx={3 + (i % 3)} ry="2" fill="#8a5a2a" opacity="0.5" />
        ))}
      </Painted>
      <Layer>
        <defs>
          <radialGradient id="ws-sun" cx="50%" cy="45%" r="55%">
            <stop offset="0" stopColor="#fff0b0" />
            <stop offset="0.5" stopColor="#ff8a3a" />
            <stop offset="1" stopColor="#ff4a2a" />
          </radialGradient>
          <linearGradient id="ws-mesa" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5a2238" />
            <stop offset="0.6" stopColor="#8a3a44" />
            <stop offset="1" stopColor="#c45a44" />
          </linearGradient>
          <linearGradient id="ws-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d8904e" />
            <stop offset="1" stopColor="#b06a34" />
          </linearGradient>
          <linearGradient id="ws-plank" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6a4022" />
            <stop offset="0.7" stopColor="#9a6a3e" />
            <stop offset="1" stopColor="#c48a52" />
          </linearGradient>
          <linearGradient id="ws-cactus" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2a5a34" />
            <stop offset="0.6" stopColor="#4a8a52" />
            <stop offset="1" stopColor="#7aa85a" />
          </linearGradient>
        </defs>
        {/* Akbabalar */}
        {[0, 1].map((i) => (
          <motion.path key={`v${i}`} d="M0 0 q 12 -10 24 0 q 12 -10 24 0" stroke="#3a1a2a" strokeWidth="3" fill="none" initial={{ x: 1100 + i * 90, y: 240 + i * 30 }} animate={{ x: [1100 + i * 90, 1180 + i * 90, 1100 + i * 90], y: [240 + i * 30, 220 + i * 30, 240 + i * 30] }} transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut" }} />
        ))}
      </Layer>
      <Painted look="riso" seed={744}>
        <defs>
          <radialGradient id="ws-sun" cx="50%" cy="45%" r="55%">
            <stop offset="0" stopColor="#fff0b0" />
            <stop offset="0.5" stopColor="#ff8a3a" />
            <stop offset="1" stopColor="#ff4a2a" />
          </radialGradient>
          <linearGradient id="ws-mesa" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5a2238" />
            <stop offset="0.6" stopColor="#8a3a44" />
            <stop offset="1" stopColor="#c45a44" />
          </linearGradient>
          <linearGradient id="ws-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d8904e" />
            <stop offset="1" stopColor="#b06a34" />
          </linearGradient>
          <linearGradient id="ws-plank" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6a4022" />
            <stop offset="0.7" stopColor="#9a6a3e" />
            <stop offset="1" stopColor="#c48a52" />
          </linearGradient>
          <linearGradient id="ws-cactus" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2a5a34" />
            <stop offset="0.6" stopColor="#4a8a52" />
            <stop offset="1" stopColor="#7aa85a" />
          </linearGradient>
        </defs>
        {/* Kaktüs */}
        <g fill="url(#ws-cactus)">
          <rect x="1050" y="560" width="30" height="130" rx="15" />
          <rect x="1020" y="600" width="18" height="50" rx="9" />
          <rect x="1020" y="632" width="40" height="18" rx="9" />
          <rect x="1092" y="580" width="18" height="50" rx="9" />
          <rect x="1070" y="612" width="40" height="18" rx="9" />
        </g>
        {/* Saloon: ahşap cephe, sundurma */}
        <rect x="0" y="230" width="640" height="560" fill="url(#ws-plank)" />
        {Array.from({ length: 14 }, (_, i) => (
          <line key={i} x1="0" y1={250 + i * 40} x2="640" y2={250 + i * 40} stroke="#5a3a1e" strokeWidth="3" />
        ))}
        {/* Sıcak ışıklı pencere ve tabela */}
        <rect x="430" y="300" width="130" height="110" fill="#3a1e10" />
        <rect x="440" y="310" width="110" height="90" fill="#ffc46a" />
        <line x1="495" y1="310" x2="495" y2="400" stroke="#3a1e10" strokeWidth="6" />
        <line x1="440" y1="355" x2="550" y2="355" stroke="#3a1e10" strokeWidth="6" />
        <rect x="370" y="440" width="250" height="60" rx="6" fill="#3a1e10" />
        <text x="495" y="482" textAnchor="middle" fontSize="34" fontWeight="900" fill="#f0c86a" fontFamily="Georgia, serif" letterSpacing="4">SALOON</text>
        <path d="M0 200 h660 v40 h-660 Z" fill="#5a3a1e" />
        <path d="M0 200 h660 v8 h-660 Z" fill="#c48a52" opacity="0.6" />
        <path d="M-20 600 h680 l-10 -24 h-660 Z" fill="#5a3a22" />
        <rect x="380" y="600" width="12" height="190" fill="#5a3a22" />
        <rect x="620" y="580" width="16" height="210" fill="#5a3a22" />
        <rect x="400" y="560" width="200" height="230" fill="#1a0e08" />
        <rect x="400" y="560" width="200" height="230" fill="#ffb84a" opacity="0.08" />
        {/* Yaylı kapılar */}
        <path d="M410 640 h86 v90 h-86 Z M504 640 h86 v90 h-86 Z" fill="#8a5a34" />
        {[420, 440, 460, 480, 514, 534, 554, 574].map((x) => (
          <line key={x} x1={x} y1="648" x2={x} y2="722" stroke="#5a3a1e" strokeWidth="4" />
        ))}
        <rect x="0" y="770" width="660" height="30" fill="#6b4226" />
        {/* Çit */}
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={1180 + i * 46} y="680" width="16" height="140" fill="#7a5030" />
        ))}
      </Painted>
      {/* Yuvarlanan çalı */}
      <motion.svg className="absolute" style={{ left: 0, top: 760 }} width="70" height="70" viewBox="0 0 70 70" initial={{ x: W + 100 }} animate={{ x: [W + 100, -120], y: [0, -30, 0, -14, 0, -24, 0], rotate: [0, -1080] }} transition={{ duration: 11, repeat: Infinity, ease: "linear", repeatDelay: 3 }}>
        <g stroke="#9a6a3a" strokeWidth="3" fill="none">
          <circle cx="35" cy="35" r="30" />
          <path d="M10 20 Q 35 50 60 18 M8 44 Q 35 10 62 46 M35 5 Q 20 35 35 65" />
        </g>
      </motion.svg>

      <WesternClock />
      {/* Sundurmada sallanan sandalyede uyuklayan */}
      <motion.div className="absolute inset-0" style={{ originX: "190px", originY: "780px" }} animate={{ rotate: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
        <Actor x={190} y={760} size={100} look={look({ shape: "bear", head: "bowler" })} color="#B5651D" expression="sleepy" move={breathe(4, 2)} back={<RockingChair />} />
      </motion.div>
      {/* Yarım kapının arkasından merakla bakan */}
      <Actor morph={beat.n[2]} morphDelay={0} x={500} y={beat.i === 2 ? 622 : 652} size={92} look={look({ shape: "sphere" })} color="#FF5C8A" expression={beat.i === 2 ? "surprised" : "suspicious"} move={{ animate: { x: [-6, 6, -6] }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } }} />
      <SaloonDoors swing={beat.i === 2} k={k} />
      {/* Düello pozisyonunda kovboy */}
      <Actor x={860} y={830} size={110} look={look({ shape: "egg", head: "cowboy" })} color="#FFE3A8" expression={beat.i === 0 ? "happy" : "focused"} move={{ animate: { x: [0, 2, 0] }, transition: { duration: 2, repeat: Infinity } }} act={on(beat, 0, { animate: { y: [0, -6, 0] }, transition: { duration: 0.6 } })} actKey={k} front={<><WaterPistol draw={beat.i === 0} k={k} /></>} />
      {/* Başında tüyle çitin üstünden sarkan yaramaz */}
      <Actor x={1340} y={beat.i === 3 ? 660 : 700} size={88} look={look({ shape: "star" })} color="#8FE03A" expression={beat.i === 3 ? "giggle" : "suspicious"} move={sway(2.4, 4)} act={on(beat, 3, hop(20))} actKey={k} back={<Feather />} front={<><Hand x={0} y={22} /><Hand x={24} y={22} /></>} />
      <Painted look="riso" seed={744}>
        <rect x="1170" y="700" width="420" height="18" fill="#8a5a34" />
        <rect x="1170" y="760" width="420" height="18" fill="#8a5a34" />
      </Painted>
    </Stage>
  );
}

function RockingChair() {
  return (
    <g>
      <rect x="-6" y="-12" width="36" height="34" rx="4" fill="#6b4226" />
      {[0, 8, 16, 24].map((x) => (
        <rect key={x} x={x - 2} y="-10" width="3" height="30" fill="#5a3a22" />
      ))}
      <rect x="-8" y="22" width="40" height="4" rx="1.4" fill="#5a3a22" />
      <path d="M-10 32 Q 12 38 34 32" stroke="#5a3a22" strokeWidth="2.4" fill="none" />
      <line x1="-4" y1="26" x2="-6" y2="33" stroke="#5a3a22" strokeWidth="2" />
      <line x1="28" y1="26" x2="30" y2="33" stroke="#5a3a22" strokeWidth="2" />
    </g>
  );
}

function SaloonDoors({ swing, k }: { swing: boolean; k: number }) {
  return (
    <>
      {[0, 1].map((side) => (
        <motion.div
          key={`${side}${swing ? k : 0}`}
          className="absolute"
          style={{ left: side ? 500 : 405, top: 610, width: 95, height: 120, originX: side ? 1 : 0, background: "repeating-linear-gradient(180deg,#a8744a 0 18px,#8a5a34 18px 20px)", borderRadius: side ? "40px 6px 6px 6px" : "6px 40px 6px 6px", boxShadow: "inset 0 0 0 4px #6b4226" }}
          animate={swing ? { scaleX: [1, 0.3, 0.8, 0.5, 1] } : { scaleX: [1, 0.94, 1] }}
          transition={swing ? { duration: 1.8 } : { duration: 3, repeat: Infinity }}
        />
      ))}
    </>
  );
}

function WaterPistol({ draw, k }: { draw: boolean; k: number }) {
  return (
    <g>
      <rect x="25" y="20" width="6" height="8" rx="1.4" fill="#6b3a1a" />
      <motion.g key={k} animate={draw ? { y: [0, -8, -8, 0], x: [0, 4, 4, 0] } : {}} transition={{ duration: 1.8, times: [0, 0.15, 0.8, 1] }}>
        <path d="M26 18 h8 v3 h-4 l-1 4 h-3 Z" fill="#2fd4c0" />
        <circle cx="29" cy="19" r="1.2" fill="#ff8a1f" />
        <Hand x={27} y={22} />
      </motion.g>
      {draw &&
        [0, 1, 2, 3].map((i) => (
          <motion.circle key={`${k}${i}`} cx={38} cy={11} r="0.9" fill="#8fd8ff" animate={{ x: [0, 18 + i * 4], y: [0, (i % 2) * 4 - 1], opacity: [1, 0] }} transition={{ duration: 0.5, delay: 0.4 + i * 0.12 }} />
        ))}
      <Hand x={-4} y={20} />
    </g>
  );
}

function Feather() {
  return (
    <g>
      <path d="M3 4 Q 12 7 21 4" stroke="#c0392b" strokeWidth="2.4" fill="none" />
      <path d="M14 3 Q 16 -12 22 -18 Q 20 -6 16 4 Z" fill="#fff" stroke="#e0e0e0" strokeWidth="0.4" />
      <path d="M21 -17 Q 19 -10 17 -6" stroke="#333" strokeWidth="1.4" fill="none" />
    </g>
  );
}
