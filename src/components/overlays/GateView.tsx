import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "motion/react";
import { Lock } from "lucide-react";
import { checkPassword, openGate } from "../../lib/lock";
import { spring } from "../../lib/motion";
import { playAntic } from "../../hooks/useAntics";
import { useNook } from "../../store/nook";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

const COLOR = ACCENT.red;

/**
 * Açılış kilidi: bilgisayar açıldı, Nook adada parola bekler. Doğru parolayla ada açılır,
 * ardından günün karşılaması gelir. Yanlışsa kutu sallanır.
 */
export function GateView() {
  const hash = useNook((s) => s.settings.lockHash);
  const [v, setV] = useState("");
  const [wrong, setWrong] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const shake = useAnimationControls();
  useEffect(() => {
    input.current?.focus();
  }, []);
  // Parola kaldırıldıysa (başka bir yerden) kilit de kalkar
  useEffect(() => {
    if (!hash) openGate();
  }, [hash]);

  const go = async () => {
    if (!v) return;
    if (await checkPassword(v, hash)) {
      openGate();
      playAntic("hop");
      return;
    }
    setWrong(true);
    setV("");
    void shake.start({ x: [0, -7, 6, -4, 3, 0], transition: { duration: 0.36 } });
  };

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.08, duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      <div className="absolute inset-y-0 left-[94px] right-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[14px] font-semibold leading-tight" style={{ color: tintText(COLOR) }}>
            <Lock size={12} strokeWidth={2.6} />
            {tt("Nook kilitli")}
          </p>
          <motion.div animate={shake} className="mt-1.5 flex items-center gap-1.5">
            <input
              ref={input}
              type="password"
              value={v}
              placeholder={wrong ? tt("Yanlış parola") : tt("Parola")}
              onChange={(e) => (setV(e.target.value), setWrong(false))}
              onKeyDown={(e) => e.key === "Enter" && void go()}
              onPointerDown={() => input.current?.focus()}
              className={`h-7 min-w-0 flex-1 rounded-full bg-well px-3 text-[12px] font-medium text-label outline-none focus:bg-well-hi ${wrong ? "placeholder:text-[color:var(--color-red)]" : "placeholder:text-label-3"}`}
            />
            <motion.button
              whileTap={{ scale: 0.92 }}
              transition={spring.pop}
              onClick={() => void go()}
              className="flex h-7 shrink-0 items-center rounded-full border px-3 text-[11.5px] font-medium"
              style={{ background: tintBg(COLOR, 14), borderColor: tintBg(COLOR, 34), color: tintText(COLOR) }}
            >
              {tt("Aç")}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
