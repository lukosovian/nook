import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { normalizeColor, normalizeLook } from "../../lib/look";
import { MOVE_KINDS, moveTarget, pickMove, type MoveKind } from "../../lib/moveFx";
import { useNook } from "../../store/nook";
import { NookFigure } from "../mascot/Figure";
import { MoveFx } from "../overlays/MoveFx";
import { birthMotion, INTRO_KINDS, introDuration, IntroEffect, randomIntro, type IntroKind } from "../overlays/Intro";

/** Ayarlardaki önizleme sahneleri: efekt gerçek adayla aynı bileşenlerle, küçük bir ekranda oynar. */

const REST = { x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rotate: 0, skewX: 0, opacity: 1, filter: "none" };

function useFace() {
  const s = useNook((st) => st.settings);
  return { look: normalizeLook(s.look), color: normalizeColor(s.faceColor) };
}

/** Ekranın üst kenarı: adalar buna yapışık durur */
function Screen({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[10px] border border-white/[0.06] ${className}`} style={{ background: "radial-gradient(120% 90% at 50% 0%, #1c2030 0%, #101116 70%)" }}>
      {children}
    </div>
  );
}

function Caption({ label }: { label: string }) {
  return <div className="mt-1 text-center text-[10px] text-label-3">{label}</div>;
}

/** Açılış: ada büyür, efekt toplanır, Nook doğar */
export function IntroPreview({ style, run }: { style: "random" | IntroKind; run: number }) {
  const face = useFace();
  const [kind, setKind] = useState<IntroKind>(() => (style === "random" ? randomIntro() : style));
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    setKind((prev) => (style === "random" ? randomIntro(prev) : style));
    setPlaying(true);
  }, [style, run]);

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => setPlaying(false), introDuration(kind) + 400);
    return () => window.clearTimeout(t);
  }, [playing, kind, run]);

  return (
    <div className="pb-1">
      <Screen className="h-[96px]">
        <motion.div
          key={`${kind}-${run}`}
          className="absolute left-1/2 top-0 overflow-hidden bg-black"
          style={{ width: 220, height: 74, marginLeft: -110, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, originY: 0 }}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
        >
          {playing && (
            <div className="pointer-events-none absolute inset-0">
              <IntroEffect kind={kind} />
            </div>
          )}
          <div className="absolute left-1/2 top-1/2" style={{ marginLeft: -20, marginTop: -20 }}>
            <motion.div {...birthMotion(kind)}>
              <NookFigure look={face.look} color={face.color} size={40} />
            </motion.div>
          </div>
        </motion.div>
      </Screen>
      <Caption label={INTRO_KINDS.find((k) => k.id === kind)?.label ?? ""} />
    </div>
  );
}

type Step = { kind: MoveKind; side: 0 | 1; phase: "out" | "in" | null };

/** Ekranlar arası geçiş: ada bir ekranda kaybolur, ötekinde belirir (sırayla sağa, sola) */
export function MovePreview({ style, run }: { style: "random" | MoveKind; run: number }) {
  const face = useFace();
  const [step, setStep] = useState<Step>({ kind: style === "random" ? "beam" : style, side: 0, phase: null });
  const side = useRef<0 | 1>(0);

  useEffect(() => {
    const kind = pickMove(style);
    const from = side.current;
    const to = from === 0 ? 1 : 0;
    setStep({ kind, side: from, phase: "out" });
    // Rust'taki gibi: kaybolma bitince pencere taşınır, yeni ekranda belirir
    const t1 = window.setTimeout(() => {
      side.current = to;
      setStep({ kind, side: to, phase: "in" });
    }, 470);
    const t2 = window.setTimeout(() => setStep((s) => ({ ...s, phase: null })), 470 + 850);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [style, run]);

  // Sol ekrandan sağa giderken yön 1, dönüşte -1
  const dir: 1 | -1 = step.phase === "out" ? (step.side === 0 ? 1 : -1) : step.side === 1 ? 1 : -1;
  const move = step.phase ? { kind: step.kind, dir, phase: step.phase } : null;

  return (
    <div className="pb-1">
      <div className="grid grid-cols-2 gap-2">
        {([0, 1] as const).map((n) => (
          <Screen key={n} className="h-[64px]">
            {step.side === n && (
              // Ada gerçek boyutunun %70'i; efekt katmanı adayla birlikte ölçeklenir
              <div className="absolute left-1/2 top-0" style={{ transform: "scale(0.7)", transformOrigin: "50% 0" }}>
                {move && <MoveFx key={`${move.kind}-${move.phase}-${run}`} move={move} />}
                <motion.div style={{ originY: 0 }} initial={false} animate={move ? moveTarget(move) : REST}>
                  <div className="flex items-center justify-center bg-black" style={{ width: 128, height: 34, marginLeft: -64, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }}>
                    <NookFigure look={face.look} color={face.color} size={20} />
                  </div>
                </motion.div>
              </div>
            )}
          </Screen>
        ))}
      </div>
      <Caption label={MOVE_KINDS.find((k) => k.id === step.kind)?.label ?? ""} />
    </div>
  );
}
