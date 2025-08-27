# Barcode Processing System - API Reference

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
All endpoints require station identification via `x-station-id` header.

## Rate Limiting
- **Window**: 15 minutes
- **Limit**: 1000 requests per station
- **Health endpoints**: Exempt from rate limiting

## Common Response Format
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-12-19T10:30:00.000Z"
}
```

## Error Response Format
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": { ... },
  "timestamp": "2024-12-19T10:30:00.000Z"
}
```

---

## Barcode Processing Endpoints

### 1. Process Single Barcode
**POST** `/barcode/process`

Process a single barcode and return processing results.

**Request Body:**
```json
{
  "barcode": "CRS24WT3600001",
  "stationId": "STATION_1",
  "metadata": {
    "operator": "John Doe",
    "notes": "Optional notes"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "barcode": "CRS24WT3600001",
    "components": {
      "companyPrefix": "CRS",
      "year": "24",
      "factory": "W",
      "batch": "T",
      "panelType": "36",
      "sequence": "00001"
    },
    "lineAssignment": "LINE_1",
    "stationRange": "STATIONS_1-4",
    "processing": {
      "success": true,
      "validation": { ... },
      "lineAssignment": { ... }
    }
  }
}
```

### 2. Process Multiple Barcodes
**POST** `/barcode/process-batch`

Process multiple barcodes in a single request.

**Request Body:**
```json
{
  "barcodes": [
    "CRS24WT3600001",
    "CRS24WT3600002",
    "CRS24WT3600003"
  ],
  "stationId": "STATION_1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 3,
    "successful": 3,
    "failed": 0,
    "results": [
      { "barcode": "CRS24WT3600001", "success": true, ... },
      { "barcode": "CRS24WT3600002", "success": true, ... },
      { "barcode": "CRS24WT3600003", "success": true, ... }
    ]
  }
}
```

### 3. Validate Barcode Format
**POST** `/barcode/validate`

Validate barcode format without processing.

**Request Body:**
```json
{
  "barcode": "CRS24WT3600001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "components": { ... },
    "validation": {
      "format": true,
      "companyPrefix": true,
      "year": true,
      "factory": true,
      "batch": true,
      "panelType": true,
      "sequence": true
    }
  }
}
```

---

## Manufacturing Order Integration

### 4. Process with Auto Tracking
**POST** `/barcode/process-with-auto-tracking`

Process barcode with automatic MO progress tracking.

**Request Body:**
```json
{
  "barcode": "CRS24WT3600001",
  "moId": "MO-2024-001",
  "stationId": "STATION_1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "barcode": "CRS24WT3600001",
    "moValidation": {
      "isValid": true,
      "moId": "MO-2024-001",
      "panelTypeMatch": true,
      "sequenceInRange": true
    },
    "moProgress": {
      "completed": 150,
      "total": 1000,
      "percentage": 15.0
    },
    "processing": { ... }
  }
}
```

### 5. Real-time MO Status
**GET** `/barcode/mo-status-real-time/:moId`

Get real-time status of a manufacturing order.

**Response:**
```json
{
  "success": true,
  "data": {
    "moId": "MO-2024-001",
    "status": "IN_PROGRESS",
    "progress": {
      "completed": 150,
      "total": 1000,
      "percentage": 15.0
    },
    "lastActivity": "2024-12-19T10:30:00.000Z",
    "estimatedCompletion": "2024-12-20T14:00:00.000Z"
  }
}
```

### 6. MO Dashboard Data
**GET** `/barcode/mo-dashboard`

Get comprehensive MO dashboard data.

**Response:**
```json
{
  "success": true,
  "data": {
    "activeMOs": 5,
    "completedToday": 12,
    "totalProduction": 2500,
    "efficiency": 94.2,
    "recentActivity": [ ... ]
  }
}
```

---

## Database Integration

### 7. Process with Database
**POST** `/barcode/process-with-database`

Process barcode with full database integration.

**Request Body:**
```json
{
  "barcode": "CRS24WT3600001",
  "stationId": "STATION_1",
  "metadata": {
    "operator": "John Doe",
    "qualityGrade": "A"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "barcode": "CRS24WT3600001",
    "panel": {
      "id": "panel_123",
      "barcode": "CRS24WT3600001",
      "status": "CREATED",
      "createdAt": "2024-12-19T10:30:00.000Z"
    },
    "database": {
      "panelCreated": true,
      "eventLogged": true,
      "moUpdated": true
    }
  }
}
```

### 8. Database Statistics
**GET** `/barcode/database-statistics`

Get comprehensive database statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPanels": 15420,
    "totalMOs": 23,
    "activeMOs": 5,
    "processingStats": {
      "today": 150,
      "thisWeek": 1200,
      "thisMonth": 5200
    }
  }
}
```

---

## Monitoring and Analytics

### 9. Production Floor Dashboard
**GET** `/metrics/production-floor`

Get comprehensive production floor dashboard data.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalStations": 8,
      "activeStations": 7,
      "totalLines": 2,
      "activeLines": 2
    },
    "stationMetrics": { ... },
    "lineMetrics": { ... },
    "qualityMetrics": { ... },
    "alerts": [ ... ]
  }
}
```

### 10. Station Metrics
**GET** `/metrics/stations`

Get detailed station-specific metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "STATION_1": {
      "status": "ACTIVE",
      "utilization": 85.2,
      "barcodesProcessed": 45,
      "errorRate": 0.0,
      "lastActivity": "2024-12-19T10:30:00.000Z"
    }
  }
}
```

### 11. Quality Metrics
**GET** `/metrics/quality`

Get quality metrics and trends.

**Response:**
```json
{
  "success": true,
  "data": {
    "overallQuality": 96.8,
    "defectRate": 3.2,
    "trends": {
      "daily": [ ... ],
      "weekly": [ ... ],
      "monthly": [ ... ]
    },
    "defectBreakdown": {
      "format": 1.2,
      "validation": 0.8,
      "system": 1.2
    }
  }
}
```

---

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_BARCODE_FORMAT` | Barcode format is invalid | 400 |
| `VALIDATION_FAILED` | Component validation failed | 400 |
| `MO_NOT_FOUND` | Manufacturing order not found | 404 |
| `MO_VALIDATION_FAILED` | MO validation failed | 400 |
| `DATABASE_ERROR` | Database operation failed | 500 |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded | 429 |
| `STATION_NOT_IDENTIFIED` | Station ID missing or invalid | 400 |
| `INTERNAL_ERROR` | Internal server error | 500 |

---

## Testing Endpoints

### Health Check
**GET** `/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-19T10:30:00.000Z",
  "version": "1.0.0"
}
```

### Performance Metrics
**GET** `/performance`

**Response:**
```json
{
  "success": true,
  "data": {
    "responseTime": {
      "average": 800,
      "p95": 1500,
      "p99": 2000
    },
    "throughput": {
      "requestsPerSecond": 50,
      "activeConnections": 8
    }
  }
}
```

---

## Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | Must be `application/json` |
| `x-station-id` | Yes | Station identifier |
| `Accept` | No | Response format preference |

## Response Headers

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-RateLimit-Limit` | Rate limit maximum |
| `X-RateLimit-Remaining` | Remaining requests |
| `X-RateLimit-Reset` | Rate limit reset time |

---

**Version**: 1.0.0  
**Last Updated**: December 2024
