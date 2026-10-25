/** Studio › Görünüm: solda sahnede canlı Nook (her değişiklikte sevinip zıplar), sağda sekmeli seçenekler */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { Shirt } from "lucide-react";
import { normalizeColor, normalizeLook, useNookName } from "../../lib/look";
import { useNook, type Expression } from "../../store/nook";
import { NookFigure } from "../../components/mascot/Figure";
import { LookBig, LookPanel } from "../../components/panels/LookPanel";
import { ACCENT, tintBg, tintText } from "../../components/ui/primitives";
import { tt } from "../../lib/i18n";
import { NavIcon } from "../ui";

const FACES: { e: Expression; label: string }[] = [
  { e: "happy", label: tt("Mutlu") },
  { e: "idle", label: tt("Sakin") },
  { e: "wink", label: tt("Göz kırpıyor") },
  { e: "love", label: tt("Âşık") },
  { e: "surprised", label: tt("Şaşkın") },
  { e: "sleepy", label: tt("Uykulu") },
];

export function LookPage() {
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  const name = useNookName();
  const [face, setFace] = useState(0);
  // Önizleme ifadeden ifadeye geçer: gözler ve aksesuarlar her hâlde görülsün
  useEffect(() => {
    const t = window.setInterval(() => setFace((f) => (f + 1) % FACES.length), 2600);
    return () => window.clearInterval(t);
  }, []);

  // Bir şey değişince Nook sevinip zıplar, etrafında pırıltı
  const sig = JSON.stringify(look) + color;
  const first = useRef(true);
  const hop = useAnimationControls();
  const [joy, setJoy] = useState(0);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    setJoy((j) => j + 1);
    void hop.start({ y: [0, -26, 0, -6, 0], scaleX: [1, 0.92, 1.1, 0.97, 1], scaleY: [1, 1.08, 0.9, 1.03, 1], rotate: [0, -4, 3, 0, 0], transition: { duration: 0.7, ease: "easeOut" } });
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  const [cheer, setCheer] = useState(false);
  useEffect(() => {
    if (!joy) return;
    setCheer(true);
    const t = window.setTimeout(() => setCheer(false), 1300);
    return () => window.clearTimeout(t);
  }, [joy]);
  const expr = cheer ? "happy" : FACES[face].e;

  return (
    <div className="flex h-full">
      <div className="flex w-[270px] shrink-0 flex-col items-center justify-center border-r border-white/[0.05] px-5 xl:w-[380px] xl:px-8">
        <div className="relative flex h-[290px] w-full items-center justify-center overflow-hidden rounded-[28px] border xl:h-[360px]" style={{ background: `radial-gradient(circle at 50% 38%, ${tintBg(color, 28)}, transparent 68%), rgb(255 255 255 / 0.02)`, borderColor: tintBg(color, 22) }}>
          {/* Sahne: altta yumuşak ışık halkası */}
          <span className="absolute bottom-7 left-1/2 h-10 w-56 -translate-x-1/2 rounded-[50%]" style={{ background: `radial-gradient(ellipse, ${tintBg(color, 30)}, transparent 70%)` }} />
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
            <motion.div animate={hop} style={{ originY: 1 }}>
              <NookFigure look={look} color={color} size={200} expression={expr} alive res={512} />
            </motion.div>
          </motion.div>
          <motion.span className="absolute bottom-10 left-1/2 h-5 w-36 -translate-x-1/2 rounded-[50%] bg-black/55 blur-md" animate={{ scaleX: [1, 0.85, 1] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }} />
          <Sparkles k={joy} color={color} />
          <AnimatePresence mode="wait">
            <motion.span
              key={cheer ? "cheer" : face}
              className="absolute left-4 top-4 rounded-full px-2.5 py-[3px] text-[11px] font-semibold"
              style={{ background: tintBg(color, 22), color: tintText(color) }}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
            >
              {cheer ? tt("Bayıldım!") : FACES[face].label}
            </motion.span>
          </AnimatePresence>
        </div>
        <p className="mt-4 text-[24px] font-extrabold tracking-tight text-label xl:mt-5 xl:text-[26px]">{name}</p>
        <p className="mt-1 text-center text-[12px] leading-relaxed text-label-3 xl:text-[12.5px]">{tt("Seçtiğin her şey adada, telefonda ve kalkanda da görünür")}</p>
      </div>
      <div className="flex min-w-0 flex-1 flex-col px-5 pb-4 pt-6 xl:px-8 xl:pt-7">
        <div className="mb-5 flex items-center gap-4">
          <NavIcon icon={Shirt} color={ACCENT.pink} on size={48} />
          <div>
            <h1 className="text-[25px] font-extrabold leading-tight tracking-[-0.02em] text-label">{tt("Görünüm")}</h1>
            <p className="text-[13px] text-label-3">{tt("Hazır koleksiyondan seç ya da parça parça giydir")}</p>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <LookBig.Provider value>
            <LookPanel />
          </LookBig.Provider>
        </div>
      </div>
    </div>
  );
}

/** Değişiklikte Nook'un çevresine saçılan pırıltılar */
function Sparkles({ k, color }: { k: number; color: string }) {
  if (!k) return null;
  return (
    <div key={k} className="pointer-events-none absolute inset-0">
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const r = 120 + (i % 3) * 14;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-[46%] h-2 w-2 rounded-full"
            style={{ background: i % 2 ? color : ACCENT.yellow, boxShadow: `0 0 8px ${i % 2 ? color : ACCENT.yellow}` }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.8, scale: [0, 1.3, 0], opacity: [1, 1, 0] }}
            transition={{ duration: 0.75, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}
