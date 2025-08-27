#!/usr/bin/env node

// Barcode Generation CLI Utility
// Command-line tool for generating test barcodes during development

import { Command } from 'commander';
import { 
  BarcodeGenerator,
  BarcodeGenerationError,
  generateRandomBarcode,
  generateTestBarcodes,
  generateMOBarcodeRange,
  createTestDataset,
  validateMOBarcodeTemplate
} from '../utils/barcodeGenerator.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

const program = new Command();

program
  .name('generate-barcodes')
  .description('Generate test barcodes for development and testing')
  .version('1.0.0');

// Single barcode generation
program
  .command('single')
  .description('Generate a single random barcode')
  .option('-p, --panel-type <type>', 'Panel type (36, 40, 60, 72, 144)')
  .option('-c, --construction <type>', 'Construction type (W=monofacial, T=bifacial)')
  .option('-y, --year <year>', 'Production year (2-digit)')
  .option('-f, --factory <code>', 'Factory code (default: CRS)')
  .option('-s, --sequence <number>', 'Specific sequence number')
  .option('--json', 'Output as JSON')
  .action((options) => {
    try {
      const generateOptions = {};
      if (options.panelType) generateOptions.panelType = options.panelType;
      if (options.construction) generateOptions.constructionType = options.construction;
      if (options.year) generateOptions.productionYear = options.year;
      if (options.factory) generateOptions.factoryCode = options.factory;
      if (options.sequence) generateOptions.sequence = parseInt(options.sequence);

      const result = generateRandomBarcode(generateOptions);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('Generated Barcode:', result.barcode);
        console.log('Panel Type:', result.processing.result.panelSpecs.panelType);
        console.log('Construction:', result.processing.result.panelSpecs.constructionType);
        console.log('Line Assignment:', result.processing.result.lineAssignment.lineName);
        console.log('Nominal Wattage:', result.processing.result.panelSpecs.nominalWattage, 'W');
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Multiple barcode generation
program
  .command('multiple')
  .description('Generate multiple barcodes')
  .argument('<count>', 'Number of barcodes to generate')
  .option('-p, --panel-type <type>', 'Panel type (36, 40, 60, 72, 144)')
  .option('-c, --construction <type>', 'Construction type (W=monofacial, T=bifacial)')
  .option('-o, --output <file>', 'Save to file (JSON format)')
  .option('--csv', 'Output as CSV format')
  .action((count, options) => {
    try {
      const generateOptions = {};
      if (options.panelType) generateOptions.panelType = options.panelType;
      if (options.construction) generateOptions.constructionType = options.construction;

      const result = generateTestBarcodes(options.panelType || null, parseInt(count));

      if (options.output) {
        if (options.csv) {
          const csv = [
            'barcode,panelType,construction,lineAssignment,nominalWattage,frameColor',
            ...result.barcodes.map(b => 
              `${b.barcode},${b.processing.result.panelSpecs.panelType},${b.processing.result.panelSpecs.constructionType},${b.processing.result.lineAssignment.lineName},${b.processing.result.panelSpecs.nominalWattage},${b.processing.result.panelSpecs.frameColor}`
            )
          ].join('\n');
          
          writeFileSync(options.output, csv);
          console.log(`CSV saved to ${options.output}`);
        } else {
          writeFileSync(options.output, JSON.stringify(result, null, 2));
          console.log(`JSON saved to ${options.output}`);
        }
      } else {
        if (options.csv) {
          console.log('barcode,panelType,construction,lineAssignment,nominalWattage,frameColor');
          result.barcodes.forEach(b => {
            console.log(`${b.barcode},${b.processing.result.panelSpecs.panelType},${b.processing.result.panelSpecs.constructionType},${b.processing.result.lineAssignment.lineName},${b.processing.result.panelSpecs.nominalWattage},${b.processing.result.panelSpecs.frameColor}`);
          });
        } else {
          console.log(`Generated ${result.barcodes.length} barcodes:`);
          result.barcodes.forEach((b, i) => {
            console.log(`${i + 1}. ${b.barcode} (${b.processing.result.panelSpecs.panelType}-cell, ${b.processing.result.lineAssignment.lineName})`);
          });
        }
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// MO range generation
program
  .command('mo-range')
  .description('Generate barcode range for Manufacturing Order')
  .argument('<moId>', 'Manufacturing Order ID')
  .argument('<quantity>', 'Target quantity')
  .option('-p, --panel-type <type>', 'Panel type (36, 40, 60, 72, 144)')
  .option('-c, --construction <type>', 'Construction type (W=monofacial, T=bifacial)')
  .option('-y, --year <year>', 'Production year (2-digit)')
  .option('-f, --factory <code>', 'Factory code (default: CRS)')
  .option('-s, --start-sequence <number>', 'Starting sequence number')
  .option('-o, --output <file>', 'Save range details to file')
  .action((moId, quantity, options) => {
    try {
      const specifications = {};
      if (options.panelType) specifications.panelType = options.panelType;
      if (options.construction) specifications.constructionType = options.construction;
      if (options.year) specifications.productionYear = options.year;
      if (options.factory) specifications.factoryCode = options.factory;
      if (options.startSequence) specifications.startSequence = parseInt(options.startSequence);

      const range = generateMOBarcodeRange(parseInt(moId), parseInt(quantity), specifications);

      if (options.output) {
        writeFileSync(options.output, JSON.stringify(range, null, 2));
        console.log(`MO range saved to ${options.output}`);
      } else {
        console.log('MO Barcode Range Generated:');
        console.log('MO ID:', range.moId);
        console.log('Target Quantity:', range.targetQuantity);
        console.log('Total with Reserve:', range.totalQuantity);
        console.log('Template:', range.template);
        console.log('Sequence Range:', `${range.startSequence} - ${range.endSequence}`);
        console.log('\nSample Barcodes:');
        range.sampleBarcodes.forEach((sample, i) => {
          console.log(`${i + 1}. Position ${sample.position}: ${sample.barcode}`);
        });
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Test dataset generation
program
  .command('test-dataset')
  .description('Generate comprehensive test dataset')
  .option('-s, --samples <count>', 'Samples per panel type (default: 5)', '5')
  .option('--include-invalid', 'Include invalid barcode examples')
  .option('--include-edge-cases', 'Include edge case examples', true)
  .option('-o, --output <file>', 'Save dataset to file (required)')
  .action((options) => {
    try {
      if (!options.output) {
        console.error('Error: Output file is required for test dataset');
        process.exit(1);
      }

      const dataset = createTestDataset({
        samplesPerType: parseInt(options.samples),
        includeEdgeCases: options.includeEdgeCases,
        includeInvalid: options.includeInvalid
      });

      writeFileSync(options.output, JSON.stringify(dataset, null, 2));
      
      console.log('Test Dataset Generated:');
      console.log('Valid Sample Groups:', dataset.valid.length);
      console.log('Edge Cases:', dataset.edgeCases.length);
      console.log('MO Ranges:', dataset.moRanges.length);
      if (dataset.invalid) console.log('Invalid Examples:', dataset.invalid.length);
      console.log(`Saved to: ${options.output}`);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Template validation
program
  .command('validate-template')
  .description('Validate MO barcode template')
  .argument('<template>', 'Barcode template (e.g., CRS24WT36#####)')
  .option('-p, --panel-type <type>', 'Expected panel type')
  .option('-c, --construction <type>', 'Expected construction type (monofacial/bifacial)')
  .option('-q, --quantity <number>', 'Expected quantity')
  .action((template, options) => {
    try {
      const specifications = {};
      if (options.panelType) specifications.panelType = options.panelType;
      if (options.construction) specifications.constructionType = options.construction;
      if (options.quantity) specifications.expectedQuantity = parseInt(options.quantity);

      const result = validateMOBarcodeTemplate(template, specifications);

      console.log('Template Validation Result:');
      console.log('Valid:', result.isValid ? 'YES' : 'NO');
      console.log('Sample Barcode:', result.sampleBarcode);
      
      if (result.isValid) {
        console.log('\nTemplate Analysis:');
        console.log('Factory Code:', result.templateAnalysis.factoryCode);
        console.log('Production Year:', result.templateAnalysis.productionYear);
        console.log('Panel Type:', result.templateAnalysis.panelType);
        console.log('Construction:', result.templateAnalysis.constructionType);
        console.log('Max Capacity:', result.templateAnalysis.maxCapacity);
      } else {
        console.log('\nValidation Errors:');
        result.errors.forEach((error, i) => {
          console.log(`${i + 1}. ${error}`);
        });
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Generate specific barcode from MO range
program
  .command('from-mo')
  .description('Generate specific barcode from existing MO range')
  .argument('<moId>', 'Manufacturing Order ID')
  .argument('<position>', 'Position in range (1-based)')
  .action((moId, position) => {
    try {
      const generator = new BarcodeGenerator();
      
      // This would need MO range to be pre-generated
      console.log('Note: This command requires MO range to be previously generated.');
      console.log('Use "mo-range" command first to create the range.');
      console.log(`Requested: MO ${moId}, Position ${position}`);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Quick examples
program
  .command('examples')
  .description('Show common usage examples')
  .action(() => {
    console.log('Barcode Generation Examples:');
    console.log('');
    console.log('1. Generate single random barcode:');
    console.log('   node generateBarcodes.js single');
    console.log('');
    console.log('2. Generate 36-cell panel barcode:');
    console.log('   node generateBarcodes.js single --panel-type 36');
    console.log('');
    console.log('3. Generate 10 barcodes for testing:');
    console.log('   node generateBarcodes.js multiple 10 --csv');
    console.log('');
    console.log('4. Generate MO range for 1000 panels:');
    console.log('   node generateBarcodes.js mo-range 101 1000 --panel-type 144');
    console.log('');
    console.log('5. Create comprehensive test dataset:');
    console.log('   node generateBarcodes.js test-dataset --output test-data.json');
    console.log('');
    console.log('6. Validate MO template:');
    console.log('   node generateBarcodes.js validate-template "CRS24WT36#####" --panel-type 36');
    console.log('');
  });

// Error handling
program.exitOverride((err) => {
  if (err.exitCode === 0) {
    process.exit(0);
  }
  
  console.error('Command failed:', err.message);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
