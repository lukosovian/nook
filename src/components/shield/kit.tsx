/**
 * Kalkan sahnelerinin ortak parçaları.
 *  - Stage: 1600×900'lük sahne; ekranı kaplayacak kadar büyür, alttan ortalanır (geniş ekranda yanlar,
 *    dar ekranda üst kesilir — karakterler hep görünür).
 *  - Actor: sahnede bir Nook. Eşyaları "yüz biriminde" çizilir: yüzün merkezi (12,12), yarıçapı 12;
 *    alt kenar y=24. Eller beyaz toplar (H), mascot/Props ile aynı dil.
 *  - useBeat: birkaç saniyede bir sahnede bir olay seçer (odun atılır, çalı hışırdar…).
 *  - Karakterler kendiliğinden değişmez: sahnenin bir olayı (iksir dökülür, deney patlar…) olunca
 *    o olayın Nook'u başka bir gövdeye/renge dönüşür (Actor `morph`, useBeat `n`).
 */
import { createContext, useContext, useEffect, useReducer, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, type TargetAndTransition, type Transition } from "motion/react";
import type { Look } from "../../lib/look";
import { BODY_COLORS, DEFAULT_LOOK, EYE_STYLES, SHAPES, TEXTURES } from "../../lib/look";
import type { Expression } from "../../store/nook";
import { NookFigure } from "../mascot/Figure";
import { castPool } from "../../lib/nook3d";
import { renderToStaticMarkup } from "react-dom/server";
import { Medium, StyleDefs, StyleFilters } from "./styles";
import { ClockStyle } from "./clocks";
import { LookMarkup, type Look as ArtLook } from "./looks";

export const W = 1600;
export const H = 900;

export const look = (p: Partial<Look>): Look => ({ ...DEFAULT_LOOK, ...p });
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/**
 * Rastgele bir Nook: gövde, doku, gözler, renk (şapka, gözlük gibi rol eşyaları ayrı kalır). Kalkan her
 * açıldığında bir gövde ailesi ve bir doku ailesi seçilir; oyuncular (dönüşenler de) o ailelerden gelir.
 */
const POOL = castPool();
const CAST_SHAPES = SHAPES.filter((s) => POOL.shapes.includes(s.id));
// Dokular sakin: düz vinil ya da peluş. Desenli/parlak dokular (ekose, galaksi, krom…) boyanmış arka
// planın üstünde yapıştırma gibi duruyordu; sahnenin malzemesini gövdeye CastBody verir.
const CAST_TEXTURES = TEXTURES.filter((t) => t.id === "smooth" || t.id === "plush");
function randomBody() {
  return {
    shape: pick(CAST_SHAPES.length ? CAST_SHAPES : SHAPES).id,
    texture: pick(CAST_TEXTURES.length ? CAST_TEXTURES : TEXTURES).id,
    eyes: pick(EYE_STYLES).id,
    color: pick(BODY_COLORS),
  };
}

/**
 * Oyuncunun gövdesi: kalkan her açıldığında rastgele; sonra yalnızca `morph` değişince (sahnenin bir
 * olayında, olayın can alıcı anına denk gelsin diye `delay` ms sonra) başka bir Nook'a dönüşür.
 * Rol (eşyalar, hareketler) aynı kalır.
 */
function useCastBody(morph: number | undefined, delay: number, color?: string) {
  // İlk renk rolün tasarımdaki rengi (sahnenin paletine göre seçilmiş, arka plandan ayrışır); dönüşünce rastgele
  const [body, setBody] = useState(() => ({ ...randomBody(), ...(color ? { color } : null) }));
  useEffect(() => {
    if (!morph) return;
    const t = window.setTimeout(() => setBody(randomBody()), delay);
    return () => window.clearTimeout(t);
  }, [morph, delay]);
  return body;
}

/** Sahne pencere yerine bir kutuya sığsın (tanıtımdaki küçük ekran): kutunun ölçüleri */
export const StageBox = createContext<{ w: number; h: number } | null>(null);

/** Ortak SVG tanımları (el, parıltı, bulanıklık…) */
function KitDefs() {
  return (
    <defs>
      <radialGradient id="nk-hand" cx="35%" cy="30%" r="70%">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.55" stopColor="#e4e4ea" />
        <stop offset="1" stopColor="#a9a9b4" />
      </radialGradient>
      <radialGradient id="nk-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#ffd27a" stopOpacity="0.9" />
        <stop offset="0.4" stopColor="#ff8a3d" stopOpacity="0.35" />
        <stop offset="1" stopColor="#ff6a3d" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="nk-soft" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.8" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      {/* Yumuşak kenar (uzak dağlar, sis, ışık hüzmesi) ve parıltı (kristal, alev) */}
      <filter id="nk-blur" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="14" />
      </filter>
      <filter id="nk-blur-s" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
      <filter id="nk-bloom" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

/**
 * Sahnedeki bir ışık kaynağı (ateş, mum, kristal…): karakterlerin ve eşyaların da üstüne vuran yumuşak
 * bir parıltı. Sahne biriminde (1600×900) merkez ve yarıçap; `flicker` titreşim şiddeti (0 = sabit).
 */
export type Light = { x: number; y: number; r: number; color: string; opacity?: number; flicker?: number; blend?: "screen" | "soft-light" | "overlay" };

/** Film greni: bir kez üretilen küçük gürültü dokusu (tüm sahnelerde aynı) */
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)}")`;

/** Işıkları sahnenin en üstüne, karakterlerin de üzerine çizer */
function Lights({ lights }: { lights: Light[] }) {
  return (
    <>
      {lights.map((l, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: l.x - l.r,
            top: l.y - l.r,
            width: l.r * 2,
            height: l.r * 2,
            background: `radial-gradient(circle, ${l.color} 0%, transparent 68%)`,
            mixBlendMode: l.blend ?? "screen",
          }}
          initial={{ opacity: l.opacity ?? 0.5 }}
          animate={l.flicker ? { opacity: [(l.opacity ?? 0.5), (l.opacity ?? 0.5) * (1 - l.flicker), (l.opacity ?? 0.5) * (1 - l.flicker * 0.3), (l.opacity ?? 0.5)], scale: [1, 1 - l.flicker * 0.08, 1 + l.flicker * 0.05, 1] } : undefined}
          transition={l.flicker ? { duration: 1.6 + (i % 3) * 0.37, repeat: Infinity, ease: "easeInOut" } : undefined}
        />
      ))}
    </>
  );
}

/**
 * Ekranı (ya da StageBox'ı) kaplayan sahne. `lights`: karakterlere de vuran ışıklar; `vignette`: kenar kararması (0–1);
 * `medium`: sahnenin malzemesi (suluboya kâğıdı, eskiz kâğıdı, CRT tarama) en üste serilir; `grain`: film greni.
 */
export function Stage({
  children,
  sky,
  lights,
  vignette = 0.42,
  medium,
  grain = true,
  clock,
}: {
  children: ReactNode;
  sky: string;
  lights?: Light[];
  vignette?: number;
  medium?: "watercolor" | "sketch" | "crt" | "canvas";
  grain?: boolean;
  /** Saat panelinin tarz süzgeci (sahneyle aynı malzeme) */
  clock?: string;
}) {
  const box = useContext(StageBox);
  const [win, setK] = useState(1);
  useEffect(() => {
    if (box) return;
    const fit = () => setK(Math.max(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [box]);
  const k = box ? Math.max(box.w / W, box.h / H) : win;
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: sky }}>
      <svg width="0" height="0" className="absolute">
        <KitDefs />
      </svg>
      <div className="absolute bottom-0 left-1/2" style={{ width: W, height: H, transform: `translateX(-50%) scale(${k})`, transformOrigin: "50% 100%" }}>
        <ClockStyle.Provider value={clock}>{children}</ClockStyle.Provider>
        {lights && <Lights lights={lights} />}
      </div>
      <StyleDefs />
      {medium && <Medium kind={medium} />}
      {/* Kenar kararması ve çok hafif gren: düz renkler "ekran resmi" gibi değil, bir sahne gibi dursun */}
      {vignette > 0 && <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(130% 100% at 50% 45%, transparent 55%, rgba(0,0,0,${vignette}) 100%)` }} />}
      {grain && <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: GRAIN, opacity: 0.07, mixBlendMode: "overlay" }} />}
    </div>
  );
}

/** Tüm sahneyi kaplayan SVG katmanı (arka plan, ön plan) */
export function Layer({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={`absolute inset-0 overflow-visible ${className}`} style={style}>
      {children}
    </svg>
  );
}

/** Resme çevrilmekte olan katman sayısı: sahne hepsi bitince açılır (bkz. Shield) */
let baking = 0;
export const bakesBusy = () => baking > 0;

/**
 * Durağan, ağır süzgeçli katman: sahne açılırken BİR KEZ bit eşlem resme çevrilir (SVG → canvas → PNG) ve
 * sonra yalnızca o resim gösterilir. Suluboya, hamur gibi süzgeçler her karede yeniden hesaplanmaz; açılıştaki
 * yakınlaşma ya da üstteki animasyonlar tarayıcıyı yormaz. İçine hareketli parça konmaz; kullandığı her
 * tanım (degrade, desen) kendi içinde olmalı — ortak süzgeçler ve nk-* tanımları otomatik eklenir.
 * `filter` verilirse tüm katmana uygulanır; verilmezse parçalar kendi süzgeçlerini taşır.
 */
export function Painted({ children, filter, pixel, look, seed }: { children: ReactNode; filter?: string; pixel?: number; look?: ArtLook; seed?: number }) {
  const box = useContext(StageBox);
  const [url, setUrl] = useState<string | null>(null);
  // Çocuklar durağan: işaretleme bir kez üretilir
  // <svg> kökü içinde üretilir ki React SVG etiketlerini doğru tanısın; dış etiket sonra atılır
  const [markup] = useState(() =>
    renderToStaticMarkup(
      <svg>
        <StyleFilters />
        <KitDefs />
        {look ? (
          <LookMarkup look={look} seed={seed}>
            {children}
          </LookMarkup>
        ) : filter ? (
          <g filter={`url(#${filter})`}>{children}</g>
        ) : (
          children
        )}
      </svg>,
    ).replace(/^<svg>/, "").replace(/<\/svg>$/, ""),
  );
  useEffect(() => {
    let alive = true;
    let out: string | null = null;
    const fit = box ? Math.max(box.w / W, box.h / H) : Math.max(window.innerWidth / W, window.innerHeight / H);
    // Ekrandaki boyuta göre net, ama aşırı büyük olmayan çözünürlük
    // Piksel sanat: düşük çözünürlükte çizilip keskin büyütülür
    const scale = pixel ? 1 / pixel : Math.min(2.5, Math.max(0.5, fit * (window.devicePixelRatio || 1)));
    const w = Math.round(W * scale);
    const h = Math.round(H * scale);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${W} ${H}">${markup}</svg>`;
    const src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    baking++;
    const done = () => {
      baking = Math.max(0, baking - 1);
      URL.revokeObjectURL(src);
    };
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")?.drawImage(img, 0, 0, w, h);
      c.toBlob((b) => {
        done();
        if (!alive || !b) return;
        out = URL.createObjectURL(b);
        setUrl(out);
      });
    };
    img.onerror = done;
    img.src = src;
    return () => {
      alive = false;
      if (out) URL.revokeObjectURL(out);
    };
  }, [markup, box, pixel]);
  return url ? <img src={url} alt="" draggable={false} className="pointer-events-none absolute left-0 top-0 select-none" style={{ width: W, height: H, imageRendering: pixel ? "pixelated" : undefined }} /> : null;
}

// ------------------------------------------------------------------ sahnenin malzemesiyle boyanan gövde

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((ok, fail) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = fail;
    im.src = src;
  });

let filtersMarkup = "";
/** Gövde resmini sahnenin tarz süzgecinden bir kez geçirip yeni bir resim üretir (çalışma anında süzgeç yok) */
async function paintBody(src: string, filter: string, px: number): Promise<string> {
  filtersMarkup ||= renderToStaticMarkup(
    <svg>
      <StyleFilters />
    </svg>,
  ).replace(/^<svg>/, "").replace(/<\/svg>$/, "");
  const n = Math.min(640, Math.round(px * 2.5));
  const flat = document.createElement("canvas");
  flat.width = flat.height = n;
  flat.getContext("2d")!.drawImage(await loadImage(src), 0, 0, n, n);
  // Süzgeç ölçüleri sahne biriminde kalsın diye viewBox gövdenin sahnedeki boyu
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n}" height="${n}" viewBox="0 0 ${px} ${px}">${filtersMarkup}<image href="${flat.toDataURL("image/png")}" width="${px}" height="${px}" filter="url(#${filter})"/></svg>`;
  const blob = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const out = document.createElement("canvas");
    out.width = out.height = n;
    out.getContext("2d")!.drawImage(await loadImage(blob), 0, 0, n, n);
    return await new Promise<string>((ok, fail) => out.toBlob((b) => (b ? ok(URL.createObjectURL(b)) : fail(new Error("boş"))), "image/png"));
  } finally {
    URL.revokeObjectURL(blob);
  }
}

const skins = new Map<string, string>();

/**
 * Sahnedeki Nook'un gövdesi: sahnenin sanat tarzıyla (hamur, suluboya, keçe…) boyanmış resim. Arka plan
 * elle boyanmış gibi dururken parlak 3B gövdeler üstüne yapıştırılmış görünüyordu; artık aynı malzemeden.
 * Tarzı olmayan sahnede gövde olduğu gibi çizilir.
 */
function CastBody({ src, px }: { src: string; px: number }) {
  const filter = useContext(ClockStyle);
  const key = `${filter}|${Math.round(px)}|${src}`;
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!filter || skins.has(key)) return;
    let alive = true;
    baking++;
    const done = () => void (baking = Math.max(0, baking - 1));
    paintBody(src, filter, px).then(
      (url) => {
        skins.set(key, url);
        done();
        if (alive) bump();
      },
      () => {
        // Boyanamadıysa gövde olduğu gibi kalsın
        skins.set(key, src);
        done();
        if (alive) bump();
      },
    );
    return () => {
      alive = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const url = filter ? skins.get(key) : src;
  return url ? <img src={url} alt="" draggable={false} className="absolute inset-0 h-full w-full" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }} /> : null;
}

/** Beyaz yüzen el (yüz biriminde) */
export function Hand({ x, y, r = 2.7 }: { x: number; y: number; r?: number }) {
  return <ellipse cx={x} cy={y} rx={r * 1.12} ry={r} fill="url(#nk-hand)" style={{ filter: "drop-shadow(0 0.4px 0.6px rgba(0,0,0,0.45))" }} />;
}

/**
 * Sahnedeki bir Nook: (x, y) gövdenin alt-orta noktası. `front` eşyaları gövdenin önünde, `back`
 * arkasında çizilir (ikisi de yüz biriminde SVG). `move` sürekli kıpırtı; `act` olay anındaki hareket.
 */
export function Actor({
  x,
  y,
  size,
  look: lk,
  color,
  expression = "idle",
  flip = false,
  front,
  back,
  move,
  act,
  actKey,
  z,
  opacity,
  morph,
  morphDelay = 700,
  shadow = true,
}: {
  x: number;
  y: number;
  size: number;
  look: Look;
  /** Rolün tasarımdaki rengi (oyuncu dönüşünce rastgele renk gelir) */
  color?: string;
  expression?: Expression;
  flip?: boolean;
  front?: ReactNode;
  back?: ReactNode;
  move?: { animate: TargetAndTransition; transition: Transition };
  act?: { animate: TargetAndTransition; transition: Transition } | null;
  actKey?: number;
  z?: number;
  opacity?: number;
  /** Değişince oyuncu başka bir Nook'a dönüşür (sahnenin bir olayı: useBeat `n`) */
  morph?: number;
  /** Dönüşüm olayın başından kaç ms sonra */
  morphDelay?: number;
  /** Ayağının altında yumuşak yer gölgesi (havada duranlar, içeride oturanlar için kapatılır) */
  shadow?: boolean;
}) {
  // Rol aynı, oyuncu değişir: gövde/doku/göz/renk rastgele, aksesuarlar sahnenin
  const body = useCastBody(morph, morphDelay, color);
  const cast: Look = { ...lk, shape: body.shape, texture: body.texture, eyes: body.eyes };
  const id = `${body.shape}-${body.texture}-${body.eyes}-${body.color}`;
  const box = { left: -size / 2, top: -size / 2, width: size * 2, height: size * 2 };
  // Eldeki eşyalar ve eller de sahnenin malzemesinden (gövdeyle aynı tarz süzgeci)
  const art = useContext(ClockStyle);
  const svg = (children: ReactNode) => (
    <svg viewBox="-12 -12 48 48" className="pointer-events-none absolute overflow-visible" style={{ ...box, filter: art ? `url(#${art})` : undefined }}>
      {children}
    </svg>
  );
  return (
    <div className="absolute" style={{ left: x - size / 2, top: y - size, width: size, height: size, zIndex: z, opacity }}>
      {/* Yere bassın: ayağın altında yumuşak, hafif yayvan bir gölge */}
      {shadow && (
        <span
          className="pointer-events-none absolute left-1/2"
          style={{ bottom: -size * 0.07, width: size * 1.05, height: size * 0.2, transform: "translateX(-50%)", background: "radial-gradient(closest-side, rgba(0,0,0,0.5), rgba(0,0,0,0.22) 55%, transparent)" }}
        />
      )}
      <motion.div className="absolute inset-0" style={{ originY: 1 }} animate={move?.animate} transition={move?.transition}>
        <motion.div key={actKey} className="absolute inset-0" style={{ originY: 1 }} animate={act?.animate} transition={act?.transition}>
          <motion.div className="absolute inset-0" animate={{ scaleX: flip ? -1 : 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
            {back && svg(back)}
            <AnimatePresence initial={false}>
              <motion.div
                key={id}
                className="absolute inset-0"
                initial={{ scale: 0.2, opacity: 0, rotate: -25 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.2, opacity: 0, rotate: 25, transition: { duration: 0.25 } }}
                transition={{ type: "spring", stiffness: 320, damping: 16 }}
              >
                <NookFigure look={cast} color={body.color} size={size} expression={expression} alive Body={CastBody} />
              </motion.div>
            </AnimatePresence>
            <Poof k={id} />
            {front && svg(front)}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Oyuncu değişirken küçük bir toz bulutu */
function Poof({ k }: { k: string }) {
  const [first] = useState(k);
  if (k === first) return null;
  return (
    <span key={k} className="pointer-events-none absolute inset-0">
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <motion.span
            key={`${k}-${i}`}
            className="absolute left-1/2 top-1/2 h-4 w-4 rounded-full bg-white/70"
            initial={{ x: -8, y: -8, scale: 0.4, opacity: 0.9 }}
            animate={{ x: Math.cos(a) * 46 - 8, y: Math.sin(a) * 40 - 8, scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
        );
      })}
    </span>
  );
}

/** Hafif nefes alma: yükselirken incelir (hacim korunur), iner ve hafifçe yayılır */
export const breathe = (d = 3.2, amp = 3): { animate: TargetAndTransition; transition: Transition } => ({
  animate: { y: [0, -amp, 0], scaleY: [1, 1.03, 1], scaleX: [1, 0.985, 1] },
  transition: { duration: d, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 2 },
});
export const sway = (d = 2.6, deg = 4): { animate: TargetAndTransition; transition: Transition } => ({
  animate: { rotate: [-deg, deg, -deg] },
  transition: { duration: d, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 2 },
});
/** Zıplama: önce çömelir (hazırlık), uzayarak kalkar, yere basınca ezilir, küçük bir sekme */
export const hop = (h = 26): { animate: TargetAndTransition; transition: Transition } => ({
  animate: { y: [0, 3, -h, 0, -h * 0.3, 0], scaleY: [1, 0.86, 1.1, 0.88, 1.03, 1], scaleX: [1, 1.1, 0.94, 1.1, 0.98, 1] },
  transition: { duration: 1, times: [0, 0.14, 0.42, 0.66, 0.82, 1], ease: "easeInOut" },
});

/**
 * Sahnenin olay zamanlayıcısı: `count` olaydan birini 4,5–8,5 sn'de bir seçer (aynısı arka arkaya
 * gelmez). `k` her olayda artar — animasyonları baştan oynatmak için anahtar. `n[i]`: i. olay kaç kez
 * oldu (o olayın Nook'unu dönüştürmek için Actor `morph`).
 */
export function useBeat(count: number) {
  const [beat, setBeat] = useState<{ i: number; k: number; n: number[] }>(() => ({ i: -1, k: 0, n: Array(count).fill(0) }));
  useEffect(() => {
    let t = 0;
    const next = (prev: number) => {
      t = window.setTimeout(() => {
        let i = Math.floor(Math.random() * count);
        if (i === prev && count > 1) i = (i + 1) % count;
        setBeat((b) => ({ i, k: b.k + 1, n: b.n.map((v, j) => (j === i ? v + 1 : v)) }));
        next(i);
      }, rnd(4500, 8500));
    };
    // İlk olay biraz erken gelsin
    t = window.setTimeout(() => {
      setBeat((b) => ({ i: 0, k: b.k + 1, n: b.n.map((v, j) => (j === 0 ? v + 1 : v)) }));
      next(0);
    }, 2200);
    return () => window.clearTimeout(t);
  }, [count]);
  return beat;
}

/** Olay o anda bu mu: evetse oynatılacak hareket, değilse null */
export const on = <T,>(beat: { i: number }, i: number, v: T): T | null => (beat.i === i ? v : null);

/** Ekranda yağan/uçuşan küçük parçalar (kar, yağmur, yaprak, kıvılcım) */
export function Drift({
  count,
  render,
  from,
  to,
  dur,
  xs = [0, W],
  sway: sw = 0,
  rotate = 0,
}: {
  count: number;
  render: (i: number) => ReactNode;
  from: number;
  to: number;
  dur: [number, number];
  xs?: [number, number];
  sway?: number;
  rotate?: number;
}) {
  const [items] = useState(() => Array.from({ length: count }, (_, i) => ({ i, x: rnd(xs[0], xs[1]), d: rnd(dur[0], dur[1]), delay: -rnd(0, dur[1]), s: rnd(-1, 1) })));
  return (
    <>
      {items.map((p) => (
        <motion.div
          key={p.i}
          className="pointer-events-none absolute left-0 top-0"
          initial={{ x: p.x, y: from }}
          animate={{ y: [from, to], x: sw ? [p.x, p.x + sw * p.s, p.x - sw * p.s * 0.5] : p.x, rotate: rotate ? [0, rotate * p.s] : 0 }}
          transition={{ duration: p.d, repeat: Infinity, ease: "linear", delay: p.delay }}
        >
          {render(p.i)}
        </motion.div>
      ))}
    </>
  );
}

/** Gökyüzünde parlayan yıldızlar */
export function Stars({ count = 60, maxY = 500 }: { count?: number; maxY?: number }) {
  const [stars] = useState(() => Array.from({ length: count }, (_, i) => ({ i, x: rnd(0, W), y: rnd(0, maxY), r: rnd(0.8, 2.2), d: rnd(2, 5), delay: rnd(0, 4) })));
  return (
    <Layer>
      {stars.map((s) => (
        <motion.circle key={s.i} cx={s.x} cy={s.y} r={s.r} fill="#fff" animate={{ opacity: [0.15, 0.9, 0.15] }} transition={{ duration: s.d, repeat: Infinity, delay: s.delay }} />
      ))}
    </Layer>
  );
}
