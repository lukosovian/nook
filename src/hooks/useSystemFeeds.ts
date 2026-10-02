import { useEffect } from "react";
import {
  applySettings,
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
  type PrivacyPayload,
  type MediaPayload,
  type StatsPayload,
  type SysEvent,
  type VolumePayload,
} from "../lib/bridge";
import { looksForeign, translateToTurkish } from "../lib/assist";
import { note } from "../lib/log";
import { fetchWeather } from "../lib/weather";
import { isSleeping, SULK_BELOW, useNook, type Antic, type Settings } from "../store/nook";
import { playAntic } from "./useAntics";

/** Sistem uzun süre boşta → Nook uyur. Uyanınca uzun uyuduysa "özledim", kısaysa şaşırır. */
export function useIdleFeed() {
  useEffect(() => {
    let sleptAt = 0;
    return subscribe<boolean>(EVENTS.idle, (asleep) => {
      const st = useNook.getState();
      const wasSleeping = isSleeping(st);
      st.setAsleep(asleep);
      if (asleep) sleptAt = Date.now();
      else if (sleptAt && wasSleeping) playAntic(Date.now() - sleptAt > 3 * 60_000 ? "love" : "surprised");
    });
  }, []);
}

/** Rust pano izleyicisinden gelen metinleri havuza ekler (yalnızca ana ada). */
export function useClipboardFeed() {
  useEffect(() => {
    if (!isPrimary) return;
    return subscribe<string>(EVENTS.clipboard, (text) => {
      if (consumeSelfWrite(text)) return;
      const s = useNook.getState();
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
  useEffect(() => subscribe<StatsPayload>(EVENTS.stats, (s) => useNook.getState().setStats(s)), []);
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

/** "İmleci takip et": pencere taşınmadan önce ada kaybolur, sonra yeni ekranda belirir. */
export function useRelocateFeed() {
  useEffect(
    () => subscribe<"out" | "in">(EVENTS.relocate, (phase) => useNook.getState().setRelocating(phase === "out")),
    [],
  );
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
  autoScreenshots: s.autoScreenshots,
  hideInFullscreen: s.hideInFullscreen,
});

/** Tam ekran oyun/video → ada kaçar (Rust ardından pencereyi gizler). */
export function useFullscreenFeed() {
  useEffect(() => subscribe<boolean>(EVENTS.fullscreen, (on) => useNook.getState().setFullscreen(on)), []);
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
