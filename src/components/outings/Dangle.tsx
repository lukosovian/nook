/**
 * İple sarkma: ekranın altında uzun süre çalışırken Nook adanın altından minik bir iple aşağı
 * sarkar, sallanarak yaptıklarını izler. İmleç yaklaşınca ipi hızla sarıp adaya kaçar.
 */
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, usePresence, useTransform } from "motion/react";
import { playAntic } from "../../hooks/useAntics";
import { cursorX, cursorY, FAR } from "../../lib/cursor";
import { useNook, type Expression } from "../../store/nook";
import { NookFigure } from "../mascot/Figure";
import { Paw, useMyLook } from "./Parts";

const SIZE = 34;
const K = SIZE / 24;
/** İpin en uzun hâli (pencere 350 px; ada 34) */
const DROP = 188;
/** İmleç bu kadar yaklaşınca fark eder, bu kadar yaklaşınca kaçar */
const NOTICE = 230;
const FLEE = 105;
/** Bu kadar sarkınca kendiliğinden döner */
const STAY_MS = [150_000, 240_000];
const IDLE_FACES: Expression[] = ["idle", "idle", "wink", "idle", "happy", "idle", "suspicious"];

export function Dangle() {
  const { look, color } = useMyLook();
  const [present, safeToRemove] = usePresence();
  const box = useRef<HTMLDivElement>(null);
  const rope = useMotionValue(0);
  const [face, setFace] = useState<Expression>("idle");
  const [noticed, setNoticed] = useState(false);
  const fled = useRef(false);

  // İner: önce hızlı düşer, ipin ucunda yaylanır
  useEffect(() => {
    const a = animate(rope, DROP, { type: "spring", stiffness: 70, damping: 7, mass: 1.1 });
    const stay = window.setTimeout(() => {
      if (useNook.getState().outing === "hang") useNook.getState().setOuting(null);
    }, STAY_MS[0] + Math.random() * (STAY_MS[1] - STAY_MS[0]));
    return () => {
      a.stop();
      window.clearTimeout(stay);
    };
  }, [rope]);

  // Ara sıra göz kırpar, gülümser, şüpheyle bakar
  useEffect(() => {
    let i = 0;
    const t = window.setInterval(() => setFace(IDLE_FACES[i++ % IDLE_FACES.length]), 3800);
    return () => window.clearInterval(t);
  }, []);

  // Sakin dönüş (sen yukarı çıktın, ada açıldı): ipi yavaşça sarar
  useEffect(() => {
    if (present) return;
    const a = animate(rope, 0, { duration: fled.current ? 0.12 : 0.7, ease: [0.5, 0, 0.7, 0.4] });
    void a.then(safeToRemove);
    return () => a.stop();
  }, [present, rope, safeToRemove]);

  // İmleç yaklaşınca önce fark eder, sonra kaçar
  const check = () => {
    if (fled.current || !present || !box.current) return;
    const x = cursorX.get();
    const y = cursorY.get();
    if (x === FAR) return setNoticed(false);
    const r = box.current.getBoundingClientRect();
    const d = Math.hypot(x - r.left, y - (r.top + rope.get() + SIZE / 2));
    setNoticed(d < NOTICE);
    if (d < FLEE) {
      fled.current = true;
      setFace("surprised");
      void animate(rope, 0, { duration: 0.28, ease: [0.6, 0, 0.9, 0.5] }).then(() => {
        if (useNook.getState().outing === "hang") useNook.getState().setOuting(null);
        window.setTimeout(() => playAntic("surprised"), 120);
      });
    }
  };
  useMotionValueEvent(cursorX, "change", check);
  useMotionValueEvent(cursorY, "change", check);

  // İmlece doğru başını hafifçe çevirir
  const tilt = useTransform(cursorX, (x) => {
    const r = box.current?.getBoundingClientRect();
    if (x === FAR || !r) return 0;
    return Math.max(-14, Math.min(14, (x - r.left) / 18));
  });
  const nookY = useTransform(rope, (l) => l);
  const ropeH = useTransform(rope, (l) => Math.max(0, l - 4));
  const shown = noticed && !fled.current ? "surprised" : face;

  return (
    <div ref={box} className="pointer-events-none absolute left-1/2 top-full" style={{ width: 0, height: 0 }}>
      {/* Bütün ip + Nook sarkaç gibi salınır */}
      <motion.div
        className="absolute left-0 top-0"
        style={{ originX: 0, originY: 0 }}
        animate={{ rotate: [-3.5, 3.5, -3.5] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.span
          className="absolute"
          style={{ left: -0.6, top: -2, width: 1.2, height: ropeH, background: "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.85))", borderRadius: 1 }}
        />
        <motion.div className="absolute" style={{ left: 0, top: 0, y: nookY }}>
          {/* İpe tutunan eller */}
          <Paw x={-1.6} y={-0.5} k={K} color={color} rotate={70} />
          <Paw x={1.6} y={-6.5 * K} k={K} color={color} rotate={110} />
          <motion.div className="absolute" style={{ left: -SIZE / 2, top: 2, rotate: tilt, originY: 0 }}>
            <NookFigure look={look} color={color} size={SIZE} expression={shown} />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
