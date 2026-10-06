import { useEffect, useRef, useState } from "react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Languages, Pipette, X } from "lucide-react";
import { playAntic } from "../../hooks/useAntics";
import { copyText, setInteractive } from "../../lib/bridge";
import { spring } from "../../lib/motion";
import { useNook, type ClipItem } from "../../store/nook";
import { ACCENT, EmptyState, TextButton, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

export function ClipboardPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("clip", scroller);
  const clips = useNook((s) => s.clips);
  const clearClips = useNook((s) => s.clearClips);
  const removeClip = useNook((s) => s.removeClip);
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async (c: ClipItem, translation = false) => {
    await copyText(translation && c.translation ? c.translation : (c.color ?? c.text));
    setCopied(translation ? `${c.id}-tr` : c.id);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 1000);
  };

  const colors = clips.filter((c) => c.color);
  const texts = clips.filter((c) => !c.color);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between">
        <PickColor />
        {texts.length > 0 && (
          <TextButton tone="danger" onClick={clearClips}>{tt("Temizle")}</TextButton>
        )}
      </div>

      {!clips.length ? (
        <EmptyState title={tt("Pano boş")} hint={tt("Kopyaladığın metinler ve renkler burada birikir")} color={ACCENT.purple} />
      ) : (
        <div ref={scroller} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {colors.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence initial={false}>
                {colors.map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={spring.pop}
                    className="group flex h-7 items-center rounded-full border"
                    style={{ background: tintBg(c.color!, 12), borderColor: tintBg(c.color!, 35) }}
                  >
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      transition={spring.pop}
                      onClick={() => copy(c)}
                      title={`${c.text} — kopyala`}
                      className="flex h-full items-center gap-1.5 py-1 pl-1 pr-1.5"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: c.color!, boxShadow: `0 0 8px -1px ${c.color}` }}>
                        <AnimatePresence>
                          {copied === c.id && (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                              <Check size={11} strokeWidth={3.5} className="text-white mix-blend-difference" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                      <span className="font-mono text-[11px] font-medium" style={{ color: tintText(c.color!) }}>
                        {c.color}
                      </span>
                    </motion.button>
                    {/* Sil: üzerine gelince belirir */}
                    <button
                      onClick={() => removeClip(c.id)}
                      title={tt("Rengi sil")}
                      className="mr-1 flex h-4 w-4 items-center justify-center rounded-full text-label-3 opacity-40 transition hover:bg-white/10 hover:text-label group-hover:opacity-100"
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {texts.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={spring.pop}
                  className="overflow-hidden rounded-[10px] bg-well"
                >
                  <button
                    onClick={() => copy(c)}
                    title={c.text}
                    className="group flex h-8 w-full items-center gap-2 px-2.5 text-left transition-colors hover:bg-well-hi"
                  >
                    <span className="min-w-0 flex-1 truncate text-[12px] text-label">{c.text.replace(/\s+/g, " ")}</span>
                    {copied === c.id ? (
                      <Check size={13} strokeWidth={3} style={{ color: ACCENT.green }} />
                    ) : (
                      <Copy size={12} strokeWidth={2.2} className="text-label-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </button>
                  {c.translation && (
                    <button
                      onClick={() => copy(c, true)}
                      title={tt("{0} — çeviriyi kopyala", c.translation)}
                      className="group flex h-7 w-full items-center gap-2 border-t border-white/[0.05] px-2.5 text-left transition-colors hover:bg-well-hi"
                    >
                      <Languages size={11} strokeWidth={2.4} className="shrink-0" style={{ color: ACCENT.purple }} />
                      <span className="min-w-0 flex-1 truncate text-[11.5px]" style={{ color: tintText(ACCENT.purple) }}>
                        {c.translation}
                      </span>
                      {copied === `${c.id}-tr` ? (
                        <Check size={13} strokeWidth={3} style={{ color: ACCENT.green }} />
                      ) : (
                        <Copy size={12} strokeWidth={2.2} className="text-label-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

/** Ekranın herhangi bir yerinden renk al → panoya kopyala ve renk havuzuna ekle. */
function PickColor() {
  const ED = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
  if (!ED) return <span />;
  const pick = async () => {
    // Seçerken imleç adanın dışına çıkar: ada açık ve pencere tıklanabilir kalsın, yoksa seçici kapanır
    const st = useNook.getState();
    st.setHold("eyedropper", true);
    await setInteractive(true);
    try {
      const { sRGBHex } = await new ED().open();
      const hex = sRGBHex.toUpperCase();
      await copyText(hex);
      useNook.getState().pushClip(hex);
      playAntic("wink");
    } catch {
      // Esc ile vazgeçildi
    } finally {
      useNook.getState().setHold("eyedropper", false);
      void setInteractive(false);
    }
  };
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={spring.pop}
      onClick={() => void pick()}
      title={tt("Ekrandan renk seç")}
      className="flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium"
      style={{ background: tintBg(ACCENT.purple, 14), borderColor: tintBg(ACCENT.purple, 38), color: tintText(ACCENT.purple) }}
    >
      <Pipette size={11} strokeWidth={2.6} />{tt("Ekrandan renk seç")}</motion.button>
  );
}
