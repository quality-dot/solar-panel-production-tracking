// Manufacturing Order Closure Controller
// API endpoints for automatic MO closure operations

import moClosureService from '../../services/moClosureService.js';
import { manufacturingLogger } from '../../middleware/logger.js';

class MOClosureController {
  constructor() {
    this.logger = manufacturingLogger;
  }

  /**
   * Assess MO closure readiness
   * GET /api/v1/manufacturing-orders/:id/closure/assess
   */
  async assessClosureReadiness(req, res) {
    try {
      const { id } = req.params;
      const moId = parseInt(id);

      if (isNaN(moId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manufacturing order ID'
        });
      }

      const assessment = await moClosureService.assessClosureReadiness(moId);

      this.logger.info('MO closure readiness assessed via API', {
        moId,
        is_ready: assessment.is_ready,
        readiness_percentage: assessment.readiness_percentage,
        blockers_count: assessment.blockers.length,
        userId: req.user?.id
      });

      res.json({
        success: true,
        data: assessment
      });

    } catch (error) {
      this.logger.error('Failed to assess MO closure readiness via API', {
        error: error.message,
        moId: req.params.id,
        userId: req.user?.id
      });

      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to assess closure readiness',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Execute automatic MO closure
   * POST /api/v1/manufacturing-orders/:id/closure/execute
   */
  async executeAutomaticClosure(req, res) {
    try {
      const { id } = req.params;
      const moId = parseInt(id);

      if (isNaN(moId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manufacturing order ID'
        });
      }

      const {
        force = false,
        skipValidation = false,
        generateReport = true,
        finalizePallets = true
      } = req.body;

      const closedBy = req.user.id;

      const closureResult = await moClosureService.executeAutomaticClosure(moId, closedBy, {
        force,
        skipValidation,
        generateReport,
        finalizePallets
      });

      this.logger.info('MO automatically closed via API', {
        moId,
        order_number: closureResult.order_number,
        closed_by: closedBy,
        final_progress: closureResult.final_statistics.progress_percentage,
        pallets_finalized: closureResult.pallet_finalization?.finalized_count || 0
      });

      res.json({
        success: true,
        message: 'Manufacturing order closed successfully',
        data: closureResult
      });

    } catch (error) {
      this.logger.error('Failed to execute automatic MO closure via API', {
        error: error.message,
        moId: req.params.id,
        userId: req.user?.id
      });

      const statusCode = error.message.includes('not ready') ? 400 : 
                        error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to execute automatic closure',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Rollback MO closure
   * POST /api/v1/manufacturing-orders/:id/closure/rollback
   */
  async rollbackClosure(req, res) {
    try {
      const { id } = req.params;
      const moId = parseInt(id);

      if (isNaN(moId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manufacturing order ID'
        });
      }

      const { reason } = req.body;
      const rolledBackBy = req.user.id;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Rollback reason is required'
        });
      }

      const rollbackResult = await moClosureService.rollbackClosure(moId, rolledBackBy, reason);

      this.logger.info('MO closure rolled back via API', {
        moId,
        order_number: rollbackResult.order_number,
        rolled_back_by: rolledBackBy,
        reason
      });

      res.json({
        success: true,
        message: 'Manufacturing order closure rolled back successfully',
        data: rollbackResult
      });

    } catch (error) {
      this.logger.error('Failed to rollback MO closure via API', {
        error: error.message,
        moId: req.params.id,
        userId: req.user?.id
      });

      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('not completed') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to rollback closure',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get closure audit history for a MO
   * GET /api/v1/manufacturing-orders/:id/closure/audit
   */
  async getClosureAuditHistory(req, res) {
    try {
      const { id } = req.params;
      const moId = parseInt(id);

      if (isNaN(moId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manufacturing order ID'
        });
      }

      const auditHistory = await moClosureService.getClosureAuditHistory(moId);

      res.json({
        success: true,
        data: auditHistory,
        meta: {
          count: auditHistory.length
        }
      });

    } catch (error) {
      this.logger.error('Failed to get closure audit history via API', {
        error: error.message,
        moId: req.params.id,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve closure audit history',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Update closure rules configuration
   * PUT /api/v1/manufacturing-orders/closure/rules
   */
  async updateClosureRules(req, res) {
    try {
      const newRules = req.body;

      // Validate rules structure
      const validRuleKeys = [
        'minCompletionPercentage',
        'maxFailureRate',
        'minPanelsForClosure',
        'maxIdleTimeHours',
        'requirePalletFinalization'
      ];

      const invalidKeys = Object.keys(newRules).filter(key => !validRuleKeys.includes(key));
      if (invalidKeys.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid rule keys: ${invalidKeys.join(', ')}`
        });
      }

      moClosureService.updateClosureRules(newRules);
      const currentRules = moClosureService.getClosureRules();

      this.logger.info('Closure rules updated via API', {
        new_rules: newRules,
        updated_by: req.user.id
      });

      res.json({
        success: true,
        message: 'Closure rules updated successfully',
        data: currentRules
      });

    } catch (error) {
      this.logger.error('Failed to update closure rules via API', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update closure rules',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get current closure rules configuration
   * GET /api/v1/manufacturing-orders/closure/rules
   */
  async getClosureRules(req, res) {
    try {
      const rules = moClosureService.getClosureRules();

      res.json({
        success: true,
        data: rules
      });

    } catch (error) {
      this.logger.error('Failed to get closure rules via API', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve closure rules',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get closure statistics
   * GET /api/v1/manufacturing-orders/closure/statistics
   */
  async getClosureStatistics(req, res) {
    try {
      const { days = 30 } = req.query;
      const daysInt = parseInt(days);

      if (isNaN(daysInt) || daysInt < 1 || daysInt > 365) {
        return res.status(400).json({
          success: false,
          message: 'Days parameter must be between 1 and 365'
        });
      }

      // Get closure statistics from database
      const statsQuery = `
        SELECT 
          COUNT(*) as total_closures,
          COUNT(CASE WHEN closure_type = 'AUTOMATIC' THEN 1 END) as automatic_closures,
          COUNT(CASE WHEN closure_type = 'MANUAL' THEN 1 END) as manual_closures,
          COUNT(CASE WHEN closure_type = 'ROLLBACK' THEN 1 END) as rollbacks,
          COUNT(DISTINCT mo_id) as unique_mos_closed,
          AVG(EXTRACT(EPOCH FROM (created_at - (final_statistics->>'created_at')::timestamp))/3600) as avg_closure_time_hours
        FROM mo_closure_audit 
        WHERE created_at >= CURRENT_DATE - INTERVAL '${daysInt} days'
          AND closure_type != 'ROLLBACK'
      `;

      const db = await import('../../config/database.js');
      const result = await db.default.query(statsQuery);
      const statistics = result.rows[0];

      // Get recent closure trends
      const trendsQuery = `
        SELECT 
          DATE_TRUNC('day', created_at) as closure_date,
          COUNT(*) as closures_count,
          COUNT(CASE WHEN closure_type = 'AUTOMATIC' THEN 1 END) as automatic_count,
          COUNT(CASE WHEN closure_type = 'MANUAL' THEN 1 END) as manual_count
        FROM mo_closure_audit 
        WHERE created_at >= CURRENT_DATE - INTERVAL '${daysInt} days'
          AND closure_type != 'ROLLBACK'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY closure_date DESC
        LIMIT 30
      `;

      const trendsResult = await db.default.query(trendsQuery);
      const trends = trendsResult.rows;

      const responseData = {
        period_days: daysInt,
        summary: statistics,
        trends: trends,
        generated_at: new Date().toISOString()
      };

      res.json({
        success: true,
        data: responseData
      });

    } catch (error) {
      this.logger.error('Failed to get closure statistics via API', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve closure statistics',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

export default new MOClosureController();
