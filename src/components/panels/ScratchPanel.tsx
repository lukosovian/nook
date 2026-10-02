import { useEffect, useRef } from "react";
import { playAntic } from "../../hooks/useAntics";
import { copyText } from "../../lib/bridge";
import { useNook } from "../../store/nook";
import { TextButton } from "../ui/primitives";

/** Uçucu not: diske yazılmaz, Nook kapanınca silinir. */
export function ScratchPanel() {
  const note = useNook((s) => s.note);
  const setNote = useNook((s) => s.setNote);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Ada açılma animasyonu bitince imleci içine koy (pencere odağını çalmaz).
  useEffect(() => {
    const t = window.setTimeout(() => ref.current?.focus(), 140);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="flex h-full flex-col gap-2">
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
        placeholder="Aklından geçeni yaz…"
        className="min-h-0 flex-1 resize-none rounded-[14px] bg-well p-3 text-[13px] leading-relaxed text-label outline-none transition-colors placeholder:text-label-3 focus:bg-well-hi"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-label-3">{note.length ? `${note.length} karakter · ` : ""}Esc temizler</span>
        <div className="flex gap-1">
          <TextButton disabled={!note} onClick={() => void copyText(note)}>
            Kopyala
          </TextButton>
          <TextButton tone="danger" disabled={!note} onClick={() => setNote("")}>
            Temizle
          </TextButton>
        </div>
      </div>
    </div>
  );
}
