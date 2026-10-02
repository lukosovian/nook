import { useEffect } from "react";
import { isSleeping, SULK_BELOW, useNook, type Antic } from "../store/nook";

/** Her hareketin süresi (ms) — Nook bileşenindeki keyframe'lerle uyumlu. */
export const ANTIC_MS: Record<Antic, number> = {
  wink: 500,
  yawn: 1900,
  hum: 2800,
  hop: 750,
  wander: 4400,
  nod: 1700,
  stretch: 1400,
  giggle: 1200,
  surprised: 1100,
  love: 2600,
  dizzy: 2200,
  slap: 450,
  annoyed: 2200,
  shy: 2400,
  suspicious: 2600,
  bored: 3200,
};

let token = 0;

/** Bir hareketi oynat; süre dolunca (arada başkası başlamadıysa) temizle. */
export function playAntic(antic: Antic) {
  const mine = ++token;
  useNook.getState().setAntic(antic);
  window.setTimeout(() => {
    if (token === mine) useNook.getState().setAntic(null);
  }, ANTIC_MS[antic]);
}

type Weights = Partial<Record<Antic, number>>;

function pick(weights: Weights): Antic {
  const entries = Object.entries(weights) as [Antic, number][];
  let r = Math.random() * entries.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of entries) if ((r -= w) <= 0) return k;
  return entries[0][0];
}

const isNight = () => {
  const h = new Date().getHours();
  return h >= 0 && h < 5;
};

/**
 * Nook'un kendi başına yaşaması: boşta dururken 6–15 sn'de bir rastgele küçük bir şey yapar —
 * göz kırpar, esner, mırıldanır, zıplar, adada gezinir, gerinir, uyuklar.
 * Gece yarısından sonra daha uykulu; müzik çalarken daha çok mırıldanır.
 */
export function useAntics() {
  useEffect(() => {
    let timer = 0;

    const tick = () => {
      const s = useNook.getState();
      s.setNight(isNight());
      const free =
        s.mood === "idle" && !s.antic && !isSleeping(s) && !s.searching && !s.osd && !s.toasts.length && !s.relocating;

      // Küsken çoğu zaman kıpırdamaz
      const sulking = s.affection < SULK_BELOW && Math.random() < 0.75;
      if (free && !sulking) {
        const night = s.night;
        const playing = !!s.media?.playing;
        // Sevgi yüksekse daha neşeli, düşükse daha durgun
        const joy = s.affection / 100;
        const weights: Weights = {
          wink: 1 + joy * 2,
          yawn: night ? 4 : 1.2,
          hum: (playing ? 5 : 1.5) * (0.5 + joy),
          hop: (night ? 0.5 : 2) * (0.3 + joy),
          nod: night ? 3 : 0.8,
          stretch: 1.5,
          love: joy > 0.75 ? 1.2 : 0,
          shy: joy > 0.6 ? 0.8 : 0,
          suspicious: 1,
          // Uzun süre ilgilenilmezse sıkılır
          bored: Date.now() - s.lastCare > 20 * 60_000 ? 3 : 0.5,
        };
        // Gezinme yalnızca ada kapalıyken (panellerin üstünden geçmesin).
        if (!s.hovered) weights.wander = night ? 0.5 : 2;
        playAntic(pick(weights));
      }
      timer = window.setTimeout(tick, 6000 + Math.random() * 9000);
    };

    timer = window.setTimeout(tick, 4000);
    return () => window.clearTimeout(timer);
  }, []);
}
