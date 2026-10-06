/**
 * Gizlilik kalkanı: ekranı tamamen örten gece sahnesi. Ortada uyuyan Nook, çevresinde süzülen
 * küçük Nook'lar, yıldızlar. Kısayol, Esc ya da çift tıkla kalkar (bkz. src-tauri/src/shield.rs).
 */
import { useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { shieldOff } from "../lib/bridge";
import { CHIP_NOOKS, HALLOWEEN, normalizeColor, normalizeLook } from "../lib/look";
import { useNook } from "../store/nook";
import { NookFigure } from "./mascot/Figure";
import { tt } from "../lib/i18n";

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function Shield() {
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  const shortcut = useNook((s) => s.settings.shieldShortcut);

  useEffect(() => {
    document.documentElement.style.background = "#07070c";
    document.body.style.background = "#07070c";
    const key = (e: KeyboardEvent) => e.key === "Escape" && void shieldOff();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const stars = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ id: i, x: rnd(0, 100), y: rnd(0, 100), s: rnd(1, 2.6), d: rnd(2, 5), delay: rnd(0, 4) })), []);
  const friends = useMemo(() => {
    const pool = [...Object.values(CHIP_NOOKS), ...HALLOWEEN.map((h) => ({ look: h.look, color: h.color }))];
    const picked = pool.sort(() => Math.random() - 0.5).slice(0, 8);
    // Ekranın kenarlarına dağılırlar, ortayı (asıl Nook) boş bırakırlar
    return picked.map((f, i) => {
      const a = (i / picked.length) * Math.PI * 2 + rnd(-0.25, 0.25);
      return { ...f, x: 50 + Math.cos(a) * rnd(28, 40), y: 50 + Math.sin(a) * rnd(26, 36), size: rnd(46, 74), float: rnd(3, 6), delay: rnd(0, 2) };
    });
  }, []);

  return (
    <div
      className="fixed inset-0 cursor-default select-none overflow-hidden"
      style={{ background: "radial-gradient(120% 90% at 50% 40%, #1a1830 0%, #0c0b18 45%, #050509 100%)" }}
      onDoubleClick={() => void shieldOff()}
    >
      {stars.map((s) => (
        <motion.span
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s }}
          animate={{ opacity: [0.15, 0.9, 0.15] }}
          transition={{ duration: s.d, repeat: Infinity, delay: s.delay }}
        />
      ))}

      {friends.map((f, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: `${f.x}%`, top: `${f.y}%`, marginLeft: -f.size / 2, marginTop: -f.size / 2 }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 0.9, scale: 1, y: [0, -14, 0], rotate: [-4, 4, -4] }}
          transition={{ opacity: { duration: 0.6, delay: 0.1 + i * 0.07 }, scale: { type: "spring", stiffness: 260, damping: 16, delay: 0.1 + i * 0.07 }, y: { duration: f.float, repeat: Infinity, ease: "easeInOut", delay: f.delay }, rotate: { duration: f.float * 1.3, repeat: Infinity, ease: "easeInOut" } }}
        >
          <NookFigure look={f.look} color={f.color} size={f.size} expression="sleepy" />
        </motion.div>
      ))}

      {/* Ortada uyuyan asıl Nook */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: [1, 1.04, 1], opacity: 1 }} transition={{ scale: { duration: 3.2, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.4 } }}>
          <NookFigure look={look} color={color} size={150} expression="sleepy" />
        </motion.div>
        {/* Zzz */}
        <div className="pointer-events-none absolute -right-6 -top-4">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute font-semibold text-white/70"
              style={{ fontSize: 18 + i * 6 }}
              initial={{ opacity: 0, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0], x: [0, 14 + i * 8], y: [0, -30 - i * 16] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
            >
              z
            </motion.span>
          ))}
        </div>
        <motion.p className="mt-8 text-[22px] font-semibold tracking-tight text-white/85" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>{tt("Şşş… burada bir şey yok")}</motion.p>
        <motion.p className="mt-2 text-[13px] text-white/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>{shortcut ? tt("Kalkanı kaldırmak için {0} bas, Esc ya da çift tıkla", shortcut) : tt("Kalkanı kaldırmak için kısayola bas, Esc ya da çift tıkla")}</motion.p>
      </div>
    </div>
  );
}
