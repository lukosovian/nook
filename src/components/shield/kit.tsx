/**
 * Kalkan sahnelerinin ortak parçaları.
 *  - Stage: 1600×900'lük sahne; ekranı kaplayacak kadar büyür, alttan ortalanır (geniş ekranda yanlar,
 *    dar ekranda üst kesilir — karakterler hep görünür).
 *  - Actor: sahnede bir Nook. Eşyaları "yüz biriminde" çizilir: yüzün merkezi (12,12), yarıçapı 12;
 *    alt kenar y=24. Eller beyaz toplar (H), mascot/Props ile aynı dil.
 *  - useBeat: birkaç saniyede bir sahnede bir olay seçer (odun atılır, çalı hışırdar…).
 */
import { useEffect, useState, type ReactNode } from "react";
import { motion, type TargetAndTransition, type Transition } from "motion/react";
import type { Look } from "../../lib/look";
import { DEFAULT_LOOK } from "../../lib/look";
import type { Expression } from "../../store/nook";
import { NookFigure } from "../mascot/Figure";

export const W = 1600;
export const H = 900;

export const look = (p: Partial<Look>): Look => ({ ...DEFAULT_LOOK, ...p });
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Ekranı kaplayan sahne */
export function Stage({ children, sky }: { children: ReactNode; sky: string }) {
  const [k, setK] = useState(1);
  useEffect(() => {
    const fit = () => setK(Math.max(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: sky }}>
      <svg width="0" height="0" className="absolute">
        <defs>
          <radialGradient id="nk-hand" cx="35%" cy="30%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#e4e4ea" />
            <stop offset="1" stopColor="#a9a9b4" />
          </radialGradient>
          <radialGradient id="nk-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffd27a" stopOpacity="0.9" />
            <stop offset="0.4" stopColor="#ff8a3d" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ff6a3d" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nk-soft" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      <div className="absolute bottom-0 left-1/2" style={{ width: W, height: H, transform: `translateX(-50%) scale(${k})`, transformOrigin: "50% 100%" }}>
        {children}
      </div>
    </div>
  );
}

/** Tüm sahneyi kaplayan SVG katmanı (arka plan, ön plan) */
export function Layer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={`absolute inset-0 overflow-visible ${className}`}>
      {children}
    </svg>
  );
}

/** Beyaz yüzen el (yüz biriminde) */
export function Hand({ x, y, r = 2.7 }: { x: number; y: number; r?: number }) {
  return <ellipse cx={x} cy={y} rx={r * 1.12} ry={r} fill="url(#nk-hand)" style={{ filter: "drop-shadow(0 0.4px 0.6px rgba(0,0,0,0.45))" }} />;
}

/**
 * Sahnedeki bir Nook: (x, y) gövdenin alt-orta noktası. `front` eşyaları gövdenin önünde, `back`
 * arkasında çizilir (ikisi de yüz biriminde SVG). `move` sürekli kıpırtı; `act` olay anındaki hareket.
 */
export function Actor({
  x,
  y,
  size,
  look: lk,
  color,
  expression = "idle",
  flip = false,
  front,
  back,
  move,
  act,
  actKey,
  z,
  opacity,
}: {
  x: number;
  y: number;
  size: number;
  look: Look;
  color: string;
  expression?: Expression;
  flip?: boolean;
  front?: ReactNode;
  back?: ReactNode;
  move?: { animate: TargetAndTransition; transition: Transition };
  act?: { animate: TargetAndTransition; transition: Transition } | null;
  actKey?: number;
  z?: number;
  opacity?: number;
}) {
  const box = { left: -size / 2, top: -size / 2, width: size * 2, height: size * 2 };
  const svg = (children: ReactNode) => (
    <svg viewBox="-12 -12 48 48" className="pointer-events-none absolute overflow-visible" style={box}>
      {children}
    </svg>
  );
  return (
    <div className="absolute" style={{ left: x - size / 2, top: y - size, width: size, height: size, zIndex: z, opacity }}>
      <motion.div className="absolute inset-0" style={{ originY: 1 }} animate={move?.animate} transition={move?.transition}>
        <motion.div key={actKey} className="absolute inset-0" style={{ originY: 1 }} animate={act?.animate} transition={act?.transition}>
          <motion.div className="absolute inset-0" animate={{ scaleX: flip ? -1 : 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
            {back && svg(back)}
            <NookFigure look={lk} color={color} size={size} expression={expression} />
            {front && svg(front)}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Hafif nefes alma / sallanma */
export const breathe = (d = 3.2, amp = 3): { animate: TargetAndTransition; transition: Transition } => ({
  animate: { y: [0, -amp, 0], scaleY: [1, 1.025, 1] },
  transition: { duration: d, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 2 },
});
export const sway = (d = 2.6, deg = 4): { animate: TargetAndTransition; transition: Transition } => ({
  animate: { rotate: [-deg, deg, -deg] },
  transition: { duration: d, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 2 },
});
export const hop = (h = 26): { animate: TargetAndTransition; transition: Transition } => ({
  animate: { y: [0, -h, 0, -h * 0.35, 0] },
  transition: { duration: 0.9, ease: "easeOut" },
});

/**
 * Sahnenin olay zamanlayıcısı: `count` olaydan birini 4,5–8,5 sn'de bir seçer (aynısı arka arkaya
 * gelmez). `k` her olayda artar — animasyonları baştan oynatmak için anahtar.
 */
export function useBeat(count: number) {
  const [beat, setBeat] = useState({ i: -1, k: 0 });
  useEffect(() => {
    let t = 0;
    const next = (prev: number) => {
      t = window.setTimeout(() => {
        let i = Math.floor(Math.random() * count);
        if (i === prev && count > 1) i = (i + 1) % count;
        setBeat((b) => ({ i, k: b.k + 1 }));
        next(i);
      }, rnd(4500, 8500));
    };
    // İlk olay biraz erken gelsin
    t = window.setTimeout(() => {
      setBeat((b) => ({ i: 0, k: b.k + 1 }));
      next(0);
    }, 2200);
    return () => window.clearTimeout(t);
  }, [count]);
  return beat;
}

/** Olay o anda bu mu: evetse oynatılacak hareket, değilse null */
export const on = <T,>(beat: { i: number }, i: number, v: T): T | null => (beat.i === i ? v : null);

/** Ekranda yağan/uçuşan küçük parçalar (kar, yağmur, yaprak, kıvılcım) */
export function Drift({
  count,
  render,
  from,
  to,
  dur,
  xs = [0, W],
  sway: sw = 0,
  rotate = 0,
}: {
  count: number;
  render: (i: number) => ReactNode;
  from: number;
  to: number;
  dur: [number, number];
  xs?: [number, number];
  sway?: number;
  rotate?: number;
}) {
  const [items] = useState(() => Array.from({ length: count }, (_, i) => ({ i, x: rnd(xs[0], xs[1]), d: rnd(dur[0], dur[1]), delay: -rnd(0, dur[1]), s: rnd(-1, 1) })));
  return (
    <>
      {items.map((p) => (
        <motion.div
          key={p.i}
          className="pointer-events-none absolute left-0 top-0"
          initial={{ x: p.x, y: from }}
          animate={{ y: [from, to], x: sw ? [p.x, p.x + sw * p.s, p.x - sw * p.s * 0.5] : p.x, rotate: rotate ? [0, rotate * p.s] : 0 }}
          transition={{ duration: p.d, repeat: Infinity, ease: "linear", delay: p.delay }}
        >
          {render(p.i)}
        </motion.div>
      ))}
    </>
  );
}

/** Gökyüzünde parlayan yıldızlar */
export function Stars({ count = 60, maxY = 500 }: { count?: number; maxY?: number }) {
  const [stars] = useState(() => Array.from({ length: count }, (_, i) => ({ i, x: rnd(0, W), y: rnd(0, maxY), r: rnd(0.8, 2.2), d: rnd(2, 5), delay: rnd(0, 4) })));
  return (
    <Layer>
      {stars.map((s) => (
        <motion.circle key={s.i} cx={s.x} cy={s.y} r={s.r} fill="#fff" animate={{ opacity: [0.15, 0.9, 0.15] }} transition={{ duration: s.d, repeat: Infinity, delay: s.delay }} />
      ))}
    </Layer>
  );
}
