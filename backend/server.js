// Solar Panel Production Tracking System - Main Server
// Manufacturing-optimized Express server for dual-line production

import express from 'express';
import { config } from './config/environment.js';

const app = express();
const PORT = config.port || 3000;

// Server initialization placeholder
console.log('🏭 Solar Panel Production Tracking System');
console.log('📡 Initializing server for dual-line manufacturing...');

// Graceful shutdown handling for production reliability
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Graceful shutdown initiated...`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Manufacturing server running on port ${PORT}`);
  console.log(`📊 Ready for 8 concurrent station connections`);
  console.log(`🔄 Environment: ${config.environment}`);
});

export default app;
