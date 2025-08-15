# Solar Panel Production Tracking System - MRP

## Executive Summary

Simplified digital replacement for paper assembly sheets. React-based system tracking panels through 4 stations with Pass/Fail functionality, automated pallet management, and local data storage. No image uploads or central database in Phase 1.

## Technology Stack

### Frontend
- **React Native** - Cross-platform app for tablets/laptops
- **React** - Admin dashboard web interface
- **Bluetooth Scanner SDK** - Barcode scanner integration
- **Local Storage API** - Device-based data persistence

### Backend
- **Python + FastAPI** - API server
- **PostgreSQL** - Local database for MO/pallet tracking
- **Redis** - Queue management for sync operations
- **WebSockets** - Real-time station updates

### Infrastructure
- **Local SQLite** - Per-device panel tracking
- **CUPS Print Server** - Pallet sheet and label printing
- **Docker** - Containerized deployment

## Hardware Requirements

### Per Station (8 stations max: 4 production + 4 rework)
- Rugged Windows/Android laptop or tablet
- Bluetooth 2D barcode scanner
- Network connectivity (WiFi with ethernet backup)

### Centralized Hardware
- Label printer (Station 4) - Long sticker printing
- Network printer - Pallet sheet printing
- Local server - Database and print services
- Beijing Delicacy Laser interface - For automated data capture (Pmax, Voc, Isc, Vmp, Imp)

## System Components

### 1. Station Application

**Navigation**: Dropdown menu for station selection
**Scanning**: Auto-detect panel location with manual override
**Pass/Fail**: Single touch toggles all criteria to Pass
**Fail Handling**: Prompts for specific failed criteria selection
**Notes**: Required for F (fail) and B (cosmetic defect) panels
**Other**: Additional failure category beyond listed criteria

### 2. Station Configuration (4 Stations)

**Station 1 - Assembly & EL**
- Glass placement and barcode application
- Solder joints, string spacing, polarity checks
- Mirror examination (Line 1 only - shows N/A for Line 2)

**Station 2 - Framing**
- Panel trimming and cleaning
- Barcode verification
- Visual inspection

**Station 3 - Junction Box**
- Potting gel application
- J-box capping
- Pre-lamination checks

**Station 4 - Performance & Final**
- Manual entry: Pmax, Voc, Isc, Vmp, Imp
- High pot test Pass/Fail
- Second EL test (Line 2 only - shows N/A for Line 1)
- Long sticker printing on Pass
- Pallet assignment

### 3. Panel Identification

**Barcode Format**: CRSYYFBPP#####
- CRS: Crossroads Solar
- YY: Year (e.g., 25 for 2025)
- F: Frame type (W=silver, B=black)
- B: Backsheet (T=transparent, W=white, B=black)
- PP: Panel type (36, 40, 60, 72, 144)
- #####: Sequential number

### 4. Line Assignment Rules

- Line 1: All panels except 450W (types 36, 40, 60, 72)
- Line 2: 450W panels only (type 144)
- Automatic line detection based on barcode

### 5. Manufacturing Order (MO) System

- Admin creates MO with panel type and quantity
- Barcode template validation against MO
- Alert at 50 panels remaining
- F and B panel list per MO

### 6. Pallet Management

- Automatic prompt every 25/26 panels (configurable)
- Manual pallet generation by scanning all panels
- Manual override for custom quantities
- Pallet sheet includes:
  - All panel serial numbers
  - Electrical parameters (when available)
  - Date/time stamps
  - Total count

### 7. Rework Flow

- Failed panels marked for specific station return
- Re-entry at failure point (not Station 1)
- Automatic queue reinsertion on rescan

### 8. Admin Dashboard

- MO creation and monitoring
- Pallet size configuration (25/26/custom)
- Station assignment for operators
- Daily pallet count tracking
- F/B panel reporting by MO
- Manual pallet sheet generation

## Data Management

### Local Storage Only (Phase 1)
- Panel tracking: SN, Pass/Fail, Notes, Wattage, Date/Time
- No automatic server uploads
- USB export capability for data retrieval
- Offline operation with automatic sync when online
- Manual sync option available

### Future Phases
- Central database integration
- EL image storage and matching
- Voice note capability
- AI chat features
- Inventory management

## Key Features

### Simplified Interface
- One-touch Pass (all criteria marked Pass)
- Fail prompts for specific criteria
- Required notes for F/B panels
- N/A handling for line-specific tests

### Quality Tracking
- Complete F/B panel list per MO
- Operator assignment per station
- Timestamp tracking
- Audit trail maintenance

### Automation
- Line detection from barcode
- Pallet completion prompts
- MO progress alerts
- Print queue management

## Project Timeline

**Phase 1 (6 months)**
- Month 1-2: Backend API development
- Month 2-3: Station application development
- Month 3-4: Admin dashboard development
- Month 4-5: Integration and testing
- Month 5-6: Deployment and training

## Documentation

- [Product Requirements Document (PRD)](PRD.md)
- [Technology Stack](TECH_STACK.md)
- [Implementation Plan](IMPLEMENTATION_PLAN.md)
- [Database Schema](DATABASE_SCHEMA.md)

## Getting Started

1. Review the [PRD](PRD.md) for detailed requirements
2. Check the [Technology Stack](TECH_STACK.md) for implementation details
3. Follow the [Implementation Plan](IMPLEMENTATION_PLAN.md) for development timeline
4. Reference the [Database Schema](DATABASE_SCHEMA.md) for data structure

## Contact

For questions or clarifications about the MRP, please refer to the detailed documentation in the linked files above. 