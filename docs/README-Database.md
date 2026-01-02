# 🗄️ Database Structure Documentation

## 📊 Database Structure Overview

The Bus Booking System has **19 main tables** organized into 7 functional groups:

### 🔐 1. User Management & Authentication
- `users` - User information (admin/customer)
- `refresh_tokens` - Authentication tokens 
- `payment_methods` - User payment methods

### 🚌 2. Operator & Bus Fleet Management  
- `operators` - Bus operators/transport companies
- `buses` - Bus information
- `seats` - Bus seats
- `seat_layouts` - Seat layout diagrams

### 🛣️ 3. Route & Trip Management
- `routes` - Routes
- `route_points` - Pickup/dropoff points
- `trips` - Scheduled trips

### 💺 4. Booking & Payment System
- `bookings` - Ticket bookings
- `passenger_details` - Passenger information
- `seat_status` - Seat status (available/booked/locked)
- `payments` - Payment transactions

### ⭐ 5. Review & Feedback
- `reviews` - Trip reviews
- `feedbacks` - Customer feedback

### 🔔 6. Notification System
- `notifications` - System notifications

### 📋 7. Audit & History Tracking
- `audit_logs` - System logs
- `booking_modification_history` - Booking modification history

## 🎨 How to Draw Database Diagram

### Using dbdiagram.io (Recommended)

1. **Visit**: https://dbdiagram.io/
2. **Click**: "Go to App" or "Try it now"
3. **Copy content** from file: [`docs/database-diagram.dbml`](./database-diagram.dbml)
4. **Paste** into dbdiagram.io editor
5. **Diagram will automatically display** with full relationships

### Run automated script

```bash
# Create/update diagram file
npx ts-node src/scripts/generate-db-diagram.ts
```

## 📈 Database Statistics

| Statistic | Count |
|----------|----------|
| **Core Tables** | 19 tables |
| **Enums** | 9 enums |
| **Foreign Keys** | 30+ relationships |
| **Indexes** | 50+ indexes |
| **UUID Primary Keys** | All tables |

## 🔗 Key Relationships

### Main relationships:
- `User` → `Booking` (1:n)
- `Trip` → `Booking` (1:n) 
- `Bus` → `Trip` (1:n)
- `Route` → `Trip` (1:n)
- `Operator` → `Bus` (1:n)
- `Operator` → `Route` (1:n)
- `Booking` → `Review` (1:1)
- `Booking` → `Payment` (1:n)

### Complex relationships:
- `SeatStatus` links `Trip`, `Seat`, `Booking`
- `RoutePoint` defines pickup/dropoff points
- `PassengerDetail` stores individual passenger information

## 🏗️ Database Design Principles

### ✅ Applied Best Practices:

1. **UUID Primary Keys** - Security and scalability
2. **Proper Indexing** - Optimized query performance
3. **Enum Types** - Type safety and data consistency  
4. **Timestamp with timezone** - Multiple timezone support
5. **Cascade Delete** - Maintain data integrity
6. **Unique Constraints** - Prevent duplicates
7. **Nullable Foreign Keys** - Handle optional relationships
8. **JSON Columns** - Flexible data storage (amenities, layout_data)

### 📋 Naming Conventions:
- **Tables**: snake_case (users, booking_modification_history)
- **Columns**: snake_case (user_id, created_at)
- **Indexes**: idx_table_column(s) format
- **Enums**: lowercase with underscore
- **Foreign Keys**: {table_name}_id format

## 🔧 Schema Maintenance

### Update Database:
```bash
# Create new migration
npm run migration:generate -- --name=DescriptiveName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

### Update Diagram:
```bash
# Automatically regenerate diagram when schema changes
npx ts-node src/scripts/generate-db-diagram.ts
```

## 📚 Entity Documentation

Each entity is documented in detail at:
- [`src/entities/`](../src/entities/) - Source code with TypeORM decorators
- Enum definitions in each entity file
- Relationship mappings with JoinColumn decorators

---

**💡 Tip**: Use dbdiagram.io to visualize and export to different formats (PNG, PDF, SQL) for presentations or documentation.