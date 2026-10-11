/**
 * Nook Mobil güncellemesi: PC'deki Nook'la aynı GitHub sürümüne NookMobil.apk eklenir (nook.ps1 -Yayinla).
 * Uygulama açılınca en son sürüme bakar; daha yeniyse ana sayfada "Güncelle" kartı çıkar. APK tarayıcıyla
 * indirilir, Android kurulum ekranını açar (ilk seferde "bilinmeyen uygulamaları yükle" izni ister).
 */
import { useEffect, useState } from "react";

const LATEST = "https://api.github.com/repos/lukosovian/nook/releases/latest";
const ASSET = "NookMobil.apk";
/** Aynı oturumda en fazla bu sıklıkla sorulur (GitHub saatte 60 isteğe izin veriyor) */
const EVERY_MS = 6 * 3600_000;

export interface MobileUpdate {
  version: string;
  url: string;
  notes: string;
}

function newer(a: string, b: string) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  }
  return false;
}

async function appVersion() {
  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    return await getVersion();
  } catch {
    return null;
  }
}

export async function checkUpdate(): Promise<MobileUpdate | null> {
  const current = await appVersion();
  if (!current) return null;
  const r = await fetch(LATEST, { headers: { Accept: "application/vnd.github+json" } });
  if (!r.ok) return null;
  const rel = (await r.json()) as { tag_name: string; body?: string; assets?: { name: string; browser_download_url: string }[] };
  const version = rel.tag_name.replace(/^v/, "");
  const apk = rel.assets?.find((a) => a.name === ASSET);
  if (!apk || !newer(version, current)) return null;
  return { version, url: apk.browser_download_url, notes: rel.body ?? "" };
}

/** APK'yı tarayıcıyla indirir; indirme bitince Android kurulum ekranı açılır */
export async function installUpdate(u: MobileUpdate) {
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(u.url);
  } catch {
    window.open(u.url, "_blank");
  }
}

export function useMobileUpdate() {
  const [update, setUpdate] = useState<MobileUpdate | null>(null);
  useEffect(() => {
    let last = 0;
    const tick = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < EVERY_MS) return;
      last = Date.now();
      checkUpdate()
        .then(setUpdate)
        .catch(() => {});
    };
    tick();
    document.addEventListener("visibilitychange", tick);
    return () => document.removeEventListener("visibilitychange", tick);
  }, []);
  return update;
}
