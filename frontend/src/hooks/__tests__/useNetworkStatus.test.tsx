import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNetworkStatus } from '../useNetworkStatus';

// Mock navigator.onLine
let mockOnline = true;
Object.defineProperty(navigator, 'onLine', {
  get: () => mockOnline,
  set: (value: boolean) => { mockOnline = value; },
  configurable: true
});

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    getRegistration: jest.fn().mockResolvedValue({
      sync: {
        register: jest.fn().mockResolvedValue(undefined),
        getTags: jest.fn().mockResolvedValue([])
      }
    })
  }
});

// Mock Network Information API
const mockConnection = {
  effectiveType: '4g',
  downlink: 10,
  rtt: 50,
  saveData: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: mockConnection
});

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnline = true;
  });

  it('should initialize with current online status', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
      expect(result.current.networkStatus.isOnline).toBe(true);
      expect(result.current.networkStatus.lastUpdated).toBeInstanceOf(Date);
    });
  });

  it('should initialize with offline status when navigator.onLine is false', async () => {
    mockOnline = false;
    
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
      expect(result.current.isOffline).toBe(true);
      expect(result.current.networkStatus.isOnline).toBe(false);
    });
  });

  it('should provide detailed network information when enabled', async () => {
    const { result } = renderHook(() => useNetworkStatus({ enableDetailedInfo: true }));

    await waitFor(() => {
      expect(result.current.networkStatus.effectiveType).toBe('4g');
      expect(result.current.networkStatus.downlink).toBe(10);
      expect(result.current.networkStatus.rtt).toBe(50);
      expect(result.current.networkStatus.saveData).toBe(false);
    });
  });

  it('should not provide detailed network information when disabled', async () => {
    const { result } = renderHook(() => useNetworkStatus({ enableDetailedInfo: false }));

    await waitFor(() => {
      expect(result.current.networkStatus.effectiveType).toBeUndefined();
      expect(result.current.networkStatus.downlink).toBeUndefined();
      expect(result.current.networkStatus.rtt).toBeUndefined();
    });
  });

  it('should handle online/offline event listeners', async () => {
    const onOnline = jest.fn();
    const onOffline = jest.fn();
    const onConnectionChange = jest.fn();

    const { result } = renderHook(() => 
      useNetworkStatus({ onOnline, onOffline, onConnectionChange })
    );

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });

    // Simulate going offline
    act(() => {
      mockOnline = false;
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
      expect(result.current.isOffline).toBe(true);
      expect(onOffline).toHaveBeenCalled();
      expect(onConnectionChange).toHaveBeenCalled();
    });

    // Simulate going online
    act(() => {
      mockOnline = true;
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
      expect(onOnline).toHaveBeenCalled();
    });
  });

  it('should provide sync status information', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.syncStatus.isSyncing).toBe(false);
      expect(result.current.syncStatus.lastSyncAttempt).toBeNull();
      expect(result.current.syncStatus.lastSuccessfulSync).toBeNull();
      expect(result.current.syncStatus.pendingItems).toBe(0);
      expect(result.current.syncStatus.failedItems).toBe(0);
      expect(result.current.syncStatus.syncError).toBeNull();
    });
  });

  it('should trigger sync when requested', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });

    // Trigger sync
    await act(async () => {
      await result.current.triggerSync();
    });

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.syncStatus.lastSyncAttempt).toBeInstanceOf(Date);
      expect(result.current.syncStatus.lastSuccessfulSync).toBeInstanceOf(Date);
    });
  });

  it('should provide connection quality utilities', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isConnectionFast()).toBe(true);
      expect(result.current.isConnectionSlow()).toBe(false);
      expect(result.current.getConnectionQuality()).toBe('fast');
    });
  });

  it('should detect slow connections', async () => {
    // Mock slow connection
    mockConnection.effectiveType = '2g';
    mockConnection.downlink = 0.5;

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isConnectionFast()).toBe(false);
      expect(result.current.isConnectionSlow()).toBe(true);
      expect(result.current.getConnectionQuality()).toBe('slow');
    });
  });

  it('should detect offline status correctly', async () => {
    mockOnline = false;
    
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.getConnectionQuality()).toBe('offline');
    });
  });

  it('should allow manual network status checks', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });

    // Change navigator.onLine and manually check
    act(() => {
      mockOnline = false;
      result.current.checkNetworkStatus();
    });

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
    });
  });

  it('should allow forcing offline/online mode for testing', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });

    // Force offline
    act(() => {
      result.current.forceOffline();
    });

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
    });

    // Force online
    act(() => {
      result.current.forceOnline();
    });

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });
  });

  it('should handle custom check intervals', async () => {
    jest.useFakeTimers();
    
    const onConnectionChange = jest.fn();
    const { result } = renderHook(() => 
      useNetworkStatus({ 
        checkInterval: 1000,
        onConnectionChange 
      })
    );

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });

    // Change network status to trigger callback
    act(() => {
      mockOnline = false;
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });

    // Fast-forward time to trigger periodic check
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Change network status back to trigger the callback again
    act(() => {
      mockOnline = true;
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(onConnectionChange).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    const { unmount } = renderHook(() => useNetworkStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });

  it('should handle service worker errors gracefully', async () => {
    // Mock service worker error
    (navigator.serviceWorker.getRegistration as jest.Mock).mockRejectedValueOnce(
      new Error('Service worker error')
    );

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
      // Should not crash and should still provide basic functionality
    });
  });

  it('should provide all required methods and properties', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.networkStatus).toBeDefined();
    expect(result.current.syncStatus).toBeDefined();
    expect(result.current.checkNetworkStatus).toBeDefined();
    expect(result.current.triggerSync).toBeDefined();
    expect(result.current.forceOffline).toBeDefined();
    expect(result.current.forceOnline).toBeDefined();
    expect(result.current.isConnectionSlow).toBeDefined();
    expect(result.current.isConnectionFast).toBeDefined();
    expect(result.current.getConnectionQuality).toBeDefined();
    expect(result.current.startPeriodicCheck).toBeDefined();
    expect(result.current.stopPeriodicCheck).toBeDefined();
  });
});
