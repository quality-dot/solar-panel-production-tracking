/**
 * Development Environment Configuration
 * Optimized settings for development and testing
 */

export default {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true
    }
  },

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'manufacturing_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    directory: process.env.LOG_DIR || './logs',
    maxSize: '10m',
    maxFiles: '5',
    console: true,
    file: true
  },

  // Security configuration
  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    }
  },

  // Testing configuration
  testing: {
    database: {
      name: process.env.TEST_DB_NAME || 'manufacturing_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres'
    },
    coverage: {
      threshold: 80,
      reporters: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/**',
        'coverage/**',
        'logs/**',
        'scripts/**',
        'migrations/**'
      ]
    }
  },

  // Development tools
  devTools: {
    nodemon: {
      watch: ['backend/**/*.js', 'backend/**/*.json'],
      ignore: ['backend/logs/**', 'backend/**/*.test.js', 'node_modules/**'],
      ext: 'js,json',
      env: {
        NODE_ENV: 'development',
        PORT: '3000',
        LOG_LEVEL: 'debug'
      }
    },
    hotReload: true,
    debugMode: true
  },

  // Manufacturing environment
  manufacturing: {
    maxConcurrentStations: 8,
    dualLineMode: true,
    supportedStations: [1, 2, 3, 4, 5, 6, 7, 8],
    barcodeFormat: 'CRSYYFBPP#####',
    productionLines: {
      line1: {
        stations: [1, 2, 3, 4],
        specifications: ['36V', '40V', '60V', '72V']
      },
      line2: {
        stations: [5, 6, 7, 8],
        specifications: ['144V']
      }
    }
  },

  // API configuration
  api: {
    version: 'v1',
    basePath: '/api',
    documentation: {
      enabled: true,
      path: '/docs',
      title: 'Manufacturing API - Development',
      version: '1.0.0'
    }
  },

  // Monitoring and debugging
  monitoring: {
    healthChecks: {
      enabled: true,
      interval: 30000, // 30 seconds
      endpoints: ['/health', '/status', '/ready', '/live']
    },
    performance: {
      enabled: true,
      slowQueryThreshold: 1000, // 1 second
      memoryThreshold: 90 // 90%
    }
  }
};
