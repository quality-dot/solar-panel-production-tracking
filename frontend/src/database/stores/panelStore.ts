import { db, Panel, withErrorHandling } from '../config';

export interface PanelFilters {
  status?: Panel['status'];
  type?: string;
  barcode?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PanelSearchOptions {
  query: string;
  limit?: number;
  offset?: number;
}

export class PanelStore {
  // Create a new panel
  static async create(panelData: Omit<Panel, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    return await withErrorHandling(async () => {
      const now = new Date();
      const panel: Omit<Panel, 'id'> = {
        ...panelData,
        createdAt: now,
        updatedAt: now
      };
      
      return await db.panels.add(panel);
    });
  }

  // Get panel by ID
  static async getById(id: number): Promise<Panel | undefined> {
    return await withErrorHandling(async () => {
      return await db.panels.get(id);
    });
  }

  // Get panel by barcode
  static async getByBarcode(barcode: string): Promise<Panel | undefined> {
    return await withErrorHandling(async () => {
      return await db.panels.where('barcode').equals(barcode).first();
    });
  }

  // Get all panels with optional filtering
  static async getAll(filters?: PanelFilters): Promise<Panel[]> {
    return await withErrorHandling(async () => {
      let collection = db.panels.toCollection();
      
      if (filters?.status) {
        collection = collection.filter(panel => panel.status === filters.status);
      }
      
      if (filters?.type) {
        collection = collection.filter(panel => panel.type === filters.type);
      }
      
      if (filters?.barcode) {
        collection = collection.filter(panel => 
          panel.barcode.toLowerCase().includes(filters.barcode!.toLowerCase())
        );
      }
      
      if (filters?.dateFrom) {
        collection = collection.filter(panel => panel.createdAt >= filters.dateFrom!);
      }
      
      if (filters?.dateTo) {
        collection = collection.filter(panel => panel.createdAt <= filters.dateTo!);
      }
      
      return await collection.toArray();
    });
  }

  // Get panels by status
  static async getByStatus(status: Panel['status']): Promise<Panel[]> {
    return await withErrorHandling(async () => {
      return await db.panels.where('status').equals(status).toArray();
    });
  }

  // Get panels by type
  static async getByType(type: string): Promise<Panel[]> {
    return await withErrorHandling(async () => {
      return await db.panels.where('type').equals(type).toArray();
    });
  }

  // Search panels by barcode or type
  static async search(options: PanelSearchOptions): Promise<Panel[]> {
    return await withErrorHandling(async () => {
      const { query, limit = 50, offset = 0 } = options;
      const lowerQuery = query.toLowerCase();
      
      let results = await db.panels
        .filter(panel => 
          panel.barcode.toLowerCase().includes(lowerQuery) ||
          panel.type.toLowerCase().includes(lowerQuery)
        )
        .toArray();
      
      // Apply pagination
      return results.slice(offset, offset + limit);
    });
  }

  // Update panel
  static async update(id: number, updates: Partial<Omit<Panel, 'id' | 'createdAt'>>): Promise<void> {
    return await withErrorHandling(async () => {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      await db.panels.update(id, updateData);
    });
  }

  // Update panel status
  static async updateStatus(id: number, status: Panel['status']): Promise<void> {
    return await withErrorHandling(async () => {
      await db.panels.update(id, {
        status,
        updatedAt: new Date()
      });
    });
  }

  // Update panel specifications
  static async updateSpecifications(id: number, specifications: Record<string, any>): Promise<void> {
    return await withErrorHandling(async () => {
      await db.panels.update(id, {
        specifications,
        updatedAt: new Date()
      });
    });
  }

  // Delete panel
  static async delete(id: number): Promise<void> {
    return await withErrorHandling(async () => {
      await db.panels.delete(id);
    });
  }

  // Bulk create panels
  static async bulkCreate(panels: Omit<Panel, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number[]> {
    return await withErrorHandling(async () => {
      const now = new Date();
      const panelsWithTimestamps = panels.map(panel => ({
        ...panel,
        createdAt: now,
        updatedAt: now
      }));
      
      return await db.panels.bulkAdd(panelsWithTimestamps);
    });
  }

  // Bulk update panels
  static async bulkUpdate(updates: Array<{ id: number; updates: Partial<Omit<Panel, 'id' | 'createdAt'>> }>): Promise<void> {
    return await withErrorHandling(async () => {
      const now = new Date();
      
      await db.transaction('rw', db.panels, async () => {
        for (const { id, updates: updateData } of updates) {
          await db.panels.update(id, {
            ...updateData,
            updatedAt: now
          });
        }
      });
    });
  }

  // Get panel count by status
  static async getCountByStatus(): Promise<Record<Panel['status'], number>> {
    return await withErrorHandling(async () => {
      const pending = await db.panels.where('status').equals('pending').count();
      const inProduction = await db.panels.where('status').equals('in_production').count();
      const completed = await db.panels.where('status').equals('completed').count();
      const failed = await db.panels.where('status').equals('failed').count();
      
      return {
        pending,
        in_production: inProduction,
        completed,
        failed
      };
    });
  }

  // Get panel count by type
  static async getCountByType(): Promise<Record<string, number>> {
    return await withErrorHandling(async () => {
      const panels = await db.panels.toArray();
      const typeCounts: Record<string, number> = {};
      
      panels.forEach(panel => {
        typeCounts[panel.type] = (typeCounts[panel.type] || 0) + 1;
      });
      
      return typeCounts;
    });
  }

  // Get recent panels
  static async getRecent(limit: number = 10): Promise<Panel[]> {
    return await withErrorHandling(async () => {
      return await db.panels
        .orderBy('createdAt')
        .reverse()
        .limit(limit)
        .toArray();
    });
  }

  // Get panels created in date range
  static async getByDateRange(from: Date, to: Date): Promise<Panel[]> {
    return await withErrorHandling(async () => {
      return await db.panels
        .where('createdAt')
        .between(from, to, true, true)
        .toArray();
    });
  }

  // Check if barcode exists
  static async barcodeExists(barcode: string): Promise<boolean> {
    return await withErrorHandling(async () => {
      const count = await db.panels.where('barcode').equals(barcode).count();
      return count > 0;
    });
  }

  // Get unique panel types
  static async getUniqueTypes(): Promise<string[]> {
    return await withErrorHandling(async () => {
      const panels = await db.panels.toArray();
      const types = new Set(panels.map(panel => panel.type));
      return Array.from(types).sort();
    });
  }

  // Clear all panels (use with caution)
  static async clearAll(): Promise<void> {
    return await withErrorHandling(async () => {
      await db.panels.clear();
    });
  }

  // Get database statistics
  static async getStats(): Promise<{
    total: number;
    byStatus: Record<Panel['status'], number>;
    byType: Record<string, number>;
    oldest: Date | null;
    newest: Date | null;
  }> {
    return await withErrorHandling(async () => {
      const panels = await db.panels.toArray();
      const total = panels.length;
      
      const byStatus = await this.getCountByStatus();
      const byType = await this.getCountByType();
      
      const dates = panels.map(panel => panel.createdAt).sort();
      const oldest = dates.length > 0 ? dates[0] : null;
      const newest = dates.length > 0 ? dates[dates.length - 1] : null;
      
      return {
        total,
        byStatus,
        byType,
        oldest,
        newest
      };
    });
  }
}

export default PanelStore;
