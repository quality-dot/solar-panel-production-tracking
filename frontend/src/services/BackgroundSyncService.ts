import { SyncQueueStore, type SyncConflict } from '../database/stores/syncQueueStore';
import { db, type SyncQueue } from '../database/config';

export interface SyncResult {
  success: boolean;
  itemId: number;
  error?: string;
  errorType?: 'network' | 'timeout' | 'server' | 'client' | 'conflict' | 'unknown';
  conflict?: SyncConflict;
  retryCount: number;
}

export interface SyncBatchResult {
  processed: number;
  successful: number;
  failed: number;
  conflicts: number;
  results: SyncResult[];
}

export interface SyncProgress {
  total: number;
  processed: number;
  current: SyncQueue | null;
  status: 'idle' | 'syncing' | 'completed' | 'error';
  error?: string;
}

export interface ConflictResolution {
  strategy: 'local' | 'remote' | 'manual' | 'merge';
  resolvedData?: any;
  reason?: string;
}

// API endpoints configuration
const API_ENDPOINTS = {
  panels: '/api/panels',
  inspections: '/api/inspections',
  manufacturingOrders: '/api/manufacturing-orders',
  stations: '/api/stations'
} as const;

export class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private isSyncing = false;
  private syncProgress: SyncProgress = {
    total: 0,
    processed: 0,
    current: null,
    status: 'idle'
  };
  private progressCallbacks: Array<(progress: SyncProgress) => void> = [];
  private statusCallbacks: Array<(status: string) => void> = [];

  // Singleton pattern
  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  // Subscribe to sync progress updates
  onProgress(callback: (progress: SyncProgress) => void): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  // Subscribe to sync status updates
  onStatus(callback: (status: string) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  // Update progress and notify subscribers
  private updateProgress(progress: Partial<SyncProgress>): void {
    this.syncProgress = { ...this.syncProgress, ...progress };
    this.progressCallbacks.forEach(callback => callback(this.syncProgress));
  }

  // Update status and notify subscribers
  private updateStatus(status: string): void {
    this.statusCallbacks.forEach(callback => callback(status));
  }

  // Get current sync progress
  getProgress(): SyncProgress {
    return { ...this.syncProgress };
  }

  // Check if currently syncing
  isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }

  // Main sync method - processes queued operations when network is restored
  async syncWhenOnline(): Promise<SyncBatchResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    this.updateStatus('Starting background sync...');

    try {
      // Get all pending sync items
      const pendingItems = await SyncQueueStore.getAll();
      
      if (pendingItems.length === 0) {
        this.updateStatus('No items to sync');
        this.isSyncing = false;
        return { processed: 0, successful: 0, failed: 0, conflicts: 0, results: [] };
      }

      this.updateProgress({
        total: pendingItems.length,
        processed: 0,
        current: null,
        status: 'syncing'
      });

      this.updateStatus(`Processing ${pendingItems.length} queued operations...`);

      const results: SyncResult[] = [];
      let successful = 0;
      let failed = 0;
      let conflicts = 0;

      // Process items by priority
      const { high, medium, low } = await SyncQueueStore.getPendingByPriority();
      const priorityOrder = [...high, ...medium, ...low];

      for (const item of priorityOrder) {
        this.updateProgress({
          current: item,
          processed: results.length + 1
        });

        this.updateStatus(`Syncing ${item.operation} operation for ${item.table}...`);

        try {
          const result = await this.processSyncItem(item);
          results.push(result);

          if (result.success) {
            successful++;
            await SyncQueueStore.markSynced(item.id!);
          } else {
            failed++;
            if (result.conflict) {
              conflicts++;
              // Handle conflict resolution
              const resolution = await this.resolveConflict(result.conflict, item);
              if (resolution.strategy === 'local') {
                // Keep local version, mark as synced
                await SyncQueueStore.markSynced(item.id!);
                successful++;
                failed--;
              } else if (resolution.strategy === 'remote') {
                // Update local data with remote version
                await this.updateLocalData(item.table, item.data, resolution.resolvedData);
                await SyncQueueStore.markSynced(item.id!);
                successful++;
                failed--;
              }
              // For 'manual' strategy, leave item in queue for user intervention
            } else {
              // Mark as failed for retry
              await SyncQueueStore.markFailed(item.id!, result.error);
            }
          }
        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            success: false,
            itemId: item.id!,
            error: errorMessage,
            retryCount: item.retryCount
          });
          await SyncQueueStore.markFailed(item.id!, errorMessage);
        }

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.updateProgress({
        status: 'completed',
        current: null
      });

      this.updateStatus(`Sync completed: ${successful} successful, ${failed} failed, ${conflicts} conflicts`);

      return {
        processed: results.length,
        successful,
        failed,
        conflicts,
        results
      };

    } catch (error) {
      this.updateProgress({
        status: 'error',
        error: error instanceof Error ? error.message : 'Sync failed'
      });
      this.updateStatus('Background sync failed');
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  // Process a single sync item
  private async processSyncItem(item: SyncQueue): Promise<SyncResult> {
    const endpoint = this.getEndpointForTable(item.table);
    if (!endpoint) {
      throw new Error(`Unknown table: ${item.table}`);
    }

    try {
      let response: Response;
      let remoteData: any;

      switch (item.operation) {
        case 'create':
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item.data)
          });
          break;

        case 'update':
          response = await fetch(`${endpoint}/${item.data.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item.data)
          });
          break;

        case 'delete':
          response = await fetch(`${endpoint}/${item.data.id}`, {
            method: 'DELETE'
          });
          break;

        default:
          throw new Error(`Unknown operation: ${item.operation}`);
      }

      if (!response.ok) {
        // Check for conflict (409 Conflict)
        if (response.status === 409) {
          remoteData = await response.json();
          const conflict = await this.detectConflict(item, remoteData);
          return {
            success: false,
            itemId: item.id!,
            conflict,
            retryCount: item.retryCount
          };
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      remoteData = await response.json();

      return {
        success: true,
        itemId: item.id!,
        retryCount: item.retryCount
      };

    } catch (error) {
      return await this.handleNetworkError(error, item);
    }
  }

  // Get API endpoint for table
  private getEndpointForTable(table: string): string | null {
    switch (table.toLowerCase()) {
      case 'panels':
        return API_ENDPOINTS.panels;
      case 'inspections':
        return API_ENDPOINTS.inspections;
      case 'manufacturing_orders':
      case 'manufacturingorders':
        return API_ENDPOINTS.manufacturingOrders;
      case 'stations':
        return API_ENDPOINTS.stations;
      default:
        return null;
    }
  }

  // Detect conflicts between local and remote data
  private async detectConflict(item: SyncQueue, remoteData: any): Promise<SyncConflict> {
    // Get local data for comparison
    let localData: any;
    
    try {
      switch (item.table) {
        case 'panels':
          localData = await db.panels.get(item.data.id);
          break;
        case 'inspections':
          localData = await db.inspections.get(item.data.id);
          break;
        case 'manufacturing_orders':
          // Manufacturing orders not implemented yet, use item data
          localData = item.data;
          break;
        case 'stations':
          // Stations not implemented yet, use item data
          localData = item.data;
          break;
        default:
          localData = item.data;
      }
    } catch (error) {
      localData = item.data;
    }

    // Determine conflict type
    let conflictType: SyncConflict['conflictType'] = 'modification';
    
    if (item.operation === 'delete') {
      conflictType = 'deletion';
    } else if (remoteData.version && localData.version && remoteData.version !== localData.version) {
      conflictType = 'version';
    }

    return {
      localData,
      remoteData,
      conflictType,
      resolution: 'manual' // Default to manual resolution
    };
  }

  // Resolve conflicts using predefined strategies
  private async resolveConflict(conflict: SyncConflict, item: SyncQueue): Promise<ConflictResolution> {
    // Enhanced conflict resolution with better business logic
    // Consider data integrity, business rules, and user preferences

    switch (conflict.conflictType) {
      case 'deletion':
        // If remote was deleted, prefer remote (delete local)
        // This prevents resurrecting deleted records
        return { 
          strategy: 'remote',
          reason: 'Remote record was deleted, removing local copy'
        };

      case 'version':
        // If remote has higher version, prefer remote
        // Version conflicts usually indicate remote has more recent data
        if (conflict.remoteData.version > conflict.localData.version) {
          return { 
            strategy: 'remote', 
            resolvedData: conflict.remoteData,
            reason: `Remote version ${conflict.remoteData.version} is newer than local version ${conflict.localData.version}`
          };
        } else if (conflict.remoteData.version < conflict.localData.version) {
          return { 
            strategy: 'local',
            reason: `Local version ${conflict.localData.version} is newer than remote version ${conflict.remoteData.version}`
          };
        } else {
          // Same version, check timestamps
          const localTimestamp = new Date(conflict.localData.updatedAt || conflict.localData.createdAt);
          const remoteTimestamp = new Date(conflict.remoteData.updatedAt || conflict.remoteData.createdAt);
          
          if (remoteTimestamp > localTimestamp) {
            return { 
              strategy: 'remote', 
              resolvedData: conflict.remoteData,
              reason: 'Remote data has more recent timestamp'
            };
          } else {
            return { 
              strategy: 'local',
              reason: 'Local data has more recent timestamp'
            };
          }
        }

      case 'modification':
        // For modifications, implement business-specific logic
        const localTimestamp = new Date(conflict.localData.updatedAt || conflict.localData.createdAt);
        const remoteTimestamp = new Date(conflict.remoteData.updatedAt || conflict.remoteData.createdAt);
        
        // Check if this is a critical business operation
        const isCriticalOperation = this.isCriticalBusinessOperation(item, conflict);
        
        if (isCriticalOperation) {
          // For critical operations, prefer the most recent change
          if (remoteTimestamp > localTimestamp) {
            return { 
              strategy: 'remote', 
              resolvedData: conflict.remoteData,
              reason: 'Remote critical operation is more recent'
            };
          } else {
            return { 
              strategy: 'local',
              reason: 'Local critical operation is more recent'
            };
          }
        } else {
          // For non-critical operations, implement merge strategy if possible
          const mergedData = this.attemptMerge(conflict.localData, conflict.remoteData, item.table);
          if (mergedData) {
            return { 
              strategy: 'merge', 
              resolvedData: mergedData,
              reason: 'Successfully merged local and remote changes'
            };
          } else {
            // Fall back to timestamp-based resolution
            if (remoteTimestamp > localTimestamp) {
              return { 
                strategy: 'remote', 
                resolvedData: conflict.remoteData,
                reason: 'Remote modification is more recent'
              };
            } else {
              return { 
                strategy: 'local',
                reason: 'Local modification is more recent'
              };
            }
          }
        }

      default:
        return { 
          strategy: 'manual',
          reason: 'Unknown conflict type, requires manual resolution'
        };
    }
  }

  // Check if an operation is critical for business logic
  private isCriticalBusinessOperation(item: SyncQueue, conflict: SyncConflict): boolean {
    // Define critical operations based on business rules
    const criticalTables = ['manufacturing_orders', 'inspections'];
    const criticalOperations = ['delete', 'update'];
    
    return criticalTables.includes(item.table) && criticalOperations.includes(item.operation);
  }

  // Attempt to merge local and remote data
  private attemptMerge(localData: any, remoteData: any, table: string): any | null {
    try {
      // Implement table-specific merge logic
      switch (table) {
        case 'panels':
          return this.mergePanelData(localData, remoteData);
        case 'inspections':
          return this.mergeInspectionData(localData, remoteData);
        case 'manufacturing_orders':
          return this.mergeManufacturingOrderData(localData, remoteData);
        default:
          return null;
      }
    } catch (error) {
      console.warn('Merge attempt failed:', error);
      return null;
    }
  }

  // Merge panel data
  private mergePanelData(localData: any, remoteData: any): any | null {
    // For panels, prefer the most complete data
    const merged = { ...localData };
    
    // Update with remote data, but preserve local changes that aren't in remote
    Object.keys(remoteData).forEach(key => {
      if (remoteData[key] !== undefined && remoteData[key] !== null) {
        merged[key] = remoteData[key];
      }
    });
    
    // Update timestamp to reflect merge
    merged.updatedAt = new Date().toISOString();
    merged.version = Math.max(localData.version || 0, remoteData.version || 0) + 1;
    
    return merged;
  }

  // Merge inspection data
  private mergeInspectionData(localData: any, remoteData: any): any | null {
    // For inspections, be more conservative - don't merge conflicting results
    if (localData.result !== remoteData.result) {
      // If results conflict, prefer the most recent
      const localTime = new Date(localData.updatedAt || localData.createdAt);
      const remoteTime = new Date(remoteData.updatedAt || remoteData.createdAt);
      
      return remoteTime > localTime ? remoteData : localData;
    }
    
    // If results match, merge other fields
    return this.mergePanelData(localData, remoteData);
  }

  // Merge manufacturing order data
  private mergeManufacturingOrderData(localData: any, remoteData: any): any | null {
    // For manufacturing orders, be very conservative
    // Only merge non-critical fields
    const criticalFields = ['status', 'completion_date', 'total_panels'];
    
    const merged = { ...localData };
    
    Object.keys(remoteData).forEach(key => {
      if (!criticalFields.includes(key) && remoteData[key] !== undefined) {
        merged[key] = remoteData[key];
      }
    });
    
    // For critical fields, prefer the most recent
    criticalFields.forEach(field => {
      if (remoteData[field] !== undefined) {
        const localTime = new Date(localData.updatedAt || localData.createdAt);
        const remoteTime = new Date(remoteData.updatedAt || remoteData.createdAt);
        
        if (remoteTime > localTime) {
          merged[field] = remoteData[field];
        }
      }
    });
    
    merged.updatedAt = new Date().toISOString();
    merged.version = Math.max(localData.version || 0, remoteData.version || 0) + 1;
    
    return merged;
  }

  // Update local data with resolved remote data
  private async updateLocalData(table: string, originalData: any, resolvedData: any): Promise<void> {
    try {
      switch (table) {
        case 'panels':
          await db.panels.put(resolvedData);
          break;
        case 'inspections':
          await db.inspections.put(resolvedData);
          break;
        case 'manufacturing_orders':
          // Manufacturing orders not implemented yet, skip update
          console.warn('Manufacturing orders table not implemented');
          break;
        case 'stations':
          // Stations not implemented yet, skip update
          console.warn('Stations table not implemented');
          break;
      }
    } catch (error) {
      console.error('Failed to update local data:', error);
      throw error;
    }
  }

  // Retry failed sync items with enhanced retry logic
  async retryFailedItems(): Promise<SyncBatchResult> {
    const failedItems = await SyncQueueStore.getItemsNeedingRetry();
    
    if (failedItems.length === 0) {
      return { processed: 0, successful: 0, failed: 0, conflicts: 0, results: [] };
    }

    this.updateStatus(`Retrying ${failedItems.length} failed items...`);

    // Filter items based on retry strategy
    const retryableItems = failedItems.filter(item => {
      // Don't retry client errors (400, 401, 403, 404)
      if (item.error && (
        item.error.includes('Client error') || 
        item.error.includes('400') || 
        item.error.includes('401') || 
        item.error.includes('403') || 
        item.error.includes('404')
      )) {
        return false;
      }
      
      // Don't retry if max retries exceeded
      const maxRetries = this.getMaxRetriesForOperation(item.operation, item.table);
      return item.retryCount < maxRetries;
    });

    if (retryableItems.length === 0) {
      this.updateStatus('No items eligible for retry');
      return { processed: 0, successful: 0, failed: 0, conflicts: 0, results: [] };
    }

    // Reset retry count for retryable items
    for (const item of retryableItems) {
      await SyncQueueStore.update(item.id!, { retryCount: 0 });
    }

    // Process them again with enhanced error handling
    return this.syncWhenOnline();
  }

  // Get max retries based on operation type and table
  private getMaxRetriesForOperation(operation: string, table: string): number {
    // Critical operations get more retries
    if (operation === 'delete' || table === 'manufacturing_orders') {
      return 5;
    }
    
    // Standard operations
    if (operation === 'create' || operation === 'update') {
      return 3;
    }
    
    // Default
    return 2;
  }

  // Enhanced retry with exponential backoff
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        
        this.updateStatus(`Retry attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  // Enhanced error handling for network operations with better categorization
  private async handleNetworkError(error: any, item: SyncQueue): Promise<SyncResult> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
    
    // Enhanced error categorization with specific error types
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
      // Network connectivity issues - retryable
      return {
        success: false,
        itemId: item.id!,
        error: `Network connectivity issue: ${errorMessage}`,
        retryCount: item.retryCount,
        errorType: 'network'
      };
    } else if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
      // Timeout issues - retryable
      return {
        success: false,
        itemId: item.id!,
        error: `Request timeout: ${errorMessage}`,
        retryCount: item.retryCount,
        errorType: 'timeout'
      };
    } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('504')) {
      // Server errors - retryable
      return {
        success: false,
        itemId: item.id!,
        error: `Server error: ${errorMessage}`,
        retryCount: item.retryCount,
        errorType: 'server'
      };
    } else if (errorMessage.includes('400') || errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('404')) {
      // Client errors - not retryable
      return {
        success: false,
        itemId: item.id!,
        error: `Client error: ${errorMessage}`,
        retryCount: item.retryCount,
        errorType: 'client'
      };
    } else if (errorMessage.includes('409')) {
      // Conflict errors - handled separately
      return {
        success: false,
        itemId: item.id!,
        error: `Data conflict: ${errorMessage}`,
        retryCount: item.retryCount,
        errorType: 'conflict'
      };
    } else {
      // Unknown errors - retryable with caution
      return {
        success: false,
        itemId: item.id!,
        error: errorMessage,
        retryCount: item.retryCount,
        errorType: 'unknown'
      };
    }
  }

  // Get sync statistics with enhanced health assessment
  async getSyncStats(): Promise<{
    pending: number;
    failed: number;
    lastSync: Date | null;
    syncHealth: 'good' | 'warning' | 'critical';
    degradationLevel: 'none' | 'minor' | 'moderate' | 'severe';
    recommendations: string[];
  }> {
    const stats = await SyncQueueStore.getStats();
    const health = await SyncQueueStore.getHealthStatus();

    // Enhanced health assessment
    let syncHealth: 'good' | 'warning' | 'critical' = 'good';
    let degradationLevel: 'none' | 'minor' | 'moderate' | 'severe' = 'none';
    const recommendations: string[] = [];

    // Assess sync health
    if (stats.total > 100) {
      syncHealth = 'critical';
      degradationLevel = 'severe';
      recommendations.push('High sync queue volume detected. Consider manual intervention.');
    } else if (stats.total > 50) {
      syncHealth = 'critical';
      degradationLevel = 'moderate';
      recommendations.push('Elevated sync queue. Monitor for network issues.');
    } else if (stats.retryCount > 20) {
      syncHealth = 'warning';
      degradationLevel = 'minor';
      recommendations.push('Multiple failed sync attempts. Check network connectivity.');
    } else if (stats.retryCount > 10) {
      syncHealth = 'warning';
      degradationLevel = 'minor';
      recommendations.push('Some sync failures detected.');
    }

    // Check for specific error patterns
    if (stats.retryCount > 0) {
      const failedItems = await SyncQueueStore.getItemsNeedingRetry();
      const clientErrors = failedItems.filter(item => 
        item.error && item.error.includes('Client error')
      ).length;
      
      if (clientErrors > 0) {
        recommendations.push(`${clientErrors} items have client errors and won't be retried.`);
      }
    }

    return {
      pending: stats.pendingCount,
      failed: stats.retryCount,
      lastSync: null, // TODO: Track last successful sync
      syncHealth,
      degradationLevel,
      recommendations
    };
  }

  // Clear old sync items
  async cleanupOldItems(daysOld: number = 7): Promise<number> {
    return await SyncQueueStore.clearOldItems(daysOld);
  }
}

export default BackgroundSyncService;
