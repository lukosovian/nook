import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AppWindow, ArrowRightLeft, Calculator, Clapperboard, CornerDownLeft, Globe, Languages, MessageCircle, Search, Smile, StickyNote, TrendingUp, type LucideIcon } from "lucide-react";
import { playAntic } from "../../hooks/useAntics";
import { copyText, listApps, openPath, setInteractive, type AppEntry } from "../../lib/bridge";
import { sendChat } from "../../lib/chat";
import { useArgus } from "../../lib/argus";
import { search, searchOnline, type ResultKind, type SearchResult } from "../../lib/search";
import { useNook } from "../../store/nook";
import { Frame } from "../panels/Frame";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";

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

/** Uygulama listesi oturum boyunca bir kez okunur. */
let appsCache: Promise<AppEntry[]> | undefined;

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (appsCache ??= listApps()).then(setApps);
    const t = window.setTimeout(() => input.current?.focus(), 60);
    // Başka bir yere tıklanınca (pencere odağı kaybedince) kapan.
    const onBlur = () => close();
    window.addEventListener("blur", onBlur);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("blur", onBlur);
      useNook.getState().setBusy("search", false);
    };
  }, []);

  const argusItems = useArgus((st) => st.snap?.items);
  const local = useMemo(() => search(query, apps, argusItems), [query, apps, argusItems]);
  // Döviz/çeviri: yazmayı bırakınca (350 ms) internetten — bu sırada Nook "düşünür"
  const [online, setOnline] = useState<SearchResult[]>([]);
  useEffect(() => {
    setOnline([]);
    let alive = true;
    const t = window.setTimeout(() => {
      useNook.getState().setBusy("search", true);
      void searchOnline(query)
        .then((r) => alive && setOnline(r))
        .finally(() => useNook.getState().setBusy("search", false));
    }, 350);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [query]);
  const results = useMemo(() => [...online, ...local], [online, local]);
  useEffect(() => setActive(0), [query]);

  const run = async (r: SearchResult) => {
    if (r.kind === "calc" || r.kind === "convert" || r.kind === "currency" || r.kind === "translate" || r.kind === "emoji") {
      await copyText(r.payload);
      playAntic("wink");
    } else if (r.kind === "ask") {
      // Sohbete geç ve soruyu gönder; ada açık kalır (fare dışarı çıkınca kapanır)
      const st = useNook.getState();
      st.setTab("chat");
      st.setHovered(true);
      st.setSearching(false);
      st.setBusy("search", false);
      void sendChat(r.payload);
      return;
    } else if (r.kind === "argus") {
      // Argus bölümünde ayrıntısını aç
      const st = useNook.getState();
      useArgus.setState({ focusId: r.payload });
      st.setTab("argus");
      st.setHovered(true);
      close();
      return;
    } else if (r.kind === "note") {
      const { note, setNote } = useNook.getState();
      setNote(note ? `${note}\n${r.payload}` : r.payload);
      playAntic("hop");
    } else {
      await openPath(r.payload).catch(() => {});
    }
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowDown") {
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

  return (
    <Frame view="module" title="Hızlı arama">
      <div className="flex h-full flex-col gap-2">
        <div className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-well px-3 focus-within:bg-well-hi">
          <Search size={14} strokeWidth={2.4} className="shrink-0 text-label-3" />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            placeholder="Ara, hesapla, çevir…"
            className="w-full bg-transparent text-[13px] text-label outline-none placeholder:text-label-3"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!query && (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <div className="flex flex-wrap justify-center gap-1">
                {HINTS.map((h) => (
                  <button
                    key={h}
                    onClick={() => setQuery(h)}
                    className="rounded-full bg-well px-2.5 py-0.5 text-[11px] text-label-2 transition-colors hover:bg-well-hi hover:text-label"
                  >
                    {h}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-label-3">↑↓ seç · Enter çalıştır · Esc kapat</p>
            </div>
          )}
          <AnimatePresence initial={false}>
            {results.map((r, i) => {
              const kind = KIND[r.kind];
              const selected = i === active;
              return (
                <motion.button
                  key={r.id}
                  layout="position"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => void run(r)}
                  className="flex h-8 w-full items-center gap-2 rounded-full border px-1 pr-2.5 text-left"
                  style={{ background: selected ? tintBg(kind.color, 14) : "transparent", borderColor: selected ? tintBg(kind.color, 38) : "transparent" }}
                >
                  <MiniNook color={kind.color} size={22} icon={kind.icon} />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-label">{r.title}</span>
                  <span className="shrink-0 text-[10.5px]" style={{ color: selected ? tintText(kind.color) : "var(--color-label-3)" }}>
                    {r.subtitle}
                  </span>
                  {selected && <CornerDownLeft size={11} strokeWidth={2.4} style={{ color: tintText(kind.color) }} />}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </Frame>
  );
}

function close() {
  if (!useNook.getState().searching) return;
  useNook.getState().setSearching(false);
  useNook.getState().setBusy("search", false);
  void setInteractive(false);
}
