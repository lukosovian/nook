import { useRef } from "react";
import { motion, useAnimationFrame } from "motion/react";
import { ISLAND } from "../../lib/layout";
import { livePosition } from "../../lib/media";
import type { NowPlaying } from "../../store/nook";
import { ACCENT, MiniNook } from "../ui/primitives";

const ART = 22;

/**
 * Kapalı adada çalan medya: solda kapak, sağda şarkının ilerleme halkası.
 * Sesin kendisini Nook gösteriyor — gözleri dalgalı ses çubuklarına dönüşüyor.
 */
export function MiniPlayer({ media }: { media: NowPlaying }) {
  const top = (ISLAND.collapsed.height - ART) / 2;
  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      <div className="absolute left-2 flex items-center justify-center overflow-hidden rounded-[7px]" style={{ top, width: ART, height: ART }}>
        {media.artwork ? (
          <img src={media.artwork} alt="" draggable={false} className="h-full w-full object-cover" />
        ) : (
          <MiniNook color={ACCENT.pink} size={ART} eyes="happy" />
        )}
      </div>
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
        <TrackRing media={media} />
      </div>
    </motion.div>
  );
}

/** Şarkının ne kadarının çaldığını gösteren ince halka — her karede doğrudan SVG'ye yazar. */
function TrackRing({ media }: { media: NowPlaying }) {
  const arc = useRef<SVGCircleElement>(null);
  const latest = useRef(media);
  latest.current = media;
  const size = 18;
  const r = 7;
  const c = 2 * Math.PI * r;

  useAnimationFrame(() => {
    const m = latest.current;
    const p = m.durationMs > 0 ? livePosition(m) / m.durationMs : 0;
    arc.current?.setAttribute("stroke-dashoffset", String(c * (1 - p)));
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="2.2" />
      <circle
        ref={arc}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={ACCENT.pink}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c}
      />
    </svg>
  );
}
