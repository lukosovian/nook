/**
 * Yalnızca geliştirme (?preview=karakter): karakter denemeleri. Büyük canlı hâli, ruh hâlleri,
 * renk seçenekleri, kendi aksesuarı ve adadaki küçük boyu bir arada. Seçicideki küçükler tek kare
 * (resim gibi) çizilir; yalnızca büyük olan canlıdır.
 * Ekran görüntüsü için: &char=pamuk&mood=happy&color=1&acc=0&still=2.4&aim=0.8,0.3
 * Hepsi yan yana: &grid (&still=…&mood=…&color=…)
 */
import { useState } from "react";
import { CHARACTERS, Character3D, type CharId, type Mood } from "../lib/character3d";

const MOODS: { id: Mood; label: string; hint: string }[] = [
  { id: "idle", label: "Boşta", hint: "Kendi hâlinde takılır, imleci izler" },
  { id: "happy", label: "Mutlu", hint: "Hoplayıp sallanır" },
  { id: "music", label: "Müzik", hint: "Ritme göre sallanır" },
  { id: "sleepy", label: "Uykulu", hint: "Gözleri kapanır, başı düşer" },
  { id: "surprised", label: "Şaşkın", hint: "Sıçrar, gözleri açılır" },
];

export function CharacterLab() {
  const q = new URLSearchParams(location.search);
  const still = q.has("still") && q.get("still") !== "" ? Number(q.get("still")) : undefined;
  const [charId, setCharId] = useState<CharId>((q.get("char") as CharId) ?? "nook");
  const [mood, setMood] = useState<Mood>((q.get("mood") as Mood) ?? "idle");
  const [colorIx, setColorIx] = useState(Number(q.get("color") ?? 0));
  const [acc, setAcc] = useState(q.get("acc") !== "0");
  const aim = q.get("aim")?.split(",").map(Number) as [number, number] | undefined;
  const ch = CHARACTERS.find((c) => c.id === charId) ?? CHARACTERS[0];
  const color = ch.colors[colorIx] ?? ch.colors[0];

  if (q.has("grid"))
    return (
      <div className="grid h-full w-full grid-cols-4 place-items-center gap-4 bg-[#0e0e10] p-6 text-label">
        {CHARACTERS.filter((c) => !q.get("only") || q.get("only")!.split(",").includes(c.id)).map((c) => (
          <div key={c.id} className="flex flex-col items-center rounded-[28px] border border-white/[0.06] px-4 pb-4" style={{ background: `radial-gradient(circle at 50% 38%, color-mix(in srgb, ${c.colors[colorIx]?.hex ?? c.colors[0].hex} 24%, #1a1a1f), #111114 72%)` }}>
            <Character3D char={c.id} size={Number(q.get("size") ?? 300)} color={c.colors[colorIx]?.hex ?? c.colors[0].hex} acc={acc} mood={mood} res={Number(q.get("res") ?? 1.5)} still={still ?? 0.5} aim={aim} />
            <p className="text-[18px] font-extrabold">{c.name}</p>
          </div>
        ))}
      </div>
    );

  return (
    <div className="flex h-full w-full items-center justify-center gap-10 bg-[#0e0e10] p-10 text-label">
      <div className="flex flex-col gap-4">
        {/* Sahne */}
        <div
          className="relative flex h-[560px] w-[560px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-[36px] border border-white/[0.06]"
          style={{ background: `radial-gradient(circle at 50% 38%, color-mix(in srgb, ${color.hex} 26%, #1a1a1f), #111114 72%)` }}
        >
          <Character3D char={ch.id} size={430} color={color.hex} acc={acc} mood={mood} res={2} still={still} aim={aim} />
          <div className="absolute bottom-6 text-center">
            <p className="text-[26px] font-extrabold tracking-[-0.02em]">{ch.name}</p>
            <p className="text-[12.5px] text-label-3">{ch.tagline}</p>
          </div>
        </div>
        {/* Karakter seçici: tek karelik küçükler */}
        <div className="flex justify-between">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCharId(c.id);
                setColorIx(0);
              }}
              className={`flex flex-col items-center rounded-[18px] border pb-1.5 transition-colors ${c.id === ch.id ? "border-white/20 bg-white/[0.09]" : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]"}`}
            >
              <Character3D char={c.id} size={80} color={c.colors[0].hex} acc mood="idle" res={2} still={0.5} />
              <span className={`text-[11.5px] font-semibold ${c.id === ch.id ? "text-label" : "text-label-3"}`}>{c.name}</span>
            </button>
          ))}
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
            {ch.colors.map((c, i) => (
              <button key={c.label} onClick={() => setColorIx(i)} className="flex flex-col items-center gap-1.5">
                <span className="h-10 w-10 rounded-full transition-transform" style={{ background: c.hex, boxShadow: colorIx === i ? `0 0 0 2px #0e0e10, 0 0 0 4px ${c.hex}` : undefined, transform: colorIx === i ? "scale(1.05)" : undefined }} />
                <span className={`text-[11px] ${colorIx === i ? "text-label" : "text-label-3"}`}>{c.label}</span>
              </button>
            ))}
          </div>
        </Group>

        {ch.accessory && <Group title="Aksesuar">
          <button
            onClick={() => setAcc((v) => !v)}
            className={`flex w-full items-center justify-between rounded-[14px] border px-3.5 py-2.5 ${acc ? "border-white/20 bg-white/[0.09]" : "border-white/[0.05] bg-white/[0.02]"}`}
          >
            <span className="text-[13px] font-semibold">{ch.accessory}</span>
            <span className="text-[11.5px] text-label-3">{acc ? "Takılı" : "Çıkarılmış"}</span>
          </button>
        </Group>}

        <Group title="Adada">
          <div className="flex items-center gap-3">
            <div className="flex h-[38px] w-[200px] items-center justify-end rounded-b-[18px] rounded-t-[6px] bg-black pr-3">
              <Character3D char={ch.id} size={32} color={color.hex} acc={acc} mood={mood} res={3} still={still} />
            </div>
            <Character3D char={ch.id} size={64} color={color.hex} acc={acc} mood={mood} res={2.5} still={still} />
          </div>
        </Group>
        <p className="text-[11px] leading-relaxed text-label-3">Karaktere tıklayınca tepki verir. İmleci oynatınca gözleriyle izler. Boştayken her biri kendine özgü şeyler yapar.</p>
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
