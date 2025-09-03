/**
 * Barcode Scanning System Integration Tests
 * Comprehensive integration tests for the entire barcode scanning system
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import PanelScan from '../pages/PanelScan';
import StationWorkflow from '../components/StationWorkflow';
import barcodeScanningService from '../services/barcodeScanningService';
import stationWorkflowService from '../services/stationWorkflowService';

// Mock all external dependencies
jest.mock('../services/barcodeScanningService');
jest.mock('../services/stationWorkflowService');

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Barcode Scanning System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('[]');
    navigator.onLine = true;
  });

  describe('End-to-End Scanning Workflow', () => {
    it('should complete full scanning workflow from scan to inspection', async () => {
      const user = userEvent.setup();
      
      // Mock successful barcode processing
      const mockPanelData = {
        barcode: 'CRS01YF01PP12345',
        panelType: 'BP',
        powerRating: '550',
        status: 'Ready for Inspection',
        manufacturingOrder: 'MO-2025-12345',
        lineNumber: 1,
        stationNumber: 1,
        lineName: 'LINE_1',
        stationRange: [1, 2, 3, 4],
      };

      (barcodeScanningService.processBarcode as jest.Mock).mockResolvedValue(mockPanelData);

      render(<PanelScan />);

      // Simulate barcode scan
      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      // Wait for processing
      await waitFor(() => {
        expect(screen.getByText('Panel validated successfully!')).toBeInTheDocument();
      });

      // Verify panel data is displayed
      expect(screen.getByText('CRS01YF01PP12345')).toBeInTheDocument();
      expect(screen.getByText('BP - 550')).toBeInTheDocument();
      expect(screen.getByText('MO-2025-12345')).toBeInTheDocument();

      // Begin inspection
      const beginButton = screen.getByRole('button', { name: /begin inspection/i });
      await user.click(beginButton);

      expect(screen.getByText('Starting inspection workflow...')).toBeInTheDocument();
    });

    it('should handle offline scanning and sync workflow', async () => {
      const user = userEvent.setup();
      
      // Start offline
      navigator.onLine = false;
      (barcodeScanningService.isCurrentlyOnline as jest.Mock).mockReturnValue(false);
      
      const mockOfflinePanelData = {
        barcode: 'CRS01YF01PP12345',
        panelType: 'BP',
        powerRating: '550',
        status: 'Ready for Inspection (Offline)',
        manufacturingOrder: 'MO-2025-12345',
        lineNumber: 1,
        stationNumber: 1,
        lineName: 'LINE_1',
        stationRange: [1],
      };

      (barcodeScanningService.processBarcode as jest.Mock).mockResolvedValue(mockOfflinePanelData);
      (barcodeScanningService.getOfflineScanStatus as jest.Mock).mockResolvedValue({
        total: 1,
        synced: 0,
        pending: 1,
      });

      render(<PanelScan />);

      // Verify offline status
      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByText('Working offline - scans will sync when online')).toBeInTheDocument();

      // Simulate offline scan
      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Ready for Inspection (Offline)')).toBeInTheDocument();
      });

      // Go back online
      navigator.onLine = true;
      (barcodeScanningService.isCurrentlyOnline as jest.Mock).mockReturnValue(true);
      (barcodeScanningService.syncOfflineScans as jest.Mock).mockResolvedValue({
        synced: 1,
        failed: 0,
      });

      fireEvent(window, new Event('online'));

      await waitFor(() => {
        expect(screen.getByText('Successfully synced 1 offline scans')).toBeInTheDocument();
      });
    });
  });

  describe('Station Workflow Integration', () => {
    it('should integrate barcode scanning with station workflow', async () => {
      const user = userEvent.setup();
      
      const mockStationInfo = {
        id: 1,
        name: 'Assembly Station 1',
        type: 'INSPECTION',
        lineNumber: 1,
        isActive: true,
        currentPanel: null,
        workflowState: null,
      };

      const mockPanelInfo = {
        id: 'panel-1',
        barcode: 'CRS01YF01PP12345',
        panelType: 'BP',
        powerRating: '550',
        status: 'SCANNED',
        manufacturingOrder: 'MO-2025-12345',
        lineNumber: 1,
        stationNumber: 1,
        scannedAt: '2025-01-27T00:00:00.000Z',
      };

      const mockWorkflowSteps = [
        {
          id: 1,
          name: 'Visual Inspection',
          description: 'Check for visible defects',
          status: 'PENDING',
          isRequired: true,
          criteria: [],
        },
        {
          id: 2,
          name: 'Electrical Test',
          description: 'Test electrical connections',
          status: 'PENDING',
          isRequired: true,
          criteria: [],
        },
      ];

      (stationWorkflowService.getStationInfo as jest.Mock).mockResolvedValue(mockStationInfo);
      (stationWorkflowService.processBarcodeScan as jest.Mock).mockResolvedValue(mockPanelInfo);
      (stationWorkflowService.getWorkflowSteps as jest.Mock).mockResolvedValue(mockWorkflowSteps);
      (stationWorkflowService.getInspectionCriteria as jest.Mock).mockResolvedValue([]);

      renderWithRouter(<StationWorkflow stationId={1} />);

      // Wait for station info to load
      await waitFor(() => {
        expect(screen.getByText('Station 1 - Assembly Station 1')).toBeInTheDocument();
      });

      // Simulate barcode scan
      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      // Wait for panel to be processed
      await waitFor(() => {
        expect(screen.getByText('Current Panel')).toBeInTheDocument();
        expect(screen.getByText('CRS01YF01PP12345')).toBeInTheDocument();
      });

      // Verify workflow is started
      await waitFor(() => {
        expect(screen.getByText('Workflow Progress')).toBeInTheDocument();
        expect(screen.getByText('Visual Inspection')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors gracefully across components', async () => {
      // Mock network error
      (barcodeScanningService.processBarcode as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(<PanelScan />);

      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to process panel. Please try again.')).toBeInTheDocument();
      });
    });

    it('should handle validation errors consistently', async () => {
      // Mock validation error
      (barcodeScanningService.processBarcode as jest.Mock).mockRejectedValue(
        new Error('Invalid barcode format')
      );

      render(<PanelScan />);

      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to process panel. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle rapid successive scans', async () => {
      const mockPanelData = {
        barcode: 'CRS01YF01PP12345',
        panelType: 'BP',
        powerRating: '550',
        status: 'Ready for Inspection',
        manufacturingOrder: 'MO-2025-12345',
        lineNumber: 1,
        stationNumber: 1,
        lineName: 'LINE_1',
        stationRange: [1, 2, 3, 4],
      };

      (barcodeScanningService.processBarcode as jest.Mock).mockResolvedValue(mockPanelData);

      render(<PanelScan />);

      const scanButton = screen.getByText('Simulate Scan Success');
      
      // Rapid successive clicks
      fireEvent.click(scanButton);
      fireEvent.click(scanButton);
      fireEvent.click(scanButton);

      // Should handle gracefully without errors
      await waitFor(() => {
        expect(screen.getByText('Panel validated successfully!')).toBeInTheDocument();
      });
    });

    it('should maintain state consistency during async operations', async () => {
      const mockPanelData = {
        barcode: 'CRS01YF01PP12345',
        panelType: 'BP',
        powerRating: '550',
        status: 'Ready for Inspection',
        manufacturingOrder: 'MO-2025-12345',
        lineNumber: 1,
        stationNumber: 1,
        lineName: 'LINE_1',
        stationRange: [1, 2, 3, 4],
      };

      // Mock delayed response
      (barcodeScanningService.processBarcode as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockPanelData), 100))
      );

      render(<PanelScan />);

      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      // Should show processing state
      expect(screen.getByText('Processing scanned barcode...')).toBeInTheDocument();

      // Should complete successfully
      await waitFor(() => {
        expect(screen.getByText('Panel validated successfully!')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain keyboard navigation throughout workflow', async () => {
      const user = userEvent.setup();
      
      const mockPanelData = {
        barcode: 'CRS01YF01PP12345',
        panelType: 'BP',
        powerRating: '550',
        status: 'Ready for Inspection',
        manufacturingOrder: 'MO-2025-12345',
        lineNumber: 1,
        stationNumber: 1,
        lineName: 'LINE_1',
        stationRange: [1, 2, 3, 4],
      };

      (barcodeScanningService.processBarcode as jest.Mock).mockResolvedValue(mockPanelData);

      render(<PanelScan />);

      // Tab through interface
      await user.tab();
      await user.tab();
      await user.tab();

      // Should be able to interact with elements
      const scanButton = screen.getByText('Simulate Scan Success');
      await user.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Panel validated successfully!')).toBeInTheDocument();
      });
    });

    it('should provide proper ARIA labels and roles', () => {
      render(<PanelScan />);

      // Check for proper ARIA attributes
      expect(screen.getByRole('button', { name: /start scanning/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Panel Barcode')).toBeInTheDocument();
    });
  });
});
