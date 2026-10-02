import { Island } from "./components/Island";
import { useUpdateCheck } from "./lib/update";
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
  useUpdateCheck();

  return <Island />;
}
