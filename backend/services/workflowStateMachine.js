/**
 * Workflow State Machine for Solar Panel Production
 * Manages panel workflow through stations with state transitions and routing logic
 */

import { EventEmitter } from 'events';

// Core workflow states
export const WORKFLOW_STATES = {
  SCANNED: 'SCANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  REWORK_NEEDED: 'REWORK_NEEDED',
  COMPLETED: 'COMPLETED',
  QUARANTINE: 'QUARANTINE'
};

// Valid state transitions
export const VALID_TRANSITIONS = {
  [WORKFLOW_STATES.SCANNED]: [WORKFLOW_STATES.IN_PROGRESS, WORKFLOW_STATES.FAILED],
  [WORKFLOW_STATES.IN_PROGRESS]: [WORKFLOW_STATES.PASSED, WORKFLOW_STATES.FAILED, WORKFLOW_STATES.REWORK_NEEDED],
  [WORKFLOW_STATES.PASSED]: [WORKFLOW_STATES.COMPLETED, WORKFLOW_STATES.IN_PROGRESS],
  [WORKFLOW_STATES.FAILED]: [WORKFLOW_STATES.REWORK_NEEDED, WORKFLOW_STATES.QUARANTINE],
  [WORKFLOW_STATES.REWORK_NEEDED]: [WORKFLOW_STATES.IN_PROGRESS, WORKFLOW_STATES.FAILED],
  [WORKFLOW_STATES.COMPLETED]: [],
  [WORKFLOW_STATES.QUARANTINE]: [WORKFLOW_STATES.REWORK_NEEDED, WORKFLOW_STATES.FAILED]
};

// Station workflow progression
export const STATION_PROGRESSION = {
  LINE_1: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_4'],
  LINE_2: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_4']
};

// Panel routing rules based on panel type
export const PANEL_ROUTING_RULES = {
  '36': { line: 'LINE_1', stations: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_4'] },
  '40': { line: 'LINE_1', stations: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_4'] },
  '60': { line: 'LINE_1', stations: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_4'] },
  '72': { line: 'LINE_1', stations: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_4'] },
  '144': { line: 'LINE_2', stations: ['STATION_1', 'STATION_2', 'STATION_3', 'STATION_4'] }
};

/**
 * Workflow State Machine Class
 * Manages panel workflow states, transitions, and routing
 */
export class WorkflowStateMachine extends EventEmitter {
  constructor() {
    super();
    this.panels = new Map(); // panelId -> panelState
    this.stationQueues = new Map(); // stationId -> queue
    this.transitionHistory = new Map(); // panelId -> transitionHistory[]
  }

  /**
   * Initialize a new panel workflow
   * @param {string} panelId - Unique panel identifier
   * @param {string} barcode - Panel barcode
   * @param {string} panelType - Panel type (36, 40, 60, 72, 144)
   * @returns {Object} Initial panel state
   */
  initializePanel(panelId, barcode, panelType) {
    const routing = PANEL_ROUTING_RULES[panelType];
    if (!routing) {
      throw new Error(`Invalid panel type: ${panelType}`);
    }

    const panelState = {
      id: panelId,
      barcode,
      panelType,
      currentState: WORKFLOW_STATES.SCANNED,
      currentStation: null,
      line: routing.line,
      stations: routing.stations,
      currentStationIndex: -1,
      startTime: new Date(),
      lastUpdateTime: new Date(),
      stateHistory: [],
      notes: [],
      qualityData: {},
      reworkCount: 0,
      maxReworkAttempts: 3
    };

    // Add to initial state
    this.panels.set(panelId, panelState);
    this.transitionHistory.set(panelId, []);
    
    // Log initial state
    this.logStateTransition(panelId, null, WORKFLOW_STATES.SCANNED, 'Panel initialized');
    
    // Emit panel initialized event
    this.emit('panelInitialized', panelState);
    
    return panelState;
  }

  /**
   * Transition panel to a new state
   * @param {string} panelId - Panel identifier
   * @param {string} newState - Target state
   * @param {string} reason - Reason for transition
   * @param {Object} additionalData - Additional data for the transition
   * @returns {Object} Updated panel state
   */
  transitionPanel(panelId, newState, reason = '', additionalData = {}) {
    const panel = this.panels.get(panelId);
    if (!panel) {
      throw new Error(`Panel not found: ${panelId}`);
    }

    const currentState = panel.currentState;
    
    // Validate transition
    if (!this.isValidTransition(currentState, newState)) {
      throw new Error(`Invalid transition from ${currentState} to ${newState}`);
    }

    // Update panel state
    const oldState = panel.currentState;
    panel.currentState = newState;
    panel.lastUpdateTime = new Date();
    
    // Handle state-specific logic
    this.handleStateTransition(panel, oldState, newState, additionalData);
    
    // Log transition
    this.logStateTransition(panelId, oldState, newState, reason, additionalData);
    
    // Emit transition event
    this.emit('stateTransition', {
      panelId,
      oldState,
      newState,
      reason,
      timestamp: new Date(),
      additionalData
    });

    return panel;
  }

  /**
   * Validate if a state transition is allowed
   * @param {string} currentState - Current state
   * @param {string} newState - Target state
   * @returns {boolean} True if transition is valid
   */
  isValidTransition(currentState, newState) {
    const allowedTransitions = VALID_TRANSITIONS[currentState];
    return allowedTransitions && allowedTransitions.includes(newState);
  }

  /**
   * Handle state-specific logic during transitions
   * @param {Object} panel - Panel state object
   * @param {string} oldState - Previous state
   * @param {string} newState - New state
   * @param {Object} additionalData - Additional transition data
   */
  handleStateTransition(panel, oldState, newState, additionalData) {
    switch (newState) {
      case WORKFLOW_STATES.IN_PROGRESS:
        this.handleInProgressTransition(panel, additionalData);
        break;
      case WORKFLOW_STATES.PASSED:
        this.handlePassedTransition(panel, additionalData);
        break;
      case WORKFLOW_STATES.FAILED:
        this.handleFailedTransition(panel, additionalData);
        break;
      case WORKFLOW_STATES.REWORK_NEEDED:
        this.handleReworkTransition(panel, additionalData);
        break;
      case WORKFLOW_STATES.COMPLETED:
        this.handleCompletedTransition(panel, additionalData);
        break;
      case WORKFLOW_STATES.QUARANTINE:
        this.handleQuarantineTransition(panel, additionalData);
        break;
    }
  }

  /**
   * Handle transition to IN_PROGRESS state
   * @param {Object} panel - Panel state object
   * @param {Object} additionalData - Additional data
   */
  handleInProgressTransition(panel, additionalData) {
    const { stationId, stationIndex } = additionalData;
    
    if (stationId && stationIndex !== undefined) {
      panel.currentStation = stationId;
      panel.currentStationIndex = stationIndex;
      
      // Add to station queue
      this.addToStationQueue(stationId, panel.id);
    }
  }

  /**
   * Handle transition to PASSED state
   * @param {Object} panel - Panel state object
   * @param {Object} additionalData - Additional data
   */
  handlePassedTransition(panel, additionalData) {
    const { qualityData, notes } = additionalData;
    
    if (qualityData) {
      panel.qualityData[panel.currentStation] = qualityData;
    }
    
    if (notes) {
      panel.notes.push({
        station: panel.currentStation,
        timestamp: new Date(),
        type: 'PASS',
        content: notes
      });
    }

    // Check if ready for next station
    this.checkNextStation(panel);
  }

  /**
   * Handle transition to FAILED state
   * @param {Object} panel - Panel state object
   * @param {Object} additionalData - Additional data
   */
  handleFailedTransition(panel, additionalData) {
    const { failureReason, criteria, notes } = additionalData;
    
    panel.notes.push({
      station: panel.currentStation,
      timestamp: new Date(),
      type: 'FAIL',
      content: notes,
      failureReason,
      criteria
    });

    // Increment rework count
    panel.reworkCount++;
  }

  /**
   * Handle transition to REWORK_NEEDED state
   * @param {Object} panel - Panel state object
   * @param {Object} additionalData - Additional data
   */
  handleReworkTransition(panel, additionalData) {
    const { reworkStation, reworkReason } = additionalData;
    
    panel.notes.push({
      station: panel.currentStation,
      timestamp: new Date(),
      type: 'REWORK',
      content: reworkReason,
      reworkStation
    });

    // Determine rework entry point
    if (reworkStation) {
      panel.currentStation = reworkStation;
      panel.currentStationIndex = panel.stations.indexOf(reworkStation);
    }
  }

  /**
   * Handle transition to COMPLETED state
   * @param {Object} panel - Panel state object
   * @param {Object} additionalData - Additional data
   */
  handleCompletedTransition(panel, additionalData) {
    const { finalQualityData, completionNotes } = additionalData;
    
    if (finalQualityData) {
      panel.qualityData.final = finalQualityData;
    }
    
    if (completionNotes) {
      panel.notes.push({
        station: 'FINAL',
        timestamp: new Date(),
        type: 'COMPLETION',
        content: completionNotes
      });
    }

    // Remove from active panels
    this.panels.delete(panel.id);
    
    // Emit completion event
    this.emit('panelCompleted', panel);
  }

  /**
   * Handle transition to QUARANTINE state
   * @param {Object} panel - Panel state object
   * @param {Object} additionalData - Additional data
   */
  handleQuarantineTransition(panel, additionalData) {
    const { quarantineReason, quarantineLevel } = additionalData;
    
    panel.notes.push({
      station: panel.currentStation,
      timestamp: new Date(),
      type: 'QUARANTINE',
      content: quarantineReason,
      quarantineLevel
    });
  }

  /**
   * Check if panel is ready for next station
   * @param {Object} panel - Panel state object
   */
  checkNextStation(panel) {
    const nextStationIndex = panel.currentStationIndex + 1;
    
    if (nextStationIndex < panel.stations.length) {
      // Ready for next station
      panel.currentStationIndex = nextStationIndex;
      panel.currentStation = panel.stations[nextStationIndex];
      
      // Add to next station queue
      this.addToStationQueue(panel.currentStation, panel.id);
      
      this.emit('readyForNextStation', {
        panelId: panel.id,
        nextStation: panel.currentStation,
        panelType: panel.panelType
      });
    } else {
      // All stations completed
      this.transitionPanel(panel.id, WORKFLOW_STATES.COMPLETED, 'All stations completed');
    }
  }

  /**
   * Add panel to station queue
   * @param {string} stationId - Station identifier
   * @param {string} panelId - Panel identifier
   */
  addToStationQueue(stationId, panelId) {
    if (!this.stationQueues.has(stationId)) {
      this.stationQueues.set(stationId, []);
    }
    
    const queue = this.stationQueues.get(stationId);
    if (!queue.includes(panelId)) {
      queue.push(panelId);
    }
  }

  /**
   * Remove panel from station queue
   * @param {string} stationId - Station identifier
   * @param {string} panelId - Panel identifier
   */
  removeFromStationQueue(stationId, panelId) {
    const queue = this.stationQueues.get(stationId);
    if (queue) {
      const index = queue.indexOf(panelId);
      if (index > -1) {
        queue.splice(index, 1);
      }
    }
  }

  /**
   * Get next panel in station queue
   * @param {string} stationId - Station identifier
   * @returns {string|null} Next panel ID or null if queue is empty
   */
  getNextPanelInQueue(stationId) {
    const queue = this.stationQueues.get(stationId);
    return queue && queue.length > 0 ? queue[0] : null;
  }

  /**
   * Log state transition for audit trail
   * @param {string} panelId - Panel identifier
   * @param {string} oldState - Previous state
   * @param {string} newState - New state
   * @param {string} reason - Transition reason
   * @param {Object} additionalData - Additional data
   */
  logStateTransition(panelId, oldState, newState, reason, additionalData = {}) {
    const transition = {
      timestamp: new Date(),
      oldState,
      newState,
      reason,
      additionalData
    };

    if (!this.transitionHistory.has(panelId)) {
      this.transitionHistory.set(panelId, []);
    }

    this.transitionHistory.get(panelId).push(transition);
  }

  /**
   * Get panel state
   * @param {string} panelId - Panel identifier
   * @returns {Object|null} Panel state or null if not found
   */
  getPanelState(panelId) {
    return this.panels.get(panelId) || null;
  }

  /**
   * Get all panels in a specific state
   * @param {string} state - Workflow state
   * @returns {Array} Array of panel states
   */
  getPanelsByState(state) {
    return Array.from(this.panels.values()).filter(panel => panel.currentState === state);
  }

  /**
   * Get station queue
   * @param {string} stationId - Station identifier
   * @returns {Array} Array of panel IDs in queue
   */
  getStationQueue(stationId) {
    return this.stationQueues.get(stationId) || [];
  }

  /**
   * Get transition history for a panel
   * @param {string} panelId - Panel identifier
   * @returns {Array} Array of transitions
   */
  getPanelTransitionHistory(panelId) {
    return this.transitionHistory.get(panelId) || [];
  }

  /**
   * Get workflow statistics
   * @returns {Object} Workflow statistics
   */
  getWorkflowStatistics() {
    const totalPanels = this.panels.size;
    const stateCounts = {};
    const queueCounts = {};

    // Count panels by state
    Object.values(WORKFLOW_STATES).forEach(state => {
      stateCounts[state] = 0;
    });

    this.panels.forEach(panel => {
      stateCounts[panel.currentState]++;
    });

    // Count panels in station queues
    this.stationQueues.forEach((queue, stationId) => {
      queueCounts[stationId] = queue.length;
    });

    return {
      totalPanels,
      stateCounts,
      queueCounts,
      timestamp: new Date()
    };
  }

  /**
   * Reset workflow state machine
   */
  reset() {
    this.panels.clear();
    this.stationQueues.clear();
    this.transitionHistory.clear();
    this.removeAllListeners();
  }
}

// Create and export singleton instance
const workflowStateMachine = new WorkflowStateMachine();
export default workflowStateMachine;
