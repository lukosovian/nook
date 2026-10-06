/** Yalnızca geliştirme: ?preview=perch — sahte bir pencerenin başlık çubuğuna tünemiş Nook. ?vx=… ile yatar */
import { useEffect } from "react";
import { Perch } from "../components/outings/Perch";
import { devEmit, EVENTS } from "../lib/bridge";

export function PerchStage() {
  const q = new URLSearchParams(location.search);
  const vx = Number(q.get("vx") ?? 0);
  useEffect(() => {
    if (!vx) return;
    const t = window.setInterval(() => devEmit(EVENTS.perchMove, { vx, vy: 0 }), 33);
    return () => window.clearInterval(t);
  }, [vx]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "linear-gradient(160deg,#2b4a6b,#1a2433)" }}>
      {/* Sahte pencere */}
      <div style={{ position: "absolute", left: 60, top: 200, width: 520, height: 300, borderRadius: 8, background: "#f3f3f3", boxShadow: "0 10px 40px rgba(0,0,0,.5)", overflow: "hidden" }}>
        <div style={{ height: 32, background: "#e6e6e6", display: "flex", alignItems: "center", padding: "0 12px", fontSize: 12, color: "#333", fontFamily: "Segoe UI" }}>
          Belgeler — Dosya Gezgini<span style={{ marginLeft: "auto", letterSpacing: 18 }}>— ▢ ✕</span>
        </div>
      </div>
      {/* Tünek penceresi: alt kenarı başlık çubuğunun 12 px altında */}
      <div style={{ position: "absolute", left: 240, top: 200 + 12 - 150, width: 160, height: 150, transform: "translateZ(0)", outline: q.has("box") ? "1px dashed #fff5" : undefined }}>
        <Perch />
      </div>
    </div>
  );
}
