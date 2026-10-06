import { AnimatePresence, motion } from "motion/react";
import { ANTIC_MS } from "../../hooks/useAntics";
import type { Expression } from "../../store/nook";

/**
 * Nook'un elinde tuttuğu küçük eşyalar ve etrafındaki efektler. Hepsi yüz biriminde
 * (küre 24 px, merkez 12,12) çizilir; yüzle birlikte büyüyüp küçülür.
 * Yüzün önüne gelen eller (kitabı, kalemi, büyüteci tutan) eşyayla birlikte burada çizilir.
 */

export type SleepStyle = "blanket" | "bubble" | "nap";

const sec = (ms: number) => ms / 1000;
const HAND_BG = "radial-gradient(circle at 35% 30%, #ffffff 0%, #e4e4ea 55%, #a9a9b4 100%)";

/** Önde duran el (Hands'teki ile aynı görünüm) */
function PropHand({ x, y, rotate = 0 }: { x: number; y: number; rotate?: number }) {
  return (
    <span
      className="absolute rounded-full"
      style={{ left: x - 3.2, top: y - 2.6, width: 6.4, height: 5.2, background: HAND_BG, boxShadow: "0 1px 2px rgba(0,0,0,0.45)", transform: `rotate(${rotate}deg)` }}
    />
  );
}

const pop = {
  initial: { opacity: 0, scale: 0.4 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.5, transition: { duration: 0.18 } },
  transition: { type: "spring", stiffness: 420, damping: 22 },
} as const;

export function Props({ expression, sleepStyle }: { expression: Expression; sleepStyle: SleepStyle }) {
  const sleeping = expression === "sleepy";
  return (
    <AnimatePresence>
      {sleeping && sleepStyle === "blanket" && <Blanket key="blanket" />}
      {sleeping && sleepStyle === "bubble" && <SnotBubble key="bubble" />}
      {expression === "read" && <Book key="book" />}
      {expression === "campfire" && <Campfire key="fire" />}
      {expression === "umbrella" && <Umbrella key="umbrella" />}
      {expression === "hot" && <Fan key="fan" />}
      {(expression === "note" || expression === "writing") && <Paper key="paper" />}
      {expression === "magnify" && <Magnifier key="lens" />}
      {expression === "gum" && <GumBubble key="gum" />}
      {expression === "sneeze" && <SneezePuff key="sneeze" />}
      {expression === "focused" && <Desk key="desk" />}
      {expression === "knock" && <Knock key="knock" />}
    </AnimatePresence>
  );
}

/** Uyurken yorganı çenesine kadar çeker; elleri yorganın kenarında, nefes aldıkça kabarır. */
function Blanket() {
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ left: -6, top: 15.5, width: 36, height: 12, originY: 1 }}
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 10, opacity: 0, transition: { duration: 0.35 } }}
      transition={{ duration: 1.1, ease: [0.2, 0.8, 0.3, 1] }}
    >
      <motion.div
        className="absolute inset-0 overflow-hidden"
        style={{
          borderRadius: "7px 7px 4px 4px",
          background: "linear-gradient(180deg, #7f9bff 0%, #5a74e0 55%, #4458b8 100%)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
          originY: 1,
        }}
        animate={{ scaleY: [1, 1.06, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
      >
        {/* Kıvrılmış üst kenar */}
        <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "#b9c8ff", borderRadius: "7px 7px 2px 2px" }} />
        {/* Kapitone dikişler */}
        {[8, 18, 28].map((x) => (
          <span key={x} className="absolute rounded-full" style={{ left: x, top: 6, width: 1.4, height: 1.4, background: "rgba(255,255,255,0.45)" }} />
        ))}
      </motion.div>
      <PropHand x={10} y={1.6} rotate={-8} />
      <PropHand x={26} y={1.6} rotate={8} />
    </motion.div>
  );
}

/** Uykuda burnundan şişip sönen balon (anime usulü). */
function SnotBubble() {
  return (
    <motion.span
      className="pointer-events-none absolute rounded-full"
      style={{
        left: 13,
        top: 12.5,
        width: 7,
        height: 7,
        originX: 0,
        originY: 0,
        background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95) 0%, rgba(190,225,255,0.55) 35%, rgba(140,195,255,0.3) 100%)",
        boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.8)",
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0.25, 1, 0.25], opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ scale: { duration: 3.2, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.3 } }}
    />
  );
}

/** Kitap okur: iki eliyle tutar, ortasında sayfa çevirir. */
function Book() {
  const d = sec(ANTIC_MS.read);
  return (
    <motion.div className="pointer-events-none absolute" style={{ left: 1, top: 14, width: 22, height: 12 }} {...pop}>
      <svg width="22" height="12" viewBox="0 0 22 12" className="absolute inset-0 overflow-visible">
        {/* Kapak */}
        <path d="M1 2.2 L11 3.2 L21 2.2 L21 11.4 L11 12 L1 11.4 Z" fill="#e0574f" />
        {/* Sayfalar */}
        <path d="M2 1.4 Q6.5 0.4 11 2.4 L11 11 Q6.5 9.4 2 10.4 Z" fill="#fbf6ea" />
        <path d="M20 1.4 Q15.5 0.4 11 2.4 L11 11 Q15.5 9.4 20 10.4 Z" fill="#f3ecdb" />
        {[3.8, 5.4, 7].map((y) => (
          <g key={y} stroke="#b9b2a2" strokeWidth="0.55" strokeLinecap="round">
            <line x1="3.6" y1={y} x2="9.4" y2={y + 0.5} />
            <line x1="12.6" y1={y + 0.5} x2="18.4" y2={y} />
          </g>
        ))}
      </svg>
      {/* Çevrilen sayfa */}
      <motion.span
        className="absolute"
        style={{ left: 11, top: 1.6, width: 8.6, height: 9.2, background: "#fffaf0", originX: 0, borderRadius: "0 2px 1px 0", boxShadow: "0 0 1px rgba(0,0,0,0.3)" }}
        initial={{ scaleX: 1, opacity: 0 }}
        animate={{ scaleX: [1, 1, -1, -1], opacity: [0, 0, 1, 0] }}
        transition={{ duration: d, times: [0, 0.5, 0.62, 0.66], ease: "easeInOut" }}
      />
      <PropHand x={1.5} y={8} rotate={20} />
      <PropHand x={20.5} y={8} rotate={-20} />
    </motion.div>
  );
}

/** Soğukta: solunda çıtırdayan küçük kamp ateşi, kıvılcımlar yükselir. */
function Campfire() {
  return (
    <motion.div className="pointer-events-none absolute" style={{ left: -14.5, top: 9, width: 14, height: 16, scale: 0.8, originX: 1, originY: 1 }} {...pop}>
      {/* Sıcak parıltı */}
      <motion.span
        className="absolute rounded-full"
        style={{ left: -8, top: -4, width: 30, height: 26, background: "radial-gradient(circle, rgba(255,150,40,0.45) 0%, transparent 65%)" }}
        animate={{ opacity: [0.7, 1, 0.75, 0.95, 0.7] }}
        transition={{ duration: 1.3, repeat: Infinity }}
      />
      {/* Odunlar */}
      <span className="absolute rounded-full" style={{ left: 0.5, top: 12.6, width: 13, height: 2.6, background: "#7a4a2a", transform: "rotate(14deg)" }} />
      <span className="absolute rounded-full" style={{ left: 0.5, top: 12.6, width: 13, height: 2.6, background: "#8d5832", transform: "rotate(-14deg)" }} />
      {/* Alevler: dış turuncu, iç sarı */}
      <motion.span
        className="absolute"
        style={{ left: 2.5, top: 2, width: 9, height: 11.5, originY: 1, borderRadius: "50% 50% 45% 45% / 65% 65% 35% 35%", background: "linear-gradient(180deg, #ff7a1a, #ff4d1a)" }}
        animate={{ scaleY: [1, 1.15, 0.92, 1.1, 1], scaleX: [1, 0.92, 1.05, 0.95, 1], skewX: [0, 4, -3, 3, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="absolute"
        style={{ left: 4.5, top: 6, width: 5, height: 7, originY: 1, borderRadius: "50% 50% 45% 45% / 65% 65% 35% 35%", background: "linear-gradient(180deg, #fff3a0, #ffc53a)" }}
        animate={{ scaleY: [1, 0.85, 1.2, 0.95, 1], skewX: [0, -5, 4, -2, 0] }}
        transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Kıvılcımlar */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ left: 5 + i * 2, top: 4, width: 1.3, height: 1.3, background: "#ffd36b", boxShadow: "0 0 2px #ffb020" }}
          animate={{ y: [0, -10], x: [0, i === 1 ? -2 : 2], opacity: [0, 1, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.37, ease: "easeOut" }}
        />
      ))}
    </motion.div>
  );
}

/** Yağmurda: sağ elinde şemsiye, etrafına damlalar düşer. */
function Umbrella() {
  return (
    <motion.div className="pointer-events-none absolute" style={{ left: 0, top: 0, width: 24, height: 24 }} {...pop}>
      {/* Damlalar (şemsiyenin dışında) */}
      {[-11, -6, 30, 35].map((x, i) => (
        <motion.span
          key={x}
          className="absolute rounded-full"
          style={{ left: x, top: -12, width: 1, height: 3.4, background: "rgba(150,200,255,0.85)" }}
          animate={{ y: [0, 34], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.19, ease: "linear" }}
        />
      ))}
      <motion.div
        className="absolute"
        style={{ left: 11, top: -16, width: 32, height: 34, originX: 0.5, originY: 0.82 }}
        animate={{ rotate: [-20, -16, -20] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="32" height="34" viewBox="0 0 32 34" className="absolute inset-0 overflow-visible">
          {/* Sap ve kıvrık tutamak */}
          <path d="M16 6 L16 28 Q16 31 19 31 Q21.5 31 21.5 28.6" fill="none" stroke="#3b3b44" strokeWidth="1.3" strokeLinecap="round" />
          {/* Kubbe */}
          <path d="M1 10 Q16 -7 31 10 Q27.5 7.5 24 10 Q20 7.5 16 10 Q12 7.5 8 10 Q4.5 7.5 1 10 Z" fill="#ff5c8a" />
          <path d="M16 1.6 Q12 4 8 10 Q12 7.5 16 10 Z" fill="#ff86a8" />
          <path d="M16 1.6 Q20 4 24 10 Q20 7.5 16 10 Z" fill="#e8467a" />
          <circle cx="16" cy="1.4" r="0.9" fill="#3b3b44" />
        </svg>
        <PropHand x={16} y={24} rotate={-10} />
      </motion.div>
    </motion.div>
  );
}

/** Sıcakta: sol elindeki yelpazeyle serinler, alnında ter damlası. */
function Fan() {
  return (
    <motion.div className="pointer-events-none absolute" style={{ left: 0, top: 0, width: 24, height: 24 }} {...pop}>
      {/* Ter damlası */}
      <motion.span
        className="absolute"
        style={{ left: 17.5, top: 1, width: 3.2, height: 4.4, borderRadius: "50% 50% 50% 50% / 35% 35% 65% 65%", background: "linear-gradient(180deg, #d6f0ff, #6cc0ff)" }}
        animate={{ y: [0, 0, 5], opacity: [0, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeIn", times: [0, 0.3, 1] }}
      />
      <motion.div
        className="absolute"
        style={{ left: -10, top: 6, width: 12, height: 14, originX: 0.5, originY: 1 }}
        animate={{ rotate: [28, -18, 28] }}
        transition={{ duration: 0.42, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="12" height="14" viewBox="0 0 12 14" className="absolute inset-0 overflow-visible">
          <path d="M6 13 L0.5 3 Q6 -1.5 11.5 3 Z" fill="#ffd23f" />
          {[2.2, 4.2, 6, 7.8, 9.8].map((x) => (
            <line key={x} x1="6" y1="13" x2={x} y2="1.6" stroke="#e0a800" strokeWidth="0.5" />
          ))}
        </svg>
        <PropHand x={6} y={13} />
      </motion.div>
    </motion.div>
  );
}

/** Not alırken / sohbette cevap yazarken: önünde kâğıt, sağ elinde kalemle karalar. */
function Paper() {
  return (
    <motion.div className="pointer-events-none absolute" style={{ left: 2, top: 13.5, width: 20, height: 14 }} {...pop}>
      <div
        className="absolute overflow-hidden"
        style={{ left: 1, top: 0, width: 12, height: 13, background: "#fffdf5", borderRadius: 1.5, transform: "rotate(-6deg)", boxShadow: "0 1px 2px rgba(0,0,0,0.45)" }}
      >
        {/* Satırlar sırayla yazılır, sonra baştan */}
        {[2.6, 5, 7.4, 9.8].map((y, i) => (
          <motion.span
            key={y}
            className="absolute rounded-full"
            style={{ left: 2, top: y, height: 0.9, width: i === 3 ? 5 : 8, background: "#5b6ad8", originX: 0 }}
            animate={{ scaleX: [0, 0, 1, 1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, times: [0, i * 0.18, i * 0.18 + 0.18, 0.92, 1], ease: "linear" }}
          />
        ))}
      </div>
      {/* Kâğıdı tutan sol el */}
      <PropHand x={1} y={9} rotate={25} />
      {/* Kalem + sağ el: satır boyunca karalar */}
      <motion.div
        className="absolute"
        style={{ left: 9, top: -3, width: 10, height: 12 }}
        animate={{ x: [0, 2.5, 0.5, 3, 0], y: [0, 0.6, 2.4, 3, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.span
          className="absolute"
          style={{ left: 2, top: 1, width: 2.2, height: 10, borderRadius: "1px 1px 0.4px 0.4px", background: "linear-gradient(180deg, #ff8fa8 0 16%, #ffd23f 16% 82%, #f4d3a0 82%)", transform: "rotate(28deg)", originY: 1 }}
          animate={{ rotate: [28, 20, 30, 22, 28] }}
          transition={{ duration: 0.35, repeat: Infinity }}
        />
        <PropHand x={6.5} y={5} rotate={-20} />
      </motion.div>
    </motion.div>
  );
}

/** Ararken: büyüteci sağ gözünün önünde tutar, etrafı tarar. */
function Magnifier() {
  return (
    <motion.div className="pointer-events-none absolute" style={{ left: 0, top: 0, width: 24, height: 24 }} {...pop}>
      <motion.div
        className="absolute"
        style={{ left: 9.5, top: 6, width: 18, height: 18 }}
        animate={{ x: [0, 1.4, -0.8, 0.8, 0], y: [0, -1, 0.8, 1.2, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Sap */}
        <span className="absolute rounded-full" style={{ left: 9.6, top: 9.6, width: 3, height: 8, background: "linear-gradient(90deg, #5a3a22, #8d5832)", transform: "rotate(-45deg)", transformOrigin: "50% 0" }} />
        {/* Mercek */}
        <span
          className="absolute rounded-full"
          style={{
            left: 0,
            top: 0,
            width: 12,
            height: 12,
            border: "1.6px solid #c9ccd6",
            background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55) 0%, rgba(180,220,255,0.18) 40%, rgba(150,200,255,0.12) 100%)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.5)",
          }}
        />
        <PropHand x={15.5} y={15.5} rotate={-30} />
      </motion.div>
    </motion.div>
  );
}

/** Pembe sakız balonu: büyür, büyür… patlar. */
function GumBubble() {
  const d = sec(ANTIC_MS.gum);
  return (
    <motion.span
      className="pointer-events-none absolute rounded-full"
      style={{
        left: 12,
        top: 19.4,
        width: 10,
        height: 10,
        marginLeft: -5,
        marginTop: -5,
        background: "radial-gradient(circle at 35% 30%, #ffd1e0 0%, #ff8fb3 45%, #ff5c8a 100%)",
        boxShadow: "inset 0 0 0 0.4px rgba(255,255,255,0.5)",
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 0.4, 0.3, 0.9, 1.25, 0], opacity: [0, 1, 1, 1, 1, 0] }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: d, times: [0, 0.2, 0.32, 0.65, 0.88, 0.92], ease: "easeInOut" }}
    />
  );
}

/** Hapşırınca ağzından fışkıran minik bulutçuklar. */
function SneezePuff() {
  const d = sec(ANTIC_MS.sneeze);
  return (
    <motion.div className="pointer-events-none absolute" style={{ left: 12, top: 19 }} initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {[
        [-7, 3],
        [0, 6],
        [7, 3],
      ].map(([x, y], i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white/80"
          style={{ width: 3.4, height: 3.4, marginLeft: -1.7, marginTop: -1.7 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ x: [0, 0, x, x * 1.3], y: [0, 0, y, y * 1.3], scale: [0, 0, 1.2, 1.4], opacity: [0, 0, 1, 0] }}
          transition={{ duration: d * 0.6, delay: d * 0.5, times: [0, 0.1, 0.7, 1], ease: "easeOut" }}
        />
      ))}
    </motion.div>
  );
}

/** Pomodoro: önünde masa, üstünde dizüstü (kapağının arkası bize dönük) ve dumanı tüten kupa */
function Desk() {
  return (
    <motion.div className="pointer-events-none absolute" style={{ left: -8, top: 13, width: 40, height: 16 }} {...pop}>
      {/* Ekranın yüze vuran ışığı */}
      <motion.span
        className="absolute rounded-full"
        style={{ left: 12, top: -8, width: 16, height: 11, background: "radial-gradient(circle, rgba(140,200,255,0.35) 0%, transparent 70%)" }}
        animate={{ opacity: [0.6, 1, 0.7, 0.9, 0.6] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      />
      {/* Dizüstünün kapağı */}
      <span
        className="absolute"
        style={{ left: 13, top: 3, width: 14, height: 5.6, borderRadius: "1.6px 1.6px 0.6px 0.6px", background: "linear-gradient(180deg, #d9dbe2 0%, #a9adb8 100%)", boxShadow: "0 1px 1.5px rgba(0,0,0,0.5)" }}
      >
        <span className="absolute rounded-full" style={{ left: 5.9, top: 1.7, width: 2.2, height: 2.2, background: "radial-gradient(circle, #ffffff 0%, #9fd0ff 70%)", boxShadow: "0 0 2px #9fd0ff" }} />
      </span>
      {/* Masanın üstü ve önü */}
      <span className="absolute" style={{ left: 0, top: 8.6, width: 40, height: 2.2, borderRadius: 1.1, background: "linear-gradient(180deg, #c98f5c, #9b6438)" }} />
      <span className="absolute" style={{ left: 2, top: 10.6, width: 36, height: 4.6, borderRadius: "0 0 1.4px 1.4px", background: "linear-gradient(180deg, #7d4e2b, #5e391e)" }} />
      {/* Kupa ve buharı */}
      <span className="absolute" style={{ left: 3.6, top: 4.4, width: 4.2, height: 4.4, borderRadius: "0.6px 0.6px 1.4px 1.4px", background: "linear-gradient(180deg, #ff6b5e, #d9443a)" }} />
      <span className="absolute" style={{ left: 7.3, top: 5.2, width: 1.9, height: 2.4, borderRadius: "0 1.2px 1.2px 0", border: "0.7px solid #d9443a", borderLeft: "none" }} />
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ left: 4.6 + i * 1.6, top: 2.6, width: 1, height: 2.6, background: "rgba(255,255,255,0.5)" }}
          animate={{ y: [0, -4], opacity: [0, 0.8, 0], scaleY: [0.6, 1.2] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.9, ease: "easeOut" }}
        />
      ))}
    </motion.div>
  );
}

/** Odak bekçisi: sol elinde çalar saat, sağ eliyle cama (ekrana) "tok tok" vurur */
function Knock() {
  const d = 1.6;
  const hits = [0.2, 0.4];
  return (
    <motion.div className="pointer-events-none absolute" style={{ left: 0, top: 0, width: 24, height: 24 }} {...pop}>
      {/* Çalar saat: zilleri ve dönen yelkovanı */}
      <motion.div
        className="absolute"
        style={{ left: -12, top: 5, width: 11, height: 12 }}
        animate={{ rotate: [0, -8, 8, -8, 8, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.1 }}
      >
        <span className="absolute rounded-full" style={{ left: 0.2, top: 0, width: 3.6, height: 3.6, background: "#ffd23f", boxShadow: "inset 0 -0.6px 0 #c99a00" }} />
        <span className="absolute rounded-full" style={{ left: 7.2, top: 0, width: 3.6, height: 3.6, background: "#ffd23f", boxShadow: "inset 0 -0.6px 0 #c99a00" }} />
        <span className="absolute rounded-full" style={{ left: 0.5, top: 1.6, width: 10, height: 10, background: "radial-gradient(circle at 40% 35%, #ff7a6e 0%, #e0453a 70%, #b02e25 100%)" }} />
        <span className="absolute rounded-full" style={{ left: 2, top: 3.1, width: 7, height: 7, background: "#fffaf0" }} />
        <motion.span
          className="absolute"
          style={{ left: 5.15, top: 3.9, width: 0.7, height: 2.7, background: "#2a2a30", originY: 1, borderRadius: 0.4 }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <span className="absolute rounded-full" style={{ left: 4.95, top: 6.05, width: 1.1, height: 1.1, background: "#2a2a30" }} />
        <PropHand x={5.5} y={11.6} rotate={10} />
      </motion.div>
      {/* Vuruşların camdaki izi */}
      {hits.map((t, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border"
          style={{ left: 22, top: 4, width: 10, height: 10, borderColor: "rgba(200,225,255,0.9)", borderWidth: 0.7 }}
          animate={{ scale: [0.2, 0.2, 1.6], opacity: [0, 0.9, 0] }}
          transition={{ duration: d, repeat: Infinity, times: [0, t, Math.min(1, t + 0.25)], ease: "easeOut" }}
        />
      ))}
      {/* Vuran el: her vuruşta öne (bize) gelip büyür */}
      <motion.div
        className="absolute"
        style={{ left: 27, top: 9, width: 0, height: 0 }}
        animate={{ scale: [1, 1, 1.9, 1.2, 1.9, 1, 1], x: [0, 0, -1.5, 0, -1.5, 0, 0], y: [0, 0, -1, 0, -1, 0, 0] }}
        transition={{ duration: d, repeat: Infinity, times: [0, 0.1, 0.2, 0.3, 0.4, 0.55, 1], ease: "easeInOut" }}
      >
        <PropHand x={0} y={0} rotate={-30} />
      </motion.div>
    </motion.div>
  );
}
