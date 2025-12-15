import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

// Create DataSource
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'awad_bus_booking_user_login',
});

async function seedDatabase() {
  try {
    await dataSource.initialize();
    console.log('Connected to database');

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
      const phone = i <= 40 ? `'+1555${i.toString().padStart(7, '0')}'` : 'NULL';
      
      userValues.push(`('${id}', ${googleId}, 'user${i}@example.com', 'User ${i}', ${phone}, '$2b$10$hashedpassword${i}', '${role}', NOW() - INTERVAL '${Math.floor(Math.random() * 365)} days')`);
    }
    
    await dataSource.query(userInsertQuery + userValues.join(',\n') + ';');

    // 2. Seed Operators (20 records)
    console.log('Seeding operators...');
    const operatorIds: string[] = [];
    const operatorValues: string[] = [];
    
    const operatorNames = [
      'Metro Bus Lines', 'City Transit Co', 'Express Travel', 'Golden Bus Service', 'Swift Transport',
      'Premier Coaches', 'Royal Transit', 'Atlantic Buses', 'Pacific Tours', 'Mountain Express',
      'Valley Transport', 'Coastal Lines', 'Desert Runners', 'Urban Mobility', 'Highway Express',
      'Regional Transit', 'Inter-City Lines', 'National Bus Co', 'Local Transport', 'Cross Country'
    ];
    
    for (let i = 1; i <= 20; i++) {
      const id = `10000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      operatorIds.push(id);
      const status = i <= 15 ? 'approved' : i <= 18 ? 'pending' : 'suspended';
      const approvedAt = status === 'approved' ? `NOW() - INTERVAL '${Math.floor(Math.random() * 180)} days'` : 'NULL';
      
      operatorValues.push(`('${id}', '${operatorNames[i-1]}', 'contact${i}@${operatorNames[i-1].toLowerCase().replace(/\s+/g, '')}.com', '+1555${(100 + i).toString()}0000', '${status}', ${approvedAt})`);
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
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio',
      'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus',
      'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington DC',
      'Boston', 'El Paso', 'Detroit', 'Nashville', 'Portland', 'Memphis', 'Oklahoma City',
      'Las Vegas', 'Louisville', 'Baltimore'
    ];
    
    for (let i = 1; i <= 30; i++) {
      const id = `20000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      routeIds.push(id);
      const origin = cities[i-1];
      const destination = cities[(i + 15) % cities.length];
      const distance = Math.floor(Math.random() * 800) + 50;
      const minutes = Math.floor(distance * 1.5) + Math.floor(Math.random() * 120);
      const operatorId = operatorIds[Math.floor(Math.random() * operatorIds.length)];
      
      routeValues.push(`('${id}', '${operatorId}', 'Route ${i}: ${origin} to ${destination}', '${origin} to ${destination}', '${origin}', '${destination}', ${distance}.50, ${minutes}, true, '{}', NOW() - INTERVAL '${Math.floor(Math.random() * 200)} days', NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days')`);
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
      'Mercedes Sprinter', 'Volvo B8R', 'Scania Citywide', 'MAN Lion\'s City', 'Iveco Daily',
      'Ford Transit', 'Mercedes Tourismo', 'Setra S 416', 'Neoplan Skyliner', 'Van Hool EX'
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
      const seatPricing = `'{"standard": 100, "premium": 150, "vip": 200}'`;
      
      seatLayoutValues.push(`('${id}', '${busId}', '${layoutType}', ${totalRows}, ${seatsPerRow}, ${layoutConfig}, ${seatPricing}, NOW() - INTERVAL '${Math.floor(Math.random() * 100)} days', NOW() - INTERVAL '${Math.floor(Math.random() * 10)} days')`);
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
      const departureTime = `NOW() + INTERVAL '${daysFromNow} days' + INTERVAL '${Math.floor(Math.random() * 24)} hours'`;
      const arrivalTime = `NOW() + INTERVAL '${daysFromNow} days' + INTERVAL '${Math.floor(Math.random() * 24) + 4} hours'`;
      const basePrice = Math.floor(Math.random() * 15000) + 5000; // 50-200 dollars in cents
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
      const bookingReference = `BKG${i.toString().padStart(6, '0')}`;
      const userId = i <= 80 ? userIds[Math.floor(Math.random() * userIds.length)] : null;
      const userIdValue = userId ? `'${userId}'` : 'NULL';
      const tripId = tripIds[Math.floor(Math.random() * tripIds.length)];
      const totalAmount = Math.floor(Math.random() * 20000) + 5000;
      const statuses = ['pending', 'paid', 'cancelled', 'expired'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const contactEmail = `customer${i}@example.com`;
      const contactPhone = `+1555${i.toString().padStart(7, '0')}`;
      const bookedAt = `NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days'`;
      const lastModifiedAt = Math.random() > 0.7 ? `NOW() - INTERVAL '${Math.floor(Math.random() * 10)} days'` : 'NULL';
      const cancelledAt = status === 'cancelled' ? `NOW() - INTERVAL '${Math.floor(Math.random() * 20)} days'` : 'NULL';
      
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
      const lockedUntil = state === 'locked' ? `NOW() + INTERVAL '15 minutes'` : 'NULL';
      
      seatStatusValues.push(`('${id}', '${tripId}', '${seatId}', '${seatCode}', ${bookingIdValue}, '${state}', ${lockedUntil})`);
    }
    
    await dataSource.query(`
      INSERT INTO seat_status (id, trip_id, seat_id, seat_code, booking_id, state, locked_until) VALUES
      ${seatStatusValues.join(',\n')};
    `);

    // 10. Seed Passenger Details (150 records)
    console.log('Seeding passenger details...');
    const passengerValues: string[] = [];
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emma', 'James', 'Anna'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    
    for (let i = 1; i <= 150; i++) {
      const id = `90000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      const bookingId = bookingIds[Math.floor(Math.random() * bookingIds.length)];
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const fullName = `${firstName} ${lastName}`;
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
      'passenger_info': ['Updated passenger name', 'Changed document ID', 'Added passenger details'],
      'seat_change': ['Changed from seat A1 to A2', 'Upgraded to VIP seat', 'Moved to different row'],
      'contact_info': ['Updated email address', 'Changed phone number', 'Updated contact details']
    };
    
    for (let i = 1; i <= 80; i++) {
      const id = `A0000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      const bookingId = bookingIds[Math.floor(Math.random() * bookingIds.length)];
      const userId = Math.random() > 0.2 ? userIds[Math.floor(Math.random() * userIds.length)] : null;
      const userIdValue = userId ? `'${userId}'` : 'NULL';
      const modificationType = modificationTypes[Math.floor(Math.random() * modificationTypes.length)];
      const description = descriptions[modificationType][Math.floor(Math.random() * descriptions[modificationType].length)];
      const changes = `'{"field": "example", "old_value": "old", "new_value": "new"}'`;
      const previousValues = `'{"field": "example", "value": "previous"}'`;
      const modifiedAt = `NOW() - INTERVAL '${Math.floor(Math.random() * 20)} days'`;
      
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