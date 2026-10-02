import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { playAntic } from "../../hooks/useAntics";
import { TOUR } from "../../lib/layout";
import { easeOut, spring } from "../../lib/motion";
import { endTour } from "../../lib/tour";
import { useNook, type Antic } from "../../store/nook";
import { ACCENT, Card, tintBg, tintText } from "../ui/primitives";
import { AiArt, CareArt, DoneTips, FeedArt, HelloChips, HoverArt, KeysArt, ModulesArt, MoodArt } from "./TourArt";

interface Step {
  title: string;
  text: string;
  color: string;
  antic: Antic;
  /** Nook ortada kocaman (ilk ve son adım) */
  centered?: boolean;
  Art?: () => React.JSX.Element;
}

export const STEPS: Step[] = [
  {
    title: "Merhaba, ben Nook",
    text: "Ekranının tepesindeki çentikte yaşayan küçük yardımcınım. Müziğini, dosyalarını, alarmlarını tutarım, sorularını cevaplarım. Bir dakikada kendimi tanıtayım mı?",
    color: ACCENT.teal,
    antic: "hop",
    centered: true,
  },
  {
    title: "Üstüme gel, açılayım",
    text: "Fareyi ekranın üst ortasındaki siyah çentiğe götür, ada açılır. Uzaklaşınca kendiliğinden kapanır; hiçbir pencerenin önünü kapatmam.",
    color: ACCENT.blue,
    antic: "wink",
    Art: HoverArt,
  },
  {
    title: "Her şey bir çip uzağında",
    text: "Açılınca ana sayfada renkli çipler var. Her biri bir bölüm; tıkla, içine gir. Üstteki küçük ikonlarla ana sayfaya, sohbete, aramaya ve ayarlara geçersin.",
    color: ACCENT.purple,
    antic: "nod",
    Art: ModulesArt,
  },
  {
    title: "Dosyaları bana yedir",
    text: "Bir dosyayı sürükleyip üstüme bırak, yutar ve Raf'ta saklarım. Sonra raftan istediğin yere sürükleyip bırakırsın. Aldığın ekran görüntüleri de kendiliğinden rafa düşer.",
    color: ACCENT.pink,
    antic: "giggle",
    Art: FeedArt,
  },
  {
    title: "Klavyeden çağır",
    text: "Fareye uzanmana gerek yok. Bu kısayollar her yerde çalışır; istersen Ayarlar'dan değiştirebilirsin.",
    color: ACCENT.yellow,
    antic: "suspicious",
    Art: KeysArt,
  },
  {
    title: "Benimle konuş",
    text: "Sohbet, ekrana sor ve sesli komut için Google'ın ücretsiz Gemini anahtarı lazım. Bir kere yapıştırman yeter; alarm kurar, not alır, müziği yönetir, aklımda tutarım.",
    color: ACCENT.purple,
    antic: "love",
    Art: AiArt,
  },
  {
    title: "Sağlığına göz kulak olurum",
    text: "Uzun süre ekrana bakınca göz molası, aralıklarla su hatırlatırım. Bunlar her zaman çalışır, odak modu açık olmasa da. Oyundayken ve tam ekranda susarım.",
    color: ACCENT.teal,
    antic: "stretch",
    Art: CareArt,
  },
  {
    title: "Benim de bir keyfim var",
    text: "İlgilendikçe mutlu olurum, uzun süre unutursan küserim. Beni tutup fırlatabilir, dürtebilirsin. Şimdi dene: soldaki beni tut ve fırlat!",
    color: ACCENT.orange,
    antic: "shy",
    Art: MoodArt,
  },
  {
    title: "Hazırız!",
    text: "Artık seninleyim. Bu tanıtımı istediğin zaman Ayarlar'daki \"Nook nedir?\" ile yeniden açabilirsin.",
    color: ACCENT.green,
    antic: "love",
    centered: true,
  },
];

/** "Nook nedir?" tanıtımı: ada ekrana yayılır; Nook solda anlatır, sağda canlandırmalı wireframe. */
export function Tour() {
  const step = useNook((s) => s.tourStep);
  const setStep = useNook((s) => s.setTourStep);
  const cur = STEPS[step] ?? STEPS[0];
  const last = step === STEPS.length - 1;

  useEffect(() => {
    playAntic(cur.antic);
  }, [cur]);

  const next = () => (last ? endTour() : setStep(step + 1));
  const back = () => step > 0 && setStep(step - 1);

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.15, duration: 0.3, ease: easeOut } }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
    >
      {/* Üst çubuk */}
      <div className="absolute inset-x-5 top-0 z-10 flex items-center justify-between" style={{ height: TOUR.header }}>
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-label-2">
          <Sparkles size={13} strokeWidth={2.2} style={{ color: tintText(cur.color) }} />
          Nook nedir?
        </span>
        {!last && (
          <button onClick={endTour} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-label-3 transition-colors hover:bg-well-hi hover:text-label">
            Geç
            <X size={12} strokeWidth={2.4} />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {cur.centered ? (
          <motion.div
            key={`c${step}`}
            className="absolute inset-x-0 flex flex-col items-center text-center"
            style={{ top: 248 }}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: 0.28, ease: easeOut }}
          >
            <h1 className="font-display text-[32px] font-semibold tracking-[-0.03em] text-label">{cur.title}</h1>
            <p className="mt-2 max-w-[520px] text-[14px] leading-relaxed text-label-2">{cur.text}</p>
            <div className="mt-5">{last ? <DoneTips /> : <HelloChips />}</div>
          </motion.div>
        ) : (
          <motion.div
            key={`s${step}`}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="absolute"
              style={{ left: TOUR.hero.x, top: TOUR.hero.y, width: TOUR.hero.w, height: TOUR.hero.h }}
              initial={{ y: 8 }}
              animate={{ y: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
            >
              <Card className="relative flex h-full w-full flex-col overflow-hidden px-5 pb-5" style={{ paddingTop: 148 }}>
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[150px]"
                  style={{ background: `radial-gradient(70% 90% at 50% 0%, ${tintBg(cur.color, 22)} 0%, transparent 70%)` }}
                />
                <span
                  className="relative mb-2 w-fit rounded-full border px-2 py-[2px] text-[10.5px] font-medium tabular-nums"
                  style={{ background: tintBg(cur.color, 14), borderColor: tintBg(cur.color, 36), color: tintText(cur.color) }}
                >
                  {step} / {STEPS.length - 2}
                </span>
                <h2 className="relative font-display text-[21px] font-semibold leading-tight tracking-[-0.02em] text-label">{cur.title}</h2>
                <p className="relative mt-2 text-[12.5px] leading-[1.6] text-label-2">{cur.text}</p>
              </Card>
            </motion.div>

            <motion.div
              className="absolute"
              style={{ left: TOUR.content.x, top: TOUR.content.y, width: TOUR.content.w, height: TOUR.content.h }}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 340, damping: 32, delay: 0.04 }}
            >
              <Card className="h-full w-full overflow-hidden p-[18px]">{cur.Art && <cur.Art />}</Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alt çubuk: geri · noktalar · devam */}
      <div className="absolute inset-x-[18px] bottom-0 flex h-[64px] items-center justify-between">
        <div className="w-[120px]">
          {step > 0 && (
            <button onClick={back} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-label-2 transition-colors hover:bg-well-hi hover:text-label">
              <ArrowLeft size={13} strokeWidth={2.4} />
              Geri
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`${i + 1}. adım`}
              className="h-1.5 rounded-full"
              initial={false}
              animate={{ width: i === step ? 20 : 6, background: i === step ? cur.color : i < step ? "rgb(255 255 255 / 0.35)" : "rgb(255 255 255 / 0.12)" }}
              transition={spring.pop}
            />
          ))}
        </div>
        <div className="flex w-[120px] justify-end">
          <motion.button
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.03 }}
            transition={spring.pop}
            onClick={next}
            className="flex h-9 items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium"
            style={{ background: tintBg(cur.color, 22), borderColor: tintBg(cur.color, 50), color: tintText(cur.color), boxShadow: `0 0 18px -6px ${cur.color}` }}
          >
            {step === 0 ? "Tanıyalım" : last ? "Başla" : "Devam"}
            {!last && <ArrowRight size={14} strokeWidth={2.4} />}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
