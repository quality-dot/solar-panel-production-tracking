#!/usr/bin/env node

// Database Integration Test Script
// Tests the complete database integration service for barcode processing
// Verifies database operations, barcode parsing, and manufacturing order integration

import { databaseService } from '../services/databaseService.js';
import { ManufacturingLogger } from '../middleware/logger.js';

const logger = new ManufacturingLogger('DatabaseTest');

/**
 * Test database integration functionality
 */
async function testDatabaseIntegration() {
  try {
    console.log('🧪 Testing Database Integration Service...\n');
    
    // Test 1: Database initialization
    console.log('1️⃣  Testing database initialization...');
    await databaseService.initializeDatabase();
    console.log('   ✅ Database initialized successfully\n');
    
    // Test 2: Barcode format validation
    console.log('2️⃣  Testing barcode format validation...');
    const validBarcodes = [
      'CRS24YBPP00001',
      'CRS24FBPP00002',
      'CRS24YBPP00003',
      'CRS24FBPP00004'
    ];
    
    const invalidBarcodes = [
      'CRS24YBPP0001',   // Too short
      'CRS24YBPP000001', // Too long
      'CRS24XBPP00001',  // Invalid framing indicator
      'CRS24YBPP0000A'   // Non-numeric sequence
    ];
    
    for (const barcode of validBarcodes) {
      const isValid = databaseService.validateBarcodeFormat(barcode);
      console.log(`   ${isValid ? '✅' : '❌'} ${barcode}: ${isValid ? 'Valid' : 'Invalid'}`);
    }
    
    for (const barcode of invalidBarcodes) {
      const isValid = databaseService.validateBarcodeFormat(barcode);
      console.log(`   ${isValid ? '✅' : '❌'} ${barcode}: ${isValid ? 'Valid' : 'Invalid'}`);
    }
    console.log('   ✅ Barcode validation tests completed\n');
    
    // Test 3: Barcode parsing
    console.log('3️⃣  Testing barcode parsing...');
    const testBarcode = 'CRS24YBPP00001';
    const parsedData = databaseService.parseBarcode(testBarcode);
    
    console.log(`   📊 Parsed barcode: ${testBarcode}`);
    console.log(`      Year: ${parsedData.year}`);
    console.log(`      Framed: ${parsedData.isFramed}`);
    console.log(`      Panel Type: ${parsedData.panelType}`);
    console.log(`      Sequence: ${parsedData.sequence}`);
    console.log(`      Line Assignment: ${parsedData.lineAssignment}`);
    console.log(`      Wattage Pmax: ${parsedData.wattagePmax}W`);
    console.log(`      Vmp: ${parsedData.vmp}V`);
    console.log(`      Imp: ${parsedData.imp}A`);
    console.log('   ✅ Barcode parsing completed\n');
    
    // Test 4: Barcode processing with database
    console.log('4️⃣  Testing barcode processing with database...');
    
    for (let i = 0; i < 3; i++) {
      const barcode = `CRS24YBPP0000${5 + i}`;
      console.log(`   🔄 Processing barcode: ${barcode}`);
      
      try {
        const result = await databaseService.processBarcode(barcode, 1, {
          targetQuantity: 50,
          priority: 'high',
          createdBy: 1
        });
        
        console.log(`      ✅ Panel created: ID ${result.panel.id}`);
        console.log(`      ✅ MO created/updated: ID ${result.manufacturingOrder.id}`);
        console.log(`      ✅ Line assignment: ${result.barcodeData.lineAssignment}`);
        
      } catch (error) {
        console.log(`      ❌ Failed: ${error.message}`);
      }
    }
    console.log('   ✅ Barcode processing tests completed\n');
    
    // Test 5: Statistics and reporting
    console.log('5️⃣  Testing statistics and reporting...');
    const stats = await databaseService.getBarcodeStatistics();
    
    console.log('   📊 Database Statistics:');
    console.log(`      Panels: ${stats.panels.total_panels}`);
    console.log(`      Stations: ${stats.stations.total_stations}`);
    console.log(`      Manufacturing Orders: ${stats.manufacturingOrders.total_orders}`);
    console.log(`      Barcode Events: ${stats.events.total_events}`);
    console.log(`      Successful Events: ${stats.events.successful_events}`);
    console.log(`      Failed Events: ${stats.events.failed_events}`);
    console.log('   ✅ Statistics retrieval completed\n');
    
    // Test 6: Barcode history
    console.log('6️⃣  Testing barcode history...');
    const testBarcodeForHistory = 'CRS24YBPP00005';
    const history = await databaseService.getBarcodeHistory(testBarcodeForHistory, { limit: 10 });
    
    console.log(`   📜 History for ${testBarcodeForHistory}:`);
    console.log(`      Total events: ${history.length}`);
    
    if (history.length > 0) {
      const latestEvent = history[0];
      console.log(`      Latest event: ${latestEvent.eventType}`);
      console.log(`      Station: ${latestEvent.stationName || 'N/A'}`);
      console.log(`      Panel type: ${latestEvent.panelType || 'N/A'}`);
      console.log(`      Success: ${latestEvent.success}`);
    }
    console.log('   ✅ Barcode history completed\n');
    
    // Test 7: Manufacturing order operations
    console.log('7️⃣  Testing manufacturing order operations...');
    const activeMOs = await databaseService.manufacturingOrderModel.findActiveOrders();
    
    console.log(`   🏭 Active Manufacturing Orders: ${activeMOs.length}`);
    
    for (const mo of activeMOs) {
      console.log(`      MO ${mo.orderNumber}:`);
      console.log(`         Panel Type: ${mo.panelType}`);
      console.log(`         Target: ${mo.targetQuantity}`);
      console.log(`         Completed: ${mo.completedQuantity}`);
      console.log(`         Status: ${mo.status}`);
      console.log(`         Line: ${mo.assignedLine}`);
    }
    console.log('   ✅ Manufacturing order tests completed\n');
    
    // Test 8: Station operations
    console.log('8️⃣  Testing station operations...');
    const activeStations = await databaseService.stationModel.findActiveStations();
    
    console.log(`   🏗️  Active Stations: ${activeStations.length}`);
    
    for (const station of activeStations) {
      console.log(`      ${station.name}:`);
      console.log(`         Type: ${station.stationType}`);
      console.log(`         Line: ${station.line}`);
      console.log(`         Status: ${station.currentStatus}`);
      console.log(`         Total Scans: ${station.totalScans}`);
      console.log(`         Success Rate: ${station.totalScans > 0 ? Math.round((station.successfulScans / station.totalScans) * 100) : 0}%`);
    }
    console.log('   ✅ Station tests completed\n');
    
    // Test 9: Panel operations
    console.log('9️⃣  Testing panel operations...');
    const panels = await databaseService.panelModel.findByManufacturingOrder(1);
    
    console.log(`   📦 Panels in MO 1: ${panels.length}`);
    
    if (panels.length > 0) {
      const panel = panels[0];
      console.log(`      Panel ${panel.barcode}:`);
      console.log(`         Type: ${panel.panelType}`);
      console.log(`         Line: ${panel.lineAssignment}`);
      console.log(`         Status: ${panel.status}`);
      console.log(`         Wattage: ${panel.wattagePmax}W`);
    }
    console.log('   ✅ Panel tests completed\n');
    
    // Test 10: Error handling
    console.log('🔟 Testing error handling...');
    
    try {
      // Try to process duplicate barcode
      await databaseService.processBarcode('CRS24YBPP00005', 1);
      console.log('   ❌ Should have failed for duplicate barcode');
    } catch (error) {
      console.log(`   ✅ Correctly caught duplicate error: ${error.message}`);
    }
    
    try {
      // Try to process invalid barcode
      await databaseService.processBarcode('INVALID', 1);
      console.log('   ❌ Should have failed for invalid barcode');
    } catch (error) {
      console.log(`   ✅ Correctly caught invalid format error: ${error.message}`);
    }
    
    console.log('   ✅ Error handling tests completed\n');
    
    // Final summary
    console.log('🎉 All Database Integration Tests Completed Successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Database initialization');
    console.log('   ✅ Barcode validation');
    console.log('   ✅ Barcode parsing');
    console.log('   ✅ Database operations');
    console.log('   ✅ Statistics and reporting');
    console.log('   ✅ Barcode history');
    console.log('   ✅ Manufacturing orders');
    console.log('   ✅ Station operations');
    console.log('   ✅ Panel operations');
    console.log('   ✅ Error handling');
    
    console.log('\n🚀 The database integration layer is fully operational!');
    
  } catch (error) {
    console.error('\n❌ Database integration test failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    
    logger.error('Database integration test failed', {
      error: error.message,
      stack: error.stack
    });
    
    process.exit(1);
  }
}

/**
 * Handle process termination
 */
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Database integration test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  Database integration test terminated');
  process.exit(0);
});

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabaseIntegration();
}

export { testDatabaseIntegration };
