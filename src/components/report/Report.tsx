/**
 * Karnenin parçaları (Nook Studio › Karne): haftanın harf notu ve ölçeği, günlük grafik, notun parça parça
 * dökümü ve geçen haftaya göre değişen sayaçlar.
 */
import { useState } from "react";
import { motion } from "motion/react";
import type { weekStats } from "../../lib/argus";
import { easeOut } from "../../lib/motion";
import { dayKey, EMPTY_DAY, type DayStats } from "../../store/nook";
import { ACCENT, Card, tintBg, tintText } from "../ui/primitives";
import { dec, pct, tt, locale } from "../../lib/i18n";

export const hm = (min: number) => (min >= 60 ? tt("{0} sa", Math.floor(min / 60)) + (min % 60 ? tt(" {0} dk", Math.round(min % 60)) : "") : tt("{0} dk", Math.round(min)));
/** Dar kutucuklar için: "6,2 sa" */
const short = (min: number) => {
  const h = Math.round(min / 6) / 10;
  return min >= 60 ? tt("{0} sa", dec(h, h % 1 ? 1 : 0)) : tt("{0} dk", Math.round(min));
};

export type Day = { date: Date; stats: DayStats };

/** 7 günlük pencere (bugün dahil, eskiden yeniye); `back` hafta geriye kaydırır */
export function weekOf(days: Record<string, DayStats>, back = 0): Day[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i) - back * 7);
    return { date: d, stats: { ...EMPTY_DAY, ...days[dayKey(d)] } };
  });
}

export const sumOf = (week: Day[], k: keyof DayStats) => week.reduce((a, d) => a + d.stats[k], 0);

/** Notun parçası: neye bakıldı, kaç puan alındı, en fazla kaç */
interface Part {
  label: string;
  detail: string;
  pts: number;
  max: number;
  color: string;
  tip: string;
}

/** Harf sınırları (100 üzerinden) */
export const SCALE: { letter: string; min: number; meaning: string }[] = [
  { letter: "A", min: 80, meaning: tt("Çok iyi") },
  { letter: "B", min: 65, meaning: tt("İyi") },
  { letter: "C", min: 50, meaning: tt("Orta") },
  { letter: "D", min: 35, meaning: tt("Zayıf") },
  { letter: "E", min: 0, meaning: tt("Dağınık") },
];

export const LETTER_COLOR: Record<string, string> = { A: ACCENT.green, B: ACCENT.teal, C: ACCENT.yellow, D: ACCENT.orange, E: ACCENT.red };

/**
 * Haftalık not (100 üzerinden): Nook'la kaç gün, su, Nook'la ilgilenme ve ruh hâli.
 * Pomodoro'ya bakmaz (herkes kullanmıyor); oyun, müzik ve ekran süresi de kötü sayılmaz.
 */
export function grade(week: Day[]) {
  const activeDays = week.filter((d) => d.stats.active > 0).length;
  const waterAvg = sumOf(week, "water") / (activeDays || 1);
  const moodN = sumOf(week, "moodN");
  const mood = moodN ? sumOf(week, "moodSum") / moodN : 60;
  const parts: Part[] = [
    {
      label: tt("Birlikte geçen günler"),
      detail: tt("7 günün {0} günü · her gün = tam puan", activeDays),
      pts: activeDays * (20 / 7),
      max: 20,
      color: ACCENT.purple,
      tip: tt("Her gün biraz uğraman yeter."),
    },
    {
      label: tt("Su"),
      detail: tt("Günde ort. {0} bardak · 6 bardak = tam puan", dec(waterAvg, waterAvg % 1 ? 1 : 0)),
      pts: Math.min(25, waterAvg * (25 / 6)),
      max: 25,
      color: ACCENT.blue,
      tip: tt("Su hatırlatıcısı gelince bir bardak iç."),
    },
    {
      label: tt("Nook'la ilgilenme"),
      detail: tt("{0} kez sevdin, besledin, oynadın · 50 = tam puan", sumOf(week, "care")),
      pts: Math.min(25, sumOf(week, "care") * 0.5),
      max: 25,
      color: ACCENT.pink,
      tip: tt("Beni sev, dosya yedir ya da benimle bir oyun oyna."),
    },
    {
      label: tt("Keyif"),
      detail: tt("Ruh hâlim ortalama %{0}", Math.round(mood)),
      pts: mood * 0.3,
      max: 30,
      color: ACCENT.yellow,
      tip: tt("İlgilendikçe keyfim de yükselir."),
    },
  ];
  // Hiç açılmamış hafta: keyif varsayılanı puan getirmesin
  const pts = activeDays ? Math.round(parts.reduce((a, p) => a + p.pts, 0)) : 0;
  const scale = SCALE.find((x) => pts >= x.min)!;
  const line =
    scale.letter === "A"
      ? tt("Harika bir hafta, seninle gurur duyuyorum!")
      : scale.letter === "B"
        ? tt("Gayet iyi gidiyorsun, biraz daha su ve A senin.")
        : scale.letter === "C"
          ? tt("Fena değil. Biraz daha ilgi ve su her şeyi değiştirir.")
          : tt("Bu hafta biraz dağınıktık. Bir bardak su içip beni sevmeye ne dersin?");
  // En çok puan kaçan parça: oradan başlamak en çok işe yarar
  const weakest = [...parts].sort((x, y) => x.pts / x.max - y.pts / y.max)[0];
  return { ...scale, line, pts, parts, weakest, empty: activeDays === 0 };
}

/** Bu haftanın notu (Studio ana sayfası için) */
export const weekGrade = (days: Record<string, DayStats>, back = 0) => grade(weekOf(days, back));


/** Günlük grafik: çubuk = bilgisayar başında, içindeki dolu kısım = müzikle geçen. Üzerine gelince o günün dökümü. */
export function WeekChart({ week }: { week: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(60, ...week.map((d) => d.stats.active));
  const shown = hover ?? 6;
  const d = week[shown].stats;
  const total = sumOf(week, "active");
  const activeDays = week.filter((x) => x.stats.active > 0).length || 1;
  const facts = [
    [tt("Ekranda"), hm(d.active)],
    [tt("Müzik"), hm(d.music)],
    [tt("Oyun"), hm(d.game)],
    [tt("Su"), tt("{0} bardak", d.water)],
  ] as const;

  return (
    <Card className="flex h-full flex-col px-5 pb-4 pt-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-bold tracking-tight text-label">{tt("Bilgisayar başında")}</span>
        <span className="text-[12px] tabular-nums text-label-3">{tt("Toplam {0} · günde ort. {1}", short(total), hm(total / activeDays))}</span>
      </div>
      {/* Seçili gün (üzerine gelinen, yoksa bugün) */}
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[12px] tabular-nums">
        <span className="font-medium" style={{ color: tintText(ACCENT.teal) }}>
          {shown === 6 ? tt("Bugün") : week[shown].date.toLocaleDateString(locale(), { weekday: "long" })}
        </span>
        {facts.map(([k, v]) => (
          <span key={k} className="text-label-3">
            {k} <span className="text-label">{v}</span>
          </span>
        ))}
      </div>
      <div className="relative mt-2 flex min-h-0 flex-1 items-end gap-[8px] border-b border-white/[0.08] pb-px" onPointerLeave={() => setHover(null)}>
        {week.map((day, i) => {
          const h = (day.stats.active / max) * 100;
          const f = day.stats.active ? Math.min(1, day.stats.music / day.stats.active) * 100 : 0;
          const dim = hover !== null && hover !== i;
          return (
            <div key={i} className="flex h-full flex-1 cursor-default items-end" onPointerEnter={() => setHover(i)}>
              <motion.div
                className="relative w-full overflow-hidden rounded-t-[5px]"
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(day.stats.active ? 3 : 0, h)}%`, opacity: dim ? 0.4 : 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.15 + i * 0.03 }}
                style={{ background: tintBg(ACCENT.teal, 40) }}
              >
                <div className="absolute inset-x-0 bottom-0" style={{ height: `${f}%`, background: ACCENT.teal }} />
              </motion.div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-[8px]">
        {week.map((day, i) => (
          <span key={i} className={`flex-1 text-center text-[11px] ${i === shown ? "text-label-2" : "text-label-3"}`}>
            {day.date.toLocaleDateString(locale(), { weekday: "short" })}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-label-3">
        <span className="flex items-center gap-1">
          <i className="h-2 w-2 rounded-[2px]" style={{ background: tintBg(ACCENT.teal, 40) }} />
          {tt("Bilgisayar başında")}
        </span>
        <span className="flex items-center gap-1">
          <i className="h-2 w-2 rounded-[2px]" style={{ background: ACCENT.teal }} />
          {tt("Müzikle")}
        </span>
      </div>
    </Card>
  );
}

/** Notun dökümü: her parçadan kaç puan ve en kolay puanın nereden geleceği */
export function Breakdown({ g }: { g: ReturnType<typeof grade> }) {
  return (
    <Card className="flex h-full flex-col px-5 pb-4 pt-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-bold tracking-tight text-label">{tt("Not nasıl çıktı?")}</span>
        <span className="text-[12px] tabular-nums text-label-3">{g.pts} / 100</span>
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col justify-between gap-2">
        {g.parts.map((p, i) => (
          <div key={p.label}>
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-semibold text-label">{p.label}</span>
              <span className="tabular-nums text-label-2">
                {Math.round(p.pts)}
                <span className="text-label-3"> / {p.max}</span>
              </span>
            </div>
            <div className="mt-1 h-[7px] overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: p.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(p.pts / p.max) * 100}%` }}
                transition={{ duration: 0.6, ease: easeOut, delay: 0.25 + i * 0.06 }}
              />
            </div>
            <p className="mt-1 truncate text-[11px] leading-tight text-label-3" title={p.detail}>
              {p.detail}
            </p>
          </div>
        ))}
      </div>
      {/* En çok puan kaçan yer: oradan başlamak en çok işe yarar */}
      <div className="mt-3 flex shrink-0 items-center gap-2 rounded-[12px] px-3 py-2" style={{ background: tintBg(g.weakest.color, 12) }}>
        <p className="min-w-0 flex-1 text-[12px] leading-snug" style={{ color: tintText(g.weakest.color) }}>
          <b>{tt("En kolay puan: {0}.", g.weakest.label)}</b> {g.weakest.tip}
        </p>
      </div>
    </Card>
  );
}

interface TileData {
  label: string;
  value: string;
  color: string;
  /** Geçen haftaya göre değişim yüzdesi (null: kıyas yok) */
  change: number | null;
  /** Artış iyi mi (yeşil/kırmızı); değilse gri */
  good?: boolean;
}

export function tiles(week: Day[], prev: Day[], watch: ReturnType<typeof weekStats>): TileData[] {
  const ch = (k: keyof DayStats) => {
    const a = sumOf(week, k);
    const b = sumOf(prev, k);
    return b ? Math.round(((a - b) / b) * 100) : null;
  };
  const list: TileData[] = [
    { label: tt("Ekranda"), value: short(sumOf(week, "active")), color: ACCENT.teal, change: ch("active") },
    { label: tt("Birlikte geçen gün"), value: tt("{0} / 7", week.filter((d) => d.stats.active > 0).length), color: ACCENT.red, change: null },
    { label: tt("Su"), value: tt("{0} bardak", sumOf(week, "water")), color: ACCENT.blue, change: ch("water"), good: true },
    { label: tt("Müzik"), value: short(sumOf(week, "music")), color: ACCENT.pink, change: ch("music") },
    { label: tt("Oyun"), value: short(sumOf(week, "game")), color: ACCENT.purple, change: ch("game") },
    { label: tt("Nook'la ilgilenme"), value: tt("{0} kez", sumOf(week, "care")), color: ACCENT.yellow, change: ch("care"), good: true },
  ];
  if (watch && (watch.episodes > 0 || watch.movies > 0))
    list.push({ label: tt("İzlenen"), value: [watch.episodes && tt("{0} bölüm", watch.episodes), watch.movies && tt("{0} film", watch.movies)].filter(Boolean).join(", "), color: ACCENT.orange, change: null });
  else {
    const n = sumOf(week, "moodN");
    list.push({ label: tt("Keyfim"), value: pct(n ? Math.round(sumOf(week, "moodSum") / n) : 0), color: ACCENT.green, change: null });
  }
  list.splice(6, 0, { label: tt("Bildirim"), value: String(sumOf(week, "notifs")), color: ACCENT.gray, change: ch("notifs") });
  return list;
}

export function Tile({ label, value, color, change, good }: TileData) {
  const up = (change ?? 0) > 0;
  const tone = !change ? "var(--color-label-3)" : good ? tintText(up ? ACCENT.green : ACCENT.red) : "var(--color-label-3)";
  return (
    <div className="flex h-full min-h-0 flex-col justify-center rounded-[18px] border px-4 py-2.5" style={{ background: tintBg(color, 8), borderColor: tintBg(color, 22) }}>
      <p className="truncate text-[12px] font-semibold" style={{ color: tintText(color) }}>
        {label}
      </p>
      <p className="truncate font-round text-[21px] font-extrabold leading-tight tabular-nums text-label">{value}</p>
      <p className="truncate text-[11px] tabular-nums" style={{ color: tone }}>
        {change === null ? tt("bu hafta") : change === 0 ? tt("geçen haftayla aynı") : tt("{0} · geçen hafta", `${up ? "▲" : "▼"} %${Math.abs(change)}`)}
      </p>
    </div>
  );
}
