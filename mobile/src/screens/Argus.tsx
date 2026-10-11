import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Plus, Search, Shuffle, Sparkles } from "lucide-react";
import { argusAdd, argusEpisodes, argusMark, argusSearch, argusSetEpisodes, argusSummary, today, type ArgusItem, type ArgusSeason, type ArgusSummary, type Pairing, type TmdbHit } from "../lib/pc";
import { pickSomething, type Pick } from "../lib/neIzlesem";
import { Cover, errText, Sheet, tintBg, TopBar, useBackButton, useToast } from "../ui";

const ORANGE = "#f2a33a";
type Tab = "pick" | "continue" | "log";

const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");
const epLabel = (s: number, e: number) => `${s}. sezon ${e}. bölüm`;

/** Argus: Ne izlesem? · Devam (dizilerde sıradaki bölüm) · İzledim (ara, işaretle, TMDB'den ekle) */
export function ArgusScreen({ pairing, onBack }: { pairing: Pairing; onBack: () => void }) {
  useBackButton(onBack);
  const [toast, say] = useToast();
  const [tab, setTab] = useState<Tab>(() => (import.meta.env.DEV && (new URLSearchParams(location.search).get("tab") as Tab)) || "pick");
  const [summary, setSummary] = useState<ArgusSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [marking, setMarking] = useState<ArgusItem | null>(null);

  const load = async () => {
    try {
      const sum = await argusSummary(pairing);
      setSummary(sum);
      setLoadError(null);
      // Önizleme: ?demo=argus&open=1 → o kaydın penceresi açık
      const open = import.meta.env.DEV ? new URLSearchParams(location.search).get("open") : null;
      if (open) setMarking(sum.items.find((i) => i.id === open) ?? null);
    } catch (e) {
      setLoadError(errText(e));
    }
  };
  useEffect(() => void load(), [pairing]); // eslint-disable-line react-hooks/exhaustive-deps

  const byId = useMemo(() => new Map(summary?.items.map((i) => [i.id, i]) ?? []), [summary]);

  const mark = async (item: ArgusItem, season?: number, episode?: number) => {
    try {
      const r = await argusMark(pairing, item.id, season, episode);
      say(r.completed ? `${item.title}: hepsi izlendi, İzlendi yapıldı` : season ? `${item.title} · ${epLabel(season, episode!)} izlendi` : `${item.title} izlendi`);
      setMarking(null);
      void load();
    } catch (e) {
      say(errText(e));
    }
  };

  return (
    <div className="safe flex min-h-screen flex-col gap-4 px-4">
      <TopBar title="Argus" nook="argus" onBack={() => history.back()} />

      <div className="flex gap-1 rounded-2xl bg-card p-1">
        {(
          [
            ["pick", "Ne izlesem?"],
            ["continue", "Devam"],
            ["log", "İzledim"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex-1 rounded-xl py-2.5 text-[13.5px] font-semibold ${tab === id ? "bg-well-hi text-label" : "text-label-3"}`}>
            {label}
          </button>
        ))}
      </div>

      {loadError && <p className="rounded-3xl bg-red/10 p-4 text-[13.5px] text-red">{loadError}</p>}
      {!summary && !loadError && <p className="py-10 text-center text-[13.5px] text-label-3">Argus okunuyor…</p>}

      {summary && tab === "pick" && <PickTab pairing={pairing} summary={summary} byId={byId} onMark={setMarking} onAdded={load} say={say} />}
      {summary && tab === "continue" && <ContinueTab pairing={pairing} summary={summary} onMark={mark} onOpen={setMarking} />}
      {summary && tab === "log" && <LogTab pairing={pairing} summary={summary} onPick={setMarking} onAdded={load} say={say} />}

      <AnimatePresence>
        {marking && (
          <MarkSheet
            key={marking.id}
            pairing={pairing}
            item={marking}
            onClose={() => setMarking(null)}
            onMark={mark}
            onSaved={(msg) => {
              say(msg);
              setMarking(null);
              void load();
            }}
          />
        )}
      </AnimatePresence>
      {toast}
    </div>
  );
}

// ---------------------------------------------------------------- Ne izlesem?

function PickTab({
  pairing,
  summary,
  byId,
  onMark,
  onAdded,
  say,
}: {
  pairing: Pairing;
  summary: ArgusSummary;
  byId: Map<string, ArgusItem>;
  onMark: (i: ArgusItem) => void;
  onAdded: () => void;
  say: (t: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Pick | null>(null);
  const [winner, setWinner] = useState<Pick | null>(null);
  const [adding, setAdding] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const go = async () => {
    setBusy(true);
    setWinner(null);
    try {
      const { winner, shown } = await pickSomething(pairing, summary.profileId);
      // Adaylar gittikçe yavaşlayarak art arda geçer, sonuncusu kazanan
      let t = 0;
      shown.forEach((p, i) => {
        t += 90 + i * i * 7;
        timers.current.push(window.setTimeout(() => setFlash(p), t));
      });
      timers.current.push(
        window.setTimeout(() => {
          setFlash(null);
          setWinner(winner);
          setBusy(false);
        }, t + 500),
      );
    } catch (e) {
      say(errText(e));
      setBusy(false);
    }
  };

  const item = winner?.rowId ? byId.get(winner.rowId) : undefined;
  const shownPick = flash ?? winner;
  const meta = item
    ? [item.kind, item.release?.slice(0, 4), item.genres.slice(0, 2).join(", "), item.status].filter(Boolean).join(" · ")
    : winner?.tmdb
      ? [winner.tmdb.mediaType === "tv" ? "Dizi" : "Film", winner.tmdb.year, "Arşivinde yok"].filter(Boolean).join(" · ")
      : "";

  return (
    <div className="flex flex-1 flex-col items-center gap-5 pt-2">
      <div className="relative flex h-[330px] w-[220px] items-center justify-center">
        {shownPick ? (
          <motion.div key={shownPick.key} initial={{ scale: flash ? 0.92 : 0.8, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: flash ? 0.08 : 0.4, type: flash ? "tween" : "spring" }} className="h-full w-full overflow-hidden rounded-[22px] shadow-2xl" style={{ boxShadow: winner && !flash ? `0 0 50px -12px ${ORANGE}` : undefined }}>
            <Cover pairing={pairing} src={shownPick.cover} className="h-full w-full object-cover" />
          </motion.div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-[22px] border-2 border-dashed border-white/10 text-label-3">
            <Sparkles size={40} strokeWidth={1.5} />
            <span className="px-6 text-center text-[13px]">Argus'taki “Ne İzlesem?” ayarlarınla seçerim</span>
          </div>
        )}
      </div>

      {winner && !flash && (
        <div className="w-full text-center">
          <p className="font-round text-[22px] font-extrabold leading-tight">{item?.title ?? winner.title ?? winner.tmdb?.title}</p>
          {meta && <p className="mt-1 text-[13px] text-label-2">{meta}</p>}
          {item?.series?.next && <p className="mt-1 text-[12.5px] text-label-3">Sıradaki: {epLabel(item.series.next.season, item.series.next.episode)}</p>}
        </div>
      )}

      <div className="mt-auto flex w-full flex-col gap-2.5 pb-2">
        {winner && !flash && item && (
          <button onClick={() => onMark(item)} className="flex items-center justify-center gap-2 rounded-2xl bg-well py-3.5 font-semibold text-label">
            <Check size={18} /> İzledim
          </button>
        )}
        {winner && !flash && winner.tmdb && (
          <button
            disabled={adding}
            onClick={async () => {
              setAdding(true);
              try {
                await argusAdd(pairing, winner.tmdb!.tmdbId, winner.tmdb!.mediaType);
                say(`${winner.tmdb!.title} Argus'a eklendi`);
                onAdded();
              } catch (e) {
                say(errText(e));
              } finally {
                setAdding(false);
              }
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-well py-3.5 font-semibold text-label disabled:opacity-50"
          >
            <Plus size={18} /> {adding ? "Ekleniyor…" : "Argus'a ekle"}
          </button>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={busy}
          onClick={() => void go()}
          className="flex items-center justify-center gap-2.5 rounded-3xl py-4 text-[16px] font-bold text-black disabled:opacity-60"
          style={{ background: ORANGE, boxShadow: `0 0 26px -8px ${ORANGE}` }}
        >
          <Shuffle size={20} strokeWidth={2.6} />
          {busy ? "Seçiyorum…" : winner ? "Başka bir şey" : "Ne izlesem?"}
        </motion.button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Devam

function ContinueTab({
  pairing,
  summary,
  onMark,
  onOpen,
}: {
  pairing: Pairing;
  summary: ArgusSummary;
  onMark: (i: ArgusItem, s?: number, e?: number) => Promise<void>;
  onOpen: (i: ArgusItem) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const day = today();
  // Sıradaki bölümü yayınlanmış diziler; en son izlenen başta
  const list = summary.items
    .filter((i) => i.series?.next && i.series.seen > 0)
    .sort((a, b) => (b.series!.lastSeen ?? "").localeCompare(a.series!.lastSeen ?? "") || (b.recent ?? 0) - (a.recent ?? 0));
  if (!list.length) return <p className="py-10 text-center text-[13.5px] text-label-3">Yarım kalan dizi yok.</p>;
  return (
    <div className="flex flex-col gap-2.5 pb-4">
      {list.map((i) => {
        const s = i.series!;
        const next = s.next!;
        const fresh = s.latest?.date === day;
        return (
          <div key={i.id} className="flex gap-3 rounded-3xl bg-card p-3">
            <button onClick={() => onOpen(i)} className="flex min-w-0 flex-1 gap-3 text-left">
            <Cover pairing={pairing} src={i.poster} className="h-[84px] w-[56px] shrink-0 rounded-xl object-cover" />
            <div className="flex min-w-0 flex-1 flex-col self-stretch">
              <p className="flex items-center gap-1.5 truncate text-[14.5px] font-semibold">
                <span className="truncate">{i.title}</span>
                {fresh && <span className="shrink-0 rounded-full px-1.5 py-[1px] text-[10px] font-bold text-black" style={{ background: ORANGE }}>YENİ</span>}
              </p>
              <p className="truncate text-[12.5px] text-label-2">
                {epLabel(next.season, next.episode)}
                {next.name ? ` · ${next.name}` : ""}
              </p>
              <div className="mt-auto flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-well">
                  <div className="h-full rounded-full" style={{ width: `${s.aired ? (s.seen / s.aired) * 100 : 0}%`, background: ORANGE }} />
                </div>
                <span className="text-[11px] tabular-nums text-label-3">
                  {s.seen}/{s.aired}
                </span>
              </div>
            </div>
            </button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              disabled={busy === i.id}
              onClick={async () => {
                setBusy(i.id);
                await onMark(i, next.season, next.episode);
                setBusy(null);
              }}
              className="flex w-[58px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-well text-[11px] font-semibold text-label-2 disabled:opacity-50"
            >
              <Check size={20} style={{ color: ORANGE }} />
              {busy === i.id ? "…" : "İzledim"}
            </motion.button>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- İzledim (ara)

function LogTab({
  pairing,
  summary,
  onPick,
  onAdded,
  say,
}: {
  pairing: Pairing;
  summary: ArgusSummary;
  onPick: (i: ArgusItem) => void;
  onAdded: () => void;
  say: (t: string) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<TmdbHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const fq = fold(q.trim());
  const local = fq.length >= 2 ? summary.items.filter((i) => fold(i.title).includes(fq) || (i.original && fold(i.original).includes(fq))).slice(0, 30) : [];
  useEffect(() => setHits(null), [q]);

  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="flex items-center gap-2 rounded-2xl bg-card px-4">
        <Search size={18} className="text-label-3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ne izledin?" className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-label outline-none placeholder:text-label-3" />
      </div>
      {fq.length < 2 && <p className="py-6 text-center text-[13px] text-label-3">Dizi ya da film adını yaz; Argus'ta işaretlerim, yoksa TMDB'den eklerim.</p>}
      {local.map((i) => (
        <button key={i.id} onClick={() => onPick(i)} className="flex items-center gap-3 rounded-2xl bg-card p-2.5 text-left">
          <Cover pairing={pairing} src={i.poster} className="h-[60px] w-[40px] shrink-0 rounded-lg object-cover" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-semibold">{i.title}</span>
            <span className="block truncate text-[12px] text-label-3">{[i.kind, i.release?.slice(0, 4), i.status].filter(Boolean).join(" · ")}</span>
          </span>
        </button>
      ))}
      {fq.length >= 2 && !hits && (
        <button
          disabled={searching}
          onClick={async () => {
            setSearching(true);
            try {
              setHits(await argusSearch(pairing, q.trim()));
            } catch (e) {
              say(errText(e));
            } finally {
              setSearching(false);
            }
          }}
          className="rounded-2xl bg-well py-3 text-[13.5px] font-medium text-label-2 disabled:opacity-50"
        >
          {searching ? "TMDB'de aranıyor…" : local.length ? "Aradığın yok mu? TMDB'de ara" : "Argus'ta yok, TMDB'de ara"}
        </button>
      )}
      {hits?.length === 0 && <p className="text-center text-[13px] text-label-3">TMDB'de de bulunamadı.</p>}
      {hits?.map((h) => (
        <div key={h.key} className="flex items-center gap-3 rounded-2xl bg-card p-2.5">
          <Cover pairing={pairing} src={h.poster} className="h-[60px] w-[40px] shrink-0 rounded-lg object-cover" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-semibold">{h.title}</span>
            <span className="block text-[12px] text-label-3">{[h.mediaType === "tv" ? "Dizi" : "Film", h.year].filter(Boolean).join(" · ")}</span>
          </span>
          <button
            disabled={adding !== null}
            onClick={async () => {
              setAdding(h.key);
              try {
                await argusAdd(pairing, h.tmdbId, h.mediaType);
                say(`${h.title} Argus'a eklendi; şimdi izlediğini işaretleyebilirsin`);
                onAdded();
              } catch (e) {
                say(errText(e));
              } finally {
                setAdding(null);
              }
            }}
            className="flex items-center gap-1 rounded-xl bg-well px-3 py-2 text-[12.5px] font-semibold text-label disabled:opacity-50"
          >
            <Plus size={15} /> {adding === h.key ? "…" : "Ekle"}
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- İşaretleme penceresi

function MarkSheet({
  pairing,
  item,
  onClose,
  onMark,
  onSaved,
}: {
  pairing: Pairing;
  item: ArgusItem;
  onClose: () => void;
  onMark: (i: ArgusItem, s?: number, e?: number) => Promise<void>;
  onSaved: (msg: string) => void;
}) {
  const s = item.series;
  const [busy, setBusy] = useState(false);
  return (
    <Sheet onClose={onClose}>
      <div className="flex gap-3">
        <Cover pairing={pairing} src={item.poster} className="h-[96px] w-[64px] shrink-0 rounded-xl object-cover" />
        <div className="min-w-0">
          <p className="font-round text-[19px] font-extrabold leading-tight">{item.title}</p>
          <p className="mt-1 text-[12.5px] text-label-3">{[item.kind, item.release?.slice(0, 4), item.status].filter(Boolean).join(" · ")}</p>
          {s && (
            <p className="mt-1 text-[12.5px] text-label-2">
              {s.seen}/{s.aired} bölüm izlendi
            </p>
          )}
        </div>
      </div>
      {s ? (
        <EpisodeList pairing={pairing} item={item} onSaved={onSaved} />
      ) : (
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onMark(item);
            setBusy(false);
          }}
          className="mt-5 w-full rounded-2xl py-3.5 font-bold text-black disabled:opacity-60"
          style={{ background: ORANGE }}
        >
          {busy ? "İşaretleniyor…" : "Bugün izledim"}
        </button>
      )}
    </Sheet>
  );
}

/**
 * Dizinin bölümleri: sezon sekmeleri, her bölümde izlendi işareti. Dokundukça işaret değişir (henüz
 * kaydedilmez); "Sezonu bitir" o sezonun yayınlanmış bölümlerinin hepsini işaretler; Kaydet hepsini
 * Argus'a tek seferde yazar.
 */
function EpisodeList({ pairing, item, onSaved }: { pairing: Pairing; item: ArgusItem; onSaved: (msg: string) => void }) {
  const [data, setData] = useState<{ seasons: ArgusSeason[]; seen: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState(item.series?.next?.season ?? item.series?.latest?.season ?? 1);
  // Kaydedilmemiş değişiklikler: anahtar ("1-3") → izlendi mi
  const [draft, setDraft] = useState<Map<string, boolean>>(new Map());
  const [saving, setSaving] = useState(false);
  const day = today();

  useEffect(() => {
    argusEpisodes(pairing, item.id)
      .then((d) => {
        setData(d);
        // Seçili sezon listede yoksa ilk normal sezon (0 = özel bölümler)
        if (!d.seasons.some((x) => x.season === season)) setSeason(d.seasons.find((x) => x.season > 0)?.season ?? d.seasons[0]?.season ?? 1);
      })
      .catch((e) => setError(errText(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairing, item.id]);

  if (error) return <p className="mt-4 text-[13px] text-red">{error}</p>;
  if (!data) return <p className="mt-5 py-6 text-center text-[13px] text-label-3">Bölümler okunuyor…</p>;
  if (!data.seasons.length) return <p className="mt-5 text-[13px] text-label-3">Argus'ta bu dizinin bölüm bilgisi yok (Argus'ta TMDB'den güncelle).</p>;

  const seen = new Set(data.seen);
  const isOn = (key: string) => draft.get(key) ?? seen.has(key);
  const toggle = (key: string) =>
    setDraft((d) => {
      const n = new Map(d);
      const next = !isOn(key);
      if (next === seen.has(key)) n.delete(key);
      else n.set(key, next);
      return n;
    });
  const cur = data.seasons.find((x) => x.season === season) ?? data.seasons[0];
  const aired = (date: string | null) => !date || date <= day;
  const airedEps = cur.episodes.filter((e) => aired(e.airDate));
  const allOn = airedEps.length > 0 && airedEps.every((e) => isOn(`${cur.season}-${e.episode}`));
  const setSeasonAll = (on: boolean) =>
    setDraft((d) => {
      const n = new Map(d);
      for (const e of airedEps) {
        const key = `${cur.season}-${e.episode}`;
        if (on === seen.has(key)) n.delete(key);
        else n.set(key, on);
      }
      return n;
    });

  const save = async () => {
    const add: [number, number][] = [];
    const remove: [number, number][] = [];
    for (const [key, on] of draft) {
      const [sn, ep] = key.split("-").map(Number);
      (on ? add : remove).push([sn, ep]);
    }
    setSaving(true);
    try {
      const r = await argusSetEpisodes(pairing, item.id, add, remove);
      const parts = [add.length && `${add.length} bölüm izlendi`, remove.length && `${remove.length} bölümün işareti kaldırıldı`].filter(Boolean);
      onSaved(r.completed ? `${item.title}: hepsi izlendi, İzlendi yapıldı` : `${item.title}: ${parts.join(", ")}`);
    } catch (e) {
      setError(errText(e));
      setSaving(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
        {data.seasons.map((x) => {
          const n = x.episodes.filter((e) => isOn(`${x.season}-${e.episode}`)).length;
          const full = n > 0 && n >= x.episodes.filter((e) => aired(e.airDate)).length;
          return (
            <button
              key={x.season}
              onClick={() => setSeason(x.season)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold ${x.season === cur.season ? "text-black" : "bg-well text-label-2"}`}
              style={x.season === cur.season ? { background: ORANGE } : undefined}
            >
              {x.season === 0 ? "Özel" : `${x.season}. Sezon`}
              {full && x.season !== cur.season && <Check size={12} className="ml-1 inline" strokeWidth={3} />}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between px-1">
        <span className="text-[12px] text-label-3">
          {cur.episodes.filter((e) => isOn(`${cur.season}-${e.episode}`)).length}/{cur.episodes.length} izlendi
        </span>
        {airedEps.length > 0 && (
          <button onClick={() => setSeasonAll(!allOn)} className="rounded-full bg-well px-3 py-1.5 text-[12px] font-semibold text-label-2">
            {allOn ? "Sezonun işaretini kaldır" : "Sezonu bitir"}
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-1">
        {cur.episodes.map((e) => {
          const key = `${cur.season}-${e.episode}`;
          const on = isOn(key);
          const future = !aired(e.airDate);
          const changed = draft.has(key);
          return (
            <button
              key={key}
              disabled={future}
              onClick={() => toggle(key)}
              className="flex items-center gap-3 rounded-2xl px-2 py-2 text-left disabled:opacity-35"
              style={{ background: changed ? tintBg(ORANGE, 10) : undefined }}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2"
                style={{ borderColor: on ? ORANGE : "rgb(255 255 255 / 0.18)", background: on ? ORANGE : "transparent" }}
              >
                {on && <Check size={15} strokeWidth={3} className="text-black" />}
              </span>
              <span className="w-7 shrink-0 text-[13px] font-semibold tabular-nums text-label-3">{e.episode}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px]">{e.name || `${e.episode}. bölüm`}</span>
                {future && e.airDate && <span className="block text-[11px] text-label-3">{e.airDate} çıkacak</span>}
              </span>
            </button>
          );
        })}
      </div>

      <button
        disabled={!draft.size || saving}
        onClick={() => void save()}
        className="sticky bottom-0 mt-3 w-full rounded-2xl py-3.5 font-bold text-black disabled:opacity-40"
        style={{ background: ORANGE }}
      >
        {saving ? "Kaydediliyor…" : draft.size ? `Kaydet (${draft.size} değişiklik)` : "Bölümlere dokunarak işaretle"}
      </button>
    </div>
  );
}
