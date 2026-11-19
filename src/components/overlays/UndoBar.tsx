import { AnimatePresence, motion } from "motion/react";
import { runUndo, UNDO_MS, useUndo } from "../../lib/undo";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

/** Açık adanın altındaki "… temizlendi · Geri al" şeridi: 5 sn'de incelen çizgiyle birlikte kaybolur */
export function UndoBar({ show }: { show: boolean }) {
  const offer = useUndo((s) => s.offer);
  const c = offer?.color ?? ACCENT.purple;
  return (
    <AnimatePresence>
      {show && offer && (
        <motion.div
          key={offer.id}
          role="status"
          className="absolute bottom-3 z-40 flex h-9 max-w-[380px] items-center gap-2 overflow-hidden rounded-full border border-white/10 pl-2 pr-1.5 shadow-[0_10px_28px_-8px_rgba(0,0,0,0.9)]"
          // Soldaki çubuk ve Nook kartı kadar sağda: içerik kartının ortasına yakın
          style={{ background: "#1e1e21", left: "calc(50% + 100px)", x: "-50%" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
        >
          <MiniNook color={c} size={20} eyes="happy" />
          <span className="min-w-0 truncate text-[11.5px] font-medium text-label">{offer.label}</span>
          <button
            onClick={runUndo}
            className="h-6 shrink-0 rounded-full border px-2.5 text-[11px] font-semibold"
            style={{ background: tintBg(c, 18), borderColor: tintBg(c, 45), color: tintText(c) }}
          >
            {tt("Geri al")}
          </button>
          <motion.span
            className="absolute inset-x-0 bottom-0 h-[2px] origin-left"
            style={{ background: c }}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: UNDO_MS / 1000, ease: "linear" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
