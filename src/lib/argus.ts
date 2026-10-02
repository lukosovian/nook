/**
 * Argus: kullanıcının dizi/film arşivi. Nook okur (Argus kapalıyken de), "İzledim"i Argus'un
 * kendi sunucusu üzerinden yazar (kapalıysa Rust görünmez açıp kapatır).
 *  - İzliyorum / takvim / ne izlesem
 *  - Bugün çıkan bölüm haberi (günde bir kez)
 *  - Tarayıcıda izlenen dizi/filmi tanıyıp "işaretleyeyim mi?" diye sorma
 * Argus olmayan bilgisayarda `snap` hep null kalır ve her şey gizlenir.
 */
import { useEffect } from "react";
import { create } from "zustand";
import { convertFileSrc } from "@tauri-apps/api/core";
import { playAntic } from "../hooks/useAntics";
import { argusMark, argusOpen, argusSnapshot, inTauri, isPrimary } from "./bridge";
import { dayKey, useNook } from "../store/nook";

export interface ArgusEp {
  season: number;
  episode: number;
  name: string;
  date: string | null;
}

export interface ArgusItem {
  id: string;
  title: string;
  original: string | null;
  status: string | null;
  kind: string | null;
  genres: string[];
  release: string | null;
  runtime: number | null;
  score: number | null;
  poster: string | null;
  recent: number | null;
  watchDates: string[];
  series: {
    aired: number;
    seen: number;
    next: ArgusEp | null;
    latest: ArgusEp | null;
    upcoming: ArgusEp[];
    lastSeen: string | null;
  } | null;
}

export interface ArgusSnapshot {
  profiles: string[];
  profile: string;
  profileId: string;
  boardId: string;
  running: boolean;
  items: ArgusItem[];
  episodeDays: Record<string, number>;
}

export interface ArgusSuggestion {
  itemId: string;
  season?: number;
  episode?: number;
}

interface ArgusState {
  snap: ArgusSnapshot | null;
  /** Şu an işaretlenen kaydın kimliği */
  busy: string | null;
  /** "Bitti mi? İşaretleyeyim mi?" teklifi */
  suggestion: ArgusSuggestion | null;
  /** Aramadan seçilen kayıt — panelde ayrıntısı açılır */
  focusId: string | null;
}

export const useArgus = create<ArgusState>(() => ({ snap: null, busy: null, suggestion: null, focusId: null }));

const REFRESH_MS = 60_000;
const NEWS_KEY = "nook-argus-news";
const lc = (s: string) => s.toLocaleLowerCase("tr");

// ------------------------------------------------------------------ okuma

export async function refreshArgus() {
  if (!inTauri) return;
  try {
    const snap = await argusSnapshot(useNook.getState().settings.argusProfile, dayKey());
    useArgus.setState({ snap });
  } catch (e) {
    console.warn("[nook] argus", e);
  }
}

export const posterSrc = (it: ArgusItem) => (it.poster && inTauri ? convertFileSrc(it.poster) : null);
export const epLabel = (e: { season: number; episode: number }) => `S${e.season}B${e.episode}`;
export const findItem = (id: string | null | undefined) => useArgus.getState().snap?.items.find((i) => i.id === id) ?? null;

const isStatus = (it: ArgusItem, s: string) => lc(it.status ?? "") === lc(s);

/** İzlemekte olduğun diziler: önce en son dokunulan */
export function watching(snap: ArgusSnapshot | null) {
  if (!snap) return [];
  const last = (i: ArgusItem) => Math.max(i.recent ?? 0, i.series?.lastSeen ? Date.parse(i.series.lastSeen) : 0);
  return snap.items.filter((i) => i.series && isStatus(i, "izleniyor")).sort((a, b) => last(b) - last(a));
}

/** Takip edilen (izlenen/izlenmiş) diziler — yeni bölüm haberleri için */
const tracked = (snap: ArgusSnapshot) => snap.items.filter((i) => i.series && (isStatus(i, "izleniyor") || isStatus(i, "izlendi")));

export interface CalendarEntry {
  item: ArgusItem;
  ep: ArgusEp;
  date: string;
}

/** Bugün çıkanlar + önümüzdeki iki hafta, tarihe göre */
export function calendar(snap: ArgusSnapshot | null): CalendarEntry[] {
  if (!snap) return [];
  const today = dayKey();
  const out: CalendarEntry[] = [];
  for (const item of tracked(snap)) {
    const s = item.series!;
    if (s.latest?.date === today) out.push({ item, ep: s.latest, date: today });
    for (const ep of s.upcoming) if (ep.date) out.push({ item, ep, date: ep.date });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.item.title.localeCompare(b.item.title, "tr"));
}

export const todayEpisodes = (snap: ArgusSnapshot | null) => calendar(snap).filter((c) => c.date === dayKey());

export function dayLabel(date: string) {
  const today = dayKey();
  const d = new Date(`${date}T12:00:00`);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date === today) return "Bugün";
  if (date === dayKey(tomorrow)) return "Yarın";
  return d.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });
}

/** Çıkmış mı (Argus'un "ne izlesem" kuralı: yayınlanmamışı önerme) */
const released = (it: ArgusItem) => (it.series ? it.series.aired > 0 : !!it.release && it.release <= dayKey());
const isSeries = (it: ArgusItem) => !!it.series || /dizi|show|yarışma/i.test(it.kind ?? "");

export interface PickFilter {
  kind?: "film" | "dizi" | "all";
  maxMinutes?: number | null;
  genre?: string | null;
}

/** İzleneceklerden, çıkmış olanlar */
export function pickPool(snap: ArgusSnapshot | null, f: PickFilter = {}) {
  if (!snap) return [];
  return snap.items.filter((it) => {
    if (!isStatus(it, "izlenecek") || !released(it)) return false;
    if (f.kind === "film" && isSeries(it)) return false;
    if (f.kind === "dizi" && !isSeries(it)) return false;
    if (f.maxMinutes && (!it.runtime || it.runtime > f.maxMinutes)) return false;
    if (f.genre && !it.genres.some((g) => lc(g).includes(lc(f.genre!)))) return false;
    return true;
  });
}

/** Son 7 günde izlenen bölüm ve film sayısı */
export function weekStats(snap: ArgusSnapshot | null) {
  if (!snap) return null;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return dayKey(d);
  });
  const episodes = days.reduce((a, d) => a + (snap.episodeDays[d] ?? 0), 0);
  const movies = snap.items.filter((i) => !i.series && i.watchDates.some((d) => days.includes(d))).length;
  return { episodes, movies };
}

// ------------------------------------------------------------------ eşleştirme

const norm = (s: string) =>
  ` ${lc(s)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `;

const EP_PATTERNS: RegExp[] = [
  /\bs(\d{1,2})\s*[:.\-]?\s*e(\d{1,3})\b/i,
  /\b(\d{1,2})x(\d{1,3})\b/i,
  /\bseason\s*(\d{1,2})\D{1,12}episode\s*(\d{1,3})/i,
  /(\d{1,2})\.?\s*sezon\D{1,10}(\d{1,3})\.?\s*b[öo]l[üu]m/i,
  /\bsezon\s*(\d{1,2})\D{1,10}b[öo]l[üu]m\s*(\d{1,3})/i,
];

export function parseEpisode(text: string): { season: number; episode: number } | null {
  for (const re of EP_PATTERNS) {
    const m = re.exec(text);
    if (m) return { season: Number(m[1]), episode: Number(m[2]) };
  }
  return null;
}

/** Ad (ya da orijinal ad) metnin içinde kelime olarak geçen en uzun kayıt */
export function matchTitle(snap: ArgusSnapshot | null, text: string, pool?: ArgusItem[]) {
  if (!snap || !text.trim()) return null;
  const hay = norm(text);
  let best: { item: ArgusItem; len: number } | null = null;
  for (const item of pool ?? snap.items) {
    for (const name of [item.title, item.original]) {
      if (!name) continue;
      const n = norm(name);
      if (n.trim().length < 3) continue;
      if (hay.includes(n) && (!best || n.length > best.len)) best = { item, len: n.length };
    }
  }
  return best?.item ?? null;
}

/** Çalan medya → Argus kaydı + bölüm */
export function matchMedia(snap: ArgusSnapshot | null, title: string, artist: string): ArgusSuggestion | null {
  if (!snap) return null;
  const text = `${title} ${artist}`;
  // İzlenen/izlenecek/yarım kalanlar; İzlendi olan filmler hariç (tekrar izleme nadiren işaretlenir)
  const pool = snap.items.filter((i) => !isStatus(i, "izlendi") || i.series);
  const item = matchTitle(snap, text, pool);
  if (!item) return null;
  if (!item.series) return { itemId: item.id };
  const ep = parseEpisode(text) ?? item.series.next;
  return ep ? { itemId: item.id, season: ep.season, episode: ep.episode } : null;
}

// ------------------------------------------------------------------ yazma

export async function markWatched(item: ArgusItem, ep?: { season: number; episode: number } | null) {
  if (useArgus.getState().busy) return;
  useArgus.setState({ busy: item.id });
  const s = useNook.getState();
  s.setBusy("argus", true);
  try {
    const r = await argusMark(item.id, dayKey(), ep?.season, ep?.episode);
    const what = ep ? `${item.title} ${epLabel(ep)}` : item.title;
    s.pushToast({
      kind: "argus",
      title: ep ? "İzlendi olarak işaretlendi" : "Film izlendi",
      detail: r.completed && ep ? `${item.title}: bütün bölümler bitti!` : what,
      ms: 4500,
    });
    playAntic(r.completed ? "love" : "nod");
    const sug = useArgus.getState().suggestion;
    if (sug?.itemId === item.id) useArgus.setState({ suggestion: null });
  } catch (e) {
    s.pushToast({ kind: "argus", title: "Argus'a yazılamadı", detail: String(e), ms: 6000 });
    playAntic("suspicious");
  } finally {
    useArgus.setState({ busy: null });
    s.setBusy("argus", false);
    await refreshArgus();
  }
}

export async function openArgus() {
  const opened = await argusOpen().catch(() => false);
  if (!opened) useNook.getState().pushToast({ kind: "argus", title: "Argus zaten açık", detail: "Görev çubuğundan geçebilirsin", ms: 3500 });
}

// ------------------------------------------------------------------ beslemeler

/** Özet: açılışta, dakikada bir ve profil değişince. Günde bir kez yeni bölüm haberi. */
export function useArgusFeed() {
  const profile = useNook((s) => s.settings.argusProfile);
  useEffect(() => {
    void refreshArgus().then(announceNews);
    const t = window.setInterval(() => void refreshArgus().then(announceNews), REFRESH_MS);
    return () => window.clearInterval(t);
  }, [profile]);
}

function announceNews() {
  if (!isPrimary) return;
  const s = useNook.getState();
  const snap = useArgus.getState().snap;
  if (!snap || !s.settings.argusNews || new Date().getHours() < 8) return;
  const today = dayKey();
  try {
    if (localStorage.getItem(NEWS_KEY) === today) return;
  } catch {
    return;
  }
  const eps = todayEpisodes(snap);
  if (!eps.length) return;
  try {
    localStorage.setItem(NEWS_KEY, today);
  } catch {
    /* önemsiz */
  }
  const first = eps[0];
  s.pushToast({
    kind: "argus",
    title: `Bugün yeni bölüm: ${first.item.title}`,
    detail: `${epLabel(first.ep)}${first.ep.name ? ` · ${first.ep.name}` : ""}${eps.length > 1 ? ` · +${eps.length - 1} dizi daha` : ""}`,
    ms: 8000,
  });
  playAntic("surprised");
}

const TICK_MS = 5000;
/** Süresi bilinmiyorsa en az bu kadar izlenmiş olmalı */
const MIN_EPISODE_MS = 15 * 60_000;
const MIN_MOVIE_MS = 45 * 60_000;
/** Duraklatıldıktan bu kadar sonra "bitti" sayılır */
const IDLE_END_MS = 3 * 60_000;

/**
 * Tarayıcıda/oynatıcıda çalan şeyi Argus'la eşleştirir. Yeterince izlenip bitince (ya da
 * uzun süre duraklatılınca, başka şeye geçilince) "işaretleyeyim mi?" diye sorar.
 */
export function useArgusDetect() {
  useEffect(() => {
    if (!isPrimary || !inTauri) return;
    let cur: { key: string; sug: ArgusSuggestion; played: number; duration: number; idleSince: number | null } | null = null;
    const asked = new Set<string>();
    let lastText = "";
    let lastMatch: ArgusSuggestion | null = null;

    const finish = () => {
      const c = cur;
      cur = null;
      if (!c || asked.has(c.key)) return;
      const item = findItem(c.sug.itemId);
      if (!item) return;
      const need = c.duration > 0 ? c.duration * 0.6 : item.series ? MIN_EPISODE_MS : MIN_MOVIE_MS;
      if (c.played < need) return;
      asked.add(c.key);
      useArgus.setState({ suggestion: c.sug });
      const s = useNook.getState();
      s.pushToast({
        kind: "argus",
        title: `${item.title}${c.sug.season ? ` ${epLabel(c.sug as { season: number; episode: number })}` : ""} bitti mi?`,
        detail: "Üstüme gel, Argus'a işaretleyeyim",
        ms: 9000,
      });
      s.setPendingTab("argus");
      playAntic("surprised");
    };

    const t = window.setInterval(() => {
      const s = useNook.getState();
      const snap = useArgus.getState().snap;
      if (!s.settings.argusDetect || !snap) return;
      const m = s.media;
      if (m?.playing) {
        const text = `${m.title}\n${m.artist}`;
        if (text !== lastText) {
          lastText = text;
          lastMatch = matchMedia(snap, m.title, m.artist);
        }
        const sug = lastMatch;
        const key = sug ? `${sug.itemId}:${sug.season ?? ""}:${sug.episode ?? ""}` : "";
        if (!sug) {
          if (cur) finish();
          return;
        }
        if (cur?.key !== key) {
          finish();
          cur = { key, sug, played: 0, duration: m.durationMs || 0, idleSince: null };
        }
        cur.played += TICK_MS;
        cur.idleSince = null;
        if (m.durationMs) cur.duration = m.durationMs;
        const pos = m.positionMs + (performance.now() - m.at);
        // Jenerik: %93'e gelince bitti say
        if (cur.duration && pos >= cur.duration * 0.93) finish();
      } else if (cur) {
        cur.idleSince ??= Date.now();
        if (!m || Date.now() - cur.idleSince > IDLE_END_MS) finish();
      }
    }, TICK_MS);
    return () => window.clearInterval(t);
  }, []);
}
