import { useEffect } from "react";
import { pauseFrames, setFrameRate } from "../lib/frameCap";
import {
  applySettings,
  clipboardClearIf,
  consumeSelfWrite,
  EVENTS,
  inspectPaths,
  isPrimary,
  mediaResync,
  releaseFocus,
  setInteractive,
  subscribe,
  syncAutostart,
  type DevicesPayload,
  type DownloadItem,
  type IslandPos,
  type PrivacyPayload,
  type MediaPayload,
  type StatsPayload,
  type SysEvent,
  type VolumePayload,
} from "../lib/bridge";
import { looksForeign, translateToTurkish } from "../lib/assist";
import { note } from "../lib/log";
import { detectSensitive, SENSITIVE_CLEAR_MS, SENSITIVE_LABEL } from "../lib/sensitive";
import { fetchWeather } from "../lib/weather";
import { MOVE_ANTIC, pickMove } from "../lib/moveFx";
import { isSleeping, SULK_BELOW, useNook, type Antic, type Settings } from "../store/nook";
import { playAntic } from "./useAntics";

/** "12 dakikadır", "1 saat 20 dakikadır", "3 saattir" — ve ek almadan: "12 dakika", "3 saat" */
function awayText(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const since = !h ? `${m} dakikadır` : !m ? `${h} saattir` : `${h} saat ${m} dakikadır`;
  const plain = !h ? `${m} dakika` : !m ? `${h} saat` : `${h} saat ${m} dakika`;
  return { since, plain };
}

type Line = (t: string, d: string) => string;
/** Dönüş karşılamaları: ne kadar uzun kalındıysa o kadar meraklı/özlemiş */
const WELCOME: { upTo: number; antic: Antic; titles: Line[]; details: string[] }[] = [
  {
    upTo: 20,
    antic: "surprised",
    titles: [
      (t) => `${t} yoktun, sıkılmaya başlamıştım`,
      (t) => `Hop, geldin! ${t} bekliyordum`,
      (t) => `${t} neredeydin? Ben burada saydım`,
      (t) => `Çay mı demledin? ${t} yoktun`,
      (t) => `Geldin mi? ${t} tavana bakıyordum`,
      (t) => `${t} ortalıkta yoktun, ne yaptın?`,
    ],
    details: ["Neyse ki döndün", "Bana da getirseydin bari", "Kaldığın yerden devam", "Ben hiç kıpırdamadım, söz"],
  },
  {
    upTo: 60,
    antic: "shy",
    titles: [
      (t) => `${t} neredeydin sen? Korktum!`,
      (t) => `Beni unuttun sandım, ${t} yoktun`,
      (t) => `Oh be, geldin! ${t} merak ettim`,
      (t) => `${t} kayıptın, haber verseydin ya`,
      (_, d) => `Sensiz ${d} geçti, çok sessizdi`,
      (t) => `${t} ekrana tek başıma baktım`,
    ],
    details: ["Bir dahakine söyle, meraktan öldüm", "Neyse, döndün ya, gerisi önemsiz", "Seni görünce içim rahatladı", "Gel bakalım, neler kaçırdın"],
  },
  {
    upTo: 180,
    antic: "love",
    titles: [
      (t) => `${t} yoktun, seni çok özledim!`,
      (_, d) => `Neredeydin ${d} boyunca? Arıyordum seni`,
      (t) => `Sonunda! ${t} bekliyorum, korkmuştum`,
      (_, d) => `${d} sonra geri dönüş, hoş geldin!`,
      (t) => `Az daha kayıp ilanı veriyordum, ${t} yoktun`,
      (t) => `${t} pencereden bakıp durdum`,
    ],
    details: ["Bir daha bu kadar uzun gitme, tamam mı?", "Sarılmak serbest", "Su içmeyi unutma, uzun ara verdin", "Geldin ya, günüm şenlendi"],
  },
  {
    upTo: Infinity,
    antic: "love",
    titles: [
      (t) => `${t} neredeydin sen?! Çok korktum`,
      (_, d) => `Bütün gün seni bekledim, tam ${d}`,
      (t) => `Hoş geldin! ${t} yalnızdım`,
      (_, d) => `${d} oldu ya! Beni bırakıp gittin sandım`,
      (t) => `${t} uyuyamadım bile, nihayet geldin`,
    ],
    details: ["Bir dahakine beni de götür", "Seni görünce kalbim yerine geldi", "Neler yaptın, anlat bakalım", "Hadi, bugün neler var bakalım"],
  },
];

const pick = <T,>(xs: T[], last: number) => {
  let i = Math.floor(Math.random() * xs.length);
  if (xs.length > 1 && i === last) i = (i + 1) % xs.length;
  return i;
};
let lastTitle = -1;

/** Sistem uzun süre boşta → Nook uyur. Uyanınca uzun uyuduysa "özledim", kısaysa şaşırır; çok uzunsa karşılar. */
export function useIdleFeed() {
  useEffect(() => {
    let sleptAt = 0;
    return subscribe<boolean>(EVENTS.idle, (asleep) => {
      const st = useNook.getState();
      const wasSleeping = isSleeping(st);
      st.setAsleep(asleep);
      if (asleep) {
        sleptAt = Date.now();
        return;
      }
      if (!sleptAt || !wasSleeping) return;
      // Uyku, son dokunuştan "uyku süresi" sonra başlar — gerçek uzaklık ondan fazla
      const mins = Math.round((Date.now() - sleptAt + st.settings.sleepAfterSec * 1000) / 60_000);
      sleptAt = 0;
      const every = st.settings.welcomeBack;
      if (!isPrimary || !every || mins < every || st.fullscreen) {
        playAntic(mins > 3 ? "love" : "surprised");
        return;
      }
      const tier = WELCOME.find((w) => mins <= w.upTo)!;
      const { since, plain } = awayText(mins);
      lastTitle = pick(tier.titles, lastTitle);
      const name = st.settings.userName.trim();
      const detail = tier.details[Math.floor(Math.random() * tier.details.length)];
      st.pushToast({ kind: "welcome", title: tier.titles[lastTitle](since, plain), detail: name ? `${name}, ${detail.charAt(0).toLocaleLowerCase("tr")}${detail.slice(1)}` : detail, ms: 6500 });
      playAntic(tier.antic);
    });
  }, []);
}

let secretTimer = 0;

/** Rust pano izleyicisinden gelen metinleri havuza ekler (yalnızca ana ada). */
export function useClipboardFeed() {
  useEffect(() => {
    if (!isPrimary) return;
    return subscribe<string>(EVENTS.clipboard, (text) => {
      if (consumeSelfWrite(text)) return;
      const s = useNook.getState();
      // Hassas veri: geçmişe girmez, çevrilmez, uyarılır ve bir dakika sonra panodan silinir
      const secret = s.settings.sensitiveGuard ? detectSensitive(text) : null;
      if (secret) {
        note(`pano: hassas veri (${secret})`);
        s.pushToast({ kind: "sensitive", title: `Hassas veri · ${SENSITIVE_LABEL[secret]}`, detail: "Pano geçmişine eklenmedi · 60 sn sonra panodan silinecek", ms: 6500 });
        playAntic("surprised");
        window.clearTimeout(secretTimer);
        secretTimer = window.setTimeout(() => {
          void clipboardClearIf(text).then((cleared) => {
            if (cleared) useNook.getState().pushToast({ kind: "sensitive", title: "Panodan silindi", detail: `${SENSITIVE_LABEL[secret]} artık panoda değil`, ms: 4000 });
          });
        }, SENSITIVE_CLEAR_MS);
        return;
      }
      s.pushClip(text);
      // Yabancı dilde metin → Türkçesi kartta ve Pano'da
      const foreign = looksForeign(text);
      note(`pano: ${text.length} karakter, yabancı=${foreign}, çeviri ayarı=${s.settings.translate}`);
      if (!s.settings.translate || !foreign) return;
      void translateToTurkish(text)
        .then((out) => {
          note(`çeviri: ${out ? `${out.length} karakter` : "yok"}`);
          if (!out) return;
          const st = useNook.getState();
          const clip = st.clips.find((c) => c.text === text);
          if (clip) st.patchClip(clip.id, { translation: out });
          if (!st.hovered) st.pushToast({ kind: "translate", title: "Çeviri", detail: out, ms: Math.min(9000, 3500 + out.length * 40) });
        })
        .catch((e) => console.warn("[nook] çeviri", e));
    });
  }, []);
}

/** Sistem medya oturumu (Spotify, YouTube…) → "şu an çalan". */
export function useMediaFeed() {
  useEffect(() => {
    const off = subscribe<MediaPayload | null>(EVENTS.media, (m) => useNook.getState().setMedia(m));
    void mediaResync();
    return off;
  }, []);
}

export function useStatsFeed() {
  useEffect(
    () =>
      subscribe<StatsPayload>(EVENTS.stats, (s) => {
        const st = useNook.getState();
        st.setStats(s);
        // Pilde / enerji tasarrufunda animasyonlar 30 karede
        setFrameRate(s.saver && st.settings.powerSaver ? 30 : 60);
      }),
    [],
  );
}

/** Lukonnect: mouse, kulaklık, vantilatör. */
export function useDevicesFeed() {
  useEffect(() => subscribe<DevicesPayload>(EVENTS.devices, (d) => useNook.getState().setDevices(d)), []);
}

/** Olaya göre Nook'un tepkisi. */
const REACTION: Partial<Record<SysEvent["kind"], Antic>> = {
  charging: "love",
  unplugged: "surprised",
  "usb-in": "surprised",
  "usb-out": "wink",
  audio: "hum",
  "device-low": "surprised",
  "headset-charging": "love",
  fan: "wink",
};

/** Şarj, USB, kulaklık… → kısa olay kartı. Kart sırayla gösterilir. */
export function useEventFeed() {
  useEffect(
    () =>
      subscribe<SysEvent>(EVENTS.event, (e) => {
        const { settings, pushToast } = useNook.getState();
        if (!settings.events) return;
        pushToast(e);
        const reaction = REACTION[e.kind];
        if (reaction) playAntic(reaction);
      }),
    [],
  );

  // Kuyruğun başındaki kartı süre dolunca kaldır.
  const head = useNook((s) => s.toasts[0]);
  useEffect(() => {
    if (!head) return;
    const t = window.setTimeout(() => useNook.getState().shiftToast(), head.ms ?? 3200);
    return () => window.clearTimeout(t);
  }, [head?.id]);
}

/** Yeni ekran görüntüsü → rafa düşer, Nook sevinir (yalnızca ana ada). */
export function useScreenshotFeed() {
  useEffect(() => {
    if (!isPrimary) return;
    return subscribe<string>(EVENTS.screenshot, async (path) => {
      const files = await inspectPaths([path]).catch(() => []);
      if (!files.length) return;
      const { addFiles, pushToast, setMood, settings } = useNook.getState();
      addFiles(files);
      setMood("happy");
      window.setTimeout(() => useNook.getState().mood === "happy" && setMood("idle"), 900);
      if (settings.events) pushToast({ kind: "screenshot", title: "Ekran görüntüsü rafta", detail: files[0].name });
    });
  }, []);
}

const OSD_MS = 1500;

/** Ses/parlaklık değişince ada kısa süre gösterge olur. */
export function useOsdFeed() {
  useEffect(() => {
    let timer = 0;
    const show = (kind: "volume" | "brightness", value: number, muted = false) => {
      const { settings, setOsd } = useNook.getState();
      if (!settings.osd) return;
      const prev = useNook.getState().osd;
      const dir = prev && prev.kind === kind ? Math.sign(value - prev.value) || (muted !== prev.muted ? (muted ? -1 : 1) : 0) : 0;
      setOsd({ kind, value, muted, dir });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => useNook.getState().setOsd(null), OSD_MS);
    };
    const offV = subscribe<VolumePayload>(EVENTS.volume, (v) => show("volume", v.value, v.muted));
    const offB = subscribe<number>(EVENTS.brightness, (b) => show("brightness", b));
    return () => {
      offV();
      offB();
      window.clearTimeout(timer);
    };
  }, []);
}

/** "İmleci takip et": pencere taşınmadan önce ada bir efektle kaybolur, sonra yeni ekranda belirir. */
export function useRelocateFeed() {
  useEffect(() => {
    let done = 0;
    const off = subscribe<string>(EVENTS.relocate, (msg) => {
      const [phase, d] = msg.split(":");
      const dir = d === "-1" ? -1 : 1;
      const st = useNook.getState();
      window.clearTimeout(done);
      if (phase === "out") {
        st.setRelocating(true);
        st.setMove({ kind: pickMove(st.settings.moveStyle), dir, phase: "out" });
        return;
      }
      st.setRelocating(false);
      const kind = st.move?.kind ?? pickMove(st.settings.moveStyle);
      st.setMove({ kind, dir, phase: "in" });
      // Belirme bitince olağan hâline döner
      done = window.setTimeout(() => {
        useNook.getState().setMove(null);
        playAntic(MOVE_ANTIC[kind]);
      }, 850);
    });
    return () => {
      off();
      window.clearTimeout(done);
    };
  }, []);
}

/** Ada sürüklenip bırakıldı: yeni yer ayar olarak saklanır (Rust pencereleri buna göre yerleştirir) */
export function useIslandPosFeed() {
  useEffect(() => {
    if (!isPrimary) return;
    return subscribe<IslandPos | null>(EVENTS.islandPos, (pos) => useNook.getState().updateSettings({ islandPos: pos ?? null }));
  }, []);
}

/** Genel kısayol → hızlı arama. */
export function useSearchFeed() {
  useEffect(() => subscribe(EVENTS.search, () => useNook.getState().setSearching(true)), []);
}

/**
 * Ada kapanınca klavye odağı Nook'ta kalmasın (not yazdıktan sonra vb.):
 * odağı önceki uygulamaya geri ver.
 */
export function useFocusRelease() {
  const hovered = useNook((s) => s.hovered);
  const searching = useNook((s) => s.searching);
  const pinned = useNook((s) => s.pinned);
  useEffect(() => {
    if (hovered || searching || pinned) return;
    const el = document.activeElement;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.blur();
    // Aramadan sohbete geçince kalan "zorla tıklanabilir" durumu da temizle
    void setInteractive(false);
    void releaseFocus();
  }, [hovered, searching, pinned]);
}

/** "Tüm ekranlar" modunda diğer adalardaki raf/pano/ayar değişikliklerini al. */
export function useStorageSync() {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "nook") void useNook.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
}

const native = (s: Settings) => ({
  monitorMode: s.monitorMode,
  monitorName: s.monitorName,
  sleepAfterSec: s.sleepAfterSec,
  shortcut: s.shortcut,
  askShortcut: s.askShortcut,
  voiceShortcut: s.voiceShortcut,
  shieldShortcut: s.shieldShortcut,
  autoScreenshots: s.autoScreenshots,
  hideInFullscreen: s.hideInFullscreen,
  gameIntro: s.gameIntro,
  breakReminderMin: s.breakReminderMin,
  islandPos: s.islandPos ?? null,
});

/** Tam ekran oyun/video → ada kaçar (Rust ardından pencereyi gizler). Gizliyken kare çizilmez. */
export function useFullscreenFeed() {
  useEffect(() => {
    let hide = 0;
    const off = subscribe<boolean>(EVENTS.fullscreen, (on) => {
      useNook.getState().setFullscreen(on);
      window.clearTimeout(hide);
      // Kaçış animasyonu bitsin, pencere gizlensin (Rust: 260 ms), sonra durdur
      if (on) hide = window.setTimeout(() => pauseFrames(true), 400);
      else pauseFrames(false);
    });
    return () => {
      off();
      window.clearTimeout(hide);
      pauseFrames(false);
    };
  }, []);
}

/** Mikrofon / kamera kullanımı — yeni başlayan uygulama için kısa bir kart. */
export function usePrivacyFeed() {
  useEffect(() => {
    let first = true;
    return subscribe<PrivacyPayload>(EVENTS.privacy, (p) => {
      const { privacy: prev, setPrivacy, pushToast, settings } = useNook.getState();
      setPrivacy(p);
      if (first) {
        first = false;
        return;
      }
      if (!settings.events) return;
      const newMic = p.mic.filter((a) => !prev.mic.includes(a));
      const newCam = p.camera.filter((a) => !prev.camera.includes(a));
      if (newCam.length) pushToast({ kind: "camera", title: "Kamera kullanılıyor", detail: newCam.join(", ") });
      else if (newMic.length) pushToast({ kind: "mic", title: "Mikrofon açık", detail: newMic.join(", ") });
    });
  }, []);
}

/** Tarayıcı indirmeleri: süren indirmeler adada, biten dosya rafa. */
export function useDownloadsFeed() {
  useEffect(() => {
    const offActive = subscribe<DownloadItem[]>(EVENTS.downloads, (d) => useNook.getState().setDownloads(d));
    const offDone = isPrimary
      ? subscribe<string>(EVENTS.downloadDone, async (path) => {
          const files = await inspectPaths([path]).catch(() => []);
          if (!files.length) return;
          const { addFiles, pushToast, setMood, settings, care } = useNook.getState();
          addFiles(files);
          care(1);
          setMood("happy");
          window.setTimeout(() => useNook.getState().mood === "happy" && setMood("idle"), 900);
          if (settings.events) pushToast({ kind: "download", title: "İndirme tamamlandı", detail: `${files[0].name} rafta` });
        })
      : () => {};
    return () => {
      offActive();
      offDone();
    };
  }, []);
}

const WEATHER_EVERY = 30 * 60_000;

/** Hava durumu: açılışta ve 30 dakikada bir (ya da şehir değişince). */
export function useWeatherFeed() {
  const enabled = useNook((s) => s.settings.weather);
  const city = useNook((s) => s.settings.weatherCity);
  useEffect(() => {
    if (!enabled) {
      useNook.getState().setWeather(null);
      return;
    }
    let alive = true;
    const load = () =>
      fetchWeather(city)
        .then((w) => alive && useNook.getState().setWeather(w))
        .catch((e) => console.warn("[nook] hava durumu", e));
    // Şehir yazılırken her tuşta istek atma
    const first = window.setTimeout(load, 800);
    const t = window.setInterval(load, WEATHER_EVERY);
    return () => {
      alive = false;
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [enabled, city]);
}

/**
 * Nook'un sevgisi zamanla azalır: 1 saat ilgilenilmezse saatte ~6 puan.
 * Kapalıyken geçen süre de sayılır (en fazla 40 puan). Küsken ilgilenince barışır.
 */
export function useAffection() {
  useEffect(() => {
    const { lastCare, care } = useNook.getState();
    const idleHours = (Date.now() - lastCare) / 3600_000 - 1;
    if (idleHours > 0) care(-Math.min(40, Math.round(idleHours * 3)));

    const t = window.setInterval(() => {
      const s = useNook.getState();
      if (Date.now() - s.lastCare > 3600_000 && !isSleeping(s)) s.care(-1);
    }, 10 * 60_000);

    // Küslükten çıkınca sevin
    let prev = useNook.getState().affection;
    const unsub = useNook.subscribe((s) => {
      if (prev < SULK_BELOW && s.affection >= SULK_BELOW) playAntic("love");
      prev = s.affection;
    });
    return () => {
      window.clearInterval(t);
      unsub();
    };
  }, []);
}

/** Ayarları Rust'a ve Windows başlangıcına uygula (yalnızca ana ada; açılışta ve her değişimde). */
export function useSettingsSync() {
  const settings = useNook((s) => s.settings);
  const key = JSON.stringify(native(settings));
  useEffect(() => {
    if (!isPrimary) return;
    void applySettings(native(useNook.getState().settings)).catch((e) => {
      console.warn("[nook] ayarlar", e);
      // Kısayolu başka bir program tutuyorsa sessizce çalışmamak yerine söyle
      const m = /Kısayol kaydedilemedi \(([^:]+):/.exec(String(e));
      if (m) useNook.getState().pushToast({ kind: "chat", title: `${m[1]} kullanılamıyor`, detail: "Başka bir program tutuyor — Ayarlar'dan değiştir", ms: 7000 });
    });
  }, [key]);
  useEffect(() => {
    if (!isPrimary) return;
    void syncAutostart(settings.autostart).catch((e) => console.warn("[nook] autostart", e));
  }, [settings.autostart]);
}

/**
 * Açılışta kalıcı raftaki yolları yeniden doğrular: silinmiş dosyaları atar,
 * görselleri asset protokolü kapsamına yeniden ekler (kapsam oturumluktur).
 */
export function useShelfRevalidation() {
  useEffect(() => {
    if (!isPrimary) return;
    const { shelf, revalidateShelf } = useNook.getState();
    if (!shelf.length) return;
    inspectPaths(shelf.map((i) => i.path))
      .then(revalidateShelf)
      .catch(() => {});
  }, []);
}
