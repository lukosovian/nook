import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bold, CheckSquare, Code, Copy, Download, Eye, Heading, List, PenLine, Plus, Quote, Trash2, X, type LucideIcon } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { playAntic } from "../../hooks/useAntics";
import { copyText, inTauri, saveText } from "../../lib/bridge";
import { spring } from "../../lib/motion";
import { useNook, type Pad } from "../../store/nook";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

const COLOR = ACCENT.yellow;
/** Defter çizgilerinin aralığı (yazının satır yüksekliğiyle aynı) */
const LINE = 21;

/**
 * Karalama defteri: solda sayfalar (en fazla 8; adı, ilk satırı), sağda çizgili kâğıt.
 * Kendiliğinden kaydedilir; biçim düğmeleri, biçimli önizleme (görev kutuları tıklanır), dosyaya kaydetme.
 */
export function ScratchPanel() {
  const note = useNook((s) => s.note);
  const setNote = useNook((s) => s.setNote);
  const pads = useNook((s) => s.pads);
  const padId = useNook((s) => s.padId);
  const pad = pads.find((p) => p.id === padId) ?? pads[0];
  const [preview, setPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Ada açılma animasyonu bitince imleci içine koy (pencere odağını çalmaz).
  useEffect(() => {
    if (preview) return;
    const t = window.setTimeout(() => ref.current?.focus(), 140);
    return () => window.clearTimeout(t);
  }, [padId, preview]);

  const write = (text: string) => {
    setNote(text);
    // Yazarken Nook da kâğıt-kalemle not alır
    playAntic("note");
  };

  /** Seçili satırların başına işaret ekler (ya da varsa kaldırır); kalın/kod seçimi sarar */
  const format = (kind: "h" | "b" | "list" | "task" | "quote" | "code") => {
    const el = ref.current;
    if (!el || preview) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    if (kind === "b" || kind === "code") {
      const mark = kind === "b" ? "**" : "`";
      const next = value.slice(0, a) + mark + value.slice(a, b) + mark + value.slice(b);
      write(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(a + mark.length, b + mark.length);
      });
      return;
    }
    const prefix = { h: "# ", list: "- ", task: "- [ ] ", quote: "> " }[kind];
    const start = value.lastIndexOf("\n", a - 1) + 1;
    const end = value.indexOf("\n", b) < 0 ? value.length : value.indexOf("\n", b);
    const lines = value.slice(start, end).split("\n");
    const all = lines.every((l) => l.startsWith(prefix));
    const changed = lines.map((l) => (all ? l.slice(prefix.length) : prefix + l)).join("\n");
    write(value.slice(0, start) + changed + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, start + changed.length);
    });
  };

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

  const copy = () => {
    void copyText(note);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  };

  // Önizlemede görev kutusuna tıklanınca metindeki [ ] / [x] değişir
  const toggleTask = (line: number) => {
    const lines = note.split("\n");
    lines[line] = lines[line].replace(/\[([ xX])\]/, (_, c: string) => (c === " " ? "[x]" : "[ ]"));
    write(lines.join("\n"));
  };

  const words = note.trim() ? note.trim().split(/\s+/).length : 0;

  return (
    <div className="flex h-full gap-2.5">
      <Pages pads={pads} active={pad.id} />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Araç çubuğu: biçim düğmeleri, sağda önizle / kaydet / kopyala / temizle */}
        <div className="flex shrink-0 items-center gap-0.5">
          {(
            [
              ["h", Heading, tt("Başlık")],
              ["b", Bold, tt("Kalın")],
              ["list", List, tt("Liste")],
              ["task", CheckSquare, tt("Görev")],
              ["quote", Quote, tt("Alıntı")],
              ["code", Code, tt("Kod")],
            ] as [Parameters<typeof format>[0], LucideIcon, string][]
          ).map(([k, Icon, label]) => (
            <Tool key={k} label={label} onClick={() => format(k)} disabled={preview}>
              <Icon size={12} strokeWidth={2.4} />
            </Tool>
          ))}
          <span className="mx-1 h-3.5 w-px bg-white/10" />
          <Tool label={preview ? tt("Düzenle") : tt("Biçimli önizle")} onClick={() => setPreview((p) => !p)} on={preview}>
            {preview ? <PenLine size={12} strokeWidth={2.4} /> : <Eye size={12} strokeWidth={2.4} />}
          </Tool>
          <div className="flex-1" />
          {inTauri && (
            <Tool label={tt("Dosyaya kaydet")} onClick={() => void saveFile()} disabled={!note}>
              <Download size={12} strokeWidth={2.4} />
            </Tool>
          )}
          <Tool label={copied ? tt("Kopyalandı") : tt("Kopyala")} onClick={copy} disabled={!note} on={copied}>
            <Copy size={11.5} strokeWidth={2.4} />
          </Tool>
          <Tool label={tt("Temizle (Esc)")} onClick={() => setNote("")} disabled={!note} danger>
            <Trash2 size={11.5} strokeWidth={2.4} />
          </Tool>
        </div>

        {/* Kâğıt: soluk çizgiler ve sarı kenar çizgisi */}
        <div
          className="relative min-h-0 flex-1 overflow-hidden rounded-[14px] border border-white/[0.06]"
          style={{
            background: `linear-gradient(90deg, transparent 21px, ${tintBg(COLOR, 35)} 21px, ${tintBg(COLOR, 35)} 22px, transparent 22px), repeating-linear-gradient(180deg, transparent 0, transparent ${LINE - 1}px, rgb(255 255 255 / 0.045) ${LINE - 1}px, rgb(255 255 255 / 0.045) ${LINE}px), rgb(255 255 255 / 0.03)`,
            backgroundPosition: `0 0, 0 9px, 0 0`,
          }}
        >
          {preview ? (
            <div onDoubleClick={() => setPreview(false)} className="h-full overflow-y-auto py-2 pl-8 pr-3 text-[12.5px] text-label" style={{ lineHeight: `${LINE}px` }} title={tt("Düzenlemek için çift tıkla")}>
              {note.trim() ? <Markdown text={note} onTask={toggleTask} /> : <p className="text-label-3">{tt("Boş")}</p>}
            </div>
          ) : (
            <textarea
              ref={ref}
              value={note}
              onChange={(e) => write(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setNote("")}
              spellCheck={false}
              placeholder={tt("Aklından geçeni yaz… (# başlık, **kalın**, - liste)")}
              className="h-full w-full resize-none bg-transparent py-2 pl-8 pr-3 text-[13px] text-label outline-none placeholder:text-label-3"
              style={{ lineHeight: `${LINE}px` }}
            />
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between px-1 text-[9.5px] text-label-3">
          <span className="truncate">{note.length ? tt("{0} kelime · {1} karakter", words, note.length) : tt("Kendiliğinden kaydedilir")}</span>
          <span className="shrink-0">{tt("Esc temizler")}</span>
        </div>
      </div>
    </div>
  );
}

function Tool({ label, onClick, disabled, on, danger, children }: { label: string; onClick: () => void; disabled?: boolean; on?: boolean; danger?: boolean; children: React.ReactNode }) {
  const c = danger ? ACCENT.red : COLOR;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="group flex h-6 w-6 items-center justify-center rounded-[8px] text-label-2 transition-colors enabled:hover:bg-well-hi enabled:hover:text-label disabled:opacity-30"
      style={on ? { background: tintBg(c, 18), color: tintText(c) } : undefined}
    >
      {children}
    </button>
  );
}

/** Sayfalar: tıkla geç, çift tıkla adını değiştir, × kapat (içi doluysa ikinci tıkla) */
function Pages({ pads, active }: { pads: Pad[]; active: string }) {
  const { setPad, addPad } = useNook.getState();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  useEffect(() => {
    if (!confirm) return;
    const t = window.setTimeout(() => setConfirm(null), 2500);
    return () => window.clearTimeout(t);
  }, [confirm]);

  return (
    <div className="flex w-[118px] shrink-0 flex-col gap-1">
      <div className="no-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {pads.map((p) => {
            const on = p.id === active;
            const first = p.text.split("\n").find((l) => l.trim())?.replace(/^[#>\-*\s[\]xX]+/, "") ?? "";
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={spring.pop}
                className="group relative rounded-[11px] border px-2 py-1.5"
                style={on ? { background: tintBg(COLOR, 13), borderColor: tintBg(COLOR, 42) } : { background: "rgb(255 255 255 / 0.03)", borderColor: "rgb(255 255 255 / 0.05)" }}
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
                    className="w-full bg-transparent text-[11px] font-semibold text-label outline-none"
                  />
                ) : (
                  <button onClick={() => setPad(p.id)} onDoubleClick={() => setRenaming(p.id)} title={tt("Çift tıkla: adını değiştir")} className="block w-full pr-3 text-left">
                    <span className="block truncate text-[11px] font-semibold" style={{ color: on ? tintText(COLOR) : "var(--color-label)" }}>
                      {p.title}
                    </span>
                    <span className="block truncate text-[9.5px] text-label-3">{first || tt("Boş sayfa")}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    if (p.text && confirm !== p.id) return setConfirm(p.id);
                    useNook.getState().removePad(p.id);
                    setConfirm(null);
                  }}
                  title={confirm === p.id ? tt("Silmek için yeniden tıkla") : tt("Kapat")}
                  className={`absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full transition ${confirm === p.id ? "opacity-100" : "text-label-3 opacity-0 hover:bg-white/10 hover:text-label group-hover:opacity-100"}`}
                  style={confirm === p.id ? { background: tintBg(ACCENT.red, 30), color: tintText(ACCENT.red) } : undefined}
                >
                  <X size={9} strokeWidth={3} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {pads.length < 8 && (
        <button
          onClick={addPad}
          className="flex h-7 shrink-0 items-center justify-center gap-1 rounded-[11px] border border-dashed border-white/[0.12] text-[10.5px] font-semibold text-label-3 hover:border-white/25 hover:text-label"
        >
          <Plus size={11} strokeWidth={2.6} />
          {tt("Yeni sayfa")}
        </button>
      )}
    </div>
  );
}

/** Küçük biçim dili: # başlık, **kalın**, *eğik*, ~~üstü çizili~~, `kod`, - liste, 1. liste, > alıntı, - [ ] görev */
function Markdown({ text, onTask }: { text: string; onTask: (line: number) => void }) {
  const lines = text.split("\n");
  return (
    <div>
      {lines.map((line, i) => {
        let m: RegExpMatchArray | null;
        if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
          const size = ["text-[16px]", "text-[14.5px]", "text-[13.5px]"][m[1].length - 1];
          return (
            <p key={i} className={`${size} font-bold`} style={{ color: m[1].length === 1 ? tintText(COLOR) : undefined }}>
              <Inline text={m[2]} />
            </p>
          );
        }
        if ((m = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/))) {
          const done = m[1] !== " ";
          return (
            <p key={i} className="flex items-center gap-1.5">
              <button
                onClick={() => onTask(i)}
                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border"
                style={{ borderColor: done ? COLOR : "rgb(255 255 255 / 0.3)", background: done ? tintBg(COLOR, 45) : undefined }}
              >
                {done && <span className="text-[9px] leading-none text-white">✓</span>}
              </button>
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
              <span className="tabular-nums" style={{ color: tintText(COLOR) }}>
                {m[1]}.
              </span>
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
        if (!line.trim()) return <div key={i} style={{ height: LINE }} />;
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
        if (/^\*\*.+\*\*$/.test(p))
          return (
            <strong key={i} className="font-semibold">
              {p.slice(2, -2)}
            </strong>
          );
        if (/^~~.+~~$/.test(p))
          return (
            <s key={i} className="text-label-3">
              {p.slice(2, -2)}
            </s>
          );
        if (/^`.+`$/.test(p))
          return (
            <code key={i} className="rounded bg-black/40 px-1 font-mono text-[11.5px]">
              {p.slice(1, -1)}
            </code>
          );
        if (/^(\*|_).+(\*|_)$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
