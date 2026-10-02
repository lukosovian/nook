/**
 * Adanın fiziksel formları. Tüm ölçüler mantıksal (CSS) px.
 * Ada ekranın üst kenarına yapışık bir çentik: üst köşeler düz, `radius` yalnızca alt köşeler.
 */
export type IslandMode = "collapsed" | "intro" | "feeding" | "expanded" | "search" | "osd" | "toast" | "alarm" | "tour";

export const ISLAND: Record<IslandMode, { width: number; height: number; radius: number }> = {
  collapsed: { width: 128, height: 34, radius: 14 },
  /** Açılış: parçacıklar toplanıp Nook doğarken */
  intro: { width: 220, height: 74, radius: 30 },
  feeding: { width: 196, height: 66, radius: 26 },
  expanded: { width: 540, height: 252, radius: 28 },
  search: { width: 540, height: 252, radius: 28 },
  /** Ses/parlaklık göstergesi */
  osd: { width: 280, height: 34, radius: 14 },
  /** Sistem olayı kartı (şarj, USB, kulaklık…) */
  toast: { width: 310, height: 52, radius: 20 },
  /** Çalan alarm */
  alarm: { width: 360, height: 70, radius: 26 },
  /** "Nook nedir?" tanıtımı: ada ekrana yayılır */
  tour: { width: 900, height: 520, radius: 40 },
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
export const EXPANDED: { header: number; views: Record<View, { hero: Box; content: Box }> } = {
  header: 38,
  views: {
    home: { hero: { x: 12, y: 38, w: 250, h: 202 }, content: { x: 270, y: 38, w: 258, h: 202 } },
    module: { hero: { x: 12, y: 38, w: 150, h: 202 }, content: { x: 170, y: 38, w: 358, h: 202 } },
  },
};

/** Büyük Nook'un kahraman kartındaki ölçeği */
const HERO_SCALE = 2.6;

export function mascotPose(mode: IslandMode, width = ISLAND[mode].width, view: View = "module") {
  const { height } = ISLAND[mode];
  const center = (cx: number, cy: number, scale: number) => ({ left: cx - FACE / 2, top: cy - FACE / 2, scale });
  switch (mode) {
    case "expanded":
    case "search": {
      const v = mode === "search" ? "module" : view;
      const h = EXPANDED.views[v].hero;
      return v === "home"
        ? center(h.x + 52, h.y + h.h / 2 - 4, HERO_SCALE)
        : center(h.x + h.w / 2, h.y + 16 + (FACE * HERO_SCALE) / 2, HERO_SCALE);
    }
    case "intro":
      return center(width / 2, height / 2, 1.5);
    case "feeding":
      return center(width / 2, height / 2 + 3, 1.6);
    case "osd":
      return center(22, height / 2, 0.92);
    case "toast":
      return center(28, height / 2, 1.15);
    case "alarm":
      return center(36, height / 2 + 2, 1.45);
    default:
      return center(width / 2, height / 2, 1);
  }
}
