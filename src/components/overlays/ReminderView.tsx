import { AnimatePresence, motion } from "motion/react";
import { Clock, Droplet } from "lucide-react";
import { drankWater, snoozeWater } from "../../hooks/useFeatures";
import { spring } from "../../lib/motion";
import { dayKey, useNook } from "../../store/nook";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

const COLOR = ACCENT.blue;

/** Su hatırlatması: "İçtim" diyene kadar adada durur; içince Nook da bardağıyla içer. */
export function ReminderView() {
  const reminder = useNook((s) => s.reminder);
  const today = useNook((s) => s.days[dayKey()]?.water ?? 0);
  if (!reminder) return null;
  const drinking = reminder.phase === "drinking";

  return (
    <motion.div
      className="absolute inset-y-0 left-[66px] right-3 flex items-center gap-2"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0, transition: { delay: 0.08, duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={reminder.phase}
          className="min-w-0 flex-1"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
        >
          <p className="flex items-center gap-1.5 text-[14px] font-medium leading-tight" style={{ color: tintText(COLOR) }}>
            <motion.span animate={drinking ? { y: [0, -2, 0] } : { y: [0, -2.5, 0] }} transition={{ duration: 1.2, repeat: Infinity }} className="flex">
              <Droplet size={14} strokeWidth={2.4} fill="currentColor" />
            </motion.span>
            {drinking ? tt("Afiyet olsun!") : tt("Su içme vakti")}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-label-2">
            {drinking ? tt("Bugün {0}. bardak", today) : today ? tt("Bugün {0} bardak içtin, bir tane daha?", today) : tt("Benimle bir bardak su içer misin?")}
          </p>
        </motion.div>
      </AnimatePresence>
      {!drinking && (
        <>
          <Action icon={Clock} label={tt("Sonra")} title={tt("15 dakika sonra hatırlat")} color={ACCENT.gray} onClick={snoozeWater} />
          <Action icon={Droplet} label={tt("İçtim")} title={tt("İçtim / içiyorum")} color={COLOR} onClick={drankWater} strong />
        </>
      )}
    </motion.div>
  );
}

function Action({ icon: Icon, label, title, color, onClick, strong }: { icon: typeof Clock; label: string; title: string; color: string; onClick: () => void; strong?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={spring.pop}
      onClick={onClick}
      title={title}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium"
      style={{
        background: tintBg(color, strong ? 26 : 12),
        borderColor: tintBg(color, strong ? 60 : 32),
        color: tintText(color),
        boxShadow: strong ? `0 0 16px -4px ${color}` : undefined,
      }}
    >
      <Icon size={13} strokeWidth={2.5} fill={strong ? "currentColor" : "none"} />
      {label}
    </motion.button>
  );
}
