import { useEffect, useMemo, useState, useRef } from "react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { AnimatePresence, motion } from "motion/react";
import { Check, ExternalLink, Film, MessageCircle, Shuffle, Tv, X } from "lucide-react";
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
} from "../../lib/argus";
import { sendChat } from "../../lib/chat";
import { spring } from "../../lib/motion";
import { useNook } from "../../store/nook";
import { ACCENT, Bar, EmptyState, Segmented, tintBg, tintText } from "../ui/primitives";
import { ArgusPromo } from "../ArgusPromo";

const COLOR = ACCENT.orange;

type View = "watching" | "calendar" | "pick";
const VIEWS: { id: View; label: string }[] = [
  { id: "watching", label: "İzliyorum" },
  { id: "calendar", label: "Takvim" },
  { id: "pick", label: "Ne izlesem?" },
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
          <EmptyState title="Argus'u buldum" hint="Argus'ta profilini ve arşivini oluşturunca dizilerin burada görünür" color={COLOR} />
        </div>
        <button
          onClick={() => void openArgus()}
          className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium"
          style={{ background: tintBg(COLOR), color: tintText(COLOR) }}
        >
          Argus'u aç
          <ExternalLink size={10} />
        </button>
      </div>
    );

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Segmented id="argus-view" options={VIEWS} value={view} onChange={(v) => { setView(v); useArgus.setState({ focusId: null }); }} color={COLOR} />
        <button
          onClick={() => void openArgus()}
          title={snap.running ? "Argus açık" : "Argus'u aç"}
          className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] text-label-3 hover:bg-well-hi hover:text-label-2"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: snap.running ? ACCENT.green : "rgb(255 255 255 / 0.25)" }} />
          Argus
          <ExternalLink size={10} />
        </button>
      </div>
      <SuggestionBanner />
      <div ref={scroller} className="-mr-1.5 min-h-0 flex-1 overflow-y-auto pr-1.5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={focused ? `f${focused.id}` : view} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}>
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

function WatchedButton({ item, ep, label = "İzledim" }: { item: ArgusItem; ep?: { season: number; episode: number } | null; label?: string }) {
  const busy = useArgus((s) => s.busy === item.id);
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={spring.pop}
      disabled={busy}
      onClick={() => void markWatched(item, ep)}
      className="flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-[10.5px] font-medium disabled:opacity-60"
      style={{ background: tintBg(COLOR, 16), borderColor: tintBg(COLOR, 40), color: tintText(COLOR) }}
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
          title="Yalnızca bölümü işaretle"
        >
          <Check size={10} strokeWidth={2.8} />
          Bölüm
        </motion.button>
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
          title={ep ? `Bölümü işaretle, durumu ${st} yap` : `${st} olarak yaz (bugünün tarihiyle)`}
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
            {ep ? ` ${epLabel(ep)}` : ""} bitti mi?
          </p>
          <p className="text-[10px] text-label-3">Argus'a hangi durumla yazayım?</p>
        </div>
        <button onClick={() => answerSuggestion(sug)} title="Hayır" className="flex h-6 w-6 items-center justify-center rounded-full text-label-3 hover:bg-well-hi hover:text-label">
          <X size={12} />
        </button>
      </div>
      <StatusChoice item={item} ep={ep} />
    </motion.div>
  );
}

function Watching() {
  const snap = useArgus((s) => s.snap);
  const list = useMemo(() => watching(snap), [snap]);
  if (!list.length) return <EmptyState title="İzlediğin dizi yok" hint="Argus'ta durumu İzleniyor olan diziler burada" color={COLOR} />;
  return (
    <div className="space-y-1">
      {list.map((it) => {
        const s = it.series!;
        const soon = s.upcoming[0];
        return (
          <div key={it.id} className="flex items-center gap-2.5 rounded-[12px] px-1 py-1 hover:bg-white/[0.03]">
            <button onClick={() => useArgus.setState({ focusId: it.id })}>
              <Poster item={it} w={30} h={44} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-label">{it.title}</p>
              <p className="truncate text-[10.5px] text-label-3">
                {s.next ? `Sıradaki ${epLabel(s.next)}${s.next.name ? ` · ${s.next.name}` : ""}` : soon?.date ? `Güncelsin · yeni bölüm ${dayLabel(soon.date)}` : "Güncelsin"}
              </p>
              <Bar pct={s.aired ? (s.position / s.aired) * 100 : 0} color={COLOR} className="mt-1" />
            </div>
            {s.next && <WatchedButton item={it} ep={s.next} />}
          </div>
        );
      })}
    </div>
  );
}

function Calendar() {
  const snap = useArgus((s) => s.snap);
  const entries = useMemo(() => calendar(snap), [snap]);
  if (!entries.length) return <EmptyState title="Yakında bölüm yok" hint="Takip ettiğin dizilerin önümüzdeki iki haftası" color={COLOR} />;
  const days = [...new Set(entries.map((e) => e.date))];
  return (
    <div className="space-y-1.5">
      {days.map((d) => (
        <div key={d} className="flex gap-2">
          <span className="w-[62px] shrink-0 pt-1 text-[10.5px] font-medium" style={{ color: dayLabel(d) === "Bugün" ? tintText(COLOR) : "var(--color-label-3)" }}>
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
  { id: "all", label: "Hepsi" },
  { id: "film", label: "Film" },
  { id: "dizi", label: "Dizi" },
];
const LENGTH: { id: number; label: string }[] = [
  { id: 0, label: "Farketmez" },
  { id: 100, label: "Kısa" },
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
        <span className="ml-auto text-[10px] text-label-3">{pool.length} seçenek</span>
      </div>
      {item ? (
        <Detail item={item} actions={
          <>
            <button onClick={() => setSeed(Math.random())} className="flex h-6 items-center gap-1 rounded-full bg-well px-2 text-[10.5px] font-medium text-label-2 hover:bg-well-hi hover:text-label">
              <Shuffle size={11} /> Başka
            </button>
            <button
              onClick={() => {
                const st = useNook.getState();
                st.setTab("chat");
                void sendChat("Argus'taki izleneceklerimden bu akşam için bana bir şey önerir misin?");
              }}
              className="flex h-6 items-center gap-1 rounded-full bg-well px-2 text-[10.5px] font-medium text-label-2 hover:bg-well-hi hover:text-label"
            >
              <MessageCircle size={11} /> Nook seçsin
            </button>
          </>
        } />
      ) : (
        <EmptyState title="Uygun bir şey yok" hint="İzleneceklerde çıkmış bir yapım bulamadım" color={COLOR} />
      )}
    </div>
  );
}

/** Tek kayıt: afiş, bilgiler, sıradaki bölüm, İzledim */
function Detail({ item, actions }: { item: ArgusItem; actions?: React.ReactNode }) {
  const s = item.series;
  const year = item.release?.slice(0, 4);
  const meta = [year, item.genres.slice(0, 2).join(", "), item.runtime ? `${item.runtime} dk` : null, s ? `${s.aired} bölüm` : null].filter(Boolean).join(" · ");
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
        {s?.next && <p className="truncate text-[10.5px] text-label-2">Sıradaki: {epLabel(s.next)}{s.next.name ? ` · ${s.next.name}` : ""}</p>}
        {s && !s.next && s.upcoming[0]?.date && <p className="text-[10.5px] text-label-2">Yeni bölüm {dayLabel(s.upcoming[0].date)} ({epLabel(s.upcoming[0])})</p>}
        <div className="mt-auto flex flex-wrap gap-1.5 pt-0.5">
          {s ? s.next && <WatchedButton item={item} ep={s.next} label={`${epLabel(s.next)} izledim`} /> : <WatchedButton item={item} />}
          {actions}
        </div>
      </div>
    </div>
  );
}
