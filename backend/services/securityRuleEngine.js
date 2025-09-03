/**
 * SecurityRuleEngine - Threshold-based security rule engine
 * Implements manufacturing-specific security rules and anomaly detection
 */

import StatisticalAnalyzer from './statisticalAnalyzer.js';
import { SECURITY_EVENT_TYPES, SECURITY_SEVERITY, SECURITY_CATEGORIES } from './securityEventEmitter.js';

class SecurityRuleEngine {
  constructor(options = {}) {
    this.options = {
      enableRealTimeMonitoring: options.enableRealTimeMonitoring !== false,
      ruleEvaluationInterval: options.ruleEvaluationInterval || 60000, // 1 minute
      maxRuleViolations: options.maxRuleViolations || 10,
      cooldownPeriod: options.cooldownPeriod || 300000, // 5 minutes
      ...options
    };

    this.analyzer = new StatisticalAnalyzer({
      windowSize: 1000,
      sensitivity: 2.5,
      minDataPoints: 20
    });

    this.rules = new Map();
    this.ruleViolations = new Map();
    this.ruleHistory = new Map();
    this.activeAlerts = new Map();

    this.initializeDefaultRules();
  }

  /**
   * Initialize default security rules for manufacturing
   */
  initializeDefaultRules() {
    // Authentication Rules
    this.addRule('auth-failure-burst', {
      type: 'threshold',
      metric: 'auth_failures_per_minute',
      threshold: 5,
      operator: 'greater_than',
      severity: 'high',
      category: 'authentication',
      description: 'Multiple authentication failures detected',
      cooldown: 300000, // 5 minutes
      actions: ['lock_account', 'alert_security_team', 'log_event']
    });

    this.addRule('auth-success-rate', {
      type: 'statistical',
      metric: 'auth_success_rate',
      threshold: 0.7, // 70% success rate
      operator: 'less_than',
      severity: 'medium',
      category: 'authentication',
      description: 'Low authentication success rate',
      cooldown: 600000, // 10 minutes
      actions: ['alert_security_team', 'log_event']
    });

    // Data Access Rules
    this.addRule('data-access-anomaly', {
      type: 'statistical',
      metric: 'data_access_frequency',
      threshold: 2.0, // 2 standard deviations
      operator: 'greater_than',
      severity: 'medium',
      category: 'data_access',
      description: 'Unusual data access pattern detected',
      cooldown: 180000, // 3 minutes
      actions: ['alert_security_team', 'log_event', 'require_additional_auth']
    });

    this.addRule('sensitive-data-access', {
      type: 'threshold',
      metric: 'sensitive_data_access_count',
      threshold: 10,
      operator: 'greater_than',
      severity: 'high',
      category: 'data_access',
      description: 'Excessive sensitive data access',
      cooldown: 300000, // 5 minutes
      actions: ['alert_security_team', 'log_event', 'suspend_user']
    });

    // Manufacturing Rules
    this.addRule('manufacturing-error-spike', {
      type: 'statistical',
      metric: 'manufacturing_errors_per_hour',
      threshold: 2.5,
      operator: 'greater_than',
      severity: 'high',
      category: 'manufacturing',
      description: 'Unusual manufacturing error rate',
      cooldown: 600000, // 10 minutes
      actions: ['alert_manufacturing_team', 'log_event', 'escalate_to_management']
    });

    this.addRule('equipment-failure-pattern', {
      type: 'pattern',
      metric: 'equipment_failures',
      pattern: 'consecutive_failures',
      threshold: 3,
      severity: 'critical',
      category: 'manufacturing',
      description: 'Consecutive equipment failures detected',
      cooldown: 120000, // 2 minutes
      actions: ['emergency_shutdown', 'alert_all_teams', 'log_event']
    });

    // System Rules
    this.addRule('system-performance-degradation', {
      type: 'statistical',
      metric: 'response_time',
      threshold: 2.0,
      operator: 'greater_than',
      severity: 'medium',
      category: 'system',
      description: 'System performance degradation detected',
      cooldown: 300000, // 5 minutes
      actions: ['alert_system_admin', 'log_event', 'scale_resources']
    });

    this.addRule('memory-usage-spike', {
      type: 'threshold',
      metric: 'memory_usage_percentage',
      threshold: 90,
      operator: 'greater_than',
      severity: 'high',
      category: 'system',
      description: 'High memory usage detected',
      cooldown: 180000, // 3 minutes
      actions: ['alert_system_admin', 'log_event', 'restart_services']
    });

    // Network Rules
    this.addRule('network-traffic-anomaly', {
      type: 'statistical',
      metric: 'network_traffic_volume',
      threshold: 2.5,
      operator: 'greater_than',
      severity: 'medium',
      category: 'network',
      description: 'Unusual network traffic pattern',
      cooldown: 300000, // 5 minutes
      actions: ['alert_network_admin', 'log_event', 'throttle_connections']
    });

    this.addRule('suspicious-ip-activity', {
      type: 'threshold',
      metric: 'requests_per_ip_per_minute',
      threshold: 100,
      operator: 'greater_than',
      severity: 'high',
      category: 'network',
      description: 'Suspicious IP activity detected',
      cooldown: 600000, // 10 minutes
      actions: ['block_ip', 'alert_security_team', 'log_event']
    });

    // Compliance Rules
    this.addRule('compliance-violation', {
      type: 'immediate',
      metric: 'compliance_violation',
      threshold: 1,
      operator: 'greater_than',
      severity: 'critical',
      category: 'compliance',
      description: 'Compliance violation detected',
      cooldown: 0,
      actions: ['immediate_alert', 'log_event', 'escalate_to_compliance_officer']
    });

    this.addRule('audit-log-tampering', {
      type: 'pattern',
      metric: 'audit_log_integrity',
      pattern: 'integrity_failure',
      threshold: 1,
      severity: 'critical',
      category: 'compliance',
      description: 'Audit log tampering detected',
      cooldown: 0,
      actions: ['immediate_alert', 'log_event', 'escalate_to_compliance_officer', 'backup_logs']
    });
  }

  /**
   * Add a new security rule
   */
  addRule(ruleId, ruleConfig) {
    const rule = {
      id: ruleId,
      ...ruleConfig,
      createdAt: Date.now(),
      isActive: true,
      violationCount: 0,
      lastViolation: null
    };

    this.rules.set(ruleId, rule);
    this.ruleViolations.set(ruleId, []);
    this.ruleHistory.set(ruleId, []);

    return rule;
  }

  /**
   * Remove a security rule
   */
  removeRule(ruleId) {
    this.rules.delete(ruleId);
    this.ruleViolations.delete(ruleId);
    this.ruleHistory.delete(ruleId);
    this.activeAlerts.delete(ruleId);
  }

  /**
   * Update rule configuration
   */
  updateRule(ruleId, updates) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      rule.updatedAt = Date.now();
    }
    return rule;
  }

  /**
   * Evaluate a metric against all applicable rules
   */
  evaluateMetric(metricName, value, context = {}) {
    const results = [];
    const timestamp = Date.now();

    // Add data point to analyzer
    this.analyzer.addDataPoint(metricName, value, timestamp);

    // Evaluate each rule
    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.isActive || rule.metric !== metricName) {
        continue;
      }

      // Check cooldown period
      if (this.isInCooldown(ruleId)) {
        continue;
      }

      const evaluation = this.evaluateRule(rule, value, context, timestamp);
      if (evaluation.violated) {
        results.push(evaluation);
        this.handleRuleViolation(ruleId, evaluation);
      }
    }

    return results;
  }

  /**
   * Evaluate a specific rule
   */
  evaluateRule(rule, value, context, timestamp) {
    let violated = false;
    let confidence = 0;
    let details = {};

    switch (rule.type) {
      case 'threshold':
        violated = this.evaluateThresholdRule(rule, value);
        confidence = violated ? 1.0 : 0;
        details = {
          value,
          threshold: rule.threshold,
          operator: rule.operator
        };
        break;

      case 'statistical':
        const anomalyResult = this.analyzer.detectAnomalies(rule.metric, value, timestamp);
        violated = anomalyResult.isAnomaly && anomalyResult.confidence > 0.7;
        confidence = anomalyResult.confidence;
        details = {
          value,
          anomalyResult,
          baseline: anomalyResult.baseline
        };
        break;

      case 'pattern':
        violated = this.evaluatePatternRule(rule, value, context, timestamp);
        confidence = violated ? 0.9 : 0;
        details = {
          value,
          pattern: rule.pattern,
          context
        };
        break;

      case 'immediate':
        violated = this.evaluateImmediateRule(rule, value, context);
        confidence = 1.0;
        details = {
          value,
          context
        };
        break;
    }

    return {
      ruleId: rule.id,
      violated,
      confidence,
      severity: rule.severity,
      category: rule.category,
      description: rule.description,
      actions: rule.actions,
      details,
      timestamp
    };
  }

  /**
   * Evaluate threshold-based rule
   */
  evaluateThresholdRule(rule, value) {
    switch (rule.operator) {
      case 'greater_than':
        return value > rule.threshold;
      case 'less_than':
        return value < rule.threshold;
      case 'equal_to':
        return value === rule.threshold;
      case 'not_equal_to':
        return value !== rule.threshold;
      case 'greater_than_or_equal':
        return value >= rule.threshold;
      case 'less_than_or_equal':
        return value <= rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Evaluate pattern-based rule
   */
  evaluatePatternRule(rule, value, context, timestamp) {
    switch (rule.pattern) {
      case 'consecutive_failures':
        return this.checkConsecutiveFailures(rule.metric, rule.threshold);
      case 'integrity_failure':
        return this.checkIntegrityFailure(value, context);
      case 'rapid_increase':
        return this.checkRapidIncrease(rule.metric, rule.threshold);
      default:
        return false;
    }
  }

  /**
   * Evaluate immediate rule
   */
  evaluateImmediateRule(rule, value, context) {
    // Immediate rules are always violated when triggered
    return true;
  }

  /**
   * Check for consecutive failures
   */
  checkConsecutiveFailures(metricName, threshold) {
    const window = this.analyzer.getDataWindow(metricName);
    if (window.length < threshold) {
      return false;
    }

    const recentValues = window.slice(-threshold);
    return recentValues.every(point => point.value > 0); // Assuming 0 means no failure
  }

  /**
   * Check for integrity failure
   */
  checkIntegrityFailure(value, context) {
    return value === 0 && context.integrityCheck === false;
  }

  /**
   * Check for rapid increase
   */
  checkRapidIncrease(metricName, threshold) {
    const window = this.analyzer.getDataWindow(metricName);
    if (window.length < 3) {
      return false;
    }

    const recentValues = window.slice(-3);
    const increase = recentValues[2].value - recentValues[0].value;
    return increase > threshold;
  }

  /**
   * Handle rule violation
   */
  handleRuleViolation(ruleId, evaluation) {
    const rule = this.rules.get(ruleId);
    if (!rule) return;

    // Update rule statistics
    rule.violationCount++;
    rule.lastViolation = Date.now();

    // Add to violation history
    const violations = this.ruleViolations.get(ruleId);
    violations.push(evaluation);

    // Add to rule history
    const history = this.ruleHistory.get(ruleId);
    history.push({
      timestamp: evaluation.timestamp,
      evaluation,
      actions: evaluation.actions
    });

    // Create active alert
    this.createActiveAlert(ruleId, evaluation);

    // Execute rule actions
    this.executeRuleActions(ruleId, evaluation);
  }

  /**
   * Create active alert
   */
  createActiveAlert(ruleId, evaluation) {
    const alert = {
      id: `alert_${ruleId}_${Date.now()}`,
      ruleId,
      severity: evaluation.severity,
      category: evaluation.category,
      description: evaluation.description,
      confidence: evaluation.confidence,
      details: evaluation.details,
      actions: evaluation.actions,
      createdAt: Date.now(),
      status: 'active',
      acknowledged: false,
      resolved: false
    };

    this.activeAlerts.set(alert.id, alert);
    return alert;
  }

  /**
   * Execute rule actions
   */
  executeRuleActions(ruleId, evaluation) {
    const rule = this.rules.get(ruleId);
    if (!rule) return;

    for (const action of evaluation.actions) {
      this.executeAction(action, evaluation);
    }
  }

  /**
   * Execute a specific action
   */
  executeAction(action, evaluation) {
    switch (action) {
      case 'alert_security_team':
        this.sendSecurityAlert(evaluation);
        break;
      case 'alert_manufacturing_team':
        this.sendManufacturingAlert(evaluation);
        break;
      case 'alert_system_admin':
        this.sendSystemAlert(evaluation);
        break;
      case 'alert_network_admin':
        this.sendNetworkAlert(evaluation);
        break;
      case 'log_event':
        this.logSecurityEvent(evaluation);
        break;
      case 'lock_account':
        this.lockAccount(evaluation);
        break;
      case 'suspend_user':
        this.suspendUser(evaluation);
        break;
      case 'block_ip':
        this.blockIP(evaluation);
        break;
      case 'emergency_shutdown':
        this.emergencyShutdown(evaluation);
        break;
      case 'immediate_alert':
        this.sendImmediateAlert(evaluation);
        break;
      case 'escalate_to_management':
        this.escalateToManagement(evaluation);
        break;
      case 'escalate_to_compliance_officer':
        this.escalateToComplianceOfficer(evaluation);
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  }

  /**
   * Check if rule is in cooldown period
   */
  isInCooldown(ruleId) {
    const rule = this.rules.get(ruleId);
    if (!rule || !rule.lastViolation) {
      return false;
    }

    const cooldownPeriod = rule.cooldown || this.options.cooldownPeriod;
    return (Date.now() - rule.lastViolation) < cooldownPeriod;
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity) {
    return this.getActiveAlerts().filter(alert => alert.severity === severity);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId, userId) {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = Date.now();
    }
    return alert;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId, userId, resolution) {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedBy = userId;
      alert.resolvedAt = Date.now();
      alert.resolution = resolution;
      alert.status = 'resolved';
    }
    return alert;
  }

  /**
   * Get rule statistics
   */
  getRuleStatistics() {
    const stats = {
      totalRules: this.rules.size,
      activeRules: Array.from(this.rules.values()).filter(rule => rule.isActive).length,
      totalViolations: 0,
      activeAlerts: this.activeAlerts.size,
      violationsBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    for (const rule of this.rules.values()) {
      stats.totalViolations += rule.violationCount;
    }

    for (const alert of this.activeAlerts.values()) {
      stats.violationsBySeverity[alert.severity]++;
    }

    return stats;
  }

  /**
   * Action implementations (placeholder methods)
   */
  sendSecurityAlert(evaluation) {
    console.log(`🚨 Security Alert: ${evaluation.description}`, evaluation);
  }

  sendManufacturingAlert(evaluation) {
    console.log(`🏭 Manufacturing Alert: ${evaluation.description}`, evaluation);
  }

  sendSystemAlert(evaluation) {
    console.log(`💻 System Alert: ${evaluation.description}`, evaluation);
  }

  sendNetworkAlert(evaluation) {
    console.log(`🌐 Network Alert: ${evaluation.description}`, evaluation);
  }

  sendImmediateAlert(evaluation) {
    console.log(`⚡ IMMEDIATE ALERT: ${evaluation.description}`, evaluation);
  }

  logSecurityEvent(evaluation) {
    console.log(`📝 Security Event Logged: ${evaluation.description}`, evaluation);
  }

  lockAccount(evaluation) {
    console.log(`🔒 Account Locked: ${evaluation.description}`, evaluation);
  }

  suspendUser(evaluation) {
    console.log(`⏸️ User Suspended: ${evaluation.description}`, evaluation);
  }

  blockIP(evaluation) {
    console.log(`🚫 IP Blocked: ${evaluation.description}`, evaluation);
  }

  emergencyShutdown(evaluation) {
    console.log(`🛑 EMERGENCY SHUTDOWN: ${evaluation.description}`, evaluation);
  }

  escalateToManagement(evaluation) {
    console.log(`📈 Escalated to Management: ${evaluation.description}`, evaluation);
  }

  escalateToComplianceOfficer(evaluation) {
    console.log(`📋 Escalated to Compliance Officer: ${evaluation.description}`, evaluation);
  }
}

export default SecurityRuleEngine;
