/**
 * Cadılar Bayramı (Halloween) Sezonu ve Etkinlikleri (25–31 Ekim).
 * - Tarih bazlıdır: 1 Kasım 00:00:00 olduğu an güncelleme gelmese bile otomatik kapanır.
 * - Ayarlardan kullanıcı tarafından istendiği an açılıp kapatılabilir.
 * - Şeker mi şaka mı (belirli aralıklarla kapı tıklatma ve soru), köşeden sarkan örümcek,
 *   balkabağı parıltısı ve cadı süpürgesi gezintilerini yönetir.
 */
import { create } from "zustand";
import { useNook, type Settings } from "../store/nook";
import { playSfx } from "./sfx";
import { playAntic } from "../hooks/useAntics";

/** 25 Ekim 00:00 - 31 Ekim 23:59:59 arası aktiftir. 1 Kasım'da kendiliğinden kapanır. */
export function isHalloweenSeason(): boolean {
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search);
    if (q.has("halloween")) return true;
  }
  const now = new Date();
  const month = now.getMonth(); // 9 = Ekim (0-indeksli)
  const date = now.getDate();
  return month === 9 && date >= 25 && date <= 31;
}

export function isHalloweenActive(settings?: Settings): boolean {
  const s = settings ?? useNook.getState().settings;
  return isHalloweenSeason() && s.halloweenSeason !== false;
}

export type TrickOrTreatPhase = "idle" | "knocking" | "asking" | "candy" | "trick";

interface HalloweenStore {
  phase: TrickOrTreatPhase;
  lastKnockAt: number;
  spiderHiding: boolean;
  setSpiderHiding: (h: boolean) => void;
  triggerKnock: () => void;
  openAsking: () => void;
  chooseCandy: () => void;
  chooseTrick: () => void;
  dismiss: () => void;
}

export const useHalloween = create<HalloweenStore>((set, get) => ({
  phase: "idle",
  lastKnockAt: Date.now(),
  spiderHiding: false,

  setSpiderHiding: (spiderHiding) => set({ spiderHiding }),

  triggerKnock: () => {
    if (get().phase !== "idle") return;
    set({ phase: "knocking", lastKnockAt: Date.now() });
    playSfx("attention", true);

    // 8 saniye boyunca yanıt verilmezse kendiliğinden susar
    window.setTimeout(() => {
      if (get().phase === "knocking") {
        set({ phase: "idle" });
      }
    }, 8000);
  },

  openAsking: () => {
    set({ phase: "asking" });
    playSfx("pop", true);
  },

  chooseCandy: () => {
    set({ phase: "candy" });
    playSfx("happy", true);
    // Keyif puanını artır
    const s = useNook.getState();
    s.care(15);
    s.setMood("happy");

    window.setTimeout(() => {
      set({ phase: "idle" });
    }, 3800);
  },

  chooseTrick: () => {
    set({ phase: "trick" });
    playSfx("found", true);
    playAntic("surprised");

    window.setTimeout(() => {
      set({ phase: "idle" });
    }, 3800);
  },

  dismiss: () => set({ phase: "idle" }),
}));
