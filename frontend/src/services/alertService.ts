/**
 * Alert Service
 * Task: 22.6.4 - Create alert system with configurable thresholds
 */

export interface AlertThresholds {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface SecurityAlert {
  id: string;
  type: 'threat' | 'compliance' | 'equipment' | 'access' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  source: string;
  context?: Record<string, any>;
  correlationId?: string;
  title?: string;
  acknowledged?: boolean;
  actions?: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: (metrics: any) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'threat' | 'compliance' | 'equipment' | 'access' | 'system';
  category: string;
  enabled: boolean;
  threshold?: number;
  cooldown?: number; // seconds
  lastTriggered?: string;
}

export interface AlertConfig {
  thresholds: AlertThresholds;
  rules: AlertRule[];
  notifications: {
    email: boolean;
    browser: boolean;
    sound: boolean;
    desktop: boolean;
  };
  escalation: {
    enabled: boolean;
    levels: Array<{
      severity: string;
      delay: number; // minutes
      actions: string[];
    }>;
  };
}

class AlertService {
  private config: AlertConfig;
  private activeAlerts: Map<string, SecurityAlert> = new Map();
  private alertHistory: SecurityAlert[] = [];
  private eventListeners: Map<string, Function[]> = new Map();
  private cooldowns: Map<string, number> = new Map();

  constructor() {
    this.config = this.getDefaultConfig();
    this.initializeDefaultRules();
  }

  private getDefaultConfig(): AlertConfig {
    return {
      thresholds: {
        critical: 1,
        high: 5,
        medium: 10,
        low: 20
      },
      rules: [],
      notifications: {
        email: false,
        browser: true,
        sound: true,
        desktop: false
      },
      escalation: {
        enabled: true,
        levels: [
          { severity: 'critical', delay: 0, actions: ['immediate_notification', 'escalate_to_admin'] },
          { severity: 'high', delay: 5, actions: ['notification', 'log_incident'] },
          { severity: 'medium', delay: 15, actions: ['notification'] },
          { severity: 'low', delay: 60, actions: ['log_only'] }
        ]
      }
    };
  }

  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      // Threshold-based rules
      {
        id: 'critical-events-threshold',
        name: 'Critical Events Threshold',
        description: 'Alert when critical security events exceed threshold',
        condition: (metrics) => metrics.criticalEvents >= this.config.thresholds.critical,
        severity: 'critical',
        type: 'threat',
        category: 'Security Events',
        enabled: true,
        threshold: this.config.thresholds.critical,
        cooldown: 300 // 5 minutes
      },
      {
        id: 'high-events-threshold',
        name: 'High Severity Events Threshold',
        description: 'Alert when high severity events exceed threshold',
        condition: (metrics) => metrics.criticalEvents + metrics.warningEvents >= this.config.thresholds.high,
        severity: 'high',
        type: 'threat',
        category: 'Security Events',
        enabled: true,
        threshold: this.config.thresholds.high,
        cooldown: 600 // 10 minutes
      },
      {
        id: 'risk-score-high',
        name: 'High Risk Score',
        description: 'Alert when overall risk score is high',
        condition: (metrics) => metrics.riskScore >= 80,
        severity: 'high',
        type: 'threat',
        category: 'Risk Assessment',
        enabled: true,
        cooldown: 900 // 15 minutes
      },
      {
        id: 'compliance-score-low',
        name: 'Low Compliance Score',
        description: 'Alert when compliance score drops below threshold',
        condition: (metrics) => metrics.complianceScore < 70,
        severity: 'medium',
        type: 'compliance',
        category: 'Compliance',
        enabled: true,
        cooldown: 1800 // 30 minutes
      },
      {
        id: 'active-incidents-high',
        name: 'High Active Incidents',
        description: 'Alert when active incidents exceed threshold',
        condition: (metrics) => metrics.activeIncidents >= 5,
        severity: 'high',
        type: 'system',
        category: 'System Health',
        enabled: true,
        cooldown: 1200 // 20 minutes
      },
      {
        id: 'connection-lost',
        name: 'Connection Lost',
        description: 'Alert when real-time connection is lost',
        condition: (status) => status === 'error' || status === 'disconnected',
        severity: 'medium',
        type: 'system',
        category: 'Connectivity',
        enabled: true,
        cooldown: 60 // 1 minute
      }
    ];

    this.config.rules = defaultRules;
  }

  // Configuration Management
  updateThresholds(thresholds: Partial<AlertThresholds>): void {
    this.config.thresholds = { ...this.config.thresholds, ...thresholds };
    this.emit('configUpdated', { type: 'thresholds', config: this.config.thresholds });
  }

  updateNotifications(notifications: Partial<AlertConfig['notifications']>): void {
    this.config.notifications = { ...this.config.notifications, ...notifications };
    this.emit('configUpdated', { type: 'notifications', config: this.config.notifications });
  }

  updateRule(ruleId: string, updates: Partial<AlertRule>): void {
    const ruleIndex = this.config.rules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex !== -1) {
      this.config.rules[ruleIndex] = { ...this.config.rules[ruleIndex], ...updates };
      this.emit('configUpdated', { type: 'rule', ruleId, updates });
    }
  }

  addRule(rule: AlertRule): void {
    this.config.rules.push(rule);
    this.emit('configUpdated', { type: 'ruleAdded', rule });
  }

  removeRule(ruleId: string): void {
    this.config.rules = this.config.rules.filter(rule => rule.id !== ruleId);
    this.emit('configUpdated', { type: 'ruleRemoved', ruleId });
  }

  getConfig(): AlertConfig {
    return { ...this.config };
  }

  // Alert Processing
  processMetrics(metrics: any): SecurityAlert[] {
    const newAlerts: SecurityAlert[] = [];

    for (const rule of this.config.rules) {
      if (!rule.enabled) continue;

      // Check cooldown
      const cooldownKey = `${rule.id}-${rule.severity}`;
      const lastTriggered = this.cooldowns.get(cooldownKey) || 0;
      const now = Date.now();
      
      if (rule.cooldown && (now - lastTriggered) < (rule.cooldown * 1000)) {
        continue;
      }

      // Check condition
      if (rule.condition(metrics)) {
        const alert = this.createAlert(rule, metrics);
        newAlerts.push(alert);
        this.cooldowns.set(cooldownKey, now);
        rule.lastTriggered = new Date().toISOString();
      }
    }

    return newAlerts;
  }

  // Process individual security events for incident-based alerts
  processSecurityEvent(event: any): SecurityAlert[] {
    const newAlerts: SecurityAlert[] = [];

    // Define incident-based alert rules
    const incidentRules = this.getIncidentBasedRules();

    for (const rule of incidentRules) {
      if (!rule.enabled) continue;

      // Check cooldown
      const cooldownKey = `${rule.id}-${event.eventType || event.type}`;
      const lastTriggered = this.cooldowns.get(cooldownKey) || 0;
      const now = Date.now();
      
      if (rule.cooldown && (now - lastTriggered) < (rule.cooldown * 1000)) {
        continue;
      }

      // Check if this event matches the rule condition
      if (rule.condition(event)) {
        const alert = this.createAlert(rule, event);
        newAlerts.push(alert);
        this.cooldowns.set(cooldownKey, now);
        rule.lastTriggered = new Date().toISOString();
      }
    }

    return newAlerts;
  }

  private getIncidentBasedRules(): AlertRule[] {
    return [
      {
        id: 'auth-failure-burst',
        name: 'Authentication Failure Burst',
        description: 'Multiple authentication failures detected',
        condition: (event) => {
          return event.eventType === 'auth_failure' || 
                 event.eventType === 'user.login.failed' ||
                 (event.type === 'auth' && event.severity === 'warning');
        },
        severity: 'high',
        type: 'threat',
        category: 'Authentication',
        enabled: true,
        cooldown: 300 // 5 minutes
      },
      {
        id: 'unauthorized-access',
        name: 'Unauthorized Access Attempt',
        description: 'Unauthorized access to sensitive data detected',
        condition: (event) => {
          return event.eventType === 'data.access.unauthorized' ||
                 event.eventType === 'data_read' ||
                 (event.type === 'access' && event.severity === 'error');
        },
        severity: 'high',
        type: 'access',
        category: 'Data Access',
        enabled: true,
        cooldown: 180 // 3 minutes
      },
      {
        id: 'equipment-failure',
        name: 'Critical Equipment Failure',
        description: 'Critical manufacturing equipment failure detected',
        condition: (event) => {
          return event.eventType === 'equipment.status.error' ||
                 event.eventType === 'system_error' ||
                 (event.type === 'equipment' && event.severity === 'critical');
        },
        severity: 'critical',
        type: 'equipment',
        category: 'Manufacturing',
        enabled: true,
        cooldown: 120 // 2 minutes
      },
      {
        id: 'threat-detected',
        name: 'Security Threat Detected',
        description: 'Active security threat detected by system',
        condition: (event) => {
          return event.eventType === 'threat_detected' ||
                 event.eventType === 'THREAT_DETECTED' ||
                 (event.type === 'threat' && event.severity === 'high');
        },
        severity: 'critical',
        type: 'threat',
        category: 'Security',
        enabled: true,
        cooldown: 60 // 1 minute
      },
      {
        id: 'compliance-violation',
        name: 'Compliance Violation',
        description: 'Regulatory compliance violation detected',
        condition: (event) => {
          return event.eventType === 'compliance_violation' ||
                 event.eventType === 'COMPLIANCE_VIOLATION' ||
                 (event.type === 'compliance' && event.severity === 'high');
        },
        severity: 'high',
        type: 'compliance',
        category: 'Compliance',
        enabled: true,
        cooldown: 600 // 10 minutes
      },
      {
        id: 'system-error',
        name: 'System Error',
        description: 'Critical system error detected',
        condition: (event) => {
          return event.eventType === 'system_error' ||
                 event.eventType === 'SYSTEM_ERROR' ||
                 (event.type === 'system' && event.severity === 'critical');
        },
        severity: 'high',
        type: 'system',
        category: 'System Health',
        enabled: true,
        cooldown: 300 // 5 minutes
      },
      {
        id: 'data-breach-attempt',
        name: 'Data Breach Attempt',
        description: 'Potential data breach attempt detected',
        condition: (event) => {
          return event.eventType === 'data_delete' ||
                 event.eventType === 'data_export' ||
                 (event.type === 'data' && event.severity === 'high');
        },
        severity: 'critical',
        type: 'threat',
        category: 'Data Security',
        enabled: true,
        cooldown: 180 // 3 minutes
      },
      {
        id: 'manufacturing-sabotage',
        name: 'Manufacturing Sabotage',
        description: 'Potential manufacturing sabotage detected',
        condition: (event) => {
          return event.eventType === 'manufacturing_modification' ||
                 event.eventType === 'manufacturing_deletion' ||
                 (event.type === 'manufacturing' && event.severity === 'high');
        },
        severity: 'critical',
        type: 'threat',
        category: 'Manufacturing Security',
        enabled: true,
        cooldown: 120 // 2 minutes
      }
    ];
  }

  processConnectionStatus(status: string): SecurityAlert[] {
    const newAlerts: SecurityAlert[] = [];

    for (const rule of this.config.rules) {
      if (!rule.enabled || rule.id !== 'connection-lost') continue;

      if (rule.condition(status)) {
        const alert = this.createAlert(rule, { status });
        newAlerts.push(alert);
      }
    }

    return newAlerts;
  }

  private createAlert(rule: AlertRule, context: any): SecurityAlert {
    const alert: SecurityAlert = {
      id: `${rule.id}-${Date.now()}`,
      type: rule.type,
      severity: rule.severity,
      message: this.generateAlertMessage(rule, context),
      timestamp: new Date().toISOString(),
      status: 'active',
      priority: this.getPriorityFromSeverity(rule.severity),
      category: rule.category,
      source: 'AlertService',
      context,
      correlationId: `alert-${Date.now()}`,
      title: rule.name,
      acknowledged: false,
      actions: this.getRecommendedActions(rule)
    };

    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    // Keep only last 1000 alerts in history
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-1000);
    }

    this.emit('alertGenerated', alert);
    this.handleNotifications(alert);

    return alert;
  }

  private generateAlertMessage(rule: AlertRule, context: any): string {
    switch (rule.id) {
      // Threshold-based rules
      case 'critical-events-threshold':
        return `Critical security events threshold exceeded: ${context.criticalEvents} events (threshold: ${rule.threshold})`;
      case 'high-events-threshold':
        return `High severity events threshold exceeded: ${context.criticalEvents + context.warningEvents} events (threshold: ${rule.threshold})`;
      case 'risk-score-high':
        return `High risk score detected: ${context.riskScore}% (threshold: 80%)`;
      case 'compliance-score-low':
        return `Low compliance score detected: ${context.complianceScore}% (threshold: 70%)`;
      case 'active-incidents-high':
        return `High number of active incidents: ${context.activeIncidents} (threshold: 5)`;
      case 'connection-lost':
        return `Real-time connection lost: ${context.status}`;
      
      // Incident-based rules
      case 'auth-failure-burst':
        return `Authentication failure detected: ${context.eventType || context.type} from ${context.source || 'unknown source'}`;
      case 'unauthorized-access':
        return `Unauthorized access attempt: ${context.eventType || context.type} - ${context.message || 'Access denied'}`;
      case 'equipment-failure':
        return `Critical equipment failure: ${context.eventType || context.type} - ${context.message || 'Equipment malfunction'}`;
      case 'threat-detected':
        return `Security threat detected: ${context.eventType || context.type} - ${context.message || 'Active threat identified'}`;
      case 'compliance-violation':
        return `Compliance violation: ${context.eventType || context.type} - ${context.message || 'Regulatory requirement violated'}`;
      case 'system-error':
        return `System error detected: ${context.eventType || context.type} - ${context.message || 'Critical system malfunction'}`;
      case 'data-breach-attempt':
        return `Data breach attempt: ${context.eventType || context.type} - ${context.message || 'Unauthorized data access'}`;
      case 'manufacturing-sabotage':
        return `Manufacturing sabotage detected: ${context.eventType || context.type} - ${context.message || 'Production system compromised'}`;
      
      default:
        return rule.description;
    }
  }

  private getPriorityFromSeverity(severity: string): 'low' | 'medium' | 'high' | 'urgent' {
    switch (severity) {
      case 'critical': return 'urgent';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'medium';
    }
  }

  private getRecommendedActions(rule: AlertRule): string[] {
    switch (rule.id) {
      // Threshold-based rules
      case 'critical-events-threshold':
        return ['Review security logs', 'Check system integrity', 'Notify security team'];
      case 'high-events-threshold':
        return ['Monitor system closely', 'Review recent events', 'Check for patterns'];
      case 'risk-score-high':
        return ['Conduct security assessment', 'Review access controls', 'Update security policies'];
      case 'compliance-score-low':
        return ['Review compliance requirements', 'Update security controls', 'Schedule compliance audit'];
      case 'active-incidents-high':
        return ['Prioritize incident resolution', 'Allocate additional resources', 'Review incident procedures'];
      case 'connection-lost':
        return ['Check network connectivity', 'Restart connection service', 'Verify server status'];
      
      // Incident-based rules
      case 'auth-failure-burst':
        return ['Review login attempts', 'Check for brute force attacks', 'Consider account lockout', 'Notify user'];
      case 'unauthorized-access':
        return ['Review access logs', 'Check user permissions', 'Verify data integrity', 'Notify data owner'];
      case 'equipment-failure':
        return ['Check equipment status', 'Restart equipment', 'Notify maintenance team', 'Review production impact'];
      case 'threat-detected':
        return ['Immediate threat assessment', 'Isolate affected systems', 'Notify security team', 'Activate incident response'];
      case 'compliance-violation':
        return ['Document violation', 'Review compliance requirements', 'Implement corrective actions', 'Notify compliance officer'];
      case 'system-error':
        return ['Check system logs', 'Restart affected services', 'Notify system administrator', 'Review system health'];
      case 'data-breach-attempt':
        return ['Immediate data protection', 'Review access logs', 'Notify data protection officer', 'Activate breach response'];
      case 'manufacturing-sabotage':
        return ['Secure manufacturing systems', 'Review production data', 'Notify security team', 'Document incident'];
      
      default:
        return ['Review alert details', 'Take appropriate action'];
    }
  }

  private handleNotifications(alert: SecurityAlert): void {
    if (this.config.notifications.browser) {
      this.emit('browserNotification', alert);
    }

    if (this.config.notifications.sound) {
      this.emit('soundNotification', alert);
    }

    if (this.config.notifications.desktop) {
      this.emit('desktopNotification', alert);
    }

    if (this.config.notifications.email) {
      this.emit('emailNotification', alert);
    }
  }

  // Alert Management
  acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'acknowledged';
      alert.assignedTo = userId;
      this.emit('alertAcknowledged', { alertId, userId, alert });
      return true;
    }
    return false;
  }

  resolveAlert(alertId: string, userId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.assignedTo = userId;
      this.activeAlerts.delete(alertId);
      this.emit('alertResolved', { alertId, userId, alert });
      return true;
    }
    return false;
  }

  getActiveAlerts(): SecurityAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory(limit: number = 100): SecurityAlert[] {
    return this.alertHistory.slice(-limit);
  }

  getAlertsBySeverity(severity: string): SecurityAlert[] {
    return this.alertHistory.filter(alert => alert.severity === severity);
  }

  getAlertsByType(type: string): SecurityAlert[] {
    return this.alertHistory.filter(alert => alert.type === type);
  }

  // Event Management
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => {
        try { 
          cb(data); 
        } catch (err) { 
          console.error('Alert service listener error:', err); 
        }
      });
    }
  }

  // Statistics
  getAlertStatistics(): any {
    const total = this.alertHistory.length;
    const active = this.activeAlerts.size;
    const acknowledged = this.alertHistory.filter(a => a.status === 'acknowledged').length;
    const resolved = this.alertHistory.filter(a => a.status === 'resolved').length;

    const bySeverity = this.alertHistory.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = this.alertHistory.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      active,
      acknowledged,
      resolved,
      bySeverity,
      byType,
      last24Hours: this.alertHistory.filter(a => 
        new Date(a.timestamp).getTime() > (Date.now() - 24 * 60 * 60 * 1000)
      ).length
    };
  }
}

export const alertService = new AlertService();
export default alertService;
