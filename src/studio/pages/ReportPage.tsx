/** Studio › Karne: haftanın harf notu (geri haftalara bakılabilir), grafik, döküm, sayaçlar, 8 haftalık gidişat */
import { useState } from "react";
import { motion } from "motion/react";
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { useArgus, weekStats } from "../../lib/argus";
import { useNook } from "../../store/nook";
import { normalizeColor, normalizeLook } from "../../lib/look";
import { NookFigure } from "../../components/mascot/Figure";
import { ACCENT, tintBg, tintText } from "../../components/ui/primitives";
import { Breakdown, grade, hm, LETTER_COLOR, SCALE, Tile, tiles, WeekChart, weekOf } from "../../components/report/Report";
import { locale, tt } from "../../lib/i18n";
import { Page, PageHeader, Panel } from "../ui";

const WEEKS = 8;

export function ReportPage() {
  const days = useNook((s) => s.days);
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  const watch = weekStats(useArgus((s) => s.snap));
  const [back, setBack] = useState(0);
  const week = weekOf(days, back);
  const prev = weekOf(days, back + 1);
  const g = grade(week);
  const pg = grade(prev);
  const c = LETTER_COLOR[g.letter];
  const diff = g.pts - pg.pts;
  const best = [...week].sort((a, b) => b.stats.active - a.stats.active)[0];
  const range = `${week[0].date.toLocaleDateString(locale(), { day: "numeric", month: "short" })} – ${week[6].date.toLocaleDateString(locale(), { day: "numeric", month: "short" })}`;
  const history = Array.from({ length: WEEKS }, (_, i) => ({ back: WEEKS - 1 - i, g: grade(weekOf(days, WEEKS - 1 - i)) }));

  return (
    <Page wide>
      <PageHeader
        icon={BarChart3}
        color={ACCENT.teal}
        title={tt("Haftalık karne")}
        subtitle={back === 0 ? tt("Son 7 gün · {0}", range) : tt("{0} hafta önce · {1}", back, range)}
        actions={
          <div className="flex items-center gap-1 rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-1">
            <button onClick={() => setBack((b) => Math.min(WEEKS - 1, b + 1))} disabled={back >= WEEKS - 1} className="flex h-7 w-7 items-center justify-center rounded-[9px] text-label-2 hover:bg-white/[0.07] disabled:opacity-30" title={tt("Önceki hafta")}>
              <ChevronLeft size={15} />
            </button>
            <span className="min-w-[86px] text-center text-[12px] font-semibold text-label-2">{back === 0 ? tt("Bu hafta") : tt("{0} hafta önce", back)}</span>
            <button onClick={() => setBack((b) => Math.max(0, b - 1))} disabled={back === 0} className="flex h-7 w-7 items-center justify-center rounded-[9px] text-label-2 hover:bg-white/[0.07] disabled:opacity-30" title={tt("Sonraki hafta")}>
              <ChevronRight size={15} />
            </button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-[340px_1fr] gap-4">
        {/* Not */}
        <Panel className="relative overflow-hidden" style={{ minHeight: 330 }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[200px]" style={{ background: `radial-gradient(70% 90% at 50% 0%, ${tintBg(c, 26)} 0%, transparent 70%)` }} />
          <div className="relative flex items-center gap-4">
            <NookFigure look={look} color={color} size={74} expression={g.letter <= "B" ? "happy" : g.letter === "C" ? "idle" : "sulk"} />
            <div>
              <span className="font-display text-[64px] font-bold leading-none tracking-[-0.04em]" style={{ color: tintText(c) }}>
                {g.letter}
              </span>
              <p className="text-[15px] font-bold text-label">{g.meaning}</p>
              <p className="text-[12px] tabular-nums text-label-3">{tt("{0} / 100 puan", g.pts)}</p>
            </div>
          </div>
          <div className="relative mt-4 flex gap-1.5">
            {SCALE.map((x) => {
              const on = x.letter === g.letter;
              return (
                <span key={x.letter} className="flex-1 rounded-[10px] py-1 text-center text-[11px] leading-tight tabular-nums" style={on ? { background: tintBg(c, 26), color: tintText(c) } : { background: "rgb(255 255 255 / 0.05)", color: "var(--color-label-3)" }}>
                  <b>{x.letter}</b>
                  <span className="block text-[9.5px] opacity-80">{x.min}+</span>
                </span>
              );
            })}
          </div>
          <p className="relative mt-4 rounded-[14px] px-3.5 py-2.5 text-[13px] leading-snug" style={{ background: tintBg(c, 11), color: tintText(c) }}>
            {g.empty ? tt("Bu hafta seni pek görmedim. Biraz vakit geçirince karnen dolacak.") : g.line}
          </p>
          <div className="relative mt-3 space-y-1.5 text-[12px]">
            <Line label={tt("Bir önceki hafta")}>
              {pg.empty ? (
                <span className="text-label-3">{tt("Veri yok")}</span>
              ) : (
                <>
                  <span className="text-label-2">
                    {pg.letter} · {pg.pts}
                  </span>{" "}
                  <span style={{ color: diff > 0 ? tintText(ACCENT.green) : diff < 0 ? tintText(ACCENT.red) : "var(--color-label-3)" }}>{diff > 0 ? `▲ ${diff}` : diff < 0 ? `▼ ${-diff}` : tt("aynı")}</span>
                </>
              )}
            </Line>
            {best.stats.active > 0 && (
              <Line label={tt("En uzun gün")}>
                <span className="text-label-2">
                  {best.date.toLocaleDateString(locale(), { weekday: "long" })} · {hm(best.stats.active)}
                </span>
              </Line>
            )}
          </div>
        </Panel>

        <div className="min-h-[330px] min-w-0">
          <WeekChart week={week} />
        </div>
      </div>

      {/* Notun dökümü ve haftanın sayıları yan yana */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="min-h-[300px] min-w-0">
          <Breakdown g={g} />
        </div>
        <div className="grid grid-cols-2 gap-2.5" style={{ gridAutoRows: "minmax(0, 1fr)" }}>
          {tiles(week, prev, back === 0 ? watch : null).map((t) => (
            <Tile key={t.label} {...t} />
          ))}
        </div>
      </div>

      {/* Son haftalar */}
      <Panel title={tt("Son {0} hafta", WEEKS)} hint={tt("Bir haftaya tıkla, karnesini aç")}>
        <div className="flex h-[150px] items-end gap-3">
          {history.map(({ back: b, g: x }) => {
            const col = LETTER_COLOR[x.letter];
            const on = b === back;
            return (
              <button key={b} onClick={() => setBack(b)} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[11px] font-bold tabular-nums" style={{ color: x.empty ? "var(--color-label-3)" : tintText(col) }}>
                  {x.empty ? "–" : x.letter}
                </span>
                <motion.span
                  className="w-full rounded-t-[8px]"
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(4, x.pts) * 0.95}%` }}
                  transition={{ type: "spring", stiffness: 240, damping: 26 }}
                  style={{ background: on ? col : tintBg(col, x.empty ? 12 : 40), boxShadow: on ? `0 0 16px -4px ${col}` : undefined }}
                />
                <span className={`text-[10px] ${on ? "text-label-2" : "text-label-3"}`}>{b === 0 ? tt("Bu hafta") : tt("-{0} hf", b)}</span>
              </button>
            );
          })}
        </div>
      </Panel>
    </Page>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 rounded-[11px] bg-white/[0.045] px-3 py-1.5">
      <span className="shrink-0 text-label-3">{label}</span>
      <span className="truncate text-right tabular-nums">{children}</span>
    </div>
  );
}
