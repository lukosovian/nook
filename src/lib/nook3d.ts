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

const SHAPE_ID: Record<Look["shape"], number> = { sphere: 0, cloud: 1, heart: 2, triangle: 3, flower: 4, bean: 5, blob: 6, pumpkin: 7, ghost: 8, cube: 9, egg: 10, star: 11, cat: 12, bear: 13, strawberry: 14, flame: 15, mushroom: 16, drop: 17,
  frog: 18, panda: 19, fox: 20, penguin: 21, owl: 22, duck: 23, bee: 24, crab: 25, dragon: 26, watermelon: 27, cupcake: 28, icecream: 29, candy: 30,
  donut: 31, marshmallow: 32, pineapple: 33, acorn: 34, orange: 35, cherry: 36, raincloud: 37, storm: 38, crystal: 39, leaf: 40, cactus: 41, rock: 42,
  stump: 43, sun: 44, moon: 45 };
const TEX_ID: Record<Look["texture"], number> = { smooth: 0, plush: 1, matte: 2, jelly: 3, metal: 4, spots: 5, galaxy: 6, knit: 7, lava: 8, camo: 9, marble: 10, glass: 11, glow: 12, plaid: 13, stripes: 14, denim: 15, pixel: 16, fluffy: 17, gold: 18, chrome: 19 };
const HAT_ID: Record<Look["head"], number> = { none: 0, beret: 1, headphones: 2, bowler: 3, antenna: 4, bow: 5, ears: 6, cap: 7, sprout: 8, flower: 9, star: 10, stalks: 11, witch: 12, horns: 13, bat: 14, cowboy: 15, pirate: 16, straw: 17, conductor: 18, helmet: 19, hardhat: 20, crown: 21, party: 22, beanie: 23, chef: 24, santa: 25, halo: 26, toadstool: 27, astronaut: 28, elf: 29, wizard: 30,
  police: 31, nurse: 32, viking: 33, knight: 34, pilot: 35, safari: 36, detective: 37, miner: 38, nightcap: 39, clownwig: 40, bandana: 41, earflap: 42, earmuffs: 43, robot: 44 };
const GLASSES_ID: Record<Look["glasses"], number> = { none: 0, round: 1, shades: 2, monocle: 3, bold: 4, eyepatch: 5, goggles: 6, hero: 7, masquerade: 8, neon: 9, snorkel: 10 };
const NECK_ID: Record<Look["neck"], number> = { none: 0, bowtie: 1, scarf: 2 };
const FACE_ID: Record<Look["face"], number> = { none: 0, mustache: 1, beard: 2, nose: 3, note: 4, sparkle: 5, bubbles: 6 };

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
  cube: { y: -0.04, gap: 0.32, z: 0.66 },
  egg: { y: -0.08, gap: 0.3, z: 0.7 },
  star: { y: -0.06, gap: 0.24, z: 0.36 },
  cat: { y: -0.12, gap: 0.33, z: 0.74 },
  bear: { y: -0.12, gap: 0.33, z: 0.74 },
  strawberry: { y: 0.04, gap: 0.32, z: 0.74 },
  flame: { y: -0.32, gap: 0.27, z: 0.56 },
  mushroom: { y: -0.44, gap: 0.24, z: 0.5 },
  drop: { y: -0.26, gap: 0.3, z: 0.66 },
  frog: { y: 0.5, gap: 0.44, z: 0.5 },
  panda: { y: -0.08, gap: 0.33, z: 0.74 },
  fox: { y: -0.08, gap: 0.33, z: 0.74 },
  penguin: { y: 0.1, gap: 0.26, z: 0.74 },
  owl: { y: 0.02, gap: 0.34, z: 0.72 },
  duck: { y: 0.08, gap: 0.32, z: 0.74 },
  bee: { y: 0.14, gap: 0.32, z: 0.72 },
  crab: { y: -0.04, gap: 0.3, z: 0.66 },
  dragon: { y: -0.08, gap: 0.33, z: 0.74 },
  watermelon: { y: -0.12, gap: 0.3, z: 0.62 },
  cupcake: { y: 0.1, gap: 0.3, z: 0.7 },
  icecream: { y: 0.18, gap: 0.3, z: 0.62 },
  candy: { y: 0, gap: 0.28, z: 0.6 },
  donut: { y: 0.6, gap: 0.24, z: 0.5 },
  marshmallow: { y: 0, gap: 0.3, z: 0.66 },
  pineapple: { y: -0.1, gap: 0.3, z: 0.66 },
  acorn: { y: -0.18, gap: 0.3, z: 0.64 },
  orange: { y: -0.06, gap: 0.33, z: 0.74 },
  cherry: { y: -0.1, gap: 0.32, z: 0.72 },
  raincloud: { y: -0.06, gap: 0.31, z: 0.72 },
  storm: { y: -0.06, gap: 0.31, z: 0.72 },
  crystal: { y: -0.12, gap: 0.26, z: 0.5 },
  leaf: { y: 0.04, gap: 0.26, z: 0.3 },
  cactus: { y: -0.04, gap: 0.26, z: 0.56 },
  rock: { y: -0.08, gap: 0.33, z: 0.7 },
  stump: { y: -0.12, gap: 0.3, z: 0.66 },
  sun: { y: -0.04, gap: 0.27, z: 0.6 },
  moon: { y: -0.06, gap: 0.33, z: 0.74 },
};

/** Gözler camın ardında mı (küçülür, az oynar); göz bandı cam değil — tek göz kapanır */
export const lensOn = (look: Look) => !["none", "eyepatch", "hero", "masquerade"].includes(look.glasses);
/** Gözleri tümden örten gözlükler (güneş, neon panjur): gözler çizilmez */
export const hidesEyes = (look: Look) => look.glasses === "shades" || look.glasses === "neon";
/** Gözlük takılınca iki cam arasında köprüye yer kalsın diye gözler biraz açılır */
export const eyeGap = (look: Look) => (!lensOn(look) ? ANCHORS[look.shape].gap : Math.max(ANCHORS[look.shape].gap, 0.38));
/** Gözlük camının ardında gözler küçülür */
export const EYE_SCALE_GLASSES = 0.6;

// ------------------------------------------------------------------ parça grupları

/**
 * Bütün parçalar tek gölgelendiricide olunca Windows'ta (ANGLE → D3D) derleme yarım dakikayı
 * aşıyordu. Parçalar gruplara ayrılır; her görünüm yalnızca kendi gruplarının kodunu içeren bir
 * programla çizilir (öbür parçaların "uShape==N" karşılaştırmaları false olur, derleyici atar).
 * Aynı gruplardaki görünümler aynı programı paylaşır. Grup 0 boş: "yok" (ve küre, vinil) kod
 * istemez. Eski parçalar tek grupta kalır: ana sayfa çipleri, sahneler tek programla çizilir.
 */
type Slot = "uShape" | "uHat" | "uGlasses" | "uFace" | "uTex";
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const GROUPS: Record<Slot, number[][]> = {
  uShape: [[0], range(1, 13), range(14, 21), range(22, 29), range(30, 37), range(38, 45)],
  uHat: [[0], range(1, 20), range(21, 28), range(29, 36), range(37, 44)],
  uGlasses: [[0], range(1, 6), range(7, 10)],
  uFace: [[0], range(1, 6)],
  uTex: [[0, 1], range(2, 5), range(6, 12), range(13, 19)],
};
const groupOf = (slot: Slot, id: number) => Math.max(0, GROUPS[slot].findIndex((g) => g.includes(id)));

function idsOf(look: Look): Record<Slot, number> {
  return { uShape: SHAPE_ID[look.shape], uHat: HAT_ID[look.head], uGlasses: GLASSES_ID[look.glasses], uFace: FACE_ID[look.face], uTex: TEX_ID[look.texture] };
}
const SLOTS: Slot[] = ["uShape", "uHat", "uGlasses", "uFace", "uTex"];
const progKey = (look: Look) => {
  const ids = idsOf(look);
  return SLOTS.map((s) => groupOf(s, ids[s])).join("");
};

/** Programın kaynağı: anahtardaki gruplarda olmayan parçaların karşılaştırmaları false olur */
function pruned(key: string) {
  const keep = Object.fromEntries(SLOTS.map((s, i) => [s, new Set(GROUPS[s][+key[i]])])) as Record<Slot, Set<number>>;
  return shader.replace(/\b(uShape|uHat|uGlasses|uFace|uTex)==(\d+)/g, (m, u: Slot, n: string) => (keep[u].has(+n) ? m : "false"));
}

// ------------------------------------------------------------------ çizici

/**
 * WebGL2'de döngüler uZero'dan başlar (derleyici açamaz, derleme saniyeler yerine anında biter);
 * WebGL1'de döngü başı sabit olmak zorunda — orada eski, yavaş derlenen hâli kalır.
 */
const HEAD2 = "#version 300 es\nout highp vec4 fragOut;\n#define FRAG fragOut\n#define ZERO min(uZero,0)\n";
const HEAD1 = "#define FRAG gl_FragColor\n#define ZERO 0\n";
const VS2 = "#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
const VS1 = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";

interface Ctx {
  gl: WebGLRenderingContext;
  gl2: boolean;
  canvas: HTMLCanvasElement;
  vs: WebGLShader;
  ext: { COMPLETION_STATUS_KHR: number } | null;
  out: HTMLCanvasElement;
  out2d: CanvasRenderingContext2D;
}

interface Prog {
  prog: WebGLProgram;
  fs: WebGLShader;
  /** pending: GPU'da derleniyor · ready · failed: derlenemedi (o görünüm CSS küresine düşer) */
  state: "pending" | "ready" | "failed";
  t0: number;
  u: Map<string, WebGLUniformLocation | null>;
}

/** undefined: hiç başlamadı · null: WebGL yok */
let ctx: Ctx | null | undefined;
const progs = new Map<string, Prog>();
/** Bir program hazır olunca (ya da derlenemeyince) çağrılır */
const readyListeners = new Map<string, Set<() => void>>();

function whenReady(key: string, fn: () => void) {
  const p = progs.get(key);
  if (!p || p.state !== "pending") return fn();
  if (!readyListeners.has(key)) readyListeners.set(key, new Set());
  readyListeners.get(key)!.add(fn);
}

function setup(): Ctx | null {
  if (ctx !== undefined) return ctx;
  try {
    const canvas = document.createElement("canvas");
    const opts = { premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: true, antialias: false };
    const gl2 = canvas.getContext("webgl2", opts);
    const gl = (gl2 ?? canvas.getContext("webgl", opts)) as WebGLRenderingContext | null;
    if (!gl) return (ctx = null);
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, gl2 ? VS2 : VS1);
    gl.compileShader(vs);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const out = document.createElement("canvas");
    ctx = { gl, gl2: !!gl2, canvas, vs, ext: gl.getExtension("KHR_parallel_shader_compile"), out, out2d: out.getContext("2d")! };
  } catch (e) {
    console.warn("[nook] 3B çizici", e);
    ctx = null;
  }
  return ctx;
}

/**
 * Görünümün programı; yoksa derlemeye başlar. Derleme, KHR_parallel_shader_compile varsa GPU
 * sürecinde arka planda (ve birkaçı aynı anda) sürer — sayfa beklemez.
 */
function program(c: Ctx, key: string): Prog {
  const have = progs.get(key);
  if (have) return have;
  const { gl } = c;
  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, (c.gl2 ? HEAD2 : HEAD1) + pruned(key));
  gl.compileShader(fs);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, c.vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  const p: Prog = { prog, fs, state: "pending", t0: performance.now(), u: new Map() };
  progs.set(key, p);
  if (!c.ext) finish(c, key, p);
  else if (!polling) {
    polling = true;
    later(poll, 0);
  }
  return p;
}

function finish(c: Ctx, key: string, p: Prog) {
  const { gl } = c;
  if (gl.getProgramParameter(p.prog, gl.LINK_STATUS)) {
    p.state = "ready";
    const ms = Math.round(performance.now() - p.t0);
    if (ms > 1500) console.warn(`[nook] 3B çizici (${key}) ${ms} ms'de hazırlandı`);
  } else {
    p.state = "failed";
    console.warn("[nook] 3B çizici", key, gl.getShaderInfoLog(p.fs) || gl.getProgramInfoLog(p.prog));
  }
  const fns = readyListeners.get(key);
  readyListeners.delete(key);
  fns?.forEach((fn) => fn());
}

/** Derlenen programları yoklar (hepsi tek döngüde) */
let polling = false;
function poll() {
  const c = ctx;
  if (!c?.ext) return void (polling = false);
  for (const [key, p] of progs) if (p.state === "pending" && c.gl.getProgramParameter(p.prog, c.ext.COMPLETION_STATUS_KHR)) finish(c, key, p);
  if ([...progs.values()].some((p) => p.state === "pending")) later(poll, 40);
  else polling = false;
}

function draw(c: Ctx, p: Prog, look: Look, color: string, size: number) {
  const { gl, canvas } = c;
  gl.useProgram(p.prog);
  const u = (n: string) => {
    if (!p.u.has(n)) p.u.set(n, gl.getUniformLocation(p.prog, n));
    return p.u.get(n)!;
  };
  const loc = gl.getAttribLocation(p.prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  // 2× çizip küçült: kenarlar pürüzsüz olsun
  const ss = size * 2;
  canvas.width = canvas.height = ss;
  gl.viewport(0, 0, ss, ss);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  const a = ANCHORS[look.shape];
  const ids = idsOf(look);
  gl.uniform1i(u("uZero"), 0);
  gl.uniform2f(u("uRes"), ss, ss);
  gl.uniform1f(u("uSpan"), SPAN);
  gl.uniform1i(u("uShape"), ids.uShape);
  gl.uniform1i(u("uHat"), ids.uHat);
  gl.uniform1i(u("uGlasses"), ids.uGlasses);
  gl.uniform1i(u("uNeck"), NECK_ID[look.neck]);
  gl.uniform1i(u("uFace"), ids.uFace);
  gl.uniform1f(u("uFur"), look.texture === "plush" ? 1 : look.texture === "fluffy" ? 1.8 : 0);
  gl.uniform1i(u("uTex"), ids.uTex);
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  gl.uniform3fv(u("uColor"), rgb(color));
  gl.uniform3fv(u("uAcc"), rgb(capColor(color)));
  gl.uniform4f(u("uEye"), a.y, eyeGap(look), a.z, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  const { out, out2d } = c;
  out.width = out.height = size;
  out2d.clearRect(0, 0, size, size);
  out2d.imageSmoothingQuality = "high";
  out2d.drawImage(canvas, 0, 0, size, size);
  return out.toDataURL("image/png");
}

const cache = new Map<string, string | null>();
/**
 * Çizim zamanlayıcısı. Yalnızca geliştirme: tanıtım videosu kare kare çekilirken sayfanın saati
 * durdurulur (window.__vt); çizici gerçek saatle hazırlansın, Nook'lar boş kalmasın.
 */
const later = (fn: () => void, ms: number) => ((import.meta.env.DEV && (window as { __vt?: { realSetTimeout: typeof setTimeout } }).__vt?.realSetTimeout) || window.setTimeout)(fn, ms);

/** Derlenen program ya da sırada çizilecek Nook var (video çekimi bunu bekler) */
export const bodiesBusy = () => [...progs.values()].some((p) => p.state === "pending") || pumping;

/** Seçenekler, tanıtım, kostümler… bir oturumda yüzlerce görünüm olabilir; en az kullanılan silinir */
const MAX_CACHE = 400;

// ------------------------------------------------------------------ disk önbelleği

/**
 * Çizilen resimler IndexedDB'de de saklanır: Koleksiyon gibi onlarca Nook'luk sayfalar sonraki
 * açılışlarda programları hiç derlemeden, anında görünür. Gölgelendirici değişince (sürüm
 * güncellemesi) eski resimler kullanılmaz ve silinir.
 */
const TAG = (() => {
  let h = 2166136261;
  for (let i = 0; i < shader.length; i++) h = Math.imul(h ^ shader.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
})();
const DISK_MAX = 800;
/** null: daha okunuyor */
let disk: Map<string, string> | null = null;
let db: IDBDatabase | null = null;

const diskReady: Promise<void> = new Promise((resolve) => {
  const done = () => {
    disk ??= new Map();
    resolve();
  };
  try {
    if (typeof indexedDB === "undefined") return done();
    const open = indexedDB.open("nook3d", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("img");
    open.onerror = done;
    open.onsuccess = () => {
      db = open.result;
      const found = new Map<string, string>();
      const stale: IDBValidKey[] = [];
      const tx = db.transaction("img", "readwrite");
      const cur = tx.objectStore("img").openCursor();
      cur.onsuccess = () => {
        const c = cur.result;
        if (!c) return;
        const k = String(c.key);
        if (k.startsWith(TAG + "|")) found.set(k.slice(TAG.length + 1), c.value as string);
        else stale.push(c.key);
        c.continue();
      };
      tx.oncomplete = () => {
        disk = found;
        if (stale.length) {
          const del = db!.transaction("img", "readwrite").objectStore("img");
          stale.forEach((k) => del.delete(k));
        }
        done();
      };
      tx.onerror = done;
    };
  } catch {
    done();
  }
});

function save(key: string, url: string) {
  if (!db || !disk || disk.has(key)) return;
  try {
    const st = db.transaction("img", "readwrite").objectStore("img");
    if (disk.size >= DISK_MAX) {
      const old = disk.keys().next().value!;
      disk.delete(old);
      st.delete(`${TAG}|${old}`);
    }
    disk.set(key, url);
    st.put(url, `${TAG}|${key}`);
  } catch {
    /* disk dolu ya da kapalı: yalnızca bellekte kalır */
  }
}

/** Resim bellekte ya da diskte var mı (diskteyse belleğe alınır) */
function hasImage(key: string) {
  if (cache.has(key)) return true;
  const d = disk?.get(key);
  if (!d) return false;
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
  cache.set(key, d);
  return true;
}

const keyOf = (look: Look, color: string, size: number) => `${look.shape}|${look.texture}|${look.glasses}|${look.head}|${look.neck}|${look.face}|${color}|${size}`;

/** Görünümün programı hazır mı: "wait" derleniyor, "ok" çizilebilir, "none" WebGL yok ya da derlenemedi */
function readiness(look: Look): "wait" | "ok" | "none" {
  const c = setup();
  if (!c) return "none";
  const p = program(c, progKey(look));
  return p.state === "pending" ? "wait" : p.state === "ready" ? "ok" : "none";
}

/** Görünümün programını şimdiden derlemeye başla (ör. "Şaşırt beni"nin sıradaki görünümü) */
export function warmLook(look: Look) {
  void readiness(look);
}

/** Görünümün resmi (data URL); WebGL yoksa ya da programı daha derleniyorsa null. Aynı görünüm bir kez çizilir. */
export function bodyImage(look: Look, color: string, size: number): string | null {
  const key = keyOf(look, color, size);
  // En son kullanılan sona: silinecekler hep en eskiler olsun
  if (hasImage(key)) return touch(key);
  const r = readiness(look);
  if (r === "wait") return null;
  const url = r === "ok" ? draw(ctx!, progs.get(progKey(look))!, look, color, size) : null;
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
  cache.set(key, url);
  if (url) save(key, url);
  return url;
}

/** Önbellekteki resmi al ve "son kullanılan" yap */
function touch(key: string) {
  const v = cache.get(key) ?? null;
  cache.delete(key);
  cache.set(key, v);
  return v;
}

/** Görünümün programı hazır olunca bileşeni yenile (resmi zaten varsa programa gerek yok) */
function useProgramReady(look: Look, have: boolean) {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const pending = !have && readiness(look) === "wait";
  const pk = progKey(look);
  useEffect(() => {
    if (pending) whenReady(pk, bump);
  }, [pending, pk]);
  return pending ? 0 : 1;
}

export function useBodyImage(look: Look, color: string, size: number) {
  const ready = useProgramReady(look, hasImage(keyOf(look, color, size)));
  return useMemo(() => bodyImage(look, color, size), [look.shape, look.texture, look.glasses, look.head, look.neck, look.face, color, size, ready]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ------------------------------------------------------------------ sıralı çizim

/**
 * Küçük Nook'lar (seçenekler, tanıtım, çipler) ekrana birden çok girer; hepsini aynı anda çizmek
 * animasyonu takır. Sıraya alınır, her karede bir tane çizilir; hazır olunca bileşen yenilenir.
 * Programı derlenmekte olan iş beklerken programı hazır olanlar öne geçer.
 */
const STILL = import.meta.env.DEV && typeof location !== "undefined" && new URLSearchParams(location.search).has("still");
const queue: { key: string; look: Look; color: string; size: number }[] = [];
const waiting = new Map<string, Set<() => void>>();
let pumping = false;

function pump() {
  if (!queue.length) {
    pumping = false;
    return;
  }
  // Diskteki resimler okunmadan derlemeye başlama (çoğu zaten orada)
  if (!disk) return void diskReady.then(() => later(pump, 0));
  const k = queue.findIndex((j) => hasImage(j.key));
  if (k >= 0) {
    const [job] = queue.splice(k, 1);
    waiting.get(job.key)?.forEach((fn) => fn());
    waiting.delete(job.key);
    return void later(pump, 0);
  }
  // Sıradakilerin hepsinin programı derlenmeye başlasın (paralel), hazır olan ilk iş çizilsin
  const i = queue.findIndex((j) => readiness(j.look) !== "wait");
  if (i < 0) {
    // Hepsi derleniyor: ilk biten programda devam
    let resumed = false;
    const resume = () => {
      if (resumed) return;
      resumed = true;
      later(pump, 16);
    };
    new Set(queue.map((j) => progKey(j.look))).forEach((k) => whenReady(k, resume));
    return;
  }
  const [job] = queue.splice(i, 1);
  if (!cache.has(job.key)) bodyImage(job.look, job.color, job.size);
  waiting.get(job.key)?.forEach((fn) => fn());
  waiting.delete(job.key);
  later(pump, 16);
}

function request(look: Look, color: string, size: number, done?: () => void) {
  const key = keyOf(look, color, size);
  if (hasImage(key)) return;
  if (done) {
    if (!waiting.has(key)) waiting.set(key, new Set());
    waiting.get(key)!.add(done);
  }
  if (!queue.some((j) => j.key === key)) queue.push({ key, look, color, size });
  if (!pumping) {
    pumping = true;
    later(pump, 16);
  }
}

/** Önceden çiz (ör. tanıtım açılırken): sonra ekrana girdiklerinde beklemeden hazır olurlar */
export const prefetchBodies = (items: { look: Look; color: string; size: number }[]) => items.forEach((i) => request(i.look, i.color, i.size));

/** Sıralı çizimle resim: hazır değilse null döner, hazır olunca bileşen yenilenir */
export function useBodyImageQueued(look: Look, color: string, size: number): string | null {
  const key = keyOf(look, color, size);
  const [, bump] = useReducer((n: number) => n + 1, 0);
  // Geliştirme önizlemesinin ekran görüntüsü beklemez: orada hemen çiz
  if (STILL && !hasImage(key)) bodyImage(look, color, size);
  const has = hasImage(key);
  // Önbellekten düşmüşse (çok görünüm gezildi) yeniden sıraya girer — boş kalmaz
  useEffect(() => {
    if (hasImage(key)) return;
    request(look, color, size, bump);
    return () => void waiting.get(key)?.delete(bump);
  }, [key, has]); // eslint-disable-line react-hooks/exhaustive-deps
  return has ? touch(key) : null;
}

// Yalnızca geliştirme: video çekimi (dev/Reel) kare almadan önce Nook'ların çizilmesini bekler
if (import.meta.env.DEV && typeof window !== "undefined") (window as { __nook3dBusy?: () => boolean }).__nook3dBusy = bodiesBusy;

/** Yalnızca geliştirme: derleme süresi ölçümü (görünümün program anahtarı ve kaynağı) */
export const __programOf = import.meta.env.DEV ? (look: Look) => ({ key: progKey(look), src: pruned(progKey(look)) }) : undefined;
