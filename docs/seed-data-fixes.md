# 🔧 Bus Ticket Database Seed Data Fixes

## 📋 Overview

This document outlines the comprehensive fixes applied to the bus ticket booking database seed data to ensure all real-world constraints are properly enforced.

## 🚨 Problems Found in Original Seed Data

### 1. **Operator-Bus Relationship Issues**
- **Problem**: Buses randomly assigned to operators without validation
- **Impact**: Orphaned buses, unrealistic operator fleets
- **Fix**: Distributed buses evenly among approved operators (12 operators, 40 buses)

### 2. **Bus Capacity Inconsistencies**
- **Problem**: `seat_capacity` field didn't match actual seat count
- **Impact**: Booking logic failures, impossible seat assignments
- **Fix**: Exact capacity matching - bus capacity = number of seats created

### 3. **Seat Layout Mismatches**
- **Problem**: Seat layouts didn't correspond to bus models or capacity
- **Impact**: Unrealistic layouts, impossible seat configurations
- **Fix**: Proper layout types based on bus models with correct row/seat calculations

### 4. **Unrealistic Seat Naming**
- **Problem**: Random seat codes like `A1`, `A2` without proper row logic
- **Impact**: Confusing seat selection, unrealistic bus layouts
- **Fix**: Proper seat naming: A1-A4, B1-B4, etc. based on rows and seats per row

### 5. **Invalid Time Logic**
- **Problem**: Random departure/arrival times, possible departure > arrival
- **Impact**: Impossible trips, booking system failures
- **Fix**: Realistic travel times based on distance, proper time calculations

### 6. **Pricing Issues**
- **Problem**: Prices in cents instead of VND, unrealistic amounts
- **Impact**: Confusing user interface, incorrect payment processing
- **Fix**: VND pricing based on distance (2500 VND/km), rounded to 10,000 VND

### 7. **Bus Schedule Conflicts**
- **Problem**: Same bus assigned to overlapping trips
- **Impact**: Physical impossibility, booking conflicts
- **Fix**: Schedule validation with buffer times, conflict detection

### 8. **Foreign Key Violations**
- **Problem**: Random FK assignments without existence validation
- **Impact**: Database integrity issues, orphaned records
- **Fix**: Proper FK validation and relationship management

## ✅ Real-World Constraints Enforced

### 🏢 **Operator & Bus Constraints**
```typescript
✓ One operator owns multiple buses
✓ Each bus belongs to exactly one operator  
✓ Bus seat_capacity = actual seat count
✓ One seat layout per bus
```

### 🚌 **Bus & Seat Constraints**
```typescript
✓ Seat layout is bus-specific
✓ Realistic seat codes: A1-A10, B1-B10, etc.
✓ No duplicate seat codes per bus
✓ Seat count matches bus capacity exactly
```

### 🛣️ **Route & Trip Constraints**
```typescript
✓ Routes use real Vietnamese cities
✓ Realistic distances and travel times
✓ departure_time < arrival_time always
✓ No bus schedule conflicts
✓ Travel time = distance/70 km/h + buffer
```

### 💰 **Pricing Constraints**
```typescript
✓ VND currency (150,000 - 1,200,000 VND)
✓ Distance-based pricing (2500 VND/km)
✓ Rounded to nearest 10,000 VND
✓ Seat type multipliers (VIP: 1.3x, Business: 1.5x)
```

### 🎫 **Booking & Seat Constraints**
```typescript
✓ Bookings reference existing trips
✓ Seat assignments reference actual bus seats
✓ No duplicate seat bookings per trip
✓ Passenger details match booked seats
✓ Booking status flow: PENDING → PAID → COMPLETED
```

## 📊 Fixed Data Structure

### **Operators (15 records)**
- Realistic Vietnamese bus company names
- Proper contact information with Vietnamese domains
- Status distribution: 12 approved, 2 pending, 1 suspended

### **Routes (30 records)**
- Real Vietnamese city pairs
- Accurate distances between cities
- Major routes: Hà Nội ↔ Hồ Chí Minh, regional connections
- Realistic travel times based on distance

### **Buses (40 records)**
- 10 different realistic bus models
- Capacity options: 24, 28, 32, 35, 36, 40, 42, 45, 50, 55 seats
- Vietnamese license plate format
- Proper amenities based on bus type

### **Seats (1,300+ records)**
- Exact seat count per bus capacity
- Proper naming: A1-A4, B1-B4 (for 4 seats per row)
- Seat types: normal, business, VIP based on position
- No orphaned or duplicate seats

### **Trips (100 records)**
- 30-day schedule starting from current date
- No bus conflicts with 1-hour buffer times
- Realistic departure times based on trip length
- Status based on departure time (past = completed/cancelled)

### **Bookings (120 records)**
- Valid trip references
- Realistic passenger counts (1-4 per booking)
- Proper status distribution
- Contact information consistency

## 🔍 Validation Functions

The seed script includes comprehensive validation:

```typescript
1. Operator-Bus relationship integrity
2. Bus capacity = seat count validation
3. Seat layout consistency checks  
4. Trip time logic validation
5. Foreign key relationship checks
6. Seat booking constraint validation
7. Passenger detail completeness
8. Pricing reasonableness checks
9. Bus schedule conflict detection
10. Data type and range validations
```

## 🚀 Usage

### **Run Fixed Seed Data**
```bash
# Option 1: Direct execution
npx ts-node src/scripts/seed-database-fixed.ts

# Option 2: Helper script
npx ts-node src/scripts/run-seed-fixed.ts
```

### **Validate Data After Seeding**
The validation runs automatically, but you can run manual checks:

```sql
-- Check bus capacity matches seats
SELECT b.plate_number, b.seat_capacity, COUNT(s.id) as actual_seats 
FROM buses b 
LEFT JOIN seats s ON b.id = s.bus_id 
GROUP BY b.id, b.plate_number, b.seat_capacity;

-- Check for schedule conflicts  
SELECT bus_id, COUNT(*) as trip_count
FROM trips 
WHERE departure_time BETWEEN NOW() AND NOW() + INTERVAL '7 days'
GROUP BY bus_id 
ORDER BY trip_count DESC;

-- Verify booking integrity
SELECT COUNT(*) as total_bookings,
       COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
       COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
FROM bookings;
```

## 📈 Benefits

1. **Analytics Queries Work**: All JOIN operations succeed with proper relationships
2. **Realistic User Experience**: Vietnamese cities, proper pricing, realistic schedules
3. **Production-Ready**: Data mimics real bus booking system behavior
4. **Testing-Friendly**: Consistent data for automated testing
5. **Performance Optimized**: Proper indexing on foreign keys and search fields

## 🔮 Future Improvements

1. **Historical Data**: Add older trips for analytics
2. **Seasonal Patterns**: More trips during holidays
3. **Dynamic Pricing**: Peak/off-peak pricing
4. **Route Popularity**: Weight popular routes with more trips
5. **Regional Operators**: Assign operators to specific regions

---

✅ **The database now contains realistic, production-ready seed data that follows all real-world bus booking system constraints!**