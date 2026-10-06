import type { CSSProperties } from "react";
import { normalizeColor, normalizeLook, type Look } from "../../lib/look";
import { ANCHORS, EYE_SCALE_GLASSES, eyeGap, SPAN, useBodyImageQueued } from "../../lib/nook3d";
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
}) {
  const img = useBodyImageQueued(look, color, res ?? figureRes(size));
  const [eye, , shine] = eyesFor(expression, look.eyes);
  const span = (size * SPAN) / 2;
  const unit = size / 2; // 1 birim (yüz yarıçapı) kaç px
  const a = ANCHORS[look.shape];
  const k = unit / 12; // göz ölçüleri yüz yarıçapı 12 px'e göre
  const lens = look.glasses === "none" ? 1 : EYE_SCALE_GLASSES;
  return (
    // Konumu çağıran belirleyebilsin (absolute); yoksa relative. İkisi birden verilirse CSS sırası relative'i seçer ve Nook kayar.
    <span className={`${/\b(absolute|fixed)\b/.test(className) ? "" : "relative "}inline-block shrink-0 ${className}`} style={{ width: size, height: size, ...style }}>
      {img ? (
        <span className="nook-fade absolute" style={{ width: span, height: span, left: (size - span) / 2, top: (size - span) / 2 }}>
          <img src={img} alt="" draggable={false} className="absolute inset-0 h-full w-full" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }} />
          {look.glasses !== "shades" &&
            [-1, 1].map((side) => (
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
            ))}
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
      ) : null}
    </span>
  );
}

/** Kullanıcının kendi Nook'u, küçük */
export function MyNook({ size, expression }: { size: number; expression?: Expression }) {
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  return <NookFigure look={look} color={color} size={size} expression={expression} />;
}
