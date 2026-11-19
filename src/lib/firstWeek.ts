/**
 * İlk hafta: Nook'un kullanıldığı ilk 7 gün ve o günlerin üç küçük görevi (dosya bırak, alarm kur, giydir).
 * Görevlerin bitip bitmediği mevcut kayıtlardan çıkarılır; ayrı bir bayrak tutulmaz.
 */
import { DEFAULT_SETTINGS, useNook, type Tab } from "../store/nook";
import { tt } from "./i18n";

/** Nook'un kullanıldığı ilk bu kadar gün "yeni gelen" sayılır */
export const FIRST_WEEK_DAYS = 7;

type State = ReturnType<typeof useNook.getState>;

export interface FirstWeekTask {
  id: "feed" | "alarm" | "look";
  title: string;
  hint: string;
  done: boolean;
  /** Görevin yapıldığı bölüm (openModule ile açılır; "look" Studio › Görünüm'e gider) */
  tab: Tab;
}

export const isFirstWeek = (s: State = useNook.getState()) => Object.keys(s.days).length <= FIRST_WEEK_DAYS;

export function firstWeekTasks(s: State = useNook.getState()): FirstWeekTask[] {
  const fed = s.shelf.length > 0 || Object.values(s.year).some((y) => y.feeds > 0);
  const dressed =
    !!s.settings.nookName ||
    s.settings.faceColor !== DEFAULT_SETTINGS.faceColor ||
    Object.entries(DEFAULT_SETTINGS.look).some(([k, v]) => (s.settings.look as unknown as Record<string, unknown>)[k] !== v);
  return [
    { id: "feed", title: tt("Bana bir dosya bırak"), hint: tt("Sürükleyip üstüme bırak, Raf'ta saklarım"), done: fed, tab: "shelf" },
    { id: "alarm", title: tt("Bir alarm kur"), hint: tt("Saatini seç, vakti gelince çalarım"), done: s.alarms.length > 0, tab: "alarm" },
    { id: "look", title: tt("Beni giydir"), hint: tt("Studio › Görünüm'de şapka, renk, gözlük"), done: dressed, tab: "look" },
  ];
}
