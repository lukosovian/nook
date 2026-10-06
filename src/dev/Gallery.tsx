/** Yalnızca geliştirme: ?preview=gallery — bütün gövdeler × dokular ve renkler */
import { NookFigure } from "../components/mascot/Figure";
import { BODY_COLORS, DEFAULT_LOOK, SHAPES, TEXTURES } from "../lib/look";

export function Gallery() {
  const colors = ["#FF5C8A", "#2B8CFF", "#FFD21F", "#16C47F", "#9B7BFF", "#FF6A3D"];
  const shapes = SHAPES.filter((s) => !["pumpkin", "ghost"].includes(s.id));
  return (
    <div style={{ position: "fixed", inset: 0, background: "#141417", color: "#aaa", font: "11px Inter, sans-serif", padding: 12, overflow: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `70px repeat(${shapes.length}, 64px)`, gap: 4, alignItems: "center" }}>
        <span />
        {shapes.map((s) => (
          <span key={s.id} style={{ textAlign: "center" }}>{s.label}</span>
        ))}
        {TEXTURES.map((t, ti) => [
          <span key={t.id}>{t.label}</span>,
          ...shapes.map((s) => (
            <div key={t.id + s.id} style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <NookFigure look={{ ...DEFAULT_LOOK, shape: s.id, texture: t.id }} color={colors[ti % colors.length]} size={48} />
            </div>
          )),
        ])}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {BODY_COLORS.map((c) => (
          <NookFigure key={c} look={DEFAULT_LOOK} color={c} size={40} />
        ))}
      </div>
    </div>
  );
}
