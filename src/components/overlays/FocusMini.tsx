import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Coffee, Pause, Target } from "lucide-react";
import { mmss, remaining } from "../../lib/focus";
import { ISLAND } from "../../lib/layout";
import { useNook } from "../../store/nook";
import { ACCENT } from "../ui/primitives";

/** Kapalı adada süren odak: solda dolan halka + ikon, sağda kalan süre. */
export function FocusMini() {
  const focus = useNook((s) => s.focus);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);
  if (!focus) return null;

  const work = focus.phase === "work";
  const paused = focus.endsAt === null;
  const color = work ? ACCENT.red : ACCENT.teal;
  const left = remaining(focus, now);
  const p = 1 - left / focus.total;
  const size = 22;
  const r = 9;
  const c = 2 * Math.PI * r;
  const top = (ISLAND.collapsed.height - size) / 2;
  const Icon = paused ? Pause : work ? Target : Coffee;

  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      <div className="absolute left-2 flex items-center justify-center" style={{ top, width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 22 22" className="absolute inset-0 -rotate-90">
          <circle cx="11" cy="11" r={r} fill="none" stroke="rgb(255 255 255 / 0.13)" strokeWidth="2.2" />
          <circle cx="11" cy="11" r={r} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
        </svg>
        <Icon size={9} strokeWidth={3} style={{ color }} />
      </div>
      <motion.span
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[11.5px] font-medium tabular-nums"
        style={{ color }}
        animate={{ opacity: paused ? [1, 0.35, 1] : 1 }}
        transition={paused ? { duration: 1.4, repeat: Infinity } : { duration: 0.2 }}
      >
        {mmss(left)}
      </motion.span>
    </motion.div>
  );
}
