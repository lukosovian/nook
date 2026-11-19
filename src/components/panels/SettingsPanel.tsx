import { createContext, useContext, useEffect, useState, useRef } from "react";
import { AudioLines, Bell, BellRing, Check, ChevronDown, Eye, EyeOff, FolderUp, Gamepad2, HeartPulse, HelpCircle, Info, Keyboard, LayoutGrid, Lock, MonitorSmartphone, Moon, Music, Play, Power, QrCode, Settings2, ShieldCheck, Smartphone, Sparkles, X, type LucideIcon } from "lucide-react";
import { useClaudeAi, useGemini } from "../../hooks/useGemini";
import { CLAUDE_MODELS } from "../../lib/anthropic";
import { sttDelete, sttDownload, sttStatus, type SttStatus } from "../../lib/bridge";
import { INVESTORS, refreshSupporters, REPO_URL, useSupporters } from "../../lib/supporters";
import { EVENTS, subscribe, wakeEnroll, wakeEnrollReset, wakeEnrollSave, wakeForget, wakeStatus, type WakeHeard, type WakeStatus } from "../../lib/bridge";
import { alarmRing, listMonitors, logDir, openPath, quickState, remoteControlSet, remoteInfo, remoteReset, remoteSet, remoteTestNotification, shieldOn, outsideFixFirewall, outsideInstallTailscale, outsideOpenTailscale, outsideStatus, wakeOutsideSet, wakeOutsideStatus, wolFix, wolStatus, type AudioOutput, type MonitorInfo, type OutsideStatus, type RemoteInfo, type WakeOutside, type WolStatus } from "../../lib/bridge";
import { autoLogonGuide, biosGuide, routerGuide, type Guide } from "../../lib/wakeGuide";
import { syncFeeds } from "../../lib/ics";
import { shortName } from "./ControlPanel";
import { checkPassword, hashPassword } from "../../lib/lock";
import { startTour } from "../../lib/tour";
import { openStudio, isStudio, studioGo } from "../../lib/studio";
import { checkUpdate, installUpdate, useUpdate } from "../../lib/update";
import { chooseArgusDir, openArgus, useArgus } from "../../lib/argus";
import { DEFAULT_SETTINGS, inQuietHours, SULK_BELOW, useNook, type Settings, FEATURED_SCENES } from "../../store/nook";
import { applyChattiness, CHATTINESS, chattinessPatch } from "../../lib/chattiness";
import { fold } from "../../lib/search";
import { latestNote, NOTES } from "../../lib/notes";
import { normalizeColor, normalizeLook } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { motion } from "motion/react";
import { ACCENT, Bar, MiniNook, PrimaryButton, SectionLabel, Segmented, TextButton, Toggle, Dropdown, tintBg, tintText } from "../ui/primitives";
import { INTRO_KINDS } from "../overlays/Intro";
import { MOVE_KINDS } from "../../lib/moveFx";
import { IntroPreview, MovePreview, UpdateAnimGallery } from "./EffectPreview";
import { UpdateBody } from "../overlays/UpdateAnims";
import { LangDropdown } from "../ui/LangPicker";
import { isTurkish, pct, tt } from "../../lib/i18n";
import { playSfx, type Sfx } from "../../lib/sfx";
import { activeScenes, SCENE_LIST, type SceneMode } from "../shield/catalog";
import { conflictOf, duplicateOf, isFailed, prettyKeys, SHORTCUTS, spareShortcut, useInstalledApps, useShortcutFailures } from "../../lib/shortcuts";
import { FeedbackSection } from "./FeedbackSection";

const MONITOR_MODES: { id: Settings["monitorMode"]; label: string }[] = [
  { id: "primary", label: tt("Ana") },
  { id: "follow", label: tt("İmleç") },
  { id: "all", label: tt("Tümü") },
  { id: "fixed", label: tt("Seçili") },
];

const SLEEP: { id: number; label: string }[] = [
  { id: 30, label: tt("30 sn") },
  { id: 90, label: tt("1,5 dk") },
  { id: 300, label: tt("5 dk") },
  { id: 0, label: tt("Hiç") },
];

const WELCOME: { id: number; label: string }[] = [
  { id: 0, label: tt("Yok") },
  { id: 5, label: tt("5 dk") },
  { id: 10, label: tt("10 dk") },
  { id: 30, label: tt("30 dk") },
];

const GAME_BREAK: { id: number; label: string }[] = [
  { id: 0, label: tt("Yok") },
  { id: 60, label: tt("1 sa") },
  { id: 120, label: tt("2 sa") },
  { id: 180, label: tt("3 sa") },
];

const LOG_DAYS: { id: number; label: string }[] = [
  { id: 3, label: tt("3 gün") },
  { id: 7, label: tt("1 hafta") },
  { id: 14, label: tt("2 hafta") },
  { id: 30, label: tt("1 ay") },
];

const SCALES: { id: number; label: string }[] = [
  { id: 0.8, label: pct(80) },
  { id: 0.9, label: pct(90) },
  { id: 1, label: pct(100) },
  { id: 1.15, label: pct(115) },
  { id: 1.3, label: pct(130) },
  { id: 1.5, label: pct(150) },
];

const VISION: { id: Settings["colorVision"]; label: string }[] = [
  { id: "normal", label: tt("Normal") },
  { id: "protan", label: tt("Protanopi (kırmızı zayıf)") },
  { id: "deutan", label: tt("Döteranopi (yeşil zayıf)") },
  { id: "tritan", label: tt("Tritanopi (mavi-sarı zayıf)") },
];

const WEATHER_LEVEL: { id: "low" | "mid" | "high"; label: string }[] = [
  { id: "low", label: tt("Az") },
  { id: "mid", label: tt("Orta") },
  { id: "high", label: tt("Çok") },
];

const NOTIFY_SECS: { id: number; label: string }[] = [
  { id: 0, label: tt("Otomatik") },
  { id: 3, label: tt("3 sn") },
  { id: 6, label: tt("6 sn") },
  { id: 10, label: tt("10 sn") },
  { id: 20, label: tt("20 sn") },
];

const WATER: { id: number; label: string }[] = [
  { id: 0, label: tt("Yok") },
  { id: 45, label: tt("45 dk") },
  { id: 60, label: tt("1 sa") },
  { id: 90, label: tt("90 dk") },
];

export type CatId = "general" | "island" | "notify" | "health" | "game" | "privacy" | "voice" | "modules" | "shortcuts" | "phone" | "about";

/** Ayarların kategorileri: önce ızgara, birine basınca kendi sayfası. `sections`: içindeki bölüm başlıkları (atlama için) */
export const CATS: { id: CatId; title: string; hint: string; icon: LucideIcon; color: string; sections: string[] }[] = [
  { id: "general", title: tt("Genel"), hint: tt("Dil, görünüm, ekran, boyut"), icon: Settings2, color: ACCENT.blue, sections: ["Nook", tt("Gün"), tt("Ekran"), tt("Erişilebilirlik"), tt("Performans")] },
  { id: "island", title: tt("Ada ve Nook"), hint: tt("Uyku, gezinti, animasyonlar"), icon: Sparkles, color: ACCENT.pink, sections: [tt("Ada"), tt("Animasyonlar")] },
  { id: "notify", title: tt("Bildirimler"), hint: tt("Bildirim kartları, sessiz saatler, uyarılar"), icon: Bell, color: ACCENT.purple, sections: [tt("Bildirimler")] },
  { id: "health", title: tt("Sağlık"), hint: tt("Su, göz molası, odak bekçisi"), icon: HeartPulse, color: ACCENT.teal, sections: [tt("Mola hatırlatıcıları"), tt("Odak bekçisi")] },
  { id: "game", title: tt("Tam ekran"), hint: tt("Oyun ve video, oyun özeti, mola"), icon: Gamepad2, color: ACCENT.orange, sections: [tt("Tam ekran")] },
  { id: "privacy", title: tt("Gizlilik"), hint: tt("Kalkan, parola, yayın, hassas veri"), icon: ShieldCheck, color: ACCENT.red, sections: [tt("Yayın ve hassas veri"), tt("Gizlilik kalkanı"), tt("Parola kilidi")] },
  { id: "voice", title: tt("Sohbet ve asistan"), hint: tt("Gemini ya da Claude, Hey Nook, sesler"), icon: AudioLines, color: ACCENT.yellow, sections: [tt("Yapay zekâ"), "Hey Nook", tt("Ses")] },
  { id: "modules", title: tt("Modül ayarları"), hint: tt("Pano, Raf, Takvim, Hum, Argus"), icon: LayoutGrid, color: ACCENT.green, sections: [tt("Pano ve notlar"), tt("Raf"), tt("Takvim"), tt("Hava durumu"), "Hum", "Argus"] },
  { id: "shortcuts", title: tt("Klavye kısayolları"), hint: tt("Her yerde çalışan tuşlar"), icon: Keyboard, color: ACCENT.blue, sections: [tt("Klavye kısayolları")] },
  { id: "phone", title: tt("Telefon"), hint: tt("Nook Mobil, uzaktan açma"), icon: Smartphone, color: ACCENT.teal, sections: [tt("Telefon")] },
  { id: "about", title: tt("Hakkında"), hint: tt("Tanıtım, güncelleme, geribildirim, destekçiler"), icon: Info, color: ACCENT.gray, sections: [tt("Hakkında"), tt("Günlük kayıtları"), tt("Geribildirim"), tt("Destekçiler")] },
];

/** Bölüm başlığından kategorisi ("Ayarlar › Klavye kısayolları"na gönderme gibi); önce tam ad, sonra başı tutan */
export const catOf = (section: string) =>
  (CATS.find((c) => c.sections.includes(section)) ?? CATS.find((c) => c.sections.some((t) => t.startsWith(section) || section.startsWith(t))))?.id ?? null;

/**
 * Studio › Ayarlar'ın satırlara verdiği bağlam: arama metni (`fold`lanmış; ararken dolu), satırın kategorisi
 * ve bir kategoriye (istenirse içindeki satıra) atlama.
 */
export const SettingsNav = createContext<{ q: string; cat: CatId | null; jump: (id: CatId, row?: string) => void }>({
  q: "",
  cat: null,
  jump: (id) => openStudio(`settings:${CATS.find((c) => c.id === id)!.sections[0]}`),
});

/** Arama hiçbir şey bulamayınca: yazılana en çok benzeyen satırlar (ortak baş harfler + ortak harf ikilileri) */
export function nearestRows(el: HTMLElement, q: string, n = 3): { label: string; cat: CatId }[] {
  const grams = (s: string) => new Set(Array.from({ length: Math.max(0, s.length - 1) }, (_, i) => s.slice(i, i + 2)));
  const qg = grams(q);
  const score = (w: string) => {
    let p = 0;
    while (p < q.length && p < w.length && q[p] === w[p]) p++;
    const wg = grams(w);
    let both = 0;
    qg.forEach((g) => wg.has(g) && both++);
    return p / q.length + (2 * both) / (qg.size + wg.size || 1);
  };
  const seen = new Set<string>();
  return [...el.querySelectorAll<HTMLElement>("[data-row][data-label]")]
    .map((row) => ({
      label: row.dataset.label!,
      cat: row.closest<HTMLElement>("[data-cat]")?.dataset.cat as CatId,
      score: Math.max(0, ...(row.dataset.row ?? "").split(/\s+/).filter(Boolean).map(score)),
    }))
    .filter((r) => r.cat && r.score > 0.55)
    .sort((a, b) => b.score - a.score)
    .filter((r) => !seen.has(r.label) && seen.add(r.label))
    .slice(0, n);
}

/**
 * Ayarlarda arama: kategoriler alt alta çizilmişken eşleşmeyen satırlar ve bölümler gizlenir.
 * `q` `fold`lanmış gelir (büyük/küçük harf ve ı/i fark etmez); satırların eş anlamlı anahtar sözcükleri de
 * aranır. `setEmpty`: hiçbir şey eşleşmedi mi.
 */
export function useSettingsFilter(scroller: React.RefObject<HTMLElement | null>, q: string, setEmpty: (v: boolean) => void) {
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (!q) {
      // Arama silinince gizlenen her şey geri gelsin
      el.querySelectorAll<HTMLElement>("[data-cat], section[data-sec], [data-row], section[data-sec] > div > *").forEach((x) => (x.style.display = ""));
      setEmpty(false);
      return;
    }
    const filter = () => {
      let total = false;
      el.querySelectorAll<HTMLElement>("[data-cat]").forEach((catEl) => {
        let catHit = false;
        catEl.querySelectorAll<HTMLElement>("section[data-sec]").forEach((sec) => {
          const secHit = fold(sec.dataset.sec ?? "").includes(q);
          let any = false;
          sec.querySelectorAll<HTMLElement>("[data-row]").forEach((row) => {
            const hit = secHit || (row.dataset.row ?? "").includes(q);
            row.style.display = hit ? "" : "none";
            any ||= hit;
          });
          // Satır dışındaki açıklamalar ve özel içerik yalnızca bölüm adı tutuyorsa
          sec.querySelectorAll<HTMLElement>(":scope > div > *").forEach((x) => {
            if (!x.matches("[data-row]") && !x.querySelector("[data-row]")) x.style.display = secHit ? "" : "none";
          });
          sec.style.display = any || secHit ? "" : "none";
          catHit ||= any || secHit;
        });
        catEl.style.display = catHit ? "" : "none";
        total ||= catHit;
      });
      setEmpty(!total);
    };
    filter();
    // Geç yüklenen satırlar (destekçiler, ekranlar) için bir kez daha
    const t = window.setTimeout(filter, 150);
    return () => window.clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Ayarlar nerede çiziliyor: adada sıkı, Studio'da geniş kartlar */
export const SettingsLook = createContext<"island" | "studio">("island");

/** Bir kategorinin bölümleri */
export function CategoryBody({ id }: { id: CatId }) {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const weatherHint = useWeatherHint(!s.weatherCity.trim());
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  useEffect(() => {
    if (id === "general") void listMonitors().then(setMonitors);
  }, [id]);
  // Önizleme sahneleri: ilk oynatışta açılır, her basışta baştan oynar
  const [preview, setPreview] = useState({ move: 0, intro: 0 });
  const replay = (k: "move" | "intro") => setPreview((p) => ({ ...p, [k]: p[k] + 1 }));

  switch (id) {
    case "general":
      return (
        <>
          <Section title="Nook">
            <Row label={tt("Dil") + (tt("Dil") === "Language" ? "" : " · Language")} keys="dil language lisan çeviri türkçe english ingilizce">
              <LangDropdown />
            </Row>
            <Affection />
            <Row label={tt("Adı ve görünümü")} hint={tt("Şekli, gözleri, şapkası, rengi")} keys="isim ad kıyafet tema renk karakter">
              <TextButton onClick={() => openStudio("look")}>{tt("Düzenle")}</TextButton>
            </Row>
            <Row label={tt("Windows açılınca başlat")} keys="başlangıç otomatik açılış autostart startup">
              <Toggle on={s.autostart} onChange={(v) => update({ autostart: v })} />
            </Row>
          </Section>
          <Section title={tt("Gün")}>
            <Row label={tt("Günün ilk açılışında özet")} hint={tt("Hava, takvim, yeni bölümler")} keys="sabah brifing günaydın günlük özet">
              <Toggle on={s.dailySummary} onChange={(v) => update({ dailySummary: v })} />
            </Row>
            <Row label={tt("Nook'un günlüğü")} hint={tt("Gece günün mizahi bir özetini kendi ağzından yazar (Gemini ile)")} keys="günce diary gece özet">
              <Toggle on={s.diary} onChange={(v) => update({ diary: v })} color={ACCENT.purple} />
            </Row>
            <Row label={tt("Akşam Günü kapat kartı")} hint={tt("Akşam ada boştayken bugünün özeti, ruh hâlin ve yarına bir not; seçtiğin saatten sonra açılır")} keys="akşam gün sonu kapanış ruh hali mood yarına not">
              <div className="flex items-center gap-1.5">
                {s.dayClose && (
                  <input type="time" aria-label={tt("Günü kapat saati")} value={s.dayCloseAt} onChange={(e) => e.target.value && update({ dayCloseAt: e.target.value })} className="rounded-full bg-well px-2 py-0.5 text-[11px] font-medium tabular-nums text-label outline-none [color-scheme:dark] focus:bg-well-hi" />
                )}
                <Toggle on={s.dayClose} onChange={(v) => update({ dayClose: v })} color={ACCENT.purple} />
              </div>
            </Row>
          </Section>
          <Section title={tt("Ekran")}>
            <Row label={tt("Hangi ekranda")} hint={tt("Ana ekran, imlecin olduğu, hepsi ya da seçtiğin")} keys="monitör ikinci ekran çoklu ekran">
              <Segmented id="monitor" options={MONITOR_MODES} value={s.monitorMode} onChange={(v) => update({ monitorMode: v })} color={ACCENT.blue} />
            </Row>
            {s.monitorMode === "fixed" && (
              <Row label={tt("Hangi ekran")}>
                <Dropdown
                  value={s.monitorName ?? ""}
                  onChange={(v) => update({ monitorName: v || null })}
                  maxWidth={150}
                  color={ACCENT.blue}
                  options={[{ id: "", label: tt("Ana ekran") }, ...monitors.map((m, i) => ({ id: m.name, label: tt("{0}. ekran · {1}×{2}", i + 1, m.width, m.height) }))]}
                />
              </Row>
            )}
            <Row label={tt("Adanın yeri")} hint={s.islandPos ? tt("Taşındı · üstteki ✥ ile sürükle") : tt("Üst orta · üstteki ✥ ile sürükle")}>
              <TextButton disabled={!s.islandPos} onClick={() => update({ islandPos: null })}>{tt("Ortala")}</TextButton>
            </Row>
            <Elsewhere label={tt("Tam ekranda ikinci ekrana geç")} cat="game" />
          </Section>
          <Section title={tt("Erişilebilirlik")}>
            <Row label={tt("Arayüz boyutu")} keys="yazı boyutu büyüt küçült ölçek zoom font">
              <Segmented id="scale" options={SCALES} value={s.uiScale} onChange={(v) => update({ uiScale: v })} />
            </Row>
            <Row label={tt("Net yazı")} hint={tt("Soluk gri yazılar açılır, koyu kartta daha kolay okunur")} keys="kontrast okunabilirlik karanlık dark tema">
              <Toggle on={s.clearText} onChange={(v) => update({ clearText: v })} color={ACCENT.yellow} />
            </Row>
            <Row label={tt("Daha az hareket")} hint={tt("Kayan, büyüyen animasyonlar ve hava efektleri durur. Windows'ta animasyonlar kapalıysa kendiliğinden azalır")}>
              <Toggle on={s.calmMotion} onChange={(v) => update({ calmMotion: v })} color={ACCENT.teal} />
            </Row>
            <Row label={tt("Renk körlüğü paleti")} keys="renk körü tema renkler">
              <Dropdown options={VISION} value={s.colorVision} onChange={(v) => update({ colorVision: v })} />
            </Row>
            <PalettePreview />
          </Section>
          <Section title={tt("Performans")}>
            <Row label={tt("Hafif kip")} hint={tt("Zayıf bilgisayarlar için: animasyonlar 30 karede, hava efektleri ve gezintiler kapalı")} keys="performans hız yavaş kasma fps işlemci cpu ram bellek">
              <Toggle on={s.lightMode} onChange={(v) => update({ lightMode: v })} color={ACCENT.green} />
            </Row>
            <Row label={tt("\"Hey Nook\" dinlemesi")} hint={tt("Sürekli mikrofonu dinler; kapalıyken işlemci kullanmaz")}>
              <Toggle on={s.wakeWord} onChange={(v) => update({ wakeWord: v })} color={ACCENT.teal} />
            </Row>
            <Elsewhere label={tt("Windows bildirimleri")} cat="notify" />
            <Elsewhere label={tt("Ara sıra dışarı çıksın")} cat="island" />
          </Section>
        </>
      );
    case "island":
      return (
        <>
          <Section title={tt("Ada")}>
            <ChattinessRow />
            <Row label={tt("Uyuma süresi")} hint={tt("Bu kadar dokunulmazsa Nook uyur")} keys="uyku boşta bekleme">
              <Segmented id="sleep" options={SLEEP} value={s.sleepAfterSec} onChange={(v) => update({ sleepAfterSec: v })} />
            </Row>
            <Row label={tt("Ara sıra dışarı çıksın")} hint={tt("Pencereye tüner, iple sarkar, balık tutar")} keys="gezinti gezi dolaş">
              <Toggle on={s.outings} onChange={(v) => update({ outings: v })} />
            </Row>
            <Row label={tt("Ses kartı")} hint={tt("Ada açılınca solunda ses düzeyi kartı")} keys="ses volume hoparlör">
              <Toggle on={s.soundCard} onChange={(v) => update({ soundCard: v })} color={ACCENT.green} />
            </Row>
            <Row label={tt("Pilde yavaşla")} hint={tt("Pildeyken ve tasarruf modunda animasyonlar azalır")} keys="pil batarya şarj tasarruf">
              <Toggle on={s.powerSaver} onChange={(v) => update({ powerSaver: v })} />
            </Row>
            <Row label={tt("Dönünce karşıla")} hint={tt("Bu kadar süre yokken dönünce Nook sevinir")}>
              <Segmented id="settings-welcome" options={WELCOME} value={s.welcomeBack} onChange={(v) => update({ welcomeBack: v })} color={ACCENT.pink} />
            </Row>
            <Row label={tt("Sıkılınca oyun teklif etsin")}>
              <Toggle on={s.playOffers} onChange={(v) => update({ playOffers: v })} />
            </Row>
          </Section>
          <Section title={tt("Animasyonlar")}>
            <Row label={tt("Ekranlar arası geçiş")}>
              <div className="flex items-center gap-1.5">
                <Dropdown
                  value={s.moveStyle}
                  onChange={(v) => {
                    update({ moveStyle: v });
                    replay("move");
                  }}
                  color={ACCENT.blue}
                  options={[{ id: "random" as const, label: tt("Her seferinde farklı") }, ...MOVE_KINDS]}
                />
                <PreviewButton color={ACCENT.blue} onClick={() => replay("move")} />
              </div>
            </Row>
            {preview.move > 0 && <MovePreview style={s.moveStyle} run={preview.move} />}
            <Row label={tt("Açılış animasyonu")}>
              <div className="flex items-center gap-1.5">
                <Dropdown
                  value={s.introStyle}
                  onChange={(v) => {
                    update({ introStyle: v });
                    replay("intro");
                  }}
                  color={ACCENT.yellow}
                  options={[{ id: "random" as const, label: tt("Her seferinde farklı") }, ...INTRO_KINDS]}
                />
                <PreviewButton color={ACCENT.yellow} onClick={() => replay("intro")} />
              </div>
            </Row>
            {preview.intro > 0 && <IntroPreview style={s.introStyle} run={preview.intro} />}
            <Row label={tt("Güncelleme animasyonu")} hint={tt("Güncellenirken kapalı adada oynar; “Adada dene” ile hemen gör")}>
              {null}
            </Row>
            <UpdateAnimGallery />
          </Section>
        </>
      );
    case "notify":
      return (
        <Section title={tt("Bildirimler")}>
          <Row label={tt("Windows bildirimleri")} hint={tt("Gelen bildirimler adada kart olarak görünür")} keys="bildirim kartları notification uyarı">
            <Toggle on={s.notifications} onChange={(v) => update({ notifications: v })} />
          </Row>
          <QuietHoursRow />
          <Row label={tt("Kart ekranda kalma süresi")} hint={tt("Windows, telefon ve WhatsApp bildirim kartları; üstüne gelince süre durur")}>
            <Segmented id="settings-notify-secs" options={NOTIFY_SECS} value={s.notifySecs ?? 0} onChange={(v) => update({ notifySecs: v })} />
          </Row>
          <Row label={tt("WhatsApp bildirim kartları")} hint={tt("Mesaj gelince adada hızlı yanıt kartı çıkar; kapatırsan yalnızca modülde birikir")}>
            <Toggle on={s.whatsappNotify} onChange={(v) => update({ whatsappNotify: v })} color={ACCENT.green} />
          </Row>
          <Row label={tt("Olay kartları")} hint={tt("Şarj, USB, kulaklık, internet gibi olaylar")} keys="wifi kablosuz internet pil batarya şarj bluetooth">
            <Toggle on={s.events} onChange={(v) => update({ events: v })} />
          </Row>
          <Row label={tt("Ses / parlaklık göstergesi")} keys="ses volume hoparlör ekran ışığı osd">
            <Toggle on={s.osd} onChange={(v) => update({ osd: v })} />
          </Row>
          <Row label={tt("Sistem uyarıları")} hint={tt("Uzun süre yüksek işlemci / bellek, dolan disk")} keys="cpu ram depolama sıcaklık">
            <Toggle on={s.sysAlerts} onChange={(v) => update({ sysAlerts: v })} color={ACCENT.orange} />
          </Row>
        </Section>
      );
    case "health":
      return (
        <>
          <Section title={tt("Mola hatırlatıcıları")}>
            <Row label={tt("Su hatırlatıcısı")} hint={tt("Oyunda ve tam ekranda susar; telefonda da çıkar")} keys="su iç bardak sağlık">
              <Segmented id="settings-water" options={WATER} value={s.waterEvery} onChange={(v) => update({ waterEvery: v })} color={ACCENT.blue} />
            </Row>
            <Row label={tt("Göz molası")} hint={tt("20 dakikada bir 20 saniye uzağa bak")}>
              <Toggle on={s.eyeBreak} onChange={(v) => update({ eyeBreak: v })} />
            </Row>
            <Row label={tt("Duruş & esneme")} hint={tt("90 dakikada bir dik dur, omuzlarını aç")}>
              <Toggle on={s.stretchBreak !== false} onChange={(v) => update({ stretchBreak: v })} color={ACCENT.pink} />
            </Row>
          </Section>
          <Section title={tt("Odak bekçisi")}>
            <Row label={tt("Dikkat dağıtana girince uyar")} hint={tt("Pomodoro sürerken aşağıdaki sitelere / uygulamalara girersen")}>
              <Toggle on={s.focusGuard} onChange={(v) => update({ focusGuard: v })} color={ACCENT.red} />
            </Row>
            {s.focusGuard && (
              <Row label={tt("Siteler / uygulamalar")} hint={tt("Virgülle ayır")}>
                <TextInput
                  value={s.focusSites.join(", ")}
                  placeholder={tt("YouTube, X, Discord")}
                  onChange={(v) => update({ focusSites: v.split(",").map((x) => x.trim()).filter(Boolean) })}
                />
              </Row>
            )}
          </Section>
        </>
      );
    case "game":
      return (
        <Section title={tt("Tam ekran")}>
          <Row label={tt("Oyunda / tam ekranda gizlen")}>
            <Toggle on={s.hideInFullscreen} onChange={(v) => update({ hideInFullscreen: v })} />
          </Row>
          <Row label={tt("Tam ekranda ikinci ekrana geç")} hint={tt("Oyun ya da tam ekran video açıkken başka bir ekran varsa gizlenmek yerine oraya geçer")} keys="monitör çoklu ekran">
            <Toggle on={s.gameSecondScreen} onChange={(v) => update({ gameSecondScreen: v })} color={ACCENT.blue} />
          </Row>
          <Row label={tt("Oyun açılınca özet")} hint={tt("Kısa süre oyunun üstünde merhaba der")}>
            <Toggle on={s.gameIntro} onChange={(v) => update({ gameIntro: v })} />
          </Row>
          <Row label={tt("Oyundan çıkınca özet")} hint={tt("Ne kadar oynadın, bilgisayar ne kadar yoruldu")}>
            <Toggle on={s.gameSummary} onChange={(v) => update({ gameSummary: v })} />
          </Row>
          <Row label={tt("Oyun molası")} hint={tt("Bu kadar oynayınca mola hatırlatır")}>
            <Segmented id="settings-game-break" options={GAME_BREAK} value={s.breakReminderMin} onChange={(v) => update({ breakReminderMin: v })} color={ACCENT.orange} />
          </Row>
        </Section>
      );
    case "privacy":
      return (
        <>
          <Section title={tt("Yayın ve hassas veri")}>
            <Row label={tt("Yayında hassas bölümleri gizle")} hint={tt("Ekran paylaşınca ya da OBS açıkken Not, Pano, Bildirimler buzlanır")}>
              <Toggle on={s.liveMask} onChange={(v) => update({ liveMask: v })} color={ACCENT.red} />
            </Row>
            <Row label={tt("Hassas veri koruyucu")} hint={tt("Kopyalanan kart, IBAN, anahtar, şifre için uyarır")}>
              <Toggle on={s.sensitiveGuard} onChange={(v) => update({ sensitiveGuard: v })} />
            </Row>
          </Section>
          <ShieldSection />
          <LockSection />
        </>
      );
    case "voice":
      return (
        <>
          <AiSection />
          <WakeSection />
          <SoundSection />
        </>
      );
    case "modules":
      return (
        <>
          <ClipSection />
          <ShelfSection />
          <CalendarSection />
          <Section title={tt("Hava durumu")}>
            <Row label={tt("Hava durumu")} hint={tt("Bugün kartında ve günün özetinde")} keys="hava sıcaklık yağmur weather">
              <Toggle on={s.weather} onChange={(v) => update({ weather: v })} />
            </Row>
            {s.weather && (
              <Row label={tt("Şehir")} hint={weatherHint}>
                <TextInput value={s.weatherCity} placeholder={tt("Otomatik")} onChange={(v) => update({ weatherCity: v })} />
              </Row>
            )}
            <Row label={tt("Adada canlı atmosfer")} hint={tt("Hava durumuna göre adada yağmur, kar veya güneş efektleri")}>
              <Toggle on={s.weatherAtmosphere} onChange={(v) => update({ weatherAtmosphere: v })} color={ACCENT.blue} />
            </Row>
            {s.weatherAtmosphere && (
              <Row label={tt("Sıklık")} hint={tt("Az: yaprak, kar ve yağmur ara ara düşer")}>
                <Segmented id="weather-level" options={WEATHER_LEVEL} value={s.weatherLevel} onChange={(v) => update({ weatherLevel: v })} color={ACCENT.blue} />
              </Row>
            )}
          </Section>
          <Section title="Hum">
            <Row label={tt("Otomatik Hum")} hint={tt("Bilgisayarda çalan şarkıları arkada tanıyıp kaydeder; mikrofon kullanmaz")} keys="müzik şarkı tanıma shazam">
              <Toggle on={s.humAuto} onChange={(v) => update({ humAuto: v })} color={ACCENT.purple} />
            </Row>
          </Section>
          <ArgusSection />
        </>
      );
    case "shortcuts":
      return <ShortcutsSection />;
    case "phone":
      return <PhoneSection />;
    case "about":
      return (
        <>
          {isStudio && <AboutHero />}
          <Section title={tt("Hakkında")}>
            <Row label={tt("Nook nedir? Nasıl kullanılır?")}>
              {isStudio ? (
                <span className="flex gap-1.5">
                  <TextButton onClick={() => studioGo("tour")}>{tt("Burada aç")}</TextButton>
                  <TextButton onClick={() => void startTour()}>{tt("Adada aç")}</TextButton>
                </span>
              ) : (
                <TextButton onClick={() => void startTour()}>{tt("Tanıtımı aç")}</TextButton>
              )}
            </Row>
            {!isStudio && <UpdateRow />}
            <Row label="Instagram">
              <TextButton onClick={() => void openPath("https://www.instagram.com/nooktheblob/")}>@nooktheblob</TextButton>
            </Row>
          </Section>
          <Section title={tt("Günlük kayıtları")}>
            <Row label={tt("Kaç gün saklansın")} hint={tt("Her gün ayrı dosya; daha eskiler kendiliğinden silinir")}>
              <Segmented id="settings-log-days" options={LOG_DAYS} value={s.logDays ?? 14} onChange={(v) => update({ logDays: v })} color={ACCENT.gray} />
            </Row>
            <Row label={tt("Kayıtlar")} hint={tt("Bir sorun olursa o günün dosyasını gönderebilirsin")}>
              <TextButton onClick={() => void logDir().then((d) => (d ? openPath(d) : undefined))}>{tt("Klasörü aç")}</TextButton>
            </Row>
          </Section>
          <FeedbackSection />
          <SupportersSection />
        </>
      );
  }
}

/**
 * Studio › Ayarlar › Hakkında'nın başı: telefonların "Hakkında" ekranı gibi büyük Nook, kocaman ve renkli
 * sürüm numarası, büyük sürümse rozeti; altında güncelleme durumu ve düğmesi.
 */
function AboutHero() {
  const { current, available, progress, status, restarting, anim } = useUpdate();
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  const version = current || latestNote().version;
  const note = NOTES.find((n) => n.version === version);
  const grad = `linear-gradient(100deg, ${ACCENT.purple}, ${ACCENT.pink} 45%, ${ACCENT.orange})`;
  return (
    <section className="nook-card relative overflow-hidden rounded-[28px] px-8 py-7">
      <div className="pointer-events-none absolute -left-20 -top-28 h-[320px] w-[380px] rounded-full opacity-80" style={{ background: `radial-gradient(circle, ${tintBg(ACCENT.purple, 36)}, transparent 65%)` }} />
      <div className="pointer-events-none absolute -bottom-32 right-[-40px] h-[300px] w-[380px] rounded-full opacity-70" style={{ background: `radial-gradient(circle, ${tintBg(ACCENT.pink, 30)}, transparent 65%)` }} />
      <div className="relative flex items-center gap-7">
        <motion.div className="shrink-0" animate={{ y: [0, -6, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
          <NookFigure look={look} color={color} size={112} expression="happy" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold tracking-tight text-label-2">Nook</p>
          <p className="font-round text-[64px] font-extrabold leading-[0.95] tracking-[-0.04em] tabular-nums" style={{ background: grad, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            {version}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {note?.major && (
              <span className="rounded-full px-2.5 py-[3px] text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-white" style={{ background: grad, boxShadow: `0 6px 18px -8px ${ACCENT.pink}` }}>
                {tt("Büyük güncelleme")}
              </span>
            )}
            {note && <span className="text-[12px] text-label-3">{note.date}</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {progress !== null && anim ? (
            // Adadaki güncelleme kapsülünün aynısı: aynı animasyon, aynı ilerleme
            <div className="relative h-10 w-[300px] overflow-hidden rounded-[18px] bg-black shadow-[0_10px_26px_-8px_rgba(0,0,0,0.95)]">
              <div className="absolute left-[13px] top-1/2 -translate-y-1/2">
                <NookFigure look={look} color={color} size={26} expression={restarting ? "happy" : "downloading"} />
              </div>
              <UpdateBody anim={anim} p={progress} done={restarting} version={available} />
            </div>
          ) : progress !== null ? (
            <span className="text-[12.5px] font-bold tabular-nums" style={{ color: tintText(ACCENT.green) }}>
              {tt("İndiriliyor {0}", pct(progress))}
            </span>
          ) : available ? (
            <>
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => void installUpdate()} className="rounded-[13px] px-4 py-2 text-[13px] font-bold text-black" style={{ background: ACCENT.green }}>
                {status ? tt("Yeniden dene") : tt("{0} sürümüne güncelle", available)}
              </motion.button>
              {status && <span className="max-w-[280px] text-right text-[11.5px] leading-snug" style={{ color: tintText(ACCENT.red) }}>{status}</span>}
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: tintText(ACCENT.green) }}>
                <Check size={14} strokeWidth={3} /> {status || tt("Nook güncel")}
              </span>
              <TextButton onClick={() => void checkUpdate(true)}>{tt("Güncellemeleri denetle")}</TextButton>
            </>
          )}
          <TextButton onClick={() => studioGo("notes")}>{tt("Yama notları")}</TextButton>
        </div>
      </div>
    </section>
  );
}

/** Argus (dizi/film arşivi) — yalnızca bu bilgisayarda varsa görünür. */
export function ArgusSection() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const snap = useArgus((st) => st.snap);
  // Kurulu değilse burada görünmez; tanıtımı Modüller'deki Argus kartında
  if (!snap) return null;
  return (
    <Section title="Argus">
      <Row label={tt("Profil")}>
        <Dropdown
          value={s.argusProfile && snap.profiles.includes(s.argusProfile) ? s.argusProfile : ""}
          onChange={(v) => update({ argusProfile: v })}
          color={ACCENT.orange}
          options={[{ id: "", label: tt("Otomatik ({0})", snap.profile) }, ...snap.profiles.map((p) => ({ id: p, label: p }))]}
        />
      </Row>
      <Row label={tt("Yeni bölüm haberleri")}>
        <Toggle on={s.argusNews} onChange={(v) => update({ argusNews: v })} color={ACCENT.orange} />
      </Row>
      <Row label={tt("İzlediğimi fark et, işaretlemeyi sor")}>
        <Toggle on={s.argusDetect} onChange={(v) => update({ argusDetect: v })} color={ACCENT.orange} />
      </Row>
      {s.argusDetect && (
        <>
          <Row label={tt("Jenerik sonrası sahne varsa haber ver")}>
            <Toggle on={s.argusStinger} onChange={(v) => update({ argusStinger: v })} color={ACCENT.orange} />
          </Row>
          <Row label={tt("İzlerken içindeki müzikleri bul (Hum)")}>
            <Toggle on={s.humWatch} onChange={(v) => update({ humWatch: v })} color={ACCENT.purple} />
          </Row>
          <p className="-mt-0.5 pb-1 text-[10px] text-label-3">
            {tt("Argus'taki bir dizi ya da film çalarken Hum arkada dinler; çalan şarkıyı hangi dakikada çaldığıyla Argus'taki detay penceresinin Müzikler bölümüne yazar.")}
          </p>
          {s.humWatch && (
            <>
              <Row label={tt("Bulunan şarkıyı sol altta göster")}>
                <Toggle on={s.humToast} onChange={(v) => update({ humToast: v })} color={ACCENT.purple} />
              </Row>
              <p className="-mt-0.5 pb-1 text-[10px] text-label-3">
                {tt("Film ya da dizi izlerken bulunan şarkı videonun ekranının sol altında birkaç saniye görünür; Argus'a hangi dakikayla eklendiği de yazar.")}
              </p>
            </>
          )}
        </>
      )}
      <Row label={tt("Klasör")}>
        <div className="flex min-w-0 items-center gap-1">
          <span className="max-w-[150px] truncate text-[10.5px] text-label-3" title={snap.dir}>
            {snap.dir}
          </span>
          <TextButton onClick={() => void chooseArgusDir()}>{tt("Değiştir")}</TextButton>
        </div>
      </Row>
      <Row label={snap.running ? tt("Argus açık") : tt("Argus kapalı")}>
        <TextButton onClick={() => void openArgus()}>{tt("Argus'u aç")}</TextButton>
      </Row>
      <p className="-mt-0.5 pb-1 text-[10px] text-label-3">{tt("Argus kapalıyken de işaretleyebilirsin; Nook onu arka planda kısa süreliğine açıp kapatır.")}</p>
    </Section>
  );
}

/** Nook Mobil: telefon bu PC'ye bağlanır (kapat, uyut, ekran görüntüsü…). Üç adımlı sihirbaz: İndir · Eşleştir · Dene.
 *  Eşleştirme QR'ı gizli anahtarı taşıdığı için yalnızca istenince görünür, telefon bağlanınca gizlenir.
 *  İleri düzey her şey (güvenlik duvarı, Tailscale, uzaktan açma) açılır başlıkların altında. */
function PhoneSection() {
  const [info, setInfo] = useState<RemoteInfo | null>(null);
  const [showQr, setShowQr] = useState(false);
  // Sihirbazda kullanıcının geldiği adım (telefon bağlanınca kendiliğinden "Dene")
  const [step, setStep] = useState(1);
  const studio = useContext(SettingsLook) === "studio";
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fw, setFw] = useState<"idle" | "busy" | "ok" | string>("idle");
  useEffect(() => {
    void remoteInfo().then(setInfo);
    // Telefon bağlanınca durum kendiliğinden "Bağlı"ya dönsün
    const t = window.setInterval(() => void remoteInfo().then(setInfo), 4000);
    return () => window.clearInterval(t);
  }, []);
  const [shownAt, setShownAt] = useState(0);
  useEffect(() => {
    if (!showQr) return;
    // Adresler değişebilir (Tailscale sonradan açıldı): kod gösterilirken tazele
    void remoteInfo().then(setInfo);
    setShownAt(Date.now());
  }, [showQr]);
  // Kod acele ettirmez: telefon bağlanana ya da "Gizle"ye basılana kadar görünür
  useEffect(() => {
    if (showQr && shownAt && info?.lastSeen && info.lastSeen > shownAt) setShowQr(false);
  }, [showQr, shownAt, info?.lastSeen]);
  if (!info) return null;
  const toggle = async (on: boolean) => {
    setBusy(true);
    setInfo(await remoteSet(on).finally(() => setBusy(false)));
    if (!on) setShowQr(false);
  };
  const paired = !!info.lastSeen;
  const live = paired && Date.now() - info.lastSeen! < 60_000;
  // Sihirbazın adımı: telefon bir kez bağlandıysa "Dene", yoksa kullanıcının geldiği yer
  const cur = paired ? 3 : step;
  const stateOf = (n: number): StepState => ((n === 1 ? cur > 1 : n === 2 ? paired : live) ? "done" : n === cur ? "current" : "todo");
  const note = `leading-snug text-label-3 ${studio ? "text-[11px]" : "text-[10px]"}`;
  const hint = `font-semibold text-label ${studio ? "text-[12.5px]" : "text-[11.5px]"}`;
  return (
    <Section title={tt("Telefon")}>
      <Row label={tt("Nook Mobil bu PC'ye bağlanabilsin")} keys="telefon mobil android eşleştir eşle qr kod bağlan uzaktan">
        <Toggle on={info.enabled} onChange={(v) => void toggle(v)} color={ACCENT.blue} />
      </Row>
      <div className="py-2.5">
        <SectionLabel>{tt("Telefonla neler yapılır")}</SectionLabel>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {PHONE_CAN.map(({ icon: Icon, label, color }) => (
            <span key={label} className="flex items-center gap-1.5 rounded-full border py-[3px] pl-2 pr-2.5 text-[11px] font-medium" style={{ background: tintBg(color, 12), borderColor: tintBg(color, 30), color: tintText(color) }}>
              <Icon size={12} strokeWidth={2.4} />
              {label}
            </span>
          ))}
        </div>
        {!info.enabled && <p className={`mt-2 ${note}`}>{tt("Bağlantı yalnızca eşleştirdiğin telefona açıktır; açınca üç adımda eşleşirsin.")}</p>}
      </div>
      {info.enabled && !info.running && !busy && (
        <p className="py-1 text-[10px] text-red/90">{tt("Köprü başlatılamadı: {0} numaralı bağlantı noktası başka bir uygulamada olabilir.", info.port)}</p>
      )}
      {info.enabled && (
        <>
          <div className={`grid gap-2 py-2.5 ${studio ? "grid-cols-3" : "grid-cols-1"}`}>
            <StepCard n={1} title={tt("İndir")} state={stateOf(1)}>
              <QrBox svg={info.appQr} size={112} />
              <p className={hint}>{tt("Telefonun kamerasıyla okut")}</p>
              <p className={note}>{tt("Nook Mobil (Android) iner. Android “bilinmeyen uygulamaları yükle” izni isteyebilir; izin verip kur. Sonraki güncellemeler uygulamanın içinden gelir.")}</p>
              {cur === 1 && (
                <PrimaryButton color={ACCENT.blue} onClick={() => setStep(2)} className="mt-auto h-8 w-full">
                  {tt("İndirdim")}
                </PrimaryButton>
              )}
            </StepCard>
            <StepCard n={2} title={tt("Eşleştir")} state={stateOf(2)}>
              {showQr ? (
                <QrBox svg={info.qr} size={160} />
              ) : (
                <button
                  onClick={() => {
                    setShowQr(true);
                    setStep(2);
                  }}
                  className="flex h-[160px] w-[160px] shrink-0 flex-col items-center justify-center gap-2 rounded-row border border-dashed border-white/15 bg-well text-label-2 transition-colors hover:bg-well-hi hover:text-label"
                >
                  <QrCode size={44} strokeWidth={1.4} />
                  <span className="font-semibold">{tt("Eşleştirme kodunu göster")}</span>
                </button>
              )}
              <p className={hint}>{tt("Nook Mobil'in içinden okut")}</p>
              <p className={note}>{tt("Uygulamayı aç, “PC ekle”ye bas. Telefon bağlanınca kod kendiliğinden gizlenir. Kimseyle paylaşma: bu PC'yi yönetmenin anahtarı.")}</p>
              {showQr && <TextButton onClick={() => setShowQr(false)}>{tt("Gizle")}</TextButton>}
            </StepCard>
            <StepCard n={3} title={tt("Dene")} state={stateOf(3)}>
              <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-2">
                <span className="relative flex h-4 w-4 items-center justify-center">
                  {!live && <motion.span className="absolute inset-0 rounded-full" style={{ background: ACCENT.yellow }} animate={{ scale: [1, 2.1], opacity: [0.45, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }} />}
                  <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: live ? ACCENT.green : ACCENT.yellow, boxShadow: live ? `0 0 10px ${ACCENT.green}` : "none" }} />
                </span>
                <p className={hint} style={live ? { color: tintText(ACCENT.green) } : undefined}>
                  {live ? tt("Bağlandı") : paired ? tt("Son görülme: {0} dk önce", Math.max(1, Math.round((Date.now() - info.lastSeen!) / 60_000))) : tt("Telefon bekleniyor…")}
                </p>
                <p className={note}>{info.lastIp ? tt("{0} · bağlantı noktası {1}", info.lastIp, info.port) : tt("Kodu okutunca burası kendiliğinden yeşile döner")}</p>
              </div>
              <PrimaryButton
                color={ACCENT.blue}
                className="mt-auto h-8 w-full"
                onClick={() => {
                  setTesting(true);
                  void remoteTestNotification()
                    .then(remoteInfo)
                    .then(setInfo)
                    .finally(() => window.setTimeout(() => setTesting(false), 2000));
                }}
              >
                {testing ? tt("Gönderildi ✓") : tt("Bildirimi test et")}
              </PrimaryButton>
            </StepCard>
          </div>
          <Row label={tt("Telefondan uzaktan kontrol")} keys="ekran fare klavye kumanda uzaktan masaüstü">
            <Toggle on={!!info.control} onChange={(v) => void remoteControlSet(v).then(setInfo)} color={ACCENT.blue} />
          </Row>
          <p className="-mt-0.5 pb-1 text-[10px] text-label-3">
            {info.control
              ? tt("Telefondan bu PC'nin ekranını görüp fare ve klavyeyle kullanabilir, bilgisayarı kapatıp uyutabilirsin. Kontrol başlayınca adada görünür.")
              : tt("Kapalıyken telefon bu PC'nin ekranını göremez, ekran görüntüsü alamaz; bilgisayarı kapatamaz ve uyutamaz. Açınca eşleştirdiğin telefondan ekranı görüp fareyi ve klavyeyi kullanabilirsin.")}
          </p>
          <Fold title={tt("Bağlanmıyor mu?")} hint={tt("Güvenlik duvarı izni, Genel ağ")} keys="güvenlik duvarı firewall genel ağ özel ağ bağlanamıyor bulamıyor wifi kablosuz">
            <Row label={tt("Telefon bu PC'yi bulamıyor mu? Güvenlik duvarı engelliyor olabilir")}>
              {fw === "ok" ? (
                <span className="text-[11px] text-label-2">{tt("İzin verildi")}</span>
              ) : (
                <TextButton
                  onClick={() => {
                    setFw("busy");
                    outsideFixFirewall().then(
                      () => setFw("ok"),
                      (e) => setFw(String(e) === "cancelled" ? "idle" : String(e)),
                    );
                  }}
                >
                  {fw === "busy" ? tt("Bekle…") : tt("İzin ver")}
                </TextButton>
              )}
            </Row>
            {fw !== "idle" && fw !== "busy" && fw !== "ok" && <p className="pb-1 text-[10px] text-red/90">{fw}</p>}
            <p className="pb-1 text-[10px] text-label-3">
              {tt("Ev ağın Windows'ta Genel ağ olarak işaretliyse telefon bağlanamaz: Windows Ayarlar › Ağ ve İnternet › Wi-Fi'den ağı Özel yap.")}
            </p>
          </Fold>
          <Fold title={tt("Evden uzakta")} hint={tt("Tailscale ile her yerden bağlan, telefondan PC'yi aç")} keys="tailscale vpn dışarıdan uzaktan uyandır wake on lan wol modem bios">
            <OutsideSetup />
            <WakeSetup />
          </Fold>
          <Row label={tt("Eşleşmeyi sıfırla (telefonun bağlantısı kopar)")}>
            <TextButton
              tone="danger"
              onClick={() => {
                setShowQr(false);
                setStep(1);
                void remoteReset().then(setInfo);
              }}
            >
              {tt("Sıfırla")}
            </TextButton>
          </Row>
        </>
      )}
    </Section>
  );
}

const PHONE_CAN: { icon: LucideIcon; label: string; color: string }[] = [
  { icon: Music, label: tt("Müziği yönet"), color: ACCENT.pink },
  { icon: MonitorSmartphone, label: tt("Ekranı gör"), color: ACCENT.blue },
  { icon: FolderUp, label: tt("Rafa dosya at"), color: ACCENT.teal },
  { icon: BellRing, label: tt("Bildirimler PC'de"), color: ACCENT.purple },
  { icon: Power, label: tt("Aç / kapat"), color: ACCENT.orange },
];

type StepState = "done" | "current" | "todo";

/** Eşleştirme sihirbazının bir adımı: sıradaki adım renkli çerçeveli, biten adımın numarası tike döner */
function StepCard({ n, title, state, children }: { n: number; title: string; state: StepState; children: React.ReactNode }) {
  const c = state === "done" ? ACCENT.green : ACCENT.blue;
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-tile border p-3 text-center transition-colors"
      style={state === "current" ? { background: tintBg(c, 10), borderColor: tintBg(c, 50) } : { background: "var(--color-well)", borderColor: "rgb(255 255 255 / 0.06)" }}
    >
      <div className="flex w-full items-center gap-2">
        <span
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11.5px] font-extrabold"
          style={state === "todo" ? { background: "var(--color-well-hi)", color: "var(--color-label-3)" } : { background: c, color: "#000" }}
        >
          {state === "done" ? <Check size={12} strokeWidth={3.2} /> : n}
        </span>
        <span className={`text-[13px] font-bold ${state === "todo" ? "text-label-2" : "text-label"}`}>{title}</span>
      </div>
      {children}
    </div>
  );
}

/** QR kodu (beyaz zeminde); kod henüz yoksa kesik çizgili yer tutucu */
function QrBox({ svg, size }: { svg: string | null | undefined; size: number }) {
  return svg ? (
    <div className="shrink-0 overflow-hidden rounded-row bg-white p-1 [&>svg]:h-full [&>svg]:w-full" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />
  ) : (
    <div className="flex shrink-0 items-center justify-center rounded-row border border-dashed border-white/15 text-label-3" style={{ width: size, height: size }}>
      <QrCode size={Math.round(size * 0.36)} strokeWidth={1.4} />
    </div>
  );
}

/** Açılır başlık: ileri düzey ayarlar kapalı durur. Aramada başlığı ve `keys`i aranır. */
function Fold({ title, hint, keys, children }: { title: string; hint?: string; keys?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const studio = useContext(SettingsLook) === "studio";
  return (
    <div data-row={fold(`${title} ${hint ?? ""} ${keys ?? ""}`)} data-label={title}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className={`flex w-full items-center justify-between gap-2 text-left ${studio ? "min-h-[46px] py-2.5" : "min-h-[30px] py-1"}`}>
        <span className="min-w-0">
          <span className={`block text-label ${studio ? "text-[13.5px] font-semibold" : "text-[12px]"}`}>{title}</span>
          {hint && <span className={`block leading-snug text-label-3 ${studio ? "text-[11.5px]" : "text-[10px]"}`}>{hint}</span>}
        </span>
        <ChevronDown size={15} strokeWidth={2.4} className={`shrink-0 text-label-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="divide-y divide-white/[0.05] pb-1.5 pl-3">{children}</div>}
    </div>
  );
}

/** Tarif kutusu: numaralı adımlar ve alttaki not (wakeGuide.ts; telefonda da aynısı görünür) */
function GuideBox({ guide }: { guide: Guide }) {
  return (
    <div className="rounded-badge bg-well px-2 py-1.5 text-[10.5px] leading-snug text-label-2">
      {guide.title && <p className="mb-0.5 text-label-3">{guide.title}</p>}
      <ol className="list-decimal space-y-0.5 pl-3.5">
        {guide.steps.map((s) => (
          <li key={s}>{tt(s)}</li>
        ))}
      </ol>
      {guide.note && <p className="mt-1 text-label-3">{tt(guide.note)}</p>}
    </div>
  );
}

/** Telefondan açma hazırlığı: Windows tarafını kontrol edip tek izinle düzeltir, BIOS için tarif verir */
function WakeSetup() {
  const [st, setSt] = useState<WolStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);
  const [logon, setLogon] = useState(false);
  const [modem, setModem] = useState(false);
  const [out, setOut] = useState<OutsideStatus | null>(null);
  const [wake, setWake] = useState<WakeOutside | null>(null);
  useEffect(() => void wolStatus().then(setSt), []);
  useEffect(() => void (modem && outsideStatus().then(setOut)), [modem]);
  if (!st) return null;
  if (!st.adapter)
    return (
      <div className="py-1">
        <span className="text-[12px] text-label">{tt("Telefondan PC'yi açma")}</span>
        <div className="pb-1 pt-1">
          <WakeItem ok={false} text={tt("Modeme bağlı ağ kartı bulunamadı: PC'yi kabloyla modeme bağla")} />
        </div>
      </div>
    );
  const card = st.magicPacket !== false && st.wakeArmed !== false;
  const fixable = st.fastStartup || !card;
  const fix = async () => {
    setBusy(true);
    setErr(null);
    try {
      setSt(await wolFix());
    } catch (e) {
      const m = String(e);
      if (m !== "cancelled") setErr(m);
    } finally {
      setBusy(false);
    }
  };
  const items: { ok: boolean | null; text: string }[] = [
    { ok: st.wired, text: st.wired ? tt("Kabloyla bağlı") : st.laptop ? tt("Dizüstü Wi-Fi'de: kapalıyken açılmaz, Kapat yerine Uyku kullan") : tt("Wi-Fi'de: kapalıyken çoğu PC uyanmaz, kablo tak") },
    { ok: !st.fastStartup, text: st.fastStartup ? tt("Hızlı Başlangıç açık") : tt("Hızlı Başlangıç kapalı") },
    { ok: card ? (st.magicPacket ?? st.wakeArmed) : false, text: card ? tt("Ağ kartı PC'yi uyandırabilir") : tt("Ağ kartının uyandırması kapalı") },
  ];
  return (
    <div className="py-1">
      <div className="flex min-h-[30px] items-center justify-between gap-2">
        <span className="text-[12px] text-label">{tt("Telefondan PC'yi açma")}</span>
        {fixable ? (
          <TextButton disabled={busy} onClick={() => void fix()}>
            {busy ? tt("Düzeltiliyor…") : tt("Düzelt")}
          </TextButton>
        ) : (
          <span className="text-[10.5px] text-label-3">{tt("Windows hazır")}</span>
        )}
      </div>
      <div className="flex flex-col gap-1 pb-1">
        {items.map((it) => (
          <WakeItem key={it.text} ok={it.ok} text={it.text} />
        ))}
        <div className="flex items-start gap-1.5">
          <WakeItem ok={null} text={st.laptop ? tt("BIOS'ta Wake-on-LAN açık olmalı (dizüstü)") : tt("BIOS'ta Wake-on-LAN açık olmalı")} />
          <button onClick={() => setGuide((v) => !v)} className="ml-auto shrink-0 text-[10.5px] text-label-2 hover:text-label">
            {guide ? tt("Gizle") : tt("Nasıl?")}
          </button>
        </div>
        {guide && <GuideBox guide={biosGuide(st)} />}
        {st.autoLogon === false && (
          <>
            <div className="flex items-start gap-1.5">
              <WakeItem ok={null} text={tt("Açılınca Windows giriş ekranında bekler (Nook girişten sonra çalışır)")} />
              <button onClick={() => setLogon((v) => !v)} className="ml-auto shrink-0 text-[10.5px] text-label-2 hover:text-label">
                {logon ? tt("Gizle") : tt("Nasıl?")}
              </button>
            </div>
            {logon && <GuideBox guide={autoLogonGuide()} />}
          </>
        )}
        <WakeOutsideRow guide={modem} onGuide={() => setModem((v) => !v)} onStatus={setWake} />
        {modem && <GuideBox guide={routerGuide(wake ?? { upnp: null }, out?.lanIp ?? null, out?.mac ?? null)} />}
      </div>
      {err && <p className="pb-1 text-[10px] text-red/90">{err}</p>}
      <p className="pb-1 text-[10px] text-label-3">
        {fixable
          ? tt("Düzelt'e basınca Windows yönetici izni ister; ağ bağlantısı birkaç saniye kopabilir.")
          : tt("Telefon PC'yle aynı ağdayken çalışır. Elektrik kesilirse PC'yi bir kez düğmesinden aç.")}
      </p>
    </div>
  );
}

/** Dışarıdan açma anahtarı: Nook modemde (UPnP) uyandırma yönlendirmesini kendisi kurar.
 *  Modem izin vermezse elle ayar tarifi gösterilir. */
function WakeOutsideRow({ guide, onGuide, onStatus }: { guide: boolean; onGuide: () => void; onStatus: (w: WakeOutside) => void }) {
  const [w, setW] = useState<WakeOutside | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => void wakeOutsideStatus().then(setW), []);
  useEffect(() => void (w && onStatus(w)), [w]); // eslint-disable-line react-hooks/exhaustive-deps
  // Modem aranırken de satır görünsün (UPnP araması birkaç saniye sürer)
  if (!w)
    return (
      <div className="flex min-h-[24px] items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[10.5px] text-label-2">{tt("Evden uzaktayken de açılabilsin")}</span>
        <span className="text-[10.5px] text-label-3">{tt("Modem aranıyor…")}</span>
      </div>
    );
  const set = async (on: boolean) => {
    setBusy(true);
    setW(await wakeOutsideSet(on).finally(() => setBusy(false)));
  };
  const manual = w.on && !busy && (w.upnp === false || !!w.error);
  const status: { ok: boolean | null; text: string } | null = !w.on
    ? null
    : busy
      ? { ok: null, text: tt("Modem ayarlanıyor…") }
      : w.cgnat
        ? { ok: false, text: tt("Operatör ortak adres veriyor; dışarıdan açma çalışmaz") }
        : w.target
          ? { ok: true, text: w.router ? tt("{0} ayarlandı · ev adresi {1}", w.router, w.externalIp ?? "?") : tt("Modem ayarlandı · ev adresi {0}", w.externalIp ?? "?") }
          : w.upnp === false
            ? { ok: false, text: tt("Modem otomatik ayarlanamadı (UPnP kapalı)") }
            : { ok: false, text: w.error ?? tt("Modem ayarlanamadı") };
  return (
    <>
      <div className="flex min-h-[24px] items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[10.5px] text-label-2">{tt("Evden uzaktayken de açılabilsin")}</span>
        <Toggle on={w.on} onChange={(v) => void set(v)} color={ACCENT.blue} />
      </div>
      {status && (
        <div className="flex items-center gap-1.5">
          <WakeItem ok={status.ok} text={status.text} />
          {manual && (
            <button onClick={onGuide} className="ml-auto shrink-0 text-[10.5px] text-label-2 hover:text-label">
              {guide ? tt("Gizle") : tt("Elle nasıl?")}
            </button>
          )}
        </div>
      )}
    </>
  );
}

/** Evden uzaktayken bağlanma: Tailscale kurulu ve açık mı, güvenlik duvarı izin veriyor mu, telefona nasıl kurulur */
function OutsideSetup() {
  const [st, setSt] = useState<OutsideStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [qr, setQr] = useState(false);
  const keep = useNook((x) => x.settings.tailscaleKeep ?? false);
  const update = useNook((x) => x.updateSettings);
  useEffect(() => {
    const load = () => void outsideStatus().then(setSt);
    load();
    // Kurulum ve giriş Nook'un dışında yapılıyor: ekran açıkken arada bir tazele
    const t = window.setInterval(load, 4000);
    return () => window.clearInterval(t);
  }, []);
  if (!st) return null;
  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    setErr(null);
    try {
      const r = await fn();
      if (r && typeof r === "object") setSt(r as OutsideStatus);
    } catch (e) {
      const m = String(e);
      if (m !== "cancelled") setErr(m);
    } finally {
      setBusy(null);
    }
  };
  const ready = st.tailscaleInstalled && st.tailscaleUp && st.firewall;
  return (
    <div className="py-1">
      <div className="flex min-h-[30px] items-center justify-between gap-2">
        <span className="text-[12px] text-label">{tt("Evden uzaktayken bağlanma")}</span>
        {ready && <span className="text-[10.5px] text-label-3">{tt("Hazır")}</span>}
      </div>
      <div className="flex flex-col gap-1 pb-1">
        <CheckRow ok={st.tailscaleInstalled} text={st.tailscaleInstalled ? tt("Tailscale kurulu") : tt("Tailscale kurulu değil")}>
          {!st.tailscaleInstalled && (
            <SmallAction busy={busy === "install"} onClick={() => void act("install", outsideInstallTailscale)}>
              {busy === "install" ? tt("İndiriliyor…") : tt("Kur")}
            </SmallAction>
          )}
        </CheckRow>
        {st.tailscaleInstalled && (
          <CheckRow
            ok={st.tailscaleUp}
            text={
              st.tailscaleUp
                ? tt("Tailscale açık")
                : st.tailscaleState === "needs-login"
                  ? tt("Tailscale'e giriş yapılmadı")
                  : keep
                    ? tt("Tailscale kapalı: Nook açıyor…")
                    : tt("Tailscale kapalı")
            }
          >
            {!st.tailscaleUp && <SmallAction onClick={() => void act("open", outsideOpenTailscale)}>{tt("Aç")}</SmallAction>}
          </CheckRow>
        )}
        {st.tailscaleInstalled && (
          <>
            <Row label={tt("Tailscale'i açık tut")}>
              <Toggle on={keep} onChange={(v) => update({ tailscaleKeep: v })} color={ACCENT.blue} />
            </Row>
            <p className="-mt-1 pb-0.5 text-[10px] text-label-3">
              {tt("Açıksa Tailscale kapanınca Nook birkaç dakika içinde yeniden bağlar ve Tailscale'i Windows'a giriş yapılmadan da çalışacak şekilde ayarlar. Kapalıyken Nook Tailscale'e dokunmaz.")}
            </p>
          </>
        )}
        <CheckRow ok={st.firewall} text={st.firewall ? tt("Güvenlik duvarı izin veriyor") : tt("Güvenlik duvarı izni yok")}>
          {!st.firewall && (
            <SmallAction busy={busy === "fw"} onClick={() => void act("fw", outsideFixFirewall)}>
              {tt("İzin ver")}
            </SmallAction>
          )}
        </CheckRow>
        <CheckRow ok={null} text={tt("Telefona da Tailscale kur, aynı hesapla giriş yap")}>
          <SmallAction onClick={() => setQr((v) => !v)}>{qr ? tt("Gizle") : tt("Kodu göster")}</SmallAction>
        </CheckRow>
        {qr && st.phoneQr && (
          <div className="flex items-center gap-3 py-1">
            <QrBox svg={st.phoneQr} size={96} />
            <p className="text-[10.5px] leading-snug text-label-2">
              {tt("Telefonun kamerasıyla okut, Play Store'da Tailscale açılır. Kurup bu PC'deki hesapla giriş yap; Nook Mobil yeni adresi kendisi öğrenir, kodu yeniden okutmana gerek yok.")}
            </p>
          </div>
        )}
      </div>
      {err && <p className="pb-1 text-[10px] text-red/90">{err}</p>}
      <p className="pb-1 text-[10px] text-label-3">
        {!st.tailscaleInstalled
          ? tt("Tailscale ücretsiz; PC ile telefon arasında her yerden çalışan özel, şifreli bir bağlantı kurar. Kur'a basınca resmi kurucu açılır, Google hesabınla giriş yapman yeter.")
          : ready
            ? tt("Telefon evdeyken ev ağından, dışarıdayken Tailscale'den bağlanır.")
            : tt("“İzin ver” Windows yönetici izni ister; yalnızca Özel olarak işaretli ev ağından ve Tailscale'den gelen bağlantılara izin verilir. Kafe gibi Genel ağlarda port kapalı kalır.")}
      </p>
    </div>
  );
}

function CheckRow({ ok, text, children }: { ok: boolean | null; text: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-[20px] items-center gap-1.5">
      <WakeItem ok={ok} text={text} />
      {children && <span className="ml-auto shrink-0">{children}</span>}
    </div>
  );
}

function SmallAction({ onClick, busy, children }: { onClick: () => void; busy?: boolean; children: React.ReactNode }) {
  return (
    <button disabled={busy} onClick={onClick} className="text-[10.5px] text-label-2 hover:text-label disabled:opacity-50">
      {children}
    </button>
  );
}

function WakeItem({ ok, text }: { ok: boolean | null; text: string }) {
  const Icon = ok === null ? HelpCircle : ok ? Check : X;
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-[10.5px] text-label-2">
      <Icon size={11} strokeWidth={2.4} className={`shrink-0 ${ok === null ? "text-label-3" : ok ? "text-green" : "text-red/90"}`} />
      <span className="truncate">{text}</span>
    </div>
  );
}

/** Sürüm ve güncelleme: yeni sürüm varsa tek tıkla indirip kurar. */
function UpdateRow() {
  const { current, available, progress, status } = useUpdate();
  return (
    <Row label={current ? tt("Sürüm {0}", current) : tt("Sürüm")}>
      {progress !== null ? (
        <span className="text-[11px] font-medium tabular-nums" style={{ color: tintText(ACCENT.green) }}>
          {tt("İndiriliyor {0}", pct(progress))}
        </span>
      ) : available ? (
        <div className="flex items-center gap-1">
          {status && <span className="max-w-[220px] text-[10.5px] leading-snug" style={{ color: tintText(ACCENT.red) }}>{status}</span>}
          <TextButton onClick={() => void installUpdate()}>
            <span style={{ color: tintText(ACCENT.green) }}>{status ? tt("Yeniden dene") : tt("{0} sürümüne güncelle", available)}</span>
          </TextButton>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span className="text-[10.5px] text-label-3">{status || tt("Nook güncel")}</span>
          <TextButton onClick={() => void checkUpdate(true)}>{tt("Güncellemeleri denetle")}</TextButton>
        </div>
      )}
    </Row>
  );
}

/** Seçili paletin vurgu renkleri: hangisinin hangisinden ayrıldığı bir bakışta görünsün */
function PalettePreview() {
  const items = [
    { c: ACCENT.red, l: tt("Hata") },
    { c: ACCENT.green, l: tt("Tamam") },
    { c: ACCENT.yellow, l: tt("Alarm") },
    { c: ACCENT.blue, l: tt("İş") },
    { c: ACCENT.orange, l: tt("Uyarı") },
    { c: ACCENT.purple, l: tt("Pano") },
    { c: ACCENT.teal, l: tt("Raf") },
    { c: ACCENT.pink, l: tt("Medya") },
  ];
  return (
    <div className="flex flex-wrap gap-1 py-1.5">
      {items.map((it) => (
        <span key={it.l} className="flex items-center gap-1 rounded-full border px-2 py-[2px] text-[10.5px] font-medium" style={{ background: tintBg(it.c, 14), borderColor: tintBg(it.c, 40), color: tintText(it.c) }}>
          <span className="h-2 w-2 rounded-full" style={{ background: it.c }} />
          {it.l}
        </span>
      ))}
    </div>
  );
}

/** Destekçiler: GitHub'da Nook'a yıldız verenler; profil fotoğrafına basınca GitHub sayfası açılır */
function SupportersSection() {
  const list = useSupporters((s) => s.list);
  const stars = useSupporters((s) => s.stars);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setBusy(true);
    void refreshSupporters(true)
      .catch(() => {})
      .finally(() => setBusy(false));
  }, []);
  return (
    <Section title={tt("Destekçiler")}>
      <div className="py-1.5">
        <p className="text-[10.5px] leading-snug text-label-3">
          {list.length || stars
            ? tt("GitHub'da Nook'a yıldız veren {0} kişi. Teşekkürler!", Math.max(list.length, stars ?? 0))
            : busy
              ? tt("Yükleniyor…")
              : tt("Henüz kimse yıldız vermedi. İlk destekçi sen ol!")}
        </p>
        {!!list.length && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[...list.filter((s) => INVESTORS.has(s.login)), ...list.filter((s) => !INVESTORS.has(s.login))].slice(0, 60).map((s) => (
              <button key={s.login} title={s.login} onClick={() => void openPath(s.url)} className="group flex flex-col items-center gap-0.5">
                <img
                  src={s.avatar}
                  alt={s.login}
                  className="h-8 w-8 rounded-full transition-transform group-hover:scale-110"
                  style={{ boxShadow: INVESTORS.has(s.login) ? `0 0 0 2px ${ACCENT.yellow}` : "0 0 0 1px rgba(255,255,255,0.1)" }}
                  draggable={false}
                />
                <span className="max-w-[52px] truncate text-[9.5px] text-label-3">{s.login}</span>
                {INVESTORS.has(s.login) && (
                  <span className="rounded-full px-1.5 text-[8.5px] font-semibold" style={{ background: tintBg(ACCENT.yellow), color: tintText(ACCENT.yellow) }}>
                    {tt("Yatırımcı")}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        <div className="mt-1.5 flex justify-end">
          <TextButton onClick={() => void openPath(REPO_URL)}>{tt("GitHub'da yıldız ver ⭐")}</TextButton>
        </div>
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const look = useContext(SettingsLook);
  if (look === "studio")
    return (
      <section data-sec={title} className="nook-card rounded-[20px] px-5 pb-2 pt-4">
        <h3 className="mb-1 text-[14px] font-bold tracking-tight text-label">{title}</h3>
        <div className="divide-y divide-white/[0.05] [&_button]:text-[12px]">{children}</div>
      </section>
    );
  return (
    <section data-sec={title}>
      <h3 className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-label-3">{title}</h3>
      <div className="divide-y divide-white/[0.05]">{children}</div>
    </section>
  );
}

/** Önizlemeyi oynatan küçük yuvarlak düğme */
function PreviewButton({ color, onClick }: { color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={tt("Önizle")}
      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-well transition-colors hover:bg-well-hi"
      style={{ color }}
    >
      <Play size={11} strokeWidth={2.6} fill="currentColor" />
    </button>
  );
}

/** Aranan metnin geçtiği yeri sarıyla işaretler (büyük/küçük harf ve ı/i fark etmez) */
function Hit({ text, q }: { text: string; q: string }) {
  const f = fold(text);
  const i = q && f.length === text.length ? f.indexOf(q) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[4px] px-[1px]" style={{ background: tintBg(ACCENT.yellow, 30), color: tintText(ACCENT.yellow) }}>
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

/**
 * Ayar satırı: kısa başlık, altında isteğe bağlı tek satır açıklama. Aramada ikisi ve `keys` (eş anlamlı
 * anahtar sözcükler: "wifi kablosuz internet") aranır; ararken eşleşen yer işaretlenir ve satırın kategorisi
 * çip olarak görünür (basınca o kategoride bu satıra gider).
 */
function Row({ label, hint, keys, children }: { label: string; hint?: string; keys?: string; children: React.ReactNode }) {
  const studio = useContext(SettingsLook) === "studio";
  const { q, cat, jump } = useContext(SettingsNav);
  const c = q && cat ? CATS.find((x) => x.id === cat) : null;
  return (
    <div data-row={fold(`${label} ${hint ?? ""} ${keys ?? ""}`)} data-label={label} className={`flex items-center justify-between gap-2 ${studio ? "min-h-[46px] gap-6 py-2.5" : "min-h-[30px] py-1"}`}>
      <span className="min-w-0">
        <span className={`block text-label ${studio ? "text-[13.5px] font-semibold" : "text-[12px]"}`}>
          <Hit text={label} q={q} />
          {c && (
            <button onClick={() => jump(c.id, label)} className="ml-2 inline-flex items-center gap-1 rounded-full border px-2 py-[1px] align-middle !text-[10.5px] font-semibold" style={{ background: tintBg(c.color, 14), borderColor: tintBg(c.color, 36), color: tintText(c.color) }}>
              <c.icon size={10} strokeWidth={2.6} />
              {c.title}
            </button>
          )}
        </span>
        {hint && (
          <span className={`block leading-snug text-label-3 ${studio ? "text-[11.5px]" : "text-[10px]"}`}>
            <Hit text={hint} q={q} />
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center">{children}</span>
    </div>
  );
}

/** Başka kategoride duran ayarın eski yerindeki küçük yönlendirme satırı (aramada çıkmaz: ayar tek yerde bulunur) */
function Elsewhere({ label, cat }: { label: string; cat: CatId }) {
  const studio = useContext(SettingsLook) === "studio";
  const { jump } = useContext(SettingsNav);
  return (
    <div className={`flex items-center justify-between gap-2 ${studio ? "min-h-[40px] py-2" : "min-h-[26px] py-1"}`}>
      <span className={`min-w-0 text-label-3 ${studio ? "text-[12.5px]" : "text-[11px]"}`}>{label}</span>
      <TextButton onClick={() => jump(cat, label)}>→ {tt("{0} altında", CATS.find((c) => c.id === cat)!.title)}</TextButton>
    </div>
  );
}

/** "Ne kadar konuşkan olayım?": üç hazır düzey (lib/chattiness); sonradan tek tek değiştirildiyse "Özel" */
function ChattinessRow() {
  const s = useNook((st) => st.settings);
  const level = s.chattiness;
  const patch = level ? chattinessPatch(level, s) : null;
  const custom = !!patch && (Object.keys(patch) as (keyof Settings)[]).some((k) => patch[k] !== s[k]);
  return (
    <Row label={tt("Ne kadar konuşkan olayım?")} hint={custom || !level ? tt("Kendiliğimden çıkardığım kartların hazır ayarı; alarm ve hatırlatıcılar hep gelir") : CHATTINESS.find((c) => c.id === level)?.hint} keys="konuşkan sessiz dengeli canlı rahatsız etme kartlar bildirim sıklık">
      <div className="flex items-center gap-1.5">
        {custom && (
          <span className="rounded-full px-2 py-[2px] text-[10.5px] font-semibold" style={{ background: tintBg(ACCENT.orange, 16), color: tintText(ACCENT.orange) }}>
            {tt("Özel")}
          </span>
        )}
        <Segmented id="settings-chattiness" options={CHATTINESS} value={(custom ? "" : (level ?? "")) as never} onChange={applyChattiness} color={ACCENT.pink} />
      </div>
    </Row>
  );
}

/** Saatin yönelme eki ("08:00'e", "23:30'a"): son okunan sayıya göre */
function toTime(t: string): string {
  if (!isTurkish) return t;
  const [h, m] = [Number(t.slice(0, 2)), Number(t.slice(3, 5))];
  const n = m || h;
  const ones = ["", "e", "ye", "e", "e", "e", "ya", "ye", "e", "a"][n % 10];
  const tens = ["a", "a", "ye", "a", "a", "ye"][Math.floor(n / 10)];
  return `${t}'${ones || tens}`;
}

/** Sessiz saatler: her gün bu aralıkta kartlar, hatırlatmalar ve sesler susar (store'daki isQuiet) */
function QuietHoursRow() {
  const q = useNook((st) => st.settings.quietHours) ?? DEFAULT_SETTINGS.quietHours!;
  const update = useNook((st) => st.updateSettings);
  const set = (patch: Partial<typeof q>) => update({ quietHours: { ...q, ...patch } });
  // "Şu an sessiz" yazısı aralığa girince / çıkınca kendiliğinden değişsin
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const active = inQuietHours(q);
  const field = "rounded-full bg-well px-2 py-0.5 text-[11px] font-medium tabular-nums text-label outline-none [color-scheme:dark] focus:bg-well-hi";
  return (
    <>
      <Row label={tt("Sessiz saatler")} hint={tt("Her gün bu saatlerde kartlar, hatırlatmalar ve sesler susar; alarm, takvim ve aramalar yine gelir")} keys="rahatsız etme gece uyku sessiz mod dnd do not disturb">
        <div className="flex items-center gap-1.5">
          {q.on && (
            <>
              <input type="time" aria-label={tt("Başlangıç")} value={q.from} onChange={(e) => e.target.value && set({ from: e.target.value })} className={field} />
              <span className="text-[11px] text-label-3">–</span>
              <input type="time" aria-label={tt("Bitiş")} value={q.to} onChange={(e) => e.target.value && set({ to: e.target.value })} className={field} />
            </>
          )}
          <Toggle on={q.on} onChange={(v) => set({ on: v })} color={ACCENT.purple} />
        </div>
      </Row>
      {active && (
        <p className="-mt-0.5 flex items-center gap-1 pb-1.5 text-[11px] font-medium" style={{ color: tintText(ACCENT.purple) }}>
          <Moon size={11} strokeWidth={2.6} />
          {tt("Şu an sessiz · {0} kadar", toTime(q.to))}
        </p>
      )}
    </>
  );
}

/** Nook'un keyfi: küçük Nook + çubuk */
function Affection() {
  const affection = useNook((st) => st.affection);
  const sulky = affection < SULK_BELOW;
  const color = sulky ? ACCENT.orange : ACCENT.pink;
  const mood = sulky ? tt("Küs") : affection < 50 ? tt("Durgun") : affection < 80 ? tt("Mutlu") : tt("Çok seviyor");
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <MiniNook color={color} size={22} eyes={sulky ? "closed" : affection >= 80 ? "happy" : "open"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="text-label">{tt("Keyfi")}</span>
          <span className="font-medium" style={{ color }}>
            {mood}
          </span>
        </div>
        <Bar pct={affection} color={color} className="mt-1" />
      </div>
    </div>
  );
}

/** `wide`: kurulum akışındaki gibi sola yaslı, geniş kutu (Ayarlar satırlarında sağa yaslı, dar) */
export function TextInput({ value, placeholder, onChange, wide }: { value: string; placeholder: string; onChange: (v: string) => void; wide?: boolean }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      value={draft}
      placeholder={placeholder}
      spellCheck={false}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onChange(draft.trim())}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={`rounded-full bg-well text-[11px] font-medium text-label outline-none placeholder:font-medium placeholder:text-label-3 focus:bg-well-hi ${wide ? "w-[150px] px-2.5 py-0.5 text-left" : "w-[130px] px-2.5 py-0.5 text-right"}`}
    />
  );
}

const MODIFIERS: [keyof KeyboardEvent, string][] = [
  ["ctrlKey", "Ctrl"],
  ["altKey", "Alt"],
  ["shiftKey", "Shift"],
  ["metaKey", "Super"],
];

/** Tıkla, tuş kombinasyonuna bas — kaydedilir. En az bir değiştirici tuş gerekir. `clearable`: Sil tuşu kısayolu kaldırır. */
export function ShortcutInput({ value, onChange, clearable }: { value: string; onChange: (v: string) => void; clearable?: boolean }) {
  const [recording, setRecording] = useState(false);

  const onKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (e.key === "Escape") return setRecording(false);
    if (clearable && (e.key === "Backspace" || e.key === "Delete")) {
      onChange("");
      return setRecording(false);
    }
    if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return;
    const mods = MODIFIERS.filter(([k]) => e.nativeEvent[k]).map(([, n]) => n);
    if (!mods.length) return;
    const key = e.code.startsWith("Key") ? e.code.slice(3) : e.code.startsWith("Digit") ? e.code.slice(5) : e.code;
    onChange([...mods, key].join("+"));
    setRecording(false);
  };

  return (
    <button
      onClick={() => setRecording(true)}
      onBlur={() => setRecording(false)}
      onKeyDown={recording ? onKeyDown : undefined}
      className="flex items-center gap-1 rounded-full bg-well px-2 py-0.5 text-[11px] font-medium text-label-2 transition-colors hover:bg-well-hi"
      style={recording ? { color: ACCENT.teal } : undefined}
    >
      {recording ? (clearable ? tt("Tuşlara bas… (Sil: kaldır)") : tt("Tuşlara bas…")) : value ? value.replace("Space", tt("Boşluk")).split("+").join(" + ") : tt("Yok")}
    </button>
  );
}

const AUTO_CLEAR: { id: number; label: string }[] = [
  { id: 0, label: tt("Hiç") },
  { id: 1, label: tt("1 dk") },
  { id: 5, label: tt("5 dk") },
  { id: 15, label: tt("15 dk") },
];
const COLOR_FORMATS: { id: Settings["colorFormat"]; label: string }[] = [
  { id: "hex", label: "HEX" },
  { id: "rgb", label: "RGB" },
  { id: "hsl", label: "HSL" },
];
const PAD_CLEAR: { id: number; label: string }[] = [
  { id: 0, label: tt("Asla") },
  { id: 1, label: tt("1 gün") },
  { id: 7, label: tt("1 hafta") },
  { id: 30, label: tt("1 ay") },
];

/**
 * Bütün genel kısayollar tek yerde. Başka bir programın bilinen kısayoluyla çakışan ya da Nook'ta
 * iki işe birden verilmiş tuşlar turuncu uyarıyla görünür.
 */
function ShortcutsSection() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const apps = useInstalledApps();
  const failed = useShortcutFailures();
  return (
    <Section title={tt("Klavye kısayolları")}>
      {SHORTCUTS.map((k) => {
        const combo = s[k.key];
        const dup = duplicateOf(s, k.key);
        const clash = conflictOf(combo, apps);
        const held = !dup && isFailed(combo, failed);
        const spare = held ? spareShortcut(s, failed) : null;
        return (
          <div key={k.key}>
            <Row label={k.label} keys="kısayol tuş hotkey klavye">
              <ShortcutInput value={combo} onChange={(v) => update({ [k.key]: v } as Partial<Settings>)} clearable={k.clearable} />
            </Row>
            {held ? (
              <div className="-mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pb-1.5">
                <p className="text-[10px]" style={{ color: tintText(ACCENT.red) }}>
                  {tt("Bu tuşları başka bir program tutuyor; Nook kullanamıyor. Nook arada yeniden dener ama farklı bir kısayol seçmek en kolayı.")}
                </p>
                {spare && <TextButton onClick={() => update({ [k.key]: spare } as Partial<Settings>)}>{tt("{0} yap", prettyKeys(spare))}</TextButton>}
              </div>
            ) : (dup || clash) && (
              <p className="-mt-1 pb-1 text-[10px]" style={{ color: tintText(ACCENT.orange) }}>
                {dup ? tt("Bu tuşlar \"{0}\" için de kullanılıyor; bu kısayol çalışmaz", dup.label) : tt("Bu tuşlarla {0} çalışmaz", clash)}
              </p>
            )}
          </div>
        );
      })}
      <Row label={tt("Oyunda kısayolları kapat")} hint={tt("Tam ekran oyundayken Nook'un genel kısayolları tuşları oyundan çalmaz")} keys="oyun tam ekran hotkey">
        <Toggle on={s.shortcutsOffInGame ?? true} onChange={(v) => update({ shortcutsOffInGame: v })} />
      </Row>
      <p className="-mt-0.5 pb-1 text-[10px] text-label-3">{tt("Kısayolu değiştirmek için tıkla, yeni tuşlara bas. Kaldırılabilenleri Sil tuşu kaldırır. Bu tuşlar her programda Nook'a gider.")}</p>
    </Section>
  );
}

/** Pano geçmişi, düz metin yapıştırma, renk biçimi, karalama defteri */
function ClipSection() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  return (
    <Section title={tt("Pano ve notlar")}>
      <Row label={tt("Kopyaladıktan sonra panoyu boşalt")} keys="pano clipboard kopyala yapıştır geçmiş">
        <Segmented id="clip-clear" options={AUTO_CLEAR} value={s.clipAutoClear} onChange={(v) => update({ clipAutoClear: v })} color={ACCENT.purple} />
      </Row>
      <Row label={tt("Ekran kilitlenince panoyu boşalt")}>
        <Toggle on={s.clipClearOnLock} onChange={(v) => update({ clipClearOnLock: v })} color={ACCENT.purple} />
      </Row>
      <p className="-mt-0.5 pb-1 text-[10px] text-label-3">{tt("Yalnızca pano boşalır; Nook'taki geçmiş kalır. Parola yöneticilerinin kopyaları hiç kaydedilmez.")}</p>
      <Row label={tt("Geçmişe almadığı uygulamalar (virgülle)")}>
        <TextInput
          value={s.clipIgnore.join(", ")}
          placeholder="keepass, bitwarden"
          onChange={(v) => update({ clipIgnore: v.split(",").map((x) => x.trim().toLowerCase().replace(/\.exe$/, "")).filter(Boolean) })}
        />
      </Row>
      <Row label={tt("Ekrandan alınan renk")}>
        <div className="flex items-center gap-1.5">
          {s.colorFormat === "hex" && (
            <button onClick={() => update({ colorNoHash: !s.colorNoHash })} className="rounded-full bg-well px-2 py-[2px] text-[10.5px] font-medium text-label-2 hover:bg-well-hi" title={tt("# işaretiyle ya da onsuz")}>
              {s.colorNoHash ? tt("# yok") : "#"}
            </button>
          )}
          <Segmented id="color-format" options={COLOR_FORMATS} value={s.colorFormat} onChange={(v) => update({ colorFormat: v })} color={ACCENT.purple} />
        </div>
      </Row>
      <Row label={tt("Karalama sekmesi dokunulmazsa temizlensin")}>
        <Segmented id="pad-clear" options={PAD_CLEAR} value={s.padClear} onChange={(v) => update({ padClear: v })} color={ACCENT.yellow} />
      </Row>
      <Row label={tt("Kopyalanan yabancı metni çevir")} hint={tt("Açıksa yabancı dilde görünen kopyalar çevrilmek için Gemini'ye gönderilir")} keys="çeviri tercüme translate dil ingilizce">
        <Toggle on={s.translate} onChange={(v) => update({ translate: v })} color={ACCENT.purple} />
      </Row>
      {s.translate && !s.geminiKey.trim() && (
        <Row label={tt("Gemini anahtarı yokken MyMemory ile çevir")} hint={tt("Açıksa metin ücretsiz çeviri servisi MyMemory'ye gider")}>
          <Toggle on={s.freeTranslate === true} onChange={(v) => update({ freeTranslate: v })} color={ACCENT.purple} />
        </Row>
      )}
    </Section>
  );
}

/** Raf: sallayınca açılma, bırakınca kaldırma, Gezgin seçimini ekleme kısayolu */
function ShelfSection() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  return (
    <Section title={tt("Raf")}>
      <Row label={tt("Ekran görüntülerini rafa ekle")} hint={tt("Aldığın ekran görüntüsü hemen rafta olur")}>
        <Toggle on={s.autoScreenshots} onChange={(v) => update({ autoScreenshots: v })} />
      </Row>
      <Row label={tt("Dosya sürüklerken fareyi sallayınca raf açılsın")}>
        <Toggle on={s.shelfShake} onChange={(v) => update({ shelfShake: v })} />
      </Row>
      <Row label={tt("Başka yere bırakılan öğe raftan kalksın")}>
        <Toggle on={s.shelfRemoveAfterDrop} onChange={(v) => update({ shelfRemoveAfterDrop: v })} />
      </Row>
      <p className="-mt-0.5 pb-1 text-[10px] text-label-3">{tt("Sabitlediğin öğeler (iğne) Temizle'de de, bırakınca da rafta kalır.")}</p>
    </Section>
  );
}

const HEADPHONE_DROP: { id: number; label: string }[] = [
  { id: 0, label: tt("Kapalı") },
  { id: 10, label: pct(10) },
  { id: 25, label: pct(25) },
  { id: 40, label: pct(40) },
];

/** Ses: kulaklık çıkınca kısma, çıkışlar arasında kısayolla dönme */
const UI_VOLUME: { id: number; label: string }[] = [
  { id: 0.3, label: tt("Kısık") },
  { id: 0.6, label: tt("Orta") },
  { id: 1, label: tt("Yüksek") },
];

/** Önizle düğmesi her basışta başka bir sesi çalar */
const SFX_DEMO: Sfx[] = ["open", "success", "attention", "happy", "pop", "found", "close"];

function SoundSection() {
  const demo = useRef(0);
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const [outputs, setOutputs] = useState<AudioOutput[]>([]);
  useEffect(() => void quickState().then((q) => q && setOutputs(q.outputs)), []);
  const cycle = s.outputCycle;
  return (
    <Section title={tt("Ses")}>
      <Row label={tt("Nook'un sesleri (açılınca, bildirim gelince, sevinince)")} keys="ses volume hoparlör efekt sessiz">
        <Toggle on={s.uiSounds} onChange={(v) => { update({ uiSounds: v }); if (v) playSfx("happy", true); }} color={ACCENT.pink} />
      </Row>
      {s.uiSounds && (
        <Row label={tt("Seslerin yüksekliği")}>
          <div className="flex items-center gap-1.5">
            <PreviewButton color={ACCENT.pink} onClick={() => playSfx(SFX_DEMO[demo.current++ % SFX_DEMO.length], true)} />
            <Segmented id="ui-volume" options={UI_VOLUME} value={s.uiVolume} onChange={(v) => { update({ uiVolume: v }); window.setTimeout(() => playSfx("pop", true), 30); }} color={ACCENT.pink} />
          </div>
        </Row>
      )}
      <Row label={tt("Alarm sesi")}>
        <div className="flex items-center gap-1">
          <Dropdown
            value={s.alarmSound}
            onChange={(v) => update({ alarmSound: v })}
            color={ACCENT.orange}
            options={[{ id: 0, label: tt("Sessiz") }, ...Array.from({ length: 10 }, (_, i) => ({ id: i + 1, label: tt("Alarm {0}", i + 1) }))]}
          />
          <button
            disabled={s.alarmSound === 0}
            onClick={() => void alarmRing(true, s.alarmSound, true)}
            title={tt("Dinle")}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-well text-label-2 hover:bg-well-hi hover:text-label"
          >
            <Play size={9} strokeWidth={3} fill="currentColor" />
          </button>
        </div>
      </Row>
      <Row label={tt("Şarkı sözleri (lrclib.net)")}>
        <Toggle on={s.lyrics} onChange={(v) => update({ lyrics: v })} color={ACCENT.pink} />
      </Row>
      <Row label={tt("Kulaklık çıkınca sesi kıs")} keys="ses volume hoparlör kulaklık">
        <Segmented id="hp-drop" options={HEADPHONE_DROP} value={s.headphoneDrop} onChange={(v) => update({ headphoneDrop: v })} color={ACCENT.pink} />
      </Row>
      {s.outputShortcut && outputs.length > 1 && (
        <div className="py-1.5">
          <p className="mb-1 text-[10.5px] text-label-3">{tt("Kısayolun sırayla geçtiği çıkışlar (hiçbiri seçili değilse hepsi)")}</p>
          <div className="flex flex-wrap gap-1">
            {outputs.map((o) => {
              const on = cycle.includes(o.id);
              return (
                <button
                  key={o.id}
                  onClick={() => update({ outputCycle: on ? cycle.filter((x) => x !== o.id) : [...cycle, o.id] })}
                  title={o.name}
                  className="max-w-[160px] truncate rounded-full border px-2 py-[2px] text-[10.5px] font-medium"
                  style={on ? { background: tintBg(ACCENT.pink, 16), borderColor: tintBg(ACCENT.pink, 40), color: tintText(ACCENT.pink) } : { background: "rgb(255 255 255 / 0.035)", borderColor: "rgb(255 255 255 / 0.06)", color: "var(--color-label-2)" }}
                >
                  {shortName(o.name)}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <p className="-mt-0.5 pb-1 text-[10px] text-label-3">{tt("Uygulamaları başka çıkışa yönlendirmek, sabitlemek ve gizlemek: Kontrol › Uygulama sesi.")}</p>
    </Section>
  );
}

const REMIND_EXT: { id: number; label: string }[] = [
  { id: -1, label: tt("Yok") },
  { id: 0, label: tt("Vaktinde") },
  { id: 5, label: tt("5 dk") },
  { id: 10, label: tt("10 dk") },
  { id: 15, label: tt("15 dk") },
];

/** Takvim: Google/Outlook abonelikleri, kapalı adada geri sayım */
function CalendarSection() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const count = useNook((st) => st.extEvents.length);
  const syncedAt = useNook((st) => st.extSyncedAt);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const feeds = s.calFeeds;
  const add = () => {
    const url = draft.trim();
    if (!url) return;
    if (!/^(https|webcal):\/\//i.test(url)) return setError(tt("Adres https:// ya da webcal:// ile başlamalı"));
    setError(null);
    setDraft("");
    if (!feeds.includes(url)) update({ calFeeds: [...feeds, url] });
  };
  const syncNow = () => {
    setBusy(true);
    setError(null);
    void syncFeeds(feeds)
      .then(({ events, errors }) => {
        if (events.length || !errors.length) useNook.getState().setExtEvents(events);
        if (errors.length) setError(errors[0]);
      })
      .finally(() => setBusy(false));
  };
  const ago = syncedAt ? Math.round((Date.now() - syncedAt) / 60_000) : null;
  return (
    <Section title={tt("Takvim")}>
      <Row label={tt("Kapalı adada sıradaki etkinliğe geri sayım")}>
        <Toggle on={s.calCountdown} onChange={(v) => update({ calCountdown: v })} color={ACCENT.blue} />
      </Row>
      <Row label={tt("Abone takvimde etkinlikten önce haber ver")}>
        <Segmented id="cal-remind" options={REMIND_EXT} value={s.calRemindExt} onChange={(v) => update({ calRemindExt: v })} color={ACCENT.blue} />
      </Row>
      <div className="space-y-1 py-1.5">
        <p className="text-[12px] text-label">{tt("Takvim aboneliği (Google, Outlook, iCloud)")}</p>
        <p className="text-[10px] leading-snug text-label-3">
          {tt("Google Takvim › Ayarlar › takvimin › \"iCal biçiminde gizli adres\"; Outlook › Paylaşılan takvimler › Takvim yayımla › ICS. Etkinlikler yalnızca okunur.")}
        </p>
        {feeds.map((f) => (
          <div key={f} className="flex items-center gap-1.5 rounded-full bg-well py-[3px] pl-2.5 pr-1">
            <span className="min-w-0 flex-1 truncate text-[10.5px] text-label-2" title={f}>
              {f.replace(/^(https|webcal):\/\//, "")}
            </span>
            <button onClick={() => update({ calFeeds: feeds.filter((x) => x !== f) })} className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-label-3 hover:bg-white/10 hover:text-label" title={tt("Kaldır")}>
              <X size={9} strokeWidth={3} />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="https://calendar.google.com/…/basic.ics"
            spellCheck={false}
            className="h-6 min-w-0 flex-1 rounded-full bg-well px-2.5 text-[10.5px] text-label outline-none placeholder:text-label-3 focus:bg-well-hi"
          />
          <TextButton disabled={!draft.trim()} onClick={add}>{tt("Ekle")}</TextButton>
        </div>
        {feeds.length > 0 && (
          <div className="flex items-center justify-between text-[10px] text-label-3">
            <span>{ago === null ? tt("Henüz eşitlenmedi") : tt("{0} etkinlik · {1}", count, ago < 1 ? tt("az önce") : tt("{0} dk önce", ago))}</span>
            <TextButton disabled={busy} onClick={syncNow}>{busy ? tt("Eşitleniyor…") : tt("Şimdi eşitle")}</TextButton>
          </div>
        )}
        {error && <p className="truncate text-[10px] text-red/90" title={error}>{error}</p>}
      </div>
    </Section>
  );
}

const AI_PROVIDERS: { id: "gemini" | "claude"; label: string }[] = [
  { id: "gemini", label: "Gemini" },
  { id: "claude", label: "Claude" },
];

/** Yapay zekâ (Gemini ya da Claude): API anahtarı, model, adın, Nook'un hatıraları. */
function AiSection() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const chatCount = useNook((st) => st.chat.length);
  const gemini = useGemini();
  const claude = useClaudeAi();
  const isClaude = s.aiProvider === "claude";
  const claudeModels = CLAUDE_MODELS();

  return (
    <Section title={tt("Yapay zekâ")}>
      <Row label={tt("Nook'un zekâsı")} hint={tt("Sohbet, sesli komut ve ekrana sor bununla çalışır")} keys="claude gemini yapay zeka ai asistan model">
        <Segmented id="ai-provider" options={AI_PROVIDERS} value={s.aiProvider} onChange={(v) => update({ aiProvider: v })} color={ACCENT.purple} />
      </Row>
      {isClaude && (
        <>
          <Row label={tt("Claude API anahtarı")} keys="claude anthropic yapay zeka anahtar key şifre">
            <KeyInput value={s.claudeKey} placeholder="sk-ant-…" onChange={(v) => update({ claudeKey: v })} />
          </Row>
          <p className="-mt-1 pb-1 text-[10px]" style={{ color: claude.status === "ok" ? ACCENT.green : claude.status === "error" ? ACCENT.red : "var(--color-label-3)" }}>
            {claude.status === "ok"
              ? tt("Bağlandı")
              : claude.status === "error"
                ? claude.error
                : claude.status === "checking"
                  ? tt("Kontrol ediliyor…")
                  : tt("Claude daha akıllı ama ücretli: console.anthropic.com'da bir API anahtarı oluşturup buraya yapıştır; kullandıkça o hesaptan düşer. Claude aboneliği ya da Claude Code oturumu burada geçmez. Yalnızca bu bilgisayarda saklanır.")}
          </p>
          <Row label={tt("Model")} hint={claudeModels.find((m) => m.id === s.claudeModel)?.hint}>
            <Dropdown value={s.claudeModel} onChange={(v) => update({ claudeModel: v })} color={ACCENT.purple} options={claudeModels.map((m) => ({ id: m.id, label: m.label }))} />
          </Row>
          <p className="-mt-1 pb-1 text-[10px] text-label-3">
            {tt("Çeviri, günlük ve günün cümlesi Gemini anahtarıyla çalışmayı sürdürür; aşağıya onu da girebilirsin.")}
          </p>
        </>
      )}
      <Row label={isClaude ? tt("Gemini API anahtarı") : tt("API anahtarı")} keys="claude gemini google yapay zeka anahtar key şifre">
        <KeyInput value={s.geminiKey} onChange={(v) => update({ geminiKey: v })} />
      </Row>
      <p className="-mt-1 pb-1 text-[10px]" style={{ color: gemini.status === "ok" ? ACCENT.green : gemini.status === "error" ? ACCENT.red : "var(--color-label-3)" }}>
        {gemini.status === "ok"
          ? tt("Bağlandı · {0} model açık", gemini.models.length)
          : gemini.status === "error"
            ? gemini.error
            : gemini.status === "checking"
              ? tt("Kontrol ediliyor…")
              : tt("Anahtar, Google'ın ücretsiz verdiği bir şifre; sohbet, sesli komut ve ekrana sor bununla çalışır, Nook'un geri kalanı anahtarsız da çalışır. Almak için aistudio.google.com'a Google hesabınla gir, “Get API key” (API anahtarı al) düğmesine bas, çıkan yazıyı kopyalayıp buraya yapıştır. Yalnızca bu bilgisayarda saklanır.")}
      </p>
      {gemini.status === "ok" && (
        <Row label={tt("Model")}>
          <Dropdown
            value={s.aiModel}
            onChange={(v) => update({ aiModel: v })}
            color={ACCENT.purple}
            options={gemini.models.map((m) => ({ id: m.id, label: m.label }))}
          />
        </Row>
      )}
      {gemini.status === "ok" && (
        <p className="-mt-1 pb-1 text-[10px] text-label-3">
          {/pro/i.test(s.aiModel)
            ? tt("Pro daha akıllı ama daha yavaş. Ücretsiz anahtarda kotası düşük; dolarsa kendiliğimden Flash'a geçerim.")
            : tt("Flash hızlı ve ücretsiz kotası geniş. Daha zor sorular için Pro'yu seçebilirsin.")}
        </p>
      )}
      <Row label={tt("Adın")}>
        <TextInput value={s.userName} placeholder={tt("Nook sana nasıl hitap etsin?")} onChange={(v) => update({ userName: v })} />
      </Row>
      <div className="py-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-label">{tt("Hatırladıkları")}</span>
          {chatCount > 0 && (
            <TextButton tone="danger" onClick={() => useNook.getState().clearChat()}>{tt("Sohbeti temizle")}</TextButton>
          )}
        </div>
        {s.memories.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {s.memories.map((m) => (
              <span
                key={m}
                className="flex max-w-full items-center gap-1 rounded-full border py-0.5 pl-2 pr-1 text-[10.5px]"
                style={{ background: "color-mix(in srgb, var(--color-purple) 12%, transparent)", borderColor: "color-mix(in srgb, var(--color-purple) 32%, transparent)", color: "color-mix(in srgb, var(--color-purple) 70%, white)" }}
              >
                <span className="truncate">{m}</span>
                <button
                  onClick={() => update({ memories: s.memories.filter((x) => x !== m) })}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
                  aria-label={tt("Unut")}
                >
                  <X size={9} strokeWidth={2.8} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-0.5 text-[10.5px] text-label-3">{tt("Sohbette \"şunu hatırla…\" dersen burada görünür.")}</p>
        )}
      </div>
    </Section>
  );
}

const WAKE_SENS: { id: number; label: string }[] = [
  { id: 0.2, label: tt("Az") },
  { id: 0.5, label: tt("Orta") },
  { id: 0.85, label: tt("Çok") },
];

/**
 * "Hey Nook": sesini üç örnekle tanıt, sonra Nook adını duyunca dinlesin. Mikrofon bu
 * bilgisayarda dinlenir; yalnızca "Hey Nook"tan sonra söylenen cümle Gemini'ye gider.
 */
function WakeSection() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const [status, setStatus] = useState<WakeStatus | null>(null);
  // Tanıtım: kaçıncı örnek (0 kapalı), hata, kayıt sürüyor mu
  const [step, setStep] = useState(0);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState<WakeHeard | null>(null);

  useEffect(() => {
    void wakeStatus().then(setStatus);
    const offHeard = subscribe<WakeHeard>(EVENTS.wakeHeard, setHeard);
    const offLevel = subscribe<number>(EVENTS.voiceLevel, setLevel);
    return () => {
      offHeard();
      offLevel();
    };
  }, [s.wakeWord]);

  const record = async (n: number) => {
    setStep(n);
    setRecording(true);
    setError(null);
    try {
      const got = await wakeEnroll();
      if (got < 3) return void record(got + 1);
      const st = await wakeEnrollSave();
      setStatus(st);
      setStep(0);
      update({ wakeWord: true });
      playSfx("success");
    } catch (e) {
      setError(String(e));
      // Örnekler birbirine benzemediyse baştan
      if (/benzemedi/.test(String(e))) {
        await wakeEnrollReset();
        setStep(1);
      }
    } finally {
      setRecording(false);
    }
  };
  const start = async () => {
    await wakeEnrollReset();
    void record(1);
  };

  const trained = (status?.trained ?? 0) >= 3;
  const noKey = !s.geminiKey.trim();

  return (
    <Section title="Hey Nook">
      {step > 0 ? (
        <div className="py-2">
          <p className="text-[12px] text-label">{tt("Normal sesinle söyle: “Hey Nook” ({0}/3)", step)}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Bar pct={recording ? Math.round(level * 100) : 0} color={ACCENT.teal} className="flex-1" />
            {!recording && (
              <TextButton onClick={() => void record(step)}>{tt("Tekrar dene")}</TextButton>
            )}
          </div>
          <p className="mt-1 text-[10.5px]" style={{ color: error ? ACCENT.orange : "var(--color-label-3)" }}>
            {error ?? (recording ? tt("Dinliyorum…") : "")}
          </p>
        </div>
      ) : !trained ? (
        <div className="py-1.5">
          <p className="text-[10.5px] leading-snug text-label-3">
            {tt("“Hey Nook” deyince Nook dinler, sonra söylediğini yapar: “Hey Nook, YouTube Music'ten Tarkan aç”, “Hey Nook, sesi yüzde 30 yap”, “Hey Nook, yarın 8'e alarm kur”. Önce sesini tanıt: üç kez “Hey Nook” diyeceksin.")}
          </p>
          <div className="mt-1.5 flex justify-end">
            <TextButton onClick={() => void start()}>{tt("Sesimi tanıt")}</TextButton>
          </div>
        </div>
      ) : (
        <>
          <Row label={tt("Seslenince dinle")} keys="hey nook mikrofon sesli komut uyandırma">
            <Toggle on={s.wakeWord} onChange={(v) => update({ wakeWord: v })} color={ACCENT.teal} />
          </Row>
          <Row label={tt("Duyarlılık")}>
            <Segmented id="wake-sens" options={WAKE_SENS} value={WAKE_SENS.reduce((a, b) => (Math.abs(b.id - s.wakeSensitivity) < Math.abs(a.id - s.wakeSensitivity) ? b : a)).id} onChange={(v) => update({ wakeSensitivity: v })} />
          </Row>
          {s.wakeWord && (
            <div className="py-1.5">
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="text-label">{tt("Son duyduğu")}</span>
                <span className="text-[10.5px] font-medium" style={{ color: heard?.woke ? ACCENT.green : "var(--color-label-3)" }}>
                  {heard ? (heard.woke ? tt("Uyandı") : tt("Benzemedi")) : tt("Bir şey söyle")}
                </span>
              </div>
              <Bar pct={Math.round((heard?.score ?? 0) * 100)} color={heard?.woke ? ACCENT.green : ACCENT.teal} className="mt-1" />
              <p className="mt-1 text-[10.5px] leading-snug text-label-3">
                {tt("Çubuk ne kadar doluysa o kadar “Hey Nook”a benziyor. Seni duymuyorsa duyarlılığı artır; kendi kendine uyanıyorsa azalt.")}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-1 py-1">
            <TextButton onClick={() => void start()}>{tt("Yeniden tanıt")}</TextButton>
            <TextButton tone="danger" onClick={() => void wakeForget().then((st) => (setStatus(st), update({ wakeWord: false })))}>
              {tt("Sesimi unut")}
            </TextButton>
          </div>
        </>
      )}
      <LocalStt />
      {(trained || step > 0) && (
        <p className="py-1 text-[10.5px] leading-snug" style={{ color: noKey && !s.localStt ? ACCENT.orange : "var(--color-label-3)" }}>
          {noKey && !s.localStt
            ? tt("Komutları anlamak için Gemini API anahtarı ya da “Bilgisayarda yazıya dök” gerekiyor.")
            : s.localStt
              ? tt("Mikrofon yalnızca bu bilgisayarda dinlenir; Windows mikrofon simgesi açık kalır. “Aç, çal, ses” gibi komutlar hiç internete çıkmaz; yalnızca Nook'un bilmediği istekler Gemini'ye gider.")
              : tt("Mikrofon yalnızca bu bilgisayarda dinlenir; Windows mikrofon simgesi açık kalır. Yalnızca “Hey Nook”tan sonra söylediğin cümle Gemini'ye gider.")}
        </p>
      )}
    </Section>
  );
}

/**
 * Bilgisayarda yazıya dök (Whisper): model bir kez iner (~190 MB), sesli komut internetsiz ve
 * Gemini kotası harcamadan yazıya dökülür.
 */
function LocalStt() {
  const on = useNook((st) => st.settings.localStt);
  const update = useNook((st) => st.updateSettings);
  const [st, setSt] = useState<SttStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void sttStatus().then(setSt);
    const offP = subscribe<number>(EVENTS.sttProgress, (progress) => setSt((cur) => (cur ? { ...cur, downloading: true, progress } : cur)));
    const offR = subscribe<true | string>(EVENTS.sttReady, (r) => {
      if (r === true) {
        update({ localStt: true });
        setError(null);
      } else setError(tt("İnemedi: {0}", r));
      void sttStatus().then(setSt);
    });
    return () => {
      offP();
      offR();
    };
  }, [update]);
  if (!st) return null;
  return (
    <div className="py-1.5">
      <div className="flex min-h-[26px] items-center justify-between gap-2">
        <span className="text-[12px] text-label">{tt("Bilgisayarda yazıya dök")}</span>
        {st.installed ? (
          <Toggle on={on} onChange={(v) => update({ localStt: v })} color={ACCENT.teal} />
        ) : st.downloading ? (
          <span className="text-[11px] font-medium tabular-nums" style={{ color: tintText(ACCENT.teal) }}>
            {pct(Math.round(st.progress))}
          </span>
        ) : (
          <TextButton onClick={() => void sttDownload().then(() => setSt({ ...st, downloading: true, progress: 0 }))}>{tt("İndir (190 MB)")}</TextButton>
        )}
      </div>
      {st.downloading && <Bar pct={Math.round(st.progress)} color={ACCENT.teal} className="mt-1" />}
      <p className="mt-1 text-[10.5px] leading-snug" style={{ color: error ? ACCENT.orange : "var(--color-label-3)" }}>
        {error ??
          (st.installed
            ? tt("Sesli komut internetsiz, Gemini kotası harcamadan bu bilgisayarda (Whisper) yazıya dökülür.")
            : tt("Sesli komutu internete göndermeden, Gemini'ye bağlı kalmadan bu bilgisayarda yazıya döker (Whisper). Model bir kez iner."))}
      </p>
      {st.installed && (
        <div className="flex justify-end">
          <TextButton tone="danger" onClick={() => void sttDelete().then((x) => (setSt(x), update({ localStt: false })))}>
            {tt("Modeli sil")}
          </TextButton>
        </div>
      )}
    </div>
  );
}

/** API anahtarı: gizli yazılır, göz ikonuyla gösterilir. Yapıştırınca hemen kaydedilir. */
export function KeyInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [draft, setDraft] = useState(value);
  const [show, setShow] = useState(false);
  useEffect(() => setDraft(value), [value]);
  const commit = (v: string) => v.trim() !== value && onChange(v.trim());
  return (
    <div className="flex items-center gap-1">
      <input
        type={show ? "text" : "password"}
        value={draft}
        placeholder={placeholder ?? tt("AIza…")}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setDraft(e.target.value)}
        onPaste={(e) => {
          const v = e.clipboardData.getData("text");
          e.preventDefault();
          setDraft(v.trim());
          commit(v);
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="w-[150px] rounded-full bg-well px-2.5 py-0.5 font-mono text-[11px] text-label outline-none placeholder:font-sans placeholder:text-label-3 focus:bg-well-hi"
      />
      <button
        onClick={() => setShow((v) => !v)}
        title={show ? tt("Gizle") : tt("Göster")}
        className="flex h-5 w-5 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label"
      >
        {show ? <EyeOff size={11} /> : <Eye size={11} />}
      </button>
    </div>
  );
}

const SCENE_MODES: { id: SceneMode; label: string }[] = [
  { id: "random", label: tt("Karışık") },
  { id: "order", label: tt("Sırayla") },
  { id: "fixed", label: tt("Hep aynısı") },
];

/**
 * Gizlilik kalkanı: kısayol, gelen sahneler (karışık / sırayla / hep aynısı; hangileri gelsin),
 * kalkan açılınca mikrofon ve görüşme sesi kapansın mı, sağ üstteki düğmeler.
 */
function ShieldSection() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const picked = s.shieldScenes ?? [];
  const on = activeScenes(picked);
  const all = picked.length === 0 || on.length === SCENE_LIST.length;
  const toggle = (id: string) => {
    const next = on.includes(id) ? on.filter((x) => x !== id) : [...on, id];
    // Hepsi kapanmasın: en az bir sahne kalır
    if (next.length === 0) return;
    update({ shieldScenes: next.length === SCENE_LIST.length ? [] : next, shieldSceneNext: 0 });
  };
  return (
    <Section title={tt("Gizlilik kalkanı")}>
      <Row label={tt("Sahneler")}>
        <Segmented id="shield-mode" options={SCENE_MODES} value={s.shieldSceneMode ?? "random"} onChange={(v) => update({ shieldSceneMode: v, shieldSceneNext: 0 })} color={ACCENT.purple} />
      </Row>
      {s.shieldSceneMode === "fixed" ? (
        <Row label={tt("Gelen sahne")}>
          <Dropdown value={s.shieldScene ?? "campfire"} onChange={(v) => update({ shieldScene: v })} options={SCENE_LIST} color={ACCENT.purple} maxWidth={170} />
        </Row>
      ) : (
        <div className="py-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] text-label-2">{all ? tt("Hepsi geliyor") : tt("{0} sahne seçili", String(on.length))}</span>
            <span className="flex gap-1.5">
              <TextButton onClick={() => update({ shieldScenes: FEATURED_SCENES, shieldSceneNext: 0 })}>{tt("Öne çıkanlar")}</TextButton>
              <TextButton disabled={all} onClick={() => update({ shieldScenes: [], shieldSceneNext: 0 })}>{tt("Hepsini seç")}</TextButton>
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {SCENE_LIST.map((sc) => {
              const active = on.includes(sc.id);
              return (
                <button
                  key={sc.id}
                  onClick={() => toggle(sc.id)}
                  className="rounded-full border px-2 py-[3px] text-[10.5px] font-medium transition-colors"
                  style={{
                    background: active ? tintBg(ACCENT.purple, 16) : "rgb(255 255 255 / 0.03)",
                    borderColor: active ? tintBg(ACCENT.purple, 40) : "rgb(255 255 255 / 0.06)",
                    color: active ? tintText(ACCENT.purple) : "var(--color-label-3)",
                  }}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <Row label={tt("Kalkan açılınca mikrofonu kapat")}>
        <Toggle on={s.shieldMuteMic ?? true} onChange={(v) => update({ shieldMuteMic: v })} color={ACCENT.orange} />
      </Row>
      <Row label={tt("Görüşmedeysen gelen sesi kapat")}>
        <Toggle on={s.shieldMuteCalls ?? true} onChange={(v) => update({ shieldMuteCalls: v })} color={ACCENT.orange} />
      </Row>
      <Row label={tt("Sağ üstte mikrofon / ses düğmeleri ve klik sesi")}>
        <Toggle on={s.shieldMicFx} onChange={(v) => update({ shieldMicFx: v })} color={ACCENT.orange} />
      </Row>
      <p className="-mt-0.5 pb-1 text-[10px] text-label-3">{tt("Kalkan kalkınca kapattıkları geri açılır. Kalkan açıkken sağ üstteki düğmelerle de kapatıp açabilirsin.")}</p>
    </Section>
  );
}

/**
 * Parola kilidi: kalkan yalnızca parolayla kalkar, istenirse bilgisayar açılınca ada parola sorar.
 * Parola kurulduktan sonra bu bölümün ayarları da parolayla açılır.
 */
function LockSection() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const has = !!s.lockHash;
  // Bu bölüm parolayla açıldı mı (panel kapanınca yeniden kilitlenir)
  const [open, setOpen] = useState(false);
  const [setting, setSetting] = useState(false);

  if (!has || setting)
    return (
      <Section title={tt("Parola kilidi")}>
        {setting ? (
          <NewPassword
            onCancel={() => setSetting(false)}
            onSave={async (pw) => {
              update({ lockHash: await hashPassword(pw), lockEnabled: true });
              setSetting(false);
              setOpen(true);
            }}
          />
        ) : (
          <Row label={tt("Kalkan yalnızca parolayla kalksın")}>
            <TextButton onClick={() => setSetting(true)}>{tt("Parola belirle")}</TextButton>
          </Row>
        )}
        <p className="-mt-0.5 pb-1 text-[10px] text-label-3">{tt("Bilgisayardan kalkarken {0} ile kilitle; dönünce parolayla aç. İstersen bilgisayar açılınca ada da parola sorar.", s.shieldShortcut.split("+").join(" + "))}</p>
      </Section>
    );

  if (!open)
    return (
      <Section title={tt("Parola kilidi")}>
        <div className="flex items-center justify-between gap-2 py-1.5">
          <span className="flex items-center gap-1.5 text-[12px] text-label">
            <Lock size={12} strokeWidth={2.4} className="text-label-3" />
            {tt("Bu bölüm parolalı")}
          </span>
          <PasswordInput placeholder={tt("Parola")} action={tt("Aç")} verify={(pw) => checkPassword(pw, s.lockHash)} onOk={() => setOpen(true)} />
        </div>
      </Section>
    );

  return (
    <Section title={tt("Parola kilidi")}>
      <Row label={tt("Kalkan yalnızca parolayla kalksın")}>
        <Toggle on={s.lockEnabled} onChange={(v) => update({ lockEnabled: v })} color={ACCENT.red} />
      </Row>
      {s.lockEnabled && (
        <Row label={tt("Bilgisayar açılınca")}>
          <Segmented
            id="lock-boot"
            options={[
              { id: 1, label: tt("Parola sor") },
              { id: 0, label: tt("Sorma") },
            ]}
            value={s.lockOnBoot ? 1 : 0}
            onChange={(v) => update({ lockOnBoot: v === 1 })}
            color={ACCENT.red}
          />
        </Row>
      )}
      {s.lockEnabled && (
        <Row label={tt("Şimdi kilitle")}>
          <TextButton onClick={() => void shieldOn(false)}>{s.shieldShortcut.split("+").join(" + ")}</TextButton>
        </Row>
      )}
      <Row label={tt("Parola")}>
        <div className="flex items-center gap-1">
          <TextButton onClick={() => setSetting(true)}>{tt("Değiştir")}</TextButton>
          <TextButton
            tone="danger"
            onClick={() => {
              update({ lockHash: "", lockEnabled: false });
              setOpen(false);
            }}
          >
            {tt("Kaldır")}
          </TextButton>
        </div>
      </Row>
      <p className="-mt-0.5 pb-1 text-[10px] text-label-3">{tt("Unutursan: Görev Yöneticisi'nden Nook'u kapatınca kalkan da kalkar.")}</p>
    </Section>
  );
}

/** Yeni parola: iki kez yazılır, en az 4 karakter */
function NewPassword({ onSave, onCancel }: { onSave: (pw: string) => Promise<void>; onCancel: () => void }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const save = () => {
    if (a.length < 4) return setErr(tt("En az 4 karakter"));
    if (a !== b) return setErr(tt("Parolalar aynı değil"));
    void onSave(a);
  };
  const field = "w-[130px] rounded-full bg-well px-2.5 py-0.5 text-[11px] font-medium text-label outline-none placeholder:text-label-3 focus:bg-well-hi";
  return (
    <>
      <Row label={tt("Yeni parola")}>
        <input type="password" autoFocus value={a} placeholder="••••" onChange={(e) => (setA(e.target.value), setErr(null))} className={field} />
      </Row>
      <Row label={tt("Tekrar")}>
        <input
          type="password"
          value={b}
          placeholder="••••"
          onChange={(e) => (setB(e.target.value), setErr(null))}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className={field}
        />
      </Row>
      <div className="flex items-center justify-end gap-1.5 py-1.5">
        {err && <span className="mr-auto text-[10.5px]" style={{ color: ACCENT.red }}>{err}</span>}
        <TextButton onClick={onCancel}>{tt("Vazgeç")}</TextButton>
        <TextButton onClick={save}>{tt("Kaydet")}</TextButton>
      </div>
    </>
  );
}

/** Parola sorup doğrulayan küçük kutu (yanlışsa kırmızı) */
function PasswordInput({ placeholder, action, verify, onOk }: { placeholder: string; action: string; verify: (pw: string) => Promise<boolean>; onOk: () => void }) {
  const [v, setV] = useState("");
  const [wrong, setWrong] = useState(false);
  const go = async () => {
    if (!v) return;
    if (await verify(v)) return onOk();
    setWrong(true);
    setV("");
  };
  return (
    <div className="flex items-center gap-1">
      <input
        type="password"
        value={v}
        placeholder={wrong ? tt("Yanlış parola") : placeholder}
        onChange={(e) => (setV(e.target.value), setWrong(false))}
        onKeyDown={(e) => e.key === "Enter" && void go()}
        className={`w-[110px] rounded-full bg-well px-2.5 py-0.5 text-[11px] font-medium text-label outline-none focus:bg-well-hi ${wrong ? "placeholder:text-[color:var(--color-red)]" : "placeholder:text-label-3"}`}
      />
      <TextButton onClick={() => void go()}>{action}</TextButton>
    </div>
  );
}

/** Şehir satırının altı: bulunan şehir, ya da neden alınamadığı */
function useWeatherHint(auto: boolean): string {
  const city = useNook((s) => s.weather?.city);
  const error = useNook((s) => s.weatherError);
  if (error) return error;
  if (!city) return tt("Hava durumu alınıyor…");
  return auto ? tt("İnternet bağlantından tahmin edildi: {0}. Yanlışsa şehrini yaz", city) : tt("Bulunan: {0}", city);
}
