// Custom service worker for background sync
// This extends the Workbox service worker with custom background sync functionality

// Import Workbox modules
importScripts('/workbox-3ad5617a.js');

// Workbox manifest injection placeholder
self.__WB_MANIFEST;

// Background sync event handler
self.addEventListener('sync', (event) => {
  console.log('Background sync event triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Handle background sync
async function handleBackgroundSync() {
  try {
    console.log('Starting background sync...');
    
    // Check if we have pending sync items
    const pendingItems = await getPendingSyncItems();
    
    if (pendingItems.length === 0) {
      console.log('No pending items to sync');
      return;
    }
    
    console.log(`Processing ${pendingItems.length} pending items...`);
    
    // Process items by priority
    const { high, medium, low } = await getItemsByPriority(pendingItems);
    const priorityOrder = [...high, ...medium, ...low];
    
    let successful = 0;
    let failed = 0;
    let conflicts = 0;
    
    for (const item of priorityOrder) {
      try {
        console.log(`Syncing ${item.operation} operation for ${item.table}...`);
        
        const result = await processSyncItem(item);
        
        if (result.success) {
          successful++;
          await markItemSynced(item.id);
        } else {
          failed++;
          if (result.conflict) {
            conflicts++;
            // Handle conflict resolution
            const resolution = await resolveConflict(result.conflict, item);
            if (resolution.strategy === 'local') {
              await markItemSynced(item.id);
              successful++;
              failed--;
            } else if (resolution.strategy === 'remote') {
              await updateLocalData(item.table, item.data, resolution.resolvedData);
              await markItemSynced(item.id);
              successful++;
              failed--;
            }
            // For 'manual' strategy, leave item in queue for user intervention
          } else {
            await markItemFailed(item.id, result.error);
          }
        }
      } catch (error) {
        failed++;
        console.error('Sync item failed:', error);
        await markItemFailed(item.id, error.message);
      }
      
      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Background sync completed: ${successful} successful, ${failed} failed, ${conflicts} conflicts`);
    
    // Show notification to user
    if (successful > 0 || failed > 0) {
      showSyncNotification(successful, failed, conflicts);
    }
    
  } catch (error) {
    console.error('Background sync failed:', error);
    showSyncErrorNotification(error.message);
  }
}

// Get pending sync items from IndexedDB
async function getPendingSyncItems() {
  try {
    // This would need to access the Dexie database
    // For now, we'll use a simplified approach
    const response = await fetch('/api/sync-queue/pending');
    if (response.ok) {
      return await response.json();
    }
    return [];
  } catch (error) {
    console.error('Failed to get pending items:', error);
    return [];
  }
}

// Get items by priority
async function getItemsByPriority(items) {
  const high = items.filter(item => item.priority === 'high');
  const medium = items.filter(item => item.priority === 'medium');
  const low = items.filter(item => item.priority === 'low');
  
  return { high, medium, low };
}

// Process a single sync item
async function processSyncItem(item) {
  const endpoint = getEndpointForTable(item.table);
  if (!endpoint) {
    throw new Error(`Unknown table: ${item.table}`);
  }
  
  try {
    let response;
    let remoteData;
    
    switch (item.operation) {
      case 'create':
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item.data)
        });
        break;
        
      case 'update':
        response = await fetch(`${endpoint}/${item.data.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item.data)
        });
        break;
        
      case 'delete':
        response = await fetch(`${endpoint}/${item.data.id}`, {
          method: 'DELETE'
        });
        break;
        
      default:
        throw new Error(`Unknown operation: ${item.operation}`);
    }
    
    if (!response.ok) {
      // Check for conflict (409 Conflict)
      if (response.status === 409) {
        remoteData = await response.json();
        const conflict = await detectConflict(item, remoteData);
        return {
          success: false,
          conflict
        };
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    remoteData = await response.json();
    
    return {
      success: true
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Get API endpoint for table
function getEndpointForTable(table) {
  const endpoints = {
    panels: '/api/panels',
    inspections: '/api/inspections',
    manufacturing_orders: '/api/manufacturing-orders',
    stations: '/api/stations'
  };
  
  return endpoints[table.toLowerCase()] || null;
}

// Detect conflicts between local and remote data
async function detectConflict(item, remoteData) {
  // Simplified conflict detection
  // In a real implementation, this would compare local and remote data
  
  let conflictType = 'modification';
  
  if (item.operation === 'delete') {
    conflictType = 'deletion';
  } else if (remoteData.version && item.data.version && remoteData.version !== item.data.version) {
    conflictType = 'version';
  }
  
  return {
    localData: item.data,
    remoteData,
    conflictType,
    resolution: 'manual'
  };
}

// Resolve conflicts using predefined strategies
async function resolveConflict(conflict, item) {
  switch (conflict.conflictType) {
    case 'deletion':
      return { strategy: 'remote' };
      
    case 'version':
      if (conflict.remoteData.version > conflict.localData.version) {
        return { strategy: 'remote', resolvedData: conflict.remoteData };
      } else {
        return { strategy: 'local' };
      }
      
    case 'modification':
      const localTimestamp = new Date(conflict.localData.updatedAt || conflict.localData.createdAt);
      const remoteTimestamp = new Date(conflict.remoteData.updatedAt || conflict.remoteData.createdAt);
      
      if (remoteTimestamp > localTimestamp) {
        return { strategy: 'remote', resolvedData: conflict.remoteData };
      } else {
        return { strategy: 'local' };
      }
      
    default:
      return { strategy: 'manual' };
  }
}

// Update local data with resolved remote data
async function updateLocalData(table, originalData, resolvedData) {
  try {
    // This would update the local IndexedDB
    // For now, we'll use a simplified approach
    const response = await fetch(`/api/local-data/${table}/${originalData.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resolvedData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update local data');
    }
  } catch (error) {
    console.error('Failed to update local data:', error);
    throw error;
  }
}

// Mark item as synced
async function markItemSynced(itemId) {
  try {
    const response = await fetch(`/api/sync-queue/${itemId}/mark-synced`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark item as synced');
    }
  } catch (error) {
    console.error('Failed to mark item as synced:', error);
  }
}

// Mark item as failed
async function markItemFailed(itemId, error) {
  try {
    const response = await fetch(`/api/sync-queue/${itemId}/mark-failed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error })
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark item as failed');
    }
  } catch (error) {
    console.error('Failed to mark item as failed:', error);
  }
}

// Show sync notification
function showSyncNotification(successful, failed, conflicts) {
  if ('Notification' in self && Notification.permission === 'granted') {
    let message = '';
    
    if (successful > 0 && failed === 0) {
      message = `Successfully synced ${successful} items`;
    } else if (successful > 0 && failed > 0) {
      message = `Synced ${successful} items, ${failed} failed`;
    } else if (failed > 0) {
      message = `Sync failed for ${failed} items`;
    }
    
    if (conflicts > 0) {
      message += ` (${conflicts} conflicts resolved)`;
    }
    
    new Notification('Background Sync Complete', {
      body: message,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png'
    });
  }
}

// Show sync error notification
function showSyncErrorNotification(error) {
  if ('Notification' in self && Notification.permission === 'granted') {
    new Notification('Background Sync Error', {
      body: `Sync failed: ${error}`,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png'
    });
  }
}

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  event.waitUntil(
    caches.open('solar-tracker-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/offline.html',
        '/pwa-192x192.png',
        '/pwa-512x512.png'
      ]);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== 'solar-tracker-v1') {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - handle offline scenarios
self.addEventListener('fetch', (event) => {
  // Handle API requests with network-first strategy
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open('api-cache').then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response if available
          return caches.match(event.request);
        })
    );
  }
  
  // Handle navigation requests with network-first strategy
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/offline.html');
        })
    );
  }
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New notification',
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      data: data.data || {}
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Solar Tracker', options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'sync') {
    // Trigger manual sync
    event.waitUntil(
      self.registration.sync.register('background-sync')
    );
  } else {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
