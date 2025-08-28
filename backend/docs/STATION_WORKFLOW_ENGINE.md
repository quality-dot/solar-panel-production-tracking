# Station Workflow Engine

## Overview

The Station Workflow Engine is the core component of the solar panel production tracking system that manages the complete lifecycle of panels through all manufacturing stations. It implements a sophisticated state machine with pass/fail validation, quality criteria management, and automated workflow progression.

## Features

- **State Machine Management**: 9 workflow states with defined transitions
- **Pass/Fail Validation Engine**: Station-specific criteria with configurable thresholds
- **Quality Criteria Management**: Detailed definitions for all 4 stations
- **Automatic Workflow Progression**: Seamless movement between stations
- **Rework Support**: Reset workflows for failed panels
- **History Tracking**: Complete audit trail of all workflow changes
- **Real-time Monitoring**: Live workflow status and progress tracking
- **Error Handling**: Comprehensive error management with recovery strategies

## Architecture

### Core Components

1. **WorkflowEngine Class**: Main orchestrator for all workflow operations
2. **State Machine**: Manages workflow states and valid transitions
3. **Validation Engine**: Processes inspection results and determines outcomes
4. **Criteria Manager**: Handles station-specific quality requirements
5. **History Tracker**: Maintains complete workflow audit trail

### Workflow States

```javascript
WORKFLOW_STATES = {
  // Initial states
  SCANNED: 'SCANNED',                    // Panel scanned at station
  VALIDATED: 'VALIDATED',                // Barcode validated and assigned
  
  // Station-specific states
  ASSEMBLY_EL: 'ASSEMBLY_EL',            // Station 1: Assembly & EL
  FRAMING: 'FRAMING',                    // Station 2: Framing
  JUNCTION_BOX: 'JUNCTION_BOX',          // Station 3: Junction Box
  PERFORMANCE_FINAL: 'PERFORMANCE_FINAL', // Station 4: Performance & Final Inspection
  
  // Final states
  COMPLETED: 'COMPLETED',                // Panel completed successfully
  FAILED: 'FAILED',                      // Panel failed inspection
  REWORK: 'REWORK',                      // Panel sent for rework
  QUARANTINE: 'QUARANTINE'               // Panel quarantined for review
}
```

### State Transitions

The workflow engine enforces valid state transitions to maintain data integrity:

```javascript
WORKFLOW_TRANSITIONS = {
  SCANNED: [VALIDATED, FAILED],
  VALIDATED: [ASSEMBLY_EL, FAILED],
  ASSEMBLY_EL: [FRAMING, FAILED, REWORK],
  FRAMING: [JUNCTION_BOX, FAILED, REWORK],
  JUNCTION_BOX: [PERFORMANCE_FINAL, FAILED, REWORK],
  PERFORMANCE_FINAL: [COMPLETED, FAILED, REWORK, QUARANTINE],
  FAILED: [REWORK, QUARANTINE],
  REWORK: [ASSEMBLY_EL, FRAMING, JUNCTION_BOX, PERFORMANCE_FINAL],
  QUARANTINE: [REWORK, FAILED],
  COMPLETED: [] // Terminal state
}
```

## Station Configurations

### Station 1: Assembly & EL
- **Required Criteria**: cellAlignment, electricalConnection, visualInspection
- **Optional Criteria**: cellCount, stringCount, voltageCheck
- **Pass Threshold**: 95%
- **Notes Required**: No

### Station 2: Framing
- **Required Criteria**: frameAlignment, cornerSeals, mountingHoles
- **Optional Criteria**: frameType, cornerType, sealQuality
- **Pass Threshold**: 95%
- **Notes Required**: No

### Station 3: Junction Box
- **Required Criteria**: boxAlignment, cableRouting, sealIntegrity
- **Optional Criteria**: boxType, cableType, connectorType
- **Pass Threshold**: 95%
- **Notes Required**: No

### Station 4: Performance & Final Inspection
- **Required Criteria**: powerOutput, voltageCheck, currentCheck, efficiencyTest
- **Optional Criteria**: temperatureCoefficient, irradianceResponse, spectralResponse
- **Pass Threshold**: 98%
- **Notes Required**: Yes (for FAIL results)

## Quality Criteria

### Boolean Criteria
Criteria that must be true to pass:
- `cellAlignment`: Solar cells properly aligned within tolerance
- `electricalConnection`: Electrical connections secure and properly soldered
- `visualInspection`: No visible defects, cracks, or contamination
- `frameAlignment`: Frame properly aligned with panel edges
- `cornerSeals`: Corner seals properly applied and sealed
- `mountingHoles`: Mounting holes properly drilled and positioned
- `boxAlignment`: Junction box properly positioned and aligned
- `cableRouting`: Cables properly routed and secured
- `sealIntegrity`: Junction box seal intact and waterproof

### Numeric Criteria
Criteria with specific value requirements and tolerances:
- `powerOutput`: Power output meets specification (tolerance: ±5%)
- `voltageCheck`: Open circuit voltage within specification (tolerance: ±3%)
- `currentCheck`: Short circuit current within specification (tolerance: ±5%)
- `efficiencyTest`: Panel efficiency meets minimum requirements (≥18%, tolerance: ±1%)

## Usage Examples

### Basic Workflow Initialization

```javascript
import workflowEngine from '../services/workflowService.js';

// Initialize workflow for new panel
const workflow = workflowEngine.initializeWorkflow(
  'PANEL_001',           // Panel ID
  'CRS24F1236',          // Barcode
  1                       // Line number
);

console.log(workflow.currentState); // 'SCANNED'
console.log(workflow.workflowProgress); // 0
```

### Workflow Progression

```javascript
// Progress through stations
workflow = workflowEngine.transitionWorkflow(
  workflow.panelId, 
  WORKFLOW_STATES.VALIDATED,
  { stationId: 'STATION_1', operatorId: 'OP_001' }
);

workflow = workflowEngine.transitionWorkflow(
  workflow.panelId, 
  WORKFLOW_STATES.ASSEMBLY_EL
);

console.log(workflow.currentState); // 'ASSEMBLY_EL'
console.log(workflow.workflowProgress); // 25
```

### Processing Inspections

```javascript
// Process PASS inspection
const inspectionData = {
  result: 'PASS',
  criteria: {
    cellAlignment: true,
    electricalConnection: true,
    visualInspection: true,
    cellCount: 72,
    stringCount: 6
  },
  operatorId: 'OP_001'
};

const result = workflowEngine.processInspection(
  workflow.panelId, 
  'STATION_1', 
  inspectionData
);

console.log(result.outcome.result); // 'PASS'
console.log(result.outcome.nextState); // 'FRAMING'
console.log(result.workflow.qualityScore); // 100
```

### Handling Failed Inspections

```javascript
// Process FAIL inspection
const failedInspection = {
  result: 'FAIL',
  criteria: {
    cellAlignment: false,
    electricalConnection: true,
    visualInspection: false
  },
  notes: 'Cells misaligned by 2mm, visual defects on surface',
  operatorId: 'OP_001'
};

const failedResult = workflowEngine.processInspection(
  workflow.panelId, 
  'STATION_1', 
  failedInspection
);

console.log(failedResult.outcome.result); // 'FAIL'
console.log(failedResult.outcome.nextState); // 'FAILED'
console.log(failedResult.outcome.failureReasons.length); // 2
console.log(failedResult.outcome.requiredActions); // ['Realign solar cells within tolerance', 'Review and correct visualInspection issue']
```

### Rework Workflow Management

```javascript
// Reset workflow for rework
const reworkData = {
  reason: 'Cell alignment and visual defects detected',
  notes: ['Cells shifted during assembly', 'Surface contamination detected']
};

const reworkWorkflow = workflowEngine.resetWorkflowForRework(
  workflow.panelId, 
  'STATION_1', 
  reworkData
);

console.log(reworkWorkflow.currentState); // 'ASSEMBLY_EL'
console.log(reworkWorkflow.reworkCount); // 1
console.log(reworkWorkflow.reworkReason); // 'Cell alignment and visual defects detected'
```

### Workflow Completion

```javascript
// Complete workflow (must be at PERFORMANCE_FINAL state)
const completedWorkflow = workflowEngine.completeWorkflow(
  workflow.panelId, 
  {
    qualityScore: 98.5,
    finalInspector: 'OP_004',
    completionNotes: 'Panel meets all specifications'
  }
);

console.log(completedWorkflow.currentState); // 'COMPLETED'
console.log(completedWorkflow.status); // 'COMPLETED'
console.log(completedWorkflow.workflowProgress); // 100
```

## API Reference

### WorkflowEngine Methods

#### Core Workflow Management

- `initializeWorkflow(panelId, barcode, lineNumber)`: Initialize new workflow
- `transitionWorkflow(panelId, newState, transitionData)`: Move workflow to new state
- `validateTransition(panelId, newState)`: Validate state transition
- `getNextState(currentState)`: Get next valid workflow state

#### Inspection Processing

- `processInspection(panelId, stationId, inspectionData)`: Process inspection results
- `validateInspectionCriteria(stationCriteria, inspectionCriteria, result)`: Validate criteria
- `getRequiredActions(failureReasons)`: Get actions to resolve failures

#### Workflow Queries

- `getWorkflowState(panelId)`: Get current workflow state
- `getWorkflowHistory(panelId)`: Get workflow history
- `getActiveWorkflows()`: Get all active workflows
- `getWorkflowsByStatus(status)`: Get workflows by status
- `getWorkflowsByStation(stationId)`: Get workflows by station

#### Workflow Lifecycle

- `completeWorkflow(panelId, completionData)`: Complete workflow
- `resetWorkflowForRework(panelId, targetStation, reworkData)`: Reset for rework

### Data Structures

#### Workflow State Object

```javascript
{
  panelId: 'string',
  barcode: 'string',
  lineNumber: 'number',
  currentState: 'string',
  previousState: 'string',
  nextState: 'string',
  stationId: 'string',
  operatorId: 'string',
  startTime: 'ISO string',
  lastUpdate: 'ISO string',
  workflowProgress: 'number',
  qualityScore: 'number',
  criteria: 'object',
  notes: 'array',
  status: 'string',
  reworkCount: 'number',
  reworkReason: 'string',
  reworkNotes: 'array'
}
```

#### Inspection Data Object

```javascript
{
  result: 'PASS' | 'FAIL',
  criteria: 'object', // Station-specific criteria results
  notes: 'string',    // Optional notes (required for FAIL at Station 4)
  operatorId: 'string'
}
```

#### Inspection Result Object

```javascript
{
  workflow: 'WorkflowState',
  outcome: {
    result: 'PASS' | 'FAIL',
    nextState: 'string',
    workflowProgress: 'number',
    qualityScore: 'number',
    message: 'string',
    failureReasons: 'array',    // Only for FAIL
    requiredActions: 'array'    // Only for FAIL
  },
  nextActions: 'array'
}
```

## Error Handling

The workflow engine uses custom error classes for comprehensive error management:

### WorkflowError

Thrown when workflow operations fail:
- Invalid state transitions
- Panel not found
- Invalid station configurations
- Inspection validation failures

```javascript
try {
  workflowEngine.transitionWorkflow(panelId, 'INVALID_STATE');
} catch (error) {
  if (error.name === 'WorkflowError') {
    console.error('Error Code:', error.code);
    console.error('Panel ID:', error.panelId);
    console.error('Current State:', error.currentState);
    console.error('Attempted Action:', error.attemptedAction);
  }
}
```

## Testing

### Running Tests

```bash
# Run workflow engine tests
npm run test-workflow-engine

# Run specific test file
node backend/services/__tests__/workflowService.test.js
```

### Test Coverage

The test suite covers:
- Constants and configuration validation
- Workflow initialization and state management
- State transitions and validation
- Pass/fail validation engine
- Workflow progression through stations
- Inspection processing and quality scoring
- Rework workflow management
- Error handling and edge cases
- Workflow queries and analytics

## Demonstration

### Running the Demo

```bash
# Run workflow engine demonstration
npm run demo-workflow-engine

# Run specific demo script
node backend/scripts/demo-workflow-engine.js
```

### Demo Scenarios

The demonstration script showcases:
1. **Normal Workflow Progression**: Complete panel journey through all stations
2. **Failed Inspection and Rework**: Handling failures and rework workflows
3. **Station-Specific Criteria**: Different validation requirements per station
4. **Quality Criteria Examples**: Detailed criteria definitions and usage
5. **Workflow Queries and Analytics**: Monitoring and reporting capabilities

## Configuration

### Customizing Station Criteria

To modify station criteria, update the `STATION_CONFIGS` object:

```javascript
export const STATION_CONFIGS = {
  STATION_1: {
    name: 'Custom Station Name',
    workflowStep: WORKFLOW_STATES.ASSEMBLY_EL,
    nextStep: WORKFLOW_STATES.FRAMING,
    criteria: {
      required: ['customCriterion1', 'customCriterion2'],
      optional: ['optionalCriterion1'],
      passThreshold: 0.90, // 90% threshold
      notesRequired: true  // Require notes for all results
    }
  }
  // ... other stations
};
```

### Adding New Quality Criteria

To add new quality criteria, extend the `QUALITY_CRITERIA` object:

```javascript
export const QUALITY_CRITERIA = {
  // ... existing criteria
  
  customCriterion1: {
    name: 'Custom Criterion Name',
    description: 'Description of what this criterion measures',
    type: 'boolean', // or 'number', 'string'
    required: true,
    passValue: true, // or specific value for non-boolean types
    unit: 'unit',    // for numeric types
    tolerance: 0.05  // for numeric types
  }
};
```

## Performance Considerations

### Memory Management

- Workflow data is stored in memory for fast access
- Consider database persistence for production environments
- Implement cleanup for completed workflows if memory usage becomes a concern

### Scalability

- The engine can handle thousands of concurrent workflows
- Use appropriate data structures (Maps) for O(1) lookups
- Consider implementing workflow batching for bulk operations

## Security Considerations

### Input Validation

- All workflow operations validate input parameters
- Station IDs and panel IDs are validated before processing
- Inspection data is validated against station criteria

### Access Control

- Operator IDs are tracked for audit purposes
- Consider implementing role-based access control for workflow operations
- Validate operator permissions before allowing workflow modifications

## Integration

### With Existing Systems

The workflow engine integrates with:
- **Barcode Processing System**: Receives scanned panels
- **Station Management**: Coordinates with station operations
- **Quality Management**: Processes inspection results
- **Manufacturing Orders**: Tracks panel progress through MOs
- **Reporting System**: Provides workflow analytics and metrics

### API Endpoints

The workflow engine can be exposed through REST API endpoints:
- `POST /api/v1/workflows`: Initialize new workflow
- `PUT /api/v1/workflows/:id/transition`: Transition workflow state
- `POST /api/v1/workflows/:id/inspect`: Process inspection
- `GET /api/v1/workflows/:id`: Get workflow state
- `GET /api/v1/workflows/:id/history`: Get workflow history
- `PUT /api/v1/workflows/:id/rework`: Reset for rework
- `POST /api/v1/workflows/:id/complete`: Complete workflow

## Troubleshooting

### Common Issues

1. **Invalid State Transition**
   - Check current workflow state
   - Verify allowed transitions in `WORKFLOW_TRANSITIONS`
   - Ensure workflow progression follows defined sequence

2. **Inspection Validation Failure**
   - Verify all required criteria are provided
   - Check criteria values match expected types
   - Ensure notes are provided for FAIL results when required

3. **Workflow Not Found**
   - Verify panel ID exists
   - Check if workflow was properly initialized
   - Ensure workflow hasn't been completed or removed

### Debug Mode

Enable debug logging to trace workflow operations:

```javascript
// Set environment variable
process.env.WORKFLOW_DEBUG = 'true';

// Debug information will be logged to console
```

## Future Enhancements

### Planned Features

1. **Database Persistence**: Store workflows in PostgreSQL for persistence
2. **Real-time Notifications**: WebSocket integration for live updates
3. **Advanced Analytics**: Workflow performance metrics and optimization
4. **Mobile Support**: PWA integration for mobile operators
5. **Machine Learning**: Predictive quality analysis and optimization

### Extension Points

The workflow engine is designed for extensibility:
- Custom station configurations
- Additional quality criteria types
- Enhanced validation rules
- Custom workflow states and transitions
- Integration with external quality systems

## Support

For questions or issues with the Station Workflow Engine:

1. Check this documentation
2. Review test cases for usage examples
3. Run the demonstration script to see features in action
4. Check error logs for specific error details
5. Review workflow history for debugging workflow issues

---

**Note**: The Station Workflow Engine is a critical component of the production system. Always test changes in a development environment before deploying to production.
