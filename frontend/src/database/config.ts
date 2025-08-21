import Dexie from 'dexie';

// Define interfaces for our database tables
export interface Panel {
  id?: number;
  barcode: string;
  type: string;
  specifications: Record<string, any>;
  status: 'pending' | 'in_production' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Inspection {
  id?: number;
  panelId: number;
  station: string;
  results: Record<string, any>;
  timestamp: Date;
  operator: string;
  status: 'pass' | 'fail' | 'pending';
}

export interface SyncQueue {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  retryCount: number;
  lastRetry?: Date;
}

// Extend Dexie to include our tables
export class SolarPanelDatabase extends Dexie {
  panels!: Table<Panel>;
  inspections!: Table<Inspection>;
  syncQueue!: Table<SyncQueue>;

  constructor() {
    super('SolarPanelDatabase');
    
    // Define database version and schema
    this.version(1).stores({
      panels: '++id, barcode, status, createdAt',
      inspections: '++id, panelId, station, timestamp, status',
      syncQueue: '++id, operation, table, priority, createdAt'
    });

    // Add indexes for better query performance
    this.version(2).stores({
      panels: '++id, barcode, status, createdAt, type',
      inspections: '++id, panelId, station, timestamp, status, operator',
      syncQueue: '++id, operation, table, priority, createdAt, retryCount'
    });
  }
}

// Create and export database instance
export const db = new SolarPanelDatabase();

// Database configuration constants
export const DB_CONFIG = {
  name: 'SolarPanelDatabase',
  version: 2,
  tables: {
    panels: 'panels',
    inspections: 'inspections',
    syncQueue: 'syncQueue'
  },
  // Cache configuration
  cache: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 1000 // Maximum number of items per table
  }
};

// Database utility functions
export const dbUtils = {
  // Clear all data (useful for testing and reset)
  async clearAll(): Promise<void> {
    await db.panels.clear();
    await db.inspections.clear();
    await db.syncQueue.clear();
  },

  // Get database size information
  async getDatabaseInfo(): Promise<{
    panels: number;
    inspections: number;
    syncQueue: number;
    totalSize: number;
  }> {
    const panelsCount = await db.panels.count();
    const inspectionsCount = await db.inspections.count();
    const syncQueueCount = await db.syncQueue.count();
    
    return {
      panels: panelsCount,
      inspections: inspectionsCount,
      syncQueue: syncQueueCount,
      totalSize: panelsCount + inspectionsCount + syncQueueCount
    };
  },

  // Export database for backup
  async exportData(): Promise<{
    panels: Panel[];
    inspections: Inspection[];
    syncQueue: SyncQueue[];
    exportedAt: Date;
  }> {
    const panels = await db.panels.toArray();
    const inspections = await db.inspections.toArray();
    const syncQueue = await db.syncQueue.toArray();
    
    return {
      panels,
      inspections,
      syncQueue,
      exportedAt: new Date()
    };
  },

  // Import data from backup
  async importData(data: {
    panels: Panel[];
    inspections: Inspection[];
    syncQueue: SyncQueue[];
  }): Promise<void> {
    await db.transaction('rw', [db.panels, db.inspections, db.syncQueue], async () => {
      // Clear existing data
      await db.panels.clear();
      await db.inspections.clear();
      await db.syncQueue.clear();
      
      // Import new data
      if (data.panels.length > 0) {
        await db.panels.bulkAdd(data.panels);
      }
      if (data.inspections.length > 0) {
        await db.inspections.bulkAdd(data.inspections);
      }
      if (data.syncQueue.length > 0) {
        await db.syncQueue.bulkAdd(data.syncQueue);
      }
    });
  }
};

// Error handling wrapper for database operations
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.error('Database operation failed:', error);
    
    // Log error for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    // Return fallback value if provided
    if (fallback !== undefined) {
      return fallback;
    }
    
    // Re-throw error if no fallback
    throw error;
  }
};

// Database health check
export const checkDatabaseHealth = async (): Promise<{
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
}> => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  try {
    // Check if database is accessible
    await db.open();
    
    // Check table access
    await db.panels.count();
    await db.inspections.count();
    await db.syncQueue.count();
    
    // Check database info
    const info = await dbUtils.getDatabaseInfo();
    
    // Check for potential issues
    if (info.totalSize > 10000) {
      issues.push('Database size is large, consider cleanup');
      recommendations.push('Implement data archiving strategy');
    }
    
    if (info.syncQueue > 100) {
      issues.push('Sync queue has many pending items');
      recommendations.push('Check network connectivity and sync status');
    }
    
    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations
    };
  } catch (error) {
    issues.push(`Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    recommendations.push('Check database configuration and browser storage');
    
    return {
      isHealthy: false,
      issues,
      recommendations
    };
  }
};

export default db;
