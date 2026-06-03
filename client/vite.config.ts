import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// During development the SPA runs on :5173 and proxies API/stream/image calls
// to the Express backend on :8080. In production the backend serves the build.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
