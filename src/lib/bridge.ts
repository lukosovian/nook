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
import { tt } from "./i18n";

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
  islandPos: "nook://island-pos",
  gameStart: "nook://game-start",
  gameBreak: "nook://game-break",
  foreground: "nook://foreground",
  lowWork: "nook://low-work",
  perchMove: "nook://perch-move",
  perchHop: "nook://perch-hop",
  perchLeave: "nook://perch-leave",
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

/** Oyun açıldı (mins = 0) ya da mola vakti geldi (mins = oynanan dakika). */
export interface GamePeekPayload {
  app: string;
  mins: number;
}

/** Tam ekran oyundan çıkınca oturum özeti. */
export interface GamePayload {
  app: string;
  secs: number;
  peakCpu: number;
  peakMem: number;
}

export const fileIcon = (path: string, size = 48) => (inTauri ? invoke<string | null>("file_icon", { path, size }) : Promise.resolve(null));
export const captureScreen = () => (inTauri ? invoke<string>("capture_screen") : Promise.reject(new Error(tt("yalnızca uygulamada"))));
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
  /** Pille çalışıyor ya da Windows enerji tasarrufu açık */
  saver: boolean;
}

export type SysEventKind =
  | "sensitive"
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
  | "argus"
  | "welcome"
  | "fish"
  | "guard";

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
  /** Ana ses seviyesi 0–1 */
  volume: number | null;
  /** Ses çıkış cihazları */
  outputs: AudioOutput[];
}
export interface AudioOutput {
  id: string;
  name: string;
  default: boolean;
  headphone: boolean;
}
export type QuickKey = "wifi" | "bluetooth" | "dark" | "mute" | "mic";

export const quickState = () =>
  inTauri
    ? invoke<QuickState>("quick_state")
    : // Tarayıcı önizlemesi: Wi-Fi/Bluetooth'suz masaüstü
      Promise.resolve<QuickState>({ wifi: null, bluetooth: null, dark: true, muted: false, micMuted: false, volume: 0.45, outputs: [
        { id: "a", name: tt("Hoparlör (Realtek Audio)"), default: true, headphone: false },
        { id: "b", name: tt("Kulaklık (HyperX Cloud)"), default: false, headphone: true },
      ] });
export const quickSet = (key: QuickKey, on: boolean) => (inTauri ? invoke<void>("quick_set", { key, on }) : Promise.resolve());
/** Alarm sesi (Windows Alarm01–10). `preview`: tek sefer dinlet. */
/** Sıradaki alarm zamanını Rust'a bildir — tam ekranda ada vakitlice açılsın. */
export const alarmNext = (at: number | null) => (inTauri ? invoke<void>("alarm_next", { at }) : Promise.resolve());

export const alarmRing = (on: boolean, sound = 1, preview = false) =>
  inTauri ? invoke<void>("alarm_ring", { on, sound, preview }) : Promise.resolve();

/** Varsayılan ses çıkışını değiştir */
export const quickOutput = (id: string) => (inTauri ? invoke<void>("quick_output", { id }) : Promise.resolve());
/** Ana ses seviyesi (0–1) */
/** Uygulama bazlı ses (Windows Ses Karıştırıcısı gibi) */
export interface AppVolume {
  key: string;
  name: string;
  path: string | null;
  volume: number;
  muted: boolean;
  active: boolean;
}
export const mixerList = () => (inTauri ? invoke<AppVolume[]>("mixer_list") : Promise.resolve([] as AppVolume[]));
export const mixerSet = (key: string, volume?: number, muted?: boolean) => (inTauri ? invoke<void>("mixer_set", { key, volume, muted }) : Promise.resolve());

export const quickVolume = (value: number) => (inTauri ? invoke<void>("quick_volume", { value }) : Promise.resolve());
/** Ekran parlaklığı 0–100 (dizüstü paneli WMI, harici monitörler DDC/CI); desteklenmiyorsa null */
export const brightnessGet = () => (inTauri ? invoke<number | null>("brightness_get") : Promise.resolve(70));
export const brightnessSet = (value: number) => (inTauri ? invoke<void>("brightness_set", { value: Math.round(value) }) : Promise.resolve());
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
  /** Gizlilik kalkanı (aç/kapat) */
  shieldShortcut: string;
  /** Parola kilidi: kalkan yalnızca parolayla kalkar */
  shieldLock: boolean;
  autoScreenshots: boolean;
  hideInFullscreen: boolean;
  /** Oyun açılınca ada gizlenmeden önce kısa özet */
  gameIntro: boolean;
  /** Bu kadar dakikada bir oyun molası hatırlat (0 = kapalı) */
  breakReminderMin: number;
  /** Sürüklenip bırakılan yer (ekrana oranla); yoksa üst orta */
  islandPos: IslandPos | null;
  /** Arayüz ölçeği (0,8–1,5) */
  uiScale: number;
  /** Tepsi menüsündeki "çık" yazısı (seçili dilde) */
  quitLabel?: string;
}

/** fx: adanın ortasının yatay yeri, fy: üst kenarının dikey yeri (0 = üste yapışık) — ekran boyuna oranla */
export interface IslandPos {
  fx: number;
  fy: number;
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
/** Adayı sürüklemeye başla (sol tuş basılıyken çağrılmalı) */
/** Hassas veri: pano hâlâ bu metni tutuyorsa temizle */
export const clipboardClearIf = (text: string) => (inTauri ? invoke<boolean>("clipboard_clear_if", { text }) : Promise.resolve(false));
/** Gizlilik kalkanını kapat (kalkanın kendisinden: Esc, çift tık) */
export const shieldOff = () => (inTauri ? invoke<void>("shield_off") : Promise.resolve());
/** Kalkanı aç; ask: parola kutusu hemen görünsün (açılış kilidi) */
export const shieldOn = (ask: boolean) => (inTauri ? invoke<void>("shield_on", { ask }) : Promise.resolve());
/** Bilgisayar ne kadar süredir açık (sn) */
export const systemUptime = () => (inTauri ? invoke<number>("system_uptime") : Promise.resolve(99_999));
/** Adanın solundaki ses kartı penceresi (x, y: bu pencereye göre mantıksal konum) */
export const sideCard = (show: boolean, x: number, y: number) => invoke<void>("side_card", { show, x, y });
/** Öndeki pencerenin başlık çubuğuna tün (uygun pencere yoksa false) */
export const perchStart = () => (inTauri ? invoke<boolean>("perch_start") : Promise.resolve(false));
export const perchStop = () => (inTauri ? invoke<void>("perch_stop") : Promise.resolve());
/** Odak bekçisi uyarıyor: tam ekranda da ada görünsün */
export const guardAlert = (on: boolean) => (inTauri ? invoke<void>("guard_alert", { on }) : Promise.resolve());

/** Öndeki pencere (Odak bekçisi) */
export interface ForegroundPayload {
  title: string;
  /** Küçük harf, .exe'siz ("chrome") */
  app: string;
}
/** Arşivin içi (zip, rar) — açmadan */
export interface ArchiveEntry {
  path: string;
  size: number;
  dir: boolean;
  encrypted: boolean;
}
export const archiveList = (path: string) => invoke<{ kind: string; entries: ArchiveEntry[] }>("archive_list", { path });
/** Dosyayı/klasörü geçici klasöre çıkarır, yolunu döner */
export const archiveExtract = (path: string, entry: string) => invoke<string>("archive_extract", { path, entry });
export const islandDrag = () => (inTauri ? invoke<void>("island_drag") : Promise.resolve());
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
  /** Hangi pencere için (yoksa tarayıcı önizlemesi) — her pencere yalnızca kendininkini dinler */
  label?: string;
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
    // Bu pencereye yönelik ve herkese gönderilen olaylar; başka pencereye (yan kart, öbür ekrandaki
    // ada) gönderilenler gelmez — yoksa ada, ses kartının "imleç bende değil" olayıyla kapanıyordu
    void listen<T>(event, (e) => handler(e.payload), { target: { kind: "WebviewWindow", label: windowLabel } }).then((fn) => {
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

/** `extra`: adaya bağlı ek alan (yandaki Argus kartı) — imleç oradayken de ada açık kalır. */
export function setHitRect(rect: Rect, extra: Rect | null = null): Promise<void> {
  if (inTauri) return invoke("set_hit_rect", { rect, extra });
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

/** Yalnızca geliştirme önizlemesi: Rust olayını taklit et */
export function devEmit<T>(event: string, payload: T) {
  if (import.meta.env.DEV) webEmit(event, payload);
}

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
