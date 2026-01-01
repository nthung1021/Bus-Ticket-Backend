/**
 * Additional Seeding Functions - Part 2
 * Trips, Bookings, Payments, Reviews, and other entities
 */

import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { 
  VietnamSeedData, 
  generateVietnameseFullName, 
  generateBookingReference,
  generatePayOSOrderCode
} from './vietnam-seed-constants';
import { 
  idCollections, 
  seedStats, 
  generateRandomDate, 
  random 
} from './vietnam-seed-functions';

// 5️⃣ TRIPS
export async function seedTrips(dataSource: DataSource): Promise<void> {
  console.log('   🚎 Generating trip schedules...');
  
  const tripValues: string[] = [];
  const targetCount = 180;
  
  // Get route and bus data to ensure no conflicts
  const routes = await dataSource.query('SELECT id FROM routes ORDER BY id') as Array<{id: string}>;
  const buses = await dataSource.query('SELECT id FROM buses ORDER BY id') as Array<{id: string}>;
  
  // Track bus availability by date/time to prevent overlaps
  const busSchedule = new Map<string, Set<string>>();
  
  for (let i = 1; i <= targetCount; i++) {
    const id = randomUUID();
    idCollections.trips.push(id);
    
    const routeId = random(routes).id;
    let busId: string;
    let departureTime: Date;
    let busTimeKey: string;
    let attempts = 0;
    
    // Find available bus and time slot
    do {
      busId = random(buses).id;
      departureTime = new Date(Date.now() + (Math.random() * 90 - 30) * 24 * 60 * 60 * 1000);
      
      // Round to nearest hour for scheduling
      departureTime.setMinutes(0, 0, 0);
      departureTime.setHours(Math.floor(Math.random() * 20) + 4); // Trips between 4 AM - 11 PM
      
      const dateKey = departureTime.toDateString();
      busTimeKey = `${busId}_${dateKey}`;
      
      if (!busSchedule.has(busTimeKey)) {
        busSchedule.set(busTimeKey, new Set());
      }
      
      attempts++;
    } while (busSchedule.get(busTimeKey)!.has(departureTime.getHours().toString()) && attempts < 50);
    
    // Mark this time slot as taken
    busSchedule.get(busTimeKey)!.add(departureTime.getHours().toString());
    
    // Calculate arrival time (3-12 hours after departure)
    const arrivalTime = new Date(departureTime);
    arrivalTime.setHours(arrivalTime.getHours() + Math.floor(Math.random() * 10) + 3);
    
    const basePrice = Math.floor(Math.random() * 400 + 150) * 1000; // 150k-550k VND
    
    const statuses = ['scheduled', 'in_progress', 'completed', 'cancelled', 'delayed'];
    const weights = [0.6, 0.1, 0.25, 0.03, 0.02]; // Most trips are scheduled or completed
    let status = 'scheduled';
    const rand = Math.random();
    let cumulative = 0;
    for (let j = 0; j < statuses.length; j++) {
      cumulative += weights[j];
      if (rand <= cumulative) {
        status = statuses[j];
        break;
      }
    }
    
    const averageRating = status === 'completed' ? (Math.random() * 2 + 3).toFixed(2) : '0.00';
    const reviewCount = status === 'completed' ? Math.floor(Math.random() * 20) : 0;

    tripValues.push(
      `('${id}', '${routeId}', '${busId}', '${departureTime.toISOString()}', '${arrivalTime.toISOString()}', ${basePrice}, '${status}', ${averageRating}, ${reviewCount})`
    );
  }

  // Insert in batches
  const batchSize = 300;
  for (let i = 0; i < tripValues.length; i += batchSize) {
    const batch = tripValues.slice(i, i + batchSize);
    await dataSource.query(`
      INSERT INTO trips (id, route_id, bus_id, departure_time, arrival_time, base_price, status, average_rating, review_count) VALUES
      ${batch.join(',\n')}
    `);
  }
  
  seedStats.trips = targetCount;
}

// 6️⃣ SEAT STATUS
export async function seedSeatStatus(dataSource: DataSource): Promise<void> {
  console.log('   🎫 Generating seat availability status...');
  
  // Get all trips and seats
  const trips = await dataSource.query('SELECT id FROM trips ORDER BY id') as Array<{id: string}>;
  const seatsData = await dataSource.query('SELECT id, bus_id FROM seats ORDER BY id') as Array<{id: string, bus_id: string}>;
  
  // Group seats by bus
  const seatsByBus = new Map<string, string[]>();
  seatsData.forEach((seat) => {
    if (!seatsByBus.has(seat.bus_id)) {
      seatsByBus.set(seat.bus_id, []);
    }
    seatsByBus.get(seat.bus_id)!.push(seat.id);
  });
  
  // Get trip-bus mapping
  const tripBusMapping = await dataSource.query('SELECT id, bus_id FROM trips ORDER BY id') as Array<{id: string, bus_id: string}>;
  
  const seatStatusValues: string[] = [];
  let statusIndex = 1;
  
  for (const trip of tripBusMapping) {
    const busSeats = seatsByBus.get(trip.bus_id) || [];
    
    for (const seatId of busSeats) {
      const id = randomUUID();
      
      const states = ['available', 'booked', 'locked', 'reserved'];
      const stateWeights = [0.65, 0.25, 0.05, 0.05];
      let state = 'available';
      const rand = Math.random();
      let cumulative = 0;
      for (let j = 0; j < states.length; j++) {
        cumulative += stateWeights[j];
        if (rand <= cumulative) {
          state = states[j];
          break;
        }
      }
      
      const bookingId = state === 'booked' && idCollections.bookings.length > 0 ? 
        `'${random(idCollections.bookings)}'` : 'NULL';
      
      const lockedUntil = state === 'locked' ? 
        `'${new Date(Date.now() + Math.random() * 3600000).toISOString()}'` : 'NULL';

      seatStatusValues.push(
        `('${id}', '${trip.id}', '${seatId}', ${bookingId}, '${state}', ${lockedUntil})`
      );
      
      statusIndex++;
    }
  }

  // Insert in batches
  const batchSize = 1000;
  for (let i = 0; i < seatStatusValues.length; i += batchSize) {
    const batch = seatStatusValues.slice(i, i + batchSize);
    await dataSource.query(`
      INSERT INTO seat_status (id, trip_id, seat_id, booking_id, state, locked_until) VALUES
      ${batch.join(',\n')}
    `);
  }
  
  seedStats.seatStatus = seatStatusValues.length;
}

// 7️⃣ BOOKINGS & PASSENGERS
export async function seedBookings(dataSource: DataSource, vietnamData: VietnamSeedData): Promise<void> {
  console.log('   📋 Generating customer bookings...');
  
  const bookingValues: string[] = [];
  const targetCount = 140;
  const usedReferences = new Set<string>();
  
  // Get route points for pickup/dropoff
  const routePoints = await dataSource.query(`
    SELECT rp.id, rp."routeId", rp.type, t.id as trip_id
    FROM route_points rp
    JOIN trips t ON t.route_id = rp."routeId"
    WHERE rp.type IN ('pickup', 'both', 'dropoff')
  `) as Array<{id: string, routeId: string, type: string, trip_id: string}>;
  
  for (let i = 1; i <= targetCount; i++) {
    const id = randomUUID();
    idCollections.bookings.push(id);
    
    // Generate unique booking reference
    let bookingReference: string;
    do {
      bookingReference = generateBookingReference();
    } while (usedReferences.has(bookingReference));
    usedReferences.add(bookingReference);
    
    const userId = Math.random() > 0.15 ? random(idCollections.users) : null;
    const tripId = random(idCollections.trips);
    
    const totalAmount = Math.floor(Math.random() * 400 + 150) * 1000; // 150k-550k VND
    
    const statuses = ['pending', 'paid', 'completed', 'cancelled', 'expired'];
    const statusWeights = [0.1, 0.3, 0.45, 0.1, 0.05];
    let status = 'paid';
    const rand = Math.random();
    let cumulative = 0;
    for (let j = 0; j < statuses.length; j++) {
      cumulative += statusWeights[j];
      if (rand <= cumulative) {
        status = statuses[j];
        break;
      }
    }
    
    const contactEmail = `khach${i}@${random(['gmail.com', 'yahoo.com', 'hotmail.com'])}`;
    const contactPhone = `+84${random(['03', '05', '07', '08', '09'])}${Math.floor(Math.random() * 90000000) + 10000000}`;
    
    // Get pickup/dropoff points for this trip
    const relevantPoints = routePoints.filter((p) => p.trip_id === tripId);
    const pickupPoints = relevantPoints.filter((p) => p.type === 'pickup' || p.type === 'both');
    const dropoffPoints = relevantPoints.filter((p) => p.type === 'dropoff' || p.type === 'both');
    
    const pickupPointId = pickupPoints.length > 0 ? pickupPoints[0].id : null;
    const dropoffPointId = dropoffPoints.length > 0 ? dropoffPoints[0].id : null;
    
    const bookedAt = generateRandomDate(-Math.floor(Math.random() * 90));
    const lastModifiedAt = Math.random() > 0.7 ? generateRandomDate(-Math.floor(Math.random() * 30)) : null;
    const cancelledAt = status === 'cancelled' ? generateRandomDate(-Math.floor(Math.random() * 60)) : null;
    const expiresAt = status === 'pending' ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;

    bookingValues.push(
      `('${id}', '${bookingReference}', ${userId ? `'${userId}'` : 'NULL'}, '${tripId}', ${totalAmount}, '${status}', '${contactEmail}', '${contactPhone}', ${pickupPointId ? `'${pickupPointId}'` : 'NULL'}, ${dropoffPointId ? `'${dropoffPointId}'` : 'NULL'}, '${bookedAt}', ${lastModifiedAt ? `'${lastModifiedAt}'` : 'NULL'}, ${cancelledAt ? `'${cancelledAt}'` : 'NULL'}, ${expiresAt ? `'${expiresAt}'` : 'NULL'})`
    );
  }

  await dataSource.query(`
    INSERT INTO bookings (id, booking_reference, user_id, trip_id, total_amount, status, contact_email, contact_phone, pickup_point_id, dropoff_point_id, booked_at, last_modified_at, cancelled_at, expires_at) VALUES
    ${bookingValues.join(',\n')}
  `);
  
  seedStats.bookings = targetCount;
}

export async function seedPassengerDetails(dataSource: DataSource, vietnamData: VietnamSeedData): Promise<void> {
  console.log('   👨‍👩‍👧‍👦 Generating passenger information...');
  
  const passengerValues: string[] = [];
  let passengerIndex = 1;
  
  for (const bookingId of idCollections.bookings) {
    // Each booking has 1-4 passengers
    const passengerCount = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 2 : 1;
    
    for (let i = 0; i < passengerCount; i++) {
      const id = randomUUID();
      
      const fullName = generateVietnameseFullName(vietnamData);
      const documentId = Math.random() > 0.2 ? 
        `${Math.floor(Math.random() * 900000000) + 100000000}` : null;
      
      // Generate seat code
      const row = String.fromCharCode(65 + Math.floor(Math.random() * 10)); // A-J
      const position = Math.floor(Math.random() * 4) + 1; // 1-4
      const seatCode = `${row}${position}`;

      passengerValues.push(
        `('${id}', '${bookingId}', '${fullName}', ${documentId ? `'${documentId}'` : 'NULL'}, '${seatCode}')`
      );
      
      passengerIndex++;
    }
  }

  // Insert in batches
  const batchSize = 500;
  for (let i = 0; i < passengerValues.length; i += batchSize) {
    const batch = passengerValues.slice(i, i + batchSize);
    await dataSource.query(`
      INSERT INTO passenger_details (id, booking_id, full_name, document_id, seat_code) VALUES
      ${batch.join(',\n')}
    `);
  }
  
  seedStats.passengerDetails = passengerValues.length;
}

// 8️⃣ PAYMENTS
export async function seedPayments(dataSource: DataSource): Promise<void> {
  console.log('   💰 Generating payment transactions...');
  
  // Get bookings that should have payments (paid/completed status)
  const paidBookings = await dataSource.query(`
    SELECT id, total_amount FROM bookings 
    WHERE status IN ('paid', 'completed')
    ORDER BY id
  `) as Array<{id: string, total_amount: number}>;
  
  const paymentValues: string[] = [];
  const providers = ['payos', 'momo', 'zalopay', 'vnpay', 'banking'];
  
  for (let i = 0; i < paidBookings.length; i++) {
    const booking = paidBookings[i];
    const id = randomUUID();
    
    const provider = random(providers);
    const transactionRef = `${provider.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const payosOrderCode = provider === 'payos' ? generatePayOSOrderCode() : null;
    
    const statuses = ['completed', 'pending', 'failed'];
    const statusWeights = [0.85, 0.1, 0.05];
    let status = 'completed';
    const rand = Math.random();
    let cumulative = 0;
    for (let j = 0; j < statuses.length; j++) {
      cumulative += statusWeights[j];
      if (rand <= cumulative) {
        status = statuses[j];
        break;
      }
    }
    
    const processedAt = generateRandomDate(-Math.floor(Math.random() * 90));

    paymentValues.push(
      `('${id}', '${booking.id}', '${provider}', '${transactionRef}', ${payosOrderCode}, ${booking.total_amount}, '${status}', '${processedAt}')`
    );
  }

  await dataSource.query(`
    INSERT INTO payments (id, booking_id, provider, transaction_ref, payos_order_code, amount, status, processed_at) VALUES
    ${paymentValues.join(',\n')}
  `);
  
  seedStats.payments = paymentValues.length;
}

// 9️⃣ REVIEWS & FEEDBACK
export async function seedReviews(dataSource: DataSource, vietnamData: VietnamSeedData): Promise<void> {
  console.log('   ⭐ Generating customer reviews...');
  
  // Get completed bookings for reviews
  const completedBookings = await dataSource.query(`
    SELECT b.id as booking_id, b.user_id, b.trip_id 
    FROM bookings b 
    JOIN trips t ON t.id = b.trip_id 
    WHERE b.status = 'completed' AND b.user_id IS NOT NULL
    AND t.status = 'completed'
    ORDER BY b.id
  `) as Array<{booking_id: string, user_id: string, trip_id: string}>;
  
  const reviewValues: string[] = [];
  const vietnameseComments = [
    'Chuyến đi rất tốt, tài xế lái xe cẩn thận.',
    'Xe sạch sẽ, ghế ngồi thoải mái. Sẽ đi lại.',
    'Đúng giờ, nhân viên phục vụ nhiệt tình.',
    'Giá cả hợp lý, chất lượng dịch vụ tốt.',
    'Xe có wifi, điều hòa mát. Rất hài lòng.',
    'Tài xế thân thiện, hỗ trợ hành khách tốt.',
    'Ghế nằm thoải mái, có thể ngủ ngon.',
    'Xe khởi hành đúng giờ, đến nơi an toàn.',
    'Nhà xe uy tín, sẽ giới thiệu cho bạn bè.',
    'Dịch vụ tốt nhưng có thể cải thiện thêm.',
    null // Some reviews without comments
  ];
  
  // Only review 60% of completed bookings
  const reviewCount = Math.floor(completedBookings.length * 0.6);
  
  for (let i = 0; i < reviewCount; i++) {
    const booking = completedBookings[i];
    const id = randomUUID();
    
    const rating = Math.floor(Math.random() * 2) + 4; // Mostly 4-5 stars (positive bias)
    const comment = Math.random() > 0.3 ? random(vietnameseComments) : null;
    const createdAt = generateRandomDate(-Math.floor(Math.random() * 60));

    reviewValues.push(
      `('${id}', '${booking.user_id}', '${booking.trip_id}', '${booking.booking_id}', ${rating}, ${comment ? `'${comment}'` : 'NULL'}, '${createdAt}')`
    );
  }

  await dataSource.query(`
    INSERT INTO reviews (id, user_id, trip_id, booking_id, rating, comment, created_at) VALUES
    ${reviewValues.join(',\n')}
  `);
  
  seedStats.reviews = reviewCount;
}

export async function seedFeedbacks(dataSource: DataSource, vietnamData: VietnamSeedData): Promise<void> {
  console.log('   📝 Generating feedbacks...');
  
  const feedbackValues: string[] = [];
  const targetCount = 75;
  
  const feedbackComments = [
    'Cần cải thiện chất lượng âm thanh trên xe.',
    'Đề xuất bổ sung thêm điểm dừng nghỉ.',
    'Nhà vệ sinh trên xe cần được vệ sinh thường xuyên hơn.',
    'Tài xế nên thông báo rõ về thời gian dừng nghỉ.',
    'Xe cần có thêm ổ cắm sạc điện thoại.',
    'Ánh sáng đọc sách cần được cải thiện.',
    'Cần có dịch vụ đặt vé online thuận tiện hơn.',
    'Đề xuất có menu đồ ăn nhẹ trên xe dài ngày.',
    null
  ];
  
  for (let i = 1; i <= targetCount; i++) {
    const id = randomUUID();
    
    const userId = random(idCollections.users);
    const tripId = random(idCollections.trips);
    const rating = Math.floor(Math.random() * 5) + 1;
    const comment = Math.random() > 0.2 ? random(feedbackComments) : null;
    const submittedAt = generateRandomDate(-Math.floor(Math.random() * 120));

    feedbackValues.push(
      `('${id}', '${userId}', '${tripId}', ${rating}, ${comment ? `'${comment}'` : 'NULL'}, '${submittedAt}')`
    );
  }

  await dataSource.query(`
    INSERT INTO feedbacks (id, user_id, trip_id, rating, comment, submitted_at) VALUES
    ${feedbackValues.join(',\n')}
  `);
  
  seedStats.feedbacks = targetCount;
}

export async function seedNotifications(dataSource: DataSource, vietnamData: VietnamSeedData): Promise<void> {
  console.log('   🔔 Generating notifications...');
  
  const notificationValues: string[] = [];
  const targetCount = 220;
  
  const notificationTemplates = [
    { 
      title: 'Đặt vé thành công', 
      message: 'Bạn đã đặt vé thành công cho chuyến {route}. Mã đặt chỗ: {booking_ref}',
      type: 'booking_success',
      channels: ['email', 'in_app']
    },
    { 
      title: 'Thanh toán thành công', 
      message: 'Thanh toán của bạn đã được xử lý thành công. Số tiền: {amount}đ',
      type: 'payment_success',
      channels: ['email', 'sms', 'in_app']
    },
    { 
      title: 'Nhắc nhở chuyến đi', 
      message: 'Chuyến đi của bạn sẽ khởi hành trong 2 giờ nữa. Vui lòng có mặt đúng giờ.',
      type: 'trip_reminder',
      channels: ['sms', 'push', 'in_app']
    },
    { 
      title: 'Hủy chuyến đi', 
      message: 'Chuyến đi {route} đã được hủy do thời tiết. Chúng tôi sẽ hoàn tiền cho bạn.',
      type: 'trip_cancelled',
      channels: ['email', 'sms']
    },
    { 
      title: 'Đánh giá chuyến đi', 
      message: 'Cảm ơn bạn đã sử dụng dịch vụ. Hãy đánh giá chuyến đi của bạn.',
      type: 'review_request',
      channels: ['in_app', 'email']
    }
  ];
  
  for (let i = 1; i <= targetCount; i++) {
    const id = randomUUID();
    
    const template = random(notificationTemplates);
    const bookingId = Math.random() > 0.3 ? random(idCollections.bookings) : null;
    const userId = random(idCollections.users);
    
    const channel = random(template.channels) as 'email' | 'sms' | 'push' | 'in_app';
    
    const statuses = ['sent', 'delivered', 'read', 'pending', 'failed'];
    const statusWeights = [0.4, 0.3, 0.2, 0.05, 0.05];
    let status = 'sent';
    const rand = Math.random();
    let cumulative = 0;
    for (let j = 0; j < statuses.length; j++) {
      cumulative += statusWeights[j];
      if (rand <= cumulative) {
        status = statuses[j];
        break;
      }
    }
    
    const data = JSON.stringify({
      booking_ref: bookingId ? `BK${Date.now()}` : null,
      route: 'Hồ Chí Minh - Đà Nẵng',
      amount: Math.floor(Math.random() * 400 + 150) * 1000
    });
    
    const createdAt = generateRandomDate(-Math.floor(Math.random() * 90));
    const sentAt = ['sent', 'delivered', 'read'].includes(status) ? createdAt : generateRandomDate(-Math.floor(Math.random() * 30));
    const readAt = status === 'read' ? generateRandomDate(-Math.floor(Math.random() * 30)) : null;

    notificationValues.push(
      `('${id}', ${bookingId ? `'${bookingId}'` : 'NULL'}, '${channel}', '${template.type}_${channel}', '${status}', '${sentAt}', '${userId}', '${template.title}', '${template.message}', '${template.type}', '${data}')`
    );
  }

  // Insert in batches
  const batchSize = 300;
  for (let i = 0; i < notificationValues.length; i += batchSize) {
    const batch = notificationValues.slice(i, i + batchSize);
    await dataSource.query(`
      INSERT INTO notifications (id, booking_id, channel, template, status, sent_at, user_id, title, message, type, data) VALUES
      ${batch.join(',\n')}
    `);
  }
  
  seedStats.notifications = targetCount;
}

export async function seedAuditLogs(dataSource: DataSource): Promise<void> {
  console.log('   📃 Generating audit trails...');
  
  const auditValues: string[] = [];
  const targetCount = 180;
  
  const auditActions = [
    { action: 'CREATE', entity: 'booking', description: 'Tạo đặt chỗ mới' },
    { action: 'UPDATE', entity: 'booking', description: 'Cập nhật thông tin đặt chỗ' },
    { action: 'CANCEL', entity: 'booking', description: 'Hủy đặt chỗ' },
    { action: 'CREATE', entity: 'payment', description: 'Tạo giao dịch thanh toán' },
    { action: 'UPDATE', entity: 'user', description: 'Cập nhật thông tin người dùng' },
    { action: 'LOGIN', entity: 'auth', description: 'Đăng nhập hệ thống' },
    { action: 'LOGOUT', entity: 'auth', description: 'Đăng xuất hệ thống' },
    { action: 'CREATE', entity: 'review', description: 'Tạo đánh giá mới' }
  ];
  
  for (let i = 1; i <= targetCount; i++) {
    const id = randomUUID();
    
    const auditAction = random(auditActions);
    const userId = Math.random() > 0.1 ? random(idCollections.users) : null;
    
    let entityId: string;
    switch (auditAction.entity) {
      case 'booking':
        entityId = random(idCollections.bookings);
        break;
      case 'user':
        entityId = random(idCollections.users);
        break;
      case 'payment':
        entityId = random(idCollections.bookings); // Use booking ID as payment entity
        break;
      default:
        entityId = random(idCollections.users);
    }
    
    const oldValues = auditAction.action === 'UPDATE' ? 
      JSON.stringify({ status: 'pending', amount: 250000 }) : null;
    const newValues = auditAction.action !== 'CREATE' ? 
      JSON.stringify({ status: 'paid', amount: 300000 }) : 
      JSON.stringify({ id: entityId, created: true });
    
    const ipAddress = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];
    const userAgent = random(userAgents);
    
    const createdAt = generateRandomDate(-Math.floor(Math.random() * 120));
    
    const metadata = JSON.stringify({
      entity: auditAction.entity, 
      entityId, 
      oldValues, 
      newValues, 
      ipAddress, 
      userAgent
    }).replace(/'/g, "''");

    auditValues.push(
      `('${id}', ${userId ? `'${userId}'` : 'NULL'}, '${auditAction.action}', '${auditAction.description}', '${metadata}', '${createdAt}')`
    );
  }

  // Insert in batches
  const batchSize = 300;
  for (let i = 0; i < auditValues.length; i += batchSize) {
    const batch = auditValues.slice(i, i + batchSize);
    await dataSource.query(`
      INSERT INTO audit_logs (id, actor_id, action, details, metadata, created_at) VALUES
      ${batch.join(',\n')}
    `);
  }
  
  seedStats.auditLogs = targetCount;
}

export async function seedBookingModifications(dataSource: DataSource): Promise<void> {
  console.log('   📊 Generating booking modifications...');
  
  const modificationValues: string[] = [];
  const targetCount = 65;
  
  const modificationTypes = [
    'passenger_info',
    'seat_change', 
    'contact_info'
  ];
  
  const modificationReasons = [
    'Khách hàng yêu cầu thay đổi thông tin',
    'Cập nhật số điện thoại liên hệ',
    'Thay đổi ghế ngồi theo yêu cầu',
    'Cập nhật thông tin CMND/CCCD',
    'Thay đổi điểm đón/trả khách',
    'Chỉnh sửa lỗi nhập liệu',
    null
  ];
  
  for (let i = 1; i <= targetCount; i++) {
    const id = randomUUID();
    
    const bookingId = random(idCollections.bookings);
    const modifiedBy = Math.random() > 0.2 ? random(idCollections.users) : null;
    const modificationType = random(modificationTypes);
    const description = random(modificationReasons); // Always provide a description
    
    const oldValues = JSON.stringify({
      passenger_name: 'Nguyễn Văn A',
      seat_code: 'A1',
      contact_phone: '+84901234567'
    });
    
    const newValues = JSON.stringify({
      passenger_name: 'Nguyễn Văn An',
      seat_code: 'A2', 
      contact_phone: '+84907654321'
    });
    
    const createdAt = generateRandomDate(-Math.floor(Math.random() * 60));

    modificationValues.push(
      `('${id}', '${bookingId}', ${modifiedBy ? `'${modifiedBy}'` : 'NULL'}, '${modificationType}', '${description}', '${newValues}', '${oldValues}', '${createdAt}')`
    );
  }

  await dataSource.query(`
    INSERT INTO booking_modification_history (id, booking_id, user_id, modification_type, description, changes, "previousValues", modified_at) VALUES
    ${modificationValues.join(',\n')}
  `);
  
  seedStats.bookingModifications = targetCount;
}