import { tt } from "./i18n";
/** Alarm zamanlaması. Tüm zamanlar yerel saat; `next` ms cinsinden bir sonraki çalma anı. */

export type Repeat = "once" | "daily" | "weekdays" | "weekend" | "days";

export interface Alarm {
  id: string;
  hour: number;
  minute: number;
  label: string;
  repeat: Repeat;
  /** repeat === "days": çalacağı günler (0 pazar … 6 cumartesi) */
  days?: number[];
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
  days: tt("Seçili günler"),
};

/** İlaç alarmı mı (isminden): çalınca "Kapat" yerine "Aldım" der */
export function isMedicine(label: string): boolean {
  return /ila[çc]|hap\b|vitamin|insülin|medicine|pill/i.test(label);
}

/** Gün düğmeleri pazartesiden başlar; kısaltmalar getDay() sırasıyla (0 pazar) */
export const WEEK = [1, 2, 3, 4, 5, 6, 0];
export const DAY_SHORT = [tt("Pz"), tt("Pt"), tt("Sa"), tt("Ça"), tt("Pe"), tt("Cu"), tt("Ct")];

/** Tekrarın günleri (0 pazar); "Bir kez" boş */
export function daysOf(a: Pick<Alarm, "repeat" | "days">): number[] {
  if (a.repeat === "daily") return [0, 1, 2, 3, 4, 5, 6];
  if (a.repeat === "weekdays") return [1, 2, 3, 4, 5];
  if (a.repeat === "weekend") return [0, 6];
  if (a.repeat === "days") return a.days ?? [];
  return [];
}

/** Seçili günlerden tekrar: hiçbiri bir kez, hepsi her gün, hafta içi/sonu kendi adıyla */
export function repeatOf(days: number[]): Pick<Alarm, "repeat" | "days"> {
  const k = [...new Set(days)].sort().join("");
  if (!k) return { repeat: "once", days: undefined };
  if (k === "0123456") return { repeat: "daily", days: undefined };
  if (k === "12345") return { repeat: "weekdays", days: undefined };
  if (k === "06") return { repeat: "weekend", days: undefined };
  return { repeat: "days", days: k.split("").map(Number) };
}

/** Listede gösterilen tekrar: "Hafta içi" ya da "Sa, Pe" */
export function repeatText(a: Pick<Alarm, "repeat" | "days">) {
  return a.repeat === "days" ? WEEK.filter((d) => a.days?.includes(d)).map((d) => DAY_SHORT[d]).join(", ") : REPEAT_LABEL[a.repeat];
}

const dayOk = (a: Pick<Alarm, "repeat" | "days">, d: Date) => a.repeat === "once" || daysOf(a).includes(d.getDay());

/** `after` anından sonraki ilk çalma anı. */
export function nextFire(a: Pick<Alarm, "hour" | "minute" | "repeat" | "days">, after = Date.now()): number {
  const d = new Date(after);
  d.setSeconds(0, 0);
  d.setHours(a.hour, a.minute);
  for (let i = 0; i < 8; i++) {
    if (d.getTime() > after && dayOk(a, d)) return d.getTime();
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
