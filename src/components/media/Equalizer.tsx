import { motion } from "motion/react";

/** Çubukların kendi ritmi (ses seviyesinden bağımsız). */
const BARS = [
  { keys: [4, 11, 6, 13, 5], duration: 0.9 },
  { keys: [9, 4, 12, 6, 10], duration: 0.75 },
  { keys: [6, 13, 5, 9, 7], duration: 1.05 },
  { keys: [11, 6, 10, 4, 12], duration: 0.85 },
];

/** Çalarken zıplayan minik ekolayzer. "Müziğe tepki" açıksa gerçek ses şiddetiyle oynar. */
export function Equalizer({ playing, height = 14 }: { playing: boolean; height?: number }) {
  return <LoopBars playing={playing} height={height} />;
}


function LoopBars({ playing, height }: { playing: boolean; height: number }) {
  const k = height / 14;
  return (
    <div className="flex items-center gap-[2px]" style={{ height }}>
      {BARS.map((bar, i) => (
        <motion.span
          key={i}
          className="w-[2.5px] rounded-full bg-white/85"
          initial={false}
          animate={
            playing
              ? {
                  height: bar.keys.map((h) => h * k),
                  transition: { duration: bar.duration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
                }
              : { height: 3 * k, transition: { duration: 0.3 } }
          }
        />
      ))}
    </div>
  );
}
