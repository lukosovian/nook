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
import { open as pickFolder } from "@tauri-apps/plugin-dialog";
import { argusCheckDir, argusInstall, argusMark, argusOpen, argusSnapshot, inTauri, isPrimary } from "./bridge";
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
    /** En son izlenen bölümün sırası */
    position: number;
    next: ArgusEp | null;
    latest: ArgusEp | null;
    upcoming: ArgusEp[];
    lastSeen: string | null;
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
}

export interface ArgusLive extends ArgusSuggestion {
  playedMs: number;
  needMs: number;
}

export const useArgus = create<ArgusState>(() => ({ snap: null, busy: null, suggestion: null, focusId: null, live: null }));

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

/** Argus başka bir yerdeyse klasörünü elle seç */
export async function chooseArgusDir() {
  const s = useNook.getState();
  const picked = await pickFolder({ directory: true, title: "Argus klasörünü seç" }).catch(() => null);
  if (typeof picked !== "string") return;
  const dir = await argusCheckDir(picked).catch(() => null);
  if (!dir) {
    s.pushToast({ kind: "argus", title: "Burada Argus yok", detail: "İçinde app ve data klasörleri olan Argus klasörünü seç", ms: 6000 });
    playAntic("suspicious");
    return;
  }
  s.updateSettings({ argusDir: dir });
  await refreshArgus();
  if (useArgus.getState().snap) {
    s.pushToast({ kind: "argus", title: "Argus'u buldum!", detail: dir, ms: 4500 });
    playAntic("love");
  }
}

/** Argus'un kurulum betiğini açar; kurulunca Nook dakikada bir yoklarken kendiliğinden bulur. */
export async function installArgus() {
  const s = useNook.getState();
  try {
    await argusInstall();
    s.pushToast({ kind: "argus", title: "Argus kuruluyor", detail: "Açılan penceredeki adımları izle", ms: 6000 });
    playAntic("hop");
  } catch (e) {
    s.pushToast({ kind: "argus", title: "Argus kurulamadı", detail: String(e), ms: 6000 });
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
  const dir = useNook((s) => s.settings.argusDir);
  useEffect(() => {
    void refreshArgus().then(announceNews);
    const t = window.setInterval(() => void refreshArgus().then(announceNews), REFRESH_MS);
    return () => window.clearInterval(t);
  }, [profile, dir]);
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
/** Kullanıcının kendi kuralı: dizi/film 15 dk izlendiyse o güne yazılır (yüzdeye bakılmaz) */
const MIN_WATCH_MS = 15 * 60_000;
/** Duraklatıldıktan bu kadar sonra "bitti" sayılır */
const IDLE_END_MS = 3 * 60_000;

/** Bugün bölüm/film başına oynatılan süre — Nook yeniden açılsa da, duraklatıp dönülse de kaybolmaz */
const PLAYED_KEY = "nook-argus-played";
type PlayedStore = { day: string; ms: Record<string, number>; asked: string[] };

function loadPlayed(): PlayedStore {
  try {
    const v = JSON.parse(localStorage.getItem(PLAYED_KEY) ?? "null") as PlayedStore | null;
    if (v && v.day === dayKey()) return v;
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
// 15 dk'dan kısa bölümlerde neredeyse tamamı yeter
const needFor = (duration: number) => (duration > 0 ? Math.min(MIN_WATCH_MS, duration * 0.9) : MIN_WATCH_MS);

/**
 * Tarayıcıda/oynatıcıda çalan şeyi Argus'la eşleştirir. Yalnızca gerçekten oynarken geçen süre
 * sayılır (duraklatma sayılmaz, ileri sarma süre eklemez). 15 dk dolup izleme bitince
 * (durdurulup 3 dk geçince, başka şeye geçilince, jeneriğe gelince) "işaretleyeyim mi?" diye sorar.
 */
export function useArgusDetect() {
  useEffect(() => {
    if (!isPrimary || !inTauri) return;
    let store = loadPlayed();
    let cur: { key: string; sug: ArgusSuggestion; duration: number; idleSince: number | null } | null = null;
    let lastText = "";
    let lastMatch: ArgusSuggestion | null = null;

    const played = (key: string) => store.ms[key] ?? 0;

    const finish = () => {
      const c = cur;
      cur = null;
      useArgus.setState({ live: null });
      if (!c || store.asked.includes(c.key)) return;
      const item = findItem(c.sug.itemId);
      if (!item || played(c.key) < needFor(c.duration)) return;
      store.asked.push(c.key);
      savePlayed(store);
      useArgus.setState({ suggestion: c.sug });
      const s = useNook.getState();
      s.pushToast({
        kind: "argus",
        title: `${item.title}${c.sug.season ? ` ${epLabel(c.sug as { season: number; episode: number })}` : ""} bitti mi?`,
        detail: `${Math.round(played(c.key) / 60_000)} dk izledin · Üstüme gel, Argus'a işaretleyeyim`,
        ms: 9000,
      });
      s.setPendingTab("argus");
      playAntic("surprised");
    };

    const t = window.setInterval(() => {
      const s = useNook.getState();
      const snap = useArgus.getState().snap;
      if (!s.settings.argusDetect || !snap) return;
      if (store.day !== dayKey()) store = loadPlayed();
      const m = s.media;
      if (m?.playing) {
        const text = `${m.title}
${m.artist}`;
        if (text !== lastText) {
          lastText = text;
          lastMatch = matchMedia(snap, m.title, m.artist);
        }
        const sug = lastMatch;
        if (!sug) {
          if (cur) finish();
          return;
        }
        const key = sugKey(sug);
        if (cur?.key !== key) {
          finish();
          cur = { key, sug, duration: m.durationMs || 0, idleSince: null };
        }
        store.ms[key] = played(key) + TICK_MS;
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
