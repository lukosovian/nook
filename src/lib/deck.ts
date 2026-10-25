/**
 * Kısayol tuşları (Stream Deck gibi): tek tuşla bir eylem ya da birden çok adımı sırayla yapan kısayol.
 * Uygulama/klasör/site açma, mikrofon-ses-karanlık mod, kilitle, masaüstünü göster, uyku/kapat,
 * medya, Pomodoro, gizlilik kalkanı, Hum, ses seviyesi, parlaklık, Nook'un söylemesi ve bekleme.
 * Tuşlar Kısayollar modülünde (istenirse ana sayfada da), düzenleyicisi Nook Studio'da. Aynı adımları
 * otomasyonlar da kullanır (lib/automations).
 */
import { useEffect, useState } from "react";
import { DECK_ICONS } from "./deckIcons";
import {
  brightnessSet,
  isPrimary,
  mediaControl,
  openPath,
  quickAction,
  quickSet,
  quickState,
  quickVolume,
  shieldOn,
  type QuickKey,
  type QuickState,
} from "./bridge";
import { startFocus } from "./focus";
import { toggleHum } from "../hooks/useHum";
import { useNook } from "../store/nook";
import { pct, tt } from "./i18n";

export { DECK_ICONS };

export type PowerAction = "lock" | "screen-off" | "desktop" | "sleep" | "shutdown" | "restart";
export type NookAction = "focus" | "shield" | "hum";

/** Tuşun yaptığı tek adım */
export type DeckStep =
  | { kind: "open"; path: string; name: string }
  | { kind: "quick"; key: QuickKey; on?: boolean }
  | { kind: "power"; action: PowerAction }
  | { kind: "media"; action: "toggle" | "next" | "prev" }
  | { kind: "nook"; action: NookAction }
  /** Ses seviyesi, 0–100 */
  | { kind: "volume"; value: number }
  /** Ekran parlaklığı, 0–100 */
  | { kind: "brightness"; value: number }
  /** Nook adada bir şey söyler */
  | { kind: "say"; text: string }
  /** Sonraki adımdan önce bekle (saniye) */
  | { kind: "wait"; sec: number };

export interface DeckKey {
  id: string;
  label: string;
  /** DECK_ICONS'taki ad; "app" ve tek "aç" adımı varsa uygulamanın kendi simgesi */
  icon: string;
  color: string;
  steps: DeckStep[];
  /** Adanın ana sayfasında da (alt sırada) */
  home?: boolean;
  /** Her yerden çalıştıran klavye kısayolu ("Ctrl+Alt+1"); Rust kaydeder (bkz. shortcut.rs) */
  hotkey?: string;
}

export const DECK_COLORS = ["#ff5c8a", "#f2a33a", "#ffd23f", "#3ccf6e", "#3fbfa5", "#3d8bff", "#8f6bff", "#f0545c"];

/** Hazır eylemler: Studio'daki seçicide ve adadaki "+" listesinde */
export const ACTIONS: { id: string; label: string; icon: string; color: string; step: DeckStep; danger?: boolean }[] = [
  { id: "mic", label: tt("Mikrofon"), icon: "mic", color: "#f2a33a", step: { kind: "quick", key: "mic" } },
  { id: "mute", label: tt("Ses"), icon: "volume", color: "#f0545c", step: { kind: "quick", key: "mute" } },
  { id: "dark", label: tt("Karanlık mod"), icon: "moon", color: "#8f6bff", step: { kind: "quick", key: "dark" } },
  { id: "wifi", label: "Wi-Fi", icon: "wifi", color: "#3d8bff", step: { kind: "quick", key: "wifi" } },
  { id: "bluetooth", label: "Bluetooth", icon: "bluetooth", color: "#3d8bff", step: { kind: "quick", key: "bluetooth" } },
  { id: "desktop", label: tt("Masaüstü"), icon: "desktop", color: "#3d8bff", step: { kind: "power", action: "desktop" } },
  { id: "lock", label: tt("Kilitle"), icon: "lock", color: "#3fbfa5", step: { kind: "power", action: "lock" } },
  { id: "screen-off", label: tt("Ekranı kapat"), icon: "monitoroff", color: "#3fbfa5", step: { kind: "power", action: "screen-off" } },
  { id: "play", label: tt("Oynat"), icon: "play", color: "#ff5c8a", step: { kind: "media", action: "toggle" } },
  { id: "next", label: tt("Sonraki"), icon: "next", color: "#ff5c8a", step: { kind: "media", action: "next" } },
  { id: "prev", label: tt("Önceki"), icon: "prev", color: "#ff5c8a", step: { kind: "media", action: "prev" } },
  { id: "focus", label: tt("Pomodoro"), icon: "focus", color: "#f0545c", step: { kind: "nook", action: "focus" } },
  { id: "shield", label: tt("Kalkan"), icon: "shield", color: "#8f6bff", step: { kind: "nook", action: "shield" } },
  { id: "hum", label: "Hum", icon: "hum", color: "#9b7bff", step: { kind: "nook", action: "hum" } },
  { id: "level", label: tt("Ses seviyesi"), icon: "level", color: "#f0545c", step: { kind: "volume", value: 30 } },
  { id: "brightness", label: tt("Parlaklık"), icon: "sun", color: "#ffd23f", step: { kind: "brightness", value: 50 } },
  { id: "say", label: tt("Nook söylesin"), icon: "say", color: "#9b7bff", step: { kind: "say", text: "" } },
  { id: "wait", label: tt("Bekle"), icon: "wait", color: "#8e8e93", step: { kind: "wait", sec: 5 } },
  { id: "sleep", label: tt("Uyku"), icon: "sleep", color: "#3d8bff", step: { kind: "power", action: "sleep" }, danger: true },
  { id: "restart", label: tt("Yeniden başlat"), icon: "restart", color: "#f2a33a", step: { kind: "power", action: "restart" }, danger: true },
  { id: "shutdown", label: tt("Kapat"), icon: "power", color: "#f0545c", step: { kind: "power", action: "shutdown" }, danger: true },
];

/** Değeri olan adımlar (ses seviyesi, parlaklık, söz, bekleme) */
export const VALUE_KINDS: DeckStep["kind"][] = ["volume", "brightness", "say", "wait"];

/** Adımın hazır eylemi (simge ve renk için); aç/kapa ve değerli adımlar türüne göre eşleşir */
export const actionOf = (s: DeckStep) =>
  ACTIONS.find((a) =>
    a.step.kind === "quick" && s.kind === "quick" ? a.step.key === s.key : VALUE_KINDS.includes(s.kind) ? a.step.kind === s.kind : JSON.stringify(a.step) === JSON.stringify(s),
  );

/** İlk açılışta (ve "Varsayılanlara dön" ile) gelen tuşlar */
export const DEFAULT_DECK: DeckKey[] = ["mic", "mute", "desktop", "lock"].map((id) => {
  const a = ACTIONS.find((x) => x.id === id)!;
  return { id: `d-${id}`, label: a.label, icon: a.icon, color: a.color, steps: [a.step] };
});

/** Tuşlar: hiç düzenlenmediyse hazır olanlar */
export const useDeck = () => useNook((s) => s.deck) ?? DEFAULT_DECK;
export const getDeck = () => useNook.getState().deck ?? DEFAULT_DECK;
export const resetDeck = () => useNook.getState().setDeck(DEFAULT_DECK);

export const keyFromAction = (id: string): DeckKey => {
  const a = ACTIONS.find((x) => x.id === id)!;
  return { id: crypto.randomUUID(), label: a.label, icon: a.icon, color: a.color, steps: [a.step] };
};

/** Uygulama ya da klasör tuşu: tek basışta açar, kendi simgesiyle görünür */
export const appKey = (a: { name: string; path: string }): DeckKey => ({ id: crypto.randomUUID(), label: a.name, icon: "app", color: "#3d8bff", steps: [{ kind: "open", path: a.path, name: a.name }] });

/** Tuş tek bir uygulama/klasör açıyorsa yolu (simgesi oradan okunur); sitelerde ve çok adımlılarda null */
export const appPathOf = (k: DeckKey) => {
  const s = k.steps.length === 1 ? k.steps[0] : null;
  return k.icon === "app" && s?.kind === "open" && !/^https?:/i.test(s.path) ? s.path : null;
};

/** Bu yolu açan tek adımlı bir tuş zaten var mı */
export const hasAppKey = (deck: DeckKey[], path: string) => deck.some((k) => k.steps.length === 1 && k.steps[0].kind === "open" && k.steps[0].path === path);

/**
 * Eskiden uygulama tuşları ayrı bir listede duruyordu (pinnedApps): tuşların sonuna taşınır.
 * Yalnızca ana adada, açılışta bir kez.
 */
export function migratePinnedApps() {
  const s = useNook.getState();
  if (!s.pinnedApps.length) return;
  const deck = getDeck();
  const moved = s.pinnedApps.filter((p) => !hasAppKey(deck, p.path)).map(appKey);
  useNook.setState({ deck: [...deck, ...moved].slice(0, 24), pinnedApps: [] });
}

/** Bilgisayarı kapatan/uyutan tuş: yanlışlıkla basılmasın, ikinci basışta çalışır */
export const isDangerous = (k: { steps: DeckStep[] }) => k.steps.some((s) => s.kind === "power" && (s.action === "sleep" || s.action === "shutdown" || s.action === "restart"));

/**
 * Aç/kapa adımı sonunda o şey açık mı olacak (null = tersine çevir). Mikrofon ve seste `on` "sessiz"
 * demek (quickSet ile aynı), anlatımda "açık" duyulan ses/mikrofondur.
 */
export const quickLit = (s: Extract<DeckStep, { kind: "quick" }>) => (s.on == null ? null : s.key === "mic" || s.key === "mute" ? !s.on : s.on);
/** Aç/kapa adımının sıradaki hâli: aç/kapa → aç → kapat → aç/kapa */
export const nextQuick = (s: Extract<DeckStep, { kind: "quick" }>): Extract<DeckStep, { kind: "quick" }> => {
  const lit = quickLit(s);
  const want = lit == null ? true : lit ? false : null;
  return { kind: "quick", key: s.key, ...(want == null ? {} : { on: s.key === "mic" || s.key === "mute" ? !want : want }) };
};

// --- Canlı hızlı ayar durumu (mikrofon/ses kapalı simgesi ve durum ışığı tüm pencerelerde ortak) ---

let cachedQuick: QuickState | null = null;
const quickListeners = new Set<(q: QuickState | null) => void>();
let quickTimer: number | null = null;

const deckChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("nook-deck") : null;

export const getQuickState = () => cachedQuick;

export async function refreshQuickState(broadcast = true): Promise<QuickState | null> {
  const q = await quickState();
  if (q) {
    cachedQuick = q;
    quickListeners.forEach((fn) => fn(q));
    if (broadcast) deckChannel?.postMessage({ kind: "quick", state: q });
  }
  return q;
}

deckChannel?.addEventListener("message", (ev) => {
  const d = ev.data;
  if (!d || typeof d !== "object") return;
  if (d.kind === "quick" && d.state) {
    cachedQuick = d.state as QuickState;
    quickListeners.forEach((fn) => fn(cachedQuick));
  } else if (isPrimary && d.kind === "toast") {
    useNook.getState().pushToast({ kind: "chat", title: d.title, detail: d.detail ?? "", ms: d.ms ?? 5000 });
  } else if (isPrimary && d.kind === "hum") {
    toggleHum();
  }
});

/** Kısayollar, ana sayfa ve Studio için canlı mikrofon/ses/Wi-Fi/karanlık mod durumu */
export function useQuickState(): QuickState | null {
  const [st, setSt] = useState<QuickState | null>(cachedQuick);
  useEffect(() => {
    quickListeners.add(setSt);
    if (!cachedQuick) void refreshQuickState(false);
    if (quickTimer == null) {
      quickTimer = window.setInterval(() => {
        void refreshQuickState(false);
      }, 1500);
    }
    return () => {
      quickListeners.delete(setSt);
      if (quickListeners.size === 0 && quickTimer != null) {
        window.clearInterval(quickTimer);
        quickTimer = null;
      }
    };
  }, []);
  return st;
}

/**
 * Tuşun canlı görünümü: mikrofon ya da ses kapalıyken üstü çizili simge (`micoff` / `mute`), kırmızı vurgu
 * ve durum ışığı döner. Hem adadaki Kısayollar/Ana Sayfa'da hem Studio'da hem de Nook Mobil aynasında kullanılır.
 */
export function keyVisual(k: DeckKey, q: QuickState | null) {
  const isMic = k.icon === "mic" || k.icon === "micoff" || k.steps.some((s) => s.kind === "quick" && s.key === "mic");
  const isMute = k.icon === "volume" || k.icon === "mute" || k.steps.some((s) => s.kind === "quick" && s.key === "mute");
  const micMuted = isMic && !!q?.micMuted;
  const audioMuted = isMute && !!q?.muted;
  const muted = micMuted || audioMuted;
  const iconName = micMuted ? "micoff" : audioMuted ? "mute" : k.icon;
  const Icon = DECK_ICONS[iconName] ?? DECK_ICONS[k.icon] ?? DECK_ICONS.bolt;
  const color = muted ? "#ff453a" : k.color;

  let lit: "on" | "off" | null = null;
  if (q) {
    if (isMic) lit = q.micMuted ? "off" : "on";
    else if (isMute) lit = q.muted ? "off" : "on";
    else {
      const s = k.steps.length === 1 ? k.steps[0] : null;
      if (s?.kind === "quick") {
        if (s.key === "dark") lit = q.dark ? "on" : null;
        else if (s.key === "wifi" && q.wifi != null) lit = q.wifi ? "on" : "off";
        else if (s.key === "bluetooth" && q.bluetooth != null) lit = q.bluetooth ? "on" : "off";
      }
    }
  }
  return { iconName, Icon, color, lit, muted };
}

/** Adımın kısa anlatımı (Studio'daki listede) */
export function stepLabel(s: DeckStep): string {
  switch (s.kind) {
    case "open":
      return tt("{0} aç", s.name);
    case "quick": {
      const lit = quickLit(s);
      return `${actionOf(s)?.label ?? s.key}: ${lit == null ? tt("aç/kapa") : lit ? tt("aç") : tt("kapat")}`;
    }
    case "volume":
      return tt("Ses seviyesi {0}", pct(s.value));
    case "brightness":
      return tt("Parlaklık {0}", pct(s.value));
    case "say":
      return s.text ? tt("Nook: “{0}”", s.text) : tt("Nook söylesin");
    case "wait":
      return tt("{0} sn bekle", s.sec);
    default:
      return actionOf(s)?.label ?? s.kind;
  }
}

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

export function pushIslandToast(title: string, detail = "", ms = 5000) {
  useNook.getState().pushToast({ kind: "chat", title, detail, ms });
  if (!isPrimary) deckChannel?.postMessage({ kind: "toast", title, detail, ms });
}

async function runStep(s: DeckStep, label: string) {
  switch (s.kind) {
    case "open":
      return openPath(s.path);
    case "quick": {
      let on = s.on;
      if (on == null) {
        // Aç/kapa: şu anki hâlin tersi
        const st = await quickState();
        const cur = s.key === "mic" ? st?.micMuted : s.key === "mute" ? st?.muted : s.key === "dark" ? st?.dark : s.key === "wifi" ? st?.wifi : st?.bluetooth;
        on = !cur;
      }
      await quickSet(s.key, on);
      void refreshQuickState();
      return;
    }
    case "power":
      return quickAction(s.action);
    case "media":
      return mediaControl(s.action);
    case "volume":
      await quickVolume(s.value / 100);
      void refreshQuickState();
      return;
    case "brightness":
      return brightnessSet(s.value);
    case "say":
      return pushIslandToast(s.text || label, "", 5000);
    case "wait":
      return wait(s.sec * 1000);
    case "nook":
      if (s.action === "focus") return void startFocus("work", 0);
      if (s.action === "shield") {
        await shieldOn(false);
        void refreshQuickState();
        return;
      }
      if (!isPrimary) {
        deckChannel?.postMessage({ kind: "hum" });
        return;
      }
      return toggleHum();
  }
}

/**
 * Tuşa basıldı (ya da otomasyon tetiklendi): adımlar sırayla (aralarında kısa nefes), hata olursa adada
 * söylenir. Hepsi yapıldıysa true.
 */
export async function runKey(k: { label: string; steps: DeckStep[] }) {
  for (const [i, s] of k.steps.entries()) {
    try {
      await runStep(s, k.label);
    } catch (e) {
      pushIslandToast(tt("{0} yapılamadı", k.label), String(e), 4000);
      void refreshQuickState();
      return false;
    }
    if (i < k.steps.length - 1 && s.kind !== "wait") await wait(s.kind === "open" ? 450 : 150);
  }
  void refreshQuickState();
  window.setTimeout(() => void refreshQuickState(), 250);
  return true;
}
