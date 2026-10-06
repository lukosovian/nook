/**
 * Adanın solundaki ses kartı: Argus kartı gibi ayrı bir pencere (adanın içinde yer yok) ama
 * tıklanabilir. Ada açıkken görünür; Ayarlar › Davranış'tan kapatılabilir.
 */
import { useEffect } from "react";
import { emitTo, listen } from "@tauri-apps/api/event";
import { setHitExtra } from "../hooks/useHitRect";
import { useNook } from "../store/nook";
import { inTauri, isPrimary, sideCard } from "./bridge";
import { ISLAND, ISLAND_TOP, type IslandMode } from "./layout";

const GAP = 10;
/** Kartın görünen boyutu (pencerede sağdan 6 px boşlukla) — açık adayla aynı boy */
export const SOUND_SIZE = { width: 288, height: ISLAND.expanded.height };
/** Pencerenin genişliği (src-tauri/src/argus.rs SOUND_W ile aynı) */
const WINDOW_W = 300;

export interface SoundCardData {
  visible: boolean;
  /** Ada üst kenardan ayrıysa kart da dört köşesi yuvarlak */
  detached: boolean;
}

let last: SoundCardData = { visible: false, detached: false };
const send = (d: SoundCardData) => {
  last = d;
  return emitTo("sound-card", "nook://sound-card", d).catch(() => {});
};
if (isPrimary && inTauri) void listen("nook://sound-card-ready", () => void send(last));

export function useSoundCard(mode: IslandMode) {
  const on = useNook((s) => s.settings.soundCard);
  const fullscreen = useNook((s) => s.fullscreen);
  const big = useNook((s) => !!s.big);
  const detached = useNook((s) => (s.settings.islandPos?.fy ?? 0) > 0);
  const show = isPrimary && inTauri && on && mode === "expanded" && !fullscreen && !big;
  useEffect(() => {
    if (!isPrimary || !inTauri) return;
    if (show) {
      const x = window.innerWidth / 2 - ISLAND.expanded.width / 2 - GAP - WINDOW_W;
      void sideCard(true, x, ISLAND_TOP)
        .then(() => send({ visible: true, detached }))
        .catch((e) => console.warn("[nook] ses kartı", e));
      // İmleç karta (ve aradaki boşluğa) geçince ada kapanmasın
      setHitExtra("sound", { x: x + WINDOW_W - 6 - SOUND_SIZE.width - 6, y: ISLAND_TOP, width: SOUND_SIZE.width + 12 + GAP + 4, height: SOUND_SIZE.height + 6 });
      return () => setHitExtra("sound", null);
    }
    void send({ visible: false, detached });
  }, [show, detached]);
}
