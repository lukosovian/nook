import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Shuffle } from "lucide-react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import {
  BODY_COLORS,
  EYE_STYLES,
  GLASSES,
  HALLOWEEN,
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
import { useNook } from "../../store/nook";
import { NookFigure } from "../mascot/Figure";
import { ACCENT } from "../ui/primitives";

/**
 * Nook'un görünümü: isim, gövde, renk, gözler, gözlük, başlık, boyun.
 * Soldaki büyük Nook canlı önizleme; her seçenek kendi Nook'unun o hâliyle gösterilir.
 */
export function LookPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("look", scroller);
  const look = normalizeLook(useNook((s) => s.settings.look));
  const color = normalizeColor(useNook((s) => s.settings.faceColor));
  const update = useNook((s) => s.updateSettings);
  const set = (patch: Partial<Look>) => update({ look: { ...look, ...patch } });

  return (
    <div ref={scroller} className="-mr-1.5 h-full space-y-2.5 overflow-y-auto pr-1.5">
      <div className="flex items-center gap-2">
        <NameInput />
        <motion.button
          whileTap={{ scale: 0.94 }}
          transition={spring.pop}
          onClick={() => {
            const r = randomLook();
            update({ look: r.look, faceColor: r.color });
          }}
          className="flex shrink-0 items-center gap-1 rounded-full bg-well px-2.5 py-1 text-[11px] font-medium text-label-2 transition-colors hover:bg-well-hi hover:text-label"
        >
          <Shuffle size={11} strokeWidth={2.4} />
          Şaşırt beni
        </motion.button>
      </div>

      <Group title="Cadılar Bayramı 🎃">
        {HALLOWEEN.map((o) => (
          <Option
            key={o.name}
            label={o.name}
            on={color.toLowerCase() === o.color.toLowerCase() && JSON.stringify(look) === JSON.stringify(o.look)}
            onClick={() => update({ look: o.look, faceColor: o.color })}
          >
            <Figure look={o.look} color={o.color} drop={3} />
          </Option>
        ))}
      </Group>

      <Group title="Gövde">
        {SHAPES.map((o) => (
          <Option key={o.id} label={o.label} on={look.shape === o.id} onClick={() => set({ shape: o.id })}>
            <Figure look={{ ...bare(look), shape: o.id }} color={color} />
          </Option>
        ))}
      </Group>

      <Group title="Doku">
        {TEXTURES.map((o) => (
          <Option key={o.id} label={o.label} on={look.texture === o.id} onClick={() => set({ texture: o.id })}>
            <Figure look={{ ...bare(look), texture: o.id }} color={color} />
          </Option>
        ))}
      </Group>

      <Group title="Renk">
        <Swatches value={color} onChange={(c) => update({ faceColor: c })} />
      </Group>

      <Group title="Gözler">
        {EYE_STYLES.map((o) => (
          <Option key={o.id} label={o.label} on={look.eyes === o.id} onClick={() => set({ eyes: o.id })}>
            <Figure look={{ ...bare(look), eyes: o.id }} color={color} zoom />
          </Option>
        ))}
      </Group>

      <Group title="Gözlük">
        {GLASSES.map((o) => (
          <Option key={o.id} label={o.label} on={look.glasses === o.id} onClick={() => set({ glasses: o.id })}>
            <Figure look={{ ...bare(look), glasses: o.id }} color={color} zoom />
          </Option>
        ))}
      </Group>

      <Group title="Başlık">
        {HEADS.map((o) => (
          <Option key={o.id} label={o.label} on={look.head === o.id} onClick={() => set({ head: o.id })}>
            <Figure look={{ ...bare(look), head: o.id }} color={color} drop={4} />
          </Option>
        ))}
      </Group>

      <Group title="Boyun">
        {NECKS.map((o) => (
          <Option key={o.id} label={o.label} on={look.neck === o.id} onClick={() => set({ neck: o.id })}>
            <Figure look={{ ...bare(look), neck: o.id }} color={color} />
          </Option>
        ))}
      </Group>
    </div>
  );
}

/** Bir seçeneği gösterirken öbür aksesuarlar kalabalık etmesin */
const bare = (look: Look): Look => ({ ...look, glasses: "none", head: "none", neck: "none" });

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
    <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-well px-3 py-1 focus-within:bg-well-hi">
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] text-label-3">Adı</span>
      <input
        value={draft}
        maxLength={NAME_MAX}
        placeholder="Nook"
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-label outline-none placeholder:text-label-3"
      />
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-label-3">{title}</h3>
      <div className="flex flex-wrap gap-1">{children}</div>
    </section>
  );
}

function Option({ label, on, onClick, children }: { label: string; on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.94 }}
      transition={spring.pop}
      onClick={onClick}
      title={label}
      className={`flex w-[52px] flex-col items-center gap-0.5 rounded-[12px] pb-1 pt-1.5 transition-colors ${on ? "bg-white/[0.12]" : "bg-well hover:bg-well-hi"}`}
      style={on ? { boxShadow: `inset 0 0 0 1px ${ACCENT.teal}` } : undefined}
    >
      <span className="relative flex h-[40px] w-[46px] items-center justify-center overflow-hidden">{children}</span>
      <span className={`max-w-full truncate px-0.5 text-[10px] font-medium ${on ? "text-label" : "text-label-3"}`}>{label}</span>
    </motion.button>
  );
}

function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 py-0.5">
      {BODY_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          aria-label={c}
          className="h-[20px] w-[20px] rounded-full transition-transform hover:scale-110"
          style={{
            background: `radial-gradient(circle at 34% 28%, color-mix(in srgb, ${c}, white 45%) 0%, ${c} 42%, color-mix(in srgb, ${c}, black 28%) 100%)`,
            boxShadow: value.toLowerCase() === c.toLowerCase() ? `0 0 0 1.5px #000, 0 0 0 3px ${ACCENT.teal}` : "inset 0 0 0 0.5px rgba(255,255,255,0.12)",
          }}
        />
      ))}
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
