import { useEffect } from "react";
import { EVENTS, isPrimary, releaseFocus, setInteractive, subscribe } from "../lib/bridge";
import { startTour } from "../lib/tour";
import { checkUpdate, useUpdate } from "../lib/update";
import { tt } from "../lib/i18n";
import { isQuiet, useNook } from "../store/nook";
import { playAntic } from "./useAntics";

const QUIET_MS = 3600_000;

/** "1 saat sessiz" aç / kapat */
export function toggleQuiet() {
  const s = useNook.getState();
  if (isQuiet(s)) {
    s.updateSettings({ quietUntil: 0 });
    s.pushToast({ kind: "welcome", title: tt("Sessizlik bitti"), detail: tt("Kartlar ve hatırlatmalar geri geldi"), ms: 3500 });
    return;
  }
  // Kart, sessizlik başlamadan gösterilsin
  s.pushToast({ kind: "focus", title: tt("1 saat sessizim"), detail: tt("Alarmlar ve takvim yine çalar"), ms: 4000 });
  s.updateSettings({ quietUntil: Date.now() + QUIET_MS });
  playAntic("yawn");
}

/**
 * Tepsiden açılan ada: imleç tepside olduğundan "üstünde" sayılmaz, o yüzden tutulur. İmleç adaya
 * girip çıkınca, başka yere tıklanınca ya da Esc ile bırakılır.
 */
function openFromTray() {
  const s = useNook.getState();
  if (s.holds.includes("tray")) return;
  s.setHold("tray", true);
  let entered = s.hovered;
  const release = () => {
    unsub();
    window.removeEventListener("blur", release);
    window.removeEventListener("keydown", onKey);
    useNook.getState().setHold("tray", false);
    void setInteractive(false);
    void releaseFocus();
  };
  const onKey = (e: KeyboardEvent) => e.key === "Escape" && release();
  const unsub = useNook.subscribe((st) => {
    if (st.hovered) entered = true;
    else if (entered) release();
  });
  window.addEventListener("blur", release);
  window.addEventListener("keydown", onKey);
}

/**
 * Tepsi menüsü (bkz. src-tauri/src/window.rs build_tray): adayı ortala, tanıtım, bir saat
 * sessizlik, güncelleme denetimi. "Çık" Rust'ta yapılır. Süresi dolan sessizlik
 * kendiliğinden kalkar (tepsideki yazı da geri döner).
 */
export function useTray() {
  // "Adayı aç" imlecin olduğu ekranın adasına gider ("Tüm ekranlar"da ana ada olmayabilir)
  useEffect(() => subscribe<string>(EVENTS.tray, (id) => id === "open" && openFromTray()), []);

  useEffect(() => {
    if (!isPrimary) return;
    return subscribe<string>(EVENTS.tray, (id) => {
      const s = useNook.getState();
      if (id === "center") {
        s.updateSettings({ islandPos: null });
      } else if (id === "tour") {
        if (!s.tour) void startTour();
      } else if (id === "quiet") {
        toggleQuiet();
      } else if (id === "update") {
        void checkUpdate(true).then(() => {
          const u = useUpdate.getState();
          // Yeni sürüm varsa kartı checkUpdate zaten gösterdi
          if (!u.available) useNook.getState().pushToast({ kind: "update", title: u.status || tt("Güncel"), detail: u.current ? tt("Sürüm {0}", u.current) : "", ms: 4000 });
        });
      }
    });
  }, []);

  const until = useNook((s) => s.settings.quietUntil ?? 0);
  useEffect(() => {
    if (!isPrimary || !until) return;
    const left = until - Date.now();
    const end = () => useNook.getState().updateSettings({ quietUntil: 0 });
    if (left <= 0) return end();
    const t = window.setTimeout(end, left);
    return () => window.clearTimeout(t);
  }, [until]);
}
