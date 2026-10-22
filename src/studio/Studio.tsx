/**
 * Nook Studio penceresi: solda bölümler, sağda seçili sayfa. Başlık çubuğu kendimizin (çerçevesiz pencere):
 * sürükleyince pencere taşınır, sağda küçült / büyüt / kapat.
 */
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Square, X } from "lucide-react";
import { NAV } from "./nav";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { inTauri } from "../lib/bridge";
import { normalizeColor, normalizeLook, useNookName } from "../lib/look";
import { latestNote } from "../lib/notes";
import { useStudioRoute, type StudioPage } from "../lib/studio";
import { useNook } from "../store/nook";
import { useStorageSync } from "../hooks/useSystemFeeds";
import { ContextMenu } from "../components/overlays/ContextMenu";
import { NookFigure } from "../components/mascot/Figure";
import { ACCENT, tintBg, tintText } from "../components/ui/primitives";
import { isTurkish, tt } from "../lib/i18n";
import { HomePage } from "./pages/HomePage";
import { LookPage } from "./pages/LookPage";
import { KeysPage } from "./pages/KeysPage";
import { ModulesPage } from "./pages/ModulesPage";
import { ReportPage } from "./pages/ReportPage";
import { YearPage } from "./pages/YearPage";
import { GamesPage } from "./pages/GamesPage";
import { NotesPage } from "./pages/NotesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NavIcon } from "./ui";
import { TourPage } from "./pages/TourPage";
import { ArgusPage } from "./pages/ArgusPage";
import { AquariumPage } from "./pages/AquariumPage";
import { useArgus, useArgusFeed } from "../lib/argus";
import { useUpdateCheck } from "../lib/update";

const PAGES: Record<StudioPage, (p: { arg: string | null }) => React.JSX.Element> = {
  home: HomePage,
  look: LookPage,
  keys: KeysPage,
  modules: ModulesPage,
  argus: ArgusPage,
  report: ReportPage,
  year: YearPage,
  games: GamesPage,
  notes: NotesPage,
  settings: SettingsPage,
  tour: TourPage,
  aquarium: AquariumPage,
};

export function Studio() {
  useStorageSync();
  // Sürüm numarası (Hakkında) ve Argus özeti bu pencerede de dursun
  useUpdateCheck();
  useArgusFeed();
  const root = useRef<HTMLDivElement>(null);
  const { page, arg, go } = useStudioRoute();
  // Pencere zemini (ada penceresinin şeffaf tuvali burada yok)
  useEffect(() => {
    document.documentElement.style.background = "#0e0e10";
    document.body.style.background = "#0e0e10";
    document.title = "Nook Studio";
  }, []);
  const Page = PAGES[page];
  return (
    <motion.div
      ref={root}
      className="flex h-full flex-col bg-[#0e0e10] text-label"
      initial={{ opacity: 0, scale: 0.985, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
    >
      <TitleBar page={page} />
      <div className="flex min-h-0 flex-1">
        <Sidebar page={page} go={go} />
        <main className="relative min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${page}:${arg ?? ""}`}
              className="absolute inset-0 overflow-y-auto"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <Page arg={arg} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <ContextMenu bounds={root} refreshOnly />
    </motion.div>
  );
}

/** Kendi başlık çubuğumuz: sürükleyince pencere taşınır, çift tıkla büyür */
function TitleBar({ page }: { page: StudioPage }) {
  const win = inTauri ? getCurrentWindow() : null;
  const nav = NAV.find((n) => n.id === page) ?? { label: tt("Nook'u tanı") };
  return (
    <div data-tauri-drag-region onDoubleClick={() => void win?.toggleMaximize()} className="flex h-11 shrink-0 items-center gap-3 border-b border-white/[0.05] pl-4">
      <StudioMark />
      <span data-tauri-drag-region className="text-[13px] font-extrabold tracking-tight">
        Nook <span style={{ color: tintText(ACCENT.purple) }}>Studio</span>
      </span>
      <span data-tauri-drag-region className="text-[11.5px] text-label-3">
        / <span className="text-label-2">{nav.label}</span>
      </span>
      <div data-tauri-drag-region className="h-full flex-1" />
      <div className="flex h-full items-stretch">
        <WinButton label={tt("Küçült")} onClick={() => void win?.minimize()}>
          <Minus size={14} />
        </WinButton>
        <WinButton label={tt("Büyüt")} onClick={() => void win?.toggleMaximize()}>
          <Square size={11} />
        </WinButton>
        <WinButton label={tt("Kapat")} onClick={() => void win?.close()} danger>
          <X size={15} />
        </WinButton>
      </div>
    </div>
  );
}

function WinButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className={`flex w-12 items-center justify-center text-label-2 transition-colors ${danger ? "hover:bg-[#e5484d] hover:text-white" : "hover:bg-white/[0.07] hover:text-label"}`}>
      {children}
    </button>
  );
}

/** Başlıktaki küçük Nook: senin Nook'un */
function StudioMark() {
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  return (
    <span data-tauri-drag-region className="relative flex h-7 w-7 items-center justify-center rounded-[9px]" style={{ background: tintBg(ACCENT.purple, 18) }}>
      <NookFigure look={look} color={color} size={20} />
    </span>
  );
}

function Sidebar({ page, go }: { page: StudioPage; go: (p: StudioPage) => void }) {
  const name = useNookName();
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  const affection = useNook((s) => s.affection);
  // Argus bu bilgisayarda yoksa yalnızca Türkçede (tanıtımı için) görünür
  const argus = useArgus((s) => !!s.snap) || isTurkish;
  return (
    <nav className="flex w-[232px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-white/[0.05] bg-white/[0.015] px-3 py-4">
      {NAV.filter((n) => (n.id !== "argus" || argus) && (n.id !== "aquarium" || page === "aquarium")).map((n) => {
        const on = n.id === page;
        return (
          <motion.button
            key={n.id}
            onClick={() => go(n.id)}
            whileTap={{ scale: 0.98 }}
            className={`relative flex items-center gap-3 rounded-[13px] px-2.5 py-2 text-left transition-colors ${on ? "" : "hover:bg-white/[0.04]"}`}
          >
            {on && (
              <motion.span
                layoutId="studio-nav"
                className="absolute inset-0 rounded-[13px] border"
                style={{ background: tintBg(n.color, 14), borderColor: tintBg(n.color, 34) }}
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
            <span className="relative">
              <NavIcon icon={n.icon} color={n.color} on={on} />
            </span>
            <span className="relative min-w-0 leading-tight">
              <span className={`block truncate text-[13px] font-semibold ${on ? "text-label" : "text-label-2"}`}>{n.label}</span>
              <span className="block truncate text-[10.5px] text-label-3">{n.hint}</span>
            </span>
          </motion.button>
        );
      })}
      <div className="flex-1" />
      {/* Altta senin Nook'un; sürüm de bu kutunun içinde */}
      <div className="flex items-center gap-2.5 rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]" style={{ background: tintBg(color, 16) }}>
          <NookFigure look={look} color={color} size={30} expression={affection > 80 ? "happy" : "idle"} />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="flex items-baseline gap-1.5">
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-label">{name}</span>
            <button
              onClick={() => go("notes")}
              title={tt("Yama notları")}
              className="shrink-0 rounded-[6px] px-1 py-[1px] text-[10px] font-semibold tabular-nums text-label-3 transition-colors hover:bg-white/[0.06] hover:text-label-2"
            >
              v{latestNote().version}
            </button>
          </span>
          <span className="mt-1 block h-[4px] overflow-hidden rounded-full bg-white/[0.07]" title={tt("Keyfi %{0}", Math.round(affection))}>
            <span className="block h-full rounded-full" style={{ width: `${Math.max(3, affection)}%`, background: `linear-gradient(90deg, ${ACCENT.pink}, ${ACCENT.yellow})` }} />
          </span>
        </span>
      </div>
    </nav>
  );
}
