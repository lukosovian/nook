import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, BellOff, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { spring } from "../../lib/motion";
import { dayKey, remindAt, useNook, type CalEvent } from "../../store/nook";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt, locale } from "../../lib/i18n";

const COLOR = ACCENT.blue;

/** Hatırlatma seçenekleri (dakika önce; -1 = yok). Tıkladıkça sıradakine geçer. */
const REMIND: { min: number; label: string }[] = [
  { min: 0, label: tt("Vaktinde") },
  { min: 10, label: tt("10 dk önce") },
  { min: 60, label: tt("1 sa önce") },
  { min: 1440, label: tt("1 gün önce") },
  { min: -1, label: tt("Hatırlatma yok") },
];

/** "930", "9.30", "09:30" → "09:30"; boş → ""; geçersiz → null */
function parseTime(v: string): string | null {
  const t = v.trim();
  if (!t) return "";
  const m = t.match(/^(\d{1,2})(?:[:.\s]?(\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/**
 * Takvim: solda ay (etkinlikli günlerde nokta), sağda seçili günün etkinlikleri ve ekleme satırı.
 * Saatli etkinliğe hatırlatma kurulursa o an alarm gibi çalar (sesi Ayarlar › Alarm sesi).
 */
export function CalendarPanel() {
  const events = useNook((s) => s.events);
  const today = dayKey();
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const busyDays = useMemo(() => new Set(events.map((e) => e.day)), [events]);
  const list = events.filter((e) => e.day === day);

  // Pazartesiyle başlayan 6 haftalık ızgara
  const cells = useMemo(() => {
    const first = new Date(month);
    const shift = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), 1 - shift + i));
  }, [month]);
  const weekdays = useMemo(() => cells.slice(0, 7).map((d) => d.toLocaleDateString(locale(), { weekday: "narrow" })), [cells]);

  const go = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const pick = (d: Date) => {
    setDay(dayKey(d));
    if (d.getMonth() !== month.getMonth()) setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const [y, m, d] = day.split("-").map(Number);
  const dayLabel = new Date(y, m - 1, d).toLocaleDateString(locale(), { day: "numeric", month: "long", weekday: "long" });

  return (
    <div className="flex h-full flex-col gap-1.5">
    <div className="flex min-h-0 flex-1 gap-3">
      {/* Ay */}
      <div className="flex w-[176px] shrink-0 flex-col">
        <div className="mb-1 flex items-center justify-between">
          <button onClick={() => go(-1)} className="flex h-5 w-5 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label" aria-label={tt("Önceki ay")}>
            <ChevronLeft size={12} strokeWidth={2.6} />
          </button>
          <button
            onClick={() => {
              const now = new Date();
              setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              setDay(today);
            }}
            className="text-[11.5px] font-medium capitalize text-label hover:text-label-2"
            title={tt("Bugüne dön")}
          >
            {month.toLocaleDateString(locale(), { month: "long", year: "numeric" })}
          </button>
          <button onClick={() => go(1)} className="flex h-5 w-5 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label" aria-label={tt("Sonraki ay")}>
            <ChevronRight size={12} strokeWidth={2.6} />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-[9px] font-medium uppercase text-label-3">
          {weekdays.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
        <div className="mt-0.5 grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
          {cells.map((c) => {
            const k = dayKey(c);
            const other = c.getMonth() !== month.getMonth();
            const sel = k === day;
            const isToday = k === today;
            return (
              <button key={k} onClick={() => pick(c)} className="relative flex items-center justify-center">
                {sel && <motion.span layoutId="cal-sel" className="absolute inset-[1px] rounded-full" style={{ background: tintBg(COLOR, 30) }} transition={spring.pop} />}
                <span
                  className={`relative text-[10.5px] tabular-nums ${other ? "text-label-3/50" : sel ? "font-semibold" : "text-label-2"}`}
                  style={isToday ? { color: tintText(COLOR), fontWeight: 700 } : sel ? { color: "var(--color-label)" } : undefined}
                >
                  {c.getDate()}
                </span>
                {busyDays.has(k) && <span className="absolute bottom-[1px] h-[3px] w-[3px] rounded-full" style={{ background: other ? tintBg(COLOR, 40) : COLOR }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gün */}
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="mb-1.5 truncate text-[12px] font-medium capitalize text-label">
          {dayLabel}
          {day === today && <span className="ml-1.5 text-[10px] font-normal normal-case" style={{ color: tintText(COLOR) }}>{tt("bugün")}</span>}
        </p>
        <DayList list={list} />
      </div>
    </div>
    <AddRow day={day} />
    </div>
  );
}

function DayList({ list }: { list: CalEvent[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("calendar", scroller);
  const alarms = useNook((s) => s.alarms);
  return (
    <div ref={scroller} className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
      {!list.length && <p className="pt-4 text-center text-[11px] text-label-3">{tt("Bu gün boş")}</p>}
      <AnimatePresence initial={false}>
        {list.map((e) => {
          // Hatırlatma kurulu ve henüz çalmadı mı
          const pending = !!e.alarmId && alarms.some((a) => a.id === e.alarmId && a.enabled);
          const at = remindAt(e);
          return (
            <motion.div
              key={e.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={spring.pop}
              className="flex h-8 items-center gap-2 rounded-full border pl-2.5 pr-1.5"
              style={{ background: tintBg(COLOR, 9), borderColor: tintBg(COLOR, 26) }}
            >
              <span className="w-9 shrink-0 font-display text-[12.5px] font-medium tabular-nums" style={{ color: tintText(COLOR) }}>
                {e.time || tt("Gün")}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-label">{e.title}</span>
              {e.remind >= 0 && (
                <span
                  className="flex shrink-0 items-center"
                  style={{ color: pending ? tintText(ACCENT.yellow) : "var(--color-label-3)" }}
                  title={at ? new Date(at).toLocaleString(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : undefined}
                >
                  <Bell size={10} strokeWidth={2.4} />
                </span>
              )}
              <button
                onClick={() => useNook.getState().removeEvent(e.id)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label"
                aria-label={tt("Sil")}
              >
                <X size={11} strokeWidth={2.6} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** Ekleme satırı: başlık · saat (boşsa gün boyu) · hatırlatma · ekle */
function AddRow({ day }: { day: string }) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [remind, setRemind] = useState(1);
  const [bad, setBad] = useState(false);
  const opt = REMIND[remind];

  const add = () => {
    const t = parseTime(time);
    if (t === null) return setBad(true);
    if (!title.trim()) return;
    useNook.getState().addEvent({ day, time: t, title: title.trim(), remind: opt.min });
    setTitle("");
    setTime("");
  };

  return (
    <div className="flex shrink-0 items-center gap-1">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        placeholder={tt("Etkinlik ya da hatırlatıcı")}
        spellCheck={false}
        className="h-7 min-w-0 flex-1 rounded-full bg-well px-3 text-[11.5px] text-label outline-none placeholder:text-label-3 focus:bg-well-hi"
      />
      <input
        value={time}
        onChange={(e) => (setTime(e.target.value), setBad(false))}
        onKeyDown={(e) => e.key === "Enter" && add()}
        placeholder="--:--"
        title={tt("Saat (boş bırakırsan gün boyu)")}
        maxLength={5}
        className="h-7 w-[50px] shrink-0 rounded-full bg-well text-center text-[11.5px] tabular-nums text-label outline-none placeholder:text-label-3 focus:bg-well-hi"
        style={bad ? { boxShadow: `inset 0 0 0 1px ${ACCENT.red}` } : undefined}
      />
      <button
        onClick={() => setRemind((r) => (r + 1) % REMIND.length)}
        title={opt.label}
        className="flex h-7 shrink-0 items-center gap-1 rounded-full border px-2 text-[10.5px] font-medium"
        style={
          opt.min < 0
            ? { background: "rgb(255 255 255 / 0.04)", borderColor: "rgb(255 255 255 / 0.08)", color: "var(--color-label-3)" }
            : { background: tintBg(ACCENT.yellow, 10), borderColor: tintBg(ACCENT.yellow, 30), color: tintText(ACCENT.yellow) }
        }
      >
        {opt.min < 0 ? <BellOff size={11} strokeWidth={2.4} /> : <Bell size={11} strokeWidth={2.4} />}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={remind} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.12 }}>
            {opt.min < 0 ? tt("Yok") : opt.label}
          </motion.span>
        </AnimatePresence>
      </button>
      <motion.button
        whileTap={{ scale: 0.9 }}
        transition={spring.pop}
        onClick={add}
        disabled={!title.trim()}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border disabled:opacity-40"
        style={{ background: tintBg(COLOR, 18), borderColor: tintBg(COLOR, 45), color: tintText(COLOR) }}
        aria-label={tt("Ekle")}
      >
        <Plus size={13} strokeWidth={2.6} />
      </motion.button>
    </div>
  );
}
