import { useEffect } from "react";
import { argusAddSong, EVENTS, inTauri, isPrimary, subscribe } from "../lib/bridge";
import { epLabel, findItem, useArgus } from "../lib/argus";
import { DJ_MOVES, humCancel, humListen, humWatching, type HumTrack } from "../lib/hum";
import { tt } from "../lib/i18n";
import { useNook } from "../store/nook";

/** Sonuç kartı ekranda bu kadar kalır (yalnızca görünürken sayılır) */
const FOUND_MS = 10_000;
const MISS_MS = 3800;

let lastMove = -1;

/** Hum'u başlat; zaten dinliyorsa vazgeç. */
export async function toggleHum() {
  const s = useNook.getState();
  if (s.hum?.phase === "listening") {
    void humCancel();
    return;
  }
  // Her seferinde bir öncekinden farklı bir hareket
  let move = Math.floor(Math.random() * DJ_MOVES.length);
  if (move === lastMove) move = (move + 1 + Math.floor(Math.random() * (DJ_MOVES.length - 1))) % DJ_MOVES.length;
  lastMove = move;
  s.setHum({ phase: "listening", move });
  const out = await humListen().catch((e) => ({ status: "error" as const, message: String(e) }));
  const st = useNook.getState();
  switch (out.status) {
    case "found":
      st.addHum({ ...out.track, auto: false });
      // Elle Hum en fazla 12 sn'lik sesle tanır
      void toArgus(out.track, 12_000);
      st.setHum({ phase: "found", move, track: out.track });
      break;
    case "cancelled":
      st.setHum(null);
      break;
    case "error":
      st.setHum({ phase: "error", move, message: out.message });
      break;
    default:
      st.setHum({ phase: out.status, move });
  }
}

/** Kısayol (Rust) ve otomatik Hum'un bulduklarını dinler; sonuç kartını süresi dolunca kapatır. */
export function useHum() {
  useEffect(() => {
    if (!isPrimary) return;
    const offToggle = subscribe(EVENTS.humToggle, () => void toggleHum());
    const offFound = subscribe<{ track: HumTrack; auto: boolean; agoMs?: number | null }>(EVENTS.humFound, ({ track, auto, agoMs }) => {
      useNook.getState().addHum({ ...track, auto });
      if (agoMs != null) void toArgus(track, agoMs);
    });
    return () => {
      offToggle();
      offFound();
    };
  }, []);

  // İzlerken Hum: Argus'taki bir dizi/film çalarken arkada dinlesin
  const watch = useNook((s) => s.settings.humWatch);
  const live = useArgus((s) => !!s.live);
  useEffect(() => {
    if (!isPrimary || !inTauri) return;
    void humWatching(watch && live).catch(() => {});
  }, [watch, live]);

  const phase = useNook((s) => s.hum?.phase);
  const visible = useNook((s) => !s.fullscreen && !s.ringing);
  useEffect(() => {
    if (!phase || phase === "listening" || !visible) return;
    const t = window.setTimeout(() => useNook.getState().setHum(null), phase === "found" ? FOUND_MS : MISS_MS);
    return () => window.clearTimeout(t);
  }, [phase, visible]);
}

/** "Argus güncel değil" bir kez söylensin */
let oldArgusWarned = false;

/**
 * İzlerken Hum: bulunan şarkıyı, çalan Argus içeriğinin Müzikler listesine kaçıncı dakikada çaldığıyla
 * yazar. `agoMs`: tanınan sesin başı kaç ms önceydi. Oynatıcı konum vermiyorsa (bazı siteler) dakika,
 * Nook'un saydığı izleme süresinden tahmin edilir.
 */
async function toArgus(track: HumTrack, agoMs: number) {
  const s = useNook.getState();
  const live = useArgus.getState().live;
  const item = findItem(live?.itemId);
  if (!s.settings.humWatch || !live || !item) return;
  const m = s.media;
  const timeline = !!m && m.durationMs > 0 && m.positionMs > 0;
  const pos = timeline ? m.positionMs + (m.playing ? performance.now() - m.at : 0) : live.playedMs;
  const atMs = Math.max(0, Math.round(pos - agoMs));
  const ep = live.season && live.episode ? { season: live.season, episode: live.episode } : null;
  try {
    const r = await argusAddSong(item.id, ep?.season ?? null, ep?.episode ?? null, atMs, !timeline, track);
    if (r.duplicate) return;
    const t = Math.floor(atMs / 1000);
    const at = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
    s.pushToast({
      kind: "argus",
      title: `${track.title} · ${track.artist}`,
      detail: tt("{0} · {1} · Argus'a eklendi", ep ? `${item.title} ${epLabel(ep)}` : item.title, `${timeline ? "" : "~"}${at}`),
      icon: track.cover ?? null,
      ms: 5000,
    });
  } catch (e) {
    const old = String(e) === "old";
    if (old && oldArgusWarned) return;
    oldArgusWarned ||= old;
    s.pushToast({
      kind: "argus",
      title: tt("Şarkı Argus'a yazılamadı"),
      detail: old ? tt("Argus'u güncelle: Müzikler listesi yeni sürümde") : String(e),
      ms: 6000,
    });
  }
}
