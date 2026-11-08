import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Newspaper, RotateCw, WifiOff } from "lucide-react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { spring } from "../../lib/motion";
import { openPath } from "../../lib/bridge";
import { refreshNews, SOURCES, STALE_MS, useNews, type NewsItem } from "../../lib/news";
import { locale, tt } from "../../lib/i18n";
import { ACCENT, tintBg, tintText } from "../ui/primitives";

export const NEWS_COLOR = ACCENT.red;

const hm = (ms: number) => new Date(ms).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });

function ago(ms: number, now: number) {
  if (!ms) return "";
  const m = Math.max(1, Math.round((now - ms) / 60_000));
  if (m < 60) return tt("{0} dk önce", m);
  if (m < 24 * 60) return tt("{0} sa önce", Math.round(m / 60));
  return new Date(ms).toLocaleDateString(locale(), { day: "numeric", month: "short" });
}

/**
 * Haberler: solda kaynaklar (dokununca açılır/kapanır) ve son güncelleme, sağda en yeni başlıklar.
 * Başlığa basınca haber tarayıcıda açılır.
 */
export function NewsPanel() {
  const { on, items, at, offline, loading, toggle } = useNews();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (Date.now() - useNews.getState().at > STALE_MS) void refreshNews();
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    // Bağlantı gelince hemen yenile
    const online = () => void refreshNews();
    window.addEventListener("online", online);
    return () => (window.clearInterval(t), window.removeEventListener("online", online));
  }, []);
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("news", scroller);
  const shown = items.filter((x) => on.includes(x.source));

  return (
    <div className="flex h-full min-w-0 gap-3">
      <div className="flex w-[150px] shrink-0 flex-col gap-1">
        <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-label-3">{tt("Kaynaklar")}</p>
        {SOURCES.map((s) => {
          const sel = on.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className="flex h-7 items-center gap-2 rounded-[9px] border px-2 text-left text-[11.5px] font-semibold transition-colors"
              style={sel ? { background: tintBg(NEWS_COLOR, 18), borderColor: tintBg(NEWS_COLOR, 45), color: tintText(NEWS_COLOR) } : { background: "rgb(255 255 255 / 0.035)", borderColor: "rgb(255 255 255 / 0.06)", color: "var(--color-label-2)" }}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sel ? NEWS_COLOR : "rgb(255 255 255 / 0.2)" }} />
              <span className="truncate">{s.name}</span>
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={() => void refreshNews()}
          disabled={loading}
          className="flex h-7 items-center justify-center gap-1.5 rounded-[9px] bg-well text-[11px] font-semibold text-label-2 hover:bg-well-hi hover:text-label disabled:opacity-50"
        >
          <motion.span animate={loading ? { rotate: 360 } : { rotate: 0 }} transition={loading ? { duration: 0.9, repeat: Infinity, ease: "linear" } : { duration: 0 }} className="flex">
            <RotateCw size={11} strokeWidth={2.6} />
          </motion.span>
          {tt("Yenile")}
        </button>
        <p className="px-0.5 text-center text-[10px] text-label-3">
          {offline ? (
            <span className="inline-flex items-center gap-1" style={{ color: tintText(ACCENT.orange) }}>
              <WifiOff size={10} strokeWidth={2.4} />
              {at ? tt("Bağlantı yok · {0}", hm(at)) : tt("Bağlantı yok")}
            </span>
          ) : at ? (
            tt("Son güncelleme {0}", hm(at))
          ) : null}
        </p>
      </div>

      <div ref={scroller} className="min-h-0 min-w-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {!shown.length && (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center">
            <Newspaper size={20} style={{ color: tintText(NEWS_COLOR) }} />
            <p className="text-[12px] text-label-3">{loading ? tt("Başlıklar geliyor…") : offline ? tt("İnternete bağlanınca başlıklar gelir") : tt("Henüz başlık yok")}</p>
          </div>
        )}
        {shown.map((x) => (
          <Row key={x.id} x={x} now={now} />
        ))}
      </div>
    </div>
  );
}

function Row({ x, now }: { x: NewsItem; now: number }) {
  const [broken, setBroken] = useState(false);
  const source = SOURCES.find((s) => s.id === x.source)?.name ?? x.source;
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={spring.pop}
      onClick={() => void openPath(x.link)}
      className="flex w-full items-center gap-2.5 rounded-[12px] border border-white/[0.05] bg-white/[0.03] p-1.5 text-left hover:bg-white/[0.06]"
      title={x.title}
    >
      {x.image && !broken ? (
        <img src={x.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="h-11 w-14 shrink-0 rounded-[8px] object-cover" />
      ) : (
        <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-[8px]" style={{ background: tintBg(NEWS_COLOR, 14), color: tintText(NEWS_COLOR) }}>
          <Newspaper size={16} strokeWidth={2.2} />
        </span>
      )}
      <span className="min-w-0 flex-1 leading-tight">
        <span className="line-clamp-2 text-[12.5px] font-semibold text-label">{x.title}</span>
        <span className="mt-0.5 block truncate text-[10.5px] text-label-2">
          {source}
          {x.at ? ` · ${ago(x.at, now)}` : ""}
        </span>
      </span>
    </motion.button>
  );
}
