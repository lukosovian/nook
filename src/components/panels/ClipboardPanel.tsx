import { useEffect, useRef, useState } from "react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Files, Languages, Pencil, Pin, Pipette, Search, X } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { playAntic } from "../../hooks/useAntics";
import { clipboardWriteFiles, clipboardWriteImage, copyText, inTauri, setInteractive } from "../../lib/bridge";
import { spring } from "../../lib/motion";
import { useNook, type ClipItem, type Settings } from "../../store/nook";
import { ACCENT, EmptyState, TextButton, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

/** "#3A7BFF" → Ayarlar'daki biçim: HEX (# ile/olmadan), rgb() ya da hsl() */
export function formatColor(hex: string, fmt: Settings["colorFormat"], noHash: boolean): string {
  const h = hex.replace("#", "");
  if (fmt === "hex" || h.length !== 6) return noHash ? h : `#${h}`;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (fmt === "rgb") return `rgb(${r}, ${g}, ${b})`;
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let hue = 0;
  if (d) hue = max === rr ? ((gg - bb) / d) % 6 : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  hue = Math.round(hue * 60 + 360) % 360;
  return `hsl(${hue}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

export function ClipboardPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("clip", scroller);
  const clips = useNook((s) => s.clips);
  const clearClips = useNook((s) => s.clearClips);
  const removeClip = useNook((s) => s.removeClip);
  const fmt = useNook((s) => s.settings.colorFormat ?? "hex");
  const noHash = useNook((s) => s.settings.colorNoHash ?? false);
  const [copied, setCopied] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const flash = (key: string) => {
    setCopied(key);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 1000);
  };
  const copy = async (c: ClipItem, translation = false) => {
    if (c.kind === "image" && c.path) await clipboardWriteImage(c.path);
    else if (c.kind === "files" && c.paths) await clipboardWriteFiles(c.paths);
    else await copyText(translation && c.translation ? c.translation : c.color ? formatColor(c.color, fmt, noHash) : c.text);
    flash(translation ? `${c.id}-tr` : c.id);
  };

  const q = query.trim().toLocaleLowerCase("tr");
  const match = (c: ClipItem) => !q || [c.text, c.translation, c.app].some((x) => x?.toLocaleLowerCase("tr").includes(q));
  const colors = clips.filter((c) => c.color && match(c));
  // Sabitlenenler başta
  const items = clips.filter((c) => !c.color && match(c)).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  const unpinned = clips.some((c) => !c.pinned);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 items-center gap-1.5">
        <label className="flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-full bg-well px-2.5 focus-within:bg-well-hi">
          <Search size={11} strokeWidth={2.6} className="shrink-0 text-label-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder={tt("Panoda ara")}
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-[11.5px] text-label outline-none placeholder:text-label-3"
          />
        </label>
        <PickColor />
        {unpinned && (
          <TextButton tone="danger" onClick={clearClips}>{tt("Temizle")}</TextButton>
        )}
      </div>

      {!clips.length ? (
        <EmptyState title={tt("Pano boş")} hint={tt("Kopyaladığın metinler, görseller, dosyalar ve renkler burada birikir")} color={ACCENT.purple} />
      ) : !colors.length && !items.length ? (
        <p className="pt-6 text-center text-[11px] text-label-3">{tt("Eşleşen kayıt yok")}</p>
      ) : (
        <div ref={scroller} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {colors.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence initial={false}>
                {colors.map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={spring.pop}
                    className="group flex h-7 items-center rounded-full border"
                    style={{ background: tintBg(c.color!, 12), borderColor: tintBg(c.color!, 35) }}
                  >
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      transition={spring.pop}
                      onClick={() => copy(c)}
                      title={tt("{0} — kopyala", formatColor(c.color!, fmt, noHash))}
                      className="flex h-full items-center gap-1.5 py-1 pl-1 pr-1.5"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: c.color!, boxShadow: `0 0 8px -1px ${c.color}` }}>
                        <AnimatePresence>
                          {copied === c.id && (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                              <Check size={11} strokeWidth={3.5} className="text-white mix-blend-difference" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                      <span className="font-mono text-[11px] font-medium" style={{ color: tintText(c.color!) }}>
                        {c.color}
                      </span>
                    </motion.button>
                    {/* Sil: üzerine gelince belirir */}
                    <button
                      onClick={() => removeClip(c.id)}
                      title={tt("Rengi sil")}
                      className="mr-1 flex h-4 w-4 items-center justify-center rounded-full text-label-3 opacity-40 transition hover:bg-white/10 hover:text-label group-hover:opacity-100"
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {items.map((c) =>
                editing === c.id ? (
                  <EditRow key={c.id} clip={c} onDone={() => setEditing(null)} />
                ) : (
                  <ClipRow key={c.id} clip={c} copied={copied} onCopy={copy} onEdit={() => setEditing(c.id)} />
                ),
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

function ClipRow({ clip: c, copied, onCopy, onEdit }: { clip: ClipItem; copied: string | null; onCopy: (c: ClipItem, tr?: boolean) => void; onEdit: () => void }) {
  const { pinClip, removeClip } = useNook.getState();
  const kind = c.kind ?? "text";
  const tip = c.app ? `${kind === "files" ? (c.paths ?? []).join("\n") : c.text}\n— ${c.app}` : kind === "files" ? (c.paths ?? []).join("\n") : c.text;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={spring.pop}
      className="group overflow-hidden rounded-[10px] bg-well"
      style={c.pinned ? { boxShadow: `inset 0 0 0 1px ${tintBg(ACCENT.yellow, 30)}` } : undefined}
    >
      <div className="flex items-center transition-colors hover:bg-well-hi">
        <button onClick={() => onCopy(c)} title={tip} className={`flex min-w-0 flex-1 items-center gap-2 pl-2.5 text-left ${kind === "image" ? "h-12" : "h-8"}`}>
          {kind === "image" && c.path && inTauri && (
            <img src={convertFileSrc(c.path)} alt="" draggable={false} className="h-9 w-14 shrink-0 rounded-[6px] object-cover" />
          )}
          {kind === "files" && <Files size={13} strokeWidth={2.2} className="shrink-0" style={{ color: tintText(ACCENT.teal) }} />}
          <span className="min-w-0 flex-1 truncate text-[12px] text-label">
            {kind === "image" ? tt("Görsel · {0}", c.text) : kind === "files" ? ((c.paths?.length ?? 0) > 1 ? tt("{0} dosya · {1}", c.paths!.length, c.text) : c.text) : c.text.replace(/\s+/g, " ")}
          </span>
          {copied === c.id && <Check size={13} strokeWidth={3} style={{ color: ACCENT.green }} className="shrink-0" />}
        </button>
        {/* Üzerine gelince: sabitle, düzenle, sil */}
        <div className="flex shrink-0 items-center pr-1">
          <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
            {kind === "text" && (
              <RowAction label={tt("Önizle ve düzenle")} onClick={onEdit}>
                <Pencil size={11} strokeWidth={2.4} />
              </RowAction>
            )}
            <RowAction label={tt("Sil")} onClick={() => removeClip(c.id)}>
              <X size={11} strokeWidth={2.6} />
            </RowAction>
          </div>
          {/* Sabitliyse iğne hep görünür (tıkla: kaldır); değilse üzerine gelince */}
          <div className={c.pinned ? "" : "opacity-0 transition-opacity group-hover:opacity-100"}>
            <RowAction label={c.pinned ? tt("Sabitlemeyi kaldır") : tt("Sabitle")} onClick={() => pinClip(c.id, !c.pinned)} color={c.pinned ? ACCENT.yellow : undefined}>
              <Pin size={11} strokeWidth={2.4} fill={c.pinned ? "currentColor" : "none"} />
            </RowAction>
          </div>
        </div>
      </div>
      {c.translation && (
        <button
          onClick={() => onCopy(c, true)}
          title={tt("{0} — çeviriyi kopyala", c.translation)}
          className="group/tr flex h-7 w-full items-center gap-2 border-t border-white/[0.05] px-2.5 text-left transition-colors hover:bg-well-hi"
        >
          <Languages size={11} strokeWidth={2.4} className="shrink-0" style={{ color: ACCENT.purple }} />
          <span className="min-w-0 flex-1 truncate text-[11.5px]" style={{ color: tintText(ACCENT.purple) }}>
            {c.translation}
          </span>
          {copied === `${c.id}-tr` ? (
            <Check size={13} strokeWidth={3} style={{ color: ACCENT.green }} />
          ) : (
            <Copy size={12} strokeWidth={2.2} className="text-label-3 opacity-0 transition-opacity group-hover/tr:opacity-100" />
          )}
        </button>
      )}
    </motion.div>
  );
}

function RowAction({ label, onClick, color, children }: { label: string; onClick: () => void; color?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded-full text-label-3 hover:bg-white/10 hover:text-label"
      style={color ? { color: tintText(color) } : undefined}
    >
      {children}
    </button>
  );
}

/** Kaydın tamamı: okunur, düzenlenir; kaydedince geçmişteki kayıt değişir, Kopyala panoya koyar */
function EditRow({ clip, onDone }: { clip: ClipItem; onDone: () => void }) {
  const [text, setText] = useState(clip.text);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => ref.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, []);
  const save = () => {
    if (text.trim() && text !== clip.text) useNook.getState().editClip(clip.id, text);
    onDone();
  };
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1 rounded-[10px] bg-well-hi p-1.5">
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone();
          if (e.key === "Enter" && e.ctrlKey) save();
        }}
        spellCheck={false}
        rows={Math.min(7, Math.max(3, text.split("\n").length))}
        className="w-full resize-none rounded-[8px] bg-black/30 p-2 text-[11.5px] leading-relaxed text-label outline-none"
      />
      <div className="flex justify-end gap-1">
        <TextButton onClick={onDone}>{tt("İptal")}</TextButton>
        <TextButton
          onClick={() => {
            void copyText(text);
            save();
          }}
        >
          {tt("Kopyala")}
        </TextButton>
        <TextButton onClick={save}>{tt("Kaydet")}</TextButton>
      </div>
    </motion.div>
  );
}

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

/** Ekranın herhangi bir yerinden renk al → Ayarlar'daki biçimde panoya kopyala ve renk havuzuna ekle. */
function PickColor() {
  const ED = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
  if (!ED) return null;
  const pick = async () => {
    // Seçerken imleç adanın dışına çıkar: ada açık ve pencere tıklanabilir kalsın, yoksa seçici kapanır
    const st = useNook.getState();
    st.setHold("eyedropper", true);
    await setInteractive(true);
    try {
      const { sRGBHex } = await new ED().open();
      const hex = sRGBHex.toUpperCase();
      const { colorFormat, colorNoHash } = useNook.getState().settings;
      await copyText(formatColor(hex, colorFormat ?? "hex", colorNoHash ?? false));
      useNook.getState().pushClip(hex);
      playAntic("wink");
    } catch {
      // Esc ile vazgeçildi
    } finally {
      useNook.getState().setHold("eyedropper", false);
      void setInteractive(false);
    }
  };
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={spring.pop}
      onClick={() => void pick()}
      title={tt("Ekrandan renk seç")}
      className="flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium"
      style={{ background: tintBg(ACCENT.purple, 14), borderColor: tintBg(ACCENT.purple, 38), color: tintText(ACCENT.purple) }}
    >
      <Pipette size={11} strokeWidth={2.6} />{tt("Renk")}</motion.button>
  );
}
