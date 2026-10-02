import { motion, type TargetAndTransition } from "motion/react";
import { ANTIC_MS } from "../../hooks/useAntics";
import { spring } from "../../lib/motion";
import type { Expression } from "../../store/nook";

const corners = (tl: number, tr: number, br: number, bl: number) => ({
  borderTopLeftRadius: tl,
  borderTopRightRadius: tr,
  borderBottomRightRadius: br,
  borderBottomLeftRadius: bl,
});

const hidden: TargetAndTransition = { width: 3, height: 0, opacity: 0, borderWidth: 0, ...corners(2, 2, 2, 2) };
const base = { opacity: 1, borderWidth: 0, backgroundColor: "rgba(0,0,0,1)" };
const smile = (w: number, h: number): TargetAndTransition => ({ ...base, width: w, height: h, ...corners(0.6, 0.6, h + 1, h + 1) });

/** Küre yüzde ağız çoğunlukla yok (Grok Bot gibi); yalnızca birkaç ifadede belirir. */
const MOUTH: Partial<Record<Expression, TargetAndTransition>> = {
  // Yavaşça açılıp kapanan esneme
  yawn: {
    ...base,
    width: [3, 6, 6, 3],
    height: [1.5, 7, 7, 1.5],
    ...corners(4, 4, 4, 4),
    transition: { duration: ANTIC_MS.yawn / 1000, times: [0, 0.35, 0.75, 1], ease: "easeInOut" },
  },
  surprised: { ...base, width: 3.6, height: 4, backgroundColor: "rgba(0,0,0,1)", ...corners(2, 2, 2, 2) },
  alarm: { ...base, width: [4, 5, 4], height: [4.5, 6, 4.5], ...corners(3, 3, 3, 3), transition: { duration: 0.4, repeat: Infinity } },
  giggle: smile(7, 3.4),
  love: smile(6, 2.8),
  happy: smile(6, 2.8),
  sulk: { ...base, width: 5, height: 1.8, ...corners(2, 2, 0.4, 0.4) },
  shy: smile(4, 1.8),
  // Yudumlarken küçük "o"
  drink: { ...base, width: [2.6, 3, 2.6], height: [2.6, 3, 2.6], ...corners(2, 2, 2, 2), transition: { duration: 0.5, repeat: 3 } },
  // Konuşurken ağız açılıp kapanır
  talking: {
    ...base,
    width: [3.4, 5, 3, 4.6, 3.4],
    height: [1.4, 4, 2, 3.4, 1.4],
    ...corners(2, 2, 2, 2),
    transition: { duration: 0.55, repeat: Infinity, ease: "easeInOut" },
  },
  bored: { ...base, width: 4, height: 1.2, ...corners(1, 1, 1, 1) },
  hum: {
    ...base,
    width: [2.4, 3.2, 2.4],
    height: [2.4, 3.2, 2.4],
    ...corners(2, 2, 2, 2),
    transition: { duration: 0.7, repeat: 3, ease: "easeInOut" },
  },
};

export function Mouth({ expression }: { expression: Expression }) {
  return (
    <div className="absolute left-1/2 top-1/2 flex h-0 w-0 items-center justify-center" style={{ transform: "translateY(7.2px)" }}>
      <motion.div
        className="shrink-0 border-solid border-black"
        initial={false}
        animate={MOUTH[expression] ?? hidden}
        transition={spring.eye}
      />
    </div>
  );
}
