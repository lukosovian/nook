import { motion } from "motion/react";
import { ArrowDown } from "lucide-react";
import { formatSize } from "../../lib/format";
import { ISLAND } from "../../lib/layout";
import { useNook } from "../../store/nook";

/** Kapalı adada süren indirme: solda dönen halka + ok, sağda hız. */
export function DownloadMini() {
  const downloads = useNook((s) => s.downloads);
  const speed = downloads.reduce((a, d) => a + d.speed, 0);
  const size = 22;
  const top = (ISLAND.collapsed.height - size) / 2;

  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      <div className="absolute left-2 flex items-center justify-center" style={{ top, width: size, height: size }}>
        <motion.svg
          width={size}
          height={size}
          viewBox="0 0 22 22"
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
        >
          <circle cx="11" cy="11" r="9" fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="2.2" />
          <circle cx="11" cy="11" r="9" fill="none" stroke="var(--color-sys-blue)" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="16 60" />
        </motion.svg>
        <ArrowDown size={11} strokeWidth={3} className="text-sys-blue" />
      </div>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-display text-[11px] font-medium tabular-nums text-sys-blue">
        {speed > 0 ? `${formatSize(speed)}/s` : downloads.length > 1 ? `${downloads.length} dosya` : "…"}
      </span>
    </motion.div>
  );
}
