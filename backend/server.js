// Solar Panel Production Tracking System - Main Server
// Manufacturing-optimized Express server for dual-line production

import express from 'express';
import cors from 'cors';

console.log('Step 1: Basic Express app');
const app = express();

console.log('Step 2: Importing config...');
const { config, validateEnvironment } = await import('./config/environment.js');
console.log('✅ Config imported');

console.log('Step 3: Validating environment...');
try {
  validateEnvironment();
  console.log('✅ Environment validated');
} catch (error) {
  console.log('❌ Environment validation failed:', error.message);
  process.exit(1);
}

console.log('Step 4: Importing database manager...');
const { databaseManager } = await import('./config/database.js');
console.log('✅ Database manager imported');

console.log('Step 5: Adding basic middleware...');
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log('✅ Basic middleware added');

// Add request timestamp for manufacturing logging
app.use((req, res, next) => {
  req.timestamp = new Date().toISOString();
  next();
});

console.log('Step 6: Importing routes...');
const mainRoutes = await import('./routes/index.js');
app.use('/', mainRoutes.default);
console.log('✅ Routes added');

console.log('Step 7: Starting server...');
const PORT = config.port || 3000;

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

// 404 handler for unknown routes (avoiding wildcard)
app.use((req, res) => {
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
