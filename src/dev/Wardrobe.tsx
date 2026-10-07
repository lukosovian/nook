/** Yalnızca geliştirme (?preview=wardrobe): kalkan sahnelerinden gelen yeni aksesuarlar, birkaç gövdede */
import { NookFigure } from "../components/mascot/Figure";
import { DEFAULT_LOOK, type Look } from "../lib/look";

const PARTS: Partial<Look>[] = [
  { head: "cowboy" }, { head: "pirate", glasses: "eyepatch" }, { head: "straw" }, { head: "conductor" },
  { head: "helmet" }, { head: "hardhat" }, { glasses: "goggles" }, { neck: "scarf" }, { glasses: "eyepatch" },
];
const BODIES: [Look["shape"], string][] = [["sphere", "#FF6A3D"], ["bean", "#2B8CFF"], ["egg", "#FFD21F"], ["cat", "#16C47F"], ["pumpkin", "#9B7BFF"]];

export function Wardrobe() {
  return (
    <div className="grid h-screen place-content-center gap-y-14 bg-[#1c1c1f] p-10" style={{ gridTemplateColumns: `repeat(${PARTS.length}, 120px)` }}>
      {BODIES.map(([shape, color]) =>
        PARTS.map((p, i) => <NookFigure key={`${shape}${i}`} look={{ ...DEFAULT_LOOK, shape, ...p }} color={color} size={80} res={256} />),
      )}
    </div>
  );
}
