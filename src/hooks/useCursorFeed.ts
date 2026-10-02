import { useEffect } from "react";
import { EVENTS, subscribe, type CursorPayload } from "../lib/bridge";
import { cursorX, cursorY, FAR } from "../lib/cursor";
import { isSleeping, useNook } from "../store/nook";
import { playAntic } from "./useAntics";

/** Niyet gecikmeleri: ekranın tepesinden geçerken ada yanlışlıkla açılmasın. */
const HOVER_IN_MS = 70;
const HOVER_OUT_MS = 320;
/** Ada açılınca Nook selam verir — ama sık sık değil. */
const GREET_EVERY_MS = 20_000;

export function useCursorFeed() {
  useEffect(() => {
    let inside = false;
    let timer: number | undefined;
    let greeted = 0;

    const off = subscribe<CursorPayload>(EVENTS.cursor, (p) => {
      cursorX.set(p.near ? p.x : FAR);
      cursorY.set(p.near ? p.y : FAR);

      if (p.inside === inside) return;
      inside = p.inside;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const s = useNook.getState();
        // Nook tutulup sürüklenirken imleç adadan çıksa da ada kapanmasın
        if (!inside && s.grabbed) return;
        s.setHovered(inside);
        if (inside && s.mood === "idle" && !isSleeping(s) && Date.now() - greeted > GREET_EVERY_MS) {
          greeted = Date.now();
          s.care(1);
          playAntic(s.affection < 25 ? "surprised" : "hop");
        }
      }, inside ? HOVER_IN_MS : HOVER_OUT_MS);
    });

    // Nook bırakıldığında imleç adanın dışındaysa adayı kapat
    const unsub = useNook.subscribe((st, prev) => {
      if (prev.grabbed && !st.grabbed && !inside) {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => useNook.getState().setHovered(false), HOVER_OUT_MS);
      }
    });

    return () => {
      off();
      unsub();
      window.clearTimeout(timer);
    };
  }, []);
}
