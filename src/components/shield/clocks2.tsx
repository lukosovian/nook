/**
 * Sahne 11–22'nin saatleri (bkz. clocks.tsx): skor tabelası, pirinç lombar, buğulu cam, tren bileti,
 * sinema tabelası, aranıyor afişi, korsan bayrağı, Nixie tüpleri, emaye yol tabelası, sayaçlı pano,
 * balona bağlı bilet, kurşun kalem karalaması. Konumlar sahne koordinatında (1600×900).
 */
import { motion } from "motion/react";
import { At, Face, useClock } from "./clocks";

const round = "var(--font-round)";

// 11. Atari salonu: duvarda LED skor tabelası
export function ArcadeClock() {
  const c = useClock();
  const led = "#ffe04a";
  return (
    <At x={560} y={44} w={480} h={220}>
      <div className="absolute inset-0 rounded-[18px] p-3" style={{ background: "#1a0c2e", boxShadow: "inset 0 0 0 3px #b14dff, 0 0 34px -6px #b14dff" }}>
        <div className="relative flex h-full items-center justify-center overflow-hidden rounded-[10px]" style={{ background: "#07030d" }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle, rgba(255,224,74,0.09) 1px, transparent 1.6px) 0 0/6px 6px" }} />
          <motion.div animate={{ opacity: [1, 1, 0.75, 1] }} transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}>
            <Face c={c} time={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: 80, fontWeight: 800, color: led, letterSpacing: 4, textShadow: `0 0 10px ${led}, 0 0 24px #ff9a1f` }} sub={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: 15, color: "#7ff3ff", textShadow: "0 0 8px #00b8ff" }} gap={7} wxSize={15} />
          </motion.div>
        </div>
      </div>
    </At>
  );
}

// 12. Deniz altı: batık gemiden kalma pirinç lombar
export function OceanClock() {
  const c = useClock();
  return (
    <motion.div className="pointer-events-none absolute" style={{ left: 1150, top: 50, width: 330, height: 330 }} animate={{ y: [0, -8, 0], rotate: [-2, 2, -2] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}>
      <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, #f3c77a, #b07a32 55%, #6b4518)", boxShadow: "0 12px 30px -8px rgba(0,20,40,0.6)" }} />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return <span key={i} className="absolute h-[14px] w-[14px] rounded-full" style={{ left: 158 + Math.cos(a) * 146, top: 158 + Math.sin(a) * 146, background: "radial-gradient(circle at 35% 35%, #ffe2a8, #8a5a24)" }} />;
      })}
      <div className="absolute inset-[30px] flex items-center justify-center rounded-full" style={{ background: "radial-gradient(circle at 40% 30%, rgba(170,235,255,0.35), rgba(10,60,90,0.85))", boxShadow: "inset 0 0 0 6px #6b4518, inset 0 0 30px rgba(0,0,0,0.5)" }}>
        <Face c={c} time={{ fontFamily: round, fontSize: 60, fontWeight: 800, color: "#e8fbff", textShadow: "0 0 14px rgba(120,220,255,0.7)" }} sub={{ fontSize: 14, fontWeight: 700, color: "#bdefff" }} gap={5} wxSize={14} />
        <span className="absolute left-[44px] top-[34px] h-[46px] w-[22px] rotate-[35deg] rounded-full bg-white/25" />
      </div>
    </motion.div>
  );
}

// 13. Sera: buğulu cama parmakla yazılmış saat, damlalar süzülür
export function GreenhouseClock() {
  const c = useClock();
  return (
    <At x={590} y={60} w={420} h={230}>
      <div className="absolute inset-0 flex items-center justify-center rounded-[8px]" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.62), rgba(235,248,240,0.5))", backdropFilter: "blur(3px)", boxShadow: "inset 0 0 0 6px rgba(255,255,255,0.75), 0 6px 20px -10px rgba(30,70,50,0.4)" }}>
        <Face c={c} time={{ fontFamily: round, fontSize: 80, fontWeight: 800, color: "rgba(40,95,70,0.78)", textShadow: "0 1px 0 rgba(255,255,255,0.7)" }} sub={{ fontFamily: round, fontSize: 17, fontWeight: 700, color: "rgba(40,95,70,0.7)" }} gap={6} wxSize={16} />
        {[70, 150, 300, 350].map((x, i) => (
          <motion.span key={x} className="absolute w-[5px] rounded-full bg-white/80" style={{ left: x, top: 150 }} animate={{ height: [0, 40 + i * 10, 40 + i * 10], opacity: [0, 0.9, 0] }} transition={{ duration: 5 + i, repeat: Infinity, delay: i * 1.7 }} />
        ))}
      </div>
    </At>
  );
}

// 14. Gece treni: duvara iğnelenmiş karton bilet, delikli
export function TrainClock() {
  const c = useClock();
  return (
    <At x={46} y={96} w={300} h={196} style={{ transform: "rotate(-3deg)" }}>
      <div className="absolute inset-0 flex items-center justify-center rounded-[10px]" style={{ background: "linear-gradient(180deg,#f3e6c4,#e6d3a2)", boxShadow: "0 10px 22px -8px rgba(0,0,0,0.6), inset 0 0 0 2px #b89a5a", border: "1px dashed transparent" }}>
        <span className="absolute inset-y-3 left-[34px] border-l-2 border-dashed border-[#b89a5a]" />
        <span className="absolute left-[10px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 rounded-full" style={{ background: "#3a1a1a" }} />
        <div className="pl-[30px]">
          <Face c={c} time={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: 54, fontWeight: 800, color: "#7a2222" }} sub={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: 13, fontWeight: 700, color: "#5a3a22" }} gap={5} wxSize={13} />
        </div>
      </div>
      <span className="absolute left-1/2 top-[-6px] h-[14px] w-[14px] -translate-x-1/2 rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, #ff8a8a, #b02a2a)", boxShadow: "0 2px 3px rgba(0,0,0,0.5)" }} />
    </At>
  );
}

/** Dikdörtgenin kenarı boyunca (içeri 12 px) eşit aralıklı `n` ampul */
function bulbs(w: number, h: number, n: number) {
  const iw = w - 24;
  const ih = h - 24;
  const per = 2 * (iw + ih);
  return Array.from({ length: n }, (_, i) => {
    const d = (i / n) * per;
    if (d < iw) return [12 + d, 12];
    if (d < iw + ih) return [12 + iw, 12 + d - iw];
    if (d < 2 * iw + ih) return [12 + iw - (d - iw - ih), 12 + ih];
    return [12, 12 + ih - (d - 2 * iw - ih)];
  });
}

// 15. Sinema: ampullerle çevrili harf panosu
export function CinemaClock() {
  const c = useClock();
  return (
    <At x={70} y={70} w={420} h={230}>
      <div className="absolute inset-0 rounded-[14px]" style={{ background: "#3a0d14", boxShadow: "0 0 40px -6px rgba(255,200,120,0.5)" }} />
      {bulbs(420, 230, 30).map(([x, y], i) => (
        <motion.span key={i} className="absolute h-[12px] w-[12px] rounded-full" style={{ left: x - 6, top: y - 6, background: "#ffe6a0", boxShadow: "0 0 10px #ffc04a" }} animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.2, repeat: Infinity, delay: (i % 2) * 0.6 }} />
      ))}
      <div className="absolute inset-[24px] flex items-center justify-center rounded-[6px]" style={{ background: "linear-gradient(180deg,#fffaf0,#f1e6cf)", boxShadow: "inset 0 0 0 2px #c9b48a" }}>
        <div className="absolute inset-x-3 top-1/2 h-px bg-[#c9b48a]/50" />
        <Face c={c} time={{ fontFamily: "Impact, 'Arial Narrow', sans-serif", fontSize: 76, color: "#1a1a1a", letterSpacing: 3 }} sub={{ fontFamily: "Impact, 'Arial Narrow', sans-serif", fontSize: 16, color: "#8a1a24", letterSpacing: 1 }} gap={6} wxSize={15} />
      </div>
    </At>
  );
}

// 16. Vahşi Batı: saloon duvarına çakılmış "aranıyor" afişi, köşesi kıvrık
export function WesternClock() {
  const c = useClock();
  return (
    <At x={60} y={290} w={270} h={300} style={{ transform: "rotate(2deg)" }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: "radial-gradient(120% 100% at 40% 30%, #f1dcae, #d9b77a 70%, #b8925a)", boxShadow: "0 10px 20px -8px rgba(40,10,0,0.6)", clipPath: "polygon(0 0, 100% 0, 100% 88%, 88% 100%, 0 100%)" }}>
        <svg width="54" height="54" viewBox="-10 -10 20 20">
          <path d="M0 -9 L2.3 -3.2 L8.6 -2.8 L3.7 1.2 L5.3 7.3 L0 3.9 L-5.3 7.3 L-3.7 1.2 L-8.6 -2.8 L-2.3 -3.2 Z" fill="#6b3a1a" />
          <circle r="2" fill="#d9b77a" />
        </svg>
        <Face c={c} time={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 58, fontWeight: 900, color: "#4a2410" }} sub={{ fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 700, color: "#6b3a1a" }} gap={5} wxSize={14} />
      </div>
      <span className="absolute bottom-0 right-0 h-[36px] w-[36px]" style={{ background: "linear-gradient(135deg, #b8925a 50%, transparent 50%)" }} />
      {[[16, 12], [238, 12]].map(([x, y]) => (
        <span key={x} className="absolute h-[10px] w-[10px] rounded-full bg-[#5a5a5a]" style={{ left: x, top: y, boxShadow: "0 1px 2px rgba(0,0,0,0.5)" }} />
      ))}
    </At>
  );
}

// 17. Korsan gemisi: direkte dalgalanan kara bayrak, kemik beyazı yazı
export function PirateClock() {
  const c = useClock();
  return (
    <At x={1060} y={60} w={420} h={250}>
      <span className="absolute right-[14px] top-[-20px] h-[520px] w-[12px] rounded-full" style={{ background: "linear-gradient(90deg,#4a2e1a,#7a5030)" }} />
      <motion.div className="absolute left-0 top-0 flex h-[220px] w-[390px] items-center justify-center" style={{ background: "linear-gradient(90deg,#0d0d10,#1c1c22)", borderRadius: "14px 4px 4px 14px", boxShadow: "0 12px 24px -10px rgba(0,0,0,0.8)", originX: 1 }} animate={{ skewY: [2, -2, 2], scaleX: [1, 0.97, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
        <svg className="absolute left-[18px] top-[16px]" width="40" height="40" viewBox="0 0 20 20">
          <circle cx="10" cy="8" r="6" fill="#f1ead8" />
          <circle cx="7.6" cy="8" r="1.6" fill="#0d0d10" />
          <circle cx="12.4" cy="8" r="1.6" fill="#0d0d10" />
          <path d="M3 15 L17 19 M17 15 L3 19" stroke="#f1ead8" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <Face c={c} time={{ fontFamily: "Georgia, serif", fontSize: 76, fontWeight: 900, color: "#f1ead8" }} sub={{ fontFamily: "Georgia, serif", fontSize: 16, fontStyle: "italic", color: "#d8cfb8" }} gap={6} wxSize={15} />
      </motion.div>
    </At>
  );
}

// 18. Laboratuvar: turuncu yanan Nixie tüpleri, altında pirinç plaka
export function LabClock() {
  const c = useClock();
  return (
    <At x={560} y={40} w={480} h={250}>
      <div className="absolute inset-x-0 top-0 flex h-[170px] items-end justify-center gap-2 rounded-[14px] px-4 pb-3" style={{ background: "linear-gradient(180deg,#2a2420,#14110e)", boxShadow: "inset 0 0 0 3px #4a3a2a, 0 10px 24px -8px rgba(0,0,0,0.8)" }}>
        {c.time.split("").map((ch, i) =>
          ch === ":" ? (
            <span key={i} className="mb-6 flex flex-col gap-4">
              {[0, 1].map((d) => (
                <span key={d} className="h-[8px] w-[8px] rounded-full bg-[#ff8a2a]" style={{ boxShadow: "0 0 10px #ff6a00" }} />
              ))}
            </span>
          ) : (
            <span key={i} className="relative flex h-[140px] w-[74px] items-center justify-center rounded-t-[37px] rounded-b-[10px]" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,180,120,0.06) 40%, rgba(255,255,255,0.12))", boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.18)" }}>
              <span className="absolute inset-[10px] rounded-t-[30px]" style={{ background: "radial-gradient(circle, rgba(255,140,40,0.12) 1px, transparent 1.4px) 0 0/5px 5px" }} />
              <span className="tabular-nums" style={{ fontFamily: round, fontSize: 82, fontWeight: 300, color: "#ffb36a", textShadow: "0 0 8px #ff6a00, 0 0 20px #ff4a00" }}>
                {ch}
              </span>
            </span>
          ),
        )}
      </div>
      <div className="absolute inset-x-[60px] top-[180px] flex h-[60px] items-center justify-center rounded-[8px]" style={{ background: "linear-gradient(180deg,#d9b46a,#a87a34)", boxShadow: "inset 0 0 0 2px #7a5420, 0 6px 14px -6px rgba(0,0,0,0.8)" }}>
        <span className="flex items-center gap-3 capitalize" style={{ fontFamily: "Georgia, serif", fontSize: 15, fontWeight: 700, color: "#3a2410" }}>
          {c.date}
          {c.wx && (
            <span className="flex items-center gap-1.5">
              <c.wx.Icon size={15} strokeWidth={2.4} />
              {c.wx.temp}
            </span>
          )}
        </span>
      </div>
    </At>
  );
}

// 19. Lavanta tarlası: direğe takılı emaye yol tabelası, kenarları paslı
export function LavenderClock() {
  const c = useClock();
  return (
    <At x={70} y={250} w={340} h={430}>
      <span className="absolute left-[158px] top-[180px] h-[250px] w-[22px]" style={{ background: "linear-gradient(90deg,#4a3a32,#6b5448)" }} />
      <div className="absolute inset-x-0 top-0 flex h-[190px] items-center justify-center rounded-[22px]" style={{ background: "#fbf3df", boxShadow: "inset 0 0 0 8px #1f6a6a, inset 0 0 0 11px #fbf3df, inset 0 0 0 13px #1f6a6a, 0 12px 24px -10px rgba(60,20,40,0.6)" }}>
        <Face c={c} time={{ fontFamily: round, fontSize: 66, fontWeight: 900, color: "#1f5a5a" }} sub={{ fontSize: 15, fontWeight: 700, color: "#2f6a6a" }} gap={5} wxSize={15} />
        {[[18, 150, 26], [296, 28, 18], [300, 160, 14]].map(([x, y, s], i) => (
          <span key={i} className="absolute rounded-full" style={{ left: x, top: y, width: s, height: s * 0.7, background: "radial-gradient(circle, #9a4a1a, rgba(154,74,26,0))" }} />
        ))}
      </div>
    </At>
  );
}

// 20. Sığınak: duvardaki mekanik sayaçlı pano (dönen kartlar)
export function BunkerClock() {
  const c = useClock();
  return (
    <At x={60} y={50} w={460} h={230}>
      <div className="absolute inset-0 rounded-[10px]" style={{ background: "repeating-linear-gradient(135deg,#d9b21f 0 22px,#1a1a1a 22px 44px)", boxShadow: "0 10px 24px -8px rgba(0,0,0,0.8)" }} />
      <div className="absolute inset-[12px] flex flex-col items-center justify-center gap-3 rounded-[6px] bg-[#1d211c]">
        <div className="flex gap-1.5">
          {c.time.split("").map((ch, i) =>
            ch === ":" ? (
              <span key={i} className="self-center text-[48px] font-bold text-[#e8e2c8]">
                :
              </span>
            ) : (
              <motion.span key={`${i}${ch}`} className="relative flex h-[96px] w-[66px] items-center justify-center overflow-hidden rounded-[6px] bg-[#2a2a2a] text-[70px] font-bold text-[#f1ead2] tabular-nums" style={{ fontFamily: "ui-monospace, Consolas, monospace", boxShadow: "inset 0 -2px 0 #111" }} initial={{ rotateX: -90 }} animate={{ rotateX: 0 }} transition={{ duration: 0.4 }}>
                {ch}
                <span className="absolute inset-x-0 top-1/2 h-[2px] bg-[#111]" />
              </motion.span>
            ),
          )}
        </div>
        <span className="flex items-center gap-2 capitalize" style={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: 14, color: "#a8c79a" }}>
          {c.date}
          {c.wx && (
            <>
              <c.wx.Icon size={14} strokeWidth={2.4} />
              {c.wx.temp}
            </>
          )}
        </span>
      </div>
    </At>
  );
}

// 21. Dönme dolap: kırmızı balona bağlı lunapark bileti, havada süzülür
export function FerrisClock() {
  const c = useClock();
  return (
    <motion.div className="pointer-events-none absolute" style={{ left: 80, top: 30, width: 360, height: 470 }} animate={{ y: [0, -14, 0], x: [0, 8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
      <svg className="absolute left-0 top-0 overflow-visible" width="360" height="470">
        <path d="M262 150 Q 250 210 230 270" stroke="#f3e6d0" strokeWidth="2" fill="none" />
        <ellipse cx="262" cy="80" rx="58" ry="70" fill="#ff3b4a" />
        <ellipse cx="244" cy="56" rx="14" ry="22" fill="#fff" opacity="0.4" />
        <path d="M256 148 l6 10 l6 -10 Z" fill="#d02a3a" />
      </svg>
      <motion.div className="absolute left-[10px] top-[260px] flex h-[180px] w-[330px] items-center justify-center" style={{ background: "#f7e9c8", borderRadius: 10, boxShadow: "inset 0 0 0 4px #d02a3a, inset 0 0 0 7px #f7e9c8, inset 0 0 0 8px #d02a3a, 0 12px 22px -10px rgba(20,10,40,0.7)", WebkitMaskImage: "radial-gradient(circle at 0 50%, transparent 14px, #000 15px), radial-gradient(circle at 100% 50%, transparent 14px, #000 15px)", WebkitMaskComposite: "source-in", maskComposite: "intersect", originX: 0.66, originY: 0 }} animate={{ rotate: [-4, 3, -4] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
        <Face c={c} time={{ fontFamily: round, fontSize: 64, fontWeight: 900, color: "#b01e2e" }} sub={{ fontSize: 14, fontWeight: 700, color: "#7a2a3a" }} gap={5} wxSize={14} />
      </motion.div>
    </motion.div>
  );
}

// 22. Eskiz defteri: sayfaya kurşun kalemle yazılmış, taralı ve karalanmış çerçeveli
export function SketchClock() {
  const c = useClock();
  const pencil = "'Segoe Print', 'Comic Sans MS', cursive";
  return (
    <At x={950} y={70} w={460} h={250}>
      <svg className="absolute inset-0 overflow-visible" width="460" height="250">
        <path d="M14 18 Q 230 4 446 16 Q 452 125 444 234 Q 230 246 18 236 Q 8 125 14 18" stroke="#55555f" strokeWidth="2.4" fill="none" opacity="0.7" />
        <path d="M22 12 Q 240 10 440 24 M450 30 Q 440 140 452 228" stroke="#55555f" strokeWidth="1.2" fill="none" opacity="0.45" />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1={360 + i * 9} y1={232} x2={380 + i * 9} y2={206} stroke="#55555f" strokeWidth="1.2" opacity="0.4" />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" style={{ transform: "rotate(-2deg)" }}>
        <Face c={c} time={{ fontFamily: pencil, fontSize: 78, fontWeight: 700, color: "#43434c", opacity: 0.88 }} sub={{ fontFamily: pencil, fontSize: 17, color: "#55555f", opacity: 0.85 }} gap={4} wxSize={16} />
      </div>
    </At>
  );
}
