import { useEffect } from "react";
import { isPrimary } from "../lib/bridge";
import { syncFeeds } from "../lib/ics";
import { note } from "../lib/log";
import { tt } from "../lib/i18n";
import { useNook } from "../store/nook";
import { playAntic } from "./useAntics";

const SYNC_EVERY = 30 * 60_000;
const CHECK_EVERY = 20_000;

/** Takvim abonelikleri: açılışta, adres değişince ve 30 dakikada bir eşitlenir (yalnızca ana ada). */
export function useCalendarFeed() {
  const feeds = useNook((s) => s.settings.calFeeds);
  const key = feeds.join("\n");
  useEffect(() => {
    if (!isPrimary) return;
    const urls = feeds.map((u) => u.trim()).filter(Boolean);
    if (!urls.length) {
      // Son abonelik kaldırıldı: onun etkinlikleri de gider
      const st = useNook.getState();
      if (st.extEvents.length && st.extSyncedAt) st.setExtEvents([]);
      return;
    }
    let alive = true;
    const load = () =>
      syncFeeds(urls).then(({ events, errors }) => {
        if (!alive) return;
        note(`takvim: ${events.length} etkinlik, ${errors.length} hata`);
        // Hepsi hata verdiyse eskisini koru (internet yokken takvim boşalmasın)
        if (events.length || !errors.length) useNook.getState().setExtEvents(events);
      });
    // Adres yazılırken her tuşta indirme
    const first = window.setTimeout(load, 1200);
    const t = window.setInterval(load, SYNC_EVERY);
    return () => {
      alive = false;
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [key]);
}

/** Abone takvimdeki etkinliklere vakti gelince kısa kart (kendi etkinliklerin alarmla hatırlatılır). */
export function useExtReminders() {
  useEffect(() => {
    if (!isPrimary) return;
    const told = new Set<string>();
    let last = Date.now();
    const t = window.setInterval(() => {
      const st = useNook.getState();
      const lead = st.settings.calRemindExt;
      const now = Date.now();
      if (lead >= 0) {
        for (const e of st.extEvents) {
          if (e.allDay || told.has(e.id)) continue;
          const at = e.start - lead * 60_000;
          // Bu aralıkta vakti gelenler (Nook kapalıyken geçenler sessiz geçer)
          if (at > last && at <= now) {
            told.add(e.id);
            st.pushToast({ kind: "calendar", title: e.title, detail: lead ? tt("{0} dk sonra · {1}", lead, e.time) : tt("Şimdi başlıyor · {0}", e.time), ms: 8000 });
            playAntic("surprised");
          }
        }
      }
      // Dokunulmayan karalama sekmeleri
      if (st.settings.padClear) st.expirePads(st.settings.padClear);
      last = now;
    }, CHECK_EVERY);
    return () => window.clearInterval(t);
  }, []);
}

export interface NextEvent {
  title: string;
  start: number;
  /** Bitişi biliniyorsa (abone takvim) */
  end: number | null;
}

/** Kapalı adadaki geri sayım: 1 saat içinde başlayacak ya da sürmekte olan saatli etkinlik */
export function nextEvent(s: Pick<ReturnType<typeof useNook.getState>, "events" | "extEvents">, now = Date.now()): NextEvent | null {
  const own = s.events
    .filter((e) => e.time)
    .map((e) => {
      const [y, m, d] = e.day.split("-").map(Number);
      const [hh, mm] = e.time.split(":").map(Number);
      return { title: e.title, start: new Date(y, m - 1, d, hh, mm).getTime(), end: null as number | null };
    });
  const ext = s.extEvents.filter((e) => !e.allDay).map((e) => ({ title: e.title, start: e.start, end: e.end > e.start ? e.end : null }));
  const all = [...own, ...ext];
  // Önce süren etkinlik (bitmesine 1 saatten az kaldıysa), yoksa 1 saat içinde başlayacak olan
  const ongoing = all.filter((e) => e.end && e.start <= now && e.end > now && e.end - now <= 3600_000).sort((a, b) => a.end! - b.end!)[0];
  if (ongoing) return ongoing;
  return all.filter((e) => e.start > now && e.start - now <= 3600_000).sort((a, b) => a.start - b.start)[0] ?? null;
}
