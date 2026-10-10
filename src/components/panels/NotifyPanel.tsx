import { useEffect, useRef, useState } from "react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { AnimatePresence, motion } from "motion/react";
import { useNook, type NookNotif, type NotifItem } from "../../store/nook";
import { ACCENT, EmptyState, MiniNook, Segmented, TextButton, Toggle, tintText } from "../ui/primitives";
import { STYLE } from "../overlays/ToastView";
import { tt, locale } from "../../lib/i18n";
import { notifyStatus } from "../../lib/bridge";

type Source = "windows" | "nook";
/** Son seçilen sekme (panel kapanıp açılınca korunur) */
let lastSource: Source = "windows";

/** Windows bildirimleri (Discord, WhatsApp, Mail…) ve Nook'un kendi bildirimlerinin geçmişi. */
export function NotifyPanel() {
  const [source, setSource] = useState<Source>(lastSource);
  const pick = (v: Source) => {
    lastSource = v;
    setSource(v);
  };
  const nookCount = useNook((s) => s.nookNotifs.length);
  const tabs = (
    <Segmented
      id="notify-source"
      value={source}
      onChange={pick}
      color={ACCENT.purple}
      options={[
        { id: "windows", label: "Windows" },
        { id: "nook", label: nookCount ? `Nook · ${nookCount}` : "Nook" },
      ]}
    />
  );
  return source === "nook" ? <NookList tabs={tabs} /> : <WindowsList tabs={tabs} />;
}

/** Nook'un adada gösterdiği kartlar: bölüm işaretlendi, USB takıldı, şarkı bulundu… Sessizdeyken gelmeyenler de. */
function NookList({ tabs }: { tabs: React.ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("notify-nook", scroller);
  const items = useNook((s) => s.nookNotifs);
  const clear = useNook((s) => s.clearNookNotifs);
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        {tabs}
        {items.length > 0 && (
          <TextButton tone="danger" onClick={clear}>{tt("Temizle")}</TextButton>
        )}
      </div>
      {!items.length ? (
        <EmptyState title={tt("Nook bildirimi yok")} hint={tt("Adada çıkan kartlar burada birikir; kaçırdığına sonradan bakarsın")} color={ACCENT.purple} />
      ) : (
        <div ref={scroller} className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {items.map((n) => (
              <NookRow key={n.id} n={n} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function NookRow({ n }: { n: NookNotif }) {
  const st = STYLE[n.kind] ?? { color: ACCENT.purple, icon: undefined };
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-start gap-2.5 rounded-[12px] bg-well px-2.5 py-1.5"
    >
      {n.icon ? (
        <img src={n.icon} alt="" draggable={false} className="mt-0.5 h-6 w-6 shrink-0 rounded-[6px] object-cover" />
      ) : (
        <span className="mt-0.5">
          <MiniNook color={st.color} size={24} icon={st.icon} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[12px] font-medium" style={{ color: tintText(st.color) }}>{n.title}</span>
          <span className="shrink-0 text-[10px] tabular-nums text-label-3">{ago(n.at)}</span>
        </div>
        {n.detail && <p className="line-clamp-2 text-[11px] leading-snug text-label-2">{n.detail}</p>}
      </div>
    </motion.div>
  );
}

function WindowsList({ tabs }: { tabs: React.ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("notify", scroller);
  const items = useNook((s) => s.notifications);
  const on = useNook((s) => s.settings.notifications);
  const update = useNook((s) => s.updateSettings);
  const clear = useNook((s) => s.clearNotifications);
  // "Bildirim yok" ile "okuyamıyorum" ayrı görünsün
  const [readable, setReadable] = useState<boolean | null>(null);
  useEffect(() => void notifyStatus().then(setReadable).catch(() => undefined), []);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        {tabs}
        <label className="ml-auto flex items-center gap-2 text-[11px] text-label-2">
          <Toggle on={on} onChange={(v) => update({ notifications: v })} color={ACCENT.purple} />{tt("Adada göster")}</label>
        {items.length > 0 && (
          <TextButton tone="danger" onClick={clear}>{tt("Temizle")}</TextButton>
        )}
      </div>
      {!items.length ? (
        <EmptyState
          title={!on ? tt("Bildirimler kapalı") : readable === false ? tt("Bildirimleri okuyamıyorum") : tt("Bildirim yok")}
          hint={
            !on
              ? tt("Açınca Windows bildirimleri adada da görünür")
              : readable === false
                ? tt("Windows'un bildirim kaydına ulaşamadım. Ayarlar › Sistem › Bildirimler açık mı?")
                : tt("Discord, WhatsApp, Mail… bildirimleri burada birikir")
          }
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
  if (m < 1) return tt("şimdi");
  if (m < 60) return tt("{0} dk", m);
  const h = Math.floor(m / 60);
  return h < 24 ? tt("{0} sa", h) : new Date(at).toLocaleDateString(locale(), { day: "numeric", month: "short" });
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
