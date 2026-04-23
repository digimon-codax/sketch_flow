import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // REST API
      "/api": {
        target:      "http://localhost:3001",
        changeOrigin: true,
      },
      // WebSocket  (ws://localhost:5173/ws → ws://localhost:3001/ws)
      "/ws": {
        target:  "ws://localhost:3001",
        ws:      true,
        changeOrigin: true,
      },
      // Static uploads served by Express
      "/uploads": {
        target:      "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  // Excalidraw ships ESM — no special alias needed but optimizeDeps helps
  optimizeDeps: {
    include: ["@excalidraw/excalidraw"],
  },
});
