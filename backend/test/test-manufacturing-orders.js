// Test Manufacturing Order Service and Controller
// Basic functionality tests for MO creation and management

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import manufacturingOrderService from '../services/manufacturingOrderService.js';
import manufacturingOrderController from '../controllers/manufacturing-orders/index.js';
import db from '../config/database.js';

describe('Manufacturing Order Service', () => {
  let testUserId;
  let createdMOId;

  beforeAll(async () => {
    // Create a test user for MO creation
    const userQuery = `
      INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `;
    
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'test_mo_user',
      email: 'test@manufacturing.com',
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
  });

  afterAll(async () => {
    // Clean up test data
    if (createdMOId) {
      await db.query('DELETE FROM manufacturing_orders WHERE id = $1', [createdMOId]);
    }
    
    // Clean up test user
    await db.query('DELETE FROM users WHERE username = $1', ['test_mo_user']);
    
    // Close database connection
    await db.end();
  });

  describe('MO Creation', () => {
    it('should create a manufacturing order with valid data', async () => {
      const moData = {
        panel_type: 'TYPE_60',
        target_quantity: 100,
        year_code: '25',
        frame_type: 'SILVER',
        backsheet_type: 'WHITE',
        created_by: testUserId,
        customer_name: 'Test Customer',
        notes: 'Test manufacturing order'
      };

      const newMO = await manufacturingOrderService.createManufacturingOrder(moData);
      
      expect(newMO).toBeDefined();
      expect(newMO.panel_type).toBe('TYPE_60');
      expect(newMO.target_quantity).toBe(100);
      expect(newMO.year_code).toBe('25');
      expect(newMO.frame_type).toBe('SILVER');
      expect(newMO.backsheet_type).toBe('WHITE');
      expect(newMO.status).toBe('DRAFT');
      expect(newMO.order_number).toMatch(/^MO25\d{4}$/);
      
      createdMOId = newMO.id;
    });

    it('should validate required fields', async () => {
      const invalidMOData = {
        panel_type: 'TYPE_60',
        // Missing required fields
      };

      await expect(
        manufacturingOrderService.createManufacturingOrder(invalidMOData)
      ).rejects.toThrow('Target quantity must be a positive number');
    });

    it('should validate panel type enum', async () => {
      const invalidMOData = {
        panel_type: 'INVALID_TYPE',
        target_quantity: 100,
        year_code: '25',
        frame_type: 'SILVER',
        backsheet_type: 'WHITE',
        created_by: testUserId
      };

      await expect(
        manufacturingOrderService.createManufacturingOrder(invalidMOData)
      ).rejects.toThrow('Invalid panel type: INVALID_TYPE');
    });

    it('should validate frame type enum', async () => {
      const invalidMOData = {
        panel_type: 'TYPE_60',
        target_quantity: 100,
        year_code: '25',
        frame_type: 'INVALID_FRAME',
        backsheet_type: 'WHITE',
        created_by: testUserId
      };

      await expect(
        manufacturingOrderService.createManufacturingOrder(invalidMOData)
      ).rejects.toThrow('Invalid frame type: INVALID_FRAME');
    });

    it('should validate backsheet type enum', async () => {
      const invalidMOData = {
        panel_type: 'TYPE_60',
        target_quantity: 100,
        year_code: '25',
        frame_type: 'SILVER',
        backsheet_type: 'INVALID_BACKSHEET',
        created_by: testUserId
      };

      await expect(
        manufacturingOrderService.createManufacturingOrder(invalidMOData)
      ).rejects.toThrow('Invalid backsheet type: INVALID_BACKSHEET');
    });

    it('should validate year code format', async () => {
      const invalidMOData = {
        panel_type: 'TYPE_60',
        target_quantity: 100,
        year_code: '2025', // Should be 2 digits
        frame_type: 'SILVER',
        backsheet_type: 'WHITE',
        created_by: testUserId
      };

      await expect(
        manufacturingOrderService.createManufacturingOrder(invalidMOData)
      ).rejects.toThrow('Year code must be 2 digits (YY format)');
    });

    it('should validate quantity range', async () => {
      const invalidMOData = {
        panel_type: 'TYPE_60',
        target_quantity: 0, // Should be positive
        year_code: '25',
        frame_type: 'SILVER',
        backsheet_type: 'WHITE',
        created_by: testUserId
      };

      await expect(
        manufacturingOrderService.createManufacturingOrder(invalidMOData)
      ).rejects.toThrow('Target quantity must be between 1 and 10,000');
    });
  });

  describe('MO Retrieval', () => {
    it('should get manufacturing order by ID', async () => {
      const mo = await manufacturingOrderService.getManufacturingOrderById(createdMOId);
      
      expect(mo).toBeDefined();
      expect(mo.id).toBe(createdMOId);
      expect(mo.panel_type).toBe('TYPE_60');
    });

    it('should return null for non-existent MO', async () => {
      const mo = await manufacturingOrderService.getManufacturingOrderById(99999);
      expect(mo).toBeNull();
    });

    it('should get manufacturing order by order number', async () => {
      const mo = await manufacturingOrderService.getManufacturingOrderById(createdMOId);
      const moByNumber = await manufacturingOrderService.getManufacturingOrderByNumber(mo.order_number);
      
      expect(moByNumber).toBeDefined();
      expect(moByNumber.id).toBe(createdMOId);
      expect(moByNumber.order_number).toBe(mo.order_number);
    });

    it('should get all manufacturing orders with filtering', async () => {
      const mos = await manufacturingOrderService.getManufacturingOrders({
        status: 'DRAFT',
        limit: 10
      });
      
      expect(Array.isArray(mos)).toBe(true);
      expect(mos.length).toBeGreaterThan(0);
      
      // Check that our created MO is in the results
      const ourMO = mos.find(mo => mo.id === createdMOId);
      expect(ourMO).toBeDefined();
    });
  });

  describe('MO Updates', () => {
    it('should update manufacturing order', async () => {
      const updateData = {
        status: 'ACTIVE',
        notes: 'Updated test notes'
      };

      const updatedMO = await manufacturingOrderService.updateManufacturingOrder(createdMOId, updateData);
      
      expect(updatedMO.status).toBe('ACTIVE');
      expect(updatedMO.notes).toBe('Updated test notes');
    });

    it('should throw error for non-existent MO update', async () => {
      const updateData = { status: 'ACTIVE' };
      
      await expect(
        manufacturingOrderService.updateManufacturingOrder(99999, updateData)
      ).rejects.toThrow('Manufacturing order not found');
    });
  });

  describe('MO Statistics', () => {
    it('should get MO statistics', async () => {
      const stats = await manufacturingOrderService.getMOStatistics(createdMOId);
      
      expect(stats).toBeDefined();
      expect(stats.id).toBe(createdMOId);
      expect(stats.target_quantity).toBe(100);
      expect(stats.completed_quantity).toBe(0);
      expect(stats.failed_quantity).toBe(0);
      expect(stats.completion_percentage).toBe('0.00');
    });
  });

  describe('Order Number Generation', () => {
    it('should generate unique order numbers', async () => {
      const moData1 = {
        panel_type: 'TYPE_72',
        target_quantity: 50,
        year_code: '25',
        frame_type: 'BLACK',
        backsheet_type: 'TRANSPARENT',
        created_by: testUserId
      };

      const moData2 = {
        panel_type: 'TYPE_40',
        target_quantity: 75,
        year_code: '25',
        frame_type: 'SILVER',
        backsheet_type: 'BLACK',
        created_by: testUserId
      };

      const mo1 = await manufacturingOrderService.createManufacturingOrder(moData1);
      const mo2 = await manufacturingOrderService.createManufacturingOrder(moData2);
      
      expect(mo1.order_number).not.toBe(mo2.order_number);
      expect(mo1.order_number).toMatch(/^MO25\d{4}$/);
      expect(mo2.order_number).toMatch(/^MO25\d{4}$/);
      
      // Clean up
      await db.query('DELETE FROM manufacturing_orders WHERE id IN ($1, $2)', [mo1.id, mo2.id]);
    });
  });
});

describe('Manufacturing Order Controller', () => {
  // Note: Controller tests would require mocking the request/response objects
  // and authentication middleware. This is a basic structure.
  
  it('should have all required controller methods', () => {
    expect(typeof manufacturingOrderController.createManufacturingOrder).toBe('function');
    expect(typeof manufacturingOrderController.getManufacturingOrderById).toBe('function');
    expect(typeof manufacturingOrderController.getManufacturingOrderByNumber).toBe('function');
    expect(typeof manufacturingOrderController.getManufacturingOrders).toBe('function');
    expect(typeof manufacturingOrderController.updateManufacturingOrder).toBe('function');
    expect(typeof manufacturingOrderController.deleteManufacturingOrder).toBe('function');
    expect(typeof manufacturingOrderController.getMOStatistics).toBe('function');
  });
});
