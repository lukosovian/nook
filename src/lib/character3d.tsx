/**
 * Karakter denemesi (Lokum): gövde her karede ışın izlemeyle çizilir, böylece hareket bir resmin
 * kaydırılması değil gerçek: gövde esner, gözler kırpar, kulaklık gövdeyle oynar.
 * Hareketler yaylarla (spring) yürür; zıplama yerçekimiyle, yere inişte gövde jöle gibi titrer.
 */
import { useEffect, useRef } from "react";
import shader from "./character3d.glsl?raw";

export type Mood = "idle" | "happy" | "sleepy" | "music" | "surprised";

class Spring {
  v = 0;
  constructor(
    public x: number,
    public target = x,
    public k = 170,
    public c = 16,
  ) {}
  step(dt: number) {
    this.v += (this.k * (this.target - this.x) - this.c * this.v) * dt;
    this.x += this.v * dt;
  }
}

/** Karakterin o anki duruşu: gölgelendiriciye her karede giden değerler */
type Pose = { squash: number; hop: number; tilt: number; look: [number, number]; turn: [number, number]; lag: [number, number]; blink: number; happy: number; sleepy: number; wide: number; cups: number; blush: number; mouth: number };

/** Ruh hâline göre duruşu üreten hareket beyni */
class Motion {
  mood: Mood = "idle";
  squash = new Spring(1, 1, 260, 9);
  tilt = new Spring(0, 0, 90, 12);
  lookX = new Spring(0, 0, 120, 16);
  lookY = new Spring(0, 0, 120, 16);
  happy = new Spring(0, 0, 140, 18);
  sleepy = new Spring(0, 0, 40, 12);
  wide = new Spring(0, 0, 200, 16);
  cups = new Spring(0, 0, 400, 14);
  // gövde gözlerin arkasından, daha ağır döner
  turnX = new Spring(0, 0, 45, 10);
  turnY = new Spring(0, 0, 45, 10);
  // kulaklık gövdeyi biraz geriden izler
  phoneY = new Spring(0, 0, 150, 7);
  phoneT = new Spring(0, 0, 150, 7);
  blush = new Spring(0, 0, 60, 12);
  mouth = new Spring(0, 0, 110, 14);
  /** gerinirken gövdenin ek uzaması */
  private stretch = 0;
  /** sana dönüp bakarken imleci ve gezinmeyi bırakır */
  private gazeUntil = 0;
  /** ileri tarihli küçük işler (setTimeout değil: sabit karede de aynı yürüsün) */
  private todo: { at: number; fn: () => void }[] = [];
  hop = 0;
  vy = 0;
  blink = 0;
  t = 0;
  private nextBlink = 1.5;
  private blinkAt = -1;
  private nextLook = 1;
  private nextAct = 3;
  private beat = 0;
  private side = 1;
  pointer: { x: number; y: number; at: number } | null = null;

  setMood(m: Mood) {
    this.mood = m;
    this.happy.target = m === "happy" || m === "music" ? 1 : 0;
    this.sleepy.target = m === "sleepy" ? 0.72 : 0;
    this.wide.target = m === "surprised" ? 1 : 0;
    this.tilt.target = 0;
    this.blush.target = m === "happy" ? 0.75 : 0;
    this.mouth.target = m === "surprised" ? 1 : 0;
    this.stretch = 0;
    this.nextAct = this.t + (m === "happy" ? 0.15 : 2.5);
    if (m === "surprised") {
      this.jump(1.5);
      this.squash.v += 3;
    }
    if (m === "music") this.beat = this.t;
  }

  /** Dokununca: basılıp geri yaylanır, bir an sevinir */
  poke() {
    this.squash.v -= 5.5;
    this.wide.v += 6;
    this.blush.v += 5;
    if (this.mood === "idle") {
      this.happy.target = 1;
      this.later(0.9, () => this.mood === "idle" && (this.happy.target = 0));
    }
  }

  private jump(v: number) {
    if (this.hop > 0.001) return;
    // önce çömelir, sonra fırlar
    this.squash.v -= 2.2;
    this.later(0.11, () => {
      this.vy = v;
      this.squash.v += 4.5;
    });
  }

  private later(sec: number, fn: () => void) {
    this.todo.push({ at: this.t + sec, fn });
  }

  /** Boştayken arada bir yaptığı ufak şeyler */
  private idleAct() {
    const r = Math.random();
    if (r < 0.22) this.jump(1.3);
    else if (r < 0.4) this.tilt.target = (Math.random() - 0.5) * 0.14;
    else if (r < 0.58) {
      // gerinir: uzar, gözleri keyifle kapanır, sonra bırakıp yaylanır
      this.stretch = 0.12;
      this.happy.target = 1;
      this.later(0.8, () => {
        this.stretch = 0;
        this.squash.v -= 3;
        this.happy.target = 0;
      });
    } else if (r < 0.76) {
      // silkinir: hızlı sağ-sol
      for (let i = 0; i < 5; i++) this.later(i * 0.085, () => (this.tilt.v += (i % 2 ? -1 : 1) * 2.2));
      this.later(0.45, () => (this.tilt.target = 0));
    } else {
      // sana döner, iki kez göz kırpar, biraz utanır
      this.gazeUntil = this.t + 1.8;
      this.lookX.target = this.lookY.target = 0;
      this.blush.target = 0.6;
      this.nextBlink = this.t + 0.35;
      this.later(1.8, () => this.mood === "idle" && (this.blush.target = 0));
    }
  }

  /** Uykuluyken arada bir esner */
  private yawn() {
    this.mouth.target = 2;
    this.stretch = 0.07;
    this.later(1.5, () => {
      this.mouth.target = 0;
      this.stretch = 0;
      this.squash.v -= 1.5;
    });
  }

  step(dt: number): Pose {
    this.t += dt;
    const t = this.t;
    const m = this.mood;
    const due = this.todo.filter((x) => x.at <= t);
    this.todo = this.todo.filter((x) => x.at > t);
    due.forEach((x) => x.fn());

    // zıplama: yerçekimi; inişte gövde basılıp titrer
    if (this.vy !== 0 || this.hop > 0) {
      this.vy -= 9.5 * dt;
      this.hop += this.vy * dt;
      if (this.hop <= 0) {
        this.hop = 0;
        this.squash.v -= Math.min(7, Math.abs(this.vy) * 2.6);
        this.vy = 0;
      }
    }

    // nefes: uykuluyken yavaş ve derin
    const breath = m === "sleepy" ? 0.03 * Math.sin(t * 1.1) : 0.012 * Math.sin(t * 2.1);
    // havadayken hıza göre uzar
    this.squash.target = 1 + breath + this.stretch + (this.hop > 0 ? Math.max(-0.06, Math.min(0.1, this.vy * 0.035)) : 0);

    // ruh hâline özgü hareketler
    if (m === "happy" && t > this.nextAct) {
      this.jump(2.3);
      this.side = -this.side;
      this.tilt.target = 0.09 * this.side;
      this.nextAct = t + 1.15;
    } else if (m === "music") {
      const spb = 60 / 104;
      if (t - this.beat > spb) {
        this.beat += spb;
        this.squash.v -= 1.6;
        this.cups.v += 9;
        this.side = -this.side;
        this.tilt.target = 0.075 * this.side;
      }
    } else if (m === "sleepy" && t > this.nextAct) {
      // başı yana düşer, arada toparlanır ya da esner
      if (this.tilt.target === 0 && Math.random() < 0.4) {
        this.yawn();
        this.nextAct = t + 3;
      } else {
        this.tilt.target = this.tilt.target === 0 ? 0.11 : 0;
        if (this.tilt.target === 0) this.wide.v += 2.5;
        this.nextAct = t + (this.tilt.target ? 3.5 : 2.2);
      }
    } else if (m === "idle" && t > this.nextAct) {
      this.idleAct();
      this.nextAct = t + 3 + Math.random() * 4;
    }

    // bakış: imleç yakın zamanda oynadıysa onu izler, yoksa etrafa göz gezdirir
    const p = this.pointer;
    if (t < this.gazeUntil) {
      // sana bakıyor
    } else if (p && performance.now() - p.at < 1600 && m !== "sleepy") {
      this.lookX.target = p.x;
      this.lookY.target = p.y;
    } else if (t > this.nextLook) {
      const still = m === "music" || Math.random() < 0.35;
      this.lookX.target = still ? 0 : (Math.random() * 2 - 1) * 0.85;
      this.lookY.target = m === "sleepy" ? -0.7 : still ? 0 : (Math.random() * 2 - 1) * 0.6;
      this.nextLook = t + 1.4 + Math.random() * 2.6;
    }

    // göz kırpma: hızlı kapanıp açılır, bazen iki kez
    if (t > this.nextBlink && this.blinkAt < 0) this.blinkAt = t;
    if (this.blinkAt >= 0) {
      const d = (t - this.blinkAt) / (m === "sleepy" ? 0.5 : 0.16);
      this.blink = d < 1 ? Math.sin(d * Math.PI) : 0;
      if (d >= 1) {
        this.blinkAt = -1;
        const twice = Math.random() < 0.2;
        this.nextBlink = t + (twice ? 0.12 : m === "sleepy" ? 1.5 + Math.random() * 2 : 2 + Math.random() * 3.5);
      }
    }

    this.turnX.target = this.lookX.target * 0.38;
    this.turnY.target = -this.lookY.target * 0.18;
    this.phoneY.target = this.hop;
    this.phoneT.target = this.tilt.x;
    for (const s of [this.squash, this.tilt, this.lookX, this.lookY, this.happy, this.sleepy, this.wide, this.cups, this.turnX, this.turnY, this.phoneY, this.phoneT, this.blush, this.mouth]) s.step(dt);
    return {
      squash: this.squash.x,
      hop: this.hop,
      tilt: this.tilt.x,
      look: [this.lookX.x, this.lookY.x],
      turn: [this.turnX.x, this.turnY.x],
      lag: [(this.phoneT.x - this.tilt.x) * -0.5, Math.max(-0.08, Math.min(0.08, this.phoneY.x - this.hop))],
      blink: this.blink,
      happy: Math.max(0, Math.min(1, this.happy.x)),
      sleepy: Math.max(0, this.sleepy.x),
      wide: Math.max(0, Math.min(1.4, this.wide.x)),
      cups: this.cups.x,
      blush: Math.max(0, Math.min(1, this.blush.x)),
      mouth: Math.max(0, this.mouth.x),
    };
  }
}

const VS = "#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
const HEAD = "#version 300 es\nprecision highp float;\nout vec4 fragOut;\n#define FRAG fragOut\n";

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Canlı karakter. `size`: CSS piksel; `res`: çizim çözünürlüğü çarpanı (küçük boyda pürüzsüz kenar için büyük).
 */
export function Character3D({ size, color, phones, mood, res = 1.5, still, aim }: { size: number; color: string; phones: boolean; mood: Mood; res?: number; still?: number; aim?: [number, number] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const motion = useRef(new Motion());
  const props = useRef({ color, phones });
  props.current = { color, phones };

  useEffect(() => motion.current.setMood(mood), [mood]);

  useEffect(() => {
    const canvas = ref.current!;
    const px = Math.round(size * res * Math.min(2, window.devicePixelRatio || 1));
    canvas.width = canvas.height = px;
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
    if (!gl) return;
    const mk = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn("[karakter]", gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, HEAD + shader));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, px, px);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = { res: u("uRes"), time: u("uTime"), color: u("uColor"), squash: u("uSquash"), hop: u("uHop"), tilt: u("uTilt"), look: u("uLook"), blink: u("uBlink"), happy: u("uHappy"), sleepy: u("uSleepy"), wide: u("uWide"), phones: u("uPhones"), cups: u("uCups"), turn: u("uTurn"), lag: u("uLag"), blush: u("uBlush"), mouth: u("uMouth") };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / 260;
      const dy = -(e.clientY - (r.top + r.height * 0.5)) / 260;
      const k = Math.hypot(dx, dy);
      const s = k > 1 ? 1 / k : 1;
      motion.current.pointer = { x: dx * s, y: dy * s, at: performance.now() };
    };
    window.addEventListener("pointermove", onMove);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      const pose = motion.current.step(dt);
      gl.uniform2f(U.res, px, px);
      gl.uniform1f(U.time, motion.current.t);
      gl.uniform3fv(U.color, hexRgb(props.current.color));
      gl.uniform1f(U.squash, pose.squash);
      gl.uniform1f(U.hop, pose.hop);
      gl.uniform1f(U.tilt, pose.tilt);
      gl.uniform2f(U.look, pose.look[0], pose.look[1]);
      gl.uniform1f(U.blink, pose.blink);
      gl.uniform1f(U.happy, pose.happy);
      gl.uniform1f(U.sleepy, pose.sleepy);
      gl.uniform1f(U.wide, pose.wide);
      gl.uniform1f(U.phones, props.current.phones ? 1 : 0);
      gl.uniform1f(U.cups, pose.cups);
      gl.uniform2f(U.turn, pose.turn[0], pose.turn[1]);
      gl.uniform2f(U.lag, pose.lag[0], pose.lag[1]);
      gl.uniform1f(U.blush, pose.blush);
      gl.uniform1f(U.mouth, pose.mouth);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (still == null) raf = requestAnimationFrame(frame);
    };
    if (still != null) {
      // sabit bakış (ekran görüntüsünde dönüşü görmek için)
      if (aim) motion.current.pointer = { x: aim[0], y: aim[1], at: Infinity };
      // sabit kare (ekran görüntüsü için): hareketi o saniyeye kadar sar
      for (let i = 0; i < still * 60; i++) motion.current.step(1 / 60);
      frame(last);
    } else raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      gl.deleteProgram(prog);
    };
  }, [size, res, still]);

  return <canvas ref={ref} onPointerDown={() => motion.current.poke()} style={{ width: size, height: size, cursor: "pointer" }} />;
}
