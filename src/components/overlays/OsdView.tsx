import { useEffect, useRef } from "react";
import { motion, useAnimationControls } from "motion/react";
import { useNook } from "../../store/nook";
import { SunGlyph } from "../ui/glyphs";
import { ACCENT } from "../ui/primitives";
import { tt } from "../../lib/i18n";

/** Hap kalınlığı — Nook'un yüzüyle aynı */
const H = 22;

/**
 * Ses / parlaklık göstergesi: Nook kalınlığında, ışık alan 3B bir hap.
 * Değer yaylı ilerler; her değişimde dolgu jöle gibi esner, ucu parlar.
 * İkon dolgunun içinde, yüzde hapın sağında.
 */
export function OsdView() {
  const osd = useNook((s) => s.osd);
  const squish = useAnimationControls();
  const prev = useRef<number | null>(null);

  const value = osd ? (osd.muted ? 0 : Math.max(0, Math.min(1, osd.value))) : 0;
  const pct = Math.round(value * 100);

  // Her adımda esne: artarken yana uzar, azalırken büzülür
  useEffect(() => {
    if (!osd) return;
    if (prev.current !== null && prev.current !== value) {
      const up = value > prev.current;
      void squish.start({
        scaleX: up ? [1, 1.06, 0.99, 1] : [1, 0.95, 1.01, 1],
        scaleY: up ? [1, 0.84, 1.06, 1] : [1, 1.12, 0.97, 1],
        transition: { duration: 0.42, ease: "easeOut" },
      });
    }
    prev.current = value;
  }, [value, osd, squish]);

  if (!osd) return null;

  const color = osd.kind === "brightness" ? ACCENT.yellow : osd.muted ? ACCENT.gray : ACCENT.teal;
  const light = `color-mix(in srgb, ${color} 55%, white)`;
  const dark = `color-mix(in srgb, ${color} 72%, black)`;

  return (
    <motion.div
      className="absolute inset-y-0 left-[42px] right-3 flex items-center gap-1"
      initial={{ opacity: 0, x: -10, scaleX: 0.6 }}
      animate={{ opacity: 1, x: 0, scaleX: 1, transition: { type: "spring", stiffness: 420, damping: 22, delay: 0.04 } }}
      exit={{ opacity: 0, scaleX: 0.7, transition: { duration: 0.1 } }}
      style={{ originX: 0 }}
    >
      {/* Oyuk: içeri basık koyu yol */}
      <div
        className="relative min-w-0 flex-1 rounded-full"
        style={{ height: H, background: "rgb(255 255 255 / 0.06)", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.05)" }}
      >
        {/* Dolgu: en az bir daire kadar (0'da bile ikon görünsün) */}
        <motion.div
          className="absolute inset-y-0 left-0"
          initial={false}
          animate={{ width: `max(${H}px, ${pct}%)` }}
          transition={{ type: "spring", stiffness: 380, damping: 19, mass: 0.7 }}
        >
          <motion.div
            animate={squish}
            className="relative h-full w-full rounded-full"
            style={{
              originX: 0,
              background: `radial-gradient(120% 140% at 30% 20%, ${light} 0%, ${color} 45%, ${dark} 100%)`,
              boxShadow: `0 0 14px -2px ${color}, inset 0 1.5px 0 rgba(255,255,255,0.45), inset 0 -2px 3px rgba(0,0,0,0.25)`,
            }}
          >
            {/* İkon: dolgunun solunda, Nook'un gözleri gibi koyu */}
            <span className="absolute left-0 top-0 flex items-center justify-center text-black/70" style={{ width: H, height: H }}>
              {osd.kind === "volume" ? <VolumeGlyph level={value} muted={osd.muted} /> : <SunGlyph size={13} level={value} />}
            </span>
            {/* Ucundaki parıltı: değer değişince yanıp söner */}
            <motion.span
              key={pct}
              className="absolute right-[3px] top-1/2 -translate-y-1/2 rounded-full bg-white"
              style={{ width: 6, height: 6, filter: "blur(2px)" }}
              initial={{ opacity: 0.9, scale: 1.6 }}
              animate={{ opacity: 0.35, scale: 1 }}
              transition={{ duration: 0.5 }}
            />
          </motion.div>
        </motion.div>

      </div>
        {/* Yüzde: hapın dışında, sağda */}
      <span
        className="w-[38px] shrink-0 text-right text-[14px] leading-none tabular-nums"
        style={{ fontFamily: "var(--font-round)", fontWeight: 850, letterSpacing: "-0.01em", color: "var(--color-label)" }}
      >
        <motion.span key={osd.muted ? "m" : pct} initial={{ y: -5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.16 }} className="inline-block">
          {osd.muted ? tt("Kapalı") : pct}
        </motion.span>
      </span>
    </motion.div>
  );
}

/**
 * Tombul hoparlör: yuvarlak gövde + üç kalın dalga. Dalgalar ses seviyesine göre tek tek
 * "pıt" diye belirir; sessizde dalgalar yerine kısa bir çizgi.
 */
function VolumeGlyph({ level, muted }: { level: number; muted: boolean }) {
  const waves = muted || level === 0 ? 0 : level < 0.34 ? 1 : level < 0.67 ? 2 : 3;
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <path d="M4 9.2a1.6 1.6 0 0 1 1.6-1.6h2.2l4.4-3.4c1-.8 2.4-.1 2.4 1.2v13.2c0 1.3-1.4 2-2.4 1.2l-4.4-3.4H5.6A1.6 1.6 0 0 1 4 14.8Z" fill="currentColor" />
      {muted ? (
        <motion.path d="M18 12h3.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />
      ) : (
        ["M17.6 9.6a3.4 3.4 0 0 1 0 4.8", "M20.2 7.4a6.6 6.6 0 0 1 0 9.2"].map((d, i) => (
          <motion.path
            key={d}
            d={d}
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            initial={false}
            animate={{ opacity: i < waves ? 1 : 0, scale: i < waves ? 1 : 0.4 }}
            style={{ originX: "0%", originY: "50%" }}
            transition={{ type: "spring", stiffness: 600, damping: 18 }}
          />
        ))
      )}
      {!muted && waves === 3 && (
        <motion.circle cx="22.4" cy="12" r="1.5" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} transition={{ duration: 0.3 }} />
      )}
    </svg>
  );
}
