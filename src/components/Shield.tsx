/**
 * Gizlilik kalkanı: ekranı tamamen örten canlı bir "Nook ortamı" (34 sahneden biri; Ayarlar'a göre
 * karışık, sırayla ya da hep aynısı) ve
 * üstte saat, tarih, hava durumu. Kısayol, Esc ya da çift tıkla kalkar (bkz. src-tauri/src/shield.rs).
 * Parola kilidi açıksa yalnızca parolayla kalkar: bir tuşa basınca ya da tıklayınca parola kutusu çıkar.
 * Kalkan açılırken çalan medya durur; mikrofon ve görüşme sesi kalkan boyunca kapanır (Rust). Sağ üstteki
 * düğmelerle kalkan açıkken de kapatılıp açılabilir.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig, useAnimationControls } from "motion/react";
import { listen } from "@tauri-apps/api/event";
import { Lock, LockOpen, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { bodiesBusy } from "../lib/nook3d";
import { bakesBusy } from "./shield/kit";
import { inTauri, shieldOff, shieldSet, shieldState, windowLabel, type ShieldMute } from "../lib/bridge";
import { checkPassword, forgotPassword } from "../lib/lock";
import { micClick } from "../lib/clickSound";
import { useNook } from "../store/nook";
import { ContextMenu } from "./overlays/ContextMenu";
import { tt } from "../lib/i18n";
import { Beach, Cafe, Campfire, Disco, Space } from "./shield/scenesA";
import { Library, Mine, Snow, Studio, Zen } from "./shield/scenesB";
import { Arcade, Cinema, Greenhouse, Ocean, Train, Western } from "./shield/scenesC";
import { Bunker, Ferris, Lab, Lavender, Pirate, Sketchbook } from "./shield/scenesD";
import { Aquarium, Autumn, Bakery, Cabin, Lanterns, Lighthouse, Metro, MoonBase, PopupBook, Ramen, Rooftop, Waterfall } from "./shield/scenesE";
import { activeScenes } from "./shield/catalog";

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
  { id: "arcade", C: Arcade },
  { id: "ocean", C: Ocean },
  { id: "greenhouse", C: Greenhouse },
  { id: "train", C: Train },
  { id: "cinema", C: Cinema },
  { id: "western", C: Western },
  { id: "pirate", C: Pirate },
  { id: "lab", C: Lab },
  { id: "lavender", C: Lavender },
  { id: "bunker", C: Bunker },
  { id: "ferris", C: Ferris },
  { id: "sketch", C: Sketchbook },
  { id: "lighthouse", C: Lighthouse },
  { id: "moonbase", C: MoonBase },
  { id: "ramen", C: Ramen },
  { id: "popup", C: PopupBook },
  { id: "aquarium", C: Aquarium },
  { id: "autumn", C: Autumn },
  { id: "lanterns", C: Lanterns },
  { id: "cabin", C: Cabin },
  { id: "waterfall", C: Waterfall },
  { id: "metro", C: Metro },
  { id: "bakery", C: Bakery },
  { id: "rooftop", C: Rooftop },
];

/** Kaçıncı ekranın kalkanı (shield-0, shield-1…) */
const screenIndex = Number(windowLabel.match(/^shield-(\d+)$/)?.[1] ?? 0);

/**
 * Ayarlara göre sahne: hep aynısı, sırayla (her ekran sıradakini alır, ilk ekran sırayı ilerletir)
 * ya da seçili sahnelerden rastgele.
 */
function pickScene() {
  const byId = (id: string | null | undefined) => SCENES.find((s) => s.id === id);
  // Geliştirme önizlemesi: ?scene=snow
  const want = byId(new URLSearchParams(location.search).get("scene"));
  if (want) return want;
  const st = useNook.getState();
  const s = st.settings;
  if (s.shieldSceneMode === "fixed") return byId(s.shieldScene) ?? SCENES[0];
  const list = activeScenes(s.shieldScenes ?? []);
  if (s.shieldSceneMode === "order") {
    const n = (s.shieldSceneNext ?? 0) % list.length;
    if (screenIndex === 0) st.updateSettings({ shieldSceneNext: (n + 1) % list.length });
    return byId(list[(n + screenIndex) % list.length]) ?? SCENES[0];
  }
  return byId(list[Math.floor(Math.random() * list.length)]) ?? SCENES[0];
}

/** Nook'lar en az bu kadar beklenir (sıraya girsinler), en fazla bu kadar (yavaş makinede sahne gecikmesin) */
const PAINT_MIN = 240;
const PAINT_MAX = 4000;

/**
 * Sahnedeki Nook gövdeleri çizildi mi: çizici art arda birkaç yoklamada boştaysa ya da süre dolduysa
 * evet. Sahne o ana kadar örtülü kalır — yoksa önce yalnızca eller ve eşyalar havada görünüp gövdeler
 * birer birer beliriyordu.
 */
function useScenePainted() {
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    const t0 = performance.now();
    let calm = 0;
    let t = 0;
    const tick = () => {
      const el = performance.now() - t0;
      calm = bodiesBusy() || bakesBusy() ? 0 : calm + 1;
      if ((el >= PAINT_MIN && calm >= 3) || el >= PAINT_MAX) return setPainted(true);
      t = window.setTimeout(tick, 60);
    };
    t = window.setTimeout(tick, 60);
    return () => window.clearTimeout(t);
  }, []);
  return painted;
}

/** Kalkan kalkarken sahnenin kapanış süresi (ms) — sonra pencere kapanır */
const LEAVE_MS = 320;

export function Shield() {
  const locked = useNook((s) => s.settings.lockEnabled && !!s.settings.lockHash);
  // Parola kutusu: açılış kilidinde hemen, sonra bir tuş/tıkla
  const [asking, setAsking] = useState(() => new URLSearchParams(location.search).has("ask"));
  const [scene] = useState(pickScene);
  const painted = useScenePainted();
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  /** Sahne kısa bir kapanışla çekilir, sonra kalkan kalkar */
  const leave = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    window.setTimeout(() => void shieldOff(), LEAVE_MS);
  };

  useEffect(() => {
    document.documentElement.style.background = "#07070c";
    document.body.style.background = "#07070c";
    const key = (e: KeyboardEvent) => {
      if (!locked) {
        if (e.key === "Escape") leave();
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

  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const Scene = scene.C;
  return (
    // Sistemde "hareketi azalt" açıksa büyük hareketler yerine yalnızca solma kalır
    <MotionConfig reducedMotion="user">
      <div ref={root} className="fixed inset-0 cursor-default select-none overflow-hidden bg-[#07070c]" onDoubleClick={() => !locked && leave()} onPointerDown={() => locked && setAsking(true)}>
        {/* Nook'lar çizilirken: ortada usulca nefes alan üç nokta */}
        <AnimatePresence>
          {!painted && (
            <motion.div key="wait" className="absolute inset-0 flex items-center justify-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.15 } }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-white/50" animate={{ opacity: [0.25, 1, 0.25], y: [0, -4, 0] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {/* Sahne baştan kurulur (Nook'lar arkada çizilsin) ama örtülü durur; hazır olunca ortadan genişleyen bir
            daireyle açılır, hafifçe yaklaşıp netleşir. Kalkarken kısa bir geri çekilme. */}
        <motion.div
          className="absolute inset-0"
          initial={{ clipPath: "circle(0% at 50% 58%)", scale: 1.08, filter: "brightness(0.35) saturate(0.7)" }}
          animate={
            leaving
              ? { clipPath: "circle(150% at 50% 58%)", scale: 0.97, opacity: 0, filter: "brightness(0.6) saturate(0.8)", transition: { duration: LEAVE_MS / 1000, ease: [0.4, 0, 1, 1] } }
              : painted
                ? {
                    clipPath: "circle(150% at 50% 58%)",
                    scale: 1,
                    filter: "brightness(1) saturate(1)",
                    transition: { clipPath: { duration: 1.1, ease: [0.65, 0, 0.35, 1] }, scale: { duration: 1.6, ease: [0.16, 1, 0.3, 1] }, filter: { duration: 1.2, ease: "easeOut" } },
                  }
                : undefined
          }
          ref={stage}
          onAnimationComplete={() => {
            // Bitince süzgeçler kalkar: tam ekran süzgeç sürekli çizim maliyeti demek
            const el = stage.current;
            if (painted && !leaving && el) {
              el.style.filter = "none";
              el.style.clipPath = "none";
            }
          }}
        >
          <Scene />
        </motion.div>
        {/* Saat her sahnenin kendi içinde; parola kutusu ortada, yalnızca sorulunca */}
        <div className="pointer-events-none absolute inset-x-0 top-[42vh] flex justify-center">
          <div className="pointer-events-auto h-[46px]">
            <AnimatePresence>{locked && asking && !leaving && <PasswordBox onIdle={() => setAsking(false)} onUnlock={leave} />}</AnimatePresence>
          </div>
        </div>
        {painted && !leaving && <MuteButtons locked={locked} onLocked={() => setAsking(true)} />}
        {/* Sağ tık: yalnızca Yenile (yeni bir sahne gelir) */}
        <ContextMenu bounds={root} refreshOnly />
      </div>
    </MotionConfig>
  );
}

/**
 * Sağ üstte mikrofon ve görüşme sesi düğmeleri: kalkanın kapattığı turuncu, açık olan soluk. Tıklayınca
 * kapanır / açılır (bütün ekranlardaki kalkanlar birlikte güncellenir). Kilitliyken önce parola sorulur
 * — bilgisayarın başındaki başkası mikrofonunu açamasın. Görüşme yoksa hoparlör düğmesi görünmez.
 * Ayarlar'dan gizlenebilir; ilk ekrandaki kalkan açılışta klik sesi çıkarır.
 */
function MuteButtons({ locked, onLocked }: { locked: boolean; onLocked: () => void }) {
  const fx = useNook((s) => s.settings.shieldMicFx);
  const [q] = useState(() => new URLSearchParams(location.search));
  const [st, setSt] = useState<ShieldMute>(() => ({ mic: q.has("mic"), call: q.has("call"), callAvail: q.has("call") }));
  const first = !inTauri || windowLabel === "shield-0";
  /** Her tıklamada artar: düğmeden yayılan halka baştan oynasın */
  const [ping, setPing] = useState({ mic: 0, call: 0 });

  useEffect(() => {
    if ((q.has("mic") || q.has("call")) && fx && first) micClick(false);
    void shieldState().then(setSt);
    const off = inTauri ? listen<ShieldMute>("nook://shield-state", (e) => setSt(e.payload)) : null;
    return () => void off?.then((f) => f());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!fx) return null;
  const toggle = (kind: "mic" | "call") => {
    if (locked) return onLocked();
    const muted = !st[kind];
    setPing((p) => ({ ...p, [kind]: p[kind] + 1 }));
    // Hemen göster, Rust'ın cevabıyla düzelt
    setSt((s) => ({ ...s, [kind]: muted }));
    micClick(!muted);
    void shieldSet(kind, muted).then((r) => r && setSt(r));
  };
  const buttons = [
    { kind: "mic" as const, off: st.mic, On: Mic, Off: MicOff, label: st.mic ? tt("Mikrofonu aç") : tt("Mikrofonu kapat") },
    ...(st.callAvail ? [{ kind: "call" as const, off: st.call, On: Volume2, Off: VolumeX, label: st.call ? tt("Görüşme sesini aç") : tt("Görüşme sesini kapat") }] : []),
  ];
  return (
    <motion.div
      layout
      className="absolute right-[4vh] top-[4vh] flex items-center gap-1.5 rounded-full p-1.5"
      style={{ background: "rgba(10,12,24,0.45)", backdropFilter: "blur(12px)" }}
      initial={{ opacity: 0, y: -14, scale: 0.85, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)" }}
      animate={{ opacity: 1, y: 0, scale: 1, boxShadow: `inset 0 0 0 1px ${st.mic || st.call ? "rgba(255,140,60,0.45)" : "rgba(255,255,255,0.14)"}` }}
      transition={{ type: "spring", stiffness: 420, damping: 26, delay: 0.5, boxShadow: { duration: 0.3 } }}
      // Düğmelere basmak kalkanı kapatmasın / parola kutusunu açmasın
      onPointerDown={(e) => !locked && e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <AnimatePresence initial={false}>
        {buttons.map((b) => (
          <motion.button
            key={b.kind}
            layout
            title={b.label}
            onClick={() => toggle(b.kind)}
            className="relative flex h-8 w-8 items-center justify-center rounded-full text-white"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1, backgroundColor: b.off ? "#ff8a3d" : "rgba(255,255,255,0.12)" }}
            exit={{ opacity: 0, scale: 0.4 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.86 }}
            transition={{ type: "spring", stiffness: 500, damping: 24, backgroundColor: { duration: 0.22 } }}
          >
            {/* Simge dönerek değişir */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={String(b.off)}
                className="flex"
                initial={{ opacity: 0, scale: 0.3, rotate: -70 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.3, rotate: 70 }}
                transition={{ type: "spring", stiffness: 560, damping: 28 }}
              >
                {b.off ? <b.Off size={16} strokeWidth={2.6} /> : <b.On size={16} strokeWidth={2.4} className="opacity-80" />}
              </motion.span>
            </AnimatePresence>
            {/* Tıklanınca dışa yayılan halka: kapandıysa turuncu, açıldıysa beyaz */}
            {ping[b.kind] > 0 && (
              <motion.span
                key={ping[b.kind]}
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{ boxShadow: `0 0 0 2px ${b.off ? "#ff8a3d" : "rgba(255,255,255,0.8)"}` }}
                initial={{ scale: 1, opacity: 0.9 }}
                animate={{ scale: 1.9, opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.2, 0.7, 0.3, 1] }}
              />
            )}
          </motion.button>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

/** Bir süre yazılmazsa kutu kaybolur, sahne yeniden uyur */
const IDLE_MS = 20_000;

/** Doğru parolada kilidin açıldığı görünsün: bu kadar bekleyip kalkan kalkar (ms) */
const UNLOCK_MS = 420;

/** Kilitli kalkanın parola kutusu: doğruysa kilit açılır ve kalkan kalkar, yanlışsa sallanır */
function PasswordBox({ onIdle, onUnlock }: { onIdle: () => void; onUnlock: () => void }) {
  const hash = useNook((s) => s.settings.lockHash);
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);
  const [ok, setOk] = useState(false);
  /** Yanlış her denemede artar: kırmızı parlama baştan oynasın */
  const [miss, setMiss] = useState(0);
  /** Bir kez yanlış yazıldı: "unuttun mu?" görünür */
  const [tried, setTried] = useState(false);
  const [helloMissing, setHelloMissing] = useState(false);
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

  const unlock = () => {
    window.clearTimeout(idle.current);
    setOk(true);
    void shake.start({ scale: [1, 1.05, 1], transition: { duration: 0.32, ease: "easeOut" } });
    window.setTimeout(onUnlock, UNLOCK_MS);
  };
  const submit = async () => {
    if (!value || ok) return;
    if (await checkPassword(value, hash)) return unlock();
    setWrong(true);
    setTried(true);
    setMiss((n) => n + 1);
    setValue("");
    // Sönümlenen sallanma: ilk vuruş sert, sonra yavaşça durulur
    void shake.start({ x: [0, -14, 12, -9, 6, -3, 1, 0], transition: { duration: 0.5, ease: "easeOut" } });
  };
  const forgot = async () => {
    poke();
    const r = await forgotPassword();
    if (r === "ok") unlock();
    else if (r === "unavailable") setHelloMissing(true);
  };

  const border = ok ? "rgba(90,220,140,0.7)" : wrong ? "rgba(255,90,90,0.55)" : "rgba(255,255,255,0.18)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.92, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 8, scale: 0.95, filter: "blur(4px)", transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <motion.div
        animate={shake}
        className="relative flex h-[46px] w-[300px] items-center gap-2.5 rounded-full border pl-4 pr-1.5 transition-colors duration-200"
        style={{ background: "rgba(10,12,24,0.45)", backdropFilter: "blur(14px)", borderColor: border }}
      >
        {/* Yanlışta kırmızı, doğruda yeşil bir parlama kutudan dışa yayılır */}
        {(miss > 0 || ok) && (
          <motion.span
            key={ok ? "ok" : miss}
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ boxShadow: `0 0 0 2px ${ok ? "rgba(90,220,140,0.9)" : "rgba(255,90,90,0.8)"}, 0 0 24px ${ok ? "rgba(90,220,140,0.5)" : "rgba(255,90,90,0.45)"}` }}
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: ok ? 1.25 : 1.12 }}
            transition={{ duration: ok ? 0.5 : 0.6, ease: "easeOut" }}
          />
        )}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={ok ? "open" : "closed"}
            className="flex"
            initial={{ opacity: 0, y: -6, rotate: -20 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: 6, rotate: 20 }}
            transition={{ type: "spring", stiffness: 520, damping: 22 }}
          >
            {ok ? <LockOpen size={15} className="text-[#5adc8c]" strokeWidth={2.4} /> : <Lock size={15} className={wrong ? "text-[#ff6b6b]" : "text-white/50"} strokeWidth={2.4} />}
          </motion.span>
        </AnimatePresence>
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
      {tried && (
        <div className="mt-2.5 w-[300px] text-center text-[12px] leading-snug text-white/55">
          {helloMissing ? (
            tt("Windows Hello (PIN) kurulu değil. Windows Ayarlar › Hesaplar › Oturum açma seçenekleri'nden bir PIN ekleyip tekrar dene.")
          ) : (
            <button onClick={() => void forgot()} className="rounded-full px-2 py-0.5 underline-offset-2 transition-colors hover:text-white hover:underline">
              {tt("Parolanı mı unuttun? Windows ile aç")}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
