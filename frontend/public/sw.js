// Enhanced Custom Service Worker for Solar Panel Production Tracker
// 2024-2025 Modern PWA Features
// Compatible with Vite PWA injectManifest strategy

// Workbox manifest injection (required for injectManifest strategy)
importScripts('/workbox-e20531c6.js');
self.__WB_MANIFEST;

const CACHE_VERSION = 'v3';
const CACHE_PREFIX = 'solar-tracker';
const OFFLINE_CACHE = `${CACHE_PREFIX}-offline-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;

// Enhanced background sync with retry strategies
const BACKGROUND_SYNC_TAG = 'solar-data-sync';
const PERIODIC_SYNC_TAG = 'solar-periodic-sync';

// Modern service worker features
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    (async () => {
      // Enhanced caching with modern strategies
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.addAll([
        '/',
        '/offline.html',
        '/manifest.webmanifest'
      ]);
      
      // Skip waiting for immediate activation
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith(CACHE_PREFIX) && !name.includes(CACHE_VERSION))
          .map(name => caches.delete(name))
      );
      
      // Take control of all pages
      await self.clients.claim();
    })()
  );
});

// Enhanced background sync with error handling and retry logic
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === BACKGROUND_SYNC_TAG) {
    event.waitUntil(syncPendingData());
  }
});

// Modern periodic background sync (requires registration)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);
  
  if (event.tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(performPeriodicSync());
  }
});

// Enhanced push notifications support
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'Production update available',
    icon: '/crossroads-solar-logo-192.png',
    badge: '/crossroads-solar-logo-64.png',
    vibrate: [200, 100, 200],
    data: {
      timestamp: Date.now(),
      url: '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View Update',
        icon: '/crossroads-solar-logo-64.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: true,
    tag: 'production-update'
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.message || options.body;
      options.data = { ...options.data, ...data };
    } catch (e) {
      console.warn('[SW] Push data parsing failed:', e);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('Solar Tracker', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});

// Enhanced fetch handler with modern caching strategies
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  event.respondWith(handleFetch(event.request));
});

// Modern fetch handling with improved error recovery
async function handleFetch(request) {
  try {
    // Network first for API calls with timeout
    if (request.url.includes('/api/')) {
      return await networkFirstStrategy(request);
    }
    
    // Cache first for static assets
    if (request.url.match(/\.(?:js|css|png|jpg|jpeg|svg|gif|webp|avif|woff2)$/)) {
      return await cacheFirstStrategy(request);
    }
    
    // Stale while revalidate for HTML pages
    return await staleWhileRevalidateStrategy(request);
    
  } catch (error) {
    console.error('[SW] Fetch error:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(OFFLINE_CACHE);
      return await cache.match('/offline.html');
    }
    
    throw error;
  }
}

// Network first with timeout and fallback
async function networkFirstStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    // Race network request with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Network timeout')), 10000)
    );
    
    const networkPromise = fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    });
    
    return await Promise.race([networkPromise, timeoutPromise]);
    
  } catch (error) {
    console.warn('[SW] Network failed, trying cache:', error);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Cache first with network fallback
async function cacheFirstStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    throw error;
  }
}

// Stale while revalidate with background updates
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Start network request in background
  const networkPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(error => {
    console.warn('[SW] Background update failed:', error);
  });
  
  // Return cache immediately if available, otherwise wait for network
  return cachedResponse || await networkPromise;
}

// Enhanced background sync with retry logic
async function syncPendingData() {
  try {
    console.log('[SW] Syncing pending data...');
    
    // Get IndexedDB data (would integrate with your Dexie.js setup)
    const pendingData = await getPendingData();
    
    if (pendingData.length === 0) {
      console.log('[SW] No pending data to sync');
      return;
    }
    
    // Sync each item with retry logic
    for (const item of pendingData) {
      await syncItem(item);
    }
    
    console.log('[SW] Background sync completed successfully');
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error; // Re-register for retry
  }
}

// Periodic sync for maintenance tasks
async function performPeriodicSync() {
  try {
    console.log('[SW] Performing periodic sync...');
    
    // Clean up old caches
    await cleanupCaches();
    
    // Prefetch critical resources
    await prefetchCriticalResources();
    
    console.log('[SW] Periodic sync completed');
    
  } catch (error) {
    console.error('[SW] Periodic sync failed:', error);
  }
}

// Utility functions
async function getPendingData() {
  // This would integrate with your Dexie.js implementation
  // For now, return empty array
  return [];
}

async function syncItem(item) {
  // Implement actual sync logic here
  console.log('[SW] Syncing item:', item);
}

async function cleanupCaches() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    name.startsWith(CACHE_PREFIX) && !name.includes(CACHE_VERSION)
  );
  
  await Promise.all(oldCaches.map(name => caches.delete(name)));
}

async function prefetchCriticalResources() {
  const cache = await caches.open(RUNTIME_CACHE);
  const criticalResources = [
    '/dashboard',
    '/scan'
  ];
  
  await Promise.all(
    criticalResources.map(url => 
      fetch(url).then(response => {
        if (response.ok) {
          return cache.put(url, response);
        }
      }).catch(() => {
        // Ignore prefetch failures
      })
    )
  );
}
