# Solar Panel Production Tracking Backend

## Manufacturing-Optimized Express API Server

This backend API serves the solar panel production tracking system for dual-line manufacturing operations.

### Directory Structure

```
backend/
├── server.js                   # Main Express server entry point
├── config/                     # Environment and database configuration
├── controllers/                # Route handlers for each workflow
│   ├── stations/              # Station workflow controllers
│   ├── panels/                # Panel management controllers
│   ├── manufacturing-orders/  # MO creation and tracking
│   ├── inspections/           # Pass/fail inspection logic
│   ├── pallets/               # Pallet management controllers
│   └── auth/                  # Authentication controllers
├── services/                   # Business logic and workflow services
├── middleware/                 # Express middleware (auth, validation, logging)
├── routes/                     # API route definitions
└── utils/                      # Helper functions and utilities
```

### Manufacturing Workflow Support

- **4-Station Production Flow**: Assembly & EL → Framing → Junction Box → Performance & Final
- **Dual-Line Operations**: Line 1 (36,40,60,72) and Line 2 (144)
- **Barcode Processing**: CRSYYFBPP##### format validation
- **Pass/Fail Logic**: One-touch pass, selective fail criteria
- **Real-time Updates**: WebSocket support for 8 concurrent stations
- **Offline Sync**: Local storage with USB export capability

### Performance Requirements

- **Response Time**: <2 seconds for barcode scan to workflow initiation
- **Concurrent Users**: 8 stations simultaneously (4 per line)
- **Database**: PostgreSQL with optimized connection pooling
- **Reliability**: 99.9% uptime for production floor operations

### API Endpoints (Planned)

```
/api/v1/stations          # Station workflow management
/api/v1/panels            # Panel tracking and status
/api/v1/manufacturing-orders  # MO creation and monitoring
/api/v1/inspections       # Pass/fail inspection records
/api/v1/pallets          # Automated pallet management
/api/v1/auth             # Authentication and authorization
/health                  # Health check endpoint
/status                  # Server status and metrics
```

### Technology Stack

- **Framework**: Express.js with ES6 modules
- **Database**: PostgreSQL with pg driver
- **Security**: Helmet, CORS, rate limiting
- **Validation**: Express-validator with barcode format validation
- **Logging**: Morgan with manufacturing-specific logging
- **Real-time**: Socket.io for station updates
