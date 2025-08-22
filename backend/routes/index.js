// Main route configuration for manufacturing API
// RESTful routes for solar panel production workflow

import express from 'express';

const router = express.Router();

// API versioning for manufacturing system
router.use('/api/v1/stations', () => {
  // Station workflow routes - to be implemented
});

router.use('/api/v1/panels', () => {
  // Panel management routes - to be implemented  
});

router.use('/api/v1/manufacturing-orders', () => {
  // Manufacturing order routes - to be implemented
});

router.use('/api/v1/inspections', () => {
  // Inspection and pass/fail routes - to be implemented
});

router.use('/api/v1/pallets', () => {
  // Pallet management routes - to be implemented
});

router.use('/api/v1/auth', () => {
  // Authentication routes - to be implemented
});

// Health check endpoints for production monitoring
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'solar-panel-tracking-api'
  });
});

router.get('/status', (req, res) => {
  res.status(200).json({ 
    status: 'operational',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

export default router;
