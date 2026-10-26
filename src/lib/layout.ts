/**
 * Adanın fiziksel formları. Tüm ölçüler mantıksal (CSS) px.
 * Ada ekranın üst kenarına yapışık bir çentik: üst köşeler düz, `radius` yalnızca alt köşeler.
 */
export type IslandMode = "collapsed" | "intro" | "feeding" | "expanded" | "search" | "osd" | "toast" | "alarm" | "tour" | "reminder" | "brief" | "notes" | "report" | "guard" | "gate" | "claude" | "hum" | "halloween";

export const ISLAND: Record<IslandMode, { width: number; height: number; radius: number }> = {
  collapsed: { width: 128, height: 34, radius: 14 },
  /** Açılış: parçacıklar toplanıp Nook doğarken */
  intro: { width: 220, height: 74, radius: 30 },
  feeding: { width: 196, height: 66, radius: 26 },
  /** Açık ada: boyutu sekmeye göre değişir (bkz. sizeFor); bu ana sayfanınki */
  expanded: { width: 724, height: 304, radius: 32 },
  search: { width: 664, height: 300, radius: 32 },
  /** Ses/parlaklık göstergesi */
  osd: { width: 280, height: 34, radius: 14 },
  /** Sistem olayı kartı (şarj, USB, kulaklık, bildirimler) */
  toast: { width: 360, height: 58, radius: 22 },
  /** Çalan alarm */
  alarm: { width: 360, height: 70, radius: 26 },
  /** Su hatırlatması: cevaplanana kadar durur */
  reminder: { width: 440, height: 66, radius: 26 },
  /** Cadılar Bayramı: Şeker mi şaka mı kartı */
  halloween: { width: 380, height: 60, radius: 24 },
  /** Odak bekçisi: Nook cama vurup saati gösterir */
  guard: { width: 500, height: 78, radius: 28 },
  /** Açılış kilidi: parola adada yazılır */
  gate: { width: 420, height: 78, radius: 28 },
  /** Claude Code izin/soru kartı: cevaplanana kadar durur */
  claude: { width: 600, height: 92, radius: 30 },
  /** Hum: dinlerken ve bulunan şarkının kartı (kapak, ad, sanatçı) */
  hum: { width: 470, height: 84, radius: 30 },
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

/** Ekranın üst kenarından boşluk. 0 = ada ekrana yapışık (çentik). */
export const ISLAND_TOP = 0;

/** Hit rect'e eklenen tolerans — imleç kenara sürtünürken titremeyi önler. */
export const HIT_PADDING = 6;

/** Maskotun küre yüzünün çapı (ölçeklenmeden önce). */
export const FACE = 24;

/**
 * Açık ada (0.3: sol dikey bar + bento): solda ince bir çubuk (ana sayfa, modüller, sohbet, ara…),
 * üstte durum çubuğu, altında kartlar.
 *  - Ana sayfa: solda Nook kartı (selam, Nook, "şu an"), sağda sık kullanılanların bentosu
 *  - Modüller: dar Nook kartı + bütün modüllerin ızgarası
 *  - Bölüm: dar Nook kartı + bölümün içeriği. Her bölümün kendi ada boyutu var (bkz. MODULE_SIZE).
 * Görünüm değişince ada yeni boyutuna esner, kartlar ve Nook animasyonla yeni yerlerine geçer.
 */
export type View = "home" | "modules" | "module";
type Box = { x: number; y: number; w: number; h: number };
export type IslandSize = { width: number; height: number };
export interface Expanded {
  width: number;
  height: number;
  radius: number;
  header: number;
  /** Soldaki dikey çubuğun genişliği */
  dock: number;
  /** İçerik kartının yakınlaştırması: tam ekranda yazılar ve düğmeler de büyür */
  zoom: number;
  /** Büyük Nook'un kahraman kartındaki ölçeği */
  heroScale: number;
  /** Büyük adada kahraman kartının altındaki ses kutusunun yüksekliği (0 = yok) */
  soundH: number;
  views: Record<View, { hero: Box; content: Box }>;
}

/** Soldaki dikey çubuk */
export const DOCK = 46;
/** Ana sayfa (bento) */
export const HOME_SIZE: IslandSize = { width: 724, height: 304 };
/** Bütün modüllerin ızgarası (bütün kartlar kaydırmasız rahatça sığar) */
export const MODULES_SIZE: IslandSize = { width: 800, height: 340 };
/** Boyutu ayrıca verilmemiş bölüm */
export const MODULE_DEFAULT: IslandSize = { width: 664, height: 300 };
/**
 * Bölümlerin kendi ada boyutları: hepsini aynı kalıba sıkıştırmak yerine içeriği neyse ona göre.
 * Dar Nook kartı (150) + dikey çubuk hep var; geri kalanı içerik.
 */
export const MODULE_SIZE: Partial<Record<string, IslandSize>> = {
  media: { width: 680, height: 292 },
  hum: { width: 720, height: 300 },
  argus: { width: 760, height: 336 },
  claude: { width: 744, height: 330 },
  whatsapp: { width: 744, height: 330 },
  focus: { width: 660, height: 300 },
  shelf: { width: 700, height: 300 },
  clip: { width: 700, height: 320 },
  note: { width: 720, height: 320 },
  alarm: { width: 740, height: 300 },
  calendar: { width: 724, height: 330 },
  remind: { width: 700, height: 316 },
  habits: { width: 724, height: 330 },
  apps: { width: 690, height: 300 },
  notify: { width: 690, height: 320 },
  control: { width: 680, height: 320 },
  devices: { width: 724, height: 316 },
  stats: { width: 724, height: 316 },
  play: { width: 680, height: 320 },
  chat: { width: 700, height: 340 },
  look: { width: 724, height: 360 },
  settings: { width: 724, height: 360 },
  archive: { width: 680, height: 320 },
  year: { width: 724, height: 360 },
};
/** Adanın yanındaki kartların (ses, Argus) boyu: ayrı pencereler, adanın boyundan bağımsız */
export const SIDE_CARD_H = 290;
/** Açık adanın normaldeki en büyük hâli (pencere bundan biraz büyük) */
export const EXPANDED_MAX: IslandSize = { width: 780, height: 380 };

/** Sekmenin ada boyutu */
export function sizeFor(tab: string, searching = false): IslandSize {
  if (searching) return MODULE_DEFAULT;
  if (tab === "home") return HOME_SIZE;
  if (tab === "modules") return MODULES_SIZE;
  return MODULE_SIZE[tab] ?? MODULE_DEFAULT;
}

export const viewOf = (tab: string, searching = false): View => (searching ? "module" : tab === "home" ? "home" : tab === "modules" ? "modules" : "module");

/** Tam ekranda adanın en büyük hâli (ekran daha küçükse ekrana sığar) */
export const BIG_MAX = { width: 1360, height: 820 };
/** Tam ekran için pencere: ekrandan büyük istenir, Rust ekrana sığdırır */
export const BIG_WINDOW = { width: 4000, height: 3000 };

/** Açık adanın ölçüleri; `big` verilirse ada o boyuta yayılır, kartlar ve Nook orantılı büyür */
export function expandedLayout(big: IslandSize | null = null, sound = false, size: IslandSize = HOME_SIZE): Expanded {
  const width = big?.width ?? size.width;
  const height = big?.height ?? size.height;
  const k = big ? Math.min(width / HOME_SIZE.width, height / HOME_SIZE.height) : 1;
  const zoom = big ? Math.min(1.7, Math.max(1, Math.round(k * 0.62 * 100) / 100)) : 1;
  const header = Math.round(40 * zoom);
  const dock = Math.round(DOCK * zoom);
  const pad = Math.round(10 * Math.min(k, 1.6));
  const gap = Math.round(8 * Math.min(k, 1.6));
  const h = height - header - pad;
  const left = dock + pad;
  const box = (heroW: number) => ({
    hero: { x: left, y: header, w: heroW, h },
    content: { x: left + heroW + gap, y: header, w: width - left - pad - heroW - gap, h },
  });
  const heroScale = big ? Math.min(7, 2.9 * k * 0.85) : 2.9;
  const narrow = big ? Math.round(width * 0.2) : 150;
  return {
    width,
    height,
    dock,
    // Ses kartı ayrı pencere yerine kahraman kartının altında (adanın boyu kadar, yakınlaştırmayla)
    soundH: big && sound ? Math.round(HOME_SIZE.height * zoom) : 0,
    radius: big ? 44 : 32,
    header,
    zoom,
    heroScale,
    views: {
      home: box(big ? Math.round(width * 0.27) : 206),
      // Izgarada Nook kartı biraz daha dar: bütün modüller kaydırmasız üç sıraya sığsın
      modules: box(big ? narrow : 128),
      module: box(narrow),
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
        ? // Ana sayfa: Nook kartının ortasında, üstteki selamın altında
          center(h.x + h.w / 2, h.y + (ex.soundH ? (h.h - ex.soundH) * 0.34 : h.h * 0.4), s)
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
    case "halloween":
      return center(36, height / 2 + 2, 1.45);
    case "claude":
      return center(40, height / 2, 1.5);
    case "hum":
      return center(46, height / 2 + 2, 1.7);
    case "guard":
    case "gate":
      return center(44, height / 2 + 3, 1.75);
    default:
      return center(width / 2, height / 2, 1);
  }
}
