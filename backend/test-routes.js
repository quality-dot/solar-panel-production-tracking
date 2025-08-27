// Test routes import
import express from 'express';
import simpleRoutes from './routes/simple.js';

const app = express();
const PORT = 3001;

app.use('/', simpleRoutes);

app.listen(PORT, () => {
  console.log(`Routes test server running on port ${PORT}`);
});
