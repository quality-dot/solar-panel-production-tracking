// Minimal routes file for debugging path-to-regexp issue
import express from 'express';

const router = express.Router();

// Simple root route
router.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

export default router;
