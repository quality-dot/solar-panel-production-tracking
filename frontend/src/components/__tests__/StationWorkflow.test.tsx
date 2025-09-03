/**
 * StationWorkflow Component Tests
 * Comprehensive tests for station workflow integration with barcode scanning
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import StationWorkflow from '../StationWorkflow';
import stationWorkflowService from '../../services/stationWorkflowService';
import { StationWorkflowError } from '../../services/stationWorkflowService';

// Mock the station workflow service
jest.mock('../../services/stationWorkflowService', () => ({
  getStationInfo: jest.fn(),
  processBarcodeScan: jest.fn(),
  submitInspectionResults: jest.fn(),
  completeWorkflowStep: jest.fn(),
  getWorkflowSteps: jest.fn(),
  getInspectionCriteria: jest.fn(),
  clearCurrentPanel: jest.fn(),
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

// Mock the auth context
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      username: 'testuser',
      role: 'STATION_INSPECTOR',
      station_assignments: [1, 2],
    },
  }),
}));

// Mock LoadingSpinner
jest.mock('../ui/LoadingSpinner', () => {
  return function MockLoadingSpinner({ size }: any) {
    return <div data-testid={`loading-spinner-${size}`}>Loading...</div>;
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('StationWorkflow', () => {
  const mockGetStationInfo = stationWorkflowService.getStationInfo as jest.Mock;
  const mockProcessBarcodeScan = stationWorkflowService.processBarcodeScan as jest.Mock;
  const mockSubmitInspectionResults = stationWorkflowService.submitInspectionResults as jest.Mock;
  const mockCompleteWorkflowStep = stationWorkflowService.completeWorkflowStep as jest.Mock;
  const mockGetWorkflowSteps = stationWorkflowService.getWorkflowSteps as jest.Mock;
  const mockGetInspectionCriteria = stationWorkflowService.getInspectionCriteria as jest.Mock;
  const mockClearCurrentPanel = stationWorkflowService.clearCurrentPanel as jest.Mock;

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

  const mockInspectionCriteria = [
    {
      id: 'criteria-1',
      name: 'No visible cracks',
      type: 'VISUAL',
      description: 'Check for any visible cracks in the panel',
      isRequired: true,
      passCondition: 'No cracks visible',
      result: undefined,
      notes: undefined,
      value: undefined,
      completedAt: undefined,
    },
    {
      id: 'criteria-2',
      name: 'Voltage reading',
      type: 'MEASUREMENT',
      description: 'Measure panel voltage',
      isRequired: true,
      passCondition: 'Voltage > 20V',
      result: undefined,
      notes: undefined,
      value: undefined,
      completedAt: undefined,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStationInfo.mockResolvedValue(mockStationInfo);
    mockGetWorkflowSteps.mockResolvedValue(mockWorkflowSteps);
    mockGetInspectionCriteria.mockResolvedValue(mockInspectionCriteria);
  });

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      renderWithRouter(<StationWorkflow stationId={1} />);

      expect(screen.getByTestId('loading-spinner-lg')).toBeInTheDocument();
    });

    it('should render station information after loading', async () => {
      renderWithRouter(<StationWorkflow stationId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Station 1 - Assembly Station 1')).toBeInTheDocument();
        expect(screen.getByText('Line 1 • INSPECTION')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('should render barcode scanner when idle', async () => {
      renderWithRouter(<StationWorkflow stationId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Scan Panel Barcode')).toBeInTheDocument();
        expect(screen.getByTestId('barcode-scanner')).toBeInTheDocument();
      });
    });
  });

  describe('Station Information Loading', () => {
    it('should handle station not found', async () => {
      mockGetStationInfo.mockResolvedValue(null);

      renderWithRouter(<StationWorkflow stationId={999} />);

      await waitFor(() => {
        expect(screen.getByText('Station Not Found')).toBeInTheDocument();
        expect(screen.getByText('Unable to load station information.')).toBeInTheDocument();
      });
    });

    it('should handle station info loading errors', async () => {
      mockGetStationInfo.mockRejectedValue(
        new StationWorkflowError('Failed to load station', 'STATION_INFO_ERROR')
      );

      renderWithRouter(<StationWorkflow stationId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load station')).toBeInTheDocument();
      });
    });

    it('should show current panel if exists', async () => {
      const stationWithPanel = {
        ...mockStationInfo,
        currentPanel: mockPanelInfo,
        workflowState: {
          currentStep: 0,
          totalSteps: 2,
          steps: mockWorkflowSteps,
          isCompleted: false,
          canProceed: true,
          nextAction: 'Begin inspection workflow',
        },
      };

      mockGetStationInfo.mockResolvedValue(stationWithPanel);

      renderWithRouter(<StationWorkflow stationId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Current Panel')).toBeInTheDocument();
        expect(screen.getByText('CRS01YF01PP12345')).toBeInTheDocument();
        expect(screen.getByText('BP - 550')).toBeInTheDocument();
        expect(screen.getByText('MO-2025-12345')).toBeInTheDocument();
      });
    });
  });

  describe('Barcode Scanning', () => {
    it('should handle successful barcode scan', async () => {
      mockProcessBarcodeScan.mockResolvedValue(mockPanelInfo);

      renderWithRouter(<StationWorkflow stationId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('barcode-scanner')).toBeInTheDocument();
      });

      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Current Panel')).toBeInTheDocument();
        expect(screen.getByText('CRS01YF01PP12345')).toBeInTheDocument();
      });

      expect(mockProcessBarcodeScan).toHaveBeenCalledWith(1, 'CRS01YF01PP12345');
      expect(mockGetWorkflowSteps).toHaveBeenCalledWith('INSPECTION');
    });

    it('should handle barcode scan errors', async () => {
      mockProcessBarcodeScan.mockRejectedValue(
        new StationWorkflowError('Invalid barcode', 'SCAN_PROCESSING_ERROR')
      );

      renderWithRouter(<StationWorkflow stationId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('barcode-scanner')).toBeInTheDocument();
      });

      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid barcode')).toBeInTheDocument();
      });
    });

    it('should handle manual barcode entry', async () => {
      mockProcessBarcodeScan.mockResolvedValue(mockPanelInfo);

      renderWithRouter(<StationWorkflow stationId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('barcode-scanner')).toBeInTheDocument();
      });

      const manualButton = screen.getByText('Simulate Manual Entry');
      fireEvent.click(manualButton);

      await waitFor(() => {
        expect(screen.getByText('Current Panel')).toBeInTheDocument();
      });

      expect(mockProcessBarcodeScan).toHaveBeenCalledWith(1, 'CRS01YF01PP12346');
    });
  });

  describe('Workflow Progress', () => {
    it('should display workflow progress', async () => {
      const stationWithWorkflow = {
        ...mockStationInfo,
        currentPanel: mockPanelInfo,
        workflowState: {
          currentStep: 1,
          totalSteps: 2,
          steps: mockWorkflowSteps,
          isCompleted: false,
          canProceed: true,
          nextAction: 'Complete current step',
        },
      };

      mockGetStationInfo.mockResolvedValue(stationWithWorkflow);

      renderWithRouter(<StationWorkflow stationId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Workflow Progress')).toBeInTheDocument();
        expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
        expect(screen.getByText('50% Complete')).toBeInTheDocument();
      });
    });

    it('should show current step details', async () => {
      const stationWithWorkflow = {
        ...mockStationInfo,
        currentPanel: mockPanelInfo,
        workflowState: {
          currentStep: 0,
          totalSteps: 2,
          steps: mockWorkflowSteps,
          isCompleted: false,
          canProceed: true,
          nextAction: 'Begin inspection workflow',
        },
      };

      mockGetStationInfo.mockResolvedValue(stationWithWorkflow);

      renderWithRouter(<StationWorkflow stationId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Visual Inspection')).toBeInTheDocument();
        expect(screen.getByText('Check for visible defects')).toBeInTheDocument();
        expect(screen.getByText('Inspection Criteria:')).toBeInTheDocument();
      });
    });
  });

  describe('Workflow Actions', () => {
    it('should complete current workflow step', async () => {
      const user = userEvent.setup();
      const stationWithWorkflow = {
        ...mockStationInfo,
        currentPanel: mockPanelInfo,
        workflowState: {
          currentStep: 0,
          totalSteps: 2,
          steps: mockWorkflowSteps,
          isCompleted: false,
          canProceed: true,
          nextAction: 'Begin inspection workflow',
        },
      };

      const updatedWorkflowState = {
        currentStep: 1,
        totalSteps: 2,
        steps: [
          { ...mockWorkflowSteps[0], status: 'COMPLETED' },
          { ...mockWorkflowSteps[1], status: 'IN_PROGRESS' },
        ],
        isCompleted: false,
        canProceed: true,
        nextAction: 'Complete next step',
      };

      mockGetStationInfo.mockResolvedValue(stationWithWorkflow);
      mockCompleteWorkflowStep.mockResolvedValue(updatedWorkflowState);

      renderWithRouter(<StationWorkflow stationId={1} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /complete step/i })).toBeInTheDocument();
      });

      const completeButton = screen.getByRole('button', { name: /complete step/i });
      await user.click(completeButton);

      expect(mockCompleteWorkflowStep).toHaveBeenCalledWith(1, 1, {
        criteria: mockInspectionCriteria,
      });
    });

    it('should clear current panel', async () => {
      const user = userEvent.setup();
      const stationWithPanel = {
        ...mockStationInfo,
        currentPanel: mockPanelInfo,
        workflowState: {
          currentStep: 0,
          totalSteps: 2,
          steps: mockWorkflowSteps,
          isCompleted: false,
          canProceed: true,
          nextAction: 'Begin inspection workflow',
        },
      };

      mockGetStationInfo.mockResolvedValue(stationWithPanel);

      renderWithRouter(<StationWorkflow stationId={1} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear panel/i })).toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: /clear panel/i });
      await user.click(clearButton);

      expect(mockClearCurrentPanel).toHaveBeenCalledWith(1);
    });

    it('should show workflow completed state', async () => {
      const stationWithCompletedWorkflow = {
        ...mockStationInfo,
        currentPanel: mockPanelInfo,
        workflowState: {
          currentStep: 2,
          totalSteps: 2,
          steps: [
            { ...mockWorkflowSteps[0], status: 'COMPLETED' },
            { ...mockWorkflowSteps[1], status: 'COMPLETED' },
          ],
          isCompleted: true,
          canProceed: false,
          nextAction: undefined,
        },
      };

      mockGetStationInfo.mockResolvedValue(stationWithCompletedWorkflow);

      renderWithRouter(<StationWorkflow stationId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Workflow Completed')).toBeInTheDocument();
        expect(screen.getByText('Panel has been successfully processed through all workflow steps.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /process next panel/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle workflow step completion errors', async () => {
      const user = userEvent.setup();
      const stationWithWorkflow = {
        ...mockStationInfo,
        currentPanel: mockPanelInfo,
        workflowState: {
          currentStep: 0,
          totalSteps: 2,
          steps: mockWorkflowSteps,
          isCompleted: false,
          canProceed: true,
          nextAction: 'Begin inspection workflow',
        },
      };

      mockGetStationInfo.mockResolvedValue(stationWithWorkflow);
      mockCompleteWorkflowStep.mockRejectedValue(
        new StationWorkflowError('Failed to complete step', 'WORKFLOW_STEP_ERROR')
      );

      renderWithRouter(<StationWorkflow stationId={1} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /complete step/i })).toBeInTheDocument();
      });

      const completeButton = screen.getByRole('button', { name: /complete step/i });
      await user.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to complete step')).toBeInTheDocument();
      });
    });

    it('should handle clear panel errors', async () => {
      const user = userEvent.setup();
      const stationWithPanel = {
        ...mockStationInfo,
        currentPanel: mockPanelInfo,
        workflowState: {
          currentStep: 0,
          totalSteps: 2,
          steps: mockWorkflowSteps,
          isCompleted: false,
          canProceed: true,
          nextAction: 'Begin inspection workflow',
        },
      };

      mockGetStationInfo.mockResolvedValue(stationWithPanel);
      mockClearCurrentPanel.mockRejectedValue(
        new StationWorkflowError('Failed to clear panel', 'CLEAR_PANEL_ERROR')
      );

      renderWithRouter(<StationWorkflow stationId={1} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear panel/i })).toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: /clear panel/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to clear panel')).toBeInTheDocument();
      });
    });
  });

  describe('Props and Configuration', () => {
    it('should use stationId from props', async () => {
      renderWithRouter(<StationWorkflow stationId={5} />);

      await waitFor(() => {
        expect(mockGetStationInfo).toHaveBeenCalledWith(5);
      });
    });

    it('should use stationId from URL params when no prop provided', async () => {
      // Mock useParams to return stationId
      jest.doMock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useParams: () => ({ stationId: '3' }),
      }));

      renderWithRouter(<StationWorkflow />);

      await waitFor(() => {
        expect(mockGetStationInfo).toHaveBeenCalledWith(3);
      });
    });

    it('should apply custom className', async () => {
      const { container } = renderWithRouter(
        <StationWorkflow stationId={1} className="custom-class" />
      );

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });
  });

  describe('Loading States', () => {
    it('should show processing state during barcode scan', async () => {
      mockProcessBarcodeScan.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockPanelInfo), 100))
      );

      renderWithRouter(<StationWorkflow stationId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('barcode-scanner')).toBeInTheDocument();
      });

      const scanButton = screen.getByText('Simulate Scan Success');
      fireEvent.click(scanButton);

      // Should show processing state
      expect(screen.getByText('Processing scanned barcode...')).toBeInTheDocument();
    });

    it('should show processing state during workflow step completion', async () => {
      const user = userEvent.setup();
      const stationWithWorkflow = {
        ...mockStationInfo,
        currentPanel: mockPanelInfo,
        workflowState: {
          currentStep: 0,
          totalSteps: 2,
          steps: mockWorkflowSteps,
          isCompleted: false,
          canProceed: true,
          nextAction: 'Begin inspection workflow',
        },
      };

      mockGetStationInfo.mockResolvedValue(stationWithWorkflow);
      mockCompleteWorkflowStep.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          currentStep: 1,
          totalSteps: 2,
          steps: mockWorkflowSteps,
          isCompleted: false,
          canProceed: true,
          nextAction: 'Complete next step',
        }), 100))
      );

      renderWithRouter(<StationWorkflow stationId={1} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /complete step/i })).toBeInTheDocument();
      });

      const completeButton = screen.getByRole('button', { name: /complete step/i });
      await user.click(completeButton);

      // Should show processing state
      expect(completeButton).toBeDisabled();
    });
  });
});
