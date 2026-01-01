# 🗄️ Database Structure Documentation

## 📊 Tổng quan cấu trúc Database

Hệ thống Bus Booking System có **19 bảng chính** được tổ chức thành 7 nhóm chức năng:

### 🔐 1. User Management & Authentication
- `users` - Thông tin người dùng (admin/customer)
- `refresh_tokens` - Token xác thực 
- `payment_methods` - Phương thức thanh toán của user

### 🚌 2. Operator & Bus Fleet Management  
- `operators` - Nhà xe/công ty vận tải
- `buses` - Thông tin xe buýt
- `seats` - Ghế ngồi trên xe
- `seat_layouts` - Sơ đồ bố trí ghế

### 🛣️ 3. Route & Trip Management
- `routes` - Tuyến đường
- `route_points` - Điểm đón/trả khách
- `trips` - Chuyến xe theo lịch trình

### 💺 4. Booking & Payment System
- `bookings` - Đặt vé
- `passenger_details` - Thông tin hành khách
- `seat_status` - Trạng thái ghế (available/booked/locked)
- `payments` - Giao dịch thanh toán

### ⭐ 5. Review & Feedback
- `reviews` - Đánh giá chuyến xe
- `feedbacks` - Phản hồi từ khách hàng

### 🔔 6. Notification System
- `notifications` - Thông báo hệ thống

### 📋 7. Audit & History Tracking
- `audit_logs` - Nhật ký hệ thống
- `booking_modification_history` - Lịch sử thay đổi booking

## 🎨 Cách vẽ Database Diagram

### Sử dụng dbdiagram.io (Khuyên dùng)

1. **Truy cập**: https://dbdiagram.io/
2. **Click**: "Go to App" hoặc "Try it now"
3. **Copy nội dung** từ file: [`docs/database-diagram.dbml`](./database-diagram.dbml)
4. **Paste** vào editor của dbdiagram.io
5. **Diagram tự động hiển thị** với đầy đủ relationships

### Chạy script tự động

```bash
# Tạo/cập nhật file diagram
npx ts-node src/scripts/generate-db-diagram.ts
```

## 📈 Database Statistics

| Thống kê | Số lượng |
|----------|----------|
| **Core Tables** | 19 bảng |
| **Enums** | 9 enums |
| **Foreign Keys** | 30+ relationships |
| **Indexes** | 50+ indexes |
| **UUID Primary Keys** | Tất cả bảng |

## 🔗 Key Relationships

### Quan hệ chính:
- `User` → `Booking` (1:n)
- `Trip` → `Booking` (1:n) 
- `Bus` → `Trip` (1:n)
- `Route` → `Trip` (1:n)
- `Operator` → `Bus` (1:n)
- `Operator` → `Route` (1:n)
- `Booking` → `Review` (1:1)
- `Booking` → `Payment` (1:n)

### Quan hệ phức tạp:
- `SeatStatus` liên kết `Trip`, `Seat`, `Booking`
- `RoutePoint` định nghĩa pickup/dropoff points
- `PassengerDetail` lưu thông tin từng hành khách

## 🏗️ Database Design Principles

### ✅ Best Practices đã áp dụng:

1. **UUID Primary Keys** - Bảo mật và scalability
2. **Proper Indexing** - Tối ưu performance cho queries
3. **Enum Types** - Type safety và data consistency  
4. **Timestamp with timezone** - Hỗ trợ multiple timezones
5. **Cascade Delete** - Maintain data integrity
6. **Unique Constraints** - Prevent duplicates
7. **Nullable Foreign Keys** - Handle optional relationships
8. **JSON Columns** - Flexible data storage (amenities, layout_data)

### 📋 Naming Conventions:
- **Tables**: snake_case (users, booking_modification_history)
- **Columns**: snake_case (user_id, created_at)
- **Indexes**: idx_table_column(s) format
- **Enums**: lowercase với underscore
- **Foreign Keys**: {table_name}_id format

## 🔧 Schema Maintenance

### Cập nhật Database:
```bash
# Tạo migration mới
npm run migration:generate -- --name=DescriptiveName

# Chạy migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

### Cập nhật Diagram:
```bash
# Tự động tạo lại diagram khi có thay đổi schema
npx ts-node src/scripts/generate-db-diagram.ts
```

## 📚 Entity Documentation

Mỗi entity được document chi tiết tại:
- [`src/entities/`](../src/entities/) - Source code với TypeORM decorators
- Enum definitions trong từng entity file
- Relationship mappings với JoinColumn decorators

---

**💡 Tip**: Sử dụng dbdiagram.io để visualize và export sang các format khác nhau (PNG, PDF, SQL) cho presentation hoặc documentation.