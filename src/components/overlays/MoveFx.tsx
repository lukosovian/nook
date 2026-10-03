import { useMemo } from "react";
import { motion } from "motion/react";
import type { Move } from "../../lib/moveFx";

const GOLD = "#ffd75e";
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Ekran geçişinde adanın çevresindeki efekt katmanı (adanın dışına taşabilsin diye ayrı):
 * ışınlanmada altın ışıltılar, portalda dönen halka, ışık hızında iz çizgisi.
 */
export function MoveFx({ move }: { move: Move }) {
  const { kind, dir, phase } = move;
  const out = phase === "out";
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 z-30" style={{ width: 0, height: 40 }}>
      {kind === "beam" && <Sparks out={out} />}
      {kind === "portal" && <Ring out={out} />}
      {kind === "warp" && <Streak out={out} dir={dir} />}
    </div>
  );
}

function Sparks({ out }: { out: boolean }) {
  const sparks = useMemo(
    () => Array.from({ length: 34 }, (_, i) => ({ id: i, x: rnd(-58, 58), y: rnd(2, 38), size: rnd(1.2, 2.6), delay: rnd(0, out ? 0.25 : 0.35), dur: rnd(0.4, 0.6) })),
    [out],
  );
  return (
    <>
      <motion.span
        className="absolute block rounded-[14px]"
        style={{ left: -70, top: 0, width: 140, height: 40, background: `linear-gradient(180deg, ${GOLD}22, ${GOLD}66, ${GOLD}22)`, filter: "blur(5px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.9, 0] }}
        transition={{ duration: out ? 0.5 : 0.8 }}
      />
      {sparks.map((p) => (
        <motion.span
          key={p.id}
          className="absolute block rounded-full"
          style={{ left: p.x, top: p.y, width: p.size, height: p.size, background: p.id % 4 ? GOLD : "#fff", boxShadow: `0 0 4px ${GOLD}` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.2, 1, 0], y: [0, -3, 2, -2, 0] }}
          transition={{ duration: p.dur, delay: p.delay, ease: "linear" }}
        />
      ))}
    </>
  );
}

function Ring({ out }: { out: boolean }) {
  return (
    <>
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute block rounded-full"
          style={{
            left: -30,
            top: -10,
            width: 60,
            height: 60,
            border: `2px solid ${i ? "#b48cff" : "#4de2c8"}`,
            borderLeftColor: "transparent",
            boxShadow: `0 0 12px ${i ? "#b48cff" : "#4de2c8"}`,
          }}
          initial={{ scale: out ? 1.6 : 0, rotate: 0, opacity: 0 }}
          animate={out ? { scale: [1.6, 0.1], rotate: [0, -540], opacity: [0, 1, 0] } : { scale: [0.1, 1.9], rotate: [0, 540], opacity: [0, 1, 0] }}
          transition={{ duration: out ? 0.45 : 0.6, delay: i * 0.06, ease: out ? "easeIn" : "easeOut" }}
        />
      ))}
    </>
  );
}

function Streak({ out, dir }: { out: boolean; dir: 1 | -1 }) {
  // Çıkışta gidilen yöne uzayan, girişte karşı yönden gelip sönen ışık izi
  const side = out ? dir : -dir;
  return (
    <motion.span
      className="absolute block h-[3px] rounded-full"
      style={{
        top: 16,
        width: 260,
        left: side > 0 ? 0 : -260,
        originX: side > 0 ? 0 : 1,
        background: `linear-gradient(${side > 0 ? 90 : 270}deg, #fff, #9fd0ff 40%, transparent)`,
        boxShadow: "0 0 8px #9fd0ff",
      }}
      initial={{ scaleX: 0, opacity: 0 }}
      animate={out ? { scaleX: [0, 0, 1], opacity: [0, 1, 0] } : { scaleX: [1, 0], opacity: [1, 0] }}
      transition={{ duration: out ? 0.42 : 0.35, times: out ? [0, 0.45, 1] : undefined, ease: "easeOut" }}
    />
  );
}
