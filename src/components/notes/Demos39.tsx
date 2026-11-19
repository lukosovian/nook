/**
 * Yama notu demoları: yeni güne dönüşte özet, özet kartlarını düzenleme, ilk hafta görevleri, bugünün tek işi,
 * Günü kapat kartı, günlük ruh hâli, Tuşlar için hazır şablonlar ve Medya'da çalan uygulamanın sesi.
 */
import { motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, Headphones, Moon, Plus, Speaker, Sun, Volume1 } from "lucide-react";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { DECK_ICONS } from "../../lib/deckIcons";
import { pct, tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

const MOOD_FACES = [
  { color: ACCENT.red, eyes: "closed" },
  { color: ACCENT.orange, eyes: "side" },
  { color: ACCENT.yellow, eyes: "open" },
  { color: ACCENT.teal, eyes: "happy" },
  { color: ACCENT.green, eyes: "happy" },
] as const;

/** Gece: Nook uyur · sabah: geri dönünce ada büyür, günün özeti açılır */
function BriefNewDayDemo() {
  const n = useTick(1700);
  const day = n % 2 === 1;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <motion.div className="absolute right-[12px] top-[8px]" key={String(day)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          {day ? <Sun size={15} color={ACCENT.yellow} /> : <Moon size={14} color={tintText(ACCENT.purple)} />}
        </motion.div>
        <motion.div
          className="absolute top-0 overflow-hidden bg-black"
          initial={false}
          animate={{ left: day ? 30 : 76, width: day ? 180 : 88, height: day ? 84 : 22, borderRadius: day ? 16 : 10 }}
          transition={{ type: "spring", stiffness: 240, damping: 24 }}
          style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
        >
          <motion.div className="absolute" initial={false} animate={{ left: day ? 14 : 37, top: day ? 12 : 4, scale: day ? 1.5 : 1 }}>
            <MiniNook color="#ffffff" size={14} eyes={day ? "happy" : "closed"} />
          </motion.div>
          {day && (
            <motion.div className="absolute left-[46px] right-[10px] top-[9px]" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.25 } }}>
              <p className="text-[9.5px] font-semibold text-label">{tt("Günaydın")}!</p>
              <p className="text-[7.5px] text-label-3">{tt("Günün özeti")}</p>
              <div className="mt-[7px] grid grid-cols-3 gap-[4px]">
                {[ACCENT.orange, ACCENT.blue, ACCENT.red].map((c) => (
                  <i key={c} className="h-[26px] rounded-[7px] border" style={{ background: tintBg(c, 12), borderColor: tintBg(c, 28) }} />
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
        {!day && (
          <p className="absolute inset-x-0 top-[62px] text-center text-[9px] text-label-3">{tt("Bilgisayar gece uykuda kaldı")}</p>
        )}
      </Fit>
    </Stage>
  );
}

/** Düzenle: kartlar yer değiştirir, biri gizlenir */
function BriefTilesDemo() {
  const n = useTick(1300);
  const step = n % 4; // 0 başlangıç · 1 yer değişti · 2 gizlendi · 3 gizli kalır
  const order = step === 0 ? [0, 1, 2] : [1, 0, 2];
  const tiles = [
    { label: tt("Alarm"), color: ACCENT.orange },
    { label: tt("Su"), color: ACCENT.blue },
    { label: tt("Gece"), color: ACCENT.purple },
  ];
  return (
    <Stage>
      <Fit w={240} h={96}>
        <span className="absolute right-[8px] top-[6px] flex items-center gap-[3px] rounded-full px-[7px] py-[2px] text-[8.5px] font-semibold" style={{ background: tintBg(ACCENT.yellow, 18), color: tintText(ACCENT.yellow) }}>
          <Check size={9} strokeWidth={3} />
          {tt("Bitti")}
        </span>
        <span className="absolute left-[10px] top-[8px] text-[9px] font-medium text-label-2">{tt("Günün özeti")}</span>
        {tiles.map((t, i) => {
          const hidden = i === 2 && step >= 2;
          return (
            <motion.div
              key={i}
              className="absolute top-[32px] flex h-[50px] w-[70px] flex-col justify-between rounded-[11px] border p-[6px]"
              initial={false}
              animate={{ left: 8 + order.indexOf(i) * 77, opacity: hidden ? 0.35 : 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              style={{ background: tintBg(t.color, 11), borderColor: tintBg(t.color, 26) }}
            >
              <span className="flex items-center gap-[4px] text-[8.5px] font-medium" style={{ color: tintText(t.color) }}>
                <MiniNook color={t.color} size={13} eyes={hidden ? "closed" : "open"} />
                {t.label}
              </span>
              <span className="flex items-center justify-end gap-[2px] text-label-2">
                <ChevronLeft size={10} />
                <ChevronRight size={10} />
                {hidden ? <EyeOff size={10} /> : <Eye size={10} />}
              </span>
            </motion.div>
          );
        })}
      </Fit>
    </Stage>
  );
}

/** İlk haftan: üç görev sırayla işaretlenir */
function FirstWeekDemo() {
  const n = useTick(1100);
  const done = n % 4;
  const tasks = [tt("Bana bir dosya bırak"), tt("Bir alarm kur"), tt("Beni giydir")];
  return (
    <Stage>
      <Fit w={240} h={96}>
        <span className="absolute left-[10px] top-[7px] flex items-center gap-[5px] text-[10px] font-semibold text-label">
          <MiniNook color={ACCENT.green} size={14} eyes="happy" />
          {tt("İlk haftan")}
          <i className="text-[8.5px] font-normal not-italic text-label-3">{tt("{0} / {1} tamam", done, 3)}</i>
        </span>
        {tasks.map((t, i) => (
          <div key={t} className="absolute left-[8px] flex h-[19px] w-[224px] items-center gap-[7px] rounded-[8px] border px-[8px]" style={{ top: 29 + i * 22, background: tintBg(ACCENT.green, i < done ? 13 : 5), borderColor: tintBg(ACCENT.green, i < done ? 34 : 16) }}>
            <motion.i className="flex h-[11px] w-[11px] items-center justify-center rounded-full border" animate={{ background: i < done ? ACCENT.green : "rgb(0 0 0 / 0)" }} style={{ borderColor: tintBg(ACCENT.green, 60) }}>
              {i < done && <Check size={7} strokeWidth={4} color="#000" />}
            </motion.i>
            <span className={`text-[9px] ${i < done ? "text-label-3 line-through" : "text-label"}`}>{t}</span>
          </div>
        ))}
      </Fit>
    </Stage>
  );
}

/** Özette yazılır, kapalı adada Nook ile saat arasında durur, yapılınca ✓ */
function TodayTaskDemo() {
  const n = useTick(1500);
  const step = n % 3; // 0 yazıldı · 1 adada · 2 yapıldı
  const text = tt("Sunumu bitir");
  return (
    <Stage>
      <Fit w={240} h={96}>
        <motion.div
          className="absolute top-0 flex h-[24px] items-center overflow-hidden rounded-b-[11px] bg-black px-[9px]"
          initial={false}
          animate={{ left: step === 2 ? 72 : 44, width: step === 2 ? 96 : 152 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          <MiniNook color="#ffffff" size={14} eyes={step === 2 ? "happy" : "open"} />
          {step !== 2 && <span className="ml-[7px] min-w-0 flex-1 truncate text-[8.5px] font-medium text-label-3">{text}</span>}
          <b className="ml-auto text-[10px] text-label">09:41</b>
        </motion.div>
        <div className="absolute left-[30px] top-[44px] flex h-[34px] w-[180px] items-center gap-[8px] rounded-[11px] border px-[9px]" style={{ background: tintBg(ACCENT.green, 9), borderColor: tintBg(ACCENT.green, 26) }}>
          <motion.i className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border" animate={{ background: step === 2 ? ACCENT.green : "rgb(0 0 0 / 0)", scale: step === 2 ? [1, 1.3, 1] : 1 }} style={{ borderColor: tintBg(ACCENT.green, 65) }}>
            {step === 2 && <Check size={9} strokeWidth={4} color="#000" />}
          </motion.i>
          <span className="leading-tight">
            <i className="block text-[7.5px] not-italic text-label-3">{tt("Bugünün tek işi")}</i>
            <b className={`block text-[10px] font-medium ${step === 2 ? "line-through opacity-60" : ""}`} style={{ color: tintText(ACCENT.green) }}>
              {text}
            </b>
          </span>
        </div>
      </Fit>
    </Stage>
  );
}

/** Akşam kartı: bugünün sayıları ve "Yarına bir not" */
function DayCloseDemo() {
  const n = useTick(450);
  const note = tt("Faturayı öde");
  const typed = note.slice(0, Math.min(note.length, Math.max(0, (n % 26) - 4)));
  const stats = [
    { label: tt("Odak"), value: tt("{0} dk", 50), color: ACCENT.red },
    { label: tt("Su"), value: "5 / 8", color: ACCENT.blue },
    { label: tt("Yarın"), value: "07:30", color: ACCENT.orange },
  ];
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[14px] top-0 h-[84px] w-[212px] rounded-b-[16px] bg-black">
          <span className="absolute left-[12px] top-[14px]">
            <MiniNook color="#ffffff" size={24} eyes="closed" />
          </span>
          <span className="absolute left-[4px] top-[46px] w-[40px] text-center text-[7px] font-semibold leading-tight" style={{ color: tintText(ACCENT.purple) }}>
            {tt("Günü kapat")}
          </span>
          <div className="absolute left-[50px] right-[10px] top-[9px] grid grid-cols-3 gap-[4px]">
            {stats.map((s) => (
              <span key={s.label} className="rounded-[7px] border px-[5px] py-[3px] leading-tight" style={{ background: tintBg(s.color, 10), borderColor: tintBg(s.color, 26) }}>
                <i className="block text-[6.5px] not-italic text-label-3">{s.label}</i>
                <b className="block text-[8.5px] font-medium" style={{ color: tintText(s.color) }}>
                  {s.value}
                </b>
              </span>
            ))}
          </div>
          <div className="absolute left-[50px] right-[10px] top-[50px] flex h-[22px] items-center rounded-full border border-white/10 bg-white/[0.06] px-[9px] text-[8.5px]">
            {typed ? <span className="text-label">{typed}</span> : <span className="text-label-3">{tt("Yarına bir not")}</span>}
            <motion.i className="ml-[1px] h-[10px] w-[1px] bg-white" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

/** Beş yüzden biri seçilir; altta haftanın yüzleri dolar */
function MoodDemo() {
  const n = useTick(1000);
  const week = [3, 4, 2, 4, 5, 3, 4];
  const day = n % 7;
  const pick = week[day];
  return (
    <Stage>
      <Fit w={240} h={96}>
        <span className="absolute left-[12px] top-[13px] text-[9.5px] font-medium text-label-2">{tt("Bugün nasıldı?")}</span>
        <span className="absolute right-[12px] top-[8px] flex gap-[6px]">
          {MOOD_FACES.map((m, i) => (
            <motion.span key={i} animate={{ opacity: pick === i + 1 ? 1 : 0.3, scale: pick === i + 1 ? 1.2 : 1 }}>
              <MiniNook color={m.color} size={20} eyes={m.eyes} />
            </motion.span>
          ))}
        </span>
        <div className="absolute left-[8px] top-[44px] h-[44px] w-[224px] rounded-[10px] bg-white/[0.05] px-[9px] py-[5px]">
          <span className="text-[8px] text-label-3">{tt("Ruh hâlin")}</span>
          <span className="mt-[3px] flex justify-between">
            {week.map((v, i) =>
              i <= day ? (
                <motion.span key={`${i}-on`} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                  <MiniNook color={MOOD_FACES[v - 1].color} size={16} eyes={MOOD_FACES[v - 1].eyes} />
                </motion.span>
              ) : (
                <i key={i} className="block h-[16px] w-[16px] rounded-full border border-dashed border-white/20" />
              ),
            )}
          </span>
        </div>
      </Fit>
    </Stage>
  );
}

/** Şablona dokun: tuşların arasına yeni tuş olarak eklenir */
function DeckTemplatesDemo() {
  const n = useTick(1400);
  const templates = [
    { label: tt("Toplantı modu"), icon: "micoff", color: "#f2a33a" },
    { label: tt("Gece modu"), icon: "moon", color: "#3d8bff" },
    { label: tt("Mola"), icon: "wait", color: "#ff5c8a" },
  ];
  const cur = Math.floor(n / 2) % templates.length;
  const added = n % 2 === 1;
  const t = templates[cur];
  const Icon = DECK_ICONS[t.icon];
  return (
    <Stage>
      <Fit w={240} h={96}>
        <span className="absolute left-[10px] top-[6px] text-[8.5px] font-semibold uppercase tracking-[0.08em] text-label-3">{tt("Hazır şablonlar")}</span>
        {templates.map((x, i) => {
          const XIcon = DECK_ICONS[x.icon];
          return (
            <motion.div key={x.label} className="absolute left-[8px] flex h-[20px] w-[118px] items-center gap-[6px] rounded-[8px] border px-[6px]" animate={{ borderColor: i === cur ? tintBg(x.color, 60) : "rgb(255 255 255 / 0.07)", background: i === cur ? tintBg(x.color, 12) : "rgb(255 255 255 / 0.03)" }} style={{ top: 22 + i * 23 }}>
              <XIcon size={10} color={tintText(x.color)} />
              <span className="flex-1 truncate text-[8.5px] font-medium text-label">{x.label}</span>
              <Plus size={9} className="text-label-3" />
            </motion.div>
          );
        })}
        <div className="absolute left-[138px] top-[22px] grid w-[94px] grid-cols-2 gap-[5px]">
          <i className="h-[30px] rounded-[9px] border" style={{ background: tintBg(ACCENT.orange, 12), borderColor: tintBg(ACCENT.orange, 26) }} />
          {added ? (
            <motion.span key={`k${cur}`} className="flex h-[30px] flex-col items-center justify-center gap-[2px] rounded-[9px] border" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: tintBg(t.color, 18), borderColor: tintBg(t.color, 55) }}>
              <Icon size={11} color={tintText(t.color)} />
              <b className="max-w-[40px] truncate text-[6.5px] font-semibold" style={{ color: tintText(t.color) }}>
                {t.label}
              </b>
            </motion.span>
          ) : (
            <i className="flex h-[30px] items-center justify-center rounded-[9px] border border-dashed border-white/15 text-label-3">
              <Plus size={10} />
            </i>
          )}
          <span className="col-span-2 text-center text-[7.5px] text-label-3">{added ? tt("Tuşu düzenle") : tt("Tuşların")}</span>
        </div>
      </Fit>
    </Stage>
  );
}

/** Kapağın yanında: yalnızca çalan uygulamanın sesi ve çıkış çipi */
function MediaVolumeDemo() {
  const n = useTick(900);
  const level = [70, 45, 45, 85][n % 4];
  const phones = n % 8 >= 4;
  const Out = phones ? Headphones : Speaker;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[10px] top-[14px] h-[68px] w-[68px] rounded-[14px]" style={{ background: `linear-gradient(140deg, ${ACCENT.pink}, ${ACCENT.purple} 55%, ${ACCENT.blue})` }} />
        <p className="absolute left-[90px] top-[14px] text-[11px] font-semibold text-label">Blinding Lights</p>
        <p className="absolute left-[90px] top-[29px] text-[8.5px] text-label-2">Spotify</p>
        <div className="absolute left-[90px] top-[46px] h-[3px] w-[140px] rounded-full bg-white/[0.12]">
          <i className="block h-full w-[40%] rounded-full" style={{ background: ACCENT.pink }} />
        </div>
        <div className="absolute left-[90px] top-[62px] flex w-[140px] items-center gap-[5px]">
          <Volume1 size={11} className="shrink-0 text-label-2" />
          <span className="relative h-[3px] flex-1 rounded-full bg-white/[0.14]">
            <motion.i className="absolute inset-y-0 left-0 rounded-full" animate={{ width: `${level}%` }} style={{ background: ACCENT.pink }} />
            <motion.i className="absolute top-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" animate={{ left: `${level}%` }} />
          </span>
          <b className="w-[24px] text-right text-[8px] font-medium text-label-3">{pct(level)}</b>
          <motion.span key={String(phones)} className="flex items-center gap-[3px] rounded-full bg-black/50 px-[5px] py-[2px] text-[7.5px] text-label-2" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
            <Out size={8} />
            {phones ? tt("Kulaklık") : tt("Hoparlör")}
          </motion.span>
        </div>
      </Fit>
    </Stage>
  );
}

export const DEMOS39 = {
  briefnewday: BriefNewDayDemo,
  brieftiles: BriefTilesDemo,
  firstweek: FirstWeekDemo,
  todaytask: TodayTaskDemo,
  dayclose: DayCloseDemo,
  moodfaces: MoodDemo,
  decktemplates: DeckTemplatesDemo,
  mediavolume: MediaVolumeDemo,
};
