import React, { useState } from 'react';
import { 
  CogIcon, 
  PlayIcon, 
  StopIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import StationTabletIntegration from '../components/StationTabletIntegration';

interface StationConfig {
  id: string;
  name: string;
  workflowState: string;
  description: string;
}

const STATION_CONFIGS: StationConfig[] = [
  {
    id: 'STATION_1',
    name: 'Assembly & EL',
    workflowState: 'ASSEMBLY_EL',
    description: 'Solar cell assembly and electrical testing station'
  },
  {
    id: 'STATION_2',
    name: 'Framing',
    workflowState: 'FRAMING',
    description: 'Frame assembly and structural integrity testing'
  },
  {
    id: 'STATION_3',
    name: 'Junction Box',
    workflowState: 'JUNCTION_BOX',
    description: 'Junction box installation and wiring'
  },
  {
    id: 'STATION_4',
    name: 'Performance & Final',
    workflowState: 'PERFORMANCE_FINAL',
    description: 'Final performance testing and quality inspection'
  }
];

export default function StationDemo() {
  const [selectedStation, setSelectedStation] = useState<StationConfig>(STATION_CONFIGS[0]);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [workflowLog, setWorkflowLog] = useState<Array<{
    timestamp: Date;
    station: string;
    fromState: string;
    toState: string;
    barcode: string;
  }>>([]);

  const handleWorkflowTransition = (fromState: string, toState: string, panelData: any) => {
    const logEntry = {
      timestamp: new Date(),
      station: selectedStation.name,
      fromState,
      toState,
      barcode: panelData.barcode
    };
    
    setWorkflowLog(prev => [logEntry, ...prev.slice(0, 19)]); // Keep last 20 entries
    
    console.log('Workflow transition:', logEntry);
  };

  const startDemo = () => {
    setIsDemoRunning(true);
    setWorkflowLog([]);
  };

  const stopDemo = () => {
    setIsDemoRunning(false);
  };

  const resetDemo = () => {
    setWorkflowLog([]);
    setSelectedStation(STATION_CONFIGS[0]);
  };

  const generateTestBarcode = (): string => {
    const lineNum = Math.floor(Math.random() * 4) + 1;
    const stationNum = Math.floor(Math.random() * 4) + 1;
    const moNum = Math.floor(Math.random() * 100000);
    
    return `CRS${lineNum.toString().padStart(2, '0')}YF${stationNum.toString().padStart(2, '0')}PP${moNum.toString().padStart(5, '0')}`;
  };

  const simulatePanelScan = () => {
    if (!isDemoRunning) return;
    
    const testBarcode = generateTestBarcode();
    console.log('Simulated scan:', testBarcode);
    
    // In a real implementation, this would trigger the scanner
    // For demo purposes, we'll just log it
    const logEntry = {
      timestamp: new Date(),
      station: selectedStation.name,
      fromState: 'DEMO',
      toState: 'SCANNED',
      barcode: testBarcode
    };
    
    setWorkflowLog(prev => [logEntry, ...prev.slice(0, 19)]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="lg:hidden">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Station Tablet Demo</h1>
        <p className="text-gray-600">Demonstrate barcode scanning integration with station workflow</p>
      </div>

      {/* Demo Controls */}
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-blue-900">Demo Controls</h2>
            <p className="text-blue-700 text-sm">Control the demonstration environment</p>
          </div>
          <div className="flex items-center space-x-2">
            {!isDemoRunning ? (
              <button
                onClick={startDemo}
                className="touch-button btn-success"
              >
                <PlayIcon className="h-5 w-5 mr-2" />
                Start Demo
              </button>
            ) : (
              <button
                onClick={stopDemo}
                className="touch-button btn-error"
              >
                <StopIcon className="h-5 w-5 mr-2" />
                Stop Demo
              </button>
            )}
            <button
              onClick={resetDemo}
              className="touch-button btn-secondary"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Reset
            </button>
          </div>
        </div>

        {/* Station Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATION_CONFIGS.map((station) => (
            <button
              key={station.id}
              onClick={() => setSelectedStation(station)}
              disabled={isDemoRunning}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedStation.id === station.id
                  ? 'border-blue-500 bg-blue-100'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${isDemoRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-left">
                <h3 className="font-medium text-gray-900">{station.name}</h3>
                <p className="text-xs text-gray-600">{station.description}</p>
                <p className="text-xs text-blue-600 mt-1">State: {station.workflowState}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Demo Status */}
        <div className="mt-4 p-3 bg-white rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">Demo Status:</span>
              <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                isDemoRunning 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {isDemoRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
            {isDemoRunning && (
              <button
                onClick={simulatePanelScan}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Simulate Panel Scan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Station Tablet Integration */}
      <StationTabletIntegration
        stationId={selectedStation.id}
        stationName={selectedStation.name}
        workflowState={selectedStation.workflowState}
        onWorkflowTransition={handleWorkflowTransition}
      />

      {/* Workflow Log */}
      {workflowLog.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Workflow Activity Log</h3>
            <span className="text-sm text-gray-500">{workflowLog.length} entries</span>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {workflowLog.map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs">{entry.barcode}</span>
                    <span className="text-gray-500">•</span>
                    <span className="font-medium">{entry.station}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {entry.fromState} → {entry.toState}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demo Instructions */}
      <div className="card bg-yellow-50 border-yellow-200">
        <div className="flex items-start space-x-3">
          <CogIcon className="h-6 w-6 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-yellow-900">Demo Instructions</h3>
            <div className="mt-2 text-sm text-yellow-800 space-y-2">
              <p>1. <strong>Start the demo</strong> to enable station tablet functionality</p>
              <p>2. <strong>Select a station</strong> to see different workflow configurations</p>
              <p>3. <strong>Use the barcode scanner</strong> to scan panel barcodes (CRSYYFBPP##### format)</p>
              <p>4. <strong>Observe workflow transitions</strong> as panels move through the system</p>
              <p>5. <strong>Monitor the activity log</strong> to see all workflow changes</p>
              <p className="mt-3 text-yellow-700">
                <strong>Note:</strong> This is a demonstration environment. In production, the system would integrate with real hardware and backend services.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
