import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        sourcemap: true,
        maximumFileSizeToCacheInBytes: 3000000, // 3MB limit for large assets
        // Enhanced caching strategies for 2024-2025
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache-v2',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
                purgeOnQuotaError: true
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache-v2',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                purgeOnQuotaError: true
              }
            }
          }
        ],
        // Enhanced service worker features
        skipWaiting: true,
        clientsClaim: true,
        // Add custom service worker logic
        additionalManifestEntries: [
          { url: '/offline.html', revision: '1' }
        ]
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Crossroads Solar Panel Production Tracker',
        short_name: 'Production Tracker',
        description: 'Industrial solar panel production tracking system with offline capabilities',
        theme_color: '#10B981',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/?utm_source=pwa',
        // Enhanced 2024-2025 manifest features
        categories: ['productivity', 'business', 'utilities'],
        lang: 'en-US',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        edge_side_panel: {
          preferred_width: 400
        },
        shortcuts: [
          {
            name: "Scan Panel",
            short_name: "Scan",
            description: "Quick barcode scan entry",
            url: "/scan?utm_source=pwa_shortcut",
            icons: [
              {
                src: "/crossroads-solar-logo-192.png",
                sizes: "192x192"
              }
            ]
          },
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "View production dashboard",
            url: "/dashboard?utm_source=pwa_shortcut",
            icons: [
              {
                src: "/crossroads-solar-logo-192.png",
                sizes: "192x192"
              }
            ]
          }
        ],
        // Improved installation experience
        prefer_related_applications: false,
        // Better protocol handling for production environment
        protocol_handlers: [
          {
            protocol: "web+solar",
            url: "/scan?barcode=%s"
          }
        ],
        file_handlers: [
          {
            action: "/import",
            accept: {
              "text/csv": [".csv"]
            }
          }
        ],
        icons: [
          {
            src: '/crossroads-solar-logo.svg?v=3',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/crossroads-solar-logo-64.png?v=3',
            sizes: '64x64',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/crossroads-solar-logo-192.png?v=3',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/crossroads-solar-logo-512.png?v=3',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      // Enhanced development and deployment features
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html'
      }
    })
  ],
  server: {
    port: 3001,
    host: true
  }
})