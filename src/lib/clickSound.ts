/**
 * Mikrofon anahtarı sesi: dosya yok, Web Audio ile sentezlenir. Kısa, tok bir "tık" (gürültü patlaması +
 * alçak gövde tonu); kapanırken inen, açılırken çıkan iki katmanlı bir klik.
 */
let ctx: AudioContext | null = null;

export function micClick(on: boolean) {
  try {
    ctx ??= new AudioContext();
    const a = ctx;
    void a.resume();
    const t = a.currentTime + 0.01;
    const out = a.createGain();
    out.gain.value = 0.55;
    out.connect(a.destination);

    // 1) Mekanik tık: çok kısa, süzülmüş gürültü
    const len = Math.floor(a.sampleRate * 0.03);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
    const noise = a.createBufferSource();
    noise.buffer = buf;
    const band = a.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = on ? 3200 : 2400;
    band.Q.value = 1.4;
    noise.connect(band).connect(out);
    noise.start(t);

    // 2) Gövde: kısa bir ton, açılırken yukarı, kapanırken aşağı kayar
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(on ? 520 : 760, t);
    osc.frequency.exponentialRampToValueAtTime(on ? 880 : 380, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 0.14);
  } catch {
    // ses çıkarılamıyorsa sessiz geç
  }
}
