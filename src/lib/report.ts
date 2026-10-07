/**
 * Karne büyük adada açılır (yama notları gibi): pencere büyür, ada 880×440'a yayılır.
 * İmleç içerideyken açılırsa çıkınca kapanır; hiç girilmezse bir süre sonra kendiliğinden kapanır.
 */
import { playAntic } from "../hooks/useAntics";
import { isPrimary, setWindowSize } from "./bridge";
import { TOUR_WINDOW } from "./layout";
import { useNook } from "../store/nook";

/** Ada küçülme animasyonu bitmeden pencere küçülmesin */
const SHRINK_AFTER_MS = 700;
/** Hiç dokunulmazsa açık kalma süresi */
const AUTO_CLOSE_MS = 30_000;

let shrinkTimer = 0;
let closeTimer = 0;
let unsub: (() => void) | null = null;

export async function openReport() {
  if (!isPrimary) return;
  const s = useNook.getState();
  if (s.tour || s.report) return;
  window.clearTimeout(shrinkTimer);
  s.setSearching(false);
  if (s.brief) s.setBrief(false);
  if (s.notes) s.setNotes(false);
  await setWindowSize(TOUR_WINDOW.width, TOUR_WINDOW.height).catch(() => undefined);
  const wasInside = useNook.getState().hovered;
  useNook.getState().setReport(true);
  playAntic("hop");

  let entered = wasInside;
  window.clearTimeout(closeTimer);
  if (!entered) closeTimer = window.setTimeout(closeReport, AUTO_CLOSE_MS);
  unsub?.();
  unsub = useNook.subscribe((st, prev) => {
    if (!st.report) return;
    if (st.hovered && !prev.hovered) {
      entered = true;
      window.clearTimeout(closeTimer);
    } else if (!st.hovered && prev.hovered && entered && !st.holds.length) closeReport();
    if (st.fullscreen || st.ringing || st.searching) closeReport();
  });
}

export function closeReport() {
  window.clearTimeout(closeTimer);
  unsub?.();
  unsub = null;
  const s = useNook.getState();
  if (!s.report) return;
  s.setReport(false);
  window.clearTimeout(shrinkTimer);
  shrinkTimer = window.setTimeout(() => {
    const st = useNook.getState();
    if (!st.brief && !st.tour && !st.notes && !st.report && !st.big) void setWindowSize().catch(() => undefined);
  }, SHRINK_AFTER_MS);
}
