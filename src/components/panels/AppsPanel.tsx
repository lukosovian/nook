import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Search, X } from "lucide-react";
import { playAntic } from "../../hooks/useAntics";
import { fileIcon, listApps, openPath, type AppEntry } from "../../lib/bridge";
import { spring } from "../../lib/motion";
import { useNook, type PinnedApp } from "../../store/nook";
import { ACCENT, EmptyState, MiniNook, TextButton } from "../ui/primitives";
import { tt } from "../../lib/i18n";

/** Uygulama listesi oturum boyunca bir kez okunur. */
let appsCache: Promise<AppEntry[]> | undefined;

/** Kısayollar: sık kullanılan uygulama/klasörler tek tıkla açılır. "+" ile Başlat menüsünden eklenir. */
export function AppsPanel() {
  const pinned = useNook((s) => s.pinnedApps);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);

  if (adding) return <Picker onClose={() => setAdding(false)} />;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between">
        <p className="text-[10.5px] text-label-3">{tt("Tıkla, aç · raftaki klasörleri de ekleyebilirsin")}</p>
        {pinned.length > 0 && (
          <TextButton onClick={() => setEditing((v) => !v)}>{editing ? tt("Bitti") : tt("Düzenle")}</TextButton>
        )}
      </div>
      {!pinned.length ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
          <EmptyState title={tt("Kısayol yok")} hint={tt("Sık açtığın uygulamaları buraya ekle")} color={ACCENT.blue} />
          <AddButton onClick={() => setAdding(true)} />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 auto-rows-[74px] grid-cols-5 gap-1.5 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {pinned.map((a) => (
              <Tile key={a.id} app={a} editing={editing} />
            ))}
          </AnimatePresence>
          {!editing && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setAdding(true)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-white/[0.12] text-label-3 hover:border-white/25 hover:text-label-2"
            >
              <Plus size={18} strokeWidth={2.2} />
              <span className="text-[10px] font-medium">{tt("Ekle")}</span>
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-full border px-3 py-1 text-[11.5px] font-medium"
      style={{ background: `color-mix(in srgb, ${ACCENT.blue} 14%, transparent)`, borderColor: `color-mix(in srgb, ${ACCENT.blue} 38%, transparent)`, color: `color-mix(in srgb, ${ACCENT.blue} 70%, white)` }}
    >
      <Plus size={12} strokeWidth={2.6} />{tt("Uygulama ekle")}</button>
  );
}

function useIcon(path: string) {
  const [icon, setIcon] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void fileIcon(path, 48).then((i) => alive && setIcon(i));
    return () => {
      alive = false;
    };
  }, [path]);
  return icon;
}

function Tile({ app, editing }: { app: PinnedApp; editing: boolean }) {
  const icon = useIcon(app.path);
  const unpin = useNook((s) => s.unpinApp);
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, rotate: editing ? [0, -2, 2, 0] : 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.92 }}
      transition={editing ? { rotate: { duration: 0.4, repeat: Infinity }, ...spring.pop } : spring.pop}
      onClick={() => {
        if (editing) return unpin(app.id);
        void openPath(app.path);
        playAntic("wink");
      }}
      title={editing ? tt("{0} — kaldır", app.name) : app.name}
      className="relative flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-[14px] bg-well px-1 hover:bg-well-hi"
    >
      {icon ? <img src={icon} alt="" draggable={false} className="h-8 w-8 object-contain" /> : <MiniNook color={ACCENT.blue} size={30} />}
      <span className="w-full truncate text-center text-[10px] font-medium text-label-2">{app.name}</span>
      {editing && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red/90 text-white">
          <X size={9} strokeWidth={3} />
        </span>
      )}
    </motion.button>
  );
}

/** Başlat menüsündeki uygulamalardan seç. */
function Picker({ onClose }: { onClose: () => void }) {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [q, setQ] = useState("");
  const pinApp = useNook((s) => s.pinApp);
  const pinned = useNook((s) => s.pinnedApps);
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
    return all.filter((a) => !pinned.some((p) => p.path === a.path) && (!needle || a.name.toLocaleLowerCase("tr").includes(needle))).slice(0, 40);
  }, [apps, shelfDirs, q, pinned]);

  return (
    <div className="flex h-full flex-col gap-2">
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
        <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label" title={tt("Kapat")}>
          <X size={12} />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
        {list.map((a) => (
          <PickRow
            key={a.path}
            app={a}
            onPick={() => {
              pinApp({ name: a.name, path: a.path });
              playAntic("nod");
              onClose();
            }}
          />
        ))}
        {!list.length && <p className="pt-6 text-center text-[11px] text-label-3">{apps.length ? tt("Bulunamadı") : tt("Uygulamalar okunuyor…")}</p>}
      </div>
    </div>
  );
}

function PickRow({ app, onPick }: { app: AppEntry; onPick: () => void }) {
  const icon = useIcon(app.path);
  return (
    <button onClick={onPick} className="flex w-full items-center gap-2 rounded-[10px] px-2 py-1 text-left hover:bg-well-hi">
      {icon ? <img src={icon} alt="" className="h-5 w-5 object-contain" /> : <span className="h-5 w-5 rounded-md bg-well" />}
      <span className="min-w-0 flex-1 truncate text-[12px] text-label">{app.name}</span>
      <Plus size={12} className="text-label-3" />
    </button>
  );
}
