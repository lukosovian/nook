/**
 * Günün özeti: pencere önce büyür, sonra ada açılır (tanıtımdaki gibi).
 * Üzerine gelinmezse bir süre sonra kendiliğinden kapanır; gelinirse imleç çıkınca kapanır.
 */
import { playAntic } from "../hooks/useAntics";
import { isPrimary, setWindowSize } from "./bridge";
import { TOUR_WINDOW } from "./layout";
import { dayKey, useNook } from "../store/nook";

/** Ada küçülme animasyonu bitmeden pencere küçülmesin */
const SHRINK_AFTER_MS = 700;
/** Hiç dokunulmazsa açık kalma süresi */
const AUTO_CLOSE_MS = 20_000;

let shrinkTimer = 0;
let closeTimer = 0;
let unsub: (() => void) | null = null;

export async function openBrief() {
  if (!isPrimary) return;
  const s = useNook.getState();
  if (s.brief || s.tour) return;
  window.clearTimeout(shrinkTimer);
  s.setSearching(false);
  s.setSummaryDay(dayKey());
  await setWindowSize(TOUR_WINDOW.width, TOUR_WINDOW.height).catch(() => undefined);
  const wasInside = useNook.getState().hovered;
  useNook.getState().setBrief(true);
  playAntic("hop");

  // İmleç içerideyken açıldıysa (Bugün çipi) ya da sonradan girdiyse: çıkınca kapan
  let entered = wasInside;
  window.clearTimeout(closeTimer);
  if (!entered) closeTimer = window.setTimeout(closeBrief, AUTO_CLOSE_MS);
  unsub?.();
  unsub = useNook.subscribe((st, prev) => {
    if (!st.brief) return;
    if (st.hovered && !prev.hovered) {
      entered = true;
      window.clearTimeout(closeTimer);
    } else if (!st.hovered && prev.hovered && entered && !st.holds.length) closeBrief();
    // Oyun başladı, alarm çaldı ya da arama açıldı
    if (st.fullscreen || st.ringing || st.searching) closeBrief();
  });
}

export function closeBrief() {
  window.clearTimeout(closeTimer);
  unsub?.();
  unsub = null;
  const s = useNook.getState();
  if (!s.brief) return;
  s.setBrief(false);
  window.clearTimeout(shrinkTimer);
  shrinkTimer = window.setTimeout(() => {
    const st = useNook.getState();
    if (!st.brief && !st.tour) void setWindowSize().catch(() => undefined);
  }, SHRINK_AFTER_MS);
}
