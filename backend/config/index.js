// Configuration exports for production environment
// Database, environment, and manufacturing-specific settings

export { config, validateEnvironment } from './environment.js';
export { default as database, databaseManager } from './database.js';
