import { dayKey, type CalEvent } from "../store/nook";

export interface Countdown {
  id: string;
  title: string;
  /** Kalan gün; 0 = bugün */
  days: number;
}

/** "Geri say" işaretli, günü gelmemiş etkinlikler (en yakını önde). Yalnızca çağrıldığında hesaplanır, sayaç tutmaz. */
export function nextCountdowns(events: CalEvent[], max = 3, now = new Date()): Countdown[] {
  const today = dayKey(now);
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return events
    .filter((e) => e.countdown && !e.reminder && e.day >= today)
    .map((e) => {
      const [y, m, d] = e.day.split("-").map(Number);
      return { id: e.id, title: e.title, days: Math.round((new Date(y, m - 1, d).getTime() - from) / 86_400_000) };
    })
    .sort((a, b) => a.days - b.days)
    .slice(0, max);
}
