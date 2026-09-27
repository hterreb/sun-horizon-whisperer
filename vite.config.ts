
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
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
        display_override: ['fullscreen', 'standalone'],
        orientation: 'any',
        scope: '/',
        start_url: '/',
        // The source PNGs have no safe-zone padding, so the maskable entries reuse the
        // same files as the 'any' ones; some OS masks may crop into the icon artwork.
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
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['weather', 'utilities', 'lifestyle'],
        lang: 'en'
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}));
