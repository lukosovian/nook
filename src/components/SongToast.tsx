import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Music2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { SongToastData } from "../lib/bridge";
import { ACCENT, MiniNook, tintText } from "./ui/primitives";
import { tt } from "../lib/i18n";

const SHOW_MS = 6500;

/**
 * "song-toast" penceresinin içeriği: tam ekranda İzlerken Hum bir şarkı bulunca sol altta beliren
 * siyah çubuk. Solda Nook, ortada kapak ve şarkı, altında Argus'a hangi dakikayla yazıldığı.
 */
export function SongToast({ initial = null }: { initial?: SongToastData | null }) {
  const [data, setData] = useState<SongToastData | null>(initial);

  useEffect(() => {
    if (initial) return;
    const off = listen<SongToastData>("nook://song-toast", (e) => setData(e.payload));
    // Pencere bu şarkı için yeni açıldıysa olayı kaçırmış olabilir
    void invoke<SongToastData | null>("song_toast_take").then((d) => d && setData((cur) => cur ?? d));
    return () => void off.then((f) => f());
  }, [initial]);

  useEffect(() => {
    if (!data || initial) return;
    const t = window.setTimeout(() => setData(null), data.ms ?? SHOW_MS);
    return () => window.clearTimeout(t);
  }, [data, initial]);

  return (
    <div className="pointer-events-none fixed bottom-0 left-0">
      <AnimatePresence>
        {data && (
          <motion.div
            key={data.id}
            className="flex h-[84px] w-[368px] items-center gap-3 rounded-[42px] bg-black py-2 pl-2.5 pr-5 ring-1 ring-white/10"
            style={{ boxShadow: "0 14px 34px -12px rgba(0,0,0,0.9)", originX: 0 }}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
          >
            <motion.div className="shrink-0" animate={{ y: [0, -3, 0], rotate: [0, -6, 6, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
              <MiniNook color={ACCENT.purple} size={42} />
            </motion.div>
            <div className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[12px] bg-well">
              {data.cover ? (
                <img src={data.cover} alt="" draggable={false} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-label-3">
                  <Music2 size={22} />
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-[14px] font-semibold text-label">{data.title}</p>
              <p className="truncate text-[12px] text-label-2">{data.artist}</p>
              <p className="mt-0.5 truncate text-[10.5px] font-medium" style={{ color: tintText(ACCENT.purple) }}>
                {data.line
                  ? data.line
                  : data.show
                  ? data.minute != null
                    ? tt("Argus'a eklendi · {0} · {1}. dk", data.show, data.minute)
                    : tt("Argus'a eklendi · {0}", data.show)
                  : tt("Şu an çalıyor")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
