/**
 * Sohbet yürütücüsü: mesajı Gemini'ye gönderir, cevabı akarken gösterir, model bir araç
 * kullanmak isterse çalıştırıp sonucu geri verir (en fazla birkaç tur).
 */
import { GeminiError, inlinePart, pickFallbackModel, streamChat, type Content, type Part } from "./ai";
import { modelsFor } from "../hooks/useGemini";
import { functions, runTool, systemPrompt } from "./aiTools";
import { useNook, type ChatItem } from "../store/nook";
import { nookName } from "./look";

/** Modele gönderilen geçmiş (son N mesaj). */
const HISTORY = 20;
const MAX_ROUNDS = 5;
/** Yoğunlukta tekrar denemeden önce bekleme */
const RETRY_AFTER_MS = 1500;

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(t);
      reject(new DOMException("Durduruldu", "AbortError"));
    });
  });

let controller: AbortController | null = null;

export function stopChat() {
  controller?.abort();
}

/**
 * `image`: "Ekrana sor" görüntüsü (data URL) — soruya eklenir.
 * `voice`: soru sesle soruldu (balonda mikrofon işareti).
 */
export async function sendChat(text: string, opts: { image?: string | null; voice?: boolean } = {}) {
  const image = opts.image ?? undefined;
  // Görüntü varsa boş soru da olur: "bu ne?"
  const q = text.trim() || (image ? "Ekranımda ne görüyorsun? Kısaca anlat, bir sorun varsa nasıl çözeceğimi söyle." : "");
  const s = useNook.getState();
  if (!q || s.chatBusy) return;
  const key = s.settings.geminiKey.trim();
  let model = s.settings.aiModel;
  /** Bu cevapta yoğunluk yüzünden yedek modele geçildi mi */
  let fellBack = false;

  // Geçmiş: art arda aynı rol gelmesin diye boş/hatalı mesajlar atlanır
  const contents: Content[] = [];
  for (const m of s.chat.slice(-HISTORY)) {
    if (!m.text.trim() || m.error) continue;
    const parts: Part[] = [{ text: m.text }];
    // Bu oturumda eklenen ekran görüntüleri sonraki sorularda da görülsün
    if (m.image) parts.unshift(inlinePart(m.image));
    contents.push({ role: m.role === "user" ? "user" : "model", parts });
  }
  contents.push({ role: "user", parts: image ? [inlinePart(image), { text: q }] : [{ text: q }] });

  s.pushChat({ id: crypto.randomUUID(), role: "user", text: text.trim() || (image ? "Ekranıma bak" : q), image, voice: opts.voice });
  const replyId = crypto.randomUUID();
  s.pushChat({ id: replyId, role: "nook", text: "" });
  s.setChatBusy(true);
  s.setBusy("ai", true); // ilk kelime gelene kadar Nook "düşünür"
  s.care(1);

  controller = new AbortController();
  let reply = "";
  try {
    if (!key) throw new Error("Ayarlar'a Gemini API anahtarını yapıştırman lazım");
    if (!model) throw new Error("Ayarlar'dan bir model seç");

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const parts: Part[] = [];
      const turnStart = reply.length;
      // Yoğunluk/kota: önce aynı modelle bir kez daha, sonra yedek modelle (Flash)
      for (let attempt = 0; ; attempt++) {
        parts.length = 0;
        reply = reply.slice(0, turnStart);
        try {
          for await (const ev of streamChat(key, model, systemPrompt(), contents, functions(), controller.signal)) {
            if (ev.type === "part") {
              parts.push(ev.part);
              continue;
            }
            if (!reply) {
              useNook.getState().setBusy("ai", false);
              useNook.getState().setTalking(true);
            }
            reply += ev.text;
            useNook.getState().patchChat(replyId, { text: reply });
          }
          break;
        } catch (e) {
          // Kelimeler akmaya başladıktan sonra kesilirse baştan denemek metni bozar
          const streamed = reply.length > turnStart;
          if (!(e instanceof GeminiError) || !e.busy || streamed || attempt >= 2) throw e;
          if (attempt === 0) {
            await sleep(RETRY_AFTER_MS, controller.signal);
            continue;
          }
          const fallback = pickFallbackModel(await modelsFor(key), model);
          if (!fallback) throw e;
          model = fallback;
          if (!fellBack) {
            fellBack = true;
            const item = useNook.getState().chat.find((m) => m.id === replyId);
            useNook.getState().patchChat(replyId, {
              notes: [...(item?.notes ?? []), { icon: "error", text: `Pro meşguldü, ${fallback} cevapladı` }],
            });
          }
        }
      }

      const calls = parts.filter((p) => p.functionCall);
      if (!calls.length) break;

      // Modelin turunu (düşünce imzalarıyla birlikte) aynen geri ver, araç sonuçlarını ekle
      contents.push({ role: "model", parts });
      const responses: Part[] = [];
      for (const p of calls) {
        const { name, args } = p.functionCall!;
        const { result, note } = await runTool(name, args ?? {});
        const item = useNook.getState().chat.find((m) => m.id === replyId);
        useNook.getState().patchChat(replyId, { notes: [...(item?.notes ?? []), note] });
        responses.push({ functionResponse: { name, response: { result } } });
      }
      contents.push({ role: "user", parts: responses });
      if (reply && !reply.endsWith(" ")) reply += " ";
    }
  } catch (e) {
    if ((e as Error).name !== "AbortError") {
      reply = reply || `Bir sorun çıktı: ${(e as Error).message}`;
      useNook.getState().patchChat(replyId, { text: reply, error: true });
    }
  } finally {
    const st = useNook.getState();
    st.setBusy("ai", false);
    st.setTalking(false);
    st.setChatBusy(false);
    controller = null;
    const final = reply.trim();
    if (!final && !st.chat.find((m) => m.id === replyId)?.notes?.length) st.patchChat(replyId, { text: "…" });
    // Ada kapalıyken cevap bittiyse küçük bir kartla haber ver
    if (!st.hovered && final) {
      st.pushToast({ kind: "chat", title: nookName(), detail: final.length > 70 ? `${final.slice(0, 70)}…` : final });
    }
  }
}

export type { ChatItem };
