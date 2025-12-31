# Reviews & Feedbacks Sample Data

Tài liệu này mô tả cách thêm dữ liệu mẫu cho hệ thống đánh giá và phản hồi.

## 📋 Tổng quan

Script này tạo dữ liệu mẫu chân thực cho:
- **Reviews** (Đánh giá mới): Liên kết với booking cụ thể
- **Feedbacks** (Phản hồi cũ): Hệ thống phản hồi legacy

## 🚀 Cách sử dụng

### 1. Chạy Migration
```bash
npm run migration:run
```

### 2. Thêm Sample Data
```bash
# Cách 1: Sử dụng npm script
npm run seed:reviews

# Cách 2: Chạy trực tiếp
npm run ts-node src/scripts/seed-reviews-feedbacks.ts

# Cách 3: Xem hướng dẫn
npm run seed:reviews -- --help
```

## 📊 Dữ liệu được tạo

### Reviews (Đánh giá)
- **Số lượng**: ~50 reviews (60% booking đủ điều kiện)
- **Điều kiện**: Booking đã thanh toán + chuyến đã hoàn thành/đang chạy
- **Rating phân bố**:
  - ⭐⭐⭐⭐⭐ (5 sao): 40% - Xuất sắc
  - ⭐⭐⭐⭐☆ (4 sao): 35% - Tốt
  - ⭐⭐⭐☆☆ (3 sao): 20% - Trung bình
  - ⭐⭐☆☆☆ (2 sao): 4% - Kém  
  - ⭐☆☆☆☆ (1 sao): 1% - Rất kém

### Feedbacks (Phản hồi cũ)
- **Số lượng**: ~25 feedbacks (30% booking đủ điều kiện)
- **Đặc điểm**: Tích cực hơn (hệ thống cũ)
- **Rating**: Chủ yếu 4-5 sao

## 💬 Nội dung Comment

### Tiếng Việt + English
- Phản ánh thói quen người Việt dùng tiếng Anh lẫn tiếng Việt
- Nội dung chân thực về trải nghiệm đi xe bus
- Đề cập đến các yếu tố: tài xế, xe, dịch vụ, giờ giấc

### Ví dụ Comments:
**Tích cực:**
```
"Tuyệt vời! Xe sạch sẽ, tài xế lái xe rất an toàn. Sẽ đi lại lần sau."
"Good service! On time departure, comfortable seats, clean restroom."
```

**Trung bình:**
```
"Ổn, không có gì đặc biệt. Xe hơi cũ nhưng vẫn chạy được."
"Standard service. Nothing special but gets the job done."
```

**Tiêu cực:**
```
"Xe delay 1 tiếng không báo trước. Nhân viên thái độ không tốt."
"Overcrowded và noisy. Không như advertised."
```

## ⚠️ Yêu cầu

- Database phải có dữ liệu cơ bản: users, trips, bookings
- Chạy `npm run seed:database` trước nếu DB trống
- An toàn chạy nhiều lần (sẽ làm mới dữ liệu mẫu)

## 🔧 Tùy chỉnh

Để thay đổi dữ liệu mẫu, chỉnh sửa:
- **Migration**: [1767040000000-AddSampleReviewsAndFeedbacks.ts](../migrations/1767040000000-AddSampleReviewsAndFeedbacks.ts)
- **Script**: [seed-reviews-feedbacks.ts](seed-reviews-feedbacks.ts)

## 📈 Kết quả sau khi chạy

```
📝 Reviews: 45 total, 4.2/5.0 average, 38 with comments
💭 Feedbacks: 22 total, 4.5/5.0 average, 18 with comments

🏆 Top Rated Routes:
1. Hà Nội - Hồ Chí Minh: 4.8/5.0 (8 reviews)
2. Hồ Chí Minh - Đà Lạt: 4.6/5.0 (5 reviews)
3. Đà Nẵng - Hội An: 4.5/5.0 (6 reviews)
```

## 🗂️ Database Schema

### Reviews Table
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  trip_id UUID REFERENCES trips(id), 
  booking_id UUID REFERENCES bookings(id) UNIQUE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Feedbacks Table  
```sql
CREATE TABLE feedbacks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  trip_id UUID REFERENCES trips(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```