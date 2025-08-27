// Test server components step by step
import express from 'express';
import cors from 'cors';

console.log('Step 1: Basic Express app');
const app = express();

console.log('Step 2: Importing config...');
const { config, validateEnvironment } = await import('./config/environment.js');
console.log('✅ Config imported');

console.log('Step 3: Validating environment...');
try {
  validateEnvironment();
  console.log('✅ Environment validated');
} catch (error) {
  console.log('❌ Environment validation failed:', error.message);
  process.exit(1);
}

console.log('Step 4: Importing database manager...');
const { databaseManager } = await import('./config/database.js');
console.log('✅ Database manager imported');

console.log('Step 5: Adding basic middleware...');
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
console.log('✅ Basic middleware added');

console.log('Step 6: Importing simple routes...');
const simpleRoutes = await import('./routes/simple.js');
app.use('/', simpleRoutes.default);
console.log('✅ Simple routes added');

console.log('Step 7: Starting server...');
const PORT = config.port || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running successfully on port ${PORT}`);
});
