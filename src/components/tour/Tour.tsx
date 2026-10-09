import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { playAntic } from "../../hooks/useAntics";
import { TOUR } from "../../lib/layout";
import { easeOut, spring } from "../../lib/motion";
import { endTour } from "../../lib/tour";
import { useNook, type Antic, type Settings } from "../../store/nook";
import { ACCENT, Card, tintBg, tintText } from "../ui/primitives";
import { useArgus } from "../../lib/argus";
import { AiArt, ArgusArt, CareArt, DoneTips, FeedArt, HelloChips, HoverArt, KeysArt, LookArt, ModulesArt, MoodArt } from "./TourArt";
import { ClaudeArt, DayArt, HumArt, OutingsArt, ShieldArt } from "./TourArt2";
import { useClaude } from "../../lib/claude";
import { isTurkish, tt } from "../../lib/i18n";
import { prettyKeys, type ShortcutKey } from "../../lib/shortcuts";
import { LangChips } from "../ui/LangPicker";

interface Step {
  title: string;
  text: string;
  /** Argus yoksa bunun yerine (Argus adımı) */
  alt?: { title: string; text: string };
  color: string;
  antic: Antic;
  /** Nook ortada kocaman (ilk ve son adım) */
  centered?: boolean;
  Art?: () => React.JSX.Element;
  /** Yalnızca bu bilgisayarda Claude Code varsa gösterilir */
  claude?: boolean;
  /** Metindeki {0}: bu kısayolun kullanıcının seçtiği tuşları; kısayol kaldırılmışsa `noKeys` metni */
  keys?: ShortcutKey;
  noKeys?: string;
  /** Argus adımı: Türkçe dışında, Argus kurulu değilse gösterilmez (Argus yalnızca Türkçe) */
  argus?: boolean;
}

export const STEPS: Step[] = [
  {
    title: tt("Merhaba, ben Nook"),
    text: tt("Ekranının tepesindeki çentikte yaşayan küçük yardımcınım. Müziğini, dosyalarını, alarmlarını tutarım, sorularını cevaplarım. Bir dakikada kendimi tanıtayım mı?"),
    color: ACCENT.teal,
    antic: "hop",
    centered: true,
  },
  {
    title: tt("Üstüme gel, açılayım"),
    text: tt("Fareyi ekranın üst ortasındaki siyah çentiğe götür, ada açılır. Uzaklaşınca kendiliğinden kapanır; hiçbir pencerenin önünü kapatmam."),
    color: ACCENT.blue,
    antic: "wink",
    Art: HoverArt,
  },
  {
    title: tt("Her şey bir çip uzağında"),
    text: tt("Açılınca ana sayfada renkli çipler var; her biri bir bölüm, tıkla içine gir. Çipleri sürükleyip sıralar, istemediğini gizlersin; İş, Oyun gibi profiller kurarsın. Adayı da üstteki tutamaçtan tutup ekranda istediğin yere taşırsın."),
    color: ACCENT.purple,
    antic: "nod",
    Art: ModulesArt,
  },
  {
    title: tt("Dosyaları bana yedir"),
    text: tt("Bir dosyayı sürükleyip üstüme bırak, yutar ve Raf'ta saklarım. Sonra raftan istediğin yere sürükleyip bırakırsın. Aldığın ekran görüntüleri de kendiliğinden rafa düşer."),
    color: ACCENT.pink,
    antic: "giggle",
    Art: FeedArt,
  },
  {
    title: tt("Klavyeden çağır"),
    text: tt("Fareye uzanmana gerek yok. Bu kısayollar her yerde çalışır; istersen Ayarlar'dan değiştirebilirsin."),
    color: ACCENT.yellow,
    antic: "suspicious",
    Art: KeysArt,
  },
  {
    title: tt("Benimle konuş"),
    text: tt("Sohbet, ekrana sor ve sesli komut için Google'ın ücretsiz Gemini anahtarı lazım. Bir kere yapıştırman yeter; alarm kurar, not alır, müziği yönetir, aklımda tutarım."),
    color: ACCENT.purple,
    antic: "love",
    Art: AiArt,
  },
  {
    title: tt("Ekranını korurum"),
    text: tt("Biri yanına gelince {0} tuşlarına bas: ekranını uyuyan Nook'ların bir sahnesi kaplar (kamp ateşi, deniz altı, uzay ve 19 tane daha). Çalan müzik durur, mikrofonun kapanır; istersen parolayla kilitlerim. Kart numarası, IBAN ya da şifre kopyalarsan panoda tutmam."),
    keys: "shieldShortcut",
    color: ACCENT.purple,
    antic: "yawn",
    Art: ShieldArt,
  },
  {
    title: tt("Çalan şarkıyı bulurum"),
    text: tt("Videoda, dizide çalan şarkıyı merak ettin mi? {0} tuşlarına bas, DJ kulaklığımı takıp dinlerim; adını, sanatçısını ve kapağını getiririm. Mikrofonu değil, bilgisayarın kendi sesini dinlerim."),
    keys: "humShortcut",
    noKeys: tt("Videoda, dizide çalan şarkıyı merak ettin mi? Adadaki Hum çipine dokun, DJ kulaklığımı takıp dinlerim; adını, sanatçısını ve kapağını getiririm. Mikrofonu değil, bilgisayarın kendi sesini dinlerim."),
    color: ACCENT.pink,
    antic: "hum",
    Art: HumArt,
  },
  {
    title: tt("Sağlığına göz kulak olurum"),
    text: tt("Uzun süre ekrana bakınca göz molası, aralıklarla su hatırlatırım. Bunlar her zaman çalışır, odak modu açık olmasa da. Oyundayken ve tam ekranda susarım."),
    color: ACCENT.teal,
    antic: "stretch",
    Art: CareArt,
  },
  {
    title: tt("Günün düzeni bende"),
    text: tt("Takvime etkinlik ekle, yaklaşınca çentikte geri sayarım. Alarm, sen kapatana kadar bekler; oyundaysan çıkınca seni bulur. Pomodoro'dayken YouTube'a kaçarsan cama vurup kalan süreyi gösteririm."),
    color: ACCENT.blue,
    antic: "note",
    Art: DayArt,
  },
  {
    title: tt("Benim de bir keyfim var"),
    text: tt("İlgilendikçe mutlu olurum, uzun süre unutursan küserim. Beni tutup fırlatabilir, dürtebilirsin. Şimdi dene: soldaki beni tut ve fırlat!"),
    color: ACCENT.orange,
    antic: "shy",
    Art: MoodArt,
  },
  {
    title: tt("Ekranında dolaşırım"),
    text: tt("Arada çentikten çıkarım: pencerenin tepesine tünerim, pencereyi sürüklersen sendelerim. Ekranın altında çalışırken ipimle sarkarım, fare yaklaşınca kaçarım. Bilgisayar boştaysa adanın kenarında balık tutarım."),
    color: ACCENT.teal,
    antic: "wander",
    Art: OutingsArt,
  },
  {
    title: tt("Beni kendine göre giydir"),
    text: tt("Bana bir isim ver; bulut, kalp, damla gibi bir gövde, vinil ya da peluş doku ve renk seç. Gözlük, kep, tavşan kulağı, filiz, çiçek tokası da takarım. Üzerimize gelip tanış; Sağ tık › Görünüm'den istediğin zaman değiştirirsin."),
    color: ACCENT.pink,
    antic: "spin",
    Art: LookArt,
  },
  {
    title: tt("Argus'la birlikte çalışırım"),
    text: tt("Argus, izlediğin dizi ve filmlerin arşivi; ikimiz aynı ailedeniz. Sıradaki bölümünü, yeni çıkanları ve \"ne izlesem?\" sorusunu ben hallederim, \"İzledim\" dediğinde Argus'a yazarım."),
    alt: {
      title: tt("Argus'la tanış"),
      text: tt("Argus, izlediğin dizi ve filmleri takip ettiğin arşiv uygulaması; benim kardeşim. Kurarsan yeni bölümleri haber verir, ne izleyeceğini seçer, izlediklerini işaretlerim."),
    },
    color: "#1a8cff",
    antic: "wink",
    Art: ArgusArt,
    argus: true,
  },
  {
    title: tt("Claude Code adada"),
    text: tt("Claude Code çalışırken oturumlarını adada izlersin. İzin isterse ya da soru sorarsa terminale dönmeden adadan cevaplarsın; iş bitince haber veririm. Plan limitinin ne kadar dolduğunu da gösteririm."),
    color: "#D97757",
    antic: "wink",
    Art: ClaudeArt,
    claude: true,
  },
  {
    title: tt("Hazırız!"),
    text: tt("Artık seninleyim. Bu tanıtımı istediğin zaman Ayarlar'daki \"Nook nedir?\" ile yeniden açabilirsin."),
    color: ACCENT.green,
    antic: "love",
    centered: true,
  },
];

/**
 * Bu bilgisayarda gösterilecek adımlar: Claude Code yoksa onun adımı atlanır; Argus yalnızca Türkçe
 * olduğundan başka dilde, kurulu da değilse Argus adımı da.
 */
export function useTourSteps() {
  const hasClaude = useClaude((s) => !!s.setup?.present);
  const hasArgus = useArgus((s) => !!s.snap);
  return STEPS.filter((s) => (!s.claude || hasClaude) && (!s.argus || hasArgus || isTurkish));
}

/** Adım metni: {0} yerine kullanıcının o anki kısayolu */
function stepText(step: Step, settings: Settings) {
  if (!step.keys) return step.text;
  const combo = settings[step.keys];
  return combo ? step.text.replace("{0}", prettyKeys(combo)) : (step.noKeys ?? step.text.replace("{0}", tt("kısayol")));
}

/** "Nook nedir?" tanıtımı: ada ekrana yayılır; Nook solda anlatır, sağda canlandırmalı wireframe. */
export function Tour() {
  const step = useNook((s) => s.tourStep);
  const setStep = useNook((s) => s.setTourStep);
  const hasArgus = useArgus((s) => !!s.snap);
  const steps = useTourSteps();
  const base = steps[step] ?? steps[0];
  const settings = useNook((s) => s.settings);
  const merged = base.alt && !hasArgus ? { ...base, ...base.alt } : base;
  const cur = { ...merged, text: stepText(merged, settings) };
  const last = step === steps.length - 1;

  useEffect(() => {
    playAntic(base.antic);
  }, [base]);

  const next = () => (last ? endTour() : setStep(step + 1));
  const back = () => step > 0 && setStep(step - 1);

  // Klavye: → / Enter ileri, ← geri, Esc tanıtımı kapatır (yazı kutusundayken karışmaz)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      // Odaktaki düğmeye Enter zaten tıklar; iki kez ilerlemesin
      if (e.key === "Enter" && t?.tagName === "BUTTON") return;
      const st = useNook.getState();
      const at = st.tourStep;
      if (e.key === "Escape") endTour();
      else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (at >= steps.length - 1) endTour();
        else st.setTourStep(at + 1);
      } else if (e.key === "ArrowLeft" && at > 0) st.setTourStep(at - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steps.length]);

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
          <Sparkles size={13} strokeWidth={2.2} style={{ color: tintText(cur.color) }} />{tt("Nook nedir?")}</span>
        {!last && (
          <button
            onClick={endTour}
            title={tt("Tanıtımı kapat (Esc)")}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.05] px-3 py-1 text-[12.5px] font-medium text-label-2 transition-colors hover:bg-well-hi hover:text-label"
          >{tt("Tanıtımı geç")}<X size={13} strokeWidth={2.4} />
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
            {step === 0 && (
              <div className="mt-4">
                <LangChips />
              </div>
            )}
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
                  {step} / {steps.length - 2}
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
              <ArrowLeft size={13} strokeWidth={2.4} />{tt("Geri")}</button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => setStep(i)}
              aria-label={tt("{0}. adım", i + 1)}
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
            {step === 0 ? tt("Tanıyalım") : last ? tt("Hadi başlayalım") : tt("İleri")}
            {!last && <ArrowRight size={14} strokeWidth={2.4} />}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
