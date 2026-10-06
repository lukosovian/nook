/**
 * Gizlilik kalkanı: ekranı tamamen örten canlı bir "Nook ortamı" (10 sahneden biri, rastgele) ve
 * üstte saat, tarih, hava durumu. Kısayol, Esc ya da çift tıkla kalkar (bkz. src-tauri/src/shield.rs).
 * Parola kilidi açıksa yalnızca parolayla kalkar: bir tuşa basınca ya da tıklayınca parola kutusu çıkar.
 * Kalkan açılırken çalan medya durur; mikrofon açıksa kalkan boyunca kapanır (Rust), rozeti burada.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { listen } from "@tauri-apps/api/event";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Lock, MicOff, Moon, Sun, type LucideIcon } from "lucide-react";
import { inTauri, shieldOff, windowLabel } from "../lib/bridge";
import { checkPassword } from "../lib/lock";
import { micClick } from "../lib/clickSound";
import { SKY_LABEL, type Sky } from "../lib/weather";
import { useNook } from "../store/nook";
import { tt, locale } from "../lib/i18n";
import { Beach, Cafe, Campfire, Disco, Space } from "./shield/scenesA";
import { Library, Mine, Snow, Studio, Zen } from "./shield/scenesB";

/** Sahneler; `bright`: açık renkli sahne (saat kartı biraz daha koyu ki yazı okunsun) */
const SCENES: { id: string; C: () => React.JSX.Element; bright?: boolean }[] = [
  { id: "campfire", C: Campfire },
  { id: "cafe", C: Cafe },
  { id: "disco", C: Disco },
  { id: "space", C: Space },
  { id: "beach", C: Beach, bright: true },
  { id: "library", C: Library },
  { id: "mine", C: Mine },
  { id: "zen", C: Zen, bright: true },
  { id: "studio", C: Studio, bright: true },
  { id: "snow", C: Snow, bright: true },
];

function pickScene() {
  // Geliştirme önizlemesi: ?scene=snow
  const want = new URLSearchParams(location.search).get("scene");
  return SCENES.find((s) => s.id === want) ?? SCENES[Math.floor(Math.random() * SCENES.length)];
}

export function Shield() {
  const locked = useNook((s) => s.settings.lockEnabled && !!s.settings.lockHash);
  // Parola kutusu: açılış kilidinde hemen, sonra bir tuş/tıkla
  const [asking, setAsking] = useState(() => new URLSearchParams(location.search).has("ask"));
  const [scene] = useState(pickScene);

  useEffect(() => {
    document.documentElement.style.background = "#07070c";
    document.body.style.background = "#07070c";
    const key = (e: KeyboardEvent) => {
      if (!locked) {
        if (e.key === "Escape") void shieldOff();
        return;
      }
      setAsking(true);
    };
    window.addEventListener("keydown", key);
    // Kilitliyken kısayola basılınca parola sorulur
    const off = inTauri ? listen("nook://shield-ask", () => setAsking(true)) : null;
    return () => {
      window.removeEventListener("keydown", key);
      void off?.then((f) => f());
    };
  }, [locked]);

  const Scene = scene.C;
  return (
    <div className="fixed inset-0 cursor-default select-none overflow-hidden bg-black" onDoubleClick={() => !locked && void shieldOff()} onPointerDown={() => locked && setAsking(true)}>
      <motion.div className="absolute inset-0" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.3, 1] }}>
        <Scene />
      </motion.div>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center pt-[6vh]">
        <Clock bright={!!scene.bright} />
        <div className="pointer-events-auto mt-5 h-[46px]">
          <AnimatePresence>{locked && asking && <PasswordBox onIdle={() => setAsking(false)} />}</AnimatePresence>
        </div>
      </div>
      <MicBadge />
    </div>
  );
}

const SKY_ICON: Record<Sky, LucideIcon> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

/** Saat, gün/tarih ve hava durumu: buzlu cam üstünde, sade */
function Clock({ bright }: { bright: boolean }) {
  const [now, setNow] = useState(() => new Date());
  const weather = useNook((s) => s.weather);
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  // Üç saatten eski hava bilgisi gösterilmez
  const w = weather && Date.now() - weather.at < 3 * 3600_000 ? weather : null;
  const Icon = w ? (w.sky === "clear" && !w.isDay ? Moon : SKY_ICON[w.sky]) : null;
  return (
    <motion.div
      className="flex flex-col items-center rounded-[32px] px-10 pb-4 pt-3 text-white"
      style={{ background: bright ? "rgba(10,12,24,0.38)" : "rgba(10,12,24,0.22)", backdropFilter: "blur(14px)", boxShadow: "0 20px 50px -20px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.12)" }}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 26 }}
    >
      <span className="font-display text-[88px] font-semibold leading-none tracking-tight tabular-nums" style={{ textShadow: "0 4px 24px rgba(0,0,0,0.35)" }}>
        {now.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}
      </span>
      <span className="mt-1.5 text-[17px] font-medium capitalize text-white/85">{now.toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" })}</span>
      {w && Icon && (
        <span className="mt-2 flex items-center gap-2 text-[14px] text-white/80" title={w.city}>
          <Icon size={17} strokeWidth={2.2} />
          <span className="font-semibold text-white">{w.temp}°</span>
          <span>{SKY_LABEL[w.sky]}</span>
          <span className="text-white/50">· {w.high}° / {w.low}°</span>
        </span>
      )}
    </motion.div>
  );
}

/** Kalkan mikrofonu kapattı: köşede rozet (Ayarlar'dan kapatılabilir), açılışta klik sesi */
function MicBadge() {
  const fx = useNook((s) => s.settings.shieldMicFx);
  const [muted] = useState(() => new URLSearchParams(location.search).has("mic"));
  useEffect(() => {
    // Yalnızca ilk ekrandaki kalkan ses çıkarsın
    if (muted && fx && (!inTauri || windowLabel === "shield-0")) micClick(false);
  }, [muted, fx]);
  if (!muted || !fx) return null;
  return (
    <motion.div
      className="absolute right-[4vh] top-[4vh] flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-white"
      style={{ background: "rgba(10,12,24,0.45)", backdropFilter: "blur(12px)", boxShadow: "inset 0 0 0 1px rgba(255,140,60,0.45)" }}
      initial={{ opacity: 0, y: -12, scale: 0.9 }}
      animate={{ opacity: [0, 1, 1, 0.75], y: 0, scale: 1 }}
      transition={{ duration: 1.2, times: [0, 0.2, 0.7, 1], delay: 0.6 }}
    >
      <motion.span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ff8a3d]" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.5, delay: 0.7 }}>
        <MicOff size={13} strokeWidth={2.6} />
      </motion.span>
      {tt("Mikrofon kapatıldı · kalkan kalkınca açılır")}
    </motion.div>
  );
}

/** Bir süre yazılmazsa kutu kaybolur, sahne yeniden uyur */
const IDLE_MS = 20_000;

/** Kilitli kalkanın parola kutusu: doğruysa kalkan kalkar, yanlışsa sallanır */
function PasswordBox({ onIdle }: { onIdle: () => void }) {
  const hash = useNook((s) => s.settings.lockHash);
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const shake = useAnimationControls();
  const idle = useRef(0);

  const poke = () => {
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(onIdle, IDLE_MS);
  };
  useEffect(() => {
    input.current?.focus();
    poke();
    return () => window.clearTimeout(idle.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!value) return;
    if (await checkPassword(value, hash)) {
      void shieldOff();
      return;
    }
    setWrong(true);
    setValue("");
    void shake.start({ x: [0, -12, 11, -8, 6, -3, 0], transition: { duration: 0.42 } });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <motion.div
        animate={shake}
        className="flex h-[46px] w-[300px] items-center gap-2.5 rounded-full border pl-4 pr-1.5"
        style={{ background: "rgba(10,12,24,0.45)", backdropFilter: "blur(14px)", borderColor: wrong ? "rgba(255,90,90,0.55)" : "rgba(255,255,255,0.18)" }}
      >
        <Lock size={15} className={wrong ? "text-[#ff6b6b]" : "text-white/50"} strokeWidth={2.4} />
        <input
          ref={input}
          type="password"
          value={value}
          autoComplete="off"
          spellCheck={false}
          placeholder={wrong ? tt("Yanlış parola") : tt("Parola")}
          onChange={(e) => {
            setValue(e.target.value);
            setWrong(false);
            poke();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            poke();
            if (e.key === "Enter") void submit();
            if (e.key === "Escape") onIdle();
          }}
          className={`min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none ${wrong ? "placeholder:text-[#ff8a8a]" : "placeholder:text-white/35"}`}
        />
        <button
          onClick={() => void submit()}
          disabled={!value}
          className="h-[34px] shrink-0 rounded-full bg-white/[0.12] px-4 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.2] disabled:opacity-40"
        >
          {tt("Aç")}
        </button>
      </motion.div>
    </motion.div>
  );
}
