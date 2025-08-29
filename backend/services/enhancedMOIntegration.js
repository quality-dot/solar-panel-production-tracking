// Enhanced Manufacturing Order Integration Service
// Adds automatic progress tracking and real-time updates to barcode processing

import { manufacturingOrderService, MOServiceError } from './manufacturingOrderService.js';
import { panelService } from './panelService.js';
import { ManufacturingLogger } from '../middleware/logger.js';
import { metricsService } from './metricsService.js';

const logger = new ManufacturingLogger('EnhancedMOIntegration');

/**
 * Enhanced MO Integration Service
 * Provides automatic progress tracking and real-time updates
 */
export class EnhancedMOIntegrationService {
  constructor() {
    this.moService = manufacturingOrderService;
    this.panelService = panelService;
  }

  /**
   * Process barcode with automatic MO progress tracking
   * This is the main integration point for production floor operations
   */
  async processBarcodeWithAutoTracking(barcode, moId, metadata = {}) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting enhanced barcode processing with MO tracking', {
        barcode: barcode.substring(0, 10) + '...',
        moId,
        stationId: metadata.stationId,
        userId: metadata.userId
      });

      // Step 1: Validate barcode against MO
      const validation = await this.moService.validateBarcodeAgainstMO(barcode, moId);
      
      if (!validation.isValid) {
        throw new MOServiceError(
          'Barcode validation failed',
          'VALIDATION_FAILED',
          validation
        );
      }

      const mo = validation.manufacturingOrder;
      
      // Step 2: Create panel with MO association
      const panelData = {
        barcode,
        moId: mo.id,
        panelType: validation.barcodeResult.components.panelType,
        lineAssignment: validation.barcodeResult.lineAssignment,
        status: 'IN_PROGRESS',
        createdAt: new Date().toISOString(),
        createdBy: metadata.userId,
        stationId: metadata.stationId,
        lineNumber: metadata.lineNumber
      };

      const panel = await this.panelService.createPanel(panelData);

      // Step 3: Update MO progress automatically
      const progressUpdate = await this.updateMOProgressAutomatically(mo.id, 'PANEL_CREATED', {
        panelId: panel.id,
        barcode,
        stationId: metadata.stationId,
        userId: metadata.userId
      });

      // Step 4: Check if MO should be automatically completed
      const completionCheck = await this.checkMOCompletion(mo.id);
      
      // Step 5: Record metrics
      const processingTime = Date.now() - startTime;
      await metricsService.recordBarcodeEvent({
        barcode,
        success: true,
        processingTime,
        moId: mo.id,
        panelId: panel.id,
        stationId: metadata.stationId,
        userId: metadata.userId,
        eventType: 'PANEL_CREATED_WITH_MO'
      });

      logger.info('Enhanced barcode processing completed successfully', {
        barcode: barcode.substring(0, 10) + '...',
        moId: mo.id,
        panelId: panel.id,
        processingTime: `${processingTime}ms`
      });

      return {
        success: true,
        panel,
        manufacturingOrder: mo,
        progressUpdate,
        completionCheck,
        processedAt: new Date().toISOString()
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Record error metrics
      await metricsService.recordBarcodeEvent({
        barcode,
        success: false,
        processingTime,
        moId,
        stationId: metadata.stationId,
        userId: metadata.userId,
        errorCode: error.code || 'PROCESSING_ERROR',
        errorMessage: error.message,
        eventType: 'PANEL_CREATION_FAILED'
      });

      logger.error('Enhanced barcode processing failed', {
        barcode: barcode.substring(0, 10) + '...',
        moId,
        error: error.message,
        processingTime: `${processingTime}ms`
      });

      throw error;
    }
  }

  /**
   * Update panel status with automatic MO progress tracking
   * Called when panels pass/fail inspection
   */
  async updatePanelStatusWithMOProgress(panelId, newStatus, metadata = {}) {
    try {
      // Step 1: Update panel status
      const updatedPanel = await this.panelService.updatePanelStatus(panelId, newStatus, metadata);
      
      // Step 2: Get panel's MO information
      const panel = await this.panelService.getPanelById(panelId);
      
      if (!panel || !panel.moId) {
        throw new Error('Panel not found or not associated with MO');
      }

      // Step 3: Update MO progress automatically
      const progressUpdate = await this.updateMOProgressAutomatically(panel.moId, newStatus, {
        panelId,
        barcode: panel.barcode,
        stationId: metadata.stationId,
        userId: metadata.userId,
        inspectionResult: newStatus
      });

      // Step 4: Check if MO should be automatically completed
      const completionCheck = await this.checkMOCompletion(panel.moId);

      logger.info('Panel status updated with MO progress tracking', {
        panelId,
        moId: panel.moId,
        newStatus,
        progressUpdate,
        completionCheck
      });

      return {
        success: true,
        panel: updatedPanel,
        progressUpdate,
        completionCheck
      };

    } catch (error) {
      logger.error('Failed to update panel status with MO progress', {
        panelId,
        newStatus,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update MO progress automatically based on panel status changes
   */
  async updateMOProgressAutomatically(moId, statusChange, metadata = {}) {
    try {
      // Determine the type of progress update
      let progressType = 'PANEL_CREATED';
      
      if (statusChange === 'PASSED') {
        progressType = 'PANEL_COMPLETED';
      } else if (statusChange === 'FAILED') {
        progressType = 'PANEL_FAILED';
      } else if (statusChange === 'IN_PROGRESS') {
        progressType = 'PANEL_IN_PROGRESS';
      }

      // Update MO progress
      const progressUpdate = await this.moService.updateMOProgress(moId, progressType, metadata);

      // Log the automatic progress update
      logger.info('MO progress updated automatically', {
        moId,
        progressType,
        metadata,
        result: progressUpdate
      });

      return progressUpdate;

    } catch (error) {
      logger.error('Failed to update MO progress automatically', {
        moId,
        statusChange,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if MO should be automatically completed
   * Triggers automatic completion when target quantity is reached
   */
  async checkMOCompletion(moId) {
    try {
      const mo = await this.moService.getManufacturingOrderById(moId);
      
      if (!mo) {
        throw new Error('Manufacturing Order not found');
      }

      const totalCompleted = mo.completed_quantity + mo.failed_quantity;
      const shouldComplete = totalCompleted >= mo.target_quantity;

      if (shouldComplete && mo.status === 'ACTIVE') {
        // Automatically complete the MO
        const completionResult = await this.moService.completeManufacturingOrder(moId, {
          reason: 'AUTOMATIC_COMPLETION',
          completedBy: 'SYSTEM',
          completedAt: new Date().toISOString()
        });

        logger.info('MO automatically completed', {
          moId,
          orderNumber: mo.order_number,
          targetQuantity: mo.target_quantity,
          totalCompleted,
          completionResult
        });

        return {
          shouldComplete: true,
          automaticallyCompleted: true,
          completionResult
        };
      }

      return {
        shouldComplete,
        automaticallyCompleted: false,
        currentProgress: {
          completed: mo.completed_quantity,
          failed: mo.failed_quantity,
          total: totalCompleted,
          target: mo.target_quantity,
          remaining: mo.target_quantity - totalCompleted
        }
      };

    } catch (error) {
      logger.error('Failed to check MO completion', {
        moId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get comprehensive MO status with real-time progress
   */
  async getMOStatusWithRealTimeProgress(moId) {
    try {
      // Get MO details
      const mo = await this.moService.getManufacturingOrderById(moId);
      
      if (!mo) {
        throw new Error('Manufacturing Order not found');
      }

      // Get real-time panel counts
      const panelCounts = await this.panelService.getPanelCountsByMO(moId);
      
      // Get recent activity
      const recentActivity = await this.panelService.getRecentActivityByMO(moId, 10);
      
      // Calculate progress percentages
      const totalPanels = panelCounts.total || 0;
      const completedPanels = panelCounts.completed || 0;
      const failedPanels = panelCounts.failed || 0;
      const inProgressPanels = panelCounts.inProgress || 0;
      
      const progressPercentages = {
        completed: totalPanels > 0 ? Math.round((completedPanels / totalPanels) * 100) : 0,
        failed: totalPanels > 0 ? Math.round((failedPanels / totalPanels) * 100) : 0,
        inProgress: totalPanels > 0 ? Math.round((inProgressPanels / totalPanels) * 100) : 0,
        remaining: totalPanels > 0 ? Math.round(((mo.target_quantity - totalPanels) / mo.target_quantity) * 100) : 0
      };

      // Check completion status
      const completionCheck = await this.checkMOCompletion(moId);

      const status = {
        mo,
        panelCounts,
        progressPercentages,
        recentActivity,
        completionCheck,
        lastUpdated: new Date().toISOString()
      };

      logger.info('MO status with real-time progress retrieved', {
        moId,
        orderNumber: mo.order_number,
        progressPercentages
      });

      return status;

    } catch (error) {
      logger.error('Failed to get MO status with real-time progress', {
        moId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get MO dashboard data for production floor monitoring
   */
  async getMODashboardData() {
    try {
      // Get all active MOs
      const activeMOs = await this.moService.getActiveManufacturingOrders();
      
      // Get real-time statistics
      const dashboardData = {
        totalActiveMOs: activeMOs.length,
        totalTargetQuantity: 0,
        totalCompleted: 0,
        totalFailed: 0,
        totalInProgress: 0,
        lineBreakdown: {
          line1: { count: 0, target: 0, completed: 0 },
          line2: { count: 0, target: 0, completed: 0 }
        },
        recentActivity: [],
        alerts: []
      };

      // Process each MO
      for (const mo of activeMOs) {
        dashboardData.totalTargetQuantity += mo.target_quantity;
        dashboardData.totalCompleted += mo.completed_quantity;
        dashboardData.totalFailed += mo.failed_quantity;
        dashboardData.totalInProgress += mo.in_progress_quantity;

        // Line breakdown
        if (mo.panel_type.includes('144')) {
          dashboardData.lineBreakdown.line2.count++;
          dashboardData.lineBreakdown.line2.target += mo.target_quantity;
          dashboardData.lineBreakdown.line2.completed += mo.completed_quantity;
        } else {
          dashboardData.lineBreakdown.line1.count++;
          dashboardData.lineBreakdown.line1.target += mo.target_quantity;
          dashboardData.lineBreakdown.line1.completed += mo.completed_quantity;
        }

        // Check for alerts
        const progress = (mo.completed_quantity / mo.target_quantity) * 100;
        if (progress > 90) {
          dashboardData.alerts.push({
            type: 'NEAR_COMPLETION',
            moId: mo.id,
            orderNumber: mo.order_number,
            progress: Math.round(progress)
          });
        }
      }

      // Calculate overall progress
      dashboardData.overallProgress = dashboardData.totalTargetQuantity > 0 
        ? Math.round((dashboardData.totalCompleted / dashboardData.totalTargetQuantity) * 100)
        : 0;

      logger.info('MO dashboard data retrieved', {
        totalActiveMOs: dashboardData.totalActiveMOs,
        overallProgress: dashboardData.overallProgress
      });

      return dashboardData;

    } catch (error) {
      logger.error('Failed to get MO dashboard data', {
        error: error.message
      });
      throw error;
    }
  }
}

// Export singleton instance
export const enhancedMOIntegration = new EnhancedMOIntegrationService();

export default enhancedMOIntegration;
