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

/** Jack-o'-lantern fenerinin titreyen sıcak turuncu/mor mum ışığı (yalnızca kapalı adada yumuşak bir parıltı) */
export function PumpkinGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
      <motion.div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(255,138,31,0.22) 0%, rgba(155,123,255,0.08) 45%, transparent 75%)",
        }}
        animate={{
          opacity: [0.7, 1, 0.65, 0.9, 0.7],
        }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

/** Şeker mi Şaka mı Bildirimi ve Etkileşimi (Adanın içinde ferah ve tıklanabilir kart) */
export function HalloweenView() {
  const phase = useHalloween((s) => s.phase);
  const openAsking = useHalloween((s) => s.openAsking);
  const chooseCandy = useHalloween((s) => s.chooseCandy);
  const chooseTrick = useHalloween((s) => s.chooseTrick);
  const dismiss = useHalloween((s) => s.dismiss);

  if (phase === "idle") return null;

  return (
    <motion.div
      className="pointer-events-auto absolute inset-y-0 left-[62px] right-3 flex items-center justify-between"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.18 }}
    >
      <AnimatePresence mode="wait">
        {phase === "knocking" && (
          <motion.div
            key="knocking"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={openAsking}
            className="flex flex-1 cursor-pointer items-center justify-between min-w-0"
          >
            <div className="min-w-0">
              <span className="block truncate text-[12.5px] font-extrabold text-orange-200">
                🎃 {tt("Tık tık! Kapı çalıyor…")}
              </span>
              <span className="block truncate text-[10px] text-orange-300/80">
                {tt("Dokun: Şeker mi şaka mı?")}
              </span>
            </div>
            <motion.span
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              className="shrink-0 rounded-full bg-orange-500/20 px-3 py-1 text-[11px] font-bold text-orange-300 shadow-sm border border-orange-500/30"
            >
              {tt("Aç ▶")}
            </motion.span>
          </motion.div>
        )}

        {phase === "asking" && (
          <motion.div
            key="asking"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-1 items-center justify-between gap-2 min-w-0"
          >
            <div className="min-w-0">
              <span className="block truncate text-[12px] font-extrabold text-orange-200">
                {tt("Şeker mi şaka mı?")}
              </span>
              <span className="block truncate text-[9.5px] text-white/50">{tt("Nook kapına geldi!")}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={chooseCandy}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold text-black shadow-md"
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
                className="flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-950/60 px-2.5 py-1 text-[10.5px] font-bold text-purple-200"
              >
                <span>👻</span>
                <span>{tt("Şaka Yap")}</span>
              </motion.button>

              <button
                type="button"
                onClick={dismiss}
                className="ml-0.5 rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}

        {phase === "candy" && (
          <motion.div
            key="candy"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-1 items-center gap-2 min-w-0"
          >
            <span className="text-xl">🍬</span>
            <div className="min-w-0">
              <span className="block truncate text-[12px] font-bold text-white">
                {tt("Nefis! Çok teşekkürler! ♥")}
              </span>
              <span className="block truncate text-[10px] text-green-300 font-semibold">
                +15 {tt("Sevgi puanı kazandın")}
              </span>
            </div>
          </motion.div>
        )}

        {phase === "trick" && (
          <motion.div
            key="trick"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-1 items-center gap-2 min-w-0"
          >
            <span className="text-xl">👻</span>
            <div className="min-w-0">
              <span className="block truncate text-[12.5px] font-extrabold text-purple-200">
                {tt("BÖÖÖÖ! Korktun mu? 👻")}
              </span>
              <span className="block truncate text-[10px] text-purple-300">
                {tt("Şakanın tadı damağımızda kaldı!")}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export const TrickOrTreatOverlay = HalloweenView;
