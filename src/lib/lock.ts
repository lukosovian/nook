/**
 * Parola kilidi: gizlilik kalkanı kilitliyken yalnızca parolayla kalkar. Parolanın kendisi değil,
 * tuzlu SHA-256 özeti saklanır ("tuz:özet"). Bilgisayar yeni açıldıysa (Nook açılışla başladıysa)
 * kalkan parola sorarak açılır.
 */
import { useEffect } from "react";
import { isPrimary, releaseFocus, setGate, subscribe, systemUptime } from "./bridge";
import { useNook } from "../store/nook";
import { micClick } from "./clickSound";
import { tt } from "./i18n";

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function digest(salt: string, password: string) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${password}`)));
}

export async function hashPassword(password: string) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  return `${salt}:${await digest(salt, password)}`;
}

export async function checkPassword(password: string, stored: string) {
  const [salt, want] = stored.split(":");
  if (!salt || !want) return false;
  return (await digest(salt, password)) === want;
}

/** Bilgisayar açıldıktan sonra Nook bu kadar içinde başladıysa "açılış" sayılır */
const BOOT_WINDOW_SEC = 10 * 60;
const BOOT_KEY = "nook-lock-boot";

/** Açılış kilidi sürüyor (sayfa yenilense de kilit kalksın diye oturumda tutulur) */
const GATE_KEY = "nook-gate";

/**
 * Açılış kilidi: Nook bilgisayarla birlikte başladıysa ada parola sorar; yazılana kadar Nook'un
 * hiçbir bölümü açılmaz (diğer adalar ve yan kartlar da kapalı). Tam ekran kalkan açılmaz — açılışta
 * ağır sahneler ve ses aygıtı hazır olmadan kalkan bilgisayarı kilitliyordu. Aynı açılışta bir kez
 * (Nook güncellenip yeniden başlarsa tekrar kilitlemez). Günün karşılaması parola yazılınca gelir.
 */
export async function bootLock() {
  const s = useNook.getState().settings;
  if (!s.lockEnabled || !s.lockHash || !s.lockOnBoot) return;
  let pending = false;
  try {
    pending = sessionStorage.getItem(GATE_KEY) === "1";
  } catch {
    // önemsiz
  }
  if (!pending) {
    const up = await systemUptime().catch(() => Infinity);
    if (up > BOOT_WINDOW_SEC) return;
    // Açılış anı (dakikaya yuvarlı): aynıysa bu açılışta zaten kilitlendi
    const boot = String(Math.round((Date.now() / 1000 - up) / 60));
    try {
      if (localStorage.getItem(BOOT_KEY) === boot) return;
      localStorage.setItem(BOOT_KEY, boot);
      sessionStorage.setItem(GATE_KEY, "1");
    } catch {
      // depolama yoksa yine de kilitle
    }
  }
  useNook.getState().setGate(true);
  await setGate(true).catch(() => undefined);
}

/** Doğru parola yazıldı: Nook açılır */
export function openGate() {
  try {
    sessionStorage.removeItem(GATE_KEY);
  } catch {
    // önemsiz
  }
  useNook.getState().setGate(false);
  void setGate(false).catch(() => undefined);
  void releaseFocus().catch(() => undefined);
}

/**
 * Kalkan kalkınca mikrofon yeniden açıldı (Rust bildirir): adada kısa bir kart ve klik sesi
 * (Ayarlar'dan kapatılabilir).
 */
export function useShieldMicFeed() {
  useEffect(() => {
    if (!isPrimary) return;
    return subscribe<boolean>("nook://shield-mic", (muted) => {
      const s = useNook.getState();
      if (!s.settings.shieldMicFx || muted) return;
      micClick(true);
      s.pushToast({ kind: "mic", title: tt("Mikrofon yeniden açık"), detail: tt("Kalkan kalkınca eski hâline döndü"), ms: 3500 });
    });
  }, []);
}
