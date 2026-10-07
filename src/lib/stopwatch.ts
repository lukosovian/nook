/** Kronometre: başlat/duraklat, tur al, sıfırla. Durum kalıcıdır (Nook yeniden açılınca sürer). */
import { useNook, type Stopwatch } from "../store/nook";

export function swElapsed(sw: Stopwatch | null, now = Date.now()) {
  if (!sw) return 0;
  return sw.acc + (sw.startedAt !== null ? now - sw.startedAt : 0);
}

export function swToggle() {
  const { stopwatch: sw, setStopwatch } = useNook.getState();
  const now = Date.now();
  if (!sw) return setStopwatch({ startedAt: now, acc: 0, laps: [] });
  if (sw.startedAt !== null) setStopwatch({ ...sw, startedAt: null, acc: swElapsed(sw, now) });
  else setStopwatch({ ...sw, startedAt: now });
}

/** Tur: o ana kadarki toplam süre listenin başına */
export function swLap() {
  const { stopwatch: sw, setStopwatch } = useNook.getState();
  if (!sw || sw.startedAt === null) return;
  setStopwatch({ ...sw, laps: [swElapsed(sw), ...sw.laps].slice(0, 50) });
}

export function swReset() {
  useNook.getState().setStopwatch(null);
}

/** 1:02:03,4 / 02:03,4 */
export function swText(ms: number, tenths = true) {
  const t = Math.floor(ms / 100);
  const h = Math.floor(t / 36000);
  const m = Math.floor((t / 600) % 60);
  const s = Math.floor((t / 10) % 60);
  const base = `${h ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return tenths ? `${base},${t % 10}` : base;
}
