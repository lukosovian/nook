import { motion } from "motion/react";
import { useNook } from "../../store/nook";
import { ACCENT, Bar, levelColor, MiniNook, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

/** Lukonnect'ten okunan cihazlar — Grok Bot'taki renkli ajan çipleri gibi. Nook yalnızca okur. */
export function DevicesPanel() {
  const devices = useNook((s) => s.devices);
  const { headset, mouse, fan, lukonnect } = devices ?? { headset: null, mouse: null, fan: null, lukonnect: false };
  const charging = headset?.charging === "Şarj oluyor";

  return (
    <div className="flex h-full flex-col gap-1.5">
      <DeviceRow
        name={tt("Kulaklık")}
        percent={headset?.percent ?? null}
        color={headset ? (charging ? ACCENT.green : levelColor(headset.percent)) : ACCENT.gray}
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
      />
      <DeviceRow
        name="Mouse"
        percent={mouse?.percent ?? null}
        color={mouse ? levelColor(mouse.percent) : ACCENT.gray}
        detail={mouse ? (mouse.remainingSec > 0 ? tt("~{0} kaldı", hours(mouse.remainingSec)) : tt("Tahmini süre doldu")) : tt("Bilgi yok")}
      />
      <FanRow on={fan?.on ?? false} speed={fan?.speed ?? 0} reachable={!!fan} />
      {!lukonnect && (
        <p className="mt-auto flex items-center gap-1.5 text-[10px] text-label-3">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT.orange }} />{tt("Lukonnect kapalı — bilgiler güncel değil")}</p>
      )}
    </div>
  );
}

const hours = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? tt("{0} sa {1} dk", h, m) : tt("{0} dk", m);
};

function DeviceRow({ name, percent, color, detail }: { name: string; percent: number | null; color: string; detail: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border px-2.5 py-1.5" style={{ background: `color-mix(in srgb, ${color} 8%, transparent)`, borderColor: `color-mix(in srgb, ${color} 22%, transparent)` }}>
      <MiniNook color={color} size={26} eyes={percent !== null && percent <= 15 ? "closed" : "open"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] font-medium text-label">{name}</span>
          <span className="font-display text-[14px] font-medium tabular-nums" style={{ color: tintText(color) }}>
            {percent === null ? "—" : `%${percent}`}
          </span>
        </div>
        <p className="truncate text-[10px] text-label-3">{detail}</p>
        <Bar pct={percent ?? 0} color={color} className="mt-1" />
      </div>
    </div>
  );
}

function FanRow({ on, speed, reachable }: { on: boolean; speed: number; reachable: boolean }) {
  const color = reachable && on ? ACCENT.blue : ACCENT.gray;
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border px-2.5 py-1.5" style={{ background: `color-mix(in srgb, ${color} 8%, transparent)`, borderColor: `color-mix(in srgb, ${color} 22%, transparent)` }}>
      <motion.span
        animate={{ rotate: reachable && on ? 360 : 0 }}
        transition={reachable && on ? { duration: Math.max(0.4, 2.2 - speed / 50), repeat: Infinity, ease: "linear" } : { duration: 0.8 }}
        className="flex"
      >
        <svg width="26" height="26" viewBox="0 0 26 26">
          {[0, 120, 240].map((a) => (
            <ellipse key={a} cx="13" cy="7" rx="3.4" ry="6" fill={color} opacity="0.85" transform={`rotate(${a} 13 13)`} />
          ))}
          <circle cx="13" cy="13" r="3" fill="#0d0d0f" stroke={color} strokeWidth="1.2" />
        </svg>
      </motion.span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] font-medium text-label">{tt("Vantilatör")}</span>
          <span className="text-[12px] font-medium" style={{ color: tintText(color) }}>
            {!reachable ? "—" : on ? tt("Hız {0}", speed) : tt("Kapalı")}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-label-3">{!reachable ? tt("Bağlanılamadı") : on ? tt("Açık") : tt("Beklemede")}</p>
      </div>
    </div>
  );
}
