/** Studio › Yıl özeti: bütün sayfalar aynı anda, büyük kartlardan bir duvar (yıl seçilebilir) */
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { HourChart, useYearSlides } from "../../components/panels/YearPanel";
import { normalizeColor, normalizeLook, useNookName } from "../../lib/look";
import { useNook } from "../../store/nook";
import { NookFigure } from "../../components/mascot/Figure";
import { ACCENT, MiniNook, tintBg, tintText } from "../../components/ui/primitives";
import { tt } from "../../lib/i18n";
import { Page, PageHeader } from "../ui";

export function YearPage() {
  const name = useNookName();
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  const { slides, years, year, setYear, y } = useYearSlides();
  const [first, ...rest] = slides;

  return (
    <Page wide>
      <PageHeader
        icon={Sparkles}
        color={ACCENT.yellow}
        title={tt("{0} ile {1}", name, year)}
        subtitle={tt("Bu yıl birlikte neler yaptık")}
        actions={
          years.length > 1 ? (
            <div className="flex gap-1 rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-1">
              {years.map((yy) => (
                <button key={yy} onClick={() => setYear(yy)} className="rounded-[9px] px-3 py-1 text-[12px] font-semibold" style={yy === year ? { background: tintBg(ACCENT.yellow, 22), color: tintText(ACCENT.yellow) } : { color: "var(--color-label-3)" }}>
                  {yy}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      {/* İlk kart: birlikte geçen zaman, büyük; yanında saat saat dağılım */}
      <div className="mb-4 grid grid-cols-[1.3fr_1fr] gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center gap-6 overflow-hidden rounded-[26px] border p-7"
          style={{ background: `linear-gradient(140deg, ${tintBg(first.color, 22)}, ${tintBg(ACCENT.orange, 6)})`, borderColor: tintBg(first.color, 34) }}
        >
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
            <NookFigure look={look} color={color} size={120} expression="happy" />
          </motion.div>
          <div className="min-w-0">
            <p className="font-display text-[54px] font-bold leading-none tracking-[-0.03em] tabular-nums" style={{ color: tintText(first.color) }}>
              {first.big}
            </p>
            <p className="mt-2 text-[15px] font-semibold leading-snug text-label">{first.line}</p>
            <div className="mt-2 text-label-2">{first.extra}</div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="nook-card flex flex-col rounded-[26px] p-6">
          <p className="text-[13px] font-bold text-label">{tt("Saat saat buradaydın")}</p>
          <p className="mb-3 text-[11.5px] text-label-3">{slides.find((x) => x.id === "hours")?.line}</p>
          <div className="mt-auto [&_svg]:!h-[120px] [&_svg]:!max-w-none">
            <HourChart hours={y.hours} />
          </div>
        </motion.div>
      </div>

      {/* Diğer sayfalar */}
      <div className="grid grid-cols-4 gap-4">
        {rest
          .filter((x) => x.id !== "hours")
          .map((s, i) => (
            <motion.div
              key={`${year}-${s.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.05 }}
              className={`relative flex min-h-[190px] flex-col overflow-hidden rounded-[24px] border p-5 ${s.id === "end" ? "col-span-4 min-h-[150px] flex-row items-center gap-6" : ""}`}
              style={{ background: `linear-gradient(160deg, ${tintBg(s.color, 16)}, ${tintBg(s.color, 4)})`, borderColor: tintBg(s.color, 28) }}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex h-10 w-10 items-center justify-center rounded-[13px]" style={{ background: tintBg(s.color, 24), color: s.color }}>
                  <s.icon size={18} strokeWidth={2.3} />
                </span>
                <p className="mt-3 font-display text-[38px] font-bold leading-none tracking-tight tabular-nums" style={{ color: tintText(s.color) }}>
                  {s.big}
                </p>
                <p className="mt-2 text-[13.5px] leading-snug text-label">{s.line}</p>
                {s.extra && <div className="mt-auto pt-3">{s.extra}</div>}
              </div>
              <div className={s.id === "end" ? "shrink-0" : "absolute right-4 top-4"}>
                {s.id === "end" ? <NookFigure look={look} color={color} size={96} expression="love" /> : <MiniNook color={s.color} size={34} eyes="happy" />}
              </div>
            </motion.div>
          ))}
      </div>
    </Page>
  );
}
