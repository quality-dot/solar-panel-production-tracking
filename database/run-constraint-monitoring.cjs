#!/usr/bin/env node

/**
 * Constraint Monitoring and Documentation Script
 * Solar Panel Production Tracking System
 * Subtask 13.29: Constraint Documentation and Monitoring
 * 
 * This script provides comprehensive constraint monitoring, violation tracking,
 * and health check procedures for the manufacturing database.
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const config = require('./config.cjs');

class ConstraintMonitor {
    constructor() {
        this.pool = new Pool(config.database);
        this.results = {
            timestamp: new Date().toISOString(),
            subtask: '13.29',
            title: 'Constraint Documentation and Monitoring',
            overallStatus: 'pending',
            monitoringResults: {},
            healthMetrics: {},
            violationSummary: {},
            dependencyValidation: {},
            impactAnalysis: {},
            dashboardData: {},
            recommendations: [],
            summary: ''
        };
    }

    async connect() {
        try {
            this.client = await this.pool.connect();
            console.log('✅ Connected to database for constraint monitoring');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            this.client.release();
        }
        await this.pool.end();
        console.log('✅ Database connection closed');
    }

    async runConstraintMonitoring() {
        console.log('\n🔍 Starting Constraint Monitoring and Documentation...\n');

        try {
            // Run constraint health check
            await this.runConstraintHealthCheck();
            
            // Get violation summary
            await this.getViolationSummary();
            
            // Validate constraint dependencies
            await this.validateConstraintDependencies();
            
            // Generate impact analysis
            await this.generateImpactAnalysis();
            
            // Get dashboard data
            await this.getDashboardData();
            
            // Generate recommendations
            await this.generateRecommendations();
            
            // Update overall status
            this.results.overallStatus = 'completed';
            
            console.log('✅ Constraint monitoring completed successfully');
            
        } catch (error) {
            console.error('❌ Constraint monitoring failed:', error.message);
            this.results.overallStatus = 'failed';
            this.results.error = error.message;
        }
    }

    async runConstraintHealthCheck() {
        console.log('📊 Running Constraint Health Check...');
        
        try {
            const query = `
                SELECT 
                    constraint_name,
                    table_name,
                    constraint_type,
                    is_active,
                    last_validated_at,
                    violation_count,
                    success_rate,
                    CASE 
                        WHEN success_rate >= 99.5 THEN 'EXCELLENT'
                        WHEN success_rate >= 95.0 THEN 'GOOD'
                        WHEN success_rate >= 90.0 THEN 'FAIR'
                        ELSE 'POOR'
                    END as health_status
                FROM constraint_health_metrics
                ORDER BY success_rate DESC NULLS LAST
            `;
            
            const result = await this.client.query(query);
            
            this.results.healthMetrics = {
                totalConstraints: result.rows.length,
                activeConstraints: result.rows.filter(row => row.is_active).length,
                constraintsWithViolations: result.rows.filter(row => row.violation_count > 0).length,
                healthDistribution: {
                    excellent: result.rows.filter(row => row.health_status === 'EXCELLENT').length,
                    good: result.rows.filter(row => row.health_status === 'GOOD').length,
                    fair: result.rows.filter(row => row.health_status === 'FAIR').length,
                    poor: result.rows.filter(row => row.health_status === 'POOR').length
                },
                constraints: result.rows
            };
            
            console.log(`   ✅ Health check completed: ${result.rows.length} constraints analyzed`);
            
        } catch (error) {
            console.error('   ❌ Health check failed:', error.message);
            throw error;
        }
    }

    async getViolationSummary() {
        console.log('🚨 Getting Constraint Violation Summary...');
        
        try {
            const query = `
                SELECT 
                    constraint_name,
                    table_name,
                    COUNT(*) as violation_count,
                    COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_count,
                    COUNT(*) FILTER (WHERE severity = 'HIGH') as high_count,
                    COUNT(*) FILTER (WHERE severity = 'MEDIUM') as medium_count,
                    COUNT(*) FILTER (WHERE severity = 'LOW') as low_count,
                    MAX(created_at) as last_violation,
                    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_resolution_time_seconds
                FROM constraint_violations
                WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY constraint_name, table_name
                ORDER BY violation_count DESC
            `;
            
            const result = await this.client.query(query);
            
            this.results.violationSummary = {
                totalViolations: result.rows.reduce((sum, row) => sum + parseInt(row.violation_count), 0),
                criticalViolations: result.rows.reduce((sum, row) => sum + parseInt(row.critical_count), 0),
                highViolations: result.rows.reduce((sum, row) => sum + parseInt(row.high_count), 0),
                mediumViolations: result.rows.reduce((sum, row) => sum + parseInt(row.medium_count), 0),
                lowViolations: result.rows.reduce((sum, row) => sum + parseInt(row.low_count), 0),
                constraintsWithViolations: result.rows.length,
                violations: result.rows
            };
            
            console.log(`   ✅ Violation summary completed: ${result.rows.length} constraints with violations`);
            
        } catch (error) {
            console.error('   ❌ Violation summary failed:', error.message);
            throw error;
        }
    }

    async validateConstraintDependencies() {
        console.log('🔗 Validating Constraint Dependencies...');
        
        try {
            const query = `
                SELECT 
                    constraint_name,
                    dependency_status,
                    dependency_details
                FROM validate_constraint_dependencies()
                ORDER BY constraint_name
            `;
            
            const result = await this.client.query(query);
            
            this.results.dependencyValidation = {
                totalDependencies: result.rows.length,
                validDependencies: result.rows.filter(row => row.dependency_status === 'DEPENDENCY_VALID').length,
                missingDependencies: result.rows.filter(row => row.dependency_status === 'DEPENDENCY_MISSING').length,
                noDependencies: result.rows.filter(row => row.dependency_status === 'NO_DEPENDENCIES').length,
                dependencies: result.rows
            };
            
            console.log(`   ✅ Dependency validation completed: ${result.rows.length} dependencies checked`);
            
        } catch (error) {
            console.error('   ❌ Dependency validation failed:', error.message);
            throw error;
        }
    }

    async generateImpactAnalysis() {
        console.log('📈 Generating Constraint Impact Analysis...');
        
        try {
            const query = `
                SELECT 
                    constraint_name,
                    table_name,
                    impact_level,
                    performance_impact,
                    data_integrity_score,
                    business_criticality,
                    recommendations
                FROM generate_constraint_impact_analysis()
                ORDER BY impact_level DESC, data_integrity_score ASC
            `;
            
            const result = await this.client.query(query);
            
            this.results.impactAnalysis = {
                totalConstraints: result.rows.length,
                criticalImpact: result.rows.filter(row => row.impact_level === 'CRITICAL').length,
                highImpact: result.rows.filter(row => row.impact_level === 'HIGH').length,
                mediumImpact: result.rows.filter(row => row.impact_level === 'MEDIUM').length,
                lowImpact: result.rows.filter(row => row.impact_level === 'LOW').length,
                highBusinessCriticality: result.rows.filter(row => row.business_criticality === 'HIGH').length,
                constraints: result.rows
            };
            
            console.log(`   ✅ Impact analysis completed: ${result.rows.length} constraints analyzed`);
            
        } catch (error) {
            console.error('   ❌ Impact analysis failed:', error.message);
            throw error;
        }
    }

    async getDashboardData() {
        console.log('📊 Getting Dashboard Data...');
        
        try {
            const query = `SELECT get_constraint_monitoring_dashboard() as dashboard_data`;
            const result = await this.client.query(query);
            
            this.results.dashboardData = JSON.parse(result.rows[0].dashboard_data);
            
            console.log('   ✅ Dashboard data retrieved successfully');
            
        } catch (error) {
            console.error('   ❌ Dashboard data retrieval failed:', error.message);
            throw error;
        }
    }

    async generateRecommendations() {
        console.log('💡 Generating Recommendations...');
        
        const recommendations = [];
        
        // Health-based recommendations
        if (this.results.healthMetrics.healthDistribution.poor > 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'HEALTH',
                title: 'Poor Performing Constraints',
                description: `${this.results.healthMetrics.healthDistribution.poor} constraints have poor health status. Review constraint logic and data quality.`,
                action: 'Review constraint definitions and data quality for poor performing constraints'
            });
        }
        
        if (this.results.healthMetrics.healthDistribution.fair > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'HEALTH',
                title: 'Fair Performing Constraints',
                description: `${this.results.healthMetrics.healthDistribution.fair} constraints have fair health status. Monitor for improvement opportunities.`,
                action: 'Monitor fair performing constraints for optimization opportunities'
            });
        }
        
        // Violation-based recommendations
        if (this.results.violationSummary.criticalViolations > 0) {
            recommendations.push({
                priority: 'CRITICAL',
                category: 'VIOLATIONS',
                title: 'Critical Constraint Violations',
                description: `${this.results.violationSummary.criticalViolations} critical violations detected. Immediate attention required.`,
                action: 'Investigate and resolve critical constraint violations immediately'
            });
        }
        
        if (this.results.violationSummary.highViolations > 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'VIOLATIONS',
                title: 'High Severity Violations',
                description: `${this.results.violationSummary.highViolations} high severity violations detected. Review and address.`,
                action: 'Review and address high severity constraint violations'
            });
        }
        
        // Dependency-based recommendations
        if (this.results.dependencyValidation.missingDependencies > 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'DEPENDENCIES',
                title: 'Missing Constraint Dependencies',
                description: `${this.results.dependencyValidation.missingDependencies} constraint dependencies are missing.`,
                action: 'Review and restore missing constraint dependencies'
            });
        }
        
        // Impact-based recommendations
        if (this.results.impactAnalysis.criticalImpact > 0) {
            recommendations.push({
                priority: 'CRITICAL',
                category: 'IMPACT',
                title: 'Critical Impact Constraints',
                description: `${this.results.impactAnalysis.criticalImpact} constraints have critical impact levels.`,
                action: 'Review and optimize constraints with critical impact levels'
            });
        }
        
        if (this.results.impactAnalysis.highBusinessCriticality > 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'BUSINESS',
                title: 'High Business Criticality',
                description: `${this.results.impactAnalysis.highBusinessCriticality} constraints have high business criticality.`,
                action: 'Ensure high business criticality constraints are properly monitored'
            });
        }
        
        // Performance recommendations
        const highPerformanceImpact = this.results.impactAnalysis.constraints.filter(
            c => c.performance_impact > 1.0
        ).length;
        
        if (highPerformanceImpact > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'PERFORMANCE',
                title: 'High Performance Impact',
                description: `${highPerformanceImpact} constraints have high performance impact.`,
                action: 'Consider optimizing constraints with high performance impact'
            });
        }
        
        this.results.recommendations = recommendations;
        
        console.log(`   ✅ Generated ${recommendations.length} recommendations`);
    }

    async saveResults() {
        const outputPath = path.join(__dirname, 'constraint-monitoring-results.json');
        
        try {
            await fs.writeFile(outputPath, JSON.stringify(this.results, null, 2));
            console.log(`\n💾 Results saved to: ${outputPath}`);
        } catch (error) {
            console.error('❌ Failed to save results:', error.message);
        }
    }

    printSummary() {
        console.log('\n' + '='.repeat(80));
        console.log('📋 CONSTRAINT MONITORING SUMMARY');
        console.log('='.repeat(80));
        
        console.log(`\n📊 Health Metrics:`);
        console.log(`   Total Constraints: ${this.results.healthMetrics.totalConstraints}`);
        console.log(`   Active Constraints: ${this.results.healthMetrics.activeConstraints}`);
        console.log(`   Constraints with Violations: ${this.results.healthMetrics.constraintsWithViolations}`);
        console.log(`   Health Distribution: Excellent(${this.results.healthMetrics.healthDistribution.excellent}) | Good(${this.results.healthMetrics.healthDistribution.good}) | Fair(${this.results.healthMetrics.healthDistribution.fair}) | Poor(${this.results.healthMetrics.healthDistribution.poor})`);
        
        console.log(`\n🚨 Violation Summary:`);
        console.log(`   Total Violations (30 days): ${this.results.violationSummary.totalViolations}`);
        console.log(`   Critical: ${this.results.violationSummary.criticalViolations} | High: ${this.results.violationSummary.highViolations} | Medium: ${this.results.violationSummary.mediumViolations} | Low: ${this.results.violationSummary.lowViolations}`);
        console.log(`   Constraints with Violations: ${this.results.violationSummary.constraintsWithViolations}`);
        
        console.log(`\n🔗 Dependency Validation:`);
        console.log(`   Total Dependencies: ${this.results.dependencyValidation.totalDependencies}`);
        console.log(`   Valid: ${this.results.dependencyValidation.validDependencies} | Missing: ${this.results.dependencyValidation.missingDependencies} | None: ${this.results.dependencyValidation.noDependencies}`);
        
        console.log(`\n📈 Impact Analysis:`);
        console.log(`   Critical Impact: ${this.results.impactAnalysis.criticalImpact} | High Impact: ${this.results.impactAnalysis.highImpact} | Medium Impact: ${this.results.impactAnalysis.mediumImpact} | Low Impact: ${this.results.impactAnalysis.lowImpact}`);
        console.log(`   High Business Criticality: ${this.results.impactAnalysis.highBusinessCriticality}`);
        
        console.log(`\n💡 Recommendations: ${this.results.recommendations.length}`);
        this.results.recommendations.forEach((rec, index) => {
            console.log(`   ${index + 1}. [${rec.priority}] ${rec.title}: ${rec.description}`);
        });
        
        console.log('\n' + '='.repeat(80));
        console.log(`Status: ${this.results.overallStatus.toUpperCase()}`);
        console.log('='.repeat(80));
    }
}

// Main execution
async function main() {
    const monitor = new ConstraintMonitor();
    
    try {
        await monitor.connect();
        await monitor.runConstraintMonitoring();
        await monitor.saveResults();
        monitor.printSummary();
    } catch (error) {
        console.error('❌ Constraint monitoring failed:', error.message);
        process.exit(1);
    } finally {
        await monitor.disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = ConstraintMonitor;
