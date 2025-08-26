// Security middleware for manufacturing environment
// Production-grade security configuration for solar panel tracking system

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

/**
 * Helmet security configuration for manufacturing environment
 * Configured for PWA tablet compatibility and production safety
 */
export const helmetConfig = helmet({
  // Content Security Policy for PWA compatibility
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
    },
    reportOnly: config.environment === 'development'
  },

  // Cross-Origin settings for manufacturing tablets
  crossOriginEmbedderPolicy: false, // Disable for PWA compatibility
  crossOriginResourcePolicy: { policy: "cross-origin" },

  // Security headers
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // Referrer policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },

  // Additional security headers
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true
});

/**
 * Rate limiting for manufacturing stations
 * Higher limits to accommodate rapid barcode scanning
 */
export const manufacturingRateLimit = rateLimit({
  windowMs: config.security.rateLimitWindowMs, // 15 minutes
  max: config.security.rateLimitMax, // 1000 requests per windowMs
  
  // Custom message for manufacturing context
  message: {
    success: false,
    error: 'Too many requests from this station',
    retryAfter: '{{retryAfter}}',
    context: 'manufacturing_rate_limit',
    timestamp: new Date().toISOString()
  },

  // Rate limit headers
  standardHeaders: true,
  legacyHeaders: false,

  // Skip successful requests for health checks
  skipSuccessfulRequests: false,
  skipFailedRequests: false,

  // Custom key generator for station-based limiting (IPv6 safe)
  keyGenerator: (req, res) => {
    const stationId = req.headers['x-station-id'];
    
    // Use station ID if available, otherwise fall back to station IP
    if (stationId) {
      return `station-${stationId}`;
    }
    
    // Use station IP with fallback for IPv6 compatibility
    return `ip-${req.ip}`;
  },

  // Skip rate limiting for health checks
  skip: (req) => {
    return req.path === '/health' || req.path === '/status' || req.path === '/ready';
  }
});

/**
 * Enhanced rate limiting for authentication endpoints
 * Stricter limits for login attempts
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 auth attempts per 15 minutes
  
  message: {
    success: false,
    error: 'Too many authentication attempts',
    retryAfter: '{{retryAfter}}',
    context: 'auth_rate_limit',
    timestamp: new Date().toISOString()
  },

  standardHeaders: true,
  legacyHeaders: false,
  
  // Key based on IP for auth attempts (IPv6 safe)
  keyGenerator: (req) => `auth-${req.ip}`
});

/**
 * Station identification middleware
 * Validates and tracks station IDs from tablets
 */
export const stationIdentification = (req, res, next) => {
  const stationId = req.headers['x-station-id'];
  const lineNumber = req.headers['x-line-number'];
  
  // Add station context to request
  req.station = {
    id: stationId || null,
    line: lineNumber ? parseInt(lineNumber) : null,
    isValid: !!(stationId && lineNumber)
  };

  // Add station info to response headers
  if (req.station.id) {
    res.setHeader('X-Station-Response', req.station.id);
    res.setHeader('X-Line-Response', req.station.line);
  }

  // Log station activity in development
  if (config.environment === 'development' && req.station.id) {
    console.log(`🏭 Station ${req.station.id} (Line ${req.station.line}): ${req.method} ${req.path}`);
  }

  next();
};

/**
 * Manufacturing-specific CORS preflight handler
 * Optimized for tablet PWA requests
 */
export const corsPreflightHandler = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    // Handle preflight requests quickly for manufacturing efficiency
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-station-id,x-line-number');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(204).end();
    return;
  }
  next();
};

/**
 * Request size limiting for manufacturing data
 * Prevents abuse while allowing reasonable payload sizes
 */
export const requestSizeLimit = (req, res, next) => {
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
};

export default {
  helmetConfig,
  manufacturingRateLimit,
  authRateLimit,
  stationIdentification,
  corsPreflightHandler,
  requestSizeLimit
};
