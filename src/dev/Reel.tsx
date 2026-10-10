/**
 * Yalnızca geliştirme: ?preview=reel&lang=tr|en — Instagram tanıtım videosu (9:16, 1080×1920).
 * Gerçek ada (App) bir "ekranın" içinde, zaman çizelgesindeki işaretlerle sürülür; imleç, tuşlar ve
 * sahneler üstte çizilir. Sesler Nook'un kendi sentez sesleri (lib/sfx) ve birkaç klik/tuş sesi.
 *
 * Çekim: sayfanın saati durdurulur (window.__vt), kareler tek tek ilerletilip çekilir, sonunda
 * __renderReelAudio() ile ses izi aynı zamanlamayla üretilir. Tarayıcıda canlı da oynar
 * (?t=12 → 12. saniyeden başla).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MicOff } from "lucide-react";
import App from "../App";
import { figureRes, NookFigure } from "../components/mascot/Figure";
import { Perch } from "../components/outings/Perch";
import { StageBox } from "../components/shield/kit";
import { devEmit, EVENTS } from "../lib/bridge";
import { useClaude } from "../lib/claude";
import { lang } from "../lib/i18n";
import { DEFAULT_LOOK, normalizeColor, normalizeLook, SHOWCASE, type Look } from "../lib/look";
import { latestNote } from "../lib/notes";
import { prefetchBodies } from "../lib/nook3d";
import { render as renderSfx, type Sfx } from "../lib/sfx";
import { useNook } from "../store/nook";

export const REEL_W = 702;
export const REEL_H = 1248;
const END = 42;

const EN = lang !== "tr";
const T = EN
  ? {
      hook1: "A tiny blob lives",
      hook2: "at the top of your screen.",
      open: "Hover. It opens.",
      openK: "Nook for Windows",
      hum: "Finds the song that's playing.",
      humK: "Hum · Ctrl+Alt+M",
      shield: "Hides your screen in one key.",
      shieldK: "Privacy shield · Ctrl+Alt+H",
      claude1: "Claude needs permission?",
      claude2: "Answer from the island.",
      claudeK: "Claude Code",
      out: "It wanders around your screen.",
      outK: "Nook goes outside",
      guard1: "Get distracted?",
      guard2: "It knocks on the glass.",
      guardK: "Pomodoro · focus guard",
      look: "Dress it your way.",
      lookK: "14 bodies · 20 colors · hats & glasses",
      cta: "Free for Windows.",
      ctaSub: "Link in bio",
      video: "Night Drive · Official Video",
      explorer: "Documents — File Explorer",
      term: "Add Claude Code to the island",
      editing: "Editing · ClaudePanel.tsx",
      waiting: "Waiting for approval · npm run build",
      built: "Build passed",
      done: "Claude finished · Nook · 4 min",
      doneSub: "Build passed, the installer is ready.",
      ask: "Wants to run a command",
      allow: "Allow",
      media: "Media",
      bulut: "Cloud",
    }
  : {
      hook1: "Ekranının tepesinde",
      hook2: "minik bir blob yaşıyor.",
      open: "Üstüne gel, açılsın.",
      openK: "Windows için Nook",
      hum: "Çalan şarkıyı bulur.",
      humK: "Hum · Ctrl+Alt+M",
      shield: "Bir tuşla ekranını gizler.",
      shieldK: "Gizlilik kalkanı · Ctrl+Alt+H",
      claude1: "Claude izin mi istiyor?",
      claude2: "Adadan cevapla.",
      claudeK: "Claude Code",
      out: "Ekranında dolaşır.",
      outK: "Nook dışarı çıkıyor",
      guard1: "Dikkatin mi dağıldı?",
      guard2: "Cama vurur.",
      guardK: "Pomodoro · odak bekçisi",
      look: "İstediğin gibi giydir.",
      lookK: "14 gövde · 20 renk · şapkalar, gözlükler",
      cta: "Windows için ücretsiz.",
      ctaSub: "Bağlantı profilde",
      video: "Gece Yolculuğu · Resmi Video",
      explorer: "Belgeler — Dosya Gezgini",
      term: "Claude Code entegrasyonunu ekle",
      editing: "Düzenliyor · ClaudePanel.tsx",
      waiting: "Onay bekliyor · npm run build",
      built: "Derleme tamam",
      done: "Claude bitirdi · Nook · 4 dk",
      doneSub: "Derleme tamam, kurulum dosyası hazır.",
      ask: "Komut çalıştırmak istiyor",
      allow: "İzin ver",
      media: "Medya",
      bulut: "Bulut",
    };

// ------------------------------------------------------------------ yerleşim

/** "Ekran": gerçek ada bunun içinde yaşar */
const MON = { x: 26, y: 318, w: 650, h: 610, r: 34 };
/** Adanın ortası (ekranın üst kenarı) */
const NOTCH = { x: MON.x + MON.w / 2, y: MON.y + 17 };

type Scene = "hook" | "open" | "hum" | "shield" | "claude" | "out" | "guard" | "look" | "cta";
const SCENES: { id: Scene; at: number; color: string }[] = [
  { id: "hook", at: 0, color: "#7c8cff" },
  { id: "open", at: 3.4, color: "#bf5af2" },
  { id: "hum", at: 9.0, color: "#ff4fa3" },
  { id: "shield", at: 14.2, color: "#9b7bff" },
  { id: "claude", at: 19.6, color: "#D97757" },
  { id: "out", at: 25.2, color: "#2fd4c0" },
  { id: "guard", at: 30.6, color: "#ff453a" },
  { id: "look", at: 34.4, color: "#ffd21f" },
  { id: "cta", at: 38.0, color: "#30d158" },
];
const sceneAt = (t: number) => [...SCENES].reverse().find((s) => t >= s.at) ?? SCENES[0];

// ------------------------------------------------------------------ saat

declare global {
  interface Window {
    __vt?: { now: number; step: (dt: number) => void };
    __sfxLog?: { kind: string; at: number }[];
    __reelStart?: () => void;
    __reelReady?: boolean;
    __renderReelAudio?: (sec: number) => Promise<string>;
    __reelEnd?: number;
  }
}

/** Videonun 0. saniyesi (performance.now, ms) */
let startAt = 0;

/** Saniye cinsinden zaman; başlamadan 0. Çekimde başlatıcı __reelStart'ı çağırır. */
function useClock() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const jump = Number(new URLSearchParams(location.search).get("t") ?? 0);
    let start = -1;
    let raf = 0;
    const loop = () => {
      if (start >= 0) setT(Math.min(END, (performance.now() - start) / 1000 + jump));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.__reelStart = () => {
      start = performance.now();
      startAt = start;
    };
    // Canlı izlerken: 3B Nook'lar hazırlansın diye biraz bekle
    const auto = window.__vt ? 0 : window.setTimeout(() => window.__reelStart?.(), 1800);
    window.__reelEnd = END;
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(auto);
    };
  }, []);
  return t;
}

// ------------------------------------------------------------------ ses

type ReelSfx = Sfx | "click" | "key" | "whoosh" | "mic" | "pop2";

let liveCtx: AudioContext | null = null;
function sfx(kind: ReelSfx) {
  if (window.__sfxLog) {
    window.__sfxLog.push({ kind, at: performance.now() });
    return;
  }
  try {
    liveCtx ??= new AudioContext();
    void liveCtx.resume();
    playInto(liveCtx, liveCtx.destination, kind, liveCtx.currentTime + 0.01);
  } catch {
    // ses yoksa sessiz
  }
}

function osc(a: BaseAudioContext, out: AudioNode, f: number, at: number, dur: number, to?: number, gain = 0.25, type: OscillatorType = "sine") {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur * 0.8);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + dur + 0.02);
}

function burst(a: BaseAudioContext, out: AudioNode, at: number, dur: number, freq: number, gain: number, q = 1.2, curve = 6) {
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  let seed = 7;
  for (let i = 0; i < len; i++) {
    seed = (seed * 16807) % 2147483647;
    d[i] = ((seed / 2147483647) * 2 - 1) * Math.pow(1 - i / len, curve);
  }
  const src = a.createBufferSource();
  src.buffer = buf;
  const band = a.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = freq;
  band.Q.value = q;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(band).connect(g).connect(out);
  src.start(at);
}

/** Nook'un sesleri ve videoya özel birkaç ses (fare tıkı, tuş, geçiş) aynı zincirden */
function playInto(a: BaseAudioContext, dest: AudioNode, kind: ReelSfx, t: number) {
  const out = a.createGain();
  out.gain.value = 0.36;
  const soft = a.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = 6000;
  out.connect(soft).connect(dest);
  switch (kind) {
    case "click":
      burst(a, out, t, 0.025, 3800, 0.9, 1.6, 7);
      osc(a, out, 1800, t, 0.03, 1200, 0.08, "triangle");
      break;
    case "key":
      burst(a, out, t, 0.04, 2600, 1.1, 1.1, 5);
      osc(a, out, 240, t, 0.05, 160, 0.12);
      break;
    case "whoosh": {
      const len = Math.floor(a.sampleRate * 0.5);
      const buf = a.createBuffer(1, len, a.sampleRate);
      const d = buf.getChannelData(0);
      let seed = 3;
      for (let i = 0; i < len; i++) {
        seed = (seed * 16807) % 2147483647;
        const k = i / len;
        d[i] = ((seed / 2147483647) * 2 - 1) * Math.sin(Math.PI * k) ** 2;
      }
      const src = a.createBufferSource();
      src.buffer = buf;
      const f = a.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = 0.9;
      f.frequency.setValueAtTime(500, t);
      f.frequency.exponentialRampToValueAtTime(2600, t + 0.45);
      const g = a.createGain();
      g.gain.value = 0.32;
      src.connect(f).connect(g).connect(out);
      src.start(t);
      break;
    }
    case "mic":
      // Kalkanın mikrofon kliki (lib/clickSound ile aynı)
      burst(a, out, t, 0.03, 2400, 1.5, 1.4, 6);
      osc(a, out, 760, t, 0.12, 380, 0.35);
      break;
    case "pop2":
      osc(a, out, 620, t, 0.06, 980, 0.16);
      break;
    default:
      renderSfx(kind, a, out, t);
  }
}

/** Çekim bitince: kaydedilen seslerden tek bir WAV (base64) üretir */
async function renderReelAudio(sec: number) {
  const rate = 48000;
  const a = new OfflineAudioContext(2, Math.ceil(sec * rate), rate);
  const bus = a.createGain();
  bus.connect(a.destination);
  for (const e of window.__sfxLog ?? []) {
    const at = (e.at - startAt) / 1000 + 0.01;
    if (at < 0 || at > sec) continue;
    playInto(a, bus, e.kind as ReelSfx, at);
  }
  const buf = await a.startRendering();
  // Tepe -3 dB'e
  let peak = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) for (const v of buf.getChannelData(c)) peak = Math.max(peak, Math.abs(v));
  const k = peak > 0 ? 0.7 / peak : 1;
  const n = buf.length;
  const wav = new DataView(new ArrayBuffer(44 + n * 4));
  const w = (o: number, s: string) => [...s].forEach((ch, i) => wav.setUint8(o + i, ch.charCodeAt(0)));
  w(0, "RIFF");
  wav.setUint32(4, 36 + n * 4, true);
  w(8, "WAVE");
  w(12, "fmt ");
  wav.setUint32(16, 16, true);
  wav.setUint16(20, 1, true);
  wav.setUint16(22, 2, true);
  wav.setUint32(24, rate, true);
  wav.setUint32(28, rate * 4, true);
  wav.setUint16(32, 4, true);
  wav.setUint16(34, 16, true);
  w(36, "data");
  wav.setUint32(40, n * 4, true);
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);
  for (let i = 0; i < n; i++) {
    wav.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i] * k)) * 32767, true);
    wav.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i] * k)) * 32767, true);
  }
  const bytes = new Uint8Array(wav.buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// ------------------------------------------------------------------ yardımcılar

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
/** t, [a,b] aralığında 0→1 (yumuşak) */
const span = (t: number, a: number, b: number) => ease(clamp((t - a) / (b - a)));

const ART =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#ff375f'/><stop offset='0.5' stop-color='#bf5af2'/><stop offset='1' stop-color='#0a84ff'/></linearGradient></defs><rect width='200' height='200' fill='url(#g)'/><circle cx='100' cy='100' r='46' fill='none' stroke='white' stroke-opacity='.5' stroke-width='6'/></svg>`,
  );

/** Ekrandaki bir öğenin (yazısına göre) ortası, sayfa koordinatında */
function centerOf(text: string): { x: number; y: number } | null {
  const root = document.querySelector("[data-reel-monitor]");
  if (!root) return null;
  for (const el of root.querySelectorAll<HTMLElement>("button, span, p, div")) {
    if (el.children.length > 2) continue;
    if (el.textContent?.trim() !== text) continue;
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return null;
}

// ------------------------------------------------------------------ imleç

type Target = "chip" | "allow";
interface Key {
  t: number;
  x: number;
  y: number;
  /** Bu noktaya yazıyla bulunan öğe (ada çipi gibi); bulunamazsa x, y */
  at?: Target;
}
/** Sahnelerdeki imleç yolu; aralarda gizlenir */
const TRACKS: Key[][] = [
  [
    { t: 3.7, x: 560, y: 880 },
    { t: 4.55, x: NOTCH.x + 6, y: NOTCH.y + 4 },
    { t: 5.2, x: NOTCH.x + 40, y: NOTCH.y + 120 },
    { t: 5.9, x: NOTCH.x + 40, y: NOTCH.y + 120, at: "chip" },
    { t: 7.4, x: NOTCH.x + 40, y: NOTCH.y + 120, at: "chip" },
    { t: 8.2, x: 560, y: 900 },
  ],
  [
    { t: 20.6, x: 520, y: 860 },
    { t: 22.0, x: 560, y: 360, at: "allow" },
    { t: 22.5, x: 560, y: 360, at: "allow" },
    { t: 23.4, x: 470, y: 800 },
  ],
  // Tünek: pencereyi başlık çubuğundan tutup sağa sola sürükler
  [
    { t: 25.7, x: 600, y: 870 },
    { t: 26.15, x: MON.x + 300, y: MON.y + 262 },
    { t: 26.25, x: MON.x + 300, y: MON.y + 262 },
    { t: 26.6, x: MON.x + 420, y: MON.y + 262 },
    { t: 27.15, x: MON.x + 420, y: MON.y + 262 },
    { t: 27.5, x: MON.x + 230, y: MON.y + 262 },
    { t: 27.9, x: MON.x + 230, y: MON.y + 262 },
  ],
  // İp: imleç yaklaşınca Nook kaçar
  [
    { t: 28.9, x: 600, y: 900 },
    { t: 29.9, x: NOTCH.x + 30, y: MON.y + 250 },
    { t: 30.4, x: NOTCH.x + 40, y: MON.y + 270 },
  ],
];
const CLICKS = [5.95, 22.2];
const GRABS: [number, number][] = [[26.2, 27.9]];
/** Tünek penceresinin yatay kayması (imleçle birlikte) */
const winShift = (t: number) => (t < 26.25 ? 0 : t < 26.6 ? 120 * span(t, 26.25, 26.6) : t < 27.15 ? 120 : t < 27.5 ? 120 - 190 * span(t, 27.15, 27.5) : -70);

/** Yazıyla bulunan hedefler bir kez bulunur, sonra o noktada kalır (öğe kaybolsa da) */
const targets: Partial<Record<Target, { x: number; y: number }>> = {};
function resolveTarget(at: Target) {
  if (!targets[at]) {
    const p = centerOf(at === "chip" ? T.media : T.allow);
    if (p) targets[at] = p;
  }
  return targets[at] ?? null;
}

function trackPos(t: number) {
  for (const tr of TRACKS) {
    const first = tr[0].t;
    const last = tr[tr.length - 1].t;
    if (t < first - 0.25 || t > last + 0.3) continue;
    const pt = (k: Key) => (k.at ? (resolveTarget(k.at) ?? { x: k.x, y: k.y }) : { x: k.x, y: k.y });
    let p = pt(tr[0]);
    for (let i = 0; i < tr.length - 1; i++) {
      const a = tr[i];
      const b = tr[i + 1];
      if (t >= a.t && t <= b.t) {
        const pa = pt(a);
        const pb = pt(b);
        const k = ease((t - a.t) / (b.t - a.t));
        p = { x: pa.x + (pb.x - pa.x) * k, y: pa.y + (pb.y - pa.y) * k };
        break;
      }
      if (t > b.t) p = pt(b);
    }
    const opacity = t < first ? clamp((t - (first - 0.25)) / 0.25) : t > last ? 1 - clamp((t - last) / 0.3) : 1;
    return { ...p, opacity };
  }
  return null;
}

function Cursor({ t }: { t: number }) {
  const p = trackPos(t);
  if (!p) return null;
  const click = CLICKS.find((c) => t >= c && t < c + 0.45);
  const down = (click !== undefined && t < click + 0.12) || GRABS.some(([a, b]) => t >= a && t <= b);
  return (
    <div className="pointer-events-none absolute z-[60]" style={{ left: p.x, top: p.y, opacity: p.opacity }}>
      {click !== undefined && (
        <span
          className="absolute rounded-full border-2 border-white"
          style={{ left: -22, top: -22, width: 44, height: 44, opacity: 1 - clamp((t - click) / 0.45), transform: `scale(${0.4 + clamp((t - click) / 0.45) * 0.9})` }}
        />
      )}
      <svg width="30" height="30" viewBox="0 0 24 24" style={{ transform: `translate(-3px,-2px) scale(${down ? 0.86 : 1})`, transformOrigin: "3px 2px", filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.55))" }}>
        <path d="M4 2.5 L4 19.5 L8.6 15.2 L11.6 21.6 L14.6 20.2 L11.7 13.9 L18 13.9 Z" fill="#fff" stroke="#111" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Adanın gözleri imleci izlesin; ipteki Nook yaklaşan imleci fark etsin (sayfa koordinatı) */
function CursorFeed({ t }: { t: number }) {
  useEffect(() => {
    const p = trackPos(t);
    if (!p || p.opacity <= 0) devEmit(EVENTS.cursor, { x: -1e4, y: -1e4, near: false, inside: false });
    else devEmit(EVENTS.cursor, { x: p.x, y: p.y, near: true, inside: false });
  }, [t]);
  return null;
}

// ------------------------------------------------------------------ parçalar

function Kicker({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[17px] font-semibold" style={{ background: `${color}22`, borderColor: `${color}55`, color }}>
      <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
      {children}
    </span>
  );
}

/** Üstteki büyük başlık: sahne değişince yumuşakça yenisi gelir */
function Headline({ scene, t }: { scene: Scene; t: number }) {
  const c = SCENES.find((s) => s.id === scene)!.color;
  const content: Partial<Record<Scene, { k?: string; a: string; b?: string }>> = {
    open: { k: T.openK, a: T.open },
    hum: { k: T.humK, a: T.hum },
    shield: { k: T.shieldK, a: T.shield },
    claude: { k: T.claudeK, a: T.claude1, b: T.claude2 },
    out: { k: T.outK, a: T.out },
    guard: { k: T.guardK, a: T.guard1, b: T.guard2 },
    look: { k: T.lookK, a: T.look },
  };
  const h = content[scene];
  // Sahne bitmeden az önce başlık çekilir
  const next = SCENES[SCENES.findIndex((s) => s.id === scene) + 1];
  const leaving = next && t > next.at - 0.25;
  return (
    <div className="absolute inset-x-0 z-40 flex flex-col items-center text-center" style={{ top: 120, height: 180 }}>
      <AnimatePresence mode="wait">
        {h && !leaving && (
          <motion.div
            key={scene}
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
            transition={{ duration: 0.45, ease: [0.2, 0.8, 0.3, 1] }}
          >
            {h.k && <Kicker color={c}>{h.k}</Kicker>}
            <h1 className="px-6 font-display text-[50px] font-bold leading-[1.06] tracking-[-0.035em] text-white">
              {h.a}
              {h.b && (
                <>
                  <br />
                  <span style={{ color: c }}>{h.b}</span>
                </>
              )}
            </h1>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Ekranın üstünde basılan tuşlar */
function KeyCaps({ t, at, keys, color }: { t: number; at: number; keys: string[]; color: string }) {
  const on = t >= at && t < at + 1.05;
  return (
    <AnimatePresence>
      {on && (
        <motion.div
          className="absolute left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-[26px] border border-white/15 px-5 py-4"
          style={{ top: MON.y + 380, background: "rgba(16,16,22,0.72)", backdropFilter: "blur(14px)", boxShadow: `0 20px 50px -10px rgba(0,0,0,0.7), 0 0 40px -12px ${color}` }}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
        >
          {keys.map((k, i) => {
            const pressed = t >= at + 0.12 + i * 0.1;
            return (
              <span key={k} className="flex items-center gap-3">
                {i > 0 && <span className="text-[24px] font-medium text-white/40">+</span>}
                <span
                  className="flex h-[62px] min-w-[70px] items-center justify-center rounded-[14px] border px-4 text-[24px] font-semibold"
                  style={{
                    background: pressed ? `${color}33` : "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05))",
                    borderColor: pressed ? color : "rgba(255,255,255,0.2)",
                    color: pressed ? "#fff" : "rgba(255,255,255,0.85)",
                    transform: `translateY(${pressed ? 3 : 0}px)`,
                    boxShadow: pressed ? `0 1px 0 rgba(0,0,0,0.6), 0 0 22px -4px ${color}` : "0 4px 0 rgba(0,0,0,0.6)",
                  }}
                >
                  {k}
                </span>
              </span>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Windows 11 tarzı koyu duvar kâğıdı + görev çubuğu */
function Wallpaper({ tint }: { tint: string }) {
  return (
    <div className="absolute inset-0" style={{ background: "#0b1020" }}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70% 55% at 25% 105%, ${tint}66 0%, transparent 70%), radial-gradient(60% 50% at 85% 10%, #3b5bdb55 0%, transparent 70%), radial-gradient(90% 70% at 50% 60%, #1a2246 0%, #0b1020 80%)`,
          transition: "background 0.6s",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 flex h-[46px] items-center justify-center gap-2.5 border-t border-white/[0.06] bg-black/45 backdrop-blur">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="h-[22px] w-[22px] rounded-[6px]" style={{ background: i === 0 ? "linear-gradient(135deg,#4cc2ff,#0a6cff)" : `rgba(255,255,255,${i === 1 ? 0.3 : 0.14})` }} />
        ))}
      </div>
    </div>
  );
}

function Win({ title, style, children, light, dot }: { title: string; style: CSSProperties; children?: ReactNode; light?: boolean; dot?: string }) {
  return (
    <div
      className="absolute overflow-hidden rounded-[12px] border shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]"
      style={{ background: light ? "#f3f3f5" : "#141419", borderColor: light ? "#d8d8de" : "rgba(255,255,255,0.09)", ...style }}
    >
      <div className="flex h-[34px] items-center gap-2 px-3.5 text-[13px]" style={{ background: light ? "#e7e7ec" : "#1e1e25", color: light ? "#333" : "rgba(255,255,255,0.7)" }}>
        {dot && <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />}
        <span className="truncate">{title}</span>
        <span className="ml-auto tracking-[14px] opacity-60">— ▢ ✕</span>
      </div>
      {children}
    </div>
  );
}

function VideoWin({ t }: { t: number }) {
  const p = clamp((t - 9) / 6);
  return (
    <Win title={`YouTube — ${T.video}`} dot="#ff0033" style={{ left: 34, top: 150, width: 582, height: 360 }}>
      <div className="relative h-[326px] overflow-hidden" style={{ background: "linear-gradient(180deg, #ff7a59 0%, #c2416b 38%, #3b1d5c 70%, #0f0a1f 100%)" }}>
        {/* Gün batımı, şehir silueti, yol */}
        <div className="absolute left-1/2 top-[34%] h-[130px] w-[130px] rounded-full" style={{ background: "radial-gradient(circle, #ffe08a 0%, #ff9e5e 55%, transparent 72%)", transform: `translate(-50%, ${p * 26}px)` }} />
        <svg className="absolute inset-x-0 bottom-[70px] h-[110px] w-full" viewBox="0 0 582 110" preserveAspectRatio="none">
          <path
            d="M0 110 L0 60 L30 60 L30 30 L60 30 L60 70 L90 70 L90 18 L118 18 L118 55 L150 55 L150 40 L180 40 L180 75 L215 75 L215 25 L240 25 L240 62 L280 62 L280 44 L310 44 L310 80 L340 80 L340 22 L372 22 L372 58 L400 58 L400 36 L440 36 L440 72 L470 72 L470 28 L500 28 L500 64 L540 64 L540 42 L582 42 L582 110 Z"
            fill="#1a0f2e"
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 h-[72px]" style={{ background: "linear-gradient(180deg, #120a22, #07050e)" }}>
          <div className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2" style={{ background: "repeating-linear-gradient(180deg, #ffd27a 0 14px, transparent 14px 28px)", backgroundPositionY: `${t * 120}px` }} />
        </div>
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2.5">
          <span className="text-[12px] text-white/80">▶</span>
          <div className="h-[4px] flex-1 rounded-full bg-white/25">
            <div className="h-full rounded-full bg-[#ff0033]" style={{ width: `${32 + p * 30}%` }} />
          </div>
          <span className="text-[11px] tabular-nums text-white/70">1:{String(12 + Math.floor(p * 40)).padStart(2, "0")}</span>
        </div>
      </div>
    </Win>
  );
}

function TermWin({ t }: { t: number }) {
  const waiting = t >= 20.2 && t < 22.25;
  const done = t >= 22.25;
  return (
    <Win title="Windows Terminal — claude" style={{ left: 40, top: 172, width: 570, height: 330 }}>
      <div className="space-y-1.5 p-4 font-mono text-[13.5px] leading-[1.5] text-white/70">
        <p className="text-white/45">
          {"> "}
          {T.term}
        </p>
        <p>
          <span style={{ color: "#D97757" }}>✻</span> {T.editing}
        </p>
        <p className="text-white/40">{"  ⎿  +42 −7"}</p>
        <p>
          <span style={{ color: "#D97757" }}>✻</span> {waiting ? T.waiting : done ? "✓ npm run build" : "…"}
        </p>
        {done && (
          <p className="text-[#5be08a]">
            {"  ⎿  "}
            {T.built}
          </p>
        )}
        <p className="pt-2 text-white/30">
          <span className="inline-block h-[15px] w-[8px] translate-y-[2px]" style={{ background: Math.floor(t * 2) % 2 ? "rgba(255,255,255,0.6)" : "transparent" }} />
        </p>
      </div>
    </Win>
  );
}

function BrowserWin() {
  const thumbs = [
    "linear-gradient(135deg,#ff2d55,#7a0018)",
    "linear-gradient(135deg,#ff9f0a,#7a3b00)",
    "linear-gradient(135deg,#5e5ce6,#1c1a5c)",
    "linear-gradient(135deg,#30d158,#0b4a1c)",
    "linear-gradient(135deg,#64d2ff,#0a3d62)",
    "linear-gradient(135deg,#bf5af2,#3d1258)",
  ];
  return (
    <Win title="YouTube" dot="#ff0033" style={{ left: 34, top: 150, width: 582, height: 380 }}>
      <div className="grid grid-cols-3 gap-3 p-4">
        {thumbs.map((g, i) => (
          <div key={i}>
            <div className="h-[92px] rounded-[8px]" style={{ background: g }} />
            <div className="mt-2 h-2 w-4/5 rounded-full bg-white/15" />
            <div className="mt-1.5 h-2 w-1/2 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    </Win>
  );
}

/** Tünek: pencere imleçle kayar, tepesindeki Nook (gerçek Perch) sendeler */
function PerchWin({ t }: { t: number }) {
  const x = winShift(t);
  const last = useRef({ x: 0, t: 0 });
  useEffect(() => {
    const dt = Math.max(1 / 60, t - last.current.t);
    const vx = (x - last.current.x) / dt;
    last.current = { x, t };
    devEmit(EVENTS.perchMove, { vx: vx * 1.6, vy: 0 });
  }, [t, x]);
  return (
    <>
      <Win title={T.explorer} light style={{ left: 130 + x, top: 248, width: 390, height: 250 }}>
        <div className="space-y-2.5 p-4">
          {[70, 52, 64, 40].map((w, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="h-5 w-5 rounded-[4px]" style={{ background: ["#ffc83d", "#4cc2ff", "#ffc83d", "#7fd858"][i] }} />
              <span className="h-2.5 rounded-full bg-black/10" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </Win>
      {/* Tünek kutusu: alt kenarı başlık çubuğunun 12 px altında (dev/PerchStage gibi) */}
      <div className="absolute" style={{ left: 130 + x + 150, top: 248 + 12 - 150, width: 160, height: 150, transform: "translateZ(0)" }}>
        <Perch />
      </div>
    </>
  );
}

/** Kalkan: gerçek kalkan sahneleri ekranın içinde */
const shieldScenes: { Campfire?: () => React.JSX.Element; Ocean?: () => React.JSX.Element } = {};
/** Çekim başlamadan yüklenir: sahne değişirken boş (siyah) kare kalmasın */
const loadShieldScenes = () =>
  Promise.all([import("../components/shield/scenesA"), import("../components/shield/scenesC")]).then(([a, c]) => {
    shieldScenes.Campfire = a.Campfire;
    shieldScenes.Ocean = c.Ocean;
  });
const Campfire = () => (shieldScenes.Campfire ? <shieldScenes.Campfire /> : null);
const Ocean = () => (shieldScenes.Ocean ? <shieldScenes.Ocean /> : null);

function ShieldCover({ t }: { t: number }) {
  const on = t >= 14.95 && t < 19.35;
  const second = t >= 17.2;
  return (
    <AnimatePresence>
      {on && (
        <motion.div
          className="absolute inset-0 z-30 overflow-hidden bg-black"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.3, 1] }}
        >
          <StageBox.Provider value={{ w: MON.w, h: MON.h }}>
            <AnimatePresence>
                <motion.div key={second ? "o" : "c"} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
                  {second ? <Ocean /> : <Campfire />}
                </motion.div>
            </AnimatePresence>
          </StageBox.Provider>
          <motion.span
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: "rgba(255,159,10,0.28)", color: "#ffb340", boxShadow: "0 0 20px -4px #ff9f0a" }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.45, type: "spring", stiffness: 500, damping: 16 }}
          >
            <MicOff size={20} strokeWidth={2.4} />
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const RAINBOW: CSSProperties = {
  background: "linear-gradient(90deg, #6f8bff 0%, #5ff0c0 28%, #ffe36b 52%, #ff7ad0 76%, #a774ff 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};
const MILK: CSSProperties = {
  background: "linear-gradient(90deg, #e9eeff 0%, #effff8 30%, #fffbe9 55%, #fff0fa 80%, #f3ecff 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

/** Dots afişi gibi kalabalık: Nook'lar alttan zıplayarak dolar */
function Crowd({ t }: { t: number }) {
  const k = MON.w / 620;
  const order = (x: number) => Math.abs(x - 300) / 300;
  return (
    <div className="absolute inset-0 z-30 overflow-hidden bg-black">
      <motion.div className="absolute inset-x-0 top-[70px] flex justify-center" initial={{ opacity: 0, scale: 0.9, filter: "blur(12px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ duration: 0.9 }}>
        <div className="relative">
          <span aria-hidden className="absolute inset-0 select-none text-[150px] font-semibold leading-none tracking-[-0.04em]" style={{ ...RAINBOW, filter: "blur(34px)", opacity: 0.85 }}>
            nook
          </span>
          <span aria-hidden className="absolute inset-0 select-none text-[150px] font-semibold leading-none tracking-[-0.04em]" style={{ ...RAINBOW, filter: "blur(10px)" }}>
            nook
          </span>
          <span className="relative select-none text-[150px] font-semibold leading-none tracking-[-0.04em]" style={MILK}>
            nook
          </span>
        </div>
      </motion.div>
      <div className="absolute left-0 top-[150px]" style={{ width: 620, height: 480, transform: `scale(${k})`, transformOrigin: "0 0" }}>
        {SHOWCASE.map((m, n) => {
          const delay = 0.25 + order(m.x) * 0.45 + (n < 6 ? 0.1 : 0);
          const named = n === 7 && t >= 36.6;
          return (
            <motion.div
              key={m.name}
              className="absolute"
              style={{ left: m.x - m.size / 2, top: m.y - m.size / 2, width: m.size, height: m.size, zIndex: named ? 30 : n < 6 ? 1 : 2 }}
              initial={{ y: 240, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 170, damping: 16, delay }}
            >
              <motion.div className="h-full w-full" animate={{ y: [0, -4 - (n % 3), 0], rotate: [0, n % 2 ? 2 : -2, 0] }} transition={{ duration: 2.4 + (n % 4) * 0.4, repeat: Infinity, ease: "easeInOut", delay: (n % 5) * 0.25 }}>
                <motion.div className="h-full w-full" animate={named ? { y: -16, scale: 1.08 } : { y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 20 }}>
                  <NookFigure look={m.look} color={m.color} size={m.size} expression={named ? "happy" : (m.mood ?? "idle")} smile={named || m.mood === "happy" || m.mood === "wink"} />
                </motion.div>
              </motion.div>
              {named && (
                <motion.span
                  className="absolute left-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[15px] font-semibold"
                  style={{ bottom: m.size + 4, x: "-50%", background: m.color, color: "#111" }}
                  initial={{ opacity: 0, y: 8, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 520, damping: 24 }}
                >
                  {T.bulut}
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-24" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }} />
    </div>
  );
}

// ------------------------------------------------------------------ zaman çizelgesi

interface Cue {
  at: number;
  run: () => void;
}

function useCues(t: number, cues: Cue[]) {
  const next = useRef(0);
  useLayoutEffect(() => {
    while (next.current < cues.length && cues[next.current].at <= t) cues[next.current++].run();
  }, [t, cues]);
}

const set = (p: Partial<ReturnType<typeof useNook.getState>>) => useNook.setState(p);

function calm() {
  set({ hovered: false, tab: "home", hum: null, guard: null, outing: null, toasts: [], claudeCard: false, antic: null } as never);
  useClaude.setState({ asks: [] });
}

const MEDIA = { title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", app: "Spotify.exe", playing: true, positionMs: 72_000, durationMs: 200_000, trackKey: "demo", artwork: ART };

function makeCues(): Cue[] {
  const now = () => Date.now();
  const cues: Cue[] = [
    { at: 0.25, run: () => sfx("pop") },
    { at: 2.95, run: () => sfx("whoosh") },
    // Üstüne gel: ada açılır (ana sayfa), Medya çipine tıklanır, imleç gidince kapanır
    { at: 4.6, run: () => set({ hovered: true }) },
    {
      at: 5.95,
      run: () => {
        sfx("click");
        set({ media: { ...MEDIA, at: performance.now() }, tab: "media" } as never);
      },
    },
    { at: 8.0, run: () => set({ hovered: false }) },
    { at: 8.7, run: () => set({ tab: "home" }) },
    // Hum
    { at: 9.0, run: () => (sfx("whoosh"), set({ media: null } as never)) },
    ...[0, 1, 2].map((i) => ({ at: 9.42 + i * 0.1, run: () => sfx("key") })),
    { at: 9.8, run: () => set({ hum: { phase: "listening", move: 0 } } as never) },
    ...[1, 2, 3, 4, 5].map((m, i) => ({ at: 10.25 + i * 0.36, run: () => set({ hum: { phase: "listening", move: m } } as never) })),
    {
      at: 12.0,
      run: () => set({ hum: { phase: "found", move: 0, track: { key: "1", title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", released: "2020", cover: ART } } } as never),
    },
    { at: 14.0, run: () => set({ hum: null } as never) },
    // Kalkan
    { at: 14.2, run: () => sfx("whoosh") },
    ...[0, 1, 2].map((i) => ({ at: 14.52 + i * 0.1, run: () => sfx("key") })),
    { at: 15.05, run: () => sfx("mic") },
    { at: 17.2, run: () => sfx("whoosh") },
    // Claude
    { at: 19.6, run: () => sfx("whoosh") },
    {
      at: 20.2,
      run: () => {
        useClaude.setState({ asks: [{ askId: 1, session: "a", project: "Nook", tool: "Bash", title: T.ask, detail: "npm run build", questions: null, canAlways: true, at: now() }] });
        set({ claudeCard: true } as never);
      },
    },
    {
      at: 22.2,
      run: () => {
        sfx("click");
        useClaude.setState({ asks: [] });
        set({ claudeCard: false } as never);
      },
    },
    { at: 22.55, run: () => useNook.getState().pushToast({ kind: "claude", title: T.done, detail: T.doneSub, ms: 2600 } as never) },
    { at: 25.0, run: () => set({ toasts: [] } as never) },
    // Dolaşma
    { at: 25.2, run: () => sfx("whoosh") },
    { at: 26.2, run: () => sfx("click") },
    { at: 28.0, run: () => set({ outing: "hang" } as never) },
    { at: 30.25, run: () => set({ outing: null } as never) },
    // Odak bekçisi: Pomodoro sürerken YouTube öne gelir
    { at: 30.6, run: () => sfx("whoosh") },
    { at: 30.7, run: () => set({ focus: { phase: "work", endsAt: now() + 14 * 60_000 + 6000, left: 0, total: 25 * 60_000, round: 1 } } as never) },
    { at: 30.75, run: () => devEmit(EVENTS.foreground, { title: "YouTube - Google Chrome", app: "chrome" }) },
    { at: 31.7, run: () => set({ guard: { site: "YouTube" } } as never) },
    { at: 34.1, run: () => (devEmit(EVENTS.foreground, { title: "", app: "explorer" }), set({ guard: null, focus: null } as never)) },
    // Kalabalık
    { at: 34.4, run: () => sfx("whoosh") },
    ...[34.75, 34.95, 35.12, 35.3].map((at) => ({ at, run: () => sfx("pop2") })),
    { at: 36.6, run: () => sfx("happy") },
    // Kapanış
    { at: 38.0, run: () => sfx("whoosh") },
    { at: 38.35, run: () => sfx("pop") },
    { at: 39.4, run: () => sfx("giggle") },
  ];
  return cues.sort((a, b) => a.at - b.at);
}

// ------------------------------------------------------------------ video

export function Reel() {
  const t = useClock();
  const cues = useMemo(makeCues, []);
  useCues(t, cues);
  const scene = sceneAt(t).id;
  const color = sceneAt(t).color;
  const settings = useNook((s) => s.settings);
  const look = normalizeLook(settings.look);
  const face = normalizeColor(settings.faceColor);

  // Hazırlık: arka plan, sakin ada, Nook'ların resimleri önceden
  useEffect(() => {
    document.documentElement.style.background = "#05060a";
    document.body.style.background = "#05060a";
    set({ affection: 92, notesSeen: latestNote().version, events: [], media: null } as never);
    useNook.getState().updateSettings({ calCountdown: false });
    calm();
    const mine = (size: number, l: Look = look) => ({ look: l, color: face, size: figureRes(size) });
    prefetchBodies([
      mine(230),
      mine(26),
      mine(24),
      ...SHOWCASE.map((m) => ({ look: m.look, color: m.color, size: figureRes(m.size) })),
      { look: { ...DEFAULT_LOOK, ...look, head: "headphones" }, color: face, size: figureRes(40) },
    ]);
    window.__renderReelAudio = renderReelAudio;
    void loadShieldScenes().then(() => (window.__reelReady = true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sahne değişince adayı sakinleştir (bir sahnenin durumu ötekine taşmasın)
  const prevScene = useRef(scene);
  useEffect(() => {
    if (prevScene.current !== scene && scene !== "open") calm();
    prevScene.current = scene;
  }, [scene]);

  const inHook = t < 3.4;
  const inCta = t >= 38;
  const monitorIn = span(t, 2.9, 3.6);
  const monitorOut = span(t, 37.9, 38.5);
  const monitorShow = monitorIn * (1 - monitorOut);

  return (
    <div className="fixed left-0 top-0 overflow-hidden font-sans" style={{ width: REEL_W, height: REEL_H, background: "#05060a" }}>
      {/* Arkada sahnenin renginde yumuşak ışık */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(60% 40% at 50% 8%, ${color}38 0%, transparent 70%), radial-gradient(70% 45% at 50% 100%, ${color}26 0%, transparent 70%)`, transition: "background 0.8s" }} />
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "26px 26px", maskImage: "radial-gradient(60% 50% at 50% 50%, black, transparent)" }} />

      <Headline scene={scene} t={t} />

      {/* Açılış: kocaman Nook belirir, sonra çentiğe uçar */}
      {inHook && <Hook t={t} look={look} color={face} />}

      {/* Ekran */}
      <div
        data-reel-monitor
        className="absolute overflow-hidden"
        style={{
          left: MON.x,
          top: MON.y,
          width: MON.w,
          height: MON.h,
          borderRadius: MON.r,
          opacity: monitorShow,
          transform: `translateY(${(1 - monitorIn) * 40 + monitorOut * -20}px) scale(${0.94 + 0.06 * monitorIn - 0.04 * monitorOut})`,
          boxShadow: `0 40px 90px -20px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.09), 0 0 70px -30px ${color}`,
        }}
      >
        <Wallpaper tint={color} />
        <SceneWindows t={t} scene={scene} />
        {/* Gerçek ada: kendi "penceresi" bu kutu */}
        <div className="absolute inset-0" style={{ transform: "translateZ(0)" }}>
          <App />
        </div>
        {scene === "shield" && <ShieldCover t={t} />}
        {scene === "look" && <Crowd t={t} />}
      </div>

      {scene === "hum" && <KeyCaps t={t} at={9.3} keys={["Ctrl", "Alt", "M"]} color="#ff4fa3" />}
      {scene === "shield" && <KeyCaps t={t} at={14.4} keys={["Ctrl", "Alt", "H"]} color="#9b7bff" />}

      {inCta && <Cta t={t} look={look} color={face} />}

      <Cursor t={t} />
      <CursorFeed t={t} />

      {/* İmza */}
      <div className="absolute inset-x-0 flex items-center justify-center gap-2.5 text-[18px] font-medium text-white/55" style={{ top: 968, opacity: inCta ? 0 : 1, transition: "opacity 0.4s" }}>
        <NookFigure look={look} color={face} size={26} />
        <span className="font-semibold text-white/80">nook</span>
        <span className="text-white/30">·</span>
        @nooktheblob
      </div>
    </div>
  );
}

function SceneWindows({ t, scene }: { t: number; scene: Scene }) {
  return (
    <AnimatePresence>
      <motion.div key={scene} className="absolute inset-0" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.3, 1] }}>
        {scene === "hum" && <VideoWin t={t} />}
        {scene === "claude" && <TermWin t={t} />}
        {scene === "out" && t < 28.0 && <PerchWin t={t} />}
        {scene === "guard" && <BrowserWin />}
      </motion.div>
    </AnimatePresence>
  );
}

function Hook({ t, look, color }: { t: number; look: Look; color: string }) {
  // 0.25'te zıplayarak belirir; 2.85'ten sonra küçülüp çentiğe uçar
  const fly = span(t, 2.85, 3.35);
  const x = 351 + (NOTCH.x - 351) * fly;
  const y = 600 + (NOTCH.y - 600) * fly;
  const s = 1 - 0.9 * fly;
  return (
    <>
      <div className="absolute z-20" style={{ left: x - 115, top: y - 115, width: 230, height: 230, transform: `scale(${s})`, opacity: 1 - span(t, 3.2, 3.4) }}>
        <motion.div initial={{ y: 60, scaleY: 0.3, opacity: 0 }} animate={{ y: 0, scaleY: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 13, delay: 0.25 }}>
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            <NookFigure look={look} color={color} size={230} expression={t > 1.6 && t < 2.6 ? "happy" : "idle"} smile={t > 1.6 && t < 2.6} />
          </motion.div>
        </motion.div>
      </div>
      <motion.div
        className="absolute inset-x-0 z-30 flex flex-col items-center text-center"
        style={{ top: 830 }}
        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
        animate={t < 2.8 ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: -10, filter: "blur(8px)" }}
        transition={{ duration: 0.5, delay: t < 2.8 ? 0.7 : 0 }}
      >
        <h1 className="font-display text-[50px] font-bold leading-[1.08] tracking-[-0.035em] text-white">
          {T.hook1}
          <br />
          <span style={{ ...RAINBOW, filter: "saturate(1.2)" }}>{T.hook2}</span>
        </h1>
      </motion.div>
    </>
  );
}

function Cta({ t, look, color }: { t: number; look: Look; color: string }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center" style={{ paddingTop: 300 }}>
      <motion.div initial={{ scale: 0.2, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 240, damping: 13, delay: 0.3 }}>
        <motion.div animate={{ y: [0, -10, 0], rotate: [0, -3, 0, 3, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
          <NookFigure look={look} color={color} size={230} expression={t > 39.3 ? "happy" : "idle"} smile={t > 39.3} />
        </motion.div>
      </motion.div>
      <motion.h1
        className="mt-14 font-display text-[60px] font-bold leading-none tracking-[-0.04em] text-white"
        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, delay: 0.75 }}
      >
        {T.cta}
      </motion.h1>
      <motion.div className="mt-7 flex items-center gap-3" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 1.15 }}>
        <span className="rounded-full px-5 py-2.5 text-[22px] font-semibold text-black" style={{ background: "linear-gradient(90deg,#a7f3c9,#7ce0ff)" }}>
          {T.ctaSub} ↑
        </span>
      </motion.div>
      <motion.div className="mt-8 flex items-center gap-2.5 text-[22px] font-medium text-white/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1.5 }}>
        <span className="font-semibold text-white">nook</span>
        <span className="text-white/30">·</span>@nooktheblob
      </motion.div>
    </div>
  );
}
