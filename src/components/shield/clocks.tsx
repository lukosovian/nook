/**
 * Her sahnenin kendi saati: sahnenin içinde bir eşya olarak (ahşap tabela, kara tahta, neon, ekran…),
 * boş bir yere yerleşir ve hiçbir şeyi örtmez. Konumlar sahne koordinatında (1600×900).
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Moon, Sun, type LucideIcon } from "lucide-react";
import { SKY_LABEL, type Sky } from "../../lib/weather";
import { useNook } from "../../store/nook";
import { locale } from "../../lib/i18n";

const SKY_ICON: Record<Sky, LucideIcon> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

/** Saat, tarih ve (taze ise) hava durumu */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  const weather = useNook((s) => s.weather);
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const w = weather && Date.now() - weather.at < 3 * 3600_000 ? weather : null;
  return {
    time: now.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }),
    date: now.toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" }),
    wx: w ? { Icon: w.sky === "clear" && !w.isDay ? Moon : SKY_ICON[w.sky], temp: `${w.temp}°`, label: SKY_LABEL[w.sky] } : null,
  };
}

type Clock = ReturnType<typeof useClock>;

/** Tabelaya yazılmış saat: büyük saat, altında tarih ve hava */
function Face({ c, time, sub, gap = 6, wxSize = 20 }: { c: Clock; time: CSSProperties; sub: CSSProperties; gap?: number; wxSize?: number }) {
  return (
    <div className="flex flex-col items-center leading-none">
      <span className="tabular-nums" style={time}>
        {c.time}
      </span>
      <span className="capitalize" style={{ ...sub, marginTop: gap }}>
        {c.date}
      </span>
      {c.wx && (
        <span className="flex items-center gap-2" style={{ ...sub, marginTop: gap }}>
          <c.wx.Icon size={wxSize} strokeWidth={2.3} />
          <b>{c.wx.temp}</b>
          {c.wx.label}
        </span>
      )}
    </div>
  );
}

function At({ x, y, w, h, children, style }: { x: number; y: number; w: number; h: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="pointer-events-none absolute" style={{ left: x, top: y, width: w, height: h, ...style }}>
      {children}
    </div>
  );
}

const WOOD = "repeating-linear-gradient(180deg, #8a5a34 0 40px, #7a4b2b 40px 42px), linear-gradient(90deg, #8a5a34, #6b4226)";

// 1. Kamp: direğe çakılmış ahşap tabela, oyma yazı
export function CampClock() {
  const c = useClock();
  return (
    <At x={1300} y={500} w={290} h={270}>
      <div className="absolute left-[132px] top-[120px] h-[150px] w-[24px] rounded-sm" style={{ background: "linear-gradient(90deg,#5a3a22,#7a4b2b)" }} />
      <div className="absolute inset-x-0 top-0 flex h-[150px] items-center justify-center rounded-[14px]" style={{ background: WOOD, boxShadow: "0 10px 24px -8px rgba(0,0,0,0.7), inset 0 0 0 4px #5a3a22" }}>
        {[14, 262].map((x) => [14, 122].map((y) => <span key={`${x}${y}`} className="absolute h-2 w-2 rounded-full bg-[#3a2416]" style={{ left: x, top: y }} />))}
        <Face c={c} time={{ fontFamily: "var(--font-round)", fontSize: 62, fontWeight: 800, color: "#ffe9c4", textShadow: "0 2px 0 #3a2416, 0 -1px 0 #a8744a" }} sub={{ fontSize: 15, fontWeight: 700, color: "#f3d9b0", textShadow: "0 1px 0 #3a2416" }} gap={5} wxSize={15} />
      </div>
    </At>
  );
}

// 2. Kafe: tavandan iple asılı kara tahta menü, tebeşir yazı
export function CafeClock() {
  const c = useClock();
  return (
    <At x={980} y={0} w={380} h={290}>
      {[60, 320].map((x) => (
        <span key={x} className="absolute top-0 h-[50px] w-[3px] bg-[#2a1a10]" style={{ left: x }} />
      ))}
      <motion.div className="absolute inset-x-0 top-[48px] flex h-[230px] items-center justify-center rounded-[10px]" style={{ background: "radial-gradient(120% 100% at 30% 20%, #34413a, #1f2823)", boxShadow: "inset 0 0 0 10px #6b4226, 0 14px 30px -10px rgba(0,0,0,0.7)", originY: 0 }} animate={{ rotate: [-0.8, 0.8, -0.8] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
        <Face c={c} time={{ fontFamily: "var(--font-round)", fontSize: 78, fontWeight: 700, color: "#f4f1e8", opacity: 0.92, textShadow: "0 0 2px rgba(255,255,255,0.4)" }} sub={{ fontFamily: "var(--font-round)", fontSize: 18, color: "#e8e2cf", opacity: 0.85 }} gap={8} wxSize={18} />
        <span className="absolute bottom-4 right-6 h-[6px] w-[34px] rounded-full bg-[#f4f1e8]/80" />
      </motion.div>
    </At>
  );
}

// 3. Disko: duvarda neon tabela
export function DiscoClock() {
  const c = useClock();
  const neon = (col: string) => `0 0 6px ${col}, 0 0 16px ${col}, 0 0 34px ${col}`;
  return (
    <At x={100} y={110} w={440} h={230}>
      <div className="absolute inset-0 flex items-center justify-center rounded-[22px]" style={{ background: "rgba(10,4,20,0.75)", boxShadow: "inset 0 0 0 3px #ff3ea5, 0 0 30px -4px #ff3ea5" }}>
        <motion.div animate={{ opacity: [1, 1, 0.55, 1, 1] }} transition={{ duration: 5, repeat: Infinity, times: [0, 0.8, 0.82, 0.84, 1] }}>
          <Face c={c} time={{ fontFamily: "var(--font-round)", fontSize: 84, fontWeight: 800, color: "#ffd6ef", textShadow: neon("#ff3ea5") }} sub={{ fontSize: 18, fontWeight: 600, color: "#d6f6ff", textShadow: neon("#00b8ff") }} gap={10} />
        </motion.div>
      </div>
    </At>
  );
}

// 4. Uzay: duvar panelinde yeşil ekran
export function SpaceClock() {
  const c = useClock();
  const lcd = "#5dffa8";
  return (
    <At x={60} y={46} w={420} h={200}>
      <div className="absolute inset-0 rounded-[18px] p-3" style={{ background: "#2c3346", boxShadow: "inset 0 0 0 3px #3a4256" }}>
        <div className="relative flex h-full items-center justify-center overflow-hidden rounded-[10px]" style={{ background: "#07150d", boxShadow: `inset 0 0 30px rgba(93,255,168,0.15)` }}>
          <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(180deg, rgba(93,255,168,0.06) 0 2px, transparent 2px 4px)" }} />
          <Face c={c} time={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: 72, fontWeight: 700, color: lcd, textShadow: `0 0 12px ${lcd}` }} sub={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: 15, color: lcd, opacity: 0.8 }} gap={6} wxSize={15} />
        </div>
      </div>
    </At>
  );
}

// 5. Sahil: gökyüzünde uçağın çektiği afiş
export function BeachClock() {
  const c = useClock();
  return (
    <motion.div className="pointer-events-none absolute" style={{ left: 80, top: 50, width: 640, height: 180 }} animate={{ y: [0, -10, 0], x: [0, 14, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
      <motion.div className="absolute left-0 top-[14px] flex h-[150px] w-[440px] items-center justify-center" style={{ background: "#fffaf0", borderRadius: "6px 18px 18px 6px", boxShadow: "0 10px 24px -12px rgba(0,60,120,0.5)", originX: 1 }} animate={{ skewY: [-1.5, 1.5, -1.5] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
        <Face c={c} time={{ fontFamily: "var(--font-round)", fontSize: 66, fontWeight: 800, color: "#1e5fa8" }} sub={{ fontSize: 15, fontWeight: 700, color: "#3b7cc4" }} gap={5} wxSize={15} />
      </motion.div>
      <svg className="absolute left-[436px] top-0 overflow-visible" width="200" height="180">
        <path d="M0 89 C 40 80, 60 100, 96 86" stroke="#7a7a7a" strokeWidth="2" fill="none" />
        <g transform="translate(96 60)">
          <path d="M0 26 Q10 12 60 14 Q86 16 90 26 Q86 36 60 38 Q10 40 0 26 Z" fill="#ff5c5c" />
          <path d="M34 20 L52 -6 L62 -6 L54 20 Z" fill="#e24a4a" />
          <path d="M34 32 L52 56 L62 56 L54 32 Z" fill="#e24a4a" />
          <path d="M2 26 L-10 12 L-4 12 L10 22 Z" fill="#e24a4a" />
          <circle cx="74" cy="24" r="5" fill="#bfeaff" />
          <motion.rect x="89" y="10" width="3" height="32" rx="1.5" fill="#555" animate={{ scaleY: [1, 0.1, 1] }} transition={{ duration: 0.15, repeat: Infinity }} style={{ transformOrigin: "90px 26px" }} />
        </g>
      </svg>
    </motion.div>
  );
}

// 6. Kütüphane: iki rafın arasında asılı eski parşömen
export function LibraryClock() {
  const c = useClock();
  return (
    <At x={610} y={36} w={380} h={230}>
      <div className="absolute inset-x-[10px] top-[16px] flex h-[198px] items-center justify-center" style={{ background: "linear-gradient(180deg,#f3e3bc,#e2c98f)", boxShadow: "0 12px 30px -10px rgba(0,0,0,0.7), inset 0 0 40px rgba(140,100,40,0.35)" }}>
        <Face c={c} time={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 74, fontWeight: 700, color: "#4a2f1f" }} sub={{ fontFamily: "Georgia, serif", fontSize: 17, fontStyle: "italic", color: "#6b4a2e" }} gap={6} wxSize={16} />
      </div>
      {[0, 214].map((y) => (
        <span key={y} className="absolute inset-x-0 h-[20px] rounded-full" style={{ top: y, background: "linear-gradient(180deg,#d9c08a,#a8844a,#d9c08a)", boxShadow: "0 3px 6px rgba(0,0,0,0.4)" }} />
      ))}
    </At>
  );
}

// 7. Maden: tavandan iple sarkan tahta, kristal gibi parlayan yazı
export function MineClock() {
  const c = useClock();
  const glow = "#9ff6ff";
  return (
    <At x={610} y={0} w={380} h={420}>
      {[40, 336].map((x) => (
        <span key={x} className="absolute top-0 h-[250px] w-[4px]" style={{ left: x, background: "repeating-linear-gradient(180deg,#a8844a 0 6px,#7a5a30 6px 12px)" }} />
      ))}
      <motion.div className="absolute inset-x-0 top-[240px] flex h-[170px] items-center justify-center rounded-[12px]" style={{ background: "repeating-linear-gradient(180deg, #4a3220 0 34px, #3a2616 34px 36px)", boxShadow: "inset 0 0 0 4px #2a1a10, 0 0 40px -6px rgba(47,212,192,0.45)", originY: -1.4 }} animate={{ rotate: [-1, 1, -1] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
        <Face c={c} time={{ fontFamily: "var(--font-round)", fontSize: 70, fontWeight: 800, color: "#e6feff", textShadow: `0 0 10px ${glow}, 0 0 26px #2fd4c0` }} sub={{ fontSize: 15, fontWeight: 600, color: glow, textShadow: "0 0 8px #2fd4c0" }} gap={6} wxSize={15} />
      </motion.div>
    </At>
  );
}

// 8. Zen: iki direkli ahşap levha, mürekkep yazı ve kırmızı mühür
export function ZenClock() {
  const c = useClock();
  return (
    <At x={50} y={300} w={360} h={320}>
      {[50, 290].map((x) => (
        <span key={x} className="absolute top-[20px] h-[300px] w-[18px] rounded-sm" style={{ left: x, background: "linear-gradient(90deg,#5a3a32,#7a5048)" }} />
      ))}
      <span className="absolute -left-[14px] top-0 h-[22px] w-[388px] rounded-[6px]" style={{ background: "#c0392b", boxShadow: "0 4px 8px rgba(0,0,0,0.25)" }} />
      <div className="absolute inset-x-[14px] top-[40px] flex h-[176px] items-center justify-center rounded-[6px]" style={{ background: "linear-gradient(180deg,#f1e2c2,#e2cda2)", boxShadow: "inset 0 0 0 5px #8a6248, 0 10px 20px -8px rgba(90,58,50,0.5)" }}>
        <Face c={c} time={{ fontFamily: "Georgia, serif", fontSize: 66, fontWeight: 700, color: "#2b2420" }} sub={{ fontSize: 15, fontWeight: 600, color: "#4a3a30" }} gap={6} wxSize={15} />
        <span className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-[4px] text-[13px] font-bold text-white" style={{ background: "#c0392b" }}>
          N
        </span>
      </div>
    </At>
  );
}

// 9. Atölye: duvardaki tuvale boyanmış saat
export function StudioClock() {
  const c = useClock();
  return (
    <At x={600} y={40} w={400} h={250}>
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#fffdf6", boxShadow: "inset 0 0 0 8px #c9b98f, 0 14px 30px -12px rgba(90,60,30,0.5)" }}>
        <Face
          c={c}
          time={{ fontFamily: "var(--font-round)", fontSize: 84, fontWeight: 900, background: "linear-gradient(90deg,#ff3b4a,#ffd21f,#16c47f,#2b8cff,#e23bd6)", WebkitBackgroundClip: "text", color: "transparent" }}
          sub={{ fontFamily: "var(--font-round)", fontSize: 17, fontWeight: 700, color: "#5a4a3a" }}
          gap={6}
          wxSize={16}
        />
        {[[60, "#2b8cff"], [330, "#ff3b4a"]].map(([x, col]) => (
          <span key={x} className="absolute bottom-[-18px] w-[8px] rounded-b-full" style={{ left: x as number, height: 26, background: col as string }} />
        ))}
      </div>
    </At>
  );
}

// 10. Kar: üstü karlı, buz saçaklı tabela
export function SnowClock() {
  const c = useClock();
  return (
    <At x={720} y={370} w={360} h={280}>
      <span className="absolute left-[170px] top-[120px] h-[160px] w-[20px] rounded-sm" style={{ background: "linear-gradient(90deg,#5a3a22,#7a4b2b)" }} />
      <div className="absolute inset-x-0 top-[14px] flex h-[150px] items-center justify-center rounded-[14px]" style={{ background: WOOD, boxShadow: "inset 0 0 0 4px #5a3a22, 0 10px 20px -8px rgba(40,60,90,0.5)" }}>
        <Face c={c} time={{ fontFamily: "var(--font-round)", fontSize: 64, fontWeight: 800, color: "#fff8ec", textShadow: "0 2px 0 #3a2416" }} sub={{ fontSize: 15, fontWeight: 700, color: "#f3e4cc", textShadow: "0 1px 0 #3a2416" }} gap={5} wxSize={15} />
      </div>
      <span className="absolute -left-[8px] top-0 h-[30px] w-[376px] rounded-[20px]" style={{ background: "radial-gradient(circle at 30% 40%, #fff, #e8f1fa)", boxShadow: "0 3px 6px rgba(40,60,90,0.2)" }} />
      {[40, 90, 150, 230, 300].map((x, i) => (
        <span key={x} className="absolute top-[160px] w-[8px]" style={{ left: x, height: 14 + (i % 3) * 8, background: "linear-gradient(180deg,#e8f6ff,#bfe3f5)", clipPath: "polygon(0 0,100% 0,50% 100%)" }} />
      ))}
    </At>
  );
}
