/**
 * Security Dashboard Service
 * Task: 22.4 - Basic Security Dashboard
 * Description: Service for integrating with Event Collection System and providing security data
 * Date: 2025-01-27
 */

// Types for security dashboard data
export interface SecurityEvent {
  id: string;
  eventType: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  userId?: string;
  source: string;
  message: string;
  context: Record<string, any>;
  correlationId?: string;
  sourceIp?: string;
}

export interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  warningEvents: number;
  errorEvents: number;
  infoEvents: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceScore: number;
  activeIncidents: number;
  resolvedIncidents: number;
  lastUpdated: string;
}

export interface ComplianceStatus {
  isa99: {
    status: 'compliant' | 'non-compliant' | 'partial';
    score: number;
    lastAssessment: string;
    nextAssessment: string;
    requirements: string[];
    gaps: string[];
  };
  nist: {
    status: 'compliant' | 'non-compliant' | 'partial';
    score: number;
    lastAssessment: string;
    nextAssessment: string;
    framework: {
      identify: number;
      protect: number;
      detect: number;
      respond: number;
      recover: number;
    };
  };
  gdpr: {
    status: 'compliant' | 'non-compliant' | 'partial';
    score: number;
    lastAssessment: string;
    nextAssessment: string;
    dataProtection: {
      consent: boolean;
      dataMinimization: boolean;
      rightToErasure: boolean;
      dataPortability: boolean;
    };
  };
}

export interface ManufacturingSecurity {
  productionLines: {
    line1: { 
      status: 'secure' | 'warning' | 'critical'; 
      incidents: number;
      securityScore: number;
      lastIncident?: string;
    };
    line2: { 
      status: 'secure' | 'warning' | 'critical'; 
      incidents: number;
      securityScore: number;
      lastIncident?: string;
    };
  };
  stations: {
    total: number;
    secure: number;
    warning: number;
    critical: number;
    details: Array<{
      id: string;
      name: string;
      status: 'secure' | 'warning' | 'critical';
      lastActivity: string;
      securityEvents: number;
    }>;
  };
  equipment: {
    total: number;
    secure: number;
    warning: number;
    critical: number;
    criticalEquipment: Array<{
      id: string;
      name: string;
      type: string;
      issue: string;
      lastUpdate: string;
    }>;
  };
}

export interface SecurityAlert {
  id: string;
  type: 'security' | 'compliance' | 'manufacturing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  actions: string[];
}

export interface DashboardConfig {
  updateFrequency: number; // seconds
  alertThresholds: {
    critical: number;
    warning: number;
    error: number;
  };
  complianceSchedule: {
    isa99: number; // days
    nist: number; // days
    gdpr: number; // days
  };
  enabledFeatures: {
    realTimeUpdates: boolean;
    complianceTracking: boolean;
    manufacturingSecurity: boolean;
    alertSystem: boolean;
  };
}

class SecurityDashboardService {
  private baseUrl: string;
  private webSocket: WebSocket | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    this.initializeWebSocket();
  }

  // WebSocket Management
  private initializeWebSocket() {
    try {
      const wsUrl = this.baseUrl.replace('http', 'ws') + '/security-events';
      this.webSocket = new WebSocket(wsUrl);
      
      this.webSocket.onopen = () => {
        console.log('Security Dashboard WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connection', { status: 'connected' });
      };

      this.webSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.webSocket.onclose = () => {
        console.log('Security Dashboard WebSocket disconnected');
        this.emit('connection', { status: 'disconnected' });
        this.scheduleReconnect();
      };

      this.webSocket.onerror = (error) => {
        console.error('Security Dashboard WebSocket error:', error);
        this.emit('connection', { status: 'error', error });
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.initializeWebSocket();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private handleWebSocketMessage(data: any) {
    switch (data.type) {
      case 'security_event':
        this.emit('securityEvent', data.event);
        break;
      case 'metrics_update':
        this.emit('metricsUpdate', data.metrics);
        break;
      case 'compliance_update':
        this.emit('complianceUpdate', data.compliance);
        break;
      case 'manufacturing_update':
        this.emit('manufacturingUpdate', data.manufacturing);
        break;
      case 'alert':
        this.emit('alert', data.alert);
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  // Event Management
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // API Methods
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/api/security/metrics`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch security metrics:', error);
      // Return mock data for development
      return this.getMockSecurityMetrics();
    }
  }

  async getComplianceStatus(): Promise<ComplianceStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/security/compliance`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch compliance status:', error);
      // Return mock data for development
      return this.getMockComplianceStatus();
    }
  }

  async getManufacturingSecurity(): Promise<ManufacturingSecurity> {
    try {
      const response = await fetch(`${this.baseUrl}/api/security/manufacturing`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch manufacturing security:', error);
      // Return mock data for development
      return this.getMockManufacturingSecurity();
    }
  }

  async getRecentSecurityEvents(limit: number = 10): Promise<SecurityEvent[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/security/events?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch recent security events:', error);
      // Return mock data for development
      return this.getMockRecentEvents(limit);
    }
  }

  async getSecurityAlerts(): Promise<SecurityAlert[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/security/alerts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch security alerts:', error);
      // Return mock data for development
      return this.getMockSecurityAlerts();
    }
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/security/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      return false;
    }
  }

  async getDashboardConfig(): Promise<DashboardConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/api/security/dashboard/config`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch dashboard config:', error);
      // Return default config
      return this.getDefaultDashboardConfig();
    }
  }

  async updateDashboardConfig(config: Partial<DashboardConfig>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/security/dashboard/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to update dashboard config:', error);
      return false;
    }
  }

  // Mock Data Methods (for development)
  private getMockSecurityMetrics(): SecurityMetrics {
    return {
      totalEvents: 1247,
      criticalEvents: 3,
      warningEvents: 12,
      errorEvents: 8,
      infoEvents: 1224,
      riskScore: 65,
      riskLevel: 'medium',
      complianceScore: 87,
      activeIncidents: 2,
      resolvedIncidents: 15,
      lastUpdated: new Date().toISOString()
    };
  }

  private getMockComplianceStatus(): ComplianceStatus {
    return {
      isa99: {
        status: 'compliant',
        score: 92,
        lastAssessment: '2025-01-27T10:00:00Z',
        nextAssessment: '2025-04-27T10:00:00Z',
        requirements: ['Access Control', 'Network Segmentation', 'Incident Response'],
        gaps: ['Advanced Threat Detection']
      },
      nist: {
        status: 'partial',
        score: 78,
        lastAssessment: '2025-01-27T10:00:00Z',
        nextAssessment: '2025-02-11T10:00:00Z',
        framework: {
          identify: 85,
          protect: 90,
          detect: 65,
          respond: 70,
          recover: 80
        }
      },
      gdpr: {
        status: 'compliant',
        score: 95,
        lastAssessment: '2025-01-27T10:00:00Z',
        nextAssessment: '2025-07-27T10:00:00Z',
        dataProtection: {
          consent: true,
          dataMinimization: true,
          rightToErasure: true,
          dataPortability: true
        }
      }
    };
  }

  private getMockManufacturingSecurity(): ManufacturingSecurity {
    return {
      productionLines: {
        line1: { 
          status: 'secure', 
          incidents: 0, 
          securityScore: 95,
          lastIncident: undefined
        },
        line2: { 
          status: 'warning', 
          incidents: 2, 
          securityScore: 78,
          lastIncident: '2025-01-27T14:25:00Z'
        }
      },
      stations: {
        total: 8,
        secure: 6,
        warning: 1,
        critical: 1,
        details: [
          { id: 'station-1', name: 'Assembly & EL', status: 'secure', lastActivity: '2025-01-27T14:30:00Z', securityEvents: 0 },
          { id: 'station-2', name: 'Framing', status: 'secure', lastActivity: '2025-01-27T14:28:00Z', securityEvents: 0 },
          { id: 'station-3', name: 'Junction Box', status: 'secure', lastActivity: '2025-01-27T14:25:00Z', securityEvents: 0 },
          { id: 'station-4', name: 'Performance & Final', status: 'warning', lastActivity: '2025-01-27T14:20:00Z', securityEvents: 1 },
          { id: 'station-5', name: 'Assembly & EL', status: 'secure', lastActivity: '2025-01-27T14:32:00Z', securityEvents: 0 },
          { id: 'station-6', name: 'Framing', status: 'secure', lastActivity: '2025-01-27T14:29:00Z', securityEvents: 0 },
          { id: 'station-7', name: 'Junction Box', status: 'critical', lastActivity: '2025-01-27T14:15:00Z', securityEvents: 3 },
          { id: 'station-8', name: 'Performance & Final', status: 'secure', lastActivity: '2025-01-27T14:35:00Z', securityEvents: 0 }
        ]
      },
      equipment: {
        total: 24,
        secure: 20,
        warning: 3,
        critical: 1,
        criticalEquipment: [
          {
            id: 'eq-001',
            name: 'EL Test Equipment',
            type: 'Testing',
            issue: 'Communication timeout',
            lastUpdate: '2025-01-27T14:25:00Z'
          }
        ]
      }
    };
  }

  private getMockRecentEvents(limit: number): SecurityEvent[] {
    const events: SecurityEvent[] = [
      {
        id: '1',
        eventType: 'user.login.failed',
        severity: 'warning',
        timestamp: '2025-01-27T14:30:00Z',
        userId: 'user-123',
        source: 'api',
        message: 'Multiple failed login attempts detected',
        context: { ip: '192.168.1.100', attempts: 5 },
        correlationId: 'corr-001'
      },
      {
        id: '2',
        eventType: 'equipment.status.error',
        severity: 'critical',
        timestamp: '2025-01-27T14:25:00Z',
        source: 'equipment-monitor',
        message: 'Critical equipment failure detected',
        context: { equipmentId: 'eq-001', error: 'communication_timeout' },
        correlationId: 'corr-002'
      },
      {
        id: '3',
        eventType: 'data.access.unauthorized',
        severity: 'error',
        timestamp: '2025-01-27T14:20:00Z',
        userId: 'user-456',
        source: 'api',
        message: 'Unauthorized access attempt to sensitive data',
        context: { endpoint: '/api/panel-data', resource: 'panel-789' },
        correlationId: 'corr-003'
      }
    ];
    return events.slice(0, limit);
  }

  private getMockSecurityAlerts(): SecurityAlert[] {
    return [
      {
        id: 'alert-001',
        type: 'security',
        severity: 'high',
        title: 'Multiple Failed Login Attempts',
        message: 'User account showing suspicious login patterns',
        timestamp: '2025-01-27T14:30:00Z',
        acknowledged: false,
        actions: ['Investigate user activity', 'Review access logs', 'Consider account lockout']
      },
      {
        id: 'alert-002',
        type: 'manufacturing',
        severity: 'critical',
        title: 'Critical Equipment Failure',
        message: 'EL test equipment communication timeout',
        timestamp: '2025-01-27T14:25:00Z',
        acknowledged: true,
        acknowledgedBy: 'supervisor-001',
        acknowledgedAt: '2025-01-27T14:26:00Z',
        actions: ['Check network connectivity', 'Restart equipment', 'Contact maintenance']
      }
    ];
  }

  private getDefaultDashboardConfig(): DashboardConfig {
    return {
      updateFrequency: 30,
      alertThresholds: {
        critical: 5,
        warning: 20,
        error: 15
      },
      complianceSchedule: {
        isa99: 90,
        nist: 90,
        gdpr: 180
      },
      enabledFeatures: {
        realTimeUpdates: true,
        complianceTracking: true,
        manufacturingSecurity: true,
        alertSystem: true
      }
    };
  }

  // Cleanup
  disconnect() {
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const securityDashboardService = new SecurityDashboardService();
export default securityDashboardService;
