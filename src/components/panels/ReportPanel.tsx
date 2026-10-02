import { useState } from "react";
import { motion } from "motion/react";
import { dayKey, EMPTY_DAY, useNook, type DayStats } from "../../store/nook";
import { ACCENT, MiniNook, tintText } from "../ui/primitives";

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

/**
 * Haftalık not: odak, mola dengesi, Nook'la ilgilenme ve ruh hâline göre.
 * Oyun/müzik kötü sayılmaz; yalnızca odak süresini aşacak kadar çoksa puan düşer.
 */
function grade(week: { stats: DayStats }[]) {
  const sum = (k: keyof DayStats) => week.reduce((a, d) => a + d.stats[k], 0);
  const activeDays = week.filter((d) => d.stats.active > 0).length || 1;
  const focusAvg = sum("focus") / activeDays;
  const mood = sum("moodN") ? sum("moodSum") / sum("moodN") : 60;
  let pts = 0;
  pts += Math.min(35, focusAvg * 0.6); // günde ~60 dk odak = tam puan
  pts += Math.min(20, sum("pomodoros") * 1.5);
  pts += Math.min(20, sum("care") * 0.5);
  pts += mood * 0.25;
  if (sum("game") > sum("focus") * 2 && sum("game") > 300) pts -= 10;
  const letter = pts >= 80 ? "A" : pts >= 65 ? "B" : pts >= 50 ? "C" : pts >= 35 ? "D" : "E";
  const line =
    letter === "A"
      ? "Harika bir hafta, seninle gurur duyuyorum!"
      : letter === "B"
        ? "Gayet iyi gidiyorsun, biraz daha odak ve A senin."
        : letter === "C"
          ? "Fena değil. Birkaç Pomodoro turu her şeyi değiştirir."
          : "Bu hafta biraz dağınıktık. Odak bölümünden bir tur başlatalım mı?";
  return { letter, line, mood };
}

/** Karne: haftanın aktif süre grafiği + özet kutucukları + Nook'un notu. */
export function ReportPanel() {
  const days = useNook((s) => s.days);
  const week = lastWeek(days);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(60, ...week.map((d) => d.stats.active));
  const total = (k: keyof DayStats) => week.reduce((a, d) => a + d.stats[k], 0);
  const g = grade(week);
  const color = ACCENT.teal;
  const shown = hover ?? 6;

  return (
    <div className="flex h-full gap-3">
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
          <Tile label="Tur" value={String(total("pomodoros"))} />
        </div>
      </div>

      <div className="flex w-[104px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[14px] bg-well px-2 text-center">
        <span className="text-[34px] font-semibold leading-none" style={{ color: tintText(color) }}>
          {g.letter}
        </span>
        <MiniNook color={color} size={22} eyes={g.letter <= "B" ? "happy" : "open"} />
        <p className="text-[10px] leading-snug text-label-2">{g.line}</p>
        <p className="text-[9.5px] text-label-3">Keyif ort. %{Math.round(g.mood)}</p>
      </div>
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
