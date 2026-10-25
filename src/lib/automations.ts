/**
 * Otomasyonlar: "bu olunca şunu yap". Bir tetikleyici (saat, Nook açılınca, uygulama öne gelince, oyun,
 * şarj, Bluetooth, USB, internet, bilgisayarın başına dönünce / boşta kalınca, kilit, telefon eve gelince
 * ya da şarja takılınca), isteğe bağlı koşullar ("oyunda değilsem", "22:00–08:00 arası" …) ve tuşlarla aynı
 * adımlar (lib/deck). İstenirse çalışmadan önce adada sorar. Her çalışma geçmişe yazılır.
 * Studio › Kısayollar › Otomasyonlar'da kurulur; yalnızca ana adada izlenir.
 */
import { useEffect } from "react";
import { EVENTS, isPrimary, subscribe, type ForegroundPayload, type GamePayload, type GamePeekPayload, type SysEvent } from "./bridge";
import { getDeck, isDangerous, migratePinnedApps, pushIslandToast, runKey, type DeckStep } from "./deck";
import { useNook } from "../store/nook";
import { tt } from "./i18n";

export type AutoEvent = "charging" | "unplugged" | "battery-low" | "bt-in" | "bt-out" | "usb-in" | "online" | "offline";
/** Nook Mobil'den gelen olaylar: telefon ev ağına geldi, şarja takıldı / çıkarıldı */
export type PhoneEvent = "home" | "charging" | "unplugged";

export type Trigger =
  /** Saat "HH:MM"; days: 0 = Pazar … 6 = Cumartesi, boşsa her gün */
  | { kind: "time"; at: string; days: number[] }
  | { kind: "start" }
  /** Uygulama öne gelince (Başlat menüsündeki adıyla) */
  | { kind: "app"; name: string }
  | { kind: "game"; end: boolean }
  | { kind: "event"; event: AutoEvent }
  /** back: bilgisayarın başına dönünce; değilse boşta kalınca (Nook uyuyunca) */
  | { kind: "idle"; back: boolean }
  | { kind: "lock"; locked: boolean }
  | { kind: "phone"; event: PhoneEvent };

/** Tetiklense de yalnızca bunlar doğruysa çalışır */
export type Condition =
  /** Tam ekran oyunda değilsem */
  | { kind: "notGame" }
  /** Saat bu aralıktaysa ("22:00"–"08:00" gece yarısını aşabilir) */
  | { kind: "between"; from: string; to: string }
  /** Şarjdaysa (masaüstünde hep şarjda sayılır) ya da pildeyse */
  | { kind: "power"; charging: boolean }
  /** Bilgisayarın başındaysam (Nook uyumuyorsa) */
  | { kind: "present" };

export interface Automation {
  id: string;
  label: string;
  on: boolean;
  when: Trigger;
  steps: DeckStep[];
  /** Hepsi doğruysa çalışır */
  only?: Condition[];
  /** Çalışmadan önce adada "çalışsın mı?" diye sorar */
  ask?: boolean;
  /** Son çalıştığı an (ms) */
  last?: number;
}

/** Geçmişteki bir kayıt: çalıştı, koşul tutmadı, soruya "hayır" dendi / cevap gelmedi, hata */
export interface AutoRun {
  id: string;
  label: string;
  at: number;
  status: "ran" | "skipped" | "declined" | "error";
}

/** Tetikleyici seçicideki sıra: simge (DECK_ICONS), renk ve varsayılan hâli */
export const TRIGGERS: { id: string; label: string; icon: string; color: string; make: () => Trigger }[] = [
  { id: "time", label: tt("Saat gelince"), icon: "clock", color: "#ffd23f", make: () => ({ kind: "time", at: "09:00", days: [] }) },
  { id: "start", label: tt("Nook açılınca"), icon: "sparkle", color: "#8f6bff", make: () => ({ kind: "start" }) },
  { id: "app", label: tt("Uygulama açılınca"), icon: "app", color: "#3d8bff", make: () => ({ kind: "app", name: "" }) },
  { id: "game", label: tt("Oyun başlayınca"), icon: "play", color: "#f0545c", make: () => ({ kind: "game", end: false }) },
  { id: "game-end", label: tt("Oyun bitince"), icon: "play", color: "#f0545c", make: () => ({ kind: "game", end: true }) },
  { id: "charging", label: tt("Şarj takılınca"), icon: "bolt", color: "#3ccf6e", make: () => ({ kind: "event", event: "charging" }) },
  { id: "unplugged", label: tt("Şarj çıkınca"), icon: "bolt", color: "#f2a33a", make: () => ({ kind: "event", event: "unplugged" }) },
  { id: "battery-low", label: tt("Pil azalınca"), icon: "bolt", color: "#f0545c", make: () => ({ kind: "event", event: "battery-low" }) },
  { id: "bt-in", label: tt("Bluetooth cihaz bağlanınca"), icon: "bluetooth", color: "#3d8bff", make: () => ({ kind: "event", event: "bt-in" }) },
  { id: "bt-out", label: tt("Bluetooth cihaz ayrılınca"), icon: "bluetooth", color: "#8e8e93", make: () => ({ kind: "event", event: "bt-out" }) },
  { id: "usb-in", label: tt("USB takılınca"), icon: "bolt", color: "#3fbfa5", make: () => ({ kind: "event", event: "usb-in" }) },
  { id: "online", label: tt("İnternet gelince"), icon: "wifi", color: "#3ccf6e", make: () => ({ kind: "event", event: "online" }) },
  { id: "offline", label: tt("İnternet gidince"), icon: "wifi", color: "#8e8e93", make: () => ({ kind: "event", event: "offline" }) },
  { id: "back", label: tt("Başına dönünce"), icon: "sparkle", color: "#ff5c8a", make: () => ({ kind: "idle", back: true }) },
  { id: "away", label: tt("Boşta kalınca"), icon: "sleep", color: "#8f6bff", make: () => ({ kind: "idle", back: false }) },
  { id: "lock", label: tt("Kilitlenince"), icon: "lock", color: "#3fbfa5", make: () => ({ kind: "lock", locked: true }) },
  { id: "unlock", label: tt("Kilit açılınca"), icon: "lock", color: "#3ccf6e", make: () => ({ kind: "lock", locked: false }) },
  { id: "phone-home", label: tt("Telefon eve gelince"), icon: "phone", color: "#2fd4c0", make: () => ({ kind: "phone", event: "home" }) },
  { id: "phone-charging", label: tt("Telefon şarja takılınca"), icon: "phone", color: "#3ccf6e", make: () => ({ kind: "phone", event: "charging" }) },
  { id: "phone-unplugged", label: tt("Telefon şarjdan çıkınca"), icon: "phone", color: "#f2a33a", make: () => ({ kind: "phone", event: "unplugged" }) },
];

/** Tetikleyicinin seçicideki karşılığı */
export function triggerId(t: Trigger) {
  switch (t.kind) {
    case "game":
      return t.end ? "game-end" : "game";
    case "event":
      return t.event;
    case "idle":
      return t.back ? "back" : "away";
    case "lock":
      return t.locked ? "lock" : "unlock";
    case "phone":
      return `phone-${t.event}`;
    default:
      return t.kind;
  }
}
export const triggerMeta = (t: Trigger) => TRIGGERS.find((x) => x.id === triggerId(t)) ?? TRIGGERS[0];

const DAY_SHORT = [tt("Paz"), tt("Pzt"), tt("Sal"), tt("Çar"), tt("Per"), tt("Cum"), tt("Cmt")];
/** Haftanın günleri Pazartesi'den başlayarak (seçicide) */
export const WEEK = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ d, label: DAY_SHORT[d] }));

function daysLabel(days: number[]) {
  if (!days.length || days.length === 7) return tt("her gün");
  const set = new Set(days);
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return tt("hafta içi");
  if (set.size === 2 && set.has(0) && set.has(6)) return tt("hafta sonu");
  return WEEK.filter((w) => set.has(w.d))
    .map((w) => w.label)
    .join(", ");
}

/** "Her gün 23:00", "Discord açılınca" gibi kısa anlatım */
export function triggerLabel(t: Trigger) {
  if (t.kind === "time") return `${daysLabel(t.days)} ${t.at}`.replace(/^./, (c) => c.toLocaleUpperCase("tr"));
  if (t.kind === "app") return t.name ? tt("{0} açılınca", t.name) : tt("Uygulama seçilmedi");
  return triggerMeta(t).label;
}

/** Koşul seçicideki sıra */
export const CONDITIONS: { id: Condition["kind"] | "battery"; label: string; make: () => Condition }[] = [
  { id: "notGame", label: tt("Oyunda değilsem"), make: () => ({ kind: "notGame" }) },
  { id: "between", label: tt("Saat aralığındaysa"), make: () => ({ kind: "between", from: "22:00", to: "08:00" }) },
  { id: "power", label: tt("Şarjdaysa"), make: () => ({ kind: "power", charging: true }) },
  { id: "battery", label: tt("Pildeyse"), make: () => ({ kind: "power", charging: false }) },
  { id: "present", label: tt("Bilgisayarın başındaysam"), make: () => ({ kind: "present" }) },
];

export const conditionId = (c: Condition) => (c.kind === "power" && !c.charging ? "battery" : c.kind);

export function conditionLabel(c: Condition) {
  if (c.kind === "between") return tt("{0}–{1} arası", c.from, c.to);
  return CONDITIONS.find((x) => x.id === conditionId(c))?.label ?? c.kind;
}

/** Hazır örnekler: Studio'da tek tıkla eklenir, sonra istediğin gibi değiştirirsin */
export const TEMPLATES: { label: string; when: Trigger; steps: DeckStep[]; only?: Condition[]; ask?: boolean }[] = [
  {
    label: tt("Gece modu"),
    when: { kind: "time", at: "23:00", days: [] },
    only: [{ kind: "notGame" }],
    steps: [
      { kind: "quick", key: "dark", on: true },
      { kind: "brightness", value: 30 },
      { kind: "volume", value: 20 },
      { kind: "say", text: tt("Gece moduna geçtim, ekranı kararttım") },
    ],
  },
  {
    label: tt("Günaydın"),
    when: { kind: "time", at: "09:00", days: [1, 2, 3, 4, 5] },
    steps: [
      { kind: "quick", key: "dark", on: false },
      { kind: "brightness", value: 80 },
      { kind: "say", text: tt("Günaydın! İyi çalışmalar") },
    ],
  },
  {
    label: tt("Ayrılınca mikrofon kapansın"),
    when: { kind: "lock", locked: true },
    steps: [{ kind: "quick", key: "mic", on: true }],
  },
  {
    label: tt("Oyun bitince mola"),
    when: { kind: "game", end: true },
    steps: [{ kind: "say", text: tt("Güzel oyundu! Biraz su iç, gözlerini dinlendir") }],
  },
  {
    label: tt("Şarj çıkınca tasarruf"),
    when: { kind: "event", event: "unplugged" },
    steps: [{ kind: "brightness", value: 50 }],
  },
  {
    label: tt("Eve hoş geldin"),
    when: { kind: "phone", event: "home" },
    ask: true,
    steps: [
      { kind: "say", text: tt("Hoş geldin! Müziği açayım mı?") },
      { kind: "media", action: "toggle" },
    ],
  },
];

export const getAutomations = () => useNook.getState().automations;
export const saveAutomations = (list: Automation[]) => useNook.getState().setAutomations(list);

/** Otomasyonda kapatma/yeniden başlatma/uyku yok (yanlışlıkla tetiklenince geri alınamaz); zamanlı kapatma ayrı */
export const autoSafe = (steps: DeckStep[]) => !isDangerous({ steps });

// ---------------------------------------------------------------- Koşullar

/** Tam ekran oyun sürüyor mu (oyun başladı/bitti olaylarından) */
let inGame = false;

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const minsOf = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : -1;
};

function holds(c: Condition) {
  const s = useNook.getState();
  switch (c.kind) {
    case "notGame":
      return !inGame;
    case "between": {
      const now = hhmm(new Date());
      // Gece yarısını aşan aralık (22:00–08:00), bitiş dakikası dahil
      return c.from <= c.to ? now >= c.from && now <= c.to : now >= c.from || now <= c.to;
    }
    case "power": {
      const bat = s.stats?.battery;
      const charging = !bat || bat.charging;
      return charging === c.charging;
    }
    case "present":
      return !s.asleep;
  }
}

// ---------------------------------------------------------------- Çalıştırma

const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/[^a-z0-9ğüşıöç]/g, "");
/** Program adı (.exe) ile Başlat menüsündeki adı farklı olanlar */
const ALIAS: Record<string, string> = {
  msedge: "edge",
  winword: "word",
  powerpnt: "powerpoint",
  code: "visualstudiocode",
  explorer: "dosyagezgini",
  wt: "terminal",
  windowsterminal: "terminal",
  olk: "outlook",
  ms_teams: "teams",
  msteams: "teams",
  discordptb: "discord",
  discordcanary: "discord",
  chrome: "googlechrome",
  firefox: "mozillafirefox",
};

/** Öndeki program (küçük harf, .exe'siz) ya da UWP pencere başlığı seçilen uygulama mı */
export function appMatches(name: string, exe: string, title = "") {
  const want = norm(name);
  if (!want) return false;
  const got = norm(ALIAS[exe] ?? exe);
  if (got && got !== "applicationframehost" && (want.includes(got) || got.includes(want))) return true;
  if (title) {
    const t = norm(title);
    if (t && (exe === "applicationframehost" || !got) && t.includes(want)) return true;
  }
  return false;
}

/** Aynı otomasyon art arda (ör. Bluetooth kopup bağlanırken) bir dakikada bir kez */
const COOLDOWN_MS = 60_000;
/** Saat tetikleyicisi 2 dakikalık pencerede yalnızca bir kez çalışsın */
const TIME_COOLDOWN_MS = 3 * 60_000;
/** "Çalışsın mı?" sorusu bu kadar cevapsız kalırsa çalışmaz */
const ASK_MS = 45_000;
const BOOT_GUARD_KEY = "nook-auto-boot";

function log(a: Automation, status: AutoRun["status"]) {
  const s = useNook.getState();
  s.setAutoLog([{ id: a.id, label: a.label, at: Date.now(), status }, ...s.autoLog].slice(0, 60));
}

async function run(a: Automation, manual = false) {
  // Nook bir şey söylemiyorsa çalıştığı kısaca görünsün
  if (!a.steps.some((s) => s.kind === "say")) {
    pushIslandToast(tt("Otomasyon: {0}", a.label), manual ? tt("Şimdi çalıştırıldı") : triggerLabel(a.when), 3000);
  }
  const ok = await runKey(a);
  log(a, ok ? "ran" : "error");
  return ok;
}

/**
 * Otomasyonu tetikleyicisini ya da koşullarını beklemeden hemen çalıştırır
 * (Nook Mobil'den, Nook Studio'daki "Dene" düğmesinden ya da sesli komuttan).
 */
export async function runAutomationNow(idOrAuto: string | Automation): Promise<boolean> {
  const list = getAutomations();
  const a = typeof idOrAuto === "string" ? list.find((x) => x.id === idOrAuto) : idOrAuto;
  if (!a || !a.steps.length || !autoSafe(a.steps)) return false;
  const now = Date.now();
  if (list.some((x) => x.id === a.id)) {
    saveAutomations(list.map((x) => (x.id === a.id ? { ...x, last: now } : x)));
  }
  return run(a, true);
}

let askTimer = 0;

/** Adadaki "çalışsın mı?" kartının cevabı (ya da süresi doldu) */
export function answerAsk(yes: boolean) {
  const s = useNook.getState();
  const ask = s.autoAsk;
  if (!ask) return;
  window.clearTimeout(askTimer);
  s.setAutoAsk(null);
  const a = getAutomations().find((x) => x.id === ask.id);
  if (!a) return;
  if (yes) void run(a);
  else log(a, "declined");
}

function fire(match: (t: Trigger) => boolean, cooldown = COOLDOWN_MS) {
  const now = Date.now();
  const due = getAutomations().filter((a) => a.on && a.steps.length && autoSafe(a.steps) && match(a.when) && now - (a.last ?? 0) > cooldown);
  if (!due.length) return;
  saveAutomations(getAutomations().map((a) => (due.some((d) => d.id === a.id) ? { ...a, last: now } : a)));
  for (const a of due) {
    if (!(a.only ?? []).every(holds)) {
      log(a, "skipped");
      continue;
    }
    if (a.ask) {
      // Bekleyen bir soru varsa ikincisi sorulmaz
      if (useNook.getState().autoAsk) {
        log(a, "skipped");
        continue;
      }
      useNook.getState().setAutoAsk({ id: a.id, label: a.label, detail: triggerLabel(a.when) });
      askTimer = window.setTimeout(() => answerAsk(false), ASK_MS);
      continue;
    }
    void run(a);
  }
}

/** Ana adada: tetikleyicileri izler ve eşleşen otomasyonları çalıştırır; tuşların klavye kısayollarını dinler */
export function useAutomations() {
  useEffect(() => {
    if (!isPrimary) return;
    migratePinnedApps();

    // Saat: 15 saniyede bir bakılır; arka planda WebView2 yavaşlasa bile 2 dakikalık pencerede yakalar
    const tick = () => {
      const d = new Date();
      const nowMins = d.getHours() * 60 + d.getMinutes();
      const day = d.getDay();
      fire((t) => {
        if (t.kind !== "time") return false;
        if (t.days.length && !t.days.includes(day)) return false;
        const target = minsOf(t.at);
        const diff = nowMins - target;
        return target >= 0 && diff >= 0 && diff <= 2;
      }, TIME_COOLDOWN_MS);
    };
    tick();
    const clock = window.setInterval(tick, 15_000);

    // Nook açılınca: ada yerleşsin diye biraz sonra; sağ tık › Yenile'de tekrar çalışmasın
    let boot = 0;
    try {
      if (!sessionStorage.getItem(BOOT_GUARD_KEY)) {
        boot = window.setTimeout(() => {
          try {
            sessionStorage.setItem(BOOT_GUARD_KEY, "1");
          } catch {
            /* önemsiz */
          }
          fire((t) => t.kind === "start");
        }, 4000);
      }
    } catch {
      boot = window.setTimeout(() => fire((t) => t.kind === "start"), 4000);
    }

    let fg = "";
    const offs = [
      subscribe<ForegroundPayload>(EVENTS.foreground, (p) => {
        const key = p.app === "applicationframehost" && p.title ? `${p.app}:${p.title}` : p.app;
        if (!key || key === fg) return;
        fg = key;
        fire((t) => t.kind === "app" && appMatches(t.name, p.app, p.title));
      }),
      subscribe<GamePeekPayload>(EVENTS.gameStart, () => {
        inGame = true;
        fire((t) => t.kind === "game" && !t.end);
      }),
      subscribe<GamePayload>(EVENTS.game, (g) => {
        inGame = false;
        if (g.secs >= 15) fire((t) => t.kind === "game" && t.end);
      }),
      subscribe<SysEvent>(EVENTS.event, (e) => fire((t) => t.kind === "event" && t.event === e.kind)),
      subscribe<boolean>(EVENTS.idle, (asleep) => {
        useNook.getState().setAsleep(asleep);
        fire((t) => t.kind === "idle" && t.back === !asleep);
      }),
      subscribe<boolean>(EVENTS.locked, (locked) => fire((t) => t.kind === "lock" && t.locked === locked)),
      subscribe<{ event: PhoneEvent }>(EVENTS.phoneEvent, (p) => fire((t) => t.kind === "phone" && t.event === p.event)),
      // Tuşun klavye kısayolu (Rust kaydeder, basılınca kimliğini yollar)
      subscribe<string>(EVENTS.deckKey, (id) => {
        const k = getDeck().find((x) => x.id === id);
        if (k) void runKey(k);
      }),
    ];
    return () => {
      window.clearInterval(clock);
      window.clearTimeout(boot);
      offs.forEach((off) => off());
    };
  }, []);
}

// ---------------------------------------------------------------- Sesli komut

/**
 * "Hey Nook, gece modu" / "oyun modunu çalıştır" / "run game mode": adı tutan tuşu ya da otomasyonu
 * çalıştırır (otomasyon tetikleyicisini beklemeden, koşulsuz). Bulamazsa null. `exact`: yalnızca adın
 * kendisi (yerleşik komutlardan önce denenir); değilse ekli hâller de ("gece modunu"), yerleşiklerden sonra.
 */
export async function runByVoice(raw: string, exact: boolean): Promise<string | null> {
  const t = norm(
    raw
      .toLocaleLowerCase("tr")
      .replace(/^\s*(hey\s+)?nook[,\s]*/, "")
      .replace(/\s+(tuşunu|tuşu|rutinini|rutini|otomasyonunu|otomasyonu)\b/g, " ")
      .replace(/\s+(çalıştır|başlat|yap|aç|kur|run|start|activate|turn on)\s*$/, "")
      .replace(/^(run|start|activate)\s+/, ""),
  );
  if (t.length < 3) return null;
  // Türkçe ekleri tolere et: "gece modunu" → "gecemodu"
  const same = (label: string) => {
    const l = norm(label);
    return l.length >= 3 && (t === l || (!exact && t.startsWith(l) && t.length - l.length <= 3));
  };
  const key = getDeck().find((k) => k.steps.length && same(k.label));
  if (key) {
    if (isDangerous(key)) return null;
    void runKey(key);
    return key.label;
  }
  const auto = getAutomations().find((a) => a.steps.length && autoSafe(a.steps) && same(a.label));
  if (auto) {
    void runAutomationNow(auto);
    return auto.label;
  }
  return null;
}
