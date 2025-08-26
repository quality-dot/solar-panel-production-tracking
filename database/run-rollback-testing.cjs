#!/usr/bin/env node

/**
 * Constraint Rollback and Recovery Testing Script
 * Solar Panel Production Tracking System
 * Subtask 13.30: Rollback and Recovery Testing
 * 
 * This script provides comprehensive testing of constraint rollback procedures,
 * recovery scenarios, and emergency procedures for the manufacturing database.
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const config = require('./config.cjs');

class RollbackTester {
    constructor() {
        this.pool = new Pool(config.database);
        this.results = {
            timestamp: new Date().toISOString(),
            subtask: '13.30',
            title: 'Rollback and Recovery Testing',
            overallStatus: 'pending',
            rollbackTests: {},
            recoveryTests: {},
            emergencyTests: {},
            dataIntegrityTests: {},
            systemFunctionalityTests: {},
            riskAssessment: {},
            recommendations: [],
            summary: ''
        };
    }

    async connect() {
        try {
            this.client = await this.pool.connect();
            console.log('✅ Connected to database for rollback testing');
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

    async runRollbackTesting() {
        console.log('\n🔧 Starting Constraint Rollback and Recovery Testing...\n');

        try {
            // Run comprehensive rollback tests
            await this.runComprehensiveRollbackTests();
            
            // Test emergency rollback procedures
            await this.testEmergencyRollbackProcedures();
            
            // Test data integrity after rollbacks
            await this.testDataIntegrityAfterRollbacks();
            
            // Test system functionality after rollbacks
            await this.testSystemFunctionalityAfterRollbacks();
            
            // Assess rollback risks
            await this.assessRollbackRisks();
            
            // Generate recommendations
            await this.generateRecommendations();
            
            // Update overall status
            this.results.overallStatus = 'completed';
            
            console.log('✅ Rollback testing completed successfully');
            
        } catch (error) {
            console.error('❌ Rollback testing failed:', error.message);
            this.results.overallStatus = 'failed';
            this.results.error = error.message;
        }
    }

    async runComprehensiveRollbackTests() {
        console.log('🔄 Running Comprehensive Rollback Tests...');
        
        try {
            const query = `SELECT * FROM run_comprehensive_rollback_tests()`;
            const result = await this.client.query(query);
            
            this.results.rollbackTests = {
                totalTestCategories: result.rows.length,
                testCategories: result.rows.map(row => ({
                    category: row.test_category,
                    totalTests: parseInt(row.total_tests),
                    passedTests: parseInt(row.passed_tests),
                    failedTests: parseInt(row.failed_tests),
                    successRate: parseFloat(row.success_rate),
                    avgRollbackDuration: parseFloat(row.avg_rollback_duration_ms),
                    avgRecoveryDuration: parseFloat(row.avg_recovery_duration_ms)
                }))
            };
            
            console.log(`   ✅ Comprehensive rollback tests completed: ${result.rows.length} test categories`);
            
        } catch (error) {
            console.error('   ❌ Comprehensive rollback tests failed:', error.message);
            throw error;
        }
    }

    async testEmergencyRollbackProcedures() {
        console.log('🚨 Testing Emergency Rollback Procedures...');
        
        try {
            const query = `SELECT * FROM test_emergency_rollback()`;
            const result = await this.client.query(query);
            
            this.results.emergencyTests = {
                totalEmergencyTests: result.rows.length,
                successfulRollbacks: result.rows.filter(row => row.rollback_status === 'PASS').length,
                successfulRecoveries: result.rows.filter(row => row.recovery_status === 'PASS').length,
                dataIntegrityMaintained: result.rows.filter(row => row.data_integrity_status === 'EXCELLENT' || row.data_integrity_status === 'GOOD').length,
                systemFunctionalityMaintained: result.rows.filter(row => row.system_functionality_status === 'EXCELLENT' || row.system_functionality_status === 'GOOD').length,
                tests: result.rows.map(row => ({
                    constraintName: row.constraint_name,
                    tableName: row.table_name,
                    rollbackStatus: row.rollback_status,
                    recoveryStatus: row.recovery_status,
                    dataIntegrityStatus: row.data_integrity_status,
                    systemFunctionalityStatus: row.system_functionality_status,
                    totalDuration: parseInt(row.total_duration_ms)
                }))
            };
            
            console.log(`   ✅ Emergency rollback tests completed: ${result.rows.length} tests`);
            
        } catch (error) {
            console.error('   ❌ Emergency rollback tests failed:', error.message);
            throw error;
        }
    }

    async testDataIntegrityAfterRollbacks() {
        console.log('🔍 Testing Data Integrity After Rollbacks...');
        
        try {
            const tables = ['panels', 'manufacturing_orders', 'inspections', 'pallets', 'users', 'stations'];
            const integrityResults = {};
            
            for (const table of tables) {
                try {
                    const query = `SELECT test_data_integrity($1) as integrity_status`;
                    const result = await this.client.query(query, [table]);
                    integrityResults[table] = result.rows[0].integrity_status;
                } catch (error) {
                    integrityResults[table] = 'ERROR';
                }
            }
            
            this.results.dataIntegrityTests = {
                totalTables: tables.length,
                excellentIntegrity: Object.values(integrityResults).filter(status => status === 'EXCELLENT').length,
                goodIntegrity: Object.values(integrityResults).filter(status => status === 'GOOD').length,
                fairIntegrity: Object.values(integrityResults).filter(status => status === 'FAIR').length,
                poorIntegrity: Object.values(integrityResults).filter(status => status === 'POOR').length,
                errorIntegrity: Object.values(integrityResults).filter(status => status === 'ERROR').length,
                tableResults: integrityResults
            };
            
            console.log(`   ✅ Data integrity tests completed: ${tables.length} tables tested`);
            
        } catch (error) {
            console.error('   ❌ Data integrity tests failed:', error.message);
            throw error;
        }
    }

    async testSystemFunctionalityAfterRollbacks() {
        console.log('⚙️ Testing System Functionality After Rollbacks...');
        
        try {
            const tables = ['panels', 'manufacturing_orders', 'inspections', 'pallets', 'users', 'stations'];
            const functionalityResults = {};
            
            for (const table of tables) {
                try {
                    const query = `SELECT test_system_functionality($1) as functionality_status`;
                    const result = await this.client.query(query, [table]);
                    functionalityResults[table] = result.rows[0].functionality_status;
                } catch (error) {
                    functionalityResults[table] = 'ERROR';
                }
            }
            
            this.results.systemFunctionalityTests = {
                totalTables: tables.length,
                excellentFunctionality: Object.values(functionalityResults).filter(status => status === 'EXCELLENT').length,
                goodFunctionality: Object.values(functionalityResults).filter(status => status === 'GOOD').length,
                fairFunctionality: Object.values(functionalityResults).filter(status => status === 'FAIR').length,
                poorFunctionality: Object.values(functionalityResults).filter(status => status === 'POOR').length,
                errorFunctionality: Object.values(functionalityResults).filter(status => status === 'ERROR').length,
                tableResults: functionalityResults
            };
            
            console.log(`   ✅ System functionality tests completed: ${tables.length} tables tested`);
            
        } catch (error) {
            console.error('   ❌ System functionality tests failed:', error.message);
            throw error;
        }
    }

    async assessRollbackRisks() {
        console.log('⚠️ Assessing Rollback Risks...');
        
        try {
            const query = `SELECT * FROM rollback_risk_assessment ORDER BY rollback_priority, risk_level`;
            const result = await this.client.query(query);
            
            this.results.riskAssessment = {
                totalConstraints: result.rows.length,
                criticalRisk: result.rows.filter(row => row.risk_level === 'CRITICAL').length,
                highRisk: result.rows.filter(row => row.risk_level === 'HIGH').length,
                mediumRisk: result.rows.filter(row => row.risk_level === 'MEDIUM').length,
                lowRisk: result.rows.filter(row => row.risk_level === 'LOW').length,
                higherThanEstimated: result.rows.filter(row => row.duration_accuracy === 'HIGHER_THAN_ESTIMATED').length,
                lowerThanEstimated: result.rows.filter(row => row.duration_accuracy === 'LOWER_THAN_ESTIMATED').length,
                asEstimated: result.rows.filter(row => row.duration_accuracy === 'AS_ESTIMATED').length,
                constraints: result.rows.map(row => ({
                    constraintName: row.constraint_name,
                    tableName: row.table_name,
                    rollbackPriority: parseInt(row.rollback_priority),
                    riskLevel: row.risk_level,
                    estimatedDuration: parseInt(row.estimated_duration_ms),
                    actualRollbackDuration: parseFloat(row.actual_rollback_duration_ms),
                    actualRecoveryDuration: parseFloat(row.actual_recovery_duration_ms),
                    durationAccuracy: row.duration_accuracy,
                    riskIndicator: row.risk_indicator
                }))
            };
            
            console.log(`   ✅ Risk assessment completed: ${result.rows.length} constraints assessed`);
            
        } catch (error) {
            console.error('   ❌ Risk assessment failed:', error.message);
            throw error;
        }
    }

    async generateRecommendations() {
        console.log('💡 Generating Recommendations...');
        
        const recommendations = [];
        
        // Rollback test recommendations
        const rollbackSuccessRate = this.results.rollbackTests.testCategories.reduce((sum, cat) => sum + cat.successRate, 0) / this.results.rollbackTests.testCategories.length;
        
        if (rollbackSuccessRate < 90) {
            recommendations.push({
                priority: 'HIGH',
                category: 'ROLLBACK',
                title: 'Low Rollback Success Rate',
                description: `Rollback success rate is ${rollbackSuccessRate.toFixed(1)}%. Review rollback procedures and scripts.`,
                action: 'Review and improve rollback scripts for failed test categories'
            });
        }
        
        // Emergency procedure recommendations
        if (this.results.emergencyTests.successfulRollbacks < this.results.emergencyTests.totalEmergencyTests) {
            recommendations.push({
                priority: 'CRITICAL',
                category: 'EMERGENCY',
                title: 'Emergency Rollback Failures',
                description: `${this.results.emergencyTests.totalEmergencyTests - this.results.emergencyTests.successfulRollbacks} emergency rollbacks failed.`,
                action: 'Immediately review and fix emergency rollback procedures'
            });
        }
        
        // Data integrity recommendations
        if (this.results.dataIntegrityTests.poorIntegrity > 0 || this.results.dataIntegrityTests.errorIntegrity > 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'DATA_INTEGRITY',
                title: 'Data Integrity Issues After Rollback',
                description: `${this.results.dataIntegrityTests.poorIntegrity + this.results.dataIntegrityTests.errorIntegrity} tables have poor data integrity after rollback.`,
                action: 'Review data integrity procedures and improve rollback data preservation'
            });
        }
        
        // System functionality recommendations
        if (this.results.systemFunctionalityTests.poorFunctionality > 0 || this.results.systemFunctionalityTests.errorFunctionality > 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'SYSTEM_FUNCTIONALITY',
                title: 'System Functionality Issues After Rollback',
                description: `${this.results.systemFunctionalityTests.poorFunctionality + this.results.systemFunctionalityTests.errorFunctionality} tables have poor system functionality after rollback.`,
                action: 'Review system functionality procedures and improve rollback recovery'
            });
        }
        
        // Risk assessment recommendations
        if (this.results.riskAssessment.criticalRisk > 0) {
            recommendations.push({
                priority: 'CRITICAL',
                category: 'RISK',
                title: 'Critical Risk Constraints',
                description: `${this.results.riskAssessment.criticalRisk} constraints have critical risk levels.`,
                action: 'Review critical risk constraints and implement additional safety measures'
            });
        }
        
        if (this.results.riskAssessment.higherThanEstimated > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'PERFORMANCE',
                title: 'Rollback Duration Higher Than Estimated',
                description: `${this.results.riskAssessment.higherThanEstimated} constraints take longer to rollback than estimated.`,
                action: 'Review and optimize rollback procedures for performance'
            });
        }
        
        this.results.recommendations = recommendations;
        
        console.log(`   ✅ Generated ${recommendations.length} recommendations`);
    }

    async saveResults() {
        const outputPath = path.join(__dirname, 'rollback-testing-results.json');
        
        try {
            await fs.writeFile(outputPath, JSON.stringify(this.results, null, 2));
            console.log(`\n💾 Results saved to: ${outputPath}`);
        } catch (error) {
            console.error('❌ Failed to save results:', error.message);
        }
    }

    printSummary() {
        console.log('\n' + '='.repeat(80));
        console.log('🔧 ROLLBACK AND RECOVERY TESTING SUMMARY');
        console.log('='.repeat(80));
        
        console.log(`\n🔄 Rollback Tests:`);
        this.results.rollbackTests.testCategories.forEach(cat => {
            console.log(`   ${cat.category}: ${cat.passedTests}/${cat.totalTests} passed (${cat.successRate.toFixed(1)}%)`);
            console.log(`     Avg Rollback: ${cat.avgRollbackDuration.toFixed(0)}ms, Avg Recovery: ${cat.avgRecoveryDuration.toFixed(0)}ms`);
        });
        
        console.log(`\n🚨 Emergency Tests:`);
        console.log(`   Total Tests: ${this.results.emergencyTests.totalEmergencyTests}`);
        console.log(`   Successful Rollbacks: ${this.results.emergencyTests.successfulRollbacks}`);
        console.log(`   Successful Recoveries: ${this.results.emergencyTests.successfulRecoveries}`);
        console.log(`   Data Integrity Maintained: ${this.results.emergencyTests.dataIntegrityMaintained}`);
        console.log(`   System Functionality Maintained: ${this.results.emergencyTests.systemFunctionalityMaintained}`);
        
        console.log(`\n🔍 Data Integrity Tests:`);
        console.log(`   Total Tables: ${this.results.dataIntegrityTests.totalTables}`);
        console.log(`   Excellent: ${this.results.dataIntegrityTests.excellentIntegrity} | Good: ${this.results.dataIntegrityTests.goodIntegrity} | Fair: ${this.results.dataIntegrityTests.fairIntegrity} | Poor: ${this.results.dataIntegrityTests.poorIntegrity} | Error: ${this.results.dataIntegrityTests.errorIntegrity}`);
        
        console.log(`\n⚙️ System Functionality Tests:`);
        console.log(`   Total Tables: ${this.results.systemFunctionalityTests.totalTables}`);
        console.log(`   Excellent: ${this.results.systemFunctionalityTests.excellentFunctionality} | Good: ${this.results.systemFunctionalityTests.goodFunctionality} | Fair: ${this.results.systemFunctionalityTests.fairFunctionality} | Poor: ${this.results.systemFunctionalityTests.poorFunctionality} | Error: ${this.results.systemFunctionalityTests.errorFunctionality}`);
        
        console.log(`\n⚠️ Risk Assessment:`);
        console.log(`   Total Constraints: ${this.results.riskAssessment.totalConstraints}`);
        console.log(`   Critical: ${this.results.riskAssessment.criticalRisk} | High: ${this.results.riskAssessment.highRisk} | Medium: ${this.results.riskAssessment.mediumRisk} | Low: ${this.results.riskAssessment.lowRisk}`);
        console.log(`   Duration Accuracy: Higher(${this.results.riskAssessment.higherThanEstimated}) | Lower(${this.results.riskAssessment.lowerThanEstimated}) | As Estimated(${this.results.riskAssessment.asEstimated})`);
        
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
    const tester = new RollbackTester();
    
    try {
        await tester.connect();
        await tester.runRollbackTesting();
        await tester.saveResults();
        tester.printSummary();
    } catch (error) {
        console.error('❌ Rollback testing failed:', error.message);
        process.exit(1);
    } finally {
        await tester.disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = RollbackTester;
