/**
 * Studio › Duvar kağıtları: Nook'lu masaüstü arka planları, gruplar hâlinde. Önizlemeler uygulamanın içinde
 * (public/wallpapers); tam boy resim uygulanınca GitHub'dan bir kez indirilir, Resimler › Nook'a kaydedilip
 * Windows'un arka planı yapılır (commands.rs set_wallpaper).
 * Tek tık büyük önizleme, çift tık ya da üstündeki "Uygula" hemen uygular. Döngüler: seçilen resimler seçilen
 * sırayla belirli aralıkla değişir (Rust'ta yarım dakikada bir bakılır; bkz. commands.rs spawn_wallpaper_cycle).
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Repeat, Trash2, Wallpaper, X } from "lucide-react";
import { setWallpaper } from "../../lib/bridge";
import { ACCENT, Segmented, Toggle, tintBg, tintText } from "../../components/ui/primitives";
import { tt } from "../../lib/i18n";
import { useNook, type WallCycle } from "../../store/nook";
import { Btn, Page, PageHeader, Panel } from "../ui";

interface Group {
  title: string;
  items: { id: string; label: string }[];
}

const GROUPS: Group[] = [
  {
    title: tt("Maceralar"),
    items: [
      { id: "kutuphane", label: tt("Kütüphane dedektifi") },
      { id: "kamp", label: tt("Kamp ateşi") },
      { id: "deniz", label: tt("Derin deniz") },
      { id: "uzay", label: tt("Uzay yürüyüşü") },
      { id: "kagit-orman", label: tt("Kâğıt orman") },
      { id: "kagit-gece", label: tt("Kâğıt gece") },
      { id: "kizak", label: tt("Kızak") },
      { id: "yagmur", label: tt("Yağmurlu pencere") },
    ],
  },
  {
    title: tt("Çalışma köşesi"),
    items: [
      { id: "gece-mesaisi", label: tt("Gece mesaisi") },
      { id: "lofi", label: tt("Lo-fi masa") },
      { id: "buyucu-masasi", label: tt("Büyücü masası") },
    ],
  },
  {
    title: tt("Müzik ve renk"),
    items: [
      { id: "synthwave", label: "Synthwave DJ" },
      { id: "retro-gunbatimi", label: tt("Retro gün batımı") },
      { id: "dalga-dj", label: tt("Dalga DJ") },
      { id: "gokkusagi-dj", label: tt("Gökkuşağı DJ") },
      { id: "neon-gokkusagi", label: tt("Neon gökkuşağı") },
      { id: "psikedelik", label: tt("Psikedelik") },
      { id: "gokkusagi-nook", label: tt("Gökkuşağı NOOK") },
    ],
  },
  {
    title: tt("NOOK yazısı"),
    items: [
      { id: "neon", label: tt("Neon") },
      { id: "devre", label: tt("Devre") },
      { id: "mavi-devre", label: tt("Mavi devre") },
      { id: "teknoloji", label: tt("Teknoloji") },
      { id: "kis-koyu", label: tt("Kış köyü") },
      { id: "isikli-kis", label: tt("Işıklı kış") },
      { id: "ahsap", label: tt("Ahşap") },
      { id: "orman", label: tt("Orman") },
      { id: "kagit-nook", label: tt("Kâğıt") },
      { id: "art-deco", label: "Art deco" },
      { id: "altin-buyu", label: tt("Altın büyü") },
      { id: "gece-buyusu", label: tt("Gece büyüsü") },
      { id: "zumrut", label: tt("Zümrüt") },
      { id: "santiye", label: tt("Şantiye") },
    ],
  },
  {
    title: tt("Sade"),
    items: [
      { id: "sarmasik", label: tt("Işık sarmaşığı") },
      { id: "devre-yuz", label: tt("Devre yüz") },
      { id: "yorunge", label: tt("Yörünge") },
      { id: "dalga", label: tt("Dalga") },
      { id: "topografya", label: tt("Topografya") },
      { id: "hologram", label: tt("Hologram") },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);
const labelOf = (id: string) => ALL.find((i) => i.id === id)?.label ?? id;
const src = (id: string) => `/wallpapers/${id}.webp`;

const EVERY: { id: number; label: string }[] = [
  { id: 15, label: tt("15 dk") },
  { id: 60, label: tt("1 sa") },
  { id: 180, label: tt("3 sa") },
  { id: 1440, label: tt("1 gün") },
];
const everyLabel = (m: number) => EVERY.find((e) => e.id === m)?.label ?? tt("{0} dk", m);

/** Döngü düzenlenirken: hangi döngü (yeniyse null), adı, sırayla seçilenler, aralık */
interface Draft {
  id: string | null;
  name: string;
  ids: string[];
  everyMin: number;
}

function Card({ id, label, applied, order, onClick, onApply }: { id: string; label: string; applied: boolean; order: number | null; onClick: () => void; onApply: (() => void) | null }) {
  // Tek tık biraz bekler: çift tıklanırsa önizleme açılmadan uygulanır
  const timer = useRef(0);
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => {
        if (!onApply) return onClick();
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(onClick, 230);
      }}
      onDoubleClick={() => {
        window.clearTimeout(timer.current);
        onApply?.();
      }}
      className="group relative cursor-pointer overflow-hidden rounded-[16px] border-2 text-left transition-colors"
      style={{ borderColor: order != null ? ACCENT.blue : applied ? tintBg(ACCENT.teal, 60) : "rgb(255 255 255 / 0.06)" }}
    >
      <img src={src(id)} alt="" draggable={false} loading="lazy" className="block aspect-video w-full object-cover" />
      <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] font-semibold text-label backdrop-blur">
        {applied && <Check size={12} strokeWidth={3} />}
        {label}
      </span>
      {order != null && (
        <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12px] font-extrabold text-white" style={{ background: ACCENT.blue }}>
          {order}
        </span>
      )}
      {onApply && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApply();
          }}
          className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold text-black opacity-0 transition-opacity group-hover:opacity-100"
          style={{ background: ACCENT.teal }}
        >
          <Wallpaper size={12} />
          {tt("Uygula")}
        </button>
      )}
    </motion.div>
  );
}

/** Büyük önizleme: oklarla gez, Esc ile kapat */
function Preview({ id, onClose, onMove, onApply, busy }: { id: string; onClose: () => void; onMove: (d: number) => void; onApply: () => void; busy: boolean }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onMove(-1);
      if (e.key === "ArrowRight") onMove(1);
      if (e.key === "Enter") onApply();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose, onMove, onApply]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/80 p-10 backdrop-blur-md">
      <div className="relative flex w-full max-w-[1100px] items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => onMove(-1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-label hover:bg-white/20" title={tt("Önceki")}>
          <ChevronLeft size={20} />
        </button>
        <motion.img key={id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} src={src(id)} alt="" className="aspect-video min-w-0 flex-1 rounded-[18px] object-cover shadow-2xl" />
        <button onClick={() => onMove(1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-label hover:bg-white/20" title={tt("Sonraki")}>
          <ChevronRight size={20} />
        </button>
        <button onClick={onClose} className="absolute -top-12 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-label hover:bg-white/20" title={tt("Kapat")}>
          <X size={18} />
        </button>
      </div>
      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <span className="text-[15px] font-bold text-label">{labelOf(id)}</span>
        <Btn onClick={onApply} color={ACCENT.teal} disabled={busy}>
          <Wallpaper size={14} />
          {busy ? tt("İndiriliyor…") : tt("Masaüstüne uygula")}
        </Btn>
      </div>
    </motion.div>
  );
}

export function WallpaperPage() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const cycles = s.wallCycles ?? [];
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 3500);
    return () => window.clearTimeout(t);
  }, [msg]);

  /** Tek bir resmi uygular; açık döngü varsa durur (yoksa sıradaki resim bunun üstüne geçerdi) */
  const apply = async (id: string) => {
    setBusy(true);
    try {
      await setWallpaper(id);
      setApplied(id);
      const stopped = !!s.wallCycleOn;
      if (stopped) update({ wallCycleOn: null, wallpaperCycle: null });
      setMsg({ text: stopped ? tt("{0} uygulandı, döngü durdu", labelOf(id)) : tt("{0} masaüstüne uygulandı", labelOf(id)), error: false });
    } catch (e) {
      setMsg({ text: String(e), error: true });
    }
    setBusy(false);
  };

  const startCycle = (c: WallCycle) => {
    update({ wallCycleOn: c.id, wallpaperCycle: { ids: c.ids, everyMin: c.everyMin, since: Date.now() } });
    // İlk resim hemen gelsin (Rust yarım dakikada bir bakar)
    void setWallpaper(c.ids[0]).then(() => setApplied(c.ids[0])).catch(() => {});
    setMsg({ text: tt("{0} döngüsü başladı", c.name), error: false });
  };

  const saveDraft = () => {
    if (!draft || draft.ids.length < 2) return;
    const c: WallCycle = { id: draft.id ?? `w${Date.now()}`, name: draft.name.trim() || tt("Döngü {0}", cycles.length + 1), ids: draft.ids, everyMin: draft.everyMin };
    update({ wallCycles: draft.id ? cycles.map((x) => (x.id === c.id ? c : x)) : [...cycles, c] });
    if (s.wallCycleOn === c.id) startCycle(c);
    setDraft(null);
  };

  const move = (d: number) => {
    if (!preview) return;
    const i = ALL.findIndex((x) => x.id === preview);
    setPreview(ALL[(i + d + ALL.length) % ALL.length].id);
  };

  const onCard = (id: string) => {
    if (!draft) return setPreview(id);
    setDraft({ ...draft, ids: draft.ids.includes(id) ? draft.ids.filter((x) => x !== id) : [...draft.ids, id] });
  };

  return (
    <Page>
      <PageHeader
        icon={Wallpaper}
        color={ACCENT.teal}
        title={tt("Duvar kağıtları")}
        subtitle={tt("Tıkla büyük gör, çift tıkla uygula")}
        actions={
          !draft && (
            <Btn onClick={() => setDraft({ id: null, name: "", ids: [], everyMin: 60 })} color={ACCENT.blue}>
              <Plus size={14} />
              {tt("Yeni döngü")}
            </Btn>
          )
        }
      />

      {/* Döngü kurarken üstte yapışık kalır: aşağıdaki resimleri seçerken kaydet hep elinin altında */}
      {draft && (
        <div className="sticky top-0 z-20 -mx-1 mb-4 flex flex-wrap items-center gap-3 rounded-[18px] border px-4 py-3 backdrop-blur-xl" style={{ background: "rgb(20 22 30 / 0.92)", borderColor: tintBg(ACCENT.blue, 40) }}>
          <Repeat size={16} style={{ color: tintText(ACCENT.blue) }} />
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder={tt("Döngünün adı")}
            className="h-8 w-[160px] rounded-[10px] border border-white/[0.08] bg-white/[0.04] px-2.5 text-[13px] text-label outline-none focus:border-white/25"
          />
          <span className="text-[12.5px] text-label-2">{draft.ids.length ? tt("{0} resim seçildi", draft.ids.length) : tt("Resimlere sırayla tıkla")}</span>
          <Segmented id="wall-every" options={EVERY} value={draft.everyMin} onChange={(v) => setDraft({ ...draft, everyMin: v })} color={ACCENT.blue} />
          <span className="flex-1" />
          <Btn onClick={() => setDraft(null)} color={ACCENT.gray} ghost>
            {tt("Vazgeç")}
          </Btn>
          <Btn onClick={saveDraft} color={ACCENT.blue} disabled={draft.ids.length < 2}>
            <Check size={14} />
            {tt("Kaydet")}
          </Btn>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {cycles.length > 0 && !draft && (
          <Panel title={tt("Döngüler")} hint={tt("Açık döngü resimleri sırayla değiştirir; Windows'un slayt gösterisi gibi, arkada bilgisayarı yormaz.")}>
            <div className="flex flex-col gap-2">
              {cycles.map((c) => {
                const on = s.wallCycleOn === c.id;
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-[14px] border px-3 py-2" style={{ background: on ? tintBg(ACCENT.blue, 10) : "rgb(255 255 255 / 0.03)", borderColor: on ? tintBg(ACCENT.blue, 36) : "rgb(255 255 255 / 0.05)" }}>
                    <div className="flex shrink-0 -space-x-3">
                      {c.ids.slice(0, 5).map((id) => (
                        <img key={id} src={src(id)} alt="" className="h-9 w-16 rounded-[8px] border-2 border-black/60 object-cover" />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-label">{c.name}</p>
                      <p className="text-[11px] text-label-3">{tt("{0} resim · {1}'da bir", c.ids.length, everyLabel(c.everyMin))}</p>
                    </div>
                    <button onClick={() => setDraft({ id: c.id, name: c.name, ids: c.ids, everyMin: c.everyMin })} className="flex h-8 w-8 items-center justify-center rounded-full text-label-3 hover:bg-white/10 hover:text-label" title={tt("Düzenle")}>
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => update({ wallCycles: cycles.filter((x) => x.id !== c.id), ...(on ? { wallCycleOn: null, wallpaperCycle: null } : {}) })}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-label-3 hover:bg-white/10 hover:text-label"
                      title={tt("Sil")}
                    >
                      <Trash2 size={14} />
                    </button>
                    <Toggle on={on} onChange={(v) => (v ? startCycle(c) : update({ wallCycleOn: null, wallpaperCycle: null }))} color={ACCENT.blue} />
                  </div>
                );
              })}
            </div>
          </Panel>
        )}
        {GROUPS.map((g, gi) => (
          <Panel
            key={g.title}
            title={g.title}
            delay={gi * 0.04}
            hint={gi === GROUPS.length - 1 ? tt("Seçtiğin resim ilk uygulamada indirilir ve Resimler › Nook klasörüne kaydedilir.") : undefined}
          >
            <div className="grid grid-cols-3 gap-3">
              {g.items.map((it) => {
                const at = draft ? draft.ids.indexOf(it.id) : -1;
                return (
                  <Card
                    key={it.id}
                    id={it.id}
                    label={it.label}
                    applied={applied === it.id}
                    order={at >= 0 ? at + 1 : null}
                    onClick={() => onCard(it.id)}
                    onApply={draft || busy ? null : () => void apply(it.id)}
                  />
                );
              })}
            </div>
          </Panel>
        ))}
      </div>

      <AnimatePresence>{preview && <Preview id={preview} busy={busy} onClose={() => setPreview(null)} onMove={move} onApply={() => void apply(preview)} />}</AnimatePresence>
      <AnimatePresence>
        {msg && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-white/10 bg-black/80 px-4 py-2 text-[12.5px] font-semibold backdrop-blur"
            style={{ color: msg.error ? tintText(ACCENT.red) : tintText(ACCENT.green) }}
          >
            {msg.text}
          </motion.p>
        )}
      </AnimatePresence>
    </Page>
  );
}
