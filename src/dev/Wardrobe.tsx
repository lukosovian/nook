/**
 * Yalnızca geliştirme (?preview=wardrobe&set=…): Görünüm parçalarını topluca görmek için.
 * set: shapes | textures | heads | wear (gözlük, yüz, göz) | collection
 */
import { useState } from "react";
import { NookFigure } from "../components/mascot/Figure";
import { CHIP_NOOKS, COLLECTION, DEFAULT_LOOK, EYE_STYLES, FACES, GLASSES, HALLOWEEN, HEADS, SHAPES, TEXTURES, type Look } from "../lib/look";
import { __bake, __programOf } from "../lib/nook3d";
import { figureRes } from "../components/mascot/Figure";

const PALETTE = ["#FF3B4A", "#FF8A1F", "#FFD21F", "#8FE03A", "#16C47F", "#2FD4C0", "#2B8CFF", "#9B7BFF", "#FF5C8A", "#F4F4F6"];

function items(set: string | null): { look: Look; color: string; label: string }[] {
  const from = new URLSearchParams(location.search).get("from");
  const after = <T extends { id: string }>(xs: T[]) => (from ? xs.slice(xs.findIndex((x) => x.id === from)) : xs);
  if (set === "collection") return COLLECTION.map((o) => ({ ...o, label: o.name }));
  if (set === "textures") return after(TEXTURES).map((o, i) => ({ look: { ...DEFAULT_LOOK, texture: o.id }, color: PALETTE[i % PALETTE.length], label: o.label }));
  if (set === "heads") return after(HEADS.slice(1)).map((o) => ({ look: { ...DEFAULT_LOOK, head: o.id }, color: "#F4F4F6", label: o.label }));
  // set=fit: başlıkların farklı gövdelere oturuşu (satır: gövde, sütun: başlık)
  if (set === "fit") {
    const shapes = (new URLSearchParams(location.search).get("shapes") ?? "sphere,egg,triangle,sugar,drop,blob,bear,cloud").split(",");
    const heads = (new URLSearchParams(location.search).get("heads") ?? "beanie,crown,cap,santa,wizard,antenna,chef,police").split(",");
    return shapes.flatMap((sh) => heads.map((h) => ({ look: { ...DEFAULT_LOOK, shape: sh as Look["shape"], head: h as Look["head"] }, color: "#F4F4F6", label: `${sh} · ${h}` })));
  }
  if (set === "wear")
    return [
      ...GLASSES.slice(7).map((o) => ({ look: { ...DEFAULT_LOOK, glasses: o.id }, color: "#FFE3A8", label: o.label })),
      ...FACES.slice(1).map((o) => ({ look: { ...DEFAULT_LOOK, face: o.id }, color: "#FFE3A8", label: o.label })),
      ...EYE_STYLES.slice(5).map((o) => ({ look: { ...DEFAULT_LOOK, eyes: o.id }, color: "#2B8CFF", label: o.label })),
    ];
  return after(SHAPES).map((o, i) => ({ look: { ...DEFAULT_LOOK, shape: o.id }, color: PALETTE[i % PALETTE.length], label: o.label }));
}

/** set=compile: gerçek kullanımdaki görünümlerin programlarını paralel derleyip süreyi yazar (bekleterek ölçer) */
function measureCompile() {
  const gl = document.createElement("canvas").getContext("webgl2")!;
  gl.getExtension("KHR_parallel_shader_compile");
  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, "#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}");
  gl.compileShader(vs);
  const batch = (srcs: string[]) => {
    const t0 = performance.now();
    const ps = srcs.map((s) => {
      const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fs, "#version 300 es\nout highp vec4 fragOut;\n#define FRAG fragOut\n#define ZERO min(uZero,0)\n" + s);
      gl.compileShader(fs);
      const p = gl.createProgram()!;
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      gl.linkProgram(p);
      return p;
    });
    const ok = ps.every((p) => gl.getProgramParameter(p, gl.LINK_STATUS));
    return `${Math.round(performance.now() - t0)} ms${ok ? "" : " HATA"}`;
  };
  const sets: [string, Look[]][] = [
    ["kendi Nook'u (küre)", [DEFAULT_LOOK]],
    ["çipler (eski parçalar)", Object.values(CHIP_NOOKS).map((c) => c.look)],
    ["Görünüm seçenekleri", [...SHAPES.map((o) => ({ ...DEFAULT_LOOK, shape: o.id })), ...TEXTURES.map((o) => ({ ...DEFAULT_LOOK, texture: o.id })), ...GLASSES.map((o) => ({ ...DEFAULT_LOOK, glasses: o.id })), ...HEADS.map((o) => ({ ...DEFAULT_LOOK, head: o.id })), ...FACES.map((o) => ({ ...DEFAULT_LOOK, face: o.id }))]],
    ["Koleksiyon + Cadılar", [...COLLECTION, ...HALLOWEEN].map((o) => o.look)],
  ];
  const seen = new Set<string>();
  return sets.map(([name, looks]) => {
    const m = new Map(looks.map((l) => [__programOf!(l).key, __programOf!(l).src]));
    const fresh = [...m].filter(([k]) => !seen.has(k));
    fresh.forEach(([k]) => seen.add(k));
    return `${name}: ${m.size} program, ${fresh.length} yeni: ${batch(fresh.map(([, s]) => s))}`;
  });
}

function CompileTimes() {
  const [out] = useState(measureCompile);
  return (
    <div className="space-y-2 p-6 text-[18px] text-white">
      {out.map((l) => (
        <p key={l}>{l}</p>
      ))}
    </div>
  );
}

/** set=bake: Koleksiyon ve Cadılar Nook'larının hazır resimleri (scripts/bake-looks.py okur) */
function Bake() {
  const [out] = useState(() => {
    const res = figureRes(31);
    const seen = new Set<string>();
    const list: { key: string; url: string; tag: string }[] = [];
    for (const o of [...COLLECTION, ...HALLOWEEN]) {
      const r = __bake!(o.look, o.color, res);
      if (r && !seen.has(r.key)) {
        seen.add(r.key);
        list.push(r);
      }
    }
    return JSON.stringify(list);
  });
  return <pre id="bake">{out}</pre>;
}

export function Wardrobe() {
  const q = new URLSearchParams(location.search);
  if (q.get("set") === "compile") return <CompileTimes />;
  if (q.get("set") === "bake") return <Bake />;
  const skip = Number(q.get("skip")) || 0;
  const list = items(q.get("set")).slice(skip, Number(q.get("n")) ? skip + Number(q.get("n")) : undefined);
  return (
    <div className="grid min-h-screen content-start gap-x-2 gap-y-3 bg-[#1c1c1f] p-4" style={{ gridTemplateColumns: "repeat(8, 104px)" }}>
      {list.map((p, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="flex h-[100px] w-[100px] items-center justify-center">
            <NookFigure look={p.look} color={p.color} size={60} res={256} />
          </div>
          <span className="text-[11px] text-white/60">{p.label}</span>
        </div>
      ))}
    </div>
  );
}
