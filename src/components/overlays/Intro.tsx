import { useMemo } from "react";
import { motion } from "motion/react";
import type { Antic } from "../../store/nook";
import { ACCENT } from "../ui/primitives";

/** Açılış süresi (ms): bir efekt ortaya toplanır, Nook tam o anda doğar. */
export const INTRO_MS = 1700;
const SEC = INTRO_MS / 1000;

/**
 * Açılış efektleri — her açılışta biri seçilir (bir önceki tekrarlanmaz).
 *  - dust: Grok Bot'taki uzay tozu, halkalardan dönerek çöker
 *  - warp: ışık hızı — çizgiler dört yandan merkeze akar
 *  - ripple: halkalar daralarak merkeze iner
 *  - orbit: üç renkli ışık sarmal çizip birleşir
 *  - confetti: renkli kâğıtlar dönerek toplanır
 *  - sparkle: yıldızlar parıldar, sonra ortaya uçar
 *  - bubbles: kabarcıklar alttan yükselip ortada patlar
 */
export type IntroKind = "dust" | "warp" | "ripple" | "orbit" | "confetti" | "sparkle" | "bubbles";
const KINDS: IntroKind[] = ["dust", "warp", "ripple", "orbit", "confetti", "sparkle", "bubbles"];

/** Nook doğunca yaptığı hareket — efekte uygun */
export const INTRO_ANTIC: Record<IntroKind, Antic> = {
  dust: "hop",
  warp: "dizzy",
  ripple: "nod",
  orbit: "spin",
  confetti: "love",
  sparkle: "wink",
  bubbles: "giggle",
};

const LAST_KEY = "nook-intro-last";

function pickIntro(): IntroKind {
  const forced = new URLSearchParams(location.search).get("intro") as IntroKind | null;
  if (forced && KINDS.includes(forced)) return forced;
  let last: string | null = null;
  try {
    last = localStorage.getItem(LAST_KEY);
  } catch {
    /* önemsiz */
  }
  const pool = KINDS.filter((k) => k !== last);
  const kind = pool[Math.floor(Math.random() * pool.length)];
  try {
    localStorage.setItem(LAST_KEY, kind);
  } catch {
    /* önemsiz */
  }
  return kind;
}

/** Bu oturumun açılış efekti (Island, Nook'un ilk hareketini buna göre seçer) */
export const introKind: IntroKind = pickIntro();

const COLORS = [ACCENT.teal, ACCENT.pink, ACCENT.yellow, ACCENT.blue, ACCENT.purple, ACCENT.orange, ACCENT.green];
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function Intro() {
  const Effect = EFFECTS[introKind];
  return (
    <motion.div className="pointer-events-none absolute inset-0 z-20" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
      <Effect />
    </motion.div>
  );
}

/** Ortalanmış parça */
const Dot = ({ size, style, ...rest }: React.ComponentProps<typeof motion.span> & { size: number }) => (
  <motion.span
    className="absolute left-1/2 top-1/2 block"
    style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, ...(style as object) }}
    {...rest}
  />
);

function Dust() {
  const dots = useMemo(
    () =>
      [52, 78, 104].flatMap((r, ring) =>
        Array.from({ length: 16 + ring * 6 }, (_, i) => {
          const a = (i / (16 + ring * 6)) * Math.PI * 2 + Math.random() * 0.4;
          const jitter = 0.85 + Math.random() * 0.3;
          return { id: `${ring}-${i}`, x: Math.cos(a) * r * jitter, y: Math.sin(a) * r * 0.32 * jitter, size: rnd(1.4, 3.2), delay: ring * 0.07 + Math.random() * 0.12 };
        }),
      ),
    [],
  );
  return (
    <motion.div className="absolute inset-0" initial={{ rotate: 0 }} animate={{ rotate: 25 }} transition={{ duration: SEC, ease: "easeIn" }}>
      {dots.map((d) => (
        <Dot
          key={d.id}
          size={d.size}
          className="absolute left-1/2 top-1/2 block rounded-full bg-white"
          initial={{ x: d.x * 1.7, y: d.y * 1.7, opacity: 0 }}
          animate={{ x: [d.x * 1.7, d.x, d.x * 0.15], y: [d.y * 1.7, d.y, d.y * 0.15], opacity: [0, 1, 0], scale: [0.6, 1.2, 0.3] }}
          transition={{ duration: SEC * 0.75, delay: d.delay, times: [0, 0.45, 1], ease: "easeInOut" }}
        />
      ))}
    </motion.div>
  );
}

function Warp() {
  const lines = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => {
        const a = (i / 34) * Math.PI * 2 + rnd(-0.08, 0.08);
        const r = rnd(110, 150);
        return { id: i, a, x: Math.cos(a) * r, y: Math.sin(a) * r * 0.45, len: rnd(10, 26), delay: rnd(0, 0.35), color: i % 5 === 0 ? ACCENT.teal : "#fff" };
      }),
    [],
  );
  return (
    <>
      {lines.map((l) => (
        <motion.span
          key={l.id}
          className="absolute left-1/2 top-1/2 block rounded-full"
          style={{ width: l.len, height: 1.6, marginLeft: -l.len / 2, marginTop: -0.8, background: `linear-gradient(90deg, transparent, ${l.color})`, rotate: (Math.atan2(-l.y, -l.x) * 180) / Math.PI }}
          initial={{ x: l.x, y: l.y, opacity: 0, scaleX: 0.4 }}
          animate={{ x: [l.x, l.x * 0.1], y: [l.y, l.y * 0.1], opacity: [0, 1, 0], scaleX: [0.4, 1.8, 0.2] }}
          transition={{ duration: SEC * 0.5, delay: l.delay, ease: "easeIn" }}
        />
      ))}
      <Flash delay={SEC * 0.5} color="#fff" />
    </>
  );
}

function Ripple() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <Dot
          key={i}
          size={60}
          className="absolute left-1/2 top-1/2 block rounded-full"
          style={{ border: `1.5px solid ${[ACCENT.teal, ACCENT.blue, ACCENT.purple, "#fff"][i]}` }}
          initial={{ scale: 3.4, opacity: 0, scaleY: 1.2 }}
          animate={{ scale: [3.4, 0.1], opacity: [0, 0.9, 0] }}
          transition={{ duration: SEC * 0.55, delay: i * 0.13, ease: "easeIn" }}
        />
      ))}
      <Flash delay={SEC * 0.52} color={ACCENT.teal} />
    </>
  );
}

function Orbit() {
  const steps = 26;
  const balls = useMemo(
    () =>
      [ACCENT.teal, ACCENT.pink, ACCENT.yellow].map((color, b) => {
        const phase = (b / 3) * Math.PI * 2;
        const pts = Array.from({ length: steps }, (_, i) => {
          const t = i / (steps - 1);
          const a = phase + t * Math.PI * 4;
          const r = 90 * (1 - t);
          return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.36 };
        });
        return { color, xs: pts.map((p) => p.x), ys: pts.map((p) => p.y) };
      }),
    [],
  );
  return (
    <>
      {balls.flatMap((b, bi) =>
        [0, 1, 2, 3].map((trail) => (
          <Dot
            key={`${bi}-${trail}`}
            size={7 - trail * 1.4}
            className="absolute left-1/2 top-1/2 block rounded-full"
            style={{ background: b.color, boxShadow: trail ? undefined : `0 0 10px ${b.color}` }}
            initial={{ x: b.xs[0], y: b.ys[0], opacity: 0 }}
            animate={{ x: b.xs, y: b.ys, opacity: [0, 1 - trail * 0.22, 1 - trail * 0.22, 0] }}
            transition={{ duration: SEC * 0.62, delay: trail * 0.035, ease: "easeIn", opacity: { times: [0, 0.1, 0.85, 1], duration: SEC * 0.62, delay: trail * 0.035 } }}
          />
        )),
      )}
      <Flash delay={SEC * 0.6} color={ACCENT.pink} />
    </>
  );
}

function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        id: i,
        x: rnd(-105, 105),
        y: rnd(-70, -40),
        mx: rnd(-40, 40),
        my: rnd(-12, 22),
        w: rnd(3, 6),
        h: rnd(5, 9),
        rot: rnd(-360, 360),
        delay: rnd(0, 0.3),
        color: COLORS[i % COLORS.length],
      })),
    [],
  );
  return (
    <>
      {bits.map((b) => (
        <motion.span
          key={b.id}
          className="absolute left-1/2 top-1/2 block rounded-[1.5px]"
          style={{ width: b.w, height: b.h, marginLeft: -b.w / 2, marginTop: -b.h / 2, background: b.color }}
          initial={{ x: b.x, y: b.y, opacity: 0, rotate: 0 }}
          animate={{ x: [b.x, b.mx, 0], y: [b.y, b.my, 0], opacity: [0, 1, 1, 0], rotate: [0, b.rot, b.rot * 1.6], scale: [1, 1, 0.2] }}
          transition={{ duration: SEC * 0.68, delay: b.delay, times: [0, 0.55, 1], ease: "easeInOut", opacity: { times: [0, 0.15, 0.8, 1], duration: SEC * 0.68, delay: b.delay } }}
        />
      ))}
    </>
  );
}

/** Dört köşeli yıldız */
const Star = ({ color }: { color: string }) => (
  <svg viewBox="0 0 10 10" className="h-full w-full" style={{ filter: `drop-shadow(0 0 3px ${color})` }}>
    <path d="M5 0 C5.6 3.6 6.4 4.4 10 5 C6.4 5.6 5.6 6.4 5 10 C4.4 6.4 3.6 5.6 0 5 C3.6 4.4 4.4 3.6 5 0Z" fill={color} />
  </svg>
);

function Sparkle() {
  const stars = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        x: rnd(-96, 96),
        y: rnd(-28, 28),
        size: rnd(6, 13),
        delay: rnd(0, 0.35),
        color: i % 3 === 0 ? ACCENT.yellow : i % 3 === 1 ? "#fff" : ACCENT.teal,
      })),
    [],
  );
  return (
    <>
      {stars.map((s) => (
        <Dot
          key={s.id}
          size={s.size}
          initial={{ x: s.x, y: s.y, scale: 0, opacity: 0, rotate: 0 }}
          animate={{ x: [s.x, s.x, s.x * 0.05], y: [s.y, s.y, s.y * 0.05], scale: [0, 1.2, 0.8, 0.2], opacity: [0, 1, 1, 0], rotate: [0, 90, 180] }}
          transition={{ duration: SEC * 0.7, delay: s.delay, ease: "easeInOut", scale: { times: [0, 0.3, 0.6, 1], duration: SEC * 0.7, delay: s.delay }, opacity: { times: [0, 0.25, 0.8, 1], duration: SEC * 0.7, delay: s.delay } }}
        >
          <Star color={s.color} />
        </Dot>
      ))}
    </>
  );
}

function Bubbles() {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: rnd(-90, 90),
        size: rnd(5, 13),
        wobble: rnd(8, 18) * (i % 2 ? 1 : -1),
        delay: rnd(0, 0.4),
        color: [ACCENT.blue, ACCENT.teal, "#fff"][i % 3],
      })),
    [],
  );
  return (
    <>
      {bubbles.map((b) => (
        <Dot
          key={b.id}
          size={b.size}
          className="absolute left-1/2 top-1/2 block rounded-full"
          style={{ border: `1.2px solid ${b.color}`, background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), transparent 55%)` }}
          initial={{ x: b.x, y: 50, opacity: 0 }}
          animate={{ x: [b.x, b.x * 0.6 + b.wobble, b.x * 0.25 - b.wobble * 0.5, 0], y: [50, 25, 8, 0], opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 1.8] }}
          transition={{ duration: SEC * 0.68, delay: b.delay, ease: "easeOut", opacity: { times: [0, 0.15, 0.85, 1], duration: SEC * 0.68, delay: b.delay } }}
        />
      ))}
    </>
  );
}

/** Nook doğarken ortada kısa bir parlama */
function Flash({ delay, color }: { delay: number; color: string }) {
  return (
    <Dot
      size={40}
      className="absolute left-1/2 top-1/2 block rounded-full"
      style={{ background: `radial-gradient(circle, ${color} 0%, transparent 65%)`, filter: "blur(3px)" }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1.6, 2.2], opacity: [0, 0.8, 0] }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
    />
  );
}

const EFFECTS: Record<IntroKind, () => React.JSX.Element> = {
  dust: Dust,
  warp: Warp,
  ripple: Ripple,
  orbit: Orbit,
  confetti: Confetti,
  sparkle: Sparkle,
  bubbles: Bubbles,
};
