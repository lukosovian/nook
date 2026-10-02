/**
 * Arama için çevrimiçi yardımcılar (anahtar gerektirmeyen ücretsiz servisler):
 *  - Döviz: open.er-api.com (6 saatte bir önbelleklenir) — "100 usd tl", "50 euro kaç tl"
 *  - Çeviri: MyMemory — "en: merhaba dünya", "tr: good morning", "çevir: hello"
 */
import { formatNumber } from "./calc";

const CURRENCY_ALIASES: Record<string, string> = {
  tl: "TRY",
  try: "TRY",
  lira: "TRY",
  "₺": "TRY",
  dolar: "USD",
  usd: "USD",
  $: "USD",
  euro: "EUR",
  avro: "EUR",
  eur: "EUR",
  "€": "EUR",
  sterlin: "GBP",
  gbp: "GBP",
  "£": "GBP",
  yen: "JPY",
  jpy: "JPY",
  frank: "CHF",
  chf: "CHF",
  ruble: "RUB",
  rub: "RUB",
  manat: "AZN",
  azn: "AZN",
  riyal: "SAR",
  sar: "SAR",
  yuan: "CNY",
  cny: "CNY",
};

const CURRENCY_RE = /^\s*([\d.,]+)\s*([a-zA-Z₺$€£çğıöşü]+)\s*(?:to|in|->|=|kaç|kac|ne kadar)?\s*([a-zA-Z₺$€£çğıöşü]+)?\s*\??\s*$/i;

let rates: { base: string; at: number; table: Record<string, number> } | null = null;

async function usdRates(): Promise<Record<string, number>> {
  if (rates && Date.now() - rates.at < 6 * 3600_000) return rates.table;
  const r = await fetch("https://open.er-api.com/v6/latest/USD");
  const j = (await r.json()) as { result: string; rates: Record<string, number> };
  if (j.result !== "success") throw new Error("kur alınamadı");
  rates = { base: "USD", at: Date.now(), table: j.rates };
  return j.rates;
}

export function parseCurrency(q: string): { amount: number; from: string; to: string } | null {
  const m = CURRENCY_RE.exec(q);
  if (!m) return null;
  const from = CURRENCY_ALIASES[m[2].toLowerCase()] ?? (/^[A-Z]{3}$/i.test(m[2]) ? m[2].toUpperCase() : null);
  const toRaw = m[3]?.toLowerCase();
  const to = toRaw ? (CURRENCY_ALIASES[toRaw] ?? (/^[a-z]{3}$/i.test(toRaw) ? toRaw.toUpperCase() : null)) : "TRY";
  const amount = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  // En az bir taraf bilinen bir para birimi olmalı (yoksa "10 km mi" gibi şeyler kur sanılır)
  if (!from || !to || from === to || !Number.isFinite(amount)) return null;
  if (!(m[2].toLowerCase() in CURRENCY_ALIASES) && !(toRaw && toRaw in CURRENCY_ALIASES)) return null;
  return { amount, from, to };
}

export async function convertCurrency(q: string): Promise<{ text: string; value: string } | null> {
  const p = parseCurrency(q);
  if (!p) return null;
  const table = await usdRates();
  const a = table[p.from];
  const b = table[p.to];
  if (!a || !b) return null;
  const v = (p.amount / a) * b;
  const value = formatNumber(+v.toFixed(2));
  return { text: `${formatNumber(p.amount)} ${p.from} = ${value} ${p.to}`, value };
}

const TRANSLATE_RE = /^(en|tr|de|fr|es|ru|ar|çevir|cevir|translate)\s*[:：]\s*(.+)$/i;

export async function translate(q: string): Promise<{ text: string; pair: string } | null> {
  const m = TRANSLATE_RE.exec(q.trim());
  if (!m) return null;
  const cmd = m[1].toLowerCase();
  const text = m[2].trim();
  // "çevir:" → Türkçe görünüyorsa İngilizceye, değilse Türkçeye
  const looksTurkish = /[çğıöşüÇĞİÖŞÜ]/.test(text) || /\b(ve|bir|bu|ne|için|merhaba|nasıl)\b/i.test(text);
  const target = ["çevir", "cevir", "translate"].includes(cmd) ? (looksTurkish ? "en" : "tr") : cmd;
  const source = target === "tr" ? "en" : "tr";
  const r = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`,
  );
  const j = (await r.json()) as { responseData?: { translatedText?: string } };
  const out = j.responseData?.translatedText;
  return out ? { text: out, pair: `${source.toUpperCase()} → ${target.toUpperCase()}` } : null;
}
