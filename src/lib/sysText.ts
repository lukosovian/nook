/**
 * Rust'tan gelen olay kartları (şarj, USB, Bluetooth, internet…) Türkçe metinle gelir; burada seçili dile
 * çevrilir. Başlıklar sabit, ayrıntılardaki sayılar ("%45 kaldı") kalıpla ayrılır.
 */
import type { SysEvent } from "./bridge";
import { tt } from "./i18n";

/** Rust'taki başlıklar (çeviri anahtarı olarak burada da geçsinler) */
const TITLES: Record<string, () => string> = {
  "Şarj oluyor": () => tt("Şarj oluyor"),
  "Şarj kablosu çıkarıldı": () => tt("Şarj kablosu çıkarıldı"),
  "Pil azalıyor": () => tt("Pil azalıyor"),
  "USB takıldı": () => tt("USB takıldı"),
  "USB çıkarıldı": () => tt("USB çıkarıldı"),
  "Kulaklık bağlandı": () => tt("Kulaklık bağlandı"),
  "Ses çıkışı değişti": () => tt("Ses çıkışı değişti"),
  "Mouse pili azalıyor": () => tt("Mouse pili azalıyor"),
  "Kulaklık pili azalıyor": () => tt("Kulaklık pili azalıyor"),
  "Kulaklık şarj oluyor": () => tt("Kulaklık şarj oluyor"),
  "Kulaklık tam dolu": () => tt("Kulaklık tam dolu"),
  "Vantilatör açıldı": () => tt("Vantilatör açıldı"),
  "Vantilatör kapandı": () => tt("Vantilatör kapandı"),
  "İnternet geri geldi": () => tt("İnternet geri geldi"),
  "İnternet koptu": () => tt("İnternet koptu"),
  "Bluetooth bağlandı": () => tt("Bluetooth bağlandı"),
  "Bluetooth ayrıldı": () => tt("Bluetooth ayrıldı"),
};

const DETAILS: Record<string, () => string> = {
  "Şarjdan çıkarabilirsin": () => tt("Şarjdan çıkarabilirsin"),
  "Bağlantı tamam": () => tt("Bağlantı tamam"),
  "Bağlantı yok": () => tt("Bağlantı yok"),
};

function detail(d: string) {
  if (DETAILS[d]) return DETAILS[d]();
  let m = /^%(\d+) kaldı$/.exec(d);
  if (m) return tt("%{0} kaldı", Number(m[1]));
  m = /^%(\d+) pil$/.exec(d);
  if (m) return tt("%{0} pil", Number(m[1]));
  m = /^%(\d+)$/.exec(d);
  if (m) return tt("%{0}", Number(m[1]));
  m = /^Hız (\d+)$/.exec(d);
  if (m) return tt("Hız {0}", Number(m[1]));
  return d;
}

export function localizeEvent<T extends SysEvent>(e: T): T {
  return { ...e, title: TITLES[e.title]?.() ?? e.title, detail: e.detail ? detail(e.detail) : e.detail };
}
