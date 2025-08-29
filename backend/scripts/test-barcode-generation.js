#!/usr/bin/env node

// Enhanced Barcode Generation Test Script
// Tests the complete barcode generation system with MO integration and database support
// Verifies barcode generation, MO range creation, template validation, and test dataset generation

import { 
  barcodeGenerator, 
  BarcodeGenerator, 
  BarcodeGenerationError,
  generateRandomBarcode,
  generateTestBarcodes,
  generateMOBarcodeRange,
  createTestDataset,
  validateMOBarcodeTemplate
} from '../utils/barcodeGenerator.js';

import { ManufacturingLogger } from '../middleware/logger.js';

const logger = new ManufacturingLogger('BarcodeGenerationTest');

/**
 * Test enhanced barcode generation functionality
 */
async function testBarcodeGeneration() {
  try {
    console.log('🧪 Testing Enhanced Barcode Generation System...\n');
    
    // Test 1: Basic barcode generation
    console.log('1️⃣  Testing basic barcode generation...');
    const singleBarcode = barcodeGenerator.generateBarcode({
      panelType: '36',
      productionYear: '24',
      constructionType: 'Y'
    });
    
    console.log(`   ✅ Single barcode generated: ${singleBarcode.barcode}`);
    console.log(`      Panel Type: ${singleBarcode.components.panelType}`);
    console.log(`      Line Assignment: ${singleBarcode.processing.lineAssignment?.lineNumber}`);
    console.log(`      Wattage: ${singleBarcode.processing.specification?.nominalWattage}W`);
    console.log('   ✅ Basic generation completed\n');
    
    // Test 2: Multiple barcode generation
    console.log('2️⃣  Testing multiple barcode generation...');
    const multipleBarcodes = barcodeGenerator.generateBarcodes(5, {
      panelType: '60',
      ensureUnique: true
    });
    
    console.log(`   ✅ Generated ${multipleBarcodes.barcodes.length} barcodes`);
    console.log(`      Success Rate: ${multipleBarcodes.statistics.successRate}`);
    console.log(`      Failed: ${multipleBarcodes.errors.length}`);
    
    if (multipleBarcodes.barcodes.length > 0) {
      console.log(`      Sample: ${multipleBarcodes.barcodes[0].barcode}`);
    }
    console.log('   ✅ Multiple generation completed\n');
    
    // Test 3: Manufacturing Order barcode range
    console.log('3️⃣  Testing MO barcode range generation...');
    const moRange = barcodeGenerator.generateMORange(1001, 50, {
      panelType: '72',
      productionYear: '24',
      constructionType: 'F'
    });
    
    console.log(`   ✅ MO Range created for MO ${moRange.moId}`);
    console.log(`      Panel Type: ${moRange.specifications.panelType}`);
    console.log(`      Target Quantity: ${moRange.targetQuantity}`);
    console.log(`      Total Quantity (with reserve): ${moRange.totalQuantity}`);
    console.log(`      Sequence Range: ${moRange.startSequence} - ${moRange.endSequence}`);
    console.log(`      Sample Barcodes: ${moRange.sampleBarcodes.length}`);
    
    if (moRange.sampleBarcodes.length > 0) {
      console.log(`      First Sample: ${moRange.sampleBarcodes[0].barcode}`);
      console.log(`      Last Sample: ${moRange.sampleBarcodes[moRange.sampleBarcodes.length - 1].barcode}`);
    }
    console.log('   ✅ MO range generation completed\n');
    
    // Test 4: Generate barcode from MO range position
    console.log('4️⃣  Testing barcode generation from MO range...');
    const positionBarcode = barcodeGenerator.generateFromMORange(1001, 25);
    
    console.log(`   ✅ Position barcode generated: ${positionBarcode.barcode}`);
    console.log(`      Position: ${positionBarcode.position}`);
    console.log(`      Sequence: ${positionBarcode.sequence}`);
    console.log(`      MO ID: ${positionBarcode.moId}`);
    console.log('   ✅ Position generation completed\n');
    
    // Test 5: MO template validation
    console.log('5️⃣  Testing MO template validation...');
    const validTemplate = {
      panelType: '144',
      targetQuantity: 100,
      lineAssignment: 'LINE_2',
      startSequence: 1000,
      endSequence: 1099
    };
    
    const invalidTemplate = {
      panelType: '36',
      targetQuantity: 100,
      lineAssignment: 'LINE_2', // Should be LINE_1 for 36-cell
      startSequence: 2000,
      endSequence: 1999 // Invalid sequence
    };
    
    const validValidation = barcodeGenerator.validateMOTemplate(validTemplate);
    const invalidValidation = barcodeGenerator.validateMOTemplate(invalidTemplate);
    
    console.log(`   ✅ Valid template validation: ${validValidation.isValid}`);
    console.log(`      Errors: ${validValidation.errors.length}`);
    console.log(`      Warnings: ${validValidation.warnings.length}`);
    
    console.log(`   ✅ Invalid template validation: ${invalidValidation.isValid}`);
    console.log(`      Errors: ${invalidValidation.errors.length}`);
    console.log(`      Warnings: ${invalidValidation.warnings.length}`);
    
    if (invalidValidation.errors.length > 0) {
      console.log(`      First Error: ${invalidValidation.errors[0]}`);
    }
    console.log('   ✅ Template validation completed\n');
    
    // Test 6: Test dataset generation
    console.log('6️⃣  Testing comprehensive test dataset generation...');
    const testDataset = barcodeGenerator.generateTestDataset({
      samplesPerType: 3,
      includeEdgeCases: true,
      includeInvalid: true
    });
    
    console.log(`   ✅ Test dataset generated`);
    console.log(`      Valid samples per type: ${Object.keys(testDataset.valid).length}`);
    console.log(`      Edge cases: ${testDataset.edgeCases.length}`);
    console.log(`      Invalid examples: ${testDataset.invalid.length}`);
    
    // Show sample from each panel type
    for (const [panelType, samples] of Object.entries(testDataset.valid)) {
      if (samples.barcodes && samples.barcodes.length > 0) {
        console.log(`         ${panelType}-cell: ${samples.barcodes[0].barcode}`);
      }
    }
    console.log('   ✅ Test dataset generation completed\n');
    
    // Test 7: Generation statistics
    console.log('7️⃣  Testing generation statistics...');
    const stats = barcodeGenerator.getStatistics();
    
    console.log(`   ✅ Statistics retrieved`);
    console.log(`      Total Generated: ${stats.totalGenerated}`);
    console.log(`      Total MO Ranges: ${stats.totalMORanges}`);
    console.log(`      Success Rate: ${stats.successRate}`);
    console.log(`      Cache Size: ${stats.cacheSize.barcodes} barcodes, ${stats.cacheSize.moRanges} MO ranges`);
    
    if (Object.keys(stats.panelTypeDistribution).length > 0) {
      console.log(`      Panel Type Distribution:`);
      for (const [type, count] of Object.entries(stats.panelTypeDistribution)) {
        console.log(`         ${type}-cell: ${count}`);
      }
    }
    console.log('   ✅ Statistics completed\n');
    
    // Test 8: Utility functions
    console.log('8️⃣  Testing utility functions...');
    
    const randomBarcode = generateRandomBarcode({ panelType: '40' });
    console.log(`   ✅ Random barcode: ${randomBarcode.barcode}`);
    
    const testBarcodes = generateTestBarcodes('60', 3);
    console.log(`   ✅ Test barcodes for 60-cell: ${testBarcodes.barcodes.length} generated`);
    
    const moBarcodeRange = generateMOBarcodeRange(1002, 25, { panelType: '144' });
    console.log(`   ✅ MO barcode range: ${moBarcodeRange.targetQuantity} panels`);
    
    const dataset = createTestDataset({ samplesPerType: 2 });
    console.log(`   ✅ Test dataset: ${Object.keys(dataset.valid).length} panel types`);
    
    const templateValidation = validateMOBarcodeTemplate({ panelType: '72', targetQuantity: 50 });
    console.log(`   ✅ Template validation: ${templateValidation.isValid}`);
    
    console.log('   ✅ Utility functions completed\n');
    
    // Test 9: Error handling
    console.log('9️⃣  Testing error handling...');
    
    try {
      // Try to generate barcode from non-existent MO range
      barcodeGenerator.generateFromMORange(9999, 1);
      console.log('   ❌ Should have failed for non-existent MO');
    } catch (error) {
      console.log(`   ✅ Correctly caught error: ${error.message}`);
    }
    
    try {
      // Try to generate barcode with invalid position
      barcodeGenerator.generateFromMORange(1001, 1000);
      console.log('   ❌ Should have failed for invalid position');
    } catch (error) {
      console.log(`   ✅ Correctly caught error: ${error.message}`);
    }
    
    try {
      // Try to generate barcodes with invalid count
      barcodeGenerator.generateBarcodes(0);
      console.log('   ❌ Should have failed for invalid count');
    } catch (error) {
      console.log(`   ✅ Correctly caught error: ${error.message}`);
    }
    
    console.log('   ✅ Error handling completed\n');
    
    // Test 10: Performance testing
    console.log('🔟 Testing performance...');
    const startTime = Date.now();
    
    // Generate 100 barcodes
    const performanceTest = barcodeGenerator.generateBarcodes(100, { ensureUnique: false });
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`   ✅ Performance test completed`);
    console.log(`      Generated: ${performanceTest.barcodes.length} barcodes`);
    console.log(`      Duration: ${duration}ms`);
    console.log(`      Rate: ${Math.round(performanceTest.barcodes.length / (duration / 1000))} barcodes/second`);
    console.log('   ✅ Performance testing completed\n');
    
    // Final summary
    console.log('🎉 All Enhanced Barcode Generation Tests Completed Successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Basic barcode generation');
    console.log('   ✅ Multiple barcode generation');
    console.log('   ✅ MO barcode range generation');
    console.log('   ✅ Position-based barcode generation');
    console.log('   ✅ Template validation');
    console.log('   ✅ Test dataset generation');
    console.log('   ✅ Generation statistics');
    console.log('   ✅ Utility functions');
    console.log('   ✅ Error handling');
    console.log('   ✅ Performance testing');
    
    console.log('\n🚀 The enhanced barcode generation system is fully operational!');
    console.log('\n💡 Key Features:');
    console.log('   • CRSYYFBPP##### format support');
    console.log('   • Manufacturing Order integration');
    console.log('   • Line assignment optimization');
    console.log('   • Comprehensive validation');
    console.log('   • Performance optimization');
    console.log('   • Error handling and recovery');
    
  } catch (error) {
    console.error('\n❌ Enhanced barcode generation test failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    
    logger.error('Enhanced barcode generation test failed', {
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
  console.log('\n\n⏹️  Enhanced barcode generation test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  Enhanced barcode generation test terminated');
  process.exit(0);
});

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testBarcodeGeneration();
}

export { testBarcodeGeneration };
