/**
 * Studio ana sayfası: solda selam balonlu büyük Nook ve arama çubuğu, sağda bu hafta bilgisayar başında geçen
 * süre; altında bugünün sayıları (düne göre), sohbet, yenilikler, karne ve kısayol tuşları.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Droplet, Heart, HeartHandshake, Monitor, Music, Shirt, Zap, type LucideIcon } from "lucide-react";
import { normalizeColor, normalizeLook, useNookName } from "../../lib/look";
import { latestNote } from "../../lib/notes";
import { studioGo } from "../../lib/studio";
import { DECK_ICONS, useDeck } from "../../lib/deck";
import { pickGreeting } from "../../lib/greet";
import { dayKey, EMPTY_DAY, isSleeping, SULK_BELOW, useNook, type DayStats } from "../../store/nook";
import { NookFigure } from "../../components/mascot/Figure";
import { ACCENT, tintBg, tintText } from "../../components/ui/primitives";
import { locale, tt } from "../../lib/i18n";
import { weekGrade, LETTER_COLOR } from "../../components/report/Report";
import { Page, Panel } from "../ui";
import { HomeChat, HomeSearch } from "./HomeAsk";
import { DiaryCard } from "./DiaryCard";

const hm = (min: number) => (min >= 60 ? tt("{0} sa {1} dk", Math.floor(min / 60), Math.round(min % 60)) : tt("{0} dk", Math.round(min)));
const SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;

/** Bugünden geriye 7 gün (en eski solda) */
function lastWeek(days: Record<string, Partial<DayStats>>) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { date: d, stats: { ...EMPTY_DAY, ...days[dayKey(d)] } };
  });
}

export function HomePage() {
  const name = useNookName();
  const user = useNook((s) => s.settings.userName.trim());
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  const affection = useNook((s) => s.affection);
  const asleep = useNook(isSleeping);
  const days = useNook((s) => s.days);
  const week = lastWeek(days);
  const today = week[6].stats;
  const yesterday = week[5].stats;
  const g = weekGrade(days);
  const note = latestNote();
  const deck = useDeck();
  const h = new Date().getHours();
  const greet = h < 5 ? tt("İyi geceler") : h < 12 ? tt("Günaydın") : h < 18 ? tt("Merhaba") : tt("İyi akşamlar");
  const mood = asleep ? tt("Uykuda") : affection < SULK_BELOW ? tt("Biraz küs") : affection < 50 ? tt("Durgun") : affection < 80 ? tt("Keyfi yerinde") : tt("Çok mutlu");

  return (
    <Page wide>
      <div className="mb-4 grid grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)] gap-4">
        {/* Kahraman: selam balonlu Nook */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="nook-card relative z-10 flex items-center gap-7 rounded-[28px] px-8 py-7">
          {/* Işıklar kartın içinde kalır; arama sonuçları kartın dışına taşabilsin diye kartın kendisi kesmez */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
            <div className="absolute -left-24 -top-28 h-[380px] w-[440px] rounded-full opacity-70" style={{ background: `radial-gradient(circle, ${tintBg(color, 42)}, transparent 65%)` }} />
            <div className="absolute -right-24 bottom-[-160px] h-[340px] w-[400px] rounded-full opacity-50" style={{ background: `radial-gradient(circle, ${tintBg(ACCENT.purple, 30)}, transparent 65%)` }} />
          </div>
          <div className="relative shrink-0 pt-8">
            <SpeechBubble />
            <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}>
              <NookFigure look={look} color={color} size={128} expression={asleep ? "sleepy" : affection > 80 ? "happy" : "idle"} />
            </motion.div>
            <motion.span className="absolute -bottom-3 left-1/2 h-4 w-28 -translate-x-1/2 rounded-[50%] bg-black/50 blur-md" animate={{ scaleX: [1, 0.86, 1] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }} />
          </div>
          <div className="relative min-w-0 flex-1">
            <p className="text-[13px] font-semibold" style={{ color: tintText(ACCENT.pink) }}>
              {new Date().toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="mt-1 text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] text-label">
              {greet}
              {user ? `, ${user}` : ""}
            </h1>
            <p className="mt-2 max-w-[440px] text-[14px] leading-relaxed text-label-2">
              {today.active ? tt("{0} bugün {1} seninle.", name, hm(today.active)) : tt("{0} seni bekliyordu.", name)}
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold" style={{ background: tintBg(ACCENT.pink, 16), color: tintText(ACCENT.pink) }}>
                <Heart size={11} fill="currentColor" /> {mood}
              </span>
              <div className="h-[6px] w-[160px] min-w-0 overflow-hidden rounded-full bg-white/[0.07]" title={tt("Keyfi %{0}", Math.round(affection))}>
                <motion.span className="block h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.max(3, affection)}%` }} transition={{ duration: 0.8, delay: 0.2 }} style={{ background: `linear-gradient(90deg, ${ACCENT.pink}, ${ACCENT.yellow})` }} />
              </div>
            </div>
            {/* Arama burada (sonuçlar altında açılır); yanında görünüm */}
            <div className="mt-5 flex items-center gap-2">
              <HomeSearch />
              <Action icon={Shirt} color={ACCENT.pink} title={tt("Görünümü değiştir")} onClick={() => studioGo("look")} />
            </div>
          </div>
        </motion.section>

        {/* Bu hafta: günlük birlikte geçen süre */}
        <WeekCard week={week} />
      </div>

      {/* Bugün, düne göre */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        <TodayStat icon={Monitor} color={ACCENT.purple} label={tt("Bugün bilgisayarda")} value={hm(today.active)} now={today.active} prev={yesterday.active} delay={0.04} />
        <TodayStat icon={HeartHandshake} color={ACCENT.red} label={tt("Nook'la ilgilenme")} value={tt("{0} kez", today.care)} now={today.care} prev={yesterday.care} unit="times" delay={0.07} />
        <TodayStat icon={Music} color={ACCENT.pink} label={tt("Müzik")} value={hm(today.music)} now={today.music} prev={yesterday.music} delay={0.1} />
        <TodayStat icon={Droplet} color={ACCENT.blue} label={tt("Su")} value={tt("{0} bardak", today.water)} now={today.water} prev={yesterday.water} unit="glass" delay={0.13} />
      </div>

      {/* Sohbet (adaya geçmeden) ve Nook'un günlüğü */}
      <div className="mb-4 grid grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)] gap-4">
        <HomeChat delay={0.1} />
        <DiaryCard delay={0.12} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Neler yeni */}
        <Panel title={tt("Neler yeni?")} hint={`${note.version} · ${note.date}`} delay={0.12} right={<Arrow onClick={() => studioGo("notes")} />}>
          <button onClick={() => studioGo("notes")} className="block w-full text-left">
            {note.major && (
              <span className="mb-1.5 inline-block rounded-full px-2 py-[2px] text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-white" style={{ background: `linear-gradient(100deg, ${ACCENT.purple}, ${ACCENT.pink} 45%, ${ACCENT.orange})` }}>
                {tt("Büyük güncelleme")}
              </span>
            )}
            <p className="text-[13px] font-semibold leading-snug text-label">{note.headline}</p>
            <ul className="mt-2.5 space-y-1.5">
              {note.items.slice(0, 3).map((it) => (
                <li key={it.title} className="flex items-center gap-2 text-[12px] text-label-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENT.orange }} />
                  <span className="truncate">{it.title}</span>
                </li>
              ))}
            </ul>
            {note.items.length > 3 && <p className="mt-2 text-[11px] font-semibold" style={{ color: tintText(ACCENT.orange) }}>{tt("+{0} yenilik daha", note.items.length - 3)}</p>}
          </button>
        </Panel>

        {/* Karne */}
        <Panel title={tt("Bu haftanın karnesi")} hint={tt("{0} / 100 puan", g.pts)} delay={0.15} right={<Arrow onClick={() => studioGo("report")} />}>
          <button onClick={() => studioGo("report")} className="flex w-full items-center gap-4 text-left">
            <GradeRing letter={g.letter} pts={g.pts} />
            <span className="min-w-0 text-[12.5px] leading-snug text-label-2">{g.empty ? tt("Biraz vakit geçirince karnen dolacak") : g.line}</span>
          </button>
        </Panel>

        {/* Kısayol tuşları */}
        <Panel title={tt("Kısayol tuşların")} hint={tt("{0} tuş", deck.length)} delay={0.18} right={<Arrow onClick={() => studioGo("keys")} />}>
          <div className="grid grid-cols-4 gap-1.5">
            {deck.slice(0, 8).map((k) => {
              const Icon = DECK_ICONS[k.icon] ?? Zap;
              return (
                <span
                  key={k.id}
                  title={k.label}
                  className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-[12px] border"
                  style={{ background: `linear-gradient(150deg, ${tintBg(k.color, 14)}, ${tintBg(k.color, 4)})`, borderColor: tintBg(k.color, 26), color: tintText(k.color) }}
                >
                  <Icon size={15} strokeWidth={2.3} />
                  <span className="w-full truncate px-1 text-center text-[9px] font-semibold">{k.label}</span>
                </span>
              );
            })}
          </div>
        </Panel>
      </div>
    </Page>
  );
}

/** Nook'un başının üstünde birkaç saniyede bir değişen selam */
function SpeechBubble() {
  const [text, setText] = useState(() => pickGreeting());
  const [shown, setShown] = useState(true);
  useEffect(() => {
    // 3,5 sn görünür, 5 sn susar, sonra yeni bir selam
    const t = window.setTimeout(() => (shown ? setShown(false) : (setText(pickGreeting()), setShown(true))), shown ? 3500 : 5000);
    return () => window.clearTimeout(t);
  }, [shown]);
  return (
    <div className="pointer-events-none absolute inset-x-[-40px] top-0 z-20 flex justify-center">
      <AnimatePresence>
        {shown && (
          <motion.div
            key={text}
            className="relative"
            initial={{ opacity: 0, y: 8, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 480, damping: 22, delay: 0.3 } }}
            exit={{ opacity: 0, y: -4, scale: 0.85, transition: { duration: 0.2 } }}
          >
            <div className="whitespace-nowrap rounded-[11px] bg-white px-3 py-1 text-[13px] font-bold tracking-tight text-black shadow-[0_6px_20px_-6px_rgba(255,255,255,0.35)]">{text}</div>
            <span className="absolute left-1/2 top-full -ml-[5px] h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Son 7 gün bilgisayar başında geçen süre (Nook'un seni bilgisayarda gördüğü, uyumadığı dakikalar):
 * çubuklar, bugün renkli; üstte haftalık toplam ve günlük ortalama.
 */
function WeekCard({ week }: { week: ReturnType<typeof lastWeek> }) {
  const max = Math.max(30, ...week.map((d) => d.stats.active));
  const total = week.reduce((a, d) => a + d.stats.active, 0);
  const days = week.filter((d) => d.stats.active > 0).length || 1;
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.05 }} className="nook-card flex flex-col rounded-[28px] p-6" title={tt("Nook'un seni bilgisayar başında gördüğü süre (o uyurken sayılmaz)")}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-[9px]" style={{ background: tintBg(ACCENT.purple, 20), color: tintText(ACCENT.purple) }}>
          <Monitor size={14} strokeWidth={2.4} />
        </span>
        <h2 className="text-[13.5px] font-bold tracking-tight text-label">{tt("Bilgisayar başında")}</h2>
        <span className="ml-auto text-[11px] text-label-3">{tt("son 7 gün")}</span>
      </div>
      <p className="mt-3 font-round text-[26px] font-extrabold leading-none tabular-nums text-label">{hm(total)}</p>
      <p className="mt-1 text-[11.5px] text-label-3">{tt("günde ortalama {0}", hm(total / days))}</p>
      <div className="mt-4 flex min-h-[96px] flex-1 items-end gap-2">
        {week.map((d, i) => {
          const today = i === 6;
          const frac = d.stats.active / max;
          return (
            <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${d.date.toLocaleDateString(locale(), { weekday: "long" })} · ${hm(d.stats.active)}`}>
              <motion.span
                className="w-full max-w-[28px] rounded-[8px]"
                initial={{ height: 4 }}
                animate={{ height: `${Math.max(4, frac * 100)}%` }}
                transition={{ ...SPRING, delay: 0.1 + i * 0.04 }}
                style={{
                  background: today ? `linear-gradient(180deg, color-mix(in srgb, ${ACCENT.purple} 70%, white), ${ACCENT.purple})` : tintBg(ACCENT.purple, d.stats.active ? 30 : 10),
                  boxShadow: today ? `0 6px 18px -6px ${ACCENT.purple}` : undefined,
                }}
              />
              <span className={`text-[10.5px] font-semibold ${today ? "text-label" : "text-label-3"}`}>{d.date.toLocaleDateString(locale(), { weekday: "narrow" })}</span>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

/** Bugünün sayısı ve düne göre farkı */
function TodayStat({ icon: Icon, color, label, value, sub, now, prev, unit, delay }: { icon: LucideIcon; color: string; label: string; value: string; sub?: string; now: number; prev: number; unit?: "glass" | "times"; delay: number }) {
  const diff = now - prev;
  const diffText = diff === 0 ? null : unit === "glass" ? tt("{0} bardak", Math.abs(diff)) : unit === "times" ? tt("{0} kez", Math.abs(diff)) : hm(Math.abs(diff));
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay }}
      whileHover={{ y: -2 }}
      className="relative flex min-w-0 flex-col overflow-hidden rounded-[22px] border p-4"
      style={{ background: `linear-gradient(160deg, ${tintBg(color, 12)}, ${tintBg(color, 3)})`, borderColor: tintBg(color, 24) }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: tintBg(color, 22), color: tintText(color) }}>
          <Icon size={17} strokeWidth={2.3} />
        </span>
        {diffText && (
          <span className="rounded-full px-2 py-[2px] text-[10.5px] font-semibold" style={diff > 0 ? { background: tintBg(ACCENT.green, 16), color: tintText(ACCENT.green) } : { background: "rgb(255 255 255 / 0.05)", color: "var(--color-label-3)" }}>
            {diff > 0 ? "↑" : "↓"} {diffText}
          </span>
        )}
      </div>
      <p className="mt-3 text-[12px] font-medium text-label-3">{label}</p>
      <p className="font-round text-[26px] font-extrabold leading-tight tabular-nums text-label">{value}</p>
      <p className="truncate text-[11px] text-label-3">{sub ?? (diffText ? (diff > 0 ? tt("dünden fazla") : tt("dünden az")) : tt("dünle aynı"))}</p>
    </motion.div>
  );
}

/** Karne harfi, puan kadar dolan halkanın içinde */
function GradeRing({ letter, pts }: { letter: string; pts: number }) {
  const c = LETTER_COLOR[letter as keyof typeof LETTER_COLOR];
  const r = 26;
  const len = 2 * Math.PI * r;
  return (
    <span className="relative flex h-[64px] w-[64px] shrink-0 items-center justify-center">
      <svg width={64} height={64} className="absolute inset-0 -rotate-90">
        <circle cx={32} cy={32} r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth={5} />
        <motion.circle cx={32} cy={32} r={r} fill="none" stroke={c} strokeWidth={5} strokeLinecap="round" strokeDasharray={len} initial={{ strokeDashoffset: len }} animate={{ strokeDashoffset: len * (1 - pts / 100) }} transition={{ duration: 0.9, delay: 0.25 }} />
      </svg>
      <span className="font-display text-[26px] font-bold leading-none" style={{ color: tintText(c) }}>
        {letter}
      </span>
    </span>
  );
}

/** Kahramandaki düğme: `solid` ise yazılı ve dolu, değilse yalnızca simge */
function Action({ icon: Icon, color, label, title, solid, onClick }: { icon: LucideIcon; color: string; label?: string; title?: string; solid?: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      title={title ?? label}
      className={`flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[13px] border text-[13px] font-bold ${label ? "px-3.5" : "w-10 justify-center"}`}
      style={
        solid
          ? { background: `linear-gradient(160deg, ${tintBg(color, 30)}, ${tintBg(color, 14)})`, borderColor: tintBg(color, 50), color: tintText(color), boxShadow: `0 8px 20px -12px ${color}` }
          : { background: tintBg(color, 10), borderColor: tintBg(color, 24), color: tintText(color) }
      }
    >
      <Icon size={16} strokeWidth={2.4} />
      {label}
    </motion.button>
  );
}

function Arrow({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-7 w-7 items-center justify-center rounded-full text-label-3 hover:bg-white/[0.06] hover:text-label">
      <ArrowRight size={14} />
    </button>
  );
}
