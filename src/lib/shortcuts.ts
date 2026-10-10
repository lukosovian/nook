/**
 * Nook'un genel kısayolları tek listede (Ayarlar › Kısayollar, tanıtım) ve bilinen çakışmalar.
 *
 * Windows'ta genel kısayol, kaydeden programın olur: Nook bir kombinasyonu alınca o tuşlar başka
 * programlarda (Word'ün Özel Yapıştır'ı, Chrome'un sekme araması…) artık çalışmaz. Diğer programlar
 * kısayollarını genelde Windows'a kaydetmediği için Nook bunu kendisi fark edemez; bu yüzden sık
 * kullanılan programların bilinen kısayolları burada listelenir ve o program bu bilgisayarda
 * kuruluysa kullanıcıya söylenir.
 */
import { useEffect, useState } from "react";
import type { Settings } from "../store/nook";
import { inTauri, listApps } from "./bridge";
import { tt } from "./i18n";

export type ShortcutKey =
  | "shortcut"
  | "askShortcut"
  | "voiceShortcut"
  | "humShortcut"
  | "shieldShortcut"
  | "shelfShortcut"
  | "plainPasteShortcut"
  | "liveShortcut"
  | "outputShortcut";

export interface ShortcutInfo {
  key: ShortcutKey;
  label: string;
  /** Kaldırılabilir mi (Sil tuşu kısayolu kaldırır) */
  clearable: boolean;
}

export const SHORTCUTS: ShortcutInfo[] = [
  { key: "shortcut", label: tt("Hızlı arama"), clearable: false },
  { key: "askShortcut", label: tt("Ekrana sor"), clearable: false },
  { key: "voiceShortcut", label: tt("Sesli komut (basılı tut)"), clearable: false },
  { key: "humShortcut", label: tt("Hum: çalan şarkıyı bul"), clearable: true },
  { key: "shieldShortcut", label: tt("Gizlilik kalkanı"), clearable: false },
  { key: "shelfShortcut", label: tt("Gezgin'de seçili dosyaları rafa ekle"), clearable: true },
  { key: "plainPasteShortcut", label: tt("Düz metin olarak yapıştır"), clearable: true },
  { key: "liveShortcut", label: tt("Yayın maskesini aç / kapat"), clearable: true },
  { key: "outputShortcut", label: tt("Ses çıkışını değiştir"), clearable: true },
];

const BROWSERS = /chrome|edge|brave|opera|vivaldi|firefox/i;
const OFFICE = /^(microsoft )?(word|excel|powerpoint|outlook|onenote)\b/i;
const VSCODE = /visual studio code|^cursor$/i;
const JETBRAINS = /intellij|pycharm|webstorm|rider|clion|goland|phpstorm|rubymine|datagrip|android studio/i;

/**
 * Sık kullanılan programların aynı tuşlara bağlı işleri (küçük harf, boşluksuz). `apps`: yalnızca bu
 * programlardan biri kuruluysa uyar (Başlat menüsündeki adlara bakılır); yoksa her bilgisayarda geçerli.
 */
const KNOWN: Record<string, { what: string; apps?: RegExp }> = {
  "ctrl+shift+a": { what: tt("tarayıcıda sekme arama"), apps: BROWSERS },
  "ctrl+shift+d": { what: tt("tarayıcıda bütün sekmeleri yer imine ekleme"), apps: BROWSERS },
  "ctrl+shift+n": { what: tt("tarayıcıda gizli pencere"), apps: BROWSERS },
  "ctrl+shift+t": { what: tt("tarayıcıda kapanan sekmeyi geri açma"), apps: BROWSERS },
  "ctrl+shift+space": { what: tt("VS Code'da parametre ipuçları"), apps: VSCODE },
  "ctrl+shift+v": { what: tt("birçok programda düz metin yapıştırma") },
  "ctrl+shift+s": { what: tt("birçok programda Farklı Kaydet") },
  "ctrl+shift+esc": { what: tt("Görev Yöneticisi") },
  "ctrl+alt+delete": { what: tt("Windows güvenlik ekranı") },
  "ctrl+alt+v": { what: tt("Word ve Excel'de Özel Yapıştır"), apps: OFFICE },
  "ctrl+alt+l": { what: tt("JetBrains IDE'lerinde kodu biçimlendirme"), apps: JETBRAINS },
  "ctrl+alt+m": { what: tt("JetBrains IDE'lerinde metot çıkarma"), apps: JETBRAINS },
  "ctrl+alt+h": { what: tt("JetBrains IDE'lerinde çağrı hiyerarşisi"), apps: JETBRAINS },
  "ctrl+alt+s": { what: tt("JetBrains IDE'lerinde ayarlar"), apps: JETBRAINS },
};

const norm = (combo: string) => combo.toLowerCase().replace(/\s+/g, "");

/** Başlat menüsündeki program adları (bir kez okunur) */
let appNames: Promise<string[]> | null = null;
const loadAppNames = () =>
  (appNames ??= inTauri
    ? listApps()
        .then((list) => list.map((a) => a.name))
        .catch(() => [])
    : // Tarayıcı önizlemesi: uyarılar görünsün diye birkaç örnek program
      Promise.resolve(["Google Chrome", "Word", "Visual Studio Code"]));

/** Kurulu programların adları; yüklenene kadar boş */
export function useInstalledApps(): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => void loadAppNames().then(setNames), []);
  return names;
}

/** Bu kombinasyon bu bilgisayardaki bilinen bir programın işini elinden alıyor mu? Alıyorsa o iş. */
export function conflictOf(combo: string, apps: string[]): string | null {
  const k = combo ? KNOWN[norm(combo)] : undefined;
  if (!k) return null;
  return !k.apps || apps.some((a) => k.apps!.test(a)) ? k.what : null;
}

/** Rust'ın kısayolları kaydettiği sıra (src-tauri/src/shortcut.rs): aynı tuşlar iki işe verildiyse önce gelen kazanır */
const REGISTER_ORDER: ShortcutKey[] = ["shortcut", "askShortcut", "voiceShortcut", "shieldShortcut", "shelfShortcut", "plainPasteShortcut", "outputShortcut", "liveShortcut", "humShortcut"];

/** Aynı kombinasyon Nook'ta başka bir işe de verildiyse ve o önce kaydediliyorsa, o iş (bu kısayol çalışmaz) */
export function duplicateOf(settings: Settings, key: ShortcutKey): ShortcutInfo | null {
  const combo = settings[key];
  if (!combo) return null;
  const at = REGISTER_ORDER.indexOf(key);
  const first = REGISTER_ORDER.slice(0, at).find((k) => settings[k] && norm(settings[k]) === norm(combo));
  return first ? SHORTCUTS.find((x) => x.key === first)! : null;
}

/** Şu anki kısayollardan çakışanlar: [kısayol, kombinasyon, çakıştığı iş] */
export function conflicts(settings: Settings, apps: string[]): { info: ShortcutInfo; combo: string; with: string }[] {
  return SHORTCUTS.flatMap((info) => {
    const combo = settings[info.key];
    const w = conflictOf(combo, apps);
    return w ? [{ info, combo, with: w }] : [];
  });
}

/** "Ctrl+Shift+Space" → "Ctrl + Shift + Boşluk" */
export const prettyKeys = (combo: string) => combo.replace("Space", tt("Boşluk")).split("+").join(" + ");
