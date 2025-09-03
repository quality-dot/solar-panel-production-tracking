import { barcodeGenerator } from '../utils/barcodeGenerator.js';
import { processBarcodeComplete } from '../utils/barcodeProcessor.js';

console.log('Testing Extended Year Range (20-99)');
console.log('===================================\n');

// Test 1: Current year (2025)
console.log('1. Testing current year (2025):');
try {
  const barcode2025 = barcodeGenerator.generateBarcode({ productionYear: '25' });
  console.log(`   SUCCESS: 2025 barcode: ${barcode2025.barcode}`);
} catch (error) {
  console.log(`   FAILED: 2025 failed: ${error.message}`);
}

// Test 2: Future year (2030)
console.log('\n2. Testing future year (2030):');
try {
  const barcode2030 = barcodeGenerator.generateBarcode({ productionYear: '30' });
  console.log(`   SUCCESS: 2030 barcode: ${barcode2030.barcode}`);
} catch (error) {
  console.log(`   FAILED: 2030 failed: ${error.message}`);
}

// Test 3: Far future year (2050)
console.log('\n3. Testing far future year (2050):');
try {
  const barcode2050 = barcodeGenerator.generateBarcode({ productionYear: '50' });
  console.log(`   SUCCESS: 2050 barcode: ${barcode2050.barcode}`);
} catch (error) {
  console.log(`   FAILED: 2050 failed: ${error.message}`);
}

// Test 4: Maximum year (2099)
console.log('\n4. Testing maximum year (2099):');
try {
  const barcode2099 = barcodeGenerator.generateBarcode({ productionYear: '99' });
  console.log(`   SUCCESS: 2099 barcode: ${barcode2099.barcode}`);
} catch (error) {
  console.log(`   FAILED: 2099 failed: ${error.message}`);
}

// Test 5: Invalid year (2019)
console.log('\n5. Testing invalid year (2019):');
try {
  const barcode2019 = barcodeGenerator.generateBarcode({ productionYear: '19' });
  console.log(`   SUCCESS: 2019 barcode: ${barcode2019.barcode}`);
} catch (error) {
  console.log(`   FAILED: 2019 failed: ${error.message}`);
}

// Test 6: Invalid year (2100)
console.log('\n6. Testing invalid year (2100):');
try {
  const barcode2100 = barcodeGenerator.generateBarcode({ productionYear: '00' });
  console.log(`   SUCCESS: 2100 barcode: ${barcode2100.barcode}`);
} catch (error) {
  console.log(`   FAILED: 2100 failed: ${error.message}`);
}

// Test 7: Test edge case generation
console.log('\n7. Testing edge case generation:');
try {
  const testDataset = barcodeGenerator.generateTestDataset({ includeEdgeCases: true });
  console.log(`   SUCCESS: Edge cases generated: ${testDataset.edgeCases.length}`);
  testDataset.edgeCases.forEach((barcode, index) => {
    console.log(`      ${index + 1}. ${barcode.barcode}`);
  });
} catch (error) {
  console.log(`   FAILED: Edge case generation failed: ${error.message}`);
}

// Test 8: Test barcode validation directly
console.log('\n8. Testing barcode validation directly:');
const testBarcodes = [
  'CRS25WT03600001', // 2025 - should be valid
  'CRS30WT03600001', // 2030 - should be valid
  'CRS50WT03600001', // 2050 - should be valid
  'CRS99WT03600001', // 2099 - should be valid
  'CRS19WT03600001', // 2019 - should be invalid
  'CRS00WT03600001'  // 2100 - should be invalid
];

testBarcodes.forEach((barcode, index) => {
  try {
    const result = processBarcodeComplete(barcode);
    console.log(`   ${index + 1}. ${barcode}: ${result.success ? 'VALID' : 'INVALID'}`);
    if (!result.success) {
      console.log(`      Error: ${result.error?.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`   ${index + 1}. ${barcode}: ERROR - ${error.message}`);
  }
});

console.log('\nExtended Year Range Test Complete!');
