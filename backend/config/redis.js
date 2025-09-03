// Redis configuration for session management and caching
// Manufacturing-optimized Redis setup with connection pooling and fallback

import Redis from 'ioredis';
import { config } from './environment.js';
import { manufacturingLogger } from '../middleware/logger.js';

/**
 * Redis connection configuration
 * Optimized for manufacturing environment with high availability requirements
 */
const redisConfig = {
  // Primary connection settings
  host: config.redis?.host || 'localhost',
  port: config.redis?.port || 6379,
  password: config.redis?.password || null,
  db: config.redis?.db || 0,
  
  // Connection pooling and performance
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxLoadingTimeout: 10000,
  
  // Manufacturing-specific optimizations
  connectTimeout: 10000,
  commandTimeout: 5000,
  lazyConnect: true,
  
  // High availability settings
  retryDelayOnClusterDown: 300,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  
  // Memory and performance tuning
  maxMemoryPolicy: 'allkeys-lru',
  maxMemory: '256mb',
  
  // Logging and monitoring
  showFriendlyErrorStack: config.NODE_ENV === 'development',
  
  // Event handlers for manufacturing reliability
  onConnect: () => {
    manufacturingLogger.info('Redis connected successfully', {
      host: config.redis?.host || 'localhost',
      port: config.redis?.port || 6379,
      category: 'redis'
    });
  },
  
  onError: (error) => {
    manufacturingLogger.error('Redis connection error', {
      error: error.message,
      code: error.code,
      category: 'redis'
    });
  },
  
  onClose: () => {
    manufacturingLogger.warn('Redis connection closed', {
      category: 'redis'
    });
  },
  
  onReconnecting: () => {
    manufacturingLogger.info('Redis reconnecting...', {
      category: 'redis'
    });
  }
};

/**
 * Create Redis client instance
 * Includes fallback mechanisms for manufacturing reliability
 */
let redisClient = null;

export const createRedisClient = () => {
  try {
    if (!redisClient) {
      redisClient = new Redis(redisConfig);
      
      // Test connection
      redisClient.ping().then(() => {
        manufacturingLogger.info('Redis connection test successful', {
          category: 'redis'
        });
      }).catch((error) => {
        manufacturingLogger.error('Redis connection test failed', {
          error: error.message,
          category: 'redis'
        });
      });
    }
    
    return redisClient;
  } catch (error) {
    manufacturingLogger.error('Failed to create Redis client', {
      error: error.message,
      category: 'redis'
    });
    throw error;
  }
};

/**
 * Get Redis client instance
 * Creates new instance if none exists
 */
export const getRedisClient = () => {
  if (!redisClient) {
    return createRedisClient();
  }
  return redisClient;
};

/**
 * Gracefully close Redis connection
 * Important for manufacturing system shutdown procedures
 */
export const closeRedisConnection = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      manufacturingLogger.info('Redis connection closed gracefully', {
        category: 'redis'
      });
    } catch (error) {
      manufacturingLogger.error('Error closing Redis connection', {
        error: error.message,
        category: 'redis'
      });
    } finally {
      redisClient = null;
    }
  }
};

/**
 * Health check for Redis connection
 * Used in manufacturing system health monitoring
 */
export const checkRedisHealth = async () => {
  try {
    const client = getRedisClient();
    const start = Date.now();
    await client.ping();
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Redis key prefix management
 * Organized by manufacturing system components
 */
export const REDIS_KEYS = {
  SESSION: 'session',
  TOKEN_BLACKLIST: 'token:blacklist',
  USER_PERMISSIONS: 'user:permissions',
  RATE_LIMIT: 'rate:limit',
  CACHE: 'cache',
  AUDIT: 'audit'
};

/**
 * Generate Redis key with prefix
 * Ensures organized key management for manufacturing system
 */
export const generateRedisKey = (prefix, identifier) => {
  return `${prefix}:${identifier}`;
};

export default {
  createRedisClient,
  getRedisClient,
  closeRedisConnection,
  checkRedisHealth,
  REDIS_KEYS,
  generateRedisKey
};
