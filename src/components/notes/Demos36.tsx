/**
 * 0.3.14 yama notu demosu: Nook'un zekâsı olarak Claude.
 */
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

const CLAUDE = "#D97757";

/** Ayarlar'daki seçim Gemini'den Claude'a geçer; Nook soruyu Claude ile cevaplar */
function ClaudeBrainDemo() {
  const n = useTick(1500);
  const claude = n % 3 !== 0;
  const answered = n % 3 === 2;
  const c = claude ? CLAUDE : ACCENT.blue;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[8px] top-[8px] flex h-[26px] w-[224px] items-center gap-[8px] rounded-[9px] bg-white/[0.06] px-[9px]">
          <span className="flex-1 text-[10px] font-semibold text-label">{tt("Nook'un zekâsı")}</span>
          <span className="relative flex h-[18px] w-[104px] rounded-full bg-black/40 p-[2px]">
            <motion.i className="absolute top-[2px] h-[14px] w-[50px] rounded-full" style={{ background: tintBg(c, 45) }} animate={{ left: claude ? 52 : 2 }} transition={{ type: "spring", stiffness: 420, damping: 30 }} />
            <b className="relative z-10 flex-1 text-center text-[8.5px] leading-[14px]" style={{ color: claude ? "rgb(255 255 255 / 0.45)" : "#fff" }}>Gemini</b>
            <b className="relative z-10 flex-1 text-center text-[8.5px] leading-[14px]" style={{ color: claude ? "#fff" : "rgb(255 255 255 / 0.45)" }}>Claude</b>
          </span>
        </div>
        <div className="absolute left-[8px] top-[44px] flex w-[224px] items-end gap-[7px]">
          <MiniNook color={c} size={26} eyes={answered ? "happy" : "open"} />
          <motion.div key={n % 3} className="flex min-h-[26px] flex-1 items-center gap-[5px] rounded-[10px] rounded-bl-[3px] px-[9px] py-[5px]" style={{ background: tintBg(c, 16) }} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            {answered ? (
              <>
                <Check size={11} color={ACCENT.green} strokeWidth={3} />
                <span className="text-[9.5px] leading-tight" style={{ color: tintText(c) }}>{tt("Yarın 08:00'e toplantı alarmını kurdum")}</span>
              </>
            ) : (
              <span className="text-[9.5px]" style={{ color: tintText(c) }}>{claude ? tt("Claude düşünüyor…") : tt("Gemini")}</span>
            )}
          </motion.div>
        </div>
      </Fit>
    </Stage>
  );
}

export const DEMOS36 = {
  claudebrain: ClaudeBrainDemo,
};
