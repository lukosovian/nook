import { motion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { MiniNook, tintBg, tintText } from "../../ui/primitives";

/** Oyunların ortak parçaları: üst çubuk (geri + skor) ve oyun sonu */
export function Header({ onBack, title, right }: { onBack: () => void; title: string; right: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-between">
      <button onClick={onBack} className="flex items-center gap-0.5 rounded-full py-0.5 pl-1 pr-2 text-[11px] font-medium text-label-2 hover:bg-well-hi hover:text-label">
        <ChevronLeft size={12} strokeWidth={2.6} />
        {title}
      </button>
      <div className="flex items-center gap-3 text-[11px] font-medium tabular-nums">{right}</div>
    </div>
  );
}

export function Over({ score, best, onAgain, color }: { score: number; best: number; onAgain: () => void; color: string }) {
  const record = score > 0 && score >= best;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 flex flex-col items-center justify-center gap-2">
      <MiniNook color={color} size={34} eyes={record ? "happy" : "open"} />
      <p className="text-[15px] font-medium text-label">{record ? `Yeni rekor: ${score}!` : `Skor: ${score}`}</p>
      <button
        onClick={onAgain}
        className="rounded-full border px-3.5 py-1 text-[12px] font-medium"
        style={{ background: tintBg(color, 18), borderColor: tintBg(color, 45), color: tintText(color) }}
      >
        Tekrar oyna
      </button>
    </motion.div>
  );
}

/** Ortadaki "Başla" düğmesi */
export function StartButton({ onClick, color, best }: { onClick: () => void; color: string; best?: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
      {best != null && <p className="text-[11px] text-label-3">Rekor: {best}</p>}
      <button
        onClick={onClick}
        className="rounded-full border px-4 py-1.5 text-[12.5px] font-medium"
        style={{ background: tintBg(color, 18), borderColor: tintBg(color, 45), color: tintText(color) }}
      >
        Başla
      </button>
    </div>
  );
}

