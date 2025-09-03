// Solar Panel Production Tracking System - Winston-Enhanced Server
// Manufacturing-optimized Express server with Winston logging for dual-line production

import express from 'express';
import cors from 'cors';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Create Winston logger
const logDir = path.join(process.cwd(), 'backend', 'logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'solar-panel-tracking',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      level: 'info'
    }),

    // Daily rotate file transport
    new DailyRotateFile({
      filename: path.join(logDir, 'server-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),

    // Error log file
    new DailyRotateFile({
      filename: path.join(logDir, 'server-error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error'
    })
  ]
});

logger.info('Step 1: Basic Express app');
const app = express();

logger.info('Step 2: Importing config...');
const { config, validateEnvironment } = await import('./config/environment.js');
logger.info('✅ Config imported');

logger.info('Step 3: Validating environment...');
try {
  validateEnvironment();
  logger.info('✅ Environment validated');
} catch (error) {
  logger.error('❌ Environment validation failed:', error);
  process.exit(1);
}

logger.info('Step 4: Importing database manager...');
const { databaseManager } = await import('./config/database.js');
logger.info('✅ Database manager imported');

logger.info('Step 5: Importing middleware...');
const securityMiddleware = await import('./middleware/security.js');
const loggerMiddleware = await import('./middleware/logger.js');
const errorHandlerMiddleware = await import('./middleware/errorHandler.js');
logger.info('✅ Security, logging, and error handling middleware imported');

logger.info('Step 6: Adding security middleware stack...');
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
logger.info('✅ Security middleware stack configured for 8 concurrent stations');

// Add request timing for performance monitoring
app.use(loggerMiddleware.requestTiming);

// Add performance monitoring middleware
const { performanceMonitoringMiddleware } = await import('./utils/performanceOptimizer.js');
app.use(performanceMonitoringMiddleware());

// Add graceful degradation middleware
const { gracefulDegradationMiddleware } = await import('./middleware/gracefulDegradation.js');
app.use(gracefulDegradationMiddleware());

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

logger.info('Step 7: Adding response and validation middleware...');
const responseMiddleware = await import('./middleware/response.js');

// Add response standardization middleware
app.use(responseMiddleware.responseTimer);
app.use(responseMiddleware.addRequestContext);
app.use(responseMiddleware.optimizeForTablets);
app.use(responseMiddleware.apiVersioning);
app.use(responseMiddleware.addManufacturingMetadata);
logger.info('✅ Response standardization middleware added');

logger.info('Step 8: Importing routes...');
const mainRoutes = await import('./routes/index.js');
const healthRoutes = await import('./routes/health.js');

// Add health check routes first
app.use('/', healthRoutes.default);

// Add main application routes
app.use('/api', mainRoutes.default);

logger.info('Step 9: Adding error handling middleware...');
// Add error handling middleware last
app.use(errorHandlerMiddleware.default);

logger.info('Step 10: Starting server...');
const PORT = config.port || 3000;

app.listen(PORT, () => {
  logger.info(`🚀 Solar Panel Production Tracking System started successfully!`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    service: 'server_startup'
  });
  
  logger.info(`📱 PWA-optimized for manufacturing tablets`);
  logger.info(`🏭 Dual-line production support: ${config.manufacturing.maxConcurrentStations} concurrent stations`);
  logger.info(`🔒 Security: JWT + Rate limiting + Helmet headers`);
  logger.info(`📊 Monitoring: Performance tracking + Health checks`);
  logger.info(`📝 Logging: Winston + Structured logging + Daily rotation`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Unhandled error handling
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;
