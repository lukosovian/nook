/**
 * Nook'un görünümü (ChatGPT Dots'tan ilhamla): her kullanıcı kendi Nook'unu isimlendirir; gövde
 * biçimini, dokusunu (vinil / peluş), rengini, gözlerini ve siyah parlak aksesuarlarını seçer.
 * Gövde ve aksesuarlar lib/nook3d'de 3B çizilir; gözler ifadeleriyle birlikte DOM'da kalır.
 */
import { useNook } from "../store/nook";

export type ShapeId = "sphere" | "cloud" | "heart" | "triangle" | "flower" | "bean" | "blob" | "pumpkin" | "ghost";
export type Texture = "smooth" | "plush";
export type EyeStyle = "pill" | "bead" | "diamond" | "sparkle" | "calm";
export type GlassesId = "none" | "round" | "bold" | "shades" | "monocle";
export type HeadId = "none" | "beret" | "headphones" | "bowler" | "antenna" | "bow" | "ears" | "cap" | "sprout" | "flower" | "star" | "stalks" | "witch" | "horns" | "bat";
export type NeckId = "none" | "bowtie";

export interface Look {
  shape: ShapeId;
  texture: Texture;
  eyes: EyeStyle;
  glasses: GlassesId;
  head: HeadId;
  neck: NeckId;
}

export const DEFAULT_LOOK: Look = { shape: "sphere", texture: "smooth", eyes: "pill", glasses: "none", head: "none", neck: "none" };

/** CSS gövde (WebGL yoksa ya da Nook kutuya dönüşünce) */
export interface BodyShape {
  width: number;
  height: number;
  borderRadius: string;
}

/** Hep aynı biçimde (8 değer) yazılır ki şekiller arasında yumuşakça dönüşebilsin. */
export const radii = (x: [number, number, number, number], y = x) => `${x.map((v) => `${v}px`).join(" ")} / ${y.map((v) => `${v}px`).join(" ")}`;
export const roundBody = (w: number, h = w): BodyShape => {
  const r = Math.min(w, h) / 2;
  return { width: w, height: h, borderRadius: radii([r, r, r, r]) };
};

export const SHAPES: { id: ShapeId; label: string }[] = [
  { id: "sphere", label: "Küre" },
  { id: "cloud", label: "Bulut" },
  { id: "heart", label: "Kalp" },
  { id: "triangle", label: "Üçgen" },
  { id: "flower", label: "Çiçek" },
  { id: "bean", label: "Fasulye" },
  { id: "blob", label: "Damla" },
  { id: "pumpkin", label: "Balkabağı" },
  { id: "ghost", label: "Hayalet" },
];

export const TEXTURES: { id: Texture; label: string }[] = [
  { id: "smooth", label: "Vinil" },
  { id: "plush", label: "Peluş" },
];

export const EYE_STYLES: { id: EyeStyle; label: string }[] = [
  { id: "pill", label: "Hap" },
  { id: "bead", label: "Boncuk" },
  { id: "diamond", label: "Elmas" },
  { id: "sparkle", label: "Parlak" },
  { id: "calm", label: "Sakin" },
];

export const GLASSES: { id: GlassesId; label: string }[] = [
  { id: "none", label: "Yok" },
  { id: "round", label: "Yuvarlak" },
  { id: "bold", label: "Kalın" },
  { id: "shades", label: "Güneş" },
  { id: "monocle", label: "Monokl" },
];

export const HEADS: { id: HeadId; label: string }[] = [
  { id: "none", label: "Yok" },
  { id: "beret", label: "Bere" },
  { id: "bowler", label: "Melon" },
  { id: "headphones", label: "Kulaklık" },
  { id: "antenna", label: "Anten" },
  { id: "bow", label: "Fiyonk" },
  { id: "cap", label: "Kep" },
  { id: "ears", label: "Kulak" },
  { id: "sprout", label: "Filiz" },
  { id: "flower", label: "Çiçek" },
  { id: "star", label: "Yıldız" },
  { id: "stalks", label: "Salyangoz" },
  { id: "witch", label: "Cadı" },
  { id: "horns", label: "Boynuz" },
  { id: "bat", label: "Yarasa" },
];

/** Kepin rengi: gövdeyle karışmasın diye mavi gövdede mercan, öbürlerinde koyu mavi (Dots'taki gibi) */
export const capColor = (body: string) => (["#2B8CFF", "#9B7BFF", "#E23BD6"].includes(body.toUpperCase()) ? "#FF6A3D" : "#2F5BFF");

export const NECKS: { id: NeckId; label: string }[] = [
  { id: "none", label: "Yok" },
  { id: "bowtie", label: "Papyon" },
];

/** Gövde renkleri: Nook'un beyazı + Dots gibi canlı, doygun tonlar */
export const BODY_COLORS = ["#F4F4F6", "#2B8CFF", "#E23BD6", "#FFD21F", "#FF6A3D", "#8FE03A", "#9B7BFF", "#FF5C8A", "#2FD4C0", "#FF8A1F"];

/** Eski sürümlerden kalan ya da bozuk kaydı geçerli bir görünüme çevirir */
export function normalizeLook(raw: Partial<Look> | undefined): Look {
  const ok = <T extends string>(v: unknown, list: { id: T }[], d: T): T => (list.some((o) => o.id === v) ? (v as T) : d);
  return {
    shape: ok(raw?.shape, SHAPES, DEFAULT_LOOK.shape),
    texture: ok(raw?.texture, TEXTURES, DEFAULT_LOOK.texture),
    eyes: ok(raw?.eyes, EYE_STYLES, DEFAULT_LOOK.eyes),
    glasses: ok(raw?.glasses, GLASSES, DEFAULT_LOOK.glasses),
    head: ok(raw?.head, HEADS, DEFAULT_LOOK.head),
    neck: ok(raw?.neck, NECKS, DEFAULT_LOOK.neck),
  };
}

/** Renk geçersizse (eski pastel paletten kalmış olabilir) olduğu gibi kullanılır; yalnızca biçim denetlenir */
export const normalizeColor = (c: string | undefined) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : BODY_COLORS[0]);

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

/** "Şaşırt beni": Dots gibi sade — en fazla iki aksesuar */
export function randomLook(): { look: Look; color: string } {
  const slots = ["glasses", "head", "neck"].sort(() => Math.random() - 0.5).slice(0, Math.random() < 0.3 ? 1 : 2);
  const glasses = slots.includes("glasses") ? pick(GLASSES.slice(1)).id : "none";
  return {
    look: {
      shape: pick(SHAPES).id,
      texture: Math.random() < 0.35 ? "plush" : "smooth",
      eyes: pick(EYE_STYLES).id,
      glasses,
      head: slots.includes("head") ? pick(HEADS.slice(1)).id : "none",
      neck: slots.includes("neck") ? "bowtie" : "none",
    },
    color: pick(BODY_COLORS.slice(1)),
  };
}

// ------------------------------------------------------------------ isim

export const NAME_MAX = 16;

/** Kullanıcının verdiği isim; yoksa "Nook" */
export const nookName = (name = useNook.getState().settings.nookName) => name.trim() || "Nook";
export const useNookName = () => nookName(useNook((s) => s.settings.nookName));

const BACK = "aıouAIOU";
const FRONT = "eiöüEİÖÜ";
const VOWELS = BACK + FRONT;

/** Son ünlü kalın mı (a, ı, o, u)? Ünlüsü yoksa (ör. "Nook" gibi yabancı adlar zaten kalın) kalın sayılır. */
function backVowel(word: string) {
  for (let i = word.length - 1; i >= 0; i--) {
    if (BACK.includes(word[i])) return true;
    if (FRONT.includes(word[i])) return false;
  }
  return true;
}

/**
 * Özel ada Türkçe ek: kesme işaretiyle, ünlü uyumuna göre.
 *   ek("Nook", "la") → "Nook'la", ek("Pamuk", "a") → "Pamuk'a", ek("Bulut", "un") → "Bulut'un"
 *   ek("Fıstık", "la"), ek("Elma", "la") → "Elma'yla", ek("Elma", "a") → "Elma'ya"
 */
export function ek(name: string, suffix: "la" | "a" | "un") {
  const back = backVowel(name);
  const last = name[name.length - 1] ?? "";
  const vowelEnd = VOWELS.includes(last);
  if (suffix === "la") return `${name}'${vowelEnd ? "y" : ""}${back ? "la" : "le"}`;
  if (suffix === "a") return `${name}'${vowelEnd ? "y" : ""}${back ? "a" : "e"}`;
  // İyelik: dört yönlü uyum (ı, i, u, ü)
  let v = "ı";
  for (let i = name.length - 1; i >= 0; i--) {
    const c = name[i].toLocaleLowerCase("tr");
    if ("aı".includes(c)) { v = "ı"; break; }
    if ("ei".includes(c)) { v = "i"; break; }
    if ("ou".includes(c)) { v = "u"; break; }
    if ("öü".includes(c)) { v = "ü"; break; }
  }
  return `${name}'${vowelEnd ? "n" : ""}${v}n`;
}

// ------------------------------------------------------------------ yapay zekâya tarif

const COLOR_NAMES: Record<string, string> = {
  "#F4F4F6": "beyaz",
  "#FFFFFF": "beyaz",
  "#2B8CFF": "elektrik mavisi",
  "#E23BD6": "fuşya",
  "#FFD21F": "limon sarısı",
  "#FF6A3D": "mercan",
  "#8FE03A": "fıstık yeşili",
  "#9B7BFF": "lavanta",
  "#FF5C8A": "pembe",
  "#2FD4C0": "turkuaz",
  "#FF8A1F": "turuncu",
};
const SHAPE_WORDS: Record<ShapeId, string> = { sphere: "yuvarlak bir küre", cloud: "kabarık bir bulut", heart: "tombul bir kalp", triangle: "yumuşak bir üçgen", flower: "tırtıklı bir çiçek", bean: "fasulye biçimli", blob: "damla biçimli, tombul", pumpkin: "dilimli bir balkabağı", ghost: "etekleri dalgalı bir hayalet" };
const EYE_WORDS: Record<EyeStyle, string> = { pill: "iki siyah hap göz", bead: "parlak boncuk gözler", diamond: "elmas biçimli gözler", sparkle: "iri, parıltılı gözler", calm: "sakin, yarı kapalı gözler" };
const WEAR_WORDS: Partial<Record<GlassesId | HeadId | NeckId, string>> = {
  round: "yuvarlak tel gözlük",
  bold: "kalın çerçeveli gözlük",
  shades: "güneş gözlüğü",
  monocle: "monokl",
  beret: "Fransız beresi",
  bowler: "melon şapka",
  headphones: "kulaklık",
  antenna: "anten",
  bow: "fiyonk",
  bowtie: "papyon",
  cap: "kep",
  ears: "tavşan kulakları",
  sprout: "başında filiz",
  flower: "çiçek tokası",
  star: "yıldız tokası",
  stalks: "salyangoz gibi saplı gözler",
  witch: "sivri cadı şapkası",
  horns: "kırmızı şeytan boynuzları",
  bat: "yarasa tokası",
};

/** Sistem isteminde: "elektrik mavisi, peluş, kabarık bir bulut gövde, parlak boncuk gözler; üstünde siyah Fransız beresi" */
export function describeLook(raw: Look, color = useNook.getState().settings.faceColor) {
  const look = normalizeLook(raw);
  const tone = COLOR_NAMES[color.toUpperCase()] ?? "renkli";
  const wear = [look.glasses, look.head, look.neck].map((k) => WEAR_WORDS[k]).filter(Boolean);
  return `${tone}${look.texture === "plush" ? ", peluş" : ""}, ${SHAPE_WORDS[look.shape]} gövde, ${EYE_WORDS[look.eyes]}${wear.length ? `; üstünde ${wear.join(", ")}` : ""}`;
}

// ------------------------------------------------------------------ vitrin (tanıtım)

/**
 * Tanıtımdaki Nook kalabalığı (Dots afişi gibi): arkada bir sıra, önde daha iri bir sıra; alttan
 * kesilerek iç içe dizilirler. x, y: gövde merkezinin sahnedeki yeri (px), size: gövde çapı.
 */
export const SHOWCASE: { name: string; color: string; look: Look; x: number; y: number; size: number; mood?: "happy" | "wink" | "love" }[] = [
  // arka sıra
  { name: "Pamuk", color: "#F4F4F6", look: { ...DEFAULT_LOOK, shape: "cloud", texture: "plush" }, x: 64, y: 250, size: 100 },
  { name: "Mandalina", color: "#FF6A3D", look: { ...DEFAULT_LOOK, shape: "blob", texture: "plush", head: "flower" }, x: 166, y: 218, size: 104, mood: "happy" },
  { name: "Lila", color: "#9B7BFF", look: { ...DEFAULT_LOOK, shape: "blob", texture: "plush", head: "stalks" }, x: 272, y: 242, size: 92, mood: "happy" },
  { name: "Kaptan", color: "#2FD4C0", look: { ...DEFAULT_LOOK, shape: "blob", texture: "plush", head: "cap" }, x: 374, y: 228, size: 98 },
  { name: "Pembiş", color: "#FF5C8A", look: { ...DEFAULT_LOOK, shape: "bean", texture: "plush", head: "ears" }, x: 474, y: 234, size: 94 },
  { name: "Filiz", color: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "sphere", texture: "plush", head: "sprout" }, x: 556, y: 270, size: 88 },
  // ön sıra
  { name: "Yıldız", color: "#9B7BFF", look: { ...DEFAULT_LOOK, shape: "sphere", texture: "plush", head: "star" }, x: 44, y: 356, size: 112 },
  { name: "Bulut", color: "#2B8CFF", look: { ...DEFAULT_LOOK, shape: "cloud", texture: "plush", head: "beret" }, x: 172, y: 362, size: 134 },
  { name: "Fıstık", color: "#8FE03A", look: { ...DEFAULT_LOOK, shape: "sphere", texture: "plush", eyes: "bead", head: "stalks" }, x: 296, y: 370, size: 104 },
  { name: "Profesör", color: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "triangle", texture: "plush", eyes: "calm", glasses: "round" }, x: 398, y: 362, size: 118 },
  { name: "Kalp", color: "#E23BD6", look: { ...DEFAULT_LOOK, shape: "heart", texture: "plush", glasses: "shades" }, x: 496, y: 364, size: 112 },
  { name: "Kiraz", color: "#FF3B4A", look: { ...DEFAULT_LOOK, shape: "sphere", texture: "plush" }, x: 572, y: 366, size: 100, mood: "wink" },
];

/** Cadılar Bayramı parçaları Görünüm'de yalnızca kendi bölümünde (hazır kostümlerde) görünür */
export const HALLOWEEN_PARTS = new Set<string>(["pumpkin", "ghost", "witch", "horns", "bat"]);

/** Cadılar Bayramı: Görünüm'de tek dokunuşla giyilen hazır Nook'lar */
export const HALLOWEEN: { name: string; color: string; look: Look }[] = [
  { name: "Bal Kabak", color: "#FF8A1F", look: { ...DEFAULT_LOOK, shape: "pumpkin", eyes: "diamond" } },
  { name: "Hayalet", color: "#F4F4F6", look: { ...DEFAULT_LOOK, shape: "ghost", eyes: "bead" } },
  { name: "Cadı", color: "#8FE03A", look: { ...DEFAULT_LOOK, shape: "blob", texture: "plush", head: "witch" } },
  { name: "Şeytancık", color: "#E23BD6", look: { ...DEFAULT_LOOK, shape: "sphere", eyes: "calm", head: "horns" } },
  { name: "Yarasa", color: "#9B7BFF", look: { ...DEFAULT_LOOK, shape: "bean", texture: "plush", head: "bat" } },
  { name: "Kabak Cadı", color: "#FF8A1F", look: { ...DEFAULT_LOOK, shape: "pumpkin", texture: "plush", head: "witch" } },
];

/**
 * Ana sayfadaki çiplerin Nook'ları: her biri bölümün işine göre giyinmiş (Medya'da kulaklık,
 * Pomodoro'da filizli domates, Karne'de monokllü öğretmen…). Renkler çipin rengine yakın.
 */
export const CHIP_NOOKS: Record<string, { color: string; look: Look }> = {
  today: { color: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "flower", eyes: "sparkle" } },
  media: { color: "#FF5C8A", look: { ...DEFAULT_LOOK, shape: "heart", head: "headphones" } },
  argus: { color: "#2B8CFF", look: { ...DEFAULT_LOOK, shape: "sphere", eyes: "bead", glasses: "round" } },
  focus: { color: "#FF3B4A", look: { ...DEFAULT_LOOK, shape: "sphere", texture: "smooth", eyes: "calm", head: "sprout" } },
  shelf: { color: "#2FD4C0", look: { ...DEFAULT_LOOK, shape: "cloud", texture: "plush" } },
  clip: { color: "#9B7BFF", look: { ...DEFAULT_LOOK, shape: "bean", glasses: "bold" } },
  note: { color: "#FF6A3D", look: { ...DEFAULT_LOOK, shape: "triangle", head: "beret" } },
  alarm: { color: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "sphere", eyes: "diamond", head: "antenna" } },
  apps: { color: "#2B8CFF", look: { ...DEFAULT_LOOK, shape: "blob", texture: "plush", head: "cap" } },
  notify: { color: "#9B7BFF", look: { ...DEFAULT_LOOK, shape: "bean", texture: "plush", head: "ears" } },
  control: { color: "#8FE03A", look: { ...DEFAULT_LOOK, shape: "sphere", head: "bowler", neck: "bowtie" } },
  devices: { color: "#2B8CFF", look: { ...DEFAULT_LOOK, shape: "triangle", head: "headphones" } },
  stats: { color: "#FF5C8A", look: { ...DEFAULT_LOOK, shape: "blob", glasses: "shades" } },
  play: { color: "#E23BD6", look: { ...DEFAULT_LOOK, shape: "cloud", eyes: "sparkle", head: "star" } },
  report: { color: "#2FD4C0", look: { ...DEFAULT_LOOK, shape: "sphere", eyes: "calm", glasses: "monocle" } },
  notes: { color: "#FF8A1F", look: { ...DEFAULT_LOOK, shape: "pumpkin", head: "witch" } },
  look: { color: "#FF5C8A", look: { ...DEFAULT_LOOK, shape: "cloud", texture: "plush", head: "bow" } },
};

/** Tanıtımın ilk sayfasındaki çipler: her birinde başka bir Nook */
export const TOUR_CHIPS: { label: string; body: string; look: Look }[] = [
  { label: "Müzik", body: "#FF5C8A", look: { ...DEFAULT_LOOK, shape: "heart", head: "headphones" } },
  { label: "Dosya rafı", body: "#2FD4C0", look: { ...DEFAULT_LOOK, shape: "cloud", texture: "plush", eyes: "bead" } },
  { label: "Yapay zekâ", body: "#9B7BFF", look: { ...DEFAULT_LOOK, shape: "triangle", glasses: "round" } },
  { label: "Alarm", body: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "flower", eyes: "sparkle" } },
  { label: "Odak", body: "#FF6A3D", look: { ...DEFAULT_LOOK, shape: "bean", head: "bowler" } },
];
