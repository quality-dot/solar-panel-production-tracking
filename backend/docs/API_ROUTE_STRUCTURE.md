# RESTful API Route Structure

## Overview

The Solar Panel Production Tracking System provides a comprehensive RESTful API designed specifically for manufacturing workflow operations. The API follows REST principles with consistent patterns, comprehensive error handling, and manufacturing-specific optimizations.

## API Base URL

```
Base URL: http://localhost:3000/api/v1
Version: 1.0.0
Environment: Development/Production
```

## Core API Endpoints

### 1. Authentication & Authorization

#### Base: `/api/v1/auth`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `POST` | `/login` | User login with station assignment | Public |
| `POST` | `/logout` | User logout and session cleanup | Private |
| `GET` | `/profile` | Get current user profile | Private |
| `POST` | `/refresh` | Refresh JWT token | Private |

**Features:**
- JWT-based authentication
- Role-based access control
- Station assignment validation
- Session management

### 2. Barcode Processing

#### Base: `/api/v1/barcode`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `POST` | `/process` | Process barcode scan and initiate workflow | Private |
| `GET` | `/validate/:barcode` | Validate barcode format and components | Private |
| `POST` | `/generate` | Generate barcodes for testing/MO setup | Private |
| `GET` | `/history/:barcode` | Get barcode processing history | Private |

**Features:**
- CRSYYFBPP##### format validation
- Automatic line assignment
- Manufacturing order validation
- Comprehensive event logging

### 3. Station Workflow Management

#### Base: `/api/v1/stations`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `GET` | `/` | Get all stations with current status | Private |
| `GET` | `/:id` | Get specific station details | Private |
| `POST` | `/:id/scan` | Process barcode scan at station | Private |
| `POST` | `/:id/inspect` | Submit inspection results | Private |
| `GET` | `/:id/status` | Get station current status | Private |

**Features:**
- Workflow state machine
- Pass/fail criteria management
- Real-time status updates
- Station assignment validation

### 4. Panel Lifecycle Tracking

#### Base: `/api/v1/panels`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `GET` | `/` | Get panels with filtering and pagination | Private |
| `GET` | `/:barcode` | Get specific panel details | Private |
| `POST` | `/` | Create new panel entry | Private |
| `PUT` | `/:barcode` | Update panel information | Private |
| `GET` | `/:barcode/history` | Get panel workflow history | Private |

**Features:**
- Status tracking (PENDING, IN_PROGRESS, PASSED, FAILED, REWORK)
- Workflow progression monitoring
- Manufacturing order association
- Quality metrics tracking

### 5. Manufacturing Order Management

#### Base: `/api/v1/manufacturing-orders`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `GET` | `/` | Get manufacturing orders with filtering | Private |
| `POST` | `/` | Create new manufacturing order | Private |
| `GET` | `/:id` | Get specific MO details | Private |
| `PUT` | `/:id` | Update manufacturing order | Private |
| `GET` | `/:id/progress` | Get MO progress and completion | Private |
| `POST` | `/:id/close` | Close completed manufacturing order | Private |

**Features:**
- Order creation and validation
- Progress tracking and monitoring
- Barcode sequencing management
- Automatic completion logic

### 6. Quality Inspection Management

#### Base: `/api/v1/inspections`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `GET` | `/` | Get inspection records with filtering | Private |
| `POST` | `/` | Create new inspection record | Private |
| `GET` | `/:id` | Get specific inspection details | Private |
| `PUT` | `/:id` | Update inspection record | Private |
| `GET` | `/statistics` | Get inspection statistics | Private |

**Features:**
- Pass/fail criteria management
- Notes and override support
- Quality metrics tracking
- Trend analysis and reporting

### 7. Pallet Management

#### Base: `/api/v1/pallets`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `GET` | `/` | Get pallets with status and contents | Private |
| `POST` | `/` | Create new pallet for panels | Private |
| `GET` | `/:id` | Get specific pallet details | Private |
| `PUT` | `/:id` | Update pallet information | Private |
| `POST` | `/:id/complete` | Mark pallet as complete | Private |

**Features:**
- Automated pallet generation
- Capacity management
- Shipping preparation
- Label printing integration

### 8. Performance Monitoring

#### Base: `/api/v1/performance`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `GET` | `/` | Get performance overview | Private |
| `GET` | `/metrics` | Get detailed performance metrics | Private |
| `GET` | `/alerts` | Get performance alerts | Private |
| `GET` | `/optimization` | Get optimization suggestions | Private |

**Features:**
- Response time tracking
- Resource utilization monitoring
- Performance alerts
- Optimization recommendations

### 9. Error Handling & Recovery

#### Base: `/api/v1/error-handling`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `GET` | `/` | Get error handling overview | Private |
| `GET` | `/circuit-breakers` | Get circuit breaker status | Private |
| `POST` | `/recovery` | Trigger error recovery | Private |
| `GET` | `/trends` | Get error trend analysis | Private |

**Features:**
- Circuit breaker pattern implementation
- Error classification and categorization
- Recovery automation
- Trend analysis and reporting

### 10. System Metrics

#### Base: `/api/v1/metrics`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| `GET` | `/` | Get comprehensive system metrics | Private |
| `GET` | `/manufacturing` | Get manufacturing-specific metrics | Private |
| `GET` | `/database` | Get database performance metrics | Private |
| `GET` | `/performance` | Get system performance metrics | Private |

**Features:**
- Production metrics tracking
- Database performance monitoring
- System health monitoring
- Real-time metrics updates

## API Standards & Conventions

### HTTP Methods

- **GET**: Retrieve data (read operations)
- **POST**: Create new resources
- **PUT**: Update existing resources (full update)
- **PATCH**: Partial resource updates
- **DELETE**: Remove resources

### Response Format

All API responses follow a standardized format:

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Success message",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "unique-request-identifier"
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* additional error details */ }
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "unique-request-identifier"
}
```

### HTTP Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **422**: Unprocessable Entity
- **429**: Too Many Requests (rate limiting)
- **500**: Internal Server Error
- **501**: Not Implemented (development endpoints)
- **503**: Service Unavailable

### Query Parameters

#### Pagination
```
?limit=50&offset=0
```

#### Filtering
```
?status=PENDING&line=1&moId=123
```

#### Sorting
```
?sort=created_at&order=desc
```

#### Search
```
?search=barcode_pattern
```

### Request Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
x-station-id: <station_number>
x-line-number: <line_number>
```

### Rate Limiting

- **Limit**: 1000 requests per 15 minutes per station
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Manufacturing-Specific Features

### Dual-Line Support

- **Line 1**: Stations 1-4, Panel Types: 36, 40, 60, 72
- **Line 2**: Stations 5-8, Panel Type: 144

### Station Workflow

1. **Station 1**: Assembly & EL
2. **Station 2**: Framing
3. **Station 3**: Junction Box
4. **Station 4**: Performance & Final Inspection

### Barcode Format

```
CRSYYFBPP#####
├── CRS: Company prefix
├── YY: Year (2 digits)
├── F: Framed indicator (F=Yes, B=No)
├── B: Backsheet type
├── PP: Panel type (36, 40, 60, 72, 144)
└── #####: Sequence number
```

### Quality Control

- **Pass/Fail Logic**: One-touch pass, selective fail criteria
- **Criteria Configuration**: Station-specific validation rules
- **Override Support**: Manual specification overrides
- **Notes System**: Comprehensive note-taking for quality issues

## Development & Testing

### Development Mode

Many endpoints return `501 Not Implemented` responses during development, providing:

- Detailed endpoint documentation
- Expected request/response formats
- Implementation status information
- Development guidance

### Testing Endpoints

- **Health Checks**: `/health`, `/status`, `/ready`, `/live`
- **API Documentation**: `/api/v1`, `/api/v1/endpoints`, `/api/v1/status`
- **Metrics**: `/metrics` (Prometheus format)

### Development Tools

- **Comprehensive Logging**: Manufacturing-specific logging with station context
- **Error Tracking**: Detailed error classification and recovery
- **Performance Monitoring**: Real-time performance metrics
- **Database Health**: Connection pool monitoring and health checks

## Security Features

### Authentication

- JWT-based token system
- Secure password hashing (bcrypt)
- Token expiration and refresh
- Station assignment validation

### Authorization

- Role-based access control
- Station-specific permissions
- Manufacturing workflow validation
- Audit trail logging

### Security Headers

- Helmet security headers
- CORS configuration for PWA tablets
- Rate limiting for production protection
- Request size limiting

## Performance Optimizations

### Database

- Connection pooling (pg-pool)
- Optimized queries with indexing
- Transaction management
- Connection health monitoring

### Caching

- Response caching strategies
- Database query optimization
- Performance metrics tracking
- Resource utilization monitoring

### Real-time Updates

- WebSocket support for station updates
- Live production monitoring
- Real-time status updates
- Performance alerts

## Implementation Status

### Completed (70%)

- ✅ Express server foundation
- ✅ Security middleware stack
- ✅ Logging and monitoring
- ✅ Error handling system
- ✅ Database connection pool
- ✅ Route structure and organization
- ✅ Authentication system
- ✅ Barcode processing core

### In Development (30%)

- 🔄 Station workflow implementation
- 🔄 Panel management endpoints
- 🔄 Manufacturing order system
- 🔄 Inspection workflow
- 🔄 Pallet management
- 🔄 Comprehensive testing

## Next Steps

1. **Complete station workflow implementation**
2. **Implement panel management endpoints**
3. **Build manufacturing order system**
4. **Create inspection workflow**
5. **Develop pallet management**
6. **Add comprehensive testing**

## Support & Documentation

- **API Documentation**: Available at `/api/v1` and `/api/v1/endpoints`
- **Implementation Status**: Check `/api/v1/status`
- **Health Monitoring**: Use `/health`, `/status`, `/ready`, `/live`
- **Error Handling**: Comprehensive error codes and recovery strategies
- **Development Guidance**: Detailed endpoint documentation in 501 responses

The API is designed to be production-ready with comprehensive error handling, security features, and manufacturing-specific optimizations. While many endpoints are still in development, the foundation is solid and ready for production deployment.
