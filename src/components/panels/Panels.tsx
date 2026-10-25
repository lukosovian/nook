import { useEffect, useLayoutEffect, useState } from "react";
import { AnimatePresence, motion, PresenceContext } from "motion/react";
import { easeOut } from "../../lib/motion";
import { isLive, useNook, type Tab } from "../../store/nook";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { HomeBento } from "./Home";
import { ModulesGrid } from "./Modules";
import { MODULES, type Module } from "./moduleData";
import { AlarmPanel } from "./AlarmPanel";
import { HumPanel } from "./HumPanel";
import { CalendarPanel } from "./CalendarPanel";
import { RemindPanel } from "./RemindPanel";
import { ArgusPanel } from "./ArgusPanel";
import { ArchivePanel } from "./ArchivePanel";
import { AppsPanel } from "./AppsPanel";
import { FocusPanel } from "./FocusPanel";
import { NotifyPanel } from "./NotifyPanel";
import { PlayPanel } from "./PlayPanel";
import { openBrief } from "../../lib/brief";
import { openStudio } from "../../lib/studio";
import { ek, useNookName } from "../../lib/look";
import { tt } from "../../lib/i18n";
import { summaryDue } from "../../hooks/useFeatures";
import { ChatPanel } from "./ChatPanel";
import { ClipboardPanel } from "./ClipboardPanel";
import { ControlPanel } from "./ControlPanel";
import { DevicesPanel } from "./DevicesPanel";
import { Boundary } from "../ui/Boundary";
import { Frame } from "./Frame";
import { MediaPanel } from "./MediaPanel";
import { ScratchPanel } from "./ScratchPanel";
import { ShelfPanel } from "./ShelfPanel";
import { StatsPanel } from "./StatsPanel";
import { ClaudePanel } from "./ClaudePanel";
import { WhatsAppPanel } from "./WhatsAppPanel";

const PANEL: Record<Module, () => React.JSX.Element> = {
  chat: () => <ChatPanel />,
  media: MediaPanel,
  shelf: ShelfPanel,
  clip: ClipboardPanel,
  note: ScratchPanel,
  alarm: AlarmPanel,
  calendar: CalendarPanel,
  remind: RemindPanel,
  focus: FocusPanel,
  apps: AppsPanel,
  notify: NotifyPanel,
  play: PlayPanel,
  report: StudioRedirect,
  today: TodayRedirect,
  notes: StudioRedirect,
  archive: ArchivePanel,
  devices: DevicesPanel,
  control: ControlPanel,
  stats: StatsPanel,
  argus: ArgusPanel,
  look: StudioRedirect,
  settings: StudioRedirect,
  year: StudioRedirect,
  claude: ClaudePanel,
  whatsapp: WhatsAppPanel,
  hum: HumPanel,
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
  claude: "Claude Code",
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
  const grid = tab === "modules";
  const name = useNookName();
  const Active = home ? HomeBento : grid ? ModulesGrid : (PANEL[tab as Module] ?? HomeBento);
  const def = MODULES.find((m) => m.id === tab);

  return (
    <Frame
      view={home ? "home" : grid ? "modules" : "module"}
      title={home || grid ? undefined : tab === "chat" ? tt("{0} sohbet", ek(name, "la")) : TITLE[tab as Module]}
      color={def?.color ?? (tab === "chat" ? ACCENT.blue : undefined)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          className="flex h-full min-h-0 flex-col"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: easeOut }}
        >
          {/* AnimatePresence initial={false} ilk çizimdeki sekmeye "giriş animasyonu yok" der ve Motion bunu
              içerideki her öğeye geçirir: ada doğrudan bir sekmeyle açılınca (ya da tam ekrana geçince) o sekmede
              sonradan beliren her şey — önizlemeler, konfeti, kartlar — animasyonsuz son hâline atlıyordu. */}
          <PresenceContext.Provider value={null}>
            <Boundary resetKey={tab}>
              <LiveVeil tab={tab}>
                <Active />
              </LiveVeil>
            </Boundary>
          </PresenceContext.Provider>
        </motion.div>
      </AnimatePresence>
    </Frame>
  );
}

/** Yayındayken içeriği ekranda okunmasın diye buzlanan bölümler */
const LIVE_HIDDEN = new Set<Tab>(["note", "clip", "notify", "chat", "calendar", "remind", "claude", "whatsapp"]);

/** Yayın maskesi: hassas bölüm buzlu camın arkasında; "Bu sefer göster" ile o an açılır */
function LiveVeil({ tab, children }: { tab: Tab; children: React.ReactNode }) {
  const live = useNook(isLive);
  const [reveal, setReveal] = useState(false);
  useEffect(() => setReveal(false), [tab, live]);
  if (!live || !LIVE_HIDDEN.has(tab) || reveal) return <>{children}</>;
  return (
    <div className="relative h-full min-h-0">
      <div className="pointer-events-none h-full select-none" style={{ filter: "blur(14px) saturate(0.6)", opacity: 0.55 }} aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
        <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: tintBg(ACCENT.red, 20), color: tintText(ACCENT.red) }}>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: ACCENT.red }} />
          {tt("Canlı yayında gizli")}
        </span>
        <button onClick={() => setReveal(true)} className="rounded-full bg-white/[0.06] px-2.5 py-[3px] text-[10.5px] text-label-2 hover:bg-white/[0.12] hover:text-label">
          {tt("Bu sefer göster")}
        </button>
      </div>
    </div>
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

/** Ayarlar, görünüm, karne, yıl özeti ve yama notları Nook Studio'da (ayrı pencere) açılır */
const STUDIO_OF: Partial<Record<Tab, string>> = { settings: "settings", look: "look", report: "report", year: "year", notes: "notes" };
function StudioRedirect() {
  useLayoutEffect(() => {
    const s = useNook.getState();
    let section = STUDIO_OF[s.tab] ?? "home";
    // "Ayarlar › Kısayollar"a gönderildiyse o bölüme
    if (s.tab === "settings" && s.settingsJump) {
      section = `settings:${tt(s.settingsJump)}`;
      s.setSettingsJump(null);
    }
    s.setTab("home");
    openStudio(section);
  }, []);
  return <></>;
}

