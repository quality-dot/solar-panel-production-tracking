/**
 * Production Environment Configuration
 * Optimized settings for production manufacturing environment
 */

export default {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    cors: {
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://manufacturing.company.com'],
      credentials: true
    }
  },

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'manufacturing_prod',
    user: process.env.DB_USER || 'manufacturing_user',
    password: process.env.DB_PASSWORD || '',
    pool: {
      min: 5,
      max: 20,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 60000,
      destroyTimeoutMillis: 10000,
      idleTimeoutMillis: 60000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    },
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: process.env.LOG_DIR || '/var/log/manufacturing',
    maxSize: '100m',
    maxFiles: '10',
    console: false,
    file: true,
    syslog: process.env.ENABLE_SYSLOG === 'true'
  },

  // Security configuration
  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // limit each IP to 500 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    },
    session: {
      secret: process.env.SESSION_SECRET || 'manufacturing-production-secret',
      secure: true,
      httpOnly: true,
      sameSite: 'strict'
    }
  },

  // Testing configuration (minimal for production)
  testing: {
    database: {
      name: process.env.TEST_DB_NAME || 'manufacturing_test',
      user: process.env.TEST_DB_USER || 'test_user',
      password: process.env.TEST_DB_PASSWORD || ''
    },
    coverage: {
      enabled: false
    }
  },

  // Development tools (disabled in production)
  devTools: {
    nodemon: false,
    hotReload: false,
    debugMode: false
  },

  // Manufacturing environment
  manufacturing: {
    maxConcurrentStations: parseInt(process.env.MAX_CONCURRENT_STATIONS) || 8,
    dualLineMode: process.env.DUAL_LINE_MODE === 'true',
    supportedStations: process.env.SUPPORTED_STATIONS ? 
      process.env.SUPPORTED_STATIONS.split(',').map(s => parseInt(s.trim())) : 
      [1, 2, 3, 4, 5, 6, 7, 8],
    barcodeFormat: process.env.BARCODE_FORMAT || 'CRSYYFBPP#####',
    productionLines: {
      line1: {
        stations: process.env.LINE1_STATIONS ? 
          process.env.LINE1_STATIONS.split(',').map(s => parseInt(s.trim())) : 
          [1, 2, 3, 4],
        specifications: process.env.LINE1_SPECS ? 
          process.env.LINE1_SPECS.split(',') : 
          ['36V', '40V', '60V', '72V']
      },
      line2: {
        stations: process.env.LINE2_STATIONS ? 
          process.env.LINE2_STATIONS.split(',').map(s => parseInt(s.trim())) : 
          [5, 6, 7, 8],
        specifications: process.env.LINE2_SPECS ? 
          process.env.LINE2_SPECS.split(',') : 
          ['144V']
      }
    },
    maintenance: {
      enabled: process.env.MAINTENANCE_MODE === 'true',
      message: process.env.MAINTENANCE_MESSAGE || 'System under maintenance'
    }
  },

  // API configuration
  api: {
    version: 'v1',
    basePath: '/api',
    documentation: {
      enabled: process.env.ENABLE_API_DOCS === 'true',
      path: '/docs',
      title: 'Manufacturing API - Production',
      version: process.env.API_VERSION || '1.0.0'
    },
    rateLimiting: {
      enabled: true,
      windowMs: 15 * 60 * 1000,
      max: 500
    }
  },

  // Monitoring and debugging
  monitoring: {
    healthChecks: {
      enabled: true,
      interval: 30000, // 30 seconds
      endpoints: ['/health', '/status', '/ready', '/live'],
      alerting: {
        enabled: process.env.ENABLE_ALERTING === 'true',
        webhook: process.env.ALERT_WEBHOOK_URL,
        email: process.env.ALERT_EMAIL
      }
    },
    performance: {
      enabled: true,
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 2000, // 2 seconds
      memoryThreshold: parseInt(process.env.MEMORY_THRESHOLD) || 85, // 85%
      cpuThreshold: parseInt(process.env.CPU_THRESHOLD) || 80 // 80%
    },
    metrics: {
      enabled: process.env.ENABLE_METRICS === 'true',
      prometheus: process.env.ENABLE_PROMETHEUS === 'true',
      statsd: process.env.STATSD_HOST ? {
        host: process.env.STATSD_HOST,
        port: parseInt(process.env.STATSD_PORT) || 8125
      } : false
    }
  },

  // Backup and recovery
  backup: {
    database: {
      enabled: process.env.ENABLE_DB_BACKUP === 'true',
      schedule: process.env.DB_BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
      retention: parseInt(process.env.DB_BACKUP_RETENTION) || 30, // 30 days
      path: process.env.DB_BACKUP_PATH || '/var/backups/manufacturing'
    },
    logs: {
      enabled: process.env.ENABLE_LOG_BACKUP === 'true',
      schedule: process.env.LOG_BACKUP_SCHEDULE || '0 3 * * *', // Daily at 3 AM
      retention: parseInt(process.env.LOG_BACKUP_RETENTION) || 90, // 90 days
      compression: process.env.LOG_COMPRESSION === 'true'
    }
  },

  // Scaling and load balancing
  scaling: {
    clustering: {
      enabled: process.env.ENABLE_CLUSTERING === 'true',
      instances: parseInt(process.env.CLUSTER_INSTANCES) || 4
    },
    loadBalancer: {
      enabled: process.env.ENABLE_LOAD_BALANCER === 'true',
      healthCheckPath: '/health',
      healthCheckInterval: 10000
    }
  }
};
