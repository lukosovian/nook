/**
 * Yama notları — büyük ada. Solda Nook (adanın kendisi) ve sürüm listesi, sağda seçili sürümün
 * yenilikleri: her biri kendi kendine dönen bir görsel, başlık ve kısa açıklama.
 */
import { useRef, useState } from "react";
import { motion } from "motion/react";
import { ScrollText, X } from "lucide-react";
import { BRIEF } from "../../lib/layout";
import { easeOut } from "../../lib/motion";
import { closeNotes, DAYS, dayOf, takePendingVersion } from "../../lib/notes";
import { ACCENT, Card, tintBg, tintText } from "../ui/primitives";
import { DEMOS } from "./Demos";
import { tt } from "../../lib/i18n";

const enter = (i: number) => ({
  initial: { opacity: 0, y: 10, filter: "blur(3px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.32, ease: easeOut, delay: 0.12 + i * 0.05 },
});

const ACCENTS = [ACCENT.orange, ACCENT.purple, ACCENT.teal, ACCENT.pink, ACCENT.blue, ACCENT.yellow];

export function PatchNotes() {
  const [date, setDate] = useState(() => {
    const v = takePendingVersion();
    return (v ? dayOf(v) : DAYS[0]).date;
  });
  const note = DAYS.find((d) => d.date === date) ?? DAYS[0];
  const scroller = useRef<HTMLDivElement>(null);
  const latest = note === DAYS[0];
  const range = (d: (typeof DAYS)[number]) => (d.versions.length > 1 ? `${d.versions[d.versions.length - 1]} – ${d.versions[0]}` : d.versions[0]);

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.12, duration: 0.25, ease: easeOut } }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
    >
      {/* Üst çubuk */}
      <div className="absolute inset-x-5 top-0 z-20 flex items-center justify-between" style={{ height: BRIEF.header }}>
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-label-2">
          <ScrollText size={13} strokeWidth={2.2} style={{ color: tintText(ACCENT.yellow) }} />{tt("Yama notları")}<span className="text-label-3">· {DAYS.length}{" "}{tt("gün")}</span>
        </span>
        <button
          onClick={closeNotes}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-label-3 transition-colors hover:bg-well-hi hover:text-label"
        >{tt("Kapat")}<X size={12} strokeWidth={2.4} />
        </button>
      </div>

      {/* Kahraman kartı: Nook (adanın kendisi) ve sürümler */}
      <motion.div className="absolute" style={{ left: BRIEF.hero.x, top: BRIEF.hero.y, width: BRIEF.hero.w, height: BRIEF.hero.h }} {...enter(0)}>
        <Card className="relative flex h-full w-full flex-col overflow-hidden px-3 pb-3" style={{ paddingTop: 122 }}>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[160px]"
            style={{ background: `radial-gradient(70% 90% at 50% 0%, ${tintBg(ACCENT.orange, 22)} 0%, transparent 70%)` }}
          />
          <h2 className="relative text-center font-display text-[19px] font-semibold leading-tight tracking-[-0.02em] text-label">
            {latest ? tt("Neler yeni?") : note.date}
          </h2>
          <p className="relative mt-0.5 text-center text-[10px] font-medium tabular-nums text-label-3">{latest ? `${note.date} · ${range(note)}` : range(note)}</p>
          <div ref={scroller} className="relative -mr-1 mt-2.5 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {DAYS.map((n, i) => {
              const on = n.date === note.date;
              return (
                <button
                  key={n.date}
                  onClick={() => setDate(n.date)}
                  className="flex w-full items-center gap-2 rounded-[12px] border px-2.5 py-1.5 text-left transition-colors"
                  style={on ? { background: tintBg(ACCENT.orange, 14), borderColor: tintBg(ACCENT.orange, 40) } : { background: "transparent", borderColor: "transparent" }}
                >
                  <span
                    className="shrink-0 rounded-full px-1.5 py-[1px] text-[10px] font-semibold tabular-nums"
                    style={{ background: tintBg(on ? ACCENT.orange : "#ffffff", on ? 24 : 8), color: on ? tintText(ACCENT.orange) : "var(--color-label-3)" }}
                  >
                    {n.versions[0]}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className={`block truncate text-[11.5px] font-medium ${on ? "text-label" : "text-label-2"}`}>{n.headline}</span>
                    <span className="block truncate text-[9.5px] text-label-3">
                      {n.date}
                      {n.versions.length > 1 ? tt(" · {0} sürüm", n.versions.length) : ""}
                      {i === 0 ? tt(" · yeni") : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Seçili sürümün yenilikleri */}
      <div
        key={note.date}
        className="absolute -mr-1 overflow-y-auto pr-1"
        style={{ left: BRIEF.content.x, top: BRIEF.content.y, width: BRIEF.content.w, height: BRIEF.content.h }}
      >
        <div className={`grid gap-2.5 ${note.items.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {note.items.map((it, i) => {
            const Demo = DEMOS[it.demo];
            const color = ACCENTS[i % ACCENTS.length];
            const wide = note.items.length === 1 || (note.items.length % 2 === 1 && i === 0);
            return (
              <motion.div key={it.version + it.title} {...enter(1 + Math.min(i, 6))} className={wide ? "col-span-2" : ""}>
                <Card className="relative flex h-full flex-col p-2">
                  {note.versions.length > 1 && (
                    <span className="absolute right-3.5 top-3.5 z-10 rounded-full bg-black/60 px-1.5 py-[1px] text-[9.5px] font-semibold tabular-nums text-label-2 backdrop-blur">
                      {it.version}
                    </span>
                  )}
                  <div className={wide || note.items.length === 2 ? "h-[210px]" : "h-[132px]"}>
                    <Demo />
                  </div>
                  <div className="px-1.5 pb-1 pt-2">
                    <span className="block text-[13px] font-semibold leading-tight" style={{ color: tintText(color) }}>
                      {it.title}
                    </span>
                    <p className="mt-1 text-[11.5px] leading-snug text-label-2">{it.text}</p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
