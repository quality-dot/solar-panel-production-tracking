/**
 * BarcodeScanner Component Tests
 * Comprehensive tests for barcode scanning component including camera integration and validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BarcodeScanner from '../BarcodeScanner';
import barcodeScanningService from '../../services/barcodeScanningService';
import audioFeedbackService from '../../services/audioFeedbackService';

// Mock the barcode scanning service
jest.mock('../../services/barcodeScanningService', () => ({
  validateBarcodeFormat: jest.fn(),
}));

// Mock the audio feedback service
jest.mock('../../services/audioFeedbackService', () => ({
  initialize: jest.fn(),
  dispose: jest.fn(),
  playSuccess: jest.fn(),
  playError: jest.fn(),
  playScan: jest.fn(),
}));

// Mock html5-qrcode
jest.mock('html5-qrcode', () => ({
  Html5Qrcode: jest.fn().mockImplementation(() => ({
    getCameras: jest.fn().mockResolvedValue([
      { id: 'camera1', label: 'Front Camera' },
      { id: 'camera2', label: 'Back Camera' },
    ]),
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('BarcodeScanner', () => {
  const mockOnScanSuccess = jest.fn();
  const mockOnScanError = jest.fn();
  const mockOnManualEntry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (barcodeScanningService.validateBarcodeFormat as jest.Mock).mockReturnValue({
      isValid: true,
      error: undefined,
    });
  });

  describe('Rendering', () => {
    it('should render camera selection section', () => {
      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      expect(screen.getByText('Camera Selection')).toBeInTheDocument();
      expect(screen.getByLabelText('Select Camera')).toBeInTheDocument();
    });

    it('should render video container', () => {
      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      expect(screen.getByText('Ready to Scan')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start scanning/i })).toBeInTheDocument();
    });

    it('should render manual entry section', () => {
      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      expect(screen.getByText('Manual Entry')).toBeInTheDocument();
      expect(screen.getByLabelText('Panel Barcode')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit manual entry/i })).toBeInTheDocument();
    });
  });

  describe('Camera Selection', () => {
    it('should populate camera options', async () => {
      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      await waitFor(() => {
        const cameraSelect = screen.getByLabelText('Select Camera');
        expect(cameraSelect).toHaveValue('camera1');
      });

      const cameraSelect = screen.getByLabelText('Select Camera');
      expect(cameraSelect).toHaveTextContent('Front Camera');
      expect(cameraSelect).toHaveTextContent('Back Camera');
    });

    it('should handle camera selection change', async () => {
      const user = userEvent.setup();
      
      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Select Camera')).toBeInTheDocument();
      });

      const cameraSelect = screen.getByLabelText('Select Camera');
      await user.selectOptions(cameraSelect, 'camera2');

      expect(cameraSelect).toHaveValue('camera2');
    });
  });

  describe('Scanning Functionality', () => {
    it('should start scanning when start button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start scanning/i })).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start scanning/i });
      await user.click(startButton);

      expect(audioFeedbackService.playScan).toHaveBeenCalled();
    });

    it('should stop scanning when stop button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start scanning/i })).toBeInTheDocument();
      });

      // Start scanning first
      const startButton = screen.getByRole('button', { name: /start scanning/i });
      await user.click(startButton);

      // Wait for stop button to appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stop scanning/i })).toBeInTheDocument();
      });

      const stopButton = screen.getByRole('button', { name: /stop scanning/i });
      await user.click(stopButton);

      // Should return to start button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start scanning/i })).toBeInTheDocument();
      });
    });

    it('should handle successful barcode scan', async () => {
      const user = userEvent.setup();
      
      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start scanning/i })).toBeInTheDocument();
      });

      // Start scanning
      const startButton = screen.getByRole('button', { name: /start scanning/i });
      await user.click(startButton);

      // Simulate successful scan
      await waitFor(() => {
        expect(screen.getByText(/barcode scanned successfully/i)).toBeInTheDocument();
      });

      expect(audioFeedbackService.playSuccess).toHaveBeenCalled();
      expect(mockOnScanSuccess).toHaveBeenCalled();
    });

    it('should handle invalid barcode scan', async () => {
      const user = userEvent.setup();
      
      (barcodeScanningService.validateBarcodeFormat as jest.Mock).mockReturnValue({
        isValid: false,
        error: 'Invalid barcode format',
      });

      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start scanning/i })).toBeInTheDocument();
      });

      // Start scanning
      const startButton = screen.getByRole('button', { name: /start scanning/i });
      await user.click(startButton);

      // Simulate invalid scan
      await waitFor(() => {
        expect(screen.getByText(/invalid barcode format/i)).toBeInTheDocument();
      });

      expect(audioFeedbackService.playError).toHaveBeenCalled();
    });
  });

  describe('Manual Entry', () => {
    it('should handle valid manual barcode entry', async () => {
      const user = userEvent.setup();
      
      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      const barcodeInput = screen.getByLabelText('Panel Barcode');
      const submitButton = screen.getByRole('button', { name: /submit manual entry/i });

      await user.type(barcodeInput, 'CRS01YF01PP12345');
      await user.click(submitButton);

      expect(audioFeedbackService.playSuccess).toHaveBeenCalled();
      expect(mockOnManualEntry).toHaveBeenCalledWith('CRS01YF01PP12345');
      expect(barcodeInput).toHaveValue('');
    });

    it('should handle invalid manual barcode entry', async () => {
      const user = userEvent.setup();
      
      (barcodeScanningService.validateBarcodeFormat as jest.Mock).mockReturnValue({
        isValid: false,
        error: 'Invalid barcode format. Expected: CRSYYFBPP#####',
      });

      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      const barcodeInput = screen.getByLabelText('Panel Barcode');
      const submitButton = screen.getByRole('button', { name: /submit manual entry/i });

      await user.type(barcodeInput, 'INVALID');
      await user.click(submitButton);

      expect(audioFeedbackService.playError).toHaveBeenCalled();
      expect(screen.getByText(/invalid barcode format/i)).toBeInTheDocument();
      expect(mockOnManualEntry).not.toHaveBeenCalled();
    });

    it('should handle Enter key press for manual entry', async () => {
      const user = userEvent.setup();
      
      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      const barcodeInput = screen.getByLabelText('Panel Barcode');

      await user.type(barcodeInput, 'CRS01YF01PP12345');
      await user.keyboard('{Enter}');

      expect(mockOnManualEntry).toHaveBeenCalledWith('CRS01YF01PP12345');
    });

    it('should disable submit button when input is empty', () => {
      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      const submitButton = screen.getByRole('button', { name: /submit manual entry/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when input has content', async () => {
      const user = userEvent.setup();
      
      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      const barcodeInput = screen.getByLabelText('Panel Barcode');
      const submitButton = screen.getByRole('button', { name: /submit manual entry/i });

      await user.type(barcodeInput, 'CRS01YF01PP12345');

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error messages', async () => {
      const user = userEvent.setup();
      
      (barcodeScanningService.validateBarcodeFormat as jest.Mock).mockReturnValue({
        isValid: false,
        error: 'Custom error message',
      });

      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      const barcodeInput = screen.getByLabelText('Panel Barcode');
      const submitButton = screen.getByRole('button', { name: /submit manual entry/i });

      await user.type(barcodeInput, 'INVALID');
      await user.click(submitButton);

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('should handle camera initialization errors', async () => {
      // Mock camera initialization failure
      const mockHtml5Qrcode = require('html5-qrcode').Html5Qrcode;
      mockHtml5Qrcode.mockImplementation(() => ({
        getCameras: jest.fn().mockRejectedValue(new Error('Camera access denied')),
        start: jest.fn(),
        stop: jest.fn(),
      }));

      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to access camera/i)).toBeInTheDocument();
      });

      expect(audioFeedbackService.playError).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels and roles', () => {
      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      expect(screen.getByLabelText('Select Camera')).toBeInTheDocument();
      expect(screen.getByLabelText('Panel Barcode')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start scanning/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit manual entry/i })).toBeInTheDocument();
    });

    it('should disable camera selection during scanning', async () => {
      const user = userEvent.setup();
      
      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start scanning/i })).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start scanning/i });
      await user.click(startButton);

      await waitFor(() => {
        const cameraSelect = screen.getByLabelText('Select Camera');
        expect(cameraSelect).toBeDisabled();
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('should initialize audio feedback service on mount', () => {
      render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      expect(audioFeedbackService.initialize).toHaveBeenCalled();
    });

    it('should dispose audio feedback service on unmount', () => {
      const { unmount } = render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
        />
      );

      unmount();

      expect(audioFeedbackService.dispose).toHaveBeenCalled();
    });
  });

  describe('Custom Class Name', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <BarcodeScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
          onManualEntry={mockOnManualEntry}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
