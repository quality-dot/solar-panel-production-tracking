// Historical Data Controller
// Provides API endpoints for historical data access and reporting
// Task 10.4.7 - Build API Endpoints for Historical Data and Reporting

import { manufacturingLogger } from '../../middleware/logger.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import historicalDataService from '../../services/historicalDataService.js';
import fbPanelReportingService from '../../services/fbPanelReportingService.js';
import productionMetricsService from '../../services/productionMetricsService.js';
import exportService from '../../services/exportService.js';
import dataRetentionService from '../../services/dataRetentionService.js';
import searchFilterService from '../../services/searchFilterService.js';

class HistoricalDataController {
  constructor() {
    this.logger = manufacturingLogger;
  }

  /**
   * Get historical manufacturing orders with filtering and pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getHistoricalManufacturingOrders(req, res) {
    try {
      const {
        dateFrom,
        dateTo,
        status,
        panelType,
        createdBy,
        customerName,
        orderNumber,
        minQuantity,
        maxQuantity,
        page = 1,
        limit = 50,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const filters = {
        dateFrom,
        dateTo,
        status: status ? status.split(',') : undefined,
        panelType: panelType ? panelType.split(',') : undefined,
        createdBy,
        customerName,
        orderNumber,
        minQuantity: minQuantity ? parseInt(minQuantity) : undefined,
        maxQuantity: maxQuantity ? parseInt(maxQuantity) : undefined
      };

      const pagination = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100) // Max 100 records per page
      };

      const sorting = {
        sortBy,
        sortOrder: sortOrder.toUpperCase()
      };

      const result = await historicalDataService.getHistoricalManufacturingOrders(filters, pagination, sorting);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        },
        filters,
        sorting,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get historical manufacturing orders', {
        error: error.message,
        query: req.query
      });
      throw error;
    }
  }

  /**
   * Get historical panels with filtering and pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getHistoricalPanels(req, res) {
    try {
      const {
        dateFrom,
        dateTo,
        status,
        panelType,
        frameType,
        backsheetType,
        moId,
        customerName,
        barcode,
        page = 1,
        limit = 50,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const filters = {
        dateFrom,
        dateTo,
        status: status ? status.split(',') : undefined,
        panelType: panelType ? panelType.split(',') : undefined,
        frameType: frameType ? frameType.split(',') : undefined,
        backsheetType: backsheetType ? backsheetType.split(',') : undefined,
        moId,
        customerName,
        barcode
      };

      const pagination = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100)
      };

      const sorting = {
        sortBy,
        sortOrder: sortOrder.toUpperCase()
      };

      const result = await historicalDataService.getHistoricalPanels(filters, pagination, sorting);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        },
        filters,
        sorting,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get historical panels', {
        error: error.message,
        query: req.query
      });
      throw error;
    }
  }

  /**
   * Get historical inspections with filtering and pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getHistoricalInspections(req, res) {
    try {
      const {
        dateFrom,
        dateTo,
        inspectionType,
        result,
        stationId,
        inspectorId,
        panelId,
        moId,
        page = 1,
        limit = 50,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const filters = {
        dateFrom,
        dateTo,
        inspectionType: inspectionType ? inspectionType.split(',') : undefined,
        result: result ? result.split(',') : undefined,
        stationId,
        inspectorId,
        panelId,
        moId
      };

      const pagination = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100)
      };

      const sorting = {
        sortBy,
        sortOrder: sortOrder.toUpperCase()
      };

      const inspectionResult = await historicalDataService.getHistoricalInspections(filters, pagination, sorting);

      res.json({
        success: true,
        data: inspectionResult.data,
        pagination: {
          page: inspectionResult.page,
          limit: inspectionResult.limit,
          total: inspectionResult.total,
          totalPages: inspectionResult.totalPages
        },
        filters,
        sorting,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get historical inspections', {
        error: error.message,
        query: req.query
      });
      throw error;
    }
  }

  /**
   * Get F/B panel report for a specific manufacturing order
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFBReportByMO(req, res) {
    try {
      const { moId } = req.params;
      const {
        includeDetails = 'true',
        includeReworkHistory = 'true',
        includeQualityAnalysis = 'true'
      } = req.query;

      const options = {
        includeDetails: includeDetails === 'true',
        includeReworkHistory: includeReworkHistory === 'true',
        includeQualityAnalysis: includeQualityAnalysis === 'true'
      };

      const result = await fbPanelReportingService.generateFBReportByMO(parseInt(moId), options);

      res.json({
        success: true,
        data: result,
        moId: parseInt(moId),
        options,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get F/B report by MO', {
        error: error.message,
        moId: req.params.moId,
        query: req.query
      });
      throw error;
    }
  }

  /**
   * Get production metrics with filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProductionMetrics(req, res) {
    try {
      const {
        dateFrom,
        dateTo,
        panelType,
        stationId,
        lineId,
        includeRealTime = 'false'
      } = req.query;

      const filters = {
        dateFrom,
        dateTo,
        panelType: panelType ? panelType.split(',') : undefined,
        stationId,
        lineId
      };

      const metrics = await productionMetricsService.calculateProductionMetrics(filters);

      let realTimeMetrics = null;
      if (includeRealTime === 'true') {
        realTimeMetrics = await productionMetricsService.getRealTimeMetrics(filters);
      }

      res.json({
        success: true,
        data: {
          metrics,
          realTimeMetrics
        },
        filters,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get production metrics', {
        error: error.message,
        query: req.query
      });
      throw error;
    }
  }

  /**
   * Get real-time production metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRealTimeMetrics(req, res) {
    try {
      const {
        panelType,
        stationId,
        lineId
      } = req.query;

      const filters = {
        panelType: panelType ? panelType.split(',') : undefined,
        stationId,
        lineId
      };

      const result = await productionMetricsService.getRealTimeMetrics(filters);

      res.json({
        success: true,
        data: result,
        filters,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get real-time metrics', {
        error: error.message,
        query: req.query
      });
      throw error;
    }
  }

  /**
   * Export manufacturing orders to CSV
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async exportManufacturingOrdersToCSV(req, res) {
    try {
      const {
        dateFrom,
        dateTo,
        status,
        panelType,
        createdBy,
        customerName,
        orderNumber,
        minQuantity,
        maxQuantity,
        includePanels = 'false',
        includeStatistics = 'true',
        customFields
      } = req.query;

      const filters = {
        dateFrom,
        dateTo,
        status: status ? status.split(',') : undefined,
        panelType: panelType ? panelType.split(',') : undefined,
        createdBy,
        customerName,
        orderNumber,
        minQuantity: minQuantity ? parseInt(minQuantity) : undefined,
        maxQuantity: maxQuantity ? parseInt(maxQuantity) : undefined
      };

      const options = {
        includePanels: includePanels === 'true',
        includeStatistics: includeStatistics === 'true',
        customFields: customFields ? customFields.split(',') : []
      };

      const result = await exportService.exportManufacturingOrdersToCSV(filters, options);

      res.json({
        success: true,
        data: result,
        filters,
        options,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to export manufacturing orders to CSV', {
        error: error.message,
        query: req.query
      });
      throw error;
    }
  }

  /**
   * Export panels to CSV
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async exportPanelsToCSV(req, res) {
    try {
      const {
        dateFrom,
        dateTo,
        status,
        panelType,
        frameType,
        backsheetType,
        moId,
        customerName,
        barcode,
        includeMOInfo = 'true',
        includeStationInfo = 'true',
        includeElectricalData = 'true'
      } = req.query;

      const filters = {
        dateFrom,
        dateTo,
        status: status ? status.split(',') : undefined,
        panelType: panelType ? panelType.split(',') : undefined,
        frameType: frameType ? frameType.split(',') : undefined,
        backsheetType: backsheetType ? backsheetType.split(',') : undefined,
        moId,
        customerName,
        barcode
      };

      const options = {
        includeMOInfo: includeMOInfo === 'true',
        includeStationInfo: includeStationInfo === 'true',
        includeElectricalData: includeElectricalData === 'true'
      };

      const result = await exportService.exportPanelsToCSV(filters, options);

      res.json({
        success: true,
        data: result,
        filters,
        options,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to export panels to CSV', {
        error: error.message,
        query: req.query
      });
      throw error;
    }
  }

  /**
   * Export F/B report to Excel
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async exportFBReportToExcel(req, res) {
    try {
      const { moId } = req.params;
      const {
        includeDetails = 'true',
        includeReworkHistory = 'true',
        includeQualityAnalysis = 'true'
      } = req.query;

      const options = {
        includeDetails: includeDetails === 'true',
        includeReworkHistory: includeReworkHistory === 'true',
        includeQualityAnalysis: includeQualityAnalysis === 'true'
      };

      const result = await exportService.exportFBReportToExcel(parseInt(moId), options);

      res.json({
        success: true,
        data: result,
        moId: parseInt(moId),
        options,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to export F/B report to Excel', {
        error: error.message,
        moId: req.params.moId,
        query: req.query
      });
      throw error;
    }
  }

  /**
   * Export production metrics to PDF
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async exportProductionMetricsToPDF(req, res) {
    try {
      const {
        dateFrom,
        dateTo,
        panelType,
        stationId,
        lineId,
        includeCharts = 'false',
        includeRecommendations = 'true',
        includeDetailedMetrics = 'true'
      } = req.query;

      const filters = {
        dateFrom,
        dateTo,
        panelType: panelType ? panelType.split(',') : undefined,
        stationId,
        lineId
      };

      const options = {
        includeCharts: includeCharts === 'true',
        includeRecommendations: includeRecommendations === 'true',
        includeDetailedMetrics: includeDetailedMetrics === 'true'
      };

      const result = await exportService.exportProductionMetricsToPDF(filters, options);

      res.json({
        success: true,
        data: result,
        filters,
        options,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to export production metrics to PDF', {
        error: error.message,
        query: req.query
      });
      throw error;
    }
  }

  /**
   * Get data retention analysis
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDataRetentionAnalysis(req, res) {
    try {
      const {
        includeStorageAnalysis = 'true',
        includeComplianceCheck = 'true',
        includeRecommendations = 'true'
      } = req.query;

      const options = {
        includeStorageAnalysis: includeStorageAnalysis === 'true',
        includeComplianceCheck: includeComplianceCheck === 'true',
        includeRecommendations: includeRecommendations === 'true'
      };

      const result = await dataRetentionService.analyzeDataRetention(options);

      res.json({
        success: true,
        data: result,
        options,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get data retention analysis', {
        error: error.message,
        query: req.query
      });
      throw error;
    }
  }

  /**
   * Archive eligible data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async archiveEligibleData(req, res) {
    try {
      const {
        dryRun = 'false',
        batchSize = '1000',
        tables
      } = req.query;

      const options = {
        dryRun: dryRun === 'true',
        batchSize: parseInt(batchSize),
        tables: tables ? tables.split(',') : null
      };

      const result = await dataRetentionService.archiveAllEligibleData(options);

      res.json({
        success: true,
        data: result,
        options,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to archive eligible data', {
        error: error.message,
        query: req.query
      });
      throw error;
    }
  }

  /**
   * Get archive files
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getArchiveFiles(req, res) {
    try {
      const {
        tableName,
        dateFrom,
        dateTo
      } = req.query;

      const filters = {
        tableName,
        dateFrom,
        dateTo
      };

      const result = await dataRetentionService.getArchiveFiles(filters);

      res.json({
        success: true,
        data: result,
        filters,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get archive files', {
        error: error.message,
        query: req.query
      });
      throw error;
    }
  }

  /**
   * Perform advanced search
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async performAdvancedSearch(req, res) {
    try {
      const {
        query,
        dataTypes = 'manufacturing_orders,panels,inspections',
        searchFields,
        dateFrom,
        dateTo,
        filters,
        page = 1,
        limit = 50,
        sortBy = 'relevance',
        sortOrder = 'DESC',
        includeHighlights = 'true',
        includeFacets = 'true',
        includeSuggestions = 'true',
        useFuzzySearch = 'false',
        searchMode = 'all'
      } = req.body;

      const searchCriteria = {
        query,
        dataTypes: dataTypes.split(','),
        searchFields: searchFields ? searchFields.split(',') : [],
        dateRange: {
          from: dateFrom,
          to: dateTo
        },
        filters: filters || {},
        pagination: {
          page: parseInt(page),
          limit: Math.min(parseInt(limit), 100)
        },
        sorting: {
          sortBy,
          sortOrder: sortOrder.toUpperCase()
        }
      };

      const options = {
        includeHighlights: includeHighlights === 'true',
        includeFacets: includeFacets === 'true',
        includeSuggestions: includeSuggestions === 'true',
        useFuzzySearch: useFuzzySearch === 'true',
        searchMode
      };

      const result = await searchFilterService.performAdvancedSearch(searchCriteria, options);

      res.json({
        success: true,
        data: result,
        searchCriteria,
        options,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to perform advanced search', {
        error: error.message,
        body: req.body
      });
      throw error;
    }
  }

  /**
   * Get search suggestions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSearchSuggestions(req, res) {
    try {
      const { query } = req.query;

      if (!query || query.length < 2) {
        return res.json({
          success: true,
          data: [],
          query,
          timestamp: new Date().toISOString()
        });
      }

      const suggestions = await searchFilterService.generateSearchSuggestions(query);

      res.json({
        success: true,
        data: suggestions,
        query,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get search suggestions', {
        error: error.message,
        query: req.query.query
      });
      throw error;
    }
  }

  /**
   * Get search facets
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSearchFacets(req, res) {
    try {
      const {
        dataTypes = 'manufacturing_orders,panels,inspections',
        query
      } = req.query;

      const searchCriteria = {
        dataTypes: dataTypes.split(','),
        query: query || ''
      };

      const result = await searchFilterService.generateSearchFacets(searchCriteria);

      res.json({
        success: true,
        data: result,
        searchCriteria,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get search facets', {
        error: error.message,
        query: req.query
      });
      throw error;
    }
  }

  /**
   * Get exported files
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getExportedFiles(req, res) {
    try {
      const {
        format,
        dateFrom,
        dateTo
      } = req.query;

      const filters = {
        format,
        dateFrom,
        dateTo
      };

      const result = await exportService.getExportedFiles(filters);

      res.json({
        success: true,
        data: result,
        filters,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get exported files', {
        error: error.message,
        query: req.query
      });
      throw error;
    }
  }

  /**
   * Delete exported file
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteExportedFile(req, res) {
    try {
      const { filename } = req.params;

      const result = await exportService.deleteExportedFile(filename);

      res.json({
        success: true,
        data: result,
        filename,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to delete exported file', {
        error: error.message,
        filename: req.params.filename
      });
      throw error;
    }
  }

  /**
   * Delete archive file
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteArchiveFile(req, res) {
    try {
      const { filename } = req.params;

      const result = await dataRetentionService.deleteArchiveFile(filename);

      res.json({
        success: true,
        data: result,
        filename,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to delete archive file', {
        error: error.message,
        filename: req.params.filename
      });
      throw error;
    }
  }
}

export default new HistoricalDataController();
