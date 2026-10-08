/**
 * 0.2.41–0.2.42 yama notlarının görselleri: pano, karalama sekmeleri, raf sallama, uygulama başına
 * ses çıkışı, takvim aboneliği, sistem ayrıntıları, ses kartı, profiller, şarkı sözleri, yayın maskesi,
 * yıl özeti; kalkanın mikrofon düğmeleri ve Teams'te seviye sıfırlama. Hepsi kendi kendine döner.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDown,
  CalendarClock,
  Check,
  FileText,
  Gauge,
  HardDrive,
  Headphones,
  Link2,
  Mic,
  MicOff,
  MousePointer2,
  Pin,
  Plus,
  Search,
  Speaker,
  Usb,
  Volume2,
  VolumeX,
} from "lucide-react";
import { DEFAULT_LOOK, normalizeColor, normalizeLook, type Look } from "../../lib/look";
import { SCENE_LIST } from "../shield/catalog";
import { useNook } from "../../store/nook";
import { NookFigure } from "../mascot/Figure";
import { Props } from "../mascot/Props";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

function useTick(ms: number) {
  const [n, setN] = useState(1);
  useEffect(() => {
    const t = window.setInterval(() => setN((x) => x + 1), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return n;
}

function useFace() {
  const s = useNook((st) => st.settings);
  return { look: normalizeLook(s.look), color: normalizeColor(s.faceColor) };
}

const Stage = ({ children, bg }: { children: React.ReactNode; bg?: string }) => (
  <div className="relative h-full w-full overflow-hidden rounded-[14px]" style={{ background: bg ?? "radial-gradient(120% 100% at 50% 0%, #1d2031 0%, #0f1015 75%)" }}>
    {children}
  </div>
);

const Island = ({ width, height = 34, children, className = "" }: { width: number; height?: number; children?: React.ReactNode; className?: string }) => (
  <div className={`flex items-center bg-black ${className}`} style={{ width, height, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }}>
    {children}
  </div>
);

/** Pano: aramaya yazılır, eşleşen kayıt kalır; sabitli kayıt iğneli, görsel kaydı küçük resimli */
function ClipDemo() {
  const n = useTick(900);
  const words = ["", "t", "to", "top", "topl", "topla", "toplantı", "toplantı", ""];
  const q = words[n % words.length];
  const rows = [
    { t: "Toplantı notları: perşembe 14:00", pin: true },
    { t: "https://github.com/…", pin: false },
    { t: tt("Görsel · 1920×1080"), pin: false, img: true },
    { t: "npm run tauri build", pin: false },
  ].filter((r) => !q || r.t.toLowerCase().includes(q));
  return (
    <Stage>
      <div className="absolute inset-x-4 top-3 space-y-1.5">
        <div className="mr-12 flex h-6 items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 text-[10.5px] text-label">
          <Search size={10} className="text-label-3" />
          {q || <span className="text-label-3">{tt("Panoda ara")}</span>}
          <motion.span className="h-3 w-px bg-white/70" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
        </div>
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.div
              key={r.t}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="flex h-7 items-center gap-1.5 rounded-[8px] bg-white/[0.05] px-2 text-[10px] text-label"
              style={r.pin ? { boxShadow: `inset 0 0 0 1px ${tintBg(ACCENT.yellow, 35)}` } : undefined}
            >
              {r.img && <span className="h-4 w-6 rounded-[3px]" style={{ background: "linear-gradient(135deg, #ff375f, #0a84ff)" }} />}
              <span className="min-w-0 flex-1 truncate">{r.t}</span>
              {r.pin && <Pin size={10} fill="currentColor" style={{ color: tintText(ACCENT.yellow) }} />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Stage>
  );
}

/** Karalama sekmeleri: sekmeler arasında geçilir, biçimli önizleme açılıp kapanır */
function PadsDemo() {
  const n = useTick(1500);
  const tab = n % 3;
  const preview = n % 2 === 0;
  const tabs = ["Not 1", tt("Fikirler"), tt("Market")];
  const texts = [
    ["# Hafta", "- [x] Sunum", "- [ ] **Rapor**"],
    ["# Nook", "- Raf sallama", "- Sözler"],
    ["# Liste", "- süt", "- ekmek"],
  ];
  const t = texts[tab];
  return (
    <Stage>
      <div className="absolute inset-x-4 top-3">
        <div className="mb-1.5 flex gap-1">
          {tabs.map((x, i) => (
            <span
              key={x}
              className="rounded-full border px-2 py-[2px] text-[9.5px] font-medium"
              style={i === tab ? { background: tintBg(ACCENT.yellow, 16), borderColor: tintBg(ACCENT.yellow, 40), color: tintText(ACCENT.yellow) } : { borderColor: "rgb(255 255 255 / 0.06)", color: "var(--color-label-3)" }}
            >
              {x}
            </span>
          ))}
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/[0.06] text-label-3">
            <Plus size={9} />
          </span>
        </div>
        <div className="rounded-[10px] bg-white/[0.05] p-2.5 text-[10.5px] leading-relaxed">
          {preview ? (
            <>
              <p className="text-[12.5px] font-semibold text-label">{t[0].slice(2)}</p>
              {t.slice(1).map((l) => {
                const box = l.match(/\[([ x])\]/);
                const body = l.replace(/^- (\[[ x]\] )?/, "").replace(/\*\*(.+)\*\*/, "$1");
                return (
                  <p key={l} className="flex items-center gap-1.5 text-label-2">
                    {box ? (
                      <span className="flex h-2.5 w-2.5 items-center justify-center rounded-[2px] border" style={{ borderColor: box[1] === "x" ? ACCENT.yellow : "rgb(255 255 255 / 0.3)", background: box[1] === "x" ? tintBg(ACCENT.yellow, 40) : undefined }} />
                    ) : (
                      <span style={{ color: tintText(ACCENT.yellow) }}>•</span>
                    )}
                    <span className={/\*\*/.test(l) ? "font-semibold text-label" : box?.[1] === "x" ? "line-through text-label-3" : ""}>{body}</span>
                  </p>
                );
              })}
            </>
          ) : (
            t.map((l) => (
              <p key={l} className="font-mono text-[10px] text-label-2">
                {l}
              </p>
            ))
          )}
        </div>
      </div>
    </Stage>
  );
}

/** Dosya sürüklenirken fare sallanır, ada açılıp raf "Buraya bırak" der, dosya düşer */
function ShakeDemo() {
  const face = useFace();
  const n = useTick(2600);
  const phase = n % 2;
  return (
    <Stage>
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <motion.div
          className="overflow-hidden bg-black"
          animate={phase ? { width: 220, height: 64, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 } : { width: 110, height: 30, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }}
          transition={{ type: "spring", stiffness: 260, damping: 24, delay: phase ? 0.9 : 0 }}
        >
          <div className="flex h-full items-center justify-center gap-2">
            <NookFigure look={face.look} color={face.color} size={22} expression={phase ? "surprised" : "idle"} />
            {phase === 1 && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="rounded-[8px] border border-dashed px-2 py-1 text-[9.5px]" style={{ borderColor: tintBg(ACCENT.teal, 60), color: tintText(ACCENT.teal) }}>
                {tt("Raf · buraya bırak")}
              </motion.span>
            )}
          </div>
        </motion.div>
      </div>
      <motion.div
        className="absolute flex items-center gap-1 rounded-[6px] bg-white/10 px-1.5 py-0.5 text-[9.5px] text-label"
        style={{ left: "38%", top: "62%" }}
        animate={phase ? { x: [0, -22, 22, -22, 22, 0, 30], y: [0, 0, 0, 0, 0, 0, -78] } : { x: 0, y: 0 }}
        transition={{ duration: 2, times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 1], ease: "easeInOut" }}
      >
        <FileText size={10} /> rapor.pdf
        <MousePointer2 size={12} className="text-white" fill="white" />
      </motion.div>
    </Stage>
  );
}

/** Uygulama başına çıkış: Discord kulaklığa, oyun hoparlöre geçer */
function RouteDemo() {
  const n = useTick(1400);
  const rows = [
    { app: "Valorant", head: n % 2 === 0 },
    { app: "Discord", head: n % 2 === 1 || n % 4 === 0 },
    { app: "Spotify", head: false },
  ];
  return (
    <Stage>
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 space-y-1.5">
        {rows.map((r) => (
          <div key={r.app} className="flex items-center gap-2 rounded-[10px] bg-white/[0.05] px-2 py-1">
            <span className="w-[56px] text-[10px] text-label">{r.app}</span>
            <div className="h-[5px] flex-1 rounded-full bg-white/10">
              <div className="h-full w-2/3 rounded-full" style={{ background: ACCENT.pink }} />
            </div>
            <motion.span
              key={String(r.head)}
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              className="flex h-5 w-5 items-center justify-center rounded-full"
              style={{ background: r.head ? tintBg(ACCENT.purple, 22) : "rgb(255 255 255 / 0.06)", color: r.head ? tintText(ACCENT.purple) : "var(--color-label-3)" }}
            >
              {r.head ? <Headphones size={10} /> : <Speaker size={10} />}
            </motion.span>
          </div>
        ))}
      </div>
    </Stage>
  );
}

/** Abone takvimden etkinlik gelir; kapalı adada geri sayım iner */
function CalendarDemo() {
  const face = useFace();
  const n = useTick(1000);
  const left = 12 - (n % 12);
  return (
    <Stage>
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <Island width={190} className="justify-between px-2.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ border: `2px solid ${ACCENT.blue}`, color: ACCENT.blue }}>
            <CalendarClock size={9} />
          </span>
          <NookFigure look={face.look} color={face.color} size={20} />
          <motion.span className="text-[11px] font-medium tabular-nums" style={{ color: tintText(ACCENT.blue) }} animate={{ opacity: left <= 5 ? [1, 0.35, 1] : 1 }} transition={{ duration: 1, repeat: Infinity }}>
            {left ? tt("{0} dk", left) : tt("şimdi")}
          </motion.span>
        </Island>
      </div>
      <div className="absolute inset-x-6 bottom-3 space-y-1">
        {[
          { t: "14:00", x: tt("Sprint planlama"), ext: true },
          { t: "19:00", x: tt("Halı saha"), ext: false },
        ].map((e) => (
          <div key={e.x} className="flex h-6 items-center gap-2 rounded-full border px-2.5 text-[10px]" style={{ background: tintBg(e.ext ? ACCENT.purple : ACCENT.blue, 9), borderColor: tintBg(e.ext ? ACCENT.purple : ACCENT.blue, 26) }}>
            <span className="font-medium tabular-nums" style={{ color: tintText(e.ext ? ACCENT.purple : ACCENT.blue) }}>{e.t}</span>
            <span className="flex-1 text-label">{e.x}</span>
            {e.ext && <Link2 size={9} style={{ color: tintText(ACCENT.purple) }} />}
          </div>
        ))}
      </div>
    </Stage>
  );
}

/** Sistem: GPU çubuğu oynar, USB "Çıkar"a basılır, hız testi sayar */
function SystemDemo() {
  const n = useTick(700);
  const gpu = [42, 68, 91, 55, 37][n % 5];
  const ejected = n % 8 >= 5;
  const mbps = Math.min(184, (n % 8) * 30);
  return (
    <Stage>
      <div className="absolute left-4 right-14 top-3 space-y-2 text-[10px]">
        {[
          { l: tt("İşlemci"), v: 23 },
          { l: tt("Ekran kartı"), v: gpu },
        ].map((r) => (
          <div key={r.l}>
            <div className="flex justify-between text-label">
              <span>{r.l}</span>
              <span className="tabular-nums text-label-2">%{r.v}</span>
            </div>
            <div className="mt-0.5 h-[3px] rounded-full bg-white/10">
              <motion.div className="h-full rounded-full" style={{ background: r.v > 85 ? ACCENT.red : ACCENT.teal }} animate={{ width: `${r.v}%` }} />
            </div>
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-label">
          <HardDrive size={10} style={{ color: tintText(ACCENT.teal) }} />
          <span className="flex-1">C: · 123 GB {tt("boş")}</span>
          <span className="flex items-center gap-1 rounded-full px-1.5 text-[9px]" style={{ background: tintBg(ACCENT.green, 16), color: tintText(ACCENT.green) }}>
            ● {tt("Sağlıklı")}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-label">
          <Usb size={10} style={{ color: tintText(ACCENT.blue) }} />
          <span className="flex-1">E: KINGSTON</span>
          <span className="rounded-full px-1.5 text-[9px]" style={{ background: tintBg(ACCENT.blue, 16), color: tintText(ACCENT.blue) }}>
            {ejected ? tt("Çıkarılabilir") : tt("Çıkar")}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-label-2">
          <ArrowDown size={10} style={{ color: tintText(ACCENT.teal) }} /> 2,4 MB/s
          <span className="ml-auto flex items-center gap-1 rounded-full px-1.5 text-[9px]" style={{ background: tintBg(ACCENT.teal, 14), color: tintText(ACCENT.teal) }}>
            <Gauge size={9} /> {mbps} Mbit/s
          </span>
        </div>
      </div>
    </Stage>
  );
}

/** Ses kartı ada sürüklenirken yanında gelir; ekranın soluna gelince adanın sağına geçer */
function SoundSideDemo() {
  const face = useFace();
  const n = useTick(1600);
  const xs = [40, -10, -62, -10];
  const x = xs[n % xs.length];
  const right = x < -40;
  const card = (
    <div className="flex h-[54px] w-[62px] flex-col gap-1 rounded-[12px] bg-black p-1.5">
      <div className="flex items-center gap-1">
        <Volume2 size={8} style={{ color: tintText(ACCENT.pink) }} />
        <div className="h-[3px] flex-1 rounded-full" style={{ background: ACCENT.pink }} />
      </div>
      {[70, 45, 85].map((w, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          <div className="h-[2px] rounded-full bg-white/30" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
  return (
    <Stage>
      <div className="absolute inset-y-2 left-2 w-px bg-white/10" />
      <motion.div className="absolute top-3 flex items-start gap-1.5" style={{ left: "50%" }} animate={{ x: x - 60 }} transition={{ type: "spring", stiffness: 120, damping: 18 }}>
        {!right && card}
        <div className="flex h-[64px] w-[96px] items-center justify-center rounded-[16px] bg-black">
          <NookFigure look={face.look} color={face.color} size={30} />
        </div>
        {right && card}
        <MousePointer2 size={13} className="absolute -top-1 text-white" style={{ left: right ? 40 : 108 }} fill="white" />
      </motion.div>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9.5px] text-label-3">{right ? tt("solda yer yok → sağa geçti") : tt("ada taşınınca kart da gelir")}</span>
    </Stage>
  );
}

/** Profil şeridine + ile yeni profil eklenir, göz simgesiyle bölümler seçilir */
function ProfilesDemo() {
  const n = useTick(1200);
  const step = n % 5;
  const pills = [
    { l: tt("Hepsi"), c: ACCENT.teal },
    { l: tt("İş"), c: ACCENT.blue },
    { l: tt("Oyun"), c: ACCENT.red },
    ...(step >= 2 ? [{ l: tt("Ders"), c: ACCENT.purple }] : []),
  ];
  const active = step >= 2 ? 3 : 0;
  const chips = [
    { l: tt("Not"), c: ACCENT.orange, on: step >= 3 },
    { l: "Pomodoro", c: ACCENT.red, on: step >= 4 },
    { l: tt("Takvim"), c: ACCENT.blue, on: step >= 3 },
    { l: tt("Oyun"), c: ACCENT.pink, on: false },
  ];
  return (
    <Stage>
      <div className="absolute left-4 top-3 flex items-center gap-0.5 rounded-full bg-white/[0.04] p-[2px]">
        {pills.map((p, i) => (
          <motion.span key={p.l} layout initial={{ scale: 0.4 }} animate={{ scale: 1 }} className="rounded-full px-2 py-[2px] text-[9.5px] font-medium" style={i === active ? { background: tintBg(p.c, 22), color: tintText(p.c) } : { color: "var(--color-label-3)" }}>
            {p.l}
          </motion.span>
        ))}
        <motion.span className="flex h-4 w-4 items-center justify-center rounded-full text-label-3" animate={{ scale: step === 1 ? [1, 1.4, 1] : 1, color: step === 1 ? "#fff" : undefined }}>
          <Plus size={9} />
        </motion.span>
      </div>
      <div className="absolute inset-x-4 bottom-3 grid grid-cols-2 gap-1.5">
        {chips.map((c) => (
          <motion.div key={c.l} className="flex h-6 items-center rounded-full border px-2.5 text-[10px]" animate={{ opacity: step >= 2 && !c.on ? 0.35 : 1 }} style={{ background: tintBg(c.c, 12), borderColor: tintBg(c.c, 34), color: tintText(c.c) }}>
            {c.l}
          </motion.div>
        ))}
      </div>
    </Stage>
  );
}

/** Şarkı sözleri: satırlar yukarı akar, şu anki satır pembe parlar */
function LyricsDemo() {
  const n = useTick(1300);
  const lines = ["I've been tryna call", "I've been on my own for long enough", "Maybe you can show me how to love", "I'm goin' through withdrawals", "You don't even have to do too much", "I said, ooh, I'm blinded by the lights"];
  const cur = n % lines.length;
  return (
    <Stage>
      <div className="absolute left-4 top-3 flex items-center gap-2">
        <span className="h-7 w-7 rounded-[7px]" style={{ background: "linear-gradient(135deg, #ff375f, #bf5af2, #0a84ff)" }} />
        <span className="leading-tight">
          <span className="block text-[11px] font-medium text-label">Blinding Lights</span>
          <span className="block text-[9.5px] text-label-3">The Weeknd</span>
        </span>
      </div>
      <div className="absolute inset-x-4 bottom-2 top-12 overflow-hidden" style={{ maskImage: "linear-gradient(transparent, black 30%, black 70%, transparent)" }}>
        <motion.div animate={{ y: 34 - cur * 22 }} transition={{ type: "spring", stiffness: 160, damping: 22 }}>
          {lines.map((l, i) => (
            <p
              key={l}
              className="h-[22px] origin-left truncate font-display text-[12px] font-semibold leading-[22px] transition-all duration-300"
              style={{ color: i === cur ? tintText(ACCENT.pink) : "var(--color-label-2)", opacity: i === cur ? 1 : 0.3, transform: `scale(${i === cur ? 1.04 : 0.95})` }}
            >
              {l}
            </p>
          ))}
        </motion.div>
      </div>
    </Stage>
  );
}

/** Yayın: ekran paylaşılınca Nook mikrofonu alır, not buzlanır */
function LiveDemo() {
  const face = useFace();
  const n = useTick(2200);
  const live = n % 2 === 0;
  const k = 52 / 24;
  return (
    <Stage>
      <div className="absolute left-5 top-1/2 -translate-y-1/2" style={{ width: 52, height: 52 }}>
        <NookFigure look={face.look} color={face.color} size={52} expression={live ? "happy" : "idle"} />
        <div className="absolute left-0 top-0" style={{ width: 24, height: 24, transform: `scale(${k})`, transformOrigin: "0 0" }}>
          <Props expression={live ? "live" : "idle"} sleepStyle="nap" />
        </div>
      </div>
      <div className="absolute left-4 top-3 flex items-center gap-1 rounded-full px-2 py-[2px] text-[9px] font-bold tracking-wider" style={{ background: live ? tintBg(ACCENT.red, 22) : "rgb(255 255 255 / 0.05)", color: live ? tintText(ACCENT.red) : "var(--color-label-3)" }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: live ? ACCENT.red : "#666" }} />
        {live ? tt("CANLI") : tt("paylaşım yok")}
      </div>
      <div className="absolute bottom-3 right-4 top-10 w-[150px] overflow-hidden rounded-[10px] bg-white/[0.05] p-2 text-[10px] text-label-2">
        <motion.div animate={{ filter: live ? "blur(6px)" : "blur(0px)", opacity: live ? 0.5 : 1 }} transition={{ duration: 0.4 }}>
          <p className="font-semibold text-label">{tt("Not")}</p>
          <p>{tt("Banka şifresi değişti")}</p>
          <p>{tt("Doğum günü sürprizi")}</p>
        </motion.div>
        <AnimatePresence>
          {live && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center text-[9.5px] font-semibold" style={{ color: tintText(ACCENT.red) }}>
              {tt("Canlı yayında gizli")}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </Stage>
  );
}

/** Yıl özeti: saatler sayılarak artar, saat grafiğinin çubukları yükselir */
function YearDemo() {
  const n = useTick(120);
  const hoursTotal = Math.min(867, (n % 60) * 18);
  const bars = [1, 0.4, 0.2, 0.1, 0.1, 0.2, 0.4, 0.6, 0.7, 0.8, 0.75, 0.7, 0.6, 0.65, 0.7, 0.72, 0.68, 0.6, 0.55, 0.7, 0.9, 1, 0.95, 0.9];
  const grow = Math.min(1, (n % 60) / 25);
  return (
    <Stage>
      <div className="absolute left-4 top-3">
        <p className="font-display text-[26px] font-semibold leading-none tabular-nums" style={{ color: tintText(ACCENT.yellow) }}>
          {tt("{0} saat", hoursTotal)}
        </p>
        <p className="mt-1 text-[10px] text-label-2">{tt("2026 seninle bu kadar zaman geçirdik")}</p>
      </div>
      <div className="absolute inset-x-4 bottom-3 flex h-[44px] items-end gap-[2px]">
        {bars.map((b, i) => (
          <motion.span key={i} className="flex-1 rounded-t-[2px]" style={{ background: ACCENT.yellow, opacity: i === 21 ? 1 : 0.5 }} animate={{ height: `${b * grow * 100}%` }} transition={{ duration: 0.3 }} />
        ))}
      </div>
    </Stage>
  );
}

/** Kalkanda sağ üstteki mikrofon / hoparlöre tıklanır: kapanır, açılır */
function ShieldMicDemo() {
  const n = useTick(1300);
  const mic = n % 2 === 0;
  const spk = n % 4 < 2;
  return (
    <Stage bg="radial-gradient(120% 90% at 50% 40%, #1a1830 0%, #0c0b18 60%, #050509 100%)">
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-2.5">
        {[
          { on: mic, a: Mic, b: MicOff },
          { on: spk, a: Volume2, b: VolumeX },
        ].map((x, i) => (
          <motion.span
            key={i}
            animate={{ scale: [1, 0.9, 1] }}
            transition={{ duration: 0.3, delay: i * 0.2 }}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: x.on ? "rgb(255 255 255 / 0.08)" : tintBg(ACCENT.red, 25), color: x.on ? "var(--color-label-2)" : tintText(ACCENT.red) }}
          >
            {x.on ? <x.a size={17} /> : <x.b size={17} />}
          </motion.span>
        ))}
      </div>
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-white/60">{mic ? tt("Mikrofon açık") : tt("Mikrofon kalkanca kapalı")}</span>
    </Stage>
  );
}

/** Teams: kalkan mikrofonu susturmaz, seviyeyi 0'a indirir; Teams'in düğmesi açık kalır */
function TeamsMicDemo() {
  const n = useTick(1500);
  const shield = n % 2 === 0;
  return (
    <Stage>
      <div className="absolute left-5 right-14 top-4 space-y-2.5 text-[10px]">
        <div className="flex items-center gap-2">
          <Mic size={12} className="text-label-2" />
          <span className="w-[64px] text-label">{tt("Mikrofon")}</span>
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full" style={{ background: ACCENT.orange }} animate={{ width: shield ? "0%" : "72%" }} transition={{ duration: 0.5 }} />
          </div>
          <span className="w-6 text-right tabular-nums text-label-2">{shield ? 0 : 72}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-[5px] text-[9px] font-bold text-white" style={{ background: "#5b5fc7" }}>T</span>
          <span className="flex-1 text-label">{tt("Teams mikrofon düğmesi")}</span>
          <span className="flex items-center gap-1 rounded-full px-1.5 py-[1px] text-[9px]" style={{ background: tintBg(ACCENT.green, 18), color: tintText(ACCENT.green) }}>
            <Check size={9} /> {tt("açık kalır")}
          </span>
        </div>
      </div>
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9.5px] text-label-3">{shield ? tt("kalkan açık · seviye 0") : tt("kalkan kalktı · eski seviye")}</span>
    </Stage>
  );
}

/** Kalkan sahnesi: Karışık → Sırayla → Hep aynısı; altında gelen sahnelerin adı akar */
function ScenePickDemo() {
  const n = useTick(1100);
  const modes = [tt("Karışık"), tt("Sırayla"), tt("Hep aynısı")];
  const mode = Math.floor(n / 4) % 3;
  const scenes = SCENE_LIST.slice(0, 8);
  const at = mode === 0 ? (n * 5) % scenes.length : mode === 1 ? n % scenes.length : 0;
  return (
    <Stage bg="radial-gradient(120% 90% at 50% 40%, #1a1830 0%, #0c0b18 60%, #050509 100%)">
      <div className="absolute left-4 top-3 flex gap-0.5 rounded-full bg-white/[0.06] p-[2px]">
        {modes.map((m, i) => (
          <span key={m} className="rounded-full px-2 py-[2px] text-[9.5px] font-medium" style={i === mode ? { background: tintBg(ACCENT.purple, 24), color: tintText(ACCENT.purple) } : { color: "var(--color-label-3)" }}>
            {m}
          </span>
        ))}
      </div>
      <div className="absolute inset-x-4 bottom-3 flex flex-wrap gap-1">
        {scenes.map((s, i) => (
          <motion.span
            key={s.id}
            className="rounded-full border px-2 py-[2px] text-[9.5px]"
            animate={{ scale: i === at ? 1.08 : 1 }}
            style={i === at ? { background: tintBg(ACCENT.yellow, 20), borderColor: tintBg(ACCENT.yellow, 50), color: tintText(ACCENT.yellow) } : { borderColor: "rgb(255 255 255 / 0.08)", color: "var(--color-label-3)" }}
          >
            {s.label}
          </motion.span>
        ))}
      </div>
    </Stage>
  );
}

/** Canlı sahne: Nook'lar çömelip zıplar; iksir dökülünce biri başka gövdeye dönüşür */
function LivelyDemo() {
  const n = useTick(1200);
  const spilled = n % 4 >= 2;
  const a: { look: Look; color: string } = { look: { ...DEFAULT_LOOK, shape: "sphere" }, color: "#F4F4F6" };
  const b: { look: Look; color: string } = spilled ? { look: { ...DEFAULT_LOOK, shape: "cat", texture: "jelly" }, color: "#8FE03A" } : { look: { ...DEFAULT_LOOK, shape: "bean", head: "conductor" }, color: "#2B8CFF" };
  return (
    <Stage bg="linear-gradient(180deg, #1c2a1f 0%, #0d140f 100%)">
      <div className="absolute inset-x-0 bottom-4 flex items-end justify-center gap-8">
        <motion.div animate={{ y: [0, 0, -18, 0, 0], scaleY: [1, 0.82, 1.08, 0.9, 1], scaleX: [1, 1.12, 0.94, 1.08, 1] }} transition={{ duration: 1.2, repeat: Infinity, times: [0, 0.2, 0.5, 0.8, 1] }} style={{ originY: 1 }}>
          <NookFigure look={a.look} color={a.color} size={40} />
        </motion.div>
        <div className="relative">
          <motion.span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[15px]" animate={{ rotate: spilled ? 110 : 0 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
            <span className="block h-4 w-3 rounded-b-[6px] rounded-t-[2px]" style={{ background: "linear-gradient(180deg, transparent 30%, #a0ff5e 30%)", border: "1.5px solid rgba(255,255,255,0.7)" }} />
          </motion.span>
          <AnimatePresence mode="popLayout">
            <motion.div key={spilled ? "b" : "a"} initial={{ scale: 0.3, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.3, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14 }}>
              <NookFigure look={b.look} color={b.color} size={40} expression={spilled ? "surprised" : "idle"} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Stage>
  );
}

/** Yeni 3B aksesuarlar sırayla: kovboy, korsan, hasır şapka, kondüktör, miğfer, baret, gözlük, göz bandı, atkı */
function NewWearDemo() {
  const n = useTick(1100);
  const list: { look: Look; color: string; label: string }[] = [
    { look: { ...DEFAULT_LOOK, head: "cowboy" }, color: "#FF6A3D", label: tt("Kovboy") },
    { look: { ...DEFAULT_LOOK, head: "pirate", glasses: "eyepatch" }, color: "#F4F4F6", label: tt("Korsan · göz bandı") },
    { look: { ...DEFAULT_LOOK, head: "straw" }, color: "#FFD21F", label: tt("Hasır şapka") },
    { look: { ...DEFAULT_LOOK, head: "conductor" }, color: "#2B8CFF", label: tt("Kondüktör kepi") },
    { look: { ...DEFAULT_LOOK, head: "helmet" }, color: "#8FE03A", label: tt("Miğfer") },
    { look: { ...DEFAULT_LOOK, head: "hardhat", glasses: "goggles" }, color: "#FF5C8A", label: tt("Baret · koruyucu gözlük") },
    { look: { ...DEFAULT_LOOK, neck: "scarf" }, color: "#9B7BFF", label: tt("Atkı") },
  ];
  const cur = list[n % list.length];
  return (
    <Stage>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
        <AnimatePresence mode="popLayout">
          <motion.div key={n} initial={{ scale: 0.5, opacity: 0, y: 6 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 20 }}>
            <NookFigure look={cur.look} color={cur.color} size={56} />
          </motion.div>
        </AnimatePresence>
        <span className="text-[10px] text-label-2">{cur.label}</span>
      </div>
    </Stage>
  );
}

/** Karne: hafta hafta not değişir; harf ölçeğinde yeri parlar, dökümdeki çubuklar dolar */
function ReportDemo() {
  const face = useFace();
  const n = useTick(2200);
  const weeks = [
    { letter: "C", pts: 54, color: ACCENT.yellow, parts: [0.45, 0.4, 0.7, 0.6] },
    { letter: "B", pts: 71, color: ACCENT.teal, parts: [0.7, 0.6, 0.8, 0.7] },
    { letter: "A", pts: 88, color: ACCENT.green, parts: [0.95, 0.85, 0.9, 0.8] },
  ];
  const w = weeks[n % weeks.length];
  const labels = [tt("Odak"), "Pomodoro", tt("İlgi"), tt("Keyif")];
  const bars = [ACCENT.red, ACCENT.orange, ACCENT.pink, ACCENT.yellow];
  return (
    <Stage>
      <div className="absolute bottom-3 left-4 top-3 flex w-[92px] flex-col items-center justify-center gap-1">
        <NookFigure look={face.look} color={face.color} size={30} expression={w.letter === "A" ? "happy" : "idle"} />
        <AnimatePresence mode="popLayout">
          <motion.span key={w.letter} className="font-display text-[30px] font-semibold leading-none" style={{ color: tintText(w.color) }} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 18 }}>
            {w.letter}
          </motion.span>
        </AnimatePresence>
        <span className="text-[9px] tabular-nums text-label-3">{w.pts} / 100</span>
        <div className="flex gap-[2px]">
          {["A", "B", "C", "D", "E"].map((l) => (
            <span key={l} className="rounded-[4px] px-1 text-[8.5px] font-semibold" style={l === w.letter ? { background: tintBg(w.color, 30), color: tintText(w.color) } : { background: "rgb(255 255 255 / 0.06)", color: "var(--color-label-3)" }}>
              {l}
            </span>
          ))}
        </div>
      </div>
      <div className="absolute bottom-3 left-[118px] right-14 top-4 flex flex-col justify-center gap-2">
        {labels.map((l, i) => (
          <div key={l}>
            <span className="text-[9.5px] text-label-2">{l}</span>
            <div className="mt-[2px] h-[5px] overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div className="h-full rounded-full" style={{ background: bars[i] }} animate={{ width: `${w.parts[i] * 100}%` }} transition={{ duration: 0.6, delay: i * 0.08 }} />
            </div>
          </div>
        ))}
      </div>
    </Stage>
  );
}

/** Argus sayacı: video tam ekranda oynarken de izlenen dakika videoyla aynı hızda ilerler */
function WatchTimeDemo() {
  const face = useFace();
  const n = useTick(140);
  const min = n % 34;
  const shown = Math.min(min, 26);
  const done = min >= 26;
  return (
    <Stage bg="radial-gradient(120% 100% at 50% 0%, #241a14 0%, #0f0c0a 75%)">
      {/* Tam ekran video */}
      <div className="absolute inset-x-4 bottom-3 top-3 overflow-hidden rounded-[10px] bg-black">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #3a2a55 0%, #1c3550 55%, #12222f 100%)", opacity: 0.8 }} />
        <span className="absolute left-2.5 top-2 flex items-center gap-1.5 text-[9.5px] text-white/70">
          Lanterns · S1 B8
          <span className="rounded-[4px] bg-white/10 px-1 text-[8.5px] text-white/60">{tt("Tam ekran")}</span>
        </span>
        <div className="absolute inset-x-2.5 bottom-2 flex items-center gap-2 text-[8.5px] tabular-nums text-white/70">
          <span>{tt("{0}:00", shown)}</span>
          <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
            <motion.div className="h-full rounded-full bg-white/80" animate={{ width: `${(shown / 45) * 100}%` }} transition={{ duration: 0.14, ease: "linear" }} />
          </div>
          <span>45:00</span>
        </div>
        {/* Nook'un sayacı: videoyla aynı dakika */}
        <div className="absolute left-1/2 top-[38%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-black/70 py-1 pl-1 pr-3">
          <NookFigure look={face.look} color={face.color} size={22} expression={done ? "happy" : "idle"} />
          <span className="whitespace-nowrap text-[11px] font-medium tabular-nums" style={{ color: tintText(done ? ACCENT.green : ACCENT.orange) }}>
            {done ? tt("{0} dk · bitti mi?", shown) : tt("{0} dk izlendi", shown)}
          </span>
        </div>
      </div>
    </Stage>
  );
}

/** Claude Code: izin isteği adaya gelir, "İzin ver"e basılır, iş bitince haber gelir */
function ClaudeAskDemo() {
  const face = useFace();
  const n = useTick(1100);
  const phase = n % 6; // 0 kapalı · 1-3 kart · 4-5 bitti
  const card = phase >= 1 && phase <= 3;
  const done = phase >= 4;
  const C = "#D97757";
  return (
    <Stage bg="radial-gradient(120% 100% at 50% 0%, #2a1c16 0%, #0f0c0a 75%)">
      {/* Kullanıcı başka bir pencerede: izin terminalde değil adada sorulur */}
      <div className="absolute inset-x-7 bottom-5 top-[104px] rounded-[10px] border border-white/[0.06] bg-white/[0.03] p-2 text-[8.5px] text-white/35">
        <div className="mb-1.5 flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
        </div>
        {tt("Başka bir pencerede çalışıyorsun…")}
      </div>
      <div className="absolute inset-x-3 bottom-2 top-9 rounded-[10px] border border-white/[0.07]" />
      <div className="absolute left-1/2 top-9 -translate-x-1/2">
        <motion.div
          className="flex items-center overflow-hidden bg-black"
          animate={{ width: card ? 236 : done ? 214 : 84, height: card ? 50 : done ? 38 : 24 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          style={{ borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}
        >
          <span className="ml-2 flex shrink-0">
            <NookFigure look={face.look} color={face.color} size={card ? 26 : 18} expression={done ? "happy" : card ? "surprised" : "idle"} />
          </span>
          <AnimatePresence mode="wait">
            {card && (
              <motion.div key="card" className="ml-2 flex min-w-0 flex-1 items-center gap-1.5 pr-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-[8px] font-medium" style={{ color: tintText(C) }}>Claude · Nook</p>
                  <p className="truncate text-[9.5px] font-medium text-white">{tt("Komut çalıştırmak istiyor")}</p>
                  <p className="truncate font-mono text-[8px] text-white/55">npm run build</p>
                </div>
                <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px]" style={{ background: tintBg(ACCENT.red, 14), color: tintText(ACCENT.red) }}>
                  ×
                </span>
                <motion.span
                  className="flex h-6 items-center gap-1 rounded-full border px-2 text-[9px] font-medium"
                  animate={{ scale: phase === 3 ? [1, 0.88, 1] : 1 }}
                  style={{ background: tintBg(ACCENT.green, phase === 3 ? 40 : 24), borderColor: tintBg(ACCENT.green, 60), color: tintText(ACCENT.green) }}
                >
                  <Check size={9} /> {tt("İzin ver")}
                </motion.span>
              </motion.div>
            )}
            {done && (
              <motion.div key="done" className="ml-2 min-w-0 flex-1 pr-3 leading-tight" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className="truncate text-[9.5px] font-medium" style={{ color: tintText(C) }}>
                  {tt("Claude bitirdi · Nook · 4 dk")}
                </p>
                <p className="truncate text-[8px] text-white/55">{tt("Derleme tamam, kurulum dosyası hazır.")}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      {/* İmleç "İzin ver"e gider */}
      <motion.span
        className="absolute text-white"
        initial={false}
        animate={phase >= 2 && phase <= 3 ? { left: "71%", top: 66, opacity: 1 } : { left: "60%", top: 130, opacity: phase === 1 ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        <MousePointer2 size={13} fill="white" />
      </motion.span>
    </Stage>
  );
}

/** Plan limiti: 5 saatlik ve haftalık çubuk dolar, %80'de ada bir kez uyarır */
function ClaudePlanDemo() {
  const n = useTick(160);
  const t = n % 60;
  const five = Math.min(92, 18 + t * 1.4);
  const week = Math.min(70, 41 + t * 0.45);
  const color = (p: number) => (p < 50 ? ACCENT.green : p < 80 ? ACCENT.orange : ACCENT.red);
  const warn = five >= 80;
  return (
    <Stage>
      <div className="absolute inset-x-3 bottom-2 top-9 rounded-[10px] border border-white/[0.07]" />
      <div className="absolute left-1/2 top-9 -translate-x-1/2">
        <motion.div
          className="flex items-center gap-2 overflow-hidden bg-black px-3"
          animate={{ width: warn ? 214 : 84, height: warn ? 38 : 24 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          style={{ borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}
        >
          {warn && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0 leading-tight">
              <p className="truncate text-[9.5px] font-medium" style={{ color: tintText("#D97757") }}>
                {tt("Claude 5 saatlik limitin %{0}", 80)}
              </p>
              <p className="truncate text-[8px] text-white/55">{tt("Sıfırlanma: {0}", tt("1 sa 12 dk sonra"))}</p>
            </motion.div>
          )}
        </motion.div>
      </div>
      <div className="absolute inset-x-6 bottom-3 grid grid-cols-2 gap-2">
        {[
          { label: tt("5 saat"), p: five, reset: tt("{0} sa {1} dk", 1, 12) },
          { label: tt("Hafta"), p: week, reset: "Paz 09:44" },
        ].map((g) => (
          <div key={g.label} className="rounded-[10px] border px-2 py-1" style={{ background: tintBg(color(g.p), 8), borderColor: tintBg(color(g.p), 24) }}>
            <div className="flex items-baseline justify-between">
              <span className="text-[9px] text-white/60">{g.label}</span>
              <span className="text-[13px] font-medium tabular-nums" style={{ color: tintText(color(g.p)) }}>
                %{Math.round(g.p)}
              </span>
            </div>
            <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${g.p}%`, background: color(g.p), boxShadow: `0 0 6px ${color(g.p)}` }} />
            </div>
            <p className="mt-0.5 truncate text-[8px] text-white/40">{tt("Sıfırlanma {0}", g.reset)}</p>
          </div>
        ))}
      </div>
    </Stage>
  );
}

export const DEMOS2 = {
  claudeask: ClaudeAskDemo,
  claudeplan: ClaudePlanDemo,
  watchtime: WatchTimeDemo,
  report: ReportDemo,
  scenepick: ScenePickDemo,
  lively: LivelyDemo,
  newwear: NewWearDemo,
  clipboard: ClipDemo,
  pads: PadsDemo,
  shake: ShakeDemo,
  route: RouteDemo,
  calsync: CalendarDemo,
  system: SystemDemo,
  soundside: SoundSideDemo,
  profiles: ProfilesDemo,
  lyrics: LyricsDemo,
  live: LiveDemo,
  year: YearDemo,
  shieldmic: ShieldMicDemo,
  teamsmic: TeamsMicDemo,
} as const;

