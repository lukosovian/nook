/**
 * Gemini'nin hızlı modeliyle küçük işler:
 *  - Sesli komut kaydını yazıya dökme
 *  - Kopyalanan yabancı metni Türkçeye çevirme (anahtar yoksa MyMemory)
 */
import { GeminiError, generateOnce, pickQuickModel, type Part } from "./ai";
import { modelsFor } from "../hooks/useGemini";
import { note } from "./log";
import { useNook } from "../store/nook";

/** Kotası dolan model bir süre denenmesin (her kopyalamada boşa istek gitmesin). */
const resting = new Map<string, number>();
const REST_MS = 15 * 60_000;

/**
 * Önce hızlı model (Flash); `slowOk` ise o yoğunken sohbette kullanılan (daha yavaş) model.
 * Anahtar yoksa null.
 */
async function ask(parts: Part[], system: string, slowOk: boolean): Promise<string | null> {
  const s = useNook.getState().settings;
  const key = s.geminiKey.trim();
  if (!key) return null;
  const quickModel = pickQuickModel(await modelsFor(key));
  const models = [...new Set([quickModel, slowOk ? s.aiModel : null].filter(Boolean) as string[])].filter(
    (m) => (resting.get(m) ?? 0) < Date.now(),
  );
  let last: unknown = new GeminiError("Gemini modelleri şu an meşgul", true);
  for (const model of models) {
    try {
      return await generateOnce(key, model, parts, system);
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

/** Base64 WAV → konuşmanın metni (boşsa ""). */
export async function transcribe(wavBase64: string): Promise<string> {
  const text = await ask(
    [{ inlineData: { mimeType: "audio/wav", data: wavBase64 } }, { text: "Bu ses kaydındaki konuşmayı olduğu gibi yaz." }],
    "Sen bir konuşma-yazı çevirmenisin. Yalnızca söyleneni, söylendiği dilde ve noktalamasıyla yaz; yorum ekleme. Kayıtta anlaşılır konuşma yoksa hiçbir şey yazma.",
    true,
  );
  if (text === null) throw new Error("Sesli komut için Ayarlar'a Gemini API anahtarını eklemen lazım");
  return text.replace(/^["“]|["”]$/g, "").trim();
}

const TURKISH_CHARS = /[çğıöşüÇĞİÖŞÜ]/;
const TURKISH_WORDS = /\b(ve|bir|bu|şu|için|ile|ama|çok|daha|gibi|olan|değil|var|yok|ben|sen|biz|ne|nasıl|neden|merhaba|tamam)\b/i;
const FOREIGN_WORDS = /\b(the|and|is|are|you|your|of|to|with|that|this|for|not|have|what|der|die|das|und|ist|nicht|le|la|les|et|est|une|el|los|las|que|por|para|il|di|che)\b/i;
const NON_LATIN = /[Ѐ-ӿ؀-ۿ֐-׿぀-ヿ一-鿿가-힯฀-๿Ͱ-Ͽ]/;

/**
 * Çevrilmeye değer yabancı bir metin mi? Kod, bağlantı, dosya yolu, sayı ve Türkçe elenir.
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
  if (NON_LATIN.test(t)) return true;
  if (TURKISH_CHARS.test(t) || TURKISH_WORDS.test(t)) return false;
  // Tek kelimeyse (ör. "Download") en az bir yabancı ipucu ya da büyük harfle başlayan anlamlı kelime
  return FOREIGN_WORDS.test(t) || /[äöüßéèêàâñœæøåčřšž]/i.test(t) || /^[A-Za-z][a-z]{3,}(\s+[A-Za-z][a-z]+){0,3}$/.test(t);
}

/** Türkçe çevirisi; zaten Türkçeyse ya da çevrilemezse null. */
export async function translateToTurkish(text: string): Promise<string | null> {
  // Gemini (anahtar varsa); kota/ağ sorununda ücretsiz servise düş
  const out = await ask(
    [{ text }],
    "Kullanıcının kopyaladığı metni Türkçeye çevir. Yalnızca çeviriyi yaz; açıklama, tırnak ya da dil adı ekleme. Metin zaten Türkçeyse ya da çevrilecek bir şey değilse (kod, isim, sayı) yalnızca - yaz.",
    // Çeviri hızlı olmalı: Flash yoksa yavaş modeli bekleme, ücretsiz servise geç
    false,
  ).catch(() => undefined);
  if (out !== undefined && out !== null) {
    return out && out !== "-" && out.toLocaleLowerCase("tr") !== text.toLocaleLowerCase("tr") ? out : null;
  }
  // Ücretsiz MyMemory (kaynak dili otomatik algılar)
  const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|tr`);
  const j = (await r.json()) as { responseData?: { translatedText?: string } };
  const mm = j.responseData?.translatedText?.trim();
  return mm && mm.toLocaleLowerCase("tr") !== text.toLocaleLowerCase("tr") && !/MYMEMORY WARNING|INVALID/i.test(mm) ? mm : null;
}
