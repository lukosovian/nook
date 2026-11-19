/**
 * İlk hafta ve düzen demoları: yeni gelenin ana sayfası, bantlı modüller, sohbette anahtar kurulumu ve
 * başlangıç kartları, kısa tanıtım, konuşkanlık seçimi, ilk hafta görevleri, Studio menüsü, tek dokunuşla
 * güncelleme, "Tuşlar" adı.
 */
import { motion } from "motion/react";
import { ArrowUpRight, Check, Download, FileText, MessageCircle, Mic, Monitor, MousePointer2, Sparkles } from "lucide-react";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

const box = (c: string, on = false): React.CSSProperties => ({ background: tintBg(c, on ? 22 : 12), border: `1px solid ${tintBg(c, on ? 60 : 30)}` });

/** Yeni gelenin ana sayfası: Bugün + Medya büyük, altında Raf, Not, Alarm, Pomodoro; çiplerde Pano, Takvim, Kontrol */
function NewHomeDemo() {
  const n = useTick(700);
  const lit = n % 9;
  const big = [
    [tt("Bugün"), ACCENT.yellow],
    [tt("Medya"), ACCENT.pink],
  ];
  const small = [
    [tt("Raf"), ACCENT.teal],
    [tt("Not"), ACCENT.orange],
    [tt("Alarm"), ACCENT.yellow],
    ["Pomodoro", ACCENT.red],
  ];
  const chips = [
    [tt("Pano"), ACCENT.purple],
    [tt("Takvim"), ACCENT.blue],
    [tt("Kontrol"), ACCENT.green],
  ];
  return (
    <Stage>
      <Fit w={240} h={96}>
        {big.map(([l, c], i) => (
          <span key={l} className="absolute flex h-[30px] w-[110px] items-center gap-[5px] rounded-[9px] px-[6px]" style={{ left: 8 + i * 114, top: 4, ...box(c, lit === i) }}>
            <MiniNook color={c} size={15} />
            <b className="text-[9.5px]" style={{ color: tintText(c) }}>{l}</b>
          </span>
        ))}
        {small.map(([l, c], i) => (
          <span key={l} className="absolute flex h-[28px] w-[53px] flex-col justify-center rounded-[8px] px-[5px]" style={{ left: 8 + i * 57, top: 38, ...box(c, lit === i + 2) }}>
            <b className="truncate text-[8px]" style={{ color: tintText(c) }}>{l}</b>
          </span>
        ))}
        {chips.map(([l, c], i) => (
          <span key={l} className="absolute flex h-[18px] items-center rounded-full px-[7px] text-[8px] font-semibold" style={{ left: 8 + i * 50, top: 72, color: tintText(c), ...box(c, lit === i + 6) }}>
            {l}
          </span>
        ))}
        <span className="absolute right-[8px] top-[75px] text-[7.5px] text-label-3">{tt("ilk hafta")}</span>
      </Fit>
    </Stage>
  );
}

/** Modüller üç bantta (Gün, İçerik, Araçlar), altta kesik çizgili Studio şeridi */
function BandsDemo() {
  const n = useTick(1100);
  const on = n % 4;
  const bands: [string, string, number, number][] = [
    [tt("Gün"), ACCENT.yellow, 2, 8],
    [tt("İçerik"), ACCENT.pink, 2, 80],
    [tt("Araçlar"), ACCENT.green, 3, 152],
  ];
  return (
    <Stage>
      <Fit w={240} h={96}>
        {bands.map(([label, c, cols, left], bi) => (
          <div key={label} className="absolute top-[3px]" style={{ left }}>
            <b className="block text-[7px] uppercase tracking-[0.08em]" style={{ color: on === bi ? tintText(c) : "var(--color-label-3)" }}>{label}</b>
            <div className="mt-[2px] grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${cols}, 25px)` }}>
              {Array.from({ length: cols * 3 }, (_, i) => (
                <motion.i key={i} className="block h-[17px] rounded-[5px]" animate={{ opacity: on === bi ? 1 : 0.5 }} style={box(c, on === bi)} />
              ))}
            </div>
          </div>
        ))}
        <motion.div className="absolute left-[8px] top-[76px] flex h-[17px] w-[224px] items-center gap-[4px] rounded-[7px] border border-dashed px-[6px]" animate={{ borderColor: on === 3 ? "rgb(255 255 255 / 0.5)" : "rgb(255 255 255 / 0.16)" }}>
          <b className="text-[7px] uppercase tracking-[0.08em] text-label-3">Studio</b>
          {[tt("Karne"), tt("Görünüm"), tt("Yıl özeti")].map((l) => (
            <span key={l} className="flex items-center gap-[1px] rounded-full bg-white/[0.07] px-[5px] text-[7.5px] font-semibold text-label-2">
              {l}
              <ArrowUpRight size={7} strokeWidth={3} />
            </span>
          ))}
        </motion.div>
      </Fit>
    </Stage>
  );
}

/** Sohbette üç adım: anahtarı al, yapıştır, dene → Bağlandı */
function ChatSetupDemo() {
  const n = useTick(1100);
  const step = n % 4; // 0 al · 1 yapıştır · 2 deneniyor · 3 bağlandı
  const steps = [tt("Anahtarı al"), tt("Buraya yapıştır"), tt("Dene")];
  return (
    <Stage>
      <Fit w={240} h={96}>
        <span className="absolute left-[8px] top-[6px] text-[8.5px] font-semibold text-label">{tt("Konuşabilmem için bir anahtar lazım")}</span>
        <span className="absolute right-[8px] top-[5px] flex rounded-full bg-white/[0.07] p-[1.5px] text-[7px] font-semibold">
          <i className="rounded-full px-[5px] not-italic" style={{ background: tintBg(ACCENT.purple, 30), color: tintText(ACCENT.purple) }}>Gemini</i>
          <i className="px-[5px] not-italic text-label-3">Claude</i>
        </span>
        {steps.map((s, i) => {
          const done = step > i || step === 3;
          const c = done ? ACCENT.green : ACCENT.purple;
          return (
            <motion.div key={s} className="absolute top-[24px] flex h-[62px] w-[71px] flex-col gap-[5px] rounded-[9px] p-[6px]" style={{ left: 8 + i * 76.5, ...box(c, Math.min(step, 2) === i) }} animate={{ y: Math.min(step, 2) === i ? -2 : 0 }}>
              <span className="flex items-center gap-[3px]">
                <i className="flex h-[11px] w-[11px] items-center justify-center rounded-full text-[7px] font-bold not-italic" style={{ background: tintBg(c, 34), color: tintText(c) }}>
                  {done ? <Check size={7} strokeWidth={4} /> : i + 1}
                </i>
                <b className="truncate text-[7.5px] text-label">{s}</b>
              </span>
              {i === 1 && <span className="h-[12px] rounded-full bg-black/40 px-[5px] font-mono text-[7px] leading-[12px] text-label-2">{step >= 1 ? "••••••••" : "AIza…"}</span>}
              {i === 2 && <b className="text-[8px]" style={{ color: step === 3 ? tintText(ACCENT.green) : "var(--color-label-3)" }}>{step === 3 ? tt("Bağlandı") : step === 2 ? tt("Deneniyor…") : tt("Bekliyorum")}</b>}
              {i === 0 && <span className="w-fit rounded-full px-[5px] text-[7px] font-semibold leading-[12px]" style={{ background: tintBg(ACCENT.blue, 22), color: tintText(ACCENT.blue) }}>aistudio ↗</span>}
            </motion.div>
          );
        })}
      </Fit>
    </Stage>
  );
}

/** Boş sohbette dört başlangıç kartı: Sor · Yaptır · Ekrana sor · Sesle */
function ChatStartDemo() {
  const n = useTick(1000);
  const on = n % 4;
  const cards = [
    { icon: MessageCircle, c: ACCENT.purple, t: tt("Sor"), s: tt("Bana bir şaka anlat") },
    { icon: Sparkles, c: ACCENT.yellow, t: tt("Yaptır"), s: tt("Yarın 8'de alarm kur") },
    { icon: Monitor, c: ACCENT.blue, t: tt("Ekrana sor"), s: "Ctrl + Shift + A" },
    { icon: Mic, c: ACCENT.pink, t: tt("Sesle"), s: "Ctrl + Shift + D" },
  ];
  return (
    <Stage>
      <Fit w={240} h={96}>
        {cards.map((k, i) => (
          <motion.div key={k.t} className="absolute flex h-[38px] w-[110px] items-center gap-[6px] rounded-[10px] px-[6px]" style={{ left: 8 + (i % 2) * 114, top: 8 + Math.floor(i / 2) * 43, ...box(k.c, on === i) }} animate={{ scale: on === i ? 1.04 : 1 }}>
            <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[7px]" style={{ background: tintBg(k.c, 26), color: tintText(k.c) }}>
              <k.icon size={11} strokeWidth={2.4} />
            </span>
            <span className="min-w-0 leading-tight">
              <b className="block text-[9px]" style={{ color: tintText(k.c) }}>{k.t}</b>
              <i className="block truncate text-[7.5px] not-italic text-label-2">{k.s}</i>
            </span>
          </motion.div>
        ))}
      </Fit>
    </Stage>
  );
}

/** Dört adımlık tanıtım: tanış · çentiğe gel (açılır) · dosya bırak · hazırız */
function TourShortDemo() {
  const n = useTick(1300);
  const step = n % 4;
  const titles = [tt("Merhaba, ben Nook"), tt("Üstüme gel, açılayım"), tt("Bir dosya bırak"), tt("Hazırız!")];
  return (
    <Stage>
      <Fit w={240} h={96}>
        <motion.div className="absolute left-1/2 top-0 flex items-center justify-center rounded-b-[10px] bg-black" style={{ x: "-50%" }} animate={{ width: step === 1 ? 150 : step === 2 ? 96 : 76, height: step === 1 ? 46 : step === 2 ? 30 : 20 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}>
          <MiniNook color="#ffffff" size={step === 0 || step === 3 ? 14 : 18} />
        </motion.div>
        {step === 1 && (
          <motion.span className="absolute" initial={{ left: 190, top: 70 }} animate={{ left: 132, top: 30 }} transition={{ duration: 0.5 }}>
            <MousePointer2 size={13} color="#fff" fill="#fff" />
          </motion.span>
        )}
        {step === 2 && (
          <motion.span className="absolute flex h-[20px] w-[16px] items-center justify-center rounded-[4px] bg-white/20" initial={{ left: 60, top: 62, opacity: 1 }} animate={{ left: 112, top: 14, opacity: 0, scale: 0.4 }} transition={{ duration: 0.9 }}>
            <FileText size={10} color="#fff" />
          </motion.span>
        )}
        <motion.b key={step} className="absolute inset-x-0 top-[56px] text-center text-[10.5px] text-label" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          {titles[step]}
        </motion.b>
        <span className="absolute inset-x-0 top-[80px] flex justify-center gap-[4px]">
          {titles.map((_, i) => (
            <motion.i key={i} className="h-[4px] rounded-full" animate={{ width: i === step ? 14 : 4, background: i === step ? ACCENT.teal : "rgb(255 255 255 / 0.2)" }} />
          ))}
        </span>
      </Fit>
    </Stage>
  );
}

/** Ne kadar konuşkan olayım? Sessiz · Dengeli · Canlı: seçime göre çıkan kart sayısı */
function ChattyDemo() {
  const n = useTick(1500);
  const level = (n + 1) % 3;
  const opts: [string, string][] = [
    [tt("Sessiz"), ACCENT.gray],
    [tt("Dengeli"), ACCENT.teal],
    [tt("Canlı"), ACCENT.pink],
  ];
  const cards = [tt("Alarm"), tt("Günün özeti"), tt("Su"), tt("Gezinti"), tt("Oyun teklifi")];
  const shown = [1, 3, 5][level];
  return (
    <Stage>
      <Fit w={240} h={96}>
        {opts.map(([l, c], i) => (
          <motion.span key={l} className="absolute top-[8px] flex h-[34px] w-[71px] items-center justify-center gap-[4px] rounded-[10px] text-[9px] font-bold" style={{ left: 8 + i * 76.5, color: tintText(c), ...box(c, level === i) }} animate={{ scale: level === i ? 1.05 : 1 }}>
            {level === i && <Check size={9} strokeWidth={3.5} />}
            {l}
          </motion.span>
        ))}
        <span className="absolute left-[8px] top-[56px] flex w-[224px] flex-wrap gap-[4px]">
          {cards.map((t, i) => (
            <motion.i key={t} className="rounded-full bg-white/[0.08] px-[6px] text-[7.5px] font-semibold not-italic leading-[14px] text-label-2" animate={{ opacity: i < shown ? 1 : 0.18, scale: i < shown ? 1 : 0.92 }}>
              {t}
            </motion.i>
          ))}
        </span>
      </Fit>
    </Stage>
  );
}

/** İlk haftan: üç küçük görev tek tek tamamlanır */
function FirstWeekDemo() {
  const n = useTick(1200);
  const done = n % 4;
  const tasks = [tt("Bana bir dosya bırak"), tt("Bir alarm kur"), tt("Beni giydir")];
  return (
    <Stage>
      <Fit w={240} h={96}>
        <span className="absolute left-[8px] top-[6px] flex h-[22px] w-[224px] items-center gap-[6px] rounded-[9px] px-[7px]" style={box(ACCENT.yellow, true)}>
          <MiniNook color={ACCENT.yellow} size={14} />
          <b className="text-[9px]" style={{ color: tintText(ACCENT.yellow) }}>{tt("İlk haftan · {0}/{1}", done, 3)}</b>
          <span className="ml-auto h-[4px] w-[70px] overflow-hidden rounded-full bg-white/10">
            <motion.i className="block h-full rounded-full" style={{ background: ACCENT.yellow }} animate={{ width: `${(done / 3) * 100}%` }} />
          </span>
        </span>
        {tasks.map((t, i) => (
          <span key={t} className="absolute left-[8px] flex h-[18px] w-[224px] items-center gap-[6px] px-[4px]" style={{ top: 34 + i * 20 }}>
            <motion.i className="flex h-[12px] w-[12px] items-center justify-center rounded-full" animate={{ background: i < done ? ACCENT.green : "rgb(255 255 255 / 0.12)" }}>
              {i < done && <Check size={8} strokeWidth={4} color="#111" />}
            </motion.i>
            <span className="text-[9px]" style={{ color: i < done ? "var(--color-label-3)" : "var(--color-label)", textDecoration: i < done ? "line-through" : undefined }}>{t}</span>
          </span>
        ))}
      </Fit>
    </Stage>
  );
}

/** Studio menüsü üç grupta; Yama notları ve Ayarlar altta sabit */
function StudioNavDemo() {
  const n = useTick(900);
  const rows: [string, string | null][] = [
    ["Nook", null],
    [tt("Ana sayfa"), ACCENT.purple],
    [tt("Görünüm"), ACCENT.pink],
    [tt("Düzen"), null],
    [tt("Modüller"), ACCENT.green],
    [tt("Tuşlar"), ACCENT.blue],
    [tt("Geçmiş"), null],
    [tt("Karne"), ACCENT.teal],
  ];
  const items = rows.filter((r) => r[1]);
  const on = items[n % items.length][0];
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[8px] top-[3px] flex h-[90px] w-[104px] flex-col gap-[1.5px] rounded-[9px] bg-white/[0.04] px-[5px] py-[3px]">
          {rows.map(([l, c]) =>
            c ? (
              <motion.span key={l} className="flex h-[10px] items-center gap-[4px] rounded-[4px] px-[3px]" animate={{ background: on === l ? tintBg(c, 26) : "rgb(255 255 255 / 0)" }}>
                <i className="h-[6px] w-[6px] rounded-[2px]" style={{ background: c }} />
                <b className="text-[6.5px] text-label">{l}</b>
              </motion.span>
            ) : (
              <b key={l} className="pl-[3px] text-[5.5px] uppercase tracking-[0.1em] text-label-3">{l}</b>
            ),
          )}
        </div>
        <div className="absolute left-[120px] top-[50px] flex w-[112px] flex-col gap-[3px] rounded-[9px] border border-dashed border-white/20 p-[5px]">
          {[[tt("Yama notları"), ACCENT.orange], [tt("Ayarlar"), ACCENT.gray]].map(([l, c]) => (
            <span key={l} className="flex h-[13px] items-center gap-[4px] rounded-[5px] px-[4px]" style={{ background: tintBg(c, 16) }}>
              <i className="h-[7px] w-[7px] rounded-[2px]" style={{ background: c }} />
              <b className="text-[7.5px] text-label">{l}</b>
            </span>
          ))}
        </div>
        <span className="absolute left-[120px] top-[10px] w-[112px] text-[8px] leading-snug text-label-2">{tt("Üç grup; alttaki ikisi hep görünür")}</span>
      </Fit>
    </Stage>
  );
}

/** "Yeni sürüm" kartında Güncelle: dokununca indirme başlar; Studio simgesinde yeşil nokta */
function UpdateGoDemo() {
  const n = useTick(900);
  const phase = n % 5; // 0–1 kart · 2 dokunuş · 3–4 indiriyor
  const going = phase >= 3;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[8px] top-[10px] flex h-[38px] w-[224px] items-center gap-[7px] rounded-b-[14px] rounded-t-[4px] bg-black px-[9px]">
          <MiniNook color="#ffffff" size={16} />
          <span className="min-w-0 flex-1 leading-tight">
            <b className="block text-[9px]" style={{ color: tintText(ACCENT.green) }}>{going ? tt("İndiriliyor…") : tt("Yeni sürüm: {0}", "0.3.15")}</b>
            {going ? (
              <span className="mt-[3px] block h-[4px] overflow-hidden rounded-full bg-white/10">
                <motion.i className="block h-full rounded-full" style={{ background: ACCENT.green }} initial={{ width: "5%" }} animate={{ width: "90%" }} transition={{ duration: 1.6 }} />
              </span>
            ) : (
              <i className="block truncate text-[7.5px] not-italic text-label-2">{tt("İçinde neler olduğu burada yazar")}</i>
            )}
          </span>
          {!going && (
            <motion.span className="flex h-[18px] items-center gap-[3px] rounded-full px-[7px] text-[8px] font-bold" style={{ color: tintText(ACCENT.green), ...box(ACCENT.green, true) }} animate={{ scale: phase === 2 ? 0.9 : 1 }}>
              <Download size={8} strokeWidth={3} />
              {tt("Güncelle")}
            </motion.span>
          )}
        </div>
        <span className="absolute left-[8px] top-[62px] flex h-[24px] w-[24px] items-center justify-center rounded-[8px] bg-white/[0.07]">
          <i className="h-[10px] w-[12px] rounded-[2px] border border-white/50" />
          <motion.i className="absolute right-[3px] top-[3px] h-[6px] w-[6px] rounded-full" style={{ background: ACCENT.green }} animate={{ scale: [1, 1.35, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
        </span>
        <span className="absolute left-[40px] top-[64px] rounded-full px-[7px] text-[8px] font-bold leading-[18px]" style={{ color: tintText(ACCENT.green), ...box(ACCENT.green) }}>
          {tt("v{0} → {1} hazır", "0.3.14", "0.3.15")}
        </span>
      </Fit>
    </Stage>
  );
}

/** Kısayol tuşlarının adı her yerde "Tuşlar" */
function TuslarDemo() {
  const n = useTick(1400);
  const now = n % 2 === 1;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <span className="absolute left-[8px] top-[8px] flex h-[26px] w-[224px] items-center gap-[7px] rounded-[9px] px-[8px]" style={box(ACCENT.blue, true)}>
          <MiniNook color={ACCENT.blue} size={15} />
          <motion.b key={String(now)} className="text-[10.5px]" style={{ color: tintText(ACCENT.blue) }} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}>
            {now ? tt("Tuşlar") : tt("Uygulamalar")}
          </motion.b>
          <i className="ml-auto text-[7.5px] not-italic text-label-3">{now ? tt("yeni ad") : tt("eski ad")}</i>
        </span>
        <span className="absolute left-[8px] top-[44px] grid w-[224px] grid-cols-6 gap-[5px]">
          {[ACCENT.red, ACCENT.green, ACCENT.yellow, ACCENT.purple, ACCENT.teal, ACCENT.orange].map((c, i) => (
            <motion.i key={c} className="h-[26px] rounded-[8px]" style={box(c, true)} animate={{ y: now && n % 6 === i ? 2 : 0 }} />
          ))}
        </span>
        <span className="absolute inset-x-0 top-[78px] text-center text-[8px] text-label-2">{tt("Studio › Tuşlar ve otomasyonlar")}</span>
      </Fit>
    </Stage>
  );
}

export const DEMOS37 = {
  newhome: NewHomeDemo,
  bands: BandsDemo,
  chatsetup: ChatSetupDemo,
  chatstart: ChatStartDemo,
  tourshort: TourShortDemo,
  chatty: ChattyDemo,
  firstweek: FirstWeekDemo,
  studionav: StudioNavDemo,
  updatego: UpdateGoDemo,
  tuslar: TuslarDemo,
};
