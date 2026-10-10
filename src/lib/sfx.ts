/**
 * Arayüz sesleri: dosya yok, hepsi Web Audio ile sentezlenir (clickSound'daki mikrofon klikiyle aynı yol).
 * Kısa, yumuşak, "bloop" tadında sesler; ada açılıp kapanırken, sekme değişirken, olay kartı gelince,
 * Nook beslenip sevinince. Ayarlardan kapatılır; tam ekranda / oyunda ve Hum dinlerken (loopback'e
 * karışmasın) susar.
 */
import { isPrimary } from "./bridge";
import { islandModeOf } from "../hooks/useIslandMode";
import { isQuiet, useNook } from "../store/nook";

export type Sfx = "open" | "close" | "tab" | "pop" | "success" | "error" | "out" | "attention" | "found" | "happy" | "munch" | "giggle";

let ctx: AudioContext | null = null;
let last = 0;

interface ToneOpts {
  type?: OscillatorType;
  /** Bitişte bu frekansa kayar */
  to?: number;
  gain?: number;
  attack?: number;
}

function tone(a: BaseAudioContext, out: AudioNode, freq: number, at: number, dur: number, o: ToneOpts = {}) {
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(freq, at);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, at + dur * 0.8);
  const peak = o.gain ?? 0.3;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + (o.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/** Zil: temel + bir oktav üst kısmi, uzun sönüm */
function bell(a: BaseAudioContext, out: AudioNode, freq: number, at: number, gain = 0.22, dur = 0.45) {
  tone(a, out, freq, at, dur, { gain, attack: 0.004 });
  tone(a, out, freq * 2, at, dur * 0.55, { gain: gain * 0.28, attack: 0.004 });
}

function noise(a: BaseAudioContext, out: AudioNode, at: number, dur: number, freq: number, gain: number) {
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = a.createBufferSource();
  src.buffer = buf;
  const band = a.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = freq;
  band.Q.value = 1.2;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(band).connect(g).connect(out);
  src.start(at);
}

export function render(kind: Sfx, a: BaseAudioContext, out: AudioNode, t: number) {
  switch (kind) {
    case "open":
      tone(a, out, 330, t, 0.13, { to: 620, gain: 0.26 });
      tone(a, out, 660, t + 0.05, 0.12, { to: 990, gain: 0.08 });
      break;
    case "close":
      tone(a, out, 560, t, 0.12, { to: 300, gain: 0.18 });
      break;
    case "tab":
      tone(a, out, 1500, t, 0.035, { type: "triangle", gain: 0.12, attack: 0.002 });
      break;
    case "pop":
      tone(a, out, 520, t, 0.07, { to: 820, gain: 0.2 });
      bell(a, out, 1046, t + 0.05, 0.12, 0.35);
      break;
    case "success":
      bell(a, out, 1046, t, 0.18, 0.3);
      bell(a, out, 1568, t + 0.09, 0.18, 0.45);
      break;
    case "error":
      tone(a, out, 520, t, 0.16, { type: "triangle", gain: 0.2 });
      tone(a, out, 390, t + 0.13, 0.24, { type: "triangle", gain: 0.2 });
      break;
    case "out":
      tone(a, out, 700, t, 0.1, { to: 420, gain: 0.18 });
      break;
    case "attention":
      bell(a, out, 784, t, 0.17, 0.3);
      bell(a, out, 988, t + 0.1, 0.17, 0.3);
      bell(a, out, 1319, t + 0.2, 0.19, 0.55);
      break;
    case "found":
      [1046, 1319, 1568, 2093].forEach((f, i) => bell(a, out, f, t + i * 0.06, 0.14, 0.4));
      break;
    case "happy":
      tone(a, out, 700, t, 0.09, { to: 1300, gain: 0.2 });
      tone(a, out, 900, t + 0.11, 0.11, { to: 1600, gain: 0.2 });
      break;
    case "munch":
      for (let i = 0; i < 3; i++) {
        noise(a, out, t + i * 0.13, 0.06, 900, 0.5);
        tone(a, out, 180, t + i * 0.13, 0.06, { to: 120, gain: 0.18 });
      }
      break;
    case "giggle":
      [880, 1046, 932, 1175].forEach((f, i) => tone(a, out, f, t + i * 0.07, 0.06, { gain: 0.15 }));
      break;
  }
}

/** Ayarlar ve ortam izin veriyorsa sesi çalar. `force`: önizleme (kapalıyken de çalar). */
export function playSfx(kind: Sfx, force = false) {
  const s = useNook.getState();
  if (!force) {
    if (!s.settings.uiSounds || s.fullscreen || s.hum?.phase === "listening" || isQuiet(s)) return;
    // Aynı anda gelen iki olay üst üste binmesin
    const now = performance.now();
    if (now - last < 140) return;
    last = now;
  }
  // Yalnızca geliştirme: tanıtım videosu kare kare çekilirken ses çalınmaz, zamanıyla kaydedilir (dev/Reel)
  const reel = import.meta.env.DEV ? (window as { __sfxLog?: { kind: string; at: number }[] }).__sfxLog : undefined;
  if (reel) {
    reel.push({ kind, at: performance.now() });
    return;
  }
  try {
    ctx ??= new AudioContext();
    const a = ctx;
    void a.resume();
    const out = a.createGain();
    out.gain.value = 0.6 * (s.settings.uiVolume ?? 0.6);
    const soft = a.createBiquadFilter();
    soft.type = "lowpass";
    soft.frequency.value = 6000;
    out.connect(soft).connect(a.destination);
    render(kind, a, out, a.currentTime + 0.01);
  } catch {
    // ses çıkarılamıyorsa sessiz geç
  }
}

const SUCCESS = new Set(["charging", "download", "screenshot", "headset-charging", "usb-in", "online", "bt-in", "focus", "update", "synced"]);
const ERROR = new Set(["battery-low", "device-low", "unplugged", "offline", "alert", "sensitive", "guard"]);
const OUT = new Set(["usb-out", "bt-out"]);
const ATTENTION = new Set(["water", "eye", "break", "calendar", "claude"]);
/** Kendi sesi olanlar: Windows bildirimi kendisi çalar, mikrofon kalkanın klikiyle duyulur */
const SILENT = new Set(["notify", "mic", "volume", "brightness"]);

function toastSfx(kind: string): Sfx | null {
  if (SILENT.has(kind)) return null;
  if (SUCCESS.has(kind)) return "success";
  if (ERROR.has(kind)) return "error";
  if (OUT.has(kind)) return "out";
  if (ATTENTION.has(kind)) return "attention";
  return "pop";
}

/** Mağazayı dinleyip olaylara ses verir. Pencere başına bir kez; dönen fonksiyon aboneliği kaldırır. */
export function startSfx() {
  return useNook.subscribe((s, p) => {
    // Açılış animasyonu sürerken ve kilit ekranındayken ses yok
    if (s.intro || p.intro) return;
    const mode = islandModeOf(s);
    const prev = islandModeOf(p);
    if (mode !== prev) {
      if (mode === "expanded" && (prev === "collapsed" || prev === "toast" || prev === "osd")) playSfx("open");
      else if (prev === "expanded" && mode === "collapsed") playSfx("close");
      else if (isPrimary && (mode === "claude" || mode === "reminder" || mode === "guard")) playSfx("attention");
    }
    if (s.tab !== p.tab && mode === "expanded") playSfx("tab");
    // Yeni olay kartı (liste sonuna eklenir). Diğer ekranlardaki adalar aynı kartı tekrar çalmasın.
    const nt = s.toasts[s.toasts.length - 1];
    if (isPrimary && nt && nt.id !== p.toasts[p.toasts.length - 1]?.id && s.toasts.length >= p.toasts.length) {
      const k = toastSfx(nt.kind);
      if (k) playSfx(k);
    }
    if (isPrimary && s.hum?.phase === "found" && p.hum?.phase !== "found") playSfx("found");
    if (s.mood !== p.mood) {
      if (s.mood === "chewing") playSfx("munch");
      else if (s.mood === "happy") playSfx("happy");
    }
    if (s.antic === "giggle" && p.antic !== "giggle") playSfx("giggle");
  });
}
