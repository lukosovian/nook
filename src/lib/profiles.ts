import { ACCENT } from "../components/ui/primitives";
import type { HomeProfile, Tab } from "../store/nook";
import { tt } from "./i18n";

/**
 * Ana sayfa profilleri: İş'te yalnızca çalışma bölümleri kalır; Oyun ve Eğlence'de kendi bölümleri
 * öne çıkar, diğerleri arkada durur.
 */
export const PROFILES: { id: HomeProfile; label: string; color: string; ids: Tab[]; only?: boolean }[] = [
  { id: "all", label: tt("Hepsi"), color: ACCENT.teal, ids: [] },
  { id: "work", label: tt("İş"), color: ACCENT.blue, ids: ["focus", "note", "calendar", "clip"], only: true },
  { id: "game", label: tt("Oyun"), color: ACCENT.red, ids: ["report", "media", "stats", "play"] },
  { id: "fun", label: tt("Eğlence"), color: ACCENT.pink, ids: ["media", "argus", "play", "look"] },
];
