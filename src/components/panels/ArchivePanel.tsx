import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronRight, File, FileArchive, FileImage, FileText, FileVideo, Folder, Loader2, Lock, Music, Package } from "lucide-react";
import { archiveExtract, inspectPaths, openPath, type ArchiveEntry } from "../../lib/bridge";
import { formatSize } from "../../lib/format";
import { dragPath } from "../../lib/shelf";
import { useNook } from "../../store/nook";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

const COLOR = ACCENT.orange;
/** Bu kadar (px) oynayınca sürükleme başlar; daha azı tıklama */
const DRAG_SLOP = 5;

function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (/^(png|jpe?g|gif|webp|bmp|svg|ico|heic)$/.test(ext)) return FileImage;
  if (/^(mp4|mkv|mov|avi|webm)$/.test(ext)) return FileVideo;
  if (/^(mp3|wav|flac|ogg|m4a)$/.test(ext)) return Music;
  if (/^(zip|rar|7z|tar|gz)$/.test(ext)) return FileArchive;
  if (/^(exe|msi)$/.test(ext)) return Package;
  if (/^(txt|md|pdf|docx?|xlsx?|pptx?|csv|json|log)$/.test(ext)) return FileText;
  return File;
}

/**
 * Arşivin içi: adaya bırakılan .zip / .rar açılmadan gezilir. Bir dosyayı ya da klasörü tutup
 * sürükle — o an geçici klasöre çıkarılır ve bıraktığın yere (masaüstü, Discord, klasör) gider.
 * Çift tıkla: çıkarıp aç.
 */
export function ArchivePanel() {
  const archive = useNook((s) => s.archive);
  const [dir, setDir] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const press = useRef<{ entry: ArchiveEntry; x: number; y: number; started: boolean } | null>(null);

  const children = useMemo(() => {
    if (!archive) return [];
    const prefix = dir ? `${dir}/` : "";
    return archive.entries
      .filter((e) => e.path.startsWith(prefix) && e.path.length > prefix.length && !e.path.slice(prefix.length).includes("/"))
      .sort((a, b) => Number(b.dir) - Number(a.dir) || a.path.localeCompare(b.path, "tr"));
  }, [archive, dir]);

  if (!archive) {
    return <p className="py-6 text-center text-[11.5px] text-label-3">{tt("Bir .zip ya da .rar dosyasını adanın üstüne bırak, açmadan içine bakalım")}</p>;
  }

  const name = archive.path.split(/[\\/]/).pop() ?? archive.path;
  const files = archive.entries.filter((e) => !e.dir);
  const total = files.reduce((a, e) => a + e.size, 0);
  const crumbs = dir ? dir.split("/") : [];
  const count = (e: ArchiveEntry) => archive.entries.filter((x) => !x.dir && x.path.startsWith(`${e.path}/`)).length;

  const extract = async (e: ArchiveEntry) => {
    setError(null);
    setBusy(e.path);
    try {
      return await archiveExtract(archive.path, e.path);
    } catch (err) {
      setError(String(err));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const startDrag = async (e: ArchiveEntry) => {
    if (e.encrypted) return setError(tt("Şifreli dosya — Nook şifreli arşivleri açamıyor"));
    const p = await extract(e);
    if (p) await dragPath(p).catch((err) => setError(String(err)));
  };

  const open = async (e: ArchiveEntry) => {
    if (e.dir) return setDir(e.path);
    if (e.encrypted) return setError(tt("Şifreli dosya — Nook şifreli arşivleri açamıyor"));
    const p = await extract(e);
    if (p) void openPath(p);
  };

  const addToShelf = async () => {
    const st = useNook.getState();
    st.addFiles(await inspectPaths([archive.path]));
    st.setTab("shelf");
  };

  return (
    <div className="flex h-full flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <FileArchive size={15} style={{ color: tintText(COLOR) }} className="shrink-0" />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[12px] font-medium text-label">{name}</span>
          <span className="block text-[10px] text-label-3">
            {archive.kind.toUpperCase()} · {tt("{0} dosya · {1} · tut, sürükle", files.length, formatSize(total))}</span>
        </span>
        <button
          onClick={() => void addToShelf()}
          className="shrink-0 rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium"
          style={{ background: tintBg(COLOR, 14), borderColor: tintBg(COLOR, 36), color: tintText(COLOR) }}
        >{tt("Rafa ekle")}</button>
      </div>

      {/* Neredeyiz */}
      <div className="flex min-w-0 items-center gap-0.5 text-[10.5px]">
        <button onClick={() => setDir("")} className={`shrink-0 rounded px-1 ${dir ? "text-label-3 hover:text-label" : "text-label"}`}>
          {name}
        </button>
        {crumbs.map((c, i) => (
          <span key={i} className="flex min-w-0 items-center gap-0.5">
            <ChevronRight size={10} className="shrink-0 text-label-3" />
            <button onClick={() => setDir(crumbs.slice(0, i + 1).join("/"))} className={`truncate rounded px-1 ${i === crumbs.length - 1 ? "text-label" : "text-label-3 hover:text-label"}`}>
              {c}
            </button>
          </span>
        ))}
      </div>

      <div className="-mr-1.5 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1.5">
        {children.map((e, i) => {
          const base = e.path.split("/").pop()!;
          const Icon = e.dir ? Folder : iconFor(base);
          return (
            <motion.div
              key={e.path}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 12) * 0.015 }}
              onPointerDown={(ev) => {
                if (ev.button !== 0) return;
                press.current = { entry: e, x: ev.clientX, y: ev.clientY, started: false };
              }}
              onPointerMove={(ev) => {
                const p = press.current;
                if (!p || p.started || p.entry !== e || ev.buttons !== 1) return;
                if (Math.hypot(ev.clientX - p.x, ev.clientY - p.y) < DRAG_SLOP) return;
                p.started = true;
                void startDrag(e);
              }}
              onPointerUp={() => {
                const p = press.current;
                press.current = null;
                // Klasöre tek tık: içine gir
                if (p && !p.started && e.dir) setDir(e.path);
              }}
              onDoubleClick={() => void open(e)}
              title={e.encrypted ? tt("Şifreli") : e.dir ? tt("Tıkla: içine gir · sürükle: klasörü çıkar") : tt("Sürükle: dışarı al · çift tıkla: aç")}
              className="flex cursor-grab select-none items-center gap-2 rounded-[10px] px-2 py-1 hover:bg-well active:cursor-grabbing"
            >
              <Icon size={14} className="shrink-0" style={{ color: e.dir ? tintText(ACCENT.yellow) : "var(--color-label-2)" }} />
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-label">{base}</span>
              {e.encrypted && <Lock size={11} className="shrink-0 text-label-3" />}
              {busy === e.path ? (
                <Loader2 size={12} className="shrink-0 animate-spin text-label-3" />
              ) : (
                <span className="shrink-0 text-[10px] tabular-nums text-label-3">{e.dir ? `${count(e)} dosya` : formatSize(e.size)}</span>
              )}
            </motion.div>
          );
        })}
      </div>
      {error && (
        <p className="truncate text-[10px] text-red/90" title={error}>
          {error}
        </p>
      )}
    </div>
  );
}
