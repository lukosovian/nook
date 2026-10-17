/**
 * Studio › Yama notları: solda günler ve sürümleri, sağda seçili günün yenilikleri (her birinin canlı görseli).
 * Büyük sürümler (0.3.0 gibi) listede kocaman, renkli bir kartla; açılınca başlıkta dev sürüm numarası.
 */
import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Newspaper, Search } from "lucide-react";
import { DAYS, dayOf } from "../../lib/notes";
import { normalizeColor, normalizeLook } from "../../lib/look";
import { useNook } from "../../store/nook";
import { NookFigure } from "../../components/mascot/Figure";
import { DEMOS } from "../../components/notes/Demos";
import { ACCENT, tintBg, tintText } from "../../components/ui/primitives";
import { tt } from "../../lib/i18n";
import { NavIcon } from "../ui";

const ACCENTS = [ACCENT.orange, ACCENT.purple, ACCENT.teal, ACCENT.pink, ACCENT.blue, ACCENT.yellow];
/** Büyük sürümün renkleri */
const MAJOR = `linear-gradient(100deg, ${ACCENT.purple}, ${ACCENT.pink} 45%, ${ACCENT.orange})`;
const gradText = { background: MAJOR, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } as const;

export function NotesPage({ arg }: { arg: string | null }) {
  const [date, setDate] = useState(() => (arg ? dayOf(arg) : DAYS[0]).date);
  const [query, setQuery] = useState("");
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  const note = DAYS.find((d) => d.date === date) ?? DAYS[0];
  const q = query.trim().toLocaleLowerCase("tr");
  const list = useMemo(
    () => (q ? DAYS.filter((d) => [d.headline, ...d.versions, ...d.items.map((i) => `${i.title} ${i.text}`)].some((x) => x.toLocaleLowerCase("tr").includes(q))) : DAYS),
    [q],
  );
  const latest = note === DAYS[0];
  const scroller = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const range = (d: (typeof DAYS)[number]) => (d.versions.length > 1 ? `${d.versions[d.versions.length - 1]} – ${d.versions[0]}` : d.versions[0]);

  return (
    <div className="flex h-full">
      {/* Günler */}
      <aside className="flex w-[300px] shrink-0 flex-col border-r border-white/[0.05]">
        <div className="px-5 pb-3 pt-6">
          <div className="flex items-center gap-3">
            <NavIcon icon={Newspaper} color={ACCENT.orange} on size={44} />
            <div>
              <h1 className="text-[20px] font-extrabold tracking-tight text-label">{tt("Yama notları")}</h1>
              <p className="text-[11.5px] text-label-3">{tt("{0} gün · {1} sürüm", DAYS.length, DAYS.reduce((a, d) => a + d.versions.length, 0))}</p>
            </div>
          </div>
          <label className="mt-4 flex h-9 items-center gap-2 rounded-[11px] border border-white/[0.07] bg-white/[0.03] px-3 text-label-3 focus-within:border-white/20">
            <Search size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tt("Notlarda ara…")} className="min-w-0 flex-1 bg-transparent text-[12.5px] text-label outline-none placeholder:text-label-3" />
          </label>
        </div>
        <div className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {/* Zaman çizgisi */}
          {!!list.length && <span className="pointer-events-none absolute bottom-6 left-[27px] top-3 w-px bg-white/[0.07]" />}
          {list.map((n) => {
            const on = n.date === note.date;
            const first = n === DAYS[0];
            if (n.major) return <MajorEntry key={n.date} day={n} on={on} first={first} range={range(n)} onClick={() => setDate(n.date)} />;
            return (
              <button key={n.date} onClick={() => setDate(n.date)} className="group relative flex w-full items-start gap-3 rounded-[14px] py-2 pl-2 pr-2.5 text-left">
                {on && <motion.span layoutId="note-day" className="absolute inset-0 rounded-[14px] border" style={{ background: tintBg(ACCENT.orange, 11), borderColor: tintBg(ACCENT.orange, 32) }} transition={{ type: "spring", stiffness: 480, damping: 38 }} />}
                <span className="relative mt-[5px] flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full" style={{ background: on ? ACCENT.orange : "#1a1a1d", boxShadow: on ? `0 0 0 3px ${tintBg(ACCENT.orange, 25)}, 0 0 12px ${ACCENT.orange}` : "inset 0 0 0 1.5px rgb(255 255 255 / 0.18)" }}>
                  {first && !on && <span className="h-[5px] w-[5px] rounded-full" style={{ background: ACCENT.orange }} />}
                </span>
                <span className="relative min-w-0 flex-1 leading-tight">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: on ? tintText(ACCENT.orange) : "var(--color-label-3)" }}>
                      {range(n)}
                    </span>
                    {first && (
                      <span className="rounded-full px-1.5 py-[1px] text-[8.5px] font-extrabold tracking-wide text-black" style={{ background: ACCENT.orange }}>
                        {tt("YENİ")}
                      </span>
                    )}
                    <span className="ml-auto shrink-0 text-[10px] text-label-3">{n.date}</span>
                  </span>
                  <span className={`mt-0.5 line-clamp-2 text-[12.5px] font-semibold ${on ? "text-label" : "text-label-2 group-hover:text-label"}`}>{n.headline}</span>
                </span>
              </button>
            );
          })}
          {!list.length && <p className="px-3 py-6 text-center text-[12px] text-label-3">{tt("Bulunamadı")}</p>}
        </div>
      </aside>

      {/* Seçili gün */}
      <div ref={scroller} key={note.date} className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[960px] px-8 pb-12 pt-7">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="nook-card relative mb-6 overflow-hidden rounded-[26px] px-8 py-7">
            <div className="pointer-events-none absolute -left-16 -top-24 h-[280px] w-[360px] rounded-full opacity-70" style={{ background: `radial-gradient(circle, ${tintBg(ACCENT.orange, 28)}, transparent 65%)` }} />
            <div className="pointer-events-none absolute -bottom-28 -right-10 h-[260px] w-[340px] rounded-full opacity-50" style={{ background: `radial-gradient(circle, ${tintBg(ACCENT.purple, 24)}, transparent 65%)` }} />
            {note.major && <div className="pointer-events-none absolute -right-24 -top-32 h-[340px] w-[420px] rounded-full opacity-60" style={{ background: `radial-gradient(circle, ${tintBg(ACCENT.pink, 30)}, transparent 65%)` }} />}
            <div className="relative flex items-center gap-6">
              <motion.div className="shrink-0" animate={{ y: [0, -5, 0], rotate: [0, -3, 3, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}>
                <NookFigure look={look} color={color} size={96} expression="happy" />
              </motion.div>
              <div className="min-w-0">
                {note.major && (
                  <div className="mb-2 flex items-end gap-3">
                    <span className="font-round text-[64px] font-extrabold leading-[0.9] tracking-[-0.045em] tabular-nums" style={gradText}>
                      {note.versions.find((v) => v.endsWith(".0")) ?? note.versions[0]}
                    </span>
                    <span className="mb-1.5 rounded-full px-2.5 py-[3px] text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-white" style={{ background: MAJOR, boxShadow: `0 6px 18px -8px ${ACCENT.pink}` }}>
                      {tt("Büyük güncelleme")}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {!note.major && (
                    <span className="rounded-full px-2.5 py-[3px] text-[11.5px] font-bold tabular-nums" style={{ background: tintBg(ACCENT.orange, 20), color: tintText(ACCENT.orange) }}>
                      {range(note)}
                    </span>
                  )}
                  <span className="text-[12px] text-label-3">
                    {latest ? `${tt("Neler yeni?")} · ` : ""}
                    {note.date} · {tt("{0} yenilik", note.items.length)}
                  </span>
                </div>
                <h2 className="mt-2 text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em] text-label">{note.headline}</h2>
              </div>
            </div>
            {/* İçindekiler: başlığa basınca o yeniliğe kayar */}
            {note.items.length > 1 && (
              <div className="relative mt-5 flex flex-wrap gap-1.5">
                {note.items.map((it, i) => (
                  <button
                    key={it.version + it.title}
                    onClick={() => cards.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="flex max-w-[280px] items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] py-[3px] pl-1 pr-2.5 text-[11.5px] font-medium text-label-2 transition-colors hover:bg-white/[0.09] hover:text-label"
                  >
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full text-[9.5px] font-bold tabular-nums text-black" style={{ background: ACCENTS[i % ACCENTS.length] }}>
                      {i + 1}
                    </span>
                    <span className="truncate">{it.title}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <div className="space-y-4">
            {note.items.map((it, i) => {
              const Demo = DEMOS[it.demo];
              const c = ACCENTS[i % ACCENTS.length];
              const flip = i % 2 === 1;
              return (
                <motion.div
                  key={it.version + it.title}
                  ref={(el) => void (cards.current[i] = el)}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="nook-card grid scroll-mt-6 grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-center gap-2 overflow-hidden rounded-[24px] p-2.5"
                >
                  <div className={`relative h-[270px] overflow-hidden rounded-[18px] ${flip ? "order-2" : ""}`}>
                    <Demo />
                    {note.versions.length > 1 && (
                      <span className="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-2 py-[2px] text-[10px] font-semibold tabular-nums text-label-2 backdrop-blur">{it.version}</span>
                    )}
                  </div>
                  <div className={`relative px-5 py-4 ${flip ? "order-1" : ""}`}>
                    <span className="font-round text-[44px] font-extrabold leading-none tabular-nums" style={{ color: tintBg(c, 30) }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-2 text-[18px] font-extrabold leading-tight tracking-tight" style={{ color: tintText(c) }}>
                      {it.title}
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-label-2">{it.text}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Listede büyük sürüm: geniş, renkli kart; sürüm numarası iri ve degrade */
function MajorEntry({ day, on, first, range, onClick }: { day: (typeof DAYS)[number]; on: boolean; first: boolean; range: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group relative my-1.5 flex w-full items-start gap-3 rounded-[16px] py-3 pl-2 pr-3 text-left">
      <motion.span
        className="absolute inset-0 rounded-[16px] border"
        animate={{ opacity: on ? 1 : 0.6 }}
        style={{ background: `linear-gradient(150deg, ${tintBg(ACCENT.purple, 16)}, ${tintBg(ACCENT.pink, 9)} 55%, ${tintBg(ACCENT.orange, 6)})`, borderColor: on ? tintBg(ACCENT.pink, 50) : tintBg(ACCENT.purple, 26) }}
      />
      <span className="relative mt-[9px] flex h-[13px] w-[13px] shrink-0 rounded-full" style={{ background: MAJOR, boxShadow: `0 0 0 3px ${tintBg(ACCENT.pink, 22)}, 0 0 14px ${ACCENT.pink}` }} />
      <span className="relative min-w-0 flex-1 leading-tight">
        <span className="flex items-center gap-1.5">
          <span className="font-round text-[24px] font-extrabold leading-none tracking-[-0.03em] tabular-nums" style={gradText}>
            {day.versions.find((v) => v.endsWith(".0")) ?? range}
          </span>
          {first && (
            <span className="rounded-full px-1.5 py-[1px] text-[8.5px] font-extrabold tracking-wide text-black" style={{ background: ACCENT.orange }}>
              {tt("YENİ")}
            </span>
          )}
          <span className="ml-auto shrink-0 text-[10px] text-label-3">{day.date}</span>
        </span>
        <span className="mt-1 block text-[9.5px] font-extrabold uppercase tracking-[0.1em]" style={{ color: tintText(ACCENT.pink) }}>
          {tt("Büyük güncelleme")} · {tt("{0} yenilik", day.items.length)}
        </span>
        <span className={`mt-1 line-clamp-2 text-[12.5px] font-semibold ${on ? "text-label" : "text-label-2 group-hover:text-label"}`}>{day.headline}</span>
      </span>
    </button>
  );
}
