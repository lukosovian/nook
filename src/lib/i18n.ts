/**
 * Çok dil desteği. Kaynak dil Türkçe: arayüzdeki her metin `tt("Türkçe metin")` ile yazılır, anahtar
 * da metnin kendisidir. Diğer dillerin karşılıkları src/locales/<dil>.json'da; bulunamayan metin
 * Türkçe kalır.
 *
 *   tt("{0} öğe", n)             → "3 öğe" / "3 items"  (çoğul: "{0} item|{0} items")
 *   tt("{0}'la sohbet", ek(...)) → yer tutucular {0}, {1}…
 *
 * Dil, sayfa yüklenirken bir kez belirlenir (modüllerin sabit listeleri de doğru dilde kurulsun diye);
 * dil değişince bütün Nook pencereleri yeniden yüklenir.
 */
import en from "../locales/en.json";
import es from "../locales/es.json";
import pt from "../locales/pt.json";
import de from "../locales/de.json";
import fr from "../locales/fr.json";
import ru from "../locales/ru.json";
import zh from "../locales/zh.json";
import ja from "../locales/ja.json";

export type Lang = "tr" | "en" | "es" | "pt" | "de" | "fr" | "ru" | "zh" | "ja";

export const LANGS: { id: Lang; label: string; locale: string }[] = [
  { id: "tr", label: "Türkçe", locale: "tr-TR" },
  { id: "en", label: "English", locale: "en-US" },
  { id: "es", label: "Español", locale: "es-ES" },
  { id: "pt", label: "Português", locale: "pt-BR" },
  { id: "de", label: "Deutsch", locale: "de-DE" },
  { id: "fr", label: "Français", locale: "fr-FR" },
  { id: "ru", label: "Русский", locale: "ru-RU" },
  { id: "zh", label: "简体中文", locale: "zh-CN" },
  { id: "ja", label: "日本語", locale: "ja-JP" },
];

/** Dil adları Türkçe (yapay zekâya "… dilinde konuş" derken) */
export const LANG_NAME_TR: Record<Lang, string> = {
  tr: "Türkçe",
  en: "İngilizce",
  es: "İspanyolca",
  pt: "Portekizce (Brezilya)",
  de: "Almanca",
  fr: "Fransızca",
  ru: "Rusça",
  zh: "Basitleştirilmiş Çince",
  ja: "Japonca",
};

const DICTS: Partial<Record<Lang, Record<string, string>>> = { en, es, pt, de, fr, ru, zh, ja };

/** Sistem dilinden en yakın desteklenen dil (ilk kurulumda) */
export function detectLang(): Lang {
  for (const l of navigator.languages ?? [navigator.language]) {
    const code = l.toLowerCase().split("-")[0];
    const hit = LANGS.find((x) => x.id === code);
    if (hit) return hit.id;
  }
  return "en";
}

/**
 * Kayıtlı ayarlardan dil. Eski kurulumlarda (dil seçilmemiş ama ayarlar var) Türkçe kalır;
 * hiç kaydı olmayan yeni kurulumda sistemin dili.
 */
function initialLang(): Lang {
  // Yalnızca geliştirme önizlemesi: ?lang=en
  if (import.meta.env.DEV) {
    const q = new URLSearchParams(location.search).get("lang");
    if (q && LANGS.some((l) => l.id === q)) return q as Lang;
  }
  try {
    const raw = localStorage.getItem("nook");
    if (!raw) return detectLang();
    const lang = JSON.parse(raw)?.state?.settings?.lang;
    return LANGS.some((l) => l.id === lang) ? lang : "tr";
  } catch {
    return "tr";
  }
}

export const lang: Lang = typeof localStorage === "undefined" ? "tr" : initialLang();
const dict = DICTS[lang] ?? {};

/** Tarih/saat ve sayı biçimi için yerel ayar ("tr-TR", "en-US"…) */
export const locale = () => LANGS.find((l) => l.id === lang)!.locale;

/** Çoğul biçimlerinin sırası (çeviride "|" ile ayrılır) */
const PLURAL_ORDER: Partial<Record<Lang, Intl.LDMLPluralRule[]>> = {
  en: ["one", "other"],
  es: ["one", "other"],
  pt: ["one", "other"],
  de: ["one", "other"],
  fr: ["one", "other"],
  ru: ["one", "few", "many", "other"],
};

function plural(text: string, args: unknown[]) {
  if (!text.includes("|")) return text;
  const forms = text.split("|");
  const n = args.find((a) => typeof a === "number") as number | undefined;
  const order = PLURAL_ORDER[lang];
  if (n === undefined || !order) return forms[forms.length - 1];
  const cat = new Intl.PluralRules(locale()).select(n);
  const i = order.indexOf(cat);
  return forms[i >= 0 && i < forms.length ? i : forms.length - 1];
}

/** Metni seçili dile çevir; {0}, {1}… yerlerine argümanları koy */
export function tt(source: string, ...args: unknown[]): string {
  const raw = lang === "tr" ? source : (dict[source] ?? source);
  const text = plural(raw, args);
  return args.length ? text.replace(/\{(\d+)\}/g, (m, i) => (args[Number(i)] === undefined ? m : String(args[Number(i)]))) : text;
}

/** Türkçede mi (ünlü uyumlu ekler, "%7" gibi yazımlar yalnızca Türkçede) */
export const isTurkish = lang === "tr";

/** Ondalık sayı seçili dilin biçiminde: "9,4" / "9.4" */
export const dec = (n: number, digits = 1) => n.toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Yüzde yazımı: "%37" (Türkçe), "37 %" (es, de, fr), "37%" (diğerleri) */
export const pct = (n: number) => (isTurkish ? `%${n}` : lang === "es" || lang === "de" || lang === "fr" ? `${n} %` : `${n}%`);

/** Dil değişti: ayar kaydedilir, bütün Nook pencereleri yeniden yüklenir */
export function onLangChange(next: Lang) {
  if (next === lang) return;
  try {
    sessionStorage.setItem("nook-skip-intro", "1");
  } catch {
    /* yok */
  }
  window.setTimeout(() => location.reload(), 120);
}

/** Başka bir Nook penceresi dili değiştirdiyse bu pencere de yenilensin */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== "nook" || !e.newValue) return;
    try {
      const next = JSON.parse(e.newValue)?.state?.settings?.lang;
      if (next && next !== lang && LANGS.some((l) => l.id === next)) location.reload();
    } catch {
      /* yok */
    }
  });
}
