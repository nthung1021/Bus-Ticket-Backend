# Vietnam Bus Booking System - Comprehensive Seed Data

This directory contains a complete, production-ready seeding system for the Vietnam Bus Booking System database. The seed data is designed to reflect realistic Vietnamese intercity bus operations with proper foreign key relationships and authentic Vietnamese data.

## 🚀 Quick Start

### Run Complete Seeding with Validation
```bash
npm run seed:vietnam:full
```

### Run Individual Commands
```bash
# Seed database only
npm run seed:vietnam

# Validate existing seed data
npm run validate:seed

# Development environment seeding
npm run seed:vietnam:dev

# Production environment seeding  
npm run seed:vietnam:prod
```

## 📁 File Structure

```
src/scripts/
├── seed-vietnam-bus-system.ts      # Main orchestration file
├── vietnam-seed-constants.ts       # Vietnam-specific data constants
├── vietnam-seed-functions.ts       # Core seeding functions (Part 1)
├── vietnam-seed-functions-part2.ts # Additional seeding functions (Part 2)
├── validate-vietnam-seed.ts        # Comprehensive validation script
└── README-SEED-VIETNAM.md         # This documentation
```

## 🎯 Generated Data Summary

| Entity | Count Range | Description |
|--------|-------------|-------------|
| **Users** | 50-60 | Vietnamese users with authentic names |
| **Operators** | 10-15 | Real Vietnamese bus companies |
| **Buses** | 60-70 | Various bus types with Vietnamese plate numbers |
| **Routes** | 35-40 | Intercity routes across Vietnam's 63 provinces |
| **Route Points** | 200+ | Pickup/dropoff points at major bus stations |
| **Trips** | 150-180 | Scheduled bus trips with realistic timing |
| **Seats** | 2,500+ | Individual seats based on bus capacity |
| **Seat Status** | 6,000+ | Availability status for each seat per trip |
| **Bookings** | 120-140 | Customer bookings with Vietnamese contact info |
| **Passenger Details** | 180+ | Vietnamese passenger information |
| **Payments** | 80-120 | Payment records for paid bookings |
| **Reviews** | 60-90 | Customer reviews in Vietnamese |
| **Notifications** | 200+ | Various notification types |
| **Audit Logs** | 150+ | System activity tracking |
| **Other Entities** | Various | Supporting data for complete system |

## 🇻🇳 Vietnamese Data Features

### Authentic Names
- Real Vietnamese first and last names
- Proper Vietnamese diacritics (ă, â, ê, ô, ơ, ư, etc.)
- Common Vietnamese name combinations

### Geographic Data
- All 63 provinces and municipalities of Vietnam
- Major intercity routes (Hà Nội ↔ TP. Hồ Chí Minh, etc.)
- Real bus station names across Vietnam
- Proper Vietnamese city names with diacritics

### Bus Companies
- Real Vietnamese bus operator names
- Authentic contact information patterns
- Proper Vietnamese business naming conventions

### Technical Details
- Vietnamese phone number formats (+84xx xxx xxxx)
- Vietnamese license plate formats (29B-123.45)
- Vietnamese booking reference patterns
- Proper Vietnamese currency amounts (VND)

## 🏗️ Seed Architecture

### Dependency-Aware Seeding Order
1. **Users & Authentication** - Base user accounts
2. **Operators & Buses** - Bus companies and fleet
3. **Seats & Layouts** - Physical bus configurations
4. **Routes & Route Points** - Geographic routing data
5. **Trips** - Scheduled bus services
6. **Seat Status** - Real-time seat availability
7. **Bookings & Passengers** - Customer reservations
8. **Payments** - Financial transactions
9. **Reviews & Feedback** - Customer opinions
10. **Notifications & Audit** - System communications and logs

### Foreign Key Management
- Maintains global ID collections to ensure referential integrity
- Prevents orphaned records
- Validates all relationships during seeding
- Supports cascade delete and set null operations

## ✅ Validation System

The validation script performs comprehensive checks on:

### 📊 **Record Counts**
- Validates minimum record counts for each table
- Ensures balanced data distribution
- Checks for reasonable data volumes

### 🔗 **Foreign Key Relationships**
- Verifies all FK constraints are satisfied
- Checks for orphaned records
- Validates cascade behaviors

### 🔑 **Unique Constraints**
- Ensures email uniqueness
- Validates booking reference uniqueness
- Checks bus plate number uniqueness
- Verifies one-review-per-booking constraint

### 📋 **Enum Values**
- Validates all enum fields contain only valid values
- Checks user roles, booking statuses, payment statuses
- Ensures trip statuses are realistic

### 💼 **Business Rules**
- Trip departure time < arrival time
- Payments only for paid/completed bookings
- Reviews only for completed bookings
- Seat booking consistency
- Rating ranges (1-5 stars)

### 🔍 **Data Quality**
- Vietnamese phone number format validation
- Vietnamese name pattern recognition
- Booking reference format validation
- Geographic data consistency

## 🛠️ Configuration

### Environment Variables
The seeding system uses the same database configuration as your main application:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=awad_bus_booking_user_login
DB_SSL=false
NODE_ENV=development
```

### Memory Configuration
Seeding scripts are configured with appropriate memory limits:
- Main seeding: `--max-old-space-size=1024` (1GB)
- Validation: `--max-old-space-size=512` (512MB)

## 🔄 Rerunning Seeds

The seeding system is **idempotent** and **safe to rerun**:

1. **Automatic Cleanup** - Clears existing data before seeding
2. **Dependency Order** - Respects foreign key constraints during cleanup
3. **Transaction Safety** - Uses database transactions where appropriate
4. **Error Recovery** - Provides clear error messages and cleanup

### Safe Rerun Process
```bash
# This will clear existing data and regenerate everything
npm run seed:vietnam:full
```

## 📈 Performance Considerations

### Batch Operations
- Inserts records in optimized batches
- Uses bulk operations for large datasets
- Minimizes database round-trips

### Memory Management
- Processes large datasets in chunks
- Releases memory between operations
- Uses streaming for large data generation

### Query Optimization
- Uses database indexes for validation queries
- Batch foreign key validations
- Optimized enum and constraint checking

## 🐛 Troubleshooting

### Common Issues

#### **Out of Memory Errors**
```bash
# Increase memory limit
node --max-old-space-size=2048 -r ts-node/register src/scripts/seed-vietnam-bus-system.ts
```

#### **Foreign Key Constraint Errors**
- Check that all referenced tables are properly seeded first
- Verify the seeding order in the main script
- Run validation to identify specific constraint violations

#### **Duplicate Key Errors**
- The system generates unique values, but if rerun quickly, timestamps might collide
- Add a small delay between reruns or clear existing data first

#### **Connection Issues**
- Verify database credentials in `.env` file
- Ensure PostgreSQL server is running
- Check network connectivity and firewall settings

### Debugging

Enable detailed logging:
```bash
NODE_ENV=development npm run seed:vietnam
```

Run validation only:
```bash
npm run validate:seed
```

## 📋 Database Schema Compliance

This seeding system is designed to work with the **existing database schema** without modifications. It:

- ✅ Uses exact enum values from schema
- ✅ Respects all foreign key constraints  
- ✅ Maintains unique constraints
- ✅ Follows column data types
- ✅ Uses proper Vietnamese character encoding (UTF-8)
- ✅ Generates realistic data volumes

## 🚀 Production Deployment

### Pre-Production Checklist
1. **Database Backup** - Always backup production data first
2. **Environment Variables** - Verify all production settings
3. **Memory Limits** - Ensure sufficient server memory
4. **Connection Limits** - Check database connection pool settings
5. **Validation** - Run validation after seeding

### Production Command
```bash
NODE_ENV=production npm run seed:vietnam:prod
```

### Post-Deployment Validation
```bash
npm run validate:seed
```

## 📞 Support

For issues related to the seeding system:

1. **Check Validation Output** - Run `npm run validate:seed` for detailed diagnostics
2. **Review Logs** - Check console output for specific error messages
3. **Database State** - Verify database connectivity and permissions
4. **Schema Compatibility** - Ensure database schema matches expectations

## 📄 License

This seeding system is part of the Vietnam Bus Booking System project and follows the same licensing terms as the main application.

---

**Last Updated:** January 1, 2026  
**Version:** 1.0.0  
**Compatibility:** PostgreSQL 12+, Node.js 18+