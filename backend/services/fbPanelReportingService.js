// F/B Panel Reporting Service
// Provides comprehensive reporting for Failed panels by Manufacturing Order
// Task 10.4.2 - Implement F/B Panel Reporting by MO

import db from '../config/database.js';
import { manufacturingLogger } from '../middleware/logger.js';

class FBPanelReportingService {
  constructor() {
    this.logger = manufacturingLogger;
  }

  /**
   * Generate F/B Panel Report for a specific Manufacturing Order
   * @param {number} moId - Manufacturing Order ID
   * @param {Object} options - Report generation options
   * @returns {Object} Comprehensive F/B panel report
   */
  async generateFBReportByMO(moId, options = {}) {
    try {
      const {
        includeDetails = true,
        includeReworkHistory = true,
        includeQualityAnalysis = true,
        includeStationBreakdown = true
      } = options;

      // Get MO basic information
      const moQuery = `
        SELECT 
          mo.id,
          mo.order_number,
          mo.panel_type,
          mo.target_quantity,
          mo.completed_quantity,
          mo.failed_quantity,
          mo.customer_name,
          mo.customer_po,
          mo.created_at,
          mo.completed_at,
          u.username as created_by_username
        FROM manufacturing_orders mo
        LEFT JOIN users u ON mo.created_by = u.id
        WHERE mo.id = $1
      `;

      const moResult = await db.query(moQuery, [moId]);
      
      if (moResult.rows.length === 0) {
        throw new Error(`Manufacturing order ${moId} not found`);
      }

      const mo = moResult.rows[0];

      // Get all failed panels for this MO
      const failedPanelsQuery = `
        SELECT 
          p.id,
          p.barcode,
          p.panel_type,
          p.frame_type,
          p.backsheet_type,
          p.line_assignment,
          p.status,
          p.rework_count,
          p.rework_reason,
          p.quality_notes,
          p.created_at,
          p.updated_at,
          p.completed_at,
          p.station_1_completed_at,
          p.station_2_completed_at,
          p.station_3_completed_at,
          p.station_4_completed_at,
          p.wattage_pmax,
          p.vmp,
          p.imp,
          p.voc_theoretical,
          p.isc_theoretical,
          s.name as current_station_name,
          s.station_type as current_station_type,
          u1.username as created_by_username,
          u2.username as last_updated_by_username
        FROM panels p
        LEFT JOIN stations s ON p.current_station_id = s.id
        LEFT JOIN users u1 ON p.created_by = u1.id
        LEFT JOIN users u2 ON p.last_updated_by = u2.id
        WHERE p.mo_id = $1 AND p.status = 'FAILED'
        ORDER BY p.created_at
      `;

      const failedPanelsResult = await db.query(failedPanelsQuery, [moId]);
      const failedPanels = failedPanelsResult.rows;

      // Get inspection history for failed panels
      let inspectionHistory = [];
      if (includeDetails && failedPanels.length > 0) {
        const panelIds = failedPanels.map(p => p.id);
        const inspectionQuery = `
          SELECT 
            i.id,
            i.panel_id,
            i.station_id,
            i.inspector_id,
            i.result,
            i.notes,
            i.criteria_results,
            i.created_at,
            s.name as station_name,
            u.username as inspector_username
          FROM inspections i
          LEFT JOIN stations s ON i.station_id = s.id
          LEFT JOIN users u ON i.inspector_id = u.id
          WHERE i.panel_id = ANY($1)
          ORDER BY i.created_at
        `;

        const inspectionResult = await db.query(inspectionQuery, [panelIds]);
        inspectionHistory = inspectionResult.rows;
      }

      // Get rework history for failed panels
      let reworkHistory = [];
      if (includeReworkHistory && failedPanels.length > 0) {
        const panelIds = failedPanels.map(p => p.id);
        const reworkQuery = `
          SELECT 
            r.id,
            r.panel_id,
            r.from_station_id,
            r.to_station_id,
            r.rework_reason,
            r.notes,
            r.created_at,
            r.created_by,
            s1.name as from_station_name,
            s2.name as to_station_name,
            u.username as created_by_username
          FROM rework_history r
          LEFT JOIN stations s1 ON r.from_station_id = s1.id
          LEFT JOIN stations s2 ON r.to_station_id = s2.id
          LEFT JOIN users u ON r.created_by = u.id
          WHERE r.panel_id = ANY($1)
          ORDER BY r.created_at
        `;

        const reworkResult = await db.query(reworkQuery, [panelIds]);
        reworkHistory = reworkResult.rows;
      }

      // Calculate comprehensive statistics
      const statistics = this.calculateFBStatistics(failedPanels, inspectionHistory, reworkHistory);

      // Generate quality analysis
      let qualityAnalysis = null;
      if (includeQualityAnalysis) {
        qualityAnalysis = this.generateQualityAnalysis(failedPanels, inspectionHistory);
      }

      // Generate station breakdown
      let stationBreakdown = null;
      if (includeStationBreakdown) {
        stationBreakdown = this.generateStationBreakdown(failedPanels, inspectionHistory);
      }

      this.logger.info('F/B Panel report generated for MO', {
        moId,
        orderNumber: mo.order_number,
        failedPanelsCount: failedPanels.length,
        inspectionHistoryCount: inspectionHistory.length,
        reworkHistoryCount: reworkHistory.length
      });

      return {
        manufacturingOrder: mo,
        failedPanels,
        inspectionHistory,
        reworkHistory,
        statistics,
        qualityAnalysis,
        stationBreakdown,
        reportGeneratedAt: new Date().toISOString(),
        reportOptions: options
      };

    } catch (error) {
      this.logger.error('Failed to generate F/B panel report for MO', {
        error: error.message,
        moId,
        options
      });
      throw error;
    }
  }

  /**
   * Generate F/B Panel Summary Report for multiple MOs
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Report generation options
   * @returns {Object} Summary report for multiple MOs
   */
  async generateFBSummaryReport(filters = {}, options = {}) {
    try {
      const {
        dateFrom,
        dateTo,
        panelType,
        customerName,
        minFailureRate,
        maxFailureRate
      } = filters;

      const {
        includeTrends = true,
        includeCustomerAnalysis = true,
        includePanelTypeAnalysis = true
      } = options;

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

      if (panelType && panelType.length > 0) {
        whereConditions.push(`mo.panel_type = ANY($${paramIndex})`);
        queryParams.push(panelType);
        paramIndex++;
      }

      if (customerName) {
        whereConditions.push(`mo.customer_name ILIKE $${paramIndex}`);
        queryParams.push(`%${customerName}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get MO summary with failure statistics
      const summaryQuery = `
        SELECT 
          mo.id,
          mo.order_number,
          mo.panel_type,
          mo.target_quantity,
          mo.completed_quantity,
          mo.failed_quantity,
          mo.customer_name,
          mo.customer_po,
          mo.created_at,
          mo.completed_at,
          
          -- Calculate failure rate
          CASE 
            WHEN mo.target_quantity > 0 THEN 
              ROUND((mo.failed_quantity::DECIMAL / mo.target_quantity::DECIMAL) * 100, 2)
            ELSE 0 
          END as failure_rate,
          
          -- Panel statistics
          COALESCE(panel_stats.total_panels, 0) as total_panels,
          COALESCE(panel_stats.failed_panels, 0) as failed_panels,
          COALESCE(panel_stats.rework_panels, 0) as rework_panels,
          COALESCE(panel_stats.avg_rework_count, 0) as avg_rework_count
          
        FROM manufacturing_orders mo
        LEFT JOIN (
          SELECT 
            mo_id,
            COUNT(*) as total_panels,
            COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_panels,
            COUNT(CASE WHEN rework_count > 0 THEN 1 END) as rework_panels,
            AVG(rework_count) as avg_rework_count
          FROM panels 
          GROUP BY mo_id
        ) panel_stats ON mo.id = panel_stats.mo_id
        
        ${whereClause}
        ORDER BY mo.created_at DESC
      `;

      const summaryResult = await db.query(summaryQuery, queryParams);
      const moSummaries = summaryResult.rows;

      // Apply failure rate filters
      let filteredSummaries = moSummaries;
      if (minFailureRate !== undefined) {
        filteredSummaries = filteredSummaries.filter(mo => mo.failure_rate >= minFailureRate);
      }
      if (maxFailureRate !== undefined) {
        filteredSummaries = filteredSummaries.filter(mo => mo.failure_rate <= maxFailureRate);
      }

      // Calculate overall statistics
      const overallStats = this.calculateOverallFBStatistics(filteredSummaries);

      // Generate trends analysis
      let trendsAnalysis = null;
      if (includeTrends) {
        trendsAnalysis = this.generateTrendsAnalysis(filteredSummaries);
      }

      // Generate customer analysis
      let customerAnalysis = null;
      if (includeCustomerAnalysis) {
        customerAnalysis = this.generateCustomerAnalysis(filteredSummaries);
      }

      // Generate panel type analysis
      let panelTypeAnalysis = null;
      if (includePanelTypeAnalysis) {
        panelTypeAnalysis = this.generatePanelTypeAnalysis(filteredSummaries);
      }

      this.logger.info('F/B Panel summary report generated', {
        filters,
        options,
        moCount: filteredSummaries.length,
        totalFailedPanels: overallStats.totalFailedPanels
      });

      return {
        manufacturingOrders: filteredSummaries,
        overallStatistics: overallStats,
        trendsAnalysis,
        customerAnalysis,
        panelTypeAnalysis,
        reportGeneratedAt: new Date().toISOString(),
        filters,
        options
      };

    } catch (error) {
      this.logger.error('Failed to generate F/B panel summary report', {
        error: error.message,
        filters,
        options
      });
      throw error;
    }
  }

  /**
   * Calculate comprehensive F/B statistics
   * @param {Array} failedPanels - Array of failed panel data
   * @param {Array} inspectionHistory - Array of inspection data
   * @param {Array} reworkHistory - Array of rework data
   * @returns {Object} Calculated statistics
   */
  calculateFBStatistics(failedPanels, inspectionHistory, reworkHistory) {
    const totalFailed = failedPanels.length;
    const withRework = failedPanels.filter(p => p.rework_count > 0).length;
    const withoutRework = totalFailed - withRework;

    const totalReworks = failedPanels.reduce((sum, p) => sum + (p.rework_count || 0), 0);
    const avgReworksPerPanel = totalFailed > 0 ? totalReworks / totalFailed : 0;

    // Station failure analysis
    const stationFailures = {};
    failedPanels.forEach(panel => {
      const stationName = panel.current_station_name || 'Unknown';
      stationFailures[stationName] = (stationFailures[stationName] || 0) + 1;
    });

    // Rework reason analysis
    const reworkReasons = {};
    failedPanels.forEach(panel => {
      if (panel.rework_reason) {
        reworkReasons[panel.rework_reason] = (reworkReasons[panel.rework_reason] || 0) + 1;
      }
    });

    // Timeline analysis
    const firstFailure = failedPanels.length > 0 
      ? new Date(Math.min(...failedPanels.map(p => new Date(p.created_at))))
      : null;
    const lastFailure = failedPanels.length > 0
      ? new Date(Math.max(...failedPanels.map(p => new Date(p.updated_at))))
      : null;

    const failureTimeSpan = firstFailure && lastFailure
      ? (lastFailure - firstFailure) / (1000 * 60 * 60) // hours
      : 0;

    return {
      counts: {
        totalFailed,
        withRework,
        withoutRework,
        totalReworks
      },
      averages: {
        reworksPerPanel: Math.round(avgReworksPerPanel * 100) / 100
      },
      stationFailures,
      reworkReasons,
      timeline: {
        firstFailure,
        lastFailure,
        failureTimeSpanHours: Math.round(failureTimeSpan * 100) / 100
      }
    };
  }

  /**
   * Calculate overall F/B statistics for multiple MOs
   * @param {Array} moSummaries - Array of MO summary data
   * @returns {Object} Overall statistics
   */
  calculateOverallFBStatistics(moSummaries) {
    const totalMOs = moSummaries.length;
    const totalTargetQuantity = moSummaries.reduce((sum, mo) => sum + mo.target_quantity, 0);
    const totalCompletedQuantity = moSummaries.reduce((sum, mo) => sum + mo.completed_quantity, 0);
    const totalFailedQuantity = moSummaries.reduce((sum, mo) => sum + mo.failed_quantity, 0);

    const avgFailureRate = totalMOs > 0 
      ? moSummaries.reduce((sum, mo) => sum + mo.failure_rate, 0) / totalMOs
      : 0;

    const highFailureMOs = moSummaries.filter(mo => mo.failure_rate > 10).length;
    const mediumFailureMOs = moSummaries.filter(mo => mo.failure_rate > 5 && mo.failure_rate <= 10).length;
    const lowFailureMOs = moSummaries.filter(mo => mo.failure_rate <= 5).length;

    return {
      totalMOs,
      totalTargetQuantity,
      totalCompletedQuantity,
      totalFailedQuantity,
      overallFailureRate: totalTargetQuantity > 0 
        ? Math.round((totalFailedQuantity / totalTargetQuantity) * 10000) / 100
        : 0,
      averageFailureRate: Math.round(avgFailureRate * 100) / 100,
      failureDistribution: {
        high: highFailureMOs,
        medium: mediumFailureMOs,
        low: lowFailureMOs
      }
    };
  }

  /**
   * Generate quality analysis for failed panels
   * @param {Array} failedPanels - Array of failed panel data
   * @param {Array} inspectionHistory - Array of inspection data
   * @returns {Object} Quality analysis
   */
  generateQualityAnalysis(failedPanels, inspectionHistory) {
    const panelsWithNotes = failedPanels.filter(p => p.quality_notes && p.quality_notes.trim().length > 0);
    const panelsWithoutNotes = failedPanels.length - panelsWithNotes.length;

    // Analyze inspection results
    const inspectionResults = {};
    inspectionHistory.forEach(inspection => {
      const result = inspection.result;
      inspectionResults[result] = (inspectionResults[result] || 0) + 1;
    });

    // Analyze failure patterns
    const failurePatterns = {};
    failedPanels.forEach(panel => {
      const pattern = this.identifyFailurePattern(panel, inspectionHistory);
      if (pattern) {
        failurePatterns[pattern] = (failurePatterns[pattern] || 0) + 1;
      }
    });

    return {
      documentation: {
        panelsWithNotes,
        panelsWithoutNotes,
        documentationRate: failedPanels.length > 0 
          ? Math.round((panelsWithNotes / failedPanels.length) * 10000) / 100
          : 0
      },
      inspectionResults,
      failurePatterns,
      recommendations: this.generateQualityRecommendations(failedPanels, inspectionHistory)
    };
  }

  /**
   * Generate station breakdown analysis
   * @param {Array} failedPanels - Array of failed panel data
   * @param {Array} inspectionHistory - Array of inspection data
   * @returns {Object} Station breakdown analysis
   */
  generateStationBreakdown(failedPanels, inspectionHistory) {
    const stationBreakdown = {};

    // Group inspections by station
    const inspectionsByStation = {};
    inspectionHistory.forEach(inspection => {
      const stationName = inspection.station_name || 'Unknown';
      if (!inspectionsByStation[stationName]) {
        inspectionsByStation[stationName] = [];
      }
      inspectionsByStation[stationName].push(inspection);
    });

    // Analyze each station
    Object.keys(inspectionsByStation).forEach(stationName => {
      const stationInspections = inspectionsByStation[stationName];
      const failedInspections = stationInspections.filter(i => i.result === 'FAIL');
      const passedInspections = stationInspections.filter(i => i.result === 'PASS');

      stationBreakdown[stationName] = {
        totalInspections: stationInspections.length,
        failedInspections: failedInspections.length,
        passedInspections: passedInspections.length,
        failureRate: stationInspections.length > 0 
          ? Math.round((failedInspections.length / stationInspections.length) * 10000) / 100
          : 0,
        commonFailureReasons: this.extractCommonFailureReasons(failedInspections)
      };
    });

    return stationBreakdown;
  }

  /**
   * Generate trends analysis
   * @param {Array} moSummaries - Array of MO summary data
   * @returns {Object} Trends analysis
   */
  generateTrendsAnalysis(moSummaries) {
    // Group by month
    const monthlyData = {};
    moSummaries.forEach(mo => {
      const month = new Date(mo.created_at).toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = {
          moCount: 0,
          totalTarget: 0,
          totalFailed: 0,
          totalCompleted: 0
        };
      }
      monthlyData[month].moCount++;
      monthlyData[month].totalTarget += mo.target_quantity;
      monthlyData[month].totalFailed += mo.failed_quantity;
      monthlyData[month].totalCompleted += mo.completed_quantity;
    });

    // Calculate monthly failure rates
    Object.keys(monthlyData).forEach(month => {
      const data = monthlyData[month];
      data.failureRate = data.totalTarget > 0 
        ? Math.round((data.totalFailed / data.totalTarget) * 10000) / 100
        : 0;
    });

    return {
      monthlyTrends: monthlyData,
      trendDirection: this.calculateTrendDirection(monthlyData)
    };
  }

  /**
   * Generate customer analysis
   * @param {Array} moSummaries - Array of MO summary data
   * @returns {Object} Customer analysis
   */
  generateCustomerAnalysis(moSummaries) {
    const customerData = {};

    moSummaries.forEach(mo => {
      const customer = mo.customer_name || 'Unknown';
      if (!customerData[customer]) {
        customerData[customer] = {
          moCount: 0,
          totalTarget: 0,
          totalFailed: 0,
          totalCompleted: 0,
          failureRates: []
        };
      }
      customerData[customer].moCount++;
      customerData[customer].totalTarget += mo.target_quantity;
      customerData[customer].totalFailed += mo.failed_quantity;
      customerData[customer].totalCompleted += mo.completed_quantity;
      customerData[customer].failureRates.push(mo.failure_rate);
    });

    // Calculate customer statistics
    Object.keys(customerData).forEach(customer => {
      const data = customerData[customer];
      data.avgFailureRate = data.failureRates.length > 0
        ? Math.round((data.failureRates.reduce((sum, rate) => sum + rate, 0) / data.failureRates.length) * 100) / 100
        : 0;
      data.overallFailureRate = data.totalTarget > 0
        ? Math.round((data.totalFailed / data.totalTarget) * 10000) / 100
        : 0;
    });

    return customerData;
  }

  /**
   * Generate panel type analysis
   * @param {Array} moSummaries - Array of MO summary data
   * @returns {Object} Panel type analysis
   */
  generatePanelTypeAnalysis(moSummaries) {
    const panelTypeData = {};

    moSummaries.forEach(mo => {
      const panelType = mo.panel_type;
      if (!panelTypeData[panelType]) {
        panelTypeData[panelType] = {
          moCount: 0,
          totalTarget: 0,
          totalFailed: 0,
          totalCompleted: 0,
          failureRates: []
        };
      }
      panelTypeData[panelType].moCount++;
      panelTypeData[panelType].totalTarget += mo.target_quantity;
      panelTypeData[panelType].totalFailed += mo.failed_quantity;
      panelTypeData[panelType].totalCompleted += mo.completed_quantity;
      panelTypeData[panelType].failureRates.push(mo.failure_rate);
    });

    // Calculate panel type statistics
    Object.keys(panelTypeData).forEach(panelType => {
      const data = panelTypeData[panelType];
      data.avgFailureRate = data.failureRates.length > 0
        ? Math.round((data.failureRates.reduce((sum, rate) => sum + rate, 0) / data.failureRates.length) * 100) / 100
        : 0;
      data.overallFailureRate = data.totalTarget > 0
        ? Math.round((data.totalFailed / data.totalTarget) * 10000) / 100
        : 0;
    });

    return panelTypeData;
  }

  /**
   * Identify failure pattern for a panel
   * @param {Object} panel - Panel data
   * @param {Array} inspectionHistory - Inspection history
   * @returns {String} Identified failure pattern
   */
  identifyFailurePattern(panel, inspectionHistory) {
    const panelInspections = inspectionHistory.filter(i => i.panel_id === panel.id);
    
    if (panelInspections.length === 0) {
      return 'No Inspection Data';
    }

    const failedInspections = panelInspections.filter(i => i.result === 'FAIL');
    if (failedInspections.length === 0) {
      return 'No Failed Inspections';
    }

    const stations = failedInspections.map(i => i.station_name).join(', ');
    return `Failed at: ${stations}`;
  }

  /**
   * Extract common failure reasons from inspections
   * @param {Array} failedInspections - Array of failed inspection data
   * @returns {Array} Common failure reasons
   */
  extractCommonFailureReasons(failedInspections) {
    const reasons = {};
    failedInspections.forEach(inspection => {
      if (inspection.notes) {
        const reason = inspection.notes.toLowerCase();
        reasons[reason] = (reasons[reason] || 0) + 1;
      }
    });

    return Object.entries(reasons)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));
  }

  /**
   * Generate quality recommendations
   * @param {Array} failedPanels - Array of failed panel data
   * @param {Array} inspectionHistory - Array of inspection data
   * @returns {Array} Quality recommendations
   */
  generateQualityRecommendations(failedPanels, inspectionHistory) {
    const recommendations = [];

    const panelsWithoutNotes = failedPanels.filter(p => !p.quality_notes || p.quality_notes.trim().length === 0);
    if (panelsWithoutNotes.length > 0) {
      recommendations.push({
        type: 'DOCUMENTATION',
        priority: 'HIGH',
        message: `${panelsWithoutNotes.length} failed panels lack quality notes`,
        action: 'Ensure all failed panels have detailed quality notes for traceability'
      });
    }

    const highReworkPanels = failedPanels.filter(p => p.rework_count > 2);
    if (highReworkPanels.length > 0) {
      recommendations.push({
        type: 'PROCESS',
        priority: 'MEDIUM',
        message: `${highReworkPanels.length} panels required multiple reworks`,
        action: 'Review rework processes and identify root causes for repeated failures'
      });
    }

    const stationFailures = {};
    failedPanels.forEach(panel => {
      const station = panel.current_station_name || 'Unknown';
      stationFailures[station] = (stationFailures[station] || 0) + 1;
    });

    const maxFailures = Math.max(...Object.values(stationFailures));
    const problemStation = Object.keys(stationFailures).find(station => stationFailures[station] === maxFailures);
    
    if (maxFailures > failedPanels.length * 0.3) {
      recommendations.push({
        type: 'STATION',
        priority: 'HIGH',
        message: `${problemStation} has ${maxFailures} failures (${Math.round((maxFailures / failedPanels.length) * 100)}% of total)`,
        action: `Focus improvement efforts on ${problemStation} processes and training`
      });
    }

    return recommendations;
  }

  /**
   * Calculate trend direction
   * @param {Object} monthlyData - Monthly data object
   * @returns {String} Trend direction
   */
  calculateTrendDirection(monthlyData) {
    const months = Object.keys(monthlyData).sort();
    if (months.length < 2) {
      return 'INSUFFICIENT_DATA';
    }

    const recentMonths = months.slice(-3);
    const recentRates = recentMonths.map(month => monthlyData[month].failureRate);
    
    const isIncreasing = recentRates.every((rate, index) => 
      index === 0 || rate >= recentRates[index - 1]
    );
    
    const isDecreasing = recentRates.every((rate, index) => 
      index === 0 || rate <= recentRates[index - 1]
    );

    if (isIncreasing) return 'INCREASING';
    if (isDecreasing) return 'DECREASING';
    return 'FLUCTUATING';
  }
}

export default new FBPanelReportingService();
