import { isPrimary } from "../lib/bridge";
import type { IslandMode } from "../lib/layout";
import { useNook } from "../store/nook";

/** Öncelik: yemek › arama › üzerine gelme › olay kartı › ses/parlaklık › kapalı */
export function useIslandMode(): IslandMode {
  return useNook((s) => {
    if (s.intro) return "intro";
    if (s.ringing) return "alarm";
    if (s.tour && isPrimary) return "tour";
    if (s.mood === "hungry" || s.mood === "chewing") return "feeding";
    if (s.searching) return "search";
    // Günün özeti: üzerine gelinse de büyük kalır
    if (s.brief && isPrimary) return "brief";
    // Su hatırlatması cevaplanana kadar durur (üstüne gelince açılmaz ki düğmelere basılabilsin)
    if (s.reminder) return "reminder";
    if (s.hovered || s.grabbed || s.pinned || s.holds.length) return "expanded";
    if (s.toasts.length) return "toast";
    if (s.osd) return "osd";
    return "collapsed";
  });
}
