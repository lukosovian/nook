/**
 * Studio › Ayarlar: solda kategoriler ve arama, sağda yalnızca seçili kategori (kart kart).
 * Ararken bütün kategoriler alt alta süzülerek görünür. "settings:<bölüm>" ile açılınca o bölümün
 * kategorisi seçilir ve bölüme kayar (adadan "Ayarlar › Klavye kısayolları" gibi). Ararken satırlar
 * kategorisini çip olarak taşır; hiçbir şey çıkmazsa en yakın üç satır "Bunu mu aradın?" diye önerilir.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Search, Settings, X } from "lucide-react";
import { CATS, CategoryBody, catOf, nearestRows, SettingsLook, SettingsNav, useSettingsFilter, type CatId } from "../../components/panels/SettingsPanel";
import { ACCENT, EmptyState, tintBg, tintText } from "../../components/ui/primitives";
import { tt } from "../../lib/i18n";
import { fold } from "../../lib/search";
import { NavIcon } from "../ui";

export function SettingsPage({ arg }: { arg: string | null }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [empty, setEmpty] = useState(false);
  const [active, setActive] = useState<CatId>(() => (arg && catOf(arg)) || "general");
  const q = fold(query.trim());
  useSettingsFilter(scroller, q, setEmpty);
  // Arama boş çıkınca yazılana en yakın satırlar
  const [near, setNear] = useState<{ label: string; cat: CatId }[]>([]);
  useEffect(() => {
    if (!q || !empty || !scroller.current) return setNear([]);
    setNear(nearestRows(scroller.current, q));
  }, [q, empty]);

  /** Kategoriyi aç; `row` verildiyse o satıra kay ve bir an parlat (arama sonucu, "→ … altında") */
  const jump = (id: CatId, row?: string) => {
    setActive(id);
    setQuery("");
    scroller.current?.scrollTo({ top: 0 });
    if (!row) return;
    window.setTimeout(() => {
      const el = [...(scroller.current?.querySelectorAll<HTMLElement>("[data-row][data-label]") ?? [])].find((x) => x.dataset.label === row);
      if (!el) return;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.animate([{ background: tintBg(ACCENT.purple, 22) }, { background: "transparent" }], { duration: 1800, easing: "ease-out" });
    }, 300);
  };

  // Bölüme gönderildiyse (ör. "Klavye kısayolları") kategorisini aç, bölüme kay ve bir an parlat
  useEffect(() => {
    if (!arg) return;
    const cat = catOf(arg);
    if (cat) setActive(cat);
    const t = window.setTimeout(() => {
      const sec = scroller.current?.querySelector<HTMLElement>(`section[data-sec^="${arg}"]`) ?? null;
      if (!sec || !scroller.current) return;
      scroller.current.scrollTo({ top: sec.offsetTop - 24, behavior: "smooth" });
      sec.animate([{ boxShadow: `0 0 0 2px ${ACCENT.purple}` }, { boxShadow: "0 0 0 0 transparent" }], { duration: 1600, easing: "ease-out" });
    }, 250);
    return () => window.clearTimeout(t);
  }, [arg]);

  const shown = q ? CATS : CATS.filter((c) => c.id === active);

  return (
    <div className="flex h-full">
      <aside className="flex w-[250px] shrink-0 flex-col border-r border-white/[0.05] px-3 pt-6">
        <div className="mb-4 flex items-center gap-3 px-2">
          <NavIcon icon={Settings} color={ACCENT.gray} on size={44} />
          <h1 className="text-[22px] font-extrabold tracking-tight text-label">{tt("Ayarlar")}</h1>
        </div>
        <label className="mx-1 mb-3 flex h-9 items-center gap-2 rounded-[11px] border border-white/[0.07] bg-white/[0.03] px-3 text-label-3 focus-within:border-white/20">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder={tt("Ayarlarda ara…")}
            className="min-w-0 flex-1 bg-transparent text-[12.5px] text-label outline-none placeholder:text-label-3"
          />
          {query && (
            <button onClick={() => setQuery("")} className="hover:text-label">
              <X size={13} />
            </button>
          )}
        </label>
        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pb-4">
          {CATS.map((c) => {
            const on = c.id === active && !q;
            return (
              <button key={c.id} onClick={() => jump(c.id)} className={`relative flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-left ${on ? "" : "hover:bg-white/[0.03]"}`}>
                {on && <motion.span layoutId="set-cat" className="absolute inset-0 rounded-[12px]" style={{ background: tintBg(c.color, 13) }} transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <span className="relative">
                  <NavIcon icon={c.icon} color={c.color} on={on} size={28} />
                </span>
                <span className="relative min-w-0 leading-tight">
                  <span className={`block truncate text-[12.5px] font-semibold ${on ? "text-label" : "text-label-2"}`}>{c.title}</span>
                  <span className="block truncate text-[10.5px] text-label-3">{c.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div ref={scroller} className="relative min-w-0 flex-1 overflow-y-auto">
        <SettingsLook.Provider value="studio">
          <div className="mx-auto max-w-[820px] space-y-8 px-8 pb-16 pt-7">
            {shown.map((c) => (
              <motion.div key={c.id} data-cat={c.id} className="space-y-3" initial={q ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
                {/* Hakkında kendi büyük kartıyla başlar; ararken kategori her satırda çip olarak görünür */}
                {c.id !== "about" && !q && (
                  <h2 className="flex items-center gap-3 pb-1">
                    <NavIcon icon={c.icon} color={c.color} on size={36} />
                    <span className="leading-tight">
                      <span className="block text-[20px] font-extrabold tracking-tight" style={{ color: tintText(c.color) }}>
                        {c.title}
                      </span>
                      <span className="block text-[12px] font-medium text-label-3">{c.hint}</span>
                    </span>
                  </h2>
                )}
                <SettingsNav.Provider value={{ q, cat: c.id, jump }}>
                  <CategoryBody id={c.id} />
                </SettingsNav.Provider>
              </motion.div>
            ))}
            {q && empty && (
              <div className="py-8">
                <div className="h-[120px]">
                  <EmptyState title={tt("“{0}” için ayar bulunamadı", query.trim())} hint={near.length ? tt("Bunu mu aradın?") : tt("Başka bir sözcükle dene: ses, bildirim, telefon…")} color={ACCENT.purple} />
                </div>
                {near.length > 0 && (
                  <div className="mx-auto mt-3 flex max-w-[460px] flex-col gap-1.5">
                    {near.map((r) => {
                      const c = CATS.find((x) => x.id === r.cat)!;
                      return (
                        <button key={r.label} onClick={() => jump(r.cat, r.label)} className="nook-card flex items-center justify-between gap-3 rounded-row px-3.5 py-2.5 text-left hover:bg-white/[0.04]">
                          <span className="min-w-0 truncate text-[13px] font-semibold text-label">{r.label}</span>
                          <span className="flex shrink-0 items-center gap-1 rounded-full border px-2 py-[1px] text-[10.5px] font-semibold" style={{ background: tintBg(c.color, 14), borderColor: tintBg(c.color, 36), color: tintText(c.color) }}>
                            <c.icon size={10} strokeWidth={2.6} />
                            {c.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </SettingsLook.Provider>
      </div>
    </div>
  );
}
