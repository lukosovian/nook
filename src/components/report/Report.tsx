/**
 * Karne — büyük ada. Solda Nook (adanın kendisi), haftanın harf notu, harf ölçeği ve geçen haftayla kıyas;
 * sağda günlük grafik, notun parça parça dökümü ve geçen haftaya göre değişen sayaçlar.
 */
import { useState } from "react";
import { motion } from "motion/react";
import { GraduationCap, Play, X } from "lucide-react";
import { useArgus, weekStats } from "../../lib/argus";
import { startFocus } from "../../lib/focus";
import { BRIEF } from "../../lib/layout";
import { easeOut } from "../../lib/motion";
import { closeReport } from "../../lib/report";
import { dayKey, EMPTY_DAY, useNook, type DayStats } from "../../store/nook";
import { ACCENT, Card, tintBg, tintText } from "../ui/primitives";
import { dec, tt, locale } from "../../lib/i18n";

const enter = (i: number) => ({
  initial: { opacity: 0, y: 10, filter: "blur(3px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.32, ease: easeOut, delay: 0.12 + i * 0.045 },
});

const hm = (min: number) => (min >= 60 ? tt("{0} sa", Math.floor(min / 60)) + (min % 60 ? tt(" {0} dk", Math.round(min % 60)) : "") : tt("{0} dk", Math.round(min)));
/** Dar kutucuklar için: "6,2 sa" */
const short = (min: number) => {
  const h = Math.round(min / 6) / 10;
  return min >= 60 ? tt("{0} sa", dec(h, h % 1 ? 1 : 0)) : tt("{0} dk", Math.round(min));
};

type Day = { date: Date; stats: DayStats };

/** 7 günlük pencere (bugün dahil, eskiden yeniye); `back` hafta geriye kaydırır */
function weekOf(days: Record<string, DayStats>, back = 0): Day[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i) - back * 7);
    return { date: d, stats: { ...EMPTY_DAY, ...days[dayKey(d)] } };
  });
}

const sumOf = (week: Day[], k: keyof DayStats) => week.reduce((a, d) => a + d.stats[k], 0);

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
const SCALE: { letter: string; min: number; meaning: string }[] = [
  { letter: "A", min: 80, meaning: tt("Çok iyi") },
  { letter: "B", min: 65, meaning: tt("İyi") },
  { letter: "C", min: 50, meaning: tt("Orta") },
  { letter: "D", min: 35, meaning: tt("Zayıf") },
  { letter: "E", min: 0, meaning: tt("Dağınık") },
];

const LETTER_COLOR: Record<string, string> = { A: ACCENT.green, B: ACCENT.teal, C: ACCENT.yellow, D: ACCENT.orange, E: ACCENT.red };

/**
 * Haftalık not (100 üzerinden): odak, Pomodoro turları, Nook'la ilgilenme ve ruh hâli.
 * Oyun/müzik kötü sayılmaz; yalnızca oyun odak süresinin iki katını (ve 5 saati) aşarsa 10 puan düşer.
 */
function grade(week: Day[]) {
  const activeDays = week.filter((d) => d.stats.active > 0).length;
  const focusAvg = sumOf(week, "focus") / (activeDays || 1);
  const moodN = sumOf(week, "moodN");
  const mood = moodN ? sumOf(week, "moodSum") / moodN : 60;
  const parts: Part[] = [
    {
      label: tt("Odak"),
      detail: tt("Günde ort. {0} odak · 60 dk = tam puan", hm(focusAvg)),
      pts: Math.min(35, focusAvg * (35 / 60)),
      max: 35,
      color: ACCENT.red,
      tip: tt("Her gün bir saat odaklanmak tam puan getirir."),
    },
    {
      label: "Pomodoro",
      detail: tt("{0} tur bitti · 14 tur = tam puan", sumOf(week, "pomodoros")),
      pts: Math.min(20, sumOf(week, "pomodoros") * (20 / 14)),
      max: 20,
      color: ACCENT.orange,
      tip: tt("Günde iki Pomodoro turu yeter."),
    },
    {
      label: tt("Nook'la ilgilenme"),
      detail: tt("{0} kez sevdin, besledin, oynadın · 40 = tam puan", sumOf(week, "care")),
      pts: Math.min(20, sumOf(week, "care") * 0.5),
      max: 20,
      color: ACCENT.pink,
      tip: tt("Beni sev, dosya yedir ya da benimle bir oyun oyna."),
    },
    {
      label: tt("Keyif"),
      detail: tt("Ruh hâlim ortalama %{0}", Math.round(mood)),
      pts: mood * 0.25,
      max: 25,
      color: ACCENT.yellow,
      tip: tt("İlgilendikçe keyfim de yükselir."),
    },
  ];
  const penalty = sumOf(week, "game") > sumOf(week, "focus") * 2 && sumOf(week, "game") > 300 ? 10 : 0;
  const pts = Math.round(Math.max(0, parts.reduce((a, p) => a + p.pts, 0) - penalty));
  const scale = SCALE.find((x) => pts >= x.min)!;
  const line =
    scale.letter === "A"
      ? tt("Harika bir hafta, seninle gurur duyuyorum!")
      : scale.letter === "B"
        ? tt("Gayet iyi gidiyorsun, biraz daha odak ve A senin.")
        : scale.letter === "C"
          ? tt("Fena değil. Birkaç Pomodoro turu her şeyi değiştirir.")
          : tt("Bu hafta biraz dağınıktık. Pomodoro'dan bir tur başlatalım mı?");
  // En çok puan kaçan parça: oradan başlamak en çok işe yarar
  const weakest = [...parts].sort((x, y) => x.pts / x.max - y.pts / y.max)[0];
  return { ...scale, line, pts, parts, penalty, weakest, empty: activeDays === 0 };
}

export function Report() {
  const days = useNook((s) => s.days);
  const focusing = useNook((s) => !!s.focus);
  const watch = weekStats(useArgus((s) => s.snap));
  const week = weekOf(days);
  const prev = weekOf(days, 1);
  const g = grade(week);
  const pg = grade(prev);
  const color = LETTER_COLOR[g.letter];
  const diff = g.pts - pg.pts;
  const best = [...week].sort((a, b) => b.stats.focus - a.stats.focus)[0];
  const range = `${week[0].date.toLocaleDateString(locale(), { day: "numeric", month: "short" })} – ${week[6].date.toLocaleDateString(locale(), { day: "numeric", month: "short" })}`;

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.12, duration: 0.25, ease: easeOut } }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
    >
      {/* Üst çubuk */}
      <div className="absolute inset-x-5 top-0 z-20 flex items-center justify-between" style={{ height: BRIEF.header }}>
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-label-2">
          <GraduationCap size={14} strokeWidth={2.2} style={{ color: tintText(ACCENT.teal) }} />
          {tt("Haftalık karne")}
          <span className="text-label-3">· {tt("son 7 gün")} · {range}</span>
        </span>
        <button
          onClick={closeReport}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-label-3 transition-colors hover:bg-well-hi hover:text-label"
        >
          {tt("Kapat")}
          <X size={12} strokeWidth={2.4} />
        </button>
      </div>

      {/* Kahraman kartı: Nook (adanın kendisi), harf notu, ölçek, Nook'un yorumu */}
      <motion.div className="absolute" style={{ left: BRIEF.hero.x, top: BRIEF.hero.y, width: BRIEF.hero.w, height: BRIEF.hero.h }} {...enter(0)}>
        <Card className="relative flex h-full w-full flex-col overflow-hidden px-4 pb-3.5" style={{ paddingTop: 124 }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[160px]" style={{ background: `radial-gradient(70% 90% at 50% 0%, ${tintBg(color, 22)} 0%, transparent 70%)` }} />

          <div className="relative flex items-center justify-center gap-3">
            <span className="font-display text-[50px] font-semibold leading-none tracking-[-0.03em]" style={{ color: tintText(color) }}>
              {g.letter}
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold text-label">{g.meaning}</span>
              <span className="block text-[11px] tabular-nums text-label-3">{tt("{0} / 100 puan", g.pts)}</span>
            </span>
          </div>

          {/* Harf ölçeği: hangi puan hangi harf */}
          <div className="relative mt-2.5 flex gap-1">
            {SCALE.map((x) => {
              const on = x.letter === g.letter;
              return (
                <span
                  key={x.letter}
                  className="flex-1 rounded-[8px] py-[3px] text-center text-[10px] leading-tight tabular-nums"
                  style={on ? { background: tintBg(color, 26), color: tintText(color) } : { background: "rgb(255 255 255 / 0.05)", color: "var(--color-label-3)" }}
                >
                  <b>{x.letter}</b>
                  <span className="block text-[9px] opacity-80">{x.min}+</span>
                </span>
              );
            })}
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center py-2">
            <p className="rounded-[14px] px-3 py-2 text-center text-[11.5px] leading-snug" style={{ background: tintBg(color, 10), color: tintText(color) }}>
              {g.empty ? tt("Bu hafta henüz seni pek görmedim. Biraz vakit geçirince karnen dolacak.") : g.line}
            </p>
          </div>

          <div className="relative shrink-0 space-y-1 text-[10.5px]">
            <Row label={tt("Geçen hafta")}>
              {pg.empty ? (
                <span className="text-label-3">{tt("Veri yok")}</span>
              ) : (
                <>
                  <span className="text-label-2">
                    {pg.letter} · {pg.pts}
                  </span>{" "}
                  <span style={{ color: diff > 0 ? tintText(ACCENT.green) : diff < 0 ? tintText(ACCENT.red) : "var(--color-label-3)" }}>
                    {diff > 0 ? `▲ ${diff}` : diff < 0 ? `▼ ${-diff}` : tt("aynı")}
                  </span>
                </>
              )}
            </Row>
            {best.stats.focus > 0 && (
              <Row label={tt("En odaklı gün")}>
                <span className="text-label-2">
                  {best.date.toLocaleDateString(locale(), { weekday: "long" })} · {hm(best.stats.focus)}
                </span>
              </Row>
            )}
            {watch && (watch.episodes > 0 || watch.movies > 0) && (
              <Row label={tt("İzlediklerin")}>
                <span style={{ color: tintText(ACCENT.orange) }}>
                  {[watch.episodes && tt("{0} bölüm", watch.episodes), watch.movies && tt("{0} film", watch.movies)].filter(Boolean).join(", ")}
                </span>
              </Row>
            )}
          </div>
        </Card>
      </motion.div>

      {/* İçerik: grafik + not dökümü, altında sayaçlar */}
      <div className="absolute flex flex-col gap-2.5" style={{ left: BRIEF.content.x, top: BRIEF.content.y, width: BRIEF.content.w, height: BRIEF.content.h }}>
        <div className="flex gap-2.5" style={{ height: 250 }}>
          <motion.div className="min-w-0 flex-1" {...enter(1)}>
            <WeekChart week={week} />
          </motion.div>
          <motion.div className="w-[250px] shrink-0" {...enter(2)}>
            <Breakdown g={g} focusing={focusing} />
          </motion.div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-4 gap-2.5" style={{ gridAutoRows: "1fr" }}>
          {tiles(week, prev, watch).map((t, i) => (
            <motion.div key={t.label} className="min-h-0" {...enter(3 + i)}>
              <Tile {...t} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 rounded-[10px] bg-well px-2.5 py-1">
      <span className="shrink-0 text-label-3">{label}</span>
      <span className="truncate text-right tabular-nums">{children}</span>
    </div>
  );
}

/** Günlük grafik: çubuk = bilgisayar başında, içindeki dolu kısım = odak. Üzerine gelince o günün dökümü. */
function WeekChart({ week }: { week: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(60, ...week.map((d) => d.stats.active));
  const shown = hover ?? 6;
  const d = week[shown].stats;
  const total = sumOf(week, "active");
  const activeDays = week.filter((x) => x.stats.active > 0).length || 1;
  const facts = [
    [tt("Ekranda"), hm(d.active)],
    [tt("Odak"), hm(d.focus)],
    ["Pomodoro", tt("{0} tur", d.pomodoros)],
    [tt("Müzik"), hm(d.music)],
    [tt("Oyun"), hm(d.game)],
  ] as const;

  return (
    <Card className="flex h-full flex-col px-3.5 pb-2.5 pt-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-medium text-label">{tt("Bilgisayar başında")}</span>
        <span className="text-[10.5px] tabular-nums text-label-3">{tt("Toplam {0} · günde ort. {1}", short(total), hm(total / activeDays))}</span>
      </div>
      {/* Seçili gün (üzerine gelinen, yoksa bugün) */}
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[10.5px] tabular-nums">
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
          const f = day.stats.active ? Math.min(1, day.stats.focus / day.stats.active) * 100 : 0;
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
          <span key={i} className={`flex-1 text-center text-[10px] ${i === shown ? "text-label-2" : "text-label-3"}`}>
            {day.date.toLocaleDateString(locale(), { weekday: "short" })}
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-[9.5px] text-label-3">
        <span className="flex items-center gap-1">
          <i className="h-2 w-2 rounded-[2px]" style={{ background: tintBg(ACCENT.teal, 40) }} />
          {tt("Bilgisayar başında")}
        </span>
        <span className="flex items-center gap-1">
          <i className="h-2 w-2 rounded-[2px]" style={{ background: ACCENT.teal }} />
          {tt("Odak")}
        </span>
      </div>
    </Card>
  );
}

/** Notun dökümü: her parçadan kaç puan, ceza ve en kolay puanın nereden geleceği */
function Breakdown({ g, focusing }: { g: ReturnType<typeof grade>; focusing: boolean }) {
  const focusTip = g.weakest.label === tt("Odak") || g.weakest.label === "Pomodoro";
  return (
    <Card className="flex h-full flex-col px-3.5 pb-2.5 pt-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-medium text-label">{tt("Not nasıl çıktı?")}</span>
        <span className="text-[10.5px] tabular-nums text-label-3">{g.pts} / 100</span>
      </div>
      <div className="mt-1 flex min-h-0 flex-1 flex-col gap-[5px]">
        {g.parts.map((p, i) => (
          <div key={p.label}>
            <div className="flex items-baseline justify-between text-[11px]">
              <span className="font-medium text-label">{p.label}</span>
              <span className="tabular-nums text-label-2">
                {Math.round(p.pts)}
                <span className="text-label-3"> / {p.max}</span>
              </span>
            </div>
            <div className="mt-[3px] h-[5px] overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: p.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(p.pts / p.max) * 100}%` }}
                transition={{ duration: 0.6, ease: easeOut, delay: 0.25 + i * 0.06 }}
              />
            </div>
            <p className="mt-[1px] truncate text-[9.5px] leading-tight text-label-3" title={p.detail}>
              {p.detail}
            </p>
          </div>
        ))}
        {g.penalty > 0 && (
          <p className="text-[9.5px] leading-tight" style={{ color: tintText(ACCENT.red) }}>
            {tt("−{0} puan: oyun süresi odak süresinin iki katını geçti", g.penalty)}
          </p>
        )}
      </div>
      {/* En çok puan kaçan yer: oradan başlamak en çok işe yarar */}
      <div className="mt-1.5 flex shrink-0 items-center gap-2 rounded-[10px] px-2 py-1" style={{ background: tintBg(g.weakest.color, 12) }}>
        <p className="min-w-0 flex-1 text-[10px] leading-snug" style={{ color: tintText(g.weakest.color) }}>
          <b>{tt("En kolay puan: {0}.", g.weakest.label)}</b> {g.weakest.tip}
        </p>
        {focusTip && !focusing && (
          <button
            onClick={() => {
              startFocus("work", 0);
              closeReport();
            }}
            title={tt("Pomodoro başlat")}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110"
            style={{ background: tintBg(g.weakest.color, 30), color: tintText(g.weakest.color) }}
          >
            <Play size={11} strokeWidth={2.6} fill="currentColor" />
          </button>
        )}
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

function tiles(week: Day[], prev: Day[], watch: ReturnType<typeof weekStats>): TileData[] {
  const ch = (k: keyof DayStats) => {
    const a = sumOf(week, k);
    const b = sumOf(prev, k);
    return b ? Math.round(((a - b) / b) * 100) : null;
  };
  const list: TileData[] = [
    { label: tt("Ekranda"), value: short(sumOf(week, "active")), color: ACCENT.teal, change: ch("active") },
    { label: tt("Odak"), value: short(sumOf(week, "focus")), color: ACCENT.red, change: ch("focus"), good: true },
    { label: "Pomodoro", value: tt("{0} tur", sumOf(week, "pomodoros")), color: ACCENT.orange, change: ch("pomodoros"), good: true },
    { label: tt("Su"), value: tt("{0} bardak", sumOf(week, "water")), color: ACCENT.blue, change: ch("water"), good: true },
    { label: tt("Müzik"), value: short(sumOf(week, "music")), color: ACCENT.pink, change: ch("music") },
    { label: tt("Oyun"), value: short(sumOf(week, "game")), color: ACCENT.purple, change: ch("game") },
    { label: tt("Nook'la ilgilenme"), value: tt("{0} kez", sumOf(week, "care")), color: ACCENT.yellow, change: ch("care"), good: true },
  ];
  if (watch && (watch.episodes > 0 || watch.movies > 0))
    list.push({ label: tt("İzlenen"), value: [watch.episodes && tt("{0} bölüm", watch.episodes), watch.movies && tt("{0} film", watch.movies)].filter(Boolean).join(", "), color: ACCENT.orange, change: null });
  else list.push({ label: tt("Bildirim"), value: String(sumOf(week, "notifs")), color: ACCENT.green, change: ch("notifs") });
  return list;
}

function Tile({ label, value, color, change, good }: TileData) {
  const up = (change ?? 0) > 0;
  const tone = !change ? "var(--color-label-3)" : good ? tintText(up ? ACCENT.green : ACCENT.red) : "var(--color-label-3)";
  return (
    <div className="flex h-full min-h-0 flex-col justify-center rounded-[16px] border px-3" style={{ background: tintBg(color, 8), borderColor: tintBg(color, 22) }}>
      <p className="truncate text-[10.5px]" style={{ color: tintText(color) }}>
        {label}
      </p>
      <p className="truncate font-display text-[16px] font-semibold leading-tight tabular-nums text-label">{value}</p>
      <p className="truncate text-[9.5px] tabular-nums" style={{ color: tone }}>
        {change === null ? tt("bu hafta") : change === 0 ? tt("geçen haftayla aynı") : tt("{0} · geçen hafta", `${up ? "▲" : "▼"} %${Math.abs(change)}`)}
      </p>
    </div>
  );
}
