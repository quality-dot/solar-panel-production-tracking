import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsyncOperation } from '../useAsyncOperation';

// Mock the dependencies
jest.mock('../useNetworkStatus');
jest.mock('../useOfflineStorage');

import { useNetworkStatus } from '../useNetworkStatus';
import { useOfflineStorage } from '../useOfflineStorage';

const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;
const mockUseOfflineStorage = useOfflineStorage as jest.MockedFunction<typeof useOfflineStorage>;

describe('useAsyncOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      networkStatus: {
        isOnline: true,
        isOffline: false,
        lastUpdated: new Date()
      },
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
      panels: [],
      inspections: [],
      syncQueue: [],
      loadingState: { isLoading: false, isError: false, error: null },
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
    it('should initialize with default state', () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { immediate: false })
      );

      expect(result.current.state).toEqual({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
        isRetrying: false,
        retryCount: 0,
        lastUpdated: null
      });
    });

    it('should execute operation and update state', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { immediate: false })
      );

      await act(async () => {
        const executeResult = await result.current.execute();
        expect(executeResult).toBe('success');
      });

      expect(result.current.state.data).toBe('success');
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.isError).toBe(false);
      expect(result.current.state.error).toBe(null);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    }, 10000);

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
    }, 10000);

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
    }, 10000);
  });

  describe('Retry functionality', () => {
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
    }, 15000);

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
      expect(result.current.state.retryCount).toBe(2);
    }, 15000);

    it('should handle manual retry', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt'))
        .mockResolvedValue('success');
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { immediate: false })
      );

      // First attempt fails
      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.state.isError).toBe(true);
      expect(result.current.state.retryCount).toBe(0);

      // Manual retry succeeds
      await act(async () => {
        const retryResult = await result.current.retry();
        expect(retryResult).toBe('success');
      });

      expect(result.current.state.data).toBe('success');
      expect(result.current.state.isError).toBe(false);
    }, 15000);
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
    }, 10000);

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
    }, 10000);

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
    }, 15000);
  });

  describe('Transform functions', () => {
    it('should transform data with transform function', async () => {
      const mockOperation = jest.fn().mockResolvedValue({ raw: 'data' });
      const transform = jest.fn((data) => ({ processed: data.raw }));
      
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
    }, 10000);

    it('should transform errors with transformError function', async () => {
      const mockError = new Error('Raw error');
      const mockOperation = jest.fn().mockRejectedValue(mockError);
      const transformError = jest.fn((error) => new Error(`Transformed: ${error.message}`));
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { 
          immediate: false,
          transformError
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(transformError).toHaveBeenCalledWith(mockError);
      expect(result.current.state.error?.message).toBe('Transformed: Raw error');
    }, 10000);
  });

  describe('Reset and cancel', () => {
    it('should reset state', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { immediate: false })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.state.data).toBe('success');

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toEqual({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
        isRetrying: false,
        retryCount: 0,
        lastUpdated: null
      });
    }, 10000);

    it('should cancel ongoing operation', async () => {
      const mockOperation = jest.fn().mockImplementation(() => 
        new Promise((resolve) => setTimeout(() => resolve('success'), 1000))
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
    }, 10000);
  });

  describe('Cache functionality', () => {
    it('should return cached data when available', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { 
          immediate: false,
          cacheTime: 5000
        })
      );

      // First execution
      await act(async () => {
        await result.current.execute();
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);

      // Second execution should use cache
      await act(async () => {
        await result.current.execute();
      });

      expect(mockOperation).toHaveBeenCalledTimes(1); // Should not call again
      expect(result.current.state.data).toBe('success');
    }, 15000);

    it('should indicate stale data', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, { 
          immediate: false,
          staleTime: 100
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.isStale).toBe(false);

      // Wait for data to become stale
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(result.current.isStale).toBe(true);
    }, 15000);
  });
}); 
