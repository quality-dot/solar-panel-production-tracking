# Changelog
## Solar Panel Production Tracking System - MRP

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project documentation structure
- Product Requirements Document (PRD)
- Technology Stack documentation
- Implementation Plan with 6-month timeline
- Database Schema design
- README with executive summary

### Changed
- **MAJOR SIMPLIFICATION**: Reduced from complex multi-station configuration to 4 clear stations
  - Station 1: Assembly & EL
  - Station 2: Framing  
  - Station 3: Junction Box
  - Station 4: Performance & Final
- **REMOVED**: Complex 2a/2b station configurations
- **REMOVED**: Central database requirement for Phase 1
- **REMOVED**: Image upload functionality for Phase 1
- **SIMPLIFIED**: Line management (Line 1 vs Line 2 based on panel type)
- **SIMPLIFIED**: Technology stack to focus on core functionality

### Technical Decisions
- **Local Storage Only**: Phase 1 focuses on local storage with USB export capability
- **React Native**: Cross-platform station applications for tablets/laptops
- **Python + FastAPI**: High-performance backend API
- **PostgreSQL**: Local database for MO/pallet tracking
- **SQLite**: Station-level local storage
- **Redis**: Queue management for sync operations

### Key Features Maintained
- One-touch Pass/Fail interface
- Navigation dropdown for station selection
- MO tracking with alerts at 50 panels remaining
- Automated pallet management (25/26 panels configurable)
- Rework flow with point-of-failure re-entry
- Admin dashboard for system management

### Hardware Requirements
- **8 stations max** (4 production + 4 rework)
- **Bluetooth barcode scanners** for panel identification
- **Beijing Delicacy Laser interface** for electrical data capture
- **CUPS print server** for labels and pallet sheets

### Data Management
- **Local storage only** with USB export capability
- **No automatic server uploads** in Phase 1
- **Offline operation** with sync when online
- **Manual sync options** available

## [0.1.0] - 2025-01-15

### Added
- Initial MRP documentation
- Executive summary with simplified approach
- Technology stack documentation
- Implementation plan with realistic timeline
- Database schema for local storage
- Hardware requirements specification

### Changed
- **SIMPLIFIED APPROACH**: Focus on getting panels down the line efficiently
- **PHASE 1 ONLY**: Removed complex Phase 2 features for initial implementation
- **LOCAL STORAGE**: Eliminated central database dependency for Phase 1
- **4-STATION FLOW**: Streamlined station configuration

### Removed
- Complex station configurations (2a/2b combinations)
- Image upload requirements for Phase 1
- Central database integration for Phase 1
- AI features for Phase 1
- Voice notes for Phase 1

---

## Version History

### v0.1.0 (Current)
- **Focus**: Simplified digital replacement for paper assembly sheets
- **Scope**: 4-station system with local storage only
- **Timeline**: 6-month Phase 1 implementation
- **Technology**: React Native + Python FastAPI + Local Storage

### Future Versions
- **v1.0.0**: Production-ready system with all Phase 1 features
- **v2.0.0**: Phase 2 features (AI integration, voice notes, central database)
- **v3.0.0**: Advanced analytics and predictive features

---

## Decision Log

### 2025-01-15: Major Simplification Decision
**Context**: Original MRP was overly complex with multiple station configurations and central database requirements.

**Decision**: Simplified to 4-station system with local storage only for Phase 1.

**Rationale**: 
- Faster time to market
- Reduced complexity and risk
- Focus on core functionality
- Easier implementation and testing
- Lower initial cost and resource requirements

**Impact**: 
- Reduced development timeline from 12 months to 6 months
- Simplified technology stack
- Clearer requirements and implementation path
- More achievable Phase 1 goals

### 2025-01-15: Local Storage Only Decision
**Context**: Original design required central database and image uploads.

**Decision**: Phase 1 uses local storage only with USB export capability.

**Rationale**:
- Eliminates network dependency for core functionality
- Reduces infrastructure complexity
- Enables offline operation
- Simplifies data management
- Allows for future central database integration

**Impact**:
- Simplified architecture
- Reduced infrastructure requirements
- Improved reliability in industrial environments
- Clear data export path for analysis 