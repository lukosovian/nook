import { motion } from "motion/react";
import { Headphones, Mouse, type LucideIcon } from "lucide-react";
import { useNook } from "../../store/nook";
import { ACCENT, Bar, levelColor, tintBg, tintText } from "../ui/primitives";
import { pct as fmtPct, tt } from "../../lib/i18n";

/** Lukonnect'ten okunan cihazlar: yan yana kartlar (kulaklık, mouse, vantilatör). Nook yalnızca okur. */
export function DevicesPanel() {
  const devices = useNook((s) => s.devices);
  const { headset, mouse, fan, lukonnect } = devices ?? { headset: null, mouse: null, fan: null, lukonnect: false };
  const charging = headset?.charging === "Şarj oluyor";

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-2">
        <DeviceCard
          icon={Headphones}
          name={tt("Kulaklık")}
          percent={headset?.percent ?? null}
          color={headset ? (charging ? ACCENT.green : levelColor(headset.percent)) : ACCENT.gray}
          chip={headset ? (headset.charging === "Tam dolu" ? tt("Tam dolu") : charging ? tt("Şarjda") : tt("Kablosuz")) : null}
          detail={
            headset
              ? headset.charging === "Tam dolu"
                ? tt("Tam dolu")
                : charging
                  ? tt("Şarj oluyor")
                  : tt("~{0} kaldı", hours((headset.percent / 100) * 80 * 3600))
              : lukonnect
                ? tt("Bulunamadı")
                : tt("Bilgi yok")
          }
          delay={0}
        />
        <DeviceCard
          icon={Mouse}
          name="Mouse"
          percent={mouse?.percent ?? null}
          color={mouse ? levelColor(mouse.percent) : ACCENT.gray}
          chip={mouse ? (mouse.percent <= 20 ? tt("Şarj et") : tt("Kablosuz")) : null}
          detail={mouse ? (mouse.remainingSec > 0 ? tt("~{0} kaldı", hours(mouse.remainingSec)) : tt("Tahmini süre doldu")) : tt("Bilgi yok")}
          delay={0.04}
        />
        <FanCard on={fan?.on ?? false} speed={fan?.speed ?? 0} reachable={!!fan} />
      </div>
      <p className="flex shrink-0 items-center gap-1.5 px-1 text-[10px] text-label-3">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: lukonnect ? ACCENT.green : ACCENT.orange, boxShadow: `0 0 6px ${lukonnect ? ACCENT.green : ACCENT.orange}` }} />
        {lukonnect ? tt("Lukonnect'e bağlı · canlı") : tt("Lukonnect kapalı — bilgiler güncel değil")}
      </p>
    </div>
  );
}

const hours = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? tt("{0} sa {1} dk", h, m) : tt("{0} dk", m);
};

function DeviceCard({
  icon: Icon,
  name,
  percent,
  color,
  chip,
  detail,
  delay,
}: {
  icon: LucideIcon;
  name: string;
  percent: number | null;
  color: string;
  chip: string | null;
  detail: string;
  delay: number;
}) {
  const low = percent !== null && percent <= 15;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 30, delay }}
      className="flex min-w-0 flex-col rounded-[16px] border px-3 pb-3 pt-2.5"
      style={{ background: `linear-gradient(160deg, ${tintBg(color, 12)}, ${tintBg(color, 3)})`, borderColor: tintBg(color, 30) }}
    >
      <div className="flex items-center justify-between gap-1">
        <motion.span
          className="flex h-8 w-8 items-center justify-center rounded-[11px]"
          style={{ background: tintBg(color, 22), color: tintText(color) }}
          animate={low ? { scale: [1, 1.1, 1] } : { scale: 1 }}
          transition={low ? { duration: 1.1, repeat: Infinity } : undefined}
        >
          <Icon size={16} strokeWidth={2.3} />
        </motion.span>
        {chip && (
          <span className="truncate rounded-[6px] px-1.5 py-[1px] text-[9px] font-bold" style={{ background: tintBg(color, 18), color: tintText(color) }}>
            {chip}
          </span>
        )}
      </div>
      <div className="mt-auto">
        <p className="text-[11px] font-semibold text-label-2">{name}</p>
        <p className="font-round text-[28px] font-extrabold leading-none tabular-nums" style={{ color: tintText(color) }}>
          {percent === null ? "—" : fmtPct(percent)}
        </p>
        <p className="mt-1 truncate text-[10px] text-label-3">{detail}</p>
        <Bar pct={percent ?? 0} color={color} className="mt-1.5" />
      </div>
    </motion.div>
  );
}

function FanCard({ on, speed, reachable }: { on: boolean; speed: number; reachable: boolean }) {
  const color = reachable && on ? ACCENT.blue : ACCENT.gray;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 30, delay: 0.08 }}
      className="flex min-w-0 flex-col rounded-[16px] border px-3 pb-3 pt-2.5"
      style={{ background: `linear-gradient(160deg, ${tintBg(color, 12)}, ${tintBg(color, 3)})`, borderColor: tintBg(color, 30) }}
    >
      <div className="flex items-center justify-between">
        <motion.span
          animate={{ rotate: reachable && on ? 360 : 0 }}
          transition={reachable && on ? { duration: Math.max(0.4, 2.2 - speed / 50), repeat: Infinity, ease: "linear" } : { duration: 0.8 }}
          className="flex"
        >
          <svg width="34" height="34" viewBox="0 0 26 26">
            {[0, 120, 240].map((a) => (
              <ellipse key={a} cx="13" cy="7" rx="3.4" ry="6" fill={color} opacity="0.85" transform={`rotate(${a} 13 13)`} />
            ))}
            <circle cx="13" cy="13" r="3" fill="#0d0d0f" stroke={color} strokeWidth="1.2" />
          </svg>
        </motion.span>
        <span className="rounded-[6px] px-1.5 py-[1px] text-[9px] font-bold" style={{ background: tintBg(color, 18), color: tintText(color) }}>
          {!reachable ? tt("Yok") : on ? tt("Açık") : tt("Kapalı")}
        </span>
      </div>
      <div className="mt-auto">
        <p className="text-[11px] font-semibold text-label-2">{tt("Vantilatör")}</p>
        <p className="font-round text-[28px] font-extrabold leading-none tabular-nums" style={{ color: tintText(color) }}>
          {!reachable || !on ? "—" : speed}
        </p>
        <p className="mt-1 truncate text-[10px] text-label-3">{!reachable ? tt("Bağlanılamadı") : on ? tt("Hız {0}", speed) : tt("Beklemede")}</p>
        <Bar pct={reachable && on ? speed : 0} color={color} className="mt-1.5" />
      </div>
    </motion.div>
  );
}
