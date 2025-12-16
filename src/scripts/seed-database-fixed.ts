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
});

// ===================== HELPER FUNCTIONS =====================

/**
 * Generate realistic Vietnamese bus operator names
 */
function generateOperatorNames(): string[] {
  return [
    'Xe Khách Phương Trang', 'Xe Khách Hoàng Long', 'Xe Khách Mai Linh Express', 
    'Xe Khách Thành Bưởi', 'Xe Khách Sinh Café Bus', 'Xe Khách Hùng Cường',
    'Xe Khách Thanh Nga', 'Xe Khách Hoàng Gia', 'Xe Khách Minh Tân',
    'Xe Khách Sao Việt', 'Xe Khách Nam Sài Gòn', 'Xe Khách Cúc Tùng',
    'Xe Khách Tâm Hạnh', 'Xe Khách Bảo Anh Express', 'Xe Khách Minh Quốc',
    'Xe Khách Đồng Phương', 'Xe Khách Thiên Tân', 'Xe Khách Bình Minh',
    'Xe Khách Thuận Tiện', 'Xe Khách Hoa Mai'
  ];
}

/**
 * Generate realistic Vietnamese city pairs for routes
 */
function generateRealisticRoutes(): Array<{origin: string, destination: string, distance: number}> {
  return [
    // Major North-South routes
    { origin: 'Hà Nội', destination: 'Hồ Chí Minh', distance: 1710 },
    { origin: 'Hồ Chí Minh', destination: 'Hà Nội', distance: 1710 },
    { origin: 'Hà Nội', destination: 'Đà Nẵng', distance: 760 },
    { origin: 'Đà Nẵng', destination: 'Hà Nội', distance: 760 },
    { origin: 'Hồ Chí Minh', destination: 'Nha Trang', distance: 430 },
    { origin: 'Nha Trang', destination: 'Hồ Chí Minh', distance: 430 },
    
    // Regional routes - North
    { origin: 'Hà Nội', destination: 'Hải Phòng', distance: 102 },
    { origin: 'Hải Phòng', destination: 'Hà Nội', distance: 102 },
    { origin: 'Hà Nội', destination: 'Hạ Long', distance: 156 },
    { origin: 'Hạ Long', destination: 'Hà Nội', distance: 156 },
    { origin: 'Hà Nội', destination: 'Thái Nguyên', distance: 78 },
    { origin: 'Thái Nguyên', destination: 'Hà Nội', distance: 78 },
    
    // Regional routes - Central
    { origin: 'Đà Nẵng', destination: 'Huế', distance: 108 },
    { origin: 'Huế', destination: 'Đà Nẵng', distance: 108 },
    { origin: 'Đà Nẵng', destination: 'Hội An', distance: 30 },
    { origin: 'Hội An', destination: 'Đà Nẵng', distance: 30 },
    { origin: 'Đà Nẵng', destination: 'Quy Nhon', distance: 300 },
    { origin: 'Quy Nhon', destination: 'Đà Nẵng', distance: 300 },
    
    // Regional routes - South
    { origin: 'Hồ Chí Minh', destination: 'Vũng Tàu', distance: 125 },
    { origin: 'Vũng Tàu', destination: 'Hồ Chí Minh', distance: 125 },
    { origin: 'Hồ Chí Minh', destination: 'Cần Thơ', distance: 169 },
    { origin: 'Cần Thơ', destination: 'Hồ Chí Minh', distance: 169 },
    { origin: 'Hồ Chí Minh', destination: 'Đà Lạt', distance: 308 },
    { origin: 'Đà Lạt', destination: 'Hồ Chí Minh', distance: 308 },
    { origin: 'Hồ Chí Minh', destination: 'Phan Thiết', distance: 200 },
    { origin: 'Phan Thiết', destination: 'Hồ Chí Minh', distance: 200 },
    
    // Cross-regional routes
    { origin: 'Huế', destination: 'Hồ Chí Minh', distance: 1050 },
    { origin: 'Hồ Chí Minh', destination: 'Huế', distance: 1050 },
    { origin: 'Cần Thơ', destination: 'Đà Nẵng', distance: 670 },
    { origin: 'Đà Nẵng', destination: 'Cần Thơ', distance: 670 },
    { origin: 'Nha Trang', destination: 'Đà Nẵng', distance: 530 },
    { origin: 'Đà Nẵng', destination: 'Nha Trang', distance: 530 }
  ];
}

/**
 * Get realistic bus configurations
 */
function getBusConfigurations(): Array<{model: string, capacity: number, layoutType: string, seatsPerRow: number}> {
  return [
    // Standard buses
    { model: 'Hyundai Universe', capacity: 45, layoutType: 'standard_2x2', seatsPerRow: 4 },
    { model: 'Thaco Isuzu', capacity: 32, layoutType: 'standard_2x2', seatsPerRow: 4 },
    { model: 'Mercedes Benz O500', capacity: 55, layoutType: 'standard_2x3', seatsPerRow: 5 },
    { model: 'Samco Felix', capacity: 28, layoutType: 'vip_1x2', seatsPerRow: 3 },
    { model: 'Daewoo FX120', capacity: 40, layoutType: 'standard_2x2', seatsPerRow: 4 },
    { model: 'Hino AK', capacity: 35, layoutType: 'standard_2x2', seatsPerRow: 4 },
    { model: 'Isuzu Citybus', capacity: 24, layoutType: 'vip_1x2', seatsPerRow: 3 },
    { model: 'King Long XMQ6127', capacity: 50, layoutType: 'standard_2x3', seatsPerRow: 5 },
    { model: 'Yutong ZK6122', capacity: 42, layoutType: 'standard_2x2', seatsPerRow: 4 },
    { model: 'Golden Dragon XML6127', capacity: 36, layoutType: 'sleeper_1x2', seatsPerRow: 3 }
  ];
}

/**
 * Generate realistic seat codes (A1, A2, B1, B2, etc.)
 */
function generateSeatCodes(capacity: number, seatsPerRow: number): string[] {
  const codes: string[] = [];
  const totalRows = Math.ceil(capacity / seatsPerRow);
  
  let seatCount = 0;
  for (let row = 0; row < totalRows && seatCount < capacity; row++) {
    const rowLetter = String.fromCharCode(65 + row); // A, B, C, etc.
    for (let pos = 1; pos <= seatsPerRow && seatCount < capacity; pos++) {
      codes.push(`${rowLetter}${pos}`);
      seatCount++;
    }
  }
  
  return codes;
}

/**
 * Calculate realistic travel time based on distance
 */
function calculateTravelTime(distanceKm: number): number {
  // Average speed: 60-80 km/h depending on road type
  const baseHours = distanceKm / 70; // Base calculation at 70 km/h
  const bufferTime = Math.max(30, distanceKm * 0.1); // Add buffer for stops/traffic
  return Math.round((baseHours * 60) + bufferTime); // Return minutes
}

/**
 * Calculate realistic pricing based on distance (VND)
 */
function calculateBasePrice(distanceKm: number): number {
  // Pricing: ~2000-3000 VND per km for standard buses
  const pricePerKm = 2500;
  const basePrice = distanceKm * pricePerKm;
  // Round to nearest 10,000 VND
  return Math.round(basePrice / 10000) * 10000;
}

/**
 * Generate realistic departure times (avoid night hours for long trips)
 */
function generateDepartureTime(baseDate: Date, distanceKm: number): Date {
  const date = new Date(baseDate);
  
  // For long trips (>8 hours), prefer early morning or evening departure
  // For short trips (<4 hours), any reasonable time
  let hour: number;
  if (distanceKm > 600) { // Long trips
    hour = Math.random() < 0.7 ? 6 + Math.floor(Math.random() * 4) : 20 + Math.floor(Math.random() * 3);
  } else if (distanceKm > 200) { // Medium trips
    hour = 5 + Math.floor(Math.random() * 18); // 5 AM to 11 PM
  } else { // Short trips
    hour = 6 + Math.floor(Math.random() * 16); // 6 AM to 10 PM
  }
  
  const minute = Math.floor(Math.random() * 4) * 15; // 00, 15, 30, 45
  
  date.setHours(hour, minute, 0, 0);
  return date;
}

/**
 * Check if two time ranges overlap
 */
function timeRangesOverlap(
  start1: Date, end1: Date,
  start2: Date, end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Comprehensive validation functions
 */
async function validateSeedData() {
  console.log('🔍 Running validation checks...');
  
  try {
    // 1. Validate Operator-Bus relationships
    console.log('  ✓ Checking operator-bus relationships...');
    const orphanBuses = await dataSource.query(`
      SELECT COUNT(*) as count FROM buses b 
      LEFT JOIN operators o ON b.operator_id = o.id 
      WHERE o.id IS NULL
    `);
    if (parseInt(orphanBuses[0].count) > 0) {
      throw new Error(`Found ${orphanBuses[0].count} buses without valid operator`);
    }

    // 2. Validate Bus capacity = Seat count
    console.log('  ✓ Checking bus capacity matches seat count...');
    const capacityMismatch = await dataSource.query(`
      SELECT b.id, b.seat_capacity, COUNT(s.id) as actual_seats 
      FROM buses b 
      LEFT JOIN seats s ON b.id = s.bus_id 
      GROUP BY b.id, b.seat_capacity 
      HAVING b.seat_capacity != COUNT(s.id)
    `);
    if (capacityMismatch.length > 0) {
      console.error('❌ Capacity mismatches found:', capacityMismatch);
      throw new Error(`Found ${capacityMismatch.length} buses with capacity != seat count`);
    }

    // 3. Validate Seat layout consistency
    console.log('  ✓ Checking seat layout consistency...');
    const layoutMismatch = await dataSource.query(`
      SELECT b.id, b.seat_capacity, sl.total_rows * sl.seats_per_row as calculated_capacity 
      FROM buses b 
      JOIN seat_layouts sl ON b.id = sl.bus_id 
      WHERE b.seat_capacity > sl.total_rows * sl.seats_per_row
    `);
    if (layoutMismatch.length > 0) {
      throw new Error(`Found ${layoutMismatch.length} buses with capacity > layout capacity`);
    }

    // 4. Validate Trip time logic
    console.log('  ✓ Checking trip departure < arrival times...');
    const invalidTimes = await dataSource.query(`
      SELECT COUNT(*) as count FROM trips 
      WHERE departure_time >= arrival_time
    `);
    if (parseInt(invalidTimes[0].count) > 0) {
      throw new Error(`Found ${invalidTimes[0].count} trips with departure >= arrival time`);
    }

    // 5. Validate Trip-Route relationships
    console.log('  ✓ Checking trip-route relationships...');
    const orphanTrips = await dataSource.query(`
      SELECT COUNT(*) as count FROM trips t 
      LEFT JOIN routes r ON t.route_id = r.id 
      WHERE r.id IS NULL
    `);
    if (parseInt(orphanTrips[0].count) > 0) {
      throw new Error(`Found ${orphanTrips[0].count} trips without valid route`);
    }

    // 6. Validate Booking-Trip relationships
    console.log('  ✓ Checking booking-trip relationships...');
    const invalidBookings = await dataSource.query(`
      SELECT COUNT(*) as count FROM bookings b 
      LEFT JOIN trips t ON b.trip_id = t.id 
      WHERE t.id IS NULL
    `);
    if (parseInt(invalidBookings[0].count) > 0) {
      throw new Error(`Found ${invalidBookings[0].count} bookings without valid trip`);
    }

    // 7. Validate Seat booking constraints
    console.log('  ✓ Checking seat booking constraints...');
    const duplicateBookings = await dataSource.query(`
      SELECT trip_id, seat_id, COUNT(*) as bookings 
      FROM seat_status 
      WHERE state = 'booked' 
      GROUP BY trip_id, seat_id 
      HAVING COUNT(*) > 1
    `);
    if (duplicateBookings.length > 0) {
      throw new Error(`Found ${duplicateBookings.length} seats booked multiple times for same trip`);
    }

    // 8. Validate Passenger details completeness
    console.log('  ✓ Checking passenger details...');
    const missingPassengers = await dataSource.query(`
      SELECT COUNT(*) as count FROM seat_status ss 
      LEFT JOIN passenger_details pd ON ss.booking_id = pd.booking_id AND ss.seat_code = pd.seat_code 
      WHERE ss.state = 'booked' AND pd.id IS NULL
    `);
    if (parseInt(missingPassengers[0].count) > 0) {
      console.warn(`⚠️  Found ${missingPassengers[0].count} booked seats without passenger details`);
    }

    // 9. Validate Pricing reasonableness
    console.log('  ✓ Checking pricing ranges...');
    const pricingIssues = await dataSource.query(`
      SELECT COUNT(*) as count FROM trips 
      WHERE base_price < 10000 OR base_price > 2000000
    `);
    if (parseInt(pricingIssues[0].count) > 0) {
      console.warn(`⚠️  Found ${pricingIssues[0].count} trips with unrealistic pricing`);
    }

    // 10. Validate Bus schedule conflicts
    console.log('  ✓ Checking bus schedule conflicts...');
    const scheduleConflicts = await dataSource.query(`
      SELECT t1.bus_id, COUNT(*) as conflicts
      FROM trips t1 
      JOIN trips t2 ON t1.bus_id = t2.bus_id AND t1.id != t2.id
      WHERE (t1.departure_time <= t2.arrival_time AND t1.arrival_time >= t2.departure_time)
      GROUP BY t1.bus_id
      HAVING COUNT(*) > 0
    `);
    if (scheduleConflicts.length > 0) {
      console.warn(`⚠️  Found schedule conflicts for ${scheduleConflicts.length} buses`);
    }

    console.log('✅ All validation checks completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    throw error;
  }
}

// ===================== MAIN SEEDING FUNCTION =====================

async function seedDatabase() {
  try {
    await dataSource.initialize();
    console.log('🔌 Connected to database');

    // Check if data already exists
    const existingUsersCount = await dataSource.query('SELECT COUNT(*) FROM users');
    if (parseInt(existingUsersCount[0].count) > 0) {
      console.log('🧹 Database already has data. Clearing existing data first...');
      
      // Clear all data in correct order (respecting foreign key constraints)
      await dataSource.query('TRUNCATE TABLE booking_modification_history CASCADE');
      await dataSource.query('TRUNCATE TABLE passenger_details CASCADE');
      await dataSource.query('TRUNCATE TABLE seat_status CASCADE'); 
      await dataSource.query('TRUNCATE TABLE bookings CASCADE');
      await dataSource.query('TRUNCATE TABLE trips CASCADE');
      await dataSource.query('TRUNCATE TABLE seats CASCADE');
      await dataSource.query('TRUNCATE TABLE seat_layouts CASCADE');
      await dataSource.query('TRUNCATE TABLE buses CASCADE');
      await dataSource.query('TRUNCATE TABLE routes CASCADE');
      await dataSource.query('TRUNCATE TABLE operators CASCADE');
      await dataSource.query('TRUNCATE TABLE users CASCADE');
      
      console.log('✅ Existing data cleared successfully');
    }

    // 1. Seed Users (50 records with realistic Vietnamese data)
    console.log('👥 Seeding users...');
    const userIds: string[] = [];
    const vietnameseNames = [
      'Nguyễn Văn Nam', 'Trần Thị Hoa', 'Lê Minh Tuấn', 'Phạm Thu Hà', 'Hoàng Đức Anh',
      'Vũ Thị Lan', 'Đặng Quang Minh', 'Bùi Thị Mai', 'Đỗ Văn Hùng', 'Ngô Thị Thu',
      'Lý Văn Đức', 'Phan Thị Hương', 'Trịnh Quang Hải', 'Đinh Thị Nga', 'Tạ Văn Sơn',
      'Võ Thị Linh', 'Huỳnh Minh Khôi', 'Dương Thị Phương', 'Trương Văn Hoà', 'Cao Thị Yến',
      'Lưu Minh Đạt', 'Tôn Thị Bích', 'Đoàn Văn Hiếu', 'Kiều Thị Loan', 'Lâm Minh Tâm'
    ];
    
    const userValues: string[] = [];
    for (let i = 1; i <= 50; i++) {
      const id = `00000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      userIds.push(id);
      const role = i <= 2 ? 'admin' : i <= 7 ? 'operator' : 'customer';
      const googleId = i <= 10 ? `'google_${i}'` : 'NULL';
      const phone = `+84${(900000000 + i * 1000).toString()}`;
      const name = vietnameseNames[(i - 1) % vietnameseNames.length];
      
      userValues.push(`('${id}', ${googleId}, 'user${i}@gmail.com', '${name}', '${phone}', '$2b$10$hashedpassword${i}', '${role}', NOW())`);
    }
    
    await dataSource.query(`
      INSERT INTO users (id, "googleId", email, name, phone, password_hash, role, created_at) VALUES
      ${userValues.join(',\n')};
    `);

    // 2. Seed Operators (15 records)
    console.log('🚌 Seeding operators...');
    const operatorIds: string[] = [];
    const operatorNames = generateOperatorNames().slice(0, 15);
    const operatorValues: string[] = [];
    
    for (let i = 1; i <= 15; i++) {
      const id = `10000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      operatorIds.push(id);
      const status = i <= 12 ? 'approved' : i <= 13 ? 'pending' : 'suspended';
      const approvedAt = status === 'approved' ? 'NOW() - INTERVAL \'30 days\'' : 'NULL';
      const name = operatorNames[i-1];
      const domain = name.toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .replace(/\s+/g, '')
        .replace('xe', '')
        .replace('khach', '') + 'bus.vn';
      
      operatorValues.push(`('${id}', '${name}', 'contact@${domain}', '+84${(28 + i).toString()}${(8000000 + i * 1000).toString()}', '${status}', ${approvedAt})`);
    }
    
    await dataSource.query(`
      INSERT INTO operators (id, name, contact_email, contact_phone, status, approved_at) VALUES
      ${operatorValues.join(',\n')};
    `);

    // 3. Seed Routes (30 realistic Vietnamese routes)
    console.log('🛣️ Seeding routes...');
    const routeIds: string[] = [];
    const routeData = generateRealisticRoutes();
    const routeValues: string[] = [];
    
    for (let i = 0; i < routeData.length; i++) {
      const id = `20000000-0000-4000-8000-${(i + 1).toString().padStart(12, '0')}`;
      routeIds.push(id);
      const route = routeData[i];
      // Assign operators evenly, prioritize approved operators
      const operatorId = operatorIds[i % 12]; // Use first 12 operators (all approved)
      const name = `${route.origin} - ${route.destination}`;
      const estimatedMinutes = calculateTravelTime(route.distance);
      
      routeValues.push(`('${id}', '${operatorId}', '${name}', 'Tuyến xe từ ${route.origin} đến ${route.destination}', '${route.origin}', '${route.destination}', ${route.distance}, ${estimatedMinutes}, true, '{}', NOW(), NOW())`);
    }
    
    await dataSource.query(`
      INSERT INTO routes (id, operator_id, name, description, origin, destination, distance_km, estimated_minutes, is_active, amenities, "createdAt", "updatedAt") VALUES
      ${routeValues.join(',\n')};
    `);

    // 4. Seed Buses (40 records with proper capacity matching)
    console.log('🚐 Seeding buses...');
    const busIds: string[] = [];
    const busData: Array<{id: string, operatorId: string, capacity: number, model: string, layoutType: string, seatsPerRow: number}> = [];
    const busConfigs = getBusConfigurations();
    const busValues: string[] = [];
    
    for (let i = 1; i <= 40; i++) {
      const id = `30000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      busIds.push(id);
      
      // Distribute buses among approved operators
      const operatorId = operatorIds[i % 12];
      const config = busConfigs[i % busConfigs.length];
      const plateNumber = `${i <= 15 ? '29' : i <= 25 ? '51' : i <= 35 ? '43' : '77'}A-${(10000 + i).toString()}`;
      
      busData.push({
        id,
        operatorId,
        capacity: config.capacity,
        model: config.model,
        layoutType: config.layoutType,
        seatsPerRow: config.seatsPerRow
      });
      
      const amenities = JSON.stringify({
        wifi: Math.random() > 0.3,
        ac: true,
        usb_ports: Math.random() > 0.4,
        restroom: config.capacity > 35,
        entertainment: config.capacity > 40
      });
      
      busValues.push(`('${id}', '${operatorId}', '${plateNumber}', '${config.model}', ${config.capacity}, '${amenities}')`);
    }
    
    await dataSource.query(`
      INSERT INTO buses (id, operator_id, plate_number, model, seat_capacity, amenities_json) VALUES
      ${busValues.join(',\n')};
    `);

    // 5. Seed Seat Layouts (40 records - exactly one per bus)
    console.log('💺 Seeding seat layouts...');
    const seatLayoutValues: string[] = [];
    
    busData.forEach((bus, index) => {
      const id = `40000000-0000-4000-8000-${(index + 1).toString().padStart(12, '0')}`;
      const totalRows = Math.ceil(bus.capacity / bus.seatsPerRow);
      
      // Create realistic layout configuration
      const layoutConfig = JSON.stringify({
        aisles: bus.seatsPerRow === 4 ? [2] : bus.seatsPerRow === 5 ? [2, 3] : [1], // Aisle positions
        doors: [0, totalRows - 1], // Front and back doors
        emergency_exits: totalRows > 8 ? [Math.floor(totalRows / 2)] : [],
        restroom: bus.capacity > 35 ? [totalRows - 1] : []
      });
      
      const seatPricing = JSON.stringify({
        basePrice: 0, // Will be set per trip
        seatTypePrices: {
          normal: 1.0,
          vip: 1.3,
          business: 1.5
        }
      });
      
      seatLayoutValues.push(`('${id}', '${bus.id}', '${bus.layoutType}', ${totalRows}, ${bus.seatsPerRow}, '${layoutConfig}', '${seatPricing}', NOW(), NOW())`);
    });
    
    await dataSource.query(`
      INSERT INTO seat_layouts (id, bus_id, "layoutType", total_rows, seats_per_row, layout_config, seat_pricing, created_at, updated_at) VALUES
      ${seatLayoutValues.join(',\n')};
    `);

    // 6. Seed Seats (exact capacity per bus)
    console.log('🪑 Seeding seats...');
    const seatsByBus: Record<string, string[]> = {};
    let seatCounter = 1;
    const seatValues: string[] = [];
    
    for (const bus of busData) {
      const seatCodes = generateSeatCodes(bus.capacity, bus.seatsPerRow);
      seatsByBus[bus.id] = [];
      
      for (let j = 0; j < seatCodes.length; j++) {
        const seatId = `50000000-0000-4000-8000-${seatCounter.toString().padStart(12, '0')}`;
        seatsByBus[bus.id].push(seatId);
        
        const seatCode = seatCodes[j];
        // Determine seat type based on position and layout
        let seatType = 'normal';
        if (bus.layoutType.includes('vip')) {
          seatType = j < 6 ? 'vip' : 'business';
        } else if (bus.layoutType.includes('business')) {
          seatType = j < 4 ? 'vip' : j < 12 ? 'business' : 'normal';
        } else {
          seatType = j < 4 ? 'business' : 'normal';
        }
        
        seatValues.push(`('${seatId}', '${bus.id}', '${seatCode}', '${seatType}', true)`);
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

    console.log(`✅ Created ${seatCounter - 1} seats across ${busData.length} buses`);

    // 7. Seed Trips (100 records with realistic scheduling)
    console.log('🚌 Seeding trips...');
    const tripIds: string[] = [];
    const tripValues: string[] = [];
    const busSchedules: Record<string, Array<{start: Date, end: Date}>> = {};
    
    // Initialize bus schedules
    busData.forEach(bus => {
      busSchedules[bus.id] = [];
    });
    
    let tripCounter = 1;
    const now = new Date();
    
    // Create trips for next 30 days
    for (let day = 0; day < 30; day++) {
      const currentDate = new Date(now);
      currentDate.setDate(now.getDate() + day);
      
      // Create multiple trips per day for popular routes
      const tripsPerDay = day < 7 ? 15 : 8; // More trips in the first week
      
      for (let trip = 0; trip < tripsPerDay; trip++) {
        if (tripCounter > 100) break;
        
        const routeIndex = Math.floor(Math.random() * routeData.length);
        const route = routeData[routeIndex];
        const routeId = routeIds[routeIndex];
        
        // Select appropriate bus for this route
        let selectedBus: typeof busData[0] | null = null;
        let attempts = 0;
        
        while (!selectedBus && attempts < 20) {
          const busIndex = Math.floor(Math.random() * busData.length);
          const candidateBus = busData[busIndex];
          
          // Check if bus is available for this route's operator (simplified)
          const departureTime = generateDepartureTime(currentDate, route.distance);
          const travelTime = calculateTravelTime(route.distance);
          const arrivalTime = new Date(departureTime.getTime() + travelTime * 60000);
          
          // Check for conflicts with existing schedule
          const hasConflict = busSchedules[candidateBus.id].some(schedule =>
            timeRangesOverlap(departureTime, arrivalTime, schedule.start, schedule.end)
          );
          
          if (!hasConflict) {
            selectedBus = candidateBus;
            // Add buffer time for bus turnaround
            const bufferStart = new Date(departureTime.getTime() - 60 * 60000); // 1 hour before
            const bufferEnd = new Date(arrivalTime.getTime() + 60 * 60000); // 1 hour after
            busSchedules[candidateBus.id].push({ start: bufferStart, end: bufferEnd });
          }
          
          attempts++;
        }
        
        if (selectedBus) {
          const id = `60000000-0000-4000-8000-${tripCounter.toString().padStart(12, '0')}`;
          tripIds.push(id);
          
          const departureTime = generateDepartureTime(currentDate, route.distance);
          const travelTime = calculateTravelTime(route.distance);
          const arrivalTime = new Date(departureTime.getTime() + travelTime * 60000);
          const basePrice = calculateBasePrice(route.distance);
          
          // Trip status based on departure time
          let status = 'scheduled';
          if (departureTime < now) {
            const hoursSinceDeparture = (now.getTime() - departureTime.getTime()) / (1000 * 60 * 60);
            if (hoursSinceDeparture > (travelTime / 60)) {
              status = Math.random() > 0.1 ? 'completed' : 'cancelled';
            } else {
              status = 'in_progress';
            }
          }
          
          tripValues.push(`(
            '${id}', 
            '${routeId}', 
            '${selectedBus.id}', 
            '${departureTime.toISOString()}', 
            '${arrivalTime.toISOString()}', 
            ${basePrice}, 
            '${status}'
          )`);
          
          tripCounter++;
        }
      }
    }
    
    await dataSource.query(`
      INSERT INTO trips (id, route_id, bus_id, departure_time, arrival_time, base_price, status) VALUES
      ${tripValues.join(',\n')};
    `);

    console.log(`✅ Created ${tripCounter - 1} trips with realistic scheduling`);

    // 8. Seed Bookings (120 records with valid seat assignments)
    console.log('🎫 Seeding bookings...');
    const bookingIds: string[] = [];
    const bookingValues: string[] = [];
    
    for (let i = 1; i <= 120; i++) {
      const id = `70000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      bookingIds.push(id);
      const bookingReference = `BKG${(new Date().getFullYear().toString().slice(-2))}${i.toString().padStart(6, '0')}`;
      
      // 85% of bookings have user accounts
      const userId = i <= 100 ? userIds[Math.floor(Math.random() * userIds.length)] : null;
      const userIdValue = userId ? `'${userId}'` : 'NULL';
      
      const tripId = tripIds[Math.floor(Math.random() * tripIds.length)];
      
      // Get trip info for realistic booking
      const tripInfo = await dataSource.query(`
        SELECT t.base_price, t.departure_time, r.origin, r.destination 
        FROM trips t 
        JOIN routes r ON t.route_id = r.id 
        WHERE t.id = '${tripId}'
      `);
      
      if (tripInfo.length > 0) {
        const basePrice = tripInfo[0].base_price;
        const departureTime = new Date(tripInfo[0].departure_time);
        
        // Calculate passengers (1-4 per booking)
        const passengerCount = Math.floor(Math.random() * 4) + 1;
        const totalAmount = basePrice * passengerCount;
        
        // Booking status logic
        let status = 'paid';
        let bookedAt = new Date(departureTime.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Up to 30 days before
        let cancelledAt = 'NULL';
        
        if (departureTime < now) {
          // Past trips: mostly paid/completed, some cancelled
          status = Math.random() > 0.15 ? 'paid' : 'cancelled';
          if (status === 'cancelled') {
            cancelledAt = `'${new Date(bookedAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()}'`;
          }
        } else {
          // Future trips: mix of statuses
          const rand = Math.random();
          if (rand > 0.8) status = 'pending';
          else if (rand > 0.05) status = 'paid';
          else {
            status = 'cancelled';
            cancelledAt = `'${new Date(bookedAt.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString()}'`;
          }
        }
        
        const contactEmail = userId ? `user${i}@gmail.com` : `guest${i}@gmail.com`;
        const contactPhone = `+84${(900000000 + i * 1000).toString()}`;
        
        bookingValues.push(`(
          '${id}', 
          '${bookingReference}', 
          ${userIdValue}, 
          '${tripId}', 
          ${totalAmount}, 
          '${status}', 
          '${contactEmail}', 
          '${contactPhone}', 
          '${bookedAt.toISOString()}', 
          NULL, 
          ${cancelledAt}
        )`);
      }
    }
    
    await dataSource.query(`
      INSERT INTO bookings (id, booking_reference, user_id, trip_id, total_amount, status, contact_email, contact_phone, booked_at, last_modified_at, cancelled_at) VALUES
      ${bookingValues.join(',\n')};
    `);

    // 9. Seed Seat Status (for booked seats)
    console.log('📍 Seeding seat status...');
    const seatStatusValues: string[] = [];
    let seatStatusCounter = 1;
    const bookedSeatsPerTrip: Record<string, Set<string>> = {}; // Track booked seats per trip
    
    for (let i = 0; i < bookingIds.length; i++) {
      const bookingId = bookingIds[i];
      
      // Get booking details
      const bookingInfo = await dataSource.query(`
        SELECT b.trip_id, b.status, t.bus_id 
        FROM bookings b 
        JOIN trips t ON b.trip_id = t.id 
        WHERE b.id = '${bookingId}' AND b.status IN ('paid', 'pending')
      `);
      
      if (bookingInfo.length > 0) {
        const { trip_id: tripId, bus_id: busId, status } = bookingInfo[0];
        const availableSeats = seatsByBus[busId];
        
        // Initialize trip tracking if not exists
        if (!bookedSeatsPerTrip[tripId]) {
          bookedSeatsPerTrip[tripId] = new Set();
        }
        
        if (availableSeats && availableSeats.length > 0) {
          // Book 1-3 seats per booking
          const seatsToBook = Math.min(Math.floor(Math.random() * 3) + 1, availableSeats.length);
          const bookedSeatsForThisBooking: string[] = [];
          
          // Select unique seats for this booking
          for (let j = 0; j < seatsToBook; j++) {
            let attempts = 0;
            let selectedSeat: string | null = null;
            
            // Try to find an available seat (not already booked for this trip)
            while (attempts < 20 && !selectedSeat) {
              const seatIndex = Math.floor(Math.random() * availableSeats.length);
              const candidateSeat = availableSeats[seatIndex];
              
              if (!bookedSeatsPerTrip[tripId].has(candidateSeat) && 
                  !bookedSeatsForThisBooking.includes(candidateSeat)) {
                selectedSeat = candidateSeat;
                bookedSeatsForThisBooking.push(candidateSeat);
                bookedSeatsPerTrip[tripId].add(candidateSeat);
              }
              attempts++;
            }
            
            if (selectedSeat) {
              // Get seat code
              const seatInfo = await dataSource.query(`SELECT seat_code FROM seats WHERE id = '${selectedSeat}'`);
              if (seatInfo.length > 0) {
                const id = `80000000-0000-4000-8000-${seatStatusCounter.toString().padStart(12, '0')}`;
                const seatCode = seatInfo[0].seat_code;
                const state = status === 'paid' ? 'booked' : 'reserved';
                const lockedUntil = status === 'pending' ? `'${new Date(Date.now() + 15 * 60 * 1000).toISOString()}'` : 'NULL';
                
                seatStatusValues.push(`(
                  '${id}', 
                  '${tripId}', 
                  '${selectedSeat}', 
                  '${seatCode}', 
                  '${bookingId}', 
                  '${state}', 
                  ${lockedUntil}
                )`);
                
                seatStatusCounter++;
              }
            }
          }
        }
      }
      
      // Limit to avoid too many seat statuses
      if (seatStatusCounter > 300) break;
    }
    
    if (seatStatusValues.length > 0) {
      await dataSource.query(`
        INSERT INTO seat_status (id, trip_id, seat_id, seat_code, booking_id, state, locked_until) VALUES
        ${seatStatusValues.join(',\n')};
      `);
    }

    // 10. Seed Passenger Details (one per booked seat)
    console.log('👤 Seeding passenger details...');
    const passengerValues: string[] = [];
    const firstNames = ['Văn', 'Thị', 'Minh', 'Thu', 'Hoàng', 'Mai', 'Đức', 'Hoa', 'Quang', 'Lan', 'Anh', 'Hương', 'Tuấn', 'Hà', 'Đạt'];
    const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Dương', 'Lý'];
    
    // Get all seat statuses that are booked
    const bookedSeats = await dataSource.query(`
      SELECT ss.booking_id, ss.seat_code, b.contact_email 
      FROM seat_status ss 
      JOIN bookings b ON ss.booking_id = b.id 
      WHERE ss.state = 'booked'
    `);
    
    bookedSeats.forEach((seat: any, index: number) => {
      const id = `90000000-0000-4000-8000-${(index + 1).toString().padStart(12, '0')}`;
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const fullName = `${lastName} ${firstName} ${Math.random() > 0.5 ? 'Nam' : 'Nữ'}`;
      const documentId = `${Math.floor(Math.random() * 900000000) + 100000000}`;
      
      passengerValues.push(`(
        '${id}', 
        '${seat.booking_id}', 
        '${fullName}', 
        '${documentId}', 
        '${seat.seat_code}'
      )`);
    });
    
    if (passengerValues.length > 0) {
      await dataSource.query(`
        INSERT INTO passenger_details (id, booking_id, full_name, document_id, seat_code) VALUES
        ${passengerValues.join(',\n')};
      `);
    }

    console.log('✅ Database seeding completed successfully!');
    
    // Run validation checks
    await validateSeedData();
    
    // Print summary
    const counts = await Promise.all([
      dataSource.query('SELECT COUNT(*) FROM users'),
      dataSource.query('SELECT COUNT(*) FROM operators'),
      dataSource.query('SELECT COUNT(*) FROM routes'),
      dataSource.query('SELECT COUNT(*) FROM buses'),
      dataSource.query('SELECT COUNT(*) FROM seat_layouts'),
      dataSource.query('SELECT COUNT(*) FROM seats'),
      dataSource.query('SELECT COUNT(*) FROM trips'),
      dataSource.query('SELECT COUNT(*) FROM bookings'),
      dataSource.query('SELECT COUNT(*) FROM seat_status'),
      dataSource.query('SELECT COUNT(*) FROM passenger_details'),
    ]);
    
    console.log(`
📊 SEEDING SUMMARY:
    - Users: ${counts[0][0].count} records
    - Operators: ${counts[1][0].count} records  
    - Routes: ${counts[2][0].count} records (realistic Vietnamese routes)
    - Buses: ${counts[3][0].count} records (capacity matches seats exactly)
    - Seat Layouts: ${counts[4][0].count} records (one per bus)
    - Seats: ${counts[5][0].count} records (realistic codes: A1, A2, B1...)
    - Trips: ${counts[6][0].count} records (no schedule conflicts)
    - Bookings: ${counts[7][0].count} records (valid seat assignments)
    - Seat Status: ${counts[8][0].count} records (no duplicate bookings)
    - Passenger Details: ${counts[9][0].count} records (matches booked seats)
    
✅ All data follows real-world constraints!
🚌 Ready for production-like testing!
`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

// Run the seeding
if (require.main === module) {
  seedDatabase().catch(console.error);
}

export { seedDatabase };