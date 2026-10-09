import { useEffect, useState, useRef } from "react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { AnimatePresence, motion } from "motion/react";
import { AlarmClock, Bell, BellOff, Check, ChevronDown, ChevronUp, Pencil, Repeat2, X } from "lucide-react";
import { clock, pad, REPEAT_LABEL, until, type Alarm, type Repeat } from "../../lib/alarm";
import { spring } from "../../lib/motion";
import { useNook } from "../../store/nook";
import { ACCENT, MiniNook, tintBg, tintText, Toggle } from "../ui/primitives";
import { tt } from "../../lib/i18n";

const QUICK = [5, 10, 25, 60];
const REPEATS = Object.keys(REPEAT_LABEL) as Repeat[];

/** Alarm kur: saat seçici + isim + tekrar; hızlı "+N dk"; kurulu alarmlar listesi (satıra tıklayınca düzenlenir). */
export function AlarmPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("alarm", scroller);
  const alarms = useNook((s) => s.alarms);
  const addAlarm = useNook((s) => s.addAlarm);
  const now = useNow();

  // Varsayılan: bir sonraki tam saat
  const [hour, setHour] = useState(() => (new Date().getHours() + 1) % 24);
  const [minute, setMinute] = useState(0);
  const [label, setLabel] = useState("");
  const [repeat, setRepeat] = useState<Repeat>("once");
  // Ayarlarda ses "Sessiz" ise yeni alarmlar da sessiz başlar
  const [silent, setSilent] = useState(() => useNook.getState().settings.alarmSound === 0);
  // Düzenlenen alarm: üstteki seçici onun değerleriyle dolar, "Kur" → "Kaydet"
  const [editing, setEditing] = useState<string | null>(null);

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
    setRepeat(a.repeat);
    setSilent(!!a.silent);
  };
  const cancel = () => {
    setEditing(null);
    setLabel("");
  };
  const add = () => {
    if (editing) {
      useNook.getState().updateAlarm(editing, { hour, minute, label: label.trim(), repeat, silent });
      setEditing(null);
    } else addAlarm({ hour, minute, label: label.trim(), repeat, silent });
    setLabel("");
  };
  const quick = (min: number) => {
    const at = Date.now() + min * 60_000;
    const d = new Date(at);
    addAlarm({ hour: d.getHours(), minute: d.getMinutes(), label: tt("{0} sonra", min >= 60 ? tt("{0} saat", min / 60) : tt("{0} dakika", min)), repeat: "once", oneShot: true, at, silent });
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex items-center rounded-[14px] bg-well px-1.5">
          <Digit value={hour} max={23} onChange={setHour} />
          <span className="pb-0.5 font-display text-[24px] font-medium text-label-3">:</span>
          <Digit value={minute} max={59} onChange={setMinute} />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? add() : e.key === "Escape" && editing && cancel())}
            placeholder={tt("İsim (ör. Toplantı)")}
            spellCheck={false}
            className="h-7 w-full rounded-full bg-well px-3 text-[12px] text-label outline-none placeholder:text-label-3 focus:bg-well-hi"
          />
          <div className="flex gap-1">
          {/* Tekrar: tıkladıkça sıradaki seçenek */}
          <button
            onClick={() => setRepeat(REPEATS[(REPEATS.indexOf(repeat) + 1) % REPEATS.length])}
            title={tt("Değiştirmek için tıkla")}
            className="flex h-7 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-medium"
            style={{ background: tintBg(ACCENT.yellow, 10), borderColor: tintBg(ACCENT.yellow, 30), color: tintText(ACCENT.yellow) }}
          >
            <Repeat2 size={12} strokeWidth={2.4} />
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={repeat} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }}>
                {REPEAT_LABEL[repeat]}
              </motion.span>
            </AnimatePresence>
          </button>
          <BellToggle silent={silent} onChange={setSilent} />
          </div>
        </div>
        <div className="relative shrink-0">
          <motion.button
            whileTap={{ scale: 0.92 }}
            transition={spring.pop}
            onClick={add}
            className="flex h-[62px] w-12 flex-col items-center justify-center gap-0.5 rounded-[14px] border text-[11px] font-medium"
            style={{ background: tintBg(ACCENT.yellow, editing ? 26 : 16), borderColor: tintBg(ACCENT.yellow, editing ? 60 : 40), color: tintText(ACCENT.yellow) }}
          >
            {editing ? <Check size={16} strokeWidth={2.6} /> : <AlarmClock size={16} strokeWidth={2.4} />}
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
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-well-hi text-label-2 hover:text-label"
              >
                <X size={9} strokeWidth={3} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        {QUICK.map((m) => (
          <button
            key={m}
            onClick={() => quick(m)}
            className="rounded-full bg-well px-2.5 py-0.5 text-[11px] font-medium text-label-2 transition-colors hover:bg-well-hi hover:text-label"
          >
            +{m >= 60 ? tt("{0} sa", m / 60) : tt("{0} dk", m)}
          </button>
        ))}
      </div>

      <div ref={scroller} className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {!alarms.length && <p className="pt-3 text-center text-[11px] text-label-3">{tt("Kurulu alarm yok")}</p>}
        <AnimatePresence initial={false}>
          {alarms.map((a) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={spring.pop}
              className="flex h-9 items-center gap-2 rounded-full border pl-1 pr-1.5"
              style={{
                background: editing === a.id ? tintBg(ACCENT.yellow, 18) : a.enabled ? tintBg(ACCENT.yellow, 9) : "rgb(255 255 255 / 0.03)",
                borderColor: editing === a.id ? tintBg(ACCENT.yellow, 60) : a.enabled ? tintBg(ACCENT.yellow, 26) : "rgb(255 255 255 / 0.05)",
              }}
            >
              {/* Saate/isme tıklayınca üstteki seçicide düzenlenir */}
              <button onClick={() => edit(a)} title={tt("Düzenle")} className="group flex min-w-0 flex-1 items-center gap-2 text-left">
                <MiniNook color={a.enabled ? ACCENT.yellow : "#5a5a62"} size={26} eyes={a.enabled ? "open" : "closed"} />
                <span className="font-display text-[15px] font-medium tabular-nums" style={{ color: a.enabled ? tintText(ACCENT.yellow) : "var(--color-label-3)" }}>
                  {clock(a)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[10.5px] leading-tight text-label-3">
                  <span className="text-label-2">{a.label || REPEAT_LABEL[a.repeat]}</span>
                  {a.enabled && a.next ? ` · ${until(a.next, now)}` : ""}
                </span>
                <Pencil size={10} strokeWidth={2.4} className={`shrink-0 text-label-3 transition-opacity ${editing === a.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
              </button>
              <BellToggle silent={!!a.silent} small onChange={(v) => useNook.getState().setAlarmSilent(a.id, v)} />
              <Toggle on={a.enabled} onChange={(v) => useNook.getState().toggleAlarm(a.id, v)} color={ACCENT.yellow} />
              <button
                onClick={() => useNook.getState().removeAlarm(a.id)}
                className="flex h-5 w-5 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label"
                aria-label={tt("Sil")}
              >
                <X size={11} strokeWidth={2.6} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
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
          className="w-8 rounded-[6px] bg-white/10 text-center font-display text-[24px] font-medium leading-none tabular-nums text-label outline-none"
        />
      ) : (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.button
            key={value}
            onClick={() => setDraft(pad(value))}
            className="w-8 text-center font-display text-[24px] font-medium leading-none tabular-nums text-label"
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
