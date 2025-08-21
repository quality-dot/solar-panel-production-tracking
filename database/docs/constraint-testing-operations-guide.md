# Constraint Testing Operations Guide
## Solar Panel Production Tracking System - Task 13.26

**Document Version**: 1.0  
**Created**: 2025-01-27  
**Status**: Implementation Complete  

---

## 📋 Executive Summary

This operations guide provides comprehensive instructions for database administrators and quality assurance personnel on how to run constraint validation tests, interpret results, and troubleshoot issues in the Solar Panel Production Tracking System.

### Target Audience
- **Database Administrators**: System testing and validation
- **Quality Assurance Engineers**: Test execution and result analysis
- **System Operators**: Regular constraint health monitoring
- **Development Team**: Constraint validation during development

---

## 🚀 Getting Started

### Prerequisites
1. **Database Access**: PostgreSQL connection with appropriate permissions
2. **Test Scripts**: All constraint testing scripts deployed
3. **Test Environment**: Isolated testing environment (recommended)
4. **Baseline Data**: Known good data for comparison

### Initial Setup
```sql
-- 1. Deploy testing scripts
\i database/scripts/constraint-validation-testing.sql

-- 2. Verify deployment
SELECT * FROM test_constraint_results LIMIT 1;

-- 3. Check test tables
\dt test_*

-- 4. Run initial test
SELECT * FROM run_all_constraint_tests();
```

---

## 🧪 Running Constraint Tests

### Basic Test Execution

#### 1. Run All Constraint Tests
```sql
-- Execute comprehensive test suite
SELECT * FROM run_all_constraint_tests();

-- Expected output:
-- test_category | total_tests | passed_tests | failed_tests | success_rate
-- Panel Constraints | 10 | 10 | 0 | 100.0
-- Manufacturing Order Constraints | 4 | 4 | 0 | 100.0
-- Inspection Constraints | 4 | 4 | 0 | 100.0
```

#### 2. Run Individual Test Categories
```sql
-- Test panel constraints only
SELECT * FROM test_panel_workflow_constraints();

-- Test manufacturing order constraints only
SELECT * FROM test_manufacturing_order_constraints();

-- Test inspection constraints only
SELECT * FROM test_inspection_constraints();

-- Test edge cases
SELECT * FROM test_constraint_edge_cases();
```

#### 3. Run Specific Test Types
```sql
-- Test validation scenarios (should pass)
-- These tests verify that valid data is accepted

-- Test violation scenarios (should fail)
-- These tests verify that invalid data is rejected

-- Test edge cases (boundary conditions)
-- These tests verify constraint behavior at limits
```

### Advanced Test Execution

#### 1. Performance Testing
```sql
-- Run tests with timing
\timing on
SELECT * FROM run_all_constraint_tests();
\timing off

-- Test with larger datasets
-- Create additional test data for performance validation
```

#### 2. Stress Testing
```sql
-- Test constraint behavior under load
-- Run multiple test iterations simultaneously
-- Monitor system performance during testing
```

#### 3. Integration Testing
```sql
-- Test constraint interactions
-- Verify foreign key relationships
-- Test trigger cascades
```

---

## 📊 Interpreting Test Results

### Understanding Test Output

#### Test Result Status
- **PASS**: Test completed successfully as expected
- **FAIL**: Test failed due to constraint violation (expected for violation tests)
- **ERROR**: Test encountered an unexpected error

#### Expected vs Actual Results
- **Validation Tests**: Expected = PASS, Actual = PASS (✅)
- **Violation Tests**: Expected = FAIL, Actual = PASS (✅) - Constraint working
- **Edge Case Tests**: Varies based on test scenario

### Analyzing Test Results

#### 1. View Test Summary
```sql
-- Get overall test results
SELECT * FROM constraint_test_summary;

-- Interpretation:
-- success_rate = 100%: All constraints working correctly
-- success_rate < 100%: Some constraints need attention
-- success_rate = 0%: Critical constraint failures
```

#### 2. Identify Failing Constraints
```sql
-- View constraints with failures
SELECT * FROM failing_constraints;

-- Analyze failure patterns
SELECT 
    constraint_name,
    COUNT(*) as failure_count,
    STRING_AGG(DISTINCT test_name, ', ') as failed_tests
FROM test_constraint_results
WHERE test_result = 'FAIL'
GROUP BY constraint_name
ORDER BY failure_count DESC;
```

#### 3. Review Detailed Results
```sql
-- Get complete test history
SELECT * FROM test_constraint_results 
ORDER BY test_timestamp DESC;

-- Filter by specific criteria
SELECT * FROM test_constraint_results 
WHERE table_name = 'panels' 
  AND test_result = 'FAIL'
ORDER BY test_timestamp DESC;
```

---

## 🔍 Troubleshooting Test Issues

### Common Test Problems

#### 1. Test Script Deployment Issues
```sql
-- Check if test functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'test_%';

-- Verify test tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'test_%';
```

#### 2. Permission Issues
```sql
-- Check user permissions
SELECT current_user, current_database();

-- Verify table access
SELECT has_table_privilege(current_user, 'test_panels', 'INSERT');
SELECT has_table_privilege(current_user, 'test_panels', 'SELECT');
```

#### 3. Constraint Definition Issues
```sql
-- Check if constraints exist
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class t ON t.oid = c.conrelid
WHERE n.nspname = 'public'
  AND t.relname IN ('panels', 'manufacturing_orders', 'inspections');
```

### Debugging Test Failures

#### 1. Analyze Error Messages
```sql
-- Get detailed error information
SELECT 
    test_name,
    constraint_name,
    error_message,
    test_timestamp
FROM test_constraint_results
WHERE test_result = 'FAIL'
ORDER BY test_timestamp DESC;
```

#### 2. Test Individual Constraints
```sql
-- Manually test specific constraints
-- Example: Test barcode format constraint
BEGIN;
INSERT INTO test_panels (
    barcode, panel_type, line_assignment, status, 
    manufacturing_order_id, created_by
) VALUES (
    'INVALID_BARCODE', '36', 'LINE_1', 'PENDING', 1, 1
);
-- Should fail with constraint violation
ROLLBACK;
```

#### 3. Verify Constraint Logic
```sql
-- Check constraint definitions
SELECT 
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class t ON t.oid = c.conrelid
WHERE n.nspname = 'public'
  AND t.relname = 'panels'
  AND conname LIKE '%barcode%';
```

---

## 📈 Performance Monitoring

### Test Performance Metrics

#### 1. Execution Time Analysis
```sql
-- Monitor test execution times
SELECT 
    test_name,
    constraint_name,
    test_timestamp,
    EXTRACT(EPOCH FROM (test_timestamp - LAG(test_timestamp) OVER (ORDER BY test_timestamp))) as execution_time_seconds
FROM test_constraint_results
WHERE test_result = 'PASS'
ORDER BY test_timestamp DESC;
```

#### 2. Resource Usage Monitoring
```sql
-- Monitor database performance during testing
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%test_%'
ORDER BY total_time DESC;
```

#### 3. Constraint Performance Impact
```sql
-- Measure constraint performance
EXPLAIN ANALYZE 
SELECT * FROM panels 
WHERE barcode !~ '^CRS[0-9]{2}[WB][TWB](36|40|60|72|144)[0-9]{5}$';
```

---

## 🔄 Test Maintenance

### Regular Test Execution

#### 1. Daily Health Checks
```sql
-- Run basic constraint validation
SELECT 
    table_name,
    COUNT(*) as total_constraints,
    COUNT(CASE WHEN test_result = 'PASS' THEN 1 END) as working_constraints
FROM test_constraint_results
WHERE test_timestamp >= CURRENT_DATE
GROUP BY table_name;
```

#### 2. Weekly Comprehensive Testing
```sql
-- Run full test suite
SELECT * FROM run_all_constraint_tests();

-- Generate weekly report
SELECT 
    DATE_TRUNC('week', test_timestamp) as week_start,
    COUNT(*) as total_tests,
    COUNT(CASE WHEN test_result = 'PASS' THEN 1 END) as passed_tests,
    ROUND(
        (COUNT(CASE WHEN test_result = 'PASS' THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1
    ) as success_rate
FROM test_constraint_results
WHERE test_timestamp >= CURRENT_DATE - INTERVAL '4 weeks'
GROUP BY DATE_TRUNC('week', test_timestamp)
ORDER BY week_start DESC;
```

#### 3. Monthly Deep Analysis
```sql
-- Comprehensive constraint health assessment
-- Performance trend analysis
-- Constraint optimization recommendations
```

### Test Data Management

#### 1. Cleanup Old Test Results
```sql
-- Remove old test results (keep last 90 days)
DELETE FROM test_constraint_results 
WHERE test_timestamp < CURRENT_TIMESTAMP - INTERVAL '90 days';

-- Archive important results
-- Export results to external storage
```

#### 2. Refresh Test Data
```sql
-- Clear test tables
TRUNCATE TABLE test_panels;
TRUNCATE TABLE test_manufacturing_orders;
TRUNCATE TABLE test_inspections;

-- Reset test results
TRUNCATE TABLE test_constraint_results;
```

#### 3. Update Test Scenarios
```sql
-- Modify test functions for new requirements
-- Add new test cases
-- Update test data sets
```

---

## 📋 Test Reporting

### Automated Reports

#### 1. Daily Status Report
```sql
-- Generate daily summary
SELECT 
    CURRENT_DATE as report_date,
    COUNT(*) as total_tests_run,
    COUNT(CASE WHEN test_result = 'PASS' THEN 1 END) as successful_tests,
    COUNT(CASE WHEN test_result = 'FAIL' THEN 1 END) as failed_tests,
    ROUND(
        (COUNT(CASE WHEN test_result = 'PASS' THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1
    ) as daily_success_rate
FROM test_constraint_results
WHERE DATE(test_timestamp) = CURRENT_DATE;
```

#### 2. Weekly Performance Report
```sql
-- Generate weekly summary
SELECT 
    DATE_TRUNC('week', test_timestamp) as week_start,
    COUNT(*) as total_tests,
    COUNT(CASE WHEN test_result = 'PASS' THEN 1 END) as passed_tests,
    COUNT(CASE WHEN test_result = 'FAIL' THEN 1 END) as failed_tests,
    ROUND(
        (COUNT(CASE WHEN test_result = 'PASS' THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1
    ) as weekly_success_rate,
    AVG(EXTRACT(EPOCH FROM (test_timestamp - LAG(test_timestamp) OVER (ORDER BY test_timestamp)))) as avg_execution_time
FROM test_constraint_results
WHERE test_timestamp >= CURRENT_DATE - INTERVAL '4 weeks'
GROUP BY DATE_TRUNC('week', test_timestamp)
ORDER BY week_start DESC;
```

#### 3. Constraint Health Dashboard
```sql
-- Real-time constraint health status
SELECT 
    table_name,
    constraint_name,
    CASE 
        WHEN success_rate = 100 THEN '🟢 HEALTHY'
        WHEN success_rate >= 90 THEN '🟠 ATTENTION'
        WHEN success_rate >= 75 THEN '🟡 WARNING'
        ELSE '🔴 CRITICAL'
    END as health_status,
    success_rate,
    last_test_run
FROM constraint_test_summary
ORDER BY success_rate ASC, table_name, constraint_name;
```

### Manual Reports

#### 1. Issue Summary Report
```sql
-- Generate issue summary
SELECT 
    'Critical Issues' as issue_level,
    COUNT(*) as issue_count,
    STRING_AGG(DISTINCT constraint_name, ', ') as affected_constraints
FROM failing_constraints
WHERE failure_count > 5

UNION ALL

SELECT 
    'Warning Issues' as issue_level,
    COUNT(*) as issue_count,
    STRING_AGG(DISTINCT constraint_name, ', ') as affected_constraints
FROM failing_constraints
WHERE failure_count BETWEEN 2 AND 5

UNION ALL

SELECT 
    'Minor Issues' as issue_level,
    COUNT(*) as issue_count,
    STRING_AGG(DISTINCT constraint_name, ', ') as affected_constraints
FROM failing_constraints
WHERE failure_count = 1;
```

#### 2. Performance Impact Report
```sql
-- Generate performance impact summary
SELECT 
    constraint_name,
    table_name,
    COUNT(*) as test_count,
    AVG(EXTRACT(EPOCH FROM (test_timestamp - LAG(test_timestamp) OVER (ORDER BY test_timestamp)))) as avg_execution_time,
    MAX(EXTRACT(EPOCH FROM (test_timestamp - LAG(test_timestamp) OVER (ORDER BY test_timestamp)))) as max_execution_time
FROM test_constraint_results
WHERE test_timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY constraint_name, table_name
ORDER BY avg_execution_time DESC;
```

---

## 🎯 Best Practices

### Test Execution Best Practices
1. **Regular Testing**: Run tests at consistent intervals
2. **Environment Isolation**: Use separate testing environment
3. **Data Consistency**: Maintain consistent test data sets
4. **Result Documentation**: Document all test results and findings
5. **Performance Monitoring**: Monitor test execution performance

### Constraint Testing Best Practices
1. **Comprehensive Coverage**: Test all constraint types and scenarios
2. **Edge Case Testing**: Include boundary value testing
3. **Business Rule Validation**: Verify manufacturing workflow requirements
4. **Performance Impact Assessment**: Measure constraint performance impact
5. **Continuous Improvement**: Use test results to optimize constraints

### Troubleshooting Best Practices
1. **Systematic Approach**: Follow structured troubleshooting procedures
2. **Documentation**: Record all issues and resolutions
3. **Root Cause Analysis**: Identify underlying causes of failures
4. **Prevention**: Implement measures to prevent recurring issues
5. **Knowledge Sharing**: Share solutions with team members

---

## 📝 Conclusion

This operations guide provides the foundation for effective constraint testing operations. Key success factors include:

1. **Consistent Testing**: Regular execution of constraint validation tests
2. **Proper Interpretation**: Understanding test results and their implications
3. **Effective Troubleshooting**: Systematic approach to resolving issues
4. **Performance Monitoring**: Continuous assessment of constraint impact
5. **Documentation**: Comprehensive recording of all testing activities

**Next Steps**:
- Implement automated testing schedules
- Set up test result monitoring and alerting
- Conduct team training on testing procedures
- Establish performance baselines
- Create continuous improvement processes

**Support Resources**:
- Test script documentation
- Constraint definition references
- Troubleshooting procedures
- Performance optimization guides
- Team training materials
