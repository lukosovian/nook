import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Bluetooth, Lock, Mic, MicOff, Moon, MonitorOff, Sun, Volume2, VolumeX, Wifi, WifiOff, type LucideIcon } from "lucide-react";
import { quickAction, quickSet, quickState, type QuickKey, type QuickState } from "../../lib/bridge";
import { spring } from "../../lib/motion";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";

/** Kontrol: Grok Bot çipleri gibi — açıkken renkli, kapalıyken soluk. Durum 2 sn'de bir tazelenir. */
export function ControlPanel() {
  const [state, setState] = useState<QuickState | null>(null);
  const [busy, setBusy] = useState<QuickKey | null>(null);

  const refresh = useCallback(() => void quickState().then((s) => s && setState(s)), []);
  useEffect(() => {
    refresh();
    const t = window.setInterval(refresh, 2000);
    return () => window.clearInterval(t);
  }, [refresh]);

  const toggle = async (key: QuickKey, on: boolean) => {
    setBusy(key);
    setState((s) => (s ? { ...s, ...patch(key, on) } : s));
    await quickSet(key, on).catch((e) => console.warn("[nook] hızlı ayar", e));
    setBusy(null);
    refresh();
  };

  const s = state;
  return (
    <div className="grid h-full grid-cols-2 grid-rows-4 gap-1.5">
      <Toggle label="Wi-Fi" icon={s?.wifi === false ? WifiOff : Wifi} on={!!s?.wifi} color={ACCENT.blue} disabled={s?.wifi == null} busy={busy === "wifi"} onClick={() => toggle("wifi", !s?.wifi)} />
      <Toggle label="Bluetooth" icon={Bluetooth} on={!!s?.bluetooth} color={ACCENT.blue} disabled={s?.bluetooth == null} busy={busy === "bluetooth"} onClick={() => toggle("bluetooth", !s?.bluetooth)} />
      <Toggle label={s?.dark ? "Karanlık mod" : "Aydınlık mod"} icon={s?.dark ? Moon : Sun} on={!!s?.dark} color={ACCENT.purple} busy={busy === "dark"} onClick={() => toggle("dark", !s?.dark)} />
      <Toggle label={s?.muted ? "Ses kapalı" : "Ses açık"} icon={s?.muted ? VolumeX : Volume2} on={!!s?.muted} color={ACCENT.red} disabled={s?.muted == null} busy={busy === "mute"} onClick={() => toggle("mute", !s?.muted)} />
      <Toggle label={s?.micMuted ? "Mikrofon kapalı" : "Mikrofon açık"} icon={s?.micMuted ? MicOff : Mic} on={!!s?.micMuted} color={ACCENT.orange} disabled={s?.micMuted == null} busy={busy === "mic"} onClick={() => toggle("mic", !s?.micMuted)} />
      <Toggle label="Kilitle" icon={Lock} color={ACCENT.teal} action onClick={() => void quickAction("lock")} />
      <Toggle label="Ekranı kapat" icon={MonitorOff} color={ACCENT.teal} action onClick={() => void quickAction("screen-off")} />
    </div>
  );
}

const patch = (key: QuickKey, on: boolean): Partial<QuickState> =>
  key === "wifi" ? { wifi: on } : key === "bluetooth" ? { bluetooth: on } : key === "dark" ? { dark: on } : key === "mute" ? { muted: on } : { micMuted: on };

function Toggle({
  label,
  icon,
  on = false,
  color,
  disabled,
  busy,
  action,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  on?: boolean;
  color: string;
  disabled?: boolean;
  busy?: boolean;
  /** Tek seferlik işlem (anahtar değil) */
  action?: boolean;
  onClick: () => void;
}) {
  const lit = on || action;
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={spring.pop}
      disabled={disabled}
      onClick={onClick}
      className="flex min-w-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-left transition-colors disabled:opacity-35"
      style={{ background: lit ? tintBg(color, on ? 16 : 7) : "rgb(255 255 255 / 0.035)", borderColor: lit ? tintBg(color, on ? 40 : 20) : "rgb(255 255 255 / 0.06)" }}
    >
      <motion.span animate={{ opacity: busy ? 0.5 : 1 }}>
        <MiniNook color={lit ? color : "#5a5a62"} size={24} icon={icon} />
      </motion.span>
      <span className="truncate text-[11.5px] font-medium" style={{ color: on ? tintText(color) : "var(--color-label-2)" }}>
        {label}
      </span>
    </motion.button>
  );
}
