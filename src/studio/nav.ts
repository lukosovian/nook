/** Studio'nun bölümleri (soldaki menü ve ana sayfadaki kısayollar) */
import { Clapperboard, Fish, Gamepad2, GraduationCap, House, Keyboard, LayoutDashboard, Newspaper, Settings, Shirt, Sparkles, Wallpaper, type LucideIcon } from "lucide-react";
import { ACCENT } from "../components/ui/primitives";
import { ARGUS_BLUE } from "../components/ArgusPromo";
import type { StudioPage } from "../lib/studio";
import { tt } from "../lib/i18n";

/** Soldaki menünün grupları; "foot" (Yama notları, Ayarlar) altta sabit durur */
export type NavGroup = "nook" | "order" | "history" | "foot";
export const NAV_GROUPS: { id: Exclude<NavGroup, "foot">; label: string }[] = [
  { id: "nook", label: "Nook" },
  { id: "order", label: tt("Düzen") },
  { id: "history", label: tt("Geçmiş") },
];

export const NAV: { id: StudioPage; label: string; icon: LucideIcon; color: string; hint: string; group: NavGroup }[] = [
  { id: "home", label: tt("Ana sayfa"), icon: House, color: ACCENT.purple, hint: tt("Nook ve bugün"), group: "nook" },
  { id: "look", label: tt("Görünüm"), icon: Shirt, color: ACCENT.pink, hint: tt("Gövde, renk, aksesuar"), group: "nook" },
  { id: "wallpaper", label: tt("Duvar kağıtları"), icon: Wallpaper, color: ACCENT.teal, hint: tt("Nook'lu arka planlar"), group: "nook" },
  { id: "modules", label: tt("Modüller"), icon: LayoutDashboard, color: ACCENT.green, hint: tt("Ana sayfa, profiller"), group: "order" },
  { id: "keys", label: tt("Tuşlar ve otomasyonlar"), icon: Keyboard, color: ACCENT.blue, hint: tt("Tek basışta çalışan tuşların"), group: "order" },
  { id: "report", label: tt("Karne"), icon: GraduationCap, color: ACCENT.teal, hint: tt("Bu hafta nasıldı"), group: "history" },
  { id: "year", label: tt("Yıl özeti"), icon: Sparkles, color: ACCENT.yellow, hint: tt("Yılın nasıl geçti"), group: "history" },
  { id: "games", label: tt("Oyun süresi"), icon: Gamepad2, color: ACCENT.red, hint: tt("Ne kadar oynadın"), group: "history" },
  { id: "argus", label: "Argus", icon: Clapperboard, color: ARGUS_BLUE, hint: tt("Diziler ve filmler"), group: "history" },
  { id: "aquarium", label: tt("Akvaryum"), icon: Fish, color: ACCENT.blue, hint: tt("Oltadan çıkanlar"), group: "history" },
  { id: "notes", label: tt("Yama notları"), icon: Newspaper, color: ACCENT.orange, hint: tt("Yeni gelenler"), group: "foot" },
  { id: "settings", label: tt("Ayarlar"), icon: Settings, color: ACCENT.gray, hint: tt("Her şey"), group: "foot" },
];
