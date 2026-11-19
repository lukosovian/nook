import { useEffect, useState } from "react";
import { aiErrorText, listModels, pickDefaultModel, type ModelInfo } from "../lib/ai";
import { checkClaude, claudeErrorText, CLAUDE_DEFAULT } from "../lib/anthropic";
import { useNook } from "../store/nook";

export type GeminiState =
  | { status: "nokey" }
  | { status: "checking" }
  | { status: "ok"; models: ModelInfo[] }
  | { status: "error"; error: string };

/** Aynı anahtar için listeyi tekrar tekrar çekme */
let cache: { key: string; models: ModelInfo[] } | null = null;

/** Sohbetin yedek model seçebilmesi için (anahtar için liste henüz alınmadıysa çeker). */
export async function modelsFor(key: string): Promise<ModelInfo[]> {
  if (cache?.key === key) return cache.models;
  const models = await listModels(key);
  cache = { key, models };
  return models;
}

/**
 * Anahtar geçerli mi, hangi modeller açık? Model seçilmemişse (ya da artık yoksa)
 * en yeni "Pro" modeli kendiliğinden seçer.
 */
export function useGemini(): GeminiState {
  const key = useNook((s) => s.settings.geminiKey.trim());
  const [state, setState] = useState<GeminiState>({ status: key ? "checking" : "nokey" });

  useEffect(() => {
    if (!key) {
      setState({ status: "nokey" });
      return;
    }
    let alive = true;
    const done = (models: ModelInfo[]) => {
      if (!alive) return;
      setState({ status: "ok", models });
      const { settings, updateSettings } = useNook.getState();
      if (!models.some((m) => m.id === settings.aiModel)) {
        const pick = pickDefaultModel(models);
        if (pick) updateSettings({ aiModel: pick });
      }
    };
    if (cache?.key === key) {
      done(cache.models);
      return;
    }
    setState({ status: "checking" });
    listModels(key)
      .then((models) => {
        cache = { key, models };
        done(models);
      })
      .catch((e) => alive && setState({ status: "error", error: aiErrorText(e) }));
    return () => {
      alive = false;
    };
  }, [key]);

  return state;
}

/** Aynı Claude anahtarı ve modeli yeniden yoklanmasın */
let claudeOk: string | null = null;

/** Claude anahtarı ve seçili model geçerli mi */
export function useClaudeAi(): { status: "nokey" | "checking" | "ok" | "error"; error?: string } {
  const key = useNook((s) => s.settings.claudeKey.trim());
  const model = useNook((s) => s.settings.claudeModel || CLAUDE_DEFAULT);
  const on = useNook((s) => s.settings.aiProvider === "claude");
  const sig = `${key}|${model}`;
  const [state, setState] = useState<ReturnType<typeof useClaudeAi>>({ status: !key ? "nokey" : claudeOk === sig ? "ok" : "checking" });

  useEffect(() => {
    if (!key) return setState({ status: "nokey" });
    if (claudeOk === sig) return setState({ status: "ok" });
    // Seçili değilken boşuna istek atma
    if (!on) return;
    let alive = true;
    setState({ status: "checking" });
    checkClaude(key, model)
      .then(() => {
        claudeOk = sig;
        if (alive) setState({ status: "ok" });
      })
      .catch(async (e) => {
        const error = await claudeErrorText(e);
        if (alive) setState({ status: "error", error });
      });
    return () => {
      alive = false;
    };
  }, [key, model, on, sig]);

  return state;
}

/** Seçili zekânın (Gemini ya da Claude) durumu ve modeli: sohbet hazır mı */
export function useAi(): { provider: "gemini" | "claude"; status: "nokey" | "checking" | "ok" | "error"; error?: string; model: string } {
  const provider = useNook((s) => s.settings.aiProvider);
  const geminiModel = useNook((s) => s.settings.aiModel);
  const claudeModel = useNook((s) => s.settings.claudeModel || CLAUDE_DEFAULT);
  const gemini = useGemini();
  const claude = useClaudeAi();
  return provider === "claude"
    ? { provider, status: claude.status, error: claude.error, model: claudeModel }
    : { provider, status: gemini.status, error: gemini.status === "error" ? gemini.error : undefined, model: geminiModel };
}
