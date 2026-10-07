/**
 * Takvim aboneliği: Google Takvim / Outlook'un "gizli iCal adresi" (.ics) okunur, etkinlikler
 * son 30 gün ile önümüzdeki 120 gün arasında açılır. Tekrarlayan etkinlikler (RRULE: günlük,
 * haftalık, aylık, yıllık; INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY), atlanan günler (EXDATE)
 * ve tek seferlik değişiklikler (RECURRENCE-ID) desteklenir. Salt okunur: Nook takvime yazmaz.
 */
import { fetchText } from "./bridge";
import { dayKey, type ExtEvent } from "../store/nook";

const PAST = 30 * 86_400_000;
const AHEAD = 120 * 86_400_000;
/** Bir serinin en fazla bu kadar tekrarı açılır (sonsuz döngüye karşı) */
const MAX_STEPS = 4000;

interface Prop {
  value: string;
  params: Record<string, string>;
}

interface Stamp {
  /** Başlangıç (ms) */
  at: number;
  allDay: boolean;
  /** Yerel saatle mi (TZID ya da "Z"siz) — tekrarlar duvar saatini korur */
  local: boolean;
  tz?: string;
}

/** Satır katlamasını aç, VEVENT'leri özellik haritası olarak döndür */
function parseEvents(text: string): Map<string, Prop[]>[] {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const out: Map<string, Prop[]>[] = [];
  let cur: Map<string, Prop[]> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = new Map();
    else if (line === "END:VEVENT") {
      if (cur) out.push(cur);
      cur = null;
    } else if (cur) {
      const colon = line.indexOf(":");
      if (colon < 0) continue;
      const [name, ...rest] = line.slice(0, colon).split(";");
      const params: Record<string, string> = {};
      for (const r of rest) {
        const [k, v] = r.split("=");
        if (k && v) params[k.toUpperCase()] = v.replace(/^"|"$/g, "");
      }
      const key = name.toUpperCase();
      cur.set(key, [...(cur.get(key) ?? []), { value: line.slice(colon + 1), params }]);
    }
  }
  return out;
}

/** Bir saat diliminin o andaki UTC farkı (ms); tanınmayan dilimde null */
function tzOffset(utc: number, tz: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(utc));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - utc;
  } catch {
    return null;
  }
}

/** Duvar saati (y, a, g, s, d) → ms; dilim tanınmazsa bu bilgisayarın saati */
function wallToMs(y: number, mo: number, d: number, h: number, mi: number, tz?: string): number {
  if (tz) {
    const guess = Date.UTC(y, mo, d, h, mi);
    const off = tzOffset(guess, tz);
    if (off !== null) {
      // Yaz saati geçişinde ikinci tahmin düzeltir
      const first = guess - off;
      const off2 = tzOffset(first, tz);
      return off2 !== null && off2 !== off ? guess - off2 : first;
    }
  }
  return new Date(y, mo, d, h, mi).getTime();
}

function parseStamp(p: Prop): Stamp | null {
  const m = p.value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, , z] = m;
  if (h === undefined || p.params.VALUE === "DATE") return { at: new Date(+y, +mo - 1, +d).getTime(), allDay: true, local: true };
  if (z) return { at: Date.UTC(+y, +mo - 1, +d, +h, +mi), allDay: false, local: false };
  const tz = p.params.TZID;
  return { at: wallToMs(+y, +mo - 1, +d, +h, +mi, tz), allDay: false, local: true, tz };
}

/** "PT1H30M", "P1D" → ms */
function parseDuration(v: string): number {
  const m = v.match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return 0;
  const [, sign, w, d, h, mi, s] = m;
  const ms = ((+(w ?? 0) * 7 + +(d ?? 0)) * 86_400 + +(h ?? 0) * 3600 + +(mi ?? 0) * 60 + +(s ?? 0)) * 1000;
  return sign === "-" ? -ms : ms;
}

const WEEKDAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/** Başlangıcın duvar saatinde, gün eklenmiş yeni an (yaz saatinde kaymaz) */
function shift(start: Stamp, y: number, mo: number, d: number): number {
  const base = new Date(start.at);
  if (start.allDay) return new Date(y, mo, d).getTime();
  if (!start.local) return Date.UTC(y, mo, d, base.getUTCHours(), base.getUTCMinutes());
  if (start.tz && tzOffset(start.at, start.tz) !== null) {
    const off = tzOffset(start.at, start.tz)!;
    const wall = new Date(start.at + off);
    return wallToMs(y, mo, d, wall.getUTCHours(), wall.getUTCMinutes(), start.tz);
  }
  return new Date(y, mo, d, base.getHours(), base.getMinutes()).getTime();
}

/** Başlangıcın (y, a, g)'si — dilimli ise o dilimin takvimine göre */
function ymd(start: Stamp): [number, number, number] {
  if (start.allDay || (start.local && !start.tz)) {
    const d = new Date(start.at);
    return [d.getFullYear(), d.getMonth(), d.getDate()];
  }
  const off = start.local && start.tz ? (tzOffset(start.at, start.tz) ?? 0) : 0;
  const d = new Date(start.at + off);
  return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
}

/** Ayın n'inci (eksi: sondan) haftanın günü */
function nthWeekday(y: number, mo: number, wd: number, n: number): number | null {
  if (n > 0) {
    const first = new Date(y, mo, 1).getDay();
    const day = 1 + ((wd - first + 7) % 7) + (n - 1) * 7;
    return day <= new Date(y, mo + 1, 0).getDate() ? day : null;
  }
  const last = new Date(y, mo + 1, 0);
  const day = last.getDate() - ((last.getDay() - wd + 7) % 7) + (n + 1) * 7;
  return day >= 1 ? day : null;
}

/** RRULE'a göre tekrarların başlangıçları (pencere içinde) */
function expand(start: Stamp, rule: string, exdates: Set<number>, from: number, to: number): number[] {
  const r: Record<string, string> = {};
  for (const part of rule.split(";")) {
    const [k, v] = part.split("=");
    if (k && v) r[k.toUpperCase()] = v;
  }
  const freq = r.FREQ;
  const interval = Math.max(1, Number(r.INTERVAL ?? 1));
  const count = r.COUNT ? Number(r.COUNT) : Infinity;
  const until = r.UNTIL ? (parseStamp({ value: r.UNTIL, params: {} })?.at ?? Infinity) : Infinity;
  const byDay = r.BYDAY ? r.BYDAY.split(",").map((x) => ({ n: Number(x.slice(0, -2)) || 0, wd: WEEKDAY[x.slice(-2)] })) : [];
  const byMonthDay = r.BYMONTHDAY ? r.BYMONTHDAY.split(",").map(Number) : [];
  const [y0, m0, d0] = ymd(start);

  const out: number[] = [];
  let seen = 0;
  const take = (at: number) => {
    if (at < start.at) return true;
    if (at > until || seen >= count) return false;
    seen++;
    if (at >= from && at <= to && !exdates.has(at)) out.push(at);
    return at <= to;
  };

  for (let k = 0; k < MAX_STEPS; k++) {
    let cands: number[] = [];
    if (freq === "DAILY") cands = [shift(start, y0, m0, d0 + k * interval)];
    else if (freq === "WEEKLY") {
      // Başlangıç haftasının pazartesisi + k hafta
      const mondayShift = (new Date(y0, m0, d0).getDay() + 6) % 7;
      const days = byDay.length ? byDay.map((b) => (b.wd + 6) % 7) : [mondayShift];
      cands = days.sort((a, b) => a - b).map((off) => shift(start, y0, m0, d0 - mondayShift + k * 7 * interval + off));
    } else if (freq === "MONTHLY") {
      const y = y0 + Math.floor((m0 + k * interval) / 12);
      const mo = (m0 + k * interval) % 12;
      const days = byDay.length
        ? byDay.flatMap((b) => {
            if (b.n) return [nthWeekday(y, mo, b.wd, b.n)].filter((x): x is number => x !== null);
            // Ayın her o günü
            const all: number[] = [];
            for (let n = 1; n <= 5; n++) {
              const d = nthWeekday(y, mo, b.wd, n);
              if (d !== null) all.push(d);
            }
            return all;
          })
        : byMonthDay.length
          ? byMonthDay.map((d) => (d > 0 ? d : new Date(y, mo + 1, 0).getDate() + d + 1))
          : [d0];
      const len = new Date(y, mo + 1, 0).getDate();
      cands = days.filter((d) => d >= 1 && d <= len).sort((a, b) => a - b).map((d) => shift(start, y, mo, d));
    } else if (freq === "YEARLY") {
      const y = y0 + k * interval;
      if (new Date(y, m0 + 1, 0).getDate() >= d0) cands = [shift(start, y, m0, d0)];
    } else return [start.at].filter((at) => at >= from && at <= to);

    for (const at of cands) if (!take(at)) return out;
  }
  return out;
}

/** Bir .ics metnini pencere içindeki etkinliklere çevirir */
export function parseIcs(text: string, feed: number, now = Date.now()): ExtEvent[] {
  const from = now - PAST;
  const to = now + AHEAD;
  const events = parseEvents(text);
  // Tek seferlik değişiklikler: aynı UID'nin o tekrarı yerine geçer
  const overridden = new Map<string, Set<number>>();
  for (const e of events) {
    const rid = e.get("RECURRENCE-ID")?.[0];
    const uid = e.get("UID")?.[0]?.value;
    const at = rid && parseStamp(rid)?.at;
    if (uid && at) overridden.set(uid, (overridden.get(uid) ?? new Set()).add(at));
  }

  const out: ExtEvent[] = [];
  for (const e of events) {
    if (e.get("STATUS")?.[0]?.value === "CANCELLED") continue;
    const startProp = e.get("DTSTART")?.[0];
    const start = startProp && parseStamp(startProp);
    if (!start) continue;
    const uid = e.get("UID")?.[0]?.value ?? "";
    const title = unescape(e.get("SUMMARY")?.[0]?.value ?? "") || "(Başlıksız)";
    const endProp = e.get("DTEND")?.[0];
    const end = endProp ? parseStamp(endProp)?.at : undefined;
    const dur = end !== undefined ? end - start.at : e.get("DURATION") ? parseDuration(e.get("DURATION")![0].value) : start.allDay ? 86_400_000 : 0;
    const rule = e.get("RRULE")?.[0]?.value;
    const isOverride = !!e.get("RECURRENCE-ID");
    const ex = new Set<number>([
      ...(e.get("EXDATE") ?? []).flatMap((p) => p.value.split(",").map((v) => parseStamp({ value: v, params: p.params })?.at ?? NaN)),
      ...(!isOverride ? (overridden.get(uid) ?? []) : []),
    ]);
    const starts = rule && !isOverride ? expand(start, rule, ex, from, to) : start.at >= from - dur && start.at <= to ? [start.at] : [];
    for (const at of starts) {
      const d = new Date(at);
      out.push({
        id: `${feed}-${uid}-${at}`,
        day: dayKey(d),
        time: start.allDay ? "" : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
        title,
        start: at,
        end: at + Math.max(0, dur),
        allDay: start.allDay,
      });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** iCal metin kaçışları: \n \, \; \\ */
function unescape(v: string) {
  return v.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
}

/** Bütün abonelikleri indir; biri hata verirse diğerleri yine gelir */
export async function syncFeeds(urls: string[]): Promise<{ events: ExtEvent[]; errors: string[] }> {
  const errors: string[] = [];
  const lists = await Promise.all(
    urls.map((url, i) =>
      fetchText(url)
        .then((text) => {
          if (!text.includes("BEGIN:VCALENDAR")) throw new Error("takvim değil");
          return parseIcs(text, i);
        })
        .catch((e) => {
          errors.push(`${url.slice(0, 40)}…: ${String(e)}`);
          return [] as ExtEvent[];
        }),
    ),
  );
  return { events: lists.flat().sort((a, b) => a.start - b.start), errors };
}
