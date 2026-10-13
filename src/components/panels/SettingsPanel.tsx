import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { AudioLines, Bell, Check, ChevronLeft, Eye, EyeOff, Gamepad2, HeartPulse, HelpCircle, Info, Keyboard, LayoutGrid, Lock, Play, Search, Settings2, ShieldCheck, Smartphone, Sparkles, X, type LucideIcon } from "lucide-react";
import { useGemini } from "../../hooks/useGemini";
import { sttDelete, sttDownload, sttStatus, type SttStatus } from "../../lib/bridge";
import { refreshSupporters, REPO_URL, useSupporters } from "../../lib/supporters";
import { EVENTS, subscribe, wakeEnroll, wakeEnrollReset, wakeEnrollSave, wakeForget, wakeStatus, type WakeHeard, type WakeStatus } from "../../lib/bridge";
import { alarmRing, listMonitors, openPath, quickState, remoteInfo, remoteReset, remoteSet, shieldOn, outsideFixFirewall, outsideInstallTailscale, outsideOpenTailscale, outsideStatus, wakeOutsideSet, wakeOutsideStatus, wolFix, wolStatus, type AudioOutput, type MonitorInfo, type OutsideStatus, type RemoteInfo, type WakeOutside, type WolStatus } from "../../lib/bridge";
import { autoLogonGuide, biosGuide, routerGuide, type Guide } from "../../lib/wakeGuide";
import { syncFeeds } from "../../lib/ics";
import { shortName } from "./ControlPanel";
import { checkPassword, hashPassword } from "../../lib/lock";
import { startTour } from "../../lib/tour";
import { checkUpdate, installUpdate, useUpdate } from "../../lib/update";
import { chooseArgusDir, installArgus, openArgus, useArgus } from "../../lib/argus";
import { SULK_BELOW, useNook, type Settings } from "../../store/nook";
import { ACCENT, Bar, MiniNook, Segmented, TextButton, Toggle, Dropdown, tintBg, tintText } from "../ui/primitives";
import { INTRO_KINDS } from "../overlays/Intro";
import { MOVE_KINDS } from "../../lib/moveFx";
import { IntroPreview, MovePreview } from "./EffectPreview";
import { LangDropdown } from "../ui/LangPicker";
import { isTurkish, tt } from "../../lib/i18n";
import { playSfx, type Sfx } from "../../lib/sfx";
import { activeScenes, SCENE_LIST, type SceneMode } from "../shield/catalog";
import { conflictOf, duplicateOf, SHORTCUTS, useInstalledApps } from "../../lib/shortcuts";

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

const SCALES: { id: number; label: string }[] = [
  { id: 0.8, label: "%80" },
  { id: 0.9, label: "%90" },
  { id: 1, label: "%100" },
  { id: 1.15, label: "%115" },
  { id: 1.3, label: "%130" },
  { id: 1.5, label: "%150" },
];

const VISION: { id: Settings["colorVision"]; label: string }[] = [
  { id: "normal", label: tt("Normal") },
  { id: "protan", label: tt("Protanopi (kırmızı zayıf)") },
  { id: "deutan", label: tt("Döteranopi (yeşil zayıf)") },
  { id: "tritan", label: tt("Tritanopi (mavi-sarı zayıf)") },
];

const WATER: { id: number; label: string }[] = [
  { id: 0, label: tt("Yok") },
  { id: 45, label: tt("45 dk") },
  { id: 60, label: tt("1 sa") },
  { id: 90, label: tt("90 dk") },
];

type CatId = "general" | "island" | "notify" | "health" | "game" | "privacy" | "voice" | "modules" | "shortcuts" | "phone" | "about";

/** Ayarların kategorileri: önce ızgara, birine basınca kendi sayfası. `sections`: içindeki bölüm başlıkları (atlama için) */
const CATS: { id: CatId; title: string; hint: string; icon: LucideIcon; color: string; sections: string[] }[] = [
  { id: "general", title: tt("Genel"), hint: tt("Dil, görünüm, ekran, boyut"), icon: Settings2, color: ACCENT.blue, sections: ["Nook", tt("Ekran"), tt("Erişilebilirlik")] },
  { id: "island", title: tt("Ada ve Nook"), hint: tt("Uyku, gezinti, animasyonlar"), icon: Sparkles, color: ACCENT.pink, sections: [tt("Ada"), tt("Animasyonlar")] },
  { id: "notify", title: tt("Bildirimler"), hint: tt("Bildirim kartları, uyarılar"), icon: Bell, color: ACCENT.purple, sections: [tt("Bildirimler")] },
  { id: "health", title: tt("Sağlık"), hint: tt("Su, göz molası, odak bekçisi"), icon: HeartPulse, color: ACCENT.teal, sections: [tt("Mola hatırlatıcıları"), tt("Odak bekçisi")] },
  { id: "game", title: tt("Oyun"), hint: tt("Tam ekran, oyun özeti, mola"), icon: Gamepad2, color: ACCENT.orange, sections: [tt("Oyun")] },
  { id: "privacy", title: tt("Gizlilik"), hint: tt("Kalkan, parola, yayın, hassas veri"), icon: ShieldCheck, color: ACCENT.red, sections: [tt("Yayın ve hassas veri"), tt("Gizlilik kalkanı"), tt("Parola kilidi")] },
  { id: "voice", title: tt("Asistan"), hint: tt("Gemini, Hey Nook, sesler"), icon: AudioLines, color: ACCENT.yellow, sections: [tt("Yapay zekâ"), "Hey Nook", tt("Ses")] },
  { id: "modules", title: tt("Modüller"), hint: tt("Pano, Raf, Takvim, Hum, Argus"), icon: LayoutGrid, color: ACCENT.green, sections: [tt("Pano ve notlar"), tt("Raf"), tt("Takvim"), tt("Hava durumu"), "Hum", "Argus"] },
  { id: "shortcuts", title: tt("Kısayollar"), hint: tt("Klavye kısayolları"), icon: Keyboard, color: ACCENT.blue, sections: [tt("Kısayollar")] },
  { id: "phone", title: tt("Telefon"), hint: tt("Nook Mobil, uzaktan açma"), icon: Smartphone, color: ACCENT.green, sections: [tt("Telefon")] },
  { id: "about", title: tt("Hakkında"), hint: tt("Tanıtım, güncelleme, destekçiler"), icon: Info, color: ACCENT.purple, sections: [tt("Hakkında"), tt("Destekçiler")] },
];

/** Bölüm başlığından kategorisi ("Ayarlar › Kısayollar"a gönderme gibi) */
const catOf = (section: string) => CATS.find((c) => c.sections.some((t) => t === section || t.startsWith(section) || section.startsWith(t)))?.id ?? null;

export function SettingsPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("settings", scroller);
  const [cat, setCat] = useState<CatId | null>(() => {
    // Önizleme: ?sec=Pano → o bölümün kategorisi (ekran görüntüsü için)
    const sec = import.meta.env.DEV ? new URLSearchParams(location.search).get("sec") : null;
    return sec ? catOf(sec) : null;
  });
  const [query, setQuery] = useState(() => (import.meta.env.DEV ? new URLSearchParams(location.search).get("find") ?? "" : ""));
  const q = query.trim().toLocaleLowerCase("tr");
  const [empty, setEmpty] = useState(false);

  // Başka bir yerden "Ayarlar › Kısayollar"a gönderildiyse o kategoriyi aç, bölüme kaydır
  const jump = useNook((st) => st.settingsJump);
  useEffect(() => {
    if (!jump) return;
    const c = catOf(tt(jump));
    setQuery("");
    if (c) setCat(c);
    const t = window.setTimeout(() => {
      const el = scroller.current?.querySelector<HTMLElement>(`section[data-sec^="${tt(jump)}"]`);
      if (el && scroller.current) scroller.current.scrollTo({ top: topIn(el, scroller.current) - 40, behavior: "smooth" });
      useNook.getState().setSettingsJump(null);
    }, 250);
    return () => window.clearTimeout(t);
  }, [jump]);

  // Kategori değişince başa
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [cat]);

  // Arama: bütün kategoriler alt alta çizilir, eşleşmeyen satırlar ve bölümler gizlenir
  useEffect(() => {
    const el = scroller.current;
    if (!el || !q) return;
    const filter = () => {
      let total = false;
      el.querySelectorAll<HTMLElement>("[data-cat]").forEach((catEl) => {
        let catHit = false;
        catEl.querySelectorAll<HTMLElement>("section[data-sec]").forEach((sec) => {
          const secHit = (sec.dataset.sec ?? "").toLocaleLowerCase("tr").includes(q);
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
  }, [q]);

  const current = CATS.find((c) => c.id === cat);
  const shown = q ? CATS : current ? [current] : [];

  return (
    <div ref={scroller} className="h-full overflow-y-auto pr-1.5">
      <div className="sticky top-0 z-10 flex items-center gap-1.5 bg-[#1c1c1f] pb-2" style={{ boxShadow: "0 8px 10px -6px #1c1c1f" }}>
        {current && !q && (
          <button onClick={() => setCat(null)} className="flex h-[26px] shrink-0 items-center gap-1 rounded-full bg-well pl-1.5 pr-2.5 text-[11.5px] font-semibold text-label hover:bg-well-hi">
            <ChevronLeft size={14} />
            <current.icon size={12} style={{ color: tintText(current.color) }} />
            {current.title}
          </button>
        )}
        <label className="flex h-[26px] min-w-0 flex-1 items-center gap-1.5 rounded-full bg-well px-2.5 text-label-3 focus-within:ring-1 focus-within:ring-white/15">
          <Search size={12} className="shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                setQuery("");
                e.stopPropagation();
              }
            }}
            placeholder={tt("Ayarlarda ara…")}
            className="min-w-0 flex-1 bg-transparent text-[11.5px] text-label outline-none placeholder:text-label-3"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-label-3 hover:text-label" aria-label={tt("Temizle")}>
              <X size={12} />
            </button>
          )}
        </label>
      </div>

      {!q && !current && (
        <div className="grid grid-cols-3 gap-1.5">
          {CATS.map((c) => (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCat(c.id)}
              className="flex min-h-[46px] min-w-0 items-center gap-2 rounded-[14px] px-2 py-1.5 text-left transition-[filter] hover:brightness-125"
              style={{ background: tintBg(c.color, 10), border: `1px solid ${tintBg(c.color, 22)}` }}
            >
              <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full" style={{ background: tintBg(c.color, 24), color: tintText(c.color) }}>
                <c.icon size={13} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11.5px] font-semibold" style={{ color: tintText(c.color) }}>
                  {c.title}
                </span>
                <span className="line-clamp-2 text-[9.5px] leading-[1.25] text-label-3">{c.hint}</span>
              </span>
            </motion.button>
          ))}
        </div>
      )}

      {shown.map((c) => (
        <div key={c.id} data-cat={c.id} className="space-y-3 pb-2">
          {q && (
            <h2 className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold" style={{ color: tintText(c.color) }}>
              <c.icon size={12} /> {c.title}
            </h2>
          )}
          <CategoryBody id={c.id} />
        </div>
      ))}
      {q && empty && <p className="py-6 text-center text-[11px] text-label-3">{tt("Bulunamadı")}</p>}
    </div>
  );
}

/** Bir kategorinin bölümleri */
function CategoryBody({ id }: { id: CatId }) {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
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
            <Row label={tt("Dil") + (tt("Dil") === "Language" ? "" : " · Language")}>
              <LangDropdown />
            </Row>
            <Affection />
            <Row label={tt("Adı ve görünümü")} hint={tt("Şekli, gözleri, şapkası, rengi")}>
              <TextButton onClick={() => useNook.getState().setTab("look")}>{tt("Düzenle")}</TextButton>
            </Row>
            <Row label={tt("Windows açılınca başlat")}>
              <Toggle on={s.autostart} onChange={(v) => update({ autostart: v })} />
            </Row>
          </Section>
          <Section title={tt("Ekran")}>
            <Row label={tt("Hangi ekranda")} hint={tt("Ana ekran, imlecin olduğu, hepsi ya da seçtiğin")}>
              <Segmented id="monitor" options={MONITOR_MODES} value={s.monitorMode} onChange={(v) => update({ monitorMode: v })} color={ACCENT.blue} />
            </Row>
            {s.monitorMode === "fixed" && (
              <Row label={tt("Hangi ekran")}>
                <Dropdown
                  value={s.monitorName ?? ""}
                  onChange={(v) => update({ monitorName: v || null })}
                  maxWidth={150}
                  color={ACCENT.blue}
                  options={[{ id: "", label: tt("Ana ekran") }, ...monitors.map((m, i) => ({ id: m.name, label: `${i + 1}. ekran · ${m.width}×${m.height}` }))]}
                />
              </Row>
            )}
            <Row label={tt("Adanın yeri")} hint={s.islandPos ? tt("Taşındı · üstteki ✥ ile sürükle") : tt("Üst orta · üstteki ✥ ile sürükle")}>
              <TextButton disabled={!s.islandPos} onClick={() => update({ islandPos: null })}>{tt("Ortala")}</TextButton>
            </Row>
          </Section>
          <Section title={tt("Erişilebilirlik")}>
            <Row label={tt("Arayüz boyutu")}>
              <Segmented id="scale" options={SCALES} value={s.uiScale} onChange={(v) => update({ uiScale: v })} />
            </Row>
            <Row label={tt("Renk körlüğü paleti")}>
              <Dropdown options={VISION} value={s.colorVision} onChange={(v) => update({ colorVision: v })} />
            </Row>
            <PalettePreview />
          </Section>
        </>
      );
    case "island":
      return (
        <>
          <Section title={tt("Ada")}>
            <Row label={tt("Uyuma süresi")} hint={tt("Bu kadar dokunulmazsa Nook uyur")}>
              <Segmented id="sleep" options={SLEEP} value={s.sleepAfterSec} onChange={(v) => update({ sleepAfterSec: v })} />
            </Row>
            <Row label={tt("Ara sıra dışarı çıksın")} hint={tt("Pencereye tüner, iple sarkar, balık tutar")}>
              <Toggle on={s.outings} onChange={(v) => update({ outings: v })} />
            </Row>
            <Row label={tt("Ses kartı")} hint={tt("Ada açılınca solunda ses düzeyi kartı")}>
              <Toggle on={s.soundCard} onChange={(v) => update({ soundCard: v })} color={ACCENT.green} />
            </Row>
            <Row label={tt("Pilde yavaşla")} hint={tt("Pildeyken ve tasarruf modunda animasyonlar azalır")}>
              <Toggle on={s.powerSaver} onChange={(v) => update({ powerSaver: v })} />
            </Row>
            <Row label={tt("Günün ilk açılışında özet")} hint={tt("Hava, takvim, yeni bölümler")}>
              <Toggle on={s.dailySummary} onChange={(v) => update({ dailySummary: v })} />
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
          </Section>
        </>
      );
    case "notify":
      return (
        <Section title={tt("Bildirimler")}>
          <Row label={tt("Windows bildirimleri")} hint={tt("Gelen bildirimler adada kart olarak görünür")}>
            <Toggle on={s.notifications} onChange={(v) => update({ notifications: v })} />
          </Row>
          <Row label={tt("Olay kartları")} hint={tt("Şarj, USB, kulaklık, internet gibi olaylar")}>
            <Toggle on={s.events} onChange={(v) => update({ events: v })} />
          </Row>
          <Row label={tt("Ses / parlaklık göstergesi")}>
            <Toggle on={s.osd} onChange={(v) => update({ osd: v })} />
          </Row>
          <Row label={tt("Sistem uyarıları")} hint={tt("Uzun süre yüksek işlemci / bellek, dolan disk")}>
            <Toggle on={s.sysAlerts} onChange={(v) => update({ sysAlerts: v })} color={ACCENT.orange} />
          </Row>
          <Row label={tt("Kopyalanan yabancı metni çevir")}>
            <Toggle on={s.translate} onChange={(v) => update({ translate: v })} />
          </Row>
          {s.translate && !s.geminiKey.trim() && (
            <Row label={tt("Gemini anahtarı yokken MyMemory ile çevir")} hint={tt("Açıksa metin ücretsiz çeviri servisi MyMemory'ye gider")}>
              <Toggle on={s.freeTranslate === true} onChange={(v) => update({ freeTranslate: v })} color={ACCENT.purple} />
            </Row>
          )}
        </Section>
      );
    case "health":
      return (
        <>
          <Section title={tt("Mola hatırlatıcıları")}>
            <Row label={tt("Su hatırlatıcısı")} hint={tt("Oyunda ve tam ekranda susar; telefonda da çıkar")}>
              <Segmented id="settings-water" options={WATER} value={s.waterEvery} onChange={(v) => update({ waterEvery: v })} color={ACCENT.blue} />
            </Row>
            <Row label={tt("Göz molası")} hint={tt("20 dakikada bir 20 saniye uzağa bak")}>
              <Toggle on={s.eyeBreak} onChange={(v) => update({ eyeBreak: v })} />
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
        <Section title={tt("Oyun")}>
          <Row label={tt("Oyunda / tam ekranda gizlen")}>
            <Toggle on={s.hideInFullscreen} onChange={(v) => update({ hideInFullscreen: v })} />
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
            <Row label={tt("Hava durumu")} hint={tt("Bugün kartında ve günün özetinde")}>
              <Toggle on={s.weather} onChange={(v) => update({ weather: v })} />
            </Row>
            {s.weather && (
              <Row label={tt("Şehir")}>
                <TextInput value={s.weatherCity} placeholder={tt("Otomatik")} onChange={(v) => update({ weatherCity: v })} />
              </Row>
            )}
          </Section>
          <Section title="Hum">
            <Row label={tt("Otomatik Hum")} hint={tt("Bilgisayarda çalan şarkıları arkada tanıyıp kaydeder; mikrofon kullanmaz")}>
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
          <Section title={tt("Hakkında")}>
            <Row label={tt("Nook nedir? Nasıl kullanılır?")}>
              <TextButton onClick={() => void startTour()}>{tt("Tanıtımı aç")}</TextButton>
            </Row>
            <UpdateRow />
            <Row label="Instagram">
              <TextButton onClick={() => void openPath("https://www.instagram.com/nooktheblob/")}>@nooktheblob</TextButton>
            </Row>
          </Section>
          <SupportersSection />
        </>
      );
  }
}

/** Argus (dizi/film arşivi) — yalnızca bu bilgisayarda varsa görünür. */
function ArgusSection() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const snap = useArgus((st) => st.snap);
  // Argus yalnızca Türkçe: başka dilde, kurulu değilse önerilmez
  if (!snap && !isTurkish) return null;
  if (!snap)
    return (
      <Section title="Argus">
        <Row label={tt("Dizi/film arşivi: Argus")}>
          <TextButton onClick={() => void installArgus()}>{tt("Kur")}</TextButton>
        </Row>
        <Row label={tt("Argus kurulu ama bulamadım")}>
          <TextButton onClick={() => void chooseArgusDir()}>{tt("Klasörünü seç")}</TextButton>
        </Row>
        <p className="-mt-0.5 pb-1 text-[10px] text-label-3">{tt("Nook'un kardeşi. Kurarsan yeni bölümleri haber veririm, ne izleyeceğini seçerim.")}</p>
      </Section>
    );
  return (
    <Section title="Argus">
      <Row label={tt("Profil")}>
        <Dropdown
          value={s.argusProfile && snap.profiles.includes(s.argusProfile) ? s.argusProfile : ""}
          onChange={(v) => update({ argusProfile: v })}
          color={ACCENT.orange}
          options={[{ id: "", label: `Otomatik (${snap.profile})` }, ...snap.profiles.map((p) => ({ id: p, label: p }))]}
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
          <Row label={tt("İzlerken içindeki müzikleri bul (Hum)")}>
            <Toggle on={s.humWatch} onChange={(v) => update({ humWatch: v })} color={ACCENT.purple} />
          </Row>
          <p className="-mt-0.5 pb-1 text-[10px] text-label-3">
            {tt("Argus'taki bir dizi ya da film çalarken Hum arkada dinler; çalan şarkıyı hangi dakikada çaldığıyla Argus'taki detay penceresinin Müzikler bölümüne yazar.")}
          </p>
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

/** Nook Mobil: telefon bu PC'ye bağlanır (kapat, uyut, ekran görüntüsü…). QR gizli anahtarı taşıdığı için
 *  yalnızca istenince ve bir dakikalığına görünür. */
function PhoneSection() {
  const [info, setInfo] = useState<RemoteInfo | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [appQr, setAppQr] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => void remoteInfo().then(setInfo), []);
  useEffect(() => {
    if (!showQr) return;
    // Adresler değişebilir (Tailscale sonradan açıldı): kod gösterilirken tazele
    void remoteInfo().then(setInfo);
    const t = window.setTimeout(() => setShowQr(false), 60_000);
    return () => window.clearTimeout(t);
  }, [showQr]);
  if (!info) return null;
  const toggle = async (on: boolean) => {
    setBusy(true);
    setInfo(await remoteSet(on).finally(() => setBusy(false)));
    if (!on) setShowQr(false);
  };
  return (
    <Section title={tt("Telefon")}>
      <Row label={tt("Nook Mobil bu PC'ye bağlanabilsin")}>
        <Toggle on={info.enabled} onChange={(v) => void toggle(v)} color={ACCENT.blue} />
      </Row>
      {!info.enabled && (
        <p className="-mt-0.5 pb-1 text-[10px] text-label-3">
          {tt("Açınca telefondan bu PC'yi kapatabilir, uyutabilir, kilitleyebilir ve ekran görüntüsü alabilirsin. Bağlantı yalnızca eşleştirdiğin telefona açıktır.")}
        </p>
      )}
      {info.enabled && !info.running && !busy && (
        <p className="pb-1 text-[10px] text-red/90">{tt("Köprü başlatılamadı: {0} numaralı bağlantı noktası başka bir uygulamada olabilir.", info.port)}</p>
      )}
      {info.enabled && (
        <>
          <Row label={tt("Telefona Nook Mobil'i kur (Android)")}>
            <TextButton onClick={() => setAppQr((v) => !v)}>{appQr ? tt("Gizle") : tt("Kodu göster")}</TextButton>
          </Row>
          {appQr && info.appQr && (
            <div className="flex items-center gap-3 py-2">
              <div className="h-[118px] w-[118px] shrink-0 overflow-hidden rounded-xl bg-white p-1 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: info.appQr }} />
              <p className="text-[10.5px] leading-snug text-label-2">
                {tt("Telefonun kamerasıyla okut, Nook Mobil indirilir. Açınca Android “bilinmeyen uygulamaları yükle” izni isteyebilir; izin verip kur. Sonraki güncellemeler uygulamanın içinden gelir.")}
              </p>
            </div>
          )}
          <Row label={tt("Telefonu eşleştir")}>
            <TextButton onClick={() => setShowQr((v) => !v)}>{showQr ? tt("Gizle") : tt("Kodu göster")}</TextButton>
          </Row>
          {showQr && info.qr && (
            <div className="flex items-center gap-3 py-2">
              <div className="h-[118px] w-[118px] shrink-0 overflow-hidden rounded-xl bg-white p-1 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: info.qr }} />
              <p className="text-[10.5px] leading-snug text-label-2">
                {tt("Telefonda Nook'u aç, “PC ekle”ye bas ve bu kodu okut. Kodu kimseyle paylaşma: bu PC'yi yönetmenin anahtarı.")}
              </p>
            </div>
          )}
          <OutsideSetup />
          <WakeSetup />
          <Row label={tt("Eşleşmeyi sıfırla (telefonun bağlantısı kopar)")}>
            <TextButton
              tone="danger"
              onClick={() => {
                setShowQr(false);
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

/** Tarif kutusu: numaralı adımlar ve alttaki not (wakeGuide.ts; telefonda da aynısı görünür) */
function GuideBox({ guide }: { guide: Guide }) {
  return (
    <div className="rounded-lg bg-well px-2 py-1.5 text-[10.5px] leading-snug text-label-2">
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
                ? tt("Tailscale açık (Nook kapanırsa yeniden açar)")
                : st.tailscaleState === "needs-login"
                  ? tt("Tailscale'e giriş yapılmadı")
                  : tt("Tailscale kapalı: Nook açıyor…")
            }
          >
            {!st.tailscaleUp && <SmallAction onClick={() => void act("open", outsideOpenTailscale)}>{tt("Aç")}</SmallAction>}
          </CheckRow>
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
            <div className="h-[96px] w-[96px] shrink-0 overflow-hidden rounded-xl bg-white p-1 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: st.phoneQr }} />
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
            : tt("“İzin ver” Windows yönetici izni ister; yalnızca ev ağından ve Tailscale'den gelen bağlantılara izin verilir.")}
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
        <span className="text-[11px] font-medium tabular-nums" style={{ color: ACCENT.green }}>{tt("İndiriliyor %{0}", progress)}
        </span>
      ) : available ? (
        <TextButton onClick={() => void installUpdate()}>
          <span style={{ color: ACCENT.green }}>{tt("{0} sürümüne güncelle", available)}</span>
        </TextButton>
      ) : (
        <div className="flex items-center gap-1">
          {status && <span className="text-[10.5px] text-label-3">{status}</span>}
          <TextButton onClick={() => void checkUpdate(true)}>{tt("Denetle")}</TextButton>
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
            {list.slice(0, 60).map((s) => (
              <button key={s.login} title={s.login} onClick={() => void openPath(s.url)} className="group flex flex-col items-center gap-0.5">
                <img src={s.avatar} alt={s.login} className="h-8 w-8 rounded-full ring-1 ring-white/10 transition-transform group-hover:scale-110" draggable={false} />
                <span className="max-w-[52px] truncate text-[9.5px] text-label-3">{s.login}</span>
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

/**
 * Bölümün kaydırılan kutunun içeriğindeki yeri. offsetTop en yakın konumlu ataya göredir; kaydırılan
 * kutu konumlu olmadığından kutunun kendi yeri de içindeydi ve sekme bir önceki bölümde parlıyordu.
 * (getBoundingClientRect kullanılmaz: ada açılırken ölçeklenir, yerler küçük çıkar.)
 */
function topIn(sec: HTMLElement, el: HTMLElement) {
  if (sec.offsetParent === el) return sec.offsetTop;
  if (sec.offsetParent === el.offsetParent) return sec.offsetTop - el.offsetTop - el.clientTop;
  return sec.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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

/** Ayar satırı: kısa başlık, altında isteğe bağlı tek satır açıklama; aramada ikisi de aranır */
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div data-row={`${label} ${hint ?? ""}`.toLocaleLowerCase("tr")} className="flex min-h-[30px] items-center justify-between gap-2 py-1">
      <span className="min-w-0">
        <span className="block text-[12px] text-label">{label}</span>
        {hint && <span className="block text-[10px] leading-snug text-label-3">{hint}</span>}
      </span>
      <span className="flex shrink-0 items-center">{children}</span>
    </div>
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
function ShortcutInput({ value, onChange, clearable }: { value: string; onChange: (v: string) => void; clearable?: boolean }) {
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
  return (
    <Section title={tt("Kısayollar")}>
      {SHORTCUTS.map((k) => {
        const combo = s[k.key];
        const dup = duplicateOf(s, k.key);
        const clash = conflictOf(combo, apps);
        return (
          <div key={k.key}>
            <Row label={k.label}>
              <ShortcutInput value={combo} onChange={(v) => update({ [k.key]: v } as Partial<Settings>)} clearable={k.clearable} />
            </Row>
            {(dup || clash) && (
              <p className="-mt-1 pb-1 text-[10px]" style={{ color: tintText(ACCENT.orange) }}>
                {dup ? tt("Bu tuşlar \"{0}\" için de kullanılıyor; bu kısayol çalışmaz", dup.label) : tt("Bu tuşlarla {0} çalışmaz", clash)}
              </p>
            )}
          </div>
        );
      })}
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
      <Row label={tt("Kopyaladıktan sonra panoyu boşalt")}>
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
  { id: 10, label: "%10" },
  { id: 25, label: "%25" },
  { id: 40, label: "%40" },
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
      <Row label={tt("Nook'un sesleri (açılınca, bildirim gelince, sevinince)")}>
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
            options={[{ id: 0, label: tt("Sessiz") }, ...Array.from({ length: 10 }, (_, i) => ({ id: i + 1, label: `Alarm ${i + 1}` }))]}
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
      <Row label={tt("Kulaklık çıkınca sesi kıs")}>
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

/** Yapay zekâ (Gemini): API anahtarı, model, adın, Nook'un hatıraları. */
function AiSection() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const chatCount = useNook((st) => st.chat.length);
  const gemini = useGemini();

  return (
    <Section title={tt("Yapay zekâ (Gemini)")}>
      <Row label={tt("API anahtarı")}>
        <KeyInput value={s.geminiKey} onChange={(v) => update({ geminiKey: v })} />
      </Row>
      <p className="-mt-1 pb-1 text-[10px]" style={{ color: gemini.status === "ok" ? ACCENT.green : gemini.status === "error" ? ACCENT.red : "var(--color-label-3)" }}>
        {gemini.status === "ok"
          ? tt("Bağlandı · {0} model açık", gemini.models.length)
          : gemini.status === "error"
            ? gemini.error
            : gemini.status === "checking"
              ? tt("Kontrol ediliyor…")
              : tt("aistudio.google.com → Get API key. Anahtar yalnızca bu bilgisayarda saklanır.")}
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
          <Row label={tt("Seslenince dinle")}>
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
            %{Math.round(st.progress)}
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
export function KeyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [show, setShow] = useState(false);
  useEffect(() => setDraft(value), [value]);
  const commit = (v: string) => v.trim() !== value && onChange(v.trim());
  return (
    <div className="flex items-center gap-1">
      <input
        type={show ? "text" : "password"}
        value={draft}
        placeholder={tt("AIza…")}
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
            <TextButton disabled={all} onClick={() => update({ shieldScenes: [], shieldSceneNext: 0 })}>{tt("Hepsini seç")}</TextButton>
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
