import { useEffect, useRef, type RefObject } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useTransform,
  type MotionValue,
  type TargetAndTransition,
} from "motion/react";
import { ANTIC_MS, playAntic } from "../../hooks/useAntics";
import { useBlink } from "../../hooks/useBlink";
import { useLook } from "../../hooks/useLook";
import { setInteractive } from "../../lib/bridge";
import { FACE } from "../../lib/layout";
import { spring } from "../../lib/motion";
import { useNook, type Expression, type Status } from "../../store/nook";
import { Eye, EYES } from "./Eye";
import { Hands } from "./Hands";
import { Mouth } from "./Mouth";

/** Durum renkleri (rozet, alt ton, ada parıltısı) */
export const STATUS_COLOR: Record<Status, string> = {
  working: "#2f8cff",
  error: "#ff453a",
  success: "#34c759",
  annoyed: "#ff9f0a",
  alarm: "#ffd23f",
};

const sec = (ms: number) => ms / 1000;
const round = (w: number, h = w) => ({ width: w, height: h, borderRadius: Math.min(w, h) / 2 });

/** Yüzün biçimi: çoğunlukla küre; dosya gelince kutuya dönüşür. */
const BODY_SHAPE: Partial<Record<Expression, { width: number; height: number; borderRadius: number }>> = {
  hungry: { width: 26, height: 23, borderRadius: 7 },
  chewing: { width: 26, height: 22, borderRadius: 7 },
  stretch: round(28, 21),
  sleepy: round(24, 23),
};

/** Bütün yüzün hareketleri. */
const BODY: Record<Expression, TargetAndTransition> = {
  idle: { x: 0, y: 0, rotate: 0, scaleX: 1, scaleY: 1 },
  hungry: { x: 0, y: 0, rotate: 0, scaleX: 1, scaleY: 1 },
  chewing: { x: 0, rotate: 0, scaleX: [1, 1.1, 0.96, 1.05, 1], scaleY: [1, 0.86, 1.04, 0.96, 1], y: 0, transition: { duration: 0.65 } },
  thinking: { x: 0, rotate: [0, -4, 0], y: [0, -0.8, 0], transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } },
  tired: { x: 0, y: 1, rotate: 0 },
  sulk: { x: 3, y: 1, rotate: 10 },
  sleepy: { x: 0, rotate: 0, y: [0, 1, 0], transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" } },
  drowsy: { x: 0, rotate: 0, y: [0, 0.8, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
  happy: { x: 0, rotate: 0, y: [0, -3, 0], transition: { duration: 0.42, ease: "easeOut" } },
  hop: { x: 0, rotate: 0, y: [0, -6, 0, -2.5, 0], transition: { duration: sec(ANTIC_MS.hop), ease: "easeOut" } },
  wander: {
    y: 0,
    rotate: [0, -6, 0, 0, 6, 0, 0],
    x: [0, -26, -26, -26, 24, 24, 0],
    transition: { duration: sec(ANTIC_MS.wander), times: [0, 0.18, 0.4, 0.45, 0.65, 0.85, 1], ease: "easeInOut" },
  },
  nod: { x: 0, rotate: 0, y: [0, 2, 2, -1, 0], transition: { duration: sec(ANTIC_MS.nod), times: [0, 0.5, 0.75, 0.85, 1] } },
  giggle: {
    y: 0,
    x: [0, -1.5, 1.5, -1.5, 1.5, -1, 0],
    rotate: [0, -5, 5, -5, 5, 0, 0],
    transition: { duration: sec(ANTIC_MS.giggle), ease: "easeInOut" },
  },
  surprised: { x: 0, rotate: 0, y: [0, -4, 0], transition: { duration: 0.35, ease: "easeOut" } },
  yawn: { x: 0, rotate: 0, y: [0, -1, -1, 0], transition: { duration: sec(ANTIC_MS.yawn) } },
  wink: { x: 0, y: 0, rotate: [0, -8, 0], transition: { duration: sec(ANTIC_MS.wink) } },
  hum: { x: 0, y: 0, rotate: [0, -6, 0, 6, 0], transition: { duration: 1.4, repeat: 1, ease: "easeInOut" } },
  stretch: { x: 0, rotate: 0, y: [0, 1, 0], transition: { duration: sec(ANTIC_MS.stretch) } },
  love: { x: 0, rotate: 0, y: [0, -2, 0], transition: { duration: 0.9, repeat: 2, ease: "easeInOut" } },
  dizzy: {
    y: 0,
    x: [0, -2, 2, -2, 2, 0],
    rotate: [0, -14, 12, -10, 8, 0],
    transition: { duration: sec(ANTIC_MS.dizzy), ease: "easeInOut" },
  },
  // Tokat: yüz yassılaşıp geri sekiyor
  slap: {
    x: [0, 3, 0],
    y: 0,
    rotate: [0, 12, 0],
    scaleX: [1, 1.22, 0.94, 1],
    scaleY: [1, 0.78, 1.06, 1],
    transition: { duration: sec(ANTIC_MS.slap) },
  },
  shy: { x: 0, y: [0, 1, 0], rotate: [0, -6, -6, 0], transition: { duration: sec(ANTIC_MS.shy), times: [0, 0.2, 0.8, 1] } },
  suspicious: { x: [0, 2, 2, 0], y: 0, rotate: [0, -7, -7, 0], transition: { duration: sec(ANTIC_MS.suspicious), times: [0, 0.2, 0.85, 1] } },
  bored: { x: 0, rotate: 0, y: [0, 1.5, 1.5, 0], transition: { duration: sec(ANTIC_MS.bored), times: [0, 0.3, 0.8, 1] } },
  // Su içer: başını geriye atıp yudumlar
  drink: { x: 0, y: [0, -1, -1.5, -1, 0], rotate: [0, -12, -16, -12, 0], transition: { duration: sec(ANTIC_MS.drink), times: [0, 0.2, 0.5, 0.8, 1] } },
  downloading: { x: 0, y: 0, rotate: 0 },
  talking: { x: 0, rotate: [0, -2, 0, 2, 0], y: [0, -0.6, 0], transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" } },
  // Alarm: zil gibi titrer
  alarm: { x: 0, y: [0, -2, 0], rotate: [0, -12, 12, -12, 12, 0], transition: { duration: 0.55, repeat: Infinity, repeatDelay: 0.25 } },
  // Ses göstergesi: bara doğru eğilir / geri çekilir / gürültüden titrer / sessizde başını yana yatırır
  volUp: { x: 1.5, y: 0, rotate: 8, scaleX: 1, scaleY: 1 },
  volDown: { x: -1, y: 0.5, rotate: -6, scaleX: 1, scaleY: 1 },
  loud: { y: 0, rotate: 0, scaleX: 1, scaleY: 1, x: [0, -0.9, 0.9, -0.9, 0.9, 0], transition: { duration: 0.32, repeat: Infinity } },
  muted: { x: 0, y: 0.8, rotate: -8, scaleX: 1, scaleY: 1 },
  // Kızgın: titreyerek söylenir
  annoyed: { rotate: 0, y: 1, x: [0, -1.2, 1.2, -1.2, 1.2, 0], transition: { duration: 0.5, repeat: 2 } },
};

/** Müzik çalarken (tepki kapalıysa) sabit tempoda sallanma. */
const GROOVE: TargetAndTransition = {
  x: 0,
  y: [0, -1.5, 0],
  rotate: [0, -4, 0, 4, 0],
  transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" },
};

/** Yüzün üstünden yükselen minik işaretler. */
const FLOATER: Partial<Record<Expression, { char: string; className: string }>> = {
  sleepy: { char: "z", className: "text-white/60" },
  hum: { char: "♪", className: "text-white/80" },
  love: { char: "♥", className: "text-rose-400" },
  surprised: { char: "!", className: "text-amber-300" },
  sulk: { char: "…", className: "text-white/50" },
  dizzy: { char: "✦", className: "text-amber-200" },
  annoyed: { char: "#", className: "text-orange-400" },
  alarm: { char: "♪", className: "text-yellow-300" },
  shy: { char: "♡", className: "text-pink-300" },
  loud: { char: "!", className: "text-amber-300" },
};

/** Bazı ifadelerde gözler bir yöne kayar (aşağı bakmak, yan bakmak). */
const EYE_OFFSET: Partial<Record<Expression, { x: number; y: number }>> = {
  bored: { x: 0, y: 3.5 },
  suspicious: { x: 3, y: 0 },
  shy: { x: 0, y: 1.5 },
  volUp: { x: 2.6, y: 0 },
  volDown: { x: 2.4, y: 0.6 },
};

/** Gözleri kapalı/özel çizimli ifadeler — imleç takibi yok. */
const NO_LOOK = new Set<Expression>(["volUp", "volDown", "loud", "muted", "sleepy", "chewing", "yawn", "stretch", "giggle", "hum", "love", "happy", "sulk", "dizzy", "thinking", "slap", "shy", "suspicious", "bored", "downloading", "drink"]);
/** Kendiliğinden göz kırpan ifadeler. */
const BLINKS = new Set<Expression>(["idle", "drowsy", "tired", "wander", "hop", "surprised", "hungry"]);

/** Bu hızdan (px/sn) sert fırlatılırsa Nook sersemler. */
const FLING_SPEED = 900;
/** Bu kadar basılı tutulursa (sürüklemeden) başı döner. */
const LONG_PRESS_MS = 650;
/** Bu süre içinde 3 kez tıklanırsa kızar. */
const ANNOY_WINDOW_MS = 1600;

interface NookProps {
  expression: Expression;
  status?: Status | null;
  /** Müzik çalıyor */
  grooving?: boolean;
  color?: string;
  /** Sürükleme sınırı (ada) — Nook bunun içinde tutulup fırlatılabilir */
  bounds?: RefObject<HTMLElement | null>;
}

export function Nook({ expression, status = null, grooving = false, color = "#FFFFFF", bounds }: NookProps) {
  const ref = useRef<HTMLDivElement>(null);
  const look = useLook(ref, !NO_LOOK.has(expression));
  const lid = useBlink(BLINKS.has(expression));
  const press = useGrab();

  // --- 3B kafa çevirme: gözler kenara kayar ve kısalır, ışık ters yöne gider
  const eyesX = useTransform(look.x, (v) => v * 6.4);
  const eyesY = useTransform(look.y, (v) => v * 4.4 + 1.2);
  const gap = useTransform(look.x, (v) => 3.9 * (1 - Math.abs(v) * 0.32));
  const leftX = useTransform([gap, eyesX], ([g, x]: number[]) => x - g);
  const rightX = useTransform([gap, eyesX], ([g, x]: number[]) => x + g);
  const leftScaleX = useTransform(look.x, (v) => 1 - Math.max(0, -v) * 0.45 - Math.abs(v) * 0.08);
  const rightScaleX = useTransform(look.x, (v) => 1 - Math.max(0, v) * 0.45 - Math.abs(v) * 0.08);
  const hx = useTransform(look.x, (v) => 36 - v * 20);
  const hy = useTransform(look.y, (v) => 30 - v * 18);
  const shade = `color-mix(in srgb, ${color} 62%, #5d5d6b)`;
  const sphere = useMotionTemplate`radial-gradient(circle at ${hx}% ${hy}%, #ffffff 0%, ${color} 34%, ${shade} 100%)`;

  const attentionScale = useTransform(look.attention, (a) => 1 + a * 0.16);
  const scaleYL = useTransform([lid, attentionScale], ([l, a]: number[]) => l * a);
  const scaleYR = scaleYL;

  // --- Müzik/video çalarken gözler dalgalı ses çubuklarına dönüşür (Grok Bot "▮•▮")
  const wave = grooving && expression === "idle";

  // --- İmleç yüzün dibinde 1,5 sn oyalanırsa utanır
  useShyWhenStaredAt(look.attention, expression);
  const leftSX = useTransform([leftScaleX, attentionScale], ([s, a]: number[]) => s * a);
  const rightSX = useTransform([rightScaleX, attentionScale], ([s, a]: number[]) => s * a);

  const [left, right] = EYES[expression];
  const floater = FLOATER[expression];
  const tint = status ? STATUS_COLOR[status] : null;
  const isBox = expression === "hungry" || expression === "chewing";

  return (
    // Dış katman: sürükle-fırlat. Bırakınca yay ile yerine döner.
    <motion.div
      drag={!!bounds}
      dragConstraints={bounds}
      dragElastic={0.35}
      dragSnapToOrigin
      dragTransition={{ bounceStiffness: 500, bounceDamping: 14 }}
      whileDrag={{ scale: 1.15, cursor: "grabbing" }}
      onPointerDown={press.down}
      onPointerUp={press.up}
      onDragStart={press.dragStart}
      onDragEnd={press.dragEnd}
      onTap={press.tap}
      className="cursor-grab touch-none"
    >
      <motion.div
        ref={ref}
        className="relative"
        style={{ width: FACE, height: FACE }}
        initial={false}
        animate={grooving && expression === "idle" ? GROOVE : BODY[expression]}
      >
        <Hands expression={expression} />

        {/* Küre (ya da kutu) yüz */}
        <motion.div
          className="absolute left-1/2 top-1/2 overflow-hidden"
          style={{
            backgroundImage: sphere,
            translateX: "-50%",
            translateY: "-50%",
            boxShadow: "0 2px 6px rgba(0,0,0,0.55), inset -1.5px -2.5px 4px rgba(0,0,0,0.16)",
          }}
          initial={false}
          animate={BODY_SHAPE[expression] ?? round(FACE)}
          transition={spring.eye}
        >
          {/* Duruma göre alttan renk tonu */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            initial={false}
            animate={{
              opacity: tint ? 0.85 : 0,
              backgroundImage: `radial-gradient(120% 75% at 50% 112%, ${tint ?? "#ffffff"} 0%, transparent 72%)`,
            }}
            transition={{ duration: 0.4 }}
          />

          {/* Utangaçken yanaklar pembeleşir */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            initial={false}
            animate={{ opacity: expression === "shy" ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background:
                "radial-gradient(4px 2.6px at 24% 66%, rgba(255,120,150,0.85), transparent), radial-gradient(4px 2.6px at 76% 66%, rgba(255,120,150,0.85), transparent)",
            }}
          />

          {/* Gözler */}
          <motion.div className="absolute inset-0" style={{ y: eyesY }}>
            <motion.div className="absolute inset-0" initial={false} animate={EYE_OFFSET[expression] ?? { x: 0, y: 0 }} transition={spring.eye}>
              <motion.div className="absolute inset-0" initial={false} animate={{ opacity: wave ? 0 : 1 }} transition={{ duration: 0.15 }}>
                <Eye shape={left} x={leftX} scaleX={leftSX} scaleY={scaleYL} />
                <Eye shape={right} x={rightX} scaleX={rightSX} scaleY={scaleYR} />
              </motion.div>
            </motion.div>
          </motion.div>
          <Mouth expression={expression} />

          <AnimatePresence>
            {wave && <WaveEyes key="wave" />}
            {expression === "thinking" && <Orbit key="orbit" />}
            {expression === "dizzy" && <Spirals key="spirals" />}
            {expression === "downloading" && <ProgressDots key="dl" />}
          </AnimatePresence>
        </motion.div>

        {/* Su bardağı: içerken ağzına gider, eğilir, su azalır */}
        <AnimatePresence>{expression === "drink" && <Glass key="glass" />}</AnimatePresence>

        {/* Kutu kapağı: dosya gelince açılır, yutunca kapanır */}
        <AnimatePresence>
          {isBox && (
            <motion.div
              key="lid"
              className="pointer-events-none absolute rounded-[2px]"
              style={{
                left: -1.5,
                top: -1,
                width: 27,
                height: 3.6,
                originX: 0,
                originY: 1,
                background: `linear-gradient(180deg, #ffffff, ${shade})`,
                boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
              }}
              initial={{ opacity: 0, rotate: 0, y: 2 }}
              animate={{ opacity: 1, rotate: expression === "hungry" ? -38 : 0, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            />
          )}
        </AnimatePresence>

        {/* Durum rozeti (sol üst): ••• çalışıyor, kırmızı hata, yeşil tamam, turuncu kızgın */}
        <AnimatePresence>
          {status && (
            <motion.div
              key="badge"
              className="pointer-events-none absolute flex items-center justify-center gap-[0.8px] rounded-full"
              style={{ left: -2.5, top: -2.5, width: 9, height: 9, background: STATUS_COLOR[status], boxShadow: "0 0 0 1.5px #000" }}
              initial={{ scale: 0 }}
              animate={{ scale: 1, backgroundColor: STATUS_COLOR[status] }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 18 }}
            >
              {status === "working" &&
                [0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="block h-[1.4px] w-[1.4px] rounded-full bg-white"
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>{floater && <Floater key={floater.char} {...floater} />}</AnimatePresence>
    </motion.div>
  );
}

/** Su içerken tuttuğu küçük cam bardak (yüz biriminde ~7×9). */
function Glass() {
  const d = sec(ANTIC_MS.drink);
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ left: 14, top: 15, width: 6.5, height: 8.5, originX: 0.1, originY: 0.1 }}
      initial={{ opacity: 0, x: 4, y: 6, rotate: 0 }}
      animate={{ opacity: [0, 1, 1, 1, 0], x: [5, 0, -1.5, 0, 5], y: [6, 0, -0.5, 0, 6], rotate: [0, -30, -50, -30, 0] }}
      exit={{ opacity: 0 }}
      transition={{ duration: d, times: [0, 0.2, 0.5, 0.8, 1], ease: "easeInOut" }}
    >
      <div
        className="relative h-full w-full overflow-hidden"
        style={{ borderRadius: "1px 1px 2px 2px", background: "rgba(220,240,255,0.35)", boxShadow: "inset 0 0 0 0.6px rgba(255,255,255,0.9), 0 1px 2px rgba(0,0,0,0.4)" }}
      >
        <motion.div
          className="absolute inset-x-0 bottom-0"
          style={{ background: "linear-gradient(180deg, #8fd0ff, #3d8bff)" }}
          initial={{ height: "75%" }}
          animate={{ height: ["75%", "75%", "25%", "15%", "15%"] }}
          transition={{ duration: d, times: [0, 0.2, 0.6, 0.8, 1] }}
        />
      </div>
    </motion.div>
  );
}

/**
 * Dalgalı ses gözleri (Grok Bot "▮•▮"): ortadan simetrik üç çubuk, kendi ritminde.
 * Dıştakiler uzarken ortadaki nokta küçülür, sonra tersi: "▮•▮" ↔ "|▮|". Ses seviyesinden bağımsız.
 */
function WaveEyes() {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const cur = useRef([4, 2.6, 4]);

  useAnimationFrame((t) => {
    // Ters fazlı iki dalga: dıştakiler (hafif kaymalı) ve ortadaki
    const phase = t / 230;
    const outer = (k: number) => 0.5 + 0.5 * Math.sin(phase + k);
    const mid = 0.5 + 0.5 * Math.sin(phase + Math.PI);
    // [dış, orta, dış] — dıştakiler 4→10, orta 2.6→9
    const target = [4 + 6 * outer(0), 2.6 + 6.4 * mid, 4 + 6 * outer(0.5)];
    bars.current.forEach((el, i) => {
      if (!el) return;
      cur.current[i] += (target[i] - cur.current[i]) * 0.4;
      el.style.height = `${cur.current[i].toFixed(2)}px`;
    });
  });

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center gap-[2.4px]"
      style={{ paddingTop: 2.4 }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.18 }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          ref={(el) => void (bars.current[i] = el)}
          className="block rounded-full bg-black"
          style={{ width: i === 1 ? 2.6 : 3.6, height: cur.current[i] }}
        />
      ))}
    </motion.div>
  );
}

/** İndirirken: çaprazda sırayla dolan üç nokta (Grok Bot "progress"). */
function ProgressDots() {
  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {[
        [-4.4, -3.6],
        [0, 0.4],
        [4.4, 4.4],
      ].map(([x, y], i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full bg-black"
          style={{ width: 4.2, height: 4.2, marginLeft: -2.1 + x, marginTop: -2.1 + y }}
          animate={{ opacity: [0.18, 1, 1, 0.18], scale: [0.7, 1, 1, 0.7] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, times: [0, 0.25, 0.7, 1] }}
        />
      ))}
    </motion.div>
  );
}

/** İmleç yüzün dibinde (dikkat > 0.85) 1,5 sn oyalanırsa utanır — en fazla 30 sn'de bir. */
function useShyWhenStaredAt(attention: MotionValue<number>, expression: Expression) {
  const since = useRef(0);
  const last = useRef(0);
  const exprRef = useRef(expression);
  exprRef.current = expression;
  useEffect(
    () =>
      attention.on("change", (a) => {
        const now = Date.now();
        if (a < 0.85 || exprRef.current !== "idle") {
          since.current = 0;
          return;
        }
        if (!since.current) since.current = now;
        if (now - since.current > 1500 && now - last.current > 30_000) {
          last.current = now;
          since.current = 0;
          useNook.getState().care(1);
          playAntic("shy");
        }
      }),
    [attention],
  );
}

/** Düşünürken gözlerin yerine yörüngede dönen üç nokta (Grok Bot'un "orbit" biçimi). */
function Orbit() {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1, rotate: 360 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ rotate: { duration: 1.1, repeat: Infinity, ease: "linear" }, default: { duration: 0.2 } }}
    >
      {[0, 120, 240].map((deg, i) => (
        <span
          key={deg}
          className="absolute left-1/2 top-1/2 rounded-full bg-black"
          style={{
            width: 3.4 - i * 0.6,
            height: 3.4 - i * 0.6,
            transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-5.2px)`,
          }}
        />
      ))}
    </motion.div>
  );
}

/** Sersemken gözlerin yerine dönen spiraller. */
function Spirals() {
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center gap-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {[false, true].map((reverse) => (
        <motion.svg
          key={String(reverse)}
          width="7.5"
          height="7.5"
          viewBox="0 0 10 10"
          animate={{ rotate: reverse ? -360 : 360 }}
          transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
        >
          <path
            d="M5 5 m 0 -0.8 a 0.8 0.8 0 1 1 -0.8 0.8 a 1.8 1.8 0 1 1 1.8 1.8 a 2.9 2.9 0 1 1 -2.9 -2.9 a 4 4 0 0 1 4 4"
            fill="none"
            stroke="black"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </motion.svg>
      ))}
    </motion.div>
  );
}

function Floater({ char, className }: { char: string; className: string }) {
  return (
    <motion.div
      className="pointer-events-none absolute -right-2 -top-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
    >
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className={`absolute text-[8px] font-medium leading-none ${className}`}
          initial={{ x: 0, y: 4, opacity: 0 }}
          animate={{ x: [0, 3, 5], y: [4, -1, -5], opacity: [0, 1, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 1.1, ease: "easeOut" }}
        >
          {char}
        </motion.span>
      ))}
    </motion.div>
  );
}

/**
 * Tutma/fırlatma/uzun basma/tokat. Sürüklerken pencere tıklanabilir kalır
 * (imleç adadan çıksa bile bırakma olayı kaçmasın) ve ada kapanmaz.
 */
function useGrab() {
  const timer = useRef(0);
  const dragged = useRef(false);
  const taps = useRef<number[]>([]);
  const s = () => useNook.getState();

  return {
    down: () => {
      dragged.current = false;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (!dragged.current) {
          playAntic("dizzy");
          s().care(1);
        }
      }, LONG_PRESS_MS);
    },
    up: () => window.clearTimeout(timer.current),
    dragStart: () => {
      dragged.current = true;
      window.clearTimeout(timer.current);
      s().setGrabbed(true);
      void setInteractive(true);
    },
    dragEnd: (_: unknown, info: { velocity: { x: number; y: number } }) => {
      s().setGrabbed(false);
      void setInteractive(false);
      s().care(2);
      playAntic(Math.hypot(info.velocity.x, info.velocity.y) > FLING_SPEED ? "dizzy" : "wink");
    },
    // Tek tık → tokat (yüz yassılaşır). Art arda 3 tık → kızar.
    tap: () => {
      window.clearTimeout(timer.current);
      if (dragged.current) return;
      const now = Date.now();
      taps.current = [...taps.current.filter((t) => now - t < ANNOY_WINDOW_MS), now];
      if (taps.current.length >= 3) {
        taps.current = [];
        s().care(-3);
        playAntic("annoyed");
      } else {
        s().care(1);
        playAntic(s().antic === "slap" ? "giggle" : "slap");
      }
    },
  };
}
