/**
 * Kalkan sahneleri (6–10): büyücü kütüphanesi, kristal madeni, zen bahçesi, sanat atölyesi, kış.
 */
import { motion } from "motion/react";
import { LibraryClock, MineClock, SnowClock, StudioClock, ZenClock } from "./clocks";
import { Actor, breathe, Drift, Hand, hop, Layer, look, on, Stage, sway, useBeat, W } from "./kit";

// ------------------------------------------------------------------ 6. Gizli kütüphane / büyücü odası

export function Library() {
  const beat = useBeat(4);
  const k = beat.k;
  const spines = ["#7a2e2e", "#2e4a7a", "#3f6b3a", "#6b4a2e", "#5a2e6b", "#8a6a2e"];
  return (
    <Stage sky="linear-gradient(180deg, #1a1210 0%, #241814 100%)">
      <Layer>
        {/* Tavana kadar raflar */}
        {[0, 1].map((side) => (
          <g key={side} transform={`translate(${side ? 1080 : 0} 0)`}>
            <rect x="0" y="0" width="520" height="900" fill="#2e1d14" />
            {Array.from({ length: 6 }, (_, r) => (
              <g key={r}>
                <rect x="0" y={130 + r * 130} width="520" height="14" fill="#4a2f1f" />
                {Array.from({ length: 16 }, (_, i) => (
                  <rect key={i} x={12 + i * 31} y={130 + r * 130 - 70 - ((i * 7 + r) % 4) * 8} width="26" height={70 + ((i * 7 + r) % 4) * 8} fill={spines[(i + r * 3) % spines.length]} opacity="0.85" />
                ))}
              </g>
            ))}
          </g>
        ))}
        {/* Mum ışığı */}
        <circle cx="800" cy="420" r="460" fill="url(#nk-glow)" opacity="0.45" />
        {/* Zemin */}
        <rect x="0" y="780" width={W} height="120" fill="#1a110c" />
        {/* Merdiven */}
        <g stroke="#6b4a2e" strokeWidth="12" strokeLinecap="round">
          <line x1="1130" y1="790" x2="1240" y2="360" />
          <line x1="1210" y1="790" x2="1320" y2="360" />
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1={1130 + (i + 1) * 12.8} y1={790 - (i + 1) * 50} x2={1210 + (i + 1) * 12.8} y2={790 - (i + 1) * 50} strokeWidth="8" />
          ))}
        </g>
        {/* Kazan */}
        <ellipse cx="560" cy="800" rx="120" ry="20" fill="#000" opacity="0.4" />
        <path d="M450 690 h220 q0 120 -110 120 q-110 0 -110 -120 Z" fill="#26262e" />
        <ellipse cx="560" cy="690" rx="110" ry="22" fill="#3a3a44" />
        <motion.ellipse cx="560" cy="692" rx="96" ry="16" fill="#5df2a8" animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.6, repeat: Infinity }} />
        {/* Mumlar */}
        {[[760, 780], [820, 790], [1020, 780]].map(([x, y], i) => (
          <g key={i}>
            <rect x={x - 10} y={y - 60} width="20" height="60" rx="4" fill="#f3ead6" />
            <motion.path d={`M${x} ${y - 82} q-8 12 0 20 q8 -8 0 -20`} fill="#ffcf5a" animate={{ scaleY: [1, 1.2, 0.9, 1] }} transition={{ duration: 0.6 + i * 0.1, repeat: Infinity }} style={{ transformOrigin: `${x}px ${y - 62}px` }} />
          </g>
        ))}
      </Layer>
      {/* Kazandan kabarcıklar; iksir damlayınca büyük patlama */}
      {Array.from({ length: beat.i === 0 ? 10 : 5 }, (_, i) => (
        <motion.span key={`${i}-${beat.i === 0 ? k : 0}`} className="absolute rounded-full" style={{ left: 500 + i * 13, top: 680, width: 12 - (i % 3) * 2, height: 12 - (i % 3) * 2, background: "#8affc6", boxShadow: "0 0 10px #5df2a8" }} animate={{ y: [0, -120 - (i % 4) * 40], opacity: [1, 0] }} transition={{ duration: 1.6 + (i % 3) * 0.4, repeat: Infinity, delay: i * 0.3 }} />
      ))}
      {/* Havada süzülen parşömenler */}
      {[[560, 340], [1000, 380], [380, 260]].map(([x, y], i) => (
        <motion.div key={i} className="absolute" style={{ left: x, top: y, width: 60, height: 80, background: "linear-gradient(180deg, #f3e3bc, #e2c98f)", borderRadius: 6, boxShadow: "0 6px 16px rgba(0,0,0,0.4)" }} animate={{ y: [0, -24, 0], rotate: [-8, 8, -8] }} transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}>
          {[16, 30, 44, 58].map((t) => (
            <span key={t} className="absolute left-2 right-2 h-[3px] rounded bg-[#a88b52]/60" style={{ top: t }} />
          ))}
        </motion.div>
      ))}

      <LibraryClock />
      {/* Cadı şapkalı iksirci */}
      <Actor x={420} y={790} size={110} look={look({ shape: "sphere", head: "witch" })} color="#6B4BFF" flip expression={beat.i === 0 ? "surprised" : "focused"} move={sway(3, 3)} act={on(beat, 0, hop(18))} actKey={k} front={<Potion pour={beat.i === 0} k={k} />} />
      {/* Merdivenin tepesinde büyü kitabı inceleyen */}
      <Actor x={1250} y={440} size={98} look={look({ shape: "triangle", glasses: "round" })} color="#FF8A1F" expression={beat.i === 1 ? "surprised" : "focused"} move={sway(4, 2)} act={on(beat, 1, { animate: { rotate: [0, -10, 10, 0] }, transition: { duration: 1.2 } })} actKey={k} front={<Tome />} />
      {/* Monokllü, büyüteçle parşömen okuyan */}
      <Actor x={900} y={790} size={104} look={look({ shape: "egg", glasses: "monocle", neck: "bowtie" })} color="#2FD4C0" expression="focused" move={breathe(3)} act={on(beat, 2, { animate: { x: [0, 24, 0] }, transition: { duration: 2 } })} actKey={k} front={<ScrollLens />} />
      {/* Kitabın üstünde uyuyakalan */}
      <Actor x={660} y={800} size={92} look={look({ shape: "cloud", texture: "plush" })} color="#FF9EC4" expression="sleepy" move={breathe(4.5, 2)} act={on(beat, 3, { animate: { rotate: [0, -6, 0] }, transition: { duration: 1.4 } })} actKey={k} front={<NapBook />} />
    </Stage>
  );
}

function Potion({ pour, k }: { pour: boolean; k: number }) {
  return (
    <motion.g key={k} style={{ transformOrigin: "26px 14px" }} animate={pour ? { rotate: [0, 60, 60, 0] } : {}} transition={{ duration: 2 }}>
      <path d="M24 8 h4 v3 l3 5 a4 4 0 0 1 -4 5 h-2 a4 4 0 0 1 -4 -5 l3 -5 Z" fill="rgba(180,255,220,0.35)" stroke="#d8fff0" strokeWidth="0.6" />
      <path d="M22.4 15 h7.2 l1 1.6 a4 4 0 0 1 -4 4.4 h-1.2 a4 4 0 0 1 -4 -4.4 Z" fill="#5df2a8" />
      <Hand x={26} y={18} />
    </motion.g>
  );
}

function Tome() {
  return (
    <g>
      <rect x="-2" y="15" width="28" height="11" rx="1.5" fill="#5a2e6b" />
      <rect x="0" y="14" width="24" height="10" rx="1" fill="#f3ead6" />
      <line x1="12" y1="14" x2="12" y2="24" stroke="#c9b98f" strokeWidth="0.8" />
      <motion.circle cx="6" cy="18" r="1.4" fill="#ffd27a" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.4, repeat: Infinity }} />
      <Hand x={-2} y={21} />
      <Hand x={26} y={21} />
    </g>
  );
}

function ScrollLens() {
  return (
    <g>
      <rect x="-6" y="16" width="16" height="11" rx="1.5" fill="#f3e3bc" />
      {[19, 21.5, 24].map((y) => (
        <line key={y} x1="-4" y1={y} x2="8" y2={y} stroke="#a88b52" strokeWidth="0.7" />
      ))}
      <motion.g animate={{ x: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
        <circle cx="22" cy="15" r="4.5" fill="rgba(200,230,255,0.25)" stroke="#2b2b33" strokeWidth="1.2" />
        <line x1="25" y1="18.5" x2="29" y2="23" stroke="#2b2b33" strokeWidth="1.6" strokeLinecap="round" />
        <Hand x={29} y={23} />
      </motion.g>
      <Hand x={-5} y={23} />
    </g>
  );
}

function NapBook() {
  return (
    <g>
      <path d="M-6 22 L12 24 L30 22 L30 28 L12 30 L-6 28 Z" fill="#7a2e2e" />
      <path d="M-5 21 Q3.5 19.5 12 22.5 L12 28 Q3.5 26 -5 27 Z" fill="#fbf6ea" />
      <path d="M29 21 Q20.5 19.5 12 22.5 L12 28 Q20.5 26 29 27 Z" fill="#f3ecdb" />
      <motion.text x="24" y="-2" fontSize="6" fill="#fff" fontWeight="700" animate={{ opacity: [0, 1, 0], y: [0, -6] }} transition={{ duration: 2.6, repeat: Infinity }}>
        z
      </motion.text>
    </g>
  );
}

// ------------------------------------------------------------------ 7. Kristal madeni

export function Mine() {
  const beat = useBeat(4);
  const k = beat.k;
  const crystal = (x: number, y: number, s: number, c: string, key: number) => (
    <motion.g key={key} animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2 + (key % 3), repeat: Infinity }}>
      <polygon points={`${x},${y - 60 * s} ${x + 18 * s},${y - 20 * s} ${x + 10 * s},${y} ${x - 10 * s},${y} ${x - 18 * s},${y - 20 * s}`} fill={c} />
      <polygon points={`${x},${y - 60 * s} ${x + 18 * s},${y - 20 * s} ${x},${y - 14 * s}`} fill="#ffffff" opacity="0.35" />
    </motion.g>
  );
  return (
    <Stage sky="radial-gradient(120% 90% at 50% 40%, #12303a 0%, #0a1a22 55%, #050b10 100%)">
      <Layer>
        {/* Mağara duvarları */}
        <path d="M0 0 L0 900 L240 900 Q160 600 260 380 Q200 160 0 0 Z" fill="#0d1f26" />
        <path d="M1600 0 L1600 900 L1360 900 Q1450 600 1330 360 Q1420 140 1600 0 Z" fill="#0d1f26" />
        <path d="M0 0 H1600 V120 Q1200 200 800 150 Q400 210 0 120 Z" fill="#0b1a20" />
        {/* Kristaller */}
        {[[180, 500, 1.6, "#2fd4c0"], [260, 520, 1, "#5ce1e6"], [1380, 470, 1.8, "#2fd4c0"], [1300, 520, 1.1, "#7af0ff"], [520, 140, -1.2, "#2fd4c0"], [1090, 150, -1.4, "#5ce1e6"], [420, 160, -1, "#7af0ff"]].map(([x, y, s, c], i) =>
          crystal(x as number, y as number, s as number, c as string, i),
        )}
        <circle cx="200" cy="470" r="200" fill="#2fd4c0" opacity="0.08" />
        <circle cx="1380" cy="450" r="220" fill="#2fd4c0" opacity="0.08" />
        {/* Zemin ve raylar */}
        <path d="M0 760 Q 800 720 1600 760 L1600 900 L0 900 Z" fill="#14232a" />
        {Array.from({ length: 18 }, (_, i) => (
          <rect key={i} x={90 + i * 80} y={782} width="46" height="12" fill="#5a3a22" />
        ))}
        <line x1="0" y1="782" x2={W} y2="782" stroke="#8a95a3" strokeWidth="6" />
        <line x1="0" y1="796" x2={W} y2="796" stroke="#6b7480" strokeWidth="6" />
      </Layer>
      {/* Kristale vurulunca kıvılcımlar */}
      {beat.i === 0 &&
        Array.from({ length: 10 }, (_, i) => (
          <motion.span key={`${i}-${k}`} className="absolute h-2 w-2 rounded-full bg-[#9ff6ff]" style={{ left: 1290, top: 450, boxShadow: "0 0 10px #2fd4c0" }} animate={{ x: Math.cos(i) * 90, y: Math.sin(i) * 70 - 30, opacity: [1, 0] }} transition={{ duration: 0.8, delay: 0.3 + (i % 3) * 0.4 }} />
        ))}

      <MineClock />
      {/* Baretli kazmacı */}
      <Actor x={1220} y={770} size={108} look={look({ shape: "cube" })} color="#FFD21F" flip={false} expression="focused" move={breathe(3)} front={<><HardHat /><Pickaxe k={k} hit={beat.i === 0} /></>} />
      {/* Maden arabasında "hızlı git" diyen */}
      <motion.div className="absolute inset-0" animate={beat.i === 1 ? { x: [0, -260, -260, 0] } : { x: 0 }} transition={{ duration: 4, times: [0, 0.35, 0.7, 1], ease: "easeInOut" }} key={`cart${beat.i === 1 ? k : 0}`}>
        <Actor x={760} y={745} size={96} look={look({ shape: "bean", head: "cap" })} color="#FF6A3D" expression="happy" move={{ animate: { y: [0, -3, 0] }, transition: { duration: 0.4, repeat: Infinity } }} front={<><Hand x={-4} y={2} /><Hand x={28} y={-2} /></>} />
        <Layer>
          <path d="M680 700 h160 l-16 76 h-128 Z" fill="#5a5f6b" />
          <rect x="676" y="696" width="168" height="12" rx="4" fill="#7a808c" />
          {[712, 808].map((x) => (
            <motion.g key={x} animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: `${x}px 782px` }}>
              <circle cx={x} cy="782" r="16" fill="#2b2f36" />
              <line x1={x - 12} y1="782" x2={x + 12} y2="782" stroke="#8a95a3" strokeWidth="3" />
            </motion.g>
          ))}
        </Layer>
      </motion.div>
      {/* Büyüteçle elmas inceleyen */}
      <Actor x={460} y={780} size={100} look={look({ shape: "sphere", glasses: "round" })} color="#9B7BFF" expression={beat.i === 2 ? "surprised" : "focused"} move={breathe(3.4)} act={on(beat, 2, hop(16))} actKey={k} front={<Gem />} />
      {/* Fener tutan */}
      <Actor x={300} y={790} size={92} look={look({ shape: "egg", head: "antenna" })} color="#2FD4C0" expression="idle" move={sway(3, 3)} act={on(beat, 3, { animate: { rotate: [0, 12, -12, 0] }, transition: { duration: 1.4 } })} actKey={k} front={<Lamp />} />
    </Stage>
  );
}

function HardHat() {
  return (
    <g>
      <path d="M1 3 Q2 -8 12 -8 Q22 -8 23 3 Z" fill="#ffb21f" />
      <rect x="-2" y="1.5" width="28" height="3" rx="1.5" fill="#e09a10" />
      <circle cx="12" cy="-3" r="2.6" fill="#fff6c4" />
      <path d="M12 -3 L40 -12 L40 6 Z" fill="#fff6c4" opacity="0.18" />
    </g>
  );
}

function Pickaxe({ k, hit }: { k: number; hit: boolean }) {
  return (
    <motion.g key={k} style={{ transformOrigin: "26px 18px" }} animate={hit ? { rotate: [0, -50, 20, -50, 20, 0] } : { rotate: [0, -10, 0] }} transition={hit ? { duration: 1.6 } : { duration: 2.4, repeat: Infinity }}>
      <line x1="26" y1="18" x2="30" y2="2" stroke="#8a5a34" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M22 2 Q30 -2 38 4 Q30 1 22 2 Z" fill="#b9c0cc" stroke="#8a95a3" strokeWidth="0.6" />
      <Hand x={26} y={18} />
      <Hand x={28} y={11} />
    </motion.g>
  );
}

function Gem() {
  return (
    <g>
      <motion.polygon points="-3,16 3,16 5,19 0,24 -5,19" fill="#7af0ff" animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 1, repeat: Infinity }} />
      <Hand x={0} y={24} />
      <circle cx="18" cy="16" r="4.5" fill="rgba(200,230,255,0.25)" stroke="#2b2b33" strokeWidth="1.2" />
      <line x1="21" y1="19.5" x2="25" y2="23" stroke="#2b2b33" strokeWidth="1.6" strokeLinecap="round" />
      <Hand x={25} y={23} />
    </g>
  );
}

function Lamp() {
  return (
    <g>
      <line x1="27" y1="14" x2="27" y2="6" stroke="#444" strokeWidth="0.8" />
      <rect x="24" y="6" width="6" height="8" rx="1.5" fill="#ffd36b" stroke="#2a2a32" strokeWidth="0.8" />
      <circle cx="27" cy="10" r="12" fill="url(#nk-glow)" opacity="0.7" />
      <Hand x={27} y={5} />
    </g>
  );
}

// ------------------------------------------------------------------ 8. Zen bahçesi

export function Zen() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage sky="linear-gradient(180deg, #ffd9cf 0%, #ffe9dc 50%, #f6efe2 100%)">
      <Layer>
        {/* Uzak dağ */}
        <path d="M0 520 L300 360 L520 470 L800 300 L1100 460 L1350 380 L1600 500 L1600 600 L0 600 Z" fill="#e9c9c4" />
        {/* Sakura ağacı */}
        <path d="M1380 820 C 1360 640, 1420 520, 1340 380 M1370 520 C 1300 470, 1240 470, 1200 420" stroke="#5a3a32" strokeWidth="26" fill="none" strokeLinecap="round" />
        {[[1300, 330, 120], [1200, 400, 90], [1430, 380, 100], [1350, 260, 80]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? "#ffb7cf" : "#ffc8da"} />
        ))}
        {/* Tırmıklanmış çakıl */}
        <rect x="0" y="600" width={W} height="300" fill="#efeae0" />
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M0 ${630 + i * 30} Q 400 ${620 + i * 30} 800 ${630 + i * 30} T 1600 ${630 + i * 30}`} stroke="#d9d2c4" strokeWidth="4" fill="none" />
        ))}
        {/* Taş ve daireler */}
        {[0, 1, 2].map((i) => (
          <motion.ellipse key={`${i}-${beat.i === 0 ? k : 0}`} cx="480" cy="760" rx={70 + i * 34} ry={22 + i * 11} fill="none" stroke="#d1c9ba" strokeWidth="4" initial={{ pathLength: beat.i === 0 ? 0 : 1 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: i * 0.3 }} />
        ))}
        <ellipse cx="480" cy="755" rx="50" ry="22" fill="#8a8f99" />
        {/* Bambu çeşme (shishi-odoshi) */}
        <rect x="1080" y="640" width="14" height="140" fill="#7c9a4a" />
        <rect x="1180" y="660" width="14" height="120" fill="#7c9a4a" />
        <motion.g key={`bam${beat.i === 3 ? k : 0}`} style={{ transformOrigin: "1137px 660px" }} animate={beat.i === 3 ? { rotate: [-12, 18, 18, -12] } : { rotate: -12 }} transition={{ duration: 2, times: [0, 0.3, 0.5, 1] }}>
          <rect x="1040" y="652" width="200" height="22" rx="10" fill="#9bbb5a" />
          <rect x="1040" y="652" width="200" height="22" rx="10" fill="none" stroke="#6f8a3a" strokeWidth="3" />
        </motion.g>
        <path d="M1260 600 q-30 0 -40 50" stroke="#7c9a4a" strokeWidth="12" fill="none" />
        <ellipse cx="1240" cy="790" rx="80" ry="18" fill="#8fb8c9" />
        {/* Çay masası */}
        <rect x="700" y="770" width="220" height="16" rx="6" fill="#5a3a32" />
        <rect x="720" y="786" width="14" height="30" fill="#5a3a32" />
        <rect x="886" y="786" width="14" height="30" fill="#5a3a32" />
      </Layer>
      <Drift count={26} from={240} to={900} xs={[900, 1600]} dur={[7, 12]} sway={120} rotate={260} render={() => <span className="block h-3 w-4 rounded-[60%_10%_60%_10%]" style={{ background: "#ffb7cf" }} />} />

      <ZenClock />
      {/* Tırmıkla daire çizen */}
      <Actor x={340} y={800} size={100} look={look({ shape: "sphere", head: "sprout" })} color="#8FE03A" expression="focused" move={sway(3, 3)} act={on(beat, 0, { animate: { x: [0, 30, 0] }, transition: { duration: 2 } })} actKey={k} front={<Rake />} />
      {/* Meditasyon yapan; kafasına yaprak düşer */}
      <Actor x={620} y={800} size={104} look={look({ shape: "egg" })} color="#F4F4F6" expression="sleepy" move={breathe(5, 3)} front={<><Hand x={-3} y={20} /><Hand x={27} y={20} />{beat.i === 1 && <motion.path key={k} d="M10 -4 q3 -3 6 0 q-3 3 -6 0" fill="#ffb7cf" initial={{ y: -40, x: 10, rotate: 0 }} animate={{ y: [-40, 0], x: [10, -4, 2], rotate: [0, 200] }} transition={{ duration: 2.4 }} />}</>} />
      {/* Çay kasesine sarılan */}
      <Actor x={810} y={772} size={92} look={look({ shape: "bean", texture: "matte" })} color="#2FD4C0" expression={beat.i === 2 ? "happy" : "sleepy"} move={breathe(3.6)} act={on(beat, 2, { animate: { rotate: [0, -8, 0] }, transition: { duration: 1.4 } })} actKey={k} front={<TeaBowl />} />
      {/* Bambu çeşmeyi pür dikkat izleyen */}
      <Actor x={990} y={800} size={96} look={look({ shape: "cat" })} color="#FF8A1F" expression={beat.i === 3 ? "surprised" : "focused"} move={sway(4, 2)} act={on(beat, 3, hop(22))} actKey={k} />
    </Stage>
  );
}

function Rake() {
  return (
    <g>
      <line x1="26" y1="16" x2="36" y2="30" stroke="#8a5a34" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M31 31 L41 28" stroke="#8a5a34" strokeWidth="1.4" />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1={32 + i * 2.6} y1={30.6 - i * 0.8} x2={32.6 + i * 2.6} y2={33 - i * 0.8} stroke="#8a5a34" strokeWidth="0.8" />
      ))}
      <Hand x={26} y={16} />
      <Hand x={31} y={23} />
    </g>
  );
}

function TeaBowl() {
  return (
    <g>
      <path d="M2 16 h20 q0 9 -10 9 q-10 0 -10 -9 Z" fill="#3a5a3a" />
      <ellipse cx="12" cy="16" rx="10" ry="2" fill="#8fd16a" />
      {[8, 14].map((x, i) => (
        <motion.path key={x} d={`M${x} 13 q-2 -3 0 -6`} stroke="rgba(255,255,255,0.8)" strokeWidth="0.9" fill="none" animate={{ y: [0, -4], opacity: [0, 0.8, 0] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }} />
      ))}
      <Hand x={1} y={20} />
      <Hand x={23} y={20} />
    </g>
  );
}

// ------------------------------------------------------------------ 9. Sanat atölyesi

export function Studio() {
  const beat = useBeat(4);
  const k = beat.k;
  const paint = ["#ff3b4a", "#2b8cff", "#ffd21f", "#16c47f", "#e23bd6", "#ff8a1f"];
  return (
    <Stage sky="linear-gradient(180deg, #f4efe6 0%, #ebe3d4 100%)">
      <Layer>
        {/* Duvardaki renkli fırça darbeleri */}
        {Array.from({ length: 14 }, (_, i) => i).filter((i) => { const x = 80 + i * 105; return x < 540 || x > 1010; }).map((i) => (
          <path key={i} d={`M${80 + i * 105} ${120 + (i % 4) * 70} q 40 -30 90 10`} stroke={paint[i % paint.length]} strokeWidth="18" strokeLinecap="round" fill="none" opacity="0.55" />
        ))}
        {/* Pencere ışığı */}
        <polygon points="1100,0 1400,0 1600,700 1200,700" fill="#fff" opacity="0.35" />
        {/* Zemin ve boya lekeleri */}
        <rect x="0" y="720" width={W} height="180" fill="#d8ccb6" />
        {[[200, 820], [520, 860], [900, 800], [1250, 850], [1450, 790]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx={50 + (i % 3) * 20} ry={14} fill={paint[(i * 2) % paint.length]} opacity="0.7" />
        ))}
        {/* Saçılmış tüpler */}
        {[[300, 840, 20], [1120, 870, -30], [1380, 830, 60]].map(([x, y, a], i) => (
          <g key={i} transform={`rotate(${a} ${x} ${y})`}>
            <rect x={x - 26} y={y - 8} width="52" height="16" rx="5" fill="#eee" />
            <rect x={x + 22} y={y - 5} width="10" height="10" rx="2" fill={paint[i + 1]} />
          </g>
        ))}
        {/* Şövale ve tuval */}
        <line x1="380" y1="420" x2="320" y2="790" stroke="#8a5a34" strokeWidth="14" />
        <line x1="380" y1="420" x2="440" y2="790" stroke="#8a5a34" strokeWidth="14" />
        <rect x="260" y="440" width="240" height="190" fill="#fffdf6" stroke="#c9b98f" strokeWidth="6" />
        <path d="M290 590 Q 340 500 400 560 T 480 500" stroke="#2b8cff" strokeWidth="10" fill="none" strokeLinecap="round" />
        <motion.path key={`c${beat.i === 0 ? k : 0}`} d="M300 480 L 470 520" stroke="#ff3b4a" strokeWidth="9" fill="none" strokeLinecap="round" initial={{ pathLength: beat.i === 0 ? 0 : 1 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8, delay: 0.4 }} />
        {/* Heykel tezgâhı */}
        <rect x="1130" y="680" width="200" height="110" rx="10" fill="#8a5a34" />
      </Layer>

      <StudioClock />
      {/* Bereli, paletli ressam */}
      <Actor x={560} y={790} size={110} look={look({ shape: "sphere", head: "beret" })} color="#F4F4F6" flip expression="focused" move={breathe(3)} act={on(beat, 0, { animate: { x: [0, -10, 0] }, transition: { duration: 2 } })} actKey={k} front={<Palette k={beat.i === 0 ? k : 0} />} />
      {/* Boyaya bulanmış, boş boş bakan */}
      <Actor x={820} y={800} size={104} look={look({ shape: "blob", texture: "spots" })} color="#E23BD6" expression={beat.i === 1 ? "dizzy" : "idle"} move={sway(3.6, 4)} act={on(beat, 1, { animate: { rotate: [0, -14, 14, 0] }, transition: { duration: 1.6 } })} actKey={k} />
      {/* Rulo ile kayan */}
      <motion.div key={`roll${beat.i === 2 ? k : 0}`} className="absolute inset-0" animate={beat.i === 2 ? { x: [0, 520, 520, 0] } : { x: 0 }} transition={{ duration: 5, times: [0, 0.45, 0.6, 1], ease: "easeInOut" }}>
        {beat.i === 2 && (
          <Layer>
            <motion.rect x="200" y="840" height="26" rx="8" fill="#16c47f" opacity="0.8" initial={{ width: 0 }} animate={{ width: [0, 520, 520, 0] }} transition={{ duration: 5, times: [0, 0.45, 0.9, 1] }} />
          </Layer>
        )}
        <Actor x={200} y={860} size={92} look={look({ shape: "bean", head: "cap" })} color="#2B8CFF" expression="happy" move={{ animate: { rotate: [-4, 4, -4] }, transition: { duration: 0.8, repeat: Infinity } }} front={<Roller />} />
      </motion.div>
      {/* Kendine benzeyen biblo yoğuran */}
      <Actor x={1240} y={690} size={100} look={look({ shape: "egg", texture: "matte" })} color="#FF8A1F" expression="focused" move={breathe(2.6)} act={on(beat, 3, hop(14))} actKey={k} front={<Clay k={k} grow={beat.i === 3} />} />
    </Stage>
  );
}

function Palette({ k }: { k: number }) {
  return (
    <g>
      <path d="M-8 18 q0 -8 9 -8 q9 0 9 6 q0 3 -3 3 q-2 0 -2 2 q0 3 -5 3 q-8 0 -8 -6 Z" fill="#d8b26e" />
      {["#ff3b4a", "#2b8cff", "#ffd21f", "#16c47f"].map((c, i) => (
        <circle key={c} cx={-4 + i * 3.4} cy={14.5 + (i % 2) * 1.6} r="1.2" fill={c} />
      ))}
      <Hand x={-6} y={20} />
      <motion.g key={k} animate={k ? { x: [0, 8, 14, 0], y: [0, -6, -2, 0] } : {}} transition={{ duration: 2 }}>
        <line x1="26" y1="16" x2="32" y2="6" stroke="#8a5a34" strokeWidth="1" strokeLinecap="round" />
        <circle cx="32" cy="6" r="1.2" fill="#ff3b4a" />
        <Hand x={26} y={16} />
      </motion.g>
    </g>
  );
}

function Roller() {
  return (
    <g>
      <line x1="26" y1="14" x2="34" y2="24" stroke="#8a5a34" strokeWidth="1.2" />
      <rect x="31" y="23" width="10" height="4" rx="2" fill="#16c47f" />
      <Hand x={26} y={14} />
      <Hand x={30} y={19} />
    </g>
  );
}

function Clay({ k, grow }: { k: number; grow: boolean }) {
  return (
    <g>
      <motion.g key={k} initial={{ scale: grow ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ duration: 1.6 }} style={{ transformOrigin: "34px 26px" }}>
        <ellipse cx="34" cy="22" rx="5" ry="4.6" fill="#c8794a" />
        <rect x="32" y="20.6" width="1" height="2" rx="0.5" fill="#2a1a10" />
        <rect x="35" y="20.6" width="1" height="2" rx="0.5" fill="#2a1a10" />
      </motion.g>
      <motion.g animate={{ y: [0, 1.6, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>
        <Hand x={29} y={20} />
        <Hand x={39} y={20} />
      </motion.g>
    </g>
  );
}

// ------------------------------------------------------------------ 10. Kış ve kartopu

export function Snow() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage sky="linear-gradient(180deg, #9fb7d6 0%, #cfdcec 60%, #eef3f8 100%)">
      <Layer>
        {/* Çamlar */}
        {[80, 200, 330, 1250, 1380, 1520].map((x, i) => (
          <g key={x}>
            <polygon points={`${x},${330 + (i % 2) * 40} ${x - 90},620 ${x + 90},620`} fill="#2f5a4a" />
            <polygon points={`${x},${330 + (i % 2) * 40} ${x - 40},450 ${x + 40},450`} fill="#fff" opacity="0.9" />
          </g>
        ))}
        {/* Kar zemin ve buz tutmuş gölet */}
        <path d="M0 600 Q 400 570 800 600 T 1600 590 L1600 900 L0 900 Z" fill="#f7fbff" />
        <ellipse cx="1080" cy="760" rx="300" ry="60" fill="#bfe3f5" />
        <ellipse cx="1040" cy="750" rx="120" ry="14" fill="#fff" opacity="0.6" />
        {/* Kardan barikat */}
        <path d="M1380 820 q 0 -90 90 -90 q 90 0 90 90 Z" fill="#e8f1fa" />
        {[1400, 1450, 1500].map((x) => (
          <circle key={x} cx={x} cy="760" r="24" fill="#f2f7fc" />
        ))}
        {/* Kardan Nook: yuvarlak gövde, hap gözler, havuç burun */}
        <ellipse cx="300" cy="822" rx="78" ry="14" fill="#dfe9f4" />
        <motion.g key={`sm${beat.i === 0 ? k : 0}`} style={{ transformOrigin: "300px 820px" }} initial={{ scaleY: beat.i === 0 ? 0.6 : 1 }} animate={{ scaleY: 1 }} transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.4 }}>
          <circle cx="300" cy="745" r="80" fill="#fbfdff" />
          <circle cx="300" cy="745" r="80" fill="url(#nk-soft)" opacity="0.4" />
          <rect x="272" y="712" width="13" height="30" rx="6.5" fill="#222" />
          <rect x="315" y="712" width="13" height="30" rx="6.5" fill="#222" />
          <path d="M300 748 l46 8 l-46 9 Z" fill="#ff8a1f" />
          {[-1, 1].map((d) => (
            <line key={d} x1={300 + d * 76} y1="740" x2={300 + d * 118} y2="700" stroke="#6b4a2e" strokeWidth="7" strokeLinecap="round" />
          ))}
        </motion.g>
      </Layer>
      <Drift count={70} from={-30} to={900} dur={[6, 12]} sway={40} render={(i) => <span className="block rounded-full bg-white" style={{ width: 4 + (i % 4) * 2, height: 4 + (i % 4) * 2, opacity: 0.85 }} />} />

      <SnowClock />
      {/* Kardan adam yapan (burnu havuç) */}
      <Actor x={470} y={815} size={98} look={look({ shape: "sphere", texture: "plush" })} color="#FF3B4A" flip expression={beat.i === 0 ? "happy" : "focused"} move={breathe(3)} act={on(beat, 0, hop(14))} actKey={k} front={<motion.g animate={{ x: [0, -2, 0] }} transition={{ duration: 0.7, repeat: Infinity }}><Hand x={-4} y={10} /><Hand x={-2} y={18} /></motion.g>} />
      {/* Atkılı, kulaklıklı dev kartopu yuvarlayan */}
      <motion.div key={`ball${beat.i === 1 ? k : 0}`} className="absolute inset-0" animate={beat.i === 1 ? { x: [0, 160, 160, 0] } : { x: 0 }} transition={{ duration: 6, times: [0, 0.5, 0.75, 1], ease: "easeInOut" }}>
        <Actor x={620} y={830} size={96} look={look({ shape: "bean", head: "headphones" })} color="#2B8CFF" expression="happy" move={breathe(2.4)} front={<><Scarf /><Hand x={26} y={16} /></>} />
        <motion.div className="absolute rounded-full" style={{ left: 690, top: 700, width: 130, height: 130, background: "radial-gradient(circle at 35% 30%, #fff, #dbe8f5)", boxShadow: "0 10px 20px -10px rgba(40,60,90,0.4)" }} animate={{ rotate: beat.i === 1 ? 360 : 0 }} transition={{ duration: 3, ease: "linear" }} />
      </motion.div>
      {/* Barikatın arkasında nişan alan yaramaz */}
      <Actor x={1470} y={760} size={92} look={look({ shape: "cat" })} color="#9B7BFF" flip expression={beat.i === 2 ? "happy" : "focused"} act={beat.i === 2 ? { animate: { y: [20, -20, -20, 20] }, transition: { duration: 1.8, times: [0, 0.2, 0.7, 1] } } : { animate: { y: 20 }, transition: { duration: 0 } }} actKey={k} front={<Hand x={-4} y={4} />} />
      {beat.i === 2 && <motion.span key={`sb${k}`} className="absolute rounded-full bg-white" style={{ left: 1420, top: 680, width: 26, height: 26, boxShadow: "0 2px 6px rgba(40,60,90,0.3)" }} initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: [0, -400, -760], y: [0, -140, 40], opacity: [1, 1, 0] }} transition={{ duration: 1.3, delay: 0.5, ease: "easeOut" }} />}
      {/* Patenle dönerken popo üstü oturan */}
      <Actor
        x={1080}
        y={770}
        size={92}
        look={look({ shape: "egg", head: "bow" })}
        color="#FF9EC4"
        expression={beat.i === 3 ? "dizzy" : "happy"}
        move={{ animate: { rotate: [0, 360] }, transition: { duration: 3, repeat: Infinity, ease: "linear" } }}
        act={beat.i === 3 ? { animate: { y: [0, -20, 18, 18, 0], rotate: [0, 0, -20, -20, 0] }, transition: { duration: 2.6, times: [0, 0.2, 0.35, 0.8, 1] } } : null}
        actKey={k}
        front={<Skates />}
      />
    </Stage>
  );
}

function Scarf() {
  return (
    <g>
      <path d="M1 20 Q12 25 23 20 L23 23.5 Q12 28 1 23.5 Z" fill="#ff3b4a" />
      <path d="M17 23 l3 8 l3 -1 l-2 -8 Z" fill="#e02a3a" />
    </g>
  );
}

function Skates() {
  return (
    <g>
      {[5, 15].map((x) => (
        <g key={x}>
          <rect x={x - 3} y="24" width="7" height="3.4" rx="1.4" fill="#fff" />
          <line x1={x - 3} y1="28.6" x2={x + 4.5} y2="28.6" stroke="#9aa3b8" strokeWidth="0.9" />
        </g>
      ))}
      <Hand x={-4} y={12} />
      <Hand x={28} y={12} />
    </g>
  );
}
