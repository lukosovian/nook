import { AnimatePresence, motion } from "motion/react";
import type { IslandMode } from "../../lib/layout";
import { useNook } from "../../store/nook";

/**
 * iPhone'daki gibi gizlilik noktası: mikrofon → turuncu, kamera → yeşil.
 * Adanın sağ üst köşesinde, her formda görünür (açıkken başlıkta ayrıntı var).
 */
export function PrivacyDots({ mode }: { mode: IslandMode }) {
  const mic = useNook((s) => s.privacy.mic.length > 0);
  const cam = useNook((s) => s.privacy.camera.length > 0);
  if (mode === "expanded" || mode === "search") return null;

  return (
    <div className="pointer-events-none absolute right-1.5 top-1.5 z-20 flex gap-[3px]">
      <AnimatePresence>
        {cam && <Dot key="cam" color="var(--color-sys-green)" />}
        {mic && <Dot key="mic" color="var(--color-sys-orange)" />}
      </AnimatePresence>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <motion.span
      className="block h-[6px] w-[6px] rounded-full"
      style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      transition={{ type: "spring", stiffness: 600, damping: 20 }}
    />
  );
}
