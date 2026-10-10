/**
 * Argus: kullanıcının dizi/film arşivi. Nook okur (Argus kapalıyken de), "İzledim"i Argus'un
 * kendi sunucusu üzerinden yazar (kapalıysa Rust görünmez açıp kapatır).
 *  - İzliyorum / takvim / ne izlesem
 *  - Bugün çıkan bölüm haberi (günde bir kez)
 *  - Tarayıcıda izlenen dizi/filmi tanıyıp "işaretleyeyim mi?" diye sorma
 * Argus olmayan bilgisayarda `snap` hep null kalır ve her şey gizlenir.
 */
import { setHitExtra } from "../hooks/useHitRect";
import { useEffect } from "react";
import { create } from "zustand";
import { convertFileSrc } from "@tauri-apps/api/core";
import { playAntic } from "../hooks/useAntics";
import { open as pickFolder } from "@tauri-apps/plugin-dialog";
import { emitTo, listen } from "@tauri-apps/api/event";
import { argusCard, argusCheckDir, argusInstall, argusMark, argusOpen, argusSnapshot, argusTmdbAdd, argusTmdbSearch, inTauri, isPrimary } from "./bridge";
import type { IslandMode } from "./layout";
import { ISLAND, ISLAND_TOP } from "./layout";
import { cardHit } from "./soundCard";
import { dayKey, useNook } from "../store/nook";
import { locale } from "./i18n";
import { tt } from "./i18n";

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
  /** TMDB kimliği ("movie:123" / "tv:456") */
  tmdb?: string | null;
  series: {
    aired: number;
    seen: number;
    /** En son izlenen bölümün sırası */
    position: number;
    next: ArgusEp | null;
    latest: ArgusEp | null;
    upcoming: ArgusEp[];
    lastSeen: string | null;
    /** Bugün izlendi diye işaretlenmiş bölümler ("1-3") */
    seenToday: string[];
  } | null;
}

export interface ArgusSnapshot {
  profiles: string[];
  dir: string;
  profile: string;
  profileId: string;
  boardId: string;
  running: boolean;
  items: ArgusItem[];
  episodeDays: Record<string, number>;
  /** Durum seçenekleri, Argus'taki sırayla */
  statuses: string[];
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
  /** Şu an çalan ve Argus'la eşleşen şey: bugün ne kadar izlendi */
  live: ArgusLive | null;
  /** "Bu Argus'ta yok, ekleyeyim mi?" teklifi */
  fresh: ArgusFresh | null;
}

/** Çalan ama Argus'ta olmayan içerik (TMDB'de bulundu) */
export interface ArgusFresh {
  key: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  names: string[];
  year: string | null;
  poster: string | null;
  popularity: number;
}

export interface ArgusLive extends ArgusSuggestion {
  playedMs: number;
  needMs: number;
}

export const useArgus = create<ArgusState>(() => ({ snap: null, busy: null, suggestion: null, focusId: null, live: null, fresh: null }));

const REFRESH_MS = 60_000;
const NEWS_KEY = "nook-argus-news";
const lc = (s: string) => s.toLocaleLowerCase("tr");

// ------------------------------------------------------------------ okuma

export async function refreshArgus() {
  if (!inTauri) return;
  try {
    const st = useNook.getState().settings;
    const snap = await argusSnapshot(st.argusProfile, dayKey(), st.argusDir);
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
  if (date === today) return tt("Bugün");
  if (date === dayKey(tomorrow)) return tt("Yarın");
  return d.toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" });
}

/** Çıkmış mı — Argus'un "ne izlesem" kuralı: vizyon tarihi gelecekteyse önerme, tarihi boşsa öner */
const released = (it: ArgusItem) => {
  // Bölüm listesi var ama hiçbiri yayınlanmamış
  if (it.series && it.series.aired === 0 && it.series.upcoming.length > 0) return false;
  return !(it.release && /^\d{4}-\d{2}-\d{2}/.test(it.release) && it.release.slice(0, 10) > dayKey());
};
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

// Sezonsuz yazımlar ("Tuzlu Kahve 3. Bölüm", "Bölüm 3", "Episode 3") — Türk dizilerinde en yaygını
const BARE_EP_PATTERNS: RegExp[] = [
  /(\d{1,3})\.?\s*b[öo]l[üu]m/i,
  /\bb[öo]l[üu]m\s*(\d{1,3})\b/i,
  /\b(?:episode|ep\.?)\s*(\d{1,3})\b/i,
];

/** `season`: başlıkta sezon yazmıyorsa varsayılacak sezon */
export function parseEpisode(text: string, season = 1): { season: number; episode: number } | null {
  for (const re of EP_PATTERNS) {
    const m = re.exec(text);
    if (m) return { season: Number(m[1]), episode: Number(m[2]) };
  }
  for (const re of BARE_EP_PATTERNS) {
    const m = re.exec(text);
    if (m) return { season, episode: Number(m[1]) };
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

/** Kayıt + metindeki bölüm → öneri */
function suggestFor(item: ArgusItem, text: string): ArgusSuggestion | null {
  if (!item.series) return { itemId: item.id };
  const ep = parseEpisode(text, item.series.next?.season ?? item.series.latest?.season ?? 1) ?? item.series.next;
  return ep ? { itemId: item.id, season: ep.season, episode: ep.episode } : null;
}

/** Çalan medya → Argus kaydı + bölüm (yalnızca Argus'taki adlarla) */
export function matchMedia(snap: ArgusSnapshot | null, title: string, artist: string): ArgusSuggestion | null {
  if (!snap) return null;
  const text = `${title} ${artist}`;
  // Her durumdaki kayıt — İzlendi olanlar da (tekrar izleme)
  const item = matchTitle(snap, text);
  return item ? suggestFor(item, text) : null;
}

// Başlıktaki ad dışı kalıntılar: site, kalite, dublaj, bölüm yazıları
const SITES = /^(netflix|youtube|prime video|amazon prime video|disney|disney plus|hbo max|max|blutv|blu tv|exxen|gain|tabii|mubi|apple tv|tod|puhutv|twitch|vlc media player|mpv)$/;
const JUNK =
  / (izle|izleyin|full|hd|fhd|uhd|4k|1080p|720p|480p|turkce|dublaj|dublajli|altyazi|altyazili|tek|parca|online|watch|free|film|filmi|dizi|dizisi|sezon|bolum|season|episode|ep|part|official|resmi)(?= )/g;

/** Başlığı " | ", " - " gibi ayraçlardan böler, her parçayı yalın kelimelere indirir (site adları atılır) */
function segments(text: string) {
  return text
    .split(/\s[|•\-–—]\s|\s*\|\s*|\n/)
    .map((seg) => {
      let t = seg;
      for (const re of [...EP_PATTERNS, ...BARE_EP_PATTERNS]) t = t.replace(new RegExp(re.source, "gi"), " ");
      t = norm(t.replace(/\(\s*(19|20)\d\d\s*\)/g, " ")).replace(JUNK, " ").replace(JUNK, " ");
      return t.split(" ").filter(Boolean);
    })
    .filter((w) => w.length && !SITES.test(w.join(" ")));
}

/** İki adın benzerliği: ortak kelime / kelimesi çok olanın kelime sayısı (0–1) */
function similarity(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0;
  // "Son Havabükücü" = "Son Hava Bükücü"
  if (a.join("") === b.join("")) return 1;
  const sa = new Set(a);
  const sb = new Set(b);
  const common = [...sa].filter((w) => sb.has(w)).length;
  return common / Math.max(sa.size, sb.size);
}
const words = (s: string) => norm(s).trim().split(" ").filter(Boolean);

/** Kayıt adı başlığın bir parçasını ne kadar karşılıyor — "Avatar", "Avatar Son Hava Bükücü Aang" için zayıf */
function strength(item: ArgusItem, segs: string[][]) {
  let best = 0;
  for (const name of [item.title, item.original]) {
    if (!name) continue;
    const w = words(name);
    for (const seg of segs) best = Math.max(best, similarity(w, seg));
  }
  return best;
}

/** Adlar bu kadar tutuyorsa aynı içerik sayılır */
const SAME = 0.6;
const FRESH_SAME = 0.75;
/** Müzik uygulamaları TMDB'de aranmaz */
const MUSIC_APPS = /spotify|music|itunes|deezer|tidal|foobar|winamp|aimp|musicbee|soundcloud/i;
/** Sorgu → TMDB sonuçları; null: Argus'ta TMDB anahtarı yok */
const tmdbCache = new Map<string, Promise<ArgusFresh[] | null>>();

/** `nokey`: tanınamadı çünkü Argus'ta TMDB anahtarı yok */
export type MediaMatch = { sug: ArgusSuggestion | null; fresh: ArgusFresh | null; nokey?: boolean };

/** Başlıktaki yıl ("… (2026)", "… 2026") */
const yearOf = (text: string) => /\b(19[3-9]\d|20\d\d)\b/.exec(text)?.[1] ?? null;

/**
 * Çalan şeyi tanır. Argus'taki ad başlıkla iyi tutuyorsa doğrudan o; tutmuyorsa (ya da hiç yoksa)
 * TMDB'ye sorar: bulunan içerik Argus'taysa (TMDB kimliği ya da adıyla) o kayıt, değilse "fresh" —
 * "Argus'ta yok, ekleyeyim mi?". TMDB bir şey bulamazsa zayıf eşleşmeye düşer (eski davranış).
 */
export async function resolveMedia(snap: ArgusSnapshot, title: string, artist: string, app: string): Promise<MediaMatch> {
  const text = `${title} ${artist}`;
  const local = matchTitle(snap, text);
  let segs = segments(title);
  // Başlık yalnızca "Bölüm 3" gibiyse dizinin adı sanatçı alanındadır
  if (!segs.length) segs = segments(artist);
  const sure: MediaMatch = { sug: local ? suggestFor(local, text) : null, fresh: null };
  if (local && strength(local, segs.concat(segments(artist))) >= SAME) return sure;
  // Ad yalnızca benziyor ("Avatar" ⊂ "Avatar Aang: Son Havabükücü"): TMDB doğrulamazsa gösterilmez. Dizide
  // başlıkta bölüm yazıyorsa ("Lanterns S1E8 · Bölümün adı") yine de o dizi sayılır.
  const weak: MediaMatch = local?.series && parseEpisode(text) ? sure : { sug: null, fresh: null };
  if (MUSIC_APPS.test(app)) return weak;
  const year = yearOf(title);
  // Önce bütün parçalar ("Avatar: Son Hava Bükücü - Aang"), tutmazsa yalnızca ilki
  const queries = [segs.flat(), segs[0] ?? []].filter((q, i, all) => q.join(" ").length >= 3 && all.findIndex((x) => x.join(" ") === q.join(" ")) === i);
  let best: { h: ArgusFresh; sim: number } | undefined;
  for (const q of queries) {
    const query = q.join(" ");
    let p = tmdbCache.get(query);
    if (!p) {
      p = argusTmdbSearch(query, locale()).catch((e) => (String(e).includes("nokey") ? null : []));
      tmdbCache.set(query, p);
    }
    const hits = await p;
    if (!hits) return { ...weak, nokey: true };
    // Başlıktaki yıl tutan sonuç öne geçer (aynı adlı eski film/dizi yerine)
    const score = (x: { h: ArgusFresh; sim: number }) => x.sim + (year && x.h.year === year ? 0.3 : 0);
    best = hits
      .map((h) => ({ h, sim: Math.max(0, ...h.names.map((n) => similarity(words(n), q))) }))
      .filter((x) => x.sim >= SAME)
      .sort((a, b) => score(b) - score(a) || b.h.popularity - a.h.popularity)[0];
    if (best) break;
  }
  if (!best) return weak;
  const hit = best.h;
  const names = hit.names.map(norm);
  const known =
    snap.items.find((i) => i.tmdb === hit.key) ?? snap.items.find((i) => !i.tmdb && [i.title, i.original].some((n) => n && names.includes(norm(n))));
  if (known) return { sug: suggestFor(known, text), fresh: null };
  // TMDB başka bir şey buldu: zayıf yerel eşleşme ("Avatar") yanlıştı. Listede olmayanı önermek için ad
  // daha sıkı tutmalı ("Dune Part Two Review" gibi videolar sorulmasın)
  return { sug: null, fresh: best.sim >= FRESH_SAME || (year && hit.year === year) ? hit : null };
}

// ------------------------------------------------------------------ yazma

/** `status`: işaretlenecek durum (Argus'taki etiket); verilmezse filmde İzlendi, bölümde dokunulmaz */
export async function markWatched(item: ArgusItem, ep?: { season: number; episode: number } | null, status?: string) {
  if (useArgus.getState().busy) return;
  useArgus.setState({ busy: item.id });
  const s = useNook.getState();
  s.setBusy("argus", true);
  try {
    const r = await argusMark(item.id, dayKey(), ep?.season, ep?.episode, status);
    const what = `${ep ? `${item.title} ${epLabel(ep)}` : item.title}${status ? ` · ${status}` : ""}`;
    s.pushToast({
      kind: "argus",
      title: ep ? tt("Bölüm işaretlendi") : status ? tt("Argus'a yazıldı") : tt("Film izlendi"),
      detail: r.completed && ep ? tt("{0}: bütün bölümler bitti!", item.title) : what,
      ms: 4500,
    });
    playAntic(r.completed ? "love" : "nod");
    const sug = useArgus.getState().suggestion;
    if (sug?.itemId === item.id) answerSuggestion(sug);
  } catch (e) {
    s.pushToast({ kind: "argus", title: tt("Argus'a yazılamadı"), detail: String(e), ms: 6000 });
    playAntic("suspicious");
  } finally {
    useArgus.setState({ busy: null });
    s.setBusy("argus", false);
    await refreshArgus();
  }
}

const SKIP_KEY = "nook-argus-skip-new";
/** "Ekleme" denen içerikler (TMDB anahtarları) — bir daha sorulmaz */
function skipped(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SKIP_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/** "Argus'ta yok" teklifine hayır */
export function skipFresh(f: ArgusFresh | null = useArgus.getState().fresh) {
  if (!f) return;
  try {
    localStorage.setItem(SKIP_KEY, JSON.stringify([...skipped().filter((k) => k !== f.key), f.key].slice(-200)));
  } catch {
    /* önemsiz */
  }
  useArgus.setState({ fresh: null });
}

/** Çalan ama Argus'ta olmayan içeriği Argus'a ekler (İzlenecek; izleyince "bitti mi?" yine sorulur) */
export async function addFresh(f: ArgusFresh) {
  if (useArgus.getState().busy) return;
  useArgus.setState({ busy: f.key });
  const s = useNook.getState();
  s.setBusy("argus", true);
  try {
    await argusTmdbAdd(f.tmdbId, f.mediaType);
    s.pushToast({ kind: "argus", title: tt("Argus'a eklendi"), detail: tt("{0} · izleyince bitti mi diye sorarım", f.title), ms: 4500 });
    playAntic("love");
    useArgus.setState({ fresh: null });
  } catch (e) {
    s.pushToast({ kind: "argus", title: tt("Argus'a eklenemedi"), detail: String(e), ms: 6000 });
    playAntic("suspicious");
  } finally {
    useArgus.setState({ busy: null });
    s.setBusy("argus", false);
    await refreshArgus();
  }
}

/** Argus başka bir yerdeyse klasörünü elle seç */
export async function chooseArgusDir() {
  const s = useNook.getState();
  const picked = await pickFolder({ directory: true, title: tt("Argus klasörünü seç") }).catch(() => null);
  if (typeof picked !== "string") return;
  const dir = await argusCheckDir(picked).catch(() => null);
  if (!dir) {
    s.pushToast({ kind: "argus", title: tt("Burada Argus yok"), detail: tt("İçinde app ve data klasörleri olan Argus klasörünü seç"), ms: 6000 });
    playAntic("suspicious");
    return;
  }
  s.updateSettings({ argusDir: dir });
  await refreshArgus();
  if (useArgus.getState().snap) {
    s.pushToast({ kind: "argus", title: tt("Argus'u buldum!"), detail: dir, ms: 4500 });
    playAntic("love");
  }
}

/** Argus'un kurulum betiğini açar; kurulunca Nook dakikada bir yoklarken kendiliğinden bulur. */
export async function installArgus() {
  const s = useNook.getState();
  try {
    await argusInstall();
    s.pushToast({ kind: "argus", title: tt("Argus kuruluyor"), detail: tt("Açılan penceredeki adımları izle"), ms: 6000 });
    playAntic("hop");
  } catch (e) {
    s.pushToast({ kind: "argus", title: tt("Argus kurulamadı"), detail: String(e), ms: 6000 });
  }
}

export async function openArgus() {
  const opened = await argusOpen().catch(() => false);
  if (!opened) useNook.getState().pushToast({ kind: "argus", title: tt("Argus zaten açık"), detail: tt("Görev çubuğundan geçebilirsin"), ms: 3500 });
}

// ------------------------------------------------------------------ beslemeler

/** Özet: açılışta, dakikada bir ve profil değişince. Günde bir kez yeni bölüm haberi. */
export function useArgusFeed() {
  const profile = useNook((s) => s.settings.argusProfile);
  const dir = useNook((s) => s.settings.argusDir);
  useEffect(() => {
    void refreshArgus().then(announceNews);
    const t = window.setInterval(() => void refreshArgus().then(announceNews), REFRESH_MS);
    return () => window.clearInterval(t);
  }, [profile, dir]);
}

/** Bugünün bölümleri başka yerde (günün özeti) gösterildi — ayrıca haber kartı çıkmasın */
export function markNewsSeen() {
  try {
    localStorage.setItem(NEWS_KEY, dayKey());
  } catch {
    /* önemsiz */
  }
}

function announceNews() {
  if (!isPrimary) return;
  const s = useNook.getState();
  const snap = useArgus.getState().snap;
  if (!snap || !s.settings.argusNews || new Date().getHours() < 8) return;
  const today = dayKey();
  // Günün özeti henüz gösterilmediyse haberi o verecek
  if (s.settings.dailySummary && s.summaryDay !== today && new Date().getHours() >= 5) return;
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
    title: tt("Bugün yeni bölüm: {0}", first.item.title),
    detail: `${epLabel(first.ep)}${first.ep.name ? ` · ${first.ep.name}` : ""}${eps.length > 1 ? tt(" · +{0} dizi daha", eps.length - 1) : ""}`,
    ms: 8000,
  });
  playAntic("surprised");
}

const TICK_MS = 5000;
/**
 * Video tam ekrandayken Nook'un penceresi örtülür ve WebView2 zamanlayıcıları dakikada bire kadar
 * yavaşlatır; her tıkta sabit 5 sn eklemek 26 dk'yı 5 dk gösteriyordu. Tıklar arası gerçek süre
 * eklenir; uykudan dönüş gibi uzun boşluklar bu kadarla sınırlanır.
 */
const MAX_STEP_MS = 90_000;
/** Kullanıcının kendi kuralı: dizi/film 15 dk izlendiyse o güne yazılır (yüzdeye bakılmaz) */
const MIN_WATCH_MS = 15 * 60_000;
/** Argus'ta olmayan içerik bu kadar izlenince eklemeyi önerir */
const FRESH_AFTER_MS = 3 * 60_000;
/** Bundan kısa videolar (fragman, klip) için önerilmez */
const FRESH_MIN_LEN_MS = 15 * 60_000;
/** Durdurulunca hemen "bitti" sayılır — yalnızca yüklenme/reklam gibi anlık takılmalar için kısa pay */
const IDLE_END_MS = 8000;

/** Bugün bölüm/film başına oynatılan süre — Nook yeniden açılsa da, duraklatıp dönülse de kaybolmaz */
const PLAYED_KEY = "nook-argus-played";
/** `asked`: cevaplanan (işaretlenen ya da "hayır" denen) — bir daha sorulmaz. `lastAsk`: son soruda izlenen süre */
type PlayedStore = { day: string; ms: Record<string, number>; asked: string[]; lastAsk?: Record<string, number> };
/** Soru cevapsız kaldıysa: bu kadar daha izleyip durdurunca yeniden sor */
const REASK_AFTER_MS = 2 * 60_000;

function loadPlayed(): PlayedStore {
  try {
    const v = JSON.parse(localStorage.getItem(PLAYED_KEY) ?? "null") as PlayedStore | null;
    // Eski kayıtta "sorulan" = cevaplanmış sayılıyordu; cevapsızlar yeniden sorulabilsin (işaretlenenleri seenToday eler)
    if (v && v.day === dayKey()) return v.lastAsk ? v : { ...v, asked: [], lastAsk: {} };
  } catch {
    /* bozuksa sıfırdan */
  }
  return { day: dayKey(), ms: {}, asked: [] };
}

function savePlayed(p: PlayedStore) {
  try {
    localStorage.setItem(PLAYED_KEY, JSON.stringify(p));
  } catch {
    /* önemsiz */
  }
}

const sugKey = (sug: ArgusSuggestion) => `${sug.itemId}:${sug.season ?? ""}:${sug.episode ?? ""}`;

/** Bugünün izleme kaydı — tek kopya, cevaplar da buraya yazılır */
let playedStore: PlayedStore | null = null;
const currentPlayed = () => {
  if (!playedStore || playedStore.day !== dayKey()) playedStore = loadPlayed();
  return playedStore;
};

/** "Bitti mi?" sorusu cevaplandı (işaretlendi ya da hayır dendi) — bu bölüm için bir daha sorma */
export function answerSuggestion(sug: ArgusSuggestion | null = useArgus.getState().suggestion) {
  if (!sug) return;
  const store = currentPlayed();
  const key = sugKey(sug);
  if (!store.asked.includes(key)) store.asked.push(key);
  savePlayed(store);
  useArgus.setState({ suggestion: null });
}
// 15 dk'dan kısa bölümlerde neredeyse tamamı yeter
const needFor = (duration: number) => (duration > 0 ? Math.min(MIN_WATCH_MS, duration * 0.9) : MIN_WATCH_MS);

/**
 * Tarayıcıda/oynatıcıda çalan şeyi Argus'la eşleştirir. Yalnızca gerçekten oynarken geçen süre
 * sayılır (duraklatma sayılmaz, ileri sarma süre eklemez). 15 dk'yı geçmiş bir izleme bitince
 * (durdurulunca — beklemeden, başka şeye geçilince, jeneriğe gelince) "işaretleyeyim mi?" diye sorar.
 */
export function useArgusDetect() {
  useEffect(() => {
    if (!isPrimary || !inTauri) return;
    let store = currentPlayed();
    let cur: { key: string; sug: ArgusSuggestion; duration: number; idleSince: number | null } | null = null;
    let lastText = "";
    let lastSnap: ArgusSnapshot | null = null;
    let lastMatch: MediaMatch = { sug: null, fresh: null };
    let lastTick = Date.now();

    const played = (key: string) => store.ms[key] ?? 0;

    const finish = () => {
      const c = cur;
      cur = null;
      useArgus.setState({ live: null });
      if (c) ask(c);
    };

    /**
     * Süre dolduysa Argus'a yazmayı önerir. Cevaplandıysa bir daha sormaz; cevapsız kaldıysa
     * izlemeye devam edilip yeniden durdurulunca tekrar sorar.
     */
    const ask = (c: NonNullable<typeof cur>) => {
      if (store.asked.includes(c.key)) return;
      const prev = store.lastAsk?.[c.key];
      if (prev !== undefined && played(c.key) - prev < REASK_AFTER_MS) return;
      const item = findItem(c.sug.itemId);
      if (!item || played(c.key) < needFor(c.duration)) return;
      // Bu bölümü bugün Argus'ta zaten işaretlemiş — sormaya gerek yok
      if (c.sug.season && item.series?.seenToday.includes(`${c.sug.season}-${c.sug.episode}`)) return;
      store.lastAsk = { ...store.lastAsk, [c.key]: played(c.key) };
      savePlayed(store);
      useArgus.setState({ suggestion: c.sug });
      const s = useNook.getState();
      s.pushToast({
        kind: "argus",
        title: tt("{0}{1} bitti mi?", item.title, c.sug.season ? ` ${epLabel(c.sug as { season: number; episode: number })}` : ""),
        detail: tt("{0} dk izledin · Üstüme gel, Argus'a işaretleyeyim", Math.round(played(c.key) / 60_000)),
        ms: 9000,
      });
      s.setPendingTab("argus");
      playAntic("surprised");
    };

    /** Argus'ta olmayan şey birkaç dakika izlenince bir kez "ekleyeyim mi?" */
    const offerFresh = (f: ArgusFresh, step: number, duration: number) => {
      const key = `tmdb:${f.key}`;
      store.ms[key] = played(key) + step;
      savePlayed(store);
      // Kısa videolar (fragman, klip) sorulmaz
      if ((duration && duration < FRESH_MIN_LEN_MS) || played(key) < FRESH_AFTER_MS) return;
      if (store.asked.includes(key) || skipped().includes(f.key)) return;
      store.asked.push(key);
      savePlayed(store);
      useArgus.setState({ fresh: f });
      const s = useNook.getState();
      s.pushToast({
        kind: "argus",
        title: tt("{0} Argus'ta yok", `${f.title}${f.year ? ` (${f.year})` : ""}`),
        detail: tt("İzliyorsun ama listende değil · Üstüme gel, ekleyeyim"),
        ms: 9000,
      });
      s.setPendingTab("argus");
      playAntic("surprised");
    };

    /** Tanınamayan uzun bir şey izleniyor ve Argus'ta TMDB anahtarı yok: günde bir kez söyle */
    const hintNoKey = (step: number, duration: number) => {
      const key = "nokey";
      store.ms[key] = played(key) + step;
      if ((duration && duration < FRESH_MIN_LEN_MS) || played(key) < FRESH_AFTER_MS || store.asked.includes(key)) return;
      store.asked.push(key);
      savePlayed(store);
      useNook.getState().pushToast({
        kind: "argus",
        title: tt("İzlediğini tanıyamadım"),
        detail: tt("Argus'ta listende yok; bulmam için Argus › Ayarlar › Veritabanı › API'ye TMDB anahtarı gir"),
        ms: 9000,
      });
    };

    const t = window.setInterval(() => {
      const now = Date.now();
      const step = Math.min(Math.max(0, now - lastTick), MAX_STEP_MS);
      lastTick = now;
      const s = useNook.getState();
      const snap = useArgus.getState().snap;
      if (!s.settings.argusDetect || !snap) return;
      if (store.day !== dayKey()) store = currentPlayed();
      const m = s.media;
      if (m?.playing) {
        const text = `${m.title}
${m.artist}`;
        // Argus yenilenince de (az önce eklenen kayıt artık tanınsın) yeniden bak; TMDB sonuçları önbellekte
        if (text !== lastText || snap !== lastSnap) {
          if (text !== lastText) lastMatch = { sug: null, fresh: null };
          lastText = text;
          lastSnap = snap;
          void resolveMedia(snap, m.title, m.artist, m.app).then((r) => {
            if (lastText === text) lastMatch = r;
          });
        }
        const { sug, fresh, nokey } = lastMatch;
        if (fresh && !sug) offerFresh(fresh, step, m.durationMs);
        if (nokey && !sug) hintNoKey(step, m.durationMs);
        if (!sug) {
          if (cur) finish();
          return;
        }
        const key = sugKey(sug);
        if (cur?.key !== key) {
          finish();
          cur = { key, sug, duration: m.durationMs || 0, idleSince: null };
          // Argus'a eklenmeden önce izlenen süre yeni kayda geçer
          const tmdb = findItem(sug.itemId)?.tmdb;
          if (tmdb && store.ms[`tmdb:${tmdb}`]) {
            store.ms[key] = played(key) + store.ms[`tmdb:${tmdb}`];
            delete store.ms[`tmdb:${tmdb}`];
          }
        }
        store.ms[key] = played(key) + step;
        savePlayed(store);
        cur.idleSince = null;
        if (m.durationMs) cur.duration = m.durationMs;
        useArgus.setState({ live: { ...sug, playedMs: played(key), needMs: needFor(cur.duration) } });
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

// ------------------------------------------------------------------ yan kart

/** Yan kart penceresine giden bilgi */
export interface ArgusCardData {
  visible: boolean;
  title: string;
  episode: string | null;
  poster: string | null;
  meta: string[];
  status: string | null;
  playedMs: number;
  needMs: number;
}

const CARD_GAP = 10;
/** Kartın görünen boyutu (pencerede soldan 6 px boşlukla) — açık adayla aynı boy */
export const CARD_SIZE = { width: 360, height: ISLAND.expanded.height };
/** Karta en son gönderilen — kart penceresi yeni açıldıysa "hazırım" deyince yeniden gönderilir */
let lastCard: ArgusCardData | { visible: false } = { visible: false };
const sendCard = (d: ArgusCardData | { visible: false }) => {
  lastCard = d;
  return emitTo("argus-card", "nook://argus-card", d).catch(() => {});
};
if (isPrimary && inTauri) void listen("nook://argus-card-ready", () => void sendCard(lastCard));

/**
 * Ada açıkken ve Argus'taki bir şey çalarken adanın sağında afişli kart gösterir
 * (ayrı, tıklanamaz pencere — adanın içinde yer yok).
 */
export function useArgusCard(mode: IslandMode) {
  const live = useArgus((s) => s.live);
  const snap = useArgus((s) => s.snap);
  // Tam ekranda ada gizli: imleç üste gidince kart tek başına çıkmasın
  const fullscreen = useNook((s) => s.fullscreen);
  // Ada tam ekrana yayılınca yanında yer kalmaz
  const big = useNook((s) => !!s.big);
  const show = isPrimary && inTauri && mode === "expanded" && !!live && !fullscreen && !big;
  useEffect(() => {
    if (!isPrimary || !inTauri) return;
    const item = live ? snap?.items.find((i) => i.id === live.itemId) : null;
    if (show && live && item) {
      const ep = live.season && live.episode ? item.series?.upcoming.concat(item.series.next ? [item.series.next] : []).find((e) => e.season === live.season && e.episode === live.episode) : null;
      const year = item.release?.slice(0, 4);
      const data: ArgusCardData = {
        visible: true,
        title: item.title,
        episode: live.season && live.episode ? `${epLabel(live as { season: number; episode: number })}${ep?.name ? ` · ${ep.name}` : ""}` : null,
        poster: posterSrc(item),
        meta: [year, item.runtime && !item.series ? `${item.runtime} dk` : null, item.genres.slice(0, 2).join(", ") || null, item.score ? `★ ${item.score.toFixed(1)}` : null].filter((x): x is string => !!x),
        status: item.status,
        playedMs: live.playedMs,
        needMs: live.needMs,
      };
      // Sağda yer yoksa (ada ekranın sağına taşındıysa) Rust kartı adanın soluna koyar
      const x = window.innerWidth / 2 + ISLAND.expanded.width / 2 + CARD_GAP;
      const leftEnd = window.innerWidth / 2 - ISLAND.expanded.width / 2 - CARD_GAP;
      let alive = true;
      void argusCard(true, x, ISLAND_TOP, leftEnd)
        .then((p) => {
          // İmleç karta (ve aradaki boşluğa) geçince ada kapanmasın
          if (alive) setHitExtra("argus", cardHit(p.x + 6, p.x + 6 + CARD_SIZE.width, CARD_SIZE.height));
          return sendCard(data);
        })
        .catch((e) => console.warn("[nook] argus kartı", e));
      return () => {
        alive = false;
        setHitExtra("argus", null);
      };
    }
    // Önce kart kendi çıkış animasyonunu oynasın, sonra pencere gizlensin
    void sendCard({ visible: false });
    const t = window.setTimeout(() => void argusCard(false, 0, 0, 0).catch(() => {}), 260);
    return () => window.clearTimeout(t);
  }, [show, live, snap]);
}
