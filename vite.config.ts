import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt"],
      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: [
          "**/*.{css,html,ico,png,svg,woff2}",
          "assets/index-*.js",
          "assets/react-dom-*.js",
          "assets/client-*.js",
          "assets/jsx-runtime-*.js",
        ],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.js$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "practicecraft-route-modules",
              expiration: { maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
            },
          },
        ],
      },
      manifest: {
        name: "PracticeCraft",
        short_name: "PracticeCraft",
        description: "UK Accountancy Practice Management — VAT, Payroll, Accounts, AML",
        theme_color: "#0F172A",
        background_color: "#0F172A",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        categories: ["business", "finance", "productivity"],
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}));
