const { Client } = require('pg');
require('dotenv').config();

async function addMissingColumns() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'bus_booking',
  });

  const requiredColumns = [
    {
      table: 'bookings',
      column: 'contact_email',
      type: 'character varying',
      nullable: true
    },
    {
      table: 'bookings',
      column: 'contact_phone',
      type: 'character varying',
      nullable: true
    },
    {
      table: 'bookings',
      column: 'last_modified_at',
      type: 'timestamp with time zone',
      nullable: true
    },
    {
      table: 'seat_statuses',
      column: 'seat_code',
      type: 'character varying',
      nullable: true
    }
  ];

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    for (const col of requiredColumns) {
      // Check if column exists
      const exists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [col.table, col.column]);

      if (exists.rows.length === 0) {
        console.log(`➕ Adding missing column: ${col.table}.${col.column}`);
        
        const nullable = col.nullable ? '' : 'NOT NULL';
        await client.query(`
          ALTER TABLE ${col.table} 
          ADD COLUMN IF NOT EXISTS ${col.column} ${col.type} ${nullable}
        `);
        
        // Add index if beneficial
        if (col.column.includes('_at') || col.column.includes('email') || col.column.includes('phone')) {
          const indexName = `idx_${col.table}_${col.column}`;
          await client.query(`
            CREATE INDEX IF NOT EXISTS ${indexName} ON ${col.table} (${col.column})
          `);
          console.log(`📊 Added index: ${indexName}`);
        }
      } else {
        console.log(`✅ Column exists: ${col.table}.${col.column}`);
      }
    }

    console.log('\n🎉 Missing columns check completed!');
    
  } catch (error) {
    console.error('❌ Error adding missing columns:', error.message);
  } finally {
    await client.end();
  }
}

addMissingColumns();