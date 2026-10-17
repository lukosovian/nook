import { useMemo } from "react";
import { expandedLayout, sizeFor } from "../lib/layout";
import { useNook } from "../store/nook";

/** Açık adanın ölçüleri: açık sekmenin kendi boyutu ya da tam ekran */
export function useExpanded() {
  const w = useNook((s) => s.big?.width ?? 0);
  const h = useNook((s) => s.big?.height ?? 0);
  const sound = useNook((s) => s.settings.soundCard);
  const size = useNook((s) => sizeFor(s.tab, s.searching));
  return useMemo(() => expandedLayout(w ? { width: w, height: h } : null, sound, size), [w, h, sound, size]);
}
