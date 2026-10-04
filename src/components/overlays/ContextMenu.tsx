import { useEffect, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Copy, Palette, RotateCw, type LucideIcon } from "lucide-react";
import { copyText } from "../../lib/bridge";
import { useNook } from "../../store/nook";

const W = 132;
const ROW = 28;

type Item = { label: string; icon: LucideIcon; run: () => void };

/** Yazı alanları kendi menüsünü (kes/kopyala/yapıştır) gösterir. */
const editable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || el.closest("input, textarea, select") !== null);

/**
 * Tarayıcının sağ tık menüsü (Farklı kaydet, Yazdır…) yerine küçük bir Nook menüsü: Yenile
 * (seçili metin varsa Kopyala). Adanın içinde açılır — dışı tıklanamaz.
 */
export function ContextMenu({ bounds }: { bounds: RefObject<HTMLElement | null> }) {
  const [menu, setMenu] = useState<{ x: number; y: number; items: Item[] } | null>(null);

  useEffect(() => {
    const onMenu = (e: MouseEvent) => {
      if (e.defaultPrevented || editable(e.target)) return;
      // Geliştirirken Shift + sağ tık: tarayıcının menüsü (İncele)
      if (import.meta.env.DEV && e.shiftKey) return;
      e.preventDefault();
      const box = bounds.current?.getBoundingClientRect();
      if (!box) return;
      const selected = window.getSelection()?.toString() ?? "";
      const items: Item[] = [
        ...(selected.trim() ? [{ label: "Kopyala", icon: Copy, run: () => void copyText(selected) }] : []),
        { label: "Görünüm", icon: Palette, run: () => useNook.getState().setTab("look") },
        { label: "Yenile", icon: RotateCw, run: () => location.reload() },
      ];
      const h = items.length * ROW + 8;
      setMenu({
        x: Math.max(6, Math.min(e.clientX - box.left, box.width - W - 6)),
        y: Math.max(6, Math.min(e.clientY - box.top, box.height - h - 6)),
        items,
      });
    };
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("contextmenu", onMenu);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", close);
    // Ada kapanınca menü de gider
    const off = useNook.subscribe((s, p) => {
      if (p.hovered && !s.hovered) close();
    });
    return () => {
      window.removeEventListener("contextmenu", onMenu);
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", close);
      off();
    };
  }, [bounds]);

  return (
    <AnimatePresence>
      {menu && (
        <motion.div
          key="menu"
          className="absolute z-50 rounded-[14px] border border-white/[0.08] bg-[#1b1b1e]/95 p-1 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.9)] backdrop-blur"
          style={{ left: menu.x, top: menu.y, width: W, originX: 0, originY: 0 }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
          transition={{ type: "spring", stiffness: 600, damping: 32 }}
          // Menüye basmak onu kapatan pencere dinleyicisine ulaşmasın
          onPointerDown={(e) => e.stopPropagation()}
        >
          {menu.items.map((it) => (
            <button
              key={it.label}
              onClick={() => {
                setMenu(null);
                it.run();
              }}
              className="flex w-full items-center gap-2 rounded-[10px] px-2.5 text-left text-[12px] text-label transition-colors hover:bg-white/[0.08]"
              style={{ height: ROW }}
            >
              <it.icon size={12} strokeWidth={2.4} className="text-label-2" />
              {it.label}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
