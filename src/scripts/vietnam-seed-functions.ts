/**
 * Individual Seeding Functions for Vietnam Bus Booking System
 * Implements FK-aware seeding with proper dependency order
 */

import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { 
  VietnamSeedData, 
  generateVietnameseFullName, 
  generateVietnamesePhoneNumber, 
  generateVietnamPlateNumber,
  generateBookingReference,
  generatePayOSOrderCode
} from './vietnam-seed-constants';

// Global ID collections for FK relationships
export const idCollections = {
  users: [] as string[],
  operators: [] as string[],
  buses: [] as string[],
  seats: [] as string[],
  routes: [] as string[],
  routePoints: [] as string[],
  trips: [] as string[],
  bookings: [] as string[],
  seatLayouts: [] as string[],
};

// Statistics tracking
export const seedStats = {
  users: 0,
  operators: 0,
  buses: 0,
  seats: 0,
  routes: 0,
  routePoints: 0,
  trips: 0,
  seatStatus: 0,
  bookings: 0,
  passengerDetails: 0,
  payments: 0,
  reviews: 0,
  feedbacks: 0,
  notifications: 0,
  auditLogs: 0,
  bookingModifications: 0,
  refreshTokens: 0,
  paymentMethods: 0,
  seatLayouts: 0,
};

// Utility functions
function generateRandomDate(daysFromNow: number = 0, hourRange: [number, number] = [0, 23]): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow + Math.floor(Math.random() * 60) - 30);
  date.setHours(Math.floor(Math.random() * (hourRange[1] - hourRange[0] + 1)) + hourRange[0]);
  date.setMinutes(Math.floor(Math.random() * 60));
  date.setSeconds(0);
  return date.toISOString();
}

function random<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// 1️⃣ USERS & AUTHENTICATION
export async function seedUsers(dataSource: DataSource, vietnamData: VietnamSeedData): Promise<void> {
  console.log('   👥 Generating 50+ Vietnamese users...');
  
  const userValues: string[] = [];
  const targetCount = 55;
  
  for (let i = 1; i <= targetCount; i++) {
    const id = randomUUID();
    idCollections.users.push(id);
    
    const name = generateVietnameseFullName(vietnamData);
    const email = `user${i}@${random(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'])}`;
    const phone = i <= 45 ? `'${generateVietnamesePhoneNumber(vietnamData)}'` : 'NULL';
    const role = i <= 3 ? 'admin' : 'customer';
    const googleId = i <= 15 ? `'google_${i}_${Date.now()}'` : 'NULL';
    const facebookId = i <= 8 ? `'facebook_${i}_${Date.now()}'` : 'NULL';
    const isEmailVerified = Math.random() > 0.3;
    const verificationCode = !isEmailVerified && Math.random() > 0.5 ? `'${Math.floor(Math.random() * 900000) + 100000}'` : 'NULL';
    const verificationExpires = verificationCode !== 'NULL' ? `'${generateRandomDate(1)}'` : 'NULL';
    const avatarUrl = Math.random() > 0.6 ? `'https://avatar.iran.liara.run/public/${i % 2 === 0 ? 'boy' : 'girl'}?username=${encodeURIComponent(name)}'` : 'NULL';
    const createdAt = generateRandomDate(-Math.floor(Math.random() * 365));

    userValues.push(
      `('${id}', ${googleId}, ${facebookId}, '${email}', '${name}', ${phone}, '$2b$10$hashedpassword${i}', ${isEmailVerified}, ${verificationCode}, ${verificationExpires}, '${role}', '${createdAt}', ${avatarUrl})`
    );
  }

  await dataSource.query(`
    INSERT INTO users (id, "googleId", "facebookId", email, name, phone, password_hash, is_email_verified, email_verification_code, email_verification_expires_at, role, created_at, avatar_url) VALUES
    ${userValues.join(',\n')}
  `);
  
  seedStats.users = targetCount;
}

export async function seedRefreshTokens(dataSource: DataSource): Promise<void> {
  console.log('   🔄 Generating refresh tokens...');
  
  const tokenValues: string[] = [];
  const targetCount = 30;
  
  for (let i = 1; i <= targetCount; i++) {
    const id = randomUUID();
    const userId = random(idCollections.users);
    const token = `rt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    const createdAt = generateRandomDate(-Math.floor(Math.random() * 30));

    tokenValues.push(`('${id}', '${userId}', '${token}', '${expiresAt}', '${createdAt}')`);
  }

  await dataSource.query(`
    INSERT INTO refresh_tokens (id, "userId", token, "expiresAt", "createdAt") VALUES
    ${tokenValues.join(',\n')}
  `);
  
  seedStats.refreshTokens = targetCount;
}

export async function seedPaymentMethods(dataSource: DataSource): Promise<void> {
  console.log('   💳 Generating payment methods...');
  
  const methodValues: string[] = [];
  const providers = ['momo', 'zalopay', 'vnpay', 'payos', 'banking'];
  const targetCount = 35;
  
  for (let i = 1; i <= targetCount; i++) {
    const id = randomUUID();
    const userId = random(idCollections.users);
    const provider = random(providers);
    const token = `${provider}_token_${Date.now()}_${i}`;
    const isDefault = Math.random() > 0.8;
    const createdAt = generateRandomDate(-Math.floor(Math.random() * 90));

    methodValues.push(`('${id}', '${userId}', '${provider}', '${token}', ${isDefault}, '${createdAt}')`);
  }

  await dataSource.query(`
    INSERT INTO payment_methods (id, user_id, provider, token, is_default, created_at) VALUES
    ${methodValues.join(',\n')}
  `);
  
  seedStats.paymentMethods = targetCount;
}

// 2️⃣ OPERATORS & BUSES
export async function seedOperators(dataSource: DataSource, vietnamData: VietnamSeedData): Promise<void> {
  console.log('   🏢 Generating Vietnamese bus operators...');
  
  const operatorValues: string[] = [];
  const targetCount = Math.min(vietnamData.operators.length, 15);
  
  for (let i = 1; i <= targetCount; i++) {
    const id = randomUUID();
    idCollections.operators.push(id);
    
    const operatorData = vietnamData.operators[i - 1];
    const status = i <= 12 ? 'approved' : i <= 14 ? 'pending' : 'suspended';
    const approvedAt = status === 'approved' ? `'${generateRandomDate(-Math.floor(Math.random() * 180))}'` : 'NULL';

    operatorValues.push(
      `('${id}', '${operatorData.name}', '${operatorData.contactEmail}', '+84${900000000 + i * 1000000}', '${status}', ${approvedAt})`
    );
  }

  await dataSource.query(`
    INSERT INTO operators (id, name, contact_email, contact_phone, status, approved_at) VALUES
    ${operatorValues.join(',\n')}
  `);
  
  seedStats.operators = targetCount;
}

export async function seedBuses(dataSource: DataSource, vietnamData: VietnamSeedData): Promise<void> {
  console.log('   🚌 Generating bus fleet...');
  
  const busValues: string[] = [];
  const targetCount = 65;
  const usedPlateNumbers = new Set<string>();
  
  for (let i = 1; i <= targetCount; i++) {
    const id = randomUUID();
    idCollections.buses.push(id);
    
    const operatorId = random(idCollections.operators);
    
    // Generate unique plate number
    let plateNumber: string;
    do {
      plateNumber = generateVietnamPlateNumber(vietnamData);
    } while (usedPlateNumbers.has(plateNumber));
    usedPlateNumbers.add(plateNumber);
    
    const busModel = random(vietnamData.busModels);
    const amenities = JSON.stringify({
      wifi: Math.random() > 0.3,
      ac: Math.random() > 0.1,
      usb_ports: Math.random() > 0.4,
      restroom: Math.random() > 0.6,
      entertainment: Math.random() > 0.5,
      blanket: Math.random() > 0.7,
      water: Math.random() > 0.8
    });

    busValues.push(
      `('${id}', '${operatorId}', '${plateNumber}', '${busModel.brand} ${busModel.model}', ${busModel.capacity}, '${busModel.type}', '${amenities}')`
    );
  }

  await dataSource.query(`
    INSERT INTO buses (id, operator_id, plate_number, model, seat_capacity, bus_type, amenities_json) VALUES
    ${busValues.join(',\n')}
  `);
  
  seedStats.buses = targetCount;
}

// 3️⃣ SEATS & LAYOUTS
export async function seedSeatLayouts(dataSource: DataSource): Promise<void> {
  console.log('   🪑 Generating seat layouts...');
  
  const layoutValues: string[] = [];
  
  for (let i = 0; i < idCollections.buses.length; i++) {
    const id = randomUUID();
    idCollections.seatLayouts.push(id);
    
    const busId = idCollections.buses[i];
    const layoutTypes = ['standard_2x2', 'standard_2x3', 'sleeper_1x2', 'vip_1x2'];
    const layoutType = random(layoutTypes);
    const totalRows = Math.floor(Math.random() * 15) + 8;
    const seatsPerRow = layoutType === 'standard_2x2' ? 4 : layoutType === 'standard_2x3' ? 5 : layoutType === 'sleeper_1x2' ? 3 : 3;
    
    const layoutData = JSON.stringify({
      type: layoutType,
      rows: totalRows,
      aisles: layoutType.includes('2x2') ? [2] : layoutType.includes('2x1') ? [1] : [1, 3],
      doors: [1, Math.floor(Math.random() * 5) + 10],
      emergency_exits: [Math.floor(Math.random() * 5) + 6],
      driver_area: { row: 1, position: 'front-left' },
      restroom: Math.random() > 0.6 ? { row: 'back', position: 'rear' } : null
    });

    const pricingData = JSON.stringify({
      base_price: 100000,
      vip_multiplier: layoutType === 'vip_1x2' ? 1.5 : 1.0,
      sleeper_multiplier: layoutType === 'sleeper_1x2' ? 1.3 : 1.0
    });
    
    const createdAt = generateRandomDate(-Math.floor(Math.random() * 60));
    const updatedAt = Math.random() > 0.7 ? generateRandomDate(-Math.floor(Math.random() * 30)) : createdAt;

    layoutValues.push(
      `('${id}', '${busId}', '${layoutType}', ${totalRows}, ${seatsPerRow}, '${layoutData}', '${pricingData}', '${createdAt}', '${updatedAt}')`
    );
  }

  await dataSource.query(`
    INSERT INTO seat_layouts (id, bus_id, "layoutType", total_rows, seats_per_row, layout_config, seat_pricing, created_at, updated_at) VALUES
    ${layoutValues.join(',\n')}
  `);
  
  seedStats.seatLayouts = layoutValues.length;
}

export async function seedSeats(dataSource: DataSource): Promise<void> {
  console.log('   💺 Generating individual seats...');
  
  // Get bus capacities from database
  const busCapacities = await dataSource.query(`
    SELECT id, seat_capacity FROM buses ORDER BY id
  `) as Array<{id: string, seat_capacity: number}>;
  
  const seatValues: string[] = [];
  let seatIndex = 1;
  
  for (const bus of busCapacities) {
    const capacity = bus.seat_capacity;
    
    for (let seatNum = 1; seatNum <= capacity; seatNum++) {
      const id = randomUUID();
      idCollections.seats.push(id);
      
      // Generate seat code: A1, A2, B1, B2, etc.
      const row = String.fromCharCode(65 + Math.floor((seatNum - 1) / 4)); // A, B, C, D...
      const position = ((seatNum - 1) % 4) + 1;
      const seatCode = `${row}${position}`;
      
      const seatType = seatNum <= 4 ? 'vip' : seatNum <= 8 ? 'business' : 'normal';
      
      seatValues.push(
        `('${id}', '${bus.id}', '${seatCode}', '${seatType}', true)`
      );
      
      seatIndex++;
    }
  }

  // Insert in batches to avoid query length limits
  const batchSize = 500;
  for (let i = 0; i < seatValues.length; i += batchSize) {
    const batch = seatValues.slice(i, i + batchSize);
    await dataSource.query(`
      INSERT INTO seats (id, bus_id, seat_code, "seatType", is_active) VALUES
      ${batch.join(',\n')}
    `);
  }
  
  seedStats.seats = seatValues.length;
}

// 4️⃣ ROUTES & ROUTE POINTS
export async function seedRoutes(dataSource: DataSource, vietnamData: VietnamSeedData): Promise<void> {
  console.log('   🗺️  Generating intercity routes...');
  
  const routeValues: string[] = [];
  const targetCount = 40;
  const cities = vietnamData.cities.all;
  
  for (let i = 1; i <= targetCount; i++) {
    const id = randomUUID();
    idCollections.routes.push(id);
    
    const operatorId = Math.random() > 0.2 ? random(idCollections.operators) : null;
    const origin = random(cities);
    let destination: string;
    do {
      destination = random(cities);
    } while (destination === origin);
    
    const name = `${origin} - ${destination}`;
    const description = `Tuyến xe khách từ ${origin} đến ${destination}`;
    const distanceKm = Math.floor(Math.random() * 800) + 50;
    const estimatedMinutes = Math.floor(distanceKm * 1.2) + Math.floor(Math.random() * 120);
    const isActive = Math.random() > 0.1;
    
    const amenities = JSON.stringify({
      rest_stops: Math.floor(Math.random() * 3) + 1,
      scenic_route: Math.random() > 0.7,
      highway_route: Math.random() > 0.5,
      night_service: Math.random() > 0.6
    });
    
    const createdAt = generateRandomDate(-Math.floor(Math.random() * 120));
    const updatedAt = Math.random() > 0.5 ? generateRandomDate(-Math.floor(Math.random() * 60)) : createdAt;

    routeValues.push(
      `('${id}', ${operatorId ? `'${operatorId}'` : 'NULL'}, '${name}', '${description}', '${origin}', '${destination}', ${distanceKm}.${Math.floor(Math.random() * 100)}, ${estimatedMinutes}, ${isActive}, '${amenities}', '${createdAt}', '${updatedAt}')`
    );
  }

  await dataSource.query(`
    INSERT INTO routes (id, operator_id, name, description, origin, destination, distance_km, estimated_minutes, is_active, amenities, "createdAt", "updatedAt") VALUES
    ${routeValues.join(',\n')}
  `);
  
  seedStats.routes = targetCount;
}

export async function seedRoutePoints(dataSource: DataSource, vietnamData: VietnamSeedData): Promise<void> {
  console.log('   📍 Generating pickup/dropoff points...');
  
  const routePointValues: string[] = [];
  let pointIndex = 1;
  
  // Get routes from database
  const routes = await dataSource.query(`
    SELECT id, origin, destination FROM routes ORDER BY id
  `) as Array<{id: string, origin: string, destination: string}>;
  
  for (const route of routes) {
    const pointsPerRoute = Math.floor(Math.random() * 4) + 4; // 4-7 points per route
    
    for (let i = 0; i < pointsPerRoute; i++) {
      const id = randomUUID();
      idCollections.routePoints.push(id);
      
      // Determine point details
      let pointName: string;
      let pointType: 'pickup' | 'dropoff' | 'both';
      
      if (i === 0) {
        // First point - origin pickup
        pointName = vietnamData.busStations[route.origin] ? 
          random(vietnamData.busStations[route.origin]) : 
          `Bến xe ${route.origin}`;
        pointType = 'pickup';
      } else if (i === pointsPerRoute - 1) {
        // Last point - destination dropoff
        pointName = vietnamData.busStations[route.destination] ? 
          random(vietnamData.busStations[route.destination]) : 
          `Bến xe ${route.destination}`;
        pointType = 'dropoff';
      } else {
        // Middle points - both pickup and dropoff
        const intermediateCity = random(vietnamData.cities.all);
        pointName = `Điểm dừng ${intermediateCity}`;
        pointType = 'both';
      }
      
      // Generate coordinates (Vietnam lat/lng ranges)
      const latitude = (Math.random() * (23.393 - 8.559) + 8.559).toFixed(6); // Vietnam latitude range
      const longitude = (Math.random() * (109.464 - 102.148) + 102.148).toFixed(6); // Vietnam longitude range
      
      const order = i + 1;
      const distanceFromStart = Math.floor((Math.random() * 100) * i);
      const estimatedTimeFromStart = Math.floor((Math.random() * 60) * i);
      
      const createdAt = generateRandomDate(-Math.floor(Math.random() * 90));
      const updatedAt = Math.random() > 0.6 ? generateRandomDate(-Math.floor(Math.random() * 45)) : createdAt;

      routePointValues.push(
        `('${id}', '${route.id}', '${pointName}', ${latitude}, ${longitude}, '${pointType}', ${order}, ${distanceFromStart}, ${estimatedTimeFromStart}, '${createdAt}', '${updatedAt}')`
      );
      
      pointIndex++;
    }
  }

  // Insert in batches
  const batchSize = 300;
  for (let i = 0; i < routePointValues.length; i += batchSize) {
    const batch = routePointValues.slice(i, i + batchSize);
    await dataSource.query(`
      INSERT INTO route_points (id, "routeId", name, latitude, longitude, type, "order", "distanceFromStart", "estimatedTimeFromStart", "createdAt", "updatedAt") VALUES
      ${batch.join(',\n')}
    `);
  }
  
  seedStats.routePoints = routePointValues.length;
}

export { generateRandomDate, random };