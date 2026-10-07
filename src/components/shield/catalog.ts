/**
 * Kalkan sahnelerinin listesi (kimlik + ad). Ayarlar sahneleri buradan listeler; sahnelerin kendisi
 * yalnızca kalkan penceresinde yüklenir (bkz. Shield.tsx).
 */
import { tt } from "../../lib/i18n";

export const SCENE_LIST: { id: string; label: string }[] = [
  { id: "campfire", label: tt("Kamp ateşi") },
  { id: "cafe", label: tt("Yağmurlu kafe") },
  { id: "disco", label: tt("80'ler disko") },
  { id: "space", label: tt("Uzay istasyonu") },
  { id: "beach", label: tt("Sahil") },
  { id: "library", label: tt("Büyücü kütüphanesi") },
  { id: "mine", label: tt("Kristal madeni") },
  { id: "zen", label: tt("Zen bahçesi") },
  { id: "studio", label: tt("Sanat atölyesi") },
  { id: "snow", label: tt("Kış") },
  { id: "arcade", label: tt("Atari salonu") },
  { id: "ocean", label: tt("Deniz altı") },
  { id: "greenhouse", label: tt("Sera") },
  { id: "train", label: tt("Gece treni") },
  { id: "cinema", label: tt("Sinema") },
  { id: "western", label: tt("Vahşi Batı") },
  { id: "pirate", label: tt("Korsan gemisi") },
  { id: "lab", label: tt("Çılgın laboratuvar") },
  { id: "lavender", label: tt("Lavanta tarlası") },
  { id: "bunker", label: tt("Sığınak") },
  { id: "ferris", label: tt("Dönme dolap") },
  { id: "sketch", label: tt("Eskiz defteri") },
];

export type SceneMode = "random" | "order" | "fixed";

/** Seçili sahneler (hiçbiri seçili değilse hepsi), listedeki sırayla */
export const activeScenes = (picked: string[]) => {
  const ids = SCENE_LIST.map((s) => s.id);
  const on = ids.filter((id) => picked.includes(id));
  return on.length ? on : ids;
};
