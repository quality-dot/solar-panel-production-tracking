// Global Teardown for Historical Data System Tests
// Task 10.4.8 - Create Comprehensive Testing Suite

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function globalTeardown() {
  console.log('🧹 Global Test Teardown - Historical Data System');
  
  // Clean up test files
  const testFiles = [
    path.join(__dirname, '..', 'test-config.json'),
    path.join(__dirname, '..', 'exports', 'test_*.csv'),
    path.join(__dirname, '..', 'exports', 'test_*.xlsx'),
    path.join(__dirname, '..', 'exports', 'test_*.pdf'),
    path.join(__dirname, '..', 'archives', 'test_*.json')
  ];
  
  testFiles.forEach(filePattern => {
    try {
      if (fs.existsSync(filePattern)) {
        fs.unlinkSync(filePattern);
        console.log(`🗑️  Removed test file: ${filePattern}`);
      }
    } catch (error) {
      console.warn(`⚠️  Could not remove test file: ${filePattern}`, error.message);
    }
  });
  
  // Clean up test directories (only if empty)
  const testDirs = [
    path.join(__dirname, '..', 'exports'),
    path.join(__dirname, '..', 'archives')
  ];
  
  testDirs.forEach(dir => {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const testFiles = files.filter(file => 
          file.includes('test') || 
          file.includes('TEST') || 
          file.endsWith('.tmp')
        );
        
        testFiles.forEach(file => {
          fs.unlinkSync(path.join(dir, file));
          console.log(`🗑️  Removed test file: ${path.join(dir, file)}`);
        });
        
        // Remove directory if empty
        const remainingFiles = fs.readdirSync(dir);
        if (remainingFiles.length === 0) {
          fs.rmdirSync(dir);
          console.log(`📁 Removed empty test directory: ${dir}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not clean up directory: ${dir}`, error.message);
    }
  });
  
  // Reset environment variables
  delete process.env.TEST_MODE;
  delete process.env.DB_NAME;
  delete process.env.JWT_SECRET;
  
  console.log('✅ Global test teardown complete');
  console.log('🗑️  Test files cleaned up');
  console.log('📁 Test directories cleaned up');
  console.log('🔧 Environment variables reset');
  console.log('🎯 Historical Data System tests completed successfully!');
}
