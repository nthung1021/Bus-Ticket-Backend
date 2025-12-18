import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

// Create DataSource
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'awad_bus_booking_user_login',
  extra: {
    ssl: process.env.DB_SSL === 'true' || 
         process.env.NODE_ENV === 'production' || 
         process.env.NODE_ENV === 'staging' ? {
      rejectUnauthorized: false,
    } : false,
  },
});

async function seedDatabase() {
  try {
    await dataSource.initialize();
    console.log('Connected to database');

    // Check if data already exists
    const existingUsersCount = await dataSource.query('SELECT COUNT(*) FROM users');
    if (parseInt(existingUsersCount[0].count) > 0) {
      console.log('Database already has data. Clearing existing data first...');
      
      // Clear all data in correct order (respecting foreign key constraints)
      await dataSource.query('TRUNCATE TABLE audit_logs CASCADE')
      await dataSource.query('TRUNCATE TABLE booking_modification_history CASCADE');
      await dataSource.query('TRUNCATE TABLE passenger_details CASCADE');
      await dataSource.query('TRUNCATE TABLE seat_status CASCADE'); 
      await dataSource.query('TRUNCATE TABLE bookings CASCADE');
      await dataSource.query('TRUNCATE TABLE trips CASCADE');
      await dataSource.query('TRUNCATE TABLE seats CASCADE');
      await dataSource.query('TRUNCATE TABLE seat_layouts CASCADE');
      await dataSource.query('TRUNCATE TABLE buses CASCADE');
      await dataSource.query('TRUNCATE TABLE route_points CASCADE')
      await dataSource.query('TRUNCATE TABLE routes CASCADE');
      await dataSource.query('TRUNCATE TABLE operators CASCADE');
      await dataSource.query('TRUNCATE TABLE refresh_tokens CASCADE')
      await dataSource.query('TRUNCATE TABLE users CASCADE');
      
      console.log('Existing data cleared successfully');
    }

    // 1. Seed Users (50 records)
    console.log('Seeding users...');
    const userIds: string[] = [];
    const userInsertQuery = `
      INSERT INTO users (id, "googleId", email, name, phone, password_hash, role, created_at) VALUES
    `;
    
    const userValues: string[] = [];
    const userRoles = ['admin', 'customer', 'operator'];
    
    for (let i = 1; i <= 50; i++) {
      const id = `00000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      userIds.push(id);
      const role = i <= 2 ? 'admin' : i <= 5 ? 'operator' : 'customer';
      const googleId = i <= 10 ? `'google_${i}'` : 'NULL';
      const phone = i <= 40 ? `'+84${(900000000 + i * 1000000).toString()}'` : 'NULL';
      
      // Generate more varied Vietnamese names
      const vietnameseNames = [
        'Nguyễn Văn Nam', 'Trần Thị Hoa', 'Lê Minh Tuấn', 'Phạm Thu Hà', 'Hoàng Đức Anh',
        'Vũ Thị Lan', 'Đặng Quang Minh', 'Bùi Thị Mai', 'Đỗ Văn Hùng', 'Ngô Thị Thu',
        'Lý Văn Đức', 'Phan Thị Hương', 'Trịnh Quang Hải', 'Đinh Thị Nga', 'Tạ Văn Sơn'
      ];
      const randomName = vietnameseNames[i % vietnameseNames.length];
      
      userValues.push(`('${id}', ${googleId}, 'user${i}@gmail.com', '${randomName}', ${phone}, '$2b$10$hashedpassword${i}', '${role}', '2026-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00')`);
    }
    
    await dataSource.query(userInsertQuery + userValues.join(',\n') + ';');

    // 2. Seed Operators (20 records)
    console.log('Seeding operators...');
    const operatorIds: string[] = [];
    const operatorValues: string[] = [];
    
    const operatorNames = [
      'Xe Khách Phương Trang', 'Xe Khách Hoàng Long', 'Xe Khách Mai Linh', 'Xe Khách Thành Bưởi', 'Xe Khách Sinh Café',
      'Xe Khách Hùng Cường', 'Xe Khách Thanh Nga', 'Xe Khách Hoàng Gia', 'Xe Khách Minh Tân', 'Xe Khách Sao Viet',
      'Xe Khách Nam Sài Gòn', 'Xe Khách Cúc Tùng', 'Xe Khách Tâm Hạnh', 'Xe Khách Bảo Anh', 'Xe Khách Minh Quốc',
      'Xe Khách Đồng Phương', 'Xe Khách Thiên Tân', 'Xe Khách Bình Minh', 'Xe Khách Thuận Tiện', 'Xe Khách Hoa Mai'
    ];
    
    for (let i = 1; i <= 20; i++) {
      const id = `10000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      operatorIds.push(id);
      const status = i <= 15 ? 'approved' : i <= 18 ? 'pending' : 'suspended';
      const approvedAt = status === 'approved' ? `'2026-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00'` : 'NULL';
      
      const emailDomain = operatorNames[i-1].toLowerCase().replace(/[^a-z]/g, '') + '.vn';
      operatorValues.push(`('${id}', '${operatorNames[i-1]}', 'lienhe${i}@${emailDomain}', '+84${(900000000 + i * 1000000).toString()}', '${status}', ${approvedAt})`);
    }
    
    await dataSource.query(`
      INSERT INTO operators (id, name, contact_email, contact_phone, status, approved_at) VALUES
      ${operatorValues.join(',\n')};
    `);

    // 3. Seed Routes (30 records)
    console.log('Seeding routes...');
    const routeIds: string[] = [];
    const routeValues: string[] = [];
    
    const cities = [
      'Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Biên Hòa', 'Huế',
      'Nha Trang', 'Buôn Ma Thuột', 'Vũng Tàu', 'Quy Nhon', 'Thủ Dầu Một', 'Nam Định', 'Phan Thiết',
      'Long Xuyên', 'Hạ Long', 'Thái Nguyên', 'Thanh Hóa', 'Rạch Giá', 'Cà Mau',
      'Vinh', 'Mỹ Tho', 'Tây Ninh', 'Sóc Trăng', 'Kon Tum', 'Hội An', 'Sapa',
      'Đà Lạt', 'Phú Quốc', 'Bạc Liêu'
    ];
    
    for (let i = 1; i <= 30; i++) {
      const id = `20000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      routeIds.push(id);
      const origin = cities[i-1];
      const destination = cities[(i + 15) % cities.length];
      const distance = Math.floor(Math.random() * 800) + 50;
      const minutes = Math.floor(distance * 1.5) + Math.floor(Math.random() * 120);
      const operatorId = operatorIds[Math.floor(Math.random() * operatorIds.length)];
      
      routeValues.push(`('${id}', '${operatorId}', 'Route ${i}: ${origin} to ${destination}', '${origin} to ${destination}', '${origin}', '${destination}', ${distance}.50, ${minutes}, true, '{}', '2026-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00', '2026-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00')`);
    }
    
    await dataSource.query(`
      INSERT INTO routes (id, operator_id, name, description, origin, destination, distance_km, estimated_minutes, is_active, amenities, "createdAt", "updatedAt") VALUES
      ${routeValues.join(',\n')};
    `);

    // 4. Seed Buses (40 records)
    console.log('Seeding buses...');
    const busIds: string[] = [];
    const busValues: string[] = [];
    
    const busModels = [
      'Hyundai Universe', 'Thaco Isuzu', 'Mercedes Benz O500', 'Samco Felix', 'Daewoo FX120',
      'Hino AK', 'Isuzu Citybus', 'King Long XMQ6127', 'Yutong ZK6122', 'Golden Dragon XML6127'
    ];
    
    for (let i = 1; i <= 40; i++) {
      const id = `30000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      busIds.push(id);
      const operatorId = operatorIds[Math.floor(Math.random() * operatorIds.length)];
      const plateNumber = `BUS${i.toString().padStart(4, '0')}`;
      const model = busModels[Math.floor(Math.random() * busModels.length)];
      const capacity = [24, 32, 45, 55][Math.floor(Math.random() * 4)];
      const amenities = `'{"wifi": ${Math.random() > 0.5}, "ac": ${Math.random() > 0.3}, "usb_ports": ${Math.random() > 0.6}, "restroom": ${Math.random() > 0.4}}'`;
      
      busValues.push(`('${id}', '${operatorId}', '${plateNumber}', '${model}', ${capacity}, ${amenities})`);
    }
    
    await dataSource.query(`
      INSERT INTO buses (id, operator_id, plate_number, model, seat_capacity, amenities_json) VALUES
      ${busValues.join(',\n')};
    `);

    // 5. Seed Seat Layouts (40 records - one per bus)
    console.log('Seeding seat layouts...');
    const seatLayoutValues: string[] = [];
    const layoutTypes = ['standard_2x2', 'standard_2x3', 'vip_1x2', 'sleeper_1x2'];
    
    busIds.forEach((busId, index) => {
      const id = `40000000-0000-4000-8000-${(index + 1).toString().padStart(12, '0')}`;
      const layoutType = layoutTypes[Math.floor(Math.random() * layoutTypes.length)];
      const seatsPerRow = layoutType.includes('2x2') ? 4 : layoutType.includes('2x3') ? 5 : layoutType.includes('1x2') ? 3 : 4;
      const capacity = parseInt(busIds.length > index ? '32' : '24'); // Get from buses table
      const totalRows = Math.ceil(capacity / seatsPerRow);
      const layoutConfig = `'{"aisles": [2], "doors": [1, ${totalRows}], "emergency_exits": [${Math.floor(totalRows/2)}]}'`;
      const seatPricing = `'{"standard": 10000, "premium": 15000, "vip": 20000}'`;
      
      seatLayoutValues.push(`('${id}', '${busId}', '${layoutType}', ${totalRows}, ${seatsPerRow}, ${layoutConfig}, ${seatPricing}, '2026-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00', '2026-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00')`);
    });
    
    await dataSource.query(`
      INSERT INTO seat_layouts (id, bus_id, "layoutType", total_rows, seats_per_row, layout_config, seat_pricing, created_at, updated_at) VALUES
      ${seatLayoutValues.join(',\n')};
    `);

    // 6. Seed Seats (800+ records)
    console.log('Seeding seats...');
    const seatIds: string[] = [];
    let seatValues: string[] = [];
    let seatCounter = 1;
    
    for (const busId of busIds) {
      const capacity = [24, 32, 45, 55][Math.floor(Math.random() * 4)];
      
      for (let seatNum = 1; seatNum <= capacity; seatNum++) {
        const id = `50000000-0000-4000-8000-${seatCounter.toString().padStart(12, '0')}`;
        seatIds.push(id);
        const seatCode = `${String.fromCharCode(65 + Math.floor((seatNum - 1) / 4))}${((seatNum - 1) % 4) + 1}`;
        const seatType = seatNum <= 4 ? 'vip' : seatNum <= 8 ? 'business' : 'normal';
        
        seatValues.push(`('${id}', '${busId}', '${seatCode}', '${seatType}', true)`);
        seatCounter++;
      }
    }
    
    // Insert seats in batches to avoid query length limits
    const batchSize = 100;
    for (let i = 0; i < seatValues.length; i += batchSize) {
      const batch = seatValues.slice(i, i + batchSize);
      await dataSource.query(`
        INSERT INTO seats (id, bus_id, seat_code, "seatType", is_active) VALUES
        ${batch.join(',\n')};
      `);
    }

    // 7. Seed Trips (60 records)
    console.log('Seeding trips...');
    const tripIds: string[] = [];
    const tripValues: string[] = [];
    
    for (let i = 1; i <= 60; i++) {
      const id = `60000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      tripIds.push(id);
      const routeId = routeIds[Math.floor(Math.random() * routeIds.length)];
      const busId = busIds[Math.floor(Math.random() * busIds.length)];
      const daysFromNow = Math.floor(Math.random() * 60) - 30; // -30 to +30 days
      const departureTime = `'2026-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00'`;
      const arrivalTime = `'2026-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00'`;
      const basePrice = Math.floor(Math.random() * 15 + 10) * 1000;
      const statuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      tripValues.push(`('${id}', '${routeId}', '${busId}', ${departureTime}, ${arrivalTime}, ${basePrice}, '${status}')`);
    }
    
    await dataSource.query(`
      INSERT INTO trips (id, route_id, bus_id, departure_time, arrival_time, base_price, status) VALUES
      ${tripValues.join(',\n')};
    `);

    // 8. Seed Bookings (100 records)
    console.log('Seeding bookings...');
    const bookingIds: string[] = [];
    const bookingValues: string[] = [];
    
    for (let i = 1; i <= 100; i++) {
      const id = `70000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      bookingIds.push(id);

      const booked_month = (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0');
      const booked_day = (Math.floor(Math.random() * 28) + 1).toString().padStart(2, '0');

      const prefix = 'BK';
      const datePart = `2026${booked_month}${booked_day}`;
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

      const randomPart = () =>
        Array.from({ length: 6 })
          .map(
            () => chars[Math.floor(Math.random() * chars.length)],
          )
          .join('');

      const bookingReference = `${prefix}${datePart}-${randomPart()}`;
      const userId = i <= 80 ? userIds[Math.floor(Math.random() * userIds.length)] : null;
      const userIdValue = userId ? `'${userId}'` : 'NULL';
      const tripId = tripIds[Math.floor(Math.random() * tripIds.length)];
      const totalAmount = Math.floor(Math.random() * 25 + 20) * 1000;
      const statuses = ['pending', 'paid', 'cancelled', 'expired'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const contactEmail = `khachhang${i}@gmail.com`;
      const contactPhone = `+84${(900000000 + i * 1000000).toString()}`;
      const bookedAt = `'2026-${booked_month}-${booked_day} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00'`;
      const lastModifiedAt = Math.random() > 0.7 ? `'2026-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00'` : 'NULL';
      const cancelledAt = status === 'cancelled' ? `'2026-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00'` : 'NULL';
      
      bookingValues.push(`('${id}', '${bookingReference}', ${userIdValue}, '${tripId}', ${totalAmount}, '${status}', '${contactEmail}', '${contactPhone}', ${bookedAt}, ${lastModifiedAt}, ${cancelledAt})`);
    }
    
    await dataSource.query(`
      INSERT INTO bookings (id, booking_reference, user_id, trip_id, total_amount, status, contact_email, contact_phone, booked_at, last_modified_at, cancelled_at) VALUES
      ${bookingValues.join(',\n')};
    `);

    // 9. Seed Seat Status (200 records)
    console.log('Seeding seat status...');
    const seatStatusValues: string[] = [];
    
    for (let i = 1; i <= 200; i++) {
      const id = `80000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      const tripId = tripIds[Math.floor(Math.random() * tripIds.length)];
      const seatId = seatIds[Math.floor(Math.random() * Math.min(seatIds.length, 400))]; // Use subset of seats
      const seatCode = `${String.fromCharCode(65 + Math.floor(Math.random() * 10))}${Math.floor(Math.random() * 4) + 1}`;
      const bookingId = Math.random() > 0.3 ? bookingIds[Math.floor(Math.random() * bookingIds.length)] : null;
      const bookingIdValue = bookingId ? `'${bookingId}'` : 'NULL';
      const states = ['available', 'booked', 'locked', 'reserved'];
      const state = bookingId ? 'booked' : states[Math.floor(Math.random() * states.length)];
      const lockedUntil = state === 'locked' ? `'2026-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00'` : 'NULL';
      
      seatStatusValues.push(`('${id}', '${tripId}', '${seatId}', '${seatCode}', ${bookingIdValue}, '${state}', ${lockedUntil})`);
    }
    
    await dataSource.query(`
      INSERT INTO seat_status (id, trip_id, seat_id, seat_code, booking_id, state, locked_until) VALUES
      ${seatStatusValues.join(',\n')};
    `);

    // 10. Seed Passenger Details (150 records)
    console.log('Seeding passenger details...');
    const passengerValues: string[] = [];
    const firstNames = ['Văn', 'Thị', 'Minh', 'Thu', 'Hoàng', 'Mai', 'Đức', 'Hoa', 'Quang', 'Lan'];
    const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'];
    
    for (let i = 1; i <= 150; i++) {
      const id = `90000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      const bookingId = bookingIds[Math.floor(Math.random() * bookingIds.length)];
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const fullName = `${lastName} ${firstName} ${i % 2 === 0 ? 'Văn' : 'Thị'} ${String.fromCharCode(65 + i % 26)}`;
      const documentId = `ID${i.toString().padStart(8, '0')}`;
      const seatCode = `${String.fromCharCode(65 + Math.floor(Math.random() * 10))}${Math.floor(Math.random() * 4) + 1}`;
      
      passengerValues.push(`('${id}', '${bookingId}', '${fullName}', '${documentId}', '${seatCode}')`);
    }
    
    await dataSource.query(`
      INSERT INTO passenger_details (id, booking_id, full_name, document_id, seat_code) VALUES
      ${passengerValues.join(',\n')};
    `);

    // 11. Seed Booking Modification History (80 records)
    console.log('Seeding booking modification history...');
    const modificationValues: string[] = [];
    const modificationTypes = ['passenger_info', 'seat_change', 'contact_info'];
    const descriptions = {
      'passenger_info': ['Cập nhật tên hành khách', 'Thay đổi số CMND/CCCD', 'Bổ sung thông tin hành khách'],
      'seat_change': ['Đổi từ ghế A1 sang A2', 'Nâng cấp lên ghế VIP', 'Chuyển sang hàng ghế khác'],
      'contact_info': ['Cập nhật địa chỉ email', 'Thay đổi số điện thoại', 'Cập nhật thông tin liên hệ']
    };
    
    for (let i = 1; i <= 80; i++) {
      const id = `A0000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      const bookingId = bookingIds[Math.floor(Math.random() * bookingIds.length)];
      const userId = Math.random() > 0.2 ? userIds[Math.floor(Math.random() * userIds.length)] : null;
      const userIdValue = userId ? `'${userId}'` : 'NULL';
      const modificationType = modificationTypes[Math.floor(Math.random() * modificationTypes.length)];
      const description = descriptions[modificationType][Math.floor(Math.random() * descriptions[modificationType].length)];
      const changes = JSON.stringify({"field": "example", "old_value": "old", "new_value": "new"});
      const previousValues = JSON.stringify({"field": "example", "value": "previous"});
      const modifiedAt = `'2026-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00'`;
      
      modificationValues.push(`('${id}', '${bookingId}', ${userIdValue}, '${modificationType}', '${description}', '${changes}', '${previousValues}', ${modifiedAt})`);
    }
    
    await dataSource.query(`
      INSERT INTO booking_modification_history (id, booking_id, user_id, modification_type, description, changes, "previousValues", modified_at) VALUES
      ${modificationValues.join(',\n')};
    `);

    console.log('✅ Database seeding completed successfully!');
    console.log(`
    Summary:
    - Users: 50 records
    - Operators: 20 records  
    - Routes: 30 records
    - Buses: 40 records
    - Seat Layouts: 40 records
    - Seats: 800+ records
    - Trips: 60 records
    - Bookings: 100 records
    - Seat Status: 200 records
    - Passenger Details: 150 records
    - Booking Modification History: 80 records
    `);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await dataSource.destroy();
  }
}

// Run the seeding
seedDatabase().catch(console.error);