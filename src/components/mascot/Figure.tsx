import { useState, type ComponentType, type CSSProperties } from "react";
import { motion } from "motion/react";
import { normalizeColor, normalizeLook, type Look } from "../../lib/look";
import { ANCHORS, EYE_SCALE_GLASSES, eyeGap, hasWebGL, hidesEyes, lensOn, SPAN, useBodyImageQueued } from "../../lib/nook3d";
import { useNook, type Expression } from "../../store/nook";
import { eyesFor } from "./Eye";

/** Küçük Nook'un çizim çözünürlüğü (önceden çizerken de aynısı kullanılır) */
export const figureRes = (size: number) => (size > 40 ? 256 : 160);

/**
 * Kıpırdamayan küçük 3B Nook: büyük Nook'la aynı gövde resmi ve gözler. `size` gövdenin çapı (px);
 * şapka, kulaklık, papyon bu kutunun dışına taşar. Seçenek kartları, tanıtım, çipler için.
 */
export function NookFigure({
  look,
  color,
  size,
  expression = "idle",
  className = "",
  style,
  smile = false,
  res,
  alive = false,
  Body,
}: {
  look: Look;
  color: string;
  size: number;
  /** Gözlerin ifadesi (mutlu, kapalı…) */
  expression?: Expression;
  className?: string;
  style?: CSSProperties;
  /** Gözlerin altında küçük bir gülümseme (tanıtımdaki kalabalık için) */
  smile?: boolean;
  /** Çizim çözünürlüğü (varsayılan boya göre 160/256; logo gibi büyük çizimler için daha yüksek) */
  res?: number;
  /** Canlı dursun: ara sıra göz kırpar ve yana bakınır (kalkan sahneleri) */
  alive?: boolean;
  /** Gövde resmini kendisi çizen bileşen (kalkan sahnesi gövdeyi sahnenin malzemesiyle boyar); `px` resmin kenarı */
  Body?: ComponentType<{ src: string; px: number }>;
}) {
  const img = useBodyImageQueued(look, color, res ?? figureRes(size));
  const [eyeL, eyeR, shineL, shineR] = eyesFor(expression, look.eyes);
  const span = (size * SPAN) / 2;
  const unit = size / 2; // 1 birim (yüz yarıçapı) kaç px
  const a = ANCHORS[look.shape];
  const k = unit / 12; // göz ölçüleri yüz yarıçapı 12 px'e göre
  const lens = lensOn(look) ? EYE_SCALE_GLASSES : 1;
  // Her Nook kendi ritminde kırpsın: hepsi aynı anda kırpmasın
  const [rhythm] = useState(() => ({ blink: 2.6 + Math.random() * 3.4, glance: 5 + Math.random() * 6, delay: Math.random() * 3 }));
  const eyeLine = span / 2 - a.y * unit;
  return (
    // Konumu çağıran belirleyebilsin (absolute); yoksa relative. İkisi birden verilirse CSS sırası relative'i seçer ve Nook kayar.
    <span className={`${/\b(absolute|fixed)\b/.test(className) ? "" : "relative "}inline-block shrink-0 ${className}`} style={{ width: size, height: size, ...style }}>
      {img ? (
        <span className="nook-fade absolute" style={{ width: span, height: span, left: (size - span) / 2, top: (size - span) / 2 }}>
          {Body ? <Body src={img} px={span} /> : <img src={img} alt="" draggable={false} className="absolute inset-0 h-full w-full" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }} />}
          {!hidesEyes(look) && (
            <motion.span
              className="absolute inset-0"
              style={{ originY: `${eyeLine}px` }}
              animate={alive && expression !== "sleepy" ? { scaleY: [1, 1, 0.12, 1] } : undefined}
              transition={alive ? { scaleY: { duration: 0.22, times: [0, 0.4, 0.6, 1], repeat: Infinity, repeatDelay: rhythm.blink, delay: rhythm.delay } } : undefined}
            >
              <motion.span
                className="absolute inset-0"
                animate={alive && !lensOn(look) ? { x: [0, 0, unit * 0.09, unit * 0.09, -unit * 0.07, -unit * 0.07, 0] } : undefined}
                transition={alive ? { duration: 3.2, times: [0, 0.1, 0.18, 0.45, 0.53, 0.8, 0.9], repeat: Infinity, repeatDelay: rhythm.glance, delay: rhythm.delay + 1, ease: "easeInOut" } : undefined}
              >
            {/* Göz bandı sol gözü örter */}
            {(look.glasses === "eyepatch" ? [1] : [-1, 1]).map((side) => {
              const eye = side < 0 ? eyeL : eyeR;
              const shine = side < 0 ? shineL : shineR;
              return (
              <span
                key={side}
                className="absolute bg-black"
                style={{
                  left: span / 2 + side * eyeGap(look) * unit,
                  top: span / 2 - a.y * unit,
                  width: eye.width * k,
                  height: eye.height * k,
                  borderRadius: `${eye.borderTopLeftRadius * k}px ${eye.borderTopRightRadius * k}px ${eye.borderBottomRightRadius * k}px ${eye.borderBottomLeftRadius * k}px`,
                  transform: `translate(-50%, calc(-50% + ${(eye.marginTop / 2) * k}px)) rotate(${eye.rotate}deg) scale(${lens})`,
                }}
              >
                {shine && <span className="absolute rounded-full bg-white/90" style={{ width: 1.3 * k, height: 1.3 * k, left: "16%", top: "14%" }} />}
              </span>
              );
            })}
              </motion.span>
            </motion.span>
          )}
          {smile && (
            <span
              className="absolute border-black"
              style={{
                left: span / 2,
                top: span / 2 - a.y * unit + 0.3 * unit,
                width: 0.26 * unit,
                height: 0.13 * unit,
                borderBottomWidth: Math.max(1.2, 0.055 * unit),
                borderRadius: `0 0 ${0.13 * unit}px ${0.13 * unit}px`,
                transform: "translateX(-50%)",
              }}
            />
          )}
        </span>
      ) : alive || !hasWebGL() ? (
        // Sahnedeki Nook'un 3B gövdesi hazırlanırken de düz küre durur: eller ve eşyalar gövdesiz kalmasın
        <FlatNook size={size} color={color} />
      ) : null}
    </span>
  );
}

/** WebGL yoksa (eski ekran kartı, sürücü sorunu) küçük Nook boş kalmasın: düz bir küre ve iki göz */
function FlatNook({ size, color }: { size: number; color: string }) {
  const d = size * 0.86;
  const shade = `color-mix(in srgb, ${color} 62%, #5d5d6b)`;
  const eye = { width: d * 0.1, height: d * 0.2 };
  return (
    <span
      className="absolute rounded-full"
      style={{
        width: d,
        height: d,
        left: (size - d) / 2,
        top: (size - d) / 2,
        background: `radial-gradient(circle at 36% 30%, #ffffff 0%, ${color} 34%, ${shade} 100%)`,
        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
      }}
    >
      {[-1, 1].map((side) => (
        <span
          key={side}
          className="absolute rounded-full bg-black"
          style={{ ...eye, left: d / 2 + side * d * 0.14 - eye.width / 2, top: d * 0.36 }}
        />
      ))}
    </span>
  );
}

/** Kullanıcının kendi Nook'u, küçük */
export function MyNook({ size, expression }: { size: number; expression?: Expression }) {
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  return <NookFigure look={look} color={color} size={size} expression={expression} />;
}
