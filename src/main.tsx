// İlk sırada kalmalı: Motion requestAnimationFrame'i içe aktarılırken yakalar
import "./lib/frameCap";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { windowLabel } from "./lib/bridge";
import { isStudio } from "./lib/studio";
import { installLogging } from "./lib/log";
import "./styles.css";
import { useColorVision } from "./lib/palette";

async function boot() {
  installLogging();
  const preview = import.meta.env.DEV ? new URLSearchParams(location.search).get("preview") : null;
  // Yalnızca geliştirme: ?preview=… ile tasarım önizlemesi (üretim paketinden çıkarılır)
  if (import.meta.env.DEV && preview) {
    (await import("./dev/preview")).applyPreview(preview);
  }

  let view: ReactNode;
  if (isStudio) {
    const { Studio } = await import("./studio/Studio");
    view = <Studio />;
  } else if (preview === "argcard") {
    const { ArgusCard } = await import("./components/ArgusCard");
    view = (
      <ArgusCard
        initial={{
          visible: true,
          title: "Tuzlu Kahve",
          episode: "S1B6 · 6. Bölüm",
          poster: null,
          meta: ["2025", "Dram, Romantik", "★ 7.8"],
          status: "İzleniyor",
          playedMs: 11 * 60_000,
          needMs: 15 * 60_000,
        }}
      />
    );
  } else if (windowLabel === "argus-card") {
    const { ArgusCard } = await import("./components/ArgusCard");
    view = <ArgusCard />;
  } else if (preview === "soundcard") {
    const { SoundCard } = await import("./components/SoundCard");
    view = <SoundCard initial={{ visible: true, detached: false, right: new URLSearchParams(location.search).has("right") }} />;
  } else if (windowLabel === "sound-card") {
    const { SoundCard } = await import("./components/SoundCard");
    view = <SoundCard />;
  } else if (windowLabel.startsWith("shield-") || preview === "shield") {
    const { Shield } = await import("./components/Shield");
    view = <Shield />;
  } else if (windowLabel === "perch") {
    const { Perch } = await import("./components/outings/Perch");
    view = <Perch />;
  } else if (import.meta.env.DEV && preview === "perch") {
    const { PerchStage } = await import("./dev/PerchStage");
    view = <PerchStage />;
  } else if (import.meta.env.DEV && preview === "gallery") {
    const { Gallery } = await import("./dev/Gallery");
    view = <Gallery />;
  } else if (import.meta.env.DEV && preview === "poster") {
    const { Poster } = await import("./dev/Poster");
    view = <Poster />;
  } else if (import.meta.env.DEV && preview === "logo") {
    const { Logo } = await import("./dev/Logo");
    view = <Logo />;
  } else if (import.meta.env.DEV && preview === "wardrobe") {
    const { Wardrobe } = await import("./dev/Wardrobe");
    view = <Wardrobe />;
  } else if (import.meta.env.DEV && preview === "reel") {
    const { Reel } = await import("./dev/Reel");
    view = <Reel />;
  } else if (import.meta.env.DEV && preview === "reel03") {
    const { Reel03 } = await import("./dev/Reel03");
    view = <Reel03 />;
  } else if (import.meta.env.DEV && preview === "karakter") {
    const { CharacterLab } = await import("./dev/CharacterLab");
    view = <CharacterLab />;
  } else {
    const { default: App } = await import("./App");
    view = <App />;
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ColorVision />
      {view}
    </StrictMode>,
  );
}

void boot();

/** Renk körlüğü paletini her pencerede uygular */
function ColorVision() {
  useColorVision();
  return null;
}
