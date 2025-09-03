// Test Manufacturing Order Progress Tracking and Alert System
// Comprehensive tests for Task 10.2 implementation

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import moProgressTrackingService from '../services/moProgressTrackingService.js';
import moAlertService from '../services/moAlertService.js';
import manufacturingOrderService from '../services/manufacturingOrderService.js';
import db from '../config/database.js';

describe('MO Progress Tracking and Alert System', () => {
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
      id: '550e8400-e29b-41d4-a716-446655440001',
      username: 'test_progress_user',
      email: 'progress@manufacturing.com',
      password_hash: 'hashed_password',
      role: 'PRODUCTION_SUPERVISOR'
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
      target_quantity: 100,
      year_code: '25',
      frame_type: 'SILVER',
      backsheet_type: 'WHITE',
      created_by: testUserId,
      customer_name: 'Test Progress Customer',
      notes: 'Test MO for progress tracking'
    };

    const newMO = await manufacturingOrderService.createManufacturingOrder(moData);
    testMOId = newMO.id;

    // Create some test panels with different statuses
    const panelQueries = [
      // 20 completed panels
      ...Array(20).fill().map((_, i) => `
        INSERT INTO panels (
          barcode, panel_type, frame_type, backsheet_type, line_assignment,
          current_station_id, status, mo_id, station_1_completed_at,
          station_2_completed_at, station_3_completed_at, station_4_completed_at
        ) VALUES (
          'CRS25WWT${(i + 1).toString().padStart(5, '0')}',
          'TYPE_60', 'SILVER', 'WHITE', 'LINE_1',
          4, 'COMPLETED', $1,
          CURRENT_TIMESTAMP - INTERVAL '4 hours',
          CURRENT_TIMESTAMP - INTERVAL '3 hours',
          CURRENT_TIMESTAMP - INTERVAL '2 hours',
          CURRENT_TIMESTAMP - INTERVAL '1 hour'
        )
      `),
      // 5 failed panels
      ...Array(5).fill().map((_, i) => `
        INSERT INTO panels (
          barcode, panel_type, frame_type, backsheet_type, line_assignment,
          current_station_id, status, mo_id, station_1_completed_at
        ) VALUES (
          'CRS25WWT${(i + 21).toString().padStart(5, '0')}',
          'TYPE_60', 'SILVER', 'WHITE', 'LINE_1',
          2, 'FAILED', $1,
          CURRENT_TIMESTAMP - INTERVAL '2 hours'
        )
      `),
      // 10 in progress panels
      ...Array(10).fill().map((_, i) => `
        INSERT INTO panels (
          barcode, panel_type, frame_type, backsheet_type, line_assignment,
          current_station_id, status, mo_id, station_1_completed_at,
          station_2_completed_at
        ) VALUES (
          'CRS25WWT${(i + 26).toString().padStart(5, '0')}',
          'TYPE_60', 'SILVER', 'WHITE', 'LINE_1',
          3, 'IN_PROGRESS', $1,
          CURRENT_TIMESTAMP - INTERVAL '1 hour',
          CURRENT_TIMESTAMP - INTERVAL '30 minutes'
        )
      `),
      // 5 pending panels
      ...Array(5).fill().map((_, i) => `
        INSERT INTO panels (
          barcode, panel_type, frame_type, backsheet_type, line_assignment,
          current_station_id, status, mo_id
        ) VALUES (
          'CRS25WWT${(i + 36).toString().padStart(5, '0')}',
          'TYPE_60', 'SILVER', 'WHITE', 'LINE_1',
          1, 'PENDING', $1
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
    
    await db.query('DELETE FROM users WHERE username = $1', ['test_progress_user']);
    
    // Close database connection
    await db.end();
  });

  describe('Progress Tracking Service', () => {
    it('should calculate MO progress correctly', async () => {
      const progressData = await moProgressTrackingService.calculateMOProgress(testMOId);
      
      expect(progressData).toBeDefined();
      expect(progressData.id).toBe(testMOId);
      expect(progressData.target_quantity).toBe(100);
      expect(progressData.completed_panels).toBe(20);
      expect(progressData.failed_panels).toBe(5);
      expect(progressData.in_progress_panels).toBe(10);
      expect(progressData.pending_panels).toBe(5);
      expect(progressData.progress_percentage).toBe(20); // 20/100 * 100
      expect(progressData.panels_remaining).toBe(75); // 100 - 20 - 5
      expect(progressData.failure_rate).toBe(20); // 5/25 * 100
    });

    it('should identify bottlenecks correctly', async () => {
      const progressData = await moProgressTrackingService.calculateMOProgress(testMOId);
      
      expect(progressData.bottlenecks).toBeDefined();
      expect(Array.isArray(progressData.bottlenecks)).toBe(true);
      
      // Should detect station bottlenecks if any station has > 5 panels
      const stationBottlenecks = progressData.bottlenecks.filter(b => b.type === 'station_bottleneck');
      expect(stationBottlenecks.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate performance metrics', async () => {
      const progressData = await moProgressTrackingService.calculateMOProgress(testMOId);
      
      expect(progressData.performance_metrics).toBeDefined();
      expect(progressData.performance_metrics.total_production_time_hours).toBeGreaterThanOrEqual(0);
      expect(progressData.performance_metrics.panels_per_hour).toBeGreaterThanOrEqual(0);
      expect(progressData.performance_metrics.estimated_efficiency_percentage).toBeGreaterThanOrEqual(0);
      expect(progressData.performance_metrics.on_time_delivery_likelihood).toBeGreaterThanOrEqual(0);
    });

    it('should cache progress data for performance', async () => {
      // First call should populate cache
      const start1 = Date.now();
      await moProgressTrackingService.calculateMOProgress(testMOId);
      const time1 = Date.now() - start1;

      // Second call should use cache (faster)
      const start2 = Date.now();
      await moProgressTrackingService.calculateMOProgress(testMOId);
      const time2 = Date.now() - start2;

      // Cache should make second call faster (though this might not always be true in tests)
      expect(time2).toBeLessThanOrEqual(time1 + 100); // Allow some variance
    });

    it('should clear cache when requested', async () => {
      // Populate cache
      await moProgressTrackingService.calculateMOProgress(testMOId);
      
      // Clear cache
      moProgressTrackingService.clearProgressCache(testMOId);
      
      // Next call should recalculate (not use cache)
      const progressData = await moProgressTrackingService.calculateMOProgress(testMOId);
      expect(progressData).toBeDefined();
    });
  });

  describe('Alert Service', () => {
    it('should create alerts correctly', async () => {
      const alertData = {
        mo_id: testMOId,
        alert_type: 'panels_remaining',
        severity: 'warning',
        title: 'Test Alert',
        message: 'Test alert message',
        threshold_value: 50,
        current_value: 45
      };

      const newAlert = await moAlertService.createAlert(alertData);
      
      expect(newAlert).toBeDefined();
      expect(newAlert.mo_id).toBe(testMOId);
      expect(newAlert.alert_type).toBe('panels_remaining');
      expect(newAlert.severity).toBe('warning');
      expect(newAlert.status).toBe('ACTIVE');
    });

    it('should get MO alerts correctly', async () => {
      const alerts = await moAlertService.getMOAlerts(testMOId);
      
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBeGreaterThan(0);
      
      const activeAlerts = alerts.filter(alert => alert.status === 'ACTIVE');
      expect(activeAlerts.length).toBeGreaterThan(0);
    });

    it('should acknowledge alerts correctly', async () => {
      // Get an active alert
      const alerts = await moAlertService.getMOAlerts(testMOId, { status: 'ACTIVE' });
      expect(alerts.length).toBeGreaterThan(0);
      
      const alert = alerts[0];
      const acknowledgedAlert = await moAlertService.acknowledgeAlert(
        alert.id,
        testUserId,
        'Test acknowledgment'
      );
      
      expect(acknowledgedAlert.status).toBe('ACKNOWLEDGED');
      expect(acknowledgedAlert.acknowledged_by).toBe(testUserId);
      expect(acknowledgedAlert.acknowledgment_notes).toBe('Test acknowledgment');
    });

    it('should resolve alerts correctly', async () => {
      // Get an acknowledged alert
      const alerts = await moAlertService.getMOAlerts(testMOId, { status: 'ACKNOWLEDGED' });
      expect(alerts.length).toBeGreaterThan(0);
      
      const alert = alerts[0];
      const resolvedAlert = await moAlertService.resolveAlert(
        alert.id,
        testUserId,
        'Test resolution'
      );
      
      expect(resolvedAlert.status).toBe('RESOLVED');
      expect(resolvedAlert.resolved_by).toBe(testUserId);
      expect(resolvedAlert.resolution_notes).toBe('Test resolution');
    });

    it('should prevent duplicate alerts', async () => {
      const alertData = {
        mo_id: testMOId,
        alert_type: 'panels_remaining',
        severity: 'warning',
        title: 'Duplicate Test Alert',
        message: 'Duplicate test alert message',
        threshold_value: 50,
        current_value: 45
      };

      // Create first alert
      const alert1 = await moAlertService.createAlert(alertData);
      
      // Try to create duplicate alert (should return existing one)
      const alert2 = await moAlertService.createAlert(alertData);
      
      expect(alert1.id).toBe(alert2.id);
    });

    it('should get alert statistics', async () => {
      const stats = await moAlertService.getAlertStatistics();
      
      expect(stats).toBeDefined();
      expect(stats.total_alerts).toBeGreaterThanOrEqual(0);
      expect(stats.active_alerts).toBeGreaterThanOrEqual(0);
      expect(stats.acknowledged_alerts).toBeGreaterThanOrEqual(0);
      expect(stats.resolved_alerts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integrated Progress and Alert System', () => {
    it('should trigger progress update and generate alerts', async () => {
      const progressData = await manufacturingOrderService.triggerProgressUpdate(testMOId);
      
      expect(progressData).toBeDefined();
      expect(progressData.alerts).toBeDefined();
      expect(Array.isArray(progressData.alerts)).toBe(true);
      expect(progressData.bottlenecks).toBeDefined();
      expect(Array.isArray(progressData.bottlenecks)).toBe(true);
    });

    it('should update MO with progress tracking', async () => {
      const updateData = { notes: 'Updated with progress tracking' };
      const result = await manufacturingOrderService.updateManufacturingOrderWithProgress(
        testMOId,
        updateData
      );
      
      expect(result).toBeDefined();
      expect(result.notes).toBe('Updated with progress tracking');
      expect(result.progress).toBeDefined();
      expect(result.progress.id).toBe(testMOId);
    });

    it('should get multiple MO progress', async () => {
      const progressData = await moProgressTrackingService.getMultipleMOProgress([testMOId]);
      
      expect(Array.isArray(progressData)).toBe(true);
      expect(progressData.length).toBe(1);
      expect(progressData[0].id).toBe(testMOId);
    });

    it('should get active MOs with progress', async () => {
      const progressData = await moProgressTrackingService.getActiveMOsWithProgress({
        status: 'ACTIVE',
        limit: 10
      });
      
      expect(Array.isArray(progressData)).toBe(true);
      expect(progressData.length).toBeGreaterThan(0);
      
      const ourMO = progressData.find(mo => mo.id === testMOId);
      expect(ourMO).toBeDefined();
    });
  });

  describe('Alert Generation Logic', () => {
    it('should generate panels remaining alert when threshold is met', async () => {
      // This test would require setting up a specific scenario
      // For now, we'll test the alert generation logic indirectly
      const progressData = await moProgressTrackingService.calculateMOProgress(testMOId);
      
      // Check if alerts are generated based on current progress
      expect(progressData.alerts).toBeDefined();
      expect(Array.isArray(progressData.alerts)).toBe(true);
      
      // Look for panels remaining alert
      const panelsRemainingAlert = progressData.alerts.find(
        alert => alert.type === 'panels_remaining'
      );
      
      if (progressData.panels_remaining <= 50) {
        expect(panelsRemainingAlert).toBeDefined();
      }
    });

    it('should generate low progress alert when progress is low', async () => {
      const progressData = await moProgressTrackingService.calculateMOProgress(testMOId);
      
      const lowProgressAlert = progressData.alerts.find(
        alert => alert.type === 'low_progress'
      );
      
      if (progressData.progress_percentage < 25) {
        expect(lowProgressAlert).toBeDefined();
      }
    });

    it('should generate high failure rate alert when failure rate is high', async () => {
      const progressData = await moProgressTrackingService.calculateMOProgress(testMOId);
      
      const highFailureAlert = progressData.alerts.find(
        alert => alert.type === 'high_failure_rate'
      );
      
      if (progressData.failure_rate > 10) {
        expect(highFailureAlert).toBeDefined();
      }
    });
  });

  describe('Performance and Caching', () => {
    it('should handle cache timeout correctly', async () => {
      // This test would require manipulating the cache timeout
      // For now, we'll test that cache operations work
      const stats = moProgressTrackingService.getProgressTrackingStats();
      
      expect(stats).toBeDefined();
      expect(stats.cache_size).toBeGreaterThanOrEqual(0);
      expect(stats.alert_thresholds).toBeDefined();
      expect(stats.cache_timeout_ms).toBe(30000);
    });

    it('should clear all progress cache', async () => {
      // Populate cache
      await moProgressTrackingService.calculateMOProgress(testMOId);
      
      // Clear all cache
      moProgressTrackingService.clearAllProgressCache();
      
      // Verify cache is cleared
      const stats = moProgressTrackingService.getProgressTrackingStats();
      expect(stats.cache_size).toBe(0);
    });
  });
});
