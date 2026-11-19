import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { AppWindow, Bluetooth, Power, ChevronLeft, ChevronRight, Eye, EyeOff, Headphones, Lock, Mic, MicOff, Moon, MonitorOff, Pin, SlidersHorizontal, Speaker, Sun, SunDim, Volume1, Volume2, VolumeX, Wifi, WifiOff, type LucideIcon } from "lucide-react";
import { brightnessGet, brightnessSet, fileIcon, mixerList, mixerOutput, mixerSet, quickAction, quickInput, quickOutput, quickSet, quickState, quickVolume, type AppVolume, type AudioOutput, type QuickKey, type QuickState } from "../../lib/bridge";
import { useNook } from "../../store/nook";
import { spring } from "../../lib/motion";
import { ACCENT, Dropdown, EmptyState, SectionLabel, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { PowerTimerView } from "./PowerTimerView";
import { shortLeft, usePowerTimer } from "../../lib/powerTimer";

/**
 * Kontrol: solda telefonlardaki gibi kalın ses ve parlaklık kaydırıcıları (parmağınla/fareyle
 * yukarı-aşağı sürükle); altında "Anahtarlar" (aç/kapa: açıkken dolu renkli, kapalıyken nötr, altında
 * Açık/Kapalı) ve "Eylemler" (tek seferlik işler: çerçeveli satır + ok).
 * Wi-Fi/Bluetooth donanımı olmayan bilgisayarda o düğmeler görünmez. Durum 2 sn'de bir tazelenir.
 */
export function ControlPanel() {
  // Zamanlı kapatma geri sayımı kartta aksın
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 15_000);
    return () => window.clearInterval(t);
  }, []);
  const [state, setState] = useState<QuickState | null>(null);
  const [busy, setBusy] = useState<QuickKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Parlaklık yavaş okunur (DDC/CI) — yalnızca açılışta; desteklenmiyorsa kaydırıcı gizlenir
  const [light, setLight] = useState<number | null | undefined>(undefined);
  // Önizlemede ?mixer ile doğrudan uygulama sesi açılır
  const [mixer, setMixer] = useState(() => import.meta.env.DEV && new URLSearchParams(location.search).has("mixer"));
  const [timerOpen, setTimerOpen] = useState(() => import.meta.env.DEV && new URLSearchParams(location.search).has("timer"));
  const timer = usePowerTimer((st) => st.timer);
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
  // Wi-Fi, Bluetooth, ses çıkışı, (ses kaydırıcısı yoksa) Ses + her zaman olan Karanlık ve Mikrofon
  const tiles = (s?.wifi != null ? 1 : 0) + (s?.bluetooth != null ? 1 : 0) + (nextOutput ? 1 : 0) + (vol == null ? 1 : 0) + 2;
  if (mixer) return <AppMixer onBack={() => setMixer(false)} />;
  if (timerOpen) return <PowerTimerView onBack={() => setTimerOpen(false)} />;
  return (
    <div className="flex h-full flex-col gap-2">
      {/* Üstte yatay ses ve parlaklık kartları */}
      {(vol != null || light != null) && (
        <div className="flex shrink-0 gap-2">
          {vol != null && (
            <SliderCard
              value={s?.muted ? 0 : vol}
              color={ACCENT.pink}
              icon={s?.muted || vol === 0 ? VolumeX : vol < 0.5 ? Volume1 : Volume2}
              label={s?.muted ? tt("Ses kapalı") : tt("Ana ses")}
              onChange={(v) => {
                setState((p) => (p ? { ...p, volume: v, muted: v === 0 ? p.muted : false } : p));
                void quickVolume(v);
              }}
              onIcon={() => toggle("mute", !s?.muted)}
            />
          )}
          {light != null && (
            <SliderCard
              value={light / 100}
              color={ACCENT.yellow}
              icon={light < 40 ? SunDim : Sun}
              label={tt("Ekran parlaklığı")}
              onChange={(v) => {
                setLight(Math.round(v * 100));
                void brightnessSet(v * 100);
                checkBrightness(Math.round(v * 100));
              }}
            />
          )}
        </div>
      )}

      {/* Anahtarlar: açıkken dolu renkli, kapalıyken nötr */}
      <SectionLabel className="-mb-1 shrink-0">{tt("Anahtarlar")}</SectionLabel>
      <div className="grid min-h-0 flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${tiles}, minmax(0, 1fr))`, gridAutoRows: "minmax(0, 1fr)" }}>
        {s?.wifi != null && <ToggleTile label="Wi-Fi" icon={s.wifi ? Wifi : WifiOff} on={s.wifi} color={ACCENT.blue} busy={busy === "wifi"} onClick={() => toggle("wifi", !s.wifi)} />}
        {s?.bluetooth != null && <ToggleTile label="Bluetooth" icon={Bluetooth} on={s.bluetooth} color={ACCENT.blue} busy={busy === "bluetooth"} onClick={() => toggle("bluetooth", !s.bluetooth)} />}
        {nextOutput && current && (
          <ToggleTile label={shortName(current.name)} status={tt("Ses çıkışı")} icon={current.headphone ? Headphones : Speaker} on color={ACCENT.pink} tip={tt("{0}\nTıkla: çıkışı seç", current.name)} onClick={() => setMixer(true)} />
        )}
        <ToggleTile label={tt("Karanlık")} icon={s?.dark ? Moon : Sun} on={!!s?.dark} color={ACCENT.purple} busy={busy === "dark"} onClick={() => toggle("dark", !s?.dark)} />
        {/* "Açık" = mikrofon dinliyor; kapalıyken (sessizde) nötr */}
        <ToggleTile label={tt("Mikrofon")} icon={s?.micMuted ? MicOff : Mic} on={s?.micMuted === false} color={ACCENT.orange} disabled={s?.micMuted == null} busy={busy === "mic"} onClick={() => toggle("mic", !s?.micMuted)} />
        {vol == null && (
          <ToggleTile label={tt("Ses")} icon={s?.muted ? VolumeX : Volume2} on={s?.muted === false} color={ACCENT.pink} disabled={s?.muted == null} busy={busy === "mute"} onClick={() => toggle("mute", !s?.muted)} />
        )}
      </div>

      {/* Eylemler: tek seferlik işler — dolu değil, çerçeveli ve oklu */}
      <SectionLabel className="-mb-1 shrink-0">{tt("Eylemler")}</SectionLabel>
      <div className="grid shrink-0 grid-cols-2 gap-1.5">
        <ActionRow label={tt("Kilitle")} icon={Lock} color={ACCENT.teal} onClick={() => void quickAction("lock")} />
        <ActionRow label={tt("Ekranı kapat")} icon={MonitorOff} color={ACCENT.teal} onClick={() => void quickAction("screen-off")} />
        <ActionRow label={tt("Uygulama sesi")} icon={SlidersHorizontal} color={ACCENT.pink} onClick={() => setMixer(true)} />
        <ActionRow
          label={timer ? tt("Zamanlı kapat · {0}", shortLeft(timer.at - Date.now())) : tt("Zamanlı kapat")}
          icon={Power}
          color={ACCENT.red}
          active={!!timer}
          tip={tt("Bilgisayarı belli bir süre sonra kapat, yeniden başlat ya da uyut")}
          onClick={() => setTimerOpen(true)}
        />
      </div>
      {error && (
        <p className="shrink-0 truncate text-[10.5px] text-red/90" title={error}>
          {error}
        </p>
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
        <button onClick={onBack} className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label" title={tt("Geri")} aria-label={tt("Geri")}>
          <ChevronLeft size={13} strokeWidth={2.4} />
        </button>
        <span className="text-[11.5px] font-medium text-label-2">{tt("Uygulama sesi")}</span>
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowHidden((v) => !v)}
            className="ml-auto flex items-center gap-1 rounded-full px-2 py-[2px] text-[10.5px] font-medium text-label-3 hover:bg-well-hi hover:text-label"
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
        {list?.length === 0 && <EmptyState title={tt("Ortalık sessiz")} hint={tt("Şu an ses çıkaran bir uygulama yok")} color={ACCENT.pink} />}
        {list?.map((a) => {
          const pct = Math.round((a.muted ? 0 : a.volume) * 100);
          const isPinned = pinned.includes(a.key);
          const isHidden = hidden.includes(a.key);
          const own = a.output ? outputs.find((o) => o.id === a.output) : null;
          return (
            <div key={a.key} className={`group flex items-center gap-1.5 rounded-row bg-well px-2 py-1.5 ${isHidden ? "opacity-50" : ""}`}>
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
              {/* Yüzde, sabitle ve gizle hep görünür (soluk); üzerine gelince ya da odaklanınca belirginleşir */}
              <span className="w-[22px] shrink-0 text-right text-[10.5px] tabular-nums text-label-3">{pct}</span>
              <div className="flex shrink-0 items-center gap-0.5 opacity-50 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
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
              {a.key !== "system" && outputs.length > 1 && (
                <button
                  onClick={() => cycleOutput(a)}
                  title={tt("Çıkış: {0}\nTıkla: sıradaki", own ? own.name : tt("Varsayılan"))}
                  aria-label={tt("Çıkış: {0}", own ? own.name : tt("Varsayılan"))}
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
                aria-label={a.muted ? tt("Sesi aç") : tt("Sessize al")}
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full hover:bg-well-hi"
                style={{ color: a.muted ? tintText(ACCENT.red) : "var(--color-label-2)" }}
              >
                {a.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              </button>
            </div>
          );
        })}
      </div>
      {error && <p className="truncate pt-1 text-[10.5px] text-red/90" title={error}>{error}</p>}
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

/**
 * Yatay kaydırıcı kartı: solda simge (tıkla: ses için sessize al) ve ad, sağda değer, altta çubuk.
 * Çubuğun üstünde sürükle ya da tıkla; tekerlekle de değişir.
 */
function SliderCard({
  value,
  color,
  icon: Icon,
  label,
  onChange,
  onIcon,
}: {
  value: number;
  color: string;
  icon: LucideIcon;
  label: string;
  onChange: (v: number) => void;
  onIcon?: () => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ sent: number } | null>(null);
  const [local, setLocal] = useState<number | null>(null);
  const shown = local ?? value;

  const at = (clientX: number, final = false) => {
    const el = track.current;
    if (!el || !drag.current) return;
    const r = el.getBoundingClientRect();
    const v = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    setLocal(v);
    const now = performance.now();
    if (final || now - drag.current.sent >= SEND_EVERY) {
      drag.current.sent = now;
      onChange(v);
    }
  };

  return (
    <div
      className="min-w-0 flex-1 rounded-tile border px-3 py-2"
      style={{ background: tintBg(color, 7), borderColor: tintBg(color, 24) }}
      onWheel={(e) => onChange(Math.max(0, Math.min(1, value + (e.deltaY < 0 ? 0.04 : -0.04))))}
    >
      <div className="flex items-center gap-1.5">
        <button onClick={onIcon} disabled={!onIcon} className="flex h-6 w-6 items-center justify-center rounded-badge enabled:hover:bg-white/10" style={{ color: tintText(color) }} title={onIcon ? tt("Sessize al / aç") : undefined} aria-label={onIcon ? tt("Sessize al / aç") : label}>
          <Icon size={14} strokeWidth={2.4} />
        </button>
        <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-label">{label}</span>
        <span className="font-round text-[13px] font-extrabold tabular-nums" style={{ color: tintText(color) }}>
          {Math.round(shown * 100)}
        </span>
      </div>
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        onKeyDown={(e) => {
          const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.05 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.05 : 0;
          if (d) onChange(Math.max(0, Math.min(1, value + d)));
        }}
        aria-label={label}
        aria-valuenow={Math.round(shown * 100)}
        className="relative mt-2 h-4 cursor-pointer touch-none select-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { sent: 0 };
          at(e.clientX);
        }}
        onPointerMove={(e) => at(e.clientX)}
        onPointerUp={(e) => {
          at(e.clientX, true);
          drag.current = null;
          // Sistemden gelen değer yetişene kadar elle verilen değerde kal
          window.setTimeout(() => setLocal(null), 600);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setLocal(null);
        }}
      >
        <span className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 overflow-hidden rounded-full bg-white/[0.08]">
          <motion.span
            className="block h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${tintBg(color, 60)}, ${color})`, boxShadow: `0 0 10px -2px ${color}` }}
            initial={false}
            animate={{ width: `${shown * 100}%` }}
            transition={drag.current ? { duration: 0 } : spring.pop}
          />
        </span>
        <motion.span
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
          style={{ boxShadow: `0 0 0 3px ${tintBg(color, 35)}, 0 2px 6px rgb(0 0 0 / 0.6)` }}
          initial={false}
          animate={{ left: `${shown * 100}%` }}
          transition={drag.current ? { duration: 0 } : spring.pop}
        />
      </div>
    </div>
  );
}

/** Aç/kapa karesi: açıkken modül renginde dolu, kapalıyken nötr; adın altında durumu yazar */
function ToggleTile({
  label,
  status,
  icon: Icon,
  on = false,
  color,
  disabled,
  busy,
  tip,
  onClick,
}: {
  label: string;
  /** Adın altındaki durum (verilmezse Açık / Kapalı) */
  status?: string;
  /** Üstüne gelince görünen açıklama (verilmezse ad) */
  tip?: string;
  icon: LucideIcon;
  on?: boolean;
  color: string;
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={spring.pop}
      disabled={disabled}
      onClick={onClick}
      title={tip ?? label}
      aria-pressed={on}
      className="flex min-h-0 min-w-0 flex-col items-center justify-center gap-1 rounded-tile border px-1 transition-colors disabled:opacity-35"
      style={{ background: on ? tintBg(color, 18) : "rgb(255 255 255 / 0.03)", borderColor: on ? tintBg(color, 48) : "rgb(255 255 255 / 0.06)" }}
    >
      <motion.span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-badge"
        style={{ background: on ? tintBg(color, 32) : "rgb(255 255 255 / 0.06)", color: on ? tintText(color) : "var(--color-label-3)", boxShadow: on ? `0 0 14px -4px ${color}` : undefined }}
        animate={{ opacity: busy ? 0.5 : 1 }}
      >
        <Icon size={14} strokeWidth={2.3} />
      </motion.span>
      <span className="w-full leading-tight">
        <span className="block truncate text-center text-[10.5px] font-semibold" style={{ color: on ? tintText(color) : "var(--color-label-2)" }}>
          {label}
        </span>
        <span className="block truncate text-center text-[10.5px] text-label-3">{status ?? (on ? tt("Açık") : tt("Kapalı"))}</span>
      </span>
    </motion.button>
  );
}

/** Tek seferlik eylem (anahtar değil): çerçeveli satır, sonunda ok. `active`: kurulu bir şey var (zamanlayıcı) */
function ActionRow({ label, icon: Icon, color, active, tip, onClick }: { label: string; icon: LucideIcon; color: string; active?: boolean; tip?: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={spring.pop}
      onClick={onClick}
      title={tip ?? label}
      className="flex h-[30px] min-w-0 items-center gap-2 rounded-row border px-2.5 text-left transition-colors hover:bg-well"
      style={{ borderColor: active ? tintBg(color, 48) : "rgb(255 255 255 / 0.12)", background: active ? tintBg(color, 12) : undefined }}
    >
      <Icon size={13} strokeWidth={2.3} className="shrink-0" style={{ color: tintText(color) }} />
      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold" style={{ color: active ? tintText(color) : "var(--color-label)" }}>
        {label}
      </span>
      <ChevronRight size={12} strokeWidth={2.4} className="shrink-0 text-label-3" />
    </motion.button>
  );
}
