/**
 * Test Setup File for Manufacturing API
 * Configures Jest environment and global test utilities
 */

import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_manufacturing';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.LOG_LEVEL = 'error';

// Global test utilities
global.testUtils = {
  // Generate test barcode
  generateTestBarcode: (lineNum = '01', stationNum = '01', moNum = '12345') => {
    return `CRS${lineNum.toString().padStart(2, '0')}YF${stationNum.toString().padStart(2, '0')}PP${moNum.toString().padStart(5, '0')}`;
  },
  
  // Generate test panel data
  generateTestPanel: (overrides = {}) => ({
    barcode: global.testUtils.generateTestBarcode(),
    panelType: 'Monocrystalline',
    powerRating: '400W',
    lineNumber: '01',
    stationNumber: '01',
    manufacturingOrder: '12345',
    status: 'pending',
    ...overrides
  }),
  
  // Generate test station data
  generateTestStation: (overrides = {}) => ({
    id: 'STATION_1',
    name: 'Assembly & EL',
    status: 'active',
    currentPanel: null,
    workflowState: 'idle',
    ...overrides
  }),
  
  // Generate test manufacturing order
  generateTestMO: (overrides = {}) => ({
    id: 'MO_001',
    orderNumber: 'MO-2024-001',
    customer: 'Test Customer',
    panelType: 'Monocrystalline',
    quantity: 100,
    status: 'active',
    startDate: new Date().toISOString(),
    ...overrides
  }),
  
  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock database connection
  mockDatabaseConnection: () => ({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue(),
    end: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    removeAllListeners: jest.fn()
  })
};

// Setup before each test
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset environment
  process.env.NODE_ENV = 'test';
});

// Cleanup after each test
afterEach(() => {
  // Clean up any global state
  if (global.testUtils) {
    delete global.testUtils;
  }
});

// Global test error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
