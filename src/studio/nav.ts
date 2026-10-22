/** Studio'nun bölümleri (soldaki menü ve ana sayfadaki kısayollar) */
import { Clapperboard, Fish, Gamepad2, GraduationCap, House, Keyboard, LayoutDashboard, Newspaper, Settings, Shirt, Sparkles, type LucideIcon } from "lucide-react";
import { ACCENT } from "../components/ui/primitives";
import { ARGUS_BLUE } from "../components/ArgusPromo";
import type { StudioPage } from "../lib/studio";
import { tt } from "../lib/i18n";

export const NAV: { id: StudioPage; label: string; icon: LucideIcon; color: string; hint: string }[] = [
  { id: "home", label: tt("Ana sayfa"), icon: House, color: ACCENT.purple, hint: tt("Nook ve bugün") },
  { id: "look", label: tt("Görünüm"), icon: Shirt, color: ACCENT.pink, hint: tt("Gövde, renk, aksesuar") },
  { id: "keys", label: tt("Kısayollar"), icon: Keyboard, color: ACCENT.blue, hint: tt("Tuşlar ve rutinler") },
  { id: "modules", label: tt("Modüller"), icon: LayoutDashboard, color: ACCENT.green, hint: tt("Ana sayfa, profiller") },
  { id: "argus", label: "Argus", icon: Clapperboard, color: ARGUS_BLUE, hint: tt("Diziler ve filmler") },
  { id: "report", label: tt("Karne"), icon: GraduationCap, color: ACCENT.teal, hint: tt("Bu hafta nasıldı") },
  { id: "year", label: tt("Yıl özeti"), icon: Sparkles, color: ACCENT.yellow, hint: tt("Yılın nasıl geçti") },
  { id: "games", label: tt("Oyunlar"), icon: Gamepad2, color: ACCENT.red, hint: tt("Ne kadar oynadın") },
  { id: "aquarium", label: tt("Akvaryum"), icon: Fish, color: ACCENT.blue, hint: tt("Oltadan çıkanlar") },
  { id: "notes", label: tt("Yama notları"), icon: Newspaper, color: ACCENT.orange, hint: tt("Yeni gelenler") },
  { id: "settings", label: tt("Ayarlar"), icon: Settings, color: ACCENT.gray, hint: tt("Her şey") },
];
