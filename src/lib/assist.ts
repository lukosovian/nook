/**
 * Gemini'nin hızlı modeliyle küçük işler:
 *  - Sesli komut kaydını yazıya dökme
 *  - Kopyalanan yabancı metni kullanıcının diline çevirme (anahtar yoksa MyMemory)
 */
import { GeminiError, generateOnce, pickLiteModel, pickQuickModel, type Part } from "./ai";
import { modelsFor } from "../hooks/useGemini";
import { note } from "./log";
import { useNook } from "../store/nook";
import { appsCached as listApps, sttTranscribe } from "./bridge";
import { lang, LANG_NAME_TR, tt, type Lang } from "./i18n";

/** Kotası dolan model bir süre denenmesin (her kopyalamada boşa istek gitmesin). */
const resting = new Map<string, number>();
const REST_MS = 15 * 60_000;

/**
 * Önce hızlı model (Flash); `slowOk` ise o yoğunken sohbette kullanılan (daha yavaş) model.
 * Anahtar yoksa null.
 */
async function ask(parts: Part[], system: string, slowOk: boolean, fastest = false): Promise<string | null> {
  const s = useNook.getState().settings;
  const key = s.geminiKey.trim();
  if (!key) return null;
  const list = await modelsFor(key);
  const quickModel = pickQuickModel(list);
  const lite = fastest ? pickLiteModel(list) : null;
  // Hızlı model önce; Lite yalnızca o meşgulse (yazıya dökmede daha çok yanılıyor)
  const models = [...new Set([quickModel, lite, slowOk ? s.aiModel : null].filter(Boolean) as string[])].filter(
    (m) => (resting.get(m) ?? 0) < Date.now(),
  );
  let last: unknown = new GeminiError(tt("Gemini modelleri şu an meşgul"), true);
  for (const model of models) {
    try {
      return await generateOnce(key, model, parts, system, undefined, fastest);
    } catch (e) {
      last = e;
      note(`gemini ${model}: ${(e as Error).message}`);
      if (e instanceof GeminiError && e.busy) resting.set(model, Date.now() + REST_MS);
      // Anahtar hatası gibi kalıcı sorunlarda diğer modeli denemenin anlamı yok
      if (!(e instanceof GeminiError) || !e.busy) break;
    }
  }
  throw last ?? new Error("model yok");
}

/**
 * Çeviri gibi kolay işler: en hızlı model (Lite) hemen başlar, 2 sn'de cevap gelmezse Flash da başlar;
 * önce biten kazanır, öbürü iptal edilir. Tek modelle sırayla beklemek kısa metinde bile 5-10 sn sürüyordu.
 */
async function askRace(parts: Part[], system: string): Promise<string | null> {
  const key = useNook.getState().settings.geminiKey.trim();
  if (!key) return null;
  const list = await modelsFor(key);
  const models = [...new Set([pickLiteModel(list), pickQuickModel(list)].filter(Boolean) as string[])].filter((m) => (resting.get(m) ?? 0) < Date.now());
  if (!models.length) throw new GeminiError(tt("Gemini modelleri şu an meşgul"), true);
  const stop = new AbortController();
  const run = (model: string): Promise<string> => {
    if (stop.signal.aborted) return Promise.reject(new Error("iptal"));
    return generateOnce(key, model, parts, system, AbortSignal.any([stop.signal, AbortSignal.timeout(12_000)]), true)
      .then((out) => {
        // Boş cevap (yalnızca düşünce ya da kesik cevap) "çeviri yok" demek değil: öbür model denensin
        if (!out.trim()) throw new Error("boş cevap");
        return out;
      })
      .catch((e) => {
        if (!stop.signal.aborted) note(`gemini ${model}: ${(e as Error).message}`);
        if (e instanceof GeminiError && e.busy) resting.set(model, Date.now() + REST_MS);
        throw e;
      });
  };
  try {
    const first = run(models[0]);
    // İkincisi 2 sn sonra, ilki o arada hata verirse hemen başlar
    const second = models[1] ? Promise.race([first.catch(() => undefined), new Promise((r) => window.setTimeout(r, 2000))]).then(() => run(models[1])) : null;
    return await Promise.any(second ? [first, second] : [first]);
  } catch (e) {
    throw e instanceof AggregateError ? e.errors[0] : e;
  } finally {
    stop.abort();
  }
}

/** Base64 WAV → konuşmanın metni (boşsa ""). */
/** Whisper'ın sessizlikte ya da gürültüde uydurduğu bilinen cümleler (altyazı kalıntıları) */
const HALLUCINATION = /altyaz[ıi]|abone ol|izlediğiniz için|teşekkürler\.?$|thanks? (you )?for watching|subscribe|^[\s.,!?…-]*$|^\[.*\]$|^\(.*\)$|^\*.*\*$/i;

/** Önce bu bilgisayarda (Whisper, açıksa), olmazsa Gemini ile */
export async function transcribe(wavBase64: string): Promise<string> {
  if (useNook.getState().settings.localStt) {
    try {
      const apps = (await listApps().catch(() => []))
        .map((a) => a.name)
        .filter((n) => n.length <= 20 && !/(uninstall|kaldır|readme|help|yardım|setup)/i.test(n))
        .slice(0, 40);
      // Örnek cümleler Whisper'a hem adları hem dili gösterir
      const sample =
        lang === "tr"
          ? "Hey Nook, Argus'u aç. Spotify'ı aç. YouTube Music'ten Tarkan çal. Sesi yüzde 50 yap."
          : lang === "en"
            ? "Hey Nook, open Argus. Open Spotify. Play Tarkan on YouTube Music. Set the volume to 50%."
            : "Hey Nook. Argus. Spotify. YouTube Music.";
      const prompt = `${sample} ${apps.join(", ")}.`;
      const text = (await sttTranscribe(wavBase64, prompt, lang)).trim();
      if (text && !HALLUCINATION.test(text)) return text.replace(/^["“]|["”]$/g, "").trim();
      if (!text || HALLUCINATION.test(text)) return "";
    } catch (e) {
      note(`whisper: ${String(e)}`);
    }
  }
  return transcribeGemini(wavBase64);
}

async function transcribeGemini(wavBase64: string): Promise<string> {
  // Bu bilgisayardaki uygulama adları: "Argus'u aç" "tuş" diye yazılmasın
  const apps = (await listApps().catch(() => []))
    .map((a) => a.name)
    .filter((n) => n.length <= 24 && !/(uninstall|kaldır|readme|help|yardım)/i.test(n))
    .slice(0, 150);
  const vocab = [...new Set(["Nook", "Argus", "YouTube", "YouTube Music", "Spotify", "Gmail", "Discord", "Chrome", ...apps])].join(", ");
  const text = await ask(
    [{ inlineData: { mimeType: "audio/wav", data: wavBase64 } }, { text: "Bu ses kaydındaki konuşmayı olduğu gibi yaz." }],
    `Sen bir konuşma-yazı çevirmenisin. Bu, bilgisayara verilen kısa bir sesli komut; çoğunlukla ${LANG_NAME_TR[lang]}. Kayıt "Hey Nook" ile başlayabilir. Yalnızca söyleneni, söylendiği dilde ve noktalamasıyla yaz; yorum ekleme. Sayıları rakamla yaz ("yüzde yüz" → "%100", "yetmiş beş" → "75", "fifty" → "50"). Kayıtta anlaşılır konuşma yoksa hiçbir şey yazma. Geçebilecek özel adlar (bunlara benzeyen bir ses duyarsan bu yazılışı kullan): ${vocab}.`,
    true,
    true,
  );
  if (text === null) throw new Error("Sesli komut için Ayarlar'a Gemini API anahtarını eklemen lazım");
  return text.replace(/^["“]|["”]$/g, "").trim();
}

/** Dillerin sık geçen küçük kelimeleri: metnin hangi dilde olduğunu kabaca anlamak için */
const STOP: Partial<Record<Lang, RegExp>> = {
  tr: /\b(ve|bir|bu|şu|için|ile|ama|çok|daha|gibi|olan|değil|var|yok|ben|sen|biz|ne|nasıl|neden|merhaba|tamam)\b/i,
  en: /\b(the|and|is|are|you|your|of|to|with|that|this|for|not|have|what|it|was)\b/i,
  es: /\b(el|los|las|que|por|para|una|con|del|está|pero|como|muy)\b/i,
  pt: /\b(não|para|com|uma|você|está|mas|como|muito|isso|são)\b/i,
  de: /\b(der|die|das|und|ist|nicht|ein|eine|mit|für|ich|auch|sie|zu|dich|mich|wir|sind|haben|bitte|danke|guten|wie|nein|aber|oder)\b/i,
  fr: /\b(le|les|et|est|une|des|pour|pas|avec|je|vous|dans|sur|bonjour|merci|oui|mais|qui)\b/i,
};
const SCRIPT: Record<"latin" | "cyrillic" | "han" | "kana" | "other", RegExp> = {
  latin: /[A-Za-zÀ-ɏ]/,
  cyrillic: /[Ѐ-ӿ]/,
  han: /[一-鿿]/,
  kana: /[぀-ヿ]/,
  other: /[؀-ۿ֐-׿가-힯฀-๿Ͱ-Ͽ]/,
};
const TURKISH_CHARS = /[çğıöşüÇĞİÖŞÜ]/;
/** Yalnızca Türkçede olan harfler (ç, ö, ü Almanca ve Fransızcada da var) */
const TURKISH_ONLY = /[ğışĞİŞ]/;
/** Başka Latin dillerinin harfleri */
const FOREIGN_CHARS = /[äßéèêàâñœæøåčřšžëïîôûù]/i;
const hits = (re: RegExp, t: string) => (t.match(new RegExp(re.source, "gi")) ?? []).length;

/**
 * Çevrilmeye değer, seçili dilden başka bir dilde metin mi? Kod, bağlantı, dosya yolu, sayı elenir.
 * (Her kopyalamada istek atılmasın diye önce yerel bir kaba eleme.)
 */
export function looksForeign(raw: string): boolean {
  const t = raw.trim();
  if (t.length < 4 || t.length > 600) return false;
  if (/^(https?:\/\/|www\.|[a-z]:\\|\/|~\/)/i.test(t) || /\S+@\S+\.\S+/.test(t)) return false;
  // Kod: süslü parantez, noktalı virgülle biten satırlar, => vb.
  if (/[{};]\s*$|=>|::|\bfunction\b|\bconst\b|\bimport\b|<\/?[a-z]+>/m.test(t)) return false;
  const letters = (t.match(/\p{L}/gu) ?? []).length;
  if (letters < 4 || letters / t.length < 0.55) return false;
  // Kendi alfabemizden başka bir alfabe → yabancı
  const mine = lang === "ru" ? "cyrillic" : lang === "zh" ? "han" : lang === "ja" ? "kana" : "latin";
  const own = SCRIPT[mine].test(t) || (lang === "ja" && SCRIPT.han.test(t));
  const otherScript = (Object.keys(SCRIPT) as (keyof typeof SCRIPT)[]).some((k) => k !== mine && !(lang === "ja" && k === "han") && SCRIPT[k].test(t));
  if (otherScript && !own) return true;
  if (mine !== "latin") return otherScript && /[A-Za-z]{3,}/.test(t);
  if (otherScript) return true;
  if (lang !== "tr") {
    // Latin alfabeli dillerde: kendi dilimizin ipucu varsa değil, başka dilin ipucu varsa yabancı
    if (STOP[lang]?.test(t)) return false;
    return TURKISH_CHARS.test(t) || Object.entries(STOP).some(([l, re]) => l !== lang && re!.test(t));
  }
  // Türkçe: Türkçe ipuçları ile başka dillerin ipuçları tartılır (Almanca "schön" Türkçe sayılmasın)
  const tr = hits(STOP.tr!, t) + (TURKISH_ONLY.test(t) ? 2 : 0);
  const other = Math.max(...Object.entries(STOP).filter(([l]) => l !== "tr").map(([, re]) => hits(re!, t))) + (FOREIGN_CHARS.test(t) ? 2 : 0);
  if (tr || other) return other > tr;
  if (TURKISH_CHARS.test(t)) return false;
  // Hiç ipucu yok: birkaç kelimelik Latin metin Gemini'ye gider (Türkçeyse "-" der, kart çıkmaz);
  // tek kelime yalnızca büyük harfle başlıyorsa ya da İngilizce gibi görünüyorsa
  const words = t.split(/\s+/).filter((w) => /\p{L}{2,}/u.test(w)).length;
  if (words >= 2) return true;
  return /^[A-Za-z][a-z]{3,}$/.test(t) && (/^[A-Z]/.test(t) || /(ing|tion|ness|ment|able|ful|less|ly|ed|er|est|ous|ive|ght|th|sh|w|y)$/.test(t));
}

/**
 * Çeviri nasıl yapılır: Gemini anahtarıyla, izin verilmiş ücretsiz servisle (MyMemory), izin
 * henüz sorulmadıysa "ask", izin verilmediyse "off".
 */
export function translateMode(): "gemini" | "free" | "ask" | "off" {
  const s = useNook.getState().settings;
  if (s.geminiKey.trim()) return "gemini";
  return s.freeTranslate === true ? "free" : s.freeTranslate === false ? "off" : "ask";
}

/**
 * Seçili dildeki çevirisi; zaten o dildeyse ya da çevrilemezse null. `allowFree`: Gemini
 * yoksa/olmazsa metin ücretsiz servise (MyMemory) gidebilir mi — kullanıcı izin vermedikçe gitmez.
 */
export async function translateToUser(text: string, allowFree = useNook.getState().settings.freeTranslate === true): Promise<string | null> {
  // Gemini (anahtar varsa): düşünmesiz hızlı model, meşgulse Lite; ağ takılırsa bir kez daha dener.
  // Önceden düşünen modelle 30 sn bekliyor, sık sık zaman aşımına düşüp hiç çeviri göstermiyordu.
  const system = `Kullanıcının kopyaladığı metni ${LANG_NAME_TR[lang]} diline çevir. Yalnızca çeviriyi yaz; açıklama, tırnak ya da dil adı ekleme. Metin zaten bu dildeyse ya da çevrilecek bir şey değilse (kod, isim, sayı) yalnızca - yaz.`;
  let out: string | null | undefined;
  for (let attempt = 0; attempt < 2 && out === undefined; attempt++) {
    if (attempt) await new Promise((r) => window.setTimeout(r, 600));
    out = await askRace([{ text }], system).catch((e) => {
      note(`çeviri denemesi ${attempt + 1}: ${(e as Error).message}`);
      return undefined;
    });
  }
  if (out !== undefined && out !== null) {
    const clean = cleanTranslation(out);
    return clean && clean !== "-" && clean.toLocaleLowerCase("tr") !== text.toLocaleLowerCase("tr") ? clean : null;
  }
  if (!allowFree) {
    if (out === undefined) throw new TranslateFailed("Gemini çeviremedi");
    return null;
  }
  // Ücretsiz MyMemory (kaynak dili otomatik algılar)
  const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${lang === "zh" ? "zh-CN" : lang}`);
  const j = (await r.json()) as { responseData?: { translatedText?: string } };
  const mm = j.responseData?.translatedText?.trim();
  return mm && mm.toLocaleLowerCase("tr") !== text.toLocaleLowerCase("tr") && !/MYMEMORY WARNING|INVALID/i.test(mm) ? mm : null;
}

/** Modelin bazen eklediği tırnakları ve "Çeviri:" önekini at */
function cleanTranslation(out: string) {
  return out
    .trim()
    .replace(/^(çeviri|translation|traducción|übersetzung|traduction)\s*:\s*/i, "")
    .replace(/^["“'«]+|["”'»]+$/g, "")
    .trim();
}

/** Çeviri denendi ama sonuç alınamadı mı (kartta "tekrar dene" göstermek için) */
export class TranslateFailed extends Error {}
