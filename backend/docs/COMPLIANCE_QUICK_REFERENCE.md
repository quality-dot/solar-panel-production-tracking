# Compliance Framework Quick Reference

## Quick Start

### 1. Basic Setup
```javascript
import { ComplianceService } from './services/complianceService.js';
import { EnterpriseLoggingService } from './services/enterpriseLoggingService.js';

// Initialize services
const complianceService = new ComplianceService();
const loggingService = new EnterpriseLoggingService();
```

### 2. Run Compliance Assessment
```javascript
// Perform assessment
await complianceService.performComplianceAssessment();

// Get compliance score
const score = complianceService.complianceState.complianceScore;
console.log(`Compliance Score: ${score.toFixed(2)}`);
```

### 3. Generate Report
```javascript
// Generate compliance report
const report = await complianceService.generateComplianceReport();
console.log(`Report ID: ${report.reportId}`);
console.log(`Status: ${report.overallCompliance.status}`);
```

## Service APIs

### ComplianceService

| Method | Description | Returns |
|--------|-------------|---------|
| `performComplianceAssessment()` | Run full compliance assessment | Promise<void> |
| `generateComplianceReport()` | Generate compliance report | Promise<Object> |
| `getComplianceState()` | Get current compliance state | Object |
| `updateConfig(newConfig)` | Update configuration | void |

### EnterpriseLoggingService

| Method | Description | Returns |
|--------|-------------|---------|
| `log(level, message, meta)` | Log application message | void |
| `logAudit(action, details)` | Log audit event | void |
| `logSecurity(event, details)` | Log security event | void |
| `logCompliance(framework, event, details)` | Log compliance event | void |
| `setCorrelationId(id)` | Set correlation ID | string |
| `getCorrelationId()` | Get current correlation ID | string |

### ComplianceMonitoringService

| Method | Description | Returns |
|--------|-------------|---------|
| `performRealTimeComplianceCheck()` | Run real-time check | Promise<void> |
| `performHealthCheck()` | Run health check | Promise<Object> |
| `getMonitoringState()` | Get monitoring state | Object |
| `getMetricsSummary()` | Get metrics summary | Object |

### ComplianceValidationService

| Method | Description | Returns |
|--------|-------------|---------|
| `performPeriodicValidation()` | Run validation | Promise<Object> |
| `getValidationState()` | Get validation state | Object |
| `getValidationStats()` | Get validation statistics | Object |

## Configuration Options

### ComplianceService Config
```javascript
{
  isa99: {
    enabled: true,
    zones: ['DMZ', 'Control', 'Supervisory', 'Enterprise'],
    securityLevels: [1, 2, 3, 4]
  },
  nist: {
    enabled: true,
    framework: 'CSF',
    functions: ['Identify', 'Protect', 'Detect', 'Respond', 'Recover']
  },
  gdpr: {
    enabled: true,
    dataRetention: 7 * 365 * 24 * 60 * 60 * 1000 // 7 years
  }
}
```

### EnterpriseLoggingService Config
```javascript
{
  logging: {
    level: 'info',
    enableConsole: true,
    enableFile: true,
    enableDatabase: false,
    enableRemote: false
  },
  security: {
    enableAuditLogging: true,
    enableSecurityLogging: true,
    enableComplianceLogging: true,
    maskSensitiveData: true
  }
}
```

## Common Patterns

### 1. Request Logging with Correlation ID
```javascript
app.use((req, res, next) => {
  const correlationId = loggingService.setCorrelationId();
  req.correlationId = correlationId;
  
  loggingService.logAudit('request_started', {
    method: req.method,
    url: req.url,
    correlationId
  });
  
  next();
});
```

### 2. Compliance Monitoring in Express Route
```javascript
app.get('/api/data', async (req, res) => {
  try {
    // Log compliance event
    loggingService.logCompliance('ISA-99', 'data_access', {
      userId: req.user.id,
      endpoint: '/api/data'
    });
    
    // Your business logic here
    const data = await getData();
    
    res.json(data);
  } catch (error) {
    loggingService.logSecurity('data_access_error', {
      error: error.message,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 3. Health Check Endpoint
```javascript
app.get('/health/compliance', async (req, res) => {
  try {
    const healthCheck = await monitoringService.performHealthCheck();
    res.json(healthCheck);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 4. Compliance Status Endpoint
```javascript
app.get('/api/compliance/status', async (req, res) => {
  const state = complianceService.getComplianceState();
  res.json({
    overallScore: state.complianceScore,
    lastAudit: state.lastAudit,
    frameworks: {
      isa99: state.isa99.complianceScore,
      nist: state.nist.overallScore,
      gdpr: state.gdpr.complianceScore
    }
  });
});
```

## Event Types

### Audit Events
- `user_login` - User authentication
- `user_logout` - User session termination
- `data_access` - Data access operations
- `configuration_change` - System configuration changes
- `permission_change` - User permission modifications

### Security Events
- `failed_login` - Authentication failures
- `suspicious_activity` - Unusual behavior detection
- `access_denied` - Authorization failures
- `data_breach` - Potential data exposure
- `system_compromise` - Security incident

### Compliance Events
- `assessment_completed` - Compliance assessment finished
- `violation_detected` - Compliance violation found
- `remediation_completed` - Violation remediation finished
- `report_generated` - Compliance report created
- `threshold_exceeded` - Compliance threshold breached

## Log Levels

| Level | Description | Usage |
|-------|-------------|-------|
| `error` | Error conditions | System errors, failures |
| `warn` | Warning conditions | Potential issues, violations |
| `info` | Informational messages | Normal operations, status |
| `debug` | Debug information | Detailed debugging info |
| `verbose` | Verbose information | Very detailed information |

## Monitoring Thresholds

### Default Thresholds
```javascript
{
  complianceScore: 0.8,    // 80% minimum compliance
  responseTime: 5000,      // 5 second response time limit
  errorRate: 0.05,         // 5% maximum error rate
  availability: 0.99       // 99% minimum availability
}
```

### Alert Severities
- **Critical**: Immediate action required
- **High**: Action required within 1 hour
- **Medium**: Action required within 4 hours
- **Low**: Action required within 24 hours

## Troubleshooting

### Common Issues

1. **"options.stream is required" Error**
   - Check Winston transport configuration
   - Ensure all required stream options are provided

2. **High Memory Usage**
   - Review log retention settings
   - Check for memory leaks in logging services
   - Optimize batch processing settings

3. **Compliance Score Always 0**
   - Verify compliance frameworks are enabled
   - Check assessment methods are being called
   - Review compliance state initialization

4. **Logs Not Appearing**
   - Check log level configuration
   - Verify file permissions
   - Ensure disk space is available

### Debug Commands

```javascript
// Enable debug logging
const loggingService = new EnterpriseLoggingService({
  logging: { level: 'debug' }
});

// Check compliance state
console.log(complianceService.getComplianceState());

// Check monitoring state
console.log(monitoringService.getMonitoringState());

// Check validation statistics
console.log(validationService.getValidationStats());
```

## Environment Variables

```bash
# Compliance
COMPLIANCE_ISA99_ENABLED=true
COMPLIANCE_NIST_ENABLED=true
COMPLIANCE_GDPR_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_FILE=true
LOG_ENABLE_DATABASE=false

# Monitoring
MONITORING_ENABLED=true
MONITORING_ALERTING=true
MONITORING_REPORTING=true

# Security
SECURITY_AUDIT_LOGGING=true
SECURITY_COMPLIANCE_LOGGING=true
SECURITY_MASK_SENSITIVE_DATA=true
```

## File Locations

```
backend/
├── services/
│   ├── complianceService.js
│   ├── complianceMonitoringService.js
│   ├── complianceValidationService.js
│   ├── enterpriseLoggingService.js
│   ├── structuredLoggingService.js
│   └── logFormattingService.js
├── docs/
│   ├── COMPLIANCE_FRAMEWORK_DOCUMENTATION.md
│   └── COMPLIANCE_QUICK_REFERENCE.md
├── test/
│   ├── test-compliance-framework.js
│   ├── test-compliance-simple.js
│   └── test-compliance-basic.js
└── logs/
    ├── audit.log
    ├── security.log
    ├── compliance.log
    ├── combined.log
    └── error.log
```

## Support

For additional help:
1. Check the full documentation: `COMPLIANCE_FRAMEWORK_DOCUMENTATION.md`
2. Review test files for usage examples
3. Check logs for error messages
4. Contact the development team
