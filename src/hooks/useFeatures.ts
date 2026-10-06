/**
 * Yeni özelliklerin beslemeleri: odak sayacı, göz/su molası, Windows bildirimleri, sesli komut,
 * ekrana sor, internet durumu, oyun özeti, günlük istatistik ve Nook'un oyun teklifi.
 * Kalıcı durumu değiştirenler yalnızca ana adada çalışır.
 */
import { useEffect } from "react";
import {
  EVENTS,
  isPrimary,
  onlineState,
  subscribe,
  voiceStart,
  voiceStop,
  type GamePayload,
  type GamePeekPayload,
  type NotificationPayload,
  type VoicePayload,
} from "../lib/bridge";
import { transcribe } from "../lib/assist";
import { note } from "../lib/log";
import { sendChat } from "../lib/chat";
import { openBrief } from "../lib/brief";
import { notesDue, openNotes } from "../lib/notes";
import { nextPhase, remaining } from "../lib/focus";
import { dayKey, isSleeping, useNook } from "../store/nook";
import { playAntic } from "./useAntics";
import { tt } from "../lib/i18n";

/** Odak sayacı: faz bitince sıradakine geçer. */
export function useFocusTimer() {
  useEffect(() => {
    if (!isPrimary) return;
    const t = window.setInterval(() => {
      const f = useNook.getState().focus;
      if (f && f.endsAt !== null && remaining(f) <= 0) nextPhase();
    }, 500);
    return () => window.clearInterval(t);
  }, []);
}

/** Son su içiminden bu yana geçen aktif dakika — "Sonra" bunu geri sarar */
let waterMinutes = 0;
const SNOOZE_MIN = 15;

/** "İçtim": Nook da bardağıyla içer, sonra hatırlatma kapanır. Hatırlatma yokken de (Bugün'den) kaydedilebilir. */
export function drankWater() {
  const s = useNook.getState();
  if (s.reminder?.phase === "drinking") return;
  waterMinutes = 0;
  s.setReminder({ kind: "water", phase: "drinking" });
  s.track({ water: 1 });
  s.care(2);
  playAntic("drink");
  window.setTimeout(() => {
    useNook.getState().setReminder(null);
    playAntic("love");
  }, 2400);
}

/** "Sonra": 15 dakika sonra yeniden hatırlat. */
export function snoozeWater() {
  const s = useNook.getState();
  waterMinutes = Math.max(0, s.settings.waterEvery - SNOOZE_MIN);
  s.setReminder(null);
  playAntic("nod");
}

/**
 * Dakikada bir: bugünün istatistiği (Karne) ve mola hatırlatıcıları.
 *  - 20-20-20: 20 dk kesintisiz kullanımda "20 sn uzağa bak"
 *  - Su: ayardaki aralıkla; cevaplanana kadar adada durur (bilgisayar başında değilken ya da
 *    tam ekrandayken kaybolmaz — dönünce seni bekler)
 * Bilgisayar boştaysa (uyku) göz sayacı sıfırlanır; oyunda/tam ekranda göz hatırlatması yapılmaz.
 */
export function useDayTracker() {
  useEffect(() => {
    if (!isPrimary) return;
    let eye = 0;
    const t = window.setInterval(() => {
      const s = useNook.getState();
      const away = isSleeping(s);
      const working = !!s.focus && s.focus.phase === "work" && s.focus.endsAt !== null;
      s.track({
        active: away ? 0 : 1,
        music: s.media?.playing ? 1 : 0,
        focus: working ? 1 : 0,
        moodSum: s.affection,
        moodN: 1,
      });

      if (away) {
        eye = 0;
        return;
      }
      eye += 1;
      // Hatırlatma ekranda beklerken sayaç ilerlemez
      if (!s.reminder) waterMinutes += 1;
      const resting = !!s.focus && s.focus.phase !== "work";
      const quiet = s.fullscreen || !!s.ringing || resting;
      if (s.settings.eyeBreak && eye >= 20) {
        eye = 0;
        if (!quiet) {
          s.pushToast({ kind: "eye", title: tt("Göz molası"), detail: tt("20 saniye boyunca uzağa bak"), ms: 7000 });
          playAntic("suspicious");
        }
      }
      if (s.settings.waterEvery > 0 && waterMinutes >= s.settings.waterEvery && !s.reminder) {
        waterMinutes = 0;
        s.setReminder({ kind: "water", phase: "due" });
        playAntic("surprised");
      }
    }, 60_000);
    return () => window.clearInterval(t);
  }, []);
}

/** Windows bildirimleri → listeye; ayar açıksa ve odak/oyun yoksa adada kart. */
export function useNotificationFeed() {
  useEffect(() => {
    if (!isPrimary) return;
    return subscribe<NotificationPayload>(EVENTS.notification, (n) => {
      const s = useNook.getState();
      if (!s.settings.notifications) return;
      s.pushNotification(n);
      s.track({ notifs: 1 });
      const focusing = s.settings.focusMute && s.focus?.phase === "work" && s.focus.endsAt !== null;
      if (s.fullscreen || focusing) return;
      s.pushToast({ kind: "notify", title: n.title, detail: n.body || n.app, icon: n.icon, ms: 4500 });
      playAntic("surprised");
    });
  }, []);
}

/** Sesli komut kaydını yazıya döküp sohbete gönderir. */
export async function handleVoiceAudio(audio: string | null) {
  const s = useNook.getState();
  s.setListening(false);
  if (!audio) return;
  s.setBusy("voice", true);
  try {
    const text = await transcribe(audio);
    if (!text) {
      s.pushToast({ kind: "chat", title: tt("Anlayamadım"), detail: tt("Bir daha söyler misin?") });
      playAntic("suspicious");
      return;
    }
    void sendChat(text, { voice: true });
  } catch (e) {
    s.pushToast({ kind: "chat", title: tt("Sesli komut"), detail: (e as Error).message, ms: 5000 });
  } finally {
    useNook.getState().setBusy("voice", false);
  }
}

/** Sohbetteki mikrofon düğmesi: bas → dinle, tekrar bas → gönder. */
export async function toggleVoice() {
  const s = useNook.getState();
  if (s.listening) {
    const audio = await voiceStop().catch(() => null);
    await handleVoiceAudio(audio);
  } else if (await voiceStart()) {
    s.setListening(true);
  }
}

/** Kısayolla (basılı tut) sesli komut. */
export function useVoiceFeed() {
  useEffect(() => {
    const off = subscribe<VoicePayload>(EVENTS.voice, (v) => {
      const s = useNook.getState();
      if (v.phase === "start") {
        s.setListening(true);
        playAntic("surprised");
      } else if (v.phase === "done") {
        void handleVoiceAudio(v.audio);
      } else {
        s.setListening(false);
        s.pushToast({ kind: "chat", title: tt("Mikrofon"), detail: v.message, ms: 5000 });
      }
    });
    return off;
  }, []);
}

/** Ekrana sor: görüntü sohbete eklenir, ada açık kalır. */
export function useAskScreenFeed() {
  useEffect(
    () =>
      subscribe<string | null>(EVENTS.askScreen, (image) => {
        note(`ekrana sor olayı: ${image ? image.length : tt("görüntü yok")}`);
        const s = useNook.getState();
        if (!image) {
          s.pushToast({ kind: "chat", title: tt("Ekrana sor"), detail: tt("Ekran görüntüsü alınamadı") });
          return;
        }
        s.setAttachment(image);
        s.setSearching(false);
        s.setTab("chat");
        s.setPinned(true);
        playAntic("suspicious");
      }),
    [],
  );
}

/** İnternet bağlantısı */
export function useOnlineFeed() {
  useEffect(() => {
    void onlineState().then((o) => useNook.getState().setOnline(o));
    return subscribe<boolean>(EVENTS.online, (o) => {
      useNook.getState().setOnline(o);
      playAntic(o ? "love" : "surprised");
    });
  }, []);
}

const duration = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return h ? tt("{0} sa {1} dk", h, m) : tt("{0} dk", m);
};

/** 120 → "2 saattir", 150 → "2 saat 30 dakikadır" */
const since = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return !h ? tt("{0} dakikadır", m) : !m ? `${h} saattir` : tt("{0} saat {1} dakikadır", h, m);
};

/** Oyundan çıkınca: süre ve en yüksek yük. */
export function useGameFeed() {
  useEffect(() => {
    if (!isPrimary) return;
    return subscribe<GamePayload>(EVENTS.game, (g) => {
      const s = useNook.getState();
      s.track({ game: Math.round(g.secs / 60) });
      if (!s.settings.gameSummary) return;
      s.pushToast({
        kind: "game",
        title: `${g.app} · ${duration(g.secs)}`,
        detail: tt("En yüksek işlemci %{0} · bellek %{1}", Math.round(g.peakCpu), g.peakMem),
        ms: 7000,
      });
      playAntic("hop");
    });
  }, []);

  // Oyun açılınca, ada gizlenmeden önce: makinenin ve cihazların durumu
  useEffect(() => {
    if (!isPrimary) return;
    return subscribe<GamePeekPayload>(EVENTS.gameStart, (g) => {
      const { stats, devices, pushToast } = useNook.getState();
      const parts = [
        stats && tt("İşlemci %{0}", Math.round(stats.cpu)),
        stats && stats.memTotal > 0 && `Bellek %${Math.round((stats.memUsed / stats.memTotal) * 100)}`,
        devices?.headset && tt("Kulaklık %{0}", devices.headset.percent),
        devices?.mouse && `Mouse %${devices.mouse.percent}`,
      ].filter(Boolean);
      pushToast({ kind: "game", title: tt("{0} başlıyor · iyi oyunlar!", g.app), detail: parts.join(" · ") || tt("Ben burada bekliyorum"), ms: 4800 });
      playAntic("wink");
    });
  }, []);

  // Uzun oyun: ada kısa süre görünür, mola hatırlatır
  useEffect(() => {
    if (!isPrimary) return;
    return subscribe<GamePeekPayload>(EVENTS.gameBreak, (g) => {
      useNook.getState().pushToast({
        kind: "break",
        title: `${since(g.mins)} ${g.app} oynuyorsun`,
        detail: tt("Biraz su iç, gözlerini dinlendir, bir esne"),
        ms: 7500,
      });
      playAntic("yawn");
    });
  }, []);
}

const OFFER_EVERY_MS = 2 * 3600_000;

/** Nook sıkılınca (ve ada kapalıyken) oyun teklif eder; açınca doğrudan oyun gelir. */
export function usePlayOffers() {
  useEffect(() => {
    if (!isPrimary) return;
    return useNook.subscribe((st, prev) => {
      if (st.antic !== "bored" || prev.antic === "bored") return;
      if (!st.settings.playOffers || st.hovered || st.fullscreen || st.focus?.phase === "work") return;
      if (Date.now() - st.lastOffer < OFFER_EVERY_MS) return;
      st.setLastOffer(Date.now());
      st.setPendingTab("play");
      st.pushToast({ kind: "play", title: tt("Sıkıldım…"), detail: tt("Benimle oyun oynar mısın? Üstüme gel"), ms: 6000 });
    });
  }, []);
}

/** Açılış animasyonundan sonra özet bu kadar bekler (hava, Argus yüklensin) */
const SUMMARY_DELAY_MS = 2500;
/** Yeni özet tanıtılırken bir kez, o gün zaten açılmış olsa da göster (güncellemenin ardından) */
const SHOWCASE_KEY = "nook-summary-showcase";
const SHOWCASE = "0.2.12";
const showcaseDue = () => {
  try {
    return localStorage.getItem(SHOWCASE_KEY) !== SHOWCASE;
  } catch {
    return false;
  }
};

/** Günün özeti bugün daha gösterilmedi mi */
export function summaryDue() {
  const s = useNook.getState();
  return s.settings.dailySummary && (s.summaryDay !== dayKey() || showcaseDue()) && new Date().getHours() >= 5;
}

/** Günün ilk açılışında ada büyüyüp günün özetini gösterir (bkz. lib/brief). */
export function useDailySummaryOpen() {
  useEffect(() => {
    if (!isPrimary) return;
    let wait: number | undefined;
    let done = false;
    const tryOpen = () => {
      const s = useNook.getState();
      // İlk kurulumda tanıtım var; oyun/alarm sırasında araya girme — ilk üzerine gelişte açılır
      if (done || s.intro || s.tour || !s.toured || s.fullscreen || s.ringing || s.notes) return;
      // Güncellemeden sonra önce yama notları; kapanınca sıra özete gelir
      if (notesDue()) {
        void openNotes();
        return;
      }
      if (!summaryDue()) return;
      done = true;
      try {
        localStorage.setItem(SHOWCASE_KEY, SHOWCASE);
      } catch {
        /* önemsiz */
      }
      void openBrief();
    };
    const unsub = useNook.subscribe((st, prev) => {
      if (prev.intro && !st.intro) {
        window.clearTimeout(wait);
        wait = window.setTimeout(tryOpen, SUMMARY_DELAY_MS);
      }
      if (prev.notes && !st.notes) {
        window.clearTimeout(wait);
        wait = window.setTimeout(tryOpen, 1500);
      }
    });
    if (!useNook.getState().intro) wait = window.setTimeout(tryOpen, SUMMARY_DELAY_MS);
    return () => {
      unsub();
      window.clearTimeout(wait);
    };
  }, []);
}
