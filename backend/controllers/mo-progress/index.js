// Manufacturing Order Progress Tracking Controller
// API endpoints for progress monitoring and alert management

import moProgressTrackingService from '../../services/moProgressTrackingService.js';
import moAlertService from '../../services/moAlertService.js';
import { manufacturingLogger } from '../../middleware/logger.js';

class MOProgressController {
  constructor() {
    this.logger = manufacturingLogger;
  }

  /**
   * Get progress for a specific manufacturing order
   * GET /api/v1/manufacturing-orders/:id/progress
   */
  async getMOProgress(req, res) {
    try {
      const { id } = req.params;
      const moId = parseInt(id);

      if (isNaN(moId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manufacturing order ID'
        });
      }

      const progressData = await moProgressTrackingService.calculateMOProgress(moId);

      this.logger.info('MO progress retrieved via API', {
        moId,
        order_number: progressData.order_number,
        progress_percentage: progressData.progress_percentage,
        userId: req.user?.id
      });

      res.json({
        success: true,
        data: progressData
      });

    } catch (error) {
      this.logger.error('Failed to get MO progress via API', {
        error: error.message,
        moId: req.params.id,
        userId: req.user?.id
      });

      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve MO progress',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get progress for multiple manufacturing orders
   * POST /api/v1/manufacturing-orders/progress/batch
   */
  async getBatchMOProgress(req, res) {
    try {
      const { mo_ids } = req.body;

      if (!Array.isArray(mo_ids) || mo_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'mo_ids array is required and must not be empty'
        });
      }

      if (mo_ids.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 50 manufacturing orders allowed per batch request'
        });
      }

      const progressData = await moProgressTrackingService.getMultipleMOProgress(mo_ids);

      this.logger.info('Batch MO progress retrieved via API', {
        mo_count: progressData.length,
        mo_ids,
        userId: req.user?.id
      });

      res.json({
        success: true,
        data: progressData,
        meta: {
          count: progressData.length,
          requested: mo_ids.length
        }
      });

    } catch (error) {
      this.logger.error('Failed to get batch MO progress via API', {
        error: error.message,
        mo_ids: req.body.mo_ids,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve batch MO progress',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get active manufacturing orders with progress
   * GET /api/v1/manufacturing-orders/progress/active
   */
  async getActiveMOsProgress(req, res) {
    try {
      const filters = {
        status: req.query.status || 'ACTIVE',
        limit: parseInt(req.query.limit) || 50
      };

      const progressData = await moProgressTrackingService.getActiveMOsWithProgress(filters);

      this.logger.info('Active MOs progress retrieved via API', {
        mo_count: progressData.length,
        filters,
        userId: req.user?.id
      });

      res.json({
        success: true,
        data: progressData,
        meta: {
          count: progressData.length,
          filters
        }
      });

    } catch (error) {
      this.logger.error('Failed to get active MOs progress via API', {
        error: error.message,
        query: req.query,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve active MOs progress',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get alerts for a manufacturing order
   * GET /api/v1/manufacturing-orders/:id/alerts
   */
  async getMOAlerts(req, res) {
    try {
      const { id } = req.params;
      const moId = parseInt(id);

      if (isNaN(moId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manufacturing order ID'
        });
      }

      const filters = {
        status: req.query.status,
        severity: req.query.severity,
        alert_type: req.query.alert_type,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const alerts = await moAlertService.getMOAlerts(moId, filters);

      res.json({
        success: true,
        data: alerts,
        meta: {
          count: alerts.length,
          filters
        }
      });

    } catch (error) {
      this.logger.error('Failed to get MO alerts via API', {
        error: error.message,
        moId: req.params.id,
        query: req.query,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve MO alerts',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get all active alerts across all manufacturing orders
   * GET /api/v1/manufacturing-orders/alerts/active
   */
  async getAllActiveAlerts(req, res) {
    try {
      const filters = {
        severity: req.query.severity,
        alert_type: req.query.alert_type,
        limit: parseInt(req.query.limit) || 100,
        offset: parseInt(req.query.offset) || 0
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const alerts = await moAlertService.getAllActiveAlerts(filters);

      res.json({
        success: true,
        data: alerts,
        meta: {
          count: alerts.length,
          filters
        }
      });

    } catch (error) {
      this.logger.error('Failed to get all active alerts via API', {
        error: error.message,
        query: req.query,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve active alerts',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Acknowledge an alert
   * POST /api/v1/manufacturing-orders/alerts/:alertId/acknowledge
   */
  async acknowledgeAlert(req, res) {
    try {
      const { alertId } = req.params;
      const alertIdNum = parseInt(alertId);

      if (isNaN(alertIdNum)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid alert ID'
        });
      }

      const { notes } = req.body;
      const acknowledgedBy = req.user.id;

      const updatedAlert = await moAlertService.acknowledgeAlert(alertIdNum, acknowledgedBy, notes);

      this.logger.info('Alert acknowledged via API', {
        alert_id: alertIdNum,
        acknowledged_by: acknowledgedBy,
        notes,
        userId: req.user.id
      });

      res.json({
        success: true,
        message: 'Alert acknowledged successfully',
        data: updatedAlert
      });

    } catch (error) {
      this.logger.error('Failed to acknowledge alert via API', {
        error: error.message,
        alertId: req.params.alertId,
        userId: req.user?.id
      });

      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to acknowledge alert',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Resolve an alert
   * POST /api/v1/manufacturing-orders/alerts/:alertId/resolve
   */
  async resolveAlert(req, res) {
    try {
      const { alertId } = req.params;
      const alertIdNum = parseInt(alertId);

      if (isNaN(alertIdNum)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid alert ID'
        });
      }

      const { resolution_notes } = req.body;
      const resolvedBy = req.user.id;

      const updatedAlert = await moAlertService.resolveAlert(alertIdNum, resolvedBy, resolution_notes);

      this.logger.info('Alert resolved via API', {
        alert_id: alertIdNum,
        resolved_by: resolvedBy,
        resolution_notes,
        userId: req.user.id
      });

      res.json({
        success: true,
        message: 'Alert resolved successfully',
        data: updatedAlert
      });

    } catch (error) {
      this.logger.error('Failed to resolve alert via API', {
        error: error.message,
        alertId: req.params.alertId,
        userId: req.user?.id
      });

      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to resolve alert',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Create a manual alert
   * POST /api/v1/manufacturing-orders/:id/alerts
   */
  async createAlert(req, res) {
    try {
      const { id } = req.params;
      const moId = parseInt(id);

      if (isNaN(moId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manufacturing order ID'
        });
      }

      const alertData = {
        mo_id: moId,
        ...req.body
      };

      const newAlert = await moAlertService.createAlert(alertData);

      this.logger.info('Manual alert created via API', {
        alert_id: newAlert.id,
        mo_id: moId,
        alert_type: newAlert.alert_type,
        severity: newAlert.severity,
        userId: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Alert created successfully',
        data: newAlert
      });

    } catch (error) {
      this.logger.error('Failed to create alert via API', {
        error: error.message,
        moId: req.params.id,
        alertData: req.body,
        userId: req.user?.id
      });

      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create alert',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get alert statistics
   * GET /api/v1/manufacturing-orders/alerts/statistics
   */
  async getAlertStatistics(req, res) {
    try {
      const statistics = await moAlertService.getAlertStatistics();

      res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      this.logger.error('Failed to get alert statistics via API', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve alert statistics',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get progress tracking service statistics
   * GET /api/v1/manufacturing-orders/progress/statistics
   */
  async getProgressTrackingStats(req, res) {
    try {
      const stats = moProgressTrackingService.getProgressTrackingStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      this.logger.error('Failed to get progress tracking stats via API', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve progress tracking statistics',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Clear progress cache for a specific MO
   * DELETE /api/v1/manufacturing-orders/:id/progress/cache
   */
  async clearProgressCache(req, res) {
    try {
      const { id } = req.params;
      const moId = parseInt(id);

      if (isNaN(moId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manufacturing order ID'
        });
      }

      moProgressTrackingService.clearProgressCache(moId);

      this.logger.info('Progress cache cleared via API', {
        moId,
        userId: req.user.id
      });

      res.json({
        success: true,
        message: 'Progress cache cleared successfully'
      });

    } catch (error) {
      this.logger.error('Failed to clear progress cache via API', {
        error: error.message,
        moId: req.params.id,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to clear progress cache',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

export default new MOProgressController();
