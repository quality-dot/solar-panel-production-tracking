// Environment Configuration for Solar Panel Production Tracking System
// Manufacturing-optimized settings for dual-line production environment

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const environment = process.env.NODE_ENV || 'development';

// Base configuration
const baseConfig = {
  environment,
  port: parseInt(process.env.PORT) || 3000,
  
  // Manufacturing-specific settings
  manufacturing: {
    maxConcurrentStations: 8, // 4 per production line
    stationTimeoutMs: 30000, // 30 seconds for station operations
    barcodeFormat: /^CRS(\d{2})([WB])([TWB])(36|40|60|72|144)(\d{5})$/,
    dualLineConfig: {
      line1: {
        panelTypes: ['36', '40', '60', '72'],
        stations: [1, 2, 3, 4]
      },
      line2: {
        panelTypes: ['144'],
        stations: [5, 6, 7, 8] // Station 5-8 for Line 2
      }
    },
    palletSizes: {
      default: 25,
      alternative: 26,
      allowCustom: true
    }
  },

  // Security settings for production floor
  security: {
    jwtSecret: process.env.JWT_SECRET || 'manufacturing-temp-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h', // Full production shift
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 1000, // High limit for manufacturing operations
  },

  // CORS settings for PWA tablets
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-station-id', 'x-line-number']
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: environment !== 'production',
    enableFile: true,
    logDirectory: process.env.LOG_DIR || './logs',
    maxFileSize: '10MB',
    maxFiles: 30 // 30 days of logs
  }
};

// Environment-specific configurations
const environments = {
  development: {
    ...baseConfig,
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'solar_panel_tracking_dev',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: false,
      pool: {
        min: 2,
        max: 10,
        acquire: 30000,
        idle: 10000
      },
      logging: true
    },
    logging: {
      ...baseConfig.logging,
      level: 'debug'
    }
  },

  production: {
    ...baseConfig,
    database: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true',
      pool: {
        min: 5,
        max: 20, // Higher pool for 8 concurrent stations
        acquire: 60000,
        idle: 300000
      },
      logging: false
    },
    logging: {
      ...baseConfig.logging,
      level: 'warn',
      enableConsole: false
    },
    security: {
      ...baseConfig.security,
      jwtSecret: process.env.JWT_SECRET, // Must be set in production
    }
  },

  test: {
    ...baseConfig,
    port: parseInt(process.env.TEST_PORT) || 3001,
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'solar_panel_tracking_test',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: false,
      pool: {
        min: 1,
        max: 5,
        acquire: 30000,
        idle: 10000
      },
      logging: false
    },
    logging: {
      ...baseConfig.logging,
      level: 'error',
      enableConsole: false,
      enableFile: false
    }
  }
};

// Get configuration for current environment
export const config = environments[environment];

// Validation function for required environment variables in production
export const validateEnvironment = () => {
  const errors = [];

  if (environment === 'production') {
    const requiredVars = [
      'DB_HOST',
      'DB_NAME', 
      'DB_USER',
      'DB_PASSWORD',
      'JWT_SECRET'
    ];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        errors.push(`Required environment variable ${varName} is not set`);
      }
    });
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return true;
};

export default config;
