/**
 * 0.3.0 yama notunun üçüncü bölümünün görselleri: Hatırlatıcı modülü, yenilenen tanıtım (Studio'da da)
 * ve tam ekranda düzenini koruyan modüller. Hepsi kendi kendine döner.
 */
import { AnimatePresence, motion } from "motion/react";
import { BellRing, CalendarDays, Maximize2, Plus, Sparkles } from "lucide-react";
import { DEFAULT_LOOK } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

const WHITE = "#F4F4F6";
const OR = ACCENT.orange;

// ---------------------------------------------------------------- Hatırlatıcı

function RemindDemo() {
  const n = useTick(450);
  const p = n % 20;
  const typed = tt("çamaşırı as 20 dk").slice(0, Math.min(17, Math.max(0, (p - 1) * 2)));
  const added = p >= 11 && p < 17;
  const ringing = p >= 17;
  return (
    <Stage>
      <Fit w={300} h={124}>
        <div className="absolute inset-0 flex gap-[6px] rounded-[14px] bg-black p-[7px]">
          <div className="flex w-[118px] flex-col gap-[4px]">
            <div className="rounded-[8px] border p-[5px]" style={{ background: tintBg(OR, 12), borderColor: tintBg(OR, 28) }}>
              <p className="text-[5px] font-bold uppercase tracking-[0.1em]" style={{ color: tintText(OR) }}>
                {tt("Neyi hatırlatayım?")}
              </p>
              <p className="mt-[3px] h-[13px] rounded-[5px] bg-black/40 px-[4px] text-[7px] leading-[13px] text-white">
                {p >= 11 ? "" : typed}
                {p < 11 && <span className="ml-[1px] inline-block h-[7px] w-[1px] bg-white align-middle" />}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-[3px]">
              {[tt("10 dk"), tt("30 dk"), tt("1 saat"), tt("3 saat"), tt("Bu akşam"), tt("Yarın")].map((t, i) => (
                <span key={t} className="truncate rounded-[5px] border py-[2px] text-center text-[5.5px] font-semibold" style={i === 1 && p < 9 ? { background: tintBg(OR, 22), borderColor: tintBg(OR, 50), color: tintText(OR) } : { borderColor: "rgb(255 255 255 / 0.07)", color: "#aaa" }}>
                  {t}
                </span>
              ))}
            </div>
            <motion.span className="mt-auto flex h-[15px] items-center justify-center gap-[2px] rounded-[6px] text-[6.5px] font-bold text-black" style={{ background: OR }} animate={{ scale: p === 10 ? 0.9 : 1 }}>
              <Plus size={7} strokeWidth={3} /> {p >= 9 && p < 11 ? tt("20 dk sonra") : tt("Hatırlat")}
            </motion.span>
          </div>
          <div className="min-w-0 flex-1 space-y-[3px]">
            <p className="text-[6px] font-semibold text-white/70">{tt("Yaklaşan")}</p>
            <AnimatePresence initial={false}>
              {added && (
                <motion.div key="new" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 10 }} className="flex h-[18px] items-center gap-[4px] rounded-[6px] border px-[4px]" style={{ background: tintBg(OR, 12), borderColor: tintBg(OR, 30) }}>
                  <BellRing size={7} style={{ color: tintText(OR) }} />
                  <span className="flex-1 truncate text-[6.5px] font-semibold text-white">{tt("çamaşırı as")}</span>
                  <span className="text-[5px]" style={{ color: tintText(OR) }}>{tt("{0} dk sonra", 20 - (p - 11) * 3)}</span>
                </motion.div>
              )}
            </AnimatePresence>
            {[
              { t: tt("İlacını iç"), w: tt("Bugün 21:00"), c: OR, cal: false },
              { t: tt("Sprint toplantısı"), w: tt("Yarın 10:20 · Takvimden"), c: ACCENT.blue, cal: true },
            ].map((r) => (
              <div key={r.t} className="flex h-[18px] items-center gap-[4px] rounded-[6px] border px-[4px]" style={{ background: tintBg(r.c, 9), borderColor: tintBg(r.c, 24) }}>
                {r.cal ? <CalendarDays size={7} style={{ color: tintText(r.c) }} /> : <BellRing size={7} style={{ color: tintText(r.c) }} />}
                <span className="flex-1 truncate text-[6.5px] font-semibold text-white">{r.t}</span>
                <span className="text-[5px] text-white/45">{r.w}</span>
              </div>
            ))}
          </div>
          {/* Vakti gelince ada çalar */}
          <AnimatePresence>
            {ringing && (
              <motion.div className="absolute left-1/2 top-[6px] flex h-[26px] -translate-x-1/2 items-center gap-[6px] rounded-full border bg-black px-[8px]" style={{ borderColor: tintBg(OR, 50) }} initial={{ opacity: 0, y: -8, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}>
                <motion.span animate={{ rotate: [0, -14, 14, -10, 0] }} transition={{ duration: 0.6, repeat: Infinity }}>
                  <NookFigure look={DEFAULT_LOOK} color={WHITE} size={16} expression="surprised" />
                </motion.span>
                <span className="text-[7.5px] font-bold" style={{ color: tintText(OR) }}>
                  {tt("çamaşırı as")}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Yeni tanıtım

const TOUR_STEPS = [
  { t: tt("Ana sayfa ve modüller"), c: ACCENT.purple },
  { t: tt("Nook Studio"), c: ACCENT.gray },
  { t: tt("Günün düzeni bende"), c: ACCENT.blue },
  { t: tt("Beni kendine göre giydir"), c: ACCENT.pink },
];

function Tour03Demo() {
  const n = useTick(1300);
  const k = n % TOUR_STEPS.length;
  const s = TOUR_STEPS[k];
  return (
    <Stage>
      <Fit w={300} h={124}>
        <div className="absolute inset-0 flex overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#0e0e10]">
          <div className="w-[62px] space-y-[3px] border-r border-white/[0.05] p-[4px]">
            {[tt("Ana sayfa"), tt("Görünüm"), tt("Kısayollar"), tt("Ayarlar")].map((x) => (
              <span key={x} className="block truncate rounded-[4px] px-[3px] py-[2px] text-[5.5px] font-semibold text-white/50">
                {x}
              </span>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col p-[6px]">
            <p className="mb-[4px] flex items-center gap-[3px] text-[8px] font-extrabold text-white">
              <span className="flex h-[11px] w-[11px] items-center justify-center rounded-[4px] text-white" style={{ background: s.c }}>
                <Sparkles size={7} />
              </span>
              {tt("Nook'u tanı")}
              <span className="ml-auto text-[5.5px] font-semibold text-white/40">{k + 3} / 17</span>
            </p>
            <div className="flex min-h-0 flex-1 gap-[5px]">
              <div className="flex w-[78px] flex-col rounded-[8px] p-[5px]" style={{ background: `radial-gradient(80% 60% at 50% 0%, ${tintBg(s.c, 30)}, rgb(255 255 255 / 0.03))` }}>
                <motion.span key={k} className="mx-auto" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.5 }}>
                  <NookFigure look={DEFAULT_LOOK} color={WHITE} size={26} expression="happy" />
                </motion.span>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.p key={k} className="mt-auto text-[6.5px] font-extrabold leading-tight text-white" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {s.t}
                  </motion.p>
                </AnimatePresence>
                <span className="mt-[2px] block h-[2px] w-[80%] rounded-full bg-white/15" />
                <span className="mt-[2px] block h-[2px] w-[60%] rounded-full bg-white/10" />
              </div>
              <div className="relative min-w-0 flex-1 overflow-hidden rounded-[8px] bg-white/[0.03]">
                <AnimatePresence initial={false}>
                  <motion.div key={k} className="absolute inset-[5px] grid grid-cols-3 gap-[3px]" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    {Array.from({ length: 6 }, (_, i) => (
                      <span key={i} className="rounded-[5px] border" style={{ background: tintBg(s.c, 10 + (i % 3) * 4), borderColor: tintBg(s.c, 26) }} />
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            <div className="mt-[4px] flex justify-center gap-[2px]">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className="h-[2.5px] rounded-full" style={{ width: i === k + 2 ? 8 : 2.5, background: i === k + 2 ? s.c : "rgb(255 255 255 / 0.2)" }} />
              ))}
            </div>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Tam ekranda düzen

function Big03Demo() {
  const n = useTick(1600);
  const big = n % 2 === 1;
  const cells = Array.from({ length: 35 }, (_, i) => i + 1);
  return (
    <Stage>
      <Fit w={300} h={124}>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div className="relative flex gap-[4px] overflow-hidden bg-black p-[5px]" animate={{ width: big ? 290 : 190, height: big ? 118 : 74, borderRadius: big ? 16 : 12 }} transition={{ type: "spring", stiffness: 200, damping: 26 }}>
            <Maximize2 size={6} className="absolute right-[5px] top-[4px] text-white/50" />
            <div className="w-[34%] rounded-[6px] bg-white/[0.05]" />
            {/* Takvim: tam ekranda da gün hücreleri yuvarlak, düzen aynı; yazılar büyür */}
            <motion.div className="flex min-w-0 flex-1 gap-[4px] rounded-[6px] bg-white/[0.04] p-[4px]" animate={{ fontSize: big ? 7 : 4.5 }}>
              <div className="grid w-[46%] grid-cols-7 content-center gap-[1px]">
                {cells.map((d) => (
                  <span key={d} className="flex aspect-square items-center justify-center rounded-full leading-none" style={d === 16 ? { background: tintBg(ACCENT.blue, 40), color: "#fff" } : { color: "rgb(255 255 255 / 0.55)" }}>
                    {d}
                  </span>
                ))}
              </div>
              <div className="min-w-0 flex-1 space-y-[2px] pt-[2px]">
                {[tt("Sprint toplantısı"), tt("Halı saha")].map((t) => (
                  <span key={t} className="block truncate rounded-full px-[3px] py-[1px] text-white" style={{ background: tintBg(ACCENT.blue, 18) }}>
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </Fit>
    </Stage>
  );
}

export const DEMOS12 = {
  remind03: RemindDemo,
  tour03: Tour03Demo,
  big03: Big03Demo,
};
