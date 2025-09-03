# Development Environment Setup

This document provides comprehensive guidance for setting up and using the development environment for the Solar Panel Manufacturing API.

## 🚀 Quick Start

### 1. Initial Setup
```bash
# Install dependencies
npm install

# Setup development environment
npm run dev:setup

# Start development server
npm run dev:start
```

### 2. Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test categories
npm run dev:test:quick      # Core tests only
npm run dev:test:db         # Database tests
npm run dev:test:validation # Validation tests
npm run dev:test:workflow   # Workflow tests
```

## 📁 Project Structure

```
backend/
├── config/                 # Environment configurations
│   ├── development.js      # Development settings
│   ├── production.js       # Production settings
│   ├── database.js         # Database configuration
│   └── environment.js      # Environment variables
├── scripts/                # Development and utility scripts
│   ├── dev-workflow.js     # Main development workflow
│   ├── test-runner.js      # Comprehensive test runner
│   └── ...                 # Other utility scripts
├── __tests__/              # Test files
│   ├── middleware/         # Middleware tests
│   ├── services/           # Service tests
│   └── utils/              # Utility tests
├── routes/                 # API routes
├── middleware/             # Express middleware
├── services/               # Business logic services
└── utils/                  # Utility functions
```

## ⚙️ Configuration Files

### Nodemon Configuration (`nodemon.json`)
- **Watch Patterns**: Monitors `backend/**/*.js` and `backend/**/*.json`
- **Ignore Patterns**: Excludes logs, tests, and node_modules
- **Environment**: Sets development-specific environment variables
- **Restart**: Uses `rs` command for manual restart

### Jest Configuration (`jest.config.js`)
- **Test Environment**: Node.js environment
- **Coverage**: Generates HTML, LCOV, and text reports
- **File Patterns**: Tests `**/__tests__/**/*.test.js` files
- **Timeout**: 10 seconds per test
- **Setup**: Uses `backend/test/setup.js` for global configuration

### Environment Configurations
- **Development** (`backend/config/development.js`): Optimized for development
- **Production** (`backend/config/production.js`): Production-ready settings
- **Database** (`backend/config/database.js`): Connection pool configuration

## 🧪 Testing Framework

### Test Setup (`backend/test/setup.js`)
- **Global Utilities**: Test data generators, mock helpers
- **Environment**: Test-specific environment variables
- **Mocking**: Console and process mocking
- **Cleanup**: Automatic cleanup between tests

### Test Categories
1. **Unit Tests**: Individual component testing
2. **Integration Tests**: Component interaction testing
3. **Database Tests**: Database connection and query testing
4. **API Tests**: Endpoint and route testing
5. **Validation Tests**: Middleware and input validation
6. **Workflow Tests**: Business logic and state machine testing

### Test Utilities
```javascript
// Generate test barcodes
const barcode = global.testUtils.generateTestBarcode('01', '01', '12345');

// Generate test panel data
const panel = global.testUtils.generateTestPanel({
  panelType: 'Monocrystalline',
  powerRating: '400W'
});

// Generate test station data
const station = global.testUtils.generateTestStation({
  id: 'STATION_1',
  name: 'Assembly & EL'
});

// Mock database connection
const mockDb = global.testUtils.mockDatabaseConnection();
```

## 🔧 Development Scripts

### Core Development Commands
```bash
# Development environment management
npm run dev:setup          # Setup development environment
npm run dev:start          # Start development server
npm run dev:status         # Check development status
npm run dev:cleanup        # Clean up development artifacts

# Testing commands
npm run dev:test           # Run full test suite
npm run dev:test:quick     # Run quick tests
npm run dev:test:db        # Run database tests
npm run dev:test:validation # Run validation tests
npm run dev:test:workflow  # Run workflow tests
npm run dev:test:load      # Run load tests
npm run dev:test:benchmark # Run benchmark tests

# Health and monitoring
npm run dev:health         # Run health checks
npm run dev:data           # Generate test data
```

### Test Runner Commands
```bash
# Using the test runner directly
node backend/scripts/test-runner.js unit
node backend/scripts/test-runner.js integration
node backend/scripts/test-runner.js coverage
node backend/scripts/test-runner.js watch
node backend/scripts/test-runner.js specific backend/middleware/__tests__/validation.test.js
```

### Development Workflow Commands
```bash
# Using the development workflow
node backend/scripts/dev-workflow.js start
node backend/scripts/dev-workflow.js test
node backend/scripts/dev-workflow.js test:quick
node backend/scripts/dev-workflow.js status
```

## 🗄️ Database Development

### Database Setup
```bash
# Initialize database
npm run db:init

# Run migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Reset database
npm run db:reset
```

### Database Testing
```bash
# Test database connection pool
npm run test-db-pool

# Test API routes
npm run test-api-routes

# Run database-specific tests
npm run dev:test:db
```

## 📊 Monitoring and Health Checks

### Health Check Endpoints
- **`/health`**: Basic health status
- **`/status`**: Comprehensive system status
- **`/ready`**: Kubernetes readiness probe
- **`/live`**: Kubernetes liveness probe
- **`/metrics`**: Prometheus-style metrics
- **`/health/database`**: Database-specific health

### Development Health Checks
```bash
# Run health check endpoints
npm run dev:health

# Check development status
npm run dev:status
```

## 🚀 Performance Testing

### Load Testing
```bash
# Basic load test
npm run load-test

# Stress test
npm run load-test-stress

# Benchmark tests
npm run benchmark

# Cache tests
npm run cache-test
```

### Load Test Configuration
- **Stations**: Configurable number of concurrent stations
- **Barcodes**: Configurable number of barcodes per test
- **Duration**: Configurable test duration
- **Metrics**: Response time, throughput, error rates

## 🔍 Debugging and Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database status
npm run dev:status

# Test database connection
npm run test-db-pool

# Verify environment variables
cat .env
```

#### 2. Test Failures
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific failing test
npm test -- --testNamePattern="test name"

# Check test coverage
npm run test:coverage
```

#### 3. Development Server Issues
```bash
# Check development status
npm run dev:status

# Clean up and restart
npm run dev:cleanup
npm run dev:start

# Check logs
npm run logs
npm run logs:error
```

### Debug Mode
- **Environment**: Set `LOG_LEVEL=debug` in `.env`
- **Console**: Detailed logging to console
- **Files**: Detailed logging to log files
- **Performance**: Performance monitoring enabled

## 📝 Code Quality

### Testing Standards
- **Coverage**: Minimum 80% code coverage
- **Unit Tests**: All public functions tested
- **Integration Tests**: Component interactions tested
- **Error Handling**: Error scenarios covered
- **Edge Cases**: Boundary conditions tested

### Code Style
- **ES6 Modules**: Use ES6 import/export syntax
- **Async/Await**: Prefer async/await over callbacks
- **Error Handling**: Use try/catch with proper error types
- **Logging**: Use structured logging with categories
- **Documentation**: JSDoc comments for public APIs

## 🔄 Continuous Integration

### Pre-commit Checks
```bash
# Run all tests
npm test

# Check code coverage
npm run test:coverage

# Run linting (if configured)
npm run lint

# Run security checks (if configured)
npm audit
```

### CI/CD Pipeline
- **Test Stage**: Run full test suite
- **Coverage Stage**: Generate coverage reports
- **Build Stage**: Build production artifacts
- **Deploy Stage**: Deploy to staging/production

## 📚 Additional Resources

### Documentation
- [API Reference](API_REFERENCE.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [Error Handling](ERROR_HANDLING.md)
- [Validation Middleware](VALIDATION_MIDDLEWARE.md)
- [Response Standardization](RESPONSE_STANDARDIZATION.md)
- [Station Workflow Engine](STATION_WORKFLOW_ENGINE.md)
- [Barcode Scanning Integration](BARCODE_SCANNING_INTEGRATION.md)

### External Tools
- **Jest**: JavaScript testing framework
- **Nodemon**: Development server with auto-restart
- **PostgreSQL**: Primary database
- **Express**: Web framework
- **Morgan**: HTTP request logger

### Best Practices
1. **Always run tests** before committing code
2. **Use descriptive test names** that explain the scenario
3. **Mock external dependencies** in unit tests
4. **Test error conditions** and edge cases
5. **Keep tests fast** and focused
6. **Use test utilities** for common operations
7. **Maintain test coverage** above 80%
8. **Document complex test scenarios**

## 🆘 Getting Help

### Development Team
- **Lead Developer**: [Contact Information]
- **QA Engineer**: [Contact Information]
- **DevOps Engineer**: [Contact Information]

### Support Channels
- **GitHub Issues**: Report bugs and feature requests
- **Slack**: #manufacturing-api-dev channel
- **Email**: dev-support@company.com
- **Documentation**: [Internal Wiki Link]

### Emergency Contacts
- **Production Issues**: [Emergency Contact]
- **Security Issues**: [Security Contact]
- **Database Issues**: [DBA Contact]
