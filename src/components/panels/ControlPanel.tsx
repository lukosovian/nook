import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Bluetooth, Headphones, Lock, Mic, MicOff, Moon, MonitorOff, Speaker, Sun, SunDim, Volume1, Volume2, VolumeX, Wifi, WifiOff, type LucideIcon } from "lucide-react";
import { brightnessGet, brightnessSet, quickAction, quickOutput, quickSet, quickState, quickVolume, type QuickKey, type QuickState } from "../../lib/bridge";
import { spring } from "../../lib/motion";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";

/**
 * Kontrol: solda telefonlardaki gibi kalın ses ve parlaklık kaydırıcıları (parmağınla/fareyle
 * yukarı-aşağı sürükle), sağda Grok Bot çipleri — açıkken renkli, kapalıyken soluk.
 * Wi-Fi/Bluetooth donanımı olmayan bilgisayarda o düğmeler görünmez. Durum 2 sn'de bir tazelenir.
 */
export function ControlPanel() {
  const [state, setState] = useState<QuickState | null>(null);
  const [busy, setBusy] = useState<QuickKey | null>(null);
  const [outputBusy, setOutputBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Parlaklık yavaş okunur (DDC/CI) — yalnızca açılışta; desteklenmiyorsa kaydırıcı gizlenir
  const [light, setLight] = useState<number | null | undefined>(undefined);

  const refresh = useCallback(() => void quickState().then((s) => s && setState(s)), []);
  useEffect(() => {
    refresh();
    void brightnessGet()
      .then((v) => setLight(v ?? null))
      .catch(() => setLight(null));
    const t = window.setInterval(refresh, 2000);
    return () => window.clearInterval(t);
  }, [refresh]);

  const toggle = async (key: QuickKey, on: boolean) => {
    setBusy(key);
    setError(null);
    setState((s) => (s ? { ...s, ...patch(key, on) } : s));
    await quickSet(key, on).catch((e) => setError(String(e)));
    setBusy(null);
    refresh();
  };

  const s = state;
  const vol = s?.volume ?? null;
  // Ses çıkışı: tıklayınca sıradaki cihaza geçer (iki cihazda kulaklık ↔ hoparlör)
  const outputs = s?.outputs ?? [];
  const current = outputs.find((o) => o.default) ?? null;
  const nextOutput = outputs.length > 1 ? outputs[(outputs.findIndex((o) => o.default) + 1) % outputs.length] : null;
  const switchOutput = async () => {
    if (!nextOutput) return;
    setOutputBusy(true);
    setError(null);
    setState((p) => (p ? { ...p, outputs: p.outputs.map((o) => ({ ...o, default: o.id === nextOutput.id })) } : p));
    await quickOutput(nextOutput.id).catch((e) => setError(String(e)));
    setOutputBusy(false);
    refresh();
  };
  // Wi-Fi, Bluetooth, ses çıkışı, (ses kaydırıcısı yoksa) Ses + her zaman olan dört düğme
  const toggles = (s?.wifi != null ? 1 : 0) + (s?.bluetooth != null ? 1 : 0) + (nextOutput ? 1 : 0) + (vol == null ? 1 : 0) + 4;
  return (
    <div className="flex h-full gap-1.5">
      {vol != null && (
        <BigSlider
          value={s?.muted ? 0 : vol}
          color={ACCENT.pink}
          icon={s?.muted || vol === 0 ? VolumeX : vol < 0.5 ? Volume1 : Volume2}
          label="Ses"
          onChange={(v) => {
            setState((p) => (p ? { ...p, volume: v, muted: v === 0 ? p.muted : false } : p));
            void quickVolume(v);
          }}
          onTap={() => toggle("mute", !s?.muted)}
        />
      )}
      {light != null && (
        <BigSlider
          value={light / 100}
          color={ACCENT.yellow}
          icon={light < 40 ? SunDim : Sun}
          label="Parlaklık"
          onChange={(v) => {
            setLight(Math.round(v * 100));
            void brightnessSet(v * 100);
          }}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Az düğme varsa tek sütun (adlar kesilmesin) */}
        <div className={`grid min-h-0 flex-1 auto-rows-[38px] content-center gap-1.5 ${toggles > 4 ? "grid-cols-2" : "grid-cols-1"}`}>
          {s?.wifi != null && <Toggle label="Wi-Fi" icon={s.wifi ? Wifi : WifiOff} on={s.wifi} color={ACCENT.blue} busy={busy === "wifi"} onClick={() => toggle("wifi", !s.wifi)} />}
          {s?.bluetooth != null && <Toggle label="Bluetooth" icon={Bluetooth} on={s.bluetooth} color={ACCENT.blue} busy={busy === "bluetooth"} onClick={() => toggle("bluetooth", !s.bluetooth)} />}
          {nextOutput && current && (
            <Toggle
              label={shortName(current.name)}
              icon={current.headphone ? Headphones : Speaker}
              on
              color={ACCENT.pink}
              busy={outputBusy}
              tip={`${current.name}\nTıkla: ${nextOutput.name}`}
              onClick={() => void switchOutput()}
            />
          )}
          <Toggle label={s?.dark ? "Karanlık" : "Aydınlık"} icon={s?.dark ? Moon : Sun} on={!!s?.dark} color={ACCENT.purple} busy={busy === "dark"} onClick={() => toggle("dark", !s?.dark)} />
          <Toggle label={s?.micMuted ? "Mik. kapalı" : "Mikrofon"} icon={s?.micMuted ? MicOff : Mic} on={!!s?.micMuted} color={ACCENT.orange} disabled={s?.micMuted == null} busy={busy === "mic"} onClick={() => toggle("mic", !s?.micMuted)} />
          {vol == null && (
            <Toggle label={s?.muted ? "Ses kapalı" : "Ses açık"} icon={s?.muted ? VolumeX : Volume2} on={!!s?.muted} color={ACCENT.red} disabled={s?.muted == null} busy={busy === "mute"} onClick={() => toggle("mute", !s?.muted)} />
          )}
          <Toggle label="Kilitle" icon={Lock} color={ACCENT.teal} action onClick={() => void quickAction("lock")} />
          <Toggle label="Ekranı kapat" icon={MonitorOff} color={ACCENT.teal} action onClick={() => void quickAction("screen-off")} />
        </div>
        {error && <p className="truncate text-[10px] text-red/90" title={error}>{error}</p>}
      </div>
    </div>
  );
}

/** "Hoparlör (Realtek(R) Audio)" → "Hoparlör"; ad yalnızca genel bir sözcükse parantezdeki marka */
function shortName(name: string) {
  const head = name.split(" (")[0].trim();
  const inner = name.match(/\(([^)]+)/)?.[1]?.trim();
  return /^(hoparlör|hoparlörler|speakers?|headphones?|kulaklık|headset)$/i.test(head) && inner && !/realtek|high definition/i.test(inner) ? inner : head || name;
}

const patch = (key: QuickKey, on: boolean): Partial<QuickState> =>
  key === "wifi" ? { wifi: on } : key === "bluetooth" ? { bluetooth: on } : key === "dark" ? { dark: on } : key === "mute" ? { muted: on } : { micMuted: on };

/** Sürüklerken bu sıklıktan (ms) fazla sisteme yazılmaz. */
const SEND_EVERY = 40;
/** Bu kadar (px) oynamadan bırakılırsa dokunma sayılır. */
const TAP_SLOP = 4;

/**
 * Telefon kaydırıcısı: kalın dikey hap, doluluk alttan yükselir. Tıklanan yere zıplamaz —
 * nereden tutarsan tut, yukarı/aşağı sürükledikçe değer o kadar değişir. Dokunmak `onTap`.
 */
function BigSlider({
  value,
  color,
  icon: Icon,
  label,
  onChange,
  onTap,
}: {
  value: number;
  color: string;
  icon: LucideIcon;
  label: string;
  onChange: (v: number) => void;
  onTap?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; start: number; moved: boolean; sent: number } | null>(null);
  const [local, setLocal] = useState<number | null>(null);
  const shown = local ?? value;

  const update = (clientY: number, final = false) => {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el) return;
    if (Math.abs(clientY - d.y) > TAP_SLOP) d.moved = true;
    if (!d.moved) return;
    const v = Math.max(0, Math.min(1, d.start + (d.y - clientY) / el.clientHeight));
    setLocal(v);
    const now = performance.now();
    if (final || now - d.sent >= SEND_EVERY) {
      d.sent = now;
      onChange(v);
    }
  };

  return (
    <div
      ref={ref}
      role="slider"
      aria-label={label}
      aria-valuenow={Math.round(shown * 100)}
      title={`${label} %${Math.round(shown * 100)}`}
      className="relative h-full w-[54px] shrink-0 cursor-ns-resize touch-none select-none overflow-hidden rounded-[18px] border"
      style={{ background: "rgb(255 255 255 / 0.04)", borderColor: tintBg(color, 22) }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { y: e.clientY, start: value, moved: false, sent: 0 };
        setLocal(value);
      }}
      onPointerMove={(e) => update(e.clientY)}
      onPointerUp={(e) => {
        const d = drag.current;
        update(e.clientY, true);
        drag.current = null;
        if (d && !d.moved) onTap?.();
        // Sistemden gelen değer yetişene kadar elle verilen değerde kal
        window.setTimeout(() => setLocal(null), 600);
      }}
      onPointerCancel={() => {
        drag.current = null;
        setLocal(null);
      }}
      onWheel={(e) => {
        const v = Math.max(0, Math.min(1, value + (e.deltaY < 0 ? 0.04 : -0.04)));
        onChange(v);
      }}
    >
      {/* Doluluk */}
      <motion.div
        className="absolute inset-x-0 bottom-0"
        style={{ background: `linear-gradient(180deg, ${tintBg(color, 70)}, ${tintBg(color, 45)})`, boxShadow: `0 0 18px -2px ${tintBg(color, 60)}` }}
        initial={false}
        animate={{ height: `${shown * 100}%` }}
        transition={drag.current ? { duration: 0 } : spring.pop}
      />
      <span className="absolute inset-x-0 top-2 text-center font-round text-[11px] font-bold tabular-nums" style={{ color: shown > 0.86 ? "#fff" : tintText(color) }}>
        {Math.round(shown * 100)}
      </span>
      <span className="absolute inset-x-0 bottom-2.5 flex justify-center" style={{ color: shown > 0.12 ? "#fff" : tintText(color) }}>
        <Icon size={17} strokeWidth={2.4} />
      </span>
    </div>
  );
}

function Toggle({
  label,
  icon,
  on = false,
  color,
  disabled,
  busy,
  action,
  tip,
  onClick,
}: {
  label: string;
  /** Üstüne gelince görünen açıklama (verilmezse ad) */
  tip?: string;
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
      title={tip ?? label}
      className="flex min-w-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-2 text-left transition-colors disabled:opacity-35"
      style={{ background: lit ? tintBg(color, on ? 16 : 7) : "rgb(255 255 255 / 0.035)", borderColor: lit ? tintBg(color, on ? 40 : 20) : "rgb(255 255 255 / 0.06)" }}
    >
      <motion.span className="shrink-0" animate={{ opacity: busy ? 0.5 : 1 }}>
        <MiniNook color={lit ? color : "#5a5a62"} size={22} icon={icon} />
      </motion.span>
      <span className="truncate text-[11px] font-medium" style={{ color: on ? tintText(color) : "var(--color-label-2)" }}>
        {label}
      </span>
    </motion.button>
  );
}
