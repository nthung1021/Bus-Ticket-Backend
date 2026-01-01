/**
 * Vietnam Bus Booking System - Complete Database Seed
 * Generates realistic Vietnamese bus booking data with proper FK relationships
 * 
 * Seed Order (respects FK dependencies):
 * 1. Users & Auth
 * 2. Operators & Buses  
 * 3. Seats & Layouts
 * 4. Routes & Route Points
 * 5. Trips
 * 6. Seat Status
 * 7. Bookings & Passengers
 * 8. Payments
 * 9. Reviews & Feedback
 * 10. Notifications & Audit
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { initializeVietnamData } from './vietnam-seed-constants';
import { 
  seedUsers, 
  seedRefreshTokens, 
  seedPaymentMethods,
  seedOperators, 
  seedBuses,
  seedSeatLayouts,
  seedSeats,
  seedRoutes,
  seedRoutePoints,
  idCollections,
  seedStats as importedStats
} from './vietnam-seed-functions';
import {
  seedTrips,
  seedSeatStatus,
  seedBookings,
  seedPassengerDetails,
  seedPayments,
  seedReviews,
  seedFeedbacks,
  seedNotifications,
  seedAuditLogs,
  seedBookingModifications
} from './vietnam-seed-functions-part2';

config();

// Create DataSource
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'awad_bus_booking_user_login',
  synchronize: false,
  logging: false,
  extra: {
    ssl: process.env.DB_SSL === 'true' || 
         process.env.NODE_ENV === 'production' || 
         process.env.NODE_ENV === 'staging' ? {
      rejectUnauthorized: false,
    } : false,
  },
});

interface SeedStats {
  users: number;
  operators: number;
  buses: number;
  seats: number;
  routes: number;
  routePoints: number;
  trips: number;
  seatStatus: number;
  bookings: number;
  passengerDetails: number;
  payments: number;
  reviews: number;
  feedbacks: number;
  notifications: number;
  auditLogs: number;
  bookingModifications: number;
  refreshTokens: number;
  paymentMethods: number;
  seatLayouts: number;
}

const stats: SeedStats = importedStats;

// Global collections to maintain FK relationships  
const allIds = idCollections;

async function clearExistingData() {
  console.log('🧹 Clearing existing data...');
  
  // Clear in reverse dependency order
  const clearQueries = [
    'DELETE FROM audit_logs',
    'DELETE FROM booking_modification_history',
    'DELETE FROM notifications',
    'DELETE FROM reviews',
    'DELETE FROM feedbacks', 
    'DELETE FROM payments',
    'DELETE FROM passenger_details',
    'DELETE FROM seat_status',
    'DELETE FROM bookings',
    'DELETE FROM trips',
    'DELETE FROM route_points',
    'DELETE FROM routes',
    'DELETE FROM seats',
    'DELETE FROM seat_layouts',
    'DELETE FROM buses',
    'DELETE FROM operators',
    'DELETE FROM payment_methods',
    'DELETE FROM refresh_tokens',
    'DELETE FROM users',
  ];

  for (const query of clearQueries) {
    try {
      await dataSource.query(query);
      console.log(`   ✓ ${query.split(' ')[2]}`);
    } catch (error: any) {
      console.log(`   ⚠️  ${query.split(' ')[2]} - ${error.message.split('\n')[0]}`);
    }
  }
  
  console.log('✅ Data cleared successfully\n');
}

async function validateForeignKeys() {
  console.log('🔍 Validating foreign key relationships...');
  
  const validations = [
    { table: 'buses', fk: 'operator_id', ref: 'operators' },
    { table: 'seats', fk: 'bus_id', ref: 'buses' },
    { table: 'seat_layouts', fk: 'bus_id', ref: 'buses' },
    { table: 'routes', fk: 'operator_id', ref: 'operators' },
    { table: 'route_points', fk: 'routeId', ref: 'routes' },
    { table: 'trips', fk: 'route_id', ref: 'routes' },
    { table: 'trips', fk: 'bus_id', ref: 'buses' },
    { table: 'bookings', fk: 'user_id', ref: 'users' },
    { table: 'bookings', fk: 'trip_id', ref: 'trips' },
    { table: 'passenger_details', fk: 'booking_id', ref: 'bookings' },
    { table: 'seat_status', fk: 'trip_id', ref: 'trips' },
    { table: 'seat_status', fk: 'seat_id', ref: 'seats' },
    { table: 'seat_status', fk: 'booking_id', ref: 'bookings' },
  ];
  
  let allValid = true;
  for (const { table, fk, ref } of validations) {
    try {
      const result = await dataSource.query(`
        SELECT COUNT(*) as orphaned FROM ${table} t 
        WHERE t.${fk} IS NOT NULL 
        AND t.${fk} NOT IN (SELECT id FROM ${ref})
      `);
      
      if (parseInt(result[0].orphaned) > 0) {
        console.log(`   ❌ ${table}.${fk} has ${result[0].orphaned} orphaned records`);
        allValid = false;
      } else {
        console.log(`   ✅ ${table}.${fk} → ${ref}`);
      }
    } catch (error: any) {
      console.log(`   ⚠️  Could not validate ${table}.${fk} - ${error.message.split('\n')[0]}`);
    }
  }
  
  if (allValid) {
    console.log('✅ All foreign key relationships are valid\n');
  } else {
    console.log('❌ Some foreign key validations failed\n');
  }
}

async function seedDatabase() {
  try {
    await dataSource.initialize();
    console.log('🚀 Connected to database');
    
    // Check if data exists and clear if needed
    const existingUsersCount = await dataSource.query('SELECT COUNT(*) FROM users');
    if (parseInt(existingUsersCount[0].count) > 0) {
      await clearExistingData();
    }

    // Load Vietnam-specific data constants
    const vietnamData = initializeVietnamData();
    
    console.log('📊 Starting comprehensive seed generation...\n');

    // 1️⃣ USERS & AUTHENTICATION
    console.log('1️⃣ Seeding Users & Authentication...');
    await seedUsers(dataSource, vietnamData);
    await seedRefreshTokens(dataSource);
    await seedPaymentMethods(dataSource);

    // 2️⃣ OPERATORS & BUSES  
    console.log('2️⃣ Seeding Operators & Buses...');
    await seedOperators(dataSource, vietnamData);
    await seedBuses(dataSource, vietnamData);

    // 3️⃣ SEATS & LAYOUTS
    console.log('3️⃣ Seeding Seats & Layouts...');
    await seedSeatLayouts(dataSource);
    await seedSeats(dataSource);

    // 4️⃣ ROUTES & ROUTE POINTS
    console.log('4️⃣ Seeding Routes & Route Points...');
    await seedRoutes(dataSource, vietnamData);
    await seedRoutePoints(dataSource, vietnamData);

    // 5️⃣ TRIPS
    console.log('5️⃣ Seeding Trips...');
    await seedTrips(dataSource);

    // 6️⃣ SEAT STATUS  
    console.log('6️⃣ Seeding Seat Status...');
    await seedSeatStatus(dataSource);

    // 7️⃣ BOOKINGS & PASSENGERS
    console.log('7️⃣ Seeding Bookings & Passengers...');
    await seedBookings(dataSource, vietnamData);
    await seedPassengerDetails(dataSource, vietnamData);

    // 8️⃣ PAYMENTS
    console.log('8️⃣ Seeding Payments...');
    await seedPayments(dataSource);

    // 9️⃣ REVIEWS & FEEDBACK
    console.log('9️⃣ Seeding Reviews & Feedback...');
    await seedReviews(dataSource, vietnamData);
    await seedFeedbacks(dataSource, vietnamData);

    // 🔟 NOTIFICATIONS & AUDIT
    console.log('🔟 Seeding Notifications & Audit...');
    await seedNotifications(dataSource, vietnamData);
    await seedAuditLogs(dataSource);
    await seedBookingModifications(dataSource);

    // Validate the seeded data
    await validateForeignKeys();

    console.log('🎉 Database seeding completed successfully!\n');
    printSeedSummary();

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

function printSeedSummary() {
  console.log('📊 SEED SUMMARY');
  console.log('================');
  console.log(`👥 Users: ${stats.users} records`);
  console.log(`🔑 Refresh Tokens: ${stats.refreshTokens} records`);
  console.log(`💳 Payment Methods: ${stats.paymentMethods} records`);
  console.log(`🏢 Operators: ${stats.operators} records`);
  console.log(`🚌 Buses: ${stats.buses} records`);
  console.log(`🪑 Seat Layouts: ${stats.seatLayouts} records`);
  console.log(`💺 Seats: ${stats.seats} records`);
  console.log(`🗺️  Routes: ${stats.routes} records`);
  console.log(`📍 Route Points: ${stats.routePoints} records`);
  console.log(`🚎 Trips: ${stats.trips} records`);
  console.log(`🎫 Seat Status: ${stats.seatStatus} records`);
  console.log(`📋 Bookings: ${stats.bookings} records`);
  console.log(`👨‍👩‍👧‍👦 Passenger Details: ${stats.passengerDetails} records`);
  console.log(`💰 Payments: ${stats.payments} records`);
  console.log(`⭐ Reviews: ${stats.reviews} records`);
  console.log(`📝 Feedbacks: ${stats.feedbacks} records`);
  console.log(`🔔 Notifications: ${stats.notifications} records`);
  console.log(`📃 Audit Logs: ${stats.auditLogs} records`);
  console.log(`📊 Booking Modifications: ${stats.bookingModifications} records`);
  console.log('================\n');
  
  const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
  console.log(`🎯 Total Records Generated: ${total.toLocaleString()}`);
}

// Individual seeding functions are now implemented in separate files
// vietnam-seed-functions.ts and vietnam-seed-functions-part2.ts

// Entry point
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🏁 Seed process completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seed process failed:', error);
      process.exit(1);
    });
}

export { seedDatabase, allIds, stats, dataSource };