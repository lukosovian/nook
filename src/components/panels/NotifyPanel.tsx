import { useRef } from "react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { AnimatePresence, motion } from "motion/react";
import { useNook, type NotifItem } from "../../store/nook";
import { ACCENT, EmptyState, MiniNook, TextButton, Toggle } from "../ui/primitives";

/** Son Windows bildirimleri (Discord, WhatsApp, Mail…). Odaktayken susturulanlar da burada birikir. */
export function NotifyPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("notify", scroller);
  const items = useNook((s) => s.notifications);
  const on = useNook((s) => s.settings.notifications);
  const update = useNook((s) => s.updateSettings);
  const clear = useNook((s) => s.clearNotifications);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[11px] text-label-2">
          <Toggle on={on} onChange={(v) => update({ notifications: v })} color={ACCENT.purple} />
          Adada göster
        </label>
        {items.length > 0 && (
          <TextButton tone="danger" onClick={clear}>
            Temizle
          </TextButton>
        )}
      </div>
      {!items.length ? (
        <EmptyState
          title={on ? "Bildirim yok" : "Bildirimler kapalı"}
          hint={on ? "Discord, WhatsApp, Mail… bildirimleri burada birikir" : "Açınca Windows bildirimleri adada da görünür"}
          color={ACCENT.purple}
        />
      ) : (
        <div ref={scroller} className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {items.map((n) => (
              <Row key={n.id} n={n} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

const ago = (at: number) => {
  const m = Math.floor((Date.now() - at) / 60_000);
  if (m < 1) return "şimdi";
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} sa` : new Date(at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
};

function Row({ n }: { n: NotifItem }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-start gap-2.5 rounded-[12px] bg-well px-2.5 py-1.5"
    >
      {n.icon ? (
        <img src={n.icon} alt="" draggable={false} className="mt-0.5 h-6 w-6 shrink-0 rounded-[6px] object-contain" />
      ) : (
        <span className="mt-0.5">
          <MiniNook color={ACCENT.purple} size={24} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[12px] font-medium text-label">{n.title}</span>
          <span className="shrink-0 text-[10px] tabular-nums text-label-3">{ago(n.at)}</span>
        </div>
        <p className="line-clamp-2 text-[11px] leading-snug text-label-2">{n.body || n.app}</p>
        {n.body && <p className="mt-0.5 truncate text-[10px] text-label-3">{n.app}</p>}
      </div>
    </motion.div>
  );
}
