/**
 * "Nook nedir?" tanıtımı: pencere önce büyür, sonra ada ekrana yayılır.
 * Kapanırken tersi: ada küçülür, animasyon bitince pencere eski boyutuna döner.
 */
import { setWindowSize } from "./bridge";
import { TOUR_WINDOW } from "./layout";
import { useNook } from "../store/nook";
import { normalizeColor, normalizeLook, SHOWCASE, TOUR_CHIPS } from "./look";
import { prefetchBodies } from "./nook3d";
import { figureRes } from "../components/mascot/Figure";

/** Ada küçülme animasyonu bitmeden pencere küçülmesin */
const SHRINK_AFTER_MS = 700;
let shrinkTimer = 0;

export async function startTour() {
  window.clearTimeout(shrinkTimer);
  const s = useNook.getState();
  // Adımlardaki küçük Nook'lar ekrana girerken çizilip animasyonu takmasın
  const mine = { look: normalizeLook(s.settings.look), color: normalizeColor(s.settings.faceColor), size: figureRes(20) };
  prefetchBodies([
    mine,
    ...SHOWCASE.map((m, i) => ({ look: m.look, color: m.color, size: figureRes(i === 0 ? 92 : 46) })),
    ...TOUR_CHIPS.map((c) => ({ look: c.look, color: c.body, size: figureRes(20) })),
  ]);
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
