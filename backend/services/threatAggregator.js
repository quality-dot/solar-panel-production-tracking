/**
 * ThreatAggregator - Comprehensive threat intelligence and aggregation service
 * Integrates with external threat intelligence sources and provides IP blocking capabilities
 */

import { SecurityEventEmitter, SECURITY_EVENT_TYPES, SECURITY_SEVERITY, SECURITY_CATEGORIES } from './securityEventEmitter.js';

class ThreatAggregator {
  constructor(options = {}) {
    this.options = {
      enableAbuseIPDB: options.enableAbuseIPDB !== false,
      enableIPBlocking: options.enableIPBlocking !== false,
      blockDuration: options.blockDuration || 3600000, // 1 hour
      maxRequestsPerMinute: options.maxRequestsPerMinute || 100,
      threatScoreThreshold: options.threatScoreThreshold || 75,
      updateInterval: options.updateInterval || 300000, // 5 minutes
      ...options
    };

    this.blockedIPs = new Map(); // IP -> { blockedAt, reason, expiresAt }
    this.suspiciousIPs = new Map(); // IP -> { score, lastSeen, violations }
    this.threatIntelligence = new Map(); // IP -> threat data
    this.requestCounts = new Map(); // IP -> { count, windowStart }
    this.securityEventEmitter = new SecurityEventEmitter();

    this.initializeThreatSources();
  }

  /**
   * Initialize threat intelligence sources
   */
  initializeThreatSources() {
    // Initialize AbuseIPDB integration
    if (this.options.enableAbuseIPDB) {
      this.abuseIPDB = {
        apiKey: process.env.ABUSEIPDB_API_KEY,
        baseUrl: 'https://api.abuseipdb.com/api/v2',
        enabled: !!process.env.ABUSEIPDB_API_KEY
      };
    }

    // Initialize internal threat patterns
    this.threatPatterns = {
      bruteForce: {
        maxAttempts: 5,
        timeWindow: 300000, // 5 minutes
        pattern: 'consecutive_failures'
      },
      rapidRequests: {
        maxRequests: 100,
        timeWindow: 60000, // 1 minute
        pattern: 'rate_limit_exceeded'
      },
      suspiciousUserAgent: {
        patterns: [
          /bot/i,
          /crawler/i,
          /scanner/i,
          /hack/i,
          /exploit/i
        ],
        pattern: 'suspicious_user_agent'
      },
      geographicAnomaly: {
        maxDistance: 1000, // km
        timeWindow: 3600000, // 1 hour
        pattern: 'impossible_travel'
      }
    };
  }

  /**
   * Check IP against threat intelligence sources
   */
  async checkIPThreat(ipAddress, context = {}) {
    try {
      const threatData = {
        ip: ipAddress,
        timestamp: Date.now(),
        sources: {},
        overallScore: 0,
        isThreat: false,
        recommendations: []
      };

      // Check AbuseIPDB
      if (this.abuseIPDB?.enabled) {
        const abuseData = await this.checkAbuseIPDB(ipAddress);
        if (abuseData) {
          threatData.sources.abuseIPDB = abuseData;
          threatData.overallScore += abuseData.abuseConfidence;
        }
      }

      // Check internal threat patterns
      const internalThreat = this.checkInternalThreatPatterns(ipAddress, context);
      if (internalThreat) {
        threatData.sources.internal = internalThreat;
        threatData.overallScore += internalThreat.score;
      }

      // Check request patterns
      const requestThreat = this.checkRequestPatterns(ipAddress);
      if (requestThreat) {
        threatData.sources.requestPatterns = requestThreat;
        threatData.overallScore += requestThreat.score;
      }

      // Check if IP is already blocked
      if (this.blockedIPs.has(ipAddress)) {
        threatData.sources.blocked = {
          blockedAt: this.blockedIPs.get(ipAddress).blockedAt,
          reason: this.blockedIPs.get(ipAddress).reason
        };
        threatData.overallScore = 100; // Maximum threat score for blocked IPs
      }

      // Determine if IP is a threat
      threatData.isThreat = threatData.overallScore >= this.options.threatScoreThreshold;

      // Generate recommendations
      threatData.recommendations = this.generateThreatRecommendations(threatData);

      // Store threat intelligence
      this.threatIntelligence.set(ipAddress, threatData);

      // Emit threat detection event if threat found
      if (threatData.isThreat) {
        this.emitThreatDetectionEvent(ipAddress, threatData);
      }

      return threatData;
    } catch (error) {
      console.error('Error checking IP threat:', error);
      return {
        ip: ipAddress,
        timestamp: Date.now(),
        error: error.message,
        isThreat: false,
        overallScore: 0
      };
    }
  }

  /**
   * Check IP against AbuseIPDB
   */
  async checkAbuseIPDB(ipAddress) {
    try {
      if (!this.abuseIPDB?.enabled) {
        return null;
      }

      const response = await fetch(`${this.abuseIPDB.baseUrl}/check`, {
        method: 'GET',
        headers: {
          'Key': this.abuseIPDB.apiKey,
          'Accept': 'application/json'
        },
        params: new URLSearchParams({
          ipAddress: ipAddress,
          maxAgeInDays: 90,
          verbose: ''
        })
      });

      if (!response.ok) {
        throw new Error(`AbuseIPDB API error: ${response.status}`);
      }

      const data = await response.json();
      const result = data.data;

      return {
        abuseConfidence: result.abuseConfidencePercentage,
        countryCode: result.countryCode,
        usageType: result.usageType,
        isp: result.isp,
        domain: result.domain,
        totalReports: result.totalReports,
        lastReportedAt: result.lastReportedAt,
        isWhitelisted: result.isWhitelisted,
        isPublic: result.isPublic
      };
    } catch (error) {
      console.error('AbuseIPDB check failed:', error);
      return null;
    }
  }

  /**
   * Check internal threat patterns
   */
  checkInternalThreatPatterns(ipAddress, context) {
    let threatScore = 0;
    const violations = [];

    // Check for brute force patterns
    if (this.suspiciousIPs.has(ipAddress)) {
      const suspiciousData = this.suspiciousIPs.get(ipAddress);
      if (suspiciousData.violations.length >= this.threatPatterns.bruteForce.maxAttempts) {
        threatScore += 50;
        violations.push('brute_force_attempts');
      }
    }

    // Check for suspicious user agent
    if (context.userAgent) {
      for (const pattern of this.threatPatterns.suspiciousUserAgent.patterns) {
        if (pattern.test(context.userAgent)) {
          threatScore += 30;
          violations.push('suspicious_user_agent');
          break;
        }
      }
    }

    // Check for rapid requests
    const requestData = this.requestCounts.get(ipAddress);
    if (requestData && requestData.count > this.threatPatterns.rapidRequests.maxRequests) {
      threatScore += 40;
      violations.push('rapid_requests');
    }

    if (threatScore > 0) {
      return {
        score: threatScore,
        violations,
        lastSeen: Date.now()
      };
    }

    return null;
  }

  /**
   * Check request patterns
   */
  checkRequestPatterns(ipAddress) {
    const requestData = this.requestCounts.get(ipAddress);
    if (!requestData) {
      return null;
    }

    const now = Date.now();
    const timeDiff = now - requestData.windowStart;
    const requestsPerMinute = (requestData.count / timeDiff) * 60000;

    if (requestsPerMinute > this.options.maxRequestsPerMinute) {
      return {
        score: Math.min(requestsPerMinute / this.options.maxRequestsPerMinute * 50, 100),
        requestsPerMinute,
        maxAllowed: this.options.maxRequestsPerMinute,
        violation: 'rate_limit_exceeded'
      };
    }

    return null;
  }

  /**
   * Record request from IP
   */
  recordRequest(ipAddress, context = {}) {
    const now = Date.now();
    const requestData = this.requestCounts.get(ipAddress);

    if (!requestData || (now - requestData.windowStart) > 60000) {
      // New window or expired window
      this.requestCounts.set(ipAddress, {
        count: 1,
        windowStart: now,
        lastRequest: now
      });
    } else {
      // Increment existing window
      requestData.count++;
      requestData.lastRequest = now;
    }

    // Check for rapid requests
    const threat = this.checkRequestPatterns(ipAddress);
    if (threat) {
      this.recordSuspiciousActivity(ipAddress, 'rapid_requests', context);
    }
  }

  /**
   * Record suspicious activity
   */
  recordSuspiciousActivity(ipAddress, violationType, context = {}) {
    if (!this.suspiciousIPs.has(ipAddress)) {
      this.suspiciousIPs.set(ipAddress, {
        violations: [],
        firstSeen: Date.now(),
        lastSeen: Date.now()
      });
    }

    const suspiciousData = this.suspiciousIPs.get(ipAddress);
    suspiciousData.violations.push({
      type: violationType,
      timestamp: Date.now(),
      context
    });
    suspiciousData.lastSeen = Date.now();

    // Clean old violations (older than 1 hour)
    const oneHourAgo = Date.now() - 3600000;
    suspiciousData.violations = suspiciousData.violations.filter(
      v => v.timestamp > oneHourAgo
    );

    // Check if IP should be blocked
    if (suspiciousData.violations.length >= 5) {
      this.blockIP(ipAddress, 'Multiple suspicious activities detected');
    }
  }

  /**
   * Block IP address
   */
  blockIP(ipAddress, reason, duration = null) {
    const blockDuration = duration || this.options.blockDuration;
    const blockedAt = Date.now();
    const expiresAt = blockedAt + blockDuration;

    this.blockedIPs.set(ipAddress, {
      blockedAt,
      reason,
      expiresAt,
      duration: blockDuration
    });

    // Emit IP blocked event
    this.securityEventEmitter.emitSecurityEvent(
      SECURITY_EVENT_TYPES.SECURITY_THREAT_DETECTED,
      SECURITY_SEVERITY.HIGH,
      SECURITY_CATEGORIES.SECURITY,
      `IP address ${ipAddress} blocked: ${reason}`,
      {
        ipAddress,
        reason,
        blockedAt,
        expiresAt,
        duration: blockDuration
      },
      { source: 'threat_aggregator' }
    );

    console.log(`🚫 IP ${ipAddress} blocked: ${reason} (expires: ${new Date(expiresAt).toISOString()})`);
  }

  /**
   * Unblock IP address
   */
  unblockIP(ipAddress) {
    if (this.blockedIPs.has(ipAddress)) {
      this.blockedIPs.delete(ipAddress);
      
      // Emit IP unblocked event
      this.securityEventEmitter.emitSecurityEvent(
        SECURITY_EVENT_TYPES.SECURITY_THREAT_DETECTED,
        SECURITY_SEVERITY.INFO,
        SECURITY_CATEGORIES.SECURITY,
        `IP address ${ipAddress} unblocked`,
        { ipAddress },
        { source: 'threat_aggregator' }
      );

      console.log(`✅ IP ${ipAddress} unblocked`);
      return true;
    }
    return false;
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ipAddress) {
    const blockedData = this.blockedIPs.get(ipAddress);
    if (!blockedData) {
      return false;
    }

    // Check if block has expired
    if (Date.now() > blockedData.expiresAt) {
      this.unblockIP(ipAddress);
      return false;
    }

    return true;
  }

  /**
   * Generate threat recommendations
   */
  generateThreatRecommendations(threatData) {
    const recommendations = [];

    if (threatData.overallScore >= 90) {
      recommendations.push('immediate_block');
    } else if (threatData.overallScore >= 75) {
      recommendations.push('monitor_closely');
    } else if (threatData.overallScore >= 50) {
      recommendations.push('rate_limit');
    }

    if (threatData.sources.abuseIPDB?.abuseConfidence > 80) {
      recommendations.push('external_threat_confirmed');
    }

    if (threatData.sources.internal?.violations?.includes('brute_force_attempts')) {
      recommendations.push('brute_force_detected');
    }

    if (threatData.sources.requestPatterns?.violation === 'rate_limit_exceeded') {
      recommendations.push('rate_limit_exceeded');
    }

    return recommendations;
  }

  /**
   * Emit threat detection event
   */
  emitThreatDetectionEvent(ipAddress, threatData) {
    this.securityEventEmitter.emitSecurityEvent(
      SECURITY_EVENT_TYPES.SECURITY_THREAT_DETECTED,
      SECURITY_SEVERITY.HIGH,
      SECURITY_CATEGORIES.SECURITY,
      `Threat detected from IP ${ipAddress} (score: ${threatData.overallScore})`,
      {
        ipAddress,
        threatScore: threatData.overallScore,
        sources: threatData.sources,
        recommendations: threatData.recommendations
      },
      { source: 'threat_aggregator' }
    );
  }

  /**
   * Get blocked IPs
   */
  getBlockedIPs() {
    const now = Date.now();
    const activeBlocks = [];

    for (const [ip, data] of this.blockedIPs.entries()) {
      if (now < data.expiresAt) {
        activeBlocks.push({
          ip,
          ...data,
          timeRemaining: data.expiresAt - now
        });
      }
    }

    return activeBlocks;
  }

  /**
   * Get suspicious IPs
   */
  getSuspiciousIPs() {
    return Array.from(this.suspiciousIPs.entries()).map(([ip, data]) => ({
      ip,
      ...data,
      violationCount: data.violations.length
    }));
  }

  /**
   * Get threat intelligence for IP
   */
  getThreatIntelligence(ipAddress) {
    return this.threatIntelligence.get(ipAddress);
  }

  /**
   * Clean up expired data
   */
  cleanup() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    // Clean expired blocks
    for (const [ip, data] of this.blockedIPs.entries()) {
      if (now > data.expiresAt) {
        this.blockedIPs.delete(ip);
      }
    }

    // Clean old suspicious IP data
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (data.lastSeen < oneHourAgo) {
        this.suspiciousIPs.delete(ip);
      }
    }

    // Clean old request counts
    for (const [ip, data] of this.requestCounts.entries()) {
      if (data.lastRequest < oneHourAgo) {
        this.requestCounts.delete(ip);
      }
    }

    // Clean old threat intelligence
    for (const [ip, data] of this.threatIntelligence.entries()) {
      if (data.timestamp < oneHourAgo) {
        this.threatIntelligence.delete(ip);
      }
    }
  }

  /**
   * Get threat aggregator statistics
   */
  getStatistics() {
    return {
      blockedIPs: this.blockedIPs.size,
      suspiciousIPs: this.suspiciousIPs.size,
      threatIntelligence: this.threatIntelligence.size,
      requestCounts: this.requestCounts.size,
      abuseIPDBEnabled: this.abuseIPDB?.enabled || false,
      threatScoreThreshold: this.options.threatScoreThreshold,
      maxRequestsPerMinute: this.options.maxRequestsPerMinute
    };
  }
}

export default ThreatAggregator;