import { useEffect, useState } from "react";
import { aiErrorText, listModels, pickDefaultModel, type ModelInfo } from "../lib/ai";
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
