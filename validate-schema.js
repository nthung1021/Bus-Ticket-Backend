const { Client } = require('pg');
require('dotenv').config();

async function validateSchema() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'bus_booking',
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');
    
    // Check critical tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Existing Tables:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    // Check bookings table columns
    const bookingColumns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Bookings Table Columns:');
    bookingColumns.rows.forEach(row => 
      console.log(`  - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`)
    );
    
    // Check for required booking modification columns
    const requiredColumns = ['contact_email', 'contact_phone', 'last_modified_at'];
    console.log('\n✅ Required Booking Modification Columns:');
    
    requiredColumns.forEach(col => {
      const exists = bookingColumns.rows.find(row => row.column_name === col);
      console.log(`  - ${col}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    });
    
    // Check migrations table
    const migrations = await client.query(`
      SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 5
    `);
    
    console.log('\n📦 Recent Migrations:');
    migrations.rows.forEach(row => 
      console.log(`  - ${row.name} (${new Date(parseInt(row.timestamp)).toLocaleString()})`)
    );
    
    // Check indexes
    const indexes = await client.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('bookings', 'trips', 'seat_statuses')
      ORDER BY tablename, indexname
    `);
    
    console.log('\n🗂️ Critical Indexes:');
    indexes.rows.forEach(row => 
      console.log(`  - ${row.tablename}.${row.indexname}`)
    );
    
    console.log('\n🎉 Schema validation completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema validation error:', error.message);
  } finally {
    await client.end();
  }
}

validateSchema();