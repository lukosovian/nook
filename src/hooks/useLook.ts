import { useEffect, useRef, type RefObject } from "react";
import { useMotionValue, useSpring } from "motion/react";
import { cursorX, cursorY } from "../lib/cursor";

/** Bu yarıçap (px) dışındaki imleç takip edilmez. */
const RADIUS = 420;
/** İmleç bu mesafeden uzaktaysa baş tam döner; yakındaysa daha az (şaşı bakmasın). */
const FULL_TURN = 140;
/** Bu mesafenin içinde gözler dikkat kesilir. */
const ATTENTION_DIST = 170;

/** Baş çevirme yayı: hafif gecikmeli, ağır bir kafa hissi. */
const HEAD = { stiffness: 170, damping: 18, mass: 0.9 };

/**
 * Bakış yönü: x, y ∈ [-1, 1]. Küre yüzde gözler bu yöne kayar, ışık ters yöne gider —
 * kafa gerçekten dönüyormuş gibi görünür. İmleç uzaktaysa ara sıra etrafa bakınır.
 * Tüm hesap rAF içinde; render yok.
 */
export function useLook(ref: RefObject<HTMLElement | null>, active: boolean) {
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const x = useSpring(tx, HEAD);
  const y = useSpring(ty, HEAD);
  /** 0–1: imleç yaklaştıkça artar — gözler hafifçe büyür. */
  const ta = useMotionValue(0);
  const attention = useSpring(ta, { stiffness: 260, damping: 22 });

  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
    if (!active) {
      tx.set(0);
      ty.set(0);
    }
  }, [active, tx, ty]);

  useEffect(() => {
    let raf = 0;
    let tracking = false;
    const timers = new Set<number>();
    const later = (ms: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };
    const center = () => {
      tx.set(0);
      ty.set(0);
    };

    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el || !activeRef.current) {
        ta.set(0);
        return;
      }
      const r = el.getBoundingClientRect();
      const dx = cursorX.get() - (r.left + r.width / 2);
      const dy = cursorY.get() - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);

      ta.set(dist < ATTENTION_DIST ? 1 - dist / ATTENTION_DIST : 0);
      if (dist > RADIUS || !Number.isFinite(dist)) {
        if (tracking) center();
        tracking = false;
        return;
      }
      tracking = true;
      const k = Math.min(1, dist / FULL_TURN) / (dist || 1);
      tx.set(dx * k);
      ty.set(dy * k * 0.85);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const wander = () =>
      later(3500 + Math.random() * 5000, () => {
        if (!tracking && activeRef.current) {
          tx.set((Math.random() * 2 - 1) * 0.8);
          ty.set((Math.random() * 2 - 1) * 0.5);
          later(900 + Math.random() * 900, () => !tracking && center());
        }
        wander();
      });

    const offX = cursorX.on("change", schedule);
    const offY = cursorY.on("change", schedule);
    wander();
    schedule();

    return () => {
      offX();
      offY();
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [ref, tx, ty, ta]);

  return { x, y, attention };
}
