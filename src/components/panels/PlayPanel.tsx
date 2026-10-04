import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, Trophy } from "lucide-react";
import { playAntic } from "../../hooks/useAntics";
import { spring } from "../../lib/motion";
import { useNook } from "../../store/nook";
import { ek, useNookName } from "../../lib/look";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";

type Game = "catch" | "simon";

const GAMES: { id: Game; title: string; hint: string; color: string }[] = [
  { id: "catch", title: "Yakala", hint: "Kaçan Nook'a 20 saniyede kaç kez dokunabilirsin?", color: ACCENT.pink },
  { id: "simon", title: "Hafıza", hint: "Nook'ların yanma sırasını aklında tut, aynısını tekrarla", color: ACCENT.blue },
];

/** Nook'la oyun: iki mini oyun ve rekorlar. */
export function PlayPanel() {
  const [game, setGame] = useState<Game | null>(null);
  const scores = useNook((s) => s.scores);
  const name = useNookName();

  if (game === "catch") return <Catch onBack={() => setGame(null)} />;
  if (game === "simon") return <Simon onBack={() => setGame(null)} />;

  return (
    <div className="flex h-full flex-col gap-2">
      <p className="text-[10.5px] text-label-3">Birlikte oynayınca {ek(name, "un")} keyfi yerine gelir</p>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
        {GAMES.map((g) => (
          <motion.button
            key={g.id}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={spring.pop}
            onClick={() => setGame(g.id)}
            className="flex flex-col items-start justify-between rounded-[16px] border p-3 text-left"
            style={{ background: tintBg(g.color, 10), borderColor: tintBg(g.color, 30) }}
          >
            <div className="flex w-full items-center justify-between">
              <MiniNook color={g.color} size={30} eyes={g.id === "catch" ? "side" : "open"} />
              {!!scores[g.id] && (
                <span className="flex items-center gap-1 text-[10.5px] font-medium tabular-nums" style={{ color: tintText(g.color) }}>
                  <Trophy size={10} strokeWidth={2.6} />
                  {scores[g.id]}
                </span>
              )}
            </div>
            <div>
              <p className="text-[14px] font-medium" style={{ color: tintText(g.color) }}>
                {g.title}
              </p>
              <p className="mt-0.5 text-[10.5px] leading-snug text-label-3">{g.hint}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function Header({ onBack, title, right }: { onBack: () => void; title: string; right: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-between">
      <button onClick={onBack} className="flex items-center gap-0.5 rounded-full py-0.5 pl-1 pr-2 text-[11px] font-medium text-label-2 hover:bg-well-hi hover:text-label">
        <ChevronLeft size={12} strokeWidth={2.6} />
        {title}
      </button>
      <div className="flex items-center gap-3 text-[11px] font-medium tabular-nums">{right}</div>
    </div>
  );
}

function Over({ score, best, onAgain, color }: { score: number; best: number; onAgain: () => void; color: string }) {
  const record = score > 0 && score >= best;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 flex flex-col items-center justify-center gap-2">
      <MiniNook color={color} size={34} eyes={record ? "happy" : "open"} />
      <p className="text-[15px] font-medium text-label">{record ? `Yeni rekor: ${score}!` : `Skor: ${score}`}</p>
      <button
        onClick={onAgain}
        className="rounded-full border px-3.5 py-1 text-[12px] font-medium"
        style={{ background: tintBg(color, 18), borderColor: tintBg(color, 45), color: tintText(color) }}
      >
        Tekrar oyna
      </button>
    </motion.div>
  );
}

const CATCH_MS = 20_000;
const BALL = 30;

/** Yakala: Nook arenada zıplar; dokundukça hızlanır. */
function Catch({ onBack }: { onBack: () => void }) {
  const arena = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"ready" | "play" | "over">("ready");
  const [score, setScore] = useState(0);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  const [left, setLeft] = useState(CATCH_MS);
  const best = useNook((s) => s.scores.catch ?? 0);
  const scoreRef = useRef(0);

  const jump = useCallback(() => setPos({ x: Math.random(), y: Math.random() }), []);

  useEffect(() => {
    if (phase !== "play") return;
    const end = Date.now() + CATCH_MS;
    const tick = window.setInterval(() => {
      const l = end - Date.now();
      setLeft(Math.max(0, l));
      if (l <= 0) {
        window.clearInterval(tick);
        setPhase("over");
        const s = useNook.getState();
        s.setScore("catch", scoreRef.current);
        s.care(Math.min(6, 1 + Math.floor(scoreRef.current / 5)));
        playAntic(scoreRef.current >= 10 ? "love" : "giggle");
      }
    }, 100);
    return () => window.clearInterval(tick);
  }, [phase]);

  // Nook kendiliğinden kaçar; skor arttıkça daha sık
  useEffect(() => {
    if (phase !== "play") return;
    const t = window.setInterval(jump, Math.max(450, 1100 - score * 35));
    return () => window.clearInterval(t);
  }, [phase, score, jump]);

  const start = () => {
    scoreRef.current = 0;
    setScore(0);
    setLeft(CATCH_MS);
    jump();
    setPhase("play");
  };

  const hit = () => {
    if (phase !== "play") return;
    scoreRef.current += 1;
    setScore(scoreRef.current);
    jump();
    if (scoreRef.current % 5 === 0) playAntic("hop");
  };

  const w = arena.current?.clientWidth ?? 300;
  const h = arena.current?.clientHeight ?? 130;

  return (
    <div className="flex h-full flex-col gap-2">
      <Header
        onBack={onBack}
        title="Yakala"
        right={
          <>
            <span style={{ color: tintText(ACCENT.pink) }}>{score}</span>
            <span className="text-label-3">{(left / 1000).toFixed(1)} sn</span>
          </>
        }
      />
      <div ref={arena} className="relative min-h-0 flex-1 overflow-hidden rounded-[14px] bg-well">
        {phase === "play" && (
          <motion.button
            className="absolute"
            style={{ width: BALL, height: BALL }}
            animate={{ left: pos.x * (w - BALL), top: pos.y * (h - BALL) }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            whileTap={{ scale: 0.8 }}
            onPointerDown={hit}
          >
            <MiniNook color={ACCENT.pink} size={BALL} eyes="side" />
          </motion.button>
        )}
        {phase === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <p className="text-[11px] text-label-3">Rekor: {best}</p>
            <button
              onClick={start}
              className="rounded-full border px-4 py-1.5 text-[12.5px] font-medium"
              style={{ background: tintBg(ACCENT.pink, 18), borderColor: tintBg(ACCENT.pink, 45), color: tintText(ACCENT.pink) }}
            >
              Başla
            </button>
          </div>
        )}
        {phase === "over" && <Over score={score} best={best} onAgain={start} color={ACCENT.pink} />}
      </div>
    </div>
  );
}

const PADS = [ACCENT.red, ACCENT.blue, ACCENT.yellow, ACCENT.green];

/** Hafıza (Simon): dizi her turda bir uzar. */
function Simon({ onBack }: { onBack: () => void }) {
  const [seq, setSeq] = useState<number[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [phase, setPhase] = useState<"ready" | "show" | "input" | "over">("ready");
  const [step, setStep] = useState(0);
  const best = useNook((s) => s.scores.simon ?? 0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const show = (s: number[]) => {
    setPhase("show");
    const gap = Math.max(320, 620 - s.length * 25);
    s.forEach((pad, i) => {
      timers.current.push(window.setTimeout(() => setLit(pad), 450 + i * gap));
      timers.current.push(window.setTimeout(() => setLit(null), 450 + i * gap + gap * 0.6));
    });
    timers.current.push(
      window.setTimeout(() => {
        setStep(0);
        setPhase("input");
      }, 450 + s.length * gap),
    );
  };

  const start = () => {
    const s = [Math.floor(Math.random() * 4)];
    setSeq(s);
    show(s);
  };

  const press = (pad: number) => {
    if (phase !== "input") return;
    setLit(pad);
    timers.current.push(window.setTimeout(() => setLit(null), 180));
    if (seq[step] !== pad) {
      const score = seq.length - 1;
      setPhase("over");
      const st = useNook.getState();
      st.setScore("simon", score);
      st.care(Math.min(6, 1 + Math.floor(score / 2)));
      playAntic(score >= 6 ? "love" : "dizzy");
      return;
    }
    if (step + 1 === seq.length) {
      const next = [...seq, Math.floor(Math.random() * 4)];
      setSeq(next);
      if (next.length % 3 === 0) playAntic("hop");
      timers.current.push(window.setTimeout(() => show(next), 400));
    } else {
      setStep(step + 1);
    }
  };

  const level = Math.max(0, seq.length - (phase === "over" ? 1 : 0));

  return (
    <div className="flex h-full flex-col gap-2">
      <Header
        onBack={onBack}
        title="Hafıza"
        right={
          <>
            <span style={{ color: tintText(ACCENT.blue) }}>Seviye {level}</span>
            <span className="text-label-3">{phase === "show" ? "İzle…" : phase === "input" ? "Sıra sende" : `Rekor ${best}`}</span>
          </>
        }
      />
      <div className="relative min-h-0 flex-1">
        <div className={`grid h-full grid-cols-4 items-center gap-2 transition-opacity ${phase === "over" || phase === "ready" ? "opacity-20" : ""}`}>
          {PADS.map((c, i) => (
            <motion.button
              key={i}
              onPointerDown={() => press(i)}
              animate={{ scale: lit === i ? 1.12 : 1 }}
              transition={spring.pop}
              className="flex aspect-square items-center justify-center rounded-[18px] border"
              style={{
                background: tintBg(c, lit === i ? 40 : 10),
                borderColor: tintBg(c, lit === i ? 80 : 30),
                boxShadow: lit === i ? `0 0 24px -4px ${c}` : undefined,
              }}
            >
              <MiniNook color={c} size={34} eyes={lit === i ? "happy" : "open"} />
            </motion.button>
          ))}
        </div>
        <AnimatePresence>
          {phase === "ready" && (
            <motion.div exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={start}
                className="rounded-full border px-4 py-1.5 text-[12.5px] font-medium"
                style={{ background: tintBg(ACCENT.blue, 18), borderColor: tintBg(ACCENT.blue, 45), color: tintText(ACCENT.blue) }}
              >
                Başla
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {phase === "over" && <Over score={seq.length - 1} best={best} onAgain={start} color={ACCENT.blue} />}
      </div>
    </div>
  );
}
