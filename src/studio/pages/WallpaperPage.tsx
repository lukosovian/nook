/**
 * Studio › Duvar kağıtları: Nook'lu masaüstü arka planları, gruplar hâlinde. Önizlemeler uygulamanın içinde
 * (public/wallpapers); tam boy resim "Masaüstüne uygula"da GitHub'dan bir kez indirilir, Resimler › Nook'a
 * kaydedilip Windows'un arka planı yapılır (commands.rs set_wallpaper).
 */
import { useState } from "react";
import { motion } from "motion/react";
import { Check, Wallpaper } from "lucide-react";
import { setWallpaper } from "../../lib/bridge";
import { ACCENT, tintText } from "../../components/ui/primitives";
import { tt } from "../../lib/i18n";
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

const labelOf = (id: string) => GROUPS.flatMap((g) => g.items).find((i) => i.id === id)?.label ?? id;

function Card({ id, label, on, applied, onPick }: { id: string; label: string; on: boolean; applied: boolean; onPick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onPick}
      className="relative overflow-hidden rounded-[16px] border-2 text-left transition-colors"
      style={{ borderColor: on ? ACCENT.blue : "rgb(255 255 255 / 0.06)" }}
    >
      <img src={`/wallpapers/${id}.webp`} alt="" draggable={false} loading="lazy" className="block aspect-video w-full object-cover" />
      <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] font-semibold text-label backdrop-blur">
        {applied && <Check size={12} strokeWidth={3} />}
        {label}
      </span>
    </motion.button>
  );
}

export function WallpaperPage() {
  const [pick, setPick] = useState(GROUPS[0].items[0].id);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    setBusy(true);
    setDone(null);
    setError(null);
    try {
      await setWallpaper(pick);
      setDone(pick);
    } catch (e) {
      setError(String(e));
    }
    setBusy(false);
  };

  return (
    <Page>
      <PageHeader
        icon={Wallpaper}
        color={ACCENT.teal}
        title={tt("Duvar kağıtları")}
        subtitle={tt("Nook'lu masaüstü arka planları")}
        actions={
          <Btn onClick={() => void apply()} color={ACCENT.teal} disabled={busy}>
            <Wallpaper size={14} />
            {busy ? tt("İndiriliyor…") : tt("Masaüstüne uygula")}
          </Btn>
        }
      />
      {(done || error) && (
        <p className="-mt-3 mb-4 text-[12.5px] font-semibold" style={{ color: error ? tintText(ACCENT.red) : tintText(ACCENT.green) }}>
          {error ?? tt("{0} masaüstüne uygulandı", labelOf(done!))}
        </p>
      )}
      <div className="flex flex-col gap-4">
        {GROUPS.map((g, gi) => (
          <Panel
            key={g.title}
            title={g.title}
            delay={gi * 0.04}
            hint={gi === GROUPS.length - 1 ? tt("Seçtiğin resim ilk uygulamada indirilir ve Resimler › Nook klasörüne kaydedilir.") : undefined}
          >
            <div className="grid grid-cols-3 gap-3">
              {g.items.map((it) => (
                <Card key={it.id} id={it.id} label={it.label} on={pick === it.id} applied={done === it.id} onPick={() => setPick(it.id)} />
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </Page>
  );
}
