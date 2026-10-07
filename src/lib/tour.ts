/**
 * "Nook nedir?" tanıtımı: pencere önce büyür, sonra ada ekrana yayılır.
 * Kapanırken tersi: ada küçülür, animasyon bitince pencere eski boyutuna döner.
 */
import { setWindowSize } from "./bridge";
import { latestNote } from "./notes";
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
    ...SHOWCASE.map((m) => ({ look: m.look, color: m.color, size: figureRes(m.size) })),
    ...TOUR_CHIPS.map((c) => ({ look: c.look, color: c.body, size: figureRes(20) })),
  ]);
  s.setBig(null);
  s.setHovered(false);
  s.setSearching(false);
  await setWindowSize(TOUR_WINDOW.width, TOUR_WINDOW.height).catch(() => undefined);
  useNook.getState().setTour(true);
}

export function endTour() {
  useNook.getState().setTour(false);
  // Yeni kullanıcı tanıtımda zaten her şeyi gördü: mevcut yama notu ona ayrıca açılmasın
  if (!useNook.getState().notesSeen) useNook.getState().setNotesSeen(latestNote().version);
  window.clearTimeout(shrinkTimer);
  shrinkTimer = window.setTimeout(() => {
    if (!useNook.getState().tour && !useNook.getState().brief && !useNook.getState().notes && !useNook.getState().report) void setWindowSize().catch(() => undefined);
  }, SHRINK_AFTER_MS);
}
