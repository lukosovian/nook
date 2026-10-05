import { useState } from "react";
import { motion } from "motion/react";
import { useArgus, weekStats } from "../../lib/argus";
import { dayKey, EMPTY_DAY, useNook, type DayStats } from "../../store/nook";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";

const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} sa${min % 60 ? ` ${min % 60} dk` : ""}` : `${min} dk`);
/** Dar kutucuklar için: "6,2 sa" */
const short = (min: number) => (min >= 60 ? `${(min / 60).toFixed(1).replace(".", ",").replace(",0", "")} sa` : `${min} dk`);

/** Son 7 gün (bugün dahil, eskiden yeniye) */
function lastWeek(days: Record<string, DayStats>) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { date: d, stats: { ...EMPTY_DAY, ...days[dayKey(d)] } };
  });
}

/** Notun parçası: neye bakıldı, kaç puan aldın, en fazla kaç */
interface Part {
  label: string;
  detail: string;
  pts: number;
  max: number;
}

/** Harf sınırları (100 üzerinden) */
const SCALE: { letter: string; min: number; meaning: string }[] = [
  { letter: "A", min: 80, meaning: "Çok iyi" },
  { letter: "B", min: 65, meaning: "İyi" },
  { letter: "C", min: 50, meaning: "Orta" },
  { letter: "D", min: 35, meaning: "Zayıf" },
  { letter: "E", min: 0, meaning: "Dağınık" },
];

/**
 * Haftalık not (100 üzerinden): odak, Pomodoro turları, Nook'la ilgilenme ve ruh hâli.
 * Oyun/müzik kötü sayılmaz; yalnızca odak süresinin iki katını aşacak kadar çoksa puan düşer.
 */
function grade(week: { stats: DayStats }[]) {
  const sum = (k: keyof DayStats) => week.reduce((a, d) => a + d.stats[k], 0);
  const activeDays = week.filter((d) => d.stats.active > 0).length || 1;
  const focusAvg = sum("focus") / activeDays;
  const mood = sum("moodN") ? sum("moodSum") / sum("moodN") : 60;
  const parts: Part[] = [
    { label: "Odak", detail: `günde ort. ${Math.round(focusAvg)} dk (60 dk = tam)`, pts: Math.min(35, focusAvg * 0.6), max: 35 },
    { label: "Pomodoro", detail: `${sum("pomodoros")} tur (14 tur = tam)`, pts: Math.min(20, sum("pomodoros") * 1.5), max: 20 },
    { label: "Nook'la ilgilenme", detail: `${sum("care")} kez (40 = tam)`, pts: Math.min(20, sum("care") * 0.5), max: 20 },
    { label: "Keyif", detail: `Nook'un ruh hâli ort. %${Math.round(mood)}`, pts: mood * 0.25, max: 25 },
  ];
  const penalty = sum("game") > sum("focus") * 2 && sum("game") > 300 ? 10 : 0;
  const pts = Math.max(0, parts.reduce((a, p) => a + p.pts, 0) - penalty);
  const letter = SCALE.find((x) => pts >= x.min)!.letter;
  const line =
    letter === "A"
      ? "Harika bir hafta, seninle gurur duyuyorum!"
      : letter === "B"
        ? "Gayet iyi gidiyorsun, biraz daha odak ve A senin."
        : letter === "C"
          ? "Fena değil. Birkaç Pomodoro turu her şeyi değiştirir."
          : "Bu hafta biraz dağınıktık. Pomodoro'dan bir tur başlatalım mı?";
  // En çok puan kaçan parça: oradan başlamak en çok işe yarar
  const weakest = [...parts].sort((x, y) => x.pts / x.max - y.pts / y.max)[0];
  return { letter, line, mood, pts: Math.round(pts), parts, penalty, weakest };
}

/** Karne: haftanın aktif süre grafiği + özet kutucukları + Nook'un notu. */
export function ReportPanel() {
  const days = useNook((s) => s.days);
  const watch = weekStats(useArgus((s) => s.snap));
  const week = lastWeek(days);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(60, ...week.map((d) => d.stats.active));
  const total = (k: keyof DayStats) => week.reduce((a, d) => a + d.stats[k], 0);
  const g = grade(week);
  const color = ACCENT.teal;
  const shown = hover ?? 6;
  const [explain, setExplain] = useState(false);

  return (
    <div className="flex h-full gap-3">
      {explain ? (
        <Breakdown g={g} onBack={() => setExplain(false)} />
      ) : (
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-label-2">Bilgisayar başında</span>
          {/* Seçili günün değeri (üzerine gelince o gün) */}
          <span className="text-[11px] tabular-nums text-label">
            {week[shown].date.toLocaleDateString("tr-TR", { weekday: "short" })} · {hm(week[shown].stats.active)}
          </span>
        </div>
        <div className="relative mt-2 flex min-h-0 flex-1 items-end gap-[6px] border-b border-white/[0.08] pb-px" onPointerLeave={() => setHover(null)}>
          {week.map((d, i) => {
            const h = (d.stats.active / max) * 100;
            return (
              <div key={i} className="flex h-full flex-1 cursor-default items-end" onPointerEnter={() => setHover(i)}>
                <motion.div
                  className="w-full rounded-t-[4px]"
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(d.stats.active ? 3 : 0, h)}%`, opacity: hover === null || hover === i ? 1 : 0.45 }}
                  transition={{ type: "spring", stiffness: 260, damping: 28, delay: i * 0.03 }}
                  style={{ background: color }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex gap-[6px]">
          {week.map((d, i) => (
            <span key={i} className={`flex-1 text-center text-[9.5px] ${i === shown ? "text-label-2" : "text-label-3"}`}>
              {d.date.toLocaleDateString("tr-TR", { weekday: "narrow" })}
            </span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          <Tile label="Odak" value={short(total("focus"))} />
          <Tile label="Müzik" value={short(total("music"))} />
          <Tile label="Oyun" value={short(total("game"))} />
          <Tile label="Pomodoro" value={`${total("pomodoros")} tur`} />
        </div>
      </div>
      )}

      <button
        onClick={() => setExplain((e) => !e)}
        title="Not nasıl hesaplandı?"
        className="flex w-[104px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[14px] bg-well px-2 text-center transition-colors hover:bg-well-hi"
      >
        <span className="text-[34px] font-semibold leading-none" style={{ color: tintText(color) }}>
          {g.letter}
        </span>
        <span className="text-[9.5px] tabular-nums text-label-3">{g.pts} / 100</span>
        <MiniNook color={color} size={22} eyes={g.letter <= "B" ? "happy" : "open"} />
        <p className="text-[10px] leading-snug text-label-2">{g.line}</p>
        <p className="text-[9.5px] text-label-3">Keyif ort. %{Math.round(g.mood)}</p>
        {watch && (watch.episodes > 0 || watch.movies > 0) && (
          <p className="text-[9.5px]" style={{ color: tintText(ACCENT.orange) }}>
            {[watch.episodes && `${watch.episodes} bölüm`, watch.movies && `${watch.movies} film`].filter(Boolean).join(", ")} izledin
          </p>
        )}
        <span className="text-[9.5px] font-medium" style={{ color: tintText(color) }}>
          {explain ? "‹ Grafiğe dön" : "Not ne demek? ›"}
        </span>
      </button>
    </div>
  );
}

/** Notun dökümü: her parçadan kaç puan, harf ölçeği ve en çok nereden kazanılır */
function Breakdown({ g, onBack }: { g: ReturnType<typeof grade>; onBack: () => void }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-label-2">Bu haftanın notu nasıl çıktı</span>
        <button onClick={onBack} className="text-[10px] text-label-3 hover:text-label">
          Kapat
        </button>
      </div>
      {g.parts.map((p) => (
        <div key={p.label}>
          <div className="flex items-baseline justify-between text-[10.5px]">
            <span className="text-label">
              {p.label} <span className="text-label-3">· {p.detail}</span>
            </span>
            <span className="tabular-nums text-label-2">
              {Math.round(p.pts)} / {p.max}
            </span>
          </div>
          <div className="mt-0.5 h-[5px] overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div className="h-full rounded-full" style={{ background: ACCENT.teal }} initial={{ width: 0 }} animate={{ width: `${(p.pts / p.max) * 100}%` }} />
          </div>
        </div>
      ))}
      {g.penalty > 0 && <p className="text-[10px]" style={{ color: tintText(ACCENT.red) }}>−{g.penalty}: oyun süresi odak süresinin iki katını geçti</p>}
      <div className="mt-0.5 flex gap-1">
        {SCALE.map((x) => (
          <span
            key={x.letter}
            className="flex-1 rounded-[8px] px-1 py-0.5 text-center text-[9.5px]"
            style={x.letter === g.letter ? { background: tintBg(ACCENT.teal, 24), color: tintText(ACCENT.teal) } : { background: "rgb(255 255 255 / 0.04)", color: "var(--color-label-3)" }}
          >
            <b>{x.letter}</b> {x.min}+
            <span className="block text-[9px] opacity-80">{x.meaning}</span>
          </span>
        ))}
      </div>
      <p className="text-[10px] leading-snug text-label-3">
        En kolay puan: <span className="text-label-2">{g.weakest.label}</span> ({Math.round(g.weakest.pts)}/{g.weakest.max}).
      </p>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-well px-2 py-1">
      <p className="text-[9.5px] text-label-3">{label}</p>
      <p className="truncate text-[11.5px] font-medium tabular-nums text-label">{value}</p>
    </div>
  );
}
