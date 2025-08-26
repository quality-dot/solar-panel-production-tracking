import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useOfflineStorage } from './useOfflineStorage';
import { SyncQueue, db } from '../database/config';

// Types for the hook
export interface AsyncOperationState<T = any> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isRetrying: boolean;
  retryCount: number;
  lastUpdated: Date | null;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
}

export interface AsyncOperationOptions<T = any> {
  // Basic options
  enabled?: boolean;
  immediate?: boolean;
  
  // Retry configuration
  retry?: Partial<RetryConfig>;
  
  // Offline handling
  useOfflineFallback?: boolean;
  offlineFallbackKey?: string;
  
  // Cache configuration
  cacheTime?: number; // milliseconds
  staleTime?: number; // milliseconds
  
  // Callbacks
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onRetry?: (attempt: number, error: Error) => void;
  
  // Transform functions
  transform?: (data: any) => T;
  transformError?: (error: any) => Error;
}

export interface AsyncOperationResult<T = any> {
  // State
  state: AsyncOperationState<T>;
  
  // Actions
  execute: (...args: any[]) => Promise<T | null>;
  retry: () => Promise<T | null>;
  reset: () => void;
  cancel: () => void;
  
  // Utilities
  isStale: boolean;
  isCached: boolean;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  maxRetryDelay: 10000
};

// Default cache times
const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes
const DEFAULT_STALE_TIME = 1 * 60 * 1000; // 1 minute

// Cache storage for operations
const operationCache = new Map<string, { data: any; timestamp: number; staleTime: number }>();

export const useAsyncOperation = <T = any>(
  operation: (...args: any[]) => Promise<T>,
  options: AsyncOperationOptions<T> = {}
): AsyncOperationResult<T> => {
  const {
    enabled = true,
    immediate = false,
    retry: retryConfig = {},
    useOfflineFallback = true,
    offlineFallbackKey,
    cacheTime = DEFAULT_CACHE_TIME,
    staleTime = DEFAULT_STALE_TIME,
    onSuccess,
    onError,
    onRetry,
    transform,
    transformError
  } = options;

  // Merge retry config with defaults
  const finalRetryConfig = useMemo(() => ({
    ...DEFAULT_RETRY_CONFIG,
    ...retryConfig
  }), [retryConfig]);

  // Get network status and offline storage
  const { isOnline } = useNetworkStatus();
  const { panelOperations, inspectionOperations, syncQueueOperations } = useOfflineStorage();

  // State management
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
    isRetrying: false,
    retryCount: 0,
    lastUpdated: null
  });

  // Refs for tracking
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const operationIdRef = useRef<string>('');

  // Generate operation ID for caching
  const generateOperationId = useCallback((...args: any[]) => {
    return `${operation.name || 'operation'}_${JSON.stringify(args)}`;
  }, [operation]);

  // Cache management
  const getCachedData = useCallback((operationId: string): T | null => {
    const cached = operationCache.get(operationId);
    if (!cached) return null;
    
    const now = Date.now();
    const isExpired = now - cached.timestamp > cacheTime;
    const isStale = now - cached.timestamp > staleTime;
    
    if (isExpired) {
      operationCache.delete(operationId);
      return null;
    }
    
    return cached.data;
  }, [cacheTime, staleTime]);

  const setCachedData = useCallback((operationId: string, data: T) => {
    operationCache.set(operationId, {
      data,
      timestamp: Date.now(),
      staleTime
    });
  }, [staleTime]);

  // Offline fallback handling
  const getOfflineFallback = useCallback(async (operationId: string): Promise<T | null> => {
    if (!useOfflineFallback || !offlineFallbackKey) return null;
    
    try {
      // Try to get data from offline storage based on the fallback key
      if (offlineFallbackKey.startsWith('panel_')) {
        const panelId = parseInt(offlineFallbackKey.replace('panel_', ''));
        return await panelOperations.getById(panelId) as T;
      } else if (offlineFallbackKey.startsWith('inspection_')) {
        const inspectionId = parseInt(offlineFallbackKey.replace('inspection_', ''));
        return await inspectionOperations.getById(inspectionId) as T;
      }
    } catch (error) {
      console.warn('Failed to get offline fallback data:', error);
    }
    
    return null;
  }, [useOfflineFallback, offlineFallbackKey, panelOperations, inspectionOperations]);

  // Add to sync queue for offline operations
  const queueForSync = useCallback(async (operation: string, table: string, data: any, priority: SyncQueue['priority'] = 'medium') => {
    try {
      await syncQueueOperations.enqueue({
        operation: operation as 'create' | 'update' | 'delete',
        table,
        data,
        priority
      });
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
    }
  }, [syncQueueOperations]);

  // Error transformation
  const transformErrorData = useCallback((error: any): Error => {
    if (transformError) {
      return transformError(error);
    }
    
    if (error instanceof Error) {
      return error;
    }
    
    if (typeof error === 'string') {
      return new Error(error);
    }
    
    return new Error('An unknown error occurred');
  }, [transformError]);

  // Retry logic
  const calculateRetryDelay = useCallback((attempt: number): number => {
    const delay = finalRetryConfig.retryDelay * Math.pow(finalRetryConfig.backoffMultiplier, attempt);
    return Math.min(delay, finalRetryConfig.maxRetryDelay);
  }, [finalRetryConfig]);

  // Main execution function
  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    if (!enabled) return null;

    const operationId = generateOperationId(...args);
    operationIdRef.current = operationId;

    // Check cache first
    const cachedData = getCachedData(operationId);
    if (cachedData) {
      setState(prev => ({
        ...prev,
        data: cachedData,
        lastUpdated: new Date()
      }));
      return cachedData;
    }

    // Check if we're offline and have fallback data
    if (!isOnline && useOfflineFallback) {
      const fallbackData = await getOfflineFallback(operationId);
      if (fallbackData) {
        setState(prev => ({
          ...prev,
          data: fallbackData,
          lastUpdated: new Date(),
          isError: false,
          error: null
        }));
        return fallbackData;
      }
    }

    // Cancel any ongoing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      isError: false,
      error: null,
      isRetrying: false
    }));

    let lastError: Error | null = null;

    // Execute with retry logic
    for (let attempt = 0; attempt <= finalRetryConfig.maxRetries; attempt++) {
      try {
        if (!isMounted.current) return null;

        // Check if operation was cancelled
        if (abortControllerRef.current?.signal.aborted) {
          return null;
        }

        // Set retrying state for subsequent attempts
        if (attempt > 0) {
          setState(prev => ({
            ...prev,
            isRetrying: true,
            retryCount: attempt
          }));
          onRetry?.(attempt, lastError!);
        }

        // Execute the operation
        let result: any = await operation(...args);

        // Transform the result if needed
        if (transform) {
          result = transform(result);
        }

        // Cache the result
        setCachedData(operationId, result);

        // Update state on success
        if (isMounted.current) {
          setState(prev => ({
            ...prev,
            data: result,
            isLoading: false,
            isError: false,
            error: null,
            isRetrying: false,
            retryCount: 0,
            lastUpdated: new Date()
          }));
        }

        onSuccess?.(result);
        return result;

      } catch (error) {
        lastError = transformErrorData(error);

        // Don't retry if operation was cancelled
        if (abortControllerRef.current?.signal.aborted) {
          return null;
        }

        // Don't retry if we've reached max retries
        if (attempt >= finalRetryConfig.maxRetries) {
          // If offline and we have fallback, try to get it
          if (!isOnline && useOfflineFallback) {
            const fallbackData = await getOfflineFallback(operationId);
            if (fallbackData) {
              if (isMounted.current) {
                setState(prev => ({
                  ...prev,
                  data: fallbackData,
                  isLoading: false,
                  isError: false,
                  error: null,
                  isRetrying: false,
                  lastUpdated: new Date()
                }));
              }
              return fallbackData;
            }
          }

          // Final failure
          if (isMounted.current) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              isError: true,
              error: lastError,
              isRetrying: false
            }));
          }

          onError?.(lastError);
          return null;
        }

        // Wait before retrying
        const delay = calculateRetryDelay(attempt);
        await new Promise(resolve => {
          retryTimeoutRef.current = setTimeout(resolve, delay);
        });
      }
    }

    return null;
  }, [
    enabled,
    operation,
    generateOperationId,
    getCachedData,
    setCachedData,
    isOnline,
    useOfflineFallback,
    getOfflineFallback,
    finalRetryConfig,
    transform,
    transformErrorData,
    calculateRetryDelay,
    onSuccess,
    onError,
    onRetry
  ]);

  // Retry function
  const retry = useCallback(async (): Promise<T | null> => {
    if (state.isLoading || state.isRetrying) return null;
    
    // Reset retry count and try again
    setState(prev => ({
      ...prev,
      retryCount: 0
    }));
    
    return execute();
  }, [execute, state.isLoading, state.isRetrying]);

  // Reset function
  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      isRetrying: false,
      retryCount: 0,
      lastUpdated: null
    });
  }, []);

  // Cancel function
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isLoading: false,
      isRetrying: false
    }));
  }, []);

  // Utility computed values
  const isStale = useMemo(() => {
    if (!state.lastUpdated) return false;
    return Date.now() - state.lastUpdated.getTime() > staleTime;
  }, [state.lastUpdated, staleTime]);

  const isCached = useMemo(() => {
    return getCachedData(operationIdRef.current) !== null;
  }, [getCachedData]);

  // Auto-execute if immediate is true
  useEffect(() => {
    if (immediate && enabled) {
      execute();
    }
  }, [immediate, enabled, execute]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    execute,
    retry,
    reset,
    cancel,
    isStale,
    isCached
  };
};

// Utility hook for common API operations
export const useApiOperation = <T = any>(
  apiCall: (...args: any[]) => Promise<T>,
  options: AsyncOperationOptions<T> & {
    // Additional API-specific options
    queueOnOffline?: boolean;
    queueOperation?: 'create' | 'update' | 'delete';
    queueTable?: string;
    queuePriority?: SyncQueue['priority'];
  } = {}
) => {
  const {
    queueOnOffline = true,
    queueOperation,
    queueTable,
    queuePriority = 'medium',
    ...asyncOptions
  } = options;

  const { isOnline } = useNetworkStatus();
  const { syncQueueOperations } = useOfflineStorage();

  const wrappedApiCall = useCallback(async (...args: any[]) => {
    // If offline and we should queue, add to sync queue instead
    if (!isOnline && queueOnOffline && queueOperation && queueTable) {
      await syncQueueOperations.enqueue({
        operation: queueOperation,
        table: queueTable,
        data: args[0] || {},
        priority: queuePriority
      });
      
      // Return a mock response for offline operations
      return { success: true, offline: true } as T;
    }

    // Otherwise, make the actual API call
    return apiCall(...args);
  }, [apiCall, isOnline, queueOnOffline, queueOperation, queueTable, queuePriority, syncQueueOperations]);

  return useAsyncOperation(wrappedApiCall, asyncOptions);
};

// Types are already exported above
