import { tt } from "./i18n";
/**
 * Hassas veri koruyucusu: panoya kart numarası, IBAN, API anahtarı ya da şifre gibi bir şey
 * kopyalanınca Nook uyarır, Pano geçmişine eklemez ve bir süre sonra panodan siler.
 * Tanıma yalnızca bu bilgisayarda yapılır; metin hiçbir yere gönderilmez, kayda yazılmaz.
 */

export type SensitiveKind = "card" | "iban" | "key" | "password";

export const SENSITIVE_LABEL: Record<SensitiveKind, string> = {
  card: tt("Kart numarası"),
  iban: "IBAN",
  key: tt("API anahtarı"),
  password: tt("Şifre"),
};

/** Kart numarası sağlaması (Luhn) */
function luhn(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** IBAN sağlaması (mod 97 = 1) */
function ibanValid(iban: string) {
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1;
}

const KEY_PATTERNS = [
  /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/, // OpenAI, Anthropic
  /\bAIza[0-9A-Za-z_-]{35}\b/, // Google / Gemini
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/, // GitHub
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/, // Slack
  /\bAKIA[0-9A-Z]{16}\b/, // AWS
  /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/,
  /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/, // Stripe
];

/** Metin hassas mi? Uzun metinlerde (bir paragrafın içinde geçen numara) de arar. */
export function detectSensitive(text: string): SensitiveKind | null {
  const t = text.trim();
  if (!t || t.length > 4000) return null;

  if (KEY_PATTERNS.some((r) => r.test(t))) return "key";

  // Kart: 13–19 hane (boşluk/tire olabilir), Luhn tutmalı, bilinen bir kart ağıyla başlamalı
  for (const m of t.matchAll(/(?:\d[ -]?){13,19}/g)) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length >= 13 && digits.length <= 19 && /^[3-6]/.test(digits) && luhn(digits)) return "card";
  }

  // IBAN: iki harf + iki rakam + 11–30 karakter, boşluklu da olabilir
  for (const m of t.toUpperCase().matchAll(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){11,30}\b/g)) {
    const iban = m[0].replace(/ /g, "");
    if (iban.length >= 15 && iban.length <= 34 && ibanValid(iban)) return "iban";
  }

  // Şifre: tek parça, 10–64 karakter, büyük + küçük harf + rakam + sembol (adres, yol, cümle değil)
  if (
    !/\s/.test(t) &&
    t.length >= 10 &&
    t.length <= 64 &&
    /[a-z]/.test(t) &&
    /[A-Z]/.test(t) &&
    /\d/.test(t) &&
    /[^A-Za-z0-9]/.test(t) &&
    !/^(https?:|www\.|[A-Za-z]:\\|\/)/i.test(t) &&
    !/@.+\./.test(t)
  )
    return "password";

  return null;
}

/** Hassas veri panoda bu kadar kalır */
export const SENSITIVE_CLEAR_MS = 60_000;
