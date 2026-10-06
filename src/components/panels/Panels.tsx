import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Eye, EyeOff, SlidersHorizontal } from "lucide-react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { animate, AnimatePresence, motion, PresenceContext, useMotionValue } from "motion/react";
import { clock } from "../../lib/alarm";
import { mmss, PHASE_LABEL, remaining } from "../../lib/focus";
import { easeOut } from "../../lib/motion";
import { dayKey, useNook, type Tab } from "../../store/nook";
import { ACCENT, levelColor, MiniNook, tintBg, tintText } from "../ui/primitives";
import { AlarmPanel } from "./AlarmPanel";
import { ArgusPanel } from "./ArgusPanel";
import { ArchivePanel } from "./ArchivePanel";
import { ARGUS_BLUE } from "../ArgusPromo";
import { epLabel, todayEpisodes, useArgus, watching } from "../../lib/argus";
import { AppsPanel } from "./AppsPanel";
import { FocusPanel } from "./FocusPanel";
import { NotifyPanel } from "./NotifyPanel";
import { PlayPanel } from "./PlayPanel";
import { ReportPanel } from "./ReportPanel";
import { openBrief } from "../../lib/brief";
import { latestNote, openNotes } from "../../lib/notes";
import { CHIP_NOOKS, ek, useNookName } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { summaryDue } from "../../hooks/useFeatures";
import { ChatPanel } from "./ChatPanel";
import { ClipboardPanel } from "./ClipboardPanel";
import { ControlPanel } from "./ControlPanel";
import { DevicesPanel } from "./DevicesPanel";
import { Boundary } from "../ui/Boundary";
import { Frame } from "./Frame";
import { MediaPanel } from "./MediaPanel";
import { ScratchPanel } from "./ScratchPanel";
import { SettingsPanel } from "./SettingsPanel";
import { LookPanel } from "./LookPanel";
import { ShelfPanel } from "./ShelfPanel";
import { StatsPanel } from "./StatsPanel";
import { tt, locale } from "../../lib/i18n";

type Module = Exclude<Tab, "home">;

const MODULES: { id: Module; label: string; color: string }[] = [
  { id: "today", label: tt("Bugün"), color: ACCENT.yellow },
  { id: "media", label: tt("Medya"), color: ACCENT.pink },
  { id: "argus", label: "Argus", color: ARGUS_BLUE },
  { id: "focus", label: "Pomodoro", color: ACCENT.red },
  { id: "shelf", label: tt("Raf"), color: ACCENT.teal },
  { id: "clip", label: tt("Pano"), color: ACCENT.purple },
  { id: "note", label: tt("Not"), color: ACCENT.orange },
  { id: "alarm", label: tt("Alarm"), color: ACCENT.yellow },
  { id: "apps", label: tt("Kısayollar"), color: ACCENT.blue },
  { id: "notify", label: tt("Bildirimler"), color: ACCENT.purple },
  { id: "control", label: tt("Kontrol"), color: ACCENT.green },
  { id: "devices", label: "Lukonnect", color: ACCENT.blue },
  { id: "stats", label: tt("Sistem"), color: ACCENT.red },
  { id: "play", label: tt("Oyun"), color: ACCENT.pink },
  { id: "report", label: tt("Karne"), color: ACCENT.teal },
  { id: "look", label: tt("Görünüm"), color: ACCENT.pink },
  { id: "notes", label: tt("Yama notları"), color: ACCENT.orange },
];

/** Lukonnect bu bilgisayarda hiç yoksa (ör. arkadaşının bilgisayarı) Cihazlar bölümü gizlenir. */
export const hasLukonnect = (d: ReturnType<typeof useNook.getState>["devices"]) => !!(d && (d.lukonnect || d.mouse || d.headset || d.fan));

const PANEL: Record<Module, () => React.JSX.Element> = {
  chat: ChatPanel,
  media: MediaPanel,
  shelf: ShelfPanel,
  clip: ClipboardPanel,
  note: ScratchPanel,
  alarm: AlarmPanel,
  focus: FocusPanel,
  apps: AppsPanel,
  notify: NotifyPanel,
  play: PlayPanel,
  report: ReportPanel,
  today: TodayRedirect,
  notes: NotesRedirect,
  archive: ArchivePanel,
  devices: DevicesPanel,
  control: ControlPanel,
  stats: StatsPanel,
  argus: ArgusPanel,
  look: LookPanel,
  settings: SettingsPanel,
};

const TITLE = {
  ...Object.fromEntries(MODULES.map((m) => [m.id, m.label])),
  settings: tt("Ayarlar"),
  look: tt("Görünüm"),
  today: tt("Günün özeti"),
  notes: tt("Yama notları"),
  archive: tt("Arşivin içi"),
  report: tt("Haftalık karne"),
  argus: "Argus",
} as Record<Module, string>;

/**
 * Ada kapandıktan bu kadar sonra tekrar açılırsa baştan başlar: bir şey
 * çalıyorsa doğrudan medya, yoksa ana sayfa. Daha kısa sürede açılırsa
 * kalınan bölüm korunur — ama arada müzik/video başladıysa yine medyaya geçer.
 */
const RESET_AFTER_MS = 8000;
let closedAt = 0;
/** Kapanırken bir şey çalıyor muydu — sonradan başladıysa süreye bakmadan medyaya geç */
let playingAtClose = false;

/** Ada genişlediğinde: ana sayfa (modül çipleri) ya da seçili bölüm. */
export function Panels() {
  const tab = useNook((s) => s.tab);

  // Boyamadan önce karar ver ki ana sayfa bir kare bile görünmesin
  useLayoutEffect(() => {
    const s = useNook.getState();
    const playing = !!s.media?.playing;
    // "Ekrana sor" sohbeti zaten seçti
    if (s.pinned) {
      // dokunma
    } else if (summaryDue()) {
      // Günün ilk açılışı (kendiliğinden açılamadıysa): büyük özet
      void openBrief();
    } else if (s.pendingTab) {
      s.setTab(s.pendingTab);
      s.setPendingTab(null);
    } else if (playing && !playingAtClose) s.setTab("media");
    else if (Date.now() - closedAt > RESET_AFTER_MS) s.setTab(playing ? "media" : "home");
    return () => {
      closedAt = Date.now();
      playingAtClose = !!useNook.getState().media?.playing;
    };
  }, []);

  const home = tab === "home";
  const name = useNookName();
  const Active = home ? ModuleGrid : (PANEL[tab as Module] ?? ModuleGrid);

  return (
    <Frame view={home ? "home" : "module"} title={home ? undefined : tab === "chat" ? tt("{0} sohbet", ek(name, "la")) : TITLE[tab as Module]}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          className="flex h-full min-h-0 flex-col"
          initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -4, filter: "blur(3px)" }}
          transition={{ duration: 0.16, ease: easeOut }}
        >
          {/* AnimatePresence initial={false} ilk çizimdeki sekmeye "giriş animasyonu yok" der ve Motion bunu
              içerideki her öğeye geçirir: ada doğrudan bir sekmeyle açılınca (ya da tam ekrana geçince) o sekmede
              sonradan beliren her şey — önizlemeler, konfeti, kartlar — animasyonsuz son hâline atlıyordu. */}
          <PresenceContext.Provider value={null}>
            <Boundary resetKey={tab}>
              <Active />
            </Boundary>
          </PresenceContext.Provider>
        </motion.div>
      </AnimatePresence>
    </Frame>
  );
}

/** "Bugün" artık büyük adada açılır (bkz. Brief) — sekme seçilirse oraya yönlendir. */
function TodayRedirect() {
  useLayoutEffect(() => {
    useNook.getState().setTab("home");
    void openBrief();
  }, []);
  return <></>;
}

/** Yama notları da büyük adada açılır */
function NotesRedirect() {
  useLayoutEffect(() => {
    useNook.getState().setTab("home");
    void openNotes();
  }, []);
  return <></>;
}

/** Çipin hâli: meşgul (parlar), uyarı, sıradan, boş (soluk) */
type ChipState = "active" | "alert" | "idle" | "empty";
type Status = { text: string; state?: ChipState; soon?: boolean };

/** Kullanıcının dizdiği sıra; listede olmayan (yeni) bölümler sona eklenir */
function ordered(order: string[]) {
  const pos = new Map(order.map((id, i) => [id, i]));
  return [...MODULES].sort((a, b) => (pos.get(a.id) ?? 1000 + MODULES.indexOf(a)) - (pos.get(b.id) ?? 1000 + MODULES.indexOf(b)));
}

/** Ana sayfa: Grok Bot'taki renkli ajan çipleri gibi — her modül bir mini Nook, yanında canlı bilgi. */
function ModuleGrid() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("home", scroller);
  const setTab = useNook((s) => s.setTab);
  const lukonnect = useNook((s) => hasLukonnect(s.devices));
  const sub = useModuleStatus();
  const argus = useArgus((s) => !!s.snap);
  const promo = useNook((s) => s.settings.argusPromo);
  const order = useNook((s) => s.settings.homeOrder);
  const hidden = useNook((s) => s.settings.homeHidden);
  // Geliştirmede ?edit ile düzenleme kipi açık başlar (önizleme)
  const [editing, setEditing] = useState(() => import.meta.env.DEV && new URLSearchParams(location.search).has("edit"));
  // Sürüklerken sıra yerelde tutulur, bırakınca kaydedilir
  const [draft, setDraft] = useState<string[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const cells = useRef<Map<string, HTMLElement>>(new Map());
  // Sürüklenen kopya: imleci her karede izler (React yeniden çizilmez)
  const gx = useMotionValue(0);
  const gy = useMotionValue(0);
  const drag = useRef<{ id: string; dx: number; dy: number; slots: { x: number; y: number }[]; px: number; py: number; raf: number } | null>(null);

  const available = ordered(draft ?? order).filter((m) => (m.id !== "devices" || lukonnect) && (m.id !== "argus" || argus || promo));
  const modules = editing ? available : available.filter((m) => !hidden.includes(m.id));

  const toggleHidden = (id: string) => {
    const s = useNook.getState();
    const list = s.settings.homeHidden;
    s.updateSettings({ homeHidden: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
  };

  /** İmlecin kaydırılan içerikteki yeri */
  const local = (clientX: number, clientY: number) => {
    const el = scroller.current!;
    const r = el.getBoundingClientRect();
    // Tam ekranda içerik yakınlaştırılır (zoom): ekran px'ini içeriğin kendi px'ine çevir
    const k = el.offsetWidth ? r.width / el.offsetWidth : 1;
    return { x: (clientX - r.left) / k + el.scrollLeft, y: (clientY - r.top) / k + el.scrollTop };
  };

  // Kopyanın merkezine en yakın hücreye taşı (yalnızca sıra değişince yeniden çizilir)
  const retarget = () => {
    const d = drag.current;
    const el = cells.current.get(d?.id ?? "");
    if (!d || !el) return;
    const p = local(d.px, d.py);
    const cx = p.x - d.dx + el.offsetWidth / 2;
    const cy = p.y - d.dy + el.offsetHeight / 2;
    gx.set(p.x - d.dx);
    gy.set(p.y - d.dy);
    let best = 0;
    let bestD = Infinity;
    d.slots.forEach((s, i) => {
      const dist = Math.hypot(s.x + el.offsetWidth / 2 - cx, s.y + el.offsetHeight / 2 - cy);
      if (dist < bestD) {
        bestD = dist;
        best = i;
      }
    });
    setDraft((cur) => {
      const ids = cur ?? available.map((m) => m.id);
      if (ids.indexOf(d.id) === best) return cur ?? ids;
      const next = ids.filter((x) => x !== d.id);
      next.splice(best, 0, d.id);
      return next;
    });
  };

  // Kenara yaklaşınca liste kendiliğinden kayar
  const autoscroll = () => {
    const d = drag.current;
    const el = scroller.current;
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    const edge = 28;
    const v = d.py < r.top + edge ? -(r.top + edge - d.py) / 3 : d.py > r.bottom - edge ? (d.py - (r.bottom - edge)) / 3 : 0;
    if (v) {
      el.scrollTop += Math.max(-9, Math.min(9, v));
      retarget();
    }
    d.raf = requestAnimationFrame(autoscroll);
  };

  const onPointerDown = (id: string, e: React.PointerEvent<HTMLDivElement>) => {
    if (!editing || e.button !== 0) return;
    const el = e.currentTarget;
    const start = { x: e.clientX, y: e.clientY };
    const move = (ev: PointerEvent) => {
      if (!drag.current) {
        // Küçük titremeler sürükleme sayılmaz
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 4) return;
        const p = local(start.x, start.y);
        const ids = available.map((m) => m.id);
        drag.current = {
          id,
          dx: p.x - el.offsetLeft,
          dy: p.y - el.offsetTop,
          // Her sıra numarasının hücresi (ızgara sabit: sıra değişse de yerler aynı)
          slots: ids.map((cid) => {
            const c = cells.current.get(cid)!;
            return { x: c.offsetLeft, y: c.offsetTop };
          }),
          px: ev.clientX,
          py: ev.clientY,
          raf: 0,
        };
        gx.set(el.offsetLeft);
        gy.set(el.offsetTop);
        setDraft(ids);
        setDragId(id);
        drag.current.raf = requestAnimationFrame(autoscroll);
      }
      drag.current.px = ev.clientX;
      drag.current.py = ev.clientY;
      retarget();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const d = drag.current;
      if (!d) return;
      cancelAnimationFrame(d.raf);
      drag.current = null;
      // Kopya yerine süzülür, sonra kaybolur
      const target = cells.current.get(d.id);
      const done = () => {
        setDragId(null);
        setDraft((cur) => {
          if (cur) useNook.getState().updateSettings({ homeOrder: cur });
          return null;
        });
      };
      if (!target) return done();
      void animate(gx, target.offsetLeft, { type: "spring", stiffness: 520, damping: 38 });
      void animate(gy, target.offsetTop, { type: "spring", stiffness: 520, damping: 38 }).then(done);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const ghost = dragId ? modules.find((m) => m.id === dragId) : null;

  return (
    <div ref={scroller} className="relative -mr-1.5 grid h-full auto-rows-[41px] grid-cols-2 gap-1.5 overflow-y-auto pr-1.5" style={{ overflowAnchor: "none" }}>
      {modules.map((m, i) => {
        const st = sub[m.id];
        const state: ChipState = st?.state ?? "idle";
        const off = hidden.includes(m.id);
        const lifted = m.id === dragId;
        return (
          <motion.div
            key={m.id}
            ref={(el: HTMLDivElement | null) => {
              if (el) cells.current.set(m.id, el);
              else cells.current.delete(m.id);
            }}
            layout={editing ? "position" : false}
            transition={{ layout: { type: "spring", stiffness: 520, damping: 40 } }}
            onPointerDown={(e) => onPointerDown(m.id, e)}
            className={`relative min-w-0 ${editing ? "cursor-grab touch-none select-none" : ""}`}
          >
            {lifted ? (
              // Kalkan çipin yeri: kesik çizgili boş yuva
              <div className="h-full w-full rounded-full border border-dashed" style={{ borderColor: tintBg(m.color, 45), background: tintBg(m.color, 5) }} />
            ) : (
              <>
                {/* Meşgul bölüm kendi renginde yavaşça "nefes alır" */}
                {(state === "active" || state === "alert") && !editing && (
                  <motion.span
                    className="pointer-events-none absolute inset-0 rounded-full"
                    style={{ boxShadow: `0 0 16px -3px ${m.color}, inset 0 0 8px -4px ${m.color}` }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.25, 1, 0.25] }}
                    transition={{ duration: state === "alert" ? 1.2 : 2.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <Chip
                  m={m}
                  st={st}
                  state={state}
                  dim={editing && off}
                  editing={editing}
                  delay={Math.min(i, 8) * 0.02}
                  onClick={() => !editing && setTab(m.id)}
                />
                {editing && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => toggleHidden(m.id)}
                    title={off ? tt("Ana sayfada göster") : tt("Ana sayfada gizle")}
                    className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.08] text-label-2 hover:bg-white/[0.16] hover:text-label"
                  >
                    {off ? <EyeOff size={11} strokeWidth={2.4} /> : <Eye size={11} strokeWidth={2.4} />}
                  </button>
                )}
              </>
            )}
          </motion.div>
        );
      })}
      {/* Düzenle: sürükleyip sırala, istemediğini gizle */}
      <motion.button
        layout={editing ? "position" : false}
        onClick={() => setEditing((e) => !e)}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center justify-center gap-1.5 rounded-full border text-[11px] font-medium transition-colors ${
          editing ? "border-white/25 bg-white/[0.12] text-label" : "border-dashed border-white/[0.12] text-label-3 hover:border-white/25 hover:text-label-2"
        }`}
      >
        {editing ? <Check size={12} strokeWidth={2.6} /> : <SlidersHorizontal size={11} strokeWidth={2.4} />}
        {editing ? tt("Bitti") : tt("Düzenle")}
      </motion.button>
      {editing && <p className="col-span-2 -mt-0.5 px-2 text-center text-[10px] text-label-3">{tt("Sürükleyip sırala · göz simgesiyle gizle")}</p>}

      {/* Elde tutulan çip */}
      {ghost && (
        <motion.div
          className="pointer-events-none absolute left-0 top-0 z-30"
          style={{ x: gx, y: gy, width: cells.current.get(ghost.id)?.offsetWidth, height: 41 }}
          initial={{ scale: 1 }}
          animate={{ scale: 1.05, rotate: -1.5 }}
          transition={{ type: "spring", stiffness: 500, damping: 26 }}
        >
          <div className="h-full w-full rounded-full shadow-[0_10px_24px_-8px_rgba(0,0,0,0.9)]">
            <Chip m={ghost} st={sub[ghost.id]} state={sub[ghost.id]?.state ?? "idle"} dim={hidden.includes(ghost.id)} editing delay={0} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

/** Tek çip: renkli hap, solda giyinik Nook, yanında ad ve canlı bilgi */
function Chip({
  m,
  st,
  state,
  dim,
  editing,
  delay,
  onClick,
}: {
  m: (typeof MODULES)[number];
  st: Status | undefined;
  state: ChipState;
  dim: boolean;
  editing: boolean;
  delay: number;
  onClick?: () => void;
}) {
  const on = state === "active" || state === "alert";
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: dim ? 0.35 : state === "empty" ? 0.62 : 1, scale: 1 }}
      whileHover={editing ? undefined : { scale: 1.03 }}
      whileTap={editing ? undefined : { scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 30, delay }}
      className={`flex h-full w-full min-w-0 items-center gap-2 rounded-full border py-1 pl-1 text-left ${editing ? "pointer-events-none pr-8" : "pr-2.5"}`}
      style={{ background: tintBg(m.color, on ? 18 : state === "empty" ? 7 : 12), borderColor: tintBg(m.color, on ? 62 : state === "empty" ? 20 : 34) }}
    >
      <ChipNook id={m.id} color={m.color} state={state} soon={!!st?.soon} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[12px] font-medium" style={{ color: tintText(m.color) }}>
          {m.label}
        </span>
        {st?.text && <span className={`block truncate text-[10px] ${state === "active" ? "text-label-2" : "text-label-3"}`}>{st.text}</span>}
      </span>
    </motion.button>
  );
}

/**
 * Çipin Nook'u: bölümüne göre giyinmiş küçük 3B Nook. Hâline göre kıpırdar: meşgulse ritimle sallanır,
 * alarm yaklaşınca zıplar, boştayken ara sıra göz kırpar, boşsa uykulu bakar.
 */
function ChipNook({ id, color, state, soon }: { id: string; color: string; state: ChipState; soon: boolean }) {
  const c = CHIP_NOOKS[id];
  const blink = useRandomBlink(state !== "active");
  if (!c) return <MiniNook color={color} size={24} eyes={state === "alert" ? "closed" : "open"} />;
  const expression = blink ? "sleepy" : state === "empty" ? "drowsy" : state === "active" ? (id === "focus" ? "focused" : "happy") : state === "alert" ? "surprised" : "idle";
  const motionFor =
    soon || state === "alert"
      ? { animate: { y: [0, -4, 0, -2, 0] }, transition: { duration: 0.7, repeat: Infinity, repeatDelay: 1.1, ease: "easeOut" as const } }
      : state === "active"
        ? { animate: { y: [0, -1.6, 0], rotate: [-5, 5, -5] }, transition: { duration: id === "media" ? 0.9 : 2.2, repeat: Infinity, ease: "easeInOut" as const } }
        : { animate: { y: 0, rotate: 0 }, transition: { duration: 0.3 } };
  return (
    <motion.span className="relative flex h-[26px] w-[26px] shrink-0 items-center justify-center" {...motionFor}>
      <NookFigure look={c.look} color={c.color} size={22} expression={expression} />
    </motion.span>
  );
}

/** Rastgele aralıklarla bir an göz kırpar (çiplerin hepsi aynı anda kırpmasın) */
function useRandomBlink(on: boolean) {
  const [shut, setShut] = useState(false);
  useEffect(() => {
    if (!on) return;
    let t = 0;
    const loop = () => {
      t = window.setTimeout(() => {
        setShut(true);
        t = window.setTimeout(() => {
          setShut(false);
          loop();
        }, 160);
      }, 4000 + Math.random() * 9000);
    };
    loop();
    return () => window.clearTimeout(t);
  }, [on]);
  return on && shut;
}

/** Çiplerin altındaki canlı bilgi ve hâli. */
function useModuleStatus(): Partial<Record<Module, Status>> {
  const media = useNook((s) => s.media);
  const shelf = useNook((s) => s.shelf.length);
  const clips = useNook((s) => s.clips.length);
  const note = useNook((s) => s.note);
  const alarms = useNook((s) => s.alarms);
  const ringing = useNook((s) => !!s.ringing);
  const devices = useNook((s) => s.devices);
  const cpu = useNook((s) => s.stats?.cpu);
  const focus = useNook((s) => s.focus);
  const apps = useNook((s) => s.pinnedApps.length);
  const notifs = useNook((s) => s.notifications.length);
  const active = useNook((s) => s.days[dayKey()]?.active ?? 0);
  const argusSnap = useArgus((s) => s.snap);
  const newToday = todayEpisodes(argusSnap);
  const watchingList = watching(argusSnap);
  // Pomodoro ve alarm yakınlığı canlı aksın
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const next = alarms.filter((a) => a.enabled && a.next).sort((a, b) => a.next! - b.next!)[0];
  const alarmSoon = !!next && next.next! - now < 10 * 60_000;
  const batteries = [devices?.headset?.percent, devices?.mouse?.percent].filter((p): p is number => p != null);
  const lowest = batteries.length ? Math.min(...batteries) : null;
  const running = !!focus && focus.endsAt !== null;

  return {
    media: { text: media ? (media.playing ? media.title : tt("Duraklatıldı")) : tt("Sessiz"), state: media?.playing ? "active" : media ? "idle" : "empty" },
    shelf: { text: shelf ? tt("{0} öğe", shelf) : tt("Boş"), state: shelf ? "idle" : "empty" },
    clip: { text: clips ? tt("{0} kayıt", clips) : tt("Boş"), state: clips ? "idle" : "empty" },
    note: { text: note ? note.split("\n")[0] : tt("Boş"), state: note ? "idle" : "empty" },
    alarm: {
      text: next ? `${clock(next)}${next.label ? ` · ${next.label}` : ""}` : tt("Kurulu değil"),
      state: ringing ? "alert" : alarmSoon ? "active" : next ? "idle" : "empty",
      soon: alarmSoon || ringing,
    },
    devices: { text: lowest !== null ? tt("En düşük %{0}", lowest) : tt("Bilgi yok"), state: lowest !== null && lowest <= 15 ? "alert" : lowest === null ? "empty" : "idle" },
    control: { text: tt("Wi-Fi, ses, mikrofon") },
    stats: { text: cpu != null ? tt("İşlemci %{0}", Math.round(cpu)) : tt("Ölçülüyor"), state: cpu != null && levelColor(cpu, true) === ACCENT.red ? "alert" : "idle" },
    focus: { text: focus ? `${PHASE_LABEL[focus.phase]} · ${mmss(remaining(focus, now))}` : tt("Başlat"), state: running ? "active" : "idle" },
    apps: { text: apps ? tt("{0} kısayol", apps) : tt("Ekle"), state: apps ? "idle" : "empty" },
    notify: { text: notifs ? tt("{0} bildirim", notifs) : tt("Sessiz"), state: notifs ? "idle" : "empty" },
    play: { text: tt("5 mini oyun") },
    notes: { text: `${latestNote().version} · ${latestNote().headline}` },
    look: { text: tt("Kostüm, renk, şapka") },
    report: { text: active ? tt("Bugün {0}", active >= 60 ? tt("{0} sa {1} dk", Math.floor(active / 60), active % 60) : tt("{0} dk", active)) : tt("Bu hafta") },
    argus: {
      text: !argusSnap
        ? tt("Keşfet")
        : newToday.length
          ? tt("Bugün {0} {1}", newToday[0].item.title, epLabel(newToday[0].ep))
          : watchingList.length
            ? tt("{0} dizi izliyorsun", watchingList.length)
            : tt("Ne izlesem?"),
      state: newToday.length ? "active" : "idle",
    },
    today: { text: new Date().toLocaleDateString(locale(), { day: "numeric", month: "long", weekday: "short" }) },
  };
}
