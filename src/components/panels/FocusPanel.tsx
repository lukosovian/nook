import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Pause, Play, SkipForward, Square } from "lucide-react";
import { mmss, nextPhase, pauseFocus, PHASE_LABEL, remaining, resumeFocus, startFocus, stopFocus } from "../../lib/focus";
import { spring } from "../../lib/motion";
import { dayKey, useNook } from "../../store/nook";
import { ACCENT, Segmented, tintBg, tintText, Toggle } from "../ui/primitives";

const WORK = [
  { id: 15, label: "15" },
  { id: 25, label: "25" },
  { id: 50, label: "50" },
];
const WATER = [
  { id: 0, label: "Yok" },
  { id: 45, label: "45 dk" },
  { id: 60, label: "1 sa" },
  { id: 90, label: "90 dk" },
];

/** Odak: solda büyük halka ve kalan süre, sağda kontroller ve mola hatırlatıcıları. */
export function FocusPanel() {
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
      <div className="flex w-[118px] shrink-0 flex-col items-center justify-center gap-2">
        <Ring p={p} color={color}>
          <span className="text-[24px] font-medium leading-none tabular-nums tracking-tight text-label">{mmss(left)}</span>
          <span className="mt-1 text-[10.5px] font-medium" style={{ color: tintText(color) }}>
            {focus ? (paused ? "Duraklatıldı" : PHASE_LABEL[focus.phase]) : "Hazır"}
          </span>
        </Ring>
        {/* Tur noktaları: 4'te bir uzun mola */}
        <div className="flex gap-1.5" title={`${round} tur tamamlandı`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i < round % 4 || (round > 0 && round % 4 === 0 && !work) ? ACCENT.red : "rgb(255 255 255 / 0.12)" }} />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex gap-1.5">
          {!focus ? (
            <Big color={ACCENT.red} icon={Play} label="Başlat" onClick={() => startFocus("work", 0)} />
          ) : paused ? (
            <Big color={color} icon={Play} label="Devam" onClick={resumeFocus} />
          ) : (
            <Big color={color} icon={Pause} label="Duraklat" onClick={pauseFocus} />
          )}
          {focus && <Small icon={SkipForward} label={work ? "Molaya geç" : "Molayı atla"} onClick={() => nextPhase(false)} />}
          {focus && <Small icon={Square} label="Bitir" onClick={stopFocus} />}
        </div>
        <p className="px-1 text-[10.5px] text-label-3">
          Bugün {today?.pomodoros ?? 0} tur · {today?.focus ?? 0} dk odak
        </p>

        <div className="mt-auto divide-y divide-white/[0.05]">
          <Row label="Süre (dk)">
            <Segmented id="work" options={WORK} value={s.focusWork} onChange={(v) => update({ focusWork: v, focusBreak: v >= 50 ? 10 : 5, focusLong: v >= 50 ? 20 : 15 })} color={ACCENT.red} />
          </Row>
          <Row label="Odak bekçisi (YouTube, X…)">
            <Toggle on={s.focusGuard} onChange={(v) => update({ focusGuard: v })} color={ACCENT.red} />
          </Row>
          <Row label="Odakta bildirim yok">
            <Toggle on={s.focusMute} onChange={(v) => update({ focusMute: v })} color={ACCENT.red} />
          </Row>
          <Row label="Göz molası (20-20-20)">
            <Toggle on={s.eyeBreak} onChange={(v) => update({ eyeBreak: v })} />
          </Row>
          <Row label="Su">
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
