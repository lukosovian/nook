/**
 * Adanın solundaki ses kartı: Argus kartı gibi ayrı bir pencere (adanın içinde yer yok) ama
 * tıklanabilir. Ada açıkken görünür; üst çubuktaki hoparlörle ya da Ayarlar › Davranış'tan kapatılır.
 * Ada sürüklenince kart da gelir (Rust); ekranın solunda yer kalmazsa adanın sağına geçer (Argus kartı
 * da oradaysa onun ötesine).
 */
import { useEffect, useState } from "react";
import { emitTo, listen } from "@tauri-apps/api/event";
import { setHitExtra } from "../hooks/useHitRect";
import { useNook } from "../store/nook";
import { inTauri, isPrimary, sideCard, subscribe, type CardPlace } from "./bridge";
import { ISLAND, ISLAND_TOP, type IslandMode } from "./layout";

const GAP = 10;
/** Kartın görünen boyutu (pencerede kenardan 6 px boşlukla) — açık adayla aynı boy */
export const SOUND_SIZE = { width: 288, height: ISLAND.expanded.height };
/** Pencerenin genişliği (src-tauri/src/argus.rs SOUND_W ile aynı) */
const WINDOW_W = 300;

export interface SoundCardData {
  visible: boolean;
  /** Ada üst kenardan ayrıysa kart da dört köşesi yuvarlak */
  detached: boolean;
  /** Kart adanın sağında (ekranın solunda yer yok) */
  right?: boolean;
}

/**
 * Kart ile ada arasındaki alan dahil tıklama alanı (imleç karta geçerken ada kapanmasın).
 * `a`, `b`: kartın görünen kısmının solu ve sağı (ada penceresine göre).
 */
export function cardHit(a: number, b: number, height: number) {
  const islandL = window.innerWidth / 2 - ISLAND.expanded.width / 2;
  const islandR = window.innerWidth / 2 + ISLAND.expanded.width / 2;
  return a >= islandR - 1
    ? { x: islandR - 4, y: ISLAND_TOP, width: b + 6 - (islandR - 4), height: height + 6 }
    : { x: a - 6, y: ISLAND_TOP, width: islandL + 4 - (a - 6), height: height + 6 };
}

let last: SoundCardData = { visible: false, detached: false };
const send = (d: SoundCardData) => {
  last = d;
  return emitTo("sound-card", "nook://sound-card", d).catch(() => {});
};
if (isPrimary && inTauri) void listen("nook://sound-card-ready", () => void send(last));

export function useSoundCard(mode: IslandMode) {
  const on = useNook((s) => s.settings.soundCard);
  const fullscreen = useNook((s) => s.fullscreen);
  const big = useNook((s) => !!s.big);
  const detached = useNook((s) => (s.settings.islandPos?.fy ?? 0) > 0);
  const show = isPrimary && inTauri && on && mode === "expanded" && !fullscreen && !big;
  const [place, setPlace] = useState<CardPlace | null>(null);
  const right = !!place?.right;

  // Ada sürüklenince ya da Argus kartı gelip gidince kart yer değiştirirse (Rust taşır, burası tıklama
  // alanını ve köşeleri günceller)
  useEffect(() => (isPrimary && inTauri ? subscribe<CardPlace>("nook://sound-at", setPlace) : undefined), []);

  const left = window.innerWidth / 2 - ISLAND.expanded.width / 2 - GAP - WINDOW_W;
  const alt = window.innerWidth / 2 + ISLAND.expanded.width / 2 + GAP;
  useEffect(() => {
    if (!isPrimary || !inTauri) return;
    if (!show) {
      void send({ visible: false, detached });
      void sideCard(false, left, ISLAND_TOP, alt).catch(() => {});
      return;
    }
    void sideCard(true, left, ISLAND_TOP, alt)
      .then((p) => {
        setPlace(p);
        return send({ visible: true, detached, right: p.right });
      })
      .catch((e) => console.warn("[nook] ses kartı", e));
  }, [show, detached]);

  // İmleç karta (ve aradaki boşluğa) geçince ada kapanmasın
  useEffect(() => {
    if (!show || !place) return;
    if (last.visible && last.right !== right) void send({ ...last, right });
    // Sağdaysa kart penceresinin solunda, soldaysa sağında 6 px boşluk
    const a = right ? place.x + 6 : place.x + WINDOW_W - 6 - SOUND_SIZE.width;
    setHitExtra("sound", cardHit(a, a + SOUND_SIZE.width, SOUND_SIZE.height));
    return () => setHitExtra("sound", null);
  }, [show, place, right]);
}
