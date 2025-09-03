import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  InformationCircleIcon,
  PlayIcon,
  PauseIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import BarcodeScanner from './BarcodeScanner';
import stationWorkflowService, { 
  StationInfo, 
  PanelInfo, 
  WorkflowState, 
  WorkflowStep, 
  InspectionCriteria,
  StationWorkflowError 
} from '../services/stationWorkflowService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './ui/LoadingSpinner';

interface StationWorkflowProps {
  stationId?: number;
  className?: string;
}

export default function StationWorkflow({ stationId: propStationId, className = '' }: StationWorkflowProps) {
  const { stationId: paramStationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Use prop stationId or URL param, fallback to user's primary station
  const currentStationId = propStationId || (paramStationId ? parseInt(paramStationId) : null);
  
  const [stationInfo, setStationInfo] = useState<StationInfo | null>(null);
  const [currentPanel, setCurrentPanel] = useState<PanelInfo | null>(null);
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [currentStep, setCurrentStep] = useState<WorkflowStep | null>(null);
  const [inspectionCriteria, setInspectionCriteria] = useState<InspectionCriteria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'scanning' | 'inspecting' | 'completed'>('idle');

  // Load station information and workflow state
  const loadStationInfo = useCallback(async () => {
    if (!currentStationId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const info = await stationWorkflowService.getStationInfo(currentStationId);
      setStationInfo(info);
      setCurrentPanel(info.currentPanel || null);
      setWorkflowState(info.workflowState);
      
      // Set current step if workflow is in progress
      if (info.workflowState && info.workflowState.steps.length > 0) {
        const activeStep = info.workflowState.steps.find(step => step.status === 'IN_PROGRESS');
        if (activeStep) {
          setCurrentStep(activeStep);
          setWorkflowStatus('inspecting');
        } else if (info.currentPanel) {
          setWorkflowStatus('scanning');
        } else {
          setWorkflowStatus('idle');
        }
      } else {
        setWorkflowStatus('idle');
      }
    } catch (err) {
      console.error('Failed to load station info:', err);
      setError(err instanceof StationWorkflowError ? err.message : 'Failed to load station information');
    } finally {
      setIsLoading(false);
    }
  }, [currentStationId]);

  // Load inspection criteria for current step
  const loadInspectionCriteria = useCallback(async (stepId: number) => {
    try {
      const criteria = await stationWorkflowService.getInspectionCriteria(stepId);
      setInspectionCriteria(criteria);
    } catch (err) {
      console.error('Failed to load inspection criteria:', err);
      setError(err instanceof StationWorkflowError ? err.message : 'Failed to load inspection criteria');
    }
  }, []);

  // Handle barcode scan success
  const handleScanSuccess = useCallback(async (barcode: string) => {
    if (!currentStationId) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      
      const panelInfo = await stationWorkflowService.processBarcodeScan(currentStationId, barcode);
      setCurrentPanel(panelInfo);
      setWorkflowStatus('scanning');
      
      // Load workflow steps for this station type
      if (stationInfo) {
        const steps = await stationWorkflowService.getWorkflowSteps(stationInfo.type);
        const newWorkflowState: WorkflowState = {
          currentStep: 0,
          totalSteps: steps.length,
          steps,
          isCompleted: false,
          canProceed: true,
          nextAction: 'Begin inspection workflow'
        };
        setWorkflowState(newWorkflowState);
        
        // Start with first step
        if (steps.length > 0) {
          setCurrentStep(steps[0]);
          await loadInspectionCriteria(steps[0].id);
          setWorkflowStatus('inspecting');
        }
      }
    } catch (err) {
      console.error('Failed to process barcode scan:', err);
      setError(err instanceof StationWorkflowError ? err.message : 'Failed to process barcode scan');
    } finally {
      setIsProcessing(false);
    }
  }, [currentStationId, stationInfo, loadInspectionCriteria]);

  // Handle scan error
  const handleScanError = useCallback((error: string) => {
    setError(error);
  }, []);

  // Handle manual barcode entry
  const handleManualEntry = useCallback(async (barcode: string) => {
    await handleScanSuccess(barcode);
  }, [handleScanSuccess]);

  // Complete current workflow step
  const completeCurrentStep = useCallback(async () => {
    if (!currentStationId || !currentStep || !workflowState) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      
      const updatedWorkflowState = await stationWorkflowService.completeWorkflowStep(
        currentStationId, 
        currentStep.id,
        { criteria: inspectionCriteria }
      );
      
      setWorkflowState(updatedWorkflowState);
      
      // Move to next step or complete workflow
      if (updatedWorkflowState.isCompleted) {
        setWorkflowStatus('completed');
        setCurrentStep(null);
        setInspectionCriteria([]);
      } else {
        const nextStep = updatedWorkflowState.steps.find(step => step.status === 'IN_PROGRESS');
        if (nextStep) {
          setCurrentStep(nextStep);
          await loadInspectionCriteria(nextStep.id);
        }
      }
    } catch (err) {
      console.error('Failed to complete workflow step:', err);
      setError(err instanceof StationWorkflowError ? err.message : 'Failed to complete workflow step');
    } finally {
      setIsProcessing(false);
    }
  }, [currentStationId, currentStep, workflowState, inspectionCriteria, loadInspectionCriteria]);

  // Clear current panel
  const clearCurrentPanel = useCallback(async () => {
    if (!currentStationId) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      
      await stationWorkflowService.clearCurrentPanel(currentStationId);
      setCurrentPanel(null);
      setWorkflowState(null);
      setCurrentStep(null);
      setInspectionCriteria([]);
      setWorkflowStatus('idle');
      
      // Reload station info
      await loadStationInfo();
    } catch (err) {
      console.error('Failed to clear current panel:', err);
      setError(err instanceof StationWorkflowError ? err.message : 'Failed to clear current panel');
    } finally {
      setIsProcessing(false);
    }
  }, [currentStationId, loadStationInfo]);

  // Load station info on mount
  useEffect(() => {
    loadStationInfo();
  }, [loadStationInfo]);

  // Load inspection criteria when current step changes
  useEffect(() => {
    if (currentStep) {
      loadInspectionCriteria(currentStep.id);
    }
  }, [currentStep, loadInspectionCriteria]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-96 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`card bg-error-50 border-error-200 ${className}`}>
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-error-600 mr-2" />
          <span className="text-error-800">{error}</span>
        </div>
        <button 
          onClick={() => setError(null)}
          className="mt-2 text-sm text-error-600 hover:text-error-800"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (!stationInfo) {
    return (
      <div className={`card ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Station Not Found</h3>
          <p className="text-gray-600">Unable to load station information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Station Header */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Station {stationInfo.id} - {stationInfo.name}
            </h2>
            <p className="text-gray-600">
              Line {stationInfo.lineNumber} • {stationInfo.type}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              stationInfo.isActive 
                ? 'bg-success-100 text-success-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {stationInfo.isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      </div>

      {/* Current Panel Status */}
      {currentPanel && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Panel</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Barcode</p>
              <p className="font-mono text-lg">{currentPanel.barcode}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Panel Type</p>
              <p className="text-lg">{currentPanel.panelType} - {currentPanel.powerRating}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Manufacturing Order</p>
              <p className="text-lg">{currentPanel.manufacturingOrder}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg">{currentPanel.status}</p>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Progress */}
      {workflowState && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Workflow Progress</h3>
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Step {workflowState.currentStep + 1} of {workflowState.totalSteps}</span>
              <span>{Math.round((workflowState.currentStep / workflowState.totalSteps) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(workflowState.currentStep / workflowState.totalSteps) * 100}%` }}
              />
            </div>
          </div>
          
          {currentStep && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-2">{currentStep.name}</h4>
              <p className="text-gray-600 mb-4">{currentStep.description}</p>
              
              {inspectionCriteria.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-medium text-gray-900">Inspection Criteria:</h5>
                  {inspectionCriteria.map((criteria) => (
                    <div key={criteria.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={criteria.id}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={criteria.id} className="text-sm text-gray-700">
                        {criteria.name} {criteria.isRequired && <span className="text-error-500">*</span>}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Barcode Scanner */}
      {workflowStatus === 'idle' && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Scan Panel Barcode</h3>
          <BarcodeScanner
            onScanSuccess={handleScanSuccess}
            onScanError={handleScanError}
            onManualEntry={handleManualEntry}
          />
        </div>
      )}

      {/* Workflow Actions */}
      {workflowStatus === 'inspecting' && currentStep && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Inspection Actions</h3>
          <div className="flex space-x-4">
            <button
              onClick={completeCurrentStep}
              disabled={isProcessing}
              className="touch-button btn-primary"
            >
              {isProcessing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Complete Step
                </>
              )}
            </button>
            <button
              onClick={clearCurrentPanel}
              disabled={isProcessing}
              className="touch-button btn-secondary"
            >
              <XCircleIcon className="h-5 w-5 mr-2" />
              Clear Panel
            </button>
          </div>
        </div>
      )}

      {/* Workflow Completed */}
      {workflowStatus === 'completed' && (
        <div className="card bg-success-50 border-success-200">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-success-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-success-900">Workflow Completed</h3>
              <p className="text-success-700">Panel has been successfully processed through all workflow steps.</p>
            </div>
          </div>
          <button
            onClick={clearCurrentPanel}
            className="mt-4 touch-button btn-primary"
          >
            Process Next Panel
          </button>
        </div>
      )}
    </div>
  );
}
