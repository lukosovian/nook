/**
 * 0.3.8 yama notu demoları (beşinci bölüm): Claude onay kartı beklerken gelen bildirim ve
 * bildirim kartlarının ekranda kalma süresi.
 */
import { AnimatePresence, motion } from "motion/react";
import { Bell, Check, Droplet, Gamepad2, MousePointer2, X } from "lucide-react";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

const CLAUDE = "#D97757";

/** Kapalı adada Claude onay kartı; bildirim gelince kart öne geçer, süresi bitince onay kartı geri döner */
function NotifyOverClaudeDemo() {
  const n = useTick(1200) % 5;
  const notify = n === 2 || n === 3;
  return (
    <Stage>
      <Fit w={230} h={96}>
        <motion.div
          className="absolute left-1/2 top-[10px] -translate-x-1/2 overflow-hidden rounded-[18px] border border-white/10 bg-black"
          animate={{ width: notify ? 196 : 208, height: notify ? 46 : 58 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {notify ? (
              <motion.div key="n" className="flex h-full items-center gap-[7px] px-[9px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                <MiniNook color={ACCENT.blue} size={20} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[8.5px] font-semibold text-label">Ayşe</p>
                  <p className="truncate text-[7.5px] text-label-2">{tt("Akşam maça geliyor musun?")}</p>
                </div>
                <span className="flex h-[16px] w-[16px] items-center justify-center rounded-full" style={{ background: tintBg(ACCENT.blue, 25), color: tintText(ACCENT.blue) }}>
                  <Bell size={9} />
                </span>
              </motion.div>
            ) : (
              <motion.div key="c" className="flex h-full flex-col justify-center gap-[4px] px-[9px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                <div className="flex items-center gap-[5px]">
                  <span className="h-[5px] w-[5px] rounded-full" style={{ background: CLAUDE }} />
                  <p className="truncate text-[8px] font-semibold" style={{ color: tintText(CLAUDE) }}>
                    Nook · {tt("Komut çalıştırmak istiyor")}
                  </p>
                </div>
                <p className="truncate rounded-[5px] bg-white/[0.06] px-[5px] py-[2px] font-mono text-[7px] text-label-2">npm run build</p>
                <div className="flex gap-[4px]">
                  <span className="flex flex-1 items-center justify-center gap-[2px] rounded-full py-[2px] text-[7px] font-bold text-black" style={{ background: CLAUDE }}>
                    <Check size={7} strokeWidth={3} /> {tt("İzin ver")}
                  </span>
                  <span className="flex flex-1 items-center justify-center gap-[2px] rounded-full bg-white/[0.08] py-[2px] text-[7px] font-semibold text-label-2">
                    <X size={7} strokeWidth={3} /> {tt("Reddet")}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Fit>
    </Stage>
  );
}

const SECS = [
  { id: 0, label: tt("Otomatik"), ms: 4500 },
  { id: 3, label: tt("3 sn"), ms: 3000 },
  { id: 10, label: tt("10 sn"), ms: 10000 },
];

/** Ayarlardaki süre seçimi; kartın altındaki çizgi seçilen sürede biter (hızlandırılmış) */
function NotifySecsDemo() {
  const n = useTick(2600);
  const pick = SECS[n % SECS.length];
  return (
    <Stage>
      <Fit w={230} h={100}>
        <div className="absolute inset-x-[10px] top-[8px] rounded-[9px] border border-white/10 bg-[#111113] p-[6px]">
          <p className="text-[7.5px] font-semibold text-label">{tt("Kart ekranda kalma süresi")}</p>
          <div className="mt-[4px] flex gap-[3px] rounded-full bg-white/[0.05] p-[2px]">
            {[SECS[0], SECS[1], { id: 6, label: tt("6 sn") }, SECS[2], { id: 20, label: tt("20 sn") }].map((o) => (
              <span key={o.id} className="relative flex-1 rounded-full py-[2px] text-center text-[6.5px] font-semibold" style={{ color: o.id === pick.id ? "#fff" : "var(--color-label-3)" }}>
                {o.id === pick.id && <motion.span layoutId="notify-secs-pick" className="absolute inset-0 rounded-full" style={{ background: ACCENT.blue }} />}
                <span className="relative">{o.label}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="absolute left-1/2 top-[52px] h-[38px] w-[176px] -translate-x-1/2 overflow-hidden rounded-[15px] border border-white/10 bg-black">
          <div className="flex h-full items-center gap-[7px] px-[9px]">
            <MiniNook color={ACCENT.green} size={18} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[8px] font-semibold text-label">Mehmet</p>
              <p className="truncate text-[7px] text-label-2">{tt("Toplantı 10 dakika ertelendi")}</p>
            </div>
          </div>
          <motion.span
            key={n}
            className="absolute bottom-0 left-0 h-[2px]"
            style={{ background: ACCENT.blue }}
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: (pick.ms / 10000) * 2.4, ease: "linear" }}
          />
        </div>
      </Fit>
    </Stage>
  );
}

/** Oyun önde: ada gizli. Alt-Tab: oyun arkada kalır, ada çıkar, imleç su kartına basar */
function GameClickDemo() {
  const n = useTick(1100) % 5;
  const front = n === 0;
  const clicked = n === 4;
  return (
    <Stage>
      <Fit w={230} h={100}>
        <div className="absolute inset-[6px] overflow-hidden rounded-[10px]" style={{ background: "linear-gradient(135deg,#2b1745,#0f2a3d)" }}>
          <motion.div className="absolute inset-0 flex items-center justify-center" animate={{ opacity: front ? 1 : 0.35 }}>
            <Gamepad2 size={26} className="text-white/60" />
          </motion.div>
          <motion.span
            className="absolute bottom-[5px] left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-[6px] py-[1px] text-[6.5px] font-semibold text-label-2"
            key={front ? "f" : "a"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {front ? tt("Oyun önde") : tt("Alt-Tab · oyun arkada açık")}
          </motion.span>
        </div>
        <AnimatePresence>
          {!front && (
            <motion.div
              className="absolute left-1/2 top-[12px] flex h-[34px] w-[150px] -translate-x-1/2 items-center gap-[6px] rounded-[15px] border border-white/10 bg-black px-[8px]"
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
            >
              <MiniNook color={ACCENT.blue} size={18} />
              <p className="min-w-0 flex-1 truncate text-[7.5px] font-semibold text-label">{clicked ? tt("Afiyet olsun!") : tt("Su içme vakti")}</p>
              <motion.span
                className="flex h-[17px] items-center gap-[2px] rounded-full px-[6px] text-[7px] font-bold"
                animate={{ scale: n === 3 ? 0.88 : 1 }}
                style={{ background: tintBg(ACCENT.blue, clicked ? 45 : 25), color: tintText(ACCENT.blue) }}
              >
                {clicked ? <Check size={8} strokeWidth={3} /> : <Droplet size={8} />} {clicked ? tt("İçildi") : tt("İçtim")}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          className="absolute text-white drop-shadow"
          animate={n >= 2 ? { left: 168, top: 34 } : { left: 120, top: 70 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        >
          <MousePointer2 size={12} fill="currentColor" />
        </motion.div>
      </Fit>
    </Stage>
  );
}

export const DEMOS28 = {
  gameclick: GameClickDemo,
  notifyclaude: NotifyOverClaudeDemo,
  notifysecs: NotifySecsDemo,
};
