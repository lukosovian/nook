import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Mic } from "lucide-react";
import { EVENTS, subscribe } from "../../lib/bridge";
import { ACCENT } from "../ui/primitives";

const BARS = 5;

/** Sesli komut dinlenirken: solda mikrofon, sağda sesin şiddetine göre zıplayan çubuklar. */
export function ListenMini() {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    // Seviye Rust'tan ~14 Hz gelir; her çubuk biraz farklı tepki verir
    return subscribe<number>(EVENTS.voiceLevel, (level) => {
      bars.current.forEach((el, i) => {
        if (!el) return;
        const shape = [0.55, 0.85, 1, 0.8, 0.5][i];
        const h = 3 + Math.min(1, level * shape * (0.75 + Math.random() * 0.5)) * 13;
        el.style.height = `${h}px`;
      });
    });
  }, []);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      <motion.span
        className="absolute left-2.5 top-1/2 flex h-[20px] w-[20px] -translate-y-1/2 items-center justify-center rounded-full"
        style={{ background: `color-mix(in srgb, ${ACCENT.red} 22%, transparent)`, color: ACCENT.red }}
        animate={{ boxShadow: [`0 0 0 0 ${ACCENT.red}`, "0 0 0 6px transparent"] }}
        transition={{ duration: 1.1, repeat: Infinity }}
      >
        <Mic size={11} strokeWidth={2.6} />
      </motion.span>
      <span className="absolute right-3 top-1/2 flex h-4 -translate-y-1/2 items-center gap-[2.5px]">
        {Array.from({ length: BARS }, (_, i) => (
          <span
            key={i}
            ref={(el) => void (bars.current[i] = el)}
            className="block w-[2.5px] rounded-full transition-[height] duration-75"
            style={{ height: 3, background: ACCENT.red }}
          />
        ))}
      </span>
    </motion.div>
  );
}
