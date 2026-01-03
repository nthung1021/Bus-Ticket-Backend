import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['src/**/*.entity{.ts,.js}'],
  extra: {
    ssl: process.env.DB_SSL === 'true' || 
         process.env.NODE_ENV === 'production' || 
         process.env.NODE_ENV === 'staging' ? {
      rejectUnauthorized: false,
    } : false,
  },
});

async function clearAllData() {
  console.log('🔌 Connecting to database...');
  await dataSource.initialize();
  
  try {
    console.log('🧹 Clearing all data with CASCADE...');
    
    // Order matters - delete in reverse dependency order
    const tables = [
      'notifications',
      'passengers',
      'payments', 
      'bookings',
      'feedbacks',
      'reviews',
      'seat_status',
      'trips',
      'seats',
      'buses',
      'route_points',
      'routes',
      'operators',
      'payment_methods',
      'users'
    ];
    
    // Disable foreign key checks temporarily
    await dataSource.query('SET session_replication_role = replica;');
    
    for (const table of tables) {
      try {
        await dataSource.query(`TRUNCATE TABLE "${table}" CASCADE;`);
        console.log(`✅ Cleared table: ${table}`);
      } catch (error) {
        console.log(`⚠️  Table ${table} might not exist or already empty`);
      }
    }
    
    // Re-enable foreign key checks
    await dataSource.query('SET session_replication_role = DEFAULT;');
    
    console.log('🎉 Successfully cleared all data!');
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  clearAllData().catch(console.error);
}

export { clearAllData };