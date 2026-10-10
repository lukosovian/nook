/**
 * 0.2.50 yama notlarının görselleri: tepsi menüsü, bir saat sessizlik, tek yerde kısayollar ve
 * çakışma uyarısı, parolayı Windows Hello ile açma, çeviri izni, anlaşılır hata mesajları, tanıtımda
 * klavye, Pro kotası dolunca Flash'a geçiş ve küçük düzeltmeler; 0.2.51'de tepsiden "Adayı aç" ve
 * izlerken Hum (dizinin/filmin müzikleri dakikasıyla Argus'a).
 * Hepsi kendi kendine döner.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  Bell,
  BellOff,
  Check,
  Copy,
  Fingerprint,
  Headphones,
  Languages,
  Lock,
  MessageCircle,
  Moon,
  MousePointer2,
  Music2,
  TriangleAlert,
  WifiOff,
  Zap,
} from "lucide-react";
import { normalizeColor, normalizeLook } from "../../lib/look";
import { useNook } from "../../store/nook";
import { NookFigure } from "../mascot/Figure";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

function useTick(ms: number) {
  const [n, setN] = useState(0);
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

const Stage = ({ children, bg = "radial-gradient(120% 100% at 50% 0%, #1d2230 0%, #0e1016 75%)" }: { children: React.ReactNode; bg?: string }) => (
  <div className="relative h-full w-full overflow-hidden rounded-[14px]" style={{ background: bg }}>
    {children}
  </div>
);

const Kbd = ({ k, on, color = ACCENT.blue }: { k: React.ReactNode; on?: boolean; color?: string }) => (
  <motion.span
    className="flex h-6 min-w-6 items-center justify-center rounded-[7px] border px-1.5 text-[10px] font-medium"
    animate={{
      y: on ? 2 : 0,
      background: on ? tintBg(color, 30) : "rgb(255 255 255 / 0.06)",
      borderColor: on ? tintBg(color, 60) : "rgb(255 255 255 / 0.12)",
      color: on ? tintText(color) : "rgb(255 255 255 / 0.7)",
      boxShadow: on ? "0 0 0 rgb(0 0 0 / 0.6)" : "0 2px 0 rgb(0 0 0 / 0.6)",
    }}
    transition={{ duration: 0.12 }}
  >
    {k}
  </motion.span>
);

// ---------------------------------------------------------------- Tepsi menüsü

/** Görev çubuğunun sağındaki Nook simgesi: sol tık adayı açar, sağ tıkta kısa menü */
function TrayDemo() {
  const face = useFace();
  const n = useTick(900);
  const p = n % 10; // 0-1 imleç gider · 2-4 sol tık: ada açık · 5 kapanır · 6-9 sağ tık: menü
  const islandOpen = p >= 2 && p <= 4;
  const menu = p >= 6;
  const hover = menu ? Math.min(p - 6, 2) + 1 : -1; // menüde gezinen satır
  const items = [tt("Adayı aç"), tt("Adayı ortala"), tt("Nook nedir?"), tt("1 saat sessiz"), tt("Güncellemeleri denetle"), tt("Nook'tan çık")];
  return (
    <Stage>
      {/* Ada */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <motion.div
          className="flex items-center gap-2 overflow-hidden rounded-b-[18px] bg-black px-2"
          animate={{ width: islandOpen ? 230 : 96, height: islandOpen ? 64 : 26 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        >
          <NookFigure look={face.look} color={face.color} size={islandOpen ? 34 : 18} expression={islandOpen ? "happy" : "idle"} />
          <AnimatePresence>
            {islandOpen && (
              <motion.div className="flex flex-col gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="h-1.5 w-28 rounded-full bg-white/15" />
                <span className="h-1.5 w-20 rounded-full bg-white/10" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      {/* Görev çubuğu */}
      <div className="absolute inset-x-0 bottom-0 flex h-8 items-center justify-end gap-2 border-t border-white/[0.06] bg-[#1b1d24]/95 pr-14">
        <span className="h-3 w-3 rounded-[3px] bg-white/15" />
        <span className="h-3 w-3 rounded-[3px] bg-white/15" />
        <motion.span
          className="flex h-6 w-6 items-center justify-center rounded-[6px]"
          animate={{ background: p >= 1 ? "rgb(255 255 255 / 0.12)" : "rgb(255 255 255 / 0)" }}
        >
          <NookFigure look={face.look} color={face.color} size={14} />
        </motion.span>
        <span className="text-[9px] tabular-nums text-white/60">19:24</span>
      </div>
      {/* Menü */}
      <AnimatePresence>
        {menu && (
          <motion.div
            className="absolute bottom-9 right-14 w-[150px] rounded-[10px] border border-white/[0.1] bg-[#2a2c33] p-1 shadow-xl"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16 }}
          >
            {items.map((t, i) => (
              <div key={t} className="rounded-[6px] px-2 py-[3px] text-[9.5px]" style={{ background: i === hover ? "rgb(255 255 255 / 0.1)" : undefined, color: i === hover ? "white" : "rgb(255 255 255 / 0.75)" }}>
                {t}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {/* İmleç ve tık etiketi */}
      <motion.span
        className="absolute text-white drop-shadow"
        animate={menu ? { right: 40, bottom: 52 + (5 - hover) * 17 } : { right: p >= 1 ? 62 : 120, bottom: p >= 1 ? 6 : 50 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
      >
        <MousePointer2 size={13} fill="white" />
      </motion.span>
      <AnimatePresence mode="wait">
        {(p === 2 || p === 6) && (
          <motion.span
            key={p}
            className="absolute bottom-10 left-4 rounded-full px-2 py-[2px] text-[9px] font-medium"
            style={{ background: tintBg(ACCENT.blue, 18), color: tintText(ACCENT.blue) }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {p === 2 ? tt("Sol tık: adayı açar") : tt("Sağ tık: kısa menü")}
          </motion.span>
        )}
      </AnimatePresence>
    </Stage>
  );
}

// ---------------------------------------------------------------- Bir saat sessiz

/** Sessizken kartlar adaya ulaşmadan söner; alarm yine gelir */
function QuietDemo() {
  const face = useFace();
  const n = useTick(1000);
  const p = n % 6; // 0-3 kartlar söner · 4-5 alarm gelir
  const alarm = p >= 4;
  const mins = 59 - (n % 60);
  return (
    <Stage bg="radial-gradient(120% 100% at 50% 0%, #1b1a2e 0%, #0d0d16 75%)">
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <motion.div
          className="flex items-center gap-1.5 rounded-b-[16px] bg-black px-2"
          animate={{ width: alarm ? 168 : 112, height: alarm ? 34 : 26 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        >
          <NookFigure look={face.look} color={face.color} size={18} expression={alarm ? "surprised" : "sleepy"} />
          {alarm ? (
            <span className="flex items-center gap-1 text-[9.5px] font-medium" style={{ color: tintText(ACCENT.yellow) }}>
              <AlarmClock size={11} /> {tt("Alarm · 08:00")}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[9px] tabular-nums" style={{ color: tintText(ACCENT.purple) }}>
              <Moon size={10} /> {tt("{0} dk", mins)}
            </span>
          )}
        </motion.div>
      </div>
      {/* Gelip sönen kartlar */}
      {!alarm &&
        [0, 1].map((i) => (
          <motion.span
            key={`${n}-${i}`}
            className="absolute flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.06] px-2 py-[3px] text-[9px] text-white/70"
            style={{ left: i ? "58%" : "18%" }}
            initial={{ top: 110, opacity: 0 }}
            animate={{ top: 46, opacity: [0, 1, 0.9, 0] }}
            transition={{ duration: 0.95, delay: i * 0.25, ease: "easeOut" }}
          >
            {i ? <MessageCircle size={10} /> : <Bell size={10} />}
            {i ? "Discord" : tt("Göz molası")}
          </motion.span>
        ))}
      <div className="absolute inset-x-0 bottom-2.5 flex justify-center">
        <span className="flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[9.5px] font-medium" style={{ background: tintBg(ACCENT.purple, 16), color: tintText(ACCENT.purple) }}>
          <BellOff size={10} /> {alarm ? tt("Alarmlar ve takvim yine çalar") : tt("1 saat sessiz")}
        </span>
      </div>
    </Stage>
  );
}

// ---------------------------------------------------------------- Kısayollar tek yerde

/** Ayarlar › Kısayollar: çakışan kısayol turuncu uyarır; yeni tuşlara basınca uyarı kalkar */
function ShortcutsDemo() {
  const n = useTick(1100);
  const p = n % 6; // 0-2 uyarı · 3 kaydediyor · 4-5 değişti
  const changed = p >= 4;
  const rows = [
    { l: tt("Hızlı arama"), k: "Ctrl + Shift + Space" },
    { l: tt("Ekrana sor"), k: "Ctrl + Shift + A" },
  ];
  return (
    <Stage bg="#16171c">
      <div className="absolute inset-x-3 top-2.5 text-[8.5px] font-medium uppercase tracking-[0.12em] text-white/40">{tt("Kısayollar")}</div>
      <div className="absolute inset-x-3 top-[30px] flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.l} className="flex items-center justify-between rounded-[8px] bg-white/[0.035] px-2 py-1">
            <span className="text-[9.5px] text-white/80">{r.l}</span>
            <span className="rounded-full bg-white/[0.07] px-1.5 text-[8.5px] text-white/60">{r.k}</span>
          </div>
        ))}
        <div className="rounded-[8px] bg-white/[0.035] px-2 py-1">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] text-white/80">{tt("Düz metin olarak yapıştır")}</span>
            <motion.span
              className="rounded-full px-1.5 text-[8.5px]"
              animate={{ background: p === 3 ? tintBg(ACCENT.teal, 25) : "rgb(255 255 255 / 0.07)", color: p === 3 ? tintText(ACCENT.teal) : "rgb(255 255 255 / 0.6)" }}
            >
              {p === 3 ? tt("Tuşlara bas…") : changed ? "Ctrl + Shift + Alt + V" : "Ctrl + Alt + V"}
            </motion.span>
          </div>
          <AnimatePresence>
            {!changed && p !== 3 && (
              <motion.p
                className="mt-0.5 flex items-center gap-1 text-[8.5px]"
                style={{ color: tintText(ACCENT.orange) }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <TriangleAlert size={9} /> {tt("Bu tuşlarla Word ve Excel'de Özel Yapıştır çalışmaz")}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {changed && (
          <motion.span
            className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-[2px] text-[9px] font-medium"
            style={{ background: tintBg(ACCENT.green, 16), color: tintText(ACCENT.green) }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Check size={10} /> {tt("Çakışma yok")}
          </motion.span>
        )}
      </AnimatePresence>
    </Stage>
  );
}

// ---------------------------------------------------------------- Windows Hello

/** Kilitli kalkan: yanlış parola → "unuttun mu?" → parmak izi → kalkan kalkar */
function HelloDemo() {
  const face = useFace();
  const n = useTick(1000);
  const p = n % 7; // 0-1 yanlış · 2 bağlantı · 3-4 Windows Hello · 5-6 açıldı
  const open = p >= 5;
  return (
    <Stage bg={open ? "linear-gradient(180deg, #23324a 0%, #151c29 100%)" : "radial-gradient(100% 90% at 50% 30%, #241c3a 0%, #0c0a14 80%)"}>
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div key="open" className="absolute inset-0 flex flex-col items-center justify-center gap-1.5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <NookFigure look={face.look} color={face.color} size={34} expression="happy" />
            <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: tintText(ACCENT.green) }}>
              <Check size={11} /> {tt("Windows ile açıldı")}
            </span>
            <span className="text-[8.5px] text-white/50">{tt("Yeni parola: Ayarlar › Parola kilidi")}</span>
          </motion.div>
        ) : p >= 3 ? (
          <motion.div key="hello" className="absolute inset-0 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex w-[180px] flex-col items-center gap-1.5 rounded-[10px] border border-white/[0.12] bg-[#202227] px-3 py-2.5">
              <span className="text-[9px] text-white/60">{tt("Windows Güvenliği")}</span>
              <motion.span animate={{ scale: [1, 1.12, 1], color: p === 4 ? tintText(ACCENT.green) : tintText(ACCENT.blue) }} transition={{ duration: 0.8, repeat: Infinity }}>
                <Fingerprint size={26} />
              </motion.span>
              <span className="text-center text-[8.5px] leading-tight text-white/70">{tt("Nook parolanı unuttun: Windows ile doğrula")}</span>
            </div>
          </motion.div>
        ) : (
          <motion.div key="pw" className="absolute inset-0 flex flex-col items-center justify-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NookFigure look={face.look} color={face.color} size={26} expression="sleepy" />
            <motion.div
              className="flex h-7 w-[170px] items-center gap-1.5 rounded-full border px-2.5"
              style={{ background: "rgba(10,12,24,0.5)", borderColor: "rgba(255,90,90,0.55)" }}
              animate={p === 0 ? { x: [0, -8, 7, -5, 3, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Lock size={10} className="text-[#ff6b6b]" />
              <span className="text-[9.5px] text-[#ff8a8a]">{tt("Yanlış parola")}</span>
            </motion.div>
            <motion.span className="text-[9px] text-white/60 underline underline-offset-2" animate={{ opacity: p >= 1 ? 1 : 0, color: p === 2 ? "#fff" : "rgb(255 255 255 / 0.6)" }}>
              {tt("Parolanı mı unuttun? Windows ile aç")}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </Stage>
  );
}

// ---------------------------------------------------------------- Çeviri izni

/** Gemini anahtarı yokken yabancı metin: Pano'da "Çevireyim mi?" — izin verilmeden dışarı gitmez */
function TranslateAskDemo() {
  const n = useTick(1100);
  const p = n % 6; // 0-1 soru · 2 tıklandı · 3-5 çeviri
  const done = p >= 3;
  return (
    <Stage bg="#16171c">
      <div className="absolute inset-x-3 top-[30px] overflow-hidden rounded-[10px] bg-white/[0.045]">
        <div className="flex h-8 items-center px-2.5 text-[10.5px] text-white/90">Thanks a lot, see you tomorrow!</div>
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="tr" className="flex h-7 items-center gap-1.5 border-t border-white/[0.06] px-2.5" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Languages size={10} style={{ color: ACCENT.purple }} />
              <span className="text-[10px]" style={{ color: tintText(ACCENT.purple) }}>
                {tt("Çok teşekkürler, yarın görüşürüz!")}
              </span>
            </motion.div>
          ) : (
            <motion.div key="ask" className="flex h-7 items-center gap-1 border-t border-white/[0.06] pl-2.5 pr-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Languages size={10} style={{ color: ACCENT.purple }} />
              <span className="min-w-0 flex-1 truncate text-[9px] text-white/50">{p === 2 ? tt("Çeviriyorum…") : tt("Çevireyim mi? (MyMemory)")}</span>
              <motion.span className="rounded-full px-1.5 py-[1px] text-[9px] font-medium" animate={{ background: p === 2 ? tintBg(ACCENT.purple, 30) : "rgb(255 255 255 / 0.06)" }} style={{ color: tintText(ACCENT.purple) }}>
                {tt("Çevir")}
              </motion.span>
              <span className="rounded-full px-1.5 py-[1px] text-[9px] text-white/60">{tt("Hayır")}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="absolute inset-x-3 bottom-2.5 text-center text-[8.5px] leading-snug text-white/45">{tt("Anahtar yoksa metin sen izin vermeden dışarı gitmez")}</p>
    </Stage>
  );
}

// ---------------------------------------------------------------- Anlaşılır hatalar

/** Ham İngilizce hatalar yerine ne yapacağını söyleyen kartlar */
function ErrorsDemo() {
  const face = useFace();
  const n = useTick(1700);
  const cards = [
    { icon: WifiOff, c: ACCENT.red, t: tt("İnternete bağlanamadım"), d: "Gemini", old: "TypeError: Failed to fetch" },
    { icon: Headphones, c: ACCENT.pink, t: tt("Sesi dinleyemiyorum"), d: tt("Hoparlör ya da kulaklık bağlı mı?"), old: "dahili ses açılamadı: 0x88890004" },
    { icon: Bell, c: ACCENT.blue, t: tt("Bildirimleri okuyamıyorum"), d: tt("Windows'un bildirim kaydına ulaşamadım"), old: tt("Bildirim yok") },
  ];
  const c = cards[n % cards.length];
  return (
    <Stage>
      <AnimatePresence mode="wait">
        <motion.div key={n % cards.length} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {c.old && (
            <motion.span
              className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-[6px] bg-white/[0.05] px-2 py-[2px] font-mono text-[8.5px] text-white/40 line-through"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 0.4 }}
            >
              {c.old}
            </motion.span>
          )}
          <div className="absolute inset-x-3 top-[34px] flex items-center gap-2 rounded-[14px] bg-black px-2.5 py-2">
            <NookFigure look={face.look} color={face.color} size={24} expression="sulk" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[10.5px] font-medium" style={{ color: tintText(c.c) }}>
                <c.icon size={10} /> {c.t}
              </p>
              <p className="truncate text-[9px] text-white/55">{c.d}</p>
            </div>
            {c.icon === Headphones && (
              <span className="shrink-0 rounded-full border px-1.5 py-[1px] text-[8.5px] font-medium" style={{ borderColor: tintBg(ACCENT.pink, 40), color: tintText(ACCENT.pink) }}>
                <Music2 size={8} className="mr-0.5 inline" />
                {tt("Tekrar dene")}
              </span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </Stage>
  );
}

// ---------------------------------------------------------------- Tanıtımda klavye

/** Tanıtımda ← → ile gezinme, Esc ile kapatma; kısayollar senin ayarından */
function TourKeysDemo() {
  const n = useTick(800);
  const p = n % 8; // 0-4 sağ ok · 5 sol ok · 6 Esc · 7 kapandı
  const step = p <= 4 ? p : p === 5 ? 3 : 3;
  const key = p <= 4 ? "right" : p === 5 ? "left" : p === 6 ? "esc" : null;
  return (
    <Stage bg="#0f1015">
      <motion.div className="absolute inset-x-3 top-[30px] bottom-11 rounded-[12px] border border-white/[0.08] bg-black" animate={{ opacity: p === 7 ? 0.15 : 1, scale: p === 7 ? 0.92 : 1 }}>
        <div className="flex items-center justify-between px-2.5 pt-1.5">
          <span className="text-[8.5px] text-white/50">{tt("Nook nedir?")}</span>
          <span className="rounded-full border border-white/[0.12] bg-white/[0.06] px-1.5 text-[8px] text-white/70">{tt("Tanıtımı geç")} ✕</span>
        </div>
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span key={i} className="h-1 rounded-full" animate={{ width: i === step ? 14 : 4, background: i === step ? ACCENT.yellow : "rgb(255 255 255 / 0.2)" }} />
          ))}
        </div>
      </motion.div>
      <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
        <Kbd k={<ArrowLeft size={11} />} on={key === "left"} color={ACCENT.yellow} />
        <Kbd k={<ArrowRight size={11} />} on={key === "right"} color={ACCENT.yellow} />
        <Kbd k="Esc" on={key === "esc"} color={ACCENT.yellow} />
      </div>
    </Stage>
  );
}

// ---------------------------------------------------------------- Pro → Flash

/** Ücretsiz anahtarda Pro'nun kotası dolunca seçili model kalıcı olarak Flash'a geçer */
function FlashDemo() {
  const face = useFace();
  const n = useTick(1200);
  const p = n % 5; // 0 soru · 1 kota · 2-4 Flash cevapladı
  const flash = p >= 2;
  return (
    <Stage bg="#15141c">
      <div className="absolute left-3 top-2.5">
        <motion.span
          className="flex items-center gap-1 rounded-full border px-2 py-[2px] text-[9px] font-medium"
          animate={{ background: flash ? tintBg(ACCENT.yellow, 16) : tintBg(ACCENT.purple, 16), borderColor: flash ? tintBg(ACCENT.yellow, 40) : tintBg(ACCENT.purple, 40), color: flash ? tintText(ACCENT.yellow) : tintText(ACCENT.purple) }}
        >
          {flash && <Zap size={9} />}
          {flash ? "Gemini Flash" : "Gemini Pro"}
        </motion.span>
      </div>
      <div className="absolute inset-x-3 top-9 flex flex-col gap-1.5">
        <span className="ml-auto rounded-[10px] rounded-br-[3px] px-2 py-1 text-[9.5px] text-white" style={{ background: tintBg(ACCENT.blue, 55) }}>
          {tt("Yarın hava nasıl?")}
        </span>
        <AnimatePresence>
          {p >= 1 && (
            <motion.span
              className="w-fit rounded-full px-2 py-[2px] text-[8.5px]"
              style={{ background: tintBg(ACCENT.orange, 14), color: tintText(ACCENT.orange) }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {tt("Pro'nun kotası doldu; artık {0} ile konuşuyorum", "Flash")}
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {flash && (
            <motion.div className="flex items-end gap-1.5" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <NookFigure look={face.look} color={face.color} size={16} expression="happy" />
              <span className="rounded-[10px] rounded-bl-[3px] bg-white/[0.08] px-2 py-1 text-[9.5px] text-white/85">{tt("Güneşli, 22 derece!")}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Stage>
  );
}

// ---------------------------------------------------------------- Düzeltmeler

/** Küçük düzeltmeler tek tek işaretlenir */
function FixesDemo() {
  const n = useTick(700);
  const fixes = [
    tt("Hava durumunda şehir seçtiğin dilde"),
    tt("Ayarlar şeridi doğru bölümü gösterir"),
    tt("Kaldırınca Claude Code ayarları temizlenir"),
    tt("Argus başka dillerde önerilmez"),
  ];
  const done = n % (fixes.length + 3);
  return (
    <Stage bg="#14161b">
      <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
        {fixes.map((f, i) => {
          const on = i < done;
          return (
            <div key={f} className="flex items-center gap-1.5">
              <motion.span
                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border"
                animate={{ background: on ? tintBg(ACCENT.green, 40) : "rgb(255 255 255 / 0)", borderColor: on ? tintBg(ACCENT.green, 70) : "rgb(255 255 255 / 0.2)", scale: on && i === done - 1 ? [1, 1.25, 1] : 1 }}
              >
                {on && <Check size={8} strokeWidth={3.5} className="text-white" />}
              </motion.span>
              <motion.span className="truncate text-[9.5px]" animate={{ color: on ? "rgb(255 255 255 / 0.85)" : "rgb(255 255 255 / 0.4)" }}>
                {f}
              </motion.span>
            </div>
          );
        })}
      </div>
    </Stage>
  );
}

// ---------------------------------------------------------------- 0.2.51: tepsiden "Adayı aç"

/** Tepsi menüsünden "Adayı aç": imleç tepside dururken ada açılır, imleç adaya girip çıkınca kapanır */
function TrayOpenDemo() {
  const face = useFace();
  const n = useTick(850);
  const p = n % 11; // 0 imleç tepsiye · 1-2 sağ tık menü, "Adayı aç" · 3-6 ada açık, imleç tepside · 7-8 imleç adada · 9-10 çıkınca kapanır
  const menu = p === 1 || p === 2;
  const islandOpen = p >= 3 && p <= 8;
  const items = [tt("Adayı aç"), tt("Adayı ortala"), tt("Nook nedir?"), tt("1 saat sessiz")];
  const cursor = p >= 7 && p <= 8 ? { right: 150, bottom: 118 } : p >= 9 ? { right: 70, bottom: 70 } : menu ? { right: 46, bottom: 104 } : { right: 62, bottom: 6 };
  const label = p >= 3 && p <= 6 ? tt("İmleç tepside, ada açık kalır") : p >= 9 ? tt("Ada dışına çıkınca kapanır") : null;
  return (
    <Stage>
      {/* Ada */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <motion.div
          className="flex items-center gap-2 overflow-hidden rounded-b-[18px] bg-black px-2"
          animate={{ width: islandOpen ? 230 : 96, height: islandOpen ? 70 : 26 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        >
          <NookFigure look={face.look} color={face.color} size={islandOpen ? 34 : 18} expression={islandOpen ? "happy" : "idle"} />
          <AnimatePresence>
            {islandOpen && (
              <motion.div className="grid grid-cols-3 gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {[ACCENT.blue, ACCENT.green, ACCENT.orange, ACCENT.purple, ACCENT.red, ACCENT.yellow].map((c) => (
                  <span key={c} className="h-4 w-11 rounded-[6px]" style={{ background: tintBg(c, 22) }} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      {/* Görev çubuğu */}
      <div className="absolute inset-x-0 bottom-0 flex h-8 items-center justify-end gap-2 border-t border-white/[0.06] bg-[#1b1d24]/95 pr-14">
        <span className="h-3 w-3 rounded-[3px] bg-white/15" />
        <motion.span className="flex h-6 w-6 items-center justify-center rounded-[6px]" animate={{ background: p <= 6 ? "rgb(255 255 255 / 0.12)" : "rgb(255 255 255 / 0)" }}>
          <NookFigure look={face.look} color={face.color} size={14} />
        </motion.span>
        <span className="text-[9px] tabular-nums text-white/60">19:24</span>
      </div>
      {/* Menü */}
      <AnimatePresence>
        {menu && (
          <motion.div
            className="absolute bottom-9 right-14 w-[130px] rounded-[10px] border border-white/[0.1] bg-[#2a2c33] p-1 shadow-xl"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16 }}
          >
            {items.map((t, i) => (
              <motion.div
                key={t}
                className="rounded-[6px] px-2 py-[3px] text-[9.5px]"
                animate={{ background: i === 0 && p === 2 ? tintBg(ACCENT.blue, 30) : "rgb(255 255 255 / 0)", color: i === 0 ? "white" : "rgb(255 255 255 / 0.7)" }}
              >
                {t}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {/* İmleç */}
      <motion.span className="absolute text-white drop-shadow" animate={cursor} transition={{ type: "spring", stiffness: 180, damping: 24 }}>
        <MousePointer2 size={13} fill="white" />
      </motion.span>
      <AnimatePresence mode="wait">
        {label && (
          <motion.span
            key={label}
            className="absolute bottom-10 left-4 rounded-full px-2 py-[2px] text-[9px] font-medium"
            style={{ background: tintBg(p >= 9 ? ACCENT.orange : ACCENT.green, 18), color: tintText(p >= 9 ? ACCENT.orange : ACCENT.green) }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Stage>
  );
}

/** İzlerken Hum: dizi oynarken Nook dinler, şarkıyı bulur, dakikasıyla Argus'taki Müzikler'e yazar */
const WATCH_SONGS = [
  { at: "5:12", min: 5, title: "Running Up That Hill", artist: "Kate Bush", hue: 0 },
  { at: "18:40", min: 18, title: "Africa", artist: "Toto", hue: 110 },
  { at: "31:14", min: 31, title: "Heroes", artist: "Peter Gabriel", hue: 220 },
];
const WATCH_COVER = "linear-gradient(135deg, #ff4fa3 0%, #9b7bff 55%, #3fd8ff 100%)";

function HumWatchDemo() {
  const face = useFace();
  const n = useTick(120);
  const min = (n % 340) / 8.5; // 0–40 dk
  const found = WATCH_SONGS.filter((x) => min >= x.min + 2);
  // Şarkının çaldığı ilk iki dakika: Nook dinliyor
  const listening = WATCH_SONGS.some((x) => min >= x.min && min < x.min + 2);
  const fresh = WATCH_SONGS.find((x) => min >= x.min + 2 && min < x.min + 5);
  const bars = Array.from({ length: 5 }, (_, i) => (listening ? 0.3 + 0.7 * Math.abs(Math.sin(n * 0.8 + i * 1.4)) : 0.15));
  const mm = Math.floor(min);
  const ss = String(Math.floor((min - mm) * 60)).padStart(2, "0");
  return (
    <Stage bg="radial-gradient(120% 100% at 50% 0%, #1a2233 0%, #0c0f15 75%)">
      {/* Sol: oynayan bölüm */}
      <div className="absolute inset-x-3 top-3 h-[42%] overflow-hidden rounded-[10px] bg-black">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #3a2a55 0%, #1c3550 55%, #12222f 100%)", opacity: 0.8 }} />
        <span className="absolute left-2 top-1.5 text-[8.5px] text-white/70">Lanterns · S1 B2</span>
        <div className="absolute left-1/2 top-[42%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-black/70 py-1 pl-1 pr-2.5">
          <NookFigure look={face.look} color={face.color} size={20} expression={fresh ? "happy" : "idle"} />
          <span className="flex h-3.5 items-end gap-[2px]">
            {bars.map((b, i) => (
              <span key={i} className="w-[3px] rounded-full" style={{ height: `${b * 100}%`, background: listening ? "#9b7bff" : "rgba(255,255,255,0.3)" }} />
            ))}
          </span>
          <span className="text-[8.5px] font-medium" style={{ color: tintText(ACCENT.purple) }}>
            {listening ? tt("Dinliyor") : fresh ? tt("Buldum!") : "Hum"}
          </span>
        </div>
        <div className="absolute inset-x-2 bottom-1.5 flex items-center gap-1.5 text-[7.5px] tabular-nums text-white/70">
          <span>
            {mm}:{ss}
          </span>
          <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-white/80" style={{ width: `${(min / 40) * 100}%` }} />
            {WATCH_SONGS.map((x) => (
              <span key={x.at} className="absolute top-0 h-full w-[3px] rounded-full" style={{ left: `${(x.min / 40) * 100}%`, background: min >= x.min + 2 ? "#9b7bff" : "transparent" }} />
            ))}
          </div>
          <span>40:00</span>
        </div>
      </div>
      {/* Sağ: Argus'taki detay penceresi, Müzikler */}
      <div className="absolute inset-x-3 bottom-3 top-[calc(42%+18px)] rounded-[10px] border border-white/[0.06] bg-[#141414] px-2.5 py-1.5">
        <div className="mb-0.5 flex items-baseline gap-1.5">
          <span className="text-[10.5px] font-semibold text-white">{tt("Müzikler")}</span>
          <span className="text-[7.5px] text-white/40">Argus · Lanterns</span>
        </div>
        <p className="mb-0.5 text-[6.5px] font-semibold uppercase tracking-wide text-white/40">{tt("1. Sezon 2. Bölüm")}</p>
        <div className="flex flex-col">
          <AnimatePresence initial={false}>
            {found.map((x) => (
              <motion.div
                key={x.at}
                className="flex items-center gap-1.5 rounded-[6px] px-1 py-[2px]"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0, background: x === fresh ? "rgba(63,169,255,0.12)" : "rgba(255,255,255,0)" }}
                exit={{ opacity: 0 }}
              >
                <span className="w-7 shrink-0 text-right text-[8px] font-semibold tabular-nums" style={{ color: "#3fa9ff" }}>
                  {x.at}
                </span>
                <span className="h-4 w-4 shrink-0 rounded-[4px]" style={{ background: WATCH_COVER, filter: `hue-rotate(${x.hue}deg)` }} />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[8px] font-medium text-white">{x.title}</span>
                  <span className="block truncate text-[7px] text-white/45">{x.artist}</span>
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {!found.length && <span className="pt-2 text-center text-[7.5px] text-white/30">{tt("İzlerken burası dolar")}</span>}
        </div>
      </div>
    </Stage>
  );
}

/** Hum geçmişinde kopyala: satır yeşil parlar, "Kopyalandı" çıkar, simge tike döner */
function HumCopyDemo() {
  const n = useTick(500);
  const phase = n % 8; // 0-1 imleç gidiyor · 2 tık · 2-5 kopyalandı · 6-7 normal
  const copied = phase >= 2 && phase <= 5;
  const G = ACCENT.green;
  return (
    <Stage>
      <div className="absolute inset-x-4 top-3 flex flex-col gap-1">
        {[
          { t: "Running Up That Hill", a: "Kate Bush", hue: 0, me: true },
          { t: "Africa", a: "Toto", hue: 110, me: false },
          { t: "Heroes", a: "Peter Gabriel", hue: 220, me: false },
        ].map((r) => (
          <div key={r.t} className="relative flex h-9 items-center gap-2 overflow-hidden rounded-[12px] bg-white/[0.04] pl-1 pr-1.5">
            <AnimatePresence>
              {r.me && copied && (
                <motion.span
                  className="absolute inset-0 rounded-[12px]"
                  style={{ background: tintBg(G, 14), boxShadow: `inset 0 0 0 1px ${tintBg(G, 40)}` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </AnimatePresence>
            <span className="relative h-7 w-7 shrink-0 rounded-[8px]" style={{ background: WATCH_COVER, filter: `hue-rotate(${r.hue}deg)` }} />
            <span className="relative min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[10.5px] font-medium text-label">{r.t}</span>
              <span className="block truncate text-[9px] text-label-3">{r.a}</span>
            </span>
            {r.me && (
              <span className="relative flex items-center gap-1">
                <AnimatePresence>
                  {copied && (
                    <motion.span
                      className="rounded-full px-1.5 py-[1px] text-[8.5px] font-medium"
                      style={{ background: tintBg(G, 18), color: tintText(G) }}
                      initial={{ opacity: 0, x: 6, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {tt("Kopyalandı")}
                    </motion.span>
                  )}
                </AnimatePresence>
                <motion.span
                  key={copied ? "ok" : "c"}
                  className="flex h-5 w-5 items-center justify-center rounded-full"
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  style={{ color: copied ? tintText(G) : "var(--color-label-3)", background: phase === 2 ? "rgba(255,255,255,0.1)" : "transparent" }}
                >
                  {copied ? <Check size={11} strokeWidth={3} /> : <Copy size={10} strokeWidth={2.4} />}
                </motion.span>
              </span>
            )}
          </div>
        ))}
      </div>
      <motion.span
        className="absolute text-white"
        initial={false}
        animate={phase <= 1 ? { right: 60, top: 64, opacity: 0.8 } : { right: 22, top: 26, opacity: phase >= 6 ? 0 : 1 }}
        transition={{ duration: 0.4 }}
      >
        <MousePointer2 size={13} fill="white" />
      </motion.span>
    </Stage>
  );
}

/** Bildirimler çipinde Windows / Nook sekmeleri: Nook'un kendi kartlarının geçmişi */
function NookNotifsDemo() {
  const face = useFace();
  const n = useTick(1300);
  const nook = n % 4 >= 1;
  const P = ACCENT.purple;
  const rows = nook
    ? [
        { c: ACCENT.orange, t: tt("Bölüm işaretlendi"), d: "Lanterns S1B8", a: tt("2 dk") },
        { c: "#9b7bff", t: "Africa · Toto", d: tt("Lanterns S1B2 · 18:40 · Argus'a eklendi"), a: tt("14 dk") },
        { c: ACCENT.teal, t: tt("USB takıldı"), d: "SanDisk 64 GB", a: tt("1 sa") },
      ]
    : [
        { c: "#5865f2", t: "Discord", d: tt("Ayşe: akşam geliyor musun?"), a: tt("5 dk") },
        { c: "#25d366", t: "WhatsApp", d: tt("Annem: yemek hazır"), a: tt("20 dk") },
      ];
  return (
    <Stage>
      <div className="absolute inset-x-4 top-3 flex items-center gap-1 rounded-full bg-white/[0.05] p-[3px] text-[9.5px] font-medium">
        {["Windows", "Nook · 3"].map((l, i) => (
          <span key={l} className="relative flex-1 rounded-full py-1 text-center" style={{ color: (i === 1) === nook ? tintText(P) : "var(--color-label-3)" }}>
            {(i === 1) === nook && <motion.span layoutId="nn-tab" className="absolute inset-0 rounded-full" style={{ background: tintBg(P, 20) }} />}
            <span className="relative">{l}</span>
          </span>
        ))}
      </div>
      <div className="absolute inset-x-4 top-[34px] flex flex-col gap-[3px]">
        <AnimatePresence mode="popLayout" initial={false}>
          {rows.map((r, i) => (
            <motion.div
              key={`${nook}-${r.t}`}
              className="flex items-center gap-2 rounded-[10px] bg-white/[0.04] px-2 py-[3px]"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.08 } }}
              exit={{ opacity: 0 }}
            >
              {nook ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: tintBg(r.c, 30) }}>
                  <NookFigure look={face.look} color={face.color} size={14} />
                </span>
              ) : (
                <span className="h-5 w-5 shrink-0 rounded-[5px]" style={{ background: r.c }} />
              )}
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[9.5px] font-medium" style={{ color: nook ? tintText(r.c) : "var(--color-label)" }}>
                  {r.t}
                </span>
                <span className="block truncate text-[8.5px] text-label-3">{r.d}</span>
              </span>
              <span className="text-[8px] tabular-nums text-label-3">{r.a}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Stage>
  );
}

/** Tünekten / balıktan dönünce ada siyah kalır (eskiden arkası beyaza dönüyordu) */
function WhiteBgDemo() {
  const face = useFace();
  const n = useTick(700);
  const phase = n % 8; // 0-2 tünekte · 3+ adada
  const away = phase <= 2;
  return (
    <Stage bg="linear-gradient(160deg, #2b3a55 0%, #1a2233 60%, #12161f 100%)">
      {/* Ada */}
      <div className="absolute left-1/2 top-0 h-7 w-[120px] -translate-x-1/2 rounded-b-[14px] bg-black" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.05)" }}>
        <AnimatePresence>
          {!away && (
            <motion.span className="absolute left-2 top-[3px]" initial={{ y: 18, scale: 0.6, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
              <NookFigure look={face.look} color={face.color} size={20} expression="happy" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {/* Pencere ve tünekteki Nook */}
      <div className="absolute inset-x-6 bottom-4 top-[70px] rounded-[8px] border border-white/10 bg-white/[0.05]">
        <div className="h-4 rounded-t-[8px] bg-white/10" />
        <AnimatePresence>
          {away && (
            <motion.span className="absolute -top-[18px] left-[40%]" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, scale: 0.6, opacity: 0 }}>
              <NookFigure look={face.look} color={face.color} size={20} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {!away && (
        <motion.span
          className="absolute left-1/2 top-9 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] font-medium"
          style={{ background: tintBg(ACCENT.green, 16), color: tintText(ACCENT.green) }}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Check size={9} strokeWidth={3} />
          {tt("Ada siyah kaldı")}
        </motion.span>
      )}
    </Stage>
  );
}

/** Ada kenara taşınınca Argus ve ses kartları ekrandan taşmaz, birbirinin altında kalmaz */
function CardSidesDemo() {
  const n = useTick(1500);
  const pos = n % 3; // 0 sol · 1 orta · 2 sağ
  // Ekran 0..100 (%); ada 22, Argus kartı 22, ses kartı 18 genişliğinde
  const islandL = [2, 39, 76][pos];
  const A = 22;
  const S = 18;
  const G = 1.5;
  const argusX = pos === 2 ? islandL - G - A : islandL + 22 + G;
  const soundX = pos === 0 ? argusX + A + G : pos === 1 ? islandL - G - S : argusX - G - S;
  const box = (x: number, w: number, color: string, label: string) => (
    <motion.div
      className="absolute top-[24px] flex h-[44px] items-start justify-center rounded-[8px] pt-1.5 text-[8px] font-semibold"
      style={{ width: `${w}%`, background: tintBg(color, 22), border: `1px solid ${tintBg(color, 50)}`, color: tintText(color) }}
      animate={{ left: `${x}%` }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      {label}
    </motion.div>
  );
  return (
    <Stage>
      <div className="absolute inset-x-3 bottom-3 top-3 overflow-hidden rounded-[10px] border border-white/[0.08] bg-white/[0.02]">
        <motion.div
          className="absolute top-[20px] h-[48px] rounded-[10px] bg-black"
          style={{ width: "22%", boxShadow: "0 0 0 1px rgba(255,255,255,0.08)" }}
          animate={{ left: `${islandL}%` }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        />
        {box(argusX, A, ACCENT.orange, "Argus")}
        {box(soundX, S, ACCENT.teal, tt("Ses"))}
        <span className="absolute bottom-2 left-0 right-0 text-center text-[8.5px] text-label-3">
          {[tt("Ada solda: ses kartı Argus'un yanında"), tt("Ada ortada"), tt("Ada sağda: kartlar sola geçer")][pos]}
        </span>
      </div>
    </Stage>
  );
}

export const DEMOS5 = {
  humcopy: HumCopyDemo,
  nooknotifs: NookNotifsDemo,
  whitebg: WhiteBgDemo,
  cardsides: CardSidesDemo,
  humwatch: HumWatchDemo,
  trayopen: TrayOpenDemo,
  tray: TrayDemo,
  quiet: QuietDemo,
  shortcuts: ShortcutsDemo,
  hello: HelloDemo,
  translateask: TranslateAskDemo,
  errors: ErrorsDemo,
  tourkeys: TourKeysDemo,
  flash: FlashDemo,
  fixes: FixesDemo,
} as const;
