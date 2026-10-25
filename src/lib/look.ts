/**
 * Nook'un görünümü (ChatGPT Dots'tan ilhamla): her kullanıcı kendi Nook'unu isimlendirir; gövde
 * biçimini, dokusunu (vinil / peluş), rengini, gözlerini ve siyah parlak aksesuarlarını seçer.
 * Gövde ve aksesuarlar lib/nook3d'de 3B çizilir; gözler ifadeleriyle birlikte DOM'da kalır.
 */
import { useNook } from "../store/nook";
import { isTurkish } from "./i18n";
import { tt } from "./i18n";

export type ShapeId = "sphere" | "cloud" | "heart" | "triangle" | "flower" | "bean" | "blob" | "pumpkin" | "ghost" | "cube" | "egg" | "star" | "cat" | "bear" | "strawberry" | "flame" | "mushroom" | "drop"
  | "frog" | "panda" | "fox" | "penguin" | "owl" | "duck" | "bee" | "crab" | "dragon"
  | "watermelon" | "cupcake" | "icecream" | "candy" | "donut" | "marshmallow" | "pineapple" | "acorn" | "orange" | "cherry"
  | "raincloud" | "storm" | "crystal" | "leaf" | "cactus" | "rock" | "stump" | "sun" | "moon";
export type Texture = "smooth" | "plush" | "matte" | "jelly" | "metal" | "spots" | "galaxy" | "knit" | "lava" | "camo" | "marble" | "glass" | "glow" | "plaid" | "stripes" | "denim" | "pixel" | "fluffy" | "gold" | "chrome";
export type EyeStyle = "pill" | "bead" | "diamond" | "sparkle" | "calm" | "happy" | "squint" | "wink" | "led";
export type GlassesId = "none" | "round" | "bold" | "shades" | "monocle" | "eyepatch" | "goggles" | "hero" | "masquerade" | "neon" | "snorkel";
export type HeadId = "none" | "beret" | "headphones" | "bowler" | "antenna" | "bow" | "ears" | "cap" | "sprout" | "flower" | "star" | "stalks" | "witch" | "horns" | "bat" | "cowboy" | "pirate" | "straw" | "conductor" | "helmet" | "hardhat" | "crown" | "party" | "beanie" | "chef" | "santa" | "halo" | "toadstool" | "astronaut" | "elf" | "wizard"
  | "police" | "nurse" | "viking" | "knight" | "pilot" | "safari" | "detective" | "miner" | "nightcap" | "clownwig" | "bandana" | "earflap" | "earmuffs" | "robot";
export type NeckId = "none" | "bowtie" | "scarf";
export type FaceId = "none" | "mustache" | "beard" | "nose" | "note" | "sparkle" | "bubbles";

export interface Look {
  shape: ShapeId;
  texture: Texture;
  eyes: EyeStyle;
  glasses: GlassesId;
  head: HeadId;
  neck: NeckId;
  /** Yüz ve süs: bıyık, sakal, palyaço burnu; yanında nota, parıltı, baloncuk */
  face: FaceId;
}

export const DEFAULT_LOOK: Look = { shape: "sphere", texture: "smooth", eyes: "pill", glasses: "none", head: "none", neck: "none", face: "none" };

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
  { id: "strawberry", label: tt("Çilek") },
  { id: "mushroom", label: tt("Mantar") },
  { id: "flame", label: tt("Alev") },
  { id: "drop", label: tt("Damlacık") },
  { id: "frog", label: tt("Kurbağa") },
  { id: "panda", label: tt("Panda") },
  { id: "fox", label: tt("Tilki") },
  { id: "penguin", label: tt("Penguen") },
  { id: "owl", label: tt("Baykuş") },
  { id: "duck", label: tt("Ördek") },
  { id: "bee", label: tt("Arı") },
  { id: "crab", label: tt("Yengeç") },
  { id: "dragon", label: tt("Ejderha") },
  { id: "watermelon", label: tt("Karpuz") },
  { id: "cupcake", label: tt("Cupcake") },
  { id: "icecream", label: tt("Dondurma") },
  { id: "candy", label: tt("Şeker") },
  { id: "donut", label: tt("Donut") },
  { id: "marshmallow", label: tt("Marşmelov") },
  { id: "pineapple", label: tt("Ananas") },
  { id: "acorn", label: tt("Palamut") },
  { id: "orange", label: tt("Portakal") },
  { id: "cherry", label: tt("Kiraz") },
  { id: "raincloud", label: tt("Yağmur") },
  { id: "storm", label: tt("Fırtına") },
  { id: "crystal", label: tt("Kristal") },
  { id: "leaf", label: tt("Yaprak") },
  { id: "cactus", label: tt("Kaktüs") },
  { id: "rock", label: tt("Kaya") },
  { id: "stump", label: tt("Kütük") },
  { id: "sun", label: tt("Güneş") },
  { id: "moon", label: tt("Ay") },
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
  { id: "galaxy", label: tt("Galaksi") },
  { id: "knit", label: tt("Örgü") },
  { id: "lava", label: tt("Lav") },
  { id: "camo", label: tt("Kamuflaj") },
  { id: "marble", label: tt("Mermer") },
  { id: "glass", label: tt("Cam") },
  { id: "glow", label: tt("Işıltı") },
  { id: "plaid", label: tt("Ekose") },
  { id: "stripes", label: tt("Çizgili") },
  { id: "denim", label: tt("Kot") },
  { id: "pixel", label: tt("Piksel") },
  { id: "fluffy", label: tt("Kabarık") },
  { id: "gold", label: tt("Altın") },
  { id: "chrome", label: tt("Krom") },
];

export const EYE_STYLES: { id: EyeStyle; label: string }[] = [
  { id: "pill", label: tt("Hap") },
  { id: "bead", label: tt("Boncuk") },
  { id: "diamond", label: tt("Elmas") },
  { id: "sparkle", label: tt("Parlak") },
  { id: "calm", label: tt("Sakin") },
  { id: "happy", label: tt("Mutlu") },
  { id: "squint", label: tt("Sıkı") },
  { id: "wink", label: tt("Göz kırp") },
  { id: "led", label: tt("Robot") },
];

export const GLASSES: { id: GlassesId; label: string }[] = [
  { id: "none", label: tt("Yok") },
  { id: "round", label: tt("Yuvarlak") },
  { id: "bold", label: tt("Kalın") },
  { id: "shades", label: tt("Güneş") },
  { id: "monocle", label: tt("Monokl") },
  { id: "goggles", label: tt("Koruyucu") },
  { id: "eyepatch", label: tt("Göz bandı") },
  { id: "hero", label: tt("Kahraman") },
  { id: "masquerade", label: tt("Balo") },
  { id: "neon", label: tt("Neon") },
  { id: "snorkel", label: tt("Şnorkel") },
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
  { id: "crown", label: tt("Taç") },
  { id: "halo", label: tt("Hale") },
  { id: "party", label: tt("Parti") },
  { id: "beanie", label: tt("Ponponlu") },
  { id: "chef", label: tt("Aşçı") },
  { id: "toadstool", label: tt("Mantar") },
  { id: "astronaut", label: tt("Astronot") },
  { id: "wizard", label: tt("Büyücü") },
  { id: "santa", label: tt("Noel") },
  { id: "elf", label: tt("Elf şapkası") },
  { id: "police", label: tt("Polis") },
  { id: "nurse", label: tt("Hemşire") },
  { id: "viking", label: tt("Viking") },
  { id: "knight", label: tt("Şövalye") },
  { id: "pilot", label: tt("Pilot") },
  { id: "safari", label: tt("Kaşif") },
  { id: "detective", label: tt("Dedektif") },
  { id: "miner", label: tt("Madenci") },
  { id: "nightcap", label: tt("Uyku") },
  { id: "clownwig", label: tt("Palyaço") },
  { id: "bandana", label: tt("Bandana") },
  { id: "earflap", label: tt("Kulaklı bere") },
  { id: "earmuffs", label: tt("Kar kulaklığı") },
  { id: "robot", label: tt("Robot") },
];

/** Kepin rengi: gövdeyle karışmasın diye mavi gövdede mercan, öbürlerinde koyu mavi (Dots'taki gibi) */
export const capColor = (body: string) => (["#2B8CFF", "#9B7BFF", "#E23BD6"].includes(body.toUpperCase()) ? "#FF6A3D" : "#2F5BFF");

export const NECKS: { id: NeckId; label: string }[] = [
  { id: "none", label: tt("Yok") },
  { id: "bowtie", label: tt("Papyon") },
  { id: "scarf", label: tt("Atkı") },
];

export const FACES: { id: FaceId; label: string }[] = [
  { id: "none", label: tt("Yok") },
  { id: "mustache", label: tt("Bıyık") },
  { id: "beard", label: tt("Sakal") },
  { id: "nose", label: tt("Palyaço") },
  { id: "note", label: tt("Nota") },
  { id: "sparkle", label: tt("Parıltı") },
  { id: "bubbles", label: tt("Baloncuk") },
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
    face: ok(raw?.face, FACES, DEFAULT_LOOK.face),
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
      face: Math.random() < 0.2 ? pick(FACES.slice(1)).id : "none",
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
const SHAPE_WORDS: Record<ShapeId, string> = { sphere: tt("yuvarlak bir küre"), cloud: tt("kabarık bir bulut"), heart: tt("tombul bir kalp"), triangle: tt("yumuşak bir üçgen"), flower: tt("tırtıklı bir çiçek"), bean: tt("fasulye biçimli"), blob: tt("damla biçimli, tombul"), pumpkin: tt("dilimli bir balkabağı"), ghost: tt("etekleri dalgalı bir hayalet"), cube: tt("yumuşak köşeli şeker küp"), egg: tt("yumurta biçimli"), star: tt("tombul bir yıldız"), cat: tt("kedi kulaklı yuvarlak"), bear: tt("ayıcık kulaklı yuvarlak"), strawberry: tt("yapraklı bir çilek"), flame: tt("tombul bir alev"), mushroom: tt("benekli bir mantar"), drop: tt("bir su damlası"),
  frog: tt("göz tümsekli bir kurbağa"), panda: tt("siyah kulaklı bir panda"), fox: tt("sivri kulaklı bir tilki"), penguin: tt("beyaz göbekli bir penguen"),
  owl: tt("kulak tüylü bir baykuş"), duck: tt("gagalı bir ördek"), bee: tt("çizgili bir arı"), crab: tt("kıskaçlı bir yengeç"), dragon: tt("boynuzlu bir ejderha"),
  watermelon: tt("bir karpuz dilimi"), cupcake: tt("kremalı bir cupcake"), icecream: tt("külahta dondurma"), candy: tt("ambalajlı bir şeker"), donut: tt("serpmeli bir donut"),
  marshmallow: tt("yumuşak bir marşmelov"), pineapple: tt("yapraklı bir ananas"), acorn: tt("şapkalı bir palamut"), orange: tt("yapraklı bir portakal"), cherry: tt("saplı bir kiraz"),
  raincloud: tt("yağmurlu bir bulut"), storm: tt("şimşekli bir bulut"), crystal: tt("parlak bir kristal"), leaf: tt("damarlı bir yaprak"), cactus: tt("kollu bir kaktüs"),
  rock: tt("yamru yumru bir kaya"), stump: tt("dallı bir kütük"), sun: tt("ışınlı bir güneş"), moon: tt("kraterli bir ay") };
const EYE_WORDS: Record<EyeStyle, string> = { pill: tt("iki siyah hap göz"), bead: tt("parlak boncuk gözler"), diamond: tt("elmas biçimli gözler"), sparkle: tt("iri, parıltılı gözler"), calm: tt("sakin, yarı kapalı gözler"), happy: tt("mutlulukla kapanmış gözler"), squint: tt("sımsıkı kapalı gözler"), wink: tt("göz kırpan gözler"), led: tt("ekran gibi robot gözler") };
const WEAR_WORDS: Partial<Record<GlassesId | HeadId | NeckId | FaceId, string>> = {
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
  crown: tt("altın taç"),
  halo: tt("başının üstünde hale"),
  party: tt("parti şapkası"),
  beanie: tt("ponponlu örgü bere"),
  chef: tt("aşçı şapkası"),
  toadstool: tt("benekli mantar şapka"),
  astronaut: tt("astronot kaskı"),
  wizard: tt("yıldızlı büyücü şapkası"),
  santa: tt("Noel Baba şapkası"),
  elf: tt("cin şapkası"),
  police: tt("polis şapkası"),
  nurse: tt("hemşire başlığı"),
  viking: tt("boynuzlu viking miğferi"),
  knight: tt("şövalye miğferi"),
  pilot: tt("pilot başlığı ve gözlüğü"),
  safari: tt("kaşif şapkası"),
  detective: tt("dedektif şapkası"),
  miner: tt("lambalı madenci kaskı"),
  nightcap: tt("yıldızlı uyku başlığı"),
  clownwig: tt("palyaço peruğu"),
  bandana: tt("korsan bandanası"),
  earflap: tt("kulaklı örgü bere"),
  earmuffs: tt("kar kulaklığı"),
  robot: tt("robot anteni"),
  hero: tt("kahraman maskesi"),
  masquerade: tt("balo maskesi"),
  neon: tt("neon gözlük"),
  snorkel: tt("şnorkel"),
  mustache: tt("kıvrık bıyık"),
  beard: tt("gür sakal"),
  nose: tt("palyaço burnu"),
  note: tt("yanında nota"),
  sparkle: tt("yanında parıltı"),
  bubbles: tt("yanında baloncuklar"),
};

/** Sistem isteminde: "elektrik mavisi, peluş, kabarık bir bulut gövde, parlak boncuk gözler; üstünde siyah Fransız beresi" */
export function describeLook(raw: Look, color = useNook.getState().settings.faceColor) {
  const look = normalizeLook(raw);
  const tone = COLOR_NAMES[color.toUpperCase()] ?? "renkli";
  const wear = [look.glasses, look.head, look.neck, look.face].map((k) => WEAR_WORDS[k]).filter(Boolean);
  const tex = { smooth: "", plush: tt(", peluş"), matte: tt(", mat kil"), jelly: tt(", jöle gibi parlak"), metal: ", metalik", spots: ", benekli", galaxy: tt(", galaksi desenli"), knit: tt(", örgü"), lava: tt(", lav çatlaklı"), camo: tt(", kamuflaj desenli"), marble: tt(", mermer"), glass: tt(", cam gibi saydam"), glow: tt(", ışıl ışıl parlayan"), plaid: tt(", ekose"), stripes: tt(", çizgili"), denim: tt(", kot kumaş"), pixel: tt(", pikselli"), fluffy: tt(", kabarık tüylü"), gold: tt(", altın"), chrome: tt(", krom") }[look.texture];
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

/**
 * Koleksiyon: Görünüm'de tek dokunuşla giyilen hazır Nook'lar (Gemini'yle çizilmiş Nook
 * sayfalarından uyarlandı: astronot, kral, melek, kardan adam, mantar, alev, galaksi…).
 */
export const COLLECTION: { name: string; color: string; look: Look; cat: string }[] = [
  { cat: tt("Öne çıkanlar"), name: tt("Astronot"), color: "#F4F4F6", look: { ...DEFAULT_LOOK, head: "astronaut" } },
  { cat: tt("Öne çıkanlar"), name: tt("Kral"), color: "#F4F4F6", look: { ...DEFAULT_LOOK, eyes: "bead", head: "crown" } },
  { cat: tt("Öne çıkanlar"), name: tt("Melek"), color: "#F4F4F6", look: { ...DEFAULT_LOOK, shape: "cloud", texture: "plush", eyes: "calm", head: "halo" } },
  { cat: tt("Öne çıkanlar"), name: tt("Kardan adam"), color: "#F4F4F6", look: { ...DEFAULT_LOOK, texture: "matte", head: "beanie", neck: "scarf" } },
  { cat: tt("Öne çıkanlar"), name: tt("Noel Baba"), color: "#F4F4F6", look: { ...DEFAULT_LOOK, eyes: "bead", head: "santa" } },
  { cat: tt("Karakterler"), name: tt("Elf"), color: "#FFE3A8", look: { ...DEFAULT_LOOK, shape: "egg", head: "elf" } },
  { cat: tt("Meslekler"), name: tt("Aşçı"), color: "#FFE3A8", look: { ...DEFAULT_LOOK, head: "chef", neck: "bowtie" } },
  { cat: tt("Karakterler"), name: tt("Büyücü"), color: "#9B7BFF", look: { ...DEFAULT_LOOK, shape: "blob", texture: "plush", head: "wizard" } },
  { cat: tt("Tarzlar"), name: tt("Parti"), color: "#FF5C8A", look: { ...DEFAULT_LOOK, shape: "triangle", eyes: "sparkle", head: "party" } },
  { cat: tt("Öne çıkanlar"), name: tt("Mantar"), color: "#FF3B4A", look: { ...DEFAULT_LOOK, shape: "mushroom", eyes: "bead" } },
  { cat: tt("Öne çıkanlar"), name: tt("Mantarcık"), color: "#F4F4F6", look: { ...DEFAULT_LOOK, head: "toadstool" } },
  { cat: tt("Öne çıkanlar"), name: tt("Çilek"), color: "#FF3B4A", look: { ...DEFAULT_LOOK, shape: "strawberry" } },
  { cat: tt("Öne çıkanlar"), name: tt("Alev"), color: "#FF6A3D", look: { ...DEFAULT_LOOK, shape: "flame", eyes: "bead" } },
  { cat: tt("Öne çıkanlar"), name: tt("Damlacık"), color: "#00B8FF", look: { ...DEFAULT_LOOK, shape: "drop", texture: "jelly" } },
  { cat: tt("Öne çıkanlar"), name: tt("Galaksi"), color: "#6B4BFF", look: { ...DEFAULT_LOOK, texture: "galaxy", head: "halo" } },
  { cat: tt("Öne çıkanlar"), name: tt("Lav"), color: "#FF6A3D", look: { ...DEFAULT_LOOK, shape: "blob", texture: "lava", eyes: "diamond" } },
  { cat: tt("Öne çıkanlar"), name: tt("Kazak"), color: "#2B8CFF", look: { ...DEFAULT_LOOK, shape: "bear", texture: "knit" } },
  { cat: tt("Meslekler"), name: tt("Asker"), color: "#16C47F", look: { ...DEFAULT_LOOK, shape: "blob", texture: "camo", head: "helmet" } },
  { cat: tt("Öne çıkanlar"), name: tt("Altın ayı"), color: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "bear", texture: "metal" } },
  { cat: tt("Öne çıkanlar"), name: tt("Uzaylı"), color: "#8FE03A", look: { ...DEFAULT_LOOK, shape: "egg", eyes: "diamond", head: "antenna" } },
  { cat: tt("Meslekler"), name: tt("Polis"), color: "#FFE3A8", look: { ...DEFAULT_LOOK, head: "police" } },
  { cat: tt("Meslekler"), name: tt("Hemşire"), color: "#F4F4F6", look: { ...DEFAULT_LOOK, eyes: "happy", head: "nurse" } },
  { cat: tt("Karakterler"), name: tt("Viking"), color: "#FFE3A8", look: { ...DEFAULT_LOOK, head: "viking", face: "beard" } },
  { cat: tt("Karakterler"), name: tt("Şövalye"), color: "#8A8F99", look: { ...DEFAULT_LOOK, head: "knight" } },
  { cat: tt("Meslekler"), name: tt("Pilot"), color: "#FFE3A8", look: { ...DEFAULT_LOOK, head: "pilot", neck: "scarf" } },
  { cat: tt("Meslekler"), name: tt("Kaşif"), color: "#B5651D", look: { ...DEFAULT_LOOK, head: "safari" } },
  { cat: tt("Meslekler"), name: tt("Dedektif"), color: "#FFE3A8", look: { ...DEFAULT_LOOK, head: "detective", face: "mustache" } },
  { cat: tt("Meslekler"), name: tt("Madenci"), color: "#B5651D", look: { ...DEFAULT_LOOK, head: "miner" } },
  { cat: tt("Karakterler"), name: tt("Korsan"), color: "#FFE3A8", look: { ...DEFAULT_LOOK, head: "bandana", glasses: "eyepatch" } },
  { cat: tt("Meslekler"), name: tt("Palyaço"), color: "#F4F4F6", look: { ...DEFAULT_LOOK, head: "clownwig", face: "nose" } },
  { cat: tt("Karakterler"), name: tt("Kahraman"), color: "#2B8CFF", look: { ...DEFAULT_LOOK, glasses: "hero" } },
  { cat: tt("Tarzlar"), name: tt("Balo"), color: "#F4F4F6", look: { ...DEFAULT_LOOK, glasses: "masquerade", neck: "bowtie" } },
  { cat: tt("Meslekler"), name: tt("Dalgıç"), color: "#2FD4C0", look: { ...DEFAULT_LOOK, glasses: "snorkel" } },
  { cat: tt("Tarzlar"), name: tt("Neon gece"), color: "#1E3A8A", look: { ...DEFAULT_LOOK, texture: "galaxy", glasses: "neon" } },
  { cat: tt("Karakterler"), name: tt("Robot"), color: "#8A8F99", look: { ...DEFAULT_LOOK, shape: "cube", texture: "chrome", eyes: "led", head: "robot" } },
  { cat: tt("Tarzlar"), name: tt("Uykucu"), color: "#9B7BFF", look: { ...DEFAULT_LOOK, eyes: "happy", head: "nightcap" } },
  { cat: tt("Tarzlar"), name: tt("Kayakçı"), color: "#F4F4F6", look: { ...DEFAULT_LOOK, texture: "knit", head: "earflap" } },
  { cat: tt("Tarzlar"), name: tt("Kışlık"), color: "#9B7BFF", look: { ...DEFAULT_LOOK, texture: "fluffy", head: "earmuffs" } },
  { cat: tt("Tarzlar"), name: tt("Şarkıcı"), color: "#FF5C8A", look: { ...DEFAULT_LOOK, eyes: "wink", face: "note" } },
  { cat: tt("Tarzlar"), name: tt("Yıldız"), color: "#FFD21F", look: { ...DEFAULT_LOOK, eyes: "sparkle", face: "sparkle" } },
  { cat: tt("Tarzlar"), name: tt("Köpük"), color: "#00B8FF", look: { ...DEFAULT_LOOK, texture: "jelly", eyes: "happy", face: "bubbles" } },
  { cat: tt("Hayvanlar"), name: tt("Kurbağa"), color: "#8FE03A", look: { ...DEFAULT_LOOK, shape: "frog" } },
  { cat: tt("Hayvanlar"), name: tt("Panda"), color: "#F4F4F6", look: { ...DEFAULT_LOOK, shape: "panda", eyes: "bead" } },
  { cat: tt("Hayvanlar"), name: tt("Tilki"), color: "#FF8A1F", look: { ...DEFAULT_LOOK, shape: "fox", texture: "plush" } },
  { cat: tt("Hayvanlar"), name: tt("Penguen"), color: "#1E3A8A", look: { ...DEFAULT_LOOK, shape: "penguin", eyes: "bead" } },
  { cat: tt("Hayvanlar"), name: tt("Baykuş"), color: "#B5651D", look: { ...DEFAULT_LOOK, shape: "owl", eyes: "bead" } },
  { cat: tt("Hayvanlar"), name: tt("Ördek"), color: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "duck" } },
  { cat: tt("Hayvanlar"), name: tt("Arı"), color: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "bee" } },
  { cat: tt("Hayvanlar"), name: tt("Yengeç"), color: "#FF3B4A", look: { ...DEFAULT_LOOK, shape: "crab" } },
  { cat: tt("Hayvanlar"), name: tt("Ejderha"), color: "#16C47F", look: { ...DEFAULT_LOOK, shape: "dragon" } },
  { cat: tt("Yiyecekler"), name: tt("Karpuz"), color: "#FF3B4A", look: { ...DEFAULT_LOOK, shape: "watermelon" } },
  { cat: tt("Yiyecekler"), name: tt("Cupcake"), color: "#FF9EC4", look: { ...DEFAULT_LOOK, shape: "cupcake", eyes: "happy" } },
  { cat: tt("Yiyecekler"), name: tt("Dondurma"), color: "#FF9EC4", look: { ...DEFAULT_LOOK, shape: "icecream" } },
  { cat: tt("Yiyecekler"), name: tt("Şeker"), color: "#FF5C8A", look: { ...DEFAULT_LOOK, shape: "candy" } },
  { cat: tt("Yiyecekler"), name: tt("Donut"), color: "#FF9EC4", look: { ...DEFAULT_LOOK, shape: "donut" } },
  { cat: tt("Yiyecekler"), name: tt("Marşmelov"), color: "#FFE3A8", look: { ...DEFAULT_LOOK, shape: "marshmallow", eyes: "calm" } },
  { cat: tt("Yiyecekler"), name: tt("Ananas"), color: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "pineapple" } },
  { cat: tt("Yiyecekler"), name: tt("Palamut"), color: "#B5651D", look: { ...DEFAULT_LOOK, shape: "acorn" } },
  { cat: tt("Yiyecekler"), name: tt("Portakal"), color: "#FF8A1F", look: { ...DEFAULT_LOOK, shape: "orange" } },
  { cat: tt("Yiyecekler"), name: tt("Kiraz"), color: "#FF3B4A", look: { ...DEFAULT_LOOK, shape: "cherry" } },
  { cat: tt("Doğa"), name: tt("Yağmur"), color: "#F4F4F6", look: { ...DEFAULT_LOOK, shape: "raincloud", eyes: "calm" } },
  { cat: tt("Doğa"), name: tt("Fırtına"), color: "#8A8F99", look: { ...DEFAULT_LOOK, shape: "storm", eyes: "squint" } },
  { cat: tt("Doğa"), name: tt("Kristal"), color: "#00B8FF", look: { ...DEFAULT_LOOK, shape: "crystal" } },
  { cat: tt("Doğa"), name: tt("Yaprak"), color: "#16C47F", look: { ...DEFAULT_LOOK, shape: "leaf" } },
  { cat: tt("Doğa"), name: tt("Kaktüs"), color: "#16C47F", look: { ...DEFAULT_LOOK, shape: "cactus" } },
  { cat: tt("Doğa"), name: tt("Kaya"), color: "#8A8F99", look: { ...DEFAULT_LOOK, shape: "rock" } },
  { cat: tt("Doğa"), name: tt("Kütük"), color: "#B5651D", look: { ...DEFAULT_LOOK, shape: "stump" } },
  { cat: tt("Doğa"), name: tt("Güneş"), color: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "sun", eyes: "happy" } },
  { cat: tt("Doğa"), name: tt("Ay"), color: "#FFE3A8", look: { ...DEFAULT_LOOK, shape: "moon", eyes: "calm", head: "nightcap" } },
  { cat: tt("Malzemeler"), name: tt("Mermer"), color: "#F4F4F6", look: { ...DEFAULT_LOOK, shape: "bear", texture: "marble" } },
  { cat: tt("Malzemeler"), name: tt("Cam"), color: "#00B8FF", look: { ...DEFAULT_LOOK, shape: "bear", texture: "glass" } },
  { cat: tt("Malzemeler"), name: tt("Işıltı"), color: "#8FE03A", look: { ...DEFAULT_LOOK, shape: "bear", texture: "glow" } },
  { cat: tt("Malzemeler"), name: tt("Ekose"), color: "#FF3B4A", look: { ...DEFAULT_LOOK, shape: "bear", texture: "plaid" } },
  { cat: tt("Malzemeler"), name: tt("Çizgili"), color: "#2B8CFF", look: { ...DEFAULT_LOOK, shape: "bear", texture: "stripes" } },
  { cat: tt("Malzemeler"), name: tt("Kot"), color: "#1E3A8A", look: { ...DEFAULT_LOOK, shape: "bear", texture: "denim" } },
  { cat: tt("Malzemeler"), name: tt("Piksel"), color: "#2FD4C0", look: { ...DEFAULT_LOOK, shape: "cube", texture: "pixel" } },
  { cat: tt("Malzemeler"), name: tt("Pamuk"), color: "#FF9EC4", look: { ...DEFAULT_LOOK, shape: "bear", texture: "fluffy" } },
  { cat: tt("Malzemeler"), name: tt("Krom"), color: "#8A8F99", look: { ...DEFAULT_LOOK, shape: "bear", texture: "chrome" } },
];

/** Koleksiyon, kategorilerine göre (Görünüm'de ayrı başlıklar) */
export const COLLECTION_GROUPS = COLLECTION.reduce<{ title: string; items: typeof COLLECTION }[]>((gs, o) => {
  const g = gs.find((x) => x.title === o.cat);
  if (g) g.items.push(o);
  else gs.push({ title: o.cat, items: [o] });
  return gs;
}, []);

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
  whatsapp: { color: "#25D366", look: { ...DEFAULT_LOOK, shape: "bean", texture: "plush", eyes: "sparkle", head: "antenna" } },
  argus: { color: "#2B8CFF", look: { ...DEFAULT_LOOK, shape: "sphere", eyes: "bead", glasses: "round" } },
  focus: { color: "#FF3B4A", look: { ...DEFAULT_LOOK, shape: "sphere", texture: "smooth", eyes: "calm", head: "sprout" } },
  shelf: { color: "#2FD4C0", look: { ...DEFAULT_LOOK, shape: "cloud", texture: "plush" } },
  clip: { color: "#9B7BFF", look: { ...DEFAULT_LOOK, shape: "bean", glasses: "bold" } },
  note: { color: "#FF6A3D", look: { ...DEFAULT_LOOK, shape: "triangle", head: "beret" } },
  alarm: { color: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "sphere", eyes: "diamond", head: "antenna" } },
  calendar: { color: "#2B8CFF", look: { ...DEFAULT_LOOK, shape: "bean", eyes: "calm", glasses: "round" } },
  remind: { color: "#FF8A1F", look: { ...DEFAULT_LOOK, shape: "egg", eyes: "sparkle", head: "party" } },
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
