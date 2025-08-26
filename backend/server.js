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

console.log('Step 5: Importing middleware...');
const securityMiddleware = await import('./middleware/security.js');
const loggerMiddleware = await import('./middleware/logger.js');
const errorHandlerMiddleware = await import('./middleware/errorHandler.js');
console.log('✅ Security, logging, and error handling middleware imported');

console.log('Step 6: Adding security middleware stack...');
// Add Helmet security headers (optimized for PWA tablets)
app.use(securityMiddleware.helmetConfig);

// Add CORS preflight handler for manufacturing efficiency  
app.use(securityMiddleware.corsPreflightHandler);

// Add standard CORS configuration
app.use(cors(config.cors));

// Add station identification and tracking
app.use(securityMiddleware.stationIdentification);

// Add rate limiting for manufacturing operations
app.use(securityMiddleware.manufacturingRateLimit);

// Add request size limiting
app.use(securityMiddleware.requestSizeLimit);

// Add body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log('✅ Security middleware stack configured for 8 concurrent stations');

// Add request timing for performance monitoring
app.use(loggerMiddleware.requestTiming);

// Add HTTP request logging with manufacturing context
app.use(loggerMiddleware.createRequestLogger());

// Add request timestamp for manufacturing logging
app.use((req, res, next) => {
  req.timestamp = new Date().toISOString();
  next();
});

// Add manufacturing activity tracking
app.use(loggerMiddleware.manufacturingActivityTracker);

// Add health check logging
app.use(loggerMiddleware.healthCheckLogger);

console.log('Step 7: Adding response and validation middleware...');
const responseMiddleware = await import('./middleware/response.js');

// Add response standardization middleware
app.use(responseMiddleware.responseTimer);
app.use(responseMiddleware.addRequestContext);
app.use(responseMiddleware.optimizeForTablets);
app.use(responseMiddleware.apiVersioning);
app.use(responseMiddleware.addManufacturingMetadata);
console.log('✅ Response standardization middleware added');

console.log('Step 8: Importing routes...');
const mainRoutes = await import('./routes/index.js');
const healthRoutes = await import('./routes/health.js');

// Add health check routes first
app.use('/', healthRoutes.default);

// Add main API routes
app.use('/', mainRoutes.default);
console.log('✅ Routes and health checks added');

// Add error handling middleware (must be after routes)
app.use(loggerMiddleware.errorLogger);
app.use(responseMiddleware.standardizeErrors);
app.use(errorHandlerMiddleware.globalErrorHandler);
app.use(errorHandlerMiddleware.notFoundHandler);

console.log('Step 9: Starting server...');
const PORT = config.port || 3000;

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

// Setup process error handlers for production reliability
errorHandlerMiddleware.setupProcessErrorHandlers();

// Start the server
startServer();

export default app;
