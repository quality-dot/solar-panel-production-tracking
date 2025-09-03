// Jest Configuration for Historical Data System Tests
// Task 10.4.8 - Create Comprehensive Testing Suite

export default {
  // Test environment
  testEnvironment: 'node',
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Test file patterns
  testMatch: [
    '**/backend/test/**/*.test.js',
    '**/backend/test/**/*.spec.js',
    '**/backend/test/test-*.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'backend/services/**/*.js',
    'backend/controllers/**/*.js',
    'backend/routes/**/*.js',
    '!**/node_modules/**',
    '!**/test/**'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/backend/test/setup.js'],
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Module name mapping for ES modules
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  
  // Global setup
  globalSetup: '<rootDir>/backend/test/global-setup.js',
  globalTeardown: '<rootDir>/backend/test/global-teardown.js'
};
