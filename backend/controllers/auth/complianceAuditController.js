// Compliance and Audit Controller
// Manufacturing-optimized compliance, audit logging, and regulatory API

import { complianceAuditService } from '../../services/complianceAuditService.js';
import { sessionManager } from '../../services/sessionManager.js';
import { authPerformanceMonitor } from '../../services/authPerformanceMonitor.js';
import { 
  successResponse, 
  errorResponse, 
  manufacturingResponse 
} from '../../utils/index.js';
import { manufacturingLogger } from '../../middleware/logger.js';
import { 
  AuthenticationError, 
  ValidationError, 
  asyncHandler 
} from '../../middleware/errorHandler.js';

/**
 * Query Audit Logs
 * GET /api/v1/auth/compliance/audit-logs
 */
export const queryAuditLogs = asyncHandler(async (req, res) => {
  // Only system admins and QC managers can query audit logs
  if (!['SYSTEM_ADMIN', 'QC_MANAGER'].includes(req.user.role)) {
    throw new AuthenticationError('Insufficient permissions for audit log access', {
      reason: 'insufficient_permissions'
    });
  }

  const {
    level,
    category,
    userId,
    username,
    ip,
    action,
    complianceTags,
    startDate,
    endDate,
    limit = 100,
    offset = 0
  } = req.query;

  // Validate limit and offset
  if (limit > 1000) {
    throw new ValidationError('Maximum limit is 1000 records', {
      field: 'limit',
      maxValue: 1000,
      reason: 'limit_exceeded'
    });
  }

  if (offset < 0) {
    throw new ValidationError('Offset must be non-negative', {
      field: 'offset',
      reason: 'invalid_offset'
    });
  }

  try {
    const filters = {
      level,
      category,
      userId,
      username,
      ip,
      action,
      complianceTags: complianceTags ? complianceTags.split(',') : undefined,
      startDate,
      endDate,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const auditLogs = await complianceAuditService.queryAuditLogs(filters);

    return res.status(200).json(manufacturingResponse(
      auditLogs,
      'Audit logs retrieved successfully',
      {
        action: 'query_audit_logs',
        userId: req.user.id,
        filters: Object.keys(filters).filter(k => filters[k] !== undefined),
        total: auditLogs.total,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to query audit logs', {
      error: error.message,
      userId: req.user.id,
      filters: req.query,
      category: 'compliance_audit'
    });
    
    throw new ValidationError('Failed to retrieve audit logs', {
      reason: 'query_failed',
      details: error.message
    });
  }
});

/**
 * Generate Compliance Report
 * POST /api/v1/auth/compliance/report
 */
export const generateComplianceReport = asyncHandler(async (req, res) => {
  // Only system admins can generate compliance reports
  if (req.user.role !== 'SYSTEM_ADMIN') {
    throw new AuthenticationError('Insufficient permissions for compliance reporting', {
      reason: 'insufficient_permissions'
    });
  }

  const { framework, startDate, endDate } = req.body;

  if (!framework) {
    throw new ValidationError('Compliance framework is required', {
      field: 'framework',
      reason: 'missing_framework'
    });
  }

  if (!startDate || !endDate) {
    throw new ValidationError('Start date and end date are required', {
      field: !startDate ? 'startDate' : 'endDate',
      reason: 'missing_date_range'
    });
  }

  // Validate date format
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ValidationError('Invalid date format', {
      field: 'dates',
      reason: 'invalid_date_format'
    });
  }

  if (start >= end) {
    throw new ValidationError('Start date must be before end date', {
      field: 'date_range',
      reason: 'invalid_date_range'
    });
  }

  try {
    const report = await complianceAuditService.generateComplianceReport(framework, startDate, endDate);

    return res.status(200).json(manufacturingResponse(
      report,
      'Compliance report generated successfully',
      {
        action: 'generate_compliance_report',
        userId: req.user.id,
        framework,
        period: { startDate, endDate },
        complianceScore: report.complianceScore,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to generate compliance report', {
      error: error.message,
      userId: req.user.id,
      framework,
      startDate,
      endDate,
      category: 'compliance_audit'
    });
    
    throw new ValidationError('Failed to generate compliance report', {
      reason: 'report_generation_failed',
      details: error.message
    });
  }
});

/**
 * Get Audit Statistics
 * GET /api/v1/auth/compliance/statistics
 */
export const getAuditStatistics = asyncHandler(async (req, res) => {
  // Only system admins and QC managers can view audit statistics
  if (!['SYSTEM_ADMIN', 'QC_MANAGER'].includes(req.user.role)) {
    throw new AuthenticationError('Insufficient permissions for audit statistics', {
      reason: 'insufficient_permissions'
    });
  }

  const { timeRange = '24h' } = req.query;

  // Validate time range
  const validTimeRanges = ['1h', '24h', '7d', '30d'];
  if (!validTimeRanges.includes(timeRange)) {
    throw new ValidationError('Invalid time range', {
      field: 'timeRange',
      validValues: validTimeRanges,
      reason: 'invalid_time_range'
    });
  }

  try {
    const statistics = await complianceAuditService.getAuditStatistics(timeRange);

    return res.status(200).json(manufacturingResponse(
      statistics,
      'Audit statistics retrieved successfully',
      {
        action: 'get_audit_statistics',
        userId: req.user.id,
        timeRange,
        totalEvents: statistics.totalEvents,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to get audit statistics', {
      error: error.message,
      userId: req.user.id,
      timeRange,
      category: 'compliance_audit'
    });
    
    throw new ValidationError('Failed to retrieve audit statistics', {
      reason: 'statistics_retrieval_failed',
      details: error.message
    });
  }
});

/**
 * Export Audit Data
 * POST /api/v1/auth/compliance/export
 */
export const exportAuditData = asyncHandler(async (req, res) => {
  // Only system admins can export audit data
  if (req.user.role !== 'SYSTEM_ADMIN') {
    throw new AuthenticationError('Insufficient permissions for audit data export', {
      reason: 'insufficient_permissions'
    });
  }

  const { filters = {}, format = 'json' } = req.body;

  // Validate export format
  const validFormats = ['json', 'csv', 'xml'];
  if (!validFormats.includes(format)) {
    throw new ValidationError('Invalid export format', {
      field: 'format',
      validValues: validFormats,
      reason: 'invalid_format'
    });
  }

  try {
    const exportData = await complianceAuditService.exportAuditData(filters, format);

    // Set appropriate headers for download
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`);
    } else if (format === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.xml"`);
    }

    return res.status(200).json(manufacturingResponse(
      format === 'json' ? exportData : { data: exportData, format },
      'Audit data exported successfully',
      {
        action: 'export_audit_data',
        userId: req.user.id,
        format,
        filters: Object.keys(filters),
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to export audit data', {
      error: error.message,
      userId: req.user.id,
      filters,
      format,
      category: 'compliance_audit'
    });
    
    throw new ValidationError('Failed to export audit data', {
      reason: 'export_failed',
      details: error.message
    });
  }
});

/**
 * Cleanup Expired Audit Logs
 * POST /api/v1/auth/compliance/cleanup
 */
export const cleanupExpiredAuditLogs = asyncHandler(async (req, res) => {
  // Only system admins can perform cleanup operations
  if (req.user.role !== 'SYSTEM_ADMIN') {
    throw new AuthenticationError('Insufficient permissions for audit cleanup', {
      reason: 'insufficient_permissions'
    });
  }

  try {
    const cleanedCount = await complianceAuditService.cleanupExpiredAuditLogs();

    return res.status(200).json(manufacturingResponse(
      { cleanedCount },
      'Audit log cleanup completed successfully',
      {
        action: 'cleanup_expired_audit_logs',
        userId: req.user.id,
        cleanedCount,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to cleanup expired audit logs', {
      error: error.message,
      userId: req.user.id,
      category: 'compliance_audit'
    });
    
    throw new ValidationError('Failed to cleanup expired audit logs', {
      reason: 'cleanup_failed',
      details: error.message
    });
  }
});

/**
 * Get Compliance Frameworks
 * GET /api/v1/auth/compliance/frameworks
 */
export const getComplianceFrameworks = asyncHandler(async (req, res) => {
  try {
    const frameworks = complianceAuditService.complianceFrameworks;

    return res.status(200).json(manufacturingResponse(
      frameworks,
      'Compliance frameworks retrieved successfully',
      {
        action: 'get_compliance_frameworks',
        userId: req.user.id,
        count: Object.keys(frameworks).length,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to get compliance frameworks', {
      error: error.message,
      userId: req.user.id,
      category: 'compliance_audit'
    });
    
    throw new ValidationError('Failed to retrieve compliance frameworks', {
      reason: 'frameworks_retrieval_failed',
      details: error.message
    });
  }
});

/**
 * Get Audit Categories
 * GET /api/v1/auth/compliance/categories
 */
export const getAuditCategories = asyncHandler(async (req, res) => {
  try {
    const categories = complianceAuditService.auditCategories;

    return res.status(200).json(manufacturingResponse(
      categories,
      'Audit categories retrieved successfully',
      {
        action: 'get_audit_categories',
        userId: req.user.id,
        count: Object.keys(categories).length,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to get audit categories', {
      error: error.message,
      userId: req.user.id,
      category: 'compliance_audit'
    });
    
    throw new ValidationError('Failed to retrieve audit categories', {
      reason: 'categories_retrieval_failed',
      details: error.message
    });
  }
});

/**
 * Get Retention Policies
 * GET /api/v1/auth/compliance/retention-policies
 */
export const getRetentionPolicies = asyncHandler(async (req, res) => {
  try {
    const policies = complianceAuditService.retentionPolicies;
    
    // Convert milliseconds to days for readability
    const policiesInDays = {};
    for (const [category, ms] of Object.entries(policies)) {
      policiesInDays[category] = Math.round(ms / (24 * 60 * 60 * 1000));
    }

    return res.status(200).json(manufacturingResponse(
      {
        policies: policiesInDays,
        original: policies
      },
      'Retention policies retrieved successfully',
      {
        action: 'get_retention_policies',
        userId: req.user.id,
        count: Object.keys(policies).length,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to get retention policies', {
      error: error.message,
      userId: req.user.id,
      category: 'compliance_audit'
    });
    
    throw new ValidationError('Failed to retrieve retention policies', {
      reason: 'policies_retrieval_failed',
      details: error.message
    });
  }
});

/**
 * Get Compliance Dashboard
 * GET /api/v1/auth/compliance/dashboard
 */
export const getComplianceDashboard = asyncHandler(async (req, res) => {
  // Only system admins and QC managers can view compliance dashboard
  if (!['SYSTEM_ADMIN', 'QC_MANAGER'].includes(req.user.role)) {
    throw new AuthenticationError('Insufficient permissions for compliance dashboard', {
      reason: 'insufficient_permissions'
    });
  }

  try {
    // Get recent statistics
    const recentStats = await complianceAuditService.getAuditStatistics('24h');
    
    // Get compliance overview
    const dashboard = {
      timestamp: new Date().toISOString(),
      recentActivity: {
        totalEvents: recentStats.totalEvents,
        byLevel: recentStats.byLevel,
        byCategory: recentStats.byCategory,
        topActions: recentStats.topActions
      },
      complianceStatus: {
        frameworks: Object.keys(complianceAuditService.complianceFrameworks),
        categories: Object.keys(complianceAuditService.auditCategories),
        retentionPolicies: Object.keys(complianceAuditService.retentionPolicies)
      },
      systemHealth: {
        auditLogging: 'active',
        complianceMonitoring: 'active',
        dataRetention: 'active',
        exportCapabilities: 'active'
      }
    };

    return res.status(200).json(manufacturingResponse(
      dashboard,
      'Compliance dashboard retrieved successfully',
      {
        action: 'get_compliance_dashboard',
        userId: req.user.id,
        timestamp: req.timestamp
      }
    ));

  } catch (error) {
    manufacturingLogger.error('Failed to get compliance dashboard', {
      error: error.message,
      userId: req.user.id,
      category: 'compliance_audit'
    });
    
    throw new ValidationError('Failed to retrieve compliance dashboard', {
      reason: 'dashboard_retrieval_failed',
      details: error.message
    });
  }
});

export default {
  queryAuditLogs,
  generateComplianceReport,
  getAuditStatistics,
  exportAuditData,
  cleanupExpiredAuditLogs,
  getComplianceFrameworks,
  getAuditCategories,
  getRetentionPolicies,
  getComplianceDashboard
};
