/**
 * Karakter denemesi: gövde her karede ışın izlemeyle çizilir, böylece hareket bir resmin
 * kaydırılması değil gerçek: gövde esner, gözler kırpar, aksesuar gövdeyle oynar.
 * Hareketler yaylarla (spring) yürür; zıplama yerçekimiyle, yere inişte gövde jöle gibi titrer.
 * Her karakterin boştayken yaptığı kendi küçük işleri var (kişiliği).
 */
import { useEffect, useRef } from "react";
import shader from "./character3d.glsl?raw";

export type Mood = "idle" | "happy" | "sleepy" | "music" | "surprised";

export type CharId = "nook" | "lokum" | "pamuk" | "damla" | "mantar" | "mirnav" | "piril";

export type Character = {
  id: CharId;
  /** gölgelendiricideki numarası (#define CHAR) */
  n: number;
  name: string;
  tagline: string;
  /** kendi aksesuarı; klasik Nook'ta yok */
  accessory?: string;
  /** aksesuarın rengi (koyuysa kömür malzeme) */
  accColor: string;
  colors: { label: string; hex: string }[];
};

export const CHARACTERS: Character[] = [
  {
    id: "nook",
    n: 6,
    name: "Nook",
    tagline: "Klasik hâli: sade, yuvarlak, her şeye meraklı",
    accColor: "#000000",
    colors: [
      { label: "Beyaz", hex: "#F4F4F6" },
      { label: "Gri", hex: "#C3C8D3" },
      { label: "Buz", hex: "#A9CBFF" },
      { label: "Pudra", hex: "#FFC2D6" },
    ],
  },
  {
    id: "lokum",
    n: 0,
    name: "Lokum",
    tagline: "Yumuşacık, biraz uykucu, müziksiz yapamaz",
    accessory: "Kulaklık",
    accColor: "#16161a",
    colors: [
      { label: "Gül", hex: "#FF9CC0" },
      { label: "Fıstık", hex: "#A6DB7E" },
      { label: "Limon", hex: "#FFD873" },
      { label: "Nar", hex: "#FF6676" },
    ],
  },
  {
    id: "pamuk",
    n: 1,
    name: "Pamuk",
    tagline: "Sarılmayı sever, atkısına gömülür, arada hapşırır",
    accessory: "Örgü atkı",
    accColor: "#F2E4CF",
    colors: [
      { label: "Gök", hex: "#62B2FF" },
      { label: "Lila", hex: "#C29BFF" },
      { label: "Mercan", hex: "#FF8571" },
      { label: "Nane", hex: "#6FDDB8" },
    ],
  },
  {
    id: "damla",
    n: 2,
    name: "Damla",
    tagline: "Meraklı, her şeyi yakından inceler, gözlüğünü düzeltir",
    accessory: "Yuvarlak gözlük",
    accColor: "#16161a",
    colors: [
      { label: "Deniz", hex: "#4AA3FF" },
      { label: "Su yeşili", hex: "#3FD3C2" },
      { label: "Erik", hex: "#9877FF" },
      { label: "Şeftali", hex: "#FF9B7A" },
    ],
  },
  {
    id: "mantar",
    n: 3,
    name: "Mantar",
    tagline: "Utangaç, şapkasının altına saklanır, sonra gizlice bakar",
    accessory: "Papyon",
    accColor: "#16161a",
    colors: [
      { label: "Sinek", hex: "#FF5548" },
      { label: "Kayısı", hex: "#FF9E45" },
      { label: "Böğürtlen", hex: "#8E6BFF" },
      { label: "Yosun", hex: "#74C756" },
    ],
  },
  {
    id: "mirnav",
    n: 4,
    name: "Mırnav",
    tagline: "Kendini beğenmiş, yavaşça göz kırpar, kulağı seğirir",
    accessory: "Çıngıraklı tasma",
    accColor: "#E8384F",
    colors: [
      { label: "Tarçın", hex: "#FFA048" },
      { label: "Duman", hex: "#93A3C6" },
      { label: "Şeftali", hex: "#FFB59C" },
      { label: "Lavanta", hex: "#B79EF2" },
    ],
  },
  {
    id: "piril",
    n: 5,
    name: "Pırıl",
    tagline: "Yerinde duramaz, döner, zıplar, pelerini hep dalgalanır",
    accessory: "Pelerin",
    accColor: "#E8384F",
    colors: [
      { label: "Altın", hex: "#FFCF3A" },
      { label: "Turuncu", hex: "#FF9135" },
      { label: "Pembe", hex: "#FF6CB0" },
      { label: "Turkuaz", hex: "#38D2E6" },
    ],
  },
];

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
type Pose = { squash: number; hop: number; tilt: number; look: [number, number]; turn: [number, number]; spin: number; lag: [number, number]; blink: number; happy: number; sleepy: number; wide: number; pulse: number; blush: number; mouth: number; ear: number };

/** Ruh hâline ve karakterine göre duruşu üreten hareket beyni */
class Motion {
  mood: Mood = "idle";
  char: CharId = "lokum";
  squash = new Spring(1, 1, 260, 9);
  tilt = new Spring(0, 0, 90, 12);
  lookX = new Spring(0, 0, 120, 16);
  lookY = new Spring(0, 0, 120, 16);
  happy = new Spring(0, 0, 140, 18);
  sleepy = new Spring(0, 0, 40, 12);
  wide = new Spring(0, 0, 200, 16);
  pulse = new Spring(0, 0, 400, 14);
  // gövde gözlerin arkasından, daha ağır döner
  turnX = new Spring(0, 0, 45, 10);
  turnY = new Spring(0, 0, 45, 10);
  spin = new Spring(0, 0, 40, 9);
  // aksesuar gövdeyi biraz geriden izler
  accY = new Spring(0, 0, 150, 7);
  accT = new Spring(0, 0, 150, 7);
  /** gözlük itme gibi aksesuara doğrudan verilen ek oynama */
  accPush = new Spring(0, 0, 220, 9);
  blush = new Spring(0, 0, 60, 12);
  mouth = new Spring(0, 0, 110, 14);
  ear = new Spring(0, 0, 160, 10);
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
  private blinkLen = 0.16;
  private nextLook = 1;
  private nextAct = 3;
  private beat = 0;
  private side = 1;
  pointer: { x: number; y: number; at: number } | null = null;

  setChar(c: CharId) {
    this.char = c;
    this.todo = [];
    this.stretch = 0;
    this.ear.target = 0;
    this.spin.x = this.spin.target = 0;
    this.setMood(this.mood);
  }

  setMood(m: Mood) {
    this.mood = m;
    this.happy.target = m === "happy" || m === "music" ? 1 : 0;
    this.sleepy.target = m === "sleepy" ? 0.72 : 0;
    this.wide.target = m === "surprised" ? 1 : 0;
    this.tilt.target = 0;
    this.blush.target = m === "happy" ? 0.75 : 0;
    this.mouth.target = m === "surprised" ? 1 : 0;
    this.ear.target = 0;
    this.stretch = 0;
    this.nextAct = this.t + (m === "happy" ? 0.15 : 2.5);
    if (m === "surprised") {
      this.jump(this.char === "piril" ? 2 : 1.5);
      this.squash.v += 3;
      if (this.char === "mantar") this.later(0.6, () => (this.ear.target = 1));
      if (this.char === "mirnav") this.ear.v += 14;
    }
    if (m === "music") this.beat = this.t;
  }

  /** Dokununca: basılıp geri yaylanır, bir an sevinir */
  poke() {
    this.squash.v -= this.char === "pamuk" ? 7 : 5.5;
    this.wide.v += 6;
    this.blush.v += 5;
    if (this.char === "mirnav") this.ear.v += 12;
    if (this.char === "mantar") {
      // dokunulunca hemen saklanır
      this.ear.target = 1;
      this.later(1.4, () => this.mood === "idle" && (this.ear.target = 0));
      return;
    }
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

  /** Sana döner, iki kez göz kırpar, biraz utanır (herkesin ortak hâli) */
  private gaze() {
    this.gazeUntil = this.t + 1.8;
    this.lookX.target = this.lookY.target = 0;
    this.blush.target = 0.6;
    this.nextBlink = this.t + 0.35;
    this.later(1.8, () => this.mood === "idle" && (this.blush.target = 0));
  }

  private shake(n = 5, f = 2.2) {
    for (let i = 0; i < n; i++) this.later(i * 0.085, () => (this.tilt.v += (i % 2 ? -1 : 1) * f));
    this.later(n * 0.09, () => (this.tilt.target = 0));
  }

  /** Boştayken arada bir yaptığı ufak şeyler: her karakterin kendine özgü */
  private idleAct() {
    const r = Math.random();
    const c = this.char;
    if (c === "pamuk") {
      if (r < 0.3) {
        // atkısına gömülür: basılır, gözleri keyifle kapanır
        this.stretch = -0.09;
        this.happy.target = 1;
        this.blush.target = 0.5;
        this.later(1.6, () => {
          this.stretch = 0;
          this.happy.target = 0;
          this.blush.target = 0;
          this.squash.v += 2;
        });
      } else if (r < 0.5) {
        // hapşırır: içine çeker, sonra patlar
        this.stretch = 0.08;
        this.wide.target = 0.6;
        this.mouth.target = 1;
        this.later(0.7, () => {
          this.stretch = 0;
          this.wide.target = 0;
          this.mouth.target = 0;
          this.blink = 1;
          this.nextBlink = this.t;
          this.squash.v -= 8;
          this.tilt.v -= 2.5;
        });
      } else if (r < 0.75) {
        // ağır ağır sağa sola salınır
        for (let i = 0; i < 4; i++) this.later(i * 0.7, () => (this.tilt.target = (i % 2 ? -1 : 1) * 0.08));
        this.later(2.8, () => (this.tilt.target = 0));
      } else this.gaze();
      return;
    }
    if (c === "damla") {
      if (r < 0.3) {
        // merakla öne eğilir, başını yana yatırır
        this.gazeUntil = this.t + 1.8;
        this.lookX.target = 0;
        this.lookY.target = -0.2;
        this.tilt.target = 0.13;
        this.stretch = 0.04;
        this.later(1.8, () => {
          this.tilt.target = 0;
          this.stretch = 0;
        });
      } else if (r < 0.55) {
        // gözlüğünü yukarı iter
        this.accPush.v += 1.6;
        this.squash.v -= 1.2;
      } else if (r < 0.8) {
        // hızlıca sağa sola bakar
        this.gazeUntil = this.t + 1.3;
        this.lookX.target = -0.9;
        this.later(0.45, () => (this.lookX.target = 0.9));
        this.later(0.9, () => (this.lookX.target = 0));
      } else this.jump(1.2);
      return;
    }
    if (c === "mantar") {
      if (r < 0.4) {
        // şapkasının altına saklanır, sonra yavaşça çıkıp bakar
        this.ear.target = 1;
        this.lookY.target = -0.6;
        this.blush.target = 0.7;
        this.later(1.9, () => {
          this.ear.target = 0.4;
          this.gaze();
        });
        this.later(2.9, () => this.mood === "idle" && (this.ear.target = 0));
      } else if (r < 0.6) {
        // utana sıkıla minik hoplama
        this.jump(0.9);
        this.blush.target = 0.5;
        this.later(1, () => (this.blush.target = 0));
      } else if (r < 0.8) this.tilt.target = (Math.random() - 0.5) * 0.12;
      else this.gaze();
      return;
    }
    if (c === "mirnav") {
      if (r < 0.3) {
        // kedi gibi yavaşça göz kırpar (güven)
        this.gazeUntil = this.t + 2;
        this.lookX.target = this.lookY.target = 0;
        this.sleepy.target = 1;
        this.later(1.1, () => this.mood === "idle" && (this.sleepy.target = 0));
      } else if (r < 0.55) {
        // kulağı seğirir, iki kez
        this.ear.v += 16;
        this.later(0.25, () => (this.ear.v += 12));
      } else if (r < 0.75) {
        // ekmek gibi yayılır, keyiflenir
        this.stretch = -0.06;
        this.happy.target = 1;
        this.later(1.5, () => {
          this.stretch = 0;
          this.happy.target = 0;
        });
      } else this.shake(4, 1.6);
      return;
    }
    if (c === "piril") {
      if (r < 0.35) {
        // zıplayıp kendi etrafında döner
        this.jump(2.4);
        this.later(0.15, () => (this.spin.target += Math.PI * 2));
        this.happy.target = 1;
        this.later(1.3, () => this.mood === "idle" && (this.happy.target = 0));
      } else if (r < 0.6) {
        // art arda iki zıplama
        this.jump(1.6);
        this.later(0.72, () => this.jump(1.9));
      } else if (r < 0.8) this.shake(6, 2.8);
      else this.gaze();
      return;
    }
    // Lokum
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
    } else if (r < 0.76) this.shake();
    else this.gaze();
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
    const c = this.char;
    const due = this.todo.filter((x) => x.at <= t);
    this.todo = this.todo.filter((x) => x.at > t);
    due.forEach((x) => x.fn());

    // zıplama: yerçekimi; inişte gövde basılıp titrer
    if (this.vy !== 0 || this.hop > 0) {
      this.vy -= 9.5 * dt;
      this.hop += this.vy * dt;
      if (this.hop <= 0) {
        this.hop = 0;
        this.squash.v -= Math.min(7, Math.abs(this.vy) * (c === "pamuk" ? 3.4 : 2.6));
        this.vy = 0;
      }
    }

    // nefes: uykuluyken yavaş ve derin
    const breath = m === "sleepy" ? 0.03 * Math.sin(t * 1.1) : 0.012 * Math.sin(t * (c === "piril" ? 3 : 2.1));
    this.squash.target = 1 + breath + this.stretch + (this.hop > 0 ? Math.max(-0.06, Math.min(0.1, this.vy * 0.035)) : 0);

    // ruh hâline özgü hareketler
    if (m === "happy" && t > this.nextAct) {
      this.jump(c === "piril" ? 2.8 : c === "mantar" ? 1.8 : 2.3);
      this.side = -this.side;
      this.tilt.target = 0.09 * this.side;
      if (c === "piril" && Math.random() < 0.4) this.later(0.15, () => (this.spin.target += Math.PI * 2));
      this.nextAct = t + (c === "piril" ? 0.95 : 1.15);
    } else if (m === "music") {
      const spb = 60 / 104;
      if (t - this.beat > spb) {
        this.beat += spb;
        this.squash.v -= 1.6;
        this.pulse.v += 9;
        this.side = -this.side;
        this.tilt.target = 0.075 * this.side;
        if (c === "mirnav") this.ear.v += 6 * this.side;
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
      if (c === "mantar") this.ear.target = 0.55;
    } else if (m === "idle" && t > this.nextAct) {
      this.idleAct();
      this.nextAct = t + (c === "piril" ? 2 + Math.random() * 2.5 : 3 + Math.random() * 4);
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
      this.nextLook = t + (c === "piril" ? 0.8 + Math.random() * 1.4 : 1.4 + Math.random() * 2.6);
    }

    // göz kırpma: hızlı kapanıp açılır, bazen iki kez
    if (t > this.nextBlink && this.blinkAt < 0) {
      this.blinkAt = t;
      this.blinkLen = m === "sleepy" ? 0.5 : 0.16;
    }
    if (this.blinkAt >= 0) {
      const d = (t - this.blinkAt) / this.blinkLen;
      this.blink = d < 1 ? Math.sin(d * Math.PI) : 0;
      if (d >= 1) {
        this.blinkAt = -1;
        const twice = Math.random() < 0.2;
        this.nextBlink = t + (twice ? 0.12 : m === "sleepy" ? 1.5 + Math.random() * 2 : 2 + Math.random() * 3.5);
      }
    }

    this.turnX.target = this.lookX.target * 0.38;
    this.turnY.target = -this.lookY.target * 0.18;
    this.accY.target = this.hop;
    this.accT.target = this.tilt.x + (this.spin.target - this.spin.x) * 0.15;
    for (const s of [this.squash, this.tilt, this.lookX, this.lookY, this.happy, this.sleepy, this.wide, this.pulse, this.turnX, this.turnY, this.spin, this.accY, this.accT, this.accPush, this.blush, this.mouth, this.ear]) s.step(dt);
    // tam dönüş bitince başa sar (sayı büyümesin)
    if (Math.abs(this.spin.target - this.spin.x) < 0.01 && Math.abs(this.spin.v) < 0.05 && this.spin.target !== 0) this.spin.x = this.spin.target = 0;
    return {
      squash: this.squash.x,
      hop: this.hop,
      tilt: this.tilt.x,
      look: [this.lookX.x, this.lookY.x],
      turn: [this.turnX.x, this.turnY.x],
      spin: this.spin.x,
      lag: [(this.accT.x - this.tilt.x) * -0.5, Math.max(-0.08, Math.min(0.08, this.accY.x - this.hop + this.accPush.x * 0.05))],
      blink: this.blink,
      happy: Math.max(0, Math.min(1, this.happy.x)),
      sleepy: Math.max(0, this.sleepy.x),
      wide: Math.max(0, Math.min(1.4, this.wide.x)),
      pulse: this.pulse.x,
      blush: Math.max(0, Math.min(1, this.blush.x)),
      mouth: Math.max(0, this.mouth.x),
      ear: c === "mantar" ? Math.max(0, Math.min(1.1, this.ear.x)) : this.ear.x,
    };
  }
}

const VS = "#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
const head = (n: number) => `#version 300 es\nprecision highp float;\nout vec4 fragOut;\n#define FRAG fragOut\n#define CHAR ${n}\n`;

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Canlı karakter. `size`: CSS piksel; `res`: çizim çözünürlüğü çarpanı (küçük boyda pürüzsüz kenar için büyük).
 * `still` verilirse hareket o saniyeye kadar sarılır ve tek kare çizilir (resim gibi, sonra GPU boşta).
 */
export function Character3D({ char, size, color, acc, mood, res = 1.5, still, aim }: { char: CharId; size: number; color: string; acc: boolean; mood: Mood; res?: number; still?: number; aim?: [number, number] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const motion = useRef(new Motion());
  const props = useRef({ color, acc });
  props.current = { color, acc };
  const def = CHARACTERS.find((c) => c.id === char) ?? CHARACTERS[0];
  const n = def.n;
  const accColor = def.accColor;

  useEffect(() => motion.current.setMood(mood), [mood]);

  useEffect(() => {
    const canvas = ref.current!;
    motion.current.setChar(char);
    const px = Math.round(size * res * Math.min(2, window.devicePixelRatio || 1));
    canvas.width = canvas.height = px;
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
    if (!gl) return void (canvas.dataset.err = "webgl2 yok");
    const mk = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("[karakter]", gl.getShaderInfoLog(s));
        canvas.dataset.err = gl.getShaderInfoLog(s) ?? "";
      }
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, head(n) + shader));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.warn("[karakter]", char, gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, px, px);
    const u = (name: string) => gl.getUniformLocation(prog, name);
    const U = { accCol: u("uAccCol"), res: u("uRes"), time: u("uTime"), color: u("uColor"), squash: u("uSquash"), hop: u("uHop"), tilt: u("uTilt"), look: u("uLook"), blink: u("uBlink"), happy: u("uHappy"), sleepy: u("uSleepy"), wide: u("uWide"), acc: u("uAccOn"), pulse: u("uPulse"), turn: u("uTurn"), spin: u("uSpin"), lag: u("uLag"), blush: u("uBlush"), mouth: u("uMouth"), ear: u("uEar") };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / 260;
      const dy = -(e.clientY - (r.top + r.height * 0.5)) / 260;
      const k = Math.hypot(dx, dy);
      const s = k > 1 ? 1 / k : 1;
      motion.current.pointer = { x: dx * s, y: dy * s, at: performance.now() };
    };
    if (still == null) window.addEventListener("pointermove", onMove);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      const pose = still == null ? motion.current.step(dt) : motion.current.step(0);
      gl.uniform2f(U.res, px, px);
      gl.uniform1f(U.time, motion.current.t);
      gl.uniform3fv(U.color, hexRgb(props.current.color));
      gl.uniform3fv(U.accCol, hexRgb(accColor));
      gl.uniform1f(U.squash, pose.squash);
      gl.uniform1f(U.hop, pose.hop);
      gl.uniform1f(U.tilt, pose.tilt);
      gl.uniform2f(U.look, pose.look[0], pose.look[1]);
      gl.uniform1f(U.blink, pose.blink);
      gl.uniform1f(U.happy, pose.happy);
      gl.uniform1f(U.sleepy, pose.sleepy);
      gl.uniform1f(U.wide, pose.wide);
      gl.uniform1f(U.acc, props.current.acc && def.accessory ? 1 : 0);
      gl.uniform1f(U.pulse, pose.pulse);
      gl.uniform2f(U.turn, pose.turn[0], pose.turn[1]);
      gl.uniform1f(U.spin, pose.spin);
      gl.uniform2f(U.lag, pose.lag[0], pose.lag[1]);
      gl.uniform1f(U.blush, pose.blush);
      gl.uniform1f(U.mouth, pose.mouth);
      gl.uniform1f(U.ear, pose.ear);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (still == null) raf = requestAnimationFrame(frame);
    };
    if (still != null) {
      // sabit bakış (ekran görüntüsünde dönüşü görmek için)
      if (aim) motion.current.pointer = { x: aim[0], y: aim[1], at: Infinity };
      // sabit kare: hareketi o saniyeye kadar sar
      for (let i = 0; i < still * 60; i++) motion.current.step(1 / 60);
      frame(last);
    } else raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      gl.deleteProgram(prog);
    };
  }, [char, n, size, res, still]);

  // karakter değişince yeni tuval (eski bağlam tuvalle birlikte gider)
  return <canvas key={char} ref={ref} onPointerDown={() => motion.current.poke()} style={{ width: size, height: size, cursor: "pointer" }} />;
}
