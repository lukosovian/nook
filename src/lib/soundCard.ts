/**
 * Adanın solundaki ses kartı: Argus kartı gibi ayrı bir pencere (adanın içinde yer yok) ama
 * tıklanabilir. Ada açıkken görünür; üst çubuktaki hoparlörle ya da Ayarlar › Davranış'tan kapatılır.
 * Ada sürüklenince kart da gelir (Rust); ekranın solunda yer kalmazsa adanın sağına geçer.
 */
import { useEffect, useState } from "react";
import { emitTo, listen } from "@tauri-apps/api/event";
import { setHitExtra } from "../hooks/useHitRect";
import { useNook } from "../store/nook";
import { inTauri, isPrimary, sideCard, subscribe } from "./bridge";
import { ISLAND, ISLAND_TOP, type IslandMode } from "./layout";

const GAP = 10;
/** Kartın görünen boyutu (pencerede kenardan 6 px boşlukla) — açık adayla aynı boy */
export const SOUND_SIZE = { width: 288, height: ISLAND.expanded.height };
/** Pencerenin genişliği (src-tauri/src/argus.rs SOUND_W ile aynı) */
const WINDOW_W = 300;

export interface SoundCardData {
  visible: boolean;
  /** Ada üst kenardan ayrıysa kart da dört köşesi yuvarlak */
  detached: boolean;
  /** Kart adanın sağında (ekranın solunda yer yok) */
  right?: boolean;
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
  const [right, setRight] = useState(false);

  // Ada sürüklenirken taraf değişirse (Rust kartı taşır, burası tıklama alanını ve köşeleri günceller)
  useEffect(() => (isPrimary && inTauri ? subscribe<boolean>("nook://sound-side", setRight) : undefined), []);

  const left = window.innerWidth / 2 - ISLAND.expanded.width / 2 - GAP - WINDOW_W;
  const alt = window.innerWidth / 2 + ISLAND.expanded.width / 2 + GAP;
  useEffect(() => {
    if (!isPrimary || !inTauri) return;
    if (!show) {
      void send({ visible: false, detached });
      void sideCard(false, left, ISLAND_TOP, alt).catch(() => {});
      return;
    }
    void sideCard(true, left, ISLAND_TOP, alt)
      .then((r) => {
        setRight(r);
        return send({ visible: true, detached, right: r });
      })
      .catch((e) => console.warn("[nook] ses kartı", e));
  }, [show, detached]);

  // İmleç karta (ve aradaki boşluğa) geçince ada kapanmasın
  useEffect(() => {
    if (!show) return;
    if (last.visible && last.right !== right) void send({ ...last, right });
    const x = right ? alt - GAP - 4 : left + WINDOW_W - 6 - SOUND_SIZE.width - 6;
    setHitExtra("sound", { x, y: ISLAND_TOP, width: SOUND_SIZE.width + 12 + GAP + 4, height: SOUND_SIZE.height + 6 });
    return () => setHitExtra("sound", null);
  }, [show, right]);
}
