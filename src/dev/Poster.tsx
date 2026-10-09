/** Yalnızca geliştirme: ?preview=poster&slide=1..6&lang=tr|en — Instagram gönderisi (1080×1350) */
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
    ask1: "Claude izin mi istiyor?",
    ask2: "Adadan cevapla.",
    askSub: "Oyundayken, tarayıcıdayken… terminale dönmeden.",
    askTag: "Claude · Nook",
    askTitle: "Komut çalıştırmak istiyor",
    always: "Her zaman",
    allow: "İzin ver",
    askPills: ["Canlı oturumlar", "İzin ver · Reddet", "Sorulara cevap", "\"Bitti\" haberi"],
    plan1: "Limitin ne kadar doldu?",
    planSub: "Claude planının 5 saatlik ve haftalık limiti adada.",
    five: "5 saat",
    week: "Hafta",
    resetIn: "1 sa 12 dk sonra sıfırlanır",
    resetWeek: "Pazar 09:00'da sıfırlanır",
    planToast: "Claude 5 saatlik limitin %80",
    planToastSub: "%80'de ve dolunca bir kez haber verir",
    newTag: "YENİ · Claude Code",
    pctFirst: true,
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
    ask1: "Claude needs permission?",
    ask2: "Answer from the island.",
    askSub: "In a game, in the browser… no trip back to the terminal.",
    askTag: "Claude · Nook",
    askTitle: "Wants to run a command",
    always: "Always",
    allow: "Allow",
    askPills: ["Live sessions", "Allow · Deny", "Answer questions", "\"Done\" alerts"],
    plan1: "How much is left?",
    planSub: "Your Claude plan's 5-hour and weekly limits, on the island.",
    five: "5 hours",
    week: "Week",
    resetIn: "resets in 1 h 12 min",
    resetWeek: "resets Sunday 09:00",
    planToast: "Claude 5-hour limit at 80%",
    planToastSub: "One heads-up at 80% and when it's full",
    newTag: "NEW · Claude Code",
    pctFirst: false,
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


const CLAUDE = "#D97757";
const WARM = "radial-gradient(90% 60% at 50% 34%, #3b2418 0%, #1c120d 55%, #0d0908 100%)";
const CLAUDE_LOOK: Look = { ...DEFAULT_LOOK, shape: "cube", texture: "matte", eyes: "bead", head: "hardhat" };
const mono = "ui-monospace, 'Cascadia Code', Consolas, monospace";

function Tag({ text, top }: { text: string; top: number }) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center" }}>
      <div style={{ padding: "10px 26px", borderRadius: 999, background: `${CLAUDE}22`, border: `2px solid ${CLAUDE}88`, color: "#F6C9B6", fontSize: 26, fontWeight: 700, letterSpacing: 2 }}>{text}</div>
    </div>
  );
}

/** Ekranın üst kenarı ve ona yapışık ada (içine çocuklar) */
function ScreenTop({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 6, background: "rgba(255,255,255,0.05)" }} />
      <div
        style={{
          position: "absolute",
          left: (W - width) / 2,
          top: 0,
          width,
          height,
          background: "#000",
          borderBottomLeftRadius: height * 0.34,
          borderBottomRightRadius: height * 0.34,
          boxShadow: "0 30px 80px rgba(0,0,0,0.65), 0 0 0 2px rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
        }}
      >
        {children}
      </div>
    </>
  );
}

function Btn({ children, color, strong, round }: { children: ReactNode; color: string; strong?: boolean; round?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        height: 58,
        minWidth: round ? 58 : undefined,
        padding: round ? 0 : "0 20px",
        borderRadius: 999,
        fontSize: 24,
        fontWeight: 700,
        whiteSpace: "nowrap",
        color: `color-mix(in srgb, ${color} 70%, white)`,
        background: `color-mix(in srgb, ${color} ${strong ? 28 : 13}%, transparent)`,
        border: `2px solid color-mix(in srgb, ${color} ${strong ? 65 : 35}%, transparent)`,
        boxShadow: strong ? `0 0 34px -6px ${color}` : undefined,
      }}
    >
      {children}
    </div>
  );
}

const Tick = ({ s = 26 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);
const DoubleTick = () => (
  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" /></svg>
);
const Cross = () => (
  <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
);
const Cursor = ({ style }: { style: CSSProperties }) => (
  <svg width={58} height={58} viewBox="0 0 24 24" style={{ position: "absolute", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.6))", ...style }}>
    <path d="M4 3l16 7-7 2-3 7z" fill="white" stroke="#111" strokeWidth={1.2} strokeLinejoin="round" />
  </svg>
);

/** 5: Claude Code izin istiyor, adada kart; imleç "İzin ver"e basıyor */
function ClaudeAsk({ t }: { t: (typeof TEXT)["tr"] }) {
  const IW = 1044;
  const IH = 160;
  const S = 420;
  return (
    <Frame bg={WARM}>
      <div style={{ position: "absolute", left: W / 2 - 400, top: 160, width: 800, height: 800, borderRadius: "50%", background: `radial-gradient(circle, ${CLAUDE}40, transparent 62%)` }} />

      <ScreenTop width={IW} height={IH}>
        <div style={{ position: "relative", width: 104, height: 104, marginLeft: 22, flexShrink: 0 }}>
          <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={96} res={300} expression="surprised" style={{ position: "absolute", left: 4, top: 4 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: 700, color: "#F2A98C" }}>
            <span style={{ width: 12, height: 12, borderRadius: 6, background: CLAUDE, boxShadow: `0 0 12px ${CLAUDE}` }} />
            {t.askTag}
          </div>
          <div style={{ marginTop: 6, fontSize: 30, fontWeight: 700, whiteSpace: "nowrap" }}>{t.askTitle}</div>
          <div style={{ marginTop: 10, display: "inline-block", padding: "5px 14px", borderRadius: 10, background: "rgba(255,255,255,0.08)", fontFamily: mono, fontSize: 22, color: "rgba(235,235,245,0.8)" }}>npm run build</div>
        </div>
        <div style={{ display: "flex", gap: 10, marginRight: 24, flexShrink: 0 }}>
          <Btn color="#FF3B4A" round><Cross /></Btn>
          <Btn color="#3DDC84"><DoubleTick />{t.always}</Btn>
          <Btn color="#3DDC84" strong><Tick />{t.allow}</Btn>
        </div>
      </ScreenTop>
      {/* Tıklama halkası ve imleç */}
      <div style={{ position: "absolute", left: 994, top: 86, width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(61,220,132,0.8)", boxShadow: "0 0 24px rgba(61,220,132,0.6)" }} />
      <Cursor style={{ left: 1008, top: 100 }} />

      {/* Claude çipinin Nook'u: baretli küp */}
      <Nook size={S} color={CLAUDE} look={CLAUDE_LOOK} style={{ left: W / 2 - S / 2, top: 290, transform: "rotate(-3deg)" }} />

      <Tag text={t.newTag} top={790} />
      <Title lines={[t.ask1, t.ask2]} top={862} size={74} sub={t.askSub} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 1140, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
        {t.askPills.map((c) => (
          <div key={c} style={{ padding: "10px 22px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: `2px solid ${CLAUDE}55`, fontSize: 25, fontWeight: 600, color: "rgba(240,235,232,0.9)" }}>{c}</div>
        ))}
      </div>
    </Frame>
  );
}

/** Halka gösterge */
function Ring({ pct, color, label, reset, first, size = 330 }: { pct: number; color: string; label: string; reset: string; first: boolean; size?: number }) {
  const r = size / 2 - 22;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={size} style={{ filter: `drop-shadow(0 0 24px ${color}66)` }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={26} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={26} fill="none" strokeLinecap="round" strokeDasharray={`${(c * pct) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div style={{ position: "absolute", top: 0, height: size, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 30, fontWeight: 600, color: "rgba(230,230,240,0.7)" }}>{label}</div>
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2, color: `color-mix(in srgb, ${color} 75%, white)`, lineHeight: 1 }}>{first ? `%${pct}` : `${pct}%`}</div>
      </div>
      <div style={{ marginTop: 18, fontSize: 25, fontWeight: 500, color: "rgba(220,220,235,0.6)", whiteSpace: "nowrap" }}>{reset}</div>
    </div>
  );
}

/** 6: Plan limiti: iki halka, adada %80 uyarısı, yanda Nook */
function ClaudePlan({ t }: { t: (typeof TEXT)["tr"] }) {
  const IW = 860;
  const IH = 128;
  return (
    <Frame bg={WARM}>
      <ScreenTop width={IW} height={IH}>
        <div style={{ position: "relative", width: 100, height: 100, marginLeft: 22, flexShrink: 0 }}>
          <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={88} res={260} expression="surprised" style={{ position: "absolute", left: 6, top: 6 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#F2A98C", whiteSpace: "nowrap" }}>{t.planToast}</div>
          <div style={{ marginTop: 6, fontSize: 23, color: "rgba(230,230,240,0.65)", whiteSpace: "nowrap" }}>{t.planToastSub}</div>
        </div>
        <div style={{ marginRight: 30, width: 66, height: 66, borderRadius: 33, background: `${CLAUDE}33`, border: `2px solid ${CLAUDE}99`, display: "flex", alignItems: "center", justifyContent: "center", color: "#F6C9B6", fontSize: 30, fontWeight: 800 }}>!</div>
      </ScreenTop>

      <Tag text={t.newTag} top={210} />
      <Title lines={[t.plan1]} top={280} size={78} sub={t.planSub} />

      <div style={{ position: "absolute", left: W / 2 - 400, top: 560, width: 800, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${CLAUDE}30, transparent 62%)` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 560, display: "flex", justifyContent: "center", gap: 90 }}>
        <Ring pct={80} color="#FF9F43" label={t.five} reset={t.resetIn} first={t.pctFirst} />
        <Ring pct={46} color="#3DDC84" label={t.week} reset={t.resetWeek} first={t.pctFirst} />
      </div>
      {/* Halkanın kenarına tünemiş Claude Nook'u */}
      <Nook size={190} color={CLAUDE} look={CLAUDE_LOOK} style={{ left: 445, top: 990, transform: "rotate(6deg)" }} />
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
  return slide === 2 ? <All t={t} lang={q.get("lang") === "en" ? "en" : "tr"} /> : slide === 3 ? <Wardrobe t={t} /> : slide === 4 ? <Cta t={t} /> : slide === 5 ? <ClaudeAsk t={t} /> : slide === 6 ? <ClaudePlan t={t} /> : <Hero t={t} />;
}
