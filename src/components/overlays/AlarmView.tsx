import { motion } from "motion/react";
import { AlarmClock, BellOff, Check, Pill, Timer } from "lucide-react";
import { stopAlarm } from "../../hooks/useAlarms";
import { clock, isMedicine } from "../../lib/alarm";
import { spring } from "../../lib/motion";
import { useNook } from "../../store/nook";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

/** Çalan alarm: solda titreyen Nook, ortada saat ve isim, sağda Ertele / Kapat. Karta tıklamak ya da Esc de kapatır. */
export function AlarmView() {
  const ringing = useNook((s) => s.ringing);
  if (!ringing) return null;
  // İlaç alarmı: hap simgesi, "Kapat" yerine "Aldım"
  const pill = isMedicine(ringing.label);

  return (
    <motion.div
      className="absolute inset-y-0 left-[66px] right-3 flex cursor-pointer items-center gap-3"
      onClick={() => stopAlarm()}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0, transition: { delay: 0.08, duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-display text-[20px] font-medium leading-none tabular-nums" style={{ color: tintText(ACCENT.yellow) }}>
          <motion.span animate={{ rotate: [0, -18, 18, -18, 18, 0] }} transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.4 }} className="flex">
            {pill ? <Pill size={17} strokeWidth={2.4} /> : <AlarmClock size={17} strokeWidth={2.4} />}
          </motion.span>
          {clock(ringing)}
        </p>
        <p className="mt-1 truncate text-[11px] text-label-2">{ringing.label || tt("Alarm")}</p>
        <p className="mt-0.5 truncate text-[9.5px] text-label-3">{tt("Esc ya da dokun: kapat")}</p>
      </div>
      <Action icon={Timer} label={tt("5 dk")} color={ACCENT.blue} onClick={() => stopAlarm(5)} />
      {pill ? (
        <Action icon={Check} label={tt("Aldım")} color={ACCENT.green} onClick={() => stopAlarm()} strong />
      ) : (
        <Action icon={BellOff} label={tt("Kapat")} color={ACCENT.yellow} onClick={() => stopAlarm()} strong />
      )}
    </motion.div>
  );
}

function Action({
  icon: Icon,
  label,
  color,
  onClick,
  strong,
}: {
  icon: typeof Timer;
  label: string;
  color: string;
  onClick: () => void;
  strong?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={spring.pop}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={label === "5 dk" ? tt("5 dakika ertele") : tt("Alarmı kapat")}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium"
      style={{
        background: tintBg(color, strong ? 26 : 14),
        borderColor: tintBg(color, strong ? 60 : 38),
        color: tintText(color),
        boxShadow: strong ? `0 0 16px -4px ${color}` : undefined,
      }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {label}
    </motion.button>
  );
}
