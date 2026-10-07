/**
 * Şarkı sözleri (lrclib.net, ücretsiz, anahtarsız). Ayar açıkken çalan şarkının adı, sanatçısı,
 * albümü ve süresi lrclib'e gönderilir; zaman damgalı sözler varsa satır satır akar.
 * Sonuç şarkı başına bellekte tutulur; zamanlama kaydırması (öne / geri) şarkıya özeldir.
 */
import { useEffect, useState } from "react";
import { fetchText } from "./bridge";
import { useNook, type NowPlaying } from "../store/nook";

export interface LyricLine {
  /** Satırın başladığı an (ms) */
  at: number;
  text: string;
}

export type Lyrics =
  | { kind: "synced"; lines: LyricLine[] }
  | { kind: "plain"; text: string }
  | { kind: "instrumental" }
  | { kind: "none" };

const cache = new Map<string, Lyrics>();
const pending = new Map<string, Promise<Lyrics>>();
/** Şarkıya özel zamanlama kaydırması (ms; + sözleri öne alır) */
const offsets = new Map<string, number>();
const listeners = new Set<() => void>();

export const lyricOffset = (key: string) => offsets.get(key) ?? 0;
export function shiftLyrics(key: string, ms: number) {
  offsets.set(key, ms ? lyricOffset(key) + ms : 0);
  listeners.forEach((f) => f());
}

/** "[01:23.45] söz" → satırlar */
export function parseLrc(lrc: string): LyricLine[] {
  const out: LyricLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:[.,]\d+)?)\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, "").trim();
    for (const m of stamps) out.push({ at: Math.round((Number(m[1]) * 60 + Number(m[2].replace(",", "."))) * 1000), text });
  }
  return out.sort((a, b) => a.at - b.at);
}

const BROWSERS = /chrome|msedge|firefox|opera|brave|vivaldi/i;

/** Arama için temiz ad ve sanatçı: "(Official Video)", "- Remastered 2011", "feat." atılır; YouTube'da "Sanatçı - Şarkı" ayrılır */
export function cleanTrack(m: Pick<NowPlaying, "title" | "artist" | "app">): { title: string; artist: string } {
  let title = m.title;
  let artist = m.artist.replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").trim();
  if ((BROWSERS.test(m.app) || !artist) && title.includes(" - ")) {
    const [a, ...rest] = title.split(" - ");
    artist = a.trim();
    title = rest.join(" - ");
  }
  title = title
    .replace(/\s*[([](?:official|lyric|lyrics|audio|video|hd|4k|mv|visualizer|clip)[^)\]]*[)\]]/gi, "")
    .replace(/\s*[([](?:feat\.?|ft\.?|with)\s[^)\]]*[)\]]/gi, "")
    .replace(/\s+-\s+.*(?:remaster|version|edit|mix|live|mono|stereo).*$/i, "")
    .replace(/\s*\|.*$/, "")
    .trim();
  artist = artist.split(/,|&| x | feat\.? /i)[0].trim();
  return { title, artist };
}

function fromRecord(r: { syncedLyrics?: string | null; plainLyrics?: string | null; instrumental?: boolean } | null): Lyrics {
  if (!r) return { kind: "none" };
  if (r.instrumental) return { kind: "instrumental" };
  if (r.syncedLyrics) {
    const lines = parseLrc(r.syncedLyrics);
    if (lines.length) return { kind: "synced", lines };
  }
  if (r.plainLyrics?.trim()) return { kind: "plain", text: r.plainLyrics.trim() };
  return { kind: "none" };
}

async function load(m: NowPlaying): Promise<Lyrics> {
  const { title, artist } = cleanTrack(m);
  if (!title) return { kind: "none" };
  const q = (o: Record<string, string>) => new URLSearchParams(o).toString();
  const secs = Math.round(m.durationMs / 1000);
  // Önce tam eşleşme (süre ±2 sn), yoksa arama
  try {
    const exact = await fetchText(`https://lrclib.net/api/get?${q({ track_name: title, artist_name: artist, album_name: m.album, ...(secs ? { duration: String(secs) } : {}) })}`);
    const r = fromRecord(JSON.parse(exact));
    if (r.kind !== "none") return r;
  } catch {
    // 404: bulunamadı — aramaya geç
  }
  try {
    const list = JSON.parse(await fetchText(`https://lrclib.net/api/search?${q({ track_name: title, ...(artist ? { artist_name: artist } : {}) })}`)) as {
      syncedLyrics?: string | null;
      plainLyrics?: string | null;
      instrumental?: boolean;
      duration?: number;
    }[];
    // Süresi en yakın, zaman damgalı olan önce
    const best = [...list].sort((a, b) => Number(!b.syncedLyrics) - Number(!a.syncedLyrics) || Math.abs((a.duration ?? 0) - secs) - Math.abs((b.duration ?? 0) - secs))[0];
    return fromRecord(best ?? null);
  } catch {
    return { kind: "none" };
  }
}

/** Çalan şarkının sözleri; ayar kapalıysa null. `retry` yeniden dener. */
export function useLyrics(): { lyrics: Lyrics | null; loading: boolean; key: string; retry: () => void } {
  const enabled = useNook((s) => s.settings.lyrics);
  const media = useNook((s) => s.media);
  const key = media?.trackKey ?? "";
  const [, bump] = useState(0);
  useEffect(() => {
    const f = () => bump((n) => n + 1);
    listeners.add(f);
    return () => void listeners.delete(f);
  }, []);
  useEffect(() => {
    if (!enabled || !media || !key || cache.has(key) || pending.has(key)) return;
    const p = load(media).then((l) => {
      cache.set(key, l);
      pending.delete(key);
      listeners.forEach((f) => f());
      return l;
    });
    pending.set(key, p);
    listeners.forEach((f) => f());
  }, [enabled, key]);
  const retry = () => {
    cache.delete(key);
    bump((n) => n + 1);
    const m = useNook.getState().media;
    if (!m) return;
    const p = load(m).then((l) => {
      cache.set(key, l);
      pending.delete(key);
      listeners.forEach((f) => f());
      return l;
    });
    pending.set(key, p);
  };
  if (!enabled || !media) return { lyrics: null, loading: false, key, retry };
  return { lyrics: cache.get(key) ?? null, loading: pending.has(key), key, retry };
}

/** Şu anki satırın sırası (yoksa -1) */
export function lineAt(lines: LyricLine[], posMs: number) {
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].at <= posMs) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}
