# Product Requirements Document (PRD)
## Solar Panel Production Tracking System - MRP

### 1. Executive Summary

**Product Vision**: Digital production tracking system for dual-line solar panel manufacturing. Replaces paper assembly sheets with barcode-based Pass/Fail tracking through 4 stations per line (8 total). All criteria are Pass/Fail except three manual numeric entries: Wattage (Pmax), Vmp, and Imp.

**Business Objective**: Eliminate paper-based tracking, reduce errors, improve traceability, and enable real-time production monitoring with offline capability for manufacturing reliability.

**Success Metrics**:
- 100% digital replacement of paper assembly sheets
- Zero data loss during network outages (local storage)
- 50% reduction in tracking errors
- Real-time production visibility across dual-line facility
- Automated pallet management

### 2. Product Overview

#### 2.1 Core Functionality
- **Barcode-triggered workflows** at each station
- **Pass/Fail quality control** with one-touch functionality
- **Manual numeric entry** for only 3 electrical values
- **Dual-line production** with automatic routing
- **Local storage** with USB export capability
- **Rework routing** with point-of-failure re-entry
- **Real-time production tracking** across all stations
- **Automated pallet management** with configurable sizes

#### 2.2 Target Users
- **Station Inspectors**: Primary users scanning barcodes and marking pass/fail
- **Production Supervisors**: Monitoring real-time production status across dual lines
- **Quality Control Managers**: Reviewing test results and managing rework
- **System Administrators**: Managing MOs, station configuration, and user access

### 3. Detailed Requirements

#### 3.1 Data Recording System

**Pass/Fail Only**: All inspection criteria are Pass/Fail with one-touch functionality

**Manual Numeric Entry**: Only 3 fields require manual entry:
- Wattage (Pmax)
- Vmp
- Imp

**Theoretical Values**: Voc and Isc calculated from panel type

#### 3.2 Station Workflow Requirements

**Station 1 - Assembly & EL**
- Glass placement (smooth side down)
- Barcode application point
- **Pass/Fail Criteria**:
  - Solder joints
  - String spacing
  - Polarity
  - Nubs trimmed
  - Insulation
  - Mirror examination (Line 1 only - N/A greyed out for Line 2)

**Station 2 - Framing**
- **Pass/Fail Criteria**:
  - Panel trimmed
  - Panel sufficiently cleaned
  - Barcode verified
  - No visible flaws

**Station 3 - Junction Box**
- Last chance before lamination
- **Pass/Fail Criteria**:
  - Potting gel applied
  - J-box soldered
  - J-box capped
  - EL tested
  - Barcode verified
  - EVA and backsheet alignment

**Station 4 - Performance & Final Inspection**
- **Manual Entry (3 fields only)**:
  - Wattage (Pmax)
  - Vmp
  - Imp
- **Pass/Fail Criteria**:
  - Wattage output verification
  - High pot test
  - Second EL test (Line 2 only - N/A greyed out for Line 1)
  - Long sticker applied
  - Panel ID and labeling verification
  - Cell integrity
  - Frame inspection
  - Frame continuity test
  - Glass clean
  - Line/ribbon spacing
  - Busbar/insulation
  - J-box inspection
  - Lamination/backsheet
- **Actions**: Print long sticker on Pass

#### 3.3 Line Assignment Rules

**Line 1**: Panel types 36, 40, 60, 72
**Line 2**: Panel type 144
**Automatic routing** based on barcode

#### 3.4 Panel Identification

**Barcode Format**: CRSYYFBPP#####
- CRS: Crossroads Solar
- YY: Year (e.g., 25 for 2025)
- F: Frame type (W=silver, B=black)
- B: Backsheet (T=transparent, W=white, B=black)
- PP: Panel type (36, 40, 60, 72, 144)
- #####: Sequential number

#### 3.5 Pass/Fail Logic

**Pass Button**: One touch marks all criteria as Pass
**Fail Button**: Prompts for specific failed criteria selection
**Required Notes**: F (failure) and B (cosmetic defect) panels
**Other Category**: For defects not in criteria list

#### 3.6 Rework Flow

**Rework Process**:
- Failed panels route to rework station
- Re-entry at point of failure (not Station 1)
- Automatic queue reinsertion on rescan
- Failure reason tracking

#### 3.7 Manufacturing Order (MO) Management

**MO Creation**:
- Admin creates MO with panel type and quantity
- BOM verification against barcode templates
- Progress tracking with alerts at 50 panels remaining
- Automatic MO closure and reporting

**MO Management**:
- Real-time progress monitoring
- Alert system for low inventory
- Automatic completion reporting
- Historical data access
- F and B panel list per MO

#### 3.8 Pallet Management

**Automated Features**:
- Automatic prompt every 25/26 panels (configurable)
- Manual pallet generation option (scan all panels)
- Manual override for custom quantities
- Pallet sheet includes:
  - Serial numbers
  - Wattage, Vmp, Imp (when available)
  - Date/time stamps
  - Total panel count

**Pallet Operations**:
- Automatic electrical data compilation
- Label printing at final inspection
- Pallet sheet generation
- Daily pallet count tracking

#### 3.9 Admin Dashboard

**Admin Features**:
- MO creation and monitoring
- Pallet size configuration (25/26/custom)
- Operator station assignment
- Daily pallet count tracking
- F/B panel reporting by MO
- Manual pallet sheet generation
- Production metrics and export

### 4. Data Management

#### 4.1 Local Storage Only (Phase 1)
- Panel tracking: SN, Pass/Fail, Notes, Wattage/Vmp/Imp, Date/Time
- No automatic server uploads
- USB export capability for data retrieval
- Offline operation with automatic sync when online
- Manual sync option available

#### 4.2 Future Phases
- Central database integration
- EL image capture and storage
- Automated data acquisition from test equipment
- Voice notes capability
- AI chat features
- Inventory management

### 5. Technical Requirements

#### 5.1 Performance Requirements
- **Response Time**: < 2 seconds for barcode scan to workflow initiation
- **Local Storage**: 800 panels with full data
- **Sync Speed**: Background sync within 30 seconds of connection restoration
- **Concurrent Users**: Support for 8 stations simultaneously (4 per line)
- **Data Retention**: 7 years for compliance

#### 5.2 Security Requirements
- User authentication and authorization
- Role-based access control
- Audit trail for all operations
- Secure data transmission
- Local data encryption

#### 5.3 Reliability Requirements
- 99.9% uptime for online operations
- Zero data loss during network outages
- Automatic backup and recovery
- Conflict resolution by timestamp
- Graceful degradation during network issues

### 6. User Interface Requirements

#### 6.1 Station Application UI
- **Large, touch-friendly buttons** for pass/fail actions
- **Clear visual indicators** for current station and status
- **Navigation dropdown** for station selection
- **Barcode scan feedback** with audio/visual confirmation
- **Offline status indicator**
- **Manual entry fields** for Wattage, Vmp, Imp
- **N/A handling** for line-specific tests (greyed out)
- **One-touch Pass** functionality
- **Fail criteria selection** interface

#### 6.2 Admin Dashboard UI
- **Real-time production monitoring** with visual indicators
- **MO management interface** with creation and monitoring
- **Station configuration controls** for flow management
- **User management** with role assignment
- **Analytics and reporting** with export capabilities
- **Dual-line production views**

### 7. Integration Requirements

#### 7.1 Hardware Integration
- **Bluetooth 2D barcode scanners** (Honeywell/Zebra)
- **Label printers** (Zebra ZT410 or similar)
- **Network printers** for pallet sheets
- **Industrial WiFi** with mesh capability
- **Rugged tablets/laptops** for 8 production stations

#### 7.2 External Systems
- **ERP integration** for MO data
- **Quality management system** integration
- **Inventory management** system connection
- **Reporting system** integration

### 8. Deployment Requirements

#### 8.1 Infrastructure
- **On-premise server** with 16GB RAM, 500GB storage
- **Docker containerization** for easy deployment
- **UPS backup** for server and network equipment
- **Local storage** for data (no central database in Phase 1)

#### 8.2 Station Hardware
- **8 rugged Windows/Android tablets** or laptops (4 per line)
- **Protective cases** with stands
- **Reliable WiFi** with ethernet backup
- **Bluetooth scanners** for barcode reading

### 9. Future Enhancements

#### 9.1 Phase 2 Features
- **EL image capture and storage**
- **Automated data acquisition** from test equipment
- **Voice notes** for failure documentation
- **AI-powered quality prediction**
- **Advanced analytics** and machine learning

#### 9.2 AI Integration
- **Chat features** for troubleshooting
- **Automated quality assessment**
- **Predictive failure detection**
- **Smart routing** optimization

### 10. Success Criteria

#### 10.1 Technical Success
- Complete elimination of paper-based tracking
- Zero data loss during network outages
- Real-time production visibility across dual lines
- Automated pallet management

#### 10.2 Business Success
- 50% reduction in tracking errors
- Improved production efficiency
- Enhanced quality control
- Better audit trail compliance

### 11. Risk Assessment

#### 11.1 Technical Risks
- **Network connectivity** issues affecting real-time updates
- **Hardware failure** at stations
- **Data synchronization** conflicts
- **Barcode scanner** compatibility issues

#### 11.2 Mitigation Strategies
- **Local storage** with USB export capability
- **Redundant hardware** at critical stations
- **Conflict resolution** by timestamp
- **Multiple scanner** compatibility testing

### 12. Timeline and Milestones

#### 12.1 Phase 1 (Core System)
- **Month 1-2**: Backend API development
- **Month 2-3**: Station application development
- **Month 3-4**: Admin dashboard development
- **Month 4-5**: Integration and testing
- **Month 5-6**: Deployment and training

#### 12.2 Phase 2 (Enhancements)
- **Month 7-8**: Image capture integration
- **Month 8-9**: Automated data acquisition
- **Month 9-10**: Advanced analytics
- **Month 10-12**: AI-powered features

### 13. Conclusion

This PRD outlines a comprehensive digital transformation of the dual-line solar panel production tracking system, replacing paper-based processes with a modern, scalable, and reliable digital solution. The system prioritizes local storage, real-time tracking, and automated quality control while maintaining flexibility for future AI enhancements. 