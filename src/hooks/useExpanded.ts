import { useMemo } from "react";
import { expandedLayout } from "../lib/layout";
import { useNook } from "../store/nook";

/** Açık adanın ölçüleri: normal ya da tam ekran */
export function useExpanded() {
  const w = useNook((s) => s.big?.width ?? 0);
  const h = useNook((s) => s.big?.height ?? 0);
  const sound = useNook((s) => s.settings.soundCard);
  return useMemo(() => expandedLayout(w ? { width: w, height: h } : null, sound), [w, h, sound]);
}
