/**
 * Kısayol tuşları (Stream Deck gibi): tek tuşla bir eylem ya da birden çok adımı sırayla yapan bir rutin.
 * Uygulama/klasör/site açma, mikrofon-ses-karanlık mod, kilitle, masaüstünü göster, uyku/kapat,
 * medya, Pomodoro, gizlilik kalkanı, Hum. Tuşlar Kısayollar modülünde, düzenleyicisi Nook Studio'da.
 */
import {
  AppWindow,
  Camera,
  EyeOff,
  Globe,
  Layers,
  Lock,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Moon,
  Music2,
  Pause,
  Power,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sparkles,
  Target,
  Volume2,
  VolumeX,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { mediaControl, openPath, quickAction, quickSet, quickState, shieldOn, type QuickKey } from "./bridge";
import { startFocus } from "./focus";
import { toggleHum } from "../hooks/useHum";
import { useNook } from "../store/nook";
import { tt } from "./i18n";

export type PowerAction = "lock" | "screen-off" | "desktop" | "sleep" | "shutdown" | "restart";
export type NookAction = "focus" | "shield" | "hum";

/** Tuşun yaptığı tek adım */
export type DeckStep =
  | { kind: "open"; path: string; name: string }
  | { kind: "quick"; key: QuickKey; on?: boolean }
  | { kind: "power"; action: PowerAction }
  | { kind: "media"; action: "toggle" | "next" | "prev" }
  | { kind: "nook"; action: NookAction };

export interface DeckKey {
  id: string;
  label: string;
  /** DECK_ICONS'taki ad */
  icon: string;
  color: string;
  steps: DeckStep[];
}

export const DECK_ICONS: Record<string, LucideIcon> = {
  mic: Mic,
  micoff: MicOff,
  volume: Volume2,
  mute: VolumeX,
  moon: Moon,
  lock: Lock,
  monitoroff: MonitorOff,
  desktop: Monitor,
  power: Power,
  restart: RotateCcw,
  sleep: Moon,
  play: Pause,
  next: SkipForward,
  prev: SkipBack,
  focus: Target,
  shield: EyeOff,
  hum: Music2,
  app: AppWindow,
  web: Globe,
  scene: Layers,
  bolt: Zap,
  sparkle: Sparkles,
  camera: Camera,
};

export const DECK_COLORS = ["#ff5c8a", "#f2a33a", "#ffd23f", "#3ccf6e", "#3fbfa5", "#3d8bff", "#8f6bff", "#f0545c"];

/** Hazır eylemler: Studio'daki seçicide ve adadaki "+" listesinde */
export const ACTIONS: { id: string; label: string; icon: string; color: string; step: DeckStep; danger?: boolean }[] = [
  { id: "mic", label: tt("Mikrofon"), icon: "mic", color: "#f2a33a", step: { kind: "quick", key: "mic" } },
  { id: "mute", label: tt("Ses"), icon: "volume", color: "#f0545c", step: { kind: "quick", key: "mute" } },
  { id: "dark", label: tt("Karanlık mod"), icon: "moon", color: "#8f6bff", step: { kind: "quick", key: "dark" } },
  { id: "desktop", label: tt("Masaüstü"), icon: "desktop", color: "#3d8bff", step: { kind: "power", action: "desktop" } },
  { id: "lock", label: tt("Kilitle"), icon: "lock", color: "#3fbfa5", step: { kind: "power", action: "lock" } },
  { id: "screen-off", label: tt("Ekranı kapat"), icon: "monitoroff", color: "#3fbfa5", step: { kind: "power", action: "screen-off" } },
  { id: "play", label: tt("Oynat"), icon: "play", color: "#ff5c8a", step: { kind: "media", action: "toggle" } },
  { id: "next", label: tt("Sonraki"), icon: "next", color: "#ff5c8a", step: { kind: "media", action: "next" } },
  { id: "prev", label: tt("Önceki"), icon: "prev", color: "#ff5c8a", step: { kind: "media", action: "prev" } },
  { id: "focus", label: tt("Pomodoro"), icon: "focus", color: "#f0545c", step: { kind: "nook", action: "focus" } },
  { id: "shield", label: tt("Kalkan"), icon: "shield", color: "#8f6bff", step: { kind: "nook", action: "shield" } },
  { id: "hum", label: "Hum", icon: "hum", color: "#9b7bff", step: { kind: "nook", action: "hum" } },
  { id: "sleep", label: tt("Uyku"), icon: "sleep", color: "#3d8bff", step: { kind: "power", action: "sleep" }, danger: true },
  { id: "restart", label: tt("Yeniden başlat"), icon: "restart", color: "#f2a33a", step: { kind: "power", action: "restart" }, danger: true },
  { id: "shutdown", label: tt("Kapat"), icon: "power", color: "#f0545c", step: { kind: "power", action: "shutdown" }, danger: true },
];

/** İlk açılışta tuşlar boş kalmasın */
export const DEFAULT_DECK: DeckKey[] = ["mic", "mute", "desktop", "lock"].map((id) => {
  const a = ACTIONS.find((x) => x.id === id)!;
  return { id: `d-${id}`, label: a.label, icon: a.icon, color: a.color, steps: [a.step] };
});

/** Tuşlar: hiç düzenlenmediyse hazır olanlar */
export const useDeck = () => useNook((s) => s.deck) ?? DEFAULT_DECK;
export const getDeck = () => useNook.getState().deck ?? DEFAULT_DECK;

export const keyFromAction = (id: string): DeckKey => {
  const a = ACTIONS.find((x) => x.id === id)!;
  return { id: crypto.randomUUID(), label: a.label, icon: a.icon, color: a.color, steps: [a.step] };
};

/** Bilgisayarı kapatan/uyutan tuş: yanlışlıkla basılmasın, ikinci basışta çalışır */
export const isDangerous = (k: DeckKey) => k.steps.some((s) => s.kind === "power" && (s.action === "sleep" || s.action === "shutdown" || s.action === "restart"));

/** Adımın kısa anlatımı (Studio'daki listede) */
export function stepLabel(s: DeckStep): string {
  switch (s.kind) {
    case "open":
      return tt("{0} aç", s.name);
    case "quick":
      return `${ACTIONS.find((a) => a.step.kind === "quick" && a.step.key === s.key)?.label ?? s.key}${s.on == null ? tt(" (aç/kapa)") : s.on ? tt(" açık") : tt(" kapalı")}`;
    default:
      return ACTIONS.find((a) => JSON.stringify(a.step) === JSON.stringify(s))?.label ?? s.kind;
  }
}

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

async function runStep(s: DeckStep) {
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
      return quickSet(s.key, on);
    }
    case "power":
      return quickAction(s.action);
    case "media":
      return mediaControl(s.action);
    case "nook":
      if (s.action === "focus") return void startFocus("work", 0);
      if (s.action === "shield") return shieldOn(false);
      return toggleHum();
  }
}

/** Tuşa basıldı: adımlar sırayla (aralarında kısa nefes), hata olursa adada söylenir */
export async function runKey(k: DeckKey) {
  for (const [i, s] of k.steps.entries()) {
    try {
      await runStep(s);
    } catch (e) {
      useNook.getState().pushToast({ kind: "chat", title: tt("{0} yapılamadı", k.label), detail: String(e), ms: 4000 });
      return;
    }
    if (i < k.steps.length - 1) await wait(s.kind === "open" ? 450 : 150);
  }
}
