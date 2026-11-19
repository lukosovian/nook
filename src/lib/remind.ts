/**
 * Hatırlatıcı metnini çözer: "çamaşır 20 dk", "1 saat 30 dk sonra ara", "toplantı 14:30", "yarın 21:00 sunum",
 * "12.05 fatura" (12 Mayıs), "cuma fatura", "her salı 10:00 ders", "hafta içi 9:00 ilaç".
 * Saf işlevler (içe aktarma yok): şimdi ve dil dışarıdan verilir, böylece tek başına denenebilir.
 */

export interface ParsedRemind {
  title: string;
  /** İlk çalacağı an (ms) */
  at: number;
  /** Tekrarlıysa çalacağı günler (0 pazar … 6 cumartesi) */
  days?: number[];
}

/** Bir dilin sözcükleri: küçük harfli düzenli ifade parçaları ("ı" yerine "i" yazılır, bkz. fold) */
interface Words {
  min: string;
  hour: string;
  /** "yarım saat" */
  half: string;
  /** Sürenin önündeki ("in") ve arkasındaki ("sonra") sözcük */
  before: string;
  after: string;
  /** Saatin önündeki sözcük: "saat 9" */
  at: string;
  tomorrow: string;
  today: string;
  morning: string;
  evening: string;
  every: string;
  daily: string;
  weekdays: string;
  weekend: string;
  /** "cuma günü"ndeki ek sözcük */
  dayWord: string;
  and: string;
  /** Uzun ad kısasından önce ("cumartesi" → "cuma") */
  week: [string, number][];
  months: string[];
  /** 12 saatlik yazım: "9am", "9:30 pm" */
  ampm?: boolean;
  /** Boş kutunun altındaki örnekler (bu dilde çözülebilen) */
  examples: string[];
}

const WORDS: Record<string, Words> = {
  tr: {
    min: "dk|dak|dakika",
    hour: "sa|saat",
    half: "yarim saat",
    before: "",
    after: "sonra",
    at: "saat",
    tomorrow: "yarin",
    today: "bug[üu]n",
    morning: "(?:bu )?sabah",
    evening: "(?:bu )?ak[şs]am",
    every: "her",
    daily: "her ?g[üu]n",
    weekdays: "hafta ?i[çc]i",
    weekend: "hafta ?sonu",
    dayWord: "g[üu]n[üu]",
    and: "ve",
    week: [["pazartesi", 1], ["sali", 2], ["[çc]ar[şs]amba", 3], ["per[şs]embe", 4], ["cumartesi", 6], ["cuma", 5], ["pazar", 0]],
    months: ["ocak", "[şs]ubat", "mart", "nisan", "mayis", "haziran", "temmuz", "a[ğg]ustos", "eyl[üu]l", "ekim", "kasim", "aralik"],
    examples: ["çay 5 dk", "yarın 9:00 sunum", "cuma fatura"],
  },
  en: {
    min: "m|min|mins|minute|minutes",
    hour: "h|hr|hrs|hour|hours",
    half: "half an hour",
    before: "in",
    after: "later|from now",
    at: "at",
    tomorrow: "tomorrow",
    today: "today",
    morning: "(?:this )?morning",
    evening: "(?:this )?evening|tonight",
    every: "every",
    daily: "every ?day|daily",
    weekdays: "(?:on |every )?weekdays?",
    weekend: "(?:on |every )?weekends?",
    dayWord: "",
    and: "and",
    week: [["mondays?", 1], ["tuesdays?", 2], ["wednesdays?", 3], ["thursdays?", 4], ["fridays?", 5], ["saturdays?", 6], ["sundays?", 0]],
    months: ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"],
    ampm: true,
    examples: ["tea 5 min", "tomorrow 9:00 demo", "friday bill"],
  },
};

const words = (lang: string) => WORDS[lang] ?? WORDS.en;

export const remindExamples = (lang: string) => words(lang).examples;

/** Küçük harf; ı/I/İ tek "i" (uzunluk değişmez, konumlar asıl metinle aynı kalır) */
const fold = (s: string) => s.toLocaleLowerCase("tr").replace(/ı/g, "i");

const day = (now: number, offset: number, h: number, m: number) => {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset, h, m).getTime();
};

/** "Yarın sabah" 09:00; gece 05:00'ten önce uyanınca gelen sabahtır (aynı takvim günü) */
export const tomorrowMorning = (now = Date.now()) => day(now, new Date(now).getHours() < 5 ? 0 : 1, 9, 0);

/** Seçili günlerde o saatin `now`dan sonraki ilk anı */
function nextOn(days: number[], h: number, m: number, now: number): number {
  for (let i = 0; i < 8; i++) {
    const t = day(now, i, h, m);
    if (t > now && days.includes(new Date(t).getDay())) return t;
  }
  return day(now, 1, h, m);
}

/** Metin ve an; zaman bulunamazsa null */
export function parseRemind(text: string, now = Date.now(), lang = "tr"): ParsedRemind | null {
  const w = words(lang);
  let work = fold(text);
  if (work.length !== text.length) work = text.toLowerCase();
  if (work.length !== text.length) return null;
  // Bulunan parça \0 ile örtülür: bir daha eşleşmez, başlıktan düşer, komşusuna sınır olur
  const cut = (re: string) => {
    const m = new RegExp(`(?:^|[\\s\\0])(?:${re})(?=[\\s\\0]|$)`, "u").exec(work);
    if (m) work = work.slice(0, m.index) + "\0".repeat(m[0].length) + work.slice(m.index + m[0].length);
    return m;
  };
  const title = () =>
    Array.from(text, (ch, i) => (work[i] === "\0" ? " " : ch))
      .join("")
      .replace(/\s+/g, " ")
      .trim();

  // Tekrar: "her gün", "hafta içi", "hafta sonu", "her salı (ve perşembe)"
  let days: number[] = [];
  if (cut(w.daily)) days = [0, 1, 2, 3, 4, 5, 6];
  else if (cut(w.weekdays)) days = [1, 2, 3, 4, 5];
  else if (cut(w.weekend)) days = [0, 6];
  else {
    const tail = w.dayWord ? `(?:\\s+(?:${w.dayWord}))?` : "";
    for (const [re, wd] of w.week) if (cut(`(?:${w.every})\\s+(?:${re})${tail}`)) days.push(wd);
    if (days.length) for (const [re, wd] of w.week) if (cut(`(?:(?:${w.and})\\s+)?(?:${re})${tail}`)) days.push(wd);
  }

  // Süre: "20 dk", "1 saat 30 dk sonra", "1,5 saat", "yarım saat" — hepsi toplanır
  if (!days.length) {
    let rel = 0;
    const before = w.before ? `(?:(?:${w.before})\\s+)?` : "";
    for (let i = 0; i < 4; i++) {
      const m = cut(`${before}(\\d{1,3}(?:[.,]\\d)?)\\s*(?:(${w.hour})|(${w.min}))(?:\\s+(?:${w.after}))?`);
      if (!m) break;
      rel += Number(m[1].replace(",", ".")) * (m[2] ? 60 : 1);
    }
    if (cut(`${before}(?:${w.half})(?:\\s+(?:${w.after}))?`)) rel += 30;
    if (rel > 0) return { title: title(), at: now + Math.round(rel) * 60_000 };
  }

  // Saat: "14:30", "saat 9", "saat 14.30", "9am"
  let time: [number, number] | null = null;
  const H = "([01]?\\d|2[0-3])";
  const M = "([0-5]\\d)";
  const at = `(?:(?:${w.at})\\s+)?`;
  const pm = (h: number, ap?: string) => (ap === "pm" && h < 12 ? h + 12 : ap === "am" && h === 12 ? 0 : h);
  let m = w.ampm ? cut(`${at}(1[0-2]|0?\\d)(?::${M})?\\s*(am|pm)`) : null;
  if (m) time = [pm(Number(m[1]), m[3]), Number(m[2] ?? 0)];
  if (!time && (m = cut(`${at}${H}:${M}`))) time = [Number(m[1]), Number(m[2])];
  if (!time && (m = cut(`(?:${w.at})\\s+${H}(?:\\.${M})?`))) time = [Number(m[1]), Number(m[2] ?? 0)];

  // Tarih: "12.05" (gün.ay), "12.05.2027", "12 mayıs"; ay olamayacaksa ("14.30") saat sayılır
  let date: [number, number, number | null] | null = null;
  if ((m = /(?:^|[\s\0])(\d{1,2})\.(\d{1,2})(?:\.(\d{4}|\d{2}))?(?=[\s\0]|$)/u.exec(work))) {
    const [d, mo] = [Number(m[1]), Number(m[2])];
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
      cut("\\d{1,2}\\.\\d{1,2}(?:\\.(?:\\d{4}|\\d{2}))?");
      date = [d, mo, m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : null];
    } else if (!time && !m[3] && (m = cut(`${H}\\.${M}`))) time = [Number(m[1]), Number(m[2])];
  }
  if (!date) {
    const mon = w.months.map((x) => `(${x})`).join("|");
    const find = (g: RegExpExecArray) => g.slice(2).findIndex(Boolean) + 1;
    if ((m = cut(`(\\d{1,2})\\s+(?:${mon})`))) date = [Number(m[1]), find(m), null];
    else if ((m = cut(`(?:${mon})\\s+(\\d{1,2})`))) date = [Number(m[13]), m.slice(1, 13).findIndex(Boolean) + 1, null];
  }

  const tomorrow = !!cut(w.tomorrow);
  const today = !tomorrow && !!cut(w.today);
  const evening = !!cut(w.evening);
  const morning = !evening && !!cut(w.morning);
  // Açık saat: yazılan saat ("akşam 8:00" → 20:00). Yoksa sabah 09:00 (akşam 20:00)
  const explicit = !!time;
  if (time && evening && time[0] < 12) time = [time[0] + 12, time[1]];
  const [h, mi] = time ?? (evening ? [20, 0] : [9, 0]);

  if (days.length) return { title: title(), at: nextOn(days, h, mi, now), days: [...new Set(days)].sort() };

  if (date) {
    const [d, mo, y] = date;
    const mk = (year: number) => new Date(year, mo - 1, d, h, mi);
    let t = mk(y ?? new Date(now).getFullYear());
    if (y === null && t.getTime() <= now) t = mk(t.getFullYear() + 1);
    if (t.getDate() !== d || t.getTime() <= now) return null;
    return { title: title(), at: t.getTime() };
  }

  // "salı 10:00 ders", "cuma günü fatura": o gün; bugünse ve saati geçtiyse haftaya
  for (const [re, wd] of w.week) {
    if (!cut(`(?:${re})${w.dayWord ? `(?:\\s+(?:${w.dayWord}))?` : ""}`)) continue;
    let off = (wd - new Date(now).getDay() + 7) % 7;
    if (off === 0 && day(now, 0, h, mi) <= now) off = 7;
    return { title: title(), at: day(now, off, h, mi) };
  }

  if (tomorrow) {
    // Saat yazıldıysa ertesi takvim günü (gece 02:00'de de); yazılmadıysa "yarın sabah" gibi
    const late = !explicit && new Date(now).getHours() < 5;
    return { title: title(), at: day(now, late ? 0 : 1, h, mi) };
  }
  if (!explicit && !evening && !morning) return null;
  let t = day(now, 0, h, mi);
  if (t <= now) {
    if (today) return null;
    t = day(now, 1, h, mi);
  }
  return { title: title(), at: t };
}
