import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { File, FileArchive, FileAudio, FileCode, FileImage, FileSpreadsheet, FileText, FileVideo, Folder, Pin, Plus, X, type LucideIcon } from "lucide-react";
import { cached, getShelf, removeShelf, shelfImage, type Pairing, type ShelfItem } from "../lib/pc";
import { native, onNative } from "../lib/native";
import { errText, tintBg, tintText, TopBar, useBackButton, useToast } from "../ui";
import type { Conn } from "../App";

const TEAL = "#2FD4C0";

const KINDS: [RegExp, LucideIcon][] = [
  [/^(zip|rar|7z|tar|gz)$/, FileArchive],
  [/^(mp3|wav|flac|m4a|ogg|aac)$/, FileAudio],
  [/^(mp4|mkv|mov|avi|webm)$/, FileVideo],
  [/^(xls|xlsx|csv|ods)$/, FileSpreadsheet],
  [/^(js|ts|tsx|py|rs|json|html|css|c|cpp|java|kt)$/, FileCode],
  [/^(pdf|doc|docx|txt|md|rtf|odt|ppt|pptx)$/, FileText],
];

const iconOf = (i: ShelfItem) => (i.isDir ? Folder : i.isImage ? FileImage : (KINDS.find(([re]) => re.test(i.ext.toLowerCase()))?.[1] ?? File));

function size(n: number) {
  if (n <= 0) return "";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;
}

/** Raf: PC'deki raftaki dosyalar. Dokun → telefona indir ve aç; ✕ → raftan kaldır; + → telefondan dosya gönder (PC'de rafa düşer) */
export function ShelfScreen({ pairing, conn, onBack }: { pairing: Pairing; conn: Conn; onBack: () => void }) {
  useBackButton(onBack);
  const online = conn === "online";
  const [toast, say] = useToast();
  const [items, setItems] = useState<ShelfItem[] | null>(() => cached<ShelfItem[]>("shelf"));
  // İnen dosya: id → yüzde (bitince silinir)
  const [progress, setProgress] = useState<Record<string, number>>({});

  const load = () =>
    getShelf(pairing)
      .then(setItems)
      .catch((e) => (cached("shelf") ? undefined : say(errText(e))));
  useEffect(() => {
    if (!online) return;
    void load();
    // PC'de rafa bir şey atılınca liste kendiliğinden yenilensin
    const t = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairing, online]);

  useEffect(
    () =>
      onNative("download", (d) => {
        const id = String(d.id);
        if (d.error || d.done) {
          setProgress(({ [id]: _, ...rest }) => rest);
          if (d.error) say(String(d.error));
          else say("İndirilenler › Nook'a kaydedildi");
        } else {
          const pct = Number(d.size) > 0 ? Math.round((Number(d.sent) / Number(d.size)) * 100) : 0;
          setProgress((p) => ({ ...p, [id]: pct }));
        }
      }),
    [say],
  );

  const open = (i: ShelfItem) => {
    if (!online) return say("Dosya PC'de: PC açılınca indirebilirsin");
    if (i.isDir) return say("Klasörler telefona indirilemiyor");
    if (i.id in progress) return;
    if (!native) return say("Yalnızca telefonda");
    setProgress((p) => ({ ...p, [i.id]: 0 }));
    native.downloadShelf(i.id, i.name);
  };

  const remove = async (i: ShelfItem) => {
    setItems((list) => list?.filter((x) => x.id !== i.id) ?? null);
    try {
      await removeShelf(pairing, i.id);
    } catch (e) {
      say(errText(e));
      void load();
    }
  };

  return (
    <div className="safe flex min-h-screen flex-col gap-4 px-4 pb-6">
      <TopBar
        title="Raf"
        nook="shelf"
        onBack={() => history.back()}
        right={
          online && native ? (
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => native?.pickFiles()} className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: tintBg(TEAL, 22), color: tintText(TEAL) }}>
              <Plus size={20} />
            </motion.button>
          ) : undefined
        }
      />
      <p className="-mt-1 px-1 text-[13px] leading-snug text-label-3">PC'deki rafın: dokun, telefona inip açılsın. + ile telefondan dosya gönder, PC'de rafa düşer.</p>

      {items && items.length === 0 && (
        <div className="mt-10 flex flex-col items-center gap-2 text-center">
          <p className="text-[15px] font-semibold text-label-2">Raf boş</p>
          <p className="max-w-[260px] text-[13px] text-label-3">PC'de bir dosyayı Nook'a sürükle ya da buradan + ile telefondan gönder.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {(items ?? []).map((i) => (
            <motion.div key={i.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} className="flex items-center gap-3 rounded-2xl bg-card p-2.5 active:bg-well" onClick={() => open(i)}>
              <Thumb pairing={pairing} item={i} online={online} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 truncate text-[14.5px] font-medium">
                  {i.pinned && <Pin size={12} className="shrink-0" style={{ color: tintText(TEAL) }} />}
                  <span className="truncate">{i.name}</span>
                </span>
                <span className="block text-[12px] text-label-3">{i.id in progress ? `İndiriliyor · %${progress[i.id]}` : i.isDir ? "Klasör" : size(i.size)}</span>
                {i.id in progress && (
                  <span className="mt-1 block h-[3px] overflow-hidden rounded-full bg-well">
                    <span className="block h-full rounded-full transition-[width]" style={{ width: `${progress[i.id]}%`, background: TEAL }} />
                  </span>
                )}
              </span>
              {online && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void remove(i);
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-label-3 active:bg-well-hi"
                  aria-label="Raftan kaldır"
                >
                  <X size={17} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {toast}
    </div>
  );
}

/** Görselse küçük resmi, değilse dosya türünün simgesi */
function Thumb({ pairing, item, online }: { pairing: Pairing; item: ShelfItem; online: boolean }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    // Çok büyük görseller küçük resim için indirilmez
    if (!item.isImage || !online || item.size > 8 * 1024 * 1024) return;
    let url: string | null = null;
    let alive = true;
    void shelfImage(pairing, item.id)
      .then((u) => {
        url = u;
        if (alive) setSrc(u);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [pairing, item.id, item.isImage, item.size, online]);
  const Icon = iconOf(item);
  return src ? (
    <img src={src} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
  ) : (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: tintBg(TEAL, 16), color: tintText(TEAL) }}>
      <Icon size={20} />
    </span>
  );
}
