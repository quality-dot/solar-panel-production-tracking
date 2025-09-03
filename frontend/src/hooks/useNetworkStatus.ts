import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Enhanced Service Worker registration interface
interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  // Modern PWA features
  sync?: {
    register(tag: string): Promise<void>;
  };
  periodicSync?: {
    register(tag: string, options?: {
      minInterval?: number;
    }): Promise<void>;
    unregister(tag: string): Promise<void>;
    getTags(): Promise<string[]>;
  };
  backgroundFetch?: {
    fetch(id: string, requests: RequestInfo[], options?: any): Promise<any>;
  };
  pushManager?: PushManager & {
    getSubscription(): Promise<PushSubscription | null>;
    subscribe(options?: PushSubscriptionOptions): Promise<PushSubscription>;
  };
}

// Enhanced network status interface with modern metrics
export interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean;
  connectionSpeed: ConnectionSpeed;
  lastSync: Date | null;
  syncStatus: SyncStatus;
  // Enhanced 2024-2025 features
  webVitals: WebVitals;
  pwaStatus: PWAStatus;
  updateAvailable: boolean;
  installPromptEvent: BeforeInstallPromptEvent | null;
}

interface WebVitals {
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
}

interface PWAStatus {
  isInstalled: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  updateReady: boolean;
  isOfflineReady: boolean;
  hasUpdate: boolean;
}

export interface NetworkStatusOptions {
  checkInterval?: number;
  onOnline?: () => void;
  onOffline?: () => void;
  onConnectionChange?: (status: NetworkStatus) => void;
  enableDetailedInfo?: boolean;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncAttempt: Date | null;
  lastSuccessfulSync: Date | null;
  pendingItems: number;
  failedItems: number;
  syncError: string | null;
}

// Default options
const DEFAULT_OPTIONS: Required<NetworkStatusOptions> = {
  checkInterval: 5000, // 5 seconds
  onOnline: () => {},
  onOffline: () => {},
  onConnectionChange: () => {},
  enableDetailedInfo: true
};

// Network Information API types
interface NetworkInformation extends EventTarget {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
}

// Enhanced connection speed enum
type ConnectionSpeed = 'fast' | 'moderate' | 'slow' | 'offline' | 'unknown';

// Enhanced sync status interface
interface SyncStatus {
  isSyncing: boolean;
  lastSyncAttempt: Date | null;
  lastSuccessfulSync: Date | null;
  pendingItems: number;
  failedItems: number;
  syncError: string | null;
}

// Enhanced network status hook with modern PWA features
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnected, setIsConnected] = useState(true);
  const [connectionSpeed, setConnectionSpeed] = useState<ConnectionSpeed>('unknown');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncAttempt: null,
    lastSuccessfulSync: null,
    pendingItems: 0,
    failedItems: 0,
    syncError: null
  });
  
  // Enhanced 2024-2025 state
  const [webVitals, setWebVitals] = useState<WebVitals>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null
  });
  
  const [pwaStatus, setPwaStatus] = useState<PWAStatus>({
    isInstalled: false,
    isStandalone: false,
    canInstall: false,
    updateReady: false,
    isOfflineReady: false,
    hasUpdate: false
  });
  
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  // Enhanced connection monitoring with modern APIs
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    
    // Modern connection quality monitoring
    const checkConnectionQuality = async () => {
      try {
        // Use modern Connection API if available
        if ('connection' in navigator) {
          const connection = (navigator as any).connection;
          if (connection) {
            const effectiveType = connection.effectiveType;
            setConnectionSpeed(mapEffectiveTypeToSpeed(effectiveType));
          }
        }
        
        // Fallback: Performance-based connection testing
        const startTime = performance.now();
        await fetch('/ping?t=' + Date.now(), { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        const endTime = performance.now();
        const roundTripTime = endTime - startTime;
        
        if (roundTripTime < 100) {
          setConnectionSpeed('fast');
        } else if (roundTripTime < 500) {
          setConnectionSpeed('moderate');
        } else {
          setConnectionSpeed('slow');
        }
        
        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
        setConnectionSpeed('offline');
      }
    };

    // Enhanced Web Vitals monitoring
    const measureWebVitals = () => {
      // Modern Web Vitals measurement
      if ('PerformanceObserver' in window) {
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          setWebVitals(prev => ({ ...prev, lcp: lastEntry.startTime }));
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            setWebVitals(prev => ({ ...prev, fid: entry.processingStart - entry.startTime }));
          });
        }).observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        new PerformanceObserver((list) => {
          let clsValue = 0;
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          setWebVitals(prev => ({ ...prev, cls: clsValue }));
        }).observe({ entryTypes: ['layout-shift'] });

        // First Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              setWebVitals(prev => ({ ...prev, fcp: entry.startTime }));
            }
          });
        }).observe({ entryTypes: ['paint'] });

        // Time to First Byte
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          setWebVitals(prev => ({ ...prev, ttfb: navigation.responseStart - navigation.requestStart }));
        }
      }
    };

    // Enhanced PWA status monitoring
    const updatePWAStatus = () => {
      setPwaStatus(prev => ({
        ...prev,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        isInstalled: window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true
      }));
    };

    // Enhanced service worker update detection
    const checkForUpdates = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            // Listen for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    setUpdateAvailable(true);
                    setPwaStatus(prev => ({ ...prev, hasUpdate: true, updateReady: true }));
                  }
                });
              }
            });

            // Check for waiting service worker
            if (registration.waiting) {
              setUpdateAvailable(true);
              setPwaStatus(prev => ({ ...prev, hasUpdate: true, updateReady: true }));
            }

            // Register for periodic sync if supported
            const extendedRegistration = registration as ExtendedServiceWorkerRegistration;
            if (extendedRegistration.periodicSync) {
              try {
                await extendedRegistration.periodicSync.register('solar-periodic-sync', {
                  minInterval: 24 * 60 * 60 * 1000 // 24 hours
                });
              } catch (error) {
                console.log('Periodic sync registration failed:', error);
              }
            }
          }
        } catch (error) {
          console.error('Service worker check failed:', error);
        }
      }
    };

    // Enhanced install prompt handling
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPromptEvent(e);
      setPwaStatus(prev => ({ ...prev, canInstall: true }));
    };

    // Event listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Modern connection change listener
    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', checkConnectionQuality);
    }

    // Initial checks
    updateOnlineStatus();
    checkConnectionQuality();
    measureWebVitals();
    updatePWAStatus();
    checkForUpdates();

    // Enhanced periodic sync registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(async (registration) => {
        const extendedRegistration = registration as ExtendedServiceWorkerRegistration;
        
        // Register background sync
        if (extendedRegistration.sync) {
          try {
            await extendedRegistration.sync.register('solar-data-sync');
          } catch (error) {
            console.log('Background sync registration failed:', error);
          }
        }

        // Check offline readiness
        const cacheNames = await caches.keys();
        const hasOfflineCache = cacheNames.some(name => name.includes('offline'));
        setPwaStatus(prev => ({ ...prev, isOfflineReady: hasOfflineCache }));
      });
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      
      if ('connection' in navigator) {
        (navigator as any).connection?.removeEventListener('change', checkConnectionQuality);
      }
    };
  }, []);

  // Enhanced sync status checking with modern APIs
  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        // Check if service worker is registered
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            // Get sync status from service worker
            const syncStatus = await getSyncStatusFromServiceWorker(registration as ExtendedServiceWorkerRegistration);
            setSyncStatus(prev => ({ ...prev, ...syncStatus }));
          }
        }
      } catch (error) {
        console.error('Failed to check sync status:', error);
      }
    };

    const syncInterval = setInterval(checkSyncStatus, 30000); // Check every 30 seconds
    checkSyncStatus(); // Initial check

    return () => clearInterval(syncInterval);
  }, []);

  return {
    isOnline,
    isConnected,
    connectionSpeed,
    lastSync,
    syncStatus,
    webVitals,
    pwaStatus,
    updateAvailable,
    installPromptEvent
  };
}

// Enhanced utility functions
function mapEffectiveTypeToSpeed(effectiveType: string): ConnectionSpeed {
  switch (effectiveType) {
    case '4g':
      return 'fast';
    case '3g':
      return 'moderate';
    case '2g':
    case 'slow-2g':
      return 'slow';
    default:
      return 'unknown';
  }
}

// Get sync status from service worker with modern messaging
const getSyncStatusFromServiceWorker = async (registration: ExtendedServiceWorkerRegistration): Promise<Partial<SyncStatus>> => {
  try {
    // Modern service worker messaging
    if (registration.active) {
      const channel = new MessageChannel();
      
      return new Promise((resolve) => {
        channel.port1.onmessage = (event) => {
          resolve(event.data.syncStatus || {});
        };
        
        registration.active?.postMessage({
          type: 'GET_SYNC_STATUS'
        }, [channel.port2]);
        
        // Timeout after 5 seconds
        setTimeout(() => resolve({}), 5000);
      });
    }
    
    return {};
  } catch (error) {
    console.error('Failed to get sync status from service worker:', error);
    return {};
  }
};

// Enhanced PWA installation helper
export function usePWAInstaller() {
  const { installPromptEvent, pwaStatus } = useNetworkStatus();
  
  const installPWA = async (): Promise<boolean> => {
    if (!installPromptEvent) return false;
    
    try {
      const result = await installPromptEvent.prompt();
      const outcome = await result.userChoice;
      
      if (outcome === 'accepted') {
        setInstallPromptEvent(null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('PWA installation failed:', error);
      return false;
    }
  };
  
  return {
    canInstall: pwaStatus.canInstall,
    isInstalled: pwaStatus.isInstalled,
    installPWA
  };
}

// Enhanced update manager
export function usePWAUpdater() {
  const { updateAvailable, pwaStatus } = useNetworkStatus();
  
  const applyUpdate = async (): Promise<boolean> => {
    if (!updateAvailable) return false;
    
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Listen for controlling change
        const controllerChanged = new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            resolve();
          }, { once: true });
        });
        
        await controllerChanged;
        window.location.reload();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Update application failed:', error);
      return false;
    }
  };
  
  return {
    updateAvailable,
    updateReady: pwaStatus.updateReady,
    applyUpdate
  };
}
