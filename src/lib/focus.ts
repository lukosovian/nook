/**
 * Odak (Pomodoro): çalışma → kısa mola, her 4 turda bir uzun mola. Fazlar kendiliğinden
 * birbirine geçer; bitişte Nook kısa bir ses ve kartla haber verir.
 */
import { playAntic } from "../hooks/useAntics";
import { alarmRing } from "./bridge";
import { useNook, type FocusPhase } from "../store/nook";

export const PHASE_LABEL: Record<FocusPhase, string> = { work: "Odak", break: "Kısa mola", long: "Uzun mola" };
const LONG_EVERY = 4;

const minutes = (phase: FocusPhase) => {
  const s = useNook.getState().settings;
  return phase === "work" ? s.focusWork : phase === "break" ? s.focusBreak : s.focusLong;
};

/** Şu an kalan süre (ms) */
export function remaining(f: { endsAt: number | null; left: number }, now = Date.now()) {
  return f.endsAt === null ? f.left : Math.max(0, f.endsAt - now);
}

export function startFocus(phase: FocusPhase = "work", round = useNook.getState().focus?.round ?? 0, mins = minutes(phase)) {
  const total = Math.max(1, mins) * 60_000;
  useNook.getState().setFocus({ phase, endsAt: Date.now() + total, left: total, total, round });
}

export function pauseFocus() {
  const f = useNook.getState().focus;
  if (!f || f.endsAt === null) return;
  useNook.getState().setFocus({ ...f, endsAt: null, left: remaining(f) });
}

export function resumeFocus() {
  const f = useNook.getState().focus;
  if (!f || f.endsAt !== null) return;
  useNook.getState().setFocus({ ...f, endsAt: Date.now() + f.left });
}

export function stopFocus() {
  useNook.getState().setFocus(null);
}

/** Fazı bitir ve sıradakine geç (süre dolunca ya da "Atla" ile). */
export function nextPhase(announce = true) {
  const s = useNook.getState();
  const f = s.focus;
  if (!f) return;
  if (f.phase === "work") {
    const round = f.round + 1;
    // Atlanan çalışma sayılmaz; yalnızca süresi dolan
    if (announce) s.track({ pomodoros: 1 });
    const next: FocusPhase = round % LONG_EVERY === 0 ? "long" : "break";
    startFocus(next, round);
    if (announce) notify("break", round % LONG_EVERY === 0 ? "Uzun mola zamanı" : "Mola zamanı", `${round}. tur bitti · ${minutes(next)} dk dinlen`, "stretch");
  } else {
    startFocus("work", f.round);
    if (announce) notify("focus", "Odak zamanı", `${minutes("work")} dk · ${f.round + 1}. tur`, "hop");
  }
}

function notify(kind: "focus" | "break", title: string, detail: string, antic: "stretch" | "hop") {
  const s = useNook.getState();
  s.pushToast({ kind, title, detail, ms: 5000 });
  playAntic(antic);
  if (s.settings.alarmSound) void alarmRing(true, s.settings.alarmSound, true);
}

/** "12:05" biçimi */
export function mmss(ms: number) {
  const t = Math.ceil(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
