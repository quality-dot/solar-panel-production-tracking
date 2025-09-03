// Test Manufacturing Order Closure System
// Comprehensive tests for Task 10.3 implementation

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import moClosureService from '../services/moClosureService.js';
import moProgressTrackingService from '../services/moProgressTrackingService.js';
import moAlertService from '../services/moAlertService.js';
import manufacturingOrderService from '../services/manufacturingOrderService.js';
import db from '../config/database.js';

describe('MO Closure System', () => {
  let testUserId;
  let testMOId;
  let testPanelIds = [];

  beforeAll(async () => {
    // Create a test user
    const userQuery = `
      INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `;
    
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      username: 'test_closure_user',
      email: 'closure@manufacturing.com',
      password_hash: 'hashed_password',
      role: 'QC_MANAGER'
    };

    try {
      const result = await db.query(userQuery, [
        testUser.id,
        testUser.username,
        testUser.email,
        testUser.password_hash,
        testUser.role
      ]);
      testUserId = result.rows[0].id;
    } catch (error) {
      // User might already exist, get the existing user
      const existingUserQuery = 'SELECT id FROM users WHERE username = $1';
      const existingResult = await db.query(existingUserQuery, [testUser.username]);
      testUserId = existingResult.rows[0].id;
    }

    // Create a test manufacturing order
    const moData = {
      panel_type: 'TYPE_60',
      target_quantity: 50,
      year_code: '25',
      frame_type: 'SILVER',
      backsheet_type: 'WHITE',
      created_by: testUserId,
      customer_name: 'Test Closure Customer',
      customer_po: 'PO-2025-001',
      notes: 'Test MO for closure system'
    };

    const newMO = await manufacturingOrderService.createManufacturingOrder(moData);
    testMOId = newMO.id;

    // Create test panels with different statuses
    const panelQueries = [
      // 45 completed panels (90% completion)
      ...Array(45).fill().map((_, i) => `
        INSERT INTO panels (
          barcode, panel_type, frame_type, backsheet_type, line_assignment,
          current_station_id, status, mo_id, wattage_pmax, vmp, imp,
          station_1_completed_at, station_2_completed_at, station_3_completed_at, station_4_completed_at
        ) VALUES (
          'CRS25WWT${(i + 1).toString().padStart(5, '0')}',
          'TYPE_60', 'SILVER', 'WHITE', 'LINE_1',
          4, 'COMPLETED', $1, 300.0, 40.0, 7.5,
          CURRENT_TIMESTAMP - INTERVAL '4 hours',
          CURRENT_TIMESTAMP - INTERVAL '3 hours',
          CURRENT_TIMESTAMP - INTERVAL '2 hours',
          CURRENT_TIMESTAMP - INTERVAL '1 hour'
        )
      `),
      // 3 failed panels (6% failure rate)
      ...Array(3).fill().map((_, i) => `
        INSERT INTO panels (
          barcode, panel_type, frame_type, backsheet_type, line_assignment,
          current_station_id, status, mo_id, station_1_completed_at
        ) VALUES (
          'CRS25WWT${(i + 46).toString().padStart(5, '0')}',
          'TYPE_60', 'SILVER', 'WHITE', 'LINE_1',
          2, 'FAILED', $1,
          CURRENT_TIMESTAMP - INTERVAL '2 hours'
        )
      `),
      // 2 in progress panels
      ...Array(2).fill().map((_, i) => `
        INSERT INTO panels (
          barcode, panel_type, frame_type, backsheet_type, line_assignment,
          current_station_id, status, mo_id, station_1_completed_at,
          station_2_completed_at
        ) VALUES (
          'CRS25WWT${(i + 49).toString().padStart(5, '0')}',
          'TYPE_60', 'SILVER', 'WHITE', 'LINE_1',
          3, 'IN_PROGRESS', $1,
          CURRENT_TIMESTAMP - INTERVAL '1 hour',
          CURRENT_TIMESTAMP - INTERVAL '30 minutes'
        )
      `)
    ];

    for (const query of panelQueries) {
      const result = await db.query(query, [testMOId]);
      testPanelIds.push(result.rows[0]?.id);
    }

    // Update MO status to ACTIVE
    await manufacturingOrderService.updateManufacturingOrder(testMOId, { status: 'ACTIVE' });
  });

  afterAll(async () => {
    // Clean up test data
    if (testPanelIds.length > 0) {
      await db.query('DELETE FROM panels WHERE id = ANY($1)', [testPanelIds]);
    }
    
    if (testMOId) {
      await db.query('DELETE FROM manufacturing_orders WHERE id = $1', [testMOId]);
    }
    
    await db.query('DELETE FROM users WHERE username = $1', ['test_closure_user']);
    
    // Close database connection
    await db.end();
  });

  describe('Closure Readiness Assessment', () => {
    it('should assess closure readiness correctly', async () => {
      const assessment = await moClosureService.assessClosureReadiness(testMOId);
      
      expect(assessment).toBeDefined();
      expect(assessment.mo_id).toBe(testMOId);
      expect(assessment.is_ready).toBeDefined();
      expect(assessment.readiness_score).toBeGreaterThanOrEqual(0);
      expect(assessment.readiness_percentage).toBeGreaterThanOrEqual(0);
      expect(assessment.checks).toBeDefined();
      expect(Array.isArray(assessment.blockers)).toBe(true);
      expect(Array.isArray(assessment.recommendations)).toBe(true);
      expect(assessment.final_statistics).toBeDefined();
    });

    it('should validate panel completion correctly', async () => {
      const progressData = await moProgressTrackingService.calculateMOProgress(testMOId);
      const validation = await moClosureService.validatePanelCompletion(testMOId, progressData);
      
      expect(validation).toBeDefined();
      expect(validation.passed).toBeDefined();
      expect(validation.reason).toBeDefined();
      expect(validation.details).toBeDefined();
    });

    it('should validate failure rate correctly', async () => {
      const progressData = await moProgressTrackingService.calculateMOProgress(testMOId);
      const validation = await moClosureService.validateFailureRate(testMOId, progressData);
      
      expect(validation).toBeDefined();
      expect(validation.passed).toBeDefined();
      expect(validation.reason).toBeDefined();
      expect(validation.details).toBeDefined();
    });

    it('should validate pallet status correctly', async () => {
      const progressData = await moProgressTrackingService.calculateMOProgress(testMOId);
      const validation = await moClosureService.validatePalletStatus(testMOId, progressData);
      
      expect(validation).toBeDefined();
      expect(validation.passed).toBeDefined();
      expect(validation.reason).toBeDefined();
    });

    it('should validate quality standards correctly', async () => {
      const progressData = await moProgressTrackingService.calculateMOProgress(testMOId);
      const validation = await moClosureService.validateQualityStandards(testMOId, progressData);
      
      expect(validation).toBeDefined();
      expect(validation.passed).toBeDefined();
      expect(validation.reason).toBeDefined();
      expect(validation.details).toBeDefined();
    });

    it('should validate documentation correctly', async () => {
      const progressData = await moProgressTrackingService.calculateMOProgress(testMOId);
      const validation = await moClosureService.validateDocumentation(testMOId, progressData);
      
      expect(validation).toBeDefined();
      expect(validation.passed).toBeDefined();
      expect(validation.reason).toBeDefined();
    });
  });

  describe('Closure Execution', () => {
    it('should execute automatic closure with force option', async () => {
      const closureResult = await moClosureService.executeAutomaticClosure(
        testMOId, 
        testUserId, 
        { force: true, generateReport: true, finalizePallets: false }
      );
      
      expect(closureResult).toBeDefined();
      expect(closureResult.success).toBe(true);
      expect(closureResult.mo_id).toBe(testMOId);
      expect(closureResult.order_number).toBeDefined();
      expect(closureResult.completed_at).toBeDefined();
      expect(closureResult.final_statistics).toBeDefined();
      expect(closureResult.completion_report).toBeDefined();
      expect(closureResult.audit_record).toBeDefined();
    });

    it('should generate completion report correctly', async () => {
      const progressData = await moProgressTrackingService.calculateMOProgress(testMOId);
      const report = await moClosureService.generateCompletionReport(testMOId, progressData);
      
      expect(report).toBeDefined();
      expect(report.mo_id).toBe(testMOId);
      expect(report.order_number).toBeDefined();
      expect(report.generated_at).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.quality_metrics).toBeDefined();
      expect(report.performance_metrics).toBeDefined();
      expect(report.timeline).toBeDefined();
    });

    it('should create closure audit record correctly', async () => {
      const progressData = await moProgressTrackingService.calculateMOProgress(testMOId);
      const auditRecord = await moClosureService.createClosureAuditRecord(testMOId, testUserId, {
        assessment: { is_ready: true },
        finalProgress: progressData,
        palletFinalization: { finalized_count: 0 },
        completionReport: { completion_percentage: 100 },
        options: { force: true }
      });
      
      expect(auditRecord).toBeDefined();
      expect(auditRecord.mo_id).toBe(testMOId);
      expect(auditRecord.closed_by).toBe(testUserId);
      expect(auditRecord.closure_type).toBe('AUTOMATIC');
      expect(auditRecord.created_at).toBeDefined();
    });
  });

  describe('Closure Rollback', () => {
    it('should rollback closure correctly', async () => {
      const rollbackResult = await moClosureService.rollbackClosure(
        testMOId, 
        testUserId, 
        'Test rollback for unit testing'
      );
      
      expect(rollbackResult).toBeDefined();
      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.mo_id).toBe(testMOId);
      expect(rollbackResult.order_number).toBeDefined();
      expect(rollbackResult.rolled_back_at).toBeDefined();
      expect(rollbackResult.audit_record).toBeDefined();
    });
  });

  describe('Closure Configuration', () => {
    it('should get current closure rules', () => {
      const rules = moClosureService.getClosureRules();
      
      expect(rules).toBeDefined();
      expect(rules.minCompletionPercentage).toBeDefined();
      expect(rules.maxFailureRate).toBeDefined();
      expect(rules.minPanelsForClosure).toBeDefined();
      expect(rules.maxIdleTimeHours).toBeDefined();
      expect(rules.requirePalletFinalization).toBeDefined();
    });

    it('should update closure rules correctly', () => {
      const newRules = {
        minCompletionPercentage: 90,
        maxFailureRate: 10
      };
      
      moClosureService.updateClosureRules(newRules);
      const updatedRules = moClosureService.getClosureRules();
      
      expect(updatedRules.minCompletionPercentage).toBe(90);
      expect(updatedRules.maxFailureRate).toBe(10);
    });
  });

  describe('Closure Audit History', () => {
    it('should get closure audit history', async () => {
      const auditHistory = await moClosureService.getClosureAuditHistory(testMOId);
      
      expect(Array.isArray(auditHistory)).toBe(true);
      expect(auditHistory.length).toBeGreaterThan(0);
      
      const auditRecord = auditHistory[0];
      expect(auditRecord.mo_id).toBe(testMOId);
      expect(auditRecord.closed_by).toBeDefined();
      expect(auditRecord.closure_type).toBeDefined();
      expect(auditRecord.created_at).toBeDefined();
    });
  });

  describe('Integration with Progress Tracking', () => {
    it('should integrate with progress tracking service', async () => {
      const progressData = await moProgressTrackingService.calculateMOProgress(testMOId);
      
      expect(progressData).toBeDefined();
      expect(progressData.id).toBe(testMOId);
      expect(progressData.progress_percentage).toBeDefined();
      expect(progressData.panels_remaining).toBeDefined();
      expect(progressData.failure_rate).toBeDefined();
    });

    it('should integrate with alert service', async () => {
      const alerts = await moAlertService.getMOAlerts(testMOId);
      
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid MO ID gracefully', async () => {
      try {
        await moClosureService.assessClosureReadiness(99999);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('not found');
      }
    });

    it('should handle closure execution errors gracefully', async () => {
      try {
        await moClosureService.executeAutomaticClosure(99999, testUserId);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should handle rollback errors gracefully', async () => {
      try {
        await moClosureService.rollbackClosure(99999, testUserId, 'Test reason');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent assessments', async () => {
      const promises = Array(5).fill().map(() => 
        moClosureService.assessClosureReadiness(testMOId)
      );
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result.mo_id).toBe(testMOId);
        expect(result.is_ready).toBeDefined();
      });
    });

    it('should handle large assessment data efficiently', async () => {
      const startTime = Date.now();
      const assessment = await moClosureService.assessClosureReadiness(testMOId);
      const endTime = Date.now();
      
      expect(assessment).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
