/**
 * 0.3.0 yama notunun ikinci bölümünün görselleri: zamanlı kapatma, yeni medya, sekmeli Görünüm ve
 * düzeltmeler (ekran görüntüsü, fragman, çeviri). Hepsi kendi kendine döner.
 */
import { AnimatePresence, motion } from "motion/react";
import { Camera, Clapperboard, Languages, Moon, Power, RotateCcw, X } from "lucide-react";
import { DEFAULT_LOOK, type Look } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { PauseGlyph, PlayGlyph, NextGlyph, PrevGlyph } from "../ui/glyphs";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

const WHITE = "#F4F4F6";

// ---------------------------------------------------------------- Zamanlı kapatma

function PowerTimerDemo() {
  const n = useTick(700);
  const p = n % 16;
  // 0-2 seçiliyor · 3-12 geri sayım · 13-15 ekran kararır
  const picked = p >= 2;
  const left = p < 3 ? 30 : p < 13 ? Math.max(1, 30 - (p - 3) * 3) : 0;
  const off = p >= 13;
  return (
    <Stage>
      <Fit w={300} h={124}>
        <div className="absolute inset-0 overflow-hidden rounded-[12px]" style={{ background: "linear-gradient(160deg, #23304a, #121622 60%, #1f1a2e)" }}>
          {/* Ada: sağ üstte kırmızı geri sayım hapı */}
          <div className="absolute left-1/2 top-0 h-[22px] w-[150px] -translate-x-1/2 rounded-b-[11px] bg-black">
            <span className="absolute left-[8px] top-[5px] text-[7px] font-extrabold text-white">23:30</span>
            <AnimatePresence>
              {picked && !off && (
                <motion.span
                  className="absolute right-[6px] top-[5px] flex items-center gap-[2px] rounded-full px-[4px] text-[6px] font-bold"
                  style={{ background: tintBg(ACCENT.red, left <= 3 ? 30 : 16), color: tintText(ACCENT.red) }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Power size={5} strokeWidth={3} /> {tt("{0} dk", left)}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {/* Kontrol › Zamanlı kapat */}
          <div className="absolute bottom-[10px] left-[14px] right-[14px] top-[30px] rounded-[12px] bg-black/80 p-[7px]">
            <AnimatePresence mode="wait">
              {!picked ? (
                <motion.div key="pick" className="grid h-full grid-cols-4 gap-[4px]" exit={{ opacity: 0 }}>
                  {[15, 30, 60, 120].map((m) => (
                    <motion.span
                      key={m}
                      className="flex flex-col items-center justify-center rounded-[8px] border text-[8px] font-bold text-white"
                      animate={m === 30 && p === 1 ? { scale: 0.9 } : { scale: 1 }}
                      style={m === 30 && p >= 1 ? { borderColor: tintBg(ACCENT.red, 60), background: tintBg(ACCENT.red, 16) } : { borderColor: "rgb(255 255 255 / 0.07)", background: "rgb(255 255 255 / 0.04)" }}
                    >
                      {m < 60 ? tt("{0} dk", m) : tt("{0} sa", m / 60)}
                      <span className="text-[5px] font-medium text-white/40">{tt("sonra")}</span>
                    </motion.span>
                  ))}
                </motion.div>
              ) : (
                <motion.div key="on" className="flex h-full items-center gap-[10px] rounded-[9px] px-[10px]" style={{ background: tintBg(ACCENT.red, 14) }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <svg width={40} height={40} className="-rotate-90">
                    <circle cx={20} cy={20} r={16} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth={4} />
                    <motion.circle cx={20} cy={20} r={16} fill="none" stroke={ACCENT.red} strokeWidth={4} strokeLinecap="round" strokeDasharray={100.5} animate={{ strokeDashoffset: 100.5 * (1 - left / 30) }} />
                  </svg>
                  <span>
                    <span className="block text-[6px] font-semibold" style={{ color: tintText(ACCENT.red) }}>
                      {tt("Kapat")} · 00:00
                    </span>
                    <span className="block text-[15px] font-extrabold tabular-nums text-white">{tt("{0} dk", left)}</span>
                    <span className="mt-[2px] flex gap-[3px]">
                      {[
                        [Power, tt("Kapat")],
                        [RotateCcw, tt("Yeniden başlat")],
                        [Moon, tt("Uyku")],
                      ].map(([I, l], i) => {
                        const Icon = I as typeof Power;
                        return (
                          <span key={i} className="flex items-center gap-[1px] rounded-full bg-white/[0.06] px-[3px] text-[4.5px] text-white/60">
                            <Icon size={4} /> {l as string}
                          </span>
                        );
                      })}
                    </span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Vakit gelince ekran kararır */}
          <AnimatePresence>{off && <motion.div className="absolute inset-0 bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} />}</AnimatePresence>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Yeni medya

function Media03Demo() {
  const n = useTick(1600);
  const playing = n % 4 !== 3;
  return (
    <Stage>
      <Fit w={300} h={120}>
        <div className="absolute inset-0 overflow-hidden rounded-[16px] bg-[#141416]">
          {/* Kapaktan gelen renk bütün kartı boyar */}
          <div className="absolute -inset-6 opacity-60 blur-2xl" style={{ background: "linear-gradient(135deg, #ff375f, #bf5af2 50%, #0a84ff)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgb(0 0 0 / 0.05) 20%, rgb(0 0 0 / 0.6) 75%)" }} />
          <motion.div
            className="absolute left-[12px] top-[12px] h-[96px] w-[96px] overflow-hidden rounded-[16px] shadow-[0_10px_24px_-8px_black] ring-1 ring-white/10"
            animate={{ scale: playing ? 1 : 0.9, opacity: playing ? 1 : 0.8 }}
            style={{ background: "linear-gradient(135deg, #ff375f, #bf5af2 50%, #0a84ff)" }}
          >
            <span className="absolute inset-0" style={{ background: "linear-gradient(155deg, rgb(255 255 255 / 0.2), transparent 40%)" }} />
          </motion.div>
          <div className="absolute left-[122px] right-[12px] top-[14px]">
            <span className="rounded-full bg-black/35 px-[5px] py-[1px] text-[6px] font-bold" style={{ color: tintText(ACCENT.pink) }}>
              Spotify
            </span>
            <p className="mt-[5px] text-[12px] font-semibold tracking-tight text-white">Blinding Lights</p>
            <p className="text-[8px] text-white/60">The Weeknd</p>
            <div className="mt-[7px] h-[3px] overflow-hidden rounded-full bg-white/15">
              <motion.div className="h-full rounded-full" style={{ background: ACCENT.pink, boxShadow: `0 0 6px ${ACCENT.pink}` }} animate={{ width: playing ? ["30%", "60%"] : "60%" }} transition={{ duration: 6, ease: "linear" }} />
            </div>
            <div className="mt-[7px] flex items-center justify-center gap-[14px] text-white">
              <PrevGlyph size={10} />
              <span className="relative flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white text-black">
                {playing && (
                  <motion.span className="absolute -inset-[3px] rounded-full" style={{ border: `1px solid ${ACCENT.pink}` }} animate={{ opacity: [0.6, 0.15, 0.6], scale: [1, 1.1, 1] }} transition={{ duration: 2.4, repeat: Infinity }} />
                )}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={playing ? "p" : "s"} className="flex" initial={{ scale: 0.3, rotate: -40, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.3, rotate: 40, opacity: 0 }}>
                    {playing ? <PauseGlyph size={11} /> : <PlayGlyph size={11} />}
                  </motion.span>
                </AnimatePresence>
              </span>
              <NextGlyph size={10} />
            </div>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Sekmeli Görünüm

const LOOK_STEPS: { tab: number; look: Look; color: string }[] = [
  { tab: 0, look: { ...DEFAULT_LOOK, head: "crown" }, color: WHITE },
  { tab: 1, look: { ...DEFAULT_LOOK, shape: "egg", head: "police" }, color: "#FFE3A8" },
  { tab: 2, look: { ...DEFAULT_LOOK, shape: "egg", head: "police", texture: "plush" }, color: "#9B7BFF" },
  { tab: 3, look: { ...DEFAULT_LOOK, shape: "cube", head: "beanie" }, color: "#2B8CFF" },
];
const LOOK_TABS = [tt("Koleksiyon"), tt("Gövde"), tt("Doku"), tt("Başlık")];

function Look03Demo() {
  const n = useTick(1500);
  const s = LOOK_STEPS[n % LOOK_STEPS.length];
  return (
    <Stage>
      <Fit w={300} h={124}>
        <div className="absolute inset-0 overflow-hidden rounded-[14px] bg-[#0e0e10]">
          {/* Sahnede Nook: her değişiklikte zıplar, pırıltı saçar */}
          <div className="absolute bottom-[8px] left-[8px] top-[8px] w-[104px] overflow-hidden rounded-[12px] border" style={{ background: `radial-gradient(circle at 50% 40%, ${tintBg(s.color, 30)}, transparent 70%)`, borderColor: tintBg(s.color, 25) }}>
            <motion.div key={n} className="absolute left-1/2 top-[30px] -ml-[30px]" initial={{ y: 0 }} animate={{ y: [0, -14, 0, -3, 0], scaleY: [1, 1.06, 0.92, 1, 1] }} transition={{ duration: 0.7 }}>
              <NookFigure look={s.look} color={s.color} size={60} expression="happy" />
            </motion.div>
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <motion.span
                  key={`${n}-${i}`}
                  className="absolute left-1/2 top-[56px] h-[4px] w-[4px] rounded-full"
                  style={{ background: i % 2 ? s.color : ACCENT.yellow }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                  animate={{ x: Math.cos(a) * 44, y: Math.sin(a) * 36, opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.7 }}
                />
              );
            })}
            <span className="absolute left-[6px] top-[6px] rounded-full px-[5px] text-[6px] font-semibold" style={{ background: tintBg(s.color, 25), color: tintText(s.color) }}>
              {tt("Bayıldım!")}
            </span>
          </div>
          {/* Sekmeler: aynı anda yalnızca biri çizilir */}
          <div className="absolute left-[120px] right-[8px] top-[10px] flex gap-[2px] rounded-[7px] bg-white/[0.04] p-[2px]">
            {LOOK_TABS.map((t, i) => (
              <span key={t} className="relative flex-1 rounded-[5px] py-[2px] text-center text-[6.5px] font-semibold" style={{ color: i === s.tab ? "#fff" : "rgb(255 255 255 / 0.4)" }}>
                {i === s.tab && <motion.span layoutId="l03" className="absolute inset-0 rounded-[5px]" style={{ background: tintBg(ACCENT.pink, 30) }} />}
                <span className="relative">{t}</span>
              </span>
            ))}
          </div>
          <div className="absolute bottom-[8px] left-[120px] right-[8px] top-[30px] grid grid-cols-4 gap-[4px]">
            {Array.from({ length: 8 }, (_, i) => (
              <motion.span
                key={`${s.tab}-${i}`}
                className="rounded-[8px] border"
                style={i === 1 ? { borderColor: tintBg(ACCENT.pink, 60), background: tintBg(ACCENT.pink, 14) } : { borderColor: "rgb(255 255 255 / 0.06)", background: "rgb(255 255 255 / 0.03)" }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              />
            ))}
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Düzeltmeler

function Fixes03Demo() {
  const n = useTick(1800);
  const k = n % 3;
  const rows = [
    { icon: Camera, c: ACCENT.teal, a: tt("Ekran görüntüsü alındı"), b: tt("“iyi oyunlar” demiyor") },
    { icon: Clapperboard, c: ACCENT.blue, a: tt("Silo · 2. Sezon Fragmanı"), b: tt("bölüm sanılmıyor") },
    { icon: Languages, c: ACCENT.purple, a: "Thanks for the update!", b: tt("Güncelleme için teşekkürler!") },
  ];
  return (
    <Stage>
      <Fit w={300} h={118}>
        <div className="absolute inset-0 flex flex-col justify-center gap-[6px]">
          {rows.map((r, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-[8px] rounded-[11px] border px-[8px] py-[6px]"
              animate={{ opacity: k === i ? 1 : 0.45, scale: k === i ? 1 : 0.97 }}
              style={{ background: k === i ? tintBg(r.c, 12) : "rgb(255 255 255 / 0.03)", borderColor: k === i ? tintBg(r.c, 40) : "rgb(255 255 255 / 0.06)" }}
            >
              <span className="flex h-[20px] w-[20px] items-center justify-center rounded-[7px]" style={{ background: tintBg(r.c, 22), color: tintText(r.c) }}>
                <r.icon size={11} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[8.5px] font-semibold text-white">{r.a}</span>
              <span className="flex items-center gap-[3px] text-[7.5px] font-semibold" style={{ color: tintText(i === 2 ? ACCENT.purple : ACCENT.green) }}>
                {i < 2 && <X size={7} strokeWidth={3} style={{ color: tintText(ACCENT.red) }} />}
                {r.b}
              </span>
            </motion.div>
          ))}
        </div>
      </Fit>
    </Stage>
  );
}

export const DEMOS11 = {
  powertimer: PowerTimerDemo,
  media03: Media03Demo,
  look03: Look03Demo,
  fixes03: Fixes03Demo,
};
