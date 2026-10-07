import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { AppWindow, Bluetooth, ChevronLeft, Eye, EyeOff, Headphones, Lock, Mic, MicOff, Moon, MonitorOff, Pin, SlidersHorizontal, Speaker, Sun, SunDim, Volume1, Volume2, VolumeX, Wifi, WifiOff, type LucideIcon } from "lucide-react";
import { brightnessGet, brightnessSet, fileIcon, mixerList, mixerOutput, mixerSet, quickAction, quickInput, quickOutput, quickSet, quickState, quickVolume, type AppVolume, type AudioOutput, type QuickKey, type QuickState } from "../../lib/bridge";
import { useNook } from "../../store/nook";
import { spring } from "../../lib/motion";
import { ACCENT, Dropdown, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

/**
 * Kontrol: solda telefonlardaki gibi kalın ses ve parlaklık kaydırıcıları (parmağınla/fareyle
 * yukarı-aşağı sürükle), sağda Grok Bot çipleri — açıkken renkli, kapalıyken soluk.
 * Wi-Fi/Bluetooth donanımı olmayan bilgisayarda o düğmeler görünmez. Durum 2 sn'de bir tazelenir.
 */
export function ControlPanel() {
  const [state, setState] = useState<QuickState | null>(null);
  const [busy, setBusy] = useState<QuickKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Parlaklık yavaş okunur (DDC/CI) — yalnızca açılışta; desteklenmiyorsa kaydırıcı gizlenir
  const [light, setLight] = useState<number | null | undefined>(undefined);
  // Önizlemede ?mixer ile doğrudan uygulama sesi açılır
  const [mixer, setMixer] = useState(() => import.meta.env.DEV && new URLSearchParams(location.search).has("mixer"));
  const verify = useRef(0);

  const refresh = useCallback(() => void quickState().then((s) => s && setState(s)), []);
  useEffect(() => {
    refresh();
    if (brightnessBroken()) setLight(null);
    else
      void brightnessGet()
        .then((v) => setLight(v ?? null))
        .catch(() => setLight(null));
    const t = window.setInterval(refresh, 2000);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(verify.current);
    };
  }, [refresh]);

  /**
   * Bazı ekranlar parlaklığı okutur ama değiştirmeye izin vermez (DDC/CI kapalı, masaüstü monitör).
   * Ayarladıktan sonra geri oku; tutmadıysa kaydırıcıyı kaldır ve bir daha gösterme.
   */
  const checkBrightness = (want: number) => {
    window.clearTimeout(verify.current);
    verify.current = window.setTimeout(() => {
      void brightnessGet().then((got) => {
        if (got != null && Math.abs(got - want) <= 6) return;
        markBrightnessBroken();
        setLight(null);
        setError(tt("Bu ekran parlaklığın uygulamadan ayarlanmasına izin vermiyor — kaydırıcı kaldırıldı"));
      });
    }, 1500);
  };

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
  // Wi-Fi, Bluetooth, ses çıkışı, (ses kaydırıcısı yoksa) Ses + her zaman olan dört düğme
  const toggles = (s?.wifi != null ? 1 : 0) + (s?.bluetooth != null ? 1 : 0) + (nextOutput ? 1 : 0) + (vol == null ? 1 : 0) + 5;
  return (
    <div className="flex h-full gap-1.5">
      {vol != null && (
        <BigSlider
          value={s?.muted ? 0 : vol}
          color={ACCENT.pink}
          icon={s?.muted || vol === 0 ? VolumeX : vol < 0.5 ? Volume1 : Volume2}
          label={tt("Ses")}
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
          label={tt("Parlaklık")}
          onChange={(v) => {
            setLight(Math.round(v * 100));
            void brightnessSet(v * 100);
            checkBrightness(Math.round(v * 100));
          }}
        />
      )}

      {mixer ? (
        <AppMixer onBack={() => setMixer(false)} />
      ) : (
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
              tip={tt("{0}\nTıkla: çıkışı seç", current.name)}
              onClick={() => setMixer(true)}
            />
          )}
          <Toggle label={s?.dark ? tt("Karanlık") : tt("Aydınlık")} icon={s?.dark ? Moon : Sun} on={!!s?.dark} color={ACCENT.purple} busy={busy === "dark"} onClick={() => toggle("dark", !s?.dark)} />
          <Toggle label={s?.micMuted ? tt("Mik. kapalı") : tt("Mikrofon")} icon={s?.micMuted ? MicOff : Mic} on={!!s?.micMuted} color={ACCENT.orange} disabled={s?.micMuted == null} busy={busy === "mic"} onClick={() => toggle("mic", !s?.micMuted)} />
          {vol == null && (
            <Toggle label={s?.muted ? tt("Ses kapalı") : tt("Ses açık")} icon={s?.muted ? VolumeX : Volume2} on={!!s?.muted} color={ACCENT.red} disabled={s?.muted == null} busy={busy === "mute"} onClick={() => toggle("mute", !s?.muted)} />
          )}
          <Toggle label={tt("Kilitle")} icon={Lock} color={ACCENT.teal} action onClick={() => void quickAction("lock")} />
          <Toggle label={tt("Ekranı kapat")} icon={MonitorOff} color={ACCENT.teal} action onClick={() => void quickAction("screen-off")} />
          <Toggle label={tt("Uygulama sesi")} icon={SlidersHorizontal} color={ACCENT.pink} action onClick={() => setMixer(true)} />
        </div>
        {error && <p className="truncate text-[10px] text-red/90" title={error}>{error}</p>}
      </div>
      )}
    </div>
  );
}

const BRIGHTNESS_OFF = "nook-brightness-off";
const brightnessBroken = () => {
  try {
    return localStorage.getItem(BRIGHTNESS_OFF) === "1";
  } catch {
    return false;
  }
};
const markBrightnessBroken = () => {
  try {
    localStorage.setItem(BRIGHTNESS_OFF, "1");
  } catch {
    /* önemsiz */
  }
};

/** Sabitlenenler (sabitleme sırasıyla) başta; gizlenenler yalnızca istenince */
export function arrangeApps(apps: AppVolume[], hidden: string[], pinned: string[], showHidden = false): AppVolume[] {
  const shown = showHidden ? apps : apps.filter((a) => !hidden.includes(a.key));
  const pin = pinned.flatMap((k) => shown.filter((a) => a.key === k));
  return [...pin, ...shown.filter((a) => !pinned.includes(a.key))];
}

/**
 * Uygulama bazlı ses: üstte çıkış ve mikrofon seçimi; her uygulama bir satır (ikon, ad, yatay
 * kaydırıcı, kendi çıkışı, sessiz). Sabitlenenler üstte, gizlenenler "Gizli"den açılır.
 * Liste 2 sn'de bir tazelenir — yeni açılan uygulama da gelir.
 */
function AppMixer({ onBack }: { onBack: () => void }) {
  const [apps, setApps] = useState<AppVolume[] | null>(null);
  const [devices, setDevices] = useState<{ outputs: AudioOutput[]; inputs: AudioOutput[] }>({ outputs: [], inputs: [] });
  const [showHidden, setShowHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hidden = useNook((s) => s.settings.mixerHidden);
  const pinned = useNook((s) => s.settings.mixerPinned);
  const update = useNook((s) => s.updateSettings);
  // Kaydırırken tazeleme değeri geri itmesin
  const dragging = useRef<string | null>(null);
  useEffect(() => {
    const load = () => {
      void mixerList().then((l) =>
        setApps((prev) => (dragging.current && prev ? l.map((a) => (a.key === dragging.current ? (prev.find((p) => p.key === a.key) ?? a) : a)) : l)),
      );
      void quickState().then((q) => q && setDevices({ outputs: q.outputs, inputs: q.inputs ?? [] }));
    };
    load();
    const t = window.setInterval(load, 2000);
    return () => window.clearInterval(t);
  }, []);
  const patchApp = (key: string, p: Partial<AppVolume>) => setApps((l) => l?.map((a) => (a.key === key ? { ...a, ...p } : a)) ?? l);
  const list = apps ? arrangeApps(apps, hidden, pinned, showHidden) : null;
  const hiddenCount = apps ? apps.filter((a) => hidden.includes(a.key)).length : 0;
  const outputs = devices.outputs;
  const inputs = devices.inputs;

  /** Uygulamanın çıkışı: tıkladıkça Varsayılan → 1. cihaz → 2. cihaz … */
  const cycleOutput = (a: AppVolume) => {
    const ring: (string | null)[] = [null, ...outputs.map((o) => o.id)];
    const next = ring[(ring.indexOf(a.output ?? null) + 1) % ring.length];
    patchApp(a.key, { output: next });
    setError(null);
    void mixerOutput(a.key, next).catch((e) => setError(String(e)));
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="mb-1 flex items-center gap-1">
        <button onClick={onBack} className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label" title={tt("Geri")}>
          <ChevronLeft size={13} strokeWidth={2.4} />
        </button>
        <span className="text-[11.5px] font-medium text-label-2">{tt("Uygulama sesi")}</span>
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowHidden((v) => !v)}
            className="ml-auto flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-medium text-label-3 hover:bg-well-hi hover:text-label"
            title={showHidden ? tt("Gizlenenleri sakla") : tt("Gizlenenleri göster")}
          >
            {showHidden ? <EyeOff size={10} strokeWidth={2.4} /> : <Eye size={10} strokeWidth={2.4} />}
            {tt("Gizli ({0})", hiddenCount)}
          </button>
        )}
      </div>
      {(outputs.length > 1 || inputs.length > 1) && (
        <div className="mb-1.5 flex gap-1">
          {outputs.length > 1 && (
            <DeviceDropdown icon={Speaker} list={outputs} color={ACCENT.pink} onPick={(id) => void quickOutput(id).then(() => setDevices((d) => ({ ...d, outputs: d.outputs.map((o) => ({ ...o, default: o.id === id })) })))} />
          )}
          {inputs.length > 1 && (
            <DeviceDropdown icon={Mic} list={inputs} color={ACCENT.orange} onPick={(id) => void quickInput(id).then(() => setDevices((d) => ({ ...d, inputs: d.inputs.map((o) => ({ ...o, default: o.id === id })) })))} />
          )}
        </div>
      )}
      <div className="-mr-1.5 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1.5">
        {list === null && <p className="py-4 text-center text-[11px] text-label-3">{tt("Yükleniyor…")}</p>}
        {list?.length === 0 && <p className="py-4 text-center text-[11px] text-label-3">{tt("Şu an ses çıkaran bir uygulama yok")}</p>}
        {list?.map((a) => {
          const pct = Math.round((a.muted ? 0 : a.volume) * 100);
          const isPinned = pinned.includes(a.key);
          const isHidden = hidden.includes(a.key);
          const own = a.output ? outputs.find((o) => o.id === a.output) : null;
          return (
            <div key={a.key} className={`group flex items-center gap-1.5 rounded-[12px] bg-well px-2 py-1.5 ${isHidden ? "opacity-50" : ""}`}>
              <AppIcon path={a.path} />
              <span className="w-[66px] shrink-0 truncate text-[11px] font-medium text-label" title={a.name}>
                {isPinned && <Pin size={8} strokeWidth={3} className="mr-0.5 inline align-[-1px]" style={{ color: tintText(ACCENT.yellow) }} />}
                {a.name}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={pct}
                onPointerDown={() => (dragging.current = a.key)}
                onPointerUp={() => (dragging.current = null)}
                onChange={(e) => {
                  const v = Number(e.target.value) / 100;
                  patchApp(a.key, { volume: v, muted: false });
                  void mixerSet(a.key, v, a.muted && v > 0 ? false : undefined);
                }}
                className="min-w-0 flex-1"
                style={{ accentColor: ACCENT.pink }}
              />
              {/* Yüzde; üzerine gelince sabitle / gizle */}
              <div className="relative h-[22px] w-[40px] shrink-0">
                <span className="absolute inset-0 flex items-center justify-end text-[10px] tabular-nums text-label-3 transition-opacity group-hover:opacity-0">{pct}</span>
                <div className="absolute inset-0 flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <SmallButton
                    label={isPinned ? tt("Sabitlemeyi kaldır") : tt("Üste sabitle")}
                    onClick={() => update({ mixerPinned: isPinned ? pinned.filter((k) => k !== a.key) : [...pinned, a.key] })}
                    color={isPinned ? ACCENT.yellow : undefined}
                  >
                    <Pin size={10} strokeWidth={2.4} />
                  </SmallButton>
                  <SmallButton label={isHidden ? tt("Listede göster") : tt("Listeden gizle")} onClick={() => update({ mixerHidden: isHidden ? hidden.filter((k) => k !== a.key) : [...hidden, a.key] })}>
                    {isHidden ? <Eye size={10} strokeWidth={2.4} /> : <EyeOff size={10} strokeWidth={2.4} />}
                  </SmallButton>
                </div>
              </div>
              {a.key !== "system" && outputs.length > 1 && (
                <button
                  onClick={() => cycleOutput(a)}
                  title={tt("Çıkış: {0}\nTıkla: sıradaki", own ? own.name : tt("Varsayılan"))}
                  className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full hover:bg-well-hi"
                  style={{ color: own ? tintText(ACCENT.purple) : "var(--color-label-3)", background: own ? tintBg(ACCENT.purple, 16) : undefined }}
                >
                  {own?.headphone ? <Headphones size={11} /> : <Speaker size={11} />}
                </button>
              )}
              <button
                onClick={() => {
                  patchApp(a.key, { muted: !a.muted });
                  void mixerSet(a.key, undefined, !a.muted);
                }}
                title={a.muted ? tt("Sesi aç") : tt("Sessize al")}
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full hover:bg-well-hi"
                style={{ color: a.muted ? tintText(ACCENT.red) : "var(--color-label-2)" }}
              >
                {a.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              </button>
            </div>
          );
        })}
      </div>
      {error && <p className="truncate pt-1 text-[10px] text-red/90" title={error}>{error}</p>}
    </div>
  );
}

function SmallButton({ label, onClick, color, children }: { label: string; onClick: () => void; color?: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-label-3 hover:bg-white/10 hover:text-label" style={color ? { color: tintText(color) } : undefined}>
      {children}
    </button>
  );
}

/** Varsayılan çıkış / mikrofon seçimi (açılır liste adanın içinde açılır) */
function DeviceDropdown({ icon: Icon, list, color, onPick }: { icon: LucideIcon; list: AudioOutput[]; color: string; onPick: (id: string) => void }) {
  const current = list.find((o) => o.default)?.id ?? list[0]?.id ?? "";
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full bg-well pl-2" title={list.find((o) => o.id === current)?.name}>
      <Icon size={11} strokeWidth={2.4} className="shrink-0" style={{ color: tintText(color) }} />
      <div className="min-w-0 flex-1">
        <Dropdown options={list.map((o) => ({ id: o.id, label: shortName(o.name) }))} value={current} onChange={onPick} color={color} maxWidth={130} />
      </div>
    </div>
  );
}

export function AppIcon({ path }: { path: string | null }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (path) void fileIcon(path, 32).then(setSrc).catch(() => undefined);
  }, [path]);
  return src ? (
    <img src={src} alt="" className="h-[18px] w-[18px] shrink-0" draggable={false} />
  ) : (
    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-label-3">
      <AppWindow size={14} />
    </span>
  );
}

/** "Hoparlör (Realtek(R) Audio)" → "Hoparlör"; ad yalnızca genel bir sözcükse parantezdeki marka */
export function shortName(name: string) {
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
