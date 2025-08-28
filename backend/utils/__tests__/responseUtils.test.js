// Comprehensive test suite for Response Utilities
// Tests all manufacturing-specific response formats and edge cases

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  successResponse,
  errorResponse,
  manufacturingResponse,
  validationErrorResponse,
  paginatedResponse,
  realTimeUpdateResponse,
  offlineSyncResponse,
  moProgressResponse,
  qualityInspectionResponse,
  stationWorkflowResponse,
  barcodeProcessingResponse,
  systemHealthResponse,
  batchOperationResponse,
  enhancedManufacturingResponse,
  rateLimitedResponse
} from '../responseUtils.js';

describe('Response Utilities', () => {
  let mockDate;

  beforeEach(() => {
    // Mock Date.now() for consistent testing
    mockDate = new Date('2024-01-15T10:30:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-15T10:30:00.000Z');
  });

  describe('Basic Response Functions', () => {
    describe('successResponse', () => {
      it('should create a basic success response', () => {
        const response = successResponse();
        
        expect(response).toEqual({
          success: true,
          message: 'Success',
          data: null,
          timestamp: '2024-01-15T10:30:00.000Z'
        });
      });

      it('should create a success response with data', () => {
        const data = { id: 1, name: 'Test Panel' };
        const response = successResponse(data);
        
        expect(response).toEqual({
          success: true,
          message: 'Success',
          data: { id: 1, name: 'Test Panel' },
          timestamp: '2024-01-15T10:30:00.000Z'
        });
      });

      it('should create a success response with custom message', () => {
        const response = successResponse(null, 'Custom success message');
        
        expect(response).toEqual({
          success: true,
          message: 'Custom success message',
          data: null,
          timestamp: '2024-01-15T10:30:00.000Z'
        });
      });

      it('should create a success response with metadata', () => {
        const metadata = { version: '1.0.0', environment: 'test' };
        const response = successResponse(null, 'Success', metadata);
        
        expect(response).toEqual({
          success: true,
          message: 'Success',
          data: null,
          timestamp: '2024-01-15T10:30:00.000Z',
          version: '1.0.0',
          environment: 'test'
        });
      });
    });

    describe('errorResponse', () => {
      it('should create a basic error response', () => {
        const response = errorResponse();
        
        expect(response).toEqual({
          success: false,
          error: 'An error occurred',
          statusCode: 500,
          timestamp: '2024-01-15T10:30:00.000Z'
        });
      });

      it('should create an error response with custom message', () => {
        const response = errorResponse('Custom error message');
        
        expect(response).toEqual({
          success: false,
          error: 'Custom error message',
          statusCode: 500,
          timestamp: '2024-01-15T10:30:00.000Z'
        });
      });

      it('should create an error response with custom status code', () => {
        const response = errorResponse('Not found', 404);
        
        expect(response).toEqual({
          success: false,
          error: 'Not found',
          statusCode: 404,
          timestamp: '2024-01-15T10:30:00.000Z'
        });
      });

      it('should create an error response with additional details', () => {
        const details = { field: 'barcode', reason: 'Invalid format' };
        const response = errorResponse('Validation failed', 400, details);
        
        expect(response).toEqual({
          success: false,
          error: 'Validation failed',
          statusCode: 400,
          timestamp: '2024-01-15T10:30:00.000Z',
          field: 'barcode',
          reason: 'Invalid format'
        });
      });
    });
  });

  describe('Manufacturing-Specific Response Functions', () => {
    describe('manufacturingResponse', () => {
      it('should create a manufacturing response without station context', () => {
        const data = { panelId: 'CRS24F1236', status: 'processed' };
        const response = manufacturingResponse(data);
        
        expect(response).toEqual({
          success: true,
          message: 'Manufacturing operation completed',
          data: { panelId: 'CRS24F1236', status: 'processed' },
          timestamp: '2024-01-15T10:30:00.000Z'
        });
      });

      it('should create a manufacturing response with station context', () => {
        const data = { panelId: 'CRS24F1236', status: 'processed' };
        const response = manufacturingResponse(data, 'STATION_1', 'LINE_1');
        
        expect(response).toEqual({
          success: true,
          message: 'Manufacturing operation completed',
          data: { panelId: 'CRS24F1236', status: 'processed' },
          timestamp: '2024-01-15T10:30:00.000Z',
          station: {
            id: 'STATION_1',
            line: 'LINE_1',
            timestamp: '2024-01-15T10:30:00.000Z'
          }
        });
      });
    });

    describe('realTimeUpdateResponse', () => {
      it('should create a real-time update response', () => {
        const data = { status: 'quality_check_passed' };
        const response = realTimeUpdateResponse(data, 'status_change', 'STATION_2');
        
        expect(response).toEqual({
          success: true,
          message: 'Real-time update received',
          data: { status: 'quality_check_passed' },
          timestamp: '2024-01-15T10:30:00.000Z',
          updateType: 'status_change',
          stationId: 'STATION_2',
          realTime: true,
          sequenceId: mockDate.getTime()
        });
      });

      it('should create a real-time update response without station', () => {
        const data = { systemStatus: 'operational' };
        const response = realTimeUpdateResponse(data, 'system_update');
        
        expect(response).toEqual({
          success: true,
          message: 'Real-time update received',
          data: { systemStatus: 'operational' },
          timestamp: '2024-01-15T10:30:00.000Z',
          updateType: 'system_update',
          stationId: null,
          realTime: true,
          sequenceId: mockDate.getTime()
        });
      });
    });

    describe('offlineSyncResponse', () => {
      it('should create an offline sync response', () => {
        const data = { syncedItems: 25 };
        const response = offlineSyncResponse(data, 'upload', 5);
        
        expect(response).toEqual({
          success: true,
          message: 'Offline sync completed',
          data: { syncedItems: 25 },
          timestamp: '2024-01-15T10:30:00.000Z',
          syncType: 'upload',
          pendingItems: 5,
          offline: true,
          lastSync: '2024-01-15T10:30:00.000Z'
        });
      });

      it('should create an offline sync response with no pending items', () => {
        const data = { syncedItems: 30 };
        const response = offlineSyncResponse(data, 'download');
        
        expect(response).toEqual({
          success: true,
          message: 'Offline sync completed',
          data: { syncedItems: 30 },
          timestamp: '2024-01-15T10:30:00.000Z',
          syncType: 'download',
          pendingItems: 0,
          offline: true,
          lastSync: '2024-01-15T10:30:00.000Z'
        });
      });
    });

    describe('moProgressResponse', () => {
      it('should create a manufacturing order progress response', () => {
        const data = { moId: 'MO_001', currentStep: 'FRAMING' };
        const response = moProgressResponse(data, 'MO_001', 'IN_PROGRESS', 75);
        
        expect(response).toEqual({
          success: true,
          message: 'Manufacturing order progress updated',
          data: { moId: 'MO_001', currentStep: 'FRAMING' },
          timestamp: '2024-01-15T10:30:00.000Z',
          moId: 'MO_001',
          status: 'IN_PROGRESS',
          progress: 75,
          estimatedCompletion: null
        });
      });

      it('should create a manufacturing order progress response with estimated completion', () => {
        const data = { moId: 'MO_002', currentStep: 'JUNCTION_BOX' };
        const metadata = { estimatedCompletion: '2024-01-20T15:00:00.000Z' };
        const response = moProgressResponse(data, 'MO_002', 'IN_PROGRESS', 50, metadata);
        
        expect(response).toEqual({
          success: true,
          message: 'Manufacturing order progress updated',
          data: { moId: 'MO_002', currentStep: 'JUNCTION_BOX' },
          timestamp: '2024-01-15T10:30:00.000Z',
          moId: 'MO_002',
          status: 'IN_PROGRESS',
          progress: 50,
          estimatedCompletion: '2024-01-20T15:00:00.000Z'
        });
      });
    });

    describe('qualityInspectionResponse', () => {
      it('should create a quality inspection response', () => {
        const data = { inspectionId: 'INS_001', criteria: ['voltage', 'current'] };
        const response = qualityInspectionResponse(data, 'PANEL_001', 'STATION_3', 'PASS');
        
        expect(response).toEqual({
          success: true,
          message: 'Quality inspection completed',
          data: { inspectionId: 'INS_001', criteria: ['voltage', 'current'] },
          timestamp: '2024-01-15T10:30:00.000Z',
          panelId: 'PANEL_001',
          stationId: 'STATION_3',
          result: 'PASS',
          qualityScore: null,
          criteria: []
        });
      });

      it('should create a quality inspection response with quality score and criteria', () => {
        const data = { inspectionId: 'INS_002', criteria: ['voltage', 'current'] };
        const metadata = { 
          qualityScore: 95.5, 
          criteria: ['voltage: 95%', 'current: 96%'] 
        };
        const response = qualityInspectionResponse(data, 'PANEL_002', 'STATION_3', 'PASS', metadata);
        
        expect(response).toEqual({
          success: true,
          message: 'Quality inspection completed',
          data: { inspectionId: 'INS_002', criteria: ['voltage', 'current'] },
          timestamp: '2024-01-15T10:30:00.000Z',
          panelId: 'PANEL_002',
          stationId: 'STATION_3',
          result: 'PASS',
          qualityScore: 95.5,
          criteria: ['voltage: 95%', 'current: 96%']
        });
      });
    });

    describe('stationWorkflowResponse', () => {
      it('should create a station workflow response', () => {
        const data = { stepId: 'STEP_001', duration: 120 };
        const response = stationWorkflowResponse(data, 'STATION_1', 'ASSEMBLY_EL', 'FRAMING');
        
        expect(response).toEqual({
          success: true,
          message: 'Workflow step completed',
          data: { stepId: 'STEP_001', duration: 120 },
          timestamp: '2024-01-15T10:30:00.000Z',
          stationId: 'STATION_1',
          workflowStep: 'ASSEMBLY_EL',
          nextStep: 'FRAMING',
          workflowProgress: null,
          estimatedDuration: null
        });
      });

      it('should create a station workflow response with progress and duration', () => {
        const data = { stepId: 'STEP_002', duration: 180 };
        const metadata = { 
          workflowProgress: 60, 
          estimatedDuration: 300 
        };
        const response = stationWorkflowResponse(data, 'STATION_2', 'FRAMING', 'JUNCTION_BOX', metadata);
        
        expect(response).toEqual({
          success: true,
          message: 'Workflow step completed',
          data: { stepId: 'STEP_002', duration: 180 },
          timestamp: '2024-01-15T10:30:00.000Z',
          stationId: 'STATION_2',
          workflowStep: 'FRAMING',
          nextStep: 'JUNCTION_BOX',
          workflowProgress: 60,
          estimatedDuration: 300
        });
      });
    });

    describe('barcodeProcessingResponse', () => {
      it('should create a barcode processing response', () => {
        const data = { barcode: 'CRS24F1236', lineNumber: 1 };
        const response = barcodeProcessingResponse(data, 'CRS24F1236', 1);
        
        expect(response).toEqual({
          success: true,
          message: 'Barcode processed successfully',
          data: { barcode: 'CRS24F1236', lineNumber: 1 },
          timestamp: '2024-01-15T10:30:00.000Z',
          barcode: 'CRS24F1236',
          lineNumber: 1,
          processingTime: null,
          validationResults: []
        });
      });

      it('should create a barcode processing response with processing time and validation results', () => {
        const data = { barcode: 'CRS24F1236', lineNumber: 1 };
        const metadata = { 
          processingTime: 45, 
          validationResults: ['format_valid', 'checksum_valid'] 
        };
        const response = barcodeProcessingResponse(data, 'CRS24F1236', 1, metadata);
        
        expect(response).toEqual({
          success: true,
          message: 'Barcode processed successfully',
          data: { barcode: 'CRS24F1236', lineNumber: 1 },
          timestamp: '2024-01-15T10:30:00.000Z',
          barcode: 'CRS24F1236',
          lineNumber: 1,
          processingTime: 45,
          validationResults: ['format_valid', 'checksum_valid']
        });
      });
    });

    describe('systemHealthResponse', () => {
      it('should create a system health response', () => {
        const data = { uptime: 86400, version: '1.0.0' };
        const response = systemHealthResponse(data, 'healthy');
        
        expect(response).toEqual({
          success: true,
          message: 'System health status',
          data: { uptime: 86400, version: '1.0.0' },
          timestamp: '2024-01-15T10:30:00.000Z',
          status: 'healthy',
          components: {},
          uptime: null,
          lastCheck: '2024-01-15T10:30:00.000Z'
        });
      });

      it('should create a system health response with component status', () => {
        const data = { uptime: 86400, version: '1.0.0' };
        const components = { 
          database: 'healthy', 
          api: 'degraded', 
          cache: 'healthy' 
        };
        const metadata = { uptime: 86400 };
        const response = systemHealthResponse(data, 'degraded', components, metadata);
        
        expect(response).toEqual({
          success: true,
          message: 'System health status',
          data: { uptime: 86400, version: '1.0.0' },
          timestamp: '2024-01-15T10:30:00.000Z',
          status: 'degraded',
          components: { database: 'healthy', api: 'degraded', cache: 'healthy' },
          uptime: 86400,
          lastCheck: '2024-01-15T10:30:00.000Z'
        });
      });
    });

    describe('batchOperationResponse', () => {
      it('should create a batch operation response', () => {
        const data = { operationId: 'BATCH_001' };
        const response = batchOperationResponse(data, 'bulk_import', 100, 95, 5);
        
        expect(response).toEqual({
          success: true,
          message: 'Batch operation completed',
          data: { operationId: 'BATCH_001' },
          timestamp: '2024-01-15T10:30:00.000Z',
          operationType: 'bulk_import',
          totalItems: 100,
          successCount: 95,
          failureCount: 5,
          successRate: 95,
          failures: []
        });
      });

      it('should create a batch operation response with failure details', () => {
        const data = { operationId: 'BATCH_002' };
        const metadata = { 
          failures: [
            { item: 'PANEL_001', reason: 'Invalid barcode format' },
            { item: 'PANEL_002', reason: 'Duplicate entry' }
          ] 
        };
        const response = batchOperationResponse(data, 'bulk_update', 50, 48, 2, metadata);
        
        expect(response).toEqual({
          success: true,
          message: 'Batch operation completed',
          data: { operationId: 'BATCH_002' },
          timestamp: '2024-01-15T10:30:00.000Z',
          operationType: 'bulk_update',
          totalItems: 50,
          successCount: 48,
          failureCount: 2,
          successRate: 96,
          failures: [
            { item: 'PANEL_001', reason: 'Invalid barcode format' },
            { item: 'PANEL_002', reason: 'Duplicate entry' }
          ]
        });
      });
    });

    describe('enhancedManufacturingResponse', () => {
      it('should create an enhanced manufacturing response without context', () => {
        const data = { panelId: 'PANEL_001', status: 'completed' };
        const response = enhancedManufacturingResponse(data);
        
        expect(response).toEqual({
          success: true,
          message: 'Manufacturing operation completed',
          data: { panelId: 'PANEL_001', status: 'completed' },
          timestamp: '2024-01-15T10:30:00.000Z'
        });
      });

      it('should create an enhanced manufacturing response with station context', () => {
        const data = { panelId: 'PANEL_001', status: 'completed' };
        const manufacturingContext = {
          station: 'STATION_1',
          line: 'LINE_1',
          shift: 'DAY',
          operator: 'OP_001'
        };
        const response = enhancedManufacturingResponse(data, {}, manufacturingContext);
        
        expect(response).toEqual({
          success: true,
          message: 'Manufacturing operation completed',
          data: { panelId: 'PANEL_001', status: 'completed' },
          timestamp: '2024-01-15T10:30:00.000Z',
          manufacturingContext: {
            station: 'STATION_1',
            line: 'LINE_1',
            shift: 'DAY',
            operator: 'OP_001',
            timestamp: '2024-01-15T10:30:00.000Z'
          }
        });
      });

      it('should create an enhanced manufacturing response with performance metrics', () => {
        const data = { panelId: 'PANEL_001', status: 'completed' };
        const manufacturingContext = {
          performance: {
            processingTime: 120,
            throughput: 30,
            efficiency: 95.5
          }
        };
        const response = enhancedManufacturingResponse(data, {}, manufacturingContext);
        
        expect(response).toEqual({
          success: true,
          message: 'Manufacturing operation completed',
          data: { panelId: 'PANEL_001', status: 'completed' },
          timestamp: '2024-01-15T10:30:00.000Z',
          performance: {
            processingTime: 120,
            throughput: 30,
            efficiency: 95.5
          }
        });
      });
    });

    describe('rateLimitedResponse', () => {
      it('should create a rate limited response', () => {
        const data = { message: 'Request processed' };
        const rateLimitInfo = {
          remaining: 95,
          reset: 1642233600,
          limit: 100
        };
        const response = rateLimitedResponse(data, rateLimitInfo);
        
        expect(response).toEqual({
          success: true,
          message: 'Request processed',
          data: { message: 'Request processed' },
          timestamp: '2024-01-15T10:30:00.000Z',
          rateLimit: {
            remaining: 95,
            reset: 1642233600,
            limit: 100
          }
        });
      });
    });
  });

  describe('Specialized Response Functions', () => {
    describe('validationErrorResponse', () => {
      it('should create a validation error response', () => {
        const errors = [
          { field: 'barcode', message: 'Invalid format' },
          { field: 'lineNumber', message: 'Must be 1 or 2' }
        ];
        const response = validationErrorResponse(errors, 'barcode_processing');
        
        expect(response).toEqual({
          success: false,
          error: 'Validation failed',
          context: 'barcode_processing',
          validationErrors: [
            { field: 'barcode', message: 'Invalid format' },
            { field: 'lineNumber', message: 'Must be 1 or 2' }
          ],
          timestamp: '2024-01-15T10:30:00.000Z'
        });
      });

      it('should create a validation error response with default context', () => {
        const errors = [{ field: 'email', message: 'Invalid email format' }];
        const response = validationErrorResponse(errors);
        
        expect(response).toEqual({
          success: false,
          error: 'Validation failed',
          context: 'input validation',
          validationErrors: [{ field: 'email', message: 'Invalid email format' }],
          timestamp: '2024-01-15T10:30:00.000Z'
        });
      });
    });

    describe('paginatedResponse', () => {
      it('should create a paginated response', () => {
        const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
        const response = paginatedResponse(data, 1, 10, 25);
        
        expect(response).toEqual({
          success: true,
          message: 'Data retrieved successfully',
          data: [{ id: 1 }, { id: 2 }, { id: 3 }],
          timestamp: '2024-01-15T10:30:00.000Z',
          pagination: {
            currentPage: 1,
            itemsPerPage: 10,
            totalItems: 25,
            totalPages: 3,
            hasNextPage: true,
            hasPreviousPage: false
          }
        });
      });

      it('should create a paginated response for last page', () => {
        const data = [{ id: 21 }, { id: 22 }];
        const response = paginatedResponse(data, 3, 10, 22);
        
        expect(response).toEqual({
          success: true,
          message: 'Data retrieved successfully',
          data: [{ id: 21 }, { id: 22 }],
          timestamp: '2024-01-15T10:30:00.000Z',
          pagination: {
            currentPage: 3,
            itemsPerPage: 10,
            totalItems: 22,
            totalPages: 3,
            hasNextPage: false,
            hasPreviousPage: true
          }
        });
      });

      it('should handle single page results', () => {
        const data = [{ id: 1 }, { id: 2 }];
        const response = paginatedResponse(data, 1, 10, 2);
        
        expect(response).toEqual({
          success: true,
          message: 'Data retrieved successfully',
          data: [{ id: 1 }, { id: 2 }],
          timestamp: '2024-01-15T10:30:00.000Z',
          pagination: {
            currentPage: 1,
            itemsPerPage: 10,
            totalItems: 2,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined values gracefully', () => {
      const response = successResponse(null, undefined, {});
      
      expect(response).toEqual({
        success: true,
        message: undefined,
        data: null,
        timestamp: '2024-01-15T10:30:00.000Z'
      });
    });

    it('should handle empty objects and arrays', () => {
      const response = successResponse([], 'Empty data', { empty: true });
      
      expect(response).toEqual({
        success: true,
        message: 'Empty data',
        data: [],
        timestamp: '2024-01-15T10:30:00.000Z',
        empty: true
      });
    });

    it('should handle nested objects and arrays in metadata', () => {
      const metadata = {
        nested: {
          level1: {
            level2: ['item1', 'item2']
          }
        },
        array: [1, 2, 3]
      };
      const response = successResponse({ test: true }, 'Nested data', metadata);
      
      expect(response).toEqual({
        success: true,
        message: 'Nested data',
        data: { test: true },
        timestamp: '2024-01-15T10:30:00.000Z',
        nested: {
          level1: {
            level2: ['item1', 'item2']
          }
        },
        array: [1, 2, 3]
      });
    });
  });

  describe('Response Consistency', () => {
    it('should maintain consistent timestamp format across all responses', () => {
      const responses = [
        successResponse(),
        errorResponse(),
        manufacturingResponse({}),
        validationErrorResponse([]),
        paginatedResponse([], 1, 10, 0),
        realTimeUpdateResponse({}, 'test'),
        offlineSyncResponse({}, 'test'),
        moProgressResponse({}, 'MO_001', 'PENDING', 0),
        qualityInspectionResponse({}, 'PANEL_001', 'STATION_1', 'PASS'),
        stationWorkflowResponse({}, 'STATION_1', 'TEST'),
        barcodeProcessingResponse({}, 'TEST', 1),
        systemHealthResponse({}, 'healthy'),
        batchOperationResponse({}, 'test', 10, 10, 0),
        enhancedManufacturingResponse({}),
        rateLimitedResponse({}, { remaining: 100, reset: 0, limit: 100 })
      ];

      responses.forEach(response => {
        expect(response.timestamp).toBe('2024-01-15T10:30:00.000Z');
      });
    });

    it('should maintain consistent success flag across all responses', () => {
      const successResponses = [
        successResponse(),
        manufacturingResponse({}),
        paginatedResponse([], 1, 10, 0),
        realTimeUpdateResponse({}, 'test'),
        offlineSyncResponse({}, 'test'),
        moProgressResponse({}, 'MO_001', 'PENDING', 0),
        qualityInspectionResponse({}, 'PANEL_001', 'STATION_1', 'PASS'),
        stationWorkflowResponse({}, 'STATION_1', 'TEST'),
        barcodeProcessingResponse({}, 'TEST', 1),
        systemHealthResponse({}, 'healthy'),
        batchOperationResponse({}, 'test', 10, 10, 0),
        enhancedManufacturingResponse({}),
        rateLimitedResponse({}, { remaining: 100, reset: 0, limit: 100 })
      ];

      const errorResponses = [
        errorResponse(),
        validationErrorResponse([])
      ];

      successResponses.forEach(response => {
        expect(response.success).toBe(true);
      });

      errorResponses.forEach(response => {
        expect(response.success).toBe(false);
      });
    });
  });
});
