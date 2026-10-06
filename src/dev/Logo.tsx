/** Yalnızca geliştirme: ?preview=logo — 1024×1024 Nook logosu (?bare: zeminsiz) */
import { useEffect } from "react";
import { NookFigure } from "../components/mascot/Figure";
import { Paw } from "../components/outings/Parts";
import { DEFAULT_LOOK } from "../lib/look";

export function Logo() {
  const bare = new URLSearchParams(location.search).has("bare");
  const S = 500;
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);
  const K = S / 24;
  const color = "#F4F4F6";
  return (
    <div style={{ position: "fixed", inset: 0, width: 1024, height: 1024, background: "transparent" }}>
      {!bare && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 228,
            background: "radial-gradient(70% 60% at 50% 38%, #26262c 0%, #0c0c0f 62%, #050506 100%)",
            boxShadow: "inset 0 2px 0 rgba(255,255,255,0.06)",
          }}
        />
      )}
      <div style={{ position: "absolute", left: 512 - S / 2, top: 512 - S / 2 + 10, width: S, height: S }}>
        <NookFigure look={DEFAULT_LOOK} color={color} size={S} res={1024} />
        {/* Yüzen eller */}
        <Paw x={S / 2 - 15.5 * K} y={S / 2 + 2.5 * K} k={K * 0.9} color={color} rotate={14} />
        <Paw x={S / 2 + 15.5 * K} y={S / 2 + 2.5 * K} k={K * 0.9} color={color} rotate={-14} />
      </div>
    </div>
  );
}
