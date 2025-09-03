// Historical Data Service
// Provides comprehensive access to historical manufacturing order and panel data
// Task 10.4.1 - Create Historical Data Service for MO and Panel Data Access

import db from '../config/database.js';
import { manufacturingLogger } from '../middleware/logger.js';

class HistoricalDataService {
  constructor() {
    this.logger = manufacturingLogger;
  }

  /**
   * Get historical manufacturing orders with comprehensive filtering
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @param {Object} sorting - Sorting options
   * @returns {Object} Historical MO data with metadata
   */
  async getHistoricalManufacturingOrders(filters = {}, pagination = {}, sorting = {}) {
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
        maxQuantity
      } = filters;

      const {
        page = 1,
        limit = 50,
        offset = (page - 1) * limit
      } = pagination;

      const {
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = sorting;

      // Build dynamic WHERE clause
      const whereConditions = [];
      const queryParams = [];
      let paramIndex = 1;

      if (dateFrom) {
        whereConditions.push(`mo.created_at >= $${paramIndex}`);
        queryParams.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        whereConditions.push(`mo.created_at <= $${paramIndex}`);
        queryParams.push(dateTo);
        paramIndex++;
      }

      if (status && status.length > 0) {
        whereConditions.push(`mo.status = ANY($${paramIndex})`);
        queryParams.push(status);
        paramIndex++;
      }

      if (panelType && panelType.length > 0) {
        whereConditions.push(`mo.panel_type = ANY($${paramIndex})`);
        queryParams.push(panelType);
        paramIndex++;
      }

      if (createdBy) {
        whereConditions.push(`mo.created_by = $${paramIndex}`);
        queryParams.push(createdBy);
        paramIndex++;
      }

      if (customerName) {
        whereConditions.push(`mo.customer_name ILIKE $${paramIndex}`);
        queryParams.push(`%${customerName}%`);
        paramIndex++;
      }

      if (orderNumber) {
        whereConditions.push(`mo.order_number ILIKE $${paramIndex}`);
        queryParams.push(`%${orderNumber}%`);
        paramIndex++;
      }

      if (minQuantity) {
        whereConditions.push(`mo.target_quantity >= $${paramIndex}`);
        queryParams.push(minQuantity);
        paramIndex++;
      }

      if (maxQuantity) {
        whereConditions.push(`mo.target_quantity <= $${paramIndex}`);
        queryParams.push(maxQuantity);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Main query with comprehensive data
      const mainQuery = `
        SELECT 
          mo.id,
          mo.order_number,
          mo.panel_type,
          mo.target_quantity,
          mo.completed_quantity,
          mo.failed_quantity,
          mo.in_progress_quantity,
          mo.status,
          mo.priority,
          mo.year_code,
          mo.frame_type,
          mo.backsheet_type,
          mo.created_by,
          mo.created_at,
          mo.updated_at,
          mo.started_at,
          mo.completed_at,
          mo.customer_name,
          mo.customer_po,
          mo.notes,
          mo.estimated_completion_date,
          mo.actual_completion_date,
          
          -- User information
          u.username as created_by_username,
          u.email as created_by_email,
          
          -- Calculated metrics
          CASE 
            WHEN mo.target_quantity > 0 THEN 
              ROUND((mo.completed_quantity::DECIMAL / mo.target_quantity::DECIMAL) * 100, 2)
            ELSE 0 
          END as completion_percentage,
          
          CASE 
            WHEN mo.target_quantity > 0 THEN 
              ROUND((mo.failed_quantity::DECIMAL / mo.target_quantity::DECIMAL) * 100, 2)
            ELSE 0 
          END as failure_rate,
          
          -- Duration calculations
          CASE 
            WHEN mo.started_at IS NOT NULL AND mo.completed_at IS NOT NULL THEN
              EXTRACT(EPOCH FROM (mo.completed_at - mo.started_at)) / 3600
            ELSE NULL
          END as duration_hours,
          
          -- Panel statistics
          COALESCE(panel_stats.total_panels, 0) as total_panels,
          COALESCE(panel_stats.completed_panels, 0) as completed_panels,
          COALESCE(panel_stats.failed_panels, 0) as failed_panels,
          COALESCE(panel_stats.in_progress_panels, 0) as in_progress_panels,
          COALESCE(panel_stats.avg_wattage, 0) as avg_wattage,
          COALESCE(panel_stats.avg_vmp, 0) as avg_vmp,
          COALESCE(panel_stats.avg_imp, 0) as avg_imp
          
        FROM manufacturing_orders mo
        LEFT JOIN users u ON mo.created_by = u.id
        LEFT JOIN (
          SELECT 
            mo_id,
            COUNT(*) as total_panels,
            COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_panels,
            COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_panels,
            COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_panels,
            AVG(wattage_pmax) as avg_wattage,
            AVG(vmp) as avg_vmp,
            AVG(imp) as avg_imp
          FROM panels 
          GROUP BY mo_id
        ) panel_stats ON mo.id = panel_stats.mo_id
        
        ${whereClause}
        ORDER BY mo.${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(mainQuery, queryParams);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM manufacturing_orders mo
        LEFT JOIN users u ON mo.created_by = u.id
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      this.logger.info('Historical manufacturing orders retrieved', {
        filters,
        pagination,
        sorting,
        result_count: result.rows.length,
        total_count: total
      });

      return {
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        filters,
        sorting
      };

    } catch (error) {
      this.logger.error('Failed to get historical manufacturing orders', {
        error: error.message,
        filters,
        pagination,
        sorting
      });
      throw error;
    }
  }

  /**
   * Get historical panel data with comprehensive filtering
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @param {Object} sorting - Sorting options
   * @returns {Object} Historical panel data with metadata
   */
  async getHistoricalPanels(filters = {}, pagination = {}, sorting = {}) {
    try {
      const {
        dateFrom,
        dateTo,
        moId,
        orderNumber,
        panelType,
        frameType,
        backsheetType,
        status,
        lineAssignment,
        stationId,
        minWattage,
        maxWattage,
        hasElectricalData,
        reworkCount,
        palletId
      } = filters;

      const {
        page = 1,
        limit = 100,
        offset = (page - 1) * limit
      } = pagination;

      const {
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = sorting;

      // Build dynamic WHERE clause
      const whereConditions = [];
      const queryParams = [];
      let paramIndex = 1;

      if (dateFrom) {
        whereConditions.push(`p.created_at >= $${paramIndex}`);
        queryParams.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        whereConditions.push(`p.created_at <= $${paramIndex}`);
        queryParams.push(dateTo);
        paramIndex++;
      }

      if (moId) {
        whereConditions.push(`p.mo_id = $${paramIndex}`);
        queryParams.push(moId);
        paramIndex++;
      }

      if (orderNumber) {
        whereConditions.push(`mo.order_number ILIKE $${paramIndex}`);
        queryParams.push(`%${orderNumber}%`);
        paramIndex++;
      }

      if (panelType && panelType.length > 0) {
        whereConditions.push(`p.panel_type = ANY($${paramIndex})`);
        queryParams.push(panelType);
        paramIndex++;
      }

      if (frameType && frameType.length > 0) {
        whereConditions.push(`p.frame_type = ANY($${paramIndex})`);
        queryParams.push(frameType);
        paramIndex++;
      }

      if (backsheetType && backsheetType.length > 0) {
        whereConditions.push(`p.backsheet_type = ANY($${paramIndex})`);
        queryParams.push(backsheetType);
        paramIndex++;
      }

      if (status && status.length > 0) {
        whereConditions.push(`p.status = ANY($${paramIndex})`);
        queryParams.push(status);
        paramIndex++;
      }

      if (lineAssignment && lineAssignment.length > 0) {
        whereConditions.push(`p.line_assignment = ANY($${paramIndex})`);
        queryParams.push(lineAssignment);
        paramIndex++;
      }

      if (stationId) {
        whereConditions.push(`p.current_station_id = $${paramIndex}`);
        queryParams.push(stationId);
        paramIndex++;
      }

      if (minWattage) {
        whereConditions.push(`p.wattage_pmax >= $${paramIndex}`);
        queryParams.push(minWattage);
        paramIndex++;
      }

      if (maxWattage) {
        whereConditions.push(`p.wattage_pmax <= $${paramIndex}`);
        queryParams.push(maxWattage);
        paramIndex++;
      }

      if (hasElectricalData !== undefined) {
        if (hasElectricalData) {
          whereConditions.push(`p.wattage_pmax IS NOT NULL AND p.vmp IS NOT NULL AND p.imp IS NOT NULL`);
        } else {
          whereConditions.push(`(p.wattage_pmax IS NULL OR p.vmp IS NULL OR p.imp IS NULL)`);
        }
      }

      if (reworkCount !== undefined) {
        whereConditions.push(`p.rework_count = $${paramIndex}`);
        queryParams.push(reworkCount);
        paramIndex++;
      }

      if (palletId) {
        whereConditions.push(`p.pallet_id = $${paramIndex}`);
        queryParams.push(palletId);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Main query with comprehensive panel data
      const mainQuery = `
        SELECT 
          p.id,
          p.barcode,
          p.panel_type,
          p.frame_type,
          p.backsheet_type,
          p.line_assignment,
          p.current_station_id,
          p.status,
          p.mo_id,
          p.wattage_pmax,
          p.vmp,
          p.imp,
          p.voc_theoretical,
          p.isc_theoretical,
          p.rework_count,
          p.rework_reason,
          p.quality_notes,
          p.pallet_id,
          p.pallet_position,
          p.created_at,
          p.updated_at,
          p.completed_at,
          p.station_1_completed_at,
          p.station_2_completed_at,
          p.station_3_completed_at,
          p.station_4_completed_at,
          p.created_by,
          p.last_updated_by,
          
          -- Manufacturing order information
          mo.order_number,
          mo.customer_name,
          mo.customer_po,
          
          -- Station information
          s.name as current_station_name,
          s.station_type as current_station_type,
          
          -- User information
          u1.username as created_by_username,
          u2.username as last_updated_by_username,
          
          -- Pallet information
          pal.pallet_number,
          
          -- Calculated fields
          CASE 
            WHEN p.station_1_completed_at IS NOT NULL AND p.station_4_completed_at IS NOT NULL THEN
              EXTRACT(EPOCH FROM (p.station_4_completed_at - p.station_1_completed_at)) / 3600
            ELSE NULL
          END as production_duration_hours,
          
          -- Quality indicators
          CASE 
            WHEN p.wattage_pmax IS NOT NULL AND p.voc_theoretical IS NOT NULL THEN
              ROUND((p.wattage_pmax / (p.voc_theoretical * p.isc_theoretical)) * 100, 2)
            ELSE NULL
          END as efficiency_percentage
          
        FROM panels p
        LEFT JOIN manufacturing_orders mo ON p.mo_id = mo.id
        LEFT JOIN stations s ON p.current_station_id = s.id
        LEFT JOIN users u1 ON p.created_by = u1.id
        LEFT JOIN users u2 ON p.last_updated_by = u2.id
        LEFT JOIN pallets pal ON p.pallet_id = pal.id
        
        ${whereClause}
        ORDER BY p.${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await db.query(mainQuery, queryParams);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM panels p
        LEFT JOIN manufacturing_orders mo ON p.mo_id = mo.id
        LEFT JOIN stations s ON p.current_station_id = s.id
        LEFT JOIN users u1 ON p.created_by = u1.id
        LEFT JOIN users u2 ON p.last_updated_by = u2.id
        LEFT JOIN pallets pal ON p.pallet_id = pal.id
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      this.logger.info('Historical panels retrieved', {
        filters,
        pagination,
        sorting,
        result_count: result.rows.length,
        total_count: total
      });

      return {
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        filters,
        sorting
      };

    } catch (error) {
      this.logger.error('Failed to get historical panels', {
        error: error.message,
        filters,
        pagination,
        sorting
      });
      throw error;
    }
  }

  /**
   * Get comprehensive historical data for a specific manufacturing order
   * @param {number} moId - Manufacturing order ID
   * @returns {Object} Complete historical data for the MO
   */
  async getManufacturingOrderHistory(moId) {
    try {
      // Get MO details
      const moQuery = `
        SELECT 
          mo.*,
          u.username as created_by_username,
          u.email as created_by_email
        FROM manufacturing_orders mo
        LEFT JOIN users u ON mo.created_by = u.id
        WHERE mo.id = $1
      `;

      const moResult = await db.query(moQuery, [moId]);
      
      if (moResult.rows.length === 0) {
        throw new Error(`Manufacturing order ${moId} not found`);
      }

      const mo = moResult.rows[0];

      // Get all panels for this MO
      const panelsQuery = `
        SELECT 
          p.*,
          s.name as current_station_name,
          pal.pallet_number,
          u1.username as created_by_username,
          u2.username as last_updated_by_username
        FROM panels p
        LEFT JOIN stations s ON p.current_station_id = s.id
        LEFT JOIN pallets pal ON p.pallet_id = pal.id
        LEFT JOIN users u1 ON p.created_by = u1.id
        LEFT JOIN users u2 ON p.last_updated_by = u2.id
        WHERE p.mo_id = $1
        ORDER BY p.created_at
      `;

      const panelsResult = await db.query(panelsQuery, [moId]);
      const panels = panelsResult.rows;

      // Get progress tracking history
      const progressQuery = `
        SELECT 
          pt.*,
          u.username as updated_by_username
        FROM mo_progress_tracking pt
        LEFT JOIN users u ON pt.updated_by = u.id
        WHERE pt.mo_id = $1
        ORDER BY pt.updated_at DESC
      `;

      const progressResult = await db.query(progressQuery, [moId]);
      const progressHistory = progressResult.rows;

      // Get alert history
      const alertsQuery = `
        SELECT 
          a.*,
          u.username as created_by_username
        FROM mo_alerts a
        LEFT JOIN users u ON a.created_by = u.id
        WHERE a.mo_id = $1
        ORDER BY a.created_at DESC
      `;

      const alertsResult = await db.query(alertsQuery, [moId]);
      const alertHistory = alertsResult.rows;

      // Get closure audit history
      const closureQuery = `
        SELECT 
          ca.*,
          u.username as closed_by_username
        FROM mo_closure_audit ca
        LEFT JOIN users u ON ca.closed_by = u.id
        WHERE ca.mo_id = $1
        ORDER BY ca.created_at DESC
      `;

      const closureResult = await db.query(closureQuery, [moId]);
      const closureHistory = closureResult.rows;

      // Calculate comprehensive statistics
      const statistics = this.calculateMOStatistics(panels, progressHistory, alertHistory);

      this.logger.info('Manufacturing order history retrieved', {
        moId,
        panels_count: panels.length,
        progress_entries: progressHistory.length,
        alerts_count: alertHistory.length,
        closure_entries: closureHistory.length
      });

      return {
        manufacturingOrder: mo,
        panels,
        progressHistory,
        alertHistory,
        closureHistory,
        statistics
      };

    } catch (error) {
      this.logger.error('Failed to get manufacturing order history', {
        error: error.message,
        moId
      });
      throw error;
    }
  }

  /**
   * Calculate comprehensive statistics for a manufacturing order
   * @param {Array} panels - Array of panel data
   * @param {Array} progressHistory - Array of progress tracking data
   * @param {Array} alertHistory - Array of alert data
   * @returns {Object} Calculated statistics
   */
  calculateMOStatistics(panels, progressHistory, alertHistory) {
    const totalPanels = panels.length;
    const completedPanels = panels.filter(p => p.status === 'COMPLETED').length;
    const failedPanels = panels.filter(p => p.status === 'FAILED').length;
    const inProgressPanels = panels.filter(p => p.status === 'IN_PROGRESS').length;
    const pendingPanels = panels.filter(p => p.status === 'PENDING').length;

    const panelsWithElectricalData = panels.filter(p => 
      p.wattage_pmax && p.vmp && p.imp
    );

    const avgWattage = panelsWithElectricalData.length > 0 
      ? panelsWithElectricalData.reduce((sum, p) => sum + parseFloat(p.wattage_pmax), 0) / panelsWithElectricalData.length
      : 0;

    const avgVmp = panelsWithElectricalData.length > 0
      ? panelsWithElectricalData.reduce((sum, p) => sum + parseFloat(p.vmp), 0) / panelsWithElectricalData.length
      : 0;

    const avgImp = panelsWithElectricalData.length > 0
      ? panelsWithElectricalData.reduce((sum, p) => sum + parseFloat(p.imp), 0) / panelsWithElectricalData.length
      : 0;

    const reworkPanels = panels.filter(p => p.rework_count > 0);
    const totalReworks = panels.reduce((sum, p) => sum + (p.rework_count || 0), 0);

    const completionRate = totalPanels > 0 ? (completedPanels / totalPanels) * 100 : 0;
    const failureRate = totalPanels > 0 ? (failedPanels / totalPanels) * 100 : 0;
    const reworkRate = totalPanels > 0 ? (reworkPanels.length / totalPanels) * 100 : 0;

    // Calculate production timeline
    const firstPanelCreated = panels.length > 0 ? new Date(Math.min(...panels.map(p => new Date(p.created_at)))) : null;
    const lastPanelCompleted = completedPanels > 0 
      ? new Date(Math.max(...panels.filter(p => p.status === 'COMPLETED').map(p => new Date(p.completed_at))))
      : null;

    const totalProductionTime = firstPanelCreated && lastPanelCompleted
      ? (lastPanelCompleted - firstPanelCreated) / (1000 * 60 * 60) // hours
      : 0;

    // Alert statistics
    const criticalAlerts = alertHistory.filter(a => a.severity === 'CRITICAL').length;
    const warningAlerts = alertHistory.filter(a => a.severity === 'WARNING').length;
    const infoAlerts = alertHistory.filter(a => a.severity === 'INFO').length;

    return {
      panelCounts: {
        total: totalPanels,
        completed: completedPanels,
        failed: failedPanels,
        inProgress: inProgressPanels,
        pending: pendingPanels
      },
      rates: {
        completion: Math.round(completionRate * 100) / 100,
        failure: Math.round(failureRate * 100) / 100,
        rework: Math.round(reworkRate * 100) / 100
      },
      electricalData: {
        panelsWithData: panelsWithElectricalData.length,
        averageWattage: Math.round(avgWattage * 1000) / 1000,
        averageVmp: Math.round(avgVmp * 100) / 100,
        averageImp: Math.round(avgImp * 100) / 100
      },
      rework: {
        panelsWithRework: reworkPanels.length,
        totalReworkCount: totalReworks,
        averageReworksPerPanel: totalPanels > 0 ? Math.round((totalReworks / totalPanels) * 100) / 100 : 0
      },
      timeline: {
        firstPanelCreated,
        lastPanelCompleted,
        totalProductionTimeHours: Math.round(totalProductionTime * 100) / 100
      },
      alerts: {
        total: alertHistory.length,
        critical: criticalAlerts,
        warning: warningAlerts,
        info: infoAlerts
      }
    };
  }

  /**
   * Get data retention information for compliance reporting
   * @param {Object} filters - Filter criteria for retention analysis
   * @returns {Object} Data retention analysis
   */
  async getDataRetentionAnalysis(filters = {}) {
    try {
      const { retentionYears = 7 } = filters;
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);

      // Get MO retention data
      const moRetentionQuery = `
        SELECT 
          COUNT(*) as total_mos,
          COUNT(CASE WHEN created_at < $1 THEN 1 END) as eligible_for_archival,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as within_retention_period,
          MIN(created_at) as oldest_mo,
          MAX(created_at) as newest_mo
        FROM manufacturing_orders
      `;

      const moResult = await db.query(moRetentionQuery, [cutoffDate]);

      // Get panel retention data
      const panelRetentionQuery = `
        SELECT 
          COUNT(*) as total_panels,
          COUNT(CASE WHEN created_at < $1 THEN 1 END) as eligible_for_archival,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as within_retention_period,
          MIN(created_at) as oldest_panel,
          MAX(created_at) as newest_panel
        FROM panels
      `;

      const panelResult = await db.query(panelRetentionQuery, [cutoffDate]);

      // Get storage size estimates
      const storageQuery = `
        SELECT 
          pg_size_pretty(pg_total_relation_size('manufacturing_orders')) as mo_table_size,
          pg_size_pretty(pg_total_relation_size('panels')) as panels_table_size,
          pg_size_pretty(pg_total_relation_size('mo_progress_tracking')) as progress_table_size,
          pg_size_pretty(pg_total_relation_size('mo_alerts')) as alerts_table_size,
          pg_size_pretty(pg_total_relation_size('mo_closure_audit')) as closure_table_size
      `;

      const storageResult = await db.query(storageQuery);

      this.logger.info('Data retention analysis completed', {
        retentionYears,
        cutoffDate,
        moEligibleForArchival: moResult.rows[0].eligible_for_archival,
        panelEligibleForArchival: panelResult.rows[0].eligible_for_archival
      });

      return {
        retentionPolicy: {
          years: retentionYears,
          cutoffDate
        },
        manufacturingOrders: moResult.rows[0],
        panels: panelResult.rows[0],
        storage: storageResult.rows[0],
        recommendations: this.generateRetentionRecommendations(moResult.rows[0], panelResult.rows[0])
      };

    } catch (error) {
      this.logger.error('Failed to get data retention analysis', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Generate data retention recommendations
   * @param {Object} moData - Manufacturing order retention data
   * @param {Object} panelData - Panel retention data
   * @returns {Array} Array of recommendations
   */
  generateRetentionRecommendations(moData, panelData) {
    const recommendations = [];

    if (moData.eligible_for_archival > 0) {
      recommendations.push({
        type: 'ARCHIVAL',
        priority: 'HIGH',
        message: `${moData.eligible_for_archival} manufacturing orders are eligible for archival`,
        action: 'Consider archiving old manufacturing orders to reduce database size'
      });
    }

    if (panelData.eligible_for_archival > 0) {
      recommendations.push({
        type: 'ARCHIVAL',
        priority: 'HIGH',
        message: `${panelData.eligible_for_archival} panels are eligible for archival`,
        action: 'Consider archiving old panel data to improve query performance'
      });
    }

    if (moData.total_mos > 10000) {
      recommendations.push({
        type: 'PERFORMANCE',
        priority: 'MEDIUM',
        message: 'Large number of manufacturing orders may impact query performance',
        action: 'Consider implementing data partitioning or archiving strategy'
      });
    }

    if (panelData.total_panels > 100000) {
      recommendations.push({
        type: 'PERFORMANCE',
        priority: 'MEDIUM',
        message: 'Large number of panels may impact query performance',
        action: 'Consider implementing data partitioning or archiving strategy'
      });
    }

    return recommendations;
  }
}

export default new HistoricalDataService();
