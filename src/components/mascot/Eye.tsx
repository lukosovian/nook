import { motion, type MotionValue } from "motion/react";
import { spring } from "../../lib/motion";
import type { Expression } from "../../store/nook";

/** Göz şekli: boyut + 4 köşe yarıçapı + dikey kayma (düşük göz kapağı için). Ölçüler küre çapı 24'e göre. */
export type EyeShape = {
  width: number;
  height: number;
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomRightRadius: number;
  borderBottomLeftRadius: number;
  marginTop: number;
};

/** Hap göz */
const pill = (w: number, h: number, dy = 0, r = Math.min(w, h) / 2): EyeShape => ({
  width: w,
  height: h,
  borderTopLeftRadius: r,
  borderTopRightRadius: r,
  borderBottomRightRadius: r,
  borderBottomLeftRadius: r,
  marginTop: dy,
});

/** Kapalı mutlu göz "∩" */
const arch = (w: number, h: number): EyeShape => ({
  width: w,
  height: h,
  borderTopLeftRadius: w / 2,
  borderTopRightRadius: w / 2,
  borderBottomRightRadius: 0.4,
  borderBottomLeftRadius: 0.4,
  marginTop: -0.5,
});

const OPEN = pill(3.6, 7.6);
const SHUT = pill(5, 1.6, 1);
const HIDDEN = pill(0.1, 0.1);

/** [sol, sağ] göz. */
export const EYES: Record<Expression, [EyeShape, EyeShape]> = {
  idle: [OPEN, OPEN],
  sleepy: [SHUT, SHUT],
  // Kutu olunca yukarı, gelen dosyaya bakan kocaman gözler
  hungry: [pill(4.4, 8.8), pill(4.4, 8.8)],
  chewing: [arch(5, 3), arch(5, 3)],
  happy: [arch(5, 3.2), arch(5, 3.2)],
  tired: [pill(4, 3.4, 2), pill(4, 3.4, 2)],
  drowsy: [pill(3.8, 4.6, 1.2), pill(3.8, 4.6, 1.2)],
  sulk: [pill(4.4, 2.4, 1.5), pill(4.4, 2.4, 1.5)],
  giggle: [arch(5, 3.2), arch(5, 3.2)],
  surprised: [pill(4.2, 9.2), pill(4.2, 9.2)],
  yawn: [SHUT, SHUT],
  wink: [OPEN, arch(5, 2.6)],
  hum: [arch(5, 2.6), arch(5, 2.6)],
  hop: [OPEN, OPEN],
  wander: [OPEN, OPEN],
  nod: [pill(4, 2.4, 1), pill(4, 2.4, 1)],
  stretch: [SHUT, SHUT],
  love: [arch(5, 3.2), arch(5, 3.2)],
  // Tokat: sıkışmış düz çizgiler
  slap: [pill(5.6, 1.8, 0.5), pill(5.6, 1.8, 0.5)],
  // Kızgın: kısık, aşağıda
  annoyed: [pill(5.2, 2.2, 1), pill(5.2, 2.2, 1)],
  // Bunlarda gözlerin yerine özel çizimler var (yörünge, spiral)
  dizzy: [HIDDEN, HIDDEN],
  thinking: [HIDDEN, HIDDEN],
  alarm: [pill(4.4, 9.4), pill(4.4, 9.4)],
  // Utangaç: küçük nokta gözler (yanaklar pembeleşir)
  shy: [pill(3.2, 3.2, 0.5), pill(3.2, 3.2, 0.5)],
  // Şüpheci: "– •" bir göz kısık, diğeri nokta
  suspicious: [pill(4.8, 1.8, 0.5), pill(3.4, 3.4)],
  // Sıkılmış: aşağı bakan kısa gözler
  bored: [pill(3.6, 4.6), pill(3.6, 4.6)],
  // İndirirken gözlerin yerine sırayla dolan noktalar
  downloading: [HIDDEN, HIDDEN],
  talking: [OPEN, OPEN],
  // Ses açılırken bara bakan dikkatli gözler
  volUp: [pill(3.8, 7.8), pill(3.8, 7.8)],
  // Kısılırken biraz kısık
  volDown: [pill(3.8, 5.4, 0.8), pill(3.8, 5.4, 0.8)],
  // Çok yüksek: gözlerini sıkar "> <"
  loud: [pill(5.4, 1.8, 0.4), pill(5.4, 1.8, 0.4)],
  // Su içerken keyifle kapalı gözler
  drink: [arch(5, 3), arch(5, 3)],
  // Sessiz: huzurla kapalı gözler
  muted: [arch(5, 2.6), arch(5, 2.6)],
};

interface EyeProps {
  shape: EyeShape;
  scaleX: MotionValue<number>;
  scaleY: MotionValue<number>;
  x: MotionValue<number>;
}

/**
 * Tek göz. Konumu ve 3B kısalması (scaleX) Nook'tan gelir.
 * Sıfır boyutlu bir merkez noktası üzerinde durur — şekli değişse de ortası kaymaz.
 */
export function Eye({ shape, scaleX, scaleY, x }: EyeProps) {
  return (
    <motion.div className="absolute left-1/2 top-1/2 flex h-0 w-0 items-center justify-center" style={{ x }}>
      <motion.div
        className="shrink-0 bg-black"
        style={{ scaleX, scaleY }}
        initial={false}
        animate={shape}
        transition={spring.eye}
      />
    </motion.div>
  );
}
