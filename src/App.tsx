import { useEffect } from "react";
import { CHIP_NOOKS } from "./lib/look";
import { prefetchBodies } from "./lib/nook3d";
import { figureRes } from "./components/mascot/Figure";
import { Island } from "./components/Island";
import { useUpdateCheck } from "./lib/update";
import { useArgusDetect, useArgusFeed } from "./lib/argus";
import { useAlarms } from "./hooks/useAlarms";
import { useAntics } from "./hooks/useAntics";
import { useCursorFeed } from "./hooks/useCursorFeed";
import { useFeeding } from "./hooks/useFeeding";
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
  useShelfRevalidation,
  useStatsFeed,
  useStorageSync,
} from "./hooks/useSystemFeeds";

export default function App() {
  useSettingsSync();
  useStorageSync();
  useCursorFeed();
  useIdleFeed();
  useClipboardFeed();
  useMediaFeed();
  useStatsFeed();
  useDevicesFeed();
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
  useIslandPosFeed();
  useFocusRelease();
  useFeeding();
  useAntics();
  useAlarms();
  useShelfRevalidation();
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

  return <Island />;
}

/** Ana sayfa çiplerinin Nook'ları açılıştan biraz sonra arka planda çizilir — ada açılınca hazır olsunlar */
function useChipPrefetch() {
  useEffect(() => {
    const t = window.setTimeout(() => prefetchBodies(Object.values(CHIP_NOOKS).map((c) => ({ look: c.look, color: c.color, size: figureRes(22) }))), 4000);
    return () => window.clearTimeout(t);
  }, []);
}
