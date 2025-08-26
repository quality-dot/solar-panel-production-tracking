const fs = require('fs');
const path = require('path');

// Read the test file
const testFile = path.join(__dirname, 'src/services/__tests__/BackgroundSyncIntegration.test.ts');
let content = fs.readFileSync(testFile, 'utf8');

// Replace all mockResolvedValue() calls with mockResolvedValue(undefined)
content = content.replace(/\.mockResolvedValue\(\)/g, '.mockResolvedValue(undefined)');

// Write the fixed content back
fs.writeFileSync(testFile, content, 'utf8');
console.log('Fixed mockResolvedValue calls in BackgroundSyncIntegration.test.ts');
