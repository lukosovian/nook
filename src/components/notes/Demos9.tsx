/**
 * 0.2.61 yama notunun görselleri: telefondan uzaktan kontrol, evden uzaktayken açmayı sınama.
 * Hepsi kendi kendine döner.
 */
import { motion } from "motion/react";
import { Check, Keyboard, MousePointer2, X } from "lucide-react";
import { DEFAULT_LOOK } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Pc, Phone, Stage, useTick } from "./Demos6";

/** Küçük bir masaüstü: pencere, görev çubuğu ve imleç (telefonda da PC'de de aynısı) */
function Desk({ cursor, typed, scale = 1 }: { cursor: { x: number; y: number }; typed: string; scale?: number }) {
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "linear-gradient(135deg, #0b3d6e, #091018)" }}>
      <div className="absolute rounded-[2px] bg-[#f3f3f3]" style={{ left: "16%", top: "14%", width: "56%", height: "62%" }}>
        <div className="h-[14%] rounded-t-[2px] bg-[#2b2b2b]" />
        <p className="px-[6%] pt-[4%] font-mono text-[#222]" style={{ fontSize: 5 * scale }}>
          {typed}
          <span className="animate-pulse">|</span>
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex h-[11%] items-center justify-center gap-[3%] bg-[#1e1e1e]">
        {["#3d8bff", "#ffd23f", "#3fbfa5", "#f0545c"].map((c) => (
          <span key={c} className="h-[60%] rounded-[1px]" style={{ background: c, aspectRatio: "1" }} />
        ))}
      </div>
      <motion.div className="absolute" animate={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }} transition={{ duration: 0.45, ease: "easeInOut" }}>
        <MousePointer2 size={7 * scale} className="fill-white text-black" strokeWidth={1.6} />
      </motion.div>
    </div>
  );
}

/** Yatay telefonda PC'nin ekranı: parmak kayınca iki ekranda da imleç gider, sonra klavyeyle yazı */
function RemoteDemo() {
  const n = useTick(600);
  const phase = n % 14; // 0-5 imleç dolaşır · 6 tıklar · 7-13 yazar
  const path = [
    { x: 0.7, y: 0.75 },
    { x: 0.55, y: 0.6 },
    { x: 0.42, y: 0.45 },
    { x: 0.35, y: 0.35 },
    { x: 0.3, y: 0.3 },
    { x: 0.3, y: 0.3 },
  ];
  const cursor = path[Math.min(phase, path.length - 1)];
  const word = tt("Telefondan merhaba");
  const typed = phase >= 7 ? word.slice(0, Math.round(((phase - 6) / 7) * word.length)) : "";
  const B = ACCENT.blue;
  return (
    <Stage>
      <Fit w={300} h={110}>
        {/* Yatay telefon */}
        <div className="absolute left-0 top-[18px] h-[70px] w-[124px] overflow-hidden rounded-[10px] border border-white/20 bg-black p-[4px]">
          <div className="relative h-full w-full overflow-hidden rounded-[4px]">
            <Desk cursor={cursor} typed={typed} scale={0.8} />
            <div className="absolute left-1/2 top-[2px] flex -translate-x-1/2 items-center gap-[3px] rounded-full bg-[#1c1c1f]/90 px-[4px] py-[1px]">
              <X size={5} className="text-label-2" />
              <span className="flex items-center gap-[1px] text-[4px] font-semibold text-label">
                <MousePointer2 size={4} /> {tt("Fare")}
              </span>
              <Keyboard size={5} style={{ color: phase >= 7 ? tintText(B) : undefined }} className={phase >= 7 ? "" : "text-label-2"} />
            </div>
            {phase < 6 && (
              <motion.span
                className="absolute h-[9px] w-[9px] rounded-full border border-white/70 bg-white/25"
                animate={{ left: `${40 + phase * 6}%`, top: `${80 - phase * 6}%` }}
                transition={{ duration: 0.45 }}
              />
            )}
            {phase === 6 && <motion.span className="absolute h-[10px] w-[10px] rounded-full bg-white/50" style={{ left: "70%", top: "45%" }} initial={{ scale: 0.4, opacity: 1 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.5 }} />}
          </div>
        </div>
        <Pc w={150}>
          <div className="relative h-full">
            <Desk cursor={cursor} typed={typed} />
            <div className="absolute left-1/2 top-[3px] flex -translate-x-1/2 items-center gap-[3px] rounded-full bg-black px-[5px] py-[2px]">
              <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={9} expression="idle" />
              <span className="whitespace-nowrap text-[4.5px] font-semibold" style={{ color: tintText(B) }}>{tt("Telefondan uzaktan kontrol")}</span>
            </div>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

/** Mobil veride "Dışarıdan açmayı sına": paket evin modeminden geçip PC'ye ulaşıyor mu */
function WakeTestDemo() {
  const n = useTick(700);
  const phase = n % 10; // 0 bas · 1-4 paketler yolda · 5-9 sonuç
  const G = ACCENT.green;
  const B = ACCENT.blue;
  const routes = [9, 40009, 40010];
  return (
    <Stage>
      <Fit w={290} h={110}>
        <Phone>
          <p className="text-[4.5px] uppercase tracking-[0.1em] text-label-3">{tt("Telefondan PC'yi açma")}</p>
          <span className="mt-[4px] block rounded-[4px] py-[3px] text-center text-[4.5px] font-bold text-black" style={{ background: B, opacity: phase >= 1 && phase <= 4 ? 0.6 : 1 }}>
            {phase >= 1 && phase <= 4 ? tt("Sınanıyor…") : tt("Dışarıdan açmayı sına")}
          </span>
          {phase >= 5 && (
            <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} className="mt-[5px] flex items-start gap-[2px] rounded-[3px] px-[2px] py-[2px]" style={{ background: tintBg(G, 18) }}>
              <Check size={5} strokeWidth={3} style={{ color: G }} className="mt-[1px] shrink-0" />
              <span className="text-[4.2px] leading-tight text-label">{tt("Uyandırma evin dışından PC'ye ulaşıyor")}</span>
            </motion.div>
          )}
          <p className="absolute bottom-[5px] left-[5px] text-[4px] text-label-3">{tt("Mobil veri")} · 4G</p>
        </Phone>
        {/* Modem */}
        <div className="absolute left-[104px] top-[34px] flex h-[26px] w-[44px] flex-col items-center justify-center rounded-[5px] border border-white/15 bg-[#161922]">
          <span className="text-[5px] font-semibold text-label-2">{tt("Modem")}</span>
          <span className="mt-[1px] flex gap-[2px]">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-[2px] w-[2px] rounded-full" style={{ background: phase >= 1 && phase <= 4 ? G : "#555" }} />
            ))}
          </span>
        </div>
        {phase >= 1 &&
          phase <= 4 &&
          routes.map((r, i) => (
            <motion.span
              key={`${n}-${r}`}
              className="absolute rounded-full px-[3px] text-[4px] font-semibold"
              style={{ background: tintBg(B, 35), color: tintText(B), top: 26 + i * 12 }}
              initial={{ left: 62, opacity: 0 }}
              animate={{ left: 200, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.7, delay: i * 0.08 }}
            >
              UDP {r}
            </motion.span>
          ))}
        <Pc w={110}>
          <div className="flex h-full flex-col items-center justify-center gap-[4px]">
            <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={20} expression={phase >= 5 ? "love" : "idle"} />
            <span className="text-[5px] font-semibold" style={{ color: phase >= 5 ? tintText(G) : undefined }}>
              {phase >= 5 ? tt("Paket geldi ✓") : tt("Dinliyor…")}
            </span>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

export const DEMOS9 = {
  remotectl: RemoteDemo,
  waketest: WakeTestDemo,
};
