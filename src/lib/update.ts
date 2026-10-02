/**
 * Kendini güncelleme: GitHub Releases'taki latest.json'a bakar (adres tauri.conf.json'da).
 * Yeni sürüm varsa kart gösterir; Ayarlar'dan tek tıkla indirip kurar ve yeniden başlar.
 * İndirilen kurulum dosyası imzalı — imza tutmazsa kurulmaz.
 */
import { useEffect } from "react";
import { create } from "zustand";
import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { inTauri, isPrimary } from "./bridge";
import { useNook } from "../store/nook";

const FIRST_CHECK_MS = 30_000;
const CHECK_EVERY_MS = 6 * 3600_000;

interface UpdateState {
  current: string;
  /** Bulunan yeni sürüm */
  available: string | null;
  /** İndirme ilerlemesi (0–100); null = indirmiyor */
  progress: number | null;
  /** Son denetimin sonucu ("Güncel", hata…) */
  status: string;
}

export const useUpdate = create<UpdateState>(() => ({ current: "", available: null, progress: null, status: "" }));

let pending: Update | null = null;
let announced = "";

export async function checkUpdate(manual = false) {
  if (!inTauri) return;
  if (manual) useUpdate.setState({ status: "Denetleniyor…" });
  try {
    const u = await check();
    pending = u;
    useUpdate.setState({ available: u?.version ?? null, status: u ? "" : "Güncel" });
    if (u && announced !== u.version) {
      announced = u.version;
      useNook.getState().pushToast({ kind: "update", title: `Yeni sürüm: ${u.version}`, detail: "Ayarlar › Güncelle", ms: 7000 });
    }
  } catch (e) {
    // Henüz yayın yoksa ya da internet yoksa sessizce geç; elle denetlendiyse söyle
    useUpdate.setState({ status: manual ? "Denetlenemedi" : "" });
    console.warn("[nook] güncelleme denetimi", e);
  }
}

export async function installUpdate() {
  if (!pending) return;
  let total = 0;
  let got = 0;
  useUpdate.setState({ progress: 0 });
  try {
    await pending.downloadAndInstall((ev) => {
      if (ev.event === "Started") total = ev.data.contentLength ?? 0;
      else if (ev.event === "Progress") {
        got += ev.data.chunkLength;
        if (total) useUpdate.setState({ progress: Math.round((got / total) * 100) });
      }
    });
    await relaunch();
  } catch (e) {
    useUpdate.setState({ progress: null, status: "Kurulamadı" });
    console.warn("[nook] güncelleme kurulumu", e);
  }
}

/** Açılıştan biraz sonra ve 6 saatte bir denetle (yalnızca ana ada). */
export function useUpdateCheck() {
  useEffect(() => {
    if (!inTauri) return;
    void getVersion().then((current) => useUpdate.setState({ current }));
    if (!isPrimary) return;
    const first = window.setTimeout(() => void checkUpdate(), FIRST_CHECK_MS);
    const every = window.setInterval(() => void checkUpdate(), CHECK_EVERY_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, []);
}
