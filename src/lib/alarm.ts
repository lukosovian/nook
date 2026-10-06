import { tt } from "./i18n";
/** Alarm zamanlaması. Tüm zamanlar yerel saat; `next` ms cinsinden bir sonraki çalma anı. */

export type Repeat = "once" | "daily" | "weekdays" | "weekend";

export interface Alarm {
  id: string;
  hour: number;
  minute: number;
  label: string;
  repeat: Repeat;
  enabled: boolean;
  /** Bir sonraki çalma anı (ms). Kapalıyken null. */
  next: number | null;
  /** "+5 dk" gibi tek seferlik ertelemelerde true — çaldıktan sonra silinir */
  oneShot?: boolean;
  /** Sessiz: çalınca yalnızca ada açılır, ses çıkmaz */
  silent?: boolean;
}

export const REPEAT_LABEL: Record<Repeat, string> = {
  once: tt("Bir kez"),
  daily: tt("Her gün"),
  weekdays: tt("Hafta içi"),
  weekend: tt("Hafta sonu"),
};

const dayOk = (repeat: Repeat, d: Date) => {
  const w = d.getDay(); // 0 pazar
  if (repeat === "weekdays") return w >= 1 && w <= 5;
  if (repeat === "weekend") return w === 0 || w === 6;
  return true;
};

/** `after` anından sonraki ilk çalma anı. */
export function nextFire(a: Pick<Alarm, "hour" | "minute" | "repeat">, after = Date.now()): number {
  const d = new Date(after);
  d.setSeconds(0, 0);
  d.setHours(a.hour, a.minute);
  for (let i = 0; i < 8; i++) {
    if (d.getTime() > after && dayOk(a.repeat, d)) return d.getTime();
    d.setDate(d.getDate() + 1);
    d.setHours(a.hour, a.minute, 0, 0);
  }
  return d.getTime();
}

export const pad = (n: number) => String(n).padStart(2, "0");
export const clock = (a: Pick<Alarm, "hour" | "minute">) => `${pad(a.hour)}:${pad(a.minute)}`;

/** "2 sa 13 dk sonra" */
export function until(ms: number, now = Date.now()) {
  const m = Math.max(0, Math.round((ms - now) / 60000));
  if (m < 1) return tt("1 dakikadan az");
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d >= 1) return tt("{0} gün {1} sa sonra", d, h % 24);
  return h ? tt("{0} sa {1} dk sonra", h, m % 60) : tt("{0} dk sonra", m);
}
