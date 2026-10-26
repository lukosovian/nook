/**
 * Adada Canlı Hava Durumu & Gece Atmosferi (Live Island Weather & Night Atmosphere).
 * - Açık havalarda: Güneş huzmeleri ve parıltılar
 * - Yağmurlu: Eğik yağmur çizgileri ve alt sıçramalar
 * - Karlı: Salınarak düşen kar taneleri ve köşe kırağı
 * - Fırtınalı: Şiddetli yağmur ve aralıklı mor şimşek parlaması
 * - Sonbahar (Ekim/Kasım): Rüzgarda süzülen kızıl/amber yapraklar
 * - Gece: Göz kırpan mikro yıldızlar ve uçuşan yeşil ateş böceği
 * - Sisli: Ağır ağır dalgalanan taban sisi
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNook } from "../../store/nook";
import type { Weather } from "../../lib/weather";

export type AtmosphereKind = "sunny" | "rain" | "snow" | "storm" | "autumn" | "night" | "fog" | "none";

interface IslandAtmosphereProps {
  width?: number;
  height?: number;
  /** Demo ve önizleme için zorunlu atmosfer türü */
  override?: AtmosphereKind;
}

/** Mevcut hava durumu, saat ve mevsime göre atmosfer türünü belirler */
export function resolveAtmosphere(weather: Weather | null, override?: AtmosphereKind): AtmosphereKind {
  if (override && override !== "none") return override;

  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth(); // 0 = Ocak, 9 = Ekim, 10 = Kasım
  const isNight = weather ? !weather.isDay : (hour >= 20 || hour < 6);

  if (weather) {
    if (weather.sky === "storm") return "storm";
    if (weather.sky === "rain" || weather.sky === "drizzle") return "rain";
    if (weather.sky === "snow") return "snow";
    if (weather.sky === "fog") return "fog";
  }

  // Gece ise öncelikli olarak gece atmosferi (yıldızlar + ateş böceği)
  if (isNight) {
    return "night";
  }

  // Ekim ve Kasım aylarında açık/parçalı havalarda sonbahar yaprakları
  if ((month === 9 || month === 10) && (!weather || weather.sky === "clear" || weather.sky === "partly")) {
    return "autumn";
  }

  // Gündüz açık hava
  if (!weather || weather.sky === "clear") {
    return "sunny";
  }

  if (weather.sky === "cloudy") {
    return "fog";
  }

  return "sunny";
}

export function IslandAtmosphere({ width: _width = 240, height: _height = 36, override }: IslandAtmosphereProps) {
  const weather = useNook((s) => s.weather);
  const settings = useNook((s) => s.settings);
  const powerSaver = settings.powerSaver;

  // Ayarlardan kapatıldıysa veya tasarruf modundaysa çizme
  if (!override && (!settings.weatherAtmosphere || powerSaver)) {
    return null;
  }

  const kind = resolveAtmosphere(weather, override);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] select-none"
      aria-hidden="true"
    >
      <AnimatePresence mode="wait">
        {kind === "sunny" && <SunnyLayer key="sunny" />}
        {kind === "rain" && <RainLayer key="rain" heavy={false} />}
        {kind === "storm" && <RainLayer key="storm" heavy={true} />}
        {kind === "snow" && <SnowLayer key="snow" />}
        {kind === "autumn" && <AutumnLayer key="autumn" />}
        {kind === "night" && <NightLayer key="night" />}
        {kind === "fog" && <FogLayer key="fog" />}
      </AnimatePresence>
    </div>
  );
}

/** 1. GÜNEŞ & IŞIK HUZMESİ (Sunny / Sunbeam) */
function SunnyLayer() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0"
    >
      {/* Sağ üstten vuran sıcak altın sarısı ışık huzmesi */}
      <div
        className="absolute -top-6 right-0 h-28 w-44 opacity-25"
        style={{
          background: "radial-gradient(ellipse at 85% 10%, rgba(255,200,60,0.5) 0%, rgba(255,140,0,0.18) 45%, transparent 75%)",
          filter: "blur(4px)",
        }}
      />

      {/* Süzülen 4 minik parıltı zerreciği */}
      {[
        { x: "20%", delay: 0, d: 3.2 },
        { x: "50%", delay: 1.1, d: 2.8 },
        { x: "75%", delay: 0.6, d: 3.5 },
        { x: "88%", delay: 1.8, d: 3.0 },
      ].map((p, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-amber-200"
          style={{ left: p.x, top: "25%", boxShadow: "0 0 6px #ffcc00" }}
          animate={{
            y: [-4, 6, -4],
            opacity: [0.2, 0.75, 0.2],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: p.d,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  );
}

/** 2. YAĞMUR & FIRTINA (Rain & Storm) */
function RainLayer({ heavy }: { heavy?: boolean }) {
  const [flash, setFlash] = useState(false);

  // Fırtınada rastgele şimşek çakması
  useEffect(() => {
    if (!heavy) return;
    let t: number;
    const scheduleFlash = () => {
      const wait = 3000 + Math.random() * 5000;
      t = window.setTimeout(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 90);
        // Bazen çift çakar
        if (Math.random() > 0.5) {
          setTimeout(() => {
            setFlash(true);
            setTimeout(() => setFlash(false), 70);
          }, 140);
        }
        scheduleFlash();
      }, wait);
    };
    scheduleFlash();
    return () => clearTimeout(t);
  }, [heavy]);

  const drops = useMemo(() => {
    const count = heavy ? 14 : 9;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${(i / count) * 94 + (Math.sin(i) * 3 + 3)}%`,
      delay: (i * 0.17) % 0.85,
      duration: heavy ? 0.45 + (i % 3) * 0.05 : 0.65 + (i % 3) * 0.08,
      height: heavy ? 9 + (i % 4) * 2 : 6 + (i % 3) * 2,
    }));
  }, [heavy]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0"
    >
      {/* Şimşek parlaması */}
      {flash && (
        <div
          className="absolute inset-0 bg-indigo-200/25 backdrop-brightness-125 transition-opacity"
          style={{ mixBlendMode: "screen" }}
        />
      )}

      {/* Düşen yağmur çizgileri */}
      {drops.map((d) => (
        <motion.div
          key={d.id}
          className="absolute w-[1px] rounded-full bg-gradient-to-b from-transparent via-cyan-200/50 to-cyan-300/80"
          style={{
            left: d.left,
            height: d.height,
            transform: "rotate(15deg)",
          }}
          animate={{
            top: ["-20%", "110%"],
            opacity: [0, 0.75, 0],
          }}
          transition={{
            duration: d.duration,
            delay: d.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* Alttaki su sıçramaları (ripple) */}
      <div className="absolute bottom-1 left-1/4 h-[2px] w-4 rounded-full bg-cyan-400/20 blur-[0.5px]" />
      <div className="absolute bottom-1.5 right-1/3 h-[2px] w-5 rounded-full bg-cyan-400/25 blur-[0.5px]" />
    </motion.div>
  );
}

/** 3. KAR (Snow) */
function SnowLayer() {
  const flakes = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      id: i,
      left: `${(i / 10) * 90 + 5}%`,
      size: 2 + (i % 3),
      delay: (i * 0.35) % 1.8,
      duration: 2.2 + (i % 4) * 0.4,
      sway: (i % 2 === 0 ? 1 : -1) * (4 + (i % 3) * 2),
    }));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="absolute inset-0"
    >
      {/* Köşelerde hafif donuk buz pırıltısı */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          background: "linear-gradient(180deg, rgba(200,230,255,0.2) 0%, transparent 40%)",
        }}
      />

      {flakes.map((f) => (
        <motion.div
          key={f.id}
          className="absolute rounded-full bg-white/80"
          style={{
            left: f.left,
            width: f.size,
            height: f.size,
            boxShadow: "0 0 3px rgba(255,255,255,0.8)",
          }}
          animate={{
            top: ["-10%", "110%"],
            x: [0, f.sway, 0],
            opacity: [0, 0.85, 0],
          }}
          transition={{
            duration: f.duration,
            delay: f.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  );
}

/** 4. SONBAHAR YAPRAKLARI (Autumn Leaves) */
function AutumnLayer() {
  const leaves = useMemo(() => {
    const colors = ["#ff7a29", "#e55039", "#f6b93b", "#d35400"];
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: `${(i / 6) * 85 + 8}%`,
      color: colors[i % colors.length],
      delay: (i * 0.45) % 2.2,
      duration: 3.2 + (i % 3) * 0.6,
      rotateDir: i % 2 === 0 ? 1 : -1,
    }));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="absolute inset-0"
    >
      {leaves.map((l) => (
        <motion.div
          key={l.id}
          className="absolute"
          style={{ left: l.left }}
          animate={{
            top: ["-15%", "115%"],
            x: [0, 14 * l.rotateDir, -8 * l.rotateDir, 10 * l.rotateDir],
            rotate: [0, 120 * l.rotateDir, 280 * l.rotateDir],
            opacity: [0, 0.75, 0.7, 0],
          }}
          transition={{
            duration: l.duration,
            delay: l.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Minik stilize yaprak SVG */}
          <svg width="7" height="9" viewBox="0 0 10 14" fill={l.color} opacity={0.85}>
            <path d="M5 0C5 0 10 4 10 9C10 11.5 7.8 14 5 14C2.2 14 0 11.5 0 9C0 4 5 0 5 0Z" />
          </svg>
        </motion.div>
      ))}
    </motion.div>
  );
}

/** 5. GECE YILDIZLARI & ATEŞ BÖCEĞİ (Night Stars & Firefly) */
function NightLayer() {
  const stars = useMemo(() => {
    return [
      { x: "12%", y: "25%", s: 1.2, d: 2.1, delay: 0 },
      { x: "28%", y: "60%", s: 1.0, d: 2.7, delay: 0.6 },
      { x: "42%", y: "30%", s: 1.4, d: 1.9, delay: 1.1 },
      { x: "65%", y: "70%", s: 1.1, d: 2.4, delay: 0.4 },
      { x: "78%", y: "22%", s: 1.3, d: 2.2, delay: 0.9 },
      { x: "90%", y: "55%", s: 1.0, d: 3.1, delay: 1.5 },
    ];
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0"
    >
      {/* Gece kozmik derinlik ışıltısı */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: "radial-gradient(ellipse at 50% 100%, #1e1b4b 0%, transparent 70%)",
        }}
      />

      {/* Mikro parıldayan yıldızlar */}
      {stars.map((st, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-cyan-100"
          style={{
            left: st.x,
            top: st.y,
            width: st.s,
            height: st.s,
            boxShadow: "0 0 3px rgba(186,230,253,0.9)",
          }}
          animate={{
            opacity: [0.15, 0.85, 0.15],
            scale: [0.8, 1.3, 0.8],
          }}
          transition={{
            duration: st.d,
            delay: st.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Uçuşan sevimli parıldayan ateş böceği (Firefly) */}
      <motion.div
        className="absolute h-1.5 w-1.5 rounded-full"
        style={{
          background: "#a3e635",
          boxShadow: "0 0 8px 1px #a3e635, 0 0 16px 2px #4ade80",
        }}
        animate={{
          x: ["18%", "45%", "72%", "35%", "18%"],
          y: ["30%", "70%", "35%", "20%", "30%"],
          opacity: [0.3, 0.95, 0.2, 0.85, 0.3],
          scale: [0.8, 1.2, 0.7, 1.1, 0.8],
        }}
        transition={{
          duration: 7.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}

/** 6. SİS / PUS (Fog / Mist) */
function FogLayer() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0"
    >
      <motion.div
        className="absolute -bottom-4 -left-12 h-14 w-48 rounded-full opacity-25"
        style={{
          background: "radial-gradient(ellipse at 50% 60%, rgba(200,220,240,0.5) 0%, transparent 70%)",
          filter: "blur(6px)",
        }}
        animate={{
          x: [0, 35, 0],
          opacity: [0.18, 0.28, 0.18],
        }}
        transition={{
          duration: 6.0,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute -bottom-4 right-[-10px] h-12 w-44 rounded-full opacity-20"
        style={{
          background: "radial-gradient(ellipse at 50% 60%, rgba(210,230,250,0.45) 0%, transparent 70%)",
          filter: "blur(6px)",
        }}
        animate={{
          x: [0, -30, 0],
          opacity: [0.14, 0.24, 0.14],
        }}
        transition={{
          duration: 7.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}
