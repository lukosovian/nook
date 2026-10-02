/** Birim çevirici: "10 km mi", "5 kg to lb", "100 f c", "2 gb mb", "90 dk sa" */
import { formatNumber } from "./calc";

type Unit = { group: string; factor: number; label: string };

const U = (group: string, factor: number, label: string, ...aliases: string[]) =>
  aliases.map((a) => [a, { group, factor, label }] as const);

const UNITS = new Map<string, Unit>([
  // uzunluk (m)
  ...U("length", 0.001, "mm", "mm"),
  ...U("length", 0.01, "cm", "cm"),
  ...U("length", 1, "m", "m", "metre", "meter"),
  ...U("length", 1000, "km", "km"),
  ...U("length", 0.0254, "inç", "in", "inch", "inç", "inc"),
  ...U("length", 0.3048, "ft", "ft", "feet", "foot", "fit"),
  ...U("length", 0.9144, "yd", "yd", "yard"),
  ...U("length", 1609.344, "mil", "mi", "mile", "mil"),
  // ağırlık (kg)
  ...U("mass", 1e-6, "mg", "mg"),
  ...U("mass", 0.001, "g", "g", "gr", "gram"),
  ...U("mass", 1, "kg", "kg", "kilo"),
  ...U("mass", 1000, "ton", "t", "ton"),
  ...U("mass", 0.45359237, "lb", "lb", "lbs", "pound"),
  ...U("mass", 0.028349523125, "oz", "oz", "ons"),
  // veri (bayt)
  ...U("data", 0.125, "bit", "bit"),
  ...U("data", 1, "B", "b", "byte", "bayt"),
  ...U("data", 1024, "KB", "kb"),
  ...U("data", 1024 ** 2, "MB", "mb"),
  ...U("data", 1024 ** 3, "GB", "gb"),
  ...U("data", 1024 ** 4, "TB", "tb"),
  // zaman (sn)
  ...U("time", 0.001, "ms", "ms"),
  ...U("time", 1, "sn", "s", "sn", "saniye", "sec"),
  ...U("time", 60, "dk", "dk", "min", "dakika"),
  ...U("time", 3600, "sa", "sa", "h", "saat", "hour"),
  ...U("time", 86400, "gün", "gün", "gun", "day", "d"),
  ...U("time", 604800, "hafta", "hafta", "week", "wk"),
  // hız (m/s)
  ...U("speed", 1, "m/s", "m/s", "mps"),
  ...U("speed", 1 / 3.6, "km/sa", "km/h", "kmh", "km/sa", "kmsa"),
  ...U("speed", 0.44704, "mph", "mph"),
  ...U("speed", 0.514444, "knot", "knot", "kn", "knots"),
  // hacim (L)
  ...U("volume", 0.001, "ml", "ml"),
  ...U("volume", 1, "L", "l", "lt", "litre", "liter"),
  ...U("volume", 3.785411784, "gal", "gal", "galon", "gallon"),
  ...U("volume", 0.2365882365, "cup", "cup", "fincan"),
  // sıcaklık (özel)
  ...U("temp", 0, "°C", "c", "°c", "celsius", "santigrat"),
  ...U("temp", 0, "°F", "f", "°f", "fahrenheit"),
  ...U("temp", 0, "K", "k", "kelvin"),
]);

function toCelsius(v: number, unit: string) {
  return unit === "°F" ? ((v - 32) * 5) / 9 : unit === "K" ? v - 273.15 : v;
}
function fromCelsius(c: number, unit: string) {
  return unit === "°F" ? (c * 9) / 5 + 32 : unit === "K" ? c + 273.15 : c;
}

const RE = /^\s*(-?[\d.,]+)\s*([a-zA-Z°/çğıöşü]+)\s*(?:to|in|->|→|=|ise|kaç|kac)?\s*([a-zA-Z°/çğıöşü]+)\s*\??\s*$/i;

export interface Conversion {
  text: string;
  value: string;
}

export function convert(query: string): Conversion | null {
  const m = RE.exec(query);
  if (!m) return null;
  const v = parseFloat(m[1].replace(",", "."));
  const from = UNITS.get(m[2].toLowerCase());
  const to = UNITS.get(m[3].toLowerCase());
  if (!Number.isFinite(v) || !from || !to || from.group !== to.group || from.label === to.label) return null;

  const result =
    from.group === "temp" ? fromCelsius(toCelsius(v, from.label), to.label) : (v * from.factor) / to.factor;
  const value = formatNumber(+result.toFixed(6));
  return { text: `${formatNumber(v)} ${from.label} = ${value} ${to.label}`, value };
}
