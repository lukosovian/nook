/**
 * Nook'un görünümü: her kullanıcı kendi Nook'unu isimlendirir, gövdesini, gözlerini,
 * gözlüğünü ve aksesuarlarını seçer. Çizimler mascot/Wear.tsx'te; ölçüler küre çapı 24'e göre.
 */
import { useNook } from "../store/nook";

export type ShapeId = "sphere" | "pillow" | "capsule" | "egg" | "pebble" | "drop";
export type EyeStyle = "pill" | "bead" | "diamond" | "sparkle" | "calm";
export type GlassesId = "none" | "round" | "bold" | "shades" | "monocle";
export type HeadId = "none" | "beanie" | "beret" | "headphones" | "sprout" | "crown" | "antenna" | "bow";
export type NeckId = "none" | "bowtie" | "scarf" | "pendant";

export interface Look {
  shape: ShapeId;
  eyes: EyeStyle;
  glasses: GlassesId;
  head: HeadId;
  neck: NeckId;
  /** Şapka, atkı, papyon ve kalın çerçevenin rengi */
  accent: string;
}

/** Gövde: boyut + köşe yarıçapları [sol üst, sağ üst, sağ alt, sol alt], yatay ve dikey ayrı (yumurta, çakıl için). */
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

export const SHAPES: Record<ShapeId, { label: string; body: BodyShape }> = {
  sphere: { label: "Küre", body: roundBody(24) },
  pillow: { label: "Yastık", body: { width: 24, height: 23, borderRadius: radii([8.5, 8.5, 8.5, 8.5]) } },
  capsule: { label: "Kapsül", body: roundBody(28, 21) },
  egg: { label: "Yumurta", body: { width: 22, height: 25, borderRadius: radii([11, 11, 11, 11], [14.5, 14.5, 10.5, 10.5]) } },
  pebble: { label: "Çakıl", body: { width: 26, height: 22, borderRadius: radii([14, 12, 13, 12], [12, 10, 11, 11]) } },
  drop: { label: "Damla", body: { width: 24, height: 24, borderRadius: radii([12, 3, 12, 12]) } },
};

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
  { id: "beanie", label: "Bere" },
  { id: "beret", label: "Fransız" },
  { id: "headphones", label: "Kulaklık" },
  { id: "sprout", label: "Filiz" },
  { id: "crown", label: "Taç" },
  { id: "antenna", label: "Anten" },
  { id: "bow", label: "Fiyonk" },
];

export const NECKS: { id: NeckId; label: string }[] = [
  { id: "none", label: "Yok" },
  { id: "bowtie", label: "Papyon" },
  { id: "scarf", label: "Atkı" },
  { id: "pendant", label: "Kolye" },
];

/** Gövde renkleri: yumuşak, açık tonlar (siyah gözler her birinde okunur) */
export const BODY_COLORS = ["#FFFFFF", "#BFF5DC", "#BDE3FF", "#D9CCFF", "#FFC9D9", "#FFD6BA", "#FFF1A8", "#CFE8A9", "#A9E5E0", "#E4E1DA"];

/** Aksesuar renkleri: koyu, doymuş — açık gövdenin üstünde öne çıksın */
export const ACCENT_COLORS = ["#1f1f25", "#26355e", "#7d1f35", "#3e5b3a", "#b5532f", "#c99a2e", "#5b3f8c", "#efe6d6"];

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

/** "Şaşırt beni": uyumlu rastgele bir görünüm (çok kalabalık olmasın diye bazı yuvalar boş kalır) */
export function randomLook(): { look: Look; color: string } {
  const head = Math.random() < 0.75 ? pick(HEADS.slice(1)).id : "none";
  const glasses = Math.random() < 0.45 ? pick(GLASSES.slice(1)).id : "none";
  // Kulaklık ve atkı ya da başlık + gözlük + kolye üst üste fazla kalabalık
  const neck = Math.random() < (head === "none" || glasses === "none" ? 0.5 : 0.2) ? pick(NECKS.slice(1)).id : "none";
  return {
    look: {
      shape: pick(Object.keys(SHAPES) as ShapeId[]),
      eyes: glasses === "shades" ? "pill" : pick(EYE_STYLES).id,
      glasses,
      head,
      neck,
      accent: pick(ACCENT_COLORS),
    },
    color: pick(BODY_COLORS),
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
  "#FFFFFF": "beyaz",
  "#BFF5DC": "nane yeşili",
  "#BDE3FF": "açık mavi",
  "#D9CCFF": "lila",
  "#FFC9D9": "pembe",
  "#FFD6BA": "şeftali",
  "#FFF1A8": "açık sarı",
  "#CFE8A9": "fıstık yeşili",
  "#A9E5E0": "turkuaz",
  "#E4E1DA": "kum rengi",
};
const SHAPE_WORDS: Record<ShapeId, string> = { sphere: "yuvarlak bir küre", pillow: "yastık gibi yumuşak köşeli", capsule: "kapsül gibi yayvan", egg: "yumurta biçimli", pebble: "çakıl taşı gibi", drop: "damla biçimli" };
const EYE_WORDS: Record<EyeStyle, string> = { pill: "iki siyah hap göz", bead: "parlak boncuk gözler", diamond: "elmas biçimli gözler", sparkle: "iri, parıltılı gözler", calm: "sakin, yarı kapalı gözler" };
const WEAR_WORDS: Partial<Record<GlassesId | HeadId | NeckId, string>> = {
  round: "yuvarlak gözlük",
  bold: "kalın çerçeveli gözlük",
  shades: "güneş gözlüğü",
  monocle: "monokl",
  beanie: "ponponlu bere",
  beret: "Fransız beresi",
  headphones: "kulaklık",
  sprout: "başında küçük bir filiz",
  crown: "minik bir taç",
  antenna: "anten",
  bow: "fiyonk",
  bowtie: "papyon",
  scarf: "atkı",
  pendant: "kolye",
};

/** Sistem isteminde: "açık mavi, yumurta biçimli; iri, parıltılı gözler; Fransız beresi ve atkı" */
export function describeLook(look: Look, color = useNook.getState().settings.faceColor) {
  const tone = COLOR_NAMES[color.toUpperCase()] ?? "renkli";
  const wear = [look.glasses, look.head, look.neck].map((k) => WEAR_WORDS[k]).filter(Boolean);
  return `${tone}, ${SHAPE_WORDS[look.shape]} bir gövde, ${EYE_WORDS[look.eyes]}${wear.length ? `; üstünde ${wear.join(", ")}` : ""}`;
}
