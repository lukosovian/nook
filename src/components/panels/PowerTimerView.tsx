/**
 * Kontrol › Zamanlı kapat: hazır sürelerden ya da saat seçerek bilgisayarı kapat / yeniden başlat / uyut.
 * Kuruluyken büyük geri sayım, +15 dk ve iptal. Telefondan kurulan zamanlayıcı da burada görünür.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, Moon, Plus, Power, RotateCcw, X, type LucideIcon } from "lucide-react";
import { ACTION_LABEL, leftText, setPowerTimer, usePowerTimer, type PowerTimerAction } from "../../lib/powerTimer";
import { spring } from "../../lib/motion";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { locale, tt } from "../../lib/i18n";

const PRESETS = [15, 30, 45, 60, 90, 120, 180];
const ACTIONS: { id: PowerTimerAction; icon: LucideIcon; color: string }[] = [
  { id: "shutdown", icon: Power, color: ACCENT.red },
  { id: "restart", icon: RotateCcw, color: ACCENT.orange },
  { id: "sleep", icon: Moon, color: ACCENT.blue },
];
const presetLabel = (m: number) => (m < 60 ? tt("{0} dk", m) : m % 60 ? tt("{0} sa {1} dk", Math.floor(m / 60), m % 60) : tt("{0} sa", m / 60));

export function PowerTimerView({ onBack }: { onBack: () => void }) {
  const timer = usePowerTimer((s) => s.timer);
  const [action, setAction] = useState<PowerTimerAction>(timer?.action ?? "shutdown");
  const [clock, setClock] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const color = ACTIONS.find((a) => a.id === (timer?.action ?? action))!.color;

  const run = (at: number | null, act: PowerTimerAction = action) => {
    setError(null);
    void setPowerTimer(at, act).catch((e) => setError(String(e)));
  };
  /** "23:30" → bugün (geçtiyse yarın) o saat */
  const atClock = () => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(clock);
    if (!m) return;
    const d = new Date();
    d.setHours(+m[1], +m[2], 0, 0);
    if (d.getTime() <= Date.now() + 10_000) d.setDate(d.getDate() + 1);
    run(d.getTime());
  };

  return (
    <div className="flex h-full min-w-0 flex-col gap-2">
      <div className="flex items-center gap-1">
        <button onClick={onBack} className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label" title={tt("Geri")}>
          <ChevronLeft size={13} strokeWidth={2.4} />
        </button>
        <span className="text-[11.5px] font-medium text-label-2">{tt("Zamanlı kapat")}</span>
        {timer?.from === "phone" && <span className="ml-auto text-[10px] text-label-3">{tt("telefondan kuruldu")}</span>}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {timer ? (
          <motion.div
            key="on"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex min-h-0 flex-1 items-center gap-4 rounded-[18px] border px-5"
            style={{ background: `linear-gradient(140deg, ${tintBg(color, 16)}, ${tintBg(color, 4)})`, borderColor: tintBg(color, 36) }}
          >
            <Ring left={timer.at - now} color={color} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold" style={{ color: tintText(color) }}>
                {ACTION_LABEL[timer.action]} · {new Date(timer.at).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="font-round text-[30px] font-extrabold leading-tight tabular-nums text-label">{leftText(timer.at - now)}</p>
              <p className="text-[10.5px] text-label-3">{tt("Son dakikada seni uyaracağım")}</p>
              <div className="mt-2.5 flex gap-1.5">
                <Chip onClick={() => run(timer.at + 15 * 60_000, timer.action)} color={color}>
                  <Plus size={11} strokeWidth={2.8} /> {tt("15 dk")}
                </Chip>
                <Chip onClick={() => run(null)} color={ACCENT.gray}>
                  <X size={11} strokeWidth={2.8} /> {tt("Vazgeç")}
                </Chip>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="off" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="flex min-h-0 flex-1 flex-col gap-2">
            {/* Ne yapsın */}
            <div className="grid grid-cols-3 gap-1.5">
              {ACTIONS.map((a) => {
                const on = a.id === action;
                return (
                  <motion.button
                    key={a.id}
                    whileTap={{ scale: 0.95 }}
                    transition={spring.pop}
                    onClick={() => setAction(a.id)}
                    className="flex items-center justify-center gap-1.5 rounded-[12px] border py-1.5 text-[11.5px] font-semibold"
                    style={on ? { background: tintBg(a.color, 18), borderColor: tintBg(a.color, 45), color: tintText(a.color) } : { background: "rgb(255 255 255 / 0.03)", borderColor: "rgb(255 255 255 / 0.06)", color: "var(--color-label-3)" }}
                  >
                    <a.icon size={12} strokeWidth={2.5} />
                    {ACTION_LABEL[a.id]}
                  </motion.button>
                );
              })}
            </div>
            {/* Ne zaman */}
            <div className="grid min-h-0 flex-1 grid-cols-4 gap-1.5" style={{ gridAutoRows: "minmax(0, 1fr)" }}>
              {PRESETS.map((m) => (
                <motion.button
                  key={m}
                  whileTap={{ scale: 0.94 }}
                  transition={spring.pop}
                  onClick={() => run(Date.now() + m * 60_000)}
                  className="flex min-h-0 flex-col items-center justify-center rounded-[14px] border border-white/[0.06] bg-white/[0.03] transition-colors hover:bg-white/[0.07]"
                >
                  <span className="text-[13px] font-bold text-label">{presetLabel(m)}</span>
                  <span className="text-[9.5px] text-label-3">{tt("sonra")}</span>
                </motion.button>
              ))}
              {/* Belirli saatte */}
              <label className="flex min-h-0 flex-col items-center justify-center gap-0.5 rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-1">
                <input
                  type="time"
                  value={clock}
                  onChange={(e) => setClock(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && atClock()}
                  className="w-full bg-transparent text-center text-[12.5px] font-bold text-label outline-none [color-scheme:dark]"
                />
                <button onClick={atClock} disabled={!clock} className="rounded-full px-2 text-[9.5px] font-semibold disabled:opacity-40" style={{ color: tintText(ACCENT.red) }}>
                  {tt("bu saatte")}
                </button>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p className="shrink-0 truncate text-[10px] text-red/90">{error}</p>}
    </div>
  );
}

/** Son saatin ne kadarı kaldıysa o kadar dolu halka (bir saatten uzunsa tam) */
function Ring({ left, color }: { left: number; color: string }) {
  const r = 30;
  const len = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, left / 3_600_000));
  return (
    <span className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center">
      <svg width={76} height={76} className="absolute inset-0 -rotate-90">
        <circle cx={38} cy={38} r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={6} />
        <motion.circle cx={38} cy={38} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeDasharray={len} initial={false} animate={{ strokeDashoffset: len * (1 - frac) }} transition={{ duration: 0.6 }} />
      </svg>
      <Power size={20} strokeWidth={2.5} style={{ color: tintText(color) }} />
    </span>
  );
}

function Chip({ onClick, color, children }: { onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="flex items-center gap-1 rounded-full border px-2.5 py-[3px] text-[11px] font-semibold"
      style={{ background: tintBg(color, 14), borderColor: tintBg(color, 36), color: tintText(color) }}
    >
      {children}
    </motion.button>
  );
}
