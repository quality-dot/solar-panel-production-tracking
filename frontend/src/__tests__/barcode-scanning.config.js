/**
 * Barcode Scanning Test Configuration
 * Specific configuration for barcode scanning system tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  
  // Test patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*barcode*.{ts,tsx}',
    '<rootDir>/src/**/*barcode*.{test,spec}.{ts,tsx}',
    '<rootDir>/src/services/__tests__/barcodeScanningService.test.ts',
    '<rootDir>/src/components/__tests__/BarcodeScanner.test.tsx',
    '<rootDir>/src/pages/__tests__/PanelScan.test.tsx',
    '<rootDir>/src/components/__tests__/StationWorkflow.test.tsx',
    '<rootDir>/src/__tests__/barcode-scanning.test.ts',
  ],
  
  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/services/barcodeScanningService.ts',
    'src/services/stationWorkflowService.ts',
    'src/components/BarcodeScanner.tsx',
    'src/components/StationWorkflow.tsx',
    'src/pages/PanelScan.tsx',
    'src/pages/Station.tsx',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/**/__tests__/**',
  ],
  
  // Coverage thresholds for barcode scanning system
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // Specific thresholds for barcode scanning files
    'src/services/barcodeScanningService.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    'src/components/BarcodeScanner.tsx': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/pages/PanelScan.tsx': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Global mocks
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },
  
  // Mock configurations
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    // Mock external libraries
    'html5-qrcode': '<rootDir>/src/__mocks__/html5-qrcode.js',
    'react-router-dom': '<rootDir>/src/__mocks__/react-router-dom.js',
  },
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output for debugging
  verbose: true,
  
  // Test results processor
  testResultsProcessor: 'jest-sonar-reporter',
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
  ],
  
  // Coverage directory
  coverageDirectory: 'coverage/barcode-scanning',
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
};
