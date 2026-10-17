/**
 * Kendini güncelleme: GitHub Releases'taki latest.json'a bakar (adres tauri.conf.json'da).
 * Yeni sürüm varsa kart gösterir; Ayarlar'dan tek tıkla indirip kurar ve yeniden başlar.
 * İndirilen kurulum dosyası imzalı — imza tutmazsa kurulmaz.
 * Kurulum her zaman adada yapılır (Studio'dan basılsa da): kapalı ada güncelleme kapsülüne dönüşür,
 * kurulum penceresi hiç açılmaz (sessiz kurulum), Nook yeni sürümle kendiliğinden geri gelir.
 */
import { useEffect } from "react";
import { create } from "zustand";
import { getVersion } from "@tauri-apps/api/app";
import { emit, emitTo } from "@tauri-apps/api/event";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { inTauri, isPrimary, subscribe } from "./bridge";
import { useNook } from "../store/nook";
import { tt } from "./i18n";
import type { UpdateAnimId } from "../components/overlays/UpdateAnims";

const FIRST_CHECK_MS = 30_000;
const CHECK_EVERY_MS = 6 * 3600_000;
/** İndirme bitince veda animasyonu bu kadar görünür, sonra kurulum başlar */
const FAREWELL_MS = 2600;
const INSTALL_EVENT = "nook://update-install";
const PROGRESS_EVENT = "nook://update-progress";
const DEMO_EVENT = "nook://update-demo";
/** Denemede indirme bu kadar sürer */
const DEMO_DOWNLOAD_MS = 3600;

interface UpdateState {
  current: string;
  /** Bulunan yeni sürüm */
  available: string | null;
  /** İndirme ilerlemesi (0–100); null = indirmiyor */
  progress: number | null;
  /** İndirme bitti, Nook yeni sürümle yeniden başlamak üzere */
  restarting: boolean;
  /** Son denetimin sonucu ("Güncel", hata…) */
  status: string;
  /** Ayarlardan "Adada dene": gerçek indirme yok, bu animasyon oynar */
  demo: UpdateAnimId | null;
}

export const useUpdate = create<UpdateState>(() => ({ current: "", available: null, progress: null, restarting: false, status: "", demo: null }));

/** İlerleme bütün pencerelere yansır (Studio'daki Ayarlar da görsün) */
function share(patch: Partial<UpdateState>) {
  useUpdate.setState(patch);
  if (inTauri && isPrimary) void emit(PROGRESS_EVENT, patch).catch(() => {});
}
if (inTauri && !isPrimary) subscribe<Partial<UpdateState>>(PROGRESS_EVENT, (p) => useUpdate.setState(p));

let pending: Update | null = null;
let announced = "";

export async function checkUpdate(manual = false) {
  if (!inTauri) return;
  if (manual) useUpdate.setState({ status: tt("Denetleniyor…") });
  try {
    const u = await check();
    pending = u;
    useUpdate.setState({ available: u?.version ?? null, status: u ? "" : tt("Güncel") });
    if (u && announced !== u.version) {
      announced = u.version;
      useNook.getState().pushToast({ kind: "update", title: tt("Yeni sürüm: {0}", u.version), detail: tt("Ayarlar › Güncelle"), ms: 7000 });
    }
  } catch (e) {
    // Henüz yayın yoksa ya da internet yoksa sessizce geç; elle denetlendiyse söyle
    useUpdate.setState({ status: manual ? tt("Denetlenemedi") : "" });
    console.warn("[nook] güncelleme denetimi", e);
  }
}

export async function installUpdate() {
  // Studio gibi öbür pencerelerden: kurulumu ada yapar (kapsül orada, uygulamayı o kapatıp açar)
  if (inTauri && !isPrimary) {
    useUpdate.setState({ progress: 0, status: "" });
    return void emitTo("island", INSTALL_EVENT, null).catch(() => {});
  }
  if (useUpdate.getState().progress !== null && useUpdate.getState().progress! > 0 && !useUpdate.getState().demo) return;
  // Deneme sürüyorsa gerçek kurulum onun yerine geçer
  window.clearInterval(demoTimer);
  useUpdate.setState({ demo: null });
  if (!pending) pending = await check().catch(() => null);
  if (!pending) return void share({ progress: null, status: tt("Güncel") });
  let total = 0;
  let got = 0;
  useNook.getState().setBrief(false);
  share({ progress: 0, restarting: false, available: pending.version, status: "" });
  try {
    await pending.download((ev) => {
      if (ev.event === "Started") total = ev.data.contentLength ?? 0;
      else if (ev.event === "Progress") {
        got += ev.data.chunkLength;
        const p = total ? Math.min(99, Math.round((got / total) * 100)) : 0;
        if (p !== useUpdate.getState().progress) share({ progress: p });
      }
    });
    share({ progress: 100, restarting: true });
    await new Promise((r) => window.setTimeout(r, FAREWELL_MS));
    // Sessiz kurulum: Windows'ta uygulama burada kapanır, kurulum bitince yeni sürüm açılır
    await pending.install();
    await relaunch();
  } catch (e) {
    share({ progress: null, restarting: false, status: tt("Kurulamadı") });
    console.warn("[nook] güncelleme kurulumu", e);
  }
}

let demoTimer = 0;

/**
 * Güncelleme animasyonunu adada dene: kapalı ada güncelleme kapsülüne dönüşür, sahte ilerleme dolar,
 * "bitti" anı oynar, ada eski hâline döner. Studio'dan çağrılınca adaya iletilir. Gerçek güncelleme sürerken olmaz.
 */
export function playUpdateDemo(anim: UpdateAnimId) {
  if (inTauri && !isPrimary) return void emitTo("island", DEMO_EVENT, anim).catch(() => {});
  const u = useUpdate.getState();
  if (u.progress !== null && !u.demo) return;
  window.clearInterval(demoTimer);
  const start = performance.now();
  useUpdate.setState({ demo: anim, progress: 0, restarting: false });
  demoTimer = window.setInterval(() => {
    const t = performance.now() - start;
    if (t < DEMO_DOWNLOAD_MS) {
      const x = t / DEMO_DOWNLOAD_MS;
      useUpdate.setState({ progress: Math.min(99, Math.round((x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2) * 100)) });
    } else if (t < DEMO_DOWNLOAD_MS + FAREWELL_MS) {
      useUpdate.setState({ progress: 100, restarting: true });
    } else {
      window.clearInterval(demoTimer);
      useUpdate.setState({ demo: null, progress: null, restarting: false });
    }
  }, 80);
}

/** Açılıştan biraz sonra ve 6 saatte bir denetle (yalnızca ana ada). Studio'dan gelen "kur" isteğini de dinler. */
export function useUpdateCheck() {
  useEffect(() => {
    if (!inTauri) return;
    void getVersion().then((current) => useUpdate.setState({ current }));
    if (!isPrimary) return;
    const first = window.setTimeout(() => void checkUpdate(), FIRST_CHECK_MS);
    const every = window.setInterval(() => void checkUpdate(), CHECK_EVERY_MS);
    const off = subscribe(INSTALL_EVENT, () => void installUpdate());
    const offDemo = subscribe<UpdateAnimId>(DEMO_EVENT, (a) => playUpdateDemo(a));
    return () => {
      offDemo();
      window.clearTimeout(first);
      window.clearInterval(every);
      off();
    };
  }, []);
}
