import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlarmClock, BellOff, BellRing, CalendarDays, Check, Plus, Repeat, RotateCcw, Trash2, X } from "lucide-react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { spring } from "../../lib/motion";
import { dayKey, remindAt, useNook, type CalEvent } from "../../store/nook";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { lang, locale, tt } from "../../lib/i18n";
import { repeatOf, repeatText, until } from "../../lib/alarm";
import { parseRemind, remindExamples, tomorrowMorning } from "../../lib/remind";

const COLOR = ACCENT.orange;

/** Hızlı seçenekler: şimdiden sonra ya da günün belli bir saati */
type When = { id: string; label: string; at: () => number | null };
const at = (days: number, h: number, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};
const WHEN: When[] = [
  { id: "10", label: tt("10 dk"), at: () => Date.now() + 10 * 60_000 },
  { id: "30", label: tt("30 dk"), at: () => Date.now() + 30 * 60_000 },
  { id: "60", label: tt("1 saat"), at: () => Date.now() + 60 * 60_000 },
  { id: "180", label: tt("3 saat"), at: () => Date.now() + 180 * 60_000 },
  // 19:00'dan sonra seçenek kaybolur (akşam 20:00'ye bir saatten az kalınca)
  { id: "eve", label: tt("Bu akşam"), at: () => (new Date().getHours() < 19 ? at(0, 20) : null) },
  // Gece 05:00'ten önce "yarın sabah" uyanınca gelen sabahtır (aynı takvim günü)
  { id: "tom", label: tt("Yarın sabah"), at: () => tomorrowMorning() },
];

/** Dakikaya yuvarla (alarm dakika çözünürlüklü): hiç erken çalmasın */
const ceilMin = (ms: number) => Math.ceil(ms / 60_000) * 60_000;

/** `exact`: yakın olsa da saatiyle yazar ("Bugün 14:20") */
function whenText(ms: number, now: number, exact = false) {
  const left = ms - now;
  const d = new Date(ms);
  const hm = d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
  if (!exact && left < 60 * 60_000 && left > 0) return tt("{0} dk sonra", Math.max(1, Math.round(left / 60_000)));
  if (dayKey(d) === dayKey()) return tt("Bugün {0}", hm);
  if (dayKey(d) === dayKey(new Date(now + 86_400_000))) return tt("Yarın {0}", hm);
  return `${d.toLocaleDateString(locale(), { day: "numeric", month: "short", weekday: "short" })} ${hm}`;
}

/**
 * Hatırlatıcı: "neyi" yaz, "ne zaman"ı seç (10 dk, 1 saat, bu akşam, yarın sabah ya da saat), ekle. O an
 * alarm gibi çalar. Sağda yaklaşanlar (takvim etkinliklerinin hatırlatmaları da) ve geçenler.
 */
export function RemindPanel() {
  const events = useNook((s) => s.events);
  const alarms = useNook((s) => s.alarms);
  const [title, setTitle] = useState("");
  const [pick, setPick] = useState("30");
  const [custom, setCustom] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);
  const input = useRef<HTMLInputElement>(null);
  // "Yeniden kur" ile forma alınan kaçırılmış hatırlatma: yenisi eklenince eskisi listeden kalkar
  const [redo, setRedo] = useState<string | null>(null);

  const parsed = title.trim() ? parseRemind(title, Date.now(), lang) : null;
  const options = WHEN.filter((w) => w.at() !== null);
  const chosen = (): number | null => {
    if (parsed) return parsed.at;
    if (pick === "custom") {
      const m = /^(\d{1,2}):(\d{2})$/.exec(custom);
      if (!m) return null;
      let t = at(0, +m[1], +m[2]);
      if (t <= Date.now()) t = at(1, +m[1], +m[2]);
      return t;
    }
    return options.find((w) => w.id === pick)?.at() ?? null;
  };
  const target = chosen();

  const add = () => {
    const text = (parsed?.title || title).trim();
    const t = target;
    if (!text || !t) return;
    const d = new Date(ceilMin(t));
    if (redo) useNook.getState().removeEvent(redo);
    setRedo(null);
    useNook.getState().addEvent({ day: dayKey(d), time: d.toTimeString().slice(0, 5), title: text, remind: 0, reminder: true, ...(parsed?.days ? { days: parsed.days } : {}) });
    setTitle("");
    input.current?.focus();
  };

  // Hatırlatması olan her şey: kendi hatırlatmaların ve takvim etkinliklerininkiler
  const { upcoming, past } = useMemo(() => {
    const items = events
      .filter((e) => e.reminder || e.remind >= 0)
      .map((e) => {
        const alarm = e.alarmId ? alarms.find((a) => a.id === e.alarmId && a.enabled) : undefined;
        // Tekrarlı hatırlatmanın anı alarmının sıradaki çalmasıdır
        return { e, at: (e.days?.length ? alarm?.next : null) ?? remindAt(e) ?? remindAt({ ...e, remind: 0 })!, pending: !!alarm };
      });
    return {
      upcoming: items.filter((x) => x.pending).sort((a, b) => a.at - b.at),
      past: items.filter((x) => !x.pending && x.e.reminder).sort((a, b) => b.at - a.at).slice(0, 12),
    };
  }, [events, alarms]);

  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("remind", scroller);

  return (
    <div className="flex h-full min-w-0 gap-3">
      {/* Ekle */}
      <div className="flex w-[232px] shrink-0 flex-col gap-2">
        <div className="rounded-[16px] border p-2.5" style={{ background: `linear-gradient(150deg, ${tintBg(COLOR, 12)}, ${tintBg(COLOR, 3)})`, borderColor: tintBg(COLOR, 26) }}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: tintText(COLOR) }}>
            {tt("Neyi hatırlatayım?")}
          </p>
          <input
            ref={input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder={tt("ör. çamaşırı as 20 dk")}
            spellCheck={false}
            className="h-8 w-full rounded-[10px] bg-black/25 px-2.5 text-[12.5px] font-medium text-label outline-none placeholder:text-label-3 focus:bg-black/35"
          />
        </div>
        {/* Yazılandan ne anlaşıldı; kutu boşken dokununca yazılan örnekler; saat yazılmadıysa "Ne zaman?" */}
        <div className="flex h-[18px] shrink-0 items-center gap-1 overflow-hidden px-0.5">
          {parsed ? (
            <span className="flex min-w-0 items-center gap-1 rounded-full px-1.5 py-[2px] text-[10px] font-semibold" style={{ background: tintBg(COLOR, 20), color: tintText(COLOR) }}>
              {parsed.days ? <Repeat size={10} strokeWidth={2.6} className="shrink-0" /> : <AlarmClock size={10} strokeWidth={2.6} className="shrink-0" />}
              <span className="truncate">
                {parsed.days ? `${repeatText(repeatOf(parsed.days))} · ${whenText(ceilMin(parsed.at), now, true)}` : `${whenText(ceilMin(parsed.at), now, true)} · ${until(ceilMin(parsed.at), now)}`}
              </span>
            </span>
          ) : title.trim() ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-label-3">{tt("Ne zaman?")}</p>
          ) : (
            remindExamples(lang).map((x) => (
              <button
                key={x}
                onClick={() => (setTitle(x), input.current?.focus())}
                className="shrink-0 rounded-full bg-white/[0.06] px-1.5 py-[2px] text-[9.5px] font-medium text-label-2 transition-colors hover:bg-white/[0.12] hover:text-label"
              >
                {x}
              </button>
            ))
          )}
        </div>
        <div className="grid grid-cols-3 gap-1">
          {options.map((w) => {
            const on = !parsed && pick === w.id;
            return (
              <button
                key={w.id}
                onClick={() => setPick(w.id)}
                className="h-7 truncate rounded-[9px] border px-1 text-[11px] font-semibold transition-colors"
                style={on ? { background: tintBg(COLOR, 22), borderColor: tintBg(COLOR, 55), color: tintText(COLOR) } : { background: "rgb(255 255 255 / 0.035)", borderColor: "rgb(255 255 255 / 0.06)", color: "var(--color-label-2)" }}
              >
                {w.label}
              </button>
            );
          })}
        </div>
        <label
          className="flex h-7 items-center gap-1.5 rounded-[9px] border px-2 text-[11px] font-semibold"
          style={!parsed && pick === "custom" ? { background: tintBg(COLOR, 22), borderColor: tintBg(COLOR, 55), color: tintText(COLOR) } : { background: "rgb(255 255 255 / 0.035)", borderColor: "rgb(255 255 255 / 0.06)", color: "var(--color-label-2)" }}
        >
          {tt("Saat")}
          <input
            type="time"
            value={custom}
            onFocus={() => setPick("custom")}
            onChange={(e) => (setCustom(e.target.value), setPick("custom"))}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="min-w-0 flex-1 bg-transparent text-right text-[11.5px] font-bold text-label outline-none [color-scheme:dark]"
          />
        </label>
        <div className="flex-1" />
        <motion.button
          whileTap={{ scale: 0.96 }}
          transition={spring.pop}
          onClick={add}
          disabled={!title.trim() || !target}
          className="flex h-9 items-center justify-center gap-1.5 rounded-[12px] text-[12px] font-bold text-black disabled:opacity-35"
          style={{ background: COLOR }}
        >
          <Plus size={14} strokeWidth={2.8} />
          {target && title.trim() ? whenText(ceilMin(target), now) : tt("Hatırlat")}
        </motion.button>
      </div>

      {/* Liste */}
      <div ref={scroller} className="min-h-0 min-w-0 flex-1 overflow-y-auto pr-1">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-label-2">
          {tt("Yaklaşan")}
          {upcoming.length > 0 && (
            <span className="rounded-full px-1.5 text-[10px] font-bold" style={{ background: tintBg(COLOR, 20), color: tintText(COLOR) }}>
              {upcoming.length}
            </span>
          )}
        </p>
        {!upcoming.length && (
          <div className="flex flex-col items-center gap-1.5 rounded-[14px] border border-dashed border-white/[0.08] py-5 text-center">
            <BellRing size={18} style={{ color: tintText(COLOR) }} />
            <p className="text-[11.5px] text-label-3">{tt("Kurulu hatırlatma yok")}</p>
          </div>
        )}
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {upcoming.map(({ e, at: t }) => (
              <Row key={e.id} e={e} color={e.reminder ? COLOR : ACCENT.blue} when={e.days?.length ? `${repeatText(repeatOf(e.days))} · ${whenText(t, now)}` : whenText(t, now)} soon={t - now < 15 * 60_000} />
            ))}
          </AnimatePresence>
        </div>
        {past.length > 0 && (
          <>
            <p className="mb-1.5 mt-3 flex items-center text-[11px] font-semibold text-label-3">
              {tt("Geçenler")}
              <button onClick={() => past.forEach((x) => useNook.getState().removeEvent(x.e.id))} className="ml-auto rounded-full px-2 text-[10px] font-semibold text-label-3 hover:bg-well-hi hover:text-label">
                {tt("Temizle")}
              </button>
            </p>
            <div className="space-y-1">
              {past.map(({ e, at: t }) => (
                <Row
                  key={e.id}
                  e={e}
                  color={e.missed ? ACCENT.red : ACCENT.gray}
                  when={new Date(t).toLocaleString(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  done
                  onRedo={() => {
                    setTitle(e.title);
                    setRedo(e.id);
                    input.current?.focus();
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ e, color, when, soon, done, onRedo }: { e: CalEvent; color: string; when: string; soon?: boolean; done?: boolean; onRedo?: () => void }) {
  const missed = !!done && !!e.missed;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={spring.pop}
      className="group flex h-10 items-center gap-2 rounded-[12px] border pl-2 pr-1.5"
      style={{ background: tintBg(color, done ? 5 : 10), borderColor: tintBg(color, done ? 14 : 26) }}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px]" style={{ background: tintBg(color, 22), color: tintText(color) }}>
        {missed ? <BellOff size={12} strokeWidth={2.4} /> : done ? <Check size={12} strokeWidth={2.8} /> : e.reminder ? <BellRing size={12} strokeWidth={2.4} /> : <CalendarDays size={12} strokeWidth={2.4} />}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className={`block truncate text-[12px] font-semibold ${missed ? "text-label-2" : done ? "text-label-3 line-through decoration-white/20" : "text-label"}`}>{e.title}</span>
        <span className="block truncate text-[10px]" style={{ color: soon ? tintText(color) : "var(--color-label-3)" }}>
          {missed && <b className="font-semibold" style={{ color: tintText(color) }}>{tt("Kaçırıldı")} · </b>}
          {when}
          {!e.reminder && ` · ${tt("Takvimden")}`}
        </span>
      </span>
      {missed && onRedo && (
        <button
          onClick={onRedo}
          title={tt("Yeniden kur")}
          aria-label={tt("Yeniden kur")}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={{ background: tintBg(COLOR, 20), color: tintText(COLOR) }}
        >
          <RotateCcw size={11} strokeWidth={2.6} />
        </button>
      )}
      <button
        onClick={() => (e.reminder || done ? useNook.getState().removeEvent(e.id) : useNook.getState().cancelRemind(e.id))}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-label-3 opacity-60 hover:bg-well-hi hover:text-label group-hover:opacity-100"
        aria-label={tt("Sil")}
        title={done ? tt("Sil") : tt("Vazgeç")}
      >
        {done ? <Trash2 size={11} /> : <X size={12} strokeWidth={2.6} />}
      </button>
    </motion.div>
  );
}
