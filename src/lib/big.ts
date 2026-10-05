/**
 * Açık adanın "tam ekran" hâli: pencere ekran boyuna büyür, ada ekrana yayılır; kartlar, yazılar ve
 * Nook orantılı büyür. Ada kapanınca (imleç çıkınca), Esc'e ya da düğmeye basınca eski hâline döner.
 */
import { setWindowSize } from "./bridge";
import { BIG_MAX, BIG_WINDOW } from "./layout";
import { useNook } from "../store/nook";

/** Ada küçülme animasyonu bitmeden pencere küçülmesin (tanıtımdaki gibi) */
const SHRINK_AFTER_MS = 700;
let shrinkTimer = 0;

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

/** Pencerenin şu anki boyutuna göre adanın tam ekran ölçüsü (kenarlarda gölge payı kalır) */
function measure() {
  return {
    width: Math.round(Math.min(BIG_MAX.width, window.innerWidth - 56)),
    height: Math.round(Math.min(BIG_MAX.height, window.innerHeight - 48)),
  };
}

export async function enterBig() {
  window.clearTimeout(shrinkTimer);
  await setWindowSize(BIG_WINDOW.width, BIG_WINDOW.height).catch(() => undefined);
  // Pencerenin yeni boyutu sayfaya bir iki karede yansır
  await nextFrame();
  useNook.getState().setBig(measure());
}

export function exitBig() {
  const s = useNook.getState();
  if (!s.big) return;
  s.setBig(null);
  window.clearTimeout(shrinkTimer);
  shrinkTimer = window.setTimeout(() => {
    const st = useNook.getState();
    if (!st.big && !st.tour && !st.brief && !st.notes) void setWindowSize().catch(() => undefined);
  }, SHRINK_AFTER_MS);
}

export const toggleBig = () => (useNook.getState().big ? exitBig() : void enterBig());

// Ekran çözünürlüğü değişirse (ya da pencere geç büyürse) ölçüyü tazele
window.addEventListener("resize", () => {
  if (useNook.getState().big) useNook.getState().setBig(measure());
});
