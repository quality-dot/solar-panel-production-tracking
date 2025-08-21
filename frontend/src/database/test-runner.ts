import { db, dbUtils, checkDatabaseHealth, PanelStore, InspectionStore, SyncQueueStore } from './stores';

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

// Test runner class
export class DatabaseTestRunner {
  private results: Array<{ test: string; status: 'PASS' | 'FAIL'; error?: string; duration: number }> = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Database Tests...');
    console.log('=====================================');

    try {
      // Test database health
      await this.testDatabaseHealth();
      
      // Test panel operations
      await this.testPanelOperations();
      
      // Test inspection operations
      await this.testInspectionOperations();
      
      // Test sync queue operations
      await this.testSyncQueueOperations();
      
      // Test database relationships
      await this.testDatabaseRelationships();
      
      // Test performance
      await this.testPerformance();
      
      // Test error handling
      await this.testErrorHandling();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }

    // Print results
    this.printResults();
  }

  private async testDatabaseHealth(): Promise<void> {
    console.log('\n🔍 Testing Database Health...');
    
    try {
      const startTime = Date.now();
      const health = await checkDatabaseHealth();
      const duration = Date.now() - startTime;
      
      if (health.isHealthy) {
        this.recordResult('Database Health Check', 'PASS', undefined, duration);
        console.log('✅ Database is healthy');
      } else {
        this.recordResult('Database Health Check', 'FAIL', 'Database has issues', duration);
        console.log('❌ Database has issues:', health.issues);
      }
    } catch (error) {
      this.recordResult('Database Health Check', 'FAIL', error instanceof Error ? error.message : 'Unknown error', 0);
      console.log('❌ Database health check failed:', error);
    }
  }

  private async testPanelOperations(): Promise<void> {
    console.log('\n📦 Testing Panel Operations...');
    
    try {
      // Clear existing data
      await dbUtils.clearAll();
      
      // Test create
      const startTime = Date.now();
      const panelId = await PanelStore.create(testPanel);
      const duration = Date.now() - startTime;
      
      if (panelId && typeof panelId === 'number') {
        this.recordResult('Create Panel', 'PASS', undefined, duration);
        console.log('✅ Panel created with ID:', panelId);
      } else {
        this.recordResult('Create Panel', 'FAIL', 'Invalid panel ID returned', duration);
        console.log('❌ Panel creation failed');
        return;
      }
      
      // Test retrieve by ID
      const retrievedPanel = await PanelStore.getById(panelId);
      if (retrievedPanel && retrievedPanel.barcode === testPanel.barcode) {
        this.recordResult('Retrieve Panel by ID', 'PASS', undefined, 0);
        console.log('✅ Panel retrieved successfully');
      } else {
        this.recordResult('Retrieve Panel by ID', 'FAIL', 'Panel not retrieved correctly', 0);
        console.log('❌ Panel retrieval failed');
      }
      
      // Test retrieve by barcode
      const panelByBarcode = await PanelStore.getByBarcode(testPanel.barcode);
      if (panelByBarcode && panelByBarcode.id === panelId) {
        this.recordResult('Retrieve Panel by Barcode', 'PASS', undefined, 0);
        console.log('✅ Panel retrieved by barcode successfully');
      } else {
        this.recordResult('Retrieve Panel by Barcode', 'FAIL', 'Panel not retrieved by barcode', 0);
        console.log('❌ Panel retrieval by barcode failed');
      }
      
      // Test update
      await PanelStore.updateStatus(panelId, 'in_production');
      const updatedPanel = await PanelStore.getById(panelId);
      if (updatedPanel && updatedPanel.status === 'in_production') {
        this.recordResult('Update Panel Status', 'PASS', undefined, 0);
        console.log('✅ Panel status updated successfully');
      } else {
        this.recordResult('Update Panel Status', 'FAIL', 'Panel status not updated', 0);
        console.log('❌ Panel status update failed');
      }
      
      // Test search
      const searchResults = await PanelStore.search({ query: 'Monocrystalline' });
      if (searchResults.length > 0 && searchResults[0].type === 'Monocrystalline') {
        this.recordResult('Search Panels', 'PASS', undefined, 0);
        console.log('✅ Panel search working correctly');
      } else {
        this.recordResult('Search Panels', 'FAIL', 'Panel search not working', 0);
        console.log('❌ Panel search failed');
      }
      
      // Test statistics
      const stats = await PanelStore.getStats();
      if (stats.total === 1) {
        this.recordResult('Panel Statistics', 'PASS', undefined, 0);
        console.log('✅ Panel statistics working correctly');
      } else {
        this.recordResult('Panel Statistics', 'FAIL', 'Panel statistics incorrect', 0);
        console.log('❌ Panel statistics failed');
      }
      
    } catch (error) {
      this.recordResult('Panel Operations', 'FAIL', error instanceof Error ? error.message : 'Unknown error', 0);
      console.log('❌ Panel operations test failed:', error);
    }
  }

  private async testInspectionOperations(): Promise<void> {
    console.log('\n🔍 Testing Inspection Operations...');
    
    try {
      // Create a panel first
      const panelId = await PanelStore.create(testPanel);
      
      // Test create inspection
      const inspectionData = { ...testInspection, panelId };
      const inspectionId = await InspectionStore.create(inspectionData);
      
      if (inspectionId && typeof inspectionId === 'number') {
        this.recordResult('Create Inspection', 'PASS', undefined, 0);
        console.log('✅ Inspection created with ID:', inspectionId);
      } else {
        this.recordResult('Create Inspection', 'FAIL', 'Invalid inspection ID returned', 0);
        console.log('❌ Inspection creation failed');
        return;
      }
      
      // Test retrieve inspection
      const retrievedInspection = await InspectionStore.getById(inspectionId);
      if (retrievedInspection && retrievedInspection.panelId === panelId) {
        this.recordResult('Retrieve Inspection', 'PASS', undefined, 0);
        console.log('✅ Inspection retrieved successfully');
      } else {
        this.recordResult('Retrieve Inspection', 'FAIL', 'Inspection not retrieved correctly', 0);
        console.log('❌ Inspection retrieval failed');
      }
      
      // Test get by panel ID
      const panelInspections = await InspectionStore.getByPanelId(panelId);
      if (panelInspections.length === 1) {
        this.recordResult('Get Inspections by Panel ID', 'PASS', undefined, 0);
        console.log('✅ Panel inspections retrieved successfully');
      } else {
        this.recordResult('Get Inspections by Panel ID', 'FAIL', 'Panel inspections not retrieved', 0);
        console.log('❌ Panel inspections retrieval failed');
      }
      
      // Test update inspection
      await InspectionStore.updateStatus(inspectionId, 'fail');
      const updatedInspection = await InspectionStore.getById(inspectionId);
      if (updatedInspection && updatedInspection.status === 'fail') {
        this.recordResult('Update Inspection Status', 'PASS', undefined, 0);
        console.log('✅ Inspection status updated successfully');
      } else {
        this.recordResult('Update Inspection Status', 'FAIL', 'Inspection status not updated', 0);
        console.log('❌ Inspection status update failed');
      }
      
    } catch (error) {
      this.recordResult('Inspection Operations', 'FAIL', error instanceof Error ? error.message : 'Unknown error', 0);
      console.log('❌ Inspection operations test failed:', error);
    }
  }

  private async testSyncQueueOperations(): Promise<void> {
    console.log('\n🔄 Testing Sync Queue Operations...');
    
    try {
      // Test enqueue
      const syncId = await SyncQueueStore.enqueue(testSyncItem);
      
      if (syncId && typeof syncId === 'number') {
        this.recordResult('Enqueue Sync Item', 'PASS', undefined, 0);
        console.log('✅ Sync item enqueued with ID:', syncId);
      } else {
        this.recordResult('Enqueue Sync Item', 'FAIL', 'Invalid sync ID returned', 0);
        console.log('❌ Sync item enqueue failed');
        return;
      }
      
      // Test get next item
      const nextItem = await SyncQueueStore.getNextItem();
      if (nextItem && nextItem.id === syncId) {
        this.recordResult('Get Next Sync Item', 'PASS', undefined, 0);
        console.log('✅ Next sync item retrieved successfully');
      } else {
        this.recordResult('Get Next Sync Item', 'FAIL', 'Next sync item not retrieved', 0);
        console.log('❌ Next sync item retrieval failed');
      }
      
      // Test mark as synced
      await SyncQueueStore.markSynced(syncId);
      const syncedItem = await SyncQueueStore.getById(syncId);
      if (!syncedItem) {
        this.recordResult('Mark Item as Synced', 'PASS', undefined, 0);
        console.log('✅ Sync item marked as synced successfully');
      } else {
        this.recordResult('Mark Item as Synced', 'FAIL', 'Sync item not marked as synced', 0);
        console.log('❌ Mark as synced failed');
      }
      
    } catch (error) {
      this.recordResult('Sync Queue Operations', 'FAIL', error instanceof Error ? error.message : 'Unknown error', 0);
      console.log('❌ Sync queue operations test failed:', error);
    }
  }

  private async testDatabaseRelationships(): Promise<void> {
    console.log('\n🔗 Testing Database Relationships...');
    
    try {
      // Create panel and inspection
      const panelId = await PanelStore.create(testPanel);
      const inspectionData = { ...testInspection, panelId };
      await InspectionStore.create(inspectionData);
      
      // Test relationship
      const panelInspections = await InspectionStore.getByPanelId(panelId);
      if (panelInspections.length === 1 && panelInspections[0].panelId === panelId) {
        this.recordResult('Database Relationships', 'PASS', undefined, 0);
        console.log('✅ Database relationships working correctly');
      } else {
        this.recordResult('Database Relationships', 'FAIL', 'Database relationships not working', 0);
        console.log('❌ Database relationships failed');
      }
      
    } catch (error) {
      this.recordResult('Database Relationships', 'FAIL', error instanceof Error ? error.message : 'Unknown error', 0);
      console.log('❌ Database relationships test failed:', error);
    }
  }

  private async testPerformance(): Promise<void> {
    console.log('\n⚡ Testing Performance...');
    
    try {
      // Test bulk operations
      const startTime = Date.now();
      const panels = Array.from({ length: 10 }, (_, i) => ({
        ...testPanel,
        barcode: `PERF-${i.toString().padStart(3, '0')}`
      }));
      
      const panelIds = await PanelStore.bulkCreate(panels);
      const duration = Date.now() - startTime;
      
      if (panelIds.length === 10 && duration < 1000) {
        this.recordResult('Bulk Operations Performance', 'PASS', undefined, duration);
        console.log('✅ Bulk operations completed in', duration, 'ms');
      } else {
        this.recordResult('Bulk Operations Performance', 'FAIL', 'Bulk operations too slow', duration);
        console.log('❌ Bulk operations performance test failed');
      }
      
    } catch (error) {
      this.recordResult('Performance Tests', 'FAIL', error instanceof Error ? error.message : 'Unknown error', 0);
      console.log('❌ Performance test failed:', error);
    }
  }

  private async testErrorHandling(): Promise<void> {
    console.log('\n🛡️ Testing Error Handling...');
    
    try {
      // Test with invalid data
      const invalidPanel = { ...testPanel, barcode: '' };
      
      try {
        await PanelStore.create(invalidPanel);
        this.recordResult('Error Handling', 'FAIL', 'Should have thrown an error', 0);
        console.log('❌ Error handling test failed - should have thrown error');
      } catch (error) {
        this.recordResult('Error Handling', 'PASS', undefined, 0);
        console.log('✅ Error handling working correctly');
      }
      
    } catch (error) {
      this.recordResult('Error Handling', 'FAIL', error instanceof Error ? error.message : 'Unknown error', 0);
      console.log('❌ Error handling test failed:', error);
    }
  }

  private recordResult(test: string, status: 'PASS' | 'FAIL', error?: string, duration: number): void {
    this.results.push({ test, status, error, duration });
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary');
    console.log('=====================================');
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      const duration = result.duration > 0 ? ` (${result.duration}ms)` : '';
      const error = result.error ? ` - ${result.error}` : '';
      console.log(`${icon} ${result.test}${duration}${error}`);
    });
    
    if (failedTests === 0) {
      console.log('\n🎉 All tests passed! Database is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Check the errors above.');
    }
  }
}

// Export for use in browser console
export const testRunner = new DatabaseTestRunner();

// Make available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testRunner = testRunner;
  (window as any).runDatabaseTests = () => testRunner.runAllTests();
  console.log('🚀 Database Test Runner loaded!');
  console.log('Run "runDatabaseTests()" in the console to test the database.');
}
