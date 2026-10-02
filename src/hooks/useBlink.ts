import { useEffect } from "react";
import { animate, useMotionValue } from "motion/react";

/**
 * Doğal göz kırpma: 2.2–6 sn arası rastgele aralık, %18 ihtimalle çift kırpma.
 * Göz kapağı = gözün scaleY'si; React render'ı olmadan doğrudan motion value.
 */
export function useBlink(enabled: boolean) {
  const lid = useMotionValue(1);

  useEffect(() => {
    if (!enabled) {
      lid.set(1);
      return;
    }

    let alive = true;
    let timer = 0;
    const once = (delay = 0) =>
      animate(lid, [1, 0.08, 1], { duration: 0.17, times: [0, 0.4, 1], ease: "easeInOut", delay });

    const schedule = () => {
      timer = window.setTimeout(async () => {
        await once();
        if (alive && Math.random() < 0.18) await once(0.06);
        if (alive) schedule();
      }, 2200 + Math.random() * 3800);
    };
    schedule();

    return () => {
      alive = false;
      window.clearTimeout(timer);
      lid.stop();
      lid.set(1);
    };
  }, [enabled, lid]);

  return lid;
}
