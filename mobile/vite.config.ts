import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Telefonda geliştirirken Tauri bilgisayarın ağ adresini verir (TAURI_DEV_HOST)
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  resolve: {
    // Masaüstü Nook'un kaynağı (3B Nook figürü ve görünümler aynı kalsın diye doğrudan oradan)
    alias: [
      // Masaüstü Nook bileşeninin pencere köprüsü telefonda boş (src/lib/desktopBridge.ts)
      { find: /^\.\.\/\.\.\/lib\/bridge$/, replacement: fileURLToPath(new URL("./src/lib/desktopBridge.ts", import.meta.url)) },
      { find: "@nook", replacement: fileURLToPath(new URL("../src", import.meta.url)) },
    ],
    // ../src'deki dosyalar kendi node_modules'ünü değil bunları kullansın (iki React olmasın)
    dedupe: ["react", "react-dom", "motion", "zustand", "lucide-react", "@tauri-apps/api"],
  },
  server: {
    port: 1430,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1431 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
    fs: { allow: [".."] },
  },
  build: {
    target: "chrome110",
    sourcemap: false,
  },
});
