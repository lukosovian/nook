import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Eye, PenLine, Plus, X } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { playAntic } from "../../hooks/useAntics";
import { copyText, inTauri, saveText } from "../../lib/bridge";
import { spring } from "../../lib/motion";
import { useNook, type Pad } from "../../store/nook";
import { ACCENT, TextButton, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

const COLOR = ACCENT.yellow;

/** Karalama defteri: sekmeler (en fazla 8), kendiliğinden kaydedilir; biçimli önizleme ve dosyaya kaydetme. */
export function ScratchPanel() {
  const note = useNook((s) => s.note);
  const setNote = useNook((s) => s.setNote);
  const pads = useNook((s) => s.pads);
  const padId = useNook((s) => s.padId);
  const pad = pads.find((p) => p.id === padId) ?? pads[0];
  const [preview, setPreview] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Ada açılma animasyonu bitince imleci içine koy (pencere odağını çalmaz).
  useEffect(() => {
    if (preview) return;
    const t = window.setTimeout(() => ref.current?.focus(), 140);
    return () => window.clearTimeout(t);
  }, [padId, preview]);

  const saveFile = async () => {
    if (!inTauri || !note) return;
    const st = useNook.getState();
    // Kayıt penceresi açıkken ada kapanmasın
    st.setHold("save-dialog", true);
    try {
      const path = await save({ defaultPath: `${pad.title}.md`, filters: [{ name: tt("Metin"), extensions: ["md", "txt"] }] });
      if (path) {
        await saveText(path, note);
        useNook.getState().pushToast({ kind: "chat", title: tt("Kaydedildi"), detail: path.split(/[\\/]/).pop() ?? path, ms: 3000 });
      }
    } catch (e) {
      useNook.getState().pushToast({ kind: "chat", title: tt("Dosya kaydedilemedi"), detail: String(e), ms: 4000 });
    } finally {
      useNook.getState().setHold("save-dialog", false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-1.5">
      <Tabs pads={pads} active={pad.id} />
      {preview ? (
        <div
          onDoubleClick={() => setPreview(false)}
          className="min-h-0 flex-1 overflow-y-auto rounded-[14px] bg-well p-3 text-[12.5px] leading-relaxed text-label"
          title={tt("Düzenlemek için çift tıkla")}
        >
          {note.trim() ? <Markdown text={note} /> : <p className="text-label-3">{tt("Boş")}</p>}
        </div>
      ) : (
        <textarea
          ref={ref}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            // Yazarken Nook da kâğıt-kalemle not alır
            playAntic("note");
          }}
          onKeyDown={(e) => e.key === "Escape" && setNote("")}
          spellCheck={false}
          placeholder={tt("Aklından geçeni yaz… (# başlık, **kalın**, - liste)")}
          className="min-h-0 flex-1 resize-none rounded-[14px] bg-well p-3 text-[13px] leading-relaxed text-label outline-none transition-colors placeholder:text-label-3 focus:bg-well-hi"
        />
      )}
      <div className="flex items-center justify-between">
        <span className="truncate text-[10px] text-label-3" title={tt("Kendiliğinden kaydedilir")}>{note.length ? `${note.length} karakter · ` : ""}{tt("Esc temizler")}</span>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label={preview ? tt("Düzenle") : tt("Biçimli önizle")} onClick={() => setPreview((p) => !p)} on={preview}>
            {preview ? <PenLine size={12} strokeWidth={2.4} /> : <Eye size={12} strokeWidth={2.4} />}
          </IconButton>
          {inTauri && (
            <IconButton label={tt("Dosyaya kaydet")} onClick={() => void saveFile()} disabled={!note}>
              <Download size={12} strokeWidth={2.4} />
            </IconButton>
          )}
          <TextButton disabled={!note} onClick={() => void copyText(note)}>{tt("Kopyala")}</TextButton>
          <TextButton tone="danger" disabled={!note} onClick={() => setNote("")}>{tt("Temizle")}</TextButton>
        </div>
      </div>
    </div>
  );
}

function IconButton({ label, onClick, disabled, on, children }: { label: string; onClick: () => void; disabled?: boolean; on?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded-full text-label-2 transition-colors enabled:hover:bg-well-hi enabled:hover:text-label disabled:opacity-35"
      style={on ? { background: tintBg(COLOR, 16), color: tintText(COLOR) } : undefined}
    >
      {children}
    </button>
  );
}

/** Sekmeler: tıkla geç, çift tıkla adını değiştir, × kapat (içi doluysa ikinci tıkla) */
function Tabs({ pads, active }: { pads: Pad[]; active: string }) {
  const { setPad, addPad } = useNook.getState();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  useEffect(() => {
    if (!confirm) return;
    const t = window.setTimeout(() => setConfirm(null), 2500);
    return () => window.clearTimeout(t);
  }, [confirm]);

  return (
    <div className="no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto" onWheel={(e) => (e.currentTarget.scrollLeft += e.deltaY)}>
      <AnimatePresence initial={false}>
        {pads.map((p) => {
          const on = p.id === active;
          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={spring.pop}
              className="group flex h-6 shrink-0 items-center rounded-full border pl-2.5 pr-1"
              style={on ? { background: tintBg(COLOR, 16), borderColor: tintBg(COLOR, 40) } : { background: "rgb(255 255 255 / 0.035)", borderColor: "rgb(255 255 255 / 0.06)" }}
            >
              {renaming === p.id ? (
                <input
                  autoFocus
                  defaultValue={p.title}
                  maxLength={24}
                  onBlur={(e) => {
                    useNook.getState().renamePad(p.id, e.target.value);
                    setRenaming(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  className="w-20 bg-transparent text-[11px] font-medium text-label outline-none"
                />
              ) : (
                <button
                  onClick={() => setPad(p.id)}
                  onDoubleClick={() => setRenaming(p.id)}
                  title={tt("Çift tıkla: adını değiştir")}
                  className="max-w-[96px] truncate text-[11px] font-medium"
                  style={{ color: on ? tintText(COLOR) : "var(--color-label-2)" }}
                >
                  {p.title}
                  {p.text && !on && <span className="ml-1 inline-block h-1 w-1 rounded-full align-middle" style={{ background: COLOR }} />}
                </button>
              )}
              <button
                onClick={() => {
                  if (p.text && confirm !== p.id) return setConfirm(p.id);
                  useNook.getState().removePad(p.id);
                  setConfirm(null);
                }}
                title={confirm === p.id ? tt("Silmek için yeniden tıkla") : tt("Kapat")}
                className={`ml-0.5 flex h-4 w-4 items-center justify-center rounded-full transition ${confirm === p.id ? "opacity-100" : "text-label-3 opacity-0 hover:bg-white/10 hover:text-label group-hover:opacity-100"}`}
                style={confirm === p.id ? { background: tintBg(ACCENT.red, 30), color: tintText(ACCENT.red) } : undefined}
              >
                <X size={9} strokeWidth={3} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {pads.length < 8 && (
        <button onClick={addPad} title={tt("Yeni sekme")} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-well text-label-3 hover:bg-well-hi hover:text-label">
          <Plus size={12} strokeWidth={2.6} />
        </button>
      )}
    </div>
  );
}

/** Küçük biçim dili: # başlık, **kalın**, *eğik*, ~~üstü çizili~~, `kod`, - liste, 1. liste, > alıntı, - [ ] görev */
function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        let m: RegExpMatchArray | null;
        if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
          const size = ["text-[16px]", "text-[14.5px]", "text-[13.5px]"][m[1].length - 1];
          return (
            <p key={i} className={`${size} font-semibold text-label`}>
              <Inline text={m[2]} />
            </p>
          );
        }
        if ((m = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/))) {
          const done = m[1] !== " ";
          return (
            <p key={i} className="flex items-start gap-1.5">
              <span className="mt-[3px] flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] border" style={{ borderColor: done ? COLOR : "rgb(255 255 255 / 0.3)", background: done ? tintBg(COLOR, 40) : undefined }} />
              <span className={done ? "text-label-3 line-through" : ""}>
                <Inline text={m[2]} />
              </span>
            </p>
          );
        }
        if ((m = line.match(/^\s*[-*•]\s+(.*)$/)))
          return (
            <p key={i} className="flex gap-1.5 pl-1">
              <span style={{ color: tintText(COLOR) }}>•</span>
              <span>
                <Inline text={m[1]} />
              </span>
            </p>
          );
        if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/)))
          return (
            <p key={i} className="flex gap-1.5 pl-1">
              <span className="tabular-nums" style={{ color: tintText(COLOR) }}>{m[1]}.</span>
              <span>
                <Inline text={m[2]} />
              </span>
            </p>
          );
        if ((m = line.match(/^>\s?(.*)$/)))
          return (
            <p key={i} className="border-l-2 pl-2 text-label-2" style={{ borderColor: tintBg(COLOR, 60) }}>
              <Inline text={m[1]} />
            </p>
          );
        if (!line.trim()) return <div key={i} className="h-1.5" />;
        return (
          <p key={i}>
            <Inline text={line} />
          </p>
        );
      })}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|\*[^*]+\*|_[^_]+_)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^\*\*.+\*\*$/.test(p)) return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
        if (/^~~.+~~$/.test(p)) return <s key={i} className="text-label-3">{p.slice(2, -2)}</s>;
        if (/^`.+`$/.test(p)) return <code key={i} className="rounded bg-black/40 px-1 font-mono text-[11.5px]">{p.slice(1, -1)}</code>;
        if (/^(\*|_).+(\*|_)$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
