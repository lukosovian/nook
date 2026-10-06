/**
 * Pencere üstüne tüneme: öndeki pencerenin başlık çubuğunun üstünde oturan Nook (kendi küçük,
 * tıklama-geçirgen penceresinde; konumunu Rust taşır — bkz. src-tauri/src/buddy.rs). Pencere
 * taşındıkça ters yöne yatıp sendeler, hızlı sallanınca kollarını açıp dengesini bulmaya çalışır.
 */
import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { EVENTS, subscribe } from "../../lib/bridge";
import type { Expression } from "../../store/nook";
import { NookFigure } from "../mascot/Figure";
import { Paw, useMyLook } from "./Parts";

const SIZE = 46;
const K = SIZE / 24;
/** Pencerenin alt kenarından bu kadar yukarısı tünenen pencerenin üst kenarı (Rust'taki SINK) */
const EDGE = 12;
const IDLE_FACES: Expression[] = ["idle", "idle", "wink", "idle", "happy", "idle", "lookAround", "idle"];

export function Perch() {
  const { look, color } = useMyLook();
  const [face, setFace] = useState<Expression>("surprised");
  const [flail, setFlail] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Hareket: pencere sağa giderse Nook geride kalıp sola yatar; durunca yay gibi sallanarak dengelenir
  const lean = useSpring(0, { stiffness: 150, damping: 6, mass: 1 });
  const slide = useSpring(0, { stiffness: 200, damping: 9 });
  const lift = useSpring(0, { stiffness: 260, damping: 12 });
  const squash = useSpring(1, { stiffness: 300, damping: 10 });
  const hop = useMotionValue(0);
  const y = useTransform([lift, hop], ([l, h]: number[]) => l + h);
  const squashX = useTransform(squash, (s) => 2 - s);

  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    // Tepeden süzülüp kenara konar
    hop.set(-90);
    void animate(hop, 0, { type: "spring", stiffness: 260, damping: 15 }).then(() => {
      squash.jump(0.78);
      squash.set(1);
      setFace("happy");
    });

    let calm = 0;
    let peak = 0;
    const offMove = subscribe<{ vx: number; vy: number }>(EVENTS.perchMove, ({ vx, vy }) => {
      const speed = Math.hypot(vx, vy);
      peak = Math.max(peak, speed);
      lean.set(Math.max(-38, Math.min(38, -vx * 0.03)));
      slide.set(Math.max(-10, Math.min(10, -vx * 0.008)));
      // Pencere aşağı inerse havalanır, yukarı çıkarsa basılır
      lift.set(Math.max(-14, Math.min(0, -vy * 0.012)));
      squash.set(vy < -150 ? Math.max(0.8, 1 + vy * 0.0002) : 1);
      const fast = speed > 550;
      setFlail(fast);
      if (fast) setFace("surprised");
      window.clearTimeout(calm);
      if (speed < 5) {
        // Durdu: büyük sarsıntıdan sonra bir an başı döner, sonra güler
        const shaken = peak > 1400;
        peak = 0;
        setFlail(false);
        setFace(shaken ? "slap" : "idle");
        calm = window.setTimeout(() => setFace(shaken ? "giggle" : "idle"), shaken ? 900 : 0);
      }
    });
    const offHop = subscribe(EVENTS.perchHop, () => {
      setFace("happy");
      void animate(hop, [0, -18, 0], { duration: 0.52, ease: "easeInOut" });
      squash.jump(1.12);
      squash.set(1);
    });
    const offLeave = subscribe(EVENTS.perchLeave, () => {
      setLeaving(true);
      setFace("happy");
      void animate(hop, -70, { duration: 0.4, ease: "easeIn" });
    });

    // Sakin otururken arada bir göz kırpar, etrafa bakar
    let i = 0;
    const idle = window.setInterval(() => setFace((f) => (f === "idle" || f === "happy" || IDLE_FACES.includes(f) ? IDLE_FACES[i++ % IDLE_FACES.length] : f)), 3200);

    return () => {
      offMove();
      offHop();
      offLeave();
      window.clearInterval(idle);
      window.clearTimeout(calm);
    };
  }, [hop, lean, lift, slide, squash]);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ background: "transparent" }}>
      <motion.div
        className="absolute left-1/2"
        style={{ bottom: EDGE - 2, x: slide, y, rotate: lean, originX: 0.5, originY: 1, marginLeft: -SIZE / 2, width: SIZE, height: SIZE }}
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: leaving ? 0.35 : 0.2 }}
      >
        {/* Kenardan sarkan, gövdeden kopuk ayaklar (eller gibi) — başlık çubuğunun önünde sallanır */}
        {[-1, 1].map((s) => (
          <motion.span
            key={s}
            className="absolute rounded-full"
            style={{
              left: SIZE / 2 + s * 6.5 * K - 3.6 * K,
              top: SIZE + 1,
              width: 7.2 * K,
              height: 5 * K,
              background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${color}, white 55%) 0%, ${color} 55%, color-mix(in srgb, ${color}, black 30%) 100%)`,
              boxShadow: "0 1px 2px rgba(0,0,0,0.45)",
            }}
            animate={flail ? { x: s * 5, y: 3, rotate: s * 30 } : { x: [0, s * 1.5, 0], y: [0, 3.5, 0], rotate: [0, s * -15, 0] }}
            transition={flail ? { type: "spring", stiffness: 300, damping: 10 } : { duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: s > 0 ? 0.65 : 0 }}
          />
        ))}
        <motion.div style={{ scaleY: squash, scaleX: squashX, originY: 1 }} className="absolute inset-0">
          <NookFigure look={look} color={color} size={SIZE} expression={face} />
        </motion.div>
        {/* Eller: kenarı tutar; sarsılınca dengede kalmak için açılır */}
        <Paw
          x={SIZE / 2 - 16.5 * K}
          y={SIZE / 2 + 9 * K}
          k={K}
          color={color}
          animate={flail ? { x: -4 * K, y: -16 * K, rotate: 40 } : { x: 3 * K, y: 2 * K, rotate: 0 }}
        />
        <Paw
          x={SIZE / 2 + 16.5 * K}
          y={SIZE / 2 + 9 * K}
          k={K}
          color={color}
          animate={flail ? { x: 4 * K, y: -16 * K, rotate: -40 } : { x: -3 * K, y: 2 * K, rotate: 0 }}
        />
      </motion.div>
    </div>
  );
}
