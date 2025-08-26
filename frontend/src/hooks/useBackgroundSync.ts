import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import BackgroundSyncService, { type SyncProgress, type SyncBatchResult } from '../services/BackgroundSyncService';
import { useToast } from '../components/ui/ToastProvider';

export interface BackgroundSyncState {
  isSyncing: boolean;
  progress: SyncProgress;
  lastSyncResult: SyncBatchResult | null;
  syncStats: {
    pending: number;
    failed: number;
    lastSync: Date | null;
    syncHealth: 'good' | 'warning' | 'critical';
  } | null;
  error: string | null;
}

export interface BackgroundSyncOptions {
  autoSyncOnOnline?: boolean;
  syncInterval?: number;
  enableNotifications?: boolean;
  onSyncStart?: () => void;
  onSyncComplete?: (result: SyncBatchResult) => void;
  onSyncError?: (error: string) => void;
}

export const useBackgroundSync = (options: BackgroundSyncOptions = {}) => {
  const {
    autoSyncOnOnline = true,
    syncInterval = 30000, // 30 seconds
    enableNotifications = true,
    onSyncStart,
    onSyncComplete,
    onSyncError
  } = options;

  // Toast notifications
  const toast = useToast();

  // Get network status
  const { isOnline, isOffline } = useNetworkStatus();

  // Background sync service instance
  const syncService = useRef(BackgroundSyncService.getInstance());

  // State management
  const [state, setState] = useState<BackgroundSyncState>({
    isSyncing: false,
    progress: {
      total: 0,
      processed: 0,
      current: null,
      status: 'idle'
    },
    lastSyncResult: null,
    syncStats: null,
    error: null
  });

  // Refs for tracking
  const isMounted = useRef(true);
  const syncIntervalRef = useRef<NodeJS.Timeout>();
  const lastOnlineState = useRef(isOnline);

  // Update state helper
  const updateState = useCallback((updates: Partial<BackgroundSyncState>) => {
    if (isMounted.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  // Handle sync progress updates
  const handleProgressUpdate = useCallback((progress: SyncProgress) => {
    updateState({ progress });
  }, [updateState]);

  // Handle sync status updates
  const handleStatusUpdate = useCallback((status: string) => {
    console.log('Background sync status:', status);
  }, []);

  // Manual sync trigger
  const triggerSync = useCallback(async (): Promise<SyncBatchResult> => {
    if (state.isSyncing) {
      throw new Error('Sync already in progress');
    }

    if (!isOnline) {
      throw new Error('Cannot sync while offline');
    }

    updateState({ isSyncing: true, error: null });
    onSyncStart?.();

    try {
      const result = await syncService.current.syncWhenOnline();
      
      updateState({
        isSyncing: false,
        lastSyncResult: result,
        error: null
      });

      onSyncComplete?.(result);

      // Update sync stats
      const stats = await syncService.current.getSyncStats();
      updateState({ syncStats: stats });

      // Show toast notifications
      if (enableNotifications) {
        if (result.successful > 0 && result.failed === 0) {
          toast.showSuccess(`Successfully synced ${result.successful} items`, 'Sync Complete');
        } else if (result.successful > 0 && result.failed > 0) {
          toast.showWarning(
            `Synced ${result.successful} items, ${result.failed} failed`, 
            'Sync Partial Success'
          );
        } else if (result.failed > 0) {
          toast.showError(
            `${result.failed} items failed to sync`, 
            'Sync Failed'
          );
        }
      }

      // Show browser notifications if enabled and permission granted
      if (enableNotifications && 'Notification' in window && Notification.permission === 'granted') {
        if (result.successful > 0 && result.failed === 0) {
          new Notification('Sync Complete', {
            body: `Successfully synced ${result.successful} items`,
            icon: '/pwa-192x192.png'
          });
        } else if (result.failed > 0) {
          new Notification('Sync Issues', {
            body: `${result.failed} items failed to sync`,
            icon: '/pwa-192x192.png'
          });
        }
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      
      updateState({
        isSyncing: false,
        error: errorMessage
      });

      onSyncError?.(errorMessage);

      // Show error toast notification
      if (enableNotifications) {
        toast.showError(errorMessage, 'Sync Error');
      }

      // Show browser error notification if enabled and permission granted
      if (enableNotifications && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Sync Error', {
          body: errorMessage,
          icon: '/pwa-192x192.png'
        });
      }

      throw error;
    }
  }, [state.isSyncing, isOnline, updateState, onSyncStart, onSyncComplete, onSyncError, enableNotifications]);

  // Retry failed items
  const retryFailedItems = useCallback(async (): Promise<SyncBatchResult> => {
    if (state.isSyncing) {
      throw new Error('Sync already in progress');
    }

    updateState({ isSyncing: true, error: null });
    onSyncStart?.();

    try {
      const result = await syncService.current.retryFailedItems();
      
      updateState({
        isSyncing: false,
        lastSyncResult: result,
        error: null
      });

      onSyncComplete?.(result);

      // Update sync stats
      const stats = await syncService.current.getSyncStats();
      updateState({ syncStats: stats });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Retry failed';
      
      updateState({
        isSyncing: false,
        error: errorMessage
      });

      onSyncError?.(errorMessage);
      throw error;
    }
  }, [state.isSyncing, updateState, onSyncStart, onSyncComplete, onSyncError]);

  // Get sync statistics
  const refreshSyncStats = useCallback(async () => {
    try {
      const stats = await syncService.current.getSyncStats();
      updateState({ syncStats: stats });
    } catch (error) {
      console.error('Failed to refresh sync stats:', error);
    }
  }, [updateState]);

  // Cleanup old sync items
  const cleanupOldItems = useCallback(async (daysOld: number = 7): Promise<number> => {
    try {
      const count = await syncService.current.cleanupOldItems(daysOld);
      await refreshSyncStats();
      return count;
    } catch (error) {
      console.error('Failed to cleanup old items:', error);
      throw error;
    }
  }, [refreshSyncStats]);

  // Auto-sync when network comes back online
  useEffect(() => {
    if (autoSyncOnOnline && isOnline && !lastOnlineState.current && !state.isSyncing) {
      // Network just came back online, trigger sync
      console.log('Network restored, triggering background sync...');
      triggerSync().catch(error => {
        console.error('Auto-sync failed:', error);
      });
    }
    
    lastOnlineState.current = isOnline;
  }, [isOnline, autoSyncOnOnline, state.isSyncing, triggerSync]);

  // Periodic sync when online
  useEffect(() => {
    if (isOnline && syncInterval > 0) {
      syncIntervalRef.current = setInterval(() => {
        if (!state.isSyncing) {
          // Check if there are pending items before syncing
          refreshSyncStats().then(() => {
            if (state.syncStats && state.syncStats.pending > 0) {
              triggerSync().catch(error => {
                console.error('Periodic sync failed:', error);
              });
            }
          });
        }
      }, syncInterval);
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = undefined;
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, syncInterval, state.isSyncing, state.syncStats, triggerSync, refreshSyncStats]);

  // Subscribe to sync service updates
  useEffect(() => {
    const unsubscribeProgress = syncService.current.onProgress(handleProgressUpdate);
    const unsubscribeStatus = syncService.current.onStatus(handleStatusUpdate);

    // Initial sync stats
    refreshSyncStats();

    return () => {
      unsubscribeProgress();
      unsubscribeStatus();
    };
  }, [handleProgressUpdate, handleStatusUpdate, refreshSyncStats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  return {
    // State
    isSyncing: state.isSyncing,
    progress: state.progress,
    lastSyncResult: state.lastSyncResult,
    syncStats: state.syncStats,
    error: state.error,

    // Actions
    triggerSync,
    retryFailedItems,
    refreshSyncStats,
    cleanupOldItems,

    // Utilities
    hasPendingItems: state.syncStats ? state.syncStats.pending > 0 : false,
    hasFailedItems: state.syncStats ? state.syncStats.failed > 0 : false,
    syncHealth: state.syncStats?.syncHealth || 'good'
  };
};

export default useBackgroundSync;
