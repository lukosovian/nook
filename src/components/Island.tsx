import { useEffect, useRef } from "react";
import { normalizeColor, normalizeLook } from "../lib/look";
import { AnimatePresence, motion, useAnimationControls, type TargetAndTransition } from "motion/react";
import { playAntic } from "../hooks/useAntics";
import { CHEW_MS } from "../hooks/useFeeding";
import { useHitRect } from "../hooks/useHitRect";
import { boostFrames } from "../lib/frameCap";
import { useIslandMode } from "../hooks/useIslandMode";
import { useArgusCard } from "../lib/argus";
import { isPrimary } from "../lib/bridge";
import { FACE, ISLAND, ISLAND_TOP, MEDIA_COLLAPSED_WIDTH, mascotPose, tourPose } from "../lib/layout";
import { spring } from "../lib/motion";
import { startTour } from "../lib/tour";
import { exitBig } from "../lib/big";
import { useExpanded } from "../hooks/useExpanded";
import { expressionOf, statusOf, useNook, type Mood } from "../store/nook";
import { Nook, STATUS_COLOR } from "./mascot/Nook";
import { MiniPlayer } from "./media/MiniPlayer";
import { AlarmView } from "./overlays/AlarmView";
import { ContextMenu } from "./overlays/ContextMenu";
import { DownloadMini } from "./overlays/DownloadMini";
import { FocusMini } from "./overlays/FocusMini";
import { ListenMini } from "./overlays/ListenMini";
import { MoveFx } from "./overlays/MoveFx";
import { moveTarget } from "../lib/moveFx";
import { birthMotion, Intro, INTRO_ANTIC, introKind, introMs } from "./overlays/Intro";
import { OsdView } from "./overlays/OsdView";
import { PrivacyDots } from "./overlays/PrivacyDots";
import { ReminderView } from "./overlays/ReminderView";
import { ToastView } from "./overlays/ToastView";
import { Panels } from "./panels/Panels";
import { Brief } from "./brief/Brief";
import { PatchNotes } from "./notes/PatchNotes";
import { SearchPanel } from "./search/SearchPanel";
import { STEPS, Tour } from "./tour/Tour";

const SHADOW = "0 14px 34px -12px rgba(0,0,0,0.8)";

/** Transform katmanı (layout'tan bağımsız): çiğnerken squash & stretch, açken nefes, ekran değiştirirken kaçış. */
/** Ekran geçiş efektlerinden kalabilecek dönüş/kayma/renk izlerini sıfırlar */
const CLEAN = { x: 0, rotate: 0, skewX: 0, filter: "none" };

function jelly(mood: Mood, away: boolean): TargetAndTransition {
  return { ...CLEAN, ...jellyPose(mood, away) };
}

function jellyPose(mood: Mood, away: boolean): TargetAndTransition {
  if (away) {
    return { y: -40, scale: 0.5, opacity: 0, scaleX: 1, scaleY: 1, transition: { duration: 0.22, ease: "easeIn" } };
  }
  switch (mood) {
    case "chewing":
      return {
        y: 0,
        scale: 1,
        opacity: 1,
        scaleX: [1, 1.07, 0.97, 1.03, 1],
        scaleY: [1, 0.9, 1.05, 0.98, 1],
        transition: { duration: CHEW_MS / 1000, ease: "easeInOut" },
      };
    case "hungry":
      // Yalnızca scale döner — sabit opacity tekrarlanırsa tarayıcı onu ekran hızında boşuna çizer
      return {
        y: 0,
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        scale: [1, 1.025, 1],
        transition: { scale: { duration: 1.1, repeat: Infinity, ease: "easeInOut" }, default: spring.island },
      };
    default:
      return { y: 0, scale: 1, opacity: 1, scaleX: 1, scaleY: 1, transition: spring.island };
  }
}

/** Nook'un doğuşu: açılış efektine göre (açılış yoksa ortada "pop") */
const nookBirth = () => birthMotion(useNook.getState().intro ? introKind() : "dust");

/** Kartın yazısı kırpılmasın: metne göre genişler (tuval ile ölçülür), en fazla 580 px (pencere 600) */
const measure = (() => {
  let ctx: CanvasRenderingContext2D | null = null;
  return (text: string, font: string) => {
    ctx ??= document.createElement("canvas").getContext("2d");
    if (!ctx) return text.length * 7.4;
    ctx.font = font;
    return ctx.measureText(text).width;
  };
})();
function toastFit(title?: string, detail?: string) {
  if (!title) return ISLAND.toast.width;
  const text = Math.max(measure(title, "500 13px 'Inter Variable', sans-serif"), detail ? measure(detail, "11px 'Inter Variable', sans-serif") : 0);
  // Solda Nook (52) + sağda avatar ve boşluklar (~56)
  return Math.round(Math.min(580, Math.max(ISLAND.toast.width, 52 + text + 60)));
}

export function Island() {
  const mode = useIslandMode();
  useArgusCard(mode);
  const mood = useNook((s) => s.mood);
  const move = useNook((s) => s.move);
  const expression = useNook(expressionOf);
  const status = useNook(statusOf);
  const media = useNook((s) => s.media);
  const settings = useNook((s) => s.settings);
  const fullscreen = useNook((s) => s.fullscreen);
  const downloading = useNook((s) => s.downloads.length > 0);
  const focusing = useNook((s) => !!s.focus);
  const listening = useNook((s) => s.listening);
  const intro = useNook((s) => s.intro);

  // Açılış: parçacıklar toplanır, Nook doğar ve el sallar. İlk kurulumda ardından tanıtım açılır.
  useEffect(() => {
    if (!useNook.getState().intro) return;
    // Hızlı geçen gemi/parçacıklar 60'lık sınırda yüksek Hz ekranda takılır — açılış boyunca serbest
    boostFrames(true);
    const t = window.setTimeout(() => {
      boostFrames(false);
      useNook.getState().setIntro(false);
      playAntic(INTRO_ANTIC[introKind()]);
      if (isPrimary && !useNook.getState().toured) window.setTimeout(() => void startTour(), 900);
    }, introMs());
    return () => {
      window.clearTimeout(t);
      boostFrames(false);
    };
  }, []);

  const ex = useExpanded();
  const big = mode === "expanded" || mode === "search";
  const shape = big ? { width: ex.width, height: ex.height, radius: ex.radius } : ISLAND[mode];
  // Tam ekran yalnızca ada açıkken: kapanınca (imleç çıkınca, arama/tanıtım/özet açılınca) biter
  const bigOn = useNook((s) => !!s.big);
  useEffect(() => {
    if (bigOn && !big) exitBig();
  }, [bigOn, big]);
  useEffect(() => {
    if (!bigOn) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && exitBig();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [bigOn]);
  const playing = !!media?.playing;
  // Görünüm düzenlenirken dans etmesin: seçilen gözler görünsün
  const lookTab = useNook((s) => s.tab === "look");
  // Kapalı adada solda/sağda yer isteyenler: dinleme > indirme > odak > müzik
  const collapsed = mode === "collapsed";
  const miniListen = collapsed && listening;
  const miniDownload = collapsed && downloading && !miniListen;
  const miniFocus = collapsed && focusing && !miniListen && !miniDownload;
  const miniPlayer = collapsed && playing && !miniListen && !miniDownload && !miniFocus;
  const toastWidth = useNook((s) => toastFit(s.toasts[0]?.title, s.toasts[0]?.detail));
  const width = miniPlayer || miniDownload || miniFocus || miniListen ? MEDIA_COLLAPSED_WIDTH : mode === "toast" ? toastWidth : shape.width;
  const transition = mode === "feeding" ? spring.stretch : spring.island;
  const view = useNook((s) => (s.tab === "home" ? "home" : "module"));
  const tourStep = useNook((s) => s.tourStep);
  const pose = mode === "tour" ? tourPose(!!STEPS[tourStep]?.centered) : mascotPose(mode, width, view, ex);

  const ref = useRef<HTMLDivElement>(null);
  useHitRect(ref);
  useSelectHold();

  // Ses/parlaklık her adımda: Nook bara doğru dürtüp (ya da geri çekip) yerine döner
  const nudge = useAnimationControls();
  useEffect(
    () =>
      useNook.subscribe((st, prev) => {
        const o = st.osd;
        if (!o || !o.dir || (prev.osd && prev.osd.value === o.value && prev.osd.muted === o.muted)) return;
        void nudge.start({
          x: o.dir > 0 ? [0, 3, 0] : [0, -2.5, 0],
          scaleX: o.dir > 0 ? [1, 1.08, 1] : [1, 0.94, 1],
          transition: { duration: 0.26, ease: "easeOut" },
        });
      }),
    [nudge],
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 flex justify-center" style={{ paddingTop: ISLAND_TOP }}>
      <AnimatePresence>{move && <MoveFx key={`${move.kind}-${move.phase}`} move={move} />}</AnimatePresence>
      <motion.div
        className="pointer-events-auto"
        style={{ originY: 0 }}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={fullscreen ? jelly(mood, true) : move ? moveTarget(move) : jelly(mood, false)}
      >
        {/* Ekrana yapışık çentik: saf siyah, üst köşeler düz, yalnızca alt köşeler yuvarlak */}
        <motion.div
          ref={ref}
          data-island
          className="relative overflow-hidden bg-black"
          initial={false}
          animate={{
            width,
            height: shape.height,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: shape.radius,
            borderBottomRightRadius: shape.radius,
            boxShadow: SHADOW,
          }}
          transition={transition}
        >
          <AnimatePresence>
            {mode === "expanded" && <Panels key="panels" />}
            {mode === "search" && <SearchPanel key="search" />}
            {mode === "tour" && <Tour key="tour" />}
            {mode === "brief" && <Brief key="brief" />}
            {mode === "notes" && <PatchNotes key="notes" />}
          </AnimatePresence>

          {/* Nook'un arkasındaki parıltı: yalnızca durum varken, durumun renginde */}
          <Halo pose={pose} color={status ? STATUS_COLOR[status] : null} transition={transition} />

          {/* z-10: panellerin katmanı yüzün tıklamalarını yutmasın */}
          <motion.div className="absolute z-10" initial={false} animate={pose} transition={transition}>
            <motion.div {...nookBirth()}>
              <motion.div animate={nudge}>
              <Nook
                expression={expression}
                status={status}
                grooving={playing && !(mode === "expanded" && lookTab)}
                color={normalizeColor(settings.faceColor)}
                look={normalizeLook(settings.look)}
                bounds={ref}
              />
              </motion.div>
            </motion.div>
          </motion.div>

          <AnimatePresence>{intro && <Intro key="intro" />}</AnimatePresence>
          <AnimatePresence>{miniPlayer && <MiniPlayer key="mini" media={media!} />}</AnimatePresence>
          <AnimatePresence>{miniDownload && <DownloadMini key="dl" />}</AnimatePresence>
          <AnimatePresence>{miniFocus && <FocusMini key="focus" />}</AnimatePresence>
          <AnimatePresence>{miniListen && <ListenMini key="listen" />}</AnimatePresence>
          <PrivacyDots mode={mode} />
          <ContextMenu bounds={ref} />

          <AnimatePresence>
            {mode === "osd" && <OsdView key="osd" />}
            {mode === "toast" && <ToastView key="toast" />}
            {mode === "alarm" && <AlarmView key="alarm" />}
            {mode === "reminder" && <ReminderView key="reminder" />}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}

/**
 * Açılır listenin (select) seçenekleri adanın dışına taşar; imleç oraya gidince ada kapanıp
 * listeyi de götürüyordu. Liste açıkken ada açık kalır; seçince, Esc'te ya da odak gidince bırakır.
 */
function useSelectHold() {
  useEffect(() => {
    const isSelect = (t: EventTarget | null) => t instanceof HTMLSelectElement;
    const hold = (on: boolean) => useNook.getState().setHold("select", on);
    const down = (e: PointerEvent) => isSelect(e.target) && hold(true);
    const release = (e: Event) => isSelect(e.target) && hold(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && hold(false);
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("change", release, true);
    window.addEventListener("focusout", release, true);
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("change", release, true);
      window.removeEventListener("focusout", release, true);
      window.removeEventListener("keydown", key, true);
    };
  }, []);
}

function Halo({
  pose,
  color,
  transition,
}: {
  pose: { left: number; top: number; scale: number };
  color: string | null;
  transition: object;
}) {
  // Yalnızca bir durum varken (renkli). Varsayılan beyaz parıltı kaldırıldı: adanın arkasında
  // beyaz bir ışık yanıyormuş gibi görünüyordu.
  const size = FACE * pose.scale * 2.8;
  const visible = color ? 1 : 0;
  return (
    <motion.div
      className="pointer-events-none absolute z-[5] rounded-full"
      initial={false}
      animate={{
        left: pose.left + FACE / 2 - size / 2,
        top: pose.top + FACE / 2 - size / 2,
        width: size,
        height: size,
        opacity: visible,
        background: `radial-gradient(circle, ${color ?? "rgba(160,190,255,0.55)"} 0%, transparent 62%)`,
      }}
      // mix-blend-mode yok: şeffaf pencerede screen karışımı adanın dışına mavi-beyaz ışık sızdırıyordu
      // (ada zaten siyah, siyah üstünde screen ile normal çizim aynı görünür)
      style={{ filter: "blur(6px)" }}
      transition={{ ...transition, opacity: { duration: 0.35 }, background: { duration: 0.35 } }}
    />
  );
}
