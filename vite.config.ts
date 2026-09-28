
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// Source maps go to Sentry only in CI builds that have SENTRY_AUTH_TOKEN (ROADMAP
// item 21). The maps are deleted after upload, so they are never served. The token
// comes from the CI env or .env.local (see scripts/setup-keys.sh).
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN || loadEnv(mode, process.cwd(), '').SENTRY_AUTH_TOKEN;
  const uploadSourceMaps = !!sentryAuthToken;
  return {
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    sourcemap: uploadSourceMaps ? 'hidden' : false,
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
    }),
    uploadSourceMaps && sentryVitePlugin({
      org: 'ainabler',
      project: 'sun-chaser',
      authToken: sentryAuthToken,
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  };
});
