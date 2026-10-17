/**
 * 0.3.0 yama notunun görselleri: yeni ada, modül boyutları, modül ızgarası, Hum ve Not, Argus, kart
 * modüller, Pano ve Bildirimler, kısayol tuşları, kapalı ada kapsülleri, bölünmüş ada, kamp ateşi,
 * Nook Studio ve karnenin geçmiş haftaları. Hepsi kendi kendine döner.
 */
import { AnimatePresence, motion } from "motion/react";
import { Check, Cpu, Headphones, House, Keyboard, LayoutGrid, Lock, MessageCircle, Mic, MicOff, Monitor, Search, Settings, Shirt, Sparkles, Target, Volume2, Zap } from "lucide-react";
import { DEFAULT_LOOK, CHIP_NOOKS } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { Campfire } from "../outings/Campfire";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

const WHITE = "#F4F4F6";
const ARGUS_C = "#00c0fa";
const ARGUS_D = "#015eea";

/** Ekrana yapışık siyah ada (alt köşeleri yuvarlak) */
function Notch({ w, h, r = 14, dx = 0, children, className = "" }: { w: number; h: number; r?: number; dx?: number; children?: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={`absolute left-1/2 top-0 overflow-hidden bg-black ${className}`}
      initial={false}
      animate={{ width: w, height: h, marginLeft: -w / 2 + dx, borderBottomLeftRadius: r, borderBottomRightRadius: r }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      {children}
    </motion.div>
  );
}

/** Ekranın üst kenarı (masaüstü) */
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[10px]" style={{ background: "linear-gradient(160deg, #23304a, #121622 60%, #1f1a2e)" }}>
      {children}
    </div>
  );
}

const chip = (id: string, size: number) => {
  const c = CHIP_NOOKS[id];
  return c ? <NookFigure look={c.look} color={c.color} size={size} /> : <MiniNook color={ACCENT.purple} size={size} />;
};

// ---------------------------------------------------------------- Yeni ada

function Island03Demo() {
  const n = useTick(1300);
  const focus = n % 3; // 0 sol çubuk · 1 durum çubuğu · 2 bento
  const ring = (on: boolean) => (on ? { boxShadow: `0 0 0 1.5px ${ACCENT.purple}, 0 0 14px -2px ${ACCENT.purple}` } : undefined);
  return (
    <Stage>
      <Fit w={300} h={124}>
        <Screen>
          <Notch w={276} h={118} r={18}>
            {/* Sol çubuk */}
            <div className="absolute bottom-0 left-0 top-0 flex w-[18px] flex-col items-center gap-[4px] border-r border-white/[0.06] bg-white/[0.03] pt-[6px] transition-shadow" style={ring(focus === 0)}>
              {[House, LayoutGrid, MessageCircle, Search].map((I, i) => (
                <span key={i} className="flex h-[11px] w-[11px] items-center justify-center rounded-[4px]" style={i === n % 4 ? { background: [ACCENT.purple, ACCENT.green, ACCENT.blue, ACCENT.teal][i], color: "#fff" } : { color: "#666" }}>
                  <I size={6} />
                </span>
              ))}
              <span className="flex-1" />
              <Shirt size={6} className="text-[#666]" />
              <Settings size={6} className="mb-[6px] text-[#666]" />
            </div>
            {/* Üst çubuk */}
            <div className="absolute left-[22px] right-[4px] top-[3px] flex h-[13px] items-center justify-between rounded-[6px] px-[3px] transition-shadow" style={ring(focus === 1)}>
              <span className="flex gap-[2px]">
                {[tt("Hepsi"), tt("İş"), tt("Oyun")].map((p, i) => (
                  <span key={p} className="rounded-full px-[3px] text-[4.5px] font-semibold" style={i === 0 ? { background: tintBg(ACCENT.teal, 25), color: tintText(ACCENT.teal) } : { color: "#666" }}>
                    {p}
                  </span>
                ))}
              </span>
              <span className="flex items-center gap-[3px]">
                <span className="rounded-full px-[3px] text-[4.5px] font-semibold" style={{ background: tintBg(ACCENT.orange, 18), color: tintText(ACCENT.orange) }}>
                  <Mic size={4} className="inline" /> Discord
                </span>
                <span className="rounded-full px-[3px] text-[4.5px] font-semibold" style={{ background: tintBg(ACCENT.yellow, 18), color: tintText(ACCENT.yellow) }}>
                  🔔 07:30
                </span>
                <span className="rounded-full bg-white/[0.08] px-[4px] text-[6px] font-extrabold text-white">23:30</span>
              </span>
            </div>
            {/* Nook kartı */}
            <div className="absolute bottom-[4px] left-[22px] top-[19px] w-[58px] rounded-[8px] bg-[#1a1a1d]">
              {/* Ada açılınca kısa bir selam balonu */}
              <AnimatePresence>
                {n % 3 === 0 && (
                  <motion.span
                    key={n}
                    className="absolute left-1/2 top-[6px] -translate-x-1/2 whitespace-nowrap rounded-[4px] bg-white px-[4px] py-[1px] text-[5px] font-bold text-black"
                    initial={{ opacity: 0, y: 3, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {[tt("Merhaba!"), tt("Naber?"), tt("Gece kuşu!")][Math.floor(n / 3) % 3]}
                  </motion.span>
                )}
              </AnimatePresence>
              <div className="absolute left-1/2 top-[22px] -translate-x-1/2">
                <NookFigure look={DEFAULT_LOOK} color={WHITE} size={26} expression="happy" />
              </div>
            </div>
            {/* Bento */}
            <div className="absolute bottom-[4px] left-[84px] right-[4px] top-[19px] grid gap-[3px] rounded-[8px] transition-shadow" style={{ gridTemplateRows: "1.1fr 1fr 12px", ...ring(focus === 2) }}>
              <div className="grid grid-cols-2 gap-[3px]">
                {[
                  ["claude", "Claude", "#D97757", "%37"],
                  ["devices", "Lukonnect", ACCENT.blue, "%82"],
                ].map(([id, l, c, v]) => (
                  <div key={id} className="relative rounded-[7px] border p-[3px]" style={{ background: tintBg(c, 14), borderColor: tintBg(c, 35) }}>
                    <span className="flex items-center gap-[2px]">
                      {chip(id, 10)}
                      <span className="text-[5.5px] font-bold" style={{ color: tintText(c) }}>
                        {l}
                      </span>
                    </span>
                    <span className="absolute right-[3px] top-[3px] rounded-[3px] px-[2px] text-[4.5px] font-bold" style={{ background: tintBg(c, 25), color: tintText(c) }}>
                      {v}
                    </span>
                    <span className="absolute inset-x-[3px] bottom-[3px] h-[2px] rounded-full bg-white/10">
                      <motion.span className="block h-full rounded-full" style={{ background: c }} animate={{ width: ["30%", "70%", "30%"] }} transition={{ duration: 4, repeat: Infinity }} />
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-[3px]">
                {["note", "shelf", "notify", "hum"].map((id) => (
                  <div key={id} className="flex items-end justify-start rounded-[6px] border border-white/[0.06] bg-white/[0.04] p-[2px]">
                    {chip(id, 9)}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-[2px] rounded-[5px] bg-white/[0.03] px-[2px]">
                {["media", "argus", "focus"].map((id) => (
                  <span key={id} className="flex h-[8px] items-center rounded-[3px] bg-white/[0.06] px-[2px]">
                    {chip(id, 6)}
                  </span>
                ))}
                <span className="ml-auto rounded-[3px] px-[3px] text-[4.5px] font-semibold" style={{ background: tintBg(ACCENT.purple, 20), color: tintText(ACCENT.purple) }}>
                  {tt("Tüm modüller →")}
                </span>
              </div>
            </div>
          </Notch>
        </Screen>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Modül başına boyut

/** Gerçek ada ölçüleri (bkz. lib/layout MODULE_SIZE); demoda 0,36 kat */
const SIZES = [
  { label: tt("Ana sayfa"), W: 724, H: 304, c: ACCENT.purple },
  { label: tt("Pomodoro"), W: 660, H: 300, c: ACCENT.red },
  { label: "Argus", W: 760, H: 336, c: ARGUS_C },
  { label: tt("Medya"), W: 680, H: 292, c: ACCENT.pink },
].map((x) => ({ ...x, w: Math.round(x.W * 0.36), h: Math.round(x.H * 0.36) }));

function SizesDemo() {
  const n = useTick(1500);
  const s = SIZES[n % SIZES.length];
  return (
    <Stage>
      <Fit w={300} h={126}>
        <Screen>
          <Notch w={s.w} h={s.h} r={16}>
            <div className="absolute bottom-0 left-0 top-0 w-[14px] bg-white/[0.04]" />
            <div className="absolute bottom-[4px] left-[18px] top-[14px] w-[40px] rounded-[7px] bg-[#1a1a1d]">
              <div className="absolute left-1/2 top-[6px] -translate-x-1/2">
                <NookFigure look={DEFAULT_LOOK} color={WHITE} size={18} expression="idle" />
              </div>
            </div>
            <motion.div className="absolute bottom-[4px] left-[62px] right-[4px] top-[14px] rounded-[7px] border" animate={{ background: tintBg(s.c, 14), borderColor: tintBg(s.c, 40) }}>
              <span className="absolute left-[5px] top-[4px] text-[6px] font-bold" style={{ color: tintText(s.c) }}>
                {s.label}
              </span>
            </motion.div>
          </Notch>
          <AnimatePresence mode="wait">
            <motion.span
              key={n % SIZES.length}
              className="absolute bottom-[6px] left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-[7px] py-[2px] text-[7px] font-semibold tabular-nums text-white/80"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {s.label} · {s.W}×{s.H}
            </motion.span>
          </AnimatePresence>
        </Screen>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Tüm modüller

const GRID_IDS = ["today", "media", "hum", "argus", "claude", "focus", "shelf", "clip", "note", "alarm", "calendar", "apps", "notify", "control", "devices", "stats", "play", "report"];
const GRID_COLORS = [ACCENT.yellow, ACCENT.pink, ACCENT.purple, ARGUS_C, "#D97757", ACCENT.red, ACCENT.teal, ACCENT.purple, ACCENT.orange, ACCENT.yellow, ACCENT.blue, ACCENT.blue, ACCENT.purple, ACCENT.green, ACCENT.blue, ACCENT.red, ACCENT.pink, ACCENT.teal];

function GridDemo() {
  const n = useTick(500);
  const hot = n % GRID_IDS.length;
  return (
    <Stage>
      <Fit w={280} h={120}>
        <div className="grid h-full grid-cols-6 gap-[5px]">
          {GRID_IDS.map((id, i) => (
            <motion.div
              key={id}
              className="flex flex-col items-center justify-center rounded-[9px] border"
              style={{ background: `linear-gradient(160deg, ${tintBg(GRID_COLORS[i], 18)}, ${tintBg(GRID_COLORS[i], 4)})`, borderColor: tintBg(GRID_COLORS[i], i === hot ? 70 : 28) }}
              animate={{ y: i === hot ? -3 : 0, scale: i === hot ? 1.06 : 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
            >
              {chip(id, 16)}
            </motion.div>
          ))}
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Hum ve Not

function HumNoteDemo() {
  const n = useTick(700);
  const p = n % 10;
  const found = p >= 4;
  const text = tt("Market: süt, ekmek");
  const typed = text.slice(0, Math.min(text.length, Math.max(0, (p - 1) * 4)));
  return (
    <Stage>
      <Fit w={300} h={118}>
        {/* Hum */}
        <div className="absolute left-0 top-0 flex h-full w-[136px] flex-col gap-[5px] rounded-[12px] bg-[#1a1a1d] p-[6px]">
          <div className="flex gap-[6px]">
            <motion.span
              className="h-[44px] w-[44px] shrink-0 rounded-[10px]"
              style={{ background: "conic-gradient(#ff5c8a, #9b7bff, #2fd4c0, #ff5c8a)" }}
              animate={{ rotate: found ? 0 : 360, scale: found ? 1 : 0.92 }}
              transition={found ? { duration: 0.4 } : { duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <div className="min-w-0 leading-tight">
              <p className="text-[7px] font-bold text-white">{found ? "Blinding Lights" : tt("Dinliyor…")}</p>
              <p className="text-[6px] text-white/50">{found ? "The Weeknd" : "Hum"}</p>
              {found && (
                <span className="mt-[3px] flex gap-[2px]">
                  <span className="rounded-full px-[3px] text-[5px] font-semibold" style={{ background: tintBg(ACCENT.green, 20), color: tintText(ACCENT.green) }}>
                    Spotify
                  </span>
                  <span className="rounded-full px-[3px] text-[5px] font-semibold" style={{ background: tintBg(ACCENT.red, 20), color: tintText(ACCENT.red) }}>
                    YouTube
                  </span>
                </span>
              )}
            </div>
          </div>
          <motion.div className="mt-auto flex h-[22px] items-center gap-[4px] rounded-[7px] px-[5px]" style={{ background: "linear-gradient(100deg, #ff5c8a, #9b7bff 55%, #2fd4c0)" }} animate={{ scale: p === 1 ? 0.94 : 1 }}>
            <Mic size={8} className="text-white" />
            <span className="text-[7px] font-bold text-white">{tt("Şimdi dinlet")}</span>
          </motion.div>
        </div>
        {/* Not: çizgili kâğıt */}
        <div
          className="absolute right-0 top-0 h-full w-[156px] overflow-hidden rounded-[12px] border border-white/[0.06]"
          style={{
            background: `linear-gradient(90deg, transparent 12px, ${tintBg(ACCENT.yellow, 40)} 12px, ${tintBg(ACCENT.yellow, 40)} 13px, transparent 13px), repeating-linear-gradient(180deg, transparent 0, transparent 13px, rgb(255 255 255 / 0.06) 13px, rgb(255 255 255 / 0.06) 14px), #19191c`,
          }}
        >
          <div className="pl-[18px] pt-[4px] text-[7px] leading-[14px] text-white">
            <p className="font-bold" style={{ color: tintText(ACCENT.yellow) }}>
              # {tt("Hafta")}
            </p>
            <p className="flex items-center gap-[3px]">
              <span className="flex h-[6px] w-[6px] items-center justify-center rounded-[2px] border" style={p >= 7 ? { background: tintBg(ACCENT.yellow, 50), borderColor: ACCENT.yellow } : { borderColor: "rgb(255 255 255 / 0.3)" }}>
                {p >= 7 && <Check size={4} strokeWidth={4} />}
              </span>
              <span className={p >= 7 ? "text-white/40 line-through" : ""}>
                {typed}
                {p < 7 && <span className="animate-pulse">|</span>}
              </span>
            </p>
            <p>• {tt("Pazartesi sunum")}</p>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Argus kendi renginde

function ArgusDemo() {
  const n = useTick(1100);
  const seen = 3 + (n % 4);
  const shows = [
    { t: "Lanterns", g: tt("Bilim kurgu"), s: seen, a: 8 },
    { t: "Silo", g: tt("Distopya"), s: 7, a: 10 },
    { t: tt("Tuzlu Kahve"), g: tt("Dram"), s: 2, a: 5 },
  ];
  return (
    <Stage>
      <Fit w={290} h={120}>
        <div className="flex h-full gap-[6px]">
          {shows.map((s, i) => (
            <div key={s.t} className="flex flex-1 flex-col overflow-hidden rounded-[11px] border" style={{ borderColor: tintBg(ARGUS_C, 30), background: tintBg(ARGUS_D, 10) }}>
              <div className="relative h-[44px]" style={{ background: `linear-gradient(140deg, ${tintBg(ARGUS_C, 40)}, ${tintBg(ARGUS_D, 60)})` }}>
                <span className="absolute left-[4px] top-[4px] rounded-[3px] bg-black/50 px-[3px] text-[5px] font-semibold" style={{ color: tintText(ARGUS_C) }}>
                  {s.g}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-[5px]">
                <p className="truncate text-[7.5px] font-bold text-white">{s.t}</p>
                <div className="mt-auto flex justify-between text-[5.5px] tabular-nums">
                  <span className="text-white/40">S1B{s.s + 1}</span>
                  <span style={{ color: tintText(ARGUS_C) }}>
                    {s.s}/{s.a}
                  </span>
                </div>
                <span className="mt-[2px] h-[3px] overflow-hidden rounded-full bg-white/10">
                  <motion.span className="block h-full rounded-full" style={{ background: `linear-gradient(90deg, ${ARGUS_C}, ${ARGUS_D})` }} animate={{ width: `${(s.s / s.a) * 100}%` }} />
                </span>
                <motion.span
                  className="mt-[4px] rounded-full py-[2px] text-center text-[5.5px] font-bold text-white"
                  style={{ background: `linear-gradient(100deg, ${ARGUS_C}, ${ARGUS_D})` }}
                  animate={i === 0 ? { scale: [1, 0.9, 1] } : undefined}
                  transition={{ duration: 0.3, delay: 0.7 }}
                  key={i === 0 ? n : undefined}
                >
                  ✓ {tt("+1 bölüm izledim")}
                </motion.span>
              </div>
            </div>
          ))}
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Kart modüller

function CardsDemo() {
  const n = useTick(1000);
  const left = 25 * 60 - (n % 60) * 9;
  const cpu = [23, 41, 34, 58, 29, 47][n % 6];
  return (
    <Stage>
      <Fit w={296} h={112}>
        <div className="flex h-full gap-[6px]">
          {/* Pomodoro */}
          <div className="flex w-[118px] flex-col justify-center rounded-[12px] bg-[#1a1a1d] p-[8px]">
            <p className="text-[6px] font-bold tracking-wider" style={{ color: tintText(ACCENT.red) }}>
              {tt("25 DK ODAK")}
            </p>
            <p className="font-round text-[26px] font-extrabold leading-none tabular-nums text-white">
              {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
            </p>
            <span className="mt-[5px] h-[4px] overflow-hidden rounded-full bg-white/10">
              <motion.span className="block h-full rounded-full" style={{ background: ACCENT.red }} animate={{ width: `${(1 - left / 1500) * 100}%` }} />
            </span>
            <span className="mt-[6px] rounded-[5px] py-[3px] text-center text-[6.5px] font-bold text-white" style={{ background: ACCENT.red }}>
              ❚❚ {tt("Duraklat")}
            </span>
          </div>
          {/* Sistem */}
          <div className="flex flex-1 flex-col rounded-[12px] border p-[6px]" style={{ background: tintBg(ACCENT.teal, 8), borderColor: tintBg(ACCENT.teal, 25) }}>
            <span className="flex items-center gap-[3px] text-[6px] font-bold" style={{ color: tintText(ACCENT.teal) }}>
              <Cpu size={7} /> CPU
            </span>
            <p className="mt-auto font-round text-[16px] font-extrabold tabular-nums text-white">%{cpu}</p>
            <span className="h-[3px] overflow-hidden rounded-full bg-white/10">
              <motion.span className="block h-full rounded-full" style={{ background: ACCENT.teal }} animate={{ width: `${cpu}%` }} />
            </span>
          </div>
          {/* Lukonnect */}
          <div className="flex flex-1 flex-col rounded-[12px] border p-[6px]" style={{ background: tintBg(ACCENT.green, 8), borderColor: tintBg(ACCENT.green, 25) }}>
            <span className="flex h-[14px] w-[14px] items-center justify-center rounded-[4px]" style={{ background: tintBg(ACCENT.green, 22), color: tintText(ACCENT.green) }}>
              <Headphones size={8} />
            </span>
            <p className="mt-auto text-[6px] text-white/50">{tt("Kulaklık")}</p>
            <p className="font-round text-[16px] font-extrabold tabular-nums" style={{ color: tintText(ACCENT.green) }}>
              %82
            </p>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Pano ve Bildirimler

function ClipNotifyDemo() {
  const n = useTick(900);
  const shown = (n % 6) + 1;
  const cards = [
    { k: tt("Renk"), c: ACCENT.purple, t: "#8B5CF6", sw: "#8B5CF6" },
    { k: tt("Kod"), c: ACCENT.orange, t: "npm run build", mono: true },
    { k: tt("Bağlantı"), c: ACCENT.blue, t: "github.com/…", mono: true },
    { k: tt("Metin"), c: ACCENT.purple, t: tt("Perşembe 14:00") },
  ];
  const notifs = [
    { a: "Discord", c: "#5865f2", t: tt("Akşam maça?") },
    { a: "WhatsApp", c: "#25d366", t: tt("Ekmek al") },
  ];
  return (
    <Stage>
      <Fit w={296} h={112}>
        <div className="absolute left-0 top-0 grid h-full w-[160px] grid-cols-2 gap-[4px]">
          {cards.map((x, i) => (
            <motion.div key={x.k} className="rounded-[9px] border border-white/[0.07] bg-white/[0.04] p-[5px]" initial={false} animate={{ opacity: i < shown ? 1 : 0.15, scale: i < shown ? 1 : 0.9 }}>
              <span className="rounded-[3px] px-[3px] text-[5px] font-bold" style={{ background: tintBg(x.c, 22), color: tintText(x.c) }}>
                {x.k}
              </span>
              <p className={`mt-[4px] flex items-center gap-[3px] truncate text-[6.5px] text-white ${x.mono ? "font-mono" : ""}`}>
                {x.sw && <span className="h-[7px] w-[7px] rounded-[2px]" style={{ background: x.sw }} />}
                {x.t}
              </p>
            </motion.div>
          ))}
        </div>
        <div className="absolute right-0 top-0 flex h-full w-[128px] flex-col gap-[4px]">
          {notifs.map((x, i) => (
            <motion.div
              key={x.a}
              className="flex items-center gap-[4px] rounded-[9px] border p-[5px]"
              style={{ background: tintBg(x.c, 10), borderColor: tintBg(x.c, 26) }}
              initial={false}
              animate={{ opacity: shown > 2 + i * 2 ? 1 : 0, x: shown > 2 + i * 2 ? 0 : 20 }}
            >
              <span className="flex h-[14px] w-[14px] items-center justify-center rounded-[4px] text-[7px] font-extrabold" style={{ background: tintBg(x.c, 30), color: tintText(x.c) }}>
                {x.a[0]}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-[6px] font-bold text-white">
                  Ayşe <span style={{ color: tintText(x.c) }}>{x.a}</span>
                </span>
                <span className="block truncate text-[5.5px] text-white/60">{x.t}</span>
              </span>
            </motion.div>
          ))}
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Kısayol tuşları

const KEYS = [
  { l: tt("Mikrofon"), i: Mic, c: ACCENT.orange },
  { l: tt("Ses"), i: Volume2, c: ACCENT.red },
  { l: tt("Masaüstü"), i: Monitor, c: ACCENT.blue },
  { l: tt("Kilitle"), i: Lock, c: ACCENT.teal },
  { l: tt("Oyun modu"), i: Zap, c: ACCENT.purple },
];

function DeckDemo() {
  const n = useTick(800);
  const p = n % 12;
  const pressed = p < 2 ? 0 : p >= 6 ? 4 : -1;
  const micOff = p >= 1 && p < 11;
  const steps = [tt("Discord'u aç"), tt("Mikrofonu aç"), tt("Masaüstünü temizle")];
  const done = p >= 6 ? Math.min(3, p - 6) : 0;
  return (
    <Stage>
      <Fit w={300} h={112}>
        <div className="absolute left-0 top-[14px] grid w-[186px] grid-cols-3 gap-[7px]">
          {KEYS.map((k, i) => {
            const Icon = i === 0 && micOff ? MicOff : k.i;
            const c = i === 0 && micOff ? ACCENT.red : k.c;
            return (
              <motion.div
                key={k.l}
                className="relative flex h-[38px] flex-col items-center justify-center gap-[2px] rounded-[9px]"
                style={{ background: `linear-gradient(150deg, ${tintBg(c, 16)}, ${tintBg(c, 4)})`, border: `1px solid ${tintBg(c, 30)}` }}
                animate={{ scale: pressed === i ? 0.92 : 1 }}
              >
                {i === 0 && <span className="absolute right-[4px] top-[4px] h-[3px] w-[3px] rounded-full" style={{ background: micOff ? ACCENT.red : "rgb(255 255 255 / 0.15)" }} />}
                <span className="flex h-[14px] w-[14px] items-center justify-center rounded-[5px]" style={{ color: tintText(c), background: tintBg(c, 22) }}>
                  <Icon size={9} />
                </span>
                <span className="text-[5.5px] font-semibold" style={{ color: tintText(c) }}>{i === 0 && micOff ? tt("Kapalı") : k.l}</span>
                {i === 4 && <span className="absolute -right-[2px] -top-[3px] rounded-full bg-black px-[2px] text-[5px] font-bold text-white/70">3</span>}
              </motion.div>
            );
          })}
        </div>
        <div className="absolute right-0 top-[10px] w-[100px] rounded-[10px] border border-white/[0.07] bg-white/[0.03] p-[6px]">
          <p className="mb-[4px] text-[6.5px] font-bold" style={{ color: tintText(ACCENT.purple) }}>
            {tt("Rutin: Oyun modu")}
          </p>
          {steps.map((s, i) => (
            <p key={s} className="flex items-center gap-[3px] py-[2px] text-[6px]" style={{ color: i < done ? "#fff" : "rgb(255 255 255 / 0.4)" }}>
              <span className="flex h-[7px] w-[7px] items-center justify-center rounded-full" style={{ background: i < done ? ACCENT.green : "rgb(255 255 255 / 0.1)" }}>
                {i < done && <Check size={5} strokeWidth={4} />}
              </span>
              {s}
            </p>
          ))}
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Kapalı ada kapsülleri

function CapsulesDemo() {
  const n = useTick(1700);
  const k = n % 4;
  const shapes = [
    { w: 150, h: 26 },
    { w: 132, h: 26 },
    { w: 142, h: 26 },
    { w: 104, h: 22 },
  ];
  const s = shapes[k];
  return (
    <Stage>
      <Fit w={260} h={70}>
        <Screen>
          <Notch w={s.w} h={s.h} r={12}>
            <AnimatePresence mode="wait">
              <motion.div key={k} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }} exit={{ opacity: 0 }}>
                {k === 0 && (
                  <>
                    <motion.span className="absolute left-[4px] top-[4px] h-[18px] w-[18px] rounded-full" style={{ background: "conic-gradient(#ff5c8a, #8f6bff, #ff5c8a)" }} animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
                    <span className="absolute left-[25px] top-[5px]">
                      <NookFigure look={DEFAULT_LOOK} color={WHITE} size={15} expression="happy" />
                    </span>
                    <span className="absolute left-[44px] top-[5px] text-[6px] font-bold leading-tight text-white">
                      Blinding Lights
                      <span className="block font-normal" style={{ color: tintText(ACCENT.pink) }}>
                        The Weeknd
                      </span>
                    </span>
                    <span className="absolute right-[6px] top-[9px] flex items-center gap-[1.5px]">
                      {[ACCENT.pink, ACCENT.purple, ACCENT.blue, ACCENT.teal].map((c, i) => (
                        <motion.span key={c} className="w-[2px] rounded-full" style={{ background: c }} animate={{ height: [3, 8, 4, 7, 3] }} transition={{ duration: 0.8 + i * 0.1, repeat: Infinity }} />
                      ))}
                    </span>
                  </>
                )}
                {k === 1 && (
                  <>
                    <span className="absolute left-[6px] top-[5px]">
                      <NookFigure look={DEFAULT_LOOK} color={WHITE} size={15} expression="focused" />
                    </span>
                    <span className="absolute left-[28px] top-[4px] leading-none">
                      <span className="block text-[4.5px] font-bold tracking-wider" style={{ color: tintText(ACCENT.red) }}>
                        {tt("DERİN ODAK")}
                      </span>
                      <span className="font-round text-[10px] font-extrabold tabular-nums text-white">24:12</span>
                    </span>
                    <span className="absolute right-[5px] top-[8px] rounded-full px-[3px] text-[5px] font-bold" style={{ background: tintBg(ACCENT.red, 22), color: tintText(ACCENT.red) }}>
                      %4
                    </span>
                  </>
                )}
                {k === 2 && (
                  <>
                    <span className="absolute left-[6px] top-[5px]">
                      <NookFigure look={DEFAULT_LOOK} color={WHITE} size={15} expression="idle" />
                    </span>
                    <span className="absolute left-[28px] top-[5px] text-[6px] font-bold leading-tight" style={{ color: tintText("#D97757") }}>
                      {tt("Claude çalışıyor")}
                      <span className="block font-normal text-white/60">{tt("Düzenliyor · Island.tsx")}</span>
                    </span>
                    <motion.span className="absolute right-[6px] top-[8px] h-[9px] w-[9px] rounded-full border-[1.5px]" style={{ borderColor: tintBg("#D97757", 25), borderTopColor: "#D97757" }} animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />
                  </>
                )}
                {k === 3 && (
                  <>
                    <span className="absolute left-[4px] top-[3px]">
                      <NookFigure look={DEFAULT_LOOK} color={WHITE} size={15} expression="idle" />
                    </span>
                    <span className="absolute right-[6px] top-[5px] flex items-baseline gap-[4px] tabular-nums">
                      <span className="text-[5.5px] font-semibold text-white/60">☾ 12°</span>
                      <span className="text-[8px] font-extrabold text-white">23:30</span>
                    </span>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </Notch>
          <span className="absolute bottom-[5px] left-1/2 -translate-x-1/2 text-[6.5px] font-semibold text-white/60">{[tt("Müzik"), tt("Odak"), "Claude Code", tt("Saat ve hava")][k]}</span>
        </Screen>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Bölünmüş ada

function SplitDemo() {
  const n = useTick(1400);
  const split = n % 3 !== 0;
  return (
    <Stage>
      <Fit w={260} h={70}>
        <Screen>
          <Notch w={150} h={26} r={12} dx={split ? -17 : 0}>
            <motion.span className="absolute left-[4px] top-[4px] h-[18px] w-[18px] rounded-full" style={{ background: "conic-gradient(#ff5c8a, #8f6bff, #ff5c8a)" }} animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
            <span className="absolute left-[25px] top-[5px]">
              <NookFigure look={DEFAULT_LOOK} color={WHITE} size={15} expression="happy" />
            </span>
            <span className="absolute left-[44px] top-[8px] text-[6px] font-bold text-white">Blinding Lights</span>
          </Notch>
          <AnimatePresence>
            {split && (
              <motion.div
                className="absolute top-0 flex h-[26px] w-[26px] items-center justify-center rounded-b-[13px] bg-black"
                style={{ left: "calc(50% + 62px)" }}
                initial={{ opacity: 0, scale: 0.3, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.3, x: -20 }}
                transition={{ type: "spring", stiffness: 420, damping: 20 }}
              >
                <svg width="20" height="20" className="-rotate-90">
                  <circle cx="10" cy="10" r="7" fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="2" />
                  <motion.circle cx="10" cy="10" r="7" fill="none" stroke={ACCENT.red} strokeWidth="2" strokeLinecap="round" strokeDasharray={44} animate={{ strokeDashoffset: [40, 18] }} transition={{ duration: 2.6 }} />
                </svg>
                <Target size={7} className="absolute" style={{ color: ACCENT.red }} />
              </motion.div>
            )}
          </AnimatePresence>
          <span className="absolute bottom-[5px] left-1/2 -translate-x-1/2 text-[6.5px] font-semibold text-white/60">{split ? tt("Müzik + Pomodoro") : tt("Yalnızca müzik")}</span>
        </Screen>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Kamp ateşi ve balık

function CampDemo() {
  return (
    <Stage>
      <Fit w={300} h={112}>
        <Screen>
          {/* Gece: kamp ateşi */}
          <div className="absolute left-[6px] top-0 h-[40px] w-[236px] overflow-hidden rounded-b-[18px] bg-black" style={{ transform: "scale(0.55)", transformOrigin: "top left" }}>
            <Campfire width={236} height={40} />
          </div>
          <span className="absolute left-[12px] top-[30px] text-[6px] font-semibold text-white/50">{tt("Gece boştayken")}</span>
          {/* Gündüz: balık, Nook adanın ucunda */}
          <div className="absolute right-[34px] top-0 h-[22px] w-[104px] rounded-b-[11px] bg-black">
            <span className="absolute left-[7px] top-[5px] text-[6px] font-bold leading-tight text-white">
              {tt("Olta masaüstünde")}
              <span className="block text-[5px]" style={{ color: tintText(ACCENT.yellow) }}>
                ★ 4
              </span>
            </span>
            <span className="absolute right-[4px] top-[3px]">
              <NookFigure look={DEFAULT_LOOK} color={WHITE} size={16} expression="drowsy" />
            </span>
          </div>
          <svg className="absolute right-[-6px] top-0 overflow-visible" width="60" height="112">
            <line x1="12" y1="14" x2="34" y2="22" stroke="#a8743f" strokeWidth="1.2" />
            <motion.path d="M34 22 Q38 50 36 78" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.7" animate={{ d: ["M34 22 Q38 50 36 78", "M34 22 Q34 50 36 82", "M34 22 Q38 50 36 78"] }} transition={{ duration: 2.4, repeat: Infinity }} />
            <motion.circle cx="36" cy="80" r="2.5" fill="#ff453a" animate={{ cy: [78, 82, 78] }} transition={{ duration: 2.4, repeat: Infinity }} />
          </svg>
          <span className="absolute bottom-[6px] right-[30px] text-[6px] font-semibold text-white/50">{tt("Gündüz")}</span>
        </Screen>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Nook Studio

const STUDIO_NAV = [
  { i: House, c: ACCENT.purple, l: tt("Ana sayfa") },
  { i: Shirt, c: ACCENT.pink, l: tt("Görünüm") },
  { i: Keyboard, c: ACCENT.blue, l: tt("Kısayollar") },
  { i: Sparkles, c: ACCENT.yellow, l: tt("Yıl özeti") },
  { i: Settings, c: "#8a8a93", l: tt("Ayarlar") },
];

function StudioDemo() {
  const n = useTick(1500);
  const page = n % STUDIO_NAV.length;
  return (
    <Stage>
      <Fit w={300} h={124}>
        <div className="absolute inset-0 overflow-hidden rounded-[10px] border border-white/10 bg-[#0e0e10] shadow-2xl">
          <div className="flex h-[14px] items-center gap-[4px] border-b border-white/[0.06] px-[6px]">
            <NookFigure look={DEFAULT_LOOK} color={WHITE} size={8} />
            <span className="text-[6px] font-extrabold text-white">
              Nook <span style={{ color: tintText(ACCENT.purple) }}>Studio</span>
            </span>
            <span className="ml-auto flex gap-[6px] text-[6px] text-white/40">— ▢ ✕</span>
          </div>
          <div className="absolute bottom-0 left-0 top-[14px] w-[66px] space-y-[2px] border-r border-white/[0.05] p-[4px]">
            {STUDIO_NAV.map((x, i) => (
              <div key={x.l} className="relative flex items-center gap-[3px] rounded-[5px] px-[3px] py-[3px]">
                {i === page && <motion.span layoutId="sdemo" className="absolute inset-0 rounded-[5px]" style={{ background: tintBg(x.c, 18) }} />}
                <span className="relative flex h-[9px] w-[9px] items-center justify-center rounded-[3px]" style={{ background: tintBg(x.c, 25), color: tintText(x.c) }}>
                  <x.i size={5} />
                </span>
                <span className="relative text-[5.5px] font-semibold text-white/80">{x.l}</span>
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 left-[66px] right-0 top-[14px] p-[6px]">
            <AnimatePresence mode="wait">
              <motion.div key={page} className="h-full" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {page === 0 && (
                  <div className="flex h-[54px] items-center gap-[8px] rounded-[8px] bg-white/[0.04] px-[8px]">
                    <NookFigure look={DEFAULT_LOOK} color={WHITE} size={38} expression="happy" />
                    <span className="text-[11px] font-extrabold text-white">{tt("İyi akşamlar")}</span>
                  </div>
                )}
                {page === 1 && (
                  <div className="flex h-full gap-[6px]">
                    <div className="flex w-[70px] items-center justify-center rounded-[8px]" style={{ background: tintBg(ACCENT.pink, 14) }}>
                      <NookFigure look={{ ...DEFAULT_LOOK, head: "beret" }} color="#FF5C8A" size={44} expression="love" />
                    </div>
                    <div className="grid flex-1 grid-cols-4 gap-[3px]">
                      {Array.from({ length: 12 }, (_, i) => (
                        <span key={i} className="rounded-[4px] bg-white/[0.05]" />
                      ))}
                    </div>
                  </div>
                )}
                {page === 2 && (
                  <div className="grid grid-cols-4 gap-[4px]">
                    {KEYS.slice(0, 4).map((k) => (
                      <span key={k.l} className="flex h-[26px] items-center justify-center rounded-[6px]" style={{ background: "linear-gradient(180deg, #2c2c31, #1b1b1e)", boxShadow: "0 2px 0 #0b0b0c", color: tintText(k.c) }}>
                        <k.i size={10} />
                      </span>
                    ))}
                  </div>
                )}
                {page === 3 && (
                  <div className="grid h-full grid-cols-3 gap-[4px]">
                    {[
                      ["867", ACCENT.yellow],
                      ["240", ACCENT.pink],
                      ["214", ACCENT.red],
                    ].map(([v, c]) => (
                      <div key={v} className="flex items-end rounded-[7px] p-[4px]" style={{ background: tintBg(c, 16) }}>
                        <span className="font-display text-[13px] font-bold" style={{ color: tintText(c) }}>
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {page === 4 && (
                  <div className="space-y-[3px]">
                    {[tt("Dil"), tt("Windows açılınca başlat"), tt("Arayüz boyutu")].map((r, i) => (
                      <div key={r} className="flex items-center justify-between rounded-[6px] bg-white/[0.04] px-[5px] py-[4px] text-[6px] text-white/80">
                        {r}
                        <span className="h-[5px] w-[10px] rounded-full" style={{ background: i === 1 ? ACCENT.teal : "rgb(255 255 255 / 0.15)" }} />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Karnenin geçmiş haftaları

const WEEK_PTS = [48, 55, 62, 58, 71, 77, 84, 91];
const letterOf = (p: number) => (p >= 80 ? "A" : p >= 65 ? "B" : p >= 50 ? "C" : p >= 35 ? "D" : "E");
const LETTER: Record<string, string> = { A: ACCENT.green, B: ACCENT.teal, C: ACCENT.yellow, D: ACCENT.orange, E: ACCENT.red };

function ReportWeeksDemo() {
  const n = useTick(900);
  const sel = 7 - (n % 8);
  const p = WEEK_PTS[sel];
  const L = letterOf(p);
  return (
    <Stage>
      <Fit w={290} h={110}>
        <div className="absolute left-0 top-[6px] flex h-[96px] w-[86px] flex-col items-center justify-center rounded-[12px]" style={{ background: tintBg(LETTER[L], 14) }}>
          <motion.span key={L} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="font-display text-[36px] font-bold leading-none" style={{ color: tintText(LETTER[L]) }}>
            {L}
          </motion.span>
          <span className="text-[7px] tabular-nums text-white/60">{tt("{0} / 100 puan", p)}</span>
        </div>
        <div className="absolute bottom-[8px] right-0 flex h-[92px] w-[190px] items-end gap-[5px]">
          {WEEK_PTS.map((v, i) => {
            const l = letterOf(v);
            return (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-[2px]">
                <span className="text-[6px] font-bold" style={{ color: tintText(LETTER[l]) }}>
                  {l}
                </span>
                <motion.span className="w-full rounded-t-[4px]" initial={false} animate={{ height: `${v * 0.75}%`, opacity: i === sel ? 1 : 0.45 }} style={{ background: LETTER[l] }} />
              </div>
            );
          })}
        </div>
      </Fit>
    </Stage>
  );
}

export const DEMOS10 = {
  island03: Island03Demo,
  sizes: SizesDemo,
  grid03: GridDemo,
  humnote: HumNoteDemo,
  argusblue: ArgusDemo,
  cards03: CardsDemo,
  clipcards: ClipNotifyDemo,
  deck: DeckDemo,
  capsules: CapsulesDemo,
  splitpill: SplitDemo,
  campfire: CampDemo,
  studio: StudioDemo,
  reportweeks: ReportWeeksDemo,
};
