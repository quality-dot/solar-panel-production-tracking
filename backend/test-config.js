// Test config imports one by one
console.log('Testing config imports...');

try {
  console.log('1. Testing environment config...');
  const { config } = await import('./config/environment.js');
  console.log('✅ Environment config loaded successfully');
} catch (error) {
  console.log('❌ Environment config failed:', error.message);
}

try {
  console.log('2. Testing database config...');
  const { databaseManager } = await import('./config/database.js');
  console.log('✅ Database config loaded successfully');
} catch (error) {
  console.log('❌ Database config failed:', error.message);
}

console.log('Config test complete');
