const HEX = /^#?(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const COLOR_FN = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i;

/** Kopyalanan metin bir renk mi? Öyleyse normalize edilmiş halini döner. */
export function detectColor(raw: string): string | null {
  const s = raw.trim();
  if (s.length > 48 || s.includes("\n")) return null;

  if (HEX.test(s)) {
    const body = s.replace("#", "");
    // "#" olmadan yalnızca harf içeren 6 haneli değerleri kabul et ("123456" bir sayı olabilir).
    if (!s.startsWith("#") && (body.length !== 6 || !/[a-f]/i.test(body))) return null;
    return `#${body.toUpperCase()}`;
  }
  if (COLOR_FN.test(s) && CSS.supports("color", s)) return s;
  return null;
}

export function formatSize(bytes: number): string {
  if (bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v >= 10 || i === 0 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}
