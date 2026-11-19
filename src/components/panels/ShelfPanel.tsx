import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  AppWindow,
  Check,
  GripVertical,
  Pin,
  X,
  type LucideIcon,
} from "lucide-react";
import { open as pickFiles } from "@tauri-apps/plugin-dialog";
import { inspectPaths, inTauri, isPrimary, openPath, openWith, revealPath } from "../../lib/bridge";
import { formatSize } from "../../lib/format";
import { spring } from "../../lib/motion";
import { dragOut, thumbnailSrc } from "../../lib/shelf";
import { useNook, type ShelfItem } from "../../store/nook";
import { ek, useNookName } from "../../lib/look";
import { ACCENT, EmptyState, TextButton, Toggle, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { removeWithUndo } from "../../lib/undo";

/** Bu kadar px hareket etmeden sürükleme başlamaz (tıklama ile karışmasın). */
const DRAG_THRESHOLD = 5;

/** Raftan çıkarır; 5 sn "Geri al" sunar */
const dropShelf = (gone: (i: ShelfItem) => boolean, label: string) =>
  removeWithUndo(() => useNook.getState().shelf, (shelf) => useNook.setState({ shelf }), gone, label, ACCENT.teal);

/**
 * Kendiliğinden temizlik (rafın altındaki anahtar): 7 günden eski, sabitlenmemiş öğeler kalkar.
 * Açılıştan az sonra ve sonra altı saatte bir bakılır (Nook günlerce açık kalsa da günü geçen kalkar).
 */
const WEEK = 7 * 86_400_000;
function autoClean() {
  const st = useNook.getState();
  if (!st.settings.shelfAutoClean) return;
  const limit = Date.now() - WEEK;
  if (st.shelf.some((i) => !i.pinned && i.addedAt < limit)) useNook.setState({ shelf: st.shelf.filter((i) => i.pinned || i.addedAt >= limit) });
}
if (isPrimary && !(import.meta.env.DEV && new URLSearchParams(location.search).has("preview"))) {
  window.setTimeout(autoClean, 30_000);
  window.setInterval(autoClean, 6 * 3600_000);
}

/** Boş raftaki "Dosya seç": Windows'un dosya penceresinden seçilenler rafa girer */
async function chooseFiles() {
  if (!inTauri) return;
  const st = useNook.getState();
  // Dosya penceresi açıkken ada kapanmasın
  st.setHold("open-dialog", true);
  try {
    const picked = await pickFiles({ multiple: true, title: tt("Rafa konacak dosyaları seç") });
    const paths = Array.isArray(picked) ? picked : picked ? [picked] : [];
    if (paths.length) useNook.getState().addFiles(await inspectPaths(paths));
  } catch {
    // Vazgeçildi
  } finally {
    useNook.getState().setHold("open-dialog", false);
  }
}

export function ShelfPanel() {
  const shelf = useNook((s) => s.shelf);
  const autoOn = useNook((s) => s.settings.shelfAutoClean);
  const name = useNookName();
  // Çoklu seçim: Ctrl+tıkla ya da karttaki yuvarlak
  const [picked, setPicked] = useState<string[]>(() => (import.meta.env.DEV && new URLSearchParams(location.search).has("pick") ? ["s1", "s3"] : []));
  const selected = shelf.filter((i) => picked.includes(i.id));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  if (!shelf.length) {
    return (
      <EmptyState
        title={tt("Raf boş")}
        hint={tt("Bir dosyayı {0} sürükle ya da dosyayı tutup salla — yakalayıp rafa koyar", ek(name, "a"))}
        color={ACCENT.teal}
        action={{ label: tt("Dosya seç"), onClick: () => void chooseFiles() }}
      />
    );
  }

  /** Bırakılınca (Ayarlar › Raf) sabitlenmemişler raftan kalkar */
  const afterDrop = (ids: string[]) => () => {
    const st = useNook.getState();
    if (st.settings.shelfRemoveAfterDrop) useNook.setState({ shelf: st.shelf.filter((i) => i.pinned || !ids.includes(i.id)) });
  };
  /** Seçili bir kart sürüklenirse seçilenlerin hepsi birlikte gider */
  const drag = (item: ShelfItem) => {
    const items = picked.includes(item.id) && selected.length > 1 ? selected : [item];
    void dragOut(items, afterDrop(items.map((i) => i.id)));
  };
  const allPinned = selected.length > 0 && selected.every((i) => i.pinned);

  return (
    <div className="flex h-full flex-col">
      {selected.length ? (
        <div className="mb-2 flex h-[26px] items-center gap-1 rounded-full border pl-3 pr-1" style={{ background: tintBg(ACCENT.teal, 10), borderColor: tintBg(ACCENT.teal, 32) }}>
          <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold" style={{ color: tintText(ACCENT.teal) }}>
            {tt("{0} seçili", selected.length)}
          </span>
          <DragHandle onDrag={() => void dragOut(selected, afterDrop(selected.map((i) => i.id)))} />
          <TextButton
            onClick={() => {
              const ids = selected.map((i) => i.id);
              useNook.setState((s) => ({ shelf: s.shelf.map((i) => (ids.includes(i.id) ? { ...i, pinned: !allPinned } : i)) }));
            }}
          >
            {allPinned ? tt("Sabitlemeyi kaldır") : tt("Sabitle")}
          </TextButton>
          <TextButton
            tone="danger"
            onClick={() => {
              dropShelf((i) => picked.includes(i.id), tt("{0} dosya raftan kaldırıldı", selected.length));
              setPicked([]);
            }}
          >
            {tt("Kaldır")}
          </TextButton>
          <button onClick={() => setPicked([])} title={tt("Seçimi bırak")} aria-label={tt("Seçimi bırak")} className="flex h-5 w-5 items-center justify-center rounded-full text-label-3 hover:bg-white/10 hover:text-label">
            <X size={11} strokeWidth={2.6} />
          </button>
        </div>
      ) : (
        <div className="mb-2 flex h-[26px] items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[12px] font-bold text-label">
            {tt("{0} dosya", shelf.length)}
            <span className="ml-1.5 text-[10.5px] font-medium text-label-3">{formatSize(shelf.reduce((a, i) => a + i.size, 0))}</span>
          </span>
          {shelf.some((i) => !i.pinned) && (
            <TextButton tone="danger" onClick={() => dropShelf((i) => !i.pinned, tt("Raf temizlendi"))}>
              {tt("Temizle")}
            </TextButton>
          )}
        </div>
      )}
      <div className="flex min-h-0 flex-1 items-center gap-2 overflow-x-auto overflow-y-hidden pb-1" onWheel={(e) => (e.currentTarget.scrollLeft += e.deltaY)}>
        <AnimatePresence initial={false}>
          {shelf.map((item) => (
            <ShelfCard key={item.id} item={item} picked={picked.includes(item.id)} onPick={() => toggle(item.id)} onDrag={() => drag(item)} />
          ))}
        </AnimatePresence>
      </div>
      <div className="mt-1.5 flex items-center gap-2 px-0.5 text-[10.5px] text-label-3">
        <p className="min-w-0 flex-1 truncate">{tt("Sürükle, çift tıkla aç, Ctrl+tıkla seç · telefondan gönderilenler de buraya düşer")}</p>
        <label className="flex shrink-0 items-center gap-1.5 text-label-2" title={tt("7 günden eski, sabitlenmemiş dosyalar raftan kendiliğinden kalkar (dosyanın kendisi silinmez)")}>
          <Toggle on={autoOn} onChange={(v) => useNook.getState().updateSettings({ shelfAutoClean: v })} color={ACCENT.teal} />
          {tt("7 günden eskileri kaldır")}
        </label>
      </div>
    </div>
  );
}

/** "Birlikte sürükle": basılı tutup çekince seçilenlerin hepsi tek sürüklemede gider */
function DragHandle({ onDrag }: { onDrag: () => void }) {
  const origin = useRef<{ x: number; y: number } | null>(null);
  return (
    <span
      onPointerDown={(e) => (origin.current = { x: e.clientX, y: e.clientY })}
      onPointerMove={(e) => {
        const o = origin.current;
        if (!o || Math.hypot(e.clientX - o.x, e.clientY - o.y) < DRAG_THRESHOLD) return;
        origin.current = null;
        onDrag();
      }}
      onPointerUp={() => (origin.current = null)}
      onPointerLeave={() => (origin.current = null)}
      title={tt("Basılı tutup sürükle: seçilenlerin hepsi birlikte taşınır")}
      className="flex h-[22px] shrink-0 cursor-grab items-center gap-1 rounded-full border px-2 text-[11px] font-semibold"
      style={{ background: tintBg(ACCENT.teal, 16), borderColor: tintBg(ACCENT.teal, 42), color: tintText(ACCENT.teal) }}
    >
      <GripVertical size={11} strokeWidth={2.4} />
      {tt("Birlikte sürükle")}
    </span>
  );
}

function ShelfCard({ item, picked, onPick, onDrag }: { item: ShelfItem; picked: boolean; onPick: () => void; onDrag: () => void }) {
  const pinShelf = useNook((s) => s.pinShelf);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 0 && !e.ctrlKey) origin.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const o = origin.current;
    if (!o || Math.hypot(e.clientX - o.x, e.clientY - o.y) < DRAG_THRESHOLD) return;
    origin.current = null;
    onDrag();
  };
  const reset = () => (origin.current = null);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.6, y: -12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.6 }}
      whileHover={{ y: -2 }}
      transition={spring.pop}
      title={item.path}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={reset}
      onPointerLeave={reset}
      onClick={(e) => e.ctrlKey && onPick()}
      onDoubleClick={() => void openPath(item.path).catch(() => {})}
      onContextMenu={(e) => {
        e.preventDefault();
        void revealPath(item.path);
      }}
      className="group relative flex h-full max-h-[210px] w-[104px] shrink-0 flex-col gap-1.5 rounded-tile border border-white/[0.06] bg-white/[0.035] p-1.5 transition-colors hover:bg-well-hi"
      style={picked ? { boxShadow: `inset 0 0 0 1.5px ${ACCENT.teal}`, background: tintBg(ACCENT.teal, 10) } : item.pinned ? { boxShadow: `inset 0 0 0 1px ${tintBg(ACCENT.yellow, 35)}` } : undefined}
    >
      <Thumb item={item} />
      <div className="min-w-0 px-0.5 leading-tight">
        <p className="truncate text-[11px] font-medium text-label">{item.name}</p>
        <p className="mt-0.5 text-[10.5px] tabular-nums text-label-3">{item.isDir ? tt("Klasör") : formatSize(item.size)}</p>
      </div>

      {/* Seç, sabitle, kaldır hep görünür (soluk); klasörde göster ve birlikte aç üzerine gelince */}
      <div className="absolute inset-x-2.5 top-2.5 flex justify-between">
        <CardAction label={picked ? tt("Seçimi kaldır") : tt("Seç")} onClick={onPick} lit={picked} color={ACCENT.teal} pressed={picked}>
          {picked && <Check size={10} strokeWidth={3.2} />}
        </CardAction>
        <div className="flex gap-1">
          <CardAction label={item.pinned ? tt("Sabitlemeyi kaldır") : tt("Sabitle")} onClick={() => pinShelf(item.id, !item.pinned)} lit={item.pinned} color={ACCENT.yellow}>
            <Pin size={10} strokeWidth={2.4} fill={item.pinned ? "currentColor" : "none"} />
          </CardAction>
          <CardAction label={tt("Raftan kaldır")} onClick={() => dropShelf((i) => i.id === item.id, tt("{0} raftan kaldırıldı", item.name))}>
            <X size={10} strokeWidth={2.6} />
          </CardAction>
        </div>
      </div>
      <div className="absolute right-2.5 top-[32px] flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <CardAction label={tt("Klasörde göster")} onClick={() => void revealPath(item.path)} lit>
          <FolderOpen size={10} strokeWidth={2.4} />
        </CardAction>
        {!item.isDir && (
          <CardAction label={tt("Birlikte aç")} onClick={() => void openWith(item.path)} lit>
            <AppWindow size={10} strokeWidth={2.4} />
          </CardAction>
        )}
      </div>
    </motion.div>
  );
}

/** Karttaki küçük yuvarlak düğme: soluk durur, kartın üzerine gelince ya da odaklanınca (ya da `lit`) belirginleşir */
function CardAction({ label, onClick, lit, color, pressed, children }: { label: string; onClick: () => void; lit?: boolean; color?: string; pressed?: boolean; children?: React.ReactNode }) {
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/25 bg-black/80 text-white/80 transition-opacity hover:text-white focus-visible:opacity-100 group-hover:opacity-100 ${lit ? "" : "opacity-50"}`}
      style={lit && color ? { color: tintText(color), borderColor: tintBg(color, 70) } : undefined}
    >
      {children}
    </button>
  );
}

/** Dosya türüne göre renk + ikon (görsel değilse). */
const KINDS: { exts: string[]; icon: LucideIcon; color: string }[] = [
  { exts: ["pdf"], icon: FileText, color: ACCENT.red },
  { exts: ["doc", "docx", "odt", "rtf", "txt", "md"], icon: FileText, color: ACCENT.blue },
  { exts: ["xls", "xlsx", "csv", "ods"], icon: FileSpreadsheet, color: ACCENT.green },
  { exts: ["zip", "rar", "7z", "tar", "gz"], icon: FileArchive, color: ACCENT.orange },
  { exts: ["mp3", "wav", "flac", "ogg", "m4a"], icon: FileAudio, color: ACCENT.pink },
  { exts: ["mp4", "mkv", "mov", "avi", "webm"], icon: FileVideo, color: ACCENT.purple },
  { exts: ["js", "ts", "tsx", "py", "rs", "json", "html", "css", "cpp", "c", "cs", "java"], icon: FileCode, color: ACCENT.teal },
];

function Thumb({ item }: { item: ShelfItem }) {
  const src = thumbnailSrc(item);
  if (src) {
    return <img src={src} alt="" draggable={false} loading="lazy" decoding="async" className="min-h-0 w-full flex-1 rounded-row object-cover" />;
  }
  const kind = item.isDir ? { icon: Folder, color: ACCENT.blue } : (KINDS.find((k) => k.exts.includes(item.ext)) ?? { icon: File, color: ACCENT.gray });
  const Icon = kind.icon;
  return (
    <div
      className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-1 rounded-row border"
      style={{ background: `color-mix(in srgb, ${kind.color} 12%, transparent)`, borderColor: `color-mix(in srgb, ${kind.color} 25%, transparent)` }}
    >
      <Icon size={24} strokeWidth={1.8} style={{ color: kind.color }} />
      {item.ext && !item.isDir && (
        <span lang="en" className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: kind.color }}>
          {item.ext}
        </span>
      )}
    </div>
  );
}
