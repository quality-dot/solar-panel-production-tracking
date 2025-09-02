/**
 * Security Dashboard Service
 * Task: 22.6 - Security Dashboard with real-time updates (SSE)
 */

export interface SecurityEvent {
  id: string;
  eventType: string;
  severity: 'info' | 'warning' | 'error' | 'critical' | 'low' | 'medium' | 'high';
  timestamp: string;
  userId?: string | number;
  source: string;
  message?: string;
  context?: Record<string, any>;
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
  private eventSource: EventSource | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;

  constructor() {
    // Backend runs on 3000 by default
    this.baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
    this.initializeSSE();
  }

  // Server-Sent Events Management
  private initializeSSE() {
    try {
      const sseUrl = `${this.baseUrl}/api/v1/security-events/stream`;
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit('connection', { status: 'connected' });
      };

      this.eventSource.onerror = () => {
        this.emit('connection', { status: 'error' });
        // Notify UI with an alert event (used for toast/banner)
        this.emit('alert', {
          id: `sse-disconnect-${Date.now()}`,
          type: 'security',
          severity: 'medium',
          title: 'Real-time connection lost',
          message: 'Attempting to reconnect to live security updates...',
          timestamp: new Date().toISOString(),
          acknowledged: false,
          actions: []
        });
        this.scheduleReconnect();
      };

      this.eventSource.addEventListener('snapshot', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          // Optionally propagate initial snapshot
          if (data.metrics) this.emit('metricsUpdate', data.metrics);
          if (data.events) {
            // Normalize events shape to SecurityEvent as best-effort
            const events = (data.events as any[]).map((ev) => ({
              id: String(ev.id ?? `${ev.eventType}-${ev.timestamp}`),
              eventType: ev.eventType || ev.event_type,
              severity: ev.severity,
              timestamp: ev.timestamp || new Date().toISOString(),
              userId: ev.userId ?? ev.user_id,
              source: ev.source || 'system',
              correlationId: ev.correlationId ?? ev.correlation_id,
              context: ev.eventData ?? ev.event_data
            }));
            this.emit('securityEvent', events[0]); // push first; UI already shows recent list from API
          }
        } catch {}
      });

      this.eventSource.addEventListener('securityEvent', (e: MessageEvent) => {
        try {
          const ev = JSON.parse(e.data);
          const event: SecurityEvent = {
            id: String(ev.id ?? `${ev.eventType}-${ev.timestamp}`),
            eventType: ev.eventType,
            severity: ev.severity,
            timestamp: ev.timestamp,
            userId: ev.userId,
            source: ev.source,
            correlationId: ev.correlationId,
            context: ev.eventData
          };
        	this.emit('securityEvent', event);
        } catch (err) {
          console.error('Failed to parse securityEvent:', err);
        }
      });
    } catch (error) {
      console.error('Failed to initialize SSE:', error);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const base = this.reconnectDelay * this.reconnectAttempts;
      const jitter = Math.floor(Math.random() * 500);
      setTimeout(() => {
        this.initializeSSE();
      }, base + jitter);
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
      listeners.forEach((cb) => {
        try { cb(data); } catch (err) { console.error('Listener error:', err); }
      });
    }
  }

  // API Methods
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    // No backend endpoint yet; return mock for now
    return this.getMockSecurityMetrics();
  }

  async getComplianceStatus(): Promise<ComplianceStatus> {
    return this.getMockComplianceStatus();
  }

  async getManufacturingSecurity(): Promise<ManufacturingSecurity> {
    return this.getMockManufacturingSecurity();
  }

  async getRecentSecurityEvents(limit: number = 10): Promise<SecurityEvent[]> {
    try {
      const url = new URL(`${this.baseUrl}/api/v1/security-events`);
      url.searchParams.set('limit', String(limit));
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.events;
      if (!rows) return this.getMockRecentEvents(limit);
      return rows.map((ev: any) => ({
        id: String(ev.id ?? `${ev.event_type}-${ev.timestamp}`),
        eventType: ev.event_type ?? ev.eventType,
        severity: ev.severity ?? 'info',
        timestamp: ev.timestamp ?? new Date().toISOString(),
        userId: ev.user_id ?? ev.userId,
        source: ev.source ?? 'system',
        correlationId: ev.correlation_id ?? ev.correlationId,
        context: ev.event_data ?? ev.eventData
      })) as SecurityEvent[];
    } catch (error) {
      console.error('Failed to fetch recent security events:', error);
      return this.getMockRecentEvents(limit);
    }
  }

  async getSecurityAlerts(): Promise<SecurityAlert[]> {
    return this.getMockSecurityAlerts();
  }

  async acknowledgeAlert(_alertId: string, _userId: string): Promise<boolean> {
    // No backend endpoint yet
    return true;
  }

  async getDashboardConfig(): Promise<DashboardConfig> {
    return this.getDefaultDashboardConfig();
  }

  async updateDashboardConfig(_config: Partial<DashboardConfig>): Promise<boolean> {
    return true;
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
      isa99: { status: 'compliant', score: 92, lastAssessment: '2025-01-27T10:00:00Z', nextAssessment: '2025-04-27T10:00:00Z', requirements: ['Access Control','Network Segmentation','Incident Response'], gaps: ['Advanced Threat Detection'] },
      nist: { status: 'partial', score: 78, lastAssessment: '2025-01-27T10:00:00Z', nextAssessment: '2025-02-11T10:00:00Z', framework: { identify: 85, protect: 90, detect: 65, respond: 70, recover: 80 } },
      gdpr: { status: 'compliant', score: 95, lastAssessment: '2025-01-27T10:00:00Z', nextAssessment: '2025-07-27T10:00:00Z', dataProtection: { consent: true, dataMinimization: true, rightToErasure: true, dataPortability: true } }
    };
  }

  private getMockManufacturingSecurity(): ManufacturingSecurity {
    return {
      productionLines: {
        line1: { status: 'secure', incidents: 0, securityScore: 95 },
        line2: { status: 'warning', incidents: 2, securityScore: 78, lastIncident: '2025-01-27T14:25:00Z' }
      },
      stations: {
        total: 8, secure: 6, warning: 1, critical: 1,
        details: [
          { id: 'station-1', name: 'Assembly & EL', status: 'secure', lastActivity: '2025-01-27T14:30:00Z', securityEvents: 0 },
          { id: 'station-4', name: 'Performance & Final', status: 'warning', lastActivity: '2025-01-27T14:20:00Z', securityEvents: 1 },
          { id: 'station-7', name: 'Junction Box', status: 'critical', lastActivity: '2025-01-27T14:15:00Z', securityEvents: 3 }
        ]
      },
      equipment: {
        total: 24, secure: 20, warning: 3, critical: 1,
        criticalEquipment: [{ id: 'eq-001', name: 'EL Test Equipment', type: 'Testing', issue: 'Communication timeout', lastUpdate: '2025-01-27T14:25:00Z' }]
      }
    };
  }

  private getMockRecentEvents(limit: number): SecurityEvent[] {
    const events: SecurityEvent[] = [
      { id: '1', eventType: 'user.login.failed', severity: 'warning', timestamp: '2025-01-27T14:30:00Z', userId: 'user-123', source: 'api', message: 'Multiple failed login attempts detected', context: { ip: '192.168.1.100', attempts: 5 }, correlationId: 'corr-001' },
      { id: '2', eventType: 'equipment.status.error', severity: 'critical', timestamp: '2025-01-27T14:25:00Z', source: 'equipment-monitor', message: 'Critical equipment failure detected', context: { equipmentId: 'eq-001', error: 'communication_timeout' }, correlationId: 'corr-002' },
      { id: '3', eventType: 'data.access.unauthorized', severity: 'error', timestamp: '2025-01-27T14:20:00Z', userId: 'user-456', source: 'api', message: 'Unauthorized access attempt to sensitive data', context: { endpoint: '/api/panel-data', resource: 'panel-789' }, correlationId: 'corr-003' }
    ];
    return events.slice(0, limit);
  }

  private getMockSecurityAlerts(): SecurityAlert[] {
    return [
      { id: 'alert-001', type: 'security', severity: 'high', title: 'Multiple Failed Login Attempts', message: 'User account showing suspicious login patterns', timestamp: '2025-01-27T14:30:00Z', acknowledged: false, actions: ['Investigate user activity', 'Review access logs', 'Consider account lockout'] },
      { id: 'alert-002', type: 'manufacturing', severity: 'critical', title: 'Critical Equipment Failure', message: 'EL test equipment communication timeout', timestamp: '2025-01-27T14:25:00Z', acknowledged: true, acknowledgedBy: 'supervisor-001', acknowledgedAt: '2025-01-27T14:26:00Z', actions: ['Check network connectivity', 'Restart equipment', 'Contact maintenance'] }
    ];
  }

  private getDefaultDashboardConfig(): DashboardConfig {
    return {
      updateFrequency: 30,
      alertThresholds: { critical: 5, warning: 20, error: 15 },
      complianceSchedule: { isa99: 90, nist: 90, gdpr: 180 },
      enabledFeatures: { realTimeUpdates: true, complianceTracking: true, manufacturingSecurity: true, alertSystem: true }
    };
  }

  // Cleanup
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.eventListeners.clear();
  }
}

export const securityDashboardService = new SecurityDashboardService();
export default securityDashboardService;
