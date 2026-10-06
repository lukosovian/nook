/**
 * Yalnızca geliştirme: ?preview=perch — sahte bir pencerenin başlık çubuğuna tünemiş Nook.
 * ?vx=… ile sabit hızla yatar, ?wobble ile pencere sağa sola gidip gelir (Nook sendeler).
 */
import { useEffect, useRef } from "react";
import { Perch } from "../components/outings/Perch";
import { devEmit, EVENTS } from "../lib/bridge";

export function PerchStage() {
  const q = new URLSearchParams(location.search);
  const vx = Number(q.get("vx") ?? 0);
  const wobble = q.has("wobble");
  const win = useRef<HTMLDivElement>(null);
  const seat = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vx) return;
    const t = window.setInterval(() => devEmit(EVENTS.perchMove, { vx, vy: 0 }), 33);
    return () => window.clearInterval(t);
  }, [vx]);

  // Pencere bir süre durur, sonra hızla bir yana çekilir, durur, öbür yana…
  useEffect(() => {
    if (!wobble) return;
    let last = performance.now();
    let x = 0;
    const start = performance.now();
    const loop = () => {
      const now = performance.now();
      const t = ((now - start) / 1000) % 4;
      // 0–1 s bekle, 1–1.35 s hızla sağa, 1.35–2.5 s bekle (sendeler), 2.5–2.85 s hızla sola, sonra bekle
      const ease = (k: number) => k * k * (3 - 2 * k);
      const target = t < 1 ? 0 : t < 1.35 ? ease((t - 1) / 0.35) * 200 : t < 2.5 ? 200 : t < 2.85 ? 200 - ease((t - 2.5) / 0.35) * 200 : 0;
      const dt = Math.max(1, now - last) / 1000;
      const v = (target - x) / dt;
      x = target;
      last = now;
      if (win.current) win.current.style.transform = `translateX(${x}px)`;
      if (seat.current) seat.current.style.transform = `translateX(${x}px)`;
      devEmit(EVENTS.perchMove, { vx: v, vy: 0 });
    };
    // Başsız tarayıcıda kare döngüsü durabiliyor; zamanlayıcıyla sür
    const t = window.setInterval(loop, 33);
    return () => window.clearInterval(t);
  }, [wobble]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "linear-gradient(160deg,#2b4a6b,#1a2433)" }}>
      {/* Sahte pencere */}
      <div ref={win} style={{ position: "absolute", left: 60, top: 200, width: 440, height: 300, borderRadius: 8, background: "#f3f3f3", boxShadow: "0 10px 40px rgba(0,0,0,.5)", overflow: "hidden" }}>
        <div style={{ height: 32, background: "#e6e6e6", display: "flex", alignItems: "center", padding: "0 12px", fontSize: 12, color: "#333", fontFamily: "Segoe UI" }}>
          Documents — File Explorer<span style={{ marginLeft: "auto", letterSpacing: 18 }}>— ▢ ✕</span>
        </div>
      </div>
      {/* Tünek penceresi: alt kenarı başlık çubuğunun 12 px altında */}
      <div ref={seat} style={{ position: "absolute", left: 200, top: 200 + 12 - 150, width: 160, height: 150, transform: "translateZ(0)", outline: q.has("box") ? "1px dashed #fff5" : undefined }}>
        <Perch />
      </div>
    </div>
  );
}
