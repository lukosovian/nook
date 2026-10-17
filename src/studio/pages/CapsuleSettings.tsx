/**
 * Studio › Modüller › Kapalı ada: hangi işler adayı kapsüle çevirsin, kapsüllerin içinde neler
 * görünsün (kapak, sanatçı, dalga, saat, tarih…), bölünmüş ada ve baloncuk. Her kapsülün kartında kendi
 * canlı önizlemesi: ayarı değiştirince hemen orada görünür.
 */
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowDown, CalendarClock, Clock, Mic, Moon, Music, Target, Terminal, Timer, type LucideIcon } from "lucide-react";
import { useNook, type CapsuleCfg, type FocusState, type NowPlaying } from "../../store/nook";
import { capsuleShape, ClaudeCapsule, FocusCapsule, InfoCapsule, MusicCapsule, SleepCapsule, type CapsuleKind } from "../../components/overlays/Capsules";
import { Mini } from "../../components/overlays/TimeMini";
import { DownloadMini } from "../../components/overlays/DownloadMini";
import { ListenMini } from "../../components/overlays/ListenMini";
import { NookFigure } from "../../components/mascot/Figure";
import { normalizeColor, normalizeLook } from "../../lib/look";
import { CLAUDE_COLOR } from "../../lib/claude";
import { ACCENT, tintBg, tintText, Toggle } from "../../components/ui/primitives";
import { tt } from "../../lib/i18n";
import { Panel } from "../ui";

type Part = { key: keyof CapsuleCfg; label: string };
interface KindDef {
  kind: CapsuleKind;
  icon: LucideIcon;
  color: string;
  label: string;
  hint: string;
  parts?: Part[];
}

const KINDS: KindDef[] = [
  { kind: "music", icon: Music, color: ACCENT.pink, label: tt("Müzik"), hint: tt("Şarkı çalarken dönen plak ve şarkı adı"), parts: [
    { key: "musicCover", label: tt("Kapak") },
    { key: "musicTitle", label: tt("Şarkı adı") },
    { key: "musicArtist", label: tt("Sanatçı") },
    { key: "musicWave", label: tt("Dalga") },
  ] },
  { kind: "focus", icon: Target, color: ACCENT.red, label: "Pomodoro", hint: tt("Odaklanırken kalan süre"), parts: [
    { key: "focusPercent", label: tt("Yüzde") },
    { key: "focusBar", label: tt("İlerleme çizgisi") },
  ] },
  { kind: "claude", icon: Terminal, color: CLAUDE_COLOR, label: "Claude Code", hint: tt("Claude çalışırken proje ve yaptığı iş"), parts: [{ key: "claudeAction", label: tt("Yaptığı iş") }] },
  { kind: "event", icon: CalendarClock, color: ACCENT.yellow, label: tt("Yaklaşan etkinlik"), hint: tt("Takvimdeki etkinliğe az kalınca geri sayım") },
  { kind: "watch", icon: Timer, color: ACCENT.purple, label: tt("Kronometre"), hint: tt("Kronometre çalışırken geçen süre") },
  { kind: "download", icon: ArrowDown, color: ACCENT.blue, label: tt("İndirme"), hint: tt("Dosya inerken ilerlemesi") },
  { kind: "listen", icon: Mic, color: ACCENT.orange, label: tt("Dinliyor"), hint: tt("Hey Nook ya da Hum seni dinlerken") },
  { kind: "sleep", icon: Moon, color: ACCENT.purple, label: tt("Uyku"), hint: tt("Nook uyurken süzülen z'ler") },
];

const INFO_PARTS: Part[] = [
  { key: "infoClock", label: tt("Saat") },
  { key: "infoSeconds", label: tt("Saniye") },
  { key: "infoWeather", label: tt("Hava") },
  { key: "infoDate", label: tt("Tarih") },
];

/** Önizlemelerdeki örnekler (kapak yok: plak renkli döner) */
const MOCK_MEDIA = { title: "Blinding Lights", artist: "The Weeknd", playing: true } as unknown as NowPlaying;
const MOCK_CLAUDE = { project: "Nook", action: tt("Studio'yu düzenliyor") };

export function CapsuleSettings() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const cfg = s.capsule;
  const set = (patch: Partial<CapsuleCfg>) => update({ capsule: { ...useNook.getState().settings.capsule, ...patch } });
  const toggleKind = (k: CapsuleKind, on: boolean) => set({ off: on ? cfg.off.filter((x) => x !== k) : [...cfg.off, k] });

  return (
    <Panel title={tt("Kapalı ada")} hint={tt("Ada kapalıyken hangi işler kapsüle dönüşsün, içlerinde neler görünsün")}>
      <div className="divide-y divide-white/[0.05]">
        <Row label={tt("Bölünmüş ada")} hint={tt("İki iş aynı anda sürerken (müzik ve Pomodoro gibi) ikincisi yanda küçük bir baloncukta")}>
          <Toggle on={cfg.split} onChange={(v) => set({ split: v })} color={ACCENT.green} />
        </Row>
        <Row label={tt("Baloncuk açar")} hint={tt("Baloncuğun üstüne gelince ada o işin bölümüyle açılır")} dim={!cfg.split}>
          <Toggle on={cfg.bubbleOpens} onChange={(v) => set({ bubbleOpens: v })} color={ACCENT.green} />
        </Row>
        <Row label={tt("Gezintiler")} hint={tt("Pencereye tüneme, iple sarkma, gündüz balık, gece kamp ateşi")}>
          <Toggle on={s.outings} onChange={(v) => update({ outings: v })} color={ACCENT.green} />
        </Row>
      </div>

      <h3 className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-[0.1em] text-label-3">{tt("Kapsüller")}</h3>
      <div className="grid grid-cols-2 gap-3">
        {/* Boştayken saat/hava: kendi açma kapama ayarı (collapsedInfo) */}
        <KindCard
          def={{ kind: "info", icon: Clock, color: ACCENT.green, label: tt("Saat ve hava"), hint: tt("Boştayken Nook'un yanında"), parts: INFO_PARTS }}
          on={s.collapsedInfo ?? true}
          onToggle={(v) => update({ collapsedInfo: v })}
          cfg={cfg}
          set={set}
        />
        {KINDS.map((d) => (
          <KindCard key={d.kind} def={d} on={!cfg.off.includes(d.kind)} onToggle={(v) => toggleKind(d.kind, v)} cfg={cfg} set={set} />
        ))}
      </div>
    </Panel>
  );
}

/** Kapsülün içi, örnek verilerle (Studio'da gerçek müzik/odak/Claude olmasa da görünsün) */
function Body({ kind }: { kind: CapsuleKind }) {
  // Odak: 25 dakikanın 11'i geçmiş
  const [focus] = useState<FocusState>(() => ({ phase: "work", endsAt: Date.now() + 14 * 60_000, left: 0, total: 25 * 60_000, round: 2 }));
  switch (kind) {
    case "music":
      return <MusicCapsule media={MOCK_MEDIA} />;
    case "info":
      return <InfoCapsule />;
    case "focus":
      return <FocusCapsule demo={focus} />;
    case "claude":
      return <ClaudeCapsule demo={MOCK_CLAUDE} />;
    case "event":
      return <Mini p={0.6} color={ACCENT.blue} icon={CalendarClock} text={tt("{0} dk", 12)} />;
    case "watch":
      return <Mini p={0.35} color={ACCENT.purple} icon={Timer} text="04:21" />;
    case "download":
      return <DownloadMini demo="8,4 MB/s" />;
    case "listen":
      return <ListenMini demo />;
    case "sleep":
      return <SleepCapsule />;
    default:
      return null;
  }
}

/** Kapalı adanın birebir kopyası: siyah çentik, içinde Nook ve kapsül. Kapsül kapalıysa düz kapalı ada. */
function Preview({ kind, off }: { kind: CapsuleKind; off: boolean }) {
  const cfg = useNook((s) => s.settings.capsule);
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  const shape = off ? { width: 128, height: 34, nook: { x: 64, scale: 1 } } : capsuleShape(kind, cfg);
  return (
    <div className="relative flex h-[66px] justify-center overflow-hidden rounded-[12px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.07),transparent_75%)]">
      {/* Ekranın üst kenarı */}
      <span className="absolute inset-x-0 top-0 h-px bg-white/[0.08]" />
      <motion.div
        className="relative overflow-hidden bg-black shadow-[0_10px_26px_-8px_rgba(0,0,0,0.95)]"
        initial={false}
        animate={{ width: shape.width, height: shape.height, borderBottomLeftRadius: shape.height * 0.45, borderBottomRightRadius: shape.height * 0.45 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
      >
        {shape.nook && (
          <motion.div className="absolute top-1/2 -translate-y-1/2" initial={false} animate={{ left: shape.nook.x - 12 * shape.nook.scale }} transition={{ type: "spring", stiffness: 420, damping: 32 }}>
            <NookFigure look={look} color={color} size={Math.round(24 * shape.nook.scale)} expression={kind === "sleep" && !off ? "sleepy" : "idle"} />
          </motion.div>
        )}
        {!off && <Body kind={kind} />}
      </motion.div>
      {off && <span className="absolute bottom-1.5 text-[10px] font-medium text-label-3">{tt("Kapalı: ada olduğu gibi kalır")}</span>}
    </div>
  );
}

function KindCard({ def, on, onToggle, cfg, set }: { def: KindDef; on: boolean; onToggle: (v: boolean) => void; cfg: CapsuleCfg; set: (p: Partial<CapsuleCfg>) => void }) {
  const Icon = def.icon;
  return (
    <div
      className="flex flex-col gap-2.5 rounded-[18px] border p-3 transition-colors"
      style={{ background: on ? `linear-gradient(160deg, ${tintBg(def.color, 10)}, ${tintBg(def.color, 3)})` : "rgb(255 255 255 / 0.02)", borderColor: on ? tintBg(def.color, 28) : "rgb(255 255 255 / 0.06)" }}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]" style={{ background: tintBg(def.color, on ? 20 : 8), color: on ? tintText(def.color) : "var(--color-label-3)" }}>
          <Icon size={15} strokeWidth={2.4} />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className={`block truncate text-[13px] font-semibold ${on ? "text-label" : "text-label-2"}`}>{def.label}</span>
          <span className="block truncate text-[11px] text-label-3" title={def.hint}>
            {def.hint}
          </span>
        </span>
        <Toggle on={on} onChange={onToggle} color={def.color} />
      </div>
      <Preview kind={def.kind} off={!on} />
      {def.parts && (
        <div className="flex flex-wrap gap-1.5">
          {def.parts.map((p) => {
            const v = cfg[p.key] as boolean;
            // Saniye yalnızca saat açıkken anlamlı
            const disabled = !on || (p.key === "infoSeconds" && !cfg.infoClock);
            return (
              <button
                key={p.key}
                disabled={disabled}
                onClick={() => set({ [p.key]: !v } as Partial<CapsuleCfg>)}
                className="rounded-full border px-2.5 py-[3px] text-[11px] font-semibold transition-colors disabled:opacity-40"
                style={v ? { background: tintBg(def.color, 20), borderColor: tintBg(def.color, 45), color: tintText(def.color) } : { background: "transparent", borderColor: "rgb(255 255 255 / 0.1)", color: "var(--color-label-3)" }}
              >
                {v ? "✓ " : ""}
                {p.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, hint, dim, children }: { label: string; hint?: string; dim?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3" style={{ opacity: dim ? 0.45 : 1 }}>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-label">{label}</span>
        {hint && <span className="block text-[11.5px] text-label-3">{hint}</span>}
      </span>
      {children}
    </div>
  );
}
