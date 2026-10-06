/**
 * Gizlilik kalkanı: ekranı tamamen örten canlı bir "Nook ortamı" (10 sahneden biri, rastgele) ve
 * üstte saat, tarih, hava durumu. Kısayol, Esc ya da çift tıkla kalkar (bkz. src-tauri/src/shield.rs).
 * Parola kilidi açıksa yalnızca parolayla kalkar: bir tuşa basınca ya da tıklayınca parola kutusu çıkar.
 * Kalkan açılırken çalan medya durur; mikrofon açıksa kalkan boyunca kapanır (Rust), rozeti burada.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { listen } from "@tauri-apps/api/event";
import { Lock, MicOff, VolumeX } from "lucide-react";
import { inTauri, shieldOff, windowLabel } from "../lib/bridge";
import { checkPassword } from "../lib/lock";
import { micClick } from "../lib/clickSound";
import { useNook } from "../store/nook";
import { tt } from "../lib/i18n";
import { Beach, Cafe, Campfire, Disco, Space } from "./shield/scenesA";
import { Library, Mine, Snow, Studio, Zen } from "./shield/scenesB";

/** Sahneler: her biri kendi saatini kendi tasarımıyla çizer (shield/clocks) */
const SCENES: { id: string; C: () => React.JSX.Element }[] = [
  { id: "campfire", C: Campfire },
  { id: "cafe", C: Cafe },
  { id: "disco", C: Disco },
  { id: "space", C: Space },
  { id: "beach", C: Beach },
  { id: "library", C: Library },
  { id: "mine", C: Mine },
  { id: "zen", C: Zen },
  { id: "studio", C: Studio },
  { id: "snow", C: Snow },
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
      {/* Saat her sahnenin kendi içinde; parola kutusu ortada, yalnızca sorulunca */}
      <div className="pointer-events-none absolute inset-x-0 top-[42vh] flex justify-center">
        <div className="pointer-events-auto h-[46px]">
          <AnimatePresence>{locked && asking && <PasswordBox onIdle={() => setAsking(false)} />}</AnimatePresence>
        </div>
      </div>
      <MicBadge />
    </div>
  );
}

/**
 * Kalkan mikrofonu (ve görüşmedeki karşı tarafın sesini) kapattı: köşede yalnızca simgeler, yazısız.
 * Ayarlar'dan kapatılabilir; ilk ekrandaki kalkan klik sesi çıkarır.
 */
function MicBadge() {
  const fx = useNook((s) => s.settings.shieldMicFx);
  const [q] = useState(() => new URLSearchParams(location.search));
  const mic = q.has("mic");
  const call = q.has("call");
  useEffect(() => {
    if ((mic || call) && fx && (!inTauri || windowLabel === "shield-0")) micClick(false);
  }, [mic, call, fx]);
  if ((!mic && !call) || !fx) return null;
  const icons = [mic && MicOff, call && VolumeX].filter(Boolean) as (typeof MicOff)[];
  return (
    <motion.div
      className="absolute right-[4vh] top-[4vh] flex items-center gap-1.5 rounded-full p-1.5"
      style={{ background: "rgba(10,12,24,0.45)", backdropFilter: "blur(12px)", boxShadow: "inset 0 0 0 1px rgba(255,140,60,0.45)" }}
      initial={{ opacity: 0, y: -12, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.6 }}
    >
      {icons.map((Icon, i) => (
        <motion.span key={i} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff8a3d] text-white" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.5, delay: 0.8 + i * 0.15 }}>
          <Icon size={16} strokeWidth={2.6} />
        </motion.span>
      ))}
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
