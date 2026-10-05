import { useLayoutEffect, useRef } from "react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { AnimatePresence, motion, PresenceContext } from "motion/react";
import { clock } from "../../lib/alarm";
import { mmss, PHASE_LABEL, remaining } from "../../lib/focus";
import { easeOut } from "../../lib/motion";
import { dayKey, useNook, type Tab } from "../../store/nook";
import { ACCENT, levelColor, MiniNook, tintBg, tintText } from "../ui/primitives";
import { AlarmPanel } from "./AlarmPanel";
import { ArgusPanel } from "./ArgusPanel";
import { ARGUS_BLUE } from "../ArgusPromo";
import { epLabel, todayEpisodes, useArgus, watching } from "../../lib/argus";
import { AppsPanel } from "./AppsPanel";
import { FocusPanel } from "./FocusPanel";
import { NotifyPanel } from "./NotifyPanel";
import { PlayPanel } from "./PlayPanel";
import { ReportPanel } from "./ReportPanel";
import { openBrief } from "../../lib/brief";
import { latestNote, openNotes } from "../../lib/notes";
import { ek, useNookName } from "../../lib/look";
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

type Module = Exclude<Tab, "home">;

const MODULES: { id: Module; label: string; color: string }[] = [
  { id: "today", label: "Bugün", color: ACCENT.yellow },
  { id: "media", label: "Medya", color: ACCENT.pink },
  { id: "argus", label: "Argus", color: ARGUS_BLUE },
  { id: "focus", label: "Pomodoro", color: ACCENT.red },
  { id: "shelf", label: "Raf", color: ACCENT.teal },
  { id: "clip", label: "Pano", color: ACCENT.purple },
  { id: "note", label: "Not", color: ACCENT.orange },
  { id: "alarm", label: "Alarm", color: ACCENT.yellow },
  { id: "apps", label: "Kısayollar", color: ACCENT.blue },
  { id: "notify", label: "Bildirimler", color: ACCENT.purple },
  { id: "control", label: "Kontrol", color: ACCENT.green },
  { id: "devices", label: "Lukonnect", color: ACCENT.blue },
  { id: "stats", label: "Sistem", color: ACCENT.red },
  { id: "play", label: "Oyun", color: ACCENT.pink },
  { id: "report", label: "Karne", color: ACCENT.teal },
  { id: "look", label: "Görünüm", color: ACCENT.pink },
  { id: "notes", label: "Yama notları", color: ACCENT.orange },
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
  devices: DevicesPanel,
  control: ControlPanel,
  stats: StatsPanel,
  argus: ArgusPanel,
  look: LookPanel,
  settings: SettingsPanel,
};

const TITLE = {
  ...Object.fromEntries(MODULES.map((m) => [m.id, m.label])),
  settings: "Ayarlar",
  look: "Görünüm",
  today: "Günün özeti",
  notes: "Yama notları",
  report: "Haftalık karne",
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
    <Frame view={home ? "home" : "module"} title={home ? undefined : tab === "chat" ? `${ek(name, "la")} sohbet` : TITLE[tab as Module]}>
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

/** Ana sayfa: Grok Bot'taki renkli ajan çipleri gibi — her modül bir mini Nook, yanında canlı bilgi. */
function ModuleGrid() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("home", scroller);
  const setTab = useNook((s) => s.setTab);
  const lukonnect = useNook((s) => hasLukonnect(s.devices));
  const sub = useModuleStatus();
  const argus = useArgus((s) => !!s.snap);
  const promo = useNook((s) => s.settings.argusPromo);
  const modules = MODULES.filter((m) => (m.id !== "devices" || lukonnect) && (m.id !== "argus" || argus || promo));
  return (
    <div ref={scroller} className="-mr-1.5 grid h-full auto-rows-[41px] grid-cols-2 gap-1.5 overflow-y-auto pr-1.5">
      {modules.map((m, i) => (
        <motion.button
          key={m.id}
          onClick={() => setTab(m.id)}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 500, damping: 30, delay: Math.min(i, 8) * 0.02 }}
          className="flex min-w-0 items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 text-left"
          style={{ background: tintBg(m.color, 12), borderColor: tintBg(m.color, 34) }}
        >
          <MiniNook color={m.color} size={24} eyes={sub[m.id]?.alert ? "closed" : "open"} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[12px] font-medium" style={{ color: tintText(m.color) }}>
              {m.label}
            </span>
            {sub[m.id]?.text && <span className="block truncate text-[10px] text-label-3">{sub[m.id]!.text}</span>}
          </span>
        </motion.button>
      ))}
    </div>
  );
}

/** Çiplerin altındaki canlı bilgi. */
function useModuleStatus(): Partial<Record<Module, { text: string; alert?: boolean }>> {
  const media = useNook((s) => s.media);
  const shelf = useNook((s) => s.shelf.length);
  const clips = useNook((s) => s.clips.length);
  const note = useNook((s) => s.note);
  const alarms = useNook((s) => s.alarms);
  const devices = useNook((s) => s.devices);
  const cpu = useNook((s) => s.stats?.cpu);
  const focus = useNook((s) => s.focus);
  const apps = useNook((s) => s.pinnedApps.length);
  const notifs = useNook((s) => s.notifications.length);
  const active = useNook((s) => s.days[dayKey()]?.active ?? 0);
  const argusSnap = useArgus((s) => s.snap);
  const newToday = todayEpisodes(argusSnap);
  const watchingList = watching(argusSnap);

  const next = alarms.filter((a) => a.enabled && a.next).sort((a, b) => a.next! - b.next!)[0];
  const batteries = [devices?.headset?.percent, devices?.mouse?.percent].filter((p): p is number => p != null);
  const lowest = batteries.length ? Math.min(...batteries) : null;

  return {
    media: { text: media ? (media.playing ? media.title : "Duraklatıldı") : "Sessiz" },
    shelf: { text: shelf ? `${shelf} öğe` : "Boş" },
    clip: { text: clips ? `${clips} kayıt` : "Boş" },
    note: { text: note ? note.split("\n")[0] : "Boş" },
    alarm: { text: next ? `${clock(next)}${next.label ? ` · ${next.label}` : ""}` : "Kurulu değil" },
    devices: { text: lowest !== null ? `En düşük %${lowest}` : "Bilgi yok", alert: lowest !== null && lowest <= 15 },
    control: { text: "Wi-Fi, ses, mikrofon" },
    stats: { text: cpu != null ? `İşlemci %${Math.round(cpu)}` : "Ölçülüyor", alert: cpu != null && levelColor(cpu, true) === ACCENT.red },
    focus: { text: focus ? `${PHASE_LABEL[focus.phase]} · ${mmss(remaining(focus))}` : "Başlat" },
    apps: { text: apps ? `${apps} kısayol` : "Ekle" },
    notify: { text: notifs ? `${notifs} bildirim` : "Sessiz" },
    play: { text: "5 mini oyun" },
    notes: { text: `${latestNote().version} · ${latestNote().headline}` },
    look: { text: "Kostüm, renk, şapka" },
    report: { text: active ? `Bugün ${active >= 60 ? `${Math.floor(active / 60)} sa ${active % 60} dk` : `${active} dk`}` : "Bu hafta" },
    argus: {
      text: !argusSnap
        ? "Keşfet"
        : newToday.length
        ? `Bugün ${newToday[0].item.title} ${epLabel(newToday[0].ep)}`
        : watchingList.length
          ? `${watchingList.length} dizi izliyorsun`
          : "Ne izlesem?",
    },
    today: { text: new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "short" }) },
  };
}
