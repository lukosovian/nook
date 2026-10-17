import { useEffect, useMemo, useState, useRef } from "react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { AnimatePresence, motion } from "motion/react";
import { Check, ExternalLink, Film, MessageCircle, Plus, Shuffle, Tv, X } from "lucide-react";
import {
  calendar,
  dayLabel,
  epLabel,
  findItem,
  markWatched,
  openArgus,
  pickPool,
  posterSrc,
  useArgus,
  watching,
  type ArgusItem,
  type PickFilter,
  answerSuggestion,
  addFresh,
  skipFresh,
} from "../../lib/argus";
import { sendChat } from "../../lib/chat";
import { spring } from "../../lib/motion";
import { dayKey, useNook } from "../../store/nook";
import { ACCENT, EmptyState, Segmented, tintBg, tintText } from "../ui/primitives";
import { ARGUS_CYAN, ARGUS_DEEP, ARGUS_GRADIENT, ArgusPromo } from "../ArgusPromo";
import { tt } from "../../lib/i18n";

/** Argus'un kendi renkleri (uygulamadaki camgöbeği → mavi) */
const COLOR = ARGUS_CYAN;

type View = "watching" | "calendar" | "pick";
const VIEWS: { id: View; label: string }[] = [
  { id: "watching", label: tt("İzliyorum") },
  { id: "calendar", label: tt("Takvim") },
  { id: "pick", label: tt("Ne izlesem?") },
];

/** Argus: izlediğin diziler, yayın takvimi, izleneceklerden öneri. */
export function ArgusPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("argus", scroller);
  const snap = useArgus((s) => s.snap);
  const focusId = useArgus((s) => s.focusId);
  const [view, setView] = useState<View>("watching");
  const focused = focusId ? findItem(focusId) : null;
  // Bölümden çıkınca aramadan açılan ayrıntı kapansın
  useEffect(() => () => useArgus.setState({ focusId: null }), []);

  if (!snap) return <ArgusPromo />;
  if (!snap.boardId)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <div className="h-[110px]">
          <EmptyState title={tt("Argus'u buldum")} hint={tt("Argus'ta profilini ve arşivini oluşturunca dizilerin burada görünür")} color={COLOR} />
        </div>
        <button
          onClick={() => void openArgus()}
          className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium"
          style={{ background: tintBg(COLOR), color: tintText(COLOR) }}
        >{tt("Argus'u aç")}<ExternalLink size={10} />
        </button>
      </div>
    );

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Segmented id="argus-view" options={VIEWS} value={view} onChange={(v) => { setView(v); useArgus.setState({ focusId: null }); }} color={COLOR} />
        <button
          onClick={() => void openArgus()}
          title={snap.running ? tt("Argus açık") : tt("Argus'u aç")}
          className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] text-label-3 hover:bg-well-hi hover:text-label-2"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: snap.running ? ACCENT.green : "rgb(255 255 255 / 0.25)" }} />
          Argus
          <ExternalLink size={10} />
        </button>
      </div>
      <SuggestionBanner />
      <FreshBanner />
      <div ref={scroller} className={`min-h-0 flex-1 ${view === "watching" && !focused ? "" : "-mr-1.5 overflow-y-auto pr-1.5"}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={focused ? `f${focused.id}` : view} className={view === "watching" && !focused ? "h-full" : ""} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}>
            {focused ? <Detail item={focused} /> : view === "watching" ? <Watching /> : view === "calendar" ? <Calendar /> : <Pick />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Poster({ item, w, h }: { item: ArgusItem; w: number; h: number }) {
  const src = posterSrc(item);
  return src ? (
    <img src={src} alt="" draggable={false} className="shrink-0 rounded-[6px] object-cover" style={{ width: w, height: h }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-[6px] bg-well text-label-3" style={{ width: w, height: h }}>
      {item.series ? <Tv size={w * 0.45} /> : <Film size={w * 0.45} />}
    </span>
  );
}

function WatchedButton({ item, ep, label = tt("İzledim"), wide }: { item: ArgusItem; ep?: { season: number; episode: number } | null; label?: string; wide?: boolean }) {
  const busy = useArgus((s) => s.busy === item.id);
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={spring.pop}
      disabled={busy}
      onClick={() => void markWatched(item, ep)}
      className={`flex h-6 shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-[10.5px] font-semibold text-white disabled:opacity-60 ${wide ? "w-full" : ""}`}
      style={{ background: ARGUS_GRADIENT, boxShadow: `0 4px 12px -6px ${ARGUS_DEEP}` }}
    >
      {busy ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }} className="h-2.5 w-2.5 rounded-full border-[1.5px] border-current border-t-transparent" /> : <Check size={11} strokeWidth={2.8} />}
      {label}
    </motion.button>
  );
}

/** İzledikten sonra hangi durum işaretlensin — Argus'taki kendi durumların */
function StatusChoice({ item, ep }: { item: ArgusItem; ep: { season: number; episode: number } | null }) {
  const statuses = useArgus((s) => s.snap?.statuses ?? []);
  const busy = useArgus((s) => s.busy === item.id);
  const chip = "flex h-5 shrink-0 items-center gap-1 rounded-full border px-1.5 text-[10px] font-medium disabled:opacity-50";
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {ep && (
        <motion.button
          whileTap={{ scale: 0.92 }}
          disabled={busy}
          onClick={() => void markWatched(item, ep)}
          className={chip}
          style={{ background: tintBg(COLOR, 16), borderColor: tintBg(COLOR, 40), color: tintText(COLOR) }}
          title={tt("Yalnızca bölümü işaretle")}
        >
          <Check size={10} strokeWidth={2.8} />{tt("Bölüm")}</motion.button>
      )}
      {statuses.map((st) => (
        <motion.button
          key={st}
          whileTap={{ scale: 0.92 }}
          disabled={busy}
          onClick={() => void markWatched(item, ep, st)}
          className={chip}
          style={
            item.status === st
              ? { background: tintBg(COLOR, 16), borderColor: tintBg(COLOR, 40), color: tintText(COLOR) }
              : { background: "rgb(255 255 255 / 0.04)", borderColor: "rgb(255 255 255 / 0.08)", color: "var(--color-label-2)" }
          }
          title={ep ? tt("Bölümü işaretle, durumu {0} yap", st) : tt("{0} olarak yaz (bugünün tarihiyle)", st)}
        >
          {st}
        </motion.button>
      ))}
    </div>
  );
}

/** "Lanterns S1B8 bitti mi?" — tarayıcıda izlediği tanındığında */
function SuggestionBanner() {
  const sug = useArgus((s) => s.suggestion);
  useArgus((s) => s.snap);
  const item = sug ? findItem(sug.itemId) : null;
  if (!sug || !item) return null;
  const ep = sug.season && sug.episode ? { season: sug.season, episode: sug.episode } : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[12px] border px-2 py-1.5"
      style={{ background: tintBg(COLOR, 10), borderColor: tintBg(COLOR, 30) }}
    >
      <div className="flex items-center gap-2">
        <Poster item={item} w={18} h={26} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[11.5px] font-medium" style={{ color: tintText(COLOR) }}>
            {item.title}
            {ep ? ` ${epLabel(ep)}` : ""}{" "}{tt("bitti mi?")}</p>
          <p className="text-[10px] text-label-3">{tt("Argus'a hangi durumla yazayım?")}</p>
        </div>
        <button onClick={() => answerSuggestion(sug)} title={tt("Hayır")} className="flex h-6 w-6 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label">
          <X size={12} />
        </button>
      </div>
      <StatusChoice item={item} ep={ep} />
    </motion.div>
  );
}

/** "Avatar: Aang izliyorsun ama Argus'ta yok — ekleyeyim mi?" */
function FreshBanner() {
  const f = useArgus((s) => s.fresh);
  const busy = useArgus((s) => !!f && s.busy === f.key);
  if (!f) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 rounded-[12px] border px-2 py-1.5"
      style={{ background: tintBg(COLOR, 10), borderColor: tintBg(COLOR, 30) }}
    >
      {f.poster ? (
        <img src={f.poster} alt="" draggable={false} className="shrink-0 rounded-[5px] object-cover" style={{ width: 22, height: 32 }} />
      ) : (
        <span className="flex shrink-0 items-center justify-center rounded-[5px] bg-well text-label-3" style={{ width: 22, height: 32 }}>
          {f.mediaType === "tv" ? <Tv size={10} /> : <Film size={10} />}
        </span>
      )}
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[11.5px] font-medium" style={{ color: tintText(COLOR) }}>
          {f.title}
          {f.year ? <span className="font-normal text-label-3"> · {f.year}</span> : null}
        </p>
        <p className="text-[10px] text-label-3">{tt("İzliyorsun ama Argus'ta yok")}</p>
      </div>
      <motion.button
        whileTap={{ scale: 0.92 }}
        transition={spring.pop}
        disabled={busy}
        onClick={() => void addFresh(f)}
        className="flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-[10.5px] font-medium disabled:opacity-60"
        style={{ background: tintBg(COLOR, 16), borderColor: tintBg(COLOR, 40), color: tintText(COLOR) }}
      >
        {busy ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }} className="h-2.5 w-2.5 rounded-full border-[1.5px] border-current border-t-transparent" /> : <Plus size={11} strokeWidth={2.8} />}
        {tt("Ekle")}
      </motion.button>
      <button onClick={() => skipFresh(f)} title={tt("Ekleme")} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label">
        <X size={12} />
      </button>
    </motion.div>
  );
}

/** İzlediğin diziler: yan yana kartlar (afiş, sıradaki bölüm, ilerleme, "izledim"); fazlası yana kayar */
function Watching() {
  const snap = useArgus((s) => s.snap);
  const list = useMemo(() => watching(snap), [snap]);
  if (!list.length) return <EmptyState title={tt("İzlediğin dizi yok")} hint={tt("Argus'ta durumu İzleniyor olan diziler burada")} color={COLOR} />;
  return (
    <div className="no-scrollbar -mx-0.5 flex h-full gap-2 overflow-x-auto px-0.5" onWheel={(e) => (e.currentTarget.scrollLeft += e.deltaY)}>
      {list.map((it, i) => (
        <SeriesCard key={it.id} item={it} delay={i * 0.03} />
      ))}
    </div>
  );
}

function SeriesCard({ item: it, delay }: { item: ArgusItem; delay: number }) {
  const s = it.series!;
  const soon = s.upcoming[0];
  const src = posterSrc(it);
  const pct = s.aired ? (s.position / s.aired) * 100 : 0;
  const fresh = !!s.next?.date && s.next.date === dayKey();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.pop, delay }}
      className="relative flex h-full w-[158px] shrink-0 flex-col overflow-hidden rounded-[16px] border"
      style={{ borderColor: tintBg(COLOR, 26), background: tintBg(ARGUS_DEEP, 8) }}
    >
      {/* Afiş: kartın üstü, aşağı doğru karta karışır */}
      <button onClick={() => useArgus.setState({ focusId: it.id })} className="relative h-[92px] shrink-0 overflow-hidden" title={tt("Ayrıntı")}>
        {src ? (
          <img src={src} alt="" draggable={false} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-label-3" style={{ background: `linear-gradient(140deg, ${tintBg(COLOR, 30)}, ${tintBg(ARGUS_DEEP, 40)})` }}>
            <Tv size={26} strokeWidth={1.6} />
          </span>
        )}
        <span className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 35%, rgb(10 14 22 / 0.95) 100%)" }} />
        {it.genres[0] && (
          <span className="absolute left-2 top-2 rounded-[6px] bg-black/55 px-1.5 py-[1px] text-[9px] font-semibold backdrop-blur-sm" style={{ color: tintText(COLOR) }}>
            {it.genres[0]}
          </span>
        )}
        {fresh && (
          <span className="absolute right-2 top-2 rounded-[6px] px-1.5 py-[1px] text-[9px] font-bold text-black" style={{ background: COLOR }}>
            {tt("YENİ")}
          </span>
        )}
      </button>
      <div className="-mt-3 flex min-h-0 flex-1 flex-col px-2.5 pb-2.5">
        <p className="relative truncate text-[12.5px] font-bold leading-tight text-label">{it.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-label-3">
          {s.next ? `${epLabel(s.next)}${s.next.name ? ` · ${s.next.name}` : ""}` : soon?.date ? tt("Güncelsin · yeni bölüm {0}", dayLabel(soon.date)) : tt("Güncelsin")}
        </p>
        <div className="mt-auto">
          <div className="mb-1 flex items-center justify-between text-[9.5px] tabular-nums">
            <span className="text-label-3">{s.next ? epLabel(s.next) : tt("Bitti")}</span>
            <span className="font-semibold" style={{ color: tintText(COLOR) }}>
              {s.position}/{s.aired}
            </span>
          </div>
          <span className="block h-[4px] overflow-hidden rounded-full bg-white/[0.07]">
            <span className="block h-full rounded-full" style={{ width: `${Math.max(3, pct)}%`, background: ARGUS_GRADIENT }} />
          </span>
          <div className="mt-2">{s.next ? <WatchedButton item={it} ep={s.next} label={tt("+1 bölüm izledim")} wide /> : <div className="h-6" />}</div>
        </div>
      </div>
    </motion.div>
  );
}

function Calendar() {
  const snap = useArgus((s) => s.snap);
  const entries = useMemo(() => calendar(snap), [snap]);
  if (!entries.length) return <EmptyState title={tt("Yakında bölüm yok")} hint={tt("Takip ettiğin dizilerin önümüzdeki iki haftası")} color={COLOR} />;
  const days = [...new Set(entries.map((e) => e.date))];
  return (
    <div className="space-y-1.5">
      {days.map((d) => (
        <div key={d} className="flex gap-2">
          <span className="w-[62px] shrink-0 pt-1 text-[10.5px] font-medium" style={{ color: dayLabel(d) === tt("Bugün") ? tintText(COLOR) : "var(--color-label-3)" }}>
            {dayLabel(d)}
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-1">
            {entries
              .filter((e) => e.date === d)
              .map((e) => (
                <button
                  key={e.item.id + epLabel(e.ep)}
                  onClick={() => useArgus.setState({ focusId: e.item.id })}
                  className="flex max-w-full items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2 text-[10.5px]"
                  style={{ background: tintBg(COLOR, 8), borderColor: tintBg(COLOR, 24) }}
                >
                  <Poster item={e.item} w={16} h={22} />
                  <span className="truncate text-label">{e.item.title}</span>
                  <span className="shrink-0 tabular-nums" style={{ color: tintText(COLOR) }}>
                    {epLabel(e.ep)}
                  </span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const KINDS: { id: NonNullable<PickFilter["kind"]>; label: string }[] = [
  { id: "all", label: tt("Hepsi") },
  { id: "film", label: tt("Film") },
  { id: "dizi", label: tt("Dizi") },
];
const LENGTH: { id: number; label: string }[] = [
  { id: 0, label: tt("Farketmez") },
  { id: 100, label: tt("Kısa") },
];

function Pick() {
  const snap = useArgus((s) => s.snap);
  const [kind, setKind] = useState<NonNullable<PickFilter["kind"]>>("all");
  const [len, setLen] = useState(0);
  const [seed, setSeed] = useState(() => Math.random());
  const pool = useMemo(() => pickPool(snap, { kind, maxMinutes: len || null }), [snap, kind, len]);
  const item = pool.length ? pool[Math.floor(seed * pool.length) % pool.length] : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Segmented id="argus-kind" options={KINDS} value={kind} onChange={setKind} color={COLOR} />
        <Segmented id="argus-len" options={LENGTH} value={len} onChange={setLen} color={COLOR} />
        <span className="ml-auto text-[10px] text-label-3">{pool.length}{" "}{tt("seçenek")}</span>
      </div>
      {item ? (
        <Detail item={item} actions={
          <>
            <button onClick={() => setSeed(Math.random())} className="flex h-6 items-center gap-1 rounded-full bg-well px-2 text-[10.5px] font-medium text-label-2 hover:bg-well-hi hover:text-label">
              <Shuffle size={11} />{" "}{tt("Başka")}</button>
            <button
              onClick={() => {
                const st = useNook.getState();
                st.setTab("chat");
                void sendChat(tt("Argus'taki izleneceklerimden bu akşam için bana bir şey önerir misin?"));
              }}
              className="flex h-6 items-center gap-1 rounded-full bg-well px-2 text-[10.5px] font-medium text-label-2 hover:bg-well-hi hover:text-label"
            >
              <MessageCircle size={11} />{" "}{tt("Nook seçsin")}</button>
          </>
        } />
      ) : (
        <EmptyState title={tt("Uygun bir şey yok")} hint={tt("İzleneceklerde çıkmış bir yapım bulamadım")} color={COLOR} />
      )}
    </div>
  );
}

/** Tek kayıt: afiş, bilgiler, sıradaki bölüm, İzledim */
function Detail({ item, actions }: { item: ArgusItem; actions?: React.ReactNode }) {
  const s = item.series;
  const year = item.release?.slice(0, 4);
  const meta = [year, item.genres.slice(0, 2).join(", "), item.runtime ? tt("{0} dk", item.runtime) : null, s ? tt("{0} bölüm", s.aired) : null].filter(Boolean).join(" · ");
  const focus = useArgus((st) => st.focusId === item.id);
  return (
    <div className="flex gap-3">
      <Poster item={item} w={58} h={86} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight text-label">{item.title}</p>
            {item.original && <p className="truncate text-[10.5px] text-label-3">{item.original}</p>}
          </div>
          {focus && (
            <button onClick={() => useArgus.setState({ focusId: null })} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label">
              <X size={11} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {item.status && (
            <span className="rounded-full border px-1.5 py-px text-[10px]" style={{ background: tintBg(COLOR, 12), borderColor: tintBg(COLOR, 32), color: tintText(COLOR) }}>
              {item.status}
            </span>
          )}
          {item.kind && <span className="rounded-full bg-well px-1.5 py-px text-[10px] text-label-2">{item.kind}</span>}
          {item.score != null && <span className="text-[10px] text-label-2">★ {item.score.toFixed(1)}</span>}
        </div>
        <p className="truncate text-[10.5px] text-label-3">{meta}</p>
        {s?.next && <p className="truncate text-[10.5px] text-label-2">{tt("Sıradaki:")}{" "}{epLabel(s.next)}{s.next.name ? ` · ${s.next.name}` : ""}</p>}
        {s && !s.next && s.upcoming[0]?.date && <p className="text-[10.5px] text-label-2">{tt("Yeni bölüm")}{" "}{dayLabel(s.upcoming[0].date)} ({epLabel(s.upcoming[0])})</p>}
        <div className="mt-auto flex flex-wrap gap-1.5 pt-0.5">
          {s ? s.next && <WatchedButton item={item} ep={s.next} label={`${epLabel(s.next)} izledim`} /> : <WatchedButton item={item} />}
          {actions}
        </div>
      </div>
    </div>
  );
}
