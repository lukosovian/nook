// İlk sırada kalmalı: Motion requestAnimationFrame'i içe aktarılırken yakalar
import "./lib/frameCap";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ArgusCard } from "./components/ArgusCard";
import { Shield } from "./components/Shield";
import { windowLabel } from "./lib/bridge";
import { installLogging } from "./lib/log";
import "./styles.css";

async function boot() {
  installLogging();
  // Yalnızca geliştirme: ?preview=… ile tasarım önizlemesi (üretim paketinden çıkarılır)
  if (import.meta.env.DEV) {
    const mode = new URLSearchParams(location.search).get("preview");
    if (mode) (await import("./dev/preview")).applyPreview(mode);
  }
  // Yalnızca geliştirme: ?preview=argcard ile yan kart
  const cardDemo =
    import.meta.env.DEV && new URLSearchParams(location.search).get("preview") === "argcard"
      ? { visible: true, title: "Tuzlu Kahve", episode: "S1B6 · 6. Bölüm", poster: null, meta: ["2025", "Dram, Romantik", "★ 7.8"], status: "İzleniyor", playedMs: 11 * 60_000, needMs: 15 * 60_000 }
      : null;
  // Yalnızca geliştirme: ?preview=shield ile gizlilik kalkanı
  const shieldDemo = import.meta.env.DEV && new URLSearchParams(location.search).get("preview") === "shield";
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      {cardDemo ? <ArgusCard initial={cardDemo} /> : windowLabel === "argus-card" ? <ArgusCard /> : windowLabel.startsWith("shield-") || shieldDemo ? <Shield /> : <App />}
    </StrictMode>,
  );
}

void boot();
