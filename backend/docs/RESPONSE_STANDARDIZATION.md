# Response Standardization System

## Overview

The Response Standardization System provides a comprehensive set of utility functions for creating consistent, manufacturing-specific API responses across the solar panel production tracking system. This system ensures all API endpoints return data in a standardized format with appropriate metadata, context, and error handling.

## Features

- **Standardized Response Format**: Consistent structure for all API responses
- **Manufacturing-Specific Responses**: Specialized response types for production operations
- **Real-time Update Support**: Responses optimized for real-time manufacturing updates
- **Offline Sync Integration**: Responses designed for PWA offline functionality
- **Quality Inspection Support**: Specialized responses for quality control operations
- **Workflow Progress Tracking**: Responses for manufacturing workflow progression
- **System Health Monitoring**: Responses for system status and health checks
- **Batch Operation Support**: Responses for bulk operations with success/failure tracking
- **Rate Limiting Integration**: Responses with rate limit information
- **Enhanced Metadata**: Rich context information for manufacturing operations

## Core Response Structure

### Base Response Format

All responses follow a consistent structure:

```json
{
  "success": true|false,
  "message": "Human-readable message",
  "data": "Response payload or null",
  "timestamp": "ISO 8601 timestamp",
  "metadata": "Additional context-specific fields"
}
```

### Success Response

```javascript
import { successResponse } from '../utils/responseUtils.js';

const response = successResponse(
  { panelId: 'CRS24F1236', status: 'processed' },
  'Panel processed successfully',
  { version: '1.0.0', environment: 'production' }
);
```

**Result:**
```json
{
  "success": true,
  "message": "Panel processed successfully",
  "data": {
    "panelId": "CRS24F1236",
    "status": "processed"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

### Error Response

```javascript
import { errorResponse } from '../utils/responseUtils.js';

const response = errorResponse(
  'Invalid barcode format',
  400,
  { field: 'barcode', reason: 'Invalid format' }
);
```

**Result:**
```json
{
  "success": false,
  "error": "Invalid barcode format",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "field": "barcode",
  "reason": "Invalid format"
}
```

## Manufacturing-Specific Response Types

### 1. Manufacturing Response

Standard response for manufacturing operations with optional station context.

```javascript
import { manufacturingResponse } from '../utils/responseUtils.js';

const response = manufacturingResponse(
  { panelId: 'CRS24F1236', status: 'completed' },
  'STATION_1',
  'LINE_1'
);
```

**Result:**
```json
{
  "success": true,
  "message": "Manufacturing operation completed",
  "data": {
    "panelId": "CRS24F1236",
    "status": "completed"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "station": {
    "id": "STATION_1",
    "line": "LINE_1",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Real-time Update Response

Optimized for real-time manufacturing updates with sequence tracking.

```javascript
import { realTimeUpdateResponse } from '../utils/responseUtils.js';

const response = realTimeUpdateResponse(
  { status: 'quality_check_passed' },
  'status_change',
  'STATION_2'
);
```

**Result:**
```json
{
  "success": true,
  "message": "Real-time update received",
  "data": {
    "status": "quality_check_passed"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "updateType": "status_change",
  "stationId": "STATION_2",
  "realTime": true,
  "sequenceId": 1705312200000
}
```

### 3. Offline Sync Response

Designed for PWA offline functionality and sync operations.

```javascript
import { offlineSyncResponse } from '../utils/responseUtils.js';

const response = offlineSyncResponse(
  { syncedItems: 25 },
  'upload',
  5
);
```

**Result:**
```json
{
  "success": true,
  "message": "Offline sync completed",
  "data": {
    "syncedItems": 25
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "syncType": "upload",
  "pendingItems": 5,
  "offline": true,
  "lastSync": "2024-01-15T10:30:00.000Z"
}
```

### 4. Manufacturing Order Progress Response

Tracks progress of manufacturing orders with completion estimates.

```javascript
import { moProgressResponse } from '../utils/responseUtils.js';

const response = moProgressResponse(
  { moId: 'MO_001', currentStep: 'FRAMING' },
  'MO_001',
  'IN_PROGRESS',
  75,
  { estimatedCompletion: '2024-01-20T15:00:00.000Z' }
);
```

**Result:**
```json
{
  "success": true,
  "message": "Manufacturing order progress updated",
  "data": {
    "moId": "MO_001",
    "currentStep": "FRAMING"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "moId": "MO_001",
  "status": "IN_PROGRESS",
  "progress": 75,
  "estimatedCompletion": "2024-01-20T15:00:00.000Z"
}
```

### 5. Quality Inspection Response

Specialized for quality control operations with detailed results.

```javascript
import { qualityInspectionResponse } from '../utils/responseUtils.js';

const response = qualityInspectionResponse(
  { inspectionId: 'INS_001', criteria: ['voltage', 'current'] },
  'PANEL_001',
  'STATION_3',
  'PASS',
  { 
    qualityScore: 95.5,
    criteria: ['voltage: 95%', 'current: 96%']
  }
);
```

**Result:**
```json
{
  "success": true,
  "message": "Quality inspection completed",
  "data": {
    "inspectionId": "INS_001",
    "criteria": ["voltage", "current"]
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "panelId": "PANEL_001",
  "stationId": "STATION_3",
  "result": "PASS",
  "qualityScore": 95.5,
  "criteria": ["voltage: 95%", "current: 96%"]
}
```

### 6. Station Workflow Response

Tracks workflow progression through manufacturing stations.

```javascript
import { stationWorkflowResponse } from '../utils/responseUtils.js';

const response = stationWorkflowResponse(
  { stepId: 'STEP_001', duration: 120 },
  'STATION_1',
  'ASSEMBLY_EL',
  'FRAMING',
  { 
    workflowProgress: 25,
    estimatedDuration: 300
  }
);
```

**Result:**
```json
{
  "success": true,
  "message": "Workflow step completed",
  "data": {
    "stepId": "STEP_001",
    "duration": 120
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "stationId": "STATION_1",
  "workflowStep": "ASSEMBLY_EL",
  "nextStep": "FRAMING",
  "workflowProgress": 25,
  "estimatedDuration": 300
}
```

### 7. Barcode Processing Response

Specialized for barcode processing operations with validation results.

```javascript
import { barcodeProcessingResponse } from '../utils/responseUtils.js';

const response = barcodeProcessingResponse(
  { barcode: 'CRS24F1236', lineNumber: 1 },
  'CRS24F1236',
  1,
  { 
    processingTime: 45,
    validationResults: ['format_valid', 'checksum_valid']
  }
);
```

**Result:**
```json
{
  "success": true,
  "message": "Barcode processed successfully",
  "data": {
    "barcode": "CRS24F1236",
    "lineNumber": 1
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "barcode": "CRS24F1236",
  "lineNumber": 1,
  "processingTime": 45,
  "validationResults": ["format_valid", "checksum_valid"]
}
```

### 8. System Health Response

Monitors system health and component status.

```javascript
import { systemHealthResponse } from '../utils/responseUtils.js';

const response = systemHealthResponse(
  { uptime: 86400, version: '1.0.0' },
  'healthy',
  { 
    database: 'healthy',
    api: 'healthy',
    cache: 'healthy'
  },
  { uptime: 86400 }
);
```

**Result:**
```json
{
  "success": true,
  "message": "System health status",
  "data": {
    "uptime": 86400,
    "version": "1.0.0"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "status": "healthy",
  "components": {
    "database": "healthy",
    "api": "healthy",
    "cache": "healthy"
  },
  "uptime": 86400,
  "lastCheck": "2024-01-15T10:30:00.000Z"
}
```

### 9. Batch Operation Response

Tracks bulk operations with success/failure metrics.

```javascript
import { batchOperationResponse } from '../utils/responseUtils.js';

const response = batchOperationResponse(
  { operationId: 'BATCH_001' },
  'bulk_import',
  100,
  95,
  5,
  { 
    failures: [
      { item: 'PANEL_001', reason: 'Invalid barcode format' },
      { item: 'PANEL_002', reason: 'Duplicate entry' }
    ]
  }
);
```

**Result:**
```json
{
  "success": true,
  "message": "Batch operation completed",
  "data": {
    "operationId": "BATCH_001"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "operationType": "bulk_import",
  "totalItems": 100,
  "successCount": 95,
  "failureCount": 5,
  "successRate": 95,
  "failures": [
    { "item": "PANEL_001", "reason": "Invalid barcode format" },
    { "item": "PANEL_002", "reason": "Duplicate entry" }
  ]
}
```

### 10. Enhanced Manufacturing Response

Rich context response with manufacturing metadata and performance metrics.

```javascript
import { enhancedManufacturingResponse } from '../utils/responseUtils.js';

const response = enhancedManufacturingResponse(
  { panelId: 'PANEL_001', status: 'completed' },
  { version: '1.0.0' },
  {
    station: 'STATION_1',
    line: 'LINE_1',
    shift: 'DAY',
    operator: 'OP_001',
    performance: {
      processingTime: 120,
      throughput: 30,
      efficiency: 95.5
    }
  }
);
```

**Result:**
```json
{
  "success": true,
  "message": "Manufacturing operation completed",
  "data": {
    "panelId": "PANEL_001",
    "status": "completed"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "manufacturingContext": {
    "station": "STATION_1",
    "line": "LINE_1",
    "shift": "DAY",
    "operator": "OP_001",
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "performance": {
    "processingTime": 120,
    "throughput": 30,
    "efficiency": 95.5
  }
}
```

### 11. Rate Limited Response

Includes rate limiting information for API consumers.

```javascript
import { rateLimitedResponse } from '../utils/responseUtils.js';

const response = rateLimitedResponse(
  { message: 'Request processed' },
  {
    remaining: 95,
    reset: 1642233600,
    limit: 100
  }
);
```

**Result:**
```json
{
  "success": true,
  "message": "Request processed",
  "data": {
    "message": "Request processed"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "rateLimit": {
    "remaining": 95,
    "reset": 1642233600,
    "limit": 100
  }
}
```

## Specialized Response Types

### Validation Error Response

Standardized format for validation failures.

```javascript
import { validationErrorResponse } from '../utils/responseUtils.js';

const response = validationErrorResponse(
  [
    { field: 'barcode', message: 'Invalid format' },
    { field: 'lineNumber', message: 'Must be 1 or 2' }
  ],
  'barcode_processing'
);
```

**Result:**
```json
{
  "success": false,
  "error": "Validation failed",
  "context": "barcode_processing",
  "validationErrors": [
    { "field": "barcode", "message": "Invalid format" },
    { "field": "lineNumber", "message": "Must be 1 or 2" }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Paginated Response

Standardized pagination with navigation metadata.

```javascript
import { paginatedResponse } from '../utils/responseUtils.js';

const response = paginatedResponse(
  [{ id: 1 }, { id: 2 }, { id: 3 }],
  1,
  10,
  25
);
```

**Result:**
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [{ "id": 1 }, { "id": 2 }, { "id": 3 }],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "pagination": {
    "currentPage": 1,
    "itemsPerPage": 10,
    "totalItems": 25,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

## Integration Examples

### Express.js Route Integration

```javascript
import express from 'express';
import { 
  successResponse, 
  errorResponse, 
  manufacturingResponse,
  validationErrorResponse 
} from '../utils/responseUtils.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Success response example
router.get('/panels/:id', asyncHandler(async (req, res) => {
  try {
    const panel = await getPanelById(req.params.id);
    if (!panel) {
      return res.status(404).json(
        errorResponse('Panel not found', 404)
      );
    }
    
    res.json(
      successResponse(panel, 'Panel retrieved successfully')
    );
  } catch (error) {
    res.status(500).json(
      errorResponse('Failed to retrieve panel', 500, { error: error.message })
    );
  }
}));

// Manufacturing response example
router.post('/panels/:id/process', asyncHandler(async (req, res) => {
  try {
    const { stationId, lineNumber } = req.body;
    const result = await processPanel(req.params.id, stationId, lineNumber);
    
    res.json(
      manufacturingResponse(result, stationId, lineNumber, {
        processingTime: result.duration,
        qualityScore: result.qualityScore
      })
    );
  } catch (error) {
    res.status(400).json(
      errorResponse('Processing failed', 400, { error: error.message })
    );
  }
}));

// Validation error example
router.post('/panels', asyncHandler(async (req, res) => {
  const validationErrors = validatePanelData(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json(
      validationErrorResponse(validationErrors, 'panel_creation')
    );
  }
  
  // Continue with panel creation...
}));
```

### Real-time Updates Integration

```javascript
import { realTimeUpdateResponse } from '../utils/responseUtils.js';

// WebSocket or Server-Sent Events
io.on('connection', (socket) => {
  socket.on('panel_status_update', async (data) => {
    try {
      const update = await processPanelUpdate(data);
      
      // Send real-time response
      socket.emit('update_received', 
        realTimeUpdateResponse(update, 'status_change', data.stationId, {
          previousStatus: data.previousStatus,
          changeReason: data.reason
        })
      );
      
      // Broadcast to all connected clients
      io.emit('panel_updated', 
        realTimeUpdateResponse(update, 'status_change', data.stationId)
      );
    } catch (error) {
      socket.emit('update_error', 
        errorResponse('Update failed', 500, { error: error.message })
      );
    }
  });
});
```

### Offline Sync Integration

```javascript
import { offlineSyncResponse } from '../utils/responseUtils.js';

// Service Worker or PWA sync
self.addEventListener('sync', async (event) => {
  if (event.tag === 'background-sync') {
    try {
      const pendingItems = await getPendingSyncItems();
      const syncedItems = await syncPendingItems(pendingItems);
      
      // Send sync completion response
      self.registration.showNotification('Sync Complete', {
        body: `Synced ${syncedItems.length} items`,
        data: offlineSyncResponse(syncedItems, 'upload', pendingItems.length - syncedItems.length)
      });
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
});
```

## Testing

### Running Tests

```bash
# Run all response utility tests
npm run test-response-utils

# Run specific test file
npm test backend/utils/__tests__/responseUtils.test.js
```

### Test Coverage

The test suite covers:
- All response function variations
- Edge cases and error handling
- Response consistency validation
- Manufacturing-specific scenarios
- Metadata handling
- Timestamp consistency
- Success/error flag consistency

## Best Practices

### 1. Consistent Usage

Always use the appropriate response function for the operation type:

```javascript
// ✅ Good: Use manufacturing-specific response
res.json(manufacturingResponse(result, stationId, lineNumber));

// ❌ Bad: Generic success response for manufacturing operation
res.json(successResponse(result));
```

### 2. Appropriate Error Handling

Use specific error responses for different error types:

```javascript
// ✅ Good: Specific error response
if (validationErrors.length > 0) {
  return res.status(400).json(
    validationErrorResponse(validationErrors, 'panel_creation')
  );
}

// ✅ Good: Generic error response for unexpected errors
} catch (error) {
  res.status(500).json(
    errorResponse('Internal server error', 500, { error: error.message })
  );
}
```

### 3. Metadata Enrichment

Include relevant metadata for better context:

```javascript
// ✅ Good: Rich metadata
res.json(enhancedManufacturingResponse(result, {
  version: '1.0.0',
  environment: process.env.NODE_ENV
}, {
  station: stationId,
  line: lineNumber,
  operator: req.user.id,
  performance: {
    processingTime: Date.now() - startTime,
    throughput: calculateThroughput()
  }
}));
```

### 4. Real-time Considerations

For real-time updates, include sequence IDs and timestamps:

```javascript
// ✅ Good: Real-time response with sequence tracking
socket.emit('update', realTimeUpdateResponse(data, 'status_change', stationId, {
  sequenceId: generateSequenceId(),
  priority: 'high'
}));
```

## Configuration

### Environment Variables

No additional environment variables are required for the response standardization system.

### Customization

The system can be customized by extending the response functions or creating new specialized response types:

```javascript
// Custom response type for specific manufacturing operation
export const customManufacturingResponse = (data, operationType, metadata = {}) => {
  return successResponse(data, 'Custom operation completed', {
    operationType,
    customField: metadata.customField,
    ...metadata
  });
};
```

## Troubleshooting

### Common Issues

1. **Timestamp Inconsistency**
   - Ensure all responses use the same timestamp format
   - Check for timezone issues in production

2. **Metadata Override**
   - Be careful with metadata spread order
   - Ensure custom fields don't override system fields

3. **Response Size**
   - Monitor response payload sizes
   - Consider pagination for large datasets

### Debug Mode

Enable debug logging to trace response creation:

```javascript
// Add to response functions for debugging
if (process.env.NODE_ENV === 'development') {
  console.log('Response created:', response);
}
```

## Performance Considerations

### Response Size Optimization

- Use appropriate response types to avoid unnecessary metadata
- Consider compression for large responses
- Implement pagination for list endpoints

### Caching

- Cache frequently requested responses
- Use ETags for conditional requests
- Implement response versioning for breaking changes

## Future Enhancements

### Planned Features

1. **Response Compression**: Automatic compression for large responses
2. **Response Caching**: Built-in caching mechanisms
3. **Response Analytics**: Track response patterns and performance
4. **Custom Response Types**: User-defined response formats
5. **Response Validation**: Schema validation for response structure

### Extension Points

The system is designed to be easily extensible:

- Add new response types by following the existing pattern
- Extend metadata handling for new use cases
- Integrate with monitoring and analytics systems
- Support for different response formats (XML, MessagePack, etc.)

## Conclusion

The Response Standardization System provides a robust foundation for consistent API responses across the manufacturing system. By using the appropriate response types and following best practices, developers can ensure a consistent user experience while maintaining the flexibility needed for complex manufacturing operations.

For additional support or questions, refer to the test suite examples or contact the development team.
