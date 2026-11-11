import { usePowerTimerFeed } from "./lib/powerTimer";
import { useSupportersFeed } from "./lib/supporters";
import { useEffect } from "react";
import { CHIP_NOOKS } from "./lib/look";
import { acceptImage, IMAGE_EVENT, prefetchBodies, warmLook } from "./lib/nook3d";
import { WARM_EVENT } from "./components/panels/LookPanel";
import { subscribe } from "./lib/bridge";
import type { Look } from "./lib/look";
import { figureRes } from "./components/mascot/Figure";
import { Island } from "./components/Island";
import { useUpdateCheck } from "./lib/update";
import { useArgusDetect, useArgusFeed } from "./lib/argus";
import { useClaudeFeed } from "./lib/claude";
import { useWhatsAppFeed } from "./lib/whatsapp";
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
import { usePhoneSync } from "./hooks/usePhoneSync";
import { useDiary } from "./lib/diary";
import { useAutomations } from "./lib/automations";
import { FREEZE_EVENT } from "./lib/log";
import { useNook } from "./store/nook";
import { tt } from "./lib/i18n";

export default function App() {
  useSettingsSync();
  usePhoneSync();
  useAutomations();
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
  usePowerTimerFeed();
  useStatsFeed();
  useDevicesFeed();
  useClaudeFeed();
  useWhatsAppFeed();
  useSupportersFeed();
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
  useDiary();
  useNotificationFeed();
  useVoiceFeed();
  useAskScreenFeed();
  useOnlineFeed();
  useGameFeed();
  usePlayOffers();
  useDailySummaryOpen();
  useChipPrefetch();
  useFreezeCard();
  useUpdateCheck();
  useArgusFeed();
  useArgusDetect();
  useOutings();
  useFocusGuard();

  return <Island />;
}

/** Ada takılıp geri gelince, günde en çok bir kez: dokununca geribildirim bölümü açılır (günlük eklenebilir) */
function useFreezeCard() {
  useEffect(() => {
    if (!isPrimary) return;
    const KEY = "nook-freeze-card";
    const on = (e: Event) => {
      const day = new Date().toDateString();
      try {
        if (localStorage.getItem(KEY) === day) return;
        localStorage.setItem(KEY, day);
      } catch {
        return;
      }
      useNook.getState().pushToast({
        kind: "alert",
        title: tt("Az önce {0} saniye takıldım", (e as CustomEvent<number>).detail),
        detail: tt("Dokun: günlükle birlikte geribildirim gönder"),
        studio: "settings:Geribildirim",
        ms: 9000,
      });
    };
    window.addEventListener(FREEZE_EVENT, on);
    return () => window.removeEventListener(FREEZE_EVENT, on);
  }, []);
}

/** Ana sayfa çiplerinin Nook'ları açılıştan biraz sonra arka planda çizilir — ada açılınca hazır olsunlar */
function useChipPrefetch() {
  useEffect(() => {
    const t = window.setTimeout(() => prefetchBodies(Object.values(CHIP_NOOKS).map((c) => ({ look: c.look, color: c.color, size: figureRes(22) }))), 4000);
    // Studio › Görünüm'de üstüne gelinen seçenek: adanın çizicisi de şimdiden derlesin, tıklayınca beklemesin
    const off = subscribe<Look>(WARM_EVENT, (look) => warmLook(look));
    // Studio'nun çizdiği büyük Nook: ada kendi derlemesini beklemeden onu gösterir
    const offImg = subscribe<{ key: string; url: string }>(IMAGE_EVENT, (m) => acceptImage(m.key, m.url));
    return () => {
      window.clearTimeout(t);
      off();
      offImg();
    };
  }, []);
}
