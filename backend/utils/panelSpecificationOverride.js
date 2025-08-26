// Panel Specification Override System
// Allows manual correction and specification of panel attributes when barcodes are damaged/incorrect

import { BARCODE_CONFIG, BarcodeError } from './barcodeProcessor.js';

/**
 * Panel specification configuration with manual override support
 */
export const PANEL_SPECIFICATION_CONFIG = {
  // Nominal wattage ranges for each panel type
  WATTAGE_RANGES: {
    '36': { min: 180, max: 220, nominal: 200 },
    '40': { min: 200, max: 240, nominal: 220 },
    '60': { min: 280, max: 340, nominal: 310 },
    '72': { min: 350, max: 420, nominal: 385 },
    '144': { min: 500, max: 600, nominal: 550 }
  },

  // Panel construction types
  CONSTRUCTION_TYPES: {
    BIFACIAL: 'bifacial',
    MONOFACIAL: 'monofacial'
  },

  // Frame color options
  FRAME_COLORS: {
    SILVER: 'silver',
    BLACK: 'black',
    WHITE: 'white',
    CLEAR: 'clear'
  },

  // Valid production years (expandable)
  VALID_YEARS: (() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = 2020; year <= currentYear + 5; year++) {
      years.push(year.toString());
    }
    return years;
  })(),

  // Quality grades
  QUALITY_GRADES: {
    GRADE_A: 'A',
    GRADE_B: 'B',
    GRADE_C: 'C'
  }
};

/**
 * Enhanced panel specification with override capabilities
 */
export class PanelSpecification {
  constructor(options = {}) {
    this.barcode = options.barcode || null;
    this.manualOverride = options.manualOverride || false;
    this.overrideReason = options.overrideReason || null;
    this.overrideBy = options.overrideBy || null; // User ID who made the override
    this.overrideTimestamp = options.manualOverride ? new Date().toISOString() : null;
    
    // Panel specifications (can be overridden)
    this.panelType = options.panelType || null;
    this.nominalWattage = options.nominalWattage || null;
    this.constructionType = options.constructionType || PANEL_SPECIFICATION_CONFIG.CONSTRUCTION_TYPES.MONOFACIAL;
    this.frameColor = options.frameColor || PANEL_SPECIFICATION_CONFIG.FRAME_COLORS.SILVER;
    this.productionYear = options.productionYear || null;
    this.qualityGrade = options.qualityGrade || PANEL_SPECIFICATION_CONFIG.QUALITY_GRADES.GRADE_A;
    
    // Manufacturing details
    this.factoryCode = options.factoryCode || null;
    this.batchCode = options.batchCode || null;
    this.sequenceNumber = options.sequenceNumber || null;
    
    // Line assignment (derived or overridden)
    this.lineAssignment = options.lineAssignment || null;
    
    // Additional metadata
    this.specialInstructions = options.specialInstructions || null;
    this.qcNotes = options.qcNotes || null;
  }

  /**
   * Create specification from barcode with override options
   */
  static fromBarcodeWithOverrides(barcodeResult, overrides = {}) {
    if (!barcodeResult || !barcodeResult.success) {
      throw new BarcodeError('Invalid barcode result for specification creation', 'INVALID_BARCODE_RESULT');
    }

    const components = barcodeResult.components;
    const lineAssignment = barcodeResult.lineAssignment;

    // Base specification from barcode
    const baseSpec = {
      barcode: components.raw,
      panelType: components.panelType,
      productionYear: `20${components.year}`, // Convert YY to full year
      factoryCode: components.factory,
      batchCode: components.batch,
      sequenceNumber: parseInt(components.sequence),
      lineAssignment,
      nominalWattage: PANEL_SPECIFICATION_CONFIG.WATTAGE_RANGES[components.panelType]?.nominal
    };

    // Apply any manual overrides
    const finalSpec = { ...baseSpec, ...overrides };

    // Mark as manual override if any overrides provided
    if (Object.keys(overrides).length > 0) {
      finalSpec.manualOverride = true;
      finalSpec.overrideTimestamp = new Date().toISOString();
    }

    return new PanelSpecification(finalSpec);
  }

  /**
   * Create specification with full manual input (for damaged/missing barcodes)
   */
  static createManualSpecification(specification, metadata = {}) {
    const spec = new PanelSpecification({
      ...specification,
      manualOverride: true,
      overrideReason: metadata.reason || 'Manual specification - damaged/missing barcode',
      overrideBy: metadata.userId,
      overrideTimestamp: new Date().toISOString()
    });

    // Validate manual specification
    const validation = spec.validate();
    if (!validation.isValid) {
      throw new BarcodeError(
        `Manual specification validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
        'MANUAL_SPECIFICATION_INVALID'
      );
    }

    return spec;
  }

  /**
   * Validate the complete panel specification
   */
  validate() {
    const errors = [];

    // Validate panel type
    if (!this.panelType || !BARCODE_CONFIG.VALID_PANEL_TYPES.includes(this.panelType)) {
      errors.push({
        field: 'panelType',
        message: `Invalid panel type: ${this.panelType}. Valid types: ${BARCODE_CONFIG.VALID_PANEL_TYPES.join(', ')}`,
        code: 'INVALID_PANEL_TYPE'
      });
    }

    // Validate nominal wattage
    if (this.panelType && this.nominalWattage) {
      const wattageRange = PANEL_SPECIFICATION_CONFIG.WATTAGE_RANGES[this.panelType];
      if (wattageRange && (this.nominalWattage < wattageRange.min || this.nominalWattage > wattageRange.max)) {
        errors.push({
          field: 'nominalWattage',
          message: `Wattage ${this.nominalWattage}W is outside valid range for ${this.panelType}-cell panels (${wattageRange.min}-${wattageRange.max}W)`,
          code: 'INVALID_WATTAGE_RANGE'
        });
      }
    }

    // Validate construction type
    if (this.constructionType && !Object.values(PANEL_SPECIFICATION_CONFIG.CONSTRUCTION_TYPES).includes(this.constructionType)) {
      errors.push({
        field: 'constructionType',
        message: `Invalid construction type: ${this.constructionType}`,
        code: 'INVALID_CONSTRUCTION_TYPE'
      });
    }

    // Validate frame color
    if (this.frameColor && !Object.values(PANEL_SPECIFICATION_CONFIG.FRAME_COLORS).includes(this.frameColor)) {
      errors.push({
        field: 'frameColor',
        message: `Invalid frame color: ${this.frameColor}`,
        code: 'INVALID_FRAME_COLOR'
      });
    }

    // Validate production year
    if (this.productionYear && !PANEL_SPECIFICATION_CONFIG.VALID_YEARS.includes(this.productionYear.toString())) {
      errors.push({
        field: 'productionYear',
        message: `Invalid production year: ${this.productionYear}`,
        code: 'INVALID_PRODUCTION_YEAR'
      });
    }

    // Validate quality grade
    if (this.qualityGrade && !Object.values(PANEL_SPECIFICATION_CONFIG.QUALITY_GRADES).includes(this.qualityGrade)) {
      errors.push({
        field: 'qualityGrade',
        message: `Invalid quality grade: ${this.qualityGrade}`,
        code: 'INVALID_QUALITY_GRADE'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedAt: new Date().toISOString()
    };
  }

  /**
   * Determine or update line assignment based on panel type
   */
  updateLineAssignment() {
    if (!this.panelType) {
      throw new BarcodeError('Panel type required for line assignment', 'MISSING_PANEL_TYPE');
    }

    // Use existing line assignment logic
    if (BARCODE_CONFIG.LINE_ASSIGNMENTS.LINE_1.includes(this.panelType)) {
      this.lineAssignment = {
        lineNumber: 1,
        lineName: 'LINE_1',
        panelType: this.panelType,
        stationRange: [1, 2, 3, 4],
        isValid: true,
        assignedAt: new Date().toISOString()
      };
    } else if (BARCODE_CONFIG.LINE_ASSIGNMENTS.LINE_2.includes(this.panelType)) {
      this.lineAssignment = {
        lineNumber: 2,
        lineName: 'LINE_2',
        panelType: this.panelType,
        stationRange: [5, 6, 7, 8],
        isValid: true,
        assignedAt: new Date().toISOString()
      };
    } else {
      throw new BarcodeError(
        `Cannot determine line assignment for panel type: ${this.panelType}`,
        'INVALID_PANEL_TYPE_FOR_LINE'
      );
    }

    return this.lineAssignment;
  }

  /**
   * Generate a summary of overrides applied
   */
  getOverrideSummary() {
    if (!this.manualOverride) {
      return { hasOverrides: false };
    }

    return {
      hasOverrides: true,
      overrideReason: this.overrideReason,
      overrideBy: this.overrideBy,
      overrideTimestamp: this.overrideTimestamp,
      fields: this.getOverriddenFields()
    };
  }

  /**
   * Get list of fields that were manually overridden
   */
  getOverriddenFields() {
    // This would be enhanced to track specific field overrides
    // For now, return common override scenarios
    const overriddenFields = [];
    
    if (this.manualOverride) {
      // In a full implementation, you'd track which specific fields were overridden
      overriddenFields.push('Manual specification applied');
    }

    return overriddenFields;
  }

  /**
   * Convert to database-compatible format
   */
  toDatabaseFormat() {
    return {
      barcode: this.barcode,
      panel_type: this.panelType ? `TYPE_${this.panelType}` : null,
      nominal_wattage: this.nominalWattage,
      construction_type: this.constructionType,
      frame_color: this.frameColor,
      production_year: this.productionYear ? parseInt(this.productionYear) : null,
      quality_grade: this.qualityGrade,
      factory_code: this.factoryCode,
      batch_code: this.batchCode,
      sequence_number: this.sequenceNumber,
      line_assignment: this.lineAssignment?.lineName || null,
      manual_override: this.manualOverride,
      override_reason: this.overrideReason,
      override_by: this.overrideBy,
      override_timestamp: this.overrideTimestamp,
      special_instructions: this.specialInstructions,
      qc_notes: this.qcNotes,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Convert to API response format
   */
  toApiFormat() {
    return {
      barcode: this.barcode,
      specification: {
        panelType: this.panelType,
        nominalWattage: this.nominalWattage,
        constructionType: this.constructionType,
        frameColor: this.frameColor,
        productionYear: this.productionYear,
        qualityGrade: this.qualityGrade
      },
      manufacturing: {
        factoryCode: this.factoryCode,
        batchCode: this.batchCode,
        sequenceNumber: this.sequenceNumber,
        lineAssignment: this.lineAssignment
      },
      override: this.getOverrideSummary(),
      metadata: {
        specialInstructions: this.specialInstructions,
        qcNotes: this.qcNotes
      },
      validation: this.validate()
    };
  }
}

/**
 * Helper functions for UI dropdowns and validation
 */
export const SPECIFICATION_HELPERS = {
  getPanelTypeOptions: () => BARCODE_CONFIG.VALID_PANEL_TYPES.map(type => ({
    value: type,
    label: `${type}-cell`,
    nominalWattage: PANEL_SPECIFICATION_CONFIG.WATTAGE_RANGES[type]?.nominal
  })),

  getConstructionTypeOptions: () => Object.entries(PANEL_SPECIFICATION_CONFIG.CONSTRUCTION_TYPES).map(([key, value]) => ({
    value,
    label: key.charAt(0) + key.slice(1).toLowerCase()
  })),

  getFrameColorOptions: () => Object.entries(PANEL_SPECIFICATION_CONFIG.FRAME_COLORS).map(([key, value]) => ({
    value,
    label: key.charAt(0) + key.slice(1).toLowerCase()
  })),

  getQualityGradeOptions: () => Object.entries(PANEL_SPECIFICATION_CONFIG.QUALITY_GRADES).map(([key, value]) => ({
    value,
    label: `Grade ${value}`
  })),

  getWattageRangeForPanelType: (panelType) => PANEL_SPECIFICATION_CONFIG.WATTAGE_RANGES[panelType] || null,

  validateWattageForPanelType: (wattage, panelType) => {
    const range = PANEL_SPECIFICATION_CONFIG.WATTAGE_RANGES[panelType];
    if (!range) return { valid: false, message: 'Invalid panel type' };
    
    if (wattage < range.min || wattage > range.max) {
      return {
        valid: false,
        message: `Wattage must be between ${range.min}W and ${range.max}W for ${panelType}-cell panels`
      };
    }
    
    return { valid: true };
  }
};

export default {
  PanelSpecification,
  PANEL_SPECIFICATION_CONFIG,
  SPECIFICATION_HELPERS
};
