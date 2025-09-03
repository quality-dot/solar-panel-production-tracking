// Data Retention Management Service
// Provides comprehensive data retention management for 7-year compliance
// Task 10.4.5 - Implement Data Retention Management for 7-Year Compliance

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';
import { manufacturingLogger } from '../middleware/logger.js';
import exportService from './exportService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DataRetentionService {
  constructor() {
    this.logger = manufacturingLogger;
    this.retentionYears = 7;
    this.retentionDays = this.retentionYears * 365;
    this.archiveDir = path.join(__dirname, '../archives');
    this.ensureArchiveDirectory();
  }

  /**
   * Ensure archive directory exists
   */
  ensureArchiveDirectory() {
    if (!fs.existsSync(this.archiveDir)) {
      fs.mkdirSync(this.archiveDir, { recursive: true });
    }
  }

  /**
   * Get data retention policy configuration
   * @returns {Object} Retention policy configuration
   */
  getRetentionPolicy() {
    return {
      retentionYears: this.retentionYears,
      retentionDays: this.retentionDays,
      cutoffDate: this.getCutoffDate(),
      tables: {
        manufacturing_orders: {
          retentionYears: this.retentionYears,
          archiveBeforeDelete: true,
          criticalData: true
        },
        panels: {
          retentionYears: this.retentionYears,
          archiveBeforeDelete: true,
          criticalData: true
        },
        mo_progress_tracking: {
          retentionYears: this.retentionYears,
          archiveBeforeDelete: true,
          criticalData: false
        },
        mo_alerts: {
          retentionYears: this.retentionYears,
          archiveBeforeDelete: true,
          criticalData: false
        },
        mo_closure_audit: {
          retentionYears: this.retentionYears,
          archiveBeforeDelete: true,
          criticalData: true
        },
        inspections: {
          retentionYears: this.retentionYears,
          archiveBeforeDelete: true,
          criticalData: true
        },
        pallets: {
          retentionYears: this.retentionYears,
          archiveBeforeDelete: true,
          criticalData: true
        },
        rework_history: {
          retentionYears: this.retentionYears,
          archiveBeforeDelete: true,
          criticalData: false
        }
      }
    };
  }

  /**
   * Get cutoff date for data retention
   * @returns {Date} Cutoff date
   */
  getCutoffDate() {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - this.retentionYears);
    return cutoffDate;
  }

  /**
   * Analyze data retention status across all tables
   * @param {Object} options - Analysis options
   * @returns {Object} Comprehensive retention analysis
   */
  async analyzeDataRetention(options = {}) {
    try {
      const {
        includeStorageAnalysis = true,
        includeComplianceCheck = true,
        includeRecommendations = true
      } = options;

      const cutoffDate = this.getCutoffDate();
      const policy = this.getRetentionPolicy();

      // Analyze each table
      const tableAnalysis = {};
      let totalRecordsEligibleForArchival = 0;
      let totalStorageEligibleForArchival = 0;

      for (const [tableName, tablePolicy] of Object.entries(policy.tables)) {
        const analysis = await this.analyzeTableRetention(tableName, cutoffDate, tablePolicy);
        tableAnalysis[tableName] = analysis;
        totalRecordsEligibleForArchival += analysis.eligibleForArchival;
        totalStorageEligibleForArchival += analysis.estimatedStorageMB;
      }

      // Get overall database statistics
      const dbStats = await this.getDatabaseStatistics();

      // Storage analysis
      let storageAnalysis = null;
      if (includeStorageAnalysis) {
        storageAnalysis = await this.analyzeStorageUsage();
      }

      // Compliance check
      let complianceCheck = null;
      if (includeComplianceCheck) {
        complianceCheck = await this.performComplianceCheck(cutoffDate);
      }

      // Generate recommendations
      let recommendations = null;
      if (includeRecommendations) {
        recommendations = this.generateRetentionRecommendations(tableAnalysis, dbStats, storageAnalysis);
      }

      this.logger.info('Data retention analysis completed', {
        totalRecordsEligibleForArchival,
        totalStorageEligibleForArchival,
        cutoffDate
      });

      return {
        policy,
        cutoffDate,
        tableAnalysis,
        summary: {
          totalRecordsEligibleForArchival,
          totalStorageEligibleForArchival,
          totalTables: Object.keys(policy.tables).length
        },
        databaseStatistics: dbStats,
        storageAnalysis,
        complianceCheck,
        recommendations,
        analyzedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to analyze data retention', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Analyze retention for a specific table
   * @param {string} tableName - Table name
   * @param {Date} cutoffDate - Cutoff date
   * @param {Object} tablePolicy - Table retention policy
   * @returns {Object} Table retention analysis
   */
  async analyzeTableRetention(tableName, cutoffDate, tablePolicy) {
    try {
      // Check if table exists
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `;
      const tableExistsResult = await db.query(tableExistsQuery, [tableName]);
      
      if (!tableExistsResult.rows[0].exists) {
        return {
          exists: false,
          totalRecords: 0,
          eligibleForArchival: 0,
          withinRetentionPeriod: 0,
          estimatedStorageMB: 0,
          oldestRecord: null,
          newestRecord: null
        };
      }

      // Get table statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN created_at < $1 THEN 1 END) as eligible_for_archival,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as within_retention_period,
          MIN(created_at) as oldest_record,
          MAX(created_at) as newest_record
        FROM ${tableName}
      `;

      const statsResult = await db.query(statsQuery, [cutoffDate]);
      const stats = statsResult.rows[0];

      // Estimate storage usage
      const storageQuery = `
        SELECT pg_size_pretty(pg_total_relation_size($1)) as size_pretty,
               pg_total_relation_size($1) as size_bytes
      `;
      const storageResult = await db.query(storageQuery, [tableName]);
      const storageSize = storageResult.rows[0];

      // Calculate estimated storage for archival data
      const totalRecords = parseInt(stats.total_records) || 0;
      const eligibleRecords = parseInt(stats.eligible_for_archival) || 0;
      const totalSizeBytes = parseInt(storageSize.size_bytes) || 0;
      const estimatedStorageMB = totalRecords > 0 
        ? Math.round((totalSizeBytes / totalRecords) * eligibleRecords / (1024 * 1024) * 100) / 100
        : 0;

      return {
        exists: true,
        totalRecords: totalRecords,
        eligibleForArchival: eligibleRecords,
        withinRetentionPeriod: parseInt(stats.within_retention_period) || 0,
        estimatedStorageMB: estimatedStorageMB,
        oldestRecord: stats.oldest_record,
        newestRecord: stats.newest_record,
        totalSizeBytes: totalSizeBytes,
        sizePretty: storageSize.size_pretty,
        policy: tablePolicy
      };

    } catch (error) {
      this.logger.error(`Failed to analyze retention for table ${tableName}`, {
        error: error.message,
        tableName,
        cutoffDate
      });
      throw error;
    }
  }

  /**
   * Get overall database statistics
   * @returns {Object} Database statistics
   */
  async getDatabaseStatistics() {
    try {
      const statsQuery = `
        SELECT 
          pg_database_size(current_database()) as database_size_bytes,
          pg_size_pretty(pg_database_size(current_database())) as database_size_pretty,
          (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public') as total_columns
      `;

      const result = await db.query(statsQuery);
      const stats = result.rows[0];

      return {
        databaseSizeBytes: parseInt(stats.database_size_bytes) || 0,
        databaseSizePretty: stats.database_size_pretty,
        totalTables: parseInt(stats.total_tables) || 0,
        totalColumns: parseInt(stats.total_columns) || 0
      };

    } catch (error) {
      this.logger.error('Failed to get database statistics', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Analyze storage usage across tables
   * @returns {Object} Storage analysis
   */
  async analyzeStorageUsage() {
    try {
      const storageQuery = `
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size_pretty,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size_pretty,
          pg_relation_size(schemaname||'.'||tablename) as table_size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `;

      const result = await db.query(storageQuery);
      const tables = result.rows;

      const totalSizeBytes = tables.reduce((sum, table) => sum + parseInt(table.size_bytes), 0);
      const totalSizeMB = Math.round(totalSizeBytes / (1024 * 1024) * 100) / 100;

      return {
        tables: tables.map(table => ({
          name: table.tablename,
          totalSizeBytes: parseInt(table.size_bytes),
          totalSizePretty: table.size_pretty,
          tableSizeBytes: parseInt(table.table_size_bytes),
          tableSizePretty: table.table_size_pretty
        })),
        summary: {
          totalTables: tables.length,
          totalSizeBytes,
          totalSizeMB,
          totalSizePretty: this.formatBytes(totalSizeBytes)
        }
      };

    } catch (error) {
      this.logger.error('Failed to analyze storage usage', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Perform compliance check for data retention
   * @param {Date} cutoffDate - Cutoff date
   * @returns {Object} Compliance check results
   */
  async performComplianceCheck(cutoffDate) {
    try {
      const policy = this.getRetentionPolicy();
      const complianceResults = {};

      for (const [tableName, tablePolicy] of Object.entries(policy.tables)) {
        const analysis = await this.analyzeTableRetention(tableName, cutoffDate, tablePolicy);
        
        complianceResults[tableName] = {
          compliant: analysis.eligibleForArchival === 0,
          eligibleForArchival: analysis.eligibleForArchival,
          totalRecords: analysis.totalRecords,
          complianceScore: analysis.totalRecords > 0 
            ? Math.round((analysis.withinRetentionPeriod / analysis.totalRecords) * 100)
            : 100,
          requiresAction: analysis.eligibleForArchival > 0,
          criticalData: tablePolicy.criticalData
        };
      }

      const overallCompliance = Object.values(complianceResults).every(result => result.compliant);
      const overallScore = Math.round(
        Object.values(complianceResults).reduce((sum, result) => sum + result.complianceScore, 0) / 
        Object.keys(complianceResults).length
      );

      return {
        overallCompliance,
        overallScore,
        tableResults: complianceResults,
        checkedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to perform compliance check', {
        error: error.message,
        cutoffDate
      });
      throw error;
    }
  }

  /**
   * Archive data for a specific table
   * @param {string} tableName - Table name
   * @param {Object} options - Archive options
   * @returns {Object} Archive result
   */
  async archiveTableData(tableName, options = {}) {
    try {
      const {
        dryRun = false,
        batchSize = 1000,
        includeRelatedData = true
      } = options;

      const cutoffDate = this.getCutoffDate();
      const tablePolicy = this.getRetentionPolicy().tables[tableName];

      if (!tablePolicy) {
        throw new Error(`No retention policy found for table: ${tableName}`);
      }

      // Get data to archive
      const dataQuery = `SELECT * FROM ${tableName} WHERE created_at < $1 ORDER BY created_at`;
      const dataResult = await db.query(dataQuery, [cutoffDate]);
      const dataToArchive = dataResult.rows;

      if (dataToArchive.length === 0) {
        return {
          success: true,
          message: `No data to archive for table ${tableName}`,
          recordsArchived: 0
        };
      }

      if (dryRun) {
        return {
          success: true,
          message: `Dry run: Would archive ${dataToArchive.length} records from ${tableName}`,
          recordsToArchive: dataToArchive.length,
          dryRun: true
        };
      }

      // Create archive file
      const archiveFilename = `${tableName}_archive_${this.generateTimestamp()}.json`;
      const archivePath = path.join(this.archiveDir, archiveFilename);

      const archiveData = {
        tableName,
        archivedAt: new Date().toISOString(),
        cutoffDate: cutoffDate.toISOString(),
        recordCount: dataToArchive.length,
        policy: tablePolicy,
        data: dataToArchive
      };

      fs.writeFileSync(archivePath, JSON.stringify(archiveData, null, 2));

      // Delete archived data from main table
      const deleteQuery = `DELETE FROM ${tableName} WHERE created_at < $1`;
      const deleteResult = await db.query(deleteQuery, [cutoffDate]);

      this.logger.info('Table data archived successfully', {
        tableName,
        recordsArchived: dataToArchive.length,
        archiveFile: archiveFilename
      });

      return {
        success: true,
        message: `Successfully archived ${dataToArchive.length} records from ${tableName}`,
        recordsArchived: dataToArchive.length,
        archiveFile: archiveFilename,
        archivePath
      };

    } catch (error) {
      this.logger.error('Failed to archive table data', {
        error: error.message,
        tableName,
        options
      });
      throw error;
    }
  }

  /**
   * Archive all eligible data across all tables
   * @param {Object} options - Archive options
   * @returns {Object} Archive results
   */
  async archiveAllEligibleData(options = {}) {
    try {
      const {
        dryRun = false,
        batchSize = 1000,
        tables = null // If null, archive all tables
      } = options;

      const policy = this.getRetentionPolicy();
      const tablesToArchive = tables || Object.keys(policy.tables);
      const results = {};

      for (const tableName of tablesToArchive) {
        try {
          const result = await this.archiveTableData(tableName, {
            dryRun,
            batchSize
          });
          results[tableName] = result;
        } catch (error) {
          results[tableName] = {
            success: false,
            error: error.message
          };
        }
      }

      const successCount = Object.values(results).filter(r => r.success).length;
      const totalRecordsArchived = Object.values(results).reduce((sum, r) => sum + (r.recordsArchived || 0), 0);

      this.logger.info('Bulk archive operation completed', {
        tablesProcessed: tablesToArchive.length,
        successCount,
        totalRecordsArchived,
        dryRun
      });

      return {
        success: successCount === tablesToArchive.length,
        results,
        summary: {
          tablesProcessed: tablesToArchive.length,
          successCount,
          failureCount: tablesToArchive.length - successCount,
          totalRecordsArchived
        }
      };

    } catch (error) {
      this.logger.error('Failed to archive all eligible data', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Restore data from archive
   * @param {string} archiveFilename - Archive filename
   * @param {Object} options - Restore options
   * @returns {Object} Restore result
   */
  async restoreFromArchive(archiveFilename, options = {}) {
    try {
      const {
        dryRun = false,
        overwriteExisting = false
      } = options;

      const archivePath = path.join(this.archiveDir, archiveFilename);
      
      if (!fs.existsSync(archivePath)) {
        throw new Error(`Archive file not found: ${archiveFilename}`);
      }

      const archiveData = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
      const { tableName, data, archivedAt } = archiveData;

      if (dryRun) {
        return {
          success: true,
          message: `Dry run: Would restore ${data.length} records to ${tableName}`,
          recordsToRestore: data.length,
          dryRun: true
        };
      }

      // Check if table has existing data
      const existingCountQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
      const existingCountResult = await db.query(existingCountQuery);
      const existingCount = parseInt(existingCountResult.rows[0].count);

      if (existingCount > 0 && !overwriteExisting) {
        throw new Error(`Table ${tableName} contains ${existingCount} existing records. Use overwriteExisting=true to proceed.`);
      }

      // Restore data in batches
      const batchSize = 1000;
      let restoredCount = 0;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        // Build INSERT query
        const columns = Object.keys(batch[0]);
        const placeholders = batch.map((_, index) => 
          `(${columns.map((_, colIndex) => `$${index * columns.length + colIndex + 1}`).join(', ')})`
        ).join(', ');
        
        const insertQuery = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES ${placeholders}
          ON CONFLICT DO NOTHING
        `;
        
        const values = batch.flatMap(record => columns.map(col => record[col]));
        await db.query(insertQuery, values);
        
        restoredCount += batch.length;
      }

      this.logger.info('Data restored from archive successfully', {
        archiveFile: archiveFilename,
        tableName,
        recordsRestored: restoredCount
      });

      return {
        success: true,
        message: `Successfully restored ${restoredCount} records to ${tableName}`,
        recordsRestored: restoredCount,
        tableName,
        archiveFile: archiveFilename
      };

    } catch (error) {
      this.logger.error('Failed to restore from archive', {
        error: error.message,
        archiveFilename,
        options
      });
      throw error;
    }
  }

  /**
   * Generate retention recommendations
   * @param {Object} tableAnalysis - Table analysis results
   * @param {Object} dbStats - Database statistics
   * @param {Object} storageAnalysis - Storage analysis
   * @returns {Array} Recommendations
   */
  generateRetentionRecommendations(tableAnalysis, dbStats, storageAnalysis) {
    const recommendations = [];

    // Check for tables with data eligible for archival
    Object.entries(tableAnalysis).forEach(([tableName, analysis]) => {
      if (analysis.eligibleForArchival > 0) {
        recommendations.push({
          type: 'ARCHIVAL',
          priority: analysis.policy.criticalData ? 'HIGH' : 'MEDIUM',
          table: tableName,
          message: `${tableName} has ${analysis.eligibleForArchival} records eligible for archival`,
          action: `Archive ${analysis.eligibleForArchival} records from ${tableName} to maintain compliance`,
          estimatedStorageMB: analysis.estimatedStorageMB
        });
      }
    });

    // Check for large tables that might benefit from partitioning
    if (storageAnalysis) {
      const largeTables = storageAnalysis.tables.filter(table => table.totalSizeMB > 1000);
      if (largeTables.length > 0) {
        recommendations.push({
          type: 'PERFORMANCE',
          priority: 'MEDIUM',
          message: `${largeTables.length} tables exceed 1GB and may benefit from partitioning`,
          action: 'Consider implementing table partitioning for large tables to improve query performance',
          tables: largeTables.map(t => t.name)
        });
      }
    }

    // Check overall database size
    if (dbStats.databaseSizeBytes > 10 * 1024 * 1024 * 1024) { // 10GB
      recommendations.push({
        type: 'STORAGE',
        priority: 'HIGH',
        message: `Database size is ${dbStats.databaseSizePretty}, approaching storage limits`,
        action: 'Implement data archival strategy to reduce database size and improve performance'
      });
    }

    // Check compliance status
    const nonCompliantTables = Object.entries(tableAnalysis).filter(([_, analysis]) => analysis.eligibleForArchival > 0);
    if (nonCompliantTables.length > 0) {
      recommendations.push({
        type: 'COMPLIANCE',
        priority: 'HIGH',
        message: `${nonCompliantTables.length} tables are not compliant with 7-year retention policy`,
        action: 'Archive eligible data immediately to maintain regulatory compliance',
        nonCompliantTables: nonCompliantTables.map(([name, _]) => name)
      });
    }

    return recommendations;
  }

  /**
   * Get list of archive files
   * @param {Object} filters - Filter criteria
   * @returns {Array} List of archive files
   */
  async getArchiveFiles(filters = {}) {
    try {
      const { tableName, dateFrom, dateTo } = filters;
      
      const files = fs.readdirSync(this.archiveDir);
      let filteredFiles = files.filter(file => file.endsWith('.json'));

      // Filter by table name
      if (tableName) {
        filteredFiles = filteredFiles.filter(file => file.startsWith(`${tableName}_archive_`));
      }

      // Filter by date range
      if (dateFrom || dateTo) {
        filteredFiles = filteredFiles.filter(file => {
          const stats = fs.statSync(path.join(this.archiveDir, file));
          const fileDate = stats.mtime;
          
          if (dateFrom && fileDate < new Date(dateFrom)) return false;
          if (dateTo && fileDate > new Date(dateTo)) return false;
          
          return true;
        });
      }

      // Get file information
      const fileInfo = filteredFiles.map(file => {
        const filepath = path.join(this.archiveDir, file);
        const stats = fs.statSync(filepath);
        
        // Try to read archive metadata
        let metadata = null;
        try {
          const content = fs.readFileSync(filepath, 'utf8');
          const archiveData = JSON.parse(content);
          metadata = {
            tableName: archiveData.tableName,
            recordCount: archiveData.recordCount,
            archivedAt: archiveData.archivedAt,
            cutoffDate: archiveData.cutoffDate
          };
        } catch (error) {
          // If we can't read metadata, just use file stats
        }
        
        return {
          filename: file,
          filepath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          metadata
        };
      });

      return fileInfo.sort((a, b) => b.modified - a.modified);

    } catch (error) {
      this.logger.error('Failed to get archive files', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Delete archive file
   * @param {string} filename - Archive filename
   * @returns {Object} Deletion result
   */
  async deleteArchiveFile(filename) {
    try {
      const filepath = path.join(this.archiveDir, filename);
      
      if (!fs.existsSync(filepath)) {
        throw new Error(`Archive file ${filename} not found`);
      }

      fs.unlinkSync(filepath);

      this.logger.info('Archive file deleted', { filename });

      return {
        success: true,
        message: `Archive file ${filename} deleted successfully`
      };

    } catch (error) {
      this.logger.error('Failed to delete archive file', {
        error: error.message,
        filename
      });
      throw error;
    }
  }

  /**
   * Generate timestamp for filenames
   * @returns {string} Timestamp string
   */
  generateTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
  }

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default new DataRetentionService();
