/** Haftalık karne Nook Studio'da açılır (ayrı pencere; geniş sayfa, geçmiş haftalar) */
import { playAntic } from "../hooks/useAntics";
import { isPrimary } from "./bridge";
import { openStudio } from "./studio";

export function openReport() {
  if (!isPrimary) return;
  playAntic("hop");
  openStudio("report");
}
