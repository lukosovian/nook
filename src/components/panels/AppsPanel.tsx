import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AppWindow, Plus, RotateCcw, Search, X, Zap } from "lucide-react";
import { playAntic } from "../../hooks/useAntics";
import { fileIcon, listApps, type AppEntry, type QuickState } from "../../lib/bridge";
import {
  ACTIONS,
  appKey,
  appPathOf,
  DECK_ICONS,
  getDeck,
  hasAppKey,
  isDangerous,
  keyFromAction,
  keyVisual,
  resetDeck,
  runKey,
  useDeck,
  useQuickState,
  VALUE_KINDS,
  type DeckKey,
} from "../../lib/deck";
import { spring } from "../../lib/motion";
import { useNook } from "../../store/nook";
import { ACCENT, MiniNook, Segmented, TextButton, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

/** Uygulama listesi oturum boyunca bir kez okunur. */
let appsCache: Promise<AppEntry[]> | undefined;

/**
 * Kısayollar (Stream Deck gibi): basılabilir tuşlar tek listede: eylemler (mikrofon, ses, masaüstü, kilit…)
 * ve uygulama/klasör tuşları. "+" ile uygulama ya da hazır eylem eklenir; gelişmiş tuşlar ve otomasyonlar
 * Nook Studio › Kısayollar'da kurulur. Hepsi silinirse hazır tuşlar tek basışta geri gelir.
 */
export function AppsPanel() {
  const deck = useDeck();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const quick = useQuickState();

  if (adding) return <Picker onClose={() => setAdding(false)} />;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between">
        <p className="text-[10.5px] text-label-3">{editing ? tt("Kaldırmak için tuşa bas") : tt("Bas, çalışsın · otomasyonlar: Studio › Kısayollar")}</p>
        {deck.length > 0 && <TextButton onClick={() => setEditing((v) => !v)}>{editing ? tt("Bitti") : tt("Düzenle")}</TextButton>}
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-[66px] grid-cols-5 gap-2 overflow-y-auto p-0.5 pr-1">
        <AnimatePresence initial={false}>
          {deck.map((k) => {
            const path = appPathOf(k);
            return path ? <AppKey key={k.id} k={k} path={path} editing={editing} /> : <ActionKey key={k.id} k={k} editing={editing} quick={quick} />;
          })}
        </AnimatePresence>
        {!editing && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setAdding(true)}
            className="flex flex-col items-center justify-center gap-1 rounded-[16px] border border-dashed border-white/[0.12] text-label-3 hover:border-white/25 hover:text-label-2"
          >
            <Plus size={17} strokeWidth={2.2} />
            <span className="text-[10px] font-medium">{tt("Ekle")}</span>
          </motion.button>
        )}
        {!deck.length && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              resetDeck();
              setEditing(false);
              playAntic("nod");
            }}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-[16px] border text-[11px] font-semibold"
            style={{ background: tintBg(ACCENT.blue, 12), borderColor: tintBg(ACCENT.blue, 34), color: tintText(ACCENT.blue) }}
          >
            <RotateCcw size={13} strokeWidth={2.4} />
            {tt("Varsayılanları geri getir")}
          </motion.button>
        )}
      </div>
    </div>
  );
}

/** Kapatma/uyku gibi tuşlar: ilk basış kurar, üç saniye içinde ikinci basış çalıştırır */
function useArmed() {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return [armed, setArmed] as const;
}

/**
 * Basılabilir tuş: ana sayfanın kartlarıyla aynı dil (rengine boyanmış yumuşak zemin, ince kenar),
 * simge renkli bir yuvada. Basınca küçülür ve rengi bir an parlar.
 */
function KeyCap({
  color,
  label,
  title,
  onClick,
  editing,
  armed,
  lit,
  neutral,
  children,
}: {
  color: string;
  label: string;
  title: string;
  onClick: () => void;
  editing: boolean;
  armed?: boolean;
  /** Aç/kapa tuşunun ışığı: renk = yanıyor, null = sönük */
  lit?: string | null;
  /** Uygulama tuşu: kendi simgesi renkli, zemin sade */
  neutral?: boolean;
  children: React.ReactNode;
}) {
  const [hit, setHit] = useState(0);
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, rotate: editing ? [0, -2, 2, 0] : 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ y: -1.5 }}
      whileTap={{ scale: 0.93 }}
      transition={editing ? { rotate: { duration: 0.4, repeat: Infinity }, ...spring.pop } : spring.pop}
      onClick={() => {
        setHit((h) => h + 1);
        onClick();
      }}
      title={title}
      className="group relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] border px-1"
      style={{
        background: neutral ? "rgb(255 255 255 / 0.035)" : `linear-gradient(150deg, ${tintBg(color, 13)} 0%, ${tintBg(color, 3)} 100%)`,
        borderColor: armed ? ACCENT.red : neutral ? "rgb(255 255 255 / 0.065)" : tintBg(color, 26),
      }}
    >
      {/* Basınca kısa bir renk parlaması */}
      <AnimatePresence>
        {hit > 0 && (
          <motion.span
            key={hit}
            className="pointer-events-none absolute inset-0 rounded-[16px]"
            style={{ background: `radial-gradient(circle at 50% 40%, ${tintBg(color, 45)}, transparent 70%)` }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>
      {lit !== undefined && (
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full" style={{ background: lit ?? "rgb(255 255 255 / 0.15)", boxShadow: lit ? `0 0 6px ${lit}` : undefined }} />
      )}
      <span className="relative flex h-7 w-7 items-center justify-center rounded-[10px]" style={neutral ? undefined : { color: tintText(color), background: tintBg(color, 20) }}>
        {children}
      </span>
      <span className="relative w-full truncate text-center text-[10px] font-semibold" style={{ color: armed ? tintText(ACCENT.red) : neutral ? "var(--color-label-2)" : tintText(color) }}>
        {armed ? tt("Tekrar bas") : label}
      </span>
      {editing && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red text-white shadow">
          <X size={9} strokeWidth={3} />
        </span>
      )}
    </motion.button>
  );
}

function ActionKey({ k, editing, quick }: { k: DeckKey; editing: boolean; quick: QuickState | null }) {
  const { Icon, color, lit, muted } = keyVisual(k, quick);
  const [armed, setArmed] = useArmed();
  const isQuickToggle = k.steps.length === 1 && k.steps[0].kind === "quick";
  const litColor = lit === "off" ? ACCENT.red : lit === "on" ? k.color : isQuickToggle ? null : undefined;
  return (
    <KeyCap
      color={color}
      label={muted ? tt("{0} kapalı", k.label) : k.label}
      lit={litColor}
      title={editing ? tt("{0} — kaldır", k.label) : k.steps.length > 1 ? tt("{0} · {1} adım", k.label, k.steps.length) : k.label}
      editing={editing}
      armed={armed}
      onClick={() => {
        if (editing) return useNook.getState().setDeck(getDeck().filter((x) => x.id !== k.id));
        // Kapatma/uyku gibi tuşlar ikinci basışta çalışır
        if (isDangerous(k) && !armed) return setArmed(true);
        setArmed(false);
        playAntic("wink");
        void runKey(k);
      }}
    >
      <Icon size={15} strokeWidth={2.4} />
      {k.steps.length > 1 && <span className="absolute -bottom-0.5 -right-1 rounded-full bg-black/70 px-1 text-[8px] font-bold text-label-2">{k.steps.length}</span>}
    </KeyCap>
  );
}

function useIcon(path: string | null) {
  const [icon, setIcon] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    void fileIcon(path, 48).then((i) => alive && setIcon(i));
    return () => {
      alive = false;
    };
  }, [path]);
  return icon;
}

/** Uygulama ya da klasör tuşu: kendi simgesiyle, basınca açılır */
function AppKey({ k, path, editing }: { k: DeckKey; path: string; editing: boolean }) {
  const icon = useIcon(path);
  return (
    <KeyCap
      color={ACCENT.blue}
      neutral
      label={k.label}
      title={editing ? tt("{0} — kaldır", k.label) : k.label}
      editing={editing}
      onClick={() => {
        if (editing) return useNook.getState().setDeck(getDeck().filter((x) => x.id !== k.id));
        void runKey(k);
        playAntic("wink");
      }}
    >
      {icon ? <img src={icon} alt="" draggable={false} className="h-7 w-7 object-contain" /> : <MiniNook color={ACCENT.blue} size={24} />}
    </KeyCap>
  );
}

/**
 * Ana sayfanın alt sırasındaki tuşlar ("Ana sayfada göster" seçilenler): ada açılınca tek tıkla çalışır.
 * Azsa simge ve ad, çoksa yalnızca simge.
 */
export function HomeKeys({ keys }: { keys: DeckKey[] }) {
  const compact = keys.length > 3;
  const quick = useQuickState();
  return (
    <>
      {keys.map((k) => (
        <HomeKey key={k.id} k={k} compact={compact} quick={quick} />
      ))}
    </>
  );
}

function HomeKey({ k, compact, quick }: { k: DeckKey; compact: boolean; quick: QuickState | null }) {
  const path = appPathOf(k);
  const icon = useIcon(path);
  const { Icon, color: visColor, muted } = keyVisual(k, quick);
  const [armed, setArmed] = useArmed();
  const color = armed ? ACCENT.red : visColor;
  return (
    <motion.button
      onClick={() => {
        if (isDangerous(k) && !armed) return setArmed(true);
        setArmed(false);
        playAntic("wink");
        void runKey(k);
      }}
      title={armed ? tt("Tekrar bas") : muted ? tt("{0} kapalı", k.label) : k.label}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.93 }}
      className={`flex h-full min-w-0 items-center gap-1 rounded-[11px] border ${compact ? "w-[34px] shrink-0 justify-center" : "pl-[3px] pr-2.5"}`}
      style={path ? { background: "rgb(255 255 255 / 0.05)", borderColor: "rgb(255 255 255 / 0.09)" } : { background: tintBg(color, 12), borderColor: tintBg(color, 34) }}
    >
      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[8px]" style={path ? undefined : { background: tintBg(color, 22), color: tintText(color) }}>
        {path ? icon ? <img src={icon} alt="" draggable={false} className="h-[18px] w-[18px] object-contain" /> : <AppWindow size={13} className="text-label-3" /> : <Icon size={12} strokeWidth={2.4} />}
      </span>
      {!compact && (
        <span className="truncate text-[11px] font-semibold" style={{ color: path ? "var(--color-label-2)" : tintText(color) }}>
          {armed ? tt("Tekrar bas") : muted ? tt("{0} kapalı", k.label) : k.label}
        </span>
      )}
    </motion.button>
  );
}

const ADD_KINDS = [
  { id: "action" as const, label: tt("Eylem") },
  { id: "app" as const, label: tt("Uygulama") },
];

/** Ekle: hazır eylemler ya da Başlat menüsündeki uygulamalar */
function Picker({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<"action" | "app">("action");
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 items-center gap-2">
        <Segmented id="deck-add" options={ADD_KINDS} value={kind} onChange={setKind} color={ACCENT.blue} />
        <button onClick={onClose} className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label" title={tt("Kapat")}>
          <X size={12} />
        </button>
      </div>
      {kind === "action" ? <ActionPicker onClose={onClose} /> : <AppPicker onClose={onClose} />}
    </div>
  );
}

function ActionPicker({ onClose }: { onClose: () => void }) {
  const deck = useDeck();
  return (
    <div className="grid min-h-0 flex-1 grid-cols-3 gap-1 overflow-y-auto pr-1">
      {/* Ses seviyesi, Nook söylesin gibi değer isteyenler Studio'da ayarlanır */}
      {ACTIONS.filter((a) => !VALUE_KINDS.includes(a.step.kind)).map((a) => {
        const Icon = DECK_ICONS[a.icon] ?? Zap;
        const has = deck.some((k) => k.steps.length === 1 && JSON.stringify(k.steps[0]) === JSON.stringify(a.step));
        return (
          <button
            key={a.id}
            disabled={has}
            onClick={() => {
              useNook.getState().setDeck([...getDeck(), keyFromAction(a.id)]);
              playAntic("nod");
              onClose();
            }}
            className="flex items-center gap-2 rounded-[10px] border border-white/[0.05] bg-white/[0.03] px-2 py-1.5 text-left hover:bg-well-hi disabled:opacity-35"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px]" style={{ background: tintBg(a.color, 18), color: tintText(a.color) }}>
              <Icon size={12} strokeWidth={2.4} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-label">{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Başlat menüsündeki uygulamalardan (ve raftaki klasörlerden) seç. */
function AppPicker({ onClose }: { onClose: () => void }) {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [q, setQ] = useState("");
  const deck = useDeck();
  // Seçici yeni dizi döndürmesin (zustand her seferinde "değişti" sanıp sonsuz döngüye girer)
  const shelf = useNook((s) => s.shelf);
  const shelfDirs = useMemo(() => shelf.filter((f) => f.isDir), [shelf]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (appsCache ??= listApps()).then(setApps);
    const t = window.setTimeout(() => input.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, []);

  const list = useMemo(() => {
    const all: AppEntry[] = [...shelfDirs.map((d) => ({ name: d.name, path: d.path })), ...apps];
    const needle = q.trim().toLocaleLowerCase("tr");
    return all.filter((a) => !hasAppKey(deck, a.path) && (!needle || a.name.toLocaleLowerCase("tr").includes(needle))).slice(0, 40);
  }, [apps, shelfDirs, q, deck]);

  return (
    <>
      <div className="flex h-8 shrink-0 items-center gap-2 rounded-full bg-well pl-3 pr-1">
        <Search size={12} className="text-label-3" />
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          placeholder={tt("Uygulama ara…")}
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-[12px] text-label outline-none placeholder:text-label-3"
        />
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
        {list.map((a) => (
          <PickRow
            key={a.path}
            app={a}
            onPick={() => {
              useNook.getState().setDeck([...getDeck(), appKey(a)]);
              playAntic("nod");
              onClose();
            }}
          />
        ))}
        {!list.length && <p className="pt-6 text-center text-[11px] text-label-3">{apps.length ? tt("Bulunamadı") : tt("Uygulamalar okunuyor…")}</p>}
      </div>
    </>
  );
}

function PickRow({ app, onPick }: { app: AppEntry; onPick: () => void }) {
  const icon = useIcon(app.path);
  return (
    <button onClick={onPick} className="flex w-full items-center gap-2 rounded-[10px] px-2 py-1 text-left hover:bg-well-hi">
      {icon ? <img src={icon} alt="" className="h-5 w-5 object-contain" /> : <AppWindow size={16} className="text-label-3" />}
      <span className="min-w-0 flex-1 truncate text-[12px] text-label">{app.name}</span>
      <Plus size={12} className="text-label-3" />
    </button>
  );
}
