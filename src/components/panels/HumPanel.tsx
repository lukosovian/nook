import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Disc3, Mic, Music2, Radio, Smartphone, X } from "lucide-react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { toggleHum } from "../../hooks/useHum";
import { copyText, openPath } from "../../lib/bridge";
import { playSfx } from "../../lib/sfx";
import { spotifyUrl, youtubeUrl, type HumEntry } from "../../lib/hum";
import { spring } from "../../lib/motion";
import { useNook } from "../../store/nook";
import { ACCENT, tintBg, tintText, Toggle } from "../ui/primitives";
import { HUM_COLORS } from "../overlays/HumView";
import { locale, tt } from "../../lib/i18n";

/**
 * Hum: solda en son bulunan şarkı büyük kapağıyla (Spotify, YouTube, kopyala), sağda "Dinlet" düğmesi,
 * otomatik Hum ve geçmiş (yeniden eskiye).
 */
export function HumPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("hum", scroller);
  const hums = useNook((s) => s.hums);
  const auto = useNook((s) => s.settings.humAuto);
  const shortcut = useNook((s) => s.settings.humShortcut);
  const [latest, ...rest] = hums;

  return (
    <div className="flex h-full gap-3">
      <div className="flex w-[176px] shrink-0 flex-col">{latest ? <Latest h={latest} /> : <Waiting />}</div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.01 }}
          transition={spring.pop}
          onClick={() => void toggleHum()}
          className="relative flex h-[46px] shrink-0 items-center gap-2.5 overflow-hidden rounded-[16px] pl-1.5 pr-3 text-left"
          style={{ background: `linear-gradient(100deg, ${HUM_COLORS[0]}, ${HUM_COLORS[1]} 55%, ${HUM_COLORS[2]})`, boxShadow: `0 8px 22px -12px ${HUM_COLORS[1]}` }}
        >
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[12px] bg-black/30">
            <Mic size={16} strokeWidth={2.4} className="text-white" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-bold leading-tight text-white">{tt("Şimdi dinlet")}</span>
            <span className="block truncate text-[10.5px] leading-tight text-white/75">{tt("Çalan şarkıyı bulur")}</span>
          </span>
          {shortcut && <span className="shrink-0 rounded-[8px] bg-black/25 px-1.5 py-[2px] text-[10px] font-semibold text-white/85">{shortcut}</span>}
        </motion.button>

        <div
          className="flex shrink-0 items-center gap-2 rounded-[13px] border px-2.5 py-[5px]"
          title={tt("Arkada dinler, müzik çalınca şarkıyı bulup buraya kaydeder. Oyundayken ve görüşmedeyken dinlemez.")}
          style={{ background: tintBg(ACCENT.purple, auto ? 12 : 4), borderColor: tintBg(ACCENT.purple, auto ? 36 : 14) }}
        >
          <Radio size={13} strokeWidth={2.4} style={{ color: auto ? tintText(ACCENT.purple) : "var(--color-label-3)" }} />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[11.5px] font-semibold text-label">{tt("Otomatik Hum")}</span>
            <span className="block truncate text-[9.5px] text-label-3">{auto ? tt("Arkada dinliyor, bulduğunu kaydeder") : tt("Kapalı · yalnızca sen deyince")}</span>
          </span>
          <Toggle on={auto} onChange={(v) => useNook.getState().updateSettings({ humAuto: v })} color={ACCENT.purple} />
        </div>

        <p className="flex shrink-0 items-center justify-between px-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-label-3">
          {tt("Geçmiş")}
          {hums.length > 0 && <span className="normal-case tracking-normal">{tt("{0} şarkı", hums.length)}</span>}
        </p>
        <div ref={scroller} className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {rest.length ? (
            <AnimatePresence initial={false}>
              {rest.map((h) => (
                <Row key={h.id} h={h} />
              ))}
            </AnimatePresence>
          ) : (
            <p className="px-1 pt-1 text-[10.5px] text-label-3">{latest ? tt("Bulduğun şarkılar burada birikir") : tt("Henüz bir şey bulmadım")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** En son bulunan: büyük kapak (arkasında kapağın rengi parlar), ad, sanatçı, düğmeler */
function Latest({ h }: { h: HumEntry }) {
  const [copied, copy] = useCopy(h);
  return (
    <motion.div key={h.id} className="flex h-full min-h-0 flex-col" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.pop}>
      <div className="relative mx-auto aspect-square w-full max-w-[124px] shrink-0">
        {h.cover && <img src={h.cover} alt="" draggable={false} className="absolute inset-0 h-full w-full scale-110 rounded-[18px] object-cover opacity-60 blur-xl" />}
        <div className="relative h-full w-full overflow-hidden rounded-[18px] border border-white/10 bg-well shadow-[0_10px_24px_-10px_rgba(0,0,0,0.9)]">
          {h.cover ? (
            <img src={h.cover} alt="" draggable={false} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center" style={{ background: `linear-gradient(140deg, ${tintBg(HUM_COLORS[0], 40)}, ${tintBg(HUM_COLORS[1], 40)})` }}>
              <Disc3 size={38} strokeWidth={1.6} className="text-white/70" />
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 min-w-0 text-center leading-tight">
        <p className="truncate text-[13.5px] font-bold text-label">{h.title}</p>
        <p className="truncate text-[11px] text-label-2">{h.artist}</p>
        <p className="mt-0.5 flex items-center justify-center gap-1 text-[9.5px] text-label-3">
          {when(h.at)}
          {h.phone && <Smartphone size={9} strokeWidth={2.6} style={{ color: tintText(ACCENT.purple) }} />}
          {h.auto && <Radio size={9} strokeWidth={2.6} style={{ color: tintText(ACCENT.purple) }} />}
        </p>
      </div>
      <div className="mt-auto flex items-center gap-1">
        <Pill label="Spotify" color={ACCENT.green} onClick={() => void openPath(spotifyUrl(h))} grow />
        <Pill label="YouTube" color={ACCENT.red} onClick={() => void openPath(youtubeUrl(h))} grow />
        <CopyButton copied={copied} onClick={copy} />
      </div>
    </motion.div>
  );
}

/** Hiç şarkı bulunmamışken: dönen plak ve kısa anlatım */
function Waiting() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-[18px] border border-dashed border-white/[0.1] px-3 text-center">
      <motion.span
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(from 0deg, ${HUM_COLORS[0]}, ${HUM_COLORS[1]}, ${HUM_COLORS[2]}, ${HUM_COLORS[0]})` }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#111]">
          <Music2 size={18} className="text-label-2" />
        </span>
      </motion.span>
      <p className="text-[12.5px] font-semibold text-label">{tt("Henüz Hum yok")}</p>
      <p className="text-[10.5px] leading-snug text-label-3">{tt("Bir şarkı çalarken düğmeye ya da kısayola bas")}</p>
    </div>
  );
}

function useCopy(h: HumEntry): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void copyText(`${h.artist} – ${h.title}`);
    playSfx("pop");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  return [copied, copy];
}

function Row({ h }: { h: HumEntry }) {
  const [copied, copy] = useCopy(h);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={spring.pop}
      className="group relative flex h-10 items-center gap-2 overflow-hidden rounded-[12px] bg-white/[0.03] pl-1 pr-1 hover:bg-white/[0.06]"
    >
      {/* Kopyalanınca satır kısaca yeşil parlar */}
      <AnimatePresence>
        {copied && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-[12px]"
            style={{ background: tintBg(ACCENT.green, 14), boxShadow: `inset 0 0 0 1px ${tintBg(ACCENT.green, 40)}` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
        )}
      </AnimatePresence>
      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-[9px] bg-well">
        {h.cover ? (
          <img src={h.cover} alt="" draggable={false} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-label-3">
            <Music2 size={13} />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11.5px] font-semibold leading-tight text-label">{h.title}</span>
        <span className="block truncate text-[10px] leading-tight text-label-3">
          <span className="text-label-2">{h.artist}</span>
          {" · "}
          {when(h.at)}
          {h.phone && (
            <span className="ml-1 inline-flex translate-y-[1px] items-center gap-0.5" title={tt("Telefon duydu")} style={{ color: tintText(ACCENT.purple) }}>
              <Smartphone size={9} strokeWidth={2.6} />
            </span>
          )}
          {h.auto && (
            <span className="ml-1 inline-flex translate-y-[1px] items-center gap-0.5" title={tt("Otomatik Hum buldu")} style={{ color: tintText(ACCENT.purple) }}>
              <Radio size={9} strokeWidth={2.6} />
            </span>
          )}
        </span>
      </span>
      {/* Üstüne gelince: Spotify, YouTube, kopyala, sil */}
      <span
        className={`absolute inset-y-0 right-0 flex items-center gap-1 pl-6 pr-1 transition-opacity ${copied ? "opacity-100" : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"}`}
        style={{ background: "linear-gradient(90deg, transparent, #1c1c1f 22%)" }}
      >
        <Pill label="Spotify" color={ACCENT.green} onClick={() => void openPath(spotifyUrl(h))} />
        <Pill label="YouTube" color={ACCENT.red} onClick={() => void openPath(youtubeUrl(h))} />
        <CopyButton copied={copied} onClick={copy} small />
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

function Pill({ label, color, onClick, grow }: { label: string; color: string; onClick: () => void; grow?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2 font-semibold ${grow ? "h-7 flex-1 text-[10.5px]" : "h-5 text-[10px]"}`}
      style={{ background: tintBg(color, 12), borderColor: tintBg(color, 34), color: tintText(color) }}
    >
      {label}
    </button>
  );
}

function CopyButton({ copied, onClick, small }: { copied: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={copied ? tt("Kopyalandı") : tt("Kopyala")}
      aria-label={tt("Kopyala")}
      className={`flex shrink-0 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label ${small ? "h-5 w-5" : "h-7 w-7 bg-white/[0.05]"}`}
    >
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
