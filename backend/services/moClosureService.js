// Manufacturing Order Closure Service
// Automatic MO completion, validation, and finalization processes

import db from '../config/database.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { getEventWebSocket } from './eventWebSocket.js';
import moProgressTrackingService from './moProgressTrackingService.js';
import moAlertService from './moAlertService.js';

class MOClosureService {
  constructor() {
    this.logger = manufacturingLogger;
    this.closureRules = {
      // Minimum completion percentage to allow closure
      minCompletionPercentage: 95,
      // Maximum failure rate to allow closure
      maxFailureRate: 15,
      // Minimum panels required for closure
      minPanelsForClosure: 1,
      // Maximum time since last panel completion (hours)
      maxIdleTimeHours: 24,
      // Require all pallets to be finalized
      requirePalletFinalization: true
    };
    this.closureValidationChecks = [
      'validatePanelCompletion',
      'validateFailureRate',
      'validatePalletStatus',
      'validateQualityStandards',
      'validateDocumentation'
    ];
  }

  /**
   * Check if a manufacturing order is ready for automatic closure
   * @param {number} moId - Manufacturing order ID
   * @returns {Promise<Object>} Closure readiness assessment
   */
  async assessClosureReadiness(moId) {
    try {
      const assessment = {
        mo_id: moId,
        is_ready: false,
        readiness_score: 0,
        checks: {},
        blockers: [],
        recommendations: [],
        final_statistics: null
      };

      // Get current progress data
      const progressData = await moProgressTrackingService.calculateMOProgress(moId);
      assessment.final_statistics = progressData;

      // Run all validation checks
      for (const checkName of this.closureValidationChecks) {
        const checkResult = await this[checkName](moId, progressData);
        assessment.checks[checkName] = checkResult;
        
        if (checkResult.passed) {
          assessment.readiness_score += checkResult.weight || 1;
        } else {
          assessment.blockers.push({
            check: checkName,
            reason: checkResult.reason,
            severity: checkResult.severity || 'warning'
          });
        }
      }

      // Calculate readiness percentage
      const totalWeight = this.closureValidationChecks.length;
      assessment.readiness_percentage = (assessment.readiness_score / totalWeight) * 100;

      // Determine if ready for closure
      assessment.is_ready = assessment.readiness_percentage >= 80 && assessment.blockers.length === 0;

      // Generate recommendations
      assessment.recommendations = this.generateClosureRecommendations(assessment);

      this.logger.info('MO closure readiness assessed', {
        moId,
        is_ready: assessment.is_ready,
        readiness_percentage: assessment.readiness_percentage,
        blockers_count: assessment.blockers.length
      });

      return assessment;

    } catch (error) {
      this.logger.error('Failed to assess MO closure readiness', {
        error: error.message,
        moId
      });
      throw error;
    }
  }

  /**
   * Validate panel completion status
   * @param {number} moId - Manufacturing order ID
   * @param {Object} progressData - Progress data
   * @returns {Promise<Object>} Validation result
   */
  async validatePanelCompletion(moId, progressData) {
    try {
      const { completed_panels, failed_panels, target_quantity, in_progress_panels } = progressData;
      const totalProcessed = completed_panels + failed_panels;
      const completionPercentage = (totalProcessed / target_quantity) * 100;

      // Check if minimum completion percentage is met
      if (completionPercentage < this.closureRules.minCompletionPercentage) {
        return {
          passed: false,
          reason: `Completion percentage (${completionPercentage.toFixed(1)}%) below minimum threshold (${this.closureRules.minCompletionPercentage}%)`,
          severity: 'critical',
          weight: 2,
          details: {
            completed_panels,
            failed_panels,
            target_quantity,
            completion_percentage: completionPercentage
          }
        };
      }

      // Check if there are panels still in progress
      if (in_progress_panels > 0) {
        return {
          passed: false,
          reason: `${in_progress_panels} panels still in progress`,
          severity: 'warning',
          weight: 1,
          details: { in_progress_panels }
        };
      }

      return {
        passed: true,
        reason: 'Panel completion requirements met',
        weight: 2,
        details: {
          completed_panels,
          failed_panels,
          completion_percentage: completionPercentage
        }
      };

    } catch (error) {
      this.logger.error('Failed to validate panel completion', {
        error: error.message,
        moId
      });
      return {
        passed: false,
        reason: 'Error validating panel completion',
        severity: 'critical',
        weight: 2
      };
    }
  }

  /**
   * Validate failure rate
   * @param {number} moId - Manufacturing order ID
   * @param {Object} progressData - Progress data
   * @returns {Promise<Object>} Validation result
   */
  async validateFailureRate(moId, progressData) {
    try {
      const { failure_rate, completed_panels, failed_panels } = progressData;

      // Check if failure rate is within acceptable limits
      if (failure_rate > this.closureRules.maxFailureRate) {
        return {
          passed: false,
          reason: `Failure rate (${failure_rate}%) exceeds maximum threshold (${this.closureRules.maxFailureRate}%)`,
          severity: 'critical',
          weight: 2,
          details: {
            failure_rate,
            completed_panels,
            failed_panels
          }
        };
      }

      return {
        passed: true,
        reason: 'Failure rate within acceptable limits',
        weight: 1,
        details: { failure_rate }
      };

    } catch (error) {
      this.logger.error('Failed to validate failure rate', {
        error: error.message,
        moId
      });
      return {
        passed: false,
        reason: 'Error validating failure rate',
        severity: 'critical',
        weight: 1
      };
    }
  }

  /**
   * Validate pallet status and finalization
   * @param {number} moId - Manufacturing order ID
   * @param {Object} progressData - Progress data
   * @returns {Promise<Object>} Validation result
   */
  async validatePalletStatus(moId, progressData) {
    try {
      if (!this.closureRules.requirePalletFinalization) {
        return {
          passed: true,
          reason: 'Pallet finalization not required',
          weight: 1
        };
      }

      // Get pallet information for this MO
      const palletQuery = `
        SELECT 
          COUNT(*) as total_pallets,
          COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as closed_pallets,
          COUNT(CASE WHEN status = 'SHIPPED' THEN 1 END) as shipped_pallets,
          COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_pallets,
          COUNT(CASE WHEN status = 'FULL' THEN 1 END) as full_pallets
        FROM pallets 
        WHERE mo_id = $1
      `;

      const palletResult = await db.query(palletQuery, [moId]);
      const palletStats = palletResult.rows[0];

      // Check if there are open or full pallets
      if (palletStats.open_pallets > 0 || palletStats.full_pallets > 0) {
        return {
          passed: false,
          reason: `${palletStats.open_pallets + palletStats.full_pallets} pallets not finalized`,
          severity: 'warning',
          weight: 1,
          details: palletStats
        };
      }

      // Check if all pallets are closed or shipped
      const totalPallets = palletStats.total_pallets;
      const finalizedPallets = palletStats.closed_pallets + palletStats.shipped_pallets;

      if (totalPallets > 0 && finalizedPallets < totalPallets) {
        return {
          passed: false,
          reason: `Only ${finalizedPallets}/${totalPallets} pallets finalized`,
          severity: 'warning',
          weight: 1,
          details: palletStats
        };
      }

      return {
        passed: true,
        reason: 'All pallets properly finalized',
        weight: 1,
        details: palletStats
      };

    } catch (error) {
      this.logger.error('Failed to validate pallet status', {
        error: error.message,
        moId
      });
      return {
        passed: false,
        reason: 'Error validating pallet status',
        severity: 'critical',
        weight: 1
      };
    }
  }

  /**
   * Validate quality standards
   * @param {number} moId - Manufacturing order ID
   * @param {Object} progressData - Progress data
   * @returns {Promise<Object>} Validation result
   */
  async validateQualityStandards(moId, progressData) {
    try {
      // Get quality metrics for completed panels
      const qualityQuery = `
        SELECT 
          COUNT(*) as total_completed,
          AVG(wattage_pmax) as avg_wattage,
          MIN(wattage_pmax) as min_wattage,
          MAX(wattage_pmax) as max_wattage,
          STDDEV(wattage_pmax) as wattage_stddev,
          COUNT(CASE WHEN wattage_pmax IS NULL THEN 1 END) as missing_wattage
        FROM panels 
        WHERE manufacturing_order_id = $1 AND status = 'COMPLETED'
      `;

      const qualityResult = await db.query(qualityQuery, [moId]);
      const qualityStats = qualityResult.rows[0];

      // Check for missing electrical data
      if (qualityStats.missing_wattage > 0) {
        return {
          passed: false,
          reason: `${qualityStats.missing_wattage} completed panels missing electrical data`,
          severity: 'critical',
          weight: 2,
          details: qualityStats
        };
      }

      // Check for reasonable wattage values (basic validation)
      if (qualityStats.avg_wattage < 100 || qualityStats.avg_wattage > 1000) {
        return {
          passed: false,
          reason: `Average wattage (${qualityStats.avg_wattage?.toFixed(1)}W) outside expected range`,
          severity: 'warning',
          weight: 1,
          details: qualityStats
        };
      }

      return {
        passed: true,
        reason: 'Quality standards met',
        weight: 1,
        details: qualityStats
      };

    } catch (error) {
      this.logger.error('Failed to validate quality standards', {
        error: error.message,
        moId
      });
      return {
        passed: false,
        reason: 'Error validating quality standards',
        severity: 'critical',
        weight: 1
      };
    }
  }

  /**
   * Validate documentation completeness
   * @param {number} moId - Manufacturing order ID
   * @param {Object} progressData - Progress data
   * @returns {Promise<Object>} Validation result
   */
  async validateDocumentation(moId, progressData) {
    try {
      // Get MO information
      const moQuery = `
        SELECT 
          customer_name,
          customer_po,
          notes,
          estimated_completion_date
        FROM manufacturing_orders 
        WHERE id = $1
      `;

      const moResult = await db.query(moQuery, [moId]);
      const moData = moResult.rows[0];

      const missingFields = [];
      
      // Check for required documentation
      if (!moData.customer_name) missingFields.push('customer_name');
      if (!moData.customer_po) missingFields.push('customer_po');
      if (!moData.notes) missingFields.push('notes');

      if (missingFields.length > 0) {
        return {
          passed: false,
          reason: `Missing documentation: ${missingFields.join(', ')}`,
          severity: 'warning',
          weight: 1,
          details: { missing_fields: missingFields }
        };
      }

      return {
        passed: true,
        reason: 'Documentation complete',
        weight: 1,
        details: moData
      };

    } catch (error) {
      this.logger.error('Failed to validate documentation', {
        error: error.message,
        moId
      });
      return {
        passed: false,
        reason: 'Error validating documentation',
        severity: 'critical',
        weight: 1
      };
    }
  }

  /**
   * Generate closure recommendations
   * @param {Object} assessment - Closure readiness assessment
   * @returns {Array} Array of recommendations
   */
  generateClosureRecommendations(assessment) {
    const recommendations = [];

    // Add recommendations based on blockers
    for (const blocker of assessment.blockers) {
      switch (blocker.check) {
        case 'validatePanelCompletion':
          recommendations.push({
            type: 'action_required',
            priority: 'high',
            message: 'Complete remaining panels or adjust completion threshold',
            details: blocker.reason
          });
          break;

        case 'validateFailureRate':
          recommendations.push({
            type: 'quality_review',
            priority: 'high',
            message: 'Review failure causes and quality processes',
            details: blocker.reason
          });
          break;

        case 'validatePalletStatus':
          recommendations.push({
            type: 'action_required',
            priority: 'medium',
            message: 'Finalize all pallets before closure',
            details: blocker.reason
          });
          break;

        case 'validateQualityStandards':
          recommendations.push({
            type: 'data_completion',
            priority: 'high',
            message: 'Complete missing electrical data for panels',
            details: blocker.reason
          });
          break;

        case 'validateDocumentation':
          recommendations.push({
            type: 'documentation',
            priority: 'low',
            message: 'Complete missing documentation fields',
            details: blocker.reason
          });
          break;
      }
    }

    // Add general recommendations
    if (assessment.is_ready) {
      recommendations.push({
        type: 'ready_for_closure',
        priority: 'info',
        message: 'Manufacturing order is ready for automatic closure',
        details: `Readiness score: ${assessment.readiness_percentage.toFixed(1)}%`
      });
    } else {
      recommendations.push({
        type: 'not_ready',
        priority: 'info',
        message: 'Manufacturing order requires additional work before closure',
        details: `${assessment.blockers.length} blockers must be resolved`
      });
    }

    return recommendations;
  }

  /**
   * Execute automatic MO closure
   * @param {number} moId - Manufacturing order ID
   * @param {string} closedBy - User ID who initiated closure
   * @param {Object} options - Closure options
   * @returns {Promise<Object>} Closure result
   */
  async executeAutomaticClosure(moId, closedBy, options = {}) {
    try {
      const {
        force = false,
        skipValidation = false,
        generateReport = true,
        finalizePallets = true
      } = options;

      // Assess closure readiness unless skipped
      let assessment = null;
      if (!skipValidation) {
        assessment = await this.assessClosureReadiness(moId);
        
        if (!assessment.is_ready && !force) {
          throw new Error(`MO not ready for closure: ${assessment.blockers.map(b => b.reason).join(', ')}`);
        }
      }

      // Start transaction for atomic closure
      await db.query('BEGIN');

      try {
        // Get final progress data
        const finalProgress = await moProgressTrackingService.calculateMOProgress(moId);
        
        // Update MO status to COMPLETED
        const updateQuery = `
          UPDATE manufacturing_orders 
          SET 
            status = 'COMPLETED',
            completed_at = CURRENT_TIMESTAMP,
            actual_completion_date = CURRENT_DATE,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND status != 'COMPLETED'
          RETURNING *
        `;

        const updateResult = await db.query(updateQuery, [moId]);
        
        if (updateResult.rows.length === 0) {
          throw new Error('Manufacturing order not found or already completed');
        }

        const completedMO = updateResult.rows[0];

        // Finalize pallets if requested
        let palletFinalization = null;
        if (finalizePallets) {
          palletFinalization = await this.finalizeRemainingPallets(moId, closedBy);
        }

        // Generate completion report if requested
        let completionReport = null;
        if (generateReport) {
          completionReport = await this.generateCompletionReport(moId, finalProgress);
        }

        // Create closure audit record
        const auditRecord = await this.createClosureAuditRecord(moId, closedBy, {
          assessment,
          finalProgress,
          palletFinalization,
          completionReport,
          options
        });

        // Commit transaction
        await db.query('COMMIT');

        // Send closure notifications
        await this.sendClosureNotifications(moId, completedMO, finalProgress);

        // Broadcast closure event
        await this.broadcastClosureEvent(moId, completedMO, finalProgress);

        const closureResult = {
          success: true,
          mo_id: moId,
          order_number: completedMO.order_number,
          completed_at: completedMO.completed_at,
          final_statistics: finalProgress,
          assessment,
          pallet_finalization: palletFinalization,
          completion_report: completionReport,
          audit_record: auditRecord
        };

        this.logger.info('MO automatically closed', {
          moId,
          order_number: completedMO.order_number,
          closed_by: closedBy,
          final_progress: finalProgress.progress_percentage,
          pallets_finalized: palletFinalization?.finalized_count || 0
        });

        return closureResult;

      } catch (error) {
        // Rollback transaction on error
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      this.logger.error('Failed to execute automatic MO closure', {
        error: error.message,
        moId,
        closedBy,
        options
      });
      throw error;
    }
  }

  /**
   * Finalize remaining pallets for the MO
   * @param {number} moId - Manufacturing order ID
   * @param {string} finalizedBy - User ID who finalized pallets
   * @returns {Promise<Object>} Finalization result
   */
  async finalizeRemainingPallets(moId, finalizedBy) {
    try {
      // Get pallets that need finalization
      const palletQuery = `
        SELECT id, pallet_number, status, current_panel_count
        FROM pallets 
        WHERE mo_id = $1 AND status IN ('OPEN', 'FULL')
      `;

      const palletResult = await db.query(palletQuery, [moId]);
      const palletsToFinalize = palletResult.rows;

      const finalizationResult = {
        total_pallets: palletsToFinalize.length,
        finalized_count: 0,
        finalized_pallets: [],
        errors: []
      };

      for (const pallet of palletsToFinalize) {
        try {
          // Update pallet status to CLOSED
          const finalizeQuery = `
            UPDATE pallets 
            SET 
              status = 'CLOSED',
              completed_at = CURRENT_TIMESTAMP,
              completed_by = $1,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
          `;

          const finalizeResult = await db.query(finalizeQuery, [finalizedBy, pallet.id]);
          const finalizedPallet = finalizeResult.rows[0];

          finalizationResult.finalized_count++;
          finalizationResult.finalized_pallets.push({
            id: finalizedPallet.id,
            pallet_number: finalizedPallet.pallet_number,
            panel_count: finalizedPallet.current_panel_count
          });

        } catch (error) {
          finalizationResult.errors.push({
            pallet_id: pallet.id,
            pallet_number: pallet.pallet_number,
            error: error.message
          });
        }
      }

      this.logger.info('Pallets finalized for MO closure', {
        moId,
        finalized_count: finalizationResult.finalized_count,
        total_pallets: finalizationResult.total_pallets,
        errors: finalizationResult.errors.length
      });

      return finalizationResult;

    } catch (error) {
      this.logger.error('Failed to finalize pallets', {
        error: error.message,
        moId,
        finalizedBy
      });
      throw error;
    }
  }

  /**
   * Generate completion report for the MO
   * @param {number} moId - Manufacturing order ID
   * @param {Object} finalProgress - Final progress data
   * @returns {Promise<Object>} Completion report
   */
  async generateCompletionReport(moId, finalProgress) {
    try {
      // Get detailed statistics
      const statsQuery = `
        SELECT 
          mo.*,
          COUNT(p.id) as total_panels,
          COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END) as completed_panels,
          COUNT(CASE WHEN p.status = 'FAILED' THEN 1 END) as failed_panels,
          COUNT(CASE WHEN p.status = 'REWORK' THEN 1 END) as rework_panels,
          AVG(p.wattage_pmax) as avg_wattage,
          MIN(p.wattage_pmax) as min_wattage,
          MAX(p.wattage_pmax) as max_wattage,
          STDDEV(p.wattage_pmax) as wattage_stddev
        FROM manufacturing_orders mo
        LEFT JOIN panels p ON mo.id = p.manufacturing_order_id
        WHERE mo.id = $1
        GROUP BY mo.id
      `;

      const statsResult = await db.query(statsQuery, [moId]);
      const moStats = statsResult.rows[0];

      // Get pallet information
      const palletQuery = `
        SELECT 
          COUNT(*) as total_pallets,
          COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as closed_pallets,
          COUNT(CASE WHEN status = 'SHIPPED' THEN 1 END) as shipped_pallets,
          SUM(current_panel_count) as total_panels_in_pallets
        FROM pallets 
        WHERE mo_id = $1
      `;

      const palletResult = await db.query(palletQuery, [moId]);
      const palletStats = palletResult.rows[0];

      const completionReport = {
        mo_id: moId,
        order_number: moStats.order_number,
        generated_at: new Date().toISOString(),
        summary: {
          target_quantity: moStats.target_quantity,
          completed_panels: moStats.completed_panels,
          failed_panels: moStats.failed_panels,
          rework_panels: moStats.rework_panels,
          completion_percentage: finalProgress.progress_percentage,
          failure_rate: finalProgress.failure_rate
        },
        quality_metrics: {
          avg_wattage: moStats.avg_wattage,
          min_wattage: moStats.min_wattage,
          max_wattage: moStats.max_wattage,
          wattage_stddev: moStats.wattage_stddev
        },
        pallet_summary: palletStats,
        performance_metrics: finalProgress.performance_metrics,
        timeline: {
          created_at: moStats.created_at,
          started_at: moStats.started_at,
          completed_at: moStats.completed_at,
          total_duration_hours: moStats.started_at ? 
            (new Date(moStats.completed_at) - new Date(moStats.started_at)) / (1000 * 60 * 60) : null
        }
      };

      this.logger.info('Completion report generated', {
        moId,
        order_number: moStats.order_number,
        completion_percentage: finalProgress.progress_percentage
      });

      return completionReport;

    } catch (error) {
      this.logger.error('Failed to generate completion report', {
        error: error.message,
        moId
      });
      throw error;
    }
  }

  /**
   * Create closure audit record
   * @param {number} moId - Manufacturing order ID
   * @param {string} closedBy - User ID who closed the MO
   * @param {Object} closureData - Closure data
   * @returns {Promise<Object>} Audit record
   */
  async createClosureAuditRecord(moId, closedBy, closureData) {
    try {
      const auditQuery = `
        INSERT INTO mo_closure_audit (
          mo_id,
          closed_by,
          closure_type,
          assessment_data,
          final_statistics,
          pallet_finalization,
          completion_report,
          closure_options,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const values = [
        moId,
        closedBy,
        'AUTOMATIC',
        JSON.stringify(closureData.assessment),
        JSON.stringify(closureData.finalProgress),
        JSON.stringify(closureData.palletFinalization),
        JSON.stringify(closureData.completionReport),
        JSON.stringify(closureData.options)
      ];

      const result = await db.query(auditQuery, values);
      return result.rows[0];

    } catch (error) {
      this.logger.error('Failed to create closure audit record', {
        error: error.message,
        moId,
        closedBy
      });
      throw error;
    }
  }

  /**
   * Send closure notifications
   * @param {number} moId - Manufacturing order ID
   * @param {Object} completedMO - Completed MO data
   * @param {Object} finalProgress - Final progress data
   */
  async sendClosureNotifications(moId, completedMO, finalProgress) {
    try {
      // Create closure alert
      await moAlertService.createAlert({
        mo_id: moId,
        alert_type: 'mo_completed',
        severity: 'info',
        title: `MO ${completedMO.order_number} Completed`,
        message: `Manufacturing order ${completedMO.order_number} has been automatically completed with ${finalProgress.progress_percentage}% completion rate`,
        threshold_value: null,
        current_value: finalProgress.progress_percentage
      });

      this.logger.info('Closure notifications sent', {
        moId,
        order_number: completedMO.order_number
      });

    } catch (error) {
      this.logger.error('Failed to send closure notifications', {
        error: error.message,
        moId
      });
    }
  }

  /**
   * Broadcast closure event via WebSocket
   * @param {number} moId - Manufacturing order ID
   * @param {Object} completedMO - Completed MO data
   * @param {Object} finalProgress - Final progress data
   */
  async broadcastClosureEvent(moId, completedMO, finalProgress) {
    try {
      const eventWebSocket = getEventWebSocket();
      if (eventWebSocket) {
        const event = {
          id: `mo_closure_${moId}_${Date.now()}`,
          eventType: 'MO_CLOSURE',
          timestamp: new Date().toISOString(),
          severity: 'info',
          eventData: {
            mo_id: moId,
            order_number: completedMO.order_number,
            completion_percentage: finalProgress.progress_percentage,
            completed_at: completedMO.completed_at
          },
          context: {
            manufacturing_order_id: moId,
            order_number: completedMO.order_number
          },
          metadata: {
            final_statistics: finalProgress
          }
        };

        eventWebSocket.broadcastEvent(event);
      }

    } catch (error) {
      this.logger.error('Failed to broadcast closure event', {
        error: error.message,
        moId
      });
    }
  }

  /**
   * Rollback MO closure (for incorrect closures)
   * @param {number} moId - Manufacturing order ID
   * @param {string} rolledBackBy - User ID who rolled back
   * @param {string} reason - Reason for rollback
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackClosure(moId, rolledBackBy, reason) {
    try {
      await db.query('BEGIN');

      try {
        // Update MO status back to ACTIVE
        const rollbackQuery = `
          UPDATE manufacturing_orders 
          SET 
            status = 'ACTIVE',
            completed_at = NULL,
            actual_completion_date = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND status = 'COMPLETED'
          RETURNING *
        `;

        const rollbackResult = await db.query(rollbackQuery, [moId]);
        
        if (rollbackResult.rows.length === 0) {
          throw new Error('Manufacturing order not found or not completed');
        }

        const rolledBackMO = rollbackResult.rows[0];

        // Create rollback audit record
        const auditQuery = `
          INSERT INTO mo_closure_audit (
            mo_id,
            closed_by,
            closure_type,
            assessment_data,
            created_at
          ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
          RETURNING *
        `;

        const auditResult = await db.query(auditQuery, [
          moId,
          rolledBackBy,
          'ROLLBACK',
          JSON.stringify({ reason, rolled_back_at: new Date().toISOString() })
        ]);

        await db.query('COMMIT');

        this.logger.info('MO closure rolled back', {
          moId,
          order_number: rolledBackMO.order_number,
          rolled_back_by: rolledBackBy,
          reason
        });

        return {
          success: true,
          mo_id: moId,
          order_number: rolledBackMO.order_number,
          rolled_back_at: new Date().toISOString(),
          audit_record: auditResult.rows[0]
        };

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      this.logger.error('Failed to rollback MO closure', {
        error: error.message,
        moId,
        rolledBackBy,
        reason
      });
      throw error;
    }
  }

  /**
   * Get closure audit history for a MO
   * @param {number} moId - Manufacturing order ID
   * @returns {Promise<Array>} Audit history
   */
  async getClosureAuditHistory(moId) {
    try {
      const query = `
        SELECT 
          a.*,
          u.username as closed_by_username
        FROM mo_closure_audit a
        LEFT JOIN users u ON a.closed_by = u.id
        WHERE a.mo_id = $1
        ORDER BY a.created_at DESC
      `;

      const result = await db.query(query, [moId]);
      return result.rows;

    } catch (error) {
      this.logger.error('Failed to get closure audit history', {
        error: error.message,
        moId
      });
      throw error;
    }
  }

  /**
   * Update closure rules configuration
   * @param {Object} newRules - New closure rules
   */
  updateClosureRules(newRules) {
    this.closureRules = { ...this.closureRules, ...newRules };
    
    this.logger.info('Closure rules updated', {
      new_rules: newRules
    });
  }

  /**
   * Get current closure rules
   * @returns {Object} Current closure rules
   */
  getClosureRules() {
    return { ...this.closureRules };
  }
}

export default new MOClosureService();
