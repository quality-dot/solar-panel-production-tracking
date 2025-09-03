// Compliance and Audit Service
// Manufacturing-optimized compliance, audit logging, and regulatory reporting

import { sessionManager } from './sessionManager.js';
import { tokenRotationService } from './tokenRotationService.js';
import { authPerformanceMonitor } from './authPerformanceMonitor.js';
import { userExperienceService } from './userExperienceService.js';
import { manufacturingLogger } from '../middleware/logger.js';
import { getRedisClient, REDIS_KEYS, generateRedisKey } from '../config/redis.js';
import { User } from '../models/index.js';

/**
 * Compliance and Audit Service
 * Provides comprehensive audit logging, compliance reporting, and regulatory features
 */
class ComplianceAuditService {
  constructor() {
    this.auditLevels = {
      INFO: 'info',
      WARNING: 'warning',
      ERROR: 'error',
      CRITICAL: 'critical',
      SECURITY: 'security',
      COMPLIANCE: 'compliance'
    };
    
    this.auditCategories = {
      AUTHENTICATION: 'authentication',
      AUTHORIZATION: 'authorization',
      USER_MANAGEMENT: 'user_management',
      SESSION_MANAGEMENT: 'session_management',
      SECURITY_EVENTS: 'security_events',
      COMPLIANCE_CHECKS: 'compliance_checks',
      DATA_ACCESS: 'data_access',
      SYSTEM_CHANGES: 'system_changes'
    };
    
    this.retentionPolicies = {
      authentication: 90 * 24 * 60 * 60 * 1000, // 90 days
      security: 365 * 24 * 60 * 60 * 1000,     // 1 year
      compliance: 2555 * 24 * 60 * 60 * 1000,  // 7 years
      system: 180 * 24 * 60 * 60 * 1000        // 180 days
    };
    
    this.complianceFrameworks = {
      SOX: 'Sarbanes-Oxley Act',
      GDPR: 'General Data Protection Regulation',
      HIPAA: 'Health Insurance Portability and Accountability Act',
      ISO27001: 'Information Security Management',
      NIST: 'National Institute of Standards and Technology',
      MANUFACTURING: 'Manufacturing Industry Standards'
    };
  }

  /**
   * Create comprehensive audit log entry
   */
  async createAuditLog(auditData) {
    try {
      const {
        level = this.auditLevels.INFO,
        category = this.auditCategories.AUTHENTICATION,
        action,
        userId,
        username,
        ip,
        userAgent,
        details,
        metadata = {},
        complianceTags = [],
        retentionDays = null
      } = auditData;

      const auditEntry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        level,
        category,
        action,
        userId: userId || null,
        username: username || null,
        ip: ip || null,
        userAgent: userAgent || null,
        details,
        metadata: {
          ...metadata,
          sessionId: metadata.sessionId || null,
          deviceFingerprint: metadata.deviceFingerprint || null,
          requestId: metadata.requestId || null,
          correlationId: metadata.correlationId || null
        },
        complianceTags,
        retentionDays: retentionDays || this.getRetentionDays(category),
        expiresAt: new Date(Date.now() + (retentionDays || this.getRetentionDays(category))).toISOString()
      };

      // Store in Redis for immediate access
      const redis = getRedisClient();
      const auditKey = generateRedisKey(REDIS_KEYS.AUDIT, `audit_log:${auditEntry.id}`);
      
      await redis.setex(
        auditKey,
        Math.ceil((retentionDays || this.getRetentionDays(category)) / 1000),
        JSON.stringify(auditEntry)
      );

      // Store in compliance index
      await this.indexComplianceAudit(auditEntry);

      // Log to manufacturing logger
      const logLevel = level === this.auditLevels.CRITICAL ? 'error' : 
                      level === this.auditLevels.WARNING ? 'warn' : 'info';
      
      manufacturingLogger[logLevel](`Audit Log [${level.toUpperCase()}]: ${action}`, {
        auditId: auditEntry.id,
        category,
        userId,
        username,
        ip,
        complianceTags,
        category: 'compliance_audit'
      });

      return auditEntry;

    } catch (error) {
      manufacturingLogger.error('Failed to create audit log', {
        error: error.message,
        auditData,
        category: 'compliance_audit'
      });
      throw error;
    }
  }

  /**
   * Index audit entry for compliance queries
   */
  async indexComplianceAudit(auditEntry) {
    try {
      const redis = getRedisClient();
      
      // Index by category
      const categoryKey = generateRedisKey(REDIS_KEYS.CACHE, `audit_index:category:${auditEntry.category}`);
      await redis.sadd(categoryKey, auditEntry.id);
      
      // Index by user
      if (auditEntry.userId) {
        const userKey = generateRedisKey(REDIS_KEYS.CACHE, `audit_index:user:${auditEntry.userId}`);
        await redis.sadd(userKey, auditEntry.id);
      }
      
      // Index by compliance tags
      for (const tag of auditEntry.complianceTags) {
        const tagKey = generateRedisKey(REDIS_KEYS.CACHE, `audit_index:compliance:${tag}`);
        await redis.sadd(tagKey, auditEntry.id);
      }
      
      // Index by date range
      const dateKey = generateRedisKey(REDIS_KEYS.CACHE, `audit_index:date:${auditEntry.timestamp.split('T')[0]}`);
      await redis.sadd(dateKey, auditEntry.id);
      
      // Set TTL for indexes
      const ttl = Math.ceil(auditEntry.retentionDays / 1000);
      await redis.expire(categoryKey, ttl);
      if (auditEntry.userId) await redis.expire(userKey, ttl);
      for (const tag of auditEntry.complianceTags) {
        const tagKey = generateRedisKey(REDIS_KEYS.CACHE, `audit_index:compliance:${tag}`);
        await redis.expire(tagKey, ttl);
      }
      await redis.expire(dateKey, ttl);

    } catch (error) {
      manufacturingLogger.error('Failed to index compliance audit', {
        error: error.message,
        auditId: auditEntry.id,
        category: 'compliance_audit'
      });
    }
  }

  /**
   * Get retention days for audit category
   */
  getRetentionDays(category) {
    return this.retentionPolicies[category] || this.retentionPolicies.system;
  }

  /**
   * Authentication Audit Logging
   */
  async logAuthenticationEvent(eventData) {
    const {
      action,
      userId,
      username,
      ip,
      userAgent,
      success,
      details,
      metadata = {}
    } = eventData;

    const complianceTags = ['AUTH', 'LOGIN_ATTEMPT'];
    if (success) complianceTags.push('SUCCESS');
    else complianceTags.push('FAILURE');

    return await this.createAuditLog({
      level: success ? this.auditLevels.INFO : this.auditLevels.WARNING,
      category: this.auditCategories.AUTHENTICATION,
      action,
      userId,
      username,
      ip,
      userAgent,
      details,
      metadata,
      complianceTags,
      retentionDays: this.retentionPolicies.authentication
    });
  }

  /**
   * Authorization Audit Logging
   */
  async logAuthorizationEvent(eventData) {
    const {
      action,
      userId,
      username,
      ip,
      userAgent,
      success,
      resource,
      permission,
      details,
      metadata = {}
    } = eventData;

    const complianceTags = ['AUTHZ', 'ACCESS_CONTROL'];
    if (success) complianceTags.push('GRANTED');
    else complianceTags.push('DENIED');

    return await this.createAuditLog({
      level: success ? this.auditLevels.INFO : this.auditLevels.WARNING,
      category: this.auditCategories.AUTHORIZATION,
      action,
      userId,
      username,
      ip,
      userAgent,
      details: `${details} - Resource: ${resource}, Permission: ${permission}`,
      metadata,
      complianceTags,
      retentionDays: this.retentionPolicies.security
    });
  }

  /**
   * User Management Audit Logging
   */
  async logUserManagementEvent(eventData) {
    const {
      action,
      adminUserId,
      adminUsername,
      targetUserId,
      targetUsername,
      changes,
      details,
      metadata = {}
    } = eventData;

    const complianceTags = ['USER_MGMT', 'ADMIN_ACTION'];
    if (action.includes('CREATE')) complianceTags.push('USER_CREATION');
    if (action.includes('UPDATE')) complianceTags.push('USER_MODIFICATION');
    if (action.includes('DELETE')) complianceTags.push('USER_DELETION');

    return await this.createAuditLog({
      level: this.auditLevels.INFO,
      category: this.auditCategories.USER_MANAGEMENT,
      action,
      userId: adminUserId,
      username: adminUsername,
      details: `${details} - Target: ${targetUsername} (${targetUserId}), Changes: ${JSON.stringify(changes)}`,
      metadata: {
        ...metadata,
        targetUserId,
        targetUsername,
        changes
      },
      complianceTags,
      retentionDays: this.retentionPolicies.compliance
    });
  }

  /**
   * Security Event Audit Logging
   */
  async logSecurityEvent(eventData) {
    const {
      action,
      userId,
      username,
      ip,
      userAgent,
      severity,
      threatType,
      details,
      metadata = {}
    } = eventData;

    const complianceTags = ['SECURITY', 'THREAT_DETECTION'];
    if (severity === 'critical') complianceTags.push('CRITICAL_THREAT');
    if (severity === 'high') complianceTags.push('HIGH_THREAT');

    return await this.createAuditLog({
      level: severity === 'critical' ? this.auditLevels.CRITICAL : 
             severity === 'high' ? this.auditLevels.ERROR : 
             severity === 'medium' ? this.auditLevels.WARNING : this.auditLevels.INFO,
      category: this.auditCategories.SECURITY_EVENTS,
      action,
      userId,
      username,
      ip,
      userAgent,
      details: `${details} - Threat Type: ${threatType}, Severity: ${severity}`,
      metadata: {
        ...metadata,
        threatType,
        severity
      },
      complianceTags,
      retentionDays: this.retentionPolicies.security
    });
  }

  /**
   * Compliance Check Audit Logging
   */
  async logComplianceCheck(eventData) {
    const {
      action,
      framework,
      checkType,
      result,
      details,
      metadata = {}
    } = eventData;

    const complianceTags = ['COMPLIANCE', framework, checkType];
    if (result === 'PASS') complianceTags.push('COMPLIANT');
    else if (result === 'FAIL') complianceTags.push('NON_COMPLIANT');
    else complianceTags.push('WARNING');

    return await this.createAuditLog({
      level: result === 'FAIL' ? this.auditLevels.ERROR : 
             result === 'WARNING' ? this.auditLevels.WARNING : this.auditLevels.INFO,
      category: this.auditCategories.COMPLIANCE_CHECKS,
      action,
      details: `${details} - Framework: ${framework}, Check: ${checkType}, Result: ${result}`,
      metadata: {
        ...metadata,
        framework,
        checkType,
        result
      },
      complianceTags,
      retentionDays: this.retentionPolicies.compliance
    });
  }

  /**
   * Data Access Audit Logging
   */
  async logDataAccess(eventData) {
    const {
      action,
      userId,
      username,
      ip,
      userAgent,
      dataType,
      recordCount,
      accessMethod,
      details,
      metadata = {}
    } = eventData;

    const complianceTags = ['DATA_ACCESS', dataType];
    if (action.includes('READ')) complianceTags.push('DATA_READ');
    if (action.includes('WRITE')) complianceTags.push('DATA_WRITE');
    if (action.includes('DELETE')) complianceTags.push('DATA_DELETE');

    return await this.createAuditLog({
      level: this.auditLevels.INFO,
      category: this.auditCategories.DATA_ACCESS,
      action,
      userId,
      username,
      ip,
      userAgent,
      details: `${details} - Data: ${dataType}, Records: ${recordCount}, Method: ${accessMethod}`,
      metadata: {
        ...metadata,
        dataType,
        recordCount,
        accessMethod
      },
      complianceTags,
      retentionDays: this.retentionPolicies.compliance
    });
  }

  /**
   * System Change Audit Logging
   */
  async logSystemChange(eventData) {
    const {
      action,
      userId,
      username,
      ip,
      userAgent,
      changeType,
      component,
      oldValue,
      newValue,
      details,
      metadata = {}
    } = eventData;

    const complianceTags = ['SYSTEM_CHANGE', changeType, component];
    if (changeType === 'CONFIGURATION') complianceTags.push('CONFIG_CHANGE');
    if (changeType === 'SECURITY') complianceTags.push('SECURITY_CHANGE');

    return await this.createAuditLog({
      level: changeType === 'SECURITY' ? this.auditLevels.WARNING : this.auditLevels.INFO,
      category: this.auditCategories.SYSTEM_CHANGES,
      action,
      userId,
      username,
      ip,
      userAgent,
      details: `${details} - Type: ${changeType}, Component: ${component}, Old: ${oldValue}, New: ${newValue}`,
      metadata: {
        ...metadata,
        changeType,
        component,
        oldValue,
        newValue
      },
      complianceTags,
      retentionDays: this.retentionPolicies.system
    });
  }

  /**
   * Query audit logs with filters
   */
  async queryAuditLogs(filters = {}) {
    try {
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
      } = filters;

      const redis = getRedisClient();
      let auditIds = new Set();

      // Get audit IDs based on filters
      if (category) {
        const categoryKey = generateRedisKey(REDIS_KEYS.CACHE, `audit_index:category:${category}`);
        const categoryIds = await redis.smembers(categoryKey);
        auditIds = new Set(categoryIds);
      }

      if (userId) {
        const userKey = generateRedisKey(REDIS_KEYS.CACHE, `audit_index:user:${userId}`);
        const userIds = await redis.smembers(userKey);
        if (auditIds.size > 0) {
          auditIds = new Set([...auditIds].filter(id => userIds.includes(id)));
        } else {
          auditIds = new Set(userIds);
        }
      }

      if (complianceTags && complianceTags.length > 0) {
        const tagIds = new Set();
        for (const tag of complianceTags) {
          const tagKey = generateRedisKey(REDIS_KEYS.CACHE, `audit_index:compliance:${tag}`);
          const ids = await redis.smembers(tagKey);
          if (tagIds.size === 0) {
            tagIds.add(...ids);
          } else {
            tagIds.forEach(id => {
              if (!ids.includes(id)) tagIds.delete(id);
            });
          }
        }
        if (auditIds.size > 0) {
          auditIds = new Set([...auditIds].filter(id => tagIds.has(id)));
        } else {
          auditIds = tagIds;
        }
      }

      // Get audit entries
      const auditEntries = [];
      const auditIdArray = Array.from(auditIds).slice(offset, offset + limit);

      for (const auditId of auditIdArray) {
        const auditKey = generateRedisKey(REDIS_KEYS.AUDIT, `audit_log:${auditId}`);
        const auditData = await redis.get(auditKey);
        
        if (auditData) {
          const audit = JSON.parse(auditData);
          
          // Apply additional filters
          let include = true;
          if (level && audit.level !== level) include = false;
          if (username && audit.username !== username) include = false;
          if (ip && audit.ip !== ip) include = false;
          if (action && !audit.action.includes(action)) include = false;
          if (startDate && new Date(audit.timestamp) < new Date(startDate)) include = false;
          if (endDate && new Date(audit.timestamp) > new Date(endDate)) include = false;

          if (include) {
            auditEntries.push(audit);
          }
        }
      }

      // Sort by timestamp (newest first)
      auditEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return {
        total: auditEntries.length,
        limit,
        offset,
        filters,
        entries: auditEntries
      };

    } catch (error) {
      manufacturingLogger.error('Failed to query audit logs', {
        error: error.message,
        filters,
        category: 'compliance_audit'
      });
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(framework, startDate, endDate) {
    try {
      const filters = {
        complianceTags: [framework],
        startDate,
        endDate,
        limit: 1000
      };

      const auditLogs = await this.queryAuditLogs(filters);
      
      // Analyze compliance data
      const analysis = {
        framework,
        period: { startDate, endDate },
        totalEvents: auditLogs.total,
        complianceScore: 0,
        criticalIssues: 0,
        warnings: 0,
        recommendations: [],
        breakdown: {
          authentication: 0,
          authorization: 0,
          userManagement: 0,
          security: 0,
          dataAccess: 0,
          systemChanges: 0
        }
      };

      // Calculate compliance score and breakdown
      let totalScore = 0;
      let totalWeight = 0;

      for (const entry of auditLogs.entries) {
        // Count by category
        analysis.breakdown[entry.category]++;

        // Calculate compliance score
        let weight = 1;
        let score = 0;

        if (entry.level === this.auditLevels.CRITICAL) {
          weight = 5;
          analysis.criticalIssues++;
        } else if (entry.level === this.auditLevels.ERROR) {
          weight = 3;
        } else if (entry.level === this.auditLevels.WARNING) {
          weight = 2;
          analysis.warnings++;
        }

        if (entry.level === this.auditLevels.INFO) {
          score = 100;
        } else if (entry.level === this.auditLevels.WARNING) {
          score = 70;
        } else if (entry.level === this.auditLevels.ERROR) {
          score = 40;
        } else if (entry.level === this.auditLevels.CRITICAL) {
          score = 0;
        }

        totalScore += score * weight;
        totalWeight += weight;
      }

      analysis.complianceScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 100;

      // Generate recommendations
      if (analysis.criticalIssues > 0) {
        analysis.recommendations.push('Immediate attention required for critical security issues');
      }
      if (analysis.warnings > 5) {
        analysis.recommendations.push('Review and address warning-level events');
      }
      if (analysis.breakdown.security > 100) {
        analysis.recommendations.push('High number of security events - review security posture');
      }
      if (analysis.complianceScore < 80) {
        analysis.recommendations.push('Compliance score below threshold - implement corrective actions');
      }

      return analysis;

    } catch (error) {
      manufacturingLogger.error('Failed to generate compliance report', {
        error: error.message,
        framework,
        startDate,
        endDate,
        category: 'compliance_audit'
      });
      throw error;
    }
  }

  /**
   * Clean up expired audit logs
   */
  async cleanupExpiredAuditLogs() {
    try {
      const redis = getRedisClient();
      const now = Date.now();
      let cleanedCount = 0;

      // Get all audit log keys
      const auditKeys = await redis.keys(generateRedisKey(REDIS_KEYS.AUDIT, 'audit_log:*'));
      
      for (const key of auditKeys) {
        const auditData = await redis.get(key);
        if (auditData) {
          const audit = JSON.parse(auditData);
          if (new Date(audit.expiresAt) < new Date(now)) {
            await redis.del(key);
            cleanedCount++;
          }
        }
      }

      // Clean up expired indexes
      const indexKeys = await redis.keys(generateRedisKey(REDIS_KEYS.CACHE, 'audit_index:*'));
      for (const key of indexKeys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1 || ttl === -2) {
          await redis.del(key);
        }
      }

      manufacturingLogger.info('Audit log cleanup completed', {
        cleanedCount,
        category: 'compliance_audit'
      });

      return cleanedCount;

    } catch (error) {
      manufacturingLogger.error('Failed to cleanup expired audit logs', {
        error: error.message,
        category: 'compliance_audit'
      });
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(timeRange = '24h') {
    try {
      const redis = getRedisClient();
      const now = Date.now();
      
      let startTime;
      switch (timeRange) {
        case '1h':
          startTime = now - (60 * 60 * 1000);
          break;
        case '24h':
          startTime = now - (24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = now - (7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = now - (30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = now - (24 * 60 * 60 * 1000);
      }

      const auditKeys = await redis.keys(generateRedisKey(REDIS_KEYS.AUDIT, 'audit_log:*'));
      const recentAudits = [];

      for (const key of auditKeys) {
        const auditData = await redis.get(key);
        if (auditData) {
          const audit = JSON.parse(auditData);
          if (new Date(audit.timestamp).getTime() > startTime) {
            recentAudits.push(audit);
          }
        }
      }

      // Calculate statistics
      const stats = {
        timeRange,
        totalEvents: recentAudits.length,
        byLevel: {},
        byCategory: {},
        byComplianceTag: {},
        topActions: {},
        topUsers: {},
        topIPs: {}
      };

      for (const audit of recentAudits) {
        // Count by level
        stats.byLevel[audit.level] = (stats.byLevel[audit.level] || 0) + 1;
        
        // Count by category
        stats.byCategory[audit.category] = (stats.byCategory[audit.category] || 0) + 1;
        
        // Count by compliance tag
        for (const tag of audit.complianceTags) {
          stats.byComplianceTag[tag] = (stats.byComplianceTag[tag] || 0) + 1;
        }
        
        // Count by action
        stats.topActions[audit.action] = (stats.topActions[audit.action] || 0) + 1;
        
        // Count by user
        if (audit.username) {
          stats.topUsers[audit.username] = (stats.topUsers[audit.username] || 0) + 1;
        }
        
        // Count by IP
        if (audit.ip) {
          stats.topIPs[audit.ip] = (stats.topIPs[audit.ip] || 0) + 1;
        }
      }

      // Sort top items
      stats.topActions = Object.fromEntries(
        Object.entries(stats.topActions).sort(([,a], [,b]) => b - a).slice(0, 10)
      );
      stats.topUsers = Object.fromEntries(
        Object.entries(stats.topUsers).sort(([,a], [,b]) => b - a).slice(0, 10)
      );
      stats.topIPs = Object.fromEntries(
        Object.entries(stats.topIPs).sort(([,a], [,b]) => b - a).slice(0, 10)
      );

      return stats;

    } catch (error) {
      manufacturingLogger.error('Failed to get audit statistics', {
        error: error.message,
        timeRange,
        category: 'compliance_audit'
      });
      throw error;
    }
  }

  /**
   * Export audit data for external systems
   */
  async exportAuditData(filters = {}, format = 'json') {
    try {
      const auditLogs = await this.queryAuditLogs({ ...filters, limit: 10000 });
      
      if (format === 'csv') {
        return this.convertToCSV(auditLogs.entries);
      } else if (format === 'xml') {
        return this.convertToXML(auditLogs.entries);
      } else {
        return auditLogs;
      }

    } catch (error) {
      manufacturingLogger.error('Failed to export audit data', {
        error: error.message,
        filters,
        format,
        category: 'compliance_audit'
      });
      throw error;
    }
  }

  /**
   * Convert audit data to CSV format
   */
  convertToCSV(auditEntries) {
    if (auditEntries.length === 0) return '';

    const headers = ['ID', 'Timestamp', 'Level', 'Category', 'Action', 'UserID', 'Username', 'IP', 'Details', 'ComplianceTags'];
    const csvRows = [headers.join(',')];

    for (const entry of auditEntries) {
      const row = [
        entry.id,
        entry.timestamp,
        entry.level,
        entry.category,
        entry.action,
        entry.userId || '',
        entry.username || '',
        entry.ip || '',
        `"${(entry.details || '').replace(/"/g, '""')}"`,
        entry.complianceTags.join(';')
      ];
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Convert audit data to XML format
   */
  convertToXML(auditEntries) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<auditLogs>\n';

    for (const entry of auditEntries) {
      xml += '  <auditEntry>\n';
      xml += `    <id>${entry.id}</id>\n`;
      xml += `    <timestamp>${entry.timestamp}</timestamp>\n`;
      xml += `    <level>${entry.level}</level>\n`;
      xml += `    <category>${entry.category}</category>\n`;
      xml += `    <action>${entry.action}</action>\n`;
      if (entry.userId) xml += `    <userId>${entry.userId}</userId>\n`;
      if (entry.username) xml += `    <username>${entry.username}</username>\n`;
      if (entry.ip) xml += `    <ip>${entry.ip}</ip>\n`;
      xml += `    <details>${entry.details || ''}</details>\n`;
      xml += '    <complianceTags>\n';
      for (const tag of entry.complianceTags) {
        xml += `      <tag>${tag}</tag>\n`;
      }
      xml += '    </complianceTags>\n';
      xml += '  </auditEntry>\n';
    }

    xml += '</auditLogs>';
    return xml;
  }
}

// Export singleton instance
export const complianceAuditService = new ComplianceAuditService();
export default complianceAuditService;
