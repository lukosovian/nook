import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { Eye, EyeOff, Play, X } from "lucide-react";
import { useGemini } from "../../hooks/useGemini";
import { alarmRing, listMonitors, openPath, type MonitorInfo } from "../../lib/bridge";
import { startTour } from "../../lib/tour";
import { checkUpdate, installUpdate, useUpdate } from "../../lib/update";
import { chooseArgusDir, installArgus, openArgus, useArgus } from "../../lib/argus";
import { SULK_BELOW, useNook, type Settings } from "../../store/nook";
import { ACCENT, Bar, MiniNook, Segmented, TextButton, Toggle, Dropdown, tintBg, tintText } from "../ui/primitives";
import { INTRO_KINDS } from "../overlays/Intro";
import { MOVE_KINDS } from "../../lib/moveFx";
import { IntroPreview, MovePreview } from "./EffectPreview";
import { LangDropdown } from "../ui/LangPicker";
import { tt } from "../../lib/i18n";

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

export function SettingsPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("settings", scroller);
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  useEffect(() => void listMonitors().then(setMonitors), []);
  // Önizleme sahneleri: ilk oynatışta açılır, her basışta baştan oynar
  const [preview, setPreview] = useState({ move: 0, intro: 0 });
  const replay = (k: "move" | "intro") => setPreview((p) => ({ ...p, [k]: p[k] + 1 }));

  return (
    <div ref={scroller} className="h-full space-y-3 overflow-y-auto pr-1.5">
      <SectionIndex scroller={scroller} />
      <Section title="Nook">
        <Row label={tt("Dil") + (tt("Dil") === "Language" ? "" : " · Language")}>
          <LangDropdown />
        </Row>
        <Affection />
        <Row label={tt("Adı ve görünümü")}>
          <TextButton onClick={() => useNook.getState().setTab("look")}>{tt("Düzenle")}</TextButton>
        </Row>
        <Row label={tt("Uyuma süresi")}>
          <Segmented id="sleep" options={SLEEP} value={s.sleepAfterSec} onChange={(v) => update({ sleepAfterSec: v })} />
        </Row>
        <Row label={tt("Ara sıra dışarı çıksın (pencereye tüner, iple sarkar, balık tutar)")}>
          <Toggle on={s.outings} onChange={(v) => update({ outings: v })} />
        </Row>
        <Row label={tt("Nook nedir? Nasıl kullanılır?")}>
          <TextButton onClick={() => void startTour()}>{tt("Tanıtımı aç")}</TextButton>
        </Row>
        <UpdateRow />
        <Row label="Instagram">
          <TextButton onClick={() => void openPath("https://www.instagram.com/nooktheblob/")}>@nooktheblob</TextButton>
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

      <Section title={tt("Mola hatırlatıcıları")}>
        <Row label={tt("Göz molası (20-20-20)")}>
          <Toggle on={s.eyeBreak} onChange={(v) => update({ eyeBreak: v })} />
        </Row>
        <Row label={tt("Su hatırlatıcısı")}>
          <Segmented id="settings-water" options={WATER} value={s.waterEvery} onChange={(v) => update({ waterEvery: v })} color={ACCENT.blue} />
        </Row>
        <p className="-mt-0.5 pb-1 text-[10px] text-label-3">{tt("Odak modundan bağımsız, her zaman çalışır. Oyunda ve tam ekranda susar.")}</p>
      </Section>

      <Section title={tt("Odak bekçisi")}>
        <Row label={tt("Pomodoro'da dikkat dağıtan siteye girince uyar")}>
          <Toggle on={s.focusGuard} onChange={(v) => update({ focusGuard: v })} color={ACCENT.red} />
        </Row>
        {s.focusGuard && (
          <Row label={tt("Siteler / uygulamalar (virgülle)")}>
            <TextInput
              value={s.focusSites.join(", ")}
              placeholder={tt("YouTube, X, Discord")}
              onChange={(v) => update({ focusSites: v.split(",").map((x) => x.trim()).filter(Boolean) })}
            />
          </Row>
        )}
      </Section>

      <AiSection />

      <ArgusSection />

      <Section title={tt("Davranış")}>
        <Row label={tt("Windows açılınca başlat")}>
          <Toggle on={s.autostart} onChange={(v) => update({ autostart: v })} />
        </Row>
        <Row label={tt("Oyunda / tam ekranda gizlen")}>
          <Toggle on={s.hideInFullscreen} onChange={(v) => update({ hideInFullscreen: v })} />
        </Row>
        <Row label={tt("Pilde / tasarrufta yavaşla")}>
          <Toggle on={s.powerSaver} onChange={(v) => update({ powerSaver: v })} />
        </Row>
        <Row label={tt("Hızlı arama kısayolu")}>
          <ShortcutInput value={s.shortcut} onChange={(v) => update({ shortcut: v })} />
        </Row>
        <Row label={tt("Ekrana sor kısayolu")}>
          <ShortcutInput value={s.askShortcut} onChange={(v) => update({ askShortcut: v })} />
        </Row>
        <Row label={tt("Sesli komut (basılı tut)")}>
          <ShortcutInput value={s.voiceShortcut} onChange={(v) => update({ voiceShortcut: v })} />
        </Row>
        <Row label={tt("Gizlilik kalkanı")}>
          <ShortcutInput value={s.shieldShortcut} onChange={(v) => update({ shieldShortcut: v })} />
        </Row>
        <Row label={tt("Hassas veri koruyucu (kart, IBAN, anahtar, şifre)")}>
          <Toggle on={s.sensitiveGuard} onChange={(v) => update({ sensitiveGuard: v })} />
        </Row>
        <Row label={tt("Ekran")}>
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
        <Row label={tt("Adanın yeri")}>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-label-3">{s.islandPos ? tt("Taşındı") : tt("Üst orta")}{" "}{tt("· üstteki ✥ ile sürükle")}</span>
            <TextButton disabled={!s.islandPos} onClick={() => update({ islandPos: null })}>{tt("Ortala")}</TextButton>
          </div>
        </Row>
      </Section>

      <Section title={tt("Bildirimler")}>
        <Row label={tt("Ses / parlaklık göstergesi")}>
          <Toggle on={s.osd} onChange={(v) => update({ osd: v })} />
        </Row>
        <Row label={tt("Olay kartları")}>
          <Toggle on={s.events} onChange={(v) => update({ events: v })} />
        </Row>
        <Row label={tt("Ekran görüntülerini rafa ekle")}>
          <Toggle on={s.autoScreenshots} onChange={(v) => update({ autoScreenshots: v })} />
        </Row>
        <Row label={tt("Windows bildirimlerini göster")}>
          <Toggle on={s.notifications} onChange={(v) => update({ notifications: v })} />
        </Row>
        <Row label={tt("Kopyalanan yabancı metni çevir")}>
          <Toggle on={s.translate} onChange={(v) => update({ translate: v })} />
        </Row>
        <Row label={tt("Günün ilk açılışında özet")}>
          <Toggle on={s.dailySummary} onChange={(v) => update({ dailySummary: v })} />
        </Row>
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
        <Row label={tt("Uzun süre yokken dönünce karşıla")}>
          <Segmented id="settings-welcome" options={WELCOME} value={s.welcomeBack} onChange={(v) => update({ welcomeBack: v })} color={ACCENT.pink} />
        </Row>
        <Row label={tt("Oyun açılınca özet")}>
          <Toggle on={s.gameIntro} onChange={(v) => update({ gameIntro: v })} />
        </Row>
        <Row label={tt("Oyundan çıkınca özet")}>
          <Toggle on={s.gameSummary} onChange={(v) => update({ gameSummary: v })} />
        </Row>
        <Row label={tt("Oyun molası hatırlat")}>
          <Segmented id="settings-game-break" options={GAME_BREAK} value={s.breakReminderMin} onChange={(v) => update({ breakReminderMin: v })} color={ACCENT.orange} />
        </Row>
        <Row label={tt("Sıkılınca oyun teklif etsin")}>
          <Toggle on={s.playOffers} onChange={(v) => update({ playOffers: v })} />
        </Row>
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
        <Row label={tt("Hava durumu")}>
          <Toggle on={s.weather} onChange={(v) => update({ weather: v })} />
        </Row>
        {s.weather && (
          <Row label={tt("Şehir")}>
            <TextInput value={s.weatherCity} placeholder={tt("Otomatik")} onChange={(v) => update({ weatherCity: v })} />
          </Row>
        )}
      </Section>
    </div>
  );
}

/** Argus (dizi/film arşivi) — yalnızca bu bilgisayarda varsa görünür. */
function ArgusSection() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const snap = useArgus((st) => st.snap);
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

/** Bölümler arası hızlı geçiş: üstte yapışık kalan ince sekme şeridi; kaydırdıkça bulunulan bölüm parlar */
const INDEX: { label: string; title: string }[] = [
  { label: "Nook", title: "Nook" },
  { label: tt("Erişilebilirlik"), title: tt("Erişilebilirlik") },
  { label: tt("Molalar"), title: tt("Mola hatırlatıcıları") },
  { label: tt("Bekçi"), title: tt("Odak bekçisi") },
  { label: tt("Yapay zekâ"), title: tt("Yapay zekâ") },
  { label: "Argus", title: "Argus" },
  { label: tt("Davranış"), title: tt("Davranış") },
  { label: tt("Bildirimler"), title: tt("Bildirimler") },
];

function SectionIndex({ scroller }: { scroller: React.RefObject<HTMLDivElement | null> }) {
  const [current, setCurrent] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const find = (title: string) => scroller.current?.querySelector<HTMLElement>(`section[data-sec^="${title}"]`) ?? null;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      const y = el.scrollTop + 44;
      let at = 0;
      INDEX.forEach((it, i) => {
        const sec = find(it.title);
        if (sec && sec.offsetTop <= y) at = i;
      });
      // En alta gelindiyse son bölüm
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) at = INDEX.length - 1;
      setCurrent(at);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scroller]);

  // Seçili sekme şeritte görünür kalsın
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>(`[data-i="${current}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);

  const go = (i: number) => {
    const sec = find(INDEX[i].title);
    if (sec && scroller.current) scroller.current.scrollTo({ top: sec.offsetTop - 36, behavior: "smooth" });
  };

  return (
    <div className="sticky top-0 z-10 -mb-1 bg-[#1c1c1f] pb-2" style={{ boxShadow: "0 8px 10px -6px #1c1c1f" }}>
      <div ref={strip} className="no-scrollbar flex gap-1 overflow-x-auto">
        {INDEX.map((it, i) => (
          <button
            key={it.label}
            data-i={i}
            onClick={() => go(i)}
            className={`relative shrink-0 rounded-full px-2.5 py-[3px] text-[10.5px] font-medium transition-colors ${i === current ? "text-label" : "text-label-3 hover:text-label-2"}`}
          >
            {i === current && <motion.span layoutId="set-idx" className="absolute inset-0 rounded-full bg-white/[0.09]" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
            <span className="relative">{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[30px] items-center justify-between gap-2 py-1">
      <span className="text-[12px] text-label">{label}</span>
      {children}
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

export function TextInput({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (v: string) => void }) {
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
      className="w-[130px] rounded-full bg-well px-2.5 py-0.5 text-right text-[11px] font-medium text-label outline-none placeholder:font-medium placeholder:text-label-3 focus:bg-well-hi"
    />
  );
}

const MODIFIERS: [keyof KeyboardEvent, string][] = [
  ["ctrlKey", "Ctrl"],
  ["altKey", "Alt"],
  ["shiftKey", "Shift"],
  ["metaKey", "Super"],
];

/** Tıkla, tuş kombinasyonuna bas — kaydedilir. En az bir değiştirici tuş gerekir. */
function ShortcutInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [recording, setRecording] = useState(false);

  const onKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (e.key === "Escape") return setRecording(false);
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
      {recording ? tt("Tuşlara bas…") : value.replace("Space", tt("Boşluk")).split("+").join(" + ")}
    </button>
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
