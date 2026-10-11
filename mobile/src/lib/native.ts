/**
 * Android tarafı (MainActivity.kt / NookBridge.kt): window.NookNative. Tarayıcı önizlemesinde yok;
 * her çağıran bunun yokluğunu hesaba katar. Uzun işlerin sonucu window.__nookNative(olay, veri) ile gelir.
 */

interface NookNativeApi {
  setPairing(json: string): void;
  flushOutbox(): void;
  netInfo(): string;
  tailscaleInstalled(): boolean;
  tailscaleUp(): boolean;
  tailscaleDown(): boolean;
  openTailscale(): void;
  installApk(url: string): void;
  saveImage(b64: string, name: string): string;
  shareImage(b64: string, name: string): void;
  notifAccess(): boolean;
  openNotifAccess(): void;
  notifPrefs(): string;
  setNotifPrefs(json: string): void;
  peekShare(): string;
  clearShare(): void;
  uploadShared(host: string): void;
}

export const native: NookNativeApi | undefined = (window as unknown as { NookNative?: NookNativeApi }).NookNative;

type Listener = (data: Record<string, unknown>) => void;
const listeners = new Map<string, Set<Listener>>();
(window as unknown as { __nookNative: (ev: string, data?: Record<string, unknown>) => void }).__nookNative = (ev, data) => {
  listeners.get(ev)?.forEach((l) => l(data ?? {}));
};

/** Android'den gelen olay ("apk", "upload", "share", "resume"); dönen fonksiyon aboneliği bırakır */
export function onNative(ev: string, fn: Listener) {
  let set = listeners.get(ev);
  if (!set) listeners.set(ev, (set = new Set()));
  set.add(fn);
  return () => void set.delete(fn);
}

export interface NetInfo {
  online: boolean;
  wifi: boolean;
  cell: boolean;
  /** Bir VPN (Tailscale) açık */
  vpn: boolean;
  /** Telefonun Wi-Fi'deki adresleri */
  ips: string[];
}

export function netInfo(): NetInfo | null {
  try {
    return native ? (JSON.parse(native.netInfo()) as NetInfo) : null;
  } catch {
    return null;
  }
}

/** Telefon PC'yle aynı ev ağında mı (ilk üç bölüm aynı); bilinmiyorsa null */
export function onHomeLan(hosts: string[]): boolean | null {
  const n = netInfo();
  if (!n) return null;
  if (!n.wifi) return false;
  const lan = hosts.filter((h) => !h.startsWith("100.")).map((h) => h.split(".").slice(0, 3).join("."));
  return n.ips.some((ip) => lan.includes(ip.split(".").slice(0, 3).join(".")));
}

/** Blob → base64 (yerel köprüye görsel aktarmak için) */
export function blobBase64(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}
