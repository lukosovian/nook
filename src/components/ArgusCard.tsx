import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Film } from "lucide-react";
import { emit, listen } from "@tauri-apps/api/event";
import { CARD_SIZE, type ArgusCardData } from "../lib/argus";
import { ACCENT, Bar, tintBg, tintText } from "./ui/primitives";

const COLOR = ACCENT.orange;

/**
 * "argus-card" penceresinin tek içeriği: adanın sağında, ada gibi ekrana yapışık siyah çentik.
 * Solda afiş; sağda ad, bölüm, küçük bilgiler ve bugün ne kadar izlendiği.
 */
export function ArgusCard({ initial = null }: { initial?: ArgusCardData | null }) {
  const [data, setData] = useState<ArgusCardData | null>(initial);
  useEffect(() => {
    if (initial) return;
    const off = listen<ArgusCardData>("nook://argus-card", (e) => setData(e.payload));
    // Ada, bu pencere yüklenmeden gönderdiyse kaçırmayalım
    void off.then(() => emit("nook://argus-card-ready"));
    return () => void off.then((f) => f());
  }, [initial]);

  const min = data ? Math.floor(data.playedMs / 60_000) : 0;
  const need = data ? Math.ceil(data.needMs / 60_000) : 15;
  const done = !!data && data.playedMs >= data.needMs;

  return (
    <div className="pointer-events-none fixed left-0 top-0 pl-1.5">
      <AnimatePresence>
        {data?.visible && (
          <motion.div
            key="card"
            className="flex gap-3 overflow-hidden rounded-b-[24px] bg-black p-2.5 pr-3.5"
            style={{ width: CARD_SIZE.width, height: CARD_SIZE.height, originX: 0, originY: 0, boxShadow: "0 18px 40px -16px rgba(0,0,0,0.9)" }}
            initial={{ opacity: 0, x: -18, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -14, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            {/* Afiş solda, tam boy */}
            <div className="relative aspect-[2/3] h-full shrink-0 overflow-hidden rounded-[14px] bg-well">
              {data.poster ? (
                <img src={data.poster} alt="" draggable={false} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-label-3">
                  <Film size={26} />
                </span>
              )}
            </div>

            {/* Bilgiler sağda */}
            <div className="flex min-w-0 flex-1 flex-col py-0.5">
              {data.status && (
                <span
                  className="mb-1 self-start rounded-full border px-1.5 py-px text-[9.5px] font-medium"
                  style={{ background: tintBg(COLOR, 14), borderColor: tintBg(COLOR, 36), color: tintText(COLOR) }}
                >
                  {data.status}
                </span>
              )}
              <p className="line-clamp-2 font-display text-[13.5px] font-semibold leading-tight text-label">{data.title}</p>
              {data.episode && <p className="mt-0.5 truncate text-[11px] text-label-2">{data.episode}</p>}
              {data.meta.length > 0 && <p className="mt-0.5 truncate text-[10px] text-label-3">{data.meta.join(" · ")}</p>}
              <div className="mt-auto">
                <div className="flex items-baseline justify-between text-[10.5px] font-medium tabular-nums" style={{ color: tintText(COLOR) }}>
                  <span>{min} dk izlendi</span>
                  <span className="text-label-3">{done ? "✓ yazılabilir" : `/ ${need} dk`}</span>
                </div>
                <Bar pct={Math.min(100, (data.playedMs / Math.max(1, data.needMs)) * 100)} color={done ? ACCENT.green : COLOR} className="mt-1" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
