import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run build:demo` inlines everything into one HTML file with mock data,
// for a static preview that needs no backend.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "demo" ? [viteSingleFile()] : [])],
  server: {
    proxy: { "/api": "http://localhost:8000" },
  },
  build: { outDir: mode === "demo" ? "dist-demo" : "dist" },
}));
