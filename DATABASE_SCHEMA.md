# Database Schema Documentation
## Solar Panel Production Tracking System - MRP

### 1. Overview

This document outlines the database schema for the simplified Solar Panel Production Tracking System. The system uses local storage with PostgreSQL for the main database and SQLite for station-level storage, with USB export capability for data retrieval.

### 2. Database Architecture

#### 2.1 Database Types
- **PostgreSQL**: Main local database for production data
- **SQLite**: Station-level local storage
- **Redis**: Queue management and real-time communication

#### 2.2 Data Flow
```
Station Device (SQLite) → Local Server (PostgreSQL) → USB Export
```

### 3. Core Tables

#### 3.1 Manufacturing Orders (MOs)

```sql
CREATE TABLE manufacturing_orders (
    id SERIAL PRIMARY KEY,
    mo_number VARCHAR(50) UNIQUE NOT NULL,
    panel_type VARCHAR(10) NOT NULL, -- 36, 40, 60, 72, 144
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
    created_by INTEGER REFERENCES users(id),
    notes TEXT
);

CREATE INDEX idx_mo_number ON manufacturing_orders(mo_number);
CREATE INDEX idx_mo_status ON manufacturing_orders(status);
```

#### 3.2 Panels

```sql
CREATE TABLE panels (
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(50) UNIQUE NOT NULL,
    mo_id INTEGER REFERENCES manufacturing_orders(id),
    panel_type VARCHAR(10) NOT NULL, -- 36, 40, 60, 72, 144
    frame_type VARCHAR(1) NOT NULL, -- W (silver), B (black)
    backsheet_type VARCHAR(1) NOT NULL, -- T (transparent), W (white), B (black)
    year INTEGER NOT NULL,
    line_number INTEGER NOT NULL, -- 1 or 2
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'in_production', -- in_production, completed, failed, rework
    current_station INTEGER, -- 1, 2, 3, 4, rework
    notes TEXT
);

CREATE INDEX idx_serial_number ON panels(serial_number);
CREATE INDEX idx_mo_id ON panels(mo_id);
CREATE INDEX idx_status ON panels(status);
CREATE INDEX idx_current_station ON panels(current_station);
```

#### 3.3 Station Results

```sql
CREATE TABLE station_results (
    id SERIAL PRIMARY KEY,
    panel_id INTEGER REFERENCES panels(id),
    station_number INTEGER NOT NULL, -- 1, 2, 3, 4
    operator_id INTEGER REFERENCES users(id),
    result VARCHAR(10) NOT NULL, -- PASS, FAIL, B (cosmetic defect)
    notes TEXT,
    electrical_data JSONB, -- For Station 4: Pmax, Voc, Isc, Vmp, Imp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_panel_id ON station_results(panel_id);
CREATE INDEX idx_station_number ON station_results(station_number);
CREATE INDEX idx_result ON station_results(result);
```

#### 3.4 Station Criteria

```sql
CREATE TABLE station_criteria (
    id SERIAL PRIMARY KEY,
    station_number INTEGER NOT NULL,
    criterion_name VARCHAR(100) NOT NULL,
    criterion_type VARCHAR(20) NOT NULL, -- PASS_FAIL, N_A
    line_specific BOOLEAN DEFAULT FALSE,
    line_number INTEGER, -- NULL for both lines, 1 or 2 for specific lines
    order_index INTEGER NOT NULL,
    active BOOLEAN DEFAULT TRUE
);

-- Sample data for Station 1
INSERT INTO station_criteria (station_number, criterion_name, criterion_type, line_specific, line_number, order_index) VALUES
(1, 'Glass Placement', 'PASS_FAIL', FALSE, NULL, 1),
(1, 'Barcode Application', 'PASS_FAIL', FALSE, NULL, 2),
(1, 'Solder Joints', 'PASS_FAIL', FALSE, NULL, 3),
(1, 'String Spacing', 'PASS_FAIL', FALSE, NULL, 4),
(1, 'Polarity Check', 'PASS_FAIL', FALSE, NULL, 5),
(1, 'Mirror Examination', 'PASS_FAIL', TRUE, 1, 6);

-- Sample data for Station 2
INSERT INTO station_criteria (station_number, criterion_name, criterion_type, line_specific, line_number, order_index) VALUES
(2, 'Panel Trimming', 'PASS_FAIL', FALSE, NULL, 1),
(2, 'Cleaning', 'PASS_FAIL', FALSE, NULL, 2),
(2, 'Barcode Verification', 'PASS_FAIL', FALSE, NULL, 3),
(2, 'Visual Inspection', 'PASS_FAIL', FALSE, NULL, 4);

-- Sample data for Station 3
INSERT INTO station_criteria (station_number, criterion_name, criterion_type, line_specific, line_number, order_index) VALUES
(3, 'Potting Gel Application', 'PASS_FAIL', FALSE, NULL, 1),
(3, 'J-box Capping', 'PASS_FAIL', FALSE, NULL, 2),
(3, 'Pre-lamination Checks', 'PASS_FAIL', FALSE, NULL, 3);

-- Sample data for Station 4
INSERT INTO station_criteria (station_number, criterion_name, criterion_type, line_specific, line_number, order_index) VALUES
(4, 'Manual Entry - Pmax', 'PASS_FAIL', FALSE, NULL, 1),
(4, 'Manual Entry - Voc', 'PASS_FAIL', FALSE, NULL, 2),
(4, 'Manual Entry - Isc', 'PASS_FAIL', FALSE, NULL, 3),
(4, 'Manual Entry - Vmp', 'PASS_FAIL', FALSE, NULL, 4),
(4, 'Manual Entry - Imp', 'PASS_FAIL', FALSE, NULL, 5),
(4, 'High Pot Test', 'PASS_FAIL', FALSE, NULL, 6),
(4, 'Second EL Test', 'PASS_FAIL', TRUE, 2, 7);
```

#### 3.5 Criteria Results

```sql
CREATE TABLE criteria_results (
    id SERIAL PRIMARY KEY,
    station_result_id INTEGER REFERENCES station_results(id),
    criterion_id INTEGER REFERENCES station_criteria(id),
    result VARCHAR(10) NOT NULL, -- PASS, FAIL, N_A
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_station_result_id ON criteria_results(station_result_id);
CREATE INDEX idx_criterion_id ON criteria_results(criterion_id);
```

#### 3.6 Pallets

```sql
CREATE TABLE pallets (
    id SERIAL PRIMARY KEY,
    pallet_number VARCHAR(50) UNIQUE NOT NULL,
    mo_id INTEGER REFERENCES manufacturing_orders(id),
    panel_count INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_pallet_number ON pallets(pallet_number);
CREATE INDEX idx_mo_id ON pallets(mo_id);
CREATE INDEX idx_status ON pallets(status);
```

#### 3.7 Pallet Panels

```sql
CREATE TABLE pallet_panels (
    id SERIAL PRIMARY KEY,
    pallet_id INTEGER REFERENCES pallets(id),
    panel_id INTEGER REFERENCES panels(id),
    position_in_pallet INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pallet_id ON pallet_panels(pallet_id);
CREATE INDEX idx_panel_id ON pallet_panels(panel_id);
```

#### 3.8 Users

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL, -- admin, operator, supervisor
    station_assignment INTEGER, -- NULL for admin, station number for operators
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_username ON users(username);
CREATE INDEX idx_role ON users(role);
CREATE INDEX idx_station_assignment ON users(station_assignment);
```

#### 3.9 System Configuration

```sql
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- Sample configuration data
INSERT INTO system_config (config_key, config_value, description) VALUES
('default_pallet_size', '25', 'Default number of panels per pallet'),
('mo_alert_threshold', '50', 'Alert when MO has this many panels remaining'),
('line_1_panel_types', '36,40,60,72', 'Panel types for Line 1'),
('line_2_panel_types', '144', 'Panel types for Line 2'),
('beijing_delicacy_laser_enabled', 'true', 'Enable automatic electrical data capture');
```

### 4. SQLite Schema (Station Level)

#### 4.1 Local Panel Data

```sql
CREATE TABLE local_panels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serial_number TEXT UNIQUE NOT NULL,
    mo_number TEXT NOT NULL,
    panel_type TEXT NOT NULL,
    frame_type TEXT NOT NULL,
    backsheet_type TEXT NOT NULL,
    year INTEGER NOT NULL,
    line_number INTEGER NOT NULL,
    status TEXT DEFAULT 'in_production',
    current_station INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_at DATETIME
);

CREATE INDEX idx_local_serial_number ON local_panels(serial_number);
CREATE INDEX idx_local_mo_number ON local_panels(mo_number);
CREATE INDEX idx_local_status ON local_panels(status);
```

#### 4.2 Local Station Results

```sql
CREATE TABLE local_station_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    panel_id INTEGER NOT NULL,
    station_number INTEGER NOT NULL,
    operator_id INTEGER NOT NULL,
    result TEXT NOT NULL,
    notes TEXT,
    electrical_data TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_at DATETIME
);

CREATE INDEX idx_local_panel_id ON local_station_results(panel_id);
CREATE INDEX idx_local_station_number ON local_station_results(station_number);
```

### 5. Redis Data Structures

#### 5.1 Queue Management

```redis
# Sync queue for offline operations
SYNC_QUEUE: [panel_id, station_result_id, operation_type, timestamp]

# Real-time updates
REALTIME_UPDATES: [station_id, panel_id, status, timestamp]

# Session management
SESSION:{user_id}: {token, expires_at, station_assignment}
```

### 6. Data Export Schema

#### 6.1 USB Export Format

```json
{
  "export_metadata": {
    "export_date": "2025-01-15T10:30:00Z",
    "exported_by": "admin_user",
    "data_range": "2025-01-01 to 2025-01-15"
  },
  "manufacturing_orders": [...],
  "panels": [...],
  "station_results": [...],
  "pallets": [...],
  "failed_panels": [...],
  "cosmetic_defects": [...]
}
```

### 7. Data Validation Rules

#### 7.1 Panel Serial Number Validation

```python
# Barcode format: CRSYYFBPP#####
# CRS: Crossroads Solar
# YY: Year (e.g., 25 for 2025)
# F: Frame type (W=silver, B=black)
# B: Backsheet (T=transparent, W=white, B=black)
# PP: Panel type (36, 40, 60, 72, 144)
# #####: Sequential number

def validate_serial_number(serial_number: str) -> bool:
    pattern = r'^CRS(\d{2})([WB])([TWB])(36|40|60|72|144)(\d{5})$'
    return bool(re.match(pattern, serial_number))
```

#### 7.2 Line Assignment Logic

```python
def determine_line(panel_type: str) -> int:
    if panel_type == "144":
        return 2  # 450W panels
    else:
        return 1  # All other panels (36, 40, 60, 72)
```

### 8. Backup and Recovery

#### 8.1 Backup Strategy
- **Daily**: Full PostgreSQL database backup
- **Hourly**: Incremental PostgreSQL backup
- **Real-time**: SQLite local backups on station devices
- **Export**: USB export capability for data retrieval

#### 8.2 Recovery Procedures
- **Database**: Point-in-time recovery from PostgreSQL backups
- **Station Data**: Restore from local SQLite backups
- **Sync Conflicts**: Timestamp-based resolution with manual override

### 9. Performance Considerations

#### 9.1 Indexing Strategy
- Primary keys on all tables
- Foreign key indexes for join operations
- Composite indexes for common query patterns
- Full-text search indexes for notes and descriptions

#### 9.2 Query Optimization
- Prepared statements for repeated queries
- Connection pooling for database connections
- Query result caching with Redis
- Pagination for large result sets

This database schema provides a robust foundation for the simplified Solar Panel Production Tracking System, supporting local storage, real-time operations, and future scalability while maintaining data integrity and performance. 