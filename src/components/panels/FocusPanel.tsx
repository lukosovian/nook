import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Flag, Pause, Play, RotateCcw, SkipForward, Square } from "lucide-react";
import { swElapsed, swLap, swReset, swText, swToggle } from "../../lib/stopwatch";
import { mmss, nextPhase, pauseFocus, PHASE_LABEL, remaining, resumeFocus, startFocus, stopFocus } from "../../lib/focus";
import { spring } from "../../lib/motion";
import { dayKey, useNook } from "../../store/nook";
import { ACCENT, Segmented, tintBg, tintText, Toggle } from "../ui/primitives";
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
    <div className="flex h-full gap-3">
      <div className="flex w-[124px] shrink-0 flex-col items-center justify-center gap-2">
        <ModeSwitch mode={mode} setMode={setMode} />
        {/* Halka her dakika bir tur atar */}
        <Ring p={(ms % 60_000) / 60_000} color={color}>
          <span className={`font-medium leading-none tabular-nums tracking-tight text-label ${ms >= 3600_000 ? "text-[17px]" : "text-[21px]"}`}>{swText(ms)}</span>
          <span className="mt-1 text-[10.5px] font-medium" style={{ color: tintText(color) }}>
            {sw ? (running ? tt("Çalışıyor") : tt("Duraklatıldı")) : tt("Hazır")}
          </span>
        </Ring>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex gap-1.5">
          <Big color={color} icon={running ? Pause : Play} label={!sw ? tt("Başlat") : running ? tt("Duraklat") : tt("Devam")} onClick={swToggle} />
          {running && <Small icon={Flag} label={tt("Tur")} onClick={swLap} />}
          {sw && <Small icon={RotateCcw} label={tt("Sıfırla")} onClick={swReset} />}
        </div>
        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
          {!laps.length && <p className="px-1 pt-1 text-[10.5px] text-label-3">{tt("Çalışırken bayrağa basınca tur alınır")}</p>}
          {laps.map((t, i) => {
            const split = t - (laps[i + 1] ?? 0);
            return (
              <div key={laps.length - i} className="flex items-center justify-between rounded-[8px] px-2 py-[3px] text-[11px] tabular-nums odd:bg-well">
                <span className="text-label-3">{tt("Tur {0}", laps.length - i)}</span>
                <span className="text-label-2">+{swText(split)}</span>
                <span className="text-label">{swText(t)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div className="flex h-full gap-3">
      <div className="flex w-[124px] shrink-0 flex-col items-center justify-center gap-2">
        <ModeSwitch mode={mode} setMode={setMode} />
        <Ring p={p} color={color}>
          <span className="text-[24px] font-medium leading-none tabular-nums tracking-tight text-label">{mmss(left)}</span>
          <span className="mt-1 text-[10.5px] font-medium" style={{ color: tintText(color) }}>
            {focus ? (paused ? tt("Duraklatıldı") : PHASE_LABEL[focus.phase]) : tt("Hazır")}
          </span>
        </Ring>
        {/* Tur noktaları: 4'te bir uzun mola */}
        <div className="flex gap-1.5" title={tt("{0} tur tamamlandı", round)}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i < round % 4 || (round > 0 && round % 4 === 0 && !work) ? ACCENT.red : "rgb(255 255 255 / 0.12)" }} />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
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
        <p className="px-1 text-[10.5px] text-label-3">{tt("Bugün {0} tur · {1} dk odak", today?.pomodoros ?? 0, today?.focus ?? 0)}</p>

        <div className="mt-auto divide-y divide-white/[0.05]">
          <Row label={tt("Süre (dk)")}>
            <Segmented id="work" options={WORK} value={s.focusWork} onChange={(v) => update({ focusWork: v, focusBreak: v >= 50 ? 10 : 5, focusLong: v >= 50 ? 20 : 15 })} color={ACCENT.red} />
          </Row>
          <Row label={tt("Odak bekçisi (YouTube, X…)")}>
            <Toggle on={s.focusGuard} onChange={(v) => update({ focusGuard: v })} color={ACCENT.red} />
          </Row>
          <Row label={tt("Odakta bildirim yok")}>
            <Toggle on={s.focusMute} onChange={(v) => update({ focusMute: v })} color={ACCENT.red} />
          </Row>
          <Row label={tt("Göz molası (20-20-20)")}>
            <Toggle on={s.eyeBreak} onChange={(v) => update({ eyeBreak: v })} />
          </Row>
          <Row label={tt("Su")}>
            <Segmented id="water" options={WATER} value={s.waterEvery} onChange={(v) => update({ waterEvery: v })} color={ACCENT.blue} />
          </Row>
        </div>
      </div>
    </div>
  );
}

function Ring({ p, color, children }: { p: number; color: string; children: React.ReactNode }) {
  const size = 112;
  const r = 50;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="6" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - p) }}
          transition={{ duration: 0.3, ease: "linear" }}
          style={{ filter: `drop-shadow(0 0 5px ${color})` }}
        />
      </svg>
      <div className="relative flex flex-col items-center">{children}</div>
    </div>
  );
}

function Big({ color, icon: Icon, label, onClick }: { color: string; icon: typeof Play; label: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      transition={spring.pop}
      onClick={onClick}
      className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full border text-[12px] font-medium"
      style={{ background: tintBg(color, 22), borderColor: tintBg(color, 50), color: tintText(color), boxShadow: `0 0 14px -6px ${color}` }}
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
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-well text-label-2 hover:bg-well-hi hover:text-label"
    >
      <Icon size={12} strokeWidth={2.6} />
    </motion.button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[27px] items-center justify-between gap-2 py-0.5">
      <span className="truncate text-[11.5px] text-label-2">{label}</span>
      {children}
    </div>
  );
}
