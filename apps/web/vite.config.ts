import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// In development the API is proxied so auth cookies stay same-origin. Set
// VITE_API_URL only for a split deployment.
const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: false },
      "/socket.io": { target: apiTarget, ws: true, changeOrigin: false },
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    passWithNoTests: true,
  },
});
