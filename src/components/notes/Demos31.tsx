/**
 * 0.3.14 yama notu demoları: boşta dinlenen ada, yalnızca değişince yazılan kayıt, küçük düzeltmeler.
 */
import { motion } from "motion/react";
import { Check, HardDrive, Lock, MousePointer2, Search } from "lucide-react";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

/** İmleç uzakta: ada 30 karede ve seyrek bakar · yakında: 60 kare · ekran kilitli: çizim durur */
function IdleRestDemo() {
  const n = useTick(1600);
  const phase = n % 3; // 0 uzak · 1 yakın · 2 kilitli
  const c = [ACCENT.green, ACCENT.orange, ACCENT.gray][phase];
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[76px] top-0 flex h-[22px] w-[88px] items-center justify-center rounded-b-[10px] bg-black">
          <MiniNook color="#ffffff" size={14} eyes={phase === 2 ? "closed" : "open"} />
        </div>
        {phase === 2 ? (
          <motion.div className="absolute left-[111px] top-[32px]" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}>
            <Lock size={18} color="rgb(255 255 255 / 0.55)" />
          </motion.div>
        ) : (
          <motion.div className="absolute" initial={false} animate={{ left: phase === 1 ? 128 : 196, top: phase === 1 ? 24 : 52 }} transition={{ type: "spring", stiffness: 220, damping: 24 }}>
            <MousePointer2 size={15} color="#fff" fill="#fff" />
          </motion.div>
        )}
        <div className="absolute left-[8px] top-[66px] flex w-[224px] gap-[6px]">
          <span className="flex h-[26px] flex-1 items-center justify-center gap-[5px] rounded-[8px]" style={{ background: tintBg(c, 16) }}>
            <motion.b key={phase} className="text-[12px] leading-none" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} style={{ color: tintText(c) }}>
              {[30, 60, 0][phase]}
            </motion.b>
            <i className="text-[8px] not-italic text-label-2">{tt("kare / sn")}</i>
          </span>
          <span className="flex h-[26px] flex-[1.5] items-center justify-center rounded-[8px] bg-white/[0.05] text-[8.5px] text-label-2">
            {[tt("İmleç uzakta: dinlenir"), tt("Yaklaşınca tam hız"), tt("Kilitliyken çizmez")][phase]}
          </span>
        </div>
      </Fit>
    </Stage>
  );
}

/** Üstte eski hâl: disk her saniye yanar. Altta yeni: yalnızca bir şey değişince */
function LazySaveDemo() {
  const n = useTick(600);
  const changed = n % 6 === 3;
  const row = (label: string, lit: boolean, color: string, top: number) => (
    <div className="absolute left-[8px] flex h-[34px] w-[224px] items-center gap-[8px] rounded-[9px] bg-white/[0.05] px-[10px]" style={{ top }}>
      <span className="flex-1 text-[9.5px] font-semibold text-label">{label}</span>
      <span className="flex gap-[3px]">
        {Array.from({ length: 6 }, (_, i) => (
          <i key={i} className="h-[5px] w-[5px] rounded-full" style={{ background: (color === ACCENT.orange ? i <= n % 6 : i === 3 && n % 6 >= 3) ? color : "rgb(255 255 255 / 0.14)" }} />
        ))}
      </span>
      <motion.span animate={{ opacity: lit ? 1 : 0.25, scale: lit ? 1.15 : 1 }} transition={{ duration: 0.15 }}>
        <HardDrive size={15} color={lit ? color : "#fff"} />
      </motion.span>
    </div>
  );
  return (
    <Stage>
      <Fit w={240} h={96}>
        {row(tt("Önce: her saniye yazar"), n % 2 === 0, ACCENT.orange, 8)}
        {row(tt("Şimdi: yalnızca değişince"), changed, ACCENT.green, 50)}
      </Fit>
    </Stage>
  );
}

/** Aramada "illustrator" artık bulunur; art arda iki "İçtim" iki bardak sayılır */
function Fixes314Demo() {
  const n = useTick(1500);
  const step = n % 2;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[8px] top-[8px] flex h-[26px] w-[224px] items-center gap-[7px] rounded-[9px] border px-[9px]" style={{ borderColor: tintBg(ACCENT.teal, 45), background: tintBg(ACCENT.teal, 8) }}>
          <Search size={12} color={tintText(ACCENT.teal)} />
          <span className="text-[10.5px] font-semibold text-label">illustrator</span>
        </div>
        <motion.div key={`r${step}`} className="absolute left-[8px] top-[38px] flex h-[22px] w-[224px] items-center gap-[7px] rounded-[8px] bg-white/[0.06] px-[9px]" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <i className="h-[11px] w-[11px] rounded-[3px]" style={{ background: ACCENT.orange }} />
          <span className="flex-1 text-[10px] text-label">Illustrator</span>
          <Check size={12} color={ACCENT.green} strokeWidth={3} />
        </motion.div>
        <div className="absolute left-[8px] top-[68px] flex h-[22px] w-[224px] items-center gap-[6px] px-[2px]">
          <span className="text-[9px] text-label-2">{tt("İçtim × 2")}</span>
          <span className="flex flex-1 gap-[3px]">
            {Array.from({ length: 8 }, (_, i) => (
              <motion.i key={i} className="h-[9px] w-[9px] rounded-full" animate={{ background: i < 3 + step * 2 ? "#2FD4C0" : "rgb(255 255 255 / 0.14)" }} />
            ))}
          </span>
          <b className="text-[10px]" style={{ color: tintText("#2FD4C0") }}>{3 + step * 2} / 8</b>
        </div>
      </Fit>
    </Stage>
  );
}

export const DEMOS31 = {
  idlerest: IdleRestDemo,
  lazysave: LazySaveDemo,
  fixes314: Fixes314Demo,
};
