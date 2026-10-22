/**
 * Yalnızca geliştirme (?preview=karakter): karakter denemesi Lokum. Büyük hâli, ruh hâlleri,
 * renk seçenekleri, kulaklık ve adadaki küçük boyu bir arada.
 * Ekran görüntüsü için: &mood=happy&color=1&phones=0&still=2.4&aim=0.8,0.3
 */
import { useState } from "react";
import { Character3D, type Mood } from "../lib/character3d";

const COLORS = [
  { id: "gül", label: "Gül", hex: "#FF9CC0" },
  { id: "fıstık", label: "Fıstık", hex: "#A6DB7E" },
  { id: "limon", label: "Limon", hex: "#FFD873" },
  { id: "nar", label: "Nar", hex: "#FF6676" },
];

const MOODS: { id: Mood; label: string; hint: string }[] = [
  { id: "idle", label: "Boşta", hint: "Etrafa bakar, imleci izler" },
  { id: "happy", label: "Mutlu", hint: "Hoplayıp sallanır" },
  { id: "music", label: "Müzik", hint: "Ritme göre sallanır" },
  { id: "sleepy", label: "Uykulu", hint: "Gözleri kapanır, başı düşer" },
  { id: "surprised", label: "Şaşkın", hint: "Sıçrar, gözleri açılır" },
];

export function CharacterLab() {
  const q = new URLSearchParams(location.search);
  const still = q.has("still") && q.get("still") !== "" ? Number(q.get("still")) : undefined;
  const [mood, setMood] = useState<Mood>((q.get("mood") as Mood) ?? "idle");
  const [color, setColor] = useState(COLORS[Number(q.get("color") ?? 0)] ?? COLORS[0]);
  const [phones, setPhones] = useState(q.get("phones") !== "0");
  const aim = q.get("aim")?.split(",").map(Number) as [number, number] | undefined;

  return (
    <div className="flex h-full w-full items-center justify-center gap-10 bg-[#0e0e10] p-10 text-label">
      {/* Sahne */}
      <div
        className="relative flex h-[560px] w-[560px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-[36px] border border-white/[0.06]"
        style={{ background: `radial-gradient(circle at 50% 38%, color-mix(in srgb, ${color.hex} 26%, #1a1a1f), #111114 72%)` }}
      >
        <Character3D size={430} color={color.hex} phones={phones} mood={mood} res={2} still={still} aim={aim} />
        <div className="absolute bottom-6 text-center">
          <p className="text-[26px] font-extrabold tracking-[-0.02em]">Lokum</p>
          <p className="text-[12.5px] text-label-3">Yumuşacık, biraz uykucu, müziksiz yapamaz</p>
        </div>
      </div>

      {/* Ayarlar */}
      <div className="flex w-[300px] flex-col gap-6">
        <Group title="Ruh hâli">
          <div className="flex flex-col gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMood(m.id)}
                className={`rounded-[14px] border px-3.5 py-2.5 text-left transition-colors ${mood === m.id ? "border-white/20 bg-white/[0.09]" : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]"}`}
              >
                <span className="block text-[13px] font-semibold">{m.label}</span>
                <span className="block text-[11px] text-label-3">{m.hint}</span>
              </button>
            ))}
          </div>
        </Group>

        <Group title="Renk">
          <div className="flex gap-2.5">
            {COLORS.map((c) => (
              <button key={c.id} onClick={() => setColor(c)} className="flex flex-col items-center gap-1.5">
                <span className="h-10 w-10 rounded-full transition-transform" style={{ background: c.hex, boxShadow: color.id === c.id ? `0 0 0 2px #0e0e10, 0 0 0 4px ${c.hex}` : undefined, transform: color.id === c.id ? "scale(1.05)" : undefined }} />
                <span className={`text-[11px] ${color.id === c.id ? "text-label" : "text-label-3"}`}>{c.label}</span>
              </button>
            ))}
          </div>
        </Group>

        <Group title="Aksesuar">
          <button
            onClick={() => setPhones((v) => !v)}
            className={`flex w-full items-center justify-between rounded-[14px] border px-3.5 py-2.5 ${phones ? "border-white/20 bg-white/[0.09]" : "border-white/[0.05] bg-white/[0.02]"}`}
          >
            <span className="text-[13px] font-semibold">Kulaklık</span>
            <span className="text-[11.5px] text-label-3">{phones ? "Takılı" : "Çıkarılmış"}</span>
          </button>
        </Group>

        <Group title="Adada">
          <div className="flex items-center gap-3">
            <div className="flex h-[38px] w-[200px] items-center justify-end rounded-b-[18px] rounded-t-[6px] bg-black pr-3">
              <Character3D size={32} color={color.hex} phones={phones} mood={mood} res={3} still={still} />
            </div>
            <Character3D size={64} color={color.hex} phones={phones} mood={mood} res={2.5} still={still} />
          </div>
        </Group>
        <p className="text-[11px] leading-relaxed text-label-3">Lokum'a tıklayınca basılıp geri yaylanır. İmleci oynatınca gözleriyle izler.</p>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-label-3">{title}</p>
      {children}
    </div>
  );
}
