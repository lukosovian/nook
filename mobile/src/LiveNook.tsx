import { useEffect } from "react";
import { Nook } from "@nook/components/mascot/Nook";
import { playAntic } from "@nook/hooks/useAntics";
import { FACE } from "@nook/lib/layout";
import { normalizeColor, normalizeLook, type Look } from "@nook/lib/look";
import { useNook, type Antic } from "@nook/store/nook";

/** Telefonda yer kaplamayan, adada olduğu gibi duran küçük oyunlar (gezinme vb. yok) */
const ANTICS: [Antic, number][] = [
  ["wink", 2],
  ["lookAround", 2],
  ["yawn", 1.2],
  ["hop", 1.5],
  ["stretch", 1.2],
  ["nod", 0.8],
  ["giggle", 0.8],
  ["suspicious", 0.8],
  ["spin", 0.6],
  ["love", 0.6],
  ["gum", 0.6],
  ["sneeze", 0.4],
];
const HUM: [Antic, number][] = [["hum", 1]];

function pick(list: [Antic, number][]): Antic {
  let r = Math.random() * list.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of list) if ((r -= w) <= 0) return k;
  return list[0][0];
}

/**
 * Ana ekranın tepesindeki Nook: PC'deki adadaki Nook'un ta kendisi (aynı bileşen) — göz kırpar, etrafa bakınır,
 * ara sıra esner/zıplar; PC'de müzik çalıyorsa dans eder, PC'ye ulaşılamıyorsa uyur. Dokununca tepki verir.
 */
export function LiveNook({ look, color, online, playing, scale = 3 }: { look?: unknown; color?: string; online: boolean; playing: boolean; scale?: number }) {
  const antic = useNook((s) => s.antic);
  const grabbed = useNook((s) => s.grabbed);

  useEffect(() => {
    if (!online) return;
    let t = 0;
    const tick = () => {
      if (!useNook.getState().antic) playAntic(pick(playing && Math.random() < 0.4 ? HUM : ANTICS));
      t = window.setTimeout(tick, 6000 + Math.random() * 8000);
    };
    t = window.setTimeout(tick, 2500);
    return () => window.clearTimeout(t);
  }, [online, playing]);

  const expression = !online ? "sleepy" : grabbed ? "surprised" : (antic ?? "idle");
  const box = FACE * scale;

  return (
    <div className="relative flex items-center justify-center" style={{ width: box * 2.4, height: box * 1.25 }}>
      <div style={{ transform: `scale(${scale})` }}>
        <Nook
          expression={expression}
          grooving={online && playing}
          color={normalizeColor(color ?? "#F4F4F6")}
          look={normalizeLook(look as Look)}
          res={256}
        />
      </div>
    </div>
  );
}
