import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import BarcodeScanner from './BarcodeScanner';

interface StationTabletIntegrationProps {
  stationId: string;
  stationName: string;
  workflowState: string;
  onWorkflowTransition: (fromState: string, toState: string, panelData: any) => void;
  className?: string;
}

interface PanelWorkflowData {
  barcode: string;
  panelType: string;
  powerRating: string;
  lineNumber: string;
  stationNumber: string;
  manufacturingOrder: string;
  currentState: string;
  nextStates: string[];
  qualityCriteria: any[];
  inspectionResults: any[];
  timestamp: Date;
}

export default function StationTabletIntegration({
  stationId,
  stationName,
  workflowState,
  onWorkflowTransition,
  className = ''
}: StationTabletIntegrationProps) {
  const [currentPanel, setCurrentPanel] = useState<PanelWorkflowData | null>(null);
  const [workflowHistory, setWorkflowHistory] = useState<PanelWorkflowData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [availableTransitions, setAvailableTransitions] = useState<string[]>([]);

  // Initialize station-specific workflow configuration
  useEffect(() => {
    // Load station-specific criteria and workflow configuration
    loadStationConfiguration();
  }, [stationId]);

  const loadStationConfiguration = async () => {
    try {
      // In real implementation, this would fetch from backend
      // For now, we'll use mock data
      const mockConfig = getStationConfiguration(stationId);
      setAvailableTransitions(mockConfig.availableTransitions);
    } catch (error) {
      console.error('Failed to load station configuration:', error);
      setErrorMessage('Failed to load station configuration');
    }
  };

  const getStationConfiguration = (stationId: string) => {
    const configs: Record<string, any> = {
      'STATION_1': {
        name: 'Assembly & EL',
        availableTransitions: ['VALIDATED', 'ASSEMBLY_EL', 'FAILED', 'REWORK'],
        qualityCriteria: ['Visual Inspection', 'Electrical Test', 'Alignment Check']
      },
      'STATION_2': {
        name: 'Framing',
        availableTransitions: ['ASSEMBLY_EL', 'FRAMING', 'FAILED', 'REWORK'],
        qualityCriteria: ['Frame Alignment', 'Corner Strength', 'Mounting Holes']
      },
      'STATION_3': {
        name: 'Junction Box',
        availableTransitions: ['FRAMING', 'JUNCTION_BOX', 'FAILED', 'REWORK'],
        qualityCriteria: ['Box Sealing', 'Wire Routing', 'Connector Test']
      },
      'STATION_4': {
        name: 'Performance & Final',
        availableTransitions: ['JUNCTION_BOX', 'COMPLETED', 'FAILED', 'QUARANTINE'],
        qualityCriteria: ['Power Output', 'Efficiency Test', 'Final Inspection']
      }
    };
    
    return configs[stationId] || configs['STATION_1'];
  };

  const handleScanSuccess = async (barcode: string) => {
    setIsProcessing(true);
    setErrorMessage('');

    try {
      // Parse barcode and validate against station
      const panelData = await processPanelBarcode(barcode, stationId);
      
      if (panelData) {
        setCurrentPanel(panelData);
        setWorkflowHistory(prev => [panelData, ...prev.slice(0, 9)]); // Keep last 10
      } else {
        throw new Error('Invalid panel for this station');
      }
    } catch (error) {
      console.error('Panel processing error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process panel');
    } finally {
      setIsProcessing(false);
    }
  };

  const processPanelBarcode = async (barcode: string, stationId: string): Promise<PanelWorkflowData | null> => {
    // Parse CRSYYFBPP##### format
    const match = barcode.match(/^CRS(\d{2})YF(\d{2})PP(\d{5})$/);
    if (!match) {
      throw new Error('Invalid barcode format');
    }

    const [, lineNum, stationNum, moNum] = match;
    
    // Validate station number matches current station
    const expectedStation = getExpectedStationNumber(stationId);
    if (stationNum !== expectedStation) {
      throw new Error(`Panel belongs to station ${stationNum}, not current station ${expectedStation}`);
    }

    // Map line numbers to panel types and power ratings
    const lineConfigs: Record<string, { type: string; power: string }> = {
      '01': { type: 'Monocrystalline', power: '400W' },
      '02': { type: 'Polycrystalline', power: '380W' },
      '03': { type: 'Thin Film', power: '350W' },
      '04': { type: 'Bifacial', power: '450W' }
    };

    const config = lineConfigs[lineNum] || { type: 'Standard', power: '400W' };

    return {
      barcode,
      panelType: config.type,
      powerRating: config.power,
      lineNumber: lineNum,
      stationNumber: stationNum,
      manufacturingOrder: moNum,
      currentState: workflowState,
      nextStates: getAvailableTransitions(workflowState),
      qualityCriteria: getStationConfiguration(stationId).qualityCriteria,
      inspectionResults: [],
      timestamp: new Date()
    };
  };

  const getExpectedStationNumber = (stationId: string): string => {
    const stationMap: Record<string, string> = {
      'STATION_1': '01',
      'STATION_2': '02',
      'STATION_3': '03',
      'STATION_4': '04'
    };
    return stationMap[stationId] || '01';
  };

  const getAvailableTransitions = (currentState: string): string[] => {
    const transitions: Record<string, string[]> = {
      'SCANNED': ['VALIDATED', 'FAILED'],
      'VALIDATED': ['ASSEMBLY_EL', 'FAILED'],
      'ASSEMBLY_EL': ['FRAMING', 'FAILED', 'REWORK'],
      'FRAMING': ['JUNCTION_BOX', 'FAILED', 'REWORK'],
      'JUNCTION_BOX': ['PERFORMANCE_FINAL', 'FAILED', 'REWORK'],
      'PERFORMANCE_FINAL': ['COMPLETED', 'FAILED', 'REWORK', 'QUARANTINE'],
      'FAILED': ['REWORK', 'QUARANTINE'],
      'REWORK': ['ASSEMBLY_EL', 'FRAMING', 'JUNCTION_BOX', 'PERFORMANCE_FINAL'],
      'QUARANTINE': ['REWORK', 'FAILED'],
      'COMPLETED': []
    };
    
    return transitions[currentState] || [];
  };

  const handleWorkflowTransition = async (toState: string) => {
    if (!currentPanel) return;

    setIsProcessing(true);
    try {
      // Validate transition
      if (!availableTransitions.includes(toState)) {
        throw new Error(`Invalid transition from ${currentPanel.currentState} to ${toState}`);
      }

      // Update panel state
      const updatedPanel = {
        ...currentPanel,
        currentState: toState,
        nextStates: getAvailableTransitions(toState),
        timestamp: new Date()
      };

      setCurrentPanel(updatedPanel);
      setWorkflowHistory(prev => 
        prev.map(p => p.barcode === updatedPanel.barcode ? updatedPanel : p)
      );

      // Notify parent component
      onWorkflowTransition(currentPanel.currentState, toState, updatedPanel);

      // Clear current panel after successful transition
      setTimeout(() => {
        setCurrentPanel(null);
      }, 2000);

    } catch (error) {
      console.error('Workflow transition error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Transition failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanError = (error: string) => {
    setErrorMessage(error);
  };

  const handleManualEntry = async (barcode: string) => {
    await handleScanSuccess(barcode);
  };

  const resetCurrentPanel = () => {
    setCurrentPanel(null);
    setErrorMessage('');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Station Header */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-blue-900">{stationName}</h2>
            <p className="text-blue-700">Station ID: {stationId}</p>
            <p className="text-blue-600 text-sm">Current Workflow State: {workflowState}</p>
          </div>
          <div className="text-right">
            <ClockIcon className="h-8 w-8 text-blue-600" />
            <p className="text-blue-600 text-xs">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Barcode Scanner */}
      <BarcodeScanner
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
        onManualEntry={handleManualEntry}
      />

      {/* Processing Status */}
      {isProcessing && (
        <div className="card">
          <div className="text-center">
            <div className="spinner h-8 w-8 mx-auto mb-2" />
            <p className="text-gray-600">Processing panel...</p>
          </div>
        </div>
      )}

      {/* Current Panel Workflow */}
      {currentPanel && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Current Panel</h3>
            <button
              onClick={resetCurrentPanel}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Panel Information */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-gray-600 text-sm">Barcode</span>
              <p className="font-mono text-sm">{currentPanel.barcode}</p>
            </div>
            <div>
              <span className="text-gray-600 text-sm">Panel Type</span>
              <p className="font-medium">{currentPanel.panelType}</p>
            </div>
            <div>
              <span className="text-gray-600 text-sm">Power Rating</span>
              <p className="font-medium">{currentPanel.powerRating}</p>
            </div>
            <div>
              <span className="text-gray-600 text-sm">Manufacturing Order</span>
              <p className="font-medium">{currentPanel.manufacturingOrder}</p>
            </div>
          </div>

          {/* Current State */}
          <div className="mb-4">
            <span className="text-gray-600 text-sm">Current State</span>
            <div className="mt-1">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {currentPanel.currentState}
              </span>
            </div>
          </div>

          {/* Available Transitions */}
          <div className="mb-4">
            <span className="text-gray-600 text-sm">Available Actions</span>
            <div className="mt-2 space-y-2">
              {currentPanel.nextStates.map((nextState) => (
                <button
                  key={nextState}
                  onClick={() => handleWorkflowTransition(nextState)}
                  disabled={isProcessing}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                    nextState === 'COMPLETED' || nextState === 'FAILED'
                      ? 'border-green-200 bg-green-50 hover:bg-green-100'
                      : nextState === 'REWORK' || nextState === 'QUARANTINE'
                      ? 'border-red-200 bg-red-50 hover:bg-red-100'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{nextState}</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quality Criteria */}
          <div>
            <span className="text-gray-600 text-sm">Quality Criteria</span>
            <div className="mt-2 space-y-1">
              {currentPanel.qualityCriteria.map((criteria, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{criteria}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Workflow History */}
      {workflowHistory.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-2">
            {workflowHistory.slice(0, 5).map((panel, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex-1">
                  <p className="text-sm font-medium">{panel.barcode}</p>
                  <p className="text-xs text-gray-500">
                    {panel.currentState} • {panel.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    panel.currentState === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    panel.currentState === 'FAILED' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {panel.currentState}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {errorMessage && (
        <div className="card bg-error-50 border-error-200">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-error-600 mr-2" />
            <span className="text-error-800">{errorMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
