import { useLayoutEffect } from "react";
import { useNook } from "../../store/nook";
import { Tour, useTourSteps } from "./Tour";

/**
 * Adanın tanıtımı ilk gerektiğinde yüklediği giriş (tanıtım, çizimleri ve kalkan sahne takımı ada açılışına
 * binmesin). Nook'un o adımdaki duruşunu (ortada kocaman mı) adaya bildirir.
 */
export default function TourGate({ onCentered }: { onCentered: (centered: boolean) => void }) {
  const steps = useTourSteps();
  const step = useNook((s) => s.tourStep);
  const centered = !!steps[step]?.centered;
  useLayoutEffect(() => onCentered(centered), [centered, onCentered]);
  return <Tour />;
}
