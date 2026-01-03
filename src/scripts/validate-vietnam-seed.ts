/**
 * Vietnam Bus System Seed Validation
 * Comprehensive validation script to check seeded data integrity
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

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

interface ValidationResult {
  tableName: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  count?: number;
  expected?: number;
}

const validationResults: ValidationResult[] = [];

function addResult(tableName: string, test: string, status: ValidationResult['status'], message: string, count?: number, expected?: number) {
  validationResults.push({ tableName, test, status, message, count, expected });
  
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️ ';
  console.log(`   ${icon} ${test}: ${message}`);
}

async function validateTableCounts() {
  console.log('📊 Validating Table Record Counts...');
  
  const expectedCounts = {
    users: { min: 50, max: 100 },
    operators: { min: 10, max: 20 },
    buses: { min: 50, max: 100 },
    seats: { min: 1500, max: 5000 },
    routes: { min: 30, max: 50 },
    route_points: { min: 150, max: 300 },
    trips: { min: 100, max: 200 },
    seat_status: { min: 5000, max: 20000 },
    bookings: { min: 100, max: 200 },
    passenger_details: { min: 100, max: 300 },
    payments: { min: 50, max: 150 },
    reviews: { min: 50, max: 150 },
    feedbacks: { min: 30, max: 100 },
    notifications: { min: 100, max: 300 },
    audit_logs: { min: 50, max: 200 },
    booking_modification_history: { min: 30, max: 100 },
    refresh_tokens: { min: 20, max: 50 },
    payment_methods: { min: 20, max: 50 },
    seat_layouts: { min: 50, max: 100 }
  };
  
  for (const [tableName, expected] of Object.entries(expectedCounts)) {
    try {
      const result = await dataSource.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const count = parseInt(result[0].count);
      
      if (count >= expected.min && count <= expected.max) {
        addResult(tableName, 'Record Count', 'PASS', `${count} records (within expected range ${expected.min}-${expected.max})`, count);
      } else if (count < expected.min) {
        addResult(tableName, 'Record Count', 'FAIL', `${count} records (below minimum ${expected.min})`, count, expected.min);
      } else {
        addResult(tableName, 'Record Count', 'WARNING', `${count} records (above maximum ${expected.max})`, count, expected.max);
      }
    } catch (error: any) {
      addResult(tableName, 'Record Count', 'FAIL', `Error: ${error.message}`);
    }
  }
}

async function validateForeignKeys() {
  console.log('\n🔗 Validating Foreign Key Relationships...');
  
  const fkValidations = [
    { table: 'refresh_tokens', fk: 'user_id', ref: 'users', cascadeType: 'CASCADE' },
    { table: 'payment_methods', fk: 'user_id', ref: 'users', cascadeType: 'CASCADE' },
    { table: 'bookings', fk: 'user_id', ref: 'users', cascadeType: 'SET NULL', allowNull: true },
    { table: 'reviews', fk: 'user_id', ref: 'users', cascadeType: 'CASCADE' },
    { table: 'feedbacks', fk: 'user_id', ref: 'users', cascadeType: 'CASCADE' },
    { table: 'notifications', fk: 'user_id', ref: 'users', cascadeType: 'CASCADE' },
    { table: 'audit_logs', fk: 'user_id', ref: 'users', cascadeType: 'SET NULL', allowNull: true },
    
    { table: 'buses', fk: 'operator_id', ref: 'operators', cascadeType: 'CASCADE' },
    { table: 'routes', fk: 'operator_id', ref: 'operators', cascadeType: 'SET NULL', allowNull: true },
    
    { table: 'seats', fk: 'bus_id', ref: 'buses', cascadeType: 'CASCADE' },
    { table: 'seat_layouts', fk: 'bus_id', ref: 'buses', cascadeType: 'CASCADE' },
    { table: 'trips', fk: 'bus_id', ref: 'buses', cascadeType: 'CASCADE' },
    
    { table: 'route_points', fk: 'routeId', ref: 'routes', cascadeType: 'CASCADE' },
    { table: 'trips', fk: 'route_id', ref: 'routes', cascadeType: 'CASCADE' },
    
    { table: 'bookings', fk: 'trip_id', ref: 'trips', cascadeType: 'CASCADE' },
    { table: 'seat_status', fk: 'trip_id', ref: 'trips', cascadeType: 'CASCADE' },
    { table: 'reviews', fk: 'trip_id', ref: 'trips', cascadeType: 'CASCADE' },
    { table: 'feedbacks', fk: 'trip_id', ref: 'trips', cascadeType: 'CASCADE' },
    
    { table: 'passenger_details', fk: 'booking_id', ref: 'bookings', cascadeType: 'CASCADE' },
    { table: 'payments', fk: 'booking_id', ref: 'bookings', cascadeType: 'CASCADE' },
    { table: 'seat_status', fk: 'booking_id', ref: 'bookings', cascadeType: 'SET NULL', allowNull: true },
    { table: 'reviews', fk: 'booking_id', ref: 'bookings', cascadeType: 'CASCADE' },
    { table: 'notifications', fk: 'booking_id', ref: 'bookings', cascadeType: 'SET NULL', allowNull: true },
    { table: 'booking_modification_history', fk: 'booking_id', ref: 'bookings', cascadeType: 'CASCADE' },
    
    { table: 'seat_status', fk: 'seat_id', ref: 'seats', cascadeType: 'CASCADE' },
    
    { table: 'bookings', fk: 'pickup_point_id', ref: 'route_points', cascadeType: 'SET NULL', allowNull: true },
    { table: 'bookings', fk: 'dropoff_point_id', ref: 'route_points', cascadeType: 'SET NULL', allowNull: true },
    
    { table: 'booking_modification_history', fk: 'modified_by', ref: 'users', cascadeType: 'SET NULL', allowNull: true }
  ];
  
  for (const { table, fk, ref, allowNull } of fkValidations) {
    try {
      const orphanQuery = allowNull ? 
        `SELECT COUNT(*) as orphaned FROM ${table} t WHERE t.${fk} IS NOT NULL AND t.${fk} NOT IN (SELECT id FROM ${ref})` :
        `SELECT COUNT(*) as orphaned FROM ${table} t WHERE t.${fk} NOT IN (SELECT id FROM ${ref})`;
      
      const result = await dataSource.query(orphanQuery);
      const orphanedCount = parseInt(result[0].orphaned);
      
      if (orphanedCount === 0) {
        addResult(table, `FK ${fk} → ${ref}`, 'PASS', 'All foreign key references are valid');
      } else {
        addResult(table, `FK ${fk} → ${ref}`, 'FAIL', `${orphanedCount} orphaned records found`);
      }
    } catch (error: any) {
      addResult(table, `FK ${fk} → ${ref}`, 'FAIL', `Validation error: ${error.message}`);
    }
  }
}

async function validateUniqueConstraints() {
  console.log('\n🔑 Validating Unique Constraints...');
  
  const uniqueConstraints = [
    { table: 'users', column: 'email', description: 'User emails must be unique' },
    { table: 'users', column: 'google_id', description: 'Google IDs must be unique (excluding NULLs)', allowNull: true },
    { table: 'users', column: 'facebook_id', description: 'Facebook IDs must be unique (excluding NULLs)', allowNull: true },
    { table: 'operators', column: 'contact_email', description: 'Operator contact emails must be unique' },
    { table: 'buses', column: 'plate_number', description: 'Bus plate numbers must be unique' },
    { table: 'bookings', column: 'booking_reference', description: 'Booking references must be unique' },
    { table: 'reviews', column: 'booking_id', description: 'Each booking can only have one review' }
  ];
  
  for (const { table, column, description, allowNull } of uniqueConstraints) {
    try {
      const duplicateQuery = allowNull ? 
        `SELECT ${column}, COUNT(*) as cnt FROM ${table} WHERE ${column} IS NOT NULL GROUP BY ${column} HAVING COUNT(*) > 1` :
        `SELECT ${column}, COUNT(*) as cnt FROM ${table} GROUP BY ${column} HAVING COUNT(*) > 1`;
      
      const result = await dataSource.query(duplicateQuery);
      
      if (result.length === 0) {
        addResult(table, `Unique ${column}`, 'PASS', description);
      } else {
        addResult(table, `Unique ${column}`, 'FAIL', `${result.length} duplicate values found`);
      }
    } catch (error: any) {
      addResult(table, `Unique ${column}`, 'FAIL', `Validation error: ${error.message}`);
    }
  }
}

async function validateEnumValues() {
  console.log('\n📋 Validating Enum Values...');
  
  const enumValidations = [
    { table: 'users', column: 'role', values: ['admin', 'customer'] },
    { table: 'operators', column: 'status', values: ['pending', 'approved', 'suspended'] },
    { table: 'buses', column: 'bus_type', values: ['standard', 'limousine', 'sleeper', 'seater', 'vip', 'business'] },
    { table: 'seats', column: 'seat_type', values: ['normal', 'vip', 'business'] },
    { table: 'route_points', column: 'type', values: ['pickup', 'dropoff', 'both'] },
    { table: 'trips', column: 'status', values: ['scheduled', 'in_progress', 'completed', 'cancelled', 'delayed'] },
    { table: 'bookings', column: 'status', values: ['pending', 'paid', 'completed', 'cancelled', 'expired'] },
    { table: 'seat_status', column: 'state', values: ['available', 'booked', 'locked', 'reserved'] },
    { table: 'payments', column: 'status', values: ['pending', 'completed', 'failed', 'refunded', 'cancelled'] },
    { table: 'notifications', column: 'channel', values: ['email', 'sms', 'push', 'in_app'] },
    { table: 'notifications', column: 'status', values: ['pending', 'sent', 'failed', 'delivered', 'read'] }
  ];
  
  for (const { table, column, values } of enumValidations) {
    try {
      const invalidQuery = `SELECT DISTINCT ${column} FROM ${table} WHERE ${column} NOT IN (${values.map(v => `'${v}'`).join(', ')})`;
      const result = await dataSource.query(invalidQuery);
      
      if (result.length === 0) {
        addResult(table, `Enum ${column}`, 'PASS', `All values are valid enum members`);
      } else {
        const invalidValues = result.map((r: any) => r[column]).join(', ');
        addResult(table, `Enum ${column}`, 'FAIL', `Invalid enum values found: ${invalidValues}`);
      }
    } catch (error: any) {
      addResult(table, `Enum ${column}`, 'FAIL', `Validation error: ${error.message}`);
    }
  }
}

async function validateBusinessRules() {
  console.log('\n💼 Validating Business Rules...');
  
  // Rule 1: Trip departure time < arrival time
  try {
    const result = await dataSource.query(`
      SELECT COUNT(*) as invalid_trips 
      FROM trips 
      WHERE departure_time >= arrival_time
    `);
    
    if (parseInt(result[0].invalid_trips) === 0) {
      addResult('trips', 'Departure < Arrival', 'PASS', 'All trips have valid departure/arrival times');
    } else {
      addResult('trips', 'Departure < Arrival', 'FAIL', `${result[0].invalid_trips} trips have invalid times`);
    }
  } catch (error: any) {
    addResult('trips', 'Departure < Arrival', 'FAIL', `Validation error: ${error.message}`);
  }
  
  // Rule 2: Payments should only exist for paid/completed bookings
  try {
    const result = await dataSource.query(`
      SELECT COUNT(*) as invalid_payments 
      FROM payments p 
      JOIN bookings b ON p.booking_id = b.id 
      WHERE b.status NOT IN ('paid', 'completed')
    `);
    
    if (parseInt(result[0].invalid_payments) === 0) {
      addResult('payments', 'Payment Status Logic', 'PASS', 'Payments only exist for paid/completed bookings');
    } else {
      addResult('payments', 'Payment Status Logic', 'FAIL', `${result[0].invalid_payments} payments for non-paid bookings`);
    }
  } catch (error: any) {
    addResult('payments', 'Payment Status Logic', 'FAIL', `Validation error: ${error.message}`);
  }
  
  // Rule 3: Reviews should only exist for completed bookings
  try {
    const result = await dataSource.query(`
      SELECT COUNT(*) as invalid_reviews 
      FROM reviews r 
      JOIN bookings b ON r.booking_id = b.id 
      WHERE b.status != 'completed'
    `);
    
    if (parseInt(result[0].invalid_reviews) === 0) {
      addResult('reviews', 'Review Booking Status', 'PASS', 'Reviews only exist for completed bookings');
    } else {
      addResult('reviews', 'Review Booking Status', 'WARNING', `${result[0].invalid_reviews} reviews for non-completed bookings`);
    }
  } catch (error: any) {
    addResult('reviews', 'Review Booking Status', 'FAIL', `Validation error: ${error.message}`);
  }
  
  // Rule 4: Seat status consistency
  try {
    const result = await dataSource.query(`
      SELECT COUNT(*) as booked_without_booking 
      FROM seat_status 
      WHERE state = 'booked' AND booking_id IS NULL
    `);
    
    if (parseInt(result[0].booked_without_booking) === 0) {
      addResult('seat_status', 'Booked Seat Consistency', 'PASS', 'All booked seats have booking references');
    } else {
      addResult('seat_status', 'Booked Seat Consistency', 'FAIL', `${result[0].booked_without_booking} booked seats without booking_id`);
    }
  } catch (error: any) {
    addResult('seat_status', 'Booked Seat Consistency', 'FAIL', `Validation error: ${error.message}`);
  }
  
  // Rule 5: Rating ranges (1-5)
  try {
    const reviewResult = await dataSource.query(`
      SELECT COUNT(*) as invalid_ratings 
      FROM reviews 
      WHERE rating < 1 OR rating > 5
    `);
    
    const feedbackResult = await dataSource.query(`
      SELECT COUNT(*) as invalid_ratings 
      FROM feedbacks 
      WHERE rating < 1 OR rating > 5
    `);
    
    const totalInvalid = parseInt(reviewResult[0].invalid_ratings) + parseInt(feedbackResult[0].invalid_ratings);
    
    if (totalInvalid === 0) {
      addResult('reviews/feedbacks', 'Rating Range', 'PASS', 'All ratings are within 1-5 range');
    } else {
      addResult('reviews/feedbacks', 'Rating Range', 'FAIL', `${totalInvalid} ratings outside 1-5 range`);
    }
  } catch (error: any) {
    addResult('reviews/feedbacks', 'Rating Range', 'FAIL', `Validation error: ${error.message}`);
  }
}

async function validateDataQuality() {
  console.log('\n🔍 Validating Data Quality...');
  
  // Check for Vietnamese phone number format
  try {
    const result = await dataSource.query(`
      SELECT COUNT(*) as invalid_phones 
      FROM users 
      WHERE phone IS NOT NULL 
      AND phone NOT LIKE '+84%'
    `);
    
    if (parseInt(result[0].invalid_phones) === 0) {
      addResult('users', 'Vietnamese Phone Format', 'PASS', 'All phone numbers follow Vietnamese format');
    } else {
      addResult('users', 'Vietnamese Phone Format', 'WARNING', `${result[0].invalid_phones} phone numbers not in Vietnamese format`);
    }
  } catch (error: any) {
    addResult('users', 'Vietnamese Phone Format', 'FAIL', `Validation error: ${error.message}`);
  }
  
  // Check for Vietnamese names
  try {
    const result = await dataSource.query(`
      SELECT COUNT(*) as non_vietnamese_names 
      FROM users 
      WHERE name NOT LIKE '%ễ%' 
      AND name NOT LIKE '%ô%' 
      AND name NOT LIKE '%â%' 
      AND name NOT LIKE '%ư%' 
      AND name NOT LIKE '%ă%'
      AND name NOT LIKE '%Nguyễn%'
      AND name NOT LIKE '%Trần%'
      AND name NOT LIKE '%Lê%'
      AND name NOT LIKE '%Phạm%'
      AND name NOT LIKE '%Huỳnh%'
      AND name NOT LIKE '%Hoàng%'
    `);
    
    const totalUsers = await dataSource.query('SELECT COUNT(*) as total FROM users');
    const percentage = (parseInt(result[0].non_vietnamese_names) / parseInt(totalUsers[0].total) * 100).toFixed(1);
    
    if (parseFloat(percentage) < 20) {
      addResult('users', 'Vietnamese Names', 'PASS', `${percentage}% names appear non-Vietnamese`);
    } else {
      addResult('users', 'Vietnamese Names', 'WARNING', `${percentage}% names appear non-Vietnamese`);
    }
  } catch (error: any) {
    addResult('users', 'Vietnamese Names', 'FAIL', `Validation error: ${error.message}`);
  }
  
  // Check booking reference format
  try {
    const result = await dataSource.query(`
      SELECT COUNT(*) as invalid_refs 
      FROM bookings 
      WHERE booking_reference NOT LIKE 'BK%-%'
    `);
    
    if (parseInt(result[0].invalid_refs) === 0) {
      addResult('bookings', 'Booking Reference Format', 'PASS', 'All booking references follow BK format');
    } else {
      addResult('bookings', 'Booking Reference Format', 'FAIL', `${result[0].invalid_refs} booking references have invalid format`);
    }
  } catch (error: any) {
    addResult('bookings', 'Booking Reference Format', 'FAIL', `Validation error: ${error.message}`);
  }
}

async function printSummary() {
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('=====================');
  
  const passCount = validationResults.filter(r => r.status === 'PASS').length;
  const failCount = validationResults.filter(r => r.status === 'FAIL').length;
  const warnCount = validationResults.filter(r => r.status === 'WARNING').length;
  const totalTests = validationResults.length;
  
  console.log(`✅ PASSED: ${passCount}/${totalTests} tests (${(passCount/totalTests*100).toFixed(1)}%)`);
  console.log(`❌ FAILED: ${failCount}/${totalTests} tests (${(failCount/totalTests*100).toFixed(1)}%)`);
  console.log(`⚠️  WARNINGS: ${warnCount}/${totalTests} tests (${(warnCount/totalTests*100).toFixed(1)}%)`);
  
  if (failCount === 0) {
    console.log('\n🎉 All critical validations PASSED! Database is ready for use.');
  } else {
    console.log('\n❌ Some critical validations FAILED. Please review and fix issues.');
    console.log('\nFailed tests:');
    validationResults
      .filter(r => r.status === 'FAIL')
      .forEach(r => console.log(`   • ${r.tableName}: ${r.test} - ${r.message}`));
  }
  
  if (warnCount > 0) {
    console.log('\n⚠️  Warnings (non-critical):');
    validationResults
      .filter(r => r.status === 'WARNING')
      .forEach(r => console.log(`   • ${r.tableName}: ${r.test} - ${r.message}`));
  }
  
  console.log('\n======================\n');
}

async function runValidation() {
  try {
    await dataSource.initialize();
    console.log('🚀 Connected to database for validation\n');
    
    await validateTableCounts();
    await validateForeignKeys();
    await validateUniqueConstraints();
    await validateEnumValues();
    await validateBusinessRules();
    await validateDataQuality();
    
    await printSummary();
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Entry point
if (require.main === module) {
  runValidation()
    .then(() => {
      const failCount = validationResults.filter(r => r.status === 'FAIL').length;
      process.exit(failCount > 0 ? 1 : 0);
    })
    .catch(() => {
      process.exit(1);
    });
}

export { runValidation, validationResults };