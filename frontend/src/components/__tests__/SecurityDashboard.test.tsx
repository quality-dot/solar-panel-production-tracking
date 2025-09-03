/**
 * Security Dashboard Component Tests
 * Task: 22.4 - Basic Security Dashboard
 * Description: Comprehensive testing of security dashboard functionality
 * Date: 2025-01-27
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SecurityDashboard from '../SecurityDashboard';
import securityDashboardService from '../../services/securityDashboardService';

// Mock the security dashboard service
jest.mock('../../services/securityDashboardService');
const mockSecurityDashboardService = securityDashboardService as jest.Mocked<typeof securityDashboardService>;

// Mock data
const mockSecurityMetrics = {
  totalEvents: 1247,
  criticalEvents: 3,
  warningEvents: 12,
  errorEvents: 8,
  infoEvents: 1224,
  riskScore: 65,
  riskLevel: 'medium' as const,
  complianceScore: 87,
  activeIncidents: 2,
  resolvedIncidents: 15,
  lastUpdated: new Date().toISOString()
};

const mockComplianceStatus = {
  isa99: {
    status: 'compliant' as const,
    score: 92,
    lastAssessment: '2025-01-27T10:00:00Z',
    nextAssessment: '2025-04-27T10:00:00Z',
    requirements: ['Access Control', 'Network Segmentation', 'Incident Response'],
    gaps: ['Advanced Threat Detection']
  },
  nist: {
    status: 'partial' as const,
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
    status: 'compliant' as const,
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

const mockManufacturingSecurity = {
  productionLines: {
    line1: { 
      status: 'secure' as const, 
      incidents: 0, 
      securityScore: 95,
      lastIncident: undefined
    },
    line2: { 
      status: 'warning' as const, 
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
      { id: 'station-1', name: 'Assembly & EL', status: 'secure' as const, lastActivity: '2025-01-27T14:30:00Z', securityEvents: 0 },
      { id: 'station-2', name: 'Framing', status: 'secure' as const, lastActivity: '2025-01-27T14:28:00Z', securityEvents: 0 },
      { id: 'station-3', name: 'Junction Box', status: 'secure' as const, lastActivity: '2025-01-27T14:25:00Z', securityEvents: 0 },
      { id: 'station-4', name: 'Performance & Final', status: 'warning' as const, lastActivity: '2025-01-27T14:20:00Z', securityEvents: 1 },
      { id: 'station-5', name: 'Assembly & EL', status: 'secure' as const, lastActivity: '2025-01-27T14:32:00Z', securityEvents: 0 },
      { id: 'station-6', name: 'Framing', status: 'secure' as const, lastActivity: '2025-01-27T14:29:00Z', securityEvents: 0 },
      { id: 'station-7', name: 'Junction Box', status: 'critical' as const, lastActivity: '2025-01-27T14:15:00Z', securityEvents: 3 },
      { id: 'station-8', name: 'Performance & Final', status: 'secure' as const, lastActivity: '2025-01-27T14:35:00Z', securityEvents: 0 }
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

const mockRecentEvents = [
  {
    id: '1',
    eventType: 'user.login.failed',
    severity: 'warning' as const,
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
    severity: 'critical' as const,
    timestamp: '2025-01-27T14:25:00Z',
    source: 'equipment-monitor',
    message: 'Critical equipment failure detected',
    context: { equipmentId: 'eq-001', error: 'communication_timeout' },
    correlationId: 'corr-002'
  }
];

const mockSecurityAlerts = [
  {
    id: 'alert-001',
    type: 'security' as const,
    severity: 'high' as const,
    title: 'Multiple Failed Login Attempts',
    message: 'User account showing suspicious login patterns',
    timestamp: '2025-01-27T14:30:00Z',
    acknowledged: false,
    actions: ['Investigate user activity', 'Review access logs', 'Consider account lockout']
  },
  {
    id: 'alert-002',
    type: 'manufacturing' as const,
    severity: 'critical' as const,
    title: 'Critical Equipment Failure',
    message: 'EL test equipment communication timeout',
    timestamp: '2025-01-27T14:25:00Z',
    acknowledged: true,
    acknowledgedBy: 'supervisor-001',
    acknowledgedAt: '2025-01-27T14:26:00Z',
    actions: ['Check network connectivity', 'Restart equipment', 'Contact maintenance']
  }
];

const mockDashboardConfig = {
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

describe('SecurityDashboard', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockSecurityDashboardService.getSecurityMetrics.mockResolvedValue(mockSecurityMetrics);
    mockSecurityDashboardService.getComplianceStatus.mockResolvedValue(mockComplianceStatus);
    mockSecurityDashboardService.getManufacturingSecurity.mockResolvedValue(mockManufacturingSecurity);
    mockSecurityDashboardService.getRecentSecurityEvents.mockResolvedValue(mockRecentEvents);
    mockSecurityDashboardService.getSecurityAlerts.mockResolvedValue(mockSecurityAlerts);
    mockSecurityDashboardService.getDashboardConfig.mockResolvedValue(mockDashboardConfig);
    
    // Mock event emitter methods
    mockSecurityDashboardService.on.mockImplementation(() => {});
    mockSecurityDashboardService.off.mockImplementation(() => {});
    mockSecurityDashboardService.disconnect.mockImplementation(() => {});
  });

  describe('Component Rendering', () => {
    it('renders the security dashboard with correct title', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Security Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Manufacturing security monitoring and compliance tracking')).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      render(<SecurityDashboard />);
      
      expect(screen.getByText('Loading security dashboard...')).toBeInTheDocument();
    });

    it('renders all navigation tabs', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Compliance')).toBeInTheDocument();
        expect(screen.getByText('Analytics')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });
  });

  describe('Overview Tab', () => {
    it('displays security metrics correctly', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('65')).toBeInTheDocument(); // Risk Score
        expect(screen.getByText('87%')).toBeInTheDocument(); // Compliance Score
        expect(screen.getByText('2')).toBeInTheDocument(); // Active Incidents
        expect(screen.getByText('1,247')).toBeInTheDocument(); // Total Events
      });
    });

    it('shows manufacturing security status', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Manufacturing Security Status')).toBeInTheDocument();
        expect(screen.getByText('Line 1')).toBeInTheDocument();
        expect(screen.getByText('Line 2')).toBeInTheDocument();
        expect(screen.getByText('secure')).toBeInTheDocument();
        expect(screen.getByText('warning')).toBeInTheDocument();
      });
    });

    it('displays security alerts when present', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Active Security Alerts')).toBeInTheDocument();
        expect(screen.getByText('Multiple Failed Login Attempts')).toBeInTheDocument();
        expect(screen.getByText('User account showing suspicious login patterns')).toBeInTheDocument();
      });
    });

    it('shows recent security events', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Recent Security Events')).toBeInTheDocument();
        expect(screen.getByText('Multiple failed login attempts detected')).toBeInTheDocument();
        expect(screen.getByText('Critical equipment failure detected')).toBeInTheDocument();
      });
    });
  });

  describe('Compliance Tab', () => {
    it('displays compliance overview correctly', async () => {
      render(<SecurityDashboard />);
      
      // Click on Compliance tab
      await waitFor(() => {
        fireEvent.click(screen.getByText('Compliance'));
      });
      
      expect(screen.getByText('ISA-99/IEC 62443')).toBeInTheDocument();
      expect(screen.getByText('NIST Framework')).toBeInTheDocument();
      expect(screen.getByText('GDPR')).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument(); // ISA-99 score
      expect(screen.getByText('78%')).toBeInTheDocument(); // NIST score
      expect(screen.getByText('95%')).toBeInTheDocument(); // GDPR score
    });

    it('shows compliance assessment details', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Compliance'));
      });
      
      expect(screen.getByText('Compliance Assessment Details')).toBeInTheDocument();
      expect(screen.getByText('Due in 30 days')).toBeInTheDocument(); // ISA-99 next assessment
      expect(screen.getByText('Due in 15 days')).toBeInTheDocument(); // NIST next assessment
      expect(screen.getByText('Due in 45 days')).toBeInTheDocument(); // GDPR next assessment
    });
  });

  describe('Analytics Tab', () => {
    it('displays security metrics breakdown', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Analytics'));
      });
      
      expect(screen.getByText('Security Event Trends')).toBeInTheDocument();
      expect(screen.getByText('Manufacturing Security Analytics')).toBeInTheDocument();
      expect(screen.getByText('+2 from yesterday')).toBeInTheDocument(); // Critical events trend
      expect(screen.getByText('-3 from yesterday')).toBeInTheDocument(); // Warning events trend
    });

    it('shows manufacturing security analytics', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Analytics'));
      });
      
      expect(screen.getByText('Line 1 Security Score')).toBeInTheDocument();
      expect(screen.getByText('Line 2 Security Score')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument(); // Line 1 score
      expect(screen.getByText('78%')).toBeInTheDocument(); // Line 2 score
    });
  });

  describe('Settings Tab', () => {
    it('displays dashboard configuration options', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Settings'));
      });
      
      expect(screen.getByText('Security Dashboard Settings')).toBeInTheDocument();
      expect(screen.getByText('Update Frequency')).toBeInTheDocument();
      expect(screen.getByText('Alert Thresholds')).toBeInTheDocument();
      expect(screen.getByText('Compliance Assessment Schedule')).toBeInTheDocument();
    });

    it('shows configurable settings', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Settings'));
      });
      
      expect(screen.getByDisplayValue('30')).toBeInTheDocument(); // Update frequency
      expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // Critical threshold
      expect(screen.getByDisplayValue('20')).toBeInTheDocument(); // Warning threshold
      expect(screen.getByDisplayValue('15')).toBeInTheDocument(); // Error threshold
    });
  });

  describe('Real-time Updates', () => {
    it('subscribes to real-time updates on mount', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        expect(mockSecurityDashboardService.on).toHaveBeenCalledWith('securityEvent', expect.any(Function));
        expect(mockSecurityDashboardService.on).toHaveBeenCalledWith('metricsUpdate', expect.any(Function));
        expect(mockSecurityDashboardService.on).toHaveBeenCalledWith('complianceUpdate', expect.any(Function));
        expect(mockSecurityDashboardService.on).toHaveBeenCalledWith('manufacturingUpdate', expect.any(Function));
        expect(mockSecurityDashboardService.on).toHaveBeenCalledWith('alert', expect.any(Function));
        expect(mockSecurityDashboardService.on).toHaveBeenCalledWith('connection', expect.any(Function));
      });
    });

    it('unsubscribes from updates on unmount', async () => {
      const { unmount } = render(<SecurityDashboard />);
      
      await waitFor(() => {
        expect(mockSecurityDashboardService.on).toHaveBeenCalled();
      });
      
      unmount();
      
      expect(mockSecurityDashboardService.off).toHaveBeenCalled();
      expect(mockSecurityDashboardService.disconnect).toHaveBeenCalled();
    });
  });

  describe('Data Loading', () => {
    it('loads initial data on mount', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        expect(mockSecurityDashboardService.getSecurityMetrics).toHaveBeenCalled();
        expect(mockSecurityDashboardService.getComplianceStatus).toHaveBeenCalled();
        expect(mockSecurityDashboardService.getManufacturingSecurity).toHaveBeenCalled();
        expect(mockSecurityDashboardService.getRecentSecurityEvents).toHaveBeenCalledWith(10);
        expect(mockSecurityDashboardService.getSecurityAlerts).toHaveBeenCalled();
        expect(mockSecurityDashboardService.getDashboardConfig).toHaveBeenCalled();
      });
    });

    it('handles API errors gracefully', async () => {
      // Mock API failure
      mockSecurityDashboardService.getSecurityMetrics.mockRejectedValue(new Error('API Error'));
      
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        // Should still render with mock data
        expect(screen.getByText('Security Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('switches between tabs correctly', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        // Start on Overview tab
        expect(screen.getByText('Security Posture Overview')).toBeInTheDocument();
        
        // Switch to Compliance tab
        fireEvent.click(screen.getByText('Compliance'));
        expect(screen.getByText('ISA-99/IEC 62443')).toBeInTheDocument();
        
        // Switch to Analytics tab
        fireEvent.click(screen.getByText('Analytics'));
        expect(screen.getByText('Security Metrics Overview')).toBeInTheDocument();
        
        // Switch to Settings tab
        fireEvent.click(screen.getByText('Settings'));
        expect(screen.getByText('Security Dashboard Settings')).toBeInTheDocument();
        
        // Switch back to Overview tab
        fireEvent.click(screen.getByText('Overview'));
        expect(screen.getByText('Security Posture Overview')).toBeInTheDocument();
      });
    });

    it('shows alert acknowledgment button', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        const acknowledgeButton = screen.getByText('Acknowledge');
        expect(acknowledgeButton).toBeInTheDocument();
        
        // Click acknowledgment button
        fireEvent.click(acknowledgeButton);
        // Note: In a real implementation, this would call the service
      });
    });
  });

  describe('Connection Status', () => {
    it('displays connection status correctly', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        // Initially shows connecting state
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
      });
    });

    it('shows alert count', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        // Should show 1 unacknowledged alert
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        // Check for main heading
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        
        // Check for navigation
        expect(screen.getByRole('navigation')).toBeInTheDocument();
        
        // Check for main content
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', async () => {
      render(<SecurityDashboard />);
      
      await waitFor(() => {
        // Tab navigation should work
        const tabs = screen.getAllByRole('button');
        expect(tabs.length).toBeGreaterThan(0);
        
        // First tab should be focusable
        tabs[0].focus();
        expect(tabs[0]).toHaveFocus();
      });
    });
  });
});
