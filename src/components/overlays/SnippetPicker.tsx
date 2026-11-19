/**
 * Parçacık seçici: genel kısayolla (Ayarlar › Klavye kısayolları) adada açılır, Pano › Parçacıklar'daki
 * hazır metinleri listeler. Yazınca süzülür, ↑↓ ile seçilir, Enter kısayola basılmadan önce önde olan
 * pencereye yapıştırır. Hızlı aramanın ada kipini kullanır; açık değilken `fallback` (hızlı arama) çizilir.
 */
import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { CornerDownLeft, Search } from "lucide-react";
import { playAntic } from "../../hooks/useAntics";
import { copyText, EVENTS, pastePrevious, setInteractive, subscribe } from "../../lib/bridge";
import { fold } from "../../lib/search";
import { tt } from "../../lib/i18n";
import { useNook, type Snippet } from "../../store/nook";
import { showSnippets } from "../panels/ClipboardPanel";
import { Frame } from "../panels/Frame";
import { ACCENT, EmptyState, tintBg, tintText } from "../ui/primitives";

export const useSnippetPick = create<{ on: boolean }>(() => ({ on: false }));

subscribe(EVENTS.snippets, () => {
  useSnippetPick.setState({ on: true });
  useNook.getState().setSearching(true);
});
// Hızlı arama kısayolu seçiciyi aramaya çevirir; ada kapanınca seçici de kapanır
subscribe(EVENTS.search, () => useSnippetPick.setState({ on: false }));
useNook.subscribe((s, prev) => {
  if (prev.searching && !s.searching) useSnippetPick.setState({ on: false });
});

function close() {
  if (!useNook.getState().searching) return;
  useNook.getState().setSearching(false);
  void setInteractive(false);
}

export function SnippetPicker({ fallback }: { fallback: React.ReactNode }) {
  const on = useSnippetPick((s) => s.on);
  return on ? <Picker /> : <>{fallback}</>;
}

function Picker() {
  const snippets = useNook((s) => s.snippets);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => input.current?.focus(), 60);
    // Başka bir yere tıklanınca (pencere odağı kaybedince) kapan
    window.addEventListener("blur", close);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("blur", close);
    };
  }, []);
  useEffect(() => setActive(0), [query]);

  const q = fold(query.trim());
  const list = snippets.filter((s) => !q || [s.name, s.text, s.trigger].some((x) => x && fold(x).includes(q)));

  const pick = async (s: Snippet) => {
    await copyText(s.text);
    // Önce odak önceki pencereye döner ve yapıştırılır, sonra ada kapanır
    await pastePrevious();
    playAntic("wink");
    close();
  };
  const addSnippet = () => {
    const st = useNook.getState();
    showSnippets();
    st.setTab("clip");
    st.setHovered(true);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(list.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && list[active]) {
      e.preventDefault();
      void pick(list[active]);
    }
  };

  const c = ACCENT.purple;
  return (
    <Frame view="module" title={tt("Parçacıklar")} color={c}>
      <div className="flex h-full flex-col gap-2">
        <div className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-well px-3 focus-within:bg-well-hi">
          <Search size={14} strokeWidth={2.4} className="shrink-0 text-label-3" />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            placeholder={tt("Parçacık ara…")}
            className="w-full bg-transparent text-[13px] text-label outline-none placeholder:text-label-3"
          />
          <span className="shrink-0 text-[10px] text-label-3">{tt("↑↓ seç · Enter yapıştır · Esc kapat")}</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!snippets.length ? (
            <EmptyState
              title={tt("Parçacık yok")}
              hint={tt("Adres, IBAN, imza gibi sık yazdıklarını kaydet; bu kısayolla her pencereye yapıştır")}
              color={c}
              action={{ label: tt("Parçacık ekle"), onClick: addSnippet }}
            />
          ) : !list.length ? (
            <p className="pt-6 text-center text-[11.5px] text-label-3">{tt("Eşleşen parçacık yok")}</p>
          ) : (
            list.map((s, i) => {
              const selected = i === active;
              return (
                <button
                  key={s.id}
                  ref={selected ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => void pick(s)}
                  className="flex h-9 w-full items-center gap-2 rounded-row border px-2.5 text-left"
                  style={{ background: selected ? tintBg(c, 14) : "transparent", borderColor: selected ? tintBg(c, 38) : "transparent" }}
                >
                  <span className="max-w-[40%] shrink-0 truncate text-[12.5px] font-semibold text-label">{s.name}</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-label-3">{s.text.replace(/\s+/g, " ")}</span>
                  {s.trigger && (
                    <span className="shrink-0 rounded-badge px-1.5 py-[1px] font-mono text-[10px]" style={{ background: tintBg(c, 16), color: tintText(c) }}>
                      {s.trigger}
                    </span>
                  )}
                  {selected && <CornerDownLeft size={11} strokeWidth={2.4} className="shrink-0" style={{ color: tintText(c) }} />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </Frame>
  );
}
