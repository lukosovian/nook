import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Trophy } from "lucide-react";
import { playAntic } from "../../hooks/useAntics";
import { spring } from "../../lib/motion";
import { useNook } from "../../store/nook";
import { ek, useNookName } from "../../lib/look";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { Header, Over } from "./games/kit";
import { Aim, Jump, Pairs, Whack } from "./games/MoreGames";
import { tt } from "../../lib/i18n";

type Game = "catch" | "simon" | "whack" | "pairs" | "jump" | "aim";

const GAMES: { id: Game; title: string; hint: string; color: string }[] = [
  { id: "catch", title: tt("Yakala"), hint: tt("20 sn'de kaçan Nook'u yakala"), color: ACCENT.pink },
  { id: "simon", title: tt("Hafıza"), hint: tt("Yanma sırasını aklında tut, tekrarla"), color: ACCENT.blue },
  { id: "whack", title: tt("Köstebek"), hint: tt("Çıkanlara dokun, kırmızıdan kaç"), color: ACCENT.orange },
  { id: "pairs", title: tt("Eşleştir"), hint: tt("Kartları çevir, aynı Nook'ları bul"), color: ACCENT.purple },
  { id: "jump", title: tt("Zıpla"), hint: tt("Engellerin üstünden atla"), color: ACCENT.green },
  { id: "aim", title: tt("Nişan"), hint: tt("Hedefleri küçülmeden vur, nişanını kas"), color: ACCENT.red },
];

/** Nook'la oyun: altı mini oyun ve rekorlar. */
export function PlayPanel() {
  const [game, setGame] = useState<Game | null>(null);
  const scores = useNook((s) => s.scores);
  const name = useNookName();

  if (game === "catch") return <Catch onBack={() => setGame(null)} />;
  if (game === "simon") return <Simon onBack={() => setGame(null)} />;
  if (game === "whack") return <Whack onBack={() => setGame(null)} />;
  if (game === "pairs") return <Pairs onBack={() => setGame(null)} />;
  if (game === "jump") return <Jump onBack={() => setGame(null)} />;
  if (game === "aim") return <Aim onBack={() => setGame(null)} />;

  return (
    <div className="flex h-full flex-col gap-2">
      <p className="text-[10.5px] text-label-3">{tt("Birlikte oynayınca {0} keyfi yerine gelir", ek(name, "un"))}</p>
      <div className="-mr-1.5 grid min-h-0 flex-1 auto-rows-[minmax(92px,1fr)] grid-cols-3 gap-2 overflow-y-auto pr-1.5">
        {GAMES.map((g) => (
          <motion.button
            key={g.id}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={spring.pop}
            onClick={() => setGame(g.id)}
            className="flex flex-col items-start justify-between rounded-[16px] border p-2.5 text-left"
            style={{ background: tintBg(g.color, 10), borderColor: tintBg(g.color, 30) }}
          >
            <div className="flex w-full items-center justify-between">
              <MiniNook color={g.color} size={26} eyes={g.id === "catch" ? "side" : g.id === "pairs" ? "happy" : "open"} />
              {!!scores[g.id] && (
                <span className="flex items-center gap-1 text-[10.5px] font-medium tabular-nums" style={{ color: tintText(g.color) }}>
                  <Trophy size={10} strokeWidth={2.6} />
                  {scores[g.id]}
                </span>
              )}
            </div>
            <div>
              <p className="text-[13px] font-medium" style={{ color: tintText(g.color) }}>
                {g.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-label-3">{g.hint}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
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
        title={tt("Yakala")}
        right={
          <>
            <span style={{ color: tintText(ACCENT.pink) }}>{score}</span>
            <span className="text-label-3">{(left / 1000).toFixed(1)}{" "}{tt("sn")}</span>
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
            <p className="text-[11px] text-label-3">{tt("Rekor:")}{" "}{best}</p>
            <button
              onClick={start}
              className="rounded-full border px-4 py-1.5 text-[12.5px] font-medium"
              style={{ background: tintBg(ACCENT.pink, 18), borderColor: tintBg(ACCENT.pink, 45), color: tintText(ACCENT.pink) }}
            >{tt("Başla")}</button>
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
        title={tt("Hafıza")}
        right={
          <>
            <span style={{ color: tintText(ACCENT.blue) }}>{tt("Seviye")}{" "}{level}</span>
            <span className="text-label-3">{phase === "show" ? tt("İzle…") : phase === "input" ? tt("Sıra sende") : `Rekor ${best}`}</span>
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
              >{tt("Başla")}</button>
            </motion.div>
          )}
        </AnimatePresence>
        {phase === "over" && <Over score={seq.length - 1} best={best} onAgain={start} color={ACCENT.blue} />}
      </div>
    </div>
  );
}
