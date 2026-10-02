import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { installLogging } from "./lib/log";
import "./styles.css";

async function boot() {
  installLogging();
  // Yalnızca geliştirme: ?preview=… ile tasarım önizlemesi (üretim paketinden çıkarılır)
  if (import.meta.env.DEV) {
    const mode = new URLSearchParams(location.search).get("preview");
    if (mode) (await import("./dev/preview")).applyPreview(mode);
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
