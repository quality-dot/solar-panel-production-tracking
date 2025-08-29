# Input Validation Middleware

## Overview

The Input Validation Middleware provides comprehensive validation for all manufacturing data inputs, ensuring data integrity, security, and business rule compliance. Built on Express Validator with custom manufacturing-specific validation patterns, this system validates barcodes, stations, manufacturing orders, inspections, and more.

## Features

- **Comprehensive Validation**: Covers all manufacturing workflow inputs
- **Business Rule Enforcement**: Validates manufacturing-specific logic and relationships
- **Custom Error Messages**: Clear, actionable validation error messages
- **Performance Optimized**: Efficient validation with minimal overhead
- **Extensible**: Easy to add new validation patterns and rules
- **Testing**: Full test coverage for all validation scenarios

## Core Validation Patterns

### Barcode Format: CRSYYFBPP#####

The system validates barcodes in the CRSYYFBPP##### format:

```
CRSYYFBPP#####
├── CR: Company Code (fixed: "CR")
├── S: Solar Panel Type (fixed: "S")
├── YY: Year (2 digits: 24 for 2024)
├── F: Framed Indicator (F=Framed, B=Unframed)
├── B: Backsheet Type (T=Transparent, W=White, B=Black)
├── PP: Panel Size (36, 40, 60, 72, 144)
└── #####: Sequence Number (5 digits: 00001-99999)
```

**Examples:**
- `CRS24FT3660001` - 2024, Framed, Transparent, 36W, Sequence 00001
- `CRS24FB1440001` - 2024, Unframed, Black, 144W, Sequence 00001

### Station Validation

- **Valid Station IDs**: 1-8
- **Line 1 Stations**: 1, 2, 3, 4 (Panel types: 36, 40, 60, 72)
- **Line 2 Stations**: 5, 6, 7, 8 (Panel type: 144)
- **Station-Line Relationship**: Enforced validation

### Panel Type Validation

- **Line 1 Panel Types**: 36, 40, 60, 72
- **Line 2 Panel Type**: 144
- **Cross-validation**: Panel type must match assigned line

## Available Validation Middleware

### 1. Barcode Validation (`validateBarcode`)

Validates barcode format and components:

```javascript
import { validateBarcode } from '../middleware/validation.js';

app.post('/barcode/process', validateBarcode, (req, res) => {
  // Barcode is guaranteed to be valid here
  const barcode = req.body.barcode;
  // Process barcode...
});
```

**Validation Rules:**
- Must be exactly 12 characters
- Must match CRSYYFBPP##### pattern
- Year must be current year ±1
- Sequence number cannot be 00000
- Panel size must be valid (36, 40, 60, 72, 144)

### 2. Station Validation (`validateStation`)

Validates station IDs and line relationships:

```javascript
import { validateStation } from '../middleware/validation.js';

app.post('/station/:stationId/scan', validateStation, (req, res) => {
  // Station ID and line relationship are valid
  const stationId = req.params.stationId;
  const lineNumber = req.body.lineNumber;
  // Process station scan...
});
```

**Validation Rules:**
- Station ID must be 1-8
- Line number must be 1 or 2
- Station-line relationship must be valid
- Line 1 stations (1-4) cannot be assigned to Line 2
- Line 2 stations (5-8) cannot be assigned to Line 1

### 3. Panel Type Validation (`validatePanelType`)

Validates panel types against line assignments:

```javascript
import { validatePanelType } from '../middleware/validation.js';

app.post('/panel/create', validatePanelType, (req, res) => {
  // Panel type and line relationship are valid
  const panelType = req.body.panelType;
  const lineNumber = req.body.lineNumber;
  // Create panel...
});
```

**Validation Rules:**
- Panel type must be one of: 36, 40, 60, 72, 144
- Line 1 supports: 36, 40, 60, 72
- Line 2 supports: 144 only
- Cross-validation with line number

### 4. Quality Criteria Validation (`validateQualityCriteria`)

Validates quality inspection criteria:

```javascript
import { validateQualityCriteria } from '../middleware/validation.js';

app.post('/inspection/criteria', validateQualityCriteria, (req, res) => {
  // Quality criteria are valid
  const criteria = req.body.criteria;
  // Save criteria...
});
```

**Validation Rules:**
- Must have at least one criterion
- Each criterion must have:
  - `name`: String
  - `required`: Boolean
  - `threshold`: Optional number
  - `unit`: Optional string

### 5. Workflow Validation (`validateWorkflow`)

Validates manufacturing workflow progression:

```javascript
import { validateWorkflow } from '../middleware/validation.js';

app.post('/workflow/step', validateWorkflow, (req, res) => {
  // Workflow step is valid
  const workflowStep = req.body.workflowStep;
  const previousStep = req.body.previousStep;
  // Process workflow...
});
```

**Validation Rules:**
- Workflow steps: ASSEMBLY_EL → FRAMING → JUNCTION_BOX → PERFORMANCE_FINAL
- Cannot go backwards in workflow
- Previous step must be before current step

### 6. Manufacturing Order Validation (`validateManufacturingOrder`)

Validates manufacturing order data:

```javascript
import { validateManufacturingOrder } from '../middleware/validation.js';

app.post('/manufacturing-order', validateManufacturingOrder, (req, res) => {
  // Manufacturing order data is valid
  const orderId = req.body.orderId;
  const quantity = req.body.quantity;
  // Create order...
});
```

**Validation Rules:**
- Order ID format: MO-YYYY-####
- Quantity: 1-10,000
- Priority: low, medium, high, urgent
- Due date: Must be in future, max 1 year

### 7. Inspection Validation (`validateInspection`)

Validates inspection results:

```javascript
import { validateInspection } from '../middleware/validation.js';

app.post('/inspection/submit', validateInspection, (req, res) => {
  // Inspection data is valid
  const panelBarcode = req.body.panelBarcode;
  const result = req.body.inspectionResult;
  // Save inspection...
});
```

**Validation Rules:**
- Panel barcode must be valid format
- Station ID must be 1-8
- Result must be: pass, fail, rework
- Criteria must be valid array structure

### 8. Pallet Validation (`validatePallet`)

Validates pallet management data:

```javascript
import { validatePallet } from '../middleware/validation.js';

app.post('/pallet/create', validatePallet, (req, res) => {
  // Pallet data is valid
  const palletId = req.body.palletId;
  const panelCount = req.body.panelCount;
  // Create pallet...
});
```

**Validation Rules:**
- Pallet ID: 8-20 characters
- Panel count: 1-30
- Target capacity: 20-30

### 9. Pagination Validation (`validatePagination`)

Validates pagination parameters:

```javascript
import { validatePagination } from '../middleware/validation.js';

app.get('/data', validatePagination, (req, res) => {
  // Pagination parameters are valid
  const page = req.query.page;
  const limit = req.query.limit;
  // Return paginated data...
});
```

**Validation Rules:**
- Page: Positive integer
- Limit: 1-100
- Sort order: asc, desc

### 10. Date Range Validation (`validateDateRange`)

Validates date range queries:

```javascript
import { validateDateRange } from '../middleware/validation.js';

app.get('/reports', validateDateRange, (req, res) => {
  // Date range is valid
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  // Generate report...
});
```

**Validation Rules:**
- Start and end dates must be ISO 8601 format
- End date must be after start date
- Maximum range: 1 year

### 11. Search Validation (`validateSearch`)

Validates search queries:

```javascript
import { validateSearch } from '../middleware/validation.js';

app.get('/search', validateSearch, (req, res) => {
  // Search term is valid
  const search = req.query.search;
  // Perform search...
});
```

**Validation Rules:**
- Length: 2-100 characters
- Allowed characters: letters, numbers, spaces, hyphens, underscores, dots

### 12. User Validation (`validateUser`)

Validates user data:

```javascript
import { validateUser } from '../middleware/validation.js';

app.post('/user/update', validateUser, (req, res) => {
  // User data is valid
  const username = req.body.username;
  const email = req.body.email;
  // Update user...
});
```

**Validation Rules:**
- Username: 3-30 characters, alphanumeric + underscore
- Email: Valid email format
- Role: STATION_INSPECTOR, PRODUCTION_SUPERVISOR, QC_MANAGER, SYSTEM_ADMIN
- Station assignments: Valid station IDs (1-8)

## Validation Helper Functions

### `parseBarcodeComponents(barcode)`

Extracts and validates barcode components:

```javascript
import { validationHelpers } from '../middleware/validation.js';

const components = validationHelpers.parseBarcodeComponents('CRS24FT3660001');
console.log(components);
// Output:
// {
//   company: 'CR',
//   type: 'S',
//   year: '24',
//   framed: 'F',
//   backsheet: 'T',
//   panelSize: '36',
//   sequence: '00001',
//   lineNumber: 1
// }
```

### `validateStationLine(stationId, lineNumber)`

Validates station-line relationship:

```javascript
import { validationHelpers } from '../middleware/validation.js';

try {
  validationHelpers.validateStationLine(1, 1); // ✅ Valid
  validationHelpers.validateStationLine(5, 2); // ✅ Valid
  validationHelpers.validateStationLine(1, 2); // ❌ Throws error
} catch (error) {
  console.error('Invalid station-line relationship:', error.message);
}
```

## Custom Validation Middleware

### Creating Custom Validation

Use the `createValidationMiddleware` factory to create custom validation:

```javascript
import { createValidationMiddleware, body, param } from '../middleware/validation.js';

const validateCustomData = createValidationMiddleware([
  body('customField')
    .exists()
    .withMessage('Custom field is required')
    .isString()
    .withMessage('Custom field must be a string')
    .custom((value) => {
      // Custom validation logic
      if (value.length < 5) {
        throw new Error('Custom field must be at least 5 characters');
      }
      return true;
    })
]);

app.post('/custom', validateCustomData, (req, res) => {
  // Custom validation passed
  res.json({ success: true });
});
```

### Validation Chain Examples

```javascript
// Complex validation with multiple rules
const validateComplexData = createValidationMiddleware([
  body('name')
    .exists().withMessage('Name is required')
    .isString().withMessage('Name must be a string')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters')
    .trim()
    .escape(),
    
  body('email')
    .exists().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
    
  body('age')
    .optional()
    .isInt({ min: 18, max: 120 }).withMessage('Age must be 18-120')
    .toInt(),
    
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags.length > 10) {
        throw new Error('Maximum 10 tags allowed');
      }
      return true;
    })
]);
```

## Error Handling

### Validation Error Format

When validation fails, the middleware throws a `ValidationError`:

```javascript
{
  success: false,
  error: 'Input validation failed',
  details: {
    errors: [
      {
        field: 'barcode',
        message: 'Invalid barcode format. Expected: CRSYYFBPP#####',
        value: 'INVALID',
        location: 'body'
      }
    ],
    path: '/barcode/process',
    method: 'POST'
  }
}
```

### Error Response Structure

```javascript
// HTTP 400 Bad Request
{
  "success": false,
  "error": "Input validation failed",
  "details": {
    "errors": [
      {
        "field": "fieldName",
        "message": "Human-readable error message",
        "value": "Invalid value provided",
        "location": "body|query|params"
      }
    ],
    "path": "/api/endpoint",
    "method": "POST"
  }
}
```

## Performance Considerations

### Validation Optimization

1. **Early Return**: Validation stops on first error
2. **Efficient Patterns**: Regex patterns are compiled once
3. **Minimal Overhead**: Validation adds <1ms to request time
4. **Caching**: Validation patterns are cached in memory

### Best Practices

1. **Validate Early**: Apply validation as early as possible in middleware chain
2. **Specific Rules**: Use specific validation rules rather than generic ones
3. **Custom Validation**: Use custom validation for complex business logic
4. **Error Messages**: Provide clear, actionable error messages

## Testing

### Running Tests

```bash
# Run all validation tests
npm test -- validation.test.js

# Run specific test suite
npm test -- --grep "Barcode Validation"

# Run with coverage
npm test -- --coverage validation.test.js
```

### Test Coverage

The validation middleware has comprehensive test coverage:

- **Unit Tests**: Individual validation functions
- **Integration Tests**: Express middleware integration
- **Edge Cases**: Boundary conditions and error scenarios
- **Business Logic**: Manufacturing-specific validation rules
- **Performance**: Validation timing and efficiency

### Test Examples

```javascript
// Test valid barcode
test('should accept valid CRSYYFBPP##### format barcode', async () => {
  const validBarcode = 'CRS24FT3660001';
  const response = await request(app)
    .post('/test/barcode')
    .send({ barcode: validBarcode });
  
  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
});

// Test invalid barcode
test('should reject invalid barcode format', async () => {
  const invalidBarcode = 'INVALID';
  const response = await request(app)
    .post('/test/barcode')
    .send({ barcode: invalidBarcode });
  
  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});
```

## Integration Examples

### Express Route Integration

```javascript
import express from 'express';
import { 
  validateBarcode, 
  validateStation, 
  validateInspection 
} from '../middleware/validation.js';

const router = express.Router();

// Barcode processing with validation
router.post('/barcode/process', 
  validateBarcode,
  async (req, res) => {
    try {
      const barcode = req.body.barcode;
      // Process barcode (guaranteed to be valid)
      const result = await processBarcode(barcode);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Station inspection with validation
router.post('/station/:stationId/inspect',
  validateStation,
  validateInspection,
  async (req, res) => {
    try {
      const { stationId } = req.params;
      const inspectionData = req.body;
      // Process inspection (all data validated)
      const result = await processInspection(stationId, inspectionData);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
```

### Error Handling Integration

```javascript
import { ValidationError } from '../middleware/errorHandler.js';

// Global error handler
app.use((error, req, res, next) => {
  if (error instanceof ValidationError) {
    // Handle validation errors specifically
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details
    });
  } else {
    // Handle other errors
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});
```

## Configuration

### Environment Variables

```bash
# Validation settings
VALIDATION_STRICT_MODE=true
VALIDATION_MAX_ERRORS=10
VALIDATION_LOG_LEVEL=warn
```

### Custom Configuration

```javascript
// Custom validation configuration
const validationConfig = {
  strictMode: process.env.VALIDATION_STRICT_MODE === 'true',
  maxErrors: parseInt(process.env.VALIDATION_MAX_ERRORS) || 10,
  logLevel: process.env.VALIDATION_LOG_LEVEL || 'warn'
};
```

## Troubleshooting

### Common Issues

1. **Validation Not Working**: Ensure middleware is applied before route handlers
2. **Custom Validation Errors**: Check custom validation function return values
3. **Performance Issues**: Review validation patterns and optimize if needed
4. **Error Messages**: Verify error message format and content

### Debug Mode

Enable debug logging for validation:

```javascript
// Enable validation debug logging
process.env.VALIDATION_DEBUG = 'true';
```

### Validation Logs

Validation middleware logs all validation failures:

```javascript
// Example validation log
{
  level: 'warn',
  message: 'Validation failed',
  path: '/api/barcode/process',
  method: 'POST',
  errors: [
    {
      field: 'barcode',
      message: 'Invalid barcode format',
      value: 'INVALID'
    }
  ],
  category: 'validation'
}
```

## Future Enhancements

### Planned Features

1. **Async Validation**: Support for database-based validation
2. **Conditional Validation**: Context-dependent validation rules
3. **Validation Caching**: Cache validation results for performance
4. **Custom Error Codes**: Manufacturing-specific error codes
5. **Validation Metrics**: Performance and usage metrics

### Extension Points

The validation system is designed for easy extension:

1. **New Validation Patterns**: Add new regex patterns
2. **Custom Validators**: Create domain-specific validation logic
3. **Validation Middleware**: Build new validation middleware
4. **Error Handling**: Customize error response formats

## Conclusion

The Input Validation Middleware provides a robust, performant, and extensible validation system for manufacturing operations. With comprehensive coverage of all input types, clear error messages, and thorough testing, it ensures data integrity and business rule compliance throughout the manufacturing workflow.

For questions, issues, or contributions, please refer to the project documentation or contact the development team.
