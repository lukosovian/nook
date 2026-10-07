/**
 * Gizlilik kalkanı: ekranı tamamen örten canlı bir "Nook ortamı" (22 sahneden biri; Ayarlar'a göre
 * karışık, sırayla ya da hep aynısı) ve
 * üstte saat, tarih, hava durumu. Kısayol, Esc ya da çift tıkla kalkar (bkz. src-tauri/src/shield.rs).
 * Parola kilidi açıksa yalnızca parolayla kalkar: bir tuşa basınca ya da tıklayınca parola kutusu çıkar.
 * Kalkan açılırken çalan medya durur; mikrofon ve görüşme sesi kalkan boyunca kapanır (Rust). Sağ üstteki
 * düğmelerle kalkan açıkken de kapatılıp açılabilir.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { listen } from "@tauri-apps/api/event";
import { Lock, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { inTauri, shieldOff, shieldSet, shieldState, windowLabel, type ShieldMute } from "../lib/bridge";
import { checkPassword } from "../lib/lock";
import { micClick } from "../lib/clickSound";
import { useNook } from "../store/nook";
import { ContextMenu } from "./overlays/ContextMenu";
import { tt } from "../lib/i18n";
import { Beach, Cafe, Campfire, Disco, Space } from "./shield/scenesA";
import { Library, Mine, Snow, Studio, Zen } from "./shield/scenesB";
import { Arcade, Cinema, Greenhouse, Ocean, Train, Western } from "./shield/scenesC";
import { Bunker, Ferris, Lab, Lavender, Pirate, Sketchbook } from "./shield/scenesD";
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

  const root = useRef<HTMLDivElement>(null);
  const Scene = scene.C;
  return (
    <div ref={root} className="fixed inset-0 cursor-default select-none overflow-hidden bg-black" onDoubleClick={() => !locked && void shieldOff()} onPointerDown={() => locked && setAsking(true)}>
      <motion.div className="absolute inset-0" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.3, 1] }}>
        <Scene />
      </motion.div>
      {/* Saat her sahnenin kendi içinde; parola kutusu ortada, yalnızca sorulunca */}
      <div className="pointer-events-none absolute inset-x-0 top-[42vh] flex justify-center">
        <div className="pointer-events-auto h-[46px]">
          <AnimatePresence>{locked && asking && <PasswordBox onIdle={() => setAsking(false)} />}</AnimatePresence>
        </div>
      </div>
      <MuteButtons locked={locked} onLocked={() => setAsking(true)} />
      {/* Sağ tık: yalnızca Yenile (yeni bir sahne gelir) */}
      <ContextMenu bounds={root} refreshOnly />
    </div>
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
      className="absolute right-[4vh] top-[4vh] flex items-center gap-1.5 rounded-full p-1.5"
      style={{ background: "rgba(10,12,24,0.45)", backdropFilter: "blur(12px)", boxShadow: `inset 0 0 0 1px ${st.mic || st.call ? "rgba(255,140,60,0.45)" : "rgba(255,255,255,0.14)"}` }}
      initial={{ opacity: 0, y: -12, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.6 }}
      // Düğmelere basmak kalkanı kapatmasın / parola kutusunu açmasın
      onPointerDown={(e) => !locked && e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {buttons.map((b) => (
        <motion.button
          key={b.kind}
          title={b.label}
          onClick={() => toggle(b.kind)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors"
          style={{ background: b.off ? "#ff8a3d" : "rgba(255,255,255,0.12)" }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.4 }}
        >
          {b.off ? <b.Off size={16} strokeWidth={2.6} /> : <b.On size={16} strokeWidth={2.4} className="opacity-80" />}
        </motion.button>
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
