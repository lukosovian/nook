/**
 * Masaüstü balıkçılığı: bilgisayar boştayken Nook adanın kenarına oturup masaüstüne olta sallar.
 * Ara sıra şamandıra batar, Nook oltayı sarar: bazen eski bir çöp dosyası (fırlatıp atar), bazen
 * parlak bir yıldız (saklar) çıkar. Sen dönünce neler tuttuğunu anlatır.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, usePresence, useTransform } from "motion/react";
import { haul } from "../../lib/outings";
import { useNook, type Expression } from "../../store/nook";
import { NookFigure } from "../mascot/Figure";
import { OldFile, Paw, Star, useMyLook } from "./Parts";

const SIZE = 28;
const K = SIZE / 24;
const ROD = 46;
/** Şamandıranın durduğu derinlik (adanın altından) */
const REST = 150;
const WAIT_S = [9, 26];
const STAR_CHANCE = 0.33;
const JUNK = ["eski_ödev_SON_son2.docx", "Yeni klasör (7)", "fatura_2019.pdf", "kurulum_eski.exe", "Ekran görüntüsü (412).png", "notlar_yedek.txt", "deneme123.zip"];

type Catch = { kind: "star" | "trash"; name: string };
const rad = (deg: number) => (deg * Math.PI) / 180;

export function Fishing({ width }: { width: number }) {
  const { look, color } = useMyLook();
  const [present, safeToRemove] = usePresence();
  const [face, setFace] = useState<Expression>("drowsy");
  const [hooked, setHooked] = useState<Catch | null>(null);
  const [shown, setShown] = useState<Catch | null>(null);
  const [biting, setBiting] = useState(false);
  const alive = useRef(true);

  // Nook adanın sağ alt köşesinde, kenara oturmuş
  const cx = width / 2 - 4;
  const cy = 6;
  const hx = cx + 16.5 * K * 0.8;
  const hy = cy + 3;

  const angle = useMotionValue(-120);
  const depth = useMotionValue(0);
  const dip = useMotionValue(0);
  const tipX = useTransform(angle, (a) => hx + Math.cos(rad(a)) * ROD);
  const tipY = useTransform(angle, (a) => hy + Math.sin(rad(a)) * ROD);
  const bobX = useTransform(tipX, (x) => x + 5);
  const bobY = useTransform([tipY, depth, dip], ([t, d, p]: number[]) => Math.max(t, d) + p);
  const line = useTransform([tipX, tipY, bobX, bobY], ([tx, ty, bx, by]: number[]) => `M${tx} ${ty} Q${tx + 7} ${(ty + by) / 2} ${bx} ${by - 4}`);
  const rodW = ROD;

  useEffect(() => {
    alive.current = true;
    const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
    const run = async () => {
      while (alive.current) {
        // Oltayı savur: geriye al, öne at, şamandıra suya iner
        setFace("idle");
        await animate(angle, -105, { duration: 0.35, ease: "easeOut" });
        await animate(angle, -38, { duration: 0.22, ease: "easeIn" });
        await animate(depth, REST, { type: "spring", stiffness: 60, damping: 9 });
        if (!alive.current) return;
        setFace("drowsy");
        await sleep((WAIT_S[0] + Math.random() * (WAIT_S[1] - WAIT_S[0])) * 1000);
        if (!alive.current) return;
        // Vurdu! Şamandıra üç kez batar
        setBiting(true);
        setFace("surprised");
        await animate(dip, [0, 7, 1, 8, 0, 9, 0], { duration: 1.1, ease: "easeInOut" });
        setBiting(false);
        if (!alive.current) return;
        const got: Catch = Math.random() < STAR_CHANCE ? { kind: "star", name: "Parlak yıldız!" } : { kind: "trash", name: JUNK[Math.floor(Math.random() * JUNK.length)] };
        setHooked(got);
        // Sar: olta kalkar, ip kısalır
        void animate(angle, -62, { duration: 0.5 });
        await animate(depth, 0, { duration: 0.85, ease: [0.4, 0, 0.6, 1] });
        if (!alive.current) return;
        setHooked(null);
        setShown(got);
        if (got.kind === "star") haul.stars++;
        else haul.trash++;
        useNook.getState().addCatch(got.kind === "star" ? "stars" : "trash");
        setFace(got.kind === "star" ? "happy" : "annoyed");
        await sleep(2600);
        setShown(null);
        await sleep(600);
      }
    };
    void run();
    return () => {
      alive.current = false;
    };
  }, [angle, depth, dip]);

  // Dönüş: ipi sarar, Nook adaya geri atlar
  useEffect(() => {
    if (present) return;
    alive.current = false;
    void animate(depth, 0, { duration: 0.3 });
    void animate(angle, -120, { duration: 0.3 }).then(safeToRemove);
  }, [present, angle, depth, safeToRemove]);

  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-full"
      style={{ width: 0, height: 0 }}
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: present ? 1 : 0, x: 0, transition: present ? { duration: 0.35 } : { duration: 0.25, delay: 0.25 } }}
    >
      {/* Misina */}
      <svg className="absolute left-0 top-0 overflow-visible" width="1" height="1">
        <motion.path d={line} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.9" />
      </svg>
      {/* Su halkaları (masaüstü denizi) */}
      {!hooked && !shown && (
        <motion.div className="absolute" style={{ x: bobX, y: bobY }}>
          {[0, 1].map((i) => (
            <motion.span
              key={i}
              className="absolute rounded-[50%] border"
              style={{ left: -12, top: 1, width: 24, height: 7, borderColor: "rgba(170,210,255,0.6)", borderWidth: 0.8 }}
              animate={{ scale: [0.3, 1.5], opacity: [0.8, 0] }}
              transition={{ duration: biting ? 0.5 : 2.4, repeat: Infinity, delay: i * (biting ? 0.25 : 1.2), ease: "easeOut" }}
            />
          ))}
        </motion.div>
      )}
      {/* Şamandıra ya da takılan şey */}
      <motion.div className="absolute" style={{ x: bobX, y: bobY }}>
        {hooked ? (
          <motion.div className="absolute" style={{ left: -9, top: -6 }} initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: [-12, 12, -12] }} transition={{ rotate: { duration: 0.5, repeat: Infinity } }}>
            {hooked.kind === "star" ? <Star size={18} /> : <OldFile size={15} />}
          </motion.div>
        ) : (
          <motion.div className="absolute" style={{ left: -3.5, top: -5 }} animate={biting ? undefined : { y: [0, 1.4, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
            <span className="absolute block rounded-full" style={{ width: 7, height: 7, background: "linear-gradient(180deg, #ff453a 0 50%, #ffffff 50% 100%)", boxShadow: "0 1px 2px rgba(0,0,0,0.5)" }} />
            <span className="absolute block" style={{ left: 3, top: -3, width: 1, height: 3, background: "#ff453a" }} />
          </motion.div>
        )}
      </motion.div>

      {/* Olta: sağ elden çıkar */}
      <motion.span
        className="absolute"
        style={{ left: hx, top: hy - 0.9, width: rodW, height: 1.8, originX: 0, originY: 0.5, rotate: angle, borderRadius: 1, background: "linear-gradient(90deg, #6b4423 0%, #a8743f 60%, #e2c08a 100%)" }}
      />
      {/* Nook */}
      <motion.div
        className="absolute"
        style={{ left: cx - SIZE / 2, top: cy - SIZE / 2 }}
        animate={face === "drowsy" ? { y: [0, 0.8, 0], rotate: 0 } : face === "surprised" ? { y: [0, -3, 0], rotate: 0 } : { y: 0, rotate: 0 }}
        transition={face === "drowsy" ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
      >
        <NookFigure look={look} color={color} size={SIZE} expression={face} />
        <Paw x={SIZE / 2 - 16.5 * K * 0.7} y={SIZE / 2 + 5} k={K} color={color} rotate={20} />
        <Paw x={hx - cx + SIZE / 2} y={hy - cy + SIZE / 2} k={K} color={color} rotate={-20} />
      </motion.div>

      {/* Tutulan: Nook'un başının üstünde gösterir; yıldızı saklar, çöpü fırlatır */}
      <AnimatePresence>
        {shown && (
          <motion.div
            key="shown"
            className="absolute flex flex-col items-center"
            style={{ left: cx - 60, top: cy + SIZE / 2 + 6, width: 120 }}
            initial={{ opacity: 0, y: -10, scale: 0.4 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shown.kind === "star" ? { opacity: 0, y: -14, scale: 0.3, transition: { duration: 0.35 } } : { opacity: 0, x: 70, y: 40, rotate: 200, transition: { duration: 0.5, ease: "easeIn" } }}
            transition={{ type: "spring", stiffness: 380, damping: 16 }}
          >
            <motion.div animate={shown.kind === "star" ? { rotate: [0, 12, -12, 0], scale: [1, 1.12, 1] } : { rotate: [-6, 6, -6] }} transition={{ duration: 1.1, repeat: Infinity }}>
              {shown.kind === "star" ? <Star size={26} /> : <OldFile size={20} />}
            </motion.div>
            <span
              className="mt-1 max-w-[120px] truncate rounded-full bg-black/80 px-2 py-0.5 text-[9.5px] font-medium"
              style={{ color: shown.kind === "star" ? "#ffd23f" : "rgba(255,255,255,0.65)" }}
            >
              {shown.name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
