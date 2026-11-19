/**
 * Kısa tanıtımın "yaparak öğren" adımları: küçük bir deneme ekranında çentiğin üstüne gelinir, dosya
 * bırakılır ya da alarm kurulur (hepsi deneme: gerçek dosya ya da alarm oluşmaz). Yapılınca `onDone`
 * çağrılır, tanıtım kendiliğinden ilerler. Son adımdaki "Ne kadar konuşkan olayım?" kartları da burada.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlarmClock, ArrowUp, BellOff, BellRing, Check, FileText, LogOut, MousePointer2, PartyPopper, type LucideIcon } from "lucide-react";
import { applyChattiness, CHATTINESS, type Chattiness } from "../../lib/chattiness";
import { tt } from "../../lib/i18n";
import { useNook } from "../../store/nook";
import { MyNook } from "../mascot/Figure";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { Screen, Tip } from "./TourArt";

const POP = { type: "spring", stiffness: 420, damping: 30 } as const;
/** Yapılınca bu kadar sonra sıradaki adıma geçilir (olan biteni görmeye yetecek kadar) */
const ADVANCE_MS = 1900;

function useAdvance(done: boolean, onDone?: () => void) {
  useEffect(() => {
    if (!done || !onDone) return;
    const t = window.setTimeout(onDone, ADVANCE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
}

// ---------------------------------------------------------------- Üstüme gel

export function TryHoverArt({ onDone }: { onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  useAdvance(open, onDone);
  return (
    <div className="flex h-full flex-col gap-3">
      <Screen height={308}>
        <motion.div
          onPointerEnter={() => setOpen(true)}
          onClick={() => setOpen(true)}
          className="absolute left-1/2 top-0 z-10 -translate-x-1/2 cursor-pointer overflow-hidden bg-black"
          style={{ boxShadow: "0 8px 20px -8px rgba(0,0,0,0.9)" }}
          initial={false}
          animate={{ width: open ? 330 : 92, height: open ? 132 : 24, borderBottomLeftRadius: open ? 20 : 10, borderBottomRightRadius: open ? 20 : 10 }}
          transition={POP}
        >
          <motion.div className="absolute" initial={false} animate={{ left: open ? 18 : 39, top: open ? 18 : 5, scale: open ? 2.4 : 1 }} transition={POP} style={{ originX: 0, originY: 0 }}>
            <MyNook size={14} expression={open ? "happy" : "idle"} />
          </motion.div>
          <motion.div className="absolute left-[70px] right-3 top-4 grid grid-cols-2 grid-rows-[1.3fr_1fr_1fr] gap-1.5" style={{ height: 102 }} initial={false} animate={{ opacity: open ? 1 : 0 }} transition={{ delay: open ? 0.15 : 0 }}>
            {[ACCENT.pink, ACCENT.red, ACCENT.orange, ACCENT.yellow, ACCENT.green, ACCENT.teal].map((c, i) => (
              <span key={i} className="flex items-center gap-1.5 rounded-[10px] border px-1.5" style={{ background: tintBg(c, 12), borderColor: tintBg(c, 30) }}>
                <span className="h-3.5 w-3.5 rounded-[5px]" style={{ background: tintBg(c, 45) }} />
                <span className="h-1.5 w-10 rounded-full" style={{ background: tintBg(c, 55) }} />
              </span>
            ))}
          </motion.div>
        </motion.div>
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.p
              key="ok"
              className="absolute inset-x-0 top-[158px] flex items-center justify-center gap-1.5 text-[14px] font-semibold"
              style={{ color: tintText(ACCENT.green) }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Check size={15} strokeWidth={3} />
              {tt("İşte böyle açılırım!")}
            </motion.p>
          ) : (
            <motion.div key="hint" className="absolute inset-x-0 top-[34px] flex flex-col items-center gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.span animate={{ y: [0, -5, 0] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}>
                <ArrowUp size={18} strokeWidth={2.6} style={{ color: tintText(ACCENT.blue) }} />
              </motion.span>
              <span className="rounded-full border px-3 py-1 text-[13px] font-semibold" style={{ background: tintBg(ACCENT.blue, 20), borderColor: tintBg(ACCENT.blue, 46), color: tintText(ACCENT.blue) }}>
                {tt("Fareyle çentiğin üstüne gel")}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </Screen>
      <div className="flex gap-2">
        <Tip icon={MousePointer2} color={ACCENT.blue}>{tt("Üst ortaya gel:")}{" "}<b className="font-medium text-label">{tt("açılırım")}</b>
        </Tip>
        <Tip icon={LogOut} color={ACCENT.teal}>{tt("Uzaklaş:")}{" "}<b className="font-medium text-label">{tt("kapanırım")}</b>
        </Tip>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Dosya bırak ya da alarm kur

const TIMES = ["07:30", "08:00", "22:30"];

export function TryDoArt({ onDone }: { onDone?: () => void }) {
  const [fed, setFed] = useState(false);
  const [near, setNear] = useState(false);
  const [alarm, setAlarm] = useState<string | null>(null);
  const notch = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  useAdvance(fed || !!alarm, onDone);

  /** İmleç çentiğe yeterince yakın mı (ekran koordinatı: yakınlaştırmadan etkilenmez) */
  const over = (e: MouseEvent | TouchEvent | PointerEvent) => {
    const r = notch.current?.getBoundingClientRect();
    if (!r || !("clientX" in e)) return false;
    return e.clientX > r.left - 36 && e.clientX < r.right + 36 && e.clientY < r.bottom + 44;
  };

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex min-h-0 flex-1 gap-3">
        {/* Dosya: sürükleyip çentiğe bırak (ya da dokun) */}
        <div className="min-w-0 flex-[1.25]">
          <Screen height={322} bare>
            <motion.div
              ref={notch}
              className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 items-center justify-center overflow-hidden bg-black"
              style={{ boxShadow: "0 8px 20px -8px rgba(0,0,0,0.9)" }}
              initial={false}
              animate={{ width: near || fed ? 150 : 92, height: near || fed ? 54 : 24, borderBottomLeftRadius: near || fed ? 22 : 10, borderBottomRightRadius: near || fed ? 22 : 10 }}
              transition={POP}
            >
              <motion.div initial={false} animate={{ scale: near || fed ? 2.1 : 1 }} transition={POP}>
                <MyNook size={14} expression={fed ? "happy" : near ? "surprised" : "idle"} />
              </motion.div>
            </motion.div>
            {!fed && (
              <motion.div
                drag
                dragSnapToOrigin
                dragElastic={0.2}
                onDragStart={() => (dragged.current = true)}
                onDrag={(e) => setNear(over(e))}
                onDragEnd={(e) => {
                  window.setTimeout(() => (dragged.current = false), 0);
                  setNear(false);
                  if (over(e)) setFed(true);
                }}
                onClick={() => !dragged.current && setFed(true)}
                whileDrag={{ scale: 1.08, rotate: -4 }}
                className="absolute left-[calc(50%-34px)] top-[150px] z-20 flex w-[68px] cursor-grab touch-none select-none flex-col items-center gap-1"
              >
                <span className="flex h-12 w-10 items-center justify-center rounded-[7px] border border-white/20 bg-white/[0.12]">
                  <FileText size={20} className="text-white/85" strokeWidth={1.8} />
                </span>
                <span className="rounded bg-black/50 px-1 text-[10.5px] text-white/85">{tt("rapor.pdf")}</span>
              </motion.div>
            )}
            <p className="absolute inset-x-2 bottom-[58px] text-center text-[13px] font-semibold" style={{ color: tintText(fed ? ACCENT.green : ACCENT.pink) }}>
              {fed ? tt("Yuttum, Raf'ta duruyor!") : tt("Dosyayı tutup üstüme bırak")}
            </p>
            {/* Raf */}
            <div className="absolute inset-x-2 bottom-[24px] flex h-[28px] items-center gap-1.5 rounded-[10px] bg-black/40 px-2">
              <MiniNook color={ACCENT.teal} size={18} />
              <span className="text-[11.5px] font-semibold" style={{ color: tintText(ACCENT.teal) }}>{tt("Raf")}</span>
              {fed && (
                <motion.span className="flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.06] px-2 py-[1px] text-[11px] text-label-2" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...POP, delay: 0.25 }}>
                  <FileText size={11} />
                  {tt("rapor.pdf")}
                </motion.span>
              )}
            </div>
          </Screen>
        </div>
        {/* Alarm: bir saate dokun */}
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 rounded-[16px] border px-3" style={{ height: 322, background: tintBg(ACCENT.yellow, 6), borderColor: tintBg(ACCENT.yellow, 22) }}>
          <MiniNook color={ACCENT.yellow} size={40} icon={AlarmClock} />
          <p className="text-center text-[13px] font-semibold" style={{ color: tintText(alarm ? ACCENT.green : ACCENT.yellow) }}>
            {alarm ? tt("Kurdum: {0}", alarm) : tt("Ya da bir saate dokun")}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {TIMES.map((t) => (
              <motion.button
                key={t}
                onClick={() => setAlarm(t)}
                whileTap={{ scale: 0.92 }}
                className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-bold tabular-nums"
                style={{ background: tintBg(ACCENT.yellow, alarm === t ? 30 : 12), borderColor: tintBg(ACCENT.yellow, alarm === t ? 70 : 32), color: tintText(ACCENT.yellow) }}
              >
                {alarm === t && <Check size={13} strokeWidth={3} />}
                {t}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
      <p className="text-center text-[11.5px] text-label-3">{tt("Burası deneme alanı: gerçek bir dosya ya da alarm oluşmaz.")}</p>
    </div>
  );
}

// ---------------------------------------------------------------- Ne kadar konuşkan olayım?

const CHATTY_LOOK: Record<Chattiness, { icon: LucideIcon; color: string }> = {
  quiet: { icon: BellOff, color: ACCENT.gray },
  balanced: { icon: BellRing, color: ACCENT.teal },
  lively: { icon: PartyPopper, color: ACCENT.pink },
};

/** Üç büyük seçim kartı; dokununca ayarlar hemen uygulanır. Yeni kurulumda "Dengeli" seçili gelir. */
export function ChattyCards() {
  const saved = useNook((s) => s.settings.chattiness);
  const fresh = useNook((s) => !s.toured);
  const cur = saved ?? (fresh ? "balanced" : null);
  return (
    <div className="flex justify-center gap-2.5">
      {CHATTINESS.map((c, i) => {
        const { icon, color } = CHATTY_LOOK[c.id];
        const on = cur === c.id;
        return (
          <motion.button
            key={c.id}
            onClick={() => applyChattiness(c.id)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.97 }}
            transition={{ ...POP, delay: 0.2 + i * 0.06 }}
            className="relative flex w-[262px] items-center gap-2.5 rounded-[18px] border px-3 py-2.5 text-left"
            style={{ background: tintBg(color, on ? 20 : 8), borderColor: tintBg(color, on ? 70 : 24), boxShadow: on ? `0 0 18px -8px ${color}` : undefined }}
          >
            <MiniNook color={color} size={34} icon={icon} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="flex items-center gap-1.5">
                <span className="text-[14px] font-bold" style={{ color: tintText(color) }}>
                  {c.label}
                </span>
                {c.recommended && <span className="rounded-full bg-white/[0.1] px-1.5 py-[1px] text-[10.5px] font-semibold text-label-2">{tt("önerilen")}</span>}
              </span>
              <span className="mt-[3px] block text-[12px] leading-snug text-label-2">{c.hint}</span>
            </span>
            {on && (
              <span className="absolute right-2 top-2 flex h-[18px] w-[18px] items-center justify-center rounded-full" style={{ background: color, color: "#111" }}>
                <Check size={12} strokeWidth={3.2} />
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
