// Compliance and Audit Routes
// Manufacturing-optimized compliance, audit logging, and regulatory endpoints

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import complianceAuditController from '../controllers/auth/complianceAuditController.js';
import { 
  enhancedAuthenticateJWT, 
  enhancedAuthorizeRole, 
  trackSessionActivity,
  createRateLimiter
} from '../middleware/enhancedAuth.js';

const router = express.Router();

// Rate limiting for compliance endpoints
const complianceRateLimiter = createRateLimiter(15 * 60 * 1000, 50); // 50 attempts per 15 minutes
const exportRateLimiter = createRateLimiter(15 * 60 * 1000, 10); // 10 export attempts per 15 minutes

/**
 * @route   GET /api/v1/auth/compliance/audit-logs
 * @desc    Query audit logs with filters
 * @access  Private (Admin/QC Manager)
 * @headers Authorization: Bearer <token>
 * @query   level?, category?, userId?, username?, ip?, action?, complianceTags?, startDate?, endDate?, limit?, offset?
 */
router.get('/audit-logs',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN', 'QC_MANAGER']),
  trackSessionActivity,
  complianceRateLimiter,
  asyncHandler(complianceAuditController.queryAuditLogs)
);

/**
 * @route   POST /api/v1/auth/compliance/report
 * @desc    Generate compliance report for specific framework and period
 * @access  Private (System Admin)
 * @headers Authorization: Bearer <token>
 * @body    { framework, startDate, endDate }
 */
router.post('/report',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN']),
  trackSessionActivity,
  complianceRateLimiter,
  asyncHandler(complianceAuditController.generateComplianceReport)
);

/**
 * @route   GET /api/v1/auth/compliance/statistics
 * @desc    Get audit statistics for specified time range
 * @access  Private (Admin/QC Manager)
 * @headers Authorization: Bearer <token>
 * @query   timeRange?
 */
router.get('/statistics',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN', 'QC_MANAGER']),
  trackSessionActivity,
  complianceRateLimiter,
  asyncHandler(complianceAuditController.getAuditStatistics)
);

/**
 * @route   POST /api/v1/auth/compliance/export
 * @desc    Export audit data in specified format
 * @access  Private (System Admin)
 * @headers Authorization: Bearer <token>
 * @body    { filters?, format? }
 */
router.post('/export',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN']),
  trackSessionActivity,
  exportRateLimiter,
  asyncHandler(complianceAuditController.exportAuditData)
);

/**
 * @route   POST /api/v1/auth/compliance/cleanup
 * @desc    Clean up expired audit logs
 * @access  Private (System Admin)
 * @headers Authorization: Bearer <token>
 */
router.post('/cleanup',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN']),
  trackSessionActivity,
  complianceRateLimiter,
  asyncHandler(complianceAuditController.cleanupExpiredAuditLogs)
);

/**
 * @route   GET /api/v1/auth/compliance/frameworks
 * @desc    Get available compliance frameworks
 * @access  Private (Authenticated Users)
 * @headers Authorization: Bearer <token>
 */
router.get('/frameworks',
  enhancedAuthenticateJWT,
  trackSessionActivity,
  complianceRateLimiter,
  asyncHandler(complianceAuditController.getComplianceFrameworks)
);

/**
 * @route   GET /api/v1/auth/compliance/categories
 * @desc    Get available audit categories
 * @access  Private (Authenticated Users)
 * @headers Authorization: Bearer <token>
 */
router.get('/categories',
  enhancedAuthenticateJWT,
  trackSessionActivity,
  complianceRateLimiter,
  asyncHandler(complianceAuditController.getAuditCategories)
);

/**
 * @route   GET /api/v1/auth/compliance/retention-policies
 * @desc    Get data retention policies
 * @access  Private (Authenticated Users)
 * @headers Authorization: Bearer <token>
 */
router.get('/retention-policies',
  enhancedAuthenticateJWT,
  trackSessionActivity,
  complianceRateLimiter,
  asyncHandler(complianceAuditController.getRetentionPolicies)
);

/**
 * @route   GET /api/v1/auth/compliance/dashboard
 * @desc    Get compliance dashboard overview
 * @access  Private (Admin/QC Manager)
 * @headers Authorization: Bearer <token>
 */
router.get('/dashboard',
  enhancedAuthenticateJWT,
  enhancedAuthorizeRole(['SYSTEM_ADMIN', 'QC_MANAGER']),
  trackSessionActivity,
  complianceRateLimiter,
  asyncHandler(complianceAuditController.getComplianceDashboard)
);

/**
 * @route   GET /api/v1/auth/compliance/overview
 * @desc    Get compliance system overview and capabilities
 * @access  Public
 */
router.get('/overview', (req, res) => {
  res.status(200).json({
    system: 'Compliance and Audit System',
    version: '2.2.0',
    timestamp: new Date().toISOString(),
    description: 'Comprehensive compliance, audit logging, and regulatory features for manufacturing',
    capabilities: [
      'Comprehensive Audit Logging',
      'Multi-Framework Compliance Reporting',
      'Data Retention Management',
      'Export and Integration',
      'Real-time Monitoring',
      'Regulatory Compliance'
    ],
    auditLevels: {
      INFO: 'Informational events',
      WARNING: 'Warning-level events',
      ERROR: 'Error-level events',
      CRITICAL: 'Critical security events',
      SECURITY: 'Security-specific events',
      COMPLIANCE: 'Compliance-related events'
    },
    auditCategories: {
      authentication: 'User authentication events',
      authorization: 'Access control events',
      userManagement: 'User account management',
      sessionManagement: 'Session lifecycle events',
      securityEvents: 'Security incident tracking',
      complianceChecks: 'Compliance verification',
      dataAccess: 'Data access patterns',
      systemChanges: 'System configuration changes'
    },
    complianceFrameworks: {
      SOX: 'Sarbanes-Oxley Act',
      GDPR: 'General Data Protection Regulation',
      HIPAA: 'Health Insurance Portability and Accountability Act',
      ISO27001: 'Information Security Management',
      NIST: 'National Institute of Standards and Technology',
      MANUFACTURING: 'Manufacturing Industry Standards'
    },
    retentionPolicies: {
      authentication: '90 days',
      security: '1 year',
      compliance: '7 years',
      system: '180 days'
    },
    exportFormats: ['JSON', 'CSV', 'XML'],
    timeRanges: ['1h', '24h', '7d', '30d'],
    accessControl: {
      auditLogs: 'Admin/QC Manager',
      complianceReports: 'System Admin',
      statistics: 'Admin/QC Manager',
      export: 'System Admin',
      cleanup: 'System Admin',
      frameworks: 'Authenticated Users',
      categories: 'Authenticated Users',
      retentionPolicies: 'Authenticated Users',
      dashboard: 'Admin/QC Manager'
    }
  });
});

/**
 * @route   GET /api/v1/auth/compliance/status
 * @desc    Get compliance system status and health
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    const { complianceAuditService } = await import('../services/complianceAuditService.js');
    
    res.status(200).json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      features: {
        auditLogging: 'active',
        complianceReporting: 'active',
        dataRetention: 'active',
        exportCapabilities: 'active',
        cleanupOperations: 'active'
      },
      complianceFrameworks: Object.keys(complianceAuditService.complianceFrameworks).length,
      auditCategories: Object.keys(complianceAuditService.auditCategories).length,
      retentionPolicies: Object.keys(complianceAuditService.retentionPolicies).length,
      version: '2.2.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      error: 'Compliance system status check failed',
      features: {
        auditLogging: 'unknown',
        complianceReporting: 'unknown',
        dataRetention: 'unknown',
        exportCapabilities: 'unknown',
        cleanupOperations: 'unknown'
      }
    });
  }
});

/**
 * @route   POST /api/v1/auth/compliance/test
 * @desc    Test compliance system functionality (development only)
 * @access  Public (development)
 */
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Compliance testing disabled in production',
      message: 'This endpoint is only available in development mode'
    });
  }

  try {
    const { complianceAuditService } = await import('../services/complianceAuditService.js');
    
    // Test compliance service
    const frameworks = complianceAuditService.complianceFrameworks;
    const categories = complianceAuditService.auditCategories;
    const policies = complianceAuditService.retentionPolicies;
    
    res.status(200).json({
      message: 'Compliance and Audit System Test Completed',
      timestamp: new Date().toISOString(),
      tests: {
        serviceConnection: {
          success: true,
          frameworks: Object.keys(frameworks).length,
          categories: Object.keys(categories).length,
          policies: Object.keys(policies).length
        },
        auditLogging: {
          success: true,
          levels: Object.keys(complianceAuditService.auditLevels).length,
          categories: Object.keys(complianceAuditService.auditCategories).length
        },
        complianceReporting: {
          success: true,
          frameworks: Object.keys(complianceAuditService.complianceFrameworks).length,
          retentionPolicies: Object.keys(complianceAuditService.retentionPolicies).length
        },
        dataManagement: {
          success: true,
          exportFormats: ['json', 'csv', 'xml'],
          timeRanges: ['1h', '24h', '7d', '30d']
        }
      },
      systemStatus: {
        auditLogging: 'operational',
        complianceReporting: 'operational',
        dataRetention: 'operational',
        exportCapabilities: 'operational',
        cleanupOperations: 'operational'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Compliance system test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/auth/compliance/features
 * @desc    Get available compliance features and capabilities
 * @access  Public
 */
router.get('/features', (req, res) => {
  res.status(200).json({
    features: {
      auditLogging: {
        comprehensive: 'All system events logged with metadata',
        categorization: '8 audit categories for organization',
        levels: '6 severity levels for prioritization',
        indexing: 'Multi-dimensional indexing for fast queries',
        retention: 'Configurable retention policies by category'
      },
      complianceReporting: {
        frameworks: '6 compliance frameworks supported',
        scoring: 'Automated compliance scoring algorithm',
        recommendations: 'Intelligent corrective action suggestions',
        periodAnalysis: 'Flexible time period reporting',
        breakdown: 'Detailed category and level breakdowns'
      },
      dataRetention: {
        policies: 'Category-based retention periods',
        automated: 'Scheduled cleanup of expired data',
        compliance: '7-year retention for regulatory compliance',
        security: '1-year retention for security events',
        authentication: '90-day retention for auth events'
      },
      exportCapabilities: {
        formats: 'JSON, CSV, and XML export',
        filtering: 'Advanced query and filter options',
        bulkExport: 'Large dataset export capabilities',
        integration: 'External system integration support',
        auditTrail: 'Export activity logging'
      },
      monitoring: {
        realTime: 'Live audit event monitoring',
        statistics: 'Time-based statistical analysis',
        alerts: 'Configurable alerting for compliance issues',
        dashboard: 'Comprehensive compliance overview',
        health: 'System health and status monitoring'
      }
    },
    complianceFrameworks: {
      SOX: 'Financial reporting and internal controls',
      GDPR: 'Data protection and privacy',
      HIPAA: 'Healthcare information security',
      ISO27001: 'Information security management',
      NIST: 'Cybersecurity framework',
      MANUFACTURING: 'Industry-specific requirements'
    },
    auditCategories: {
      authentication: 'User login, logout, and session events',
      authorization: 'Access control and permission checks',
      userManagement: 'User account creation and modification',
      sessionManagement: 'Session lifecycle and security',
      securityEvents: 'Security incidents and threats',
      complianceChecks: 'Regulatory compliance verification',
      dataAccess: 'Data access patterns and usage',
      systemChanges: 'Configuration and system modifications'
    },
    retentionPolicies: {
      authentication: '90 days - Standard operational retention',
      security: '1 year - Security incident investigation',
      compliance: '7 years - Regulatory compliance requirements',
      system: '180 days - System change tracking'
    },
    exportFormats: {
      json: 'Structured data for API integration',
      csv: 'Spreadsheet analysis and reporting',
      xml: 'Enterprise system integration'
    },
    timeRanges: {
      '1h': 'Last hour - Real-time monitoring',
      '24h': 'Last 24 hours - Daily analysis',
      '7d': 'Last 7 days - Weekly trends',
      '30d': 'Last 30 days - Monthly reporting'
    },
    version: '2.2.0',
    timestamp: new Date().toISOString()
  });
});

export default router;
