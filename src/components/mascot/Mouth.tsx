import { motion, type TargetAndTransition } from "motion/react";
import { ANTIC_MS } from "../../hooks/useAntics";
import { spring } from "../../lib/motion";
import type { Expression } from "../../store/nook";
import type { FeedStyle } from "./Props";

const corners = (tl: number, tr: number, br: number, bl: number) => ({
  borderTopLeftRadius: tl,
  borderTopRightRadius: tr,
  borderBottomRightRadius: br,
  borderBottomLeftRadius: bl,
});

const hidden: TargetAndTransition = { width: 3, height: 0, opacity: 0, borderWidth: 0, ...corners(2, 2, 2, 2) };
const base = { opacity: 1, borderWidth: 0, backgroundColor: "rgba(0,0,0,1)" };
const smile = (w: number, h: number): TargetAndTransition => ({ ...base, width: w, height: h, ...corners(0.6, 0.6, h + 1, h + 1) });

/** Dosya yutarken / yakalarken üsluba göre ağız hareketleri */
const FEED_MOUTH: Record<FeedStyle, { hungry: TargetAndTransition; chewing: TargetAndTransition }> = {
  chomp: {
    hungry: { ...base, width: 7.4, height: 6.2, ...corners(2.2, 2.2, 4.2, 4.2) },
    chewing: {
      ...base,
      width: [7.4, 8.4, 6.8, 8.2, 6.4, 5.8],
      height: [6.2, 1.4, 5.2, 1.4, 4.4, 1.8],
      ...corners(2.2, 2.2, 3.8, 3.8),
      transition: { duration: 0.85, ease: "easeInOut" },
    },
  },
  vacuum: {
    hungry: {
      ...base,
      width: [3.6, 4.5, 3.6],
      height: [3.6, 4.5, 3.6],
      ...corners(3, 3, 3, 3),
      transition: { duration: 0.45, repeat: Infinity, ease: "easeInOut" },
    },
    chewing: {
      ...base,
      width: [4.5, 5.4, 2.2, 5.8],
      height: [4.5, 5.4, 1.5, 2.6],
      ...corners(3, 3, 3, 3),
      transition: { duration: 0.85, times: [0, 0.35, 0.68, 1], ease: "easeInOut" },
    },
  },
  catch: {
    hungry: { ...base, width: 3.4, height: 3.4, ...corners(2, 2, 2, 2) },
    chewing: smile(6.6, 3.1),
  },
  folder: {
    hungry: hidden,
    chewing: smile(5.6, 2.4),
  },
  box: {
    hungry: hidden,
    chewing: hidden,
  },
};

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
  // "Ha… ha… hapşu!": yavaşça açılır, sonra birden kapanır
  sneeze: {
    ...base,
    width: [3, 4.5, 5.5, 2.5, 3],
    height: [1.5, 4, 5.5, 1, 1.4],
    ...corners(3, 3, 3, 3),
    transition: { duration: ANTIC_MS.sneeze / 1000, times: [0, 0.3, 0.55, 0.62, 1], ease: "easeInOut" },
  },
  // Sakız balonunu üfleyen minik "o"
  gum: { ...base, width: 2.6, height: 2.6, ...corners(2, 2, 2, 2) },
  spin: smile(6, 2.8),
  campfire: smile(5, 2.2),
  // Sıcaktan dili dışarıda soluyor
  hot: {
    ...base,
    width: 4.2,
    height: [2.6, 3.4, 2.6],
    backgroundColor: "rgba(0,0,0,1)",
    ...corners(2, 2, 2.4, 2.4),
    transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" },
  },
  hum: {
    ...base,
    width: [2.4, 3.2, 2.4],
    height: [2.4, 3.2, 2.4],
    ...corners(2, 2, 2, 2),
    transition: { duration: 0.7, repeat: 3, ease: "easeInOut" },
  },
};

export function Mouth({ expression, feedStyle = "chomp" }: { expression: Expression; feedStyle?: FeedStyle }) {
  const target =
    expression === "hungry" || expression === "chewing"
      ? FEED_MOUTH[feedStyle][expression]
      : (MOUTH[expression] ?? hidden);
  const showTongue = feedStyle === "chomp" && expression === "hungry";
  return (
    <div className="absolute left-1/2 top-1/2 flex h-0 w-0 items-center justify-center" style={{ transform: "translateY(7.2px)" }}>
      <motion.div
        className="relative shrink-0 overflow-hidden border-solid border-black"
        initial={false}
        animate={target}
        transition={spring.eye}
      >
        {showTongue && (
          <span
            className="absolute inset-x-[1.2px] bottom-[-1px] rounded-t-full"
            style={{ height: 3.2, background: "#fb7185" }}
          />
        )}
      </motion.div>
    </div>
  );
}
