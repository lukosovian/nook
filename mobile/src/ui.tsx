import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import { argusImage, type Pairing } from "./lib/pc";
import { NookFigure } from "@nook/components/mascot/Figure";
import { CHIP_NOOKS, normalizeColor, normalizeLook, type Look } from "@nook/lib/look";
import type { Expression } from "@nook/store/nook";

/** Renkli küçük küre: masaüstündeki Nook çiplerindeki mini Nook'lar gibi. İkon verilirse göz yerine ikon. */
export function Ball({ color, size = 40, icon: Icon }: { color: string; size?: number; icon?: LucideIcon }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${color} 55%, white) 0%, ${color} 45%, color-mix(in srgb, ${color} 70%, black) 100%)`,
        boxShadow: `0 0 ${size * 0.35}px -${size * 0.1}px ${color}`,
      }}
    >
      {Icon ? (
        <Icon size={size * 0.48} strokeWidth={2.4} className="text-black/75" />
      ) : (
        <span className="flex items-center" style={{ gap: size * 0.14, marginTop: size * 0.05 }}>
          {[0, 1].map((i) => (
            <span key={i} className="block rounded-full bg-black/85" style={{ width: size * 0.14, height: size * 0.3 }} />
          ))}
        </span>
      )}
    </span>
  );
}

/** Alt ekranların üst çubuğu: geri + başlık */
export function TopBar({ title, nook, onBack, right }: { title: string; nook: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <header className="flex items-center gap-3 px-1 pt-1">
      <button onClick={onBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-label-2">
        <ChevronLeft size={22} />
      </button>
      <ChipNook id={nook} size={34} />
      <h1 className="min-w-0 flex-1 truncate font-round text-[22px] font-extrabold tracking-tight">{title}</h1>
      {right}
    </header>
  );
}

/** Alttan açılan pencere. Yalnızca arka karartma solar; pencerenin kendisi hep opak. */
export function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end">
      <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 420, damping: 38 }}
        className="safe relative max-h-[85vh] w-full overflow-y-auto rounded-t-[28px] bg-card px-5 pt-5"
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Kısa bilgi balonu: const [toast, say] = useToast() */
export function useToast() {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef(0);
  const say = (t: string) => {
    setText(t);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setText(null), 2800);
  };
  const node = (
    <AnimatePresence>
      {text && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-x-6 bottom-10 z-50 rounded-2xl bg-card-hi px-4 py-3 text-center text-[14px] shadow-2xl"
        >
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
  return [node, say] as const;
}

export function errText(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/** Afiş: Argus'taki ("/medya/…", PC'den çekilir) ya da TMDB'deki (tam adres) */
export function Cover({ pairing, src, className, alt = "" }: { pairing: Pairing; src: string | null | undefined; className?: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(src && !src.startsWith("/") ? src : null);
  useEffect(() => {
    if (!src) return setUrl(null);
    if (!src.startsWith("/")) return setUrl(src);
    let alive = true;
    argusImage(pairing, src)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
    };
  }, [pairing, src]);
  return url ? <img src={url} alt={alt} className={className} /> : <div className={`${className ?? ""} bg-well`} />;
}

/** Android'in geri tuşu/hareketi alt ekrandan ana ekrana dönsün */
export function useBackButton(onBack: () => void) {
  const cb = useRef(onBack);
  cb.current = onBack;
  useEffect(() => {
    history.pushState({ nook: true }, "");
    const onPop = () => cb.current();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
}

// ---------------------------------------------------------------- Masaüstündeki 3B Nook'lar

export const tintText = (c: string) => `color-mix(in srgb, ${c} 70%, white)`;
export const tintBg = (c: string, pct = 13) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

/** PC'deki çiplerin Nook'u (bölümüne göre giyinmiş, aynı CHIP_NOOKS) */
export function ChipNook({ id, size = 30, expression = "idle" }: { id: string; size?: number; expression?: Expression }) {
  const c = CHIP_NOOKS[id];
  if (!c) return <Ball color="#9a9aa2" size={size} />;
  return <NookFigure look={c.look} color={c.color} size={size} expression={expression} />;
}

/** Bölüm çipi: PC'deki ana sayfa çipleri gibi hap biçiminde, renkli zemin ve kenar */
export function NookChip({
  id,
  label,
  sub,
  color,
  disabled,
  onClick,
}: {
  id: string;
  label: string;
  sub?: string;
  color: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.95 }}
      disabled={disabled}
      onClick={onClick}
      className="flex min-w-0 items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-3.5 text-left disabled:opacity-40"
      style={{ background: tintBg(color, 12), borderColor: tintBg(color, 34) }}
    >
      <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center">
        <ChipNook id={id} size={34} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[14.5px] font-semibold" style={{ color: tintText(color) }}>
          {label}
        </span>
        {sub && <span className="mt-0.5 block truncate text-[11.5px] text-label-3">{sub}</span>}
      </span>
    </motion.button>
  );
}

/** PC'deki Nook'un kendisi: aynı biçim, renk ve aksesuarlar (PC göndermediyse varsayılan beyaz Nook) */
export function MyNook({ look, color, size, expression = "idle" }: { look?: unknown; color?: string; size: number; expression?: Expression }) {
  return <NookFigure look={normalizeLook(look as Look)} color={normalizeColor(color ?? "#F4F4F6")} size={size} expression={expression} alive={expression === "idle"} />;
}
