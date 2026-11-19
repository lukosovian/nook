/**
 * "Daha da hafif" yama notu demosu: gökyüzü bir tur oynayıp dinlenir, yalnızca seçili dil ve açılan ekran yüklenir.
 */
import { motion } from "motion/react";
import { Languages, PanelsTopLeft } from "lucide-react";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

const STARS = [
  { x: 10, y: 6 },
  { x: 30, y: 15 },
  { x: 96, y: 5 },
  { x: 118, y: 14 },
  { x: 140, y: 7 },
];

/** Adadaki yıldızlar bir tur parlar, sonra kıpırtısız dinlenir; altta: 9 dilden yalnızca biri, ekranlar açılınca */
function LighterDemo() {
  const n = useTick(2200);
  const resting = n % 2 === 1;
  const c = resting ? ACCENT.green : ACCENT.purple;
  // Seyrek ekranlar sırayla "açılır": yalnızca açılan dolar
  const open = n % 4;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[8px] top-[6px] h-[26px] w-[152px] overflow-hidden rounded-[11px] bg-black">
          {STARS.map((s, i) => (
            <motion.i
              key={i}
              className="absolute h-[2px] w-[2px] rounded-full bg-cyan-100"
              style={{ left: s.x, top: s.y }}
              animate={resting ? { opacity: 0.5, scale: 1 } : { opacity: [0.5, 1, 0.15, 0.5], scale: [1, 1.5, 0.8, 1] }}
              transition={resting ? { duration: 0.5 } : { duration: 1 + i * 0.12, delay: i * 0.13, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
          <span className="absolute left-[67px] top-[5px]">
            <MiniNook color="#ffffff" size={16} eyes={resting ? "closed" : "open"} />
          </span>
        </div>
        <span className="absolute left-[166px] top-[6px] flex h-[26px] w-[66px] items-center justify-center rounded-[9px] text-[8.5px] font-semibold" style={{ background: tintBg(c, 16), color: tintText(c) }}>
          {resting ? tt("Dinleniyor") : tt("Bir tur oynar")}
        </span>

        <div className="absolute left-[8px] top-[40px] flex h-[22px] w-[224px] items-center gap-[7px] rounded-[8px] bg-white/[0.05] px-[8px]">
          <Languages size={12} color={tintText(ACCENT.blue)} />
          <span className="flex-1 whitespace-nowrap text-[9px] text-label">{tt("Yalnızca seçili dil yüklenir")}</span>
          <span className="flex gap-[2px]">
            {Array.from({ length: 9 }, (_, i) => (
              <i key={i} className="h-[4px] w-[4px] rounded-full" style={{ background: i === 0 ? ACCENT.blue : "rgb(255 255 255 / 0.14)" }} />
            ))}
          </span>
        </div>

        <div className="absolute left-[8px] top-[68px] flex h-[22px] w-[224px] items-center gap-[7px] rounded-[8px] bg-white/[0.05] px-[8px]">
          <PanelsTopLeft size={12} color={tintText(ACCENT.teal)} />
          <span className="flex-1 text-[9px] text-label">{tt("Seyrek ekranlar açınca gelir")}</span>
          <span className="flex gap-[3px]">
            {Array.from({ length: 4 }, (_, i) => (
              <motion.i key={i} className="h-[9px] w-[12px] rounded-[3px]" animate={{ background: i === open ? ACCENT.teal : "rgb(255 255 255 / 0.14)" }} transition={{ duration: 0.2 }} />
            ))}
          </span>
        </div>
      </Fit>
    </Stage>
  );
}

export const DEMOS33 = {
  lighter: LighterDemo,
};
