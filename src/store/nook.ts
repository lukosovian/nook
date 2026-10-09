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
  SysEventKind,
} from "../lib/bridge";
import { nextFire, type Alarm } from "../lib/alarm";
import { DJ_MOVES, MAX_HUMS, type HumEntry, type HumState } from "../lib/hum";
import type { ToolNote } from "../lib/aiTools";
import type { Weather } from "../lib/weather";
import type { Look } from "../lib/look";
import type { SceneMode } from "../components/shield/catalog";
import { detectColor } from "../lib/format";
import { lang as initialLang } from "../lib/i18n";

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
  | "bored"
  | "drink"
  // Boşta: etrafa bakınır, hapşırır, döner, sakız şişirir, kitap okur
  | "lookAround"
  | "sneeze"
  | "spin"
  | "gum"
  | "read"
  // Havaya göre: soğukta kamp ateşi, yağmurda şemsiye, sıcakta yelpaze
  | "campfire"
  | "umbrella"
  | "hot"
  // Not alırken kâğıt-kalem, ararken büyüteç
  | "note"
  | "magnify";

/** Nook adadan dışarıda: pencere üstüne tünemiş, iple sarkıyor ya da balık tutuyor */
export type Outing = "perch" | "hang" | "fish";

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
  /** Sohbette cevap yazarken kâğıt-kalem */
  | "writing"
  // Ses/parlaklık göstergesindeyken: bara iter, geri çeker, kulaklarını kapatır, "şşş"
  | "volUp"
  | "volDown"
  | "loud"
  | "muted"
  /** Pomodoro sürerken masasında çalışır */
  | "focused"
  /** Odak bekçisi: cama vurup saati gösterir */
  | "knock"
  /** Canlı yayın / ekran paylaşımı: elinde mikrofon, yanında "Canlı" tabelası */
  | "live"
  /** Hum dinlerken (her seferinde biri): kafa sallar, salınır, zıplar, kulaklığa bastırır, plak çizer, döner */
  | "djNod"
  | "djSway"
  | "djBounce"
  | "djEar"
  | "djScratch"
  | "djSpin";

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
  | "look"
  | "notes"
  | "archive"
  | "calendar"
  | "year"
  | "claude"
  | "hum"
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
  /** İçilen bardak su */
  water: number;
}

/** Bir yılın birikmiş özeti (yıl özeti kartı). Süreler dakika. */
export interface YearStats {
  active: number;
  music: number;
  focus: number;
  pomodoros: number;
  game: number;
  notifs: number;
  care: number;
  water: number;
  /** Nook'la oynanan mini oyun sayısı */
  plays: number;
  /** Nook'a yedirilen dosya */
  feeds: number;
  /** Çalmaya başlayan şarkı */
  songs: number;
  /** Saat başına bilgisayar başında geçen dakika (0–23) */
  hours: number[];
  /** Bilgisayar başında olunan günler */
  days: string[];
  /** Sanatçı başına dinlenen dakika (en çok 60 sanatçı) */
  artists: Record<string, number>;
}

export const emptyYear = (): YearStats => ({ active: 0, music: 0, focus: 0, pomodoros: 0, game: 0, notifs: 0, care: 0, water: 0, plays: 0, feeds: 0, songs: 0, hours: Array(24).fill(0), days: [], artists: {} });

export const EMPTY_DAY: DayStats = { music: 0, focus: 0, pomodoros: 0, game: 0, active: 0, notifs: 0, care: 0, moodSum: 0, moodN: 0, water: 0 };

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
  /** Sabitlenen öğe "Temizle"de ve bırakınca kaldırılmaz */
  pinned?: boolean;
}

export interface ClipItem {
  id: string;
  /** Metin; görselde "1920×1080", dosyalarda adlar */
  text: string;
  /** Metin bir renkse normalize edilmiş hali */
  color: string | null;
  at: number;
  /** Yabancı dildeyse Türkçesi */
  translation?: string;
  /** Yabancı metin; çevirmek için ücretsiz servise gönderme izni bekleniyor */
  askTranslate?: boolean;
  /** Yoksa metin */
  kind?: "text" | "image" | "files";
  /** Görsel: önbellekteki PNG */
  path?: string;
  /** Dosyalar */
  paths?: string[];
  /** Sabitlenen kayıt silinmez, listenin başında durur */
  pinned?: boolean;
  /** Kopyalayan uygulama */
  app?: string;
}

/** Karalama defterinin bir sekmesi */
export interface Pad {
  id: string;
  title: string;
  text: string;
  /** Son düzenleme (ms) — "dokunulmazsa temizle" buna bakar */
  at: number;
}

/** Kronometre: çalışıyorsa başlangıcı, duraklatılmışsa birikmiş süre */
export interface Stopwatch {
  startedAt: number | null;
  acc: number;
  laps: number[];
}

/** Abone olunan takvimden (Google/Outlook .ics) gelen etkinlik — salt okunur */
export interface ExtEvent {
  id: string;
  day: string;
  /** "14:30"; boşsa gün boyu */
  time: string;
  title: string;
  /** Başlangıç / bitiş (ms) */
  start: number;
  end: number;
  allDay: boolean;
}

export interface Settings extends NativeSettings {
  autostart: boolean;
  osd: boolean;
  events: boolean;
  faceColor: string;
  /** Kullanıcının Nook'a verdiği isim (boş = "Nook") */
  nookName: string;
  /** Gövde, gözler, gözlük, aksesuarlar (lib/look) */
  look: Look;
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
  /**
   * Gemini anahtarı yokken ücretsiz çeviri servisi (MyMemory) kullanılsın mı. null: henüz
   * sorulmadı — ilk yabancı metinde Pano'da izin istenir, metin izinsiz dışarı gönderilmez.
   */
  freeTranslate: boolean | null;
  /** Tepsiden "1 saat sessiz": bu ana kadar (ms) kartlar, hatırlatmalar ve sesler susar; alarm ve takvim yine çalar */
  quietUntil: number;
  /** Panoya kart, IBAN, anahtar, şifre kopyalanınca uyar ve bir dakika sonra sil */
  sensitiveGuard: boolean;
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
  /** Bu kadar dakika uzakta kalınca dönüşte karşılasın (0 = kapalı) */
  welcomeBack: number;
  /** Açılış animasyonu: "random" ya da bir efekt (overlays/Intro) */
  introStyle: "random" | "dust" | "warp" | "ripple" | "orbit" | "confetti" | "sparkle" | "bubbles" | "trek";
  /** Ekranlar arası geçiş efekti: "random" ya da bir efekt (lib/moveFx) */
  moveStyle: "random" | "beam" | "warp" | "portal" | "jump" | "slide" | "glitch";
  /** Pilde / enerji tasarrufunda animasyonları yavaşlat */
  powerSaver: boolean;
  /** Argus profili (kullanıcı adı); boşsa en son kullanılan */
  argusProfile: string;
  /** Argus klasörü elle seçildiyse (boş = otomatik bul) */
  argusDir: string;
  /** Arayüz dili */
  lang: import("../lib/i18n").Lang;
  /** Renk körlüğü paleti */
  colorVision: import("../lib/palette").ColorVision;
  /** Nook ara sıra dışarı çıksın: pencere üstüne tüner, iple sarkar, boştayken balık tutar */
  outings: boolean;
  /** Odak bekçisi: çalışırken dikkat dağıtan siteye girince uyarır */
  focusGuard: boolean;
  /** Bekçinin uyardığı siteler/uygulamalar (başlıkta ya da uygulama adında geçen) */
  focusSites: string[];
  /** Ana sayfa çiplerinin sırası (kullanıcı sürükleyip dizer; boşsa varsayılan) */
  homeOrder: string[];
  /** Ana sayfada gizlenen çipler */
  homeHidden: string[];
  /** Argus'u olmayanlara Argus'u tanıt (ana sayfa çipi) */
  argusPromo: boolean;
  /** Takip ettiğin dizilerin yeni bölüm haberleri */
  argusNews: boolean;
  /** Tarayıcıda izlediğini Argus'la eşleştirip işaretlemeyi teklif et */
  argusDetect: boolean;
  /** Parola kilidi: kalkan yalnızca parolayla kalkar */
  lockEnabled: boolean;
  /** Parolanın tuzlu SHA-256 özeti ("tuz:özet"); parolanın kendisi saklanmaz */
  lockHash: string;
  /** Bilgisayar açılınca kalkanla (parola sorarak) başla */
  lockOnBoot: boolean;
  /** Ana sayfa profili: hepsi, iş, oyun, eğlence */
  homeProfile: HomeProfile;
  /** Ada açılınca solunda ses kartı */
  soundCard: boolean;
  /** Kalkan mikrofonu kapatıp açarken rozet ve klik sesi */
  shieldMicFx: boolean;
  /** Kalkan sahnesi: karışık, sırayla ya da hep aynısı */
  shieldSceneMode: SceneMode;
  /** Karışık / sırayla modunda gelen sahneler (boşsa hepsi) */
  shieldScenes: string[];
  /** "Hep aynısı" modunda gelen sahne */
  shieldScene: string;
  /** Sırayla modunda sıradaki sahnenin yeri */
  shieldSceneNext: number;
  /** Panoda bu uygulamalardan kopyalananlar geçmişe girmez (exe adı, küçük harf) */
  clipIgnore: string[];
  /** Kopyaladıktan bu kadar dakika sonra pano boşalır (0 = kapalı) */
  clipAutoClear: number;
  /** Ekran kilitlenince panoyu boşalt */
  clipClearOnLock: boolean;
  /** Ekrandan alınan renk hangi biçimde kopyalansın */
  colorFormat: "hex" | "rgb" | "hsl";
  /** HEX'i # olmadan kopyala */
  colorNoHash: boolean;
  /** Raftan dışarı bırakılan öğe raftan kalksın (sabitlenenler kalır) */
  shelfRemoveAfterDrop: boolean;
  /** Ses karıştırıcıda gizlenen / sabitlenen uygulamalar (anahtar) */
  mixerHidden: string[];
  mixerPinned: string[];
  /** Takvim abonelikleri (.ics adresleri) */
  calFeeds: string[];
  /** Kapalı adada sıradaki etkinliğe geri sayım */
  calCountdown: boolean;
  /** Abone takvimdeki etkinliklerden kaç dakika önce haber versin (-1 = vermesin) */
  calRemindExt: number;
  /** Uzun süre yüksek işlemci/bellek, dolan disk için uyarı */
  sysAlerts: boolean;
  /** Karalama sekmesi bu kadar gün dokunulmazsa kendini temizler (0 = asla) */
  padClear: number;
  /** Çalan şarkının sözleri (lrclib.net'ten) */
  lyrics: boolean;
  /** Ekran paylaşımı / yayın algılanınca hassas bölümleri gizle */
  liveMask: boolean;
  /** Arayüz sesleri: ada açılıp kapanırken, olay kartı gelince, Nook sevinince (lib/sfx) */
  uiSounds: boolean;
  /** Arayüz seslerinin yüksekliği (0–1) */
  uiVolume: number;
  /** Ana sayfa profilleri ("Hepsi" hariç); yoksa varsayılanlar (lib/profiles) */
  profiles?: import("../lib/profiles").ProfileDef[];
}

/** "all" ya da kullanıcının profillerinden birinin kimliği (lib/profiles) */
export type HomeProfile = string;

/** Takvim etkinliği; hatırlatması tek seferlik bir alarm olarak kurulur */
export interface CalEvent {
  id: string;
  /** Yerel gün: 2026-10-06 */
  day: string;
  /** "14:30"; boşsa gün boyu */
  time: string;
  title: string;
  /** Kaç dakika önce hatırlatılsın; -1 = hatırlatma yok */
  remind: number;
  /** Hatırlatma alarmı */
  alarmId?: string;
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
  faceColor: "#F4F4F6",
  nookName: "",
  look: { shape: "sphere", texture: "smooth", eyes: "pill", glasses: "none", head: "none", neck: "none" },
  hideInFullscreen: true,
  islandPos: null,
  sensitiveGuard: true,
  shieldShortcut: "Ctrl+Alt+H",
  weather: true,
  weatherCity: "",
  alarmSound: 1,
  geminiKey: "",
  aiModel: "",
  userName: "",
  memories: [],
  translate: true,
  freeTranslate: null,
  quietUntil: 0,
  notifications: true,
  focusMute: true,
  focusWork: 25,
  focusBreak: 5,
  focusLong: 15,
  eyeBreak: true,
  waterEvery: 60,
  dailySummary: true,
  gameSummary: true,
  gameIntro: true,
  breakReminderMin: 120,
  playOffers: true,
  welcomeBack: 10,
  introStyle: "random",
  moveStyle: "random",
  powerSaver: true,
  argusProfile: "",
  argusPromo: true,
  argusDir: "",
  argusNews: true,
  argusDetect: true,
  outings: true,
  uiScale: 1,
  colorVision: "normal",
  // Eski kurulumlarda Türkçe, yeni kurulumda sistemin dili (bkz. lib/i18n)
  lang: initialLang,
  homeOrder: [],
  homeHidden: [],
  focusGuard: true,
  focusSites: ["YouTube", "X", "Instagram", "TikTok", "Reddit", "Facebook", "Twitch"],
  shieldLock: false,
  lockEnabled: false,
  lockHash: "",
  lockOnBoot: true,
  homeProfile: "all",
  soundCard: true,
  shieldMicFx: true,
  shieldMuteMic: true,
  shieldMuteCalls: true,
  shieldSceneMode: "random",
  shieldScenes: [],
  shieldScene: "campfire",
  shieldSceneNext: 0,
  clipIgnore: ["keepass", "keepassxc", "1password", "bitwarden", "lastpass", "dashlane"],
  clipAutoClear: 0,
  clipClearOnLock: false,
  // Varsayılan kapalı: Ctrl+Alt+V Word ve Excel'de Özel Yapıştır; isteyen Ayarlar › Kısayollar'dan açar
  plainPasteShortcut: "",
  colorFormat: "hex",
  colorNoHash: false,
  shelfShake: true,
  shelfShortcut: "Ctrl+Alt+S",
  shelfRemoveAfterDrop: false,
  outputShortcut: "",
  outputCycle: [],
  headphoneDrop: 0,
  mixerHidden: [],
  mixerPinned: [],
  calFeeds: [],
  calCountdown: true,
  calRemindExt: 10,
  sysAlerts: true,
  padClear: 0,
  lyrics: false,
  liveMask: true,
  liveShortcut: "Ctrl+Alt+L",
  humShortcut: "Ctrl+Alt+M",
  humAuto: false,
  uiSounds: true,
  uiVolume: 0.6,
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
/** Sabitlenmemiş kayıtların sınırı (sabitlenenler ayrıca, en fazla 30) */
const MAX_CLIPS = 30;
const MAX_PINNED = 30;
const MAX_PADS = 8;
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
  /** Ekran geçiş efekti (kaybolma/belirme) */
  move: import("../lib/moveFx").Move | null;
  tab: Tab;
  shelf: ShelfItem[];
  clips: ClipItem[];
  /** Açık karalama sekmesinin metni (pads içindekinin kopyası) */
  note: string;
  pads: Pad[];
  padId: string;
  stopwatch: Stopwatch | null;
  /** Abone takvimlerin etkinlikleri ve son eşitleme */
  extEvents: ExtEvent[];
  extSyncedAt: number;
  /** Bu oturumdaki ağ trafiği (bayt) */
  netTotals: { down: number; up: number };
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
  /** Kalıcı hatırlatma (su): kullanıcı cevaplayana kadar adada durur */
  reminder: { kind: "water"; phase: "due" | "drinking" } | null;
  /** Claude Code izin/soru kartı adada (bkz. lib/claude) */
  claudeCard: boolean;
  /** Açık adanın "tam ekran" hâli: ada ekrana yayılır (boyutu pencere büyüyünce ölçülür) */
  big: { width: number; height: number } | null;
  /** "Nook nedir?" tanıtımı açık */
  tour: boolean;
  tourStep: number;
  /** Ayarlar açılınca bu bölüme kaydırılsın (ör. "Kısayollar"); kaydırınca boşalır */
  settingsJump: string | null;
  /** Tanıtım bir kez görüldü (ilk açılışta kendiliğinden açılır) */
  toured: boolean;
  /** Süren arka plan işleri (hava durumu, çevrimiçi arama…) — Nook "düşünür" */
  busy: string[];
  alarms: Alarm[];
  /** Şu an çalan alarm */
  ringing: Alarm | null;
  /** Hum: bulunan şarkılar (yeniden eskiye) */
  hums: HumEntry[];
  /** Hum dinliyor ya da sonucu gösteriyor */
  hum: HumState | null;
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
  /** Ada dışına taşan bir etkileşim sürüyor (ekrandan renk seçme, açılır liste) — ada kapanmaz */
  holds: string[];
  /** Sesli komut dinleniyor */
  listening: boolean;
  /** Sohbete eklenecek ekran görüntüsü */
  attachment: string | null;
  /** Ada bir dahaki açılışta bu bölümle açılsın (oyun teklifi, günlük özet) */
  pendingTab: Tab | null;
  /** Günlük özetin en son gösterildiği gün */
  summaryDay: string;
  /** Günün özeti büyük adada açık */
  brief: boolean;
  /** Yama notları büyük adada açık */
  notes: boolean;
  /** Karne büyük adada açık */
  report: boolean;
  /** Adaya bırakılan arşiv (açmadan içine bakılır) */
  archive: { path: string; kind: string; entries: import("../lib/bridge").ArchiveEntry[] } | null;
  /** Kendiliğinden gösterilen son yama notunun sürümü (bir kez görülen bir daha açılmaz) */
  notesSeen: string;
  /** Son oyun teklifinin zamanı */
  lastOffer: number;
  /** Nook adanın dışında (adadaki yeri boş) */
  outing: Outing | null;
  /** Odak bekçisi uyarıyor: hangi site */
  guard: { site: string } | null;
  /** Açılış kilidi: bilgisayar açıldı, parola adada yazılana kadar Nook kapalı */
  gate: boolean;
  /** Balıkta tutulanlar (toplam) */
  catches: { stars: number; trash: number };
  /** Takvim etkinlikleri */
  events: CalEvent[];
  /** Yıl yıl özet ("2026") */
  year: Record<string, YearStats>;
  /** Yıl özeti kendiliğinden en son hangi yıl gösterildi */
  yearShown: string;
  /** Algılanan ekran paylaşımı / yayın */
  liveAuto: { on: boolean; source: string };
  /** Elle açılıp kapatıldıysa (kısayol, CANLI rozeti); null = algılamaya bak */
  liveManual: boolean | null;
  setLive: (auto: { on: boolean; source: string } | null, manual?: boolean | null) => void;
  /** Yıl özetine ekle (gün sayaçları dışındakiler: oyun, yedirme, şarkı) */
  yearAdd: (patch: Partial<Pick<YearStats, "plays" | "feeds" | "songs">>) => void;
  setYearShown: (y: string) => void;
  /** Ana sayfa düzenleniyor (sırala, gizle, profile bölüm seç) */
  homeEdit: boolean;
  setHomeEdit: (on: boolean) => void;

  setMood: (mood: Mood) => void;
  setAntic: (antic: Antic | null) => void;
  setAsleep: (asleep: boolean) => void;
  setNight: (night: boolean) => void;
  setHovered: (hovered: boolean) => void;
  setSearching: (searching: boolean) => void;
  setRelocating: (relocating: boolean) => void;
  setMove: (move: import("../lib/moveFx").Move | null) => void;
  setTab: (tab: Tab) => void;
  addFiles: (files: FileMeta[]) => void;
  revalidateShelf: (alive: FileMeta[]) => void;
  removeShelf: (id: string) => void;
  clearShelf: () => void;
  pushClip: (text: string, app?: string) => void;
  pushClipImage: (path: string, width: number, height: number, app?: string) => void;
  pushClipFiles: (paths: string[], app?: string) => void;
  pinClip: (id: string, pinned: boolean) => void;
  editClip: (id: string, text: string) => void;
  removeClip: (id: string) => void;
  clearClips: () => void;
  pinShelf: (id: string, pinned: boolean) => void;
  setNote: (note: string) => void;
  setPad: (id: string) => void;
  addPad: () => void;
  removePad: (id: string) => void;
  renamePad: (id: string, title: string) => void;
  /** Uzun süre dokunulmayan sekmeleri boşalt */
  expirePads: (days: number) => void;
  setStopwatch: (sw: Stopwatch | null) => void;
  setExtEvents: (events: ExtEvent[]) => void;
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
  setBig: (big: NookState["big"]) => void;
  setReminder: (reminder: NookState["reminder"]) => void;
  setClaudeCard: (claudeCard: boolean) => void;
  setTourStep: (tourStep: number) => void;
  setSettingsJump: (settingsJump: string | null) => void;
  setBusy: (key: string, on: boolean) => void;
  setHold: (key: string, on: boolean) => void;
  addAlarm: (a: Omit<Alarm, "id" | "next" | "enabled"> & { at?: number }) => void;
  toggleAlarm: (id: string, enabled: boolean) => void;
  /** Kurulu alarmı düzenle: saat/isim/tekrar/ses değişir, alarm açılıp yeniden kurulur */
  updateAlarm: (id: string, a: Pick<Alarm, "hour" | "minute" | "label" | "repeat" | "silent">) => void;
  setAlarmSilent: (id: string, silent: boolean) => void;
  removeAlarm: (id: string) => void;
  /** Çalma anı geldi: tekrar eden alarm bir sonrakine kurulur, tek seferlik kapanır/silinir */
  fireAlarm: (id: string) => void;
  /** Uygulama kapalıyken kaçırılan alarmları sessizce ileri al */
  rescheduleAlarms: () => void;
  setRinging: (a: Alarm | null) => void;
  setHum: (hum: HumState | null) => void;
  /** Bulunan şarkıyı geçmişe ekle (aynı şarkı 10 dk içinde tekrar bulunduysa yalnızca öne alır) */
  addHum: (e: Omit<HumEntry, "id" | "at">) => void;
  removeHum: (id: string) => void;
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
  setBrief: (brief: boolean) => void;
  setNotes: (notes: boolean) => void;
  setReport: (report: boolean) => void;
  setArchive: (archive: NookState["archive"]) => void;
  setNotesSeen: (version: string) => void;
  setSummaryDay: (day: string) => void;
  setLastOffer: (at: number) => void;
  setOuting: (outing: Outing | null) => void;
  setGuard: (guard: NookState["guard"]) => void;
  setGate: (gate: boolean) => void;
  addCatch: (kind: "stars" | "trash") => void;
  patchClip: (id: string, patch: Partial<ClipItem>) => void;
  addEvent: (e: Omit<CalEvent, "id" | "alarmId">) => void;
  removeEvent: (id: string) => void;
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
      move: null,
      tab: "home",
      shelf: [],
      clips: [],
      note: "",
      pads: [{ id: "pad-1", title: "Not 1", text: "", at: Date.now() }],
      padId: "pad-1",
      stopwatch: null,
      extEvents: [],
      extSyncedAt: 0,
      netTotals: { down: 0, up: 0 },
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
      big: null,
      reminder: null,
      claudeCard: false,
      tourStep: 0,
      settingsJump: null,
      toured: false,
      busy: [],
      alarms: [],
      ringing: null,
      hums: [],
      hum: null,
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
      holds: [],
      listening: false,
      attachment: null,
      pendingTab: null,
      summaryDay: "",
      brief: false,
      notes: false,
      report: false,
      archive: null,
      notesSeen: "",
      lastOffer: 0,
      outing: null,
      guard: null,
      gate: false,
      catches: { stars: 0, trash: 0 },
      events: [],
      year: {},
      yearShown: "",
      liveAuto: { on: false, source: "" },
      liveManual: null,
      setLive: (auto, manual) =>
        set((s) => ({ liveAuto: auto ?? s.liveAuto, liveManual: manual === undefined ? s.liveManual : manual })),
      yearAdd: (patch) =>
        set((s) => {
          const y = String(new Date().getFullYear());
          const cur = { ...emptyYear(), ...s.year[y] };
          for (const [k, v] of Object.entries(patch) as [keyof typeof patch, number][]) cur[k] += v;
          return { year: { ...s.year, [y]: cur } };
        }),
      setYearShown: (yearShown) => set({ yearShown }),
      homeEdit: false,
      setHomeEdit: (homeEdit) => set({ homeEdit }),

      setMood: (mood) => set({ mood }),
      setAntic: (antic) => set({ antic }),
      setAsleep: (asleep) => set({ asleep }),
      setNight: (night) => set({ night }),
      setHovered: (hovered) => set({ hovered }),
      setSearching: (searching) => set({ searching }),
      setRelocating: (relocating) => set({ relocating }),
      setMove: (move) => set({ move }),
      setTab: (tab) => set({ tab }),

      addFiles: (files) =>
        set((s) => {
          const incoming = new Set(files.map((f) => f.path));
          const fresh = files.map((f) => ({ ...f, id: crypto.randomUUID(), addedAt: Date.now() }));
          const all: ShelfItem[] = [...fresh, ...s.shelf.filter((i) => !incoming.has(i.path))];
          // Sığmazsa en eski sabitlenmemiş öğeler çıkar
          while (all.length > MAX_SHELF) {
            const last = all.map((i) => !i.pinned).lastIndexOf(true);
            if (last < 0) break;
            all.splice(last, 1);
          }
          return { shelf: all };
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
      clearShelf: () => set((s) => ({ shelf: s.shelf.filter((i) => i.pinned) })),
      pinShelf: (id, pinned) => set((s) => ({ shelf: s.shelf.map((i) => (i.id === id ? { ...i, pinned } : i)) })),

      pushClip: (text, app) =>
        set((s) => {
          // Aynı metin yeniden kopyalanınca başa gelir; sabitliyse sabit kalır
          const old = s.clips.find((c) => (c.kind ?? "text") === "text" && c.text === text);
          const item: ClipItem = { id: crypto.randomUUID(), text, color: detectColor(text), at: Date.now(), app, pinned: old?.pinned, translation: old?.translation };
          return { clips: trimClips([item, ...s.clips.filter((c) => c !== old)]) };
        }),
      pushClipImage: (path, width, height, app) =>
        set((s) => ({
          clips: trimClips([{ id: crypto.randomUUID(), kind: "image", text: `${width}×${height}`, color: null, at: Date.now(), path, app }, ...s.clips]),
        })),
      pushClipFiles: (paths, app) =>
        set((s) => {
          const key = paths.join("\n");
          const old = s.clips.find((c) => c.kind === "files" && (c.paths ?? []).join("\n") === key);
          const names = paths.map((p) => p.split(/[\\/]/).pop() ?? p).join(", ");
          return { clips: trimClips([{ id: crypto.randomUUID(), kind: "files", text: names, color: null, at: Date.now(), paths, app, pinned: old?.pinned }, ...s.clips.filter((c) => c !== old)]) };
        }),
      pinClip: (id, pinned) => set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, pinned } : c)) })),
      editClip: (id, text) => set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, text, color: detectColor(text), translation: undefined } : c)) })),
      removeClip: (id) => set((s) => ({ clips: s.clips.filter((c) => c.id !== id) })),
      clearClips: () => set((s) => ({ clips: s.clips.filter((c) => c.pinned) })),

      setNote: (note) => set((s) => ({ note, pads: s.pads.map((p) => (p.id === s.padId ? { ...p, text: note, at: Date.now() } : p)) })),
      setPad: (id) => set((s) => ({ padId: id, note: s.pads.find((p) => p.id === id)?.text ?? "" })),
      addPad: () =>
        set((s) => {
          if (s.pads.length >= MAX_PADS) return {};
          let n = s.pads.length + 1;
          while (s.pads.some((p) => p.title === `Not ${n}`)) n++;
          const pad: Pad = { id: crypto.randomUUID(), title: `Not ${n}`, text: "", at: Date.now() };
          return { pads: [...s.pads, pad], padId: pad.id, note: "" };
        }),
      removePad: (id) =>
        set((s) => {
          const left = s.pads.filter((p) => p.id !== id);
          const pads = left.length ? left : [{ id: crypto.randomUUID(), title: "Not 1", text: "", at: Date.now() }];
          const padId = s.padId === id ? pads[Math.max(0, s.pads.findIndex((p) => p.id === id) - 1)]?.id ?? pads[0].id : s.padId;
          return { pads, padId, note: pads.find((p) => p.id === padId)?.text ?? "" };
        }),
      renamePad: (id, title) => set((s) => ({ pads: s.pads.map((p) => (p.id === id ? { ...p, title: title.trim() || p.title } : p)) })),
      expirePads: (days) =>
        set((s) => {
          if (!days) return {};
          const limit = Date.now() - days * 86_400_000;
          if (!s.pads.some((p) => p.text && p.at < limit)) return {};
          const pads = s.pads.map((p) => (p.text && p.at < limit ? { ...p, text: "" } : p));
          return { pads, note: pads.find((p) => p.id === s.padId)?.text ?? "" };
        }),
      setStopwatch: (stopwatch) => set({ stopwatch }),
      setExtEvents: (extEvents) => set({ extEvents, extSyncedAt: Date.now() }),

      setMedia: (m) =>
        set((s) => {
          if (!m) return { media: null };
          const sameTrack = s.media?.trackKey === m.trackKey;
          // Yeni bir şarkı çalmaya başladı: yıl özetine say
          let year = s.year;
          if (!sameTrack && m.playing && m.title) {
            const y = String(new Date().getFullYear());
            const yr = { ...emptyYear(), ...s.year[y] };
            yr.songs += 1;
            year = { ...s.year, [y]: yr };
          }
          return {
            year,
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
          // Saniyede bir gelir: hız × 1 sn ≈ o saniyede geçen bayt
          netTotals: { down: s.netTotals.down + stats.netDown, up: s.netTotals.up + stats.netUp },
        })),
      setDevices: (devices) => set({ devices }),
      setOsd: (osd) => set({ osd }),
      pushToast: (event) =>
        set((s) => (isQuiet(s) && !QUIET_ALLOWED.has(event.kind) ? {} : { toasts: [...s.toasts, { ...event, id: crypto.randomUUID() }].slice(-5) })),
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
            year: delta > 0 ? { ...s.year, [key.slice(0, 4)]: { ...emptyYear(), ...s.year[key.slice(0, 4)], care: (s.year[key.slice(0, 4)]?.care ?? 0) + 1 } } : s.year,
          };
        }),
      setGrabbed: (grabbed) => set({ grabbed }),
      setIntro: (intro) => set({ intro }),
      setTour: (tour) => set(tour ? { tour, tourStep: 0 } : { tour, toured: true }),
      setTourStep: (tourStep) => set({ tourStep }),
      setSettingsJump: (settingsJump) => set({ settingsJump }),
      setBig: (big) => set({ big }),
      setReminder: (reminder) => set({ reminder }),
      setClaudeCard: (claudeCard) => set({ claudeCard }),
      addAlarm: ({ at, ...a }) =>
        set((s) => ({
          alarms: [...s.alarms, { ...a, id: crypto.randomUUID(), enabled: true, next: at ?? nextFire(a) }].sort(
            (x, y) => (x.next ?? Infinity) - (y.next ?? Infinity),
          ),
        })),
      toggleAlarm: (id, enabled) =>
        set((s) => ({ alarms: s.alarms.map((a) => (a.id === id ? { ...a, enabled, next: enabled ? nextFire(a) : null } : a)) })),
      updateAlarm: (id, patch) =>
        set((s) => ({
          alarms: s.alarms
            .map((a) => (a.id === id ? { ...a, ...patch, enabled: true, next: nextFire({ ...a, ...patch }) } : a))
            .sort((x, y) => (x.next ?? Infinity) - (y.next ?? Infinity)),
        })),
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
      setHum: (hum) => set({ hum }),
      addHum: (e) =>
        set((s) => {
          const now = Date.now();
          const recent = s.hums.find((h) => h.key === e.key && now - h.at < 10 * 60_000);
          const entry = { ...e, id: recent?.id ?? crypto.randomUUID(), at: now, auto: recent ? recent.auto && e.auto : e.auto };
          return { hums: [entry, ...s.hums.filter((h) => h !== recent)].slice(0, MAX_HUMS) };
        }),
      removeHum: (id) => set((s) => ({ hums: s.hums.filter((h) => h.id !== id) })),
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
          // Yıl özeti: aynı sayaçlar + saat dağılımı, günler, sanatçılar
          const y = key.slice(0, 4);
          const yr = { ...emptyYear(), ...s.year[y] };
          yr.hours = [...yr.hours];
          for (const k of ["active", "music", "focus", "pomodoros", "game", "notifs", "care", "water"] as const) yr[k] += patch[k] ?? 0;
          if (patch.active) {
            yr.hours[new Date().getHours()] += patch.active;
            if (!yr.days.includes(key)) yr.days = [...yr.days, key];
          }
          const artist = patch.music && s.media?.playing ? s.media.artist.trim() : "";
          if (artist) {
            const a = { ...yr.artists, [artist]: (yr.artists[artist] ?? 0) + patch.music! };
            // Çok sanatçı birikmesin: en az dinlenenler düşer
            const top = Object.entries(a).sort((p, q) => q[1] - p[1]).slice(0, 60);
            yr.artists = Object.fromEntries(top);
          }
          return { days: { ...Object.fromEntries(keep.map((k) => [k, s.days[k]])), [key]: cur }, year: { ...s.year, [y]: yr } };
        }),
      setScore: (game, score) =>
        set((s) => {
          // Her biten oyun yıl özetine de sayılır
          const y = String(new Date().getFullYear());
          const yr = { ...emptyYear(), ...s.year[y] };
          yr.plays += 1;
          return { year: { ...s.year, [y]: yr }, ...((s.scores[game] ?? 0) >= score ? {} : { scores: { ...s.scores, [game]: score } }) };
        }),
      setOnline: (online) => set({ online }),
      setPinned: (pinned) => set({ pinned }),
      setListening: (listening) => set({ listening }),
      setAttachment: (attachment) => set({ attachment }),
      setPendingTab: (pendingTab) => set({ pendingTab }),
      setSummaryDay: (summaryDay) => set({ summaryDay }),
      setBrief: (brief) => set({ brief }),
      setNotes: (notes) => set({ notes }),
      setReport: (report) => set({ report }),
      setArchive: (archive) => set({ archive }),
      setNotesSeen: (notesSeen) => set({ notesSeen }),
      setLastOffer: (lastOffer) => set({ lastOffer }),
      setOuting: (outing) => set({ outing }),
      setGuard: (guard) => set({ guard }),
      setGate: (gate) => set({ gate }),
      addCatch: (kind) => set((s) => ({ catches: { ...s.catches, [kind]: s.catches[kind] + 1 } })),
      patchClip: (id, patch) => set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      addEvent: (e) =>
        set((s) => {
          const id = crypto.randomUUID();
          const at = remindAt(e);
          let alarms = s.alarms;
          let alarmId: string | undefined;
          // Hatırlatma: o an çalan tek seferlik alarm (sesi, tam ekranda uyanması alarmlarla aynı)
          if (at !== null && at > Date.now()) {
            alarmId = crypto.randomUUID();
            const d = new Date(at);
            const label = e.time ? `${e.title} · ${e.time}` : e.title;
            alarms = [...alarms, { id: alarmId, hour: d.getHours(), minute: d.getMinutes(), label, repeat: "once" as const, oneShot: true, enabled: true, next: at }].sort(
              (x, y) => (x.next ?? Infinity) - (y.next ?? Infinity),
            );
          }
          const events = [...s.events, { ...e, id, alarmId }]
            .sort((x, y) => (x.day + (x.time || "00:00")).localeCompare(y.day + (y.time || "00:00")))
            // Üç aydan eski etkinlikler atılır
            .filter((x) => x.day >= dayKey(new Date(Date.now() - 90 * 86_400_000)));
          return { events, alarms };
        }),
      removeEvent: (id) =>
        set((s) => {
          const ev = s.events.find((x) => x.id === id);
          return { events: s.events.filter((x) => x.id !== id), alarms: ev?.alarmId ? s.alarms.filter((a) => a.id !== ev.alarmId) : s.alarms };
        }),
      setBusy: (key, on) =>
        set((s) => ({ busy: on ? [...s.busy.filter((k) => k !== key), key] : s.busy.filter((k) => k !== key) })),
      setHold: (key, on) =>
        set((s) => ({ holds: on ? [...s.holds.filter((k) => k !== key), key] : s.holds.filter((k) => k !== key) })),
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
        notesSeen: s.notesSeen,
        alarms: s.alarms,
        hums: s.hums,
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
        catches: s.catches,
        events: s.events,
        pads: s.pads,
        padId: s.padId,
        stopwatch: s.stopwatch,
        extEvents: s.extEvents,
        extSyncedAt: s.extSyncedAt,
        year: s.year,
        yearShown: s.yearShown,
        // Kalkan ekranı (ayrı pencere) son hava durumunu gösterebilsin
        weather: s.weather,
      }),
      // Yeni eklenen ayar alanları eski kayıtlarda da varsayılanla gelsin.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<NookState>;
        const settings = { ...DEFAULT_SETTINGS, ...p.settings };
        settings.look = { ...DEFAULT_SETTINGS.look, ...p.settings?.look };
        // Yerel (Ollama) dönemden kalan model adı Gemini'de yok
        if (!settings.aiModel.startsWith("gemini")) settings.aiModel = "";
        // İlk sürümün varsayılanı birçok bilgisayarda başka programlarca tutuluyordu
        if (settings.askShortcut === "Ctrl+Shift+X" || settings.askShortcut === "Ctrl+Shift+E") settings.askShortcut = DEFAULT_SETTINGS.askShortcut;
        // Kalkanın ilk varsayılanı (Ctrl+Shift+X) de sık tutuluyordu
        if (settings.shieldShortcut === "Ctrl+Shift+X") settings.shieldShortcut = DEFAULT_SETTINGS.shieldShortcut;
        // Hum (0.2.47) yeni: sıralanmış ana sayfada sona düşmesin, Medya'nın arkasına girsin
        if (settings.homeOrder?.length && !settings.homeOrder.includes("hum")) {
          const i = settings.homeOrder.indexOf("media");
          settings.homeOrder = i < 0 ? [...settings.homeOrder, "hum"] : [...settings.homeOrder.slice(0, i + 1), "hum", ...settings.homeOrder.slice(i + 1)];
        }
        // Silinmiş profil seçili kalmasın
        if (settings.profiles && settings.homeProfile !== "all" && !settings.profiles.some((x) => x.id === settings.homeProfile)) settings.homeProfile = "all";
        // Açık sekmenin metni (note kaydedilmez, sekmeden gelir)
        const pads = p.pads?.length ? p.pads : current.pads;
        const padId = pads.some((x) => x.id === p.padId) ? p.padId! : pads[0].id;
        const note = pads.find((x) => x.id === padId)?.text ?? "";
        return { ...current, ...p, settings, pads, padId, note };
      },
    },
  ),
);

/** Sabitlenenler önde; sabitlenmemişler en yeni MAX_CLIPS kadar */
function trimClips(list: ClipItem[]): ClipItem[] {
  const pinned = list.filter((c) => c.pinned).slice(0, MAX_PINNED);
  const rest = list.filter((c) => !c.pinned).slice(0, MAX_CLIPS);
  return [...pinned, ...rest];
}

/** Etkinliğin hatırlatma anı (ms); hatırlatma yoksa null. Gün boyu etkinlik sabah 09:00 sayılır. */
export function remindAt(e: Pick<CalEvent, "day" | "time" | "remind">): number | null {
  if (e.remind < 0) return null;
  const [y, m, d] = e.day.split("-").map(Number);
  const [hh, mm] = (e.time || "09:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime() - e.remind * 60_000;
}

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

/** Yayın maskesi açık mı: elle açıldı/kapandıysa o, yoksa algılama (ayar açıksa) */
/** Tepsiden "1 saat sessiz" açık mı */
export const isQuiet = (s: Pick<NookState, "settings">) => (s.settings.quietUntil ?? 0) > Date.now();

/** Sessizken bile gösterilen kartlar: takvim, pil bitiyor, hassas veri uyarısı, güncelleme */
const QUIET_ALLOWED = new Set<SysEventKind>(["calendar", "battery-low", "sensitive", "update"]);

export const isLive = (s: Pick<NookState, "liveAuto" | "liveManual" | "settings">) => s.liveManual ?? (s.settings.liveMask && s.liveAuto.on);

/** Pomodoro'nun çalışma fazı sürüyor (duraklatılmamış) */
export const isWorking = (s: Pick<NookState, "focus">) => !!s.focus && s.focus.phase === "work" && s.focus.endsAt !== null;

export function expressionOf(s: NookState): Expression {
  if (s.ringing) return "alarm";
  // Hum dinlerken DJ; bulunca mırıldanır, bulamayınca bozulur
  if (s.hum) return s.hum.phase === "listening" ? DJ_MOVES[s.hum.move] : s.hum.phase === "found" ? "hum" : "sulk";
  if (s.guard) return "knock";
  if (s.mood !== "idle") return s.mood;
  if (s.grabbed) return "surprised";
  // Ses/parlaklık değişirken Nook bara tepki verir
  if (s.osd) {
    if (s.osd.kind === "volume" && s.osd.muted) return "muted";
    if (s.osd.kind === "volume" && s.osd.value >= 0.85) return "loud";
    return (s.osd.dir ?? 0) < 0 ? "volDown" : "volUp";
  }
  if (s.antic) return s.antic;
  // Yayındayken mikrofonuyla durur
  if (isLive(s)) return "live";
  // Ararken büyüteçle bakar
  if (s.searching) return "magnify";
  if (s.busy.length) return "thinking";
  // Sohbette cevabı kâğıda yazar
  if (s.talking) return "writing";
  if (s.downloads.length) return "downloading";
  // Pomodoro sürerken masasında çalışır
  if (isWorking(s)) return "focused";
  // Müzik/video çalarken dalgalı gözler (idle) gece/yorgun/küs hâllerin önüne geçer
  if (s.media?.playing) return "idle";
  // Tanıtımı anlatırken uyumaz
  if (isSleeping(s) && !s.tour) return "sleepy";
  if (s.affection < SULK_BELOW) return "sulk";
  if (selectBatteryLow(s)) return "tired";
  if (s.night) return "drowsy";
  return "idle";
}

const ERROR_KINDS = new Set(["battery-low", "device-low", "unplugged", "offline", "alert"]);
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
