import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationFrame } from "motion/react";
import { MicVocal, RotateCcw } from "lucide-react";
import { lineAt, lyricOffset, shiftLyrics, useLyrics } from "../../lib/lyrics";
import { mediaControl, type MediaAction } from "../../lib/bridge";
import { appName, formatTime, livePosition } from "../../lib/media";
import { spring } from "../../lib/motion";
import { useNook, type NowPlaying } from "../../store/nook";
import { Equalizer } from "../media/Equalizer";
import { NextGlyph, PauseGlyph, PlayGlyph, PrevGlyph } from "../ui/glyphs";
import { ACCENT, EmptyState, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

export function MediaPanel() {
  const media = useNook((s) => s.media);
  const lyricsOn = useNook((s) => s.settings.lyrics);
  if (!media) return <EmptyState title={tt("Sessizlik")} hint={tt("Spotify, YouTube ya da başka bir oynatıcı başlat")} color={ACCENT.pink} />;
  if (lyricsOn) return <LyricsLayout media={media} />;

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
          <LyricsToggle on={false} />
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

/** Sözler açık/kapalı (ilk açılışta lrclib'e gidileceği söylenir) */
function LyricsToggle({ on }: { on: boolean }) {
  return (
    <button
      onClick={() => useNook.getState().updateSettings({ lyrics: !on })}
      title={on ? tt("Sözleri kapat") : tt("Şarkı sözlerini göster (lrclib.net'ten; şarkı adı ve sanatçı oraya gönderilir)")}
      className="ml-auto flex items-center gap-1 rounded-full border px-2 py-[2px] text-[10px] font-medium"
      style={on ? { background: tintBg(ACCENT.pink, 18), borderColor: tintBg(ACCENT.pink, 45), color: tintText(ACCENT.pink) } : { background: "rgb(255 255 255 / 0.04)", borderColor: "rgb(255 255 255 / 0.08)", color: "var(--color-label-2)" }}
    >
      <MicVocal size={10} strokeWidth={2.4} />
      {tt("Sözler")}
    </button>
  );
}

/** Sözler açıkken: üstte küçük kapak ve ad, ortada akan sözler, altta ilerleme ve kontroller */
function LyricsLayout({ media }: { media: NowPlaying }) {
  return (
    <div className="flex h-full flex-col gap-1.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="h-[40px] w-[40px] shrink-0 overflow-hidden rounded-[10px] bg-well">
          {media.artwork ? <img src={media.artwork} alt="" draggable={false} className="h-full w-full object-cover" /> : <MiniNook color={ACCENT.pink} size={24} eyes="happy" />}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-display text-[13px] font-medium text-label" title={media.title}>{media.title}</p>
          <p className="truncate text-[11px] text-label-2">{media.artist || appName(media.app)}</p>
        </div>
        <LyricsToggle on />
      </div>
      <LyricsView media={media} />
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">{media.durationMs > 0 && <Progress media={media} />}</div>
        <Controls playing={media.playing} />
      </div>
    </div>
  );
}

/** Zaman damgalı sözler: şu anki satır ortada ve parlak; kayma düğmeleri sağ altta */
function LyricsView({ media }: { media: NowPlaying }) {
  const { lyrics, loading, key, retry } = useLyrics();
  const box = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(-1);
  const latest = useRef(media);
  latest.current = media;
  const lines = lyrics?.kind === "synced" ? lyrics.lines : null;

  useEffect(() => {
    if (!lines) return;
    const tick = () => setIdx(lineAt(lines, livePosition(latest.current) + lyricOffset(key)));
    tick();
    const t = window.setInterval(tick, 150);
    return () => window.clearInterval(t);
  }, [lines, key]);

  // Şu anki satırı kutunun ortasına kaydır (ilk konum anında, sonrası yumuşak)
  const placed = useRef(false);
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>(`[data-l="${idx}"]`);
    const b = box.current;
    if (!el || !b) return;
    // offsetTop/clientHeight: panel CSS zoom'la ölçeklendiğinden getBoundingClientRect ile karıştırılmaz
    const top = el.offsetTop - b.clientHeight / 2 + el.offsetHeight / 2;
    b.scrollTo({ top, behavior: placed.current ? "smooth" : "auto" });
    placed.current = true;
  }, [idx]);

  const msg = (text: string, action?: React.ReactNode) => (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-[14px] bg-well text-[11.5px] text-label-3">
      {text}
      {action}
    </div>
  );
  if (loading && !lyrics) return msg(tt("Sözler aranıyor…"));
  if (!lyrics || lyrics.kind === "none")
    return msg(
      tt("Bu şarkının sözü bulunamadı"),
      <button onClick={retry} className="rounded-full bg-white/[0.06] px-2.5 py-[2px] text-[10.5px] text-label-2 hover:text-label">
        {tt("Yeniden dene")}
      </button>,
    );
  if (lyrics.kind === "instrumental") return msg(tt("Enstrümantal ♪"));
  if (lyrics.kind === "plain")
    return (
      <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-line rounded-[14px] bg-well px-3 py-2 text-[12px] leading-relaxed text-label-2" title={tt("Bu şarkının sözlerinde zamanlama yok")}>
        {lyrics.text}
      </div>
    );

  const off = lyricOffset(key);
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-[14px] bg-well">
      <div ref={box} className="no-scrollbar relative h-full overflow-y-auto px-3" style={{ maskImage: "linear-gradient(transparent, black 30%, black 70%, transparent)" }}>
        {/* Boşluk kutunun yüksekliğine göre: yüzde padding genişliğe göre hesaplanıp kutuyu taşırıyordu */}
        <div aria-hidden className="h-1/2" />
        {lines!.map((l, k) => (
          <p
            key={k}
            data-l={k}
            className="origin-left py-[3px] font-display font-semibold leading-snug transition-all duration-300"
            style={{
              fontSize: 14,
              opacity: k === idx ? 1 : Math.abs(k - idx) === 1 ? 0.45 : 0.22,
              transform: `scale(${k === idx ? 1.04 : 0.95})`,
              color: k === idx ? tintText(ACCENT.pink) : "var(--color-label-2)",
              textShadow: k === idx ? `0 0 14px ${tintBg(ACCENT.pink, 60)}` : undefined,
            }}
          >
            {l.text || "♪"}
          </p>
        ))}
        <div aria-hidden className="h-1/2" />
      </div>
      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-black/60 px-1 py-[1px] text-[9.5px] tabular-nums text-label-3">
        <button onClick={() => shiftLyrics(key, -500)} title={tt("Sözler geç kalıyor: geri al")} className="rounded-full px-1 hover:text-label">−0,5</button>
        {off !== 0 && (
          <button onClick={() => shiftLyrics(key, 0)} title={tt("Kaymayı sıfırla")} className="flex items-center gap-0.5 rounded-full px-1 text-label-2 hover:text-label">
            <RotateCcw size={8} strokeWidth={2.6} />
            {(off / 1000).toFixed(1).replace(".", ",")} sn
          </button>
        )}
        <button onClick={() => shiftLyrics(key, 500)} title={tt("Sözler erken akıyor: ileri al")} className="rounded-full px-1 hover:text-label">+0,5</button>
      </div>
      <span className="absolute left-2 top-1 text-[8.5px] text-label-3/70">lrclib.net</span>
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
      <ControlButton label={tt("Önceki")} onClick={() => send("prev")}>
        <PrevGlyph size={18} />
      </ControlButton>
      <ControlButton label={playing ? tt("Duraklat") : tt("Oynat")} onClick={() => send("toggle")} big>
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
      <ControlButton label={tt("Sonraki")} onClick={() => send("next")}>
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
