import { motionValue } from "motion/react";

/**
 * Pencereye göre (mantıksal px) imleç konumu. React state değil, motion value:
 * 60 Hz güncellemeler hiçbir bileşeni yeniden render etmez.
 * Uzaktayken FAR değerine çekilir → gözler merkeze döner.
 */
export const FAR = -1e4;
export const cursorX = motionValue(FAR);
export const cursorY = motionValue(FAR);
