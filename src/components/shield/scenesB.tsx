/**
 * Kalkan sahneleri (6–10): büyücü kütüphanesi, kristal madeni, zen bahçesi, sanat atölyesi, kış.
 */
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { LibraryClock, MineClock, SnowClock, StudioClock, ZenClock } from "./clocks";
import { Actor, breathe, Drift, Hand, hop, Layer, look, on, Painted, Stage, sway, useBeat, W } from "./kit";

// ------------------------------------------------------------------ 6. Gizli kütüphane / büyücü odası

export function Library() {
  const beat = useBeat(4);
  const k = beat.k;
  const spines = ["#7a2e2e", "#2e4a7a", "#3f6b3a", "#6b4a2e", "#5a2e6b", "#8a6a2e"];
  return (
    <Stage medium="canvas" clock="st-c-oil"
      sky="linear-gradient(180deg, #120c0a 0%, #1e1410 60%, #140d0a 100%)"
      lights={[
        { x: 800, y: 700, r: 520, color: "rgba(255,170,80,0.5)", opacity: 0.6, flicker: 0.18 },
        { x: 560, y: 680, r: 300, color: "rgba(93,242,168,0.55)", opacity: 0.55, flicker: 0.25 },
        { x: 1020, y: 700, r: 200, color: "rgba(255,190,100,0.6)", opacity: 0.5, flicker: 0.3 },
        { x: 800, y: 420, r: 420, color: "rgba(140,170,255,0.3)", opacity: 0.5 },
      ]}
    >
      <Painted look="oil" seed={725}>
        <defs>
          <linearGradient id="lb-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1c130f" />
            <stop offset="1" stopColor="#2a1c15" />
          </linearGradient>
          <linearGradient id="lb-night" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b1030" />
            <stop offset="0.7" stopColor="#1e2a5a" />
            <stop offset="1" stopColor="#3a3a6a" />
          </linearGradient>
          <linearGradient id="lb-case" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1a100b" />
            <stop offset="1" stopColor="#2a1a12" />
          </linearGradient>
          <linearGradient id="lb-board" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a5236" />
            <stop offset="1" stopColor="#3e2818" />
          </linearGradient>
          <linearGradient id="lb-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a2416" />
            <stop offset="1" stopColor="#1a0f09" />
          </linearGradient>
          <linearGradient id="lb-shaft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b8c8ff" stopOpacity="0.28" />
            <stop offset="1" stopColor="#b8c8ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lb-pot" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#14141a" />
            <stop offset="0.35" stopColor="#3a3a48" />
            <stop offset="1" stopColor="#101016" />
          </linearGradient>
          <linearGradient id="lb-wood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8a5e3a" />
            <stop offset="1" stopColor="#5a3a22" />
          </linearGradient>
          <radialGradient id="lb-brew" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#c8ffe4" />
            <stop offset="0.5" stopColor="#5df2a8" />
            <stop offset="1" stopColor="#1f9a68" />
          </radialGradient>
        </defs>
        {/* Arka duvar ve ortada sivri kemerli büyük pencere: dışarıda ay ışığı */}
        <rect x="0" y="0" width={W} height="900" fill="url(#lb-wall)" />
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={530 + i * 60} y="0" width="2" height="780" fill="#000" opacity="0.25" />
        ))}
        <g>
          <path d="M650 700 V420 Q650 300 800 270 Q950 300 950 420 V700 Z" fill="#120a07" />
          <path d="M668 690 V425 Q668 318 800 290 Q932 318 932 425 V690 Z" fill="url(#lb-night)" />
          <circle cx="860" cy="380" r="34" fill="#f4eccf" />
          <circle cx="860" cy="380" r="80" fill="#c8d4ff" opacity="0.12" filter="url(#nk-blur)" />
          {[[700, 470], [760, 350], [900, 520], [720, 590], [880, 620], [800, 440]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={1.6} fill="#fff" opacity="0.8" />
          ))}
          {/* Kayıtlar (pencere demirleri) */}
          <g stroke="#120a07" strokeWidth="8">
            <line x1="800" y1="290" x2="800" y2="690" />
            <line x1="668" y1="500" x2="932" y2="500" />
            <path d="M668 425 Q800 380 932 425" fill="none" strokeWidth="6" />
          </g>
          <rect x="636" y="690" width="328" height="22" rx="4" fill="url(#lb-board)" />
        </g>
        {/* Pencereden yere vuran ışık hüzmesi */}
        <polygon points="668,425 932,425 1060,790 560,790" fill="url(#lb-shaft)" filter="url(#nk-blur-s)" />
        {/* Tavana kadar raflar: yan tahtalar, raf gölgeleri, farklı boy ve eğimde kitaplar, araya biblolar */}
        {[0, 1].map((side) => (
          <g key={side} transform={`translate(${side ? 1080 : 0} 0)`}>
            <rect x="0" y="0" width="520" height="790" fill="url(#lb-case)" />
            <rect x={side ? 0 : 500} y="0" width="20" height="790" fill="#3e2818" />
            <rect x={side ? 20 : 496} y="0" width="4" height="790" fill="#000" opacity="0.4" />
            {Array.from({ length: 6 }, (_, r) => {
              const base = 130 + r * 130;
              let cx = 14;
              const books: ReactNode[] = [];
              for (let i = 0; cx < 470; i++) {
                const seed = (i * 7 + r * 13 + side * 5) % 11;
                const w = 18 + (seed % 4) * 5;
                const h = 62 + ((i * 7 + r) % 5) * 9;
                if (seed === 3 && i > 2) {
                  // Biblo: küçük şişe ya da mum
                  books.push(
                    <g key={i}>
                      <rect x={cx + 6} y={base - 34} width="18" height="30" rx="7" fill={r % 2 ? "rgba(140,90,255,0.6)" : "rgba(93,242,168,0.55)"} />
                      <rect x={cx + 11} y={base - 44} width="8" height="12" fill="#c9b98f" />
                      <rect x={cx + 9} y={base - 26} width="6" height="14" rx="3" fill="#fff" opacity="0.35" />
                    </g>,
                  );
                  cx += 34;
                  continue;
                }
                const lean = seed === 7 ? -10 : 0;
                const c = spines[(i + r * 3 + side) % spines.length];
                books.push(
                  <g key={i} transform={lean ? `rotate(${lean} ${cx} ${base})` : undefined}>
                    <rect x={cx} y={base - h} width={w} height={h} rx="2" fill={c} />
                    <rect x={cx} y={base - h} width={w * 0.28} height={h} fill="#fff" opacity="0.1" />
                    <rect x={cx} y={base - h + 10} width={w} height="3" fill="#d9b25a" opacity="0.55" />
                    <rect x={cx} y={base - 16} width={w} height="3" fill="#d9b25a" opacity="0.45" />
                  </g>,
                );
                cx += w + 3 + (lean ? 8 : 0);
              }
              return (
                <g key={r}>
                  <rect x="0" y={base - 110} width="520" height="110" fill="#000" opacity="0.18" />
                  {books}
                  <rect x="0" y={base} width="520" height="16" fill="url(#lb-board)" />
                  <rect x="0" y={base + 16} width="520" height="10" fill="#000" opacity="0.35" />
                </g>
              );
            })}
          </g>
        ))}
        {/* Kalın fırçayla pencereden inen ışık şeritleri ve kitap sırtlarında yaldız dokunuşları */}
        {[[690, 430, 600, 790], [760, 430, 720, 790], [840, 430, 860, 790], [910, 430, 990, 790]].map(([x1, y1, x2, y2], i) => (
          <line key={`sh${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff4d8" strokeWidth={26 - i * 3} strokeLinecap="round" opacity="0.07" />
        ))}
        {Array.from({ length: 120 }, (_, i) => {
          const side = i % 2;
          const x = (side ? 1100 : 20) + ((i * 137) % 470);
          const y = 70 + ((i * 59) % 700);
          return <ellipse key={`gd${i}`} cx={x} cy={y} rx="5" ry="2" fill="#f0c860" opacity="0.55" transform={`rotate(${(i % 7) * 12 - 36} ${x} ${y})`} />;
        })}
        {/* Ahşap zemin ve ortada yuvarlak halı */}
        <rect x="0" y="780" width={W} height="120" fill="url(#lb-floor)" />
        {Array.from({ length: 5 }, (_, i) => (
          <line key={i} x1="0" y1={800 + i * 22} x2={W} y2={800 + i * 22} stroke="#000" strokeOpacity="0.3" strokeWidth="2" />
        ))}
        <ellipse cx="760" cy="830" rx="430" ry="56" fill="#4a1c22" />
        <ellipse cx="760" cy="830" rx="400" ry="48" fill="none" stroke="#c9a24a" strokeWidth="4" strokeDasharray="14 10" opacity="0.6" />
        <ellipse cx="760" cy="830" rx="320" ry="34" fill="#5a2430" />
        <ellipse cx="760" cy="830" rx="200" ry="20" fill="none" stroke="#c9a24a" strokeWidth="3" opacity="0.4" />
        {/* Merdiven */}
        <g strokeLinecap="round">
          <line x1="1130" y1="790" x2="1240" y2="360" stroke="url(#lb-wood)" strokeWidth="14" />
          <line x1="1210" y1="790" x2="1320" y2="360" stroke="url(#lb-wood)" strokeWidth="14" />
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1={1130 + (i + 1) * 12.8} y1={790 - (i + 1) * 50} x2={1210 + (i + 1) * 12.8} y2={790 - (i + 1) * 50} stroke="#7a5236" strokeWidth="8" />
          ))}
        </g>
        {/* Kazan: ayaklar, altında ateş, kenarında parlak iksir */}
        <ellipse cx="560" cy="806" rx="130" ry="18" fill="#000" opacity="0.5" />
        {[480, 640].map((x) => (
          <rect key={x} x={x - 6} y="770" width="12" height="34" rx="4" fill="#1a1a20" />
        ))}
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="lb-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1c130f" />
            <stop offset="1" stopColor="#2a1c15" />
          </linearGradient>
          <linearGradient id="lb-night" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b1030" />
            <stop offset="0.7" stopColor="#1e2a5a" />
            <stop offset="1" stopColor="#3a3a6a" />
          </linearGradient>
          <linearGradient id="lb-case" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1a100b" />
            <stop offset="1" stopColor="#2a1a12" />
          </linearGradient>
          <linearGradient id="lb-board" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a5236" />
            <stop offset="1" stopColor="#3e2818" />
          </linearGradient>
          <linearGradient id="lb-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a2416" />
            <stop offset="1" stopColor="#1a0f09" />
          </linearGradient>
          <linearGradient id="lb-shaft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b8c8ff" stopOpacity="0.28" />
            <stop offset="1" stopColor="#b8c8ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lb-pot" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#14141a" />
            <stop offset="0.35" stopColor="#3a3a48" />
            <stop offset="1" stopColor="#101016" />
          </linearGradient>
          <linearGradient id="lb-wood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8a5e3a" />
            <stop offset="1" stopColor="#5a3a22" />
          </linearGradient>
          <radialGradient id="lb-brew" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#c8ffe4" />
            <stop offset="0.5" stopColor="#5df2a8" />
            <stop offset="1" stopColor="#1f9a68" />
          </radialGradient>
        </defs>
        {[530, 560, 590].map((x, i) => (
          <motion.path key={x} d={`M${x} 800 q-14 -16 0 -40 q14 24 0 40`} fill={i === 1 ? "#ffcf5a" : "#ff7a2a"} style={{ transformOrigin: `${x}px 800px` }} animate={{ scaleY: [1, 1.25, 0.9, 1] }} transition={{ duration: 0.5 + i * 0.12, repeat: Infinity }} />
        ))}
      </Layer>
      <Painted look="oil" seed={725}>
        <defs>
          <linearGradient id="lb-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1c130f" />
            <stop offset="1" stopColor="#2a1c15" />
          </linearGradient>
          <linearGradient id="lb-night" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b1030" />
            <stop offset="0.7" stopColor="#1e2a5a" />
            <stop offset="1" stopColor="#3a3a6a" />
          </linearGradient>
          <linearGradient id="lb-case" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1a100b" />
            <stop offset="1" stopColor="#2a1a12" />
          </linearGradient>
          <linearGradient id="lb-board" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a5236" />
            <stop offset="1" stopColor="#3e2818" />
          </linearGradient>
          <linearGradient id="lb-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a2416" />
            <stop offset="1" stopColor="#1a0f09" />
          </linearGradient>
          <linearGradient id="lb-shaft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b8c8ff" stopOpacity="0.28" />
            <stop offset="1" stopColor="#b8c8ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lb-pot" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#14141a" />
            <stop offset="0.35" stopColor="#3a3a48" />
            <stop offset="1" stopColor="#101016" />
          </linearGradient>
          <linearGradient id="lb-wood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8a5e3a" />
            <stop offset="1" stopColor="#5a3a22" />
          </linearGradient>
          <radialGradient id="lb-brew" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#c8ffe4" />
            <stop offset="0.5" stopColor="#5df2a8" />
            <stop offset="1" stopColor="#1f9a68" />
          </radialGradient>
        </defs>
        <path d="M450 690 h220 q0 120 -110 120 q-110 0 -110 -120 Z" fill="url(#lb-pot)" />
        <path d="M470 720 q90 50 180 0" stroke="#5df2a8" strokeOpacity="0.25" strokeWidth="3" fill="none" />
        <ellipse cx="560" cy="690" rx="114" ry="23" fill="#4a4a58" />
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="lb-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1c130f" />
            <stop offset="1" stopColor="#2a1c15" />
          </linearGradient>
          <linearGradient id="lb-night" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b1030" />
            <stop offset="0.7" stopColor="#1e2a5a" />
            <stop offset="1" stopColor="#3a3a6a" />
          </linearGradient>
          <linearGradient id="lb-case" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1a100b" />
            <stop offset="1" stopColor="#2a1a12" />
          </linearGradient>
          <linearGradient id="lb-board" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a5236" />
            <stop offset="1" stopColor="#3e2818" />
          </linearGradient>
          <linearGradient id="lb-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a2416" />
            <stop offset="1" stopColor="#1a0f09" />
          </linearGradient>
          <linearGradient id="lb-shaft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b8c8ff" stopOpacity="0.28" />
            <stop offset="1" stopColor="#b8c8ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lb-pot" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#14141a" />
            <stop offset="0.35" stopColor="#3a3a48" />
            <stop offset="1" stopColor="#101016" />
          </linearGradient>
          <linearGradient id="lb-wood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8a5e3a" />
            <stop offset="1" stopColor="#5a3a22" />
          </linearGradient>
          <radialGradient id="lb-brew" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#c8ffe4" />
            <stop offset="0.5" stopColor="#5df2a8" />
            <stop offset="1" stopColor="#1f9a68" />
          </radialGradient>
        </defs>
        <motion.ellipse cx="560" cy="692" rx="98" ry="16" fill="url(#lb-brew)" filter="url(#nk-bloom)" animate={{ opacity: [0.8, 1, 0.8] }} transition={{ duration: 1.6, repeat: Infinity }} />
        {/* Mumlar: eriyen mumlar, damlalar */}
        {[[760, 780], [820, 790], [1020, 780]].map(([x, y], i) => (
          <g key={i}>
            <ellipse cx={x} cy={y + 2} rx="22" ry="5" fill="#000" opacity="0.4" />
            <rect x={x - 11} y={y - 60} width="22" height="60" rx="4" fill="#f3ead6" />
            <rect x={x - 11} y={y - 60} width="7" height="60" rx="3" fill="#fff" opacity="0.5" />
            <path d={`M${x + 4} ${y - 60} q2 14 0 22 q-2 4 -4 0 q-1 -8 0 -22 Z`} fill="#e6dbbf" />
            <circle cx={x} cy={y - 72} r="18" fill="#ffcf5a" opacity="0.25" filter="url(#nk-blur-s)" />
            <motion.path d={`M${x} ${y - 84} q-8 12 0 22 q8 -9 0 -22`} fill="#ffcf5a" animate={{ scaleY: [1, 1.2, 0.9, 1] }} transition={{ duration: 0.6 + i * 0.1, repeat: Infinity }} style={{ transformOrigin: `${x}px ${y - 62}px` }} />
            <path d={`M${x} ${y - 74} q-3 5 0 9 q3 -4 0 -9`} fill="#fffbe0" />
          </g>
        ))}
      </Layer>
      {/* Işık hüzmesinde süzülen toz */}
      <Drift
        count={22}
        xs={[640, 1000]}
        from={420}
        to={800}
        dur={[14, 22]}
        sway={40}
        render={(i) => <span className="block rounded-full bg-white" style={{ width: 3, height: 3, opacity: 0.25 + (i % 3) * 0.12 }} />}
      />
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
      <Actor morph={beat.n[0]} morphDelay={1000} x={420} y={790} size={110} look={look({ shape: "sphere", head: "witch" })} color="#6B4BFF" flip expression={beat.i === 0 ? "surprised" : "focused"} move={sway(3, 3)} act={on(beat, 0, hop(18))} actKey={k} front={<Potion pour={beat.i === 0} k={k} />} />
      {/* Merdivenin tepesinde büyü kitabı inceleyen */}
      <Actor shadow={false} x={1250} y={440} size={98} look={look({ shape: "triangle", glasses: "round" })} color="#FF8A1F" expression={beat.i === 1 ? "surprised" : "focused"} move={sway(4, 2)} act={on(beat, 1, { animate: { rotate: [0, -10, 10, 0] }, transition: { duration: 1.2 } })} actKey={k} front={<Tome />} />
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
  /** Kristal kümesi: birkaç faset, açık-koyu yüzler, uçta parıltı. s<0 tavandan sarkar. */
  const crystal = (x: number, y: number, s: number, c: string, key: number) => {
    const one = (dx: number, len: number, tilt: number, j: number) => {
      const t = `rotate(${tilt} ${x + dx} ${y})`;
      const w = 16 * Math.abs(s) * (len > 50 ? 1 : 0.8);
      const L = len * s;
      return (
        <g key={j} transform={t}>
          <polygon points={`${x + dx},${y - L} ${x + dx + w},${y - L * 0.68} ${x + dx + w * 0.7},${y} ${x + dx - w * 0.7},${y} ${x + dx - w},${y - L * 0.68}`} fill={c} />
          <polygon points={`${x + dx},${y - L} ${x + dx - w},${y - L * 0.68} ${x + dx - w * 0.7},${y} ${x + dx},${y}`} fill="#000" opacity="0.28" />
          <polygon points={`${x + dx},${y - L} ${x + dx + w},${y - L * 0.68} ${x + dx + w * 0.2},${y - L * 0.6}`} fill="#fff" opacity="0.55" />
        </g>
      );
    };
    return (
      <motion.g key={key} animate={{ opacity: [0.82, 1, 0.82] }} transition={{ duration: 2 + (key % 3), repeat: Infinity }}>
        <ellipse cx={x} cy={y - 30 * s} rx={70 * Math.abs(s)} ry={70 * Math.abs(s)} fill={c} opacity="0.22" filter="url(#nk-blur)" />
        {one(-22 * Math.abs(s), 40, -24, 0)}
        {one(20 * Math.abs(s), 46, 20, 1)}
        {one(0, 64, 0, 2)}
        <motion.circle cx={x} cy={y - 64 * s} r={3} fill="#fff" animate={{ opacity: [0, 1, 0], scale: [0.4, 1.4, 0.4] }} transition={{ duration: 2.4, repeat: Infinity, delay: key * 0.6, repeatDelay: 2 }} style={{ transformOrigin: `${x}px ${y - 64 * s}px` }} />
      </motion.g>
    );
  };
  return (
    <Stage clock="st-soft3d"
      sky="radial-gradient(70% 70% at 50% 46%, #0a1418 0%, #050a0d 60%, #020507 100%)"
      lights={[
        { x: 200, y: 470, r: 360, color: "rgba(47,212,192,0.5)", opacity: 0.55, flicker: 0.1 },
        { x: 1380, y: 450, r: 380, color: "rgba(92,225,230,0.5)", opacity: 0.55, flicker: 0.1 },
        { x: 800, y: 140, r: 300, color: "rgba(47,212,192,0.35)", opacity: 0.5 },
        { x: 360, y: 700, r: 260, color: "rgba(255,190,90,0.55)", opacity: 0.55, flicker: 0.25 },
        { x: 1110, y: 330, r: 220, color: "rgba(255,190,90,0.5)", opacity: 0.45, flicker: 0.2 },
      ]}
    >
      <Painted look="puff" seed={393}>
        <defs>
          <radialGradient id="mn-tunnel" cx="50%" cy="55%" r="55%">
            <stop offset="0" stopColor="#000" />
            <stop offset="0.6" stopColor="#081216" />
            <stop offset="1" stopColor="#10232a" />
          </radialGradient>
          <linearGradient id="mn-rock-l" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#081419" />
            <stop offset="0.8" stopColor="#163038" />
            <stop offset="1" stopColor="#21444c" />
          </linearGradient>
          <linearGradient id="mn-rock-r" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#081419" />
            <stop offset="0.8" stopColor="#163038" />
            <stop offset="1" stopColor="#21444c" />
          </linearGradient>
          <linearGradient id="mn-ceil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#060e12" />
            <stop offset="1" stopColor="#14282f" />
          </linearGradient>
          <linearGradient id="mn-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1e3036" />
            <stop offset="1" stopColor="#0a1418" />
          </linearGradient>
          <linearGradient id="mn-beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3a2414" />
            <stop offset="0.4" stopColor="#7a5232" />
            <stop offset="1" stopColor="#3a2414" />
          </linearGradient>
          <linearGradient id="mn-rail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d4dce6" />
            <stop offset="1" stopColor="#5a6470" />
          </linearGradient>
        </defs>
          {/* Derinlere giden tünel: iç içe karanlaşan kemerler */}
          <path d="M300 900 L300 360 Q300 150 800 130 Q1300 150 1300 360 L1300 900 Z" fill="url(#mn-tunnel)" />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${420 + i * 90} 780 L${420 + i * 90} ${400 + i * 40} Q${420 + i * 90} ${250 + i * 40} 800 ${235 + i * 40} Q${1180 - i * 90} ${250 + i * 40} ${1180 - i * 90} ${400 + i * 40} L${1180 - i * 90} 780`} fill="none" stroke="#3a2414" strokeOpacity={0.5 - i * 0.14} strokeWidth={22 - i * 6} />
          ))}
          {/* Uzaktaki raylar tünele doğru daralır */}
          <polygon points="700,780 900,780 830,560 770,560" fill="#0d1a1f" opacity="0.8" />
          <line x1="720" y1="780" x2="785" y2="560" stroke="#5a6470" strokeWidth="3" opacity="0.6" />
          <line x1="880" y1="780" x2="815" y2="560" stroke="#5a6470" strokeWidth="3" opacity="0.6" />
          {/* Uzaktan gelen sıcak bir fener ışığı */}
          <circle cx="800" cy="520" r="40" fill="#ffb84a" opacity="0.18" filter="url(#nk-blur)" />
          <circle cx="800" cy="520" r="4" fill="#ffd27a" />
          {/* Mağara duvarları ve tavan: girintili çıkıntılı kaya */}
          <path d="M0 0 L0 900 L280 900 Q200 780 250 640 Q190 520 270 400 Q210 260 300 160 Q200 80 0 0 Z" fill="url(#mn-rock-l)" />
          <path d="M1600 0 L1600 900 L1320 900 Q1400 780 1350 640 Q1410 520 1330 400 Q1390 260 1300 160 Q1400 80 1600 0 Z" fill="url(#mn-rock-r)" />
          <path d="M0 0 H1600 V110 Q1450 170 1300 150 Q1150 210 980 160 Q860 200 800 170 Q700 205 590 165 Q420 210 300 150 Q140 175 0 110 Z" fill="url(#mn-ceil)" />
          {/* Low-poly kaya: duvarlar üçgen fasetlere bölünür, her faset farklı tonda */}
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 3 }, (_, c) => {
              const x0 = c * 90;
              const y0 = 160 + r * 92;
              const sh = ["#163038", "#1d3c44", "#244850", "#12282e", "#2a5058"];
              return (
                <g key={`lp${r}-${c}`}>
                  <polygon points={`${x0},${y0} ${x0 + 90},${y0 + 20} ${x0 + 30},${y0 + 92}`} fill={sh[(r + c) % 5]} />
                  <polygon points={`${x0 + 90},${y0 + 20} ${x0 + 30},${y0 + 92} ${x0 + 100},${y0 + 110}`} fill={sh[(r + c + 2) % 5]} />
                  <polygon points={`${1600 - x0},${y0} ${1510 - x0},${y0 + 20} ${1570 - x0},${y0 + 92}`} fill={sh[(r + c + 1) % 5]} />
                  <polygon points={`${1510 - x0},${y0 + 20} ${1570 - x0},${y0 + 92} ${1500 - x0},${y0 + 110}`} fill={sh[(r + c + 3) % 5]} />
                </g>
              );
            }),
          )}
          {/* Kayadaki çatlak ve çıkıntılar */}
          {[[90, 300], [160, 560], [60, 720], [1500, 260], [1440, 600], [1540, 760]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y} l 30 -20 l 26 14 l -10 22 l -30 6 Z`} fill="#21444c" opacity="0.5" />
          ))}
          {/* Sarkıtlar */}
          {[[340, 150, 50], [460, 175, 34], [650, 175, 40], [960, 175, 46], [1150, 190, 30], [1250, 160, 54]].map(([x, y, h], i) => (
            <path key={i} d={`M${x - 14} ${y - 8} Q${x} ${y + h} ${x + 2} ${y + h} Q${x + 4} ${y + h * 0.6} ${x + 14} ${y - 8} Z`} fill="#14282f" />
          ))}
          {/* Ahşap destek kirişleri */}
          {[250, 1350].map((x) => (
            <g key={x}>
              <rect x={x - 16} y="250" width="32" height="540" fill="url(#mn-beam)" />
              <rect x={x - 16} y="250" width="32" height="540" fill="#000" opacity="0.15" />
            </g>
          ))}
          <rect x="220" y="236" width="1160" height="34" rx="4" fill="url(#mn-beam)" />
          <rect x="220" y="266" width="1160" height="8" fill="#000" opacity="0.35" />
          {/* Kirişe asılı fener teli */}
          <path d="M260 274 Q 680 330 1110 300" stroke="#1a1a1a" strokeWidth="2" fill="none" />
      </Painted>
      <Layer>
        <defs>
          <radialGradient id="mn-tunnel" cx="50%" cy="55%" r="55%">
            <stop offset="0" stopColor="#000" />
            <stop offset="0.6" stopColor="#081216" />
            <stop offset="1" stopColor="#10232a" />
          </radialGradient>
          <linearGradient id="mn-rock-l" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#081419" />
            <stop offset="0.8" stopColor="#163038" />
            <stop offset="1" stopColor="#21444c" />
          </linearGradient>
          <linearGradient id="mn-rock-r" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#081419" />
            <stop offset="0.8" stopColor="#163038" />
            <stop offset="1" stopColor="#21444c" />
          </linearGradient>
          <linearGradient id="mn-ceil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#060e12" />
            <stop offset="1" stopColor="#14282f" />
          </linearGradient>
          <linearGradient id="mn-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1e3036" />
            <stop offset="1" stopColor="#0a1418" />
          </linearGradient>
          <linearGradient id="mn-beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3a2414" />
            <stop offset="0.4" stopColor="#7a5232" />
            <stop offset="1" stopColor="#3a2414" />
          </linearGradient>
          <linearGradient id="mn-rail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d4dce6" />
            <stop offset="1" stopColor="#5a6470" />
          </linearGradient>
        </defs>
        {[[480, 302], [700, 314], [920, 310], [1110, 300]].map(([x, y], i) => (
          <g key={i}>
            <motion.circle cx={x} cy={y + 12} r="9" fill="#ffd27a" filter="url(#nk-bloom)" animate={{ opacity: [0.8, 1, 0.8] }} transition={{ duration: 1.4 + i * 0.3, repeat: Infinity }} />
            <rect x={x - 4} y={y} width="8" height="6" fill="#2a2a2a" />
          </g>
        ))}
      </Layer>
      <Painted look="puff" seed={393}>
        <defs>
          <radialGradient id="mn-tunnel" cx="50%" cy="55%" r="55%">
            <stop offset="0" stopColor="#000" />
            <stop offset="0.6" stopColor="#081216" />
            <stop offset="1" stopColor="#10232a" />
          </radialGradient>
          <linearGradient id="mn-rock-l" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#081419" />
            <stop offset="0.8" stopColor="#163038" />
            <stop offset="1" stopColor="#21444c" />
          </linearGradient>
          <linearGradient id="mn-rock-r" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#081419" />
            <stop offset="0.8" stopColor="#163038" />
            <stop offset="1" stopColor="#21444c" />
          </linearGradient>
          <linearGradient id="mn-ceil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#060e12" />
            <stop offset="1" stopColor="#14282f" />
          </linearGradient>
          <linearGradient id="mn-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1e3036" />
            <stop offset="1" stopColor="#0a1418" />
          </linearGradient>
          <linearGradient id="mn-beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3a2414" />
            <stop offset="0.4" stopColor="#7a5232" />
            <stop offset="1" stopColor="#3a2414" />
          </linearGradient>
          <linearGradient id="mn-rail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d4dce6" />
            <stop offset="1" stopColor="#5a6470" />
          </linearGradient>
        </defs>
          {/* Kristaller */}
          {[[180, 500, 1.6, "#2fd4c0"], [260, 520, 1, "#5ce1e6"], [1380, 470, 1.8, "#2fd4c0"], [1300, 520, 1.1, "#7af0ff"], [520, 140, -1.2, "#2fd4c0"], [1090, 150, -1.4, "#5ce1e6"], [420, 160, -1, "#7af0ff"]].map(([x, y, s, c], i) =>
            crystal(x as number, y as number, s as number, c as string, i),
          )}
          {/* Zemin, çakıllar ve raylar */}
          <path d="M0 760 Q 800 724 1600 760 L1600 900 L0 900 Z" fill="url(#mn-floor)" />
          {[[120, 830, 18], [340, 860, 12], [560, 840, 9], [1020, 850, 14], [1250, 830, 10], [1480, 860, 16], [900, 870, 8]].map(([x, y, r], i) => (
            <g key={i}>
              <ellipse cx={x} cy={y + r * 0.5} rx={r * 1.3} ry={r * 0.4} fill="#000" opacity="0.35" />
              <ellipse cx={x} cy={y} rx={r * 1.2} ry={r * 0.8} fill="#2a3c42" />
              <ellipse cx={x - r * 0.3} cy={y - r * 0.3} rx={r * 0.5} ry={r * 0.3} fill="#4a6068" opacity="0.6" />
            </g>
          ))}
          {Array.from({ length: 18 }, (_, i) => (
            <g key={i}>
              <rect x={90 + i * 80} y={784} width="50" height="14" rx="2" fill="#4a2e1a" />
              <rect x={90 + i * 80} y={784} width="50" height="4" fill="#7a5232" opacity="0.6" />
            </g>
          ))}
          <rect x="0" y="779" width={W} height="7" fill="url(#mn-rail)" />
          <rect x="0" y="793" width={W} height="7" fill="url(#mn-rail)" />
      </Painted>
      {/* Havada asılı, kristal ışığında parlayan toz */}
      <Drift
        count={18}
        from={900}
        to={150}
        dur={[16, 26]}
        sway={60}
        render={(i) => <span className="block rounded-full" style={{ width: 3, height: 3, background: i % 2 ? "#9ff6ff" : "#fff", opacity: 0.35, boxShadow: "0 0 6px rgba(120,240,255,0.7)" }} />}
      />
      {/* Kristale vurulunca kıvılcımlar */}
      {beat.i === 0 &&
        Array.from({ length: 10 }, (_, i) => (
          <motion.span key={`${i}-${k}`} className="absolute h-2 w-2 rounded-full bg-[#9ff6ff]" style={{ left: 1290, top: 450, boxShadow: "0 0 10px #2fd4c0" }} animate={{ x: Math.cos(i) * 90, y: Math.sin(i) * 70 - 30, opacity: [1, 0] }} transition={{ duration: 0.8, delay: 0.3 + (i % 3) * 0.4 }} />
        ))}

      <MineClock />
      {/* Baretli kazmacı */}
      <Actor x={1220} y={770} size={108} look={look({ shape: "cube", head: "hardhat" })} color="#FFD21F" flip={false} expression="focused" move={breathe(3)} front={<><Pickaxe k={k} hit={beat.i === 0} /></>} />
      {/* Maden arabasında "hızlı git" diyen */}
      <motion.div className="absolute inset-0" animate={beat.i === 1 ? { x: [0, -260, -260, 0] } : { x: 0 }} transition={{ duration: 4, times: [0, 0.35, 0.7, 1], ease: "easeInOut" }} key={`cart${beat.i === 1 ? k : 0}`}>
        <Actor shadow={false} morph={beat.n[1]} morphDelay={1400} x={760} y={745} size={96} look={look({ shape: "bean", head: "cap" })} color="#FF6A3D" expression="happy" move={{ animate: { y: [0, -3, 0] }, transition: { duration: 0.4, repeat: Infinity } }} front={<><Hand x={-4} y={2} /><Hand x={28} y={-2} /></>} />
        <Painted look="puff" seed={393}>
          <defs>
            <linearGradient id="mn-cart" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#8a6a4a" />
              <stop offset="0.5" stopColor="#6a4a32" />
              <stop offset="1" stopColor="#3a2818" />
            </linearGradient>
          </defs>
            <ellipse cx="760" cy="800" rx="100" ry="10" fill="#000" opacity="0.45" />
            <path d="M680 700 h160 l-16 76 h-128 Z" fill="url(#mn-cart)" />
            {[720, 760, 800].map((x) => (
              <line key={x} x1={x} y1="708" x2={x - (x - 760) * 0.2} y2="774" stroke="#2a1a10" strokeWidth="3" opacity="0.5" />
            ))}
            <path d="M688 730 h144 M694 756 h132" stroke="#9aa4b0" strokeWidth="5" />
            {[[700, 730], [820, 730], [706, 756], [814, 756]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="2.5" fill="#d4dce6" />
            ))}
            <rect x="676" y="696" width="168" height="12" rx="4" fill="#a8b2be" />
            <rect x="676" y="696" width="168" height="4" rx="2" fill="#fff" opacity="0.4" />
            {/* Arabadaki kristal yükü */}
            {[[715, 698, "#2fd4c0"], [745, 694, "#7af0ff"], [790, 698, "#5ce1e6"]].map(([x, y, c], i) => (
              <polygon key={i} points={`${x},${(y as number) - 22} ${(x as number) + 10},${(y as number) - 4} ${(x as number) - 10},${(y as number) - 4}`} fill={c as string} opacity="0.9" />
            ))}
        </Painted>
        <Layer>
          <defs>
            <linearGradient id="mn-cart" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#8a6a4a" />
              <stop offset="0.5" stopColor="#6a4a32" />
              <stop offset="1" stopColor="#3a2818" />
            </linearGradient>
          </defs>
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
    <Stage clock="st-c-wc"
      sky="linear-gradient(180deg, #f6dccb 0%, #f9e6d6 38%, #fbf1e4 62%, #f7efe2 100%)"
      medium="watercolor"
      grain={false}
      vignette={0.1}
      lights={[{ x: 600, y: 300, r: 700, color: "rgba(255,226,190,0.5)", opacity: 0.45 }]}
    >
      {/* Gökyüzü: ıslak üstüne ıslak, birbirine akan geniş fırça darbeleri */}
      <Painted filter="st-wc-soft">
        <ellipse cx="400" cy="120" rx="620" ry="170" fill="#f4a088" opacity="0.6" />
        <ellipse cx="1180" cy="90" rx="560" ry="150" fill="#9fbde8" opacity="0.65" />
        <ellipse cx="900" cy="260" rx="520" ry="110" fill="#f9c6a8" opacity="0.6" />
        <ellipse cx="600" cy="300" rx="190" ry="190" fill="#fff4dc" opacity="0.9" />
        <ellipse cx="1400" cy="300" rx="300" ry="90" fill="#e7cde6" opacity="0.45" />
      </Painted>
      {/* Uzak planlar: soluk dağlar, pagoda, sis; yakın tepeler; sakura; bahçe */}
      <Painted filter="st-wc">
        <circle cx="600" cy="300" r="78" fill="#fff8e8" opacity="0.95" />
        <path d="M0 470 L140 400 L260 430 L420 330 L560 410 L700 360 L860 440 L1020 350 L1180 420 L1340 360 L1600 430 L1600 600 L0 600 Z" fill="#8a9fd0" opacity="0.8" />
        <path d="M420 330 L470 360 L455 362 L520 400 L380 400 L395 378 L370 370 Z" fill="#f6f2ee" opacity="0.8" />
        <path d="M1020 350 L1060 374 L1040 376 L1090 410 L960 404 L990 384 L975 378 Z" fill="#f6f2ee" opacity="0.75" />
        {/* Uzak tepede pagoda silueti */}
        <g fill="#8a90b4" opacity="0.8">
          <rect x="1244" y="372" width="12" height="70" />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${1218 + i * 6} ${430 - i * 18} h${64 - i * 12} l-10 -8 h${-44 + i * 12} Z`} />
          ))}
        </g>
        <path d="M0 520 Q 200 470 380 500 T 760 480 T 1160 500 T 1600 470 L1600 620 L0 620 Z" fill="#78ad84" opacity="0.85" />
        {/* Yakın tepede çam siluetleri */}
        {[[60, 520, 70], [130, 506, 90], [1450, 486, 84], [1540, 500, 70]].map(([x, y, h], i) => (
          <g key={i} fill="#3f6e58" opacity="0.9">
            <path d={`M${x} ${y - h} q 26 30 34 ${h * 0.55} q -16 -6 -20 -2 q 14 18 22 ${h * 0.35} h -72 q 8 -17 22 -35 q -4 -4 -20 2 q 8 -25 34 ${-h * 0.55} Z`} />
          </g>
        ))}
        {/* Tırmıklanmış çakıl zemini: sıcak krem, lavanta gölgeler */}
        <path d="M0 600 Q 400 586 800 598 T 1600 594 L1600 900 L0 900 Z" fill="#efe1cc" opacity="0.95" />
        <path d="M0 760 Q 500 720 1000 760 T 1600 740 L1600 900 L0 900 Z" fill="#d9c9e0" opacity="0.35" />
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M0 ${632 + i * 30} Q 400 ${622 + i * 30} 800 ${632 + i * 30} T 1600 ${632 + i * 30}`} stroke="#bba98e" strokeWidth="3" fill="none" opacity="0.55" />
        ))}
        {/* Taş fener */}
        <g transform="translate(720 20)">
          <rect x="166" y="560" width="28" height="60" fill="#9a9aa6" />
          <rect x="146" y="520" width="68" height="44" rx="4" fill="#a6a6b2" />
          <rect x="162" y="530" width="36" height="24" fill="#ffd27a" />
          <path d="M126 524 L180 488 L234 524 Z" fill="#7e7e8c" />
          <circle cx="180" cy="482" r="8" fill="#7e7e8c" />
          <rect x="150" y="616" width="60" height="12" rx="3" fill="#7e7e8c" />
        </g>
        {/* Sakura: koyu gövde, üst üste binen saydam pembe katmanlar */}
        <path d="M1380 830 C 1360 640, 1420 520, 1340 380 M1372 520 C 1300 470, 1240 470, 1196 420 M1352 432 C 1400 380 1460 380 1494 340" stroke="#5a3c3a" strokeWidth="24" fill="none" strokeLinecap="round" />
        {[[1300, 330, 120], [1200, 400, 92], [1432, 380, 100], [1350, 258, 84], [1492, 318, 72], [1148, 360, 62], [1250, 250, 72]].map(([x, y, r], i) => (
          <g key={i}>
            <circle cx={x + 10} cy={y + 14} r={r} fill="#e2759a" opacity="0.6" />
            <circle cx={x} cy={y} r={r * 0.92} fill="#f597b6" opacity="0.65" />
            <circle cx={x - r * 0.25} cy={y - r * 0.25} r={r * 0.55} fill="#fde0ea" opacity="0.7" />
          </g>
        ))}
        {/* Yosunlu basamak taşları ve ortadaki kaya */}
        {[[620, 860], [760, 880], [140, 840]].map(([x, y], i) => (
          <g key={`st${i}`}>
            <ellipse cx={x} cy={y + 8} rx="58" ry="14" fill="#8a7aa0" opacity="0.35" />
            <ellipse cx={x} cy={y} rx="52" ry="16" fill="#a3a2ae" />
            <ellipse cx={x - 14} cy={y - 6} rx="20" ry="6" fill="#8fae6a" opacity="0.85" />
          </g>
        ))}
        <ellipse cx="480" cy="770" rx="60" ry="14" fill="#8a7aa0" opacity="0.35" />
        <ellipse cx="480" cy="755" rx="50" ry="22" fill="#9c9ba8" />
        <ellipse cx="466" cy="744" rx="22" ry="8" fill="#8fae6a" opacity="0.85" />
        {/* Bambu çeşmenin direkleri, havuz, çay masası */}
        <ellipse cx="1240" cy="800" rx="100" ry="26" fill="#8a8a98" />
        <ellipse cx="1240" cy="792" rx="82" ry="18" fill="#7fb2c6" />
        <rect x="1080" y="640" width="14" height="140" fill="#86a454" />
        <rect x="1180" y="660" width="14" height="120" fill="#86a454" />
        <path d="M1260 600 q-30 0 -40 50" stroke="#86a454" strokeWidth="12" fill="none" />
        <rect x="700" y="770" width="220" height="16" rx="6" fill="#6a4238" />
        <rect x="720" y="786" width="14" height="30" fill="#6a4238" />
        <rect x="886" y="786" width="14" height="30" fill="#6a4238" />
      </Painted>
      {/* Hareketli parçalar: tırmık izleri, bambu, havuz halkaları */}
      <Layer>
        {[0, 1, 2].map((i) => (
          <motion.ellipse key={`${i}-${beat.i === 0 ? k : 0}`} cx="480" cy="760" rx={70 + i * 34} ry={22 + i * 11} fill="none" stroke="#b7a48a" strokeOpacity="0.7" strokeWidth="3" initial={{ pathLength: beat.i === 0 ? 0 : 1 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: i * 0.3 }} />
        ))}
        <motion.g key={`bam${beat.i === 3 ? k : 0}`} style={{ transformOrigin: "1137px 660px" }} animate={beat.i === 3 ? { rotate: [-12, 18, 18, -12] } : { rotate: -12 }} transition={{ duration: 2, times: [0, 0.3, 0.5, 1] }}>
          <rect x="1040" y="652" width="200" height="22" rx="10" fill="#a3c060" />
          <rect x="1040" y="652" width="200" height="7" rx="3" fill="#d6ea9a" opacity="0.7" />
        </motion.g>
        {[0, 1].map((i) => (
          <motion.ellipse key={i} cx="1250" cy="792" rx="60" ry="14" fill="none" stroke="#fff" strokeWidth="2" style={{ transformOrigin: "1250px 792px" }} initial={{ scale: 0.17 }} animate={{ scale: [0.17, 1], opacity: [0.7, 0] }} transition={{ duration: 3, repeat: Infinity, delay: i * 1.5 }} />
        ))}
      </Layer>
      <Drift count={26} from={240} to={900} xs={[900, 1600]} dur={[7, 12]} sway={120} rotate={260} render={(i) => <span className="block h-3 w-4 rounded-[60%_10%_60%_10%]" style={{ background: i % 2 ? "#f6a9c2" : "#fbd0de", opacity: 0.85 }} />} />

      <ZenClock />
      {/* Tırmıkla daire çizen */}
      <Actor x={340} y={800} size={100} look={look({ shape: "sphere", head: "sprout" })} color="#8FE03A" expression="focused" move={sway(3, 3)} act={on(beat, 0, { animate: { x: [0, 30, 0] }, transition: { duration: 2 } })} actKey={k} front={<Rake />} />
      {/* Meditasyon yapan; kafasına yaprak düşer */}
      <Actor x={620} y={800} size={104} look={look({ shape: "egg" })} color="#F4F4F6" expression="sleepy" move={breathe(5, 3)} front={<><Hand x={-3} y={20} /><Hand x={27} y={20} />{beat.i === 1 && <motion.path key={k} d="M10 -4 q3 -3 6 0 q-3 3 -6 0" fill="#ffb7cf" initial={{ y: -40, x: 10, rotate: 0 }} animate={{ y: [-40, 0], x: [10, -4, 2], rotate: [0, 200] }} transition={{ duration: 2.4 }} />}</>} />
      {/* Çay kasesine sarılan */}
      <Actor x={810} y={772} size={92} look={look({ shape: "bean", texture: "matte" })} color="#2FD4C0" expression={beat.i === 2 ? "happy" : "sleepy"} move={breathe(3.6)} act={on(beat, 2, { animate: { rotate: [0, -8, 0] }, transition: { duration: 1.4 } })} actKey={k} front={<TeaBowl />} />
      {/* Bambu çeşmeyi pür dikkat izleyen */}
      <Actor morph={beat.n[3]} morphDelay={300} x={990} y={800} size={96} look={look({ shape: "cat" })} color="#FF8A1F" expression={beat.i === 3 ? "surprised" : "focused"} move={sway(4, 2)} act={on(beat, 3, hop(22))} actKey={k} />
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

/**
 * Yırtık kenarlı kâğıt dikdörtgeni: kenarlar tohumlu küçük sapmalarla tırtıklı. `j`: tırtık derinliği.
 */
function torn(x: number, y: number, w: number, h: number, seed: number, j: number) {
  let s = seed * 9301 + 49297;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280 - 0.5) * 2 * j;
  const pts: string[] = [];
  const step = 14;
  for (let t = 0; t <= w; t += step) pts.push(`${(x + t).toFixed(1)},${(y + r()).toFixed(1)}`);
  for (let t = 0; t <= h; t += step) pts.push(`${(x + w + r()).toFixed(1)},${(y + t).toFixed(1)}`);
  for (let t = w; t >= 0; t -= step) pts.push(`${(x + t).toFixed(1)},${(y + h + r()).toFixed(1)}`);
  for (let t = h; t >= 0; t -= step) pts.push(`${(x + r()).toFixed(1)},${(y + t).toFixed(1)}`);
  return `M${pts.join(" L")} Z`;
}

export function Studio() {
  const beat = useBeat(4);
  const k = beat.k;
  const paint = ["#ff3b4a", "#2b8cff", "#ffd21f", "#16c47f", "#e23bd6", "#ff8a1f"];
  return (
    <Stage clock="st-paper"
      sky="#efe6d6"
      vignette={0.25}
      grain={false}
      lights={[{ x: 1300, y: 300, r: 700, color: "rgba(255,244,214,0.55)", opacity: 0.5 }]}
    >
      {/* Kesik kâğıt kolaj: her parça ayrı kâğıt, yırtık kenarlı, altında gölge (look="paper") */}
      <Painted look="paper" seed={632}>
        {/* Duvar: üst üste yapıştırılmış büyük renkli kâğıtlar */}
        <path d={torn(-20, -20, 900, 740, 1, 10)} fill="#f3d9c4" />
        <path d={torn(820, -20, 820, 740, 2, 10)} fill="#e8e0f4" />
        <path d={torn(-20, 600, 1660, 120, 3, 6)} fill="#e6d2b8" />
        {/* Pencere: koyu kâğıttan çerçeve, içi yırtık mavi kâğıtlar, kesik bulutlar ve güneş */}
        <path d={torn(1066, 46, 468, 448, 4, 5)} fill="#5a4a6a" />
        <path d={torn(1086, 66, 428, 200, 5, 6)} fill="#8ecbf0" />
        <path d={torn(1086, 270, 428, 210, 6, 6)} fill="#b6e0f6" />
        <circle cx="1440" cy="140" r="44" fill="#ffd25a" />
        {[[1170, 150, 1], [1330, 220, 0.8], [1210, 330, 0.9]].map(([x, y, s], i) => (
          <path key={`c${i}`} d={`M${x - 60 * s} ${y} a${26 * s} ${26 * s} 0 0 1 ${40 * s} -20 a${32 * s} ${32 * s} 0 0 1 ${56 * s} 0 a${24 * s} ${24 * s} 0 0 1 ${30 * s} 20 Z`} fill="#ffffff" />
        ))}
        <path d="M1086 430 L1150 380 L1220 410 L1300 360 L1380 400 L1460 360 L1514 390 L1514 480 L1086 480 Z" fill="#c98a6a" />
        <path d="M1086 450 L1170 420 L1250 445 L1340 410 L1430 440 L1514 420 L1514 480 L1086 480 Z" fill="#a8665a" />
        <rect x="1294" y="66" width="12" height="414" fill="#5a4a6a" />
        <rect x="1086" y="262" width="428" height="12" fill="#5a4a6a" />
        <path d={torn(1056, 488, 488, 22, 7, 3)} fill="#fff6e6" />
        {/* Duvarda kesik kâğıt kompozisyonlar (Matisse havası), bantla yapıştırılmış */}
        <path d="M120 160 q 30 -70 60 0 q -30 60 -60 0 Z" fill="#2fa86a" transform="rotate(-20 150 160)" />
        <path d="M200 120 q 24 -60 48 0 q -24 50 -48 0 Z" fill="#16c47f" transform="rotate(25 224 120)" />
        <path d="M80 240 c 20 -40 60 -40 80 0 c 20 40 60 40 80 0 c -10 50 -150 50 -160 0 Z" fill="#2b8cff" />
        <path d="M330 110 l 14 30 l 32 4 l -24 22 l 6 32 l -28 -16 l -28 16 l 6 -32 l -24 -22 l 32 -4 Z" fill="#ffd21f" />
        <path d="M430 150 c 40 -30 80 10 60 50 c -20 40 -80 30 -80 -10 c 0 -20 10 -30 20 -40 Z" fill="#ff3b4a" />
        {[[60, 300, 120, 90, 0, -4], [210, 270, 90, 120, 2, 3], [880, 300, 110, 80, 4, -2]].map(([x, y, w, h, c, a], i) => (
          <g key={`f${i}`} transform={`rotate(${a} ${x + w / 2} ${y + h / 2})`}>
            <path d={torn(x, y, w, h, 20 + i, 3)} fill="#fffdf6" />
            <circle cx={x + w * 0.4} cy={y + h * 0.45} r={Math.min(w, h) * 0.24} fill={paint[c]} />
            <path d={torn(x + w * 0.5, y + h * 0.5, w * 0.36, h * 0.3, 30 + i, 2)} fill={paint[c + 1]} />
          </g>
        ))}
        {/* Bant parçaları */}
        {[[100, 292, -12], [258, 262, 10], [920, 292, -8], [1110, 40, 6], [1490, 40, -6]].map(([x, y, a], i) => (
          <rect key={`t${i}`} x={x} y={y} width="54" height="18" fill="#f6ecc8" opacity="0.8" transform={`rotate(${a} ${x + 27} ${y + 9})`} />
        ))}
        {/* Zemin: farklı kahve tonlarında kâğıt şeritler (tahta) */}
        {Array.from({ length: 6 }, (_, i) => (
          <path key={`pl${i}`} d={torn(-20, 716 + i * 32, 1660, 34, 40 + i, 3)} fill={["#c9a77a", "#b8946a", "#d4b48a", "#bf9d70", "#c2a074", "#b08a60"][i]} />
        ))}
        {/* Kâğıttan boya lekeleri */}
        {[[200, 820], [520, 860], [900, 800], [1250, 850], [1450, 790]].map(([x, y], i) => (
          <path key={`sp${i}`} d={`M${x - 50} ${y} c 10 -22 40 -26 54 -12 c 14 -16 46 -8 46 12 c 12 6 4 24 -14 22 c -10 14 -40 14 -50 2 c -20 8 -44 -6 -36 -24 Z`} fill={paint[(i * 2) % paint.length]} />
        ))}
        {/* Saçılmış tüpler */}
        {[[300, 840, 20], [1120, 870, -30], [1380, 830, 60]].map(([x, y, a], i) => (
          <g key={`tb${i}`} transform={`rotate(${a} ${x} ${y})`}>
            <rect x={x - 26} y={y - 9} width="52" height="18" rx="5" fill="#f4f4f4" />
            <rect x={x + 22} y={y - 6} width="10" height="12" rx="2" fill={paint[i + 1]} />
          </g>
        ))}
        {/* Şövale: kâğıt şeritler; tuval: krem kâğıt üstüne kesik renkler */}
        <rect x="374" y="420" width="12" height="380" fill="#7a5232" />
        <rect x="314" y="420" width="16" height="380" fill="#9a6a42" transform="rotate(9 322 420)" />
        <rect x="430" y="420" width="16" height="380" fill="#9a6a42" transform="rotate(-9 438 420)" />
        <rect x="250" y="626" width="260" height="16" fill="#8a5a34" />
        <path d={torn(260, 440, 240, 190, 50, 3)} fill="#fffdf6" />
        <path d="M300 600 c 30 -40 90 -40 120 -10 c 20 20 0 40 -30 34 c -30 -6 -60 10 -90 -24 Z" fill="#ffd21f" />
        <path d="M282 590 Q 340 500 400 560 T 486 500 L 486 520 Q 410 580 400 576 Q 340 520 296 600 Z" fill="#2b8cff" />
        {/* Heykel tezgâhı */}
        <path d={torn(1130, 680, 200, 110, 60, 3)} fill="#a8744a" />
        <path d={torn(1122, 672, 216, 18, 61, 2)} fill="#c49a6a" />
      </Painted>
      <Layer>
        <motion.path key={`c${beat.i === 0 ? k : 0}`} d="M300 480 L 470 520" stroke="#ff3b4a" strokeWidth="9" fill="none" strokeLinecap="round" initial={{ pathLength: beat.i === 0 ? 0 : 1 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8, delay: 0.4 }} />
      </Layer>

      <StudioClock />
      {/* Bereli, paletli ressam */}
      <Actor x={560} y={790} size={110} look={look({ shape: "sphere", head: "beret" })} color="#F4F4F6" flip expression="focused" move={breathe(3)} act={on(beat, 0, { animate: { x: [0, -10, 0] }, transition: { duration: 2 } })} actKey={k} front={<Palette k={beat.i === 0 ? k : 0} />} />
      {/* Boyaya bulanmış, boş boş bakan */}
      <Actor morph={beat.n[1]} morphDelay={400} x={820} y={800} size={104} look={look({ shape: "blob", texture: "spots" })} color="#E23BD6" expression={beat.i === 1 ? "dizzy" : "idle"} move={sway(3.6, 4)} act={on(beat, 1, { animate: { rotate: [0, -14, 14, 0] }, transition: { duration: 1.6 } })} actKey={k} />
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
    <Stage clock="st-felt"
      sky="linear-gradient(180deg, #7f9cc4 0%, #b4c8e2 45%, #dde7f3 75%, #eef3f8 100%)"
      vignette={0.3}
      lights={[
        { x: 520, y: 540, r: 260, color: "rgba(255,190,110,0.6)", opacity: 0.55, flicker: 0.12 },
        { x: 1100, y: 120, r: 600, color: "rgba(230,240,255,0.5)", opacity: 0.4 },
      ]}
    >
      <Painted look="felt" seed={423}>
        <defs>
          <linearGradient id="sn-mtn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4f8fc" />
            <stop offset="0.5" stopColor="#bccde2" />
            <stop offset="1" stopColor="#a8bcd6" />
          </linearGradient>
          <linearGradient id="sn-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#dfe9f5" />
          </linearGradient>
          <linearGradient id="sn-ice" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d6f0fb" />
            <stop offset="0.5" stopColor="#a8d8ef" />
            <stop offset="1" stopColor="#8cc4e2" />
          </linearGradient>
          <linearGradient id="sn-pine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1f4436" />
            <stop offset="1" stopColor="#3a6e58" />
          </linearGradient>
          <linearGradient id="sn-log" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a5a34" />
            <stop offset="1" stopColor="#5a3a22" />
          </linearGradient>
        </defs>
          {/* Keçe el işi: düğme güneş, dikişli bulutlar, kesik keçe kar taneleri */}
          <circle cx="1380" cy="130" r="62" fill="#ffd25a" />
          <circle cx="1380" cy="130" r="46" fill="#ffc23a" />
          {[[-12, -12], [12, -12], [-12, 12], [12, 12]].map(([dx, dy], i) => (
            <circle key={`bh${i}`} cx={1380 + dx} cy={130 + dy} r="6" fill="#c8862a" />
          ))}
          {[[260, 120, 1], [620, 80, 0.8], [1060, 140, 0.9]].map(([x, y, s], i) => (
            <g key={`fc${i}`}>
              <ellipse cx={x} cy={y + 10 * s} rx={110 * s} ry={34 * s} fill="#f4f8ff" />
              <circle cx={x - 40 * s} cy={y} r={36 * s} fill="#f4f8ff" />
              <circle cx={x + 20 * s} cy={y - 16 * s} r={46 * s} fill="#eef4ff" />
              <circle cx={x + 70 * s} cy={y + 4 * s} r={30 * s} fill="#f4f8ff" />
            </g>
          ))}
          {[[140, 260], [480, 230], [820, 210], [1200, 260], [1520, 240]].map(([x, y], i) => (
            <g key={`sf${i}`} transform={`rotate(${i * 13} ${x} ${y})`}>
              {[0, 60, 120].map((a) => (
                <rect key={a} x={x - 18} y={y - 3.5} width="36" height="7" rx="3.5" fill="#ffffff" transform={`rotate(${a} ${x} ${y})`} />
              ))}
            </g>
          ))}
          {/* Karlı dağlar: zirveler beyaz, etekleri mavi gölgeli */}
          <path d="M0 520 L160 360 L280 440 L460 280 L640 450 L820 330 L1000 470 L1180 300 L1360 430 L1600 340 L1600 600 L0 600 Z" fill="url(#sn-mtn)" />
          {[[460, 280], [820, 330], [1180, 300]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y} L${x + 34} ${y + 30} L${x + 14} ${y + 26} L${x} ${y + 42} L${x - 14} ${y + 24} L${x - 34} ${y + 30} Z`} fill="#fff" />
          ))}
          <rect x="0" y="500" width={W} height="100" fill="#fff" opacity="0.4" filter="url(#nk-blur)" />
      </Painted>
      <Painted look="felt" seed={423}>
        <defs>
          <linearGradient id="sn-mtn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4f8fc" />
            <stop offset="0.5" stopColor="#bccde2" />
            <stop offset="1" stopColor="#a8bcd6" />
          </linearGradient>
          <linearGradient id="sn-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#dfe9f5" />
          </linearGradient>
          <linearGradient id="sn-ice" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d6f0fb" />
            <stop offset="0.5" stopColor="#a8d8ef" />
            <stop offset="1" stopColor="#8cc4e2" />
          </linearGradient>
          <linearGradient id="sn-pine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1f4436" />
            <stop offset="1" stopColor="#3a6e58" />
          </linearGradient>
          <linearGradient id="sn-log" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a5a34" />
            <stop offset="1" stopColor="#5a3a22" />
          </linearGradient>
        </defs>
        {/* Sıcak ışıklı kütük kulübe, bacasından duman */}
        <g>
          <rect x="430" y="490" width="180" height="110" fill="url(#sn-log)" />
          {[506, 526, 546, 566, 586].map((y) => (
            <line key={y} x1="430" y1={y} x2="610" y2={y} stroke="#4a2e1a" strokeWidth="2" opacity="0.6" />
          ))}
          <path d="M410 494 L520 420 L630 494 Z" fill="#6a4a3a" />
          <path d="M404 496 L520 414 L636 496 L620 500 L520 430 L420 500 Z" fill="#fff" />
          <rect x="580" y="430" width="22" height="48" fill="#6a4a3a" />
          <rect x="576" y="426" width="30" height="10" fill="#fff" />
          <rect x="460" y="520" width="44" height="40" fill="#ffcf6a" />
          <line x1="482" y1="520" x2="482" y2="560" stroke="#6a4a3a" strokeWidth="4" />
          <line x1="460" y1="540" x2="504" y2="540" stroke="#6a4a3a" strokeWidth="4" />
          <rect x="540" y="530" width="40" height="70" fill="#4a2e1a" />
        </g>
      </Painted>
      <Layer>
          {[0, 1, 2].map((i) => (
            <motion.circle key={i} cx="591" cy="420" r={10 + i * 4} fill="#fff" opacity="0.6" style={{ transformBox: "fill-box", transformOrigin: "center" }} animate={{ y: [0, -90], x: [0, 29 + i * 10], opacity: [0.6, 0], scale: [0.6, 1.6] }} transition={{ duration: 4, repeat: Infinity, delay: i * 1.3, ease: "easeOut" }} />
          ))}
      </Layer>
      <Painted look="felt" seed={423}>
        <defs>
          <linearGradient id="sn-mtn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4f8fc" />
            <stop offset="0.5" stopColor="#bccde2" />
            <stop offset="1" stopColor="#a8bcd6" />
          </linearGradient>
          <linearGradient id="sn-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#dfe9f5" />
          </linearGradient>
          <linearGradient id="sn-ice" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d6f0fb" />
            <stop offset="0.5" stopColor="#a8d8ef" />
            <stop offset="1" stopColor="#8cc4e2" />
          </linearGradient>
          <linearGradient id="sn-pine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1f4436" />
            <stop offset="1" stopColor="#3a6e58" />
          </linearGradient>
          <linearGradient id="sn-log" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a5a34" />
            <stop offset="1" stopColor="#5a3a22" />
          </linearGradient>
        </defs>
          {/* Çamlar: kat kat dallar, her katın üstünde kar */}
          {[80, 200, 330, 1250, 1380, 1520].map((x, i) => {
            const top = 330 + (i % 2) * 40;
            return (
              <g key={x}>
                <rect x={x - 8} y="580" width="16" height="40" fill="#4a2e1a" />
                {[0, 1, 2].map((t) => {
                  const ty = top + t * 80;
                  const half = 50 + t * 22;
                  return (
                    <g key={t}>
                      <path d={`M${x} ${ty} L${x + half} ${ty + 110} Q${x} ${ty + 96} ${x - half} ${ty + 110} Z`} fill="url(#sn-pine)" />
                      <path d={`M${x} ${ty} L${x + half * 0.55} ${ty + 54} Q${x + half * 0.2} ${ty + 46} ${x} ${ty + 56} Q${x - half * 0.2} ${ty + 46} ${x - half * 0.55} ${ty + 54} Z`} fill="#fff" />
                      <path d={`M${x - half} ${ty + 110} Q${x} ${ty + 96} ${x + half} ${ty + 110} Q${x} ${ty + 104} ${x - half} ${ty + 110}`} fill="#fff" stroke="#fff" strokeWidth="6" strokeLinejoin="round" opacity="0.9" />
                    </g>
                  );
                })}
              </g>
            );
          })}
          {/* Kar zemin (kümeli, mavi gölgeli) ve buz tutmuş gölet */}
          <path d="M0 600 Q 400 570 800 600 T 1600 590 L1600 900 L0 900 Z" fill="url(#sn-ground)" />
          {[[160, 880, 180], [700, 900, 220], [1300, 890, 200]].map(([x, y, r], i) => (
            <ellipse key={i} cx={x} cy={y} rx={r} ry={40} fill="#c8d8ea" opacity="0.45" />
          ))}
          <ellipse cx="1080" cy="766" rx="306" ry="64" fill="#c8dcea" />
          <ellipse cx="1080" cy="760" rx="300" ry="60" fill="url(#sn-ice)" />
          <ellipse cx="1040" cy="750" rx="120" ry="14" fill="#fff" opacity="0.6" />
          <path d="M900 770 l40 -10 l30 14 M1180 750 l30 12 l40 -6" stroke="#fff" strokeWidth="2" fill="none" opacity="0.6" />
          {/* Kardan barikat */}
          <path d="M1380 820 q 0 -90 90 -90 q 90 0 90 90 Z" fill="#e8f1fa" />
          {[1400, 1450, 1500].map((x) => (
            <circle key={x} cx={x} cy="760" r="24" fill="#f2f7fc" />
          ))}
          {/* Kardan Nook: yuvarlak gövde, hap gözler, havuç burun */}
          <ellipse cx="300" cy="822" rx="78" ry="14" fill="#dfe9f4" />
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="sn-mtn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4f8fc" />
            <stop offset="0.5" stopColor="#bccde2" />
            <stop offset="1" stopColor="#a8bcd6" />
          </linearGradient>
          <linearGradient id="sn-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#dfe9f5" />
          </linearGradient>
          <linearGradient id="sn-ice" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d6f0fb" />
            <stop offset="0.5" stopColor="#a8d8ef" />
            <stop offset="1" stopColor="#8cc4e2" />
          </linearGradient>
          <linearGradient id="sn-pine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1f4436" />
            <stop offset="1" stopColor="#3a6e58" />
          </linearGradient>
          <linearGradient id="sn-log" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a5a34" />
            <stop offset="1" stopColor="#5a3a22" />
          </linearGradient>
        </defs>
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
        <Actor x={620} y={830} size={96} look={look({ shape: "bean", head: "headphones", neck: "scarf" })} color="#2B8CFF" expression="happy" move={breathe(2.4)} front={<><Hand x={26} y={16} /></>} />
        <motion.div className="absolute rounded-full" style={{ left: 690, top: 700, width: 130, height: 130, background: "radial-gradient(circle at 35% 30%, #fff, #dbe8f5)", boxShadow: "0 10px 20px -10px rgba(40,60,90,0.4)" }} animate={{ rotate: beat.i === 1 ? 360 : 0 }} transition={{ duration: 3, ease: "linear" }} />
      </motion.div>
      {/* Barikatın arkasında nişan alan yaramaz */}
      <Actor morph={beat.n[2]} morphDelay={0} x={1470} y={760} size={92} look={look({ shape: "cat" })} color="#9B7BFF" flip expression={beat.i === 2 ? "happy" : "focused"} act={beat.i === 2 ? { animate: { y: [20, -20, -20, 20] }, transition: { duration: 1.8, times: [0, 0.2, 0.7, 1] } } : { animate: { y: 20 }, transition: { duration: 0 } }} actKey={k} front={<Hand x={-4} y={4} />} />
      {beat.i === 2 && <motion.span key={`sb${k}`} className="absolute rounded-full bg-white" style={{ left: 1420, top: 680, width: 26, height: 26, boxShadow: "0 2px 6px rgba(40,60,90,0.3)" }} initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: [0, -400, -760], y: [0, -140, 40], opacity: [1, 1, 0] }} transition={{ duration: 1.3, delay: 0.5, ease: "easeOut" }} />}
      {/* Patenle dönerken popo üstü oturan */}
      <Actor morph={beat.n[3]} morphDelay={900}
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
