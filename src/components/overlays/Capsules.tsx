/**
 * Kapalı adanın hâlleri (0.3): ada bir iş varken o işin kapsülüne dönüşür.
 *  - Müzik: dönen plak (kapak), ritim tutan Nook, şarkı adı, dalga
 *  - Odak: Nook, "Derin odak" ve kalın süre, yüzde
 *  - Claude Code: çalışan oturum ve yaptığı iş
 *  - Uyku: Nook uyurken yanında süzülen "z"ler
 *  - Bilgi: boştayken saat ve hava (Studio › Ada'dan kapatılır)
 * İki iş aynı anda sürüyorsa ada bölünür: ikinci iş yanda küçük bir baloncukta (üstüne gelince o bölüm açılır).
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useAnimationFrame } from "motion/react";
import { ArrowDown, CalendarClock, Coffee, Mic, Moon, Pause, Sun, Target, Terminal, Timer } from "lucide-react";
import { useClaude, CLAUDE_COLOR } from "../../lib/claude";
import { mmss, remaining } from "../../lib/focus";
import { swElapsed } from "../../lib/stopwatch";
import { isLive, isSleeping, useNook, type CapsuleCfg, type FocusState, type NowPlaying, type Tab } from "../../store/nook";
import { setHitExtra } from "../../hooks/useHitRect";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { useEventSoon } from "./TimeMini";
import { locale, pct, tt } from "../../lib/i18n";
import { useUpdate } from "../../lib/update";
import { resolveUpdateAnim, UpdateBody } from "./UpdateAnims";

export type CapsuleKind = "update" | "listen" | "download" | "focus" | "claude" | "event" | "watch" | "music" | "fish" | "camp" | "sleep" | "info";

export interface Capsule {
  kind: CapsuleKind;
  width: number;
  height: number;
  /** Nook'un kapsüldeki yeri (merkez x) ve ölçeği; null = Nook kapsülün kendi çizdiğinde (balık, kamp) */
  nook: { x: number; scale: number } | null;
  /** İkinci iş: yandaki baloncuk */
  second: CapsuleKind | null;
}

const SHAPE: Record<CapsuleKind, Omit<Capsule, "kind" | "second">> = {
  update: { width: 300, height: 40, nook: { x: 26, scale: 1.1 } },
  listen: { width: 200, height: 34, nook: { x: 100, scale: 1 } },
  download: { width: 200, height: 34, nook: { x: 100, scale: 1 } },
  event: { width: 200, height: 34, nook: { x: 100, scale: 1 } },
  watch: { width: 200, height: 34, nook: { x: 100, scale: 1 } },
  music: { width: 276, height: 40, nook: { x: 58, scale: 1.08 } },
  focus: { width: 244, height: 40, nook: { x: 30, scale: 1.05 } },
  claude: { width: 256, height: 40, nook: { x: 26, scale: 1.12 } },
  fish: { width: 184, height: 34, nook: null },
  camp: { width: 236, height: 40, nook: null },
  sleep: { width: 150, height: 34, nook: { x: 46, scale: 1 } },
  info: { width: 188, height: 34, nook: { x: 22, scale: 0.95 } },
};

/** Baloncuktan açılınca gidilecek bölüm */
export const TAB_OF: Partial<Record<CapsuleKind, Tab>> = { focus: "focus", claude: "claude", music: "media", watch: "focus", event: "calendar", download: "shelf" };

/** Kapalı adada şu an ne gösterilecek (ve yanda baloncuk var mı) */
export function useCapsule(collapsed: boolean): Capsule | null {
  const updating = useUpdate((u) => u.progress !== null);
  const listening = useNook((s) => s.listening);
  const downloading = useNook((s) => s.downloads.length > 0);
  const focusing = useNook((s) => !!s.focus);
  const timing = useNook((s) => !!s.stopwatch);
  const playing = useNook((s) => !!s.media?.playing);
  const outing = useNook((s) => s.outing);
  const asleep = useNook(isSleeping);
  const cfg = useNook((s) => s.settings.capsule);
  const info = useNook((s) => (s.settings.collapsedInfo ?? true) && (s.settings.capsule.infoClock || s.settings.capsule.infoWeather || s.settings.capsule.infoDate));
  const claudeWorking = useClaude((s) => Object.values(s.sessions).some((x) => x.state === "working"));
  const eventSoon = useEventSoon();
  if (!collapsed) return null;
  // Güncelleme her şeyin önünde, kapatılamaz: Nook birazdan kapanıp yeni sürümle açılacak
  if (updating) return { kind: "update", ...SHAPE.update, second: null };

  // Önem sırasıyla; ilk ikisi kapsül ve baloncuk olur. Studio'da kapatılan kapsüller atlanır.
  const on = (k: CapsuleKind) => !cfg.off.includes(k);
  const active: CapsuleKind[] = [];
  if (listening) active.push("listen");
  if (downloading) active.push("download");
  if (focusing) active.push("focus");
  if (claudeWorking) active.push("claude");
  if (eventSoon.soon && eventSoon.urgent) active.push("event");
  if (timing) active.push("watch");
  if (playing) active.push("music");
  if (eventSoon.soon && !eventSoon.urgent) active.push("event");
  const shown = active.filter(on);
  const first = outing === "fish" ? "fish" : outing === "camp" ? "camp" : shown[0] ?? (asleep && on("sleep") ? "sleep" : info && !outing ? "info" : null);
  if (!first) return null;
  const second = !cfg.split || first === "fish" || first === "camp" ? null : (shown.find((k) => k !== first) ?? null);
  return { kind: first, ...capsuleShape(first, cfg), second };
}

/** Kapsülün boyu ve Nook'un yeri; içinden kapatılan parçalar (kapak, dalga, tarih…) yer kaplamasın */
export function capsuleShape(kind: CapsuleKind, cfg: CapsuleCfg): Omit<Capsule, "kind" | "second"> {
  const base = SHAPE[kind];
  if (kind === "music") {
    // Ne şarkı adı ne sanatçı: yazının yeri de kalkar, plak + Nook + dalga kalır
    const text = cfg.musicTitle || cfg.musicArtist;
    const width = base.width - (cfg.musicCover ? 0 : 34) - (cfg.musicWave ? 0 : 26) - (text ? 0 : 146);
    return { ...base, width, nook: { x: cfg.musicCover ? 58 : 24, scale: base.nook!.scale } };
  }
  if (kind === "info") return { ...base, width: base.width + (cfg.infoDate ? 54 : 0) + (cfg.infoSeconds && cfg.infoClock ? 18 : 0) };
  if (kind === "focus") return { ...base, width: base.width - (cfg.focusPercent ? 0 : 40) };
  return base;
}

const appear = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { delay: 0.12, duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.08 } },
};

/** Müzik kapsülü: solda dönen plak (kapak), Nook, şarkı adı ve sanatçı, sağda dalga */
export function MusicCapsule({ media }: { media: NowPlaying }) {
  const live = useNook(isLive);
  const cfg = useNook((s) => s.settings.capsule);
  // Şarkı adı kapalıysa sanatçı üst satıra çıkar
  const main = live ? tt("Müzik çalıyor") : cfg.musicTitle ? media.title : cfg.musicArtist ? media.artist : null;
  const sub = !live && cfg.musicTitle && cfg.musicArtist ? media.artist : null;
  return (
    <motion.div className="pointer-events-none absolute inset-0" {...appear}>
      {cfg.musicCover && (
      <motion.div
        className="absolute left-[7px] top-1/2 h-[28px] w-[28px] -translate-y-1/2 overflow-hidden rounded-full"
        style={{ boxShadow: `0 0 10px -2px ${ACCENT.pink}` }}
        animate={{ rotate: media.playing ? 360 : 0 }}
        transition={media.playing ? { duration: 5, repeat: Infinity, ease: "linear" } : { duration: 0.4 }}
      >
        {media.artwork ? (
          <img src={media.artwork} alt="" draggable={false} className="h-full w-full object-cover" />
        ) : (
          <span className="block h-full w-full" style={{ background: `conic-gradient(${ACCENT.pink}, ${ACCENT.purple}, ${ACCENT.pink})` }} />
        )}
        {/* Plağın ortası */}
        <span className="absolute left-1/2 top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black ring-1 ring-white/30" />
      </motion.div>
      )}
      {main !== null && (
        <div className="absolute top-1/2 -translate-y-1/2 leading-tight" style={{ left: cfg.musicCover ? 82 : 48, right: cfg.musicWave ? 40 : 14 }}>
          <p className="truncate text-[11.5px] font-bold text-label">{main}</p>
          {sub && (
            <p className="truncate text-[9.5px]" style={{ color: tintText(ACCENT.pink) }}>
              {sub}
            </p>
          )}
        </div>
      )}
      {cfg.musicWave && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Wave playing={media.playing} media={media} />
        </div>
      )}
    </motion.div>
  );
}

/** Şarkının ilerlemesiyle birlikte dans eden dört renkli nokta */
function Wave({ playing, media }: { playing: boolean; media: NowPlaying }) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const latest = useRef(media);
  latest.current = media;
  useAnimationFrame((t) => {
    bars.current.forEach((el, i) => {
      if (!el) return;
      const h = playing ? 4 + (Math.sin(t / (170 + i * 37) + i * 1.7) * 0.5 + 0.5) * 11 : 4;
      el.style.height = `${h}px`;
    });
  });
  const colors = [ACCENT.pink, ACCENT.purple, ACCENT.blue, ACCENT.teal];
  return (
    <span className="flex h-4 items-center gap-[2.5px]">
      {colors.map((c, i) => (
        <span key={i} ref={(el) => void (bars.current[i] = el)} className="w-[3px] rounded-full" style={{ height: 4, background: c }} />
      ))}
    </span>
  );
}

/** Odak kapsülü: "Derin odak" ve kalın süre, sağda yüzde rozeti. `demo`: Studio önizlemesindeki örnek */
export function FocusCapsule({ demo }: { demo?: FocusState }) {
  const live = useNook((s) => s.focus);
  const focus = demo ?? live;
  const cfg = useNook((s) => s.settings.capsule);
  const now = useNow(500);
  if (!focus) return null;
  const work = focus.phase === "work";
  const paused = focus.endsAt === null;
  const color = work ? ACCENT.red : ACCENT.teal;
  const left = remaining(focus, now);
  const p = Math.round((1 - left / focus.total) * 100);
  const Icon = paused ? Pause : work ? Target : Coffee;
  return (
    <motion.div className="pointer-events-none absolute inset-0" {...appear}>
      <div className="absolute left-[64px] top-1/2 -translate-y-1/2 leading-none">
        <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: tintText(color) }}>
          <Icon size={8} strokeWidth={3} />
          {paused ? tt("Duraklatıldı") : work ? tt("Derin odak") : tt("Mola")}
        </p>
        <motion.p
          className="mt-[3px] font-round text-[15px] font-extrabold tabular-nums text-label"
          animate={{ opacity: paused ? [1, 0.4, 1] : 1 }}
          transition={paused ? { duration: 1.4, repeat: Infinity } : { duration: 0.2 }}
        >
          {mmss(left)}
        </motion.p>
      </div>
      {cfg.focusPercent && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full px-2 py-[2px] text-[10px] font-bold tabular-nums" style={{ background: tintBg(color, 20), color: tintText(color) }}>
          {pct(p)}
        </span>
      )}
      {/* Altta ince ilerleme */}
      {cfg.focusBar && (
        <span className="absolute bottom-[3px] left-[64px] h-[2px] overflow-hidden rounded-full bg-white/[0.08]" style={{ right: cfg.focusPercent ? 52 : 14 }}>
          <span className="block h-full rounded-full" style={{ width: `${p}%`, background: color }} />
        </span>
      )}
    </motion.div>
  );
}

/** Claude Code kapsülü: çalışan oturumun projesi ve şu an yaptığı. `demo`: Studio önizlemesindeki örnek */
export function ClaudeCapsule({ demo }: { demo?: { project: string; action: string } }) {
  const live = useNook(isLive);
  const showAction = useNook((s) => s.settings.capsule.claudeAction);
  const working = useClaude((s) => Object.values(s.sessions).filter((x) => x.state === "working").sort((a, b) => b.updatedAt - a.updatedAt)[0]);
  const session = demo ?? working;
  if (!session) return null;
  return (
    <motion.div className="pointer-events-none absolute inset-0" {...appear}>
      <div className="absolute left-[50px] right-[36px] top-1/2 -translate-y-1/2 leading-tight">
        <p className="truncate text-[11.5px] font-bold" style={{ color: tintText(CLAUDE_COLOR) }}>
          {tt("{0} çalışıyor", "Claude")}
          <span className="ml-1 font-medium text-label-3">{session.project}</span>
        </p>
        {showAction && <p className="truncate text-[9.5px] text-label-2">{live ? tt("Gizli") : session.action}</p>}
      </div>
      <motion.span
        className="absolute right-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-full border-2"
        style={{ borderColor: tintBg(CLAUDE_COLOR, 30), borderTopColor: CLAUDE_COLOR }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}

/**
 * Güncelleme: kapsülde seçili animasyon (Ayarlar › Animasyonlar: biri, sırayla ya da karışık) indirmeyi
 * gösterir, bitince kendi "bitti" anını oynar. Sonra Nook kapanıp yeni sürümle geri gelir.
 */
export function UpdateCapsule() {
  const progress = useUpdate((u) => u.progress ?? 0);
  const restarting = useUpdate((u) => u.restarting);
  const demo = useUpdate((u) => u.demo);
  const version = useUpdate((u) => (u.demo ? u.current || null : u.available));
  // Bu güncelleme boyunca aynı animasyon (sırayla seçilen bir kez ilerlesin)
  const [anim] = useState(() => demo ?? resolveUpdateAnim(useNook.getState().settings.updateAnim));
  return (
    <motion.div className="pointer-events-none absolute inset-0" {...appear}>
      <UpdateBody anim={anim} p={progress} done={restarting} version={version} />
    </motion.div>
  );
}

/** Uyku: Nook'un yanında yukarı süzülen "z"ler */
export function SleepCapsule() {
  return (
    <motion.div className="pointer-events-none absolute inset-0" {...appear}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute font-round font-extrabold"
          style={{ left: 74 + i * 14, top: 14, fontSize: 9 + i * 2.5, color: tintText(ACCENT.purple) }}
          animate={{ y: [4, -6, -10], opacity: [0, 1, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
        >
          z
        </motion.span>
      ))}
      <Moon size={11} strokeWidth={2.4} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: tintText(ACCENT.purple) }} />
    </motion.div>
  );
}

/** Balık tutarken adanın solunda: ne yaptığı ve bugüne kadar tuttuğu yıldızlar */
export function FishCapsule() {
  const stars = useNook((s) => s.catches.stars);
  return (
    <motion.div className="pointer-events-none absolute inset-0" {...appear}>
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 leading-tight">
        <p className="text-[10.5px] font-bold text-label">{tt("Olta masaüstünde")}</p>
        <p className="text-[9px] font-semibold" style={{ color: tintText(ACCENT.yellow) }}>
          ★ {stars}
        </p>
      </div>
    </motion.div>
  );
}

/** Boştayken: saat (kalın) ve hava */
export function InfoCapsule() {
  const cfg = useNook((s) => s.settings.capsule);
  const seconds = cfg.infoClock && cfg.infoSeconds;
  const now = useNow(seconds ? 1000 : 10_000);
  const weather = useNook((s) => s.weather);
  const night = now.valueOf() && (new Date(now).getHours() >= 20 || new Date(now).getHours() < 6);
  return (
    <motion.div className="pointer-events-none absolute inset-0" {...appear}>
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-baseline gap-2 tabular-nums">
        {cfg.infoDate && (
          <span className="text-[10.5px] font-semibold text-label-2">{new Date(now).toLocaleDateString(locale(), { day: "numeric", month: "short", weekday: "short" })}</span>
        )}
        {cfg.infoWeather && weather && (
          <span className="flex items-center gap-1 text-[10.5px] font-semibold text-label-2">
            {night ? <Moon size={10} strokeWidth={2.6} /> : <Sun size={10} strokeWidth={2.6} />}
            {weather.temp}°
          </span>
        )}
        {cfg.infoClock && (
          <span className="text-[13px] font-extrabold tracking-tight text-label">
            {new Date(now).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}) })}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function useNow(ms: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

/**
 * Bölünmüş ada: ikinci iş adanın sağında küçük bir baloncuk. Üstüne gelince ada o işin bölümüyle açılır.
 * Baloncuk adanın dokunma alanına eklenir (yoksa tıklama arkadaki pencereye geçerdi).
 */
export function SplitBubble({ kind, height, islandWidth, detached }: { kind: CapsuleKind; height: number; islandWidth: number; detached: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const size = height;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Pencereye göre yer (baloncuk adanın sağında, aynı hizada)
    const push = () => {
      const r = el.getBoundingClientRect();
      setHitExtra("bubble", { x: r.left - 4, y: r.top - 4, width: r.width + 8, height: r.height + 8 });
    };
    const t = window.setTimeout(push, 450);
    return () => {
      window.clearTimeout(t);
      setHitExtra("bubble", null);
    };
  }, [islandWidth, size]);
  return (
    <motion.div
      ref={ref}
      className="pointer-events-auto absolute top-0 flex items-center justify-center overflow-hidden bg-black"
      style={{ left: `calc(50% + ${islandWidth / 2 + 8}px)`, width: size, height: size, borderRadius: detached ? size / 2 : `0 0 ${size / 2}px ${size / 2}px` }}
      initial={{ opacity: 0, scale: 0.3, x: -24 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.3, x: -24 }}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
      onPointerEnter={() => {
        if (!useNook.getState().settings.capsule.bubbleOpens) return;
        const tab = TAB_OF[kind];
        if (tab) useNook.getState().setPendingTab(tab);
      }}
    >
      <BubbleBody kind={kind} size={size} />
    </motion.div>
  );
}

function BubbleBody({ kind, size }: { kind: CapsuleKind; size: number }) {
  const media = useNook((s) => s.media);
  const focus = useNook((s) => s.focus);
  const sw = useNook((s) => s.stopwatch);
  const now = useNow(500);
  const ring = (p: number, color: string, icon: React.ReactNode) => {
    const r = size / 2 - 5;
    const c = 2 * Math.PI * r;
    return (
      <span className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="2.4" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, p)))} />
        </svg>
        <span style={{ color }}>{icon}</span>
      </span>
    );
  };
  switch (kind) {
    case "music":
      return media ? (
        <motion.span
          className="block overflow-hidden rounded-full"
          style={{ width: size - 12, height: size - 12 }}
          animate={{ rotate: media.playing ? 360 : 0 }}
          transition={media.playing ? { duration: 5, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
        >
          {media.artwork ? <img src={media.artwork} alt="" draggable={false} className="h-full w-full object-cover" /> : <MiniNook color={ACCENT.pink} size={size - 12} eyes="happy" />}
        </motion.span>
      ) : null;
    case "focus":
      return focus ? ring(1 - remaining(focus, now) / focus.total, focus.phase === "work" ? ACCENT.red : ACCENT.teal, focus.phase === "work" ? <Target size={11} strokeWidth={3} /> : <Coffee size={11} strokeWidth={3} />) : null;
    case "claude":
      return (
        <span className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          <motion.span
            className="absolute rounded-full border-2"
            style={{ inset: 5, borderColor: tintBg(CLAUDE_COLOR, 25), borderTopColor: CLAUDE_COLOR }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          />
          <Terminal size={11} strokeWidth={2.8} style={{ color: tintText(CLAUDE_COLOR) }} />
        </span>
      );
    case "watch":
      return ring((swElapsed(sw, now) % 60_000) / 60_000, ACCENT.purple, <Timer size={11} strokeWidth={3} />);
    case "download":
      return ring(0.6, ACCENT.blue, <ArrowDown size={11} strokeWidth={3} />);
    case "event":
      return ring(0.5, ACCENT.yellow, <CalendarClock size={11} strokeWidth={2.8} />);
    case "listen":
      return ring(1, ACCENT.orange, <Mic size={11} strokeWidth={3} />);
    default:
      return null;
  }
}
