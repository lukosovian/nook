import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Shuffle } from "lucide-react";
import { NookFigure } from "@nook/components/mascot/Figure";
import {
  BODY_COLORS,
  COLLECTION_GROUPS,
  FACES,
  EYE_STYLES,
  GLASSES,
  HALLOWEEN,
  HALLOWEEN_PARTS,
  HEADS,
  NECKS,
  normalizeColor,
  normalizeLook,
  randomLook,
  SHAPES,
  TEXTURES,
  type Look,
} from "@nook/lib/look";
import { setLook, type Pairing, type Status } from "../lib/pc";
import { errText, tintBg, TopBar, useBackButton, useToast } from "../ui";
import type { Conn } from "../App";

const PINK = "#FF5C8A";

/** PC'den gelen görünüm, telefonda yapılan son değişiklikten bu kadar sonra yeniden esas alınır */
const HOLD_MS = 8000;

/**
 * Görünüm: PC'deki Nook'un gövdesini, dokusunu, rengini ve aksesuarlarını telefondan değiştir.
 * PC'deki Görünüm paneliyle aynı seçenekler ve hazır Nook'lar (Koleksiyon, Cadılar Bayramı);
 * dokununca hemen PC'ye gider.
 */
export function LookScreen({ pairing, status, conn, onBack }: { pairing: Pairing; status: Status | null; conn: Conn; onBack: () => void }) {
  useBackButton(onBack);
  const online = conn === "online";
  const [toast, say] = useToast();
  const remoteLook = normalizeLook(status?.nook?.look as Look);
  const remoteColor = normalizeColor(status?.nook?.color);
  const [look, setLocalLook] = useState<Look>(remoteLook);
  const [color, setColor] = useState(remoteColor);
  const touched = useRef(0);

  // PC'de değiştiyse buraya da gelsin (telefonda az önce değiştirilmediyse)
  const remoteKey = JSON.stringify(remoteLook) + remoteColor;
  useEffect(() => {
    if (Date.now() - touched.current < HOLD_MS) return;
    setLocalLook(remoteLook);
    setColor(remoteColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteKey]);

  const apply = (next: Look, nextColor = color) => {
    if (!online) return say("PC açılınca değiştirebilirsin");
    const prev = { look, color };
    touched.current = Date.now();
    setLocalLook(next);
    setColor(nextColor);
    setLook(pairing, next, nextColor).catch((e) => {
      setLocalLook(prev.look);
      setColor(prev.color);
      say(errText(e));
    });
  };
  const set = (patch: Partial<Look>) => apply({ ...look, ...patch });
  const same = (o: { look: Look; color: string }) => o.color.toLowerCase() === color.toLowerCase() && JSON.stringify(o.look) === JSON.stringify(look);

  return (
    <div className="safe flex min-h-screen flex-col gap-4 px-4 pb-8">
      <TopBar title="Görünüm" nook="look" onBack={onBack} />

      <section className="flex flex-col items-center gap-3 pt-2">
        <div className={online ? "" : "opacity-60 grayscale"}>
          <NookFigure look={look} color={color} size={110} res={256} alive />
        </div>
        <motion.button
          whileTap={{ scale: 0.94 }}
          disabled={!online}
          onClick={() => {
            const r = randomLook();
            apply(r.look, r.color);
          }}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] font-semibold disabled:opacity-40"
          style={{ background: tintBg(PINK, 16), color: PINK }}
        >
          <Shuffle size={15} strokeWidth={2.4} />
          Şaşırt beni
        </motion.button>
        {!online && <p className="text-[12.5px] text-label-3">PC açılınca değiştirebilirsin</p>}
      </section>

      {COLLECTION_GROUPS.map((g) => (
        <Group key={g.title} title={`Koleksiyon · ${g.title}`}>
          {g.items.map((o) => (
            <Option key={o.name} label={o.name} on={same(o)} onClick={() => apply(o.look, o.color)}>
              <Fig look={o.look} color={o.color} />
            </Option>
          ))}
        </Group>
      ))}

      <Group title="Cadılar Bayramı 🎃">
        {HALLOWEEN.map((o) => (
          <Option key={o.name} label={o.name} on={same(o)} onClick={() => apply(o.look, o.color)}>
            <Fig look={o.look} color={o.color} />
          </Option>
        ))}
      </Group>

      <Group title="Gövde">
        {SHAPES.filter((o) => !HALLOWEEN_PARTS.has(o.id)).map((o) => (
          <Option key={o.id} label={o.label} on={look.shape === o.id} onClick={() => set({ shape: o.id })}>
            <Fig look={{ ...bare(look), shape: o.id }} color={color} />
          </Option>
        ))}
      </Group>

      <Group title="Doku">
        {TEXTURES.map((o) => (
          <Option key={o.id} label={o.label} on={look.texture === o.id} onClick={() => set({ texture: o.id })}>
            <Fig look={{ ...bare(look), texture: o.id }} color={color} />
          </Option>
        ))}
      </Group>

      <section>
        <h2 className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-label-3">Renk</h2>
        <div className="flex flex-wrap gap-2.5 px-1">
          {BODY_COLORS.map((c) => (
            <button
              key={c}
              aria-label={c}
              onClick={() => apply(look, c)}
              className="h-9 w-9 rounded-full"
              style={{
                background: `radial-gradient(circle at 34% 28%, color-mix(in srgb, ${c}, white 45%) 0%, ${c} 42%, color-mix(in srgb, ${c}, black 28%) 100%)`,
                boxShadow: color.toLowerCase() === c.toLowerCase() ? `0 0 0 2px #000, 0 0 0 4px ${PINK}` : "inset 0 0 0 0.5px rgba(255,255,255,0.12)",
              }}
            />
          ))}
        </div>
      </section>

      <Group title="Gözler">
        {EYE_STYLES.map((o) => (
          <Option key={o.id} label={o.label} on={look.eyes === o.id} onClick={() => set({ eyes: o.id })}>
            <Fig look={{ ...bare(look), eyes: o.id }} color={color} />
          </Option>
        ))}
      </Group>

      <Group title="Gözlük">
        {GLASSES.map((o) => (
          <Option key={o.id} label={o.label} on={look.glasses === o.id} onClick={() => set({ glasses: o.id })}>
            <Fig look={{ ...bare(look), glasses: o.id }} color={color} />
          </Option>
        ))}
      </Group>

      <Group title="Başlık">
        {HEADS.filter((o) => !HALLOWEEN_PARTS.has(o.id)).map((o) => (
          <Option key={o.id} label={o.label} on={look.head === o.id} onClick={() => set({ head: o.id })}>
            <Fig look={{ ...bare(look), head: o.id }} color={color} />
          </Option>
        ))}
      </Group>

      <Group title="Boyun">
        {NECKS.map((o) => (
          <Option key={o.id} label={o.label} on={look.neck === o.id} onClick={() => set({ neck: o.id })}>
            <Fig look={{ ...bare(look), neck: o.id }} color={color} />
          </Option>
        ))}
      </Group>

      <Group title="Yüz ve süs">
        {FACES.map((o) => (
          <Option key={o.id} label={o.label} on={look.face === o.id} onClick={() => set({ face: o.id })}>
            <Fig look={{ ...bare(look), face: o.id }} color={color} />
          </Option>
        ))}
      </Group>

      {toast}
    </div>
  );
}

/** Bir seçeneği gösterirken öbür aksesuarlar kalabalık etmesin */
const bare = (look: Look): Look => ({ ...look, glasses: "none", head: "none", neck: "none", face: "none" });

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-label-3">{title}</h2>
      <div className="grid grid-cols-4 gap-2">{children}</div>
    </section>
  );
}

function Option({ label, on, onClick, children }: { label: string; on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl pb-2 pt-2.5 ${on ? "bg-card-hi" : "bg-card"}`}
      style={on ? { boxShadow: `inset 0 0 0 1.5px ${PINK}` } : undefined}
    >
      <span className="relative flex h-[58px] w-full items-center justify-center">{children}</span>
      <span className={`max-w-full truncate px-1 text-[11.5px] font-medium ${on ? "text-label" : "text-label-3"}`}>{label}</span>
    </motion.button>
  );
}

/** Seçenek kartındaki küçük Nook: şapka sığsın diye biraz aşağıda */
function Fig({ look, color }: { look: Look; color: string }) {
  return <NookFigure look={look} color={color} size={40} style={{ marginTop: 8 }} />;
}
