/**
 * Event Analytics Service
 * Task: 22.3 - Event Collection System
 * Description: Advanced event analysis, pattern detection, and predictive insights
 * Date: 2025-08-28
 */

import { EventStore } from './eventStore.js';
import { EventMetrics } from './eventMetrics.js';
import loggerService from './loggerService.js';

export class EventAnalytics {
  constructor() {
    this.eventStore = new EventStore();
    this.eventMetrics = new EventMetrics();
    this.patterns = new Map();
    this.anomalies = new Map();
    this.trends = new Map();
    
    loggerService.logSecurity('info', 'Event analytics service initialized', {
      source: 'event-analytics'
    });
  }
  
  /**
   * Analyze event patterns over time
   * @param {string} timeRange - Time range for analysis
   * @param {Object} filters - Event filters
   * @returns {Object} Pattern analysis results
   */
  async analyzeEventPatterns(timeRange = '24h', filters = {}) {
    try {
      const events = await this.eventStore.getEvents(filters, 1000);
      const patterns = this.detectPatterns(events, timeRange);
      
      loggerService.logSecurity('info', 'Event patterns analyzed', {
        timeRange,
        eventCount: events.length,
        patternCount: Object.keys(patterns).length,
        source: 'event-analytics'
      });
      
      return patterns;
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to analyze event patterns', {
        timeRange,
        error: error.message,
        source: 'event-analytics'
      });
      throw error;
    }
  }
  
  /**
   * Detect patterns in events
   * @param {Array} events - Array of events to analyze
   * @param {string} timeRange - Time range for analysis
   * @returns {Object} Detected patterns
   */
  detectPatterns(events, timeRange) {
    const patterns = {
      frequency: {},
      correlation: {},
      sequences: {},
      anomalies: {},
      trends: {}
    };
    
    // Frequency analysis
    patterns.frequency = this.analyzeFrequency(events);
    
    // Correlation analysis
    patterns.correlation = this.analyzeCorrelations(events);
    
    // Sequence analysis
    patterns.sequences = this.analyzeSequences(events);
    
    // Anomaly detection
    patterns.anomalies = this.detectAnomalies(events);
    
    // Trend analysis
    patterns.trends = this.analyzeTrends(events, timeRange);
    
    return patterns;
  }
  
  /**
   * Analyze event frequency patterns
   * @param {Array} events - Array of events
   * @returns {Object} Frequency analysis
   */
  analyzeFrequency(events) {
    const frequency = {
      byType: {},
      bySeverity: {},
      byUser: {},
      bySource: {},
      byHour: {},
      byDay: {}
    };
    
    events.forEach(event => {
      // By event type
      if (!frequency.byType[event.eventType]) {
        frequency.byType[event.eventType] = 0;
      }
      frequency.byType[event.eventType]++;
      
      // By severity
      if (!frequency.bySeverity[event.severity]) {
        frequency.bySeverity[event.severity] = 0;
      }
      frequency.bySeverity[event.severity]++;
      
      // By user
      if (event.userId) {
        if (!frequency.byUser[event.userId]) {
          frequency.byUser[event.userId] = 0;
        }
        frequency.byUser[event.userId]++;
      }
      
      // By source
      if (event.context.source) {
        if (!frequency.bySource[event.context.source]) {
          frequency.bySource[event.context.source] = 0;
        }
        frequency.bySource[event.context.source]++;
      }
      
      // By hour
      const hour = new Date(event.timestamp).getHours();
      if (!frequency.byHour[hour]) {
        frequency.byHour[hour] = 0;
      }
      frequency.byHour[hour]++;
      
      // By day
      const day = new Date(event.timestamp).getDay();
      if (!frequency.byDay[day]) {
        frequency.byDay[day] = 0;
      }
      frequency.byDay[day]++;
    });
    
    return frequency;
  }
  
  /**
   * Analyze event correlations
   * @param {Array} events - Array of events
   * @returns {Object} Correlation analysis
   */
  analyzeCorrelations(events) {
    const correlations = {
      userEventType: {},
      sourceEventType: {},
      severityEventType: {},
      timeEventType: {}
    };
    
    events.forEach(event => {
      // User-Event Type correlation
      if (event.userId) {
        if (!correlations.userEventType[event.userId]) {
          correlations.userEventType[event.userId] = {};
        }
        if (!correlations.userEventType[event.userId][event.eventType]) {
          correlations.userEventType[event.userId][event.eventType] = 0;
        }
        correlations.userEventType[event.userId][event.eventType]++;
      }
      
      // Source-Event Type correlation
      if (event.context.source) {
        if (!correlations.sourceEventType[event.context.source]) {
          correlations.sourceEventType[event.context.source] = {};
        }
        if (!correlations.sourceEventType[event.context.source][event.eventType]) {
          correlations.sourceEventType[event.context.source][event.eventType] = 0;
        }
        correlations.sourceEventType[event.context.source][event.eventType]++;
      }
      
      // Severity-Event Type correlation
      if (!correlations.severityEventType[event.severity]) {
        correlations.severityEventType[event.severity] = {};
      }
      if (!correlations.severityEventType[event.severity][event.eventType]) {
        correlations.severityEventType[event.severity][event.eventType] = 0;
      }
      correlations.severityEventType[event.severity][event.eventType]++;
    });
    
    return correlations;
  }
  
  /**
   * Analyze event sequences
   * @param {Array} events - Array of events
   * @returns {Object} Sequence analysis
   */
  analyzeSequences(events) {
    const sequences = {
      userSequences: {},
      sourceSequences: {},
      eventTypeSequences: {}
    };
    
    // Group events by user
    const userEvents = {};
    events.forEach(event => {
      if (event.userId) {
        if (!userEvents[event.userId]) {
          userEvents[event.userId] = [];
        }
        userEvents[event.userId].push(event);
      }
    });
    
    // Analyze user sequences
    Object.keys(userEvents).forEach(userId => {
      const userEventList = userEvents[userId].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      
      sequences.userSequences[userId] = this.findSequences(userEventList);
    });
    
    // Group events by source
    const sourceEvents = {};
    events.forEach(event => {
      if (event.context.source) {
        if (!sourceEvents[event.context.source]) {
          sourceEvents[event.context.source] = [];
        }
        sourceEvents[event.context.source].push(event);
      }
    });
    
    // Analyze source sequences
    Object.keys(sourceEvents).forEach(source => {
      const sourceEventList = sourceEvents[source].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      
      sequences.sourceSequences[source] = this.findSequences(sourceEventList);
    });
    
    return sequences;
  }
  
  /**
   * Find sequences in ordered events
   * @param {Array} events - Ordered array of events
   * @returns {Array} Found sequences
   */
  findSequences(events) {
    const sequences = [];
    const minSequenceLength = 2;
    const maxSequenceLength = 5;
    
    for (let length = minSequenceLength; length <= maxSequenceLength; length++) {
      for (let i = 0; i <= events.length - length; i++) {
        const sequence = events.slice(i, i + length);
        const eventTypes = sequence.map(e => e.eventType);
        
        sequences.push({
          length,
          eventTypes,
          startTime: sequence[0].timestamp,
          endTime: sequence[sequence.length - 1].timestamp,
          duration: new Date(sequence[sequence.length - 1].timestamp) - new Date(sequence[0].timestamp)
        });
      }
    }
    
    return sequences;
  }
  
  /**
   * Detect anomalies in events
   * @param {Array} events - Array of events
   * @returns {Object} Anomaly detection results
   */
  detectAnomalies(events) {
    const anomalies = {
      frequencyAnomalies: [],
      timeAnomalies: [],
      userAnomalies: [],
      severityAnomalies: []
    };
    
    // Frequency anomalies
    const eventTypeCounts = {};
    events.forEach(event => {
      if (!eventTypeCounts[event.eventType]) {
        eventTypeCounts[event.eventType] = 0;
      }
      eventTypeCounts[event.eventType]++;
    });
    
    const avgFrequency = Object.values(eventTypeCounts).reduce((sum, count) => sum + count, 0) / 
                        Object.keys(eventTypeCounts).length;
    
    Object.entries(eventTypeCounts).forEach(([eventType, count]) => {
      if (count > avgFrequency * 3) { // 3x above average
        anomalies.frequencyAnomalies.push({
          eventType,
          count,
          expected: avgFrequency,
          anomaly: 'high_frequency'
        });
      }
    });
    
    // Time anomalies (events outside normal hours)
    const hourCounts = {};
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      if (!hourCounts[hour]) {
        hourCounts[hour] = 0;
      }
      hourCounts[hour]++;
    });
    
    // Detect unusual hour patterns (e.g., events at 3 AM)
    Object.entries(hourCounts).forEach(([hour, count]) => {
      const hourNum = parseInt(hour);
      if ((hourNum >= 0 && hourNum <= 5) && count > 5) { // Late night events
        anomalies.timeAnomalies.push({
          hour: hourNum,
          count,
          anomaly: 'late_night_activity'
        });
      }
    });
    
    // User anomalies
    const userCounts = {};
    events.forEach(event => {
      if (event.userId) {
        if (!userCounts[event.userId]) {
          userCounts[event.userId] = 0;
        }
        userCounts[event.userId]++;
      }
    });
    
    const avgUserActivity = Object.values(userCounts).reduce((sum, count) => sum + count, 0) / 
                           Object.keys(userCounts).length;
    
    Object.entries(userCounts).forEach(([userId, count]) => {
      if (count > avgUserActivity * 5) { // 5x above average
        anomalies.userAnomalies.push({
          userId,
          count,
          expected: avgUserActivity,
          anomaly: 'high_user_activity'
        });
      }
    });
    
    // Severity anomalies
    const severityCounts = {};
    events.forEach(event => {
      if (!severityCounts[event.severity]) {
        severityCounts[event.severity] = 0;
      }
      severityCounts[event.severity]++;
    });
    
    // Detect high error rates
    if (severityCounts.error && severityCounts.error > events.length * 0.1) { // >10% error rate
      anomalies.severityAnomalies.push({
        severity: 'error',
        count: severityCounts.error,
        rate: (severityCounts.error / events.length) * 100,
        anomaly: 'high_error_rate'
      });
    }
    
    return anomalies;
  }
  
  /**
   * Analyze event trends over time
   * @param {Array} events - Array of events
   * @param {string} timeRange - Time range for analysis
   * @returns {Object} Trend analysis
   */
  analyzeTrends(events, timeRange) {
    const trends = {
      eventTypeTrends: {},
      severityTrends: {},
      userTrends: {},
      sourceTrends: {}
    };
    
    // Group events by time intervals
    const intervals = this.createTimeIntervals(timeRange);
    
    // Analyze event type trends
    intervals.forEach(interval => {
      const intervalEvents = events.filter(event => 
        new Date(event.timestamp) >= interval.start && 
        new Date(event.timestamp) <= interval.end
      );
      
      const eventTypeCounts = {};
      intervalEvents.forEach(event => {
        if (!eventTypeCounts[event.eventType]) {
          eventTypeCounts[event.eventType] = 0;
        }
        eventTypeCounts[event.eventType]++;
      });
      
      Object.entries(eventTypeCounts).forEach(([eventType, count]) => {
        if (!trends.eventTypeTrends[eventType]) {
          trends.eventTypeTrends[eventType] = [];
        }
        trends.eventTypeTrends[eventType].push({
          interval: interval.name,
          count,
          startTime: interval.start,
          endTime: interval.end
        });
      });
    });
    
    // Calculate trend direction (increasing, decreasing, stable)
    Object.keys(trends.eventTypeTrends).forEach(eventType => {
      const trendData = trends.eventTypeTrends[eventType];
      if (trendData.length >= 2) {
        const firstCount = trendData[0].count;
        const lastCount = trendData[trendData.length - 1].count;
        const change = lastCount - firstCount;
        
        trends.eventTypeTrends[eventType].trend = {
          direction: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
          change,
          changePercent: firstCount > 0 ? (change / firstCount) * 100 : 0
        };
      }
    });
    
    return trends;
  }
  
  /**
   * Create time intervals for trend analysis
   * @param {string} timeRange - Time range
   * @returns {Array} Time intervals
   */
  createTimeIntervals(timeRange) {
    const now = new Date();
    const intervals = [];
    
    switch (timeRange) {
      case '1h':
        // 10-minute intervals
        for (let i = 0; i < 6; i++) {
          const start = new Date(now.getTime() - (60 - i * 10) * 60 * 1000);
          const end = new Date(now.getTime() - (60 - (i + 1) * 10) * 60 * 1000);
          intervals.push({
            name: `${i * 10}-${(i + 1) * 10}min ago`,
            start,
            end
          });
        }
        break;
        
      case '24h':
        // Hourly intervals
        for (let i = 0; i < 24; i++) {
          const start = new Date(now.getTime() - (24 - i) * 60 * 60 * 1000);
          const end = new Date(now.getTime() - (24 - (i + 1)) * 60 * 60 * 1000);
          intervals.push({
            name: `${i + 1}h ago`,
            start,
            end
          });
        }
        break;
        
      case '7d':
        // Daily intervals
        for (let i = 0; i < 7; i++) {
          const start = new Date(now.getTime() - (7 - i) * 24 * 60 * 60 * 1000);
          const end = new Date(now.getTime() - (7 - (i + 1)) * 24 * 60 * 60 * 1000);
          intervals.push({
            name: `${i + 1}d ago`,
            start,
            end
          });
        }
        break;
        
      default:
        // Default to hourly intervals
        for (let i = 0; i < 24; i++) {
          const start = new Date(now.getTime() - (24 - i) * 60 * 60 * 1000);
          const end = new Date(now.getTime() - (24 - (i + 1)) * 60 * 60 * 1000);
          intervals.push({
            name: `${i + 1}h ago`,
            start,
            end
          });
        }
    }
    
    return intervals;
  }
  
  /**
   * Generate predictive insights
   * @param {Object} patterns - Event patterns
   * @returns {Object} Predictive insights
   */
  generatePredictiveInsights(patterns) {
    const insights = {
      riskAssessment: {},
      maintenancePredictions: {},
      securityThreats: {},
      performanceForecasts: {}
    };
    
    // Risk assessment based on anomaly patterns
    if (patterns.anomalies) {
      const riskScore = this.calculateRiskScore(patterns.anomalies);
      insights.riskAssessment = {
        overallRisk: riskScore,
        riskLevel: this.getRiskLevel(riskScore),
        highRiskAreas: this.identifyHighRiskAreas(patterns.anomalies),
        recommendations: this.generateRiskRecommendations(patterns.anomalies)
      };
    }
    
    // Maintenance predictions based on equipment events
    if (patterns.frequency && patterns.frequency.byType) {
      insights.maintenancePredictions = this.predictMaintenanceNeeds(patterns.frequency.byType);
    }
    
    // Security threat assessment
    if (patterns.anomalies && patterns.correlation) {
      insights.securityThreats = this.assessSecurityThreats(patterns.anomalies, patterns.correlation);
    }
    
    // Performance forecasts
    if (patterns.trends) {
      insights.performanceForecasts = this.forecastPerformance(patterns.trends);
    }
    
    return insights;
  }
  
  /**
   * Calculate risk score from anomalies
   * @param {Object} anomalies - Detected anomalies
   * @returns {number} Risk score (0-100)
   */
  calculateRiskScore(anomalies) {
    let riskScore = 0;
    
    // Frequency anomalies
    if (anomalies.frequencyAnomalies) {
      riskScore += anomalies.frequencyAnomalies.length * 10;
    }
    
    // Time anomalies
    if (anomalies.timeAnomalies) {
      riskScore += anomalies.timeAnomalies.length * 15;
    }
    
    // User anomalies
    if (anomalies.userAnomalies) {
      riskScore += anomalies.userAnomalies.length * 20;
    }
    
    // Severity anomalies
    if (anomalies.severityAnomalies) {
      riskScore += anomalies.severityAnomalies.length * 25;
    }
    
    return Math.min(riskScore, 100);
  }
  
  /**
   * Get risk level from score
   * @param {number} riskScore - Risk score
   * @returns {string} Risk level
   */
  getRiskLevel(riskScore) {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 40) return 'medium';
    if (riskScore >= 20) return 'low';
    return 'minimal';
  }
  
  /**
   * Identify high-risk areas
   * @param {Object} anomalies - Detected anomalies
   * @returns {Array} High-risk areas
   */
  identifyHighRiskAreas(anomalies) {
    const highRiskAreas = [];
    
    if (anomalies.frequencyAnomalies) {
      anomalies.frequencyAnomalies.forEach(anomaly => {
        highRiskAreas.push({
          type: 'frequency_anomaly',
          area: anomaly.eventType,
          risk: 'high',
          description: `Unusually high frequency of ${anomaly.eventType} events`
        });
      });
    }
    
    if (anomalies.userAnomalies) {
      anomalies.userAnomalies.forEach(anomaly => {
        highRiskAreas.push({
          type: 'user_anomaly',
          area: anomaly.userId,
          risk: 'high',
          description: `Unusually high activity from user ${anomaly.userId}`
        });
      });
    }
    
    return highRiskAreas;
  }
  
  /**
   * Generate risk recommendations
   * @param {Object} anomalies - Detected anomalies
   * @returns {Array} Recommendations
   */
  generateRiskRecommendations(anomalies) {
    const recommendations = [];
    
    if (anomalies.frequencyAnomalies && anomalies.frequencyAnomalies.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Investigate unusual event frequency patterns',
        description: 'Monitor and analyze events with unusually high frequency'
      });
    }
    
    if (anomalies.userAnomalies && anomalies.userAnomalies.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Review user activity patterns',
        description: 'Investigate users with unusually high activity levels'
      });
    }
    
    if (anomalies.severityAnomalies && anomalies.severityAnomalies.length > 0) {
      recommendations.push({
        priority: 'critical',
        action: 'Address high error rates immediately',
        description: 'High error rates indicate system issues requiring immediate attention'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Predict maintenance needs
   * @param {Object} eventTypeFrequency - Event type frequency
   * @returns {Object} Maintenance predictions
   */
  predictMaintenanceNeeds(eventTypeFrequency) {
    const predictions = {
      equipmentMaintenance: [],
      systemMaintenance: [],
      preventiveActions: []
    };
    
    // Equipment-related events
    const equipmentEvents = ['equipment.status.error', 'equipment.status.warning', 'maintenance.event'];
    equipmentEvents.forEach(eventType => {
      if (eventTypeFrequency[eventType] && eventTypeFrequency[eventType] > 5) {
        predictions.equipmentMaintenance.push({
          type: eventType,
          frequency: eventTypeFrequency[eventType],
          recommendation: 'Schedule preventive maintenance',
          urgency: eventTypeFrequency[eventType] > 10 ? 'high' : 'medium'
        });
      }
    });
    
    // System-related events
    const systemEvents = ['system.error', 'system.error.security', 'config.change'];
    systemEvents.forEach(eventType => {
      if (eventTypeFrequency[eventType] && eventTypeFrequency[eventType] > 3) {
        predictions.systemMaintenance.push({
          type: eventType,
          frequency: eventTypeFrequency[eventType],
          recommendation: 'Review system configuration and logs',
          urgency: eventTypeFrequency[eventType] > 8 ? 'high' : 'medium'
        });
      }
    });
    
    return predictions;
  }
  
  /**
   * Assess security threats
   * @param {Object} anomalies - Detected anomalies
   * @param {Object} correlations - Event correlations
   * @returns {Object} Security threat assessment
   */
  assessSecurityThreats(anomalies, correlations) {
    const threats = {
      riskLevel: 'low',
      threatTypes: [],
      affectedAreas: [],
      immediateActions: []
    };
    
    // Assess overall risk level
    let threatScore = 0;
    
    if (anomalies.userAnomalies && anomalies.userAnomalies.length > 0) {
      threatScore += anomalies.userAnomalies.length * 20;
    }
    
    if (anomalies.timeAnomalies && anomalies.timeAnomalies.length > 0) {
      threatScore += anomalies.timeAnomalies.length * 15;
    }
    
    if (anomalies.severityAnomalies && anomalies.severityAnomalies.length > 0) {
      threatScore += anomalies.severityAnomalies.length * 25;
    }
    
    // Determine threat level
    if (threatScore >= 80) threats.riskLevel = 'critical';
    else if (threatScore >= 60) threats.riskLevel = 'high';
    else if (threatScore >= 40) threats.riskLevel = 'medium';
    else if (threatScore >= 20) threats.riskLevel = 'low';
    
    // Identify threat types
    if (anomalies.userAnomalies && anomalies.userAnomalies.length > 0) {
      threats.threatTypes.push('suspicious_user_activity');
    }
    
    if (anomalies.timeAnomalies && anomalies.timeAnomalies.length > 0) {
      threats.threatTypes.push('unusual_timing_patterns');
    }
    
    if (anomalies.severityAnomalies && anomalies.severityAnomalies.length > 0) {
      threats.threatTypes.push('system_compromise_indicators');
    }
    
    // Generate immediate actions
    if (threats.riskLevel === 'critical') {
      threats.immediateActions.push('Immediate security review required');
      threats.immediateActions.push('Consider system lockdown');
      threats.immediateActions.push('Notify security team immediately');
    } else if (threats.riskLevel === 'high') {
      threats.immediateActions.push('Security investigation required within 1 hour');
      threats.immediateActions.push('Monitor affected systems closely');
    }
    
    return threats;
  }
  
  /**
   * Forecast performance based on trends
   * @param {Object} trends - Event trends
   * @returns {Object} Performance forecasts
   */
  forecastPerformance(trends) {
    const forecasts = {
      eventVolume: {},
      systemHealth: {},
      userActivity: {},
      recommendations: []
    };
    
    // Forecast event volume
    if (trends.eventTypeTrends) {
      Object.entries(trends.eventTypeTrends).forEach(([eventType, trendData]) => {
        if (trendData.trend) {
          const currentRate = trendData[trendData.length - 1]?.count || 0;
          const trend = trendData.trend;
          
          if (trend.direction === 'increasing') {
            forecasts.eventVolume[eventType] = {
              direction: 'increasing',
              currentRate,
              projectedRate: Math.round(currentRate * 1.2), // 20% increase
              timeframe: 'next 24 hours'
            };
          } else if (trend.direction === 'decreasing') {
            forecasts.eventVolume[eventType] = {
              direction: 'decreasing',
              currentRate,
              projectedRate: Math.round(currentRate * 0.8), // 20% decrease
              timeframe: 'next 24 hours'
            };
          }
        }
      });
    }
    
    // Generate recommendations based on forecasts
    Object.entries(forecasts.eventVolume).forEach(([eventType, forecast]) => {
      if (forecast.direction === 'increasing' && forecast.projectedRate > 100) {
        forecasts.recommendations.push({
          priority: 'medium',
          action: 'Scale resources for increased event volume',
          description: `${eventType} events are projected to increase to ${forecast.projectedRate}/hour`
        });
      }
    });
    
    return forecasts;
  }
  
  /**
   * Get comprehensive analytics report
   * @param {string} timeRange - Time range for analysis
   * @returns {Object} Complete analytics report
   */
  async getAnalyticsReport(timeRange = '24h') {
    try {
      // Get event patterns
      const patterns = await this.analyzeEventPatterns(timeRange);
      
      // Generate predictive insights
      const insights = this.generatePredictiveInsights(patterns);
      
      // Get metrics summary
      const metrics = this.eventMetrics.getMetricsSummary();
      
      const report = {
        timestamp: new Date().toISOString(),
        timeRange,
        patterns,
        insights,
        metrics,
        summary: {
          totalEvents: metrics.totalEvents,
          eventTypes: Object.keys(patterns.frequency?.byType || {}).length,
          anomalies: this.countAnomalies(patterns.anomalies),
          riskLevel: insights.riskAssessment?.riskLevel || 'unknown'
        }
      };
      
      loggerService.logSecurity('info', 'Analytics report generated', {
        timeRange,
        eventCount: report.summary.totalEvents,
        riskLevel: report.summary.riskLevel,
        source: 'event-analytics'
      });
      
      return report;
      
    } catch (error) {
      loggerService.logSecurity('error', 'Failed to generate analytics report', {
        timeRange,
        error: error.message,
        source: 'event-analytics'
      });
      throw error;
    }
  }
  
  /**
   * Count total anomalies
   * @param {Object} anomalies - Anomalies object
   * @returns {number} Total anomaly count
   */
  countAnomalies(anomalies) {
    if (!anomalies) return 0;
    
    let count = 0;
    Object.values(anomalies).forEach(anomalyArray => {
      if (Array.isArray(anomalyArray)) {
        count += anomalyArray.length;
      }
    });
    
    return count;
  }
  
  /**
   * Health check
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      status: 'healthy',
      patterns: this.patterns.size,
      anomalies: this.anomalies.size,
      trends: this.trends.size,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const eventAnalytics = new EventAnalytics();
export default eventAnalytics;
