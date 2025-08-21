import { db, type SyncQueue, withErrorHandling } from '../config';

export interface SyncQueueFilters {
  operation?: SyncQueue['operation'];
  table?: string;
  priority?: SyncQueue['priority'];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SyncQueueStats {
  total: number;
  byOperation: Record<SyncQueue['operation'], number>;
  byTable: Record<string, number>;
  byPriority: Record<SyncQueue['priority'], number>;
  pendingCount: number;
  retryCount: number;
}

export interface SyncConflict {
  localData: any;
  remoteData: any;
  conflictType: 'version' | 'deletion' | 'modification';
  resolution: 'local' | 'remote' | 'manual';
}

export class SyncQueueStore {
  // Add item to sync queue
  static async enqueue(syncItem: Omit<SyncQueue, 'id' | 'createdAt' | 'retryCount' | 'lastRetry'>): Promise<number> {
    return await withErrorHandling(async () => {
      const queueItem: Omit<SyncQueue, 'id'> = {
        ...syncItem,
        createdAt: new Date(),
        retryCount: 0
      };
      
      return await db.syncQueue.add(queueItem);
    });
  }

  // Get sync queue item by ID
  static async getById(id: number): Promise<SyncQueue | undefined> {
    return await withErrorHandling(async () => {
      return await db.syncQueue.get(id);
    });
  }

  // Get all sync queue items with optional filtering
  static async getAll(filters?: SyncQueueFilters): Promise<SyncQueue[]> {
    return await withErrorHandling(async () => {
      let collection = db.syncQueue.toCollection();
      
      if (filters?.operation) {
        collection = collection.filter(item => item.operation === filters.operation);
      }
      
      if (filters?.table) {
        collection = collection.filter(item => item.table === filters.table);
      }
      
      if (filters?.priority) {
        collection = collection.filter(item => item.priority === filters.priority);
      }
      
      if (filters?.dateFrom) {
        collection = collection.filter(item => item.createdAt >= filters.dateFrom!);
      }
      
      if (filters?.dateTo) {
        collection = collection.filter(item => item.createdAt <= filters.dateTo!);
      }
      
      return await collection.sortBy('createdAt');
    });
  }

  // Get pending sync items by priority
  static async getPendingByPriority(): Promise<{
    high: SyncQueue[];
    medium: SyncQueue[];
    low: SyncQueue[];
  }> {
    return await withErrorHandling(async () => {
      const high = await db.syncQueue
        .where('priority')
        .equals('high')
        .sortBy('createdAt');
      
      const medium = await db.syncQueue
        .where('priority')
        .equals('medium')
        .sortBy('createdAt');
      
      const low = await db.syncQueue
        .where('priority')
        .equals('low')
        .sortBy('createdAt');
      
      return { high, medium, low };
    });
  }

  // Get next item to sync (highest priority, oldest first)
  static async getNextItem(): Promise<SyncQueue | undefined> {
    return await withErrorHandling(async () => {
      // First try high priority items
      let item = await db.syncQueue
        .where('priority')
        .equals('high')
        .first();
      
      if (!item) {
        // Then medium priority
        item = await db.syncQueue
          .where('priority')
          .equals('medium')
          .first();
      }
      
      if (!item) {
        // Finally low priority
        item = await db.syncQueue
          .where('priority')
          .equals('low')
          .first();
      }
      
      return item;
    });
  }

  // Get items by table
  static async getByTable(table: string): Promise<SyncQueue[]> {
    return await withErrorHandling(async () => {
      return await db.syncQueue
        .where('table')
        .equals(table)
        .sortBy('createdAt');
    });
  }

  // Get items by operation type
  static async getByOperation(operation: SyncQueue['operation']): Promise<SyncQueue[]> {
    return await withErrorHandling(async () => {
      return await db.syncQueue
        .where('operation')
        .equals(operation)
        .sortBy('createdAt');
    });
  }

  // Update sync queue item
  static async update(id: number, updates: Partial<Omit<SyncQueue, 'id' | 'createdAt'>>): Promise<void> {
    return await withErrorHandling(async () => {
      await db.syncQueue.update(id, updates);
    });
  }

  // Mark item as successfully synced (remove from queue)
  static async markSynced(id: number): Promise<void> {
    return await withErrorHandling(async () => {
      await db.syncQueue.delete(id);
    });
  }

  // Mark item as failed and increment retry count
  static async markFailed(id: number, error?: string): Promise<void> {
    return await withErrorHandling(async () => {
      const item = await db.syncQueue.get(id);
      if (item) {
        const newRetryCount = item.retryCount + 1;
        
        // If max retries reached, mark as permanently failed
        if (newRetryCount >= 3) {
          await db.syncQueue.delete(id);
        } else {
          await db.syncQueue.update(id, {
            retryCount: newRetryCount,
            lastRetry: new Date()
          });
        }
      }
    });
  }

  // Retry failed items
  static async retryFailedItems(): Promise<number> {
    return await withErrorHandling(async () => {
      const failedItems = await db.syncQueue
        .filter(item => item.retryCount > 0)
        .toArray();
      
      let retryCount = 0;
      
      for (const item of failedItems) {
        if (item.retryCount < 3) {
          await db.syncQueue.update(item.id!, {
            retryCount: 0,
            lastRetry: undefined
          });
          retryCount++;
        }
      }
      
      return retryCount;
    });
  }

  // Clear old completed items
  static async clearOldItems(daysOld: number = 7): Promise<number> {
    return await withErrorHandling(async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const oldItems = await db.syncQueue
        .filter(item => item.createdAt < cutoffDate)
        .toArray();
      
      const idsToDelete = oldItems.map(item => item.id!);
      
      if (idsToDelete.length > 0) {
        await db.syncQueue.bulkDelete(idsToDelete);
      }
      
      return idsToDelete.length;
    });
  }

  // Get sync queue statistics
  static async getStats(): Promise<SyncQueueStats> {
    return await withErrorHandling(async () => {
      const total = await db.syncQueue.count();
      
      const byOperation = {
        create: await db.syncQueue.where('operation').equals('create').count(),
        update: await db.syncQueue.where('operation').equals('update').count(),
        delete: await db.syncQueue.where('operation').equals('delete').count()
      };
      
      const byPriority = {
        high: await db.syncQueue.where('priority').equals('high').count(),
        medium: await db.syncQueue.where('priority').equals('medium').count(),
        low: await db.syncQueue.where('priority').equals('low').count()
      };
      
      // Get unique tables and their counts
      const items = await db.syncQueue.toArray();
      const byTable: Record<string, number> = {};
      items.forEach(item => {
        byTable[item.table] = (byTable[item.table] || 0) + 1;
      });
      
      const pendingCount = total;
      const retryCount = items.reduce((sum, item) => sum + item.retryCount, 0);
      
      return {
        total,
        byOperation,
        byTable,
        byPriority,
        pendingCount,
        retryCount
      };
    });
  }

  // Get items that need retry
  static async getItemsNeedingRetry(): Promise<SyncQueue[]> {
    return await withErrorHandling(async () => {
      return await db.syncQueue
        .filter(item => item.retryCount > 0 && item.retryCount < 3)
        .sortBy('lastRetry');
    });
  }

  // Get items by priority level
  static async getByPriority(priority: SyncQueue['priority']): Promise<SyncQueue[]> {
    return await withErrorHandling(async () => {
      return await db.syncQueue
        .where('priority')
        .equals(priority)
        .sortBy('createdAt');
    });
  }

  // Bulk enqueue multiple items
  static async bulkEnqueue(items: Array<Omit<SyncQueue, 'id' | 'createdAt' | 'retryCount' | 'lastRetry'>>): Promise<number[]> {
    return await withErrorHandling(async () => {
      const now = new Date();
      const queueItems = items.map(item => ({
        ...item,
        createdAt: now,
        retryCount: 0
      }));
      
      return await db.syncQueue.bulkAdd(queueItems);
    });
  }

  // Clear all sync queue items (use with caution)
  static async clearAll(): Promise<void> {
    return await withErrorHandling(async () => {
      await db.syncQueue.clear();
    });
  }

  // Get sync queue health status
  static async getHealthStatus(): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    return await withErrorHandling(async () => {
      const issues: string[] = [];
      const recommendations: string[] = [];
      
      const stats = await this.getStats();
      
      // Check for potential issues
      if (stats.total > 100) {
        issues.push('Sync queue has many pending items');
        recommendations.push('Check network connectivity and sync status');
      }
      
      if (stats.retryCount > 50) {
        issues.push('Many items have failed and been retried');
        recommendations.push('Investigate sync failures and fix underlying issues');
      }
      
      if (stats.byPriority.high > 20) {
        issues.push('Many high-priority items in queue');
        recommendations.push('Prioritize sync processing for critical operations');
      }
      
      const isHealthy = issues.length === 0;
      
      return {
        isHealthy,
        issues,
        recommendations
      };
    });
  }

  // Process sync queue in batches
  static async processBatch(batchSize: number = 10): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    return await withErrorHandling(async () => {
      const items = await this.getNextItems(batchSize);
      let processed = 0;
      let successful = 0;
      let failed = 0;
      
      for (const item of items) {
        try {
          // Simulate sync processing
          await this.processSyncItem(item);
          await this.markSynced(item.id!);
          successful++;
        } catch (error) {
          await this.markFailed(item.id!, error instanceof Error ? error.message : 'Unknown error');
          failed++;
        }
        processed++;
      }
      
      return { processed, successful, failed };
    });
  }

  // Get next N items to process
  private static async getNextItems(limit: number): Promise<SyncQueue[]> {
    const { high, medium, low } = await this.getPendingByPriority();
    
    const items: SyncQueue[] = [];
    
    // Add high priority items first
    items.push(...high.slice(0, limit));
    
    // If we need more, add medium priority
    if (items.length < limit) {
      items.push(...medium.slice(0, limit - items.length));
    }
    
    // If we still need more, add low priority
    if (items.length < limit) {
      items.push(...low.slice(0, limit - items.length));
    }
    
    return items;
  }

  // Process a single sync item (placeholder for actual sync logic)
  private static async processSyncItem(item: SyncQueue): Promise<void> {
    // This would contain the actual sync logic
    // For now, we'll just simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error('Simulated sync failure');
    }
  }

  // Get sync queue trends over time
  static async getTrends(days: number = 7): Promise<Array<{ date: string; count: number; retryCount: number }>> {
    return await withErrorHandling(async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
      
      const items = await this.getByDateRange(startDate, endDate);
      const trends: Record<string, { count: number; retryCount: number }> = {};
      
      items.forEach(item => {
        const dateKey = item.createdAt.toISOString().split('T')[0];
        
        if (!trends[dateKey]) {
          trends[dateKey] = { count: 0, retryCount: 0 };
        }
        
        trends[dateKey].count++;
        trends[dateKey].retryCount += item.retryCount;
      });
      
      // Convert to array and sort by date
      return Object.entries(trends)
        .map(([date, data]) => ({
          date,
          ...data
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  // Get items by date range
  private static async getByDateRange(from: Date, to: Date): Promise<SyncQueue[]> {
    return await db.syncQueue
      .where('createdAt')
      .between(from, to, true, true)
      .toArray();
  }
}

export default SyncQueueStore;
