/**
 * Nook'un ikinci zekâsı: Anthropic Claude API. Anahtar yalnızca bu bilgisayarda saklanır ve
 * doğrudan Anthropic'e gönderilir (arada başka sunucu yok). Gemini'den farkı: ücretli bir
 * Anthropic API anahtarı ister (Claude aboneliği ya da Claude Code oturumu burada geçmez).
 *
 * SDK yalnızca Claude seçiliyken, ilk soruda yüklenir.
 */
import type Anthropic from "@anthropic-ai/sdk";
import type { FunctionDecl } from "./ai";
import { tt } from "./i18n";

export interface ClaudeModel {
  id: string;
  label: string;
  hint: string;
}

/** Seçilebilen modeller; ilki varsayılan */
export const CLAUDE_MODELS = (): ClaudeModel[] => [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", hint: tt("Akıllı ve dengeli; çoğu iş için en iyisi") },
  { id: "claude-fable-5-2", label: "Claude Fable 5.2", hint: tt("En zekisi; daha yavaş ve daha pahalı") },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", hint: tt("Hızlı; günlük sohbet için yeterli") },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", hint: tt("En hızlısı ve en ucuzu") },
];
export const CLAUDE_DEFAULT = "claude-opus-5-5";

/** Akış kesilince ya da araç girdisi bozuk gelince aynı tur en çok bu kadar yeniden istenir */
const TURN_RETRIES = 2;
const MAX_ROUNDS = 5;

type Sdk = typeof import("@anthropic-ai/sdk");
let sdk: Promise<Sdk> | null = null;
const load = () => (sdk ??= import("@anthropic-ai/sdk"));

async function client(key: string) {
  const { default: Anthropic } = await load();
  // Anahtar kullanıcının kendisinin ve yalnızca bu bilgisayarda: masaüstü uygulamasının kendi penceresi
  return new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
}

/** Kullanıcıya gösterilecek hata metni (SDK'nın hata sınıflarına göre) */
export async function claudeErrorText(e: unknown): Promise<string> {
  const { default: Anthropic } = await load();
  if (e instanceof Anthropic.AuthenticationError) return tt("Claude anahtarı geçersiz");
  if (e instanceof Anthropic.PermissionDeniedError) return tt("Bu anahtarla bu Claude modeline izin yok");
  if (e instanceof Anthropic.NotFoundError) return tt("Bu Claude modeli bulunamadı; Ayarlar'dan başka bir model seç");
  if (e instanceof Anthropic.RateLimitError) return tt("Claude kotası doldu; biraz sonra yeniden dene");
  if (e instanceof Anthropic.BadRequestError) {
    // Kredi bitince Anthropic 400 döner; iletisi İngilizce, kullanıcıya ne yapacağını söyle
    if (/credit balance/i.test(e.message)) return tt("Claude hesabında kredi kalmamış; console.anthropic.com'dan kredi ekle");
    console.warn("[nook] claude", e.status, e.message);
    return tt("Claude isteği kabul etmedi ({0})", e.status ?? 400);
  }
  if (e instanceof Anthropic.APIConnectionTimeoutError) return tt("Claude cevap vermedi; internetini kontrol et");
  if (e instanceof Anthropic.APIConnectionError) return tt("İnternete bağlanamadım");
  if (e instanceof Anthropic.APIError) return (e.status ?? 0) >= 500 ? tt("Claude şu an çok yoğun") : tt("Claude bir hata verdi ({0}). Biraz sonra yeniden dene", e.status ?? "?");
  return (e as Error)?.message || tt("Claude hatası");
}

/** Anahtar ve model geçerli mi (Ayarlar'da "Bağlandı" için). Hata fırlatırsa `claudeErrorText` ile okunur. */
export async function checkClaude(key: string, model: string): Promise<void> {
  await (await client(key)).models.retrieve(model, {}, { timeout: 10_000 });
}

/** Geçmişteki bir mesaj: düz metin ve (varsa) bu oturumda eklenen ekran görüntüsü */
export interface ClaudeTurn {
  role: "user" | "assistant";
  text: string;
  image?: string;
}

function imageBlock(dataUrl: string): Anthropic.Beta.BetaImageBlockParam | null {
  const m = /^data:(image\/(?:jpeg|png|gif|webp));base64,(.*)$/s.exec(dataUrl);
  return m ? { type: "image", source: { type: "base64", media_type: m[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: m[2] } } : null;
}

const toMessage = (t: ClaudeTurn): Anthropic.Beta.BetaMessageParam => {
  const img = t.image ? imageBlock(t.image) : null;
  return { role: t.role, content: img ? [img, { type: "text", text: t.text }] : t.text };
};

/**
 * Araç girdisi şemaya uyuyor mu: nesne mi, zorunlu alanlar var mı, yalın türler doğru mu.
 * Girdiler akarken geldiği için sunucu doğrulamıyor; yarım kalmış bir girdiyle araç çalışmasın.
 */
function validInput(decl: FunctionDecl | undefined, input: unknown): input is Record<string, unknown> {
  if (!decl || typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const schema = decl.parameters as { properties?: Record<string, { type?: string; enum?: unknown[] }>; required?: string[] };
  const obj = input as Record<string, unknown>;
  if ((schema.required ?? []).some((k) => obj[k] === undefined || obj[k] === null)) return false;
  return Object.entries(obj).every(([k, v]) => {
    const p = schema.properties?.[k];
    if (!p || v === null || v === undefined) return true;
    if (p.enum && !p.enum.includes(v)) return false;
    switch (p.type) {
      case "string":
        return typeof v === "string";
      case "integer":
        return typeof v === "number" && Number.isInteger(v);
      case "number":
        return typeof v === "number";
      case "boolean":
        return typeof v === "boolean";
      default:
        return true;
    }
  });
}

export interface ClaudeChatOptions {
  key: string;
  model: string;
  system: string;
  turns: ClaudeTurn[];
  functions: FunctionDecl[];
  /** Sesli komut: az düşünsün, çabuk cevaplasın */
  quick?: boolean;
  signal: AbortSignal;
  /** Görünen metin geldikçe */
  onText: (delta: string) => void;
  /** Bir tur bitti, araç çalıştırılacak: sonucu döndür */
  runTool: (name: string, args: Record<string, unknown>) => Promise<string>;
  /** Model bu isteği geri çevirdi */
  onRefusal: () => void;
}

/**
 * Akışlı cevap + araç döngüsü. Model araç isterse çalıştırılır, sonuç geri verilir (en çok birkaç tur).
 * Modelin turu (düşünce blokları dahil) değiştirilmeden geri gönderilir.
 */
export async function claudeChat(o: ClaudeChatOptions): Promise<void> {
  const c = await client(o.key);
  const { default: Anthropic } = await load();
  const tools: Anthropic.Beta.BetaTool[] = o.functions.map((f) => ({
    name: f.name,
    description: f.description,
    input_schema: f.parameters as Anthropic.Beta.BetaTool.InputSchema,
    // Girdiler üretilirken aksın; doğrulama aşağıda bizde
    eager_input_streaming: true,
  }));
  const messages: Anthropic.Beta.BetaMessageParam[] = o.turns.map(toMessage);

  let retries = 0;
  for (let round = 0; round < MAX_ROUNDS; ) {
    let streamed = false;
    const stream = c.beta.messages.stream(
      {
        model: o.model,
        max_tokens: 64000,
        system: o.system,
        tools,
        messages,
        // Düşünme derinliği: sesli komutta az, sohbette orta (araçlı kısa işler için yeterli)
        output_config: { effort: o.quick ? "low" : "medium" },
        // Model güvenlik gerekçesiyle geri çevirirse Anthropic aynı isteği uygun bir yedek modelde dener
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      },
      { signal: o.signal },
    );
    stream.on("text", (delta) => {
      streamed = true;
      o.onText(delta);
    });

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
      retries = 0;
    } catch (err) {
      // API hataları ve durdurma olduğu gibi yukarı; yarıda kopan akış ya da çözülemeyen araç girdisi
      // (metin akmadıysa) aynı tur için yeniden istenir
      if (err instanceof Anthropic.APIError || o.signal.aborted || streamed || retries++ >= TURN_RETRIES) throw err;
      continue;
    }
    round++;

    if (message.stop_reason === "refusal") {
      // Yarıda kesilmiş bir araç çağrısı olabilir: bu turun araçları asla çalıştırılmaz
      o.onRefusal();
      return;
    }
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }
    const calls = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (!calls.length) return;
    // max_tokens'ta kesilen girdi geçerli ama yarım bir nesne olabilir
    if (message.stop_reason === "max_tokens") throw new Error(tt("Cevap yarıda kesildi; yeniden dene"));

    messages.push({ role: "assistant", content: message.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const call of calls) {
      const decl = o.functions.find((f) => f.name === call.name);
      if (!validInput(decl, call.input)) {
        results.push({ type: "tool_result", tool_use_id: call.id, is_error: true, content: JSON.stringify({ INVALID_JSON: JSON.stringify(call.input) }) });
        continue;
      }
      results.push({ type: "tool_result", tool_use_id: call.id, content: await o.runTool(call.name, call.input) });
    }
    // Bütün sonuçlar tek kullanıcı mesajında
    messages.push({ role: "user", content: results });
    o.onText(" ");
  }
}
