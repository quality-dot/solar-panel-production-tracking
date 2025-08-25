// Minimal test server
import express from 'express';

const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Minimal test server is running' });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
