import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Music2, Pause, Play, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from "lucide-react";
import { getMedia, mediaAction, mediaArt, type MediaState, type Pairing } from "../lib/pc";
import { errText, TopBar, useBackButton, useToast } from "../ui";

const PINK = "#ff5c8a";

function mmss(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Medya: PC'de çalan (Spotify, YouTube…), oynat/duraklat/geç ve PC'nin ses seviyesi */
export function MediaScreen({ pairing, onBack }: { pairing: Pairing; onBack: () => void }) {
  useBackButton(onBack);
  const [toast, say] = useToast();
  const [state, setState] = useState<MediaState | null>(null);
  const [art, setArt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const fetchedAt = useRef(Date.now());
  const artKey = useRef("");
  // Kaydırıcı sürüklenirken gelen yanıt değeri geri itmesin
  const [dragVol, setDragVol] = useState<number | null>(null);
  const volTimer = useRef(0);

  const refresh = async () => {
    try {
      const s = await getMedia(pairing);
      fetchedAt.current = Date.now();
      setState(s);
      const m = s.media;
      if (m?.hasArt && m.trackKey !== artKey.current) {
        artKey.current = m.trackKey;
        mediaArt(pairing)
          .then((u) =>
            setArt((old) => {
              if (old) URL.revokeObjectURL(old);
              return u;
            }),
          )
          .catch(() => {});
      } else if (!m?.hasArt && m?.trackKey !== artKey.current) {
        artKey.current = m?.trackKey ?? "";
        setArt(null);
      }
    } catch (e) {
      say(errText(e));
    }
  };

  useEffect(() => {
    void refresh();
    const poll = window.setInterval(() => void refresh(), 2000);
    const tick = window.setInterval(() => setNow(Date.now()), 500);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairing]);

  const act = async (body: Parameters<typeof mediaAction>[1]) => {
    try {
      await mediaAction(pairing, body);
      window.setTimeout(() => void refresh(), 350);
    } catch (e) {
      say(errText(e));
    }
  };

  const m = state?.media;
  const pos = m ? Math.min(m.durationMs || Infinity, m.positionMs + (m.playing ? now - fetchedAt.current : 0)) : 0;
  const vol = dragVol ?? state?.volume ?? null;
  const VolIcon = state?.muted || vol === 0 ? VolumeX : (vol ?? 0) < 0.5 ? Volume1 : Volume2;

  const setVolume = (v: number) => {
    setDragVol(v);
    window.clearTimeout(volTimer.current);
    // Sürüklerken her adımda değil, kısa aralıklarla gönder
    volTimer.current = window.setTimeout(() => {
      void mediaAction(pairing, { volume: v })
        .catch((e) => say(errText(e)))
        .finally(() => window.setTimeout(() => setDragVol(null), 600));
    }, 120);
  };

  return (
    <div className="safe flex min-h-screen flex-col gap-5 px-4">
      <TopBar title="Medya" nook="media" onBack={() => history.back()} />

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="relative aspect-square w-full max-w-[320px] overflow-hidden rounded-[32px] bg-card shadow-2xl">
          {art ? (
            <img src={art} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-label-3">
              <Music2 size={64} strokeWidth={1.4} />
            </div>
          )}
        </div>

        <div className="w-full max-w-[340px] text-center">
          <p className="truncate font-round text-[22px] font-extrabold">{m?.title || "Çalan bir şey yok"}</p>
          <p className="mt-1 truncate text-[14.5px] text-label-2">{m ? [m.artist, m.app].filter(Boolean).join(" · ") : "PC'de Spotify, YouTube ya da başka bir şey çalınca burada görünür."}</p>
        </div>

        {m && m.durationMs > 0 && (
          <div className="w-full max-w-[340px]">
            <div className="h-1.5 overflow-hidden rounded-full bg-well">
              <div className="h-full rounded-full" style={{ width: `${(pos / m.durationMs) * 100}%`, background: PINK }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[11.5px] tabular-nums text-label-3">
              <span>{mmss(pos)}</span>
              <span>{mmss(m.durationMs)}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-6">
          <motion.button whileTap={{ scale: 0.88 }} disabled={!m} onClick={() => void act({ action: "prev" })} className="flex h-14 w-14 items-center justify-center rounded-full bg-card disabled:opacity-40">
            <SkipBack size={24} fill="currentColor" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            disabled={!m}
            onClick={() => void act({ action: "toggle" })}
            className="flex h-20 w-20 items-center justify-center rounded-full text-black disabled:opacity-40"
            style={{ background: PINK, boxShadow: `0 0 30px -6px ${PINK}` }}
          >
            {m?.playing ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
          </motion.button>
          <motion.button whileTap={{ scale: 0.88 }} disabled={!m} onClick={() => void act({ action: "next" })} className="flex h-14 w-14 items-center justify-center rounded-full bg-card disabled:opacity-40">
            <SkipForward size={24} fill="currentColor" />
          </motion.button>
        </div>
      </div>

      {vol !== null && (
        <div className="mb-2 flex items-center gap-3 rounded-3xl bg-card px-4 py-3.5">
          <button onClick={() => void act({ muted: !state?.muted })} className="text-label-2">
            <VolIcon size={22} />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(vol * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="h-2 flex-1 accent-[#ff5c8a]"
          />
          <span className="w-9 text-right text-[13px] tabular-nums text-label-2">%{Math.round(vol * 100)}</span>
        </div>
      )}
      {toast}
    </div>
  );
}
