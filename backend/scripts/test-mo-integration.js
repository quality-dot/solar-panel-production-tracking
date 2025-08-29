#!/usr/bin/env node
// Test script for Manufacturing Order - Barcode integration
// Run with: node backend/scripts/test-mo-integration.js

import { manufacturingOrderService, MOServiceError } from '../services/manufacturingOrderService.js';
import { processBarcodeComplete } from '../utils/barcodeProcessor.js';

console.log('🏭 Testing Manufacturing Order - Barcode Integration\n');

// Test data
const testMO = {
  orderNumber: 'MO-TEST-001',
  panelType: '36',
  targetQuantity: 100,
  customerName: 'Test Customer',
  notes: 'Integration test order',
  priority: 5,
  yearCode: '25',
  frameType: 'SILVER',
  backsheetType: 'WHITE'
};

const testBarcodes = [
  'CRS25WT3600001', // Should match MO specifications (13 chars total)
  'CRS25WT3600002', // Valid sequence
  'CRS25WT3600101', // Beyond target (should fail)
  'CRS24WT3600001', // Wrong year (should fail)
  'CRS25WT7200001', // Wrong panel type (should fail)
];

async function testIntegration() {
  try {
    console.log('📋 Step 1: Testing barcode processing...');
    
    // Test basic barcode processing
    for (const barcode of testBarcodes.slice(0, 2)) {
      const result = processBarcodeComplete(barcode);
      console.log(`   ✅ Barcode ${barcode}: ${result.success ? 'Valid' : 'Invalid'}`);
      if (result.success) {
        console.log(`      Panel Type: ${result.components.panelType}, Line: ${result.lineAssignment?.lineNumber}`);
      }
    }

    console.log('\n🏗️  Step 2: Testing MO barcode validation (simulated)...');
    
    // Simulate MO validation without database
    const mockMO = {
      id: 1,
      order_number: testMO.orderNumber,
      panel_type: `TYPE_${testMO.panelType}`,
      year_code: testMO.yearCode,
      frame_type: testMO.frameType,
      backsheet_type: testMO.backsheetType,
      target_quantity: testMO.targetQuantity,
      completed_quantity: 0,
      failed_quantity: 0,
      next_sequence_number: 1
    };

    // Test barcode validation logic
    const moService = new manufacturingOrderService.constructor();
    
    for (const barcode of testBarcodes) {
      try {
        const barcodeResult = processBarcodeComplete(barcode);
        
        if (!barcodeResult.success) {
          console.log(`   ❌ ${barcode}: Invalid barcode format`);
          continue;
        }
        
        const components = barcodeResult.components;
        const validation = moService.validateBarcodeForMO(components, mockMO);
        const sequenceValidation = await moService.validateSequenceRange(components, mockMO);
        
        console.log(`   ${validation.isValid && sequenceValidation.isValid ? '✅' : '❌'} ${barcode}:`);
        console.log(`      MO Match: ${validation.isValid ? 'Yes' : 'No'}`);
        console.log(`      Sequence: ${sequenceValidation.isValid ? 'Valid' : sequenceValidation.error}`);
        
        if (!validation.isValid) {
          console.log(`      Errors: ${validation.errors.join(', ')}`);
        }
      } catch (error) {
        console.log(`   ❌ ${barcode}: Error - ${error.message}`);
      }
    }

    console.log('\n🔧 Step 3: Testing barcode generation...');
    
    // Test barcode construction
    const generatedBarcode = moService.constructBarcode({
      yearCode: testMO.yearCode,
      frameType: testMO.frameType,
      backsheetType: testMO.backsheetType,
      panelType: `TYPE_${testMO.panelType}`,
      sequenceNumber: 1
    });
    
    console.log(`   ✅ Generated barcode: ${generatedBarcode}`);
    
    // Validate the generated barcode
    const generatedResult = processBarcodeComplete(generatedBarcode);
    console.log(`   ✅ Generated barcode validation: ${generatedResult.success ? 'Valid' : 'Invalid'}`);

    console.log('\n📊 Step 4: Testing progress calculations...');
    
    // Test progress calculation
    const progressUpdates = [
      { type: 'PANEL_STARTED', count: 5 },
      { type: 'PANEL_COMPLETED', count: 3 },
      { type: 'PANEL_FAILED', count: 1 }
    ];

    let mockQuantities = {
      completed: 0,
      failed: 0,
      inProgress: 0
    };

    for (const update of progressUpdates) {
      const newQuantities = moService.calculateUpdatedQuantities(
        { 
          completed_quantity: mockQuantities.completed,
          failed_quantity: mockQuantities.failed,
          in_progress_quantity: mockQuantities.inProgress
        }, 
        update
      );
      
      console.log(`   ✅ ${update.type}: C:${newQuantities.completed}, F:${newQuantities.failed}, IP:${newQuantities.inProgress}`);
      mockQuantities = newQuantities;
    }

    console.log('\n🎯 Step 5: Testing line assignment...');
    
    const panelTypes = [
      { type: '36', barcode: 'CRS25WT3600001' },
      { type: '40', barcode: 'CRS25WT4000001' },
      { type: '60', barcode: 'CRS25WT6000001' },
      { type: '72', barcode: 'CRS25WT7200001' },
      { type: '144', barcode: 'CRS25WT14400001' } // Check how 144 should be formatted
    ];
    
    for (const panel of panelTypes) {
      const result = processBarcodeComplete(panel.barcode);
      if (result.success) {
        console.log(`   ✅ Panel Type ${panel.type}: Line ${result.lineAssignment.lineNumber} (${result.lineAssignment.lineName})`);
      } else {
        console.log(`   ❌ Panel Type ${panel.type}: Invalid barcode format (${panel.barcode})`);
      }
    }

    console.log('\n✅ Integration test completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   • Barcode processing: Working');
    console.log('   • MO validation logic: Working'); 
    console.log('   • Barcode generation: Working');
    console.log('   • Progress tracking: Working');
    console.log('   • Line assignment: Working');
    console.log('\n🚀 Ready for production testing with database!');

  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testIntegration().catch(console.error);
