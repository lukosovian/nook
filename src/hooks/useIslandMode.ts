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
  // Hum dinlerken ve sonucu gösterirken: üstüne gelinse de açılmaz (düğmelere basılabilsin)
  if (s.hum && isPrimary) return "hum";
  // Ada sabitse ya da sallamayla (shelf-drop) açılmışsa, dosya bırakılırken 700×300 raf
  // imlecin altından 196×66'ya küçülüp titreşmesin; Nook sol köşede yutma animasyonunu oynar.
  if ((s.mood === "hungry" || s.mood === "chewing") && !s.pinned && !s.holds.length) return "feeding";
  if (s.searching) return "search";
  // Günün özeti: üzerine gelinse de büyük kalır
  if (s.brief && isPrimary) return "brief";
  if (s.notes && isPrimary) return "notes";
  if (s.report && isPrimary) return "report";
  // Su hatırlatması cevaplanana kadar durur (üstüne gelince açılmaz ki düğmelere basılabilsin)
  // Otomasyon "çalışsın mı?" diye soruyor (aynı kart)
  if (s.reminder || (s.autoAsk && isPrimary)) return "reminder";
  // Claude Code izin istiyor: cevaplanana kadar durur (üstüne gelince açılmaz ki düğmelere basılabilsin)
  if (s.claudeCard && isPrimary) return "claude";
  // Yanıtlanabilir bildirim kartı (WhatsApp / Nook Mobil hızlı yanıt): üstüne gelince kapanmasın ki doğrudan yanıt yazılabilsin
  if (s.toasts.length && (s.toasts[0].replyKey || s.toasts[0].whatsappChat) && !s.pinned && !s.grabbed && !s.holds.length) {
    return "toast";
  }
  if (s.hovered || s.grabbed || s.pinned || s.holds.length) return "expanded";
  if (s.toasts.length) return "toast";
  if (s.osd) return "osd";
  return "collapsed";
}

export function useIslandMode(): IslandMode {
  return useNook(islandModeOf);
}
