import { useEffect } from "react";
import { alarmNext, alarmRing, isPrimary, subscribe } from "../lib/bridge";
import { useNook } from "../store/nook";

/** Alarm bu kadar çalınca (kimse dokunmazsa) kendiliğinden susar. */
const AUTO_STOP_MS = 3 * 60_000;

/**
 * Saniyede bir zamanı gelen alarmı arar ve çalar. Yalnızca ana adada çalışır
 * (birden fazla ekranda ada varsa ses bir kez çalsın).
 */
export function useAlarms() {
  useEffect(() => {
    if (!isPrimary) return;
    useNook.getState().rescheduleAlarms();

    // Sıradaki alarmı Rust'a bildir (değiştikçe)
    let sent: number | null | undefined;
    const report = () => {
      const next = useNook.getState().alarms.reduce<number | null>((m, a) => (a.enabled && a.next !== null && (m === null || a.next < m) ? a.next : m), null);
      if (next !== sent) void alarmNext((sent = next));
    };
    report();
    const unsub = useNook.subscribe((st, prev) => st.alarms !== prev.alarms && report());

    let autoStop = 0;
    const check = () => {
      const s = useNook.getState();
      if (s.ringing) return;
      const now = Date.now();
      const due = s.alarms.find((a) => a.enabled && a.next !== null && a.next <= now);
      if (!due) return;
      s.fireAlarm(due.id);
      s.setRinging(due);
      // Sessiz alarm ya da "Sessiz" ses ayarı → yalnızca ada açılır
      void alarmRing(true, due.silent ? 0 : s.settings.alarmSound);
      window.clearTimeout(autoStop);
      autoStop = window.setTimeout(() => stopAlarm(), AUTO_STOP_MS);
    };
    const t = window.setInterval(check, 1000);
    // Oyunda ada gizliyken sayfanın saati yavaşlar; vakti gelince Rust haber verir, beklemeden çal
    const off = subscribe<number>("nook://alarm-due", () => check());

    return () => {
      window.clearInterval(t);
      off();
      window.clearTimeout(autoStop);
      unsub();
    };
  }, []);
}

/** Susturur; `snoozeMin` verilirse o kadar dakika sonra tekrar çalmak üzere ertelenir. */
export function stopAlarm(snoozeMin?: number) {
  const s = useNook.getState();
  const r = s.ringing;
  s.setRinging(null);
  void alarmRing(false);
  if (r && snoozeMin) {
    const at = Date.now() + snoozeMin * 60_000;
    const d = new Date(at);
    s.addAlarm({ hour: d.getHours(), minute: d.getMinutes(), label: r.label, repeat: "once", oneShot: true, at, silent: r.silent });
  }
}
