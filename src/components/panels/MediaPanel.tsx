import { useRef } from "react";
import { AnimatePresence, motion, useAnimationFrame } from "motion/react";
import { mediaControl, type MediaAction } from "../../lib/bridge";
import { appName, formatTime, livePosition } from "../../lib/media";
import { spring } from "../../lib/motion";
import { useNook, type NowPlaying } from "../../store/nook";
import { Equalizer } from "../media/Equalizer";
import { NextGlyph, PauseGlyph, PlayGlyph, PrevGlyph } from "../ui/glyphs";
import { ACCENT, EmptyState, MiniNook, tintText } from "../ui/primitives";

export function MediaPanel() {
  const media = useNook((s) => s.media);
  if (!media) return <EmptyState title="Sessizlik" hint="Spotify, YouTube ya da başka bir oynatıcı başlat" color={ACCENT.pink} />;

  return (
    <div className="relative flex h-full items-center gap-3.5">
      {/* Kapaktan gelen bulanık renk — kartın üstüne hafifçe yayılır */}
      <AnimatePresence initial={false}>
        {media.artwork && (
          <motion.img
            key={media.trackKey}
            src={media.artwork}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -left-10 -top-10 h-[150%] w-[60%] object-cover opacity-0 blur-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="relative flex h-[112px] w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-well shadow-[0_12px_28px_-10px_rgba(0,0,0,0.9)]"
        animate={{ scale: media.playing ? 1 : 0.92 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {media.artwork ? (
            <motion.img
              key={media.trackKey}
              src={media.artwork}
              alt=""
              draggable={false}
              className="h-full w-full object-cover"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            />
          ) : (
            <MiniNook key="none" color={ACCENT.pink} size={40} eyes="happy" />
          )}
        </AnimatePresence>
      </motion.div>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: tintText(ACCENT.pink) }}>
          <Equalizer playing={media.playing} height={9} />
          {appName(media.app)}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={media.trackKey}
            className="mt-1"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.18 }}
          >
            <p className="truncate font-display text-[15px] font-medium leading-tight text-label" title={media.title}>
              {media.title}
            </p>
            <p className="truncate text-[12px] text-label-2" title={media.artist}>
              {media.artist || media.album || " "}
            </p>
          </motion.div>
        </AnimatePresence>
        {media.durationMs > 0 && <Progress media={media} />}
        <Controls playing={media.playing} />
      </div>
    </div>
  );
}

/** İlerleme çubuğu: React render'ı yok, her karede doğrudan DOM'a yazar. */
function Progress({ media }: { media: NowPlaying }) {
  const fill = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLSpanElement>(null);
  const remaining = useRef<HTMLSpanElement>(null);
  const lastText = useRef("");
  const latest = useRef(media);
  latest.current = media;

  useAnimationFrame(() => {
    const m = latest.current;
    const pos = livePosition(m);
    if (fill.current) fill.current.style.transform = `scaleX(${pos / m.durationMs})`;
    const text = formatTime(pos);
    if (text !== lastText.current) {
      lastText.current = text;
      if (current.current) current.current.textContent = text;
      if (remaining.current) remaining.current.textContent = `-${formatTime(m.durationMs - pos)}`;
    }
  });

  return (
    <div className="mt-2.5">
      <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.1]">
        <div
          ref={fill}
          className="h-full origin-left rounded-full"
          style={{ transform: "scaleX(0)", background: ACCENT.pink, boxShadow: `0 0 8px ${ACCENT.pink}` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-medium tabular-nums text-label-3">
        <span ref={current}>0:00</span>
        <span ref={remaining}>-{formatTime(media.durationMs)}</span>
      </div>
    </div>
  );
}

function Controls({ playing }: { playing: boolean }) {
  const setPlaying = useNook((s) => s.setPlaying);
  const send = (action: MediaAction) => {
    if (action === "toggle") setPlaying(!playing);
    void mediaControl(action).catch(() => {});
  };

  return (
    <div className="mt-1 flex items-center gap-4">
      <ControlButton label="Önceki" onClick={() => send("prev")}>
        <PrevGlyph size={18} />
      </ControlButton>
      <ControlButton label={playing ? "Duraklat" : "Oynat"} onClick={() => send("toggle")} big>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={playing ? "pause" : "play"}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={spring.pop}
            className="flex"
          >
            {playing ? <PauseGlyph size={18} /> : <PlayGlyph size={18} />}
          </motion.span>
        </AnimatePresence>
      </ControlButton>
      <ControlButton label="Sonraki" onClick={() => send("next")}>
        <NextGlyph size={18} />
      </ControlButton>
    </div>
  );
}

function ControlButton({ label, onClick, big, children }: { label: string; onClick: () => void; big?: boolean; children: React.ReactNode }) {
  return (
    <motion.button
      aria-label={label}
      title={label}
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.85 }}
      transition={spring.pop}
      className={`flex items-center justify-center rounded-full ${big ? "h-9 w-9 bg-white text-black shadow-[0_0_18px_-4px_rgba(255,255,255,0.6)]" : "h-8 w-8 text-label-2 hover:text-label"}`}
    >
      {children}
    </motion.button>
  );
}
