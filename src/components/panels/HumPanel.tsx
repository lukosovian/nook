import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Music2, Radio, X } from "lucide-react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { toggleHum } from "../../hooks/useHum";
import { copyText, openPath } from "../../lib/bridge";
import { playSfx } from "../../lib/sfx";
import { spotifyUrl, youtubeUrl, type HumEntry } from "../../lib/hum";
import { spring } from "../../lib/motion";
import { useNook } from "../../store/nook";
import { ACCENT, EmptyState, tintBg, tintText, Toggle } from "../ui/primitives";
import { HUM_COLORS } from "../overlays/HumView";
import { locale, tt } from "../../lib/i18n";

/** Hum: "Dinle" düğmesi, otomatik Hum, bulunan şarkılar (yeniden eskiye). */
export function HumPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("hum", scroller);
  const hums = useNook((s) => s.hums);
  const auto = useNook((s) => s.settings.humAuto);
  const shortcut = useNook((s) => s.settings.humShortcut);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={spring.pop}
          onClick={() => void toggleHum()}
          className="relative flex h-11 flex-1 items-center gap-2.5 overflow-hidden rounded-full pl-1.5 pr-4 text-left"
          style={{ background: `linear-gradient(100deg, ${tintBg(HUM_COLORS[0], 30)}, ${tintBg(HUM_COLORS[1], 30)} 55%, ${tintBg(HUM_COLORS[2], 26)})` }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40">
            <Music2 size={15} strokeWidth={2.4} className="text-white" />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold leading-tight text-label">{tt("Çalan şarkıyı bul")}</span>
            <span className="block truncate text-[10.5px] leading-tight text-label-2">
              {shortcut ? tt("{0} · videoda, dizide, filmde", shortcut) : tt("Videoda, dizide, filmde")}
            </span>
          </span>
        </motion.button>
        <div
          className="flex h-11 shrink-0 items-center gap-2 rounded-full border px-3"
          title={tt("Arkada dinler, müzik çalınca şarkıyı bulup buraya kaydeder. Oyundayken ve görüşmedeyken dinlemez.")}
          style={{ background: tintBg(ACCENT.purple, auto ? 12 : 4), borderColor: tintBg(ACCENT.purple, auto ? 36 : 14) }}
        >
          <Radio size={13} strokeWidth={2.4} style={{ color: auto ? tintText(ACCENT.purple) : "var(--color-label-3)" }} />
          <span className="text-[11px] font-medium leading-tight text-label-2">{tt("Otomatik")}</span>
          <Toggle on={auto} onChange={(v) => useNook.getState().updateSettings({ humAuto: v })} color={ACCENT.purple} />
        </div>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {!hums.length ? (
          <EmptyState title={tt("Henüz Hum yok")} hint={tt("Bir şarkı çalarken düğmeye ya da kısayola bas")} color={HUM_COLORS[1]} />
        ) : (
          <AnimatePresence initial={false}>
            {hums.map((h) => (
              <Row key={h.id} h={h} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function Row({ h }: { h: HumEntry }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void copyText(`${h.artist} – ${h.title}`);
    playSfx("pop");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={spring.pop}
      className="group relative flex h-11 items-center gap-2.5 overflow-hidden rounded-[14px] bg-white/[0.03] pl-1 pr-1.5 hover:bg-white/[0.06]"
    >
      {/* Kopyalanınca satır kısaca yeşil parlar */}
      <AnimatePresence>
        {copied && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-[14px]"
            style={{ background: tintBg(ACCENT.green, 14), boxShadow: `inset 0 0 0 1px ${tintBg(ACCENT.green, 40)}` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
        )}
      </AnimatePresence>
      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[10px] bg-well">
        {h.cover ? (
          <img src={h.cover} alt="" draggable={false} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-label-3">
            <Music2 size={14} />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-medium leading-tight text-label">{h.title}</span>
        <span className="block truncate text-[10.5px] leading-tight text-label-3">
          <span className="text-label-2">{h.artist}</span>
          {" · "}
          {when(h.at)}
          {h.auto && (
            <span className="ml-1 inline-flex translate-y-[1px] items-center gap-0.5" title={tt("Otomatik Hum buldu")} style={{ color: tintText(ACCENT.purple) }}>
              <Radio size={9} strokeWidth={2.6} />
            </span>
          )}
        </span>
      </span>
      {/* Üstüne gelince: Spotify, YouTube, kopyala, sil */}
      <span className={`relative flex shrink-0 items-center gap-1 transition-opacity ${copied ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        <AnimatePresence>
          {copied && (
            <motion.span
              className="whitespace-nowrap rounded-full px-2 py-[2px] text-[10px] font-medium"
              style={{ background: tintBg(ACCENT.green, 18), color: tintText(ACCENT.green) }}
              initial={{ opacity: 0, x: 8, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 4 }}
              transition={spring.pop}
            >
              {tt("Kopyalandı")}
            </motion.span>
          )}
        </AnimatePresence>
        <Pill label="Spotify" color={ACCENT.green} onClick={() => void openPath(spotifyUrl(h))} />
        <Pill label="YouTube" color={ACCENT.red} onClick={() => void openPath(youtubeUrl(h))} />
        <IconButton label={copied ? tt("Kopyalandı") : tt("Kopyala")} onClick={copy}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={copied ? "ok" : "copy"}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={spring.pop}
              className="flex"
              style={copied ? { color: tintText(ACCENT.green) } : undefined}
            >
              {copied ? <Check size={11} strokeWidth={3} /> : <Copy size={10.5} strokeWidth={2.4} />}
            </motion.span>
          </AnimatePresence>
        </IconButton>
        <IconButton label={tt("Sil")} onClick={() => useNook.getState().removeHum(h.id)}>
          <X size={11} strokeWidth={2.6} />
        </IconButton>
      </span>
    </motion.div>
  );
}

/** "14:32", "dün 21:05", "3 Eki" */
function when(at: number) {
  const d = new Date(at);
  const now = new Date();
  const time = d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return time;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return tt("dün {0}", time);
  return d.toLocaleDateString(locale(), { day: "numeric", month: "short" });
}

function Pill({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-5 rounded-full border px-2 text-[10px] font-medium"
      style={{ background: tintBg(color, 12), borderColor: tintBg(color, 34), color: tintText(color) }}
    >
      {label}
    </button>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className="flex h-5 w-5 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label">
      {children}
    </button>
  );
}
