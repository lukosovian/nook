/**
 * Güncelleme kapsülünün animasyonları: indirirken ilerlemeyi kendi diliyle gösterir (roket yol alır,
 * pil dolar, filiz büyür…), inince "bitti" anı oynar (roket fırlar, balon patlar, çiçek açar…).
 * Hangisinin geleceği Ayarlar › Ada ve Nook › Animasyonlar'da: biri, sırayla ya da karışık.
 * Kapsülün solunda Nook ve yazı durur; animasyon sağdaki sahnede (112×40) oynar, "Dalga" bütün kapsülü doldurur.
 */
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { pct, tt } from "../../lib/i18n";

export type UpdateAnimId = "ring" | "rocket" | "cargo" | "battery" | "sprout" | "coffee" | "retro" | "orbit" | "balloon" | "wave";
/** Ayardaki değer: bir animasyon, "cycle" (sırayla) ya da "random" (karışık) */
export type UpdateAnimPref = UpdateAnimId | "cycle" | "random";

interface AnimProps {
  /** 0–100 */
  p: number;
  /** İndirme bitti, yeniden başlamak üzere */
  done: boolean;
}

interface AnimDef {
  id: UpdateAnimId;
  label: string;
  color: string;
  /** Bitince yazan başlık */
  doneTitle: string;
  Comp: (p: AnimProps) => React.JSX.Element;
}

/** Kapsülün sağındaki sahne (112×40) */
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <svg className="absolute right-1.5 top-0 overflow-visible" width={112} height={40} viewBox="0 0 112 40">
      {children}
    </svg>
  );
}

const box = { transformBox: "fill-box", transformOrigin: "center" } as const;

/** Bitişte merkezden saçılan pırıltılar */
function Burst({ x, y, n = 8, r = 18, colors = [ACCENT.yellow, ACCENT.pink, ACCENT.green, ACCENT.blue], delay = 0, repeat = true }: { x: number; y: number; n?: number; r?: number; colors?: string[]; delay?: number; repeat?: boolean }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        return (
          <motion.text
            key={i}
            x={x}
            y={y}
            fontSize={8}
            fontWeight={900}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={colors[i % colors.length]}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
            animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.62, opacity: [0, 1, 0], scale: [0.3, 1.1, 0.5] }}
            transition={{ duration: 1, delay: delay + i * 0.03, repeat: repeat ? Infinity : 0, repeatDelay: 0.35, ease: "easeOut" }}
          >
            ✦
          </motion.text>
        );
      })}
    </>
  );
}

/** Konfeti: yukarı fırlayıp düşen küçük şeritler */
function Confetti({ x, y, n = 12, spread = 46, delay = 0 }: { x: number; y: number; n?: number; spread?: number; delay?: number }) {
  const colors = [ACCENT.yellow, ACCENT.pink, ACCENT.green, ACCENT.blue, ACCENT.orange, ACCENT.purple];
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const dx = ((i / (n - 1)) * 2 - 1) * spread * (0.6 + ((i * 37) % 10) / 25);
        const up = 14 + ((i * 53) % 9);
        return (
          <motion.rect
            key={i}
            x={x - 1.5}
            y={y - 1}
            width={3}
            height={2}
            rx={0.6}
            fill={colors[i % colors.length]}
            style={box}
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
            animate={{ x: [0, dx * 0.6, dx], y: [0, -up, 12], opacity: [0, 1, 1, 0], rotate: [0, 180, 360 + i * 20] }}
            transition={{ duration: 1.4, delay: delay + (i % 4) * 0.04, repeat: Infinity, repeatDelay: 0.4, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

// ------------------------------------------------------------------ 1. Halka

function Ring({ p, done }: AnimProps) {
  const r = 10;
  const c = 2 * Math.PI * r;
  const color = done ? ACCENT.green : ACCENT.blue;
  return (
    <Stage>
      <circle cx={92} cy={20} r={r} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth={2.6} />
      <motion.circle cx={92} cy={20} r={r} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeDasharray={c} transform="rotate(-90 92 20)" initial={false} animate={{ strokeDashoffset: c * (1 - p / 100) }} transition={{ type: "spring", stiffness: 120, damping: 22 }} />
      {done ? (
        <motion.path d="M87.5 20.2 90.8 23.4 96.6 16.8" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.1 }} />
      ) : (
        <motion.path d="M92 15v8M88.5 19.8 92 23.3l3.5-3.5" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" animate={{ y: [-1.5, 1.5, -1.5] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }} />
      )}
      {/* Altta ilerleme çubuğu, üstünde kayan parıltı */}
      <rect x={2} y={35} width={74} height={2} rx={1} fill="rgb(255 255 255 / 0.08)" />
      <motion.rect x={2} y={35} height={2} rx={1} fill={color} initial={false} animate={{ width: Math.max(2, (p / 100) * 74) }} transition={{ type: "spring", stiffness: 120, damping: 24 }} />
      {!done && <motion.rect y={35} width={10} height={2} rx={1} fill="white" opacity={0.7} animate={{ x: [-8, 72] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} />}
      {done && <Burst x={92} y={20} r={20} />}
    </Stage>
  );
}

// ------------------------------------------------------------------ 2. Roket

function Rocket({ p, done }: AnimProps) {
  const x = 8 + (p / 100) * 84;
  return (
    <Stage>
      {/* Pist: noktalar ve hedef bayrağı */}
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={6 + i * 8.4} cy={30} r={0.9} fill={6 + i * 8.4 < x ? tintText(ACCENT.orange) : "rgb(255 255 255 / 0.18)"} />
      ))}
      <path d="M104 31V17" stroke="rgb(255 255 255 / 0.4)" strokeWidth={1.2} />
      <path d="M104 17h7l-2 2.5 2 2.5h-7z" fill={ACCENT.green} />
      <motion.g initial={false} animate={done ? { x: [x, x + 6, 140], y: [22, 20, -30], rotate: [0, -10, -38] } : { x, y: 22, rotate: 0 }} transition={done ? { duration: 1.1, ease: "easeIn", times: [0, 0.3, 1] } : { type: "spring", stiffness: 90, damping: 18 }}>
        {/* Alev */}
        <motion.path d="M-9 0 L-3 -2.6 L-3 2.6 Z" fill={ACCENT.orange} style={{ transformOrigin: "-3px 0px" }} animate={{ scaleX: done ? [1.6, 2.4, 1.6] : [0.8, 1.3, 0.8] }} transition={{ duration: 0.18, repeat: Infinity }} />
        <motion.path d="M-6.5 0 L-3 -1.4 L-3 1.4 Z" fill={ACCENT.yellow} style={{ transformOrigin: "-3px 0px" }} animate={{ scaleX: [1, 1.5, 1] }} transition={{ duration: 0.14, repeat: Infinity }} />
        {/* Gövde, pencere, kanatlar */}
        <path d="M-4 -3.4 L6 -3.4 Q12 0 6 3.4 L-4 3.4 Z" fill="white" />
        <path d="M-4 -3.4 L-7 -6.5 L-1 -3.4 Z M-4 3.4 L-7 6.5 L-1 3.4 Z" fill={ACCENT.red} />
        <circle cx={3.2} cy={0} r={1.5} fill={ACCENT.blue} />
      </motion.g>
      {/* Kalkışta arkada kalan duman */}
      {done &&
        [0, 1, 2, 3].map((i) => (
          <motion.circle key={i} cx={x - 4 + i * 5} cy={24 - i * 3} r={3} fill="rgb(255 255 255 / 0.5)" initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: [0.2, 1.6, 2.2], opacity: [0, 0.7, 0] }} transition={{ duration: 1.3, delay: 0.15 + i * 0.12, repeat: Infinity, repeatDelay: 0.6 }} style={box} />
        ))}
      {done && <Burst x={96} y={8} r={14} n={6} delay={0.8} />}
    </Stage>
  );
}

// ------------------------------------------------------------------ 3. Kargo

function Cargo({ p, done }: AnimProps) {
  const x = 4 + (p / 100) * 78;
  return (
    <Stage>
      {/* Bant: kayan çizgiler, iki makara */}
      <rect x={2} y={29} width={92} height={5} rx={2.5} fill="rgb(255 255 255 / 0.1)" />
      <motion.line x1={4} y1={31.5} x2={92} y2={31.5} stroke="rgb(255 255 255 / 0.35)" strokeWidth={1} strokeDasharray="3 4" animate={done ? undefined : { strokeDashoffset: [0, -14] }} transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }} />
      {/* Ev: varış yeri */}
      <path d="M98 31V22l6-5 6 5v9z" fill={tintBg(ACCENT.teal, 45)} />
      <path d="M96.5 22.5 104 16l7.5 6.5" fill="none" stroke={tintText(ACCENT.teal)} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <rect x={102.3} y={25} width={3.4} height={6} rx={0.6} fill={done ? ACCENT.yellow : "rgb(0 0 0 / 0.5)"} />
      {/* Paket */}
      <motion.g initial={false} animate={{ x: done ? 82 : x, y: done ? [0, -3, 0] : [0, -0.8, 0] }} transition={{ x: { type: "spring", stiffness: 90, damping: 18 }, y: { duration: done ? 0.5 : 0.35, repeat: Infinity } }}>
        <rect x={0} y={18} width={12} height={11} rx={1.5} fill="#C98A4B" />
        <rect x={5} y={18} width={2} height={11} fill="#E8B57A" />
        {/* Kapak: bitince açılır */}
        <motion.rect x={-0.6} y={16.2} width={13.2} height={3} rx={1} fill="#B5773C" style={{ transformOrigin: "-0.6px 17.7px" }} animate={{ rotate: done ? -120 : 0 }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.25 }} />
      </motion.g>
      {done && <Confetti x={88} y={18} n={12} spread={30} delay={0.4} />}
    </Stage>
  );
}

// ------------------------------------------------------------------ 4. Pil

function Battery({ p, done }: AnimProps) {
  const filled = done ? 5 : Math.floor(p / 20);
  const tone = done ? ACCENT.green : p < 34 ? ACCENT.red : p < 67 ? ACCENT.yellow : ACCENT.green;
  return (
    <Stage>
      <rect x={26} y={10} width={56} height={22} rx={5} fill="none" stroke={done ? tone : "rgb(255 255 255 / 0.55)"} strokeWidth={1.8} />
      <rect x={83} y={16.5} width={3.5} height={9} rx={1.5} fill={done ? tone : "rgb(255 255 255 / 0.55)"} />
      {Array.from({ length: 5 }, (_, i) => {
        const on = i < filled;
        const current = !done && i === filled;
        return (
          <motion.rect
            key={i}
            x={29.5 + i * 10.2}
            y={13.5}
            width={8.4}
            height={15}
            rx={2}
            fill={on || current ? tone : "rgb(255 255 255 / 0.06)"}
            initial={false}
            animate={current ? { opacity: [0.15, 0.8, 0.15] } : { opacity: on ? 1 : 1, scaleY: on ? [0.6, 1] : 1 }}
            transition={current ? { duration: 0.9, repeat: Infinity } : { duration: 0.25 }}
            style={box}
          />
        );
      })}
      {done && (
        <>
          <motion.rect x={22} y={6} width={64} height={30} rx={8} fill="none" stroke={tone} strokeWidth={1} animate={{ opacity: [0, 0.8, 0], scale: [0.9, 1.15, 1.25] }} transition={{ duration: 1, repeat: Infinity }} style={box} />
          <motion.path d="M56.5 9.5 49 22h6l-2 10.5 8.5-13.5h-6.2z" fill="white" stroke={tone} strokeWidth={1.2} strokeLinejoin="round" initial={{ scale: 0, rotate: -20 }} animate={{ scale: [0, 1.25, 1], rotate: 0 }} transition={{ duration: 0.45, delay: 0.15 }} style={box} />
          <Burst x={54} y={21} r={30} n={6} colors={[ACCENT.yellow, ACCENT.green]} delay={0.4} />
        </>
      )}
    </Stage>
  );
}

// ------------------------------------------------------------------ 5. Filiz

function Sprout({ p, done }: AnimProps) {
  const top = done ? 9 : 29 - (p / 100) * 18;
  const petals = 6;
  return (
    <Stage>
      {/* Saksı */}
      <path d="M45 29h22l-2.5 9h-17z" fill="#C2693F" />
      <rect x={43.5} y={27.5} width={25} height={3.5} rx={1.2} fill="#D97E50" />
      {/* Sap */}
      <motion.line x1={56} y1={28} x2={56} stroke="#5BCB6E" strokeWidth={2} strokeLinecap="round" initial={false} animate={{ y2: top }} transition={{ type: "spring", stiffness: 80, damping: 16 }} />
      {/* Yapraklar: yarıda ve dörtte üçte */}
      <motion.path d="M56 22c-5 0-8-3-8.5-6 4 .2 7.5 1.8 8.5 6z" fill="#7BDB7F" style={{ transformOrigin: "56px 22px" }} initial={false} animate={{ scale: p >= 35 || done ? 1 : 0, rotate: [0, -6, 0] }} transition={{ scale: { type: "spring", stiffness: 300, damping: 14 }, rotate: { duration: 2.4, repeat: Infinity } }} />
      <motion.path d="M56 17c5 0 8-3 8.5-6-4 .2-7.5 1.8-8.5 6z" fill="#7BDB7F" style={{ transformOrigin: "56px 17px" }} initial={false} animate={{ scale: p >= 70 || done ? 1 : 0, rotate: [0, 6, 0] }} transition={{ scale: { type: "spring", stiffness: 300, damping: 14 }, rotate: { duration: 2.1, repeat: Infinity } }} />
      {/* Çiçek */}
      {done && (
        <motion.g initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.25 }} style={{ transformOrigin: "56px 9px" }}>
          {Array.from({ length: petals }, (_, i) => {
            const a = (i / petals) * Math.PI * 2;
            return <circle key={i} cx={56 + Math.cos(a) * 4.2} cy={9 + Math.sin(a) * 4.2} r={3.2} fill={ACCENT.pink} />;
          })}
          <circle cx={56} cy={9} r={2.6} fill={ACCENT.yellow} />
        </motion.g>
      )}
      {/* Kalpler süzülür */}
      {done &&
        [0, 1, 2].map((i) => (
          <motion.text key={i} x={70 + i * 9} y={20} fontSize={7} fill={[ACCENT.pink, ACCENT.red, ACCENT.pink][i]} initial={{ y: 0, opacity: 0 }} animate={{ y: [-0, -16], opacity: [0, 1, 0] }} transition={{ duration: 1.6, delay: 0.6 + i * 0.35, repeat: Infinity, repeatDelay: 0.2 }}>
            ♥
          </motion.text>
        ))}
      {!done && (
        <motion.circle cx={56} r={1.4} fill="#9EE7FF" initial={{ cy: 2, opacity: 0 }} animate={{ cy: [2, top - 1], opacity: [0, 1, 0] }} transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 0.4 }} />
      )}
    </Stage>
  );
}

// ------------------------------------------------------------------ 6. Kahve

function Coffee({ p, done }: AnimProps) {
  const level = done ? 1 : p / 100;
  const h = 18 * level;
  return (
    <Stage>
      <defs>
        <clipPath id="nook-cup">
          <path d="M42 13h24l-2 18a3 3 0 0 1-3 2.6H47a3 3 0 0 1-3-2.6z" />
        </clipPath>
      </defs>
      {/* Fincan */}
      <path d="M42 13h24l-2 18a3 3 0 0 1-3 2.6H47a3 3 0 0 1-3-2.6z" fill="rgb(255 255 255 / 0.1)" />
      <g clipPath="url(#nook-cup)">
        <motion.g initial={false} animate={{ y: 33 - h }} transition={{ type: "spring", stiffness: 90, damping: 18 }}>
          <motion.path d="M30 1 q4 -2 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 V30 H30z" fill="#8B5A33" animate={{ x: [0, -16] }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }} />
          <motion.path d="M30 1 q4 -2 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 V3 H30z" fill="#D9A574" animate={{ x: [0, -16] }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }} />
        </motion.g>
      </g>
      <path d="M42 13h24l-2 18a3 3 0 0 1-3 2.6H47a3 3 0 0 1-3-2.6z" fill="none" stroke="rgb(255 255 255 / 0.7)" strokeWidth={1.4} />
      <path d="M65.5 17h2.5a3.6 3.6 0 0 1 0 7.2h-3.4" fill="none" stroke="rgb(255 255 255 / 0.7)" strokeWidth={1.4} />
      <ellipse cx={54} cy={35.5} rx={15} ry={1.8} fill="rgb(255 255 255 / 0.12)" />
      {/* Damla: dolarken üstten düşer */}
      {!done && <motion.circle cx={54} r={1.3} fill="#8B5A33" initial={{ cy: 0 }} animate={{ cy: [0, 33 - h], opacity: [1, 1, 0] }} transition={{ duration: 0.55, repeat: Infinity, ease: "easeIn" }} />}
      {/* Buhar */}
      {done &&
        [0, 1, 2].map((i) => (
          <motion.path
            key={i}
            d={`M${48 + i * 6} 11 q-2 -3 0 -5 t0 -5`}
            fill="none"
            stroke="rgb(255 255 255 / 0.65)"
            strokeWidth={1.3}
            strokeLinecap="round"
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: [0, 0.9, 0], y: [2, -6] }}
            transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}
          />
        ))}
      {done && (
        <motion.text x={80} y={14} fontSize={8} fill={ACCENT.pink} initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.3, 1], opacity: 1, y: [0, -2, 0] }} transition={{ duration: 0.6, delay: 0.5, y: { duration: 1.6, repeat: Infinity } }} style={box}>
          ♥
        </motion.text>
      )}
    </Stage>
  );
}

// ------------------------------------------------------------------ 7. Retro

function Retro({ p, done }: AnimProps) {
  const filled = done ? 10 : Math.floor(p / 10);
  const colors = [ACCENT.red, ACCENT.orange, ACCENT.yellow, ACCENT.green, ACCENT.teal, ACCENT.blue, ACCENT.purple, ACCENT.pink];
  return (
    <Stage>
      <motion.text
        x={52}
        y={12}
        fontSize={done ? 9 : 7}
        fontFamily="ui-monospace, Consolas, monospace"
        fontWeight={900}
        textAnchor="middle"
        letterSpacing={done ? 0.6 : 1.2}
        fill={done ? ACCENT.yellow : "rgb(255 255 255 / 0.7)"}
        animate={done ? { fill: colors, y: [0, -1.5, 0], opacity: 1 } : { fill: "rgba(255,255,255,0.7)", y: 0, opacity: [1, 0.35, 1] }}
        transition={done ? { fill: { duration: 1.2, repeat: Infinity }, y: { duration: 0.5, repeat: Infinity } } : { fill: { duration: 0.1 }, opacity: { duration: 1, repeat: Infinity, ease: "linear" } }}
      >
        {done ? "LEVEL UP!" : "LOADING"}
      </motion.text>
      <rect x={4} y={19} width={96} height={13} rx={1} fill="none" stroke="rgb(255 255 255 / 0.45)" strokeWidth={1.2} />
      {Array.from({ length: 10 }, (_, i) => {
        const on = i < filled;
        return (
          <motion.rect
            key={i}
            x={6.5 + i * 9.3}
            y={21.5}
            width={7.5}
            height={8}
            initial={false}
            animate={{ fill: !on && i === filled && !done ? ["rgba(255,255,255,0)", "rgba(255,255,255,0.35)"] : on ? (done ? colors[i % colors.length] : ACCENT.green) : "rgba(255,255,255,0)" }}
            transition={!on && i === filled && !done ? { duration: 0.4, repeat: Infinity, repeatType: "reverse", ease: "linear" } : { duration: 0.1 }}
          />
        );
      })}
      {/* Piksel yıldızlar */}
      {done &&
        [
          [8, 6],
          [98, 5],
          [106, 26],
          [2, 36],
        ].map(([x, y], i) => (
          <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.5, delay: i * 0.18, repeat: Infinity, repeatDelay: 0.3, ease: "linear" }}>
            <rect x={x - 1} y={y - 3} width={2} height={6} fill="white" />
            <rect x={x - 3} y={y - 1} width={6} height={2} fill="white" />
          </motion.g>
        ))}
    </Stage>
  );
}

// ------------------------------------------------------------------ 8. Yörünge

function Orbit({ p, done }: AnimProps) {
  // İz elipsin sağından saat yönünde başlar; ay da oradan
  const a = (p / 100) * Math.PI * 2;
  const cx = 56;
  const cy = 20;
  return (
    <Stage>
      {/* Yıldızlar */}
      {[
        [12, 8],
        [26, 32],
        [90, 7],
        [100, 30],
        [80, 36],
        [34, 5],
      ].map(([x, y], i) => (
        <motion.circle key={i} cx={x} cy={y} r={0.8} fill="white" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.4 + i * 0.3, repeat: Infinity }} />
      ))}
      {/* Yörünge ve iz */}
      <ellipse cx={cx} cy={cy} rx={26} ry={11} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth={1} />
      <motion.ellipse cx={cx} cy={cy} rx={26} ry={11} fill="none" stroke={ACCENT.purple} strokeWidth={1.6} strokeLinecap="round" initial={false} animate={{ pathLength: done ? 1 : p / 100 }} transition={{ type: "spring", stiffness: 90, damping: 20 }} />
      {/* Gezegen */}
      <motion.g style={{ transformOrigin: `${cx}px ${cy}px` }} animate={done ? { scale: [1, 1.25, 1.1] } : { scale: 1 }} transition={{ duration: 0.6 }}>
        <circle cx={cx} cy={cy} r={7} fill={done ? ACCENT.teal : ACCENT.purple} />
        <circle cx={cx - 2.4} cy={cy - 2.2} r={2} fill="rgb(255 255 255 / 0.35)" />
        <ellipse cx={cx} cy={cy} rx={11} ry={2.6} fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth={1.1} transform={`rotate(-18 ${cx} ${cy})`} />
      </motion.g>
      {/* Ay: ilerlemeyle yörüngede döner; bitince sürekli */}
      {done ? (
        <motion.g style={{ transformOrigin: `${cx}px ${cy}px` }} animate={{ rotate: 360 }} transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}>
          <circle cx={cx + 26} cy={cy} r={2.6} fill={ACCENT.yellow} />
        </motion.g>
      ) : (
        <circle cx={cx + 26 * Math.cos(a)} cy={cy + 11 * Math.sin(a)} r={2.6} fill={ACCENT.yellow} />
      )}
      {/* Bitince yayılan halkalar */}
      {done &&
        [0, 1].map((i) => (
          <motion.circle key={i} cx={cx} cy={cy} r={8} fill="none" stroke={ACCENT.teal} strokeWidth={1.2} initial={{ scale: 1, opacity: 0.9 }} animate={{ scale: 4.2, opacity: 0 }} transition={{ duration: 1.3, delay: i * 0.6, repeat: Infinity, ease: "easeOut" }} style={{ transformOrigin: `${cx}px ${cy}px` }} />
        ))}
    </Stage>
  );
}

// ------------------------------------------------------------------ 9. Balon

function Balloon({ p, done }: AnimProps) {
  const s = 0.35 + (p / 100) * 0.65;
  const [popped, setPopped] = useState(false);
  useEffect(() => {
    if (!done) return setPopped(false);
    const t = window.setTimeout(() => setPopped(true), 380);
    return () => window.clearTimeout(t);
  }, [done]);
  return (
    <Stage>
      {/* İp */}
      <motion.path d="M56 26 q-2 4 0 7 t0 6" fill="none" stroke="rgb(255 255 255 / 0.5)" strokeWidth={1} animate={popped ? { opacity: 0, y: 6 } : { opacity: 1, y: 0 }} />
      <motion.g style={{ transformOrigin: "56px 26px" }} initial={false} animate={popped ? { scale: 1.6, opacity: 0 } : done ? { scale: [1, 1.12, 1.05, 1.18], rotate: [0, -4, 4, 0], opacity: 1 } : { scale: s, rotate: [-5, 5, -5], opacity: 1 }} transition={popped ? { duration: 0.12 } : done ? { duration: 0.38 } : { scale: { type: "spring", stiffness: 90, damping: 14 }, rotate: { duration: 2.6, repeat: Infinity } }}>
        <ellipse cx={56} cy={15} rx={9} ry={11} fill={ACCENT.red} />
        <ellipse cx={52.6} cy={10.5} rx={2.2} ry={3.6} fill="rgb(255 255 255 / 0.45)" transform="rotate(-20 52.6 10.5)" />
        <path d="M54 25.6h4l-2 2.2z" fill={ACCENT.red} />
      </motion.g>
      {popped && (
        <>
          <motion.text x={56} y={20} fontSize={10} fontWeight={900} textAnchor="middle" fill="white" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: [0.4, 1.3, 1], opacity: [0, 1, 0] }} transition={{ duration: 0.8 }} style={box}>
            POP!
          </motion.text>
          <Confetti x={56} y={16} n={14} spread={40} />
        </>
      )}
    </Stage>
  );
}

// ------------------------------------------------------------------ 10. Dalga (bütün kapsül dolar)

function Wave({ p, done }: AnimProps) {
  const level = done ? 1 : p / 100;
  const color = done ? ACCENT.teal : ACCENT.blue;
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div className="absolute inset-x-0 bottom-0" initial={false} animate={{ height: `${Math.max(6, level * 100)}%` }} transition={{ type: "spring", stiffness: 70, damping: 18 }}>
        <svg className="absolute -top-[5px] left-0" width="200%" height={6} viewBox="0 0 120 6" preserveAspectRatio="none">
          <motion.path d="M0 3 q7.5 -3 15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 V6 H0z" fill={tintBg(color, 34)} animate={{ x: [0, -30] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
        </svg>
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${tintBg(color, 34)}, ${tintBg(color, 18)})` }} />
      </motion.div>
      {/* Kabarcıklar */}
      {Array.from({ length: done ? 9 : 4 }, (_, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border"
          style={{ left: `${12 + ((i * 41) % 80)}%`, bottom: 2, width: 3 + (i % 3) * 2, height: 3 + (i % 3) * 2, borderColor: "rgb(255 255 255 / 0.55)" }}
          animate={{ y: [0, -(done ? 40 : 10 + level * 24)], opacity: [0, 1, 0] }}
          transition={{ duration: 1.4 + (i % 4) * 0.3, delay: i * 0.22, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-round text-[15px] font-extrabold tabular-nums" style={{ color: tintText(color) }}>
        {done ? "✓" : pct(Math.round(p))}
      </span>
    </div>
  );
}

export const UPDATE_ANIMS: AnimDef[] = [
  { id: "ring", label: tt("Halka"), color: ACCENT.blue, doneTitle: tt("Yeniden başlıyorum"), Comp: Ring },
  { id: "rocket", label: tt("Roket"), color: ACCENT.orange, doneTitle: tt("Fırlatılıyor!"), Comp: Rocket },
  { id: "cargo", label: tt("Kargo"), color: ACCENT.teal, doneTitle: tt("Paket geldi"), Comp: Cargo },
  { id: "battery", label: tt("Pil"), color: ACCENT.green, doneTitle: tt("Şarj tamam"), Comp: Battery },
  { id: "sprout", label: tt("Filiz"), color: ACCENT.pink, doneTitle: tt("Çiçek açtı"), Comp: Sprout },
  { id: "coffee", label: tt("Kahve"), color: ACCENT.yellow, doneTitle: tt("Taze demlendi"), Comp: Coffee },
  { id: "retro", label: tt("Retro"), color: ACCENT.purple, doneTitle: tt("Yeni seviye!"), Comp: Retro },
  { id: "orbit", label: tt("Yörünge"), color: ACCENT.purple, doneTitle: tt("Tur tamam"), Comp: Orbit },
  { id: "balloon", label: tt("Balon"), color: ACCENT.red, doneTitle: tt("Pat!"), Comp: Balloon },
  { id: "wave", label: tt("Dalga"), color: ACCENT.blue, doneTitle: tt("Doldu taştı"), Comp: Wave },
];

const CYCLE_KEY = "nook-update-anim";

/** Bu güncellemede hangisi: seçili olan, sıradaki ya da rastgele */
export function resolveUpdateAnim(pref: UpdateAnimPref): UpdateAnimId {
  const ids = UPDATE_ANIMS.map((a) => a.id);
  if ((ids as string[]).includes(pref)) return pref as UpdateAnimId;
  if (pref === "random") return ids[Math.floor(Math.random() * ids.length)];
  let i = 0;
  try {
    i = (Number(localStorage.getItem(CYCLE_KEY) ?? -1) + 1) % ids.length;
    localStorage.setItem(CYCLE_KEY, String(i));
  } catch {
    // depolama yoksa ilki
  }
  return ids[i];
}

/** Kapsülün içi: solda yazı, sağda animasyon */
export function UpdateBody({ anim, p, done, version }: { anim: UpdateAnimId; p: number; done: boolean; version: string | null }) {
  const def = UPDATE_ANIMS.find((a) => a.id === anim) ?? UPDATE_ANIMS[0];
  const color = done ? ACCENT.green : def.color;
  const v = version ? `v${version}` : "";
  return (
    <>
      <def.Comp p={p} done={done} />
      <div className="absolute left-[50px] top-1/2 w-[118px] -translate-y-1/2 leading-tight">
        <motion.p key={done ? "d" : "u"} className="truncate text-[11.5px] font-bold text-label" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          {done ? def.doneTitle : tt("Güncelleniyor")}
        </motion.p>
        <p className="truncate text-[9.5px] font-semibold tabular-nums" style={{ color: tintText(color) }}>
          {done ? tt("{0} ile geliyorum", v || tt("yeni sürüm")) : v ? `${v} · ${pct(Math.round(p))}` : pct(Math.round(p))}
        </p>
      </div>
    </>
  );
}

/**
 * Önizleme için sahte güncelleme: 3,4 sn'de dolar, 2,6 sn "bitti" anı, baştan.
 * `run` değişince baştan başlar.
 */
export function useFakeUpdate(run = 0) {
  const [state, setState] = useState({ p: 0, done: false });
  useEffect(() => {
    const start = performance.now();
    const t = window.setInterval(() => {
      const e = (performance.now() - start) % 6000;
      if (e < 3400) {
        const x = e / 3400;
        setState({ p: Math.min(99, Math.round((x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2) * 100)), done: false });
      } else setState({ p: 100, done: true });
    }, 90);
    return () => window.clearInterval(t);
  }, [run]);
  return state;
}
