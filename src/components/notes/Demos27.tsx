/**
 * 0.3.8 yama notu demoları (dördüncü bölüm): Haberler modülü, ilk gün yalnızca su, hatırlatıcıda gün
 * adları, takvimde tekrarlayan etkinlik, daha net bölüm adları ve kendi durum satırıyla plan göstergesi.
 */
import { AnimatePresence, motion } from "motion/react";
import { Bookmark, BellRing, Droplet, RotateCcw, Undo2, Eye, Gamepad2, Keyboard, LayoutGrid, Newspaper, Repeat, StretchHorizontal } from "lucide-react";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { DEFAULT_LOOK } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { Fit, Stage, useTick } from "./Demos6";
import { UpdateBody, useFakeUpdate } from "../overlays/UpdateAnims";

const Switch = ({ on, color = ACCENT.teal }: { on: boolean; color?: string }) => (
  <motion.span animate={{ background: on ? color : "rgba(255,255,255,.18)" }} className="relative h-[9px] w-[16px] shrink-0 rounded-full">
    <motion.span animate={{ x: on ? 8 : 1 }} className="absolute top-[1px] h-[7px] w-[7px] rounded-full bg-white" />
  </motion.span>
);

// ---------------------------------------------------------------- Haberler

const HEADLINES = [
  { s: "BBC Türkçe", t: tt("Merkez Bankası faiz kararını açıkladı"), m: 4 },
  { s: "TRT Haber", t: tt("İstanbul'da hafta sonu yağmur bekleniyor"), m: 12 },
  { s: "DW Türkçe", t: tt("Avrupa'da enerji fiyatları geriledi"), m: 25 },
  { s: "BBC Türkçe", t: tt("Yeni müze kapılarını ziyaretçilere açtı"), m: 41 },
];

/** Kaynaklar solda, başlıklar sağda; yeni başlık üstten kayarak gelir */
function NewsDemo() {
  const n = useTick(1600);
  const top = n % HEADLINES.length;
  const list = [...HEADLINES.slice(top), ...HEADLINES.slice(0, top)].slice(0, 3);
  return (
    <Stage>
      <Fit w={230} h={104}>
        <div className="absolute inset-[6px] flex gap-[6px] rounded-[10px] border border-white/10 bg-[#111113] p-[6px]">
          <div className="w-[52px] shrink-0 space-y-[3px]">
            {["BBC", "DW", "TRT", "AA"].map((s, i) => (
              <div
                key={s}
                className="flex h-[12px] items-center gap-[3px] rounded-[4px] border px-[3px] text-[6px] font-semibold"
                style={i < 3 ? { background: tintBg(ACCENT.red, 18), borderColor: tintBg(ACCENT.red, 45), color: tintText(ACCENT.red) } : { borderColor: "rgb(255 255 255 / .08)", color: "var(--color-label-3)" }}
              >
                <span className="h-[3px] w-[3px] rounded-full" style={{ background: i < 3 ? ACCENT.red : "rgb(255 255 255 / .2)" }} />
                {s}
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1 space-y-[3px] overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              {list.map((h) => (
                <motion.div
                  key={h.t}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-[4px] rounded-[5px] bg-white/[0.04] p-[3px]"
                >
                  <span className="flex h-[18px] w-[22px] shrink-0 items-center justify-center rounded-[3px]" style={{ background: tintBg(ACCENT.red, 16), color: tintText(ACCENT.red) }}>
                    <Newspaper size={8} />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-[7px] font-semibold text-label">{h.t}</span>
                    <span className="block text-[5.5px] text-label-2">{tt("{0} · {1} dk önce", h.s, h.m)}</span>
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- İlk gün yalnızca su

/** Yeni kurulumda su açık, göz ve esneme kapalı; istersen Alışkanlıklar'dan açarsın */
function BreakDefaultDemo() {
  const n = useTick(1300);
  const more = n % 4 >= 2;
  const rows = [
    { icon: Droplet, label: tt("Su iç"), on: true, color: ACCENT.teal, hint: tt("1 saatte bir") },
    { icon: Eye, label: tt("Göz dinlendir"), on: more, color: ACCENT.purple, hint: tt("İstersen aç") },
    { icon: StretchHorizontal, label: tt("Esneme"), on: false, color: ACCENT.pink, hint: tt("İstersen aç") },
  ];
  return (
    <Stage>
      <Fit w={210} h={92}>
        <div className="absolute inset-x-[10px] top-[8px] space-y-[4px] rounded-[10px] border border-white/10 bg-[#161618] p-[7px]">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-[5px]">
              <span className="flex h-[14px] w-[14px] items-center justify-center rounded-[4px]" style={{ background: tintBg(r.color, r.on ? 24 : 8), color: r.on ? tintText(r.color) : "var(--color-label-3)" }}>
                <r.icon size={8} />
              </span>
              <span className="flex-1 text-[7.5px] font-semibold" style={{ color: r.on ? "var(--color-label)" : "var(--color-label-3)" }}>
                {r.label}
              </span>
              <span className="text-[6px] text-label-3">{r.hint}</span>
              <Switch on={r.on} color={r.color} />
            </div>
          ))}
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Hatırlatıcıda gün adları

const TYPED = "salı 10:00 ders";

/** "salı 10:00 ders" yazılır, düğme sıradaki salıyı gösterir */
function RemindWeekdayDemo() {
  const n = useTick(180);
  const k = n % 34;
  const shown = TYPED.slice(0, Math.min(TYPED.length, k));
  const done = k >= TYPED.length + 2;
  return (
    <Stage>
      <Fit w={210} h={88}>
        <div className="absolute inset-x-[16px] top-[8px] rounded-[10px] border p-[7px]" style={{ background: tintBg(ACCENT.orange, 10), borderColor: tintBg(ACCENT.orange, 26) }}>
          <p className="mb-[4px] text-[6px] font-semibold uppercase tracking-[0.1em]" style={{ color: tintText(ACCENT.orange) }}>
            {tt("Neyi hatırlatayım?")}
          </p>
          <div className="flex h-[16px] items-center rounded-[5px] bg-black/30 px-[5px] text-[8px] font-medium text-label">
            {shown}
            <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="ml-[1px] h-[9px] w-[1px] bg-label" />
          </div>
          <motion.div
            animate={{ opacity: done ? 1 : 0.35 }}
            className="mt-[6px] flex h-[17px] items-center justify-center gap-[4px] rounded-[6px] text-[7.5px] font-bold text-black"
            style={{ background: ACCENT.orange }}
          >
            <BellRing size={8} />
            {done ? tt("Salı 10:00") : tt("Hatırlat")}
          </motion.div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Takvimde tekrar

/** "Her hafta" seçilince salı günlerinin hepsinde nokta belirir */
function CalRepeatDemo() {
  const n = useTick(1400);
  const weekly = n % 2 === 1;
  return (
    <Stage>
      <Fit w={220} h={100}>
        <div className="absolute inset-[6px] flex gap-[8px] rounded-[10px] border border-white/10 bg-[#111113] p-[6px]">
          <div className="grid w-[86px] shrink-0 grid-cols-7 gap-y-[2px] text-center">
            {Array.from({ length: 28 }, (_, i) => {
              const tue = i % 7 === 1;
              const dot = tue && (i === 8 || (weekly && i >= 8));
              return (
                <span key={i} className="relative flex h-[12px] items-center justify-center text-[5.5px] text-label-2">
                  {i + 1}
                  <AnimatePresence>
                    {dot && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ delay: weekly ? (i - 8) * 0.02 : 0 }} className="absolute bottom-0 h-[2px] w-[2px] rounded-full" style={{ background: ACCENT.blue }} />}
                  </AnimatePresence>
                </span>
              );
            })}
          </div>
          <div className="min-w-0 flex-1 space-y-[4px] pt-[2px]">
            <div className="flex h-[16px] items-center gap-[4px] rounded-full border px-[5px]" style={{ background: tintBg(ACCENT.blue, 9), borderColor: tintBg(ACCENT.blue, 26) }}>
              <span className="text-[7px] font-medium tabular-nums" style={{ color: tintText(ACCENT.blue) }}>10:00</span>
              <span className="flex-1 truncate text-[7px] text-label">{tt("Matematik")}</span>
              {weekly && <Repeat size={7} className="text-label-3" />}
            </div>
            <motion.div
              key={String(weekly)}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="inline-flex h-[15px] items-center gap-[3px] rounded-full border px-[5px] text-[6.5px] font-medium"
              style={weekly ? { background: tintBg(ACCENT.blue, 12), borderColor: tintBg(ACCENT.blue, 34), color: tintText(ACCENT.blue) } : { borderColor: "rgb(255 255 255 / .08)", color: "var(--color-label-3)" }}
            >
              <Repeat size={7} />
              {weekly ? tt("Her hafta") : tt("Bir kez")}
            </motion.div>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Net adlar

const RENAMES = [
  { icon: Gamepad2, from: tt("Oyun"), to: tt("Mini oyunlar"), color: ACCENT.pink },
  { icon: LayoutGrid, from: tt("Kısayollar"), to: tt("Uygulamalar"), color: ACCENT.blue },
  { icon: Gamepad2, from: tt("Ayarlar › Oyun"), to: tt("Ayarlar › Tam ekran"), color: ACCENT.orange },
  { icon: Keyboard, from: tt("Ayarlar › Kısayollar"), to: tt("Ayarlar › Klavye kısayolları"), color: ACCENT.blue },
];

/** Eski ad silinir, yenisi yazılır */
function ClearNamesDemo() {
  const n = useTick(1300);
  const after = n % 2 === 1;
  return (
    <Stage>
      <Fit w={220} h={96}>
        <div className="absolute inset-x-[10px] top-[6px] space-y-[4px]">
          {RENAMES.map((r, i) => (
            <div key={i} className="flex h-[17px] items-center gap-[5px] rounded-[6px] border border-white/[0.06] bg-white/[0.04] px-[5px]">
              <span style={{ color: tintText(r.color) }}>
                <r.icon size={8} />
              </span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={String(after)}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ delay: i * 0.06, duration: 0.18 }}
                  className="text-[7.5px] font-semibold"
                  style={{ color: after ? "var(--color-label)" : "var(--color-label-3)" }}
                >
                  {after ? r.to : r.from}
                </motion.span>
              </AnimatePresence>
            </div>
          ))}
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Kendi durum satırınla plan göstergesi

/** Terminaldeki kendi durum satırı yerinde kalır; aynı anda adada plan göstergesi dolar */
function ClaudeWrapDemo() {
  const n = useTick(1500);
  const on = n % 3 !== 0;
  const pct = on ? (n % 3 === 1 ? 34 : 41) : 0;
  return (
    <Stage>
      <Fit w={230} h={100}>
        <div className="absolute left-[8px] top-[8px] w-[112px] rounded-[7px] border border-white/10 bg-[#0c0c0e] p-[5px] font-mono">
          <p className="text-[6px] text-label-3">{"> claude"}</p>
          <p className="mt-[3px] text-[6px] text-label-2">{tt("Dosyaları düzenliyorum…")}</p>
          <p className="mt-[8px] truncate rounded-[2px] bg-white/[0.06] px-[3px] py-[1px] text-[6px]" style={{ color: "#8fe03a" }}>
            ~/proje · main · Opus
          </p>
        </div>
        <div className="absolute right-[8px] top-[8px] w-[96px] rounded-[9px] border p-[5px]" style={{ background: tintBg("#D97757", 9), borderColor: tintBg("#D97757", 28) }}>
          <div className="flex items-center gap-[4px]">
            <MiniNook color="#D97757" size={14} />
            <span className="text-[7px] font-semibold" style={{ color: tintText("#D97757") }}>Claude</span>
          </div>
          <p className="mt-[5px] flex justify-between text-[6px] text-label-2">
            {tt("5 saat")} <span className="font-bold text-label">{on ? `%${pct}` : "—"}</span>
          </p>
          <div className="mt-[2px] h-[4px] overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full" animate={{ width: `${pct}%` }} style={{ background: ACCENT.green }} />
          </div>
          <p className="mt-[4px] text-[5.5px] text-label-3">{on ? tt("Kendi satırın da yerinde") : tt("Plan göstergesini aç")}</p>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Güncelleme Studio'da

/** Ada ve Studio'daki sürüm kartı: ikisinde aynı güncelleme animasyonu, aynı ilerleme */
function UpdateStudioDemo() {
  const fake = useFakeUpdate();
  const capsule = (
    <div className="relative h-10 w-[300px] overflow-hidden rounded-[18px] bg-black">
      <div className="absolute left-[13px] top-1/2 -translate-y-1/2">
        <MiniNook color={ACCENT.purple} size={24} />
      </div>
      <UpdateBody anim="sprout" p={fake.p} done={fake.done} version="0.3.8" />
    </div>
  );
  return (
    <Stage>
      <Fit w={330} h={170}>
        <div className="absolute left-1/2 top-0 origin-top -translate-x-1/2 scale-[0.6]">{capsule}</div>
        <div className="absolute inset-x-[10px] bottom-[10px] top-[38px] flex items-center gap-[12px] rounded-[16px] border border-white/10 bg-white/[0.04] px-[14px]">
          <div className="shrink-0">
            <p className="text-[8px] font-extrabold text-label-2">Nook</p>
            <p className="font-round text-[30px] font-extrabold leading-none tracking-[-0.04em]" style={{ background: `linear-gradient(100deg, ${ACCENT.purple}, ${ACCENT.pink} 45%, ${ACCENT.orange})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              0.3.7
            </p>
            <p className="mt-[4px] text-[7px] text-label-3">{tt("Studio › Hakkında")}</p>
          </div>
          <div className="relative ml-auto h-[24px] w-[180px] shrink-0">
            <div className="absolute left-0 top-0 origin-top-left scale-[0.6]">{capsule}</div>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Görünümler

const SAVED = [
  { color: "#FF5C8A", look: { ...DEFAULT_LOOK, shape: "heart" as const, head: "headphones" as const } },
  { color: "#2FD4C0", look: { ...DEFAULT_LOOK, shape: "cloud" as const, texture: "plush" as const } },
  { color: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "flower" as const, eyes: "sparkle" as const } },
];

/** Görünüm sayfasının üst satırı: Kaydet, Varsayılan */
function LookBar({ hot, saved }: { hot: "save" | "reset" | null; saved?: boolean }) {
  const btn = (on: boolean, color: string | null) => ({
    background: color ? tintBg(color, on ? 30 : 16) : on ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.04)",
    borderColor: color ? tintBg(color, 38) : "rgba(255,255,255,.08)",
    color: color ? tintText(color) : "var(--color-label-2)",
  });
  return (
    <div className="flex gap-[5px]">
      <motion.span animate={{ scale: hot === "save" ? 0.92 : 1 }} className="flex items-center gap-[3px] rounded-[6px] border px-[6px] py-[3px] text-[7px] font-semibold" style={btn(hot === "save", ACCENT.blue)}>
        <Bookmark size={7} strokeWidth={2.6} fill={saved ? "currentColor" : "none"} /> {saved ? tt("Kayıtlı") : tt("Kaydet")}
      </motion.span>
      <motion.span animate={{ scale: hot === "reset" ? 0.92 : 1 }} className="flex items-center gap-[3px] rounded-[6px] border px-[6px] py-[3px] text-[7px] font-semibold" style={btn(hot === "reset", null)}>
        <RotateCcw size={7} strokeWidth={2.6} /> {tt("Varsayılan")}
      </motion.span>
    </div>
  );
}

/** Kaydet'e basılır, Nook Kayıtlılar'a kayarak eklenir */
function SavedLooksDemo() {
  const n = useTick(1400) % 4;
  const shown = SAVED.slice(0, n === 0 ? 2 : 3);
  return (
    <Stage>
      <Fit w={230} h={110}>
        <div className="absolute left-[10px] top-[10px]">
          <LookBar hot={n === 1 ? "save" : null} saved={n >= 2} />
        </div>
        <div className="absolute left-[14px] top-[42px] flex flex-col items-center">
          <NookFigure look={SAVED[2].look} color={SAVED[2].color} size={40} expression="happy" />
        </div>
        <div className="absolute right-[10px] top-[36px] w-[132px] rounded-[9px] border border-white/10 bg-white/[0.03] p-[6px]">
          <p className="text-[7px] font-semibold" style={{ color: tintText(ACCENT.pink) }}>{tt("Kayıtlılar")}</p>
          <div className="mt-[4px] flex gap-[4px]">
            <AnimatePresence initial={false}>
              {[...shown].reverse().map((o, i) => (
                <motion.div key={o.color} layout initial={{ opacity: 0, scale: 0.5, x: -10 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0 }} className="flex h-[38px] w-[36px] items-center justify-center rounded-[7px] border" style={{ borderColor: i === 0 && n >= 2 ? tintBg(ACCENT.pink, 55) : "rgba(255,255,255,.07)" }}>
                  <NookFigure look={o.look} color={o.color} size={22} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

/** Süslü Nook "Varsayılan"a basınca beyaz, yuvarlak ilk hâline döner */
function LookDefaultDemo() {
  const n = useTick(1600) % 3;
  const plain = n === 2;
  const fancy = { color: "#9B7BFF", look: { ...DEFAULT_LOOK, shape: "cloud" as const, texture: "plush" as const, head: "beret" as const, glasses: "round" as const } };
  return (
    <Stage>
      <Fit w={230} h={110}>
        <div className="absolute left-[10px] top-[10px]">
          <LookBar hot={n === 1 ? "reset" : null} />
        </div>
        <div className="absolute left-1/2 top-[62px] -translate-x-1/2 -translate-y-1/2">
          <AnimatePresence mode="wait">
            <motion.div key={plain ? "p" : "f"} initial={{ opacity: 0, scale: 0.7, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}>
              <NookFigure look={plain ? DEFAULT_LOOK : fancy.look} color={plain ? "#F4F4F6" : fancy.color} size={46} expression={plain ? "happy" : "idle"} />
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="absolute inset-x-0 bottom-[8px] text-center text-[7px] text-label-3">{plain ? tt("İlk hâli · adı aynı") : tt("Süslü Nook")}</p>
      </Fit>
    </Stage>
  );
}

/** İmleç seçeneğe gelir; seçenek ve ada aynı anda hazırlanmaya başlar, tıklayınca ikisinde de hemen değişir */
function LookFastDemo() {
  const n = useTick(900) % 5;
  const warm = n >= 1;
  const picked = n >= 3;
  const next = SAVED[1];
  return (
    <Stage>
      <Fit w={230} h={110}>
        {/* Ada */}
        <div className="absolute left-1/2 top-0 flex h-[22px] w-[90px] -translate-x-1/2 items-center gap-[5px] rounded-b-[11px] bg-black px-[6px]">
          <NookFigure look={picked ? next.look : DEFAULT_LOOK} color={picked ? next.color : "#F4F4F6"} size={14} />
          <span className="text-[6.5px] font-semibold text-label-2">{picked ? tt("Hazır") : warm ? tt("Hazırlanıyor…") : "Nook"}</span>
        </div>
        {/* Seçenekler */}
        <div className="absolute left-1/2 top-[40px] flex -translate-x-1/2 gap-[6px]">
          {SAVED.map((o, i) => (
            <div key={o.color} className="relative flex h-[44px] w-[42px] items-center justify-center rounded-[8px] border" style={{ borderColor: i === 1 && picked ? tintBg(ACCENT.pink, 55) : "rgba(255,255,255,.07)", background: i === 1 && warm ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.02)" }}>
              <NookFigure look={o.look} color={o.color} size={24} />
              {i === 1 && warm && !picked && <motion.span className="absolute inset-0 rounded-[8px] border" style={{ borderColor: tintBg(ACCENT.blue, 50) }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity }} />}
            </div>
          ))}
        </div>
        {/* İmleç */}
        <motion.span className="absolute h-0 w-0 border-x-[4px] border-b-[9px] border-x-transparent border-b-white" style={{ rotate: -25 }} animate={{ left: warm ? 120 : 190, top: warm ? 70 : 96, scale: n === 3 ? 0.8 : 1 }} transition={{ duration: 0.5 }} />
      </Fit>
    </Stage>
  );
}

/** Şaşırt beni görünümü değiştirir, geri ok önceki hâle döndürür */
function LookUndoDemo() {
  const n = useTick(1300) % 4;
  const looks = [SAVED[0], SAVED[2]];
  const cur = n === 1 || n === 2 ? looks[1] : looks[0];
  return (
    <Stage>
      <Fit w={230} h={110}>
        <div className="absolute left-[10px] top-[10px] flex gap-[5px]">
          <motion.span animate={{ scale: n === 3 ? 0.88 : 1, background: n === 3 ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.04)" }} className="flex h-[17px] w-[17px] items-center justify-center rounded-[6px] border border-white/10 text-label-2">
            <Undo2 size={8} strokeWidth={2.6} />
          </motion.span>
          <motion.span animate={{ scale: n === 1 ? 0.9 : 1 }} className="rounded-[6px] border px-[6px] py-[3px] text-[7px] font-semibold" style={{ background: tintBg(ACCENT.pink, 16), borderColor: tintBg(ACCENT.pink, 38), color: tintText(ACCENT.pink) }}>
            {tt("Şaşırt beni")}
          </motion.span>
        </div>
        <div className="absolute left-1/2 top-[60px] -translate-x-1/2 -translate-y-1/2">
          <AnimatePresence mode="wait">
            <motion.div key={cur.color} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <NookFigure look={cur.look} color={cur.color} size={44} expression={n === 0 ? "happy" : "idle"} />
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="absolute inset-x-0 bottom-[8px] text-center text-[7px] text-label-3">{n === 3 || n === 0 ? tt("Eski hâline döndü") : tt("Yeni görünüm")}</p>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Duvar kağıtlarındaki aksesuarlar

const WALL_WEAR = [
  { look: { ...DEFAULT_LOOK, head: "trapper" as const }, label: tt("Kamp ateşi") },
  { look: { ...DEFAULT_LOOK, head: "rainhat" as const, neck: "greenscarf" as const }, label: tt("Yağmurlu pencere") },
  { look: { ...DEFAULT_LOOK, head: "earmuffs" as const, neck: "stripescarf" as const }, label: tt("Kızak") },
  { look: { ...DEFAULT_LOOK, head: "headband" as const, glasses: "neon" as const }, label: tt("Retro gün batımı") },
  { look: { ...DEFAULT_LOOK, head: "rainbowbucket" as const, glasses: "rainbow" as const }, label: tt("Gökkuşağı DJ") },
  { look: { ...DEFAULT_LOOK, head: "newsboy" as const }, label: "Art deco" },
  { look: { ...DEFAULT_LOOK, head: "moonwizard" as const, glasses: "monocle" as const }, label: tt("Altın büyü") },
  { look: { ...DEFAULT_LOOK, head: "hood" as const }, label: tt("Zümrüt") },
  { look: { ...DEFAULT_LOOK, head: "sitehat" as const, glasses: "visor" as const }, label: tt("Şantiye") },
  { look: { ...DEFAULT_LOOK, head: "detective" as const, glasses: "magnifier" as const }, label: tt("Kütüphane dedektifi") },
];

/** Duvar kağıdındaki Nook'un kıyafeti sırayla Görünüm'deki Nook'a geçer */
function WallWearDemo() {
  const n = useTick(1500) % WALL_WEAR.length;
  const w = WALL_WEAR[n];
  return (
    <Stage>
      <Fit w={230} h={110}>
        <div className="absolute left-1/2 top-[50px] -translate-x-1/2 -translate-y-1/2">
          <AnimatePresence mode="wait">
            <motion.div key={n} initial={{ opacity: 0, y: 8, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.9 }} transition={{ duration: 0.3 }}>
              <NookFigure look={w.look} color="#F4F4F6" size={50} expression="happy" />
            </motion.div>
          </AnimatePresence>
        </div>
        <motion.p key={n} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-x-0 bottom-[8px] text-center text-[7.5px] font-semibold" style={{ color: tintText(ACCENT.pink) }}>
          {w.label}
        </motion.p>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Uzun derleme bölüm sayılmaz

const CLIP_TITLES = [
  { t: "Muhteşem Yüzyıl | Hürrem'in intikamı", d: "41:20", ok: false },
  { t: "Muhteşem Yüzyıl 14. Bölüm", d: "1:32:10", ok: true },
  { t: "Muhteşem Yüzyıl", d: "1:28:45", ok: true, app: "Netflix" },
];

/** Çalan video değişir; derleme reddedilir, bölümlü ve yalın başlık tanınır */
function ClipNotEp1Demo() {
  const n = useTick(2200) % CLIP_TITLES.length;
  const c = CLIP_TITLES[n];
  const color = c.ok ? ACCENT.teal : ACCENT.pink;
  return (
    <Stage>
      <Fit w={230} h={110}>
        <AnimatePresence mode="wait">
          <motion.div key={n} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }} className="absolute inset-x-[14px] top-[14px]">
            <div className="flex items-center gap-[6px] rounded-[10px] bg-white/[.06] px-[8px] py-[7px]">
              <span className="flex h-[18px] w-[26px] shrink-0 items-center justify-center rounded-[4px] text-[6px] font-bold text-white" style={{ background: c.app ? "#B81D24" : "#E62117" }}>
                {c.app ? "N" : "▶"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[7.5px] font-semibold text-white">{tt(c.t)}</p>
                <p className="text-[6.5px] text-white/50">
                  {c.app ?? "YouTube"} · {c.d}
                </p>
              </div>
            </div>
            <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.45 }} className="mx-auto mt-[10px] flex w-fit items-center gap-[5px] rounded-full px-[9px] py-[4px] text-[7.5px] font-semibold" style={{ background: tintBg(color), color: tintText(color) }}>
              <MiniNook color={color} size={11} />
              {c.ok ? (n === 1 ? tt("S1B14 izleniyor") : tt("Sıradaki bölüm izleniyor")) : tt("Derleme · bölüm sayılmadı")}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </Fit>
    </Stage>
  );
}

export const DEMOS27 = {
  news: NewsDemo,
  breakdefault: BreakDefaultDemo,
  remindweekday: RemindWeekdayDemo,
  calrepeat: CalRepeatDemo,
  clearnames: ClearNamesDemo,
  claudewrap: ClaudeWrapDemo,
  updatestudio: UpdateStudioDemo,
  savedlooks: SavedLooksDemo,
  lookdefault: LookDefaultDemo,
  lookfast: LookFastDemo,
  lookundo: LookUndoDemo,
  wallwear: WallWearDemo,
  clipnotep1: ClipNotEp1Demo,
};
