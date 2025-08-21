import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineStorage } from '../useOfflineStorage';

// Mock the database stores
jest.mock('../../database/stores/panelStore', () => ({
  getAll: jest.fn(),
  getById: jest.fn(),
  getByBarcode: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  delete: jest.fn(),
  search: jest.fn(),
  getStats: jest.fn()
}));

jest.mock('../../database/stores/inspectionStore', () => ({
  getAll: jest.fn(),
  getById: jest.fn(),
  getByPanelId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  delete: jest.fn(),
  getStats: jest.fn()
}));

jest.mock('../../database/stores/syncQueueStore', () => ({
  getAll: jest.fn(),
  enqueue: jest.fn(),
  markSynced: jest.fn(),
  markFailed: jest.fn(),
  getStats: jest.fn(),
  processBatch: jest.fn()
}));

// Mock the database
jest.mock('../../database/config', () => ({
  db: {
    panels: {
      clear: jest.fn(),
      bulkAdd: jest.fn(),
      toArray: jest.fn(),
      count: jest.fn()
    },
    inspections: {
      clear: jest.fn(),
      bulkAdd: jest.fn(),
      toArray: jest.fn(),
      count: jest.fn()
    },
    syncQueue: {
      clear: jest.fn(),
      bulkAdd: jest.fn(),
      toArray: jest.fn(),
      count: jest.fn()
    },
    transaction: jest.fn()
  }
}));

// Import the mocked modules
import PanelStore from '../../database/stores/panelStore';
import InspectionStore from '../../database/stores/inspectionStore';
import SyncQueueStore from '../../database/stores/syncQueueStore';
import { db } from '../../database/config';

describe('useOfflineStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful database operations
    (db.transaction as jest.Mock).mockImplementation((mode, tables, callback) => {
      if (callback) {
        return callback();
      }
      return Promise.resolve();
    });

    // Mock default empty responses
    (PanelStore.getAll as jest.Mock).mockResolvedValue([]);
    (InspectionStore.getAll as jest.Mock).mockResolvedValue([]);
    (SyncQueueStore.getAll as jest.Mock).mockResolvedValue([]);
    
    // Mock count methods
    (db.panels.count as jest.Mock).mockResolvedValue(0);
    (db.inspections.count as jest.Mock).mockResolvedValue(0);
    (db.syncQueue.count as jest.Mock).mockResolvedValue(0);
  });

  it('should initialize with empty state', async () => {
    const { result } = renderHook(() => useOfflineStorage());

    // Wait for the initial data loading to complete
    await waitFor(() => {
      expect(result.current.loadingState.isLoading).toBe(false);
    });

    expect(result.current.panels).toEqual([]);
    expect(result.current.inspections).toEqual([]);
    expect(result.current.syncQueue).toEqual([]);
    expect(result.current.loadingState.isError).toBe(false);
    expect(result.current.loadingState.error).toBeNull();
  });

  it('should have all required operations', () => {
    const { result } = renderHook(() => useOfflineStorage());

    expect(result.current.panelOperations).toBeDefined();
    expect(result.current.inspectionOperations).toBeDefined();
    expect(result.current.syncQueueOperations).toBeDefined();
    expect(result.current.databaseOperations).toBeDefined();
    expect(result.current.refreshAllData).toBeDefined();
    expect(result.current.setLoading).toBeDefined();
  });

  it('should handle panel operations', async () => {
    const mockPanels = [
      {
        id: 1,
        barcode: 'TEST001',
        type: 'Type A',
        specifications: {},
        status: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const { result } = renderHook(() => useOfflineStorage());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loadingState.isLoading).toBe(false);
    });

    // Mock the panel store methods
    (PanelStore.getAll as jest.Mock).mockResolvedValue(mockPanels);
    (PanelStore.getById as jest.Mock).mockResolvedValue(mockPanels[0]);
    (PanelStore.create as jest.Mock).mockResolvedValue(1);

    // Test get all panels
    await act(async () => {
      const panels = await result.current.panelOperations.getAll();
      expect(panels).toEqual(mockPanels);
    });

    // Test get panel by ID
    await act(async () => {
      const panel = await result.current.panelOperations.getById(1);
      expect(panel).toEqual(mockPanels[0]);
    });

    // Test create panel
    await act(async () => {
      const id = await result.current.panelOperations.create({
        barcode: 'TEST002',
        type: 'Type B',
        specifications: {},
        status: 'pending'
      });
      expect(id).toBe(1);
    });
  });

  it('should handle inspection operations', async () => {
    const mockInspections = [
      {
        id: 1,
        panelId: 1,
        station: 'Station A',
        results: {},
        timestamp: new Date(),
        operator: 'Operator 1',
        status: 'pass' as const
      }
    ];

    const { result } = renderHook(() => useOfflineStorage());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loadingState.isLoading).toBe(false);
    });

    // Mock the inspection store methods
    (InspectionStore.getAll as jest.Mock).mockResolvedValue(mockInspections);
    (InspectionStore.getById as jest.Mock).mockResolvedValue(mockInspections[0]);
    (InspectionStore.create as jest.Mock).mockResolvedValue(1);

    // Test get all inspections
    await act(async () => {
      const inspections = await result.current.inspectionOperations.getAll();
      expect(inspections).toEqual(mockInspections);
    });

    // Test get inspection by ID
    await act(async () => {
      const inspection = await result.current.inspectionOperations.getById(1);
      expect(inspection).toEqual(mockInspections[0]);
    });

    // Test create inspection
    await act(async () => {
      const id = await result.current.inspectionOperations.create({
        panelId: 1,
        station: 'Station B',
        results: {},
        timestamp: new Date(),
        operator: 'Operator 2',
        status: 'pass'
      });
      expect(id).toBe(1);
    });
  });

  it('should handle sync queue operations', async () => {
    const mockSyncQueue = [
      {
        id: 1,
        operation: 'create' as const,
        table: 'panels',
        data: {},
        priority: 'high' as const,
        createdAt: new Date(),
        retryCount: 0
      }
    ];

    const { result } = renderHook(() => useOfflineStorage());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loadingState.isLoading).toBe(false);
    });

    // Mock the sync queue store methods
    (SyncQueueStore.getAll as jest.Mock).mockResolvedValue(mockSyncQueue);
    (SyncQueueStore.enqueue as jest.Mock).mockResolvedValue(1);

    // Test get all sync queue items
    await act(async () => {
      const syncQueue = await result.current.syncQueueOperations.getAll();
      expect(syncQueue).toEqual(mockSyncQueue);
    });

    // Test enqueue item
    await act(async () => {
      const id = await result.current.syncQueueOperations.enqueue({
        operation: 'create',
        table: 'panels',
        data: {},
        priority: 'high'
      });
      expect(id).toBe(1);
    });
  });

  it('should handle database operations', async () => {
    const { result } = renderHook(() => useOfflineStorage());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loadingState.isLoading).toBe(false);
    });

    // Mock database info
    const mockInfo = {
      panels: 10,
      inspections: 20,
      syncQueue: 5,
      totalSize: 35
    };

    // Mock the count methods
    (db.panels.count as jest.Mock).mockResolvedValue(10);
    (db.inspections.count as jest.Mock).mockResolvedValue(20);
    (db.syncQueue.count as jest.Mock).mockResolvedValue(5);

    // Test get database info
    await act(async () => {
      const info = await result.current.databaseOperations.getDatabaseInfo();
      expect(info).toEqual(mockInfo);
    });
  });

  it('should handle errors gracefully', async () => {
    const { result } = renderHook(() => useOfflineStorage());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loadingState.isLoading).toBe(false);
    });

    // Mock an error
    (PanelStore.getAll as jest.Mock).mockRejectedValue(new Error('Database error'));

    // Test error handling
    await act(async () => {
      const panels = await result.current.panelOperations.getAll();
      expect(panels).toEqual([]);
    });

    await waitFor(() => {
      expect(result.current.loadingState.isError).toBe(true);
      expect(result.current.loadingState.error).toBeInstanceOf(Error);
    });
  });

  it('should support custom options', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => 
      useOfflineStorage({
        autoRefresh: false,
        refreshInterval: 60000,
        onError
      })
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loadingState.isLoading).toBe(false);
    });

    expect(result.current.panels).toEqual([]);
    expect(result.current.inspections).toEqual([]);
    expect(result.current.syncQueue).toEqual([]);
  });
});
