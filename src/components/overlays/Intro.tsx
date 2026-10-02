import { useMemo } from "react";
import { motion } from "motion/react";

/** Açılış süresi (ms): parçacıklar toplanır, ortada Nook doğar. */
export const INTRO_MS = 1700;

/**
 * Grok Bot'taki gibi uzay tozu: eliptik halkalarda dağınık parçacıklar
 * dönerek merkeze çöker; Nook tam o anda belirir.
 */
export function Intro() {
  const dots = useMemo(
    () =>
      [52, 78, 104].flatMap((r, ring) =>
        Array.from({ length: 16 + ring * 6 }, (_, i) => {
          const a = (i / (16 + ring * 6)) * Math.PI * 2 + Math.random() * 0.4;
          const jitter = 0.85 + Math.random() * 0.3;
          return {
            id: `${ring}-${i}`,
            x: Math.cos(a) * r * jitter,
            y: Math.sin(a) * r * 0.32 * jitter,
            size: 1.4 + Math.random() * 1.8,
            delay: ring * 0.07 + Math.random() * 0.12,
          };
        }),
      ),
    [],
  );

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-20"
      initial={{ rotate: 0 }}
      animate={{ rotate: 25 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: INTRO_MS / 1000, ease: "easeIn" }}
    >
      {dots.map((d) => (
        <motion.span
          key={d.id}
          className="absolute left-1/2 top-1/2 rounded-full bg-white"
          style={{ width: d.size, height: d.size, marginLeft: -d.size / 2, marginTop: -d.size / 2 }}
          initial={{ x: d.x * 1.7, y: d.y * 1.7, opacity: 0 }}
          animate={{ x: [d.x * 1.7, d.x, d.x * 0.15], y: [d.y * 1.7, d.y, d.y * 0.15], opacity: [0, 1, 0], scale: [0.6, 1.2, 0.3] }}
          transition={{ duration: (INTRO_MS / 1000) * 0.75, delay: d.delay, times: [0, 0.45, 1], ease: "easeInOut" }}
        />
      ))}
    </motion.div>
  );
}
