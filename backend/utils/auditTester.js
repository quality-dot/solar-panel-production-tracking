// Audit Trail Testing and Validation Framework
// Comprehensive testing for audit system compliance, performance, and data integrity

import { manufacturingLogger } from '../middleware/logger.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { encryptField, decryptField } from './encryption.js';
import databaseManager from '../config/database.js';

/**
 * Audit testing configuration
 */
export const AUDIT_TEST_CONFIG = {
  // Test categories and their importance
  testCategories: {
    COMPLIANCE: { importance: 'CRITICAL', weight: 0.3 },
    PERFORMANCE: { importance: 'HIGH', weight: 0.25 },
    DATA_INTEGRITY: { importance: 'HIGH', weight: 0.25 },
    RETENTION: { importance: 'MEDIUM', weight: 0.2 }
  },
  
  // Performance thresholds
  performance: {
    maxQueryTime: 1000, // 1 second
    maxInsertTime: 100, // 100ms
    maxBatchInsertTime: 500, // 500ms
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    maxConcurrentQueries: 100
  },
  
  // Compliance requirements
  compliance: {
    minRetentionYears: 7,
    requiredFields: ['event_type', 'event_category', 'action', 'user_id', 'event_timestamp'],
    requiredIndexes: ['event_type', 'user_id', 'created_at', 'target_table'],
    maxDataLoss: 0, // 0% data loss tolerance
    maxDuplicateEntries: 0.01 // 1% duplicate tolerance
  },
  
  // Data integrity requirements
  dataIntegrity: {
    maxNullValues: 0.05, // 5% null values tolerance
    maxInvalidTimestamps: 0, // 0% invalid timestamps
    maxInvalidUUIDs: 0, // 0% invalid UUIDs
    maxOrphanedReferences: 0.01 // 1% orphaned references tolerance
  }
};

/**
 * Audit test results
 */
class AuditTestResult {
  constructor(testName, category) {
    this.testName = testName;
    this.category = category;
    this.status = 'pending';
    this.compliance = 'UNKNOWN';
    this.description = '';
    this.recommendations = [];
    this.executionTime = 0;
    this.timestamp = new Date();
    this.metrics = {};
    this.errors = [];
  }

  markPassed(description = 'Test passed successfully') {
    this.status = 'PASSED';
    this.compliance = 'COMPLIANT';
    this.description = description;
  }

  markFailed(compliance, description, recommendations = []) {
    this.status = 'FAILED';
    this.compliance = compliance;
    this.description = description;
    this.recommendations = recommendations;
  }

  markWarning(description, recommendations = []) {
    this.status = 'WARNING';
    this.compliance = 'PARTIALLY_COMPLIANT';
    this.description = description;
    this.recommendations = recommendations;
  }

  addMetric(key, value) {
    this.metrics[key] = value;
  }

  addError(error) {
    this.errors.push(error);
  }
}

/**
 * Main audit testing framework
 */
class AuditTester {
  constructor() {
    this.results = [];
    this.startTime = null;
    this.endTime = null;
    this.overallCompliance = 'UNKNOWN';
    this.testData = [];
  }

  /**
   * Run comprehensive audit testing
   */
  async runAuditTests() {
    try {
      this.startTime = new Date();
      manufacturingLogger.info('Starting comprehensive audit testing', {
        category: 'audit_testing'
      });

      // Run all test categories
      await this.runComplianceTests();
      await this.runPerformanceTests();
      await this.runDataIntegrityTests();
      await this.runRetentionTests();
      await this.runLoadTests();

      this.calculateOverallCompliance();
      this.generateReport();

      this.endTime = new Date();
      const duration = this.endTime - this.startTime;

      manufacturingLogger.info('Audit testing completed', {
        duration: `${duration}ms`,
        overallCompliance: this.overallCompliance,
        category: 'audit_testing'
      });

      return this.getTestReport();
    } catch (error) {
      manufacturingLogger.error('Audit testing failed', {
        error: error.message,
        category: 'audit_testing'
      });
      throw error;
    }
  }

  /**
   * Test compliance requirements
   */
  async runComplianceTests() {
    const category = 'COMPLIANCE';
    
    // Test 1: Required Fields Compliance
    const requiredFieldsTest = new AuditTestResult('Required Fields Compliance', category);
    try {
      const startTime = Date.now();
      
      const requiredFields = AUDIT_TEST_CONFIG.compliance.requiredFields;
      const query = `
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN event_type IS NULL THEN 1 END) as null_event_type,
          COUNT(CASE WHEN event_category IS NULL THEN 1 END) as null_event_category,
          COUNT(CASE WHEN action IS NULL THEN 1 END) as null_action,
          COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_id,
          COUNT(CASE WHEN event_timestamp IS NULL THEN 1 END) as null_timestamp
        FROM audit_logs
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `;
      
      const result = await databaseManager.getPool().query(query);
      const data = result.rows[0];
      
      requiredFieldsTest.addMetric('totalRecords', data.total_records);
      requiredFieldsTest.addMetric('nullEventType', data.null_event_type);
      requiredFieldsTest.addMetric('nullEventCategory', data.null_event_category);
      requiredFieldsTest.addMetric('nullAction', data.null_action);
      requiredFieldsTest.addMetric('nullUserId', data.null_user_id);
      requiredFieldsTest.addMetric('nullTimestamp', data.null_timestamp);
      
      const nullCounts = [
        data.null_event_type,
        data.null_event_category,
        data.null_action,
        data.null_user_id,
        data.null_timestamp
      ];
      
      const totalNulls = nullCounts.reduce((sum, count) => sum + parseInt(count), 0);
      const nullPercentage = data.total_records > 0 ? (totalNulls / data.total_records) * 100 : 0;
      
      if (nullPercentage === 0) {
        requiredFieldsTest.markPassed('All required fields are properly populated');
      } else {
        requiredFieldsTest.markFailed('NON_COMPLIANT', 
          `${nullPercentage.toFixed(2)}% of records have missing required fields`, [
          'Ensure all required fields are populated during audit log creation',
          'Add database constraints to prevent NULL values',
          'Implement validation in application layer'
        ]);
      }
      
      requiredFieldsTest.executionTime = Date.now() - startTime;
    } catch (error) {
      requiredFieldsTest.markFailed('NON_COMPLIANT', `Required fields test failed: ${error.message}`);
    }
    this.results.push(requiredFieldsTest);

    // Test 2: Required Indexes Compliance
    const indexesTest = new AuditTestResult('Required Indexes Compliance', category);
    try {
      const startTime = Date.now();
      
      const requiredIndexes = AUDIT_TEST_CONFIG.compliance.requiredIndexes;
      const query = `
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE tablename = 'audit_logs' 
        AND indexname NOT LIKE '%_pkey'
      `;
      
      const result = await databaseManager.getPool().query(query);
      const existingIndexes = result.rows.map(row => row.indexname);
      
      indexesTest.addMetric('existingIndexes', existingIndexes);
      indexesTest.addMetric('requiredIndexes', requiredIndexes);
      
      const missingIndexes = requiredIndexes.filter(index => 
        !existingIndexes.some(existing => existing.includes(index))
      );
      
      if (missingIndexes.length === 0) {
        indexesTest.markPassed('All required indexes are present');
      } else {
        indexesTest.markFailed('NON_COMPLIANT', 
          `Missing required indexes: ${missingIndexes.join(', ')}`, [
          'Create missing indexes for performance optimization',
          'Verify index creation scripts are included in migrations',
          'Monitor index performance and usage'
        ]);
      }
      
      indexesTest.executionTime = Date.now() - startTime;
    } catch (error) {
      indexesTest.markFailed('NON_COMPLIANT', `Indexes test failed: ${error.message}`);
    }
    this.results.push(indexesTest);

    // Test 3: Data Retention Compliance
    const retentionTest = new AuditTestResult('Data Retention Compliance', category);
    try {
      const startTime = Date.now();
      
      const minRetentionYears = AUDIT_TEST_CONFIG.compliance.minRetentionYears;
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - minRetentionYears);
      
      const query = `
        SELECT COUNT(*) as old_records
        FROM audit_logs
        WHERE created_at < $1
      `;
      
      const result = await databaseManager.getPool().query(query, [cutoffDate]);
      const oldRecords = parseInt(result.rows[0].old_records);
      
      retentionTest.addMetric('oldRecords', oldRecords);
      retentionTest.addMetric('minRetentionYears', minRetentionYears);
      retentionTest.addMetric('cutoffDate', cutoffDate.toISOString());
      
      if (oldRecords === 0) {
        retentionTest.markPassed(`Data retention policy is properly enforced (${minRetentionYears} years)`);
      } else {
        retentionTest.markWarning(`${oldRecords} records are older than ${minRetentionYears} years`, [
          'Implement automated data cleanup for old records',
          'Verify retention policy is being enforced',
          'Consider archiving old records instead of deletion'
        ]);
      }
      
      retentionTest.executionTime = Date.now() - startTime;
    } catch (error) {
      retentionTest.markFailed('NON_COMPLIANT', `Retention test failed: ${error.message}`);
    }
    this.results.push(retentionTest);
  }

  /**
   * Test performance requirements
   */
  async runPerformanceTests() {
    const category = 'PERFORMANCE';
    
    // Test 1: Query Performance
    const queryPerformanceTest = new AuditTestResult('Query Performance', category);
    try {
      const startTime = Date.now();
      
      const queries = [
        {
          name: 'Recent Events by User',
          sql: 'SELECT * FROM audit_logs WHERE user_id = $1 AND created_at >= NOW() - INTERVAL \'7 days\' ORDER BY created_at DESC LIMIT 100',
          params: ['550e8400-e29b-41d4-a716-446655440000'] // Sample UUID
        },
        {
          name: 'Events by Type',
          sql: 'SELECT * FROM audit_logs WHERE event_type = $1 AND created_at >= NOW() - INTERVAL \'30 days\' ORDER BY created_at DESC',
          params: ['PANEL_SCAN']
        },
        {
          name: 'Station Activity',
          sql: 'SELECT * FROM audit_logs WHERE station_id = $1 AND created_at >= NOW() - INTERVAL \'24 hours\' ORDER BY created_at DESC',
          params: [1]
        }
      ];
      
      const performanceResults = [];
      
      for (const query of queries) {
        const queryStart = Date.now();
        const result = await databaseManager.getPool().query(query.sql, query.params);
        const queryTime = Date.now() - queryStart;
        
        performanceResults.push({
          name: query.name,
          executionTime: queryTime,
          recordCount: result.rows.length,
          compliant: queryTime <= AUDIT_TEST_CONFIG.performance.maxQueryTime
        });
      }
      
      queryPerformanceTest.addMetric('performanceResults', performanceResults);
      
      const compliantQueries = performanceResults.filter(r => r.compliant).length;
      const totalQueries = performanceResults.length;
      
      if (compliantQueries === totalQueries) {
        queryPerformanceTest.markPassed('All queries meet performance requirements');
      } else {
        queryPerformanceTest.markWarning(`${compliantQueries}/${totalQueries} queries meet performance requirements`, [
          'Optimize slow queries with better indexes',
          'Consider query result caching for frequently accessed data',
          'Review query execution plans for optimization opportunities'
        ]);
      }
      
      queryPerformanceTest.executionTime = Date.now() - startTime;
    } catch (error) {
      queryPerformanceTest.markFailed('NON_COMPLIANT', `Query performance test failed: ${error.message}`);
    }
    this.results.push(queryPerformanceTest);

    // Test 2: Insert Performance
    const insertPerformanceTest = new AuditTestResult('Insert Performance', category);
    try {
      const startTime = Date.now();
      
      // Test single insert performance
      const singleInsertStart = Date.now();
      const singleInsertQuery = `
        INSERT INTO audit_logs (
          event_type, event_category, action, user_id, description, 
          event_timestamp, severity_level, is_successful
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;
      
      const singleInsertParams = [
        'PERFORMANCE_TEST',
        'SYSTEM',
        'CREATE',
        '550e8400-e29b-41d4-a716-446655440000',
        'Performance test single insert',
        new Date(),
        'INFO',
        true
      ];
      
      await databaseManager.getPool().query(singleInsertQuery, singleInsertParams);
      const singleInsertTime = Date.now() - singleInsertStart;
      
      // Test batch insert performance
      const batchInsertStart = Date.now();
      const batchSize = 100;
      const batchInserts = [];
      
      for (let i = 0; i < batchSize; i++) {
        batchInserts.push([
          'PERFORMANCE_TEST',
          'SYSTEM',
          'CREATE',
          '550e8400-e29b-41d4-a716-446655440000',
          `Performance test batch insert ${i}`,
          new Date(),
          'INFO',
          true
        ]);
      }
      
      // Use a more efficient batch insert approach
      const batchQuery = `
        INSERT INTO audit_logs (
          event_type, event_category, action, user_id, description, 
          event_timestamp, severity_level, is_successful
        ) VALUES ${batchInserts.map((_, index) => 
          `($${index * 8 + 1}, $${index * 8 + 2}, $${index * 8 + 3}, $${index * 8 + 4}, $${index * 8 + 5}, $${index * 8 + 6}, $${index * 8 + 7}, $${index * 8 + 8})`
        ).join(', ')}
      `;
      
      const batchParams = batchInserts.flat();
      await databaseManager.getPool().query(batchQuery, batchParams);
      const batchInsertTime = Date.now() - batchInsertStart;
      
      insertPerformanceTest.addMetric('singleInsertTime', singleInsertTime);
      insertPerformanceTest.addMetric('batchInsertTime', batchInsertTime);
      insertPerformanceTest.addMetric('batchSize', batchSize);
      insertPerformanceTest.addMetric('singleInsertCompliant', singleInsertTime <= AUDIT_TEST_CONFIG.performance.maxInsertTime);
      insertPerformanceTest.addMetric('batchInsertCompliant', batchInsertTime <= AUDIT_TEST_CONFIG.performance.maxBatchInsertTime);
      
      const singleCompliant = singleInsertTime <= AUDIT_TEST_CONFIG.performance.maxInsertTime;
      const batchCompliant = batchInsertTime <= AUDIT_TEST_CONFIG.performance.maxBatchInsertTime;
      
      if (singleCompliant && batchCompliant) {
        insertPerformanceTest.markPassed('All insert operations meet performance requirements');
      } else {
        insertPerformanceTest.markWarning('Some insert operations exceed performance thresholds', [
          'Optimize database indexes for insert operations',
          'Consider bulk insert operations for better performance',
          'Review database configuration for insert optimization'
        ]);
      }
      
      insertPerformanceTest.executionTime = Date.now() - startTime;
    } catch (error) {
      insertPerformanceTest.markFailed('NON_COMPLIANT', `Insert performance test failed: ${error.message}`);
    }
    this.results.push(insertPerformanceTest);
  }

  /**
   * Test data integrity
   */
  async runDataIntegrityTests() {
    const category = 'DATA_INTEGRITY';
    
    // Test 1: Data Consistency
    const consistencyTest = new AuditTestResult('Data Consistency', category);
    try {
      const startTime = Date.now();
      
      // Test for orphaned references
      const orphanedQuery = `
        SELECT 
          COUNT(*) as orphaned_user_refs,
          COUNT(CASE WHEN al.user_id IS NOT NULL AND u.id IS NULL THEN 1 END) as orphaned_users,
          COUNT(CASE WHEN al.station_id IS NOT NULL AND s.id IS NULL THEN 1 END) as orphaned_stations,
          COUNT(CASE WHEN al.manufacturing_order_id IS NOT NULL AND mo.id IS NULL THEN 1 END) as orphaned_mos
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN stations s ON al.station_id = s.id
        LEFT JOIN manufacturing_orders mo ON al.manufacturing_order_id = mo.id
        WHERE al.created_at >= NOW() - INTERVAL '30 days'
      `;
      
      const result = await databaseManager.getPool().query(orphanedQuery);
      const data = result.rows[0];
      
      consistencyTest.addMetric('orphanedUserRefs', parseInt(data.orphaned_user_refs));
      consistencyTest.addMetric('orphanedUsers', parseInt(data.orphaned_users));
      consistencyTest.addMetric('orphanedStations', parseInt(data.orphaned_stations));
      consistencyTest.addMetric('orphanedMOs', parseInt(data.orphaned_mos));
      
      const totalOrphaned = parseInt(data.orphaned_users) + parseInt(data.orphaned_stations) + parseInt(data.orphaned_mos);
      
      if (totalOrphaned === 0) {
        consistencyTest.markPassed('No orphaned references detected');
      } else {
        consistencyTest.markWarning(`${totalOrphaned} orphaned references detected`, [
          'Implement referential integrity constraints',
          'Add cleanup procedures for orphaned references',
          'Review data deletion processes'
        ]);
      }
      
      consistencyTest.executionTime = Date.now() - startTime;
    } catch (error) {
      consistencyTest.markFailed('NON_COMPLIANT', `Data consistency test failed: ${error.message}`);
    }
    this.results.push(consistencyTest);

    // Test 2: Timestamp Validation
    const timestampTest = new AuditTestResult('Timestamp Validation', category);
    try {
      const startTime = Date.now();
      
      const timestampQuery = `
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN event_timestamp > NOW() THEN 1 END) as future_timestamps,
          COUNT(CASE WHEN event_timestamp < '2020-01-01' THEN 1 END) as old_timestamps,
          COUNT(CASE WHEN event_timestamp IS NULL THEN 1 END) as null_timestamps
        FROM audit_logs
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `;
      
      const result = await databaseManager.getPool().query(timestampQuery);
      const data = result.rows[0];
      
      timestampTest.addMetric('totalRecords', parseInt(data.total_records));
      timestampTest.addMetric('futureTimestamps', parseInt(data.future_timestamps));
      timestampTest.addMetric('oldTimestamps', parseInt(data.old_timestamps));
      timestampTest.addMetric('nullTimestamps', parseInt(data.null_timestamps));
      
      const invalidTimestamps = parseInt(data.future_timestamps) + parseInt(data.old_timestamps) + parseInt(data.null_timestamps);
      const invalidPercentage = data.total_records > 0 ? (invalidTimestamps / data.total_records) * 100 : 0;
      
      if (invalidPercentage === 0) {
        timestampTest.markPassed('All timestamps are valid');
      } else {
        timestampTest.markWarning(`${invalidPercentage.toFixed(2)}% of timestamps are invalid`, [
          'Implement timestamp validation during audit log creation',
          'Add database constraints for timestamp ranges',
          'Review timestamp generation logic'
        ]);
      }
      
      timestampTest.executionTime = Date.now() - startTime;
    } catch (error) {
      timestampTest.markFailed('NON_COMPLIANT', `Timestamp validation test failed: ${error.message}`);
    }
    this.results.push(timestampTest);
  }

  /**
   * Test retention policies
   */
  async runRetentionTests() {
    const category = 'RETENTION';
    
    // Test 1: Retention Policy Enforcement
    const retentionPolicyTest = new AuditTestResult('Retention Policy Enforcement', category);
    try {
      const startTime = Date.now();
      
      const retentionYears = AUDIT_TEST_CONFIG.compliance.minRetentionYears;
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);
      
      const query = `
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN created_at < $1 THEN 1 END) as old_records,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as recent_records
        FROM audit_logs
      `;
      
      const result = await databaseManager.getPool().query(query, [cutoffDate]);
      const data = result.rows[0];
      
      retentionPolicyTest.addMetric('totalRecords', parseInt(data.total_records));
      retentionPolicyTest.addMetric('oldRecords', parseInt(data.old_records));
      retentionPolicyTest.addMetric('recentRecords', parseInt(data.recent_records));
      retentionPolicyTest.addMetric('retentionYears', retentionYears);
      retentionPolicyTest.addMetric('cutoffDate', cutoffDate.toISOString());
      
      if (parseInt(data.old_records) === 0) {
        retentionPolicyTest.markPassed(`Retention policy properly enforced (${retentionYears} years)`);
      } else {
        retentionPolicyTest.markWarning(`${data.old_records} records exceed retention period`, [
          'Implement automated cleanup procedures',
          'Verify retention policy enforcement',
          'Consider archiving old records'
        ]);
      }
      
      retentionPolicyTest.executionTime = Date.now() - startTime;
    } catch (error) {
      retentionPolicyTest.markFailed('NON_COMPLIANT', `Retention policy test failed: ${error.message}`);
    }
    this.results.push(retentionPolicyTest);
  }

  /**
   * Test system under load
   */
  async runLoadTests() {
    const category = 'PERFORMANCE';
    
    // Test 1: Concurrent Query Performance
    const concurrentTest = new AuditTestResult('Concurrent Query Performance', category);
    try {
      const startTime = Date.now();
      
      const concurrentQueries = AUDIT_TEST_CONFIG.performance.maxConcurrentQueries;
      const testQueries = [];
      
      // Create concurrent query promises
      for (let i = 0; i < concurrentQueries; i++) {
        const query = databaseManager.getPool().query(`
          SELECT COUNT(*) as count, event_type, event_category
          FROM audit_logs 
          WHERE created_at >= NOW() - INTERVAL '7 days'
          GROUP BY event_type, event_category
          ORDER BY count DESC
          LIMIT 10
        `);
        testQueries.push(query);
      }
      
      const loadStart = Date.now();
      const results = await Promise.all(testQueries);
      const loadTime = Date.now() - loadStart;
      
      concurrentTest.addMetric('concurrentQueries', concurrentQueries);
      concurrentTest.addMetric('loadTime', loadTime);
      concurrentTest.addMetric('averageQueryTime', loadTime / concurrentQueries);
      concurrentTest.addMetric('successfulQueries', results.filter(r => r.rows).length);
      
      const successRate = (results.filter(r => r.rows).length / concurrentQueries) * 100;
      
      if (successRate === 100 && loadTime <= 5000) { // 5 second threshold for load test
        concurrentTest.markPassed('System handles concurrent queries successfully');
      } else {
        concurrentTest.markWarning(`Concurrent query performance: ${successRate.toFixed(1)}% success rate`, [
          'Optimize database connection pooling',
          'Review query performance under load',
          'Consider read replicas for heavy query loads'
        ]);
      }
      
      concurrentTest.executionTime = Date.now() - startTime;
    } catch (error) {
      concurrentTest.markFailed('NON_COMPLIANT', `Concurrent query test failed: ${error.message}`);
    }
    this.results.push(concurrentTest);
  }

  /**
   * Calculate overall compliance
   */
  calculateOverallCompliance() {
    let totalWeight = 0;
    let weightedScore = 0;
    
    this.results.forEach(result => {
      const category = AUDIT_TEST_CONFIG.testCategories[result.category];
      if (category) {
        let score = 0;
        
        switch (result.status) {
          case 'PASSED':
            score = 100;
            break;
          case 'WARNING':
            score = 70;
            break;
          case 'FAILED':
            score = 0;
            break;
          default:
            score = 0;
        }
        
        weightedScore += score * category.weight;
        totalWeight += category.weight;
      }
    });
    
    const overallScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
    
    if (overallScore >= 90) this.overallCompliance = 'FULLY_COMPLIANT';
    else if (overallScore >= 70) this.overallCompliance = 'MOSTLY_COMPLIANT';
    else if (overallScore >= 50) this.overallCompliance = 'PARTIALLY_COMPLIANT';
    else this.overallCompliance = 'NON_COMPLIANT';
  }

  /**
   * Generate test report
   */
  generateReport() {
    // Additional report generation logic can be added here
  }

  /**
   * Get formatted test report
   */
  getTestReport() {
    return {
      summary: {
        overallCompliance: this.overallCompliance,
        totalTests: this.results.length,
        passedTests: this.results.filter(r => r.status === 'PASSED').length,
        failedTests: this.results.filter(r => r.status === 'FAILED').length,
        warningTests: this.results.filter(r => r.status === 'WARNING').length,
        executionTime: this.endTime - this.startTime
      },
      results: this.results,
      recommendations: this.generateRecommendations(),
      complianceAssessment: this.assessCompliance()
    };
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Failed tests
    const failedTests = this.results.filter(r => r.status === 'FAILED');
    if (failedTests.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Address failed compliance tests',
        description: `${failedTests.length} tests failed compliance requirements`,
        timeframe: 'Immediate'
      });
    }
    
    // Warning tests
    const warningTests = this.results.filter(r => r.status === 'WARNING');
    if (warningTests.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Review warning tests',
        description: `${warningTests.length} tests have compliance warnings`,
        timeframe: '1 week'
      });
    }
    
    return recommendations;
  }

  /**
   * Assess overall compliance
   */
  assessCompliance() {
    return {
      status: this.overallCompliance,
      score: this.calculateComplianceScore(),
      nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      criticalIssues: this.results.filter(r => r.status === 'FAILED').length
    };
  }

  /**
   * Calculate compliance score
   */
  calculateComplianceScore() {
    let totalWeight = 0;
    let weightedScore = 0;
    
    this.results.forEach(result => {
      const category = AUDIT_TEST_CONFIG.testCategories[result.category];
      if (category) {
        let score = 0;
        
        switch (result.status) {
          case 'PASSED':
            score = 100;
            break;
          case 'WARNING':
            score = 70;
            break;
          case 'FAILED':
            score = 0;
            break;
          default:
            score = 0;
        }
        
        weightedScore += score * category.weight;
        totalWeight += category.weight;
      }
    });
    
    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  }
}

// Export the audit tester
export const auditTester = new AuditTester();

// Export individual test functions for specific testing
export const runAuditTests = () => auditTester.runAuditTests();
export const getAuditReport = () => auditTester.getTestReport();

export default auditTester;

