/**
 * Studio ana sayfasında arama ve sohbet, adaya geçmeden: üstte yazınca sonuçları altında açılan arama
 * çubuğu (adadaki Hızlı arama ile aynı motor), aşağıda sohbet kartı (adadaki sohbetin aynısı, geniş).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AppWindow, ArrowRightLeft, Calculator, Check, Clapperboard, CornerDownLeft, Globe, Languages, MessageCircle, Search, Smile, StickyNote, Trash2, TrendingUp, type LucideIcon } from "lucide-react";
import { copyText, listApps, openPath, type AppEntry } from "../../lib/bridge";
import { sendChat } from "../../lib/chat";
import { useArgus } from "../../lib/argus";
import { search, searchOnline, type ResultKind, type SearchResult } from "../../lib/search";
import { studioGo } from "../../lib/studio";
import { ek, normalizeColor, normalizeLook, useNookName } from "../../lib/look";
import { useNook } from "../../store/nook";
import { ChatPanel } from "../../components/panels/ChatPanel";
import { NookFigure } from "../../components/mascot/Figure";
import { ACCENT, MiniNook, tintBg, tintText } from "../../components/ui/primitives";
import { tt } from "../../lib/i18n";

const KIND: Record<ResultKind, { icon: LucideIcon; color: string }> = {
  calc: { icon: Calculator, color: ACCENT.orange },
  convert: { icon: ArrowRightLeft, color: ACCENT.teal },
  currency: { icon: TrendingUp, color: ACCENT.green },
  translate: { icon: Languages, color: ACCENT.purple },
  emoji: { icon: Smile, color: ACCENT.yellow },
  app: { icon: AppWindow, color: ACCENT.blue },
  web: { icon: Globe, color: ACCENT.blue },
  note: { icon: StickyNote, color: ACCENT.yellow },
  ask: { icon: MessageCircle, color: ACCENT.purple },
  argus: { icon: Clapperboard, color: ACCENT.orange },
};

const HINTS = ["Spotify", "12*3+4", "100 usd tl", "10 km mi", "en: günaydın", "emoji kalp", "not: süt al"];
const COPY_KINDS: ResultKind[] = ["calc", "convert", "currency", "translate", "emoji"];

let appsCache: Promise<AppEntry[]> | undefined;

/** Sohbet kartının yeri: aramadaki "Nook'a sor" oraya kaydırır */
const CHAT_ID = "studio-chat";

export function HomeSearch() {
  const [query, setQuery] = useState("");
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  /** Az önce yapılan iş ("Kopyalandı") — satırda tik */
  const [done, setDone] = useState<{ id: string; text: string } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const searchKey = useNook((s) => s.settings.shortcut);

  useEffect(() => void (appsCache ??= listApps()).then(setApps), []);
  // Dışarı tıklayınca sonuçlar kapansın
  useEffect(() => {
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  const argusItems = useArgus((st) => st.snap?.items);
  const local = useMemo(() => search(query, apps, argusItems), [query, apps, argusItems]);
  const [online, setOnline] = useState<SearchResult[]>([]);
  useEffect(() => {
    setOnline([]);
    let alive = true;
    const t = window.setTimeout(() => void searchOnline(query).then((r) => alive && setOnline(r)), 350);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [query]);
  const results = useMemo(() => [...online, ...local].slice(0, 8), [online, local]);
  useEffect(() => setActive(0), [query]);

  const flash = (r: SearchResult, text: string) => {
    setDone({ id: r.id, text });
    window.setTimeout(() => setDone((d) => (d?.id === r.id ? null : d)), 1400);
  };

  const run = async (r: SearchResult) => {
    if (COPY_KINDS.includes(r.kind)) {
      await copyText(r.payload);
      return flash(r, tt("Kopyalandı"));
    }
    if (r.kind === "ask") {
      void sendChat(r.payload);
      document.getElementById(CHAT_ID)?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (r.kind === "argus") {
      studioGo("argus");
    } else if (r.kind === "note") {
      const { note, setNote } = useNook.getState();
      setNote(note ? `${note}\n${r.payload}` : r.payload);
      return flash(r, tt("Nota eklendi"));
    } else {
      await openPath(r.payload).catch(() => {});
    }
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (query) setQuery("");
      else input.current?.blur();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      void run(results[active]);
    }
  };

  const shown = open && (query ? results.length > 0 : true);
  return (
    <div ref={box} className="relative z-30 min-w-0 max-w-[520px] flex-1">
      <div
        className="flex h-12 min-w-0 items-center gap-2 overflow-hidden rounded-[16px] border px-3 transition-colors xl:gap-2.5 xl:px-4"
        style={{ background: open ? "rgb(255 255 255 / 0.07)" : "rgb(255 255 255 / 0.045)", borderColor: open ? tintBg(ACCENT.teal, 45) : "rgb(255 255 255 / 0.08)" }}
      >
        <Search size={17} strokeWidth={2.4} className="shrink-0" style={{ color: open ? tintText(ACCENT.teal) : "var(--color-label-3)" }} />
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          placeholder={tt("Ara, hesapla, çevir…")}
          className="w-0 min-w-0 flex-1 bg-transparent text-[14px] text-label outline-none placeholder:text-label-3 xl:text-[14.5px]"
        />
        {searchKey && (
          <span className="hidden shrink-0 rounded-[7px] border border-white/[0.08] bg-white/[0.04] px-1.5 py-[2px] text-[10.5px] font-semibold text-label-3 xl:inline-block" title={tt("Adada hızlı arama")}>
            {searchKey}
          </span>
        )}
      </div>

      <AnimatePresence>
        {shown && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 520, damping: 36 }}
            className="absolute inset-x-0 top-[54px] overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#18181b]/95 p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          >
            {!query ? (
              <div className="p-2">
                <p className="mb-2 px-1 text-[11px] font-semibold text-label-3">{tt("Şunları dene")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {HINTS.map((h) => (
                    <button key={h} onClick={() => setQuery(h)} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[12px] text-label-2 transition-colors hover:bg-white/[0.1] hover:text-label">
                      {h}
                    </button>
                  ))}
                </div>
                <p className="mt-2.5 px-1 text-[10.5px] text-label-3">{tt("↑↓ seç · Enter çalıştır · Esc temizle")}</p>
              </div>
            ) : (
              results.map((r, i) => {
                const kind = KIND[r.kind];
                const selected = i === active;
                const ok = done?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => void run(r)}
                    className="flex h-11 w-full items-center gap-2.5 rounded-[13px] border px-2 text-left"
                    style={{ background: selected ? tintBg(kind.color, 14) : "transparent", borderColor: selected ? tintBg(kind.color, 38) : "transparent" }}
                  >
                    <MiniNook color={kind.color} size={28} icon={kind.icon} />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-label">{r.title}</span>
                    <span className="shrink-0 text-[11.5px]" style={{ color: ok ? tintText(ACCENT.green) : selected ? tintText(kind.color) : "var(--color-label-3)" }}>
                      {ok ? done.text : r.subtitle}
                    </span>
                    {ok ? <Check size={13} strokeWidth={2.8} style={{ color: tintText(ACCENT.green) }} /> : selected && <CornerDownLeft size={12} strokeWidth={2.4} style={{ color: tintText(kind.color) }} />}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Sohbet kartı: adadaki sohbet, Studio'da geniş ve büyük yazıyla */
export function HomeChat({ delay = 0 }: { delay?: number }) {
  const name = useNookName();
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  const model = useNook((s) => s.settings.aiModel);
  const count = useNook((s) => s.chat.length);
  const busy = useNook((s) => s.chatBusy);
  return (
    <motion.section
      id={CHAT_ID}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, delay }}
      className="nook-card flex min-w-0 flex-col rounded-[22px] p-5"
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: tintBg(color, 18) }}>
          <NookFigure look={look} color={color} size={24} expression={busy ? "thinking" : "idle"} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-bold tracking-tight text-label">{tt("{0} sohbet", ek(name, "la"))}</h2>
          <p className="truncate text-[11.5px] text-label-3">{model ? model.replace(/^models\//, "") : tt("Gemini")}</p>
        </div>
        {count > 0 && !busy && (
          <button
            onClick={() => useNook.getState().clearChat()}
            title={tt("Sohbeti temizle")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-label-3 transition-colors hover:bg-white/[0.06] hover:text-label"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {/* Adadaki sohbet bileşeni; yazılar biraz büyütülür */}
      <div className="h-[300px] min-h-0" style={{ zoom: 1.12 }}>
        <ChatPanel autoFocus={false} />
      </div>
    </motion.section>
  );
}
