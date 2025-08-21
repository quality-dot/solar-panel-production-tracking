import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsyncOperation, useApiOperation } from '../useAsyncOperation';
import { useNetworkStatus } from '../useNetworkStatus';
import { useOfflineStorage } from '../useOfflineStorage';
import { Panel, Inspection, SyncQueue } from '../../database/config';

// Mock the dependencies
jest.mock('../useNetworkStatus');
jest.mock('../useOfflineStorage');

const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;
const mockUseOfflineStorage = useOfflineStorage as jest.MockedFunction<typeof useOfflineStorage>;

describe('useAsyncOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockUseNetworkStatus.mockReturnValue({
      networkStatus: {
        isOnline: true,
        isOffline: false,
        connectionType: 'wifi',
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
        lastUpdated: new Date()
      },
      isOnline: true,
      isOffline: false,
      syncStatus: {
        isSyncing: false,
        lastSyncAttempt: null,
        lastSuccessfulSync: null,
        pendingItems: 0,
        failedItems: 0,
        syncError: null
      },
      isSyncing: false,
      checkNetworkStatus: jest.fn(),
      triggerSync: jest.fn(),
      forceOffline: jest.fn(),
      forceOnline: jest.fn(),
      isConnectionSlow: jest.fn(),
      isConnectionFast: jest.fn(),
      getConnectionQuality: jest.fn(),
      startPeriodicCheck: jest.fn(),
      stopPeriodicCheck: jest.fn()
    });

    mockUseOfflineStorage.mockReturnValue({
      panels: [] as Panel[],
      inspections: [] as Inspection[],
      syncQueue: [] as SyncQueue[],
      loadingState: { isLoading: false, isError: false, error: null as Error | null },
      panelOperations: {
        getAll: jest.fn(),
        getById: jest.fn(),
        getByBarcode: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn(),
        search: jest.fn(),
        getStats: jest.fn()
      },
      inspectionOperations: {
        getAll: jest.fn(),
        getById: jest.fn(),
        getByPanelId: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn(),
        getStats: jest.fn()
      },
      syncQueueOperations: {
        getAll: jest.fn(),
        enqueue: jest.fn(),
        markSynced: jest.fn(),
        markFailed: jest.fn(),
        getStats: jest.fn(),
        processBatch: jest.fn()
      },
      databaseOperations: {
        clearAll: jest.fn(),
        exportData: jest.fn(),
        importData: jest.fn(),
        getDatabaseInfo: jest.fn()
      },
      refreshAllData: jest.fn(),
      setLoading: jest.fn()
    });
  });

  describe('Basic functionality', () => {
    it('should execute an async operation successfully', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { immediate: false })
      );

      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.data).toBe(null);

      await act(async () => {
        await result.current.execute('test');
      });

      expect(mockOperation).toHaveBeenCalledWith('test');
      expect(result.current.state.data).toBe('success');
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.isError).toBe(false);
    });

    it('should handle operation errors', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValue(mockError);
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { immediate: false })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.state.isError).toBe(true);
      expect(result.current.state.error).toBe(mockError);
      expect(result.current.state.isLoading).toBe(false);
    });

    it('should not execute when disabled', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { enabled: false, immediate: false })
      );

      await act(async () => {
        const executeResult = await result.current.execute();
        expect(executeResult).toBe(null);
      });

      expect(mockOperation).not.toHaveBeenCalled();
    });
  });

  describe('Retry logic', () => {
    it('should retry failed operations', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt'))
        .mockRejectedValueOnce(new Error('Second attempt'))
        .mockResolvedValue('success');
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { 
          immediate: false,
          retry: { maxRetries: 2, retryDelay: 10 }
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(result.current.state.data).toBe('success');
      expect(result.current.state.retryCount).toBe(0);
    });

    it('should stop retrying after max retries', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValue(mockError);
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { 
          immediate: false,
          retry: { maxRetries: 2, retryDelay: 10 }
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(result.current.state.isError).toBe(true);
      expect(result.current.state.error).toBe(mockError);
    });

    it('should allow manual retry', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt'))
        .mockResolvedValue('success');
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { immediate: false })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.state.isError).toBe(true);

      await act(async () => {
        await result.current.retry();
      });

      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(result.current.state.data).toBe('success');
    });
  });

  describe('Caching', () => {
    it('should cache successful operations', async () => {
      const mockOperation = jest.fn().mockResolvedValue('cached data');
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { 
          immediate: false,
          cacheTime: 5000,
          staleTime: 1000
        })
      );

      // First execution
      await act(async () => {
        await result.current.execute('test');
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(result.current.state.data).toBe('cached data');

      // Second execution with same args should use cache
      await act(async () => {
        await result.current.execute('test');
      });

      expect(mockOperation).toHaveBeenCalledTimes(1); // Should not call again
      expect(result.current.isCached).toBe(true);
    });

    it('should detect stale data', async () => {
      const mockOperation = jest.fn().mockResolvedValue('data');
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { 
          immediate: false,
          staleTime: 10 // Very short stale time
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      // Wait for data to become stale
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      expect(result.current.isStale).toBe(true);
    });
  });

  describe('Offline fallback', () => {
    it('should use offline fallback when offline', async () => {
      mockUseNetworkStatus.mockReturnValue({
        networkStatus: {
          isOnline: false,
          isOffline: true,
          connectionType: undefined,
          effectiveType: undefined,
          downlink: undefined,
          rtt: undefined,
          saveData: undefined,
          lastUpdated: new Date()
        },
        isOnline: false,
        isOffline: true,
        syncStatus: {
          isSyncing: false,
          lastSyncAttempt: null,
          lastSuccessfulSync: null,
          pendingItems: 0,
          failedItems: 0,
          syncError: null
        },
        isSyncing: false,
        checkNetworkStatus: jest.fn(),
        triggerSync: jest.fn(),
        forceOffline: jest.fn(),
        forceOnline: jest.fn(),
        isConnectionSlow: jest.fn(),
        isConnectionFast: jest.fn(),
        getConnectionQuality: jest.fn(),
        startPeriodicCheck: jest.fn(),
        stopPeriodicCheck: jest.fn()
      });

      const mockGetPanelById = jest.fn().mockResolvedValue({ id: 1, name: 'Panel 1' });
      const baseOfflineStorageMock = {
        panels: [] as Panel[],
        inspections: [] as Inspection[],
        syncQueue: [] as SyncQueue[],
        loadingState: { isLoading: false, isError: false, error: null as Error | null },
        panelOperations: {
          getAll: jest.fn(),
          getById: mockGetPanelById,
          getByBarcode: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          updateStatus: jest.fn(),
          delete: jest.fn(),
          search: jest.fn(),
          getStats: jest.fn()
        },
        inspectionOperations: {
          getAll: jest.fn(),
          getById: jest.fn(),
          getByPanelId: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          updateStatus: jest.fn(),
          delete: jest.fn(),
          getStats: jest.fn()
        },
        syncQueueOperations: {
          getAll: jest.fn(),
          enqueue: jest.fn(),
          markSynced: jest.fn(),
          markFailed: jest.fn(),
          getStats: jest.fn(),
          processBatch: jest.fn()
        },
        databaseOperations: {
          clearAll: jest.fn(),
          exportData: jest.fn(),
          importData: jest.fn(),
          getDatabaseInfo: jest.fn()
        },
        refreshAllData: jest.fn(),
        setLoading: jest.fn()
      };
      mockUseOfflineStorage.mockReturnValue(baseOfflineStorageMock);

      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { 
          immediate: false,
          useOfflineFallback: true,
          offlineFallbackKey: 'panel_1'
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(mockGetPanelById).toHaveBeenCalledWith(1);
      expect(result.current.state.data).toEqual({ id: 1, name: 'Panel 1' });
      expect(result.current.state.isError).toBe(false);
    });

    it('should not use offline fallback when disabled', async () => {
      mockUseNetworkStatus.mockReturnValue({
        networkStatus: {
          isOnline: false,
          isOffline: true,
          connectionType: undefined,
          effectiveType: undefined,
          downlink: undefined,
          rtt: undefined,
          saveData: undefined,
          lastUpdated: new Date()
        },
        isOnline: false,
        isOffline: true,
        syncStatus: {
          isSyncing: false,
          lastSyncAttempt: null,
          lastSuccessfulSync: null,
          pendingItems: 0,
          failedItems: 0,
          syncError: null
        },
        isSyncing: false,
        checkNetworkStatus: jest.fn(),
        triggerSync: jest.fn(),
        forceOffline: jest.fn(),
        forceOnline: jest.fn(),
        isConnectionSlow: jest.fn(),
        isConnectionFast: jest.fn(),
        getConnectionQuality: jest.fn(),
        startPeriodicCheck: jest.fn(),
        stopPeriodicCheck: jest.fn()
      });

      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { 
          immediate: false,
          useOfflineFallback: false
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.state.isError).toBe(true);
      expect(result.current.state.data).toBe(null);
    });
  });

  describe('Transform functions', () => {
    it('should transform data with transform function', async () => {
      const mockOperation = jest.fn().mockResolvedValue({ raw: 'data' });
      const transform = jest.fn().mockImplementation((data) => ({ processed: data.raw }));
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { 
          immediate: false,
          transform
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(transform).toHaveBeenCalledWith({ raw: 'data' });
      expect(result.current.state.data).toEqual({ processed: 'data' });
    });

    it('should transform errors with transformError function', async () => {
      const mockOperation = jest.fn().mockRejectedValue('String error');
      const transformError = jest.fn().mockImplementation((error) => new Error(`Transformed: ${error}`));
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { 
          immediate: false,
          transformError
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(transformError).toHaveBeenCalledWith('String error');
      expect(result.current.state.error?.message).toBe('Transformed: String error');
    });
  });

  describe('Callbacks', () => {
    it('should call onSuccess callback', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const onSuccess = jest.fn();
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { 
          immediate: false,
          onSuccess
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).toHaveBeenCalledWith('success');
    });

    it('should call onError callback', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValue(mockError);
      const onError = jest.fn();
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { 
          immediate: false,
          onError
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).toHaveBeenCalledWith(mockError);
    });

    it('should call onRetry callback', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt'))
        .mockResolvedValue('success');
      const onRetry = jest.fn();
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { 
          immediate: false,
          retry: { maxRetries: 1, retryDelay: 10 },
          onRetry
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  describe('State management', () => {
    it('should reset state correctly', async () => {
      const mockOperation = jest.fn().mockResolvedValue('data');
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { immediate: false })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.state.data).toBe('data');

      act(() => {
        result.current.reset();
      });

      expect(result.current.state.data).toBe(null);
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.isError).toBe(false);
      expect(result.current.state.error).toBe(null);
    });

    it('should cancel ongoing operations', async () => {
      const mockOperation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('data'), 100))
      );
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { immediate: false })
      );

      act(() => {
        result.current.execute();
      });

      expect(result.current.state.isLoading).toBe(true);

      act(() => {
        result.current.cancel();
      });

      expect(result.current.state.isLoading).toBe(false);
    });
  });

  describe('Immediate execution', () => {
    it('should execute immediately when immediate is true', async () => {
      const mockOperation = jest.fn().mockResolvedValue('immediate data');
      
      renderHook(() => 
        useAsyncOperation(mockOperation, { immediate: true })
      );

      await waitFor(() => {
        expect(mockOperation).toHaveBeenCalled();
      });
    });

    it('should not execute immediately when immediate is false', async () => {
      const mockOperation = jest.fn().mockResolvedValue('data');
      
      renderHook(() => 
        useAsyncOperation(mockOperation, { immediate: false })
      );

      expect(mockOperation).not.toHaveBeenCalled();
    });
  });
});

describe('useApiOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseNetworkStatus.mockReturnValue({
      networkStatus: {
        isOnline: true,
        isOffline: false,
        connectionType: 'wifi',
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
        lastUpdated: new Date()
      },
      isOnline: true,
      isOffline: false,
      syncStatus: {
        isSyncing: false,
        lastSyncAttempt: null,
        lastSuccessfulSync: null,
        pendingItems: 0,
        failedItems: 0,
        syncError: null
      },
      isSyncing: false,
      checkNetworkStatus: jest.fn(),
      triggerSync: jest.fn(),
      forceOffline: jest.fn(),
      forceOnline: jest.fn(),
      isConnectionSlow: jest.fn(),
      isConnectionFast: jest.fn(),
      getConnectionQuality: jest.fn(),
      startPeriodicCheck: jest.fn(),
      stopPeriodicCheck: jest.fn()
    });

    mockUseOfflineStorage.mockReturnValue({
      panels: [] as Panel[],
      inspections: [] as Inspection[],
      syncQueue: [] as SyncQueue[],
      loadingState: { isLoading: false, isError: false, error: null as Error | null },
      panelOperations: {
        getAll: jest.fn(),
        getById: jest.fn(),
        getByBarcode: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn(),
        search: jest.fn(),
        getStats: jest.fn()
      },
      inspectionOperations: {
          getAll: jest.fn(),
          getById: jest.fn(),
          getByPanelId: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          updateStatus: jest.fn(),
          delete: jest.fn(),
          getStats: jest.fn()
        },
        syncQueueOperations: {
          getAll: jest.fn(),
          enqueue: jest.fn(),
          markSynced: jest.fn(),
          markFailed: jest.fn(),
          getStats: jest.fn(),
          processBatch: jest.fn()
        },
        databaseOperations: {
          clearAll: jest.fn(),
          exportData: jest.fn(),
          importData: jest.fn(),
          getDatabaseInfo: jest.fn()
        },
      refreshAllData: jest.fn(),
      setLoading: jest.fn()
    });
  });

  it('should queue operations when offline', async () => {
    mockUseNetworkStatus.mockReturnValue({
      networkStatus: {
        isOnline: false,
        isOffline: true,
        connectionType: undefined,
        effectiveType: undefined,
        downlink: undefined,
        rtt: undefined,
        saveData: undefined,
        lastUpdated: new Date()
      },
      isOnline: false,
      isOffline: true,
      syncStatus: {
        isSyncing: false,
        lastSyncAttempt: null,
        lastSuccessfulSync: null,
        pendingItems: 0,
        failedItems: 0,
        syncError: null
      },
      isSyncing: false,
      checkNetworkStatus: jest.fn(),
      triggerSync: jest.fn(),
      forceOffline: jest.fn(),
      forceOnline: jest.fn(),
      isConnectionSlow: jest.fn(),
      isConnectionFast: jest.fn(),
      getConnectionQuality: jest.fn(),
      startPeriodicCheck: jest.fn(),
      stopPeriodicCheck: jest.fn()
    });

    const mockAddToSyncQueue = jest.fn();
    const baseOfflineStorageMock = {
      panels: [] as Panel[],
      inspections: [] as Inspection[],
      syncQueue: [] as SyncQueue[],
      loadingState: { isLoading: false, isError: false, error: null as Error | null },
      panelOperations: {
        getAll: jest.fn(),
        getById: jest.fn(),
        getByBarcode: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn(),
        search: jest.fn(),
        getStats: jest.fn()
      },
      inspectionOperations: {
        getAll: jest.fn(),
        getById: jest.fn(),
        getByPanelId: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn(),
        getStats: jest.fn()
      },
      syncQueueOperations: {
        getAll: jest.fn(),
        enqueue: mockAddToSyncQueue,
        markSynced: jest.fn(),
        markFailed: jest.fn(),
        getStats: jest.fn(),
        processBatch: jest.fn()
      },
      databaseOperations: {
        clearAll: jest.fn(),
        exportData: jest.fn(),
        importData: jest.fn(),
        getDatabaseInfo: jest.fn()
      },
      refreshAllData: jest.fn(),
      setLoading: jest.fn()
    };
    mockUseOfflineStorage.mockReturnValue(baseOfflineStorageMock);

    const mockApiCall = jest.fn().mockResolvedValue('api response');
    
    const { result } = renderHook(() => 
      useApiOperation(mockApiCall, { 
        immediate: false,
        queueOnOffline: true,
        queueOperation: 'create',
        queueTable: 'panels',
        queuePriority: 'high'
      })
    );

    await act(async () => {
      await result.current.execute({ name: 'Test Panel' });
    });

    expect(mockApiCall).not.toHaveBeenCalled();
    expect(mockAddToSyncQueue).toHaveBeenCalledWith({
      operation: 'create',
      table: 'panels',
      data: { name: 'Test Panel' },
      priority: 'high'
    });
    expect(result.current.state.data).toEqual({ success: true, offline: true });
  });

  it('should make API call when online', async () => {
    const mockApiCall = jest.fn().mockResolvedValue('api response');
    
    const { result } = renderHook(() => 
      useApiOperation(mockApiCall, { immediate: false })
    );

    await act(async () => {
      await result.current.execute('test');
    });

    expect(mockApiCall).toHaveBeenCalledWith('test');
    expect(result.current.state.data).toBe('api response');
  });

  it('should not queue when queueOnOffline is false', async () => {
    mockUseNetworkStatus.mockReturnValue({
      networkStatus: {
        isOnline: false,
        isOffline: true,
        connectionType: undefined,
        effectiveType: undefined,
        downlink: undefined,
        rtt: undefined,
        saveData: undefined,
        lastUpdated: new Date()
      },
      isOnline: false,
      isOffline: true,
      syncStatus: {
        isSyncing: false,
        lastSyncAttempt: null,
        lastSuccessfulSync: null,
        pendingItems: 0,
        failedItems: 0,
        syncError: null
      },
      isSyncing: false,
      checkNetworkStatus: jest.fn(),
      triggerSync: jest.fn(),
      forceOffline: jest.fn(),
      forceOnline: jest.fn(),
      isConnectionSlow: jest.fn(),
      isConnectionFast: jest.fn(),
      getConnectionQuality: jest.fn(),
      startPeriodicCheck: jest.fn(),
      stopPeriodicCheck: jest.fn()
    });

    const mockApiCall = jest.fn().mockRejectedValue(new Error('Network error'));
    
    const { result } = renderHook(() => 
      useApiOperation(mockApiCall, { 
        immediate: false,
        queueOnOffline: false
      })
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(mockApiCall).toHaveBeenCalled();
    expect(result.current.state.isError).toBe(true);
  });
});
