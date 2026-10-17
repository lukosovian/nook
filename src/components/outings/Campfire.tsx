/**
 * Gece kampı: bilgisayar gece boştayken Nook adada kamp ateşi yakar, çubuğun ucunda marshmallow
 * kızartır. Marshmallow beyazdan altın sarısına, sonra kahveye döner; Nook üfler, yer, yenisini takar.
 * Sen dönünce kaç tane kızarttığını anlatır. Adanın içinde çizilir (kapsül: Capsules › camp).
 */
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { camp } from "../../lib/outings";
import { tt } from "../../lib/i18n";
import type { Expression } from "../../store/nook";
import { NookFigure } from "../mascot/Figure";
import { Paw, useMyLook } from "./Parts";

const SIZE = 26;
const K = SIZE / 24;
/** Bir marshmallow'un pişme süresi (ms) */
const COOK_MS = 9000;
const MALLOW = ["#fbf7ee", "#f5dfa8", "#e7b45e", "#b9742f", "#5b3a22"];

export function Campfire({ width, height }: { width: number; height: number }) {
  const { look, color } = useMyLook();
  const [stage, setStage] = useState(0);
  const [face, setFace] = useState<Expression>("happy");
  const [eating, setEating] = useState(false);

  // Pişir → ye → yenisini tak
  useEffect(() => {
    let alive = true;
    const timers: number[] = [];
    const later = (ms: number, f: () => void) => timers.push(window.setTimeout(() => alive && f(), ms));
    const cycle = () => {
      setStage(0);
      setEating(false);
      setFace("happy");
      // Bazen fazla kalır, yanar
      const burn = Math.random() < 0.25;
      const steps = burn ? 4 : 3;
      for (let i = 1; i <= steps; i++) later((COOK_MS / steps) * i, () => setStage(i));
      later(COOK_MS + 300, () => setFace(burn ? "surprised" : "love"));
      later(COOK_MS + 1300, () => {
        setEating(true);
        setFace(burn ? "annoyed" : "happy");
        camp.mallows++;
      });
      later(COOK_MS + 2600, cycle);
    };
    cycle();
    return () => {
      alive = false;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const cy = height / 2 + 2;
  const fireX = width - 40;
  const nx = fireX - 66;
  // Çubuk: sağ elden ateşin üstüne
  const hand = { x: nx + 12 * K, y: cy + 3 };
  const tip = { x: fireX - 8, y: cy - 6 };

  return (
    <motion.div className="pointer-events-none absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.15, duration: 0.3 } }} exit={{ opacity: 0 }}>
      {/* Ateşin sıcak ışığı adanın içine yayılır */}
      <motion.span
        className="absolute rounded-full"
        style={{ left: fireX - 60, top: -30, width: 120, height: 100, background: "radial-gradient(circle, rgb(255 140 50 / 0.32), transparent 65%)" }}
        animate={{ opacity: [0.75, 1, 0.8, 0.95, 0.75] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />

      {/* Solda: ne yaptığı ve kaç tane kızarttığı */}
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 leading-tight">
        <p className="text-[10.5px] font-bold text-label">{tt("Kamp ateşi")}</p>
        <p className="text-[9px] font-semibold" style={{ color: "#ffb347" }}>
          {tt("{0} marshmallow", camp.mallows)}
        </p>
      </div>

      {/* Çubuk ve marshmallow */}
      <svg className="absolute inset-0 overflow-visible" width={width} height={height}>
        <line x1={hand.x} y1={hand.y} x2={tip.x} y2={tip.y} stroke="#8a5a2b" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {!eating && (
        <motion.span
          className="absolute rounded-[3px]"
          style={{ left: tip.x - 4, top: tip.y - 4, width: 8, height: 7 }}
          animate={{ background: MALLOW[stage], boxShadow: stage >= 2 ? "0 0 6px rgb(255 170 60 / 0.8)" : "none" }}
          transition={{ duration: 1.2 }}
        />
      )}

      {/* Nook (sağ eli çubuğu tutar) */}
      <motion.div
        className="absolute"
        style={{ left: nx - SIZE / 2, top: cy - SIZE / 2 }}
        animate={eating ? { y: [0, -2, 0, -1, 0], rotate: [0, -6, 0] } : { y: [0, 0.8, 0], rotate: 0 }}
        transition={eating ? { duration: 0.8 } : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <NookFigure look={look} color={color} size={SIZE} expression={face} />
        <Paw x={SIZE / 2 + 12 * K * 0.7} y={SIZE / 2 + 3} k={K} color={color} rotate={-20} />
      </motion.div>

      {/* Odunlar ve alev */}
      <Fire x={fireX} y={height - 4} />
    </motion.div>
  );
}

function Fire({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: x - 16, top: y - 30, width: 32, height: 30 }}>
      {/* Odunlar */}
      <span className="absolute bottom-0 left-1 h-[4px] w-[26px] rotate-[14deg] rounded-full" style={{ background: "#6b4423" }} />
      <span className="absolute bottom-0 left-1 h-[4px] w-[26px] -rotate-[14deg] rounded-full" style={{ background: "#7a4f28" }} />
      {/* Alev katmanları */}
      {[
        { c: "#ff4d1c", w: 18, h: 22, d: 0 },
        { c: "#ff9a1f", w: 13, h: 17, d: 0.15 },
        { c: "#ffe066", w: 7, h: 10, d: 0.3 },
      ].map((f, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2"
          style={{ bottom: 3, width: f.w, height: f.h, marginLeft: -f.w / 2, background: f.c, borderRadius: "50% 50% 45% 45% / 65% 65% 35% 35%", transformOrigin: "50% 100%", filter: i === 0 ? "blur(0.6px)" : undefined }}
          animate={{ scaleY: [1, 1.18, 0.92, 1.1, 1], scaleX: [1, 0.92, 1.06, 0.95, 1], skewX: [0, 4, -3, 2, 0] }}
          transition={{ duration: 0.9 + i * 0.15, repeat: Infinity, delay: f.d, ease: "easeInOut" }}
        />
      ))}
      {/* Kıvılcımlar */}
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={`s${i}`}
          className="absolute h-[2px] w-[2px] rounded-full"
          style={{ left: 12 + i * 3, bottom: 14, background: "#ffd27a", boxShadow: "0 0 4px #ffb347" }}
          animate={{ y: [0, -14 - i * 3], x: [0, i % 2 ? 4 : -4], opacity: [1, 0] }}
          transition={{ duration: 1.1 + i * 0.2, repeat: Infinity, delay: i * 0.35, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
