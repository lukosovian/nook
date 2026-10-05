/**
 * Yeni mini oyunlar: Köstebek (delikten çıkan Nook'lara dokun), Eşleştir (aynı Nook'ları bul),
 * Zıpla (engellerin üstünden atla). Skorlar Yakala ve Hafıza gibi rekor olarak saklanır.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { playAntic } from "../../../hooks/useAntics";
import { DEFAULT_LOOK, HALLOWEEN, normalizeColor, normalizeLook, type Look } from "../../../lib/look";
import { spring } from "../../../lib/motion";
import { useNook } from "../../../store/nook";
import { NookFigure } from "../../mascot/Figure";
import { ACCENT, MiniNook, tintBg, tintText } from "../../ui/primitives";
import { Header, Over, StartButton } from "./kit";

/** Oyun bitti: rekor, keyif, Nook'un tepkisi */
function finish(game: string, score: number, good: number) {
  const s = useNook.getState();
  s.setScore(game, score);
  s.care(Math.min(6, 1 + Math.floor(score / Math.max(1, good / 3))));
  playAntic(score >= good ? "love" : "giggle");
}

// ------------------------------------------------------------------ Köstebek

const WHACK_MS = 30_000;
const HOLES = 9;

/** 3×3 delik: Nook'lar kısa süre başını çıkarır. Kırmızı kızgın Nook'a dokunmak −2. */
export function Whack({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<"ready" | "play" | "over">("ready");
  const [up, setUp] = useState<Record<number, "nook" | "angry">>({});
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(WHACK_MS);
  const [hit, setHit] = useState<number | null>(null);
  const best = useNook((s) => s.scores.whack ?? 0);
  const scoreRef = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  useEffect(() => {
    if (phase !== "play") return;
    const end = Date.now() + WHACK_MS;
    let alive = true;
    const pop = () => {
      if (!alive) return;
      const elapsed = WHACK_MS - (end - Date.now());
      // Zamanla hızlanır: önce 900 ms görünür, sonda 450 ms
      const stay = Math.max(450, 900 - elapsed / 60);
      setUp((u) => {
        const free = [...Array(HOLES).keys()].filter((i) => !u[i]);
        if (!free.length) return u;
        const i = free[Math.floor(Math.random() * free.length)];
        timers.current.push(window.setTimeout(() => setUp((x) => (x[i] ? Object.fromEntries(Object.entries(x).filter(([k]) => Number(k) !== i)) : x)), stay));
        return { ...u, [i]: Math.random() < 0.18 ? "angry" : "nook" };
      });
      timers.current.push(window.setTimeout(pop, Math.max(280, 650 - elapsed / 80)));
    };
    pop();
    const tick = window.setInterval(() => {
      const l = end - Date.now();
      setLeft(Math.max(0, l));
      if (l <= 0) {
        window.clearInterval(tick);
        alive = false;
        setUp({});
        setPhase("over");
        finish("whack", scoreRef.current, 25);
      }
    }, 100);
    return () => {
      alive = false;
      window.clearInterval(tick);
    };
  }, [phase]);

  const start = () => {
    scoreRef.current = 0;
    setScore(0);
    setLeft(WHACK_MS);
    setUp({});
    setPhase("play");
  };

  const whack = (i: number) => {
    const kind = up[i];
    if (phase !== "play" || !kind) return;
    scoreRef.current = Math.max(0, scoreRef.current + (kind === "angry" ? -2 : 1));
    setScore(scoreRef.current);
    setHit(i);
    timers.current.push(window.setTimeout(() => setHit((h) => (h === i ? null : h)), 220));
    setUp((u) => Object.fromEntries(Object.entries(u).filter(([k]) => Number(k) !== i)));
    if (kind === "angry") playAntic("dizzy");
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <Header
        onBack={onBack}
        title="Köstebek"
        right={
          <>
            <span style={{ color: tintText(ACCENT.orange) }}>{score}</span>
            <span className="text-label-3">{(left / 1000).toFixed(1)} sn</span>
          </>
        }
      />
      <div className="relative min-h-0 flex-1">
        <div className={`grid h-full grid-cols-3 gap-1.5 transition-opacity ${phase === "play" ? "" : "opacity-20"}`}>
          {[...Array(HOLES).keys()].map((i) => (
            <button
              key={i}
              onPointerDown={() => whack(i)}
              className="relative flex items-end justify-center overflow-hidden rounded-[14px] bg-well"
              style={hit === i ? { background: tintBg(ACCENT.orange, 22) } : undefined}
            >
              {/* Delik */}
              <span className="absolute bottom-1.5 h-[9px] w-[46%] rounded-[50%] bg-black/70" />
              <AnimatePresence>
                {up[i] && (
                  <motion.span
                    key="n"
                    className="relative mb-1.5"
                    initial={{ y: 34 }}
                    animate={{ y: 0 }}
                    exit={{ y: 34 }}
                    transition={{ type: "spring", stiffness: 520, damping: 26 }}
                  >
                    <MiniNook color={up[i] === "angry" ? ACCENT.red : ACCENT.orange} size={26} eyes={up[i] === "angry" ? "closed" : "open"} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          ))}
        </div>
        {phase === "ready" && (
          <>
            <StartButton onClick={start} color={ACCENT.orange} best={best} />
            <p className="absolute inset-x-0 bottom-1 text-center text-[10px] text-label-3">Turuncular +1 · kırmızı kızgın Nook −2</p>
          </>
        )}
        {phase === "over" && <Over score={score} best={best} onAgain={start} color={ACCENT.orange} />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Eşleştir

const PAIR_LOOKS: { look: Look; color: string }[] = [
  ...HALLOWEEN.slice(0, 4).map((h) => ({ look: h.look, color: h.color })),
  { look: { ...DEFAULT_LOOK, shape: "cloud", texture: "plush", head: "beret" }, color: "#2B8CFF" },
  { look: { ...DEFAULT_LOOK, shape: "heart", glasses: "shades" }, color: "#FF5C8A" },
];

/** 12 kart, 6 çift. Az hamlede bitirmek çok puan: 60 − 3 × fazla hamle. */
export function Pairs({ onBack }: { onBack: () => void }) {
  const [deck, setDeck] = useState<number[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [phase, setPhase] = useState<"ready" | "play" | "over">("ready");
  const [score, setScore] = useState(0);
  const best = useNook((s) => s.scores.pairs ?? 0);
  const lock = useRef(false);

  const start = () => {
    const d = [...PAIR_LOOKS.keys(), ...PAIR_LOOKS.keys()].sort(() => Math.random() - 0.5);
    setDeck(d);
    setOpen([]);
    setDone(new Set());
    setMoves(0);
    lock.current = false;
    setPhase("play");
  };

  const flip = (i: number) => {
    if (phase !== "play" || lock.current || open.includes(i) || done.has(i)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;
    const m = moves + 1;
    setMoves(m);
    const [a, b] = next;
    if (deck[a] === deck[b]) {
      const d = new Set(done).add(a).add(b);
      setDone(d);
      setOpen([]);
      if (d.size === deck.length) {
        const sc = Math.max(5, 60 - 3 * (m - PAIR_LOOKS.length));
        setScore(sc);
        setPhase("over");
        finish("pairs", sc, 45);
      } else if (d.size % 4 === 0) playAntic("hop");
    } else {
      lock.current = true;
      window.setTimeout(() => {
        setOpen([]);
        lock.current = false;
      }, 750);
    }
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <Header
        onBack={onBack}
        title="Eşleştir"
        right={
          <>
            <span style={{ color: tintText(ACCENT.purple) }}>{done.size / 2} / {PAIR_LOOKS.length}</span>
            <span className="text-label-3">{moves} hamle</span>
          </>
        }
      />
      <div className="relative min-h-0 flex-1">
        <div className={`grid h-full grid-cols-6 grid-rows-2 gap-1.5 transition-opacity ${phase === "play" ? "" : "opacity-20"}`}>
          {(deck.length ? deck : [...Array(12).fill(0)]).map((k, i) => {
            const shown = open.includes(i) || done.has(i);
            const f = PAIR_LOOKS[k];
            return (
              <motion.button
                key={i}
                onClick={() => flip(i)}
                animate={{ rotateY: shown ? 180 : 0 }}
                transition={spring.pop}
                className="relative rounded-[12px] border"
                style={{
                  transformStyle: "preserve-3d",
                  background: shown ? tintBg(ACCENT.purple, done.has(i) ? 22 : 12) : "var(--color-well)",
                  borderColor: tintBg(ACCENT.purple, shown ? 40 : 14),
                }}
              >
                <span className="absolute inset-0 flex items-center justify-center" style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}>
                  {deck.length > 0 && <NookFigure look={f.look} color={f.color} size={28} />}
                </span>
                <span className="absolute inset-0 flex items-center justify-center text-[15px] font-semibold text-label-3" style={{ backfaceVisibility: "hidden" }}>
                  ?
                </span>
              </motion.button>
            );
          })}
        </div>
        {phase === "ready" && <StartButton onClick={start} color={ACCENT.purple} best={best} />}
        {phase === "over" && <Over score={score} best={best} onAgain={start} color={ACCENT.purple} />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Zıpla

const GROUND = 18;
const SIZE = 26;
const GRAVITY = 1500; // px/sn²
const JUMP = 470; // px/sn

/** Nook koşar, engeller gelir; tıkla ya da boşluğa bas, zıpla. Her geçilen engel bir puan. */
export function Jump({ onBack }: { onBack: () => void }) {
  const arena = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"ready" | "play" | "over">("ready");
  const [score, setScore] = useState(0);
  const [, render] = useState(0);
  const best = useNook((s) => s.scores.jump ?? 0);
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  const world = useRef({ y: 0, vy: 0, obstacles: [] as { x: number; h: number; passed: boolean }[], speed: 190, next: 0.9, score: 0 });

  const jump = () => {
    if (phase !== "play") return;
    const w = world.current;
    if (w.y <= 0.5) w.vy = JUMP;
  };

  useEffect(() => {
    if (phase !== "play") return;
    const key = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", key);
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const w = world.current;
      const width = arena.current?.clientWidth ?? 380;
      w.vy -= GRAVITY * dt;
      w.y = Math.max(0, w.y + w.vy * dt);
      if (w.y === 0 && w.vy < 0) w.vy = 0;
      w.speed = 190 + w.score * 7;
      w.next -= dt;
      if (w.next <= 0) {
        w.obstacles.push({ x: width + 10, h: 14 + Math.random() * 18, passed: false });
        w.next = 0.75 + Math.random() * 0.9 - Math.min(0.35, w.score * 0.01);
      }
      const nookX = 40;
      for (const o of w.obstacles) {
        o.x -= w.speed * dt;
        // Çarpışma: Nook'un kutusu engelin kutusuyla kesişti mi (biraz bağışlayıcı)
        if (o.x < nookX + SIZE - 5 && o.x + 14 > nookX + 5 && w.y < o.h - 3) {
          setPhase("over");
          setScore(w.score);
          finish("jump", w.score, 15);
          return;
        }
        if (!o.passed && o.x + 14 < nookX) {
          o.passed = true;
          w.score += 1;
          setScore(w.score);
          if (w.score % 10 === 0) playAntic("hop");
        }
      }
      w.obstacles = w.obstacles.filter((o) => o.x > -20);
      render((n) => n + 1);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", key);
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    world.current = { y: 0, vy: 0, obstacles: [], speed: 190, next: 0.9, score: 0 };
    setScore(0);
    setPhase("play");
  };

  const w = world.current;
  return (
    <div className="flex h-full flex-col gap-2">
      <Header
        onBack={onBack}
        title="Zıpla"
        right={
          <>
            <span style={{ color: tintText(ACCENT.green) }}>{score}</span>
            <span className="text-label-3">Boşluk ya da tıkla</span>
          </>
        }
      />
      <div ref={arena} onPointerDown={jump} className="relative min-h-0 flex-1 cursor-pointer overflow-hidden rounded-[14px] bg-well">
        {/* Zemin */}
        <div className="absolute inset-x-0 bottom-0" style={{ height: GROUND, background: tintBg(ACCENT.green, 14), borderTop: `1px solid ${tintBg(ACCENT.green, 40)}` }} />
        {/* Nook */}
        <div className="absolute" style={{ left: 40, bottom: GROUND + w.y, width: SIZE, height: SIZE, transform: `rotate(${phase === "play" && w.y > 0 ? -w.vy / 40 : 0}deg)` }}>
          <NookFigure look={look} color={color} size={SIZE} expression={phase === "over" ? "dizzy" : "idle"} />
        </div>
        {/* Engeller: dikenli küçük kayalar */}
        {w.obstacles.map((o, i) => (
          <div key={i} className="absolute rounded-t-[6px]" style={{ left: o.x, bottom: GROUND, width: 14, height: o.h, background: tintBg(ACCENT.red, 70), boxShadow: `0 0 8px -2px ${ACCENT.red}` }} />
        ))}
        {phase === "ready" && <StartButton onClick={start} color={ACCENT.green} best={best} />}
        {phase === "over" && <Over score={score} best={best} onAgain={start} color={ACCENT.green} />}
      </div>
    </div>
  );
}
