import BackgroundSyncService, { SyncResult, SyncBatchResult, SyncProgress, ConflictResolution } from '../BackgroundSyncService';
import { SyncQueueStore } from '../../database/stores/syncQueueStore';
import { db } from '../../database/config';

// Mock the database and stores
jest.mock('../../database/config');
jest.mock('../../database/stores/syncQueueStore');

const mockDb = db as jest.Mocked<typeof db>;

// Mock the static methods properly
const mockSyncQueueStoreInstance = {
  getAll: jest.fn(),
  getPendingByPriority: jest.fn(),
  markSynced: jest.fn(),
  markFailed: jest.fn(),
  update: jest.fn(),
  getItemsNeedingRetry: jest.fn(),
  getStats: jest.fn(),
  getHealthStatus: jest.fn(),
  clearOldItems: jest.fn()
};

// Mock the static methods by replacing them directly
(SyncQueueStore as any).getAll = mockSyncQueueStoreInstance.getAll;
(SyncQueueStore as any).getPendingByPriority = mockSyncQueueStoreInstance.getPendingByPriority;
(SyncQueueStore as any).markSynced = mockSyncQueueStoreInstance.markSynced;
(SyncQueueStore as any).markFailed = mockSyncQueueStoreInstance.markFailed;
(SyncQueueStore as any).update = mockSyncQueueStoreInstance.update;
(SyncQueueStore as any).getItemsNeedingRetry = mockSyncQueueStoreInstance.getItemsNeedingRetry;
(SyncQueueStore as any).getStats = mockSyncQueueStoreInstance.getStats;
(SyncQueueStore as any).getHealthStatus = mockSyncQueueStoreInstance.getHealthStatus;
(SyncQueueStore as any).clearOldItems = mockSyncQueueStoreInstance.clearOldItems;

// Mock fetch globally
global.fetch = jest.fn();

describe('BackgroundSyncService', () => {
  let service: BackgroundSyncService;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = BackgroundSyncService.getInstance();
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BackgroundSyncService.getInstance();
      const instance2 = BackgroundSyncService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Progress and Status Updates', () => {
    it('should notify progress subscribers', () => {
      const progressCallback = jest.fn();
      const unsubscribe = service.onProgress(progressCallback);

      // Trigger progress update internally
      (service as any).updateProgress({ total: 10, processed: 5 });

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 10,
          processed: 5
        })
      );

      unsubscribe();
    });

    it('should notify status subscribers', () => {
      const statusCallback = jest.fn();
      const unsubscribe = service.onStatus(statusCallback);

      // Trigger status update internally
      (service as any).updateStatus('Starting sync...');

      expect(statusCallback).toHaveBeenCalledWith('Starting sync...');

      unsubscribe();
    });

    it('should return current progress', () => {
      // Reset progress state
      (service as any).syncProgress = {
        total: 0,
        processed: 0,
        current: null,
        status: 'idle'
      };
      
      const progress = service.getProgress();
      expect(progress).toEqual({
        total: 0,
        processed: 0,
        current: null,
        status: 'idle'
      });
    });

    it('should track syncing state', () => {
      expect(service.isCurrentlySyncing()).toBe(false);
    });
  });

  describe('syncWhenOnline', () => {
    beforeEach(() => {
      // Mock successful fetch responses
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ id: 1, success: true })
      } as any);
    });

    it('should process queued operations when network is restored', async () => {
      const mockQueueItems = [
        {
          id: 1,
          operation: 'create' as const,
          table: 'panels',
          data: { barcode: 'PANEL001', type: 'mono' },
          priority: 'high' as const,
          createdAt: new Date(),
          retryCount: 0
        },
        {
          id: 2,
          operation: 'update' as const,
          table: 'inspections',
          data: { id: 1, result: 'pass' },
          priority: 'medium' as const,
          createdAt: new Date(),
          retryCount: 0
        }
      ];

      mockSyncQueueStoreInstance.getAll.mockResolvedValue(mockQueueItems);
      mockSyncQueueStoreInstance.getPendingByPriority.mockResolvedValue({
        high: [mockQueueItems[0]],
        medium: [mockQueueItems[1]],
        low: []
      });
      mockSyncQueueStoreInstance.markSynced.mockResolvedValue(undefined);

      const result = await service.syncWhenOnline();

      expect(result).toEqual({
        processed: 2,
        successful: 2,
        failed: 0,
        conflicts: 0,
        results: expect.arrayContaining([
          expect.objectContaining({ success: true, itemId: 1 }),
          expect.objectContaining({ success: true, itemId: 2 })
        ])
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockSyncQueueStoreInstance.markSynced).toHaveBeenCalledTimes(2);
    });

    it('should return empty result when no items to sync', async () => {
      mockSyncQueueStoreInstance.getAll.mockResolvedValue([]);

      const result = await service.syncWhenOnline();

      expect(result).toEqual({
        processed: 0,
        successful: 0,
        failed: 0,
        conflicts: 0,
        results: []
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      const mockQueueItems = [
        {
          id: 1,
          operation: 'create' as const,
          table: 'panels',
          data: { barcode: 'PANEL001' },
          priority: 'high' as const,
          createdAt: new Date(),
          retryCount: 0
        }
      ];

      mockSyncQueueStoreInstance.getAll.mockResolvedValue(mockQueueItems);
      mockSyncQueueStoreInstance.getPendingByPriority.mockResolvedValue({
        high: mockQueueItems,
        medium: [],
        low: []
      });
      mockSyncQueueStoreInstance.markFailed.mockResolvedValue(undefined);

      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.syncWhenOnline();

      expect(result.failed).toBe(1);
      expect(result.successful).toBe(0);
      expect(mockSyncQueueStoreInstance.markFailed).toHaveBeenCalledWith(1, 'Network error');
    });

    it('should handle HTTP errors', async () => {
      const mockQueueItems = [
        {
          id: 1,
          operation: 'create' as const,
          table: 'panels',
          data: { barcode: 'PANEL001' },
          priority: 'high' as const,
          createdAt: new Date(),
          retryCount: 0
        }
      ];

      mockSyncQueueStoreInstance.getAll.mockResolvedValue(mockQueueItems);
      mockSyncQueueStoreInstance.getPendingByPriority.mockResolvedValue({
        high: mockQueueItems,
        medium: [],
        low: []
      });
      mockSyncQueueStoreInstance.markFailed.mockResolvedValue(undefined);

      // Mock HTTP error
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as any);

      const result = await service.syncWhenOnline();

      expect(result.failed).toBe(1);
      expect(mockSyncQueueStoreInstance.markFailed).toHaveBeenCalledWith(1, 'Server error: HTTP 500: Internal Server Error');
    });

    it('should prevent concurrent sync operations', async () => {
      // Start first sync
      mockSyncQueueStoreInstance.getAll.mockResolvedValue([]);
      const firstSync = service.syncWhenOnline();

      // Try to start second sync
      await expect(service.syncWhenOnline()).rejects.toThrow('Sync already in progress');

      // Wait for first sync to complete
      await firstSync;
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect and handle conflicts', async () => {
      const mockQueueItems = [
        {
          id: 1,
          operation: 'update' as const,
          table: 'panels',
          data: { id: 1, barcode: 'PANEL001' },
          priority: 'high' as const,
          createdAt: new Date(),
          retryCount: 0
        }
      ];

      mockSyncQueueStoreInstance.getAll.mockResolvedValue(mockQueueItems);
      mockSyncQueueStoreInstance.getPendingByPriority.mockResolvedValue({
        high: mockQueueItems,
        medium: [],
        low: []
      });

      // Mock conflict response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: jest.fn().mockResolvedValue({
          id: 1,
          barcode: 'PANEL001',
          version: 2,
          updatedAt: new Date().toISOString()
        })
      } as any);

      // Mock local data
      mockDb.panels.get = jest.fn().mockResolvedValue({
        id: 1,
        barcode: 'PANEL001',
        version: 1,
        updatedAt: new Date(Date.now() - 1000).toISOString()
      });

      mockSyncQueueStoreInstance.markSynced.mockResolvedValue(undefined);

      const result = await service.syncWhenOnline();

      expect(result.conflicts).toBe(1);
      expect(result.failed).toBe(0); // Should be resolved automatically
    });

    it('should resolve version conflicts by preferring newer version', async () => {
      const conflict = {
        localData: { version: 1, updatedAt: '2023-01-01T00:00:00Z' },
        remoteData: { version: 2, updatedAt: '2023-01-02T00:00:00Z' },
        conflictType: 'version' as const,
        resolution: 'manual' as const
      };

      const item = {
        id: 1,
        operation: 'update' as const,
        table: 'panels',
        data: { id: 1 },
        priority: 'high' as const,
        createdAt: new Date(),
        retryCount: 0
      };

      const resolution = await (service as any).resolveConflict(conflict, item);

      expect(resolution.strategy).toBe('remote');
      expect(resolution.resolvedData).toEqual(conflict.remoteData);
    });

    it('should resolve deletion conflicts by preferring remote', async () => {
      const conflict = {
        localData: { id: 1, barcode: 'PANEL001' },
        remoteData: null as any,
        conflictType: 'deletion' as const,
        resolution: 'manual' as const
      };

      const item = {
        id: 1,
        operation: 'delete' as const,
        table: 'panels',
        data: { id: 1 },
        priority: 'high' as const,
        createdAt: new Date(),
        retryCount: 0
      };

      const resolution = await (service as any).resolveConflict(conflict, item);

      expect(resolution.strategy).toBe('remote');
    });
  });

  describe('API Endpoint Mapping', () => {
    it('should map table names to correct endpoints', () => {
      const getEndpoint = (service as any).getEndpointForTable;

      expect(getEndpoint('panels')).toBe('/api/panels');
      expect(getEndpoint('inspections')).toBe('/api/inspections');
      expect(getEndpoint('manufacturing_orders')).toBe('/api/manufacturing-orders');
      expect(getEndpoint('manufacturingorders')).toBe('/api/manufacturing-orders');
      expect(getEndpoint('stations')).toBe('/api/stations');
      expect(getEndpoint('unknown')).toBeNull();
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed items', async () => {
      const failedItems = [
        {
          id: 1,
          operation: 'create' as const,
          table: 'panels',
          data: { barcode: 'PANEL001' },
          priority: 'high' as const,
          createdAt: new Date(),
          retryCount: 1
        }
      ];

      mockSyncQueueStoreInstance.getItemsNeedingRetry.mockResolvedValue(failedItems);
      mockSyncQueueStoreInstance.update.mockResolvedValue(undefined);

      // Mock successful retry
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ id: 1, success: true })
      } as any);

      const result = await service.retryFailedItems();

      expect(mockSyncQueueStoreInstance.update).toHaveBeenCalledWith(1, { retryCount: 0 });
      expect(result.processed).toBeGreaterThan(0);
    });
  });

  describe('Sync Statistics', () => {
    it('should return sync statistics', async () => {
      const mockStats = {
        pendingCount: 5,
        retryCount: 2
      };

      const mockHealth = {
        isHealthy: true
      };

      mockSyncQueueStoreInstance.getStats.mockResolvedValue(mockStats);
      mockSyncQueueStoreInstance.getHealthStatus.mockResolvedValue(mockHealth);

      const stats = await service.getSyncStats();

      expect(stats).toEqual({
        pending: 5,
        failed: 2,
        lastSync: null,
        syncHealth: 'good'
      });
    });

    it('should determine sync health correctly', async () => {
      const mockStats = {
        total: 100,
        pendingCount: 100,
        retryCount: 60,
        averageRetries: 3.0
      };

      const mockHealth = {
        isHealthy: false,
        issues: ['High retry count', 'Many pending items']
      };

      mockSyncQueueStoreInstance.getStats.mockResolvedValue(mockStats);
      mockSyncQueueStoreInstance.getHealthStatus.mockResolvedValue(mockHealth);

      const stats = await service.getSyncStats();

      expect(stats.syncHealth).toBe('critical');
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup old items', async () => {
      mockSyncQueueStoreInstance.clearOldItems.mockResolvedValue(10);

      const count = await service.cleanupOldItems(7);

      expect(count).toBe(10);
      expect(mockSyncQueueStoreInstance.clearOldItems).toHaveBeenCalledWith(7);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown table errors', async () => {
      const mockQueueItems = [
        {
          id: 1,
          operation: 'create' as const,
          table: 'unknown_table',
          data: { test: 'data' },
          priority: 'high' as const,
          createdAt: new Date(),
          retryCount: 0
        }
      ];

      mockSyncQueueStoreInstance.getAll.mockResolvedValue(mockQueueItems);
      mockSyncQueueStoreInstance.getPendingByPriority.mockResolvedValue({
        high: mockQueueItems,
        medium: [],
        low: []
      });
      mockSyncQueueStoreInstance.markFailed.mockResolvedValue(undefined);

      const result = await service.syncWhenOnline();

      expect(result.failed).toBe(1);
      expect(mockSyncQueueStoreInstance.markFailed).toHaveBeenCalledWith(1, 'Unknown table: unknown_table');
    });

    it('should handle unknown operation errors', async () => {
      const mockQueueItems = [
        {
          id: 1,
          operation: 'unknown' as any,
          table: 'panels',
          data: { test: 'data' },
          priority: 'high' as const,
          createdAt: new Date(),
          retryCount: 0
        }
      ];

      mockSyncQueueStoreInstance.getAll.mockResolvedValue(mockQueueItems);
      mockSyncQueueStoreInstance.getPendingByPriority.mockResolvedValue({
        high: mockQueueItems,
        medium: [],
        low: []
      });
      mockSyncQueueStoreInstance.markFailed.mockResolvedValue(undefined);

      const result = await service.syncWhenOnline();

      expect(result.failed).toBe(1);
      expect(mockSyncQueueStoreInstance.markFailed).toHaveBeenCalledWith(1, 'Unknown operation: unknown');
    });
  });
});
