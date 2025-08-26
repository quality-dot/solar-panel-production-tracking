import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBackgroundSync } from '../useBackgroundSync';
import { useNetworkStatus } from '../useNetworkStatus';
import BackgroundSyncService from '../../services/BackgroundSyncService';
import { ToastProvider } from '../../components/ui/ToastProvider';

// Mock the dependencies
jest.mock('../useNetworkStatus');
jest.mock('../../services/BackgroundSyncService');

const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;
const mockBackgroundSyncService = BackgroundSyncService as jest.MockedClass<typeof BackgroundSyncService>;

// Create a wrapper component for tests that need ToastProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    {children}
  </ToastProvider>
);

describe('useBackgroundSync', () => {
  let mockSyncService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock network status
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

    // Mock sync service
    mockSyncService = {
      onProgress: jest.fn().mockReturnValue(() => {}),
      onStatus: jest.fn().mockReturnValue(() => {}),
      syncWhenOnline: jest.fn(),
      retryFailedItems: jest.fn(),
      getSyncStats: jest.fn(),
      cleanupOldItems: jest.fn(),
      isCurrentlySyncing: jest.fn().mockReturnValue(false)
    };

    (mockBackgroundSyncService.getInstance as jest.Mock).mockReturnValue(mockSyncService);
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useBackgroundSync(), { wrapper: TestWrapper });

    expect(result.current.isSyncing).toBe(false);
    expect(result.current.progress.status).toBe('idle');
    expect(result.current.lastSyncResult).toBe(null);
    expect(result.current.syncStats).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.hasPendingItems).toBe(false);
    expect(result.current.hasFailedItems).toBe(false);
    expect(result.current.syncHealth).toBe('good');
  });

  it('should subscribe to sync service updates on mount', () => {
    renderHook(() => useBackgroundSync(), { wrapper: TestWrapper });

    expect(mockSyncService.onProgress).toHaveBeenCalled();
    expect(mockSyncService.onStatus).toHaveBeenCalled();
    expect(mockSyncService.getSyncStats).toHaveBeenCalled();
  });

  it('should trigger sync when network comes back online', async () => {
    // Start with offline
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      networkStatus: {
        isOnline: false,
        isOffline: true,
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

    const { result } = renderHook(() => useBackgroundSync({ autoSyncOnOnline: true }), { wrapper: TestWrapper });

    // Mock successful sync
    mockSyncService.syncWhenOnline.mockResolvedValue({
      processed: 5,
      successful: 5,
      failed: 0,
      conflicts: 0,
      results: []
    });

    mockSyncService.getSyncStats.mockResolvedValue({
      pending: 0,
      failed: 0,
      lastSync: new Date(),
      syncHealth: 'good'
    });

    // Switch to online
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

    // Re-render to trigger the effect
    renderHook(() => useBackgroundSync({ autoSyncOnOnline: true }), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(mockSyncService.syncWhenOnline).toHaveBeenCalled();
    });
  });

  it('should handle manual sync trigger', async () => {
    const { result } = renderHook(() => useBackgroundSync(), { wrapper: TestWrapper });

    mockSyncService.syncWhenOnline.mockResolvedValue({
      processed: 3,
      successful: 3,
      failed: 0,
      conflicts: 0,
      results: []
    });

    mockSyncService.getSyncStats.mockResolvedValue({
      pending: 0,
      failed: 0,
      lastSync: new Date(),
      syncHealth: 'good'
    });

    await act(async () => {
      await result.current.triggerSync();
    });

    expect(mockSyncService.syncWhenOnline).toHaveBeenCalled();
    expect(result.current.lastSyncResult).toEqual({
      processed: 3,
      successful: 3,
      failed: 0,
      conflicts: 0,
      results: []
    });
  });

  it('should handle sync errors', async () => {
    const { result } = renderHook(() => useBackgroundSync(), { wrapper: TestWrapper });

    const syncError = new Error('Network error');
    mockSyncService.syncWhenOnline.mockRejectedValue(syncError);

    await act(async () => {
      try {
        await result.current.triggerSync();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('Network error');
  });

  it('should handle retry failed items', async () => {
    const { result } = renderHook(() => useBackgroundSync(), { wrapper: TestWrapper });

    mockSyncService.retryFailedItems.mockResolvedValue({
      processed: 2,
      successful: 2,
      failed: 0,
      conflicts: 0,
      results: []
    });

    mockSyncService.getSyncStats.mockResolvedValue({
      pending: 0,
      failed: 0,
      lastSync: new Date(),
      syncHealth: 'good'
    });

    await act(async () => {
      await result.current.retryFailedItems();
    });

    expect(mockSyncService.retryFailedItems).toHaveBeenCalled();
  });

  it('should refresh sync stats', async () => {
    const { result } = renderHook(() => useBackgroundSync(), { wrapper: TestWrapper });

    const mockStats = {
      pending: 5,
      failed: 2,
      lastSync: new Date(),
      syncHealth: 'warning' as const
    };

    mockSyncService.getSyncStats.mockResolvedValue(mockStats);

    await act(async () => {
      await result.current.refreshSyncStats();
    });

    expect(mockSyncService.getSyncStats).toHaveBeenCalled();
    expect(result.current.syncStats).toEqual(mockStats);
  });

  it('should cleanup old items', async () => {
    const { result } = renderHook(() => useBackgroundSync(), { wrapper: TestWrapper });

    mockSyncService.cleanupOldItems.mockResolvedValue(10);
    mockSyncService.getSyncStats.mockResolvedValue({
      pending: 0,
      failed: 0,
      lastSync: new Date(),
      syncHealth: 'good'
    });

    await act(async () => {
      const count = await result.current.cleanupOldItems(7);
      expect(count).toBe(10);
    });

    expect(mockSyncService.cleanupOldItems).toHaveBeenCalledWith(7);
  });

  it('should not auto-sync when autoSyncOnOnline is false', () => {
    renderHook(() => useBackgroundSync({ autoSyncOnOnline: false }), { wrapper: TestWrapper });

    // Switch network status to trigger auto-sync
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

    // Re-render
    renderHook(() => useBackgroundSync({ autoSyncOnOnline: false }), { wrapper: TestWrapper });

    expect(mockSyncService.syncWhenOnline).not.toHaveBeenCalled();
  });

  it('should call callbacks when provided', async () => {
    const onSyncStart = jest.fn();
    const onSyncComplete = jest.fn();
    const onSyncError = jest.fn();

    const { result } = renderHook(() => 
      useBackgroundSync({
        onSyncStart,
        onSyncComplete,
        onSyncError
      }), { wrapper: TestWrapper }
    );

    mockSyncService.syncWhenOnline.mockResolvedValue({
      processed: 1,
      successful: 1,
      failed: 0,
      conflicts: 0,
      results: []
    });

    mockSyncService.getSyncStats.mockResolvedValue({
      pending: 0,
      failed: 0,
      lastSync: new Date(),
      syncHealth: 'good'
    });

    await act(async () => {
      await result.current.triggerSync();
    });

    expect(onSyncStart).toHaveBeenCalled();
    expect(onSyncComplete).toHaveBeenCalledWith({
      processed: 1,
      successful: 1,
      failed: 0,
      conflicts: 0,
      results: []
    });
    expect(onSyncError).not.toHaveBeenCalled();
  });
});
