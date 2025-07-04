
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
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
          // Force icon cache invalidation
          {
            urlPattern: /\.(ico|png|svg)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'icons-cache-v2',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
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
        start_url: '/?v=2.0',
        icons: [
          {
            src: '/icon-192.png?v=2.0',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192.png?v=2.0',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon-512.png?v=2.0',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png?v=2.0',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
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
