/**
 * Pass/Fail Validation Engine for Solar Panel Production
 * Handles station-specific criteria validation and pass/fail decision logic
 */

import { EventEmitter } from 'events';

// Validation result types
export const VALIDATION_RESULTS = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  REWORK: 'REWORK',
  QUARANTINE: 'QUARANTINE'
};

// Station-specific validation criteria
export const STATION_CRITERIA = {
  STATION_1: {
    name: 'Assembly & EL',
    description: 'Electrical testing and assembly validation',
    passCriteria: [
      'EL test passed',
      'Assembly complete',
      'No visible defects',
      'Electrical continuity verified'
    ],
    failCriteria: [
      'EL test failed',
      'Assembly incomplete',
      'Visible defects found',
      'Electrical continuity failed',
      'Component missing',
      'Other'
    ],
    requiredNotes: ['EL test failed', 'Assembly incomplete', 'Visible defects found', 'Electrical continuity failed', 'Component missing'],
    autoPass: false
  },
  STATION_2: {
    name: 'Framing',
    description: 'Frame assembly and structural validation',
    passCriteria: [
      'Frame properly assembled',
      'No frame damage',
      'Corner joints secure',
      'Frame alignment correct'
    ],
    failCriteria: [
      'Frame misaligned',
      'Frame damage detected',
      'Loose corner joints',
      'Missing frame components',
      'Frame warping',
      'Other'
    ],
    requiredNotes: ['Frame misaligned', 'Frame damage detected', 'Loose corner joints', 'Missing frame components', 'Frame warping'],
    autoPass: false
  },
  STATION_3: {
    name: 'Junction Box',
    description: 'Junction box installation and wiring validation',
    passCriteria: [
      'Junction box properly installed',
      'Wiring correctly connected',
      'Sealing complete',
      'No electrical shorts'
    ],
    failCriteria: [
      'Junction box misaligned',
      'Wiring disconnected',
      'Incomplete sealing',
      'Electrical short detected',
      'Missing components',
      'Other'
    ],
    requiredNotes: ['Junction box misaligned', 'Wiring disconnected', 'Incomplete sealing', 'Electrical short detected', 'Missing components'],
    autoPass: false
  },
  STATION_4: {
    name: 'Performance & Final Inspection',
    description: 'Final performance testing and quality validation',
    passCriteria: [
      'Performance within specifications',
      'Visual inspection passed',
      'All tests completed',
      'Quality standards met'
    ],
    failCriteria: [
      'Performance below specifications',
      'Visual defects found',
      'Test failures',
      'Quality standards not met',
      'Calibration issues',
      'Other'
    ],
    requiredNotes: ['Performance below specifications', 'Visual defects found', 'Test failures', 'Quality standards not met', 'Calibration issues'],
    autoPass: false
  }
};

// Line-specific criteria differences
export const LINE_SPECIFIC_CRITERIA = {
  LINE_1: {
    // Line 1 specific criteria (36, 40, 60, 72 panels)
    STATION_2: {
      additionalCriteria: ['Mirror examination passed'],
      additionalFailCriteria: ['Mirror examination failed']
    },
    STATION_4: {
      additionalCriteria: ['Second EL test passed'],
      additionalFailCriteria: ['Second EL test failed']
    }
  },
  LINE_2: {
    // Line 2 specific criteria (144 panels)
    STATION_2: {
      additionalCriteria: ['Large panel handling verified'],
      additionalFailCriteria: ['Large panel handling issues']
    },
    STATION_4: {
      additionalCriteria: ['Extended performance testing passed'],
      additionalFailCriteria: ['Extended performance testing failed']
    }
  }
};

/**
 * Validation Engine Class
 * Manages pass/fail validation logic and criteria enforcement
 */
export class ValidationEngine extends EventEmitter {
  constructor() {
    super();
    this.validationHistory = new Map(); // panelId -> validationHistory[]
    this.stationConfigs = new Map(); // stationId -> stationConfig
    this.qualityThresholds = new Map(); // stationId -> thresholds
  }

  /**
   * Initialize validation engine with station configurations
   * @param {Object} customConfigs - Custom station configurations
   */
  initialize(customConfigs = {}) {
    // Load default station configurations
    Object.entries(STATION_CRITERIA).forEach(([stationId, config]) => {
      this.stationConfigs.set(stationId, { ...config });
    });

    // Apply custom configurations
    Object.entries(customConfigs).forEach(([stationId, config]) => {
      if (this.stationConfigs.has(stationId)) {
        this.stationConfigs.set(stationId, { ...this.stationConfigs.get(stationId), ...config });
      }
    });

    // Set default quality thresholds
    this.setDefaultQualityThresholds();

    this.emit('initialized', { timestamp: new Date() });
  }

  /**
   * Set default quality thresholds for each station
   */
  setDefaultQualityThresholds() {
    this.qualityThresholds.set('STATION_1', {
      elTestThreshold: 0.95, // 95% pass rate required
      assemblyThreshold: 0.98, // 98% completion required
      maxDefects: 0
    });

    this.qualityThresholds.set('STATION_2', {
      frameAlignmentThreshold: 0.02, // 2mm tolerance
      frameDamageThreshold: 0, // No damage allowed
      cornerJointThreshold: 0.98 // 98% secure joints required
    });

    this.qualityThresholds.set('STATION_3', {
      junctionBoxAlignmentThreshold: 0.05, // 5mm tolerance
      wiringThreshold: 0.99, // 99% connection success required
      sealingThreshold: 0.98 // 98% sealing completion required
    });

    this.qualityThresholds.set('STATION_4', {
      performanceThreshold: 0.95, // 95% of specification required
      visualThreshold: 0.98, // 98% visual quality required
      testCompletionThreshold: 1.0 // 100% test completion required
    });
  }

  /**
   * Validate panel at a specific station
   * @param {string} panelId - Panel identifier
   * @param {string} stationId - Station identifier
   * @param {string} line - Production line (LINE_1 or LINE_2)
   * @param {Object} validationData - Validation data from station
   * @returns {Object} Validation result
   */
  validatePanel(panelId, stationId, line, validationData) {
    const stationConfig = this.stationConfigs.get(stationId);
    if (!stationConfig) {
      throw new Error(`Station configuration not found: ${stationId}`);
    }

    const {
      decision,
      selectedCriteria = [],
      notes = '',
      measurements = {},
      images = [],
      operatorId
    } = validationData;

    // Validate decision
    if (![VALIDATION_RESULTS.PASS, VALIDATION_RESULTS.FAIL, VALIDATION_RESULTS.REWORK, VALIDATION_RESULTS.QUARANTINE].includes(decision)) {
      throw new Error(`Invalid validation decision: ${decision}`);
    }

    // Validate criteria selection
    const validationResult = this.validateCriteriaSelection(stationId, decision, selectedCriteria, notes);
    
    if (!validationResult.valid) {
      return {
        ...validationResult,
        decision: null,
        requiresCorrection: true
      };
    }

    // Create validation result
    const result = {
      panelId,
      stationId,
      line,
      decision,
      selectedCriteria,
      notes,
      measurements,
      images,
      operatorId,
      timestamp: new Date(),
      validationId: this.generateValidationId(),
      qualityScore: this.calculateQualityScore(stationId, decision, selectedCriteria, measurements),
      metadata: {
        stationName: stationConfig.name,
        stationDescription: stationConfig.description,
        criteriaCount: selectedCriteria.length,
        hasNotes: notes.trim().length > 0
      }
    };

    // Log validation
    this.logValidation(panelId, result);

    // Emit validation event
    this.emit('panelValidated', result);

    return result;
  }

  /**
   * Validate criteria selection and notes requirements
   * @param {string} stationId - Station identifier
   * @param {string} decision - Validation decision
   * @param {Array} selectedCriteria - Selected criteria
   * @param {string} notes - Notes provided
   * @returns {Object} Validation result
   */
  validateCriteriaSelection(stationId, decision, selectedCriteria, notes) {
    const stationConfig = this.stationConfigs.get(stationId);
    
    if (decision === VALIDATION_RESULTS.PASS) {
      // For PASS, criteria selection is optional but recommended
      if (selectedCriteria.length === 0) {
        return {
          valid: true,
          warning: 'No criteria selected for PASS decision'
        };
      }
    } else if (decision === VALIDATION_RESULTS.FAIL) {
      // For FAIL, criteria selection is required
      if (selectedCriteria.length === 0) {
        return {
          valid: false,
          error: 'Criteria selection is required for FAIL decision'
        };
      }

      // Check if selected criteria require notes
      const criteriaRequiringNotes = stationConfig.requiredNotes || [];
      const selectedCriteriaRequiringNotes = selectedCriteria.filter(criteria => 
        criteriaRequiringNotes.includes(criteria)
      );

      if (selectedCriteriaRequiringNotes.length > 0 && !notes.trim()) {
        return {
          valid: false,
          error: `Notes are required for selected criteria: ${selectedCriteriaRequiringNotes.join(', ')}`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Calculate quality score based on validation data
   * @param {string} stationId - Station identifier
   * @param {string} decision - Validation decision
   * @param {Array} selectedCriteria - Selected criteria
   * @param {Object} measurements - Measurement data
   * @returns {number} Quality score (0-100)
   */
  calculateQualityScore(stationId, decision, selectedCriteria, measurements) {
    if (decision === VALIDATION_RESULTS.PASS) {
      return 100; // Perfect score for pass
    }

    if (decision === VALIDATION_RESULTS.QUARANTINE) {
      return 0; // Zero score for quarantine
    }

    // Calculate score for FAIL/REWORK based on criteria severity
    const stationConfig = this.stationConfigs.get(stationId);
    const failCriteria = stationConfig.failCriteria || [];
    
    let score = 100;
    const severityPenalties = {
      'EL test failed': 40,
      'Assembly incomplete': 30,
      'Visible defects found': 25,
      'Electrical continuity failed': 35,
      'Component missing': 30,
      'Frame misaligned': 20,
      'Frame damage detected': 35,
      'Loose corner joints': 25,
      'Missing frame components': 30,
      'Frame warping': 30,
      'Junction box misaligned': 20,
      'Wiring disconnected': 35,
      'Incomplete sealing': 25,
      'Electrical short detected': 40,
      'Performance below specifications': 30,
      'Visual defects found': 25,
      'Test failures': 35,
      'Quality standards not met': 30,
      'Calibration issues': 25,
      'Other': 15
    };

    selectedCriteria.forEach(criteria => {
      const penalty = severityPenalties[criteria] || 20;
      score = Math.max(0, score - penalty);
    });

    return Math.round(score);
  }

  /**
   * Get station criteria configuration
   * @param {string} stationId - Station identifier
   * @param {string} line - Production line
   * @returns {Object} Station criteria configuration
   */
  getStationCriteria(stationId, line = 'LINE_1') {
    const baseConfig = this.stationConfigs.get(stationId);
    if (!baseConfig) {
      return null;
    }

    const lineSpecific = LINE_SPECIFIC_CRITERIA[line]?.[stationId] || {};
    
    return {
      ...baseConfig,
      passCriteria: [...(baseConfig.passCriteria || []), ...(lineSpecific.additionalCriteria || [])],
      failCriteria: [...(baseConfig.failCriteria || []), ...(lineSpecific.additionalFailCriteria || [])],
      requiredNotes: [...(baseConfig.requiredNotes || []), ...(lineSpecific.additionalFailCriteria || [])]
    };
  }

  /**
   * Get all station criteria configurations
   * @param {string} line - Production line
   * @returns {Object} All station criteria
   */
  getAllStationCriteria(line = 'LINE_1') {
    const criteria = {};
    Object.keys(STATION_CRITERIA).forEach(stationId => {
      criteria[stationId] = this.getStationCriteria(stationId, line);
    });
    return criteria;
  }

  /**
   * Update station configuration
   * @param {string} stationId - Station identifier
   * @param {Object} config - New configuration
   */
  updateStationConfig(stationId, config) {
    if (this.stationConfigs.has(stationId)) {
      const currentConfig = this.stationConfigs.get(stationId);
      this.stationConfigs.set(stationId, { ...currentConfig, ...config });
      
      this.emit('stationConfigUpdated', { stationId, config, timestamp: new Date() });
    }
  }

  /**
   * Get validation history for a panel
   * @param {string} panelId - Panel identifier
   * @returns {Array} Validation history
   */
  getValidationHistory(panelId) {
    return this.validationHistory.get(panelId) || [];
  }

  /**
   * Get validation statistics
   * @param {string} stationId - Optional station filter
   * @param {string} line - Optional line filter
   * @returns {Object} Validation statistics
   */
  getValidationStatistics(stationId = null, line = null) {
    const allValidations = Array.from(this.validationHistory.values()).flat();
    
    let filteredValidations = allValidations;
    
    if (stationId) {
      filteredValidations = filteredValidations.filter(v => v.stationId === stationId);
    }
    
    if (line) {
      filteredValidations = filteredValidations.filter(v => v.line === line);
    }

    const total = filteredValidations.length;
    const passCount = filteredValidations.filter(v => v.decision === VALIDATION_RESULTS.PASS).length;
    const failCount = filteredValidations.filter(v => v.decision === VALIDATION_RESULTS.FAIL).length;
    const reworkCount = filteredValidations.filter(v => v.decision === VALIDATION_RESULTS.REWORK).length;
    const quarantineCount = filteredValidations.filter(v => v.decision === VALIDATION_RESULTS.QUARANTINE).length;

    const averageQualityScore = total > 0 
      ? filteredValidations.reduce((sum, v) => sum + (v.qualityScore || 0), 0) / total
      : 0;

    return {
      total,
      passCount,
      failCount,
      reworkCount,
      quarantineCount,
      passRate: total > 0 ? (passCount / total) * 100 : 0,
      failRate: total > 0 ? (failCount / total) * 100 : 0,
      averageQualityScore: Math.round(averageQualityScore * 100) / 100,
      timestamp: new Date()
    };
  }

  /**
   * Log validation for audit trail
   * @param {string} panelId - Panel identifier
   * @param {Object} validationResult - Validation result
   */
  logValidation(panelId, validationResult) {
    if (!this.validationHistory.has(panelId)) {
      this.validationHistory.set(panelId, []);
    }

    this.validationHistory.get(panelId).push(validationResult);
  }

  /**
   * Generate unique validation ID
   * @returns {string} Unique validation ID
   */
  generateValidationId() {
    return `VAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset validation engine
   */
  reset() {
    this.validationHistory.clear();
    this.stationConfigs.clear();
    this.qualityThresholds.clear();
    this.removeAllListeners();
    this.initialize();
  }
}

// Create and export singleton instance
const validationEngine = new ValidationEngine();
export default validationEngine;
