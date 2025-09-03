// Dashboard HTML Generator
// Creates HTML dashboard for production floor monitoring

/**
 * Generate HTML dashboard for production floor monitoring
 */
export function generateProductionDashboard(dashboardData) {
  const {
    overview,
    lines,
    manufacturingOrders,
    alerts,
    performance,
    errors,
    lastUpdated
  } = dashboardData;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Production Floor Dashboard - Solar Panel Manufacturing</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #1a1a1a;
            color: #ffffff;
            padding: 20px;
        }
        
        .dashboard {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            grid-gap: 20px;
            max-width: 1800px;
            margin: 0 auto;
        }
        
        .card {
            background: #2d2d2d;
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #4CAF50;
        }
        
        .card.warning {
            border-left-color: #FF9800;
        }
        
        .card.error {
            border-left-color: #f44336;
        }
        
        .card.critical {
            border-left-color: #d32f2f;
        }
        
        .card h2 {
            margin-bottom: 15px;
            color: #ffffff;
            font-size: 1.2em;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #444;
        }
        
        .metric:last-child {
            border-bottom: none;
        }
        
        .metric-label {
            color: #cccccc;
        }
        
        .metric-value {
            font-weight: bold;
            font-size: 1.1em;
        }
        
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status-optimal { background: #4CAF50; }
        .status-good { background: #8BC34A; }
        .status-warning { background: #FF9800; }
        .status-critical { background: #f44336; }
        
        .alerts {
            grid-column: span 3;
        }
        
        .alert {
            background: #3d3d3d;
            padding: 12px;
            margin-bottom: 8px;
            border-radius: 4px;
            border-left: 3px solid #f44336;
        }
        
        .alert.warning {
            border-left-color: #FF9800;
        }
        
        .alert.info {
            border-left-color: #2196F3;
        }
        
        .header {
            grid-column: span 3;
            text-align: center;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .last-updated {
            color: #888;
            font-size: 0.9em;
        }
        
        .refresh-btn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        }
        
        .refresh-btn:hover {
            background: #45a049;
        }

        .line-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-gap: 10px;
        }

        .line-card {
            background: #3d3d3d;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
        }

        .line-card h3 {
            color: #4CAF50;
            margin-bottom: 10px;
        }

        .progress-bar {
            width: 100%;
            height: 20px;
            background: #555;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🏭 Production Floor Dashboard</h1>
            <div class="last-updated">Last Updated: ${new Date(lastUpdated).toLocaleString()}</div>
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
        </div>

        <!-- System Overview -->
        <div class="card ${overview.status}">
            <h2>📊 System Overview</h2>
            <div class="metric">
                <span class="metric-label">
                    <span class="status-indicator status-${overview.status}"></span>
                    System Status
                </span>
                <span class="metric-value">${overview.status.toUpperCase()}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Uptime</span>
                <span class="metric-value">${overview.uptime}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Total Scans</span>
                <span class="metric-value">${overview.totalScans}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Success Rate</span>
                <span class="metric-value">${overview.successRate}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Scans/Minute</span>
                <span class="metric-value">${overview.scansPerMinute}</span>
            </div>
        </div>

        <!-- Production Lines -->
        <div class="card">
            <h2>🏭 Production Lines</h2>
            <div class="line-stats">
                <div class="line-card">
                    <h3>Line 1</h3>
                    <div class="metric">
                        <span class="metric-label">Scans</span>
                        <span class="metric-value">${lines.line1?.scans || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Success Rate</span>
                        <span class="metric-value">${lines.line1?.successRate || '0%'}</span>
                    </div>
                </div>
                <div class="line-card">
                    <h3>Line 2</h3>
                    <div class="metric">
                        <span class="metric-label">Scans</span>
                        <span class="metric-value">${lines.line2?.scans || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Success Rate</span>
                        <span class="metric-value">${lines.line2?.successRate || '0%'}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Manufacturing Orders -->
        <div class="card">
            <h2>📋 Manufacturing Orders</h2>
            <div class="metric">
                <span class="metric-label">Total MOs</span>
                <span class="metric-value">${manufacturingOrders.totalMOs}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Active MOs</span>
                <span class="metric-value">${manufacturingOrders.activeMOs}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Completed</span>
                <span class="metric-value">${manufacturingOrders.production.completed}/${manufacturingOrders.production.target}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${manufacturingOrders.production.target > 0 ? (manufacturingOrders.production.completed / manufacturingOrders.production.target * 100) : 0}%"></div>
            </div>
            <div class="metric">
                <span class="metric-label">In Progress</span>
                <span class="metric-value">${manufacturingOrders.production.inProgress}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Failed</span>
                <span class="metric-value">${manufacturingOrders.production.failed}</span>
            </div>
        </div>

        <!-- Performance Metrics -->
        <div class="card">
            <h2>⚡ Performance</h2>
            <div class="metric">
                <span class="metric-label">Avg Processing Time</span>
                <span class="metric-value">${performance.averageProcessingTime ? performance.averageProcessingTime + 'ms' : 'N/A'}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Peak Throughput</span>
                <span class="metric-value">${performance.peakThroughput}/min</span>
            </div>
            <div class="metric">
                <span class="metric-label">Error Rate</span>
                <span class="metric-value">${performance.errorRate || '0%'}</span>
            </div>
        </div>

        <!-- Error Summary -->
        <div class="card ${errors.recentErrors > 5 ? 'error' : errors.recentErrors > 2 ? 'warning' : ''}">
            <h2>🚨 Error Summary</h2>
            <div class="metric">
                <span class="metric-label">Error Types</span>
                <span class="metric-value">${errors.totalTypes}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Recent Errors (1h)</span>
                <span class="metric-value">${errors.recentErrors}</span>
            </div>
            ${errors.topErrors.map(error => `
                <div class="metric">
                    <span class="metric-label">${error.errorCode}</span>
                    <span class="metric-value">${error.count} (${error.trend})</span>
                </div>
            `).join('')}
        </div>

        <!-- Real-time Data -->
        <div class="card">
            <h2>📡 Real-time Data</h2>
            <div class="metric">
                <span class="metric-label">Last Scan</span>
                <span class="metric-value">${performance.averageProcessingTime ? 'Active' : 'No Data'}</span>
            </div>
            <div class="metric">
                <span class="metric-label">System Load</span>
                <span class="metric-value">${overview.status === 'optimal' ? 'Low' : overview.status === 'good' ? 'Normal' : 'High'}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Database</span>
                <span class="metric-value">Connected</span>
            </div>
        </div>

        <!-- Alerts -->
        ${alerts.length > 0 ? `
        <div class="alerts card error">
            <h2>🚨 Active Alerts (${alerts.length})</h2>
            ${alerts.map(alert => `
                <div class="alert ${alert.level}">
                    <strong>${alert.level.toUpperCase()}:</strong> ${alert.message}
                    <br><small>${new Date(alert.timestamp).toLocaleString()}</small>
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>

    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => {
            location.reload();
        }, 30000);

        // Add visual feedback for refresh
        document.querySelector('.refresh-btn').addEventListener('click', function() {
            this.textContent = '🔄 Refreshing...';
            this.disabled = true;
        });
    </script>
</body>
</html>
`;
}

export default {
  generateProductionDashboard
};

