import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  lastUpdated: Date;
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

// Extended Service Worker registration interface
interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  sync?: {
    register(tag: string): Promise<void>;
    getTags(): Promise<string[]>;
  };
}

export const useNetworkStatus = (options: NetworkStatusOptions = {}) => {
  // Create stable callback refs to prevent infinite loops
  const onOnlineRef = useRef(options.onOnline || DEFAULT_OPTIONS.onOnline);
  const onOfflineRef = useRef(options.onOffline || DEFAULT_OPTIONS.onOffline);
  const onConnectionChangeRef = useRef(options.onConnectionChange || DEFAULT_OPTIONS.onConnectionChange);
  
  // Update refs when options change
  useEffect(() => {
    onOnlineRef.current = options.onOnline || DEFAULT_OPTIONS.onOnline;
    onOfflineRef.current = options.onOffline || DEFAULT_OPTIONS.onOffline;
    onConnectionChangeRef.current = options.onConnectionChange || DEFAULT_OPTIONS.onConnectionChange;
  }, [options.onOnline, options.onOffline, options.onConnectionChange]);
  
  const opts = useMemo(() => ({
    checkInterval: options.checkInterval || DEFAULT_OPTIONS.checkInterval,
    enableDetailedInfo: options.enableDetailedInfo ?? DEFAULT_OPTIONS.enableDetailedInfo,
    onOnline: () => onOnlineRef.current(),
    onOffline: () => onOfflineRef.current(),
    onConnectionChange: (status: NetworkStatus) => onConnectionChangeRef.current(status)
  }), [options.checkInterval, options.enableDetailedInfo]);
  
  // State management
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    lastUpdated: new Date()
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncAttempt: null,
    lastSuccessfulSync: null,
    pendingItems: 0,
    failedItems: 0,
    syncError: null
  });

  // Refs for tracking
  const isMounted = useRef(true);
  const checkIntervalRef = useRef<NodeJS.Timeout>();
  const lastOnlineState = useRef(navigator.onLine);

  // Get detailed network information - memoized to prevent infinite loops
  const getDetailedNetworkInfo = useCallback((): Partial<NetworkStatus> => {
    if (!opts.enableDetailedInfo) return {};

    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection;

    if (!connection) return {};

    return {
      connectionType: connection.effectiveType || 'unknown',
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }, [opts.enableDetailedInfo]);

  // Update network status - memoized with stable dependencies
  const updateNetworkStatus = useCallback((isOnline: boolean) => {
    if (!isMounted.current) return;

    const now = new Date();
    const detailedInfo = getDetailedNetworkInfo();
    
    const newStatus: NetworkStatus = {
      isOnline,
      isOffline: !isOnline,
      lastUpdated: now,
      ...detailedInfo
    };

    setNetworkStatus(newStatus);

    // Call callbacks if state changed
    if (lastOnlineState.current !== isOnline) {
      if (isOnline) {
        onOnlineRef.current();
      } else {
        onOfflineRef.current();
      }
      onConnectionChangeRef.current(newStatus);
      lastOnlineState.current = isOnline;
    }
  }, [getDetailedNetworkInfo]);

  // Check sync status from service worker
  const checkSyncStatus = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      // Check if service worker is registered
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration) {
          // Get sync status from service worker
          const syncStatus = await getSyncStatusFromServiceWorker(registration as ExtendedServiceWorkerRegistration);
          if (isMounted.current) {
            setSyncStatus(prev => ({ ...prev, ...syncStatus }));
          }
        }
      }
    } catch (error) {
      if (isMounted.current) {
        console.warn('Failed to check sync status:', error);
      }
    }
  }, []);

  // Get sync status from service worker
  const getSyncStatusFromServiceWorker = async (registration: ExtendedServiceWorkerRegistration): Promise<Partial<SyncStatus>> => {
    try {
      // This would typically involve messaging the service worker
      // For now, we'll return a basic status
      return {
        isSyncing: false,
        pendingItems: 0,
        failedItems: 0,
        syncError: null
      };
    } catch (error) {
      return {
        isSyncing: false,
        syncError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: true,
        lastSyncAttempt: new Date(),
        syncError: null
      }));

      // Check if service worker is registered
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration) {
          const extendedRegistration = registration as ExtendedServiceWorkerRegistration;
          
          if (extendedRegistration.sync) {
            // Register a background sync
            await extendedRegistration.sync.register('background-sync');
            
            // Update sync status
            setSyncStatus(prev => ({
              ...prev,
              isSyncing: false,
              lastSuccessfulSync: new Date()
            }));
          } else {
            // Fallback: simulate sync completion
            setTimeout(() => {
              if (isMounted.current) {
                setSyncStatus(prev => ({
                  ...prev,
                  isSyncing: false,
                  lastSuccessfulSync: new Date()
                }));
              }
            }, 1000);
          }
        }
      }
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncError: error instanceof Error ? error.message : 'Sync failed'
      }));
    }
  }, []);

  // Check network status periodically
  const startPeriodicCheck = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    checkIntervalRef.current = setInterval(() => {
      if (isMounted.current) {
        updateNetworkStatus(navigator.onLine);
        checkSyncStatus();
      }
    }, opts.checkInterval);
  }, [opts.checkInterval, updateNetworkStatus, checkSyncStatus]);

  // Stop periodic checking
  const stopPeriodicCheck = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = undefined;
    }
  }, []);

  // Manual network status check
  const checkNetworkStatus = useCallback(() => {
    updateNetworkStatus(navigator.onLine);
    checkSyncStatus();
  }, [updateNetworkStatus, checkSyncStatus]);

  // Force offline mode (for testing)
  const forceOffline = useCallback(() => {
    updateNetworkStatus(false);
  }, [updateNetworkStatus]);

  // Force online mode (for testing)
  const forceOnline = useCallback(() => {
    updateNetworkStatus(true);
  }, [updateNetworkStatus]);

  // Initialize network monitoring
  useEffect(() => {
    isMounted.current = true;

    // Set initial status
    updateNetworkStatus(navigator.onLine);
    checkSyncStatus();

    // Add event listeners
    const handleOnline = () => updateNetworkStatus(true);
    const handleOffline = () => updateNetworkStatus(false);
    const handleConnectionChange = () => updateNetworkStatus(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Add connection change listener if available
    const nav = navigator as NavigatorWithConnection;
    if (nav.connection) {
      nav.connection.addEventListener('change', handleConnectionChange);
    }

    // Start periodic checking
    startPeriodicCheck();

    // Cleanup function
    return () => {
      isMounted.current = false;
      stopPeriodicCheck();
      
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (nav.connection) {
        nav.connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [updateNetworkStatus, checkSyncStatus, startPeriodicCheck, stopPeriodicCheck]);

  // Utility functions
  const isConnectionSlow = useCallback(() => {
    return networkStatus.effectiveType === 'slow-2g' || 
           networkStatus.effectiveType === '2g' ||
           (networkStatus.downlink && networkStatus.downlink < 1);
  }, [networkStatus]);

  const isConnectionFast = useCallback(() => {
    return networkStatus.effectiveType === '4g' ||
           (networkStatus.downlink && networkStatus.downlink > 10);
  }, [networkStatus]);

  const getConnectionQuality = useCallback(() => {
    if (networkStatus.isOffline) return 'offline';
    if (isConnectionSlow()) return 'slow';
    if (isConnectionFast()) return 'fast';
    return 'moderate';
  }, [networkStatus, isConnectionSlow, isConnectionFast]);

  return {
    // Network status
    networkStatus,
    isOnline: networkStatus.isOnline,
    isOffline: networkStatus.isOffline,
    
    // Sync status
    syncStatus,
    isSyncing: syncStatus.isSyncing,
    
    // Actions
    checkNetworkStatus,
    triggerSync,
    forceOffline,
    forceOnline,
    
    // Utilities
    isConnectionSlow,
    isConnectionFast,
    getConnectionQuality,
    
    // Control
    startPeriodicCheck,
    stopPeriodicCheck
  };
};

export default useNetworkStatus;
