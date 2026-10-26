import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Clock, Droplet, Eye, Play, Sparkles, X, Zap } from "lucide-react";
import { answerAsk } from "../../lib/automations";
import { doneEye, doneStretch, snoozeReminder } from "../../hooks/useFeatures";
import { getTodayWater, useHabits } from "../../lib/habits";
import { spring } from "../../lib/motion";
import { useNook } from "../../store/nook";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

/**
 * Sağlık ve Mola Hatırlatması (Su, 20-20-20 Göz Molası, Duruş & Esneme).
 * Kullanıcı cevaplayana kadar adada bekler; içince/yapınca Nook da eşlik eder.
 */
export function ReminderView() {
  const reminder = useNook((s) => s.reminder);
  const ask = useNook((s) => s.autoAsk);
  const todayWater = getTodayWater();

  // 20 saniye geri sayım (Göz dinlendirme modu)
  const [eyeCountdown, setEyeCountdown] = useState(20);

  useEffect(() => {
    if (reminder?.kind === "eye" && reminder.phase === "resting") {
      setEyeCountdown(20);
      const iv = window.setInterval(() => {
        setEyeCountdown((c) => {
          if (c <= 1) {
            window.clearInterval(iv);
            doneEye(true);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => window.clearInterval(iv);
    }
  }, [reminder?.kind, reminder?.phase]);

  if (ask) return <AskView label={ask.label} detail={ask.detail} />;
  if (!reminder) return null;

  const kind = reminder.kind ?? "water";
  const phase = reminder.phase;

  const isWorking = phase === "drinking" || phase === "resting" || phase === "stretching";

  const theme =
    kind === "eye"
      ? { color: ACCENT.purple, icon: Eye, title: tt("Göz dinlendirme vakti"), activeTitle: tt("Gözlerin dinleniyor…") }
      : kind === "stretch"
        ? { color: "#FF5C8A", icon: Sparkles, title: tt("Duruş & Esneme vakti"), activeTitle: tt("Omuzlar rahatladı!") }
        : kind === "habit"
          ? { color: ACCENT.teal, icon: Sparkles, title: reminder.title ?? tt("Alışkanlık vakti"), activeTitle: tt("Harika gidiyorsun!") }
          : { color: ACCENT.blue, icon: Droplet, title: tt("Su içme vakti"), activeTitle: tt("Afiyet olsun!") };

  return (
    <motion.div
      className="absolute inset-y-0 left-[66px] right-3 flex items-center gap-2"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0, transition: { delay: 0.08, duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${kind}-${phase}`}
          className="min-w-0 flex-1"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
        >
          <p className="flex items-center gap-1.5 text-[14px] font-medium leading-tight" style={{ color: tintText(theme.color) }}>
            <motion.span
              animate={isWorking ? { y: [0, -2, 0], scale: [1, 1.15, 1] } : { y: [0, -2.5, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="flex"
            >
              <theme.icon size={14} strokeWidth={2.4} fill="currentColor" />
            </motion.span>
            <span>{isWorking ? theme.activeTitle : theme.title}</span>
          </p>

          <p className="mt-0.5 truncate text-[11px] text-label-2">
            {kind === "water" && (
              isWorking
                ? tt("Bugün {0}. bardak", todayWater)
                : todayWater
                  ? tt("Bugün {0} bardak içtin, bir tane daha?", todayWater)
                  : tt("Benimle bir bardak su içer misin?")
            )}
            {kind === "eye" && (
              phase === "resting"
                ? tt("En az 6 metre uzağa bakıyorsun · {0} sn kaldı", eyeCountdown)
                : tt("20 saniye boyunca uzağa bak, gözlerin tazelensin")
            )}
            {kind === "stretch" && (
              phase === "stretching"
                ? tt("Harika bir esneme! Derin bir nefes al ✨")
                : tt("Omuzları geriye at, dik dur ve derin nefes al")
            )}
            {kind === "habit" && (
              tt("Bu alışkanlığın için vakit ayırma zamanı geldi ✨")
            )}
          </p>
        </motion.div>
      </AnimatePresence>

      {!isWorking ? (
        <>
          <Action
            icon={Clock}
            label={tt("Sonra")}
            title={tt("Ertele")}
            color={ACCENT.gray}
            onClick={() => snoozeReminder(kind)}
          />
          {kind === "water" && (
            <Action
              icon={Droplet}
              label={tt("İçtim")}
              title={tt("İçtim / içiyorum")}
              color={theme.color}
              onClick={() => useHabits.getState().drinkGlass()}
              strong
            />
          )}
          {kind === "eye" && (
            <Action
              icon={Eye}
              label={tt("Dinlendir")}
              title={tt("20 saniyelik göz molasını başlat")}
              color={theme.color}
              onClick={() => useNook.getState().setReminder({ kind: "eye", phase: "resting" })}
              strong
            />
          )}
          {kind === "stretch" && (
            <Action
              icon={Sparkles}
              label={tt("Esnedim")}
              title={tt("Esnedim ve dik durdum")}
              color={theme.color}
              onClick={doneStretch}
              strong
            />
          )}
          {kind === "habit" && (
            <Action
              icon={Check}
              label={tt("Yaptım")}
              title={tt("Tamamla")}
              color={theme.color}
              onClick={() => {
                if (reminder.habitId) useHabits.getState().completeHabit(reminder.habitId);
                useNook.getState().setReminder(null);
              }}
              strong
            />
          )}
        </>
      ) : (
        kind === "eye" && phase === "resting" && (
          <Action
            icon={Check}
            label={tt("Tamam")}
            title={tt("Göz dinlendirmeyi bitir")}
            color={theme.color}
            onClick={() => doneEye(false)}
            strong
          />
        )
      )}
    </motion.div>
  );
}

/** Otomasyon çalışmadan önce soruyor: "Çalıştır" ya da "Bu sefer değil" (45 sn cevapsız kalırsa çalışmaz) */
function AskView({ label, detail }: { label: string; detail: string }) {
  const color = ACCENT.purple;
  return (
    <motion.div
      className="absolute inset-y-0 left-[66px] right-3 flex items-center gap-2"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0, transition: { delay: 0.08, duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[14px] font-medium leading-tight" style={{ color: tintText(color) }}>
          <Zap size={14} strokeWidth={2.4} fill="currentColor" className="shrink-0" />
          <span className="truncate">{label}</span>
        </p>
        <p className="mt-0.5 truncate text-[11px] text-label-2">{tt("Çalışsın mı? · {0}", detail)}</p>
      </div>
      <Action icon={X} label={tt("Hayır")} title={tt("Bu sefer çalışmasın")} color={ACCENT.gray} onClick={() => answerAsk(false)} />
      <Action icon={Play} label={tt("Çalıştır")} title={tt("Şimdi çalıştır")} color={color} onClick={() => answerAsk(true)} strong />
    </motion.div>
  );
}

function Action({ icon: Icon, label, title, color, onClick, strong }: { icon: typeof Clock; label: string; title: string; color: string; onClick: () => void; strong?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={spring.pop}
      onClick={onClick}
      title={title}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium"
      style={{
        background: tintBg(color, strong ? 26 : 12),
        borderColor: tintBg(color, strong ? 60 : 32),
        color: tintText(color),
        boxShadow: strong ? `0 0 16px -4px ${color}` : undefined,
      }}
    >
      <Icon size={13} strokeWidth={2.5} fill={strong ? "currentColor" : "none"} />
      {label}
    </motion.button>
  );
}
