/**
 * Studio ana sayfasında Nook'un günlüğü: en yeni yazı, oklarla önceki günler; "Şimdi yaz" bugünü hemen yazar.
 */
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, ChevronLeft, ChevronRight, PenLine } from "lucide-react";
import { writeDiary } from "../../lib/diary";
import { normalizeColor, normalizeLook } from "../../lib/look";
import { studioGo } from "../../lib/studio";
import { dayKey, useNook } from "../../store/nook";
import { NookFigure } from "../../components/mascot/Figure";
import { ACCENT, tintBg, tintText } from "../../components/ui/primitives";
import { locale, tt } from "../../lib/i18n";

const COLOR = ACCENT.purple;

function dayLabel(day: string) {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (day === dayKey()) return tt("Bugün");
  if (day === dayKey(y)) return tt("Dün");
  const [yy, mm, dd] = day.split("-").map(Number);
  return new Date(yy, mm - 1, dd).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" });
}

export function DiaryCard({ delay = 0 }: { delay?: number }) {
  const diary = useNook((s) => s.diary);
  const on = useNook((s) => s.settings.diary);
  const hasKey = useNook((s) => !!s.settings.geminiKey.trim());
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  const days = Object.keys(diary).sort();
  const [i, setI] = useState<number | null>(null);
  const idx = i ?? days.length - 1;
  const day = days[idx];
  const entry = day ? diary[day] : null;
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState(false);

  const writeNow = async () => {
    setBusy(true);
    setFail(false);
    const text = await writeDiary(dayKey()).catch(() => null);
    setBusy(false);
    if (text) setI(null);
    else setFail(true);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, delay }}
      className="nook-card relative flex min-w-0 flex-col overflow-hidden rounded-[22px] p-5"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-[220px] w-[240px] rounded-full opacity-60" style={{ background: `radial-gradient(circle, ${tintBg(COLOR, 26)}, transparent 65%)` }} />
      <div className="relative mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: tintBg(COLOR, 20), color: tintText(COLOR) }}>
          <BookOpen size={15} strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-bold tracking-tight text-label">{tt("Nook'un günlüğü")}</h2>
          <p className="truncate text-[11.5px] text-label-3">{day ? dayLabel(day) : tt("Her gece yazar")}</p>
        </div>
        {days.length > 1 && (
          <div className="flex items-center">
            <Nav disabled={idx <= 0} onClick={() => setI(idx - 1)} label={tt("Önceki gün")}>
              <ChevronLeft size={15} />
            </Nav>
            <Nav disabled={idx >= days.length - 1} onClick={() => setI(idx + 1 >= days.length - 1 ? null : idx + 1)} label={tt("Sonraki gün")}>
              <ChevronRight size={15} />
            </Nav>
          </div>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          {entry ? (
            <motion.p
              key={day}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="whitespace-pre-wrap text-[14px] leading-[1.6] text-label-2"
              style={{ userSelect: "text" }}
            >
              <span className="mr-1 font-display text-[22px] leading-none" style={{ color: tintText(COLOR) }}>
                “
              </span>
              {entry.text}
            </motion.p>
          ) : (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[13px] leading-relaxed text-label-3">
              {!on
                ? tt("Günlük kapalı. Ayarlar › Ada ve Nook'tan açabilirsin.")
                : hasKey
                  ? tt("Gece 22.30'dan sonra bugünü kendi ağzımdan günlüğüme yazacağım: hangi programlarda takıldın, ne izledin, suyu unuttun mu…")
                  : tt("Günlük yazabilmem için Gemini anahtarı lazım.")}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="relative mt-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center">
          <NookFigure look={look} color={color} size={30} expression={busy ? "writing" : "happy"} />
        </span>
        {fail && <span className="min-w-0 flex-1 truncate text-[11px] text-label-3">{tt("Bugün için yazacak kadar veri yok ya da Gemini cevap vermedi")}</span>}
        <span className="flex-1" />
        {on && hasKey ? (
          <button
            onClick={() => void writeNow()}
            disabled={busy}
            className="flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-opacity disabled:opacity-50"
            style={{ background: tintBg(COLOR, 14), borderColor: tintBg(COLOR, 36), color: tintText(COLOR) }}
          >
            <PenLine size={13} strokeWidth={2.4} />
            {busy ? tt("Yazıyorum…") : diary[dayKey()] ? tt("Bugünü yeniden yaz") : tt("Bugünü şimdi yaz")}
          </button>
        ) : (
          !hasKey && (
            <button onClick={() => studioGo("settings", tt("Yapay zekâ"))} className="h-8 rounded-full bg-white/[0.06] px-3 text-[12px] font-semibold text-label-2 hover:bg-white/[0.1]">
              {tt("Ayarlar'a git")}
            </button>
          )
        )}
      </div>
    </motion.section>
  );
}

function Nav({ disabled, onClick, label, children }: { disabled: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} title={label} className="flex h-7 w-7 items-center justify-center rounded-full text-label-3 transition-colors hover:bg-white/[0.06] hover:text-label disabled:opacity-30">
      {children}
    </button>
  );
}
