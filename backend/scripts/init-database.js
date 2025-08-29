#!/usr/bin/env node

// Database Initialization Script
// Sets up the complete database schema for the barcode processing system
// Run this script to initialize the database tables, indexes, and default data

import { databaseService } from '../services/databaseService.js';
import { ManufacturingLogger } from '../middleware/logger.js';

const logger = new ManufacturingLogger('DatabaseInit');

/**
 * Main initialization function
 */
async function initializeDatabase() {
  try {
    logger.info('Starting database initialization...');
    
    // Initialize database tables, indexes, and default data
    await databaseService.initializeDatabase();
    
    logger.info('Database initialization completed successfully!');
    
    // Display initialization summary
    await displayInitializationSummary();
    
    process.exit(0);
    
  } catch (error) {
    logger.error('Database initialization failed', {
      error: error.message,
      stack: error.stack
    });
    
    console.error('\n❌ Database initialization failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure your PostgreSQL database is running and accessible.');
      console.error('   Check your database connection settings in backend/config/database.js');
    }
    
    process.exit(1);
  }
}

/**
 * Display initialization summary
 */
async function displayInitializationSummary() {
  try {
    console.log('\n📊 Database Initialization Summary:');
    console.log('=====================================');
    
    // Get initial statistics
    const stats = await databaseService.getBarcodeStatistics();
    
    console.log(`\n📋 Tables Created:`);
    console.log(`   • panels - Solar panel records`);
    console.log(`   • stations - Production station configuration`);
    console.log(`   • manufacturing_orders - Manufacturing order management`);
    console.log(`   • barcode_events - Audit trail for barcode operations`);
    
    console.log(`\n🔍 Indexes Created:`);
    console.log(`   • Performance indexes on barcode, status, and timestamps`);
    console.log(`   • Foreign key indexes for relationships`);
    console.log(`   • Composite indexes for common queries`);
    
    console.log(`\n🏭 Default Stations Created:`);
    console.log(`   • Line 1: Assembly-EL-1, Assembly-EL-2, Framing-1, Framing-2`);
    console.log(`   • Line 2: Assembly-EL-3, Assembly-EL-4, Framing-3, Framing-4`);
    
    console.log(`\n📈 Initial Statistics:`);
    console.log(`   • Total Stations: ${stats.stations.total_stations}`);
    console.log(`   • Active Stations: ${stats.stations.active_stations}`);
    console.log(`   • Total Manufacturing Orders: ${stats.manufacturingOrders.total_orders}`);
    console.log(`   • Total Barcode Events: ${stats.events.total_events}`);
    
    console.log(`\n✅ Database is ready for barcode processing operations!`);
    console.log(`\n🚀 Next steps:`);
    console.log(`   1. Start your backend server`);
    console.log(`   2. Test barcode processing endpoints`);
    console.log(`   3. Monitor production metrics and analytics`);
    
  } catch (error) {
    logger.error('Failed to display initialization summary', {
      error: error.message
    });
    console.error('\n⚠️  Initialization completed but could not display summary');
  }
}

/**
 * Handle process termination
 */
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Database initialization interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  Database initialization terminated');
  process.exit(0);
});

// Run initialization if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase();
}

export { initializeDatabase };
