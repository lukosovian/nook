/**
 * Yalnızca geliştirme: tanıtım videosunun (dev/Reel03) arka plan müziği. Sakin bir lo-fi: 90 BPM,
 * Fmaj9 – Em7 – Dm9 – Cmaj9; elektrik piyano, yumuşak pad, bas, fırça davul ve plak cızırtısı.
 * Hepsi OfflineAudioContext'te sentezlenir (dosya yok); tohumlu rastgelelikle her çekimde aynı çıkar.
 */

export const BPM = 90;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;

/** Her ölçünün akoru (MIDI): dört ses + üstte melodi sesi */
const CHORDS = [
  { notes: [53, 57, 60, 64], top: 67, root: 41 },
  { notes: [52, 55, 59, 62], top: 67, root: 40 },
  { notes: [50, 53, 57, 60], top: 64, root: 38 },
  { notes: [48, 52, 55, 59], top: 62, root: 36 },
];

export interface MusicPlan {
  /** Toplam ölçü */
  bars: number;
  /** Davulların girdiği ve çıktığı ölçü (çıkış hariç) */
  drumsFrom: number;
  drumsTo: number;
}

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noiseBuffer(a: BaseAudioContext, sec: number, seed: number) {
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * sec), a.sampleRate);
  const d = buf.getChannelData(0);
  const r = rng(seed);
  for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
  return buf;
}

/** Elektrik piyano: sinüs gövde, hafif ikinci harmonik ve kısa bir "tın" */
function epiano(a: BaseAudioContext, out: AudioNode, midi: number, at: number, dur: number, vel: number) {
  const f = hz(midi);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vel, at + 0.012);
  g.gain.exponentialRampToValueAtTime(vel * 0.35, at + 0.7);
  g.gain.setValueAtTime(vel * 0.35 * Math.pow(0.6, Math.max(0, dur - 0.7)), at + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.5);
  g.connect(out);
  const body = a.createOscillator();
  body.type = "sine";
  body.frequency.value = f;
  body.connect(g);
  const h2 = a.createOscillator();
  h2.type = "sine";
  h2.frequency.value = f * 2.002;
  const h2g = a.createGain();
  h2g.gain.setValueAtTime(0.22, at);
  h2g.gain.exponentialRampToValueAtTime(0.02, at + 0.5);
  h2.connect(h2g).connect(g);
  const tine = a.createOscillator();
  tine.type = "triangle";
  tine.frequency.value = f * 4.01;
  const tg = a.createGain();
  tg.gain.setValueAtTime(0.0001, at);
  tg.gain.exponentialRampToValueAtTime(0.09, at + 0.004);
  tg.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
  tine.connect(tg).connect(g);
  for (const o of [body, h2, tine]) {
    o.start(at);
    o.stop(at + dur + 0.6);
  }
}

/** Pad: iki hafif akortsuz testere, kısık süzgeçten; yavaş girer, yavaş çıkar */
function pad(a: BaseAudioContext, out: AudioNode, midi: number, at: number, dur: number, vel: number) {
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vel, at + 0.9);
  g.gain.setValueAtTime(vel, at + dur);
  g.gain.linearRampToValueAtTime(0.0001, at + dur + 0.9);
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 760;
  lp.Q.value = 0.4;
  lp.connect(g).connect(out);
  for (const d of [-6, 6]) {
    const o = a.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = hz(midi);
    o.detune.value = d;
    o.connect(lp);
    o.start(at);
    o.stop(at + dur + 1);
  }
}

function bass(a: BaseAudioContext, out: AudioNode, midi: number, at: number, dur: number, vel: number) {
  const o = a.createOscillator();
  o.type = "sine";
  o.frequency.value = hz(midi);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vel, at + 0.02);
  g.gain.exponentialRampToValueAtTime(vel * 0.55, at + dur * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.08);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + dur + 0.1);
}

function kick(a: BaseAudioContext, out: AudioNode, at: number, vel: number) {
  const o = a.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(140, at);
  o.frequency.exponentialRampToValueAtTime(46, at + 0.12);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vel, at + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.38);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + 0.4);
}

function hit(a: BaseAudioContext, out: AudioNode, noise: AudioBuffer, at: number, type: BiquadFilterType, freq: number, q: number, dur: number, vel: number, offset: number) {
  const src = a.createBufferSource();
  src.buffer = noise;
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vel, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(out);
  src.start(at, offset % (noise.duration - 1));
  src.stop(at + dur + 0.02);
}

/** Bütün müzik `out`'a; süre `sec`, son 2 sn'de söner */
export function renderMusic(a: BaseAudioContext, out: AudioNode, sec: number, plan: MusicPlan) {
  const r = rng(90);
  const noise = noiseBuffer(a, 4, 7);

  const master = a.createGain();
  master.gain.setValueAtTime(0.0001, 0);
  master.gain.linearRampToValueAtTime(1, 0.8);
  master.gain.setValueAtTime(1, Math.max(0.8, sec - 2.2));
  master.gain.linearRampToValueAtTime(0.0001, sec);
  // Lo-fi sıcaklığı: tepeler yumuşak
  const warm = a.createBiquadFilter();
  warm.type = "lowpass";
  warm.frequency.value = 4600;
  warm.Q.value = 0.3;
  warm.connect(master).connect(out);

  // Piyano hafif titreşimli (tremolo)
  const keys = a.createGain();
  keys.gain.value = 0.85;
  const lfo = a.createOscillator();
  lfo.frequency.value = 4.2;
  const depth = a.createGain();
  depth.gain.value = 0.12;
  lfo.connect(depth).connect(keys.gain);
  lfo.start(0);
  lfo.stop(sec);
  keys.connect(warm);

  const pads = a.createGain();
  pads.gain.value = 1;
  pads.connect(warm);
  const low = a.createGain();
  low.gain.value = 1;
  low.connect(warm);
  const drums = a.createGain();
  drums.gain.value = 0.8;
  drums.connect(warm);

  for (let bar = 0; bar < plan.bars; bar++) {
    const t0 = bar * BAR;
    if (t0 >= sec) break;
    const c = CHORDS[bar % CHORDS.length];
    const last = bar === plan.bars - 1;
    const intro = bar < plan.drumsFrom;
    // Akor: hafif arpejle basılır; davullu ölçülerde 2,5. vuruşta üst üç ses yeniden
    c.notes.forEach((n, i) => epiano(a, keys, n, t0 + i * 0.018, last ? BAR * 1.6 : intro ? BEAT * 3.8 : BEAT * 2.3, 0.075));
    epiano(a, keys, c.top + 12 * (bar % 2), t0 + 0.09, intro ? BEAT * 3.6 : BEAT * 1.6, 0.05);
    if (!intro && !last) c.notes.slice(1).forEach((n, i) => epiano(a, keys, n, t0 + BEAT * 2.5 + i * 0.015, BEAT * 1.3, 0.045));
    c.notes.forEach((n) => pad(a, pads, n + 12, t0, BAR - 0.3, 0.011));

    if (bar >= 1 || last) {
      bass(a, low, c.root, t0, BEAT * 1.4, 0.32);
      if (!last) {
        bass(a, low, c.root, t0 + BEAT * 1.5, BEAT * 0.45, 0.22);
        bass(a, low, c.root + 7, t0 + BEAT * 3, BEAT * 0.8, 0.24);
      }
    }

    if (bar >= plan.drumsFrom && bar < plan.drumsTo) {
      const swing = BEAT * 0.09;
      kick(a, drums, t0, 0.55);
      kick(a, drums, t0 + BEAT * 2.5, 0.42);
      if (bar % 2) kick(a, drums, t0 + BEAT * 1.75 + swing, 0.3);
      for (const b of [1, 3]) {
        hit(a, drums, noise, t0 + BEAT * b, "bandpass", 2100, 0.7, 0.2, 0.2, r() * 3);
        hit(a, drums, noise, t0 + BEAT * b, "lowpass", 260, 0.8, 0.09, 0.12, r() * 3);
      }
      for (let i = 0; i < 8; i++) {
        const at = t0 + BEAT * (i / 2) + (i % 2 ? swing : 0);
        hit(a, drums, noise, at, "highpass", 7200, 0.6, i % 2 ? 0.035 : 0.05, i % 2 ? 0.035 : 0.06, r() * 3);
      }
      // Davulun çıkacağı ölçünün sonunda küçük bir dolgu
      if (bar === plan.drumsTo - 1) for (const b of [3.5, 3.75]) hit(a, drums, noise, t0 + BEAT * b, "bandpass", 1800, 0.7, 0.14, 0.12, r() * 3);
    }
    // Kapanışın ilk vuruşu: tek bir yumuşak davul
    if (bar === plan.drumsTo) kick(a, drums, t0, 0.4);
  }

  // Plak: alçak hışırtı ve seyrek çıtırtılar
  const hiss = a.createBufferSource();
  hiss.buffer = noise;
  hiss.loop = true;
  const hf = a.createBiquadFilter();
  hf.type = "bandpass";
  hf.frequency.value = 3200;
  hf.Q.value = 0.5;
  const hg = a.createGain();
  hg.gain.value = 0.006;
  hiss.connect(hf).connect(hg).connect(warm);
  hiss.start(0);
  hiss.stop(sec);
  for (let at = 0.05; at < sec; at += 0.05 + r() * 0.35) hit(a, warm, noise, at, "highpass", 2500 + r() * 3000, 0.7, 0.008, 0.02 + r() * 0.05, r() * 3);
}
