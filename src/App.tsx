import { useEffect } from "react";
import { CHIP_NOOKS } from "./lib/look";
import { prefetchBodies } from "./lib/nook3d";
import { figureRes } from "./components/mascot/Figure";
import { Island } from "./components/Island";
import { useUpdateCheck } from "./lib/update";
import { useArgusDetect, useArgusFeed } from "./lib/argus";
import { useClaudeFeed } from "./lib/claude";
import { useAlarms } from "./hooks/useAlarms";
import { useTray } from "./hooks/useTray";
import { useHum } from "./hooks/useHum";
import { bootLock, useShieldMicFeed } from "./lib/lock";
import { isPrimary } from "./lib/bridge";
import { startSfx } from "./lib/sfx";
import { useAntics } from "./hooks/useAntics";
import { useCursorFeed } from "./hooks/useCursorFeed";
import { useFeeding } from "./hooks/useFeeding";
import { useFocusGuard, useOutings } from "./hooks/useOutings";
import { useCalendarFeed, useExtReminders } from "./hooks/useCalendarFeed";
import { useYearEnd } from "./components/panels/YearPanel";
import {
  useAskScreenFeed,
  useDayTracker,
  useFocusTimer,
  useGameFeed,
  useNotificationFeed,
  useOnlineFeed,
  useDailySummaryOpen,
  usePlayOffers,
  useVoiceFeed,
} from "./hooks/useFeatures";
import {
  useClipboardFeed,
  useAffection,
  useDevicesFeed,
  useDownloadsFeed,
  useFullscreenFeed,
  usePrivacyFeed,
  useWeatherFeed,
  useEventFeed,
  useFocusRelease,
  useIdleFeed,
  useMediaFeed,
  useOsdFeed,
  useRelocateFeed,
  useScreenshotFeed,
  useSearchFeed,
  useIslandPosFeed,
  useSettingsSync,
  useShelfFeed,
  useLiveFeed,
  useShelfRevalidation,
  useStatsFeed,
  useStorageSync,
} from "./hooks/useSystemFeeds";

export default function App() {
  useSettingsSync();
  useShieldMicFeed();
  // Bilgisayar yeni açıldıysa ve parola kilidi açıksa kalkanla başla
  useEffect(() => {
    if (isPrimary) void bootLock();
  }, []);
  // Arayüz sesleri
  useEffect(() => startSfx(), []);
  useStorageSync();
  useCursorFeed();
  useIdleFeed();
  useClipboardFeed();
  useMediaFeed();
  useStatsFeed();
  useDevicesFeed();
  useClaudeFeed();
  useFullscreenFeed();
  usePrivacyFeed();
  useDownloadsFeed();
  useWeatherFeed();
  useAffection();
  useEventFeed();
  useScreenshotFeed();
  useOsdFeed();
  useRelocateFeed();
  useSearchFeed();
  useTray();
  useIslandPosFeed();
  useFocusRelease();
  useFeeding();
  useAntics();
  useAlarms();
  useHum();
  useShelfRevalidation();
  useShelfFeed();
  useLiveFeed();
  useCalendarFeed();
  useExtReminders();
  useYearEnd();
  useFocusTimer();
  useDayTracker();
  useNotificationFeed();
  useVoiceFeed();
  useAskScreenFeed();
  useOnlineFeed();
  useGameFeed();
  usePlayOffers();
  useDailySummaryOpen();
  useChipPrefetch();
  useUpdateCheck();
  useArgusFeed();
  useArgusDetect();
  useOutings();
  useFocusGuard();

  return <Island />;
}

/** Ana sayfa çiplerinin Nook'ları açılıştan biraz sonra arka planda çizilir — ada açılınca hazır olsunlar */
function useChipPrefetch() {
  useEffect(() => {
    const t = window.setTimeout(() => prefetchBodies(Object.values(CHIP_NOOKS).map((c) => ({ look: c.look, color: c.color, size: figureRes(22) }))), 4000);
    return () => window.clearTimeout(t);
  }, []);
}
