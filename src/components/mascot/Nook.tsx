import { useEffect, useRef, useState, type RefObject } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
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
import { DEFAULT_LOOK, radii, roundBody, type BodyShape, type Look } from "../../lib/look";
import { ANCHORS, EYE_SCALE_GLASSES, eyeGap, lensOn, SPAN, useBodyImage } from "../../lib/nook3d";
import { useNook, type Expression, type Status } from "../../store/nook";
import { Eye, eyesFor } from "./Eye";
import { Hands } from "./Hands";
import { Mouth } from "./Mouth";
import { Props, type SleepStyle } from "./Props";
import { statusColor } from "../../lib/palette";

/** Durum renkleri (rozet, alt ton, ada parıltısı) — renk körlüğü paletine göre */
export const STATUS_COLOR = new Proxy({} as Record<Status, string>, { get: (_, k) => statusColor(k as Status) });

const sec = (ms: number) => ms / 1000;
/** Dosya gelince yüz kutuya dönüşür (seçilen gövde ne olursa olsun). */
const BOX_SHAPE: Partial<Record<Expression, BodyShape>> = {
  hungry: { width: 26, height: 23, borderRadius: radii([7, 7, 7, 7]) },
  chewing: { width: 26, height: 22, borderRadius: radii([7, 7, 7, 7]) },
};

/** CSS gövde (3B resim yoksa): gerinirken basılıp yayılır, uyurken biraz çöker. */
function bodyFor(expression: Expression): BodyShape {
  const box = BOX_SHAPE[expression];
  if (box) return box;
  if (expression === "stretch") return roundBody(28, 21);
  if (expression === "sleepy") return roundBody(24, 23);
  return roundBody(FACE);
}

/** 3B gövde resminin aynı esnemeleri */
const IMG_SQUASH: Partial<Record<Expression, { scaleX: number; scaleY: number }>> = {
  stretch: { scaleX: 1.14, scaleY: 0.86 },
  sleepy: { scaleX: 1, scaleY: 0.96 },
};

/** 3B gövde resminin ekrandaki boyu (px) ve çizim çözünürlüğü (büyük adada da keskin kalsın) */
const IMG = (FACE * SPAN) / 2;
const IMG_RES = 512;
/** Bütün yüzün hareketleri. */
const BODY: Record<Expression, TargetAndTransition> = {
  idle: { x: 0, y: 0, rotate: 0, scaleX: 1, scaleY: 1 },
  // Yayında: mikrofona konuşurken hafifçe sallanır
  live: { x: 0, scaleX: 1, scaleY: 1, y: [0, -0.8, 0], rotate: [0, -3, 0, 3, 0], transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } },
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
  // Bir sola bir sağa bakınır
  lookAround: { x: 0, y: 0, rotate: [0, -6, -6, 6, 6, 0], transition: { duration: sec(ANTIC_MS.lookAround), times: [0, 0.15, 0.4, 0.55, 0.85, 1], ease: "easeInOut" } },
  // "Ha… ha…" geriye kaykılır, "hapşu!" öne fırlar
  sneeze: {
    x: 0,
    y: [0, -1, -2, 2.5, 0],
    rotate: [0, -6, -10, 9, 0],
    scaleX: [1, 0.98, 0.96, 1.08, 1],
    scaleY: [1, 1.03, 1.05, 0.9, 1],
    transition: { duration: sec(ANTIC_MS.sneeze), times: [0, 0.3, 0.52, 0.6, 1] },
  },
  // Zıplayıp kendi etrafında döner
  spin: { x: 0, y: [0, -5, -5, 0], rotate: [0, 0, 360, 360], transition: { duration: sec(ANTIC_MS.spin), times: [0, 0.2, 0.8, 1], ease: "easeInOut" } },
  gum: { x: 0, rotate: 0, y: [0, -0.5, 0, 1.5, 0], transition: { duration: sec(ANTIC_MS.gum), times: [0, 0.6, 0.86, 0.9, 1] } },
  read: { x: 0, rotate: [0, -3, 3, -3, 0], y: 0.5, transition: { duration: sec(ANTIC_MS.read), ease: "easeInOut" } },
  // Ateşin başına geçip (yer açmak için biraz sağa) ona doğru eğilir
  campfire: { x: 4, y: 0.5, rotate: [-5, -7, -5], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } },
  umbrella: { x: 0, rotate: 0, y: [0, -0.8, 0], transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } },
  // Sıcaktan erimiş gibi basık
  hot: { x: 0, rotate: 0, y: 1, scaleX: 1.04, scaleY: 0.95 },
  note: { x: 0, y: 0.5, rotate: [-2, 1, -2], transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" } },
  writing: { x: 0, y: 0.5, rotate: [-2, 1, -2], transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" } },
  magnify: { x: 0, y: 0, rotate: [0, 4, -2, 0], transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" } },
  // Masada yazarken hafifçe ileri geri sallanır
  focused: { x: 0, rotate: 0, scaleX: 1, scaleY: 1, y: [0.4, 1, 0.4], transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" } },
  // Hum dinlerken (DJ): ritimle kafa sallar, salınır, zıplar, kulaklığa eğilir, plağı çizer, arada döner
  djNod: { x: 0, scaleX: 1, scaleY: 1, y: [0, 1.8, 0], rotate: [0, 5, 0], transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" } },
  djSway: { scaleX: 1, scaleY: 1, x: [-2.2, 2.2, -2.2], y: [0, -0.8, 0, -0.8, 0], rotate: [-9, 9, -9], transition: { duration: 1.3, repeat: Infinity, ease: "easeInOut" } },
  djBounce: { x: 0, rotate: 0, y: [0, -4, 0], scaleX: [1.06, 0.96, 1.06], scaleY: [0.93, 1.05, 0.93], transition: { duration: 0.48, repeat: Infinity, ease: "easeOut" } },
  djEar: { x: 0, scaleX: 1, scaleY: 1, rotate: [11, 14, 11], y: [0, 1, 0], transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" } },
  djScratch: { scaleX: 1, scaleY: 1, x: 0, y: [-1.5, -1, -1.5], rotate: [-3, 3, -3], transition: { duration: 0.42, repeat: Infinity, ease: "easeInOut" } },
  djSpin: { x: 0, scaleX: 1, scaleY: 1, y: [0, -1.5, 0, -1.5, 0, -3, -3, 0], rotate: [0, -6, 0, 6, 0, 0, 360, 360], transition: { duration: 2.6, repeat: Infinity, times: [0, 0.12, 0.25, 0.37, 0.5, 0.6, 0.88, 1], ease: "easeInOut" } },
  // Cama yaklaşıp vurur: her vuruşta biraz öne gelir
  knock: {
    x: 0,
    y: 0,
    rotate: [0, 0, -3, 0, -3, 0],
    scaleX: [1, 1, 1.05, 1, 1.05, 1],
    scaleY: [1, 1, 1.05, 1, 1.05, 1],
    transition: { duration: 1.6, repeat: Infinity, times: [0, 0.12, 0.2, 0.32, 0.4, 0.6], ease: "easeOut" },
  },
};

/**
 * Müzik çalarken dans figürleri — birkaç saniyede bir değişir (eller: Hands'teki DANCE_HANDS).
 * Sallanma, zıplama, kafa sallama, yan adım, fırıldak.
 */
const DANCES: TargetAndTransition[] = [
  { x: 0, y: [0, -1.5, 0], rotate: [0, -4, 0, 4, 0], scaleX: 1, scaleY: 1, transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" } },
  { x: 0, rotate: 0, y: [0, -4, 0], scaleX: [1, 0.96, 1.05], scaleY: [1, 1.05, 0.94], transition: { duration: 0.5, repeat: Infinity, ease: "easeOut" } },
  { x: 0, scaleX: 1, scaleY: 1, y: [0, 1.2, 0], rotate: [0, 9, 0], transition: { duration: 0.45, repeat: Infinity, ease: "easeInOut" } },
  { scaleX: 1, scaleY: 1, x: [0, -5, 0, 5, 0], y: [0, -1.5, 0, -1.5, 0], rotate: [0, -6, 0, 6, 0], transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } },
  { x: 0, scaleX: 1, scaleY: 1, y: [0, -2, 0], rotate: [0, 360], transition: { duration: 1.2, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" } },
];
/** Bir dans figürü en az/en çok bu kadar sürer */
const DANCE_MS = [7000, 13000];

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
  sneeze: { char: "!", className: "text-amber-200" },
  campfire: { char: "~", className: "text-orange-200/70" },
  djNod: { char: "♪", className: "text-white/80" },
  djSway: { char: "♫", className: "text-white/80" },
  djBounce: { char: "♪", className: "text-pink-300" },
  djEar: { char: "♫", className: "text-sky-300" },
  djScratch: { char: "♪", className: "text-white/80" },
  djSpin: { char: "♫", className: "text-amber-200" },
};

/** Bazı ifadelerde gözler bir yöne kayar (aşağı bakmak, yan bakmak). */
const EYE_OFFSET: Partial<Record<Expression, TargetAndTransition>> = {
  bored: { x: 0, y: 3.5 },
  lookAround: { x: [0, -3, -3, 3, 3, 0], y: 0, transition: { duration: sec(ANTIC_MS.lookAround), times: [0, 0.15, 0.4, 0.55, 0.85, 1], ease: "easeInOut" } },
  // Satırları okur: sola-sağa, aşağıda
  read: { y: 2.6, x: [-1.6, 1.6, -1.6, 1.6, -1.6, 1.6, -1.6], transition: { duration: sec(ANTIC_MS.read), ease: "linear" } },
  note: { x: -1.2, y: 2.4 },
  writing: { x: -1.2, y: 2.4 },
  campfire: { x: -2.4, y: 1 },
  magnify: { x: 1.2, y: 0 },
  suspicious: { x: 3, y: 0 },
  shy: { x: 0, y: 1.5 },
  volUp: { x: 2.6, y: 0 },
  volDown: { x: 2.4, y: 0.6 },
  focused: { x: -0.8, y: 2.2 },
  djScratch: { x: 0, y: 2.6 },
};

/** Gözleri kapalı/özel çizimli ifadeler — imleç takibi yok. */
const NO_LOOK = new Set<Expression>(["djNod", "djSway", "djBounce", "djEar", "djScratch", "djSpin", "focused", "knock", "lookAround", "sneeze", "spin", "read", "campfire", "note", "writing", "magnify", "hot", "volUp", "volDown", "loud", "muted", "sleepy", "chewing", "yawn", "stretch", "giggle", "hum", "love", "happy", "sulk", "dizzy", "thinking", "slap", "shy", "suspicious", "bored", "downloading", "drink"]);
/** Kendiliğinden göz kırpan ifadeler. */
const BLINKS = new Set<Expression>(["focused", "knock", "idle", "drowsy", "tired", "wander", "hop", "surprised", "hungry", "lookAround", "gum", "umbrella", "magnify", "read", "note", "writing"]);

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
  /** Gövde, gözler, gözlük, aksesuarlar */
  look?: Look;
  /** Sürükleme sınırı (ada) — Nook bunun içinde tutulup fırlatılabilir */
  bounds?: RefObject<HTMLElement | null>;
}

export function Nook({ expression, status = null, grooving = false, color = "#FFFFFF", look: wear = DEFAULT_LOOK, bounds }: NookProps) {
  const ref = useRef<HTMLDivElement>(null);
  const look = useLook(ref, !NO_LOOK.has(expression));
  const lid = useBlink(BLINKS.has(expression));
  const press = useGrab();

  // --- 3B kafa çevirme: gözler kenara kayar ve kısalır, ışık ters yöne gider
  const img = useBodyImage(wear, color, IMG_RES);
  const isBox = expression === "hungry" || expression === "chewing";
  /** 3B gövde görünüyor (kutuya dönüşünce CSS kutu devralır) */
  const solid = !!img && !isBox;
  /** Gözlük resmin içinde sabit: gözler camın dışına kaymasın diye az oynar */
  const glassesOn = solid && lensOn(wear);
  // 3B gövdede gözler biçime göre yerleşir (kalpte yukarıda, üçgende aşağıda)
  const anchor = ANCHORS[wear.shape];
  const eyeY = solid ? -anchor.y * (FACE / 2) : 1.2;
  const baseGap = solid ? eyeGap(wear) * (FACE / 2) : 3.9;
  // Görünüm değişince imleç kıpırdamasa da gözler hemen yerine geçsin
  const eyeYMv = useMotionValue(eyeY);
  const gapMv = useMotionValue(baseGap);
  const moveMv = useMotionValue(glassesOn ? 0.12 : 1);
  useEffect(() => {
    eyeYMv.set(eyeY);
    gapMv.set(baseGap);
    moveMv.set(glassesOn ? 0.12 : 1);
  }, [eyeYMv, gapMv, moveMv, eyeY, baseGap, glassesOn]);
  const eyesX = useTransform([look.x, moveMv], ([v, m]: number[]) => v * 6.4 * m);
  const eyesY = useTransform([look.y, moveMv, eyeYMv], ([v, m, y]: number[]) => v * 4.4 * m + y);
  const gap = useTransform([look.x, moveMv, gapMv], ([v, m, g]: number[]) => g * (1 - Math.abs(v) * 0.32 * m));
  const leftX = useTransform([gap, eyesX], ([g, x]: number[]) => x - g);
  const rightX = useTransform([gap, eyesX], ([g, x]: number[]) => x + g);
  const leftScaleX = useTransform([look.x, moveMv], ([v, m]: number[]) => 1 - (Math.max(0, -v) * 0.45 + Math.abs(v) * 0.08) * m);
  const rightScaleX = useTransform([look.x, moveMv], ([v, m]: number[]) => 1 - (Math.max(0, v) * 0.45 + Math.abs(v) * 0.08) * m);
  const hx = useTransform(look.x, (v) => 36 - v * 20);
  const hy = useTransform(look.y, (v) => 30 - v * 18);
  const shade = `color-mix(in srgb, ${color} 62%, #5d5d6b)`;
  const sphere = useMotionTemplate`radial-gradient(circle at ${hx}% ${hy}%, #ffffff 0%, ${color} 34%, ${shade} 100%)`;

  const attentionScale = useTransform([look.attention, moveMv], ([a, m]: number[]) => (1 + a * 0.16 * m) * (m < 1 ? EYE_SCALE_GLASSES : 1));
  const scaleYL = useTransform([lid, attentionScale], ([l, a]: number[]) => l * a);
  const scaleYR = scaleYL;

  // --- Müzik/video çalarken gözler dalgalı ses çubuklarına dönüşür (Grok Bot "▮•▮") ve dans eder
  const wave = grooving && expression === "idle";
  const dance = useDance(wave);
  const sleepStyle = useSleepStyle(expression);

  // --- İmleç yüzün dibinde 1,5 sn oyalanırsa utanır
  useShyWhenStaredAt(look.attention, expression);
  const leftSX = useTransform([leftScaleX, attentionScale], ([s, a]: number[]) => s * a);
  const rightSX = useTransform([rightScaleX, attentionScale], ([s, a]: number[]) => s * a);

  const [left, right, shineL, shineR] = eyesFor(expression, wear.eyes);
  const body = bodyFor(expression);
  // Balon şişirerek uyurken "z" çıkmaz
  const floater = expression === "sleepy" && sleepStyle === "bubble" ? undefined : FLOATER[expression];
  const tint = status ? STATUS_COLOR[status] : null;
  /** Güneş gözlüğünün ardındaki gözler görünmez */
  const hideEyes = solid && wear.glasses === "shades";

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
        animate={wave ? DANCES[dance] : expression === "sleepy" && sleepStyle === "nap" ? NAP : BODY[expression]}
      >
        <Hands expression={expression} dance={wave ? dance : null} color={color} />

        {/* 3B gövde: biçim, doku ve aksesuarlar tek resimde (lib/nook3d) */}
        {img && (
          <motion.div
            className="pointer-events-none absolute"
            style={{ left: (FACE - IMG) / 2, top: (FACE - IMG) / 2, width: IMG, height: IMG }}
            initial={false}
            animate={{ opacity: isBox ? 0 : 1, ...(IMG_SQUASH[expression] ?? { scaleX: 1, scaleY: 1 }) }}
            transition={spring.eye}
          >
            <img src={img} alt="" draggable={false} className="absolute inset-0 h-full w-full" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.55))" }} />
            {/* Duruma göre alttan renk tonu — gövdenin biçimiyle kırpılır */}
            <motion.div
              className="absolute inset-0"
              style={{ WebkitMaskImage: `url(${img})`, maskImage: `url(${img})`, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }}
              initial={false}
              animate={{
                opacity: tint ? 0.75 : 0,
                backgroundImage: `radial-gradient(42% 30% at 50% 74%, ${tint ?? "#ffffff"} 0%, transparent 100%)`,
              }}
              transition={{ duration: 0.4 }}
            />
          </motion.div>
        )}

        {/* Yüz: CSS küre (3B yoksa) ya da kutu; 3B gövdede yalnızca gözlerin katmanı */}
        <motion.div
          className={`absolute left-1/2 top-1/2 ${solid ? "" : "overflow-hidden"}`}
          style={{
            backgroundImage: solid ? "none" : sphere,
            translateX: "-50%",
            translateY: "-50%",
            boxShadow: solid ? "none" : "0 2px 6px rgba(0,0,0,0.55), inset -1.5px -2.5px 4px rgba(0,0,0,0.16)",
          }}
          initial={false}
          animate={{ ...body }}
          transition={spring.eye}
        >
          {/* Duruma göre alttan renk tonu */}
          {!solid && (
            <motion.div
              className="pointer-events-none absolute inset-0"
              initial={false}
              animate={{
                opacity: tint ? 0.85 : 0,
                backgroundImage: `radial-gradient(120% 75% at 50% 112%, ${tint ?? "#ffffff"} 0%, transparent 72%)`,
              }}
              transition={{ duration: 0.4 }}
            />
          )}

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
            <motion.div className="absolute inset-0" initial={false} animate={damp(EYE_OFFSET[expression] ?? { x: 0, y: 0 }, glassesOn ? 0.25 : 1)} transition={spring.eye}>
              <motion.div className="absolute inset-0" initial={false} animate={{ opacity: wave || hideEyes ? 0 : 1 }} transition={{ duration: 0.15 }}>
                {/* Göz bandı sol gözü örter */}
                {!(solid && wear.glasses === "eyepatch") && <Eye shape={left} shine={shineL} x={leftX} scaleX={leftSX} scaleY={scaleYL} />}
                <Eye shape={right} shine={shineR} x={rightX} scaleX={rightSX} scaleY={scaleYR} />
              </motion.div>
            </motion.div>
          </motion.div>
          <Mouth expression={expression} />

          {/* Gözlerin yerine geçen çizimler gözlerin hizasında; gözlükte camlara sığsın */}
          <div className="pointer-events-none absolute inset-0" style={{ transform: `translateY(${eyeY - 1.2}px) scale(${glassesOn ? 0.7 : 1})` }}>
            <AnimatePresence>
              {wave && <WaveEyes key="wave" />}
              {expression === "thinking" && <Orbit key="orbit" />}
              {expression === "dizzy" && <Spirals key="spirals" />}
              {expression === "downloading" && <ProgressDots key="dl" />}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Eşyalar: yorgan, kitap, kamp ateşi, şemsiye, kâğıt-kalem, büyüteç… */}
        <Props expression={expression} sleepStyle={sleepStyle} />

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

/** Gözlerin kayma hareketini (x, y) k kadar küçült — gözlüklüyken camdan taşmasın */
function damp(t: TargetAndTransition, k: number): TargetAndTransition {
  if (k === 1) return t;
  const scale = (v: unknown) => (typeof v === "number" ? v * k : Array.isArray(v) ? v.map((n) => (typeof n === "number" ? n * k : n)) : v);
  return { ...t, x: scale(t.x), y: scale(t.y) } as TargetAndTransition;
}

/** Uyurken bir yana devrilmiş şekerleme */
const NAP: TargetAndTransition = { x: 0, rotate: [-16, -18, -16], y: [1.5, 2.2, 1.5], transition: { duration: 3.6, repeat: Infinity, ease: "easeInOut" } };
const SLEEP_STYLES: SleepStyle[] = ["blanket", "bubble", "nap"];

/** Her uykuya dalışta farklı bir uyku: yorgan çeker, burnundan balon şişirir ya da yana devrilir. */
function useSleepStyle(expression: Expression): SleepStyle {
  const [style, setStyle] = useState<SleepStyle>(() =>
    import.meta.env.DEV && new URLSearchParams(location.search).get("sleep")
      ? (new URLSearchParams(location.search).get("sleep") as SleepStyle)
      : SLEEP_STYLES[Math.floor(Math.random() * SLEEP_STYLES.length)],
  );
  const prev = useRef(expression);
  useEffect(() => {
    if (expression === "sleepy" && prev.current !== "sleepy" && !(import.meta.env.DEV && location.search.includes("sleep="))) {
      setStyle((cur) => {
        const others = SLEEP_STYLES.filter((s) => s !== cur);
        return others[Math.floor(Math.random() * others.length)];
      });
    }
    prev.current = expression;
  }, [expression]);
  return style;
}

/** Müzik sürdükçe birkaç saniyede bir başka dans figürüne geçer. */
function useDance(on: boolean): number {
  const [dance, setDance] = useState(() => (import.meta.env.DEV ? Number(new URLSearchParams(location.search).get("dance") ?? 0) : 0));
  useEffect(() => {
    if (!on) return;
    let t = 0;
    const wait = () => DANCE_MS[0] + Math.random() * (DANCE_MS[1] - DANCE_MS[0]);
    const next = () => {
      setDance((d) => (d + 1 + Math.floor(Math.random() * (DANCES.length - 1))) % DANCES.length);
      t = window.setTimeout(next, wait());
    };
    t = window.setTimeout(next, wait());
    return () => window.clearTimeout(t);
  }, [on]);
  return dance;
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
