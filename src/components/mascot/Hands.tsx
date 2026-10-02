import { motion, type TargetAndTransition } from "motion/react";
import { ANTIC_MS } from "../../hooks/useAntics";
import { FACE } from "../../lib/layout";
import type { Expression } from "../../store/nook";

/**
 * Gövdeden kopuk, yüzen küçük eller (Grok Bot / Rayman gibi).
 * Konumlar yüzün merkezine göre; `side` -1 sol, +1 sağ.
 */
type Pose = TargetAndTransition;
const sec = (ms: number) => ms / 1000;

const HIDE: Pose = { scale: 0, x: 0, y: 3, rotate: 0, opacity: 0 };
const SETTLE = { type: "spring", stiffness: 420, damping: 18 } as const;

/**
 * Sonsuz tekrarda yalnızca gerçekten değişen (dizi) değerler döner. Sabit opacity/scale da
 * "tekrarla" denirse Motion onu tarayıcıya sonsuz animasyon olarak verir ve tarayıcı ekran
 * hızında (240 Hz) boşuna çizer — Nook dans ederken WebView'un yükünün asıl kaynağı buydu.
 */
const show = (p: Pose): Pose => {
  const pose: Pose = { scale: 1, opacity: 1, rotate: 0, x: 0, y: 2, ...p };
  const t = p.transition;
  if (!t?.repeat) return pose;
  const fixed = Object.keys(pose).filter((k) => k !== "transition" && !Array.isArray(pose[k as keyof Pose]));
  return { ...pose, transition: { ...t, ...Object.fromEntries(fixed.map((k) => [k, SETTLE])) } };
};

/** [sol, sağ] */
const POSES: Partial<Record<Expression, [Pose, Pose]>> = {
  // Selam: sağ el sallar
  hop: [
    show({ y: 3 }),
    show({
      y: [2, -7, -5, -7, -3],
      rotate: [0, -35, 10, -35, 0],
      transition: { duration: sec(ANTIC_MS.hop) + 0.2, ease: "easeInOut" },
    }),
  ],
  // Kutuyken kollar açık, dosyayı karşılar
  hungry: [show({ x: -3, y: -6, rotate: 30 }), show({ x: 3, y: -6, rotate: -30 })],
  // Çiğnerken kutuya sarılır
  chewing: [show({ x: 2.5, y: 1 }), show({ x: -2.5, y: 1 })],
  happy: [
    show({ y: [-1, -6, -1], transition: { duration: 0.45, ease: "easeOut" } }),
    show({ y: [-1, -6, -1], transition: { duration: 0.45, ease: "easeOut", delay: 0.06 } }),
  ],
  love: [show({ x: 3.5, y: -1, rotate: 20 }), show({ x: -3.5, y: -1, rotate: -20 })],
  surprised: [show({ x: -2, y: -8, rotate: 25 }), show({ x: 2, y: -8, rotate: -25 })],
  giggle: [
    show({ x: 3, y: [5, 3, 5, 3, 5], transition: { duration: sec(ANTIC_MS.giggle) } }),
    show({ x: -3, y: [5, 3, 5, 3, 5], transition: { duration: sec(ANTIC_MS.giggle) } }),
  ],
  dizzy: [
    show({ rotate: [0, 60, -40, 50, 0], y: [2, -3, 4, -2, 2], transition: { duration: sec(ANTIC_MS.dizzy), ease: "easeInOut" } }),
    show({ rotate: [0, -50, 40, -60, 0], y: [2, 4, -3, 3, 2], transition: { duration: sec(ANTIC_MS.dizzy), ease: "easeInOut" } }),
  ],
  // Kızgın: eller belde
  annoyed: [show({ x: 3, y: 6, rotate: -20 }), show({ x: -3, y: 6, rotate: 20 })],
  // Düşünürken: sağ el çenede
  thinking: [HIDE, show({ x: -7, y: 10, rotate: -15 })],
  stretch: [
    show({ x: [0, -4, -4, 0], y: [2, -10, -10, 2], rotate: [0, 40, 40, 0], transition: { duration: sec(ANTIC_MS.stretch) } }),
    show({ x: [0, 4, 4, 0], y: [2, -10, -10, 2], rotate: [0, -40, -40, 0], transition: { duration: sec(ANTIC_MS.stretch) } }),
  ],
  // Esnerken ağzını kapatır
  yawn: [HIDE, show({ x: -8, y: [2, 8, 8, 2], transition: { duration: sec(ANTIC_MS.yawn), times: [0, 0.3, 0.8, 1] } })],
  wander: [
    show({ y: [2, 0, 2, 0, 2], transition: { duration: sec(ANTIC_MS.wander), ease: "easeInOut" } }),
    show({ y: [0, 2, 0, 2, 0], transition: { duration: sec(ANTIC_MS.wander), ease: "easeInOut" } }),
  ],
  wink: [HIDE, show({ x: 2, y: -2, rotate: -25 })],
  // Utangaç: elleriyle yanaklarını kapatır
  shy: [show({ x: 4.5, y: 4, rotate: 25 }), show({ x: -4.5, y: 4, rotate: -25 })],
  // Su içerken: sağ el bardağı ağzına götürür
  drink: [show({ x: 2, y: 4 }), show({ x: -7, y: [6, 5, 5, 5, 6], rotate: [-10, -40, -40, -40, -10], transition: { duration: sec(ANTIC_MS.drink), times: [0, 0.2, 0.5, 0.8, 1] } })],
  // Şüpheci: el çenede
  suspicious: [HIDE, show({ x: -6.5, y: 10, rotate: -10 })],
  // Sıkılmış: eller sarkık
  bored: [show({ y: 8, x: 1, rotate: 10 }), show({ y: 8, x: -1, rotate: -10 })],
  // Konuşurken elleriyle anlatır
  talking: [
    show({ x: -1, y: [3, 0, 3], rotate: [10, 30, 10], transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" } }),
    show({ x: 1, y: [0, 3, 0], rotate: [-30, -10, -30], transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" } }),
  ],
  // Ses açılınca: sağ el bara uzanıp iter
  volUp: [show({ x: 1, y: 3, rotate: 10 }), show({ x: 5.5, y: 1, rotate: -20 })],
  // Kısılınca: sağ el geri çeker
  volDown: [show({ x: 0, y: 3, rotate: 10 }), show({ x: 1.5, y: 2.5, rotate: 25 })],
  // Çok yüksek: elleriyle kulaklarını kapatır
  loud: [
    show({ x: 3.8, y: [-1.5, -0.5, -1.5], rotate: 15, transition: { duration: 0.25, repeat: Infinity } }),
    show({ x: -3.8, y: [-0.5, -1.5, -0.5], rotate: -15, transition: { duration: 0.25, repeat: Infinity } }),
  ],
  // Sessiz: "şşş" — sağ el ağzında
  muted: [HIDE, show({ x: -8.5, y: 5.5, rotate: -12 })],
  // Etrafa bakınır: sağ el alnında siper
  lookAround: [HIDE, show({ x: -5.5, y: -6, rotate: -35 })],
  // Hapşırırken iki eli ağzına gider
  sneeze: [
    show({ x: [0, 0, 5, 0], y: [2, 2, 6, 2], transition: { duration: sec(ANTIC_MS.sneeze), times: [0, 0.4, 0.55, 1] } }),
    show({ x: [0, 0, -5, 0], y: [2, 2, 6, 2], transition: { duration: sec(ANTIC_MS.sneeze), times: [0, 0.4, 0.55, 1] } }),
  ],
  // Dönerken kollar açık
  spin: [show({ x: -2, y: -2, rotate: 30 }), show({ x: 2, y: -2, rotate: -30 })],
  // Ateşe ellerini uzatıp ısıtır
  campfire: [
    show({ x: -3.5, y: [3.5, 2.5, 3.5], rotate: [20, 5, 20], transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" } }),
    HIDE,
  ],
  // Kitap, kâğıt-kalem, büyüteç, şemsiye, yelpaze ve yorgandaki eller eşyayla birlikte çizilir
  read: [HIDE, HIDE],
  note: [HIDE, HIDE],
  writing: [HIDE, HIDE],
  magnify: [show({ x: 1, y: 5, rotate: 10 }), HIDE],
  umbrella: [show({ x: 1, y: 5, rotate: 10 }), HIDE],
  hot: [HIDE, show({ x: -1, y: 6, rotate: -10 })],
  // Alarm: iki el havada sallanır
  alarm: [
    show({ x: -2, y: [-6, -9, -6], rotate: [25, 45, 25], transition: { duration: 0.3, repeat: Infinity } }),
    show({ x: 2, y: [-9, -6, -9], rotate: [-45, -25, -45], transition: { duration: 0.3, repeat: Infinity } }),
  ],
};

/** Müzik çalarken dans figürleri (Nook.tsx'teki DANCES ile aynı sırada). */
export const DANCE_HANDS: [Pose, Pose][] = [
  // Sallanma: eller yanlarda salınır
  [
    show({ y: [3, 1, 3], rotate: [10, -10, 10], transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" } }),
    show({ y: [1, 3, 1], rotate: [10, -10, 10], transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" } }),
  ],
  // Zıplama: eller havada pompalar
  [
    show({ x: -1, y: [-5, -9, -5], rotate: 30, transition: { duration: 0.5, repeat: Infinity, ease: "easeOut" } }),
    show({ x: 1, y: [-9, -5, -9], rotate: -30, transition: { duration: 0.5, repeat: Infinity, ease: "easeOut" } }),
  ],
  // Kafa sallama: eller "rock" işareti gibi yukarıda
  [
    show({ x: -1.5, y: -7, rotate: 40 }),
    show({ x: 1.5, y: [-7, -9, -7], rotate: -40, transition: { duration: 0.45, repeat: Infinity } }),
  ],
  // Yan adım: eller ters yönde savrulur
  [
    show({ x: [0, 3, 0, -2, 0], y: [2, -1, 2, 1, 2], transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } }),
    show({ x: [0, 2, 0, -3, 0], y: [2, 1, 2, -1, 2], transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } }),
  ],
  // Fırıldak: kollar açık
  [show({ x: -2, y: -3, rotate: 35 }), show({ x: 2, y: -3, rotate: -35 })],
];

export function Hands({ expression, dance = null }: { expression: Expression; dance?: number | null }) {
  const [l, r] = (dance != null ? DANCE_HANDS[dance] : null) ?? POSES[expression] ?? [HIDE, HIDE];
  return (
    <>
      <Hand side={-1} pose={l} />
      <Hand side={1} pose={r} />
    </>
  );
}

const W = 6.4;
const H = 5.2;

function Hand({ side, pose }: { side: -1 | 1; pose: Pose }) {
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
      style={{
        width: W,
        height: H,
        marginLeft: side * (FACE / 2 + 4.5) - W / 2,
        marginTop: -H / 2,
        background: "radial-gradient(circle at 35% 30%, #ffffff 0%, #e4e4ea 55%, #a9a9b4 100%)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.45)",
      }}
      initial={false}
      animate={pose}
      transition={{ type: "spring", stiffness: 420, damping: 18 }}
    />
  );
}
