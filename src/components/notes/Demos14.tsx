/**
 * 0.3.0 yama notunun beşinci bölümünün görselleri: Studio ana sayfasında arama çubuğu ve sohbet, Pomodoro'suz
 * karne, menü menü Ayarlar ve büyük sürümlü Hakkında, Studio'da Argus. Hepsi kendi kendine döner.
 */
import { AnimatePresence, motion } from "motion/react";
import { Check, Info, MessageCircle, Monitor, Search, Settings2, Bell, Sparkles, Tv } from "lucide-react";
import { DEFAULT_LOOK } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { ARGUS_CYAN, ARGUS_DEEP, ARGUS_GRADIENT } from "../ArgusPromo";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

const WHITE = "#F4F4F6";
const MAJOR = `linear-gradient(100deg, ${ACCENT.purple}, ${ACCENT.pink} 45%, ${ACCENT.orange})`;
const SPRING = { type: "spring", stiffness: 320, damping: 28 } as const;

// ---------------------------------------------------------------- Studio ana sayfası

/**
 * Studio ana sayfası: arama çubuğuna "12*3+4" yazılır, altında sonuç açılır ve kopyalanır; sonra aşağıdaki
 * sohbet kartında soru gider, Nook cevaplar. Ada hiç açılmaz.
 */
function StudioHome03Demo() {
  const p = useTick(420) % 26;
  const query = "12*3+4".slice(0, Math.max(0, Math.min(6, p - 1)));
  const results = p >= 7 && p < 12;
  const copied = p >= 10 && p < 12;
  const asked = p >= 14;
  const answer = tt("Bilgisayar neden üşür? Çünkü Windows'u hep açık bırakırsın!");
  const shown = p >= 17 ? answer.slice(0, Math.min(answer.length, (p - 16) * 14)) : "";
  const bars = [52, 70, 30, 66, 44, 72, 58];
  return (
    <Stage>
      <Fit w={300} h={150}>
        <div className="absolute inset-0 flex flex-col gap-[6px] rounded-[12px] bg-[#0d0d10] p-[6px]">
          <div className="grid grid-cols-[1.7fr_1fr] gap-[6px]">
            <div className="relative z-10 flex items-center gap-[8px] rounded-[10px] bg-white/[0.04] px-[8px] py-[7px]">
              <NookFigure look={DEFAULT_LOOK} color={WHITE} size={34} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold text-white">{tt("İyi akşamlar")}</p>
                {/* Arama çubuğu */}
                <div className="relative mt-[5px]">
                  <div className="flex h-[17px] items-center gap-[4px] rounded-[6px] border px-[5px]" style={{ background: "rgb(255 255 255 / 0.05)", borderColor: query ? tintBg(ACCENT.teal, 50) : "rgb(255 255 255 / 0.08)" }}>
                    <Search size={7} style={{ color: query ? tintText(ACCENT.teal) : "rgb(255 255 255 / 0.4)" }} />
                    <span className="text-[7px] text-white">{query || <span className="text-white/35">{tt("Ara, hesapla, çevir…")}</span>}</span>
                    {query && p < 7 && <motion.span className="h-[7px] w-px bg-white" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />}
                  </div>
                  <AnimatePresence>
                    {results && (
                      <motion.div
                        className="absolute inset-x-0 top-[20px] rounded-[7px] border border-white/10 bg-[#1a1a1d] p-[3px] shadow-xl"
                        initial={{ opacity: 0, y: -3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="flex items-center gap-[4px] rounded-[5px] border px-[4px] py-[3px]" style={{ background: tintBg(ACCENT.orange, 16), borderColor: tintBg(ACCENT.orange, 40) }}>
                          <span className="text-[7px] font-bold text-white">= 40</span>
                          <span className="ml-auto flex items-center gap-[2px] text-[6px] font-semibold" style={{ color: tintText(copied ? ACCENT.green : ACCENT.orange) }}>
                            {copied && <Check size={6} strokeWidth={3} />}
                            {copied ? tt("Kopyalandı") : tt("Enter ile kopyala")}
                          </span>
                        </div>
                        <div className="px-[4px] py-[3px] text-[6.5px] text-white/60">{tt("Nook'a sor")}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            <div className="flex flex-col rounded-[10px] bg-white/[0.04] p-[6px]">
              <p className="flex items-center gap-[3px] text-[6.5px] font-bold text-white">
                <Monitor size={7} style={{ color: tintText(ACCENT.purple) }} />
                {tt("Bilgisayar başında")}
              </p>
              <div className="mt-auto flex h-[30px] items-end gap-[3px]">
                {bars.map((h, i) => (
                  <span key={i} className="flex-1 rounded-[2px]" style={{ height: `${h}%`, background: i === 6 ? ACCENT.purple : tintBg(ACCENT.purple, 34) }} />
                ))}
              </div>
            </div>
          </div>
          {/* Sohbet kartı */}
          <div className="flex min-h-0 flex-1 flex-col rounded-[10px] bg-white/[0.04] p-[6px]">
            <p className="flex items-center gap-[4px] text-[7px] font-bold text-white">
              <MessageCircle size={7} style={{ color: tintText(ACCENT.blue) }} />
              {tt("Nook'la sohbet")}
            </p>
            <div className="flex flex-1 flex-col justify-end gap-[3px]">
              <AnimatePresence>
                {asked && (
                  <motion.span key="q" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="self-end rounded-[7px] rounded-br-[2px] bg-white/10 px-[5px] py-[2px] text-[7px] text-white">
                    {tt("Bana bir şaka anlat")}
                  </motion.span>
                )}
                {asked && p >= 16 && (
                  <motion.span key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[85%] text-[7px] leading-snug text-white/85">
                    {shown || "…"}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="mt-[4px] flex h-[13px] items-center rounded-full bg-white/[0.06] px-[6px] text-[6px] text-white/35">{tt("Nook'a yaz…")}</div>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Karne

/** Pomodoro satırı çizilip gider; yerine su, birlikte geçen günler, ilgilenme ve keyif dolar */
function Karne03Demo() {
  const p = useTick(600) % 12;
  const gone = p >= 3;
  const fill = p >= 4;
  const parts = [
    { label: tt("Birlikte geçen günler"), pts: 20, max: 20, color: ACCENT.purple },
    { label: tt("Su"), pts: 15, max: 25, color: ACCENT.blue },
    { label: tt("Nook'la ilgilenme"), pts: 25, max: 25, color: ACCENT.pink },
    { label: tt("Keyif"), pts: 21, max: 30, color: ACCENT.yellow },
  ];
  return (
    <Stage>
      <Fit w={300} h={124}>
        <div className="absolute inset-0 grid grid-cols-[96px_1fr] gap-[6px] rounded-[12px] bg-[#0d0d10] p-[6px]">
          <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-[10px] bg-white/[0.04]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[60px]" style={{ background: `radial-gradient(70% 90% at 50% 0%, ${tintBg(ACCENT.green, 30)}, transparent 70%)` }} />
            <NookFigure look={DEFAULT_LOOK} color={WHITE} size={30} expression="happy" />
            <motion.span className="font-display text-[34px] font-bold leading-none" style={{ color: tintText(ACCENT.green) }} animate={{ scale: fill ? [0.6, 1.1, 1] : 0.6, opacity: fill ? 1 : 0.3 }} transition={{ duration: 0.5 }}>
              A
            </motion.span>
            <span className="text-[6px] text-white/50">{fill ? tt("{0} / 100 puan", 81) : "…"}</span>
          </div>
          <div className="flex flex-col justify-center gap-[5px] rounded-[10px] bg-white/[0.04] px-[8px]">
            <AnimatePresence>
              {!gone && (
                <motion.div key="pomo" exit={{ opacity: 0, height: 0, marginBottom: -5 }} transition={{ duration: 0.35 }}>
                  <div className="relative flex justify-between text-[7px] text-white/60">
                    <span>Pomodoro</span>
                    <span>0 / 20</span>
                    <motion.span className="absolute left-0 top-1/2 h-[1.5px] bg-red" style={{ background: ACCENT.red }} initial={{ width: 0 }} animate={{ width: p >= 1 ? "100%" : 0 }} transition={{ duration: 0.4 }} />
                  </div>
                  <div className="mt-[2px] h-[3px] rounded-full bg-white/[0.06]" />
                </motion.div>
              )}
            </AnimatePresence>
            {parts.map((x, i) => (
              <div key={x.label}>
                <div className="flex justify-between text-[7px]">
                  <span className="font-semibold text-white">{x.label}</span>
                  <span className="tabular-nums text-white/60">
                    {fill ? x.pts : 0} / {x.max}
                  </span>
                </div>
                <div className="mt-[2px] h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div className="h-full rounded-full" style={{ background: x.color }} initial={false} animate={{ width: fill ? `${(x.pts / x.max) * 100}%` : 0 }} transition={{ duration: 0.6, delay: i * 0.08 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Ayarlar ve Hakkında

/** Soldaki menüde kategoriye basılır, sağda yalnızca o kategori; sonunda Hakkında: kocaman renkli sürüm */
function Settings03Demo() {
  const p = useTick(900) % 8;
  const cats = [
    { id: "general", label: tt("Genel"), icon: Settings2, color: ACCENT.blue },
    { id: "island", label: tt("Ada ve Nook"), icon: Sparkles, color: ACCENT.pink },
    { id: "notify", label: tt("Bildirimler"), icon: Bell, color: ACCENT.purple },
    { id: "about", label: tt("Hakkında"), icon: Info, color: ACCENT.gray },
  ];
  const active = p < 2 ? 0 : p < 4 ? 1 : p < 5 ? 2 : 3;
  const c = cats[active];
  return (
    <Stage>
      <Fit w={300} h={124}>
        <div className="absolute inset-0 grid grid-cols-[86px_1fr] gap-[6px] rounded-[12px] bg-[#0d0d10] p-[6px]">
          <div className="flex flex-col gap-[2px]">
            {cats.map((x, i) => (
              <div key={x.id} className="relative flex items-center gap-[4px] rounded-[6px] px-[4px] py-[4px]">
                {i === active && <motion.span layoutId="demo-set-cat" className="absolute inset-0 rounded-[6px]" style={{ background: tintBg(x.color, 16) }} transition={SPRING} />}
                <span className="relative flex h-[12px] w-[12px] items-center justify-center rounded-[4px]" style={{ background: i === active ? x.color : tintBg(x.color, 14), color: i === active ? "#fff" : tintText(x.color) }}>
                  <x.icon size={7} strokeWidth={2.6} />
                </span>
                <span className={`relative text-[7px] font-semibold ${i === active ? "text-white" : "text-white/55"}`}>{x.label}</span>
              </div>
            ))}
          </div>
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div key={c.id} className="absolute inset-0" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
                {c.id === "about" ? (
                  <div className="relative flex h-full items-center gap-[10px] overflow-hidden rounded-[10px] bg-white/[0.04] px-[10px]">
                    <div className="pointer-events-none absolute -left-6 -top-10 h-[90px] w-[120px] rounded-full" style={{ background: `radial-gradient(circle, ${tintBg(ACCENT.purple, 40)}, transparent 65%)` }} />
                    <NookFigure look={DEFAULT_LOOK} color={WHITE} size={44} expression="happy" />
                    <div className="relative">
                      <p className="text-[7px] font-bold text-white/60">Nook</p>
                      <motion.p
                        className="font-round text-[30px] font-extrabold leading-none tracking-[-0.04em]"
                        style={{ background: MAJOR, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
                        initial={{ scale: 0.7 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 16 }}
                      >
                        0.3.0
                      </motion.p>
                      <span className="mt-[3px] inline-block rounded-full px-[5px] py-[1px] text-[5.5px] font-extrabold uppercase tracking-[0.08em] text-white" style={{ background: MAJOR }}>
                        {tt("Büyük güncelleme")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full flex-col gap-[4px]">
                    <p className="text-[10px] font-extrabold" style={{ color: tintText(c.color) }}>
                      {c.label}
                    </p>
                    {[0, 1, 2].map((r) => (
                      <div key={r} className="flex items-center justify-between rounded-[7px] bg-white/[0.04] px-[6px] py-[5px]">
                        <span className="h-[4px] rounded-full bg-white/25" style={{ width: [70, 52, 84][r] }} />
                        <span className="h-[7px] w-[13px] rounded-full p-[1px]" style={{ background: r === 1 ? "rgb(255 255 255 / 0.15)" : c.color }}>
                          <span className="block h-[5px] w-[5px] rounded-full bg-white" style={{ marginLeft: r === 1 ? 0 : 6 }} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Argus Studio'da

/** Argus sayfası: logolu kart, izlenen diziler; "İzledim"e basılınca bölüm ilerler */
function Argus03Demo() {
  const p = useTick(700) % 8;
  const seen = p >= 4 ? 8 : 7;
  const pressed = p === 4;
  const shows = [
    { title: "Lanterns", ep: seen === 8 ? "S1B9 · Karanlık" : "S1B8 · Yeşil Işık", seen, aired: 9 },
    { title: "Tuzlu Kahve", ep: "S1B3 · 3. Bölüm", seen: 2, aired: 5 },
  ];
  return (
    <Stage>
      <Fit w={300} h={124}>
        <div className="absolute inset-0 flex flex-col gap-[6px] rounded-[12px] bg-[#0d0d10] p-[6px]">
          <div className="relative flex items-center gap-[8px] overflow-hidden rounded-[10px] border px-[10px] py-[7px]" style={{ background: `linear-gradient(120deg, ${tintBg(ARGUS_CYAN, 18)}, ${tintBg(ARGUS_DEEP, 24)} 60%, #0b1220)`, borderColor: tintBg(ARGUS_CYAN, 30) }}>
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[7px]" style={{ background: ARGUS_GRADIENT }}>
              <Tv size={12} color="#fff" strokeWidth={2.4} />
            </span>
            <span className="text-[13px] font-black tracking-[0.04em] text-white">ARGUS</span>
            <span className="ml-auto rounded-[6px] px-[6px] py-[3px] text-[6.5px] font-bold text-white" style={{ background: ARGUS_GRADIENT }}>
              {tt("Argus'u aç")}
            </span>
          </div>
          {shows.map((s, i) => (
            <div key={s.title} className="flex items-center gap-[7px] rounded-[9px] bg-white/[0.04] px-[6px] py-[5px]">
              <span className="flex h-[24px] w-[17px] items-center justify-center rounded-[4px]" style={{ background: tintBg(ARGUS_CYAN, 20) }}>
                <Tv size={8} style={{ color: tintText(ARGUS_CYAN) }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[7.5px] font-bold text-white">{s.title}</p>
                <AnimatePresence mode="wait">
                  <motion.p key={s.ep} className="text-[6px]" style={{ color: tintText(ARGUS_CYAN) }} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {s.ep}
                  </motion.p>
                </AnimatePresence>
                <div className="mt-[2px] h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
                  <motion.div className="h-full rounded-full" style={{ background: ARGUS_GRADIENT }} initial={false} animate={{ width: `${(s.seen / s.aired) * 100}%` }} transition={SPRING} />
                </div>
              </div>
              <motion.span
                className="flex items-center gap-[2px] rounded-[5px] px-[5px] py-[3px] text-[6.5px] font-bold text-white"
                style={{ background: ARGUS_GRADIENT }}
                animate={{ scale: i === 0 && pressed ? [1, 0.85, 1] : 1 }}
              >
                <Check size={7} strokeWidth={3} /> {tt("İzledim")}
              </motion.span>
            </div>
          ))}
        </div>
      </Fit>
    </Stage>
  );
}

export const DEMOS14 = {
  studiohome03: StudioHome03Demo,
  karne03: Karne03Demo,
  settings03: Settings03Demo,
  argus03: Argus03Demo,
};
