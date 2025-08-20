# Constraint Monitoring Operations Manual
## Solar Panel Production Tracking System - Task 13.29

**Document Version**: 1.0  
**Created**: 2025-01-27  
**Status**: Implementation Complete  

---

## 📋 Executive Summary

This operations manual provides comprehensive guidance for database administrators, system operators, and quality control personnel on how to use the constraint monitoring system. It covers daily operations, troubleshooting, and emergency procedures.

### Target Audience
- **Database Administrators**: System setup and maintenance
- **System Operators**: Daily monitoring and alert response
- **Quality Control Managers**: Constraint violation analysis
- **Production Supervisors**: System health awareness

---

## 🚀 Getting Started

### Prerequisites
1. **Database Access**: PostgreSQL connection with appropriate permissions
2. **Monitoring Scripts**: All constraint monitoring scripts deployed
3. **Configuration**: Monitoring thresholds and alert settings configured
4. **Training**: Personnel trained on monitoring procedures

### Initial Setup
```sql
-- 1. Deploy monitoring scripts
\i database/scripts/constraint-monitoring.sql
\i database/scripts/constraint-monitoring-dashboard.sql

-- 2. Verify deployment
SELECT * FROM constraint_monitoring_config;
SELECT * FROM constraint_alert_config;

-- 3. Run initial health check
CALL run_constraint_health_check();
```

---

## 📊 Daily Operations

### Morning Health Check (8:00 AM)
```sql
-- 1. Run comprehensive health check
CALL run_constraint_health_check();

-- 2. Check system health status
SELECT * FROM get_system_health_status();

-- 3. Review overnight violations
SELECT * FROM constraint_violation_trends 
WHERE hour_bucket >= CURRENT_DATE - INTERVAL '12 hours'
ORDER BY hour_bucket DESC;

-- 4. Check for critical alerts
SELECT * FROM constraint_monitoring_history 
WHERE health_status = 'CRITICAL' 
  AND check_timestamp >= CURRENT_DATE
ORDER BY check_timestamp DESC;
```

### Midday Status Check (12:00 PM)
```sql
-- 1. Quick health overview
SELECT * FROM constraint_health_overview;

-- 2. Check for new violations
SELECT * FROM get_constraint_violations() 
WHERE violation_count > 0
ORDER BY severity DESC, violation_count DESC;

-- 3. Performance check
SELECT * FROM constraint_performance_summary;
```

### Evening Review (5:00 PM)
```sql
-- 1. Daily summary
SELECT 
    DATE(check_timestamp) as check_date,
    COUNT(*) as total_checks,
    COUNT(CASE WHEN health_status = 'CRITICAL' THEN 1 END) as critical_issues,
    COUNT(CASE WHEN health_status = 'WARNING' THEN 1 END) as warnings,
    COUNT(CASE WHEN alert_generated THEN 1 END) as alerts_generated
FROM constraint_monitoring_history 
WHERE DATE(check_timestamp) = CURRENT_DATE
GROUP BY DATE(check_timestamp);

-- 2. Performance trends
SELECT * FROM constraint_performance_trends 
WHERE hour_bucket >= CURRENT_DATE - INTERVAL '24 hours'
ORDER BY hour_bucket DESC;
```

---

## 🔍 Monitoring Dashboard Usage

### System Health Overview
```sql
-- Get overall system status
SELECT * FROM constraint_health_overview;

-- Interpretation:
-- 🟢 HEALTHY: All constraints functioning normally
-- 🟠 ATTENTION: Minor issues detected
-- 🟡 WARNING: Significant issues requiring attention
-- 🔴 CRITICAL: Major issues requiring immediate action
```

### Constraint Violation Analysis
```sql
-- Get all current violations
SELECT * FROM get_constraint_violations();

-- Get violations for specific table
SELECT * FROM get_table_constraint_violations('panels');

-- Get violations by severity
SELECT 
    severity,
    COUNT(*) as violation_count,
    STRING_AGG(DISTINCT table_name, ', ') as affected_tables
FROM get_constraint_violations()
GROUP BY severity
ORDER BY 
    CASE severity
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        ELSE 4
    END;
```

### Performance Monitoring
```sql
-- Get performance summary
SELECT * FROM constraint_performance_summary;

-- Get performance trends
SELECT * FROM constraint_performance_trends;

-- Performance impact levels:
-- 🟢 MINIMAL IMPACT: < 100ms (Normal)
-- 🟠 LOW IMPACT: 100-500ms (Monitor)
-- 🟡 MEDIUM IMPACT: 500-1000ms (Investigate)
-- 🔴 HIGH IMPACT: > 1000ms (Critical)
```

---

## 🚨 Alert Response Procedures

### Critical Alert Response (Immediate)
```sql
-- 1. Identify the issue
SELECT * FROM get_constraint_violations() 
WHERE severity = 'CRITICAL';

-- 2. Check affected tables
SELECT DISTINCT table_name, constraint_name 
FROM constraint_monitoring_history 
WHERE health_status = 'CRITICAL' 
  AND check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour';

-- 3. Assess impact
SELECT 
    table_name,
    COUNT(*) as affected_records,
    MAX(check_timestamp) as last_check
FROM constraint_monitoring_history 
WHERE health_status = 'CRITICAL'
GROUP BY table_name;

-- 4. Take immediate action
-- - Stop affected production processes
-- - Notify production supervisors
-- - Begin data correction procedures
```

### Warning Alert Response (Within 1 Hour)
```sql
-- 1. Review warning details
SELECT * FROM get_constraint_violations() 
WHERE severity = 'HIGH';

-- 2. Check trend direction
SELECT * FROM constraint_violation_trends 
WHERE hour_bucket >= CURRENT_TIMESTAMP - INTERVAL '4 hours'
ORDER BY hour_bucket DESC;

-- 3. Plan corrective action
-- - Schedule maintenance window
-- - Prepare data correction scripts
-- - Notify relevant teams
```

### Attention Alert Response (Within 4 Hours)
```sql
-- 1. Monitor for escalation
SELECT * FROM get_constraint_violations() 
WHERE severity = 'MEDIUM';

-- 2. Check for patterns
SELECT 
    constraint_name,
    COUNT(*) as occurrence_count,
    AVG(violation_count) as avg_violations
FROM constraint_monitoring_history 
WHERE health_status IN ('ATTENTION', 'WARNING')
  AND check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY constraint_name
HAVING COUNT(*) > 1;

-- 3. Document for review
-- - Log issue details
-- - Schedule review meeting
-- - Update monitoring thresholds if needed
```

---

## 🔧 Troubleshooting Procedures

### Constraint Violation Investigation
```sql
-- 1. Get detailed violation information
SELECT 
    cv.*,
    cmh.check_timestamp,
    cmh.health_status
FROM get_constraint_violations() cv
LEFT JOIN constraint_monitoring_history cmh ON 
    cmh.constraint_name LIKE '%' || cv.constraint_name || '%' AND
    cmh.table_name = cv.table_name
WHERE cmh.check_timestamp = (
    SELECT MAX(check_timestamp) 
    FROM constraint_monitoring_history cmh2 
    WHERE cmh2.constraint_name LIKE '%' || cv.constraint_name || '%' AND
          cmh2.table_name = cv.table_name
);

-- 2. Check violation history
SELECT 
    check_timestamp,
    violation_count,
    health_status,
    notes
FROM constraint_monitoring_history 
WHERE constraint_name LIKE '%workflow%'
  AND table_name = 'panels'
ORDER BY check_timestamp DESC
LIMIT 10;

-- 3. Identify root cause
-- - Data corruption
-- - Application logic errors
-- - Manual data entry mistakes
-- - System integration issues
```

### Performance Issue Investigation
```sql
-- 1. Check performance trends
SELECT * FROM constraint_performance_trends 
WHERE constraint_name = 'panel_workflow_constraints'
  AND hour_bucket >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
ORDER BY hour_bucket DESC;

-- 2. Identify performance bottlenecks
SELECT 
    constraint_name,
    table_name,
    AVG(performance_avg_ms) as avg_performance,
    MAX(performance_avg_ms) as max_performance,
    COUNT(*) as check_count
FROM constraint_monitoring_history 
WHERE performance_avg_ms > 500
  AND check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY constraint_name, table_name
ORDER BY avg_performance DESC;

-- 3. Common causes:
-- - Missing indexes
-- - Large data volumes
-- - Complex constraint logic
-- - Database resource constraints
```

### System Health Degradation
```sql
-- 1. Check overall health trend
SELECT 
    DATE_TRUNC('hour', check_timestamp) as hour_bucket,
    COUNT(*) as total_checks,
    COUNT(CASE WHEN health_status = 'HEALTHY' THEN 1 END) as healthy_count,
    ROUND(
        (COUNT(CASE WHEN health_status = 'HEALTHY' THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1
    ) as health_percentage
FROM constraint_monitoring_history 
WHERE check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', check_timestamp)
ORDER BY hour_bucket DESC;

-- 2. Identify degradation patterns
-- - Gradual decline: Performance or data quality issues
-- - Sudden drop: System changes or data corruption
-- - Cyclical patterns: Time-based or workload issues
```

---

## 📈 Performance Optimization

### Constraint Performance Analysis
```sql
-- 1. Identify slow constraints
SELECT 
    constraint_name,
    table_name,
    AVG(performance_avg_ms) as avg_performance_ms,
    COUNT(*) as check_count
FROM constraint_monitoring_history 
WHERE performance_avg_ms > 100
  AND check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY constraint_name, table_name
ORDER BY avg_performance_ms DESC;

-- 2. Check for performance trends
SELECT 
    constraint_name,
    DATE_TRUNC('day', check_timestamp) as day_bucket,
    AVG(performance_avg_ms) as avg_performance_ms,
    COUNT(*) as check_count
FROM constraint_monitoring_history 
WHERE constraint_name = 'panel_workflow_constraints'
  AND check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY constraint_name, DATE_TRUNC('day', check_timestamp)
ORDER BY day_bucket DESC;

-- 3. Optimization strategies:
-- - Add missing indexes
-- - Simplify constraint logic
-- - Use deferred constraints for bulk operations
-- - Partition large tables
```

### Threshold Optimization
```sql
-- 1. Review current thresholds
SELECT * FROM constraint_monitoring_config;

-- 2. Analyze threshold effectiveness
SELECT 
    cmc.constraint_name,
    cmc.table_name,
    cmc.violation_threshold_critical,
    cmc.violation_threshold_warning,
    cmc.violation_threshold_attention,
    AVG(cmh.violation_count) as avg_violations,
    MAX(cmh.violation_count) as max_violations
FROM constraint_monitoring_config cmc
LEFT JOIN constraint_monitoring_history cmh ON 
    cmh.constraint_name LIKE '%' || cmc.constraint_name || '%' AND
    cmh.table_name = cmc.table_name
WHERE cmh.check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY cmc.constraint_name, cmc.table_name, 
         cmc.violation_threshold_critical, cmc.violation_threshold_warning, 
         cmc.violation_threshold_attention;

-- 3. Adjust thresholds based on:
-- - Historical violation patterns
-- - Business impact assessment
-- - System performance requirements
-- - Operational capacity
```

---

## 🛠️ Maintenance Procedures

### Weekly Maintenance
```sql
-- 1. Clean up old monitoring data
DELETE FROM constraint_monitoring_history 
WHERE check_timestamp < CURRENT_TIMESTAMP - INTERVAL '90 days';

-- 2. Analyze long-term trends
SELECT 
    DATE_TRUNC('week', check_timestamp) as week_bucket,
    COUNT(*) as total_checks,
    COUNT(CASE WHEN health_status = 'CRITICAL' THEN 1 END) as critical_weeks,
    COUNT(CASE WHEN health_status = 'WARNING' THEN 1 END) as warning_weeks,
    ROUND(
        (COUNT(CASE WHEN health_status = 'HEALTHY' THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1
    ) as health_percentage
FROM constraint_monitoring_history 
WHERE check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', check_timestamp)
ORDER BY week_bucket DESC;

-- 3. Review and update thresholds
-- - Analyze violation patterns
-- - Adjust thresholds based on business needs
-- - Update alert configurations
```

### Monthly Review
```sql
-- 1. Comprehensive system analysis
SELECT 
    constraint_name,
    table_name,
    COUNT(*) as total_checks,
    COUNT(CASE WHEN health_status = 'CRITICAL' THEN 1 END) as critical_count,
    COUNT(CASE WHEN health_status = 'WARNING' THEN 1 END) as warning_count,
    COUNT(CASE WHEN health_status = 'ATTENTION' THEN 1 END) as attention_count,
    COUNT(CASE WHEN health_status = 'HEALTHY' THEN 1 END) as healthy_count,
    ROUND(
        (COUNT(CASE WHEN health_status = 'HEALTHY' THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1
    ) as health_percentage
FROM constraint_monitoring_history 
WHERE check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY constraint_name, table_name
ORDER BY health_percentage ASC;

-- 2. Performance analysis
SELECT 
    constraint_name,
    table_name,
    AVG(performance_avg_ms) as avg_performance_ms,
    MAX(performance_avg_ms) as max_performance_ms,
    MIN(performance_avg_ms) as min_performance_ms,
    COUNT(*) as check_count
FROM constraint_monitoring_history 
WHERE check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND performance_avg_ms > 0
GROUP BY constraint_name, table_name
ORDER BY avg_performance_ms DESC;

-- 3. Action items:
-- - Identify recurring issues
-- - Plan system improvements
-- - Update documentation
-- - Schedule team training
```

---

## 📋 Emergency Procedures

### System-Wide Constraint Failure
```sql
-- 1. Assess scope of failure
SELECT 
    table_name,
    COUNT(*) as constraint_count,
    COUNT(CASE WHEN health_status = 'CRITICAL' THEN 1 END) as critical_count
FROM constraint_monitoring_history 
WHERE check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
GROUP BY table_name
HAVING COUNT(CASE WHEN health_status = 'CRITICAL' THEN 1 END) > 0;

-- 2. Immediate actions:
-- - Stop all production processes
-- - Notify all stakeholders
-- - Begin emergency data recovery
-- - Activate backup systems if available

-- 3. Recovery procedures:
-- - Identify root cause
-- - Restore from backup if necessary
-- - Validate data integrity
-- - Gradually restart systems
```

### Data Corruption Response
```sql
-- 1. Identify corrupted data
SELECT 
    cv.table_name,
    cv.constraint_name,
    cv.violation_count,
    cv.description
FROM get_constraint_violations() cv
WHERE cv.violation_count > 100
ORDER BY cv.violation_count DESC;

-- 2. Isolate affected systems
-- - Stop data entry for affected tables
-- - Quarantine corrupted records
-- - Begin data validation

-- 3. Recovery steps:
-- - Restore from last known good backup
-- - Manually correct critical data
-- - Validate all constraints
-- - Resume normal operations
```

---

## 📊 Reporting and Documentation

### Daily Status Report
```sql
-- Generate daily summary
SELECT 
    CURRENT_DATE as report_date,
    COUNT(*) as total_constraints_monitored,
    COUNT(CASE WHEN overall_status = '🟢 HEALTHY' THEN 1 END) as healthy_tables,
    COUNT(CASE WHEN overall_status = '🟠 ATTENTION' THEN 1 END) as attention_tables,
    COUNT(CASE WHEN overall_status = '🟡 WARNING' THEN 1 END) as warning_tables,
    COUNT(CASE WHEN overall_status = '🔴 CRITICAL' THEN 1 END) as critical_tables
FROM constraint_health_overview;
```

### Weekly Performance Report
```sql
-- Generate weekly summary
SELECT 
    DATE_TRUNC('week', check_timestamp) as week_start,
    COUNT(*) as total_checks,
    COUNT(CASE WHEN health_status = 'CRITICAL' THEN 1 END) as critical_issues,
    COUNT(CASE WHEN health_status = 'WARNING' THEN 1 END) as warnings,
    COUNT(CASE WHEN health_status = 'ATTENTION' THEN 1 END) as attention_issues,
    ROUND(
        (COUNT(CASE WHEN health_status = 'HEALTHY' THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1
    ) as system_health_percentage,
    AVG(performance_avg_ms) as avg_performance_ms
FROM constraint_monitoring_history 
WHERE check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '4 weeks'
GROUP BY DATE_TRUNC('week', check_timestamp)
ORDER BY week_start DESC;
```

### Monthly Trend Analysis
```sql
-- Generate monthly trends
SELECT 
    DATE_TRUNC('month', check_timestamp) as month_start,
    COUNT(*) as total_checks,
    COUNT(CASE WHEN health_status = 'CRITICAL' THEN 1 END) as critical_issues,
    COUNT(CASE WHEN health_status = 'WARNING' THEN 1 END) as warnings,
    COUNT(CASE WHEN health_status = 'ATTENTION' THEN 1 END) as attention_issues,
    ROUND(
        (COUNT(CASE WHEN health_status = 'HEALTHY' THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1
    ) as system_health_percentage,
    AVG(performance_avg_ms) as avg_performance_ms,
    MAX(performance_avg_ms) as max_performance_ms
FROM constraint_monitoring_history 
WHERE check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', check_timestamp)
ORDER BY month_start DESC;
```

---

## 🎯 Best Practices

### Monitoring Best Practices
1. **Regular Checks**: Run health checks at consistent intervals
2. **Threshold Management**: Set realistic thresholds based on business needs
3. **Trend Analysis**: Monitor for patterns, not just individual events
4. **Documentation**: Record all issues and resolutions
5. **Team Training**: Ensure all operators understand procedures

### Alert Management
1. **Escalation Procedures**: Clear escalation paths for different severity levels
2. **Response Times**: Defined response times for each alert type
3. **Communication**: Clear communication channels for alert notifications
4. **Follow-up**: Always follow up on resolved issues
5. **Learning**: Use incidents to improve monitoring and response

### Performance Optimization
1. **Baseline Establishment**: Establish performance baselines
2. **Trend Monitoring**: Monitor for performance degradation trends
3. **Proactive Maintenance**: Address issues before they become critical
4. **Capacity Planning**: Plan for growth and increased load
5. **Regular Review**: Regularly review and optimize monitoring thresholds

---

## 📝 Conclusion

This operations manual provides the foundation for effective constraint monitoring operations. Key success factors include:

1. **Consistent Procedures**: Follow established procedures for all monitoring activities
2. **Proactive Monitoring**: Don't wait for alerts to identify issues
3. **Continuous Improvement**: Use monitoring data to improve system performance
4. **Team Collaboration**: Work together to resolve issues effectively
5. **Documentation**: Maintain comprehensive records of all activities

**Next Steps**:
- Implement automated monitoring schedules
- Set up alert notification systems
- Conduct team training sessions
- Establish performance baselines
- Create incident response procedures

**Support Resources**:
- Database documentation
- System architecture diagrams
- Emergency contact lists
- Escalation procedures
- Training materials
