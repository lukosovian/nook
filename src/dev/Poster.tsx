/** Yalnızca geliştirme: ?preview=poster&slide=1..4&lang=tr|en — Instagram gönderisi (1080×1350) */
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { NookFigure } from "../components/mascot/Figure";
import { Paw } from "../components/outings/Parts";
import { DEFAULT_LOOK, type Look } from "../lib/look";

const W = 1080;
const H = 1350;

const TEXT = {
  tr: {
    hero1: "Ekranının tepesinde",
    hero2: "minik bir blob yaşıyor.",
    heroSub: "Windows için ücretsiz",
    all1: "Hepsi tek yerde.",
    allSub: "Fareyi ekranın üstüne götür, Nook açılsın.",
    chips: ["Müzik", "Dosya rafı", "Pano geçmişi", "Not", "Alarm", "Pomodoro", "Hızlı arama", "Mini oyunlar"],
    look1: "İstediğin gibi giydir.",
    lookSub: "14 gövde · 6 doku · 20 renk · şapkalar, gözlükler",
    cta1: "Ücretsiz indir.",
    ctaSub: "Windows 10 ve 11 · 9 dil",
    ctaLink: "Bağlantı profilde",
  },
  en: {
    hero1: "A tiny blob lives",
    hero2: "at the top of your screen.",
    heroSub: "Free for Windows",
    all1: "Everything in one place.",
    allSub: "Move the mouse to the top. Nook opens up.",
    chips: ["Music", "File shelf", "Clipboard", "Notes", "Alarms", "Pomodoro", "Quick search", "Mini games"],
    look1: "Dress it your way.",
    lookSub: "14 bodies · 6 textures · 20 colors · hats, glasses",
    cta1: "Download free.",
    ctaSub: "Windows 10 & 11 · 9 languages",
    ctaLink: "Link in bio",
  },
};

const BG = "radial-gradient(90% 60% at 50% 30%, #2a2650 0%, #15132b 55%, #0b0a16 100%)";

function Frame({ children, bg = BG }: { children: ReactNode; bg?: string }) {
  return (
    <div style={{ position: "fixed", left: 0, top: 0, width: W, height: H, background: bg, overflow: "hidden", fontFamily: "var(--font-sans)", color: "#F4F4F8" }}>
      {children}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 52, display: "flex", justifyContent: "center", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 600, color: "rgba(230,230,245,0.7)" }}>
        <MiniNook size={44} />
        @nooktheblob
      </div>
    </div>
  );
}

/** Elleriyle birlikte Nook */
function Nook({ size, color = "#F4F4F6", look = DEFAULT_LOOK, paws = true, style }: { size: number; color?: string; look?: Look; paws?: boolean; style?: CSSProperties }) {
  const K = size / 24;
  return (
    <div style={{ position: "absolute", width: size, height: size, ...style }}>
      <NookFigure look={look} color={color} size={size} res={Math.min(1024, Math.round(size * 2))} />
      {paws && <Paw x={size / 2 - 15.5 * K} y={size / 2 + 2.5 * K} k={K * 0.9} color={color} rotate={14} />}
      {paws && <Paw x={size / 2 + 15.5 * K} y={size / 2 + 2.5 * K} k={K * 0.9} color={color} rotate={-14} />}
    </div>
  );
}

function MiniNook({ size }: { size: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={size} res={160} />
    </div>
  );
}

function Title({ lines, top, size = 84, sub }: { lines: string[]; top: number; size?: number; sub?: string }) {
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top, textAlign: "center" }}>
      {lines.map((l) => (
        <div key={l} style={{ fontSize: size, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.08 }}>{l}</div>
      ))}
      {sub && <div style={{ marginTop: 26, fontSize: 36, fontWeight: 500, color: "rgba(220,220,240,0.72)" }}>{sub}</div>}
    </div>
  );
}

/** 1: Çentikten iple sarkan büyük Nook */
function Hero({ t }: { t: (typeof TEXT)["tr"] }) {
  const S = 470;
  const cx = W / 2;
  const top = 360;
  return (
    <Frame>
      {/* Ekranın üstü ve çentik */}
      <div style={{ position: "absolute", left: cx - 190, top: -40, width: 380, height: 120, borderRadius: 48, background: "#000", boxShadow: "0 18px 50px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.08)" }} />
      <div style={{ position: "absolute", left: cx - 1.5, top: 80, width: 3, height: top - 80 + S * 0.12, background: "linear-gradient(#ddd, #bbb)", borderRadius: 2 }} />
      {/* Yumuşak ışık */}
      <div style={{ position: "absolute", left: cx - 380, top: top - 120, width: 760, height: 760, borderRadius: "50%", background: "radial-gradient(circle, rgba(150,140,255,0.28), transparent 65%)" }} />
      <Nook size={S} style={{ left: cx - S / 2, top, transform: "rotate(-4deg)" }} />
      <Title lines={[t.hero1, t.hero2]} top={880} size={76} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1090, display: "flex", justifyContent: "center" }}>
        <div style={{ padding: "16px 36px", borderRadius: 999, background: "#F4F4F8", color: "#14122b", fontSize: 36, fontWeight: 700 }}>{t.heroSub}</div>
      </div>
    </Frame>
  );
}

/** 2: Gerçek ekran görüntüsü + özellik çipleri */
function All({ t, lang }: { t: (typeof TEXT)["tr"]; lang: string }) {
  const colors = ["#FF5C8A", "#2FD4C0", "#9B7BFF", "#FFD21F", "#FF8A1F", "#FF3B4A", "#2B8CFF", "#8FE03A"];
  return (
    <Frame>
      <Title lines={[t.all1]} top={150} size={80} sub={t.allSub} />
      <img
        src={`/promo/home-${lang}.png`}
        style={{ position: "absolute", left: 40, top: 420, width: 1000, borderRadius: 60, boxShadow: "0 40px 90px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.06)" }}
      />
      <div style={{ position: "absolute", left: 70, right: 70, top: 990, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
        {t.chips.map((c, i) => (
          <div key={c} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 24px", borderRadius: 999, background: "rgba(255,255,255,0.07)", border: `2px solid ${colors[i]}66`, fontSize: 29, fontWeight: 600 }}>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: colors[i] }} />
            {c}
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** 3: Farklı gövde, doku ve renklerde Nook'lar */
function Wardrobe({ t }: { t: (typeof TEXT)["tr"] }) {
  const L = (p: Partial<Look>): Look => ({ ...DEFAULT_LOOK, ...p });
  const cast: [Look, string][] = [
    [L({ shape: "cat", texture: "plush" }), "#FF8A1F"],
    [L({ shape: "heart", head: "bow" }), "#FF5C8A"],
    [L({ shape: "cloud", texture: "plush", head: "headphones" }), "#2FD4C0"],
    [L({ shape: "star", texture: "metal" }), "#FFD21F"],
    [L({ shape: "sphere", glasses: "round", head: "beret" }), "#2B8CFF"],
    [L({ shape: "bear", texture: "matte" }), "#B5651D"],
    [L({ shape: "bean", texture: "jelly", head: "sprout" }), "#8FE03A"],
    [L({ shape: "cube", glasses: "shades" }), "#9B7BFF"],
    [L({ shape: "egg", texture: "spots", head: "cap" }), "#FFE3A8"],
  ];
  const S = 224;
  const gap = 84;
  const x0 = (W - (3 * S + 2 * gap)) / 2;
  return (
    <Frame>
      <Title lines={[t.look1]} top={100} size={80} sub={t.lookSub} />
      {cast.map(([look, color], i) => (
        <Nook
          key={i}
          size={S}
          look={look}
          color={color}
          paws={false}
          style={{ left: x0 + (i % 3) * (S + gap), top: 350 + Math.floor(i / 3) * 290 + (i % 3 === 1 ? 24 : 0) }}
        />
      ))}
    </Frame>
  );
}

/** 4: İndirme çağrısı */
function Cta({ t }: { t: (typeof TEXT)["tr"] }) {
  const S = 420;
  return (
    <Frame>
      <div style={{ position: "absolute", left: W / 2 - 360, top: 170, width: 720, height: 720, borderRadius: "50%", background: "radial-gradient(circle, rgba(150,140,255,0.3), transparent 65%)" }} />
      <Nook size={S} style={{ left: W / 2 - S / 2, top: 300 }} />
      <Title lines={[t.cta1]} top={800} size={96} sub={t.ctaSub} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1060, display: "flex", justifyContent: "center" }}>
        <div style={{ padding: "20px 44px", borderRadius: 999, background: "#F4F4F8", color: "#14122b", fontSize: 40, fontWeight: 800 }}>{t.ctaLink} ↑</div>
      </div>
    </Frame>
  );
}

export function Poster() {
  const q = new URLSearchParams(location.search);
  const t = TEXT[q.get("lang") === "en" ? "en" : "tr"];
  const slide = Number(q.get("slide") ?? 1);
  useEffect(() => {
    document.body.style.margin = "0";
  }, []);
  return slide === 2 ? <All t={t} lang={q.get("lang") === "en" ? "en" : "tr"} /> : slide === 3 ? <Wardrobe t={t} /> : slide === 4 ? <Cta t={t} /> : <Hero t={t} />;
}
