/** Studio sayfalarının ortak parçaları: başlık, kart, sayı kutucuğu */
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { tintBg, tintText } from "../components/ui/primitives";

/**
 * Menülerdeki simge kutusu: seçiliyken kendi renginde dolu, parlak ve beyaz simgeli; değilken
 * hafif renkli zemin ve renkli simge.
 */
export function NavIcon({ icon: Icon, color, on, size = 32 }: { icon: LucideIcon; color: string; on: boolean; size?: number }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center transition-[background,box-shadow,color] duration-200"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.34),
        background: on ? `linear-gradient(150deg, color-mix(in srgb, ${color} 88%, white), color-mix(in srgb, ${color} 72%, black))` : tintBg(color, 12),
        color: on ? "#fff" : tintText(color),
        boxShadow: on ? `inset 0 1px 0 rgb(255 255 255 / 0.32), 0 6px 16px -6px ${color}` : `inset 0 0 0 1px ${tintBg(color, 16)}`,
      }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={on ? 2.4 : 2.1} />
    </span>
  );
}

export function Page({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={`mx-auto w-full px-8 pb-10 pt-7 ${wide ? "max-w-[1240px]" : "max-w-[1080px]"}`}>{children}</div>;
}

export function PageHeader({ icon: Icon, color, title, subtitle, actions }: { icon: LucideIcon; color: string; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <NavIcon icon={Icon} color={color} on size={48} />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[25px] font-extrabold leading-tight tracking-[-0.02em] text-label">{title}</h1>
        {subtitle && <p className="truncate text-[13px] text-label-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Kart: başlığı varsa üstte */
export function Panel({ title, hint, right, children, className = "", style, delay = 0 }: { title?: string; hint?: string; right?: React.ReactNode; children: React.ReactNode; className?: string; style?: React.CSSProperties; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, delay }}
      className={`nook-card rounded-[22px] p-5 ${className}`}
      style={style}
    >
      {(title || right) && (
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="truncate text-[15px] font-bold tracking-tight text-label">{title}</h2>}
            {hint && <p className="truncate text-[11.5px] text-label-3">{hint}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export function Stat({ icon: Icon, color, label, value, sub, delay = 0 }: { icon: LucideIcon; color: string; label: string; value: string; sub?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, delay }}
      className="flex min-w-0 flex-col rounded-[20px] border p-4"
      style={{ background: `linear-gradient(160deg, ${tintBg(color, 12)}, ${tintBg(color, 3)})`, borderColor: tintBg(color, 26) }}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: tintBg(color, 22), color: tintText(color) }}>
        <Icon size={17} strokeWidth={2.3} />
      </span>
      <p className="mt-3 text-[12px] font-medium text-label-3">{label}</p>
      <p className="font-round text-[26px] font-extrabold leading-tight tabular-nums text-label">{value}</p>
      {sub && <p className="truncate text-[11px] text-label-3">{sub}</p>}
    </motion.div>
  );
}

/** Düz düğme */
export function Btn({ onClick, color, children, ghost = false, disabled }: { onClick: () => void; color: string; children: React.ReactNode; ghost?: boolean; disabled?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 items-center gap-2 rounded-[12px] border px-3.5 text-[12.5px] font-semibold transition-colors disabled:opacity-40"
      style={ghost ? { background: "rgb(255 255 255 / 0.04)", borderColor: "rgb(255 255 255 / 0.09)", color: "var(--color-label-2)" } : { background: tintBg(color, 18), borderColor: tintBg(color, 42), color: tintText(color) }}
    >
      {children}
    </motion.button>
  );
}
