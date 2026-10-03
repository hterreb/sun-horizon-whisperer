
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
    // Local only (AUDIT S-19). For a phone on the same Wi-Fi: `npm run dev -- --host`.
    host: "localhost",
    port: 8080,
  },
  build: {
    sourcemap: uploadSourceMaps ? 'hidden' : false,
    // ponytail: one chunk of ~524 kB (171 kB gzip) is accepted (AUDIT P-7): React DOM and
    // Sentry are most of it. Load Sentry after first paint if the bundle grows past this.
    chunkSizeWarningLimit: 600,
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
        // Notification tap handler for the sunset reminder (ROADMAP item 69).
        importScripts: ['sw-notification-click.js'],
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
      includeAssets: ['favicon.ico', 'favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-144.png', 'icon-maskable-192.png', 'icon-maskable-512.png', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Sun Chaser',
        short_name: 'Sun Chaser',
        description: 'Track the sun and moon positions with real-time weather',
        theme_color: '#0F1016',
        background_color: '#0F1016',
        display: 'standalone',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'any',
        scope: '/',
        start_url: '/',
        // 'any' icons are the round mark (public/logo-mark.svg) on a transparent
        // square. The maskable icons are a separate full-bleed source
        // (public/logo-mark-maskable.svg) with the mark inside the 80% safe
        // zone, so OS adaptive-icon masks don't crop into the artwork.
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
            src: '/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon-maskable-512.png',
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
