/**
 * Nook'un adadan dışarı çıkışları:
 *  - Tüneme: ara sıra öndeki pencerenin başlık çubuğuna atlayıp oturur (ayrı, tıklama-geçirgen pencere)
 *  - Sarkma: ekranın altında uzun süre çalışınca adanın altından iple sarkıp izler (Outings/Dangle)
 *  - Balık: bilgisayar boştayken adanın kenarında masaüstüne olta sallar (Outings/Fishing)
 * Ada açılınca, bir kart gelince ya da sen dönünce Nook hemen yerine döner.
 */
import { emit } from "@tauri-apps/api/event";
import { playAntic } from "../hooks/useAntics";
import { EVENTS, inTauri, perchStart, perchStop } from "./bridge";
import { isWorking, useNook, type Outing } from "../store/nook";

/** Son dışarı çıkış (her biri için) — sık sık olmasın */
const last: Record<Outing, number> = { perch: Date.now(), hang: 0, fish: 0 };
export const COOLDOWN: Record<Outing, number> = { perch: 14 * 60_000, hang: 6 * 60_000, fish: 0 };

let perchTimer = 0;

/** Ada kapalı, sakin; Nook dışarı çıkabilir mi */
export function canGoOut(kind: Outing) {
  const s = useNook.getState();
  return (
    s.settings.outings &&
    !s.outing &&
    !s.fullscreen &&
    !s.intro &&
    !s.tour &&
    !s.ringing &&
    !s.guard &&
    !s.reminder &&
    !s.listening &&
    !s.grabbed &&
    s.mood === "idle" &&
    !isWorking(s) &&
    Date.now() - last[kind] >= COOLDOWN[kind]
  );
}

export function startOuting(kind: Outing) {
  last[kind] = Date.now();
  useNook.getState().setOuting(kind);
}

/** Öndeki pencereye tünemeyi dene; olmazsa (masaüstü, tam ekran) sessizce vazgeç */
export async function tryPerch(stayMs = 50_000 + Math.random() * 50_000) {
  if (!canGoOut("perch")) return false;
  last.perch = Date.now();
  const ok = await perchStart().catch(() => false);
  if (!ok) return false;
  // Arada bir şey olduysa (ada açıldı) hemen geri dön
  if (useNook.getState().outing) {
    void perchStop();
    return false;
  }
  useNook.getState().setOuting("perch");
  window.clearTimeout(perchTimer);
  perchTimer = window.setTimeout(endPerch, stayMs);
  return true;
}

/** Tünekten adaya dön: tünekteki Nook zıplar, ada kendi Nook'unu geri getirir */
export function endPerch() {
  window.clearTimeout(perchTimer);
  if (useNook.getState().outing !== "perch") return;
  if (inTauri) void emit(EVENTS.perchLeave);
  else perchReturned();
}

/** Tünek bitti (ada ya da Rust bitirdi): pencere zıplama animasyonundan sonra kapanır */
export function perchReturned() {
  window.clearTimeout(perchTimer);
  if (useNook.getState().outing === "perch") {
    useNook.getState().setOuting(null);
    window.setTimeout(() => playAntic("hop"), 250);
  }
  window.setTimeout(() => void perchStop(), 450);
}

/** Sen yokken balıkta tutulanlar — dönünce anlatır */
export const haul = { stars: 0, trash: 0 };

export function haulText() {
  const parts = [haul.stars && `${haul.stars} parlak yıldız`, haul.trash && `${haul.trash} eski dosya`].filter(Boolean);
  return parts.join(", ");
}
