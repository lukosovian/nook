/**
 * 0.3.1 yama notu demosu: Nook Mobil'in yeni ana ekranı, yama notları, sudan "İçtim" ve PC kapalıyken Hum.
 * Studio'da yama notu kartında oynar; `?preview=notes` ile bakılır.
 */
import { motion } from "motion/react";
import { Check, Droplet, Music } from "lucide-react";
import { DEFAULT_LOOK } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Pc, Phone, Stage, useTick } from "./Demos6";

const TILE = [ACCENT.blue, "#FF5C8A", "#9B7BFF", "#2FD4C0"];

/** Telefonda dört sahne sırayla: ana ekran · yama notları · su · Hum; sağdaki PC her birine karşılık verir */
function Mobile031Demo() {
  const scene = Math.floor(useTick(1800)) % 4;
  const B = "#3D8BFF";
  const P = ACCENT.purple;
  return (
    <Stage>
      <Fit w={260} h={110}>
        <Phone>
          {scene === 0 && (
            <motion.div key="h" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-[6.5px] font-extrabold text-label">{tt("Günaydın")}</p>
              <div className="mt-[2px] flex flex-col items-center rounded-[5px] border border-white/10 bg-white/[0.05] pb-[2px] pt-[1px]">
                <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={18} expression="idle" />
                <span className="mt-[1px] block h-[3px] w-[80%] rounded-full bg-white/10" />
              </div>
              <div className="mt-[3px] grid grid-cols-2 gap-[2px]">
                {TILE.map((c) => (
                  <span key={c} className="block h-[13px] rounded-[3px] border" style={{ background: tintBg(c, 16), borderColor: tintBg(c, 32) }} />
                ))}
              </div>
            </motion.div>
          )}
          {scene === 1 && (
            <motion.div key="n" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-[5.5px] font-bold text-label">{tt("Yama notları")}</p>
              <div className="mt-[2px] grid grid-cols-2 gap-[2px]">
                {[tt("Mobil"), "PC"].map((x) => (
                  <span key={x} className="rounded-[3px] bg-white/[0.06] px-[2px] py-[2px]">
                    <span className="block text-[3.5px] text-label-3">{x}</span>
                    <span className="block text-[5.5px] font-extrabold text-label">0.3.1</span>
                  </span>
                ))}
              </div>
              {["0.3.1", "0.3.0"].map((v, i) => (
                <motion.span
                  key={v}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.2 }}
                  className="mt-[2px] block rounded-[3px] px-[2px] py-[2px]"
                  style={{ background: tintBg(P, i ? 8 : 16) }}
                >
                  <span className="text-[5px] font-extrabold" style={{ color: tintText(P) }}>
                    {v}
                  </span>
                  <span className="mt-[1px] block h-[2px] w-[85%] rounded-full bg-white/15" />
                </motion.span>
              ))}
            </motion.div>
          )}
          {scene === 2 && (
            <motion.div key="w" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-[6px]">
              <motion.div animate={{ opacity: [1, 1, 0], y: [0, 0, -4] }} transition={{ duration: 1.5, times: [0, 0.6, 1] }} className="rounded-[4px] bg-white/[0.08] p-[3px]">
                <p className="flex items-center gap-[2px] text-[5px] font-bold text-label">
                  <Droplet size={5} style={{ color: B }} /> {tt("Su içme vakti")}
                </p>
                <div className="mt-[2px] flex gap-[2px]">
                  <motion.span animate={{ scale: [1, 1, 0.88, 1] }} transition={{ duration: 0.9, times: [0, 0.5, 0.7, 1] }} className="rounded-[2px] px-[3px] py-[1px] text-[4.5px] font-bold text-black" style={{ background: B }}>
                    {tt("İçtim")}
                  </motion.span>
                  <span className="rounded-[2px] bg-white/10 px-[3px] py-[1px] text-[4.5px] text-label-2">{tt("Sonra")}</span>
                </div>
              </motion.div>
            </motion.div>
          )}
          {scene === 3 && (
            <motion.div key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center pt-[4px]">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full" style={{ background: tintBg(P, 20) }}>
                <Music size={9} style={{ color: tintText(P) }} />
              </span>
              <p className="mt-[3px] text-center text-[4.2px] leading-[1.35] text-label-2">{tt("PC kapalıyken dinlendi")}</p>
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-[2px] flex items-center gap-[1px] text-[4.5px] font-bold" style={{ color: tintText(ACCENT.green) }}>
                <Check size={5} /> {tt("Bulundu")}
              </motion.span>
            </motion.div>
          )}
        </Phone>
        <Pc w={150}>
          <div className="flex h-full items-center justify-center">
            <motion.span key={scene} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-full bg-black px-[8px] py-[3px] text-[6.5px] font-semibold text-label">
              {scene === 0 ? tt("Nook Mobil yenilendi") : scene === 1 ? tt("Notlar telefonda") : scene === 2 ? tt("Nook da su içti") : tt("Hum geçmişine eklendi")}
            </motion.span>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

export const DEMOS19 = {
  mobile031: Mobile031Demo,
};
