/**
 * 0.3.1 yama notunun görselleri: Studio'da oyun geçmişi ve Bugün'de bugünün günlüğü. Hepsi kendi kendine döner.
 */
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Gamepad2, Music, Sparkles } from "lucide-react";
import { DEFAULT_LOOK } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { pct, tt } from "../../lib/i18n";
import { CLAUDE_COLOR } from "../../lib/claude";
import { Fit, Stage, useTick } from "./Demos6";

const WHITE = "#F4F4F6";

// ---------------------------------------------------------------- Oyun geçmişi

/** Studio › Oyunlar: Gün → Ay → Yıl arasında dönüyor; sütunlar ve oyun listesi her görünümde değişiyor */
function GameLogDemo() {
  const view = useTick(2400) % 3;
  const views = [
    { label: tt("Gün"), bars: [0.3, 0, 0.7, 0.45, 1, 0.2, 0.6], on: 4, games: [["Valorant", 1], ["Elden Ring", 0.55]] },
    { label: tt("Ay"), bars: [0.4, 0.1, 0, 0.8, 0.3, 0.6, 0, 1, 0.5, 0.2, 0.7, 0, 0.9, 0.4], on: -1, games: [["Valorant", 1], ["Elden Ring", 0.7], ["Minecraft", 0.3]] },
    { label: tt("Yıl"), bars: [0.5, 0.7, 0.4, 0.9, 1, 0.6, 0.3, 0.8, 0.55, 0.75, 0.45, 0.2], on: -1, games: [["Valorant", 1], ["Elden Ring", 0.8], ["Rocket League", 0.4], ["Minecraft", 0.35]] },
  ] as const;
  const v = views[view];
  const colors = [ACCENT.red, ACCENT.blue, ACCENT.green, ACCENT.orange];
  return (
    <Stage>
      <Fit w={300} h={140}>
        <div className="absolute inset-0 flex flex-col gap-[6px] rounded-[12px] bg-[#0d0d10] p-[8px]">
          <div className="flex items-center gap-[5px]">
            <span className="flex h-[16px] w-[16px] items-center justify-center rounded-[5px]" style={{ background: ACCENT.red, color: "#fff" }}>
              <Gamepad2 size={9} />
            </span>
            <span className="text-[9px] font-bold text-white">{tt("Oyun geçmişi")}</span>
            <div className="ml-auto flex gap-[2px] rounded-[6px] bg-white/[0.05] p-[2px]">
              {views.map((x, i) => (
                <span key={x.label} className="rounded-[4px] px-[5px] py-[1px] text-[7px] font-semibold" style={i === view ? { background: tintBg(ACCENT.red, 24), color: tintText(ACCENT.red) } : { color: "rgb(255 255 255 / 0.4)" }}>
                  {x.label}
                </span>
              ))}
            </div>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-[1fr_120px] gap-[6px]">
            <div className="flex items-end gap-[2px] rounded-[8px] bg-white/[0.04] p-[6px]">
              {v.bars.map((b, i) => (
                <motion.span
                  key={`${view}-${i}`}
                  className="flex-1 rounded-t-[2px]"
                  initial={{ height: 0 }}
                  animate={{ height: b ? `${b * 90}%` : 2 }}
                  transition={{ type: "spring", stiffness: 220, damping: 22, delay: i * 0.02 }}
                  style={{ background: i === v.on ? ACCENT.red : tintBg(ACCENT.red, b ? 45 : 12) }}
                />
              ))}
            </div>
            <div className="flex flex-col gap-[4px] rounded-[8px] bg-white/[0.04] p-[6px]">
              <AnimatePresence mode="popLayout">
                {v.games.map(([name, w], i) => (
                  <motion.div key={`${view}-${name}`} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.05 + i * 0.05 }}>
                    <span className="block truncate text-[7px] text-white/80">{name}</span>
                    <span className="mt-[1px] block h-[3px] rounded-full bg-white/[0.06]">
                      <motion.span className="block h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${w * 100}%` }} style={{ background: colors[i] }} />
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Bugünün günlüğü

/** Günün özeti: gece yazılan günlük "Bugünkü günlüğüm" olarak kartların üstüne yerleşiyor */
function TodayDiaryDemo() {
  const p = useTick(600) % 10;
  const shown = p >= 2;
  return (
    <Stage>
      <Fit w={300} h={120}>
        <div className="absolute inset-0 flex flex-col gap-[5px] rounded-[12px] bg-[#0d0d10] p-[8px]">
          <span className="text-[8px] font-medium text-white/60">
            {tt("Günün özeti")} <span className="text-white/35">· 22:45</span>
          </span>
          <AnimatePresence>
            {shown && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-[6px] overflow-hidden rounded-[8px] p-[6px]"
                style={{ background: tintBg(ACCENT.purple, 12) }}
              >
                <NookFigure look={DEFAULT_LOOK} color={WHITE} size={18} expression="happy" />
                <p className="text-[7.5px] leading-[1.45] text-white/80">
                  <span className="inline-flex items-center gap-[2px] font-bold" style={{ color: tintText(ACCENT.purple) }}>
                    <BookOpen size={7} />
                    {tt("Bugünkü günlüğüm")} ·{" "}
                  </span>
                  {tt("Luko bugün iki saat Valorant oynadı, sonra suçluluk duygusuyla Figma'ya döndü. Suyunu da unutmadı.")}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="grid flex-1 grid-cols-3 gap-[4px]">
            {[ACCENT.blue, ACCENT.green, ACCENT.orange, ACCENT.teal, ACCENT.pink, ACCENT.yellow].slice(0, shown ? 3 : 6).map((c) => (
              <motion.span key={c} layout className="rounded-[6px]" style={{ background: tintBg(c, 14) }} />
            ))}
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Claude kullanımının yaşı

/** Göstergeler zamanla eskiyip soluklaşıyor; Claude Code cevap verince yeni sayıyla tazeleniyor */
function PlanStaleDemo() {
  const p = useTick(700) % 10;
  const fresh = p < 2 || p >= 8;
  const mins = p < 2 ? 0 : p < 8 ? [3, 7, 12, 18, 24, 31][p - 2] : 0;
  const stale = mins > 10;
  const five = p >= 8 ? 46 : 34;
  const week = p >= 8 ? 63 : 58;
  const gauges = [
    [tt("5 saat"), five, ACCENT.green],
    [tt("Hafta"), week, ACCENT.orange],
  ] as const;
  return (
    <Stage>
      <Fit w={300} h={110}>
        <div className="absolute inset-0 flex flex-col gap-[5px] rounded-[12px] bg-[#0d0d10] p-[8px]">
          <motion.div className="grid grid-cols-2 gap-[5px]" animate={{ opacity: stale ? 0.5 : 1 }}>
            {gauges.map(([label, v, c]) => (
              <div key={label} className="rounded-[8px] border px-[7px] py-[5px]" style={{ background: tintBg(c, 8), borderColor: tintBg(c, 22) }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[8px] font-medium text-white/70">{label}</span>
                  <span className="text-[11px] font-medium tabular-nums" style={{ color: tintText(c) }}>
                    {pct(v)}
                  </span>
                </div>
                <span className="mt-[3px] block h-[3px] rounded-full bg-white/[0.08]">
                  <motion.span className="block h-full rounded-full" animate={{ width: `${v}%` }} style={{ background: c }} />
                </span>
              </div>
            ))}
          </motion.div>
          <AnimatePresence mode="wait">
            <motion.span key={stale ? "s" : String(mins)} initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-[3px] text-[7.5px] text-white/45">
              {mins === 0 ? tt("az önce güncellendi") : stale ? tt("{0} dk önce güncellendi · Claude Code'da bir mesajla tazelenir", mins) : tt("{0} dk önce güncellendi", mins)}
            </motion.span>
          </AnimatePresence>
          <AnimatePresence>
            {fresh && p >= 8 && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="mt-auto self-start rounded-full px-[7px] py-[2px] text-[7.5px] font-medium"
                style={{ background: tintBg(CLAUDE_COLOR, 16), color: tintText(CLAUDE_COLOR) }}
              >
                {tt("Claude Code cevap verdi")}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Bölünmüş adada doğru bölüm

/** İmleç sırayla ana kapsüle (Claude) ve yandaki baloncuğa (müzik) gidiyor; ada hangisinin üstündeyse onunla açılıyor */
function SplitHoverDemo() {
  const p = useTick(700) % 8;
  const onBubble = p >= 4;
  const open = p % 4 >= 2;
  const c = onBubble ? ACCENT.pink : CLAUDE_COLOR;
  return (
    <Stage>
      <Fit w={300} h={130}>
        <div className="absolute inset-0 rounded-[12px] bg-[#0d0d10]">
          <motion.div
            className="absolute left-1/2 top-0 -translate-x-1/2 overflow-hidden rounded-b-[14px] bg-black"
            animate={open ? { width: 200, height: 92 } : { width: 120, height: 26 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
          >
            <AnimatePresence mode="wait">
              {open ? (
                <motion.div key={onBubble ? "m" : "c"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col gap-[5px] p-[8px]">
                  <span className="flex items-center gap-[4px] text-[8px] font-bold" style={{ color: tintText(c) }}>
                    {onBubble ? <Music size={8} /> : <Sparkles size={8} />}
                    {onBubble ? tt("Medya") : "Claude"}
                  </span>
                  <span className="flex-1 rounded-[6px]" style={{ background: tintBg(c, 12) }} />
                </motion.div>
              ) : (
                <motion.div key="cap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full items-center gap-[5px] px-[9px]">
                  <span className="h-[7px] w-[7px] rounded-full" style={{ background: CLAUDE_COLOR }} />
                  <span className="text-[7.5px] text-white/75">{tt("Claude çalışıyor")}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <motion.span
            className="absolute top-0 flex h-[26px] w-[26px] items-center justify-center rounded-b-[13px] bg-black"
            style={{ left: 218, color: ACCENT.pink }}
            animate={{ opacity: open ? 0 : 1 }}
          >
            <Music size={9} />
          </motion.span>
          <motion.span
            className="absolute h-[9px] w-[9px] rounded-full border border-black bg-white"
            animate={{ left: onBubble ? 228 : 150, top: open ? 40 : 14 }}
            transition={{ type: "spring", stiffness: 160, damping: 20 }}
          />
        </div>
      </Fit>
    </Stage>
  );
}

export const DEMOS16 = {
  gamelog: GameLogDemo,
  todaydiary: TodayDiaryDemo,
  planstale: PlanStaleDemo,
  splithover: SplitHoverDemo,
};
