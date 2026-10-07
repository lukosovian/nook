import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Clock, Droplet, Gamepad2, Heart, Music, Target } from "lucide-react";
import { isPrimary } from "../../lib/bridge";
import { useNookName } from "../../lib/look";
import { spring } from "../../lib/motion";
import { emptyYear, useNook, type YearStats } from "../../store/nook";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

const COLOR = ACCENT.yellow;

/** 125 dk → "2 sa 5 dk"; 5400 dk → "90 saat" */
const hours = (min: number) => (min >= 600 ? tt("{0} saat", Math.round(min / 60)) : min >= 60 ? tt("{0} sa {1} dk", Math.floor(min / 60), min % 60) : tt("{0} dk", min));

/** Peş peşe en çok kaç gün buradaydın */
function longestStreak(days: string[]) {
  const ms = [...new Set(days)].map((d) => new Date(`${d}T12:00:00`).getTime()).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  ms.forEach((t, i) => {
    run = i && Math.round((t - ms[i - 1]) / 86_400_000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

const GAME_NAMES: Record<string, string> = { catch: tt("Yakala"), simon: tt("Hafıza"), whack: tt("Köstebek"), pairs: tt("Eşleştir"), jump: tt("Zıpla"), aim: tt("Nişan") };

interface Slide {
  id: string;
  icon: typeof Clock;
  color: string;
  big: string;
  line: string;
  extra?: React.ReactNode;
}

/**
 * Yıl özeti: "Bu yıl seninle şu kadar saat geçirdik" — birkaç sayfalık kart. Sayfalar arasında
 * oklarla, noktalarla ya da karta tıklayarak geçilir. Kayıt 0.2.42'den itibaren tutulur.
 */
export function YearPanel() {
  const all = useNook((s) => s.year);
  const scores = useNook((s) => s.scores);
  const affection = useNook((s) => s.affection);
  const name = useNookName();
  const userName = useNook((s) => s.settings.userName.trim());
  const years = Object.keys(all).sort();
  const [year, setYear] = useState(() => years[years.length - 1] ?? String(new Date().getFullYear()));
  const y: YearStats = { ...emptyYear(), ...all[year] };
  const [i, setI] = useState(0);

  const slides = useMemo<Slide[]>(() => {
    const streak = longestStreak(y.days);
    const peak = y.hours.indexOf(Math.max(...y.hours));
    const owl = peak >= 22 || peak < 5 ? tt("Tam bir gece kuşusun") : peak < 10 ? tt("Erkenci kuşsun") : peak < 18 ? tt("Gündüz insanısın") : tt("Akşamları açılıyorsun");
    const artists = Object.entries(y.artists).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const best = Object.entries(scores).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const since = [...y.days].sort()[0];
    return [
      {
        id: "time",
        icon: Clock,
        color: COLOR,
        big: hours(y.active),
        line: tt("{0} seninle bu kadar zaman geçirdik", year),
        extra: (
          <p className="text-[11px] text-label-2">
            {tt("{0} gün buradaydın · en uzun seri {1} gün", y.days.length, streak)}
            {since && <span className="block text-[10px] text-label-3">{tt("Kayıt {0} tarihinden beri tutuluyor", new Date(`${since}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" }))}</span>}
          </p>
        ),
      },
      {
        id: "hours",
        icon: Clock,
        color: ACCENT.purple,
        big: y.active ? `${String(peak).padStart(2, "0")}:00` : "—",
        line: y.active ? tt("En çok bu saatte buradaydın · {0}", owl) : tt("Henüz yeterli kayıt yok"),
        extra: <HourChart hours={y.hours} />,
      },
      {
        id: "music",
        icon: Music,
        color: ACCENT.pink,
        big: hours(y.music),
        line: tt("müzik dinledik · {0} şarkı çaldı", y.songs),
        extra: artists.length ? (
          <ol className="space-y-0.5 text-[11px]">
            {artists.map(([a, m], k) => (
              <li key={a} className="flex items-center gap-1.5">
                <span className="w-3 tabular-nums text-label-3">{k + 1}</span>
                <span className="min-w-0 flex-1 truncate text-label">{a}</span>
                <span className="tabular-nums text-label-3">{hours(m)}</span>
              </li>
            ))}
          </ol>
        ) : undefined,
      },
      {
        id: "focus",
        icon: Target,
        color: ACCENT.red,
        big: tt("{0} tur", y.pomodoros),
        line: tt("Pomodoro · toplam {0} odak", hours(y.focus)),
      },
      {
        id: "play",
        icon: Gamepad2,
        color: ACCENT.green,
        big: tt("{0} oyun", y.plays),
        line: y.plays ? tt("bana oyun oynattın · bilgisayar oyunlarında {0}", hours(y.game)) : tt("benimle hiç oynamadın… bilgisayar oyunlarında {0}", hours(y.game)),
        extra: best.length ? (
          <div className="flex flex-wrap gap-1">
            {best.map(([g, v]) => (
              <span key={g} className="rounded-full bg-white/[0.06] px-2 py-[2px] text-[10.5px] text-label-2">
                {GAME_NAMES[g] ?? g} · <span className="font-semibold text-label">{v}</span>
              </span>
            ))}
          </div>
        ) : undefined,
      },
      {
        id: "care",
        icon: Droplet,
        color: ACCENT.blue,
        big: tt("{0} bardak", y.water),
        line: tt("su içtin · bana {0} dosya yedirdin · {1} bildirim geldi", y.feeds, y.notifs),
      },
      {
        id: "end",
        icon: Heart,
        color: ACCENT.pink,
        big: tt("%{0}", Math.round(affection)),
        line: userName ? tt("{0}, seni bu kadar seviyorum. Seneye de birlikte!", userName) : tt("Seni bu kadar seviyorum. Seneye de birlikte!"),
      },
    ];
  }, [y, year, scores, affection, userName]);

  const s = slides[Math.min(i, slides.length - 1)];
  const go = (d: number) => setI((v) => (v + d + slides.length) % slides.length);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-label-3">{tt("{0} ile {1}", name, year)}</span>
        {years.length > 1 && (
          <div className="flex gap-0.5 rounded-full bg-well p-[2px]">
            {years.map((yy) => (
              <button key={yy} onClick={() => (setYear(yy), setI(0))} className="rounded-full px-2 py-[1px] text-[10px] font-medium" style={yy === year ? { background: tintBg(COLOR, 20), color: tintText(COLOR) } : { color: "var(--color-label-3)" }}>
                {yy}
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => go(1)} className="relative min-h-0 flex-1 overflow-hidden rounded-[18px] border text-left" style={{ background: tintBg(s.color, 8), borderColor: tintBg(s.color, 24) }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${year}-${s.id}`}
            className="absolute inset-0 flex gap-3 p-3.5"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: tintBg(s.color, 22), color: s.color }}>
                <s.icon size={14} strokeWidth={2.4} />
              </span>
              <motion.p
                className="mt-2 font-display text-[30px] font-semibold leading-none tracking-tight tabular-nums"
                style={{ color: tintText(s.color) }}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...spring.pop, delay: 0.05 }}
              >
                {s.big}
              </motion.p>
              <p className="mt-1.5 text-[12px] leading-snug text-label">{s.line}</p>
              {s.extra && <div className="mt-auto pt-2">{s.extra}</div>}
            </div>
            {s.id !== "hours" && (
              <div className="flex shrink-0 items-center">
                <MiniNook color={s.color} size={54} eyes={s.id === "end" ? "happy" : "open"} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </button>

      <div className="flex items-center justify-between">
        <button onClick={() => go(-1)} className="flex h-6 w-6 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label" aria-label={tt("Önceki")}>
          <ChevronLeft size={13} strokeWidth={2.6} />
        </button>
        <div className="flex gap-1.5">
          {slides.map((x, k) => (
            <button key={x.id} onClick={() => setI(k)} className="h-1.5 rounded-full transition-all" style={{ width: k === i ? 14 : 6, background: k === i ? x.color : "rgb(255 255 255 / 0.15)" }} aria-label={String(k + 1)} />
          ))}
        </div>
        <button onClick={() => go(1)} className="flex h-6 w-6 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label" aria-label={tt("Sonraki")}>
          <ChevronRight size={13} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}

/** Saat saat bilgisayar başında geçen süre: tek renk ince çubuklar, en yoğun saat etiketli */
function HourChart({ hours: h }: { hours: number[] }) {
  const max = Math.max(1, ...h);
  const peak = h.indexOf(max);
  const W = 24 * 9;
  const H = 54;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 12}`} className="h-[66px] w-full max-w-[300px]" role="img" aria-label={tt("Saatlere göre bilgisayar başında geçen süre")}>
        {h.map((v, k) => {
          const bh = v ? Math.max(3, (v / max) * H) : 0;
          return (
            <g key={k}>
              {/* Üzerine gelme alanı çubuktan büyük */}
              <rect x={k * 9} y={0} width={9} height={H} fill="transparent">
                <title>{`${String(k).padStart(2, "0")}:00 · ${hours(v)}`}</title>
              </rect>
              {bh > 0 && <path d={bar(k * 9 + 1.5, H - bh, 6, bh)} fill={COLOR} opacity={k === peak ? 1 : 0.55} pointerEvents="none" />}
            </g>
          );
        })}
        <line x1={0} x2={W} y1={H + 0.5} y2={H + 0.5} stroke="rgb(255 255 255 / 0.12)" strokeWidth={1} />
        {[0, 6, 12, 18].map((t) => (
          <text key={t} x={t * 9 + 4.5} y={H + 10} textAnchor="middle" fontSize={7} fill="var(--color-label-3)">
            {String(t).padStart(2, "0")}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** Üstü 3 px yuvarlak, tabanı düz çubuk */
function bar(x: number, y: number, w: number, h: number) {
  const r = Math.min(3, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Aralığın son günlerinde yıl özeti bir kez kendiliğinden gelir (adaya gelince açılır) */
export function useYearEnd() {
  useEffect(() => {
    if (!isPrimary) return;
    const check = () => {
      const now = new Date();
      const y = String(now.getFullYear());
      const st = useNook.getState();
      if (now.getMonth() !== 11 || now.getDate() < 28 || st.yearShown === y || (st.year[y]?.active ?? 0) < 600) return;
      st.setYearShown(y);
      st.setPendingTab("year");
      st.pushToast({ kind: "welcome", title: tt("{0} özetin hazır", y), detail: tt("Bu yıl neler yaptık, üstüme gel"), ms: 8000 });
    };
    const first = window.setTimeout(check, 15_000);
    const t = window.setInterval(check, 3600_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, []);
}
