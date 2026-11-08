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
import { resolveUpdateAnim, type UpdateAnimId } from "../components/overlays/UpdateAnims";

const FIRST_CHECK_MS = 30_000;
const CHECK_EVERY_MS = 6 * 3600_000;
/** İndirme bitince veda animasyonu bu kadar görünür, sonra kurulum başlar */
const FAREWELL_MS = 2600;
/** İndirme hızlı bitse de animasyon en az bu kadar oynar (indirmeyi yavaşlatmaz, yalnızca gösterilen ilerleme) */
const MIN_SHOW_MS = 5000;
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
  /** Bu güncellemede oynayan animasyon: ada ile Studio aynısını gösterir */
  anim: UpdateAnimId | null;
}

export const useUpdate = create<UpdateState>(() => ({ current: "", available: null, progress: null, restarting: false, status: "", demo: null, anim: null }));

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
    const u = await check({ timeout: 30_000 });
    pending = u;
    useUpdate.setState({ available: u?.version ?? null, status: u ? "" : tt("Güncel") });
    if (u && announced !== u.version) {
      announced = u.version;
      useNook.getState().pushToast({ kind: "update", title: tt("Yeni sürüm: {0}", u.version), detail: tt("Studio › Ayarlar › Hakkında'dan güncelle"), ms: 7000 });
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
  if (!pending) pending = await check({ timeout: 30_000 }).catch(() => null);
  if (!pending && !navigator.onLine) return void share({ progress: null, status: tt("İnternet bağlantısı yok; bağlanınca yeniden dene") });
  if (!pending) return void share({ progress: null, status: tt("Güncel") });
  let total = 0;
  let got = 0;
  useNook.getState().setBrief(false);
  share({ progress: 0, restarting: false, available: pending.version, status: "", anim: resolveUpdateAnim(useNook.getState().settings.updateAnim) });
  // Gösterilen ilerleme hem gerçek indirmeyi hem MIN_SHOW_MS'lik süreyi bekler: hızlı internette de animasyon görünür
  const started = Date.now();
  let real = 0;
  const show = window.setInterval(() => {
    const p = Math.min(real, Math.round(((Date.now() - started) / MIN_SHOW_MS) * 99));
    if (p !== useUpdate.getState().progress) share({ progress: p });
  }, 100);
  // Yavaş internette indirme sürebilir; ama bir dakika hiç ilerlemezse bağlantı kopmuş demektir
  let stall = 0;
  let lastByte = Date.now();
  const stalled = new Promise<never>((_, reject) => {
    stall = window.setInterval(() => Date.now() - lastByte > STALL_MS && reject(new Error("stalled")), 5000);
  });
  try {
    await Promise.race([
      pending.download((ev) => {
        lastByte = Date.now();
        if (ev.event === "Started") total = ev.data.contentLength ?? 0;
        else if (ev.event === "Progress") {
          got += ev.data.chunkLength;
          real = total ? Math.min(99, Math.round((got / total) * 100)) : 0;
        }
      }),
      stalled,
    ]);
    window.clearInterval(stall);
    real = 99;
    const left = MIN_SHOW_MS - (Date.now() - started);
    if (left > 0) await new Promise((r) => window.setTimeout(r, left + 150));
    window.clearInterval(show);
    share({ progress: 100, restarting: true });
    await new Promise((r) => window.setTimeout(r, FAREWELL_MS));
    // Sessiz kurulum: Windows'ta uygulama burada kapanır, kurulum bitince yeni sürüm açılır
    await pending.install();
    await relaunch();
  } catch (e) {
    window.clearInterval(stall);
    window.clearInterval(show);
    // Yarım kalan indirme yeniden denenince baştan, temiz bir denetimle başlasın
    pending = null;
    share({ progress: null, restarting: false, status: whyFailed(e) });
    console.warn("[nook] güncelleme kurulumu", e);
  }
}

/** İndirme bir dakika hiç ilerlemezse durmuş sayılır */
const STALL_MS = 60_000;

/** Kurulamadıysa nedeni, herkesin anlayacağı dille */
function whyFailed(e: unknown): string {
  const msg = String(e).toLowerCase();
  if (!navigator.onLine) return tt("Kurulamadı: internet bağlantısı koptu. Bağlanınca yeniden dene");
  if (msg.includes("stalled") || msg.includes("timed out") || msg.includes("timeout")) return tt("Kurulamadı: indirme durdu, bağlantı çok yavaş ya da koptu. Yeniden dene");
  if (msg.includes("signature")) return tt("Kurulamadı: indirilen dosya doğrulanamadı. Yeniden dene");
  if (msg.includes("dns") || msg.includes("connect") || msg.includes("network") || msg.includes("request")) return tt("Kurulamadı: güncelleme sunucusuna ulaşılamadı. Biraz sonra yeniden dene");
  return tt("Kurulamadı. Yeniden dene; olmazsa Nook-setup.exe'yi indirip kur");
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
