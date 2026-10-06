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

/** Gemini hatası. `busy`: geçici yoğunluk/kota — tekrar denenebilir ya da başka modele geçilebilir. */
export class GeminiError extends Error {
  constructor(
    message: string,
    readonly busy = false,
  ) {
    super(message);
  }
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
  if (r.status === 503 || status === "UNAVAILABLE") return new GeminiError(tt("Gemini şu an çok yoğun"), true);
  if (r.status === 429 || status === "RESOURCE_EXHAUSTED") return new GeminiError(tt("Gemini kotası doldu"), true);
  if (r.status >= 500) return new GeminiError(tt("Gemini geçici bir hata verdi ({0})", r.status), true);
  return new GeminiError(`${status}: ${message || r.statusText}`);
}

/**
 * Sohbet edebilen modeller (ad sırası: en yeni önce). Anahtar yanlışsa hata fırlatır.
 * Görsel/ses/gömme modelleri elenir.
 */
export async function listModels(key: string): Promise<ModelInfo[]> {
  const r = await fetch(`${BASE}/models?pageSize=200`, { headers: headers(key), signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw await apiError(r);
  const j = (await r.json()) as { models?: { name: string; displayName?: string; supportedGenerationMethods?: string[] }[] };
  return (j.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .filter((m) => /gemini/i.test(m.name) && !/(embedding|image|tts|audio|vision|aqa|live|native)/i.test(m.name))
    .map((m) => ({ id: m.name.replace(/^models\//, ""), label: m.displayName ?? m.name }))
    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
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

/** Akışsız tek seferlik istek; düz metin cevabı döner. */
export async function generateOnce(key: string, model: string, parts: Part[], system?: string, signal?: AbortSignal): Promise<string> {
  const r = await fetch(`${BASE}/models/${model}:generateContent`, {
    method: "POST",
    signal: signal ?? AbortSignal.timeout(30_000),
    headers: headers(key),
    body: JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.2 },
    }),
  });
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
