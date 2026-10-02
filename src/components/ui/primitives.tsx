/** Tüm panellerin paylaştığı görsel yapı taşları — Grok Bot'tan ilham alan dil. */
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { spring } from "../../lib/motion";

/** Vurgu renkleri */
export const ACCENT = {
  teal: "var(--color-teal)",
  red: "var(--color-red)",
  orange: "var(--color-orange)",
  purple: "var(--color-purple)",
  blue: "var(--color-blue)",
  green: "var(--color-green)",
  pink: "var(--color-pink)",
  yellow: "var(--color-yellow)",
  gray: "#8a8a93",
} as const;
export type Accent = keyof typeof ACCENT;

/** Seviyeye göre renk (pil, doluluk). `invert`: yüksek değer kötü (CPU, disk). */
export function levelAccent(pct: number, invert = false): Accent {
  const p = invert ? 100 - pct : pct;
  return p <= 15 ? "red" : p <= 30 ? "orange" : "teal";
}
export const levelColor = (pct: number, invert = false) => ACCENT[levelAccent(pct, invert)];

/** Renkli rengin açık tonu (çip metni için) */
export const tintText = (c: string) => `color-mix(in srgb, ${c} 70%, white)`;
export const tintBg = (c: string, pct = 13) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

export function Card({ className = "", children, style }: { className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={`nook-card rounded-[18px] ${className}`} style={style}>
      {children}
    </div>
  );
}

/** İç kuyucuk: kart içindeki ikincil yüzey */
export function Well({ className = "", children, style }: { className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-[14px] bg-well ${className}`} style={style}>
      {children}
    </div>
  );
}

/**
 * Mini Nook avatarı: renkli küçük küre + iki göz. Çiplerde ikon yerine kullanılır
 * (Grok Bot'taki renkli mini botlar gibi). `icon` verilirse gözler yerine ikon çizilir.
 */
export function MiniNook({
  color,
  size = 20,
  eyes = "open",
  icon: Icon,
}: {
  color: string;
  size?: number;
  eyes?: "open" | "happy" | "closed" | "side";
  icon?: LucideIcon;
}) {
  const ew = size * 0.15;
  const eh = eyes === "open" || eyes === "side" ? size * 0.32 : size * 0.1;
  return (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${color} 55%, white) 0%, ${color} 45%, color-mix(in srgb, ${color} 70%, black) 100%)`,
        boxShadow: `0 0 10px -2px ${color}`,
      }}
    >
      {Icon ? (
        <Icon size={size * 0.55} strokeWidth={2.4} className="text-black/75" />
      ) : (
        <span className="flex items-center" style={{ gap: size * 0.14, transform: eyes === "side" ? `translateX(${size * 0.16}px)` : undefined, marginTop: size * 0.06 }}>
          {[0, 1].map((i) => (
            <span
              key={i}
              className="block bg-black/85"
              style={{
                width: ew,
                height: eh,
                borderRadius: eyes === "happy" ? `${ew}px ${ew}px 1px 1px` : ew,
              }}
            />
          ))}
        </span>
      )}
    </span>
  );
}

/** Grok Bot çipi: renkli zemin + ince renkli kenar + avatar + etiket. */
export function Chip({
  color,
  label,
  sub,
  avatar,
  onClick,
  active = true,
  className = "",
  title,
}: {
  color: string;
  label: React.ReactNode;
  sub?: React.ReactNode;
  avatar?: React.ReactNode;
  onClick?: () => void;
  /** Pasifken soluk görünür */
  active?: boolean;
  className?: string;
  title?: string;
}) {
  const Comp = onClick ? motion.button : motion.div;
  return (
    <Comp
      onClick={onClick}
      title={title}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      transition={spring.pop}
      className={`flex min-w-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-left transition-colors ${className}`}
      style={{
        background: active ? tintBg(color, 14) : "rgb(255 255 255 / 0.03)",
        borderColor: active ? tintBg(color, 38) : "rgb(255 255 255 / 0.06)",
      }}
    >
      {avatar}
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[12px] font-medium" style={{ color: active ? tintText(color) : "var(--color-label-2)" }}>
          {label}
        </span>
        {sub && <span className="block truncate text-[10px] text-label-3">{sub}</span>}
      </span>
    </Comp>
  );
}

/** Boş durum: soluk mini Nook + iki satır. */
export function EmptyState({ title, hint, color = "#8a8a93" }: { icon?: LucideIcon; title: string; hint: string; color?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2.5 text-center">
      <MiniNook color={color} size={30} eyes="side" />
      <div>
        <p className="text-[13px] font-medium text-label">{title}</p>
        <p className="mt-0.5 text-[11px] text-label-3">{hint}</p>
      </div>
    </div>
  );
}

/** Küçük metin düğmesi */
export function TextButton({
  onClick,
  disabled,
  children,
  tone = "default",
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      transition={spring.pop}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-35 ${
        tone === "danger" ? "text-red/90 enabled:hover:bg-red/10" : "text-label-2 enabled:hover:bg-well-hi enabled:hover:text-label"
      }`}
    >
      {children}
    </motion.button>
  );
}

/** Anahtar: topuz küçük bir küre; açıkken iz renkli parlar. */
export function Toggle({ on, onChange, color = ACCENT.teal }: { on: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative flex h-[18px] w-[34px] shrink-0 items-center rounded-full border p-[2px] transition-colors duration-200 ${on ? "justify-end" : "justify-start"}`}
      style={{ background: on ? tintBg(color, 30) : "rgb(255 255 255 / 0.05)", borderColor: on ? tintBg(color, 60) : "rgb(255 255 255 / 0.08)" }}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 700, damping: 32 }}
        className="h-3 w-3 rounded-full"
        style={{
          background: on
            ? `radial-gradient(circle at 35% 30%, #fff 0%, color-mix(in srgb, ${color} 60%, white) 60%, ${color} 100%)`
            : "radial-gradient(circle at 35% 30%, #fff 0%, #bdbdc6 70%, #8c8c96 100%)",
          boxShadow: on ? `0 0 8px ${color}` : "0 1px 2px rgba(0,0,0,0.5)",
        }}
      />
    </button>
  );
}

/** Segment seçici: seçili parça renkli çip gibi. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  id,
  color = ACCENT.teal,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  id: string;
  color?: string;
}) {
  return (
    <div className="flex shrink-0 gap-0.5 rounded-full bg-well p-[2px]">
      {options.map((o) => (
        <button
          key={String(o.id)}
          onClick={() => onChange(o.id)}
          className={`relative whitespace-nowrap rounded-full px-2 py-[2px] text-[10.5px] font-medium transition-colors ${value === o.id ? "" : "text-label-3 hover:text-label-2"}`}
          style={value === o.id ? { color: tintText(color) } : undefined}
        >
          {value === o.id && (
            <motion.span
              layoutId={`seg-${id}`}
              className="absolute inset-0 rounded-full border"
              style={{ background: tintBg(color, 16), borderColor: tintBg(color, 40) }}
              transition={spring.pop}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** İnce ilerleme çubuğu */
export function Bar({ pct, color, className = "" }: { pct: number; color: string; className?: string }) {
  return (
    <div className={`h-[3px] overflow-hidden rounded-full bg-white/[0.07] ${className}`}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </div>
  );
}
