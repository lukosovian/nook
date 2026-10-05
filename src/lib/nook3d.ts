/**
 * Nook'un 3B gövdesi: tek bir WebGL bağlamında ışın izlemeyle (SDF) çizilir — yumuşak vinil ya da
 * peluş gövde, siyah parlak aksesuarlar. Her görünüm bir kez çizilip resim olarak saklanır; ekranda
 * kıpırdayan her şey (zıplama, eğilme) bu resmin CSS dönüşümüdür, yani her karede GPU çalışmaz.
 * WebGL yoksa null döner ve Nook eski CSS küresine düşer.
 */
import { useEffect, useMemo, useReducer } from "react";
import shader from "./nook3d.glsl?raw";
import { capColor, type Look } from "./look";

/** Resmin kapsadığı alan, yüz çapının (2 birim) kaç katı: şapka, kulaklık, papyon sığsın */
export const SPAN = 3.2;

const SHAPE_ID: Record<Look["shape"], number> = { sphere: 0, cloud: 1, heart: 2, triangle: 3, flower: 4, bean: 5, blob: 6, pumpkin: 7, ghost: 8 };
const HAT_ID: Record<Look["head"], number> = { none: 0, beret: 1, headphones: 2, bowler: 3, antenna: 4, bow: 5, ears: 6, cap: 7, sprout: 8, flower: 9, star: 10, stalks: 11, witch: 12, horns: 13, bat: 14 };
const GLASSES_ID: Record<Look["glasses"], number> = { none: 0, round: 1, shades: 2, monocle: 3, bold: 4 };
const NECK_ID: Record<Look["neck"], number> = { none: 0, bowtie: 1 };

/** Gözlerin yeri (birim; yüz yarıçapı 1): y yukarı +, gap merkezden yana, z yüzün önü (gözlük için) */
export const ANCHORS: Record<Look["shape"], { y: number; gap: number; z: number }> = {
  sphere: { y: -0.08, gap: 0.33, z: 0.76 },
  cloud: { y: -0.06, gap: 0.31, z: 0.72 },
  heart: { y: 0.1, gap: 0.37, z: 0.7 },
  triangle: { y: -0.16, gap: 0.3, z: 0.62 },
  flower: { y: -0.02, gap: 0.33, z: 0.66 },
  bean: { y: 0.02, gap: 0.31, z: 0.74 },
  blob: { y: -0.1, gap: 0.33, z: 0.72 },
  pumpkin: { y: -0.06, gap: 0.36, z: 0.76 },
  ghost: { y: 0.08, gap: 0.3, z: 0.74 },
};

/** Gözlük takılınca iki cam arasında köprüye yer kalsın diye gözler biraz açılır */
export const eyeGap = (look: Look) => (look.glasses === "none" ? ANCHORS[look.shape].gap : Math.max(ANCHORS[look.shape].gap, 0.38));
/** Gözlük camının ardında gözler küçülür */
export const EYE_SCALE_GLASSES = 0.6;

/**
 * WebGL2'de döngüler uZero'dan başlar (derleyici açamaz, derleme saniyeler yerine anında biter);
 * WebGL1'de döngü başı sabit olmak zorunda — orada eski, yavaş derlenen hâli kalır.
 */
const HEAD2 = "#version 300 es\nout highp vec4 fragOut;\n#define FRAG fragOut\n#define ZERO min(uZero,0)\n";
const HEAD1 = "#define FRAG gl_FragColor\n#define ZERO 0\n";
const VS2 = "#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
const VS1 = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";

interface Renderer {
  draw: (look: Look, color: string, size: number) => string;
}

/** undefined: hiç başlamadı · "pending": gölgelendirici GPU'da derleniyor · null: WebGL yok */
let renderer: Renderer | null | "pending" | undefined;
const readyListeners = new Set<() => void>();

/** Çizici hazır olunca (ya da WebGL'in olmadığı anlaşılınca) bir kez çağrılır */
function whenReady(fn: () => void) {
  if (renderer === "pending") readyListeners.add(fn);
  else fn();
}

/**
 * Çiziciyi kurar. Derleme, KHR_parallel_shader_compile varsa GPU sürecinde arka planda sürer —
 * sayfa beklemez (eskiden derleme ana iş parçacığını dakikalarca dondurabiliyordu).
 */
function start() {
  try {
    const canvas = document.createElement("canvas");
    const opts = { premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: true, antialias: false };
    const gl2 = canvas.getContext("webgl2", opts);
    const gl = (gl2 ?? canvas.getContext("webgl", opts)) as WebGLRenderingContext | null;
    if (!gl) {
      renderer = null;
      return;
    }
    const t0 = performance.now();
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, gl2 ? VS2 : VS1);
    const fs = sh(gl.FRAGMENT_SHADER, (gl2 ? HEAD2 : HEAD1) + shader);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    const finish = () => {
      try {
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
          throw new Error(gl.getShaderInfoLog(fs) || gl.getShaderInfoLog(vs) || gl.getProgramInfoLog(prog) || "link");
        renderer = makeRenderer(gl, prog, canvas);
        const ms = Math.round(performance.now() - t0);
        if (ms > 500) console.warn(`[nook] 3B çizici ${gl2 ? "WebGL2" : "WebGL1"} ${ms} ms'de hazırlandı`);
      } catch (e) {
        console.warn("[nook] 3B çizici", e);
        renderer = null;
      }
      const fns = [...readyListeners];
      readyListeners.clear();
      fns.forEach((fn) => fn());
    };

    const ext = gl.getExtension("KHR_parallel_shader_compile") as { COMPLETION_STATUS_KHR: number } | null;
    if (!ext) {
      finish();
      return;
    }
    renderer = "pending";
    const poll = () => (gl.getProgramParameter(prog, ext.COMPLETION_STATUS_KHR) ? finish() : window.setTimeout(poll, 40));
    window.setTimeout(poll, 0);
  } catch (e) {
    console.warn("[nook] 3B çizici", e);
    renderer = null;
  }
}

function makeRenderer(gl: WebGLRenderingContext, prog: WebGLProgram, canvas: HTMLCanvasElement): Renderer {
  gl.useProgram(prog);
  gl.uniform1i(gl.getUniformLocation(prog, "uZero"), 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const out = document.createElement("canvas");
  const ctx = out.getContext("2d")!;

  return {
    draw(look, color, size) {
      // 2× çizip küçült: kenarlar pürüzsüz olsun
      const ss = size * 2;
      canvas.width = canvas.height = ss;
      gl.viewport(0, 0, ss, ss);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const a = ANCHORS[look.shape];
      gl.uniform2f(u("uRes"), ss, ss);
      gl.uniform1f(u("uSpan"), SPAN);
      gl.uniform1i(u("uShape"), SHAPE_ID[look.shape]);
      gl.uniform1i(u("uHat"), HAT_ID[look.head]);
      gl.uniform1i(u("uGlasses"), GLASSES_ID[look.glasses]);
      gl.uniform1i(u("uNeck"), NECK_ID[look.neck]);
      gl.uniform1f(u("uFur"), look.texture === "plush" ? 1 : 0);
      const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      gl.uniform3fv(u("uColor"), rgb(color));
      gl.uniform3fv(u("uAcc"), rgb(capColor(color)));
      gl.uniform4f(u("uEye"), a.y, eyeGap(look), a.z, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      out.width = out.height = size;
      ctx.clearRect(0, 0, size, size);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(canvas, 0, 0, size, size);
      return out.toDataURL("image/png");
    },
  };
}

const cache = new Map<string, string | null>();
/** Seçenekler, tanıtım, kostümler… bir oturumda yüzlerce görünüm olabilir; en az kullanılan silinir */
const MAX_CACHE = 400;

const keyOf = (look: Look, color: string, size: number) => `${look.shape}|${look.texture}|${look.glasses}|${look.head}|${look.neck}|${color}|${size}`;

/** Görünümün resmi (data URL); WebGL yoksa ya da çizici daha hazırlanıyorsa null. Aynı görünüm bir kez çizilir. */
export function bodyImage(look: Look, color: string, size: number): string | null {
  const key = keyOf(look, color, size);
  // En son kullanılan sona: silinecekler hep en eskiler olsun
  if (cache.has(key)) return touch(key);
  if (renderer === undefined) start();
  if (renderer === "pending") return null;
  const url = renderer ? renderer.draw(look, color, size) : null;
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
  cache.set(key, url);
  return url;
}

/** Önbellekteki resmi al ve "son kullanılan" yap */
function touch(key: string) {
  const v = cache.get(key) ?? null;
  cache.delete(key);
  cache.set(key, v);
  return v;
}

/** Çizici hazır olunca bileşeni yenile */
function useRendererReady() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const pending = renderer === "pending" || renderer === undefined;
  useEffect(() => {
    if (renderer === "pending") whenReady(bump);
  }, [pending]);
  return pending ? 0 : 1;
}

export function useBodyImage(look: Look, color: string, size: number) {
  const ready = useRendererReady();
  return useMemo(() => bodyImage(look, color, size), [look.shape, look.texture, look.glasses, look.head, look.neck, color, size, ready]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ------------------------------------------------------------------ sıralı çizim

/**
 * Küçük Nook'lar (seçenekler, tanıtım, çipler) ekrana birden çok girer; hepsini aynı anda çizmek
 * animasyonu takır. Sıraya alınır, her karede bir tane çizilir; hazır olunca bileşen yenilenir.
 */
const STILL = import.meta.env.DEV && typeof location !== "undefined" && new URLSearchParams(location.search).has("still");
const queue: { key: string; look: Look; color: string; size: number }[] = [];
const waiting = new Map<string, Set<() => void>>();
let pumping = false;

function pump() {
  const job = queue.shift();
  if (!job) {
    pumping = false;
    return;
  }
  if (renderer === undefined) start();
  if (renderer === "pending") {
    // Çizici hazırlanırken sırayı beklet
    queue.unshift(job);
    whenReady(() => window.setTimeout(pump, 16));
    return;
  }
  if (!cache.has(job.key)) bodyImage(job.look, job.color, job.size);
  waiting.get(job.key)?.forEach((fn) => fn());
  waiting.delete(job.key);
  window.setTimeout(pump, 16);
}

function request(look: Look, color: string, size: number, done?: () => void) {
  const key = keyOf(look, color, size);
  if (cache.has(key)) return;
  if (done) {
    if (!waiting.has(key)) waiting.set(key, new Set());
    waiting.get(key)!.add(done);
  }
  if (!queue.some((j) => j.key === key)) queue.push({ key, look, color, size });
  if (!pumping) {
    pumping = true;
    window.setTimeout(pump, 16);
  }
}

/** Önceden çiz (ör. tanıtım açılırken): sonra ekrana girdiklerinde beklemeden hazır olurlar */
export const prefetchBodies = (items: { look: Look; color: string; size: number }[]) => items.forEach((i) => request(i.look, i.color, i.size));

/** Sıralı çizimle resim: hazır değilse null döner, hazır olunca bileşen yenilenir */
export function useBodyImageQueued(look: Look, color: string, size: number): string | null {
  const key = keyOf(look, color, size);
  const [, bump] = useReducer((n: number) => n + 1, 0);
  // Geliştirme önizlemesinin ekran görüntüsü beklemez: orada hemen çiz
  if (STILL && !cache.has(key)) bodyImage(look, color, size);
  const has = cache.has(key);
  // Önbellekten düşmüşse (çok görünüm gezildi) yeniden sıraya girer — boş kalmaz
  useEffect(() => {
    if (cache.has(key)) return;
    request(look, color, size, bump);
    return () => void waiting.get(key)?.delete(bump);
  }, [key, has]); // eslint-disable-line react-hooks/exhaustive-deps
  return has ? touch(key) : null;
}
