import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CalendarClock, Timer } from "lucide-react";
import { nextEvent } from "../../hooks/useCalendarFeed";
import { ISLAND } from "../../lib/layout";
import { swElapsed, swText } from "../../lib/stopwatch";
import { useNook } from "../../store/nook";
import { ACCENT } from "../ui/primitives";
import { tt } from "../../lib/i18n";

function useNow(ms: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

/** Solda dolan halka + ikon, sağda yazı (kapalı adadaki öbür göstergelerle aynı düzen) */
function Mini({ p, color, icon: Icon, text, blink }: { p: number; color: string; icon: typeof Timer; text: string; blink?: boolean }) {
  const size = 22;
  const r = 9;
  const c = 2 * Math.PI * r;
  const top = (ISLAND.collapsed.height - size) / 2;
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
          <circle cx="11" cy="11" r={r} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, p)))} />
        </svg>
        <Icon size={9} strokeWidth={3} style={{ color }} />
      </div>
      <motion.span
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[11.5px] font-medium tabular-nums"
        style={{ color }}
        animate={{ opacity: blink ? [1, 0.35, 1] : 1 }}
        transition={blink ? { duration: 1.4, repeat: Infinity } : { duration: 0.2 }}
      >
        {text}
      </motion.span>
    </motion.div>
  );
}

/** Kapalı adada çalışan kronometre */
export function StopwatchMini() {
  const sw = useNook((s) => s.stopwatch);
  const now = useNow(500);
  const ms = swElapsed(sw, now);
  return <Mini p={(ms % 60_000) / 60_000} color={ACCENT.purple} icon={Timer} text={swText(ms, false)} blink={!!sw && sw.startedAt === null} />;
}

/** Kapalı adada sıradaki etkinliğe geri sayım (ya da süren etkinlikte kalan süre) */
export function EventMini() {
  const now = useNow(5000);
  // Dizileri seç, hesabı dışarıda yap (seçici her seferinde yeni nesne dönerse sonsuz döngü olur)
  const events = useNook((s) => s.events);
  const ext = useNook((s) => s.extEvents);
  const ev = nextEvent({ events, extEvents: ext }, now);
  if (!ev) return null;
  const ongoing = ev.start <= now && !!ev.end;
  const left = Math.max(0, ongoing ? ev.end! - now : ev.start - now);
  const mins = Math.ceil(left / 60_000);
  const p = ongoing ? (now - ev.start) / (ev.end! - ev.start) : 1 - left / 3600_000;
  const text = !ongoing && mins <= 1 ? tt("şimdi") : ongoing ? tt("{0} dk kaldı", mins) : tt("{0} dk", mins);
  return <Mini p={p} color={ongoing ? ACCENT.green : ACCENT.blue} icon={CalendarClock} text={text} blink={!ongoing && mins <= 5} />;
}

/**
 * Kapalı adada geri sayım: "soon" 1 saat içinde başlayacak ya da süren etkinlik var;
 * "urgent" başlamasına 15 dk'dan az ya da bitmesine 10 dk'dan az kaldı (müzik çalarken yalnızca o zaman öne geçer)
 */
export function useEventSoon(): { soon: boolean; urgent: boolean } {
  const now = useNow(15_000);
  const soon = useNook((s) => s.settings.calCountdown && !!nextEvent(s, now));
  const urgent = useNook((s) => {
    if (!s.settings.calCountdown) return false;
    const ev = nextEvent(s, now);
    if (!ev) return false;
    return ev.start > now ? ev.start - now <= 15 * 60_000 : !!ev.end && ev.end - now <= 10 * 60_000;
  });
  return { soon, urgent };
}
