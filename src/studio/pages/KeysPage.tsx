/**
 * Studio › Kısayollar: Stream Deck gibi tuşlar. Solda tuşların (seç, sırala), sağda seçili tuşun düzenleyicisi:
 * adı, simgesi, rengi ve adımları. Birden çok adım = rutin (ör. "Oyun modu": mikrofonu aç, Discord'u aç,
 * masaüstünü temizle). Altta adada çıkan uygulama kısayolları.
 */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AppWindow, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Globe, Keyboard, Layers, Play, Plus, Search, Trash2, X, Zap } from "lucide-react";
import { fileIcon, listApps, type AppEntry } from "../../lib/bridge";
import { ACTIONS, DECK_COLORS, DECK_ICONS, getDeck, isDangerous, runKey, stepLabel, useDeck, type DeckKey, type DeckStep } from "../../lib/deck";
import { useNook } from "../../store/nook";
import { ACCENT, tintBg, tintText } from "../../components/ui/primitives";
import { tt } from "../../lib/i18n";
import { Btn, Page, PageHeader, Panel } from "../ui";

let appsCache: Promise<AppEntry[]> | undefined;

const save = (deck: DeckKey[]) => useNook.getState().setDeck(deck);

export function KeysPage() {
  const deck = useDeck();
  const [sel, setSel] = useState<string | null>(deck[0]?.id ?? null);
  const key = deck.find((k) => k.id === sel) ?? null;
  const patch = (p: Partial<DeckKey>) => key && save(getDeck().map((k) => (k.id === key.id ? { ...k, ...p } : k)));

  const add = (kind: "scene" | "action") => {
    const k: DeckKey =
      kind === "scene"
        ? { id: crypto.randomUUID(), label: tt("Yeni rutin"), icon: "scene", color: DECK_COLORS[(getDeck().length * 3) % DECK_COLORS.length], steps: [] }
        : { id: crypto.randomUUID(), label: tt("Yeni tuş"), icon: "bolt", color: DECK_COLORS[(getDeck().length * 3) % DECK_COLORS.length], steps: [] };
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

  return (
    <Page wide>
      <PageHeader
        icon={Keyboard}
        color={ACCENT.blue}
        title={tt("Kısayollar")}
        subtitle={tt("Adadaki Kısayollar modülünün tuşları. Tuş tek bir iş yapabilir ya da rutin olur: tek basışta birkaç işi sırayla yapar (ör. Oyun modu: Discord'u aç, mikrofonu aç, masaüstünü temizle).")}
        actions={
          <>
            <Btn color={ACCENT.purple} onClick={() => add("scene")}>
              <Layers size={14} /> {tt("Yeni rutin")}
            </Btn>
            <Btn color={ACCENT.blue} onClick={() => add("action")}>
              <Plus size={14} /> {tt("Yeni tuş")}
            </Btn>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-[1fr_420px] gap-4">
        {/* Tuşlar */}
        <Panel title={tt("Tuşların")} hint={tt("Seç, sağda düzenle")}>
          <div className="grid grid-cols-5 gap-3">
            <AnimatePresence initial={false}>
              {deck.map((k) => (
                <BigKey key={k.id} k={k} on={k.id === sel} onClick={() => setSel(k.id)} />
              ))}
            </AnimatePresence>
            <button onClick={() => add("action")} className="flex h-[92px] flex-col items-center justify-center gap-1 rounded-[18px] border border-dashed border-white/[0.12] text-label-3 hover:border-white/25 hover:text-label-2">
              <Plus size={20} />
              <span className="text-[11px] font-semibold">{tt("Tuş ekle")}</span>
            </button>
          </div>
          <p className="mt-4 text-[11.5px] leading-relaxed text-label-3">
            {tt("Kapat, yeniden başlat ve uyku tuşları yanlışlıkla basılmasın diye ikinci basışta çalışır. Mikrofon ve ses tuşları açık/kapalı olduğunu ışığıyla gösterir.")}
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

              <div>
                <Label>{key.steps.length > 1 ? tt("Rutin: {0} adım, sırayla", key.steps.length) : tt("Ne yapsın")}</Label>
                <div className="space-y-1.5">
                  {key.steps.map((st, i) => (
                    <StepRow
                      key={i}
                      step={st}
                      index={i}
                      count={key.steps.length}
                      onMove={(d) => {
                        const steps = [...key.steps];
                        const j = i + d;
                        [steps[i], steps[j]] = [steps[j], steps[i]];
                        patch({ steps });
                      }}
                      onRemove={() => patch({ steps: key.steps.filter((_, k) => k !== i) })}
                    />
                  ))}
                  {!key.steps.length && <p className="rounded-[12px] border border-dashed border-white/[0.1] px-3 py-3 text-[12px] text-label-3">{tt("Henüz bir şey yapmıyor: aşağıdan adım ekle")}</p>}
                </div>
                <AddStep onAdd={(st) => patch({ steps: [...key.steps, st] })} />
              </div>
            </div>
          ) : (
            <p className="text-[12.5px] text-label-3">{tt("Soldan bir tuş seç ya da yeni tuş ekle")}</p>
          )}
        </Panel>
      </div>

      <AppShortcuts />
    </Page>
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

/** Büyük basılabilir tuş (seçiliyse renginde çerçeveli) */
function BigKey({ k, on, onClick }: { k: DeckKey; on: boolean; onClick: () => void }) {
  const Icon = DECK_ICONS[k.icon] ?? Zap;
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
      style={{
        background: `linear-gradient(150deg, ${tintBg(k.color, on ? 22 : 13)} 0%, ${tintBg(k.color, on ? 6 : 3)} 100%)`,
        borderColor: tintBg(k.color, on ? 60 : 26),
        boxShadow: on ? `0 0 0 1px ${tintBg(k.color, 50)}, 0 12px 28px -14px ${k.color}` : undefined,
      }}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-[13px]" style={{ color: tintText(k.color), background: tintBg(k.color, on ? 30 : 20) }}>
        <Icon size={20} strokeWidth={2.2} />
      </span>
      <span className="w-full truncate text-center text-[11.5px] font-semibold" style={{ color: tintText(k.color) }}>{k.label}</span>
      {k.steps.length > 1 && <span className="absolute right-2 top-2 rounded-full px-1.5 text-[9.5px] font-bold" style={{ background: tintBg(k.color, 24), color: tintText(k.color) }}>{k.steps.length}</span>}
      {isDangerous(k) && <span className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full" style={{ background: ACCENT.red }} title={tt("İkinci basışta çalışır")} />}
    </motion.button>
  );
}

/** "Dene": tuşu şimdi çalıştır (tehlikeli tuşlar burada denenmez) */
function KeyTest({ k }: { k: DeckKey }) {
  const [done, setDone] = useState(false);
  if (isDangerous(k) || !k.steps.length) return null;
  return (
    <Btn
      color={ACCENT.green}
      onClick={() => {
        void runKey(k);
        setDone(true);
        window.setTimeout(() => setDone(false), 1200);
      }}
    >
      <Play size={13} fill="currentColor" /> {done ? tt("Çalıştı") : tt("Dene")}
    </Btn>
  );
}

function StepRow({ step, index, count, onMove, onRemove }: { step: DeckStep; index: number; count: number; onMove: (d: number) => void; onRemove: () => void }) {
  const a = ACTIONS.find((x) => JSON.stringify(x.step) === JSON.stringify(step) || (x.step.kind === "quick" && step.kind === "quick" && x.step.key === step.key));
  const Icon = step.kind === "open" ? (step.path.startsWith("http") ? Globe : AppWindow) : a ? (DECK_ICONS[a.icon] ?? Zap) : Zap;
  const color = step.kind === "open" ? ACCENT.blue : (a?.color ?? ACCENT.gray);
  return (
    <div className="flex items-center gap-2 rounded-[12px] border border-white/[0.06] bg-white/[0.03] px-2.5 py-2">
      <span className="w-4 text-center text-[11px] font-bold tabular-nums text-label-3">{index + 1}</span>
      <span className="flex h-7 w-7 items-center justify-center rounded-[9px]" style={{ background: tintBg(color, 20), color: tintText(color) }}>
        <Icon size={13} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-label">{stepLabel(step)}</span>
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
  );
}

/** Adım ekle: hazır eylem, uygulama ya da site */
function AddStep({ onAdd }: { onAdd: (s: DeckStep) => void }) {
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
            {ACTIONS.map((a) => {
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

function useAppIcon(path: string) {
  const [icon, setIcon] = useState<string | null>(null);
  useEffect(() => {
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

/** Adadaki uygulama tuşları (sabitlenen uygulama ve klasörler) */
function AppShortcuts() {
  const pinned = useNook((s) => s.pinnedApps);
  const [adding, setAdding] = useState(false);
  return (
    <Panel
      title={tt("Uygulama tuşları")}
      hint={tt("Tuşların arkasında, adadaki Kısayollar'da da görünür")}
      right={
        <Btn color={ACCENT.blue} onClick={() => setAdding((v) => !v)}>
          {adding ? <X size={14} /> : <Plus size={14} />} {adding ? tt("Kapat") : tt("Uygulama ekle")}
        </Btn>
      }
    >
      {adding && (
        <div className="mb-3">
          <AppList
            exclude={pinned.map((p) => p.path)}
            onPick={(a) => {
              useNook.getState().pinApp({ name: a.name, path: a.path });
              setAdding(false);
            }}
          />
        </div>
      )}
      <div className="grid grid-cols-6 gap-2">
        {pinned.map((p) => (
          <PinnedApp key={p.id} id={p.id} name={p.name} path={p.path} />
        ))}
        {!pinned.length && <p className="col-span-6 text-[12px] text-label-3">{tt("Henüz uygulama yok")}</p>}
      </div>
    </Panel>
  );
}

function PinnedApp({ id, name, path }: { id: string; name: string; path: string }) {
  const icon = useAppIcon(path);
  return (
    <div className="group relative flex flex-col items-center gap-1.5 rounded-[16px] border border-white/[0.065] bg-white/[0.035] px-2 py-3 transition-colors hover:bg-white/[0.06]">
      <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-white/[0.05]">
        {icon ? <img src={icon} alt="" className="h-7 w-7 object-contain" /> : <AppWindow size={20} className="text-label-3" />}
      </span>
      <span className="w-full truncate text-center text-[11.5px] font-medium text-label-2">{name}</span>
      <button onClick={() => useNook.getState().unpinApp(id)} title={tt("Kaldır")} className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-label-2 opacity-0 transition-opacity hover:text-white group-hover:opacity-100">
        <X size={11} />
      </button>
    </div>
  );
}
