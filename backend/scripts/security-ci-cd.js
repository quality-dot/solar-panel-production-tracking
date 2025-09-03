#!/usr/bin/env node

// CI/CD Security Testing Integration Script
// Automated security testing for manufacturing environment
// Usage: node security-ci-cd.js [--fail-on-high] [--generate-report] [--send-notifications]

import { runSecurityTests, getSecurityReport } from '../utils/securityTester.js';
import { manufacturingLogger } from '../middleware/logger.js';
import fs from 'fs';
import path from 'path';

/**
 * CI/CD Security Testing Configuration
 */
const CI_CD_CONFIG = {
  // Exit codes for CI/CD systems
  exitCodes: {
    SUCCESS: 0,
    WARNINGS: 1,
    FAILED: 2,
    CRITICAL: 3
  },
  
  // Thresholds for CI/CD failure
  thresholds: {
    criticalVulnerabilities: 0,
    highVulnerabilities: 2,
    mediumVulnerabilities: 5,
    lowVulnerabilities: 10
  },
  
  // Report generation
  reports: {
    outputDir: './security-reports',
    formats: ['json', 'html', 'markdown'],
    includeDetails: true
  },
  
  // Notification settings
  notifications: {
    enabled: false,
    slack: {
      webhook: process.env.SLACK_WEBHOOK_URL,
      channel: '#security-alerts'
    },
    email: {
      smtp: process.env.SMTP_CONFIG,
      recipients: process.env.SECURITY_TEAM_EMAILS?.split(',') || []
    }
  }
};

/**
 * Parse command line arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    failOnHigh: false,
    generateReport: false,
    sendNotifications: false,
    outputFormat: 'json',
    threshold: 'medium'
  };

  args.forEach(arg => {
    if (arg === '--fail-on-high') options.failOnHigh = true;
    if (arg === '--generate-report') options.generateReport = true;
    if (arg === '--send-notifications') options.sendNotifications = true;
    if (arg.startsWith('--format=')) options.outputFormat = arg.split('=')[1];
    if (arg.startsWith('--threshold=')) options.threshold = arg.split('=')[1];
  });

  return options;
}

/**
 * Run security tests and return results
 */
async function runSecurityTestSuite() {
  try {
    manufacturingLogger.info('Starting CI/CD security testing', {
      category: 'security_ci_cd',
      timestamp: new Date().toISOString()
    });

    const startTime = Date.now();
    const report = await runSecurityTests();
    const executionTime = Date.now() - startTime;

    manufacturingLogger.info('CI/CD security testing completed', {
      duration: `${executionTime}ms`,
      overallScore: report.summary.overallScore,
      vulnerabilityCounts: report.summary.vulnerabilityCounts,
      category: 'security_ci_cd'
    });

    return report;
  } catch (error) {
    manufacturingLogger.error('CI/CD security testing failed', {
      error: error.message,
      stack: error.stack,
      category: 'security_ci_cd'
    });
    throw error;
  }
}

/**
 * Determine exit code based on security results
 */
function determineExitCode(report, options) {
  const { vulnerabilityCounts } = report.summary;
  
  // Critical vulnerabilities always cause failure
  if (vulnerabilityCounts.CRITICAL > CI_CD_CONFIG.thresholds.criticalVulnerabilities) {
    return CI_CD_CONFIG.exitCodes.CRITICAL;
  }
  
  // High vulnerabilities cause failure if --fail-on-high is set
  if (options.failOnHigh && vulnerabilityCounts.HIGH > CI_CD_CONFIG.thresholds.highVulnerabilities) {
    return CI_CD_CONFIG.exitCodes.FAILED;
  }
  
  // Medium vulnerabilities cause warnings
  if (vulnerabilityCounts.MEDIUM > CI_CD_CONFIG.thresholds.mediumVulnerabilities) {
    return CI_CD_CONFIG.exitCodes.WARNINGS;
  }
  
  // Low vulnerabilities are acceptable
  if (vulnerabilityCounts.LOW > CI_CD_CONFIG.thresholds.lowVulnerabilities) {
    return CI_CD_CONFIG.exitCodes.WARNINGS;
  }
  
  return CI_CD_CONFIG.exitCodes.SUCCESS;
}

/**
 * Generate security report in specified format
 */
function generateSecurityReport(report, format = 'json') {
  try {
    const reportsDir = CI_CD_CONFIG.reports.outputDir;
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let filename, content;

    switch (format.toLowerCase()) {
      case 'json':
        filename = `security-report-${timestamp}.json`;
        content = JSON.stringify(report, null, 2);
        break;
        
      case 'markdown':
        filename = `security-report-${timestamp}.md`;
        content = generateMarkdownReport(report);
        break;
        
      case 'html':
        filename = `security-report-${timestamp}.html`;
        content = generateHtmlReport(report);
        break;
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const filepath = path.join(reportsDir, filename);
    fs.writeFileSync(filepath, content, 'utf8');

    manufacturingLogger.info('Security report generated', {
      format,
      filename,
      filepath,
      category: 'security_ci_cd'
    });

    return filepath;
  } catch (error) {
    manufacturingLogger.error('Failed to generate security report', {
      error: error.message,
      format,
      category: 'security_ci_cd'
    });
    throw error;
  }
}

/**
 * Generate Markdown security report
 */
function generateMarkdownReport(report) {
  const { summary, results, recommendations, riskAssessment } = report;
  
  let markdown = `# Security Test Report\n\n`;
  markdown += `**Generated:** ${new Date().toLocaleString()}\n`;
  markdown += `**Overall Score:** ${summary.overallScore}/100\n`;
  markdown += `**Risk Level:** ${riskAssessment}\n\n`;
  
  // Summary
  markdown += `## Summary\n\n`;
  markdown += `- **Total Tests:** ${summary.totalTests}\n`;
  markdown += `- **Passed:** ${summary.passedTests}\n`;
  markdown += `- **Failed:** ${summary.failedTests}\n`;
  markdown += `- **Warnings:** ${summary.warningTests}\n`;
  markdown += `- **Execution Time:** ${summary.executionTime}ms\n\n`;
  
  // Vulnerability counts
  markdown += `## Vulnerability Breakdown\n\n`;
  Object.entries(summary.vulnerabilityCounts).forEach(([level, count]) => {
    const icon = count === 0 ? '✅' : count <= 2 ? '⚠️' : '❌';
    markdown += `${icon} **${level}:** ${count}\n`;
  });
  markdown += '\n';
  
  // Test results
  markdown += `## Test Results\n\n`;
  results.forEach((result, index) => {
    const statusIcon = result.status === 'PASSED' ? '✅' : 
                      result.status === 'WARNING' ? '⚠️' : '❌';
    const vulnIcon = result.vulnerabilityLevel === 'NONE' ? '🟢' :
                    result.vulnerabilityLevel === 'LOW' ? '🟡' :
                    result.vulnerabilityLevel === 'MEDIUM' ? '🟠' :
                    result.vulnerabilityLevel === 'HIGH' ? '🔴' : '⚫';
    
    markdown += `### ${index + 1}. ${result.testName}\n\n`;
    markdown += `${statusIcon} **Status:** ${result.status}\n`;
    markdown += `${vulnIcon} **Vulnerability Level:** ${result.vulnerabilityLevel}\n`;
    markdown += `**Category:** ${result.category}\n`;
    markdown += `**Description:** ${result.description}\n`;
    markdown += `**Execution Time:** ${result.executionTime}ms\n\n`;
    
    if (result.recommendations.length > 0) {
      markdown += `**Recommendations:**\n`;
      result.recommendations.forEach((rec, recIndex) => {
        markdown += `${recIndex + 1}. ${rec}\n`;
      });
      markdown += '\n';
    }
    
    if (Object.keys(result.details).length > 0) {
      markdown += `**Details:**\n`;
      Object.entries(result.details).forEach(([key, value]) => {
        markdown += `- **${key}:** ${value}\n`;
      });
      markdown += '\n';
    }
  });
  
  // Recommendations
  if (recommendations.length > 0) {
    markdown += `## Security Recommendations\n\n`;
    recommendations.forEach((rec, index) => {
      const priorityIcon = rec.priority === 'CRITICAL' ? '🔴' :
                          rec.priority === 'HIGH' ? '🟠' :
                          rec.priority === 'MEDIUM' ? '🟡' : '🟢';
      
      markdown += `### ${index + 1}. ${priorityIcon} ${rec.priority} Priority\n\n`;
      markdown += `**Action:** ${rec.action}\n`;
      markdown += `**Description:** ${rec.description}\n`;
      markdown += `**Timeframe:** ${rec.timeframe}\n\n`;
    });
  }
  
  return markdown;
}

/**
 * Generate HTML security report
 */
function generateHtmlReport(report) {
  const { summary, results, recommendations, riskAssessment } = report;
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .score { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .score.excellent { color: #28a745; }
        .score.good { color: #28a745; }
        .score.fair { color: #ffc107; }
        .score.poor { color: #fd7e14; }
        .score.critical { color: #dc3545; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-item { text-align: center; padding: 15px; border-radius: 5px; background: #f8f9fa; }
        .summary-item h3 { margin: 0; color: #495057; }
        .summary-item .value { font-size: 1.5em; font-weight: bold; margin: 5px 0; }
        .vulnerability-breakdown { margin: 20px 0; }
        .vuln-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; margin: 5px 0; border-radius: 5px; }
        .vuln-item.critical { background: #f8d7da; color: #721c24; }
        .vuln-item.high { background: #fff3cd; color: #856404; }
        .vuln-item.medium { background: #d1ecf1; color: #0c5460; }
        .vuln-item.low { background: #d4edda; color: #155724; }
        .vuln-item.none { background: #d1e7dd; color: #0f5132; }
        .test-result { border: 1px solid #dee2e6; border-radius: 5px; margin: 15px 0; padding: 15px; }
        .test-result.passed { border-left: 5px solid #28a745; }
        .test-result.failed { border-left: 5px solid #dc3545; }
        .test-result.warning { border-left: 5px solid #ffc107; }
        .test-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .test-status { padding: 5px 10px; border-radius: 3px; font-weight: bold; }
        .status-passed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .status-warning { background: #fff3cd; color: #856404; }
        .recommendations { margin: 20px 0; }
        .rec-item { padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 5px solid; }
        .rec-critical { background: #f8d7da; border-left-color: #dc3545; }
        .rec-high { background: #fff3cd; border-left-color: #fd7e14; }
        .rec-medium { background: #d1ecf1; border-left-color: #ffc107; }
        .rec-low { background: #d4edda; border-left-color: #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Security Test Report</h1>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <div class="score ${getScoreClass(summary.overallScore)}">${summary.overallScore}/100</div>
            <p><strong>Risk Level:</strong> ${riskAssessment}</p>
        </div>`;
  
  // Summary section
  html += `
        <div class="summary">
            <div class="summary-item">
                <h3>Total Tests</h3>
                <div class="value">${summary.totalTests}</div>
            </div>
            <div class="summary-item">
                <h3>Passed</h3>
                <div class="value">${summary.passedTests}</div>
            </div>
            <div class="summary-item">
                <h3>Failed</h3>
                <div class="value">${summary.failedTests}</div>
            </div>
            <div class="summary-item">
                <h3>Warnings</h3>
                <div class="value">${summary.warningTests}</div>
            </div>
        </div>`;
  
  // Vulnerability breakdown
  html += `
        <h2>Vulnerability Breakdown</h2>
        <div class="vulnerability-breakdown">`;
  
  Object.entries(summary.vulnerabilityCounts).forEach(([level, count]) => {
    const icon = count === 0 ? '✅' : count <= 2 ? '⚠️' : '❌';
    html += `
            <div class="vuln-item ${level.toLowerCase()}">
                <span>${icon} ${level}</span>
                <span><strong>${count}</strong></span>
            </div>`;
  });
  
  html += `
        </div>`;
  
  // Test results
  html += `
        <h2>Test Results</h2>`;
  
  results.forEach((result, index) => {
    const statusClass = result.status.toLowerCase();
    const statusClassCss = `status-${statusClass}`;
    
    html += `
        <div class="test-result ${statusClass}">
            <div class="test-header">
                <h3>${index + 1}. ${result.testName}</h3>
                <span class="test-status ${statusClassCss}">${result.status}</span>
            </div>
            <p><strong>Category:</strong> ${result.category}</p>
            <p><strong>Vulnerability Level:</strong> ${result.vulnerabilityLevel}</p>
            <p><strong>Description:</strong> ${result.description}</p>
            <p><strong>Execution Time:</strong> ${result.executionTime}ms</p>`;
    
    if (result.recommendations.length > 0) {
      html += `
            <p><strong>Recommendations:</strong></p>
            <ul>`;
      result.recommendations.forEach(rec => {
        html += `<li>${rec}</li>`;
      });
      html += `
            </ul>`;
    }
    
    if (Object.keys(result.details).length > 0) {
      html += `
            <p><strong>Details:</strong></p>
            <ul>`;
      Object.entries(result.details).forEach(([key, value]) => {
        html += `<li><strong>${key}:</strong> ${value}</li>`;
      });
      html += `
            </ul>`;
    }
    
    html += `
        </div>`;
  });
  
  // Recommendations
  if (recommendations.length > 0) {
    html += `
        <h2>Security Recommendations</h2>
        <div class="recommendations">`;
    
    recommendations.forEach((rec, index) => {
      const recClass = `rec-${rec.priority.toLowerCase()}`;
      const priorityIcon = rec.priority === 'CRITICAL' ? '🔴' :
                          rec.priority === 'HIGH' ? '🟠' :
                          rec.priority === 'MEDIUM' ? '🟡' : '🟢';
      
      html += `
            <div class="rec-item ${recClass}">
                <h3>${priorityIcon} ${rec.priority} Priority</h3>
                <p><strong>Action:</strong> ${rec.action}</p>
                <p><strong>Description:</strong> ${rec.description}</p>
                <p><strong>Timeframe:</strong> ${rec.timeframe}</p>
            </div>`;
    });
    
    html += `
        </div>`;
  }
  
  html += `
    </div>
</body>
</html>`;
  
  return html;
}

/**
 * Get CSS class for score styling
 */
function getScoreClass(score) {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'fair';
  if (score >= 50) return 'poor';
  return 'critical';
}

/**
 * Send security notifications
 */
async function sendSecurityNotifications(report, options) {
  if (!options.sendNotifications || !CI_CD_CONFIG.notifications.enabled) {
    return;
  }

  try {
    // Slack notification
    if (CI_CD_CONFIG.notifications.slack.webhook) {
      await sendSlackNotification(report);
    }

    // Email notification
    if (CI_CD_CONFIG.notifications.email.smtp && CI_CD_CONFIG.notifications.email.recipients.length > 0) {
      await sendEmailNotification(report);
    }

    manufacturingLogger.info('Security notifications sent', {
      category: 'security_ci_cd'
    });
  } catch (error) {
    manufacturingLogger.error('Failed to send security notifications', {
      error: error.message,
      category: 'security_ci_cd'
    });
  }
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(report) {
  const { summary, riskAssessment } = report;
  
  const message = {
    text: `🔒 Security Test Results - ${riskAssessment.toUpperCase()} RISK`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🔒 Security Test Results - ${riskAssessment.toUpperCase()} RISK`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Overall Score:*\n${summary.overallScore}/100`
          },
          {
            type: 'mrkdwn',
            text: `*Risk Level:*\n${riskAssessment}`
          }
        ]
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Tests Passed:*\n${summary.passedTests}/${summary.totalTests}`
          },
          {
            type: 'mrkdwn',
            text: `*Execution Time:*\n${summary.executionTime}ms`
          }
        ]
      }
    ]
  };

  // Add vulnerability breakdown
  const vulnFields = [];
  Object.entries(summary.vulnerabilityCounts).forEach(([level, count]) => {
    if (count > 0) {
      vulnFields.push({
        type: 'mrkdwn',
        text: `*${level}:* ${count}`
      });
    }
  });

  if (vulnFields.length > 0) {
    message.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Vulnerabilities Detected:*'
      },
      fields: vulnFields
    });
  }

  // Send to Slack webhook
  const response = await fetch(CI_CD_CONFIG.notifications.slack.webhook, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });

  if (!response.ok) {
    throw new Error(`Slack notification failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(report) {
  // This would integrate with your email service
  // For now, we'll just log the intention
  manufacturingLogger.info('Email notification would be sent', {
    recipients: CI_CD_CONFIG.notifications.email.recipients,
    category: 'security_ci_cd'
  });
}

/**
 * Main CI/CD security testing function
 */
async function main() {
  try {
    const options = parseArguments();
    
    console.log('🔒 Starting CI/CD Security Testing...');
    console.log('=====================================\n');
    
    // Run security tests
    const report = await runSecurityTestSuite();
    
    // Determine exit code
    const exitCode = determineExitCode(report, options);
    
    // Generate report if requested
    if (options.generateReport) {
      const reportPath = generateSecurityReport(report, options.outputFormat);
      console.log(`📊 Security report generated: ${reportPath}`);
    }
    
    // Send notifications if requested
    await sendSecurityNotifications(report, options);
    
    // Print summary
    console.log('\n📋 Security Test Summary:');
    console.log('==========================');
    console.log(`Overall Score: ${report.summary.overallScore}/100`);
    console.log(`Risk Level: ${report.riskAssessment}`);
    console.log(`Tests: ${report.summary.passedTests}/${report.summary.totalTests} passed`);
    console.log(`Vulnerabilities: ${Object.values(report.summary.vulnerabilityCounts).reduce((a, b) => a + b, 0)} total`);
    console.log(`Exit Code: ${exitCode}`);
    
    // Exit with appropriate code
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ CI/CD Security Testing Failed:', error.message);
    manufacturingLogger.error('CI/CD security testing failed', {
      error: error.message,
      stack: error.stack,
      category: 'security_ci_cd'
    });
    process.exit(CI_CD_CONFIG.exitCodes.CRITICAL);
  }
}

// Run main function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as runSecurityCICD };
