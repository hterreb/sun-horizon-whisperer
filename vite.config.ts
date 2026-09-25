
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// Injects the Lovable editor script (cdn.gpteng.co/gptengineer.js) for the dev server only — never in production builds.
const lovableEditorScript = () => ({
  name: "inject-lovable-editor-script",
  apply: "serve" as const,
  transformIndexHtml: () => [
    {
      tag: "script",
      attrs: { type: "module", src: "https://cdn.gpteng.co/gptengineer.js" },
      injectTo: "body-prepend" as const,
    },
  ],
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    mode === 'development' && lovableEditorScript(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 30, // 30 minutes
              },
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png', 'icon-144.png'],
      manifest: {
        id: '/',
        name: 'Sun Chaser',
        short_name: 'Sun Chaser',
        description: 'Track the sun and moon positions with real-time weather',
        theme_color: '#33C3F0',
        background_color: '#0F0E11',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        // ponytail: these icons are 'any' only because the source PNGs are not maskable-safe
        // (no safe-zone padding) - they would get cropped. Add real maskable icons later.
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ],
        categories: ['weather', 'utilities', 'lifestyle'],
        lang: 'en'
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
