/**
 * Yalnızca geliştirme: ?preview=reel03&lang=en — 0.3 güncellemesinin Instagram videosu (9:16).
 * Gerçek ada (App) ve gerçek Nook Studio, 1280×800'lük bir "masaüstünün" içinde yaşar; kamera o
 * masaüstünde gezinir (yakınlaşır, uzaklaşır). Açılışta "0.3.0"daki sıfırlar Nook'un gözleri olur.
 * Arkada sentez lo-fi (dev/reelMusic), üstünde Nook'un sesleri ve tık/tuş sesleri.
 *
 * Çekim dev/Reel ile aynı: sayfanın saati durur (window.__vt), kareler tek tek çekilir, sonunda
 * __renderReelAudio() müziği ve sesleri aynı zamanlamayla tek bir WAV'a yazar.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import App from "../App";
import { figureRes, NookFigure } from "../components/mascot/Figure";
import { UPDATE_ANIMS, UpdateBody } from "../components/overlays/UpdateAnims";
import { useArgus, type ArgusItem } from "../lib/argus";
import { devEmit, EVENTS } from "../lib/bridge";
import { useClaude } from "../lib/claude";
import { DEFAULT_LOOK, normalizeColor, normalizeLook, type Look } from "../lib/look";
import { latestNote } from "../lib/notes";
import { camp } from "../lib/outings";
import { prefetchBodies } from "../lib/nook3d";
import { render as renderSfx, type Sfx } from "../lib/sfx";
import { useUpdate } from "../lib/update";
import { Studio } from "../studio/Studio";
import { dayKey, useNook } from "../store/nook";
import { BAR, renderMusic } from "./reelMusic";

export const REEL_W = 702;
export const REEL_H = 1248;
/** 16 ölçü (90 BPM) */
const END = BAR * 16;
const MUSIC = { bars: 16, drumsFrom: 2, drumsTo: 14 };

// ------------------------------------------------------------------ yerleşim

/** Videodaki "ekran" çerçevesi */
const VIEW = { x: 20, y: 318, w: 662, h: 620, r: 30 };
/** Çerçevenin içindeki masaüstü (mantıksal px); çerçeveyle aynı oranda ki uzaktan bakınca boşluk kalmasın */
const DESK = { w: 1280, h: 1200 };
/** Studio penceresinin masaüstündeki yeri */
const STUDIO = { x: 110, y: 264, w: 1060, h: 672 };

type Scene = "intro" | "island" | "sizes" | "capsules" | "studio" | "deck" | "update" | "camp" | "cta";
const SCENES: { id: Scene; at: number; color: string }[] = [
  { id: "intro", at: 0, color: "#9b7bff" },
  { id: "island", at: BAR * 2, color: "#bf5af2" },
  { id: "sizes", at: BAR * 4, color: "#3fa9ff" },
  { id: "capsules", at: BAR * 5.5, color: "#ff4fa3" },
  { id: "studio", at: BAR * 7.5, color: "#8f6bff" },
  { id: "deck", at: BAR * 9.5, color: "#3d8bff" },
  { id: "update", at: BAR * 11, color: "#30d158" },
  { id: "camp", at: BAR * 12.5, color: "#ff9f0a" },
  { id: "cta", at: BAR * 14, color: "#30d158" },
];
const S = Object.fromEntries(SCENES.map((s) => [s.id, s.at])) as Record<Scene, number>;
const sceneAt = (t: number) => [...SCENES].reverse().find((s) => t >= s.at) ?? SCENES[0];

const HEAD: Partial<Record<Scene, { k: string; a: string; b: string }>> = {
  island: { k: "New island", a: "Redesigned", b: "from scratch." },
  sizes: { k: "Modules", a: "Every module gets", b: "its own size." },
  capsules: { k: "Closed island", a: "It shows", b: "what's going on." },
  studio: { k: "Nook Studio", a: "Settings moved", b: "into their own app." },
  deck: { k: "Shortcuts", a: "One tap.", b: "Whole routines." },
  update: { k: "Updates", a: "Updates play out", b: "on the island." },
  camp: { k: "After dark", a: "Idle at night?", b: "Marshmallows." },
};
/** Kapsül sahnesinde rozet, gösterilen kapsüle göre */
const CAP_KICKER: [number, string][] = [
  [S.capsules, "Music"],
  [S.capsules + 1.45, "Pomodoro"],
  [S.capsules + 2.75, "Claude Code"],
  [S.capsules + 4.0, "Two at once"],
];

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
    const auto = window.__vt ? 0 : window.setTimeout(() => window.__reelStart?.(), 2500);
    window.__reelEnd = END;
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(auto);
    };
  }, []);
  return t;
}

// ------------------------------------------------------------------ ses

type ReelSfx = Sfx | "click" | "key" | "whoosh" | "pop2" | "tick";

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
    case "tick":
      burst(a, out, t, 0.02, 5200, 0.5, 2, 8);
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
      g.gain.value = 0.26;
      src.connect(f).connect(g).connect(out);
      src.start(t);
      break;
    }
    case "pop2":
      osc(a, out, 620, t, 0.06, 980, 0.16);
      break;
    default:
      renderSfx(kind, a, out, t);
  }
}

/** Müziğin sesleri bastırmaması için ondan ne kadarı */
const MUSIC_GAIN = 0.55;

/** Çekim bitince: müzik + kaydedilen seslerden tek bir WAV (base64) */
async function renderReelAudio(sec: number) {
  const rate = 48000;
  const a = new OfflineAudioContext(2, Math.ceil(sec * rate), rate);
  const bus = a.createGain();
  bus.connect(a.destination);
  const music = a.createGain();
  music.gain.value = MUSIC_GAIN;
  music.connect(bus);
  renderMusic(a, music, sec, MUSIC);
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
/** Biraz taşıp geri oturan (yay gibi) */
const back = (k: number) => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
/** t, [a,b] aralığında 0→1 (yumuşak) */
const span = (t: number, a: number, b: number) => ease(clamp((t - a) / (b - a)));
const spring = (t: number, a: number, b: number) => (t <= a ? 0 : t >= b ? 1 : back((t - a) / (b - a)));
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

const ART =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#ff9f0a'/><stop offset='0.5' stop-color='#ff375f'/><stop offset='1' stop-color='#5e5ce6'/></linearGradient></defs><rect width='200' height='200' fill='url(#g)'/><circle cx='100' cy='100' r='52' fill='none' stroke='white' stroke-opacity='.45' stroke-width='5'/><circle cx='100' cy='100' r='9' fill='white' fill-opacity='.7'/></svg>`,
  );

// ------------------------------------------------------------------ kamera

interface Cam {
  cx: number;
  cy: number;
  s: number;
}
/** Masaüstünün üst kenarı çerçevenin üst kenarında, ortada */
const top = (s: number): Cam => ({ cx: DESK.w / 2, cy: VIEW.h / 2 / s, s });
const FULL: Cam = { cx: DESK.w / 2, cy: DESK.h / 2, s: Math.min(VIEW.w / DESK.w, VIEW.h / DESK.h) };
/** [başlangıç, bitiş, hedef]: aralıkta bir öncekinden hedefe yumuşakça */
const CAM_MOVES: [number, number, Cam][] = [
  [0, 0, top(1.6)],
  [S.island + 1.0, S.island + 1.7, top(0.82)],
  [S.capsules - 0.25, S.capsules + 0.35, top(2.0)],
  [S.capsules + 3.85, S.capsules + 4.3, top(1.62)],
  [S.studio - 0.1, S.studio + 0.6, FULL],
  [S.studio + 2.3, S.studio + 3.0, { cx: 760, cy: STUDIO.y + STUDIO.h / 2, s: 0.78 }],
  [S.deck - 0.2, S.deck + 0.5, top(0.82)],
  [S.update - 0.25, S.update + 0.35, top(2.1)],
  [S.update + 2.35, S.update + 2.85, top(1.55)],
  [S.camp - 0.2, S.camp + 0.4, top(2.3)],
];
function camAt(t: number): Cam {
  let c = CAM_MOVES[0][2];
  for (const [a, b, to] of CAM_MOVES) {
    if (t < a) break;
    const k = span(t, a, b);
    c = { cx: mix(c.cx, to.cx, k), cy: mix(c.cy, to.cy, k), s: c.s * Math.pow(to.s / c.s, k) };
  }
  return c;
}
/** Masaüstü noktasından videodaki (sayfa) noktaya */
const toPage = (c: Cam, x: number, y: number) => ({ x: VIEW.x + VIEW.w / 2 + (x - c.cx) * c.s, y: VIEW.y + VIEW.h / 2 + (y - c.cy) * c.s });
const toDesk = (c: Cam, x: number, y: number) => ({ x: c.cx + (x - VIEW.x - VIEW.w / 2) / c.s, y: c.cy + (y - VIEW.y - VIEW.h / 2) / c.s });

// ------------------------------------------------------------------ imleç

/** Ekrandaki bir öğenin ortası (sayfa koordinatı): yazısıyla, title'ıyla ya da seçiciyle */
function findEl(q: string): HTMLElement | null {
  const root = document.querySelector("[data-reel-desk]");
  if (!root) return null;
  if (q.startsWith("[") || q.startsWith(".")) return root.querySelector<HTMLElement>(q);
  const titled = root.querySelector<HTMLElement>(`[title="${q}"]`);
  if (titled) return titled;
  let best: HTMLElement | null = null;
  for (const el of root.querySelectorAll<HTMLElement>("button, span, p, div")) {
    if (el.textContent?.trim() !== q) continue;
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    // En dıştaki tıklanabilir kutu (düğme) daha iyi bir hedef
    best = el.closest("button") ?? el;
    break;
  }
  return best;
}
/** Öğe kaybolsa da (sahne değişirken) imleç son bulunduğu yerde kalsın */
const lastSeen: Record<string, { x: number; y: number }> = {};
function centerOf(q: string) {
  const el = findEl(q);
  if (!el) return lastSeen[q] ?? null;
  const r = el.getBoundingClientRect();
  return (lastSeen[q] = { x: r.left + r.width / 2, y: r.top + r.height / 2 });
}

interface Key {
  t: number;
  x: number;
  y: number;
  /** Bu noktaya öğe (yazı/title); bulunamazsa x, y */
  at?: string;
  /** Masaüstü noktası (kamerayla birlikte kayar) */
  desk?: { x: number; y: number };
}
const OFF_L = { x: 560, y: 1060 };
const TRACKS: Key[][] = [
  // Ada: çentiğe gel, açılsın; sonra soldaki ızgara simgesi
  [
    { t: S.island + 0.25, ...OFF_L },
    { t: S.island + 0.95, x: 351, y: 560, desk: { x: DESK.w / 2 + 8, y: 18 } },
    { t: S.island + 2.35, x: 351, y: 560, desk: { x: DESK.w / 2 + 8, y: 18 } },
    { t: S.island + 3.0, x: 351, y: 560, at: "All modules" },
    { t: S.island + 4.4, x: 351, y: 560, at: "All modules" },
    { t: S.island + 5.1, x: 600, y: 1040 },
  ],
  // Studio: soldan Görünüm, sonra koleksiyondan bir Nook
  [
    { t: S.studio + 1.55, x: 620, y: 1060 },
    { t: S.studio + 2.2, x: 351, y: 560, at: "Look" },
    { t: S.studio + 2.5, x: 351, y: 560, at: "Look" },
    { t: S.studio + 3.6, x: 351, y: 560, at: "King" },
    { t: S.studio + 4.6, x: 351, y: 560, at: "King" },
    { t: S.studio + 5.3, x: 640, y: 1060 },
  ],
  // Kısayollar: mikrofon tuşu, sonra Oyun modu rutini
  [
    { t: S.deck + 0.55, x: 600, y: 1060 },
    { t: S.deck + 1.2, x: 351, y: 560, at: "Microphone" },
    { t: S.deck + 1.6, x: 351, y: 560, at: "Microphone" },
    { t: S.deck + 2.2, x: 351, y: 560, at: "Game mode" },
    { t: S.deck + 3.3, x: 351, y: 560, at: "Game mode" },
    { t: S.deck + 3.95, x: 620, y: 1060 },
  ],
];
const CLICKS = [S.island + 3.1, S.studio + 2.3, S.studio + 3.75, S.deck + 1.3, S.deck + 2.35];

function trackPos(t: number, cam: Cam) {
  for (const tr of TRACKS) {
    const first = tr[0].t;
    const last = tr[tr.length - 1].t;
    if (t < first - 0.25 || t > last + 0.3) continue;
    const pt = (k: Key) => (k.desk ? toPage(cam, k.desk.x, k.desk.y) : k.at ? (centerOf(k.at) ?? { x: k.x, y: k.y }) : { x: k.x, y: k.y });
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

function Cursor({ t, cam }: { t: number; cam: Cam }) {
  const p = trackPos(t, cam);
  if (!p) return null;
  const click = CLICKS.find((c) => t >= c && t < c + 0.45);
  const down = click !== undefined && t < click + 0.12;
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

/** Adanın gözleri imleci izlesin (masaüstü koordinatı) */
function CursorFeed({ t, cam }: { t: number; cam: Cam }) {
  useEffect(() => {
    const p = trackPos(t, cam);
    if (!p || p.opacity <= 0) devEmit(EVENTS.cursor, { x: -1e4, y: -1e4, near: false, inside: false });
    else {
      const d = toDesk(cam, p.x, p.y);
      devEmit(EVENTS.cursor, { x: d.x, y: d.y, near: true, inside: false });
    }
  }, [t, cam]);
  return null;
}

/** Tıklanan öğe bir an basılır (gerçek tıklama yapmadan: tuşlar sistemde iş yapmasın) */
function press(q: string) {
  const el = findEl(q);
  if (!el) return;
  el.style.transition = "transform 0.12s, filter 0.12s";
  el.style.transform = "scale(0.92)";
  el.style.filter = "brightness(1.35)";
  window.setTimeout(() => {
    el.style.transform = "";
    el.style.filter = "";
  }, 160);
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
  const h = HEAD[scene];
  const next = SCENES[SCENES.findIndex((s) => s.id === scene) + 1];
  const leaving = next && t > next.at - 0.25;
  const kicker = scene === "capsules" ? [...CAP_KICKER].reverse().find(([at]) => t >= at)![1] : h?.k;
  return (
    <div className="absolute inset-x-0 z-40 flex flex-col items-center text-center" style={{ top: 112, height: 190 }}>
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
            <AnimatePresence mode="wait">
              <motion.span key={kicker} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                <Kicker color={c}>{kicker}</Kicker>
              </motion.span>
            </AnimatePresence>
            <h1 className="px-6 font-display text-[50px] font-bold leading-[1.06] tracking-[-0.035em] text-white">
              {h.a}
              <br />
              <span style={{ color: c }}>{h.b}</span>
            </h1>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Windows 11 tarzı koyu masaüstü: duvar kâğıdı, bir düzenleyici penceresi, görev çubuğu */
function Desktop({ tint, night }: { tint: string; night: number }) {
  return (
    <div className="absolute inset-0" style={{ background: "#0b1020" }}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70% 55% at 25% 105%, ${tint}55 0%, transparent 70%), radial-gradient(60% 50% at 85% 10%, #3b5bdb44 0%, transparent 70%), radial-gradient(90% 70% at 50% 60%, #1a2246 0%, #0b1020 80%)`,
          transition: "background 0.6s",
        }}
      />
      {/* Gece: koyulaşır, yıldızlar */}
      <div className="absolute inset-0" style={{ opacity: night, background: "linear-gradient(180deg, #02030a 0%, #070b1c 60%, #0d0a1a 100%)" }}>
        {Array.from({ length: 70 }, (_, i) => (
          <span key={i} className="absolute rounded-full bg-white" style={{ left: `${(i * 37.3) % 100}%`, top: `${(i * 53.7) % 92}%`, width: i % 7 ? 1.5 : 2.5, height: i % 7 ? 1.5 : 2.5, opacity: 0.25 + ((i * 13) % 10) / 16 }} />
        ))}
      </div>
      <EditorWin dim={night} />
      <div className="absolute inset-x-0 bottom-0 flex h-[48px] items-center justify-center gap-3 border-t border-white/[0.06] bg-black/45 backdrop-blur">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="h-[24px] w-[24px] rounded-[6px]" style={{ background: i === 0 ? "linear-gradient(135deg,#4cc2ff,#0a6cff)" : `rgba(255,255,255,${i === 1 ? 0.3 : 0.14})` }} />
        ))}
      </div>
    </div>
  );
}

function EditorWin({ dim }: { dim: number }) {
  const lines = [
    [40, "#c586c0", 120, "#9cdcfe", 180, "#d4d4d4"],
    [60, "#569cd6", 90, "#4ec9b0", 220, "#ce9178"],
    [60, "#9cdcfe", 140, "#d4d4d4"],
    [80, "#c586c0", 70, "#dcdcaa", 160, "#9cdcfe"],
    [80, "#6a9955", 300],
    [60, "#569cd6", 120, "#4ec9b0", 90, "#d4d4d4"],
    [40, "#d4d4d4"],
    [40, "#c586c0", 200, "#ce9178"],
    [60, "#9cdcfe", 110, "#dcdcaa", 140, "#d4d4d4"],
    [80, "#6a9955", 240],
    [60, "#569cd6", 160, "#4ec9b0"],
  ];
  return (
    <div className="absolute overflow-hidden rounded-[12px] border border-white/[0.09] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]" style={{ left: 170, top: 352, width: 940, height: 380, background: "#16161c", opacity: 1 - dim * 0.75 }}>
      <div className="flex h-[34px] items-center gap-2 px-3.5 text-[13px] text-white/60" style={{ background: "#1e1e25" }}>
        <span className="h-2.5 w-2.5 rounded-full bg-[#3d8bff]" />
        <span>Island.tsx — nook — Visual Studio Code</span>
        <span className="ml-auto tracking-[14px] opacity-60">— ▢ ✕</span>
      </div>
      <div className="flex h-full">
        <div className="w-[170px] space-y-2.5 border-r border-white/[0.05] p-4">
          {[70, 55, 80, 62, 48, 74].map((w, i) => (
            <div key={i} className="h-2 rounded-full" style={{ width: `${w}%`, background: i === 2 ? "#3d8bff88" : "rgba(255,255,255,0.12)" }} />
          ))}
        </div>
        <div className="flex-1 space-y-[13px] p-5">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2">
              <span className="w-6 text-right font-mono text-[11px] text-white/20">{i + 1}</span>
              {Array.from({ length: Math.floor(l.length / 2) + (l.length % 2) }, (_, j) => (
                <span key={j} className="h-[9px] rounded-full" style={{ width: l[j * 2] as number, marginLeft: j === 0 ? (l[0] as number) / 4 : 0, background: ((l[j * 2 + 1] as string) ?? "#d4d4d4") + "aa" }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Studio penceresi: gerçek Nook Studio, bir pencere gibi masaüstünde */
function StudioWin({ t }: { t: number }) {
  const shown = t >= S.studio + 0.15 && t < S.deck + 0.1;
  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          className="absolute overflow-hidden rounded-[12px] border border-white/[0.1] shadow-[0_40px_90px_-20px_rgba(0,0,0,0.85)]"
          style={{ left: STUDIO.x, top: STUDIO.y, width: STUDIO.w, height: STUDIO.h, background: "#0e0e10" }}
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          <Studio />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ------------------------------------------------------------------ açılış: 0.3.0 → Nook

const INTRO = { cx: REEL_W / 2, cy: 540, size: 300, font: 196 };
const CHARS = ["0", ".", "3", ".", "0"] as const;
const CHAR_X = [-178, -96, 0, 96, 178];

/** Gerçek Nook'un gözlerinin (siyah haplar) sayfadaki yeri: sıfırlar tam oraya oturur */
function useEyeRects(ref: React.RefObject<HTMLDivElement | null>, t: number) {
  const [eyes, setEyes] = useState<DOMRect[] | null>(null);
  useLayoutEffect(() => {
    if (eyes || !ref.current) return;
    const found = [...ref.current.querySelectorAll<HTMLElement>("span.bg-black")].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0);
    if (found.length === 2) setEyes(found.sort((a, b) => a.left - b.left));
  }, [t, eyes, ref]);
  return eyes;
}

function Intro({ t, look, color }: { t: number; look: Look; color: string }) {
  const fig = useRef<HTMLDivElement>(null);
  const eyes = useEyeRects(fig, t);
  const body = spring(t, 1.85, 2.45);
  const morph = span(t, 2.0, 2.6);
  const swap = t >= 2.62;
  const fly = span(t, S.island - 0.6, S.island - 0.05);
  const notch = toPage(camAt(S.island), DESK.w / 2, 17);
  const gx = mix(INTRO.cx, notch.x, fly);
  const gy = mix(INTRO.cy, notch.y, fly);
  const gs = mix(1, 0.08, fly);
  const happy = t >= 3.05 && t < 3.95;
  // Gözlerin sayfadaki merkezi ve boyu (ölçülmeden önce tahmini)
  const eye = (i: number) => {
    const r = eyes?.[i];
    if (!r) return { x: INTRO.cx + (i ? 30 : -30), y: INTRO.cy - 4, w: 24, h: 54 };
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  };
  const mouthY = eye(0).y + eye(0).h * 0.92;
  const R = { w: 104, h: 142, b: 26 };
  return (
    <div className="absolute inset-0 z-20" style={{ transform: `translate(${gx - INTRO.cx}px, ${gy - INTRO.cy}px) scale(${gs})`, transformOrigin: `${INTRO.cx}px ${INTRO.cy}px`, opacity: 1 - span(t, S.island - 0.2, S.island) }}>
      {/* Arkada yumuşak ışık */}
      <div className="absolute rounded-full" style={{ left: INTRO.cx - 260, top: INTRO.cy - 260, width: 520, height: 520, background: "radial-gradient(circle, #9b7bff33 0%, transparent 65%)", opacity: span(t, 0.2, 1.2) }} />
      {/* Ölçü için görünmez, ölçeksiz bir kopya: gözlerin son yeri buradan okunur */}
      <div ref={fig} className="pointer-events-none absolute" style={{ left: INTRO.cx - INTRO.size / 2, top: INTRO.cy - INTRO.size / 2, visibility: "hidden" }}>
        <NookFigure look={look} color={color} size={INTRO.size} />
      </div>
      {/* Nook'un gövdesi: sıfırların arkasında şişer */}
      <div className={`absolute ${swap ? "" : "reel-hide-eyes"}`} style={{ left: INTRO.cx - INTRO.size / 2, top: INTRO.cy - INTRO.size / 2, width: INTRO.size, height: INTRO.size, transform: `scale(${Math.max(0.0001, body)})`, opacity: t < 1.85 ? 0 : 1 }}>
        <NookFigure look={look} color={color} size={INTRO.size} expression={happy ? "happy" : "idle"} />
      </div>
      {CHARS.map((ch, i) => {
        const at = 0.3 + i * 0.24;
        const k = spring(t, at, at + 0.4);
        const baseX = INTRO.cx + CHAR_X[i];
        if (ch === ".") {
          const pop = span(t, 1.7, 1.95);
          return (
            <span
              key={i}
              className="absolute rounded-full bg-white"
              style={{ left: baseX - 14, top: INTRO.cy + 52, width: 28, height: 28, opacity: clamp(k) * (1 - pop), transform: `translateY(${(1 - k) * 30}px) scale(${Math.max(0.0001, k * (1 + 0.5 * Math.sin(Math.PI * pop)) * (1 - pop))})` }}
            />
          );
        }
        if (ch === "3") {
          // Yan yatıp küçülür: gözlerin altında "ω" ağız
          const mx = mix(baseX, INTRO.cx, morph);
          const my = mix(INTRO.cy, mouthY, morph);
          const sc = mix(1, 0.27, morph);
          return (
            <span
              key={i}
              className="absolute select-none font-display font-extrabold leading-none"
              style={{
                left: mx,
                top: my,
                fontSize: INTRO.font,
                color: morph > 0.35 ? "#111" : "#fff",
                opacity: clamp(k) * (happy ? 1 : 1),
                transform: `translate(-50%, -54%) translateY(${(1 - k) * 30}px) rotate(${90 * morph}deg) scale(${sc * Math.max(0.0001, k)})`,
                transition: "color 0.15s",
                textShadow: morph < 0.35 ? "0 0 40px rgba(155,123,255,0.55)" : "none",
              }}
            >
              3
            </span>
          );
        }
        // Sıfır: halka → dolu siyah hap (Nook'un gözü)
        const e = eye(i === 0 ? 0 : 1);
        const w = mix(R.w, e.w, morph);
        const h = mix(R.h, e.h, morph);
        const x = mix(baseX, e.x, morph);
        const y = mix(INTRO.cy, e.y, morph);
        const b = mix(R.b, e.w / 2, morph);
        const dark = morph > 0.35;
        return (
          <span
            key={i}
            className="absolute"
            style={{
              left: x - w / 2,
              top: y - h / 2,
              width: w,
              height: h,
              borderRadius: "50%",
              border: `${b}px solid ${dark ? "#000" : "#fff"}`,
              background: morph > 0.92 ? "#000" : "transparent",
              opacity: swap ? 0 : clamp(k),
              transform: `translateY(${(1 - k) * 30}px) scale(${Math.max(0.0001, k)})`,
              boxShadow: dark ? "none" : "0 0 40px rgba(155,123,255,0.55)",
              transition: "border-color 0.15s",
            }}
          />
        );
      })}
      {/* Altta yazı */}
      <motion.div
        className="absolute inset-x-0 flex flex-col items-center gap-4 text-center"
        style={{ top: 770 }}
        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
        animate={t >= 2.9 && t < S.island - 0.7 ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: t < 2.9 ? 20 : -10, filter: "blur(8px)" }}
        transition={{ duration: 0.5 }}
      >
        <Kicker color="#9b7bff">Big update</Kicker>
        <h1 className="font-display text-[56px] font-bold leading-[1.04] tracking-[-0.04em] text-white">
          Nook 0.3
          <br />
          <span style={RAINBOW}>is here.</span>
        </h1>
      </motion.div>
    </div>
  );
}

const RAINBOW: CSSProperties = {
  background: "linear-gradient(90deg, #6f8bff 0%, #5ff0c0 28%, #ffe36b 52%, #ff7ad0 76%, #a774ff 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

// ------------------------------------------------------------------ güncelleme animasyonları

/** Ayarlar › Animasyonlar'daki gibi: hepsi küçük kapsüllerde, her biri kendi turunda */
function UpdateGrid({ t, look, color }: { t: number; look: Look; color: string }) {
  const from = S.update + 2.5;
  if (t < from - 0.1 || t > S.camp) return null;
  const out = span(t, S.camp - 0.35, S.camp);
  return (
    <div className="absolute inset-x-0 z-30 grid grid-cols-2 justify-items-center gap-x-3 gap-y-3.5 px-6" style={{ top: VIEW.y + 150, opacity: 1 - out }}>
      {UPDATE_ANIMS.filter((a) => a.id !== "rocket").map((a, i) => {
        const k = spring(t, from + i * 0.07, from + i * 0.07 + 0.45);
        // 3,4 sn dolar, 1,6 sn "bitti"; her kapsül biraz kaymış
        const e = (t - from + i * 0.55) % 5;
        const done = e >= 3.4;
        const x = clamp(e / 3.4);
        const p = done ? 100 : Math.min(99, Math.round((x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2) * 100));
        return (
          <div key={a.id} className="relative h-10 w-[300px] overflow-hidden rounded-[18px] border border-white/[0.07] bg-black shadow-[0_10px_26px_-8px_rgba(0,0,0,0.95)]" style={{ opacity: clamp(k), transform: `translateY(${(1 - k) * 24}px) scale(${0.9 + 0.1 * k})` }}>
            <div className="absolute left-[13px] top-1/2 -translate-y-1/2">
              <NookFigure look={look} color={color} size={26} expression={done ? "happy" : "downloading"} />
            </div>
            <UpdateBody anim={a.id} p={p} done={done} version="0.3.0" />
          </div>
        );
      })}
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

const set = (p: Record<string, unknown>) => useNook.setState(p as never);
const MEDIA = { title: "Golden Hour Drive", artist: "Lumen Avenue", album: "Night Shift", app: "Spotify.exe", playing: true, positionMs: 64_000, durationMs: 212_000, trackKey: "reel03", artwork: ART };
const FOCUS = () => ({ phase: "work", endsAt: Date.now() + 14 * 60_000 + 52_000, left: 0, total: 25 * 60_000, round: 2 });
const WORKING = () => ({
  a: { id: "a", project: "nook", cwd: "C:/Users/OEM/Desktop/Nook", state: "working", action: "Editing · Capsules.tsx", prompt: "Make the closed island show what's going on", reply: "", startedAt: Date.now() - 600_000, updatedAt: Date.now(), turnAt: Date.now() - 60_000, edits: 6, commands: 2, files: ["Capsules.tsx"] },
});

function makeCues(): Cue[] {
  const c: Cue[] = [
    // Açılış
    ...CHARS.map((_, i) => ({ at: 0.3 + i * 0.24, run: () => sfx("key") })),
    { at: 1.72, run: () => sfx("pop2") },
    { at: 1.85, run: () => sfx("whoosh") },
    { at: 2.05, run: () => sfx("pop") },
    { at: 3.05, run: () => sfx("happy") },
    { at: S.island - 0.6, run: () => sfx("whoosh") },
    // Ada: üstüne gelince açılır, ızgaraya geçer
    { at: S.island + 0.95, run: () => (sfx("open"), set({ hovered: true, pendingTab: "home", media: { ...MEDIA, at: performance.now() } })) },
    { at: S.island + 3.1, run: () => (sfx("click"), press("All modules"), set({ tab: "modules" })) },
    // Her modülün kendi boyu
    { at: S.sizes, run: () => (sfx("tab"), set({ tab: "argus" })) },
    { at: S.sizes + 1.3, run: () => (sfx("tab"), set({ tab: "focus" })) },
    { at: S.sizes + 2.6, run: () => (sfx("tab"), set({ tab: "media" })) },
    { at: S.capsules - 0.3, run: () => (sfx("close"), set({ hovered: false })) },
    // Kapalı ada kapsülleri: müzik → Pomodoro → Claude → ikisi birden (bölünmüş ada)
    { at: S.capsules + 0.05, run: () => set({ tab: "home" }) },
    { at: S.capsules + 1.45, run: () => (sfx("tick"), set({ media: { ...MEDIA, playing: false, at: performance.now() }, focus: FOCUS() })) },
    { at: S.capsules + 2.75, run: () => (sfx("tick"), set({ focus: null }), useClaude.setState({ sessions: WORKING() as never })) },
    { at: S.capsules + 4.0, run: () => (sfx("pop2"), set({ media: { ...MEDIA, at: performance.now() } })) },
    // Studio
    { at: S.studio - 0.1, run: () => (useClaude.setState({ sessions: {} }), set({ media: null }), (location.hash = "home")) },
    { at: S.studio + 0.15, run: () => sfx("whoosh") },
    { at: S.studio + 2.3, run: () => (sfx("click"), (location.hash = "look")) },
    { at: S.studio + 3.75, run: () => (sfx("click"), findEl("King")?.click()) },
    // Kısayollar
    { at: S.deck - 0.1, run: () => useNook.getState().updateSettings({ look: DEFAULT_LOOK } as never) },
    { at: S.deck + 0.1, run: () => (sfx("open"), set({ hovered: true, pendingTab: "apps" })) },
    { at: S.deck + 1.3, run: () => (sfx("click"), press("Microphone")) },
    { at: S.deck + 2.35, run: () => (sfx("click"), press("Game mode")) },
    { at: S.deck + 2.5, run: () => sfx("tick") },
    { at: S.deck + 2.65, run: () => sfx("tick") },
    { at: S.deck + 2.8, run: () => sfx("success") },
    { at: S.update - 0.3, run: () => (sfx("close"), set({ hovered: false })) },
    // Güncelleme: roket kapsülde, sonra hepsi
    { at: S.update + 0.1, run: () => useUpdate.setState({ demo: "rocket", current: "0.3.0", progress: 0, restarting: false }) },
    { at: S.update + 2.0, run: () => sfx("whoosh") },
    { at: S.update + 2.05, run: () => sfx("success") },
    { at: S.update + 2.5, run: () => [0, 1, 2, 3].forEach((i) => window.setTimeout(() => sfx("pop2"), i * 140)) },
    { at: S.camp - 0.2, run: () => useUpdate.setState({ demo: null, progress: null, restarting: false }) },
    // Gece kampı
    { at: S.camp + 0.1, run: () => ((camp.mallows = 3), set({ outing: "camp" })) },
    { at: S.cta - 0.2, run: () => set({ outing: null }) },
    // Kapanış
    { at: S.cta, run: () => sfx("whoosh") },
    { at: S.cta + 0.35, run: () => sfx("pop") },
    { at: S.cta + 1.4, run: () => sfx("giggle") },
  ];
  return c.sort((a, b) => a.at - b.at);
}

/** Güncelleme kapsülünün ilerlemesi videonun saatine bağlı (her çekimde aynı) */
function useUpdateProgress(t: number) {
  useEffect(() => {
    if (t < S.update + 0.1 || t >= S.camp - 0.2) return;
    const x = clamp((t - S.update - 0.15) / 1.85);
    const p = Math.min(100, Math.round((x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2) * 100));
    const done = t >= S.update + 2.0;
    const u = useUpdate.getState();
    if (u.progress !== (done ? 100 : p) || u.restarting !== done) useUpdate.setState({ progress: done ? 100 : p, restarting: done });
  }, [t]);
}

/** Tarayıcıda 30 sn girdi olmazsa Nook "boşta" sayılır (uyur, balığa çıkar): saniyede bir tuş */
function useAwake(t: number) {
  const sec = Math.floor(t);
  useEffect(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
  }, [sec]);
}

// ------------------------------------------------------------------ örnek veriler (İngilizce)

function demoData() {
  const day = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return dayKey(d);
  };
  const ep = (season: number, episode: number, name: string, date: string) => ({ season, episode, name, date });
  const show = (id: string, title: string, genres: string[], aired: number, seen: number, next: ReturnType<typeof ep> | null, upcoming: ReturnType<typeof ep>[] = []): ArgusItem => ({
    id, title, original: null, status: "İzleniyor", kind: "Dizi", genres, release: "2025-03-01", runtime: 48, score: 8.3, poster: null,
    recent: Date.now() - aired * 1000, watchDates: [], series: { aired, seen, position: seen, next, latest: next, upcoming, lastSeen: day(-1), seenToday: [] },
  });
  useArgus.setState({
    snap: {
      profiles: ["Luko"], dir: "C:/Argus", profile: "Luko", profileId: "p", boardId: "b", running: false,
      items: [
        show("a", "Northbound", ["Sci-Fi"], 8, 7, ep(1, 8, "Green Light", day(-2)), [ep(1, 9, "Dark Water", day(5))]),
        show("b", "The Quiet Orbit", ["Sci-Fi"], 10, 8, ep(1, 9, "Night 300", day(-7))),
        show("c", "Salt & Coffee", ["Drama"], 6, 2, ep(1, 3, "The Recipe", day(-14))),
        show("d", "Paper Moons", ["Mystery"], 12, 5, ep(2, 6, "The Object", day(-30))),
      ],
      episodeDays: { [day(0)]: 2, [day(-1)]: 4 }, statuses: ["İzlenecek", "İzleniyor", "Yarım", "İzlendi"],
    },
    suggestion: null,
  } as never);
  useClaude.setState({ sessions: {}, asks: [] });
  const deck = [
    { id: "k1", label: "Microphone", icon: "mic", color: "#f2a33a", steps: [{ kind: "quick", key: "mic" }] },
    { id: "k2", label: "Volume", icon: "volume", color: "#f0545c", steps: [{ kind: "quick", key: "mute" }] },
    { id: "k3", label: "Dark mode", icon: "moon", color: "#8f6bff", steps: [{ kind: "quick", key: "dark" }] },
    { id: "k4", label: "Desktop", icon: "desktop", color: "#3d8bff", steps: [{ kind: "power", action: "desktop" }] },
    { id: "k5", label: "Lock", icon: "lock", color: "#3fbfa5", steps: [{ kind: "power", action: "lock" }] },
    { id: "k6", label: "Game mode", icon: "scene", color: "#ff5c8a", steps: [{ kind: "open", path: "discord", name: "Discord" }, { kind: "quick", key: "mic", on: true }, { kind: "power", action: "desktop" }] },
    { id: "k7", label: "Pomodoro", icon: "focus", color: "#f0545c", steps: [{ kind: "nook", action: "focus" }] },
    { id: "k8", label: "Shield", icon: "shield", color: "#8f6bff", steps: [{ kind: "nook", action: "shield" }] },
    { id: "k9", label: "Hum", icon: "hum", color: "#9b7bff", steps: [{ kind: "nook", action: "hum" }] },
    { id: "k10", label: "Next", icon: "next", color: "#ff5c8a", steps: [{ kind: "media", action: "next" }] },
  ];
  set({
    media: null,
    deck,
    events: [],
    extEvents: [],
    privacy: { mic: [], camera: [] },
    notifications: [],
    nookNotifs: [],
    toasts: [],
    outing: null,
    focus: null,
    hum: null,
    guard: null,
    claudeCard: false,
    antic: null,
    affection: 92,
    notesSeen: latestNote().version,
    pinnedApps: [
      { id: "p1", name: "Spotify", path: "x" },
      { id: "p2", name: "Discord", path: "y" },
    ],
    weather: { city: "Istanbul", temp: 18, high: 21, low: 13, sky: "clear", isDay: false, rainChance: 0, at: Date.now() },
    diary: {
      [day(-1)]: { text: "Luko lived in Figma today; the mouse battery dropped to 7% and I almost offered it a coffee. Two episodes of Northbound slipped in between. The cursor walked 1.3 km. At least the water got drunk: five glasses. Proud of us.", at: Date.now() - 9 * 3600_000 },
      [day(0)]: { text: "Spotify in the morning, Discord at noon, Figma again at night: Luko's day was a triangle. I sat in my corner and reminded them about water twice. The mouse did 900 meters today, sportier than me.", at: Date.now() - 600_000 },
    },
  });
  useNook.getState().updateSettings({ calCountdown: false, userName: "Luko", look: DEFAULT_LOOK } as never);
}

// ------------------------------------------------------------------ video

export function Reel03() {
  const t = useClock();
  const cues = useMemo(makeCues, []);
  useCues(t, cues);
  useUpdateProgress(t);
  useAwake(t);
  const scene = sceneAt(t).id;
  const color = sceneAt(t).color;
  const settings = useNook((s) => s.settings);
  const look = normalizeLook(settings.look);
  const face = normalizeColor(settings.faceColor);
  const cam = camAt(t);

  useEffect(() => {
    document.documentElement.style.background = "#05060a";
    document.body.style.background = "#05060a";
    const st = document.createElement("style");
    st.textContent = ".reel-hide-eyes span.bg-black{opacity:0!important}";
    document.head.appendChild(st);
    location.hash = "home";
    demoData();
    const mine = (size: number) => ({ look: DEFAULT_LOOK, color: face, size: figureRes(size) });
    prefetchBodies([mine(300), mine(230), mine(26), mine(24), mine(20)]);
    window.__renderReelAudio = renderReelAudio;
    window.__reelReady = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showDesk = span(t, S.island - 0.45, S.island + 0.1) * (1 - span(t, S.cta - 0.1, S.cta + 0.45));
  const night = span(t, S.camp - 0.3, S.camp + 0.5) * (1 - span(t, S.cta - 0.2, S.cta + 0.2));
  const deskX = VIEW.w / 2 - cam.cx * cam.s;
  const deskY = VIEW.h / 2 - cam.cy * cam.s;

  return (
    <div className="fixed left-0 top-0 overflow-hidden font-sans" style={{ width: REEL_W, height: REEL_H, background: "#05060a" }}>
      {/* Arkada sahnenin renginde yumuşak ışık */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(60% 40% at 50% 8%, ${color}38 0%, transparent 70%), radial-gradient(70% 45% at 50% 100%, ${color}26 0%, transparent 70%)`, transition: "background 0.8s" }} />
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "26px 26px", maskImage: "radial-gradient(60% 50% at 50% 50%, black, transparent)" }} />

      <Headline scene={scene} t={t} />

      {/* Ekran: içinde masaüstü, kamera onun üstünde gezer */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: VIEW.x,
          top: VIEW.y,
          width: VIEW.w,
          height: VIEW.h,
          borderRadius: VIEW.r,
          opacity: showDesk,
          transform: `translateY(${(1 - span(t, S.island - 0.45, S.island + 0.1)) * 40}px) scale(${0.95 + 0.05 * showDesk})`,
          boxShadow: `0 40px 90px -20px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.09), 0 0 70px -30px ${color}`,
          visibility: showDesk > 0.001 ? "visible" : "hidden",
        }}
      >
        <div data-reel-desk className="absolute left-0 top-0" style={{ width: DESK.w, height: DESK.h, transform: `translate(${deskX}px, ${deskY}px) scale(${cam.s})`, transformOrigin: "0 0" }}>
          <Desktop tint={color} night={night} />
          <StudioWin t={t} />
          {/* Gerçek ada: kendi "penceresi" bu kutu */}
          <div className="absolute inset-0" style={{ transform: "translateZ(0)" }}>
            <App />
          </div>
        </div>
      </div>

      {scene === "intro" && <Intro t={t} look={look} color={face} />}
      <UpdateGrid t={t} look={look} color={face} />
      {scene === "cta" && <Cta t={t} look={look} color={face} />}

      <Cursor t={t} cam={cam} />
      <CursorFeed t={t} cam={cam} />

      {/* İmza */}
      <div className="absolute inset-x-0 flex items-center justify-center gap-2.5 text-[18px] font-medium text-white/55" style={{ top: 968, opacity: showDesk, transition: "opacity 0.4s" }}>
        <NookFigure look={look} color={face} size={26} />
        <span className="font-semibold text-white/80">nook</span>
        <span className="text-white/30">·</span>
        @nooktheblob
      </div>
    </div>
  );
}

function Cta({ t, look, color }: { t: number; look: Look; color: string }) {
  const happy = t > S.cta + 1.3;
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center" style={{ paddingTop: 250 }}>
      <motion.div initial={{ scale: 0.2, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 240, damping: 13, delay: 0.3 }}>
        <motion.div animate={{ y: [0, -10, 0], rotate: [0, -3, 0, 3, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
          <NookFigure look={look} color={color} size={230} expression={happy ? "happy" : "idle"} smile={happy} />
        </motion.div>
      </motion.div>
      <motion.h1
        className="mt-12 font-display text-[64px] font-bold leading-none tracking-[-0.04em] text-white"
        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        Nook <span style={RAINBOW}>0.3</span>
      </motion.h1>
      <motion.p className="mt-5 text-[30px] font-semibold tracking-[-0.02em] text-white/85" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.95 }}>
        Free for Windows.
      </motion.p>
      <motion.p className="mt-4 max-w-[560px] text-center text-[19px] leading-snug text-white/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1.2 }}>
        Plus reminders, a power timer, Nook's own diary and 20+ more changes.
      </motion.p>
      <motion.div className="mt-8 flex items-center gap-3" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 1.5 }}>
        <span className="rounded-full px-5 py-2.5 text-[22px] font-semibold text-black" style={{ background: "linear-gradient(90deg,#a7f3c9,#7ce0ff)" }}>
          Link in bio ↑
        </span>
      </motion.div>
      <motion.div className="mt-8 flex items-center gap-2.5 text-[22px] font-medium text-white/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1.8 }}>
        <span className="font-semibold text-white">nook</span>
        <span className="text-white/30">·</span>@nooktheblob
      </motion.div>
    </div>
  );
}
