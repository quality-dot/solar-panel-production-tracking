// Comprehensive Logging and Monitoring Test Server
// Solar Panel Production Tracking System

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { 
  createRequestLogger, 
  requestTiming, 
  manufacturingActivityTracker, 
  errorLogger, 
  healthCheckLogger,
  manufacturingLogger 
} from './middleware/logger.js';
import { performanceMonitoringMiddleware, getPerformanceStats } from './utils/performanceOptimizer.js';

const app = express();
const PORT = process.env.PORT || 3001; // Use different port to avoid conflicts

console.log('🚀 Starting comprehensive logging and monitoring test server...');

// 1. Security Middleware (from previous implementation)
console.log('🔒 Configuring security middleware...');
app.use(helmet({
  contentSecurityPolicy: false, // Disable for testing
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
}));

const testRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Rate limit exceeded' }
});
app.use(testRateLimit);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 2. Station Identification Middleware
console.log('🏭 Adding station identification middleware...');
app.use((req, res, next) => {
  const stationId = req.headers['x-station-id'];
  const lineNumber = req.headers['x-line-number'];
  
  req.station = {
    id: stationId || null,
    line: lineNumber ? parseInt(lineNumber) : null,
    isValid: !!(stationId && lineNumber)
  };

  if (req.station.id) {
    res.setHeader('X-Station-Response', req.station.id);
    res.setHeader('X-Line-Response', req.station.line);
  }

  next();
});

// 3. Performance Monitoring Middleware
console.log('⚡ Adding performance monitoring middleware...');
app.use(performanceMonitoringMiddleware());

// 4. Request Timing Middleware
console.log('⏱️ Adding request timing middleware...');
app.use(requestTiming);

// 5. Manufacturing Activity Tracker
console.log('📊 Adding manufacturing activity tracker...');
app.use(manufacturingActivityTracker);

// 6. Request Logger (Morgan)
console.log('📝 Adding Morgan request logger...');
app.use(createRequestLogger());

// 7. Health Check Logger
console.log('🏥 Adding health check logger...');
app.use(healthCheckLogger);

console.log('✅ All logging and monitoring middleware configured');

// 8. Test Routes
console.log('🛣️ Adding test routes...');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    middleware: {
      security: 'enabled',
      logging: 'enabled',
      monitoring: 'enabled',
      performance: 'enabled'
    }
  });
});

// Performance metrics endpoint
app.get('/performance', (req, res) => {
  const stats = getPerformanceStats();
  res.json({
    success: true,
    performance: stats,
    timestamp: new Date().toISOString()
  });
});

// Test barcode scanning (triggers manufacturing activity tracker)
app.post('/scan', (req, res) => {
  const { barcode } = req.body;
  
  if (!barcode) {
    return res.status(400).json({
      success: false,
      error: 'Barcode is required'
    });
  }

  // Simulate barcode processing
  const success = Math.random() > 0.1; // 90% success rate
  
  res.json({
    success: true,
    barcode,
    result: success ? 'VALID' : 'INVALID',
    timestamp: new Date().toISOString()
  });
});

// Test inspection (triggers station action logging)
app.post('/inspection', (req, res) => {
  const { barcode, pass, criteria, notes } = req.body;
  
  if (!barcode || pass === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Barcode and pass/fail status required'
    });
  }

  // Simulate inspection processing
  const result = pass ? 'PASS' : 'FAIL';
  
  res.json({
    success: true,
    barcode,
    result,
    criteria: criteria || 'standard',
    notes: notes || '',
    timestamp: new Date().toISOString()
  });
});

// Test error logging
app.get('/trigger-error', (req, res, next) => {
  const error = new Error('Test error for logging middleware');
  error.statusCode = 500;
  next(error);
});

// Test slow request (for performance monitoring)
app.get('/slow-operation', async (req, res) => {
  const delay = parseInt(req.query.delay) || 2000; // Default 2 seconds
  
  console.log(`⏳ Simulating slow operation with ${delay}ms delay...`);
  
  await new Promise(resolve => setTimeout(resolve, delay));
  
  res.json({
    success: true,
    message: `Operation completed after ${delay}ms`,
    timestamp: new Date().toISOString()
  });
});

// Test bulk operations
app.post('/bulk-scan', async (req, res) => {
  const { barcodes } = req.body;
  
  if (!Array.isArray(barcodes) || barcodes.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Barcodes array is required'
    });
  }

  // Simulate bulk processing
  const results = barcodes.map(barcode => ({
    barcode,
    success: Math.random() > 0.1,
    result: Math.random() > 0.1 ? 'VALID' : 'INVALID'
  }));

  res.json({
    success: true,
    total: barcodes.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
    timestamp: new Date().toISOString()
  });
});

// Test station-specific operations
app.get('/station/:stationId/status', (req, res) => {
  const { stationId } = req.params;
  const lineNumber = req.headers['x-line-number'];
  
  res.json({
    success: true,
    station: {
      id: stationId,
      line: lineNumber ? parseInt(lineNumber) : null,
      status: 'active',
      lastActivity: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  });
});

console.log('✅ Test routes added');

// 9. Error handling middleware (must be after routes)
console.log('❌ Adding error handling middleware...');
app.use(errorLogger);

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message,
    timestamp: new Date().toISOString()
  });
});

// 10. 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Logging and Monitoring Test Server running on port ${PORT}`);
  console.log(`📊 Ready for comprehensive testing`);
  console.log(`🔒 Security features: Helmet, CORS, Rate Limiting`);
  console.log(`📝 Logging features: Morgan, Custom Logger, Activity Tracker`);
  console.log(`⚡ Monitoring features: Performance Metrics, Request Timing`);
  console.log(`\n🧪 Test endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /performance - Performance metrics`);
  console.log(`   POST /scan - Test barcode scanning (triggers activity logging)`);
  console.log(`   POST /inspection - Test inspection (triggers station logging)`);
  console.log(`   GET  /trigger-error - Test error logging`);
  console.log(`   GET  /slow-operation?delay=3000 - Test slow request monitoring`);
  console.log(`   POST /bulk-scan - Test bulk operations`);
  console.log(`   GET  /station/STATION001/status - Test station-specific operations`);
  console.log(`\n📱 Test with station headers:`);
  console.log(`   x-station-id: STATION001`);
  console.log(`   x-line-number: 1`);
  console.log(`\n📁 Logs will be written to: backend/logs/`);
});

export default app;
