/**
 * Uygulamada konsol görünmediği için uyarı/hatalar %LOCALAPPDATA%\Nook\logs\<gün>.log dosyasına da yazılır.
 * `note()` ile önemli adımlar (çeviri, ekrana sor…) iz bırakır.
 */
import { invoke } from "@tauri-apps/api/core";
import { inTauri, windowLabel } from "./bridge";

const send = (level: string, args: unknown[]) => {
  if (!inTauri) return;
  const msg = args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : typeof a === "string" ? a : safe(a))).join(" ");
  void invoke("log_line", { level, msg }).catch(() => {});
};

function safe(v: unknown) {
  try {
    return JSON.stringify(v).slice(0, 400);
  } catch {
    return String(v);
  }
}

export const note = (...args: unknown[]) => send("info", args);

export function installLogging() {
  if (!inTauri) return;
  const warn = console.warn.bind(console);
  const error = console.error.bind(console);
  console.warn = (...a: unknown[]) => {
    warn(...a);
    send("warn", a);
  };
  console.error = (...a: unknown[]) => {
    error(...a);
    send("error", a);
  };
  window.addEventListener("error", (e) => send("error", [`${e.message} @ ${e.filename}:${e.lineno}`]));
  window.addEventListener("unhandledrejection", (e) => send("error", ["unhandled", e.reason]));
  note(`sayfa başladı (${windowLabel})`, navigator.userAgent.match(/Edg\/[\d.]+/)?.[0] ?? "");
  watchFreezes();
}

/**
 * Sayfa takılırsa (saniyelik sayaç geç kalırsa) kaç saniye donduğunu yazar. Görünmeyen sayfada sayaç
 * zaten yavaşlar; iki dakikadan uzun boşluk da büyük ihtimalle uyku, sayılmaz.
 */
function watchFreezes() {
  let last = performance.now();
  // Gizliyken (tam ekran oyunda ada gizlenince) sayaç kısılır; görünür olunca o boşluk donma sayılmasın
  document.addEventListener("visibilitychange", () => {
    last = performance.now();
  });
  window.setInterval(() => {
    const now = performance.now();
    const gap = (now - last) / 1000;
    last = now;
    if (gap > 5 && gap < 120 && document.visibilityState === "visible") send("warn", [`DONMA: arayüz (${windowLabel}) ${Math.round(gap)} sn takıldı`]);
  }, 1000);
}
