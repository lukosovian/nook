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
  // Bildirim kartı onay kartını beklemez: süresince önde durur, sonra onay kartı geri gelir
  if (s.claudeCard && isPrimary && s.toasts[0]?.kind !== "notify") return "claude";
  // Bildirim kartı (Windows/telefon bildirimi, yanıtlanabilir kart): üstüne gelince ada açılmaz, kart büyüyüp
  // tam metni gösterir. Diğer kartlar ("Üstüme gel" teklifleri, sistem olayları) eskisi gibi adayı açar.
  if (s.toasts.length && holdsOnHover(s.toasts[0]) && !s.pinned && !s.grabbed && !s.holds.length) {
    return "toast";
  }
  if (s.hovered || s.grabbed || s.pinned || s.holds.length) return "expanded";
  if (s.toasts.length) return "toast";
  if (s.osd) return "osd";
  return "collapsed";
}

/** Üstüne gelinince kapanmayıp büyüyen kartlar */
export function holdsOnHover(t: State["toasts"][number]): boolean {
  return t.kind === "notify" || !!t.replyKey || !!t.whatsappChat;
}

export function useIslandMode(): IslandMode {
  return useNook(islandModeOf);
}
