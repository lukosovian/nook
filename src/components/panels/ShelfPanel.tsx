import { useRef } from "react";
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
  Pin,
  PinOff,
  X,
  type LucideIcon,
} from "lucide-react";
import { openPath, openWith, revealPath } from "../../lib/bridge";
import { formatSize } from "../../lib/format";
import { spring } from "../../lib/motion";
import { dragOut, thumbnailSrc } from "../../lib/shelf";
import { useNook, type ShelfItem } from "../../store/nook";
import { ek, useNookName } from "../../lib/look";
import { ACCENT, EmptyState, TextButton, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

/** Bu kadar px hareket etmeden sürükleme başlamaz (tıklama ile karışmasın). */
const DRAG_THRESHOLD = 5;

export function ShelfPanel() {
  const shelf = useNook((s) => s.shelf);
  const clearShelf = useNook((s) => s.clearShelf);
  const name = useNookName();

  if (!shelf.length) {
    return <EmptyState title={tt("Raf boş")} hint={tt("Bir dosyayı {0} sürükle — kutuya dönüşüp yutar", ek(name, "a"))} color={ACCENT.teal} />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] text-label-3">{tt("{0} öğe · sürükle, çift tıkla, sağ tıkla", shelf.length)}</span>
        {shelf.some((i) => !i.pinned) && <TextButton tone="danger" onClick={clearShelf}>{tt("Temizle")}</TextButton>}
      </div>
      <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto overflow-y-hidden pb-1" onWheel={(e) => (e.currentTarget.scrollLeft += e.deltaY)}>
        <AnimatePresence initial={false}>
          {shelf.map((item) => (
            <ShelfCard key={item.id} item={item} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ShelfCard({ item }: { item: ShelfItem }) {
  const removeShelf = useNook((s) => s.removeShelf);
  const pinShelf = useNook((s) => s.pinShelf);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 0) origin.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const o = origin.current;
    if (!o || Math.hypot(e.clientX - o.x, e.clientY - o.y) < DRAG_THRESHOLD) return;
    origin.current = null;
    // Ayarlar › Raf: başka bir yere bırakılınca raftan kalksın (sabitlenen kalır)
    void dragOut(item, () => {
      const st = useNook.getState();
      if (st.settings.shelfRemoveAfterDrop && !st.shelf.find((i) => i.id === item.id)?.pinned) st.removeShelf(item.id);
    });
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
      onDoubleClick={() => void openPath(item.path).catch(() => {})}
      onContextMenu={(e) => {
        e.preventDefault();
        void revealPath(item.path);
      }}
      className="group relative flex h-full w-[92px] shrink-0 flex-col gap-1.5 rounded-[14px] bg-well p-1.5 transition-colors hover:bg-well-hi"
      style={item.pinned ? { boxShadow: `inset 0 0 0 1px ${tintBg(ACCENT.yellow, 35)}` } : undefined}
    >
      <Thumb item={item} />
      <div className="min-w-0 px-0.5 leading-tight">
        <p className="truncate text-[11px] font-medium text-label">{item.name}</p>
        <p className="mt-0.5 text-[10px] tabular-nums text-label-3">{item.isDir ? tt("Klasör") : formatSize(item.size)}</p>
      </div>

      {item.pinned && (
        <span className="absolute right-2.5 top-2.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/80 transition-opacity group-hover:opacity-0" style={{ color: tintText(ACCENT.yellow) }}>
          <Pin size={10} strokeWidth={2.4} />
        </span>
      )}
      <div className="absolute inset-x-2.5 top-2.5 flex justify-between opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex gap-1">
          <CardAction label={tt("Klasörde göster")} onClick={() => void revealPath(item.path)}>
            <FolderOpen size={10} strokeWidth={2.4} />
          </CardAction>
          {!item.isDir && (
            <CardAction label={tt("Birlikte aç")} onClick={() => void openWith(item.path)}>
              <AppWindow size={10} strokeWidth={2.4} />
            </CardAction>
          )}
        </div>
        <div className="flex gap-1">
          <CardAction label={item.pinned ? tt("Sabitlemeyi kaldır") : tt("Sabitle")} onClick={() => pinShelf(item.id, !item.pinned)}>
            {item.pinned ? <PinOff size={10} strokeWidth={2.4} /> : <Pin size={10} strokeWidth={2.4} />}
          </CardAction>
          <CardAction label={tt("Raftan kaldır")} onClick={() => removeShelf(item.id)}>
            <X size={10} strokeWidth={2.6} />
          </CardAction>
        </div>
      </div>
    </motion.div>
  );
}

function CardAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/80 text-white/80 hover:text-white"
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
    return <img src={src} alt="" draggable={false} loading="lazy" decoding="async" className="h-[96px] w-full rounded-[10px] object-cover" />;
  }
  const kind = item.isDir ? { icon: Folder, color: ACCENT.blue } : (KINDS.find((k) => k.exts.includes(item.ext)) ?? { icon: File, color: ACCENT.gray });
  const Icon = kind.icon;
  return (
    <div
      className="flex h-[96px] w-full flex-col items-center justify-center gap-1 rounded-[10px] border"
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
