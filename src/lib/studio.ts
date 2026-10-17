/**
 * Nook Studio: ayarlar, görünüm, kısayol tuşları, modüller, karne, yıl özeti ve yama notları ayrı bir
 * masaüstü penceresinde. Ada hafif kalır; ağır sayfalar burada geniş alanda açılır.
 * Bölüm adresi: "home" | "look" | "keys" | "modules" | "argus" | "report" | "year" | "notes" | "settings"
 * ya da "settings:<bölüm başlığı>" (o ayara kaydırır), "notes:<sürüm>" (o sürümün notu).
 */
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { EVENTS, inTauri, openStudioWindow, subscribe, windowLabel } from "./bridge";
import { useNook } from "../store/nook";
import { exitBig } from "./big";

export type StudioPage = "home" | "look" | "keys" | "modules" | "argus" | "report" | "year" | "notes" | "settings" | "tour";
export const STUDIO_PAGES: StudioPage[] = ["home", "look", "keys", "modules", "argus", "report", "year", "notes", "settings", "tour"];

export const isStudio = windowLabel === "studio" || (import.meta.env.DEV && new URLSearchParams(location.search).get("preview") === "studio");

/** Ada kapanma animasyonu bu kadar sürer; Studio ondan sonra gelir */
const COLLAPSE_MS = 340;

/**
 * Adadan Studio'yu aç: önce ada animasyonla kapanır (imleç üstünde olsa da; çıkıp yeniden gelince
 * açılır), sonra Studio penceresi öne gelir. Studio zaten açıksa da aynı geçiş.
 */
export function openStudio(section: string = "home") {
  const s = useNook.getState();
  const open = () => void openStudioWindow(section).catch((e) => useNook.getState().pushToast({ kind: "chat", title: "Nook Studio", detail: String(e), ms: 4000 }));
  // Studio'nun kendi içinden (ya da önizlemeden) çağrıldıysa kapatılacak ada yok
  if (isStudio) return open();
  if (s.searching) s.setSearching(false);
  exitBig();
  s.setPinned(false);
  s.setHovered(false);
  window.setTimeout(open, COLLAPSE_MS);
}

/** "settings:Kısayollar" → { page: "settings", arg: "Kısayollar" } */
export function parseSection(raw: string): { page: StudioPage; arg: string | null } {
  const [p, ...rest] = decodeURIComponent(raw).split(":");
  const page = (STUDIO_PAGES as string[]).includes(p) ? (p as StudioPage) : "home";
  return { page, arg: rest.length ? rest.join(":") : null };
}

/** Studio içinde bir sayfaya geç (adres #'i değişir; geri tuşu gerekmez) */
export function studioGo(page: StudioPage, arg: string | null = null) {
  location.hash = encodeURIComponent(arg ? `${page}:${arg}` : page);
}

/** Studio'nun açık sayfası: adresin #'inden okunur; adadan "şuraya git" gelince # değişir */
export function useStudioRoute() {
  const [route, setRoute] = useState(() => parseSection(location.hash.slice(1) || "home"));
  useEffect(() => subscribe<string>(EVENTS.studioGo, (sec) => (location.hash = encodeURIComponent(sec))), []);
  // Pencere yeni açıldıysa adanın istediği bölüm Rust'ta bekliyor
  useEffect(() => {
    if (inTauri) void invoke<string | null>("studio_take_section").then((sec) => sec && (location.hash = encodeURIComponent(sec)));
  }, []);
  useEffect(() => {
    const onHash = () => setRoute(parseSection(location.hash.slice(1) || "home"));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return { ...route, go: studioGo };
}
