/**
 * PC'deki Nook'la konuşma. Eşleşmede QR'dan gelen gizli anahtarla her istek imzalanır
 * (bkz. src-tauri/src/remote.rs):
 *   x-nook-ts:  unix milisaniye
 *   x-nook-sig: hex(HMAC-SHA256(anahtar, "{ts}\n{METHOD}\n{yol}\n" + gövde))
 * PC'nin birden çok adresi olabilir (Tailscale + ev ağı): son çalışan önce denenir; o yanıt vermezse
 * bütün adresler aynı anda yoklanır (imzasız /v1/hello) ve ilk yanıt veren kullanılır.
 */
import { native } from "./native";
import type { SetupReport } from "@nook/lib/wakeGuide";

export interface Pairing {
  name: string;
  hosts: string[];
  port: number;
  /** base64url, 32 bayt */
  key: string;
  /** Wake-on-LAN için */
  mac: string;
  /** Evin internet adresi: dışarıdan açarken uyandırma paketi buraya da gider (modem PC'ye iletir) */
  wan?: string;
  /** En son yanıt veren adres */
  lastHost?: string;
}

export interface Stats {
  cpu: number;
  memUsed: number;
  memTotal: number;
  netDown: number;
  netUp: number;
  diskUsed: number;
  diskTotal: number;
  battery: { percent: number; charging: boolean } | null;
  gpu?: number | null;
}

export interface Status {
  name: string;
  version: string;
  locked: boolean;
  uptimeSec: number;
  stats: Stats | null;
  mac: string | null;
  /** PC'nin şu anki adresleri (Tailscale + ev ağı; eski PC sürümlerinde yok) */
  hosts?: string[];
  /** Evin internet adresi (PC'de Tailscale varsa) */
  wan?: string | null;
  /** PC'deki Nook'un rengi, adı ve görünümü (eski PC sürümlerinde yok) */
  nook?: { color?: string; name?: string; look?: unknown; argusProfile?: string } | null;
  /** Soldan sağa; ekran görüntüsünde bu sırayla istenir (eski PC sürümlerinde yok) */
  monitors?: { width: number; height: number; primary: boolean }[];
  /** Ekran telefondan kapatıldı ve o zamandan beri PC'de kimse dokunmadı */
  screenOff?: boolean;
  /** PC'de Claude Code varsa: bekleyen onay ve çalışan oturum sayısı (eski PC sürümlerinde yok) */
  claude?: { asks: number; working: number; sessions: number } | null;
}

/** Ekran görüntüsü hedefi: ekranın sırası ya da hepsi birlikte */
export type ShotTarget = number | "all";

export type PowerAction = "shutdown" | "restart" | "sleep" | "lock" | "screen-off" | "screen-on";

const STORE = "nook.pairing";

export function loadPairing(): Pairing | null {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as Pairing) : null;
  } catch {
    return null;
  }
}

export function savePairing(p: Pairing | null) {
  try {
    if (p) localStorage.setItem(STORE, JSON.stringify(p));
    else localStorage.removeItem(STORE);
  } catch {
    /* depolama kapalıysa bu oturumla sınırlı kalır */
  }
  // Bildirim servisi ve paylaşım uygulama kapalıyken de PC'ye ulaşabilsin (Android tarafı)
  try {
    native?.setPairing(p ? JSON.stringify(p) : "");
  } catch {
    /* önizleme */
  }
}

/** "nook://pair?v=1&n=…&h=100.1.2.3,192.168.1.5&p=47391&k=…&m=AA:BB:…" */
export function parsePairUrl(text: string): Pairing | null {
  const t = text.trim();
  if (!t.startsWith("nook://pair?")) return null;
  const q = new URLSearchParams(t.slice("nook://pair?".length));
  const hosts = (q.get("h") ?? "").split(",").map((h) => h.trim()).filter(Boolean);
  const key = q.get("k") ?? "";
  const port = Number(q.get("p") ?? 0);
  if (!hosts.length || key.length < 40 || !port) return null;
  return { name: q.get("n") || "PC", hosts, port, key, mac: q.get("m") ?? "" };
}

function b64urlBytes(s: string) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

const keys = new Map<string, Promise<CryptoKey>>();
function hmacKey(secret: string) {
  let k = keys.get(secret);
  if (!k) {
    k = crypto.subtle.importKey("raw", b64urlBytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    keys.set(secret, k);
  }
  return k;
}

async function sign(secret: string, ts: string, method: string, path: string, body: Uint8Array) {
  const head = new TextEncoder().encode(`${ts}\n${method}\n${path}\n`);
  const msg = new Uint8Array(head.length + body.length);
  msg.set(head);
  msg.set(body, head.length);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), msg));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

export class PcError extends Error {
  constructor(
    message: string,
    /** offline: hiçbir adres yanıt vermedi; auth: eşleşme geçersiz */
    readonly kind: "offline" | "auth" | "server",
  ) {
    super(message);
  }
}

async function attempt(p: Pairing, host: string, method: string, path: string, body: Uint8Array, timeoutMs: number, type: string) {
  const ts = String(Date.now());
  const sig = await sign(p.key, ts, method, path, body);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(`http://${host}:${p.port}${path}`, {
      method,
      headers: { "x-nook-ts": ts, "x-nook-sig": sig, ...(body.length ? { "content-type": type } : {}) },
      body: body.length ? (body as Uint8Array<ArrayBuffer>) : undefined,
      signal: ctl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

const HELLO_MS = 2200;

/** İmzasız "orada mısın": PC açık ve Nook köprüsü çalışıyorsa hemen yanıt verir */
async function hello(p: Pairing, host: string) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), HELLO_MS);
  try {
    const r = await fetch(`http://${host}:${p.port}/v1/hello`, { signal: ctl.signal });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

let probing: Promise<string | null> | null = null;

/**
 * Bütün adresleri aynı anda yoklar; ilk yanıt vereni hatırlar. Evdeyken ev ağı adresi, dışarıdayken
 * Tailscale'inki kazanır; eski "son çalışan" adres yüzünden saniyelerce beklenmez.
 */
export function findHost(p: Pairing): Promise<string | null> {
  if (import.meta.env.DEV && p.key === "demo") return Promise.resolve(p.hosts[0]);
  if (probing) return probing;
  probing = new Promise<string | null>((resolve) => {
    let left = p.hosts.length;
    if (!left) resolve(null);
    for (const h of p.hosts)
      void hello(p, h).then((ok) => {
        if (ok) resolve(h);
        else if (--left === 0) resolve(null);
      });
  }).then((h) => {
    probing = null;
    if (h && p.lastHost !== h) {
      p.lastHost = h;
      savePairing(p);
    }
    return h;
  });
  return probing;
}

/** İmzalı istek. Son çalışan adres yanıt vermezse diğerlerine geçer. `json` bayt dizisiyse olduğu gibi gönderilir. */
export async function request(p: Pairing, method: "GET" | "POST", path: string, json?: unknown, timeoutMs = 3500): Promise<Response> {
  const raw = json instanceof Uint8Array;
  const body = raw ? json : json === undefined ? new Uint8Array() : new TextEncoder().encode(JSON.stringify(json));
  const type = raw ? "application/octet-stream" : "application/json";
  let host = p.lastHost ?? (await findHost(p));
  if (!host) throw new PcError("PC'ye ulaşılamıyor", "offline");
  for (let round = 0; round < 3; round++) {
    let res: Response;
    try {
      res = await attempt(p, host, method, path, body, timeoutMs, type);
    } catch {
      // Bu adres yanıt vermedi: hangisinin çalıştığına bak
      const alive = await findHost(p);
      if (!alive) throw new PcError("PC'ye ulaşılamıyor", "offline");
      if (alive === host) {
        // PC orada ama bu istek zaman aşımına uğradı: okuma bir kez daha denenir, yazma tekrarlanmaz
        if (method === "GET" && round === 0) continue;
        throw new PcError("PC yanıt vermedi, bir daha dene", "server");
      }
      // Yazma isteği eski adrese ulaşmış olabilir: o adres hâlâ yanıt veriyorsa tekrarlama
      if (method === "POST" && (await hello(p, host))) throw new PcError("PC yanıt vermedi, bir daha dene", "server");
      host = alive;
      continue;
    }
    if (res.status === 401) throw new PcError("Eşleşme geçersiz: PC'de kodu yeniden okut.", "auth");
    if (!res.ok) {
      const msg = await res.json().then((j: { error?: string }) => j.error).catch(() => null);
      throw new PcError(msg ?? `PC hata verdi (${res.status})`, "server");
    }
    return res;
  }
  throw new PcError("PC'ye ulaşılamıyor", "offline");
}

// ---------------------------------------------------------------- Çevrimdışı önbellek

/** PC kapalıyken de gösterilsin diye son görülen veri (notlar, pano, Hum, Argus, kurulum raporu) */
export function cached<T>(name: string): T | null {
  try {
    const raw = localStorage.getItem(`nook.cache.${name}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function cache(name: string, value: unknown) {
  try {
    localStorage.setItem(`nook.cache.${name}`, JSON.stringify(value));
  } catch {
    /* yer yoksa önbelleksiz devam */
  }
}

/** Uzaktan açma ve bağlantı hazırlığı; PC kapalıyken saklanan son rapor gösterilir */
export const getSetup = (p: Pairing) =>
  (import.meta.env.DEV && p.key === "demo"
    ? Promise.resolve<SetupReport>({
        at: Date.now(),
        bridge: true,
        wol: { adapter: "Realtek PCIe GbE", wired: true, fastStartup: false, magicPacket: true, wakeArmed: true, vendor: "ASUSTeK COMPUTER INC.", model: "PRIME B450M-K II", laptop: false, modernStandby: false, autoLogon: false },
        outside: { tailscaleInstalled: true, tailscaleUp: true, firewall: true, lanIp: "192.168.1.5", mac: "58:11:22:DB:FC:60", wan: "213.14.176.118", tailscaleState: "running" },
        wake: { on: true, upnp: false, target: null, externalIp: null, cgnat: false, error: null, router: "TP-Link EX530v", gateway: "192.168.1.1" },
      })
    : request(p, "GET", "/v1/setup", undefined, 15000).then((r) => r.json() as Promise<SetupReport>)
  ).then((s) => {
      cache("setup", s);
      return s;
    });

/** Telefondan PC'ye dosya (İndirilenler › Nook Mobil; to=shots: Resimler › Ekran görüntüleri) */
export const sendFile = (p: Pairing, name: string, bytes: Uint8Array, to?: "shots") =>
  request(p, "POST", `/v1/file?name=${encodeURIComponent(name)}${to ? `&to=${to}` : ""}`, bytes, 60000).then((r) => r.json() as Promise<{ path: string }>);

/** Geliştirme önizlemesi (?demo=home): PC'ye bağlanmadan örnek verilerle */
export const DEMO_PAIRING: Pairing = { name: "LUKO-PC", hosts: ["100.101.7.12", "192.168.1.34"], port: 47391, key: "demo", mac: "" };
const DEMO_STATUS: Status = {
  name: "LUKO-PC",
  version: "0.2.55",
  locked: false,
  uptimeSec: 3 * 3600 + 25 * 60,
  mac: null,
  monitors: [
    { width: 1920, height: 1080, primary: true },
    { width: 1920, height: 1080, primary: false },
  ],
  stats: { cpu: 18, memUsed: 11.4 * 1024 ** 3, memTotal: 32 * 1024 ** 3, netDown: 0, netUp: 0, diskUsed: 610 * 1024 ** 3, diskTotal: 1000 * 1024 ** 3, battery: null },
  claude: { asks: 1, working: 1, sessions: 2 },
};

export const getStatus = (p: Pairing) =>
  import.meta.env.DEV && p.key === "demo" ? Promise.resolve(DEMO_STATUS) : request(p, "GET", "/v1/status").then((r) => r.json() as Promise<Status>);

export const power = (p: Pairing, action: PowerAction) => request(p, "POST", "/v1/power", { action }).then(() => undefined);

/** Ekran görüntüsü (JPEG) */
export const screenshot = (p: Pairing, target?: ShotTarget) =>
  request(p, "GET", target === undefined ? "/v1/screenshot" : `/v1/screenshot?m=${target}`, undefined, 12000).then((r) => r.blob());

// ---------------------------------------------------------------- Medya

export interface NowPlaying {
  title: string;
  artist: string;
  album: string;
  app: string;
  playing: boolean;
  positionMs: number;
  durationMs: number;
  trackKey: string;
  hasArt: boolean;
}

export interface MediaState {
  media: NowPlaying | null;
  /** 0-1; ölçülemiyorsa yok */
  volume: number | null;
  muted: boolean;
}

export const getMedia = (p: Pairing) =>
  import.meta.env.DEV && p.key === "demo"
    ? Promise.resolve<MediaState>({
        media: { title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", app: "Spotify", playing: true, positionMs: 74_000, durationMs: 200_000, trackKey: "demo", hasArt: false },
        volume: 0.42,
        muted: false,
      })
    : request(p, "GET", "/v1/media").then((r) => r.json() as Promise<MediaState>);
export const mediaAction = (p: Pairing, body: { action: "toggle" | "next" | "prev" } | { volume: number } | { muted: boolean } | { seek: number }) =>
  request(p, "POST", "/v1/media", body).then(() => undefined);
export const mediaArt = (p: Pairing) =>
  request(p, "GET", "/v1/media/art", undefined, 8000)
    .then((r) => r.blob())
    .then((b) => URL.createObjectURL(b));

// ---------------------------------------------------------------- Argus

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
  /** "/medya/…" — argusImage ile alınır */
  poster: string | null;
  recent: number | null;
  watchDates: string[];
  series: {
    aired: number;
    seen: number;
    position: number;
    next: ArgusEp | null;
    latest: ArgusEp | null;
    upcoming: ArgusEp[];
    lastSeen: string | null;
    seenToday: string[];
  } | null;
  tmdb: string | null;
}

export interface ArgusSummary {
  profiles: string[];
  profile: string;
  profileId: string;
  boardId: string;
  running: boolean;
  items: ArgusItem[];
  statuses: string[];
}

export interface TmdbHit {
  key: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year: string | null;
  poster: string | null;
}

/** Telefonun yerel günü (YYYY-MM-DD) — Argus izleme tarihleri bununla yazılır */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const demoItem = (id: string, title: string, kind: string, series?: [number, number, number, number, string]): ArgusItem => ({
  id, title, original: null, status: series ? "İzleniyor" : "İzlenecek", kind, genres: ["Dram"], release: "2024-01-01", runtime: null, score: null, poster: null, recent: null, watchDates: [], tmdb: null,
  series: series ? { aired: series[0], seen: series[1], position: series[1], next: { season: series[2], episode: series[3], name: series[4], date: null }, latest: null, upcoming: [], lastSeen: "2026-10-09", seenToday: [] } : null,
});

export const argusSummary = (p: Pairing): Promise<ArgusSummary> =>
  import.meta.env.DEV && p.key === "demo"
    ? Promise.resolve({
        profiles: ["Luko"], profile: "Luko", profileId: "demo", boardId: "demo", running: false, statuses: [],
        items: [demoItem("1", "Kaos Show", "Dizi", [24, 13, 1, 14, "Yeni Sezon"]), demoItem("2", "Severance", "Dizi", [19, 9, 2, 1, "Hello, Ms. Cobel"]), demoItem("3", "Dune: Part Two", "Film")],
      })
    : request(p, "GET", `/v1/argus/summary?today=${today()}`, undefined, 30000)
        .then((r) => r.json() as Promise<ArgusSummary>)
        .then((s) => (cache("argus", s), s));

/** Bölümü (season/episode) ya da filmi (ikisi de yoksa) bugün izlendi yapar */
export const argusMark = (p: Pairing, rowId: string, season?: number, episode?: number) =>
  request(p, "POST", "/v1/argus/mark", { rowId, season, episode, today: today() }, 40000).then(
    (r) => r.json() as Promise<{ completed: boolean; booted: boolean }>,
  );

export const argusSearch = (p: Pairing, query: string) =>
  request(p, "POST", "/v1/argus/search", { query, lang: "tr-TR" }, 20000).then((r) => r.json() as Promise<TmdbHit[]>);

export const argusAdd = (p: Pairing, tmdbId: number, mediaType: string) =>
  request(p, "POST", "/v1/argus/add", { tmdbId, mediaType }, 70000).then((r) => r.json() as Promise<{ rowId: string }>);

/** Argus'un kendi API'si (PC üzerinden): path "/api/…" */
export function argusApi<T>(p: Pairing, method: "GET" | "POST", path: string, body?: unknown) {
  return request(p, method, `/v1/argus/proxy${encodeURI(path)}`, body, 40000).then((r) => r.json() as Promise<T>);
}

/** Argus görseli ("/medya/…") → blob URL; aynı görsel bir kez indirilir */
const images = new Map<string, Promise<string>>();
export function argusImage(p: Pairing, path: string) {
  let u = images.get(path);
  if (!u) {
    u = request(p, "GET", `/v1/argus/proxy${encodeURI(path)}`, undefined, 20000)
      .then((r) => r.blob())
      .then((b) => URL.createObjectURL(b));
    u.catch(() => images.delete(path));
    images.set(path, u);
  }
  return u;
}

// ---------------------------------------------------------------- Bölümler

export interface ArgusSeason {
  season: number;
  name: string | null;
  episodes: { episode: number; name: string | null; airDate: string | null }[];
}

export const argusEpisodes = (p: Pairing, rowId: string) =>
  import.meta.env.DEV && p.key === "demo"
    ? Promise.resolve({
        seasons: [1, 2].map((s) => ({ season: s, name: `${s}. Sezon`, episodes: Array.from({ length: 8 }, (_, i) => ({ episode: i + 1, name: `Bölüm ${i + 1}`, airDate: s === 2 && i > 5 ? "2099-01-01" : "2024-01-01" })) })),
        seen: ["1-1", "1-2", "1-3", "1-4", "1-5", "1-6", "1-7", "1-8", "2-1"],
      })
    : request(p, "GET", `/v1/argus/episodes?rowId=${encodeURIComponent(rowId)}`, undefined, 20000).then((r) => r.json() as Promise<{ seasons: ArgusSeason[]; seen: string[] }>);

/** Bölümleri tek seferde izlendi yapar / işaretini kaldırır: [sezon, bölüm] */
export const argusSetEpisodes = (p: Pairing, rowId: string, add: [number, number][], remove: [number, number][]) =>
  request(p, "POST", "/v1/argus/episodes", { rowId, add, remove, today: today() }, 40000).then((r) => r.json() as Promise<{ completed: boolean }>);

// ---------------------------------------------------------------- PC'yi açma

/** Wake-on-LAN: ev ağına yayın; modemde yönlendirme varsa evin internet adresine de (dışarıdan açma) */
export async function wakePc(p: Pairing, mac?: string | null) {
  const m = mac || p.mac;
  if (!m) throw new Error("PC'nin ağ kartı adresi bilinmiyor: PC açıkken uygulamayı bir kez aç.");
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke<number>("wake_pc", { mac: m, hosts: p.hosts, wan: p.wan ?? null });
}

// ---------------------------------------------------------------- Pano ve Not

export interface PcClip {
  id: string;
  kind: "text" | "image" | "files";
  /** Metin; görselde "1920×1080", dosyalarda adlar */
  text: string;
  color: string | null;
  at: number;
  app: string | null;
  pinned: boolean;
  files: number;
}

export interface PcPad {
  id: string;
  title: string;
  text: string;
  at: number;
}

const DEMO = (p: Pairing) => import.meta.env.DEV && p.key === "demo";

export const getClips = (p: Pairing) =>
  DEMO(p)
    ? Promise.resolve([
        { id: "a", kind: "text", text: "https://github.com/lukosovian/Nook", color: null, at: Date.now() - 60_000, app: "Chrome", pinned: true, files: 0 },
        { id: "b", kind: "text", text: "#3D8BFF", color: "#3D8BFF", at: Date.now() - 300_000, app: "Figma", pinned: false, files: 0 },
        { id: "c", kind: "text", text: "Yarın 10:00'da toplantı, sunumu unutma", color: null, at: Date.now() - 3_600_000, app: "Teams", pinned: false, files: 0 },
        { id: "d", kind: "files", text: "rapor.pdf, tablo.xlsx", color: null, at: Date.now() - 7_200_000, app: "Gezgin", pinned: false, files: 2 },
      ] as PcClip[])
    : request(p, "GET", "/v1/clips")
        .then((r) => r.json().then((j: { clips: PcClip[] | null }) => j.clips ?? []))
        .then((c) => (cache("clips", c), c));

export const clipImage = (p: Pairing, id: string) =>
  request(p, "GET", `/v1/clips/image?id=${encodeURIComponent(id)}`, undefined, 15000)
    .then((r) => r.blob())
    .then((b) => URL.createObjectURL(b));

// ---------------------------------------------------------------- Raf

export interface ShelfItem {
  id: string;
  name: string;
  ext: string;
  size: number;
  isDir: boolean;
  isImage: boolean;
  pinned: boolean;
  addedAt: number;
}

export const getShelf = (p: Pairing) =>
  DEMO(p)
    ? Promise.resolve([
        { id: "a", name: "sunum.pdf", ext: "pdf", size: 2_400_000, isDir: false, isImage: false, pinned: true, addedAt: Date.now() - 60_000 },
        { id: "b", name: "IMG_2041.jpg", ext: "jpg", size: 3_100_000, isDir: false, isImage: true, pinned: false, addedAt: Date.now() - 600_000 },
        { id: "c", name: "Projeler", ext: "", size: 0, isDir: true, isImage: false, pinned: false, addedAt: Date.now() - 3_600_000 },
        { id: "d", name: "tablo.xlsx", ext: "xlsx", size: 84_000, isDir: false, isImage: false, pinned: false, addedAt: Date.now() - 7_200_000 },
      ] as ShelfItem[])
    : request(p, "GET", "/v1/shelf")
        .then((r) => r.json().then((j: { items: ShelfItem[] | null }) => j.items ?? []))
        .then((c) => (cache("shelf", c), c));

/** Raftaki görselin küçük resmi (dosyanın kendisi) */
export const shelfImage = (p: Pairing, id: string) =>
  request(p, "GET", `/v1/shelf/file?id=${encodeURIComponent(id)}`, undefined, 15000)
    .then((r) => r.blob())
    .then((b) => URL.createObjectURL(b));

export const removeShelf = (p: Pairing, id: string) => request(p, "POST", "/v1/shelf", { op: "remove", id }).then(() => undefined);

/** Metni PC'nin panosuna yazar */
export const sendToPcClipboard = (p: Pairing, text: string) => request(p, "POST", "/v1/clips", { text }).then(() => undefined);

export const getNotes = (p: Pairing) =>
  DEMO(p)
    ? Promise.resolve({ pads: [{ id: "n1", title: "Not 1", text: "- süt\n- ekmek\n- **pil** al", at: 0 }, { id: "n2", title: "Fikirler", text: "Nook için telefon uygulaması", at: 0 }], padId: "n1" })
    : request(p, "GET", "/v1/notes")
        .then((r) => r.json() as Promise<{ pads: PcPad[] | null; padId: string | null }>)
        .then((n) => (cache("notes", n), n));

export type NoteOp = { op: "set"; id: string; text: string } | { op: "add"; title?: string; id?: string } | { op: "remove"; id: string } | { op: "rename"; id: string; title: string };

export const noteOp = (p: Pairing, op: NoteOp) => request(p, "POST", "/v1/notes", op).then((r) => r.json() as Promise<{ ok: boolean; id: string | null }>);

/** Telefonun panosu (Tauri eklentisi; tarayıcı önizlemesinde navigator.clipboard) */
/** Nook'un görünümünü (gövde, doku, aksesuarlar) ve rengini PC'de değiştir */
export const setLook = (p: Pairing, look: unknown, color: string) => request(p, "POST", "/v1/look", { look, color }).then(() => undefined);

// ---------------------------------------------------------------- Claude Code

export type ClaudeState = "working" | "waiting" | "done" | "idle";

export interface ClaudeSessionInfo {
  id: string;
  project: string;
  state: ClaudeState;
  /** Şu an ne yapıyor: "Düzenliyor · Panels.tsx" */
  action: string;
  prompt: string;
  reply: string;
  updatedAt: number;
  turnAt: number;
  edits: number;
  commands: number;
  files: string[];
}

export interface ClaudeQuestionInfo {
  question: string;
  header?: string;
  multiSelect: boolean;
  options: { label: string; description?: string }[];
}

export interface ClaudeAskInfo {
  askId: number;
  session: string;
  project: string;
  tool: string;
  title: string;
  detail: string;
  questions: ClaudeQuestionInfo[] | null;
  canAlways: boolean;
  at: number;
}

export interface ClaudeWindow {
  usedPct: number;
  resetsAt: number;
}

export interface ClaudeInfo {
  present: boolean;
  hooked: boolean;
  sessions: ClaudeSessionInfo[];
  asks: ClaudeAskInfo[];
  plan: { fiveHour?: ClaudeWindow; sevenDay?: ClaudeWindow; updatedAt: number } | null;
}

const DEMO_CLAUDE: ClaudeInfo = {
  present: true,
  hooked: true,
  sessions: [
    { id: "a", project: "Nook", state: "waiting", action: "Onay bekliyor · npm run build", prompt: "Telefona Claude bölümünü ekle", reply: "", updatedAt: Date.now() - 20_000, turnAt: Date.now() - 6 * 60_000, edits: 7, commands: 3, files: ["Claude.tsx", "remote.rs", "pc.ts"] },
    { id: "b", project: "Argus", state: "done", action: "Bitti", prompt: "Takvimdeki boş günleri düzelt", reply: "Takvimde bölümü olmayan günler artık gri görünüyor; yeni sezon başlangıçları da işaretli.", updatedAt: Date.now() - 14 * 60_000, turnAt: Date.now() - 22 * 60_000, edits: 4, commands: 1, files: ["Calendar.tsx"] },
  ],
  asks: [{ askId: 7, session: "a", project: "Nook", tool: "Bash", title: "Komut çalıştırmak istiyor", detail: "npm run build", questions: null, canAlways: true, at: Date.now() - 20_000 }],
  plan: { fiveHour: { usedPct: 42, resetsAt: Date.now() + 2.5 * 3600_000 }, sevenDay: { usedPct: 68, resetsAt: Date.now() + 3 * 86400_000 }, updatedAt: Date.now() },
};

export const getClaude = (p: Pairing) =>
  import.meta.env.DEV && p.key === "demo"
    ? Promise.resolve(DEMO_CLAUDE)
    : request(p, "GET", "/v1/claude")
        .then((r) => r.json() as Promise<ClaudeInfo | null>)
        .then((c) => (cache("claude", c), c));

/** Onay isteğine cevap: izin ver, her zaman izin ver, reddet ya da sorulara cevaplar */
export const claudeDecide = (p: Pairing, askId: number, decision: "allow" | "always" | "deny" | { answers: Record<string, string | string[]> }) =>
  import.meta.env.DEV && p.key === "demo" ? Promise.resolve() : request(p, "POST", "/v1/claude/decide", { askId, decision }).then(() => undefined);

export async function phoneClipboard(): Promise<{ read: () => Promise<string>; write: (t: string) => Promise<void> }> {
  try {
    const m = await import("@tauri-apps/plugin-clipboard-manager");
    return { read: () => m.readText().then((t) => t ?? ""), write: (t) => m.writeText(t) };
  } catch {
    return { read: () => navigator.clipboard.readText(), write: (t) => navigator.clipboard.writeText(t) };
  }
}

// ---------------------------------------------------------------- Hum

export interface HumTrack {
  key: string;
  title: string;
  artist: string;
  album?: string | null;
  cover?: string | null;
  url?: string | null;
}

export type HumOutcome = { status: "found"; track: HumTrack } | { status: "none" } | { status: "silent" } | { status: "error"; message: string };

/** PC'deki Hum geçmişi (telefonun duydukları dahil) */
export interface PcHum {
  id: string;
  title: string;
  artist: string;
  cover: string | null;
  url: string | null;
  at: number;
  phone: boolean;
}

/** Mikrofondan 16 kHz mono ses (s16le): PC Shazam'a sorar, bulursa geçmişe (ve izlenen Argus içeriğine) yazar.
 *  agoMs: PC kapalıyken kaydedilip sonradan gönderilen dinleme ne kadar önceydi */
export const humRecognize = (p: Pairing, pcm: Int16Array, agoMs = 0) =>
  DEMO(p)
    ? new Promise<HumOutcome>((r) =>
        setTimeout(() => r({ status: "found", track: { key: "1", title: "Blinding Lights", artist: "The Weeknd", cover: null, url: null } }), 900),
      )
    : request(p, "POST", agoMs ? `/v1/hum?ago=${Math.round(agoMs)}` : "/v1/hum", new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength), 20_000).then(
        (r) => r.json() as Promise<HumOutcome>,
      );

export const getHums = (p: Pairing) =>
  DEMO(p)
    ? Promise.resolve<PcHum[]>([
        { id: "h1", title: "Blinding Lights", artist: "The Weeknd", cover: null, url: null, at: Date.now() - 120_000, phone: true },
        { id: "h2", title: "Kara Toprak", artist: "Barış Manço", cover: null, url: null, at: Date.now() - 3_600_000, phone: false },
        { id: "h3", title: "Where Is My Mind?", artist: "Pixies", cover: null, url: null, at: Date.now() - 86_400_000, phone: false },
      ])
    : request(p, "GET", "/v1/hum")
        .then((r) => r.json().then((j: { hums: PcHum[] | null }) => j.hums ?? []))
        .then((h) => (cache("hums", h), h));
