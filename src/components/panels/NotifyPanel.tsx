import { useEffect, useRef, useState } from "react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { AnimatePresence, motion } from "motion/react";
import { useNook, type NookNotif, type NotifItem } from "../../store/nook";
import { X } from "lucide-react";
import { ACCENT, EmptyState, MiniNook, Segmented, TextButton, Toggle, tintBg, tintText } from "../ui/primitives";
import { STYLE } from "../overlays/ToastView";
import { tt, locale } from "../../lib/i18n";
import { notifyStatus } from "../../lib/bridge";

type Source = "windows" | "phone" | "nook";
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
  // Telefon sekmesi yalnızca telefondan bildirim geldiyse (Nook Mobil › Bildirimler)
  const phoneCount = useNook((s) => s.notifications.filter((n) => n.phone).length);
  const tabs = (
    <Segmented
      id="notify-source"
      value={source}
      onChange={pick}
      color={ACCENT.purple}
      options={[
        { id: "windows", label: "Windows" },
        ...(phoneCount || source === "phone" ? [{ id: "phone" as const, label: phoneCount ? `${tt("Telefon")} · ${phoneCount}` : tt("Telefon") }] : []),
        { id: "nook", label: nookCount ? `Nook · ${nookCount}` : "Nook" },
      ]}
    />
  );
  return source === "nook" ? <NookList tabs={tabs} /> : <WindowsList tabs={tabs} phone={source === "phone"} />;
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
      className="flex items-start gap-2.5 rounded-[14px] border px-2.5 py-2"
      style={{ background: tintBg(st.color, 6), borderColor: tintBg(st.color, 18) }}
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

/** Windows bildirimleri ya da (phone) telefondan gelenler */
function WindowsList({ tabs, phone }: { tabs: React.ReactNode; phone: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory(phone ? "notify-phone" : "notify", scroller);
  const all = useNook((s) => s.notifications);
  const items = all.filter((n) => !!n.phone === phone);
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
          title={!on ? tt("Bildirimler kapalı") : !phone && readable === false ? tt("Bildirimleri okuyamıyorum") : tt("Bildirim yok")}
          hint={
            !on
              ? tt("Açınca Windows bildirimleri adada da görünür")
              : phone
                ? tt("Telefonundaki bildirimler burada birikir (Nook Mobil › Bildirimler)")
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

/** Uygulamanın adına göre sabit bir renk (Discord hep aynı renkte) */
const APP_COLORS = [ACCENT.purple, ACCENT.blue, ACCENT.green, ACCENT.pink, ACCENT.orange, ACCENT.teal, ACCENT.yellow, ACCENT.red];
const appColor = (app: string) => {
  const known: Record<string, string> = { discord: "#5865f2", whatsapp: "#25d366", telegram: "#2aabee", outlook: "#0a84ff", mail: "#0a84ff", gmail: "#ea4335", spotify: "#1ed760", steam: "#66c0f4", teams: "#6264a7", slack: "#e01e5a", instagram: "#e1306c" };
  const k = app.toLowerCase();
  const hit = Object.keys(known).find((x) => k.includes(x));
  if (hit) return known[hit];
  let h = 0;
  for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return APP_COLORS[h % APP_COLORS.length];
};

function Row({ n }: { n: NotifItem }) {
  const c = appColor(n.app);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="group relative flex items-start gap-2.5 rounded-[14px] border px-2.5 py-2"
      style={{ background: tintBg(c, 6), borderColor: tintBg(c, 18) }}
    >
      {n.icon ? (
        <img src={n.icon} alt="" draggable={false} className="mt-0.5 h-7 w-7 shrink-0 rounded-[8px] object-contain" />
      ) : (
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-[12px] font-extrabold" style={{ background: tintBg(c, 25), color: tintText(c) }}>
          {n.app.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-[12px] font-bold text-label">
            {n.title}
            <span className="ml-1.5 text-[10px] font-medium" style={{ color: tintText(c) }}>
              {n.app}
            </span>
          </span>
          <span className="shrink-0 text-[10px] tabular-nums text-label-3 transition-opacity group-hover:opacity-0">{ago(n.at)}</span>
        </div>
        {n.body && <p className="line-clamp-2 text-[11px] leading-snug text-label-2">{n.body}</p>}
      </div>
      <button
        onClick={() => useNook.getState().removeNotification(n.id)}
        title={tt("Kaldır")}
        className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-label-3 opacity-0 transition-opacity hover:bg-white/10 hover:text-label group-hover:opacity-100"
      >
        <X size={11} strokeWidth={2.6} />
      </button>
    </motion.div>
  );
}
