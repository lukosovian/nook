import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Flag, Pause, Play, RotateCcw, SkipForward, Square } from "lucide-react";
import { swElapsed, swLap, swReset, swText, swToggle } from "../../lib/stopwatch";
import { mmss, nextPhase, pauseFocus, PHASE_LABEL, remaining, resumeFocus, startFocus, stopFocus } from "../../lib/focus";
import { spring } from "../../lib/motion";
import { dayKey, useNook } from "../../store/nook";
import { ACCENT, Segmented, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

const WORK = [
  { id: 15, label: "15" },
  { id: 25, label: "25" },
  { id: 50, label: "50" },
];
const WATER = [
  { id: 0, label: tt("Yok") },
  { id: 45, label: tt("45 dk") },
  { id: 60, label: tt("1 sa") },
  { id: 90, label: tt("90 dk") },
];

const MODES = [
  { id: "focus" as const, label: tt("Pomodoro") },
  { id: "stopwatch" as const, label: tt("Kronometre") },
];

/** Odak: Pomodoro ya da kronometre. Solda büyük halka, sağda kontroller. */
export function FocusPanel() {
  const focus = useNook((s) => s.focus);
  const stopwatch = useNook((s) => s.stopwatch);
  // Kronometre çalışıyor, Pomodoro yoksa doğrudan kronometre açılır
  const [mode, setMode] = useState<"focus" | "stopwatch">(() => (!focus && stopwatch ? "stopwatch" : "focus"));
  return mode === "focus" ? <PomodoroView mode={mode} setMode={setMode} /> : <StopwatchView mode={mode} setMode={setMode} />;
}

function ModeSwitch({ mode, setMode }: { mode: "focus" | "stopwatch"; setMode: (m: "focus" | "stopwatch") => void }) {
  return <Segmented id="focus-mode" options={MODES} value={mode} onChange={setMode} color={mode === "focus" ? ACCENT.red : ACCENT.purple} />;
}

function StopwatchView({ mode, setMode }: { mode: "focus" | "stopwatch"; setMode: (m: "focus" | "stopwatch") => void }) {
  const sw = useNook((s) => s.stopwatch);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(t);
  }, []);
  const color = ACCENT.purple;
  const ms = swElapsed(sw, now);
  const running = !!sw && sw.startedAt !== null;
  const laps = sw?.laps ?? [];
  return (
    <div className="flex h-full flex-col gap-2">
      <ModeSwitch mode={mode} setMode={setMode} />
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: tintText(color) }}>
            {sw ? (running ? tt("Çalışıyor") : tt("Duraklatıldı")) : tt("Hazır")}
          </p>
          <p className={`font-round font-extrabold leading-none tabular-nums tracking-tight text-label ${ms >= 3600_000 ? "text-[34px]" : "text-[44px]"}`}>{swText(ms)}</p>
          {/* Dakika çubuğu: her dakika bir kez dolar */}
          <Progress p={(ms % 60_000) / 60_000} color={color} />
        </div>
        <div className="flex w-[150px] shrink-0 flex-col gap-0.5 overflow-y-auto pr-0.5">
          {!laps.length && <p className="px-1 pt-1 text-[10.5px] leading-snug text-label-3">{tt("Çalışırken bayrağa basınca tur alınır")}</p>}
          {laps.map((t, i) => {
            const split = t - (laps[i + 1] ?? 0);
            return (
              <div key={laps.length - i} className="flex items-center justify-between rounded-[8px] px-2 py-[3px] text-[10.5px] tabular-nums odd:bg-well">
                <span className="text-label-3">{tt("Tur {0}", laps.length - i)}</span>
                <span className="text-label-2">+{swText(split)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-1.5">
        <Big color={color} icon={running ? Pause : Play} label={!sw ? tt("Başlat") : running ? tt("Duraklat") : tt("Devam")} onClick={swToggle} />
        {running && <Small icon={Flag} label={tt("Tur")} onClick={swLap} />}
        {sw && <Small icon={RotateCcw} label={tt("Sıfırla")} onClick={swReset} />}
      </div>
    </div>
  );
}

/**
 * Pomodoro: üstte kip ve süre seçimi, ortada kocaman sayaç ve ilerleme, altta büyük düğme ve
 * odakla ilgili anahtarlar (bekçi, sessiz, göz molası, su).
 */
function PomodoroView({ mode, setMode }: { mode: "focus" | "stopwatch"; setMode: (m: "focus" | "stopwatch") => void }) {
  const focus = useNook((s) => s.focus);
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const today = useNook((st) => st.days[dayKey()]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  const work = !focus || focus.phase === "work";
  const color = work ? ACCENT.red : ACCENT.teal;
  const left = focus ? remaining(focus, now) : s.focusWork * 60_000;
  const p = focus ? 1 - left / focus.total : 0;
  const paused = !!focus && focus.endsAt === null;
  const round = focus?.round ?? 0;
  const label = focus ? (paused ? tt("Duraklatıldı") : PHASE_LABEL[focus.phase]) : tt("{0} dk odak", s.focusWork);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <ModeSwitch mode={mode} setMode={setMode} />
        <Segmented id="work" options={WORK} value={s.focusWork} onChange={(v) => update({ focusWork: v, focusBreak: v >= 50 ? 10 : 5, focusLong: v >= 50 ? 20 : 15 })} color={ACCENT.red} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: tintText(color) }}>
              {label}
            </p>
            <p className="font-round text-[46px] font-extrabold leading-none tabular-nums tracking-tight text-label">{mmss(left)}</p>
          </div>
          <div className="mb-1 text-right">
            {/* Tur noktaları: 4'te bir uzun mola */}
            <div className="flex justify-end gap-1.5" title={tt("{0} tur tamamlandı", round)}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="h-2 w-2 rounded-full" style={{ background: i < round % 4 || (round > 0 && round % 4 === 0 && !work) ? ACCENT.red : "rgb(255 255 255 / 0.12)" }} />
              ))}
            </div>
            <p className="mt-1 text-[10px] text-label-3">{tt("Bugün {0} tur · {1} dk odak", today?.pomodoros ?? 0, today?.focus ?? 0)}</p>
          </div>
        </div>
        <Progress p={p} color={color} />
      </div>

      <div className="flex gap-1.5">
        {!focus ? (
          <Big color={ACCENT.red} icon={Play} label={tt("Başlat")} onClick={() => startFocus("work", 0)} />
        ) : paused ? (
          <Big color={color} icon={Play} label={tt("Devam")} onClick={resumeFocus} />
        ) : (
          <Big color={color} icon={Pause} label={tt("Duraklat")} onClick={pauseFocus} />
        )}
        {focus && <Small icon={SkipForward} label={work ? tt("Molaya geç") : tt("Molayı atla")} onClick={() => nextPhase(false)} />}
        {focus && <Small icon={Square} label={tt("Bitir")} onClick={stopFocus} />}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Chip on={s.focusGuard} label={tt("Odak bekçisi")} hint={tt("Odaktayken YouTube, X gibi siteleri açınca Nook uyarır")} color={ACCENT.red} onClick={() => update({ focusGuard: !s.focusGuard })} />
        <Chip on={s.focusMute} label={tt("Bildirim yok")} hint={tt("Odakta bildirim yok")} color={ACCENT.red} onClick={() => update({ focusMute: !s.focusMute })} />
        <Chip on={s.eyeBreak} label={tt("Göz molası")} hint={tt("Göz molası (20-20-20)")} color={ACCENT.teal} onClick={() => update({ eyeBreak: !s.eyeBreak })} />
        <Chip
          on={s.waterEvery > 0}
          label={s.waterEvery ? tt("Su · {0}", WATER.find((w) => w.id === s.waterEvery)?.label ?? `${s.waterEvery} dk`) : tt("Su yok")}
          hint={tt("Su hatırlatması: tıkla, sıradakine geç")}
          color={ACCENT.blue}
          onClick={() => update({ waterEvery: WATER[(WATER.findIndex((w) => w.id === s.waterEvery) + 1) % WATER.length].id })}
        />
      </div>
    </div>
  );
}

/** İnce ilerleme çubuğu (sayacın altında) */
function Progress({ p, color }: { p: number; color: string }) {
  return (
    <span className="mt-2.5 block h-[6px] overflow-hidden rounded-full bg-white/[0.07]">
      <motion.span
        className="block h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 55%, white))`, boxShadow: `0 0 10px -2px ${color}` }}
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(1, p)) * 100}%` }}
        transition={{ duration: 0.3, ease: "linear" }}
      />
    </span>
  );
}

/** Aç/kapa çipi */
function Chip({ on, label, hint, color, onClick }: { on: boolean; label: string; hint: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={hint}
      className="flex h-6 items-center gap-1.5 rounded-full border px-2 text-[10.5px] font-semibold transition-colors"
      style={on ? { background: tintBg(color, 16), borderColor: tintBg(color, 45), color: tintText(color) } : { background: "rgb(255 255 255 / 0.03)", borderColor: "rgb(255 255 255 / 0.08)", color: "var(--color-label-3)" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: on ? color : "rgb(255 255 255 / 0.2)" }} />
      {label}
    </button>
  );
}

function Big({ color, icon: Icon, label, onClick }: { color: string; icon: typeof Play; label: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      transition={spring.pop}
      onClick={onClick}
      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[12px] text-[12.5px] font-bold text-white"
      style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${color} 88%, white), ${color})`, boxShadow: `0 6px 16px -8px ${color}` }}
    >
      <Icon size={12} strokeWidth={2.6} fill="currentColor" />
      {label}
    </motion.button>
  );
}

function Small({ icon: Icon, label, onClick }: { icon: typeof Play; label: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      transition={spring.pop}
      onClick={onClick}
      title={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-well text-label-2 hover:bg-well-hi hover:text-label"
    >
      <Icon size={12} strokeWidth={2.6} />
    </motion.button>
  );
}
