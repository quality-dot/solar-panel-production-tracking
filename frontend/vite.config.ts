import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      strategies: 'generateSW',
      manifest: {
        name: 'Solar Panel Production Tracking',
        short_name: 'SolarTracker',
        description: 'Solar Panel Production Tracking System for Manufacturing',
        theme_color: '#10B981',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['productivity', 'business', 'utilities'],
        lang: 'en',
        dir: 'ltr',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Dashboard View'
          }
        ],
        shortcuts: [
          {
            name: 'Scan Panel',
            short_name: 'Scan',
            description: 'Quickly scan a solar panel',
            url: '/scan',
            icons: [
              {
                src: 'pwa-64x64.png',
                sizes: '64x64'
              }
            ]
          },
          {
            name: 'View Inspections',
            short_name: 'Inspections',
            description: 'Check inspection history',
            url: '/inspections',
            icons: [
              {
                src: 'pwa-64x64.png',
                sizes: '64x64'
              }
            ]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // Remove conflicting offline.html entry to prevent cache conflicts
        runtimeCaching: [
          // API calls - NetworkFirst for real-time data
          {
            urlPattern: /^https:\/\/api\.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 10 // Fallback to cache after 10 seconds
            }
          },
          // Static assets - CacheFirst for performance
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          // Images - StaleWhileRevalidate for balance of performance and freshness
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          // Fonts - CacheFirst for performance
          {
            urlPattern: /\.(?:woff|woff2|eot|ttf|otf)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          // HTML pages - NetworkFirst for navigation
          {
            urlPattern: /\.html$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 5
            }
          },
          // Offline fallback for navigation
          {
            urlPattern: /^https?:\/\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'offline-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              networkTimeoutSeconds: 3
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 3001,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      },
      mangle: {
        safari10: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          
          // Routing
          'router': ['react-router-dom'],
          
          // UI Libraries
          'ui-components': ['@headlessui/react', '@heroicons/react'],
          
          // Database
          'database': ['dexie', 'dexie-react-hooks'],
          
          // Utilities
          'utils': ['class-variance-authority', 'clsx', 'tailwind-merge'],
          
          // PWA
          'pwa': ['workbox-window']
        },
        // Optimize chunk naming for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    // Performance optimizations
    target: 'es2015',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      '@headlessui/react',
      '@heroicons/react',
      'dexie',
      'dexie-react-hooks'
    ],
    exclude: ['workbox-window']
  },
  // Performance optimizations
  esbuild: {
    target: 'es2015',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true
  }
})
