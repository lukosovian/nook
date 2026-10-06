/**
 * Kalkan sahneleri (1–5): kamp ateşi, yağmurlu kafe, 80'ler disko, uzay istasyonu, sahil.
 * Her sahne arka planı SVG'de çizer, Nook'ları Actor ile yerleştirir; useBeat birkaç saniyede bir
 * bir olay seçer ve ilgili Nook/eşya o olayı oynar.
 */
import { motion } from "motion/react";
import { BeachClock, CafeClock, CampClock, DiscoClock, SpaceClock } from "./clocks";
import { Actor, breathe, Drift, Hand, hop, Layer, look, on, Stage, Stars, sway, useBeat, W } from "./kit";

// ------------------------------------------------------------------ 1. Gece kamp ateşi

export function Campfire() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage sky="linear-gradient(180deg, #070b1f 0%, #141537 45%, #2a1d3d 70%, #1a1420 100%)">
      <Stars count={90} maxY={480} />
      <Layer>
        {/* Ay */}
        <circle cx="1300" cy="150" r="46" fill="#f4eccf" />
        <circle cx="1318" cy="140" r="44" fill="#141537" opacity="0.9" />
        {/* Uzak çamlar */}
        {[60, 170, 260, 1180, 1290, 1420, 1530].map((x, i) => (
          <polygon key={x} points={`${x},${560 - (i % 3) * 30} ${x - 70},700 ${x + 70},700`} fill="#0c1a22" />
        ))}
        {[120, 220, 1240, 1370, 1490].map((x, i) => (
          <polygon key={x} points={`${x},${520 - (i % 2) * 40} ${x - 90},720 ${x + 90},720`} fill="#0f222b" />
        ))}
        {/* Zemin */}
        <path d="M0 700 Q 400 660 800 690 T 1600 680 L1600 900 L0 900 Z" fill="#1b1a26" />
        <path d="M0 760 Q 500 730 900 760 T 1600 750 L1600 900 L0 900 Z" fill="#221f2c" />
        {/* Çadır */}
        <g transform="translate(250 770)">
          <polygon points="0,-190 -150,0 150,0" fill="#e0703a" />
          <polygon points="0,-190 -150,0 -60,0" fill="#c45a2b" />
          <polygon points="0,-120 -42,0 42,0" fill="#3a1d16" />
          <line x1="0" y1="-190" x2="0" y2="-215" stroke="#6b4a3a" strokeWidth="5" strokeLinecap="round" />
        </g>
        {/* Ateşin ışığı */}
        <motion.circle cx="800" cy="760" r="320" fill="url(#nk-glow)" animate={{ opacity: beat.i === 0 ? [0.75, 1, 0.75] : [0.6, 0.78, 0.6], scale: beat.i === 0 ? [1, 1.25, 1] : 1 }} transition={{ duration: beat.i === 0 ? 1.4 : 1.8, repeat: beat.i === 0 ? 0 : Infinity }} key={`g${beat.i === 0 ? k : 0}`} style={{ transformOrigin: "800px 760px" }} />
      </Layer>

      {/* Uyku tulumundaki Nook: yalnızca gözleri görünür */}
      <Actor x={470} y={800} size={104} look={look({ shape: "bean" })} color="#2FD4C0" expression={beat.i === 3 ? "happy" : "idle"} move={breathe(4, 2)} front={<SleepingBag />} />

      {/* Marşmelov kızartan */}
      <Actor
        x={640}
        y={805}
        size={110}
        look={look({ shape: "sphere", texture: "plush" })}
        color="#FF6A3D"
        expression={beat.i === 2 ? "happy" : "idle"}
        move={breathe(3)}
        front={<Marshmallow toasted={beat.i === 2} k={k} />}
      />

      {/* Ateş */}
      <Fire flare={beat.i === 0} k={k} />

      {/* Fenerle korku hikâyesi anlatan */}
      <Actor
        x={970}
        y={805}
        size={110}
        look={look({ shape: "triangle" })}
        color="#9B7BFF"
        expression="surprised"
        flip={beat.i === 3}
        move={sway(2.4, 3)}
        act={on(beat, 3, hop(14))}
        actKey={k}
        front={<Lantern bright={beat.i === 3} />}
      />

      {/* Çalının arkasından fırlayan, ayı kulaklı şakacı */}
      <Actor
        x={1190}
        y={790}
        size={108}
        look={look({ head: "ears" })}
        color="#B5651D"
        expression={beat.i === 1 ? "happy" : "idle"}
        act={beat.i === 1 ? { animate: { y: [70, -40, -40, 70] }, transition: { duration: 2.4, times: [0, 0.2, 0.75, 1], ease: "easeOut" } } : { animate: { y: 70 }, transition: { duration: 0 } }}
        actKey={k}
        front={beat.i === 1 ? <><Hand x={-2} y={2} /><Hand x={26} y={2} /></> : null}
      />
      <Layer>
        <motion.g key={`b${beat.i === 1 ? k : 0}`} style={{ transformOrigin: "1190px 800px" }} animate={beat.i === 1 ? { rotate: [0, -4, 4, -3, 0] } : { rotate: [0, 1, 0] }} transition={{ duration: beat.i === 1 ? 0.6 : 3, repeat: beat.i === 1 ? 0 : Infinity }}>
          {[[-80, 0, 70], [0, -18, 85], [80, 0, 70], [-40, 14, 64], [45, 14, 64]].map(([dx, dy, r], i) => (
            <circle key={i} cx={1190 + dx} cy={800 + dy} r={r} fill={i % 2 ? "#17331f" : "#1d3f27"} />
          ))}
        </motion.g>
      </Layer>
      <CampClock />
    </Stage>
  );
}

function Fire({ flare, k }: { flare: boolean; k: number }) {
  return (
    <div className="absolute" style={{ left: 800 - 90, top: 800 - 200, width: 180, height: 210 }}>
      <svg viewBox="0 0 180 210" width="180" height="210" className="overflow-visible">
        {/* Taşlar ve odunlar */}
        {[20, 50, 85, 120, 152].map((x, i) => (
          <ellipse key={x} cx={x} cy={196 + (i % 2) * 4} rx="20" ry="12" fill={i % 2 ? "#4a4656" : "#5a5666"} />
        ))}
        <rect x="30" y="170" width="120" height="18" rx="9" fill="#6b4226" transform="rotate(-14 90 179)" />
        <rect x="30" y="170" width="120" height="18" rx="9" fill="#7a4b2b" transform="rotate(14 90 179)" />
        {/* Alevler */}
        {[
          { c: "#ff5a2a", s: 1, d: 0.9 },
          { c: "#ff9a2a", s: 0.75, d: 0.7 },
          { c: "#ffe07a", s: 0.45, d: 0.55 },
        ].map((f, i) => (
          <motion.path
            key={i}
            d="M90 180 C 40 170, 45 110, 70 80 C 72 110, 85 110, 88 60 C 100 90, 120 100, 112 40 C 150 90, 150 170, 90 180 Z"
            fill={f.c}
            style={{ transformOrigin: "90px 180px" }}
            animate={{ scaleY: [f.s, f.s * 1.12, f.s * 0.94, f.s], scaleX: [f.s, f.s * 0.95, f.s * 1.04, f.s], rotate: [-2, 2, -1, -2] }}
            transition={{ duration: f.d, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
        {/* Atılan odunla büyüyen alev */}
        {flare && (
          <motion.path
            key={k}
            d="M90 180 C 30 160, 40 70, 90 10 C 140 70, 150 160, 90 180 Z"
            fill="#ffb347"
            style={{ transformOrigin: "90px 180px" }}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: [0.2, 1.2, 0.6], opacity: [0, 0.85, 0] }}
            transition={{ duration: 1.4, delay: 0.7 }}
          />
        )}
      </svg>
      {/* Uçuşan odun */}
      {flare && (
        <motion.div
          key={`log${k}`}
          className="absolute"
          style={{ width: 70, height: 16, borderRadius: 8, background: "#7a4b2b", left: 60, top: 160 }}
          initial={{ x: -260, y: -60, rotate: -40, opacity: 1 }}
          animate={{ x: [-260, -120, 0], y: [-60, -150, 10], rotate: [-40, 80, 14], opacity: [1, 1, 0] }}
          transition={{ duration: 0.8, times: [0, 0.5, 1], ease: "easeIn" }}
        />
      )}
      {/* Kıvılcımlar */}
      {Array.from({ length: flare ? 14 : 6 }, (_, i) => (
        <motion.span
          key={`${i}-${flare ? k : 0}`}
          className="absolute h-1 w-1 rounded-full bg-[#ffd27a]"
          style={{ left: 70 + (i % 5) * 10, top: 90 }}
          animate={{ y: [0, -140 - (i % 4) * 40], x: [0, (i % 2 ? 1 : -1) * (10 + i * 3)], opacity: [1, 0] }}
          transition={{ duration: 1.6 + (i % 3) * 0.4, repeat: Infinity, delay: i * 0.25 }}
        />
      ))}
    </div>
  );
}

function Marshmallow({ toasted, k }: { toasted: boolean; k: number }) {
  return (
    <motion.g style={{ transformOrigin: "24px 16px" }} animate={{ rotate: [0, -3, 0, 2, 0] }} transition={{ duration: 3, repeat: Infinity }}>
      <line x1="24" y1="16" x2="50" y2="4" stroke="#8a5a34" strokeWidth="1.1" strokeLinecap="round" />
      <motion.rect key={k} x="46.5" y="0.5" width="6" height="5" rx="1.6" transform="rotate(-24 49.5 3)" animate={{ fill: toasted ? ["#fff8ec", "#e9b46b", "#c9873f"] : "#fff8ec" }} transition={{ duration: 2.4 }} />
      <Hand x={24} y={16} />
    </motion.g>
  );
}

function Lantern({ bright }: { bright: boolean }) {
  return (
    <g>
      <motion.circle cx="12" cy="18" r="14" fill="url(#nk-glow)" animate={{ opacity: bright ? [0.6, 1, 0.6] : [0.45, 0.6, 0.45] }} transition={{ duration: 1.2, repeat: Infinity }} />
      <path d="M8 17 h8 v8 a2 2 0 0 1 -2 2 h-4 a2 2 0 0 1 -2 -2 Z" fill="#2a2a32" />
      <rect x="9.2" y="18.2" width="5.6" height="6.4" rx="1" fill="#ffd36b" />
      <path d="M9 17 Q12 13.5 15 17" stroke="#2a2a32" strokeWidth="0.9" fill="none" />
      <Hand x={7.5} y={22} />
      <Hand x={16.5} y={22} />
    </g>
  );
}

function SleepingBag() {
  return (
    <g>
      <path d="M-8 22 Q-8 15 0 15 L24 15 Q32 15 32 22 L33 30 Q12 34 -9 30 Z" fill="#3c63c9" />
      <path d="M-8 22 Q-8 15 0 15 L24 15 Q32 15 32 22 L32 22.5 Q12 19 -8 22.5 Z" fill="#6f8fe8" />
      <path d="M12 17 L12 31" stroke="#2c4aa0" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
      <Hand x={4} y={16} />
      <Hand x={20} y={16} />
    </g>
  );
}

// ------------------------------------------------------------------ 2. Yağmurlu kafe (Lo-Fi)

export function Cafe() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage sky="linear-gradient(180deg, #1c2333 0%, #26304a 100%)">
      {/* Dışarısı: şehir ışıkları, yağmur */}
      <Layer>
        {Array.from({ length: 26 }, (_, i) => (
          <circle key={i} cx={(i * 67) % W} cy={180 + ((i * 53) % 220)} r={18 + (i % 4) * 8} fill={["#ffcf7a", "#ff8fb1", "#7ad1ff"][i % 3]} opacity="0.14" />
        ))}
      </Layer>
      <Drift count={70} from={-40} to={720} dur={[0.7, 1.3]} render={() => <span className="block h-6 w-[2px] rounded bg-[#9fb7e8]/40" />} />
      {/* Buğulu cam ve pencere çerçevesi */}
      <div className="absolute inset-x-0 top-0" style={{ height: 640, background: "linear-gradient(180deg, rgba(200,215,240,0.10), rgba(200,215,240,0.18))", backdropFilter: "blur(3px)" }} />
      <Layer>
        <rect x="0" y="0" width={W} height="640" fill="none" stroke="#3a2617" strokeWidth="40" />
        <rect x="785" y="0" width="30" height="640" fill="#3a2617" />
        <rect x="0" y="300" width={W} height="22" fill="#3a2617" />
        {/* Camda süzülen damlalar */}
        {[220, 460, 1040, 1300].map((x, i) => (
          <motion.circle key={x} cx={x} r="5" fill="#cfe0ff" opacity="0.5" animate={{ cy: [60 + i * 30, 600] }} transition={{ duration: 6 + i, repeat: Infinity, ease: "easeIn", delay: i * 1.3 }} />
        ))}
        {/* Camdaki kalp */}
        <motion.path
          key={`h${beat.i === 1 ? k : 0}`}
          d="M1080 430 C 1080 400, 1120 400, 1120 430 C 1120 400, 1160 400, 1160 430 C 1160 460, 1120 480, 1120 495 C 1120 480, 1080 460, 1080 430 Z"
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ pathLength: beat.i === 1 ? 0 : 1, opacity: 0.6 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 2.2, delay: 0.3 }}
        />
        {/* Sıcak sarı ışık */}
        <circle cx="400" cy="560" r="420" fill="url(#nk-glow)" opacity="0.35" />
        <line x1="400" y1="0" x2="400" y2="110" stroke="#222" strokeWidth="4" />
        <path d="M360 110 h80 l-15 40 h-50 Z" fill="#2b2b2b" />
        <motion.ellipse cx="400" cy="152" rx="26" ry="10" fill="#ffe2a0" animate={{ opacity: [0.85, 1, 0.85] }} transition={{ duration: 3, repeat: Infinity }} />
        {/* Tezgâh / masa */}
        <rect x="0" y="720" width={W} height="40" fill="#8a5a34" />
        <rect x="0" y="760" width={W} height="140" fill="#5c3a22" />
        <rect x="0" y="720" width={W} height="8" fill="#a8744a" />
      </Layer>

      <CafeClock />
      {/* Bereli, gözlüklü okur */}
      <Actor x={360} y={725} size={118} look={look({ shape: "sphere", head: "beret", glasses: "round" })} color="#F4F4F6" expression={beat.i === 0 ? "happy" : "idle"} move={breathe(4)} front={<OpenBook k={beat.i === 0 ? k : 0} />} />
      {/* Cama kalp çizen */}
      <Actor x={1020} y={725} size={104} look={look({ shape: "cloud", texture: "plush" })} color="#FF9EC4" flip={beat.i !== 1} expression={beat.i === 1 ? "focused" : "happy"} move={sway(3, 2)} front={beat.i === 1 ? <motion.g key={k} animate={{ x: [0, 10, 18, 10, 0], y: [0, -8, 0, 6, 0] }} transition={{ duration: 2.2, delay: 0.3 }}><Hand x={28} y={6} /></motion.g> : <Hand x={26} y={16} />} />
      {/* Dev kupaya sarılan */}
      <Actor x={720} y={725} size={96} look={look({ shape: "bean" })} color="#FFD21F" expression="sleepy" move={breathe(3.6, 2)} front={<BigMug steam={beat.i === 2} k={k} />} />
      {/* Arkada fincan silen barista */}
      <Actor x={1340} y={725} size={100} look={look({ shape: "egg", neck: "bowtie" })} color="#8A8F99" expression={beat.i === 3 ? "happy" : "idle"} move={breathe(3)} act={on(beat, 3, { animate: { rotate: [0, -6, 6, 0] }, transition: { duration: 1 } })} actKey={k} front={<Barista k={k} />} />
    </Stage>
  );
}

function OpenBook({ k }: { k: number }) {
  return (
    <g>
      <path d="M-1 17 L11 18.6 L23 17 L23 27 L11 28 L-1 27 Z" fill="#5a7ad8" />
      <path d="M0 16.5 Q5.5 15.4 11 17.6 L11 27 Q5.5 25.4 0 26.4 Z" fill="#fbf6ea" />
      <path d="M22 16.5 Q16.5 15.4 11 17.6 L11 27 Q16.5 25.4 22 26.4 Z" fill="#f3ecdb" />
      <motion.path key={k} d="M11 17.6 Q15 16 21 16.6 L21 26 Q15 25 11 27 Z" fill="#fffaf0" style={{ transformOrigin: "11px 22px" }} animate={k ? { scaleX: [1, -1] } : {}} transition={{ duration: 0.8 }} />
      <Hand x={-0.5} y={23} />
      <Hand x={22.5} y={23} />
    </g>
  );
}

function BigMug({ steam, k }: { steam: boolean; k: number }) {
  return (
    <g>
      <rect x="0" y="9" width="24" height="20" rx="4" fill="#e9e2d6" />
      <path d="M24 13 q8 0 8 6 q0 6 -8 6" stroke="#e9e2d6" strokeWidth="3" fill="none" />
      <rect x="0" y="9" width="24" height="3" rx="1.5" fill="#6b3f22" />
      <path d="M4 18 h16" stroke="#c9b9a2" strokeWidth="1.4" />
      {[6, 12, 18].map((x, i) => (
        <motion.path
          key={`${x}-${steam ? k : 0}`}
          d={`M${x} 6 q-2 -3 0 -6 q2 -3 0 -6`}
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.1"
          fill="none"
          strokeLinecap="round"
          animate={{ y: [0, -5], opacity: [0, steam ? 1 : 0.6, 0] }}
          transition={{ duration: steam ? 1.2 : 2.4, repeat: Infinity, delay: i * 0.4 }}
        />
      ))}
      <Hand x={-1} y={20} />
      <Hand x={25} y={20} />
    </g>
  );
}

function Barista({ k }: { k: number }) {
  return (
    <g>
      {/* Önlük */}
      <path d="M4 15 h16 v9 q-8 3 -16 0 Z" fill="#2d2d33" />
      <motion.g key={k} animate={{ rotate: [0, 360] }} transition={{ duration: 1.6, ease: "easeInOut" }} style={{ transformOrigin: "26px 18px" }}>
        <path d="M22 16 h8 v4 a4 4 0 0 1 -8 0 Z" fill="#f2f2f2" />
        <Hand x={22} y={20} />
      </motion.g>
      <motion.g animate={{ x: [0, 2, 0, -2, 0] }} transition={{ duration: 0.8, repeat: Infinity }}>
        <rect x="24" y="20" width="7" height="4" rx="1.5" fill="#e15a5a" />
        <Hand x={30} y={22} />
      </motion.g>
    </g>
  );
}

// ------------------------------------------------------------------ 3. 80'ler disko

export function Disco() {
  const beat = useBeat(4);
  const k = beat.k;
  const tiles = ["#ff3ea5", "#6b4bff", "#00b8ff", "#ffd21f", "#16c47f"];
  return (
    <Stage sky="radial-gradient(120% 80% at 50% 10%, #2a0d4a 0%, #14062a 60%, #08020f 100%)">
      <Layer>
        {/* Işık hüzmeleri */}
        {[-30, -12, 8, 26].map((a, i) => (
          <motion.polygon
            key={a}
            points="800,90 760,900 840,900"
            fill={tiles[i]}
            opacity="0.12"
            style={{ transformOrigin: "800px 90px" }}
            animate={{ rotate: [a, -a, a] }}
            transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
        {/* Sis */}
        <ellipse cx="800" cy="720" rx="900" ry="120" fill="#9b7bff" opacity="0.13" />
        {/* Dans pisti: perspektifli neon kareler */}
        {Array.from({ length: 5 }, (_, row) =>
          Array.from({ length: 12 }, (_, col) => {
            const y0 = 700 + row * 40;
            const w0 = 1000 + row * 160;
            const x0 = 800 - w0 / 2 + (col * w0) / 12;
            const y1 = y0 + 40;
            const w1 = w0 + 160;
            const x1 = 800 - w1 / 2 + (col * w1) / 12;
            return (
              <motion.polygon
                key={`${row}-${col}`}
                points={`${x0},${y0} ${x0 + w0 / 12},${y0} ${x1 + w1 / 12},${y1} ${x1},${y1}`}
                fill={tiles[(row + col) % tiles.length]}
                stroke="#000"
                strokeWidth="2"
                animate={{ opacity: [0.25, 0.85, 0.25] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: ((row * 7 + col * 3) % 10) * 0.12 }}
              />
            );
          }),
        )}
        {/* DJ masası */}
        <rect x="1140" y="610" width="300" height="100" rx="12" fill="#1c1c24" stroke="#ff3ea5" strokeWidth="3" />
        <motion.circle cx="1220" cy="625" r="32" fill="#111" stroke="#333" strokeWidth="4" animate={{ rotate: 360 }} transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "1220px 625px" }} />
        <circle cx="1220" cy="625" r="8" fill="#ff3ea5" />
      </Layer>
      {/* Disko topu */}
      <div className="absolute" style={{ left: 800 - 60, top: 40 }}>
        <div className="mx-auto h-12 w-[3px] bg-[#888]" />
        <motion.div
          className="h-[120px] w-[120px] rounded-full"
          style={{
            background: "repeating-conic-gradient(from 0deg, #d9d9e8 0 8deg, #9a9ab0 8deg 16deg), radial-gradient(circle at 35% 30%, #fff, #777)",
            backgroundBlendMode: "multiply",
            boxShadow: "0 0 60px 10px rgba(180,160,255,0.45)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <Drift count={30} from={160} to={900} xs={[200, 1400]} dur={[3, 6]} render={(i) => <span className="block h-1.5 w-1.5 rounded-full" style={{ background: tiles[i % tiles.length], boxShadow: `0 0 8px ${tiles[i % tiles.length]}` }} />} />

      <DiscoClock />
      {/* Tütülü dansçı */}
      <Actor
        x={520}
        y={790}
        size={112}
        look={look({ shape: "heart", head: "bow" })}
        color="#FF5C8A"
        expression="happy"
        move={{ animate: { rotate: [-8, 8, -8], y: [0, -8, 0, -8, 0] }, transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" } }}
        act={on(beat, 0, { animate: { rotate: [0, 360] }, transition: { duration: 1, ease: "easeInOut" } })}
        actKey={k}
        front={<Tutu />}
      />
      {/* Şarkıcı */}
      <Actor
        x={800}
        y={800}
        size={120}
        look={look({ shape: "star", texture: "metal" })}
        color="#FFD21F"
        expression={beat.i === 1 ? "happy" : "talking"}
        move={sway(1.2, 5)}
        act={on(beat, 1, hop(30))}
        actKey={k}
        front={<Mic />}
      />
      {/* DJ */}
      <Actor x={1290} y={640} size={104} look={look({ shape: "cube", head: "headphones" })} color="#00B8FF" expression="focused" move={{ animate: { y: [0, -6, 0] }, transition: { duration: 0.6, repeat: Infinity } }} act={on(beat, 2, { animate: { rotate: [0, -12, 12, 0] }, transition: { duration: 0.8 } })} actKey={k} front={<><Hand x={0} y={22} /><motion.g animate={{ x: [0, 3, 0] }} transition={{ duration: 0.3, repeat: Infinity }}><Hand x={24} y={22} /></motion.g></>} z={2} />
      {/* Köşede gözleri kamaşmış, güneş gözlüklü */}
      <Actor x={1080} y={800} size={100} look={look({ shape: "blob", glasses: "shades" })} color="#8FE03A" move={{ animate: { rotate: [-10, 10, -10] }, transition: { duration: 0.6, repeat: Infinity } }} act={on(beat, 3, hop(20))} actKey={k} />
    </Stage>
  );
}

function Tutu() {
  return (
    <g>
      <path d="M-2 20 Q12 15 26 20 L30 26 Q12 22 -6 26 Z" fill="#ff9ec4" />
      <path d="M0 21 Q12 18 24 21 L27 25 Q12 21 -3 25 Z" fill="#ffc4dc" />
      <Hand x={-4} y={4} />
      <Hand x={28} y={4} />
    </g>
  );
}

function Mic() {
  return (
    <g>
      <line x1="20" y1="22" x2="16" y2="15" stroke="#333" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="15.2" cy="13.6" r="2.4" fill="#9a9aa6" />
      <circle cx="15.2" cy="13.6" r="2.4" fill="url(#nk-soft)" opacity="0.4" />
      <Hand x={20} y={22} />
      <Hand x={-1} y={10} />
    </g>
  );
}

// ------------------------------------------------------------------ 4. Uzay istasyonu

export function Space() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage sky="#05060d">
      <Stars count={120} maxY={900} />
      {/* Dönen Dünya */}
      <div className="absolute overflow-hidden rounded-full" style={{ left: 980, top: 140, width: 520, height: 520, background: "radial-gradient(circle at 35% 30%, #5fb2ff 0%, #2266c4 45%, #0b2a5e 100%)", boxShadow: "0 0 80px 10px rgba(80,160,255,0.35)" }}>
        <motion.div className="absolute inset-0" animate={{ x: [-520, 0] }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }}>
          {[0, 520].map((o) => (
            <svg key={o} viewBox="0 0 520 520" width="520" height="520" className="absolute" style={{ left: o }}>
              <path d="M60 180 q60 -50 120 -10 t90 40 q20 60 -40 70 t-110 -20 q-70 -30 -60 -80 Z" fill="#3ea56a" opacity="0.9" />
              <path d="M300 300 q50 -30 100 10 t40 80 q-30 40 -90 20 t-50 -110 Z" fill="#4cb575" opacity="0.9" />
              <path d="M330 110 q40 -20 70 0 t10 40 q-40 20 -80 -40 Z" fill="#3ea56a" />
            </svg>
          ))}
        </motion.div>
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 70% 70%, transparent 40%, rgba(0,0,20,0.75) 80%)" }} />
      </div>
      {/* Pencere çerçevesi */}
      <div className="absolute rounded-full" style={{ left: 880, top: 40, width: 720, height: 720, boxShadow: "0 0 0 2000px #1d2230, inset 0 0 0 26px #3a4256, inset 0 0 0 34px #262c3b" }} />
      <Layer>
        {/* Panel ve vidalar */}
        <rect x="60" y="560" width="420" height="200" rx="18" fill="#2c3346" />
        {[110, 220, 330, 430].map((x, i) => (
          <motion.circle key={x} cx={x} cy="620" r="12" fill={["#ff5c8a", "#16c47f", "#ffd21f", "#00b8ff"][i]} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1 + i * 0.3, repeat: Infinity }} />
        ))}
        <circle cx="400" cy="700" r="9" fill="#9aa3b8" />
        <line x1="394" y1="700" x2="406" y2="700" stroke="#555" strokeWidth="3" />
        <rect x="0" y="820" width={W} height="80" fill="#262c3b" />
      </Layer>
      {/* Havada süzülen su damlaları */}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={`${i}-${beat.i === 1 ? k : 0}`}
          className="absolute rounded-full"
          style={{ left: 620 + i * 26, top: 380 + (i % 2) * 30, width: 16 - i, height: 16 - i, background: "radial-gradient(circle at 35% 30%, #fff, #7ad1ff 60%, #3b8fd9)" }}
          animate={beat.i === 1 && i === 0 ? { x: [0, -70], y: [0, 40], scale: [1, 0] } : { y: [0, -14, 0], x: [0, 8, 0] }}
          transition={beat.i === 1 && i === 0 ? { duration: 1.4, delay: 0.6 } : { duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <SpaceClock />
      {/* Fanuslu süzülen */}
      <Actor x={320} y={430} size={116} look={look({ shape: "sphere" })} color="#F4F4F6" expression="happy" move={{ animate: { y: [0, -30, 0], rotate: [-8, 8, -8] }, transition: { duration: 6, repeat: Infinity, ease: "easeInOut" } }} front={<Helmet />} back={<><Hand x={-6} y={10} /><Hand x={30} y={8} /></>} />
      {/* Damlaları ağzıyla yakalayan */}
      <Actor x={540} y={520} size={100} look={look({ shape: "bean" })} color="#FF6A3D" expression={beat.i === 1 ? "surprised" : "happy"} move={{ animate: { y: [0, -20, 0], rotate: [10, -6, 10] }, transition: { duration: 5, repeat: Infinity, ease: "easeInOut" } }} act={on(beat, 1, { animate: { x: [0, 40, 0] }, transition: { duration: 1.6 } })} actKey={k} />
      {/* Vida sıkan tamirci */}
      <Actor x={360} y={760} size={104} look={look({ shape: "cube", head: "cap" })} color="#FFD21F" expression="focused" move={breathe(3, 2)} act={on(beat, 2, { animate: { rotate: [0, -5, 5, -5, 0] }, transition: { duration: 0.8 } })} actKey={k} front={<Wrench k={beat.i === 2 ? k : 0} />} flip />
      {/* Jetpack'li */}
      <Actor
        x={720}
        y={700}
        size={100}
        look={look({ shape: "egg", head: "antenna" })}
        color="#9B7BFF"
        expression="happy"
        move={{ animate: { x: [-160, 120, -160], y: [0, -60, 0], rotate: [6, -6, 6] }, transition: { duration: 14, repeat: Infinity, ease: "easeInOut" } }}
        act={on(beat, 3, { animate: { y: [0, -90, 0] }, transition: { duration: 1.8, ease: "easeInOut" } })}
        actKey={k}
        back={<Jetpack boost={beat.i === 3} />}
      />
    </Stage>
  );
}

function Helmet() {
  return (
    <g>
      <circle cx="12" cy="12" r="16.5" fill="rgba(180,220,255,0.12)" stroke="rgba(220,240,255,0.7)" strokeWidth="0.9" />
      <path d="M3 4 Q8 -2 16 -2" stroke="rgba(255,255,255,0.8)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <rect x="2" y="26.5" width="20" height="3.5" rx="1.7" fill="#c8ced9" />
    </g>
  );
}

function Wrench({ k }: { k: number }) {
  return (
    <motion.g key={k} style={{ transformOrigin: "27px 16px" }} animate={k ? { rotate: [0, 50, 0, 50, 0] } : {}} transition={{ duration: 1.2 }}>
      <path d="M27 16 L36 12" stroke="#b9c0cc" strokeWidth="2" strokeLinecap="round" />
      <path d="M35 10 a2.4 2.4 0 1 0 2 4" stroke="#b9c0cc" strokeWidth="1.6" fill="none" />
      <Hand x={27} y={16} />
      <Hand x={-2} y={18} />
    </motion.g>
  );
}

function Jetpack({ boost }: { boost: boolean }) {
  return (
    <g>
      <rect x="-4" y="6" width="7" height="14" rx="3" fill="#6b7280" />
      <rect x="21" y="6" width="7" height="14" rx="3" fill="#6b7280" />
      {[-0.5, 24.5].map((x) => (
        <motion.path key={x} d={`M${x - 2.5} 20 Q${x} ${boost ? 34 : 28} ${x + 2.5} 20 Z`} fill={boost ? "#ffb347" : "#ff8a3d"} animate={{ scaleY: [1, 1.3, 0.9, 1] }} transition={{ duration: 0.25, repeat: Infinity }} style={{ transformOrigin: `${x}px 20px` }} />
      ))}
      <Hand x={-5} y={16} />
      <Hand x={29} y={16} />
    </g>
  );
}

// ------------------------------------------------------------------ 5. Sahil ve piknik

export function Beach() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage sky="linear-gradient(180deg, #7ec8f2 0%, #bfe6fb 55%, #ffe6c4 100%)">
      <Layer>
        {/* Güneş ve bulutlar */}
        <circle cx="1350" cy="140" r="70" fill="#fff3b0" />
        <circle cx="1350" cy="140" r="110" fill="#fff3b0" opacity="0.3" />
        {[[860, 110], [1080, 230], [470, 300]].map(([x, y], i) => (
          <motion.g key={i} animate={{ x: [0, 40, 0] }} transition={{ duration: 30 + i * 8, repeat: Infinity, ease: "easeInOut" }}>
            <ellipse cx={x} cy={y} rx="90" ry="26" fill="#fff" opacity="0.9" />
            <ellipse cx={x + 40} cy={y - 18} rx="50" ry="24" fill="#fff" opacity="0.9" />
          </motion.g>
        ))}
        {/* Deniz */}
        <rect x="0" y="470" width={W} height="200" fill="#2fa6d9" />
        <rect x="0" y="470" width={W} height="40" fill="#5cc3ec" />
        {[0, 1, 2].map((i) => (
          <motion.path key={i} d={`M-100 ${560 + i * 40} q 100 -18 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0`} stroke="#bfeaff" strokeWidth="4" fill="none" opacity="0.6" animate={{ x: [0, 200] }} transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "linear" }} />
        ))}
        {/* Kumsal */}
        <path d="M0 640 Q 400 600 800 630 T 1600 620 L1600 900 L0 900 Z" fill="#f3d79a" />
        <motion.path d="M0 640 Q 400 600 800 630 T 1600 620" stroke="#fff" strokeWidth="10" fill="none" opacity="0.7" animate={{ y: [0, 10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
        {/* Palmiye */}
        <path d="M200 860 C 220 700, 180 560, 230 420" stroke="#8a5a34" strokeWidth="26" fill="none" strokeLinecap="round" />
        <motion.g style={{ transformOrigin: "230px 420px" }} animate={{ rotate: [-3, 3, -3] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
          {[-150, -100, -40, 20, 80, 140].map((a) => (
            <path key={a} d="M230 420 q 70 -40 150 10 q -80 -10 -150 -10" fill="#2f9e5a" transform={`rotate(${a} 230 420)`} />
          ))}
          <circle cx="222" cy="430" r="14" fill="#6b4226" />
          <circle cx="242" cy="432" r="14" fill="#6b4226" />
        </motion.g>
        {/* Piknik örtüsü ve deniz kabukları */}
        <polygon points="560,760 1000,740 1080,850 520,870" fill="#ff5c5c" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={i} x1={560 + i * 80} y1={760 - i * 4} x2={520 + i * 112} y2={870 - i * 4} stroke="#fff" strokeWidth="10" opacity="0.6" />
        ))}
        {[[420, 820], [1180, 860], [1320, 800]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y} q 14 -26 28 0 Z`} fill="#ffc4dc" />
        ))}
        {/* Kumdan Nook heykeli */}
        <ellipse cx="1230" cy="800" rx="62" ry="16" fill="#e2c07c" />
        <motion.circle key={`s${beat.i === 2 ? k : 0}`} cx="1230" cy="752" r="46" fill="#e8c887" initial={{ scale: beat.i === 2 ? 0.6 : 1 }} animate={{ scale: 1 }} transition={{ duration: 1.6 }} style={{ transformOrigin: "1230px 800px" }} />
        <rect x="1212" y="740" width="8" height="18" rx="4" fill="#5a4220" />
        <rect x="1240" y="740" width="8" height="18" rx="4" fill="#5a4220" />
        {/* Şezlong */}
        <path d="M760 760 L960 760 L1000 690" stroke="#2b8cff" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M790 760 l-10 50 M940 760 l10 50" stroke="#b9c0cc" strokeWidth="6" />
      </Layer>
      <BeachClock />
      {/* Denizde can simidiyle batıp çıkan */}
      <Actor
        x={1000}
        y={600}
        size={86}
        look={look({ shape: "sphere" })}
        color="#FF6A3D"
        expression={beat.i === 3 ? "surprised" : "happy"}
        move={{ animate: { y: [0, 8, 0], rotate: [-6, 6, -6] }, transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}
        act={on(beat, 3, { animate: { y: [0, 60, 60, 0] }, transition: { duration: 1.8, times: [0, 0.25, 0.6, 1] } })}
        actKey={k}
        front={<Ring />}
      />
      {/* Şezlongda güneşlenen */}
      <div className="absolute" style={{ left: 0, top: 0, transform: "rotate(-12deg)", transformOrigin: "880px 750px" }}>
        <Actor x={880} y={755} size={108} look={look({ shape: "bean", glasses: "shades" })} color="#FFD21F" expression="sleepy" move={breathe(4.5, 2)} act={on(beat, 0, { animate: { rotate: [0, 8, 0] }, transition: { duration: 1.6 } })} actKey={k} front={<><Hand x={-2} y={2} /><Hand x={26} y={2} /></>} />
      </div>
      {/* Hasır şapkalı, hindistan cevizi içen */}
      <Actor x={660} y={790} size={104} look={look({ shape: "cloud", texture: "plush" })} color="#2FD4C0" expression={beat.i === 1 ? "happy" : "idle"} move={breathe(3)} act={on(beat, 1, { animate: { rotate: [0, -8, 0] }, transition: { duration: 1.4 } })} actKey={k} front={<><StrawHat /><Coconut sip={beat.i === 1} k={k} /></>} />
      {/* Heykel yapan */}
      <Actor x={1360} y={820} size={96} look={look({ shape: "egg" })} color="#FF9EC4" flip expression="focused" move={breathe(2.4)} act={on(beat, 2, { animate: { rotate: [0, -10, 0, -10, 0] }, transition: { duration: 1.4 } })} actKey={k} front={<motion.g animate={{ y: [0, -2, 0] }} transition={{ duration: 0.5, repeat: Infinity }}><Hand x={26} y={18} /><Hand x={-2} y={20} /></motion.g>} />
    </Stage>
  );
}

function Ring() {
  return (
    <g>
      <ellipse cx="12" cy="21" rx="17" ry="6" fill="#ff3b4a" />
      <ellipse cx="12" cy="21" rx="10" ry="3" fill="#2fa6d9" />
      {[-12, 0, 12].map((d) => (
        <rect key={d} x={11 + d * 1.1} y="16" width="3" height="10" fill="#fff" transform={`rotate(${d * 3} ${12 + d} 21)`} />
      ))}
    </g>
  );
}

function StrawHat() {
  return (
    <g>
      <ellipse cx="12" cy="1.5" rx="17" ry="3.6" fill="#e9c46a" />
      <path d="M4 1.5 Q5 -7 12 -7 Q19 -7 20 1.5 Z" fill="#f2d27e" />
      <path d="M4.4 -0.5 Q12 1.5 19.6 -0.5" stroke="#e15a5a" strokeWidth="1.6" fill="none" />
    </g>
  );
}

function Coconut({ sip, k }: { sip: boolean; k: number }) {
  return (
    <motion.g key={k} animate={sip ? { y: [0, -4, -4, 0] } : {}} transition={{ duration: 1.6 }}>
      <circle cx="26" cy="18" r="6" fill="#6b4226" />
      <circle cx="26" cy="18" r="6" fill="url(#nk-soft)" opacity="0.15" />
      <path d="M26 13 L19 7" stroke="#ff5c8a" strokeWidth="1" strokeLinecap="round" />
      <Hand x={24} y={22} />
    </motion.g>
  );
}

