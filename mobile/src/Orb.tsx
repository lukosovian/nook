import { useEffect, useState } from "react";
import { motion } from "motion/react";

/**
 * Telefondaki Nook: masaüstündeki yuvarlak maskotun sade hâli — ışık alan küre, iki göz, ara sıra göz kırpar.
 * mood: "sleep" PC'ye ulaşılamıyorken (gözler kapalı), "happy" bir iş bitince.
 */
export function Orb({ size = 96, color = "#3d8bff", mood = "idle" }: { size?: number; color?: string; mood?: "idle" | "happy" | "sleep" }) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (mood !== "idle") return;
    let t: number;
    const next = () => {
      t = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 130);
        next();
      }, 2200 + Math.random() * 3200);
    };
    next();
    return () => window.clearTimeout(t);
  }, [mood]);
  const ew = size * 0.13;
  const open = mood === "idle" && !blink;
  const eh = open ? size * 0.3 : size * 0.08;
  return (
    <motion.div
      className="relative flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 34% 28%, color-mix(in srgb, ${color} 50%, white) 0%, ${color} 42%, color-mix(in srgb, ${color} 62%, black) 100%)`,
        boxShadow: `0 0 ${size * 0.45}px -${size * 0.12}px ${color}, inset 0 -${size * 0.06}px ${size * 0.12}px rgb(0 0 0 / 0.25)`,
      }}
      animate={mood === "sleep" ? { scale: [1, 1.03, 1] } : { y: [0, -size * 0.04, 0] }}
      transition={{ duration: mood === "sleep" ? 3.2 : 2.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="flex items-center" style={{ gap: size * 0.15, marginTop: size * 0.04 }}>
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            className="block bg-black/85"
            animate={{ height: eh }}
            transition={{ duration: 0.09 }}
            style={{ width: ew, borderRadius: mood === "happy" ? `${ew}px ${ew}px 2px 2px` : ew }}
          />
        ))}
      </div>
    </motion.div>
  );
}
