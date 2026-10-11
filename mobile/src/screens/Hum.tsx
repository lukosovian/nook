import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Copy, Music2, Smartphone } from "lucide-react";
import { getHums, humRecognize, phoneClipboard, type HumTrack, type Pairing, type PcHum } from "../lib/pc";
import { startMic, type Mic } from "../lib/mic";
import { ChipNook, errText, tintBg, tintText, TopBar, useBackButton, useToast } from "../ui";

const PURPLE = "#9B7BFF";
/** Dinlemeye başladıktan sonra PC'ye sorma anları (sn); sonuncusu en uzun dinleme */
const TRIES = [4, 7, 10, 12.5];

type Phase = { kind: "idle" } | { kind: "listening" } | { kind: "found"; track: HumTrack } | { kind: "miss"; text: string };

function ago(ms: number) {
  const m = Math.round((Date.now() - ms) / 60_000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} sa önce` : `${Math.round(h / 24)} gün önce`;
}

/** Hum: telefonun mikrofonu etrafta çalan şarkıyı dinler, PC tanır. Bulunan PC'deki Hum geçmişine
 *  ve (PC'de Argus'ta bir şey izlenirken, İzlerken Hum açıksa) Argus'a yazılır. */
export function HumScreen({ pairing, onBack }: { pairing: Pairing; onBack: () => void }) {
  useBackButton(onBack);
  const [toast, say] = useToast();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [level, setLevel] = useState(0);
  const [hums, setHums] = useState<PcHum[] | null>(null);
  const mic = useRef<Mic | null>(null);
  const run = useRef(0);

  const load = () =>
    getHums(pairing)
      .then(setHums)
      .catch(() => {});
  useEffect(() => {
    void load();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairing]);

  const stop = () => {
    run.current++;
    mic.current?.stop();
    mic.current = null;
    setLevel(0);
  };

  const listen = async () => {
    if (phase.kind === "listening") {
      stop();
      setPhase({ kind: "idle" });
      return;
    }
    const id = ++run.current;
    try {
      mic.current = await startMic();
    } catch (e) {
      setPhase({ kind: "miss", text: errText(e) });
      return;
    }
    setPhase({ kind: "listening" });
    const m = mic.current;
    const meter = window.setInterval(() => setLevel(m.level()), 80);
    let lastErr: string | null = null;
    let heard = false;
    try {
      for (const at of TRIES) {
        while (m.seconds() < at) {
          await new Promise((r) => setTimeout(r, 100));
          if (run.current !== id) return;
        }
        const out = await humRecognize(pairing, m.take()).catch((e) => ({ status: "error" as const, message: errText(e) }));
        if (run.current !== id) return;
        if (out.status === "found") {
          setPhase({ kind: "found", track: out.track });
          window.setTimeout(() => void load(), 900);
          return;
        }
        if (out.status === "error") lastErr = out.message;
        if (out.status !== "silent") heard = true;
      }
      setPhase({ kind: "miss", text: lastErr ?? (heard ? "Bulunamadı: telefonu sese biraz daha yaklaştır" : "Ses duyulmadı") });
    } finally {
      window.clearInterval(meter);
      if (run.current === id) stop();
    }
  };

  const listening = phase.kind === "listening";
  const copy = async (t: { title: string; artist: string }) => {
    try {
      await (await phoneClipboard()).write(`${t.artist} – ${t.title}`);
      say("Kopyalandı");
    } catch (e) {
      say(errText(e));
    }
  };

  return (
    <div className="safe flex min-h-screen flex-col gap-4 px-4">
      <TopBar title="Hum" nook="hum" onBack={() => history.back()} />

      {/* Dinle düğmesi: Nook ortada, sesle büyüyen halkalar */}
      <section className="flex flex-col items-center gap-3 rounded-3xl py-6" style={{ background: tintBg(PURPLE, 10), border: `1px solid ${tintBg(PURPLE, 28)}` }}>
        <motion.button whileTap={{ scale: 0.94 }} onClick={() => void listen()} className="relative flex h-[150px] w-[150px] items-center justify-center">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full"
              style={{ border: `2px solid ${tintBg(PURPLE, 60 - i * 15)}` }}
              animate={listening ? { scale: 1 + level * (0.18 + i * 0.12) + i * 0.04, opacity: 0.35 + level * 0.6 } : { scale: 0.9 + i * 0.06, opacity: 0.25 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          ))}
          <span className="absolute inset-3 rounded-full" style={{ background: tintBg(PURPLE, listening ? 26 : 16) }} />
          <span className="relative">
            <ChipNook id="hum" size={92} expression={listening ? "djNod" : phase.kind === "found" ? "happy" : "idle"} />
          </span>
        </motion.button>
        <p className="px-6 text-center text-[14px] font-semibold" style={{ color: tintText(PURPLE) }}>
          {listening ? "Dinliyorum… (durdurmak için dokun)" : "Çalan şarkıyı bulmak için dokun"}
        </p>
        <AnimatePresence mode="wait">
          {phase.kind === "found" && (
            <motion.div
              key="found"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-2xl bg-card p-2.5"
            >
              <Cover src={phase.track.cover} size={56} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15.5px] font-bold">{phase.track.title}</span>
                <span className="block truncate text-[13px] text-label-2">{phase.track.artist}</span>
                <span className="mt-0.5 block truncate text-[11.5px] text-label-3">PC'deki Hum geçmişine eklendi</span>
              </span>
              <button onClick={() => void copy(phase.track)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-well text-label-2">
                <Copy size={17} />
              </button>
            </motion.div>
          )}
          {phase.kind === "miss" && (
            <motion.p key="miss" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 text-center text-[13px] text-label-2">
              {phase.text}
            </motion.p>
          )}
        </AnimatePresence>
      </section>
      <p className="-mt-2 px-2 text-[11.5px] leading-snug text-label-3">
        PC'de Argus'ta bir şey izlerken bulursan şarkı o içeriğin Müzikler listesine de eklenir (İzlerken Hum açıksa).
      </p>

      <h2 className="-mb-1 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-label-3">Geçmiş</h2>
      <section className="flex flex-col gap-1.5 pb-6">
        {hums === null ? (
          <p className="px-1 text-[13px] text-label-3">Yükleniyor…</p>
        ) : hums.length === 0 ? (
          <p className="px-1 text-[13px] text-label-3">Henüz bulunan şarkı yok.</p>
        ) : (
          hums.map((h) => (
            <button key={h.id} onClick={() => void copy(h)} className="flex items-center gap-3 rounded-2xl bg-card p-2 text-left">
              <Cover src={h.cover} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-semibold">{h.title}</span>
                <span className="flex items-center gap-1 truncate text-[12px] text-label-3">
                  <span className="truncate text-label-2">{h.artist}</span>· {ago(h.at)}
                  {h.phone && <Smartphone size={11} className="shrink-0" style={{ color: tintText(PURPLE) }} />}
                </span>
              </span>
            </button>
          ))
        )}
      </section>
      {toast}
    </div>
  );
}

function Cover({ src, size }: { src: string | null | undefined; size: number }) {
  return src ? (
    <img src={src} alt="" className="shrink-0 rounded-xl object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-xl" style={{ width: size, height: size, background: tintBg(PURPLE, 18), color: tintText(PURPLE) }}>
      <Music2 size={size * 0.42} />
    </span>
  );
}
