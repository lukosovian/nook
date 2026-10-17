/**
 * Zamanlı kapatma: bilgisayar seçilen anda kapanır, yeniden başlar ya da uyur. Zamanlayıcı Rust'ta
 * (powertimer.rs) tutulur; ada ve telefon aynı zamanlayıcıyı görür, ikisinden de kurulur/iptal edilir.
 */
import { useEffect } from "react";
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { inTauri, isPrimary, subscribe } from "./bridge";
import { useNook } from "../store/nook";
import { locale, tt } from "./i18n";
import { playAntic } from "../hooks/useAntics";

export type PowerTimerAction = "shutdown" | "restart" | "sleep";
export interface PowerTimer {
  at: number;
  action: PowerTimerAction;
  from: "pc" | "phone";
}

export const usePowerTimer = create<{ timer: PowerTimer | null }>(() => ({ timer: null }));

export const ACTION_LABEL: Record<PowerTimerAction, string> = {
  shutdown: tt("Kapat"),
  restart: tt("Yeniden başlat"),
  sleep: tt("Uyku"),
};
/** "… kapanacak" cümlesi için */
const ACTION_VERB: Record<PowerTimerAction, string> = {
  shutdown: tt("kapanacak"),
  restart: tt("yeniden başlayacak"),
  sleep: tt("uyuyacak"),
};

/** Tarayıcı önizlemesinde Rust yok: zamanlayıcı yalnızca bellekte */
export async function setPowerTimer(at: number | null, action: PowerTimerAction = "shutdown") {
  if (!inTauri) {
    usePowerTimer.setState({ timer: at ? { at, action, from: "pc" } : null });
    return;
  }
  const t = await invoke<PowerTimer | null>("power_timer_set", { at, action });
  usePowerTimer.setState({ timer: t });
}

/** "23:30'da kapanacak · 42 dk" */
export function timerLine(t: PowerTimer, now = Date.now()) {
  const at = new Date(t.at).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
  return tt("{0}'da {1} · {2}", at, ACTION_VERB[t.action], leftText(t.at - now));
}

/** Kalan süre: "1 sa 05 dk", "42 dk", "38 sn" */
export function leftText(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return tt("{0} sn", s);
  const m = Math.ceil(s / 60);
  if (m < 60) return tt("{0} dk", m);
  return tt("{0} sa {1} dk", Math.floor(m / 60), String(m % 60).padStart(2, "0"));
}

/** Kısa geri sayım (durum çubuğundaki hap): "1:05", "42 dk", "0:38" */
export function shortLeft(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `0:${String(s).padStart(2, "0")}`;
  const m = Math.ceil(s / 60);
  return m < 60 ? tt("{0} dk", m) : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/** Adada: zamanlayıcıyı Rust'tan oku, değişince güncelle; son dakikada uyar */
export function usePowerTimerFeed() {
  useEffect(() => {
    if (!inTauri) return;
    void invoke<PowerTimer | null>("power_timer_get").then((t) => usePowerTimer.setState({ timer: t }));
    const off = subscribe<PowerTimer | null>("nook://power-timer", (t) => {
      const prev = usePowerTimer.getState().timer;
      usePowerTimer.setState({ timer: t });
      // Telefondan kurulduysa adada da söylensin
      if (isPrimary && t && t.from === "phone" && (!prev || prev.at !== t.at)) {
        useNook.getState().pushToast({ kind: "power", title: tt("Telefondan zamanlı kapatma"), detail: timerLine(t), ms: 5000 });
      }
    });
    const offWarn = subscribe<PowerTimer | null>("nook://power-timer-warn", (t) => {
      if (!isPrimary || !t) return;
      useNook.getState().pushToast({
        kind: "power",
        title: tt("1 dakika sonra {0}", ACTION_VERB[t.action]),
        detail: tt("Vazgeçtiysen adada saatin yanındaki zamanlayıcıya bas"),
        ms: 12000,
      });
      playAntic("surprised");
    });
    return () => {
      off();
      offWarn();
    };
  }, []);
}
