/**
 * Nook'un görünümü (ChatGPT Dots'tan ilhamla): her kullanıcı kendi Nook'unu isimlendirir; gövde
 * biçimini, dokusunu (vinil / peluş), rengini, gözlerini ve siyah parlak aksesuarlarını seçer.
 * Gövde ve aksesuarlar lib/nook3d'de 3B çizilir; gözler ifadeleriyle birlikte DOM'da kalır.
 */
import { useNook } from "../store/nook";
import { isTurkish } from "./i18n";
import { tt } from "./i18n";

export type ShapeId = "sphere" | "cloud" | "heart" | "triangle" | "flower" | "bean" | "blob" | "pumpkin" | "ghost" | "cube" | "egg" | "star" | "cat" | "bear";
export type Texture = "smooth" | "plush" | "matte" | "jelly" | "metal" | "spots";
export type EyeStyle = "pill" | "bead" | "diamond" | "sparkle" | "calm";
export type GlassesId = "none" | "round" | "bold" | "shades" | "monocle" | "eyepatch" | "goggles";
export type HeadId = "none" | "beret" | "headphones" | "bowler" | "antenna" | "bow" | "ears" | "cap" | "sprout" | "flower" | "star" | "stalks" | "witch" | "horns" | "bat" | "cowboy" | "pirate" | "straw" | "conductor" | "helmet" | "hardhat";
export type NeckId = "none" | "bowtie" | "scarf";

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
  { id: "sphere", label: tt("Küre") },
  { id: "cloud", label: tt("Bulut") },
  { id: "heart", label: tt("Kalp") },
  { id: "triangle", label: tt("Üçgen") },
  { id: "flower", label: tt("Çiçek") },
  { id: "bean", label: tt("Fasulye") },
  { id: "blob", label: tt("Damla") },
  { id: "cube", label: tt("Şeker") },
  { id: "egg", label: tt("Yumurta") },
  { id: "star", label: tt("Yıldız") },
  { id: "cat", label: tt("Kedi") },
  { id: "bear", label: tt("Ayıcık") },
  { id: "pumpkin", label: tt("Balkabağı") },
  { id: "ghost", label: tt("Hayalet") },
];

export const TEXTURES: { id: Texture; label: string }[] = [
  { id: "smooth", label: tt("Vinil") },
  { id: "plush", label: tt("Peluş") },
  { id: "matte", label: tt("Mat kil") },
  { id: "jelly", label: tt("Jöle") },
  { id: "metal", label: tt("Metalik") },
  { id: "spots", label: tt("Benekli") },
];

export const EYE_STYLES: { id: EyeStyle; label: string }[] = [
  { id: "pill", label: tt("Hap") },
  { id: "bead", label: tt("Boncuk") },
  { id: "diamond", label: tt("Elmas") },
  { id: "sparkle", label: tt("Parlak") },
  { id: "calm", label: tt("Sakin") },
];

export const GLASSES: { id: GlassesId; label: string }[] = [
  { id: "none", label: tt("Yok") },
  { id: "round", label: tt("Yuvarlak") },
  { id: "bold", label: tt("Kalın") },
  { id: "shades", label: tt("Güneş") },
  { id: "monocle", label: tt("Monokl") },
  { id: "goggles", label: tt("Koruyucu") },
  { id: "eyepatch", label: tt("Göz bandı") },
];

export const HEADS: { id: HeadId; label: string }[] = [
  { id: "none", label: tt("Yok") },
  { id: "beret", label: tt("Bere") },
  { id: "bowler", label: tt("Melon") },
  { id: "headphones", label: tt("Kulaklık") },
  { id: "antenna", label: tt("Anten") },
  { id: "bow", label: tt("Fiyonk") },
  { id: "cap", label: tt("Kep") },
  { id: "ears", label: tt("Kulak") },
  { id: "sprout", label: tt("Filiz") },
  { id: "flower", label: tt("Çiçek") },
  { id: "star", label: tt("Yıldız") },
  { id: "stalks", label: tt("Salyangoz") },
  { id: "witch", label: tt("Cadı") },
  { id: "horns", label: tt("Boynuz") },
  { id: "bat", label: tt("Yarasa") },
  { id: "cowboy", label: tt("Kovboy") },
  { id: "pirate", label: tt("Korsan") },
  { id: "straw", label: tt("Hasır") },
  { id: "conductor", label: tt("Kondüktör") },
  { id: "helmet", label: tt("Miğfer") },
  { id: "hardhat", label: tt("Baret") },
];

/** Kepin rengi: gövdeyle karışmasın diye mavi gövdede mercan, öbürlerinde koyu mavi (Dots'taki gibi) */
export const capColor = (body: string) => (["#2B8CFF", "#9B7BFF", "#E23BD6"].includes(body.toUpperCase()) ? "#FF6A3D" : "#2F5BFF");

export const NECKS: { id: NeckId; label: string }[] = [
  { id: "none", label: tt("Yok") },
  { id: "bowtie", label: tt("Papyon") },
  { id: "scarf", label: tt("Atkı") },
];

/** Gövde renkleri: Nook'un beyazı + Dots gibi canlı, doygun tonlar */
export const BODY_COLORS = [
  "#F4F4F6", "#2B8CFF", "#E23BD6", "#FFD21F", "#FF6A3D", "#8FE03A", "#9B7BFF", "#FF5C8A", "#2FD4C0", "#FF8A1F",
  "#FF3B4A", "#00B8FF", "#16C47F", "#C9F23A", "#6B4BFF", "#FF9EC4", "#B5651D", "#FFE3A8", "#8A8F99", "#1E3A8A",
];

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
      texture: Math.random() < 0.45 ? "smooth" : pick(TEXTURES.slice(1)).id,
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
  // Ekler yalnızca Türkçede; öbür dillerde çeviri adı kendi cümlesine yerleştirir
  if (!isTurkish) return name;
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
  "#2B8CFF": tt("elektrik mavisi"),
  "#E23BD6": tt("fuşya"),
  "#FFD21F": tt("limon sarısı"),
  "#FF6A3D": "mercan",
  "#8FE03A": tt("fıstık yeşili"),
  "#9B7BFF": "lavanta",
  "#FF5C8A": "pembe",
  "#2FD4C0": "turkuaz",
  "#FF8A1F": "turuncu",
  "#FF3B4A": tt("kiraz kırmızısı"),
  "#00B8FF": tt("gök mavisi"),
  "#16C47F": tt("zümrüt yeşili"),
  "#C9F23A": tt("fosforlu yeşil"),
  "#6B4BFF": tt("çivit mavisi"),
  "#FF9EC4": tt("şeker pembesi"),
  "#B5651D": "karamel",
  "#FFE3A8": "krem",
  "#8A8F99": tt("gümüş grisi"),
  "#1E3A8A": "lacivert",
};
const SHAPE_WORDS: Record<ShapeId, string> = { sphere: tt("yuvarlak bir küre"), cloud: tt("kabarık bir bulut"), heart: tt("tombul bir kalp"), triangle: tt("yumuşak bir üçgen"), flower: tt("tırtıklı bir çiçek"), bean: tt("fasulye biçimli"), blob: tt("damla biçimli, tombul"), pumpkin: tt("dilimli bir balkabağı"), ghost: tt("etekleri dalgalı bir hayalet"), cube: tt("yumuşak köşeli şeker küp"), egg: tt("yumurta biçimli"), star: tt("tombul bir yıldız"), cat: tt("kedi kulaklı yuvarlak"), bear: tt("ayıcık kulaklı yuvarlak") };
const EYE_WORDS: Record<EyeStyle, string> = { pill: tt("iki siyah hap göz"), bead: tt("parlak boncuk gözler"), diamond: tt("elmas biçimli gözler"), sparkle: tt("iri, parıltılı gözler"), calm: tt("sakin, yarı kapalı gözler") };
const WEAR_WORDS: Partial<Record<GlassesId | HeadId | NeckId, string>> = {
  round: tt("yuvarlak tel gözlük"),
  bold: tt("kalın çerçeveli gözlük"),
  shades: tt("güneş gözlüğü"),
  monocle: "monokl",
  beret: tt("Fransız beresi"),
  bowler: tt("melon şapka"),
  headphones: tt("kulaklık"),
  antenna: "anten",
  bow: "fiyonk",
  bowtie: "papyon",
  cap: "kep",
  ears: tt("tavşan kulakları"),
  sprout: tt("başında filiz"),
  flower: tt("çiçek tokası"),
  star: tt("yıldız tokası"),
  stalks: tt("salyangoz gibi saplı gözler"),
  witch: tt("sivri cadı şapkası"),
  horns: tt("kırmızı şeytan boynuzları"),
  bat: tt("yarasa tokası"),
};

/** Sistem isteminde: "elektrik mavisi, peluş, kabarık bir bulut gövde, parlak boncuk gözler; üstünde siyah Fransız beresi" */
export function describeLook(raw: Look, color = useNook.getState().settings.faceColor) {
  const look = normalizeLook(raw);
  const tone = COLOR_NAMES[color.toUpperCase()] ?? "renkli";
  const wear = [look.glasses, look.head, look.neck].map((k) => WEAR_WORDS[k]).filter(Boolean);
  const tex = { smooth: "", plush: tt(", peluş"), matte: tt(", mat kil"), jelly: tt(", jöle gibi parlak"), metal: ", metalik", spots: ", benekli" }[look.texture];
  return tt("{0}{1}, {2} gövde, {3}{4}", tone, tex, SHAPE_WORDS[look.shape], EYE_WORDS[look.eyes], wear.length ? tt("; üstünde {0}", wear.join(", ")) : "");
}

// ------------------------------------------------------------------ vitrin (tanıtım)

/**
 * Tanıtımdaki Nook kalabalığı (Dots afişi gibi): arkada bir sıra, önde daha iri bir sıra; alttan
 * kesilerek iç içe dizilirler. x, y: gövde merkezinin sahnedeki yeri (px), size: gövde çapı.
 */
export const SHOWCASE: { name: string; color: string; look: Look; x: number; y: number; size: number; mood?: "happy" | "wink" | "love" }[] = [
  // arka sıra
  { name: tt("Pamuk"), color: "#F4F4F6", look: { ...DEFAULT_LOOK, shape: "cloud", texture: "plush" }, x: 64, y: 250, size: 100 },
  { name: tt("Mandalina"), color: "#FF6A3D", look: { ...DEFAULT_LOOK, shape: "blob", texture: "plush", head: "flower" }, x: 166, y: 218, size: 104, mood: "happy" },
  { name: tt("Lila"), color: "#9B7BFF", look: { ...DEFAULT_LOOK, shape: "blob", texture: "plush", head: "stalks" }, x: 272, y: 242, size: 92, mood: "happy" },
  { name: tt("Kaptan"), color: "#2FD4C0", look: { ...DEFAULT_LOOK, shape: "blob", texture: "plush", head: "cap" }, x: 374, y: 228, size: 98 },
  { name: tt("Pembiş"), color: "#FF5C8A", look: { ...DEFAULT_LOOK, shape: "bean", texture: "plush", head: "ears" }, x: 474, y: 234, size: 94 },
  { name: tt("Filiz"), color: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "sphere", texture: "plush", head: "sprout" }, x: 556, y: 270, size: 88 },
  // ön sıra
  { name: tt("Yıldız"), color: "#9B7BFF", look: { ...DEFAULT_LOOK, shape: "sphere", texture: "plush", head: "star" }, x: 44, y: 356, size: 112 },
  { name: tt("Bulut"), color: "#2B8CFF", look: { ...DEFAULT_LOOK, shape: "cloud", texture: "plush", head: "beret" }, x: 172, y: 362, size: 134 },
  { name: tt("Fıstık"), color: "#8FE03A", look: { ...DEFAULT_LOOK, shape: "sphere", texture: "plush", eyes: "bead", head: "stalks" }, x: 296, y: 370, size: 104 },
  { name: tt("Profesör"), color: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "triangle", texture: "plush", eyes: "calm", glasses: "round" }, x: 398, y: 362, size: 118 },
  { name: tt("Kalp"), color: "#E23BD6", look: { ...DEFAULT_LOOK, shape: "heart", texture: "plush", glasses: "shades" }, x: 496, y: 364, size: 112 },
  { name: tt("Kiraz"), color: "#FF3B4A", look: { ...DEFAULT_LOOK, shape: "sphere", texture: "plush" }, x: 572, y: 366, size: 100, mood: "wink" },
];

/** Cadılar Bayramı parçaları Görünüm'de yalnızca kendi bölümünde (hazır kostümlerde) görünür */
export const HALLOWEEN_PARTS = new Set<string>(["pumpkin", "ghost", "witch", "horns", "bat"]);

/** Cadılar Bayramı: Görünüm'de tek dokunuşla giyilen hazır Nook'lar */
export const HALLOWEEN: { name: string; color: string; look: Look }[] = [
  { name: tt("Bal Kabak"), color: "#FF8A1F", look: { ...DEFAULT_LOOK, shape: "pumpkin", eyes: "diamond" } },
  { name: tt("Hayalet"), color: "#F4F4F6", look: { ...DEFAULT_LOOK, shape: "ghost", eyes: "bead" } },
  { name: tt("Cadı"), color: "#8FE03A", look: { ...DEFAULT_LOOK, shape: "blob", texture: "plush", head: "witch" } },
  { name: tt("Şeytancık"), color: "#E23BD6", look: { ...DEFAULT_LOOK, shape: "sphere", eyes: "calm", head: "horns" } },
  { name: tt("Yarasa"), color: "#9B7BFF", look: { ...DEFAULT_LOOK, shape: "bean", texture: "plush", head: "bat" } },
  { name: tt("Kabak Cadı"), color: "#FF8A1F", look: { ...DEFAULT_LOOK, shape: "pumpkin", texture: "plush", head: "witch" } },
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
  calendar: { color: "#2B8CFF", look: { ...DEFAULT_LOOK, shape: "bean", eyes: "calm", glasses: "round" } },
  apps: { color: "#2B8CFF", look: { ...DEFAULT_LOOK, shape: "blob", texture: "plush", head: "cap" } },
  notify: { color: "#9B7BFF", look: { ...DEFAULT_LOOK, shape: "bean", texture: "plush", head: "ears" } },
  control: { color: "#8FE03A", look: { ...DEFAULT_LOOK, shape: "sphere", head: "bowler", neck: "bowtie" } },
  devices: { color: "#2B8CFF", look: { ...DEFAULT_LOOK, shape: "triangle", head: "headphones" } },
  stats: { color: "#FF5C8A", look: { ...DEFAULT_LOOK, shape: "blob", glasses: "shades" } },
  play: { color: "#E23BD6", look: { ...DEFAULT_LOOK, shape: "cloud", eyes: "sparkle", head: "star" } },
  report: { color: "#2FD4C0", look: { ...DEFAULT_LOOK, shape: "sphere", eyes: "calm", glasses: "monocle" } },
  notes: { color: "#FF8A1F", look: { ...DEFAULT_LOOK, shape: "pumpkin", head: "witch" } },
  look: { color: "#FF5C8A", look: { ...DEFAULT_LOOK, shape: "cloud", texture: "plush", head: "bow" } },
  year: { color: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "star", eyes: "sparkle", head: "bow" } },
  claude: { color: "#D97757", look: { ...DEFAULT_LOOK, shape: "cube", texture: "matte", eyes: "bead", head: "hardhat" } },
  hum: { color: "#9B7BFF", look: { ...DEFAULT_LOOK, shape: "blob", eyes: "calm", head: "headphones", glasses: "shades" } },
};

/** Tanıtımın ilk sayfasındaki çipler: her birinde başka bir Nook */
export const TOUR_CHIPS: { label: string; body: string; look: Look }[] = [
  { label: tt("Müzik"), body: "#FF5C8A", look: { ...DEFAULT_LOOK, shape: "heart", head: "headphones" } },
  { label: tt("Dosya rafı"), body: "#2FD4C0", look: { ...DEFAULT_LOOK, shape: "cloud", texture: "plush", eyes: "bead" } },
  { label: tt("Yapay zekâ"), body: "#9B7BFF", look: { ...DEFAULT_LOOK, shape: "triangle", glasses: "round" } },
  { label: tt("Alarm"), body: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "flower", eyes: "sparkle" } },
  { label: tt("Odak"), body: "#FF6A3D", look: { ...DEFAULT_LOOK, shape: "bean", head: "bowler" } },
];
