/**
 * 0.3.1 yama notunun ikinci kısayol görselleri: tuşa klavye kısayolu, sesle çalıştırma, otomasyon koşulları,
 * telefon tetikleyicileri, "çalışmadan önce sor" ve son çalışanlar. Hepsi kendi kendine döner.
 */
import { AnimatePresence, motion } from "motion/react";
import { Check, Clock, Gamepad2, House, Layers, Mic, Moon, Play, Smartphone, Wifi, X, Zap } from "lucide-react";
import { DEFAULT_LOOK } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

const WHITE = "#F4F4F6";
const PURPLE = "#8f6bff";

/** Klavye tuşu */
function Cap({ k, down }: { k: string; down: boolean }) {
  return (
    <motion.span
      animate={{ y: down ? 2 : 0, boxShadow: down ? "0 0 0 rgba(0,0,0,0)" : "0 3px 0 rgba(255,255,255,0.12)" }}
      className="flex h-[26px] min-w-[26px] items-center justify-center rounded-[6px] border px-[6px] text-[9px] font-bold"
      style={{ background: down ? tintBg(PURPLE, 30) : "#1c1c22", borderColor: down ? tintBg(PURPLE, 60) : "rgb(255 255 255 / 0.12)", color: down ? tintText(PURPLE) : "rgb(255 255 255 / 0.8)" }}
    >
      {k}
    </motion.span>
  );
}

/** Kısayolun tuşu (yanıp sönen) */
function RunKey({ lit, label = tt("Oyun modu") }: { lit: boolean; label?: string }) {
  return (
    <motion.span
      animate={{ background: tintBg(PURPLE, lit ? 34 : 13), borderColor: tintBg(PURPLE, lit ? 70 : 28), scale: lit ? 1.06 : 1 }}
      className="flex h-[54px] w-[62px] flex-col items-center justify-center gap-[4px] rounded-[12px] border"
    >
      <span className="flex h-[20px] w-[20px] items-center justify-center rounded-[6px]" style={{ background: tintBg(PURPLE, 24), color: tintText(PURPLE) }}>
        <Layers size={11} />
      </span>
      <span className="text-[7px] font-semibold" style={{ color: tintText(PURPLE) }}>
        {label}
      </span>
    </motion.span>
  );
}

// ---------------------------------------------------------------- Klavye kısayolu

/** Ctrl + Alt + 1'e basılıyor; ada kapalıyken "Oyun modu" tuşu çalışıyor */
function DeckHotkeyDemo() {
  const p = useTick(450) % 10;
  const down = [p >= 1 && p < 6, p >= 2 && p < 6, p >= 3 && p < 6];
  const lit = p >= 3 && p < 7;
  return (
    <Stage>
      <Fit w={300} h={120}>
        <div className="absolute inset-0 flex items-center justify-center gap-[18px] rounded-[12px] bg-[#0d0d10] p-[10px]">
          <div className="flex items-center gap-[5px]">
            <Cap k="Ctrl" down={down[0]} />
            <span className="text-[9px] text-white/30">+</span>
            <Cap k="Alt" down={down[1]} />
            <span className="text-[9px] text-white/30">+</span>
            <Cap k="1" down={down[2]} />
          </div>
          <Zap size={14} className="text-white/30" />
          <div className="flex flex-col items-center gap-[5px]">
            <RunKey lit={lit} />
            <AnimatePresence>
              {lit && (
                <motion.span initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[7px] font-semibold" style={{ color: tintText(ACCENT.green) }}>
                  {tt("3 adım çalıştı")}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Sesle

/** "Hey Nook, gece modu" deniyor; Nook dinliyor, otomasyon çalışıyor */
function VoiceKeysDemo() {
  const p = useTick(500) % 12;
  const phrase = tt("Hey Nook, gece modu");
  const typed = phrase.slice(0, Math.max(0, Math.min(phrase.length, (p - 1) * 5)));
  const done = p >= 7;
  return (
    <Stage>
      <Fit w={300} h={120}>
        <div className="absolute inset-0 flex items-center gap-[12px] rounded-[12px] p-[10px]" style={{ background: done ? "#06060a" : "#0d0d10", transition: "background 0.6s" }}>
          <div className="flex flex-col items-center gap-[4px]">
            <NookFigure look={DEFAULT_LOOK} color={WHITE} size={48} expression={done ? "happy" : "surprised"} />
            <span className="flex items-center gap-[3px] text-[7px] font-semibold" style={{ color: tintText(ACCENT.teal) }}>
              <Mic size={8} /> {done ? tt("Tamam") : tt("Dinliyorum…")}
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
            <span className="self-start rounded-[10px] rounded-bl-[3px] bg-white/[0.08] px-[8px] py-[5px] text-[9px] text-white/90">
              {typed || " "}
              <span className="opacity-50">{done ? "" : "|"}</span>
            </span>
            <AnimatePresence>
              {done && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-[5px] self-start rounded-[9px] border px-[7px] py-[4px] text-[8px] font-semibold"
                  style={{ background: tintBg(ACCENT.yellow, 14), borderColor: tintBg(ACCENT.yellow, 40), color: tintText(ACCENT.yellow) }}
                >
                  <Moon size={9} /> {tt("Gece modu çalıştı")}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Koşullar

/** Saat 23:00 iki kez geliyor: oyundayken "koşul tutmadı", oyun bitince ertesi gece çalışıyor */
function AutoCondsDemo() {
  const p = useTick(700) % 10;
  const gaming = p < 5;
  const fired = p === 2 || p === 3 || p >= 7;
  const ran = fired && !gaming;
  return (
    <Stage>
      <Fit w={300} h={130}>
        <div className="absolute inset-0 flex flex-col gap-[6px] rounded-[12px] bg-[#0d0d10] p-[9px]">
          <div className="flex items-center gap-[6px] rounded-[9px] bg-white/[0.04] px-[7px] py-[5px]">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[6px]" style={{ background: tintBg(ACCENT.yellow, 24), color: tintText(ACCENT.yellow) }}>
              <Clock size={10} />
            </span>
            <span className="flex-1 text-[8.5px] font-bold text-white">{tt("Gece modu")}</span>
            <span className="text-[7.5px]" style={{ color: tintText(ACCENT.yellow) }}>
              {tt("Her gün 23:00")}
            </span>
          </div>
          <div className="flex items-center gap-[6px] px-[2px]">
            <span className="text-[7px] font-semibold uppercase tracking-[0.1em] text-white/35">{tt("Yalnızca şu durumda")}</span>
            <motion.span
              className="flex items-center gap-[3px] rounded-full border px-[6px] py-[1px] text-[7.5px] font-semibold"
              animate={{ background: tintBg(gaming ? ACCENT.red : ACCENT.teal, 14), borderColor: tintBg(gaming ? ACCENT.red : ACCENT.teal, 40), color: tintText(gaming ? ACCENT.red : ACCENT.teal) }}
            >
              {gaming ? <X size={8} /> : <Check size={8} />} {tt("Oyunda değilsem")}
            </motion.span>
          </div>
          <div className="flex flex-1 items-center gap-[8px] rounded-[9px] bg-white/[0.03] px-[8px]">
            <span className="flex items-center gap-[4px] text-[8px] text-white/70">
              {gaming ? <Gamepad2 size={11} style={{ color: ACCENT.red }} /> : <Moon size={11} style={{ color: ACCENT.purple }} />}
              {gaming ? tt("Oyun sürüyor") : tt("Oyun bitti")}
            </span>
            <span className="ml-auto font-round text-[16px] font-extrabold tabular-nums text-white">{fired ? "23:00" : "22:59"}</span>
            <AnimatePresence mode="wait">
              {fired && (
                <motion.span
                  key={ran ? "r" : "s"}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-full px-[7px] py-[2px] text-[7.5px] font-semibold"
                  style={{ background: tintBg(ran ? ACCENT.green : ACCENT.gray, 18), color: tintText(ran ? ACCENT.green : ACCENT.gray) }}
                >
                  {ran ? tt("çalıştı") : tt("koşul tutmadı")}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Telefon tetikleyicileri

/** Telefon dışarıdan eve geliyor, ev Wi-Fi'sine bağlanıyor; PC'deki Nook "Hoş geldin" diyor */
function PhoneTrigDemo() {
  const p = useTick(600) % 10;
  const home = p >= 3;
  const greet = p >= 5;
  return (
    <Stage>
      <Fit w={300} h={120}>
        <div className="absolute inset-0 rounded-[12px] bg-[#0d0d10]">
          {/* Ev */}
          <div className="absolute left-[120px] top-[22px] flex h-[76px] w-[168px] items-center justify-end rounded-[12px] border border-white/[0.07] bg-white/[0.03] pr-[10px]">
            <House size={12} className="absolute left-[8px] top-[7px] text-white/30" />
            <motion.span className="absolute left-[28px] top-[6px]" animate={{ opacity: home ? 1 : 0.25 }}>
              <Wifi size={11} style={{ color: ACCENT.teal }} />
            </motion.span>
            {/* PC ve ada */}
            <div className="relative flex h-[50px] w-[86px] flex-col items-center rounded-[6px] bg-[#1d2230] pt-[3px]">
              <motion.div
                className="flex h-[16px] items-center gap-[3px] rounded-full bg-black px-[4px]"
                animate={{ width: greet ? 80 : 34 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
              >
                <NookFigure look={DEFAULT_LOOK} color={WHITE} size={11} expression={greet ? "happy" : "idle"} />
                {greet && <span className="truncate text-[6px] text-white/85">{tt("Hoş geldin!")}</span>}
              </motion.div>
            </div>
          </div>
          {/* Telefon dışarıdan eve */}
          <motion.div className="absolute top-[42px] flex h-[32px] w-[19px] items-center justify-center rounded-[5px] border-2 border-white/60 bg-black" animate={{ left: home ? 140 : 22 }} transition={{ type: "spring", stiffness: 90, damping: 16 }}>
            <Smartphone size={9} style={{ color: ACCENT.teal }} />
          </motion.div>
          <span className="absolute bottom-[10px] left-[14px] text-[7px] font-semibold" style={{ color: tintText(ACCENT.teal) }}>
            {home ? tt("Telefon eve geldi") : tt("Dışarıda")}
          </span>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Önce sor

/** Ada "Eve hoş geldin çalışsın mı?" diye soruyor; "Çalıştır"a basılıyor */
function AutoAskDemo() {
  const p = useTick(600) % 10;
  const asked = p >= 1 && p < 6;
  const press = p === 4 || p === 5;
  const done = p >= 6;
  return (
    <Stage>
      <Fit w={300} h={100}>
        <div className="absolute inset-0 flex items-start justify-center pt-[16px]">
          <motion.div
            className="relative flex items-center overflow-hidden rounded-[22px] bg-black"
            animate={{ width: asked ? 280 : done ? 200 : 110, height: asked ? 56 : 34 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
          >
            <span className="absolute left-[8px] top-1/2 -translate-y-1/2">
              <NookFigure look={DEFAULT_LOOK} color={WHITE} size={asked ? 34 : 22} expression={done ? "happy" : asked ? "thinking" : "idle"} />
            </span>
            <AnimatePresence mode="wait">
              {asked && (
                <motion.div key="ask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-[50px] flex flex-1 items-center gap-[5px] pr-[8px]">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-[3px] text-[8.5px] font-medium" style={{ color: tintText(PURPLE) }}>
                      <Zap size={8} fill="currentColor" /> {tt("Eve hoş geldin")}
                    </span>
                    <span className="block text-[6.5px] text-white/50">{tt("Çalışsın mı? · {0}", tt("Telefon eve gelince"))}</span>
                  </span>
                  <span className="rounded-full border px-[6px] py-[3px] text-[6.5px] font-medium" style={{ borderColor: "rgb(255 255 255 / 0.15)", color: "rgb(255 255 255 / 0.6)" }}>
                    {tt("Hayır")}
                  </span>
                  <motion.span
                    animate={{ scale: press ? 0.9 : 1 }}
                    className="flex items-center gap-[2px] rounded-full border px-[6px] py-[3px] text-[6.5px] font-semibold"
                    style={{ background: tintBg(PURPLE, press ? 40 : 26), borderColor: tintBg(PURPLE, 60), color: tintText(PURPLE) }}
                  >
                    <Play size={6} fill="currentColor" /> {tt("Çalıştır")}
                  </motion.span>
                </motion.div>
              )}
              {done && (
                <motion.span key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-[36px] text-[8px] text-white/85">
                  {tt("Hoş geldin! Müzik geliyor")}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Son çalışanlar

/** Geçmiş listesi: yeni kayıtlar üstten giriyor, her birinde ne olduğu */
function AutoLogDemo() {
  const n = (useTick(900) % 6) + 1;
  const all = [
    { t: "23:00", label: tt("Gece modu"), s: tt("çalıştı"), c: ACCENT.green },
    { t: "19:42", label: tt("Eve hoş geldin"), s: tt("çalıştı"), c: ACCENT.green },
    { t: "17:10", label: tt("Discord açılınca"), s: tt("çalıştı"), c: ACCENT.green },
    { t: tt("dün 23:00"), label: tt("Gece modu"), s: tt("koşul tutmadı"), c: ACCENT.gray },
    { t: tt("dün 19:05"), label: tt("Eve hoş geldin"), s: tt("çalıştırılmadı"), c: ACCENT.orange },
  ];
  const shown = all.slice(Math.max(0, all.length - n + 1));
  return (
    <Stage>
      <Fit w={300} h={130}>
        <div className="absolute inset-0 flex flex-col gap-[4px] rounded-[12px] bg-[#0d0d10] p-[9px]">
          <span className="mb-[2px] text-[8.5px] font-bold text-white">{tt("Son çalışanlar")}</span>
          <AnimatePresence initial={false}>
            {shown.map((r) => (
              <motion.div key={`${r.t}-${r.label}`} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-[6px] rounded-[7px] bg-white/[0.03] px-[6px] py-[3px]">
                <span className="w-[46px] text-[7px] tabular-nums text-white/40">{r.t}</span>
                <span className="flex-1 truncate text-[7.5px] text-white/85">{r.label}</span>
                <span className="rounded-full px-[5px] text-[6.5px] font-semibold" style={{ background: tintBg(r.c, 18), color: tintText(r.c) }}>
                  {r.s}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Fit>
    </Stage>
  );
}

export const DEMOS18 = {
  deckhotkey: DeckHotkeyDemo,
  voicekeys: VoiceKeysDemo,
  autoconds: AutoCondsDemo,
  phonetrig: PhoneTrigDemo,
  autoask: AutoAskDemo,
  autolog: AutoLogDemo,
};
