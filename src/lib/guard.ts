/**
 * Odak bekçisi: Pomodoro'nun çalışma fazında öndeki pencere listedeki bir site/uygulamaysa Nook
 * adayı açıp cama vurur ("Çalışmıyor muyduk?"). Siteler tarayıcı başlığından, uygulamalar
 * (Discord, Steam…) exe adından anlaşılır. Başlık yalnızca bu bilgisayarda okunur.
 */
import type { ForegroundPayload } from "./bridge";

const BROWSERS = new Set([
  "chrome", "msedge", "firefox", "opera", "opera_gx", "brave", "vivaldi", "arc", "zen", "yandex", "browser", "chromium",
  "waterfox", "librewolf", "floorp", "thorium", "iexplore",
]);

/** Kısa ya da başka kelimelerin içinde geçen adların özel kalıbı */
const SPECIAL: Record<string, RegExp> = {
  // "Ana Sayfa / X", "(3) Gönderi / X", "x.com", "Twitter"
  x: /\/ X(\s|$)|\bx\.com\b|\btwitter\b/i,
  twitter: /\/ X(\s|$)|\bx\.com\b|\btwitter\b/i,
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Öndeki pencere listedeki bir yerse onun adı (listede yazıldığı gibi), değilse null */
export function matchSite(fg: ForegroundPayload | null, sites: string[]): string | null {
  if (!fg || (!fg.title && !fg.app)) return null;
  const browser = BROWSERS.has(fg.app);
  for (const raw of sites) {
    const name = raw.trim();
    if (!name) continue;
    // "Instagram"ın İ'si Türkçe küçültmede bozulmasın: düz küçült
    const key = name.toLowerCase();
    // Uygulama: exe adı ("discord", "steam")
    if (!browser && key.length >= 3 && fg.app.includes(key.replace(/\s+/g, ""))) return name;
    if (!browser) continue;
    const re = SPECIAL[key] ?? new RegExp(`(^|[^\\p{L}\\p{N}])${escape(key)}([^\\p{L}\\p{N}]|$)`, "iu");
    if (re.test(fg.title)) return name;
  }
  return null;
}
