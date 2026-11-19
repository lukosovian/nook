import { useEffect, useMemo, useState, useRef } from "react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { AnimatePresence, motion } from "motion/react";
import { AlarmClock, Bell, BellOff, Check, ChevronDown, ChevronUp, Coffee, Pencil, Pill, SkipForward, Sunrise, X, type LucideIcon } from "lucide-react";
import { clock, DAY_SHORT, daysOf, pad, repeatOf, repeatText, until, WEEK, type Alarm } from "../../lib/alarm";
import { spring } from "../../lib/motion";
import { useNook } from "../../store/nook";
import { ACCENT, MiniNook, tintBg, tintText, Toggle } from "../ui/primitives";
import { locale, tt } from "../../lib/i18n";

const QUICK = [5, 10, 25, 60];

/** Gün kısayolları: tek dokunuşla günleri seçer */
const DAY_SETS: { label: string; days: number[] }[] = [
  { label: tt("Her gün"), days: [1, 2, 3, 4, 5, 6, 0] },
  { label: tt("Hafta içi"), days: [1, 2, 3, 4, 5] },
  { label: tt("Hafta sonu"), days: [6, 0] },
];

/** Şablonlar: soldaki kartı hazır isim, saat ve günlerle doldurur; Kur'a basmak sana kalır */
const TEMPLATES: { label: string; icon: LucideIcon; color: string; hour: number; minute: number; days: number[]; title: string }[] = [
  { label: tt("İlaç"), icon: Pill, color: ACCENT.green, hour: 9, minute: 0, days: [1, 2, 3, 4, 5, 6, 0], title: tt("Her gün aynı saatte çalan ilaç alarmı: saati soldan ayarla, Kur'a bas. Çalınca \"Aldım\" dersin") },
  { label: tt("Uyan"), icon: Sunrise, color: ACCENT.orange, hour: 7, minute: 0, days: [1, 2, 3, 4, 5], title: tt("Hafta içi sabah alarmı: saati soldan ayarla, Kur'a bas") },
  { label: tt("Mola"), icon: Coffee, color: ACCENT.blue, hour: 15, minute: 0, days: [1, 2, 3, 4, 5], title: tt("Hafta içi öğleden sonra molası: saati soldan ayarla, Kur'a bas") },
];
const sameDays = (a: number[], b: number[]) => a.length === b.length && b.every((d) => a.includes(d));

/** Atlanan çalma: "Yarın atlanacak" */
function skipText(at: number) {
  const d = new Date(at);
  const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  return days === 0 ? tt("Bugün atlanacak") : days === 1 ? tt("Yarın atlanacak") : tt("{0} atlanacak", d.toLocaleDateString(locale(), { weekday: "long" }));
}

/** Alarm kur: saat seçici + isim + tekrar; hızlı "+N dk"; kurulu alarmlar listesi (satıra tıklayınca düzenlenir). */
export function AlarmPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("alarm", scroller);
  // Hatırlatmaların alarmları Hatırlatıcı'da listelenir, burada yalnızca alarmlar
  const all = useNook((s) => s.alarms);
  const events = useNook((s) => s.events);
  const alarms = useMemo(() => {
    const reminders = new Set(events.map((e) => e.alarmId).filter(Boolean));
    return all.filter((a) => !reminders.has(a.id));
  }, [all, events]);
  const addAlarm = useNook((s) => s.addAlarm);
  const now = useNow();

  // Varsayılan: bir sonraki tam saat
  const [hour, setHour] = useState(() => (new Date().getHours() + 1) % 24);
  const [minute, setMinute] = useState(0);
  const [label, setLabel] = useState("");
  const [days, setDays] = useState<number[]>([]);
  // Ayarlarda ses "Sessiz" ise yeni alarmlar da sessiz başlar
  const [silent, setSilent] = useState(() => useNook.getState().settings.alarmSound === 0);
  // Düzenlenen alarm: üstteki seçici onun değerleriyle dolar, "Kur" → "Kaydet"
  const [editing, setEditing] = useState<string | null>(null);
  // Şablon seçilince soldaki kart kısaca parlar
  const [flash, setFlash] = useState(0);

  // Düzenlenen alarm silindiyse (ya da tek seferlik olup çaldıysa) düzenleme biter
  useEffect(() => {
    if (editing && !alarms.some((a) => a.id === editing)) setEditing(null);
  }, [alarms, editing]);

  const edit = (a: Alarm) => {
    if (editing === a.id) return cancel();
    setEditing(a.id);
    setHour(a.hour);
    setMinute(a.minute);
    setLabel(a.label);
    setDays(daysOf(a));
    setSilent(!!a.silent);
  };
  const cancel = () => {
    setEditing(null);
    setLabel("");
  };
  const add = () => {
    if (editing) {
      useNook.getState().updateAlarm(editing, { hour, minute, label: label.trim(), ...repeatOf(days), silent });
      setEditing(null);
    } else addAlarm({ hour, minute, label: label.trim(), ...repeatOf(days), silent });
    setLabel("");
  };
  const quick = (min: number) => {
    const at = Date.now() + min * 60_000;
    const d = new Date(at);
    addAlarm({ hour: d.getHours(), minute: d.getMinutes(), label: tt("{0} sonra", min >= 60 ? tt("{0} saat", min / 60) : tt("{0} dakika", min)), repeat: "once", oneShot: true, at, silent });
  };

  const next = alarms.filter((x) => x.enabled && x.next).sort((x, y) => x.next! - y.next!)[0];

  return (
    <div className="flex h-full gap-3">
      {/* Yeni alarm (ya da düzenlenen) */}
      <div className="relative flex w-[186px] shrink-0 flex-col gap-1.5 rounded-[16px] border p-2.5" style={{ background: tintBg(ACCENT.yellow, editing ? 12 : 6), borderColor: tintBg(ACCENT.yellow, editing ? 50 : 20) }}>
        <p className="text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: tintText(ACCENT.yellow) }}>
          {editing ? tt("Alarmı düzenle") : tt("Yeni alarm")}
        </p>
        {flash > 0 && (
          <motion.span
            key={flash}
            className="pointer-events-none absolute inset-0 rounded-[16px]"
            style={{ background: tintBg(ACCENT.yellow, 45) }}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
        <div className="flex items-center justify-center rounded-[12px] bg-black/30 py-0.5">
          <Digit value={hour} max={23} onChange={setHour} />
          <span className="pb-0.5 font-display text-[28px] font-medium text-label-3">:</span>
          <Digit value={minute} max={59} onChange={setMinute} />
        </div>
        <div className="flex gap-1">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? add() : e.key === "Escape" && editing && cancel())}
            placeholder={tt("İsim (ör. Toplantı)")}
            spellCheck={false}
            className="h-7 w-full min-w-0 flex-1 rounded-[10px] bg-black/30 px-2.5 text-[12px] text-label outline-none placeholder:text-label-3 focus:bg-black/45"
          />
          <BellToggle silent={silent} onChange={setSilent} />
        </div>
        {/* Gün kısayolları: seçiliyken yeniden basınca "bir kez"e döner */}
        <div className="flex gap-0.5">
          {DAY_SETS.map((s) => {
            const on = sameDays(days, s.days);
            return (
              <button
                key={s.label}
                onClick={() => setDays(on ? [] : s.days)}
                className="h-[18px] min-w-0 flex-auto truncate rounded-full px-1 text-[9.5px] font-semibold"
                style={{ background: on ? tintBg(ACCENT.yellow, 26) : "rgb(255 255 255 / 0.05)", color: on ? tintText(ACCENT.yellow) : "var(--color-label-3)" }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1">
          {/* Tekrar: çalacağı günler; hiçbiri seçili değilse bir kez */}
          <div className="flex min-w-0 flex-1 gap-0.5" title={days.length ? repeatText(repeatOf(days)) : tt("Bir kez · gün seçersen her hafta o günlerde çalar")}>
            {WEEK.map((d) => {
              const on = days.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])}
                  className="flex h-7 min-w-0 flex-1 items-center justify-center rounded-[8px] border text-[10.5px] font-bold"
                  style={{
                    background: on ? tintBg(ACCENT.yellow, 30) : "rgb(0 0 0 / 0.3)",
                    borderColor: on ? tintBg(ACCENT.yellow, 60) : "transparent",
                    color: on ? tintText(ACCENT.yellow) : "var(--color-label-3)",
                  }}
                >
                  {DAY_SHORT[d]}
                </button>
              );
            })}
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={spring.pop}
          onClick={add}
          className="mt-auto flex h-8 items-center justify-center gap-1.5 rounded-[11px] text-[12px] font-bold text-black"
          style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${ACCENT.yellow} 85%, white), ${ACCENT.yellow})`, boxShadow: `0 6px 14px -8px ${ACCENT.yellow}` }}
        >
          {editing ? <Check size={14} strokeWidth={2.8} /> : <AlarmClock size={14} strokeWidth={2.6} />}
          {editing ? tt("Kaydet") : tt("Kur")}
        </motion.button>
        {/* Düzenlemeden vazgeç */}
        <AnimatePresence>
          {editing && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={spring.pop}
              onClick={cancel}
              title={tt("Vazgeç")}
              aria-label={tt("Vazgeç")}
              className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-well-hi text-label-2 hover:text-label"
            >
              <X size={10} strokeWidth={3} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Sıradaki alarm ve hızlı geri sayımlar */}
        <div className="flex shrink-0 flex-col gap-1.5 rounded-[16px] border border-white/[0.06] bg-white/[0.03] px-3 py-2">
          <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-label-3">{tt("Sıradaki")}</p>
            {next ? (
              <>
                <p className="font-round text-[24px] font-extrabold tabular-nums" style={{ color: tintText(ACCENT.yellow) }}>
                  {clock(next)}
                </p>
                <p className="truncate text-[10.5px] text-label-2">
                  {next.label || repeatText(next)} · {until(next.next!, now)}
                </p>
              </>
            ) : (
              <p className="pt-1 text-[12px] text-label-3">{tt("Kurulu alarm yok")}</p>
            )}
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-1">
            {QUICK.map((m) => (
              <button
                key={m}
                onClick={() => quick(m)}
                title={tt("Şimdiden {0} sonraya alarm", m >= 60 ? tt("{0} saat", m / 60) : tt("{0} dakika", m))}
                className="rounded-[9px] bg-white/[0.06] px-2 py-[3px] text-[10.5px] font-semibold text-label-2 transition-colors hover:bg-white/[0.12] hover:text-label"
              >
                +{m >= 60 ? tt("{0} sa", m / 60) : tt("{0} dk", m)}
              </button>
            ))}
          </div>
          </div>
            {/* Şablonlar: isim, saat ve günler hazır gelir; saati soldan değiştirip Kur'a basılır */}
            <div className="flex items-center gap-1">
              <span className="pr-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-label-3">{tt("Şablon")}</span>
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => {
                    if (!editing) {
                      setHour(t.hour);
                      setMinute(t.minute);
                    }
                    setLabel(t.label);
                    setDays(t.days);
                    setFlash((n) => n + 1);
                  }}
                  title={t.title}
                  className="flex flex-1 items-center justify-center gap-1 rounded-[9px] px-1.5 py-[3px] text-[10.5px] font-semibold transition-colors"
                  style={{ background: tintBg(t.color, 14), color: tintText(t.color) }}
                >
                  <t.icon size={11} strokeWidth={2.5} />
                  {t.label}
                </button>
              ))}
            </div>
        </div>

        <div ref={scroller} className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {alarms.map((a) => (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={spring.pop}
                className="flex h-10 items-center gap-1.5 rounded-[13px] border pl-1.5 pr-1.5"
                style={{
                  background: editing === a.id ? tintBg(ACCENT.yellow, 18) : a.enabled ? tintBg(ACCENT.yellow, 9) : "rgb(255 255 255 / 0.03)",
                  borderColor: editing === a.id ? tintBg(ACCENT.yellow, 60) : a.enabled ? tintBg(ACCENT.yellow, 26) : "rgb(255 255 255 / 0.05)",
                }}
              >
                {/* Saate/isme tıklayınca soldaki kartta düzenlenir */}
                <button onClick={() => edit(a)} title={tt("Düzenle")} className="group flex min-w-0 flex-1 items-center gap-2 text-left">
                  <MiniNook color={a.enabled ? ACCENT.yellow : "#5a5a62"} size={24} eyes={a.enabled ? "open" : "closed"} />
                  {/* Üstte saat ve isim, altta kalan süre (ya da "Yarın atlanacak") */}
                  <span className="min-w-0 flex-1 leading-none">
                    <span className="flex items-baseline gap-1.5">
                      <span className="font-round text-[15px] font-extrabold tabular-nums" style={{ color: a.enabled ? tintText(ACCENT.yellow) : "var(--color-label-3)" }}>
                        {clock(a)}
                      </span>
                      <span className="min-w-0 truncate text-[10.5px] text-label-2">{a.label || repeatText(a)}</span>
                    </span>
                    {a.enabled && a.next && (
                      <span className="mt-[3px] block truncate text-[9.5px]" style={{ color: a.skipped && a.skipped > now ? tintText(ACCENT.orange) : "var(--color-label-3)" }}>
                        {a.skipped && a.skipped > now ? skipText(a.skipped) : until(a.next, now)}
                      </span>
                    )}
                  </span>
                  <Pencil size={10} strokeWidth={2.4} className={`shrink-0 text-label-3 transition-opacity ${editing === a.id ? "opacity-100" : "opacity-50 group-hover:opacity-100"}`} />
                </button>
                {/* Tekrarlı alarm: sıradaki çalmayı bir kez atla (yeniden basınca geri alınır) */}
                {a.enabled && a.repeat !== "once" && (
                  <button
                    onClick={() => useNook.getState().skipAlarm(a.id, !(a.skipped && a.skipped > now))}
                    title={a.skipped && a.skipped > now ? tt("Atlamaktan vazgeç") : tt("Yalnızca sıradakini atla")}
                    aria-label={tt("Yalnızca sıradakini atla")}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                    style={
                      a.skipped && a.skipped > now
                        ? { background: tintBg(ACCENT.orange, 16), borderColor: tintBg(ACCENT.orange, 40), color: tintText(ACCENT.orange) }
                        : { background: "rgb(255 255 255 / 0.04)", borderColor: "rgb(255 255 255 / 0.08)", color: "var(--color-label-3)" }
                    }
                  >
                    <SkipForward size={11} strokeWidth={2.4} />
                  </button>
                )}
                <BellToggle silent={!!a.silent} small onChange={(v) => useNook.getState().setAlarmSilent(a.id, v)} />
                <Toggle on={a.enabled} onChange={(v) => useNook.getState().toggleAlarm(a.id, v)} color={ACCENT.yellow} />
                <button
                  onClick={() => useNook.getState().removeAlarm(a.id)}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-label-3 opacity-70 hover:bg-well-hi hover:text-label hover:opacity-100"
                  aria-label={tt("Sil")}
                >
                  <X size={11} strokeWidth={2.6} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {!alarms.length && <p className="pt-3 text-center text-[11px] text-label-3">{tt("Soldan bir saat seç, Kur'a bas")}</p>}
        </div>
      </div>
    </div>
  );
}

/**
 * Büyük rakam: oklar ve fare tekerleği 1'er (Shift ile 5'er) değiştirir; rakama tıklayınca
 * klavyeden yazılır (Enter / dışarı tıklama ile kaydedilir, ↑↓ de çalışır).
 */
function Digit({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const wrap = (v: number) => (v + max + 1) % (max + 1);
  const up = (n = 1) => onChange(wrap(value + n));
  const down = (n = 1) => onChange(wrap(value - n));
  const commit = () => {
    if (draft !== null && draft !== "") onChange(Math.min(max, Math.max(0, Number(draft))));
    setDraft(null);
  };
  return (
    <div
      className="group flex flex-col items-center"
      onWheel={(e) => (e.deltaY < 0 ? up(e.shiftKey ? 5 : 1) : down(e.shiftKey ? 5 : 1))}
      title={tt("Tıkla ve yaz · fare tekerleği ya da oklar (Shift ile 5'er)")}
    >
      <button onClick={() => up()} className="text-label-3 opacity-40 transition-opacity hover:text-label group-hover:opacity-100">
        <ChevronUp size={12} strokeWidth={2.6} />
      </button>
      {draft !== null ? (
        <input
          autoFocus
          value={draft}
          inputMode="numeric"
          maxLength={2}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 2))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") setDraft(null);
          }}
          onFocus={(e) => e.target.select()}
          className="w-10 rounded-[6px] bg-white/10 text-center font-display text-[30px] font-semibold leading-none tabular-nums text-label outline-none"
        />
      ) : (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.button
            key={value}
            onClick={() => setDraft(pad(value))}
            className="w-10 text-center font-display text-[30px] font-semibold leading-none tabular-nums text-label"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.12 }}
          >
            {pad(value)}
          </motion.button>
        </AnimatePresence>
      )}
      <button onClick={() => down()} className="text-label-3 opacity-40 transition-opacity hover:text-label group-hover:opacity-100">
        <ChevronDown size={12} strokeWidth={2.6} />
      </button>
    </div>
  );
}

/** Geri sayım metinleri için dakikada bir yenilenen "şimdi". */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

/** Zil: sesli ↔ sessiz. Sessiz alarm çalınca yalnızca ada açılır. */
function BellToggle({ silent, onChange, small }: { silent: boolean; onChange: (silent: boolean) => void; small?: boolean }) {
  const Icon = silent ? BellOff : Bell;
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      transition={spring.pop}
      onClick={() => onChange(!silent)}
      title={silent ? tt("Sessiz — yalnızca ekranda görünür (sesli yapmak için tıkla)") : tt("Sesli (sessize almak için tıkla)")}
      className={`flex shrink-0 items-center justify-center rounded-full border ${small ? "h-6 w-6" : "h-7 w-7"}`}
      style={
        silent
          ? { background: "rgb(255 255 255 / 0.04)", borderColor: "rgb(255 255 255 / 0.08)", color: "var(--color-label-3)" }
          : { background: tintBg(ACCENT.yellow, 10), borderColor: tintBg(ACCENT.yellow, 30), color: tintText(ACCENT.yellow) }
      }
    >
      <Icon size={small ? 11 : 12} strokeWidth={2.4} />
    </motion.button>
  );
}
