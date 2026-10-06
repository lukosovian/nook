import { motion, type TargetAndTransition, type Transition } from "motion/react";
import { normalizeColor, normalizeLook } from "../../lib/look";
import { useNook } from "../../store/nook";

/** Kullanıcının Nook'unun görünümü ve rengi (dışarıdaki sahneler için) */
export function useMyLook() {
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  return { look, color };
}

/**
 * Gövdeden kopuk küçük el (Hands'teki ile aynı görünüm). `x`, `y` elin merkezi; `k` ölçek
 * (1 = yüz çapı 24 px olan Nook'un eli).
 */
export function Paw({
  x,
  y,
  k,
  color,
  rotate = 0,
  animate,
  transition,
}: {
  x: number;
  y: number;
  k: number;
  color: string;
  rotate?: number;
  animate?: TargetAndTransition;
  transition?: Transition;
}) {
  const w = 6.4 * k;
  const h = 5.2 * k;
  return (
    <motion.span
      className="pointer-events-none absolute rounded-full"
      style={{
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        rotate,
        background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${color}, white 55%) 0%, ${color} 55%, color-mix(in srgb, ${color}, black 30%) 100%)`,
        boxShadow: "0 1px 2px rgba(0,0,0,0.45)",
      }}
      initial={false}
      animate={animate}
      transition={transition ?? { type: "spring", stiffness: 420, damping: 18 }}
    />
  );
}

/** Altın yıldız (balıkta tutulan) */
export function Star({ size, glow = true }: { size: number; glow?: boolean }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 0.42 : 1;
    return `${50 + Math.cos(a) * r * 48},${52 + Math.sin(a) * r * 48}`;
  }).join(" ");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="overflow-visible" style={glow ? { filter: "drop-shadow(0 0 6px rgba(255,210,63,0.9))" } : undefined}>
      <defs>
        <radialGradient id="nook-star" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fff6c2" />
          <stop offset="0.45" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#e09a00" />
        </radialGradient>
      </defs>
      <polygon points={pts} fill="url(#nook-star)" stroke="#c98400" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="40" cy="44" r="5" fill="#2a2a30" />
      <circle cx="60" cy="44" r="5" fill="#2a2a30" />
    </svg>
  );
}

/** Buruşmuş eski dosya (balıkta tutulan çöp) */
export function OldFile({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 50 60" className="overflow-visible" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }}>
      <path d="M6 4 L32 2 L45 15 L47 55 L27 57 L4 56 L7 31 Z" fill="#e9e6dc" stroke="#a9a598" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M32 2 L31 16 L45 15" fill="#cfcabb" stroke="#a9a598" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Buruşukluk çizgileri */}
      <path d="M8 30 L22 26 L40 33 M14 46 L26 40 L44 47" fill="none" stroke="#c3bfb1" strokeWidth="1.2" />
      {/* Su lekesi ve yosun */}
      <ellipse cx="17" cy="16" rx="6" ry="4" fill="#8fb3c9" opacity="0.45" />
      <path d="M38 57 Q40 50 37 46 M41 57 Q44 52 42 47" fill="none" stroke="#5fae6e" strokeWidth="2" strokeLinecap="round" />
      <rect x="10" y="34" width="22" height="3" rx="1.5" fill="#6c86d8" opacity="0.7" />
    </svg>
  );
}
