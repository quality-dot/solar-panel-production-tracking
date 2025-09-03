export default {
  // Test environment
  testEnvironment: 'node',
  
  // File extensions to test
  extensionsToTreatAsEsm: ['.js'],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/logs/',
    '/scripts/',
    '/migrations/'
  ],
  
  // Test timeout
  testTimeout: 10000,
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/backend/test/setup.js'],
  
  // Module name mapping for ES6 imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/backend/$1'
  },
  
  // Transform configuration
  transform: {},
  
  // Global test variables
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Verbose output
  verbose: true,
  
  // Force exit after tests
  forceExit: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Reset modules between tests
  resetModules: true
};
