/**
 * Nook'un giyebildikleri: gözlük, başlık, boyun aksesuarı. Hepsi vektör, gövdeyle aynı
 * ışıkla (sol üstten) gölgelenir — emoji/çıkartma gibi durmasın, yüzün parçası gibi dursun.
 * Koordinatlar 24×24 yüz kutusunda; yüzün merkezi (12, 12).
 */
import { useId, type CSSProperties } from "react";
import { motion, type MotionStyle } from "motion/react";
import { spring } from "../../lib/motion";
import type { BodyShape, GlassesId, HeadId, NeckId } from "../../lib/look";

const light = (c: string, k: number) => `color-mix(in srgb, ${c}, white ${k}%)`;
const dark = (c: string, k: number) => `color-mix(in srgb, ${c}, black ${k}%)`;

/** Gözlük takılınca gözler biraz açılır ki camların ortasına otursun */
export const EYE_GAP = 3.9;
export const EYE_GAP_GLASSES = 4.8;
/** Camın ardında gözler biraz küçülür ki çerçeveyle aralarında boşluk kalsın */
export const EYE_SCALE_GLASSES = 0.82;

const BOX: CSSProperties = { position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" };

/** Yukarıdan aşağı: açık → renk → koyu */
function Shade({ id, c, from = 30, to = 28, vertical = true }: { id: string; c: string; from?: number; to?: number; vertical?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={vertical ? "0" : "1"} y2="1">
      <stop offset="0" style={{ stopColor: light(c, from) }} />
      <stop offset="0.45" style={{ stopColor: c }} />
      <stop offset="1" style={{ stopColor: dark(c, to) }} />
    </linearGradient>
  );
}

const GOLD = ["#fff1b8", "#f2c14e", "#b07a12"] as const;
function Gold({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stopColor={GOLD[0]} />
      <stop offset="0.5" stopColor={GOLD[1]} />
      <stop offset="1" stopColor={GOLD[2]} />
    </linearGradient>
  );
}

// ------------------------------------------------------------------ gözlük

/** Yüzün içinde, gözlerle birlikte kayar (`style`: gözlerin x/y'si). Yüz kutusunun ortasına oturur. */
export function Glasses({ id, accent, style }: { id: GlassesId; accent: string; style?: MotionStyle }) {
  const uid = useId();
  if (id === "none") return null;
  const g = EYE_GAP_GLASSES;
  const L = 12 - g;
  const R = 12 + g;
  return (
    <motion.svg width={24} height={24} viewBox="0 0 24 24" style={{ ...BOX, left: "50%", top: "50%", marginLeft: -12, marginTop: -12, ...style }}>
      <defs>
        <linearGradient id={`${uid}lens`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#3a4258" />
          <stop offset="1" stopColor="#0d0f16" />
        </linearGradient>
        <Gold id={`${uid}gold`} />
      </defs>
      {id === "round" && (
        <g fill="rgba(255,255,255,0.14)" stroke="#24242a" strokeWidth={0.7}>
          <circle cx={L} cy={12} r={4.3} />
          <circle cx={R} cy={12} r={4.3} />
          <path d={`M${L + 4.3} 11.2 Q12 10.2 ${R - 4.3} 11.2`} fill="none" />
          <path d={`M${L - 4.3} 11.4 L-4 10.6 M${R + 4.3} 11.4 L28 10.6`} fill="none" />
          <path d={`M${L - 2.6} 10.2 A3 3 0 0 1 ${L - 0.6} 8.6 M${R - 2.6} 10.2 A3 3 0 0 1 ${R - 0.6} 8.6`} stroke="white" strokeOpacity={0.75} strokeWidth={0.55} strokeLinecap="round" fill="none" />
        </g>
      )}
      {id === "bold" && (
        <g>
          <g fill="rgba(255,255,255,0.1)" stroke={accent} strokeWidth={1.25}>
            <rect x={L - 4.3} y={8} width={8.6} height={7.8} rx={2.4} />
            <rect x={R - 4.3} y={8} width={8.6} height={7.8} rx={2.4} />
            <path d={`M${L + 4.3} 10.8 L${R - 4.3} 10.8 M${L - 4.3} 10.4 L-4 10 M${R + 4.3} 10.4 L28 10`} fill="none" />
          </g>
          {/* Çerçevenin üst kenarında ince ışık */}
          <path d={`M${L - 2.6} 8.9 L${L + 1.6} 8.9 M${R - 2.6} 8.9 L${R + 1.6} 8.9`} stroke="white" strokeOpacity={0.35} strokeWidth={0.4} strokeLinecap="round" />
        </g>
      )}
      {id === "shades" && (
        <g>
          <path
            d={`M${L - 4.2} 9 L${L + 4.2} 9 C${L + 4.4} 12.6 ${L + 3} 15.4 ${L} 15.4 C${L - 3} 15.4 ${L - 4.4} 12.6 ${L - 4.2} 9Z M${R - 4.2} 9 L${R + 4.2} 9 C${R + 4.4} 12.6 ${R + 3} 15.4 ${R} 15.4 C${R - 3} 15.4 ${R - 4.4} 12.6 ${R - 4.2} 9Z`}
            fill={`url(#${uid}lens)`}
            stroke="#101116"
            strokeWidth={0.5}
          />
          <path d={`M-4 9.6 L${L - 4.2} 9.2 L${R + 4.2} 9.2 L28 9.6`} fill="none" stroke="#101116" strokeWidth={0.9} />
          <path d={`M${L - 2.4} 13.4 L${L + 0.2} 10.2 M${R - 2.4} 13.4 L${R + 0.2} 10.2`} stroke="white" strokeOpacity={0.32} strokeWidth={0.7} strokeLinecap="round" />
        </g>
      )}
      {id === "monocle" && (
        <g>
          <path d={`M${R + 2.6} 15.4 Q${R + 5} 20 ${R + 9} 22`} fill="none" stroke={GOLD[2]} strokeWidth={0.4} strokeDasharray="0.7 0.5" />
          <circle cx={R} cy={12} r={4.5} fill="rgba(255,255,255,0.14)" stroke={`url(#${uid}gold)`} strokeWidth={0.85} />
          <path d={`M${R - 2.6} 10.3 A3.2 3.2 0 0 1 ${R - 0.5} 8.6`} stroke="white" strokeOpacity={0.75} strokeWidth={0.55} strokeLinecap="round" fill="none" />
        </g>
      )}
    </motion.svg>
  );
}

// ------------------------------------------------------------------ başlık

/** Başın üstüne oturur; yüz biçim değiştirince (kutu, esneme) yayla birlikte iner/kalkar. */
export function HeadWear({ id, accent, body }: { id: HeadId; accent: string; body: BodyShape }) {
  const uid = useId();
  if (id === "none") return null;
  const top = 12 - body.height / 2;
  const half = body.width / 2;
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" style={BOX}>
      <defs>
        <Shade id={`${uid}a`} c={accent} />
        <Gold id={`${uid}gold`} />
        <radialGradient id={`${uid}ball`} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" style={{ stopColor: light(accent, 70) }} />
          <stop offset="0.5" style={{ stopColor: light(accent, 15) }} />
          <stop offset="1" style={{ stopColor: dark(accent, 25) }} />
        </radialGradient>
        <linearGradient id={`${uid}leaf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b6e889" />
          <stop offset="1" stopColor="#4c9a47" />
        </linearGradient>
      </defs>
      {id === "headphones" ? (
        // Kulaklık yanlara oturur: yüzün genişliğine ve ortasına göre
        <g>
          <path d={`M${12 - half + 0.4} 11 C${12 - half - 0.2} ${top - 4} ${12 + half + 0.2} ${top - 4} ${12 + half - 0.4} 11`} fill="none" stroke={`url(#${uid}a)`} strokeWidth={1.8} strokeLinecap="round" />
          {[-1, 1].map((side) => {
            const x = side < 0 ? 12 - half - 1.9 : 12 + half - 2.5;
            return (
              <g key={side}>
                <rect x={x} y={8.3} width={4.4} height={7.6} rx={2.1} fill={`url(#${uid}a)`} />
                <rect x={side < 0 ? x + 2.9 : x + 0.1} y={9.2} width={1.4} height={5.8} rx={0.7} fill={dark(accent, 55)} />
                <path d={`M${x + 1.1} 9.6 L${x + 1.1} 11.6`} stroke="white" strokeOpacity={0.35} strokeWidth={0.5} strokeLinecap="round" />
              </g>
            );
          })}
        </g>
      ) : (
        <motion.g initial={false} animate={{ y: top }} transition={spring.eye}>
          {id === "beanie" && (
            <g>
              <path d="M2.4 6 C2.4 -4.4 21.6 -4.4 21.6 6 Z" fill={`url(#${uid}a)`} />
              {[6.4, 9.2, 12, 14.8, 17.6].map((x) => (
                <path key={x} d={`M${x} ${x === 12 ? -1.6 : 0} Q${x + (x - 12) * 0.08} 2 ${x + (x - 12) * 0.05} 4`} stroke={dark(accent, 30)} strokeOpacity={0.35} strokeWidth={0.4} fill="none" />
              ))}
              <path d="M1.5 5 Q12 1 22.5 5 L22.7 8.3 Q12 4.3 1.3 8.3 Z" fill={light(accent, 8)} stroke={dark(accent, 25)} strokeWidth={0.3} />
              {[3.6, 5.6, 7.6, 9.6, 11.6, 13.6, 15.6, 17.6, 19.6].map((x) => (
                <path key={x} d={`M${x + 0.4} ${4.3 - (1 - Math.abs(x - 12) / 12) * 1.6} l0 2.6`} stroke={dark(accent, 35)} strokeOpacity={0.35} strokeWidth={0.45} />
              ))}
              <circle cx={12} cy={-3.6} r={2.2} fill={`url(#${uid}ball)`} />
            </g>
          )}
          {id === "beret" && (
            <g>
              <path d="M6.4 3.6 Q12 1.2 17.8 3.4" fill="none" stroke={dark(accent, 35)} strokeWidth={1.1} strokeLinecap="round" />
              <ellipse cx={13.2} cy={0.9} rx={10.4} ry={3.5} transform="rotate(-9 13.2 0.9)" fill={`url(#${uid}a)`} />
              <path d="M5.4 -0.4 Q11 -3.4 19.6 -2.4" fill="none" stroke="white" strokeOpacity={0.22} strokeWidth={0.6} strokeLinecap="round" />
              <rect x={13.6} y={-3.7} width={0.95} height={1.7} rx={0.4} transform="rotate(-9 14 -2.8)" fill={dark(accent, 30)} />
            </g>
          )}
          {id === "sprout" && (
            <g>
              <path d="M12 0.8 C12 -1 12.3 -2.6 13.2 -3.8" fill="none" stroke="#4c8f43" strokeWidth={0.9} strokeLinecap="round" />
              <path d="M12.3 -2.1 C10.6 -4.7 7.5 -4.7 6.7 -3.4 C8.3 -1.6 10.8 -1.2 12.3 -2.1Z" fill={`url(#${uid}leaf)`} />
              <path d="M13.1 -3.5 C14 -6.4 17.3 -7.2 18.3 -6.1 C17.8 -4 15.1 -2.8 13.1 -3.5Z" fill={`url(#${uid}leaf)`} />
              <path d="M11.8 -2.4 Q9.6 -3.6 7.6 -3.4 M13.6 -3.8 Q15.6 -5.2 17.6 -6" stroke="#3b7a37" strokeOpacity={0.5} strokeWidth={0.3} fill="none" />
            </g>
          )}
          {id === "crown" && (
            <g transform="translate(12.8 -0.2) rotate(9)">
              <path d="M-4.6 1.4 L-4.8 -2.8 L-2.3 -0.6 L0 -4.2 L2.3 -0.6 L4.8 -2.8 L4.6 1.4 Z" fill={`url(#${uid}gold)`} stroke={GOLD[2]} strokeWidth={0.3} strokeLinejoin="round" />
              <rect x={-4.6} y={0.1} width={9.2} height={1.3} rx={0.3} fill={GOLD[2]} fillOpacity={0.55} />
              {[-4.8, 0, 4.8].map((x, i) => (
                <circle key={x} cx={x} cy={i === 1 ? -4.2 : -2.8} r={0.6} fill="#fff6d6" />
              ))}
              <circle cx={0} cy={0.75} r={0.65} fill={accent === "#efe6d6" ? "#7d1f35" : accent} stroke="#fff6d6" strokeWidth={0.2} />
            </g>
          )}
          {id === "antenna" && (
            <g>
              <path d="M12 0.6 L12 -3.4" stroke="#2a2a30" strokeWidth={0.75} strokeLinecap="round" />
              <circle cx={12} cy={-4.9} r={3.2} style={{ fill: accent }} opacity={0.18} />
              <circle cx={12} cy={-4.9} r={1.75} fill={`url(#${uid}ball)`} />
            </g>
          )}
          {id === "bow" && (
            <g transform="translate(17.2 1.6) rotate(20)">
              <path d="M0 0 C-1.6 -2.8 -5.1 -2.6 -4.9 0 C-5.1 2.6 -1.6 2.8 0 0Z M0 0 C1.6 -2.8 5.1 -2.6 4.9 0 C5.1 2.6 1.6 2.8 0 0Z" fill={`url(#${uid}a)`} />
              <path d="M-1.2 -0.4 Q-3 -1.3 -4 -0.6 M1.2 -0.4 Q3 -1.3 4 -0.6" stroke={dark(accent, 40)} strokeOpacity={0.5} strokeWidth={0.35} fill="none" />
              <ellipse cx={0} cy={0} rx={1.15} ry={1.35} fill={dark(accent, 12)} />
              <ellipse cx={-0.3} cy={-0.45} rx={0.4} ry={0.3} fill="white" fillOpacity={0.4} />
            </g>
          )}
        </motion.g>
      )}
    </svg>
  );
}

// ------------------------------------------------------------------ boyun

export function NeckWear({ id, accent, body }: { id: NeckId; accent: string; body: BodyShape }) {
  const uid = useId();
  if (id === "none") return null;
  const bottom = 12 + body.height / 2;
  const half = body.width / 2;
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" style={BOX}>
      <defs>
        <Shade id={`${uid}a`} c={accent} />
        <Gold id={`${uid}gold`} />
      </defs>
      <motion.g initial={false} animate={{ y: bottom }} transition={spring.eye}>
        {id === "bowtie" && (
          <g transform="translate(12 -0.4)">
            <path d="M0 0 L-4.1 -2.5 C-5 -2.7 -5.4 -2 -5.4 0 C-5.4 2 -5 2.7 -4.1 2.5 Z M0 0 L4.1 -2.5 C5 -2.7 5.4 -2 5.4 0 C5.4 2 5 2.7 4.1 2.5 Z" fill={`url(#${uid}a)`} />
            <path d="M-4.6 -1.6 L-1.6 -0.4 M4.6 -1.6 L1.6 -0.4" stroke="white" strokeOpacity={0.22} strokeWidth={0.4} strokeLinecap="round" />
            <rect x={-1.05} y={-1.35} width={2.1} height={2.7} rx={0.7} fill={dark(accent, 15)} />
          </g>
        )}
        {id === "scarf" && (
          <g>
            <path d={`M${12 - half + 0.8} -6.2 Q12 -0.8 ${12 + half - 0.8} -6.2 L${12 + half} -3.4 Q12 2.6 ${12 - half} -3.4 Z`} fill={`url(#${uid}a)`} />
            <path d={`M${12 - half + 0.6} -4.7 Q12 0.9 ${12 + half - 0.6} -4.7`} fill="none" stroke={light(accent, 55)} strokeOpacity={0.55} strokeWidth={0.5} />
            <path d="M15.4 -2 L18.3 -2.7 L19.4 3.8 L16.4 4.4 Z" fill={dark(accent, 8)} />
            <path d="M16.6 4.3 l0 1 M17.6 4.1 l0 1 M18.6 3.9 l0 1" stroke={dark(accent, 8)} strokeWidth={0.45} strokeLinecap="round" />
            <path d="M15.9 -1.6 L16.9 3.8" stroke={light(accent, 55)} strokeOpacity={0.45} strokeWidth={0.45} />
          </g>
        )}
        {id === "pendant" && (
          <g>
            <path d="M5 -4.6 Q12 1.4 19 -4.6" fill="none" stroke={GOLD[1]} strokeWidth={0.42} />
            <circle cx={12} cy={0.1} r={1.55} fill={`url(#${uid}gold)`} stroke={GOLD[2]} strokeWidth={0.25} />
            <circle cx={12} cy={0.1} r={0.75} style={{ fill: accent === "#efe6d6" || accent === "#c99a2e" ? "#26355e" : accent }} />
            <circle cx={11.6} cy={-0.3} r={0.3} fill="white" fillOpacity={0.7} />
          </g>
        )}
      </motion.g>
    </svg>
  );
}
