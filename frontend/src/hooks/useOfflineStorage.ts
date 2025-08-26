import { useState, useEffect, useCallback, useRef } from 'react';
import { Panel, Inspection, SyncQueue, db } from '../database/config';
import PanelStore from '../database/stores/panelStore';
import InspectionStore from '../database/stores/inspectionStore';
import SyncQueueStore from '../database/stores/syncQueueStore';

// Types for the hook
export interface UseOfflineStorageOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
}

export interface LoadingState {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export interface PanelFilters {
  status?: Panel['status'];
  type?: string;
  barcode?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface InspectionFilters {
  panelId?: number;
  station?: string;
  status?: Inspection['status'];
  operator?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SyncQueueFilters {
  operation?: SyncQueue['operation'];
  table?: string;
  priority?: SyncQueue['priority'];
  dateFrom?: Date;
  dateTo?: Date;
}

// Main hook for offline storage operations
export const useOfflineStorage = (options: UseOfflineStorageOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    onError
  } = options;

  // State management
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    isError: false,
    error: null
  });

  const [panels, setPanels] = useState<Panel[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncQueue[]>([]);

  // Ref for tracking mounted state
  const isMounted = useRef(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  // Error handler
  const handleError = useCallback((error: Error) => {
    console.error('useOfflineStorage error:', error);
    setLoadingState(prev => ({
      ...prev,
      isError: true,
      error
    }));
    onError?.(error);
  }, [onError]);

  // Loading state handler
  const setLoading = useCallback((isLoading: boolean) => {
    setLoadingState(prev => ({
      ...prev,
      isLoading,
      isError: false,
      error: null
    }));
  }, []);

  // Auto-refresh functionality
  const setupAutoRefresh = useCallback(() => {
    if (!autoRefresh || !isMounted.current) return;

    refreshTimeoutRef.current = setTimeout(async () => {
      if (isMounted.current) {
        await refreshAllData();
        setupAutoRefresh();
      }
    }, refreshInterval);
  }, [autoRefresh, refreshInterval]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
  }, []);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      setLoading(true);
      
      const [panelsData, inspectionsData, syncQueueData] = await Promise.all([
        PanelStore.getAll(),
        InspectionStore.getAll(),
        SyncQueueStore.getAll()
      ]);

      if (isMounted.current) {
        setPanels(panelsData);
        setInspections(inspectionsData);
        setSyncQueue(syncQueueData);
        setLoadingState(prev => ({
          ...prev,
          isLoading: false,
          isError: false,
          error: null
        }));
      }
    } catch (error) {
      if (isMounted.current) {
        handleError(error instanceof Error ? error : new Error('Unknown error'));
      }
    }
  }, [handleError]);

  // Panel operations
  const panelOperations = {
    // Get all panels
    getAll: useCallback(async (filters?: PanelFilters) => {
      try {
        setLoading(true);
        const data = await PanelStore.getAll(filters);
        if (isMounted.current) {
          setPanels(data);
          setLoadingState(prev => ({ ...prev, isLoading: false }));
        }
        return data;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to get panels'));
        return [];
      }
    }, [handleError]),

    // Get panel by ID
    getById: useCallback(async (id: number) => {
      try {
        setLoading(true);
        const panel = await PanelStore.getById(id);
        setLoadingState(prev => ({ ...prev, isLoading: false }));
        return panel;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to get panel'));
        return undefined;
      }
    }, [handleError]),

    // Get panel by barcode
    getByBarcode: useCallback(async (barcode: string) => {
      try {
        setLoading(true);
        const panel = await PanelStore.getByBarcode(barcode);
        setLoadingState(prev => ({ ...prev, isLoading: false }));
        return panel;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to get panel by barcode'));
        return undefined;
      }
    }, [handleError]),

    // Create panel
    create: useCallback(async (panelData: Omit<Panel, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        setLoading(true);
        const id = await PanelStore.create(panelData);
        await refreshAllData();
        return id;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to create panel'));
        throw error;
      }
    }, [refreshAllData, handleError]),

    // Update panel
    update: useCallback(async (id: number, updates: Partial<Omit<Panel, 'id' | 'createdAt'>>) => {
      try {
        setLoading(true);
        await PanelStore.update(id, updates);
        await refreshAllData();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to update panel'));
        throw error;
      }
    }, [refreshAllData, handleError]),

    // Update panel status
    updateStatus: useCallback(async (id: number, status: Panel['status']) => {
      try {
        setLoading(true);
        await PanelStore.updateStatus(id, status);
        await refreshAllData();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to update panel status'));
        throw error;
      }
    }, [refreshAllData, handleError]),

    // Delete panel
    delete: useCallback(async (id: number) => {
      try {
        setLoading(true);
        await PanelStore.delete(id);
        await refreshAllData();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to delete panel'));
        throw error;
      }
    }, [refreshAllData, handleError]),

    // Search panels
    search: useCallback(async (query: string, limit?: number, offset?: number) => {
      try {
        setLoading(true);
        const results = await PanelStore.search({ query, limit, offset });
        setLoadingState(prev => ({ ...prev, isLoading: false }));
        return results;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to search panels'));
        return [];
      }
    }, [handleError]),

    // Get panel statistics
    getStats: useCallback(async () => {
      try {
        setLoading(true);
        const stats = await PanelStore.getStats();
        setLoadingState(prev => ({ ...prev, isLoading: false }));
        return stats;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to get panel stats'));
        return null;
      }
    }, [handleError])
  };

  // Inspection operations
  const inspectionOperations = {
    // Get all inspections
    getAll: useCallback(async (filters?: InspectionFilters) => {
      try {
        setLoading(true);
        const data = await InspectionStore.getAll(filters);
        if (isMounted.current) {
          setInspections(data);
          setLoadingState(prev => ({ ...prev, isLoading: false }));
        }
        return data;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to get inspections'));
        return [];
      }
    }, [handleError]),

    // Get inspection by ID
    getById: useCallback(async (id: number) => {
      try {
        setLoading(true);
        const inspection = await InspectionStore.getById(id);
        setLoadingState(prev => ({ ...prev, isLoading: false }));
        return inspection;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to get inspection'));
        return undefined;
      }
    }, [handleError]),

    // Get inspections by panel ID
    getByPanelId: useCallback(async (panelId: number) => {
      try {
        setLoading(true);
        const inspections = await InspectionStore.getByPanelId(panelId);
        setLoadingState(prev => ({ ...prev, isLoading: false }));
        return inspections;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to get inspections by panel'));
        return [];
      }
    }, [handleError]),

    // Create inspection
    create: useCallback(async (inspectionData: Omit<Inspection, 'id'>) => {
      try {
        setLoading(true);
        const id = await InspectionStore.create(inspectionData);
        await refreshAllData();
        return id;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to create inspection'));
        throw error;
      }
    }, [refreshAllData, handleError]),

    // Update inspection
    update: useCallback(async (id: number, updates: Partial<Omit<Inspection, 'id'>>) => {
      try {
        setLoading(true);
        await InspectionStore.update(id, updates);
        await refreshAllData();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to update inspection'));
        throw error;
      }
    }, [refreshAllData, handleError]),

    // Update inspection status
    updateStatus: useCallback(async (id: number, status: Inspection['status']) => {
      try {
        setLoading(true);
        await InspectionStore.updateStatus(id, status);
        await refreshAllData();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to update inspection status'));
        throw error;
      }
    }, [refreshAllData, handleError]),

    // Delete inspection
    delete: useCallback(async (id: number) => {
      try {
        setLoading(true);
        await InspectionStore.delete(id);
        await refreshAllData();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to delete inspection'));
        throw error;
      }
    }, [refreshAllData, handleError]),

    // Get inspection statistics
    getStats: useCallback(async () => {
      try {
        setLoading(true);
        const stats = await InspectionStore.getStats();
        setLoadingState(prev => ({ ...prev, isLoading: false }));
        return stats;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to get inspection stats'));
        return null;
      }
    }, [handleError])
  };

  // Sync queue operations
  const syncQueueOperations = {
    // Get all sync queue items
    getAll: useCallback(async (filters?: SyncQueueFilters) => {
      try {
        setLoading(true);
        const data = await SyncQueueStore.getAll(filters);
        if (isMounted.current) {
          setSyncQueue(data);
          setLoadingState(prev => ({ ...prev, isLoading: false }));
        }
        return data;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to get sync queue'));
        return [];
      }
    }, [handleError]),

    // Add item to sync queue
    enqueue: useCallback(async (syncItem: Omit<SyncQueue, 'id' | 'createdAt' | 'retryCount' | 'lastRetry'>) => {
      try {
        setLoading(true);
        const id = await SyncQueueStore.enqueue(syncItem);
        await refreshAllData();
        return id;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to enqueue sync item'));
        throw error;
      }
    }, [refreshAllData, handleError]),

    // Mark item as synced
    markSynced: useCallback(async (id: number) => {
      try {
        setLoading(true);
        await SyncQueueStore.markSynced(id);
        await refreshAllData();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to mark item as synced'));
        throw error;
      }
    }, [refreshAllData, handleError]),

    // Mark item as failed
    markFailed: useCallback(async (id: number, error?: string) => {
      try {
        setLoading(true);
        await SyncQueueStore.markFailed(id, error);
        await refreshAllData();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to mark item as failed'));
        throw error;
      }
    }, [refreshAllData, handleError]),

    // Get sync queue statistics
    getStats: useCallback(async () => {
      try {
        setLoading(true);
        const stats = await SyncQueueStore.getStats();
        setLoadingState(prev => ({ ...prev, isLoading: false }));
        return stats;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to get sync queue stats'));
        return null;
      }
    }, [handleError]),

    // Process sync queue batch
    processBatch: useCallback(async (batchSize?: number) => {
      try {
        setLoading(true);
        const result = await SyncQueueStore.processBatch(batchSize);
        await refreshAllData();
        return result;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to process sync batch'));
        throw error;
      }
    }, [refreshAllData, handleError])
  };

  // Database utility operations
  const databaseOperations = {
    // Clear all data
    clearAll: useCallback(async () => {
      try {
        setLoading(true);
        await db.transaction('rw', [db.panels, db.inspections, db.syncQueue], async () => {
          await db.panels.clear();
          await db.inspections.clear();
          await db.syncQueue.clear();
        });
        await refreshAllData();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to clear database'));
        throw error;
      }
    }, [refreshAllData, handleError]),

    // Export data
    exportData: useCallback(async () => {
      try {
        setLoading(true);
        const data = await db.transaction('r', [db.panels, db.inspections, db.syncQueue], async () => {
          const panels = await db.panels.toArray();
          const inspections = await db.inspections.toArray();
          const syncQueue = await db.syncQueue.toArray();
          
          return {
            panels,
            inspections,
            syncQueue,
            exportedAt: new Date()
          };
        });
        setLoadingState(prev => ({ ...prev, isLoading: false }));
        return data;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to export data'));
        return null;
      }
    }, [handleError]),

    // Import data
    importData: useCallback(async (data: { panels: Panel[]; inspections: Inspection[]; syncQueue: SyncQueue[] }) => {
      try {
        setLoading(true);
        await db.transaction('rw', [db.panels, db.inspections, db.syncQueue], async () => {
          // Clear existing data
          await db.panels.clear();
          await db.inspections.clear();
          await db.syncQueue.clear();
          
          // Import new data
          if (data.panels.length > 0) {
            await db.panels.bulkAdd(data.panels);
          }
          if (data.inspections.length > 0) {
            await db.inspections.bulkAdd(data.inspections);
          }
          if (data.syncQueue.length > 0) {
            await db.syncQueue.bulkAdd(data.syncQueue);
          }
        });
        await refreshAllData();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to import data'));
        throw error;
      }
    }, [refreshAllData, handleError]),

    // Get database info
    getDatabaseInfo: useCallback(async () => {
      try {
        setLoading(true);
        const info = await db.transaction('r', [db.panels, db.inspections, db.syncQueue], async () => {
          const panelsCount = await db.panels.count();
          const inspectionsCount = await db.inspections.count();
          const syncQueueCount = await db.syncQueue.count();
          
          return {
            panels: panelsCount,
            inspections: inspectionsCount,
            syncQueue: syncQueueCount,
            totalSize: panelsCount + inspectionsCount + syncQueueCount
          };
        });
        setLoadingState(prev => ({ ...prev, isLoading: false }));
        return info;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to get database info'));
        return null;
      }
    }, [handleError])
  };

  // Initialize data on mount
  useEffect(() => {
    isMounted.current = true;
    refreshAllData();
    setupAutoRefresh();

    return () => {
      isMounted.current = false;
      cleanup();
    };
  }, [refreshAllData, setupAutoRefresh, cleanup]);

  return {
    // State
    panels,
    inspections,
    syncQueue,
    loadingState,
    
    // Operations
    panelOperations,
    inspectionOperations,
    syncQueueOperations,
    databaseOperations,
    
    // Utilities
    refreshAllData,
    setLoading
  };
};

export default useOfflineStorage;
