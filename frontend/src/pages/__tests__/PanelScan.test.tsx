/**
 * PanelScan Page Tests
 * Comprehensive tests for the panel scanning page including offline functionality and sync
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PanelScan from '../PanelScan';
import barcodeScanningService from '../../services/barcodeScanningService';
import { BarcodeScanningError } from '../../services/barcodeScanningService';

// Mock the barcode scanning service
jest.mock('../../services/barcodeScanningService', () => ({
  processBarcode: jest.fn(),
  getOfflineScanStatus: jest.fn(),
  syncOfflineScans: jest.fn(),
  isCurrentlyOnline: jest.fn(),
}));

// Mock the BarcodeScanner component
jest.mock('../../components/BarcodeScanner', () => {
  return function MockBarcodeScanner({ onScanSuccess, onScanError, onManualEntry }: any) {
    return (
      <div data-testid="barcode-scanner">
        <button onClick={() => onScanSuccess('CRS01YF01PP12345')}>
          Simulate Scan Success
        </button>
        <button onClick={() => onScanError('Scan error')}>
          Simulate Scan Error
        </button>
        <button onClick={() => onManualEntry('CRS01YF01PP12346')}>
          Simulate Manual Entry
        </button>
      </div>
    );
  };
});

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

describe('PanelScan', () => {
  const mockProcessBarcode = barcodeScanningService.processBarcode as jest.Mock;
  const mockGetOfflineScanStatus = barcodeScanningService.getOfflineScanStatus as jest.Mock;
  const mockSyncOfflineScans = barcodeScanningService.syncOfflineScans as jest.Mock;
  const mockIsCurrentlyOnline = barcodeScanningService.isCurrentlyOnline as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('[]');
    navigator.onLine = true;
    mockIsCurrentlyOnline.mockReturnValue(true);
    mockGetOfflineScanStatus.mockResolvedValue({ total: 0, synced: 0, pending: 0 });
  });

  describe('Rendering', () => {
    it('should render page header', () => {
      render(<PanelScan />);

      expect(screen.getByText('Panel Scan')).toBeInTheDocument();
      expect(screen.getByText('Scan panel barcode to begin inspection')).toBeInTheDocument();
    });

    it('should render connection status', () => {
      render(<PanelScan />);

      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('Connected to backend')).toBeInTheDocument();
    });

    it('should render barcode scanner component', () => {
      render(<PanelScan />);

      expect(screen.getByTestId('barcode-scanner')).toBeInTheDocument();
    });
  });

  describe('Online/Offline Status', () => {
    it('should show online status when connected', () => {
      mockIsCurrentlyOnline.mockReturnValue(true);
      
      render(<PanelScan />);

      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('Connected to backend')).toBeInTheDocument();
    });

    it('should show offline status when disconnected', () => {
      mockIsCurrentlyOnline.mockReturnValue(false);
      
      render(<PanelScan />);

      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByText('Working offline - scans will sync when online')).toBeInTheDocument();
    });

    it('should show pending sync count when offline scans exist', () => {
      mockGetOfflineScanStatus.mockResolvedValue({ total: 3, synced: 1, pending: 2 });
      
      render(<PanelScan />);

      waitFor(() => {
        expect(screen.getByText('2 pending sync')).toBeInTheDocument();
        expect(screen.getByText('1 synced')).toBeInTheDocument();
      });
    });
  });

  describe('Barcode Scanning', () => {
    it('should handle successful barcode scan', async () => {
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

      mockProcessBarcode.mockResolvedValue(mockPanelData);

      render(<PanelScan />);

      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Processing scanned barcode...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Panel validated successfully!')).toBeInTheDocument();
      });

      expect(screen.getByText('CRS01YF01PP12345')).toBeInTheDocument();
      expect(screen.getByText('BP - 550')).toBeInTheDocument();
      expect(screen.getByText('MO-2025-12345')).toBeInTheDocument();
    });

    it('should handle barcode processing errors', async () => {
      mockProcessBarcode.mockRejectedValue(
        new BarcodeScanningError('Invalid barcode format', 'VALIDATION_FAILED')
      );

      render(<PanelScan />);

      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid barcode format or validation failed.')).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      mockProcessBarcode.mockRejectedValue(
        new BarcodeScanningError('Network error', 'NETWORK_ERROR')
      );

      render(<PanelScan />);

      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Unable to connect to backend. Please check your connection.')).toBeInTheDocument();
      });
    });

    it('should handle manual barcode entry', async () => {
      const mockPanelData = {
        barcode: 'CRS01YF01PP12346',
        panelType: 'BP',
        powerRating: '550',
        status: 'Ready for Inspection',
        manufacturingOrder: 'MO-2025-12346',
        lineNumber: 1,
        stationNumber: 1,
        lineName: 'LINE_1',
        stationRange: [1, 2, 3, 4],
      };

      mockProcessBarcode.mockResolvedValue(mockPanelData);

      render(<PanelScan />);

      const manualButton = screen.getByText('Simulate Manual Entry');
      fireEvent.click(manualButton);

      await waitFor(() => {
        expect(screen.getByText('Panel validated successfully!')).toBeInTheDocument();
      });

      expect(screen.getByText('CRS01YF01PP12346')).toBeInTheDocument();
    });

    it('should handle scan errors', () => {
      render(<PanelScan />);

      const errorButton = screen.getByText('Simulate Scan Error');
      fireEvent.click(errorButton);

      expect(screen.getByText('Scan error')).toBeInTheDocument();
    });
  });

  describe('Offline Sync', () => {
    it('should show sync button when online and pending scans exist', async () => {
      mockGetOfflineScanStatus.mockResolvedValue({ total: 2, synced: 0, pending: 2 });
      
      render(<PanelScan />);

      await waitFor(() => {
        expect(screen.getByText('2 pending sync')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
      });
    });

    it('should not show sync button when offline', async () => {
      mockIsCurrentlyOnline.mockReturnValue(false);
      mockGetOfflineScanStatus.mockResolvedValue({ total: 2, synced: 0, pending: 2 });
      
      render(<PanelScan />);

      await waitFor(() => {
        expect(screen.getByText('2 pending sync')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sync/i })).not.toBeInTheDocument();
      });
    });

    it('should handle manual sync', async () => {
      const user = userEvent.setup();
      mockGetOfflineScanStatus.mockResolvedValue({ total: 2, synced: 0, pending: 2 });
      mockSyncOfflineScans.mockResolvedValue({ synced: 2, failed: 0 });
      
      render(<PanelScan />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
      });

      const syncButton = screen.getByRole('button', { name: /sync/i });
      await user.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText('Successfully synced 2 offline scans')).toBeInTheDocument();
      });

      expect(mockSyncOfflineScans).toHaveBeenCalled();
    });

    it('should handle sync errors', async () => {
      const user = userEvent.setup();
      mockGetOfflineScanStatus.mockResolvedValue({ total: 2, synced: 0, pending: 2 });
      mockSyncOfflineScans.mockRejectedValue(new Error('Sync failed'));
      
      render(<PanelScan />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
      });

      const syncButton = screen.getByRole('button', { name: /sync/i });
      await user.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to sync offline scans')).toBeInTheDocument();
      });
    });

    it('should handle partial sync results', async () => {
      const user = userEvent.setup();
      mockGetOfflineScanStatus.mockResolvedValue({ total: 3, synced: 0, pending: 3 });
      mockSyncOfflineScans.mockResolvedValue({ synced: 2, failed: 1 });
      
      render(<PanelScan />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
      });

      const syncButton = screen.getByRole('button', { name: /sync/i });
      await user.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to sync 1 offline scans')).toBeInTheDocument();
      });
    });

    it('should show syncing state during sync', async () => {
      const user = userEvent.setup();
      mockGetOfflineScanStatus.mockResolvedValue({ total: 2, synced: 0, pending: 2 });
      mockSyncOfflineScans.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ synced: 2, failed: 0 }), 100))
      );
      
      render(<PanelScan />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
      });

      const syncButton = screen.getByRole('button', { name: /sync/i });
      await user.click(syncButton);

      expect(screen.getByText('Syncing...')).toBeInTheDocument();
      expect(syncButton).toBeDisabled();
    });
  });

  describe('Network Status Monitoring', () => {
    it('should auto-sync when coming back online', async () => {
      mockGetOfflineScanStatus.mockResolvedValue({ total: 1, synced: 0, pending: 1 });
      mockSyncOfflineScans.mockResolvedValue({ synced: 1, failed: 0 });
      
      render(<PanelScan />);

      // Simulate going offline then online
      mockIsCurrentlyOnline.mockReturnValue(false);
      fireEvent(window, new Event('offline'));

      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument();
      });

      mockIsCurrentlyOnline.mockReturnValue(true);
      fireEvent(window, new Event('online'));

      await waitFor(() => {
        expect(mockSyncOfflineScans).toHaveBeenCalled();
      });
    });

    it('should update status when going offline', async () => {
      render(<PanelScan />);

      expect(screen.getByText('Online')).toBeInTheDocument();

      mockIsCurrentlyOnline.mockReturnValue(false);
      fireEvent(window, new Event('offline'));

      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument();
      });
    });
  });

  describe('Panel Display', () => {
    it('should display scanned panel information', async () => {
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

      mockProcessBarcode.mockResolvedValue(mockPanelData);

      render(<PanelScan />);

      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Current Panel')).toBeInTheDocument();
        expect(screen.getByText('CRS01YF01PP12345')).toBeInTheDocument();
        expect(screen.getByText('BP - 550')).toBeInTheDocument();
        expect(screen.getByText('MO-2025-12345')).toBeInTheDocument();
        expect(screen.getByText('Ready for Inspection')).toBeInTheDocument();
      });
    });

    it('should show begin inspection button', async () => {
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

      mockProcessBarcode.mockResolvedValue(mockPanelData);

      render(<PanelScan />);

      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /begin inspection/i })).toBeInTheDocument();
      });
    });

    it('should handle begin inspection', async () => {
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

      mockProcessBarcode.mockResolvedValue(mockPanelData);

      render(<PanelScan />);

      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /begin inspection/i })).toBeInTheDocument();
      });

      const beginButton = screen.getByRole('button', { name: /begin inspection/i });
      await user.click(beginButton);

      expect(screen.getByText('Starting inspection workflow...')).toBeInTheDocument();
    });

    it('should handle reset scan', async () => {
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

      mockProcessBarcode.mockResolvedValue(mockPanelData);

      render(<PanelScan />);

      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Current Panel')).toBeInTheDocument();
      });

      const resetButton = screen.getByRole('button', { name: /reset scan/i });
      await user.click(resetButton);

      expect(screen.queryByText('Current Panel')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown errors gracefully', async () => {
      mockProcessBarcode.mockRejectedValue(new Error('Unknown error'));

      render(<PanelScan />);

      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to process panel. Please try again.')).toBeInTheDocument();
      });
    });

    it('should handle offline scan status errors', async () => {
      mockGetOfflineScanStatus.mockRejectedValue(new Error('Status error'));

      render(<PanelScan />);

      // Should not crash the component
      expect(screen.getByText('Panel Scan')).toBeInTheDocument();
    });
  });
});
