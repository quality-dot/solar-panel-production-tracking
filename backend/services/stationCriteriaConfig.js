/**
 * Station-Specific Criteria Configuration Service
 * Manages dynamic criteria configuration for each station and production line
 */

import { EventEmitter } from 'events';

// Default station configurations
export const DEFAULT_STATION_CONFIGS = {
  STATION_1: {
    id: 'STATION_1',
    name: 'Assembly & EL',
    description: 'Electrical testing and assembly validation',
    line: 'BOTH', // Both lines use this station
    criteria: {
      pass: [
        { id: 'el_test_passed', label: 'EL test passed', required: true, lineSpecific: false },
        { id: 'assembly_complete', label: 'Assembly complete', required: true, lineSpecific: false },
        { id: 'no_visible_defects', label: 'No visible defects', required: true, lineSpecific: false },
        { id: 'electrical_continuity', label: 'Electrical continuity verified', required: true, lineSpecific: false }
      ],
      fail: [
        { id: 'el_test_failed', label: 'EL test failed', required: true, notesRequired: true, lineSpecific: false },
        { id: 'assembly_incomplete', label: 'Assembly incomplete', required: true, notesRequired: true, lineSpecific: false },
        { id: 'visible_defects', label: 'Visible defects found', required: true, notesRequired: true, lineSpecific: false },
        { id: 'electrical_continuity_failed', label: 'Electrical continuity failed', required: true, notesRequired: true, lineSpecific: false },
        { id: 'component_missing', label: 'Component missing', required: true, notesRequired: true, lineSpecific: false },
        { id: 'other', label: 'Other', required: false, notesRequired: true, lineSpecific: false }
      ]
    },
    lineSpecificCriteria: {
      LINE_1: {
        // Line 1 specific (36, 40, 60, 72 panels)
        additionalPass: [],
        additionalFail: []
      },
      LINE_2: {
        // Line 2 specific (144 panels)
        additionalPass: [
          { id: 'large_panel_handling', label: 'Large panel handling verified', required: true, lineSpecific: true }
        ],
        additionalFail: [
          { id: 'large_panel_handling_failed', label: 'Large panel handling issues', required: true, notesRequired: true, lineSpecific: true }
        ]
      }
    },
    qualityThresholds: {
      elTestThreshold: 0.95,
      assemblyThreshold: 0.98,
      maxDefects: 0
    },
    autoPass: false,
    requiresOperatorConfirmation: true
  },

  STATION_2: {
    id: 'STATION_2',
    name: 'Framing',
    description: 'Frame assembly and structural validation',
    line: 'BOTH',
    criteria: {
      pass: [
        { id: 'frame_properly_assembled', label: 'Frame properly assembled', required: true, lineSpecific: false },
        { id: 'no_frame_damage', label: 'No frame damage', required: true, lineSpecific: false },
        { id: 'corner_joints_secure', label: 'Corner joints secure', required: true, lineSpecific: false },
        { id: 'frame_alignment_correct', label: 'Frame alignment correct', required: true, lineSpecific: false }
      ],
      fail: [
        { id: 'frame_misaligned', label: 'Frame misaligned', required: true, notesRequired: true, lineSpecific: false },
        { id: 'frame_damage', label: 'Frame damage detected', required: true, notesRequired: true, lineSpecific: false },
        { id: 'loose_corner_joints', label: 'Loose corner joints', required: true, notesRequired: true, lineSpecific: false },
        { id: 'missing_frame_components', label: 'Missing frame components', required: true, notesRequired: true, lineSpecific: false },
        { id: 'frame_warping', label: 'Frame warping', required: true, notesRequired: true, lineSpecific: false },
        { id: 'other', label: 'Other', required: false, notesRequired: true, lineSpecific: false }
      ]
    },
    lineSpecificCriteria: {
      LINE_1: {
        // Line 1 specific - Mirror examination for smaller panels
        additionalPass: [
          { id: 'mirror_examination_passed', label: 'Mirror examination passed', required: true, lineSpecific: true }
        ],
        additionalFail: [
          { id: 'mirror_examination_failed', label: 'Mirror examination failed', required: true, notesRequired: true, lineSpecific: true }
        ]
      },
      LINE_2: {
        // Line 2 specific - Large panel handling
        additionalPass: [
          { id: 'large_panel_handling_verified', label: 'Large panel handling verified', required: true, lineSpecific: true }
        ],
        additionalFail: [
          { id: 'large_panel_handling_issues', label: 'Large panel handling issues', required: true, notesRequired: true, lineSpecific: true }
        ]
      }
    },
    qualityThresholds: {
      frameAlignmentThreshold: 0.02, // 2mm tolerance
      frameDamageThreshold: 0, // No damage allowed
      cornerJointThreshold: 0.98 // 98% secure joints required
    },
    autoPass: false,
    requiresOperatorConfirmation: true
  },

  STATION_3: {
    id: 'STATION_3',
    name: 'Junction Box',
    description: 'Junction box installation and wiring validation',
    line: 'BOTH',
    criteria: {
      pass: [
        { id: 'junction_box_properly_installed', label: 'Junction box properly installed', required: true, lineSpecific: false },
        { id: 'wiring_correctly_connected', label: 'Wiring correctly connected', required: true, lineSpecific: false },
        { id: 'sealing_complete', label: 'Sealing complete', required: true, lineSpecific: false },
        { id: 'no_electrical_shorts', label: 'No electrical shorts', required: true, lineSpecific: false }
      ],
      fail: [
        { id: 'junction_box_misaligned', label: 'Junction box misaligned', required: true, notesRequired: true, lineSpecific: false },
        { id: 'wiring_disconnected', label: 'Wiring disconnected', required: true, notesRequired: true, lineSpecific: false },
        { id: 'incomplete_sealing', label: 'Incomplete sealing', required: true, notesRequired: true, lineSpecific: false },
        { id: 'electrical_short_detected', label: 'Electrical short detected', required: true, notesRequired: true, lineSpecific: false },
        { id: 'missing_components', label: 'Missing components', required: true, notesRequired: true, lineSpecific: false },
        { id: 'other', label: 'Other', required: false, notesRequired: true, lineSpecific: false }
      ]
    },
    lineSpecificCriteria: {
      LINE_1: {
        additionalPass: [],
        additionalFail: []
      },
      LINE_2: {
        additionalPass: [
          { id: 'large_panel_wiring_verified', label: 'Large panel wiring verified', required: true, lineSpecific: true }
        ],
        additionalFail: [
          { id: 'large_panel_wiring_issues', label: 'Large panel wiring issues', required: true, notesRequired: true, lineSpecific: true }
        ]
      }
    },
    qualityThresholds: {
      junctionBoxAlignmentThreshold: 0.05, // 5mm tolerance
      wiringThreshold: 0.99, // 99% connection success required
      sealingThreshold: 0.98 // 98% sealing completion required
    },
    autoPass: false,
    requiresOperatorConfirmation: true
  },

  STATION_4: {
    id: 'STATION_4',
    name: 'Performance & Final Inspection',
    description: 'Final performance testing and quality validation',
    line: 'BOTH',
    criteria: {
      pass: [
        { id: 'performance_within_specifications', label: 'Performance within specifications', required: true, lineSpecific: false },
        { id: 'visual_inspection_passed', label: 'Visual inspection passed', required: true, lineSpecific: false },
        { id: 'all_tests_completed', label: 'All tests completed', required: true, lineSpecific: false },
        { id: 'quality_standards_met', label: 'Quality standards met', required: true, lineSpecific: false }
      ],
      fail: [
        { id: 'performance_below_specifications', label: 'Performance below specifications', required: true, notesRequired: true, lineSpecific: false },
        { id: 'visual_defects_found', label: 'Visual defects found', required: true, notesRequired: true, lineSpecific: false },
        { id: 'test_failures', label: 'Test failures', required: true, notesRequired: true, lineSpecific: false },
        { id: 'quality_standards_not_met', label: 'Quality standards not met', required: true, notesRequired: true, lineSpecific: false },
        { id: 'calibration_issues', label: 'Calibration issues', required: true, notesRequired: true, lineSpecific: false },
        { id: 'other', label: 'Other', required: false, notesRequired: true, lineSpecific: false }
      ]
    },
    lineSpecificCriteria: {
      LINE_1: {
        // Line 1 specific - Second EL test for smaller panels
        additionalPass: [
          { id: 'second_el_test_passed', label: 'Second EL test passed', required: true, lineSpecific: true }
        ],
        additionalFail: [
          { id: 'second_el_test_failed', label: 'Second EL test failed', required: true, notesRequired: true, lineSpecific: true }
        ]
      },
      LINE_2: {
        // Line 2 specific - Extended performance testing
        additionalPass: [
          { id: 'extended_performance_testing_passed', label: 'Extended performance testing passed', required: true, lineSpecific: true }
        ],
        additionalFail: [
          { id: 'extended_performance_testing_failed', label: 'Extended performance testing failed', required: true, notesRequired: true, lineSpecific: true }
        ]
      }
    },
    qualityThresholds: {
      performanceThreshold: 0.95, // 95% of specification required
      visualThreshold: 0.98, // 98% visual quality required
      testCompletionThreshold: 1.0 // 100% test completion required
    },
    autoPass: false,
    requiresOperatorConfirmation: true
  }
};

/**
 * Station Criteria Configuration Service
 * Manages dynamic station criteria and line-specific configurations
 */
export class StationCriteriaConfigService extends EventEmitter {
  constructor() {
    super();
    this.stationConfigs = new Map();
    this.customConfigs = new Map();
    this.databaseConfigs = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the service with default configurations
   * @param {Object} customConfigs - Custom station configurations
   * @param {Object} databaseConfigs - Database-loaded configurations
   */
  async initialize(customConfigs = {}, databaseConfigs = {}) {
    // Load default configurations
    Object.entries(DEFAULT_STATION_CONFIGS).forEach(([stationId, config]) => {
      this.stationConfigs.set(stationId, { ...config });
    });

    // Apply custom configurations
    Object.entries(customConfigs).forEach(([stationId, config]) => {
      this.customConfigs.set(stationId, config);
      this.updateStationConfig(stationId, config);
    });

    // Apply database configurations
    Object.entries(databaseConfigs).forEach(([stationId, config]) => {
      this.databaseConfigs.set(stationId, config);
      this.updateStationConfig(stationId, config);
    });

    this.initialized = true;
    this.emit('initialized', { timestamp: new Date() });
  }

  /**
   * Get complete station configuration for a specific line
   * @param {string} stationId - Station identifier
   * @param {string} line - Production line (LINE_1 or LINE_2)
   * @returns {Object} Complete station configuration
   */
  getStationConfig(stationId, line = 'LINE_1') {
    if (!this.initialized) {
      throw new Error('StationCriteriaConfigService not initialized');
    }

    const baseConfig = this.stationConfigs.get(stationId);
    if (!baseConfig) {
      return null;
    }

    // Get line-specific criteria
    const lineSpecific = baseConfig.lineSpecificCriteria?.[line] || {};
    
    // Combine base criteria with line-specific criteria
    const combinedConfig = {
      ...baseConfig,
      criteria: {
        pass: [
          ...(baseConfig.criteria.pass || []),
          ...(lineSpecific.additionalPass || [])
        ],
        fail: [
          ...(baseConfig.criteria.fail || []),
          ...(lineSpecific.additionalFail || [])
        ]
      },
      lineSpecificCriteria: lineSpecific
    };

    return combinedConfig;
  }

  /**
   * Get all station configurations for a specific line
   * @param {string} line - Production line
   * @returns {Object} All station configurations
   */
  getAllStationConfigs(line = 'LINE_1') {
    const configs = {};
    Object.keys(DEFAULT_STATION_CONFIGS).forEach(stationId => {
      configs[stationId] = this.getStationConfig(stationId, line);
    });
    return configs;
  }

  /**
   * Get criteria for a specific station and line
   * @param {string} stationId - Station identifier
   * @param {string} line - Production line
   * @param {string} type - Criteria type ('pass' or 'fail')
   * @returns {Array} Array of criteria
   */
  getCriteria(stationId, line = 'LINE_1', type = 'pass') {
    const config = this.getStationConfig(stationId, line);
    if (!config || !config.criteria) {
      return [];
    }

    return config.criteria[type] || [];
  }

  /**
   * Get pass criteria for a station and line
   * @param {string} stationId - Station identifier
   * @param {string} line - Production line
   * @returns {Array} Array of pass criteria
   */
  getPassCriteria(stationId, line = 'LINE_1') {
    return this.getCriteria(stationId, line, 'pass');
  }

  /**
   * Get fail criteria for a station and line
   * @param {string} stationId - Station identifier
   * @param {string} line - Production line
   * @returns {Array} Array of fail criteria
   */
  getFailCriteria(stationId, line = 'LINE_1') {
    return this.getCriteria(stationId, line, 'fail');
  }

  /**
   * Get required criteria for a station and line
   * @param {string} stationId - Station identifier
   * @param {string} line - Production line
   * @returns {Array} Array of required criteria
   */
  getRequiredCriteria(stationId, line = 'LINE_1') {
    const passCriteria = this.getPassCriteria(stationId, line);
    const failCriteria = this.getFailCriteria(stationId, line);
    
    return [
      ...passCriteria.filter(c => c.required),
      ...failCriteria.filter(c => c.required)
    ];
  }

  /**
   * Get criteria that require notes for a station and line
   * @param {string} stationId - Station identifier
   * @param {string} line - Production line
   * @returns {Array} Array of criteria requiring notes
   */
  getCriteriaRequiringNotes(stationId, line = 'LINE_1') {
    const failCriteria = this.getFailCriteria(stationId, line);
    return failCriteria.filter(c => c.notesRequired);
  }

  /**
   * Check if criteria selection is valid for a station and line
   * @param {string} stationId - Station identifier
   * @param {string} line - Production line
   * @param {Array} selectedCriteria - Selected criteria IDs
   * @param {string} decision - Decision type (PASS/FAIL)
   * @returns {Object} Validation result
   */
  validateCriteriaSelection(stationId, line, selectedCriteria, decision) {
    const config = this.getStationConfig(stationId, line);
    if (!config) {
      return { valid: false, error: 'Station configuration not found' };
    }

    if (decision === 'PASS') {
      // For PASS, criteria selection is optional but recommended
      if (selectedCriteria.length === 0) {
        return { valid: true, warning: 'No criteria selected for PASS decision' };
      }
      
      // Validate that selected criteria are valid pass criteria
      const validPassCriteria = config.criteria.pass.map(c => c.id);
      const invalidCriteria = selectedCriteria.filter(c => !validPassCriteria.includes(c));
      
      if (invalidCriteria.length > 0) {
        return { 
          valid: false, 
          error: `Invalid pass criteria selected: ${invalidCriteria.join(', ')}` 
        };
      }
    } else if (decision === 'FAIL') {
      // For FAIL, criteria selection is required
      if (selectedCriteria.length === 0) {
        return { valid: false, error: 'Criteria selection is required for FAIL decision' };
      }
      
      // Validate that selected criteria are valid fail criteria
      const validFailCriteria = config.criteria.fail.map(c => c.id);
      const invalidCriteria = selectedCriteria.filter(c => !validFailCriteria.includes(c));
      
      if (invalidCriteria.length > 0) {
        return { 
          valid: false, 
          error: `Invalid fail criteria selected: ${invalidCriteria.join(', ')}` 
        };
      }
    }

    return { valid: true };
  }

  /**
   * Update station configuration
   * @param {string} stationId - Station identifier
   * @param {Object} config - New configuration
   */
  updateStationConfig(stationId, config) {
    if (!this.stationConfigs.has(stationId)) {
      throw new Error(`Station not found: ${stationId}`);
    }

    const currentConfig = this.stationConfigs.get(stationId);
    const updatedConfig = this.mergeConfigs(currentConfig, config);
    
    this.stationConfigs.set(stationId, updatedConfig);
    
    this.emit('stationConfigUpdated', { 
      stationId, 
      config: updatedConfig, 
      timestamp: new Date() 
    });
  }

  /**
   * Merge configurations with proper deep merging
   * @param {Object} baseConfig - Base configuration
   * @param {Object} newConfig - New configuration to merge
   * @returns {Object} Merged configuration
   */
  mergeConfigs(baseConfig, newConfig) {
    const merged = { ...baseConfig };
    
    Object.entries(newConfig).forEach(([key, value]) => {
      if (key === 'criteria' && value && typeof value === 'object') {
        merged.criteria = {
          pass: [...(merged.criteria?.pass || []), ...(value.pass || [])],
          fail: [...(merged.criteria?.fail || []), ...(value.fail || [])]
        };
      } else if (key === 'lineSpecificCriteria' && value && typeof value === 'object') {
        merged.lineSpecificCriteria = { ...merged.lineSpecificCriteria, ...value };
      } else if (key === 'qualityThresholds' && value && typeof value === 'object') {
        merged.qualityThresholds = { ...merged.qualityThresholds, ...value };
      } else {
        merged[key] = value;
      }
    });
    
    return merged;
  }

  /**
   * Load configuration from database
   * @param {Object} databaseConfig - Database configuration data
   */
  async loadFromDatabase(databaseConfig) {
    Object.entries(databaseConfig).forEach(([stationId, config]) => {
      this.databaseConfigs.set(stationId, config);
      this.updateStationConfig(stationId, config);
    });
    
    this.emit('databaseConfigLoaded', { 
      configs: databaseConfig, 
      timestamp: new Date() 
    });
  }

  /**
   * Get configuration summary for all stations
   * @param {string} line - Production line
   * @returns {Object} Configuration summary
   */
  getConfigurationSummary(line = 'LINE_1') {
    const summary = {};
    
    Object.keys(DEFAULT_STATION_CONFIGS).forEach(stationId => {
      const config = this.getStationConfig(stationId, line);
      if (config) {
        summary[stationId] = {
          name: config.name,
          description: config.description,
          passCriteriaCount: config.criteria.pass.length,
          failCriteriaCount: config.criteria.fail.length,
          requiredCriteriaCount: this.getRequiredCriteria(stationId, line).length,
          notesRequiredCount: this.getCriteriaRequiringNotes(stationId, line).length,
          autoPass: config.autoPass,
          requiresOperatorConfirmation: config.requiresOperatorConfirmation
        };
      }
    });
    
    return summary;
  }

  /**
   * Reset to default configurations
   */
  resetToDefaults() {
    this.stationConfigs.clear();
    this.customConfigs.clear();
    this.databaseConfigs.clear();
    
    Object.entries(DEFAULT_STATION_CONFIGS).forEach(([stationId, config]) => {
      this.stationConfigs.set(stationId, { ...config });
    });
    
    this.emit('resetToDefaults', { timestamp: new Date() });
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      totalStations: this.stationConfigs.size,
      customConfigs: this.customConfigs.size,
      databaseConfigs: this.databaseConfigs.size,
      timestamp: new Date()
    };
  }
}

// Create and export singleton instance
const stationCriteriaConfigService = new StationCriteriaConfigService();
export default stationCriteriaConfigService;
