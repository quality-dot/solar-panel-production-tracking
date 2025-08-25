// Solar Panel Production Tracking System - Main Server
// Manufacturing-optimized Express server for dual-line production

import express from 'express';
import cors from 'cors';
import { config, validateEnvironment } from './config/index.js';
import { databaseManager } from './config/index.js';
import mainRoutes from './routes/index.js';

const app = express();
const PORT = config.port || 3000;

// Validate environment variables
try {
  validateEnvironment();
  console.log('✅ Environment validation passed');
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  process.exit(1);
}

// Server initialization
console.log('🏭 Solar Panel Production Tracking System');
console.log('📡 Initializing server for dual-line manufacturing...');

// Basic Express middleware setup
app.use(express.json({ limit: '10mb' })); // JSON parsing for API requests
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL-encoded parsing

// CORS configuration for PWA tablets
app.use(cors(config.cors));

// Trust proxy for production environments (for rate limiting, etc.)
if (config.environment === 'production') {
  app.set('trust proxy', 1);
}

// Add request timestamp for manufacturing logging
app.use((req, res, next) => {
  req.timestamp = new Date().toISOString();
  next();
});

// Manufacturing-specific headers middleware
app.use((req, res, next) => {
  // Add manufacturing-specific response headers
  res.setHeader('X-Manufacturing-API', 'v1.0');
  res.setHeader('X-Max-Stations', config.manufacturing.maxConcurrentStations);
  
  // Add station identification headers if present
  if (req.headers['x-station-id']) {
    res.setHeader('X-Station-Response', req.headers['x-station-id']);
  }
  
  next();
});

// Main routes
app.use('/', mainRoutes);

// Global error handler (basic for now, will be enhanced in subtask 2.6)
app.use((error, req, res, next) => {
  console.error('🚨 Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: req.timestamp,
    stationId: req.headers['x-station-id'] || 'unknown'
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: req.timestamp,
    ...(config.environment === 'development' && { details: error.message })
  });
});

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: req.timestamp
  });
});

// Graceful shutdown handling for production reliability
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Graceful shutdown initiated...`);
  
  try {
    // Close database connections
    await databaseManager.close();
    console.log('✅ Database connections closed');
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database connection
    await databaseManager.initialize();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Manufacturing server running on port ${PORT}`);
      console.log(`📊 Ready for ${config.manufacturing.maxConcurrentStations} concurrent station connections`);
      console.log(`🔄 Environment: ${config.environment}`);
      console.log(`🏭 Dual-line production: Line 1 (${config.manufacturing.dualLineConfig.line1.panelTypes.join(',')}) | Line 2 (${config.manufacturing.dualLineConfig.line2.panelTypes.join(',')})`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
