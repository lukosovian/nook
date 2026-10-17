/**
 * Studio › Nook'u tanı: adadaki "Nook nedir?" tanıtımının Studio hâli. Solda Nook ve anlatım, sağda aynı
 * canlandırmalar (pencere neyse ona sığacak kadar büyür); altta geri, adımlar, ileri. Oklarla da gezilir.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { stepText, useTourSteps } from "../../components/tour/Tour";
import { DoneTips, HelloChips } from "../../components/tour/TourArt";
import { useArgus } from "../../lib/argus";
import { normalizeColor, normalizeLook } from "../../lib/look";
import { studioGo } from "../../lib/studio";
import { useNook } from "../../store/nook";
import { NookFigure } from "../../components/mascot/Figure";
import { LangChips } from "../../components/ui/LangPicker";
import { tintBg, tintText } from "../../components/ui/primitives";
import { spring } from "../../lib/motion";
import { tt } from "../../lib/i18n";
import { NavIcon, Page } from "../ui";

/** Adadaki tanıtımın çizim kutusu: canlandırmalar bu ölçüye göre */
const ART = { w: 582, h: 408 };

let lastStep = 0;

export function TourPage({ arg }: { arg: string | null }) {
  const steps = useTourSteps();
  const hasArgus = useArgus((s) => !!s.snap);
  const settings = useNook((s) => s.settings);
  const look = normalizeLook(settings.look);
  const color = normalizeColor(settings.faceColor);
  const [i, setI] = useState(() => Math.min(arg && /^\d+$/.test(arg) ? Number(arg) : lastStep, steps.length - 1));
  useEffect(() => void (lastStep = i), [i]);
  const base = steps[i] ?? steps[0];
  const merged = base.alt && !hasArgus ? { ...base, ...base.alt } : base;
  const text = stepText(merged, settings);
  const last = i === steps.length - 1;
  const go = (n: number) => setI(Math.max(0, Math.min(steps.length - 1, n)));

  // Klavye: ← → ile gez (yazı kutusundayken karışmaz)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowRight") setI((x) => Math.min(steps.length - 1, x + 1));
      else if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steps.length]);

  // Her adımda Nook bir sevinir
  const hop = useAnimationControls();
  useEffect(() => {
    void hop.start({ y: [0, -18, 0, -4, 0], scaleY: [1, 1.06, 0.92, 1.02, 1], transition: { duration: 0.6, ease: "easeOut" } });
  }, [i, hop]);

  // Sağdaki çizim: kutuya sığacak kadar büyüsün
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setZoom(Math.max(0.6, Math.min(1.5, (el.clientWidth - 36) / ART.w, (el.clientHeight - 36) / ART.h)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <Page wide>
      <div className="mb-5 flex items-center gap-4">
        <NavIcon icon={Sparkles} color={merged.color} on size={48} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[25px] font-extrabold leading-tight tracking-[-0.02em] text-label">{tt("Nook'u tanı")}</h1>
          <p className="truncate text-[13px] text-label-3">{tt("Neler yapabildiğim, adım adım")}</p>
        </div>
        <span className="rounded-full border px-3 py-1 text-[12px] font-semibold tabular-nums" style={{ background: tintBg(merged.color, 14), borderColor: tintBg(merged.color, 36), color: tintText(merged.color) }}>
          {i + 1} / {steps.length}
        </span>
      </div>

      <div className="grid h-[min(560px,calc(100vh-230px))] min-h-[420px] grid-cols-[minmax(280px,0.8fr)_minmax(0,1.6fr)] gap-4">
        {/* Nook ve anlatım */}
        <section className="nook-card relative flex flex-col overflow-hidden rounded-[26px] px-7 pb-7 pt-6">
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-0 h-[260px]"
            animate={{ background: `radial-gradient(70% 90% at 50% 0%, ${tintBg(merged.color, 26)} 0%, transparent 70%)` }}
            transition={{ duration: 0.5 }}
          />
          <div className="relative flex flex-1 items-center justify-center">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
              <motion.div animate={hop} style={{ originY: 1 }}>
                <NookFigure look={look} color={color} size={118} expression={last || i === 0 ? "happy" : "idle"} alive res={512} />
              </motion.div>
            </motion.div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={i} className="relative" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
              <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-label">{merged.title}</h2>
              <p className="mt-2 text-[13.5px] leading-[1.6] text-label-2">{text}</p>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Canlandırma */}
        <section ref={box} className="nook-card relative flex items-center justify-center overflow-hidden rounded-[26px]">
          <AnimatePresence mode="wait">
            <motion.div key={i} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              {merged.Art ? (
                <div className="relative overflow-hidden p-[18px]" style={{ width: ART.w, height: ART.h, zoom }}>
                  <merged.Art />
                </div>
              ) : (
                // İlk ve son adım: büyük selam
                <div className="flex flex-col items-center gap-5 px-8 text-center" style={{ zoom }}>
                  <p className="text-[30px] font-extrabold tracking-[-0.03em] text-label">{i === 0 ? tt("Merhaba!") : tt("Hazırız!")}</p>
                  {i === 0 && <LangChips />}
                  {i === 0 ? <HelloChips /> : <DoneTips />}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      {/* Alt çubuk */}
      <div className="mt-4 flex items-center justify-between">
        <div className="w-[160px]">
          {i > 0 && (
            <button onClick={() => go(i - 1)} className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold text-label-2 transition-colors hover:bg-white/[0.06] hover:text-label">
              <ArrowLeft size={14} strokeWidth={2.4} />
              {tt("Geri")}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {steps.map((s, k) => (
            <motion.button
              key={k}
              onClick={() => go(k)}
              title={s.title}
              aria-label={tt("{0}. adım", k + 1)}
              className="h-2 rounded-full"
              initial={false}
              animate={{ width: k === i ? 26 : 8, background: k === i ? merged.color : k < i ? "rgb(255 255 255 / 0.35)" : "rgb(255 255 255 / 0.12)" }}
              transition={spring.pop}
            />
          ))}
        </div>
        <div className="flex w-[160px] justify-end">
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            transition={spring.pop}
            onClick={() => (last ? studioGo("home") : go(i + 1))}
            className="flex h-10 items-center gap-1.5 rounded-full border px-5 text-[13.5px] font-semibold"
            style={{ background: tintBg(merged.color, 22), borderColor: tintBg(merged.color, 50), color: tintText(merged.color), boxShadow: `0 0 20px -6px ${merged.color}` }}
          >
            {i === 0 ? tt("Tanıyalım") : last ? tt("Bitir") : tt("İleri")}
            {!last && <ArrowRight size={15} strokeWidth={2.4} />}
          </motion.button>
        </div>
      </div>
    </Page>
  );
}
