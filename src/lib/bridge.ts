/**
 * Rust ⇄ React köprüsü. Tüm Tauri çağrıları buradan geçer.
 * Tauri dışında (`npm run dev` ile düz tarayıcı) Rust tarafını taklit eder;
 * böylece tasarım üzerinde tarayıcıda da hızlıca çalışabilirsin.
 */
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import * as autostart from "@tauri-apps/plugin-autostart";

export const inTauri = isTauri();

/** "island" = ana ada; "island-1"… = "Tüm ekranlar" modundaki ek adalar. */
export const windowLabel = inTauri ? getCurrentWebviewWindow().label : "island";
/**
 * Kalıcı durumu değiştiren beslemeler (pano, ekran görüntüsü) yalnızca ana adada çalışır;
 * diğer adalar localStorage üzerinden eşitlenir.
 */
export const isPrimary = windowLabel === "island";

export const EVENTS = {
  cursor: "nook://cursor",
  idle: "nook://idle",
  clipboard: "nook://clipboard",
  media: "nook://media",
  stats: "nook://stats",
  event: "nook://event",
  screenshot: "nook://screenshot",
  volume: "nook://volume",
  brightness: "nook://brightness",
  level: "nook://level",
  search: "nook://search",
  relocate: "nook://relocate",
  devices: "nook://devices",
  fullscreen: "nook://fullscreen",
  privacy: "nook://privacy",
  downloads: "nook://downloads",
  downloadDone: "nook://download-done",
  notification: "nook://notification",
  voice: "nook://voice",
  voiceLevel: "nook://voice-level",
  askScreen: "nook://ask-screen",
  online: "nook://online",
  game: "nook://game",
} as const;

/** Windows bildirim merkezine düşen bir bildirim (Discord, WhatsApp, Mail…). */
export interface NotificationPayload {
  id: number;
  app: string;
  appId: string;
  title: string;
  body: string;
  /** Uygulama ikonu (PNG data URL) */
  icon: string | null;
}

/** Sesli komut: kısayol basılınca "start", bırakınca kayıt (base64 WAV) ya da hata. */
export type VoicePayload = { phase: "start" } | { phase: "done"; audio: string | null } | { phase: "error"; message: string };

/** Tam ekran oyundan çıkınca oturum özeti. */
export interface GamePayload {
  app: string;
  secs: number;
  peakCpu: number;
  peakMem: number;
}

export const fileIcon = (path: string, size = 48) => (inTauri ? invoke<string | null>("file_icon", { path, size }) : Promise.resolve(null));
export const captureScreen = () => (inTauri ? invoke<string>("capture_screen") : Promise.reject(new Error("yalnızca uygulamada")));
export const voiceStart = () => (inTauri ? invoke<boolean>("voice_start") : Promise.resolve(false));
export const voiceStop = () => (inTauri ? invoke<string | null>("voice_stop") : Promise.resolve(null));
export const onlineState = () => (inTauri ? invoke<boolean>("online_state") : Promise.resolve(navigator.onLine));

export interface StatsPayload {
  cpu: number;
  memUsed: number;
  memTotal: number;
  netDown: number;
  netUp: number;
  diskUsed: number;
  diskTotal: number;
  battery: { percent: number; charging: boolean } | null;
}

export type SysEventKind =
  | "charging"
  | "unplugged"
  | "battery-low"
  | "usb-in"
  | "usb-out"
  | "audio"
  | "screenshot"
  | "device-low"
  | "headset-charging"
  | "fan"
  | "mic"
  | "camera"
  | "download"
  | "chat"
  | "online"
  | "offline"
  | "bt-in"
  | "bt-out"
  | "notify"
  | "translate"
  | "focus"
  | "break"
  | "eye"
  | "water"
  | "game"
  | "play"
  | "update"
  | "argus";

/** Mikrofonu / kamerayı şu an kullanan uygulamalar. */
export interface PrivacyPayload {
  mic: string[];
  camera: string[];
}

export interface DownloadItem {
  id: string;
  name: string;
  received: number;
  speed: number;
}

export interface QuickState {
  wifi: boolean | null;
  bluetooth: boolean | null;
  dark: boolean;
  muted: boolean | null;
  micMuted: boolean | null;
}
export type QuickKey = "wifi" | "bluetooth" | "dark" | "mute" | "mic";

export const quickState = () => (inTauri ? invoke<QuickState>("quick_state") : Promise.resolve(null));
export const quickSet = (key: QuickKey, on: boolean) => (inTauri ? invoke<void>("quick_set", { key, on }) : Promise.resolve());
/** Alarm sesi (Windows Alarm01–10). `preview`: tek sefer dinlet. */
/** Sıradaki alarm zamanını Rust'a bildir — tam ekranda ada vakitlice açılsın. */
export const alarmNext = (at: number | null) => (inTauri ? invoke<void>("alarm_next", { at }) : Promise.resolve());

export const alarmRing = (on: boolean, sound = 1, preview = false) =>
  inTauri ? invoke<void>("alarm_ring", { on, sound, preview }) : Promise.resolve();

export const quickAction = (action: "lock" | "screen-off") =>
  inTauri ? invoke<void>("quick_action", { action }) : Promise.resolve();

/** Lukonnect'ten okunan cihazlar (mouse, kulaklık, vantilatör). */
export interface DevicesPayload {
  /** Lukonnect çalışıyor ve durum dosyası taze mi */
  lukonnect: boolean;
  mouse: { percent: number; remainingSec: number } | null;
  headset: { percent: number; charging: string | null } | null;
  fan: { on: boolean; speed: number } | null;
}

export interface SysEvent {
  kind: SysEventKind;
  title: string;
  detail: string;
}

export interface VolumePayload {
  value: number;
  muted: boolean;
}

/** Rust'a giden ayarlar (tamamı frontend'de saklanır). */
export interface NativeSettings {
  monitorMode: "primary" | "follow" | "all" | "fixed";
  monitorName: string | null;
  sleepAfterSec: number;
  shortcut: string;
  /** Ekrana sor */
  askShortcut: string;
  /** Sesli komut (basılı tut) */
  voiceShortcut: string;
  autoScreenshots: boolean;
  hideInFullscreen: boolean;
}

export interface MonitorInfo {
  name: string;
  width: number;
  height: number;
  primary: boolean;
}

export interface AppEntry {
  name: string;
  path: string;
}

const noop = () => Promise.resolve();

export const applySettings = (settings: NativeSettings) =>
  inTauri ? invoke<void>("apply_settings", { settings }) : noop();
export const listMonitors = () => (inTauri ? invoke<MonitorInfo[]>("list_monitors") : Promise.resolve([]));
/** Arama açıkken pencere tıklanabilir/odakta kalsın; kapanınca odak önceki uygulamaya döner. */
export const setInteractive = (on: boolean) => (inTauri ? invoke<void>("set_interactive", { on }) : noop());
/** Argus (dizi/film arşivi) — yoksa null */
export const argusSnapshot = (profile: string, today: string, dir: string) =>
  inTauri ? invoke<import("./argus").ArgusSnapshot | null>("argus_snapshot", { profile, today, dir }) : Promise.resolve(null);
export const argusCheckDir = (dir: string) => invoke<string | null>("argus_check_dir", { dir });
export const argusMark = (rowId: string, today: string, season?: number, episode?: number, status?: string) =>
  invoke<{ completed: boolean; booted: boolean }>("argus_mark", { rowId, today, season, episode, status });
/** Adanın sağındaki izleme kartı penceresi (x, y: bu pencereye göre mantıksal konum) */
export const argusCard = (show: boolean, x: number, y: number) => invoke<void>("argus_card", { show, x, y });
export const argusInstall = () => invoke<void>("argus_install");
export const argusOpen = () => (inTauri ? invoke<boolean>("argus_open") : Promise.resolve(false));
/** Tanıtım ekranı için pencereyi büyüt; argümansız çağrı varsayılan boyuta döndürür. */
export const setWindowSize = (width?: number, height?: number) => (inTauri ? invoke<void>("set_window_size", { width, height }) : noop());
export const releaseFocus = () => (inTauri ? invoke<void>("release_focus") : noop());
export const openPath = (path: string) =>
  inTauri ? invoke<void>("open_path", { path }) : Promise.resolve(void window.open(path, "_blank"));
export const revealPath = (path: string) => (inTauri ? invoke<void>("reveal_path", { path }) : noop());
export const listApps = () => (inTauri ? invoke<AppEntry[]>("list_apps") : Promise.resolve([]));

/** Windows açılışında başlatma — Rust eklentisi kayıt defterine yazar. */
export async function syncAutostart(want: boolean) {
  // Geliştirme modunda debug exe'yi başlangıca yazma (dev sunucusu olmadan boş açılır).
  if (!inTauri || import.meta.env.DEV) return;
  const on = await autostart.isEnabled();
  // Kayıt yalnızca varlığına bakılarak "açık" sayılır; eski/başka bir exe'yi gösteriyor olabilir.
  // Her açılışta bu exe'nin yoluyla yeniden yaz.
  if (on) await autostart.disable();
  if (want) await autostart.enable();
}

/** Rust'tan gelen "şu an çalan" bilgisi. `artwork` yalnızca parça değişince dolu gelir. */
export interface MediaPayload {
  title: string;
  artist: string;
  album: string;
  /** Kaynak uygulama kimliği (örn. "Spotify.exe") */
  app: string;
  playing: boolean;
  positionMs: number;
  durationMs: number;
  trackKey: string;
  artwork: string | null;
}

export type MediaAction = "toggle" | "next" | "prev";

export function mediaControl(action: MediaAction): Promise<void> {
  return inTauri ? invoke("media_control", { action }) : Promise.resolve();
}

/** Webview hazır olunca son durumu (kapak dahil) yeniden iste. */
export function mediaResync(): Promise<void> {
  return inTauri ? invoke("media_resync") : Promise.resolve();
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CursorPayload {
  x: number;
  y: number;
  /** İmleç adanın hit rect'i içinde mi (click-through kapalı mı) */
  inside: boolean;
  /** İmleç göz takibi menzilinde mi */
  near: boolean;
}

export interface FileMeta {
  path: string;
  name: string;
  ext: string;
  size: number;
  isDir: boolean;
  isImage: boolean;
}

type Handler<T> = (payload: T) => void;

/** Olaya abone olur; temizleme fonksiyonunu senkron döner (useEffect'e doğrudan verilebilir). */
export function subscribe<T>(event: string, handler: Handler<T>): () => void {
  if (inTauri) {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void listen<T>(event, (e) => handler(e.payload)).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }
  const set = webBus.get(event) ?? new Set();
  set.add(handler as Handler<unknown>);
  webBus.set(event, set);
  return () => set.delete(handler as Handler<unknown>);
}

export function setHitRect(rect: Rect): Promise<void> {
  if (inTauri) return invoke("set_hit_rect", { rect });
  webHit = rect;
  return Promise.resolve();
}

export function inspectPaths(paths: string[]): Promise<FileMeta[]> {
  if (inTauri) return invoke<FileMeta[]>("inspect_paths", { paths });
  return Promise.resolve(
    paths.map((name) => ({
      path: name,
      name,
      ext: name.includes(".") ? name.split(".").pop()!.toLowerCase() : "",
      size: 0,
      isDir: false,
      isImage: false,
    })),
  );
}

export const dragIconPath = () => invoke<string>("drag_icon_path");

/** Nook'un kendi yazdığı metin, pano izleyiciden geri geldiğinde listeyi karıştırmasın. */
let selfWritten: string | null = null;
export function consumeSelfWrite(text: string) {
  const mine = selfWritten === text;
  if (mine) selfWritten = null;
  return mine;
}

export async function copyText(text: string) {
  selfWritten = text;
  if (inTauri) await writeText(text);
  else await navigator.clipboard.writeText(text);
}

// ---------------------------------------------------------------------------
// Tarayıcı önizleme modu: Rust tracker/idle/clipboard davranışını taklit eder.
// ---------------------------------------------------------------------------
const webBus = new Map<string, Set<Handler<unknown>>>();
let webHit: Rect = { x: 0, y: 0, width: 0, height: 0 };
const WEB_SLEEP_MS = 30_000;

function webEmit<T>(event: string, payload: T) {
  webBus.get(event)?.forEach((h) => h(payload));
}

if (!inTauri && typeof window !== "undefined") {
  let lastInput = Date.now();
  let asleep = false;
  const inRect = (x: number, y: number) =>
    x >= webHit.x && x <= webHit.x + webHit.width && y >= webHit.y && y <= webHit.y + webHit.height;

  window.addEventListener("pointermove", (e) => {
    lastInput = Date.now();
    webEmit<CursorPayload>(EVENTS.cursor, {
      x: e.clientX,
      y: e.clientY,
      inside: inRect(e.clientX, e.clientY),
      near: true,
    });
  });
  document.documentElement.addEventListener("pointerleave", () =>
    webEmit<CursorPayload>(EVENTS.cursor, { x: -1e4, y: -1e4, inside: false, near: false }),
  );
  window.addEventListener("keydown", () => (lastInput = Date.now()));
  document.addEventListener("copy", () => {
    const text = document.getSelection()?.toString().trim();
    if (text) webEmit(EVENTS.clipboard, text);
  });
  window.setInterval(() => {
    const now = Date.now() - lastInput > WEB_SLEEP_MS;
    if (now !== asleep) webEmit(EVENTS.idle, (asleep = now));
  }, 1000);
}
