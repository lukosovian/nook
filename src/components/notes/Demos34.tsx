/**
 * Yama notu demoları: yazılanı anlayan hatırlatıcı, alarm kısayolları ve erteleme, kaçırılan hatırlatma,
 * birkaç günlük takvim etkinliği, alışkanlık serisi, aramadan zamanlayıcı, geri sayılan gün.
 */
import { motion } from "motion/react";
import { AlarmClock, BellOff, Coffee, Hourglass, Pill, Repeat, RotateCcw, Search, SkipForward, Sunrise, Timer } from "lucide-react";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

/** Kutuya yazılan cümle değişir; altındaki çip ne anlaşıldığını söyler */
function RemindParseDemo() {
  const n = useTick(1900);
  const rows = [
    { text: tt("çay 5 dk"), chip: tt("Bugün 14:05 · 5 dk sonra"), rep: false },
    { text: tt("1 saat 30 dk sonra ara"), chip: tt("Bugün 15:30 · 1 sa 30 dk sonra"), rep: false },
    { text: tt("yarın fatura"), chip: tt("Yarın 09:00 · 19 sa sonra"), rep: false },
    { text: tt("her salı 10:00 ders"), chip: tt("Sa · Salı 10:00"), rep: true },
  ];
  const r = rows[n % rows.length];
  const c = ACCENT.orange;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[14px] top-[10px] w-[212px] rounded-[12px] border p-[8px]" style={{ background: tintBg(c, 10), borderColor: tintBg(c, 28) }}>
          <p className="mb-[5px] text-[7px] font-bold uppercase tracking-[0.1em]" style={{ color: tintText(c) }}>
            {tt("Neyi hatırlatayım?")}
          </p>
          <div className="flex h-[24px] items-center rounded-[8px] bg-black/30 px-[8px]">
            <motion.span key={n} className="text-[10.5px] font-medium text-label" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}>
              {r.text}
            </motion.span>
            <motion.i className="ml-[2px] h-[11px] w-[1px] bg-white/70" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
          </div>
          <motion.span
            key={`c${n}`}
            className="mt-[6px] inline-flex items-center gap-[4px] rounded-full px-[7px] py-[2px] text-[8.5px] font-semibold"
            style={{ background: tintBg(c, 22), color: tintText(c) }}
            initial={{ opacity: 0, y: 4, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.35 }}
          >
            {r.rep ? <Repeat size={9} strokeWidth={2.6} /> : <AlarmClock size={9} strokeWidth={2.6} />}
            {r.chip}
          </motion.span>
        </div>
      </Fit>
    </Stage>
  );
}

/** Gün kısayolları ve şablonlar günleri doldurur; altta sıradakini atla ve erteleme süresi */
function AlarmKitDemo() {
  const n = useTick(1500);
  const phase = n % 4; // 0 her gün · 1 hafta içi · 2 hafta sonu · 3 şablon "Uyan"
  const sets = [[1, 2, 3, 4, 5, 6, 0], [1, 2, 3, 4, 5], [6, 0], [1, 2, 3, 4, 5]];
  const days = sets[phase];
  const c = ACCENT.yellow;
  const chips = [tt("Her gün"), tt("Hafta içi"), tt("Hafta sonu")];
  const tpl = [
    { label: tt("İlaç"), icon: Pill, color: ACCENT.green },
    { label: tt("Uyan"), icon: Sunrise, color: ACCENT.orange },
    { label: tt("Mola"), icon: Coffee, color: ACCENT.blue },
  ];
  const skip = n % 2 === 1;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[8px] top-[6px] flex w-[108px] gap-[2px]">
          {chips.map((x, i) => (
            <motion.span
              key={x}
              className="flex h-[13px] flex-1 items-center justify-center rounded-full text-[6px] font-semibold"
              animate={{ background: phase === i ? tintBg(c, 30) : "rgb(255 255 255 / 0.06)", color: phase === i ? tintText(c) : "#8b8b94" }}
            >
              {x}
            </motion.span>
          ))}
        </div>
        <div className="absolute left-[8px] top-[23px] flex w-[108px] gap-[2px]">
          {[tt("Pt"), tt("Sa"), tt("Ça"), tt("Pe"), tt("Cu"), tt("Ct"), tt("Pz")].map((d, i) => {
            const on = days.includes((i + 1) % 7);
            return (
              <motion.span
                key={i}
                className="flex h-[17px] flex-1 items-center justify-center rounded-[5px] text-[7px] font-bold"
                animate={{ background: on ? tintBg(c, 32) : "rgb(0 0 0 / 0.35)", color: on ? tintText(c) : "#6f6f78", scale: on ? 1 : 0.94 }}
              >
                {d}
              </motion.span>
            );
          })}
        </div>
        <div className="absolute left-[124px] top-[6px] flex w-[108px] items-center gap-[3px]">
          {tpl.map((t, i) => (
            <motion.span
              key={t.label}
              className="flex h-[34px] flex-1 flex-col items-center justify-center gap-[2px] rounded-[8px] text-[6.5px] font-semibold"
              style={{ color: tintText(t.color) }}
              animate={{ background: tintBg(t.color, phase === 3 && i === 1 ? 34 : 13), scale: phase === 3 && i === 1 ? 1.08 : 1 }}
            >
              <t.icon size={11} strokeWidth={2.4} />
              {t.label}
            </motion.span>
          ))}
        </div>
        <div className="absolute left-[8px] top-[50px] flex h-[38px] w-[224px] items-center gap-[6px] rounded-[10px] border px-[7px]" style={{ background: tintBg(c, 9), borderColor: tintBg(c, 26) }}>
          <MiniNook color={c} size={18} />
          <b className="text-[11px] tabular-nums" style={{ color: tintText(c) }}>07:00</b>
          <motion.span key={String(skip)} className="flex-1 truncate text-[7.5px]" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} style={{ color: skip ? tintText(ACCENT.orange) : "#a6a6ae" }}>
            {skip ? tt("Yarın atlanacak") : tt("Hafta içi")}
          </motion.span>
          <motion.span
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full"
            animate={{ background: skip ? tintBg(ACCENT.orange, 26) : "rgb(255 255 255 / 0.06)", color: skip ? tintText(ACCENT.orange) : "#8b8b94", scale: skip ? [1, 1.2, 1] : 1 }}
          >
            <SkipForward size={9} strokeWidth={2.6} />
          </motion.span>
          <span className="flex h-[20px] items-center gap-[2px] rounded-full px-[5px]" style={{ background: tintBg(ACCENT.blue, 16), color: tintText(ACCENT.blue) }}>
            <Timer size={9} strokeWidth={2.6} />
            {[5, 10, 15].map((m, i) => (
              <motion.b key={m} className="flex h-[15px] w-[15px] items-center justify-center rounded-full text-[7.5px]" animate={{ background: n % 3 === i ? "rgb(255 255 255 / 0.16)" : "rgb(255 255 255 / 0)" }}>
                {m}
              </motion.b>
            ))}
          </span>
        </div>
      </Fit>
    </Stage>
  );
}

/** Açılışta "Kaçırdın" kartı; listede Kaçırıldı etiketi ve Yeniden kur */
function MissedDemo() {
  const n = useTick(1500);
  const phase = n % 3; // 0 kart · 1 liste · 2 yeniden kuruldu
  const c = phase === 2 ? ACCENT.orange : ACCENT.red;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <motion.div
          className="absolute left-[40px] top-0 flex h-[30px] w-[160px] items-center gap-[6px] rounded-b-[13px] bg-black px-[8px]"
          animate={{ y: phase === 0 ? 0 : -34 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
        >
          <MiniNook color="#ffffff" size={15} />
          <span className="leading-tight">
            <span className="block text-[8px] font-semibold text-white">{tt("Kaçırdın: {0}", tt("Kargoyu al"))}</span>
            <span className="block text-[6.5px] text-white/55">14:30</span>
          </span>
        </motion.div>
        <motion.div
          className="absolute left-[12px] top-[44px] flex h-[34px] w-[216px] items-center gap-[7px] rounded-[10px] border px-[7px]"
          animate={{ background: tintBg(c, 9), borderColor: tintBg(c, 28) }}
        >
          <span className="flex h-[20px] w-[20px] items-center justify-center rounded-[7px]" style={{ background: tintBg(c, 24), color: tintText(c) }}>
            {phase === 2 ? <AlarmClock size={10} strokeWidth={2.4} /> : <BellOff size={10} strokeWidth={2.4} />}
          </span>
          <span className="flex-1 leading-tight">
            <span className="block text-[9px] font-semibold text-label">{tt("Kargoyu al")}</span>
            <motion.span key={phase === 2 ? 1 : 0} className="block text-[7px]" style={{ color: tintText(c) }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {phase === 2 ? tt("{0} dk sonra", 30) : `${tt("Kaçırıldı")} · 14:30`}
            </motion.span>
          </span>
          {phase !== 2 && (
            <motion.span
              className="flex h-[18px] items-center gap-[3px] rounded-full px-[6px] text-[7px] font-semibold"
              style={{ background: tintBg(ACCENT.orange, 20), color: tintText(ACCENT.orange) }}
              animate={{ scale: phase === 1 ? [1, 1.12, 1] : 1 }}
              transition={{ delay: 0.7 }}
            >
              <RotateCcw size={8} strokeWidth={2.6} />
              {tt("Yeniden kur")}
            </motion.span>
          )}
        </motion.div>
      </Fit>
    </Stage>
  );
}

/** Üç gün süren abone etkinlik haftanın üç gününde de nokta alır; seçilen günün listesinde görünür */
function MultiDayDemo() {
  const n = useTick(1100);
  const sel = 2 + (n % 3); // etkinliğin günleri arasında gezer
  const c = ACCENT.purple;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[12px] top-[10px] flex w-[216px] justify-between">
          {[16, 17, 18, 19, 20, 21, 22].map((d, i) => {
            const on = i >= 2 && i <= 4;
            return (
              <span key={d} className="relative flex h-[30px] w-[26px] flex-col items-center justify-center">
                {sel === i && <motion.i layoutId="md-sel" className="absolute inset-x-[2px] top-[2px] h-[22px] rounded-full" style={{ background: tintBg(ACCENT.blue, 30) }} />}
                <b className="relative text-[9.5px] font-medium tabular-nums text-label">{d}</b>
                <motion.i className="relative mt-[2px] h-[3.5px] w-[3.5px] rounded-full" initial={false} animate={{ background: on ? c : "rgb(255 255 255 / 0)", scale: on ? 1 : 0.5 }} />
              </span>
            );
          })}
        </div>
        <motion.i className="absolute top-[44px] h-[3px] rounded-full" style={{ left: 76, width: 88, background: tintBg(c, 45) }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} />
        <motion.div
          key={sel}
          className="absolute left-[12px] top-[56px] flex h-[26px] w-[216px] items-center gap-[7px] rounded-full border px-[9px]"
          style={{ background: tintBg(c, 10), borderColor: tintBg(c, 28) }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <b className="text-[9px]" style={{ color: tintText(c) }}>{tt("Gün")}</b>
          <span className="flex-1 text-[9.5px] text-label">{tt("Fuar")}</span>
          <span className="text-[7.5px] text-label-3">{tt("{0}. gün", sel - 1)}</span>
        </motion.div>
      </Fit>
    </Stage>
  );
}

/** Yedi nokta (bugün en sağda) dolar; seri iki günü geçince "N gün üst üste" yazar */
function HabitStreakDemo() {
  const n = useTick(1300);
  const step = n % 3; // bugün: boş · yapıldı · yapıldı
  const c = ACCENT.purple;
  const dots = [true, false, true, true, true, true, step > 0];
  const streak = step > 0 ? 5 : 4;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[10px] top-[24px] flex h-[46px] w-[220px] items-center gap-[8px] rounded-[12px] bg-white/[0.05] px-[9px]">
          <MiniNook color={c} size={24} />
          <span className="flex-1 leading-tight">
            <span className="flex items-center gap-[6px]">
              <b className="text-[10px] font-semibold text-label">{tt("Göz Dinlendir")}</b>
              <span className="flex items-center gap-[3px]">
                {dots.map((on, i) => (
                  <motion.i
                    key={i}
                    className="h-[6px] w-[6px] rounded-full"
                    animate={{ background: on ? c : "rgb(255 255 255 / 0.13)", scale: i === 6 && step === 1 ? [1, 1.7, 1] : 1 }}
                    style={{ boxShadow: i === 6 ? `0 0 0 1.5px ${tintBg(c, 40)}` : undefined }}
                  />
                ))}
              </span>
            </span>
            <motion.span key={streak} className="block text-[8px] font-semibold" style={{ color: tintText(c) }} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}>
              {tt("{0} gün üst üste", streak)}
            </motion.span>
          </span>
          <motion.span
            className="flex h-[20px] items-center rounded-full px-[8px] text-[8px] font-medium"
            animate={{ background: step === 1 ? tintBg(c, 34) : "rgb(255 255 255 / 0.07)", color: step === 1 ? tintText(c) : "#b4b4bc" }}
          >
            {tt("Yaptım")}
          </motion.span>
        </div>
      </Fit>
    </Stage>
  );
}

/** Aramaya "çay 3 dk" yazılır, ilk sonuç zamanlayıcıdır; Enter'dan sonra kapalı adada geri sayar */
function QuickTimerDemo() {
  const n = useTick(1300);
  const phase = n % 4; // 0 yazı · 1 sonuç · 2-3 geri sayım
  const c = ACCENT.yellow;
  return (
    <Stage>
      <Fit w={240} h={96}>
        {phase < 2 ? (
          <>
            <div className="absolute left-[10px] top-[12px] flex h-[26px] w-[220px] items-center gap-[7px] rounded-full bg-white/[0.07] px-[10px]">
              <Search size={11} className="text-label-3" />
              <span className="text-[10.5px] text-label">{tt("çay 3 dk")}</span>
            </div>
            {phase === 1 && (
              <motion.div
                className="absolute left-[10px] top-[46px] flex h-[28px] w-[220px] items-center gap-[7px] rounded-full border px-[5px]"
                style={{ background: tintBg(c, 14), borderColor: tintBg(c, 38) }}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <MiniNook color={c} size={18} icon={Timer} />
                <span className="flex-1 text-[9.5px] text-label">{tt("Zamanlayıcı: {0}", `${tt("çay")} · ${tt("{0} dk", 3)}`)}</span>
                <span className="pr-[5px] text-[7.5px]" style={{ color: tintText(c) }}>{tt("Enter ile kur")}</span>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div className="absolute left-[62px] top-0 flex h-[28px] w-[116px] items-center justify-between rounded-b-[13px] bg-black px-[9px]" initial={{ y: -28 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}>
            <MiniNook color="#ffffff" size={15} />
            <span className="flex items-center gap-[4px] text-[9.5px] font-semibold tabular-nums" style={{ color: tintText(ACCENT.blue) }}>
              <Timer size={10} strokeWidth={2.6} />
              <motion.span key={phase} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }}>
                {tt("{0} dk", phase === 2 ? 3 : 2)}
              </motion.span>
            </span>
          </motion.div>
        )}
      </Fit>
    </Stage>
  );
}

/** Etkinlikte kum saati açılır; takvimin üstünde "Tatil · 12 gün" her gün bir azalır */
function CountdownDemo() {
  const n = useTick(1200);
  const left = 12 - (n % 4);
  const c = ACCENT.orange;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[12px] top-[12px] flex w-[216px] items-center">
          <span className="flex-1 text-[9.5px] font-medium text-label">{tt("Takvim")}</span>
          <span className="flex items-center gap-[4px] rounded-full px-[8px] py-[3px] text-[9px] font-semibold" style={{ background: tintBg(c, 18), color: tintText(c) }}>
            <Hourglass size={9} strokeWidth={2.6} />
            {tt("Tatil")} ·
            <motion.b key={left} className="tabular-nums" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
              {tt("{0} gün", left)}
            </motion.b>
          </span>
        </div>
        <div className="absolute left-[12px] top-[46px] flex h-[28px] w-[216px] items-center gap-[7px] rounded-full border px-[9px]" style={{ background: tintBg(ACCENT.blue, 9), borderColor: tintBg(ACCENT.blue, 26) }}>
          <b className="text-[9px]" style={{ color: tintText(ACCENT.blue) }}>{tt("Gün")}</b>
          <span className="flex-1 text-[9.5px] text-label">{tt("Tatil")}</span>
          <motion.span className="flex h-[18px] w-[18px] items-center justify-center rounded-full" style={{ color: tintText(c) }} animate={{ background: [tintBg(c, 10), tintBg(c, 34), tintBg(c, 10)] }} transition={{ duration: 1.2, repeat: Infinity }}>
            <Hourglass size={9} strokeWidth={2.6} />
          </motion.span>
        </div>
      </Fit>
    </Stage>
  );
}

export const DEMOS34 = {
  remindparse: RemindParseDemo,
  alarmkit: AlarmKitDemo,
  missedremind: MissedDemo,
  multiday: MultiDayDemo,
  habitstreak: HabitStreakDemo,
  quicktimer: QuickTimerDemo,
  countdowndays: CountdownDemo,
};
