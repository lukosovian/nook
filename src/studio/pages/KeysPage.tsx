/**
 * Studio › Kısayollar, iki sekme:
 * - Tuşlar: Stream Deck gibi. Solda tuşların (seç, sırala), sağda seçili tuşun düzenleyicisi: adı, simgesi,
 *   rengi, ana sayfada görünüp görünmeyeceği ve adımları. Uygulama tuşları da burada, kendi simgeleriyle.
 * - Otomasyonlar: "bu olunca şunu yap" (lib/automations). Solda liste, hazır örnekler ve son çalışanlar;
 *   sağda tetikleyici, koşullar, "önce sor" ve adımlar.
 * Tuşa klavye kısayolu atanabilir; tuşlar ve otomasyonlar adlarıyla sesle de çalışır ("Hey Nook, gece modu").
 */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, AppWindow, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Globe, Keyboard, Mic, Play, Plus, RotateCcw, Search, Trash2, Wand2, X, Zap } from "lucide-react";
import { fileIcon, listApps, type AppEntry, type QuickState } from "../../lib/bridge";
import {
  ACTIONS,
  actionOf,
  appPathOf,
  DECK_COLORS,
  DECK_ICONS,
  DEFAULT_DECK,
  getDeck,
  isDangerous,
  keyVisual,
  nextQuick,
  quickLit,
  resetDeck,
  runKey,
  stepLabel,
  useDeck,
  useQuickState,
  type DeckKey,
  type DeckStep,
} from "../../lib/deck";
import {
  autoSafe,
  CONDITIONS,
  conditionId,
  conditionLabel,
  getAutomations,
  runAutomationNow,
  saveAutomations,
  TEMPLATES,
  triggerLabel,
  triggerMeta,
  TRIGGERS,
  triggerId,
  WEEK,
  type Automation,
  type AutoRun,
  type Condition,
  type Trigger,
} from "../../lib/automations";
import { conflictOf, hotkeyTaken, useInstalledApps } from "../../lib/shortcuts";
import { ShortcutInput } from "../../components/panels/SettingsPanel";
import { useNook } from "../../store/nook";
import { ACCENT, Segmented, tintBg, tintText, Toggle } from "../../components/ui/primitives";
import { tt } from "../../lib/i18n";
import { studioGo } from "../../lib/studio";
import { Btn, Page, PageHeader, Panel } from "../ui";

let appsCache: Promise<AppEntry[]> | undefined;

const save = (deck: DeckKey[]) => useNook.getState().setDeck(deck);

const TABS = [
  { id: "keys" as const, label: tt("Tuşlar") },
  { id: "auto" as const, label: tt("Otomasyonlar") },
];

export function KeysPage({ arg }: { arg: string | null }) {
  const tab = arg === "auto" ? "auto" : "keys";
  return tab === "auto" ? <AutoTab /> : <KeysTab />;
}

function Tabs({ tab }: { tab: "keys" | "auto" }) {
  return <Segmented id="keys-tab" options={TABS} value={tab} onChange={(t) => studioGo("keys", t === "auto" ? "auto" : null)} color={ACCENT.blue} />;
}

// ---------------------------------------------------------------- Tuşlar

function KeysTab() {
  const deck = useDeck();
  const quick = useQuickState();
  const [sel, setSel] = useState<string | null>(deck[0]?.id ?? null);
  const key = deck.find((k) => k.id === sel) ?? null;
  const patch = (p: Partial<DeckKey>) => key && save(getDeck().map((k) => (k.id === key.id ? { ...k, ...p } : k)));

  const add = () => {
    const k: DeckKey = {
      id: crypto.randomUUID(),
      label: tt("Yeni tuş"),
      icon: "bolt",
      color: DECK_COLORS[(getDeck().length * 3) % DECK_COLORS.length],
      steps: [],
    };
    save([...getDeck(), k]);
    setSel(k.id);
  };
  const move = (d: number) => {
    if (!key) return;
    const list = [...getDeck()];
    const i = list.findIndex((k) => k.id === key.id);
    const j = Math.max(0, Math.min(list.length - 1, i + d));
    [list[i], list[j]] = [list[j], list[i]];
    save(list);
  };
  // Boş yeni tuşa ilk adım olarak uygulama ya da hazır eylem eklenince tuş onun adını ve simgesini alır
  const setSteps = (steps: DeckStep[]) => {
    if (!key) return;
    const first = steps[0];
    if (!key.steps.length && steps.length === 1 && key.icon === "bolt" && key.label === tt("Yeni tuş")) {
      if (first.kind === "open") {
        return patch({ steps, label: first.name.slice(0, 22), icon: /^https?:/i.test(first.path) ? "web" : "app" });
      }
      const act = actionOf(first);
      if (act) {
        return patch({ steps, label: act.label.slice(0, 22), icon: act.icon, color: act.color });
      }
    }
    patch({ steps });
  };
  const restore = () => {
    resetDeck();
    setSel(DEFAULT_DECK[0].id);
  };

  return (
    <Page wide>
      <PageHeader
        icon={Keyboard}
        color={ACCENT.blue}
        title={tt("Kısayollar")}
        subtitle={tt("Tek basışta çalışan kısayol tuşların")}
        actions={
          <>
            <Tabs tab="keys" />
            <Btn color={ACCENT.blue} onClick={add}>
              <Plus size={14} /> {tt("Yeni tuş")}
            </Btn>
          </>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)_330px] gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Tuşlar */}
        <Panel
          title={tt("Tuşların")}
          hint={tt("Seç, sağda düzenle")}
          right={
            <Btn color={ACCENT.gray} ghost onClick={restore}>
              <RotateCcw size={13} /> {tt("Varsayılanlara dön")}
            </Btn>
          }
        >
          <div className="grid grid-cols-3 gap-2.5 xl:grid-cols-5 xl:gap-3">
            <AnimatePresence initial={false}>
              {deck.map((k) => (
                <BigKey key={k.id} k={k} on={k.id === sel} quick={quick} onClick={() => setSel(k.id)} />
              ))}
            </AnimatePresence>
            <button onClick={add} className="flex h-[92px] flex-col items-center justify-center gap-1 rounded-[18px] border border-dashed border-white/[0.12] text-label-3 hover:border-white/25 hover:text-label-2">
              <Plus size={20} />
              <span className="text-[11px] font-semibold">{tt("Tuş ekle")}</span>
            </button>
          </div>
          {!deck.length && (
            <div className="mt-4 flex items-center gap-3 rounded-[14px] border px-4 py-3" style={{ background: tintBg(ACCENT.blue, 8), borderColor: tintBg(ACCENT.blue, 28) }}>
              <p className="min-w-0 flex-1 text-[12.5px] text-label-2">{tt("Hiç tuş kalmadı. Mikrofon, Ses, Masaüstü ve Kilitle tuşlarını geri getirebilirsin.")}</p>
              <Btn color={ACCENT.blue} onClick={restore}>
                <RotateCcw size={13} /> {tt("Varsayılanları geri getir")}
              </Btn>
            </div>
          )}
          <p className="mt-4 text-[11.5px] leading-relaxed text-label-3">
            {tt("Kapat, yeniden başlat ve uyku tuşları yanlışlıkla basılmasın diye ikinci basışta çalışır. Mikrofon ve ses tuşları açık/kapalı olduğunu simgesiyle ve ışığıyla gösterir. “Ana sayfada göster” dediğin tuşlar adanın ana sayfasında, alt sırada da durur.")}
          </p>
        </Panel>

        {/* Düzenleyici */}
        <Panel title={key ? tt("Tuşu düzenle") : tt("Bir tuş seç")} right={key && <KeyTest k={key} />}>
          {key ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  value={key.label}
                  maxLength={22}
                  onChange={(e) => patch({ label: e.target.value })}
                  className="h-10 min-w-0 flex-1 rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-3 text-[14px] font-semibold text-label outline-none focus:border-white/25"
                />
                <IconBtn label={tt("Sola al")} onClick={() => move(-1)}>
                  <ArrowLeft size={14} />
                </IconBtn>
                <IconBtn label={tt("Sağa al")} onClick={() => move(1)}>
                  <ArrowRight size={14} />
                </IconBtn>
                <IconBtn
                  label={tt("Tuşu sil")}
                  danger
                  onClick={() => {
                    save(getDeck().filter((k) => k.id !== key.id));
                    setSel(getDeck()[0]?.id ?? null);
                  }}
                >
                  <Trash2 size={14} />
                </IconBtn>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold text-label">{tt("Ana sayfada göster")}</span>
                  <span className="block text-[11px] text-label-3">{tt("Adayı açınca alt sırada, tek tıkla çalışır")}</span>
                </span>
                <Toggle on={!!key.home} onChange={(v) => patch({ home: v })} color={ACCENT.blue} />
              </label>

              <HotkeyRow k={key} onChange={(hotkey) => patch({ hotkey: hotkey || undefined })} />
              <VoiceHint label={key.label} />

              {!appPathOf(key) && (
                <>
                  <div>
                    <Label>{tt("Simge")}</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(DECK_ICONS).map(([id, Icon]) => (
                        <button
                          key={id}
                          onClick={() => patch({ icon: id })}
                          className="flex h-9 w-9 items-center justify-center rounded-[10px] border"
                          style={key.icon === id ? { background: tintBg(key.color, 22), borderColor: tintBg(key.color, 55), color: tintText(key.color) } : { background: "rgb(255 255 255 / 0.03)", borderColor: "rgb(255 255 255 / 0.06)", color: "var(--color-label-2)" }}
                        >
                          <Icon size={15} strokeWidth={2.3} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>{tt("Renk")}</Label>
                    <div className="flex gap-2">
                      {DECK_COLORS.map((c) => (
                        <button key={c} onClick={() => patch({ color: c })} className="h-7 w-7 rounded-full transition-transform hover:scale-110" style={{ background: c, boxShadow: key.color === c ? `0 0 0 2px #111, 0 0 0 4px ${c}` : undefined }} aria-label={c} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label>{key.steps.length > 1 ? tt("Ne yapsın ({0} adım, sırayla)", key.steps.length) : tt("Ne yapsın")}</Label>
                <Steps steps={key.steps} onChange={setSteps} />
              </div>
            </div>
          ) : (
            <p className="text-[12.5px] text-label-3">{tt("Soldan bir tuş seç ya da yeni tuş ekle")}</p>
          )}
        </Panel>
      </div>
    </Page>
  );
}

/** Tuşun klavye kısayolu: her yerden basınca tuş çalışır. Nook'un kendi kısayoluyla, başka bir tuşla ya da bilinen bir programla çakışırsa uyarır. */
function HotkeyRow({ k, onChange }: { k: DeckKey; onChange: (v: string) => void }) {
  const settings = useNook((s) => s.settings);
  const deck = useDeck();
  const apps = useInstalledApps();
  const combo = k.hotkey ?? "";
  const taken = hotkeyTaken(combo, settings, deck, k.id);
  const clash = taken ? tt("“{0}” da bu tuşları kullanıyor; bu kısayol çalışmaz", taken) : conflictOf(combo, apps) ? tt("Bu tuşlar başka bir programda: {0}", conflictOf(combo, apps)!) : null;
  return (
    <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-semibold text-label">{tt("Klavye kısayolu")}</span>
          <span className="block text-[11px] text-label-3">{tt("Her yerden, ada kapalıyken de çalışır")}</span>
        </span>
        <ShortcutInput value={combo} onChange={onChange} clearable />
      </div>
      {clash && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px]" style={{ color: tintText(ACCENT.orange) }}>
          <AlertTriangle size={12} className="shrink-0" /> {clash}
        </p>
      )}
    </div>
  );
}

/** Sesli komutla çalıştırma ipucu: "Hey Nook, gece modu" */
function VoiceHint({ label }: { label: string }) {
  if (label.trim().length < 3) return null;
  return (
    <p className="flex items-center gap-1.5 px-1 text-[11px] text-label-3">
      <Mic size={12} className="shrink-0" />
      {tt("Sesle de çalışır: “Hey Nook, {0}”", label.trim().toLocaleLowerCase("tr"))}
    </p>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-label-3">{children}</p>;
}

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} className={`flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/[0.08] bg-white/[0.04] ${danger ? "text-red/90 hover:bg-red/15" : "text-label-2 hover:bg-white/[0.08] hover:text-label"}`}>
      {children}
    </button>
  );
}

/** Büyük basılabilir tuş (seçiliyse renginde çerçeveli); uygulama tuşu kendi simgesiyle, mikrofon/ses kapalıysa üstü çizili */
function BigKey({ k, on, quick, onClick }: { k: DeckKey; on: boolean; quick: QuickState | null; onClick: () => void }) {
  const { Icon, color: visColor, lit, muted } = keyVisual(k, quick);
  const path = appPathOf(k);
  const icon = useAppIcon(path);
  const color = path ? ACCENT.blue : visColor;
  const isQuickToggle = k.steps.length === 1 && k.steps[0].kind === "quick";
  const litColor = lit === "off" ? ACCENT.red : lit === "on" ? k.color : isQuickToggle ? "rgb(255 255 255 / 0.16)" : null;
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative flex h-[92px] flex-col items-center justify-center gap-2 rounded-[18px] border px-2"
      style={
        path
          ? { background: on ? tintBg(color, 12) : "rgb(255 255 255 / 0.035)", borderColor: on ? tintBg(color, 60) : "rgb(255 255 255 / 0.065)", boxShadow: on ? `0 0 0 1px ${tintBg(color, 50)}` : undefined }
          : {
              background: `linear-gradient(150deg, ${tintBg(color, on ? 22 : 13)} 0%, ${tintBg(color, on ? 6 : 3)} 100%)`,
              borderColor: tintBg(color, on ? 60 : 26),
              boxShadow: on ? `0 0 0 1px ${tintBg(color, 50)}, 0 12px 28px -14px ${color}` : undefined,
            }
      }
    >
      {litColor && k.steps.length <= 1 && (
        <span
          className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full"
          style={{ background: litColor, boxShadow: lit ? `0 0 6px ${litColor}` : undefined }}
        />
      )}
      <span className="flex h-10 w-10 items-center justify-center rounded-[13px]" style={path ? { background: "rgb(255 255 255 / 0.05)" } : { color: tintText(color), background: tintBg(color, on ? 30 : 20) }}>
        {path ? icon ? <img src={icon} alt="" className="h-7 w-7 object-contain" /> : <AppWindow size={20} className="text-label-3" /> : <Icon size={20} strokeWidth={2.2} />}
      </span>
      <span className="w-full truncate text-center text-[11.5px] font-semibold" style={{ color: path ? "var(--color-label-2)" : tintText(color) }}>
        {muted ? tt("{0} kapalı", k.label) : k.label}
      </span>
      {k.steps.length > 1 && <span className="absolute right-2 top-2 rounded-full px-1.5 text-[9.5px] font-bold" style={{ background: tintBg(color, 24), color: tintText(color) }}>{k.steps.length}</span>}
      {isDangerous(k) && <span className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full" style={{ background: ACCENT.red }} title={tt("İkinci basışta çalışır")} />}
      {(k.home || k.hotkey) && (
        <span className="-mt-1.5 w-full truncate text-center text-[9px] font-semibold text-label-3">{[k.hotkey, k.home && tt("Ana sayfada")].filter(Boolean).join(" · ")}</span>
      )}
    </motion.button>
  );
}

/** "Dene": tuşu ya da otomasyonu şimdi çalıştır (tehlikeli tuşlar burada denenmez) */
function KeyTest({ k, onRun }: { k: { label: string; steps: DeckStep[] }; onRun?: () => void }) {
  const [done, setDone] = useState(false);
  if (isDangerous(k) || !k.steps.length) return null;
  return (
    <Btn
      color={ACCENT.green}
      onClick={() => {
        if (onRun) onRun();
        else void runKey(k);
        setDone(true);
        window.setTimeout(() => setDone(false), 1200);
      }}
    >
      <Play size={13} fill="currentColor" /> {done ? tt("Çalıştı") : tt("Dene")}
    </Btn>
  );
}

// ---------------------------------------------------------------- Adımlar (tuş ve otomasyon ortak)

/** Adım listesi ve "adım ekle"; `safe`: kapatma/uyku gibi adımlar sunulmaz (otomasyonlar) */
function Steps({ steps, onChange, safe }: { steps: DeckStep[]; onChange: (s: DeckStep[]) => void; safe?: boolean }) {
  return (
    <>
      <div className="space-y-1.5">
        {steps.map((st, i) => (
          <StepRow
            key={i}
            step={st}
            index={i}
            count={steps.length}
            onEdit={(s) => onChange(steps.map((x, k) => (k === i ? s : x)))}
            onMove={(d) => {
              const next = [...steps];
              const j = i + d;
              [next[i], next[j]] = [next[j], next[i]];
              onChange(next);
            }}
            onRemove={() => onChange(steps.filter((_, k) => k !== i))}
          />
        ))}
        {!steps.length && <p className="rounded-[12px] border border-dashed border-white/[0.1] px-3 py-3 text-[12px] text-label-3">{tt("Henüz bir şey yapmıyor: aşağıdan adım ekle")}</p>}
      </div>
      <AddStep safe={safe} onAdd={(st) => onChange([...steps, st])} />
    </>
  );
}

function StepRow({ step, index, count, onEdit, onMove, onRemove }: { step: DeckStep; index: number; count: number; onEdit: (s: DeckStep) => void; onMove: (d: number) => void; onRemove: () => void }) {
  const a = actionOf(step);
  const Icon = step.kind === "open" ? (step.path.startsWith("http") ? Globe : AppWindow) : a ? (DECK_ICONS[a.icon] ?? Zap) : Zap;
  const color = step.kind === "open" ? ACCENT.blue : (a?.color ?? ACCENT.gray);
  return (
    <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.03] px-2.5 py-2">
      <div className="flex items-center gap-2">
        <span className="w-4 text-center text-[11px] font-bold tabular-nums text-label-3">{index + 1}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-[9px]" style={{ background: tintBg(color, 20), color: tintText(color) }}>
          <Icon size={13} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-label">{step.kind === "say" ? tt("Nook söylesin") : step.kind === "quick" ? (a?.label ?? step.key) : stepLabel(step)}</span>
        {/* Aç/kapa adımı: aç/kapa → aç → kapat */}
        {step.kind === "quick" && (
          <button
            onClick={() => onEdit(nextQuick(step))}
            title={tt("Değiştirmek için bas")}
            className="h-6 rounded-full border px-2 text-[11px] font-semibold"
            style={{ background: tintBg(color, 14), borderColor: tintBg(color, 36), color: tintText(color) }}
          >
            {quickLit(step) == null ? tt("aç/kapa") : quickLit(step) ? tt("aç") : tt("kapat")}
          </button>
        )}
        {count > 1 && (
          <>
            <button disabled={index === 0} onClick={() => onMove(-1)} className="flex h-6 w-6 items-center justify-center rounded-full text-label-3 hover:bg-white/10 hover:text-label disabled:opacity-25">
              <ArrowUp size={12} />
            </button>
            <button disabled={index === count - 1} onClick={() => onMove(1)} className="flex h-6 w-6 items-center justify-center rounded-full text-label-3 hover:bg-white/10 hover:text-label disabled:opacity-25">
              <ArrowDown size={12} />
            </button>
          </>
        )}
        <button onClick={onRemove} className="flex h-6 w-6 items-center justify-center rounded-full text-label-3 hover:bg-white/10 hover:text-label" title={tt("Adımı sil")}>
          <X size={12} />
        </button>
      </div>
      {/* Değerli adımlar: seviye, söz, süre */}
      {(step.kind === "volume" || step.kind === "brightness") && (
        <div className="mt-2 flex items-center gap-3 pl-6">
          <input type="range" min={0} max={100} step={5} value={step.value} onChange={(e) => onEdit({ ...step, value: Number(e.target.value) })} className="min-w-0 flex-1" style={{ accentColor: color }} />
        </div>
      )}
      {step.kind === "say" && (
        <input
          value={step.text}
          maxLength={80}
          placeholder={tt("Ne söylesin? (ör. Su içme vakti)")}
          onChange={(e) => onEdit({ ...step, text: e.target.value })}
          className="mt-2 h-8 w-[calc(100%-24px)] rounded-[9px] border border-white/[0.08] bg-white/[0.04] px-2.5 text-[12px] text-label outline-none focus:border-white/25"
          style={{ marginLeft: 24 }}
        />
      )}
      {step.kind === "wait" && (
        <div className="mt-2 flex gap-1 pl-6">
          {[2, 5, 10, 30, 60].map((sec) => (
            <button
              key={sec}
              onClick={() => onEdit({ ...step, sec })}
              className="h-6 rounded-full border px-2.5 text-[11px] font-semibold"
              style={step.sec === sec ? { background: tintBg(color, 20), borderColor: tintBg(color, 45), color: tintText(color) } : { borderColor: "rgb(255 255 255 / 0.08)", color: "var(--color-label-3)" }}
            >
              {tt("{0} sn", sec)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Adım ekle: hazır eylem, uygulama ya da site */
function AddStep({ onAdd, safe }: { onAdd: (s: DeckStep) => void; safe?: boolean }) {
  const [mode, setMode] = useState<null | "action" | "app" | "web">(null);
  const [url, setUrl] = useState("");
  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {(
          [
            ["action", Zap, tt("Eylem")],
            ["app", AppWindow, tt("Uygulama aç")],
            ["web", Globe, tt("Site aç")],
          ] as const
        ).map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={() => setMode((m) => (m === id ? null : id))}
            className="flex h-8 items-center gap-1.5 rounded-[10px] border px-2.5 text-[12px] font-semibold"
            style={mode === id ? { background: tintBg(ACCENT.blue, 18), borderColor: tintBg(ACCENT.blue, 45), color: tintText(ACCENT.blue) } : { background: "rgb(255 255 255 / 0.03)", borderColor: "rgb(255 255 255 / 0.08)", color: "var(--color-label-2)" }}
          >
            <Plus size={12} />
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {mode === "action" && (
          <motion.div key="a" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 grid grid-cols-2 gap-1.5">
            {ACTIONS.filter((a) => !safe || !a.danger).map((a) => {
              const Icon = DECK_ICONS[a.icon] ?? Zap;
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    onAdd(a.step);
                    setMode(null);
                  }}
                  className="flex items-center gap-2 rounded-[10px] border border-white/[0.05] bg-white/[0.03] px-2 py-1.5 text-left hover:bg-white/[0.07]"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px]" style={{ background: tintBg(a.color, 18), color: tintText(a.color) }}>
                    <Icon size={12} />
                  </span>
                  <span className="truncate text-[12px] font-medium text-label">{a.label}</span>
                  {a.danger && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENT.red }} />}
                </button>
              );
            })}
          </motion.div>
        )}
        {mode === "app" && (
          <motion.div key="p" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2">
            <AppList
              onPick={(a) => {
                onAdd({ kind: "open", path: a.path, name: a.name });
                setMode(null);
              }}
            />
          </motion.div>
        )}
        {mode === "web" && (
          <motion.form
            key="w"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              const u = url.trim();
              if (!u) return;
              const full = /^https?:\/\//i.test(u) ? u : `https://${u}`;
              onAdd({ kind: "open", path: full, name: full.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0] });
              setUrl("");
              setMode(null);
            }}
          >
            <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="youtube.com" className="h-9 min-w-0 flex-1 rounded-[10px] border border-white/[0.08] bg-white/[0.04] px-3 text-[12.5px] text-label outline-none focus:border-white/25" />
            <Btn color={ACCENT.blue} onClick={() => undefined}>
              {tt("Ekle")}
            </Btn>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function useAppIcon(path: string | null) {
  const [icon, setIcon] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    void fileIcon(path, 32).then((i) => alive && setIcon(i));
    return () => {
      alive = false;
    };
  }, [path]);
  return icon;
}

function AppList({ onPick, exclude = [] }: { onPick: (a: AppEntry) => void; exclude?: string[] }) {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => void (appsCache ??= listApps()).then(setApps), []);
  const list = useMemo(() => {
    const n = q.trim().toLocaleLowerCase("tr");
    return apps.filter((a) => !exclude.includes(a.path) && (!n || a.name.toLocaleLowerCase("tr").includes(n))).slice(0, 60);
  }, [apps, q, exclude]);
  return (
    <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-2">
      <label className="mb-1.5 flex h-8 items-center gap-2 rounded-[9px] bg-white/[0.04] px-2.5 text-label-3">
        <Search size={13} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={tt("Uygulama ara…")} className="min-w-0 flex-1 bg-transparent text-[12.5px] text-label outline-none placeholder:text-label-3" />
      </label>
      <div className="max-h-[220px] space-y-0.5 overflow-y-auto pr-1">
        {list.map((a) => (
          <AppRow key={a.path} app={a} onPick={() => onPick(a)} />
        ))}
        {!list.length && <p className="py-4 text-center text-[12px] text-label-3">{apps.length ? tt("Bulunamadı") : tt("Uygulamalar okunuyor…")}</p>}
      </div>
    </div>
  );
}

function AppRow({ app, onPick }: { app: AppEntry; onPick: () => void }) {
  const icon = useAppIcon(app.path);
  return (
    <button onClick={onPick} className="flex w-full items-center gap-2 rounded-[9px] px-2 py-1.5 text-left hover:bg-white/[0.06]">
      {icon ? <img src={icon} alt="" className="h-5 w-5 object-contain" /> : <AppWindow size={16} className="text-label-3" />}
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-label">{app.name}</span>
      <Plus size={13} className="text-label-3" />
    </button>
  );
}

// ---------------------------------------------------------------- Otomasyonlar

function AutoTab() {
  const list = useNook((s) => s.automations);
  const [sel, setSel] = useState<string | null>(list[0]?.id ?? null);
  const auto = list.find((a) => a.id === sel) ?? null;
  const patch = (p: Partial<Automation>) => auto && saveAutomations(getAutomations().map((a) => (a.id === auto.id ? { ...a, ...p } : a)));
  const add = (t?: (typeof TEMPLATES)[number]) => {
    const a: Automation = t
      ? { id: crypto.randomUUID(), label: t.label, on: true, when: t.when, steps: t.steps, only: t.only, ask: t.ask }
      : { id: crypto.randomUUID(), label: tt("Yeni otomasyon"), on: true, when: TRIGGERS[0].make(), steps: [] };
    saveAutomations([...getAutomations(), a]);
    setSel(a.id);
  };

  return (
    <Page wide>
      <PageHeader
        icon={Keyboard}
        color={ACCENT.blue}
        title={tt("Kısayollar")}
        subtitle={tt("Bir şey olunca Nook senin yerine yapar")}
        actions={
          <>
            <Tabs tab="auto" />
            <Btn color={ACCENT.purple} onClick={() => add()}>
              <Plus size={14} /> {tt("Yeni otomasyon")}
            </Btn>
          </>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)_330px] gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <Panel title={tt("Otomasyonların")} hint={list.length ? tt("{0} otomasyon · {1} açık", list.length, list.filter((a) => a.on).length) : tt("Henüz yok")}>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {list.map((a) => (
                  <AutoRow key={a.id} a={a} on={a.id === sel} onClick={() => setSel(a.id)} />
                ))}
              </AnimatePresence>
              {!list.length && <p className="rounded-[14px] border border-dashed border-white/[0.1] px-4 py-5 text-center text-[12.5px] text-label-3">{tt("Aşağıdaki örneklerden birini ekle ya da yenisini kur")}</p>}
            </div>
          </Panel>
          <Panel title={tt("Hazır örnekler")} hint={tt("Tek tıkla ekle, sonra istediğin gibi değiştir")} delay={0.04}>
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              {TEMPLATES.map((t) => {
                const m = triggerMeta(t.when);
                const Icon = DECK_ICONS[m.icon] ?? Zap;
                return (
                  <button key={t.label} onClick={() => add(t)} className="flex items-center gap-2.5 rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-left hover:bg-white/[0.06]">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]" style={{ background: tintBg(m.color, 20), color: tintText(m.color) }}>
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-label">{t.label}</span>
                      <span className="block truncate text-[11px] text-label-3">
                        {triggerLabel(t.when)} · {t.steps.map(stepLabel).join(", ")}
                      </span>
                    </span>
                    <Plus size={14} className="shrink-0 text-label-3" />
                  </button>
                );
              })}
            </div>
          </Panel>
          <History />
        </div>

        <Panel title={auto ? tt("Otomasyonu düzenle") : tt("Bir otomasyon seç")} right={auto && <KeyTest k={auto} onRun={() => void runAutomationNow(auto)} />}>
          {auto ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  value={auto.label}
                  maxLength={32}
                  onChange={(e) => patch({ label: e.target.value })}
                  className="h-10 min-w-0 flex-1 rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-3 text-[14px] font-semibold text-label outline-none focus:border-white/25"
                />
                <IconBtn
                  label={tt("Otomasyonu sil")}
                  danger
                  onClick={() => {
                    saveAutomations(getAutomations().filter((a) => a.id !== auto.id));
                    setSel(getAutomations()[0]?.id ?? null);
                  }}
                >
                  <Trash2 size={14} />
                </IconBtn>
              </div>
              <div>
                <Label>{tt("Ne zaman")}</Label>
                <TriggerEdit when={auto.when} onChange={(when) => patch({ when })} />
              </div>
              <div>
                <Label>{tt("Yalnızca şu durumda")}</Label>
                <ConditionsEdit only={auto.only ?? []} onChange={(only) => patch({ only: only.length ? only : undefined })} />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold text-label">{tt("Çalışmadan önce sor")}</span>
                  <span className="block text-[11px] text-label-3">{tt("Adada “çalışsın mı?” diye sorar; cevap gelmezse çalışmaz")}</span>
                </span>
                <Toggle on={!!auto.ask} onChange={(v) => patch({ ask: v || undefined })} color={ACCENT.purple} />
              </label>
              <div>
                <Label>{tt("Ne yapsın")}</Label>
                <Steps steps={auto.steps} onChange={(steps) => patch({ steps })} safe />
              </div>
              <VoiceHint label={auto.label} />
              <p className="text-[11px] leading-relaxed text-label-3">{tt("Aynı otomasyon dakikada en fazla bir kez çalışır. Kapatma ve uyku otomasyonda yok; bunun için Bilgisayar'daki zamanlı kapatmayı kullan.")}</p>
            </div>
          ) : (
            <p className="text-[12.5px] text-label-3">{tt("Soldan bir otomasyon seç ya da yenisini ekle")}</p>
          )}
        </Panel>
      </div>
    </Page>
  );
}

/** Liste satırı: tetikleyicinin simgesi, ad, "ne zaman → ne", şimdi çalıştır, aç/kapa */
function AutoRow({ a, on, onClick }: { a: Automation; on: boolean; onClick: () => void }) {
  const m = triggerMeta(a.when);
  const Icon = DECK_ICONS[m.icon] ?? Zap;
  const canRun = a.steps.length > 0 && autoSafe(a.steps);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: a.on ? 1 : 0.6, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onClick={onClick}
      className="flex cursor-pointer items-center gap-3 rounded-[16px] border px-3 py-2.5"
      style={on ? { background: tintBg(m.color, 12), borderColor: tintBg(m.color, 45) } : { background: "rgb(255 255 255 / 0.03)", borderColor: "rgb(255 255 255 / 0.06)" }}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]" style={{ background: tintBg(m.color, 22), color: tintText(m.color) }}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold text-label">{a.label}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-label-3">
          <span className="shrink-0 font-semibold" style={{ color: tintText(m.color) }}>
            {triggerLabel(a.when)}
          </span>
          <ArrowRight size={11} className="shrink-0" />
          <span className="truncate">{a.steps.length ? a.steps.map(stepLabel).join(", ") : tt("adım yok")}</span>
        </span>
        {(!!a.only?.length || a.ask) && (
          <span className="mt-0.5 block truncate text-[10.5px] text-label-3">{[...(a.only ?? []).map(conditionLabel), ...(a.ask ? [tt("önce sorar")] : [])].join(" · ")}</span>
        )}
      </span>
      {a.last && <span className="shrink-0 text-[10.5px] text-label-3">{when(a.last)}</span>}
      {canRun && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            void runAutomationNow(a);
          }}
          title={tt("Şimdi çalıştır")}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-transform active:scale-90"
          style={{ background: tintBg(m.color, 16), borderColor: tintBg(m.color, 38), color: tintText(m.color) }}
        >
          <Play size={11} fill="currentColor" />
        </button>
      )}
      <span onClick={(e) => e.stopPropagation()}>
        <Toggle on={a.on} onChange={(v) => saveAutomations(getAutomations().map((x) => (x.id === a.id ? { ...x, on: v } : x)))} color={m.color} />
      </span>
    </motion.div>
  );
}

/** Tetikleyici seçimi ve ayrıntısı (saat ve günler, uygulama) */
function TriggerEdit({ when, onChange }: { when: Trigger; onChange: (t: Trigger) => void }) {
  const cur = triggerId(when);
  const [picking, setPicking] = useState(false);
  const m = triggerMeta(when);
  const Icon = DECK_ICONS[m.icon] ?? Zap;
  return (
    <div className="space-y-2">
      <button
        onClick={() => setPicking((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-[12px] border px-3 py-2 text-left"
        style={{ background: tintBg(m.color, 12), borderColor: tintBg(m.color, 40) }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-[9px]" style={{ background: tintBg(m.color, 24), color: tintText(m.color) }}>
          <Icon size={14} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold" style={{ color: tintText(m.color) }}>
          {triggerLabel(when)}
        </span>
        <Wand2 size={13} className="text-label-3" />
        <span className="text-[11px] font-semibold text-label-3">{tt("Değiştir")}</span>
      </button>
      <AnimatePresence>
        {picking && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-1.5">
            {TRIGGERS.map((t) => {
              const TIcon = DECK_ICONS[t.icon] ?? Zap;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    if (t.id !== cur) onChange(t.make());
                    setPicking(false);
                  }}
                  className="flex items-center gap-2 rounded-[10px] border px-2 py-1.5 text-left"
                  style={t.id === cur ? { background: tintBg(t.color, 16), borderColor: tintBg(t.color, 45) } : { background: "rgb(255 255 255 / 0.03)", borderColor: "rgb(255 255 255 / 0.05)" }}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px]" style={{ background: tintBg(t.color, 18), color: tintText(t.color) }}>
                    <TIcon size={12} />
                  </span>
                  <span className="truncate text-[12px] font-medium text-label">{t.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      {when.kind === "time" && (
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={when.at}
            onChange={(e) => e.target.value && onChange({ ...when, at: e.target.value })}
            className="h-9 rounded-[10px] border border-white/[0.08] bg-white/[0.04] px-2.5 text-[13px] font-semibold tabular-nums text-label outline-none focus:border-white/25 [color-scheme:dark]"
          />
          <div className="flex flex-1 gap-1">
            {WEEK.map((w) => {
              const on = !when.days.length || when.days.includes(w.d);
              return (
                <button
                  key={w.d}
                  onClick={() => {
                    const all = when.days.length ? when.days : WEEK.map((x) => x.d);
                    const days = on ? all.filter((d) => d !== w.d) : [...all, w.d];
                    // Hepsi seçiliyse "her gün" (boş); hiçbiri kalmasın
                    if (!days.length) return;
                    onChange({ ...when, days: days.length === 7 ? [] : days });
                  }}
                  className="h-9 flex-1 rounded-[10px] border text-[11px] font-semibold"
                  style={on ? { background: tintBg(ACCENT.yellow, 16), borderColor: tintBg(ACCENT.yellow, 40), color: tintText(ACCENT.yellow) } : { borderColor: "rgb(255 255 255 / 0.06)", color: "var(--color-label-3)" }}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {when.kind === "app" && <AppTrigger name={when.name} onPick={(name) => onChange({ kind: "app", name })} />}
    </div>
  );
}

/** "Uygulama açılınca": hangi uygulama (Başlat menüsünden) */
function AppTrigger({ name, onPick }: { name: string; onPick: (name: string) => void }) {
  const [open, setOpen] = useState(!name);
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="text-[11.5px] font-semibold text-label-3 hover:text-label-2">
        {tt("Başka uygulama seç")}
      </button>
    );
  return (
    <AppList
      onPick={(a) => {
        onPick(a.name);
        setOpen(false);
      }}
    />
  );
}

/** "14:05", "dün 09:00", "12 Eki 23:00" */
function when(at: number) {
  const d = new Date(at);
  const t = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const day = (x: Date) => x.toDateString();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (day(d) === day(new Date())) return t;
  if (day(d) === day(y)) return tt("dün {0}", t);
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} ${t}`;
}

/** Koşullar: hepsi doğruysa çalışır (oyunda değilsem, saat aralığı, şarj/pil, bilgisayarın başındaysam) */
function ConditionsEdit({ only, onChange }: { only: Condition[]; onChange: (c: Condition[]) => void }) {
  const [adding, setAdding] = useState(false);
  // Şarj ve pil birbirini dışlar; aynı koşul iki kez eklenmez
  const free = CONDITIONS.filter((c) => !only.some((o) => conditionId(o) === c.id || (o.kind === "power" && (c.id === "power" || c.id === "battery"))));
  return (
    <div className="space-y-1.5">
      {only.map((c, i) => (
        <div key={i} className="flex items-center gap-2 rounded-[12px] border border-white/[0.06] bg-white/[0.03] px-2.5 py-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[8px]" style={{ background: tintBg(ACCENT.teal, 20), color: tintText(ACCENT.teal) }}>
            <Check size={12} strokeWidth={2.6} />
          </span>
          {c.kind === "between" ? (
            <span className="flex flex-1 items-center gap-1.5 text-[12.5px] text-label">
              <TimeBox value={c.from} onChange={(from) => onChange(only.map((x, k) => (k === i ? { ...c, from } : x)))} />
              <span className="text-label-3">–</span>
              <TimeBox value={c.to} onChange={(to) => onChange(only.map((x, k) => (k === i ? { ...c, to } : x)))} />
              <span className="text-label-3">{tt("arası")}</span>
            </span>
          ) : (
            <span className="flex-1 text-[12.5px] font-medium text-label">{conditionLabel(c)}</span>
          )}
          <button onClick={() => onChange(only.filter((_, k) => k !== i))} className="flex h-6 w-6 items-center justify-center rounded-full text-label-3 hover:bg-white/10 hover:text-label" title={tt("Koşulu sil")}>
            <X size={12} />
          </button>
        </div>
      ))}
      {!only.length && !adding && <p className="px-1 text-[11.5px] text-label-3">{tt("Her zaman çalışır")}</p>}
      {free.length > 0 &&
        (adding ? (
          <div className="flex flex-wrap gap-1.5">
            {free.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onChange([...only, c.make()]);
                  setAdding(false);
                }}
                className="h-7 rounded-full border px-2.5 text-[11.5px] font-semibold"
                style={{ background: tintBg(ACCENT.teal, 12), borderColor: tintBg(ACCENT.teal, 36), color: tintText(ACCENT.teal) }}
              >
                {c.label}
              </button>
            ))}
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="flex h-8 items-center gap-1.5 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-2.5 text-[12px] font-semibold text-label-2">
            <Plus size={12} /> {tt("Koşul ekle")}
          </button>
        ))}
    </div>
  );
}

function TimeBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      className="h-7 rounded-[8px] border border-white/[0.08] bg-white/[0.04] px-1.5 text-[12px] font-semibold tabular-nums text-label outline-none focus:border-white/25 [color-scheme:dark]"
    />
  );
}

const RUN_TEXT: Record<AutoRun["status"], { label: string; color: string }> = {
  ran: { label: tt("çalıştı"), color: ACCENT.green },
  skipped: { label: tt("koşul tutmadı"), color: ACCENT.gray },
  declined: { label: tt("çalıştırılmadı"), color: ACCENT.orange },
  error: { label: tt("hata"), color: ACCENT.red },
};

/** Son çalışanlar: ne zaman, hangisi, ne oldu */
function History() {
  const log = useNook((s) => s.autoLog);
  return (
    <Panel
      title={tt("Son çalışanlar")}
      hint={log.length ? tt("Son {0} kayıt", Math.min(log.length, 12)) : tt("Henüz çalışan yok")}
      delay={0.08}
      right={
        log.length > 0 && (
          <Btn color={ACCENT.gray} ghost onClick={() => useNook.getState().setAutoLog([])}>
            {tt("Temizle")}
          </Btn>
        )
      }
    >
      <div className="space-y-1">
        {log.slice(0, 12).map((r, i) => {
          const s = RUN_TEXT[r.status];
          return (
            <div key={`${r.at}-${i}`} className="flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 hover:bg-white/[0.03]">
              <span className="w-[86px] shrink-0 text-[11.5px] tabular-nums text-label-3">{when(r.at)}</span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-label">{r.label}</span>
              <span className="shrink-0 rounded-full px-2 py-[1px] text-[10.5px] font-semibold" style={{ background: tintBg(s.color, 16), color: tintText(s.color) }}>
                {s.label}
              </span>
            </div>
          );
        })}
        {!log.length && <p className="text-[12px] text-label-3">{tt("Bir otomasyon çalışınca burada görünür")}</p>}
      </div>
    </Panel>
  );
}
