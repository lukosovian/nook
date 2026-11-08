/**
 * Kalkan sahnelerinin sanat tarzları: SVG süzgeçleri ve doku katmanları. Görsel dosyası yok; hepsi
 * tarayıcıda üretilir. Süzgeçler yalnızca durağan katmanlara uygulanır (her karede yeniden hesaplanmasın),
 * hareketli parçalar süzgecin dışında çizilir.
 *
 *  - st-wc      suluboya: titrek kenar, kenarda koyulaşan pigment, kâğıtta tanelenme
 *  - st-wc-soft suluboya (ıslak üstüne ıslak): daha dağınık, uzak planlar için
 *  - st-clay    oyun hamuru: şişkin, yumuşak gölgeli hacim + parmak izi dokusu + temas gölgesi
 *  - st-pencil  karakalem: titrek çizgi, grafit tanesi
 *  - st-neon    neon: güçlü parıltı
 *  - st-chroma  renk kayması (eski CRT ekran)
 */
import type { CSSProperties } from "react";

/** Süzgeç tanımları (sayfada da, resme çevrilen katmanların içinde de kullanılır) */
export function StyleFilters() {
  return (
      <defs>
        <filter id="st-wc" x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="3" seed="4" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="16" xChannelSelector="R" yChannelSelector="G" result="wob" />
          <feGaussianBlur in="wob" stdDeviation="1.4" result="soft" />
          {/* Kenarda biriken pigment: dış halka */}
          <feMorphology in="soft" operator="erode" radius="2.5" result="inner" />
          <feComposite in="soft" in2="inner" operator="out" result="ring" />
          <feGaussianBlur in="ring" stdDeviation="0.8" result="ringS" />
          <feColorMatrix in="ringS" type="matrix" values="0.6 0 0 0 0  0 0.6 0 0 0  0 0 0.65 0 0  0 0 0 0.42 0" result="edge" />
          {/* Kâğıtta tanelenme */}
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="9" result="grain" />
          <feColorMatrix in="grain" type="saturate" values="0" result="g0" />
          <feComponentTransfer in="g0" result="g1">
            <feFuncR type="linear" slope="0.28" intercept="0.82" />
            <feFuncG type="linear" slope="0.28" intercept="0.82" />
            <feFuncB type="linear" slope="0.28" intercept="0.82" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
          {/* Büyük ölçekli ton dalgalanması (pigment birikintileri) */}
          <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="2" seed="21" result="bloom" />
          <feColorMatrix in="bloom" type="saturate" values="0" result="b0" />
          <feComponentTransfer in="b0" result="b1">
            <feFuncR type="linear" slope="0.3" intercept="0.84" />
            <feFuncG type="linear" slope="0.3" intercept="0.84" />
            <feFuncB type="linear" slope="0.3" intercept="0.84" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
          <feBlend in="soft" in2="g1" mode="multiply" result="t1" />
          <feBlend in="t1" in2="b1" mode="multiply" result="t2" />
          <feComposite in="t2" in2="soft" operator="in" result="body" />
          <feMerge>
            <feMergeNode in="body" />
            <feMergeNode in="edge" />
          </feMerge>
        </filter>
        <filter id="st-wc-soft" x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="12" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="30" xChannelSelector="R" yChannelSelector="G" result="wob" />
          <feGaussianBlur in="wob" stdDeviation="5" result="soft" />
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="3" result="grain" />
          <feColorMatrix in="grain" type="saturate" values="0" result="g0" />
          <feComponentTransfer in="g0" result="g1">
            <feFuncR type="linear" slope="0.22" intercept="0.86" />
            <feFuncG type="linear" slope="0.22" intercept="0.86" />
            <feFuncB type="linear" slope="0.22" intercept="0.86" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
          <feBlend in="soft" in2="g1" mode="multiply" result="t" />
          <feComposite in="t" in2="soft" operator="in" />
        </filter>

        <filter id="st-clay" x="-15%" y="-15%" width="130%" height="140%" colorInterpolationFilters="sRGB">
          {/* Yükseklik: bulanık siluet (şişkin hacim) + ince gürültü (parmak izi, hamur dokusu) */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="7" result="h0" />
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="5" result="tex" />
          <feComposite in="h0" in2="tex" operator="arithmetic" k1="0" k2="1" k3="0.17" k4="0" result="h" />
          <feDiffuseLighting in="h" surfaceScale="7" diffuseConstant="1.2" lightingColor="#fff6ea" result="dif">
            <feDistantLight azimuth="235" elevation="48" />
          </feDiffuseLighting>
          <feSpecularLighting in="h" surfaceScale="7" specularConstant="0.6" specularExponent="22" lightingColor="#ffffff" result="spec">
            <feDistantLight azimuth="235" elevation="52" />
          </feSpecularLighting>
          <feBlend in="SourceGraphic" in2="dif" mode="multiply" result="lit" />
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feComposite in="lit" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.55" k4="0" result="shaded" />
          <feComposite in="shaded" in2="SourceAlpha" operator="in" result="clay" />
          {/* Altına yumuşak temas gölgesi */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="sb" />
          <feOffset in="sb" dx="4" dy="9" result="so" />
          <feColorMatrix in="so" type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.03  0 0 0 0 0.08  0 0 0 0.45 0" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="clay" />
          </feMerge>
        </filter>
        {/* Gölgesiz (zemin gibi büyük, düz parçalar için) */}
        <filter id="st-clay-flat" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="h0" />
          <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" seed="8" result="tex" />
          <feComposite in="h0" in2="tex" operator="arithmetic" k1="0" k2="1" k3="0.14" k4="0" result="h" />
          <feDiffuseLighting in="h" surfaceScale="4" diffuseConstant="1.18" lightingColor="#fff6ea" result="dif">
            <feDistantLight azimuth="235" elevation="55" />
          </feDiffuseLighting>
          <feBlend in="SourceGraphic" in2="dif" mode="multiply" result="lit" />
          <feComposite in="lit" in2="SourceAlpha" operator="in" />
        </filter>

        <filter id="st-pencil" x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="2" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="6" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.35" result="holes" />
          <feComposite in="d" in2="holes" operator="in" />
        </filter>

        {/* Guaj / lo-fi boyama: hafif titrek kenar, mat tane */}
        <filter id="st-gouache" x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="13" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="7" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation="0.6" result="s" />
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="17" result="gn" />
          <feColorMatrix in="gn" type="saturate" values="0" result="gn0" />
          <feComponentTransfer in="gn0" result="gr">
            <feFuncR type="linear" slope="0.14" intercept="0.86" />
            <feFuncG type="linear" slope="0.14" intercept="0.86" />
            <feFuncB type="linear" slope="0.14" intercept="0.86" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
          <feBlend in="s" in2="gr" mode="multiply" result="t" />
          <feComposite in="t" in2="s" operator="in" />
        </filter>
        {/* Yağlı boya: yönlü fırça çekişi + kabarık boya (impasto) ışığı */}
        <filter id="st-oil" x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
          <feTurbulence type="turbulence" baseFrequency="0.01 0.08" numOctaves="2" seed="5" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="12" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.04 0.3" numOctaves="3" seed="8" result="bump" />
          <feDiffuseLighting in="bump" surfaceScale="1.8" diffuseConstant="1.25" lightingColor="#fff8ee" result="lit">
            <feDistantLight azimuth="225" elevation="58" />
          </feDiffuseLighting>
          <feBlend in="d" in2="lit" mode="multiply" result="t" />
          <feComposite in="t" in2="d" operator="in" />
        </filter>
        {/* Yumuşak 3B (animasyon filmi): şişkin hacim, parlak yansıma, dokusuz */}
        <filter id="st-soft3d" x="-10%" y="-10%" width="120%" height="125%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="9" result="h" />
          <feDiffuseLighting in="h" surfaceScale="6" diffuseConstant="1.18" lightingColor="#ffffff" result="dif">
            <feDistantLight azimuth="240" elevation="50" />
          </feDiffuseLighting>
          <feSpecularLighting in="h" surfaceScale="6" specularConstant="0.75" specularExponent="34" lightingColor="#ffffff" result="spec">
            <feDistantLight azimuth="240" elevation="55" />
          </feSpecularLighting>
          <feBlend in="SourceGraphic" in2="dif" mode="multiply" result="lit" />
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="sp" />
          <feComposite in="lit" in2="sp" operator="arithmetic" k2="1" k3="0.6" result="sh" />
          <feComposite in="sh" in2="SourceAlpha" operator="in" />
        </filter>
        {/* Risograf baskı: kısıtlı ton, kayık renk katmanı, kâğıt tanesi */}
        <filter id="st-riso" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feComponentTransfer in="SourceGraphic" result="post">
            <feFuncR type="discrete" tableValues="0.08 0.35 0.62 0.86 1" />
            <feFuncG type="discrete" tableValues="0.08 0.35 0.62 0.86 1" />
            <feFuncB type="discrete" tableValues="0.1 0.38 0.65 0.88 1" />
          </feComponentTransfer>
          {/* Kayık ikinci baskı: koyu yerlerin hafif kaymış gölgesi */}
          <feColorMatrix in="post" type="luminanceToAlpha" result="lum" />
          <feComponentTransfer in="lum" result="dark">
            <feFuncA type="linear" slope="-0.35" intercept="0.3" />
          </feComponentTransfer>
          <feOffset in="dark" dx="3" dy="2" result="ro" />
          <feFlood floodColor="#3a2a6a" result="ink" />
          <feComposite in="ink" in2="ro" operator="in" result="mis0" />
          <feMerge result="mis">
            <feMergeNode in="post" />
            <feMergeNode in="mis0" />
          </feMerge>
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="23" result="gn" />
          <feColorMatrix in="gn" type="saturate" values="0" result="gn0" />
          <feComponentTransfer in="gn0" result="gr">
            <feFuncR type="linear" slope="0.20" intercept="0.8" />
            <feFuncG type="linear" slope="0.20" intercept="0.8" />
            <feFuncB type="linear" slope="0.20" intercept="0.8" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
          <feBlend in="mis" in2="gr" mode="multiply" result="t" />
          <feComposite in="t" in2="SourceGraphic" operator="in" />
        </filter>
        {/* Kesik kâğıt kolaj: her parça kâğıttan, altında gölge */}
        <filter id="st-paper" x="-5%" y="-5%" width="110%" height="115%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="31" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="3" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="29" result="gn" />
          <feColorMatrix in="gn" type="saturate" values="0" result="gn0" />
          <feComponentTransfer in="gn0" result="gr">
            <feFuncR type="linear" slope="0.12" intercept="0.88" />
            <feFuncG type="linear" slope="0.12" intercept="0.88" />
            <feFuncB type="linear" slope="0.12" intercept="0.88" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
          <feBlend in="d" in2="gr" mode="multiply" result="t" />
          <feComposite in="t" in2="d" operator="in" result="pap" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="sb" />
          <feOffset in="sb" dx="5" dy="8" result="so" />
          <feColorMatrix in="so" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.06  0 0 0 0 0.04  0 0 0 0.5 0" result="sh" />
          <feMerge>
            <feMergeNode in="sh" />
            <feMergeNode in="pap" />
          </feMerge>
        </filter>
        {/* Keçe / yün: ince tüylü doku, yumuşak hacim */}
        <filter id="st-felt" x="-6%" y="-6%" width="112%" height="118%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="41" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="4" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="h0" />
          <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="3" seed="43" result="fz" />
          <feComposite in="h0" in2="fz" operator="arithmetic" k2="1" k3="0.22" result="h" />
          <feDiffuseLighting in="h" surfaceScale="3.5" diffuseConstant="1.2" lightingColor="#ffffff" result="dif">
            <feDistantLight azimuth="235" elevation="52" />
          </feDiffuseLighting>
          <feBlend in="d" in2="dif" mode="multiply" result="t" />
          <feComposite in="t" in2="d" operator="in" />
        </filter>
        {/* Mürekkep çizgi (çizgi roman): her parçanın etrafında koyu kontur, düz renk */}
        <filter id="st-ink" x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
          <feMorphology in="SourceAlpha" operator="dilate" radius="2.2" result="dl" />
          <feColorMatrix in="dl" type="matrix" values="0 0 0 0 0.08  0 0 0 0 0.07  0 0 0 0 0.1  0 0 0 1 0" result="ink" />
          <feComponentTransfer in="SourceGraphic" result="flat">
            <feFuncR type="discrete" tableValues="0.05 0.25 0.45 0.65 0.82 1" />
            <feFuncG type="discrete" tableValues="0.05 0.25 0.45 0.65 0.82 1" />
            <feFuncB type="discrete" tableValues="0.05 0.25 0.45 0.65 0.82 1" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="ink" />
            <feMergeNode in="flat" />
          </feMerge>
        </filter>

        {/* Saat panelleri için yazıyı bozmayan hafif sürümler */}
        <filter id="st-c-wc" x="-4%" y="-4%" width="108%" height="108%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="3" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feMorphology in="d" operator="erode" radius="2" result="in" />
          <feComposite in="d" in2="in" operator="out" result="ring" />
          <feColorMatrix in="ring" type="matrix" values="0.6 0 0 0 0  0 0.6 0 0 0  0 0 0.65 0 0  0 0 0 0.4 0" result="edge" />
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="9" result="gn" />
          <feColorMatrix in="gn" type="saturate" values="0" result="gn0" />
          <feComponentTransfer in="gn0" result="gr">
            <feFuncR type="linear" slope="0.16" intercept="0.84" />
            <feFuncG type="linear" slope="0.16" intercept="0.84" />
            <feFuncB type="linear" slope="0.16" intercept="0.84" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
          <feBlend in="d" in2="gr" mode="multiply" result="t" />
          <feComposite in="t" in2="d" operator="in" result="body" />
          <feMerge>
            <feMergeNode in="body" />
            <feMergeNode in="edge" />
          </feMerge>
        </filter>
        <filter id="st-c-gouache" x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="13" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="2" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="17" result="gn" />
          <feColorMatrix in="gn" type="saturate" values="0" result="gn0" />
          <feComponentTransfer in="gn0" result="gr">
            <feFuncR type="linear" slope="0.14" intercept="0.86" />
            <feFuncG type="linear" slope="0.14" intercept="0.86" />
            <feFuncB type="linear" slope="0.14" intercept="0.86" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
          <feBlend in="d" in2="gr" mode="multiply" result="t" />
          <feComposite in="t" in2="d" operator="in" />
        </filter>
        <filter id="st-c-oil" x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
          <feTurbulence type="turbulence" baseFrequency="0.02 0.1" numOctaves="2" seed="5" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="2.5" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.35" numOctaves="3" seed="8" result="bump" />
          <feDiffuseLighting in="bump" surfaceScale="1.6" diffuseConstant="1.25" lightingColor="#fff8ee" result="lit">
            <feDistantLight azimuth="225" elevation="58" />
          </feDiffuseLighting>
          <feBlend in="d" in2="lit" mode="multiply" result="t" />
          <feComposite in="t" in2="d" operator="in" />
        </filter>
        {/* Piksel sanat: 4 px'lik bloklar */}
        <filter id="st-pixel" x="0" y="0" width="100%" height="100%">
          <feFlood x="1.5" y="1.5" width="1" height="1" />
          <feComposite width="4" height="4" />
          <feTile result="grid" />
          <feComposite in="SourceGraphic" in2="grid" operator="in" />
          <feMorphology operator="dilate" radius="2" />
        </filter>

        <filter id="st-neon" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b2" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="28" result="b3" />
          <feMerge>
            <feMergeNode in="b3" />
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="st-chroma" x="0" y="0" width="100%" height="100%">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset in="r" dx="-2" result="r2" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feOffset in="b" dx="2" result="b2" />
          <feBlend in="r2" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b2" mode="screen" />
        </filter>
      </defs>
  );
}

export function StyleDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <StyleFilters />
    </svg>
  );
}

const noise = (freq: number, oct: number, seed: number, matrix: string) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${oct}' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='${matrix}'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
  )}")`;

/** Soğuk preslenmiş suluboya kâğıdı: iri lifler ve tane */
const WC_PAPER = noise(0.035, 4, 11, "0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0 0.32  0 0 0 -1.4 0.9");
const WC_FIBER = noise(0.6, 2, 4, "0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 -2.4 1.4");
/** Kraft/eskiz kâğıdı */
/** Keten tuval: ince dokuma */
const CANVAS = noise(0.55, 2, 19, "0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 -1.6 1.1");
const SKETCH_PAPER = noise(0.9, 2, 7, "0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 -2 1.25");

/** Sahnenin en üstüne (ışıklardan sonra) serilen malzeme katmanı */
export function Medium({ kind }: { kind: "watercolor" | "sketch" | "crt" | "canvas" }) {
  const full: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none" };
  if (kind === "watercolor")
    return (
      <>
        <div style={{ ...full, backgroundImage: WC_PAPER, backgroundSize: "512px 512px", mixBlendMode: "multiply", opacity: 0.18 }} />
        <div style={{ ...full, backgroundImage: WC_FIBER, backgroundSize: "512px 512px", mixBlendMode: "multiply", opacity: 0.12 }} />
        {/* Kâğıdın kenarında boyasız kalan beyaz pay */}
        <div style={{ ...full, boxShadow: "inset 0 0 0 10px rgba(252,248,238,0.95), inset 0 0 40px 18px rgba(252,248,238,0.6)" }} />
      </>
    );
  if (kind === "canvas")
    return (
      <>
        <div style={{ ...full, backgroundImage: CANVAS, backgroundSize: "256px 256px", mixBlendMode: "multiply", opacity: 0.22 }} />
        <div style={{ ...full, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.035) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.035) 0 1px, transparent 1px 3px)" }} />
      </>
    );
  if (kind === "sketch") return <div style={{ ...full, backgroundImage: SKETCH_PAPER, backgroundSize: "512px 512px", mixBlendMode: "multiply", opacity: 0.6 }} />;
  // CRT: tarama çizgileri ve hafif kavis gölgesi
  return (
    <>
      <div style={{ ...full, backgroundImage: "repeating-linear-gradient(180deg, rgba(0,0,0,0.22) 0 1px, transparent 1px 3px)", mixBlendMode: "multiply" }} />
      <div style={{ ...full, background: "radial-gradient(120% 120% at 50% 50%, transparent 60%, rgba(0,0,0,0.45) 100%)" }} />
    </>
  );
}
