/**
 * Kalkan sahneleri (1–5): kamp ateşi, yağmurlu kafe, 80'ler disko, uzay istasyonu, sahil.
 * Her sahne arka planı SVG'de çizer, Nook'ları Actor ile yerleştirir; useBeat birkaç saniyede bir
 * bir olay seçer ve ilgili Nook/eşya o olayı oynar.
 */
import { motion } from "motion/react";
import { BeachClock, CafeClock, CampClock, DiscoClock, SpaceClock } from "./clocks";
import { Actor, breathe, Drift, Hand, hop, Layer, look, on, Painted, Stage, Stars, sway, useBeat, W } from "./kit";

// ------------------------------------------------------------------ 1. Gece kamp ateşi

export function Campfire() {
  const beat = useBeat(4);
  const k = beat.k;
  return (
    <Stage clock="st-clay"
      sky="linear-gradient(180deg, #141a46 0%, #23286a 45%, #3b2f6e 75%, #2a2040 100%)"
      grain={false}
      vignette={0.5}
      lights={[
        { x: 800, y: 740, r: 600, color: "rgba(255,150,70,0.55)", opacity: 0.75, flicker: 0.28 },
        { x: 800, y: 760, r: 260, color: "rgba(255,210,120,0.6)", opacity: 0.55, flicker: 0.4 },
        { x: 1300, y: 150, r: 300, color: "rgba(200,210,255,0.3)", opacity: 0.6 },
      ]}
    >
      {/* Arka fon: el boyaması gibi duran hamur perde (dokulu, düz) */}
      <Painted filter="st-clay-flat">
        <rect x="-20" y="-20" width={W + 40} height="760" fill="#202764" />
        {[[260, 160, 300], [900, 120, 360], [1400, 260, 260], [600, 380, 320]].map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.35} fill={i % 2 ? "#2a3078" : "#1c2258"} />
        ))}
      </Painted>
      {/* Hamur boncuk yıldızlar, ay, dağlar, çamlar, çadır, zemin: her parça ayrı ayrı şişkin hamur */}
      <Painted>
        {Array.from({ length: 34 }, (_, i) => (
          <circle key={`s${i}`} cx={(i * 211 + 37) % W} cy={30 + ((i * 97) % 440)} r={3 + (i % 3) * 1.6} fill={i % 4 ? "#fff3c4" : "#ffd9f0"} filter="url(#st-clay)" />
        ))}
        <g filter="url(#st-clay)">
          <path d="M1300 92 A58 58 0 0 0 1300 208 A40 58 0 0 1 1300 92 Z" fill="#fff0c2" />
        </g>
        {/* Uzak dağlar: üç katman hamur dilimi */}
        <path filter="url(#st-clay)" d="M-20 600 Q 120 470 260 520 Q 380 420 520 500 Q 640 440 760 520 L 760 640 L -20 640 Z" fill="#4a3f8a" />
        <path filter="url(#st-clay)" d="M700 600 Q 860 440 1000 510 Q 1120 430 1260 500 Q 1400 450 1620 520 L 1620 640 L 700 640 Z" fill="#5a4a96" />
        <path filter="url(#st-clay)" d="M-20 660 Q 300 560 560 620 Q 820 560 1100 630 Q 1360 570 1620 620 L 1620 720 L -20 720 Z" fill="#33407a" />
        {/* Çamlar: üst üste konmuş hamur koniler */}
        {[[60, 720, 1], [150, 735, 1.25], [1230, 730, 1.2], [1360, 720, 1], [1480, 740, 1.3], [1570, 720, 0.95]].map(([x, y, s], i) => (
          <g key={`p${i}`} filter="url(#st-clay)">
            <rect x={x - 8 * s} y={y - 30 * s} width={16 * s} height={34 * s} rx={6} fill="#6a4228" />
            {[0, 1, 2].map((t) => (
              <path key={t} d={`M${x} ${y - (230 - t * 62) * s} Q ${x + (52 + t * 22) * s} ${y - (120 - t * 62) * s} ${x + (62 + t * 22) * s} ${y - (100 - t * 62) * s} Q ${x} ${y - (88 - t * 62) * s} ${x - (62 + t * 22) * s} ${y - (100 - t * 62) * s} Q ${x - (52 + t * 22) * s} ${y - (120 - t * 62) * s} ${x} ${y - (230 - t * 62) * s} Z`} fill={t % 2 ? "#2f6a4a" : "#3a7a54"} />
            ))}
          </g>
        ))}
        {/* Zemin: kalın hamur tabaka, ateşin çevresi sıcak */}
        <path filter="url(#st-clay-flat)" d="M-20 700 Q 400 668 800 690 T 1620 684 L1620 920 L-20 920 Z" fill="#5a3a3a" />
        <ellipse cx="800" cy="820" rx="560" ry="120" fill="#a8603a" opacity="0.35" filter="url(#nk-blur)" />
        {[[90, 800], [210, 860], [360, 830], [1080, 870], [1330, 820], [1470, 870]].map(([x, y], i) => (
          <g key={`g${i}`} filter="url(#st-clay)">
            {[-10, 0, 10].map((dx) => (
              <path key={dx} d={`M${x + dx} ${y} q ${dx * 0.6} -20 ${dx * 1.2} -30`} stroke="#4f8a4a" strokeWidth="7" strokeLinecap="round" fill="none" />
            ))}
          </g>
        ))}
        {/* Çadır: kalın hamur paneller, kapı kanadı açık */}
        <g transform="translate(250 772)">
          <path filter="url(#st-clay)" d="M0 -200 L-158 0 L158 0 Z" fill="#e8743e" />
          <path filter="url(#st-clay)" d="M0 -132 L-48 0 L48 0 Z" fill="#4a1e14" />
          <path filter="url(#st-clay)" d="M0 -132 Q 36 -70 78 0 L 46 0 Z" fill="#ffb07a" />
          <g filter="url(#st-clay)">
            <rect x="-5" y="-232" width="10" height="40" rx="5" fill="#8a6a52" />
            <path d="M5 -230 l 24 8 l -24 8 Z" fill="#ffd25a" />
          </g>
        </g>
        {/* Ateş çukuru (Fire bileşeniyle aynı yer: sol 710, üst 600) */}
        <g transform="translate(710 600)">
          {/* Kor yatağı */}
          <ellipse cx="90" cy="194" rx="72" ry="14" fill="#ff6a2a" opacity="0.5" filter="url(#nk-blur-s)" />
          {/* Taşlar (ateşe bakan üstleri aydınlık) ve odunlar */}
          <g filter="url(#st-clay)">
            <rect x="30" y="168" width="120" height="22" rx="11" fill="#7a4a2a" transform="rotate(-14 90 179)" />
          </g>
          <g filter="url(#st-clay)">
            <rect x="30" y="168" width="120" height="22" rx="11" fill="#8a5432" transform="rotate(14 90 179)" />
          </g>
          {[18, 50, 85, 120, 154].map((x, i) => (
            <ellipse key={x} cx={x} cy={198 + (i % 2) * 4} rx="22" ry="14" fill={i % 2 ? "#8a8296" : "#9c94a8"} filter="url(#st-clay)" />
          ))}
        </g>
        {/* Oturak kütüğü */}
        <g filter="url(#st-clay)">
          <rect x="1006" y="804" width="128" height="34" rx="17" fill="#8a5232" />
          <ellipse cx="1130" cy="821" rx="11" ry="17" fill="#e0a872" />
        </g>
      </Painted>
      {/* Ateşin zemine düşen ışığı (hareketli) */}
      <Layer>
        <motion.ellipse cx="800" cy="790" rx="340" ry="90" fill="url(#nk-glow)" animate={{ opacity: beat.i === 0 ? [0.75, 1, 0.75] : [0.55, 0.72, 0.55], scale: beat.i === 0 ? [1, 1.25, 1] : 1 }} transition={{ duration: beat.i === 0 ? 1.4 : 1.8, repeat: beat.i === 0 ? 0 : Infinity }} key={`g${beat.i === 0 ? k : 0}`} style={{ transformOrigin: "800px 790px" }} />
      </Layer>
      {/* Ateşten yükselen kıvılcımlar */}
      <Drift
        count={16}
        xs={[770, 830]}
        from={720}
        to={360}
        dur={[2.4, 4.2]}
        sway={50}
        render={(i) => <span className="block rounded-full" style={{ width: 4 - (i % 2), height: 4 - (i % 2), background: i % 3 ? "#ffcf6a" : "#ff8a3d", boxShadow: "0 0 8px 2px rgba(255,150,60,0.8)" }} />}
      />
      {/* Ateş böcekleri */}
      {Array.from({ length: 9 }, (_, i) => {
        const x = [140, 330, 420, 1080, 1260, 1330, 1460, 560, 1520][i];
        const y = [640, 600, 700, 660, 690, 600, 650, 620, 720][i];
        return (
          <motion.span
            key={`ff${i}`}
            className="pointer-events-none absolute rounded-full"
            style={{ left: x, top: y, width: 5, height: 5, background: "#e6ff8a", boxShadow: "0 0 10px 3px rgba(210,255,120,0.7)" }}
            animate={{ x: [0, 30, -10, 20, 0], y: [0, -20, -40, -10, 0], opacity: [0, 1, 0.3, 1, 0] }}
            transition={{ duration: 6 + (i % 4), repeat: Infinity, delay: i * 0.7, ease: "easeInOut" }}
          />
        );
      })}

      {/* Uyku tulumundaki Nook: yalnızca gözleri görünür */}
      <Actor x={470} y={800} size={104} look={look({ shape: "bean" })} color="#2FD4C0" expression={beat.i === 3 ? "happy" : "idle"} move={breathe(4, 2)} front={<SleepingBag />} />

      {/* Marşmelov kızartan */}
      <Actor morph={beat.n[0]} morphDelay={600}
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
      <Actor morph={beat.n[1]} morphDelay={0}
        x={1190}
        y={790}
        size={108}
        look={look({ head: "ears" })}
        color="#B5651D"
        expression={beat.i === 1 ? "happy" : "idle"}
        act={beat.i === 1 ? { animate: { y: [70, -40, -40, 70] }, transition: { duration: 2.4, times: [0, 0.2, 0.75, 1], ease: "easeOut" } } : { animate: { y: 70 }, transition: { duration: 0 } }}
        actKey={k}
        shadow={false}
        front={beat.i === 1 ? <><Hand x={-2} y={2} /><Hand x={26} y={2} /></> : null}
      />
      {/* Çalı: hamur süzgeci bir kez resme çevrilir, yalnızca resim sallanır */}
      <motion.div key={`b${beat.i === 1 ? k : 0}`} className="pointer-events-none absolute inset-0" style={{ transformOrigin: "1190px 800px" }} animate={beat.i === 1 ? { rotate: [0, -4, 4, -3, 0] } : { rotate: [0, 1, 0] }} transition={{ duration: beat.i === 1 ? 0.6 : 3, repeat: beat.i === 1 ? 0 : Infinity }}>
        <Painted>
          {[[-80, 0, 70, "#2f6a40"], [80, 0, 70, "#2a5e3a"], [0, -18, 85, "#3a7a48"], [-40, 14, 64, "#357244"], [45, 14, 64, "#2f6a40"]].map(([dx, dy, r, c], i) => (
            <circle key={i} cx={1190 + (dx as number)} cy={800 + (dy as number)} r={r as number} fill={c as string} filter="url(#st-clay)" />
          ))}
          {[[-50, -60], [10, -90], [60, -50], [-90, -20], [100, -10], [30, -40]].map(([dx, dy], i) => (
            <ellipse key={`l${i}`} cx={1190 + dx} cy={800 + dy} rx="14" ry="7" fill="#5fa060" filter="url(#st-clay)" transform={`rotate(${i * 37} ${1190 + dx} ${800 + dy})`} />
          ))}
        </Painted>
      </motion.div>
      <CampClock />
    </Stage>
  );
}

function Fire({ flare, k }: { flare: boolean; k: number }) {
  return (
    <div className="absolute" style={{ left: 800 - 90, top: 800 - 200, width: 180, height: 210 }}>
      <svg viewBox="0 0 180 210" width="180" height="210" className="overflow-visible">
        <defs>
          <linearGradient id="cf-flame-a" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ff4a1a" />
            <stop offset="1" stopColor="#ff7a2a" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="cf-flame-b" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ffb02a" />
            <stop offset="1" stopColor="#ff8a2a" />
          </linearGradient>
          <linearGradient id="cf-flame-c" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#fffbe0" />
            <stop offset="1" stopColor="#ffe07a" />
          </linearGradient>
          <linearGradient id="cf-rock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a8756a" />
            <stop offset="0.45" stopColor="#5a5266" />
            <stop offset="1" stopColor="#2e2a38" />
          </linearGradient>
        </defs>
        {/* Kor yatağı, odunlar, taşlar: hamur süzgeçli oldukları için kamp sahnesinin resme çevrilen katmanında */}
        {/* Alevin arkasındaki yumuşak parıltı */}
        <motion.ellipse cx="90" cy="130" rx="70" ry="80" fill="#ff8a2a" opacity="0.35" filter="url(#nk-blur)" animate={{ opacity: [0.3, 0.45, 0.3] }} transition={{ duration: 1.3, repeat: Infinity }} />
        {/* Alevler */}
        {[
          { c: "url(#cf-flame-a)", s: 1, d: 0.9 },
          { c: "url(#cf-flame-b)", s: 0.75, d: 0.7 },
          { c: "url(#cf-flame-c)", s: 0.45, d: 0.55 },
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
    <Stage medium="canvas" clock="st-c-gouache"
      sky="linear-gradient(180deg, #121a2c 0%, #1f2a44 55%, #2a2f48 100%)"
      lights={[
        { x: 400, y: 200, r: 600, color: "rgba(255,190,110,0.55)", opacity: 0.6, flicker: 0.06 },
        { x: 720, y: 700, r: 200, color: "rgba(255,200,130,0.45)", opacity: 0.4 },
        { x: 1200, y: 300, r: 500, color: "rgba(120,160,255,0.3)", opacity: 0.45 },
      ]}
    >
      {/* Dışarısı: şehrin silueti ve bulanık (bokeh) ışıkları, yağmur */}
      <Painted look="gouache" seed={367}>
        <defs>
          <linearGradient id="cafe-city" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a2238" />
            <stop offset="1" stopColor="#0e1424" />
          </linearGradient>
          <linearGradient id="cafe-wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b07a4a" />
            <stop offset="0.25" stopColor="#8a5a34" />
            <stop offset="1" stopColor="#4a2c18" />
          </linearGradient>
          <linearGradient id="cafe-frame" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2a1a0f" />
            <stop offset="0.5" stopColor="#4a2f1c" />
            <stop offset="1" stopColor="#2a1a0f" />
          </linearGradient>
        </defs>
        {/* Uzak binalar, pencereleri yanık */}
        {[[40, 300, 140], [190, 220, 120], [320, 340, 160], [500, 260, 110], [620, 200, 150], [880, 280, 130], [1020, 180, 170], [1210, 320, 120], [1340, 240, 150], [1500, 300, 120]].map(([x, top, w], i) => (
          <g key={i} opacity="0.85">
            <rect x={x} y={top} width={w} height={640 - top} fill="url(#cafe-city)" />
            {Array.from({ length: Math.floor((640 - top) / 40) * 3 }, (_, j) => (
              <rect key={j} x={x + 14 + (j % 3) * (w / 3.2)} y={top + 20 + Math.floor(j / 3) * 40} width="12" height="16" fill={(i * 7 + j * 3) % 5 === 0 ? "#ffd27a" : "#2a3350"} opacity={(i * 7 + j * 3) % 5 === 0 ? 0.55 : 0.6} />
            ))}
          </g>
        ))}
        <g filter="url(#nk-blur-s)">
          {Array.from({ length: 30 }, (_, i) => (
            <circle key={i} cx={(i * 67) % W} cy={360 + ((i * 53) % 260)} r={14 + (i % 4) * 9} fill={["#ffcf7a", "#ff8fb1", "#7ad1ff", "#ffffff"][i % 4]} opacity={0.18 + (i % 3) * 0.06} />
          ))}
        </g>
      </Painted>
      <Drift count={70} from={-40} to={720} dur={[0.7, 1.3]} render={() => <span className="block h-6 w-[2px] rounded bg-[#9fb7e8]/40" />} />
      {/* Buğulu cam ve pencere çerçevesi */}
      <div className="absolute inset-x-0 top-0" style={{ height: 640, background: "linear-gradient(180deg, rgba(200,215,240,0.10), rgba(200,215,240,0.18))", backdropFilter: "blur(3px)" }} />
      <Painted look="gouache" seed={367}>
        <defs>
<linearGradient id="cafe-frame" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2a1a0f" />
            <stop offset="0.5" stopColor="#4a2f1c" />
            <stop offset="1" stopColor="#2a1a0f" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={W} height="640" fill="none" stroke="url(#cafe-frame)" strokeWidth="40" />
        <rect x="785" y="0" width="30" height="640" fill="url(#cafe-frame)" />
        <rect x="0" y="300" width={W} height="22" fill="#3a2617" />
        <rect x="0" y="300" width={W} height="4" fill="#6a4a30" />
        {/* Pencere boyunca sarkan sıcak ampul girlandı */}
        <path d="M40 60 Q 400 150 785 70 Q 1200 150 1560 60" fill="none" stroke="#3a2617" strokeWidth="3" />
        {Array.from({ length: 22 }, (_, i) => {
          const t = (i + 0.5) / 22;
          const x = 40 + t * 1520;
          const half = t < 0.5 ? t * 2 : (t - 0.5) * 2;
          const y = 60 + Math.sin(half * Math.PI) * 80 + 6;
          return (
            <g key={`fl${i}`}>
              <circle cx={x} cy={y + 10} r="16" fill="#ffcf6a" opacity="0.35" />
              <ellipse cx={x} cy={y + 10} rx="7" ry="9" fill={["#ffd27a", "#ffb0c8", "#bfe6ff"][i % 3]} />
            </g>
          );
        })}
        {/* Camda yansıyan sıcak iç ışık */}
        <path d="M60 40 L240 40 L120 290 L40 290 Z" fill="#fff" opacity="0.04" />
        <path d="M860 340 L1000 340 L900 620 L840 620 Z" fill="#fff" opacity="0.035" />
        {/* Pencere önü: saksılar */}
        <rect x="0" y="628" width={W} height="20" fill="#5a3a22" />
        {[[120, "#4a8a4a"], [1480, "#5a9a5a"], [560, "#3f7a44"]].map(([x, c], i) => (
          <g key={i}>
            <path d={`M${(x as number) - 26} 600 h52 l-6 30 h-40 Z`} fill="#c4673a" />
            <rect x={(x as number) - 30} y="596" width="60" height="8" rx="3" fill="#d87a4a" />
            {[-16, 0, 16, -8, 8].map((dx, j) => (
              <ellipse key={j} cx={(x as number) + dx} cy={590 - (j % 3) * 12} rx="10" ry="18" fill={c as string} transform={`rotate(${dx * 2} ${(x as number) + dx} ${590 - (j % 3) * 12})`} />
            ))}
          </g>
        ))}
      </Painted>
      <Layer>
        {/* Camda süzülen damlalar */}
        {[220, 460, 1040, 1300].map((x, i) => (
          <motion.circle key={x} cx={x} cy={60 + i * 30} r="5" fill="#cfe0ff" opacity="0.5" animate={{ y: [0, 540 - i * 30] }} transition={{ duration: 6 + i, repeat: Infinity, ease: "easeIn", delay: i * 1.3 }} />
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
      </Layer>
      <Painted look="gouache" seed={367}>
        {/* Sıcak sarı ışık */}
        <circle cx="400" cy="560" r="420" fill="url(#nk-glow)" opacity="0.35" />
        <line x1="400" y1="0" x2="400" y2="110" stroke="#222" strokeWidth="4" />
        {/* Lambanın aşağı vuran ışık konisi */}
        <polygon points="378,150 422,150 620,720 180,720" fill="#ffe2a0" opacity="0.07" filter="url(#nk-blur-s)" />
        <path d="M352 110 h96 l-18 44 h-60 Z" fill="#2f5a4a" />
        <path d="M352 110 h96 l-4 8 h-88 Z" fill="#4a8a70" />
      </Painted>
      <Layer>
        <motion.ellipse cx="400" cy="154" rx="30" ry="10" fill="#fff1c8" filter="url(#nk-bloom)" animate={{ opacity: [0.85, 1, 0.85] }} transition={{ duration: 3, repeat: Infinity }} />
      </Layer>
      <Painted look="gouache" seed={367}>
        <defs>
<linearGradient id="cafe-wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b07a4a" />
            <stop offset="0.25" stopColor="#8a5a34" />
            <stop offset="1" stopColor="#4a2c18" />
          </linearGradient>
        </defs>
        {/* Tezgâh / masa: cilalı ahşap, kenarında parlama */}
        <rect x="0" y="720" width={W} height="40" fill="url(#cafe-wood)" />
        <rect x="0" y="760" width={W} height="140" fill="#3e2616" />
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={i * 180} y="760" width="4" height="140" fill="#000" opacity="0.25" />
        ))}
        <rect x="0" y="720" width={W} height="6" fill="#e0a872" opacity="0.7" />
        <rect x="0" y="760" width={W} height="10" fill="#000" opacity="0.35" />
        {/* Sıcak kafe ayrıntıları: tavandan sarkan saksılar, kitap yığını, kek tablası */}
        {[[180, 0, 150], [1440, 0, 120]].map(([x, y, len], i) => (
          <g key={`hp${i}`}>
            <line x1={x} y1={y} x2={x} y2={len} stroke="#3a2617" strokeWidth="3" />
            <path d={`M${x - 34} ${len} h68 l-8 40 h-52 Z`} fill="#e08a5a" />
            {Array.from({ length: 7 }, (_, j) => (
              <path key={j} d={`M${x - 24 + j * 8} ${len + 4} q ${(j - 3) * 6} 40 ${(j - 3) * 4} ${70 + (j % 3) * 30}`} stroke={j % 2 ? "#4a8a4a" : "#5a9a5a"} strokeWidth="6" fill="none" strokeLinecap="round" />
            ))}
          </g>
        ))}
        {[["#7a2e2e", 0], ["#2e4a7a", 1], ["#d4a43a", 2], ["#3f6b3a", 3]].map(([c, i]) => (
          <rect key={`bk${i}`} x={130 + (i as number) * 4} y={696 - (i as number) * 14} width="110" height="14" rx="3" fill={c as string} />
        ))}
        <g>
          <rect x="876" y="700" width="8" height="22" fill="#d8d0c4" />
          <ellipse cx="880" cy="700" rx="56" ry="8" fill="#f0e8dc" />
          <path d="M846 698 q 34 -46 68 0 Z" fill="#f6c8d8" />
          <path d="M846 698 q 34 -20 68 0" fill="none" stroke="#fff" strokeWidth="4" />
          <circle cx="880" cy="656" r="7" fill="#e2433b" />
        </g>
        {/* Masada bir sukulent ve şekerlik */}
        <g>
          <rect x="560" y="694" width="34" height="28" rx="5" fill="#e9e2d6" />
          {[-8, 0, 8].map((dx) => (
            <ellipse key={dx} cx={577 + dx} cy={690} rx="7" ry="12" fill="#6aa86a" transform={`rotate(${dx * 3} ${577 + dx} 690)`} />
          ))}
          <rect x="1180" y="686" width="30" height="36" rx="6" fill="rgba(220,235,255,0.35)" stroke="#dfe8f5" strokeWidth="2" />
          <rect x="1184" y="704" width="22" height="16" rx="3" fill="#fff" opacity="0.8" />
        </g>
      </Painted>

      <CafeClock />
      {/* Bereli, gözlüklü okur */}
      <Actor x={360} y={725} size={118} look={look({ shape: "sphere", head: "beret", glasses: "round" })} color="#F4F4F6" expression={beat.i === 0 ? "happy" : "idle"} move={breathe(4)} front={<OpenBook k={beat.i === 0 ? k : 0} />} />
      {/* Cama kalp çizen */}
      <Actor x={1020} y={725} size={104} look={look({ shape: "cloud", texture: "plush" })} color="#FF9EC4" flip={beat.i !== 1} expression={beat.i === 1 ? "focused" : "happy"} move={sway(3, 2)} front={beat.i === 1 ? <motion.g key={k} animate={{ x: [0, 10, 18, 10, 0], y: [0, -8, 0, 6, 0] }} transition={{ duration: 2.2, delay: 0.3 }}><Hand x={28} y={6} /></motion.g> : <Hand x={26} y={16} />} />
      {/* Dev kupaya sarılan */}
      <Actor x={720} y={725} size={96} look={look({ shape: "bean" })} color="#FFD21F" expression="sleepy" move={breathe(3.6, 2)} front={<BigMug steam={beat.i === 2} k={k} />} />
      {/* Arkada fincan silen barista */}
      <Actor morph={beat.n[3]} morphDelay={700} x={1340} y={725} size={100} look={look({ shape: "egg", neck: "bowtie" })} color="#8A8F99" expression={beat.i === 3 ? "happy" : "idle"} move={breathe(3)} act={on(beat, 3, { animate: { rotate: [0, -6, 6, 0] }, transition: { duration: 1 } })} actKey={k} front={<Barista k={k} />} />
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
    <Stage
      sky="radial-gradient(120% 80% at 50% 10%, #2a0d4a 0%, #14062a 60%, #08020f 100%)"
      lights={[
        { x: 520, y: 700, r: 300, color: "rgba(255,62,165,0.55)", opacity: 0.5, flicker: 0.5 },
        { x: 800, y: 700, r: 320, color: "rgba(255,210,31,0.5)", opacity: 0.45, flicker: 0.4 },
        { x: 1080, y: 720, r: 280, color: "rgba(0,184,255,0.55)", opacity: 0.5, flicker: 0.55 },
        { x: 1290, y: 600, r: 260, color: "rgba(107,75,255,0.6)", opacity: 0.5, flicker: 0.3 },
        { x: 800, y: 110, r: 260, color: "rgba(220,210,255,0.5)", opacity: 0.45, flicker: 0.2 },
      ]}
    >
      {/* 80'ler airbrush fon: krom yay, sahne kemerleri, parıltı yıldızları (look="puff" ile şişkin) */}
      <Painted look="puff" seed={517}>
        <defs>
          <linearGradient id="dc-chrome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.35" stopColor="#c8b8ff" />
            <stop offset="0.5" stopColor="#5a3a9a" />
            <stop offset="0.65" stopColor="#ff8ad0" />
            <stop offset="1" stopColor="#fff0fa" />
          </linearGradient>
          <radialGradient id="dc-arch" cx="50%" cy="100%" r="80%">
            <stop offset="0" stopColor="#ff3ea5" stopOpacity="0.55" />
            <stop offset="0.6" stopColor="#6b4bff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#14062a" stopOpacity="0" />
          </radialGradient>
        </defs>
        {[560, 440, 320].map((r, i) => (
          <path key={`ar${i}`} d={`M${800 - r} 700 A${r} ${r * 0.9} 0 0 1 ${800 + r} 700 L${800 + r - 26} 700 A${r - 26} ${(r - 26) * 0.9} 0 0 0 ${800 - r + 26} 700 Z`} fill={i === 1 ? "url(#dc-chrome)" : "url(#dc-arch)"} />
        ))}
        {[[260, 200, 26], [1340, 240, 30], [420, 330, 16], [1180, 380, 18], [700, 260, 12], [980, 180, 14]].map(([x, y, r], i) => (
          <path key={`sp${i}`} d={`M${x} ${y - r} Q ${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q ${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q ${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q ${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z`} fill={i % 2 ? "#ffe8fa" : "#e8f4ff"} />
        ))}
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="dc-spk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#14141c" />
            <stop offset="0.5" stopColor="#2a2a36" />
            <stop offset="1" stopColor="#14141c" />
          </linearGradient>
        </defs>
        {/* Arka duvar: neon çizgiler ve hoparlör kuleleri */}
        {[180, 230].map((y, i) => (
          <motion.path key={y} d={`M0 ${y + 200} Q 400 ${y + 140} 800 ${y + 200} T 1600 ${y + 200}`} stroke={i ? "#00b8ff" : "#ff3ea5"} strokeWidth="5" fill="none" filter="url(#nk-bloom)" animate={{ opacity: [0.35, 0.8, 0.35] }} transition={{ duration: 2.4 + i, repeat: Infinity }} />
        ))}
        {[60, 1420].map((x) => (
          <g key={x}>
            <rect x={x} y="380" width="130" height="330" rx="10" fill="url(#dc-spk)" stroke="#000" strokeWidth="3" />
            {[440, 560, 660].map((cy, j) => (
              <g key={cy}>
                <circle cx={x + 65} cy={cy} r={j === 1 ? 46 : 30} fill="#0a0a10" stroke="#3a3a48" strokeWidth="4" />
                <motion.circle cx={x + 65} cy={cy} r={j === 1 ? 20 : 12} fill="#2a2a36" animate={{ scale: [1, 1.18, 1] }} transition={{ duration: 0.5, repeat: Infinity, delay: j * 0.1 }} style={{ transformOrigin: `${x + 65}px ${cy}px` }} />
              </g>
            ))}
          </g>
        ))}
        {/* Işık hüzmeleri: uca doğru solan */}
        {[-30, -12, 8, 26].map((a, i) => (
          <motion.polygon
            key={a}
            points="800,90 730,900 870,900"
            fill={tiles[i]}
            opacity="0.2"
            style={{ transformOrigin: "800px 90px", mixBlendMode: "screen" }}
            animate={{ rotate: [a, -a, a] }}
            transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </Layer>
      <Painted look="puff" seed={498}>
        <defs>
          <linearGradient id="dc-spk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#14141c" />
            <stop offset="0.5" stopColor="#2a2a36" />
            <stop offset="1" stopColor="#14141c" />
          </linearGradient>
        </defs>
          {/* Sis */}
          <ellipse cx="800" cy="720" rx="900" ry="140" fill="#9b7bff" opacity="0.16" filter="url(#nk-blur)" />
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="dc-spk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#14141c" />
            <stop offset="0.5" stopColor="#2a2a36" />
            <stop offset="1" stopColor="#14141c" />
          </linearGradient>
        </defs>
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
      </Layer>
      <Painted look="puff" seed={498}>
        <defs>
          <linearGradient id="dc-spk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#14141c" />
            <stop offset="0.5" stopColor="#2a2a36" />
            <stop offset="1" stopColor="#14141c" />
          </linearGradient>
        </defs>
          {/* Pistin parlak yüzeyi: üst kenarda bir ışık şeridi */}
          <rect x="0" y="698" width={W} height="4" fill="#fff" opacity="0.25" />
          {/* DJ masası */}
          <rect x="1140" y="610" width="300" height="100" rx="12" fill="#1c1c24" stroke="#ff3ea5" strokeWidth="3" filter="url(#nk-bloom)" />
          <rect x="1150" y="672" width="280" height="26" rx="6" fill="#0e0e14" />
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="dc-spk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#14141c" />
            <stop offset="0.5" stopColor="#2a2a36" />
            <stop offset="1" stopColor="#14141c" />
          </linearGradient>
        </defs>
        {Array.from({ length: 12 }, (_, i) => (
          <motion.rect key={i} x={1160 + i * 22} y="676" width="14" height="18" rx="2" fill={tiles[i % tiles.length]} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 0.6, repeat: Infinity, delay: (i % 4) * 0.15 }} />
        ))}
        <motion.circle cx="1220" cy="625" r="32" fill="#111" stroke="#333" strokeWidth="4" animate={{ rotate: 360 }} transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "1220px 625px" }} />
      </Layer>
      <Painted look="puff" seed={498}>
        <defs>
          <linearGradient id="dc-spk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#14141c" />
            <stop offset="0.5" stopColor="#2a2a36" />
            <stop offset="1" stopColor="#14141c" />
          </linearGradient>
        </defs>
          <circle cx="1220" cy="625" r="8" fill="#ff3ea5" />
      </Painted>
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
      <Actor morph={beat.n[0]} morphDelay={500}
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
      <Actor shadow={false} x={1290} y={640} size={104} look={look({ shape: "cube", head: "headphones" })} color="#00B8FF" expression="focused" move={{ animate: { y: [0, -6, 0] }, transition: { duration: 0.6, repeat: Infinity } }} act={on(beat, 2, { animate: { rotate: [0, -12, 12, 0] }, transition: { duration: 0.8 } })} actKey={k} front={<><Hand x={0} y={22} /><motion.g animate={{ x: [0, 3, 0] }} transition={{ duration: 0.3, repeat: Infinity }}><Hand x={24} y={22} /></motion.g></>} z={2} />
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
    <Stage clock="st-soft3d"
      sky="#05060d"
      lights={[
        { x: 1240, y: 400, r: 520, color: "rgba(90,170,255,0.45)", opacity: 0.55 },
        { x: 270, y: 620, r: 300, color: "rgba(120,255,200,0.35)", opacity: 0.45, flicker: 0.15 },
        { x: 440, y: 60, r: 380, color: "rgba(220,235,255,0.35)", opacity: 0.5 },
      ]}
    >
      <Stars count={120} maxY={900} />
      {/* Uzak bulutsu */}
      <Painted look="puff" seed={492}>
          <g filter="url(#nk-blur)" opacity="0.5">
            <ellipse cx="1200" cy="250" rx="300" ry="120" fill="#6b4bff" opacity="0.4" />
            <ellipse cx="1320" cy="560" rx="260" ry="90" fill="#ff5c8a" opacity="0.25" />
          </g>
      </Painted>
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
      <div className="absolute rounded-full" style={{ left: 880, top: 40, width: 720, height: 720, boxShadow: "0 0 0 2000px #1d2230, inset 0 0 0 26px #3a4256, inset 0 0 0 34px #262c3b, inset 0 0 0 38px #4a5470, inset 0 30px 60px rgba(0,0,0,0.6)" }} />
      <Painted look="puff" seed={492}>
        <defs>
          <linearGradient id="sp-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a3146" />
            <stop offset="1" stopColor="#181c2a" />
          </linearGradient>
          <linearGradient id="sp-panel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a4258" />
            <stop offset="1" stopColor="#232838" />
          </linearGradient>
          <linearGradient id="sp-pipe" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a94a8" />
            <stop offset="0.5" stopColor="#c8d0dc" />
            <stop offset="1" stopColor="#4a5266" />
          </linearGradient>
        </defs>
          {/* İstasyonun iç duvarı: panel çizgileri, perçinler, borular (pencerenin solunda) */}
          <defs>
            <linearGradient id="sp-plate" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#5a6684" />
              <stop offset="0.5" stopColor="#3a4460" />
              <stop offset="1" stopColor="#262c40" />
            </linearGradient>
            <linearGradient id="sp-plate2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4a5470" />
              <stop offset="1" stopColor="#20263a" />
            </linearGradient>
            <radialGradient id="sp-rivet" cx="35%" cy="30%" r="70%">
              <stop offset="0" stopColor="#e8eefa" />
              <stop offset="1" stopColor="#4a5470" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="880" height="820" fill="#1a1f30" />
          {/* Kabarık metal plakalar (üst sıra büyük, alt sıra küçük), parlak perçinler */}
          {[0, 220, 440, 660].map((x) => (
            <g key={x}>
              <rect x={x + 8} y="8" width="204" height="296" rx="18" fill="url(#sp-plate)" />
              <rect x={x + 30} y="40" width="160" height="60" rx="10" fill="url(#sp-plate2)" />
              {[[22, 22], [198, 22], [22, 290], [198, 290]].map(([dx, dy], i) => (
                <circle key={i} cx={x + dx} cy={dy} r="6" fill="url(#sp-rivet)" />
              ))}
            </g>
          ))}
          {[0, 176, 352, 528, 704].map((x) => (
            <rect key={`lo${x}`} x={x + 8} y="384" width="160" height="160" rx="16" fill="url(#sp-plate2)" />
          ))}
          {[0, 1].map((i) => (
            <g key={`vent${i}`}>
              {Array.from({ length: 5 }, (_, j) => (
                <rect key={j} x={40 + i * 352 + 30} y={420 + j * 22} width="100" height="10" rx="5" fill="#141826" />
              ))}
            </g>
          ))}
          <rect x="0" y="320" width="880" height="22" fill="url(#sp-pipe)" />
          <rect x="0" y="350" width="880" height="12" fill="url(#sp-pipe)" opacity="0.7" />
          {[200, 520].map((x) => (
            <rect key={x} x={x} y="314" width="18" height="54" rx="4" fill="#5a6480" />
          ))}
          {/* Konsol: ekranlı, düğmeli */}
          <rect x="60" y="560" width="420" height="200" rx="18" fill="url(#sp-panel)" />
          <rect x="60" y="560" width="420" height="6" rx="3" fill="#6a7490" />
          <rect x="90" y="650" width="190" height="80" rx="8" fill="#0a1420" stroke="#3a4258" strokeWidth="3" />
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="sp-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a3146" />
            <stop offset="1" stopColor="#181c2a" />
          </linearGradient>
          <linearGradient id="sp-panel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a4258" />
            <stop offset="1" stopColor="#232838" />
          </linearGradient>
          <linearGradient id="sp-pipe" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a94a8" />
            <stop offset="0.5" stopColor="#c8d0dc" />
            <stop offset="1" stopColor="#4a5266" />
          </linearGradient>
        </defs>
        <motion.polyline points="100,700 130,690 150,710 180,676 210,700 240,686 270,700" fill="none" stroke="#5df2a8" strokeWidth="3" filter="url(#nk-bloom)" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.4, repeat: Infinity }} />
        {[110, 220, 330, 430].map((x, i) => (
          <motion.circle key={x} cx={x} cy="620" r="12" fill={["#ff5c8a", "#16c47f", "#ffd21f", "#00b8ff"][i]} filter="url(#nk-bloom)" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1 + i * 0.3, repeat: Infinity }} />
        ))}
      </Layer>
      <Painted look="puff" seed={492}>
        <defs>
          <linearGradient id="sp-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a3146" />
            <stop offset="1" stopColor="#181c2a" />
          </linearGradient>
          <linearGradient id="sp-panel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a4258" />
            <stop offset="1" stopColor="#232838" />
          </linearGradient>
          <linearGradient id="sp-pipe" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a94a8" />
            <stop offset="0.5" stopColor="#c8d0dc" />
            <stop offset="1" stopColor="#4a5266" />
          </linearGradient>
        </defs>
          <circle cx="400" cy="700" r="9" fill="#9aa3b8" />
          <line x1="394" y1="700" x2="406" y2="700" stroke="#555" strokeWidth="3" />
          {/* Zemin: ızgara plakalar */}
          <rect x="0" y="820" width={W} height="80" fill="#262c3b" />
          <rect x="0" y="820" width={W} height="5" fill="#4a5470" />
          {Array.from({ length: 16 }, (_, i) => (
            <rect key={i} x={i * 100} y="826" width="3" height="74" fill="#000" opacity="0.3" />
          ))}
          {/* Uyarı şeridi */}
          <rect x="0" y="810" width={W} height="10" fill="#ffd21f" opacity="0.7" />
          {Array.from({ length: 40 }, (_, i) => (
            <polygon key={i} points={`${i * 40},810 ${i * 40 + 20},810 ${i * 40 + 10},820 ${i * 40 - 10},820`} fill="#1a1a1a" opacity="0.8" />
          ))}
      </Painted>
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
      <Actor shadow={false} x={320} y={430} size={116} look={look({ shape: "sphere" })} color="#F4F4F6" expression="happy" move={{ animate: { y: [0, -30, 0], rotate: [-8, 8, -8] }, transition: { duration: 6, repeat: Infinity, ease: "easeInOut" } }} front={<Helmet />} back={<><Hand x={-6} y={10} /><Hand x={30} y={8} /></>} />
      {/* Damlaları ağzıyla yakalayan */}
      <Actor shadow={false} x={540} y={520} size={100} look={look({ shape: "bean" })} color="#FF6A3D" expression={beat.i === 1 ? "surprised" : "happy"} move={{ animate: { y: [0, -20, 0], rotate: [10, -6, 10] }, transition: { duration: 5, repeat: Infinity, ease: "easeInOut" } }} act={on(beat, 1, { animate: { x: [0, 40, 0] }, transition: { duration: 1.6 } })} actKey={k} />
      {/* Vida sıkan tamirci */}
      <Actor x={360} y={760} size={104} look={look({ shape: "cube", head: "cap" })} color="#FFD21F" expression="focused" move={breathe(3, 2)} act={on(beat, 2, { animate: { rotate: [0, -5, 5, -5, 0] }, transition: { duration: 0.8 } })} actKey={k} front={<Wrench k={beat.i === 2 ? k : 0} />} flip />
      {/* Jetpack'li */}
      <Actor shadow={false} morph={beat.n[3]} morphDelay={800}
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
    <Stage medium="sketch" clock="st-riso"
      sky="linear-gradient(180deg, #4fa8e8 0%, #8fd0f6 40%, #cdeefc 70%, #ffe6c4 100%)"
      vignette={0.22}
      lights={[{ x: 1350, y: 140, r: 700, color: "rgba(255,240,190,0.55)", opacity: 0.55 }]}
    >
      <Painted look="riso" seed={467}>
        <defs>
          <linearGradient id="bc-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f86c4" />
            <stop offset="0.5" stopColor="#2fb0d9" />
            <stop offset="1" stopColor="#5fd6d6" />
          </linearGradient>
          <linearGradient id="bc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6dfa6" />
            <stop offset="1" stopColor="#e6c07c" />
          </linearGradient>
          <linearGradient id="bc-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b4226" />
            <stop offset="0.5" stopColor="#a8784a" />
            <stop offset="1" stopColor="#6b4226" />
          </linearGradient>
          <radialGradient id="bc-cloud" cx="50%" cy="35%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e2eef8" />
          </radialGradient>
        </defs>
        {/* Güneş: parlak çekirdek, geniş hale */}
        <circle cx="1350" cy="140" r="170" fill="#fff6c8" opacity="0.35" filter="url(#nk-blur)" />
        <circle cx="1350" cy="140" r="70" fill="#fffbe6" />
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="bc-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f86c4" />
            <stop offset="0.5" stopColor="#2fb0d9" />
            <stop offset="1" stopColor="#5fd6d6" />
          </linearGradient>
          <linearGradient id="bc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6dfa6" />
            <stop offset="1" stopColor="#e6c07c" />
          </linearGradient>
          <linearGradient id="bc-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b4226" />
            <stop offset="0.5" stopColor="#a8784a" />
            <stop offset="1" stopColor="#6b4226" />
          </linearGradient>
          <radialGradient id="bc-cloud" cx="50%" cy="35%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e2eef8" />
          </radialGradient>
        </defs>
        {/* Kabarık bulutlar (alt kenarı gölgeli) */}
        {[[860, 110], [1080, 230], [470, 300], [180, 160]].map(([x, y], i) => (
          <motion.g key={i} animate={{ x: [0, 40, 0] }} transition={{ duration: 30 + i * 8, repeat: Infinity, ease: "easeInOut" }}>
            <ellipse cx={x} cy={y + 8} rx="96" ry="22" fill="#c8dcec" opacity="0.8" />
            <ellipse cx={x} cy={y} rx="90" ry="26" fill="url(#bc-cloud)" />
            <ellipse cx={x + 40} cy={y - 18} rx="50" ry="28" fill="url(#bc-cloud)" />
            <ellipse cx={x - 36} cy={y - 10} rx="40" ry="22" fill="url(#bc-cloud)" />
          </motion.g>
        ))}
      </Layer>
      <Painted look="riso" seed={467}>
        <defs>
          <linearGradient id="bc-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f86c4" />
            <stop offset="0.5" stopColor="#2fb0d9" />
            <stop offset="1" stopColor="#5fd6d6" />
          </linearGradient>
          <linearGradient id="bc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6dfa6" />
            <stop offset="1" stopColor="#e6c07c" />
          </linearGradient>
          <linearGradient id="bc-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b4226" />
            <stop offset="0.5" stopColor="#a8784a" />
            <stop offset="1" stopColor="#6b4226" />
          </linearGradient>
          <radialGradient id="bc-cloud" cx="50%" cy="35%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e2eef8" />
          </radialGradient>
        </defs>
        {/* Uzakta bir ada ve yelkenli */}
        <path d="M80 476 Q 160 420 240 450 Q 300 430 360 476 Z" fill="#6aa8b8" opacity="0.7" />
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="bc-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f86c4" />
            <stop offset="0.5" stopColor="#2fb0d9" />
            <stop offset="1" stopColor="#5fd6d6" />
          </linearGradient>
          <linearGradient id="bc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6dfa6" />
            <stop offset="1" stopColor="#e6c07c" />
          </linearGradient>
          <linearGradient id="bc-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b4226" />
            <stop offset="0.5" stopColor="#a8784a" />
            <stop offset="1" stopColor="#6b4226" />
          </linearGradient>
          <radialGradient id="bc-cloud" cx="50%" cy="35%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e2eef8" />
          </radialGradient>
        </defs>
        <motion.g animate={{ x: [0, 60, 0] }} transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}>
          <path d="M620 470 l 40 0 l -6 8 l -28 0 Z" fill="#fff" />
          <path d="M640 468 l 0 -40 l 22 36 Z" fill="#fff" />
          <path d="M638 468 l 0 -30 l -16 28 Z" fill="#ff7a5a" />
        </motion.g>
      </Layer>
      <Painted look="riso" seed={467}>
        <defs>
          <linearGradient id="bc-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f86c4" />
            <stop offset="0.5" stopColor="#2fb0d9" />
            <stop offset="1" stopColor="#5fd6d6" />
          </linearGradient>
          <linearGradient id="bc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6dfa6" />
            <stop offset="1" stopColor="#e6c07c" />
          </linearGradient>
          <linearGradient id="bc-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b4226" />
            <stop offset="0.5" stopColor="#a8784a" />
            <stop offset="1" stopColor="#6b4226" />
          </linearGradient>
          <radialGradient id="bc-cloud" cx="50%" cy="35%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e2eef8" />
          </radialGradient>
        </defs>
        {/* Deniz: derinden sığa renk geçişi, ufukta parlama, güneş yansıması */}
        <rect x="0" y="470" width={W} height="200" fill="url(#bc-sea)" />
        <rect x="0" y="470" width={W} height="10" fill="#e8f8ff" opacity="0.5" />
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="bc-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f86c4" />
            <stop offset="0.5" stopColor="#2fb0d9" />
            <stop offset="1" stopColor="#5fd6d6" />
          </linearGradient>
          <linearGradient id="bc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6dfa6" />
            <stop offset="1" stopColor="#e6c07c" />
          </linearGradient>
          <linearGradient id="bc-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b4226" />
            <stop offset="0.5" stopColor="#a8784a" />
            <stop offset="1" stopColor="#6b4226" />
          </linearGradient>
          <radialGradient id="bc-cloud" cx="50%" cy="35%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e2eef8" />
          </radialGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.rect key={`sp${i}`} x={1290 + (i % 2) * 40 - i * 6} y={490 + i * 26} width={110 - i * 14} height="5" rx="2.5" fill="#fffbe0" animate={{ opacity: [0.3, 0.9, 0.3], x: [0, 10, 0] }} transition={{ duration: 2 + i * 0.4, repeat: Infinity }} />
        ))}
        {[0, 1, 2].map((i) => (
          <motion.path key={i} d={`M-100 ${560 + i * 40} q 100 -18 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0`} stroke="#bfeaff" strokeWidth="4" fill="none" opacity="0.6" animate={{ x: [0, 200] }} transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "linear" }} />
        ))}
      </Layer>
      <Painted look="riso" seed={467}>
        <defs>
          <linearGradient id="bc-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f86c4" />
            <stop offset="0.5" stopColor="#2fb0d9" />
            <stop offset="1" stopColor="#5fd6d6" />
          </linearGradient>
          <linearGradient id="bc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6dfa6" />
            <stop offset="1" stopColor="#e6c07c" />
          </linearGradient>
          <linearGradient id="bc-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b4226" />
            <stop offset="0.5" stopColor="#a8784a" />
            <stop offset="1" stopColor="#6b4226" />
          </linearGradient>
          <radialGradient id="bc-cloud" cx="50%" cy="35%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e2eef8" />
          </radialGradient>
        </defs>
        {/* Poster dili: güneşin alt yarısında çizgiler, denizde stilize tarak dalgalar */}
        {[166, 182, 196, 208].map((y, i) => (
          <rect key={`ss${i}`} x="1270" y={y} width="160" height={3 + i * 1.5} fill="#8fd0f6" />
        ))}
        {[536, 572, 608].map((y, r) => (
          <g key={`wv${r}`}>
            {Array.from({ length: 34 }, (_, i) => (
              <path key={i} d={`M${i * 50 + (r % 2) * 25 - 20} ${y} a25 13 0 0 1 50 0`} fill="none" stroke="#e8f8ff" strokeWidth={4 - r} opacity={0.75 - r * 0.15} />
            ))}
          </g>
        ))}
        {/* Kumsal */}
        {/* Islak kum şeridi, sonra kuru kum */}
        <path d="M0 630 Q 400 590 800 620 T 1600 610 L1600 680 L0 680 Z" fill="#d9b878" />
        <path d="M0 640 Q 400 600 800 630 T 1600 620 L1600 900 L0 900 Z" fill="url(#bc-sand)" />
        {Array.from({ length: 60 }, (_, i) => (
          <circle key={`g${i}`} cx={(i * 97) % W} cy={680 + ((i * 41) % 210)} r={1.5 + (i % 3) * 0.6} fill="#c49a5a" opacity="0.4" />
        ))}
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="bc-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f86c4" />
            <stop offset="0.5" stopColor="#2fb0d9" />
            <stop offset="1" stopColor="#5fd6d6" />
          </linearGradient>
          <linearGradient id="bc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6dfa6" />
            <stop offset="1" stopColor="#e6c07c" />
          </linearGradient>
          <linearGradient id="bc-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b4226" />
            <stop offset="0.5" stopColor="#a8784a" />
            <stop offset="1" stopColor="#6b4226" />
          </linearGradient>
          <radialGradient id="bc-cloud" cx="50%" cy="35%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e2eef8" />
          </radialGradient>
        </defs>
        <motion.path d="M0 640 Q 400 600 800 630 T 1600 620" stroke="#fff" strokeWidth="10" fill="none" opacity="0.75" animate={{ y: [0, 10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
        <motion.path d="M0 646 Q 400 606 800 636 T 1600 626" stroke="#fff" strokeWidth="4" fill="none" strokeDasharray="20 14" opacity="0.5" animate={{ y: [0, 12, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} />
      </Layer>
      <Painted look="riso" seed={467}>
        <defs>
          <linearGradient id="bc-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f86c4" />
            <stop offset="0.5" stopColor="#2fb0d9" />
            <stop offset="1" stopColor="#5fd6d6" />
          </linearGradient>
          <linearGradient id="bc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6dfa6" />
            <stop offset="1" stopColor="#e6c07c" />
          </linearGradient>
          <linearGradient id="bc-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b4226" />
            <stop offset="0.5" stopColor="#a8784a" />
            <stop offset="1" stopColor="#6b4226" />
          </linearGradient>
          <radialGradient id="bc-cloud" cx="50%" cy="35%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e2eef8" />
          </radialGradient>
        </defs>
        {/* Palmiye: boğumlu gövde, iki tonlu yapraklar, gölgesi kumda */}
        <ellipse cx="300" cy="866" rx="160" ry="20" fill="#b8925a" opacity="0.5" />
        <path d="M200 860 C 220 700, 180 560, 230 420" stroke="url(#bc-trunk)" strokeWidth="28" fill="none" strokeLinecap="round" />
        {Array.from({ length: 10 }, (_, i) => {
          const t = i / 10;
          const y = 850 - t * 420;
          const x = 200 + Math.sin(t * 3) * 14 + t * 22;
          return <path key={i} d={`M${x - 14} ${y} q 14 -8 28 0`} stroke="#5a3820" strokeWidth="3" fill="none" opacity="0.6" />;
        })}
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="bc-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f86c4" />
            <stop offset="0.5" stopColor="#2fb0d9" />
            <stop offset="1" stopColor="#5fd6d6" />
          </linearGradient>
          <linearGradient id="bc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6dfa6" />
            <stop offset="1" stopColor="#e6c07c" />
          </linearGradient>
          <linearGradient id="bc-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b4226" />
            <stop offset="0.5" stopColor="#a8784a" />
            <stop offset="1" stopColor="#6b4226" />
          </linearGradient>
          <radialGradient id="bc-cloud" cx="50%" cy="35%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e2eef8" />
          </radialGradient>
        </defs>
        <motion.g style={{ transformOrigin: "230px 420px" }} animate={{ rotate: [-3, 3, -3] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
          {[-150, -100, -40, 20, 80, 140].map((a) => (
            <g key={a} transform={`rotate(${a} 230 420)`}>
              <path d="M230 420 q 70 -40 150 10 q -80 -10 -150 -10" fill="#2f9e5a" />
              <path d="M230 420 q 70 -40 150 10 q -70 -24 -150 -10" fill="#4cc27a" />
              <path d="M240 416 q 60 -24 130 10" stroke="#1f7a44" strokeWidth="2" fill="none" />
            </g>
          ))}
          <circle cx="222" cy="430" r="14" fill="#6b4226" />
          <circle cx="242" cy="432" r="14" fill="#6b4226" />
        </motion.g>
      </Layer>
      <Painted look="riso" seed={467}>
        <defs>
          <linearGradient id="bc-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f86c4" />
            <stop offset="0.5" stopColor="#2fb0d9" />
            <stop offset="1" stopColor="#5fd6d6" />
          </linearGradient>
          <linearGradient id="bc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6dfa6" />
            <stop offset="1" stopColor="#e6c07c" />
          </linearGradient>
          <linearGradient id="bc-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b4226" />
            <stop offset="0.5" stopColor="#a8784a" />
            <stop offset="1" stopColor="#6b4226" />
          </linearGradient>
          <radialGradient id="bc-cloud" cx="50%" cy="35%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e2eef8" />
          </radialGradient>
        </defs>
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
      </Painted>
      <Layer>
        <defs>
          <linearGradient id="bc-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f86c4" />
            <stop offset="0.5" stopColor="#2fb0d9" />
            <stop offset="1" stopColor="#5fd6d6" />
          </linearGradient>
          <linearGradient id="bc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6dfa6" />
            <stop offset="1" stopColor="#e6c07c" />
          </linearGradient>
          <linearGradient id="bc-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b4226" />
            <stop offset="0.5" stopColor="#a8784a" />
            <stop offset="1" stopColor="#6b4226" />
          </linearGradient>
          <radialGradient id="bc-cloud" cx="50%" cy="35%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e2eef8" />
          </radialGradient>
        </defs>
        <motion.circle key={`s${beat.i === 2 ? k : 0}`} cx="1230" cy="752" r="46" fill="#e8c887" initial={{ scale: beat.i === 2 ? 0.6 : 1 }} animate={{ scale: 1 }} transition={{ duration: 1.6 }} style={{ transformOrigin: "1230px 800px" }} />
      </Layer>
      <Painted look="riso" seed={467}>
        <defs>
          <linearGradient id="bc-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f86c4" />
            <stop offset="0.5" stopColor="#2fb0d9" />
            <stop offset="1" stopColor="#5fd6d6" />
          </linearGradient>
          <linearGradient id="bc-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6dfa6" />
            <stop offset="1" stopColor="#e6c07c" />
          </linearGradient>
          <linearGradient id="bc-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b4226" />
            <stop offset="0.5" stopColor="#a8784a" />
            <stop offset="1" stopColor="#6b4226" />
          </linearGradient>
          <radialGradient id="bc-cloud" cx="50%" cy="35%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e2eef8" />
          </radialGradient>
        </defs>
        <rect x="1212" y="740" width="8" height="18" rx="4" fill="#5a4220" />
        <rect x="1240" y="740" width="8" height="18" rx="4" fill="#5a4220" />
        {/* Şezlong */}
        <path d="M760 760 L960 760 L1000 690" stroke="#2b8cff" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M790 760 l-10 50 M940 760 l10 50" stroke="#b9c0cc" strokeWidth="6" />
      </Painted>
      <BeachClock />
      {/* Denizde can simidiyle batıp çıkan */}
      <Actor shadow={false} morph={beat.n[3]} morphDelay={550}
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
      <Actor x={660} y={790} size={104} look={look({ shape: "cloud", texture: "plush", head: "straw" })} color="#2FD4C0" expression={beat.i === 1 ? "happy" : "idle"} move={breathe(3)} act={on(beat, 1, { animate: { rotate: [0, -8, 0] }, transition: { duration: 1.4 } })} actKey={k} front={<><Coconut sip={beat.i === 1} k={k} /></>} />
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

