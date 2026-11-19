/**
 * "Ne kadar konuşkan olayım?": Nook'un kendiliğinden çıkardığı kartların üç hazır ayarı.
 * Seçim mevcut ayarları toplu değiştirir (hepsi Ayarlar'da tek tek de duruyor) ve `settings.chattiness`e yazılır.
 * Alarm, hatırlatıcı, takvim ve kullanıcının kendi açtığı molalar hiçbir düzeyde kapanmaz.
 */
import { DEFAULT_SETTINGS, useNook, type Settings } from "../store/nook";
import { tt } from "./i18n";

export type Chattiness = NonNullable<Settings["chattiness"]>;

export const CHATTINESS: { id: Chattiness; label: string; hint: string; recommended?: boolean }[] = [
  { id: "quiet", label: tt("Sessiz"), hint: tt("Yalnızca alarmlar ve senin kurdukların") },
  { id: "balanced", label: tt("Dengeli"), hint: tt("Günün özeti, su hatırlatması, önemli olaylar"), recommended: true },
  { id: "lively", label: tt("Canlı"), hint: tt("Hepsi: gezintiler, oyun teklifleri, karşılama, günlük") },
];

/** Düzeyin değiştirdiği ayarlar ("Canlı" = varsayılanlar). Su aralığı kullanıcınınsa korunur. */
export function chattinessPatch(level: Chattiness, cur: Settings = useNook.getState().settings): Partial<Settings> {
  const D = DEFAULT_SETTINGS;
  const basics = level !== "quiet";
  const all = level === "lively";
  return {
    chattiness: level,
    // Dengeli ve üstü: günün özeti, su, sistem olayları ve uyarıları
    dailySummary: basics,
    dayClose: basics,
    waterEvery: basics ? cur.waterEvery || D.waterEvery : 0,
    events: basics,
    sysAlerts: basics,
    // Yalnızca Canlı: gezintiler, oyun teklifleri, karşılama, oyun kartları ve molası, günlük
    outings: all,
    playOffers: all,
    welcomeBack: all ? cur.welcomeBack || D.welcomeBack : 0,
    gameSummary: all,
    gameIntro: all,
    breakReminderMin: all ? cur.breakReminderMin || D.breakReminderMin : 0,
    diary: all,
  };
}

export function applyChattiness(level: Chattiness) {
  const s = useNook.getState();
  s.updateSettings(chattinessPatch(level, s.settings));
}
