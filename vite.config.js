import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    https: false,  // HTTPS is handled by nginx, not Vite
    allowedHosts: ["restoration-local.sogni.ai", "localhost"],
    cors: {
      origin: ["https://restoration-local.sogni.ai"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

