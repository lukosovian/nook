/**
 * Nook'a özel dolu, yuvarlak köşeli ikonlar. İnce çizgi ikonlar siyah adada küçük boyutta
 * silik ve ucuz görünüyor; en çok görülen yerlerde (medya, ses, parlaklık) bunlar kullanılır.
 */
import { motion } from "motion/react";

type P = { size?: number; className?: string };

export function PlayGlyph({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M8 5.14v13.72c0 .8.87 1.3 1.56.9l11.3-6.86a1.05 1.05 0 0 0 0-1.8L9.56 4.24A1.04 1.04 0 0 0 8 5.14Z" />
    </svg>
  );
}

export function PauseGlyph({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <rect x="6" y="4.5" width="4.2" height="15" rx="1.3" />
      <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.3" />
    </svg>
  );
}

export function NextGlyph({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M3.5 6.6v10.8c0 .74.8 1.2 1.44.83L12.5 13.1V17.4c0 .74.8 1.2 1.44.83l8.3-5.4a.98.98 0 0 0 0-1.66l-8.3-5.4a.96.96 0 0 0-1.44.83v4.3L4.94 5.77A.96.96 0 0 0 3.5 6.6Z" />
    </svg>
  );
}

export function PrevGlyph({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor" style={{ transform: "scaleX(-1)" }}>
      <path d="M3.5 6.6v10.8c0 .74.8 1.2 1.44.83L12.5 13.1V17.4c0 .74.8 1.2 1.44.83l8.3-5.4a.98.98 0 0 0 0-1.66l-8.3-5.4a.96.96 0 0 0-1.44.83v4.3L4.94 5.77A.96.96 0 0 0 3.5 6.6Z" />
    </svg>
  );
}

/** Hoparlör; ses dalgaları seviyeye göre yanar. `muted` iken çarpı. */
export function SpeakerGlyph({ size = 18, level, muted, className }: P & { level: number; muted?: boolean }) {
  const waves = muted || level === 0 ? 0 : level < 0.34 ? 1 : level < 0.67 ? 2 : 3;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M3 9.6v4.8c0 .66.54 1.2 1.2 1.2h2.7l4.3 3.73c.78.67 1.98.12 1.98-.9V5.57c0-1.02-1.2-1.57-1.98-.9L6.9 8.4H4.2c-.66 0-1.2.54-1.2 1.2Z"
        fill="currentColor"
      />
      {muted ? (
        <path d="m16.5 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        [
          "M15.8 9.4a3.7 3.7 0 0 1 0 5.2",
          "M18.2 7.3a6.9 6.9 0 0 1 0 9.4",
          "M20.5 5.2a10 10 0 0 1 0 13.6",
        ].map((d, i) => (
          <motion.path
            key={d}
            d={d}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            initial={false}
            animate={{ opacity: i < waves ? 1 : 0.18 }}
            transition={{ duration: 0.15 }}
          />
        ))
      )}
    </svg>
  );
}

/** Güneş; ışınlar parlaklığa göre uzar. */
export function SunGlyph({ size = 18, level, className }: P & { level: number }) {
  const ray = 1.6 + level * 1.8;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        const r0 = 6.6;
        return (
          <line
            key={i}
            x1={12 + Math.cos(a) * r0}
            y1={12 + Math.sin(a) * r0}
            x2={12 + Math.cos(a) * (r0 + ray)}
            y2={12 + Math.sin(a) * (r0 + ray)}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
