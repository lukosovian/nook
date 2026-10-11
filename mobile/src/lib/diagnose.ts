/**
 * PC'ye ulaşılamayınca nedenini telefonun ağ durumundan çıkarır: ev ağında mı, Tailscale kurulu ve açık mı.
 * Ana sayfadaki kart bunu söyler ve yapılacak tek adımı düğme olarak verir.
 */
import { native, netInfo, onHomeLan } from "./native";
import type { Pairing } from "./pc";

export type FixAction = "wake" | "tailscale-store" | "tailscale-open" | "none";

export interface Diagnosis {
  title: string;
  detail: string;
  action: FixAction;
  /** Uyandırma da denenebilir mi (dışarıdayken modem ayarlıysa) */
  canWake: boolean;
}

const hasTs = (p: Pairing) => p.hosts.some((h) => h.startsWith("100."));

export function diagnose(p: Pairing): Diagnosis {
  const net = netInfo();
  if (!net)
    return { title: "PC'ye ulaşılamıyor", detail: "PC kapalı ya da uykuda olabilir.", action: "wake", canWake: true };
  if (!net.online) return { title: "Telefonda internet yok", detail: "Wi-Fi'ye ya da mobil veriye bağlan.", action: "none", canWake: false };
  const home = onHomeLan(p.hosts);
  if (home)
    return {
      title: "PC kapalı ya da uykuda",
      detail: "Aynı Wi-Fi'desin ama PC yanıt vermiyor. PC açıksa Nook kapalı olabilir; PC'yi aç düğmesi uyandırır.",
      action: "wake",
      canWake: true,
    };
  // Ev ağında değil
  if (!hasTs(p))
    return {
      title: "Evden uzaktasın",
      detail: "Dışarıdan bağlanmak için PC'de Tailscale gerekli: PC açıkken Nook › Ayarlar › Telefon › Evden uzaktayken bağlanma'dan kur. O zamana kadar yalnızca evden bağlanabilirsin.",
      action: p.wan ? "wake" : "none",
      canWake: !!p.wan,
    };
  if (!native?.tailscaleInstalled())
    return {
      title: "Telefonda Tailscale yok",
      detail: "Evden uzaktayken PC'ye Tailscale üzerinden bağlanılır. Kur ve PC'dekiyle aynı hesapla giriş yap; sonrasını Nook kendisi açıp kapatır.",
      action: "tailscale-store",
      canWake: !!p.wan,
    };
  if (!net.vpn)
    return {
      title: "Tailscale açılamadı",
      detail: "Nook Tailscale'i açmayı denedi ama olmadı. Tailscale'i aç ve “Connect”e bas; bir kez izin verince sonrakiler kendiliğinden olur.",
      action: "tailscale-open",
      canWake: !!p.wan,
    };
  return {
    title: "PC kapalı ya da uykuda",
    detail: p.wan
      ? "Tailscale açık ama PC yanıt vermiyor. PC'yi aç düğmesi uyandırma paketini evin modemine gönderir."
      : "Tailscale açık ama PC yanıt vermiyor. Dışarıdan açmak için PC'de “Evden uzaktayken de açılabilsin”i aç.",
    action: p.wan ? "wake" : "none",
    canWake: !!p.wan,
  };
}

/** Evden uzaktaysa ve Tailscale kapalıysa açar (Nook açtıysa Nook kapanınca kapanır). Açtıysa true. */
export function ensureTunnel(p: Pairing): boolean {
  if (!native || !hasTs(p)) return false;
  if (onHomeLan(p.hosts) !== false) return false;
  const net = netInfo();
  if (!net?.online || net.vpn) return false;
  try {
    return native.tailscaleInstalled() && native.tailscaleUp();
  } catch {
    return false;
  }
}
