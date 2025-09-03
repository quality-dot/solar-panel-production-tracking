// Historical Data Routes
// API endpoints for historical data access and reporting
// Task 10.4.7 - Build API Endpoints for Historical Data and Reporting

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import historicalDataController from '../controllers/historical-data/index.js';
import { authenticateJWT, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// Historical Data Access Routes
// GET /api/v1/historical-data/manufacturing-orders
router.get('/manufacturing-orders', 
  authorizeRole(['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.getHistoricalManufacturingOrders)
);

// GET /api/v1/historical-data/panels
router.get('/panels',
  authorizeRole(['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.getHistoricalPanels)
);

// GET /api/v1/historical-data/inspections
router.get('/inspections',
  authorizeRole(['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.getHistoricalInspections)
);

// F/B Panel Reporting Routes
// GET /api/v1/historical-data/fb-reports/:moId
router.get('/fb-reports/:moId',
  authorizeRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.getFBReportByMO)
);

// Production Metrics Routes
// GET /api/v1/historical-data/production-metrics
router.get('/production-metrics',
  authorizeRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.getProductionMetrics)
);

// GET /api/v1/historical-data/real-time-metrics
router.get('/real-time-metrics',
  authorizeRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.getRealTimeMetrics)
);

// Export Routes
// POST /api/v1/historical-data/export/manufacturing-orders/csv
router.post('/export/manufacturing-orders/csv',
  authorizeRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.exportManufacturingOrdersToCSV)
);

// POST /api/v1/historical-data/export/panels/csv
router.post('/export/panels/csv',
  authorizeRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.exportPanelsToCSV)
);

// POST /api/v1/historical-data/export/fb-reports/:moId/excel
router.post('/export/fb-reports/:moId/excel',
  authorizeRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.exportFBReportToExcel)
);

// POST /api/v1/historical-data/export/production-metrics/pdf
router.post('/export/production-metrics/pdf',
  authorizeRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.exportProductionMetricsToPDF)
);

// Data Retention Routes
// GET /api/v1/historical-data/retention/analysis
router.get('/retention/analysis',
  authorizeRole(['QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.getDataRetentionAnalysis)
);

// POST /api/v1/historical-data/retention/archive
router.post('/retention/archive',
  authorizeRole(['SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.archiveEligibleData)
);

// GET /api/v1/historical-data/retention/archives
router.get('/retention/archives',
  authorizeRole(['QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.getArchiveFiles)
);

// DELETE /api/v1/historical-data/retention/archives/:filename
router.delete('/retention/archives/:filename',
  authorizeRole(['SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.deleteArchiveFile)
);

// Search and Filter Routes
// POST /api/v1/historical-data/search
router.post('/search',
  authorizeRole(['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.performAdvancedSearch)
);

// GET /api/v1/historical-data/search/suggestions
router.get('/search/suggestions',
  authorizeRole(['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.getSearchSuggestions)
);

// GET /api/v1/historical-data/search/facets
router.get('/search/facets',
  authorizeRole(['STATION_INSPECTOR', 'PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.getSearchFacets)
);

// File Management Routes
// GET /api/v1/historical-data/exports
router.get('/exports',
  authorizeRole(['PRODUCTION_SUPERVISOR', 'QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.getExportedFiles)
);

// DELETE /api/v1/historical-data/exports/:filename
router.delete('/exports/:filename',
  authorizeRole(['QC_MANAGER', 'SYSTEM_ADMIN']),
  asyncHandler(historicalDataController.deleteExportedFile)
);

export default router;
