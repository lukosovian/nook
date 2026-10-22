/** Studio › Oyunlar: tam ekran oynanan oyunların geçmişi; gün gün, ay ay, yıl yıl */
import { useState } from "react";
import { motion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Gamepad2, Trophy } from "lucide-react";
import { dayKey, useNook } from "../../store/nook";
import { ACCENT, tintBg, tintText } from "../../components/ui/primitives";
import { hm } from "../../components/report/Report";
import { locale, pct, tt } from "../../lib/i18n";
import { Page, PageHeader, Panel, Stat } from "../ui";

type View = "day" | "month" | "year";

const COLORS = [ACCENT.red, ACCENT.blue, ACCENT.green, ACCENT.orange, ACCENT.purple, ACCENT.teal, ACCENT.pink, ACCENT.yellow];
/** Her oyunun kendi rengi (adından) */
const colorOf = (name: string) => COLORS[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORS.length];
const mins = (secs: number) => Math.round(secs / 60);

/** Grafiğin bir sütunu: o sütunun günleri ve tıklanınca gidilecek yer */
interface Bucket {
  label: string;
  days: string[];
  date: Date;
  on: boolean;
}

/** Seçili dönemin sütunları: gün görünümünde o haftanın günleri, ayda ayın günleri, yılda aylar */
function buckets(view: View, at: Date): Bucket[] {
  if (view === "year") {
    return Array.from({ length: 12 }, (_, m) => {
      const first = new Date(at.getFullYear(), m, 1);
      const len = new Date(at.getFullYear(), m + 1, 0).getDate();
      return { label: first.toLocaleDateString(locale(), { month: "short" }), days: Array.from({ length: len }, (_, d) => dayKey(new Date(at.getFullYear(), m, d + 1))), date: first, on: false };
    });
  }
  if (view === "month") {
    const len = new Date(at.getFullYear(), at.getMonth() + 1, 0).getDate();
    return Array.from({ length: len }, (_, d) => {
      const date = new Date(at.getFullYear(), at.getMonth(), d + 1);
      return { label: String(d + 1), days: [dayKey(date)], date, on: false };
    });
  }
  // Pazartesiden başlayan hafta
  const monday = new Date(at.getFullYear(), at.getMonth(), at.getDate() - ((at.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return { label: date.toLocaleDateString(locale(), { weekday: "short" }), days: [dayKey(date)], date, on: dayKey(date) === dayKey(at) };
  });
}

/** Bir dönemdeki günlerin oyun toplamları: oyun → saniye ve oynandığı gün sayısı */
function totals(log: Record<string, Record<string, number>>, days: string[]) {
  const games: Record<string, { secs: number; days: number }> = {};
  for (const d of days)
    for (const [g, secs] of Object.entries(log[d] ?? {})) {
      const cur = (games[g] ??= { secs: 0, days: 0 });
      cur.secs += secs;
      cur.days += 1;
    }
  return Object.entries(games).sort((a, b) => b[1].secs - a[1].secs);
}

export function GamesPage() {
  const log = useNook((s) => s.gameLog);
  const [view, setView] = useState<View>("day");
  const [at, setAt] = useState(() => new Date());

  const cols = buckets(view, at);
  const periodDays = view === "day" ? [dayKey(at)] : cols.flatMap((c) => c.days);
  const games = totals(log, periodDays);
  const total = games.reduce((n, [, g]) => n + g.secs, 0);
  const playedDays = periodDays.filter((d) => Object.keys(log[d] ?? {}).length).length;
  const colSecs = cols.map((c) => c.days.reduce((n, d) => n + Object.values(log[d] ?? {}).reduce((a, b) => a + b, 0), 0));
  const peak = Math.max(1, ...colSecs);
  const empty = !Object.keys(log).length;

  const today = new Date();
  const isNow = view === "day" ? dayKey(at) === dayKey(today) : view === "month" ? at.getFullYear() === today.getFullYear() && at.getMonth() === today.getMonth() : at.getFullYear() === today.getFullYear();
  const step = (dir: number) =>
    setAt((d) => (view === "day" ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + dir) : view === "month" ? new Date(d.getFullYear(), d.getMonth() + dir, 1) : new Date(d.getFullYear() + dir, 0, 1)));
  const title =
    view === "day"
      ? isNow
        ? tt("Bugün")
        : at.toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : view === "month"
        ? at.toLocaleDateString(locale(), { month: "long", year: "numeric" })
        : String(at.getFullYear());
  // Sütuna tıklayınca bir alt görünüme in: yıldan aya, aydan güne; haftada o güne
  const open = (c: Bucket) => {
    setAt(c.date);
    if (view === "year") setView("month");
    else if (view === "month") setView("day");
  };

  return (
    <Page wide>
      <PageHeader
        icon={Gamepad2}
        color={ACCENT.red}
        title={tt("Oyun geçmişi")}
        subtitle={tt("Tam ekran oynadığın oyunlar, kendiliğinden")}
        actions={
          <>
            <div className="flex gap-1 rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-1">
              {(
                [
                  ["day", tt("Gün")],
                  ["month", tt("Ay")],
                  ["year", tt("Yıl")],
                ] as const
              ).map(([v, label]) => (
                <button key={v} onClick={() => setView(v)} className="rounded-[9px] px-3 py-1 text-[12px] font-semibold" style={v === view ? { background: tintBg(ACCENT.red, 22), color: tintText(ACCENT.red) } : { color: "var(--color-label-3)" }}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-1">
              <button onClick={() => step(-1)} className="flex h-7 w-7 items-center justify-center rounded-[9px] text-label-2 hover:bg-white/[0.07]" title={tt("Önceki")}>
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setAt(new Date())} className="min-w-[150px] rounded-[9px] px-1 text-center text-[12px] font-semibold text-label-2 hover:bg-white/[0.07]" title={tt("Bugüne dön")}>
                {title}
              </button>
              <button onClick={() => step(1)} disabled={isNow} className="flex h-7 w-7 items-center justify-center rounded-[9px] text-label-2 hover:bg-white/[0.07] disabled:opacity-30" title={tt("Sonraki")}>
                <ChevronRight size={15} />
              </button>
            </div>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-4 gap-3">
        <Stat icon={Clock} color={ACCENT.red} label={tt("Toplam oyun")} value={hm(mins(total))} delay={0} />
        <Stat icon={Gamepad2} color={ACCENT.blue} label={tt("Oyun sayısı")} value={String(games.length)} delay={0.03} />
        <Stat icon={Trophy} color={ACCENT.yellow} label={tt("En çok oynanan")} value={games[0]?.[0] ?? "–"} sub={games[0] ? hm(mins(games[0][1].secs)) : undefined} delay={0.06} />
        <Stat
          icon={CalendarDays}
          color={ACCENT.green}
          label={view === "day" ? tt("Haftanın toplamı") : tt("Oynanan gün")}
          value={view === "day" ? hm(mins(colSecs.reduce((a, b) => a + b, 0))) : String(playedDays)}
          sub={view === "day" ? undefined : tt("{0} günün", periodDays.length)}
          delay={0.09}
        />
      </div>

      <Panel title={view === "year" ? tt("Ay ay") : view === "month" ? tt("Gün gün") : tt("Bu hafta")} hint={view === "day" ? tt("Bir güne tıkla") : view === "month" ? tt("Bir güne tıkla, o günü aç") : tt("Bir aya tıkla, o ayı aç")} className="mb-4" delay={0.05}>
        <div className="flex h-[170px] items-end gap-1.5">
          {cols.map((c, i) => {
            const v = colSecs[i];
            const future = c.date > today;
            return (
              <button key={c.label + i} onClick={() => open(c)} disabled={future} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5 disabled:opacity-35" title={v ? hm(mins(v)) : undefined}>
                {view !== "month" && <span className="text-[10.5px] font-semibold tabular-nums text-label-3">{v ? hm(mins(v)) : ""}</span>}
                <motion.span
                  className="w-full rounded-t-[7px] transition-[filter] group-hover:brightness-125"
                  initial={{ height: 0 }}
                  animate={{ height: v ? `${Math.max(4, (v / peak) * 82)}%` : 3 }}
                  transition={{ type: "spring", stiffness: 240, damping: 26, delay: i * 0.012 }}
                  style={{ background: c.on ? ACCENT.red : tintBg(ACCENT.red, v ? 45 : 12), boxShadow: c.on ? `0 0 16px -4px ${ACCENT.red}` : undefined }}
                />
                <span className={`truncate text-[10px] ${c.on ? "font-bold text-label" : "text-label-3"}`}>{c.label}</span>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title={tt("Oyunlar")} hint={view === "day" ? title : tt("{0} içinde", title)} delay={0.08}>
        {games.length ? (
          <div className="space-y-2">
            {games.map(([name, g], i) => {
              const col = colorOf(name);
              return (
                <motion.div key={name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.03 }} className="flex items-center gap-3 rounded-[14px] bg-white/[0.04] px-3.5 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-[14px] font-extrabold" style={{ background: tintBg(col, 22), color: tintText(col) }}>
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[13.5px] font-semibold text-label">{name}</span>
                      <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-label-2">{hm(mins(g.secs))}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${(g.secs / games[0][1].secs) * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 28 }} style={{ background: col }} />
                      </div>
                      <span className="w-[86px] shrink-0 text-right text-[11px] tabular-nums text-label-3">
                        {pct(Math.round((g.secs / total) * 100))}
                        {view !== "day" && ` · ${tt("{0} gün", g.days)}`}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-[13px] text-label-3">
            {empty ? tt("Henüz oyun kaydı yok. Tam ekran bir oyun oynayıp çıkınca burada birikmeye başlar.") : tt("Bu dönemde oyun oynanmamış.")}
          </p>
        )}
      </Panel>
    </Page>
  );
}
