import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  DevicesPayload,
  DownloadItem,
  FileMeta,
  NotificationPayload,
  MediaPayload,
  NativeSettings,
  PrivacyPayload,
  StatsPayload,
  SysEvent,
} from "../lib/bridge";
import { nextFire, type Alarm } from "../lib/alarm";
import type { ToolNote } from "../lib/aiTools";
import type { Weather } from "../lib/weather";
import { detectColor } from "../lib/format";

/** Olay güdümlü ruh hali (dosya yutma). */
export type Mood = "idle" | "hungry" | "chewing" | "happy";

/** Nook'un kendi başına yaptığı kısa hareketler ve olaylara tepkileri. */
export type Antic =
  | "wink"
  | "yawn"
  | "hum"
  | "hop"
  | "wander"
  | "nod"
  | "stretch"
  | "giggle"
  | "surprised"
  | "love"
  | "dizzy"
  | "slap"
  | "annoyed"
  | "shy"
  | "suspicious"
  | "bored";

/** Yüz ifadesi = mood › antic › uyku › yorgunluk (düşük pil) › gece uykululuğu */
export type Expression =
  | Mood
  | Antic
  | "sleepy"
  | "tired"
  | "drowsy"
  | "sulk"
  | "thinking"
  | "alarm"
  | "downloading"
  | "talking"
  // Ses/parlaklık göstergesindeyken: bara iter, geri çeker, kulaklarını kapatır, "şşş"
  | "volUp"
  | "volDown"
  | "loud"
  | "muted";

/** Sohbet mesajı (kalıcı) */
export interface ChatItem {
  id: string;
  role: "user" | "nook";
  text: string;
  /** Nook'un yaptığı işler (alarm kurdu, Wi-Fi'ı kapattı…) */
  notes?: ToolNote[];
  error?: boolean;
  /** "Ekrana sor" görüntüsü (yalnızca bu oturumda tutulur, kaydedilmez) */
  image?: string;
  /** Sesli soruldu */
  voice?: boolean;
}

/** Yüzdeki durum rozeti ve renkli parıltı (Grok Bot'taki gibi). */
export type Status = "working" | "error" | "success" | "annoyed" | "alarm";

export type Tab =
  | "home"
  | "chat"
  | "media"
  | "shelf"
  | "clip"
  | "note"
  | "alarm"
  | "focus"
  | "apps"
  | "notify"
  | "devices"
  | "control"
  | "stats"
  | "play"
  | "report"
  | "today"
  | "argus"
  | "settings";

/** Pomodoro: çalışma → kısa mola (her 4 turda bir uzun mola) */
export type FocusPhase = "work" | "break" | "long";
export interface FocusState {
  phase: FocusPhase;
  /** Bitiş zamanı (ms); duraklatılmışsa null */
  endsAt: number | null;
  /** Duraklatılınca kalan süre (ms) */
  left: number;
  /** Bu fazın toplam süresi (ms) */
  total: number;
  /** Tamamlanan çalışma turu */
  round: number;
}

export interface NotifItem extends NotificationPayload {
  at: number;
}

export interface PinnedApp {
  id: string;
  name: string;
  path: string;
}

/** Bir günün özeti (Karne). Süreler dakika. */
export interface DayStats {
  music: number;
  focus: number;
  pomodoros: number;
  game: number;
  active: number;
  notifs: number;
  /** Nook'la etkileşim sayısı */
  care: number;
  /** Gün boyu sevgi ortalaması için */
  moodSum: number;
  moodN: number;
}

export const EMPTY_DAY: DayStats = { music: 0, focus: 0, pomodoros: 0, game: 0, active: 0, notifs: 0, care: 0, moodSum: 0, moodN: 0 };

/** Yerel tarih anahtarı: 2026-10-02 */
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface NowPlaying extends MediaPayload {
  /** positionMs'in alındığı an (performance.now) — ilerleme çubuğu buradan enterpolasyon yapar */
  at: number;
}

export interface ShelfItem extends FileMeta {
  id: string;
  addedAt: number;
}

export interface ClipItem {
  id: string;
  text: string;
  /** Metin bir renkse normalize edilmiş hali */
  color: string | null;
  at: number;
  /** Yabancı dildeyse Türkçesi */
  translation?: string;
}

export interface Settings extends NativeSettings {
  autostart: boolean;
  osd: boolean;
  events: boolean;
  faceColor: string;
  weather: boolean;
  /** Boşsa konum IP'den tahmin edilir */
  weatherCity: string;
  /** Alarm sesi: Windows Alarm01–10; 0 = sessiz */
  alarmSound: number;
  /** Gemini API anahtarı — yalnızca bu bilgisayarda saklanır */
  geminiKey: string;
  /** Gemini modeli; boşsa en yeni "Pro" seçilir */
  aiModel: string;
  /** Nook'un sana hitap ettiği ad */
  userName: string;
  /** Nook'un senin hakkında hatırladıkları */
  memories: string[];
  /** Kopyalanan yabancı metni Türkçeye çevir */
  translate: boolean;
  /** Windows bildirimlerini adada göster */
  notifications: boolean;
  /** Odaklanırken bildirim kartlarını sustur (listede yine birikir) */
  focusMute: boolean;
  focusWork: number;
  focusBreak: number;
  focusLong: number;
  /** 20-20-20 göz molası */
  eyeBreak: boolean;
  /** Su hatırlatıcısı (dakika; 0 = kapalı) */
  waterEvery: number;
  /** Günün ilk açılışında özet */
  dailySummary: boolean;
  /** Oyundan çıkınca özet kartı */
  gameSummary: boolean;
  /** Nook sıkılınca oyun teklif etsin */
  playOffers: boolean;
  /** Argus profili (kullanıcı adı); boşsa en son kullanılan */
  argusProfile: string;
  /** Argus klasörü elle seçildiyse (boş = otomatik bul) */
  argusDir: string;
  /** Argus'u olmayanlara Argus'u tanıt (ana sayfa çipi) */
  argusPromo: boolean;
  /** Takip ettiğin dizilerin yeni bölüm haberleri */
  argusNews: boolean;
  /** Tarayıcıda izlediğini Argus'la eşleştirip işaretlemeyi teklif et */
  argusDetect: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  autostart: true,
  monitorMode: "primary",
  monitorName: null,
  sleepAfterSec: 90,
  shortcut: "Ctrl+Shift+Space",
  askShortcut: "Ctrl+Shift+A",
  voiceShortcut: "Ctrl+Shift+D",
  autoScreenshots: true,
  osd: true,
  events: true,
  faceColor: "#FFFFFF",
  hideInFullscreen: true,
  weather: true,
  weatherCity: "",
  alarmSound: 1,
  geminiKey: "",
  aiModel: "",
  userName: "",
  memories: [],
  translate: true,
  notifications: true,
  focusMute: true,
  focusWork: 25,
  focusBreak: 5,
  focusLong: 15,
  eyeBreak: true,
  waterEvery: 60,
  dailySummary: true,
  gameSummary: true,
  playOffers: true,
  argusProfile: "",
  argusPromo: true,
  argusDir: "",
  argusNews: true,
  argusDetect: true,
};

export interface Osd {
  kind: "volume" | "brightness";
  value: number;
  muted: boolean;
  /** Son değişimin yönü: 1 arttı, -1 azaldı, 0 aynı */
  dir?: number;
}

export interface Toast extends SysEvent {
  id: string;
  /** Bildirim kartında uygulama ikonu */
  icon?: string | null;
  /** Kart ekranda ne kadar kalsın (ms) */
  ms?: number;
}

const MAX_SHELF = 24;
const MAX_CLIPS = 24;
const MAX_NOTIFS = 30;
const HISTORY = 40;

interface NookState {
  mood: Mood;
  antic: Antic | null;
  asleep: boolean;
  night: boolean;
  hovered: boolean;
  searching: boolean;
  relocating: boolean;
  tab: Tab;
  shelf: ShelfItem[];
  clips: ClipItem[];
  /** Uçucu not — kalıcı değil */
  note: string;
  media: NowPlaying | null;
  stats: StatsPayload | null;
  devices: DevicesPayload | null;
  cpuHistory: number[];
  netHistory: number[];
  osd: Osd | null;
  toasts: Toast[];
  settings: Settings;
  /** Bu ekranda tam ekran bir uygulama var → ada gizli */
  fullscreen: boolean;
  privacy: PrivacyPayload;
  downloads: DownloadItem[];
  weather: Weather | null;
  /** 0–100: Nook'un sana olan sevgisi — ilgilendikçe artar, ihmal edince azalır */
  affection: number;
  /** Son ilgi zamanı (ms) — sevginin azalması buradan hesaplanır */
  lastCare: number;
  /** Nook şu an tutulup sürükleniyor */
  grabbed: boolean;
  /** Açılış animasyonu sürüyor */
  intro: boolean;
  /** "Nook nedir?" tanıtımı açık */
  tour: boolean;
  tourStep: number;
  /** Tanıtım bir kez görüldü (ilk açılışta kendiliğinden açılır) */
  toured: boolean;
  /** Süren arka plan işleri (hava durumu, çevrimiçi arama…) — Nook "düşünür" */
  busy: string[];
  alarms: Alarm[];
  /** Şu an çalan alarm */
  ringing: Alarm | null;
  chat: ChatItem[];
  /** Model cevap yazıyor */
  chatBusy: boolean;
  /** Kelimeler akarken Nook'un ağzı oynar */
  talking: boolean;
  focus: FocusState | null;
  notifications: NotifItem[];
  pinnedApps: PinnedApp[];
  /** Gün gün istatistik (son 30 gün) */
  days: Record<string, DayStats>;
  /** Oyun rekorları */
  scores: Record<string, number>;
  online: boolean;
  /** Fare üzerinde olmasa da açık kalsın ("Ekrana sor") */
  pinned: boolean;
  /** Sesli komut dinleniyor */
  listening: boolean;
  /** Sohbete eklenecek ekran görüntüsü */
  attachment: string | null;
  /** Ada bir dahaki açılışta bu bölümle açılsın (oyun teklifi, günlük özet) */
  pendingTab: Tab | null;
  /** Günlük özetin en son gösterildiği gün */
  summaryDay: string;
  /** Son oyun teklifinin zamanı */
  lastOffer: number;

  setMood: (mood: Mood) => void;
  setAntic: (antic: Antic | null) => void;
  setAsleep: (asleep: boolean) => void;
  setNight: (night: boolean) => void;
  setHovered: (hovered: boolean) => void;
  setSearching: (searching: boolean) => void;
  setRelocating: (relocating: boolean) => void;
  setTab: (tab: Tab) => void;
  addFiles: (files: FileMeta[]) => void;
  revalidateShelf: (alive: FileMeta[]) => void;
  removeShelf: (id: string) => void;
  clearShelf: () => void;
  pushClip: (text: string) => void;
  removeClip: (id: string) => void;
  clearClips: () => void;
  setNote: (note: string) => void;
  setMedia: (media: MediaPayload | null) => void;
  /** Kontrol tuşuna basınca Rust'u beklemeden arayüzü güncelle */
  setPlaying: (playing: boolean) => void;
  setStats: (stats: StatsPayload) => void;
  setDevices: (devices: DevicesPayload) => void;
  setOsd: (osd: Osd | null) => void;
  pushToast: (event: SysEvent & { icon?: string | null; ms?: number }) => void;
  shiftToast: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setFullscreen: (fullscreen: boolean) => void;
  setPrivacy: (privacy: PrivacyPayload) => void;
  setDownloads: (downloads: DownloadItem[]) => void;
  setWeather: (weather: Weather | null) => void;
  /** Sevgi ekle (etkileşim) ya da çıkar (ihmal) */
  care: (delta: number) => void;
  setGrabbed: (grabbed: boolean) => void;
  setIntro: (intro: boolean) => void;
  setTour: (tour: boolean) => void;
  setTourStep: (tourStep: number) => void;
  setBusy: (key: string, on: boolean) => void;
  addAlarm: (a: Omit<Alarm, "id" | "next" | "enabled"> & { at?: number }) => void;
  toggleAlarm: (id: string, enabled: boolean) => void;
  setAlarmSilent: (id: string, silent: boolean) => void;
  removeAlarm: (id: string) => void;
  /** Çalma anı geldi: tekrar eden alarm bir sonrakine kurulur, tek seferlik kapanır/silinir */
  fireAlarm: (id: string) => void;
  /** Uygulama kapalıyken kaçırılan alarmları sessizce ileri al */
  rescheduleAlarms: () => void;
  setRinging: (a: Alarm | null) => void;
  pushChat: (m: ChatItem) => void;
  patchChat: (id: string, patch: Partial<ChatItem>) => void;
  clearChat: () => void;
  setChatBusy: (b: boolean) => void;
  setTalking: (b: boolean) => void;
  setFocus: (f: FocusState | null) => void;
  pushNotification: (n: NotificationPayload) => void;
  clearNotifications: () => void;
  pinApp: (a: Omit<PinnedApp, "id">) => void;
  unpinApp: (id: string) => void;
  /** Bugünün istatistiğine ekle */
  track: (patch: Partial<DayStats>) => void;
  setScore: (game: string, score: number) => void;
  setOnline: (online: boolean) => void;
  setPinned: (pinned: boolean) => void;
  setListening: (listening: boolean) => void;
  setAttachment: (image: string | null) => void;
  setPendingTab: (tab: Tab | null) => void;
  setSummaryDay: (day: string) => void;
  setLastOffer: (at: number) => void;
  patchClip: (id: string, patch: Partial<ClipItem>) => void;
}

const push = (list: number[], v: number) => [...list, v].slice(-HISTORY);

export const useNook = create<NookState>()(
  persist(
    (set) => ({
      mood: "idle",
      antic: null,
      asleep: false,
      night: false,
      hovered: false,
      searching: false,
      relocating: false,
      tab: "home",
      shelf: [],
      clips: [],
      note: "",
      media: null,
      stats: null,
      devices: null,
      cpuHistory: [],
      netHistory: [],
      osd: null,
      toasts: [],
      settings: DEFAULT_SETTINGS,
      fullscreen: false,
      privacy: { mic: [], camera: [] },
      downloads: [],
      weather: null,
      affection: 60,
      lastCare: Date.now(),
      grabbed: false,
      intro: true,
      tour: false,
      tourStep: 0,
      toured: false,
      busy: [],
      alarms: [],
      ringing: null,
      chat: [],
      chatBusy: false,
      talking: false,
      focus: null,
      notifications: [],
      pinnedApps: [],
      days: {},
      scores: {},
      online: true,
      pinned: false,
      listening: false,
      attachment: null,
      pendingTab: null,
      summaryDay: "",
      lastOffer: 0,

      setMood: (mood) => set({ mood }),
      setAntic: (antic) => set({ antic }),
      setAsleep: (asleep) => set({ asleep }),
      setNight: (night) => set({ night }),
      setHovered: (hovered) => set({ hovered }),
      setSearching: (searching) => set({ searching }),
      setRelocating: (relocating) => set({ relocating }),
      setTab: (tab) => set({ tab }),

      addFiles: (files) =>
        set((s) => {
          const incoming = new Set(files.map((f) => f.path));
          const fresh = files.map((f) => ({ ...f, id: crypto.randomUUID(), addedAt: Date.now() }));
          return { shelf: [...fresh, ...s.shelf.filter((i) => !incoming.has(i.path))].slice(0, MAX_SHELF) };
        }),
      revalidateShelf: (alive) =>
        set((s) => {
          const byPath = new Map(alive.map((m) => [m.path, m]));
          return {
            shelf: s.shelf.flatMap((i) => {
              const m = byPath.get(i.path);
              return m ? [{ ...i, ...m }] : [];
            }),
          };
        }),
      removeShelf: (id) => set((s) => ({ shelf: s.shelf.filter((i) => i.id !== id) })),
      clearShelf: () => set({ shelf: [] }),

      pushClip: (text) =>
        set((s) => ({
          clips: [
            { id: crypto.randomUUID(), text, color: detectColor(text), at: Date.now() },
            ...s.clips.filter((c) => c.text !== text),
          ].slice(0, MAX_CLIPS),
        })),
      removeClip: (id) => set((s) => ({ clips: s.clips.filter((c) => c.id !== id) })),
      clearClips: () => set({ clips: [] }),

      setNote: (note) => set({ note }),

      setMedia: (m) =>
        set((s) => {
          if (!m) return { media: null };
          const sameTrack = s.media?.trackKey === m.trackKey;
          return {
            media: { ...m, artwork: m.artwork ?? (sameTrack ? s.media!.artwork : null), at: performance.now() },
          };
        }),
      setPlaying: (playing) =>
        set((s) => {
          if (!s.media) return {};
          const elapsed = s.media.playing ? performance.now() - s.media.at : 0;
          const positionMs = Math.min(s.media.durationMs || Infinity, s.media.positionMs + elapsed);
          return { media: { ...s.media, playing, positionMs, at: performance.now() } };
        }),

      setStats: (stats) =>
        set((s) => ({
          stats,
          cpuHistory: push(s.cpuHistory, stats.cpu),
          netHistory: push(s.netHistory, stats.netDown),
        })),
      setDevices: (devices) => set({ devices }),
      setOsd: (osd) => set({ osd }),
      pushToast: (event) => set((s) => ({ toasts: [...s.toasts, { ...event, id: crypto.randomUUID() }].slice(-5) })),
      shiftToast: () => set((s) => ({ toasts: s.toasts.slice(1) })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setFullscreen: (fullscreen) => set({ fullscreen }),
      setPrivacy: (privacy) => set({ privacy }),
      setDownloads: (downloads) => set({ downloads }),
      setWeather: (weather) => set({ weather }),
      care: (delta) =>
        set((s) => {
          // Karne: bugünkü etkileşim sayısı
          const key = dayKey();
          return {
            affection: Math.max(0, Math.min(100, s.affection + delta)),
            lastCare: delta > 0 ? Date.now() : s.lastCare,
            days: delta > 0 ? { ...s.days, [key]: { ...EMPTY_DAY, ...s.days[key], care: (s.days[key]?.care ?? 0) + 1 } } : s.days,
          };
        }),
      setGrabbed: (grabbed) => set({ grabbed }),
      setIntro: (intro) => set({ intro }),
      setTour: (tour) => set(tour ? { tour, tourStep: 0 } : { tour, toured: true }),
      setTourStep: (tourStep) => set({ tourStep }),
      addAlarm: ({ at, ...a }) =>
        set((s) => ({
          alarms: [...s.alarms, { ...a, id: crypto.randomUUID(), enabled: true, next: at ?? nextFire(a) }].sort(
            (x, y) => (x.next ?? Infinity) - (y.next ?? Infinity),
          ),
        })),
      toggleAlarm: (id, enabled) =>
        set((s) => ({ alarms: s.alarms.map((a) => (a.id === id ? { ...a, enabled, next: enabled ? nextFire(a) : null } : a)) })),
      removeAlarm: (id) => set((s) => ({ alarms: s.alarms.filter((a) => a.id !== id) })),
      setAlarmSilent: (id, silent) => set((s) => ({ alarms: s.alarms.map((a) => (a.id === id ? { ...a, silent } : a)) })),
      fireAlarm: (id) =>
        set((s) => ({
          alarms: s.alarms
            .filter((a) => !(a.id === id && a.oneShot))
            .map((a) =>
              a.id !== id ? a : a.repeat === "once" ? { ...a, enabled: false, next: null } : { ...a, next: nextFire(a, Date.now() + 1000) },
            ),
        })),
      rescheduleAlarms: () =>
        set((s) => ({
          alarms: s.alarms
            .filter((a) => !(a.oneShot && a.next !== null && a.next < Date.now() - 60_000))
            .map((a) =>
              a.enabled && a.next !== null && a.next < Date.now() - 60_000
                ? a.repeat === "once"
                  ? { ...a, enabled: false, next: null }
                  : { ...a, next: nextFire(a) }
                : a,
            ),
        })),
      setRinging: (ringing) => set({ ringing }),
      pushChat: (m) => set((s) => ({ chat: [...s.chat, m].slice(-60) })),
      patchChat: (id, patch) => set((s) => ({ chat: s.chat.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      clearChat: () => set({ chat: [] }),
      setChatBusy: (chatBusy) => set({ chatBusy }),
      setTalking: (talking) => set({ talking }),
      setFocus: (focus) => set({ focus }),
      pushNotification: (n) =>
        set((s) => ({ notifications: [{ ...n, at: Date.now() }, ...s.notifications.filter((x) => x.id !== n.id)].slice(0, MAX_NOTIFS) })),
      clearNotifications: () => set({ notifications: [] }),
      pinApp: (a) =>
        set((s) => (s.pinnedApps.some((p) => p.path === a.path) ? {} : { pinnedApps: [...s.pinnedApps, { ...a, id: crypto.randomUUID() }].slice(0, 12) })),
      unpinApp: (id) => set((s) => ({ pinnedApps: s.pinnedApps.filter((p) => p.id !== id) })),
      track: (patch) =>
        set((s) => {
          const key = dayKey();
          const cur = { ...EMPTY_DAY, ...s.days[key] };
          for (const [k, v] of Object.entries(patch) as [keyof DayStats, number][]) cur[k] += v;
          // Yalnızca son 30 gün tutulur
          const keep = Object.keys(s.days).filter((k) => k !== key).sort().slice(-29);
          return { days: { ...Object.fromEntries(keep.map((k) => [k, s.days[k]])), [key]: cur } };
        }),
      setScore: (game, score) => set((s) => ((s.scores[game] ?? 0) >= score ? {} : { scores: { ...s.scores, [game]: score } })),
      setOnline: (online) => set({ online }),
      setPinned: (pinned) => set({ pinned }),
      setListening: (listening) => set({ listening }),
      setAttachment: (attachment) => set({ attachment }),
      setPendingTab: (pendingTab) => set({ pendingTab }),
      setSummaryDay: (summaryDay) => set({ summaryDay }),
      setLastOffer: (lastOffer) => set({ lastOffer }),
      patchClip: (id, patch) => set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      setBusy: (key, on) =>
        set((s) => ({ busy: on ? [...s.busy.filter((k) => k !== key), key] : s.busy.filter((k) => k !== key) })),
    }),
    {
      name: "nook",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        shelf: s.shelf,
        clips: s.clips,
        tab: s.tab,
        settings: s.settings,
        affection: s.affection,
        lastCare: s.lastCare,
        alarms: s.alarms,
        // Ekran görüntüleri büyük — kaydedilmez
        chat: s.chat.map(({ image: _image, ...m }) => m),
        focus: s.focus,
        notifications: s.notifications,
        pinnedApps: s.pinnedApps,
        days: s.days,
        scores: s.scores,
        summaryDay: s.summaryDay,
        lastOffer: s.lastOffer,
        toured: s.toured,
      }),
      // Yeni eklenen ayar alanları eski kayıtlarda da varsayılanla gelsin.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<NookState>;
        const settings = { ...DEFAULT_SETTINGS, ...p.settings };
        // Yerel (Ollama) dönemden kalan model adı Gemini'de yok
        if (!settings.aiModel.startsWith("gemini")) settings.aiModel = "";
        // İlk sürümün varsayılanı birçok bilgisayarda başka programlarca tutuluyordu
        if (settings.askShortcut === "Ctrl+Shift+X" || settings.askShortcut === "Ctrl+Shift+E") settings.askShortcut = DEFAULT_SETTINGS.askShortcut;
        return { ...current, ...p, settings };
      },
    },
  ),
);

/** Pil yok/şarjda değilse ve %20 altındaysa Nook yorgun görünür. */
export const selectBatteryLow = (s: NookState) =>
  !!s.stats?.battery && !s.stats.battery.charging && s.stats.battery.percent <= 20;

/** Sevgi bu seviyenin altındaysa Nook küser. */
export const SULK_BELOW = 25;

/**
 * Nook gerçekten uyuyor mu: sistem boşta AMA bir şey çalmıyorsa.
 * Müzik/video dinlerken klavyeye dokunmamak normal — o sırada uyumaz.
 */
export const isSleeping = (s: Pick<NookState, "asleep" | "media">) => s.asleep && !s.media?.playing;

export function expressionOf(s: NookState): Expression {
  if (s.ringing) return "alarm";
  if (s.mood !== "idle") return s.mood;
  if (s.grabbed) return "surprised";
  // Ses/parlaklık değişirken Nook bara tepki verir
  if (s.osd) {
    if (s.osd.kind === "volume" && s.osd.muted) return "muted";
    if (s.osd.kind === "volume" && s.osd.value >= 0.85) return "loud";
    return (s.osd.dir ?? 0) < 0 ? "volDown" : "volUp";
  }
  if (s.antic) return s.antic;
  if (s.busy.length) return "thinking";
  if (s.talking) return "talking";
  if (s.downloads.length) return "downloading";
  // Müzik/video çalarken dalgalı gözler (idle) gece/yorgun/küs hâllerin önüne geçer
  if (s.media?.playing) return "idle";
  // Tanıtımı anlatırken uyumaz
  if (isSleeping(s) && !s.tour) return "sleepy";
  if (s.affection < SULK_BELOW) return "sulk";
  if (selectBatteryLow(s)) return "tired";
  if (s.night) return "drowsy";
  return "idle";
}

const ERROR_KINDS = new Set(["battery-low", "device-low", "unplugged", "offline"]);
const SUCCESS_KINDS = new Set(["charging", "download", "screenshot", "headset-charging", "usb-in", "online", "bt-in", "focus"]);

/** Rozet/parıltı rengi: olay kartı › kızgınlık › süren iş › yeni yemek yemiş › yok */
export function statusOf(s: NookState): Status | null {
  if (s.ringing) return "alarm";
  if (s.listening) return "working";
  const toast = s.toasts[0];
  if (toast && ERROR_KINDS.has(toast.kind)) return "error";
  if (toast && SUCCESS_KINDS.has(toast.kind)) return "success";
  if (s.antic === "annoyed") return "annoyed";
  if (s.busy.length || s.searching || s.downloads.length) return "working";
  if (s.mood === "happy") return "success";
  if (!s.online) return "error";
  return null;
}
