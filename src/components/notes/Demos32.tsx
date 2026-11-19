/**
 * Yama notu demoları: oyunda susan kısayollar, daha az arka plan işi, telefondan kapatma izni.
 */
import { motion } from "motion/react";
import { Camera, Gamepad2, Lock, Mic, Music, Power, Shield, Smartphone, Volume2 } from "lucide-react";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

/** Tam ekran oyunda Ctrl+Shift+Space oyuna gider, ada açılmaz; kalkan kısayolu Nook'ta kalır */
function GameKeysDemo() {
  const n = useTick(1500);
  const shield = n % 3 === 2; // iki tur oyun kısayolu, bir tur kalkan
  const keys = shield ? ["Ctrl", "Alt", "H"] : ["Ctrl", "Shift", "Space"];
  const c = shield ? ACCENT.blue : ACCENT.green;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[8px] top-[6px] h-[54px] w-[224px] overflow-hidden rounded-[9px] border border-white/10 bg-white/[0.04]">
          <div className="absolute left-[78px] top-0 flex h-[14px] w-[68px] items-center justify-center rounded-b-[8px] bg-black">
            <MiniNook color="#ffffff" size={10} eyes={shield ? "open" : "closed"} />
          </div>
          <motion.div
            className="absolute left-[100px] top-[22px]"
            animate={shield ? { scale: 1, opacity: 0.35 } : { scale: [1, 1.25, 1], opacity: 1 }}
            transition={{ duration: 0.45 }}
            key={n}
          >
            <Gamepad2 size={24} color={shield ? "#fff" : ACCENT.green} />
          </motion.div>
          {shield && (
            <motion.div className="absolute left-[150px] top-[3px]" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}>
              <Shield size={12} color={ACCENT.blue} />
            </motion.div>
          )}
        </div>
        <div className="absolute left-[8px] top-[68px] flex h-[22px] w-[224px] items-center gap-[4px]">
          {keys.map((k) => (
            <motion.kbd
              key={k + n}
              className="rounded-[5px] border px-[5px] py-[2px] text-[8.5px] font-semibold not-italic text-label"
              style={{ borderColor: tintBg(c, 50), background: tintBg(c, 12) }}
              initial={{ y: -2 }}
              animate={{ y: 0 }}
            >
              {k}
            </motion.kbd>
          ))}
          <span className="ml-[4px] flex-1 text-right text-[8.5px]" style={{ color: tintText(c) }}>
            {shield ? tt("Kalkan yine Nook'ta") : tt("Tuşlar oyuna gider")}
          </span>
        </div>
      </Fit>
    </Stage>
  );
}

/** Ses, mikrofon/kamera ve müzik: Nook sürekli sormaz, Windows haber verince bakar; boşta kalan kart penceresi kapanır */
function QuietWorkDemo() {
  const n = useTick(700);
  const step = n % 9;
  const feeds = [
    { icon: Volume2, at: 1, color: ACCENT.teal },
    { icon: Mic, at: 3, color: ACCENT.orange },
    { icon: Camera, at: 3, color: ACCENT.green },
    { icon: Music, at: 5, color: ACCENT.pink },
  ];
  const cardGone = step >= 6;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[8px] top-[8px] flex w-[132px] flex-col gap-[5px]">
          <span className="text-[8.5px] text-label-2">{tt("Yalnızca değişince uyanır")}</span>
          <div className="flex gap-[6px]">
            {feeds.map(({ icon: Icon, at, color }, i) => {
              const lit = step === at;
              return (
                <motion.span
                  key={i}
                  className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px]"
                  animate={{ background: lit ? tintBg(color, 28) : "rgb(255 255 255 / 0.05)", scale: lit ? 1.12 : 1 }}
                  transition={{ duration: 0.18 }}
                >
                  <Icon size={14} color={lit ? color : "rgb(255 255 255 / 0.4)"} />
                </motion.span>
              );
            })}
          </div>
          <span className="flex gap-[3px] pt-[3px]">
            {Array.from({ length: 9 }, (_, i) => (
              <i key={i} className="h-[4px] w-[10px] rounded-full" style={{ background: i === step && feeds.some((f) => f.at === i) ? ACCENT.teal : i === step ? "rgb(255 255 255 / 0.3)" : "rgb(255 255 255 / 0.1)" }} />
            ))}
          </span>
        </div>
        <div className="absolute left-[152px] top-[8px] flex w-[80px] flex-col items-center gap-[5px]">
          <span className="text-[8.5px] text-label-2">{tt("Boştaki kart")}</span>
          <motion.div
            className="flex h-[36px] w-[64px] items-center justify-center rounded-[9px] border border-dashed"
            animate={{ opacity: cardGone ? 0.35 : 1, borderColor: cardGone ? "rgb(255 255 255 / 0.25)" : "rgb(255 255 255 / 0)", background: cardGone ? "rgb(0 0 0 / 0)" : "rgb(0 0 0 / 1)" }}
          >
            {!cardGone && <Volume2 size={13} color="#fff" />}
          </motion.div>
          <motion.b key={String(cardGone)} className="text-[9px]" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} style={{ color: tintText(cardGone ? ACCENT.green : ACCENT.gray) }}>
            {cardGone ? tt("Kapandı, bellek boş") : tt("3 dk bekler")}
          </motion.b>
        </div>
      </Fit>
    </Stage>
  );
}

/** "Telefondan uzaktan kontrol" kapalıyken telefondaki kapat düğmesi kilitli; açınca çalışır */
function PhonePowerDemo() {
  const n = useTick(1700);
  const on = n % 2 === 1;
  const c = on ? ACCENT.blue : ACCENT.gray;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[16px] top-[8px] flex h-[80px] w-[46px] flex-col items-center justify-center gap-[6px] rounded-[10px] border border-white/15 bg-white/[0.04]">
          <Smartphone size={11} color="rgb(255 255 255 / 0.4)" />
          <motion.span
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full"
            animate={{ background: on ? tintBg(ACCENT.red, 30) : "rgb(255 255 255 / 0.06)", scale: on ? [1, 0.9, 1] : 1 }}
            transition={{ duration: 0.4 }}
          >
            {on ? <Power size={13} color={ACCENT.red} /> : <Lock size={12} color="rgb(255 255 255 / 0.45)" />}
          </motion.span>
        </div>
        <div className="absolute left-[76px] top-[14px] flex h-[30px] w-[156px] items-center gap-[8px] rounded-[9px] bg-white/[0.05] px-[9px]">
          <span className="flex-1 text-[9px] font-semibold leading-tight text-label">{tt("Telefondan uzaktan kontrol")}</span>
          <span className="relative h-[14px] w-[24px] rounded-full" style={{ background: on ? ACCENT.blue : "rgb(255 255 255 / 0.18)" }}>
            <motion.i className="absolute top-[2px] h-[10px] w-[10px] rounded-full bg-white" initial={false} animate={{ left: on ? 12 : 2 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} />
          </span>
        </div>
        <motion.div key={String(on)} className="absolute left-[76px] top-[54px] flex h-[24px] w-[156px] items-center justify-center rounded-[8px]" style={{ background: tintBg(c, 14) }} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <span className="text-[9px]" style={{ color: tintText(c) }}>
            {on ? tt("Telefon PC'yi kapatabilir") : tt("Kapalıyken kapatamaz")}
          </span>
        </motion.div>
      </Fit>
    </Stage>
  );
}

export const DEMOS32 = {
  gamekeys: GameKeysDemo,
  quietwork: QuietWorkDemo,
  phonepower: PhonePowerDemo,
};
