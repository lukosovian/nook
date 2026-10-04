import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Shuffle } from "lucide-react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import {
  ACCENT_COLORS,
  BODY_COLORS,
  EYE_STYLES,
  GLASSES,
  HEADS,
  NAME_MAX,
  NECKS,
  randomLook,
  SHAPES,
  type Look,
  type ShapeId,
} from "../../lib/look";
import { spring } from "../../lib/motion";
import { useNook } from "../../store/nook";
import { eyesFor } from "../mascot/Eye";
import { EYE_GAP, EYE_GAP_GLASSES, EYE_SCALE_GLASSES, Glasses, HeadWear, NeckWear } from "../mascot/Wear";
import { ACCENT } from "../ui/primitives";

/**
 * Nook'un görünümü: isim, gövde, renk, gözler, gözlük, başlık, boyun.
 * Soldaki büyük Nook canlı önizleme; her seçenek kendi Nook'unun o hâliyle gösterilir.
 */
export function LookPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("look", scroller);
  const look = useNook((s) => s.settings.look);
  const color = useNook((s) => s.settings.faceColor);
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

      <Group title="Gövde">
        {(Object.keys(SHAPES) as ShapeId[]).map((id) => (
          <Option key={id} label={SHAPES[id].label} on={look.shape === id} onClick={() => set({ shape: id })}>
            <Figure look={{ ...look, shape: id, glasses: "none", head: "none", neck: "none" }} color={color} />
          </Option>
        ))}
      </Group>

      <Group title="Renk">
        <Swatches colors={BODY_COLORS} value={color} onChange={(c) => update({ faceColor: c })} sphere />
      </Group>

      <Group title="Gözler">
        {EYE_STYLES.map((o) => (
          <Option key={o.id} label={o.label} on={look.eyes === o.id} onClick={() => set({ eyes: o.id })}>
            <Figure look={{ ...look, eyes: o.id, glasses: "none", head: "none", neck: "none" }} color={color} zoom />
          </Option>
        ))}
      </Group>

      <Group title="Gözlük">
        {GLASSES.map((o) => (
          <Option key={o.id} label={o.label} on={look.glasses === o.id} onClick={() => set({ glasses: o.id })}>
            <Figure look={{ ...look, glasses: o.id, head: "none", neck: "none" }} color={color} zoom />
          </Option>
        ))}
      </Group>

      <Group title="Başlık">
        {HEADS.map((o) => (
          <Option key={o.id} label={o.label} on={look.head === o.id} onClick={() => set({ head: o.id })}>
            <Figure look={{ ...look, head: o.id, neck: "none" }} color={color} />
          </Option>
        ))}
      </Group>

      <Group title="Boyun">
        {NECKS.map((o) => (
          <Option key={o.id} label={o.label} on={look.neck === o.id} onClick={() => set({ neck: o.id })}>
            <Figure look={{ ...look, neck: o.id, head: "none" }} color={color} />
          </Option>
        ))}
      </Group>

      <Group title="Aksesuar rengi">
        <Swatches colors={ACCENT_COLORS} value={look.accent} onChange={(c) => set({ accent: c })} />
      </Group>
    </div>
  );
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
      <span className="flex h-[34px] w-[40px] items-center justify-center overflow-hidden">{children}</span>
      <span className={`text-[10px] font-medium ${on ? "text-label" : "text-label-3"}`}>{label}</span>
    </motion.button>
  );
}

function Swatches({ colors, value, onChange, sphere = false }: { colors: string[]; value: string; onChange: (c: string) => void; sphere?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5 py-0.5">
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          aria-label={c}
          className="h-[18px] w-[18px] rounded-full transition-transform hover:scale-110"
          style={{
            background: sphere
              ? `radial-gradient(circle at 35% 30%, #fff 0%, ${c} 45%, color-mix(in srgb, ${c} 62%, #5d5d6b) 100%)`
              : `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${c}, white 35%) 0%, ${c} 50%, color-mix(in srgb, ${c}, black 30%) 100%)`,
            boxShadow: value.toLowerCase() === c.toLowerCase() ? `0 0 0 1.5px #000, 0 0 0 3px ${ACCENT.teal}` : "inset 0 0 0 0.5px rgba(255,255,255,0.12)",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Seçenek kartındaki küçük, kıpırdamayan Nook: büyük Nook'la aynı gövde, göz ve giysiler.
 * `zoom`: gözler/gözlük seçilirken yüze yaklaş.
 */
export function Figure({ look, color, zoom = false }: { look: Look; color: string; zoom?: boolean }) {
  const body = SHAPES[look.shape].body;
  const [eye, , shine] = eyesFor("idle", look.eyes);
  const gap = look.glasses === "none" ? EYE_GAP : EYE_GAP_GLASSES;
  const shade = `color-mix(in srgb, ${color} 62%, #5d5d6b)`;
  return (
    <div className="relative shrink-0" style={{ width: 24, height: 24, transform: `scale(${zoom ? 1.55 : 1.05})`, marginTop: zoom ? 6 : 3 }}>
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden"
        style={{
          width: body.width,
          height: body.height,
          borderRadius: body.borderRadius,
          transform: "translate(-50%, -50%)",
          backgroundImage: `radial-gradient(circle at 36% 30%, #ffffff 0%, ${color} 34%, ${shade} 100%)`,
          boxShadow: "0 2px 6px rgba(0,0,0,0.55), inset -1.5px -2.5px 4px rgba(0,0,0,0.16)",
        }}
      >
        {[-1, 1].map((side) => (
          <span
            key={side}
            className="absolute left-1/2 top-1/2 bg-black"
            style={{
              width: eye.width,
              height: eye.height,
              borderRadius: `${eye.borderTopLeftRadius}px ${eye.borderTopRightRadius}px ${eye.borderBottomRightRadius}px ${eye.borderBottomLeftRadius}px`,
              transform: `translate(calc(-50% + ${side * gap}px), calc(-50% + ${1.2 + eye.marginTop / 2}px)) rotate(${eye.rotate}deg) scale(${look.glasses === "none" ? 1 : EYE_SCALE_GLASSES})`,
            }}
          >
            {shine && <span className="absolute rounded-full bg-white/90" style={{ width: 1.3, height: 1.3, left: "16%", top: "14%" }} />}
          </span>
        ))}
        <Glasses id={look.glasses} accent={look.accent} style={{ y: 1.2 }} />
      </div>
      <NeckWear id={look.neck} accent={look.accent} body={body} />
      <HeadWear id={look.head} accent={look.accent} body={body} />
    </div>
  );
}
