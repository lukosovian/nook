/**
 * "Nook nedir?" tanıtımı: pencere önce büyür, sonra ada ekrana yayılır.
 * Kapanırken tersi: ada küçülür, animasyon bitince pencere eski boyutuna döner.
 */
import { setWindowSize } from "./bridge";
import { TOUR_WINDOW } from "./layout";
import { useNook } from "../store/nook";

/** Ada küçülme animasyonu bitmeden pencere küçülmesin */
const SHRINK_AFTER_MS = 700;
let shrinkTimer = 0;

export async function startTour() {
  window.clearTimeout(shrinkTimer);
  const s = useNook.getState();
  s.setHovered(false);
  s.setSearching(false);
  await setWindowSize(TOUR_WINDOW.width, TOUR_WINDOW.height).catch(() => undefined);
  useNook.getState().setTour(true);
}

export function endTour() {
  useNook.getState().setTour(false);
  window.clearTimeout(shrinkTimer);
  shrinkTimer = window.setTimeout(() => {
    if (!useNook.getState().tour) void setWindowSize().catch(() => undefined);
  }, SHRINK_AFTER_MS);
}
