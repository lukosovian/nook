import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Shuffle } from "lucide-react";
import {
  BODY_COLORS,
  COLLECTION_GROUPS,
  FACES,
  EYE_STYLES,
  GLASSES,
  HALLOWEEN,
  HALLOWEEN_PARTS,
  HEADS,
  NAME_MAX,
  NECKS,
  normalizeColor,
  normalizeLook,
  randomLook,
  SHAPES,
  TEXTURES,
  type Look,
} from "../../lib/look";
import { spring } from "../../lib/motion";
import { cancelPrefetch, prefetchBodies, warmLook } from "../../lib/nook3d";
import { useNook } from "../../store/nook";
import { figureRes, NookFigure } from "../mascot/Figure";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

/** Studio'da seçenekler daha büyük çizilir */
export const LookBig = createContext(false);

type Section = "collection" | "shape" | "texture" | "color" | "eyes" | "glasses" | "head" | "neck" | "face";
const SECTIONS: { id: Section; label: string }[] = [
  { id: "collection", label: tt("Koleksiyon") },
  { id: "shape", label: tt("Gövde") },
  { id: "texture", label: tt("Doku") },
  { id: "color", label: tt("Renk") },
  { id: "eyes", label: tt("Gözler") },
  { id: "glasses", label: tt("Gözlük") },
  { id: "head", label: tt("Başlık") },
  { id: "neck", label: tt("Boyun") },
  { id: "face", label: tt("Yüz ve süs") },
];
const HALLOWEEN_TITLE = tt("Cadılar Bayramı 🎃");
const COLLECTION_TABS = [...COLLECTION_GROUPS.map((g) => g.title), HALLOWEEN_TITLE];

/** Seçilen bölüm ve koleksiyon kategorisi sayfa değişince unutulmasın */
let lastSection: Section = "collection";
let lastGroup = COLLECTION_TABS[0];

/**
 * Nook'un görünümü (Studio): üstte bölüm sekmeleri; aynı anda yalnızca seçili bölümün seçenekleri çizilir
 * (yüzlerce 3B Nook'u birden çizmek sayfayı donduruyordu). Her seçenek kendi Nook'unun o hâliyle.
 */
export function LookPanel() {
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  const update = useNook((s) => s.updateSettings);
  const set = (patch: Partial<Look>) => update({ look: { ...look, ...patch } });
  const [section, setSection] = useState<Section>(lastSection);
  const [group, setGroup] = useState(lastGroup);
  useEffect(() => void (lastSection = section), [section]);
  useEffect(() => void (lastGroup = group), [group]);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [section, group]);
  // "Şaşırt beni"nin sıradaki görünümü önceden seçilir ve çizimi hazırlanır: basınca beklemeden gelsin
  const [nextRandom, setNextRandom] = useState(randomLook);
  useEffect(() => {
    warmLook(nextRandom.look);
  }, [nextRandom]);
  // Öbür sekmelerin Nook'ları arkada (açık sekmeninkilerden sonra) hazırlanır: sekmeye geçince beklemeden dolu gelsin.
  // Çizilenler diske de yazılır; sonraki açılışlarda derleme hiç gerekmez.
  const sig = JSON.stringify(bare(look)) + color;
  useEffect(() => {
    const t = window.setTimeout(() => prefetchBodies(optionBodies(look, color)), 1200);
    return () => {
      window.clearTimeout(t);
      cancelPrefetch();
    };
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  const same = (o: { look: Look; color: string }) => color.toLowerCase() === o.color.toLowerCase() && JSON.stringify(look) === JSON.stringify(o.look);

  const body = (() => {
    switch (section) {
      case "collection": {
        const items = group === HALLOWEEN_TITLE ? HALLOWEEN : (COLLECTION_GROUPS.find((g) => g.title === group)?.items ?? []);
        return items.map((o) => (
          <Option key={o.name} label={o.name} on={same(o)} onClick={() => update({ look: o.look, faceColor: o.color })}>
            <Figure look={o.look} color={o.color} drop={3} />
          </Option>
        ));
      }
      case "shape":
        return SHAPES.filter((o) => !HALLOWEEN_PARTS.has(o.id)).map((o) => (
          <Option key={o.id} label={o.label} on={look.shape === o.id} onClick={() => set({ shape: o.id })}>
            <Figure look={{ ...bare(look), shape: o.id }} color={color} />
          </Option>
        ));
      case "texture":
        return TEXTURES.map((o) => (
          <Option key={o.id} label={o.label} on={look.texture === o.id} onClick={() => set({ texture: o.id })}>
            <Figure look={{ ...bare(look), texture: o.id }} color={color} />
          </Option>
        ));
      case "color":
        return <Swatches value={color} onChange={(c) => update({ faceColor: c })} />;
      case "eyes":
        return EYE_STYLES.map((o) => (
          <Option key={o.id} label={o.label} on={look.eyes === o.id} onClick={() => set({ eyes: o.id })}>
            <Figure look={{ ...bare(look), eyes: o.id }} color={color} zoom />
          </Option>
        ));
      case "glasses":
        return GLASSES.map((o) => (
          <Option key={o.id} label={o.label} on={look.glasses === o.id} onClick={() => set({ glasses: o.id })}>
            <Figure look={{ ...bare(look), glasses: o.id }} color={color} zoom />
          </Option>
        ));
      case "head":
        return HEADS.filter((o) => !HALLOWEEN_PARTS.has(o.id)).map((o) => (
          <Option key={o.id} label={o.label} on={look.head === o.id} onClick={() => set({ head: o.id })}>
            <Figure look={{ ...bare(look), head: o.id }} color={color} drop={4} />
          </Option>
        ));
      case "neck":
        return NECKS.map((o) => (
          <Option key={o.id} label={o.label} on={look.neck === o.id} onClick={() => set({ neck: o.id })}>
            <Figure look={{ ...bare(look), neck: o.id }} color={color} />
          </Option>
        ));
      case "face":
        return FACES.map((o) => (
          <Option key={o.id} label={o.label} on={look.face === o.id} onClick={() => set({ face: o.id })}>
            <Figure look={{ ...bare(look), face: o.id }} color={color} zoom={o.id === "mustache" || o.id === "nose"} />
          </Option>
        ));
    }
  })();

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <NameInput />
        <motion.button
          whileTap={{ scale: 0.94 }}
          transition={spring.pop}
          onClick={() => {
            update({ look: nextRandom.look, faceColor: nextRandom.color });
            setNextRandom(randomLook());
          }}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-[12px] border px-3.5 text-[12.5px] font-semibold"
          style={{ background: tintBg(ACCENT.pink, 16), borderColor: tintBg(ACCENT.pink, 38), color: tintText(ACCENT.pink) }}
        >
          <Shuffle size={13} strokeWidth={2.4} />
          {tt("Şaşırt beni")}
        </motion.button>
      </div>

      {/* Bölümler */}
      <div className="no-scrollbar flex gap-0.5 overflow-x-auto rounded-[14px] border border-white/[0.06] bg-white/[0.025] p-1">
        {SECTIONS.map((s) => {
          const on = s.id === section;
          return (
            <button key={s.id} onClick={() => setSection(s.id)} className={`relative shrink-0 whitespace-nowrap rounded-[10px] px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors ${on ? "text-label" : "text-label-3 hover:text-label-2"}`}>
              {on && <motion.span layoutId="look-sec" className="absolute inset-0 rounded-[10px]" style={{ background: tintBg(ACCENT.pink, 20), boxShadow: `inset 0 0 0 1px ${tintBg(ACCENT.pink, 40)}` }} transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
              <span className="relative">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Koleksiyonun kategorileri */}
      {section === "collection" && (
        <div className="flex flex-wrap gap-1.5">
          {COLLECTION_TABS.map((t) => {
            const on = t === group;
            return (
              <button
                key={t}
                onClick={() => setGroup(t)}
                className="rounded-full border px-3 py-[3px] text-[11.5px] font-semibold transition-colors"
                style={on ? { background: "rgb(255 255 255 / 0.1)", borderColor: "rgb(255 255 255 / 0.2)", color: "var(--color-label)" } : { borderColor: "rgb(255 255 255 / 0.07)", color: "var(--color-label-3)" }}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      <div ref={scroller} className="-mr-1.5 min-h-0 flex-1 overflow-y-auto pr-1.5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${section}:${section === "collection" ? group : ""}`}
            className="flex flex-wrap content-start gap-2 pb-4"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
          >
            {body}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Bir seçeneği gösterirken öbür aksesuarlar kalabalık etmesin */
const bare = (look: Look): Look => ({ ...look, glasses: "none", head: "none", neck: "none", face: "none" });

/** Bütün sekmelerdeki seçenek Nook'larının gövde resimleri (Figure'ın istediğiyle birebir aynı) */
function optionBodies(look: Look, color: string) {
  const b = bare(look);
  const small = figureRes(31);
  const near = figureRes(47);
  const mine = (patch: Partial<Look>, zoom = false) => ({ look: { ...b, ...patch }, color, size: zoom ? near : small });
  return [
    ...SHAPES.filter((o) => !HALLOWEEN_PARTS.has(o.id)).map((o) => mine({ shape: o.id })),
    ...TEXTURES.map((o) => mine({ texture: o.id })),
    ...HEADS.filter((o) => !HALLOWEEN_PARTS.has(o.id)).map((o) => mine({ head: o.id })),
    ...NECKS.map((o) => mine({ neck: o.id })),
    ...GLASSES.map((o) => mine({ glasses: o.id }, true)),
    ...FACES.map((o) => mine({ face: o.id }, o.id === "mustache" || o.id === "nose")),
    mine({}, true),
    ...[...COLLECTION_GROUPS.flatMap((g) => g.items), ...HALLOWEEN].map((o) => ({ look: o.look, color: o.color, size: small })),
  ];
}

function NameInput() {
  const name = useNook((s) => s.settings.nookName);
  const update = useNook((s) => s.updateSettings);
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  const save = () => {
    const v = draft.trim().slice(0, NAME_MAX);
    if (v !== name) update({ nookName: v });
  };
  return (
    <label className="flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-[12px] border border-white/[0.07] bg-white/[0.03] px-3 focus-within:border-white/20">
      <span className="shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-label-3">{tt("Adı")}</span>
      <input
        value={draft}
        maxLength={NAME_MAX}
        placeholder="Nook"
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-label outline-none placeholder:text-label-3"
      />
    </label>
  );
}

/** Ekrana girince çizilir: uzun listelerde görünmeyen Nook'lar sırayı tıkamasın */
function useSeen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

function Option({ label, on, onClick, children }: { label: string; on: boolean; onClick: () => void; children: React.ReactNode }) {
  const big = useContext(LookBig);
  const [ref, seen] = useSeen<HTMLButtonElement>();
  return (
    <motion.button
      ref={ref}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.93 }}
      transition={spring.pop}
      onClick={onClick}
      title={label}
      className={`relative flex flex-col items-center gap-0.5 border transition-colors ${big ? "w-[92px] rounded-[18px] pb-2 pt-2.5" : "w-[52px] rounded-[12px] pb-1 pt-1.5"}`}
      style={on ? { background: tintBg(ACCENT.pink, 14), borderColor: tintBg(ACCENT.pink, 55) } : { background: "rgb(255 255 255 / 0.03)", borderColor: "rgb(255 255 255 / 0.06)" }}
    >
      <span className={`relative flex items-center justify-center overflow-hidden ${big ? "h-[58px] w-[70px]" : "h-[40px] w-[46px]"}`} style={big ? { zoom: 1.5 } : undefined}>
        {seen ? children : null}
      </span>
      <span className={`max-w-full truncate px-1 font-semibold ${big ? "text-[11.5px]" : "text-[10px]"}`} style={{ color: on ? tintText(ACCENT.pink) : "var(--color-label-3)" }}>
        {label}
      </span>
      {on && <motion.span layoutId="look-on" className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#0e0e10]" style={{ background: ACCENT.pink }} transition={spring.pop} />}
    </motion.button>
  );
}

function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2.5 py-1">
      {BODY_COLORS.map((c) => {
        const on = value.toLowerCase() === c.toLowerCase();
        return (
          <motion.button
            key={c}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(c)}
            aria-label={c}
            className="h-[38px] w-[38px] rounded-full"
            style={{
              background: `radial-gradient(circle at 34% 28%, color-mix(in srgb, ${c}, white 45%) 0%, ${c} 42%, color-mix(in srgb, ${c}, black 28%) 100%)`,
              boxShadow: on ? `0 0 0 2.5px #0e0e10, 0 0 0 4.5px ${ACCENT.pink}` : "inset 0 0 0 0.5px rgba(255,255,255,0.12)",
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Seçenek kartındaki küçük, kıpırdamayan Nook. `zoom`: gözler, gözlük seçilirken yüze yaklaş.
 */
function Figure({ look, color, zoom = false, drop = 0 }: { look: Look; color: string; zoom?: boolean; drop?: number }) {
  const size = zoom ? 47 : 31;
  return <NookFigure look={look} color={color} size={size} className="absolute left-1/2 top-1/2" style={{ marginLeft: -size / 2, marginTop: -size / 2 + (zoom ? 2 : 1) + drop }} />;
}
