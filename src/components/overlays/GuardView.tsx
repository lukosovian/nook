import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { BellOff, Clock } from "lucide-react";
import { muteGuardForPhase, snoozeGuard } from "../../hooks/useOutings";
import { mmss, remaining } from "../../lib/focus";
import { spring } from "../../lib/motion";
import { useNook } from "../../store/nook";
import { ACCENT, tintBg, tintText } from "../ui/primitives";

const COLOR = ACCENT.red;
/** Nook'un vuruşlarıyla (Props/Knock) aynı ritim */
const KNOCK = { duration: 1.6, times: [0, 0.19, 0.22, 0.25, 0.39, 0.42, 0.45, 1] };

/**
 * Odak bekçisi: Pomodoro sürerken yasaklı bir siteye girince Nook camı (adayı) tıklatır,
 * elindeki saati gösterir: "Çalışmıyor muyduk?". Oradan çıkınca kendiliğinden kapanır.
 */
export function GuardView() {
  const guard = useNook((s) => s.guard);
  const focus = useNook((s) => s.focus);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);
  if (!guard) return null;
  const left = focus ? remaining(focus, now) : 0;

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.08, duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      {/* Cam: çapraz parıltılar, her vuruşta titrer */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{ x: [0, 0, -1.2, 0, 0, -1.2, 0, 0] }}
        transition={{ ...KNOCK, repeat: Infinity }}
        style={{
          background:
            "linear-gradient(115deg, transparent 0 18%, rgba(255,255,255,0.05) 18% 24%, transparent 24% 29%, rgba(255,255,255,0.035) 29% 31%, transparent 31%), linear-gradient(115deg, transparent 0 70%, rgba(255,255,255,0.03) 70% 76%, transparent 76%)",
        }}
      />
      <div className="absolute inset-y-0 left-[94px] right-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[14.5px] font-semibold leading-tight" style={{ color: tintText(COLOR) }}>
            Çalışmıyor muyduk?
            <motion.span
              className="text-[10px] font-medium text-label-3"
              animate={{ opacity: [0, 0, 1, 0.4, 0.4, 1, 0, 0], y: [2, 2, 0, 0, 0, 0, -2, -2] }}
              transition={{ ...KNOCK, repeat: Infinity }}
            >
              tık tık
            </motion.span>
          </p>
          <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-label-2">
            <span className="truncate">{guard.site} açık</span>
            <span className="text-label-3">·</span>
            <Clock size={10} strokeWidth={2.6} style={{ color: tintText(COLOR) }} />
            <span className="font-medium tabular-nums" style={{ color: tintText(COLOR) }}>
              {mmss(left)}
            </span>
            <span>kaldı</span>
          </p>
        </div>
        <Action icon={Clock} label="5 dk izin" title="5 dakika uyarma" onClick={snoozeGuard} />
        <Action icon={BellOff} label="Bu tur sus" title="Bu çalışma turunda bir daha uyarma" onClick={muteGuardForPhase} />
      </div>
    </motion.div>
  );
}

function Action({ icon: Icon, label, title, onClick }: { icon: typeof Clock; label: string; title: string; onClick: () => void }) {
  const color = ACCENT.gray;
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={spring.pop}
      onClick={onClick}
      title={title}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-medium"
      style={{ background: tintBg(color, 12), borderColor: tintBg(color, 32), color: tintText(color) }}
    >
      <Icon size={12} strokeWidth={2.5} />
      {label}
    </motion.button>
  );
}
