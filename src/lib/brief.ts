/**
 * Günün özeti: pencere önce büyür, sonra ada açılır (tanıtımdaki gibi).
 * Üzerine gelinmezse bir dakika sonra kendiliğinden kapanır; gelinirse imleç çıktıktan biraz sonra kapanır.
 */
import { playAntic } from "../hooks/useAntics";
import { isPrimary, setWindowSize } from "./bridge";
import { TOUR_WINDOW } from "./layout";
import { dayKey, EMPTY_DAY, emptyYear, useNook } from "../store/nook";

/** Ada küçülme animasyonu bitmeden pencere küçülmesin */
const SHRINK_AFTER_MS = 700;
/** Hiç dokunulmazsa açık kalma süresi (yavaş okuyana yetsin) */
const AUTO_CLOSE_MS = 60_000;
/** İmleç çıkınca kapanmadan önce bekle: titreyen el bir anlığına dışarı kaçarsa kapanmasın */
const LEAVE_GRACE_MS = 1500;

let shrinkTimer = 0;
let closeTimer = 0;
let unsub: (() => void) | null = null;

export async function openBrief() {
  if (!isPrimary) return;
  const s = useNook.getState();
  if (s.brief || s.tour || s.notes || s.report) return;
  closeDayClose();
  window.clearTimeout(shrinkTimer);
  s.setSearching(false);
  s.setSummaryDay(dayKey());
  await setWindowSize(TOUR_WINDOW.width, TOUR_WINDOW.height).catch(() => undefined);
  useNook.getState().setBrief(true);
  playAntic("hop");
  markDayNoteShown();
  watchClose((st) => st.brief, closeBrief);
}

/** Kendiliğinden kapanma (özet ve "Günü kapat" ortak): dokunulmazsa bir dakika, imleç girip çıkarsa az sonra */
function watchClose(open: (s: ReturnType<typeof useNook.getState>) => boolean, close: () => void) {
  // İmleç içerideyken açıldıysa (Bugün çipi) ya da sonradan girdiyse: çıkınca kapan
  let entered = useNook.getState().hovered;
  window.clearTimeout(closeTimer);
  if (!entered) closeTimer = window.setTimeout(close, AUTO_CLOSE_MS);
  unsub?.();
  unsub = useNook.subscribe((st, prev) => {
    if (!open(st)) return;
    if (st.hovered && !prev.hovered) {
      entered = true;
      window.clearTimeout(closeTimer);
    } else if (!st.hovered && (prev.hovered || prev.holds.length > 0) && entered && !st.holds.length) {
      // İmleç çıktı ya da (imleç dışarıdayken) yazı kutusu bırakıldı
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => !useNook.getState().hovered && !useNook.getState().holds.length && close(), LEAVE_GRACE_MS);
    }
    // Oyun başladı, alarm çaldı ya da arama açıldı
    if (st.fullscreen || st.ringing || st.searching) close();
  });
}

export function closeBrief() {
  window.clearTimeout(closeTimer);
  unsub?.();
  unsub = null;
  const s = useNook.getState();
  if (!s.brief) return;
  s.setBrief(false);
  window.clearTimeout(shrinkTimer);
  shrinkTimer = window.setTimeout(() => {
    const st = useNook.getState();
    if (!st.brief && !st.tour && !st.notes && !st.report) void setWindowSize().catch(() => undefined);
  }, SHRINK_AFTER_MS);
}

// --- Bugünün tek işi ---

/** Bugün için yazılmış tek iş (dünden kalan sayılmaz); başka ekranlar da bunu kullanabilir */
export const useTodayTask = () => useNook((s) => (s.todayTask?.day === dayKey() ? s.todayTask : null));

export function setTodayTask(text: string) {
  const t = text.trim().slice(0, 80);
  useNook.setState({ todayTask: t ? { day: dayKey(), text: t, done: false } : null });
}

/** Yapıldı / geri al; yapılınca Nook sevinir */
export function toggleTodayTask() {
  const t = useNook.getState().todayTask;
  if (!t || t.day !== dayKey()) return;
  useNook.setState({ todayTask: { ...t, done: !t.done } });
  if (!t.done) playAntic("giggle");
}

// --- Günlük ruh hâli ve "Yarına bir not" ---

/** Günün ruh hâli (1–5): Karne son 30 günden, yıl özeti yılın kaydından okur */
export function setMood(v: number, day = dayKey()) {
  useNook.setState((s) => {
    const y = day.slice(0, 4);
    const yr = { ...emptyYear(), ...s.year[y] };
    return {
      days: { ...s.days, [day]: { ...EMPTY_DAY, ...s.days[day], mood: v } },
      year: { ...s.year, [y]: { ...yr, moods: { ...yr.moods, [day.slice(5)]: v } } },
    };
  });
}

export function setDayNote(text: string) {
  const t = text.trim().slice(0, 140);
  useNook.setState({ dayNote: t ? { day: dayKey(), text: t } : null });
}

/** Önceki bir günden kalan not: özetin onu ilk gösterdiği gün boyunca görünür */
export const useDayNote = () =>
  useNook((s) => (s.dayNote && s.dayNote.day !== dayKey() && (!s.dayNote.shown || s.dayNote.shown === dayKey()) ? s.dayNote.text : null));

function markDayNoteShown() {
  const n = useNook.getState().dayNote;
  if (n && n.day !== dayKey() && !n.shown) useNook.setState({ dayNote: { ...n, shown: dayKey() } });
}

// --- Günü kapat ---

/** "Günü kapat" kartının vakti geldi mi: ayar açık, saat geçti, bugün daha açılmadı */
export function dayCloseDue(now = new Date()) {
  const s = useNook.getState();
  if (!s.settings.dayClose || s.dayCloseDay === dayKey(now)) return false;
  const [h, m] = (s.settings.dayCloseAt || "21:30").split(":").map(Number);
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
}

/** Akşam kartı: günde bir kez; özetle aynı kurallarla kendiliğinden kapanır */
export function openDayClose() {
  if (!isPrimary) return;
  const s = useNook.getState();
  if (s.dayClose || s.brief || s.tour || s.notes || s.report) return;
  useNook.setState({ dayClose: true, dayCloseDay: dayKey() });
  playAntic("yawn");
  watchClose((st) => st.dayClose, closeDayClose);
}

export function closeDayClose() {
  const s = useNook.getState();
  if (!s.dayClose) return;
  window.clearTimeout(closeTimer);
  unsub?.();
  unsub = null;
  useNook.setState({ dayClose: false });
  s.setHold("dayclose", false);
}
