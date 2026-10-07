/**
 * Adanın fiziksel formları. Tüm ölçüler mantıksal (CSS) px.
 * Ada ekranın üst kenarına yapışık bir çentik: üst köşeler düz, `radius` yalnızca alt köşeler.
 */
export type IslandMode = "collapsed" | "intro" | "feeding" | "expanded" | "search" | "osd" | "toast" | "alarm" | "tour" | "reminder" | "brief" | "notes" | "report" | "guard" | "gate";

export const ISLAND: Record<IslandMode, { width: number; height: number; radius: number }> = {
  collapsed: { width: 128, height: 34, radius: 14 },
  /** Açılış: parçacıklar toplanıp Nook doğarken */
  intro: { width: 220, height: 74, radius: 30 },
  feeding: { width: 196, height: 66, radius: 26 },
  expanded: { width: 620, height: 290, radius: 30 },
  search: { width: 620, height: 290, radius: 30 },
  /** Ses/parlaklık göstergesi */
  osd: { width: 280, height: 34, radius: 14 },
  /** Sistem olayı kartı (şarj, USB, kulaklık…) */
  toast: { width: 310, height: 52, radius: 20 },
  /** Çalan alarm */
  alarm: { width: 360, height: 70, radius: 26 },
  /** Su hatırlatması: cevaplanana kadar durur */
  reminder: { width: 440, height: 66, radius: 26 },
  /** Odak bekçisi: Nook cama vurup saati gösterir */
  guard: { width: 500, height: 78, radius: 28 },
  /** Açılış kilidi: parola adada yazılır */
  gate: { width: 420, height: 78, radius: 28 },
  /** "Nook nedir?" tanıtımı: ada ekrana yayılır */
  tour: { width: 900, height: 520, radius: 40 },
  /** Günün özeti: ada büyür, solda kocaman Nook, sağda kartlar */
  brief: { width: 880, height: 440, radius: 38 },
  /** Yama notları: günün özetiyle aynı büyük ada */
  notes: { width: 880, height: 440, radius: 38 },
  /** Karne: günün özetiyle aynı büyük ada; solda Nook ve not, sağda haftanın dökümü */
  report: { width: 880, height: 440, radius: 38 },
};

/** Günün özeti düzeni (adaya göre) */
export const BRIEF = {
  header: 46,
  hero: { x: 16, y: 46, w: 252, h: 378 },
  content: { x: 278, y: 46, w: 586, h: 378 },
  /** Nook'un kahraman kartındaki merkezi ve ölçeği */
  face: { cx: 16 + 126, cy: 46 + 72, scale: 3.6 },
};

/** Tanıtım sırasında pencere (gölge payıyla) */
export const TOUR_WINDOW = { width: 960, height: 580 };

/**
 * Tanıtım düzeni: başta ve sonda Nook ortada kocaman; aradaki adımlarda solda
 * Nook + anlatım, sağda wireframe. Kutu ölçüleri adaya göre.
 */
export const TOUR = {
  header: 46,
  hero: { x: 18, y: 46, w: 272, h: 408 },
  content: { x: 300, y: 46, w: 582, h: 408 },
};

export function tourPose(centered: boolean) {
  const { width } = ISLAND.tour;
  const scale = centered ? 5.4 : 4;
  const cx = centered ? width / 2 : TOUR.hero.x + TOUR.hero.w / 2;
  const cy = centered ? 168 : TOUR.hero.y + 28 + (FACE * scale) / 2;
  return { left: cx - FACE / 2, top: cy - FACE / 2, scale };
}

/** Kapalıyken müzik/indirme varsa: solda kapak/halka, sağda ekolayzer/hız için genişler. */
export const MEDIA_COLLAPSED_WIDTH = 200;

/** Ekranın üst kenarından boşluk. 0 = ada ekrana yapışık (çentik). */
export const ISLAND_TOP = 0;

/** Hit rect'e eklenen tolerans — imleç kenara sürtünürken titremeyi önler. */
export const HIT_PADDING = 6;

/** Maskotun küre yüzünün çapı (ölçeklenmeden önce). */
export const FACE = 24;

/**
 * Açık ada (Grok Bot düzeni): üstte küçük ikonlar ve durum çubuğu, altında iki kart.
 *  - Ana sayfa: geniş Nook kartı (Nook solda, "şu an" listesi sağında) + modül çipleri
 *  - Bölüm: dar Nook kartı (Nook üstte, liste altta) + geniş içerik kartı
 * Görünüm değişince kartlar ve Nook animasyonla yeni yerlerine geçer.
 */
export type View = "home" | "module";
type Box = { x: number; y: number; w: number; h: number };
export interface Expanded {
  width: number;
  height: number;
  radius: number;
  header: number;
  /** İçerik kartının yakınlaştırması: tam ekranda yazılar ve düğmeler de büyür */
  zoom: number;
  /** Büyük Nook'un kahraman kartındaki ölçeği */
  heroScale: number;
  /** Ana sayfada Nook'un merkezi ve "şu an" listesinin başı (kahraman kartının solundan) */
  homeNookX: number;
  homeListX: number;
  /** Büyük adada kahraman kartının altındaki ses kutusunun yüksekliği (0 = yok) */
  soundH: number;
  views: Record<View, { hero: Box; content: Box }>;
}

/** Tam ekranda adanın en büyük hâli (ekran daha küçükse ekrana sığar) */
export const BIG_MAX = { width: 1360, height: 820 };
/** Tam ekran için pencere: ekrandan büyük istenir, Rust ekrana sığdırır */
export const BIG_WINDOW = { width: 4000, height: 3000 };

/** Açık adanın ölçüleri; `big` verilirse ada o boyuta yayılır, kartlar ve Nook orantılı büyür */
export function expandedLayout(big: { width: number; height: number } | null = null, sound = false): Expanded {
  const width = big?.width ?? ISLAND.expanded.width;
  const height = big?.height ?? ISLAND.expanded.height;
  const k = big ? Math.min(width / ISLAND.expanded.width, height / ISLAND.expanded.height) : 1;
  const header = big ? 50 : 38;
  const pad = Math.round(12 * Math.min(k, 1.6));
  const gap = Math.round(8 * Math.min(k, 1.6));
  const h = height - header - pad;
  const box = (heroW: number) => ({
    hero: { x: pad, y: header, w: heroW, h },
    content: { x: pad + heroW + gap, y: header, w: width - pad * 2 - heroW - gap, h },
  });
  const heroScale = big ? Math.min(7, 2.9 * k * 0.85) : 2.9;
  const homeHero = Math.round(width * (big ? 0.42 : 0.46));
  const nookX = big ? Math.round(homeHero * 0.3) : FACE * heroScale * 0.84;
  const zoom = big ? Math.min(1.7, Math.max(1, Math.round(k * 0.62 * 100) / 100)) : 1;
  return {
    width,
    height,
    homeNookX: nookX,
    // Ses kartı ayrı pencere yerine kahraman kartının altında (adanın boyu kadar, yakınlaştırmayla)
    soundH: big && sound ? Math.round(ISLAND.expanded.height * zoom) : 0,
    // Nook'un sağ eli de sığsın
    homeListX: nookX + FACE * heroScale * (big ? 1.05 : 0.76),
    radius: big ? 44 : ISLAND.expanded.radius,
    header,
    zoom,
    heroScale,
    views: {
      home: box(homeHero),
      module: box(big ? Math.round(width * 0.25) : 168),
    },
  };
}

export const EXPANDED = expandedLayout();


export function mascotPose(mode: IslandMode, width = ISLAND[mode].width, view: View = "module", ex: Expanded = EXPANDED) {
  const { height } = ISLAND[mode];
  const center = (cx: number, cy: number, scale: number) => ({ left: cx - FACE / 2, top: cy - FACE / 2, scale });
  switch (mode) {
    case "expanded":
    case "search": {
      const v = mode === "search" ? "module" : view;
      const h = ex.views[v].hero;
      const s = ex.heroScale;
      return v === "home"
        ? center(h.x + ex.homeNookX, h.y + (h.h - ex.soundH) / 2 - 4, s)
        : ex.soundH
          ? // Büyük adada altta ses kutusu: Nook üstteki boşluğun ortasında
            center(h.x + h.w / 2, h.y + (h.h - ex.soundH) / 2, s)
          : center(h.x + h.w / 2, h.y + (24 * s) / 2.6 + (FACE * s) / 2, s);
    }
    case "brief":
    case "notes":
    case "report":
      return center(BRIEF.face.cx, BRIEF.face.cy, BRIEF.face.scale);
    case "intro":
      return center(width / 2, height / 2, 1.5);
    case "feeding":
      return center(width / 2, height / 2 + 3, 1.6);
    case "osd":
      return center(22, height / 2, 0.92);
    case "toast":
      return center(28, height / 2, 1.15);
    case "alarm":
    case "reminder":
      return center(36, height / 2 + 2, 1.45);
    case "guard":
    case "gate":
      return center(44, height / 2 + 3, 1.75);
    default:
      return center(width / 2, height / 2, 1);
  }
}
