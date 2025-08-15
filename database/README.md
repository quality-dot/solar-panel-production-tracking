# Solar Panel Production Tracking Database

This directory contains the complete database schema for the Solar Panel Production Tracking System.

## 🗂️ Directory Structure

```
database/
├── migrations/           # SQL migration files
├── scripts/             # Database setup and utility scripts
├── seeds/               # Initial data and test datasets
├── config.js           # Database connection configuration
└── README.md           # This file
```

## 📋 Database Schema Overview

### Core Tables Created

1. **Enum Types** (001_create_enums.sql)
   - `user_role_type` - User permission levels
   - `panel_status_type` - Panel workflow states
   - `station_type` - Types of inspection stations
   - `line_type` - Production lines (LINE_1, LINE_2)
   - `panel_type_enum` - Panel types (36, 40, 60, 72, 144)
   - Additional enums for MO status, pallet status, etc.

2. **Users Table** (002_create_users_table.sql)
   - User authentication and authorization
   - Role-based access control (4 roles)
   - Station assignments for inspectors
   - Security features (login attempts, account locking)

3. **Stations Table** (003_create_stations_table.sql)
   - 8 stations configuration (4 per line)
   - Station-specific criteria configuration
   - Line assignment and station types

4. **Manufacturing Orders Table** (004_create_manufacturing_orders_table.sql)
   - Production order tracking
   - Quantity management (target, completed, failed)
   - Barcode generation parameters
   - Status automation with triggers

## 🚀 Quick Setup

### Prerequisites
- PostgreSQL 15+ installed
- Database user with CREATE privileges

### 1. Create Database and User

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Run the initialization script
\i database/scripts/init-database.sql
```

### 2. Run Migrations

```bash
# Connect to the application database
psql -U solar_panel_user -d solar_panel_tracking

# Run migrations in order
\i database/migrations/001_create_enums.sql
\i database/migrations/002_create_users_table.sql
\i database/migrations/003_create_stations_table.sql
\i database/migrations/004_create_manufacturing_orders_table.sql

# Record migrations
INSERT INTO schema_migrations (migration_name) VALUES 
    ('001_create_enums'),
    ('002_create_users_table'),
    ('003_create_stations_table'),
    ('004_create_manufacturing_orders_table');
```

### 3. Verify Setup

```sql
-- Check all tables were created
\dt

-- Check enum types
\dT

-- Verify initial station data
SELECT id, name, station_type, line, station_number FROM stations ORDER BY line, station_number;
```

## 🔧 Configuration

### Environment Variables

Copy `database-env-template.txt` to `.env` and update with your settings:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=solar_panel_tracking
DB_USER=solar_panel_user
DB_PASSWORD=your_secure_password
```

### Application Connection

The database configuration is in `database/config.js` with support for:
- Development environment
- Production environment (with SSL)
- Test environment

## 📊 Current Schema Status

### ✅ Completed Subtasks
- 1.3: Enum types and constants ✅
- 1.4: Users table and authentication ✅
- 1.5: Stations configuration ✅
- 1.7: Manufacturing orders ✅

### 🔄 Next Steps
- 1.6: Panels table (core tracking)
- 1.8: Pallets and pallet assignments
- 1.9: Inspections and criteria results
- 1.10: Audit logging
- 1.11: System configuration
- 1.12: Station criteria definitions
- 1.13: Foreign key relationships
- 1.14: Performance indexes
- 1.15: Triggers and stored procedures
- 1.16: Initial data and test dataset

## 🏗️ Architecture Features

### Barcode System
- Format: `CRSYYFBPP#####`
- Automatic line assignment based on panel type
- Sequential number generation per MO

### Dual-Line Production
- **Line 1**: Panel types 36, 40, 60, 72
- **Line 2**: Panel type 144
- 4 stations per line (8 total)

### Role-Based Security
- **STATION_INSPECTOR**: Limited to assigned stations
- **PRODUCTION_SUPERVISOR**: Monitoring + basic admin
- **QC_MANAGER**: Quality reports + advanced admin
- **SYSTEM_ADMIN**: Full system access

### Performance Features
- Comprehensive indexing strategy
- JSONB for flexible configurations
- Audit trail for compliance
- Automatic triggers for data consistency

## 🧪 Testing

The database includes:
- Data validation constraints
- Referential integrity checks
- Performance optimization
- Test data generation (coming in 1.16)

## 📚 Documentation

Each migration file includes:
- Detailed table documentation
- Column comments
- Constraint explanations
- Index rationale

For specific table details, see the individual migration files in the `migrations/` directory.
