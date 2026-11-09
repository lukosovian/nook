import { useEffect } from "react";
import { argusAddSong, EVENTS, inTauri, isPrimary, songToast, subscribe } from "../lib/bridge";
import { epLabel, findItem, useArgus, EXTRA } from "../lib/argus";
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
    const offFound = subscribe<{ track: HumTrack; auto: boolean; agoMs?: number | null; phone?: boolean }>(EVENTS.humFound, ({ track, auto, agoMs, phone }) => {
      useNook.getState().addHum({ ...track, auto, phone });
      if (agoMs != null) void toArgus(track, agoMs).then((at) => fullscreenToast(track, at));
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
async function toArgus(track: HumTrack, agoMs: number): Promise<{ show: string; atMs: number } | null> {
  const s = useNook.getState();
  const live = useArgus.getState().live;
  const item = findItem(live?.itemId);
  if (!s.settings.humWatch || !live || !item) return null;
  const m = s.media;
  const mediaText = `${m?.title ?? ""} ${m?.artist ?? ""}`;
  // Başlıkta sahne, kesit, klip, derleme vb. varsa şarkıyı Argus bölümüne ekleme
  if (EXTRA.test(mediaText)) return null;
  const ep = live.season && live.episode ? { season: live.season, episode: live.episode } : null;
  // Dizilerde kesin sezon/bölüm numarası olmadan şarkı rastgele bölüme (1. bölüme) eklenmesin
  if (item.series && !ep) return null;
  const timeline = !!m && m.durationMs > 0 && m.positionMs > 0;
  const pos = timeline ? m.positionMs + (m.playing ? performance.now() - m.at : 0) : live.playedMs;
  const atMs = Math.max(0, Math.round(pos - agoMs));
  try {
    // İzlerken kart çıkmaz (bölüm boyunca art arda gelip rahatsız ediyordu); şarkı sessizce Müzikler'e yazılır
    await argusAddSong(item.id, ep?.season ?? null, ep?.episode ?? null, atMs, !timeline, track);
    return { show: ep ? `${item.title} ${epLabel(ep)}` : item.title, atMs };
  } catch (e) {
    const old = String(e) === "old";
    if (old && oldArgusWarned) return null;
    oldArgusWarned ||= old;
    s.pushToast({
      kind: "argus",
      title: tt("Şarkı Argus'a yazılamadı"),
      detail: old ? tt("Argus'u güncelle: Müzikler listesi yeni sürümde") : String(e),
      ms: 6000,
    });
    return null;
  }
}

/** İzlerken bulunan şarkı videonun ekranının sol altında kısa bir çubukla görünür */
function fullscreenToast(track: HumTrack, at: { show: string; atMs: number } | null) {
  const s = useNook.getState();
  // Hangi ekranda çıkacağına Rust bakar (tam ekran video, yoksa öndeki pencere)
  if (!s.settings.humToast) return;
  void songToast({
    id: Date.now(),
    title: track.title,
    artist: track.artist,
    cover: track.cover ?? null,
    show: at?.show ?? null,
    minute: at ? Math.floor(at.atMs / 60_000) : null,
  }).catch(() => {});
}
