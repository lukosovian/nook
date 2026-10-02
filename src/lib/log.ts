/**
 * Uygulamada konsol görünmediği için uyarı/hatalar %LOCALAPPDATA%\Nook\nook.log dosyasına da yazılır.
 * `note()` ile önemli adımlar (çeviri, ekrana sor…) iz bırakır.
 */
import { invoke } from "@tauri-apps/api/core";
import { inTauri } from "./bridge";

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
  note("başladı", navigator.userAgent.match(/Edg\/[\d.]+/)?.[0] ?? "");
}
