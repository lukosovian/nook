/**
 * Hum için telefonun mikrofonu: ses 16 kHz mono'ya indirilip biriktirilir (PC Shazam imzasını bundan
 * çıkarır). Yankı/gürültü bastırma kapalı: hoparlörden gelen müzik olduğu gibi duyulsun.
 */

const RATE = 16_000;
/** Shazam en fazla ~12 sn'lik ses ister */
const KEEP = 12 * RATE;

export interface Mic {
  /** Şimdiye kadar biriken ses (sn) */
  seconds: () => number;
  /** Son 12 sn, s16le */
  take: () => Int16Array;
  /** Anlık ses şiddeti 0..1 */
  level: () => number;
  stop: () => void;
}

export async function startMic(): Promise<Mic> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Bu cihazda mikrofon kullanılamıyor");
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
  } catch {
    throw new Error("Mikrofon izni verilmedi: telefonun ayarlarından Nook'a mikrofon izni ver");
  }
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  // Cihazın hızından 16 kHz'e: her çıkış örneği, denk gelen giriş örneklerinin ortalaması (kaba alçak geçiren)
  const ratio = ctx.sampleRate / RATE;
  const buf = new Float32Array(KEEP);
  let written = 0;
  let acc = 0;
  let accN = 0;
  let pos = 0;
  let lvl = 0;
  proc.onaudioprocess = (e) => {
    const d = e.inputBuffer.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < d.length; i++) {
      const v = d[i];
      peak = Math.max(peak, Math.abs(v));
      acc += v;
      accN++;
      pos += 1;
      if (pos >= ratio) {
        pos -= ratio;
        buf[written % KEEP] = acc / accN;
        written++;
        acc = 0;
        accN = 0;
      }
    }
    lvl = Math.max(peak, lvl * 0.8);
  };
  src.connect(proc);
  // ScriptProcessor ancak bir çıkışa bağlıyken çalışır; çıkışa bir şey yazılmadığı için sessiz
  proc.connect(ctx.destination);

  return {
    seconds: () => written / RATE,
    level: () => Math.min(1, lvl * 2.5),
    take: () => {
      const n = Math.min(written, KEEP);
      const out = new Int16Array(n);
      const start = written - n;
      for (let i = 0; i < n; i++) {
        const v = buf[(start + i) % KEEP];
        out[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
      }
      return out;
    },
    stop: () => {
      proc.onaudioprocess = null;
      src.disconnect();
      proc.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}
