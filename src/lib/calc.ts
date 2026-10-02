/**
 * Güvenli hesap makinesi (eval yok): + − × ÷ ^ %, parantez, sqrt/sin/cos/tan/log/ln/abs/round, pi, e.
 * Türkçe ondalık virgülü ("3,5") ve "x"/"×"/"÷" işaretlerini de kabul eder.
 */
const FUNCS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  kök: Math.sqrt,
  sin: (x) => Math.sin((x * Math.PI) / 180),
  cos: (x) => Math.cos((x * Math.PI) / 180),
  tan: (x) => Math.tan((x * Math.PI) / 180),
  log: Math.log10,
  ln: Math.log,
  abs: Math.abs,
  round: Math.round,
};
const CONSTS: Record<string, number> = { pi: Math.PI, π: Math.PI, e: Math.E };

type Token = { t: "num"; v: number } | { t: "op"; v: string } | { t: "id"; v: string };

function tokenize(src: string): Token[] | null {
  const s = src.replace(/×|x(?=\s*[\d(])/gi, "*").replace(/÷/g, "/").replace(/(\d),(\d)/g, "$1.$2");
  const out: Token[] = [];
  const re = /\s*(?:(\d+\.?\d*|\.\d+)|([a-zA-Zçğıöşüπ]+)|([-+*/^%()]))/y;
  let i = 0;
  while (i < s.length) {
    re.lastIndex = i;
    const m = re.exec(s);
    if (!m) return s.slice(i).trim() ? null : out;
    if (m[1]) out.push({ t: "num", v: parseFloat(m[1]) });
    else if (m[2]) out.push({ t: "id", v: m[2].toLowerCase() });
    else out.push({ t: "op", v: m[3] });
    i = re.lastIndex;
  }
  return out;
}

export function evaluate(src: string): number | null {
  const tokens = tokenize(src);
  if (!tokens?.length) return null;
  // En az bir işlem ya da fonksiyon olmalı — düz sayı "hesap" değildir.
  if (!tokens.some((t) => (t.t === "op" && t.v !== "(" && t.v !== ")") || (t.t === "id" && t.v in FUNCS))) return null;

  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (v: string) => {
    const t = tokens[pos];
    if (t?.t === "op" && t.v === v) {
      pos++;
      return true;
    }
    return false;
  };

  const expr = (): number => {
    let v = term();
    for (;;) {
      if (eat("+")) v += term();
      else if (eat("-")) v -= term();
      else return v;
    }
  };
  const term = (): number => {
    let v = power();
    for (;;) {
      if (eat("*")) v *= power();
      else if (eat("/")) v /= power();
      else return v;
    }
  };
  const power = (): number => {
    const base = unary();
    return eat("^") ? base ** power() : base;
  };
  const unary = (): number => {
    if (eat("-")) return -unary();
    if (eat("+")) return unary();
    return postfix();
  };
  const postfix = (): number => {
    let v = primary();
    while (eat("%")) v /= 100;
    return v;
  };
  const primary = (): number => {
    const t = peek();
    if (!t) throw 0;
    if (t.t === "num") {
      pos++;
      return t.v;
    }
    if (t.t === "id") {
      pos++;
      if (t.v in CONSTS) return CONSTS[t.v];
      const fn = FUNCS[t.v];
      if (!fn) throw 0;
      return fn(primary());
    }
    if (eat("(")) {
      const v = expr();
      if (!eat(")")) throw 0;
      return v;
    }
    throw 0;
  };

  try {
    const v = expr();
    return pos === tokens.length && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

export function formatNumber(v: number): string {
  const rounded = Math.abs(v) >= 1e15 || (Math.abs(v) < 1e-6 && v !== 0) ? v.toExponential(6) : String(+v.toPrecision(12));
  return rounded.replace(".", ",");
}
