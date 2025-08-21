import BackgroundSyncService from '../BackgroundSyncService';
import { SyncQueueStore } from '../../database/stores/syncQueueStore';
import { db } from '../../database/config';

// Mock the database and stores
jest.mock('../../database/config');
jest.mock('../../database/stores/syncQueueStore');

const mockDb = db as jest.Mocked<typeof db>;
const mockSyncQueueStore = SyncQueueStore as jest.MockedClass<typeof SyncQueueStore>;

// Mock fetch globally
global.fetch = jest.fn();

describe('BackgroundSyncService Integration', () => {
  let service: BackgroundSyncService;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = BackgroundSyncService.getInstance();
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
  });

  describe('Complete Sync Flow', () => {
    it('should handle a complete sync cycle with mixed operations', async () => {
      // Setup mock data
      const mockQueueItems = [
        {
          id: 1,
          operation: 'create' as const,
          table: 'panels',
          data: { barcode: 'PANEL001', type: 'mono', status: 'manufacturing' },
          priority: 'high' as const,
          createdAt: new Date(),
          retryCount: 0
        },
        {
          id: 2,
          operation: 'update' as const,
          table: 'inspections',
          data: { id: 1, result: 'pass', operator: 'john_doe' },
          priority: 'medium' as const,
          createdAt: new Date(),
          retryCount: 0
        },
        {
          id: 3,
          operation: 'delete' as const,
          table: 'manufacturing_orders',
          data: { id: 5 },
          priority: 'low' as const,
          createdAt: new Date(),
          retryCount: 0
        }
      ];

      // Mock successful API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: jest.fn().mockResolvedValue({ id: 1, barcode: 'PANEL001', success: true })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ id: 1, result: 'pass', success: true })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
          json: jest.fn().mockResolvedValue({ success: true })
        } as any);

      // Mock database operations
      mockSyncQueueStore.getAll.mockResolvedValue(mockQueueItems);
      mockSyncQueueStore.getPendingByPriority.mockResolvedValue({
        high: [mockQueueItems[0]],
        medium: [mockQueueItems[1]],
        low: [mockQueueItems[2]]
      });
      mockSyncQueueStore.markSynced.mockResolvedValue();

      // Track progress updates
      const progressUpdates: any[] = [];
      const statusUpdates: string[] = [];
      
      service.onProgress((progress) => progressUpdates.push(progress));
      service.onStatus((status) => statusUpdates.push(status));

      // Execute sync
      const result = await service.syncWhenOnline();

      // Verify results
      expect(result).toEqual({
        processed: 3,
        successful: 3,
        failed: 0,
        conflicts: 0,
        results: expect.arrayContaining([
          expect.objectContaining({ success: true, itemId: 1 }),
          expect.objectContaining({ success: true, itemId: 2 }),
          expect.objectContaining({ success: true, itemId: 3 })
        ])
      });

      // Verify API calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/panels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockQueueItems[0].data)
      });
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/inspections/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockQueueItems[1].data)
      });
      expect(mockFetch).toHaveBeenNthCalledWith(3, '/api/manufacturing-orders/5', {
        method: 'DELETE'
      });

      // Verify progress updates
      expect(progressUpdates).toHaveLength(3);
      expect(progressUpdates[0]).toEqual(expect.objectContaining({
        total: 3,
        processed: 1,
        status: 'syncing'
      }));
      expect(progressUpdates[2]).toEqual(expect.objectContaining({
        total: 3,
        processed: 3,
        status: 'completed'
      }));

      // Verify status updates
      expect(statusUpdates).toContain('Starting background sync...');
      expect(statusUpdates).toContain('Processing 3 queued operations...');
      expect(statusUpdates).toContain('Syncing create operation for panels...');
      expect(statusUpdates).toContain('Syncing update operation for inspections...');
      expect(statusUpdates).toContain('Syncing delete operation for manufacturing_orders...');
      expect(statusUpdates).toContain('Sync completed: 3 successful, 0 failed, 0 conflicts');
    });

    it('should handle sync with conflicts and resolve them automatically', async () => {
      const mockQueueItems = [
        {
          id: 1,
          operation: 'update' as const,
          table: 'panels',
          data: { id: 1, barcode: 'PANEL001', status: 'completed' },
          priority: 'high' as const,
          createdAt: new Date(),
          retryCount: 0
        }
      ];

      // Mock conflict response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: jest.fn().mockResolvedValue({
          id: 1,
          barcode: 'PANEL001',
          status: 'completed',
          version: 2,
          updatedAt: new Date().toISOString()
        })
      } as any);

      // Mock local data
      mockDb.panels.get.mockResolvedValue({
        id: 1,
        barcode: 'PANEL001',
        status: 'manufacturing',
        version: 1,
        updatedAt: new Date(Date.now() - 1000).toISOString()
      });

      mockSyncQueueStore.getAll.mockResolvedValue(mockQueueItems);
      mockSyncQueueStore.getPendingByPriority.mockResolvedValue({
        high: mockQueueItems,
        medium: [],
        low: []
      });
      mockSyncQueueStore.markSynced.mockResolvedValue();

      const result = await service.syncWhenOnline();

      expect(result.conflicts).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle sync with network errors and retry logic', async () => {
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

      // Mock network error first, then success
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: jest.fn().mockResolvedValue({ id: 1, success: true })
        } as any);

      mockSyncQueueStore.getAll.mockResolvedValue(mockQueueItems);
      mockSyncQueueStore.getPendingByPriority.mockResolvedValue({
        high: mockQueueItems,
        medium: [],
        low: []
      });
      mockSyncQueueStore.markFailed.mockResolvedValue();
      mockSyncQueueStore.markSynced.mockResolvedValue();

      const result = await service.syncWhenOnline();

      expect(result.failed).toBe(1);
      expect(result.successful).toBe(0);
      expect(mockSyncQueueStore.markFailed).toHaveBeenCalledWith(1, expect.stringContaining('Network connectivity issue'));
    });

    it('should handle sync with server errors and categorize them correctly', async () => {
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

      // Mock server error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as any);

      mockSyncQueueStore.getAll.mockResolvedValue(mockQueueItems);
      mockSyncQueueStore.getPendingByPriority.mockResolvedValue({
        high: mockQueueItems,
        medium: [],
        low: []
      });
      mockSyncQueueStore.markFailed.mockResolvedValue();

      const result = await service.syncWhenOnline();

      expect(result.failed).toBe(1);
      expect(mockSyncQueueStore.markFailed).toHaveBeenCalledWith(1, 'Server error: HTTP 500: Internal Server Error');
    });

    it('should handle sync with client errors and not retry', async () => {
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

      // Mock client error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      } as any);

      mockSyncQueueStore.getAll.mockResolvedValue(mockQueueItems);
      mockSyncQueueStore.getPendingByPriority.mockResolvedValue({
        high: mockQueueItems,
        medium: [],
        low: []
      });
      mockSyncQueueStore.markFailed.mockResolvedValue();

      const result = await service.syncWhenOnline();

      expect(result.failed).toBe(1);
      expect(mockSyncQueueStore.markFailed).toHaveBeenCalledWith(1, 'Client error: HTTP 400: Bad Request');
    });
  });

  describe('Conflict Resolution Integration', () => {
    it('should merge panel data correctly', async () => {
      const mockQueueItems = [
        {
          id: 1,
          operation: 'update' as const,
          table: 'panels',
          data: { id: 1, barcode: 'PANEL001', status: 'manufacturing' },
          priority: 'high' as const,
          createdAt: new Date(),
          retryCount: 0
        }
      ];

      // Mock conflict response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: jest.fn().mockResolvedValue({
          id: 1,
          barcode: 'PANEL001',
          status: 'completed',
          efficiency: 95.5,
          version: 2
        })
      } as any);

      // Mock local data
      mockDb.panels.get.mockResolvedValue({
        id: 1,
        barcode: 'PANEL001',
        status: 'manufacturing',
        type: 'mono',
        version: 1
      });

      mockSyncQueueStore.getAll.mockResolvedValue(mockQueueItems);
      mockSyncQueueStore.getPendingByPriority.mockResolvedValue({
        high: mockQueueItems,
        medium: [],
        low: []
      });
      mockSyncQueueStore.markSynced.mockResolvedValue();

      const result = await service.syncWhenOnline();

      expect(result.conflicts).toBe(1);
      expect(result.successful).toBe(1);
    });

    it('should handle inspection conflicts conservatively', async () => {
      const mockQueueItems = [
        {
          id: 1,
          operation: 'update' as const,
          table: 'inspections',
          data: { id: 1, result: 'pass', operator: 'john_doe' },
          priority: 'high' as const,
          createdAt: new Date(),
          retryCount: 0
        }
      ];

      // Mock conflict with different results
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: jest.fn().mockResolvedValue({
          id: 1,
          result: 'fail',
          operator: 'jane_doe',
          version: 2,
          updatedAt: new Date().toISOString()
        })
      } as any);

      // Mock local data
      mockDb.inspections.get.mockResolvedValue({
        id: 1,
        result: 'pass',
        operator: 'john_doe',
        version: 1,
        updatedAt: new Date(Date.now() - 1000).toISOString()
      });

      mockSyncQueueStore.getAll.mockResolvedValue(mockQueueItems);
      mockSyncQueueStore.getPendingByPriority.mockResolvedValue({
        high: mockQueueItems,
        medium: [],
        low: []
      });
      mockSyncQueueStore.markSynced.mockResolvedValue();

      const result = await service.syncWhenOnline();

      expect(result.conflicts).toBe(1);
      // Should prefer the more recent result (remote in this case)
      expect(result.successful).toBe(1);
    });
  });

  describe('Error Recovery Integration', () => {
    it('should retry failed items successfully', async () => {
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

      // Mock successful retry
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({ id: 1, success: true })
      } as any);

      mockSyncQueueStore.getItemsNeedingRetry.mockResolvedValue(failedItems);
      mockSyncQueueStore.update.mockResolvedValue();
      mockSyncQueueStore.getAll.mockResolvedValue(failedItems);
      mockSyncQueueStore.getPendingByPriority.mockResolvedValue({
        high: failedItems,
        medium: [],
        low: []
      });
      mockSyncQueueStore.markSynced.mockResolvedValue();

      const result = await service.retryFailedItems();

      expect(result.processed).toBe(1);
      expect(result.successful).toBe(1);
      expect(mockSyncQueueStore.update).toHaveBeenCalledWith(1, { retryCount: 0 });
    });

    it('should handle cleanup operations', async () => {
      mockSyncQueueStore.clearOldItems.mockResolvedValue(5);

      const count = await service.cleanupOldItems(7);

      expect(count).toBe(5);
      expect(mockSyncQueueStore.clearOldItems).toHaveBeenCalledWith(7);
    });

    it('should provide accurate sync statistics', async () => {
      const mockStats = {
        total: 10,
        byOperation: { create: 5, update: 3, delete: 2 },
        byTable: { panels: 6, inspections: 4 },
        byPriority: { high: 3, medium: 4, low: 3 },
        pendingCount: 10,
        retryCount: 2
      };

      const mockHealth = {
        isHealthy: false,
        issues: ['Many pending items'],
        recommendations: ['Check network connectivity']
      };

      mockSyncQueueStore.getStats.mockResolvedValue(mockStats);
      mockSyncQueueStore.getHealthStatus.mockResolvedValue(mockHealth);

      const stats = await service.getSyncStats();

      expect(stats).toEqual({
        pending: 10,
        failed: 2,
        lastSync: null,
        syncHealth: 'critical'
      });
    });
  });

  describe('Performance and Concurrency', () => {
    it('should prevent concurrent sync operations', async () => {
      mockSyncQueueStore.getAll.mockResolvedValue([]);

      // Start first sync
      const firstSync = service.syncWhenOnline();

      // Try to start second sync immediately
      await expect(service.syncWhenOnline()).rejects.toThrow('Sync already in progress');

      // Wait for first sync to complete
      await firstSync;
    });

    it('should process items in priority order', async () => {
      const mockQueueItems = [
        {
          id: 1,
          operation: 'create' as const,
          table: 'panels',
          data: { barcode: 'PANEL001' },
          priority: 'low' as const,
          createdAt: new Date(),
          retryCount: 0
        },
        {
          id: 2,
          operation: 'update' as const,
          table: 'inspections',
          data: { id: 1, result: 'pass' },
          priority: 'high' as const,
          createdAt: new Date(),
          retryCount: 0
        }
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ id: 1, success: true })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: jest.fn().mockResolvedValue({ id: 2, success: true })
        } as any);

      mockSyncQueueStore.getAll.mockResolvedValue(mockQueueItems);
      mockSyncQueueStore.getPendingByPriority.mockResolvedValue({
        high: [mockQueueItems[1]],
        medium: [],
        low: [mockQueueItems[0]]
      });
      mockSyncQueueStore.markSynced.mockResolvedValue();

      await service.syncWhenOnline();

      // Verify high priority item was processed first
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/inspections/1', expect.any(Object));
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/panels', expect.any(Object));
    });
  });
});
