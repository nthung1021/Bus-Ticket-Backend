// New version (version 3) of seed-database script, based on the script seed-database-ver2.ts
// but this version has some changes to match with the current system and avoid bugs (less mock data).

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as crypto from 'crypto';

// Load environment variables
config();

// Create DataSource
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  extra: {
    ssl: process.env.DB_SSL === 'true' || 
         process.env.NODE_ENV === 'production' || 
         process.env.NODE_ENV === 'staging' ? {
      rejectUnauthorized: false,
    } : false,
  },
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
    { model: 'Hyundai Universe', capacity: 30, layoutType: 'standard_2x3', seatsPerRow: 3 },
    { model: 'Thaco Isuzu', capacity: 30, layoutType: 'standard_2x3', seatsPerRow: 3 },
    { model: 'Mercedes Benz O500', capacity: 30, layoutType: 'standard_2x3', seatsPerRow: 3 },
    { model: 'Samco Felix', capacity: 30, layoutType: 'standard_2x3', seatsPerRow: 3 },
    { model: 'Daewoo FX120', capacity: 30, layoutType: 'standard_2x3', seatsPerRow: 3 },
    { model: 'Hino AK', capacity: 30, layoutType: 'standard_2x3', seatsPerRow: 3 },
    { model: 'Isuzu Citybus', capacity: 30, layoutType: 'standard_2x3', seatsPerRow: 3 },
    { model: 'King Long XMQ6127', capacity: 30, layoutType: 'standard_2x3', seatsPerRow: 3 },
    { model: 'Yutong ZK6122', capacity: 30, layoutType: 'standard_2x3', seatsPerRow: 3 },
    { model: 'Golden Dragon XML6127', capacity: 30, layoutType: 'standard_2x3', seatsPerRow: 3 }
  ];
}

/**
 * Generate realistic seat codes (1A, 1B, 1C, etc.)
 */
function generateSeatCodes(capacity: number, seatsPerRow: number): string[] {
  const codes: string[] = [];
  const totalRows = Math.ceil(capacity / seatsPerRow);
  
  let seatCount = 0;
  for (let row = 1; row <= totalRows && seatCount < capacity; row++) {
    for (let pos = 1; pos <= seatsPerRow && seatCount < capacity; pos++) {
      const rowLetter = String.fromCharCode(64 + pos); // A, B, C, etc.
      codes.push(`${row}${rowLetter}`);
      seatCount++;
    }
  }
  
  return codes;
}

/**
 * Generate logical detailed layout config
 */
function generateDetailedLayoutConfig(bus: {capacity: number, seatsPerRow: number}, seatData: Array<{id: string, code: string, type: string}>) {
  const rowHeight = 50;
  const seatWidth = 35;
  const seatHeight = 40;
  const aisleWidth = 25;
  const rowSpacing = 10;
  
  const seats = seatData.map((s, index) => {
    const row = Math.floor(index / bus.seatsPerRow) + 1;
    const pos = (index % bus.seatsPerRow) + 1;
    
    // Calculate X coordinate based on position and aisles (assumed 2x3 layout with 2 aisles)
    let x = (pos - 1) * seatWidth;
    if (pos > 1) x += aisleWidth;
    if (pos > 2) x += aisleWidth;
    
    return {
      id: s.id,
      code: s.code,
      type: s.type,
      position: {
        row: row,
        position: String.fromCharCode(64 + pos),
        x: x,
        y: (row - 1) * rowHeight,
        width: seatWidth,
        height: seatHeight
      },
      isAvailable: true
    };
  });

  return {
    seats,
    aisles: [1, 2],
    dimensions: {
      totalWidth: bus.seatsPerRow * seatWidth + 2 * aisleWidth,
      totalHeight: Math.ceil(bus.capacity / bus.seatsPerRow) * rowHeight,
      seatWidth: seatWidth,
      seatHeight: seatHeight,
      aisleWidth: aisleWidth,
      rowSpacing: rowSpacing
    }
  };
}

/**
 * Calculate realistic travel time based on distance
 */
function calculateTravelTime(distanceKm: number): number {
  const baseHours = distanceKm / 70; // Base calculation at 70 km/h
  const bufferTime = Math.max(30, distanceKm * 0.1); // Add buffer for stops/traffic
  return Math.round((baseHours * 60) + bufferTime); // Return minutes
}

/**
 * Calculate realistic pricing based on distance (VND)
 */
function calculateBasePrice(distanceKm: number): number {
  const pricePerKm = 2500;
  const basePrice = distanceKm * pricePerKm;
  return Math.round(basePrice / 10000) * 10000;
}

/**
 * Generate realistic departure times
 */
function generateDepartureTime(baseDate: Date, distanceKm: number): Date {
  const date = new Date(baseDate);
  let hour: number;
  if (distanceKm > 600) { 
    hour = Math.random() < 0.7 ? 6 + Math.floor(Math.random() * 4) : 20 + Math.floor(Math.random() * 3);
  } else if (distanceKm > 200) { 
    hour = 5 + Math.floor(Math.random() * 18); 
  } else { 
    hour = 6 + Math.floor(Math.random() * 16); 
  }
  const minute = Math.floor(Math.random() * 4) * 15; 
  date.setHours(hour, minute, 0, 0);
  return date;
}

/**
 * Check if two time ranges overlap
 */
function timeRangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  return start1 < end2 && start2 < end1;
}

// ===================== SEEDING FUNCTIONS =====================

async function ensureChatTables(dataSource: DataSource) {
  console.log('Ensuring chat tables exist...');
  await dataSource.query(`CREATE TABLE IF NOT EXISTS "conversation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying, CONSTRAINT "PK_conversation_id" PRIMARY KEY ("id"))`);
  await dataSource.query(`CREATE TABLE IF NOT EXISTS "message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role" character varying NOT NULL, "content" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "conversationId" uuid, CONSTRAINT "PK_message_id" PRIMARY KEY ("id"))`);
  
  const constraintExists = await dataSource.query(`
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_message_conversation'
  `);
  if (constraintExists.length === 0) {
    await dataSource.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_message_conversation" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }
}

async function clearDatabase(dataSource: DataSource) {
  console.log('Clearing existing data...');
  const tables = [
    'audit_logs', 'booking_modification_history', 'passenger_details', 
    'seat_status', 'bookings', 'trips', 'seats', 'seat_layouts', 
    'buses', 'route_points', 'routes', 'operators', 'refresh_tokens', 'users',
    'message', 'conversation'
  ];
  for (const table of tables) {
    await dataSource.query(`TRUNCATE TABLE ${table} CASCADE`);
  }
  console.log('Existing data cleared successfully');
}



async function seedOperators(dataSource: DataSource): Promise<string[]> {
  console.log('Seeding operators...');
  const operatorIds: string[] = [];
  const operatorNames = generateOperatorNames().slice(0, 15);
  const operatorValues: string[] = [];
  for (let i = 1; i <= 15; i++) {
    const id = crypto.randomUUID();
    operatorIds.push(id);
    const status = i <= 12 ? 'approved' : i <= 13 ? 'pending' : 'suspended';
    const approvedAt = status === 'approved' ? 'NOW() - INTERVAL \'30 days\'' : 'NULL';
    const name = operatorNames[i - 1];
    const domain = name.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, '').replace('xe', '').replace('khach', '') + 'bus.vn';
    operatorValues.push(`('${id}', '${name}', 'contact@${domain}', '0${(28 + i).toString()}${(8000000 + i * 1000).toString()}', '${status}', ${approvedAt})`);
  }
  await dataSource.query(`
    INSERT INTO operators (id, name, contact_email, contact_phone, status, approved_at) VALUES
    ${operatorValues.join(',\n')};
  `);
  return operatorIds;
}

async function seedRoutes(dataSource: DataSource, operatorIds: string[]): Promise<string[]> {
  console.log('Seeding routes...');
  const routeIds: string[] = [];
  const routeData = generateRealisticRoutes();
  const routeValues: string[] = [];
  for (let i = 0; i < routeData.length; i++) {
    const id = crypto.randomUUID();
    routeIds.push(id);
    const route = routeData[i];
    const operatorId = operatorIds[i % 12]; 
    const name = `${route.origin} - ${route.destination}`;
    const estimatedMinutes = calculateTravelTime(route.distance);
    routeValues.push(`('${id}', '${operatorId}', '${name}', 'From ${route.origin} to ${route.destination}', '${route.origin}', '${route.destination}', ${route.distance}, ${estimatedMinutes}, true, '{}', NOW(), NOW())`);
  }
  await dataSource.query(`
    INSERT INTO routes (id, operator_id, name, description, origin, destination, distance_km, estimated_minutes, is_active, amenities, "createdAt", "updatedAt") VALUES
    ${routeValues.join(',\n')};
  `);
  return routeIds;
}

async function seedBuses(dataSource: DataSource, operatorIds: string[]): Promise<any[]> {
  console.log('Seeding buses...');
  const busData: any[] = [];
  const busConfigs = getBusConfigurations();
  const busValues: string[] = [];
  for (let i = 1; i <= 40; i++) {
    const id = crypto.randomUUID();
    const operatorId = operatorIds[i % 12];
    const config = busConfigs[i % busConfigs.length];
    const plateNumber = `${i <= 15 ? '29' : i <= 25 ? '51' : i <= 35 ? '43' : '77'}A-${(10000 + i).toString()}`;
    const amenities = JSON.stringify({ wifi: Math.random() > 0.3, ac: true, usb_ports: Math.random() > 0.4, restroom: config.capacity > 35, entertainment: config.capacity > 40 });
    busData.push({ id, operatorId, capacity: config.capacity, model: config.model, layoutType: config.layoutType, seatsPerRow: config.seatsPerRow });
    busValues.push(`('${id}', '${operatorId}', '${plateNumber}', '${config.model}', ${config.capacity}, '${amenities}')`);
  }
  await dataSource.query(`
    INSERT INTO buses (id, operator_id, plate_number, model, seat_capacity, amenities_json) VALUES
    ${busValues.join(',\n')};
  `);
  return busData;
}

async function seedSeatsAndLayouts(dataSource: DataSource, busData: any[]): Promise<Record<string, { id: string, code: string }[]>> {
  console.log('Seeding seats and layouts...');
  const seatPricing = JSON.stringify({
    basePrice: 10000,
    seatTypePrices: { normal: 10000, vip: 15000, business: 20000 },
    rowPricing: {},
    positionPricing: {}
  });
  const seatsByBus: Record<string, { id: string, code: string }[]> = {};
  for (const bus of busData) {
    const seatCodes = generateSeatCodes(bus.capacity, bus.seatsPerRow);
    const busSeats: Array<{ id: string, code: string, type: string }> = [];
    const seatInsertValues: string[] = [];
    for (let j = 0; j < seatCodes.length; j++) {
      const seatId = crypto.randomUUID();
      const seatCode = seatCodes[j];
      let seatType = 'normal';
      if (j % 3 === 1) seatType = 'vip';
      else if (j % 5 === 0) seatType = 'business';
      busSeats.push({ id: seatId, code: seatCode, type: seatType });
      seatInsertValues.push(`('${seatId}', '${bus.id}', '${seatCode}', '${seatType}', true)`);
    }
    await dataSource.query(`INSERT INTO seats (id, bus_id, seat_code, "seatType", is_active) VALUES ${seatInsertValues.join(',\n')}`);
    seatsByBus[bus.id] = busSeats.map(s => ({ id: s.id, code: s.code }));
    const layoutConfig = generateDetailedLayoutConfig(bus, busSeats);
    const layoutId = crypto.randomUUID();
    const totalRows = Math.ceil(bus.capacity / bus.seatsPerRow);
    await dataSource.query(`
      INSERT INTO seat_layouts (id, bus_id, "layoutType", total_rows, seats_per_row, layout_config, seat_pricing, created_at, updated_at) VALUES
      ('${layoutId}', '${bus.id}', '${bus.layoutType}', ${totalRows}, ${bus.seatsPerRow}, '${JSON.stringify(layoutConfig)}', '${seatPricing}', NOW(), NOW())
    `);
  }
  return seatsByBus;
}

async function seedTrips(dataSource: DataSource, routeIds: string[], busData: any[]): Promise<string[]> {
  console.log('Seeding trips...');
  const tripIds: string[] = [];
  const tripValues: string[] = [];
  const busSchedules: Record<string, Array<{ start: Date, end: Date }>> = {};
  busData.forEach(bus => { busSchedules[bus.id] = []; });
  let tripCounter = 0;
  const now = new Date();
  const routeData = generateRealisticRoutes();
  for (let day = 0; day < 30; day++) {
    const currentDate = new Date(now);
    currentDate.setDate(now.getDate() + day);
    const tripsPerDay = day < 7 ? 15 : 8;
    for (let trip = 0; trip < tripsPerDay; trip++) {
      if (tripCounter >= 100) break;
      const routeIndex = Math.floor(Math.random() * routeIds.length);
      const routeId = routeIds[routeIndex];
      const route = routeData[routeIndex];
      let selectedBus: any = null;
      let attempts = 0;
      while (!selectedBus && attempts < 20) {
        const bus = busData[Math.floor(Math.random() * busData.length)];
        const departureTime = generateDepartureTime(currentDate, route.distance);
        const travelTime = calculateTravelTime(route.distance);
        const arrivalTime = new Date(departureTime.getTime() + travelTime * 60000);
        const hasConflict = busSchedules[bus.id].some(schedule => timeRangesOverlap(departureTime, arrivalTime, schedule.start, schedule.end));
        if (!hasConflict) {
          selectedBus = bus;
          busSchedules[bus.id].push({ start: new Date(departureTime.getTime() - 60 * 60000), end: new Date(arrivalTime.getTime() + 60 * 60000) });
          const id = crypto.randomUUID();
          tripIds.push(id);
          // const basePrice = calculateBasePrice(route.distance);
          const basePrice = 10000;
          let status = 'scheduled';
          if (departureTime < now) {
            const hoursSinceDeparture = (now.getTime() - departureTime.getTime()) / (1000 * 60 * 60);
            status = hoursSinceDeparture > (travelTime / 60) ? (Math.random() > 0.1 ? 'completed' : 'cancelled') : 'in_progress';
          }
          tripValues.push(`('${id}', '${routeId}', '${selectedBus.id}', '${departureTime.toISOString()}', '${arrivalTime.toISOString()}', ${basePrice}, '${status}')`);
          tripCounter++;
        }
        attempts++;
      }
    }
  }
  await dataSource.query(`INSERT INTO trips (id, route_id, bus_id, departure_time, arrival_time, base_price, status) VALUES ${tripValues.join(',\n')}`);
  return tripIds;
}



async function validateSeedData() {
  console.log('Running validation checks...');
  try {
    const checks = [
      { name: 'Operator-Bus', query: `SELECT COUNT(*) as count FROM buses b LEFT JOIN operators o ON b.operator_id = o.id WHERE o.id IS NULL`, expected: 0 },
      { name: 'Bus-Seat Capacity', query: `SELECT COUNT(*) as count FROM (SELECT b.id FROM buses b LEFT JOIN seats s ON b.id = s.bus_id GROUP BY b.id, b.seat_capacity HAVING b.seat_capacity != COUNT(s.id)) as mismatch`, expected: 0 },
      { name: 'Trip Time Logic', query: `SELECT COUNT(*) as count FROM trips WHERE departure_time >= arrival_time`, expected: 0 },
      { name: 'Trip-Route', query: `SELECT COUNT(*) as count FROM trips t LEFT JOIN routes r ON t.route_id = r.id WHERE r.id IS NULL`, expected: 0 }
    ];
    for (const check of checks) {
      const result = await dataSource.query(check.query);
      if (parseInt(result[0].count) !== check.expected) throw new Error(`Validation failed for ${check.name}: expected ${check.expected}, got ${result[0].count}`);
      console.log(`  ✓ ${check.name} check passed`);
    }
    console.log('All validation checks completed successfully!');
  } catch (error) {
    console.error('Validation failed:', error);
    throw error;
  }
}

// ===================== MAIN SEEDING FUNCTION =====================

async function seedDatabase() {
  try {
    await dataSource.initialize();
    console.log('🔌 Connected to database');

    await ensureChatTables(dataSource);
    await clearDatabase(dataSource);
    
    // const userIds = await seedUsers(dataSource);
    const operatorIds = await seedOperators(dataSource);
    const routeIds = await seedRoutes(dataSource, operatorIds);
    const busData = await seedBuses(dataSource, operatorIds);
    const seatsByBus = await seedSeatsAndLayouts(dataSource, busData);
    await seedTrips(dataSource, routeIds, busData);

    console.log('Database seeding completed successfully!');
    await validateSeedData();

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  seedDatabase().catch(console.error);
}

export { seedDatabase };