import { useRef, useState } from "react";

interface T {
  s: number;
  x: number;
  y: number;
}

const MAX = 6;

/**
 * Yakınlaştırılabilir görsel: iki parmakla büyüt, tek parmakla kaydır, iki kez dokun → büyüt / geri.
 * Görsel kutuya sığar; büyütülünce kenarları kutunun dışına taşmaz.
 */
export function ZoomImage({ src, className = "" }: { src: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [t, setT] = useState<T>({ s: 1, x: 0, y: 0 });
  const tr = useRef(t);
  tr.current = t;
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ t: T; d: number; cx: number; cy: number } | null>(null);
  const lastTap = useRef({ at: 0, x: 0, y: 0 });
  const moved = useRef(false);

  /** Kutunun ortasına göre konum */
  const rel = (x: number, y: number) => {
    const r = box.current!.getBoundingClientRect();
    return { x: x - (r.left + r.width / 2), y: y - (r.top + r.height / 2) };
  };

  const clamp = (n: T): T => {
    const s = Math.min(MAX, Math.max(1, n.s));
    const b = box.current?.getBoundingClientRect();
    const i = img.current;
    if (!b || !i) return { s, x: 0, y: 0 };
    const w = i.clientWidth * s;
    const h = i.clientHeight * s;
    const mx = Math.max(0, (w - b.width) / 2);
    const my = Math.max(0, (h - b.height) / 2);
    return { s, x: Math.min(mx, Math.max(-mx, n.x)), y: Math.min(my, Math.max(-my, n.y)) };
  };

  const begin = () => {
    const p = [...pts.current.values()];
    if (p.length >= 2) {
      const c = rel((p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2);
      start.current = { t: tr.current, d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), cx: c.x, cy: c.y };
    } else if (p.length === 1) {
      const c = rel(p[0].x, p[0].y);
      start.current = { t: tr.current, d: 0, cx: c.x, cy: c.y };
    } else start.current = null;
  };

  const zoomAt = (x: number, y: number, s: number) => {
    const cur = tr.current;
    const qx = (x - cur.x) / cur.s;
    const qy = (y - cur.y) / cur.s;
    setT(clamp({ s, x: x - s * qx, y: y - s * qy }));
  };

  return (
    <div
      ref={box}
      className={`relative flex touch-none select-none items-center justify-center overflow-hidden ${className}`}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        moved.current = false;
        begin();
      }}
      onPointerMove={(e) => {
        if (!pts.current.has(e.pointerId)) return;
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const st = start.current;
        if (!st) return;
        const p = [...pts.current.values()];
        if (p.length >= 2 && st.d > 0) {
          moved.current = true;
          const c = rel((p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2);
          const s = Math.min(MAX, Math.max(1, (st.t.s * Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)) / st.d));
          // Parmakların arasındaki nokta yerinde kalsın, parmaklar kayınca görsel de kaysın
          const qx = (st.cx - st.t.x) / st.t.s;
          const qy = (st.cy - st.t.y) / st.t.s;
          setT(clamp({ s, x: c.x - s * qx, y: c.y - s * qy }));
        } else if (p.length === 1) {
          const c = rel(p[0].x, p[0].y);
          if (Math.hypot(c.x - st.cx, c.y - st.cy) > 6) moved.current = true;
          if (st.t.s > 1) setT(clamp({ s: st.t.s, x: st.t.x + c.x - st.cx, y: st.t.y + c.y - st.cy }));
        }
      }}
      onPointerUp={(e) => {
        pts.current.delete(e.pointerId);
        if (!pts.current.size && !moved.current) {
          // İki kez dokunma: büyüt / geri
          const now = Date.now();
          const c = rel(e.clientX, e.clientY);
          const prev = lastTap.current;
          if (now - prev.at < 300 && Math.hypot(c.x - prev.x, c.y - prev.y) < 40) {
            if (tr.current.s > 1.05) setT({ s: 1, x: 0, y: 0 });
            else zoomAt(c.x, c.y, 2.5);
            lastTap.current = { at: 0, x: 0, y: 0 };
          } else lastTap.current = { at: now, x: c.x, y: c.y };
        }
        begin();
      }}
      onPointerCancel={(e) => {
        pts.current.delete(e.pointerId);
        begin();
      }}
    >
      <img
        ref={img}
        src={src}
        alt=""
        draggable={false}
        className="max-h-full max-w-full object-contain"
        style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`, transition: pts.current.size ? "none" : "transform 0.18s ease-out" }}
      />
    </div>
  );
}
