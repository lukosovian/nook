import { isPrimary } from "../lib/bridge";
import type { IslandMode } from "../lib/layout";
import { useNook } from "../store/nook";

type State = ReturnType<typeof useNook.getState>;

/** Öncelik: yemek › arama › üzerine gelme › olay kartı › ses/parlaklık › kapalı */
export function islandModeOf(s: State): IslandMode {
  if (s.intro) return "intro";
  if (s.ringing) return "alarm";
  // Açılış kilidi: parola yazılana kadar ada yalnızca parola kutusu
  if (s.gate && isPrimary) return "gate";
  // Odak bekçisi: yasaklı siteden çıkana (ya da izin verene) kadar durur
  if (s.guard && isPrimary) return "guard";
  if (s.tour && isPrimary) return "tour";
  if (s.mood === "hungry" || s.mood === "chewing") return "feeding";
  if (s.searching) return "search";
  // Günün özeti: üzerine gelinse de büyük kalır
  if (s.brief && isPrimary) return "brief";
  if (s.notes && isPrimary) return "notes";
  // Su hatırlatması cevaplanana kadar durur (üstüne gelince açılmaz ki düğmelere basılabilsin)
  if (s.reminder) return "reminder";
  if (s.hovered || s.grabbed || s.pinned || s.holds.length) return "expanded";
  if (s.toasts.length) return "toast";
  if (s.osd) return "osd";
  return "collapsed";
}

export function useIslandMode(): IslandMode {
  return useNook(islandModeOf);
}
