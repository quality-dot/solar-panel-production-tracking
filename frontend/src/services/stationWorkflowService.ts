/**
 * Station Workflow Service
 * Handles station-specific workflow operations and barcode scanning integration
 */

// API base URL - can be configured based on environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// API response types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  metadata?: any;
}

export interface StationInfo {
  id: number;
  name: string;
  type: 'INSPECTION' | 'ASSEMBLY' | 'TESTING' | 'PACKAGING';
  lineNumber: number;
  isActive: boolean;
  currentPanel?: PanelInfo;
  workflowState: WorkflowState;
}

export interface PanelInfo {
  id: string;
  barcode: string;
  panelType: string;
  powerRating: string;
  status: 'SCANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  manufacturingOrder: string;
  lineNumber: number;
  stationNumber: number;
  scannedAt: string;
  assignedTo?: string;
}

export interface WorkflowState {
  currentStep: number;
  totalSteps: number;
  steps: WorkflowStep[];
  isCompleted: boolean;
  canProceed: boolean;
  nextAction?: string;
}

export interface WorkflowStep {
  id: number;
  name: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  isRequired: boolean;
  criteria?: InspectionCriteria[];
  completedAt?: string;
  completedBy?: string;
}

export interface InspectionCriteria {
  id: string;
  name: string;
  type: 'VISUAL' | 'MEASUREMENT' | 'FUNCTIONAL' | 'SAFETY';
  description: string;
  isRequired: boolean;
  passCondition: string;
  result?: 'PASS' | 'FAIL' | 'N/A';
  notes?: string;
  value?: string | number;
  completedAt?: string;
}

export interface StationWorkflowError {
  message: string;
  code: string;
  details?: any;
}

export class StationWorkflowService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Get station information and current workflow state
   */
  async getStationInfo(stationId: number): Promise<StationInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/stations/${stationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new StationWorkflowError(
          errorData.message || 'Failed to get station information',
          errorData.code || 'STATION_INFO_ERROR',
          errorData.details
        );
      }

      const apiResponse: ApiResponse<StationInfo> = await response.json();
      return apiResponse.data;
    } catch (error) {
      if (error instanceof StationWorkflowError) {
        throw error;
      }
      
      throw new StationWorkflowError(
        'Unknown error occurred while getting station information',
        'UNKNOWN_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Process barcode scan at a specific station
   */
  async processBarcodeScan(stationId: number, barcode: string): Promise<PanelInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/stations/${stationId}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          barcode,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new StationWorkflowError(
          errorData.message || 'Failed to process barcode scan',
          errorData.code || 'SCAN_PROCESSING_ERROR',
          errorData.details
        );
      }

      const apiResponse: ApiResponse<PanelInfo> = await response.json();
      return apiResponse.data;
    } catch (error) {
      if (error instanceof StationWorkflowError) {
        throw error;
      }
      
      throw new StationWorkflowError(
        'Unknown error occurred while processing barcode scan',
        'UNKNOWN_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Submit inspection results for a panel
   */
  async submitInspectionResults(
    stationId: number, 
    panelId: string, 
    results: InspectionCriteria[]
  ): Promise<{ success: boolean; nextStep?: WorkflowStep }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/stations/${stationId}/inspect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          panelId,
          results,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new StationWorkflowError(
          errorData.message || 'Failed to submit inspection results',
          errorData.code || 'INSPECTION_SUBMISSION_ERROR',
          errorData.details
        );
      }

      const apiResponse: ApiResponse<{ success: boolean; nextStep?: WorkflowStep }> = await response.json();
      return apiResponse.data;
    } catch (error) {
      if (error instanceof StationWorkflowError) {
        throw error;
      }
      
      throw new StationWorkflowError(
        'Unknown error occurred while submitting inspection results',
        'UNKNOWN_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Complete the current workflow step
   */
  async completeWorkflowStep(
    stationId: number, 
    stepId: number, 
    results?: any
  ): Promise<WorkflowState> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/stations/${stationId}/workflow/complete-step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stepId,
          results,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new StationWorkflowError(
          errorData.message || 'Failed to complete workflow step',
          errorData.code || 'WORKFLOW_STEP_ERROR',
          errorData.details
        );
      }

      const apiResponse: ApiResponse<WorkflowState> = await response.json();
      return apiResponse.data;
    } catch (error) {
      if (error instanceof StationWorkflowError) {
        throw error;
      }
      
      throw new StationWorkflowError(
        'Unknown error occurred while completing workflow step',
        'UNKNOWN_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Get workflow steps for a station type
   */
  async getWorkflowSteps(stationType: string): Promise<WorkflowStep[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/stations/workflow/${stationType}/steps`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new StationWorkflowError(
          errorData.message || 'Failed to get workflow steps',
          errorData.code || 'WORKFLOW_STEPS_ERROR',
          errorData.details
        );
      }

      const apiResponse: ApiResponse<WorkflowStep[]> = await response.json();
      return apiResponse.data;
    } catch (error) {
      if (error instanceof StationWorkflowError) {
        throw error;
      }
      
      throw new StationWorkflowError(
        'Unknown error occurred while getting workflow steps',
        'UNKNOWN_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Get inspection criteria for a specific step
   */
  async getInspectionCriteria(stepId: number): Promise<InspectionCriteria[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/stations/workflow/steps/${stepId}/criteria`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new StationWorkflowError(
          errorData.message || 'Failed to get inspection criteria',
          errorData.code || 'CRITERIA_ERROR',
          errorData.details
        );
      }

      const apiResponse: ApiResponse<InspectionCriteria[]> = await response.json();
      return apiResponse.data;
    } catch (error) {
      if (error instanceof StationWorkflowError) {
        throw error;
      }
      
      throw new StationWorkflowError(
        'Unknown error occurred while getting inspection criteria',
        'UNKNOWN_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Clear current panel from station (for testing or error recovery)
   */
  async clearCurrentPanel(stationId: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/stations/${stationId}/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new StationWorkflowError(
          errorData.message || 'Failed to clear current panel',
          errorData.code || 'CLEAR_PANEL_ERROR',
          errorData.details
        );
      }
    } catch (error) {
      if (error instanceof StationWorkflowError) {
        throw error;
      }
      
      throw new StationWorkflowError(
        'Unknown error occurred while clearing current panel',
        'UNKNOWN_ERROR',
        { originalError: error }
      );
    }
  }
}

// Create and export a singleton instance
const stationWorkflowService = new StationWorkflowService();
export default stationWorkflowService;

// Export types for use in components
export type { 
  StationInfo, 
  PanelInfo, 
  WorkflowState, 
  WorkflowStep, 
  InspectionCriteria, 
  StationWorkflowError 
};
