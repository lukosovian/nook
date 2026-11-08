/**
 * Sahne tarzlarının "nesne bazlı" uygulaması. Resme çevrilen katmanın (Painted) içine bir <style> ve ek
 * katmanlar eklenir; böylece aynı sahne geometrisi her tarzın asıl görsel işaretleriyle yeniden çizilir:
 *
 *  - puff     yumuşak 3B: her nesne tek tek şişkin, parlak (animasyon filmi)
 *  - felt     keçe: her parça tüylü, kenarında beyaz dikiş izi
 *  - ink      çizgi roman: her parçanın etrafında kalın mürekkep kontur, düz renk
 *  - riso     risograf: sınırlı ton + parçaların altından kaymış yarım ton nokta baskısı
 *  - oil      yağlı boya: yönlü fırça çekişi, kabarık boya + görünür fırça darbeleri
 *  - gouache  guaj: mat, opak boya + kısa fırça izleri
 *  - paper    kâğıt kolaj: her parça kesik kâğıt, altında gölge
 *  - wc       suluboya: her parçanın kenarında koyulaşan pigment
 *  - pixel    piksel sanat: kalın koyu kontur (çözünürlük Painted `pixel` ile düşer)
 *
 * Hepsi bir kez resme çevrildiği için çalışma anında maliyeti yok.
 */
import type { ReactNode } from "react";
import { W, H } from "./kit";

export type Look = "puff" | "felt" | "ink" | "riso" | "oil" | "gouache" | "paper" | "wc" | "pixel" | "clay";

const SHAPES = ":where(path, rect, circle, ellipse, polygon)";
const FILLED = `${SHAPES}:not([fill="none"])`;

const CSS: Record<Look, string> = {
  puff: `${FILLED} { filter: url(#st-soft3d); }`,
  felt: `${FILLED} { filter: url(#st-felt); } ${FILLED}:not(.nk-big) { stroke: rgba(70,48,40,0.55); stroke-width: 2.6px; stroke-dasharray: 7 5; stroke-linecap: round; }`,
  ink: `${FILLED} { stroke: #17121e; stroke-width: 5.5px; paint-order: stroke; stroke-linejoin: round; } line, polyline, path[fill="none"] { stroke-linecap: round; }`,
  riso: ``,
  oil: ``,
  gouache: `${FILLED} { filter: url(#st-gouache); }`,
  paper: `${FILLED} { filter: url(#st-paper); }`,
  wc: `${FILLED} { filter: url(#st-wc); }`,
  clay: `${FILLED} { filter: url(#st-clay); }`,
  pixel: `${FILLED} { stroke: #0f120c; stroke-width: 6px; paint-order: stroke; stroke-linejoin: miter; }`,
};

/** Desen kaynakları (resme çevrilen işaretlemenin içinde tanımlanır) */
function LookDefs() {
  return (
    <defs>
      <pattern id="lk-ht" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <circle cx="3.5" cy="3.5" r="1.9" fill="#2b1f5c" />
      </pattern>
      <pattern id="lk-ht2" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)">
        <circle cx="4.5" cy="4.5" r="2.1" fill="#e2436b" />
      </pattern>
    </defs>
  );
}

/** Yarı rastgele ama her açılışta aynı (tohumlu) sayı üreteci */
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/**
 * Fırça darbeleri katmanı: kısa, yönlü, yarı saydam açık/koyu çekişler (soft-light) — alttaki rengi
 * değiştirmeden boyanın dokusunu verir. `long`: yağlı boya için uzun, kıvrık; değilse guaj için kısa.
 */
function Brushwork({ long, seed }: { long: boolean; seed: number }) {
  const r = seeded(seed);
  const n = long ? 2600 : 700;
  const strokes = Array.from({ length: n }, (_, i) => {
    const x = r() * W;
    const y = r() * H;
    const len = long ? 9 + r() * 16 : 16 + r() * 18;
    const a = long ? (r() - 0.5) * 1.8 : (r() - 0.5) * 0.5;
    const bend = (r() - 0.5) * len * 0.5;
    const w = long ? 7 + r() * 7 : 11 + r() * 8;
    const light = r() > 0.5;
    const dx = Math.cos(a) * len;
    const dy = Math.sin(a) * len;
    return (
      <path
        key={i}
        d={`M${x.toFixed(1)} ${y.toFixed(1)} q ${(dx / 2 - dy * 0.15 + bend * 0.2).toFixed(1)} ${(dy / 2 + dx * 0.15).toFixed(1)} ${dx.toFixed(1)} ${dy.toFixed(1)}`}
        stroke={light ? "#ffffff" : "#000000"}
        strokeOpacity={long ? (light ? 0.11 : 0.09) : light ? 0.07 : 0.06}
        strokeWidth={w.toFixed(1)}
        strokeLinecap="round"
        fill="none"
      />
    );
  });
  return (
    <g className="lk-skip" style={{ mixBlendMode: "soft-light" }}>
      {strokes}
    </g>
  );
}

/** Fırça dokusu yalnızca bu katmanın çizili olduğu yerlere düşsün: parçaların beyaz silueti maske olur */
const MASK_CSS = " .lk-mask * { fill: #fff !important; stroke: #fff !important; filter: none !important; opacity: 1 !important; }";
function BrushMask({ children }: { children: ReactNode }) {
  return (
    <defs>
      <mask id="lk-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
        <g className="lk-mask">{children}</g>
      </mask>
    </defs>
  );
}

/** Tarzın resme çevrilecek işaretlemesi: stil kuralları + (gerekirse) ek katmanlar + sahne */
export function LookMarkup({ look, children, seed = 7 }: { look: Look; children: ReactNode; seed?: number }) {
  const css = `${CSS[look]} defs *, pattern *, mask *, .lk-skip * { filter: none !important; stroke-dasharray: none !important; } pattern :where(rect, circle, ellipse, polygon) { stroke: none !important; }`;
  if (look === "riso")
    return (
      <>
        <LookDefs />
        <style>{`.lk-ht * { fill: url(#lk-ht) !important; stroke: url(#lk-ht) !important; filter: none !important; } .lk-ht2 * { fill: url(#lk-ht2) !important; stroke: none !important; filter: none !important; } ${css}`}</style>
        {/* İkinci (mor) kalıp: parçaların altından kaymış nokta baskısı */}
        <g className="lk-ht" transform="translate(5 4)" opacity="0.75">
          {children}
        </g>
        <g filter="url(#st-riso)">{children}</g>
        {/* Üçüncü (pembe) kalıp: üstte hafif kaymış, çok seyrek */}
        <g className="lk-ht2" transform="translate(-3 -2)" opacity="0.12" style={{ mixBlendMode: "multiply" }}>
          {children}
        </g>
      </>
    );
  if (look === "oil")
    return (
      <>
        <style>{css + MASK_CSS}</style>
        <BrushMask>{children}</BrushMask>
        <g filter="url(#st-oil)">{children}</g>
        <g mask="url(#lk-mask)">
          <Brushwork long seed={seed} />
        </g>
      </>
    );
  if (look === "gouache")
    return (
      <>
        <style>{css + MASK_CSS}</style>
        <BrushMask>{children}</BrushMask>
        {children}
        <g mask="url(#lk-mask)">
          <Brushwork long={false} seed={seed} />
        </g>
      </>
    );
  return (
    <>
      <style>{css}</style>
      {children}
    </>
  );
}
