/**
 * Studio › Argus: Argus'un kendi renkleriyle izlediğin diziler (sıradaki bölüm, ilerleme, "İzledim"),
 * yayın takvimi, "Ne izlesem?" ve Argus ayarları. Argus bu bilgisayarda yoksa tanıtımı görünür.
 */
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Check, ExternalLink, Film, ListVideo, Shuffle, Tv, type LucideIcon } from "lucide-react";
import symbol from "../../assets/argus/symbol.png";
import wordmark from "../../assets/argus/wordmark.png";
import { calendar, dayLabel, epLabel, markWatched, openArgus, pickPool, posterSrc, useArgus, watching, weekStats, type ArgusItem } from "../../lib/argus";
import { ARGUS_BLUE, ARGUS_CYAN, ARGUS_DEEP, ARGUS_GRADIENT, ArgusPromo } from "../../components/ArgusPromo";
import { ArgusSection, SettingsLook } from "../../components/panels/SettingsPanel";
import { ACCENT, tintBg, tintText } from "../../components/ui/primitives";
import { tt } from "../../lib/i18n";
import { Page, Panel } from "../ui";

const SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;

export function ArgusPage() {
  const snap = useArgus((s) => s.snap);
  if (!snap)
    return (
      <Page>
        <div className="nook-card mx-auto mt-6 max-w-[620px] overflow-hidden rounded-[28px] p-8">
          <ArgusPromo big />
        </div>
        <SettingsLook.Provider value="studio">
          <div className="mx-auto mt-4 max-w-[620px]">
            <ArgusSection />
          </div>
        </SettingsLook.Provider>
      </Page>
    );

  return (
    <Page wide>
      <Hero />
      {snap.boardId ? (
        <>
          <Stats />
          <div className="mb-4 grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-4">
            <Watching />
            <div className="flex min-w-0 flex-col gap-4">
              <Pick />
              <Upcoming />
            </div>
          </div>
        </>
      ) : (
        <Panel className="mb-4">
          <p className="text-[13px] text-label-2">{tt("Argus'ta profilini ve arşivini oluşturunca dizilerin burada görünür")}</p>
        </Panel>
      )}
      <SettingsLook.Provider value="studio">
        <ArgusSection />
      </SettingsLook.Provider>
    </Page>
  );
}

/** Üstte Argus'un camgöbeği → mavi geçişli kartı: logo, profil, açık mı */
function Hero() {
  const snap = useArgus((s) => s.snap)!;
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="relative mb-4 flex items-center gap-6 overflow-hidden rounded-[28px] border px-8 py-6"
      style={{ background: `linear-gradient(120deg, ${tintBg(ARGUS_CYAN, 16)}, ${tintBg(ARGUS_DEEP, 22)} 60%, #0b1220)`, borderColor: tintBg(ARGUS_BLUE, 34) }}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-[300px] w-[360px] rounded-full opacity-70" style={{ background: `radial-gradient(circle, ${tintBg(ARGUS_CYAN, 34)}, transparent 65%)` }} />
      <motion.img
        src={symbol}
        alt=""
        draggable={false}
        className="relative shrink-0"
        style={{ width: 84, filter: `drop-shadow(0 0 22px ${tintBg(ARGUS_BLUE, 70)})` }}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative min-w-0 flex-1">
        <img src={wordmark} alt="Argus" draggable={false} style={{ height: 30 }} />
        <p className="mt-2 text-[13px] text-label-2">{tt("Dizi ve film arşivin. Nook izlediğini fark eder, yeni bölümleri haber verir.")}</p>
        <div className="mt-2.5 flex items-center gap-2 text-[12px]">
          <span className="rounded-full px-2.5 py-[3px] font-semibold" style={{ background: tintBg(ARGUS_CYAN, 18), color: tintText(ARGUS_CYAN) }}>
            {tt("Profil: {0}", snap.profile)}
          </span>
          <span className="flex items-center gap-1.5 text-label-3">
            <span className="h-2 w-2 rounded-full" style={{ background: snap.running ? ACCENT.green : "rgb(255 255 255 / 0.25)" }} />
            {snap.running ? tt("Argus açık") : tt("Argus kapalı")}
          </span>
        </div>
      </div>
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => void openArgus()}
        className="relative flex h-11 shrink-0 items-center gap-2 rounded-[14px] px-5 text-[13.5px] font-bold text-white"
        style={{ background: ARGUS_GRADIENT, boxShadow: `0 10px 26px -10px ${ARGUS_DEEP}` }}
      >
        {tt("Argus'u aç")} <ExternalLink size={15} />
      </motion.button>
    </motion.section>
  );
}

function Stats() {
  const snap = useArgus((s) => s.snap);
  const w = weekStats(snap);
  const list: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Tv, label: tt("Bu hafta bölüm"), value: String(w?.episodes ?? 0) },
    { icon: Film, label: tt("Bu hafta film"), value: String(w?.movies ?? 0) },
    { icon: ListVideo, label: tt("İzlediğin dizi"), value: String(watching(snap).length) },
    { icon: CalendarDays, label: tt("İzleneceklerin"), value: String(pickPool(snap).length) },
  ];
  return (
    <div className="mb-4 grid grid-cols-4 gap-3">
      {list.map((x, i) => (
        <motion.div
          key={x.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.04 + i * 0.03 }}
          className="flex items-center gap-3 rounded-[20px] border px-4 py-3.5"
          style={{ background: `linear-gradient(160deg, ${tintBg(ARGUS_BLUE, 12)}, ${tintBg(ARGUS_BLUE, 3)})`, borderColor: tintBg(ARGUS_BLUE, 24) }}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]" style={{ background: tintBg(ARGUS_CYAN, 20), color: tintText(ARGUS_CYAN) }}>
            <x.icon size={18} strokeWidth={2.3} />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block font-round text-[24px] font-extrabold tabular-nums text-label">{x.value}</span>
            <span className="block truncate text-[11.5px] text-label-3">{x.label}</span>
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function Poster({ item, w, h }: { item: ArgusItem; w: number; h: number }) {
  const src = posterSrc(item);
  return src ? (
    <img src={src} alt="" draggable={false} className="shrink-0 rounded-[10px] object-cover" style={{ width: w, height: h }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-[10px] text-label-3" style={{ width: w, height: h, background: `linear-gradient(160deg, ${tintBg(ARGUS_CYAN, 18)}, ${tintBg(ARGUS_DEEP, 14)})` }}>
      {item.series ? <Tv size={w * 0.4} style={{ color: tintText(ARGUS_CYAN) }} /> : <Film size={w * 0.4} style={{ color: tintText(ARGUS_CYAN) }} />}
    </span>
  );
}

function WatchedButton({ item, ep }: { item: ArgusItem; ep?: { season: number; episode: number } | null }) {
  const busy = useArgus((s) => s.busy === item.id);
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      disabled={busy}
      onClick={() => void markWatched(item, ep)}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-bold text-white disabled:opacity-60"
      style={{ background: ARGUS_GRADIENT, boxShadow: `0 6px 16px -8px ${ARGUS_DEEP}` }}
    >
      {busy ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }} className="h-3 w-3 rounded-full border-2 border-current border-t-transparent" /> : <Check size={13} strokeWidth={2.8} />}
      {tt("İzledim")}
    </motion.button>
  );
}

/** İzlemekte olduğun diziler: sıradaki bölüm, ilerleme çubuğu, "İzledim" */
function Watching() {
  const snap = useArgus((s) => s.snap);
  const list = watching(snap);
  return (
    <Panel title={tt("İzliyorum")} hint={tt("{0} dizi · en son dokunduğun en üstte", list.length)} delay={0.08}>
      {!list.length && <p className="py-6 text-center text-[12.5px] text-label-3">{tt("Şu an izlediğin bir dizi yok")}</p>}
      <div className="space-y-2">
        {list.slice(0, 8).map((it) => {
          const s = it.series!;
          const p = s.aired ? s.seen / s.aired : 0;
          return (
            <div key={it.id} className="flex items-center gap-3.5 rounded-[16px] border border-white/[0.05] bg-white/[0.025] p-2.5">
              <Poster item={it} w={44} h={62} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-label">{it.title}</p>
                <p className="truncate text-[12px]" style={{ color: tintText(ARGUS_CYAN) }}>
                  {s.next ? `${epLabel(s.next)} · ${s.next.name}` : tt("Yeni bölüm bekleniyor")}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.span className="block h-full rounded-full" style={{ background: ARGUS_GRADIENT }} initial={{ width: 0 }} animate={{ width: `${Math.max(3, p * 100)}%` }} transition={{ duration: 0.7, delay: 0.2 }} />
                  </span>
                  <span className="shrink-0 text-[10.5px] tabular-nums text-label-3">
                    {s.seen}/{s.aired}
                  </span>
                </div>
              </div>
              {s.next && <WatchedButton item={it} ep={s.next} />}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/** Ne izlesem: izleneceklerden rastgele bir tane, bir daha basınca başkası */
function Pick() {
  const snap = useArgus((s) => s.snap);
  const pool = useMemo(() => pickPool(snap), [snap]);
  const [n, setN] = useState(0);
  const it = pool.length ? pool[(n * 7919) % pool.length] : null;
  return (
    <Panel
      title={tt("Ne izlesem?")}
      hint={tt("İzleneceklerinden {0} seçenek", pool.length)}
      delay={0.11}
      right={
        <motion.button
          whileTap={{ scale: 0.9, rotate: -20 }}
          onClick={() => setN((x) => x + 1 + Math.floor(Math.random() * 5))}
          disabled={pool.length < 2}
          title={tt("Başka")}
          className="flex h-8 w-8 items-center justify-center rounded-[10px] disabled:opacity-40"
          style={{ background: tintBg(ARGUS_CYAN, 18), color: tintText(ARGUS_CYAN) }}
        >
          <Shuffle size={15} />
        </motion.button>
      }
    >
      <AnimatePresence mode="wait">
        {it ? (
          <motion.div key={it.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.16 }} className="flex items-center gap-3.5">
            <Poster item={it} w={58} h={82} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[14px] font-bold leading-snug text-label">{it.title}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-label-3">{[it.kind, it.runtime ? tt("{0} dk", it.runtime) : null, it.genres.slice(0, 2).join(", ")].filter(Boolean).join(" · ")}</p>
              {!it.series && (
                <div className="mt-2">
                  <WatchedButton item={it} />
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <p className="py-4 text-center text-[12.5px] text-label-3">{tt("İzlenecek listen boş")}</p>
        )}
      </AnimatePresence>
    </Panel>
  );
}

/** Önümüzdeki iki haftanın bölümleri, güne göre */
function Upcoming() {
  const snap = useArgus((s) => s.snap);
  const list = calendar(snap).slice(0, 6);
  return (
    <Panel title={tt("Yayın takvimi")} hint={tt("Takip ettiğin dizilerin yeni bölümleri")} delay={0.14} className="flex-1">
      {!list.length && <p className="py-4 text-center text-[12.5px] text-label-3">{tt("Yakında yeni bölüm yok")}</p>}
      <div className="space-y-1.5">
        {list.map((c) => {
          const today = dayLabel(c.date) === tt("Bugün");
          return (
            <div key={`${c.item.id}-${c.ep.season}-${c.ep.episode}`} className="flex items-center gap-3 rounded-[12px] px-2 py-1.5">
              <span
                className="w-[74px] shrink-0 rounded-[8px] py-1 text-center text-[11px] font-bold"
                style={today ? { background: ARGUS_GRADIENT, color: "#fff" } : { background: tintBg(ARGUS_BLUE, 12), color: tintText(ARGUS_CYAN) }}
              >
                {dayLabel(c.date)}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-semibold text-label">{c.item.title}</span>
                <span className="block truncate text-[11px] text-label-3">
                  {epLabel(c.ep)} · {c.ep.name}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
