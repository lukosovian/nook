/** Tüm panellerin paylaştığı görsel yapı taşları — Grok Bot'tan ilham alan dil. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { spring } from "../../lib/motion";
import { useNook } from "../../store/nook";

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
        tone === "danger" ? "border border-red/30 bg-red/[0.07] text-red/90 enabled:hover:border-red/50 enabled:hover:bg-red/15" : "text-label-2 enabled:hover:bg-well-hi enabled:hover:text-label"
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

/**
 * Açılır seçim — Windows'un kendi listesi adanın (pencerenin) dışına taşıyordu; imleç oraya
 * gidince ada kapanıp seçim yapılamıyordu. Bu liste her zaman adanın içinde açılır.
 */
export function Dropdown<T extends string | number>({
  options,
  value,
  onChange,
  color = ACCENT.teal,
  maxWidth = 170,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  color?: string;
  maxWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const current = options.find((o) => o.id === value);

  // Açıkken ada kapanmasın
  useEffect(() => {
    useNook.getState().setHold("dropdown", open);
    return () => useNook.getState().setHold("dropdown", false);
  }, [open]);

  // Adanın sınırları içinde: altta yer varsa aşağı, yoksa yukarı açılır
  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const b = button.current.getBoundingClientRect();
    const island = button.current.closest("[data-island]")?.getBoundingClientRect() ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    const pad = 8;
    const want = options.length * 26 + 8;
    const below = island.bottom - pad - (b.bottom + 4);
    const above = b.top - 4 - (island.top + 36);
    const down = below >= want || below >= above;
    const maxHeight = Math.max(60, Math.min(want, down ? below : above));
    const width = Math.max(b.width, 150);
    const left = Math.min(Math.max(island.left + pad, b.right - width), island.right - pad - width);
    setPos({ left, top: down ? b.bottom + 4 : b.top - 4 - maxHeight, width, maxHeight });
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    // Arkadaki liste tekerlekle kaydırılırsa menü yerinde kalmasın (programlı kaydırmalar kapatmaz)
    const scroll = (e: Event) => !menu.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", outside, true);
    window.addEventListener("keydown", key, true);
    window.addEventListener("wheel", scroll, true);
    return () => {
      window.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("wheel", scroll, true);
    };
  }, [open]);

  // Seçili olan görünsün
  useEffect(() => {
    if (open && pos) menu.current?.querySelector("[data-selected]")?.scrollIntoView({ block: "nearest" });
  }, [open, pos]);

  return (
    <>
      <button
        ref={button}
        data-dropdown
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-0 items-center gap-1 rounded-full bg-well py-0.5 pl-2.5 pr-1.5 text-[11px] font-medium text-label transition-colors hover:bg-well-hi"
        style={{ maxWidth }}
      >
        <span className="min-w-0 truncate">{current?.label ?? "Seç"}</span>
        <ChevronDown size={11} strokeWidth={2.6} className={`shrink-0 text-label-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={menu}
              className="fixed z-[100] overflow-y-auto rounded-[14px] border border-white/10 p-1 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.9)]"
              style={{ left: pos.left, top: pos.top, width: pos.width, maxHeight: pos.maxHeight, background: "#161618" }}
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
              transition={{ duration: 0.14 }}
            >
              {options.map((o) => {
                const sel = o.id === value;
                return (
                  <button
                    key={String(o.id)}
                    data-selected={sel || undefined}
                    onClick={() => {
                      onChange(o.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-1.5 rounded-[10px] px-2 py-[5px] text-left text-[11.5px] transition-colors hover:bg-well-hi"
                    style={sel ? { color: tintText(color), background: tintBg(color, 12) } : { color: "var(--color-label-2)" }}
                  >
                    <span className="min-w-0 flex-1">{o.label}</span>
                    {sel && <Check size={12} strokeWidth={2.6} className="shrink-0" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
