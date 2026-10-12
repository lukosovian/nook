import { tt } from "./i18n";
/**
 * Nook'un yapay zekâsı: Google Gemini API. Anahtar yalnızca bu bilgisayarda saklanır
 * ve doğrudan Google'a gönderilir (arada başka sunucu yok).
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Gemini sohbet parçası. Modelden gelen parçalar (gizli "thoughtSignature" dahil) olduğu gibi geri verilir. */
export interface Part {
  text?: string;
  thought?: boolean;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  [key: string]: unknown;
}

export interface Content {
  role: "user" | "model";
  parts: Part[];
}

export interface FunctionDecl {
  name: string;
  description: string;
  parameters: object;
}

export interface ModelInfo {
  id: string;
  label: string;
}

const headers = (key: string) => ({ "Content-Type": "application/json", "x-goog-api-key": key });

/**
 * Gemini hatası. `busy`: geçici yoğunluk/kota — tekrar denenebilir ya da başka modele geçilebilir.
 * `quota`: kota doldu (ücretsiz anahtarda Pro'nun kotası çok düşük).
 */
export class GeminiError extends Error {
  constructor(
    message: string,
    readonly busy = false,
    readonly quota = false,
  ) {
    super(message);
  }
}

/**
 * Kullanıcıya gösterilecek hata metni: tarayıcının "Failed to fetch", "signal timed out" gibi
 * İngilizce ham hataları yerine ne olduğunu söyleyen kısa bir cümle.
 */
export function aiErrorText(e: unknown): string {
  if (e instanceof GeminiError) return e.message;
  const err = e as Error;
  if (err?.name === "TimeoutError") return tt("Gemini cevap vermedi; internetini kontrol et");
  if (err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(err?.message ?? "")) return tt("İnternete bağlanamadım");
  return err?.message || tt("Gemini hatası");
}

/** Google'dan hata mesajını okunur hale getir. */
async function apiError(r: Response): Promise<GeminiError> {
  let message = "";
  let status = String(r.status);
  try {
    const j = (await r.json()) as { error?: { message?: string; status?: string } };
    message = j.error?.message ?? "";
    status = j.error?.status ?? status;
  } catch {
    // gövde JSON değil
  }
  if (r.status === 400 && /API key/i.test(message)) return new GeminiError(tt("API anahtarı geçersiz"));
  if (r.status === 401 || r.status === 403 || status === "PERMISSION_DENIED")
    return new GeminiError(tt("Bu anahtarla Gemini'ye izin yok; aistudio.google.com'dan yeni bir anahtar al"));
  if (status === "FAILED_PRECONDITION" && /location|region|country/i.test(message)) return new GeminiError(tt("Gemini bu ülkede ücretsiz kullanılamıyor"));
  if (r.status === 503 || status === "UNAVAILABLE") return new GeminiError(tt("Gemini şu an çok yoğun"), true);
  if (r.status === 429 || status === "RESOURCE_EXHAUSTED") return new GeminiError(tt("Gemini kotası doldu"), true, true);
  if (r.status >= 500) return new GeminiError(tt("Gemini geçici bir hata verdi ({0})", r.status), true);
  return new GeminiError(tt("Gemini hatası ({0})", message ? `${status}: ${message}` : status));
}

/**
 * Sohbet edebilen modeller (ad sırası: en yeni önce). Anahtar yanlışsa hata fırlatır.
 * Görsel/ses/gömme modelleri elenir.
 */
export async function listModels(key: string): Promise<ModelInfo[]> {
  const r = await fetch(`${BASE}/models?pageSize=200`, { headers: headers(key), signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw await apiError(r);
  const j = (await r.json()) as { models?: { name: string; displayName?: string; supportedGenerationMethods?: string[] }[] };
  const all = (j.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .filter((m) => /gemini/i.test(m.name) && !/(embedding|image|tts|audio|vision|aqa|live|native)/i.test(m.name))
    // Çoktan kapatılmış eski aileler
    .filter((m) => !/gemini-(1\.0|1\.5|pro$|pro-vision)/i.test(m.name))
    .map((m) => ({ id: m.name.replace(/^models\//, ""), label: m.displayName ?? m.name }))
    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
  const alive = await aliveModels(key, all);
  // Yoklama hiç sonuç vermediyse (internet kesik) listeyi boşaltma
  return alive.length ? alive : all;
}

// ------------------------------------------------------------------ çalışmayan modelleri ayıklama

/**
 * Google kapatılan (ya da bu anahtara kapalı) modelleri bir süre daha listede gösterir; seçilince
 * hata verir. Her model bir kez tek kelimelik istekle yoklanır, sonuç bir gün saklanır.
 * Kapatılmış, bulunamayan, izin verilmeyen ya da kotası sıfır olanlar çıkarılır; geçici
 * yoğunluk (503, dolmuş günlük kota) modeli çıkarmaz.
 */
const PROBE_STORE = "nook.geminiProbe";
const PROBE_TTL = 24 * 3600_000;

type Probe = Record<string, { ok: boolean; at: number }>;

function loadProbe(key: string): Probe {
  try {
    const all = JSON.parse(localStorage.getItem(PROBE_STORE) ?? "{}") as Record<string, Probe>;
    return all[key.slice(-8)] ?? {};
  } catch {
    return {};
  }
}

function saveProbe(key: string, probe: Probe) {
  try {
    localStorage.setItem(PROBE_STORE, JSON.stringify({ [key.slice(-8)]: probe }));
  } catch {
    /* yalnızca bu oturum */
  }
}

async function probeModel(key: string, id: string): Promise<boolean | null> {
  try {
    const r = await fetch(`${BASE}/models/${id}:generateContent`, {
      method: "POST",
      headers: headers(key),
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "hi" }] }], generationConfig: { maxOutputTokens: 1 } }),
      signal: AbortSignal.timeout(12000),
    });
    if (r.ok) return true;
    let message = "";
    try {
      message = ((await r.json()) as { error?: { message?: string } }).error?.message ?? "";
    } catch {
      // gövde JSON değil
    }
    if (r.status === 404 || r.status === 403) return false;
    if (r.status === 400 && /deprecat|discontinu|no longer|not (found|supported|available)|retired|shut ?down/i.test(message)) return false;
    // Ücretsiz anahtarda hiç kotası olmayan model ("limit: 0")
    if (r.status === 429 && /limit:\s*0\b/i.test(message)) return false;
    return true;
  } catch {
    // Zaman aşımı, internet: bilinmiyor
    return null;
  }
}

async function aliveModels(key: string, models: ModelInfo[]): Promise<ModelInfo[]> {
  const probe = loadProbe(key);
  // Daha önce yoklandıysa liste beklemesin (sesli komut, sohbet hemen başlasın); eskiyenler arka planda
  if (Object.keys(probe).length) {
    void refreshProbe(key, models, probe);
    return models.filter((m) => probe[m.id]?.ok !== false);
  }
  await refreshProbe(key, models, probe);
  return models.filter((m) => probe[m.id]?.ok !== false);
}

async function refreshProbe(key: string, models: ModelInfo[], probe: Probe) {
  const now = Date.now();
  await Promise.all(
    models.map(async (m) => {
      const p = probe[m.id];
      if (p && now - p.at < PROBE_TTL) return;
      const ok = await probeModel(key, m.id);
      if (ok !== null) probe[m.id] = { ok, at: now };
    }),
  );
  saveProbe(key, probe);
}

/** Yoğunlukta geçilecek yedek: en yeni kararlı "Flash" (lite olmayan); yoksa başka herhangi biri. */
export function pickFallbackModel(models: ModelInfo[], current: string): string | null {
  const stable = (m: ModelInfo) => !/(preview|exp|latest)/i.test(m.id);
  const others = models.filter((m) => m.id !== current);
  return (
    others.find((m) => /flash/i.test(m.id) && !/lite/i.test(m.id) && stable(m))?.id ??
    others.find((m) => /flash/i.test(m.id) && stable(m))?.id ??
    others.find((m) => /flash/i.test(m.id))?.id ??
    others[0]?.id ??
    null
  );
}

/** Varsayılan: en yeni kararlı "Pro" model; yoksa en yeni model. */
export function pickDefaultModel(models: ModelInfo[]): string | null {
  const stable = (m: ModelInfo) => !/(preview|exp|latest)/i.test(m.id);
  return (
    models.find((m) => /pro/i.test(m.id) && stable(m))?.id ??
    models.find((m) => /pro/i.test(m.id))?.id ??
    models[0]?.id ??
    null
  );
}

export type StreamEvent = { type: "token"; text: string } | { type: "part"; part: Part };

/**
 * Akışlı cevap (SSE). Görünen metin `token` olarak, modelin tüm parçaları (araç çağrıları ve
 * düşünce imzaları dahil) `part` olarak gelir — araç turunda bunlar aynen geri gönderilmeli.
 */
export async function* streamChat(
  key: string,
  model: string,
  system: string,
  contents: Content[],
  functions: FunctionDecl[],
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const r = await fetch(`${BASE}/models/${model}:streamGenerateContent?alt=sse`, {
    method: "POST",
    signal,
    headers: headers(key),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      tools: [{ functionDeclarations: functions }],
      generationConfig: { temperature: 0.8 },
    }),
  });
  if (!r.ok || !r.body) throw await apiError(r);

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const chunk = JSON.parse(line.slice(5)) as {
        candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
        error?: { message?: string };
      };
      if (chunk.error) {
        const busy = /overload|unavailable|high demand|exhausted/i.test(chunk.error.message ?? "");
        throw new GeminiError(busy ? tt("Gemini şu an çok yoğun") : (chunk.error.message ?? tt("Gemini hatası")), busy);
      }
      for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
        yield { type: "part", part };
        if (part.text && !part.thought) yield { type: "token", text: part.text };
      }
    }
  }
}

/** Hızlı işler (çeviri, sesi yazıya dökme) için: en yeni kararlı Flash; yoksa varsayılan. */
export function pickQuickModel(models: ModelInfo[]): string | null {
  return pickFallbackModel(models, "") ?? pickDefaultModel(models);
}

/** Gemini'ye bağlantıyı önceden aç (sesli komut başlarken): ilk istekte el sıkışma beklenmesin */
export function warmGemini(key: string) {
  if (!key) return;
  void fetch(`${BASE}/models?pageSize=1`, { headers: headers(key), signal: AbortSignal.timeout(5000) }).catch(() => {});
}

/** En hızlı model (yazıya dökme gibi basit işler): kararlı "Flash Lite"; yoksa null */
export function pickLiteModel(models: ModelInfo[]): string | null {
  return models.find((m) => /flash-lite/i.test(m.id) && !/(preview|exp|latest)/i.test(m.id))?.id ?? models.find((m) => /flash-lite/i.test(m.id))?.id ?? null;
}

/**
 * Akışsız tek seferlik istek; düz metin cevabı döner. `fast`: model düşünmeden cevaplasın
 * (desteklemeyen model reddederse düşünme ayarı olmadan bir kez daha denenir).
 */
export async function generateOnce(key: string, model: string, parts: Part[], system?: string, signal?: AbortSignal, fast = false): Promise<string> {
  const send = (noThinking: boolean) =>
    fetch(`${BASE}/models/${model}:generateContent`, {
      method: "POST",
      signal: signal ?? AbortSignal.timeout(fast ? 15_000 : 30_000),
      headers: headers(key),
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.2, ...(noThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}) },
      }),
    });
  let r = await send(fast);
  if (fast && r.status === 400) r = await send(false);
  if (!r.ok) throw await apiError(r);
  const j = (await r.json()) as { candidates?: { content?: { parts?: Part[] } }[] };
  return (j.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text)
    .join("")
    .trim();
}

/** "data:image/jpeg;base64,…" → Gemini inlineData parçası */
export function inlinePart(dataUrl: string): Part {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  return m ? { inlineData: { mimeType: m[1], data: m[2] } } : { text: "" };
}
