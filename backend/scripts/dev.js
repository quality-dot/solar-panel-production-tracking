// Development scripts for manufacturing environment
// Helper scripts for development, testing, and deployment

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Development server with hot reload
 */
export const startDev = () => {
  console.log('🔧 Starting development server with hot reload...');
  
  const server = spawn('nodemon', [
    'server.js',
    '--watch', '.',
    '--ext', 'js,json',
    '--ignore', 'node_modules/',
    '--ignore', 'logs/',
    '--delay', '2'
  ], {
    stdio: 'inherit',
    shell: true
  });

  server.on('error', (error) => {
    console.error('❌ Failed to start development server:', error.message);
  });

  return server;
};

/**
 * Production server start
 */
export const startProd = () => {
  console.log('🚀 Starting production server...');
  
  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });

  server.on('error', (error) => {
    console.error('❌ Failed to start production server:', error.message);
  });

  return server;
};

/**
 * Database setup and migration
 */
export const setupDatabase = async () => {
  console.log('🗄️ Setting up database...');
  
  // This would integrate with the existing database setup
  // For now, just check connection
  try {
    const { databaseManager } = await import('../config/database.js');
    await databaseManager.initialize();
    console.log('✅ Database setup completed');
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    throw error;
  }
};

/**
 * Generate test data for development
 */
export const generateTestData = async () => {
  console.log('📊 Generating test data...');
  
  // Generate sample manufacturing orders, panels, etc.
  const testData = {
    manufacturingOrders: [
      {
        id: 'MO-2024-0001',
        quantity: 1000,
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    panels: [
      {
        barcode: 'AABA24AB0100001',
        status: 'in_progress',
        currentStation: 1
      }
    ]
  };
  
  // Save test data
  const testDataPath = path.join(process.cwd(), 'test-data.json');
  fs.writeFileSync(testDataPath, JSON.stringify(testData, null, 2));
  
  console.log(`✅ Test data generated: ${testDataPath}`);
  return testData;
};

/**
 * Health check and monitoring setup
 */
export const healthCheck = async () => {
  console.log('🏥 Running health check...');
  
  try {
    const response = await fetch('http://localhost:3000/status');
    const data = await response.json();
    
    if (data.status === 'healthy') {
      console.log('✅ System is healthy');
      return true;
    } else {
      console.log('⚠️ System status:', data.status);
      if (data.issues) {
        console.log('Issues:', data.issues);
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
};

/**
 * Load testing for production readiness
 */
export const loadTest = async (options = {}) => {
  const {
    url = 'http://localhost:3000/api/v1',
    concurrent = 8, // 8 stations
    duration = 60, // 60 seconds
    rps = 10 // requests per second per station
  } = options;
  
  console.log(`🔥 Running load test...`);
  console.log(`📍 Target: ${url}`);
  console.log(`🔄 Concurrent stations: ${concurrent}`);
  console.log(`⏱️ Duration: ${duration}s`);
  console.log(`📊 RPS per station: ${rps}`);
  
  // This would integrate with a load testing tool
  // For now, just simulate basic requests
  const promises = [];
  
  for (let station = 1; station <= concurrent; station++) {
    const stationPromise = async () => {
      const requests = duration * rps;
      let successful = 0;
      let failed = 0;
      
      for (let i = 0; i < requests; i++) {
        try {
          const response = await fetch(url, {
            headers: {
              'x-station-id': station.toString(),
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            successful++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
        }
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000 / rps));
      }
      
      return { station, successful, failed };
    };
    
    promises.push(stationPromise());
  }
  
  const results = await Promise.all(promises);
  
  console.log('\n📊 Load test results:');
  results.forEach(result => {
    console.log(`Station ${result.station}: ${result.successful} successful, ${result.failed} failed`);
  });
  
  const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const successRate = (totalSuccessful / (totalSuccessful + totalFailed)) * 100;
  
  console.log(`\n✅ Overall success rate: ${successRate.toFixed(2)}%`);
  
  return { results, successRate };
};

// CLI handling
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'dev':
      startDev();
      break;
    case 'prod':
      startProd();
      break;
    case 'setup-db':
      setupDatabase();
      break;
    case 'test-data':
      generateTestData();
      break;
    case 'health':
      healthCheck();
      break;
    case 'load-test':
      loadTest();
      break;
    default:
      console.log('Available commands:');
      console.log('  dev       - Start development server');
      console.log('  prod      - Start production server');
      console.log('  setup-db  - Setup database');
      console.log('  test-data - Generate test data');
      console.log('  health    - Run health check');
      console.log('  load-test - Run load test');
  }
}

export default {
  startDev,
  startProd,
  setupDatabase,
  generateTestData,
  healthCheck,
  loadTest
};


