/**
 * Renk körlüğü paletleri: vurgu renkleri (çipler, durum rozetleri, düğmeler) seçilen görme biçimine
 * göre birbirinden ayrılan tonlarla değişir. Kırmızı-yeşil zayıflığında (protanopi, döteranopi)
 * kırmızı turuncuya, yeşil maviye kayar; mavi-sarı zayıflığında (tritanopi) sarı pembeye, mavi mora.
 * Renkler CSS değişkeni olduğu için bütün arayüz bir anda değişir.
 */
import { useEffect } from "react";
import { useNook } from "../store/nook";

export type ColorVision = "normal" | "protan" | "deutan" | "tritan";
type Key = "teal" | "red" | "orange" | "purple" | "blue" | "green" | "pink" | "yellow";

export const PALETTES: Record<ColorVision, Record<Key, string>> = {
  normal: { teal: "#3fbfa5", red: "#f0545c", orange: "#f2a33a", purple: "#8f6bff", blue: "#3d8bff", green: "#3ccf6e", pink: "#ff5c8a", yellow: "#ffd23f" },
  protan: { teal: "#7fd3ff", red: "#ff7a1a", orange: "#f5c400", purple: "#b48cff", blue: "#4f5bff", green: "#3a9bff", pink: "#e89bd0", yellow: "#fff27a" },
  deutan: { teal: "#6cc6f5", red: "#e8602c", orange: "#f0b400", purple: "#b080f0", blue: "#5148e8", green: "#2f8fff", pink: "#d98cc0", yellow: "#f7ea6b" },
  tritan: { teal: "#00b5ad", red: "#ff4d5e", orange: "#ff7f50", purple: "#c58bff", blue: "#5b6cff", green: "#2ec48a", pink: "#ff66b3", yellow: "#ffb3c1" },
};

let current: ColorVision = "normal";

/** Durum rozeti ve parıltı renkleri (Grok Bot'taki gibi), seçili palete göre */
export function statusColor(status: "working" | "error" | "success" | "annoyed" | "alarm") {
  if (current === "normal") return { working: "#2f8cff", error: "#ff453a", success: "#34c759", annoyed: "#ff9f0a", alarm: "#ffd23f" }[status];
  const p = PALETTES[current];
  return { working: p.blue, error: p.red, success: p.green, annoyed: p.orange, alarm: p.yellow }[status];
}

function apply(cvd: ColorVision) {
  current = cvd;
  const root = document.documentElement;
  const p = PALETTES[cvd];
  for (const [k, v] of Object.entries(p)) {
    if (cvd === "normal") root.style.removeProperty(`--color-${k}`);
    else root.style.setProperty(`--color-${k}`, v);
  }
  // Eski sınıf adları
  for (const k of ["green", "yellow", "orange", "red", "blue", "teal"] as const) {
    if (cvd === "normal") root.style.removeProperty(`--color-sys-${k}`);
    else root.style.setProperty(`--color-sys-${k}`, p[k]);
  }
}

/** Seçili paleti sayfaya uygular (her pencerede: ada, tünek, kart, kalkan) */
export function useColorVision() {
  const cvd = useNook((s) => s.settings.colorVision);
  // Değişkenler çizimden önce ayarlansın
  if (cvd !== current) apply(cvd);
  useEffect(() => apply(cvd), [cvd]);
}
