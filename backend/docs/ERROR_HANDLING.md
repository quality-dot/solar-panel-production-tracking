# Enhanced Error Handling Middleware System

## Overview
The Enhanced Error Handling Middleware System provides comprehensive error handling capabilities specifically designed for manufacturing operations. It includes custom error classes, automated recovery strategies, trend analysis, and detailed metrics for production floor reliability.

## Architecture

### Core Components
- **Custom Error Classes**: Manufacturing-specific error types with detailed context
- **Global Error Handler**: Centralized error processing middleware
- **Error Classification**: Automatic categorization and recovery strategy assignment
- **Manufacturing Error Scenarios**: Production line, station, and barcode error handling
- **Error Trend Analysis**: Pattern detection and trending analysis
- **Recovery Automation**: Automated error recovery strategies
- **Error Metrics**: Comprehensive error tracking and reporting

## Error Classes

### Base Error Class: ManufacturingError
```javascript
class ManufacturingError extends Error {
  constructor(message, code, context = {}, severity = 'ERROR', recoverable = true)
}
```

**Properties:**
- `message`: Human-readable error description
- `code`: Unique error code for categorization
- `context`: Additional error context and metadata
- `severity`: Error severity level (INFO, WARN, ERROR, CRITICAL)
- `recoverable`: Whether the error can be automatically recovered
- `timestamp`: When the error occurred
- `errorId`: Unique error identifier

### Specialized Error Classes

#### 1. ValidationError
- **Status Code**: 400
- **Use Case**: Input validation failures
- **Recovery**: Retry with corrections

```javascript
const error = new ValidationError('Invalid barcode format', { 
  field: 'barcode', 
  value: 'INVALID',
  expectedFormat: 'CRSYYFBPP#####' 
});
```

#### 2. BarcodeError
- **Status Code**: 400
- **Use Case**: Barcode processing failures
- **Recovery**: Manual entry available

```javascript
const error = new BarcodeError('Barcode not found', 'MISSING123', { 
  expectedFormat: 'CRSYYFBPP#####',
  suggestions: ['Clean barcode', 'Check format', 'Use manual entry']
});
```

#### 3. DatabaseError
- **Status Code**: 500
- **Use Case**: Database operation failures
- **Recovery**: Retry after delay

```javascript
const error = new DatabaseError('Connection failed', 'SELECT', { 
  table: 'panels',
  query: 'SELECT * FROM panels WHERE barcode = $1',
  parameters: ['CRS24WT3600001']
});
```

#### 4. AuthenticationError
- **Status Code**: 401
- **Use Case**: Authentication failures
- **Recovery**: Require relogin

```javascript
const error = new AuthenticationError('Invalid credentials', { 
  userId: 'user123',
  attemptedLogin: new Date().toISOString(),
  ipAddress: req.ip
});
```

#### 5. StationError
- **Status Code**: 400
- **Use Case**: Station-specific failures
- **Recovery**: Check station configuration

```javascript
const error = new StationError('Station offline', 'OFFLINE_STATION', { 
  status: 'OFFLINE',
  lastSeen: '2024-01-01T00:00:00Z',
  availableStations: ['STATION_1', 'STATION_2']
});
```

#### 6. WorkflowError
- **Status Code**: 409
- **Use Case**: Workflow state transition failures
- **Recovery**: Review panel state

```javascript
const error = new WorkflowError('Invalid state transition', 'PANEL_123', 'SCANNED', 'PROCESS', { 
  allowedTransitions: ['SCANNED', 'VALIDATED'],
  currentState: 'SCANNED',
  attemptedAction: 'PROCESS'
});
```

## Error Classification

### Automatic Classification
The system automatically classifies errors based on:
- Error class type
- Database error codes
- Network error codes
- Custom error codes

### Classification Categories
- `validation`: Input validation errors
- `barcode`: Barcode processing errors
- `database`: Database operation errors
- `authentication`: Authentication failures
- `authorization`: Authorization failures
- `station`: Station-specific errors
- `workflow`: Workflow state errors
- `duplicate_key`: Database duplicate key violations
- `foreign_key_violation`: Database foreign key violations
- `connection_error`: Network connection errors

### Recovery Strategy Assignment
Each error category has an associated recovery strategy:
- `retry_with_corrections`: For validation errors
- `manual_entry_available`: For barcode errors
- `retry_after_delay`: For database errors
- `require_relogin`: For authentication errors
- `contact_supervisor`: For authorization errors
- `check_station_config`: For station errors
- `review_panel_state`: For workflow errors

## Manufacturing Error Scenarios

### Production Line Error Handling
```javascript
const result = ManufacturingErrorScenarios.handleProductionLineError(
  lineNumber, 
  error, 
  context
);
```

**Features:**
- Recurring error detection (escalates after 3+ occurrences)
- Line-specific recovery actions
- Equipment failure handling
- Overload detection

### Station Error Handling
```javascript
const result = ManufacturingErrorScenarios.handleStationError(
  stationId, 
  error, 
  context
);
```

**Features:**
- Error pattern tracking
- Automatic offline recommendation after 5+ errors
- Scanner failure handling
- Configuration validation

### Barcode Processing Error Handling
```javascript
const result = ManufacturingErrorScenarios.handleBarcodeProcessingError(
  barcode, 
  error, 
  context
);
```

**Features:**
- Error pattern analysis
- Recurring error detection after 10+ occurrences
- Format validation suggestions
- Manual entry alternatives

### Manufacturing Order Error Handling
```javascript
const result = ManufacturingErrorScenarios.handleManufacturingOrderError(
  moId, 
  error, 
  context
);
```

**Features:**
- MO validation error handling
- Panel type consistency checking
- Sequence range validation
- Production planning integration

## Error Trend Analysis

### ErrorTrendAnalyzer Class
```javascript
const trendAnalyzer = new ErrorTrendAnalyzer();

// Record errors for analysis
trendAnalyzer.recordError('ValidationError', 'INVALID_FORMAT', { field: 'barcode' });

// Get trend analysis
const trends = trendAnalyzer.getTrendAnalysis();
const criticalTrends = trendAnalyzer.getCriticalTrends();
const frequency = trendAnalyzer.getErrorFrequency('hour');
```

**Features:**
- Automatic trend detection (INCREASING, DECREASING, STABLE)
- Change rate calculation
- Time-based frequency analysis
- Critical trend identification

### Trend Analysis Output
```json
{
  "ValidationError_INVALID_FORMAT": {
    "trend": "INCREASING",
    "recentCount": 15,
    "olderCount": 8,
    "changeRate": 87.5,
    "lastUpdated": "2024-12-19T10:30:00.000Z"
  }
}
```

## Error Recovery Automation

### ErrorRecoveryAutomation Class
```javascript
const recoveryAutomation = new ErrorRecoveryAutomation();

// Register recovery strategy
recoveryAutomation.registerRecoveryStrategy('ValidationError', 'INVALID_FORMAT', {
  name: 'Format Validation Recovery',
  description: 'Attempts to clean and re-validate input data',
  execute: async (context) => {
    // Recovery logic here
    return { success: true, details: { action: 'Data cleaning attempted' } };
  }
});

// Attempt recovery
const result = await recoveryAutomation.attemptRecovery('ValidationError', 'INVALID_FORMAT', context);
```

**Features:**
- Strategy registration for specific error types
- Automated recovery execution
- Success/failure tracking
- Enable/disable automation

## Error Metrics and Reporting

### ManufacturingErrorMetrics Class
```javascript
const errorMetrics = new ManufacturingErrorMetrics();

// Record errors
errorMetrics.recordError(error);

// Record recovery attempts
errorMetrics.recordRecoveryAttempt(success);

// Get comprehensive metrics
const metrics = errorMetrics.getMetrics();
```

**Metrics Include:**
- Total error count
- Errors by type
- Errors by severity
- Errors by production line
- Errors by station
- Recovery success rate
- Uptime and error frequency

### Metrics Output
```json
{
  "summary": {
    "totalErrors": 45,
    "uptimeHours": 12.5,
    "errorsPerHour": 3.6,
    "recoverySuccessRate": 78.5,
    "totalRecoveryAttempts": 28,
    "successfulRecoveries": 22
  },
  "byType": {
    "ValidationError": 15,
    "BarcodeError": 12,
    "DatabaseError": 8,
    "StationError": 10
  },
  "bySeverity": {
    "ERROR": 35,
    "WARN": 8,
    "CRITICAL": 2
  }
}
```

## Integration with Express

### Basic Setup
```javascript
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Add error handling middleware (must be after routes)
app.use(globalErrorHandler);
app.use(notFoundHandler);
```

### Async Error Handling
```javascript
import { asyncHandler } from './middleware/errorHandler.js';

// Wrap async route handlers
app.get('/api/panels', asyncHandler(async (req, res) => {
  const panels = await panelService.getAll();
  res.json(panels);
}));
```

### Custom Error Responses
```javascript
// Error responses are automatically formatted
app.get('/test-error', (req, res, next) => {
  next(new ValidationError('Test error', { field: 'test' }));
});
```

## Error Response Format

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "id": "ERR_1734618600000_abc123def",
    "message": "Invalid barcode format",
    "code": "VALIDATION_ERROR",
    "category": "validation",
    "recoveryStrategy": "retry_with_corrections",
    "timestamp": "2024-12-19T10:30:00.000Z",
    "station": {
      "id": "STATION_1",
      "line": "LINE_1"
    },
    "context": {
      "field": "barcode",
      "value": "INVALID",
      "expectedFormat": "CRSYYFBPP#####"
    }
  }
}
```

### Development Mode Details
In development mode, additional details are included:
```json
{
  "error": {
    "details": {
      "stack": "Error stack trace",
      "originalError": "Original error details",
      "additionalContext": "Extra debugging information"
    }
  }
}
```

## Testing

### Test Server
Run the comprehensive test server:
```bash
cd backend
node scripts/test-enhanced-error-handling.js
```

### Test Endpoints
- `/test-success` - Successful response
- `/test-validation-error` - Validation error
- `/test-barcode-error` - Barcode error
- `/test-database-error` - Database error
- `/test-auth-error` - Authentication error
- `/test-station-error` - Station error
- `/test-workflow-error` - Workflow error
- `/test-line-error/1` - Production line error
- `/test-async-error` - Async error
- `/test-manufacturing-scenarios` - Manufacturing scenarios
- `/test-trend-analysis` - Trend analysis
- `/test-recovery-automation` - Recovery automation
- `/test-error-metrics` - Error metrics

### Testing with Different Stations
```bash
# Test station-specific error handling
curl -H "x-station-id: STATION_1" http://localhost:3002/test-station-error
curl -H "x-station-id: STATION_2" http://localhost:3002/test-station-error
```

## Configuration

### Environment Variables
- `NODE_ENV`: Set to 'development' for detailed error information
- `LOG_LEVEL`: Control error logging verbosity

### Performance Tuning
- Error history retention: 100 errors per type
- Trend analysis window: 10 recent vs 10 older errors
- Critical trend threshold: 50% increase

## Best Practices

### 1. Use Appropriate Error Classes
- Choose the most specific error class for your use case
- Include relevant context in the error details
- Set appropriate severity levels

### 2. Implement Recovery Strategies
- Register automated recovery strategies for common errors
- Provide clear recovery instructions for operators
- Monitor recovery success rates

### 3. Monitor Error Trends
- Regularly review error trend analysis
- Investigate increasing error patterns
- Proactively address recurring issues

### 4. Error Context
- Always include relevant manufacturing context
- Provide actionable recovery information
- Log sufficient detail for debugging

### 5. Performance Considerations
- Limit error history size to prevent memory issues
- Use async error handling for non-blocking operations
- Implement circuit breakers for external services

## Troubleshooting

### Common Issues

#### 1. Errors Not Being Caught
- Ensure error handling middleware is added after routes
- Use `asyncHandler` for async route handlers
- Check that errors are passed to `next()`

#### 2. Missing Error Context
- Verify that `req.station` is set by station identification middleware
- Check that `req.timestamp` is available
- Ensure error details are properly structured

#### 3. Recovery Strategies Not Executing
- Verify strategy registration for error type and code
- Check that automated recovery is enabled
- Review strategy execution logic

#### 4. Metrics Not Updating
- Ensure `recordError()` is called for each error
- Check that `recordRecoveryAttempt()` is called after recovery
- Verify metrics reset timing

## Future Enhancements

### Planned Features
- **Alerting Integration**: Email, Slack, and SMS notifications
- **Machine Learning**: Predictive error analysis and prevention
- **Advanced Recovery**: Multi-step recovery workflows
- **Error Correlation**: Linking related errors across services
- **Performance Impact**: Error impact on production metrics

### Integration Opportunities
- **Monitoring Systems**: Prometheus, Grafana, DataDog
- **Log Aggregation**: ELK Stack, Splunk, Fluentd
- **Incident Management**: PagerDuty, OpsGenie, ServiceNow
- **Quality Management**: Statistical process control integration

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Maintainer**: Development Team
