import { useEffect } from "react";
import { clearBackground, EVENTS, guardAlert, isPrimary, subscribe, type ForegroundPayload } from "../lib/bridge";
import { matchSite } from "../lib/guard";
import { canGoOut, endPerch, haul, haulText, perchReturned, startOuting, tryPerch } from "../lib/outings";
import { isSleeping, isWorking, useNook } from "../store/nook";
import { playAntic } from "./useAntics";
import { islandModeOf } from "./useIslandMode";
import { tt } from "../lib/i18n";

/** Tüneme için dakikada bir zar atılır (bekleme süresi dolduysa) */
const PERCH_CHANCE = 0.3;
/** Balık en fazla bu kadar sürer, sonra Nook uyuyakalır */
const FISH_MAX = 12 * 60_000;

/**
 * Nook'un dışarı çıkışlarını yönetir (yalnızca ana ada): ara sıra pencereye tüner, ekranın altında
 * uzun süre çalışınca iple sarkar, sen yokken balık tutar. Ada açılınca, kart gelince ya da
 * Pomodoro başlayınca hemen yerine döner.
 */
export function useOutings() {
  useEffect(() => {
    if (!isPrimary) return;
    let fishTimer = 0;

    const tick = window.setInterval(() => {
      const s = useNook.getState();
      if (islandModeOf(s) !== "collapsed" || s.asleep || isSleeping(s)) return;
      if (Math.random() < PERCH_CHANCE) void tryPerch();
    }, 60_000);

    const offLeave = subscribe(EVENTS.perchLeave, perchReturned);

    const offLow = subscribe<boolean>(EVENTS.lowWork, (on) => {
      const s = useNook.getState();
      if (on) {
        if (islandModeOf(s) === "collapsed" && canGoOut("hang")) startOuting("hang");
      } else if (s.outing === "hang") {
        s.setOuting(null);
      }
    });

    const offIdle = subscribe<boolean>(EVENTS.idle, (asleep) => {
      const s = useNook.getState();
      if (asleep) {
        if (s.outing === "hang") s.setOuting(null);
        if (s.media?.playing || islandModeOf(s) !== "collapsed" || !canGoOut("fish")) return;
        haul.stars = 0;
        haul.trash = 0;
        startOuting("fish");
        window.clearTimeout(fishTimer);
        fishTimer = window.setTimeout(() => {
          if (useNook.getState().outing === "fish") useNook.getState().setOuting(null);
        }, FISH_MAX);
        return;
      }
      window.clearTimeout(fishTimer);
      if (s.outing === "fish") s.setOuting(null);
      // Dönünce: "hoş geldin" kartından sonra neler tuttuğunu anlatır
      const text = haulText();
      if (text) {
        haul.stars = 0;
        haul.trash = 0;
        window.setTimeout(() => {
          const c = useNook.getState().catches;
          useNook.getState().pushToast({ kind: "fish", title: tt("Sen yokken balık tuttum!"), detail: tt("{0} · toplam {1} yıldız", text, c.stars), ms: 6000 });
          playAntic("giggle");
        }, 1800);
      }
    });

    // Dışarı çıkış bitince adanın zemini yenilenir: tünek penceresi kapanırken ya da boştayken ekran
    // uyuyup uyanınca WebView2 adanın arkasını beyaza boyayabiliyordu
    const unsubBg = useNook.subscribe((st, prev) => {
      if (prev.outing && !st.outing) {
        void clearBackground().catch(() => {});
        window.setTimeout(() => void clearBackground().catch(() => {}), 900);
      }
    });
    const onWake = () => {
      if (document.visibilityState === "visible") void clearBackground().catch(() => {});
    };
    document.addEventListener("visibilitychange", onWake);

    // Ada başka bir hâle geçince (açıldı, kart geldi, Pomodoro başladı) Nook hemen döner
    const unsub = useNook.subscribe((st) => {
      if (!st.outing) return;
      if (islandModeOf(st) === "collapsed" && !st.fullscreen && !isWorking(st) && st.settings.outings) return;
      if (st.outing === "perch") endPerch();
      else st.setOuting(null);
    });

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(fishTimer);
      offLeave();
      offLow();
      offIdle();
      unsub();
      unsubBg();
      document.removeEventListener("visibilitychange", onWake);
    };
  }, []);
}

/** Bu kadar süre yasaklı yerde kalınca uyarır (Alt-Tab ile geçip dönmek sayılmaz) */
const GUARD_AFTER = 1500;
const SNOOZE = 5 * 60_000;

/** "5 dk izin" / "Bu turda değil" */
let snoozeUntil = 0;
let offPhase = "";
const phaseKey = () => {
  const f = useNook.getState().focus;
  return f ? `${f.phase}:${f.round}:${f.total}` : "";
};

export function snoozeGuard() {
  snoozeUntil = Date.now() + SNOOZE;
  clearGuard(false);
  playAntic("nod");
}

export function muteGuardForPhase() {
  offPhase = phaseKey();
  clearGuard(false);
  playAntic("bored");
}

function clearGuard(praise: boolean) {
  const s = useNook.getState();
  if (!s.guard) return;
  s.setGuard(null);
  void guardAlert(false);
  if (praise) {
    s.pushToast({ kind: "guard", title: tt("Aferin, işine döndün"), detail: tt("Saat işliyor, devam!"), ms: 3500 });
    s.care(1);
    playAntic("love");
  }
}

/**
 * Odak bekçisi: Pomodoro'nun çalışma fazında öndeki pencere listedeki bir site/uygulamaysa ada açılır,
 * Nook cama vurup saati gösterir. Oradan çıkınca kendiliğinden kapanır ve Nook seni över.
 */
export function useFocusGuard() {
  useEffect(() => {
    if (!isPrimary) return;
    let fg: ForegroundPayload | null = null;
    let since = 0;

    const check = () => {
      const s = useNook.getState();
      const on = s.settings.focusGuard && isWorking(s) && Date.now() >= snoozeUntil && offPhase !== phaseKey();
      const site = on ? matchSite(fg, s.settings.focusSites) : null;
      if (!site) {
        since = 0;
        if (s.guard) clearGuard(isWorking(s) && s.settings.focusGuard && Date.now() >= snoozeUntil && offPhase !== phaseKey());
        return;
      }
      if (s.guard) {
        if (s.guard.site !== site) s.setGuard({ site });
        return;
      }
      since ||= Date.now();
      if (Date.now() - since < GUARD_AFTER) return;
      s.setGuard({ site });
      void guardAlert(true);
    };

    const off = subscribe<ForegroundPayload>(EVENTS.foreground, (p) => {
      fg = p;
      check();
    });
    const t = window.setInterval(check, 1000);
    return () => {
      off();
      window.clearInterval(t);
      void guardAlert(false);
    };
  }, []);
}
