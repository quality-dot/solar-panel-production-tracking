// Compliance Framework Routes
// ISA-99, NIST, and GDPR compliance endpoints for security dashboard

import express from 'express';
import ComplianceService from '../services/complianceService.js';
import ComplianceMonitoringService from '../services/complianceMonitoringService.js';
import ComplianceValidationService from '../services/complianceValidationService.js';
import EnterpriseLoggingService from '../services/enterpriseLoggingService.js';
import StructuredLoggingService from '../services/structuredLoggingService.js';

const router = express.Router();

// Initialize services
const complianceService = new ComplianceService();
const enterpriseLogger = new EnterpriseLoggingService({ fileLog: false, consoleLog: true });
const structuredLogger = new StructuredLoggingService(enterpriseLogger);
const complianceValidationService = new ComplianceValidationService(enterpriseLogger);
const monitoringService = new ComplianceMonitoringService(complianceService, enterpriseLogger, structuredLogger);

/**
 * @route   GET /api/v1/compliance/status
 * @desc    Get overall compliance status for all frameworks
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    const correlationId = structuredLogger.generateCorrelationId();
    structuredLogger.info('COMPLIANCE_STATUS_REQUEST', 'Fetching compliance status', { correlationId });

    const status = complianceService.getComplianceStatus();
    
    res.status(200).json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
      correlationId
    });
  } catch (error) {
    structuredLogger.error('COMPLIANCE_STATUS_ERROR', 'Failed to fetch compliance status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compliance status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/compliance/requirements
 * @desc    Get compliance requirements for all frameworks
 * @access  Public
 */
router.get('/requirements', async (req, res) => {
  try {
    const correlationId = structuredLogger.generateCorrelationId();
    structuredLogger.info('COMPLIANCE_REQUIREMENTS_REQUEST', 'Fetching compliance requirements', { correlationId });

    const requirements = complianceService.getComplianceRequirements();
    
    res.status(200).json({
      success: true,
      data: requirements,
      timestamp: new Date().toISOString(),
      correlationId
    });
  } catch (error) {
    structuredLogger.error('COMPLIANCE_REQUIREMENTS_ERROR', 'Failed to fetch compliance requirements', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compliance requirements',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/v1/compliance/assessment
 * @desc    Perform compliance assessment for all frameworks
 * @access  Public
 */
router.post('/assessment', async (req, res) => {
  try {
    const correlationId = structuredLogger.generateCorrelationId();
    structuredLogger.info('COMPLIANCE_ASSESSMENT_REQUEST', 'Starting compliance assessment', { correlationId });

    const assessment = await complianceService.performAssessment();
    
    res.status(200).json({
      success: true,
      data: assessment,
      timestamp: new Date().toISOString(),
      correlationId
    });
  } catch (error) {
    structuredLogger.error('COMPLIANCE_ASSESSMENT_ERROR', 'Failed to perform compliance assessment', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to perform compliance assessment',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/compliance/monitoring/status
 * @desc    Get compliance monitoring status and alerts
 * @access  Public
 */
router.get('/monitoring/status', async (req, res) => {
  try {
    const correlationId = structuredLogger.generateCorrelationId();
    structuredLogger.info('COMPLIANCE_MONITORING_REQUEST', 'Fetching compliance monitoring status', { correlationId });

    const report = await monitoringService.generateComplianceReport();
    
    res.status(200).json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
      correlationId
    });
  } catch (error) {
    structuredLogger.error('COMPLIANCE_MONITORING_ERROR', 'Failed to fetch compliance monitoring status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compliance monitoring status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/v1/compliance/monitoring/start
 * @desc    Start compliance monitoring
 * @access  Public
 */
router.post('/monitoring/start', async (req, res) => {
  try {
    const correlationId = structuredLogger.generateCorrelationId();
    structuredLogger.info('COMPLIANCE_MONITORING_START', 'Starting compliance monitoring', { correlationId });

    monitoringService.startMonitoring();
    
    res.status(200).json({
      success: true,
      message: 'Compliance monitoring started',
      timestamp: new Date().toISOString(),
      correlationId
    });
  } catch (error) {
    structuredLogger.error('COMPLIANCE_MONITORING_START_ERROR', 'Failed to start compliance monitoring', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to start compliance monitoring',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/v1/compliance/monitoring/stop
 * @desc    Stop compliance monitoring
 * @access  Public
 */
router.post('/monitoring/stop', async (req, res) => {
  try {
    const correlationId = structuredLogger.generateCorrelationId();
    structuredLogger.info('COMPLIANCE_MONITORING_STOP', 'Stopping compliance monitoring', { correlationId });

    monitoringService.stopMonitoring();
    
    res.status(200).json({
      success: true,
      message: 'Compliance monitoring stopped',
      timestamp: new Date().toISOString(),
      correlationId
    });
  } catch (error) {
    structuredLogger.error('COMPLIANCE_MONITORING_STOP_ERROR', 'Failed to stop compliance monitoring', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to stop compliance monitoring',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/v1/compliance/validate
 * @desc    Validate specific compliance requirement
 * @access  Public
 */
router.post('/validate', async (req, res) => {
  try {
    const { requirement, data } = req.body;
    const correlationId = structuredLogger.generateCorrelationId();
    
    structuredLogger.info('COMPLIANCE_VALIDATION_REQUEST', 'Validating compliance requirement', { 
      correlationId, 
      requirement 
    });

    if (!requirement) {
      return res.status(400).json({
        success: false,
        error: 'Requirement parameter is required',
        timestamp: new Date().toISOString()
      });
    }

    const validation = await complianceValidationService.validateRequirement(requirement, data);
    
    res.status(200).json({
      success: true,
      data: validation,
      timestamp: new Date().toISOString(),
      correlationId
    });
  } catch (error) {
    structuredLogger.error('COMPLIANCE_VALIDATION_ERROR', 'Failed to validate compliance requirement', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to validate compliance requirement',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/v1/compliance/enforce
 * @desc    Enforce specific compliance requirement
 * @access  Public
 */
router.post('/enforce', async (req, res) => {
  try {
    const { requirement, data } = req.body;
    const correlationId = structuredLogger.generateCorrelationId();
    
    structuredLogger.info('COMPLIANCE_ENFORCEMENT_REQUEST', 'Enforcing compliance requirement', { 
      correlationId, 
      requirement 
    });

    if (!requirement) {
      return res.status(400).json({
        success: false,
        error: 'Requirement parameter is required',
        timestamp: new Date().toISOString()
      });
    }

    const enforcement = await complianceValidationService.enforceRequirement(requirement, data);
    
    res.status(200).json({
      success: true,
      data: enforcement,
      timestamp: new Date().toISOString(),
      correlationId
    });
  } catch (error) {
    structuredLogger.error('COMPLIANCE_ENFORCEMENT_ERROR', 'Failed to enforce compliance requirement', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to enforce compliance requirement',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/compliance/frameworks
 * @desc    Get available compliance frameworks
 * @access  Public
 */
router.get('/frameworks', async (req, res) => {
  try {
    const correlationId = structuredLogger.generateCorrelationId();
    structuredLogger.info('COMPLIANCE_FRAMEWORKS_REQUEST', 'Fetching available compliance frameworks', { correlationId });

    const frameworks = {
      isa99: {
        name: 'ISA-99 (IEC 62443)',
        description: 'Industrial automation and control system security',
        version: '3.0',
        requirements: complianceService.getComplianceRequirements().isa99
      },
      nist: {
        name: 'NIST Cybersecurity Framework',
        description: 'Framework for managing cybersecurity risk',
        version: '1.1',
        requirements: complianceService.getComplianceRequirements().nist
      },
      gdpr: {
        name: 'GDPR',
        description: 'General Data Protection Regulation',
        version: '2018',
        requirements: complianceService.getComplianceRequirements().gdpr
      }
    };
    
    res.status(200).json({
      success: true,
      data: frameworks,
      timestamp: new Date().toISOString(),
      correlationId
    });
  } catch (error) {
    structuredLogger.error('COMPLIANCE_FRAMEWORKS_ERROR', 'Failed to fetch compliance frameworks', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compliance frameworks',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/compliance/overview
 * @desc    Get compliance system overview
 * @access  Public
 */
router.get('/overview', async (req, res) => {
  try {
    const correlationId = structuredLogger.generateCorrelationId();
    structuredLogger.info('COMPLIANCE_OVERVIEW_REQUEST', 'Fetching compliance system overview', { correlationId });

    const overview = {
      system: 'Compliance Framework System',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      description: 'ISA-99, NIST, and GDPR compliance management system',
      frameworks: {
        isa99: 'Industrial automation and control system security',
        nist: 'Cybersecurity framework for risk management',
        gdpr: 'Data protection and privacy regulation'
      },
      capabilities: [
        'Compliance status monitoring',
        'Automated compliance assessments',
        'Real-time compliance validation',
        'Compliance enforcement actions',
        'Comprehensive compliance reporting',
        'Multi-framework support'
      ],
      services: {
        complianceService: 'Core compliance management',
        complianceMonitoringService: 'Real-time compliance monitoring',
        complianceValidationService: 'Compliance validation and enforcement',
        enterpriseLoggingService: 'Enterprise-grade logging',
        structuredLoggingService: 'Structured logging with correlation IDs'
      }
    };
    
    res.status(200).json({
      success: true,
      data: overview,
      correlationId
    });
  } catch (error) {
    structuredLogger.error('COMPLIANCE_OVERVIEW_ERROR', 'Failed to fetch compliance overview', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compliance overview',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/compliance/stream
 * @desc    Server-Sent Events stream for real-time compliance updates
 * @access  Public
 */
router.get('/stream', async (req, res) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.flushHeaders?.();

  const sendEvent = (event) => {
    res.write(`event: complianceUpdate\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // Send initial compliance status
  try {
    const status = complianceService.getComplianceStatus();
    res.write(`event: snapshot\n`);
    res.write(`data: ${JSON.stringify({ complianceStatus: status })}\n\n`);
  } catch (error) {
    structuredLogger.error('COMPLIANCE_STREAM_ERROR', 'Failed to send initial compliance status', { error: error.message });
  }

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`event: ping\n`);
    res.write(`data: {"ts": ${Date.now()}}\n\n`);
  }, 30000);

  // Subscribe to compliance monitoring events
  const listener = (event) => sendEvent(event);
  monitoringService.on('complianceUpdate', listener);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    monitoringService.off('complianceUpdate', listener);
  });
});

export default router;
