const fs = require('fs');
const path = require('path');

// Read the test file
const testFile = path.join(__dirname, 'src/hooks/__tests__/useBackgroundSync.test.tsx');
let content = fs.readFileSync(testFile, 'utf8');

// Replace all renderHook calls that don't already have a wrapper
const renderHookPattern = /renderHook\(\(\)\s*=>\s*useBackgroundSync\([^)]*\)\)/g;
content = content.replace(renderHookPattern, (match) => {
  // If it already has a wrapper, don't change it
  if (match.includes('wrapper: TestWrapper')) {
    return match;
  }
  // Add the wrapper
  return match.replace(')', ', { wrapper: TestWrapper })');
});

// Write the fixed content back
fs.writeFileSync(testFile, content, 'utf8');
console.log('Updated renderHook calls in useBackgroundSync.test.tsx');
