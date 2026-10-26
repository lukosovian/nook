/**
 * Cadılar Bayramı görsel öğeleri:
 * 1. HangingSpider: Adanın köşesinden sarkan, fare yaklaşınca adaya kaçan sevimli örümcek.
 * 2. PumpkinGlow: Adanın içinde/arkasında yanan hafif Jack-o'-lantern mum ışığı.
 * 3. TrickOrTreatOverlay: Tık tık kapı çalma ve "Şeker mi şaka mı?" mini etkileşimi.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useHalloween } from "../../lib/halloween";
import { tt } from "../../lib/i18n";
import { playSfx } from "../../lib/sfx";

/** Adanın sağ üst kenarından sarkan minik örümcek; imleç yaklaşınca yukarı kaçar */
export function HangingSpider({ islandRef }: { islandRef?: React.RefObject<HTMLDivElement | null> }) {
  const spiderHiding = useHalloween((s) => s.spiderHiding);
  const setSpiderHiding = useHalloween((s) => s.setSpiderHiding);
  const triggerKnock = useHalloween((s) => s.triggerKnock);
  const [hovered, setHovered] = useState(false);

  // İmleç mesafesini takip et
  useEffect(() => {
    let peekTimer: number | undefined;
    const onMove = (e: MouseEvent) => {
      const el = islandRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const spiderX = rect.right - 24;
      const spiderY = rect.top + 38;
      const dx = e.clientX - spiderX;
      const dy = e.clientY - spiderY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 55) {
        setSpiderHiding(true);
        // Kaçtıktan kısa süre sonra merak edip adanın kenarından tekrar uzansın
        window.clearTimeout(peekTimer);
        peekTimer = window.setTimeout(() => setSpiderHiding(false), 2400);
      } else if (dist > 95) {
        setSpiderHiding(false);
      }
    };

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.clearTimeout(peekTimer);
    };
  }, [islandRef, setSpiderHiding]);

  // Saklanınca adanın üst kenarında (y=2) merakla göz ucuyla bekler, normalde y=34'e sarkar
  const yTarget = spiderHiding ? 2 : 34;

  return (
    <div className="pointer-events-none absolute right-4 top-0 z-40 select-none">
      {/* İpek İplik */}
      <motion.div
        className="absolute left-[7px] top-0 w-[1px] bg-white/35 origin-top"
        animate={{ height: Math.max(0, yTarget + 4) }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
      />

      {/* Sevimli Örümcek */}
      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          playSfx("pop", true);
          triggerKnock();
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="pointer-events-auto absolute left-0 flex h-4 w-4 cursor-pointer items-center justify-center outline-none"
        animate={{
          y: yTarget,
          rotate: hovered ? [0, -12, 12, 0] : [-3, 3, -3],
        }}
        transition={{
          y: { type: "spring", stiffness: 320, damping: 24 },
          rotate: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
        }}
        title={tt("Tıkla: Şeker mi şaka mı?")}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          {/* Bacaklar */}
          <path d="M4 8C2 5 2 2 1 1" stroke="#332a4a" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 8C22 5 22 2 23 1" stroke="#332a4a" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 12C1 11 0 14 0 16" stroke="#332a4a" strokeWidth="2" strokeLinecap="round" />
          <path d="M21 12C23 11 24 14 24 16" stroke="#332a4a" strokeWidth="2" strokeLinecap="round" />
          <path d="M5 16C3 18 2 21 2 23" stroke="#332a4a" strokeWidth="2" strokeLinecap="round" />
          <path d="M19 16C21 18 22 21 22 23" stroke="#332a4a" strokeWidth="2" strokeLinecap="round" />

          {/* Gövde */}
          <circle cx="12" cy="12" r="7.5" fill="#1e1830" stroke="#ff8a1f" strokeWidth="1.2" />

          {/* Minik Sevimli Gözler */}
          <circle cx="9.5" cy="10.5" r="1.8" fill="white" />
          <circle cx="14.5" cy="10.5" r="1.8" fill="white" />
          <circle cx="9.8" cy="10.7" r="0.9" fill="#0d0918" />
          <circle cx="14.2" cy="10.7" r="0.9" fill="#0d0918" />

          {/* Minik Yanaklar */}
          <circle cx="8" cy="13" r="1" fill="#ff5c8a" opacity="0.6" />
          <circle cx="16" cy="13" r="1" fill="#ff5c8a" opacity="0.6" />
        </svg>
      </motion.button>
    </div>
  );
}

/** Jack-o'-lantern fenerinin titreyen sıcak turuncu/mor mum ışığı */
export function PumpkinGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
      <motion.div
        className="absolute -top-12 left-1/2 h-36 w-64 -translate-x-1/2 rounded-full opacity-35"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, #ff8a1f 0%, #9b7bff 45%, transparent 75%)",
        }}
        animate={{
          scale: [1, 1.06, 0.97, 1.03, 1],
          opacity: [0.32, 0.42, 0.28, 0.38, 0.32],
        }}
        transition={{
          duration: 3.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

/** Şeker mi Şaka mı Bildirimi ve Etkileşimi */
export function TrickOrTreatOverlay({ width: _width }: { width?: number }) {
  const phase = useHalloween((s) => s.phase);
  const openAsking = useHalloween((s) => s.openAsking);
  const chooseCandy = useHalloween((s) => s.chooseCandy);
  const chooseTrick = useHalloween((s) => s.chooseTrick);
  const dismiss = useHalloween((s) => s.dismiss);

  if (phase === "idle") return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {phase === "knocking" && (
          <motion.div
            key="knocking"
            initial={{ opacity: 0, scale: 0.88, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88 }}
            onClick={openAsking}
            onMouseEnter={openAsking}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-orange-500/40 bg-black/90 px-3 py-1 shadow-lg backdrop-blur-md"
            style={{
              boxShadow: "0 4px 18px rgba(255,138,31,0.35)",
            }}
          >
            <motion.span
              className="text-[13px]"
              animate={{ rotate: [-8, 8, -8], scale: [1, 1.15, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              🎃
            </motion.span>
            <div className="leading-tight">
              <span className="block text-[11px] font-bold text-white">
                {tt("Tık tık! Kapı çalıyor…")}
              </span>
              <span className="block text-[9px] text-orange-300">
                {tt("Dokun: Şeker mi şaka mı?")}
              </span>
            </div>
          </motion.div>
        )}

        {phase === "asking" && (
          <motion.div
            key="asking"
            initial={{ opacity: 0, scale: 0.9, y: 3 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex max-w-[92%] items-center justify-between gap-2.5 rounded-[14px] border border-orange-500/50 bg-[#0e0a16]/95 px-3 py-1.5 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[16px]">🎃</span>
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-extrabold text-orange-200">
                  {tt("Şeker mi şaka mı?")}
                </p>
                <p className="text-[9px] text-white/50">{tt("Nook kapına geldi!")}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={chooseCandy}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold text-black"
                style={{ background: "#ff8a1f", boxShadow: "0 2px 10px rgba(255,138,31,0.4)" }}
              >
                <span>🍬</span>
                <span>{tt("Şeker Ver")}</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={chooseTrick}
                className="flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-950/60 px-2 py-1 text-[10.5px] font-bold text-purple-200"
              >
                <span>👻</span>
                <span>{tt("Şaka Yap")}</span>
              </motion.button>

              <button
                type="button"
                onClick={dismiss}
                className="ml-0.5 rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white"
              >
                <X size={11} />
              </button>
            </div>
          </motion.div>
        )}

        {phase === "candy" && (
          <motion.div
            key="candy"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="flex items-center gap-2 rounded-full border border-green-500/40 bg-black/90 px-3.5 py-1.5 shadow-lg"
          >
            <motion.span
              animate={{ y: [-4, 0, -4] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="text-[14px]"
            >
              🍬
            </motion.span>
            <div className="leading-tight">
              <span className="block text-[11px] font-bold text-white">
                {tt("Nefis! Çok teşekkürler! ♥")}
              </span>
              <span className="block text-[9px] text-green-300 font-semibold">
                +15 {tt("Sevgi puanı kazandın")}
              </span>
            </div>
          </motion.div>
        )}

        {phase === "trick" && (
          <motion.div
            key="trick"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2 rounded-full border border-purple-500/40 bg-[#160b24]/95 px-3.5 py-1.5 shadow-lg"
          >
            <motion.span
              animate={{ rotate: [-14, 14, -14], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-[16px]"
            >
              👻
            </motion.span>
            <div className="leading-tight">
              <span className="block text-[11.5px] font-extrabold text-purple-200">
                {tt("BÖÖÖÖ! Korktun mu? 👻")}
              </span>
              <span className="block text-[9px] text-purple-300">
                {tt("Şakanın tadı damağımızda kaldı!")}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
