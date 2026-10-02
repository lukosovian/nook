import type { Transition } from "motion/react";

/**
 * Tek yerden ayarlanan yay (spring) fizikleri.
 * Apple hissi: yüksek stiffness (hızlı çıkış) + damping ile tek, küçük bir overshoot.
 */
export const spring = {
  /** Ada genişleme/daralma */
  island: { type: "spring", stiffness: 420, damping: 34, mass: 0.9 },
  /** Dosya yaklaşınca: daha esnek, jöle gibi */
  stretch: { type: "spring", stiffness: 520, damping: 17, mass: 0.8 },
  /** Göz şekli değişimleri (açılma, kısılma) */
  eye: { type: "spring", stiffness: 600, damping: 30 },
  /** Raf kartları, çipler */
  pop: { type: "spring", stiffness: 500, damping: 28 },
} satisfies Record<string, Transition>;

/** useSpring için (motion value takibi) — göz bebekleri */
export const pupilSpring = { stiffness: 380, damping: 26, mass: 0.4 };

export const easeOut = [0.2, 0.8, 0.2, 1] as const;
