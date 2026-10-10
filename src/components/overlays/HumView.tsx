import { useEffect, useRef, type RefObject } from "react";
import { motion } from "motion/react";
import { Music2, X } from "lucide-react";
import { EVENTS, inTauri, openPath, subscribe } from "../../lib/bridge";
import { spotifyUrl, youtubeUrl, type HumTrack } from "../../lib/hum";
import { toggleHum } from "../../hooks/useHum";
import { spring } from "../../lib/motion";
import { useNook } from "../../store/nook";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

/** Hum'un rengi: pembe → mor → camgöbeği */
export const HUM_COLORS = ["#ff5c8a", "#9b7bff", "#2fd4c0"];

/** Rust'tan ~30 kez/sn gelen ses bantları (0–1, bas → tiz). React'i yeniden çizdirmez. */
const levels = { cur: new Array<number>(24).fill(0) };
let subscribers = 0;
let off: (() => void) | null = null;
function useLevels() {
  useEffect(() => {
    if (subscribers++ === 0) off = inTauri ? subscribe<number[]>(EVENTS.humLevel, (l) => void (levels.cur = l)) : fakeLevels();
    return () => {
      if (--subscribers === 0) {
        off?.();
        off = null;
        levels.cur = levels.cur.map(() => 0);
      }
    };
  }, []);
  return levels;
}

/** Tarayıcı önizlemesi: ritimli yapay bantlar */
function fakeLevels() {
  const t = window.setInterval(() => {
    const s = performance.now() / 1000;
    const beat = Math.pow(Math.max(0, Math.sin(s * Math.PI * 2 * 2)), 6);
    levels.cur = levels.cur.map((_, i) => Math.min(1, Math.max(0, 0.75 - i * 0.022 + beat * (i < 6 ? 0.25 : 0.1) + Math.sin(s * 3 + i * 0.7) * 0.12 - Math.random() * 0.08)));
  }, 33);
  return () => window.clearInterval(t);
}

/** Ada Hum'dayken: dinliyorum / bulunan şarkı / bulunamadı. Nook solda (DJ kulaklığıyla). */
export function HumView() {
  const hum = useNook((s) => s.hum);
  if (!hum) return null;
  return (
    <motion.div
      className="absolute inset-y-0 left-[100px] right-3 flex items-center gap-3"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0, transition: { delay: 0.08, duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      {hum.phase === "listening" ? (
        <Listening />
      ) : hum.phase === "found" && hum.track ? (
        <Found track={hum.track} />
      ) : (
        <Miss phase={hum.phase} message={hum.message} />
      )}
    </motion.div>
  );
}

function Listening() {
  return (
    <>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-display text-[17px] font-medium leading-none" style={{ color: tintText(ACCENT.pink) }}>
          {tt("Dinliyorum")}
          <span className="flex gap-[2px] pt-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block h-[3px] w-[3px] rounded-full"
                style={{ background: "currentColor" }}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
              />
            ))}
          </span>
        </p>
        <p className="mt-1.5 truncate text-[11px] text-label-3">{tt("Çalan şarkıyı arıyorum")}</p>
      </div>
      <Spectrum />
      <CloseButton onClick={() => void toggleHum()} label={tt("Vazgeç")} />
    </>
  );
}

/** Dinlerken sağda zıplayan ses çubukları (Rust'tan gelen bantlar) */
function Spectrum() {
  const lv = useLevels();
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const l = lv.cur;
      bars.current.forEach((el, i) => {
        if (!el) return;
        // 24 bandı 12 çubuğa indir
        const v = Math.max(l[i * 2] ?? 0, l[i * 2 + 1] ?? 0);
        el.style.transform = `scaleY(${(0.12 + v * 0.88).toFixed(3)})`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lv]);
  return (
    <div className="flex h-8 shrink-0 items-center gap-[2.5px]">
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          ref={(el) => void (bars.current[i] = el)}
          className="block h-full w-[3px] origin-center rounded-full"
          style={{ background: `linear-gradient(180deg, ${HUM_COLORS[0]}, ${HUM_COLORS[1]} 55%, ${HUM_COLORS[2]})`, transform: "scaleY(0.12)", transition: "transform 60ms linear" }}
        />
      ))}
    </div>
  );
}

function Found({ track }: { track: HumTrack }) {
  const sub = [track.album, track.released].filter(Boolean).join(" · ");
  return (
    <>
      <motion.div
        className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[14px] bg-well"
        initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={spring.pop}
        style={{ boxShadow: `0 6px 18px -6px ${HUM_COLORS[1]}` }}
      >
        {track.cover ? (
          <img src={track.cover} alt="" draggable={false} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-label-3">
            <Music2 size={22} />
          </span>
        )}
      </motion.div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold leading-tight text-label">{track.title}</p>
        <p className="mt-0.5 truncate text-[12px] leading-tight" style={{ color: tintText(ACCENT.pink) }}>
          {track.artist}
        </p>
        {sub && <p className="mt-0.5 truncate text-[10.5px] leading-tight text-label-3">{sub}</p>}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <LinkButton label="Spotify" color={ACCENT.green} onClick={() => void openPath(spotifyUrl(track))} />
        <LinkButton label="YouTube" color={ACCENT.red} onClick={() => void openPath(youtubeUrl(track))} />
      </div>
      <CloseButton onClick={() => useNook.getState().setHum(null)} label={tt("Kapat")} />
    </>
  );
}

function Miss({ phase, message }: { phase: string; message?: string }) {
  const [title, hint] =
    phase === "silent"
      ? [tt("Ses gelmiyor"), tt("Bilgisayarda bir şey çalıyor mu?")]
      : phase === "noDevice"
        ? [tt("Sesi dinleyemiyorum"), tt("Hoparlör ya da kulaklık bağlı mı?")]
        : phase === "error"
          ? [tt("Bağlanamadım"), humErrorHint(message)]
          : [tt("Bulamadım"), tt("Nakaratta tekrar dene")];
  return (
    <>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[16px] font-medium leading-none text-label">{title}</p>
        <p className="mt-1.5 truncate text-[11px] text-label-3">{hint}</p>
      </div>
      <motion.button
        whileTap={{ scale: 0.92 }}
        transition={spring.pop}
        onClick={() => void toggleHum()}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium"
        style={{ background: tintBg(ACCENT.pink, 16), borderColor: tintBg(ACCENT.pink, 40), color: tintText(ACCENT.pink) }}
      >
        <Music2 size={12} strokeWidth={2.5} />
        {tt("Tekrar dene")}
      </motion.button>
      <CloseButton onClick={() => useNook.getState().setHum(null)} label={tt("Kapat")} />
    </>
  );
}

/** Rust'tan gelen ham hata metni yerine ne yapılacağını söyleyen kısa ipucu */
function humErrorHint(message = "") {
  if (/Shazam \d+/.test(message)) return tt("Shazam şu an cevap vermiyor, biraz sonra dene");
  if (/bağlanılamadı|dns|timed out|connection/i.test(message)) return tt("İnternete bağlı mısın?");
  return tt("Biraz sonra tekrar dene");
}

function LinkButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={spring.pop}
      onClick={onClick}
      className="h-[22px] rounded-full border px-2.5 text-[10.5px] font-medium"
      style={{ background: tintBg(color, 12), borderColor: tintBg(color, 34), color: tintText(color) }}
    >
      {label}
    </motion.button>
  );
}

function CloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-well text-label-3 hover:bg-well-hi hover:text-label"
    >
      <X size={12} strokeWidth={2.6} />
    </button>
  );
}

/** Dalganın adadan taşabileceği pay (px) */
const M = 22;

/**
 * Dinlerken adanın kenarı boyunca sese duyarlı dalga: alt ortada baslar, yanlara doğru tizler.
 * Ada bunun önünde durur; dalga yalnızca kenardan dışarı taşan kısmıyla görünür.
 */
export function HumWave({ island, detached }: { island: RefObject<HTMLElement | null>; detached: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const lv = useLevels();

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    let raf = 0;
    const smooth = new Array<number>(24).fill(0);
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      const el = island.current;
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const dpr = window.devicePixelRatio || 1;
      const W = w + M * 2;
      const H = h + M * 2;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        cv.style.width = `${W}px`;
        cv.style.height = `${H}px`;
      }
      lv.cur.forEach((v, i) => (smooth[i] += ((v ?? 0) - smooth[i]) * (v > smooth[i] ? 0.5 : 0.12)));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const r = Math.min(30, h / 2);
      const pts = perimeter(w, h, detached ? r : 0, r, 220);
      const time = t / 1000;
      const path = new Path2D();
      pts.forEach((p, i) => {
        // Alt orta (u = 0.5 civarı) bas, kenarlara doğru tiz: banda simetrik eşle
        const d = Math.min(1, Math.abs(p.u - 0.5) * 2.4);
        const band = Math.min(23, Math.floor(d * 23));
        const a = smooth[band];
        const ripple = Math.sin(p.u * 60 - time * 7) * 0.5 + 0.5;
        const off = 1.5 + a * 13 * (0.75 + ripple * 0.25) + ripple * 1.2;
        const x = M + p.x + p.nx * off;
        const y = M + p.y + p.ny * off;
        if (i === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      });
      path.closePath();

      const g = ctx.createLinearGradient(M, 0, M + w, 0);
      g.addColorStop(0, HUM_COLORS[0]);
      g.addColorStop(0.5, HUM_COLORS[1]);
      g.addColorStop(1, HUM_COLORS[2]);
      ctx.shadowColor = HUM_COLORS[1];
      ctx.shadowBlur = 16;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = g;
      ctx.fill(path);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = g;
      ctx.stroke(path);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [island, detached, lv]);

  return (
    <motion.canvas
      ref={canvas}
      className="pointer-events-none absolute"
      style={{ left: -M, top: -M }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.4 } }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    />
  );
}

type Pt = { x: number; y: number; nx: number; ny: number; u: number };

/**
 * Yuvarlatılmış dikdörtgenin çevresinden eşit aralıklı noktalar ve dışa bakan yönleri.
 * Saat yönünde, sol üstten başlar; `u` çevre boyunca 0–1 konum (0,5 ≈ alt orta).
 */
function perimeter(w: number, h: number, rTop: number, rBot: number, n: number): Pt[] {
  type Seg = { len: number; at: (k: number) => Omit<Pt, "u"> };
  const line = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number): Seg => ({
    len: Math.hypot(x1 - x0, y1 - y0),
    at: (k) => ({ x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, nx, ny }),
  });
  const arc = (cx: number, cy: number, r: number, a0: number): Seg => ({
    len: (Math.PI / 2) * r,
    at: (k) => {
      const a = a0 + (Math.PI / 2) * k;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) };
    },
  });
  const segs: Seg[] = [
    line(rTop, 0, w - rTop, 0, 0, -1),
    arc(w - rTop, rTop, rTop, -Math.PI / 2),
    line(w, rTop, w, h - rBot, 1, 0),
    arc(w - rBot, h - rBot, rBot, 0),
    line(w - rBot, h, rBot, h, 0, 1),
    arc(rBot, h - rBot, rBot, Math.PI / 2),
    line(0, h - rBot, 0, rTop, -1, 0),
    arc(rTop, rTop, rTop, Math.PI),
  ].filter((s) => s.len > 0);
  const total = segs.reduce((a, s) => a + s.len, 0);
  // Alt ortanın çevredeki yeri: u'yu ona göre kaydır ki 0,5 tam alt orta olsun
  const bottomMid = segs.slice(0, 4).reduce((a, s) => a + s.len, 0) + (w - 2 * rBot) / 2;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    let d = (i / n) * total;
    const u = (((d - bottomMid) / total + 0.5) % 1 + 1) % 1;
    for (const s of segs) {
      if (d <= s.len) {
        out.push({ ...s.at(s.len ? d / s.len : 0), u });
        break;
      }
      d -= s.len;
    }
  }
  return out;
}
