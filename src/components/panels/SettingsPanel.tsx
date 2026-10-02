import { useEffect, useState } from "react";
import { Eye, EyeOff, Play, X } from "lucide-react";
import { useGemini } from "../../hooks/useGemini";
import { alarmRing, listMonitors, type MonitorInfo } from "../../lib/bridge";
import { startTour } from "../../lib/tour";
import { checkUpdate, installUpdate, useUpdate } from "../../lib/update";
import { installArgus, openArgus, useArgus } from "../../lib/argus";
import { SULK_BELOW, useNook, type Settings } from "../../store/nook";
import { ACCENT, Bar, MiniNook, Segmented, TextButton, Toggle } from "../ui/primitives";

const MONITOR_MODES: { id: Settings["monitorMode"]; label: string }[] = [
  { id: "primary", label: "Ana" },
  { id: "follow", label: "İmleç" },
  { id: "all", label: "Tümü" },
  { id: "fixed", label: "Seçili" },
];

const SLEEP: { id: number; label: string }[] = [
  { id: 30, label: "30 sn" },
  { id: 90, label: "1,5 dk" },
  { id: 300, label: "5 dk" },
  { id: 0, label: "Hiç" },
];

const WATER: { id: number; label: string }[] = [
  { id: 0, label: "Yok" },
  { id: 45, label: "45 dk" },
  { id: 60, label: "1 sa" },
  { id: 90, label: "90 dk" },
];

const COLORS = ["#FFFFFF", "#BFF5DC", "#FFD6BA", "#D9CCFF", "#FFF1A8", "#BDE3FF"];

export function SettingsPanel() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  useEffect(() => void listMonitors().then(setMonitors), []);

  return (
    <div className="h-full space-y-3 overflow-y-auto pr-1.5">
      <Section title="Nook">
        <Affection />
        <Row label="Rengi">
          <div className="flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => update({ faceColor: c })}
                aria-label={c}
                className="h-4 w-4 rounded-full transition-transform hover:scale-110"
                style={{
                  background: `radial-gradient(circle at 35% 30%, #fff 0%, ${c} 45%, color-mix(in srgb, ${c} 62%, #5d5d6b) 100%)`,
                  boxShadow: s.faceColor === c ? `0 0 0 1.5px #000, 0 0 0 3px ${ACCENT.teal}` : undefined,
                }}
              />
            ))}
          </div>
        </Row>
        <Row label="Uyuma süresi">
          <Segmented id="sleep" options={SLEEP} value={s.sleepAfterSec} onChange={(v) => update({ sleepAfterSec: v })} />
        </Row>
        <Row label="Nook nedir? Nasıl kullanılır?">
          <TextButton onClick={() => void startTour()}>Tanıtımı aç</TextButton>
        </Row>
        <UpdateRow />
      </Section>

      <Section title="Mola hatırlatıcıları">
        <Row label="Göz molası (20-20-20)">
          <Toggle on={s.eyeBreak} onChange={(v) => update({ eyeBreak: v })} />
        </Row>
        <Row label="Su hatırlatıcısı">
          <Segmented id="settings-water" options={WATER} value={s.waterEvery} onChange={(v) => update({ waterEvery: v })} color={ACCENT.blue} />
        </Row>
        <p className="-mt-0.5 pb-1 text-[10px] text-label-3">Odak modundan bağımsız, her zaman çalışır. Oyunda ve tam ekranda susar.</p>
      </Section>

      <AiSection />

      <ArgusSection />

      <Section title="Davranış">
        <Row label="Windows açılınca başlat">
          <Toggle on={s.autostart} onChange={(v) => update({ autostart: v })} />
        </Row>
        <Row label="Oyunda / tam ekranda gizlen">
          <Toggle on={s.hideInFullscreen} onChange={(v) => update({ hideInFullscreen: v })} />
        </Row>
        <Row label="Hızlı arama kısayolu">
          <ShortcutInput value={s.shortcut} onChange={(v) => update({ shortcut: v })} />
        </Row>
        <Row label="Ekrana sor kısayolu">
          <ShortcutInput value={s.askShortcut} onChange={(v) => update({ askShortcut: v })} />
        </Row>
        <Row label="Sesli komut (basılı tut)">
          <ShortcutInput value={s.voiceShortcut} onChange={(v) => update({ voiceShortcut: v })} />
        </Row>
        <Row label="Ekran">
          <Segmented id="monitor" options={MONITOR_MODES} value={s.monitorMode} onChange={(v) => update({ monitorMode: v })} color={ACCENT.blue} />
        </Row>
        {s.monitorMode === "fixed" && (
          <Row label="Hangi ekran">
            <select
              value={s.monitorName ?? ""}
              onChange={(e) => update({ monitorName: e.target.value || null })}
              className="max-w-[150px] rounded-full bg-well px-2 py-0.5 text-[11px] font-medium text-label outline-none"
            >
              <option value="" className="bg-neutral-900">Ana ekran</option>
              {monitors.map((m, i) => (
                <option key={m.name + i} value={m.name} className="bg-neutral-900">
                  {i + 1}. ekran · {m.width}×{m.height}
                </option>
              ))}
            </select>
          </Row>
        )}
      </Section>

      <Section title="Bildirimler">
        <Row label="Ses / parlaklık göstergesi">
          <Toggle on={s.osd} onChange={(v) => update({ osd: v })} />
        </Row>
        <Row label="Olay kartları">
          <Toggle on={s.events} onChange={(v) => update({ events: v })} />
        </Row>
        <Row label="Ekran görüntülerini rafa ekle">
          <Toggle on={s.autoScreenshots} onChange={(v) => update({ autoScreenshots: v })} />
        </Row>
        <Row label="Windows bildirimlerini göster">
          <Toggle on={s.notifications} onChange={(v) => update({ notifications: v })} />
        </Row>
        <Row label="Kopyalanan yabancı metni çevir">
          <Toggle on={s.translate} onChange={(v) => update({ translate: v })} />
        </Row>
        <Row label="Günün ilk açılışında özet">
          <Toggle on={s.dailySummary} onChange={(v) => update({ dailySummary: v })} />
        </Row>
        <Row label="Oyundan çıkınca özet">
          <Toggle on={s.gameSummary} onChange={(v) => update({ gameSummary: v })} />
        </Row>
        <Row label="Sıkılınca oyun teklif etsin">
          <Toggle on={s.playOffers} onChange={(v) => update({ playOffers: v })} />
        </Row>
        <Row label="Alarm sesi">
          <div className="flex items-center gap-1">
            <select
              value={s.alarmSound}
              onChange={(e) => update({ alarmSound: Number(e.target.value) })}
              className="rounded-full bg-well px-2 py-0.5 text-[11px] font-medium text-label outline-none"
            >
              <option value={0} className="bg-neutral-900">
                Sessiz
              </option>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i} value={i + 1} className="bg-neutral-900">
                  Alarm {i + 1}
                </option>
              ))}
            </select>
            <button
              disabled={s.alarmSound === 0}
              onClick={() => void alarmRing(true, s.alarmSound, true)}
              title="Dinle"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-well text-label-2 hover:bg-well-hi hover:text-label"
            >
              <Play size={9} strokeWidth={3} fill="currentColor" />
            </button>
          </div>
        </Row>
        <Row label="Hava durumu">
          <Toggle on={s.weather} onChange={(v) => update({ weather: v })} />
        </Row>
        {s.weather && (
          <Row label="Şehir">
            <TextInput value={s.weatherCity} placeholder="Otomatik" onChange={(v) => update({ weatherCity: v })} />
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
        <Row label="Dizi/film arşivi: Argus">
          <TextButton onClick={() => void installArgus()}>Kur</TextButton>
        </Row>
        <p className="-mt-0.5 pb-1 text-[10px] text-label-3">Nook'un kardeşi. Kurarsan yeni bölümleri haber veririm, ne izleyeceğini seçerim.</p>
      </Section>
    );
  return (
    <Section title="Argus">
      <Row label="Profil">
        <select
          value={s.argusProfile && snap.profiles.includes(s.argusProfile) ? s.argusProfile : ""}
          onChange={(e) => update({ argusProfile: e.target.value })}
          className="rounded-full bg-well px-2 py-0.5 text-[11px] font-medium text-label outline-none"
        >
          <option value="" className="bg-neutral-900">
            Otomatik ({snap.profile})
          </option>
          {snap.profiles.map((p) => (
            <option key={p} value={p} className="bg-neutral-900">
              {p}
            </option>
          ))}
        </select>
      </Row>
      <Row label="Yeni bölüm haberleri">
        <Toggle on={s.argusNews} onChange={(v) => update({ argusNews: v })} color={ACCENT.orange} />
      </Row>
      <Row label="İzlediğimi fark et, işaretlemeyi sor">
        <Toggle on={s.argusDetect} onChange={(v) => update({ argusDetect: v })} color={ACCENT.orange} />
      </Row>
      <Row label={snap.running ? "Argus açık" : "Argus kapalı"}>
        <TextButton onClick={() => void openArgus()}>Argus'u aç</TextButton>
      </Row>
      <p className="-mt-0.5 pb-1 text-[10px] text-label-3">Argus kapalıyken de işaretleyebilirsin; Nook onu arka planda kısa süreliğine açıp kapatır.</p>
    </Section>
  );
}

/** Sürüm ve güncelleme: yeni sürüm varsa tek tıkla indirip kurar. */
function UpdateRow() {
  const { current, available, progress, status } = useUpdate();
  return (
    <Row label={current ? `Sürüm ${current}` : "Sürüm"}>
      {progress !== null ? (
        <span className="text-[11px] font-medium tabular-nums" style={{ color: ACCENT.green }}>
          İndiriliyor %{progress}
        </span>
      ) : available ? (
        <TextButton onClick={() => void installUpdate()}>
          <span style={{ color: ACCENT.green }}>{available} sürümüne güncelle</span>
        </TextButton>
      ) : (
        <div className="flex items-center gap-1">
          {status && <span className="text-[10.5px] text-label-3">{status}</span>}
          <TextButton onClick={() => void checkUpdate(true)}>Denetle</TextButton>
        </div>
      )}
    </Row>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-label-3">{title}</h3>
      <div className="divide-y divide-white/[0.05]">{children}</div>
    </section>
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
  const mood = sulky ? "Küs" : affection < 50 ? "Durgun" : affection < 80 ? "Mutlu" : "Çok seviyor";
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <MiniNook color={color} size={22} eyes={sulky ? "closed" : affection >= 80 ? "happy" : "open"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="text-label">Keyfi</span>
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
      {recording ? "Tuşlara bas…" : value.replace("Space", "Boşluk").split("+").join(" + ")}
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
    <Section title="Yapay zekâ (Gemini)">
      <Row label="API anahtarı">
        <KeyInput value={s.geminiKey} onChange={(v) => update({ geminiKey: v })} />
      </Row>
      <p className="-mt-1 pb-1 text-[10px]" style={{ color: gemini.status === "ok" ? ACCENT.green : gemini.status === "error" ? ACCENT.red : "var(--color-label-3)" }}>
        {gemini.status === "ok"
          ? `Bağlandı · ${gemini.models.length} model açık`
          : gemini.status === "error"
            ? gemini.error
            : gemini.status === "checking"
              ? "Kontrol ediliyor…"
              : "aistudio.google.com → Get API key. Anahtar yalnızca bu bilgisayarda saklanır."}
      </p>
      {gemini.status === "ok" && (
        <Row label="Model">
          <select
            value={s.aiModel}
            onChange={(e) => update({ aiModel: e.target.value })}
            className="max-w-[170px] rounded-full bg-well px-2 py-0.5 text-[11px] font-medium text-label outline-none"
          >
            {gemini.models.map((m) => (
              <option key={m.id} value={m.id} className="bg-neutral-900">
                {m.label}
              </option>
            ))}
          </select>
        </Row>
      )}
      <Row label="Adın">
        <TextInput value={s.userName} placeholder="Nook sana nasıl hitap etsin?" onChange={(v) => update({ userName: v })} />
      </Row>
      <div className="py-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-label">Hatırladıkları</span>
          {chatCount > 0 && (
            <TextButton tone="danger" onClick={() => useNook.getState().clearChat()}>
              Sohbeti temizle
            </TextButton>
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
                  aria-label="Unut"
                >
                  <X size={9} strokeWidth={2.8} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-0.5 text-[10.5px] text-label-3">Sohbette "şunu hatırla…" dersen burada görünür.</p>
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
        placeholder="AIza…"
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
        title={show ? "Gizle" : "Göster"}
        className="flex h-5 w-5 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label"
      >
        {show ? <EyeOff size={11} /> : <Eye size={11} />}
      </button>
    </div>
  );
}
