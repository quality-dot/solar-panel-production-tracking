# PostgreSQL Connection Pool System

## Overview

The PostgreSQL Connection Pool System provides a robust, production-ready database connection management solution specifically optimized for manufacturing operations. It handles connection pooling, monitoring, error recovery, and graceful degradation to ensure reliable database operations in production environments.

## Architecture

### Core Components

#### 1. DatabaseManager Class
The central class that manages the PostgreSQL connection pool and provides a unified interface for database operations.

**Key Features:**
- Connection pool initialization and management
- Pool event monitoring and logging
- Health status monitoring
- Transaction support with automatic rollback
- Graceful shutdown handling
- Performance monitoring and statistics

#### 2. Connection Pool Configuration
Environment-specific pool settings optimized for manufacturing workloads:

**Development Environment:**
```javascript
pool: {
  min: 2,        // Minimum connections
  max: 10,       // Maximum connections
  acquire: 30000, // Connection acquisition timeout (30s)
  idle: 10000    // Idle connection timeout (10s)
}
```

**Production Environment:**
```javascript
pool: {
  min: 5,        // Higher minimum for reliability
  max: 20,       // Higher maximum for 8 concurrent stations
  acquire: 60000, // Longer acquisition timeout (60s)
  idle: 300000   // Longer idle timeout (5 minutes)
}
```

#### 3. Pool Event Handlers
Comprehensive monitoring of pool lifecycle events:

- **connect**: New client connections
- **acquire**: Client acquisition from pool
- **release**: Client release back to pool
- **error**: Pool errors with detailed logging
- **remove**: Client removal from pool

## Features

### 1. Connection Pool Management

#### Pool Initialization
```javascript
import { databaseManager } from '../config/database.js';

// Initialize the connection pool
const pool = await databaseManager.initialize();
```

#### Pool Statistics
```javascript
// Get comprehensive pool statistics
const stats = databaseManager.getPoolStatistics();
console.log('Pool utilization:', stats.utilization + '%');
console.log('Total connections:', stats.totalConnections);
console.log('Idle connections:', stats.idleConnections);
```

### 2. Query Execution

#### Simple Queries
```javascript
// Execute a simple query
const result = await databaseManager.query(
  'SELECT * FROM panels WHERE status = $1',
  ['PENDING']
);
```

#### Parameterized Queries
```javascript
// Execute with parameters (prevents SQL injection)
const result = await databaseManager.query(
  'INSERT INTO panels (barcode, panel_type) VALUES ($1, $2)',
  [barcode, panelType]
);
```

### 3. Transaction Support

#### Automatic Transaction Management
```javascript
// Execute a transaction with automatic rollback on error
const result = await databaseManager.executeTransaction(async (client) => {
  // All operations use the same client
  const panel = await databaseManager.queryWithClient(
    client, 
    'INSERT INTO panels (barcode) VALUES ($1) RETURNING *',
    [barcode]
  );
  
  await databaseManager.queryWithClient(
    client,
    'INSERT INTO barcode_events (barcode, event_type) VALUES ($1, $2)',
    [barcode, 'PANEL_CREATED']
  );
  
  return panel.rows[0];
});
```

#### Manual Transaction Control
```javascript
// Get a client for manual transaction control
const client = await databaseManager.getClient();

try {
  await client.query('BEGIN');
  
  // Your transaction operations here
  
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release(); // Always release the client
}
```

### 4. Health Monitoring

#### Database Health Status
```javascript
// Get comprehensive health status
const health = await databaseManager.getHealthStatus();
console.log('Database status:', health.status);
console.log('Response time:', health.responseTime);
console.log('Pool stats:', health.poolStats);
```

#### Connection Testing
```javascript
// Test database connectivity
const isConnected = await databaseManager.testConnection();
if (isConnected) {
  console.log('Database connection is healthy');
} else {
  console.log('Database connection failed');
}
```

### 5. Error Handling and Recovery

#### Circuit Breaker Pattern
The system implements a circuit breaker pattern to prevent cascading failures:

```javascript
// Automatic error classification and recovery
try {
  const result = await databaseManager.query('SELECT * FROM panels');
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    // Connection refused - circuit breaker will handle
    console.log('Database unavailable, using fallback');
  }
}
```

#### Graceful Degradation
In development mode, the system continues operating without database functionality:

```javascript
// Development mode fallback
if (!databaseManager.isConnected) {
  console.log('Running in development mode without database');
  // Continue with mock data or in-memory storage
}
```

### 6. Performance Monitoring

#### Query Performance Tracking
```javascript
// Automatic query timing and logging
const result = await databaseManager.query('SELECT * FROM panels');
// Query execution time is automatically logged
```

#### Pool Utilization Monitoring
```javascript
// Monitor pool utilization
const stats = databaseManager.getPoolStatistics();
if (stats.utilization > 80) {
  console.warn('High pool utilization:', stats.utilization + '%');
}
```

## Configuration

### Environment Variables

#### Required Variables (Production)
```bash
DB_HOST=your-database-host
DB_NAME=your-database-name
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_SSL=true
```

#### Optional Variables
```bash
DB_PORT=5432                    # Default: 5432
NODE_ENV=production            # Default: development
LOG_LEVEL=info                 # Default: info
```

### Pool Configuration

#### Development Settings
```javascript
pool: {
  min: 2,        // Lightweight for development
  max: 10,       // Moderate maximum
  acquire: 30000, // 30 second timeout
  idle: 10000    // 10 second idle timeout
}
```

#### Production Settings
```javascript
pool: {
  min: 5,        // Higher minimum for reliability
  max: 20,       // Higher maximum for concurrent stations
  acquire: 60000, // 60 second timeout
  idle: 300000   // 5 minute idle timeout
}
```

## Health Check Endpoints

### 1. Basic Health Check
```
GET /health
```
Quick health status for load balancers and monitoring systems.

### 2. Detailed System Status
```
GET /status
```
Comprehensive system status including database connectivity, pool statistics, and manufacturing metrics.

### 3. Database Health
```
GET /health/database
```
Detailed database connectivity and performance metrics.

### 4. Readiness Probe
```
GET /ready
```
Kubernetes-style readiness probe for container orchestration.

### 5. Liveness Probe
```
GET /live
```
Kubernetes-style liveness probe for container health monitoring.

### 6. Metrics Endpoint
```
GET /metrics
```
Prometheus-style metrics for monitoring and alerting.

## Testing

### Running the Test Script
```bash
# Test the connection pool functionality
node backend/scripts/test-postgresql-pool.js
```

### Test Coverage
The test script covers:
1. Database manager initialization
2. Pool statistics and monitoring
3. Health status checking
4. Connection testing
5. Query execution
6. Transaction handling
7. Pool event monitoring
8. Performance monitoring
9. Configuration validation
10. Graceful shutdown simulation

## Best Practices

### 1. Connection Management
- Always use the connection pool instead of creating individual connections
- Use transactions for multi-step operations
- Release clients properly in manual transaction scenarios

### 2. Query Optimization
- Use parameterized queries to prevent SQL injection
- Implement proper indexing for frequently queried columns
- Monitor query performance using the built-in timing

### 3. Error Handling
- Implement proper error handling for database operations
- Use the circuit breaker pattern for resilience
- Log database errors with appropriate context

### 4. Monitoring
- Monitor pool utilization and connection counts
- Set up alerts for high pool utilization
- Track query performance metrics

### 5. Production Deployment
- Use environment-specific configurations
- Implement proper SSL/TLS for database connections
- Set up monitoring and alerting for database health

## Troubleshooting

### Common Issues

#### 1. Connection Pool Exhaustion
**Symptoms:** High pool utilization, slow queries, connection timeouts
**Solutions:**
- Increase `max` pool size
- Optimize query performance
- Check for connection leaks

#### 2. High Query Latency
**Symptoms:** Slow response times, high pool utilization
**Solutions:**
- Review database indexes
- Optimize query patterns
- Check database server performance

#### 3. Connection Failures
**Symptoms:** Connection refused errors, circuit breaker activation
**Solutions:**
- Verify database server is running
- Check network connectivity
- Validate connection credentials

### Debug Mode
Enable detailed logging for troubleshooting:

```bash
LOG_LEVEL=debug node backend/server.js
```

### Health Check Debugging
Use the health endpoints to diagnose issues:

```bash
# Check database connectivity
curl http://localhost:3000/health/database

# Get comprehensive status
curl http://localhost:3000/status

# View metrics
curl http://localhost:3000/metrics
```

## Performance Tuning

### Pool Size Optimization
- **Development:** 2-10 connections
- **Production:** 5-20 connections (based on concurrent users)
- **High Load:** 20-50 connections (monitor carefully)

### Timeout Optimization
- **Acquisition Timeout:** 30-60 seconds
- **Idle Timeout:** 10 seconds - 5 minutes
- **Query Timeout:** 30 seconds for complex queries

### Connection Keep-Alive
```javascript
// Keep connections alive for production reliability
keepAlive: true,
keepAliveInitialDelayMillis: 10000
```

## Security Considerations

### 1. Connection Security
- Use SSL/TLS for production database connections
- Implement proper authentication and authorization
- Use environment variables for sensitive credentials

### 2. SQL Injection Prevention
- Always use parameterized queries
- Validate and sanitize input data
- Implement proper access controls

### 3. Network Security
- Restrict database access to application servers
- Use VPN or private networks for database connections
- Implement firewall rules for database ports

## Integration Examples

### Express.js Integration
```javascript
// In your Express server
import { databaseManager } from './config/database.js';

// Initialize database on server startup
const startServer = async () => {
  try {
    await databaseManager.initialize();
    
    app.listen(PORT, () => {
      console.log('Server started with database connection');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  await databaseManager.close();
  process.exit(0);
});
```

### Manufacturing Order Processing
```javascript
// Process manufacturing order with transaction
const processManufacturingOrder = async (orderData) => {
  return await databaseManager.executeTransaction(async (client) => {
    // Create manufacturing order
    const mo = await databaseManager.queryWithClient(
      client,
      'INSERT INTO manufacturing_orders (order_number, panel_type) VALUES ($1, $2) RETURNING *',
      [orderData.orderNumber, orderData.panelType]
    );
    
    // Create associated panels
    for (const panel of orderData.panels) {
      await databaseManager.queryWithClient(
        client,
        'INSERT INTO panels (barcode, mo_id) VALUES ($1, $2)',
        [panel.barcode, mo.rows[0].id]
      );
    }
    
    return mo.rows[0];
  });
};
```

## Conclusion

The PostgreSQL Connection Pool System provides a robust, production-ready solution for managing database connections in manufacturing environments. With comprehensive monitoring, error handling, and performance optimization, it ensures reliable database operations while maintaining high performance and scalability.

For additional support or questions, refer to the system logs, health endpoints, and test scripts provided with the system.
