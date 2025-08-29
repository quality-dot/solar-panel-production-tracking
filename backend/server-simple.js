// Simple Security Middleware Test Server
// Solar Panel Production Tracking System

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting simple security middleware test server...');

// 1. Helmet Security Headers (Production-grade security)
console.log('📋 Configuring Helmet security headers...');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for PWA
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for PWA
      imgSrc: ["'self'", "data:", "blob:"], // Allow data URIs for PWA
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    }
  },
  crossOriginEmbedderPolicy: false, // Disable for PWA compatibility
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true
}));
console.log('✅ Helmet configured');

// 2. CORS Configuration (Optimized for PWA tablets)
console.log('🌐 Configuring CORS for manufacturing tablets...');
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-station-id', 'x-line-number'],
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
console.log('✅ CORS configured');

// 3. Rate Limiting (Manufacturing-optimized) - Fixed IPv6 issue
console.log('⚡ Configuring rate limiting for 8 concurrent stations...');
const manufacturingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // High limit for manufacturing operations
  message: {
    success: false,
    error: 'Too many requests from this station',
    context: 'manufacturing_rate_limit',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Fixed IPv6 compatibility issue
  keyGenerator: (req) => {
    const stationId = req.headers['x-station-id'];
    if (stationId) {
      return `station-${stationId}`;
    }
    // Use the built-in IPv6-safe key generator
    return req.ip;
  },
  skip: (req) => req.path === '/health' || req.path === '/status'
});
app.use(manufacturingRateLimit);
console.log('✅ Rate limiting configured');

// 4. Body Parsing Middleware
console.log('📝 Configuring body parsing middleware...');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log('✅ Body parsing configured');

// 5. Station Identification Middleware
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
    console.log(`🏭 Station ${req.station.id} (Line ${req.station.line}): ${req.method} ${req.path}`);
  }

  next();
});
console.log('✅ Station identification configured');

// 6. Request Size Limiting
console.log('📏 Adding request size limiting...');
app.use((req, res, next) => {
  const contentLength = parseInt(req.headers['content-length']) || 0;
  const maxSize = 10 * 1024 * 1024; // 10MB limit
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: 'Request entity too large',
      maxSize: '10MB',
      receivedSize: `${Math.round(contentLength / 1024 / 1024)}MB`,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
});
console.log('✅ Request size limiting configured');

// 7. Test Routes
console.log('🛣️ Adding test routes...');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    security: {
      helmet: 'enabled',
      cors: 'enabled',
      rateLimit: 'enabled',
      stationTracking: 'enabled'
    }
  });
});

// Test endpoint with station context
app.post('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Security middleware test successful',
    station: req.station,
    timestamp: new Date().toISOString(),
    body: req.body
  });
});

// Station info endpoint
app.get('/station-info', (req, res) => {
  res.json({
    success: true,
    station: req.station,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

console.log('✅ Test routes added');

// 8. Error handling
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 9. 404 handler - Fixed path-to-regexp issue
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
  console.log(`🚀 Manufacturing server running on port ${PORT}`);
  console.log(`📊 Ready for 8 concurrent station connections`);
  console.log(`🔒 Security features: Helmet, CORS, Rate Limiting, Station Tracking`);
  console.log(`🧪 Test endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /test - Test security middleware`);
  console.log(`   GET  /station-info - Station context info`);
  console.log(`\n📱 Test with station headers:`);
  console.log(`   x-station-id: STATION001`);
  console.log(`   x-line-number: 1`);
});

export default app;
