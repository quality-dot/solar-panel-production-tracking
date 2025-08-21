import { db, Inspection, withErrorHandling } from '../config';

export interface InspectionFilters {
  panelId?: number;
  station?: string;
  status?: Inspection['status'];
  operator?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface InspectionSearchOptions {
  query: string;
  limit?: number;
  offset?: number;
}

export interface InspectionStats {
  total: number;
  byStatus: Record<Inspection['status'], number>;
  byStation: Record<string, number>;
  byOperator: Record<string, number>;
  passRate: number;
  failRate: number;
}

export class InspectionStore {
  // Create a new inspection
  static async create(inspectionData: Omit<Inspection, 'id'>): Promise<number> {
    return await withErrorHandling(async () => {
      return await db.inspections.add(inspectionData);
    });
  }

  // Get inspection by ID
  static async getById(id: number): Promise<Inspection | undefined> {
    return await withErrorHandling(async () => {
      return await db.inspections.get(id);
    });
  }

  // Get inspections by panel ID
  static async getByPanelId(panelId: number): Promise<Inspection[]> {
    return await withErrorHandling(async () => {
      return await db.inspections
        .where('panelId')
        .equals(panelId)
        .sortBy('timestamp');
    });
  }

  // Get inspections by station
  static async getByStation(station: string): Promise<Inspection[]> {
    return await withErrorHandling(async () => {
      const results = await db.inspections
        .where('station')
        .equals(station)
        .sortBy('timestamp');
      return results.reverse();
    });
  }

  // Get inspections by status
  static async getByStatus(status: Inspection['status']): Promise<Inspection[]> {
    return await withErrorHandling(async () => {
      const results = await db.inspections
        .where('status')
        .equals(status)
        .sortBy('timestamp');
      return results.reverse();
    });
  }

  // Get inspections by operator
  static async getByOperator(operator: string): Promise<Inspection[]> {
    return await withErrorHandling(async () => {
      const results = await db.inspections
        .where('operator')
        .equals(operator)
        .sortBy('timestamp');
      return results.reverse();
    });
  }

  // Get all inspections with optional filtering
  static async getAll(filters?: InspectionFilters): Promise<Inspection[]> {
    return await withErrorHandling(async () => {
      let collection = db.inspections.toCollection();
      
      if (filters?.panelId) {
        collection = collection.filter(inspection => inspection.panelId === filters.panelId);
      }
      
      if (filters?.station) {
        collection = collection.filter(inspection => inspection.station === filters.station);
      }
      
      if (filters?.status) {
        collection = collection.filter(inspection => inspection.status === filters.status);
      }
      
      if (filters?.operator) {
        collection = collection.filter(inspection => inspection.operator === filters.operator);
      }
      
      if (filters?.dateFrom) {
        collection = collection.filter(inspection => inspection.timestamp >= filters.dateFrom!);
      }
      
      if (filters?.dateTo) {
        collection = collection.filter(inspection => inspection.timestamp <= filters.dateTo!);
      }
      
      const results = await collection.toArray();
      return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });
  }

  // Search inspections
  static async search(options: InspectionSearchOptions): Promise<Inspection[]> {
    return await withErrorHandling(async () => {
      const { query, limit = 50, offset = 0 } = options;
      const lowerQuery = query.toLowerCase();
      
      let results = await db.inspections
        .filter(inspection => 
          inspection.station.toLowerCase().includes(lowerQuery) ||
          inspection.operator.toLowerCase().includes(lowerQuery) ||
          inspection.status.toLowerCase().includes(lowerQuery)
        )
        .toArray();
      
      // Sort by timestamp (newest first)
      results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      // Apply pagination
      return results.slice(offset, offset + limit);
    });
  }

  // Update inspection
  static async update(id: number, updates: Partial<Omit<Inspection, 'id'>>): Promise<void> {
    return await withErrorHandling(async () => {
      await db.inspections.update(id, updates);
    });
  }

  // Update inspection status
  static async updateStatus(id: number, status: Inspection['status']): Promise<void> {
    return await withErrorHandling(async () => {
      await db.inspections.update(id, { status });
    });
  }

  // Update inspection results
  static async updateResults(id: number, results: Record<string, any>): Promise<void> {
    return await withErrorHandling(async () => {
      await db.inspections.update(id, { results });
    });
  }

  // Delete inspection
  static async delete(id: number): Promise<void> {
    return await withErrorHandling(async () => {
      await db.inspections.delete(id);
    });
  }

  // Bulk create inspections
  static async bulkCreate(inspections: Omit<Inspection, 'id'>[]): Promise<number[]> {
    return await withErrorHandling(async () => {
      return await db.inspections.bulkAdd(inspections);
    });
  }

  // Bulk update inspections
  static async bulkUpdate(updates: Array<{ id: number; updates: Partial<Omit<Inspection, 'id'>> }>): Promise<void> {
    return await withErrorHandling(async () => {
      await db.transaction('rw', db.inspections, async () => {
        for (const { id, updates: updateData } of updates) {
          await db.inspections.update(id, updateData);
        }
      });
    });
  }

  // Get inspection count by status
  static async getCountByStatus(): Promise<Record<Inspection['status'], number>> {
    return await withErrorHandling(async () => {
      const pass = await db.inspections.where('status').equals('pass').count();
      const fail = await db.inspections.where('status').equals('fail').count();
      const pending = await db.inspections.where('status').equals('pending').count();
      
      return { pass, fail, pending };
    });
  }

  // Get inspection count by station
  static async getCountByStation(): Promise<Record<string, number>> {
    return await withErrorHandling(async () => {
      const inspections = await db.inspections.toArray();
      const stationCounts: Record<string, number> = {};
      
      inspections.forEach(inspection => {
        stationCounts[inspection.station] = (stationCounts[inspection.station] || 0) + 1;
      });
      
      return stationCounts;
    });
  }

  // Get inspection count by operator
  static async getCountByOperator(): Promise<Record<string, number>> {
    return await withErrorHandling(async () => {
      const inspections = await db.inspections.toArray();
      const operatorCounts: Record<string, number> = {};
      
      inspections.forEach(inspection => {
        operatorCounts[inspection.operator] = (operatorCounts[inspection.operator] || 0) + 1;
      });
      
      return operatorCounts;
    });
  }

  // Get recent inspections
  static async getRecent(limit: number = 10): Promise<Inspection[]> {
    return await withErrorHandling(async () => {
      return await db.inspections
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
    });
  }

  // Get inspections in date range
  static async getByDateRange(from: Date, to: Date): Promise<Inspection[]> {
    return await withErrorHandling(async () => {
      return await db.inspections
        .where('timestamp')
        .between(from, to, true, true)
        .toArray();
    });
  }

  // Get inspections for a specific day
  static async getByDate(date: Date): Promise<Inspection[]> {
    return await withErrorHandling(async () => {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return await this.getByDateRange(startOfDay, endOfDay);
    });
  }

  // Get inspections for today
  static async getToday(): Promise<Inspection[]> {
    return await withErrorHandling(async () => {
      return await this.getByDate(new Date());
    });
  }

  // Get inspections for this week
  static async getThisWeek(): Promise<Inspection[]> {
    return await withErrorHandling(async () => {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      return await this.getByDateRange(startOfWeek, now);
    });
  }

  // Get inspections for this month
  static async getThisMonth(): Promise<Inspection[]> {
    return await withErrorHandling(async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      return await this.getByDateRange(startOfMonth, now);
    });
  }

  // Get unique stations
  static async getUniqueStations(): Promise<string[]> {
    return await withErrorHandling(async () => {
      const inspections = await db.inspections.toArray();
      const stations = new Set(inspections.map(inspection => inspection.station));
      return Array.from(stations).sort();
    });
  }

  // Get unique operators
  static async getUniqueOperators(): Promise<string[]> {
    return await withErrorHandling(async () => {
      const inspections = await db.inspections.toArray();
      const operators = new Set(inspections.map(inspection => inspection.operator));
      return Array.from(operators).sort();
    });
  }

  // Get pass/fail rate for a station
  static async getStationPassRate(station: string): Promise<number> {
    return await withErrorHandling(async () => {
      const stationInspections = await this.getByStation(station);
      const total = stationInspections.length;
      
      if (total === 0) return 0;
      
      const passed = stationInspections.filter(inspection => inspection.status === 'pass').length;
      return (passed / total) * 100;
    });
  }

  // Get pass/fail rate for an operator
  static async getOperatorPassRate(operator: string): Promise<number> {
    return await withErrorHandling(async () => {
      const operatorInspections = await this.getByOperator(operator);
      const total = operatorInspections.length;
      
      if (total === 0) return 0;
      
      const passed = operatorInspections.filter(inspection => inspection.status === 'pass').length;
      return (passed / total) * 100;
    });
  }

  // Get overall pass/fail rate
  static async getOverallPassRate(): Promise<number> {
    return await withErrorHandling(async () => {
      const total = await db.inspections.count();
      
      if (total === 0) return 0;
      
      const passed = await db.inspections.where('status').equals('pass').count();
      return (passed / total) * 100;
    });
  }

  // Clear all inspections (use with caution)
  static async clearAll(): Promise<void> {
    return await withErrorHandling(async () => {
      await db.inspections.clear();
    });
  }

  // Get comprehensive statistics
  static async getStats(): Promise<InspectionStats> {
    return await withErrorHandling(async () => {
      const total = await db.inspections.count();
      const byStatus = await this.getCountByStatus();
      const byStation = await this.getCountByStation();
      const byOperator = await this.getCountByOperator();
      
      const passRate = total > 0 ? (byStatus.pass / total) * 100 : 0;
      const failRate = total > 0 ? (byStatus.fail / total) * 100 : 0;
      
      return {
        total,
        byStatus,
        byStation,
        byOperator,
        passRate,
        failRate
      };
    });
  }

  // Get inspection trends over time
  static async getTrends(days: number = 30): Promise<Array<{ date: string; count: number; passCount: number; failCount: number }>> {
    return await withErrorHandling(async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
      
      const inspections = await this.getByDateRange(startDate, endDate);
      const trends: Record<string, { count: number; passCount: number; failCount: number }> = {};
      
      inspections.forEach(inspection => {
        const dateKey = inspection.timestamp.toISOString().split('T')[0];
        
        if (!trends[dateKey]) {
          trends[dateKey] = { count: 0, passCount: 0, failCount: 0 };
        }
        
        trends[dateKey].count++;
        if (inspection.status === 'pass') {
          trends[dateKey].passCount++;
        } else if (inspection.status === 'fail') {
          trends[dateKey].failCount++;
        }
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
}

export default InspectionStore;
