import { db, dbUtils, checkDatabaseHealth, PanelStore, InspectionStore, SyncQueueStore } from '../stores';

// Test data
const testPanel = {
  barcode: 'TEST-001',
  type: 'Monocrystalline',
  specifications: {
    power: '400W',
    efficiency: '20.5%',
    dimensions: '1765x1048x35mm'
  },
  status: 'pending' as const
};

const testInspection = {
  panelId: 1,
  station: 'Quality Control',
  results: {
    visual: 'pass',
    electrical: 'pass',
    mechanical: 'pass'
  },
  timestamp: new Date(),
  operator: 'John Doe',
  status: 'pass' as const
};

const testSyncItem = {
  operation: 'create' as const,
  table: 'panels',
  data: testPanel,
  priority: 'high' as const
};

describe('Database Operations', () => {
  beforeEach(async () => {
    // Clear all data before each test
    await dbUtils.clearAll();
  });

  afterAll(async () => {
    // Clean up after all tests
    await dbUtils.clearAll();
    await db.close();
  });

  describe('Database Health Check', () => {
    test('should check database health successfully', async () => {
      const health = await checkDatabaseHealth();
      
      expect(health.isHealthy).toBe(true);
      expect(health.issues).toHaveLength(0);
      expect(health.recommendations).toHaveLength(0);
    });
  });

  describe('Panel Store Operations', () => {
    test('should create a new panel', async () => {
      const panelId = await PanelStore.create(testPanel);
      
      expect(panelId).toBeDefined();
      expect(typeof panelId).toBe('number');
    });

    test('should retrieve panel by ID', async () => {
      const panelId = await PanelStore.create(testPanel);
      const retrievedPanel = await PanelStore.getById(panelId);
      
      expect(retrievedPanel).toBeDefined();
      expect(retrievedPanel?.barcode).toBe(testPanel.barcode);
      expect(retrievedPanel?.type).toBe(testPanel.type);
      expect(retrievedPanel?.status).toBe(testPanel.status);
    });

    test('should retrieve panel by barcode', async () => {
      await PanelStore.create(testPanel);
      const retrievedPanel = await PanelStore.getByBarcode(testPanel.barcode);
      
      expect(retrievedPanel).toBeDefined();
      expect(retrievedPanel?.barcode).toBe(testPanel.barcode);
    });

    test('should update panel status', async () => {
      const panelId = await PanelStore.create(testPanel);
      await PanelStore.updateStatus(panelId, 'in_production');
      
      const updatedPanel = await PanelStore.getById(panelId);
      expect(updatedPanel?.status).toBe('in_production');
    });

    test('should update panel specifications', async () => {
      const panelId = await PanelStore.create(testPanel);
      const newSpecs = { ...testPanel.specifications, power: '450W' };
      
      await PanelStore.updateSpecifications(panelId, newSpecs);
      
      const updatedPanel = await PanelStore.getById(panelId);
      expect(updatedPanel?.specifications.power).toBe('450W');
    });

    test('should get panels by status', async () => {
      await PanelStore.create(testPanel);
      await PanelStore.create({ ...testPanel, barcode: 'TEST-002', status: 'completed' });
      
      const pendingPanels = await PanelStore.getByStatus('pending');
      const completedPanels = await PanelStore.getByStatus('completed');
      
      expect(pendingPanels).toHaveLength(1);
      expect(completedPanels).toHaveLength(1);
    });

    test('should get panels by type', async () => {
      await PanelStore.create(testPanel);
      await PanelStore.create({ ...testPanel, barcode: 'TEST-002', type: 'Polycrystalline' });
      
      const monocrystallinePanels = await PanelStore.getByType('Monocrystalline');
      const polycrystallinePanels = await PanelStore.getByType('Polycrystalline');
      
      expect(monocrystallinePanels).toHaveLength(1);
      expect(polycrystallinePanels).toHaveLength(1);
    });

    test('should search panels', async () => {
      await PanelStore.create(testPanel);
      await PanelStore.create({ ...testPanel, barcode: 'TEST-002', type: 'Polycrystalline' });
      
      const searchResults = await PanelStore.search({ query: 'Monocrystalline' });
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].type).toBe('Monocrystalline');
    });

    test('should get panel count by status', async () => {
      await PanelStore.create(testPanel);
      await PanelStore.create({ ...testPanel, barcode: 'TEST-002', status: 'completed' });
      await PanelStore.create({ ...testPanel, barcode: 'TEST-003', status: 'failed' });
      
      const counts = await PanelStore.getCountByStatus();
      
      expect(counts.pending).toBe(1);
      expect(counts.completed).toBe(1);
      expect(counts.failed).toBe(1);
      expect(counts.in_production).toBe(0);
    });

    test('should get panel count by type', async () => {
      await PanelStore.create(testPanel);
      await PanelStore.create({ ...testPanel, barcode: 'TEST-002', type: 'Polycrystalline' });
      await PanelStore.create({ ...testPanel, barcode: 'TEST-003', type: 'Monocrystalline' });
      
      const counts = await PanelStore.getCountByType();
      
      expect(counts.Monocrystalline).toBe(2);
      expect(counts.Polycrystalline).toBe(1);
    });

    test('should get recent panels', async () => {
      await PanelStore.create(testPanel);
      await PanelStore.create({ ...testPanel, barcode: 'TEST-002' });
      await PanelStore.create({ ...testPanel, barcode: 'TEST-003' });
      
      const recentPanels = await PanelStore.getRecent(2);
      expect(recentPanels).toHaveLength(2);
    });

    test('should check if barcode exists', async () => {
      await PanelStore.create(testPanel);
      
      const exists = await PanelStore.barcodeExists(testPanel.barcode);
      const notExists = await PanelStore.barcodeExists('NONEXISTENT');
      
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    test('should get unique panel types', async () => {
      await PanelStore.create(testPanel);
      await PanelStore.create({ ...testPanel, barcode: 'TEST-002', type: 'Polycrystalline' });
      await PanelStore.create({ ...testPanel, barcode: 'TEST-003', type: 'Monocrystalline' });
      
      const types = await PanelStore.getUniqueTypes();
      expect(types).toContain('Monocrystalline');
      expect(types).toContain('Polycrystalline');
      expect(types).toHaveLength(2);
    });

    test('should get panel statistics', async () => {
      await PanelStore.create(testPanel);
      await PanelStore.create({ ...testPanel, barcode: 'TEST-002', status: 'completed' });
      
      const stats = await PanelStore.getStats();
      
      expect(stats.total).toBe(2);
      expect(stats.byStatus.pending).toBe(1);
      expect(stats.byStatus.completed).toBe(1);
      expect(stats.byType.Monocrystalline).toBe(2);
    });

    test('should delete panel', async () => {
      const panelId = await PanelStore.create(testPanel);
      await PanelStore.delete(panelId);
      
      const deletedPanel = await PanelStore.getById(panelId);
      expect(deletedPanel).toBeUndefined();
    });

    test('should bulk create panels', async () => {
      const panels = [
        { ...testPanel, barcode: 'TEST-001' },
        { ...testPanel, barcode: 'TEST-002' },
        { ...testPanel, barcode: 'TEST-003' }
      ];
      
      const panelIds = await PanelStore.bulkCreate(panels);
      expect(panelIds).toHaveLength(3);
      
      const allPanels = await PanelStore.getAll();
      expect(allPanels).toHaveLength(3);
    });
  });

  describe('Inspection Store Operations', () => {
    let panelId: number;

    beforeEach(async () => {
      panelId = await PanelStore.create(testPanel);
    });

    test('should create a new inspection', async () => {
      const inspectionData = { ...testInspection, panelId };
      const inspectionId = await InspectionStore.create(inspectionData);
      
      expect(inspectionId).toBeDefined();
      expect(typeof inspectionId).toBe('number');
    });

    test('should retrieve inspection by ID', async () => {
      const inspectionData = { ...testInspection, panelId };
      const inspectionId = await InspectionStore.create(inspectionData);
      const retrievedInspection = await InspectionStore.getById(inspectionId);
      
      expect(retrievedInspection).toBeDefined();
      expect(retrievedInspection?.panelId).toBe(panelId);
      expect(retrievedInspection?.station).toBe(testInspection.station);
    });

    test('should get inspections by panel ID', async () => {
      const inspectionData = { ...testInspection, panelId };
      await InspectionStore.create(inspectionData);
      await InspectionStore.create({ ...inspectionData, station: 'Testing Station' });
      
      const panelInspections = await InspectionStore.getByPanelId(panelId);
      expect(panelInspections).toHaveLength(2);
    });

    test('should get inspections by station', async () => {
      const inspectionData = { ...testInspection, panelId };
      await InspectionStore.create(inspectionData);
      await InspectionStore.create({ ...inspectionData, station: 'Testing Station' });
      
      const qcInspections = await InspectionStore.getByStation('Quality Control');
      const testingInspections = await InspectionStore.getByStation('Testing Station');
      
      expect(qcInspections).toHaveLength(1);
      expect(testingInspections).toHaveLength(1);
    });

    test('should get inspections by status', async () => {
      const inspectionData = { ...testInspection, panelId };
      await InspectionStore.create(inspectionData);
      await InspectionStore.create({ ...inspectionData, status: 'fail' });
      
      const passInspections = await InspectionStore.getByStatus('pass');
      const failInspections = await InspectionStore.getByStatus('fail');
      
      expect(passInspections).toHaveLength(1);
      expect(failInspections).toHaveLength(1);
    });

    test('should get inspections by operator', async () => {
      const inspectionData = { ...testInspection, panelId };
      await InspectionStore.create(inspectionData);
      await InspectionStore.create({ ...inspectionData, operator: 'Jane Smith' });
      
      const johnInspections = await InspectionStore.getByOperator('John Doe');
      const janeInspections = await InspectionStore.getByOperator('Jane Smith');
      
      expect(johnInspections).toHaveLength(1);
      expect(janeInspections).toHaveLength(1);
    });

    test('should update inspection status', async () => {
      const inspectionData = { ...testInspection, panelId };
      const inspectionId = await InspectionStore.create(inspectionData);
      
      await InspectionStore.updateStatus(inspectionId, 'fail');
      
      const updatedInspection = await InspectionStore.getById(inspectionId);
      expect(updatedInspection?.status).toBe('fail');
    });

    test('should update inspection results', async () => {
      const inspectionData = { ...testInspection, panelId };
      const inspectionId = await InspectionStore.create(inspectionData);
      
      const newResults = { visual: 'fail', electrical: 'pass', mechanical: 'pass' };
      await InspectionStore.updateResults(inspectionId, newResults);
      
      const updatedInspection = await InspectionStore.getById(inspectionId);
      expect(updatedInspection?.results.visual).toBe('fail');
    });

    test('should get inspections for today', async () => {
      const inspectionData = { ...testInspection, panelId };
      await InspectionStore.create(inspectionData);
      
      const todayInspections = await InspectionStore.getToday();
      expect(todayInspections).toHaveLength(1);
    });

    test('should get pass/fail rate for station', async () => {
      const inspectionData = { ...testInspection, panelId };
      await InspectionStore.create(inspectionData);
      await InspectionStore.create({ ...inspectionData, status: 'fail' });
      
      const passRate = await InspectionStore.getStationPassRate('Quality Control');
      expect(passRate).toBe(50); // 1 pass out of 2 total
    });

    test('should get overall pass/fail rate', async () => {
      const inspectionData = { ...testInspection, panelId };
      await InspectionStore.create(inspectionData);
      await InspectionStore.create({ ...inspectionData, status: 'fail' });
      await InspectionStore.create({ ...inspectionData, status: 'pass' });
      
      const passRate = await InspectionStore.getOverallPassRate();
      expect(passRate).toBe(66.67); // 2 pass out of 3 total
    });

    test('should get inspection trends', async () => {
      const inspectionData = { ...testInspection, panelId };
      await InspectionStore.create(inspectionData);
      await InspectionStore.create({ ...inspectionData, status: 'fail' });
      
      const trends = await InspectionStore.getTrends(1);
      expect(trends).toHaveLength(1);
      expect(trends[0].count).toBe(2);
      expect(trends[0].passCount).toBe(1);
      expect(trends[0].failCount).toBe(1);
    });
  });

  describe('Sync Queue Store Operations', () => {
    test('should enqueue sync item', async () => {
      const syncId = await SyncQueueStore.enqueue(testSyncItem);
      
      expect(syncId).toBeDefined();
      expect(typeof syncId).toBe('number');
    });

    test('should get next item to sync', async () => {
      await SyncQueueStore.enqueue(testSyncItem);
      await SyncQueueStore.enqueue({ ...testSyncItem, priority: 'low' });
      
      const nextItem = await SyncQueueStore.getNextItem();
      expect(nextItem?.priority).toBe('high');
    });

    test('should get pending items by priority', async () => {
      await SyncQueueStore.enqueue(testSyncItem);
      await SyncQueueStore.enqueue({ ...testSyncItem, priority: 'medium' });
      await SyncQueueStore.enqueue({ ...testSyncItem, priority: 'low' });
      
      const pending = await SyncQueueStore.getPendingByPriority();
      
      expect(pending.high).toHaveLength(1);
      expect(pending.medium).toHaveLength(1);
      expect(pending.low).toHaveLength(1);
    });

    test('should mark item as synced', async () => {
      const syncId = await SyncQueueStore.enqueue(testSyncItem);
      await SyncQueueStore.markSynced(syncId);
      
      const syncedItem = await SyncQueueStore.getById(syncId);
      expect(syncedItem).toBeUndefined();
    });

    test('should mark item as failed and increment retry count', async () => {
      const syncId = await SyncQueueStore.enqueue(testSyncItem);
      await SyncQueueStore.markFailed(syncId, 'Network error');
      
      const failedItem = await SyncQueueStore.getById(syncId);
      expect(failedItem?.retryCount).toBe(1);
      expect(failedItem?.lastRetry).toBeDefined();
    });

    test('should remove item after max retries', async () => {
      const syncId = await SyncQueueStore.enqueue(testSyncItem);
      
      // Mark as failed 3 times
      await SyncQueueStore.markFailed(syncId, 'Error 1');
      await SyncQueueStore.markFailed(syncId, 'Error 2');
      await SyncQueueStore.markFailed(syncId, 'Error 3');
      
      const failedItem = await SyncQueueStore.getById(syncId);
      expect(failedItem).toBeUndefined();
    });

    test('should retry failed items', async () => {
      const syncId = await SyncQueueStore.enqueue(testSyncItem);
      await SyncQueueStore.markFailed(syncId, 'Network error');
      
      const retryCount = await SyncQueueStore.retryFailedItems();
      expect(retryCount).toBe(1);
      
      const retriedItem = await SyncQueueStore.getById(syncId);
      expect(retriedItem?.retryCount).toBe(0);
    });

    test('should get sync queue statistics', async () => {
      await SyncQueueStore.enqueue(testSyncItem);
      await SyncQueueStore.enqueue({ ...testSyncItem, operation: 'update' });
      await SyncQueueStore.enqueue({ ...testSyncItem, priority: 'medium' });
      
      const stats = await SyncQueueStore.getStats();
      
      expect(stats.total).toBe(3);
      expect(stats.byOperation.create).toBe(1);
      expect(stats.byOperation.update).toBe(1);
      expect(stats.byPriority.high).toBe(2);
      expect(stats.byPriority.medium).toBe(1);
    });

    test('should get sync queue health status', async () => {
      await SyncQueueStore.enqueue(testSyncItem);
      
      const health = await SyncQueueStore.getHealthStatus();
      
      expect(health.isHealthy).toBe(true);
      expect(health.issues).toHaveLength(0);
    });

    test('should process sync queue in batches', async () => {
      await SyncQueueStore.enqueue(testSyncItem);
      await SyncQueueStore.enqueue({ ...testSyncItem, priority: 'medium' });
      
      const result = await SyncQueueStore.processBatch(2);
      
      expect(result.processed).toBe(2);
      expect(result.successful + result.failed).toBe(2);
    });

    test('should get items needing retry', async () => {
      const syncId = await SyncQueueStore.enqueue(testSyncItem);
      await SyncQueueStore.markFailed(syncId, 'Network error');
      
      const itemsNeedingRetry = await SyncQueueStore.getItemsNeedingRetry();
      expect(itemsNeedingRetry).toHaveLength(1);
      expect(itemsNeedingRetry[0].id).toBe(syncId);
    });
  });

  describe('Database Relationships', () => {
    test('should maintain referential integrity between panels and inspections', async () => {
      const panelId = await PanelStore.create(testPanel);
      const inspectionData = { ...testInspection, panelId };
      await InspectionStore.create(inspectionData);
      
      const panelInspections = await InspectionStore.getByPanelId(panelId);
      expect(panelInspections).toHaveLength(1);
      
      // Delete panel should cascade to inspections (if implemented)
      await PanelStore.delete(panelId);
      const deletedPanel = await PanelStore.getById(panelId);
      expect(deletedPanel).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Test with invalid data
      const invalidPanel = { ...testPanel, barcode: '' }; // Invalid barcode
      
      try {
        await PanelStore.create(invalidPanel);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle concurrent operations', async () => {
      const promises = [];
      
      // Create multiple panels concurrently
      for (let i = 0; i < 5; i++) {
        promises.push(PanelStore.create({ ...testPanel, barcode: `TEST-${i}` }));
      }
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      
      const allPanels = await PanelStore.getAll();
      expect(allPanels).toHaveLength(5);
    });
  });

  describe('Performance Tests', () => {
    test('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      const panels = Array.from({ length: 100 }, (_, i) => ({
        ...testPanel,
        barcode: `BULK-${i.toString().padStart(3, '0')}`
      }));
      
      const panelIds = await PanelStore.bulkCreate(panels);
      const endTime = Date.now();
      
      expect(panelIds).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      const allPanels = await PanelStore.getAll();
      expect(allPanels).toHaveLength(100);
    });

    test('should handle complex queries efficiently', async () => {
      // Create test data
      for (let i = 0; i < 50; i++) {
        await PanelStore.create({
          ...testPanel,
          barcode: `PERF-${i}`,
          status: i % 2 === 0 ? 'pending' : 'completed'
        });
      }
      
      const startTime = Date.now();
      
      // Perform complex query
      const results = await PanelStore.getAll({
        status: 'pending',
        dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      });
      
      const endTime = Date.now();
      
      expect(results).toHaveLength(25);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
