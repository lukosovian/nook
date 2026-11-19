/**
 * Günü kapat — günün özetinin akşamki karşılığı, küçük bir ada kartı: bugünün odağı, suyu, tek işi,
 * yarının ilk alarmı, ruh hâli ve "Yarına bir not" (ertesi günün özetinde görünür).
 * Ruh hâli yüzleri (MOODS, MoodPicker) özet, Karne ve yıl özetinde de kullanılır.
 */
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import { clock, nextFire } from "../../lib/alarm";
import { closeDayClose, setDayNote, setMood, toggleTodayTask, useTodayTask } from "../../lib/brief";
import { getTodayWater, useHabits } from "../../lib/habits";
import { locale, tt } from "../../lib/i18n";
import { dayKey, useNook } from "../../store/nook";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";

/** Beş yüz: çok kötü → harika */
export const MOODS = [
  { v: 1, label: tt("Çok kötü"), color: ACCENT.red, eyes: "closed" },
  { v: 2, label: tt("Kötü"), color: ACCENT.orange, eyes: "side" },
  { v: 3, label: tt("İdare eder"), color: ACCENT.yellow, eyes: "open" },
  { v: 4, label: tt("İyi"), color: ACCENT.teal, eyes: "happy" },
  { v: 5, label: tt("Harika"), color: ACCENT.green, eyes: "happy" },
] as const;

/** Ruh hâline (1–5, kesirli ortalama da olur) karşılık gelen yüz */
export const moodOf = (v: number) => MOODS[Math.min(4, Math.max(0, Math.round(v) - 1))];

/** Tek dokunuşla bugünün ruh hâli */
export function MoodPicker({ size = 22 }: { size?: number }) {
  const mood = useNook((s) => s.days[dayKey()]?.mood ?? 0);
  return (
    <span className="flex items-center gap-1.5">
      {MOODS.map((m) => (
        <motion.button
          key={m.v}
          title={m.label}
          aria-label={m.label}
          onClick={() => setMood(m.v)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          animate={{ opacity: mood && mood !== m.v ? 0.32 : 1, scale: mood === m.v ? 1.14 : 1 }}
          className="flex rounded-full"
        >
          <MiniNook color={m.color} size={size} eyes={m.eyes} />
        </motion.button>
      ))}
    </span>
  );
}

const mins = (m: number) => (m >= 60 ? tt("{0} sa", Math.floor(m / 60)) + (m % 60 ? tt(" {0} dk", m % 60) : "") : tt("{0} dk", m));

/** Yarın çalacak ilk alarm ("07:30"); yoksa null */
function tomorrowAlarm(alarms: ReturnType<typeof useNook.getState>["alarms"]) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const first = alarms
    .filter((a) => a.enabled)
    .map((a) => ({ a, at: nextFire(a, end.getTime()) }))
    .filter((x) => x.at - end.getTime() <= 86_400_000)
    .sort((x, y) => x.at - y.at)[0];
  return first ? clock(first.a) : null;
}

export function DayClose() {
  const focus = useNook((s) => s.days[dayKey()]?.focus ?? 0);
  const alarm = useNook((s) => tomorrowAlarm(s.alarms));
  const saved = useNook((s) => (s.dayNote?.day === dayKey() ? s.dayNote.text : ""));
  const goal = useHabits((h) => h.waterGoal);
  const water = getTodayWater();
  const task = useTodayTask();
  const [note, setNote] = useState(saved);
  // Yazarken imleç dışarı kaçarsa kart kapanmasın; kart kalkınca tutuş da kalkar
  useEffect(() => () => useNook.getState().setHold("dayclose", false), []);

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.22 } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      <button onClick={closeDayClose} title={tt("Kapat")} aria-label={tt("Kapat")} className="absolute right-2.5 top-2 z-10 flex size-6 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label">
        <X size={12} strokeWidth={2.4} />
      </button>

      {/* Nook'un altında: başlık ve gün */}
      <div className="absolute left-0 top-[104px] w-[104px] text-center leading-tight">
        <p className="text-[12px] font-semibold" style={{ color: tintText(ACCENT.purple) }}>
          {tt("Günü kapat")}
        </p>
        <p className="mt-0.5 text-[10px] text-label-3">{new Date().toLocaleDateString(locale(), { weekday: "long" })}</p>
      </div>

      <div className="absolute bottom-3.5 left-[108px] right-9 top-3.5 flex flex-col justify-between">
        <div className="grid grid-cols-4 gap-1.5">
          <Stat label={tt("Odak")} value={focus ? mins(focus) : tt("Yok")} color={ACCENT.red} />
          <Stat label={tt("Su")} value={tt("{0} / {1}", water, goal)} color={ACCENT.blue} />
          <Stat
            label={tt("Bugünün tek işi")}
            value={task ? task.text : tt("Yazılmadı")}
            color={ACCENT.green}
            done={task?.done}
            onClick={task ? toggleTodayTask : undefined}
            title={task ? (task.done ? tt("Yapıldı · geri al") : tt("Yapıldı olarak işaretle")) : undefined}
          />
          <Stat label={tt("Yarının ilk alarmı")} value={alarm ?? tt("Yok")} color={ACCENT.orange} />
        </div>

        <div className="flex items-center gap-2.5 px-0.5">
          <span className="text-[11.5px] font-medium text-label-2">{tt("Bugün nasıldı?")}</span>
          <MoodPicker />
        </div>

        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            setDayNote(note);
            (document.activeElement as HTMLElement | null)?.blur();
          }}
        >
          <input
            value={note}
            maxLength={140}
            placeholder={tt("Yarına bir not")}
            onChange={(e) => setNote(e.target.value)}
            onPointerDown={(e) => e.currentTarget.focus()}
            onFocus={() => useNook.getState().setHold("dayclose", true)}
            onBlur={() => {
              setDayNote(note);
              useNook.getState().setHold("dayclose", false);
            }}
            className="h-8 min-w-0 flex-1 rounded-full border border-white/[0.08] bg-well px-3 text-[12px] text-label outline-none placeholder:text-label-3 focus:border-white/25"
          />
          {note.trim() !== "" && note.trim() === saved && (
            <span className="flex shrink-0 items-center gap-1 text-[10.5px] font-medium" style={{ color: tintText(ACCENT.green) }}>
              <Check size={11} strokeWidth={3} />
              {tt("Yarın özetinde")}
            </span>
          )}
        </form>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, color, done, onClick, title }: { label: string; value: string; color: string; done?: boolean; onClick?: () => void; title?: string }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      onClick={onClick}
      title={title ?? value}
      className={`min-w-0 rounded-[14px] border px-2.5 py-1.5 leading-tight ${onClick ? "cursor-pointer hover:brightness-125" : ""}`}
      style={{ background: tintBg(color, 9), borderColor: tintBg(color, 24) }}
    >
      <span className="block truncate text-[9.5px] text-label-3">{label}</span>
      <span className="mt-0.5 flex items-center gap-1 text-[12px] font-medium" style={{ color: tintText(color) }}>
        {done !== undefined && (
          <i className="flex size-[13px] shrink-0 items-center justify-center rounded-full border" style={{ borderColor: tintBg(color, 60), background: done ? color : "transparent", color: "#000" }}>
            {done && <Check size={9} strokeWidth={3.5} />}
          </i>
        )}
        <span className={`truncate ${done ? "line-through opacity-70" : ""}`}>{value}</span>
      </span>
    </div>
  );
}
